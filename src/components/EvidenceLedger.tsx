'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { EntityBundle, Evidence, Source } from '@/lib/types';
import { assess, labels, summarise, type Assessment } from '@/lib/confidence';
import { ageLabel, fmtDate, fmtStamp } from '@/lib/dates';
import { Mark } from './Mark';
import { useContraStatuses, useSessionState } from './useCaseState';

export function markExtra(e: Evidence, clock: string) {
  return e.mark === 'C' ? ageLabel(e.retrieved, clock) : undefined;
}

interface DateLine { label: string | null; date?: string }

/** The margin's dates. An unlabelled date is always the effective date; every other date is named. */
export function marginDates(e: Evidence, src?: Source): DateLine[] {
  const lines: DateLine[] = [];
  const recordedLabel = src?.recordedLabel ?? 'Recorded';
  if (e.effective) lines.push({ label: null, date: e.effective });
  if (e.recorded && e.recorded !== e.effective) lines.push({ label: recordedLabel, date: e.recorded });
  if (e.datasetDate && !e.recorded) lines.push({ label: 'Published', date: e.datasetDate });
  if (src?.retrievalIsCapture) lines.push({ label: 'Captured', date: e.retrieved.slice(0, 10) });
  if (e.ended) lines.push({ label: e.endBasis === 'notified' ? 'End notified' : 'Ended', date: e.ended });
  return lines.length ? lines : [{ label: null }];
}

/** Lets long folio references break only at their separators. */
export function Folio({ folio }: { folio: string }) {
  const parts = folio.split('·');
  return <>{parts.map((p, i) => <span key={i}>{p}{i < parts.length - 1 ? <>·<wbr /></> : null}</span>)}</>;
}

