"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavLoading } from "@/store/nav-loading";

/** Full-screen branded loader used by route `loading.tsx` and client navigations */
export function RouteLoadingScreen({
  message = "Loading…",
}: {
  message?: string;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gradient-to-b from-sky-200 via-violet-200 to-fuchsia-100 px-6">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-violet-400/30" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/mascots/pika.webp"
          alt=""
          className="relative h-28 w-28 bob drop-shadow-lg"
        />
      </div>
      <p className="mt-5 text-center font-display text-xl font-black text-ink">
        {message}
      </p>
      <div className="mt-4 h-2 w-40 overflow-hidden rounded-full bg-white/70 shadow-inner">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
          initial={{ x: "-100%" }}
          animate={{ x: ["-100%", "120%"] }}
          transition={{
            repeat: Infinity,
            duration: 1.15,
            ease: "easeInOut",
          }}
          style={{ width: "45%" }}
        />
      </div>
    </div>
  );
}

/** Global overlay for client `router.push` transitions (instant on tap) */
export function NavLoadingOverlay() {
  const active = useNavLoading((s) => s.active);
  const message = useNavLoading((s) => s.message);
  const stop = useNavLoading((s) => s.stop);

  // Safety timeout so a failed nav never sticks
  useEffect(() => {
    if (!active) return;
    const t = window.setTimeout(() => stop(), 10000);
    return () => window.clearTimeout(t);
  }, [active, stop]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="nav-loading"
          className="fixed inset-0 z-[200]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <RouteLoadingScreen message={message} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
