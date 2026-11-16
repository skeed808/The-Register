import Link from 'next/link';
import type { EntityBundle } from '@/lib/types';
import { fmtDate } from '@/lib/dates';
import { Mark } from './Mark';

const SECTIONS = [
  { slug: '', label: 'Evidence' },
  { slug: 'as-at', label: 'Timeline' },
  { slug: 'contra', label: 'Contra' },
  { slug: 'graph', label: 'Graph' },
  { slug: 'ask', label: 'Ask' },
  { slug: 'dossier', label: 'Dossier' },
];

export function EntityHead({ bundle, active }: { bundle: EntityBundle; active: string }) {
  const e = bundle.entity;
  const openContras = bundle.contras.filter((c) => c.entityId === e.id).length;
  return (
    <header className="entryhead">
      <h1 className={`entity-name${e.status === 'dissolved' ? ' dissolved' : ''}`}>{e.name}</h1>
      <p className="ids">
        {e.number} · {e.status ?? 'status unknown'} · {e.companyType ?? ''} <Mark mark={e.mark} />
      </p>
      <nav className="sectionlinks" aria-label="Sections">
        {SECTIONS.map((s) => (
          <Link key={s.slug} href={`/e/${e.id}${s.slug ? '/' + s.slug : ''}`} aria-current={active === s.slug ? 'page' : undefined}>
            {s.label}
            {s.slug === 'contra' && openContras ? <span className="count">{openContras}</span> : null}
          </Link>
        ))}
      </nav>
      <label className="field mobile-only" style={{ marginTop: 16 }}>
        Section
        <SectionSelect id={e.id} active={active} />
      </label>
    </header>
  );
}

function SectionSelect({ id, active }: { id: string; active: string }) {
  // Plain links in a details element keep this server-rendered and script-free.
  return (
    <details>
      <summary>{SECTIONS.find((s) => s.slug === active)?.label}</summary>
      {SECTIONS.map((s) => (
        <div key={s.slug}><Link href={`/e/${id}${s.slug ? '/' + s.slug : ''}`}>{s.label}</Link></div>
      ))}
    </details>
  );
}

export function KeyFacts({ bundle }: { bundle: EntityBundle }) {
  const e = bundle.entity;
  const rows: [string, string | undefined][] = [
    ['Incorporated', fmtDate(e.incorporated)],
    ['Dissolved', e.dissolved ? fmtDate(e.dissolved) : undefined],
    ['Registered office', e.registeredOffice],
    ['Nature of business', e.sic?.join('; ') || undefined],
  ];
  return (
    <div className="facts">
      {rows.filter(([, v]) => v).map(([k, v]) => (
        <div className="fact grid12" key={k}>
          <span className="ledger-margin"><Mark mark={e.mark} /></span>
          <span className="label">{k}</span>
          <span className="val">{v}</span>
        </div>
      ))}
      {bundle.limits.map((l) => <p className="limit-note" key={l}>{l}</p>)}
    </div>
  );
}
