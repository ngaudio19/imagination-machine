import { useEffect, useMemo, useRef, useState } from "react";
import type { PlayerProfile } from "../../core/types";
import { hardwareBridge } from "../../core/controllers";
import { audioEngine } from "../../core/audio";
import { MoonMonster } from "../../components/MoonMonster";
import {
  getMoonHint,
  monsterReaction,
  MOON_MUNCH_ROUNDS,
  MOON_MUNCH_SECONDS,
  scoreSnack,
  SNACKS,
  type Snack
} from "./game";

const COLOR_HEX: Record<PlayerProfile["color"], string> = {
  violet: "#9b5cff",
  cyan: "#1ee8ff",
  lime: "#a8ff3e",
  yellow: "#ffe44a",
  pink: "#ff5cb8",
  blue: "#4b79ff"
};

type Phase = "choose" | "reveal" | "finish";
type Choices = Array<Snack | undefined>;

export function MoonMunch({ players, onExit }: { players: PlayerProfile[]; onExit: () => void }) {
  const [round, setRound] = useState(1);
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [choices, setChoices] = useState<Choices>([undefined, undefined]);
  const [secondsLeft, setSecondsLeft] = useState(MOON_MUNCH_SECONDS);
  const [phase, setPhase] = useState<Phase>("choose");
  const [result, setResult] = useState("LISTEN TO THE MONSTER...");
  const resolvingRef = useRef(false);

  const hint = useMemo(() => getMoonHint(round), [round]);
  const bothReady = Boolean(choices[0] && choices[1]);

  function restart() {
    resolvingRef.current = false;
    setRound(1);
    setScore([0, 0]);
    setChoices([undefined, undefined]);
    setSecondsLeft(MOON_MUNCH_SECONDS);
    setPhase("choose");
    setResult("LISTEN TO THE MONSTER...");
  }

  function choose(deckIndex: number, snack: Snack) {
    if (phase !== "choose") return;
    setChoices((current) => {
      if (current[deckIndex]) return current;
      audioEngine.play("select");
      const next = [...current];
      next[deckIndex] = snack;
      return next;
    });
  }

  function resolveRound() {
    if (resolvingRef.current || phase !== "choose") return;
    resolvingRef.current = true;

    const pointsA = scoreSnack(choices[0], hint);
    const pointsB = scoreSnack(choices[1], hint);
    setScore(([a, b]) => [a + pointsA, b + pointsB]);
    setResult(monsterReaction(choices, hint));
    audioEngine.play("munch");
    setPhase("reveal");
  }

  useEffect(
    () =>
      hardwareBridge.subscribe((event) => {
        if (event.type !== "key") return;

        if (phase === "finish") {
          if (event.keyIndex === 6) restart();
          if (event.keyIndex === 7) onExit();
          return;
        }

        if (phase !== "choose") return;
        if (event.deckIndex < 0 || event.deckIndex > 1) return;
        if (event.keyIndex < 0 || event.keyIndex >= SNACKS.length) return;
        choose(event.deckIndex, SNACKS[event.keyIndex]);
      }),
    [phase, onExit]
  );

  useEffect(() => {
    if (phase !== "choose") return;
    if (secondsLeft <= 0) {
      resolveRound();
      return;
    }

    const timer = window.setTimeout(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [phase, secondsLeft, choices, hint]);

  useEffect(() => {
    if (!bothReady || phase !== "choose") return;
    const timer = window.setTimeout(resolveRound, 650);
    return () => window.clearTimeout(timer);
  }, [bothReady, phase, choices, hint]);

  useEffect(() => {
    if (phase !== "reveal") return;
    const timer = window.setTimeout(() => {
      if (round >= MOON_MUNCH_ROUNDS) {
        audioEngine.play("win");
        setPhase("finish");
        return;
      }

      resolvingRef.current = false;
      setRound((value) => value + 1);
      setChoices([undefined, undefined]);
      setSecondsLeft(MOON_MUNCH_SECONDS);
      setResult("LISTEN TO THE MONSTER...");
      setPhase("choose");
    }, 2800);

    return () => window.clearTimeout(timer);
  }, [phase, round]);

  useEffect(() => {
    hardwareBridge.send({
      type: "moon-munch",
      phase,
      round,
      secondsLeft,
      hint: hint.line,
      players: players.map((player, index) => ({
        name: player.name,
        color: COLOR_HEX[player.color],
        choiceIndex: choices[index] ? SNACKS.findIndex((snack) => snack.id === choices[index]?.id) : null,
        score: score[index]
      }))
    });
  }, [phase, round, secondsLeft, hint, choices, players, score]);

  const leaderText =
    score[0] === score[1]
      ? "IT'S A TIE!"
      : `${players[score[0] > score[1] ? 0 : 1].name.toUpperCase()} FED THE MOON BEST!`;

  return (
    <main className="shell game-shell moon-game">
      <section className="arcade-stage">
        <div className="game-hud">
          <span>MOON MUNCH</span>
          <span>ROUND {Math.min(round, MOON_MUNCH_ROUNDS)}/{MOON_MUNCH_ROUNDS}</span>
          <span className={secondsLeft <= 3 && phase === "choose" ? "timer danger" : "timer"}>
            {phase === "choose" ? `${secondsLeft}s` : phase === "reveal" ? "MUNCH!" : "FINISH"}
          </span>
        </div>

        <MoonMonster chomping={phase === "reveal"} />

        {phase === "finish" ? (
          <div className="monster-speech final-speech">
            <strong>BURRRRP!</strong>
            <span>{leaderText}</span>
            <small>PRESS KEY 7 TO PLAY AGAIN · KEY 8 FOR GAMES</small>
          </div>
        ) : (
          <div className="monster-speech">
            <strong>{phase === "choose" ? "I'M HUNGRY!" : result}</strong>
            <span>{phase === "choose" ? hint.line : "LOOK WHAT YOU FED ME!"}</span>
          </div>
        )}

        {phase === "reveal" && (
          <div className="snack-reveal">
            {choices.map((snack, index) => (
              <div className="reveal-card" style={{ borderColor: snack?.color ?? "#444" }} key={index}>
                <span className={`pixel-snack pixel-snack-${snack?.id ?? "none"}`} />
                <strong>{snack?.label ?? "TOO SLOW"}</strong>
                <small>{snack ? `+${scoreSnack(snack, hint)}` : "+0"}</small>
              </div>
            ))}
          </div>
        )}

        <div className="scores">
          {players.map((player, index) => (
            <div className={`score-card theme-${player.color}`} key={player.id}>
              <span>{player.name.toUpperCase()}</span>
              <strong>{score[index]}</strong>
              <small>{phase === "choose" ? (choices[index] ? "LOCKED!" : "CHOOSING...") : "POINTS"}</small>
            </div>
          ))}
        </div>

        {phase === "choose" && (
          <div className="countdown-track">
            <div style={{ width: `${(secondsLeft / MOON_MUNCH_SECONDS) * 100}%` }} />
          </div>
        )}
      </section>
    </main>
  );
}
