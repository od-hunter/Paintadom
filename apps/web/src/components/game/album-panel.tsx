"use client";

import { useMemo, useState } from "react";
import { COLORING_PAGES } from "@/data/pages";
import { useGameStore } from "@/store/game-store";
import { CenteredModal } from "@/components/ui/centered-modal";
import { playSfx } from "@/lib/audio";

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

/** Composite paint fills + line art into a downloadable PNG */
async function downloadPainting(opts: {
  title: string;
  canvasData: string;
  lineArt?: string;
}) {
  const W = 800;
  const H = 1000;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  const load = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Image failed to load"));
      img.src = src;
    });

  const paint = await load(opts.canvasData);
  ctx.drawImage(paint, 0, 0, W, H);

  if (opts.lineArt) {
    try {
      const lines = await load(opts.lineArt);
      ctx.drawImage(lines, 0, 0, W, H);
    } catch {
      /* paint-only download still fine */
    }
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );
  if (!blob) throw new Error("Export failed");

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `paintadom-${slugify(opts.title) || "painting"}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function AlbumPanel({
  open,
  onClose,
  onBack,
}: {
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
}) {
  const pageProgress = useGameStore((s) => s.pageProgress);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const [levelFilter, setLevelFilter] = useState<number | "all">("all");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const painted = useMemo(() => {
    return COLORING_PAGES.filter((p) => {
      const prog = pageProgress[p.id];
      return prog?.completed && prog.canvasData;
    }).map((p) => ({
      ...p,
      canvasData: pageProgress[p.id]!.canvasData!,
    }));
  }, [pageProgress]);

  const levels = useMemo(
    () =>
      [...new Set(painted.map((p) => p.level))].sort((a, b) => a - b),
    [painted]
  );

  const shown =
    levelFilter === "all"
      ? painted
      : painted.filter((p) => p.level === levelFilter);

  const onDownload = async (p: (typeof shown)[number]) => {
    playSfx("tap", soundEnabled);
    setDownloadingId(p.id);
    try {
      await downloadPainting({
        title: p.title,
        canvasData: p.canvasData,
        lineArt: p.lineArt || p.thumbnail,
      });
    } catch {
      /* ignore — user can retry */
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <CenteredModal open={open} onClose={onClose} zIndex={95}>
      <div className="flex max-h-[min(90dvh,720px)] w-full flex-col overflow-hidden rounded-[1.85rem] border-[5px] border-amber-900/40 bg-gradient-to-b from-amber-100 via-orange-50 to-amber-200 shadow-[0_14px_0_rgba(0,0,0,0.28)]">
        <div className="relative shrink-0 border-b-4 border-amber-800/20 px-4 pb-2 pt-4 text-center">
          <h2
            className="font-display text-2xl font-black text-amber-950"
            style={{ textShadow: "0 2px 0 rgba(255,255,255,0.7)" }}
          >
            Album
          </h2>
          <p className="mt-0.5 text-xs font-bold text-amber-900/80">
            Your finished paintings · tap Download to save
          </p>
          <button
            type="button"
            onClick={onBack ?? onClose}
            className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-amber-500 text-lg font-black text-white"
            aria-label="Back"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-red-500 text-xl font-black text-white"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 pt-3">
          {levels.length > 0 && (
            <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => {
                  playSfx("tap", soundEnabled);
                  setLevelFilter("all");
                }}
                className={`shrink-0 rounded-full border-2 px-3 py-1 text-xs font-black ${
                  levelFilter === "all"
                    ? "border-amber-700 bg-amber-500 text-white"
                    : "border-amber-300 bg-white text-amber-950"
                }`}
              >
                All
              </button>
              {levels.map((lv) => (
                <button
                  key={lv}
                  type="button"
                  onClick={() => {
                    playSfx("tap", soundEnabled);
                    setLevelFilter(lv);
                  }}
                  className={`shrink-0 rounded-full border-2 px-3 py-1 text-xs font-black ${
                    levelFilter === lv
                      ? "border-amber-700 bg-amber-500 text-white"
                      : "border-amber-300 bg-white text-amber-950"
                  }`}
                >
                  Level {lv}
                </button>
              ))}
            </div>
          )}

          {shown.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-amber-400 bg-white/70 px-4 py-10 text-center">
              <p className="font-display text-lg font-black text-amber-950">
                Album is empty
              </p>
              <p className="mt-2 text-sm font-bold text-amber-900/75">
                Finish drawings in the Drawing Book — they appear here exactly
                as you painted them.
              </p>
            </div>
          ) : (
            <div className="columns-2 gap-3 space-y-3">
              {shown.map((p) => (
                <div
                  key={p.id}
                  className="break-inside-avoid overflow-hidden rounded-xl border-[3px] border-amber-800/30 bg-white shadow-[0_4px_0_rgba(120,53,15,0.25)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.canvasData}
                    alt={p.title}
                    className="w-full bg-white object-contain"
                  />
                  <div className="border-t border-amber-100 px-2 py-1.5">
                    <p className="truncate text-[11px] font-black text-amber-950">
                      {p.title}
                    </p>
                    <p className="text-[10px] font-bold text-amber-800/70">
                      Level {p.level}
                    </p>
                    <button
                      type="button"
                      disabled={downloadingId === p.id}
                      onClick={() => void onDownload(p)}
                      className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-lg border-b-[3px] border-sky-800 bg-gradient-to-b from-sky-300 to-blue-500 py-1.5 text-[11px] font-black text-white disabled:opacity-60"
                    >
                      {downloadingId === p.id ? "Saving…" : "Download"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </CenteredModal>
  );
}
