export type PlayerColor = "violet" | "cyan" | "lime" | "yellow" | "pink" | "blue";
export type PlayerAvatar = "cat" | "fox" | "frog" | "moon" | "ghost" | "robot";

export interface PlayerProfile {
  id: string;
  name: string;
  color: PlayerColor;
  avatar: PlayerAvatar;
  wins: number;
  gamesPlayed: number;
}

export interface ControllerSlot {
  id: string;
  label: string;
  connected: boolean;
  playerId?: string;
}

export interface GameDefinition {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
}
