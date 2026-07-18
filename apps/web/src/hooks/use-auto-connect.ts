"use client";

import { useEffect, useRef } from "react";
import { useAccount, useConnect, useConnectors } from "wagmi";
import { useGameStore } from "@/store/game-store";
import {
  getInjectedEthereum,
  isMagicConnector,
  readMagicOAuthEmail,
} from "@/lib/wagmi";

/**
 * Auto-connect ONLY inside MiniPay (injected).
 * Magic / Google login is user-initiated from onboarding — never auto-prompted.
 * @see https://docs.celo.org/build-on-celo/build-on-minipay/quickstart
 */
export function useAutoConnect() {
  const connectors = useConnectors();
  const { connect, error, isPending } = useConnect();
  const { address, isConnected, connector } = useAccount();
  const setWalletAddress = useGameStore((s) => s.setWalletAddress);
  const setAuthProfile = useGameStore((s) => s.setAuthProfile);
  const email = useGameStore((s) => s.email);
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current || isConnected || connectors.length === 0) return;

    const ethereum = getInjectedEthereum();
    // Critical: do not call connect() for MetaMask / generic injected wallets
    if (!ethereum?.isMiniPay) return;

    const injectedConnector = connectors.find(
      (c) => c.id === "injected" || c.type === "injected"
    );
    if (!injectedConnector) return;

    attempted.current = true;
    connect({ connector: injectedConnector });
  }, [connect, connectors, isConnected]);

  // Sync any connected wallet (MiniPay or Magic) into game state
  useEffect(() => {
    if (!address) return;
    setWalletAddress(address);

    // After Google/Magic OAuth, capture email if we don't have one yet
    if (!email && connector && isMagicConnector(connector)) {
      const magicEmail = readMagicOAuthEmail();
      if (magicEmail) {
        setAuthProfile(magicEmail.trim().toLowerCase(), address);
      }
    }
  }, [address, connector, email, setAuthProfile, setWalletAddress]);

  const ethereum = getInjectedEthereum();
  const inMiniPay = Boolean(ethereum?.isMiniPay);
  const viaMagic = Boolean(connector && isMagicConnector(connector));

  return {
    address: isConnected ? address : undefined,
    isConnected,
    isPending,
    error,
    inMiniPay,
    viaMagic,
    providerMissing: typeof window !== "undefined" && !ethereum && !viaMagic,
  };
}
