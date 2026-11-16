// The model step of the assistant, separated from the HTTP route so it can be tested
// with a mock model. The route handles limits and cookies; this handles one question.
import { generateText, Output, type LanguageModel } from 'ai';
import { z } from 'zod';
import type { Evidence } from '../types';
import { validate, type ValidatedAnswer } from './validate';

export const answerSchema = z.object({
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

export const SYSTEM = `You answer questions about one research case using ONLY the evidence rows supplied.
Rules:
- Every sentence must cite one or more evidence ids from the rows, e.g. "E-026".
- Every sentence must include at least one item in "quotes": an exact value you rely on (a name, a date, a status), copied from the value or excerpt of a cited row. Every cited row must supply at least one quote.
- Only write dates and names that appear in the rows you cite.
- If the rows do not answer the question, return an empty list of sentences.
- Never characterise a person's conduct, motives or character. Never speculate about wrongdoing.
- Describe differences between sources neutrally.`;

export function evidencePrompt(evidence: Evidence[], question: string) {
  const rows = evidence
    .map((e) => `${e.id} | ${e.claim} | ${e.value} | effective ${e.effective ?? '-'} | recorded ${e.recorded ?? '-'} | ${e.excerpt ?? ''}`)
    .join('\n');
  return `Evidence rows:\n${rows}\n\nQuestion: ${question}`;
}

export type AnswerResult =
  | { ok: true; answer: ValidatedAnswer }
  | { ok: false; reason: 'malformed' | 'failed' };

/**
 * Asks the model, then validates. Output that cannot be parsed or does not match the
 * schema is reported as 'malformed' and shown to the user as a plain failure; it is
 * never partially displayed.
 */
export async function answerQuestion(
  model: LanguageModel,
  question: string,
  evidence: Evidence[],
  entityNames: Record<string, string>,
): Promise<AnswerResult> {
  try {
    const { output } = await generateText({
      model,
      system: SYSTEM,
      prompt: evidencePrompt(evidence, question),
      output: Output.object({ schema: answerSchema }),
      maxOutputTokens: 900,
    });
    return { ok: true, answer: validate(output.sentences, evidence, entityNames) };
  } catch (e) {
    const name = (e as { name?: string })?.name ?? '';
    return { ok: false, reason: name.includes('NoObjectGenerated') || name.includes('TypeValidation') ? 'malformed' : 'failed' };
  }
}
