"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  getGallery,
  hungFramesCount,
  totalFrames,
  artForFrame,
} from "@/data/buildings";
import { useGameStore } from "@/store/game-store";
import { GameIcon } from "@/components/ui/game-icon";

export function KingdomScreen() {
  const router = useRouter();
  const level = useGameStore((s) => s.level);
  const buildingStages = useGameStore((s) => s.buildingStages);
  const sparks = useGameStore((s) => s.sparks);
  const gallery = getGallery(level);
  const hung = hungFramesCount(gallery, buildingStages);
  const total = totalFrames(gallery);

  return (
    <div className="relative mx-auto min-h-screen max-w-lg space-y-4 bg-gradient-to-b from-sky-100 to-emerald-100 px-4 pb-28 pt-16">
      <button
        type="button"
        onClick={() => router.push("/")}
        aria-label="Close"
        className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-20 flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-white bg-gradient-to-b from-red-400 to-red-600 text-xl font-black text-white shadow-[0_4px_0_#991b1b]"
      >
        ×
      </button>

      <div className="flex items-center justify-between pr-12">
        <div>
          <h1
            className="font-display text-3xl font-black text-slate-900"
            style={{ textShadow: "0 2px 0 rgba(255,255,255,0.8)" }}
          >
            {gallery.name}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-1 text-sm font-black text-slate-800">
            Level {level} · {hung}/{total} frames ·{" "}
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">
              <GameIcon src="/icons/sparks.webp" size={14} /> {sparks}
            </span>
          </p>
          <p className="mt-1 text-xs font-bold text-slate-700">
            Hang art with Sparks to fill this gallery wing.
          </p>
        </div>
        <Image
          src="/mascots/brik.webp"
          alt="Brik"
          width={72}
          height={72}
          className="bob"
        />
      </div>

      <div className="relative aspect-[3/4] overflow-hidden rounded-[1.75rem] border-4 border-white shadow-game">
        <Image
          src="/bg/gallery.webp"
          alt="Your gallery"
          fill
          className="object-cover"
          sizes="(max-width: 512px) 100vw, 448px"
          priority
        />
        {gallery.frames.map((f) => {
          const stage = buildingStages[f.id] ?? 0;
          const isHung = stage >= 1;
          const art = artForFrame(f);
          return (
            <div
              key={f.id}
              className="absolute overflow-hidden rounded-md border-[3px] border-amber-200"
              style={{
                left: `${f.x}%`,
                top: `${f.y}%`,
                width: `${f.size * 1.4}%`,
                aspectRatio: "1",
                transform: "translate(-50%, -50%)",
                boxShadow:
                  "inset 0 0 0 2px #92400e, 0 6px 12px rgba(0,0,0,0.35)",
                background: isHung
                  ? "linear-gradient(145deg, #fbbf24, #78350f)"
                  : "linear-gradient(145deg, #a8a29e, #292524)",
              }}
            >
              <div className="absolute inset-[10%] overflow-hidden rounded-sm bg-[#fff7ed]">
                {isHung ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={art.src}
                    alt={art.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[8px] font-black text-stone-400">
                    empty
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
