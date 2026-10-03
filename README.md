# Imagination Machine

A local-first family game console built around a Mac and multiple Elgato Stream Deck+ controllers.

## Build 0.3

The experience is now designed to be controller-first. The Mac is the shared world; the Stream Decks are the personal controls.

### Player selection

Each Deck shows the saved player profiles as pixel characters.

- Press a player icon to select that profile.
- Key 7 opens the character builder.
- Key 8 submits READY.
- The app advances only after both Decks are READY.
- The same profile cannot be chosen by both Decks.

### Character builder

Each profile can choose:

- 12 creatures: cat, dog, fox, frog, bear, bunny, owl, shark, axolotl, raccoon, dinosaur, alien
- 6 colors
- 6 accessory choices

The character sprite persists and is reused across the app and Deck UI.

### Universal navigation

- Press the leftmost dial (D1) = Back
- Press the rightmost dial (D4) = Home

These controls are shown on the Deck+ touch strip.

### Moon Munch

A 10-round automatic game. A hungry moon monster gives a craving hint, players secretly pick snacks on their Decks, matching the craving earns 3 points, any other snack earns 1, and timeouts earn 0. Reveal and round progression are automatic.

### Planet Trivia

A 10-question rocket race. Each Deck shows all eight planets as pixel-art answer buttons. Correct answers earn 1–3 fuel depending on response speed; wrong answers never move the rocket backward. Each player's touch strip shows fuel progress.

## Run

Quit the normal Elgato Stream Deck desktop app, then:

```bash
git pull
npm install
npm run dev
```

Open the local Vite URL shown in Terminal.

See `docs/HARDWARE.md` for controller architecture.
