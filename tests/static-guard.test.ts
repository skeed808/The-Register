import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const GUARD = path.resolve('scripts/check-static.sh');
function fixture(files: Record<string, string>) {
  const dir = mkdtempSync(path.join(tmpdir(), 'guard-'));
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    writeFileSync(path.join(dir, rel), body);
  }
  return dir;
}
const run = (dir: string, env: Record<string, string> = {}) =>
  spawnSync('bash', [GUARD, dir], { encoding: 'utf8', env: { PATH: process.env.PATH ?? '', ...env } as unknown as NodeJS.ProcessEnv });

describe('static-build security guard', () => {
  test('passes clean output', () => {
    const r = run(fixture({ 'index.html': '<h1>The Register</h1>' }));
    assert.equal(r.status, 0, r.stdout);
  });
  test('fails when an API route is exported', () => {
    const r = run(fixture({ 'index.html': 'ok', 'api/ask/index.html': 'route' }));
    assert.equal(r.status, 1);
    assert.match(r.stdout, /api exists/);
  });
  test('fails when a key name appears in a bundle', () => {
    const r = run(fixture({ '_next/static/chunk.js': 'process.env.ANTHROPIC_API_KEY' }));
    assert.equal(r.status, 1);
  });
  test('fails when the Companies House API host appears', () => {
    const r = run(fixture({ '_next/static/chunk.js': 'fetch("https://api.company-information.service.gov.uk/x")' }));
    assert.equal(r.status, 1);
  });
  test('fails when a key VALUE leaked, even without its name', () => {
    const r = run(fixture({ '_next/static/chunk.js': 'const k="ch-live-secret-1234"' }), { COMPANIES_HOUSE_API_KEY: 'ch-live-secret-1234' });
    assert.equal(r.status, 1);
    assert.match(r.stdout, /value of COMPANIES_HOUSE_API_KEY/);
  });
  test('fails when the output folder is missing', () => {
    const r = run('/nonexistent-register-out');
    assert.equal(r.status, 1);
  });
});
