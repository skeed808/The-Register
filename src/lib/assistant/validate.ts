// Citation validation. Runs on every answer, scripted or model-generated.
// A sentence survives only if every cited id exists in the case evidence and every
// value it quotes appears in one of the rows it cites.
import type { Evidence } from '../types';
import { normalise } from '../diff';

export interface DraftSentence {
  text: string;
  citations: string[];
  /** Exact values the sentence relies on; each must appear in a cited row. */
  quotes?: string[];
}

export interface ValidatedAnswer {
  sentences: DraftSentence[];
  removed: { text: string; reason: string }[];
  checkedCitations: number;
  refusal?: string;
}

export const REFUSAL = 'That is not in the evidence collected for this case.';

export function validate(draft: DraftSentence[], evidence: Evidence[]): ValidatedAnswer {
  const byId = new Map(evidence.map((e) => [e.id, e]));
  const kept: DraftSentence[] = [];
  const removed: ValidatedAnswer['removed'] = [];
  let checked = 0;
  for (const s of draft) {
    if (!s.citations.length) {
      removed.push({ text: s.text, reason: 'no citation' });
      continue;
    }
    checked += s.citations.length;
    const missing = s.citations.filter((c) => !byId.has(c));
    if (missing.length) {
      removed.push({ text: s.text, reason: `cited ${missing.join(', ')}, which is not in this case` });
      continue;
    }
    const haystack = s.citations.map((c) => {
      const e = byId.get(c)!;
      return normalise([e.value, e.excerpt ?? '', e.claim].join(' '));
    });
    const unsupported = (s.quotes ?? []).filter((q) => !haystack.some((h) => h.includes(normalise(q))));
    if (unsupported.length) {
      removed.push({ text: s.text, reason: `quoted "${unsupported[0]}", which the cited rows do not contain` });
      continue;
    }
    kept.push(s);
  }
  return {
    sentences: kept,
    removed,
    checkedCitations: checked,
    refusal: kept.length ? undefined : REFUSAL,
  };
}
