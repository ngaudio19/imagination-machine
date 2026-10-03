export function MoonMonster({ chomping = false }: { chomping?: boolean }) {
  return (
    <div className={`moon-sprite-wrap ${chomping ? "chomping" : ""}`} aria-label="Hungry moon monster">
      <svg
        className="moon-sprite"
        viewBox="0 0 64 64"
        role="img"
        aria-hidden="true"
        shapeRendering="crispEdges"
      >
        <rect x="18" y="5" width="7" height="7" fill="#4d3e54" />
        <rect x="39" y="5" width="7" height="7" fill="#4d3e54" />
        <rect x="15" y="8" width="7" height="8" fill="#725b61" />
        <rect x="42" y="8" width="7" height="8" fill="#725b61" />
        <rect x="20" y="9" width="24" height="3" fill="#30283c" />

        <rect x="13" y="14" width="38" height="36" fill="#32283b" />
        <rect x="10" y="20" width="44" height="24" fill="#32283b" />
        <rect x="17" y="11" width="30" height="42" fill="#32283b" />

        <rect x="16" y="15" width="34" height="32" fill="#e4bd52" />
        <rect x="13" y="21" width="40" height="20" fill="#e4bd52" />
        <rect x="20" y="12" width="24" height="38" fill="#e4bd52" />

        <rect x="19" y="15" width="23" height="4" fill="#f5dc79" />
        <rect x="15" y="22" width="5" height="15" fill="#f5dc79" />
        <rect x="20" y="19" width="5" height="4" fill="#f5dc79" />
        <rect x="44" y="20" width="6" height="18" fill="#bd8e38" />
        <rect x="39" y="42" width="8" height="5" fill="#bd8e38" />
        <rect x="23" y="47" width="18" height="4" fill="#9f7432" />

        <rect x="20" y="22" width="10" height="10" fill="#392f43" />
        <rect x="35" y="22" width="10" height="10" fill="#392f43" />
        <rect x="22" y="23" width="6" height="6" fill="#f7f0d3" />
        <rect x="37" y="23" width="6" height="6" fill="#f7f0d3" />
        <rect x="25" y="25" width="3" height="4" fill="#171521" />
        <rect x="37" y="25" width="3" height="4" fill="#171521" />
        <rect x="23" y="22" width="3" height="2" fill="#ffffff" />
        <rect x="38" y="22" width="3" height="2" fill="#ffffff" />

        <rect x="24" y="34" width="17" height="12" fill="#241b2c" />
        <rect x="21" y="37" width="23" height="6" fill="#241b2c" />
        <rect x="25" y="34" width="4" height="4" fill="#f5efd9" />
        <rect x="36" y="34" width="4" height="4" fill="#f5efd9" />
        <rect x="28" y="42" width="4" height="4" fill="#f5efd9" />
        <rect x="34" y="42" width="4" height="4" fill="#f5efd9" />
        <rect x="31" y="38" width="5" height="3" fill="#d76070" />

        <rect x="17" y="31" width="5" height="4" fill="#ad7f34" />
        <rect x="43" y="15" width="4" height="5" fill="#ad7f34" />
        <rect x="17" y="41" width="7" height="5" fill="#c3933c" />
        <rect x="39" y="47" width="5" height="3" fill="#7c592d" />
        <rect x="30" y="15" width="5" height="4" fill="#c2933e" />

        <rect x="9" y="28" width="6" height="7" fill="#32283b" />
        <rect x="6" y="30" width="6" height="5" fill="#e4bd52" />
        <rect x="49" y="28" width="6" height="7" fill="#32283b" />
        <rect x="52" y="30" width="6" height="5" fill="#e4bd52" />

        <rect x="16" y="50" width="8" height="5" fill="#32283b" />
        <rect x="14" y="53" width="10" height="4" fill="#7d5a36" />
        <rect x="40" y="50" width="8" height="5" fill="#32283b" />
        <rect x="40" y="53" width="10" height="4" fill="#7d5a36" />

        <rect className="moon-drool" x="41" y="43" width="3" height="7" fill="#73d9c9" />
        <rect className="moon-drool" x="42" y="49" width="3" height="3" fill="#a4f1df" />
      </svg>

      <span className="moon-sprite-shadow" />
      <span className="moon-spark moon-spark-a">✦</span>
      <span className="moon-spark moon-spark-b">·</span>
      <span className="moon-spark moon-spark-c">✦</span>
    </div>
  );
}
