import 'server-only';
// Live Companies House adapter. Server-only: the API key never reaches the browser.
// Rules from the spec:
//  - company-level data may be cached for at most 60 minutes;
//  - officer and PSC data is fetched with no-store and never written anywhere;
//  - officers expose name, role, appointed and resigned dates only.
// UNTESTED against the live API in this build: it needs COMPANIES_HOUSE_API_KEY and
// network access to api.company-information.service.gov.uk.

import type { Entity, EntityBundle, Evidence, Relationship, Source } from '../types';
import type { SearchCandidate } from './demo';

const BASE = 'https://api.company-information.service.gov.uk';
const PUBLIC = 'https://find-and-update.company-information.service.gov.uk';

export const chSources: Record<string, Source> = {
  ch: { id: 'ch', name: 'Companies House', reliability: 'statutory', freshHours: 24, licence: 'Open Government Licence (verify before reuse)' },
};

export class RegisterBusyError extends Error {
  retryAfter: number;
  constructor(retryAfter: number) {
    super('Companies House rate limit reached');
    this.retryAfter = retryAfter;
  }
}

function auth() {
  const key = process.env.COMPANIES_HOUSE_API_KEY;
  if (!key) return null;
  return 'Basic ' + Buffer.from(`${key}:`).toString('base64');
}

export function liveAvailable() {
  return Boolean(process.env.COMPANIES_HOUSE_API_KEY);
}

type Cache = 'company' | 'personal';

