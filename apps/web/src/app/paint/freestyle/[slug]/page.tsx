"use client";

import { useParams, useRouter } from "next/navigation";
import { FREESTYLE_DRAWINGS } from "@/data/pages";
import type { ColoringPage } from "@/types/game";
import { PaintStudio } from "@/components/paint/paint-studio";

export default function FreestyleDrawingPage() {
  const params = useParams();
  const router = useRouter();
  const slug = String(params.slug ?? "");
  const drawing = FREESTYLE_DRAWINGS.find((d) => d.slug === slug);

  if (!drawing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-sky-100 px-4">
        <p className="font-bold text-ink">Drawing not found</p>
        <button
          type="button"
          onClick={() => router.push("/paint?tab=freestyle")}
          className="rounded-xl bg-sky-500 px-4 py-2 font-black text-white"
        >
          Back to Freestyle
        </button>
      </div>
    );
  }

  const page: ColoringPage = {
    id: drawing.id,
    title: drawing.title,
    difficulty: drawing.difficulty,
    sparksReward: 0,
    kingdomReward: 0,
    thumbnail: drawing.thumbnail,
    lineArt: drawing.lineArt,
    level: 0,
  };

  return <PaintStudio page={page} freestyle />;
}
