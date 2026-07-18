"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { PIKA_TIPS } from "@/data/buildings";

/**
 * Floating Pika helper — sits bottom-right, bobs, and shows a
 * dismissable speech bubble with rotating Paintadom tips.
 */
export function PikaBuddy() {
  const [open, setOpen] = useState(false);
  const [tip, setTip] = useState(PIKA_TIPS[0]);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // First greeting after a short beat
    const intro = window.setTimeout(() => {
      setTip(PIKA_TIPS[Math.floor(Math.random() * PIKA_TIPS.length)]);
      setOpen(true);
    }, 1400);
    return () => window.clearTimeout(intro);
  }, []);

  useEffect(() => {
    if (!open) return;
    // Auto-close after a while so it isn't naggy
    const t = window.setTimeout(() => setOpen(false), 8000);
    return () => window.clearTimeout(t);
  }, [open, tip]);

  const poke = () => {
    setTip(PIKA_TIPS[Math.floor(Math.random() * PIKA_TIPS.length)]);
    setOpen(true);
  };

  if (hidden) return null;

  return (
    <div className="pointer-events-none fixed bottom-28 right-2 z-30 flex max-w-[min(78vw,300px)] flex-col items-end sm:bottom-32">
      <AnimatePresence>
        {open && (
          <motion.div
            key={tip}
            initial={{ opacity: 0, scale: 0.7, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 8 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="pointer-events-auto relative mb-2 mr-1"
          >
            <div className="relative rounded-3xl border-2 border-white bg-white/95 px-4 py-3 shadow-[0_10px_0_rgba(99,102,241,0.15),0_16px_36px_rgba(49,46,129,0.18)] backdrop-blur">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Dismiss Pika"
                className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-pink text-white shadow"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="pr-2 text-sm font-bold leading-snug text-ink">
                <span className="mr-1 text-purple">Pika:</span>
                {tip}
              </p>
              <span className="absolute -bottom-2 right-8 h-4 w-4 rotate-45 border-b-2 border-r-2 border-white bg-white/95" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-auto flex items-center gap-1">
        <button
          type="button"
          onClick={() => (open ? setOpen(false) : poke())}
          aria-label="Talk to Pika"
          className="relative"
        >
          <span className="absolute inset-0 -z-10 rounded-full bg-pink/30 blur-xl" />
          <Image
            src="/mascots/pika.webp"
            alt="Pika"
            width={72}
            height={72}
            className="float-y drop-shadow-xl"
          />
        </button>
      </div>

      <button
        type="button"
        onClick={() => setHidden(true)}
        className="pointer-events-auto mt-0.5 mr-2 text-[10px] font-bold text-ink/40"
      >
        hide
      </button>
    </div>
  );
}
