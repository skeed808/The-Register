import 'server-only';
// Live Companies House adapter. Server-only: the API key never reaches the browser.
// Rules from the spec:
//  - company-level data may be cached for at most 60 minutes;
//  - officer and PSC data is fetched with no-store and never written anywhere;
//  - officers expose name, role, appointed and resigned dates only.
// Field semantics, provenance and pagination rules live in ./ch-map (unit tested).
// UNTESTED against the live API: needs COMPANIES_HOUSE_API_KEY and network access
// to api.company-information.service.gov.uk.

import type { Entity, EntityBundle, Evidence, Relationship, Source } from '../types';
import type { SearchCandidate } from './demo';
import {
  collectPages, coverageNote, filingDates, MAX_PAGES, PAGE_SIZE, provenanceFromDate, pscDates, totalFrom,
  type Coverage, type Provenance,
} from './ch-map';

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
type Body = Record<string, any>;

async function get(path: string, cache: Cache): Promise<{ data: Body; prov: Provenance } | null> {
  const a = auth();
  if (!a) return null;
  const init: RequestInit & { next?: { revalidate: number } } =
    cache === 'company' ? { next: { revalidate: 3600 } } : { cache: 'no-store' };
  const res = await fetch(BASE + path, { ...init, headers: { Authorization: a } });
  if (res.status === 429) throw new RegisterBusyError(Number(res.headers.get('retry-after') ?? 60));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Companies House ${res.status} on ${path}`);
  return { data: (await res.json()) as Body, prov: provenanceFromDate(res.headers.get('date'), new Date().toISOString()) };
}

const addr = (a?: Record<string, string>) =>
  a ? [a.premises, a.address_line_1, a.address_line_2, a.locality, a.postal_code].filter(Boolean).join(', ') : undefined;

export async function searchCompanies(q: string): Promise<SearchCandidate[]> {
  const r = await get(`/search/companies?q=${encodeURIComponent(q)}&items_per_page=15`, 'company');
  if (!r) return [];
  const query = q.trim().toUpperCase();
  const words = q.trim().toLowerCase().split(/\s+/);
  return ((r.data.items as Body[]) ?? []).map((it) => {
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
      mark: r.prov.mark,
      ageMinutes: r.prov.mark === 'C' ? r.prov.ageMinutes : undefined,
    };
  });
}

/** Paged list fetch. Returns items, coverage and the provenance of the first page. */
async function list(path: string, cache: Cache, maxPages: number, totalKeys: string[]) {
  let prov: Provenance | null = null;
  const { items, coverage } = await collectPages<Body>(async (start) => {
    const sep = path.includes('?') ? '&' : '?';
    const r = await get(`${path}${sep}items_per_page=${PAGE_SIZE}&start_index=${start}`, cache);
    if (!r) return null;
    prov ??= r.prov;
    return { items: (r.data.items as Body[]) ?? [], total: totalFrom(r.data, ...totalKeys) };
  }, maxPages);
  return { items, coverage, prov: prov as Provenance | null };
}

export async function getLiveBundle(number: string): Promise<EntityBundle | null> {
  const profile = await get(`/company/${number}`, 'company');
  if (!profile) return null;
  const p = profile.data;
  const clock = new Date().toISOString();
  const companyMark = profile.prov.mark;

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
  const nextId = () => `L-${String(n++).padStart(3, '0')}`;
  const push = (e: Omit<Evidence, 'id' | 'entityId' | 'match' | 'status'> & Partial<Evidence>) => {
    const id = nextId();
    evidence.push({ id, entityId: number, match: 'exact-id', status: 'current', ...e } as Evidence);
    return id;
  };
  const base = { sourceId: 'ch', retrieved: profile.prov.fetchedAt, mark: companyMark } as const;
  const profileUrl = `${PUBLIC}/company/${number}`;
  push({ ...base, factKey: 'name', claim: 'Registered name', value: p.company_name, folio: `CH·profile·${number}`, url: profileUrl });
  push({ ...base, factKey: 'status', claim: 'Company status', value: p.company_status, folio: `CH·profile·${number}`, url: profileUrl });
  if (p.date_of_creation)
    push({ ...base, factKey: 'incorporated', claim: 'Incorporated', value: p.date_of_creation, effective: p.date_of_creation, folio: `CH·profile·${number}`, url: profileUrl });
  if (entity.registeredOffice)
    push({ ...base, factKey: 'office', claim: 'Registered office', value: entity.registeredOffice, folio: `CH·profile·${number}`, url: profileUrl });
  if (p.accounts?.next_due)
    push({ ...base, factKey: 'accounts-due', claim: 'Next accounts due', value: p.accounts.next_due, folio: `CH·profile·${number}`, url: profileUrl });

  const entities: Record<string, Entity> = { [number]: entity };
  const relationships: Relationship[] = [];

  // Officers and PSCs: no-store, bounded pagination, held only for this response.
  const [officers, pscs, filings] = await Promise.all([
    list(`/company/${number}/officers`, 'personal', MAX_PAGES.officers, ['total_results']),
    list(`/company/${number}/persons-with-significant-control`, 'personal', MAX_PAGES.pscs, ['total_results']),
    list(`/company/${number}/filing-history`, 'company', MAX_PAGES.filings, ['total_count']),
  ]);

  officers.items.forEach((o, i) => {
    const pid = `O-${i + 1}`;
    entities[pid] = { id: pid, kind: String(o.officer_role ?? '').startsWith('corporate') ? 'company' : 'person', name: o.name, mark: 'L' };
    const role = String(o.officer_role ?? 'officer').replace(/-/g, ' ');
    const evId = push({
      sourceId: 'ch', retrieved: officers.prov?.fetchedAt ?? clock, mark: officers.prov?.mark ?? 'L', factKey: `officer:${pid}`,
      claim: o.resigned_on ? 'Officer (resigned)' : 'Officer appointed', value: `${o.name}, ${role}`,
      effective: o.appointed_on, ended: o.resigned_on, endBasis: 'effective', status: o.resigned_on ? 'historical' : 'current',
      folio: `CH·officers·${number}·${i + 1}`, url: `${PUBLIC}/company/${number}/officers`,
    });
    relationships.push({
      id: `R-O${i + 1}`, from: pid, to: number, role: o.officer_role === 'secretary' ? 'secretary' : 'director',
      label: role, start: o.appointed_on, end: o.resigned_on, dateBasis: 'effective', evidenceIds: [evId],
    });
  });

  pscs.items.forEach((s, i) => {
    const pid = `P-${i + 1}`;
    const corporate = String(s.kind ?? '').includes('corporate') || String(s.kind ?? '').includes('legal-person');
    entities[pid] = { id: pid, kind: corporate ? 'company' : 'person', name: s.name, mark: 'L' };
    const d = pscDates(s);
    const control = ((s.natures_of_control as string[]) ?? []).join(', ').replace(/-/g, ' ');
    const evId = push({
      sourceId: 'ch', retrieved: pscs.prov?.fetchedAt ?? clock, mark: pscs.prov?.mark ?? 'L', factKey: `psc:${pid}`,
      claim: s.ceased_on ? 'Person with significant control (ceased)' : 'Person with significant control',
      value: `${s.name}${control ? ': ' + control : ''}`,
      effective: d.effective, recorded: d.recorded, ended: d.end, endBasis: 'notified', status: s.ceased_on ? 'historical' : 'current',
      excerpt: `Notified to Companies House on ${d.recorded ?? 'an unstated date'}${d.end ? `; cessation notified on ${d.end}` : ''}. The API does not give the date control began or ended.`,
      folio: `CH·psc·${number}·${i + 1}`, url: `${PUBLIC}/company/${number}/persons-with-significant-control`,
    });
    relationships.push({
      id: `R-P${i + 1}`, from: pid, to: number, role: corporate ? 'parent' : 'psc', label: 'PSC',
      start: d.start, end: d.end, dateBasis: d.dateBasis, evidenceIds: [evId],
    });
  });

  filings.items.forEach((f, i) => {
    const d = filingDates(f);
    push({
      sourceId: 'ch', retrieved: filings.prov?.fetchedAt ?? clock, mark: filings.prov?.mark ?? companyMark, factKey: `filing:${f.transaction_id ?? i}`,
      claim: `Filing: ${f.type}`, value: String(f.description ?? '').replace(/-/g, ' '), effective: d.effective, recorded: d.recorded,
      status: 'historical', folio: `CH·filing·${f.transaction_id ?? i}`, url: `${PUBLIC}/company/${number}/filing-history`,
    });
  });

  const coverage: Record<string, Coverage> = { officers: officers.coverage, pscs: pscs.coverage, filings: filings.coverage };
  const notes = [
    coverageNote('Officers', officers.coverage),
    coverageNote('Persons with significant control', pscs.coverage),
    filings.coverage.complete ? null : `Filings: the latest ${filings.coverage.retrieved}${filings.coverage.total !== null ? ` of ${filings.coverage.total}` : ''} are shown. Earlier filings are not retrieved.`,
  ].filter(Boolean) as string[];

  return {
    entity,
    entities,
    evidence,
    relationships,
    contras: [],
    sources: chSources,
    isDemo: false,
    clock,
    coverage,
    limits: [
      ...notes,
      'Dates for persons with significant control are the dates Companies House was notified, not the dates control began or ended, so the timeline places them by notification.',
      'Registered office and name history are not reconstructed for live companies: the API returns the current address only, and past changes appear as filing descriptions.',
      'Officers show name, role and dates only. Officer data is fetched for this page and not stored.',
    ],
  };
}
