import { NextResponse } from "next/server";
import {
  currencyForCountry,
  formatFiat,
  formatUsdt,
} from "@/lib/fx/currencies";

export const runtime = "nodejs";

/** Soft fallbacks if FX APIs are down (approx mid-2026) */
const FALLBACK_USD_RATES: Record<string, number> = {
  USD: 1,
  NGN: 1600,
  GHS: 15.5,
  KES: 129,
  ZAR: 18.2,
  GBP: 0.78,
  EUR: 0.92,
  BRL: 5.6,
  MXN: 17.2,
  CAD: 1.37,
  AUD: 1.52,
  INR: 83.5,
  PHP: 58,
  JPY: 157,
  XOF: 605,
};

function countryFromRequest(req: Request): string {
  const forced = new URL(req.url).searchParams.get("country");
  if (forced && /^[A-Za-z]{2}$/.test(forced)) return forced.toUpperCase();

  const headers = req.headers;
  const fromHeader =
    headers.get("x-vercel-ip-country") ||
    headers.get("cf-ipcountry") ||
    headers.get("x-country-code");
  if (fromHeader && fromHeader !== "XX" && /^[A-Za-z]{2}$/.test(fromHeader)) {
    return fromHeader.toUpperCase();
  }
  return "US";
}

async function fetchUsdRate(currency: string): Promise<number | null> {
  if (currency === "USD") return 1;

  // Broader coverage (includes NGN, GHS, KES, …)
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = (await res.json()) as {
        rates?: Record<string, number>;
      };
      const rate = data.rates?.[currency];
      if (typeof rate === "number" && rate > 0) return rate;
    }
  } catch {
    /* try next */
  }

  // ECB subset fallback
  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=USD&to=${encodeURIComponent(currency)}`,
      { next: { revalidate: 3600 } }
    );
    if (res.ok) {
      const data = (await res.json()) as { rates?: Record<string, number> };
      const rate = data.rates?.[currency];
      if (typeof rate === "number" && rate > 0) return rate;
    }
  } catch {
    /* fallback table */
  }

  return FALLBACK_USD_RATES[currency] ?? null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const usdtParam = searchParams.get("usdt");
  const usdtAmounts = usdtParam
    ? usdtParam
        .split(",")
        .map((v) => Number(v))
        .filter((n) => Number.isFinite(n) && n > 0)
    : [0.25, 1, 2.5];

  const country = countryFromRequest(req);
  const currency = currencyForCountry(country);
  const rate = (await fetchUsdRate(currency)) ?? FALLBACK_USD_RATES[currency] ?? 1;

  const quotes = usdtAmounts.map((usdt) => {
    const local = usdt * rate;
    return {
      usdt,
      usdtLabel: formatUsdt(usdt),
      local,
      localLabel: formatFiat(local, currency, country),
    };
  });

  return NextResponse.json({
    country,
    currency,
    /** How many local currency units per 1 USDT (≈ USD) */
    usdtToLocal: rate,
    quotes,
    source: rate === FALLBACK_USD_RATES[currency] ? "fallback" : "live",
  });
}
