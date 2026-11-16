import { notFound } from "next/navigation";
import { getBundle } from "@/lib/sources";
import { entityParams } from "@/lib/static-params";
import { EntityHead } from "@/components/EntityHead";
import { Assistant } from "@/components/Assistant";

export const generateStaticParams = entityParams;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const bundle = await getBundle((await params).id);
  if (!bundle) notFound();
  return (
    <>
      <EntityHead bundle={bundle} active="ask" />
      {bundle.isDemo ? <Assistant bundle={bundle} /> : <p className="empty">The assistant is available on the demonstration case. On live companies it stays off, so no officer data is sent to a model provider.</p>}
    </>
  );
}
