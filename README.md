# Imagination Machine

A local-first family game console built around a Mac and multiple Elgato Stream Deck+ controllers.

## V0 goals

- Pixel-art player lobby with persistent profiles
- Modular games
- Private per-player controller information
- Shared Mac game board
- Local-only deterministic gameplay
- Stream Deck+ support without per-game manual button programming

## First game: Moon Munch

Two players secretly choose snack cards for a hungry moon creature. The shared screen reveals both choices at once and resolves the round.

## Development

```bash
npm install
npm run dev
```

The first browser build includes simulated controllers so game logic and UI can be tested before the physical Stream Deck bridge is complete.
