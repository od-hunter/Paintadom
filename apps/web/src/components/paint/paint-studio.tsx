"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Eraser,
  Minus,
  Plus,
  Redo2,
  Undo2,
  Palette,
  Paintbrush,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/store/game-store";
import type { ColoringPage } from "@/types/game";
import { playSfx } from "@/lib/audio";
import { puzzlePointsFromQuality } from "@/data/challenges";
import { useNavLoading } from "@/store/nav-loading";

/** Rich coloring palette — families with light → mid → dark shades */
const PALETTE = [
  // Reds
  "#FECACA",
  "#F87171",
  "#EF4444",
  "#DC2626",
  "#991B1B",
  // Oranges / peach
  "#FED7AA",
  "#FB923C",
  "#F97316",
  "#EA580C",
  "#9A3412",
  // Yellows / gold
  "#FEF08A",
  "#FDE047",
  "#FBBF24",
  "#F59E0B",
  "#B45309",
  // Greens
  "#BBF7D0",
  "#4ADE80",
  "#22C55E",
  "#16A34A",
  "#14532D",
  // Teals / cyan
  "#A5F3FC",
  "#22D3EE",
  "#06B6D4",
  "#0891B2",
  "#155E75",
  // Blues
  "#BFDBFE",
  "#60A5FA",
  "#3B82F6",
  "#2563EB",
  "#1E3A8A",
  // Purples / violet
  "#E9D5FF",
  "#C084FC",
  "#A855F7",
  "#7C3AED",
  "#5B21B6",
  // Pinks / magenta
  "#FBCFE8",
  "#F472B6",
  "#EC4899",
  "#DB2777",
  "#9D174D",
  // Browns / earth
  "#E7C6A5",
  "#D2A679",
  "#A16207",
  "#854D0E",
  "#713F12",
  // Neutrals
  "#FFFFFF",
  "#E2E8F0",
  "#94A3B8",
  "#64748B",
  "#334155",
  "#0F172A",
] as const;

const CANVAS_W = 800;
const CANVAS_H = 1000;

type Tool = "brush" | "eraser";

