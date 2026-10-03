export type AudioScene =
  | "lobby"
  | "builder"
  | "menu"
  | "moon-munch"
  | "planet-trivia"
  | "safecracker"
  | "hot-potato";

export type SfxName =
  | "select"
  | "ready"
  | "back"
  | "start"
  | "tick"
  | "lock"
  | "correct"
  | "wrong"
  | "munch"
  | "toss"
  | "boom"
  | "vault"
  | "win";

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambient: GainNode | null = null;
  private scene: AudioScene = "lobby";
  private ambientNodes: AudioNode[] = [];
  private ambientTimer: number | null = null;
  private ready = false;

  isReady() {
    return this.ready && this.ctx?.state === "running";
  }

  async unlock(): Promise<boolean> {
    try {
      if (!this.ctx) {
        const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return false;

        this.ctx = new Ctx();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.48;
        this.master.connect(this.ctx.destination);
      }

      if (this.ctx.state !== "running") {
        await this.ctx.resume();
      }

      this.ready = this.ctx.state === "running";
      if (this.ready) this.startAmbient();
      return this.ready;
    } catch {
      return false;
    }
  }

  setScene(scene: AudioScene) {
    if (this.scene === scene) return;
    this.scene = scene;
    if (this.isReady()) this.startAmbient();
  }

  play(name: SfxName) {
    if (!this.ctx || !this.master || !this.isReady()) return;

    const now = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.connect(this.master);

    switch (name) {
      case "select":
        this.tone(gain, 310, 430, now, 0.07, "square", 0.11);
        break;
      case "ready":
        this.tone(gain, 440, 660, now, 0.09, "square", 0.12);
        this.tone(gain, 660, 880, now + 0.08, 0.1, "square", 0.1);
        break;
      case "back":
        this.tone(gain, 360, 220, now, 0.09, "triangle", 0.08);
        break;
      case "start":
        this.tone(gain, 260, 390, now, 0.08, "square", 0.09);
        this.tone(gain, 390, 520, now + 0.08, 0.1, "square", 0.09);
        break;
      case "tick":
        this.noiseBurst(gain, now, 0.025, 0.055);
        this.tone(gain, 900, 760, now, 0.025, "square", 0.035);
        break;
      case "lock":
        this.tone(gain, 180, 120, now, 0.055, "square", 0.12);
        this.tone(gain, 520, 760, now + 0.045, 0.08, "square", 0.1);
        break;
      case "correct":
        this.tone(gain, 420, 620, now, 0.09, "square", 0.1);
        this.tone(gain, 620, 900, now + 0.08, 0.12, "triangle", 0.1);
        break;
      case "wrong":
        this.tone(gain, 180, 115, now, 0.16, "sawtooth", 0.08);
        break;
      case "munch":
        this.noiseBurst(gain, now, 0.11, 0.18);
        this.tone(gain, 150, 75, now, 0.16, "square", 0.11);
        break;
      case "toss":
        this.tone(gain, 240, 700, now, 0.09, "triangle", 0.09);
        break;
      case "boom":
        this.noiseBurst(gain, now, 0.35, 0.35);
        this.tone(gain, 120, 42, now, 0.4, "sawtooth", 0.18);
        break;
      case "vault":
        this.noiseBurst(gain, now, 0.18, 0.16);
        this.tone(gain, 110, 70, now, 0.23, "square", 0.12);
        this.tone(gain, 330, 520, now + 0.18, 0.25, "triangle", 0.11);
        break;
      case "win":
        [440, 550, 660, 880].forEach((frequency, index) =>
          this.tone(gain, frequency, frequency, now + index * 0.075, 0.12, "square", 0.08)
        );
        break;
    }
  }

  private startAmbient() {
    this.stopAmbient();
    if (!this.ctx || !this.master || !this.isReady()) return;

    this.ambient = this.ctx.createGain();
    this.ambient.gain.value = 0.13;
    this.ambient.connect(this.master);

    const now = this.ctx.currentTime;

    if (this.scene === "moon-munch" || this.scene === "planet-trivia") {
      this.addDrone(this.scene === "moon-munch" ? 58 : 46, this.scene === "moon-munch" ? 87 : 69, 0.18);
      this.ambientTimer = window.setInterval(() => {
        if (!this.ambient || !this.ctx) return;
        const base = this.scene === "moon-munch" ? 620 : 820;
        this.tone(this.ambient, base, base * 1.18, this.ctx.currentTime, 0.22, "sine", 0.025);
      }, this.scene === "moon-munch" ? 4200 : 3100);
      return;
    }

    if (this.scene === "safecracker") {
      this.addDrone(52, 78, 0.11);
      this.ambientTimer = window.setInterval(() => {
        if (!this.ambient || !this.ctx) return;
        this.tone(this.ambient, 1160, 920, this.ctx.currentTime, 0.025, "square", 0.018);
      }, 1250);
      return;
    }

    if (this.scene === "hot-potato") {
      this.addDrone(82, 123, 0.07);
      this.ambientTimer = window.setInterval(() => {
        if (!this.ambient || !this.ctx) return;
        this.tone(this.ambient, 280, 340, this.ctx.currentTime, 0.045, "square", 0.035);
      }, 720);
      return;
    }

    if (this.scene === "builder") {
      this.addDrone(110, 165, 0.06);
      return;
    }

    // Lobby/menu: quiet toy-box hum with occasional soft chime.
    this.addDrone(73, 110, 0.045);
    this.ambientTimer = window.setInterval(() => {
      if (!this.ambient || !this.ctx) return;
      this.tone(this.ambient, 523, 784, this.ctx.currentTime, 0.16, "triangle", 0.018);
    }, 5200);
  }

  private addDrone(low: number, high: number, level: number) {
    if (!this.ctx || !this.ambient) return;

    for (const [frequency, detune] of [[low, -4], [high, 5]] as const) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = frequency;
      osc.detune.value = detune;
      gain.gain.value = level;
      osc.connect(gain);
      gain.connect(this.ambient);
      osc.start();
      this.ambientNodes.push(osc, gain);
    }
  }

  private stopAmbient() {
    if (this.ambientTimer !== null) {
      window.clearInterval(this.ambientTimer);
      this.ambientTimer = null;
    }

    for (const node of this.ambientNodes) {
      if (node instanceof OscillatorNode) {
        try { node.stop(); } catch {}
      }
      try { node.disconnect(); } catch {}
    }

    this.ambientNodes = [];
    try { this.ambient?.disconnect(); } catch {}
    this.ambient = null;
  }

  private tone(
    destination: AudioNode,
    from: number,
    to: number,
    start: number,
    duration: number,
    type: OscillatorType,
    level: number
  ) {
    if (!this.ctx) return;

    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + duration);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(level, start + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  private noiseBurst(destination: AudioNode, start: number, duration: number, level: number) {
    if (!this.ctx) return;

    const length = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }

    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = level;
    source.connect(gain);
    gain.connect(destination);
    source.start(start);
  }
}

export const audioEngine = new AudioEngine();
