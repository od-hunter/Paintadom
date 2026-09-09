import { create } from "zustand";
import { persist } from "zustand/middleware";
import { COLORING_PAGES, difficultyMultiplier } from "@/data/pages";
import {
  hungFramesCount,
  getGallery,
  GALLERIES,
  GOALS,
  totalFrames,
} from "@/data/buildings";
import {
  DEFAULT_ACHIEVEMENTS,
  DEFAULT_DAILY_REWARDS,
  freshGoals,
  todayKey,
} from "@/data/rewards";
import {
  AD_DISCOUNT_MS,
  AD_DISCOUNT_PCT,
  AD_DISCOUNT_SLOT,
  AD_SPARK_TIERS,
  getPuzzleLevel,
  MAX_PUZZLE_LEVEL,
  puzzlePointsFromQuality,
  SPIN_REWARDS,
  spinCooldownMinutes,
  TOURNAMENTS,
} from "@/data/challenges";
import type { PlayerState } from "@/types/game";
import { setEmailWalletSession } from "@/lib/wallet-from-email";

interface GameStore extends PlayerState {
  hydrated: boolean;
  hasOnboarded: boolean;
  setHydrated: (value: boolean) => void;
  setWalletAddress: (address?: string) => void;
  setUsername: (username: string) => void;
  setAuthProfile: (email: string, walletAddress: string) => void;
  markHomeEntered: () => void;
  completeOnboarding: (
    username: string,
    kingdomName?: string,
    avatarId?: string
  ) => void;
  touchDailyActivity: () => void;
  savePageProgress: (pageId: string, percent: number, canvasData: string) => void;
  completePage: (
    pageId: string,
    opts?: { skipSparks?: boolean }
  ) => {
    sparks: number;
    kp: number;
    puzzlePoints: number;
  } | null;
  claimDailyReward: (day: number, opts?: { skipSparks?: boolean }) => number | null;
  buildStage: (
    buildingId: string,
    opts?: { skipDeduct?: boolean }
  ) => {
    ok: boolean;
    reason?: string;
    advancedLevel?: boolean;
    completedLevel?: number;
    cost?: number;
  };
  /** Apply pending level after level-up gifts are signed & claimed */
  confirmLevelAdvance: () => boolean;
  /** Effective spark cost after temporary ad discount */
  frameCost: (baseCost: number) => number;
  claimGoal: (goalId: string) => number | null;
  buySparks: (amount: number) => void;
  /** Merge verified on-chain sparkBalance into local sparks (delta only) */
  mergeOnChainSparks: (onChainBalance: number) => number;
  /** Set local sparks to match on-chain balance (after claim / spend / buy) */
  syncSparksFromChain: (onChainBalance: number) => void;
  refreshExpiredGoals: () => void;
  kingdomProgress: () => { built: number; total: number; pct: number };

  watchAd: (opts?: { skipSparks?: boolean }) => {
    sparks: number;
    discount?: { pct: number; until: number };
  } | null;
  unlockPuzzlePiece: (pieceId: string) => {
    ok: boolean;
    reason?: string;
    completed?: boolean;
    sparks?: number;
    completedLevel?: number;
  };
  claimSpin: () => (typeof SPIN_REWARDS)[number] | null;
  rollSpin: () => (typeof SPIN_REWARDS)[number] | null;
  claimPendingSpin: () => (typeof SPIN_REWARDS)[number] | null;
  joinTournament: (id: string) => { ok: boolean; reason?: string };
  claimTournamentPrize: (id: string, place: number) => boolean;
  claimStreakBonus: () => number | null;
  setSoundEnabled: (v: boolean) => void;
  setMusicEnabled: (v: boolean) => void;
  setLanguage: (lang: string) => void;
  registerInviteSuccess: () => { sparks: number; gDollars: number } | null;
  /** Wipe all progress and return to onboarding */
  resetGame: (opts?: { keepSettings?: boolean }) => void;
}

