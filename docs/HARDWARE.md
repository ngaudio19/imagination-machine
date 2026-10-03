# Stream Deck+ hardware mode

Imagination Machine talks directly to multiple Stream Deck+ units over USB.

This deliberately avoids per-game Stream Deck profiles. The game engine owns the hardware while it is running and can redraw every key, read key presses and dials, and draw custom status/progress UI on the LCD touch strip.

## Important

Quit the Elgato Stream Deck desktop app before starting Imagination Machine. Both programs want exclusive access to the same USB devices.

## Run

From the repo root:

```bash
git pull
npm install
npm run dev
```

`npm run dev` starts:

- the Vite shared-screen app
- the direct Stream Deck hardware bridge on `ws://127.0.0.1:3210`

Open the Vite local URL in the browser.

## Current controller behavior

### Game menu
- Key 1 launches Moon Munch.
- Key 2 launches Planet Trivia.

### Moon Munch
- First six keys are illustrated private snack cards.
- Selected card stays highlighted; the others dim.
- Touch strip shows player score, timer/status, and lock-in state.
- On the final screen: key 7 replays; key 8 returns to games.

### Planet Trivia
- All eight keys are illustrated planet answers.
- Correct planet lights up during reveal.
- Touch strip displays the player's fuel total and progress bar.
- Wrong answers do not reduce fuel.
- On the final screen: key 7 replays; key 8 returns to games.

## Architecture

```
Stream Deck+ A ─┐
                ├─ USB HID bridge ─ local WebSocket ─ React game engine
Stream Deck+ B ─┘
```

The hardware library is `@elgato-stream-deck/node`. Game modules remain hardware-agnostic: the browser sends controller render state and receives generic key/dial/touch events.
