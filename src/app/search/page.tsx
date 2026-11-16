import { Suspense } from 'react';
import { SearchClient } from '@/components/SearchClient';

export default function Page() {
  return (
    <Suspense fallback={<p className="state-line">Loading search</p>}>
      <SearchClient />
    </Suspense>
  );
}
