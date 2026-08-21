"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TAB_ROUTES, type Tab } from "@/lib/routes";
import { fetchOverview } from "@/lib/api";
import type { Gameweek } from "@/lib/types";
import { useDashboard } from "@/context/DashboardContext";
import { Modal } from "@/components/v5/ui/Modal";

type Props = {
  activeTab: Tab;
};

function formatDeadline(iso: string | null): string {
  if (!iso) return "Deadline TBD";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZoneName: "short",
    }).format(d);
  } catch {
    return "Deadline TBD";
  }
}

function isUploadPath(href: string) {
  return href === "/upload" || href.startsWith("/upload/");
}

export function HeaderBar({ activeTab }: Props) {
  const [gw, setGw] = useState<Gameweek | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const { pendingScan } = useDashboard();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetchOverview()
      .then((o) => setGw(o.current_gameweek))
      .catch(() => setGw(null));
  }, []);

  const gwLabel = gw ? `GW${gw.id}` : "—";
  const deadlineLabel = gw ? formatDeadline(gw.deadline_time) : "Loading…";
  const needsSave = Boolean(pendingScan);

  const guardClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!needsSave) return;
    if (isUploadPath(href)) return;
    // Already on that page — no-op
    if (href === pathname) return;
    e.preventDefault();
    setSaveModalOpen(true);
  };

  return (
    <>
      <header
        className="text-white"
        style={{
          background: "linear-gradient(180deg, #0a1623 0%, var(--navy) 55%, #0d1a28 100%)",
          boxShadow: "0 4px 20px rgba(16, 30, 46, 0.25)",
        }}
      >
        <div className="mx-auto flex max-w-[1560px] items-center justify-between gap-4 px-6 py-3">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-90" onClick={(e) => guardClick(e, "/")}>
            {/* Plain img: next/image optimizer 404s on this Vercel multi-service deploy */}
            <img
              src="/dugout-logo.png"
              alt="Dugout"
              width={36}
              height={36}
              className="h-9 w-9 rounded-[3px] object-cover"
            />
            <span className="text-[15px] font-extrabold tracking-tight">Dugout</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="header-stat-deadline stat-pill flex flex-col items-end">
              <span className="font-label text-[9px] text-white/45">Upcoming · {gwLabel}</span>
              <span className="text-[12px] font-bold leading-tight">{deadlineLabel}</span>
            </div>
            <Link
              href="/upload"
              onClick={(e) => guardClick(e, "/upload")}
              className="control btn-coral hidden px-3 py-2 text-[11px] sm:inline-block"
            >
              Scan squad
            </Link>
          </div>
        </div>

        <nav
          className="mx-auto flex max-w-[1560px] gap-0 overflow-x-auto px-6 scrollbar-hide"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          {(Object.entries(TAB_ROUTES) as [Tab, string][]).map(([tab, href]) => (
            <Link
              key={tab}
              href={href}
              onClick={(e) => guardClick(e, href)}
              className={`font-label relative shrink-0 px-4 py-3 text-[11px] font-semibold transition ${
                activeTab === tab ? "text-white" : "text-white/45 hover:text-white/75"
              }`}
            >
              {tab}
              {activeTab === tab ? (
                <span
                  className="absolute inset-x-2 bottom-0 h-[2px] rounded-full"
                  style={{ background: "linear-gradient(90deg, var(--coral), #ff8a75)" }}
                />
              ) : null}
            </Link>
          ))}
        </nav>
      </header>

      <Modal open={saveModalOpen} onClose={() => setSaveModalOpen(false)} title="Save your team first">
        <p className="text-[14px] leading-relaxed text-[var(--text-body)]">
          You’ve scanned a squad but haven’t confirmed it yet. Save the team on the confirm screen before opening
          other sections.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              setSaveModalOpen(false);
              if (pathname !== "/upload/confirm") {
                router.push("/upload/confirm");
              }
            }}
            className="control flex-1 bg-[var(--navy)] py-2.5 text-[13px] font-bold text-white hover:opacity-90"
          >
            Go to confirm
          </button>
          <button
            type="button"
            onClick={() => setSaveModalOpen(false)}
            className="control flex-1 border border-[var(--border)] py-2.5 text-[13px] font-bold hover:bg-[var(--canvas)]"
          >
            Stay here
          </button>
        </div>
      </Modal>
    </>
  );
}
