import { useEffect, useRef, useState } from "react";
import type { PlayerProfile } from "../../core/types";
import { COLOR_HEX } from "../../core/avatars";
import { hardwareBridge } from "../../core/controllers";
import { audioEngine } from "../../core/audio";
import { HOT_POTATO_ROUNDS, nextFuseMs, nextPotatoButton } from "./game";

type Phase = "play" | "boom" | "finish";

export function HotPotato({ players, onExit }: { players: PlayerProfile[]; onExit: () => void }) {
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<Phase>("play");
  const [holderDeck, setHolderDeck] = useState(() => Math.floor(Math.random() * 2));
  const [hotButton, setHotButton] = useState(() => nextPotatoButton());
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const initialFuse = useRef(nextFuseMs(1));
  const [fuseMs, setFuseMs] = useState(initialFuse.current);
  const [remainingMs, setRemainingMs] = useState(initialFuse.current);
  const startRef = useRef(performance.now());
  const explodedRef = useRef(false);

  function startRound(nextRound: number) {
    const fuse = nextFuseMs(nextRound);
    explodedRef.current = false;
    setRound(nextRound);
    setPhase("play");
    setHolderDeck(Math.floor(Math.random() * 2));
    setHotButton(nextPotatoButton());
    setFuseMs(fuse);
    setRemainingMs(fuse);
    startRef.current = performance.now();
  }

  function restart() {
    setScores([0, 0]);
    startRound(1);
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

        if (phase !== "play") return;
        if (event.deckIndex !== holderDeck) return;
        if (event.keyIndex !== hotButton) return;

        audioEngine.play("toss");
        setHolderDeck((current) => (current === 0 ? 1 : 0));
        setHotButton((current) => nextPotatoButton(current));
      }),
    [phase, holderDeck, hotButton, onExit]
  );

  useEffect(() => {
    if (phase !== "play") return;

    const timer = window.setInterval(() => {
      const elapsed = performance.now() - startRef.current;
      const left = Math.max(0, fuseMs - elapsed);
      setRemainingMs(left);

      if (left <= 0 && !explodedRef.current) {
        explodedRef.current = true;
        const winner = holderDeck === 0 ? 1 : 0;
        audioEngine.play("boom");
        setScores((current) => {
          const next = [...current] as [number, number];
          next[winner] += 1;
          return next;
        });
        setPhase("boom");
      }
    }, 80);

    return () => window.clearInterval(timer);
  }, [phase, fuseMs, holderDeck]);

  useEffect(() => {
    if (phase !== "boom") return;

    const timer = window.setTimeout(() => {
      if (round >= HOT_POTATO_ROUNDS) {
        audioEngine.play("win");
        setPhase("finish");
      } else {
        startRound(round + 1);
      }
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [phase, round]);

  const fuseRatio = Math.max(0, Math.min(1, remainingMs / fuseMs));

  useEffect(() => {
    hardwareBridge.send({
      type: "hot-potato",
      phase,
      round,
      holderDeck,
      hotButton,
      fuseRatio,
      scores,
      players: players.map((player) => ({
        id: player.id,
        name: player.name,
        color: COLOR_HEX[player.color],
        avatar: player.avatar,
        accessory: player.accessory
      }))
    });
  }, [phase, round, holderDeck, hotButton, fuseRatio, scores, players]);

  const leader =
    scores[0] === scores[1] ? "TIE GAME!" : `${players[scores[0] > scores[1] ? 0 : 1].name.toUpperCase()} WINS!`;

  return (
    <main className="shell game-shell hot-potato-game">
      <section className={`arcade-stage potato-stage ${phase === "boom" ? "boom" : ""}`}>
        <div className="game-hud">
          <span>HOT POTATO</span>
          <span>ROUND {Math.min(round, HOT_POTATO_ROUNDS)}/{HOT_POTATO_ROUNDS}</span>
          <span className={fuseRatio < .3 && phase === "play" ? "timer danger" : "timer"}>
            {phase === "play" ? `${(remainingMs / 1000).toFixed(1)}s` : phase === "boom" ? "BOOM!" : "DONE"}
          </span>
        </div>

        <div className="potato-field">
          <div className={`big-potato ${phase === "play" ? "wiggle" : "explode"}`}>
            <i className="potato-eye one" />
            <i className="potato-eye two" />
            <i className="potato-mouth" />
            <i className="potato-fuse">
              <b style={{ opacity: Math.max(.2, 1 - fuseRatio) }} />
            </i>
          </div>
          <div className="potato-shadow" />
        </div>

        {phase === "play" && (
          <div className="potato-callout">
            <strong>{players[holderDeck].name.toUpperCase()} HAS IT!</strong>
            <span>FIND THE BURNING POTATO ON YOUR DECK AND SMACK IT.</span>
          </div>
        )}

        {phase === "boom" && (
          <div className="potato-callout exploded">
            <strong>KA-BOOM!</strong>
            <span>{players[holderDeck].name.toUpperCase()} WAS HOLDING IT.</span>
          </div>
        )}

        {phase === "finish" && (
          <div className="potato-callout final">
            <strong>{leader}</strong>
            <span>{scores[0]} – {scores[1]}</span>
            <small>KEY 7 = AGAIN · KEY 8 = GAMES</small>
          </div>
        )}

        <div className="potato-scores">
          {players.map((player, index) => (
            <div className={`score-card theme-${player.color}`} key={player.id}>
              <span>{player.name.toUpperCase()}</span>
              <strong>{scores[index]}</strong>
              <small>{holderDeck === index && phase === "play" ? "HOT!" : "SAFE"}</small>
            </div>
          ))}
        </div>

        {phase === "play" && (
          <div className="fuse-track"><div style={{ width: `${fuseRatio * 100}%` }} /></div>
        )}
      </section>
    </main>
  );
}
