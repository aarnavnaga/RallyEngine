#!/bin/bash
# Auto-hotfix loop for the Mercor demo dev server.
# Polls http://localhost:3000/ every 60s. If down or returning 404,
# kills the dev server it spawned, removes .next, and restarts.
#
# Paths derive from the script location so the script is portable.
# Override with env vars if running outside the repo:
#   FRONTEND=/path/to/frontend bash auto-hotfix.sh
#
# Run: bash auto-hotfix.sh           # loop mode (blocks)
#      bash auto-hotfix.sh once      # one-shot (cron-friendly)

set -euo pipefail
PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${REPO_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"
FRONTEND="${FRONTEND:-$REPO_ROOT/frontend}"

if [ ! -d "$FRONTEND" ]; then
  echo "auto-hotfix: FRONTEND directory not found at $FRONTEND" >&2
  echo "auto-hotfix: set FRONTEND=/abs/path/to/frontend and re-run" >&2
  exit 1
fi

LOG="${HOTFIX_LOG:-/tmp/rally-hotfix.log}"
DEV_LOG="${HOTFIX_DEV_LOG:-/tmp/rally-dev.log}"
PID_FILE="${HOTFIX_PID_FILE:-/tmp/rally-dev.pid}"
PORTS=(3000 3001)

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"; }

is_healthy() {
  local code
  code=$(/usr/bin/curl -s -o /dev/null -w "%{http_code}" --max-time 6 http://localhost:3000/ 2>/dev/null || echo "000")
  if [ "$code" != "200" ]; then
    log "GET / -> $code"
    return 1
  fi
  # /admin must NOT be a 404 if AppShell is correct
  local admin_code
  admin_code=$(/usr/bin/curl -s -o /dev/null -w "%{http_code}" --max-time 6 http://localhost:3000/admin 2>/dev/null || echo "000")
  if [ "$admin_code" != "200" ]; then
    log "GET /admin -> $admin_code"
    return 1
  fi
  return 0
}

graceful_kill() {
  local pid="$1"
  [ -z "$pid" ] && return 0
  /bin/kill -TERM "$pid" 2>/dev/null || return 0
  for _ in 1 2 3 4 5; do
    if ! /bin/kill -0 "$pid" 2>/dev/null; then return 0; fi
    sleep 1
  done
  /bin/kill -KILL "$pid" 2>/dev/null || true
}

restart_dev() {
  log "RESTART begin"
  # Prefer the PID we recorded last time we spawned the dev server. Only
  # SIGKILL after a 5s SIGTERM grace period, and only narrow port-based
  # cleanup of anything actually bound to our dev ports.
  if [ -f "$PID_FILE" ]; then
    graceful_kill "$(cat "$PID_FILE" 2>/dev/null)"
    /bin/rm -f "$PID_FILE"
  fi
  for p in "${PORTS[@]}"; do
    while read -r pid; do
      graceful_kill "$pid"
    done < <(/usr/bin/lsof -ti ":$p" -sTCP:LISTEN 2>/dev/null || true)
  done
  sleep 1
  /bin/rm -rf "$FRONTEND/.next"
  cd "$FRONTEND"
  /usr/bin/nohup pnpm dev > "$DEV_LOG" 2>&1 < /dev/null &
  echo $! > "$PID_FILE"
  disown || true
  sleep 7
  log "RESTART done (pid=$(cat "$PID_FILE" 2>/dev/null || echo unknown)); tail of dev log:"
  /usr/bin/tail -5 "$DEV_LOG" >> "$LOG"
}

# One-shot mode (used by a cron each minute) OR loop mode (the script blocks).
MODE="${1:-loop}"

if [ "$MODE" = "once" ]; then
  if ! is_healthy; then
    log "UNHEALTHY -- restarting"
    restart_dev
    if is_healthy; then
      log "RESTORED"
    else
      log "STILL UNHEALTHY after restart"
    fi
  fi
  exit 0
fi

# Loop mode (runs forever, prints to log)
log "auto-hotfix loop starting"
while true; do
  if ! is_healthy; then
    log "UNHEALTHY detected -- restarting"
    restart_dev
    if is_healthy; then
      log "RESTORED"
    else
      log "STILL UNHEALTHY after restart"
    fi
  fi
  sleep 60
done
