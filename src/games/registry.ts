import type { GameDefinition } from "../core/types";

export const games: GameDefinition[] = [
  {
    id: "moon-munch",
    title: "Moon Munch",
    shortTitle: "MUNCH",
    description: "Read the monster's craving. Feed it fast.",
    minPlayers: 2,
    maxPlayers: 2
  },
  {
    id: "planet-trivia",
    title: "Planet Trivia",
    shortTitle: "PLANETS",
    description: "Answer fast. Turn knowledge into rocket fuel.",
    minPlayers: 2,
    maxPlayers: 2
  },
  {
    id: "safecracker",
    title: "Safecracker",
    shortTitle: "SAFE",
    description: "Work together. Spin the dials. Crack the vault.",
    minPlayers: 2,
    maxPlayers: 2
  },
  {
    id: "hot-potato",
    title: "Hot Potato",
    shortTitle: "POTATO",
    description: "Find it. Smack it. Toss it before it blows.",
    minPlayers: 2,
    maxPlayers: 2
  }
];
