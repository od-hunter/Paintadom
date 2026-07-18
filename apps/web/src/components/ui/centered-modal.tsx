"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

/**
 * True viewport-centered modal via portal (avoids clip from parent transforms).
 */
export function CenteredModal({
  open,
  onClose,
  children,
  zIndex = 90,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  zIndex?: number;
  labelledBy?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center p-3 sm:p-4"
          style={{ zIndex }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 flex max-h-[min(88dvh,680px)] w-full max-w-[22rem] flex-col"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
