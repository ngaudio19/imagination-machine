# Imagination Machine

A local-first family game console built around a Mac and multiple Elgato Stream Deck+ controllers.

## Current build

- Pixel-art player lobby with persistent profiles
- Two physical Stream Deck+ units addressed independently over USB
- Private per-player buttons and touch-strip feedback
- Modular deterministic games
- Shared Mac game board
- No per-game Stream Deck profile programming

### Moon Munch

A 10-round automatic game. A hungry moon monster gives a craving hint, players secretly pick snacks on their Decks, matching the craving earns 3 points, any other snack earns 1, and timeouts earn 0. Reveal and round progression are automatic.

### Planet Trivia

A 10-question rocket race. Each Deck shows all eight planets as pixel-art answer buttons. Correct answers earn 1–3 fuel depending on response speed; wrong answers never move the rocket backward. Each player's touch strip shows fuel progress.

## Run

Quit the Elgato Stream Deck desktop app, then:

```bash
git pull
npm install
npm run dev
```

Open the local Vite URL shown in Terminal.

The browser is the shared game board. The two Stream Deck+ units are private controllers.

See `docs/HARDWARE.md` for architecture and hardware notes.
