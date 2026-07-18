import { Suspense } from "react";
import { HomeScreen } from "@/components/game/home-screen";
import { RouteLoadingScreen } from "@/components/ui/route-loading-screen";

export default function HomePage() {
  return (
    <Suspense fallback={<RouteLoadingScreen message="Loading home…" />}>
      <HomeScreen />
    </Suspense>
  );
}
