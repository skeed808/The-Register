import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { generateText, Output } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { evidence as caseEvidence } from '@/data/demo-case';
import { validate } from '@/lib/assistant/validate';
import { hit, LIMITS } from '@/lib/ratelimit';

// Free-form questions on the demonstration case only (decision log, 16 Nov 2026).
// Six steps: budget, session limit, evidence-only context, structured output,
// server-side validation, refusal if nothing survives.
// UNTESTED against a live model in this build: needs ANTHROPIC_API_KEY.

const schema = z.object({
  sentences: z
    .array(
      z.object({
        text: z.string().max(400),
        citations: z.array(z.string()).min(1),
        quotes: z.array(z.string()).default([]),
      }),
    )
    .max(8),
});

const SYSTEM = `You answer questions about one research case using ONLY the evidence rows supplied.
Rules:
- Every sentence must cite one or more evidence ids from the rows, e.g. "E-026".
- Put any exact value you rely on (a name, a date, a status) in "quotes", copied from the cited row.
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

  const day = new Date().toISOString().slice(0, 10);
  if ((await hit(`ask:global:${day}`, 86400)) > LIMITS.askGlobalPerDay) {
    return NextResponse.json({ limited: "Today's question budget is spent. The scripted questions still answer." });
  }
  const jar = await cookies();
  let sid = jar.get('reg_sid')?.value;
  if (!sid) {
    sid = crypto.randomUUID();
    jar.set('reg_sid', sid, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 });
  }
  const used = await hit(`ask:session:${sid}`, 86400);
  if (used > LIMITS.askPerSession) {
    return NextResponse.json({ limited: 'You have used this session’s questions. The scripted questions still answer.' });
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
    const answer = validate(output.sentences, caseEvidence);
    return NextResponse.json({ answer, remaining: Math.max(0, LIMITS.askPerSession - used) });
  } catch {
    return NextResponse.json({ limited: 'The assistant could not answer just now. The scripted questions still answer.' });
  }
}