interface PaintStudioProps {
  page: ColoringPage;
  /** Unlimited paint — no Sparks, no finish rewards */
  freestyle?: boolean;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: { x: number; y: number }, b: { x: number; y: number }) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function PaintStudio({ page, freestyle = false }: PaintStudioProps) {
  const router = useRouter();
  const paintRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const savePageProgress = useGameStore((s) => s.savePageProgress);
  const completePage = useGameStore((s) => s.completePage);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const existing = useGameStore((s) => s.pageProgress[page.id]);
  const isClaimed = Boolean(existing?.completed);
  const stopNavLoading = useNavLoading((s) => s.stop);

  useEffect(() => {
    stopNavLoading();
  }, [stopNavLoading]);

  const [tool, setTool] = useState<Tool>("brush");
  const [color, setColor] = useState<string>(PALETTE[0]);
  const [brushSize, setBrushSize] = useState(18);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [percent, setPercent] = useState(existing?.percent ?? 0);
  const [savedFlash, setSavedFlash] = useState(false);
  /** incomplete | claimReady | claimed */
  const [exitPhase, setExitPhase] = useState<
    "incomplete" | "claimReady" | "claimed" | null
  >(null);
  const [reward, setReward] = useState<{
    sparks: number;
    kp: number;
    puzzlePoints: number;
  } | null>(null);
  const autoClaimPromptRef = useRef(false);

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });

  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef(-1);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  /** Two-finger pinch-zoom + pan */
  const pinchRef = useRef<{
    dist: number;
    scale: number;
    offset: { x: number; y: number };
    center: { x: number; y: number };
  } | null>(null);
  /** Space / middle-mouse / dedicated pan drag (desktop) */
  const panDragRef = useRef<{
    x: number;
    y: number;
    offset: { x: number; y: number };
  } | null>(null);
  const spaceHeldRef = useRef(false);
  const paintedPixelsRef = useRef(0);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);
  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        spaceHeldRef.current = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceHeldRef.current = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const applyView = useCallback((nextScale: number, nextOffset: { x: number; y: number }) => {
    const s = Math.min(4, Math.max(0.55, nextScale));
    // Allow generous pan so canvas can move out from under chrome / hints
    const max = 520 * s;
    const o = {
      x: Math.max(-max, Math.min(max, nextOffset.x)),
      y: Math.max(-max, Math.min(max, nextOffset.y)),
    };
    scaleRef.current = s;
    offsetRef.current = o;
    setScale(s);
    setOffset(o);
  }, []);

  const pushHistory = useCallback(() => {
    const canvas = paintRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(snapshot);
    if (historyRef.current.length > 40) {
      historyRef.current.shift();
    }
    historyIndexRef.current = historyRef.current.length - 1;
  }, []);

  const estimatePercent = useCallback(() => {
    const canvas = paintRef.current;
    if (!canvas) return 0;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return 0;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let painted = 0;
    // Sample every 4th pixel (RGBA stride 16) for a fair fill estimate
    for (let i = 3; i < data.length; i += 16) {
      if (data[i] > 12) painted += 1;
    }
    const sampled = data.length / 16;
    // Slight boost so progress feels rewarding, but 100% still needs near-full coverage
    const coverage = Math.min(100, Math.round((painted / sampled) * 112));
    paintedPixelsRef.current = painted;
    return coverage;
  }, []);

  const persist = useCallback(() => {
    if (freestyle) return; // no progress tracking
    const canvas = paintRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const nextPercent = estimatePercent();
    setPercent(nextPercent);
    savePageProgress(page.id, nextPercent, dataUrl);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1200);
  }, [estimatePercent, page.id, savePageProgress, freestyle]);

  useEffect(() => {
    const canvas = paintRef.current;
    if (!canvas) return;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    if (existing?.canvasData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        // Defer heavy ImageData snapshot so the studio paints first
        window.requestAnimationFrame(() => {
          pushHistory();
          setPercent(estimatePercent());
        });
      };
      img.src = existing.canvasData;
    } else {
      window.requestAnimationFrame(() => pushHistory());
    }
  }, [existing?.canvasData, estimatePercent, pushHistory]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (drawingRef.current) return;
      persist();
    }, 10000);
    return () => window.clearInterval(id);
  }, [persist]);

  const getCanvasPoint = (clientX: number, clientY: number) => {
    const canvas = paintRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const drawStroke = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const canvas = paintRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brushSize * (tool === "eraser" ? 1.4 : 1);
    ctx.globalCompositeOperation =
      tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    const mid = midpoint(from, to);
    ctx.quadraticCurveTo(from.x, from.y, mid.x, mid.y);
    ctx.stroke();
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const wantsPan =
      spaceHeldRef.current ||
      e.button === 1 ||
      e.button === 2 ||
      (e.pointerType === "mouse" && e.altKey);

    if (pointersRef.current.size === 2) {
      // Two fingers: pan + pinch zoom (mobile)
      drawingRef.current = false;
      lastPointRef.current = null;
      panDragRef.current = null;
      const pts = [...pointersRef.current.values()];
      pinchRef.current = {
        dist: distance(pts[0], pts[1]),
        scale: scaleRef.current,
        offset: { ...offsetRef.current },
        center: midpoint(pts[0], pts[1]),
      };
      return;
    }

    if (pointersRef.current.size === 1 && wantsPan) {
      drawingRef.current = false;
      lastPointRef.current = null;
      pinchRef.current = null;
      panDragRef.current = {
        x: e.clientX,
        y: e.clientY,
        offset: { ...offsetRef.current },
      };
      return;
    }

    if (pointersRef.current.size === 1) {
      // Single finger / primary click: paint
      panDragRef.current = null;
      drawingRef.current = true;
      lastPointRef.current = getCanvasPoint(e.clientX, e.clientY);
    }
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2 && pinchRef.current) {
      const pts = [...pointersRef.current.values()];
      const newDist = distance(pts[0], pts[1]);
      const newCenter = midpoint(pts[0], pts[1]);
      const ratio = newDist / Math.max(pinchRef.current.dist, 1);
      // Near-constant distance → mostly pan; spread/pinch → zoom
      const nextScale = pinchRef.current.scale * ratio;
      const dx = newCenter.x - pinchRef.current.center.x;
      const dy = newCenter.y - pinchRef.current.center.y;
      applyView(nextScale, {
        x: pinchRef.current.offset.x + dx,
        y: pinchRef.current.offset.y + dy,
      });
      return;
    }

    if (panDragRef.current && pointersRef.current.size === 1) {
      const dx = e.clientX - panDragRef.current.x;
      const dy = e.clientY - panDragRef.current.y;
      applyView(scaleRef.current, {
        x: panDragRef.current.offset.x + dx,
        y: panDragRef.current.offset.y + dy,
      });
      return;
    }

    if (drawingRef.current && lastPointRef.current) {
      const point = getCanvasPoint(e.clientX, e.clientY);
      drawStroke(lastPointRef.current, point);
      lastPointRef.current = point;
    }
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    const viewport = viewportRef.current;
    if (viewport?.hasPointerCapture(e.pointerId)) {
      viewport.releasePointerCapture(e.pointerId);
    }
    pointersRef.current.delete(e.pointerId);

    if (drawingRef.current) {
      drawingRef.current = false;
      lastPointRef.current = null;
      pushHistory();
      setPercent(estimatePercent());
    }

    if (pointersRef.current.size < 2) {
      pinchRef.current = null;
    }
    if (pointersRef.current.size === 0) {
      panDragRef.current = null;
    }

    if (pointersRef.current.size === 1 && !panDragRef.current) {
      // Remaining finger resumes painting from new position
      const remaining = [...pointersRef.current.values()][0];
      drawingRef.current = true;
      lastPointRef.current = getCanvasPoint(remaining.x, remaining.y);
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    applyView(scaleRef.current * factor, offsetRef.current);
  };

  const undo = () => {
    if (historyIndexRef.current <= 0) return;
    const canvas = paintRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    historyIndexRef.current -= 1;
    ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
    setPercent(estimatePercent());
  };

  const redo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    const canvas = paintRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    historyIndexRef.current += 1;
    ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
    setPercent(estimatePercent());
  };

  const leaveToBook = () => {
    useNavLoading.getState().start("Loading Drawing Book…");
    router.push(freestyle ? "/paint?tab=freestyle" : "/paint");
  };

  /** When the meter first hits 100%, open Claim Sparks automatically */
  useEffect(() => {
    if (freestyle || isClaimed || autoClaimPromptRef.current) return;
    if (percent < 100) return;
    if (exitPhase) return;
    autoClaimPromptRef.current = true;
    setExitPhase("claimReady");
  }, [percent, freestyle, isClaimed, exitPhase]);

  const requestLeave = () => {
    if (freestyle) {
      playSfx("complete", soundEnabled);
      leaveToBook();
      return;
    }

    const pct = estimatePercent();
    setPercent(pct);

    const canvas = paintRef.current;
    if (canvas) {
      savePageProgress(page.id, pct, canvas.toDataURL("image/png"));
    }

    if (pct >= 100) {
      if (useGameStore.getState().pageProgress[page.id]?.completed) {
        leaveToBook();
        return;
      }
      setExitPhase("claimReady");
      return;
    }

    setExitPhase("incomplete");
  };

  const continueLater = () => {
    // Local save only — no wallet signature
    const pct = estimatePercent();
    setPercent(pct);
    const canvas = paintRef.current;
    if (canvas) {
      savePageProgress(page.id, pct, canvas.toDataURL("image/png"));
    }
    setExitPhase(null);
    leaveToBook();
  };

  /** Instant local claim — show claimed briefly, then return to Drawing Book */
  const claimSparks = () => {
    const pct = estimatePercent();
    setPercent(pct);
    if (pct < 100) {
      autoClaimPromptRef.current = false;
      setExitPhase("incomplete");
      return;
    }
    const dataUrl = paintRef.current?.toDataURL("image/png") ?? "";
    savePageProgress(page.id, 100, dataUrl);

    const result = completePage(page.id);
    if (result) {
      playSfx("complete", soundEnabled);
      setReward(result);
      setExitPhase("claimed");
    } else if (useGameStore.getState().pageProgress[page.id]?.completed) {
      leaveToBook();
    } else {
      setExitPhase("incomplete");
    }
  };

  // After claim success, briefly show rewards then return to Drawing Book
  useEffect(() => {
    if (exitPhase !== "claimed" || !reward) return;
    const t = window.setTimeout(() => {
      setExitPhase(null);
      setReward(null);
      leaveToBook();
    }, 1600);
    return () => window.clearTimeout(t);
  }, [exitPhase, reward]);

  const previewMarkers = puzzlePointsFromQuality(100, page.difficulty);

  const exitModal =
    typeof document !== "undefined"
      ? createPortal(
          <AnimatePresence mode="wait">
            {exitPhase === "incomplete" && (
              <motion.div
                key="exit-incomplete"
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="paint-exit-title"
              >
                <motion.div
                  initial={{ scale: 0.8, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="panel-3d w-full max-w-sm p-6 text-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/mascots/pika.webp"
                    alt="Pika"
                    className="mx-auto h-24 w-24 bob"
                  />
                  <h2
                    id="paint-exit-title"
                    className="mt-3 font-display text-2xl font-bold text-ink"
                  >
                    Not finished yet
                  </h2>
                  <p className="mt-1 text-sm font-bold text-ink/60">
                    Paint to 100% to earn Sparks. Your progress is saved.
                  </p>
                  <p className="mt-2 text-xs font-bold text-violet-700">
                    {percent}% painted so far
                  </p>
                  <button
                    type="button"
                    onClick={continueLater}
                    className="btn-3d mt-5 w-full bg-gradient-to-b from-violet-400 to-purple"
                  >
                    Continue later
                  </button>
                  <button
                    type="button"
                    onClick={() => setExitPhase(null)}
                    className="mt-2 w-full py-2 text-sm font-bold text-ink/50"
                  >
                    Cancel
                  </button>
                </motion.div>
              </motion.div>
            )}

            {exitPhase === "claimReady" && (
              <motion.div
                key="exit-claim"
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                role="dialog"
                aria-modal="true"
              >
                <motion.div
                  initial={{ scale: 0.8, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="panel-3d w-full max-w-sm p-6 text-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/mascots/pika.webp"
                    alt="Pika"
                    className="mx-auto h-24 w-24 bob"
                  />
                  <h2 className="mt-3 font-display text-2xl font-bold text-ink">
                    Masterpiece ready!
                  </h2>
                  <p className="mt-1 text-sm font-bold text-ink/60">
                    Claim Sparks now, or keep painting and claim later.
                  </p>
                  <div className="mt-3 flex justify-center gap-2">
                    <span className="chip-3d">+{page.sparksReward} Sparks</span>
                    <span className="chip-3d">+{previewMarkers} Markers</span>
                  </div>
                  <button
                    type="button"
                    onClick={claimSparks}
                    className="btn-3d-claim mt-5 w-full"
                  >
                    Claim Sparks
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const pct = estimatePercent();
                      setPercent(pct);
                      const canvas = paintRef.current;
                      if (canvas) {
                        savePageProgress(
                          page.id,
                          pct,
                          canvas.toDataURL("image/png")
                        );
                      }
                      setExitPhase(null);
                    }}
                    className="mt-2 w-full py-2 text-sm font-bold text-ink/50"
                  >
                    Continue painting
                  </button>
                </motion.div>
              </motion.div>
            )}

            {exitPhase === "claimed" && reward && (
              <motion.div
                key="exit-claimed"
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                role="dialog"
                aria-modal="true"
              >
                <motion.div
                  initial={{ scale: 0.85, y: 12 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="panel-3d w-full max-w-sm p-6 text-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/mascots/pika.webp"
                    alt="Pika"
                    className="mx-auto h-24 w-24 bob"
                  />
                  <h2 className="mt-3 font-display text-2xl font-bold text-ink">
                    Claimed!
                  </h2>
                  <p className="mt-1 text-sm font-bold text-ink/60">
                    Nice work — here&apos;s what you earned
                  </p>
                  <div className="mt-4 flex flex-col items-center gap-2">
                    <span className="chip-3d text-base">
                      +{reward.sparks} Sparks
                    </span>
                    <span className="chip-3d text-base">
                      +{reward.puzzlePoints} Markers
                    </span>
                  </div>
                  <p className="mt-4 text-xs font-bold text-ink/45">
                    Returning to Drawing Book…
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )
      : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-sky-200 to-violet-200">
      <div className="flex items-center justify-between gap-2 border-b-2 border-white/60 bg-white/70 px-3 py-2 backdrop-blur">
        <button
          type="button"
          onClick={requestLeave}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-ink" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate font-display text-sm font-bold text-ink">
            {freestyle ? "Freestyle · no rewards" : page.title}
          </p>
          {!freestyle && (
            <>
              <div className="mx-auto mt-1 h-1.5 w-40 overflow-hidden rounded-full bg-violet-100">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-purple to-pink"
                  animate={{ width: `${percent}%` }}
                />
              </div>
              <p className="mt-0.5 text-[10px] font-bold text-ink/50">
                {percent}% painted
                {percent < 100 ? " · finish for Sparks" : " · ready to claim"}
              </p>
            </>
          )}
          {freestyle && (
            <p className="mt-0.5 text-[10px] font-bold text-sky-700">
              Paint freely — nothing to earn
            </p>
          )}
        </div>
        {/* Spacer keeps title centered opposite the back button */}
        <div className="h-10 w-10 shrink-0" aria-hidden />
      </div>

      <div
        ref={viewportRef}
        className="relative flex-1 touch-none overflow-hidden bg-[#0B1220]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div
          className="absolute left-1/2 top-1/2 origin-center will-change-transform"
          style={{
            transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
            width: "min(92vw, 420px)",
          }}
        >
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/10">
            <canvas
              ref={paintRef}
              className="absolute inset-0 h-full w-full"
              style={{ touchAction: "none" }}
            />
            {page.lineArt && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={page.lineArt}
                alt=""
                draggable={false}
                className="pointer-events-none absolute inset-0 h-full w-full object-contain"
              />
            )}
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center px-3">
          <p className="rounded-full bg-black/55 px-3 py-1.5 text-center text-[10px] font-bold leading-snug text-white/90">
            1 finger draw · 2 fingers drag to move · Pinch to zoom
            <span className="hidden sm:inline">
              {" "}
              · Desktop: Space+drag or scroll to zoom
            </span>
          </p>
        </div>

        <AnimatePresence>
          {savedFlash && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute right-3 top-3 rounded-full bg-emerald/90 px-3 py-1 text-[10px] font-bold text-white"
            >
              Auto-saved
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="border-t-2 border-white/60 bg-white/80 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <ToolButton active={tool === "brush"} onClick={() => setTool("brush")} label="Brush">
              <Paintbrush className="h-4 w-4" />
            </ToolButton>
            <ToolButton active={tool === "eraser"} onClick={() => setTool("eraser")} label="Eraser">
              <Eraser className="h-4 w-4" />
            </ToolButton>
            <ToolButton onClick={undo} label="Undo">
              <Undo2 className="h-4 w-4" />
            </ToolButton>
            <ToolButton onClick={redo} label="Redo">
              <Redo2 className="h-4 w-4" />
            </ToolButton>
          </div>

          <div className="flex items-center gap-1 rounded-2xl bg-violet-50 px-2 py-1">
            <button type="button" aria-label="Smaller brush" onClick={() => setBrushSize((s) => Math.max(4, s - 2))}>
              <Minus className="h-4 w-4 text-ink" />
            </button>
            <span className="w-6 text-center text-xs font-bold text-ink">{brushSize}</span>
            <button type="button" aria-label="Larger brush" onClick={() => setBrushSize((s) => Math.min(48, s + 2))}>
              <Plus className="h-4 w-4 text-ink" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setPaletteOpen((v) => !v)}
            className="flex h-10 items-center gap-2 rounded-2xl bg-white px-3 shadow"
          >
            <span className="h-5 w-5 rounded-full border border-violet-200" style={{ background: color }} />
            <Palette className="h-4 w-4 text-ink" />
          </button>
        </div>

        <AnimatePresence>
          {paletteOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mx-auto mt-2 max-w-lg overflow-hidden"
            >
              <div className="max-h-[40vh] overflow-y-auto rounded-2xl bg-white p-3 shadow">
                <p className="mb-2 text-center text-[10px] font-black uppercase tracking-wide text-ink/45">
                  Shades · tap to paint
                </p>
                <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
                  {PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setColor(c);
                        setTool("brush");
                        setPaletteOpen(false);
                      }}
                      className={cn(
                        "aspect-square w-full rounded-full border-2 shadow-sm",
                        color === c
                          ? "scale-110 border-gold ring-2 ring-gold/40"
                          : "border-black/10"
                      )}
                      style={{ background: c }}
                      aria-label={`Color ${c}`}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {exitModal}
    </div>
  );
}

function ToolButton({
  children,
  onClick,
  active,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-xl transition",
        active ? "bg-purple text-white shadow" : "bg-white text-ink shadow"
      )}
    >
      {children}
    </button>
  );
}
