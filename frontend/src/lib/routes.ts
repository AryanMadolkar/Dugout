export const TABS = [
  "My team",
  "Verdict",
  "Transfers",
  "Captain",
  "Chips",
  "Picks",
  "Analysis",
  "Players",
  "Fixtures",
] as const;
export type Tab = (typeof TABS)[number];

export const TAB_ROUTES: Record<Tab, string> = {
  "My team": "/",
  Verdict: "/verdict",
  Transfers: "/transfers",
  Captain: "/captain",
  Chips: "/chips",
  Picks: "/picks",
  Analysis: "/analysis",
  Players: "/players",
  Fixtures: "/fixtures",
};

export function tabFromPath(pathname: string): Tab {
  const sorted = Object.entries(TAB_ROUTES).sort((a, b) => b[1].length - a[1].length);
  const entry = sorted.find(([, route]) => {
    if (route === "/") return pathname === "/";
    return pathname.startsWith(route);
  });
  return (entry?.[0] as Tab) ?? "My team";
}
