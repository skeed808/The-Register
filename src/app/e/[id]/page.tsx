import { notFound } from "next/navigation";
import { getBundle } from "@/lib/sources";
import { entityParams } from "@/lib/static-params";
import { EntityHead } from "@/components/EntityHead";
import { KeyFacts } from "@/components/EntityHead";
import { EvidenceLedger } from "@/components/EvidenceLedger";

export const generateStaticParams = entityParams;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const bundle = await getBundle((await params).id);
  if (!bundle) notFound();
  return (
    <>
      <EntityHead bundle={bundle} active="" />
      <KeyFacts bundle={bundle} />
      <h2 className="section">Evidence ledger</h2>
      <EvidenceLedger bundle={bundle} />
    </>
  );
}