const challengeDefaults = {
  puzzlePoints: 0,
  puzzleUnlocked: {} as Record<string, string[]>,
  puzzleLevel: 1,
  adsWatchedToday: 0,
  adsWatchDate: "",
  artDiscountPct: 0,
  artDiscountUntil: 0,
  moves: 2,
  lastSpinDate: "",
  spinsToday: 0,
  spinCooldownUntil: 0,
  spinsInWindow: 0,
  spinWindowStart: 0,
  pendingSpin: null,
  streakClaimUntil: 0,
  tournamentJoined: {} as Record<string, boolean>,
  tournamentScore: {} as Record<string, number>,
  lastStreakClaimDate: "",
};

const initialState: PlayerState & { hasOnboarded: boolean } = {
  hasOnboarded: false,
  username: "",
  kingdomName: "",
  avatarId: "ember",
  level: 1,
  sparks: 0,
  onChainSparksSynced: 0,
  kingdomPoints: 0,
  streak: 0,
  lastActiveDate: "",
  pagesCompletedToday: 0,
  stagesBuiltToday: 0,
  buildingStages: {},
  pageProgress: {},
  dailyRewards: DEFAULT_DAILY_REWARDS.map((r) => ({ ...r, claimed: false })),
  lastDailyClaimDay: 0,
  lastDailyClaimDate: "",
  dailyCooldownUntil: 0,
  achievements: DEFAULT_ACHIEVEMENTS.map((a) => ({ ...a, unlocked: false })),
  goals: freshGoals(),
  email: undefined,
  walletAddress: undefined,
  goodDollars: 0,
  hasEnteredHome: false,
  soundEnabled: true,
  musicEnabled: true,
  language: "en",
  playerId: "",
  inviteCount: 0,
  accuracySum: 0,
  accuracySamples: 0,
  pendingLevelAdvance: null,
  ...challengeDefaults,
};

function createFreshState(): PlayerState & { hasOnboarded: boolean } {
  return {
    ...initialState,
    dailyRewards: DEFAULT_DAILY_REWARDS.map((r) => ({ ...r, claimed: false })),
    achievements: DEFAULT_ACHIEVEMENTS.map((a) => ({ ...a, unlocked: false })),
    goals: freshGoals(),
    buildingStages: {},
    pageProgress: {},
    puzzleUnlocked: {},
    tournamentJoined: {},
    tournamentScore: {},
    pendingLevelAdvance: null,
  };
}

function bumpGoal(
  goals: PlayerState["goals"],
  metric: "logins" | "pages" | "stages" | "streak",
  amount: number,
  streakValue?: number
) {
  const now = Date.now();
  return goals.map((g) => {
    const def = GOALS.find((d) => d.id === g.id);
    if (!def || def.metric !== metric || g.claimed || g.expiresAt < now) return g;
    if (metric === "streak" && streakValue != null) {
      return { ...g, progress: Math.max(g.progress, streakValue) };
    }
    return { ...g, progress: Math.min(def.target, g.progress + amount) };
  });
}

