import { useEffect, useMemo, useState } from "react";
import type { PlayerAvatar, PlayerColor, PlayerProfile } from "./core/types";
import { hardwareBridge, type HardwareDeck } from "./core/controllers";
import { loadPlayers, savePlayers } from "./core/storage";
import { games } from "./games/registry";
import { MoonMunch } from "./games/moon-munch/MoonMunch";
import { PlanetTrivia } from "./games/planet-trivia/PlanetTrivia";

type Screen = "lobby" | "menu" | "moon-munch" | "planet-trivia";

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
    if (screen === "lobby") {
      hardwareBridge.send({
        type: "lobby",
        players: selectedPlayers.map((player) => ({
          name: player.name,
          color: COLOR_HEX[player.color]
        }))
      });
    }

    if (screen === "menu") {
      hardwareBridge.send({
        type: "menu",
        players: selectedPlayers.map((player) => ({
          name: player.name,
          color: COLOR_HEX[player.color]
        }))
      });
    }
  }, [screen, selectedPlayers]);

  useEffect(() => {
    if (screen !== "menu") return;

    return hardwareBridge.subscribe((event) => {
      if (event.type !== "key") return;
      if (event.keyIndex === 0) setScreen("moon-munch");
      if (event.keyIndex === 1) setScreen("planet-trivia");
    });
  }, [screen]);

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

  if (screen === "planet-trivia" && selectedPlayers.length === 2) {
    return <PlanetTrivia players={selectedPlayers} onExit={() => setScreen("menu")} />;
  }

  return (
    <main className="shell">
      <header className="brand">
        <div className="brand-mark">✦</div>
        <div>
          <p className="eyebrow">THE</p>
          <h1>IMAGINATION MACHINE</h1>
          <p className="tagline">INSERT HUMANS · MAKE MISCHIEF · BUILD 0.2</p>
        </div>
      </header>

      {screen === "lobby" && (
        <section className="panel">
          <div className="panel-title-row">
            <div>
              <p className="step">01</p>
              <h2>CHOOSE PLAYERS</h2>
            </div>
            <p className="hint">PICK TWO</p>
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
          <p className="menu-help">USE THE MAC OR PRESS GAME 1 / GAME 2 ON EITHER DECK.</p>
          <div className="game-grid">
            {games.map((game, index) => (
              <button className={`game-card game-card-${game.id}`} onClick={() => setScreen(game.id as Screen)} key={game.id}>
                <span className="game-number">GAME {index + 1}</span>
                <span className={game.id === "moon-munch" ? "moon-face" : "planet-menu-icon"}>{game.id === "moon-munch" ? "☾" : "●"}</span>
                <strong>{game.title.toUpperCase()}</strong>
                <span>{game.description}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
