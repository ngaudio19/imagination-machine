# Stream Deck bridge

The Stream Deck bridge is the hardware adapter for Imagination Machine.

## Design rule

Games do **not** know about Elgato APIs directly. Each game declares a controller layout/state. This plugin:

- receives key presses, dial presses/rotation, and touch-strip input
- identifies the physical device/player
- forwards input to the local game app
- renders per-player button images and touch-strip feedback from game state

That keeps every game module portable and makes private hands possible.

## Toolchain

Current Elgato SDK development requires Node.js 24+ and Stream Deck 7.1+.

From this folder, the intended setup is:

```bash
npm install -g @elgato/cli@latest
streamdeck create
```

We will use a reverse-DNS plugin UUID under `com.imaginationmachine`.

The first hardware milestone is intentionally tiny:

1. Two Stream Deck+ units appear as distinct devices.
2. Each deck can send a different key press.
3. The game app maps each device to a selected player.
4. Moon Munch renders six private snack cards to each deck.
5. Pressing a physical card instantly updates only that player's hidden choice.

The browser simulator remains available while the physical bridge is under construction.
