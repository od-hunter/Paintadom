export type Difficulty = "easy" | "medium" | "hard";

export interface ColoringPage {
  id: string;
  title: string;
  difficulty: Difficulty;
  /** Sparks earned when the page is finished */
  sparksReward: number;
  kingdomReward: number;
  thumbnail: string;
  lineArt: string;
  /** Gallery wing / game level this page belongs to */
  level: number;
  buildingPiece?: string;
  unlockHint?: string;
}

export interface KingdomBuilding {
  id: string;
  name: string;
  requiredLevel: number;
  assetEmoji: string;
  sprite: string;
  scale: number;
  tier: string;
}

export interface UserBuilding {
  buildingId: string;
  unlockedAt: number;
  placed: boolean;
  x: number;
  y: number;
}

export interface PageProgress {
  pageId: string;
  percent: number;
  completed: boolean;
  canvasData?: string;
  updatedAt: number;
}

export interface DailyReward {
  day: number;
  label: string;
  sparks: number;
  type: "sparks" | "chest" | "building" | "legend";
  claimed: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  icon: string;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  kingdomScore: number;
  level: number;
  rank: number;
  isYou?: boolean;
}

export interface GoalProgress {
  id: string;
  progress: number;
  claimed: boolean;
  expiresAt: number;
}

export interface PlayerState {
  username: string;
  kingdomName: string;
  /** Selected mascot avatar id */
  avatarId: string;
  /** Current kingdom level (1 = Willow Meadow, …) */
  level: number;
  /** Spendable Sparks — earned by painting, spent on building */
  sparks: number;
  /** Last on-chain sparkBalance merged into local sparks (anti double-credit) */
  onChainSparksSynced: number;
  kingdomPoints: number;
  streak: number;
  lastActiveDate: string;
  pagesCompletedToday: number;
  stagesBuiltToday: number;
  /** buildingId → current stage (0..maxStages) */
  buildingStages: Record<string, number>;
  pageProgress: Record<string, PageProgress>;
  dailyRewards: DailyReward[];
  lastDailyClaimDay: number;
  /** Calendar date (YYYY-MM-DD) of last daily reward claim — 1 per day */
  lastDailyClaimDate: string;
  /** Next daily claim allowed after this timestamp (24h) */
  dailyCooldownUntil: number;
  achievements: Achievement[];
  goals: GoalProgress[];
  walletAddress?: string;
  /** Verified account email */
  email?: string;
  /** GoodDollar (G$) balance from daily logins */
  goodDollars: number;
  /** True after first home visit — returning sessions see news */
  hasEnteredHome: boolean;
  /** Sound / music preferences */
  soundEnabled: boolean;
  musicEnabled: boolean;
  language: string;
  /** Stable invite / player code */
  playerId: string;
  /** Successful invites credited */
  inviteCount: number;
  /** Running accuracy sum & sample count (from completed page %) */
  accuracySum: number;
  accuracySamples: number;

  /** Challenge economy */
  puzzlePoints: number;
  puzzleUnlocked: Record<string, string[]>;
  puzzleLevel: number;
  adsWatchedToday: number;
  adsWatchDate: string;
  artDiscountPct: number;
  artDiscountUntil: number;
  moves: number;
  lastSpinDate: string;
  spinsToday: number;
  /** Timestamp when next spin is allowed */
  spinCooldownUntil: number;
  /** Spins in current 24h window (drives cooldown length) */
  spinsInWindow: number;
  /** When the 24h spin window started */
  spinWindowStart: number;
  /** Pending spin reward waiting to be claimed */
  pendingSpin: {
    label: string;
    sparks: number;
    puzzlePoints: number;
    moves: number;
  } | null;
  /** Streak bonus available again after this timestamp */
  streakClaimUntil: number;
  tournamentJoined: Record<string, boolean>;
  tournamentScore: Record<string, number>;
  lastStreakClaimDate: string;
}
