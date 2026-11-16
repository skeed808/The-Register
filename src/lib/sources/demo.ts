import * as demo from '@/data/demo-case';
import type { EntityBundle } from '../types';

export function isDemoId(id: string) {
  return /^DM\d{6}$/.test(id);
}

/** The demo bundle carries the whole case; views filter to the focal entity. */
export function getDemoBundle(id: string): EntityBundle | null {
  const entity = demo.entities[id];
  if (!entity) return null;
  return {
    entity,
    entities: demo.entities,
    evidence: demo.evidence,
    relationships: demo.relationships,
    contras: demo.contras,
    sources: demo.sources,
    isDemo: true,
    clock: demo.DEMO_CLOCK,
    limits: [],
  };
}

export interface SearchCandidate {
  id: string;
  name: string;
  number: string;
  status: string;
  incorporated?: string;
  postcodeDistrict?: string;
  matchReason: string;
  exact: boolean;
  mark: 'L' | 'C' | 'S';
}

const district = (addr?: string) => addr?.match(/[A-Z]{1,2}\d[A-Z\d]?(?=\s*\d[A-Z]{2}$)/)?.[0];

export function searchDemo(q: string): SearchCandidate[] {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  const words = query.split(/\s+/);
  return demo.companyIds
    .map((id) => demo.entities[id])
    .map((e) => {
      const exact = e.number?.toLowerCase() === query;
      const name = e.name.toLowerCase();
      const hits = words.filter((w) => name.includes(w)).length;
      return { e, exact, hits };
    })
    .filter((r) => r.exact || r.hits > 0)
    .sort((a, b) => Number(b.exact) - Number(a.exact) || b.hits - a.hits)
    .map(({ e, exact, hits }) => ({
      id: e.id,
      name: e.name,
      number: e.number!,
      status: e.status ?? '',
      incorporated: e.incorporated,
      postcodeDistrict: district(e.registeredOffice),
      matchReason: exact ? 'Exact company number' : `Name: ${hits} of ${words.length} word${words.length === 1 ? '' : 's'}`,
      exact,
      mark: 'S' as const,
    }));
}
