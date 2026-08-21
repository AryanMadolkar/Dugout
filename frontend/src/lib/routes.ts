export const TABS = ["My team", "Transfers", "Players", "Fixtures", "Analysis"] as const;
export type Tab = (typeof TABS)[number];

export const TAB_ROUTES: Record<Tab, string> = {
  "My team": "/",
  Transfers: "/transfers",
  Players: "/players",
  Fixtures: "/fixtures",
  Analysis: "/analysis",
};

export function tabFromPath(pathname: string): Tab {
  const entry = Object.entries(TAB_ROUTES).find(([, route]) => {
    if (route === "/") return pathname === "/";
    return pathname.startsWith(route);
  });
  return (entry?.[0] as Tab) ?? "My team";
}
