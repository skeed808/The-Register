'use client';
import { useEffect, useMemo, useState } from 'react';
import type { EntityBundle, Relationship } from '@/lib/types';
import { fmtDate, fmtStamp, inForce } from '@/lib/dates';
import { Mark } from './Mark';

const DAY = 864e5;
const toDay = (iso: string) => Math.floor(Date.parse(iso + 'T00:00:00Z') / DAY);
const fromDay = (d: number) => new Date(d * DAY).toISOString().slice(0, 10);

export interface SpineEvent { date: string; label: string; contra?: boolean }

export function spineEvents(bundle: EntityBundle): SpineEvent[] {
  const id = bundle.entity.id;
  const evs: SpineEvent[] = [];
  const contraIds = new Set(bundle.contras.flatMap((c) => [c.evidenceA, c.evidenceB]));
  for (const e of bundle.evidence) {
    if (e.entityId === id && e.effective) evs.push({ date: e.effective, label: e.claim, contra: contraIds.has(e.id) });
  }
  for (const r of bundle.relationships) {
    if (r.to !== id && r.from !== id) continue;
    if (r.end) evs.push({ date: r.end, label: `${bundle.entities[r.from]?.name}: ${r.label} ended` });
  }
  return evs.sort((a, b) => a.date.localeCompare(b.date));
}

export function useAsAt(bundle: EntityBundle) {
  const events = useMemo(() => spineEvents(bundle), [bundle]);
  const today = bundle.clock.slice(0, 10);
  const min = events[0]?.date ?? bundle.entity.incorporated ?? '2010-01-01';
  const [date, setDate] = useState(today);
  useEffect(() => {
    const d = new URLSearchParams(window.location.search).get('d');
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) setDate(d);
  }, []);
  const set = (d: string) => {
    const clamped = d < min ? min : d > today ? today : d;
    setDate(clamped);
    const u = new URL(window.location.href);
    u.searchParams.set('d', clamped);
    window.history.replaceState(null, '', u);
  };
  return { events, min, today, date, set };
}

export function Spine({ events, min, today, date, onChange }: { events: SpineEvent[]; min: string; today: string; date: string; onChange: (d: string) => void }) {
  const lo = toDay(min);
  const hi = toDay(today);
  const pos = (iso: string) => `${((toDay(iso) - lo) / Math.max(1, hi - lo)) * 100}%`;
  const years: number[] = [];
  for (let y = Number(min.slice(0, 4)) + 1; y <= Number(today.slice(0, 4)); y++) years.push(y);
  const step = (dir: 1 | -1) => {
    const dates = [...new Set(events.map((e) => e.date))];
    const next = dir === 1 ? dates.find((d) => d > date) : [...dates].reverse().find((d) => d < date);
    onChange(next ?? (dir === 1 ? today : min));
  };
  return (
    <div>
      <div className="spine">
        <div className="spine-rule" />
        {events.map((e, i) => <span key={i} className={`spine-tick${e.contra ? ' contra' : ''}`} style={{ left: pos(e.date) }} title={`${fmtDate(e.date)}: ${e.label}`} />)}
        {years.map((y) => <span key={y} className="spine-year" style={{ left: pos(`${y}-01-01`) }}>{y}</span>)}
        <span className="spine-handle" style={{ left: pos(date) }} />
        <input
          type="range" min={lo} max={hi} value={toDay(date)} aria-label="As-at date"
          aria-valuetext={fmtDate(date)}
          onChange={(e) => onChange(fromDay(Number(e.target.value)))}
          onKeyDown={(e) => { if (e.shiftKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); step(e.key === 'ArrowRight' ? 1 : -1); } }}
        />
      </div>
      <div className="spine-controls no-print">
        <label className="field">As at
          <input className="baseline-input" type="date" value={date} min={min} max={today} onChange={(e) => e.target.value && onChange(e.target.value)} />
        </label>
        <button type="button" className="textlink" onClick={() => step(-1)}>Earlier event</button>
        <button type="button" className="textlink" onClick={() => step(1)}>Later event</button>
        <button type="button" className="textlink" onClick={() => onChange(today)}>Today</button>
      </div>
    </div>
  );
}

