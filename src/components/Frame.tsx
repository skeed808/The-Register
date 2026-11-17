'use client';
// Shared frame: command bar, folio rail, demo banner, mark key and density switch.
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { companyIds, entities as demoEntities } from '@/data/demo-case';
import { Mark } from './Mark';

type Density = 'comfortable' | 'ledger' | 'terminal';
interface Folio { id: string; name: string }

const store = {
  get<T>(k: string, fallback: T): T {
    try { const v = sessionStorage.getItem(k); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
  },
  set(k: string, v: unknown) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

const NUMBER_SHAPE = /^([A-Za-z]{2}\d{6}|\d{8})$/;

export function Frame({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [density, setDensity] = useState<Density>('ledger');
  const [liveFolios, setLiveFolios] = useState<Folio[]>([]);
  // WCAG 2.1.4: single-character shortcuts must be switchable off.
  const [keysOn, setKeysOn] = useState(true);

  const currentId = path.match(/^\/e\/([^/]+)/)?.[1]?.toUpperCase();
  const inDemo = path === '/' || (currentId ? /^DM\d{6}$/.test(currentId) : false);

  useEffect(() => { setDensity(store.get<Density>('reg.density', 'ledger')); setLiveFolios(store.get<Folio[]>('reg.folios', [])); setKeysOn(store.get<boolean>('reg.keys', true)); }, []);
  useEffect(() => { store.set('reg.keys', keysOn); document.documentElement.dataset.keys = keysOn ? 'on' : 'off'; }, [keysOn]);
  useEffect(() => { document.documentElement.dataset.density = density; store.set('reg.density', density); }, [density]);

  // Remember live entities opened in this session as folios.
  useEffect(() => {
    if (!currentId || /^DM\d{6}$/.test(currentId)) return;
    const name = document.querySelector('.entity-name')?.textContent ?? currentId;
    setLiveFolios((prev) => {
      const next = [{ id: currentId, name }, ...prev.filter((f) => f.id !== currentId)].slice(0, 8);
      store.set('reg.folios', next);
      return next;
    });
  }, [currentId]);

  const folios: Folio[] = [...companyIds.map((id) => ({ id, name: demoEntities[id].name })), ...liveFolios];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName);
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); input.current?.focus(); return; }
      if (!keysOn) return;
      if (e.key === '/' && !typing) { e.preventDefault(); input.current?.focus(); return; }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (currentId) {
        const go: Record<string, string> = { t: 'as-at', g: 'graph', c: 'contra', a: 'ask', d: 'dossier', e: '' };
        if (e.key in go) { router.push(`/e/${currentId}/${go[e.key]}`.replace(/\/$/, '')); return; }
        if (e.key === '[' || e.key === ']') {
          const i = folios.findIndex((f) => f.id === currentId);
          const next = folios[(i + (e.key === ']' ? 1 : -1) + folios.length) % folios.length];
          if (next) router.push(`/e/${next.id}`);
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function submit(value: string) {
    const v = value.trim();
    if (!v) return;
    setOpen(false);
    const m = v.match(/^(co|case):\s*(.*)$/i);
    const term = m ? m[2] : v;
    if (m?.[1].toLowerCase() === 'case' && !term) { router.push('/e/DM000101'); return; }
    // The static preview only holds demo entities, so real company numbers go to search, which explains why.
    const isDemoNumber = /^DM\d{6}$/i.test(term);
    if (NUMBER_SHAPE.test(term) && (isDemoNumber || process.env.NEXT_PUBLIC_PREVIEW !== '1')) { router.push(`/e/${term.toUpperCase()}`); return; }
    router.push(`/search?q=${encodeURIComponent(term)}${m?.[1].toLowerCase() === 'case' ? '&scope=case' : ''}`);
  }

  return (
    <div className="frame">
      <header className="topbar">
        <Link href="/" className="wordmark">
          The Register<span>Mote Studios · prototype</span>
        </Link>
        <form className="commandbar" role="search" onSubmit={(e) => { e.preventDefault(); submit(q); }}>
          <label htmlFor="cmd" className="sr-only">Search a company name or number</label>
          <input
            id="cmd" ref={input} value={q} autoComplete="off"
            placeholder="Company name or number. Try “Velloch” or DM000102"
            onChange={(e) => setQ(e.target.value)} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
          <kbd aria-hidden="true">/</kbd>
          {open && !q ? (
            <div className="mode-list">
              <button type="button" onMouseDown={() => { setQ('co: '); input.current?.focus(); }}><span className="mono">co:</span> Search companies by name or number</button>
              <button type="button" onMouseDown={() => submit('case:')}><span className="mono">case:</span> Open the Quarrow Velloch demonstration case</button>
            </div>
          ) : null}
        </form>
      </header>

      {inDemo ? (
        <aside className="demo-banner" aria-label="Demonstration notice">
          <Mark mark="S" /> Fictional demonstration case. Every entry on this page is simulated; no real company or person is described.
        </aside>
      ) : null}

      <nav className="rail" aria-label="Open folios">
        <h2>Folios</h2>
        <ol>
          {folios.map((f) => (
            <li key={f.id}>
              <Link href={`/e/${f.id}`} aria-current={currentId === f.id ? 'page' : undefined}>
                {f.name}
                <span className="mono">{f.id}</span>
              </Link>
            </li>
          ))}
        </ol>
        <p className="rail-note">
          {keysOn ? 'Keys: / search · j k rows · t as-at · c contra · g graph · a ask · d dossier · [ ] folios. ' : 'Single-key shortcuts are off. Ctrl K still opens search. '}
          <button type="button" className="textlink" onClick={() => setKeysOn(!keysOn)}>{keysOn ? 'Turn off single-key shortcuts' : 'Turn shortcuts on'}</button>
        </p>
      </nav>

      <main>{children}</main>

      <footer className="markkey">
        <span className="keyitem"><Mark mark="L" /> Live, fetched this session</span>
        <span className="keyitem"><Mark mark="C" /> Cached, age shown</span>
        <span className="keyitem"><Mark mark="I" /> Imported dataset</span>
        <span className="keyitem"><Mark mark="S" /> Simulated demo data</span>
        <span className="density" role="group" aria-label="Density">
          {(['comfortable', 'ledger', 'terminal'] as Density[]).map((d) => (
            <button key={d} type="button" aria-pressed={density === d} onClick={() => setDensity(d)}>
              {d[0].toUpperCase() + d.slice(1)}
            </button>
          ))}
        </span>
      </footer>
    </div>
  );
}