async function get<T>(path: string, cache: Cache): Promise<{ data: T; fetchedAt: string } | null> {
  const a = auth();
  if (!a) return null;
  const init: RequestInit & { next?: { revalidate: number } } =
    cache === 'company' ? { next: { revalidate: 3600 } } : { cache: 'no-store' };
  const res = await fetch(BASE + path, { ...init, headers: { Authorization: a } });
  if (res.status === 429) throw new RegisterBusyError(Number(res.headers.get('retry-after') ?? 60));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Companies House ${res.status} on ${path}`);
  // The Date header reflects when the response was produced, so a cached company
  // response keeps its original time and can be marked C with its age.
  const fetchedAt = new Date(res.headers.get('date') ?? Date.now()).toISOString();
  return { data: (await res.json()) as T, fetchedAt };
}

const addr = (a?: Record<string, string>) =>
  a ? [a.premises, a.address_line_1, a.address_line_2, a.locality, a.postal_code].filter(Boolean).join(', ') : undefined;

export async function searchCompanies(q: string): Promise<SearchCandidate[]> {
  const r = await get<{ items?: Array<Record<string, any>> }>(`/search/companies?q=${encodeURIComponent(q)}&items_per_page=15`, 'company');
  const query = q.trim().toUpperCase();
  const words = q.trim().toLowerCase().split(/\s+/);
  return (r?.data.items ?? []).map((it) => {
    const exact = it.company_number === query;
    const name: string = it.title ?? '';
    const hits = words.filter((w) => name.toLowerCase().includes(w)).length;
    return {
      id: it.company_number,
      name,
      number: it.company_number,
      status: it.company_status ?? '',
      incorporated: it.date_of_creation,
      postcodeDistrict: it.address?.postal_code?.split(' ')[0],
      matchReason: exact ? 'Exact company number' : `Name: ${hits} of ${words.length} word${words.length === 1 ? '' : 's'}`,
      exact,
      mark: 'L' as const,
    };
  });
}

export async function getLiveBundle(number: string): Promise<EntityBundle | null> {
  const profile = await get<Record<string, any>>(`/company/${number}`, 'company');
  if (!profile) return null;
  const p = profile.data;
  const clock = new Date().toISOString();
  const ageMin = (Date.parse(clock) - Date.parse(profile.fetchedAt)) / 60000;
  const companyMark = ageMin > 1 ? 'C' : 'L';

  const entity: Entity = {
    id: number,
    kind: p.type === 'llp' ? 'llp' : 'company',
    name: p.company_name,
    number,
    status: p.company_status,
    companyType: p.type,
    incorporated: p.date_of_creation,
    dissolved: p.date_of_cessation,
    registeredOffice: addr(p.registered_office_address),
    sic: p.sic_codes ?? [],
    mark: companyMark,
  };

  const evidence: Evidence[] = [];
  let n = 1;
  const push = (e: Omit<Evidence, 'id' | 'entityId' | 'match' | 'status'> & Partial<Evidence>) =>
    evidence.push({ id: `L-${String(n++).padStart(3, '0')}`, entityId: number, match: 'exact-id', status: 'current', ...e } as Evidence);
  const base = { sourceId: 'ch', retrieved: profile.fetchedAt, mark: companyMark } as const;
  push({ ...base, factKey: 'name', claim: 'Registered name', value: p.company_name, folio: `CH·profile·${number}`, url: `${PUBLIC}/company/${number}` });
  push({ ...base, factKey: 'status', claim: 'Company status', value: p.company_status, folio: `CH·profile·${number}`, url: `${PUBLIC}/company/${number}` });
  if (p.date_of_creation)
    push({ ...base, factKey: 'incorporated', claim: 'Incorporated', value: p.date_of_creation, effective: p.date_of_creation, folio: `CH·profile·${number}`, url: `${PUBLIC}/company/${number}` });
  if (entity.registeredOffice)
    push({ ...base, factKey: 'office', claim: 'Registered office', value: entity.registeredOffice, folio: `CH·profile·${number}`, url: `${PUBLIC}/company/${number}` });
  if (p.accounts?.next_due)
    push({ ...base, factKey: 'accounts-due', claim: 'Next accounts due', value: p.accounts.next_due, folio: `CH·profile·${number}`, url: `${PUBLIC}/company/${number}` });

  const entities: Record<string, Entity> = { [number]: entity };
  const relationships: Relationship[] = [];

  // Officers and PSCs: fetched with no-store, held only for this response.
  const [officers, pscs, filings] = await Promise.all([
    get<{ items?: Array<Record<string, any>> }>(`/company/${number}/officers?items_per_page=50`, 'personal'),
    get<{ items?: Array<Record<string, any>> }>(`/company/${number}/persons-with-significant-control?items_per_page=50`, 'personal'),
    get<{ items?: Array<Record<string, any>> }>(`/company/${number}/filing-history?items_per_page=25`, 'company'),
  ]);

  officers?.data.items?.forEach((o, i) => {
    const pid = `O-${i + 1}`;
    entities[pid] = { id: pid, kind: o.officer_role?.startsWith('corporate') ? 'company' : 'person', name: o.name, mark: 'L' };
    const evId = `L-${String(n).padStart(3, '0')}`;
    push({
      sourceId: 'ch', retrieved: officers.fetchedAt, mark: 'L', factKey: `officer:${pid}`,
      claim: o.resigned_on ? 'Officer (resigned)' : 'Officer appointed', value: `${o.name}, ${String(o.officer_role).replace(/-/g, ' ')}`,
      effective: o.appointed_on, status: o.resigned_on ? 'historical' : 'current',
      folio: `CH·officers·${number}·${i + 1}`, url: `${PUBLIC}/company/${number}/officers`,
    });
    relationships.push({ id: `R-O${i + 1}`, from: pid, to: number, role: o.officer_role === 'secretary' ? 'secretary' : 'director', label: String(o.officer_role).replace(/-/g, ' '), start: o.appointed_on, end: o.resigned_on, evidenceIds: [evId] });
  });

  pscs?.data.items?.forEach((s, i) => {
    const pid = `P-${i + 1}`;
    const corporate = String(s.kind ?? '').includes('corporate');
    entities[pid] = { id: pid, kind: corporate ? 'company' : 'person', name: s.name, mark: 'L' };
    const evId = `L-${String(n).padStart(3, '0')}`;
    const control = (s.natures_of_control ?? []).join(', ').replace(/-/g, ' ');
    push({
      sourceId: 'ch', retrieved: pscs.fetchedAt, mark: 'L', factKey: `psc:${pid}`,
      claim: s.ceased_on ? 'Person with significant control (ceased)' : 'Person with significant control',
      value: `${s.name}${control ? ': ' + control : ''}`, effective: s.notified_on, status: s.ceased_on ? 'historical' : 'current',
      folio: `CH·psc·${number}·${i + 1}`, url: `${PUBLIC}/company/${number}/persons-with-significant-control`,
    });
    relationships.push({ id: `R-P${i + 1}`, from: pid, to: number, role: corporate ? 'parent' : 'psc', label: 'PSC', start: s.notified_on, end: s.ceased_on, evidenceIds: [evId] });
  });

  filings?.data.items?.forEach((f, i) => {
    push({
      sourceId: 'ch', retrieved: filings.fetchedAt, mark: companyMark, factKey: `filing:${f.transaction_id ?? i}`,
      claim: `Filing: ${f.type}`, value: String(f.description ?? '').replace(/-/g, ' '), effective: f.action_date ?? f.date, recorded: f.date,
      status: 'historical', folio: `CH·filing·${f.transaction_id ?? i}`, url: `${PUBLIC}/company/${number}/filing-history`,
    });
  });

  return {
    entity,
    entities,
    evidence,
    relationships,
    contras: [],
    sources: chSources,
    isDemo: false,
    clock,
    limits: [
      'Registered office and name history are not reconstructed for live companies: the API returns the current address only, and past changes appear as filing descriptions.',
      'Officers show name, role and dates only. Officer data is fetched for this page and not stored.',
    ],
  };
}
