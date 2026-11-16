import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { generateText, Output } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { evidence as caseEvidence, entities } from '@/data/demo-case';
import { validate } from '@/lib/assistant/validate';
import { durableLimitsAvailable, hashIp, hit, LIMITS } from '@/lib/ratelimit';
import { clientIp, trustedHopsFromEnv } from '@/lib/request-ip';

const names = Object.fromEntries(Object.values(entities).map((e) => [e.id, e.name]));

// Free-form questions on the demonstration case only (decision log, 16 Nov 2026).
// Steps: fail closed without durable limits; per-IP, per-session and global daily limits
// (in that order); evidence-only context; structured output; server-side validation;
// refusal if nothing survives.
// UNTESTED against a live model in this build: needs ANTHROPIC_API_KEY.

const schema = z.object({
  sentences: z
    .array(
      z.object({
        text: z.string().max(400),
        citations: z.array(z.string()).min(1),
        quotes: z.array(z.string().min(3)).min(1),
      }),
    )
    .max(8),
});

const SYSTEM = `You answer questions about one research case using ONLY the evidence rows supplied.
Rules:
- Every sentence must cite one or more evidence ids from the rows, e.g. "E-026".
- Every sentence must include at least one item in "quotes": an exact value you rely on (a name, a date, a status), copied from the value or excerpt of a cited row. Every cited row must supply at least one quote.
- Only write dates and names that appear in the rows you cite.
- If the rows do not answer the question, return an empty list of sentences.
- Never characterise a person's conduct, motives or character. Never speculate about wrongdoing.
- Describe differences between sources neutrally.`;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { question?: string };
  const question = String(body.question ?? '').slice(0, 300).trim();
  if (!question) return NextResponse.json({ error: 'Empty question' }, { status: 400 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ limited: 'Free-form questions are switched off on this deployment. The scripted questions still answer.' });
  }
  if (!durableLimitsAvailable()) {
    return NextResponse.json({ limited: 'Free-form questions are off until durable rate limits are configured. The scripted questions still answer.' });
  }

  // Order matters: the cheapest-to-evade limits are checked last, so a blocked caller
  // never consumes the shared global budget.
  const ip = clientIp(req.headers.get('x-forwarded-for'), trustedHopsFromEnv(process.env.TRUSTED_PROXY_HOPS));
  const day = new Date().toISOString().slice(0, 10);
  if ((await hit(`ask:ip:${await hashIp(ip)}:${day}`, 86400)) > LIMITS.askPerIpPerDay) {
    return NextResponse.json({ limited: 'This network has used today\u2019s questions. The scripted questions still answer.' });
  }
  const jar = await cookies();
  let sid = jar.get('reg_sid')?.value;
  if (!sid || !/^[0-9a-f-]{36}$/.test(sid)) {
    sid = crypto.randomUUID();
    jar.set('reg_sid', sid, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 });
  }
  const used = await hit(`ask:session:${sid}`, 86400);
  if (used > LIMITS.askPerSession) {
    return NextResponse.json({ limited: 'You have used this session\u2019s questions. The scripted questions still answer.' });
  }
  if ((await hit(`ask:global:${day}`, 86400)) > LIMITS.askGlobalPerDay) {
    return NextResponse.json({ limited: "Today's question budget is spent. The scripted questions still answer." });
  }

  const rows = caseEvidence
    .map((e) => `${e.id} | ${e.claim} | ${e.value} | effective ${e.effective ?? '-'} | recorded ${e.recorded ?? '-'} | ${e.excerpt ?? ''}`)
    .join('\n');

  try {
    const { output } = await generateText({
      model: anthropic(process.env.ASSISTANT_MODEL ?? 'claude-haiku-5-5'),
      system: SYSTEM,
      prompt: `Evidence rows:\n${rows}\n\nQuestion: ${question}`,
      output: Output.object({ schema }),
      maxOutputTokens: 900,
    });
    const answer = validate(output.sentences, caseEvidence, names);
    return NextResponse.json({ answer, remaining: Math.max(0, LIMITS.askPerSession - used) });
  } catch {
    return NextResponse.json({ limited: 'The assistant could not answer just now. The scripted questions still answer.' });
  }
}
