'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { searchDemo, type SearchCandidate } from '@/lib/sources/demo';
import { fmtDate } from '@/lib/dates';
import { Mark } from './Mark';

const PREVIEW = process.env.NEXT_PUBLIC_PREVIEW === '1';

type LiveState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; items: SearchCandidate[] }
  | { kind: 'busy'; seconds: number }
  | { kind: 'off'; message: string };

export function SearchClient() {
  const params = useSearchParams();
  const q = params.get('q') ?? '';
  const caseOnly = params.get('scope') === 'case';
  const demo = searchDemo(q);
  const [live, setLive] = useState<LiveState>({ kind: 'idle' });

  useEffect(() => {
    if (!q || caseOnly) { setLive({ kind: 'idle' }); return; }
    if (PREVIEW) { setLive({ kind: 'off', message: 'Live Companies House search runs on the server build. This preview searches the demonstration case only.' }); return; }
    let stop = false;
    setLive({ kind: 'loading' });
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then(async (r) => ({ status: r.status, body: (await r.json()) as { items: SearchCandidate[]; busy?: number; unavailable?: string; error?: string } }))
      .then(({ status, body }) => {
        if (stop) return;
        if (status === 429) setLive({ kind: 'busy', seconds: body.busy ?? 60 });
        else if (body.unavailable || body.error) setLive({ kind: 'off', message: body.unavailable ?? body.error! });
        else setLive({ kind: 'ok', items: body.items });
      })
      .catch(() => !stop && setLive({ kind: 'off', message: 'The register could not be reached.' }));
    return () => { stop = true; };
  }, [q, caseOnly]);

  const liveItems = live.kind === 'ok' ? live.items : [];
  const all = [...demo, ...liveItems];
  const exact = all.filter((c) => c.exact).length;
  const heading = !q
    ? 'Search a company'
    : exact
      ? `Exact match for ${q.toUpperCase()}`
      : all.length
        ? `No exact match. ${all.length} possible compan${all.length === 1 ? 'y' : 'ies'} for “${q}”.`
        : live.kind === 'loading' ? `Searching for “${q}”` : `Nothing found for “${q}”`;

  const row = (c: SearchCandidate) => (
    <div className={`ledger-row${c.mark === 'S' ? ' sim' : ''}`} key={c.mark + c.id}>
      <Link className="ledger-line grid12" style={{ textDecoration: 'none' }} href={`/e/${c.id}`}>
        <span className="ledger-margin"><span className="mono">{c.number}</span><Mark mark={c.mark} extra={c.mark === 'C' ? (c.ageMinutes == null ? 'age unknown' : `${c.ageMinutes} min`) : undefined} /></span>
        <span className="ledger-claim">
          {c.name}
          <span className="secondary-line">{c.matchReason}</span>
        </span>
        <span className="ledger-value">{c.status}</span>
        <span className="ledger-folio mono">{fmtDate(c.incorporated)}{c.postcodeDistrict ? ` · ${c.postcodeDistrict}` : ''}</span>
        <span className={`ledger-band band-${c.exact ? 'Strong' : 'Possible'}`}>{c.exact ? 'Strong' : 'Possible'}</span>
      </Link>
    </div>
  );

  return (
    <>
      <h1 className="opening" style={{ maxWidth: '24ch', fontSize: 36 }} aria-live="polite">{heading}</h1>
      {!q ? <p className="state-line">Type a company name or number in the bar above. A company number opens its entry directly. Try “Velloch”, “Tarnwick” or DM000103.</p> : null}
      {q && !exact && all.length ? <p className="state-line">A name match is only ever Possible. Open a candidate and check its number before relying on it.</p> : null}

      {q ? (
        <>
          <h2 className="section" style={{ marginTop: 40 }}>Demonstration case</h2>
          <div className="ledger-head grid12" aria-hidden="true">
            <span className="ledger-margin">Number · mark</span><span className="ledger-claim">Company and why it matched</span>
            <span className="ledger-value">Status</span><span className="ledger-folio">Incorporated · area</span><span className="ledger-band">Match</span>
          </div>
          {demo.length ? demo.map(row) : <p className="empty">No demonstration entity matches. Try searching by company number.</p>}

          {!caseOnly ? (
            <>
              <h2 className="section">Companies House, live</h2>
              {live.kind === 'loading' ? <div aria-busy="true">{[0, 1, 2].map((i) => <div className="ledger-row" key={i}><div className="ledger-line grid12"><span className="ledger-claim quiet">Searching the register</span></div></div>)}</div> : null}
              {live.kind === 'busy' ? <p className="empty">The register is busy. Try again in {live.seconds} seconds.</p> : null}
              {live.kind === 'off' ? <p className="empty">{live.message}</p> : null}
              {live.kind === 'ok' ? (liveItems.length ? liveItems.map(row) : <p className="empty">No live company matches. Try the company number.</p>) : null}
            </>
          ) : null}
        </>
      ) : null}
    </>
  );
}
