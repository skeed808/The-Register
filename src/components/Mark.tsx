import type { Mark as MarkType } from '@/lib/types';

const WORD: Record<MarkType, string> = { L: 'Live', C: 'Cached', I: 'Imported', S: 'Simulated' };

/** Provenance mark: a letter first, colour (or hatch) second. Never hidden behind hover. */
export function Mark({ mark, extra }: { mark: MarkType; extra?: string }) {
  return (
    <span className={`mark mark-${mark}`} title={WORD[mark]}>
      <span className="glyph" aria-hidden="true">{mark}</span>
      <span className="sr-only">{WORD[mark]}</span>
      {extra ? <span className="mark-extra">· {extra}</span> : null}
    </span>
  );
}
