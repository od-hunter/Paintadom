"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGameStore } from "@/store/game-store";
import {
  getGallery,
  hungFramesCount,
  totalFrames,
  artForFrame,
} from "@/data/buildings";
import { GameIcon } from "@/components/ui/game-icon";

export function BuildPanel({
  open,
  onClose,
  onBuilt,
  onNeedSparks,
}: {
  open: boolean;
  onClose: () => void;
  onBuilt?: (
    frameId: string,
    advanced?: boolean,
    completedLevel?: number
  ) => void;
  onNeedSparks?: () => void;
}) {
  const level = useGameStore((s) => s.level);
  const sparks = useGameStore((s) => s.sparks);
  const buildingStages = useGameStore((s) => s.buildingStages);
  const buildStage = useGameStore((s) => s.buildStage);
  const frameCost = useGameStore((s) => s.frameCost);
  const artDiscountPct = useGameStore((s) => s.artDiscountPct);
  const artDiscountUntil = useGameStore((s) => s.artDiscountUntil);
  const gallery = getGallery(level);
  const hung = hungFramesCount(gallery, buildingStages);
  const total = totalFrames(gallery);
  const discountLive =
    artDiscountPct > 0 && artDiscountUntil > Date.now();
  const [hangError, setHangError] = useState<string | null>(null);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const firstUnboughtRef = useRef<HTMLDivElement>(null);
  const swipeAnimRef = useRef<number | null>(null);

  /** Bought (hung) on the left · unbought on the right — open then swipe to unbought */
  const orderedFrames = useMemo(() => {
    const bought = gallery.frames.filter(
      (f) => (buildingStages[f.id] ?? 0) >= 1
    );
    const unbought = gallery.frames.filter(
      (f) => (buildingStages[f.id] ?? 0) < 1
    );
    return { bought, unbought, all: [...bought, ...unbought] };
  }, [gallery.frames, buildingStages]);

  useEffect(() => {
    if (!open) {
      if (swipeAnimRef.current != null) {
        window.cancelAnimationFrame(swipeAnimRef.current);
        swipeAnimRef.current = null;
      }
      return;
    }

    const scroller = scrollerRef.current;
    if (scroller) scroller.scrollLeft = 0;

    const startDelay = window.setTimeout(() => {
      const el = scrollerRef.current;
      const target = firstUnboughtRef.current;
      if (!el || !target) return;
      if (orderedFrames.bought.length === 0) return;

      const to = Math.max(0, target.offsetLeft - 12);
      const from = 0;
      if (to <= 4) return;

      const duration = Math.min(900, 420 + to * 0.55);
      const t0 = performance.now();
      const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        el.scrollLeft = from + (to - from) * easeOutCubic(p);
        if (p < 1) {
          swipeAnimRef.current = window.requestAnimationFrame(tick);
        } else {
          swipeAnimRef.current = null;
        }
      };
      swipeAnimRef.current = window.requestAnimationFrame(tick);
    }, 380);

    return () => {
      window.clearTimeout(startDelay);
      if (swipeAnimRef.current != null) {
        window.cancelAnimationFrame(swipeAnimRef.current);
        swipeAnimRef.current = null;
      }
    };
  }, [open, orderedFrames.bought.length, orderedFrames.unbought.length]);

  /** Instant local buy — no wallet signer (keeps gallery snappy) */
  const hangArt = (frameId: string) => {
    setHangError(null);
    const res = buildStage(frameId);
    if (res.ok) {
      onBuilt?.(frameId, res.advancedLevel, res.completedLevel);
    } else {
      setHangError(res.reason || "Could not hang art");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close gallery panel"
            className="fixed inset-0 z-[70] bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="fixed inset-x-0 bottom-0 z-[75] mx-auto max-h-[72vh] max-w-lg overflow-hidden rounded-t-[1.75rem] border-t-4 border-x-4 border-white bg-gradient-to-b from-[#FDE68A] to-[#FBBF24] shadow-2xl"
          >
            <div className="relative px-3 pb-6 pt-2">
              <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-white/70" />
              <div className="mx-auto -mt-1 w-fit rounded-b-2xl bg-white px-5 py-1 shadow">
                <p className="font-display text-sm font-black uppercase tracking-wide text-amber-800">
                  Gallery {level} · {gallery.name}
                </p>
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-full bg-amber-950 px-3 py-2">
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-black/30">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-lime-300 to-emerald-400"
                    style={{ width: `${Math.round((hung / total) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-black text-white">
                  {hung}/{total} hung
                </span>
                <GameIcon src="/icons/gift.webp" size={22} />
              </div>

              <p className="mt-2 flex items-center justify-center gap-1 text-center text-[11px] font-bold text-amber-950/80">
                Preview in B&W · buy to reveal color ·{" "}
                <GameIcon src="/icons/sparks.webp" size={14} /> {sparks}
              </p>
              {orderedFrames.bought.length > 0 &&
                orderedFrames.unbought.length > 0 && (
                  <p className="mt-1 text-center text-[11px] font-black text-amber-900/70">
                    ← Swipe right to see hung art
                  </p>
                )}
              {discountLive && (
                <p className="mt-1 text-center text-[11px] font-black text-emerald-800">
                  {artDiscountPct}% off art prices — limited time!
                </p>
              )}
              {hangError && (
                <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-center text-[11px] font-bold leading-snug text-red-800">
                  {hangError}
                </p>
              )}

              <div
                ref={scrollerRef}
                className="mt-3 flex gap-3 overflow-x-auto pb-2 scrollbar-none"
              >
                {orderedFrames.all.map((f) => {
                  const stage = buildingStages[f.id] ?? 0;
                  const hungFrame = stage >= 1;
                  const cost = frameCost(f.stageCost);
                  const canAfford = sparks >= cost;
                  const art = artForFrame(f);
                  const isFirstUnbought =
                    !hungFrame &&
                    orderedFrames.unbought[0]?.id === f.id;
                  return (
                    <div
                      key={f.id}
                      ref={isFirstUnbought ? firstUnboughtRef : undefined}
                      className="flex w-[10rem] shrink-0 flex-col rounded-2xl border-2 border-white bg-white/95 p-2 shadow"
                    >
                      <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-lg border-2 border-amber-700 bg-gradient-to-br from-amber-200 to-amber-700">
                        <div className="absolute inset-[10%] overflow-hidden rounded-sm bg-[#fff7ed]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={art.src}
                            alt={art.title}
                            className={`h-full w-full object-cover transition ${
                              hungFrame
                                ? ""
                                : "grayscale contrast-90 opacity-90"
                            }`}
                          />
                        </div>
                      </div>
                      <p className="mt-1 truncate text-center text-xs font-black text-ink">
                        {art.title}
                      </p>
                      <p className="mt-0.5 flex items-center justify-center gap-0.5 text-[10px] font-bold text-amber-900/70">
                        <GameIcon src="/icons/sparks.webp" size={12} />
                        {cost} Sparks
                        {discountLive && cost < f.stageCost && (
                          <span className="ml-1 line-through opacity-50">
                            {f.stageCost}
                          </span>
                        )}
                      </p>
                      {hungFrame ? (
                        <span className="mt-2 rounded-xl bg-emerald-100 py-2 text-center text-xs font-black text-emerald-700">
                          On the wall
                        </span>
                      ) : canAfford ? (
                        <button
                          type="button"
                          onClick={() => hangArt(f.id)}
                          className="btn-lime mt-2 w-full rounded-xl border-b-4 py-2 text-sm"
                        >
                          Buy
                        </button>
                      ) : (
                        <div className="mt-2 space-y-1.5">
                          <p className="text-center text-[10px] font-bold text-orange-800">
                            Need {cost - sparks} more Sparks
                          </p>
                          <Link
                            href="/paint"
                            onClick={onClose}
                            className="flex w-full items-center justify-center gap-1 rounded-xl border-b-4 border-blue-700 bg-gradient-to-b from-sky-300 to-blue-500 py-1.5 text-xs font-black text-white"
                          >
                            <GameIcon src="/icons/paint.webp" size={14} />
                            Paint to earn
                          </Link>
                          <button
                            type="button"
                            onClick={() => onNeedSparks?.()}
                            className="flex w-full items-center justify-center gap-1 rounded-xl border-b-4 border-orange-700 bg-gradient-to-b from-orange-300 to-orange-500 py-1.5 text-xs font-black text-white"
                          >
                            Buy Sparks
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
