// Client IP for rate limiting, with an explicit trust model.
// X-Forwarded-For is a list the client can prepend to. Each trusted proxy appends the
// address it received the request from, so the client's address is the entry
// TRUSTED_PROXY_HOPS places from the right. Anything further left is client-supplied
// and ignored. With no usable header, every such request shares one 'unknown' bucket,
// which fails safe: it is limited together rather than not at all.

export function clientIp(forwardedFor: string | null | undefined, trustedHops: number): string {
  const hops = Number.isInteger(trustedHops) && trustedHops > 0 ? trustedHops : 1;
  const parts = (forwardedFor ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return 'unknown';
  const idx = parts.length - hops;
  return idx >= 0 ? parts[idx] : 'unknown';
}

export function trustedHopsFromEnv(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 1;
}
