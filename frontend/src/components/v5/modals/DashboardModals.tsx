"use client";

import Link from "next/link";
import { useDashboard } from "@/context/DashboardContext";
import { WhatIfPanel } from "@/components/v5/WhatIfPanel";
import { Modal } from "@/components/v5/ui/Modal";

export function MakeMoveModal() {
  const { activeModal, closeModal } = useDashboard();

  return (
    <Modal open={activeModal === "makeMove"} onClose={closeModal} title="Confirm transfer">
      <p className="text-[13px] text-[var(--text-secondary)]">
        Apply moves from the Transfer plan or run a What if? scenario first.
      </p>
      <button
        type="button"
        onClick={closeModal}
        className="control mt-4 w-full border border-[var(--border)] py-2.5 text-[13px] font-bold hover:bg-[var(--canvas)]"
      >
        Close
      </button>
    </Modal>
  );
}

export function WhatIfModal() {
  const { activeModal, closeModal } = useDashboard();

  return (
    <Modal open={activeModal === "whatIf"} onClose={closeModal} title="What if?" wide>
      <WhatIfPanel />
      <button
        type="button"
        onClick={closeModal}
        className="control mt-4 w-full border border-[var(--border)] py-2 text-[13px] font-bold hover:bg-[var(--canvas)]"
      >
        Close
      </button>
    </Modal>
  );
}

export function FixPlayerModal() {
  const { activeModal, closeModal, allPlayers, selectedPlayer, setSelectedId } = useDashboard();

  return (
    <Modal open={activeModal === "fixPlayer"} onClose={closeModal} title="Fix a player" wide>
      <p className="mb-3 text-[13px] text-[var(--text-secondary)]">
        To correct a misidentified player, re-scan or use the confirm screen after upload.
      </p>
      <div className="max-h-64 space-y-1 overflow-y-auto">
        {allPlayers.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelectedId(p.id)}
            className={`flex w-full items-center justify-between rounded-[3px] border px-3 py-2 text-left transition hover:bg-[var(--canvas)] ${
              selectedPlayer?.id === p.id ? "border-[var(--coral)] bg-[var(--fdr-hard)]/30" : "border-[var(--border)]"
            }`}
          >
            <span className="text-[13px] font-bold">{p.name}</span>
            <span className="font-label text-[10px] text-[var(--text-secondary)]">
              {p.club} · {p.position}
            </span>
          </button>
        ))}
      </div>
      <Link
        href="/upload"
        onClick={closeModal}
        className="control mt-4 block w-full bg-[var(--navy)] py-2.5 text-center text-[13px] font-bold text-white hover:opacity-90"
      >
        Re-scan squad
      </Link>
    </Modal>
  );
}

export function DashboardModals() {
  return (
    <>
      <MakeMoveModal />
      <WhatIfModal />
      <FixPlayerModal />
    </>
  );
}
