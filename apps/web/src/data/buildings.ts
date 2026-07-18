export type GoalKind = "daily" | "weekly" | "challenge";

export interface FrameSlot {
  id: string;
  name: string;
  /** Sparks cost to hang this frame (one purchase = hung) */
  stageCost: number;
  /** Always 1 — one hang fills the wall slot */
  maxStages: number;
  /** Position on gallery room (% of room canvas) */
  x: number;
  y: number;
  size: number;
  /** Which gallery art piece hangs here when unlocked */
  artIndex: number;
}

export interface GalleryWing {
  level: number;
  name: string;
  tagline: string;
  backdrop: string;
  frames: FrameSlot[];
}

/** Exactly 8 hangable frame slots per wing. One Spark purchase fills a slot. */
function eightFrames(
  prefix: string,
  costs: number[],
  layout: { x: number; y: number; size: number }[]
): FrameSlot[] {
  const names = [
    "Oak Frame",
    "Gold Oval",
    "Sky Panel",
    "Rose Frame",
    "Royal Square",
    "Teal Frame",
    "Amber Frame",
    "Crown Piece",
  ];
  return layout.map((pos, i) => ({
    id: `${prefix}-f${i + 1}`,
    name: names[i],
    stageCost: costs[i],
    maxStages: 1,
    x: pos.x,
    y: pos.y,
    size: pos.size,
    artIndex: i,
  }));
}

/** Spread across a wide panable room (positions are % of the room, not just the phone viewport) */
const ROOM_LAYOUT: { x: number; y: number; size: number }[] = [
  { x: 14, y: 28, size: 11 },
  { x: 32, y: 24, size: 12 },
  { x: 52, y: 26, size: 11 },
  { x: 72, y: 24, size: 12 },
  { x: 88, y: 30, size: 10 },
  { x: 22, y: 52, size: 12 },
  { x: 48, y: 50, size: 13 },
  { x: 76, y: 54, size: 12 },
];

const BACKDROPS = [
  "/bg/gallery.webp",
  "/bg/gallery-l2.webp",
  "/bg/gallery-l3.webp",
];

const WING_NAMES = [
  "Sunrise Wing",
  "Color Hall",
  "Royal Atelier",
  "Moonlight Court",
  "Coral Arcade",
  "Jade Pavilion",
  "Storm Gallery",
  "Golden Forum",
  "Crystal Wing",
  "Ember Hall",
  "Azure Vault",
  "Mythic Salon",
  "Starlit Annex",
  "Crown Museum",
  "Legend Atelier",
];

/** Escalating frame costs — higher levels need far more Sparks */
function costsForLevel(level: number): number[] {
  const base = 10 + level * level * 8;
  const steps = [1, 1.4, 1.9, 2.5, 3.2, 4.1, 5.2, 6.5];
  return steps.map((m) => Math.round(base * m));
}

/** 15 gallery wings for now — expand as players progress */
export const GALLERIES: GalleryWing[] = Array.from({ length: 15 }, (_, i) => {
  const level = i + 1;
  return {
    level,
    name: WING_NAMES[i],
    tagline:
      level === 1
        ? "Hang your first masterpieces"
        : level < 5
          ? "A brighter collection"
          : level < 10
            ? "Rare works demand more Sparks"
            : "Legendary walls for true painters",
    backdrop: BACKDROPS[i % BACKDROPS.length],
    frames: eightFrames(`s${level}`, costsForLevel(level), ROOM_LAYOUT),
  };
});

export function getGallery(level: number): GalleryWing {
  return GALLERIES.find((g) => g.level === level) ?? GALLERIES[GALLERIES.length - 1];
}

/** How many of the 8 frames are hung (stage ≥ 1) */
export function hungFramesCount(
  gallery: GalleryWing,
  progress: Record<string, number>
) {
  return gallery.frames.filter((f) => (progress[f.id] ?? 0) >= 1).length;
}

export function totalFrames(gallery: GalleryWing) {
  return gallery.frames.length;
}

/** @deprecated use hungFramesCount — kept for stage-sum goals if needed */
export function totalFrameStages(gallery: GalleryWing) {
  return gallery.frames.reduce((sum, f) => sum + f.maxStages, 0);
}

export function builtFrameStages(
  gallery: GalleryWing,
  progress: Record<string, number>
) {
  return hungFramesCount(gallery, progress);
}

/** Colorful paintings hung into wall frames */
export const GALLERY_ART: { id: string; title: string; src: string }[] = [
  { id: "moonlit-castle", title: "Moonlit Castle", src: "/gallery-art/moonlit-castle.svg" },
  { id: "dragon-valley", title: "Dragon Valley", src: "/gallery-art/dragon-valley.svg" },
  { id: "enchanted-forest", title: "Enchanted Forest", src: "/gallery-art/enchanted-forest.svg" },
  { id: "harbor-dawn", title: "Harbor Dawn", src: "/gallery-art/harbor-dawn.svg" },
  { id: "sky-temple", title: "Sky Temple", src: "/gallery-art/sky-temple.svg" },
  { id: "fox-meadow", title: "Fox Meadow", src: "/gallery-art/fox-meadow.svg" },
  { id: "castle-dusk", title: "Castle Dusk", src: "/gallery-art/castle-dusk.svg" },
  { id: "valley-dawn", title: "Valley Dawn", src: "/gallery-art/valley-dawn.svg" },
];

