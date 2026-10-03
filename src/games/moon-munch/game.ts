export type SnackId = "pizza" | "pickle" | "donut" | "fish" | "boot" | "star";
export type Flavor = "sweet" | "salty" | "weird";

export interface Snack {
  id: SnackId;
  label: string;
  flavor: Flavor;
  color: string;
}

export interface MoonHint {
  flavor: Flavor;
  line: string;
}

export const SNACKS: Snack[] = [
  { id: "pizza", label: "PIZZA", flavor: "salty", color: "#ff5c35" },
  { id: "pickle", label: "PICKLE", flavor: "weird", color: "#7dff4a" },
  { id: "donut", label: "DONUT", flavor: "sweet", color: "#ff6cc7" },
  { id: "fish", label: "FISH", flavor: "salty", color: "#2ed7ff" },
  { id: "boot", label: "BOOT", flavor: "weird", color: "#d6a365" },
  { id: "star", label: "STAR", flavor: "sweet", color: "#ffe34e" }
];

export const MOON_HINTS: MoonHint[] = [
  { flavor: "sweet", line: "MY CRATERS WANT SOMETHING SWEET!" },
  { flavor: "salty", line: "I'M DREAMING OF SOMETHING SALTY!" },
  { flavor: "weird", line: "FEED ME SOMETHING REALLY WEIRD!" },
  { flavor: "sweet", line: "MY MOON TEETH WANT A SWEET TREAT!" },
  { flavor: "salty", line: "I WANT A SALTY SPACE SNACK!" },
  { flavor: "weird", line: "NORMAL FOOD IS BORING. GET WEIRD!" },
  { flavor: "sweet", line: "SUGAR! I CAN PRACTICALLY TASTE IT!" },
  { flavor: "salty", line: "SOMETHING SALTY WOULD HIT THE SPOT!" },
  { flavor: "weird", line: "SURPRISE ME WITH SOMETHING STRANGE!" },
  { flavor: "sweet", line: "FINAL BITE! MAKE IT SWEET!" }
];

export const MOON_MUNCH_ROUNDS = 10;
export const MOON_MUNCH_SECONDS = 8;

export function getMoonHint(round: number): MoonHint {
  return MOON_HINTS[(round - 1) % MOON_HINTS.length];
}

export function scoreSnack(snack: Snack | undefined, hint: MoonHint): number {
  if (!snack) return 0;
  return snack.flavor === hint.flavor ? 3 : 1;
}

export function monsterReaction(snacks: Array<Snack | undefined>, hint: MoonHint): string {
  const hits = snacks.filter((snack) => snack?.flavor === hint.flavor).length;
  if (hits === 2) return "YESSS! THAT'S EXACTLY WHAT I WANTED!";
  if (hits === 1) return "ONE OF THOSE REALLY HIT THE SPOT!";
  if (snacks.every(Boolean)) return "NOT MY CRAVING... BUT I'LL EAT ANYTHING.";
  return "I'M STILL HUNGRY!";
}
