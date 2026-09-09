"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GALLERIES } from "@/data/buildings";
import { GameIcon } from "@/components/ui/game-icon";

const LEVEL_ART: Record<number, string> = {
  1: "/gallery-art/moonlit-castle.svg",
  2: "/gallery-art/harbor-dawn.svg",
  3: "/gallery-art/sky-temple.svg",
};

/** Zigzag positions along a tall scrollable path */
function buildPath(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    leftPct: i % 2 === 0 ? 14 : 50,
    // Level 1 near bottom, higher levels scroll upward
    topPct: 90 - i * (82 / Math.max(1, count - 1)),
  }));
}

/**
 * Full centered, scrollable winding path map (Dice Dreams–style).
 */
export function LevelMapPopup({
  open,
  onClose,
  playerLevel,
  animateFrom,
  animateTo,
  tapToContinueLevel,
  onTapContinue,
  onBack,
  dismissable = true,
}: {
  open: boolean;
  onClose?: () => void;
  playerLevel: number;
  animateFrom?: number;
  animateTo?: number;
  tapToContinueLevel?: number;
  onTapContinue?: () => void;
  onBack?: () => void;
  dismissable?: boolean;
}) {
  const [brushLevel, setBrushLevel] = useState(playerLevel);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const PATH = buildPath(GALLERIES.length);
  const mapH = 180 + GALLERIES.length * 140;
  const canDismiss = dismissable !== false;

  useEffect(() => {
    if (!open) return;
    if (animateFrom != null && animateTo != null) {
      setBrushLevel(animateFrom);
      const t = window.setTimeout(() => setBrushLevel(animateTo), 800);
      return () => window.clearTimeout(t);
    }
    setBrushLevel(playerLevel);
  }, [open, playerLevel, animateFrom, animateTo]);

  useEffect(() => {
    if (!open || !scrollerRef.current) return;
    const el = scrollerRef.current;
    // Focus near current / brush level
    const idx = Math.max(0, Math.min(GALLERIES.length - 1, brushLevel - 1));
    const target = el.scrollHeight * (PATH[idx]?.topPct ?? 50) * 0.01 - 80;
    el.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  }, [open, brushLevel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-3 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={canDismiss ? onClose : undefined}
        >
          <motion.div
            role="dialog"
            aria-label="Gallery map"
            initial={{ opacity: 0, scale: 0.88, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex h-[min(88dvh,680px)] w-full max-w-[22.5rem] flex-col overflow-hidden rounded-[1.85rem] border-4 border-white"
            style={{
              boxShadow: "0 12px 0 #166534, 0 22px 44px rgba(0,0,0,0.45)",
            }}
          >
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="absolute left-2.5 top-2.5 z-30 flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-white bg-gradient-to-b from-sky-400 to-blue-600 text-xl font-black text-white shadow-[0_4px_0_#1d4ed8]"
                aria-label="Back"
              >
                ‹
              </button>
            )}
            {canDismiss && (
              <button
                type="button"
                onClick={onClose}
                className="absolute right-2.5 top-2.5 z-30 flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-white bg-gradient-to-b from-red-400 to-red-600 text-xl font-black text-white shadow-[0_4px_0_#991b1b]"
                aria-label="Close"
              >
                ×
              </button>
            )}

            <div
              ref={scrollerRef}
              className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain"
              style={{
                background:
                  "linear-gradient(180deg, #7dd3fc 0%, #86efac 14%, #4ade80 45%, #22c55e 100%)",
              }}
            >
              {/* clouds */}
              <div className="pointer-events-none absolute left-4 top-6 h-10 w-32 rounded-full bg-white/80 blur-[1px]" />
              <div className="pointer-events-none absolute right-6 top-16 h-8 w-24 rounded-full bg-white/65" />
              <div className="pointer-events-none absolute left-10 top-[38%] h-7 w-20 rounded-full bg-white/50" />

              {/* flowers */}
              {FLOWERS.map((f, i) => (
                <span
                  key={i}
                  className="pointer-events-none absolute text-[10px]"
                  style={{ left: f.l, top: f.t, opacity: 0.9 }}
                  aria-hidden
                >
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_0_3px_#fde047]" />
                </span>
              ))}

              <div className="sticky top-0 z-20 bg-gradient-to-b from-[#0c4a6e]/90 via-[#0c4a6e]/70 to-transparent px-3 py-3.5 text-center">
                <p
                  className="font-display text-xl font-black text-white"
                  style={{ textShadow: "0 3px 0 rgba(0,0,0,0.55)" }}
                >
                  {tapToContinueLevel
                    ? `Tap Level ${tapToContinueLevel} to enter`
                    : "Gallery Path"}
                </p>
                <p className="mt-0.5 text-xs font-bold text-sky-100">
                  Scroll the path · your level is marked with the brush
                </p>
              </div>

              <div className="relative mx-auto w-full" style={{ height: mapH }}>
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  viewBox={`0 0 360 ${mapH}`}
                  preserveAspectRatio="none"
                >
                  {/* locked / ahead path */}
                  <path
                    d={pathD(PATH, 360, mapH)}
                    fill="none"
                    stroke="rgba(21,128,61,0.55)"
                    strokeWidth="5"
                    strokeDasharray="12 11"
                    strokeLinecap="round"
                  />
                  {/* completed path (white) up to brush */}
                  <path
                    d={pathD(
                      PATH.slice(0, Math.max(1, brushLevel)),
                      360,
                      mapH
                    )}
                    fill="none"
                    stroke="rgba(255,255,255,0.95)"
                    strokeWidth="5"
                    strokeDasharray="12 11"
                    strokeLinecap="round"
                  />
                </svg>

                {GALLERIES.map((g, i) => {
                  const pos = PATH[i] ?? PATH[PATH.length - 1];
                  const unlocked = g.level <= playerLevel;
                  const locked = g.level > playerLevel;
                  const current = g.level === brushLevel;
                  const art =
                    LEVEL_ART[((g.level - 1) % 3) + 1] ?? LEVEL_ART[1];
                  const canTapContinue =
                    tapToContinueLevel != null &&
                    g.level === tapToContinueLevel;

                  return (
                    <div
                      key={g.level}
                      className="absolute w-[46%]"
                      style={{
                        left: `${pos.leftPct}%`,
                        top: `${pos.topPct}%`,
                        transform: "translateY(-20%)",
                      }}
                    >
                      <button
                        type="button"
                        disabled={!canTapContinue}
                        onClick={() => {
                          if (canTapContinue) onTapContinue?.();
                        }}
                        className={`relative aspect-square w-full overflow-hidden rounded-2xl border-[4px] border-white text-left ${
                          canTapContinue
                            ? "ring-4 ring-yellow-300 ring-offset-2 ring-offset-green-500"
                            : ""
                        }`}
                        style={{
                          boxShadow: current
                            ? "0 10px 0 #b45309, 0 16px 24px rgba(0,0,0,0.35)"
                            : locked
                              ? "0 8px 0 #475569, 0 12px 18px rgba(0,0,0,0.3)"
                              : "0 8px 0 #9f1239, 0 12px 18px rgba(0,0,0,0.28)",
                          background: "#0f172a",
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={art}
                          alt=""
                          className={`absolute inset-0 h-full w-full object-cover ${
                            locked ? "grayscale contrast-75 brightness-[0.7]" : ""
                          }`}
                        />
                        {locked && !canTapContinue && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <div
                              className="flex h-16 w-14 flex-col items-center justify-center"
                              aria-label="Locked"
                            >
                              <div className="mb-[-2px] h-4 w-7 rounded-t-full border-[3.5px] border-slate-100 border-b-0" />
                              <div
                                className="flex h-8 w-11 items-center justify-center rounded-md border-2 border-slate-200"
                                style={{
                                  background:
                                    "linear-gradient(180deg,#e2e8f0,#94a3b8)",
                                  boxShadow: "0 4px 0 #64748b",
                                }}
                              >
                                <div className="h-2 w-2 rounded-full bg-slate-600" />
                              </div>
                            </div>
                          </div>
                        )}
                        {canTapContinue && (
                          <motion.div
                            className="absolute inset-0 flex items-center justify-center bg-black/35"
                            animate={{ opacity: [0.5, 0.9, 0.5] }}
                            transition={{ repeat: Infinity, duration: 1.2 }}
                          >
                            <span className="rounded-full border-2 border-white bg-amber-400 px-3 py-1.5 font-display text-sm font-black text-amber-950 shadow-lg">
                              Tap to enter!
                            </span>
                          </motion.div>
                        )}
                        {current && unlocked && !canTapContinue && (
                          <motion.div
                            layout
                            className="absolute -right-3 -top-6 z-10"
                            animate={{ y: [0, -10, 0], rotate: [-10, 10, -10] }}
                            transition={{ repeat: Infinity, duration: 1.05 }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src="/icons/brush-white.webp"
                              alt=""
                              className="h-14 w-14 object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.45)]"
                              draggable={false}
                            />
                          </motion.div>
                        )}
                      </button>
                      <p
                        className="mt-2 rounded-lg bg-black/55 px-2 py-0.5 text-center font-display text-base font-black text-white"
                        style={{ textShadow: "0 2px 0 rgba(0,0,0,0.55)" }}
                      >
                        Level {g.level}
                      </p>
                      <p className="mt-1 rounded-md bg-black/50 px-2 py-0.5 text-center text-[11px] font-black uppercase tracking-wide text-amber-100">
                        {g.name}
                      </p>
                    </div>
                  );
                })}

                {/* gift along the path */}
                <div
                  className="absolute z-10"
                  style={{ left: "68%", top: "55%" }}
                >
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ repeat: Infinity, duration: 1.4 }}
                  >
                    <GameIcon src="/icons/gift.webp" size={52} />
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function pathD(
  nodes: { leftPct: number; topPct: number }[],
  w: number,
  h: number
) {
  return nodes
    .map((n, i) => {
      const x = (n.leftPct / 100) * w + w * 0.12;
      const y = (n.topPct / 100) * h + 40;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

const FLOWERS = [
  { l: "8%", t: "22%" },
  { l: "78%", t: "28%" },
  { l: "12%", t: "48%" },
  { l: "85%", t: "52%" },
  { l: "6%", t: "68%" },
  { l: "72%", t: "78%" },
  { l: "40%", t: "88%" },
  { l: "88%", t: "18%" },
];
