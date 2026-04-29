#!/usr/bin/env bash
# Vercel production deploy for the Mercor demo.
#
# The project is NOT connected to GitHub auto-deploy on `main` — pushes to
# main won't rebuild prod. Run this script after every push (or in lieu of
# pushing to anything) to ship the latest commit to:
#
#     https://musing-maxwell-84ed29.vercel.app
#
# Project linkage is baked in via env vars so you don't need a local
# .vercel/ directory and so the script works from any clone of the repo.
# Project root directory ("frontend") is configured server-side on Vercel,
# so we always invoke from the repo root.
set -euo pipefail

# Org + project IDs for loganmann-8814s-projects/musing-maxwell-84ed29.
# These are not secrets; they're public deployment identifiers.
export VERCEL_ORG_ID="team_r1KL5zVDdqltEXx6Umj5bRCN"
export VERCEL_PROJECT_ID="prj_ZK7YBGinukqZ3R1x3IoDTnZvdIVC"

# Resolve repo root from this script's path so the deploy works whether you
# `cd` into scripts/ or run from the repo root.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Sanity check — vercel CLI must be on PATH.
if ! command -v vercel >/dev/null 2>&1; then
    echo "error: vercel CLI not found on PATH" >&2
    echo "install: npm i -g vercel  (or: pnpm add -g vercel)" >&2
    exit 127
fi

echo "→ deploying $(git rev-parse --short HEAD) to musing-maxwell-84ed29.vercel.app"
exec vercel deploy --prod --yes "$@"
