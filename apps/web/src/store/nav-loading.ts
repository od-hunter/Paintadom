"use client";

import { create } from "zustand";

type NavLoadingState = {
  active: boolean;
  message: string;
  start: (message?: string) => void;
  stop: () => void;
};

export const useNavLoading = create<NavLoadingState>((set) => ({
  active: false,
  message: "Loading…",
  start: (message = "Loading…") => set({ active: true, message }),
  stop: () => set({ active: false }),
}));
