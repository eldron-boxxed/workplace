#!/usr/bin/env bash
# language: bash, file: .devcontainer/post-create.sh
# Runs once when the container is first created.
# Repo root IS the arras-headless project, so no cd into a subfolder.
set -e

echo "[devcontainer] pwd=$(pwd)"

if [ ! -f package.json ]; then
    echo "[devcontainer] WARNING: package.json not found in $PWD"
    echo "  expected repo root to be the arras-headless project"
    exit 1
fi

echo "[devcontainer] installing npm deps..."
npm install

echo "[devcontainer] installing Playwright Chromium..."
npx playwright install chromium

echo "[devcontainer] done."
