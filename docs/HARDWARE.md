# Stream Deck+ hardware mode

Imagination Machine talks directly to the two Stream Deck+ units over USB.

This deliberately avoids per-game Stream Deck profiles. The game engine owns the hardware while it is running and can redraw every key, read each key press, read dial events, and use the LCD touch strip.

## Important

Quit the Elgato Stream Deck desktop app before starting Imagination Machine. Both programs want to control the same USB devices.

## Run

From the repo root:

```bash
git pull
npm install
npm run dev
```

`npm run dev` starts two local processes:

- Vite shared-screen app
- direct Stream Deck hardware bridge on `ws://127.0.0.1:3210`

Open the Vite local URL in the browser.

## First hardware test

1. Connect both Stream Deck+ units over USB.
2. Quit the Elgato Stream Deck app.
3. Run `npm run dev`.
4. In the browser lobby, both controller indicators should switch from OFFLINE to CONNECTED.
5. Select two players and open Moon Munch.
6. Each physical Deck should show six private snack cards.
7. Press a snack on Deck 1 and Deck 2.
8. The shared screen should register each player's hidden selection independently.

The final two keys are reserved for game-level utilities.

## Architecture

```
Stream Deck+ A ─┐
                ├─ USB HID bridge ─ local WebSocket ─ React game engine
Stream Deck+ B ─┘
```

The hardware library is `@elgato-stream-deck/node`. Game modules remain hardware-agnostic: the browser sends controller render state and receives generic key/dial/touch events.
