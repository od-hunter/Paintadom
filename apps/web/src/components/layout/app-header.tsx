"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useGameStore } from "@/store/game-store";
import { GameMenu } from "@/components/layout/game-menu";
import { SparkShop } from "@/components/game/spark-shop";
import { NewsPopup } from "@/components/game/news-popup";
import { LevelMapPopup } from "@/components/game/level-map-popup";
import { shortAddress } from "@/lib/wallet-from-email";
import { getAvatar } from "@/data/buildings";

/** Top HUD — Sparks + wallet address bars (Dice Dreams style). */
export function AppHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [newsOpen, setNewsOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const walletMenuRef = useRef<HTMLDivElement>(null);
  const sparks = useGameStore((s) => s.sparks);
  const goodDollars = useGameStore((s) => s.goodDollars);
  const level = useGameStore((s) => s.level);
  const hasOnboarded = useGameStore((s) => s.hasOnboarded);
  const walletAddress = useGameStore((s) => s.walletAddress);
  const email = useGameStore((s) => s.email);
  const username = useGameStore((s) => s.username);
  const avatarId = useGameStore((s) => s.avatarId);
  const streak = useGameStore((s) => s.streak);
  const hydrated = useGameStore((s) => s.hydrated);
  const hideChrome = pathname.startsWith("/paint/") && pathname !== "/paint";
  const returningRef = useRef<boolean | null>(null);
  const avatar = getAvatar(avatarId);

  useEffect(() => {
    if (!hydrated) return;
    if (returningRef.current === null) {
      returningRef.current = useGameStore.getState().hasEnteredHome;
    }
  }, [hydrated]);

  // Returning users only — snapshot at hydrate, never first-timers
  useEffect(() => {
    if (!hydrated || !hasOnboarded || hideChrome || pathname !== "/") return;
    if (!returningRef.current) return;
    try {
      if (sessionStorage.getItem("paintadom-news-shown") === "1") return;
      const t = window.setTimeout(() => {
        setNewsOpen(true);
        sessionStorage.setItem("paintadom-news-shown", "1");
      }, 2200);
      return () => window.clearTimeout(t);
    } catch {
      /* ignore */
    }
  }, [hydrated, hasOnboarded, hideChrome, pathname]);

  useEffect(() => {
    if (!walletMenuOpen) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const el = walletMenuRef.current;
      if (el && !el.contains(e.target as Node)) setWalletMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setWalletMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [walletMenuOpen]);

  if (hideChrome) return null;

  return (
    <>
      <header className="pointer-events-none fixed left-1/2 top-0 z-40 w-full max-w-lg -translate-x-1/2 px-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex items-start justify-between gap-1.5">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-[4px] rounded-full bg-gradient-to-b from-[#7DD3FC] to-[#3B82F6] shadow-[0_5px_0_#1d4ed8] active:translate-y-1"
          >
            <span className="block h-[3px] w-5 rounded-full bg-white shadow-sm" />
            <span className="block h-[3px] w-5 rounded-full bg-white shadow-sm" />
            <span className="block h-[3px] w-5 rounded-full bg-white shadow-sm" />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <div className="relative flex h-11 min-w-0 flex-1 items-center rounded-full border-[3px] border-[#60A5FA] bg-gradient-to-b from-[#2563EB] to-[#1D4ED8] pl-0.5 pr-1.5 shadow-[0_4px_0_rgba(29,78,216,0.7)]">
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white bg-gradient-to-b from-amber-200 to-amber-500 shadow">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/sparks.webp"
                  alt=""
                  className="h-7 w-7 object-contain"
                />
              </span>
              <span className="mx-1 min-w-0 flex-1 truncate text-center font-display text-sm font-black tracking-tight text-white drop-shadow">
                {sparks.toLocaleString()}
              </span>
              <button
                type="button"
                onClick={() => setShopOpen(true)}
                aria-label="Buy Sparks"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-white bg-gradient-to-b from-lime-300 to-green-500 text-xs font-black text-green-900 shadow"
              >
                +
              </button>
            </div>

            <div className="relative min-w-0 flex-1" ref={walletMenuRef}>
              <button
                type="button"
                onClick={() => setWalletMenuOpen((v) => !v)}
                aria-expanded={walletMenuOpen}
                aria-label="Account details"
                className="relative flex h-11 w-full min-w-0 items-center overflow-hidden rounded-full border-[3px] border-violet-300 bg-gradient-to-b from-[#a78bfa] to-[#6d28d9] pl-0.5 pr-1.5 shadow-[0_4px_0_rgba(91,33,182,0.75)]"
              >
                <span
                  className="pointer-events-none absolute inset-y-0 left-0 w-full opacity-40"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.45) 0%, transparent 55%)",
                  }}
                />
                <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white bg-gradient-to-b from-amber-200 to-yellow-500 shadow">
                  <span className="text-[9px] font-black text-violet-900">
                    G$
                  </span>
                </span>
                <div className="relative mx-1 min-w-0 flex-1 text-center">
                  <p className="truncate font-mono text-[10px] font-black text-white drop-shadow">
                    {shortAddress(walletAddress)}
                  </p>
                  <p className="text-[8px] font-bold text-violet-100">
                    {goodDollars.toLocaleString()} G$
                  </p>
                </div>
              </button>

              <AnimatePresence>
                {walletMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-[calc(100%+0.4rem)] z-50 w-[min(17.5rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border-[3px] border-violet-200 bg-white shadow-[0_10px_0_rgba(91,33,182,0.35)]"
                  >
                    <div className="flex items-center gap-2 border-b border-violet-100 bg-gradient-to-r from-violet-500 to-fuchsia-600 px-3 py-2.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={avatar.src}
                        alt=""
                        className="h-10 w-10 rounded-full border-2 border-white object-cover shadow"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-display text-sm font-black text-white">
                          {username || "Painter"}
                        </p>
                        <p className="truncate text-[10px] font-bold text-violet-100">
                          Level {level} · {streak} day streak
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2 px-3 py-2.5 text-left">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wide text-slate-500">
                          Email
                        </p>
                        <p className="truncate text-xs font-bold text-slate-900">
                          {email || "Not linked"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wide text-slate-500">
                          Wallet
                        </p>
                        <p className="break-all font-mono text-[10px] font-bold leading-snug text-slate-900">
                          {walletAddress || "—"}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <div className="rounded-xl bg-amber-50 px-2 py-1.5">
                          <p className="text-[8px] font-black uppercase text-amber-700">
                            Sparks
                          </p>
                          <p className="font-display text-sm font-black text-amber-950">
                            {sparks.toLocaleString()}
                          </p>
                        </div>
                        <div className="rounded-xl bg-violet-50 px-2 py-1.5">
                          <p className="text-[8px] font-black uppercase text-violet-700">
                            GoodDollar
                          </p>
                          <p className="font-display text-sm font-black text-violet-950">
                            {goodDollars.toLocaleString()} G$
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMapOpen(true)}
            aria-label="Open level map"
            className="flex shrink-0 flex-col items-center active:scale-95"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/crown.webp"
              alt=""
              className="h-8 w-8 object-contain drop-shadow"
            />
            <span className="rounded-full bg-black/35 px-1.5 py-0.5 text-[10px] font-black text-white">
              {level}
            </span>
          </button>
        </div>
      </header>

      <GameMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenNews={() => {
          setMenuOpen(false);
          setNewsOpen(true);
        }}
        onOpenStore={() => setShopOpen(true)}
      />
      <SparkShop open={shopOpen} onClose={() => setShopOpen(false)} />
      <NewsPopup open={newsOpen} onClose={() => setNewsOpen(false)} />
      <LevelMapPopup
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        playerLevel={level}
      />
    </>
  );
}