function resetAdsIfNeeded(state: PlayerState) {
  const today = todayKey();
  if (state.adsWatchDate === today) return state;
  return { ...state, adsWatchDate: today, adsWatchedToday: 0 };
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      hydrated: false,
      setHydrated: (value) => set({ hydrated: value }),
      setWalletAddress: (address) => set({ walletAddress: address }),
      setUsername: (username) => set({ username }),
      setAuthProfile: (email, walletAddress) => {
        setEmailWalletSession(email);
        set({ email, walletAddress });
      },
      markHomeEntered: () => set({ hasEnteredHome: true }),

      completeOnboarding: (username, _kingdomName = "", avatarId = "ember") => {
        const id =
          "PD-" +
          Math.random().toString(36).slice(2, 8).toUpperCase() +
          Date.now().toString(36).slice(-4).toUpperCase();
        set({
          hasOnboarded: true,
          username: username.trim() || "Painter",
          kingdomName: "",
          avatarId: avatarId || "ember",
          lastActiveDate: todayKey(),
          streak: 1,
          sparks: 0,
          buildingStages: {},
          pageProgress: {},
          goodDollars: 0,
          hasEnteredHome: false,
          playerId: id,
          inviteCount: 0,
          accuracySum: 0,
          accuracySamples: 0,
          goals: bumpGoal(freshGoals(), "logins", 1),
        });
      },

      refreshExpiredGoals: () => {
        const now = Date.now();
        set({
          goals: get().goals.map((g) => {
            if (g.expiresAt >= now) return g;
            const def = GOALS.find((d) => d.id === g.id);
            if (!def) return g;
            return {
              id: g.id,
              progress: 0,
              claimed: false,
              expiresAt: now + def.expiresInHours * 3600_000,
            };
          }),
        });
      },

      touchDailyActivity: () => {
        get().refreshExpiredGoals();
        const today = todayKey();
        const { lastActiveDate, streak } = get();
        if (lastActiveDate === today) return;

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = yesterday.toISOString().slice(0, 10);
        const nextStreak =
          lastActiveDate && lastActiveDate === yesterdayKey ? streak + 1 : 1;

        set({
          lastActiveDate: today,
          streak: nextStreak,
          pagesCompletedToday: 0,
          stagesBuiltToday: 0,
          adsWatchedToday: 0,
          adsWatchDate: today,
          spinsToday: 0,
          lastSpinDate: today,
          goals: bumpGoal(
            bumpGoal(get().goals, "logins", 1),
            "streak",
            0,
            nextStreak
          ),
          achievements: get().achievements.map((a) => {
            if (a.id === "streak-3" && nextStreak >= 3)
              return { ...a, unlocked: true };
            if (a.id === "streak-7" && nextStreak >= 7)
              return { ...a, unlocked: true };
            return a;
          }),
        });
      },

      savePageProgress: (pageId, percent, canvasData) => {
        const existing = get().pageProgress[pageId];
        // Don't overwrite a finished page's completed flag via autosave
        const nextPercent = Math.min(100, Math.max(0, percent));
        set({
          pageProgress: {
            ...get().pageProgress,
            [pageId]: {
              pageId,
              percent: existing?.completed
                ? Math.max(existing.percent ?? 0, nextPercent)
                : nextPercent,
              completed: existing?.completed ?? false,
              canvasData,
              updatedAt: Date.now(),
            },
          },
        });
      },

      completePage: (pageId, opts) => {
        const page = COLORING_PAGES.find((p) => p.id === pageId);
        if (!page) return null;
        const progress = get().pageProgress[pageId];
        if (progress?.completed) return null;
        /** Must fully paint before any Sparks / Markers are awarded */
        const quality = progress?.percent ?? 0;
        if (quality < 100) return null;

        get().touchDailyActivity();
        const pts = puzzlePointsFromQuality(quality, page.difficulty);
        const tourBoost: Record<string, number> = {
          ...get().tournamentScore,
        };
        if (get().tournamentJoined["tour-daily"]) {
          tourBoost["tour-daily"] = (tourBoost["tour-daily"] ?? 0) + page.sparksReward;
        }
        if (get().tournamentJoined["tour-weekly"]) {
          tourBoost["tour-weekly"] =
            (tourBoost["tour-weekly"] ?? 0) + page.sparksReward + 10;
        }

        const creditSparks = !opts?.skipSparks;
        set({
          sparks: creditSparks
            ? get().sparks + page.sparksReward
            : get().sparks,
          kingdomPoints: get().kingdomPoints + page.kingdomReward,
          puzzlePoints: get().puzzlePoints + pts,
          pagesCompletedToday: get().pagesCompletedToday + 1,
          tournamentScore: tourBoost,
          accuracySum: get().accuracySum + quality,
          accuracySamples: get().accuracySamples + 1,
          pageProgress: {
            ...get().pageProgress,
            [pageId]: {
              pageId,
              percent: 100,
              completed: true,
              canvasData: progress?.canvasData,
              updatedAt: Date.now(),
            },
          },
          goals: bumpGoal(get().goals, "pages", 1),
          achievements: get().achievements.map((a) => {
            if (a.id === "first-stroke") return { ...a, unlocked: true };
            if (a.id === "hard-mode" && page.difficulty === "hard") {
              return { ...a, unlocked: true };
            }
            return a;
          }),
        });
        return {
          sparks: page.sparksReward,
          kp: page.kingdomReward,
          puzzlePoints: pts,
        };
      },

      claimDailyReward: (day, opts) => {
        const today = todayKey();
        const now = Date.now();
        if (get().dailyCooldownUntil > now) {
          return null;
        }
        if (get().lastDailyClaimDate === today) {
          return null; // already claimed today
        }
        const rewards = get().dailyRewards;
        const reward = rewards.find((r) => r.day === day);
        if (!reward || reward.claimed) return null;
        if (day !== get().lastDailyClaimDay + 1) return null;

        /** Daily login also grants GoodDollar (G$) */
        const gDollar = Math.max(1, Math.round(reward.sparks / 25));
        const creditSparks = !opts?.skipSparks;

        set({
          sparks: creditSparks ? get().sparks + reward.sparks : get().sparks,
          goodDollars: get().goodDollars + gDollar,
          lastDailyClaimDay: day,
          lastDailyClaimDate: today,
          dailyCooldownUntil: now + 24 * 60 * 60_000,
          dailyRewards: rewards.map((r) =>
            r.day === day ? { ...r, claimed: true } : r
          ),
        });
        return reward.sparks;
      },

      frameCost: (baseCost) => {
        const { artDiscountPct, artDiscountUntil } = get();
        if (artDiscountPct > 0 && artDiscountUntil > Date.now()) {
          return Math.max(1, Math.round(baseCost * (1 - artDiscountPct / 100)));
        }
        return baseCost;
      },

      buildStage: (buildingId, opts) => {
        const prevLevel = get().level;
        const gallery = getGallery(prevLevel);
        const building = gallery.frames.find((b) => b.id === buildingId);
        if (!building) return { ok: false, reason: "Unknown frame" };

        const current = get().buildingStages[buildingId] ?? 0;
        if (current >= building.maxStages) {
          return { ok: false, reason: "Already hung" };
        }
        const cost = get().frameCost(building.stageCost);
        const skipDeduct = Boolean(opts?.skipDeduct);
        if (!skipDeduct && get().sparks < cost) {
          return {
            ok: false,
            reason: "Not enough Sparks — paint more or buy some!",
          };
        }

        const nextStages = {
          ...get().buildingStages,
          [buildingId]: current + 1,
        };

        const hung = hungFramesCount(gallery, nextStages);
        const total = totalFrames(gallery);
        const complete = hung >= total;
        let advanced = false;

        if (complete && prevLevel < GALLERIES.length) {
          advanced = true;
        }

        const tourBoost = { ...get().tournamentScore };
        if (get().tournamentJoined["tour-weekly"]) {
          tourBoost["tour-weekly"] = (tourBoost["tour-weekly"] ?? 0) + 25;
        }

        set({
          sparks: skipDeduct ? get().sparks : get().sparks - cost,
          buildingStages: nextStages,
          stagesBuiltToday: get().stagesBuiltToday + 1,
          tournamentScore: tourBoost,
          goals: bumpGoal(get().goals, "stages", 1),
          achievements: get().achievements.map((a) =>
            a.id === "kingdom-builder" && complete
              ? { ...a, unlocked: true }
              : a
          ),
          ...(advanced
            ? { pendingLevelAdvance: prevLevel + 1 }
            : {}),
        });

        return {
          ok: true,
          advancedLevel: advanced,
          completedLevel: complete ? prevLevel : undefined,
          cost,
        };
      },

      confirmLevelAdvance: () => {
        const next = get().pendingLevelAdvance;
        if (!next || next <= get().level) return false;
        set({
          level: next,
          buildingStages: {},
          pendingLevelAdvance: null,
        });
        return true;
      },

      claimGoal: (goalId) => {
        const def = GOALS.find((g) => g.id === goalId);
        const goal = get().goals.find((g) => g.id === goalId);
        if (!def || !goal || goal.claimed) return null;
        if (goal.progress < def.target) return null;
        if (goal.expiresAt < Date.now()) return null;

        set({
          sparks: get().sparks + def.rewardSparks,
          goals: get().goals.map((g) =>
            g.id === goalId ? { ...g, claimed: true } : g
          ),
        });
        return def.rewardSparks;
      },

      buySparks: (amount) => {
        set({ sparks: get().sparks + amount });
      },
      mergeOnChainSparks: (onChainBalance) => {
        const prev = get().onChainSparksSynced || 0;
        const next = Math.max(0, Math.floor(onChainBalance));
        const delta = Math.max(0, next - prev);
        if (delta > 0) {
          set({
            sparks: get().sparks + delta,
            onChainSparksSynced: next,
          });
        } else {
          set({ onChainSparksSynced: next });
        }
        return delta;
      },
      syncSparksFromChain: (onChainBalance) => {
        const next = Math.max(0, Math.floor(onChainBalance));
        set({
          sparks: next,
          onChainSparksSynced: next,
        });
      },

      watchAd: (opts) => {
        const patched = resetAdsIfNeeded(get());
        if (patched.adsWatchedToday !== get().adsWatchedToday) {
          set({
            adsWatchDate: patched.adsWatchDate,
            adsWatchedToday: patched.adsWatchedToday,
          });
        }
        const idx = get().adsWatchedToday;
        if (idx >= AD_SPARK_TIERS.length) return null;
        const sparks = AD_SPARK_TIERS[idx];
        const creditSparks = !opts?.skipSparks;
        const patch: Partial<PlayerState> = {
          sparks: creditSparks ? get().sparks + sparks : get().sparks,
          adsWatchedToday: idx + 1,
          adsWatchDate: todayKey(),
        };
        let discount: { pct: number; until: number } | undefined;
        if (idx === AD_DISCOUNT_SLOT) {
          const until = Date.now() + AD_DISCOUNT_MS;
          patch.artDiscountPct = AD_DISCOUNT_PCT;
          patch.artDiscountUntil = until;
          discount = { pct: AD_DISCOUNT_PCT, until };
        }
        set(patch);
        return { sparks, discount };
      },

      unlockPuzzlePiece: (pieceId) => {
        const pz = getPuzzleLevel(get().puzzleLevel);
        const piece = pz.pieces.find((p) => p.id === pieceId);
        if (!piece) return { ok: false, reason: "Unknown piece" };
        const unlocked = get().puzzleUnlocked[pz.id] ?? [];
        if (unlocked.includes(pieceId)) {
          return { ok: false, reason: "Already unlocked" };
        }
        if (get().puzzlePoints < piece.cost) {
          return { ok: false, reason: "Need more Markers — paint more accurately!" };
        }
        const nextUnlocked = [...unlocked, pieceId];
        const done = nextUnlocked.length >= pz.pieces.length;
        const patch: Partial<PlayerState> = {
          puzzlePoints: get().puzzlePoints - piece.cost,
          puzzleUnlocked: {
            ...get().puzzleUnlocked,
            [pz.id]: nextUnlocked,
          },
        };
        if (done) {
          patch.sparks = get().sparks + pz.completeSparks;
          patch.puzzleLevel = Math.min(get().puzzleLevel + 1, MAX_PUZZLE_LEVEL);
        }
        set(patch);
        return {
          ok: true,
          completed: done,
          sparks: done ? pz.completeSparks : undefined,
          completedLevel: done ? pz.level : undefined,
        };
      },

      claimSpin: () => {
        // Legacy: roll + claim in one step
        const rolled = get().rollSpin();
        if (!rolled) return null;
        return get().claimPendingSpin();
      },

      rollSpin: () => {
        const now = Date.now();
        let { spinsInWindow, spinWindowStart, spinCooldownUntil, pendingSpin } =
          get();

        // Reset window after 24h
        if (spinWindowStart && now - spinWindowStart >= 24 * 60 * 60_000) {
          spinsInWindow = 0;
          spinWindowStart = 0;
          spinCooldownUntil = 0;
          set({ spinsInWindow: 0, spinWindowStart: 0, spinCooldownUntil: 0 });
        }

        if (pendingSpin) return pendingSpin;
        if (spinCooldownUntil > now) return null;

        const reward =
          SPIN_REWARDS[Math.floor(Math.random() * SPIN_REWARDS.length)];
        set({ pendingSpin: reward });
        return reward;
      },

      claimPendingSpin: () => {
        const pending = get().pendingSpin;
        if (!pending) return null;
        const now = Date.now();
        let spinsInWindow = get().spinsInWindow;
        let spinWindowStart = get().spinWindowStart;

        if (spinWindowStart && now - spinWindowStart >= 24 * 60 * 60_000) {
          spinsInWindow = 0;
          spinWindowStart = now;
        }
        if (!spinWindowStart) spinWindowStart = now;

        spinsInWindow += 1;
        const mins = spinCooldownMinutes(spinsInWindow);

        set({
          pendingSpin: null,
          sparks: get().sparks + pending.sparks,
          puzzlePoints: get().puzzlePoints + pending.puzzlePoints,
          moves: get().moves + pending.moves,
          spinsInWindow,
          spinWindowStart,
          spinCooldownUntil: now + mins * 60_000,
          spinsToday: spinsInWindow,
          lastSpinDate: todayKey(),
        });
        return pending;
      },

      claimStreakBonus: () => {
        const now = Date.now();
        if (get().streakClaimUntil > now) return null;
        const streak = get().streak;
        if (streak < 1) return null;
        const bonus = Math.min(200, 15 + streak * 12);
        set({
          sparks: get().sparks + bonus,
          lastStreakClaimDate: todayKey(),
          streakClaimUntil: now + 24 * 60 * 60_000,
        });
        return bonus;
      },

      setSoundEnabled: (v) => set({ soundEnabled: v }),
      setMusicEnabled: (v) => set({ musicEnabled: v }),
      setLanguage: (lang) => set({ language: lang }),

      registerInviteSuccess: () => {
        const n = get().inviteCount + 1;
        const sparks = Math.max(15, 80 - (n - 1) * 8);
        const gDollars = Math.max(1, 6 - Math.floor((n - 1) / 2));
        set({
          inviteCount: n,
          sparks: get().sparks + sparks,
          goodDollars: get().goodDollars + gDollars,
        });
        return { sparks, gDollars };
      },

      joinTournament: (id) => {
        const def = TOURNAMENTS.find((t) => t.id === id);
        if (!def) return { ok: false, reason: "Unknown tournament" };
        if (get().tournamentJoined[id]) {
          return { ok: false, reason: "Already joined" };
        }
        if (get().sparks < def.entryCost) {
          return { ok: false, reason: "Not enough Sparks" };
        }
        set({
          sparks: get().sparks - def.entryCost,
          tournamentJoined: { ...get().tournamentJoined, [id]: true },
          tournamentScore: {
            ...get().tournamentScore,
            [id]: get().tournamentScore[id] ?? 0,
          },
        });
        return { ok: true };
      },

      claimTournamentPrize: (id, place) => {
        const def = TOURNAMENTS.find((t) => t.id === id);
        if (!def || !get().tournamentJoined[id]) return false;
        const prize = def.prizes.find((p) => p.place === place);
        if (!prize) return false;
        const key = `${id}-claimed`;
        if (get().tournamentJoined[key]) return false;
        set({
          sparks: get().sparks + prize.sparks,
          puzzlePoints: get().puzzlePoints + prize.puzzlePoints,
          moves: get().moves + prize.moves,
          tournamentJoined: { ...get().tournamentJoined, [key]: true },
        });
        return true;
      },

      kingdomProgress: () => {
        const gallery = getGallery(get().level);
        const built = hungFramesCount(gallery, get().buildingStages);
        const total = totalFrames(gallery);
        return { built, total, pct: Math.round((built / total) * 100) };
      },

      resetGame: (opts) => {
        const keepSettings = opts?.keepSettings ?? true;
        const soundEnabled = keepSettings ? get().soundEnabled : true;
        const musicEnabled = keepSettings ? get().musicEnabled : true;
        const language = keepSettings ? get().language : "en";
        setEmailWalletSession(undefined);
        set({
          ...createFreshState(),
          hydrated: true,
          soundEnabled,
          musicEnabled,
          language,
        });
      },
    }),
    {
      name: "paintadom-game-v8",
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
        if (state?.email) {
          setEmailWalletSession(state.email);
        }
      },
      partialize: (state) => {
        const { hydrated, ...rest } = state;
        void hydrated;
        return rest;
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<
          PlayerState & { hasOnboarded?: boolean; paintClaimVersion?: number }
        >;
        const rawProgress = (p.pageProgress ??
          {}) as PlayerState["pageProgress"];
        /** One-time: clear legacy Done checks that weren't true 100% claims */
        const needsSanitize = (p.paintClaimVersion ?? 0) < 1;
        const pageProgress = needsSanitize
          ? Object.fromEntries(
              Object.entries(rawProgress).map(([id, prog]) => [
                id,
                {
                  ...prog,
                  completed: false,
                  percent: Math.min(100, Math.max(0, prog?.percent ?? 0)),
                },
              ])
            )
          : rawProgress;
        return {
          ...current,
          ...p,
          pageProgress,
          paintClaimVersion: 1,
          puzzlePoints: p.puzzlePoints ?? 0,
          puzzleUnlocked: p.puzzleUnlocked ?? {},
          puzzleLevel: p.puzzleLevel ?? 1,
          adsWatchedToday: p.adsWatchedToday ?? 0,
          adsWatchDate: p.adsWatchDate ?? "",
          artDiscountPct: p.artDiscountPct ?? 0,
          artDiscountUntil: p.artDiscountUntil ?? 0,
          moves: p.moves ?? 2,
          lastSpinDate: p.lastSpinDate ?? "",
          spinsToday: p.spinsToday ?? 0,
          spinCooldownUntil: p.spinCooldownUntil ?? 0,
          spinsInWindow: p.spinsInWindow ?? 0,
          spinWindowStart: p.spinWindowStart ?? 0,
          pendingSpin: p.pendingSpin ?? null,
          streakClaimUntil: p.streakClaimUntil ?? 0,
          tournamentJoined: p.tournamentJoined ?? {},
          tournamentScore: p.tournamentScore ?? {},
          lastStreakClaimDate: p.lastStreakClaimDate ?? "",
          goodDollars: p.goodDollars ?? 0,
          hasEnteredHome: p.hasEnteredHome ?? false,
          lastDailyClaimDate: p.lastDailyClaimDate ?? "",
          dailyCooldownUntil: p.dailyCooldownUntil ?? 0,
          soundEnabled: p.soundEnabled ?? true,
          musicEnabled: p.musicEnabled ?? true,
          language: p.language ?? "en",
          playerId:
            p.playerId ||
            "PD-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
          inviteCount: p.inviteCount ?? 0,
          accuracySum: p.accuracySum ?? 0,
          accuracySamples: p.accuracySamples ?? 0,
          pendingLevelAdvance: p.pendingLevelAdvance ?? null,
          email: p.email,
          walletAddress: p.walletAddress,
        } as GameStore;
      },
    }
  )
);

export function getCompletedPageCount() {
  return Object.values(useGameStore.getState().pageProgress).filter(
    (p) => p.completed
  ).length;
}

export function getAverageDifficultyMultiplier() {
  const completed = Object.values(useGameStore.getState().pageProgress).filter(
    (p) => p.completed
  );
  if (completed.length === 0) return 1;
  const total = completed.reduce((sum, item) => {
    const page = COLORING_PAGES.find((p) => p.id === item.pageId);
    return sum + (page ? difficultyMultiplier(page.difficulty) : 1);
  }, 0);
  return total / completed.length;
}

export function getTotalStagesBuilt() {
  return Object.values(useGameStore.getState().buildingStages).reduce(
    (a, b) => a + b,
    0
  );
}
