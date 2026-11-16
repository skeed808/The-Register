#!/usr/bin/env bash
# Static export of the demonstration case for the public preview.
# API routes cannot be exported, so they are moved aside for this build only.
# After the build, a guard fails the build if anything live leaked into the output.
set -euo pipefail
cd "$(dirname "$0")/.."
mv src/app/api /tmp/register-api-$$
trap 'mv /tmp/register-api-$$ src/app/api' EXIT
PREVIEW_STATIC=1 npx next build

fail=0
if [ -e out/api ]; then echo "GUARD: out/api exists"; fail=1; fi
if grep -rqE "COMPANIES_HOUSE_API_KEY|ANTHROPIC_API_KEY|DATABASE_URL|api\.company-information\.service\.gov\.uk" out; then
  echo "GUARD: live configuration or endpoints found in the static output"; fail=1
fi
for v in COMPANIES_HOUSE_API_KEY ANTHROPIC_API_KEY DATABASE_URL; do
  val="${!v:-}"
  if [ -n "$val" ] && grep -rqF "$val" out; then echo "GUARD: value of $v found in output"; fail=1; fi
done
[ "$fail" = 0 ] && echo "GUARD: static output clean (no API routes, keys or live endpoints)"
exit $fail
