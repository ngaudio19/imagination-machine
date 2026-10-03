import { useEffect, useMemo, useRef, useState } from "react";
import type { PlayerProfile } from "../../core/types";
import { hardwareBridge } from "../../core/controllers";
import {
  fuelForAnswer,
  PLANETS,
  PLANET_QUESTIONS,
  PLANET_TRIVIA_SECONDS
} from "./game";

const COLOR_HEX: Record<PlayerProfile["color"], string> = {
  violet: "#9b5cff",
  cyan: "#1ee8ff",
  lime: "#a8ff3e",
  yellow: "#ffe44a",
  pink: "#ff5cb8",
  blue: "#4b79ff"
};

type Phase = "question" | "reveal" | "finish";

export function PlanetTrivia({ players, onExit }: { players: PlayerProfile[]; onExit: () => void }) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("question");
  const [secondsLeft, setSecondsLeft] = useState(PLANET_TRIVIA_SECONDS);
  const [answers, setAnswers] = useState<Array<number | null>>([null, null]);
  const [answerTimes, setAnswerTimes] = useState<Array<number | null>>([null, null]);
  const [fuel, setFuel] = useState<[number, number]>([0, 0]);
  const [earned, setEarned] = useState<[number, number]>([0, 0]);
  const startedAtRef = useRef(performance.now());
  const resolvingRef = useRef(false);
  const answersRef = useRef<Array<number | null>>([null, null]);
  const answerTimesRef = useRef<Array<number | null>>([null, null]);

  const question = PLANET_QUESTIONS[questionIndex];
  const correctIndex = useMemo(
    () => PLANETS.findIndex((planet) => planet.id === question.answer),
    [question]
  );
  const bothAnswered = answers.every((answer) => answer !== null);
  const maxFuel = PLANET_QUESTIONS.length * 3;

  function resetQuestion(nextIndex: number) {
    resolvingRef.current = false;
    answersRef.current = [null, null];
    answerTimesRef.current = [null, null];
    setAnswers([null, null]);
    setAnswerTimes([null, null]);
    setEarned([0, 0]);
    setSecondsLeft(PLANET_TRIVIA_SECONDS);
    setQuestionIndex(nextIndex);
    setPhase("question");
    startedAtRef.current = performance.now();
  }

  function restart() {
    setFuel([0, 0]);
    resetQuestion(0);
  }

  function submitAnswer(deckIndex: number, planetIndex: number) {
    if (phase !== "question" || answersRef.current[deckIndex] !== null) return;

    const elapsed = performance.now() - startedAtRef.current;
    const nextAnswers = [...answersRef.current];
    const nextTimes = [...answerTimesRef.current];
    nextAnswers[deckIndex] = planetIndex;
    nextTimes[deckIndex] = elapsed;
    answersRef.current = nextAnswers;
    answerTimesRef.current = nextTimes;
    setAnswers(nextAnswers);
    setAnswerTimes(nextTimes);
  }

  function reveal() {
    if (resolvingRef.current || phase !== "question") return;
    resolvingRef.current = true;

    const gains = answersRef.current.map((answer, index) =>
      fuelForAnswer(
        answerTimesRef.current[index] ?? PLANET_TRIVIA_SECONDS * 1000,
        answer === correctIndex
      )
    ) as [number, number];

    setEarned(gains);
    setFuel(([a, b]) => [a + gains[0], b + gains[1]]);
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

        if (phase !== "question") return;
        if (event.deckIndex < 0 || event.deckIndex > 1) return;
        if (event.keyIndex < 0 || event.keyIndex >= PLANETS.length) return;
        submitAnswer(event.deckIndex, event.keyIndex);
      }),
    [phase, onExit, correctIndex]
  );

  useEffect(() => {
    if (phase !== "question") return;
    if (secondsLeft <= 0) {
      reveal();
      return;
    }

    const timer = window.setTimeout(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [phase, secondsLeft, correctIndex]);

  useEffect(() => {
    if (!bothAnswered || phase !== "question") return;
    const timer = window.setTimeout(reveal, 500);
    return () => window.clearTimeout(timer);
  }, [bothAnswered, phase, correctIndex]);

  useEffect(() => {
    if (phase !== "reveal") return;
    const timer = window.setTimeout(() => {
      if (questionIndex >= PLANET_QUESTIONS.length - 1) {
        setPhase("finish");
      } else {
        resetQuestion(questionIndex + 1);
      }
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [phase, questionIndex]);

  useEffect(() => {
    hardwareBridge.send({
      type: "planet-trivia",
      phase,
      question: question.prompt,
      secondsLeft,
      correctIndex: phase === "question" ? null : correctIndex,
      players: players.map((player, index) => ({
        name: player.name,
        color: COLOR_HEX[player.color],
        answerIndex: answers[index],
        fuel: fuel[index],
        maxFuel
      }))
    });
  }, [phase, question, secondsLeft, correctIndex, players, answers, fuel, maxFuel]);

  const winnerText =
    fuel[0] === fuel[1]
      ? "PHOTO FINISH! IT'S A TIE!"
      : `${players[fuel[0] > fuel[1] ? 0 : 1].name.toUpperCase()} REACHED DEEP SPACE FIRST!`;

  return (
    <main className="shell game-shell planet-game">
      <section className="arcade-stage space-stage">
        <div className="stars" />
        <div className="game-hud">
          <span>PLANET TRIVIA</span>
          <span>QUESTION {questionIndex + 1}/{PLANET_QUESTIONS.length}</span>
          <span className={secondsLeft <= 3 && phase === "question" ? "timer danger" : "timer"}>
            {phase === "question" ? `${secondsLeft}s` : phase === "reveal" ? "ANSWER!" : "FINISH"}
          </span>
        </div>

        {phase === "finish" ? (
          <div className="trivia-card finish-card">
            <span className="pixel-rocket big">▲</span>
            <h2>{winnerText}</h2>
            <p>PRESS KEY 7 TO RACE AGAIN · KEY 8 FOR GAMES</p>
          </div>
        ) : (
          <div className="trivia-card">
            <p className="step">MISSION CONTROL ASKS:</p>
            <h2>{question.prompt}</h2>
            {phase === "reveal" && (
              <>
                <div className={`planet-large planet-${question.answer}`}>
                  <i className="planet-ring" />
                </div>
                <strong className="correct-answer">
                  {PLANETS[correctIndex].label}! 
                </strong>
                <p className="fact">{question.fact}</p>
              </>
            )}
          </div>
        )}

        <div className="rocket-race">
          {players.map((player, index) => (
            <div className={`rocket-lane theme-${player.color}`} key={player.id}>
              <div className="lane-label">
                <span>{player.name.toUpperCase()}</span>
                <strong>{fuel[index]} FUEL</strong>
              </div>
              <div className="space-track">
                <div
                  className="rocket"
                  style={{ left: `calc(${Math.min(1, fuel[index] / maxFuel) * 100}% - 20px)` }}
                >
                  ▲
                </div>
                <div className="fuel-fill" style={{ width: `${Math.min(100, (fuel[index] / maxFuel) * 100)}%` }} />
              </div>
              <small>
                {phase === "question"
                  ? answers[index] !== null ? "ANSWER LOCKED!" : "CHOOSE A PLANET"
                  : `+${earned[index]} FUEL`}
              </small>
            </div>
          ))}
        </div>

        {phase === "question" && (
          <div className="countdown-track">
            <div style={{ width: `${(secondsLeft / PLANET_TRIVIA_SECONDS) * 100}%` }} />
          </div>
        )}
      </section>
    </main>
  );
}
