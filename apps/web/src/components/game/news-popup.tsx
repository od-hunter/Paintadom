"use client";

import Image from "next/image";
import { useGameStore } from "@/store/game-store";
import { DEMO_LEADERBOARD } from "@/data/rewards";
import {
  getGallery,
  hungFramesCount,
  totalFrames,
  getAvatar,
  HELPER_MASCOTS,
} from "@/data/buildings";
import { GameIcon } from "@/components/ui/game-icon";
import { CenteredModal } from "@/components/ui/centered-modal";

export type NewsItem = {
  id: string;
  name: string;
  avatar: string;
  body: string;
  time: string;
  icon: string;
};

export function buildGalleryNews(): NewsItem[] {
  const state = useGameStore.getState();
  const gallery = getGallery(state.level);
  const hung = hungFramesCount(gallery, state.buildingStages);
  const total = totalFrames(gallery);
  const you = getAvatar(state.avatarId);
  const leader = DEMO_LEADERBOARD[0];
  const youEntry = DEMO_LEADERBOARD.find((e) => e.isYou);
  const rank = youEntry?.rank ?? 6;
  const helpers = HELPER_MASCOTS;

  return [
    {
      id: "level",
      name: state.username || "You",
      avatar: you.src,
      body: `is exploring ${gallery.name} · Level ${state.level}`,
      time: "just now",
      icon: "/icons/crown.webp",
    },
    {
      id: "leader",
      name: leader.username,
      avatar: helpers[3].src,
      body: `leads the leaderboard with ${leader.kingdomScore.toLocaleString()} pts!`,
      time: "2h ago",
      icon: "/icons/trophy.webp",
    },
    {
      id: "frames",
      name: state.username || "You",
      avatar: you.src,
      body:
        hung === 0
          ? "has an empty gallery wall — hang your first art!"
          : `hung ${hung}/${total} frames in ${gallery.name}`,
      time: "3h ago",
      icon: "/icons/gallery.webp",
    },
    {
      id: "streak",
      name: state.username || "You",
      avatar: you.src,
      body:
        state.streak > 1
          ? `kept a ${state.streak}-day painting streak glowing!`
          : "started a fresh painting streak today",
      time: "5h ago",
      icon: "/icons/streak.webp",
    },
    {
      id: "rank",
      name: state.username || "You",
      avatar: you.src,
      body:
        rank <= 3
          ? `climbed into the top 3 — rank #${rank}!`
          : rank > 5
            ? `slipped to rank #${rank} — paint to climb back!`
            : `holds steady at rank #${rank} on the board`,
      time: "6h ago",
      icon: rank > 5 ? "/icons/map.webp" : "/icons/trophy.webp",
    },
    {
      id: "rival",
      name: DEMO_LEADERBOARD[1]?.username ?? "PaintQueen",
      avatar: helpers[1].src,
      body: "just finished a hard page and surged up the ranks!",
      time: "8h ago",
      icon: "/icons/paint.webp",
    },
    {
      id: "gift",
      name: "Paintadom",
      avatar: helpers[0].src,
      body: "Daily login earns Sparks and G$ (GoodDollar)!",
      time: "12h ago",
      icon: "/icons/gift.webp",
    },
  ];
}

export function NewsPopup({
  open,
  onClose,
  onBack,
}: {
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
}) {
  const items = open ? buildGalleryNews() : [];

  return (
    <CenteredModal open={open} onClose={onClose} zIndex={95}>
      <div className="relative flex max-h-[min(82dvh,560px)] flex-col">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="absolute -left-1 -top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-white bg-gradient-to-b from-sky-400 to-blue-600 text-xl font-black text-white shadow-[0_4px_0_#1d4ed8]"
          >
            ‹
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -right-1 -top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-white bg-gradient-to-b from-red-400 to-red-600 text-xl font-black text-white shadow-[0_4px_0_#991b1b]"
        >
          ×
        </button>

        <div
          className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.5rem] border-[5px] border-[#c4a574]"
          style={{
            background:
              "linear-gradient(180deg, #f5e6c8 0%, #efe0b8 50%, #e8d4a8 100%)",
            boxShadow:
              "0 12px 0 #8b6914, 0 18px 40px rgba(0,0,0,0.35), inset 0 2px 0 rgba(255,255,255,0.5)",
          }}
        >
          <div
            className="relative shrink-0 px-4 py-3 text-center"
            style={{
              background:
                "linear-gradient(180deg, #a67c3a 0%, #8b5a2b 45%, #6b4423 100%)",
              boxShadow: "inset 0 -3px 0 rgba(0,0,0,0.25)",
            }}
          >
            <p
              className="font-display text-2xl font-black uppercase tracking-wide"
              style={{
                color: "#fff8e7",
                textShadow:
                  "0 2px 0 #5c3317, 0 4px 0 rgba(0,0,0,0.25), 0 0 12px rgba(251,191,36,0.35)",
              }}
            >
              Gallery News
            </p>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-3 pb-6">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2.5 rounded-2xl border-2 border-[#e0c890] bg-[#fff8e7]/90 px-2.5 py-2 shadow-sm"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-[3px] border-white bg-violet-100 shadow">
                  <Image
                    src={item.avatar}
                    alt=""
                    fill
                    className="object-contain object-bottom p-0.5"
                    sizes="48px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-1">
                    <p className="truncate font-display text-sm font-black uppercase text-orange-600">
                      {item.name}
                    </p>
                    <span className="shrink-0 text-[10px] font-bold text-stone-500">
                      {item.time}
                    </span>
                  </div>
                  <p className="text-xs font-bold leading-snug text-stone-700">
                    {item.body}
                  </p>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-white bg-white shadow">
                  <GameIcon src={item.icon} size={32} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CenteredModal>
  );
}
