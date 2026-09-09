"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi";
import { useAutoConnect } from "@/hooks/use-auto-connect";
import { useGameStore } from "@/store/game-store";
import { NavLoadingOverlay } from "@/components/ui/route-loading-screen";

function FreshStartHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydrated = useGameStore((s) => s.hydrated);
  const resetGame = useGameStore((s) => s.resetGame);

  useEffect(() => {
    if (!hydrated || searchParams.get("fresh") !== "1") return;
    resetGame();
    router.replace("/");
  }, [hydrated, resetGame, router, searchParams]);

  return null;
}

function AutoConnectGate({ children }: { children: ReactNode }) {
  useAutoConnect();
  const touchDailyActivity = useGameStore((s) => s.touchDailyActivity);
  const hasOnboarded = useGameStore((s) => s.hasOnboarded);

  useEffect(() => {
    if (hasOnboarded) touchDailyActivity();
  }, [hasOnboarded, touchDailyActivity]);

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: false, retry: 0 },
        },
      })
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AutoConnectGate>
          <Suspense fallback={null}>
            <FreshStartHandler />
          </Suspense>
          {children}
          <NavLoadingOverlay />
        </AutoConnectGate>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
