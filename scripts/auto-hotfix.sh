#!/bin/bash
# Auto-hotfix loop for the Mercor demo dev server.
# Polls http://localhost:3000/ every 60s. If down or returning 404,
# kills the dev server, removes .next, and restarts. Logs to /tmp/rally-hotfix.log.
#
# Run: bash auto-hotfix.sh   (or via cron / pm2 / a CronCreate scheduled task)

set -euo pipefail
PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin
WORKTREE="/Users/logan/RallyEngine/.claude/worktrees/musing-maxwell-84ed29"
FRONTEND="$WORKTREE/frontend"
LOG="/tmp/rally-hotfix.log"
DEV_LOG="/tmp/rally-dev.log"
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

restart_dev() {
  log "RESTART begin"
  for p in "${PORTS[@]}"; do
    /usr/bin/lsof -ti ":$p" -sTCP:LISTEN 2>/dev/null | /usr/bin/xargs -r /bin/kill -9 2>/dev/null || true
  done
  /usr/bin/pkill -f "next dev" 2>/dev/null || true
  sleep 1
  /bin/rm -rf "$FRONTEND/.next"
  cd "$FRONTEND"
  /usr/bin/nohup pnpm dev > "$DEV_LOG" 2>&1 < /dev/null &
  disown || true
  sleep 7
  log "RESTART done; tail of dev log:"
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
