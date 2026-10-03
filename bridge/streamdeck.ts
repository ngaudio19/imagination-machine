import { listStreamDecks, openStreamDeck, type StreamDeck } from "@elgato-stream-deck/node";
import sharp from "sharp";
import { WebSocket, WebSocketServer } from "ws";

const PORT = 3210;

type AvatarId =
  | "cat" | "dog" | "fox" | "frog" | "bear" | "bunny"
  | "owl" | "shark" | "axolotl" | "raccoon" | "dino" | "alien";
type AccessoryId = "none" | "crown" | "glasses" | "cape" | "cap" | "star";

type DeckProfile = {
  id: string;
  name: string;
  color: string;
  avatar: AvatarId;
  accessory: AccessoryId;
};

const AVATARS: Array<{ id: AvatarId; label: string }> = [
  { id: "cat", label: "CAT" },
  { id: "dog", label: "DOG" },
  { id: "fox", label: "FOX" },
  { id: "frog", label: "FROG" },
  { id: "bear", label: "BEAR" },
  { id: "bunny", label: "BUNNY" },
  { id: "owl", label: "OWL" },
  { id: "shark", label: "SHARK" },
  { id: "axolotl", label: "AXOLOTL" },
  { id: "raccoon", label: "RACCOON" },
  { id: "dino", label: "DINO" },
  { id: "alien", label: "ALIEN" }
];

const COLORS = [
  { name: "VIOLET", value: "#9b5cff" },
  { name: "CYAN", value: "#1ee8ff" },
  { name: "LIME", value: "#a8ff3e" },
  { name: "YELLOW", value: "#ffe44a" },
  { name: "PINK", value: "#ff5cb8" },
  { name: "BLUE", value: "#4b79ff" }
];

const ACCESSORIES: Array<{ id: AccessoryId; label: string }> = [
  { id: "none", label: "PLAIN" },
  { id: "crown", label: "CROWN" },
  { id: "glasses", label: "GLASSES" },
  { id: "cape", label: "CAPE" },
  { id: "cap", label: "CAP" },
  { id: "star", label: "STAR" }
];

const SNACKS = [
  { id: "pizza", label: "PIZZA", color: "#ff5c35" },
  { id: "pickle", label: "PICKLE", color: "#7dff4a" },
  { id: "donut", label: "DONUT", color: "#ff6cc7" },
  { id: "fish", label: "FISH", color: "#2ed7ff" },
  { id: "boot", label: "BOOT", color: "#d6a365" },
  { id: "star", label: "STAR", color: "#ffe34e" }
] as const;

const PLANETS = [
  { id: "mercury", label: "MERCURY", color: "#8f949b", accent: "#d8dde3" },
  { id: "venus", label: "VENUS", color: "#d88d39", accent: "#ffd179" },
  { id: "earth", label: "EARTH", color: "#2f8fff", accent: "#64d477" },
  { id: "mars", label: "MARS", color: "#c94731", accent: "#ff8c66" },
  { id: "jupiter", label: "JUPITER", color: "#d8ad82", accent: "#f0d2a8" },
  { id: "saturn", label: "SATURN", color: "#e7cf82", accent: "#fff0a9", ring: true },
  { id: "uranus", label: "URANUS", color: "#76dce5", accent: "#b8f7f7", ring: true },
  { id: "neptune", label: "NEPTUNE", color: "#365bd7", accent: "#7193ff" }
] as const;

type ClientMessage =
  | {
      type: "lobby";
      profiles: DeckProfile[];
      selections: Array<string | null>;
      ready: boolean[];
    }
  | {
      type: "builder";
      activeDeck: number;
      stage: "species" | "color" | "accessory";
      page: number;
      profile: DeckProfile;
    }
  | { type: "menu"; players: DeckProfile[] }
  | {
      type: "moon-munch";
      phase: "choose" | "reveal" | "finish";
      round: number;
      secondsLeft: number;
      hint: string;
      players: Array<{ name: string; color: string; choiceIndex: number | null; score: number }>;
    }
  | {
      type: "planet-trivia";
      phase: "question" | "reveal" | "finish";
      question: string;
      secondsLeft: number;
      correctIndex: number | null;
      players: Array<{
        name: string;
        color: string;
        answerIndex: number | null;
        fuel: number;
        maxFuel: number;
      }>;
    }
  | {
      type: "safecracker";
      phase: "cracking" | "open" | "failed" | "finish";
      round: number;
      secondsLeft: number;
      target: [number, number, number, number];
      digits: [number, number, number, number];
      locked: [boolean, boolean, boolean, boolean];
      safesCracked: number;
      players: DeckProfile[];
    }
  | {
      type: "hot-potato";
      phase: "play" | "boom" | "finish";
      round: number;
      holderDeck: number;
      hotButton: number;
      fuseRatio: number;
      scores: [number, number];
      players: DeckProfile[];
    };

type DeckEntry = {
  path: string;
  serial: string;
  deck: StreamDeck;
};

const clients = new Set<WebSocket>();
const decks: DeckEntry[] = [];
const disconnecting = new Set<string>();
let lastState: ClientMessage | null = null;
let connecting = false;

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (socket) => {
  clients.add(socket);
  sendStatus(socket);

  socket.on("message", async (data) => {
    try {
      lastState = JSON.parse(String(data)) as ClientMessage;
    } catch (error) {
      console.error("[bridge] bad message", error);
      return;
    }

    await renderAll();
  });

  socket.on("close", () => clients.delete(socket));
});

console.log(`[bridge] Imagination Machine v0.4 · listening at ws://127.0.0.1:${PORT}`);

function broadcast(message: unknown) {
  const payload = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  }
}

function sendStatus(socket?: WebSocket) {
  const payload = JSON.stringify({
    type: "status",
    decks: decks.map((entry, index) => ({
      index,
      serial: entry.serial,
      productName: entry.deck.PRODUCT_NAME
    }))
  });

  if (socket) {
    if (socket.readyState === WebSocket.OPEN) socket.send(payload);
    return;
  }

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  }
}

async function disconnectDeck(serial: string, reason?: unknown) {
  if (disconnecting.has(serial)) return;
  disconnecting.add(serial);

  try {
    const index = decks.findIndex((entry) => entry.serial === serial);
    if (index === -1) return;

    const [entry] = decks.splice(index, 1);
    console.warn(
      `[bridge] disconnected: ${serial}${reason instanceof Error ? ` · ${reason.message}` : ""}`
    );
    await entry.deck.close().catch(() => undefined);
    sendStatus();
  } finally {
    disconnecting.delete(serial);
  }
}

