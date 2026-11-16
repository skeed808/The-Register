'use client';
// Researcher state kept in the browser session only: contra statuses, notes, dossier picks.
// Nothing here is sent to a server. Storage can be unavailable, so every access is guarded.
import { useCallback, useEffect, useState } from 'react';
import type { Contra, ContraStatus } from '@/lib/types';

function read<T>(k: string, fallback: T): T {
  try { const v = sessionStorage.getItem(k); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function write(k: string, v: unknown) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } }

export function useSessionState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => { setValue(read(key, initial)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [key]);
  const set = useCallback((next: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      write(key, v);
      return v;
    });
  }, [key]);
  return [value, set] as const;
}

export function useContraStatuses(contras: Contra[]) {
  const [overrides, setOverrides] = useSessionState<Record<string, ContraStatus>>('reg.contra', {});
  const statusOf = (c: Contra): ContraStatus => overrides[c.id] ?? c.status;
  const explained = new Set(contras.filter((c) => statusOf(c) === 'explained').map((c) => c.factKey));
  return { statusOf, explained, setStatus: (id: string, s: ContraStatus) => setOverrides((p) => ({ ...p, [id]: s })) };
}