export function artForFrame(frame: FrameSlot) {
  return GALLERY_ART[frame.artIndex % GALLERY_ART.length];
}

export interface GoalDef {
  id: string;
  kind: GoalKind;
  title: string;
  icon: string;
  expiresInHours: number;
  rewardSparks: number;
  target: number;
  metric: "logins" | "pages" | "stages" | "streak";
}

export const GOALS: GoalDef[] = [
  { id: "daily-login", kind: "daily", title: "Daily Login", icon: "/icons/daily.webp", expiresInHours: 24, rewardSparks: 30, target: 1, metric: "logins" },
  { id: "daily-paint", kind: "daily", title: "Paint 1 Page", icon: "/icons/album.webp", expiresInHours: 24, rewardSparks: 50, target: 1, metric: "pages" },
  { id: "daily-hang", kind: "daily", title: "Hang 1 Frame", icon: "/icons/gallery.webp", expiresInHours: 24, rewardSparks: 40, target: 1, metric: "stages" },
  { id: "weekly-pages", kind: "weekly", title: "Paint 5 Pages", icon: "/icons/album.webp", expiresInHours: 168, rewardSparks: 200, target: 5, metric: "pages" },
  { id: "weekly-streak", kind: "weekly", title: "3-Day Streak", icon: "/icons/streak.webp", expiresInHours: 168, rewardSparks: 150, target: 3, metric: "streak" },
  { id: "chal-curator", kind: "challenge", title: "Master Curator", icon: "/icons/gift.webp", expiresInHours: 72, rewardSparks: 250, target: 6, metric: "stages" },
];

export const PIKA_TIPS = [
  "Sparks hang art on your wall — paint to earn more!",
  "Fill all 8 frames to open the next gallery wing.",
  "Drag the room to look around your gallery.",
  "Daily login keeps your streak glowing.",
  "Tap the gallery button to hang frames with Sparks.",
  "Out of Sparks? Paint a page or buy a Spark pack.",
  "Weekly goals give huge Spark bonuses!",
  "Your gallery grows more beautiful with every page.",
  "Welcome to Paintadom — paint, hang, bloom!",
];

/** Single gallery welcome / splash scene */
export const WELCOME_BG = "/bg/welcome-lumo.webp";

/** Helper mascots used in news / UI chrome — not selectable player avatars */
export const HELPER_MASCOTS = [
  { id: "lumo", name: "Lumo", src: "/mascots/lumo.webp" },
  { id: "pika", name: "Pika", src: "/mascots/pika.webp" },
  { id: "brik", name: "Brik", src: "/mascots/brik.webp" },
  { id: "nova", name: "Nova", src: "/mascots/nova.webp" },
] as const;

/** Player-selectable avatars (8 options — helpers are separate) */
export const AVATARS = [
  { id: "ember", name: "Ember", src: "/avatars/ember.webp" },
  { id: "coral", name: "Coral", src: "/avatars/coral.webp" },
  { id: "jade", name: "Jade", src: "/avatars/jade.webp" },
  { id: "mist", name: "Mist", src: "/avatars/mist.webp" },
  { id: "solar", name: "Solar", src: "/avatars/solar.webp" },
  { id: "violet", name: "Violet", src: "/avatars/violet.webp" },
  { id: "terra", name: "Terra", src: "/avatars/terra.webp" },
  { id: "azure", name: "Azure", src: "/avatars/azure.webp" },
] as const;

export type AvatarId = (typeof AVATARS)[number]["id"];

export function getAvatar(id?: string) {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}

// ---- Legacy aliases ----
export const KINGDOMS = GALLERIES.map((g) => ({
  level: g.level,
  name: g.name,
  tagline: g.tagline,
  backdrop: g.backdrop,
  buildings: g.frames.map((f) => ({
    id: f.id,
    name: f.name,
    sprite: "/icons/gallery.webp",
    stageCost: f.stageCost,
    maxStages: f.maxStages,
  })),
}));

export function getKingdom(level: number) {
  return KINGDOMS.find((g) => g.level === level) ?? KINGDOMS[KINGDOMS.length - 1];
}

export function totalStages(k: {
  buildings?: { maxStages: number }[];
  frames?: { maxStages: number }[];
}) {
  if ("frames" in k && k.frames) return k.frames.length;
  return (k.buildings ?? []).length;
}

export function builtStages(
  k: {
    buildings?: { id: string; maxStages: number }[];
    frames?: { id: string; maxStages: number }[];
  },
  progress: Record<string, number>
) {
  const items = k.frames ?? k.buildings ?? [];
  return items.filter((b) => (progress[b.id] ?? 0) >= 1).length;
}

export const KINGDOM_BUILDINGS = GALLERIES.flatMap((g) =>
  g.frames.map((f) => ({
    id: f.id,
    name: f.name,
    requiredLevel: g.level,
    assetEmoji: "",
    sprite: "/icons/gallery.webp",
    scale: 1,
    tier: g.name,
  }))
);

export function getTierForLevel(level: number) {
  const g = getGallery(level);
  return {
    min: g.level,
    max: g.level,
    label: g.name,
    next: GALLERIES.find((n) => n.level === g.level + 1)?.name ?? "Legend Gallery",
  };
}

export function kpNeededForNextTier(level: number) {
  return getGallery(level).frames.reduce((s, f) => s + f.stageCost, 0);
}
