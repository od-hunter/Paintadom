"use client";

import { useCallback, useState } from "react";
import {
  useAccount,
  useConnect,
  useConnectors,
  useDisconnect,
} from "wagmi";
import { useGameStore } from "@/store/game-store";
import {
  getInjectedEthereum,
  isMagicConnector,
  magicEnabled,
  readMagicOAuthEmail,
} from "@/lib/wagmi";
import { walletFromEmail } from "@/lib/wallet-from-email";

function clearMagicSession() {
  try {
    localStorage.removeItem("magicRedirectResult");
  } catch {
    /* ignore */
  }
}

export function useWalletActions() {
  const connectors = useConnectors();
  const { connectAsync, isPending: isConnecting } = useConnect();
  const { disconnectAsync, isPending: isDisconnecting } = useDisconnect();
  const { address, isConnected, connector } = useAccount();

  const email = useGameStore((s) => s.email);
  const storedWallet = useGameStore((s) => s.walletAddress);
  const setAuthProfile = useGameStore((s) => s.setAuthProfile);
  const setWalletAddress = useGameStore((s) => s.setWalletAddress);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const magicConnector = connectors.find(isMagicConnector);
  const injectedConnector = connectors.find(
    (c) => c.id === "injected" || c.type === "injected"
  );
  const inMiniPay = Boolean(getInjectedEthereum()?.isMiniPay);
  const viaMagic = Boolean(isConnected && connector && isMagicConnector(connector));
  const viaMiniPay = Boolean(
    isConnected && injectedConnector && connector?.id === injectedConnector.id && inMiniPay
  );
  const viaEmailWallet = Boolean(email && (!isConnected || storedWallet === walletFromEmail(email)));

  const activeAddress =
    (isConnected && address) || storedWallet || (email ? walletFromEmail(email) : undefined);

  const connectionKind = viaMagic
    ? "magic"
    : viaMiniPay
      ? "minipay"
      : viaEmailWallet
        ? "email"
        : isConnected
          ? "wallet"
          : "none";

  const connectionLabel =
    connectionKind === "magic"
      ? "Magic wallet"
      : connectionKind === "minipay"
        ? "MiniPay"
        : connectionKind === "email"
          ? "Email wallet"
          : connectionKind === "wallet"
            ? "Connected wallet"
            : "Not connected";

  const connectGoogle = useCallback(async () => {
    setError(null);
    if (!magicEnabled || !magicConnector) {
      setError(
        "Magic is not configured. Add NEXT_PUBLIC_MAGIC_API_KEY in your env."
      );
      return false;
    }
    setBusy(true);
    try {
      const result = await connectAsync({ connector: magicConnector });
      const addr = result.accounts[0];
      if (!addr) throw new Error("No wallet address from Magic");

      const oauthEmail = readMagicOAuthEmail()?.trim().toLowerCase();
      const accountEmail =
        oauthEmail || email?.trim().toLowerCase() || `${addr.slice(2, 10).toLowerCase()}@google.magic`;
      setAuthProfile(accountEmail, addr);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed";
      if (!/user rejected|cancel/i.test(msg)) setError(msg);
      return false;
    } finally {
      setBusy(false);
    }
  }, [connectAsync, email, magicConnector, setAuthProfile]);

  const connectMiniPay = useCallback(async () => {
    setError(null);
    if (!inMiniPay || !injectedConnector) {
      setError("Open Paintadom inside MiniPay to connect.");
      return false;
    }
    setBusy(true);
    try {
      const result = await connectAsync({ connector: injectedConnector });
      const addr = result.accounts[0];
      if (!addr) throw new Error("MiniPay did not return a wallet");
      setWalletAddress(addr);
      if (email) setAuthProfile(email, addr);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "MiniPay connect failed";
      if (!/user rejected|cancel/i.test(msg)) setError(msg);
      return false;
    } finally {
      setBusy(false);
    }
  }, [connectAsync, email, injectedConnector, inMiniPay, setAuthProfile, setWalletAddress]);

  const disconnectWallet = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      if (isConnected) await disconnectAsync();
      clearMagicSession();
      if (email) {
        setAuthProfile(email, walletFromEmail(email));
      } else {
        setWalletAddress(undefined);
      }
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Disconnect failed";
      setError(msg);
      return false;
    } finally {
      setBusy(false);
    }
  }, [disconnectAsync, email, isConnected, setAuthProfile, setWalletAddress]);

  return {
    activeAddress,
    email,
    isWagmiConnected: isConnected,
    connectionKind,
    connectionLabel,
    inMiniPay,
    magicEnabled,
    magicAvailable: Boolean(magicConnector),
    miniPayAvailable: inMiniPay && Boolean(injectedConnector),
    busy: busy || isConnecting || isDisconnecting,
    error,
    setError,
    connectGoogle,
    connectMiniPay,
    disconnectWallet,
  };
}
