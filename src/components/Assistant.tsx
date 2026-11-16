'use client';
import { useState } from 'react';
import type { EntityBundle } from '@/lib/types';
import { scripted } from '@/lib/assistant/scripted';
import { REFUSAL, validate, type ValidatedAnswer } from '@/lib/assistant/validate';
import { fmtDate } from '@/lib/dates';
import { Mark } from './Mark';

interface Turn { question: string; answer?: ValidatedAnswer; note?: string; limited?: string; scripted: boolean }

const PREVIEW = process.env.NEXT_PUBLIC_PREVIEW === '1';

export function Assistant({ bundle }: { bundle: EntityBundle }) {
  const names = Object.fromEntries(Object.values(bundle.entities).map((e) => [e.id, e.name]));
  const [turns, setTurns] = useState<Turn[]>([]);
  const [lit, setLit] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  function askScripted(id: string) {
    const s = scripted.find((x) => x.id === id)!;
    // Scripted answers take the same validation path as model answers.
    setTurns((t) => [{ question: s.question, answer: validate(s.draft, bundle.evidence, names), note: s.note, scripted: true }, ...t]);
  }

  async function askFree(question: string) {
    const match = scripted.find((s) => s.question.toLowerCase() === question.trim().toLowerCase());
    if (match) return askScripted(match.id);
    if (PREVIEW) {
      setTurns((t) => [{ question, limited: 'Free-form questions need the server build. This preview answers the scripted questions only.', scripted: false }, ...t]);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question }) });
      const data = (await res.json()) as { answer?: ValidatedAnswer; limited?: string; remaining?: number };
      if (typeof data.remaining === 'number') setRemaining(data.remaining);
      setTurns((t) => [{ question, answer: data.answer, limited: data.limited, scripted: false }, ...t]);
    } catch {
      setTurns((t) => [{ question, limited: 'The assistant could not be reached. The scripted questions still answer.', scripted: false }, ...t]);
    } finally {
      setBusy(false);
    }
  }

  function cite(id: string) {
    setLit(id);
    document.getElementById(`c-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  return (
    <div className="split">
      <div className="left" role="region" aria-label="Case evidence" tabIndex={0}>
        {bundle.evidence.map((e) => (
          <div key={e.id} id={`c-${e.id}`} className={`compact-row${lit === e.id ? ' lit' : ''}`}>
            <span className="mono">{e.id}<br /><Mark mark={e.mark} /></span>
            <span>
              {bundle.entities[e.entityId]?.name}: {e.claim}. <strong>{e.value}</strong>
              <span className="secondary-line">{bundle.sources[e.sourceId]?.name}{e.effective ? ` · effective ${fmtDate(e.effective)}` : ''}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="right">
        <form className="ask-form no-print" onSubmit={(e) => { e.preventDefault(); if (q.trim()) { void askFree(q); setQ(''); } }}>
          <label className="field" style={{ flex: 1 }}>Ask about this case
            <input className="baseline-input" value={q} maxLength={300} onChange={(e) => setQ(e.target.value)} placeholder="Answers come only from the evidence on the left" />
          </label>
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Checking citations' : 'Ask'}</button>
        </form>
        <p className="checkline" style={{ margin: 0 }}>
          {remaining !== null ? `${remaining} of 10 free-form questions left in this session. ` : ''}
          Each sentence must cite evidence in this case. Its quoted values, dates and names must appear in the rows it cites, or it is removed. The check does not judge meaning, so read the cited rows.
        </p>
        <div className="suggest">
          {scripted.map((s) => <button key={s.id} type="button" onClick={() => askScripted(s.id)}>{s.question}</button>)}
        </div>

        <div aria-live="polite">
          {turns.map((t, i) => (
            <article className="turn" key={turns.length - i}>
              <p className="q">{t.question}</p>
              {t.limited ? <p className="s">{t.limited}</p> : null}
              {t.answer?.sentences.map((s, j) => (
                <p className="s" key={j}>
                  {s.text}
                  {s.citations.map((c) => <button key={c} type="button" className="cite" onMouseEnter={() => setLit(c)} onFocus={() => setLit(c)} onClick={() => cite(c)}>{c}</button>)}
                </p>
              ))}
              {t.answer?.refusal ? <p className="s">{REFUSAL}</p> : null}
              {t.answer ? (
                <p className="checkline">
                  {t.scripted ? <><Mark mark="S" /> Scripted answer, no model call. </> : null}
                  {t.answer.checkedCitations} citation{t.answer.checkedCitations === 1 ? '' : 's'} checked, {t.answer.removed.length} sentence{t.answer.removed.length === 1 ? '' : 's'} removed.
                  {t.note ? ` ${t.note}` : ''}
                </p>
              ) : null}
              {t.answer?.removed.map((r, j) => (
                <p className="removed" key={j}>Removed: <s>{r.text}</s> Reason: {r.reason}.</p>
              ))}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
