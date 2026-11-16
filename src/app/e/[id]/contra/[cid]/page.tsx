import { notFound } from 'next/navigation';
import { getBundle } from '@/lib/sources';
import { contraParams } from '@/lib/static-params';
import { EntityHead } from '@/components/EntityHead';
import { ContraView } from '@/components/ContraView';

export const generateStaticParams = contraParams;

export default async function Page({ params }: { params: Promise<{ id: string; cid: string }> }) {
  const { id, cid } = await params;
  const bundle = await getBundle(id);
  const contra = bundle?.contras.find((c) => c.id === cid);
  if (!bundle || !contra) notFound();
  return (
    <>
      <EntityHead bundle={bundle} active="contra" />
      <ContraView bundle={bundle} contra={contra} />
    </>
  );
}