async function scanAndConnect() {
  if (connecting) return;
  connecting = true;

  try {
    const found = await listStreamDecks();
    const foundPaths = new Set(found.map((device) => device.path));

    for (const entry of [...decks]) {
      if (!foundPaths.has(entry.path)) {
        await disconnectDeck(entry.serial, new Error("USB device removed"));
      }
    }

    const knownPaths = new Set(decks.map((deck) => deck.path));

    for (const device of found) {
      if (knownPaths.has(device.path)) continue;

      let deck: StreamDeck | null = null;
      let serial = device.serialNumber ?? device.path;

      try {
        deck = await openStreamDeck(device.path, { resetToLogoOnClose: true });
        serial = (await deck.getSerialNumber().catch(() => serial)) || serial;

        await deck.setBrightness(75);
        await deck.clearPanel();

        const entry: DeckEntry = { path: device.path, serial, deck };
        decks.push(entry);
        decks.sort((a, b) => a.serial.localeCompare(b.serial));

        deck.on("error", (error) => {
          console.error(`[bridge] device ${serial} error`, error);
          void disconnectDeck(serial, error);
        });

        deck.on("down", (control) => {
          const deckIndex = decks.findIndex((item) => item.serial === serial);
          if (deckIndex < 0) return;

          if (control.type === "button") {
            broadcast({ type: "key", deckIndex, keyIndex: control.index });
          } else if (control.type === "encoder") {
            broadcast({ type: "dial-down", deckIndex, dialIndex: control.index });
          }
        });

        deck.on("rotate", (control, amount) => {
          const deckIndex = decks.findIndex((item) => item.serial === serial);
          if (deckIndex < 0) return;
          broadcast({ type: "dial", deckIndex, dialIndex: control.index, amount });
        });

        deck.on("lcdShortPress", (_control, position) => {
          const deckIndex = decks.findIndex((item) => item.serial === serial);
          if (deckIndex < 0) return;
          broadcast({ type: "touch", deckIndex, x: position.x, y: position.y });
        });

        console.log(`[bridge] connected: ${deck.PRODUCT_NAME} · ${serial}`);
        sendStatus();
        await renderAll();
      } catch (error) {
        if (deck) await deck.close().catch(() => undefined);
        console.error(
          "[bridge] found a Stream Deck but could not open it. If the Elgato Stream Deck app is running, quit it and retry.",
          error
        );
      }
    }
  } catch (error) {
    console.error("[bridge] scan failed", error);
  } finally {
    connecting = false;
  }
}

setInterval(scanAndConnect, 2500);
void scanAndConnect();