export function EvidenceLedger({ bundle, rows, showFilters = true }: { bundle: EntityBundle; rows?: Evidence[]; showFilters?: boolean }) {
  const all = rows ?? bundle.evidence.filter((e) => e.entityId === bundle.entity.id);
  const { explained } = useContraStatuses(bundle.contras);
  const [picked, setPicked] = useSessionState<string[]>('reg.dossier.evidence', []);
  const [open, setOpen] = useState<string | null>(null);
  const [raw, setRaw] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0);
  const [fSource, setFSource] = useState('');
  const [fMark, setFMark] = useState('');
  const [fBand, setFBand] = useState('');
  const [fFrom, setFFrom] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const assessed = useMemo(
    () => all.map((e) => ({ e, a: assess(bundle, e, explained) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [all, [...explained].join('|')],
  );
  const shown = assessed.filter(
    ({ e, a }) =>
      (!fSource || e.sourceId === fSource) && (!fMark || e.mark === fMark) && (!fBand || a.band === fBand) && (!fFrom || (e.effective ?? '') >= fFrom),
  );
  const sourceIds = [...new Set(all.map((e) => e.sourceId))];
  const contraFor = (e: Evidence) => bundle.contras.find((c) => c.evidenceA === e.id || c.evidenceB === e.id || c.factKey === e.factKey);

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      const t = ev.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      if (document.documentElement.dataset.keys === 'off') return;
      if (ev.key === 'j' || ev.key === 'k') {
        ev.preventDefault();
        const next = Math.min(shown.length - 1, Math.max(0, cursor + (ev.key === 'j' ? 1 : -1)));
        setCursor(next);
        listRef.current?.querySelectorAll<HTMLButtonElement>('button.ledger-line')[next]?.focus();
      }
      if (ev.key === 'Escape') setOpen(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const current = shown.filter(({ e }) => e.status === 'current');
  const past = shown.filter(({ e }) => e.status !== 'current');
  const groups = [
    { key: 'current', title: 'Current', rows: current },
    { key: 'historical', title: 'Historical: ended or superseded', rows: past },
  ].filter((g) => g.rows.length);

  const renderRow = ({ e, a }: (typeof shown)[number]) => {
    const isOpen = open === e.id;
    const contra = contraFor(e);
    const src = bundle.sources[e.sourceId];
    const hist = e.status !== 'current';
    const dates = marginDates(e, src);
    const recordedLabel = src?.recordedLabel ?? 'Recorded';
    return (
      <div key={e.id} id={e.id} className={`ledger-row${e.mark === 'S' ? ' sim' : ''}${hist ? ' hist' : ''}`}>
        <button type="button" className="ledger-line grid12" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : e.id)}>
          <span className="ledger-margin">
            <span className="margin-dates">
              {dates.map((d, i) => (
                <span key={i} className={`mono${d.label ? ' dated' : ''}`}>{d.label ? <span className="quiet">{d.label} </span> : <span className="sr-only">Effective </span>}{d.date ? fmtDate(d.date) : <><span aria-hidden="true">—</span><span className="sr-only">date not given</span></>}<span className="sr-only">. </span></span>
              ))}
            </span>
            <span><Mark mark={e.mark} extra={markExtra(e, bundle.clock)} />{contra ? <span className="contra-mark"> contra</span> : null}</span>
          </span>
          <span className="ledger-claim">
            {e.claim}
            <span className="secondary-line"><span className="sr-only">. Source: </span>{src?.name} · <span className="mono">{e.id}</span></span>
          </span>
          <span className="ledger-value"><span className="sr-only">. Value: </span>{e.value}<span className="sr-only">. Folio: </span></span>
          <span className="ledger-folio mono"><Folio folio={e.folio} /></span>
          <span className={`ledger-band band-${a.band}`}><span className="sr-only">Confidence: </span>{a.band}</span>
          {src?.limitation ? <span className="ledger-limitation"><strong>Limitation.</strong> {src.limitation}</span> : null}
        </button>
        {isOpen ? (
          <div className="ledger-detail grid12">
            <div className="inner">
              {e.excerpt ? <blockquote className="excerpt" style={{ margin: 0 }}>{e.excerpt}</blockquote> : <p className="quiet" style={{ margin: 0 }}>The source gives this value as a field, with no further text.</p>}
              <Factors a={a} />
              <div className="dates">
                <span><span className="quiet">Effective</span><span className="mono">{fmtDate(e.effective)}</span></span>
                <span><span className="quiet">{recordedLabel}</span><span className="mono">{fmtDate(e.recorded)}</span></span>
                {e.datasetDate ? <span><span className="quiet">Dataset published</span><span className="mono">{fmtDate(e.datasetDate)}</span></span> : null}
                {e.ended ? <span><span className="quiet">{e.endBasis === 'notified' ? 'End notified' : 'Ended'}</span><span className="mono">{fmtDate(e.ended)}</span></span> : null}
                <span><span className="quiet">{src?.retrievalIsCapture ? 'Captured (retrieved)' : 'Retrieved'}</span><span className="mono">{fmtStamp(e.retrieved)}</span></span>
                <span><span className="quiet">Source record</span>{e.url ? <a className="mono" href={e.url} rel="noreferrer" target="_blank">{e.folio}</a> : <span className="mono">{e.folio}</span>}</span>
              </div>
              {src?.licence ? <p className="checkline" style={{ margin: 0 }}>Licence: {src.licence}.</p> : null}
              <div className="dates no-print">
                {contra ? <Link href={`/e/${contra.entityId}/contra/${contra.id}`}>Compare the sources that differ</Link> : null}
                <button type="button" className="textlink" onClick={() => setRaw(raw === e.id ? null : e.id)}>{raw === e.id ? 'Hide raw record' : 'Show raw record'}</button>
                <button type="button" className="textlink" onClick={() => setPicked((p) => (p.includes(e.id) ? p.filter((x) => x !== e.id) : [...p, e.id]))}>
                  {picked.includes(e.id) ? 'Remove from dossier' : 'Add to dossier'}
                </button>
              </div>
              {raw === e.id ? <pre className="raw">{JSON.stringify(e, null, 2)}</pre> : null}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="ledger">
      {showFilters ? (
        <div className="filters no-print">
          <label className="field">Source
            <select className="baseline-select" value={fSource} onChange={(e) => setFSource(e.target.value)}>
              <option value="">All sources</option>
              {sourceIds.map((s) => <option key={s} value={s}>{bundle.sources[s]?.name ?? s}</option>)}
            </select>
          </label>
          <label className="field">Mark
            <select className="baseline-select" value={fMark} onChange={(e) => setFMark(e.target.value)}>
              <option value="">All marks</option>
              {['L', 'C', 'I', 'S'].map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label className="field">Confidence
            <select className="baseline-select" value={fBand} onChange={(e) => setFBand(e.target.value)}>
              <option value="">All bands</option>
              {['Strong', 'Probable', 'Possible', 'Unresolved'].map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label className="field">Effective from
            <input className="baseline-input" type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} />
          </label>
          <span className="state-line" aria-live="polite">{shown.length} of {all.length} entries</span>
        </div>
      ) : null}

      <div className="ledger-head grid12" aria-hidden="true">
        <span className="ledger-margin">Effective · others named</span>
        <span className="ledger-claim">Finding and source</span>
        <span className="ledger-value">Value</span>
        <span className="ledger-folio">Folio</span>
        <span className="ledger-band">Confidence</span>
      </div>

      <div ref={listRef}>
        {shown.length === 0 ? <p className="empty">No entries match these filters.</p> : null}
        {groups.map((g) => (
          <section key={g.key} aria-label={g.title}>
            {groups.length > 1 ? <h3 className="ledger-group">{g.title}<span className="count"><span className="sr-only">, </span>{g.rows.length}<span className="sr-only"> {g.rows.length === 1 ? 'entry' : 'entries'}</span></span></h3> : null}
            {g.rows.map(renderRow)}
          </section>
        ))}
      </div>
    </div>
  );
}

export function Factors({ a }: { a: Assessment }) {
  return (
    <div>
      <dl className="factors">
        <div><dt>Source reliability</dt><dd>{labels.reliability[a.reliability]}</dd></div>
        <div><dt>Match strength</dt><dd>{labels.match[a.match]}</dd></div>
        <div><dt>Corroboration</dt><dd>{a.origins} independent origin{a.origins === 1 ? '' : 's'}</dd></div>
        <div><dt>Freshness</dt><dd>{a.freshness}</dd></div>
        <div><dt>Conflicts</dt><dd>{a.conflicts}</dd></div>
      </dl>
      <p className="checkline" style={{ margin: '10px 0 0' }}>{summarise(a)}</p>
    </div>
  );
}
