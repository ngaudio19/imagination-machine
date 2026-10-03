export type PlanetId =
  | "mercury"
  | "venus"
  | "earth"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune";

export interface Planet {
  id: PlanetId;
  label: string;
  color: string;
  accent: string;
  hasRing?: boolean;
}

export interface PlanetQuestion {
  prompt: string;
  answer: PlanetId;
  fact: string;
}

export const PLANETS: Planet[] = [
  { id: "mercury", label: "MERCURY", color: "#a9a9a9", accent: "#dedede" },
  { id: "venus", label: "VENUS", color: "#e8a84f", accent: "#ffd078" },
  { id: "earth", label: "EARTH", color: "#2f8fff", accent: "#64d477" },
  { id: "mars", label: "MARS", color: "#d55338", accent: "#ff8c66" },
  { id: "jupiter", label: "JUPITER", color: "#d8ad82", accent: "#f0d2a8" },
  { id: "saturn", label: "SATURN", color: "#e7cf82", accent: "#fff0a9", hasRing: true },
  { id: "uranus", label: "URANUS", color: "#80e1e8", accent: "#b8f7f7", hasRing: true },
  { id: "neptune", label: "NEPTUNE", color: "#4267e8", accent: "#7193ff" }
];

export const PLANET_QUESTIONS: PlanetQuestion[] = [
  { prompt: "WHICH PLANET IS KNOWN AS THE RED PLANET?", answer: "mars", fact: "MARS LOOKS RED BECAUSE ITS SOIL CONTAINS RUSTY IRON." },
  { prompt: "WHICH PLANET IS THE BIGGEST?", answer: "jupiter", fact: "JUPITER IS SO BIG THAT MORE THAN 1,300 EARTHS COULD FIT INSIDE IT." },
  { prompt: "WHICH PLANET IS CLOSEST TO THE SUN?", answer: "mercury", fact: "MERCURY ZIPS AROUND THE SUN IN ONLY 88 EARTH DAYS." },
  { prompt: "WHICH PLANET HAS THE MOST FAMOUS RINGS?", answer: "saturn", fact: "SATURN'S RINGS ARE MOSTLY ICE, ROCK, AND DUST." },
  { prompt: "WHICH PLANET DO WE LIVE ON?", answer: "earth", fact: "EARTH IS THE ONLY WORLD WE KNOW WITH LIFE." },
  { prompt: "WHICH PLANET HAS THE GREAT RED SPOT?", answer: "jupiter", fact: "THE GREAT RED SPOT IS A GIANT STORM BIGGER THAN EARTH." },
  { prompt: "WHICH PLANET IS THE HOTTEST?", answer: "venus", fact: "VENUS IS HOTTER THAN MERCURY BECAUSE ITS THICK ATMOSPHERE TRAPS HEAT." },
  { prompt: "WHICH PLANET SPINS ALMOST ON ITS SIDE?", answer: "uranus", fact: "URANUS IS TILTED ABOUT 98 DEGREES, SO IT PRACTICALLY ROLLS AROUND THE SUN." },
  { prompt: "WHICH PLANET HAS THE FASTEST WINDS?", answer: "neptune", fact: "NEPTUNE'S WINDS CAN BLOW FASTER THAN 1,200 MILES PER HOUR." },
  { prompt: "WHICH PLANET HAS OLYMPUS MONS, A GIANT VOLCANO?", answer: "mars", fact: "OLYMPUS MONS IS THE LARGEST KNOWN VOLCANO IN THE SOLAR SYSTEM." }
];

export const PLANET_TRIVIA_SECONDS = 8;

export function fuelForAnswer(elapsedMs: number, correct: boolean): number {
  if (!correct) return 0;
  if (elapsedMs <= 2000) return 3;
  if (elapsedMs <= 4000) return 2;
  return 1;
}
