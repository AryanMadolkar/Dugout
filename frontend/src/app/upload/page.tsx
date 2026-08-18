"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { AppLayout } from "@/components/v5/AppLayout";
import { scanResultToPending, scanSquadImage } from "@/lib/api";
import { useDashboard } from "@/context/DashboardContext";

export default function UploadPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { setPendingScan } = useDashboard();

  const onFile = useCallback((next: File | undefined) => {
    if (!next?.type.startsWith("image/")) return;
    setFile(next);
    setPreview(URL.createObjectURL(next));
    setError(null);
  }, []);

  const analyze = useCallback(async () => {
    if (!file || scanning) return;
    setScanning(true);
    setError(null);
    try {
      const result = await scanSquadImage(file);
      setPendingScan(scanResultToPending(result));
      router.push("/upload/confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }, [file, scanning, router, setPendingScan]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg">
        <div className="panel-elevated overflow-hidden p-6">
          <p className="font-label text-[11px] text-[var(--coral)]">Step 1 of 2</p>
          <h1 className="mt-1 text-[24px] font-extrabold text-[var(--navy)]">Scan your squad</h1>
          <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
            Upload a screenshot from the FPL app. We detect XI, bench, captain and formation.
          </p>

          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              onFile(e.dataTransfer.files[0]);
            }}
            className={`mt-5 flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-[3px] border-2 border-dashed p-8 transition ${
              dragging
                ? "border-[var(--coral)] bg-[var(--fdr-hard)]/40"
                : "border-[var(--border-strong)] bg-[var(--canvas)] hover:border-[var(--coral)]/50"
            }`}
          >
            {preview ? (
              <div className="relative h-52 w-full">
                <Image src={preview} alt="Preview" fill className="object-contain" unoptimized />
              </div>
            ) : (
              <>
                <div
                  className="mb-3 flex h-14 w-14 items-center justify-center rounded-full text-[22px]"
                  style={{ background: "var(--fdr-easy)" }}
                >
                  📷
                </div>
                <p className="text-[15px] font-bold">Drop screenshot here</p>
                <p className="mt-1 text-[12px] text-[var(--text-secondary)]">PNG or JPG from your FPL team page</p>
              </>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />

          {error ? (
            <p className="mt-3 rounded-[3px] border border-[var(--coral)] bg-[var(--fdr-hard)]/40 px-3 py-2 text-[13px] text-[var(--coral-dark)]">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            disabled={!file || scanning}
            onClick={analyze}
            className={`control btn-coral mt-4 block w-full py-3 text-center text-[14px] ${
              !file || scanning ? "pointer-events-none opacity-40" : ""
            }`}
          >
            {scanning ? "Analyzing screenshot…" : "Analyze squad"}
          </button>

          <Link href="/" className="mt-3 block text-center text-[12px] text-[var(--text-secondary)] hover:underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