async function renderAll() {
  const active = [...decks];

  await Promise.all(
    active.map(async (entry) => {
      const deckIndex = decks.findIndex((item) => item.serial === entry.serial);
      if (deckIndex < 0) return;

      try {
        if (!lastState) {
          await renderWaiting(deckIndex);
        } else if (lastState.type === "lobby") {
          await renderLobby(deckIndex, lastState);
        } else if (lastState.type === "builder") {
          await renderBuilder(deckIndex, lastState);
        } else if (lastState.type === "menu") {
          await renderMenu(deckIndex, lastState);
        } else if (lastState.type === "moon-munch") {
          await renderMoonMunch(deckIndex, lastState);
        } else if (lastState.type === "planet-trivia") {
          await renderPlanetTrivia(deckIndex, lastState);
        } else if (lastState.type === "safecracker") {
          await renderSafecracker(deckIndex, lastState);
        } else {
          await renderHotPotato(deckIndex, lastState);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[bridge] render failed for ${entry.serial}:`, error);
        if (/disconnected|hid|device/i.test(message)) {
          await disconnectDeck(entry.serial, error);
        }
      }
    })
  );
}

async function renderWaiting(deckIndex: number) {
  const entry = decks[deckIndex];
  if (!entry) return;
  await renderAllTextKeys(entry.deck, "IMAGINATION", "WAITING", "#ffe44a");
  await safeRenderStrip(entry.deck, "IMAGINATION MACHINE", "WAITING FOR GAME", "#ffe44a");
}

async function renderLobby(deckIndex: number, state: Extract<ClientMessage, { type: "lobby" }>) {
  const entry = decks[deckIndex];
  if (!entry) return;

  const buttons = getButtonControls(entry.deck);
  const ownSelection = state.selections[deckIndex];
  const otherSelection = state.selections[deckIndex === 0 ? 1 : 0];
  const isReady = Boolean(state.ready[deckIndex]);
  const selectedProfile = state.profiles.find((profile) => profile.id === ownSelection);

  await Promise.all(
    buttons.map(async (button, index) => {
      let raw: Buffer;

      if (index < state.profiles.length) {
        const profile = state.profiles[index];
        const selected = ownSelection === profile.id;
        const taken = otherSelection === profile.id && !selected;

        raw = await makeAvatarTile(button.pixelSize.width, button.pixelSize.height, profile, {
          selected,
          dimmed: taken || (isReady && !selected),
          bottom: taken ? "TAKEN" : selected ? "YOU!" : profile.name.toUpperCase()
        });
      } else if (index === 6) {
        raw = await makeTextTile(button.pixelSize.width, button.pixelSize.height, {
          background: "#07070b",
          accent: selectedProfile && !isReady ? "#1ee8ff" : "#252530",
          top: "EDIT",
          bottom: selectedProfile && !isReady ? "CHARACTER" : "PICK FIRST"
        });
      } else if (index === 7) {
        raw = await makeTextTile(button.pixelSize.width, button.pixelSize.height, {
          background: isReady ? "#a8ff3e" : "#07070b",
          accent: isReady ? "#07070b" : selectedProfile ? "#a8ff3e" : "#252530",
          top: isReady ? "READY!" : "READY",
          bottom: selectedProfile ? (isReady ? "SUBMITTED" : "SUBMIT") : "PICK FIRST"
        });
      } else {
        raw = await makeTextTile(button.pixelSize.width, button.pixelSize.height, {
          background: "#07070b",
          accent: "#20202a",
          top: "",
          bottom: ""
        });
      }

      await entry.deck.fillKeyBuffer(button.index, raw, { format: "rgb" });
    })
  );

  const accent = selectedProfile?.color ?? "#ffe44a";
  const left = selectedProfile ? selectedProfile.name.toUpperCase() : `PLAYER ${deckIndex + 1}`;
  const right = isReady ? "READY · WAIT FOR FRIEND" : selectedProfile ? "EDIT OR READY" : "PICK YOUR ICON";
  await safeRenderStrip(entry.deck, left, right, accent);
}

async function renderBuilder(deckIndex: number, state: Extract<ClientMessage, { type: "builder" }>) {
  const entry = decks[deckIndex];
  if (!entry) return;

  if (deckIndex !== state.activeDeck) {
    await renderAllTextKeys(entry.deck, "FRIEND", "CUSTOMIZING", "#6f6f80");
    await safeRenderStrip(entry.deck, "PLEASE WAIT", "FRIEND IS BUILDING", "#6f6f80");
    return;
  }

  const buttons = getButtonControls(entry.deck);

  await Promise.all(
    buttons.map(async (button, index) => {
      let raw: Buffer;

      if (state.stage === "species") {
        if (index <= 5) {
          const avatar = AVATARS[state.page * 6 + index];
          if (avatar) {
            raw = await makeAvatarTile(
              button.pixelSize.width,
              button.pixelSize.height,
              { ...state.profile, avatar: avatar.id, accessory: "none" },
              {
                selected: state.profile.avatar === avatar.id,
                dimmed: false,
                bottom: avatar.label
              }
            );
          } else {
            raw = await blankTile(button.pixelSize.width, button.pixelSize.height);
          }
        } else {
          raw = await makeTextTile(button.pixelSize.width, button.pixelSize.height, {
            background: "#07070b",
            accent: "#ffe44a",
            top: index === 6 ? "PREV" : "NEXT",
            bottom: `PAGE ${state.page + 1}/2`
          });
        }
      } else if (state.stage === "color") {
        if (index < COLORS.length) {
          const color = COLORS[index];
          raw = await makeAvatarTile(
            button.pixelSize.width,
            button.pixelSize.height,
            { ...state.profile, color: color.value },
            {
              selected: state.profile.color === color.value,
              dimmed: false,
              bottom: color.name
            }
          );
        } else {
          raw = await blankTile(button.pixelSize.width, button.pixelSize.height);
        }
      } else {
        if (index < ACCESSORIES.length) {
          const accessory = ACCESSORIES[index];
          raw = await makeAvatarTile(
            button.pixelSize.width,
            button.pixelSize.height,
            { ...state.profile, accessory: accessory.id },
            {
              selected: state.profile.accessory === accessory.id,
              dimmed: false,
              bottom: accessory.label
            }
          );
        } else {
          raw = await blankTile(button.pixelSize.width, button.pixelSize.height);
        }
      }

      await entry.deck.fillKeyBuffer(button.index, raw, { format: "rgb" });
    })
  );

  const status =
    state.stage === "species"
      ? "PICK A CREATURE"
      : state.stage === "color"
        ? "PICK A COLOR"
        : "PICK ACCESSORY · SAVES";

  await safeRenderStrip(entry.deck, state.profile.name.toUpperCase(), status, state.profile.color);
}

async function renderMenu(deckIndex: number, state: Extract<ClientMessage, { type: "menu" }>) {
  const entry = decks[deckIndex];
  if (!entry) return;

  const player = state.players[deckIndex];
  const accent = player?.color ?? "#ffe44a";
  const buttons = getButtonControls(entry.deck);

  await Promise.all(
    buttons.map(async (button, index) => {
      let raw: Buffer;

      if (index === 0) {
        raw = await makeMoonMenuTile(button.pixelSize.width, button.pixelSize.height, accent);
      } else if (index === 1) {
        raw = await makePlanetTile(button.pixelSize.width, button.pixelSize.height, PLANETS[2], {
          label: "PLANETS",
          border: accent
        });
      } else if (index === 2) {
        raw = await makeSafeMenuTile(button.pixelSize.width, button.pixelSize.height, accent);
      } else if (index === 3) {
        raw = await makePotatoTile(button.pixelSize.width, button.pixelSize.height, {
          hot: true,
          label: "POTATO",
          accent
        });
      } else if (index === 7 && player) {
        raw = await makeAvatarTile(button.pixelSize.width, button.pixelSize.height, player, {
          selected: true,
          dimmed: false,
          bottom: "YOU"
        });
      } else {
        raw = await makeTextTile(button.pixelSize.width, button.pixelSize.height, {
          background: "#07070b",
          accent: "#252530",
          top: "???",
          bottom: "SOON"
        });
      }

      await entry.deck.fillKeyBuffer(button.index, raw, { format: "rgb" });
    })
  );

  await safeRenderStrip(
    entry.deck,
    player?.name?.toUpperCase() ?? `PLAYER ${deckIndex + 1}`,
    "PICK A GAME",
    accent
  );
}

async function renderMoonMunch(deckIndex: number, state: Extract<ClientMessage, { type: "moon-munch" }>) {
  const entry = decks[deckIndex];
  const player = state.players[deckIndex];
  if (!entry || !player) return;

  const buttons = getButtonControls(entry.deck);

  await Promise.all(
    buttons.map(async (button, index) => {
      if (state.phase === "finish") {
        const raw = await makeTextTile(button.pixelSize.width, button.pixelSize.height, {
          background: "#09090d",
          accent: index === 6 ? "#a8ff3e" : index === 7 ? "#ff5cb8" : "#252530",
          top: index === 6 ? "AGAIN" : index === 7 ? "GAMES" : "BURP!",
          bottom: index === 6 ? "PLAY" : index === 7 ? "EXIT" : ""
        });
        await entry.deck.fillKeyBuffer(button.index, raw, { format: "rgb" });
        return;
      }

      const snack = SNACKS[index];
      if (!snack) {
        const raw = await makeTextTile(button.pixelSize.width, button.pixelSize.height, {
          background: "#07070b",
          accent: "#22222c",
          top: state.phase === "reveal" ? "LOOK" : "MOON",
          bottom: state.phase === "reveal" ? "UP!" : ""
        });
        await entry.deck.fillKeyBuffer(button.index, raw, { format: "rgb" });
        return;
      }

      const selected = player.choiceIndex === index;
      const locked = player.choiceIndex !== null && !selected;
      const raw = await makeSnackTile(button.pixelSize.width, button.pixelSize.height, snack, {
        selected,
        locked,
        border: player.color
      });
      await entry.deck.fillKeyBuffer(button.index, raw, { format: "rgb" });
    })
  );

  const status =
    state.phase === "choose"
      ? player.choiceIndex === null
        ? `${state.secondsLeft}s · PICK A SNACK`
        : "LOCKED! WAIT FOR FRIEND"
      : state.phase === "reveal"
        ? "LOOK UP! MUNCH TIME"
        : `FINAL SCORE · ${player.score}`;

  await safeRenderStrip(entry.deck, `${player.name.toUpperCase()} · ${player.score} PTS`, status, player.color);
}

async function renderPlanetTrivia(deckIndex: number, state: Extract<ClientMessage, { type: "planet-trivia" }>) {
  const entry = decks[deckIndex];
  const player = state.players[deckIndex];
  if (!entry || !player) return;

  const buttons = getButtonControls(entry.deck);

  await Promise.all(
    buttons.map(async (button, index) => {
      if (state.phase === "finish") {
        const raw = await makeTextTile(button.pixelSize.width, button.pixelSize.height, {
          background: "#07070b",
          accent: index === 6 ? "#a8ff3e" : index === 7 ? "#ff5cb8" : "#252530",
          top: index === 6 ? "AGAIN" : index === 7 ? "GAMES" : "SPACE",
          bottom: index === 6 ? "RACE" : index === 7 ? "EXIT" : ""
        });
        await entry.deck.fillKeyBuffer(button.index, raw, { format: "rgb" });
        return;
      }

      const planet = PLANETS[index];
      const selected = player.answerIndex === index;
      const locked = player.answerIndex !== null && !selected;
      const correct = state.correctIndex === index;

      const raw = await makePlanetTile(button.pixelSize.width, button.pixelSize.height, planet, {
        label: planet.label,
        border: correct ? "#a8ff3e" : selected ? player.color : planet.accent,
        selected,
        locked: state.phase === "question" ? locked : !correct && !selected
      });
      await entry.deck.fillKeyBuffer(button.index, raw, { format: "rgb" });
    })
  );

  const status =
    state.phase === "question"
      ? player.answerIndex === null
        ? `${state.secondsLeft}s · CHOOSE PLANET`
        : "ANSWER LOCKED!"
      : state.phase === "reveal"
        ? "CHECK THE BIG SCREEN"
        : "MISSION COMPLETE";

  await safeRenderFuelStrip(entry.deck, player.name.toUpperCase(), status, player.color, player.fuel, player.maxFuel);
}


async function renderSafecracker(deckIndex: number, state: Extract<ClientMessage, { type: "safecracker" }>) {
  const entry = decks[deckIndex];
  const player = state.players[deckIndex];
  if (!entry || !player) return;

  const buttons = getButtonControls(entry.deck);

  await Promise.all(
    buttons.map(async (button, index) => {
      let raw: Buffer;

      if (state.phase === "finish") {
        raw = await makeTextTile(button.pixelSize.width, button.pixelSize.height, {
          background: "#16110b",
          accent: index === 6 ? "#b8db7c" : index === 7 ? "#d99162" : "#4a3a2b",
          top: index === 6 ? "AGAIN" : index === 7 ? "GAMES" : "LOOT",
          bottom: index === 6 ? "HEIST" : index === 7 ? "EXIT" : `${state.safesCracked}/5`
        });
      } else if (index < 2) {
        const globalIndex = deckIndex * 2 + index;
        raw = await makeSafeDialTile(button.pixelSize.width, button.pixelSize.height, {
          digit: state.digits[globalIndex],
          locked: state.locked[globalIndex],
          accent: player.color,
          label: `DIAL ${globalIndex + 1}`
        });
      } else {
        raw = await makeVaultDecorTile(button.pixelSize.width, button.pixelSize.height, index, player.color);
      }

      await entry.deck.fillKeyBuffer(button.index, raw, { format: "rgb" });
    })
  );

  await safeRenderSafecrackerStrip(entry.deck, deckIndex, state, player.color);
}

async function renderHotPotato(deckIndex: number, state: Extract<ClientMessage, { type: "hot-potato" }>) {
  const entry = decks[deckIndex];
  const player = state.players[deckIndex];
  if (!entry || !player) return;

  const buttons = getButtonControls(entry.deck);
  const holding = state.holderDeck === deckIndex && state.phase === "play";

  await Promise.all(
    buttons.map(async (button, index) => {
      let raw: Buffer;

      if (state.phase === "finish") {
        raw = await makeTextTile(button.pixelSize.width, button.pixelSize.height, {
          background: "#17100d",
          accent: index === 6 ? "#b8db7c" : index === 7 ? "#d99162" : "#4b342c",
          top: index === 6 ? "AGAIN" : index === 7 ? "GAMES" : "SPUD",
          bottom: index === 6 ? "PLAY" : index === 7 ? "EXIT" : "DONE"
        });
      } else if (state.phase === "boom") {
        raw = await makeExplosionTile(button.pixelSize.width, button.pixelSize.height, {
          loser: state.holderDeck === deckIndex,
          accent: player.color
        });
      } else {
        raw = await makePotatoTile(button.pixelSize.width, button.pixelSize.height, {
          hot: holding && index === state.hotButton,
          label: holding && index === state.hotButton ? "SMACK!" : holding ? "NOPE" : "WAIT",
          accent: player.color,
          dimmed: !holding
        });
      }

      await entry.deck.fillKeyBuffer(button.index, raw, { format: "rgb" });
    })
  );

  const status =
    state.phase === "play"
      ? holding
        ? "FIND IT! THE FUSE IS BURNING"
        : "GET READY · INCOMING!"
      : state.phase === "boom"
        ? state.holderDeck === deckIndex
          ? "BOOM! YOU HAD IT"
          : "SAFE! POINT TO YOU"
        : `FINAL · ${state.scores[deckIndex]} PTS`;

  await safeRenderHotPotatoStrip(entry.deck, status, player.color, state.fuseRatio, holding);
}

async function safeRenderSafecrackerStrip(
  deck: StreamDeck,
  deckIndex: number,
  state: Extract<ClientMessage, { type: "safecracker" }>,
  accent: string
) {
  try {
    const lcd = deck.CONTROLS.find((control) => control.type === "lcd-segment");
    if (!lcd) return;

    const a = deckIndex * 2;
    const b = a + 1;
    const cells = [a, b].map((globalIndex, localIndex) => {
      const value = state.digits[globalIndex];
      const prev = (value + 9) % 10;
      const next = (value + 1) % 10;
      const locked = state.locked[globalIndex];
      const x = localIndex === 0 ? 34 : Math.round(lcd.pixelSize.width / 2) + 18;
      const width = Math.round(lcd.pixelSize.width / 2) - 48;
      return `
        <g transform="translate(${x} 0)">
          <text x="${width / 2}" y="18" text-anchor="middle" fill="#9a8066" font-size="11" font-weight="800" font-family="monospace">DIAL ${globalIndex + 1}</text>
          <text x="${width / 2 - 50}" y="58" text-anchor="middle" fill="#71604f" font-size="22" font-family="monospace">${prev}</text>
          <rect x="${width / 2 - 27}" y="25" width="54" height="49" rx="5" fill="${locked ? "#365b38" : "#201811"}" stroke="${locked ? "#b8db7c" : accent}" stroke-width="3"/>
          <text x="${width / 2}" y="61" text-anchor="middle" fill="${locked ? "#e8f6bf" : "#f5e1bc"}" font-size="34" font-weight="900" font-family="monospace">${value}</text>
          <text x="${width / 2 + 50}" y="58" text-anchor="middle" fill="#71604f" font-size="22" font-family="monospace">${next}</text>
          <text x="${width / 2}" y="91" text-anchor="middle" fill="${locked ? "#b8db7c" : "#a48e75"}" font-size="11" font-weight="900" font-family="monospace">${locked ? "CLICK · LOCKED" : "TURN DIAL"}</text>
        </g>
      `;
    }).join("");

    const svg = `
      <svg width="${lcd.pixelSize.width}" height="${lcd.pixelSize.height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#0e0b08"/>
        <rect x="0" y="0" width="12" height="100%" fill="${accent}"/>
        <line x1="${lcd.pixelSize.width / 2}" y1="8" x2="${lcd.pixelSize.width / 2}" y2="${lcd.pixelSize.height - 8}" stroke="#3f3328" stroke-width="2"/>
        ${cells}
      </svg>
    `;

    const raw = await sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer();
    await deck.fillLcd(Number(lcd.id), raw, { format: "rgb" });
  } catch (error) {
    console.warn("[bridge] safe strip render skipped:", error instanceof Error ? error.message : error);
  }
}

async function safeRenderHotPotatoStrip(
  deck: StreamDeck,
  status: string,
  accent: string,
  fuseRatio: number,
  holding: boolean
) {
  try {
    const lcd = deck.CONTROLS.find((control) => control.type === "lcd-segment");
    if (!lcd) return;

    const ratio = Math.max(0, Math.min(1, fuseRatio));
    const trackWidth = lcd.pixelSize.width - 72;
    const remaining = Math.round(trackWidth * ratio);
    const emberX = 36 + remaining;

    const svg = `
      <svg width="${lcd.pixelSize.width}" height="${lcd.pixelSize.height}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
        <rect width="100%" height="100%" fill="#120b08"/>
        <text x="24" y="27" fill="${holding ? "#ffd66b" : accent}" font-size="17" font-weight="900" font-family="monospace">${escapeXml(status)}</text>
        <rect x="36" y="48" width="${trackWidth}" height="8" fill="#3b241a"/>
        <rect x="36" y="48" width="${remaining}" height="8" fill="#d55d36"/>
        <rect x="${emberX - 5}" y="43" width="10" height="18" fill="#ffe06d"/>
        <rect x="${emberX - 2}" y="40" width="4" height="6" fill="#fff1aa"/>
        <text x="24" y="88" fill="#8f7668" font-size="11" font-family="monospace">D1 BACK</text>
        <text x="${lcd.pixelSize.width - 24}" y="88" text-anchor="end" fill="#8f7668" font-size="11" font-family="monospace">D4 HOME</text>
      </svg>
    `;

    const raw = await sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer();
    await deck.fillLcd(Number(lcd.id), raw, { format: "rgb" });
  } catch (error) {
    console.warn("[bridge] potato strip render skipped:", error instanceof Error ? error.message : error);
  }
}

function getButtonControls(deck: StreamDeck) {
  return deck.CONTROLS.filter(
    (control): control is Extract<(typeof deck.CONTROLS)[number], { type: "button"; feedbackType: "lcd" }> =>
      control.type === "button" && control.feedbackType === "lcd"
  );
}

async function renderAllTextKeys(deck: StreamDeck, top: string, bottom: string, accent: string) {
  const buttons = getButtonControls(deck);
  await Promise.all(
    buttons.map(async (button, index) => {
      const raw = await makeTextTile(button.pixelSize.width, button.pixelSize.height, {
        background: "#09090d",
        accent,
        top: index === 0 ? top : bottom,
        bottom: index === 0 ? "PLAYER" : ""
      });
      await deck.fillKeyBuffer(button.index, raw, { format: "rgb" });
    })
  );
}

async function safeRenderStrip(deck: StreamDeck, left: string, right: string, accent: string) {
  try {
    await renderStrip(deck, left, right, accent);
  } catch (error) {
    console.warn("[bridge] touch strip render skipped:", error instanceof Error ? error.message : error);
  }
}

async function safeRenderFuelStrip(
  deck: StreamDeck,
  name: string,
  status: string,
  accent: string,
  fuel: number,
  maxFuel: number
) {
  try {
    await renderFuelStrip(deck, name, status, accent, fuel, maxFuel);
  } catch (error) {
    console.warn("[bridge] fuel strip render skipped:", error instanceof Error ? error.message : error);
  }
}

async function renderStrip(deck: StreamDeck, left: string, right: string, accent: string) {
  const lcd = deck.CONTROLS.find((control) => control.type === "lcd-segment");
  if (!lcd) return;

  const svg = `
    <svg width="${lcd.pixelSize.width}" height="${lcd.pixelSize.height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#07070b"/>
      <rect x="0" y="0" width="14" height="100%" fill="${escapeXml(accent)}"/>
      <text x="30" y="34" fill="${escapeXml(accent)}" font-size="21" font-weight="900" font-family="monospace">${escapeXml(left)}</text>
      <text x="30" y="64" fill="#f8f7ff" font-size="17" font-weight="800" font-family="monospace">${escapeXml(right)}</text>
      <text x="30" y="91" fill="#737386" font-size="12" font-weight="800" font-family="monospace">D1 BACK</text>
      <text x="${lcd.pixelSize.width - 30}" y="91" text-anchor="end" fill="#737386" font-size="12" font-weight="800" font-family="monospace">D4 HOME</text>
    </svg>
  `;

  const raw = await sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer();
  await deck.fillLcd(Number(lcd.id), raw, { format: "rgb" });
}

async function renderFuelStrip(
  deck: StreamDeck,
  name: string,
  status: string,
  accent: string,
  fuel: number,
  maxFuel: number
) {
  const lcd = deck.CONTROLS.find((control) => control.type === "lcd-segment");
  if (!lcd) return;

  const ratio = Math.max(0, Math.min(1, maxFuel > 0 ? fuel / maxFuel : 0));
  const barMax = lcd.pixelSize.width - 36;
  const barWidth = Math.round(barMax * ratio);

  const svg = `
    <svg width="${lcd.pixelSize.width}" height="${lcd.pixelSize.height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#05050a"/>
      <text x="18" y="28" fill="${escapeXml(accent)}" font-size="19" font-weight="900" font-family="monospace">${escapeXml(name)} · ${fuel} FUEL</text>
      <text x="18" y="51" fill="#f8f7ff" font-size="14" font-weight="800" font-family="monospace">${escapeXml(status)}</text>
      <rect x="18" y="61" width="${barMax}" height="9" fill="#20202b"/>
      <rect x="18" y="61" width="${barWidth}" height="9" fill="${escapeXml(accent)}"/>
      <text x="18" y="91" fill="#737386" font-size="12" font-weight="800" font-family="monospace">D1 BACK</text>
      <text x="${lcd.pixelSize.width - 18}" y="91" text-anchor="end" fill="#737386" font-size="12" font-weight="800" font-family="monospace">D4 HOME</text>
    </svg>
  `;

  const raw = await sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer();
  await deck.fillLcd(Number(lcd.id), raw, { format: "rgb" });
}

async function makeAvatarTile(
  width: number,
  height: number,
  profile: DeckProfile,
  options: { selected: boolean; dimmed: boolean; bottom: string }
) {
  const background = options.selected ? mixColor(profile.color, "#07070b", 0.22) : "#07070b";
  const border = options.selected ? "#f8f7ff" : profile.color;
  const opacity = options.dimmed ? 0.18 : 1;

  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
      <rect width="100" height="100" fill="${background}"/>
      <g opacity="${opacity}">
        <rect x="4" y="4" width="92" height="92" fill="none" stroke="${border}" stroke-width="${options.selected ? 7 : 4}"/>
        <g transform="translate(18 7) scale(2)">
          ${avatarPixelSvg(profile.avatar, profile.color, profile.accessory)}
        </g>
        <rect x="5" y="80" width="90" height="15" fill="#07070b"/>
        <text x="50" y="90" text-anchor="middle" fill="${options.selected ? "#a8ff3e" : "#f8f7ff"}" font-size="8" font-weight="900" font-family="monospace">${escapeXml(options.bottom)}</text>
      </g>
    </svg>
  `;

  return sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer();
}

async function makeTextTile(
  width: number,
  height: number,
  options: { background: string; accent: string; top: string; bottom: string }
) {
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
      <rect width="100" height="100" fill="${escapeXml(options.background)}"/>
      <rect x="4" y="4" width="92" height="92" fill="none" stroke="${escapeXml(options.accent)}" stroke-width="5"/>
      <text x="50" y="47" text-anchor="middle" fill="#f8f7ff" font-size="11" font-weight="900" font-family="monospace">${escapeXml(options.top)}</text>
      <text x="50" y="67" text-anchor="middle" fill="${escapeXml(options.accent)}" font-size="8" font-weight="900" font-family="monospace">${escapeXml(options.bottom)}</text>
    </svg>
  `;
  return sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer();
}

async function blankTile(width: number, height: number) {
  return makeTextTile(width, height, { background: "#07070b", accent: "#15151d", top: "", bottom: "" });
}

async function makeSnackTile(
  width: number,
  height: number,
  snack: (typeof SNACKS)[number],
  options: { selected: boolean; locked: boolean; border: string }
) {
  const background = options.selected ? snack.color : "#09090d";
  const foreground = options.selected ? "#07070b" : snack.color;
  const opacity = options.locked ? 0.18 : 1;

  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
      <rect width="100" height="100" fill="${background}"/>
      <g opacity="${opacity}">
        <rect x="4" y="4" width="92" height="92" fill="none" stroke="${escapeXml(options.border)}" stroke-width="5"/>
        ${snackPixelSvg(snack.id, foreground)}
        <rect x="7" y="78" width="86" height="16" fill="#07070b"/>
        <text x="50" y="89" text-anchor="middle" fill="${options.selected ? snack.color : "#f8f7ff"}" font-size="9" font-weight="900" font-family="monospace">${snack.label}</text>
      </g>
    </svg>
  `;

  return sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer();
}


async function makeSafeMenuTile(width: number, height: number, accent: string) {
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
      <rect width="100" height="100" fill="#100c09"/>
      <rect x="4" y="4" width="92" height="92" fill="none" stroke="${accent}" stroke-width="4"/>
      <rect x="20" y="17" width="60" height="58" fill="#665341"/>
      <rect x="25" y="22" width="50" height="48" fill="#2c251e"/>
      <rect x="34" y="30" width="32" height="32" fill="#17120f" stroke="#b79a73" stroke-width="3"/>
      <circle cx="50" cy="46" r="11" fill="none" stroke="#d2b98f" stroke-width="4"/>
      <rect x="48" y="34" width="4" height="24" fill="#d2b98f"/>
      <rect x="38" y="44" width="24" height="4" fill="#d2b98f"/>
      <rect x="8" y="79" width="84" height="14" fill="#090706"/>
      <text x="50" y="89" text-anchor="middle" fill="#f5e1bc" font-size="8" font-weight="900" font-family="monospace">SAFE</text>
    </svg>
  `;
  return sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer();
}

async function makeSafeDialTile(
  width: number,
  height: number,
  options: { digit: number; locked: boolean; accent: string; label: string }
) {
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
      <rect width="100" height="100" fill="#100c09"/>
      <rect x="5" y="5" width="90" height="90" fill="#1e1812" stroke="${options.locked ? "#b8db7c" : options.accent}" stroke-width="5"/>
      <rect x="25" y="18" width="50" height="49" fill="${options.locked ? "#314d31" : "#080706"}"/>
      <text x="50" y="55" text-anchor="middle" fill="${options.locked ? "#e8f6bf" : "#f4dfb9"}" font-size="39" font-weight="900" font-family="monospace">${options.digit}</text>
      <text x="50" y="79" text-anchor="middle" fill="${options.locked ? "#b8db7c" : "#9f876c"}" font-size="7" font-weight="900" font-family="monospace">${escapeXml(options.locked ? "LOCKED" : options.label)}</text>
    </svg>
  `;
  return sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer();
}

async function makeVaultDecorTile(width: number, height: number, index: number, accent: string) {
  const labels = ["GOLD", "KEY", "GEM", "MAP", "LOOT", "SHH"];
  const label = labels[(index - 2) % labels.length];
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
      <rect width="100" height="100" fill="#0d0a08"/>
      <rect x="5" y="5" width="90" height="90" fill="none" stroke="#403326" stroke-width="4"/>
      <rect x="24" y="25" width="52" height="35" fill="#2a2119"/>
      <rect x="29" y="30" width="42" height="25" fill="${index % 2 ? "#7e683e" : "#4f4250"}"/>
      <rect x="36" y="21" width="28" height="7" fill="${accent}"/>
      <text x="50" y="82" text-anchor="middle" fill="#8f7c67" font-size="8" font-weight="900" font-family="monospace">${label}</text>
    </svg>
  `;
  return sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer();
}

async function makePotatoTile(
  width: number,
  height: number,
  options: { hot: boolean; label: string; accent: string; dimmed?: boolean }
) {
  const opacity = options.dimmed ? 0.3 : 1;
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
      <rect width="100" height="100" fill="${options.hot ? "#2a120b" : "#0b0908"}"/>
      <g opacity="${opacity}">
        <rect x="4" y="4" width="92" height="92" fill="none" stroke="${options.hot ? "#ffb23e" : options.accent}" stroke-width="${options.hot ? 6 : 3}"/>
        ${options.hot ? `
          <rect x="51" y="10" width="5" height="15" fill="#6b4a31"/>
          <rect x="56" y="7" width="5" height="7" fill="#ff713d"/>
          <rect x="61" y="4" width="6" height="7" fill="#ffe070"/>
        ` : ""}
        <rect x="25" y="24" width="50" height="46" fill="#b8753d"/>
        <rect x="20" y="32" width="60" height="30" fill="#b8753d"/>
        <rect x="30" y="20" width="35" height="55" fill="#c88649"/>
        <rect x="34" y="35" width="5" height="5" fill="#704522"/>
        <rect x="59" y="29" width="4" height="4" fill="#704522"/>
        <rect x="53" y="53" width="6" height="5" fill="#704522"/>
        <rect x="37" y="48" width="4" height="4" fill="#704522"/>
        <rect x="38" y="42" width="5" height="6" fill="#12100e"/>
        <rect x="58" y="42" width="5" height="6" fill="#12100e"/>
        <rect x="44" y="56" width="14" height="4" fill="#12100e"/>
        <rect x="7" y="80" width="86" height="14" fill="#090706"/>
        <text x="50" y="90" text-anchor="middle" fill="${options.hot ? "#ffe070" : "#9a897f"}" font-size="8" font-weight="900" font-family="monospace">${escapeXml(options.label)}</text>
      </g>
    </svg>
  `;
  return sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer();
}

async function makeExplosionTile(
  width: number,
  height: number,
  options: { loser: boolean; accent: string }
) {
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
      <rect width="100" height="100" fill="#160907"/>
      <polygon points="50,8 60,30 80,18 73,40 96,43 76,55 91,74 66,69 61,94 49,72 31,91 33,66 8,72 26,53 5,41 30,38 22,16 43,29" fill="${options.loser ? "#e85a33" : "#8b6b3d"}"/>
      <polygon points="50,21 57,38 72,30 67,46 83,49 67,57 74,72 58,66 51,82 45,65 30,74 35,57 19,50 36,45 31,30 45,38" fill="${options.loser ? "#ffe070" : options.accent}"/>
      <text x="50" y="55" text-anchor="middle" fill="#17100d" font-size="13" font-weight="900" font-family="monospace">${options.loser ? "BOOM!" : "SAFE!"}</text>
    </svg>
  `;
  return sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer();
}

async function makeMoonMenuTile(width: number, height: number, accent: string) {
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
      <rect width="100" height="100" fill="#09090d"/>
      <rect x="4" y="4" width="92" height="92" fill="none" stroke="${escapeXml(accent)}" stroke-width="5"/>
      <rect x="28" y="20" width="44" height="44" fill="#ffe44a"/>
      <rect x="54" y="20" width="20" height="22" fill="#09090d"/>
      <rect x="38" y="35" width="5" height="5" fill="#07070b"/>
      <rect x="55" y="46" width="5" height="5" fill="#07070b"/>
      <rect x="41" y="54" width="21" height="5" fill="#07070b"/>
      <text x="50" y="82" text-anchor="middle" fill="#f8f7ff" font-size="8" font-weight="900" font-family="monospace">MUNCH</text>
    </svg>
  `;
  return sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer();
}

async function makePlanetTile(
  width: number,
  height: number,
  planet: (typeof PLANETS)[number],
  options: { label: string; border: string; selected?: boolean; locked?: boolean }
) {
  const opacity = options.locked ? 0.2 : 1;
  const background = options.selected ? "#151520" : "#07070b";

  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
      <rect width="100" height="100" fill="${background}"/>
      <g opacity="${opacity}">
        <rect x="4" y="4" width="92" height="92" fill="none" stroke="${escapeXml(options.border)}" stroke-width="5"/>
        ${planetPixelSvg(planet)}
        <rect x="4" y="78" width="92" height="18" fill="#07070b"/>
        <text x="50" y="90" text-anchor="middle" fill="#f8f7ff" font-size="7.5" font-weight="900" font-family="monospace">${escapeXml(options.label)}</text>
      </g>
    </svg>
  `;

  return sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer();
}

function avatarPixelSvg(avatar: AvatarId, color: string, accessory: AccessoryId) {
  const dark = "#09090d";
  const light = "#f8f7ff";
  const accent = "#ffe44a";

  let body = "";

  switch (avatar) {
    case "cat":
      body = `
        <rect x="7" y="9" width="18" height="16" fill="${color}"/>
        <rect x="5" y="5" width="7" height="8" fill="${color}"/>
        <rect x="20" y="5" width="7" height="8" fill="${color}"/>
        <rect x="8" y="6" width="3" height="4" fill="${dark}"/>
        <rect x="21" y="6" width="3" height="4" fill="${dark}"/>
        ${faceSvg(light, dark)}
      `;
      break;
    case "dog":
      body = `
        <rect x="7" y="9" width="18" height="16" fill="${color}"/>
        <rect x="3" y="7" width="7" height="12" fill="${color}"/>
        <rect x="22" y="7" width="7" height="12" fill="${color}"/>
        ${faceSvg(light, dark)}
        <rect x="14" y="19" width="5" height="4" fill="${dark}"/>
      `;
      break;
    case "fox":
      body = `
        <rect x="7" y="10" width="18" height="15" fill="${color}"/>
        <polygon points="5,12 9,3 14,11" fill="${color}"/>
        <polygon points="18,11 23,3 27,12" fill="${color}"/>
        <rect x="9" y="17" width="14" height="8" fill="${light}"/>
        ${eyesSvg(dark)}
        <rect x="15" y="20" width="3" height="2" fill="${dark}"/>
      `;
      break;
    case "frog":
      body = `
        <rect x="6" y="11" width="20" height="14" fill="${color}"/>
        <rect x="5" y="6" width="8" height="9" fill="${color}"/>
        <rect x="19" y="6" width="8" height="9" fill="${color}"/>
        <rect x="7" y="8" width="4" height="4" fill="${light}"/>
        <rect x="21" y="8" width="4" height="4" fill="${light}"/>
        <rect x="9" y="9" width="2" height="2" fill="${dark}"/>
        <rect x="21" y="9" width="2" height="2" fill="${dark}"/>
        <rect x="11" y="20" width="10" height="2" fill="${dark}"/>
      `;
      break;
    case "bear":
      body = `
        <rect x="7" y="9" width="18" height="17" fill="${color}"/>
        <rect x="4" y="6" width="8" height="8" fill="${color}"/>
        <rect x="20" y="6" width="8" height="8" fill="${color}"/>
        ${faceSvg(light, dark)}
        <rect x="12" y="19" width="9" height="5" fill="#d8ad82"/>
        <rect x="15" y="20" width="3" height="2" fill="${dark}"/>
      `;
      break;
    case "bunny":
      body = `
        <rect x="7" y="10" width="18" height="16" fill="${color}"/>
        <rect x="8" y="2" width="6" height="12" fill="${color}"/>
        <rect x="18" y="2" width="6" height="12" fill="${color}"/>
        <rect x="10" y="4" width="2" height="6" fill="#ff8fcf"/>
        <rect x="20" y="4" width="2" height="6" fill="#ff8fcf"/>
        ${faceSvg(light, dark)}
      `;
      break;
    case "owl":
      body = `
        <rect x="6" y="8" width="20" height="18" fill="${color}"/>
        <polygon points="6,10 10,3 13,10" fill="${color}"/>
        <polygon points="19,10 22,3 26,10" fill="${color}"/>
        <rect x="8" y="12" width="7" height="7" fill="${light}"/>
        <rect x="17" y="12" width="7" height="7" fill="${light}"/>
        <rect x="10" y="14" width="3" height="3" fill="${dark}"/>
        <rect x="19" y="14" width="3" height="3" fill="${dark}"/>
        <polygon points="14,20 18,20 16,24" fill="${accent}"/>
      `;
      break;
    case "shark":
      body = `
        <rect x="5" y="11" width="22" height="12" fill="${color}"/>
        <polygon points="4,17 0,10 0,24" fill="${color}"/>
        <polygon points="14,11 18,4 21,11" fill="${color}"/>
        <rect x="20" y="13" width="4" height="4" fill="${light}"/>
        <rect x="22" y="14" width="2" height="2" fill="${dark}"/>
        <rect x="18" y="19" width="7" height="2" fill="${dark}"/>
      `;
      break;
    case "axolotl":
      body = `
        <rect x="7" y="10" width="18" height="15" fill="${color}"/>
        <rect x="3" y="9" width="5" height="3" fill="#ff8fcf"/>
        <rect x="2" y="14" width="6" height="3" fill="#ff8fcf"/>
        <rect x="3" y="19" width="5" height="3" fill="#ff8fcf"/>
        <rect x="24" y="9" width="5" height="3" fill="#ff8fcf"/>
        <rect x="24" y="14" width="6" height="3" fill="#ff8fcf"/>
        <rect x="24" y="19" width="5" height="3" fill="#ff8fcf"/>
        <rect x="10" y="14" width="3" height="3" fill="${dark}"/>
        <rect x="20" y="14" width="3" height="3" fill="${dark}"/>
        <rect x="13" y="20" width="7" height="2" fill="${dark}"/>
      `;
      break;
    case "raccoon":
      body = `
        <rect x="7" y="9" width="18" height="16" fill="${color}"/>
        <polygon points="5,10 9,4 13,11" fill="${color}"/>
        <polygon points="19,11 23,4 27,10" fill="${color}"/>
        <rect x="8" y="13" width="16" height="7" fill="#2f3038"/>
        ${faceSvg(light, dark)}
      `;
      break;
    case "dino":
      body = `
        <rect x="7" y="10" width="18" height="15" fill="${color}"/>
        <rect x="21" y="7" width="7" height="12" fill="${color}"/>
        <polygon points="7,11 4,7 10,8" fill="${accent}"/>
        <polygon points="11,10 10,5 15,8" fill="${accent}"/>
        <rect x="21" y="10" width="3" height="3" fill="${light}"/>
        <rect x="22" y="11" width="2" height="2" fill="${dark}"/>
        <rect x="24" y="16" width="4" height="2" fill="${dark}"/>
        <rect x="4" y="22" width="8" height="4" fill="${color}"/>
      `;
      break;
    case "alien":
      body = `
        <rect x="8" y="8" width="16" height="17" fill="${color}"/>
        <rect x="11" y="5" width="10" height="22" fill="${color}"/>
        <rect x="6" y="11" width="20" height="10" fill="${color}"/>
        <rect x="9" y="13" width="6" height="7" fill="${dark}"/>
        <rect x="18" y="13" width="6" height="7" fill="${dark}"/>
        <rect x="14" y="22" width="5" height="2" fill="${dark}"/>
        <rect x="15" y="2" width="2" height="5" fill="${color}"/>
        <rect x="14" y="1" width="4" height="3" fill="${accent}"/>
      `;
      break;
  }

  return body + accessoryPixelSvg(accessory);
}

function eyesSvg(dark: string) {
  return `
    <rect x="10" y="14" width="3" height="3" fill="${dark}"/>
    <rect x="20" y="14" width="3" height="3" fill="${dark}"/>
  `;
}

function faceSvg(light: string, dark: string) {
  return `
    <rect x="10" y="14" width="4" height="4" fill="${light}"/>
    <rect x="19" y="14" width="4" height="4" fill="${light}"/>
    <rect x="12" y="15" width="2" height="2" fill="${dark}"/>
    <rect x="19" y="15" width="2" height="2" fill="${dark}"/>
    <rect x="15" y="20" width="3" height="2" fill="${dark}"/>
  `;
}

function accessoryPixelSvg(accessory: AccessoryId) {
  switch (accessory) {
    case "crown":
      return `<polygon points="8,7 11,2 16,7 21,2 24,7 23,11 9,11" fill="#ffe44a"/>`;
    case "glasses":
      return `
        <rect x="7" y="13" width="8" height="6" fill="none" stroke="#050507" stroke-width="2"/>
        <rect x="17" y="13" width="8" height="6" fill="none" stroke="#050507" stroke-width="2"/>
        <rect x="15" y="15" width="2" height="2" fill="#050507"/>
      `;
    case "cape":
      return `<polygon points="6,18 3,30 14,26 12,18" fill="#ff5cb8"/>`;
    case "cap":
      return `
        <rect x="8" y="5" width="15" height="5" fill="#4b79ff"/>
        <rect x="20" y="8" width="7" height="3" fill="#4b79ff"/>
      `;
    case "star":
      return `<polygon points="25,3 27,8 31,9 28,12 29,17 25,14 21,17 22,12 19,9 23,8" fill="#ffe44a"/>`;
    default:
      return "";
  }
}

function snackPixelSvg(id: string, color: string) {
  switch (id) {
    case "pizza":
      return `
        <polygon points="26,65 50,20 74,65" fill="${color}"/>
        <rect x="29" y="61" width="42" height="8" fill="#d69b55"/>
        <rect x="43" y="39" width="7" height="7" fill="#ffdf4d"/>
        <rect x="54" y="50" width="7" height="7" fill="#ffdf4d"/>
        <rect x="39" y="54" width="6" height="6" fill="#a82927"/>
      `;
    case "pickle":
      return `
        <rect x="32" y="18" width="36" height="51" fill="${color}"/>
        <rect x="27" y="27" width="5" height="32" fill="${color}"/>
        <rect x="68" y="27" width="5" height="32" fill="${color}"/>
        <rect x="40" y="28" width="5" height="5" fill="#24451f"/>
        <rect x="54" y="40" width="5" height="5" fill="#24451f"/>
        <rect x="42" y="55" width="5" height="5" fill="#24451f"/>
      `;
    case "donut":
      return `
        <rect x="26" y="23" width="48" height="48" fill="${color}"/>
        <rect x="33" y="18" width="34" height="58" fill="${color}"/>
        <rect x="21" y="31" width="58" height="32" fill="${color}"/>
        <rect x="43" y="39" width="14" height="14" fill="#07070b"/>
        <rect x="35" y="30" width="5" height="5" fill="#ffe44a"/>
        <rect x="61" y="34" width="5" height="5" fill="#1ee8ff"/>
        <rect x="34" y="58" width="5" height="5" fill="#a8ff3e"/>
      `;
    case "fish":
      return `
        <rect x="28" y="33" width="40" height="29" fill="${color}"/>
        <rect x="22" y="39" width="52" height="17" fill="${color}"/>
        <polygon points="68,47 84,32 84,62" fill="${color}"/>
        <rect x="31" y="40" width="5" height="5" fill="#07070b"/>
      `;
    case "boot":
      return `
        <rect x="37" y="18" width="24" height="35" fill="${color}"/>
        <rect x="34" y="46" width="30" height="22" fill="${color}"/>
        <rect x="52" y="58" width="27" height="10" fill="${color}"/>
        <rect x="45" y="27" width="16" height="5" fill="#8b623f"/>
      `;
    default:
      return `
        <rect x="45" y="18" width="10" height="52" fill="${color}"/>
        <rect x="24" y="39" width="52" height="10" fill="${color}"/>
        <rect x="31" y="27" width="38" height="34" fill="${color}" transform="rotate(45 50 44)"/>
        <rect x="40" y="34" width="20" height="20" fill="${color}"/>
      `;
  }
}

function planetPixelSvg(planet: (typeof PLANETS)[number]) {
  const ring = planet.ring
    ? `<rect x="10" y="44" width="80" height="8" fill="${planet.accent}" transform="rotate(-12 50 48)"/>`
    : "";

  let details = "";
  switch (planet.id) {
    case "earth":
      details = `
        <rect x="31" y="31" width="13" height="9" fill="#64d477"/>
        <rect x="38" y="40" width="9" height="8" fill="#64d477"/>
        <rect x="54" y="48" width="15" height="10" fill="#64d477"/>
        <rect x="50" y="31" width="8" height="6" fill="#d9f3ff"/>
      `;
      break;
    case "jupiter":
      details = `
        <rect x="26" y="30" width="48" height="5" fill="#f0d2a8"/>
        <rect x="25" y="39" width="50" height="6" fill="#9a6b55"/>
        <rect x="25" y="49" width="50" height="5" fill="#f0d2a8"/>
        <rect x="29" y="58" width="42" height="5" fill="#b27a58"/>
        <rect x="57" y="53" width="10" height="7" fill="#b64d3e"/>
      `;
      break;
    case "mars":
      details = `
        <rect x="36" y="31" width="9" height="8" fill="#862b22"/>
        <rect x="57" y="48" width="7" height="7" fill="#862b22"/>
        <rect x="43" y="57" width="6" height="5" fill="#ef7456"/>
      `;
      break;
    case "saturn":
      details = `
        <rect x="29" y="37" width="42" height="5" fill="#c7a95e"/>
        <rect x="31" y="51" width="38" height="4" fill="#f8e59d"/>
      `;
      break;
    case "neptune":
      details = `
        <rect x="28" y="38" width="44" height="5" fill="#2444ad"/>
        <rect x="52" y="54" width="12" height="7" fill="#6d8cff"/>
      `;
      break;
    default:
      details = `
        <rect x="38" y="33" width="7" height="7" fill="${planet.accent}"/>
        <rect x="57" y="49" width="6" height="6" fill="${planet.accent}"/>
      `;
  }

  return `
    ${ring}
    <rect x="29" y="24" width="42" height="42" fill="${planet.color}"/>
    <rect x="24" y="31" width="52" height="28" fill="${planet.color}"/>
    <rect x="35" y="19" width="30" height="52" fill="${planet.color}"/>
    ${details}
  `;
}

function mixColor(a: string, b: string, amount: number) {
  const parse = (hex: string) => {
    const clean = hex.replace("#", "");
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16)
    ];
  };

  const aa = parse(a);
  const bb = parse(b);
  const out = aa.map((value, index) => Math.round(value * (1 - amount) + bb[index] * amount));
  return "#" + out.map((value) => value.toString(16).padStart(2, "0")).join("");
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

process.on("SIGINT", async () => {
  console.log("\n[bridge] closing decks...");
  await Promise.all(decks.map((entry) => entry.deck.close().catch(() => undefined)));
  process.exit(0);
});
