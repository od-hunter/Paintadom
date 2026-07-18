/** ISO country → ISO 4217 fiat for Spark Shop local pricing */
export const COUNTRY_CURRENCY: Record<string, string> = {
  NG: "NGN",
  GH: "GHS",
  KE: "KES",
  ZA: "ZAR",
  US: "USD",
  GB: "GBP",
  EU: "EUR",
  DE: "EUR",
  FR: "EUR",
  NL: "EUR",
  ES: "EUR",
  IT: "EUR",
  PT: "EUR",
  IE: "EUR",
  AT: "EUR",
  BE: "EUR",
  BR: "BRL",
  MX: "MXN",
  CA: "CAD",
  AU: "AUD",
  IN: "INR",
  PH: "PHP",
  JP: "JPY",
  CN: "CNY",
  SG: "SGD",
  AE: "AED",
  SA: "SAR",
  EG: "EGP",
  TR: "TRY",
  CO: "COP",
  AR: "ARS",
  CL: "CLP",
  PE: "PEN",
  CH: "CHF",
  SE: "SEK",
  NO: "NOK",
  DK: "DKK",
  PL: "PLN",
  CZ: "CZK",
  RO: "RON",
  HU: "HUF",
  UA: "UAH",
  PK: "PKR",
  BD: "BDT",
  ID: "IDR",
  MY: "MYR",
  TH: "THB",
  VN: "VND",
  KR: "KRW",
  NZ: "NZD",
  TZ: "TZS",
  UG: "UGX",
  RW: "RWF",
  ET: "ETB",
  CI: "XOF",
  SN: "XOF",
};

export const CURRENCY_LOCALE: Record<string, string> = {
  NGN: "en-NG",
  GHS: "en-GH",
  KES: "en-KE",
  ZAR: "en-ZA",
  USD: "en-US",
  GBP: "en-GB",
  EUR: "en-EU",
  BRL: "pt-BR",
  MXN: "es-MX",
  CAD: "en-CA",
  AUD: "en-AU",
  INR: "en-IN",
  PHP: "en-PH",
  JPY: "ja-JP",
  CNY: "zh-CN",
  XOF: "fr-FR",
};

export function currencyForCountry(countryCode: string | null | undefined): string {
  if (!countryCode) return "USD";
  return COUNTRY_CURRENCY[countryCode.toUpperCase()] ?? "USD";
}

export function formatFiat(
  amount: number,
  currency: string,
  countryHint?: string
): string {
  const locale =
    CURRENCY_LOCALE[currency] ||
    (countryHint ? `en-${countryHint}` : "en-US");
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "JPY" || currency === "NGN" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatUsdt(amount: number): string {
  return `${amount.toFixed(2)} USDT`;
}
