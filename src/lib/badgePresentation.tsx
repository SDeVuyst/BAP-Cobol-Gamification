import type { LucideIcon } from "lucide-react";
import {
  AlignLeft,
  Boxes,
  CheckCheck,
  Crown,
  Flag,
  FlagTriangleRight,
  Flame,
  Gem,
  Layers,
  Medal,
  Repeat2,
  ShieldAlert,
  Split,
  Target,
  Timer,
  TimerReset,
  Trophy,
  Type,
  Zap,
} from "lucide-react";

export type BadgeTier = "bronze" | "silver" | "gold" | "platinum" | "legend";

const ICONS: Record<string, LucideIcon> = {
  AlignLeft,
  Boxes,
  CheckCheck,
  Crown,
  Flag,
  FlagTriangleRight,
  Flame,
  Gem,
  Layers,
  Medal,
  Repeat2,
  ShieldAlert,
  Split,
  Target,
  Timer,
  TimerReset,
  Trophy,
  Type,
  Zap,
};

export function normalizeTier(tier?: string | null): BadgeTier {
  if (tier === "silver" || tier === "gold" || tier === "platinum" || tier === "legend") return tier;
  return "bronze";
}

export function getBadgeDifficultyLabel(difficulty: number) {
  if (difficulty <= 1) return "Easy";
  if (difficulty === 2) return "Normal";
  if (difficulty === 3) return "Hard";
  if (difficulty === 4) return "Expert";
  return "Legendary";
}

export function getBadgeIconFromKey(iconKey?: string | null): LucideIcon {
  if (iconKey && ICONS[iconKey]) return ICONS[iconKey];
  return Gem;
}

export function badgeAccentClass(tier: BadgeTier, isEarned: boolean) {
  if (!isEarned) return "border-l-slate-700/55";
  return tier === "legend"
    ? "border-l-violet-500/60"
    : tier === "platinum"
      ? "border-l-cyan-600/55"
      : tier === "gold"
        ? "border-l-amber-400/55"
        : tier === "silver"
          ? "border-l-slate-300/45"
          : "border-l-amber-700/45";
}

