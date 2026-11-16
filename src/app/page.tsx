import Link from 'next/link';
import { CASE_NAME, companyIds, dayBook, entities, contras } from '@/data/demo-case';
import { fmtDate } from '@/lib/dates';
import { Mark } from '@/components/Mark';

export default function DayBook() {
  return (
    <>
      <section className="daybook-intro grid12">
        <div className="lead">
          <h1 className="opening">Company records, with the working shown.</h1>
          <p>
            Every entry below names its source, its dates and how it was obtained. Where two sources disagree, both are shown side by side.
          </p>
        </div>
        <div className="actions">
          <Link className="btn" href="/e/DM000102">Open the {CASE_NAME} case</Link>
          {process.env.NEXT_PUBLIC_PREVIEW === '1' ? (
            <Link href="/search">Search the case</Link>
          ) : (
            <Link href="/search">Search a real company</Link>
          )}
        </div>
      </section>

      <h2 className="section" style={{ marginTop: 0 }}>Day book: {CASE_NAME}</h2>
      <div className="ledger">
        {dayBook.map((d, i) => (
          <div className="ledger-row sim" key={i}>
            <Link className="ledger-line grid12" style={{ textDecoration: 'none' }} href={d.contraId ? `/e/${d.entityId}/contra/${d.contraId}` : `/e/${d.entityId}`}>
              <span className="ledger-margin">
                <span className="mono">{fmtDate(d.date)}</span>
                <span><Mark mark={d.mark} />{d.contraId ? <span className="contra-mark"> contra</span> : null}</span>
              </span>
              <span className="ledger-claim" style={{ gridColumn: '3 / 10' }}>{d.text}</span>
              <span className="ledger-folio mono" style={{ gridColumn: '10 / 13' }}>{d.folio}</span>
            </Link>
          </div>
        ))}
      </div>

      <h2 className="section">Watched</h2>
      <div className="ledger">
        {companyIds.map((id) => {
          const e = entities[id];
          const last = dayBook.find((d) => d.entityId === id);
          const open = contras.filter((c) => c.entityId === id && c.status === 'open').length;
          return (
            <div className="ledger-row sim" key={id}>
              <Link className="ledger-line grid12" style={{ textDecoration: 'none' }} href={`/e/${id}`}>
                <span className="ledger-margin"><span className="mono">{e.number}</span><Mark mark={e.mark} /></span>
                <span className="ledger-claim">
                  {e.name}
                  <span className="secondary-line">{e.status}{open ? ` · ${open} open difference between sources` : ''}</span>
                </span>
                <span className="ledger-value" style={{ gridColumn: '8 / 13' }}>
                  <span className="quiet">Last change </span><span className="mono">{fmtDate(last?.date)}</span>
                </span>
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
}
