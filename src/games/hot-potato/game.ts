export const HOT_POTATO_ROUNDS = 5;

export function nextPotatoButton(previous = -1): number {
  let next = Math.floor(Math.random() * 8);
  if (next === previous) next = (next + 3) % 8;
  return next;
}

export function nextFuseMs(round: number): number {
  const base = Math.max(3600, 6500 - round * 350);
  return base + Math.floor(Math.random() * 1800);
}