export function AsAt({ bundle }: { bundle: EntityBundle }) {
  const { events, min, today, date, set } = useAsAt(bundle);
  const [vs, setVs] = useState('');
  const id = bundle.entity.id;
  const rels = bundle.relationships.filter((r) => r.to === id || r.from === id);
  const now = rels.filter((r) => inForce(date, r.start, r.end));
  const then = vs ? rels.filter((r) => inForce(vs, r.start, r.end)) : [];
  const rows: { r: Relationship; delta?: 'add' | 'rem' }[] = vs
    ? [
        ...now.map((r) => ({ r, delta: then.includes(r) ? undefined : ('add' as const) })),
        ...then.filter((r) => !now.includes(r)).map((r) => ({ r, delta: 'rem' as const })),
      ]
    : now.map((r) => ({ r }));
  const existed = !bundle.entity.incorporated || bundle.entity.incorporated <= date;
  const dissolved = bundle.entity.dissolved && bundle.entity.dissolved <= date;
  const dayEvents = events.filter((e) => e.date === date);

  return (
    <div>
      <Spine events={events} min={min} today={today} date={date} onChange={set} />
      <div className="spine-controls no-print" style={{ marginTop: 16 }}>
        <label className="field">Compare with
          <input className="baseline-input" type="date" value={vs} min={min} max={today} onChange={(e) => setVs(e.target.value)} />
        </label>
        {vs ? <button type="button" className="textlink" onClick={() => setVs('')}>Stop comparing</button> : null}
      </div>

      <h2 className="section" style={{ marginTop: 40 }} aria-live="polite">
        {bundle.entity.name} as at {fmtDate(date)}
      </h2>
      {!existed ? <p className="empty">The company was not yet incorporated on this date.</p> : null}
      {dissolved ? <p className="state-line">Dissolved on {fmtDate(bundle.entity.dissolved)}. Rows below were in force immediately before dissolution only if their dates say so.</p> : null}
      {dayEvents.length ? <p className="state-line">On this date: {dayEvents.map((e) => e.label).join('; ')}.</p> : null}
      {vs ? <p className="state-line"><span className="delta add">+</span> in force on {fmtDate(date)} but not on {fmtDate(vs)} · <span className="delta rem">−</span> in force on {fmtDate(vs)} but not on {fmtDate(date)}</p> : null}

      <div className="ledger-head grid12" aria-hidden="true">
        <span className="ledger-margin">Effective · mark</span>
        <span className="ledger-claim">In force</span>
        <span className="ledger-value">Recorded</span>
        <span className="ledger-folio">Retrieved</span>
      </div>
      {existed && rows.length === 0 ? <p className="empty">The evidence shows no officers or controllers in force on this date.</p> : null}
      {rows.map(({ r, delta }) => {
        const ev = bundle.evidence.find((e) => e.id === r.evidenceIds[0]);
        const outward = r.from === id;
        const other = bundle.entities[outward ? r.to : r.from];
        const late = ev?.recorded && ev.recorded > date && !delta;
        return (
          <div key={r.id + (delta ?? '')} className={`ledger-row${ev?.mark === 'S' ? ' sim' : ''}`}>
            <div className="ledger-line grid12" style={{ cursor: 'default' }}>
              <span className="ledger-margin">
                <span className="mono">{delta ? <span className={`delta ${delta}`}>{delta === 'add' ? '+' : '−'}</span> : null}{r.dateBasis === 'notified' ? 'Notified ' : ''}{fmtDate(r.start)}</span>
                {ev ? <Mark mark={ev.mark} /> : null}
              </span>
              <span className="ledger-claim">
                {outward ? `${r.label} of ${other?.name}` : `${other?.name}: ${r.label}`}
                <span className="secondary-line">
                  {r.end ? `${r.dateBasis === 'notified' ? 'Cessation notified' : 'Ended'} ${fmtDate(r.end)}` : 'No end date on record'} · <a className="mono" href={`/e/${ev?.entityId ?? id}#${ev?.id}`}>{ev?.id}</a>
                  {late ? ` · In force on this date, but not on the register until ${fmtDate(ev!.recorded)}.` : ''}
                </span>
              </span>
              <span className="ledger-value mono">{fmtDate(ev?.recorded)}</span>
              <span className="ledger-folio mono">{fmtStamp(ev?.retrieved)}</span>
            </div>
          </div>
        );
      })}
      {bundle.limits.map((l) => <p className="limit-note" key={l}>{l}</p>)}
    </div>
  );
}
