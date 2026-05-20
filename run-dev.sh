#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"

(cd backend && python3 run.py) &
backend_pid=$!

cleanup() {
  kill "$backend_pid" 2>/dev/null || true
}

trap cleanup INT TERM EXIT

npm run dev
