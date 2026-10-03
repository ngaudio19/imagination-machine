#!/usr/bin/env bash
set -euo pipefail

echo "== Imagination Machine setup =="

if ! command -v nvm >/dev/null 2>&1; then
  echo
  echo "nvm is required for the Stream Deck SDK toolchain."
  echo "Install nvm from https://github.com/nvm-sh/nvm, then rerun this script."
  exit 1
fi

nvm install 24
nvm use 24

if ! command -v streamdeck >/dev/null 2>&1; then
  npm install -g @elgato/cli@latest
fi

npm install

echo
echo "Web app ready."
echo "Run: npm run dev"
echo
echo "Stream Deck SDK CLI ready."
echo "Next plugin step: cd streamdeck-plugin && follow README.md"
