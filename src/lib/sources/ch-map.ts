// Pure helpers for the Companies House adapter. No network, no server-only imports,
// so they can be unit tested. Field semantics are taken from the Companies House
// Public Data API specification (checked 16 Nov 2026):
//  - PSC notified_on: "The date that Companies House was notified about this person
//    with significant control." ceased_on: "The date that Companies House was notified
//    about the cessation". Both are NOTIFICATION dates, so they are recorded dates,
//    never effective dates.
//  - Filing history date: "The date the filing was processed" (recorded). action_date
//    is the made-up date for accounts and returns and is often absent (effective, when present).
//  - Officers appointed_on / resigned_on: dates of appointment and resignation (effective;
//    recalled from the spec, not re-checked on 16 Nov 2026).
//  - List endpoints cap items_per_page at 100; start_index is zero-based.

import type { Mark } from '../types';

/** A response is Live only if it was produced within this many seconds of the request. */
export const LIVE_WINDOW_SECONDS = 60;
export const PAGE_SIZE = 100;
export const MAX_PAGES = { officers: 3, pscs: 3, filings: 1 } as const;

export interface Provenance {
  mark: Extract<Mark, 'L' | 'C'>;
  fetchedAt: string;
  /** Minutes since the response was produced; null when the response carried no Date header. */
  ageMinutes: number | null;
}

/**
 * Live versus Cached, from the response's Date header.
 * A cached fetch keeps the original response headers, so an old Date means a cached copy.
 * No Date header means the age is unknown, which is treated as Cached, never Live.
 */
export function provenanceFromDate(dateHeader: string | null | undefined, nowIso: string): Provenance {
  const now = Date.parse(nowIso);
  const t = dateHeader ? Date.parse(dateHeader) : NaN;
  if (Number.isNaN(t)) return { mark: 'C', fetchedAt: nowIso, ageMinutes: null };
  const ageSeconds = Math.max(0, (now - t) / 1000);
  return {
    mark: ageSeconds <= LIVE_WINDOW_SECONDS ? 'L' : 'C',
    fetchedAt: new Date(t).toISOString(),
    ageMinutes: Math.round(ageSeconds / 60),
  };
}

export interface Page<T> {
  items: T[];
  /** Total reported by the API for the whole list, if it reported one. */
  total: number | null;
}

export interface Coverage {
  retrieved: number;
  total: number | null;
  complete: boolean;
}

/** Fetches up to maxPages pages, stopping early when the list is exhausted. */
export async function collectPages<T>(
  fetchPage: (startIndex: number) => Promise<Page<T> | null>,
  maxPages: number,
  pageSize = PAGE_SIZE,
): Promise<{ items: T[]; coverage: Coverage }> {
  const items: T[] = [];
  let total: number | null = null;
  for (let p = 0; p < maxPages; p++) {
    const page = await fetchPage(items.length);
    if (!page) break;
    if (page.total !== null) total = page.total;
    items.push(...page.items);
    if (page.items.length < pageSize) break;
    if (total !== null && items.length >= total) break;
  }
  const complete = total !== null ? items.length >= total : items.length % pageSize !== 0 || items.length === 0;
  return { items, coverage: { retrieved: items.length, total, complete } };
}

/** Plain statement for the page when a list was not fully retrieved, or null when it was. */
export function coverageNote(label: string, c: Coverage): string | null {
  if (c.complete) return null;
  if (c.total === null) {
    return `${label}: ${c.retrieved} retrieved. The register did not report a total, so there may be more that are not shown.`;
  }
  return `${label}: ${c.retrieved} of ${c.total} retrieved. The rest are not shown, so this view is incomplete.`;
}

export function totalFrom(body: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = body[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return null;
}

/** PSC dates are notification dates: recorded, not effective. */
export function pscDates(item: { notified_on?: string; ceased_on?: string }) {
  return {
    effective: undefined,
    recorded: item.notified_on,
    start: item.notified_on,
    end: item.ceased_on,
    dateBasis: 'notified' as const,
  };
}

/** Filing dates: processed date is recorded; action_date (when present) is effective. */
export function filingDates(item: { date?: string; action_date?: string | number | null }) {
  const action = typeof item.action_date === 'string' ? item.action_date : undefined;
  return { effective: action, recorded: item.date };
}
