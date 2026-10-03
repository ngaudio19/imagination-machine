import { useEffect, useMemo, useRef, useState } from "react";
import type { PlayerProfile } from "../../core/types";
import { COLOR_HEX } from "../../core/avatars";
import { hardwareBridge } from "../../core/controllers";
import { audioEngine } from "../../core/audio";
import { clampDial, makeCombination, SAFE_ROUNDS, SAFE_SECONDS } from "./game";

type Phase = "cracking" | "open" | "failed" | "finish";

export function Safecracker({ players, onExit }: { players: PlayerProfile[]; onExit: () => void }) {
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<Phase>("cracking");
  const [secondsLeft, setSecondsLeft] = useState(SAFE_SECONDS);
  const [digits, setDigits] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [cracked, setCracked] = useState(0);
  const resolving = useRef(false);

  const target = useMemo(() => makeCombination(round), [round]);
  const locked = useMemo(
    () => digits.map((digit, index) => digit === target[index]) as [boolean, boolean, boolean, boolean],
    [digits, target]
  );
  const complete = locked.every(Boolean);

  function resetRound(nextRound: number) {
    resolving.current = false;
    setRound(nextRound);
    setDigits([0, 0, 0, 0]);
    setSecondsLeft(SAFE_SECONDS);
    setPhase("cracking");
  }

  function restart() {
    setCracked(0);
    resetRound(1);
  }

  useEffect(
    () =>
      hardwareBridge.subscribe((event) => {
        if (event.type === "key" && phase === "finish") {
          if (event.keyIndex === 6) restart();
          if (event.keyIndex === 7) onExit();
          return;
        }

        if (event.type !== "dial" || phase !== "cracking") return;

        const deckIndex = event.deckIndex;
        if (deckIndex < 0 || deckIndex > 1) return;

        const localDial = event.dialIndex;
        if (localDial < 0 || localDial > 1) return;

        const globalIndex = deckIndex === 0 ? localDial : localDial + 2;

        setDigits((current) => {
          if (current[globalIndex] === target[globalIndex]) return current;
          const next = [...current] as [number, number, number, number];
          next[globalIndex] = clampDial(next[globalIndex] + Math.sign(event.amount));
          audioEngine.play(next[globalIndex] === target[globalIndex] ? "lock" : "tick");
          return next;
        });
      }),
    [phase, onExit, target]
  );

  useEffect(() => {
    if (phase !== "cracking") return;

    if (complete && !resolving.current) {
      resolving.current = true;
      setCracked((value) => value + 1);
      audioEngine.play("vault");
      setPhase("open");
      return;
    }

    if (secondsLeft <= 0 && !resolving.current) {
      resolving.current = true;
      audioEngine.play("wrong");
      setPhase("failed");
      return;
    }

    const timer = window.setTimeout(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [phase, complete, secondsLeft]);

  useEffect(() => {
    if (phase !== "open" && phase !== "failed") return;

    const timer = window.setTimeout(() => {
      if (round >= SAFE_ROUNDS) {
        audioEngine.play("win");
        setPhase("finish");
      } else {
        resetRound(round + 1);
      }
    }, phase === "open" ? 2200 : 1800);

    return () => window.clearTimeout(timer);
  }, [phase, round]);

  useEffect(() => {
    hardwareBridge.send({
      type: "safecracker",
      phase,
      round,
      secondsLeft,
      target,
      digits,
      locked,
      safesCracked: cracked,
      players: players.map((player) => ({
        id: player.id,
        name: player.name,
        color: COLOR_HEX[player.color],
        avatar: player.avatar,
        accessory: player.accessory
      }))
    });
  }, [phase, round, secondsLeft, target, digits, locked, cracked, players]);

  return (
    <main className="shell game-shell safecracker-game">
      <section className="arcade-stage safe-stage">
        <div className="game-hud">
          <span>SAFECRACKER</span>
          <span>VAULT {Math.min(round, SAFE_ROUNDS)}/{SAFE_ROUNDS}</span>
          <span className={secondsLeft <= 5 && phase === "cracking" ? "timer danger" : "timer"}>
            {phase === "cracking" ? `${secondsLeft}s` : phase === "open" ? "OPEN!" : phase === "failed" ? "LOCKED" : "DONE"}
          </span>
        </div>

        <div className={`safe-machine ${phase === "open" ? "safe-open" : ""}`}>
          <div className="safe-door">
            <div className="safe-bolts"><i/><i/><i/><i/></div>
            <div className="safe-wheel"><span>✦</span></div>
            <div className="combination-row">
              {digits.map((digit, index) => (
                <div className={`safe-digit ${locked[index] ? "locked" : ""}`} key={index}>
                  <small>{index + 1}</small>
                  <strong>{digit}</strong>
                  <span>{locked[index] ? "CLICK!" : "SPIN"}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="safe-glow" />
        </div>

        <div className="safe-instructions">
          {phase === "cracking" && (
            <>
              <strong>CRACK THE CODE!</strong>
              <span>DECK 1: DIALS 1–2 · DECK 2: DIALS 1–2</span>
              <small>CORRECT NUMBERS LOCK WITH A CLICK.</small>
            </>
          )}
          {phase === "open" && <><strong>VAULT OPEN!</strong><span>THE TREASURE IS YOURS.</span></>}
          {phase === "failed" && <><strong>TIME!</strong><span>THE SAFE STAYS SHUT.</span></>}
          {phase === "finish" && (
            <>
              <strong>{cracked === SAFE_ROUNDS ? "MASTER SAFECRACKERS!" : "HEIST COMPLETE!"}</strong>
              <span>YOU CRACKED {cracked} OF {SAFE_ROUNDS} VAULTS.</span>
              <small>KEY 7 = AGAIN · KEY 8 = GAMES</small>
            </>
          )}
        </div>

        <div className="safe-score">SAFES CRACKED <strong>{cracked}</strong></div>
      </section>
    </main>
  );
}
