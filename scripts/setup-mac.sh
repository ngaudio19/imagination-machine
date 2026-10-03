#!/usr/bin/env bash
set -euo pipefail

echo "== Imagination Machine setup =="

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

# Load an existing nvm install if the shell has not loaded it yet.
if ! command -v nvm >/dev/null 2>&1 && [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
fi

# Install nvm automatically on a fresh Mac.
if ! command -v nvm >/dev/null 2>&1; then
  echo
  echo "Installing nvm v0.40.8..."
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.8/install.sh | bash

  export NVM_DIR="$HOME/.nvm"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck disable=SC1090
    . "$NVM_DIR/nvm.sh"
  fi
fi

if ! command -v nvm >/dev/null 2>&1; then
  echo
  echo "nvm was installed but could not be loaded automatically."
  echo "Close and reopen Terminal, then rerun: bash scripts/setup-mac.sh"
  exit 1
fi

echo
echo "Installing/using Node.js 24..."
nvm install 24
nvm use 24
nvm alias default 24 >/dev/null

echo
echo "Installing app dependencies..."
npm install

echo
echo "Checking Stream Deck CLI..."
if ! command -v streamdeck >/dev/null 2>&1; then
  npm install -g @elgato/cli@latest
fi

echo
echo "== Setup complete =="
echo "Node: $(node -v)"
echo "npm:  $(npm -v)"
echo "Stream Deck CLI: $(streamdeck -v 2>/dev/null || echo installed)"
echo
echo "Start the app with:"
echo "  npm run dev"
