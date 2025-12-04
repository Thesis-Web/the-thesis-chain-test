#!/usr/bin/env bash
set -u
set -o pipefail

cd "$(dirname "$0")"

SIM_DIR="src/sims"
LOG_DIR="sim-logs"

mkdir -p "$LOG_DIR"

PASSED=()
FAILED=()

echo "=== THE THESIS CHAIN — FULL SIM GAUNTLET ==="
echo "Sim directory : $SIM_DIR"
echo "Log directory : $LOG_DIR"
echo

for sim in "$SIM_DIR"/*.ts; do
  base="$(basename "$sim")"
  log_path="$LOG_DIR/$base.log"

  echo
  echo "============================================================"
  echo ">>> RUNNING SIM: $base"
  echo "    Command: npx ts-node $sim"
  echo "    Log:     $log_path"
  echo "============================================================"
  echo

  # Run the sim, tee output to a log file
  # PIPESTATUS[0] is the exit code of npx ts-node
  npx ts-node "$sim" 2>&1 | tee "$log_path"
  status=${PIPESTATUS[0]}

  if [ "$status" -eq 0 ]; then
    echo
    echo "[OK]  $base (exit=$status)"
    PASSED+=("$base")
  else
    echo
    echo "[FAIL] $base (exit=$status)"
    FAILED+=("$base")
  fi
done

echo
echo "============================================================"
echo "=== SIM GAUNTLET SUMMARY ==================================="
echo "============================================================"
echo

echo "✅ PASSED:"
if [ "${#PASSED[@]}" -eq 0 ]; then
  echo "  (none)"
else
  for s in "${PASSED[@]}"; do
    echo "  - $s"
  done
fi

echo
echo "❌ FAILED:"
if [ "${#FAILED[@]}" -eq 0 ]; then
  echo "  (none)"
else
  for s in "${FAILED[@]}"; do
    echo "  - $s"
  done
fi

echo
if [ "${#FAILED[@]}" -eq 0 ]; then
  echo "All sims passed. 🎉"
  exit 0
else
  echo "Some sims failed. Check logs in: $LOG_DIR/"
  exit 1
fi
