'use client';
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <>
      <h1 className="opening">The register could not be reached.</h1>
      <p className="state-line">It may be busy or rate-limited. Nothing has been lost.</p>
      <button type="button" className="btn" onClick={reset}>Try again</button>
    </>
  );
}
