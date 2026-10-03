export type HardwareDeck = {
  index: number;
  serial: string;
  productName: string;
};

export type HardwareEvent =
  | { type: "status"; decks: HardwareDeck[] }
  | { type: "key"; deckIndex: number; keyIndex: number }
  | { type: "dial"; deckIndex: number; dialIndex: number; amount: number }
  | { type: "dial-down"; deckIndex: number; dialIndex: number }
  | { type: "touch"; deckIndex: number; x: number; y: number };

export type LobbyRenderMessage = {
  type: "lobby";
  players: Array<{ name: string; color: string }>;
};

export type MoonMunchRenderMessage = {
  type: "moon-munch";
  players: Array<{ name: string; color: string; choiceIndex: number | null }>;
};

export type HardwareRenderMessage = LobbyRenderMessage | MoonMunchRenderMessage;
export type HardwareListener = (event: HardwareEvent) => void;

class HardwareBridge {
  private socket: WebSocket | null = null;
  private listeners = new Set<HardwareListener>();
  private retryTimer: number | null = null;
  private queued: HardwareRenderMessage | null = null;

  constructor() {
    this.connect();
  }

  subscribe(listener: HardwareListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  send(message: HardwareRenderMessage) {
    this.queued = message;
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  private emit(event: HardwareEvent) {
    for (const listener of this.listeners) listener(event);
  }

  private connect() {
    if (typeof window === "undefined") return;

    try {
      this.socket = new WebSocket("ws://127.0.0.1:3210");
    } catch {
      this.scheduleRetry();
      return;
    }

    this.socket.addEventListener("open", () => {
      if (this.retryTimer) {
        window.clearTimeout(this.retryTimer);
        this.retryTimer = null;
      }
      if (this.queued) this.socket?.send(JSON.stringify(this.queued));
    });

    this.socket.addEventListener("message", (event) => {
      try {
        this.emit(JSON.parse(String(event.data)) as HardwareEvent);
      } catch {
        // Ignore malformed bridge messages.
      }
    });

    this.socket.addEventListener("close", () => {
      this.emit({ type: "status", decks: [] });
      this.scheduleRetry();
    });

    this.socket.addEventListener("error", () => {
      this.socket?.close();
    });
  }

  private scheduleRetry() {
    if (this.retryTimer || typeof window === "undefined") return;
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, 1500);
  }
}

export const hardwareBridge = new HardwareBridge();
