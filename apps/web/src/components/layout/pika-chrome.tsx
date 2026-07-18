"use client";

import { usePathname } from "next/navigation";
import { useGameStore } from "@/store/game-store";
import { PikaBuddy } from "@/components/game/pika-buddy";

/** Shows the floating Pika helper everywhere except the fullscreen paint studio. */
export function PikaChrome() {
  const pathname = usePathname();
  const hasOnboarded = useGameStore((s) => s.hasOnboarded);
  const inStudio = pathname.startsWith("/paint/") && pathname !== "/paint";

  if (!hasOnboarded || inStudio) return null;
  return <PikaBuddy />;
}
