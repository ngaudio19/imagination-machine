import { listStreamDecks, openStreamDeck, type StreamDeck } from "@elgato-stream-deck/node";
import sharp from "sharp";
import { WebSocket, WebSocketServer } from "ws";

const PORT = 3210;

const SNACKS = [
  { id: "pizza", label: "PIZZA", color: "#ff5c35" },
  { id: "pickle", label: "PICKLE", color: "#7dff4a" },
  { id: "donut", label: "DONUT", color: "#ff6cc7" },
  { id: "fish", label: "FISH", color: "#2ed7ff" },
  { id: "boot", label: "BOOT", color: "#d6a365" },
  { id: "star", label: "STAR", color: "#ffe34e" }
] as const;

const PLANETS = [
  { id: "mercury", label: "MERCURY", color: "#a9a9a9", accent: "#dedede" },
  { id: "venus", label: "VENUS", color: "#e8a84f", accent: "#ffd078" },
  { id: "earth", label: "EARTH", color: "#2f8fff", accent: "#64d477" },
  { id: "mars", label: "MARS", color: "#d55338", accent: "#ff8c66" },
  { id: "jupiter", label: "JUPITER", color: "#d8ad82", accent: "#f0d2a8" },
  { id: "saturn", label: "SATURN", color: "#e7cf82", accent: "#fff0a9", ring: true },
  { id: "uranus", label: "URANUS", color: "#80e1e8", accent: "#b8f7f7", ring: true },
  { id: "neptune", label: "NEPTUNE", color: "#4267e8", accent: "#7193ff" }
] as const;

type ClientMessage =
  | { type: "lobby"; players: Array<{ name: string; color: string }> }
  | { type: "menu"; players: Array<{ name: string; color: string }> }
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
    };

type DeckEntry = {
  path: string;
  serial: string;
  deck: StreamDeck;
};

const clients = new Set<WebSocket>();
const decks: DeckEntry[] = [];
let lastState: ClientMessage | null = null;
let connecting = false;

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (socket) => {
  clients.add(socket);
  sendStatus(socket);

  socket.on("message", async (data) => {
    try {
      lastState = JSON.parse(String(data)) as ClientMessage;
      await renderAll();
    } catch (error) {
      console.error("[bridge] bad message", error);
    }
  });

  socket.on("close", () => clients.delete(socket));
});

console.log(`[bridge] listening at ws://127.0.0.1:${PORT}`);

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

