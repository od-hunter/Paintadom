"use client";

import { useEffect, useMemo, useState } from "react";

export type FxQuote = {
  usdt: number;
  usdtLabel: string;
  local: number;
  localLabel: string;
};

export type FxBundle = {
  country: string;
  currency: string;
  usdtToLocal: number;
  quotes: FxQuote[];
};

/** Best-effort country when CDN geo headers are missing (local / some hosts) */
function guessCountryFromClient(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz === "Africa/Lagos" || tz === "Africa/Porto-Novo") return "NG";
    if (tz.startsWith("Africa/Accra")) return "GH";
    if (tz.startsWith("Africa/Nairobi")) return "KE";
    if (tz.startsWith("Africa/Johannesburg")) return "ZA";
    const lang = navigator.language || "";
    if (/^en-NG/i.test(lang) || /^ha-NG/i.test(lang) || /^yo/i.test(lang))
      return "NG";
  } catch {
    /* ignore */
  }
  return null;
}

export function useLocalFiatPrices(usdtAmounts: readonly number[]) {
  const amountsKey = useMemo(() => usdtAmounts.join(","), [usdtAmounts]);
  const [data, setData] = useState<FxBundle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const hint = guessCountryFromClient();
    const params = new URLSearchParams({ usdt: amountsKey });
    if (hint) params.set("country", hint);

    setLoading(true);
    fetch(`/api/fx/quote?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("fx failed");
        return res.json() as Promise<FxBundle>;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [amountsKey]);

  const byUsdt = (amount: number) =>
    data?.quotes.find((q) => Math.abs(q.usdt - amount) < 0.001) ?? null;

  return { data, loading, byUsdt };
}
