import { getKit, kitTextColor } from "@/lib/club-kit";

type Props = {
  club: string;
  clubColor: string;
  isGK?: boolean;
  isCaptain?: boolean;
  isVice?: boolean;
  size?: "pitch" | "bench";
};

export function FplJersey({ club, clubColor, isGK, isCaptain, isVice, size = "pitch" }: Props) {
  const kit = getKit(club, clubColor);
  const chestText = kitTextColor(kit.primary);
  const w = size === "pitch" ? 44 : 36;
  const h = size === "pitch" ? 52 : 42;

  return (
    <svg width={w} height={h} viewBox="0 0 44 52" fill="none" aria-hidden className="drop-shadow-md">
      {/* Left sleeve */}
      <path
        d="M6 14 L2 24 L8 26 L10 16 Z"
        fill={kit.secondary}
        stroke={kit.trim}
        strokeWidth="0.5"
        opacity={0.95}
      />
      {/* Right sleeve */}
      <path
        d="M38 14 L42 24 L36 26 L34 16 Z"
        fill={kit.secondary}
        stroke={kit.trim}
        strokeWidth="0.5"
        opacity={0.95}
      />
      {/* Body */}
      <path
        d="M10 12 L34 12 L36 42 L8 42 Z"
        fill={kit.primary}
        stroke={kit.trim}
        strokeWidth="0.6"
      />
      {/* Collar */}
      <path d="M16 12 Q22 18 28 12" stroke={kit.trim} strokeWidth="1.2" fill="none" />
      {/* GK long sleeves */}
      {isGK ? (
        <>
          <path d="M6 14 L1 28 L8 30 L10 16 Z" fill={kit.secondary} stroke={kit.trim} strokeWidth="0.4" />
          <path d="M38 14 L43 28 L36 30 L34 16 Z" fill={kit.secondary} stroke={kit.trim} strokeWidth="0.4" />
        </>
      ) : null}
      {/* Club initial on chest */}
      <text
        x="22"
        y="30"
        textAnchor="middle"
        fill={chestText}
        fontSize="11"
        fontWeight="800"
        fontFamily="var(--font-archivo), sans-serif"
        opacity={0.85}
      >
        {club.slice(0, 1)}
      </text>
      {/* Captain armband — FPL yellow on left sleeve */}
      {isCaptain ? (
        <rect x="3" y="20" width="7" height="4" rx="1" fill="#FFD700" stroke="#B8860B" strokeWidth="0.4" />
      ) : null}
      {isVice && !isCaptain ? (
        <rect x="3" y="20" width="7" height="4" rx="1" fill="#C0C0C0" stroke="#808080" strokeWidth="0.4" />
      ) : null}
    </svg>
  );
}
