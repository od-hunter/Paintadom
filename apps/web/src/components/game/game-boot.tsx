"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useGameStore } from "@/store/game-store";
import { Onboarding } from "@/components/game/onboarding";
import { WELCOME_BG } from "@/data/buildings";

const SPLASH_MS = 5000;

const TITLE_COLORS = [
  "#F472B6", // P pink
  "#FBBF24", // a gold
  "#34D399", // i green
  "#60A5FA", // n blue
  "#A78BFA", // t violet
  "#FB923C", // a orange
  "#F472B6", // d pink
  "#22D3EE", // o cyan
  "#FACC15", // m yellow
];

function ColorfulTitle({ text }: { text: string }) {
  return (
    <h1
      className="font-display text-6xl font-bold tracking-wide"
      aria-label={text}
      style={{ letterSpacing: "0.04em" }}
    >
      {text.split("").map((ch, i) => (
        <motion.span
          key={`${ch}-${i}`}
          className="inline-block"
          initial={{ y: 14, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{
            delay: 0.08 + i * 0.045,
            type: "spring",
            stiffness: 420,
            damping: 14,
          }}
          style={{
            color: TITLE_COLORS[i % TITLE_COLORS.length],
            // Extruded 3D — dark steps only, no white stroke/haze
            textShadow: `
              0 1px 0 #1e1b4b,
              0 2px 0 #1e1b4b,
              0 3px 0 #1e1b4b,
              0 4px 0 #1e1b4b,
              0 5px 0 #1e1b4b,
              0 7px 0 rgba(15,23,42,0.55),
              0 12px 16px rgba(0,0,0,0.4)
            `,
            WebkitTextStroke: "0px transparent",
          }}
        >
          {ch}
        </motion.span>
      ))}
    </h1>
  );
}

export function GameBoot({ children }: { children: React.ReactNode }) {
  const hydrated = useGameStore((s) => s.hydrated);
  const hasOnboarded = useGameStore((s) => s.hasOnboarded);
  const setHydrated = useGameStore((s) => s.setHydrated);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setHydrated(true), 50);
    return () => window.clearTimeout(t);
  }, [setHydrated]);

  useEffect(() => {
    if (!hydrated) return;
    // New / reset users go straight to sign-in — no 5s intro wait
    if (!hasOnboarded) {
      setShowSplash(false);
      return;
    }
    const hide = window.setTimeout(() => setShowSplash(false), SPLASH_MS);
    return () => window.clearTimeout(hide);
  }, [hydrated, hasOnboarded]);

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            className="fixed inset-0 z-[100] flex flex-col items-center justify-end overflow-hidden pb-16"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Image
              src={WELCOME_BG}
              alt=""
              fill
              priority
              className="object-cover object-center"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/55" />

            <motion.div
              className="relative z-10 px-6 text-center"
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.12 }}
            >
              <ColorfulTitle text="Paintadom" />
              <p className="mt-2 inline-block rounded-full bg-white/90 px-4 py-1 text-sm font-bold text-ink">
                Paint. Hang. Curate.
              </p>
            </motion.div>

            <div className="relative z-10 mt-7 w-[15.5rem]">
              <div
                className="pointer-events-none absolute -inset-3 rounded-full opacity-80 blur-md"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(251,191,36,0.55), rgba(236,72,153,0.25), transparent 70%)",
                }}
              />
              <div
                className="relative h-5 overflow-hidden rounded-full border-[3px] border-white"
                style={{
                  background:
                    "linear-gradient(180deg, #1e1b4b 0%, #312e81 45%, #1e1b4b 100%)",
                  boxShadow:
                    "0 5px 0 #4c1d95, 0 8px 18px rgba(0,0,0,0.45), inset 0 2px 4px rgba(0,0,0,0.55)",
                }}
              >
                <div className="absolute inset-[3px] overflow-hidden rounded-full bg-black/40">
                  <motion.div
                    className="relative h-full rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: SPLASH_MS / 1000, ease: "linear" }}
                    style={{
                      background:
                        "linear-gradient(180deg, #fde68a 0%, #fbbf24 28%, #f472b6 62%, #a855f7 100%)",
                      boxShadow:
                        "0 0 14px 4px rgba(251,191,36,0.85), 0 0 28px 8px rgba(236,72,153,0.55), inset 0 2px 0 rgba(255,255,255,0.65)",
                    }}
                  >
                    <motion.div
                      className="absolute inset-y-0 w-10 bg-gradient-to-r from-transparent via-white/70 to-transparent"
                      initial={{ left: "-20%" }}
                      animate={{ left: "110%" }}
                      transition={{
                        duration: 1.1,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                    <div className="absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 translate-x-1/2 rounded-full bg-white shadow-[0_0_12px_6px_rgba(255,255,255,0.85)]" />
                  </motion.div>
                </div>
              </div>
              <p
                className="mt-3 text-center text-xs font-black tracking-wide text-white"
                style={{
                  textShadow:
                    "0 0 10px rgba(251,191,36,0.8), 0 2px 0 rgba(0,0,0,0.5)",
                }}
              >
                Loading gallery…
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showSplash && !hasOnboarded && <Onboarding />}
      {!showSplash && hasOnboarded && children}
    </>
  );
}
