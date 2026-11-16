import Link from 'next/link';

export default function NotFound() {
  return (
    <>
      <h1 className="opening">No entry under that reference.</h1>
      <p className="state-line">Check the company number, or <Link href="/">return to the day book</Link>.</p>
    </>
  );
}
