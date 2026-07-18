"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Settings } from "lucide-react";
import { useGameStore } from "@/store/game-store";
import { GameIcon } from "@/components/ui/game-icon";
import { getAvatar } from "@/data/buildings";
import { playSfx, unlockAudio, setMusicEnabled } from "@/lib/audio";
import { SettingsPanel } from "@/components/game/settings-panel";
import { LeaderboardPanel } from "@/components/game/leaderboard-panel";
import { AlbumPanel } from "@/components/game/album-panel";
import { InvitePanel } from "@/components/game/invite-panel";
import { LevelMapPopup } from "@/components/game/level-map-popup";
import { NewsPopup } from "@/components/game/news-popup";

type MenuPanel =
  | null
  | "settings"
  | "leaderboard"
  | "album"
  | "invite"
  | "map"
  | "news"
  | "friends";

const MENU_ITEMS = [
  {
    label: "STORE",
    icon: "/icons/store.webp",
    hint: "Buy Sparks",
    action: "store" as const,
  },
  {
    label: "NEWS",
    icon: "/icons/news.webp",
    hint: "Updates",
    action: "news" as const,
  },
  {
    label: "LEADERBOARD",
    icon: "/icons/trophy.webp",
    hint: "Ranks",
    action: "leaderboard" as const,
  },
  {
    label: "ALBUM",
    icon: "/icons/album.webp",
    hint: "Your art",
    action: "album" as const,
  },
  {
    label: "FRIENDS",
    icon: "/icons/friends.webp",
    hint: "Rivals",
    action: "friends" as const,
  },
  {
    label: "INVITE",
    icon: "/icons/invite.webp",
    hint: "Share & earn",
    action: "invite" as const,
  },
  {
    label: "MAP",
    icon: "/icons/map.webp",
    hint: "Wings",
    action: "map" as const,
  },
] as const;

export function GameMenu({
  open,
  onClose,
  onOpenNews,
  onOpenStore,
}: {
  open: boolean;
  onClose: () => void;
  onOpenNews?: () => void;
  onOpenStore?: () => void;
}) {
  const username = useGameStore((s) => s.username);
  const level = useGameStore((s) => s.level);
  const avatarId = useGameStore((s) => s.avatarId);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const musicEnabled = useGameStore((s) => s.musicEnabled);
  const avatar = getAvatar(avatarId);
  const [panel, setPanel] = useState<MenuPanel>(null);

  const closeAll = () => {
    setPanel(null);
    onClose();
  };

  const backToMenu = () => setPanel(null);

  const openPanel = (p: MenuPanel) => {
    playSfx("tap", soundEnabled);
    void unlockAudio().then(() => {
      if (musicEnabled) setMusicEnabled(true);
    });
    setPanel(p);
  };

  return (
    <>
      <AnimatePresence>
        {open && panel === null && (
          <>
            <motion.button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-[80] bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeAll}
            />
            <motion.div
              role="dialog"
              aria-label="Paintadom menu"
              initial={{ opacity: 0, scale: 0.88, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 16 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className="fixed inset-x-3 top-[8%] z-[90] mx-auto max-h-[84vh] max-w-md overflow-y-auto rounded-[2rem] border-4 border-white/30 bg-gradient-to-b from-[#A78BFA] via-[#7C3AED] to-[#4C1D95] p-4 shadow-2xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={closeAll}
                  className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-[#60A5FA] text-white shadow"
                  aria-label="Back"
                >
                  <ChevronLeft className="h-6 w-6 stroke-[3]" />
                </button>
                <button
                  type="button"
                  onClick={() => openPanel("settings")}
                  className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-[#60A5FA] text-white shadow"
                  aria-label="Settings"
                >
                  <Settings className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-col items-center">
                <div className="relative h-24 w-24 overflow-hidden rounded-full border-[4px] border-white bg-[#3B82F6] shadow-lg">
                  <Image
                    src={avatar.src}
                    alt={avatar.name}
                    fill
                    className="object-contain object-bottom p-1"
                    sizes="96px"
                  />
                </div>
                <p className="mt-2 font-display text-xl font-black uppercase tracking-wide text-white drop-shadow">
                  Hello, {username || "Painter"}
                </p>
                <p className="text-xs font-bold text-white/90">
                  Gallery Level {level}
                </p>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 pb-4">
                {MENU_ITEMS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      if (item.action === "store") {
                        playSfx("tap", soundEnabled);
                        onClose();
                        onOpenStore?.();
                        return;
                      }
                      if (item.action === "news") {
                        openPanel("news");
                        return;
                      }
                      if (item.action === "friends") {
                        openPanel("leaderboard");
                        return;
                      }
                      openPanel(item.action);
                    }}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <span className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border-[4px] border-white bg-gradient-to-b from-white to-violet-100 shadow-[0_6px_0_rgba(0,0,0,0.2)] transition active:translate-y-1 active:shadow-none">
                      <GameIcon src={item.icon} size={52} />
                    </span>
                    <span className="text-center text-[10px] font-black uppercase leading-tight text-white drop-shadow">
                      {item.label}
                    </span>
                    <span className="text-center text-[8px] font-bold text-white/75">
                      {item.hint}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <SettingsPanel
        open={open && panel === "settings"}
        onClose={closeAll}
        onBack={backToMenu}
      />
      <LeaderboardPanel
        open={open && (panel === "leaderboard" || panel === "friends")}
        onClose={closeAll}
        onBack={backToMenu}
      />
      <AlbumPanel
        open={open && panel === "album"}
        onClose={closeAll}
        onBack={backToMenu}
      />
      <InvitePanel
        open={open && panel === "invite"}
        onClose={closeAll}
        onBack={backToMenu}
      />
      <LevelMapPopup
        open={open && panel === "map"}
        onClose={closeAll}
        playerLevel={level}
        onBack={backToMenu}
      />
      <NewsPopup
        open={open && panel === "news"}
        onClose={closeAll}
        onBack={backToMenu}
      />

      {/* Keep onOpenNews available for header auto-news */}
      {false && onOpenNews}
    </>
  );
}
