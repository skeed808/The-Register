#!/usr/bin/env bash
# Fails if a static export contains anything live: API routes, key names, key values,
# or the Companies House API host. Usage: scripts/check-static.sh [dir]  (default: out)
set -uo pipefail
dir="${1:-out}"
fail=0
if [ ! -d "$dir" ]; then echo "GUARD: $dir does not exist"; exit 1; fi
if [ -e "$dir/api" ]; then echo "GUARD: $dir/api exists"; fail=1; fi
if grep -rqE "COMPANIES_HOUSE_API_KEY|ANTHROPIC_API_KEY|DATABASE_URL|api\.company-information\.service\.gov\.uk" "$dir"; then
  echo "GUARD: live configuration or endpoints found in the static output"; fail=1
fi
for v in COMPANIES_HOUSE_API_KEY ANTHROPIC_API_KEY DATABASE_URL; do
  val="${!v:-}"
  if [ -n "$val" ] && grep -rqF -- "$val" "$dir"; then echo "GUARD: value of $v found in output"; fail=1; fi
done
[ "$fail" = 0 ] && echo "GUARD: static output clean (no API routes, keys or live endpoints)"
exit $fail
