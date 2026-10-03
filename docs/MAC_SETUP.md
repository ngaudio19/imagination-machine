# Mac development setup

## One-time setup

Clone the repository into the Desktop folder you want to use:

```bash
cd ~/Desktop
git clone https://github.com/ngaudio19/imagination-machine.git
cd imagination-machine
```

Then run:

```bash
bash scripts/setup-mac.sh
```

## Start the shared-screen app

```bash
npm run dev
```

Vite will print the local address. Open it on the MacBook.

## Pull future changes

When a new version is pushed here:

```bash
cd ~/Desktop/imagination-machine
git pull
npm install
npm run dev
```

Most ordinary UI/game changes should only require `git pull` and restarting the app.

## Current state

The app currently includes:

- persistent Cora / Mae / Cole profiles
- color + avatar customization
- two-player selection
- modular game registry
- Moon Munch
- simulated private Stream Deck+ displays
- dark, bright, pixel-forward visual system

The real Stream Deck bridge is the next implementation milestone.
