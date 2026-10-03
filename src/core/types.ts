export type PlayerColor = "violet" | "cyan" | "lime" | "yellow" | "pink" | "blue";
export type PlayerAvatar =
  | "cat" | "dog" | "fox" | "frog" | "bear" | "bunny"
  | "owl" | "shark" | "axolotl" | "raccoon" | "dino" | "alien";
export type PlayerAccessory = "none" | "crown" | "glasses" | "cape" | "cap" | "star";

export interface PlayerProfile {
  id: string;
  name: string;
  color: PlayerColor;
  avatar: PlayerAvatar;
  accessory: PlayerAccessory;
  wins: number;
  gamesPlayed: number;
}

export interface GameDefinition {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
}
