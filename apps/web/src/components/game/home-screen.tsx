"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/game-store";
import { COLORING_PAGES, getPlayPageId, pagesForLevel } from "@/data/pages";
import {
  getGallery,
  hungFramesCount,
  totalFrames,
  artForFrame,
} from "@/data/buildings";
import { BuildPanel } from "@/components/game/build-panel";
import { SparkShop } from "@/components/game/spark-shop";
import { LevelUpFlow } from "@/components/game/level-up-flow";
import { ChallengeRails } from "@/components/game/challenge-rails";
import { GameIcon } from "@/components/ui/game-icon";
import { useNavLoading } from "@/store/nav-loading";

/** Room larger than the phone — scroll / drag to explore */
const ROOM_W = "185%";
const ROOM_H = "150%";

export function HomeScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const stopNavLoading = useNavLoading((s) => s.stop);
  const startNavLoading = useNavLoading((s) => s.start);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [justHung, setJustHung] = useState<string | null>(null);
  const [hintPan, setHintPan] = useState(true);
  const [levelUp, setLevelUp] = useState<{
    completed: number;
    next: number;
  } | null>(null);

  const level = useGameStore((s) => s.level);
  const buildingStages = useGameStore((s) => s.buildingStages);
  const pageProgress = useGameStore((s) => s.pageProgress);
  const artDiscountPct = useGameStore((s) => s.artDiscountPct);
  const artDiscountUntil = useGameStore((s) => s.artDiscountUntil);
  const touchDailyActivity = useGameStore((s) => s.touchDailyActivity);
  const refreshExpiredGoals = useGameStore((s) => s.refreshExpiredGoals);
  const markHomeEntered = useGameStore((s) => s.markHomeEntered);

  useEffect(() => {
    stopNavLoading();
    touchDailyActivity();
    refreshExpiredGoals();
    markHomeEntered();
  }, [stopNavLoading, touchDailyActivity, refreshExpiredGoals, markHomeEntered]);

  /** Prefetch paint studio so Drawing Book / Play opens quickly */
  useEffect(() => {
    void import("@/components/paint/paint-studio");
    router.prefetch("/paint");
  }, [router]);

  useEffect(() => {
    if (searchParams.get("build") === "1" || searchParams.get("gallery") === "1") {
      setGalleryOpen(true);
      router.replace("/", { scroll: false });
    }
    if (searchParams.get("shop") === "1") {
      setShopOpen(true);
      router.replace("/", { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyBg: body.style.background,
      bodyH: body.style.height,
      htmlH: html.style.height,
    };
    html.style.overflow = "hidden";
    html.style.height = "100%";
    body.style.overflow = "hidden";
    body.style.height = "100%";
    body.style.background = "#2a1f14";
    return () => {
      html.style.overflow = prev.htmlOverflow;
      html.style.height = prev.htmlH;
      body.style.overflow = prev.bodyOverflow;
      body.style.height = prev.bodyH;
      body.style.background = prev.bodyBg;
    };
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setHintPan(false), 4000);
    return () => window.clearTimeout(t);
  }, []);

  const gallery = getGallery(level);
  const roomBg = gallery.backdrop;
  const hung = hungFramesCount(gallery, buildingStages);
  const total = totalFrames(gallery);

  const playPageId = getPlayPageId(level, pageProgress);
  const playPage =
    COLORING_PAGES.find((p) => p.id === playPageId) ?? pagesForLevel(level)[0];
  const levelPages = pagesForLevel(level);
  const drawingsDone = levelPages.filter(
    (p) => pageProgress[p.id]?.completed
  ).length;

  const pendingFrames = gallery.frames.filter(
    (f) => (buildingStages[f.id] ?? 0) < f.maxStages
  ).length;

  const hungList = gallery.frames.filter(
    (f) => (buildingStages[f.id] ?? 0) >= 1
  );

  const discountLive =
    artDiscountPct > 0 && artDiscountUntil > Date.now();

  return (
    <div className="fixed inset-0 z-[5] mx-auto flex w-full max-w-lg justify-center overflow-hidden bg-[#2a1f14]">
      <div className="relative h-full w-full max-w-lg">
      <div className="pointer-events-none absolute inset-0">
        <Image
          src={roomBg}
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
          draggable={false}
        />
      </div>

      <div
        className="absolute inset-0 overflow-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: "touch" }}
        onScroll={() => setHintPan(false)}
      >
        <div
          className="relative"
          style={{
            width: ROOM_W,
            height: ROOM_H,
            minWidth: "100%",
            minHeight: "100%",
          }}
        >
          <Image
            src={roomBg}
            alt=""
            fill
            priority
            className="object-cover object-center"
            sizes="900px"
            draggable={false}
          />

          {hungList.map((f) => {
            const art = artForFrame(f);
            return (
              <motion.div
                key={f.id}
                className="absolute"
                style={{
                  left: `${f.x}%`,
                  top: `${f.y}%`,
                  width: `${f.size}%`,
                  transform: "translate(-50%, -50%)",
                  zIndex: 6,
                }}
                initial={justHung === f.id ? { scale: 0.7, opacity: 0 } : false}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 280, damping: 16 }}
              >
                <div
                  className="relative aspect-square overflow-hidden rounded-md"
                  style={{
                    boxShadow:
                      "inset 0 0 0 3px #92400e, 0 8px 16px rgba(0,0,0,0.45)",
                    background:
                      "linear-gradient(145deg, #fbbf24, #b45309 40%, #78350f)",
                    border: "3px solid #fde68a",
                  }}
                >
                  <div className="absolute inset-[7%] overflow-hidden rounded-sm bg-[#fff7ed]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={art.src}
                      alt={art.title}
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  </div>
                </div>
                {justHung === f.id && (
                  <motion.span
                    initial={{ opacity: 1, y: 0 }}
                    animate={{ opacity: 0, y: -28 }}
                    transition={{ duration: 1.1 }}
                    className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-amber-950"
                  >
                    Hung!
                  </motion.span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-20">
        <AnimatePresence>
          {hintPan && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute left-1/2 top-[36%] -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[10px] font-bold text-white"
            >
              Scroll to look around
            </motion.p>
          )}
        </AnimatePresence>

        <div className="absolute left-1/2 top-[40%] w-[72%] -translate-x-1/2 text-center">
          <p
            className="font-display text-2xl font-black text-white"
            style={{ textShadow: "0 3px 0 rgba(0,0,0,0.45)" }}
          >
            {gallery.name}
          </p>
          <p className="mt-1 inline-block rounded-full bg-black/45 px-3 py-0.5 text-[11px] font-bold text-white">
            {hung}/{total} frames hung
          </p>
          {discountLive && (
            <p className="mt-1 inline-block rounded-full bg-lime-400 px-3 py-0.5 text-[10px] font-black text-green-900">
              {artDiscountPct}% off arts — limited time!
            </p>
          )}
        </div>
      </div>

      <ChallengeRails />

      <div className="absolute inset-x-0 bottom-0 z-30 px-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-2">
        <div className="relative flex items-end justify-between">
          <Link
            href="/paint"
            prefetch
            onClick={() => startNavLoading("Loading Drawing Book…")}
            className="relative flex h-14 w-14 items-center justify-center rounded-2xl border-[3px] border-white bg-gradient-to-b from-cyan-300 to-blue-600 shadow-[0_5px_0_#1d4ed8] active:translate-y-1"
            aria-label="Drawing library"
          >
            <GameIcon src="/icons/album.webp" size={48} />
            <span className="absolute -bottom-1 rounded-full bg-black/55 px-1.5 text-[8px] font-black text-white">
              {drawingsDone}/{levelPages.length}
            </span>
          </Link>

          <Link
            href={`/paint/${playPage.id}`}
            prefetch
            onClick={() => startNavLoading("Opening paint room…")}
            aria-label="Start painting"
            className="absolute bottom-[2.35rem] left-1/2 z-10 flex h-[5.35rem] w-[5.35rem] -translate-x-1/2 items-center justify-center rounded-full border-[5px] border-white active:translate-y-1"
            style={{
              background:
                "linear-gradient(180deg, #fb7185 0%, #e11d48 42%, #be123c 100%)",
              boxShadow:
                "0 8px 0 #9f1239, 0 14px 24px rgba(159,18,57,0.5), inset 0 3px 0 rgba(255,255,255,0.35)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/brush-white.webp"
              alt=""
              className="h-12 w-12 object-contain"
              style={{ background: "transparent" }}
              draggable={false}
            />
          </Link>

          <button
            type="button"
            onClick={() => setGalleryOpen(true)}
            className="relative flex h-14 w-14 items-center justify-center rounded-2xl border-[3px] border-white bg-gradient-to-b from-amber-200 to-orange-500 shadow-[0_5px_0_#c2410c] active:translate-y-1"
            aria-label="Paint gallery"
          >
            <GameIcon src="/icons/gallery.webp" size={48} />
            {pendingFrames > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-black text-white">
                {pendingFrames}
              </span>
            )}
          </button>
        </div>
      </div>

      <BuildPanel
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onBuilt={(id, advanced, completedLevel) => {
          setJustHung(id);
          window.setTimeout(() => setJustHung(null), 1200);
          if (advanced && completedLevel != null) {
            setGalleryOpen(false);
            setLevelUp({
              completed: completedLevel,
              next: completedLevel + 1,
            });
          }
        }}
        onNeedSparks={() => {
          setGalleryOpen(false);
          setShopOpen(true);
        }}
      />
      <SparkShop open={shopOpen} onClose={() => setShopOpen(false)} />
      <LevelUpFlow
        open={!!levelUp}
        completedLevel={levelUp?.completed ?? 1}
        nextLevel={levelUp?.next ?? 2}
        onFinished={() => setLevelUp(null)}
      />
      </div>
    </div>
  );
}
