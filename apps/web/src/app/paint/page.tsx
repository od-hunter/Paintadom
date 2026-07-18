"use client";

import { Suspense } from "react";
import { PaintLibrary } from "@/components/game/paint-library";
import { RouteLoadingScreen } from "@/components/ui/route-loading-screen";

export default function PaintPage() {
  return (
    <Suspense
      fallback={<RouteLoadingScreen message="Loading Drawing Book…" />}
    >
      <PaintLibrary />
    </Suspense>
  );
}
