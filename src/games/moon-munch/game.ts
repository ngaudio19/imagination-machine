export type SnackId = "pizza" | "pickle" | "donut" | "fish" | "boot" | "star";

export interface Snack {
  id: SnackId;
  label: string;
  icon: string;
  flavor: "sweet" | "salty" | "weird";
}

export const SNACKS: Snack[] = [
  { id: "pizza", label: "PIZZA", icon: "🍕", flavor: "salty" },
  { id: "pickle", label: "PICKLE", icon: "🥒", flavor: "weird" },
  { id: "donut", label: "DONUT", icon: "🍩", flavor: "sweet" },
  { id: "fish", label: "FISH", icon: "🐟", flavor: "salty" },
  { id: "boot", label: "BOOT", icon: "🥾", flavor: "weird" },
  { id: "star", label: "STAR", icon: "⭐", flavor: "sweet" }
];

export interface RoundResult {
  message: string;
  points: [number, number];
}

export function resolveRound(a: Snack, b: Snack, round: number): RoundResult {
  if (a.id === b.id) {
    return { message: `DOUBLE ${a.label}! THE MOON BURPS.`, points: [2, 2] };
  }

  if (a.flavor === b.flavor) {
    return { message: "A PERFECT FLAVOR COMBO!", points: [2, 2] };
  }

  const weirdBonus = round % 2 === 0;
  if (weirdBonus && a.flavor === "weird") return { message: "THE MOON WANTED WEIRD!", points: [3, 1] };
  if (weirdBonus && b.flavor === "weird") return { message: "THE MOON WANTED WEIRD!", points: [1, 3] };

  return { message: "CRUNCH! BOTH SNACKS VANISH.", points: [1, 1] };
}
