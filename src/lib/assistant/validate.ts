// Citation validation. Runs on every answer, scripted or model-generated.
//
// What it checks (deterministic grounding):
//  1. Every sentence cites at least one id, and every id exists in this case.
//  2. Every sentence carries at least one quote: an exact value it relies on.
//     Each quote must be substantive and must appear in the VALUE or EXCERPT of a
//     cited row (not in the generic claim label).
//  3. Every cited row must support at least one of the quotes (no decorative citations).
//  4. Every date written in the sentence must appear in a cited row's dates or text.
//  5. Every case entity named in the sentence must be the subject of a cited row or
//     appear in its value or excerpt.
//  6. Words that assert the present ("currently", "now", "still", "today") need at
//     least one cited row whose status is current.
//
// What it does NOT check: meaning. A sentence that uses genuine names, dates and
// quotes but states the wrong relationship between them (for example, reversing
// who controls whom) can pass. See tests/validate.test.ts, "known limitation".
import type { Evidence } from '../types';
import { normalise } from '../diff';

export interface DraftSentence {
  text: string;
  citations: string[];
  /** Exact values the sentence relies on; each must appear in a cited row. */
  quotes: string[];
}

export interface ValidatedAnswer {
  sentences: DraftSentence[];
  removed: { text: string; reason: string }[];
  checkedCitations: number;
  refusal?: string;
}

export const REFUSAL = 'That is not in the evidence collected for this case.';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const TEXT_DATE = /\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{4})\b/gi;
const ISO_DATE = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
const PRESENT = /\b(currently|now|still|today|at present|presently)\b/i;

/** Extracts every date in a string as YYYY-MM-DD. */
export function datesIn(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(TEXT_DATE)) {
    const mm = MONTHS.indexOf(m[2].toLowerCase().slice(0, 3)) + 1;
    out.push(`${m[3]}-${String(mm).padStart(2, '0')}-${m[1].padStart(2, '0')}`);
  }
  for (const m of text.matchAll(ISO_DATE)) out.push(`${m[1]}-${m[2]}-${m[3]}`);
  return out;
}

const stripSuffix = (name: string) => normalise(name).replace(/\s+(ltd|llp|plc)$/, '');
const has = (hay: string, needle: string) => ` ${hay} `.includes(` ${needle} `) || hay.includes(needle);

function rowText(e: Evidence) {
  return normalise(`${e.value} ${e.excerpt ?? ''}`);
}
function rowDates(e: Evidence) {
  const fields = [e.effective, e.recorded, e.retrieved?.slice(0, 10), e.datasetDate].filter(Boolean) as string[];
  return new Set([...fields, ...datesIn(`${e.value} ${e.excerpt ?? ''}`)]);
}

export function validate(
  draft: DraftSentence[],
  evidence: Evidence[],
  entityNames: Record<string, string> = {},
): ValidatedAnswer {
  const byId = new Map(evidence.map((e) => [e.id, e]));
  const names = Object.entries(entityNames).map(([id, name]) => ({ id, key: stripSuffix(name) }));
  const kept: DraftSentence[] = [];
  const removed: ValidatedAnswer['removed'] = [];
  let checked = 0;

  for (const s of draft) {
    const reject = (reason: string) => removed.push({ text: s.text, reason });
    const citations = s.citations ?? [];
    const quotes = (s.quotes ?? []).map((q) => q.trim());

    if (!citations.length) { reject('no citation'); continue; }
    checked += citations.length;

    const missing = citations.filter((c) => !byId.has(c));
    if (missing.length) { reject(`cited ${missing.join(', ')}, which is not in this case`); continue; }
    const rows = citations.map((c) => byId.get(c)!);

    if (!quotes.length) { reject('no quoted value to support it'); continue; }
    const thin = quotes.find((q) => normalise(q).replace(/\s/g, '').length < 3);
    if (thin !== undefined) { reject(`quote "${thin}" is too short to support anything`); continue; }

    const texts = rows.map(rowText);
    const unsupported = quotes.find((q) => !texts.some((t) => t.includes(normalise(q))));
    if (unsupported) { reject(`quoted "${unsupported}", which the cited rows do not contain`); continue; }

    const idle = rows.find((r, i) => !quotes.some((q) => texts[i].includes(normalise(q))));
    if (idle) { reject(`cited ${idle.id} without quoting anything from it`); continue; }

    const allDates = new Set(rows.flatMap((r) => [...rowDates(r)]));
    const badDate = datesIn(s.text).find((d) => !allDates.has(d));
    if (badDate) { reject(`gives the date ${badDate}, which no cited row contains`); continue; }

    const sentence = normalise(s.text);
    const badName = names.find(
      (n) => n.key.length > 3 && has(sentence, n.key) && !rows.some((r, i) => r.entityId === n.id || texts[i].includes(n.key)),
    );
    if (badName) { reject(`names ${entityNames[badName.id]}, which no cited row is about or mentions`); continue; }

    if (PRESENT.test(s.text) && !rows.some((r) => r.status === 'current')) {
      reject('describes the present, but every cited row is historical');
      continue;
    }
    kept.push({ ...s, quotes });
  }
  return { sentences: kept, removed, checkedCitations: checked, refusal: kept.length ? undefined : REFUSAL };
}
