import type { PlayerProfile } from "./types";

const KEY = "imagination-machine.players.v2";

export const DEFAULT_PLAYERS: PlayerProfile[] = [
  { id: "cora", name: "Cora", color: "violet", avatar: "cat", accessory: "none", wins: 0, gamesPlayed: 0 },
  { id: "mae", name: "Mae", color: "cyan", avatar: "fox", accessory: "none", wins: 0, gamesPlayed: 0 },
  { id: "cole", name: "Cole", color: "lime", avatar: "frog", accessory: "none", wins: 0, gamesPlayed: 0 }
];

export function loadPlayers(): PlayerProfile[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);

    const oldRaw = localStorage.getItem("imagination-machine.players.v1");
    if (oldRaw) {
      const oldPlayers = JSON.parse(oldRaw) as Array<Partial<PlayerProfile> & Pick<PlayerProfile, "id" | "name">>;
      return oldPlayers.map((player, index) => ({
        ...DEFAULT_PLAYERS[index],
        ...player,
        accessory: player.accessory ?? "none"
      }));
    }

    return DEFAULT_PLAYERS;
  } catch {
    return DEFAULT_PLAYERS;
  }
}

export function savePlayers(players: PlayerProfile[]) {
  localStorage.setItem(KEY, JSON.stringify(players));
}
