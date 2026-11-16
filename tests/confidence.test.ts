import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { assess } from '../src/lib/confidence';
import type { EntityBundle, Evidence, Source } from '../src/lib/types';
import { getDemoBundle } from '../src/lib/sources/demo';

const CLOCK = '2026-11-14T09:00:00Z';
const FRESH = '2026-11-14T08:00:00Z'; // 1 h old
const AGEING = '2026-11-12T09:00:00Z'; // 48 h old: beyond 24 h, within 96 h
const STALE = '2026-10-01T09:00:00Z'; // weeks old

const sources: Record<string, Source> = {
  reg: { id: 'reg', name: 'Register', reliability: 'statutory', freshHours: 24 },
  gaz: { id: 'gaz', name: 'Gazette', reliability: 'official', freshHours: 24 },
  lei: { id: 'lei', name: 'LEI index', reliability: 'official', freshHours: 24 },
  mirror: { id: 'mirror', name: 'Aggregator', reliability: 'official', mirrorOf: 'reg', freshHours: 24 },
  web: { id: 'web', name: 'Website', reliability: 'self-published', freshHours: 24 },
};

function row(id: string, over: Partial<Evidence>): Evidence {
  return {
    id, entityId: 'X', factKey: 'X:status', claim: 'Status', value: 'Active', sourceId: 'reg', folio: id,
    retrieved: FRESH, mark: 'S', match: 'exact-id', status: 'current', ...over,
  };
}
function bundle(rows: Evidence[]): EntityBundle {
  return {
    entity: { id: 'X', kind: 'company', name: 'X Ltd', mark: 'S' }, entities: {}, evidence: rows,
    relationships: [], contras: [], sources, isDemo: true, clock: CLOCK, limits: [],
  };
}
const band = (rows: Evidence[], id: string, explained = new Set<string>()) => {
  const b = bundle(rows);
  return assess(b, rows.find((r) => r.id === id)!, explained);
};

describe('rule 2, route a: exact statutory identifier', () => {
  test('fresh exact statutory evidence with no conflict is Strong', () => {
    const a = band([row('A', {})], 'A');
    assert.equal(a.band, 'Strong');
    assert.equal(a.rule, 2);
  });
  test('stale exact statutory evidence is not Strong, and not Probable either', () => {
    const a = band([row('A', { retrieved: STALE })], 'A');
    assert.equal(a.freshness, 'Stale');
    assert.equal(a.band, 'Possible');
  });
  test('ageing exact statutory evidence is Probable, not Strong', () => {
    const a = band([row('A', { retrieved: AGEING })], 'A');
    assert.equal(a.freshness, 'Ageing');
    assert.equal(a.band, 'Probable');
  });
});

describe('rule 2, route b: two independent authoritative origins', () => {
  test('two independent fresh sources with an attribute match are Strong', () => {
    const rows = [row('A', { sourceId: 'gaz', match: 'attribute' }), row('B', { sourceId: 'lei', match: 'attribute' })];
    assert.equal(band(rows, 'A').band, 'Strong');
  });
  test('regression: a name-only match cannot become Strong through two sources', () => {
    const rows = [row('A', { sourceId: 'gaz', match: 'name-only' }), row('B', { sourceId: 'lei', match: 'attribute' })];
    const a = band(rows, 'A');
    assert.equal(a.band, 'Possible');
    assert.notEqual(a.rule, 2);
  });
  test('regression: stale evidence cannot become Strong through two sources', () => {
    const rows = [row('A', { sourceId: 'gaz', match: 'attribute', retrieved: STALE }), row('B', { sourceId: 'lei', match: 'attribute' })];
    assert.notEqual(band(rows, 'A').band, 'Strong');
  });
  test('regression: ageing evidence cannot become Strong through two sources', () => {
    const rows = [row('A', { sourceId: 'gaz', match: 'attribute', retrieved: AGEING }), row('B', { sourceId: 'lei', match: 'attribute' })];
    assert.equal(band(rows, 'A').band, 'Probable');
  });
  test('a stale corroborating row does not count as an independent origin', () => {
    const rows = [row('A', { sourceId: 'gaz', match: 'attribute' }), row('B', { sourceId: 'lei', match: 'attribute', retrieved: STALE })];
    assert.equal(band(rows, 'A').band, 'Probable');
  });
  test('a name-only corroborating row does not count as an independent origin', () => {
    const rows = [row('A', { sourceId: 'gaz', match: 'attribute' }), row('B', { sourceId: 'lei', match: 'name-only' })];
    assert.equal(band(rows, 'A').band, 'Probable');
  });
  test('a mirror of a source is not independent of it', () => {
    const rows = [row('A', { sourceId: 'reg', match: 'attribute' }), row('B', { sourceId: 'mirror', match: 'attribute' })];
    const a = band(rows, 'A');
    assert.equal(a.origins, 1);
    assert.equal(a.band, 'Probable');
  });
  test('a self-published source does not count towards authoritative corroboration', () => {
    const rows = [row('A', { sourceId: 'gaz', match: 'attribute' }), row('B', { sourceId: 'web', match: 'attribute' })];
    assert.equal(band(rows, 'A').band, 'Probable');
  });
});

describe('rule 1: ambiguity and conflicts', () => {
  test('an ambiguous match is Unresolved even from a statutory source', () => {
    const a = band([row('A', { match: 'ambiguous' })], 'A');
    assert.equal(a.band, 'Unresolved');
    assert.equal(a.rule, 1);
  });
  test('an unresolved material conflict is Unresolved for both sides', () => {
    const rows = [row('A', {}), row('B', { sourceId: 'web', value: 'Dissolved', match: 'attribute' })];
    assert.equal(band(rows, 'A').band, 'Unresolved');
    assert.equal(band(rows, 'B').band, 'Unresolved');
  });
  test('a conflict marked Explained drops to Minor and caps the band at Probable', () => {
    const rows = [row('A', {}), row('B', { sourceId: 'web', value: 'Dissolved', match: 'attribute' })];
    const a = band(rows, 'A', new Set(['X:status']));
    assert.equal(a.conflicts, 'Minor');
    assert.equal(a.band, 'Probable');
  });
  test('formatting differences that vanish under normalisation are not conflicts', () => {
    const rows = [row('A', { value: 'Acme Limited' }), row('B', { sourceId: 'gaz', value: 'ACME LTD', match: 'attribute' })];
    assert.equal(band(rows, 'A').conflicts, 'None');
  });
});

describe('demo case regression', () => {
  const b = getDemoBundle('DM000102')!;
  const at = (id: string) => assess(b, b.evidence.find((e) => e.id === id)!);
  test('register name (exact, fresh, statutory) is Strong', () => assert.equal(at('E-020').band, 'Strong'));
  test('aggregator copy of the register name is Possible (secondary, mirror)', () => assert.equal(at('E-021').band, 'Possible'));
  test('owner on the register is Unresolved while the website disagrees', () => assert.equal(at('E-026').band, 'Unresolved'));
  test('owner on the register is Probable once the difference is explained', () =>
    assert.equal(assess(b, b.evidence.find((e) => e.id === 'E-026')!, new Set(['DM000102:owner'])).band, 'Probable'));
});
