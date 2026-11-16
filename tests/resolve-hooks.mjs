// Test-only module resolution: lets Node's built-in TypeScript type stripping run the
// app's modules unchanged. Maps "@/x" to src/x and resolves extensionless relative
// imports to .ts files. No dependencies.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SRC = new URL('../src/', import.meta.url);

export async function resolve(specifier, context, next) {
  let spec = specifier;
  if (spec.startsWith('@/')) spec = new URL(spec.slice(2), SRC).href;
  const relative = spec.startsWith('.') || spec.startsWith('file:');
  if (relative && !path.extname(spec)) {
    const base = spec.startsWith('file:') ? spec : new URL(spec, context.parentURL).href;
    for (const ext of ['.ts', '/index.ts']) {
      const candidate = base + ext;
      if (existsSync(fileURLToPath(candidate))) return next(candidate, context);
    }
  }
  return next(spec, context);
}
