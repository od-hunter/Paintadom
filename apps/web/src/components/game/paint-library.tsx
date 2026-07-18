"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { pagesForLevel, totalPaintSparks, totalGalleryCost, FREESTYLE_DRAWINGS } from "@/data/pages";
import { useGameStore } from "@/store/game-store";
import { GameIcon } from "@/components/ui/game-icon";
import { useNavLoading } from "@/store/nav-loading";

type Tab = "level" | "freestyle";

export function PaintLibrary() {
  const router = useRouter();
  const search = useSearchParams();
  const [tab, setTab] = useState<Tab>("level");
  const pageProgress = useGameStore((s) => s.pageProgress);
  const level = useGameStore((s) => s.level);
  const pages = pagesForLevel(level);
  const done = pages.filter((p) => pageProgress[p.id]?.completed).length;
  const paintTotal = totalPaintSparks(level);
  const galleryTotal = totalGalleryCost(level);
  const startNavLoading = useNavLoading((s) => s.start);
  const stopNavLoading = useNavLoading((s) => s.stop);

  useEffect(() => {
    stopNavLoading();
  }, [stopNavLoading]);

  useEffect(() => {
    if (search.get("tab") === "freestyle") setTab("freestyle");
  }, [search]);

  /** Warm paint studio + route chunks so taps open immediately */
  useEffect(() => {
    void import("@/components/paint/paint-studio");
    const levelPages = pagesForLevel(level);
    for (const p of levelPages.slice(0, 4)) {
      router.prefetch(`/paint/${p.id}`);
    }
    for (const d of FREESTYLE_DRAWINGS.slice(0, 3)) {
      router.prefetch(`/paint/freestyle/${d.slug}`);
    }
  }, [level, router]);

  const goHome = () => {
    startNavLoading("Loading home…");
    router.push("/");
  };

  return (
    <div className="fixed inset-0 z-50 mx-auto max-w-lg overflow-y-auto bg-gradient-to-b from-sky-200 via-violet-100 to-pink-100">
      <div className="sticky top-0 z-20 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-2">
            <h1
              className="font-display text-2xl font-bold text-ink"
              style={{ textShadow: "0 2px 0 rgba(255,255,255,0.7)" }}
            >
              Drawing Book
            </h1>
          </div>
          <button
            type="button"
            onClick={goHome}
            aria-label="Close drawings"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[3px] border-white bg-gradient-to-b from-red-400 to-red-600 text-xl font-black text-white shadow-[0_4px_0_#991b1b]"
          >
            ×
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTab("level")}
            className={`rounded-2xl border-[3px] py-2.5 font-display text-sm font-black ${
              tab === "level"
                ? "border-violet-500 bg-violet-500 text-white shadow-[0_4px_0_#5b21b6]"
                : "border-white bg-white/80 text-ink"
            }`}
          >
            Level drawings
          </button>
          <button
            type="button"
            onClick={() => setTab("freestyle")}
            className={`rounded-2xl border-[3px] py-2.5 font-display text-sm font-black ${
              tab === "freestyle"
                ? "border-cyan-500 bg-cyan-500 text-white shadow-[0_4px_0_#0e7490]"
                : "border-white bg-white/80 text-ink"
            }`}
          >
            Freestyle
          </button>
        </div>
      </div>

      {tab === "level" ? (
        <>
          <p className="px-4 text-xs font-bold text-ink/70">
            Level {level} · {done}/{pages.length} completed · Paint all drawings
            to progress · ~{paintTotal} Sparks (wall needs {galleryTotal})
          </p>
          <div className="grid grid-cols-2 gap-3 px-4 pb-12 pt-2">
            {pages.map((page, i) => {
              const progress = pageProgress[page.id];
              /** Green check only after Claim Sparks at 100% (store.completed) */
              const completed = Boolean(
                progress?.completed && (progress?.percent ?? 0) >= 100
              );
              return (
                <Link
                  key={page.id}
                  href={`/paint/${page.id}`}
                  onClick={() => startNavLoading("Opening paint room…")}
                  className="panel-3d overflow-hidden !p-0 transition active:translate-y-1"
                >
                  <div className="relative aspect-[4/5] bg-white p-2">
                    {/* Stroke-only preview */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={page.lineArt || page.thumbnail}
                      alt={page.title}
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                    <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-black text-white">
                      #{i + 1}
                    </span>
                    {completed ? (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-emerald-500 text-3xl font-black text-white shadow-[0_6px_0_#047857]">
                          ✓
                        </span>
                      </span>
                    ) : null}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-bold text-ink">{page.title}</p>
                    <p className="flex items-center gap-1 text-[11px] font-bold capitalize text-ink/50">
                      {page.difficulty} · +{page.sparksReward}{" "}
                      <GameIcon src="/icons/sparks.webp" size={12} />
                    </p>
                    {progress && !completed && (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-violet-100">
                        <div
                          className="h-full rounded-full bg-purple"
                          style={{ width: `${progress.percent}%` }}
                        />
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      ) : (
        <div className="px-4 pb-12 pt-2">
          <p className="mb-3 rounded-xl bg-cyan-50 px-3 py-2 text-center text-xs font-bold text-cyan-950">
            Pick any drawing and paint freely — no Sparks or scores. When you
            finish, come back and choose another.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {FREESTYLE_DRAWINGS.map((d, i) => (
              <Link
                key={d.id}
                href={`/paint/freestyle/${d.slug}`}
                onClick={() => startNavLoading("Opening paint room…")}
                className="panel-3d overflow-hidden !p-0 transition active:translate-y-1"
              >
                <div className="relative aspect-[4/5] bg-white p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={d.lineArt}
                    alt={d.title}
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                  <span className="absolute left-2 top-2 rounded-full bg-cyan-600 px-2 py-0.5 text-[10px] font-black text-white">
                    Free
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-sm font-bold text-ink">{d.title}</p>
                  <p className="text-[11px] font-bold capitalize text-ink/50">
                    {d.difficulty} · no rewards
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
