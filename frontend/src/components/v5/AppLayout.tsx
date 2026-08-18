"use client";

import { DashboardModals } from "@/components/v5/modals/DashboardModals";
import { HeaderBar } from "@/components/v5/HeaderBar";
import { tabFromPath } from "@/lib/routes";
import { usePathname } from "next/navigation";

type Props = {
  children: React.ReactNode;
  teamHeader?: React.ReactNode;
};

export function AppLayout({ children, teamHeader }: Props) {
  const pathname = usePathname();
  const activeTab = tabFromPath(pathname);
  const isUpload = pathname.startsWith("/upload");

  return (
    <div className="app-canvas min-h-screen">
      <HeaderBar activeTab={activeTab} />
      <main className="mx-auto max-w-[1560px] space-y-5 px-6 py-5">
        {!isUpload && teamHeader}
        {children}
      </main>
      <DashboardModals />
    </div>
  );
}
