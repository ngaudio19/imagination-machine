import type { PlayerProfile } from "./types";

const KEY = "imagination-machine.players.v1";

export const DEFAULT_PLAYERS: PlayerProfile[] = [
  { id: "cora", name: "Cora", color: "violet", avatar: "cat", wins: 0, gamesPlayed: 0 },
  { id: "mae", name: "Mae", color: "cyan", avatar: "fox", wins: 0, gamesPlayed: 0 },
  { id: "cole", name: "Cole", color: "lime", avatar: "frog", wins: 0, gamesPlayed: 0 }
];

export function loadPlayers(): PlayerProfile[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : DEFAULT_PLAYERS;
  } catch {
    return DEFAULT_PLAYERS;
  }
}

export function savePlayers(players: PlayerProfile[]) {
  localStorage.setItem(KEY, JSON.stringify(players));
}
