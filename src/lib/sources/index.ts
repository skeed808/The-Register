import 'server-only';
import { getDemoBundle, isDemoId } from './demo';
import { getLiveBundle } from './companies-house';
import type { EntityBundle } from '../types';

/** One entry point for every screen: demo ids resolve locally, company numbers go live. */
export async function getBundle(id: string): Promise<EntityBundle | null> {
  const clean = decodeURIComponent(id).toUpperCase();
  if (isDemoId(clean)) return getDemoBundle(clean);
  if (!/^[A-Z0-9]{8}$/.test(clean)) return null;
  return getLiveBundle(clean);
}
