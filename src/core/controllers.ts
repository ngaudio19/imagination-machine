import type { ControllerSlot } from "./types";

export const INITIAL_CONTROLLERS: ControllerSlot[] = [
  { id: "deck-a", label: "DECK A", connected: true },
  { id: "deck-b", label: "DECK B", connected: true }
];

export type ControllerAction =
  | { type: "CARD"; controllerId: string; cardIndex: number }
  | { type: "JOIN"; controllerId: string }
  | { type: "BACK"; controllerId: string };

export type ControllerListener = (action: ControllerAction) => void;

export class ControllerBus {
  private listeners = new Set<ControllerListener>();

  subscribe(listener: ControllerListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(action: ControllerAction) {
    for (const listener of this.listeners) listener(action);
  }
}

export const controllerBus = new ControllerBus();
