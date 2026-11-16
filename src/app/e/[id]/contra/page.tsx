import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBundle } from '@/lib/sources';
import { entityParams } from '@/lib/static-params';
import { EntityHead } from '@/components/EntityHead';
import { Mark } from '@/components/Mark';

export const generateStaticParams = entityParams;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const bundle = await getBundle((await params).id);
  if (!bundle) notFound();
  const mine = bundle.contras.filter((c) => c.entityId === bundle.entity.id);
  const others = bundle.contras.filter((c) => c.entityId !== bundle.entity.id);
  const row = (c: (typeof mine)[number]) => (
    <div className="ledger-row sim" key={c.id}>
      <Link className="ledger-line grid12" style={{ textDecoration: 'none' }} href={`/e/${c.entityId}/contra/${c.id}`}>
        <span className="ledger-margin"><span className="mono">{c.id}</span><span><Mark mark="S" /><span className="contra-mark"> contra</span></span></span>
        <span className="ledger-claim" style={{ gridColumn: '3 / 11' }}>{c.title}<span className="secondary-line">{c.difference}</span></span>
        <span className="ledger-band" style={{ gridColumn: '11 / 13' }}>{c.status[0].toUpperCase() + c.status.slice(1)}</span>
      </Link>
    </div>
  );
  return (
    <>
      <EntityHead bundle={bundle} active="contra" />
      <h2 className="section">Where sources differ on this entity</h2>
      {mine.length ? mine.map(row) : <p className="empty">{bundle.isDemo ? 'No sources differ on this entity.' : 'Live companies draw on one source in this version, so there is nothing to compare yet.'}</p>}
      {others.length ? <><h2 className="section">Elsewhere in the case</h2>{others.map(row)}</> : null}
    </>
  );
}
