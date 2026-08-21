import { getKit, kitTextColor } from "@/lib/club-kit";

type Props = {
  club: string;
  clubColor: string;
  isGK?: boolean;
  isCaptain?: boolean;
  isVice?: boolean;
  size?: "pitch" | "bench";
};

/** Classic FPL-style shirt silhouette (wider than tall). */
export function FplJersey({ club, clubColor, isGK, isCaptain, isVice, size = "pitch" }: Props) {
  const kit = getKit(club, clubColor);
  const chestText = kitTextColor(kit.primary);
  const w = size === "pitch" ? 56 : 48;
  const h = size === "pitch" ? 56 : 48;

  return (
    <svg width={w} height={h} viewBox="0 0 64 64" fill="none" aria-hidden className="drop-shadow-md">
      {/* Left sleeve */}
      <path
        d="M18 18 L6 22 L4 36 L16 34 L18 22 Z"
        fill={isGK ? kit.secondary : kit.primary}
        stroke={kit.trim}
        strokeWidth="1"
      />
      {/* Right sleeve */}
      <path
        d="M46 18 L58 22 L60 36 L48 34 L46 22 Z"
        fill={isGK ? kit.secondary : kit.primary}
        stroke={kit.trim}
        strokeWidth="1"
      />
      {/* Body */}
      <path
        d="M20 16 C24 14 28 13 32 13 C36 13 40 14 44 16 L46 48 C40 51 36 52 32 52 C28 52 24 51 18 48 Z"
        fill={kit.primary}
        stroke={kit.trim}
        strokeWidth="1.2"
      />
      {/* Collar */}
      <path d="M26 16 C28 22 36 22 38 16" stroke={kit.trim} strokeWidth="1.6" fill="none" />
      <path d="M28 16 L32 22 L36 16" fill={kit.secondary} opacity={0.9} />
      {/* Club code */}
      <text
        x="32"
        y="38"
        textAnchor="middle"
        fill={chestText}
        fontSize="11"
        fontWeight="800"
        fontFamily="var(--font-archivo), sans-serif"
        opacity={0.9}
      >
        {club.slice(0, 3)}
      </text>
      {isCaptain ? (
        <circle cx="14" cy="28" r="7" fill="#FFD700" stroke="#B8860B" strokeWidth="1" />
      ) : null}
      {isCaptain ? (
        <text x="14" y="31" textAnchor="middle" fill="#1a1a1a" fontSize="9" fontWeight="800">
          C
        </text>
      ) : null}
      {isVice && !isCaptain ? (
        <circle cx="14" cy="28" r="7" fill="#C0C0C0" stroke="#808080" strokeWidth="1" />
      ) : null}
      {isVice && !isCaptain ? (
        <text x="14" y="31" textAnchor="middle" fill="#1a1a1a" fontSize="9" fontWeight="800">
          V
        </text>
      ) : null}
    </svg>
  );
}
