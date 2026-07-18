"use client";

import Image from "next/image";
import { useGameStore } from "@/store/game-store";
import {
  getGallery,
  hungFramesCount,
  totalFrames,
  getAvatar,
} from "@/data/buildings";
import { GameIcon } from "@/components/ui/game-icon";

export function ProfileScreen() {
  const username = useGameStore((s) => s.username);
  const setUsername = useGameStore((s) => s.setUsername);
  const level = useGameStore((s) => s.level);
  const sparks = useGameStore((s) => s.sparks);
  const streak = useGameStore((s) => s.streak);
  const achievements = useGameStore((s) => s.achievements);
  const buildingStages = useGameStore((s) => s.buildingStages);
  const buySparks = useGameStore((s) => s.buySparks);
  const avatarId = useGameStore((s) => s.avatarId);
  const gallery = getGallery(level);
  const built = hungFramesCount(gallery, buildingStages);
  const total = totalFrames(gallery);
  const unlocked = achievements.filter((a) => a.unlocked);
  const avatar = getAvatar(avatarId);

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 pb-12 pt-16">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="font-display text-3xl font-bold text-ink"
            style={{ textShadow: "0 3px 0 rgba(255,255,255,0.7)" }}
          >
            {username || "Painter"}
          </h1>
          <p className="text-sm font-bold text-ink/60">{gallery.name}</p>
        </div>
        <Image
          src={avatar.src}
          alt={avatar.name}
          width={72}
          height={72}
          className="bob"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="chip-3d inline-flex items-center gap-1">
          <GameIcon src="/icons/crown.webp" size={16} /> Lv {level}
        </span>
        <span className="chip-3d inline-flex items-center gap-1">
          <GameIcon src="/icons/sparks.webp" size={16} /> {sparks} Sparks
        </span>
        <span className="chip-3d inline-flex items-center gap-1">
          <GameIcon src="/icons/gallery.webp" size={16} /> {built}/{total}
        </span>
        <span className="chip-3d inline-flex items-center gap-1">
          <GameIcon src="/icons/streak.webp" size={16} /> {streak}
        </span>
      </div>

      <div className="panel-3d space-y-3 p-4">
        <label className="block text-sm font-bold text-ink/70">
          Display name
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.slice(0, 16))}
            className="mt-1 w-full rounded-2xl border-2 border-violet-200 bg-white px-4 py-3 text-base font-bold outline-none focus:border-purple"
          />
        </label>
        <button
          type="button"
          onClick={() => buySparks(100)}
          className="btn-3d-gold w-full"
        >
          Buy +100 Sparks (demo)
        </button>
      </div>

      <div className="panel-3d p-4">
        <h2 className="font-display text-lg font-bold">Badges</h2>
        {unlocked.length === 0 ? (
          <div className="mt-3 flex items-center gap-3">
            <Image src="/mascots/pika.webp" alt="Pika" width={48} height={48} />
            <p className="text-sm font-bold text-ink/65">
              Paint your first page to earn a badge!
            </p>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {achievements.map((badge) => (
              <div
                key={badge.id}
                className={`rounded-2xl p-3 ${
                  badge.unlocked
                    ? "bg-gradient-to-br from-amber-100 to-violet-100"
                    : "bg-violet-50 opacity-40"
                }`}
              >
                <GameIcon src={badge.icon} size={36} />
                <p className="mt-1 text-sm font-bold">{badge.title}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
