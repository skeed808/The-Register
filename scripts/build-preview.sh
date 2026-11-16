#!/usr/bin/env bash
# Static export of the demonstration case for the public preview.
# API routes cannot be exported, so they are moved aside for this build only.
# After the build, a guard fails the build if anything live leaked into the output.
set -euo pipefail
cd "$(dirname "$0")/.."
mv src/app/api /tmp/register-api-$$
trap 'mv /tmp/register-api-$$ src/app/api' EXIT
PREVIEW_STATIC=1 npx next build

bash scripts/check-static.sh out
