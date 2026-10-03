# Mac setup

## One-time clone

```bash
cd ~/Desktop
git clone https://github.com/ngaudio19/imagination-machine.git
cd imagination-machine
```

Node 24 is recommended for the controller stack.

## Start Imagination Machine

Quit the normal Elgato Stream Deck desktop app first, then:

```bash
cd ~/Desktop/imagination-machine
git pull
npm install
npm run dev
```

Vite prints the shared-screen URL. Open it in the Mac browser.

## Normal update routine

Future game/UI updates should normally be:

```bash
git pull
npm install
npm run dev
```

## Current games

- Moon Munch: 10 timed, automatic rounds with private snack choices and monster craving hints.
- Planet Trivia: 10 automatic questions with speed-based rocket fuel and no wrong-answer penalty.

The physical controllers are driven directly from `bridge/streamdeck.ts`; no manual Stream Deck profiles are needed.
