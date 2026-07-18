import { keccak256, toBytes, type Hex, type Address } from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";

/** Session email for the local signing connector (set after login / hydrate). */
let sessionEmail: string | undefined;

export function setEmailWalletSession(email?: string) {
  sessionEmail = email?.trim().toLowerCase() || undefined;
}

export function getEmailWalletSession() {
  return sessionEmail;
}

/** Private key = keccak256("paintadom:v1:" + email) — deterministic local Celo wallet. */
export function privateKeyFromEmail(email: string): Hex {
  return keccak256(
    toBytes(`paintadom:v1:${email.trim().toLowerCase()}`)
  ) as Hex;
}

export function accountFromEmail(email: string): PrivateKeyAccount {
  return privateKeyToAccount(privateKeyFromEmail(email));
}

/** Deterministic Celo-compatible address from verified email. */
export function walletFromEmail(email: string): Address {
  return accountFromEmail(email).address;
}

export function shortAddress(addr?: string) {
  if (!addr || addr.length < 10) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
