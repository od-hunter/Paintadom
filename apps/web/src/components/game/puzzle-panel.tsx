"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { useGameStore } from "@/store/game-store";
import { getPuzzleLevel, MAX_PUZZLE_LEVEL } from "@/data/challenges";
import { GameIcon } from "@/components/ui/game-icon";
import { CenteredModal } from "@/components/ui/centered-modal";
import { jigsawPath } from "@/components/game/jigsaw-paths";
import { playSfx } from "@/lib/audio";

type LevelClear = {
  level: number;
  title: string;
  sparks: number;
  allDone: boolean;
};

export function PuzzlePanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const puzzleLevel = useGameStore((s) => s.puzzleLevel);
  const puzzlePoints = useGameStore((s) => s.puzzlePoints);
  const puzzleUnlocked = useGameStore((s) => s.puzzleUnlocked);
  const unlockPuzzlePiece = useGameStore((s) => s.unlockPuzzlePiece);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const [flash, setFlash] = useState<string | null>(null);
  const [levelClear, setLevelClear] = useState<LevelClear | null>(null);
  const levelBarRef = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, "");
  const pz = getPuzzleLevel(puzzleLevel);
  const unlocked = puzzleUnlocked[pz.id] ?? [];
  const piecesDone = unlocked.length;
  const piecesTotal = pz.pieces.length;

  // Keep current level chip in view on the level bar
  useEffect(() => {
    if (!open) return;
    const root = levelBarRef.current;
    if (!root) return;
    const chip = root.querySelector<HTMLElement>(`[data-level="${puzzleLevel}"]`);
    chip?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [open, puzzleLevel]);

  useEffect(() => {
    if (!levelClear) return;
    const t = window.setTimeout(() => setLevelClear(null), 2800);
    return () => window.clearTimeout(t);
  }, [levelClear]);

  useEffect(() => {
    if (!open) {
      setLevelClear(null);
      setFlash(null);
    }
  }, [open]);

  const onUnlock = (pieceId: string, isOn: boolean) => {
    if (isOn || levelClear) return;
    const completingLevel = puzzleLevel;
    const completingTitle = pz.title;
    const res = unlockPuzzlePiece(pieceId);
    if (!res.ok) {
      setFlash(res.reason ?? "Can't unlock");
      return;
    }
    if (res.completed && res.sparks != null) {
      playSfx("complete", soundEnabled);
      setFlash(null);
      setLevelClear({
        level: res.completedLevel ?? completingLevel,
        title: completingTitle,
        sparks: res.sparks,
        allDone:
          (res.completedLevel ?? completingLevel) >= MAX_PUZZLE_LEVEL ||
          puzzleLevel >= MAX_PUZZLE_LEVEL,
      });
      return;
    }
    setFlash("Piece unlocked!");
  };

  return (
    <CenteredModal open={open} onClose={onClose} zIndex={92}>
      <div className="relative flex max-h-[min(88dvh,680px)] w-full flex-col overflow-hidden rounded-[1.75rem] border-4 border-white bg-white shadow-[0_12px_0_rgba(0,0,0,0.28)]">
        <div className="relative shrink-0 bg-gradient-to-r from-violet-400 to-purple-600 px-4 py-3 text-center">
          <h2
            className="font-display text-xl font-black text-white"
            style={{ textShadow: "0 2px 0 rgba(0,0,0,0.35)" }}
          >
            Puzzle
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-red-500 text-lg font-black text-white"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {/* Level progress bar */}
          <div className="mb-3">
            <div className="mb-1.5 flex items-center justify-between px-0.5">
              <p className="text-[10px] font-black uppercase tracking-wide text-violet-800">
                Levels
              </p>
              <p className="text-[10px] font-black text-slate-600">
                Lv {Math.min(puzzleLevel, MAX_PUZZLE_LEVEL)} / {MAX_PUZZLE_LEVEL}
              </p>
            </div>
            <div
              ref={levelBarRef}
              className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none"
            >
              {Array.from({ length: MAX_PUZZLE_LEVEL }, (_, i) => {
                const lvl = i + 1;
                const cleared = lvl < puzzleLevel;
                const current = lvl === puzzleLevel;
                return (
                  <div
                    key={lvl}
                    data-level={lvl}
                    className={`flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-full border-2 text-[10px] font-black transition ${
                      cleared
                        ? "border-emerald-600 bg-emerald-500 text-white shadow-[0_2px_0_#047857]"
                        : current
                          ? "border-violet-700 bg-violet-600 text-white shadow-[0_2px_0_#5b21b6] ring-2 ring-violet-300"
                          : "border-slate-300 bg-slate-100 text-slate-500"
                    }`}
                    aria-label={
                      cleared
                        ? `Level ${lvl} completed`
                        : current
                          ? `Level ${lvl} current`
                          : `Level ${lvl} locked`
                    }
                  >
                    {cleared ? (
                      <Check className="h-4 w-4 stroke-[3]" aria-hidden />
                    ) : (
                      lvl
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-violet-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    ((puzzleLevel - 1) / MAX_PUZZLE_LEVEL) * 100
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Status chips */}
          <div className="flex items-stretch gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border-[3px] border-violet-700 bg-violet-50 px-3 py-2.5 shadow-[0_3px_0_#5b21b6]">
              <GameIcon src="/icons/puzzle.webp" size={28} />
              <div className="min-w-0">
                <p className="truncate text-[11px] font-black uppercase tracking-wide text-violet-800">
                  Level {pz.level}
                </p>
                <p className="truncate font-display text-sm font-black text-slate-900">
                  {pz.title}
                </p>
                <p className="text-[10px] font-bold text-violet-700">
                  {piecesDone}/{piecesTotal} pieces
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-center justify-center rounded-2xl border-[3px] border-amber-600 bg-amber-100 px-3 py-2 shadow-[0_3px_0_#b45309]">
              <p className="text-[9px] font-black uppercase text-amber-900">
                Markers
              </p>
              <p className="font-display text-lg font-black leading-none text-amber-950">
                {puzzlePoints}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-center justify-center rounded-2xl border-[3px] border-yellow-500 bg-yellow-100 px-2.5 py-2 shadow-[0_3px_0_#a16207]">
              <GameIcon src="/icons/sparks.webp" size={20} />
              <p className="mt-0.5 font-display text-sm font-black text-amber-950">
                +{pz.completeSparks}
              </p>
            </div>
          </div>

          {/* 3D interlocking jigsaw board */}
          <div
            className="relative mx-auto mt-3 aspect-square w-full max-w-[20rem] overflow-visible rounded-[1.25rem] border-[5px] border-pink-400 p-2"
            style={{
              background: "linear-gradient(160deg,#fce7f3,#f9a8d4)",
              boxShadow:
                "0 10px 0 #be185d, inset 0 2px 0 rgba(255,255,255,0.55)",
            }}
          >
            <svg
              viewBox="-20 -20 340 340"
              className="h-full w-full drop-shadow-[0_8px_12px_rgba(0,0,0,0.35)]"
            >
              <defs>
                {pz.pieces.map((piece) => (
                  <clipPath
                    key={`c-${piece.id}`}
                    id={`${uid}-clip-${piece.index}`}
                  >
                    <path d={jigsawPath(piece.index)} />
                  </clipPath>
                ))}
                <filter
                  id={`${uid}-bevel`}
                  x="-20%"
                  y="-20%"
                  width="140%"
                  height="140%"
                >
                  <feDropShadow
                    dx="0"
                    dy="3"
                    stdDeviation="2"
                    floodColor="#000"
                    floodOpacity="0.35"
                  />
                </filter>
                <linearGradient id={`${uid}-wood`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f5e6c8" />
                  <stop offset="100%" stopColor="#d4b896" />
                </linearGradient>
              </defs>

              {pz.pieces.map((piece) => {
                const isOn = unlocked.includes(piece.id);
                const path = jigsawPath(piece.index);
                return (
                  <g
                    key={`${pz.id}-${piece.id}`}
                    filter={`url(#${uid}-bevel)`}
                    className="cursor-pointer"
                    onClick={() => onUnlock(piece.id, isOn)}
                  >
                    {!isOn && (
                      <path
                        d={path}
                        fill={`url(#${uid}-wood)`}
                        stroke="#c4a574"
                        strokeWidth="2"
                      />
                    )}
                    {isOn && (
                      <image
                        href={pz.art}
                        x="0"
                        y="0"
                        width="300"
                        height="300"
                        preserveAspectRatio="xMidYMid slice"
                        clipPath={`url(#${uid}-clip-${piece.index})`}
                      />
                    )}
                    <path
                      d={path}
                      fill="none"
                      stroke={isOn ? "rgba(255,255,255,0.65)" : "#a67c3a"}
                      strokeWidth="2.5"
                    />
                    {!isOn && (
                      <foreignObject
                        x={(piece.index % 3) * 100 + 18}
                        y={Math.floor(piece.index / 3) * 100 + 28}
                        width="64"
                        height="48"
                      >
                        <div className="flex h-full flex-col items-center justify-center">
                          {piece.gift && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src="/icons/gift.webp"
                              alt=""
                              className="h-5 w-5"
                            />
                          )}
                          <span className="mt-0.5 rounded-full bg-blue-700 px-1.5 py-0.5 text-[10px] font-black text-white shadow">
                            {piece.cost}
                          </span>
                        </div>
                      </foreignObject>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          <p className="mt-3 rounded-2xl border-2 border-violet-200 bg-violet-50 px-3 py-2.5 text-center text-[12px] font-bold leading-snug text-slate-800">
            Paint more accurately to earn{" "}
            <span className="font-black text-violet-800">Markers</span>. Spend
            them to unlock each jigsaw piece.
          </p>
          {flash && !levelClear && (
            <p className="mt-2 text-center text-sm font-black text-emerald-700">
              {flash}
            </p>
          )}
        </div>

        {/* Level-complete Sparks popup */}
        <AnimatePresence>
          {levelClear && (
            <motion.div
              className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 p-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                initial={{ scale: 0.75, y: 16 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-[16rem] rounded-3xl border-4 border-white bg-gradient-to-b from-amber-50 to-white p-5 text-center shadow-[0_10px_0_rgba(0,0,0,0.25)]"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_3px_0_#047857]">
                  <Check className="h-7 w-7 stroke-[3]" />
                </div>
                <p className="mt-3 font-display text-xl font-black text-slate-900">
                  Level {levelClear.level} clear!
                </p>
                <p className="mt-1 text-xs font-bold text-slate-600">
                  {levelClear.title}
                </p>
                <p className="mt-3 inline-flex items-center gap-1 rounded-full border-2 border-amber-400 bg-amber-100 px-3 py-1.5 font-display text-lg font-black text-amber-950">
                  <GameIcon src="/icons/sparks.webp" size={22} />+
                  {levelClear.sparks} Sparks
                </p>
                <button
                  type="button"
                  onClick={() => setLevelClear(null)}
                  className="btn-lime mt-4 w-full py-2.5 text-sm"
                >
                  {levelClear.allDone ? "Awesome!" : "Next level"}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </CenteredModal>
  );
}
