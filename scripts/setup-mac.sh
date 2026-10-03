#!/usr/bin/env bash
set -eo pipefail

echo "== Imagination Machine setup =="

echo
echo "Step 1/2: Installing web app dependencies with the Node/npm already on this Mac..."
npm install

echo
echo "Web app dependencies installed."

echo
echo "Step 2/2: Preparing Stream Deck SDK toolchain..."

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
touch "$HOME/.zshrc"

if ! grep -q 'NVM_DIR="$HOME/.nvm"' "$HOME/.zshrc" 2>/dev/null; then
  {
    echo ''
    echo 'export NVM_DIR="$HOME/.nvm"'
    echo '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"'
  } >> "$HOME/.zshrc"
fi

# Install nvm if it is not already present. Failure here should not break the web app.
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "Installing nvm for Stream Deck development..."
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.8/install.sh | bash || true
fi

if [ -s "$NVM_DIR/nvm.sh" ]; then
  # Avoid strict-unset issues inside nvm.
  set +u
  . "$NVM_DIR/nvm.sh"
  set -u

  echo "Installing/using Node.js 24 for Stream Deck development..."
  nvm install 24
  nvm use 24
  nvm alias default 24 >/dev/null

  echo "Installing Stream Deck CLI..."
  if ! command -v streamdeck >/dev/null 2>&1; then
    npm install -g @elgato/cli@latest
  fi

  echo "Stream Deck SDK toolchain ready."
else
  echo
  echo "NOTE: The web app is ready, but nvm could not be loaded yet."
  echo "You can still run the app now with: npm run dev"
  echo "We can finish Stream Deck SDK setup separately."
fi

echo
echo "== Setup complete =="
echo "Start the app with:"
echo "  npm run dev"
