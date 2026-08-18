"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
};

export function Modal({ open, onClose, title, children, wide }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-[var(--navy)]/40"
        onClick={onClose}
      />
      <div
        className={`relative max-h-[90vh] w-full overflow-y-auto bg-white shadow-xl ${wide ? "max-w-2xl" : "max-w-md"}`}
        style={{ borderRadius: 4 }}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--navy)] px-4 py-3 text-white">
          <h2 className="font-label text-[12px] font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[18px] leading-none text-white/70 hover:text-white"
          >
            ×
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
