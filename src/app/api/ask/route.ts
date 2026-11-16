import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { anthropic } from '@ai-sdk/anthropic';
import { evidence as caseEvidence, entities } from '@/data/demo-case';
import { answerQuestion } from '@/lib/assistant/answer';
import { durableLimitsAvailable, hashIp, hit, LIMITS } from '@/lib/ratelimit';
import { clientIp, trustedHopsFromEnv } from '@/lib/request-ip';

const names = Object.fromEntries(Object.values(entities).map((e) => [e.id, e.name]));

// Free-form questions on the demonstration case only (decision log, 16 Nov 2026).
// Steps: fail closed without durable limits; per-IP, per-session and global daily limits
// (in that order); evidence-only context; structured output; server-side validation;
// refusal if nothing survives.
// UNTESTED against a live model in this build: needs ANTHROPIC_API_KEY.

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

  const result = await answerQuestion(anthropic(process.env.ASSISTANT_MODEL ?? 'claude-haiku-5-5'), question, caseEvidence, names);
  if (!result.ok) {
    return NextResponse.json({ limited: 'The assistant could not answer just now. The scripted questions still answer.', reason: result.reason });
  }
  return NextResponse.json({ answer: result.answer, remaining: Math.max(0, LIMITS.askPerSession - used) });
}
