import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { collectPages, coverageNote, filingDates, provenanceFromDate, pscDates, totalFrom } from '../src/lib/sources/ch-map';
import { clientIp, trustedHopsFromEnv } from '../src/lib/request-ip';

const NOW = '2026-11-16T20:00:00Z';

describe('Live versus Cached', () => {
  test('a response produced seconds ago is Live', () => {
    const p = provenanceFromDate('Mon, 16 Nov 2026 19:59:40 GMT', NOW);
    assert.equal(p.mark, 'L');
  });
  test('a response produced 40 minutes ago (served from cache) is Cached with its age', () => {
    const p = provenanceFromDate('Mon, 16 Nov 2026 19:20:00 GMT', NOW);
    assert.equal(p.mark, 'C');
    assert.equal(p.ageMinutes, 40);
    assert.equal(p.fetchedAt, '2026-11-16T19:20:00.000Z');
  });
  test('a missing Date header is Cached with unknown age, never Live', () => {
    const p = provenanceFromDate(null, NOW);
    assert.equal(p.mark, 'C');
    assert.equal(p.ageMinutes, null);
  });
});

describe('bounded pagination', () => {
  const fake = (total: number | null, size = 100, reportTotal = true) => {
    const calls: number[] = [];
    const fetchPage = async (start: number) => {
      calls.push(start);
      const n = Math.max(0, Math.min(size, (total ?? 250) - start));
      return { items: Array.from({ length: n }, (_, i) => start + i), total: reportTotal ? total : null };
    };
    return { calls, fetchPage };
  };
  test('stops after one page when everything fits', async () => {
    const f = fake(42);
    const r = await collectPages(f.fetchPage, 3);
    assert.deepEqual(f.calls, [0]);
    assert.deepEqual(r.coverage, { retrieved: 42, total: 42, complete: true });
  });
  test('pages with zero-based start_index until complete', async () => {
    const f = fake(230);
    const r = await collectPages(f.fetchPage, 3);
    assert.deepEqual(f.calls, [0, 100, 200]);
    assert.equal(r.coverage.complete, true);
  });
  test('stops at the page cap and reports the list as incomplete', async () => {
    const f = fake(412);
    const r = await collectPages(f.fetchPage, 3);
    assert.deepEqual(f.calls, [0, 100, 200]);
    assert.deepEqual(r.coverage, { retrieved: 300, total: 412, complete: false });
    assert.match(coverageNote('Officers', r.coverage)!, /300 of 412/);
  });
  test('with no reported total, full pages up to the cap are treated as possibly incomplete', async () => {
    const f = fake(null, 100, false);
    const r = await collectPages(f.fetchPage, 1);
    assert.equal(r.coverage.complete, false);
    assert.match(coverageNote('Officers', r.coverage)!, /did not report a total/);
  });
  test('a complete list produces no note', () =>
    assert.equal(coverageNote('Officers', { retrieved: 3, total: 3, complete: true }), null));
  test('reads totals from the field each endpoint uses', () => {
    assert.equal(totalFrom({ total_results: 7 }, 'total_results'), 7);
    assert.equal(totalFrom({ total_count: 9 }, 'total_count'), 9);
    assert.equal(totalFrom({}, 'total_results'), null);
  });
});

describe('date semantics', () => {
  test('PSC notified_on and ceased_on are recorded dates, never effective', () => {
    const d = pscDates({ notified_on: '2026-06-19', ceased_on: '2026-09-01' });
    assert.equal(d.effective, undefined);
    assert.equal(d.recorded, '2026-06-19');
    assert.equal(d.end, '2026-09-01');
    assert.equal(d.dateBasis, 'notified');
  });
  test('filing date is recorded; action_date is effective only when present', () => {
    assert.deepEqual(filingDates({ date: '2025-01-22', action_date: '2024-12-31' }), { effective: '2024-12-31', recorded: '2025-01-22' });
    assert.deepEqual(filingDates({ date: '2025-01-22' }), { effective: undefined, recorded: '2025-01-22' });
    assert.deepEqual(filingDates({ date: '2025-01-22', action_date: null }), { effective: undefined, recorded: '2025-01-22' });
  });
});

describe('client IP behind trusted proxies', () => {
  test('with one trusted hop, the right-most address is used and client-supplied entries are ignored', () =>
    assert.equal(clientIp('6.6.6.6, 203.0.113.9', 1), '203.0.113.9'));
  test('with two trusted hops, the second from the right is used', () =>
    assert.equal(clientIp('6.6.6.6, 203.0.113.9, 10.0.0.2', 2), '203.0.113.9'));
  test('a missing header shares one fail-safe bucket', () => assert.equal(clientIp(null, 1), 'unknown'));
  test('more hops than entries falls back to the shared bucket', () => assert.equal(clientIp('203.0.113.9', 2), 'unknown'));
  test('bad hop settings default to one', () => {
    assert.equal(trustedHopsFromEnv(undefined), 1);
    assert.equal(trustedHopsFromEnv('0'), 1);
    assert.equal(trustedHopsFromEnv('2'), 2);
  });
});
