'use client';
import { useState, type ReactNode } from 'react';
import type { EntityBundle } from '@/lib/types';
import { assess } from '@/lib/confidence';
import { fmtDate, fmtStamp } from '@/lib/dates';
import { spineEvents } from './AsAt';
import { useContraStatuses, useSessionState } from './useCaseState';

const ALL = [
  { id: 'summary', label: 'Summary' },
  { id: 'entity', label: 'Entity' },
  { id: 'structure', label: 'Officers and control' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'contra', label: 'Differences between sources' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'appendix', label: 'Provenance appendix' },
];

export function Dossier({ bundle }: { bundle: EntityBundle }) {
  const e = bundle.entity;
  const [order, setOrder] = useState(ALL.map((s) => s.id));
  const [on, setOn] = useState<Record<string, boolean>>(Object.fromEntries(ALL.map((s) => [s.id, true])));
  const [frozen, setFrozen] = useState<string | null>(null);
  const { statusOf, explained } = useContraStatuses(bundle.contras);
  const [notes] = useSessionState<Record<string, string>>('reg.contra.notes', {});
  const [pickedContras] = useSessionState<string[]>('reg.dossier.contras', bundle.contras.map((c) => c.id));

  const ev = bundle.evidence.filter((x) => x.entityId === e.id);
  const rels = bundle.relationships.filter((r) => r.to === e.id || r.from === e.id);
  const contras = bundle.contras.filter((c) => c.entityId === e.id && pickedContras.includes(c.id));
  const events = spineEvents(bundle);
  const stamp = frozen ?? bundle.clock;
  const bands = ev.map((x) => assess(bundle, x, explained).band);
  const count = (b: string) => bands.filter((x) => x === b).length;

  const move = (id: string, dir: -1 | 1) =>
    setOrder((o) => {
      const i = o.indexOf(id);
      const j = i + dir;
      if (j < 0 || j >= o.length) return o;
      const next = [...o];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const Sheet = ({ children }: { children: ReactNode }) => (
    <section className="sheet">
      <div className={`runhead${bundle.isDemo ? ' sim' : ''}`}>
        <span>The Register · {e.name} · {e.number}</span>
        <span>{bundle.isDemo ? 'S · Fictional demonstration · ' : ''}Snapshot {fmtStamp(stamp)} UTC</span>
      </div>
      {children}
    </section>
  );

  const body: Record<string, ReactNode> = {
    summary: (
      <>
        <h2>Summary</h2>
        <p>
          This dossier sets out {ev.length} findings about {e.name} ({e.number}) drawn from {new Set(ev.map((x) => x.sourceId)).size} sources,
          as they stood at {fmtStamp(stamp)} UTC. {count('Strong')} are assessed Strong, {count('Probable')} Probable, {count('Possible')} Possible
          and {count('Unresolved')} Unresolved under the published rubric.
        </p>
        <p>
          {contras.length
            ? `Sources differ on ${contras.length} point${contras.length === 1 ? '' : 's'}, set out under Differences between sources. A difference between sources is not a finding of wrongdoing.`
            : 'No differences between sources are included in this dossier.'}
        </p>
      </>
    ),
    entity: (
      <>
        <h2>Entity</h2>
        <table><tbody>
          <tr><th>Registered name</th><td>{e.name}</td></tr>
          <tr><th>Number</th><td className="mono">{e.number}</td></tr>
          <tr><th>Status</th><td>{e.status}{e.dissolved ? `, ${fmtDate(e.dissolved)}` : ''}</td></tr>
          <tr><th>Type</th><td>{e.companyType}</td></tr>
          <tr><th>Incorporated</th><td>{fmtDate(e.incorporated)}</td></tr>
          <tr><th>Registered office</th><td>{e.registeredOffice}</td></tr>
          {e.sic?.length ? <tr><th>Nature of business</th><td>{e.sic.join('; ')}</td></tr> : null}
        </tbody></table>
      </>
    ),
    structure: (
      <>
        <h2>Officers and control</h2>
        <table>
          <thead><tr><th>Name</th><th>Role</th><th>From</th><th>To</th><th>Folio</th></tr></thead>
          <tbody>
            {rels.map((r) => (
              <tr key={r.id}>
                <td>{bundle.entities[r.from === e.id ? r.to : r.from]?.name}</td>
                <td>{r.from === e.id ? `${r.label} (held by this entity)` : r.label}</td>
                <td>{fmtDate(r.start)}</td><td>{r.end ? fmtDate(r.end) : 'In force'}</td>
                <td className="mono">{r.evidenceIds.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    ),
    timeline: (
      <>
        <h2>Timeline</h2>
        <table>
          <thead><tr><th style={{ width: '22%' }}>Effective</th><th>Event</th></tr></thead>
          <tbody>{events.map((x, i) => <tr key={i}><td className="mono">{fmtDate(x.date)}</td><td>{x.label}</td></tr>)}</tbody>
        </table>
      </>
    ),
    contra: (
      <>
        <h2>Differences between sources</h2>
        {contras.length === 0 ? <p>None included.</p> : null}
        {contras.map((c) => {
          const a = bundle.evidence.find((x) => x.id === c.evidenceA)!;
          const b = bundle.evidence.find((x) => x.id === c.evidenceB)!;
          return (
            <div key={c.id} style={{ marginBottom: '12pt' }}>
              <p><strong>{c.title}.</strong></p>
              <table><tbody>
                <tr><th style={{ width: '30%' }}>{bundle.sources[a.sourceId]?.name} <span className="mono">({a.id})</span></th><td>{a.value}</td></tr>
                <tr><th>{bundle.sources[b.sourceId]?.name} <span className="mono">({b.id})</span></th><td>{b.value}</td></tr>
              </tbody></table>
              <p style={{ marginTop: '4pt' }}>{c.difference}</p>
              <p>Researcher assessment: {statusOf(c)}{notes[c.id] ? `. Note: ${notes[c.id]}` : ''}.</p>
            </div>
          );
        })}
      </>
    ),
    evidence: (
      <>
        <h2>Evidence</h2>
        <table>
          <thead><tr><th>Id</th><th>Finding</th><th>Value</th><th>Confidence</th></tr></thead>
          <tbody>
            {ev.map((x, i) => (
              <tr key={x.id}><td className="mono">{x.id}</td><td>{x.claim}</td><td>{x.value}</td><td>{bands[i]}</td></tr>
            ))}
          </tbody>
        </table>
      </>
    ),
    appendix: (
      <>
        <h2>Provenance appendix</h2>
        <table>
          <thead><tr><th>Id</th><th>Mark</th><th>Source and folio</th><th>Effective</th><th>Recorded</th><th>Retrieved</th></tr></thead>
          <tbody>
            {ev.map((x) => (
              <tr key={x.id}>
                <td className="mono">{x.id}</td><td className="mono">{x.mark}</td>
                <td>{bundle.sources[x.sourceId]?.name}<br /><span className="mono">{x.folio}</span></td>
                <td className="mono">{fmtDate(x.effective)}</td><td className="mono">{fmtDate(x.recorded)}</td><td className="mono">{fmtStamp(x.retrieved)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ marginTop: '10pt' }}>Marks: L live, fetched during the session. C cached, age shown in the workspace. I imported dataset. S simulated demonstration data.</p>
        <p>
          Data protection: this document may contain personal data about company officers taken from public registers. It is provided for research into
          companies. Do not use it for decisions about employment, housing, credit or insurance, and do not keep it longer than your purpose requires.
        </p>
      </>
    ),
  };

  return (
    <div className="dossier">
      <div className="sections no-print">
        <ol>
          {order.map((id, i) => {
            const s = ALL.find((x) => x.id === id)!;
            return (
              <li key={id}>
                <input type="checkbox" id={`sec-${id}`} checked={on[id]} onChange={(ev2) => setOn((p) => ({ ...p, [id]: ev2.target.checked }))} />
                <label htmlFor={`sec-${id}`}>{s.label}</label>
                <span className="move">
                  <button type="button" className="textlink" disabled={i === 0} onClick={() => move(id, -1)} aria-label={`Move ${s.label} up`}>Up</button>
                  <button type="button" className="textlink" disabled={i === order.length - 1} onClick={() => move(id, 1)} aria-label={`Move ${s.label} down`}>Down</button>
                </span>
              </li>
            );
          })}
        </ol>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start', marginTop: 24 }}>
          {frozen ? (
            <>
              <p className="state-line" style={{ margin: 0 }}>Snapshot frozen at {fmtStamp(frozen)} UTC.</p>
              <button type="button" className="textlink" onClick={() => setFrozen(null)}>Unfreeze (live values may then change)</button>
            </>
          ) : (
            <button type="button" className="textlink" onClick={() => setFrozen(bundle.isDemo ? bundle.clock : new Date().toISOString())}>Freeze snapshot</button>
          )}
          <button type="button" className="btn" onClick={() => window.print()}>Print or save as PDF</button>
          <p className="state-line" style={{ margin: 0 }}>Differences and notes come from the Contra view. The summary is generated from counts, not written by a model.</p>
        </div>
      </div>

      <div className="preview">
        <div className="sheet-scale">
          <Sheet>
            <p className="mono" style={{ marginTop: '60pt' }}>Intelligence dossier</p>
            <h1>{e.name}</h1>
            <p className="mono">{e.number} · {e.status} · values as at {fmtStamp(stamp)} UTC</p>
            {bundle.isDemo ? <p style={{ marginTop: '14pt' }}>This is a fictional demonstration. No real company or person is described.</p> : null}
            {order.filter((id) => on[id] && (id === 'summary' || id === 'entity')).map((id) => <div key={id}>{body[id]}</div>)}
          </Sheet>
          {order.filter((id) => on[id] && id !== 'summary' && id !== 'entity').map((id) => <Sheet key={id}>{body[id]}</Sheet>)}
        </div>
      </div>
    </div>
  );
}
