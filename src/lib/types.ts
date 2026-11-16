// Core domain model for The Register.
// Every finding is an Evidence row. Entities, relationships and contra entries
// all point back to evidence ids, so nothing on screen exists without a source.

export type Mark = 'L' | 'C' | 'I' | 'S';

export type Reliability = 'statutory' | 'official' | 'self-published' | 'secondary';

export type MatchStrength = 'exact-id' | 'attribute' | 'name-only' | 'ambiguous';

export type EntityKind = 'company' | 'llp' | 'person';

export interface Source {
  id: string;
  name: string;
  reliability: Reliability;
  /** If this source republishes another, corroboration counts the origin once. */
  mirrorOf?: string;
  /** Freshness window in hours: within it Fresh, within 4x Ageing, else Stale. */
  freshHours: number;
  licence?: string;
}

export interface Entity {
  id: string;
  kind: EntityKind;
  name: string;
  /** Company number (or demo reference). People have no number. */
  number?: string;
  status?: 'active' | 'dissolved' | 'liquidation' | string;
  companyType?: string;
  incorporated?: string;
  dissolved?: string;
  registeredOffice?: string;
  sic?: string[];
  mark: Mark;
}

export interface Evidence {
  id: string;
  entityId: string;
  /** Groups rows that assert the same fact, so agreement and conflict can be computed. */
  factKey: string;
  claim: string;
  value: string;
  sourceId: string;
  /** Record reference within the source, shown as the folio. */
  folio: string;
  url?: string;
  /** When it took effect in the world. */
  effective?: string;
  /** When it reached the register or was published. */
  recorded?: string;
  /** When we fetched it (ISO timestamp). */
  retrieved: string;
  mark: Mark;
  match: MatchStrength;
  excerpt?: string;
  raw?: Record<string, unknown>;
  status: 'current' | 'historical' | 'superseded';
  /** Dataset publication date, for I rows. */
  datasetDate?: string;
}

export type RelRole = 'director' | 'secretary' | 'member' | 'psc' | 'parent';

export interface Relationship {
  id: string;
  from: string; // officer / owner / parent
  to: string; // company
  role: RelRole;
  label: string;
  start?: string;
  end?: string;
  /** 'notified' when start and end are dates Companies House was notified, not dates control changed. */
  dateBasis?: 'effective' | 'notified';
  evidenceIds: string[];
}

export type ContraStatus = 'open' | 'explained' | 'unresolved';

export interface Contra {
  id: string;
  entityId: string;
  factKey: string;
  title: string;
  evidenceA: string;
  evidenceB: string;
  difference: string;
  status: ContraStatus;
}

export interface DayBookEntry {
  date: string;
  mark: Mark;
  text: string;
  entityId: string;
  folio: string;
  contraId?: string;
}

export interface EntityBundle {
  entity: Entity;
  /** All entities referenced by this bundle (officers, parents, subsidiaries). */
  entities: Record<string, Entity>;
  evidence: Evidence[];
  relationships: Relationship[];
  contras: Contra[];
  sources: Record<string, Source>;
  isDemo: boolean;
  /** Reference clock for freshness: fixed for the demo, now for live. */
  clock: string;
  /** Plain statements of what this bundle cannot reconstruct or did not retrieve. */
  limits: string[];
  /** Per-list retrieval coverage for live bundles (officers, pscs, filings). */
  coverage?: Record<string, { retrieved: number; total: number | null; complete: boolean }>;
}

export interface CaseSummary {
  id: string;
  name: string;
  entityIds: string[];
}
