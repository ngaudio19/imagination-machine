import type { PlayerAccessory, PlayerAvatar } from "../core/types";

type Props = {
  avatar: PlayerAvatar;
  color: string;
  accessory?: PlayerAccessory;
  size?: number;
};

export function PixelAvatar({ avatar, color, accessory = "none", size = 96 }: Props) {
  return (
    <svg
      className="pixel-avatar-svg"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label={avatar}
      shapeRendering="crispEdges"
    >
      <rect width="32" height="32" fill="transparent" />
      <AvatarBody avatar={avatar} color={color} />
      <Accessory accessory={accessory} color={color} />
    </svg>
  );
}

function AvatarBody({ avatar, color }: { avatar: PlayerAvatar; color: string }) {
  const dark = "#09090d";
  const light = "#f8f7ff";
  const accent = "#ffe44a";

  switch (avatar) {
    case "cat":
      return <>
        <rect x="7" y="9" width="18" height="16" fill={color}/>
        <rect x="5" y="5" width="7" height="8" fill={color}/>
        <rect x="20" y="5" width="7" height="8" fill={color}/>
        <rect x="8" y="6" width="3" height="4" fill={dark}/>
        <rect x="21" y="6" width="3" height="4" fill={dark}/>
        <rect x="10" y="14" width="4" height="4" fill={light}/>
        <rect x="19" y="14" width="4" height="4" fill={light}/>
        <rect x="12" y="15" width="2" height="2" fill={dark}/>
        <rect x="19" y="15" width="2" height="2" fill={dark}/>
        <rect x="15" y="19" width="3" height="2" fill={dark}/>
      </>;
    case "dog":
      return <>
        <rect x="7" y="9" width="18" height="16" fill={color}/>
        <rect x="3" y="7" width="7" height="12" fill={color}/>
        <rect x="22" y="7" width="7" height="12" fill={color}/>
        <rect x="10" y="14" width="4" height="4" fill={light}/>
        <rect x="19" y="14" width="4" height="4" fill={light}/>
        <rect x="12" y="15" width="2" height="2" fill={dark}/>
        <rect x="19" y="15" width="2" height="2" fill={dark}/>
        <rect x="14" y="19" width="5" height="4" fill={dark}/>
      </>;
    case "fox":
      return <>
        <rect x="7" y="10" width="18" height="15" fill={color}/>
        <polygon points="5,12 9,3 14,11" fill={color}/>
        <polygon points="18,11 23,3 27,12" fill={color}/>
        <rect x="9" y="17" width="14" height="8" fill={light}/>
        <rect x="10" y="14" width="3" height="3" fill={dark}/>
        <rect x="20" y="14" width="3" height="3" fill={dark}/>
        <rect x="15" y="20" width="3" height="2" fill={dark}/>
      </>;
    case "frog":
      return <>
        <rect x="6" y="11" width="20" height="14" fill={color}/>
        <rect x="5" y="6" width="8" height="9" fill={color}/>
        <rect x="19" y="6" width="8" height="9" fill={color}/>
        <rect x="7" y="8" width="4" height="4" fill={light}/>
        <rect x="21" y="8" width="4" height="4" fill={light}/>
        <rect x="9" y="9" width="2" height="2" fill={dark}/>
        <rect x="21" y="9" width="2" height="2" fill={dark}/>
        <rect x="11" y="20" width="10" height="2" fill={dark}/>
      </>;
    case "bear":
      return <>
        <rect x="7" y="9" width="18" height="17" fill={color}/>
        <rect x="4" y="6" width="8" height="8" fill={color}/>
        <rect x="20" y="6" width="8" height="8" fill={color}/>
        <rect x="10" y="14" width="4" height="4" fill={light}/>
        <rect x="19" y="14" width="4" height="4" fill={light}/>
        <rect x="12" y="15" width="2" height="2" fill={dark}/>
        <rect x="19" y="15" width="2" height="2" fill={dark}/>
        <rect x="12" y="19" width="9" height="5" fill="#d8ad82"/>
        <rect x="15" y="20" width="3" height="2" fill={dark}/>
      </>;
    case "bunny":
      return <>
        <rect x="7" y="10" width="18" height="16" fill={color}/>
        <rect x="8" y="2" width="6" height="12" fill={color}/>
        <rect x="18" y="2" width="6" height="12" fill={color}/>
        <rect x="10" y="4" width="2" height="6" fill="#ff8fcf"/>
        <rect x="20" y="4" width="2" height="6" fill="#ff8fcf"/>
        <rect x="10" y="15" width="4" height="4" fill={light}/>
        <rect x="19" y="15" width="4" height="4" fill={light}/>
        <rect x="12" y="16" width="2" height="2" fill={dark}/>
        <rect x="19" y="16" width="2" height="2" fill={dark}/>
        <rect x="15" y="20" width="3" height="2" fill={dark}/>
      </>;
    case "owl":
      return <>
        <rect x="6" y="8" width="20" height="18" fill={color}/>
        <polygon points="6,10 10,3 13,10" fill={color}/>
        <polygon points="19,10 22,3 26,10" fill={color}/>
        <rect x="8" y="12" width="7" height="7" fill={light}/>
        <rect x="17" y="12" width="7" height="7" fill={light}/>
        <rect x="10" y="14" width="3" height="3" fill={dark}/>
        <rect x="19" y="14" width="3" height="3" fill={dark}/>
        <polygon points="14,20 18,20 16,24" fill={accent}/>
      </>;
    case "shark":
      return <>
        <rect x="5" y="11" width="22" height="12" fill={color}/>
        <polygon points="4,17 0,10 0,24" fill={color}/>
        <polygon points="14,11 18,4 21,11" fill={color}/>
        <rect x="20" y="13" width="4" height="4" fill={light}/>
        <rect x="22" y="14" width="2" height="2" fill={dark}/>
        <rect x="18" y="19" width="7" height="2" fill={dark}/>
      </>;
    case "axolotl":
      return <>
        <rect x="7" y="10" width="18" height="15" fill={color}/>
        <rect x="3" y="9" width="5" height="3" fill="#ff8fcf"/>
        <rect x="2" y="14" width="6" height="3" fill="#ff8fcf"/>
        <rect x="3" y="19" width="5" height="3" fill="#ff8fcf"/>
        <rect x="24" y="9" width="5" height="3" fill="#ff8fcf"/>
        <rect x="24" y="14" width="6" height="3" fill="#ff8fcf"/>
        <rect x="24" y="19" width="5" height="3" fill="#ff8fcf"/>
        <rect x="10" y="14" width="3" height="3" fill={dark}/>
        <rect x="20" y="14" width="3" height="3" fill={dark}/>
        <rect x="13" y="20" width="7" height="2" fill={dark}/>
      </>;
    case "raccoon":
      return <>
        <rect x="7" y="9" width="18" height="16" fill={color}/>
        <polygon points="5,10 9,4 13,11" fill={color}/>
        <polygon points="19,11 23,4 27,10" fill={color}/>
        <rect x="8" y="13" width="16" height="7" fill="#2f3038"/>
        <rect x="10" y="14" width="4" height="4" fill={light}/>
        <rect x="19" y="14" width="4" height="4" fill={light}/>
        <rect x="12" y="15" width="2" height="2" fill={dark}/>
        <rect x="19" y="15" width="2" height="2" fill={dark}/>
        <rect x="15" y="21" width="3" height="2" fill={dark}/>
      </>;
    case "dino":
      return <>
        <rect x="7" y="10" width="18" height="15" fill={color}/>
        <rect x="21" y="7" width="7" height="12" fill={color}/>
        <polygon points="7,11 4,7 10,8" fill={accent}/>
        <polygon points="11,10 10,5 15,8" fill={accent}/>
        <rect x="21" y="10" width="3" height="3" fill={light}/>
        <rect x="22" y="11" width="2" height="2" fill={dark}/>
        <rect x="24" y="16" width="4" height="2" fill={dark}/>
        <rect x="4" y="22" width="8" height="4" fill={color}/>
      </>;
    case "alien":
      return <>
        <rect x="8" y="8" width="16" height="17" fill={color}/>
        <rect x="11" y="5" width="10" height="22" fill={color}/>
        <rect x="6" y="11" width="20" height="10" fill={color}/>
        <rect x="9" y="13" width="6" height="7" fill={dark}/>
        <rect x="18" y="13" width="6" height="7" fill={dark}/>
        <rect x="14" y="22" width="5" height="2" fill={dark}/>
        <rect x="15" y="2" width="2" height="5" fill={color}/>
        <rect x="14" y="1" width="4" height="3" fill={accent}/>
      </>;
  }
}

function Accessory({ accessory, color }: { accessory: PlayerAccessory; color: string }) {
  switch (accessory) {
    case "crown":
      return <>
        <polygon points="8,7 11,2 16,7 21,2 24,7 23,11 9,11" fill="#ffe44a"/>
      </>;
    case "glasses":
      return <>
        <rect x="7" y="13" width="8" height="6" fill="none" stroke="#050507" strokeWidth="2"/>
        <rect x="17" y="13" width="8" height="6" fill="none" stroke="#050507" strokeWidth="2"/>
        <rect x="15" y="15" width="2" height="2" fill="#050507"/>
      </>;
    case "cape":
      return <polygon points="6,18 3,30 14,26 12,18" fill="#ff5cb8"/>;
    case "cap":
      return <>
        <rect x="8" y="5" width="15" height="5" fill="#4b79ff"/>
        <rect x="20" y="8" width="7" height="3" fill="#4b79ff"/>
      </>;
    case "star":
      return <polygon points="25,3 27,8 31,9 28,12 29,17 25,14 21,17 22,12 19,9 23,8" fill="#ffe44a"/>;
    default:
      return null;
  }
}
