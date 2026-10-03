export const SAFE_ROUNDS = 5;
export const SAFE_SECONDS = 20;

export function makeCombination(round: number): [number, number, number, number] {
  const seed = round * 7919 + 104729;
  const digits = [0, 1, 2, 3].map((index) => {
    const value = Math.abs(Math.sin(seed * (index + 1)) * 10000);
    return Math.floor(value) % 10;
  }) as [number, number, number, number];

  return digits;
}

export function clampDial(value: number): number {
  return ((value % 10) + 10) % 10;
}
