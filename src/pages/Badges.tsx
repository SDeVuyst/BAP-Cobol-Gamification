import { useEffect, useMemo, useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import type { BadgeDefinition } from "@/lib/badgeDefinitions";
import { fetchBadgeDefinitions } from "@/lib/badgeDefinitions";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MainframeStrip } from "@/components/mainframe/MainframeStrip";
import { cn } from "@/lib/utils";
import { badgeAccentClass, getBadgeDifficultyLabel, getBadgeIconFromKey, normalizeTier } from "@/lib/badgePresentation";
import { Crown, Lock, ShieldCheck, Sparkles, Loader2, Stars } from "lucide-react";

const Badges = () => {
  const profile = useAuthStore((s) => s.profile);
  const [userBadges, setUserBadges] = useState<{ badge_id: string }[]>([]);
  const [definitions, setDefinitions] = useState<BadgeDefinition[]>([]);
  const [definitionsLoading, setDefinitionsLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("user_badges")
        .select("badge_id")
        .eq("user_id", profile.id);
      if (cancelled) return;
      if (error) {
        console.error(error);
        return;
      }
      setUserBadges((data as { badge_id: string }[]) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDefinitionsLoading(true);
      try {
        const rows = await fetchBadgeDefinitions();
        if (!cancelled) setDefinitions(rows);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setDefinitionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const badgeCards = useMemo(() => {
    const earned = new Set(userBadges.map((b) => b.badge_id));
    return definitions.map((d) => {
      const isEarned = earned.has(d.id);
      const label = d.name ?? d.id;
      const tier = normalizeTier(d.tier);
      const accent = badgeAccentClass(tier, isEarned);
      const Icon = getBadgeIconFromKey(d.icon_key);
      const difficulty = d.difficulty ?? 1;
      const howTo = d.how_to_earn ?? d.description ?? "";
      return { id: d.id, label, accent, Icon, isEarned, tier, difficulty, howTo };
    });
  }, [userBadges, definitions]);

  const totalBadges = definitions.length;
  const lockedCount = Math.max(0, totalBadges - userBadges.length);

  const badgesByDifficulty = useMemo(() => {
    const groups = new Map<number, typeof badgeCards>();
    for (const b of badgeCards) {
      const d = b.difficulty ?? 1;
      if (!groups.has(d)) groups.set(d, []);
      groups.get(d)!.push(b);
    }
    for (const [d, rows] of groups.entries()) {
      rows.sort((a, b) => {
        if (a.isEarned !== b.isEarned) return a.isEarned ? -1 : 1; // earned first
        return a.label.localeCompare(b.label);
      });
      groups.set(d, rows);
    }
    return groups;
  }, [badgeCards]);

  const difficultySectionChrome = (difficulty: number) => {
    // Keep sections intentionally subtle; the tiles carry the "gamey" look.
    if (difficulty >= 5) return "border-slate-700/45 bg-black/20";
    if (difficulty === 4) return "border-slate-700/45 bg-black/20";
    if (difficulty === 3) return "border-slate-700/45 bg-black/20";
    if (difficulty === 2) return "border-slate-700/45 bg-black/20";
    return "border-slate-700/45 bg-black/20";
  };

  const premiumTile = (difficulty: number, isEarned: boolean) => {
    if (!isEarned) return "";
    if (difficulty >= 5)
      return "shadow-[0_0_26px_rgba(167,139,250,0.18)] ring-1 ring-violet-500/25";
    if (difficulty === 4)
      return "shadow-[0_0_22px_rgba(34,211,238,0.16)] ring-1 ring-cyan-600/20";
    if (difficulty === 3)
      return "shadow-[0_0_18px_rgba(245,158,11,0.14)] ring-1 ring-amber-500/15";
    return "";
  };

  const iconTone = (difficulty: number, isEarned: boolean) => {
    if (!isEarned) return "text-slate-500";
    if (difficulty >= 5) return "text-violet-200";
    if (difficulty === 4) return "text-cyan-100";
    if (difficulty === 3) return "text-amber-100";
    if (difficulty === 2) return "text-slate-200";
    return "text-slate-200";
  };

  const badgeTileClasses = (difficulty: number, isEarned: boolean) => {
    const base =
      "group relative overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-all duration-200 hover:-translate-y-0.5";
    const locked = "border-slate-700/50 text-slate-400";
    const earned = "border-slate-600/60 text-slate-200";

    if (!isEarned) {
      // Locked badges are intentionally neutral (no difficulty color).
      return cn(base, locked);
    }

    if (difficulty >= 5) return cn(base, earned, "shadow-[0_0_42px_rgba(167,139,250,0.22)] ring-1 ring-violet-500/25");
    if (difficulty === 4) return cn(base, earned, "shadow-[0_0_26px_rgba(34,211,238,0.18)] ring-1 ring-cyan-500/20");
    if (difficulty === 3) return cn(base, earned, "shadow-[0_0_22px_rgba(245,158,11,0.16)] ring-1 ring-amber-500/15");
    return cn(base, earned);
  };

  const badgeTileBackground = (difficulty: number, isEarned: boolean): React.CSSProperties => {
    // Inline styles so we fully control the visuals (no Tailwind/CSS ordering surprises).
    if (!isEarned) {
      // Locked: consistent neutral slate/black (ignore difficulty color).
      return {
        background:
          "radial-gradient(900px circle at 20% 0%, rgba(148,163,184,0.06), transparent 55%), linear-gradient(180deg, rgba(15,23,42,0.22), rgba(0,0,0,0.68))",
      };
    }

    if (difficulty >= 5)
      return {
        background:
          "radial-gradient(900px circle at 15% 0%, rgba(167,139,250,0.18), transparent 52%), radial-gradient(900px circle at 85% 35%, rgba(236,72,153,0.12), transparent 58%), linear-gradient(180deg, rgba(2,6,23,0.55), rgba(0,0,0,0.28))",
      };
    if (difficulty === 4)
      return {
        background:
          "radial-gradient(800px circle at 20% 0%, rgba(34,211,238,0.14), transparent 52%), radial-gradient(700px circle at 85% 60%, rgba(16,185,129,0.10), transparent 58%), linear-gradient(180deg, rgba(2,6,23,0.55), rgba(0,0,0,0.28))",
      };
    if (difficulty === 3)
      return {
        background:
          "radial-gradient(800px circle at 18% 0%, rgba(245,158,11,0.16), transparent 52%), linear-gradient(180deg, rgba(2,6,23,0.55), rgba(0,0,0,0.28))",
      };
    if (difficulty === 2)
      return {
        background:
          "radial-gradient(800px circle at 18% 0%, rgba(34,211,238,0.10), transparent 54%), linear-gradient(180deg, rgba(2,6,23,0.50), rgba(0,0,0,0.28))",
      };

    return { background: "linear-gradient(180deg, rgba(2,6,23,0.48), rgba(0,0,0,0.28))" };
  };

  const difficultyHeaderTone = (difficulty: number) => {
    if (difficulty >= 5) return "text-violet-200";
    if (difficulty === 4) return "text-cyan-100";
    if (difficulty === 3) return "text-amber-100";
    if (difficulty === 2) return "text-slate-200";
    return "text-slate-200";
  };

  const difficultyChipTone = (difficulty: number) => {
    if (difficulty >= 5) return "border-violet-500/35 bg-violet-950/25 text-violet-200";
    if (difficulty === 4) return "border-cyan-600/35 bg-cyan-950/25 text-cyan-100";
    if (difficulty === 3) return "border-amber-500/30 bg-amber-950/20 text-amber-100";
    if (difficulty === 2) return "border-slate-600/35 bg-black/25 text-slate-200";
    return "border-slate-700/45 bg-black/25 text-slate-200";
  };

  if (!profile) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p>Loading your profile...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mainframe-page relative space-y-8 animate-fade-in">
        <div className="mainframe-glow-soft-tl" />
        <div className="mainframe-glow-soft-br" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-1 font-mono text-[10px] text-slate-500 md:text-xs">* BADGE REGISTRY - FULL CATALOG *</p>
            <h1 className="text-3xl font-bold tracking-tight">Badges</h1>
            <p className="text-muted-foreground">Bekijk welke badges je al hebt en hoe je de rest unlockt.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded border border-slate-600/40 bg-black/35 px-3 py-1 font-mono text-xs text-slate-300">
            <Crown className="h-4 w-4 text-slate-400" />
            {userBadges.length}/{totalBadges} collected · {lockedCount} locked
          </div>
        </div>

        <Card className="mainframe-panel-muted mainframe-card-l-silver relative overflow-hidden">
          <MainframeStrip variant="muted" left="BADGE REGISTRY" right={`CNT=${userBadges.length}/${totalBadges}`} />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-100">
              <Sparkles className="h-5 w-5 text-slate-400" /> All badges
            </CardTitle>
          </CardHeader>
          <CardContent>
            {definitionsLoading ? (
              <div className="flex items-center justify-center gap-3 rounded-lg border border-slate-700/40 bg-black/20 px-4 py-10 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                <div className="font-mono text-xs uppercase tracking-wide">Loading badges…</div>
              </div>
            ) : badgeCards.length === 0 ? (
              <p className="text-sm text-slate-500">No badges configured.</p>
            ) : (
              <div className="space-y-6">
                {[5, 4, 3, 2, 1].map((difficulty) => {
                  const rows = badgesByDifficulty.get(difficulty) ?? [];
                  if (rows.length === 0) return null;
                  const earnedCount = rows.filter((b) => b.isEarned).length;
                  return (
                    <div
                      key={difficulty}
                      className={cn(
                        "rounded-xl border p-4",
                        difficultySectionChrome(difficulty),
                      )}
                    >
                      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className={cn("flex items-center gap-2 font-mono text-xs font-semibold", difficultyHeaderTone(difficulty))}>
                            <Stars className={cn("h-4 w-4", difficulty >= 5 ? "text-violet-300/90" : difficulty === 4 ? "text-cyan-400/90" : "text-slate-400")} />
                            {getBadgeDifficultyLabel(difficulty)}
                          </div>
                          <div className={cn("inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest", difficultyChipTone(difficulty))}>
                            D{difficulty}
                          </div>
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {earnedCount}/{rows.length} earned
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {rows.map(({ id, label, accent, Icon, isEarned, howTo }) => (
                          <Tooltip key={id}>
                            <TooltipTrigger asChild>
                              <div
                                className={cn("cursor-help border-l-4", accent, badgeTileClasses(difficulty, isEarned))}
                                style={badgeTileBackground(difficulty, isEarned)}
                              >
                                {/* overlay layers: make each difficulty feel different */}
                                <div className="pointer-events-none absolute inset-0 opacity-60">
                                  {!isEarned ? (
                                    <div className="absolute inset-0 bg-[radial-gradient(650px_circle_at_25%_0%,rgba(255,255,255,0.06),transparent_55%),repeating-linear-gradient(0deg,transparent_0px,rgba(148,163,184,0.03)_1px,transparent_2px)]" />
                                  ) : difficulty >= 5 ? (
                                    <div className="absolute inset-0 motion-reduce:animate-none animate-[pulse_2.2s_ease-in-out_infinite] bg-[radial-gradient(600px_circle_at_20%_0%,rgba(255,255,255,0.10),transparent_45%),repeating-linear-gradient(0deg,transparent_0px,rgba(236,72,153,0.06)_1px,transparent_2px)]" />
                                  ) : difficulty === 4 ? (
                                    <div className="absolute inset-0 bg-[radial-gradient(650px_circle_at_25%_0%,rgba(34,211,238,0.10),transparent_48%),repeating-linear-gradient(0deg,transparent_0px,rgba(148,163,184,0.035)_1px,transparent_2px)]" />
                                  ) : difficulty === 3 ? (
                                    <div className="absolute inset-0 bg-[radial-gradient(650px_circle_at_25%_0%,rgba(245,158,11,0.10),transparent_50%),repeating-linear-gradient(0deg,transparent_0px,rgba(148,163,184,0.030)_1px,transparent_2px)]" />
                                  ) : difficulty === 2 ? (
                                    <div className="absolute inset-0 bg-[radial-gradient(650px_circle_at_25%_0%,rgba(34,211,238,0.08),transparent_52%),repeating-linear-gradient(0deg,transparent_0px,rgba(148,163,184,0.028)_1px,transparent_2px)]" />
                                  ) : (
                                    <div className="absolute inset-0 bg-[radial-gradient(650px_circle_at_25%_0%,rgba(255,255,255,0.07),transparent_52%),repeating-linear-gradient(0deg,transparent_0px,rgba(148,163,184,0.025)_1px,transparent_2px)]" />
                                  )}
                                </div>

                                {isEarned && difficulty >= 5 ? (
                                  <div className="pointer-events-none absolute -inset-10 opacity-25 blur-xl mix-blend-screen motion-reduce:animate-none animate-spin [animation-duration:10s] bg-[conic-gradient(from_90deg,rgba(167,139,250,0.0),rgba(167,139,250,0.55),rgba(236,72,153,0.35),rgba(34,211,238,0.25),rgba(167,139,250,0.0))]" />
                                ) : null}

                                <div className="relative flex items-start gap-3">
                                  <div className="flex min-w-0 flex-1 items-start gap-2">
                                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-md border bg-black/35",
                                      isEarned ? "border-slate-600/55" : "border-slate-700/55",
                                    )}>
                                      {isEarned ? (
                                        <Icon className={cn("h-5 w-5", iconTone(difficulty, isEarned))} />
                                      ) : (
                                        <Lock className="h-5 w-5 text-slate-500" />
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className={cn("break-words text-sm font-medium leading-snug", isEarned ? "text-slate-200" : "text-slate-400")}>
                                        {label}
                                      </div>

                                      <div className="mt-1 flex flex-wrap items-center gap-2">
                                        <div
                                          className={cn(
                                            "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest",
                                            difficultyChipTone(difficulty),
                                            !isEarned && "opacity-80",
                                          )}
                                        >
                                          {getBadgeDifficultyLabel(difficulty)}
                                        </div>

                                        {isEarned ? (
                                          <div className="inline-flex items-center gap-2 rounded border border-slate-600/40 bg-black/30 px-2.5 py-1 font-mono text-[11px] text-slate-300">
                                            <ShieldCheck className="h-3.5 w-3.5 text-cyan-600/70" />
                                            EARNED
                                          </div>
                                        ) : (
                                          <div className="inline-flex items-center rounded border border-slate-800/60 bg-black/35 px-2.5 py-1 font-mono text-[11px] text-slate-500">
                                            LOCKED
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[300px] text-xs leading-snug">
                              <div className="space-y-1">
                                <div>{howTo || "-"}</div>
                                <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                                  Difficulty: {getBadgeDifficultyLabel(difficulty)}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Badges;

