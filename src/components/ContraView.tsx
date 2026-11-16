'use client';
import type { Contra, ContraStatus, EntityBundle, Evidence } from '@/lib/types';
import { wordDiff, type DiffToken } from '@/lib/diff';
import { fmtDate, fmtStamp } from '@/lib/dates';
import { Mark } from './Mark';
import { useContraStatuses, useSessionState } from './useCaseState';

function Tokens({ tokens }: { tokens: DiffToken[] }) {
  return <>{tokens.map((t, i) => (t.changed ? <span key={i} className="diff-changed">{t.text}</span> : <span key={i}>{t.text}</span>))}</>;
}

function Side({ bundle, e, tokens, side }: { bundle: EntityBundle; e: Evidence; tokens: DiffToken[]; side: string }) {
  return (
    <section aria-label={`Source ${side}`}>
      <h3>{bundle.sources[e.sourceId]?.name}</h3>
      <p className="mono quiet" style={{ margin: '0 0 14px' }}>{e.id} · {e.folio} <Mark mark={e.mark} /></p>
      <p style={{ fontSize: 22, fontWeight: 700, margin: '0 0 14px', lineHeight: 1.2 }}><Tokens tokens={tokens} /></p>
      {e.excerpt ? <blockquote className="excerpt" style={{ margin: '0 0 16px' }}>{e.excerpt}</blockquote> : null}
      <div className="dates">
        <span><span className="quiet">Effective</span><span className="mono">{fmtDate(e.effective)}</span></span>
        <span><span className="quiet">Recorded</span><span className="mono">{fmtDate(e.recorded)}</span></span>
        <span><span className="quiet">Retrieved</span><span className="mono">{fmtStamp(e.retrieved)}</span></span>
      </div>
    </section>
  );
}

export function ContraView({ bundle, contra }: { bundle: EntityBundle; contra: Contra }) {
  const a = bundle.evidence.find((e) => e.id === contra.evidenceA)!;
  const b = bundle.evidence.find((e) => e.id === contra.evidenceB)!;
  const d = wordDiff(a.value, b.value);
  const { statusOf, setStatus } = useContraStatuses(bundle.contras);
  const [notes, setNotes] = useSessionState<Record<string, string>>('reg.contra.notes', {});
  const [picked, setPicked] = useSessionState<string[]>('reg.dossier.contras', bundle.contras.map((c) => c.id));
  const status = statusOf(contra);
  const others = bundle.evidence.filter((e) => e.factKey === contra.factKey && e.id !== a.id && e.id !== b.id);

  return (
    <div>
      <h2 style={{ fontSize: 28, lineHeight: 1.15, margin: '40px 0 0', maxWidth: '30ch' }}>{contra.title}</h2>
      <div className="contra-cols">
        <Side bundle={bundle} e={a} tokens={d.a} side="A" />
        <Side bundle={bundle} e={b} tokens={d.b} side="B" />
      </div>
      <p className="contra-difference">{contra.difference}</p>
      {others.length ? (
        <p className="state-line">
          Also on this point: {others.map((o) => `${bundle.sources[o.sourceId]?.name} gives “${o.value}” (${o.id})`).join('; ')}.
        </p>
      ) : null}
      <div className="contra-actions no-print">
        <label className="field">Your assessment
          <select className="baseline-select" value={status} onChange={(e) => setStatus(contra.id, e.target.value as ContraStatus)}>
            <option value="open">Open</option>
            <option value="explained">Explained</option>
            <option value="unresolved">Unresolved</option>
          </select>
        </label>
        <label className="field">Note
          <textarea rows={1} value={notes[contra.id] ?? ''} placeholder="What explains the difference, or what to check next" onChange={(e) => setNotes((p) => ({ ...p, [contra.id]: e.target.value }))} />
        </label>
        <button type="button" className="textlink" onClick={() => setPicked((p) => (p.includes(contra.id) ? p.filter((x) => x !== contra.id) : [...p, contra.id]))}>
          {picked.includes(contra.id) ? 'Remove from dossier' : 'Add to dossier'}
        </button>
      </div>
      <p className="state-line">
        The assessment is yours. Marking this Explained changes the confidence band of both findings from Unresolved; the register never labels a difference as wrongdoing.
      </p>
    </div>
  );
}
