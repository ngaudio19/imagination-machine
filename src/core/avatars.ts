import type { PlayerAccessory, PlayerAvatar, PlayerColor } from "./types";

export const AVATARS: Array<{ id: PlayerAvatar; label: string }> = [
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

export const PLAYER_COLORS: PlayerColor[] = ["violet", "cyan", "lime", "yellow", "pink", "blue"];

export const COLOR_HEX: Record<PlayerColor, string> = {
  violet: "#9b5cff",
  cyan: "#1ee8ff",
  lime: "#a8ff3e",
  yellow: "#ffe44a",
  pink: "#ff5cb8",
  blue: "#4b79ff"
};

export const ACCESSORIES: Array<{ id: PlayerAccessory; label: string }> = [
  { id: "none", label: "PLAIN" },
  { id: "crown", label: "CROWN" },
  { id: "glasses", label: "GLASSES" },
  { id: "cape", label: "CAPE" },
  { id: "cap", label: "CAP" },
  { id: "star", label: "STAR" }
];
