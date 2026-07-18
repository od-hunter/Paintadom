import { http, createConfig, type CreateConnectorFn } from "wagmi";
import { injected } from "wagmi/connectors";
import { celo, celoSepolia } from "wagmi/chains";
import { getConfiguredChainId } from "@/lib/contracts/paintadom-game";

/** Prefer the configured game chain so wallet default matches the deployed proxy */
const configuredId = getConfiguredChainId();
const chains =
  configuredId === celoSepolia.id
    ? ([celoSepolia, celo] as const)
    : ([celo, celoSepolia] as const);

/** Publishable Magic API key — set in .env.local */
export const MAGIC_API_KEY =
  process.env.NEXT_PUBLIC_MAGIC_API_KEY?.trim() ?? "";

export const magicEnabled = MAGIC_API_KEY.length > 0;

function buildConnectors(): CreateConnectorFn[] {
  const connectors: CreateConnectorFn[] = [
    injected({
      // Prefer MiniPay when present; otherwise generic injected
      shimDisconnect: true,
    }),
  ];

  // Magic SDK touches `window` at import/init — only wire it in the browser.
  if (magicEnabled && typeof window !== "undefined") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { dedicatedWalletConnector } = require("@magiclabs/wagmi-connector") as typeof import("@magiclabs/wagmi-connector");
    connectors.push(
      dedicatedWalletConnector({
        chains,
        options: {
          apiKey: MAGIC_API_KEY,
          enableEmailLogin: true,
          enableSMSLogin: false,
          /** Google social login (enable Google OAuth in Magic Dashboard) */
          oauthOptions: {
            providers: ["google"],
          },
          magicSdkConfiguration: {
            network:
              configuredId === celoSepolia.id
                ? {
                    rpcUrl:
                      process.env.NEXT_PUBLIC_CELO_SEPOLIA_RPC ||
                      "https://forno.celo-sepolia.celo-testnet.org",
                    chainId: celoSepolia.id,
                  }
                : {
                    rpcUrl: "https://forno.celo.org",
                    chainId: celo.id,
                  },
          },
          accentColor: "#7C3AED",
          isDarkMode: false,
          customHeaderText: "Paintadom",
        },
      })
    );
  }

  return connectors;
}

export const wagmiConfig = createConfig({
  chains,
  connectors: buildConnectors(),
  transports: {
    [celo.id]: http(),
    [celoSepolia.id]: http(),
  },
  ssr: true,
});

export function getInjectedEthereum() {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { ethereum?: { isMiniPay?: boolean } }).ethereum;
}

/** Find the Magic connector from the live connector list */
export function isMagicConnector(connector: {
  id: string;
  name: string;
  type?: string;
}) {
  const id = connector.id.toLowerCase();
  const name = connector.name.toLowerCase();
  return (
    id.includes("magic") ||
    name.includes("magic") ||
    connector.type === "magic"
  );
}

/**
 * Email (if any) from Magic OAuth redirect / stored session.
 * @see https://github.com/magiclabs/wagmi-magic-connector#enable-login-by-socials-oauth
 */
export function readMagicOAuthEmail(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem("magicRedirectResult");
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as {
      email?: string;
      oauth?: { userInfo?: { email?: string } };
      userInfo?: { email?: string };
    };
    return (
      parsed.oauth?.userInfo?.email ||
      parsed.userInfo?.email ||
      parsed.email ||
      undefined
    );
  } catch {
    return undefined;
  }
}
