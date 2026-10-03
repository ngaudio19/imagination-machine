# Stream Deck bridge

This folder will contain the Elgato Stream Deck+ plugin.

The browser app already treats controllers as separate player devices. The physical bridge will translate:

- keyDown / keyUp -> card or action selections
- dialRotate / dialDown -> game-specific analog controls
- touch strip events -> game-specific gestures
- game state -> per-player key images and touch-strip layouts

The plugin should remain generic. Individual games describe controller layouts; the bridge renders them.
