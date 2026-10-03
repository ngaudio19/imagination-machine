import { listStreamDecks, openStreamDeck, type StreamDeck } from "@elgato-stream-deck/node";
import sharp from "sharp";
import { WebSocketServer, type WebSocket } from "ws";

const PORT = 3210;
const SNACKS = [
  { label: "PIZZA", color: "#ff5c35" },
  { label: "PICKLE", color: "#7dff4a" },
  { label: "DONUT", color: "#ff6cc7" },
  { label: "FISH", color: "#2ed7ff" },
  { label: "BOOT", color: "#d6a365" },
  { label: "STAR", color: "#ffe34e" }
];

type ClientMessage =
  | {
      type: "lobby";
      players: Array<{ name: string; color: string }>;
    }
  | {
      type: "moon-munch";
      players: Array<{ name: string; color: string; choiceIndex: number | null }>;
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
      const message = JSON.parse(String(data)) as ClientMessage;
      lastState = message;
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
    if (client.readyState === client.OPEN) client.send(payload);
  }
}

function sendStatus(socket?: WebSocket) {
  const message = JSON.stringify({
    type: "status",
    decks: decks.map((entry, index) => ({
      index,
      serial: entry.serial,
      productName: entry.deck.PRODUCT_NAME
    }))
  });

  if (socket) {
    if (socket.readyState === socket.OPEN) socket.send(message);
  } else {
    for (const client of clients) {
      if (client.readyState === client.OPEN) client.send(message);
    }
  }
}

async function scanAndConnect() {
  if (connecting) return;
  connecting = true;

  try {
    const found = await listStreamDecks();
    const known = new Set(decks.map((d) => d.path));

    for (const device of found) {
      if (known.has(device.path)) continue;

      try {
        const deck = await openStreamDeck(device.path, { resetToLogoOnClose: true });
        const serial = (await deck.getSerialNumber().catch(() => device.serialNumber ?? device.path)) || device.path;
        const entry: DeckEntry = { path: device.path, serial, deck };
        decks.push(entry);
        decks.sort((a, b) => a.serial.localeCompare(b.serial));

        deck.on("error", (error) => {
          console.error(`[bridge] device ${serial} error`, error);
        });

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

        await deck.setBrightness(70).catch(() => undefined);
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
    await Promise.all(decks.map((_, i) => renderWaiting(i)));
    return;
  }

  if (lastState.type === "lobby") {
    await Promise.all(decks.map((_, index) => renderLobby(index, lastState!)));
    return;
  }

  await Promise.all(decks.map((_, index) => renderMoonMunch(index, lastState!)));
}

async function renderWaiting(deckIndex: number) {
  const entry = decks[deckIndex];
  if (!entry) return;
  const buttons = getButtonControls(entry.deck);

  await Promise.all(
    buttons.map(async (button) => {
      const raw = await makeTile(button.pixelSize.width, button.pixelSize.height, {
        background: "#09090d",
        accent: "#31313f",
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
  const buttons = getButtonControls(entry.deck);
  const accent = player?.color || "#53536a";
  const name = player?.name?.toUpperCase() || `PLAYER ${deckIndex + 1}`;

  await Promise.all(
    buttons.map(async (button, i) => {
      const raw = await makeTile(button.pixelSize.width, button.pixelSize.height, {
        background: "#09090d",
        accent,
        top: i === 0 ? name : "READY",
        bottom: i === 0 ? "PLAYER" : ""
      });
      await entry.deck.fillKeyBuffer(button.index, raw, { format: "rgb" });
    })
  );

  await renderStrip(entry.deck, name, player ? "LOCKED IN" : "CHOOSE PLAYER", accent);
}

async function renderMoonMunch(deckIndex: number, state: Extract<ClientMessage, { type: "moon-munch" }>) {
  const entry = decks[deckIndex];
  const player = state.players[deckIndex];
  if (!entry || !player) return;

  const buttons = getButtonControls(entry.deck);

  await Promise.all(
    buttons.map(async (button, i) => {
      const snack = SNACKS[i];
      if (!snack) {
        const raw = await makeTile(button.pixelSize.width, button.pixelSize.height, {
          background: "#09090d",
          accent: "#2d2d39",
          top: i === 6 ? "BACK" : "READY",
          bottom: ""
        });
        await entry.deck.fillKeyBuffer(button.index, raw, { format: "rgb" });
        return;
      }

      const selected = player.choiceIndex === i;
      const locked = player.choiceIndex !== null && !selected;
      const raw = await makeTile(button.pixelSize.width, button.pixelSize.height, {
        background: locked ? "#050507" : selected ? snack.color : "#0d0d13",
        accent: locked ? "#24242d" : snack.color,
        top: snack.label,
        bottom: selected ? "LOCKED" : `CARD ${i + 1}`,
        invert: selected
      });

      await entry.deck.fillKeyBuffer(button.index, raw, { format: "rgb" });
    })
  );

  await renderStrip(
    entry.deck,
    player.name.toUpperCase(),
    player.choiceIndex === null ? "PICK A SECRET SNACK" : "CHOICE LOCKED",
    player.color
  );
}

function getButtonControls(deck: StreamDeck) {
  return deck.CONTROLS.filter(
    (control): control is Extract<(typeof deck.CONTROLS)[number], { type: "button"; feedbackType: "lcd" }> =>
      control.type === "button" && control.feedbackType === "lcd"
  );
}

async function renderStrip(deck: StreamDeck, left: string, right: string, accent: string) {
  const lcd = deck.CONTROLS.find((control) => control.type === "lcd-segment");
  if (!lcd) return;

  const svg = `
    <svg width="${lcd.pixelSize.width}" height="${lcd.pixelSize.height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#07070b"/>
      <rect x="0" y="0" width="12" height="100%" fill="${escapeXml(accent)}"/>
      <text x="30" y="43" fill="${escapeXml(accent)}" font-size="22" font-weight="700" font-family="monospace">${escapeXml(left)}</text>
      <text x="30" y="76" fill="#f8f7ff" font-size="18" font-weight="700" font-family="monospace">${escapeXml(right)}</text>
    </svg>
  `;

  const raw = await sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer();
  await deck.fillLcd(lcd.index, raw, { format: "rgb" });
}

async function makeTile(
  width: number,
  height: number,
  options: {
    background: string;
    accent: string;
    top: string;
    bottom: string;
    invert?: boolean;
  }
) {
  const foreground = options.invert ? "#07070b" : "#f8f7ff";
  const secondary = options.invert ? "#16161d" : options.accent;

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${escapeXml(options.background)}"/>
      <rect x="5" y="5" width="${Math.max(0, width - 10)}" height="${Math.max(0, height - 10)}" fill="none" stroke="${escapeXml(options.accent)}" stroke-width="6"/>
      <text x="50%" y="48%" text-anchor="middle" fill="${foreground}" font-size="${Math.max(12, Math.round(width * 0.13))}" font-weight="800" font-family="monospace">${escapeXml(options.top)}</text>
      <text x="50%" y="73%" text-anchor="middle" fill="${escapeXml(secondary)}" font-size="${Math.max(9, Math.round(width * 0.085))}" font-weight="700" font-family="monospace">${escapeXml(options.bottom)}</text>
    </svg>
  `;

  return sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer();
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
