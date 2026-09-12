#!/usr/bin/env bash
# language: bash, file: .devcontainer/post-start.sh
# Runs on every container start. Brings up Xvfb if it isn't already running.
set -e

if ! pgrep -x Xvfb >/dev/null 2>&1; then
    echo "[devcontainer] starting Xvfb on :99..."
    Xvfb :99 -screen 0 1920x1080x24 -nolisten tcp >/tmp/xvfb.log 2>&1 &
    sleep 1
else
    echo "[devcontainer] Xvfb already running."
fi

export DISPLAY=:99
echo "[devcontainer] DISPLAY=$DISPLAY"

if [ -d "${PLAYWRIGHT_BROWSERS_PATH:-/home/node/.cache/ms-playwright}" ]; then
    echo "[devcontainer] playwright cache present."
else
    echo "[devcontainer] WARNING: playwright cache missing — run npx playwright install chromium"
fi
