import { useEffect, useMemo, useState } from "react";
import type { PlayerAvatar, PlayerColor, PlayerProfile } from "./core/types";
import { hardwareBridge, type HardwareDeck } from "./core/controllers";
import { loadPlayers, savePlayers } from "./core/storage";
import { games } from "./games/registry";
import { resolveRound, SNACKS, type Snack } from "./games/moon-munch/game";

type Screen = "lobby" | "menu" | "moon-munch";
type ChoiceMap = Record<string, Snack | undefined>;

const COLORS: PlayerColor[] = ["violet", "cyan", "lime", "yellow", "pink", "blue"];
const COLOR_HEX: Record<PlayerColor, string> = {
  violet: "#9b5cff",
  cyan: "#1ee8ff",
  lime: "#a8ff3e",
  yellow: "#ffe44a",
  pink: "#ff5cb8",
  blue: "#4b79ff"
};

const AVATARS: { id: PlayerAvatar; glyph: string }[] = [
  { id: "cat", glyph: "🐈" },
  { id: "fox", glyph: "🦊" },
  { id: "frog", glyph: "🐸" },
  { id: "moon", glyph: "🌙" },
  { id: "ghost", glyph: "👻" },
  { id: "robot", glyph: "🤖" }
];

function App() {
  const [players, setPlayers] = useState<PlayerProfile[]>(loadPlayers);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [screen, setScreen] = useState<Screen>("lobby");
  const [editing, setEditing] = useState<string | null>(null);
  const [hardwareDecks, setHardwareDecks] = useState<HardwareDeck[]>([]);

  useEffect(() => savePlayers(players), [players]);

  useEffect(
    () =>
      hardwareBridge.subscribe((event) => {
        if (event.type === "status") setHardwareDecks(event.decks);
      }),
    []
  );

  const selectedPlayers = useMemo(
    () => selectedIds.map((id) => players.find((p) => p.id === id)).filter(Boolean) as PlayerProfile[],
    [selectedIds, players]
  );

  useEffect(() => {
    if (screen !== "lobby") return;
    hardwareBridge.send({
      type: "lobby",
      players: selectedPlayers.map((player) => ({
        name: player.name,
        color: COLOR_HEX[player.color]
      }))
    });
  }, [screen, selectedPlayers]);

  function togglePlayer(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : current.length < 2 ? [...current, id] : current
    );
  }

  function updatePlayer(id: string, patch: Partial<PlayerProfile>) {
    setPlayers((current) => current.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  if (screen === "moon-munch" && selectedPlayers.length === 2) {
    return <MoonMunch players={selectedPlayers} onExit={() => setScreen("menu")} />;
  }

  return (
    <main className="shell">
      <header className="brand">
        <div className="brand-mark">✦</div>
        <div>
          <p className="eyebrow">THE</p>
          <h1>IMAGINATION MACHINE</h1>
          <p className="tagline">INSERT HUMANS · MAKE MISCHIEF</p>
        </div>
      </header>

      {screen === "lobby" && (
        <section className="panel">
          <div className="panel-title-row">
            <div>
              <p className="step">01</p>
              <h2>CHOOSE PLAYERS</h2>
            </div>
            <p className="hint">PICK TWO FOR V0.1</p>
          </div>

          <div className="player-grid">
            {players.map((player) => {
              const selected = selectedIds.includes(player.id);
              return (
                <article className={`player-card theme-${player.color} ${selected ? "selected" : ""}`} key={player.id}>
                  <button className="player-main" onClick={() => togglePlayer(player.id)}>
                    <span className="pixel-avatar">{AVATARS.find((a) => a.id === player.avatar)?.glyph}</span>
                    <strong>{player.name.toUpperCase()}</strong>
                    <span className="tiny">{selected ? "READY!" : "PRESS TO JOIN"}</span>
                  </button>
                  <button className="edit-button" onClick={() => setEditing(editing === player.id ? null : player.id)}>
                    CUSTOMIZE
                  </button>
                  {editing === player.id && (
                    <div className="customizer">
                      <div className="swatches">
                        {COLORS.map((color) => (
                          <button
                            aria-label={color}
                            className={`swatch theme-${color} ${player.color === color ? "active" : ""}`}
                            onClick={() => updatePlayer(player.id, { color })}
                            key={color}
                          />
                        ))}
                      </div>
                      <div className="avatar-row">
                        {AVATARS.map((avatar) => (
                          <button
                            className={player.avatar === avatar.id ? "avatar-choice active" : "avatar-choice"}
                            onClick={() => updatePlayer(player.id, { avatar: avatar.id })}
                            key={avatar.id}
                          >
                            {avatar.glyph}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <div className="controller-rack">
            {[0, 1].map((index) => {
              const deck = hardwareDecks[index];
              return (
                <div className="controller-chip" key={index}>
                  <span className={deck ? "status-dot" : "status-dot offline"} />
                  DECK {index + 1} · {deck ? selectedPlayers[index]?.name?.toUpperCase() ?? "CONNECTED" : "OFFLINE"}
                </div>
              );
            })}
          </div>

          <button className="primary" disabled={selectedIds.length !== 2} onClick={() => setScreen("menu")}>
            ENTER MACHINE →
          </button>
        </section>
      )}

      {screen === "menu" && (
        <section className="panel">
          <button className="back" onClick={() => setScreen("lobby")}>← PLAYERS</button>
          <p className="step">02</p>
          <h2>CHOOSE A GAME</h2>
          <div className="game-grid">
            {games.map((game) => (
              <button className="game-card" onClick={() => setScreen(game.id as Screen)} key={game.id}>
                <span className="moon-face">☾</span>
                <strong>{game.title.toUpperCase()}</strong>
                <span>{game.description}</span>
              </button>
            ))}
            <div className="game-card locked">
              <span>?</span>
              <strong>MORE SOON</strong>
              <span>Games plug in here as modules.</span>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function MoonMunch({ players, onExit }: { players: PlayerProfile[]; onExit: () => void }) {
  const [round, setRound] = useState(1);
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [choices, setChoices] = useState<ChoiceMap>({});
  const [result, setResult] = useState<string>("PICK A SECRET SNACK.");
  const ready = players.every((p) => choices[p.id]);

  function choose(playerId: string, snack: Snack) {
    setChoices((current) => {
      if (current[playerId]) return current;
      return { ...current, [playerId]: snack };
    });
  }

  useEffect(
    () =>
      hardwareBridge.subscribe((event) => {
        if (event.type !== "key") return;
        if (event.deckIndex < 0 || event.deckIndex >= players.length) return;
        if (event.keyIndex < 0 || event.keyIndex >= SNACKS.length) return;

        const player = players[event.deckIndex];
        choose(player.id, SNACKS[event.keyIndex]);
      }),
    [players]
  );

  useEffect(() => {
    hardwareBridge.send({
      type: "moon-munch",
      players: players.map((player) => ({
        name: player.name,
        color: COLOR_HEX[player.color],
        choiceIndex: choices[player.id] ? SNACKS.findIndex((snack) => snack.id === choices[player.id]?.id) : null
      }))
    });
  }, [players, choices, round]);

  function reveal() {
    const a = choices[players[0].id]!;
    const b = choices[players[1].id]!;
    const resolved = resolveRound(a, b, round);
    setScore(([x, y]) => [x + resolved.points[0], y + resolved.points[1]]);
    setResult(`${a.icon} + ${b.icon} · ${resolved.message}`);
  }

  function nextRound() {
    setRound((r) => r + 1);
    setChoices({});
    setResult("PICK A SECRET SNACK.");
  }

  return (
    <main className="shell game-shell">
      <button className="back" onClick={onExit}>← GAMES</button>
      <section className="moon-stage">
        <p className="step">ROUND {String(round).padStart(2, "0")}</p>
        <div className="giant-moon">☾<span className="mouth">◡</span></div>
        <h2>MOON MUNCH</h2>
        <p className="result">{result}</p>
        <div className="scores">
          {players.map((p, i) => (
            <div className={`score-card theme-${p.color}`} key={p.id}>
              <span>{p.name.toUpperCase()}</span>
              <strong>{score[i]}</strong>
            </div>
          ))}
        </div>
        {ready ? (
          result === "PICK A SECRET SNACK." ? (
            <button className="primary" onClick={reveal}>REVEAL! ✦</button>
          ) : (
            <button className="primary" onClick={nextRound}>NEXT ROUND →</button>
          )
        ) : (
          <p className="waiting">WAITING FOR BOTH PLAYERS...</p>
        )}
      </section>

      <section className="simulators">
        {players.map((player, playerIndex) => (
          <div className={`deck theme-${player.color}`} key={player.id}>
            <div className="deck-top">
              <span>{player.name.toUpperCase()}</span>
              <span>PRIVATE HAND</span>
            </div>
            <div className="deck-buttons">
              {SNACKS.map((snack) => {
                const chosen = choices[player.id]?.id === snack.id;
                const locked = Boolean(choices[player.id]) && !chosen;
                return (
                  <button
                    className={chosen ? "deck-key chosen" : "deck-key"}
                    disabled={locked}
                    onClick={() => choose(player.id, snack)}
                    key={snack.id}
                  >
                    <span>{snack.icon}</span>
                    <small>{snack.label}</small>
                  </button>
                );
              })}
              <button className="deck-key utility" disabled>BACK</button>
              <button className="deck-key utility" disabled>READY</button>
            </div>
            <div className="touch-strip">
              <span>DECK {playerIndex + 1}</span>
              <span>{choices[player.id] ? "LOCKED IN" : "CHOOSE ONE"}</span>
            </div>
            <div className="dials">
              <i /><i /><i /><i />
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}

export default App;
