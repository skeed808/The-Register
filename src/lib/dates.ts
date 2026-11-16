const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-06-03" -> "3 Jun 2026". Parsed from the string, never local time. */
export function fmtDate(iso?: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m) return iso;
  return `${d ? d + ' ' : ''}${MONTHS[m - 1]} ${y}`;
}

/** "2026-11-14T09:12:00Z" -> "14 Nov 2026 09:12" (UTC). */
export function fmtStamp(iso?: string): string {
  if (!iso) return '—';
  const t = iso.slice(11, 16);
  return `${fmtDate(iso)}${t ? ' ' + t : ''}`;
}

export function ageLabel(fromIso: string, clockIso: string): string {
  const mins = Math.max(0, Math.round((Date.parse(clockIso) - Date.parse(fromIso)) / 60000));
  if (mins < 60) return `${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 48) return `${h} h`;
  return `${Math.round(h / 24)} d`;
}

/** True if an interval [start, end) is in force on date d. */
export function inForce(d: string, start?: string, end?: string): boolean {
  if (start && start > d) return false;
  if (end && end <= d) return false;
  return true;
}
