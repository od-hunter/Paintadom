"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { getPageById } from "@/data/pages";
import { PaintStudio } from "@/components/paint/paint-studio";

export default function PaintSessionPage() {
  const params = useParams<{ id: string }>();
  const page = getPageById(params.id);

  if (!page) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4">
        <p className="font-bold text-ink/60">Page not found</p>
        <Link href="/paint" className="font-bold text-purple">
          Back to library
        </Link>
      </div>
    );
  }

  return <PaintStudio page={page} />;
}