async function scanAndConnect() {
  if (connecting) return;
  connecting = true;

  try {
    const found = await listStreamDecks();
    const known = new Set(decks.map((deck) => deck.path));

    for (const device of found) {
      if (known.has(device.path)) continue;

      try {
        const deck = await openStreamDeck(device.path, { resetToLogoOnClose: true });
        const serial = (await deck.getSerialNumber().catch(() => device.serialNumber ?? device.path)) || device.path;
        const entry: DeckEntry = { path: device.path, serial, deck };
        decks.push(entry);
        decks.sort((a, b) => a.serial.localeCompare(b.serial));

        deck.on("error", (error) => console.error(`[bridge] device ${serial} error`, error));

        deck.on("down", (control) => {
          const deckIndex = decks.findIndex((item) => item.serial === serial);
          if (control.type === "button") {
            broadcast({ type: "key", deckIndex, keyIndex: control.index });
          } else if (control.type === "encoder") {
            broadcast({ type: "dial-down", deckIndex, dialIndex: control.index });
          }
        });

        deck.on("rotate", (control, amount) => {
          const deckIndex = decks.findIndex((item) => item.serial === serial);
          broadcast({ type: "dial", deckIndex, dialIndex: control.index, amount });
        });

        deck.on("lcdShortPress", (_control, position) => {
          const deckIndex = decks.findIndex((item) => item.serial === serial);
          broadcast({ type: "touch", deckIndex, x: position.x, y: position.y });
        });

        await deck.setBrightness(75).catch(() => undefined);
        await deck.clearPanel().catch(() => undefined);
        console.log(`[bridge] connected: ${deck.PRODUCT_NAME} · ${serial}`);
        sendStatus();
        await renderAll();
      } catch (error) {
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
  if (!lastState) {
    await Promise.all(decks.map((_, index) => renderWaiting(index)));
    return;
  }

  if (lastState.type === "lobby") {
    await Promise.all(decks.map((_, index) => renderLobby(index, lastState as Extract<ClientMessage, { type: "lobby" }>)));
    return;
  }

  if (lastState.type === "menu") {
    await Promise.all(decks.map((_, index) => renderMenu(index, lastState as Extract<ClientMessage, { type: "menu" }>)));
    return;
  }

  if (lastState.type === "moon-munch") {
    await Promise.all(decks.map((_, index) => renderMoonMunch(index, lastState as Extract<ClientMessage, { type: "moon-munch" }>)));
    return;
  }

  await Promise.all(decks.map((_, index) => renderPlanetTrivia(index, lastState as Extract<ClientMessage, { type: "planet-trivia" }>)));
}

async function renderWaiting(deckIndex: number) {
  const entry = decks[deckIndex];
  if (!entry) return;
  const buttons = getButtonControls(entry.deck);

  await Promise.all(
    buttons.map(async (button, index) => {
      const raw = await makeTextTile(button.pixelSize.width, button.pixelSize.height, {
        background: "#09090d",
        accent: index % 2 ? "#9b5cff" : "#1ee8ff",
        top: "IMAGINATION",
        bottom: "WAITING"
      });
      await entry.deck.fillKeyBuffer(button.index, raw, { format: "rgb" });
    })
  );

  await renderStrip(entry.deck, "IMAGINATION MACHINE", "WAITING FOR GAME", "#ffe44a");
}

async function renderLobby(deckIndex: number, state: Extract<ClientMessage, { type: "lobby" }>) {
  const entry = decks[deckIndex];
  if (!entry) return;

  const player = state.players[deckIndex];
  const accent = player?.color ?? "#53536a";
  const name = player?.name?.toUpperCase() ?? `PLAYER ${deckIndex + 1}`;

  await renderAllTextKeys(entry.deck, name, player ? "READY" : "WAITING", accent);
  await renderStrip(entry.deck, name, player ? "PLAYER READY" : "CHOOSE ON MAC", accent);
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

  await renderStrip(entry.deck, player?.name?.toUpperCase() ?? `PLAYER ${deckIndex + 1}`, "PICK A GAME", accent);
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

  await renderStrip(entry.deck, `${player.name.toUpperCase()} · ${player.score} PTS`, status, player.color);
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

  await renderFuelStrip(entry.deck, player.name.toUpperCase(), status, player.color, player.fuel, player.maxFuel);
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

async function renderStrip(deck: StreamDeck, left: string, right: string, accent: string) {
  const lcd = deck.CONTROLS.find((control) => control.type === "lcd-segment");
  if (!lcd) return;

  const svg = `
    <svg width="${lcd.pixelSize.width}" height="${lcd.pixelSize.height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#07070b"/>
      <rect x="0" y="0" width="14" height="100%" fill="${escapeXml(accent)}"/>
      <text x="30" y="42" fill="${escapeXml(accent)}" font-size="22" font-weight="900" font-family="monospace">${escapeXml(left)}</text>
      <text x="30" y="76" fill="#f8f7ff" font-size="18" font-weight="800" font-family="monospace">${escapeXml(right)}</text>
    </svg>
  `;

  const raw = await sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer();
  await deck.fillLcd(lcd.index, raw, { format: "rgb" });
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
  const barWidth = Math.round((lcd.pixelSize.width - 60) * ratio);

  const svg = `
    <svg width="${lcd.pixelSize.width}" height="${lcd.pixelSize.height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#05050a"/>
      <text x="18" y="31" fill="${escapeXml(accent)}" font-size="20" font-weight="900" font-family="monospace">${escapeXml(name)} · ${fuel} FUEL</text>
      <text x="18" y="58" fill="#f8f7ff" font-size="15" font-weight="800" font-family="monospace">${escapeXml(status)}</text>
      <rect x="18" y="${lcd.pixelSize.height - 20}" width="${lcd.pixelSize.width - 36}" height="10" fill="#20202b"/>
      <rect x="18" y="${lcd.pixelSize.height - 20}" width="${barWidth}" height="10" fill="${escapeXml(accent)}"/>
    </svg>
  `;

  const raw = await sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer();
  await deck.fillLcd(lcd.index, raw, { format: "rgb" });
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
    ? `<rect x="16" y="43" width="68" height="7" fill="${planet.accent}" transform="rotate(-12 50 47)"/>`
    : "";

  const details =
    planet.id === "earth"
      ? `<rect x="35" y="31" width="12" height="10" fill="#64d477"/><rect x="52" y="47" width="15" height="10" fill="#64d477"/>`
      : planet.id === "jupiter"
        ? `<rect x="29" y="37" width="42" height="5" fill="#9a6b55"/><rect x="29" y="49" width="42" height="5" fill="#f0d2a8"/><rect x="56" y="56" width="9" height="6" fill="#b64d3e"/>`
        : planet.id === "mars"
          ? `<rect x="38" y="34" width="8" height="8" fill="#9a3025"/><rect x="57" y="51" width="6" height="6" fill="#9a3025"/>`
          : `<rect x="39" y="34" width="7" height="7" fill="${planet.accent}"/><rect x="57" y="49" width="6" height="6" fill="${planet.accent}"/>`;

  return `
    ${ring}
    <rect x="29" y="24" width="42" height="42" fill="${planet.color}"/>
    <rect x="24" y="31" width="52" height="28" fill="${planet.color}"/>
    <rect x="35" y="19" width="30" height="52" fill="${planet.color}"/>
    ${details}
  `;
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
