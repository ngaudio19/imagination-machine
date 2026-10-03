import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { PlayerAvatar, PlayerColor, PlayerProfile } from "./core/types";
import { hardwareBridge, type HardwareDeck } from "./core/controllers";
import { ACCESSORIES, AVATARS, COLOR_HEX, PLAYER_COLORS } from "./core/avatars";
import { loadPlayers, savePlayers } from "./core/storage";
import { games } from "./games/registry";
import { MoonMunch } from "./games/moon-munch/MoonMunch";
import { PlanetTrivia } from "./games/planet-trivia/PlanetTrivia";
import { PixelAvatar } from "./components/PixelAvatar";

type Screen = "lobby" | "builder" | "menu" | "moon-munch" | "planet-trivia";

type BuilderState = {
  deckIndex: number;
  playerId: string;
  stage: "species" | "color" | "accessory";
  page: number;
};

function App() {
  const [players, setPlayers] = useState<PlayerProfile[]>(loadPlayers);
  const [screen, setScreen] = useState<Screen>("lobby");
  const [hardwareDecks, setHardwareDecks] = useState<HardwareDeck[]>([]);
  const [lobbySelections, setLobbySelections] = useState<Array<string | null>>([null, null]);
  const [lobbyReady, setLobbyReady] = useState<[boolean, boolean]>([false, false]);
  const [builder, setBuilder] = useState<BuilderState | null>(null);

  useEffect(() => savePlayers(players), [players]);

  useEffect(
    () =>
      hardwareBridge.subscribe((event) => {
        if (event.type === "status") setHardwareDecks(event.decks);
      }),
    []
  );

  const selectedPlayers = useMemo(
    () =>
      lobbySelections
        .map((id) => players.find((player) => player.id === id))
        .filter(Boolean) as PlayerProfile[],
    [lobbySelections, players]
  );

  const deckProfiles = useMemo(
    () =>
      players.map((player) => ({
        id: player.id,
        name: player.name,
        color: COLOR_HEX[player.color],
        avatar: player.avatar,
        accessory: player.accessory
      })),
    [players]
  );

  function goHome() {
    setBuilder(null);
    setLobbyReady([false, false]);
    setScreen("lobby");
  }

  function goBack() {
    if (screen === "builder") {
      setBuilder(null);
      setScreen("lobby");
      return;
    }

    if (screen === "moon-munch" || screen === "planet-trivia") {
      setScreen("menu");
      return;
    }

    if (screen === "menu") {
      setLobbyReady([false, false]);
      setScreen("lobby");
    }
  }

  useEffect(
    () =>
      hardwareBridge.subscribe((event) => {
        if (event.type !== "dial-down") return;
        if (event.dialIndex === 0) goBack();
        if (event.dialIndex === 3) goHome();
      }),
    [screen]
  );

  useEffect(() => {
    if (screen === "lobby") {
      hardwareBridge.send({
        type: "lobby",
        profiles: deckProfiles,
        selections: lobbySelections,
        ready: lobbyReady
      });
    }

    if (screen === "builder" && builder) {
      const profile = players.find((player) => player.id === builder.playerId);
      if (!profile) return;

      hardwareBridge.send({
        type: "builder",
        activeDeck: builder.deckIndex,
        stage: builder.stage,
        page: builder.page,
        profile: {
          id: profile.id,
          name: profile.name,
          color: COLOR_HEX[profile.color],
          avatar: profile.avatar,
          accessory: profile.accessory
        }
      });
    }

    if (screen === "menu") {
      hardwareBridge.send({
        type: "menu",
        players: selectedPlayers.map((player) => ({
          id: player.id,
          name: player.name,
          color: COLOR_HEX[player.color],
          avatar: player.avatar,
          accessory: player.accessory
        }))
      });
    }
  }, [screen, deckProfiles, lobbySelections, lobbyReady, builder, players, selectedPlayers]);

  useEffect(() => {
    if (screen !== "lobby") return;

    return hardwareBridge.subscribe((event) => {
      if (event.type !== "key") return;
      if (event.deckIndex < 0 || event.deckIndex > 1) return;

      const deckIndex = event.deckIndex as 0 | 1;
      const otherIndex = deckIndex === 0 ? 1 : 0;

      if (event.keyIndex >= 0 && event.keyIndex < players.length) {
        if (lobbyReady[deckIndex]) return;

        const player = players[event.keyIndex];
        if (lobbySelections[otherIndex] === player.id) return;

        setLobbySelections((current) => {
          const next = [...current];
          next[deckIndex] = player.id;
          return next;
        });

        setLobbyReady((current) => {
          const next = [...current] as [boolean, boolean];
          next[deckIndex] = false;
          return next;
        });
        return;
      }

      if (event.keyIndex === 6) {
        const selectedId = lobbySelections[deckIndex];
        if (!selectedId || lobbyReady[deckIndex]) return;
        setBuilder({ deckIndex, playerId: selectedId, stage: "species", page: 0 });
        setScreen("builder");
        return;
      }

      if (event.keyIndex === 7) {
        if (!lobbySelections[deckIndex]) return;

        setLobbyReady((current) => {
          const next = [...current] as [boolean, boolean];
          next[deckIndex] = !next[deckIndex];
          return next;
        });
      }
    });
  }, [screen, players, lobbySelections, lobbyReady]);

  useEffect(() => {
    if (screen !== "lobby") return;
    if (!lobbyReady[0] || !lobbyReady[1]) return;
    if (!lobbySelections[0] || !lobbySelections[1]) return;
    if (lobbySelections[0] === lobbySelections[1]) return;

    const timer = window.setTimeout(() => setScreen("menu"), 450);
    return () => window.clearTimeout(timer);
  }, [screen, lobbyReady, lobbySelections]);

  useEffect(() => {
    if (screen !== "builder" || !builder) return;

    return hardwareBridge.subscribe((event) => {
      if (event.type !== "key") return;
      if (event.deckIndex !== builder.deckIndex) return;

      if (builder.stage === "species") {
        if (event.keyIndex >= 0 && event.keyIndex <= 5) {
          const avatar = AVATARS[builder.page * 6 + event.keyIndex];
          if (!avatar) return;
          updatePlayer(builder.playerId, { avatar: avatar.id });
          setBuilder((current) => current ? { ...current, stage: "color" } : current);
          return;
        }

        if (event.keyIndex === 6) {
          setBuilder((current) => current ? { ...current, page: Math.max(0, current.page - 1) } : current);
          return;
        }

        if (event.keyIndex === 7) {
          setBuilder((current) => current ? { ...current, page: Math.min(1, current.page + 1) } : current);
        }
        return;
      }

      if (builder.stage === "color") {
        if (event.keyIndex >= 0 && event.keyIndex < PLAYER_COLORS.length) {
          const color = PLAYER_COLORS[event.keyIndex];
          updatePlayer(builder.playerId, { color });
          setBuilder((current) => current ? { ...current, stage: "accessory" } : current);
        }
        return;
      }

      if (builder.stage === "accessory") {
        if (event.keyIndex >= 0 && event.keyIndex < ACCESSORIES.length) {
          const accessory = ACCESSORIES[event.keyIndex];
          updatePlayer(builder.playerId, { accessory: accessory.id });
          setBuilder(null);
          setLobbyReady((current) => {
            const next = [...current] as [boolean, boolean];
            next[builder.deckIndex as 0 | 1] = false;
            return next;
          });
          setScreen("lobby");
        }
      }
    });
  }, [screen, builder]);

  useEffect(() => {
    if (screen !== "menu") return;

    return hardwareBridge.subscribe((event) => {
      if (event.type !== "key") return;
      if (event.keyIndex === 0) setScreen("moon-munch");
      if (event.keyIndex === 1) setScreen("planet-trivia");
    });
  }, [screen]);

  function updatePlayer(id: string, patch: Partial<PlayerProfile>) {
    setPlayers((current) => current.map((player) => (player.id === id ? { ...player, ...patch } : player)));
  }

  function assignFromMac(playerId: string) {
    const firstOpen = lobbySelections[0] ? (lobbySelections[1] ? -1 : 1) : 0;
    if (firstOpen === -1) return;

    const otherIndex = firstOpen === 0 ? 1 : 0;
    if (lobbySelections[otherIndex] === playerId) return;

    setLobbySelections((current) => {
      const next = [...current];
      next[firstOpen] = playerId;
      return next;
    });
  }

  if (screen === "moon-munch" && selectedPlayers.length === 2) {
    return <MoonMunch players={selectedPlayers} onExit={() => setScreen("menu")} />;
  }

  if (screen === "planet-trivia" && selectedPlayers.length === 2) {
    return <PlanetTrivia players={selectedPlayers} onExit={() => setScreen("menu")} />;
  }

  if (screen === "builder" && builder) {
    const profile = players.find((player) => player.id === builder.playerId);
    if (!profile) return null;

    return (
      <main className="shell builder-shell">
        <header className="brand">
          <div className="brand-mark">✦</div>
          <div>
            <p className="eyebrow">CHARACTER BUILDER</p>
            <h1>{profile.name.toUpperCase()}</h1>
            <p className="tagline">CONTROLLED BY DECK {builder.deckIndex + 1}</p>
          </div>
        </header>

        <section className="panel builder-panel">
          <div className="builder-preview theme-preview" style={{ "--preview-color": COLOR_HEX[profile.color] } as CSSProperties}>
            <PixelAvatar
              avatar={profile.avatar}
              color={COLOR_HEX[profile.color]}
              accessory={profile.accessory}
              size={210}
            />
            <strong>{profile.name.toUpperCase()}</strong>
          </div>

          <div className="builder-copy">
            <p className="step">
              {builder.stage === "species" ? "01 · PICK A CREATURE" : builder.stage === "color" ? "02 · PICK A COLOR" : "03 · PICK AN ACCESSORY"}
            </p>
            <h2>
              {builder.stage === "species"
                ? builder.page === 0 ? "FIRST SIX CREATURES" : "SIX MORE CREATURES"
                : builder.stage === "color"
                  ? "MAKE IT YOURS"
                  : "FINISH THE LOOK"}
            </h2>
            <p className="builder-instruction">
              Use the pictures on your Stream Deck. The other player's Deck waits while you customize.
            </p>
            <p className="nav-hint">PRESS LEFT DIAL = BACK · PRESS RIGHT DIAL = HOME</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="brand">
        <div className="brand-mark">✦</div>
        <div>
          <p className="eyebrow">THE</p>
          <h1>IMAGINATION MACHINE</h1>
          <p className="tagline">INSERT HUMANS · MAKE MISCHIEF · BUILD 0.3</p>
        </div>
      </header>

      {screen === "lobby" && (
        <section className="panel">
          <div className="panel-title-row">
            <div>
              <p className="step">01</p>
              <h2>WHO'S PLAYING?</h2>
            </div>
            <p className="hint">CHOOSE ON YOUR DECK · THEN READY</p>
          </div>

          <div className="player-grid">
            {players.map((player) => {
              const deckIndex = lobbySelections.findIndex((id) => id === player.id);
              const selected = deckIndex !== -1;

              return (
                <article className={`player-card theme-${player.color} ${selected ? "selected" : ""}`} key={player.id}>
                  <button className="player-main" onClick={() => assignFromMac(player.id)}>
                    <PixelAvatar
                      avatar={player.avatar}
                      color={COLOR_HEX[player.color]}
                      accessory={player.accessory}
                      size={112}
                    />
                    <strong>{player.name.toUpperCase()}</strong>
                    <span className="tiny">
                      {selected ? `DECK ${deckIndex + 1} · ${lobbyReady[deckIndex] ? "READY!" : "SELECTED"}` : "AVAILABLE"}
                    </span>
                  </button>
                </article>
              );
            })}
          </div>

          <div className="controller-rack">
            {[0, 1].map((index) => {
              const deck = hardwareDecks[index];
              const chosen = players.find((player) => player.id === lobbySelections[index]);
              return (
                <div className="controller-chip" key={index}>
                  <span className={deck ? "status-dot" : "status-dot offline"} />
                  DECK {index + 1} · {deck ? chosen?.name?.toUpperCase() ?? "PICK A PLAYER" : "OFFLINE"} · {lobbyReady[index] ? "READY" : "NOT READY"}
                </div>
              );
            })}
          </div>

          <p className="deck-first-note">
            PLAYER ICONS LIVE ON THE DECKS. KEY 7 CUSTOMIZES. KEY 8 SUBMITS.
          </p>
          <p className="nav-hint">LEFT DIAL = BACK · RIGHT DIAL = HOME</p>
        </section>
      )}

      {screen === "menu" && (
        <section className="panel">
          <p className="step">02</p>
          <h2>CHOOSE A GAME</h2>
          <p className="menu-help">PRESS A GAME ICON ON EITHER DECK.</p>
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
          <p className="nav-hint">PRESS LEFT DIAL = BACK · PRESS RIGHT DIAL = HOME</p>
        </section>
      )}
    </main>
  );
}

export default App;
