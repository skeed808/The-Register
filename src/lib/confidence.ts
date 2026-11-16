// Deterministic confidence rubric (Stage 3 spec, section D).
// Five visible factors, one band, and the rule that produced it.
import type { Evidence, EntityBundle, MatchStrength, Reliability } from './types';
import { normalise } from './diff';

export type Band = 'Strong' | 'Probable' | 'Possible' | 'Unresolved';
export type Freshness = 'Fresh' | 'Ageing' | 'Stale';
export type ConflictLevel = 'None' | 'Minor' | 'Material unresolved';

export interface Assessment {
  band: Band;
  rule: 1 | 2 | 3 | 4;
  reliability: Reliability;
  match: MatchStrength;
  origins: number;
  freshness: Freshness;
  conflicts: ConflictLevel;
  reasons: string[];
}

const RELIABILITY_LABEL: Record<Reliability, string> = {
  statutory: 'Statutory',
  official: 'Official',
  'self-published': 'Self-published',
  secondary: 'Secondary',
};
const MATCH_LABEL: Record<MatchStrength, string> = {
  'exact-id': 'Exact ID',
  attribute: 'Attribute match',
  'name-only': 'Name only',
  ambiguous: 'Ambiguous',
};
export const labels = { reliability: RELIABILITY_LABEL, match: MATCH_LABEL };

function originOf(b: EntityBundle, sourceId: string) {
  return b.sources[sourceId]?.mirrorOf ?? sourceId;
}

function freshnessOf(b: EntityBundle, e: Evidence): Freshness {
  const src = b.sources[e.sourceId];
  const ageH = (Date.parse(b.clock) - Date.parse(e.retrieved)) / 36e5;
  if (!src || ageH <= src.freshHours) return 'Fresh';
  if (ageH <= src.freshHours * 4) return 'Ageing';
  return 'Stale';
}

/**
 * @param explainedFactKeys fact keys whose conflict the researcher marked Explained.
 */
export function assess(b: EntityBundle, e: Evidence, explainedFactKeys: Set<string> = new Set()): Assessment {
  const src = b.sources[e.sourceId];
  const reliability: Reliability = src?.reliability ?? 'secondary';
  const peers = b.evidence.filter((x) => x.factKey === e.factKey && x.status === e.status);
  const agree = peers.filter((x) => normalise(x.value) === normalise(e.value));
  const disagree = peers.filter((x) => normalise(x.value) !== normalise(e.value));
  const origins = new Set(agree.map((x) => originOf(b, x.sourceId))).size;
  const statutoryOrOfficialOrigins = new Set(
    agree
      .filter((x) => ['statutory', 'official'].includes(b.sources[x.sourceId]?.reliability ?? ''))
      .map((x) => originOf(b, x.sourceId)),
  ).size;

  // Differences that vanish under normalisation (case, spacing, Ltd/Limited) are not conflicts.
  // A disagreement the researcher has marked Explained drops to Minor, which caps the band at Probable.
  let conflicts: ConflictLevel = 'None';
  if (disagree.length > 0) {
    conflicts = explainedFactKeys.has(e.factKey) ? 'Minor' : 'Material unresolved';
  }
  const freshness = freshnessOf(b, e);
  const match = e.match;
  const strongSource = reliability === 'statutory' || reliability === 'official';

  const factors = {
    reliability,
    match,
    origins,
    freshness,
    conflicts,
  };
  const reasons = [
    `${RELIABILITY_LABEL[reliability]} source`,
    MATCH_LABEL[match],
    `${origins} independent origin${origins === 1 ? '' : 's'}`,
    freshness,
    conflicts === 'None' ? 'no conflicts' : conflicts === 'Minor' ? 'minor conflict' : 'material unresolved conflict',
  ];

  // Rule 1
  if (match === 'ambiguous' || conflicts === 'Material unresolved') {
    return { band: 'Unresolved', rule: 1, ...factors, reasons };
  }
  // Rule 2 (a Minor conflict caps at Probable, so Strong needs None)
  if (
    conflicts === 'None' &&
    ((match === 'exact-id' && reliability === 'statutory' && freshness === 'Fresh') || statutoryOrOfficialOrigins >= 2)
  ) {
    return { band: 'Strong', rule: 2, ...factors, reasons };
  }
  // Rule 3
  if (strongSource && (match === 'exact-id' || match === 'attribute') && freshness !== 'Stale') {
    return { band: 'Probable', rule: 3, ...factors, reasons };
  }
  // Rule 4
  return { band: 'Possible', rule: 4, ...factors, reasons };
}

export function summarise(a: Assessment) {
  return `${a.band}: rule ${a.rule}; ${a.reasons.join(', ')}.`;
}
