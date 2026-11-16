# The Register

Company records, with the working shown. A Mote Studios concept prototype: a UK-first company
intelligence workspace where every finding is a ledger entry with a source, three dates and a
provenance mark.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

No keys are needed for the demonstration case (the fictional Quarrow Velloch Group). Copy
`.env.example` to `.env.local` to switch on live Companies House search or free-form assistant questions.

## Deploy the public demo (static, no keys)

The public portfolio version is a static export of the demonstration case only (decision log, 16 Nov 2026).
It has no live Companies House search, no free-form assistant and no API routes, so it holds no
real personal data and no keys.

**Vercel:** import the repo as a new project. `vercel.json` already sets the build command
(`npm run build:preview`) and output folder (`out`). Add no environment variables.

**Cloudflare Pages or Netlify:** build command `npm run build:preview`, output directory `out`.

Locally: `npm run build:preview`, then serve `out/` with any static server.

The full server build (`npm run build` and `npm start`, with `.env.local`) is for running live mode on
your own machine.

## What is real and what is simulated

| Area | State |
| --- | --- |
| Quarrow Velloch Group (5 entities, 4 people, 55 evidence rows, 3 contra entries) | Simulated, marked S everywhere. All names, records and domains are fictional. |
| Live company search and profiles | Implemented in `src/lib/sources/companies-house.ts`. **Not yet run against the live API**: needs `COMPANIES_HOUSE_API_KEY`. |
| Assistant, scripted questions | Working, no model call. Answers pass through the same validator as model answers. |
| Citation validator | Checks grounding: cited ids exist, quoted values, dates and names appear in the cited rows, present-tense claims need a current row. It does **not** check meaning; a reversed relationship using genuine names and quotes can pass (documented in a test). |
| Assistant, free-form questions | Implemented in `src/app/api/ask/route.ts` (demo case only). **Not yet run against a live model**: needs `ANTHROPIC_API_KEY`. |
| Rate limits | Per IP (trusted-proxy aware), per session and global daily, checked in that order. Neon Postgres via Drizzle with `DATABASE_URL` (**not yet run against Neon**). In production without a database, free-form questions stay off. Session cookie is `Secure` in production. |
| Domain intelligence, sanctions screening | Scripted rows inside the demo case only. |
| Self-footprint, monitoring | Not built (deferred). |
| PDF export | Browser print with a print stylesheet. |

## Tests

```bash
npm test
```

51 regression tests on Node's built-in runner (no extra dependencies): the confidence rubric,
the citation validator (including genuine citations attached to false conclusions), Live versus
Cached provenance, bounded pagination and its disclosure, Companies House date semantics, and
client IP handling. `npm run build:preview` also runs a guard that fails the build if API routes,
key names or live endpoints appear in the static output.

## Data rules built into the code

- Officer and PSC data from Companies House is fetched with `no-store` and never written anywhere.
- Company-level data is cached for at most 60 minutes (`revalidate: 3600`). Results older than
  60 seconds are marked C with their age; a response with no Date header is marked C, never L.
- Officer and PSC lists are paged (up to 300 each) and filings show the latest 100. When a list
  is not complete, the profile, timeline and graph say so.
- PSC `notified_on` and `ceased_on` are the dates Companies House was notified, so live PSC rows
  carry them as recorded dates, never effective dates.
- API keys are read only in server code (`server-only` modules and route handlers).
- The assistant runs on the demonstration case only, so no officer data reaches a model provider.
- Differences between sources are never labelled as wrongdoing; the researcher sets the status.

## Structure

```
src/data/demo-case.ts            fictional case seed
src/lib/types.ts                 Entity, Evidence, Relationship, Contra, EntityBundle
src/lib/confidence.ts            deterministic five-factor rubric
src/lib/diff.ts                  word diff and value normalisation
src/lib/sources/                 demo and Companies House adapters behind getBundle()
src/lib/assistant/               scripted questions and the citation validator
src/lib/ratelimit.ts, db/schema  counters (memory or Neon)
src/components/                  Frame, EvidenceLedger, AsAt, ContraView, Graph, Assistant, Dossier
src/app/                         Day Book, search, /e/[id] and its lenses, API routes
scripts/build-preview.sh         static export of the demo case (no API routes)
```

## Tested (16 Nov 2026)

`next build` passes on Next.js 16.4.6. A Playwright run on the production build covered search,
direct number entry, ledger filters, contra status changing a confidence band, the as-at view and
compare mode, the assistant (refusal, removed sentence, no-key fallback), graph selection and list
view, dossier sections and freeze, density, and the 404 state. The static demo was served and
checked the same way. Over HTTP: fail-closed free-form questions, Secure cookie, per-IP limit across
fresh sessions, spoofed X-Forwarded-For. Not tested: live Companies House, live model answers,
Neon counters, screen readers, Safari and Firefox.
