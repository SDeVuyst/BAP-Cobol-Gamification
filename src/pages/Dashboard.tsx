import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useFriendsStore } from "@/stores/friendsStore";
import MainLayout from "@/components/layout/MainLayout";
import { Avatar } from "@/components/avatar";
import { COBOL_LEVELS } from "@/data/cobolLevels";
import { supabase } from "@/integrations/supabase/client";
import type { BadgeDefinition } from "@/lib/badgeDefinitions";
import { fetchBadgeDefinitions } from "@/lib/badgeDefinitions";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BookOpen, ArrowRight, Trophy, Sparkles, Crown, Gem, ShieldCheck, Flame, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MainframeStrip } from "@/components/mainframe/MainframeStrip";
import { cn } from "@/lib/utils";
import { badgeAccentClass, getBadgeDifficultyLabel, getBadgeIconFromKey, normalizeTier } from "@/lib/badgePresentation";

const Dashboard = () => {
  const profile = useAuthStore((s) => s.profile);
  const refreshFriends = useFriendsStore((s) => s.refreshFriends);
  const friends = useFriendsStore((s) => s.friends);
  const friendsLoading = useFriendsStore((s) => s.loading);

  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [hasFetchedFriendsInitial, setHasFetchedFriendsInitial] = useState(false);
  const [userBadges, setUserBadges] = useState<{ badge_id: string }[]>([]);
  const [definitions, setDefinitions] = useState<BadgeDefinition[]>([]);

  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;
    (async () => {
      const { data, error: e } = await supabase
        .from("user_badges")
        .select("badge_id")
        .eq("user_id", profile.id);
      if (!cancelled && !e && data) setUserBadges(data as { badge_id: string }[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  useEffect(() => {
    if (profile && !hasFetchedFriendsInitial && !friendsLoading) {
      setHasFetchedFriendsInitial(true);
      refreshFriends().catch((err) => {
        console.error(err);
        setError("Failed to load friends data.");
      });
    }
  }, [profile, refreshFriends, hasFetchedFriendsInitial, friendsLoading]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchBadgeDefinitions();
        if (!cancelled) setDefinitions(rows);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!profile) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-lg text-destructive">Error: User profile not available.</p>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <p className="text-lg text-destructive">Error loading dashboard</p>
          <p className="text-muted-foreground">{error}</p>
          <Button
            onClick={() => {
              setError(null);
              setHasFetchedFriendsInitial(false);
            }}
          >
            Try Again
          </Button>
        </div>
      </MainLayout>
    );
  }

  const progressPct = (profile.levelsCompleted / COBOL_LEVELS.length) * 100;

  const topFriends = [...friends]
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, 3);

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

  const badgeTooltipText = (id: string) => badgeCards.find((b) => b.id === id)?.howTo || "-";

  const totalBadges = definitions.length;
  const lockedCount = Math.max(0, totalBadges - userBadges.length);
  const previewBadges = badgeCards.filter((b) => b.isEarned).slice(0, 3);
  const nextLockedBadge = badgeCards.find((b) => !b.isEarned) ?? null;

  return (
    <MainLayout>
      <div className="mainframe-page relative space-y-8 animate-fade-in">
        <div className="mainframe-glow-soft-tl" />
        <div className="mainframe-glow-soft-br" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-1 font-mono text-[10px] text-slate-500 md:text-xs">* WORKING-STORAGE - SESSION OVERVIEW *</p>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Je COBOL-leerpad, punten en badges
            </p>
          </div>

          <button
            type="button"
            className="group flex items-center space-x-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-cyan-700/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060608]"
            onClick={() => navigate("/profile")}
            aria-label="Open profile"
          >
            <Avatar
              src={profile.avatarUrl}
              fallback={profile.username}
              size={48}
              className="ring-2 ring-slate-600/50 ring-offset-2 ring-offset-[#060608] transition-colors group-hover:ring-cyan-700/45"
            />
            <div className="hidden sm:block text-right">
              <p className="font-mono text-sm font-medium text-slate-200 group-hover:underline underline-offset-4">
                {profile.username}
              </p>
              <p className="font-mono text-xs text-slate-500">PTS {profile.totalPoints}</p>
            </div>
          </button>
        </div>

        <Card className="mainframe-panel-muted mainframe-card-l-sky overflow-hidden">
          <MainframeStrip variant="muted" left="PROCEDURE DIVISION" right={`LVL ${profile.levelsCompleted}/${COBOL_LEVELS.length}`} />
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-100">
              <BookOpen className="h-5 w-5 text-slate-400" /> Learn COBOL
            </CardTitle>
            <Button
              className="border border-slate-600/50 bg-slate-800/80 font-mono text-xs uppercase tracking-wide text-slate-100 hover:bg-slate-700/80"
              onClick={() => navigate("/learn")}
            >
              Open levels <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between font-mono text-xs text-slate-500 sm:text-sm">
              <span>
                Levels voltooid: {profile.levelsCompleted} / {COBOL_LEVELS.length}
              </span>
            </div>
            <Progress
              value={Math.min(100, progressPct || 0)}
              className="h-2 overflow-hidden rounded-full border border-slate-700/40 bg-black/50 [&>div]:bg-gradient-to-r [&>div]:from-slate-600 [&>div]:to-cyan-600 [&>div]:shadow-[0_0_10px_rgba(34,211,238,0.12)]"
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="mainframe-panel-muted mainframe-card-l-silver overflow-hidden">
            <MainframeStrip variant="muted" left="STREAK SEGMENT" right={`DAYS=${profile.streakDays}`} />
            <CardHeader>
              <CardTitle className="flex items-center text-lg font-semibold tracking-tight text-slate-100">
                <Trophy className="mr-2 h-5 w-5 text-slate-400" /> Studiestreak
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Opeenvolgende dagen (historisch)</span>
                <span className="font-mono font-medium text-slate-200">{profile.streakDays} days</span>
              </div>
              <Progress
                value={Math.min(100, (profile.streakDays / 30) * 100)}
                className="h-2 overflow-hidden rounded-full border border-slate-700/40 bg-black/50 [&>div]:bg-gradient-to-r [&>div]:from-slate-600 [&>div]:to-slate-400 [&>div]:shadow-[0_0_8px_rgba(148,163,184,0.12)]"
              />
            </CardContent>
          </Card>

          <Card className="mainframe-panel-muted mainframe-card-l-sky overflow-hidden">
            <MainframeStrip variant="muted" left="SOCIAL - FRIEND QUEUE" right="TOP-3" />
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold tracking-tight text-slate-100">Vrienden - punten</CardTitle>
              <Button
                variant="ghost"
                className="font-mono text-xs text-cyan-700/85 hover:bg-slate-800/60 hover:text-cyan-600"
                onClick={() => navigate("/leaderboard")}
              >
                Globaal <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent>
              {friendsLoading && !friends.length && (
                <div className="py-2 text-center text-slate-500">Loading friends...</div>
              )}

              {!friendsLoading && topFriends.length === 0 && (
                <div className="py-2 text-center text-slate-500">
                  Voeg vrienden toe om hun scores te vergelijken.
                </div>
              )}

              {topFriends.length > 0 && (
                <div className="space-y-3">
                  {topFriends.map((friend, index) => (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between rounded-md border border-slate-700/35 bg-black/25 px-2 py-1.5"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="w-4 font-mono text-xs text-slate-500">{index + 1}.</span>
                        <Avatar src={friend.avatarUrl} fallback={friend.username} size={32} className="ring-1 ring-slate-600/40" />
                        <span className="font-mono text-sm text-slate-200">{friend.username}</span>
                      </div>
                      <span className="font-mono text-sm font-medium text-cyan-700/85">{friend.totalPoints} PTS</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mainframe-panel-muted mainframe-card-l-silver relative overflow-hidden">
          <MainframeStrip variant="muted" left="BADGE REGISTRY" right={`CNT=${userBadges.length}/${totalBadges}`} />
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-100">
              <Sparkles className="h-5 w-5 text-slate-400" /> Badges
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded border border-slate-600/40 bg-black/35 px-3 py-1 font-mono text-xs text-slate-300">
                <Crown className="h-4 w-4 text-slate-400" />
                {userBadges.length} collected
              </div>
              <div className="inline-flex items-center gap-2 rounded border border-slate-700/45 bg-black/30 px-3 py-1 font-mono text-xs text-slate-400">
                <Lock className="h-4 w-4 text-slate-500" />
                {lockedCount} locked
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {nextLockedBadge && (
              <div className="mb-3 text-xs text-slate-500">
                Volgende badge:{" "}
                <span className="font-mono text-slate-300">{nextLockedBadge.label}</span>
                <span className="mx-2 text-slate-700/80">-</span>
                <span className="text-slate-500">{badgeTooltipText(nextLockedBadge.id)}</span>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {previewBadges.length === 0 ? (
                  <div className="rounded-md border border-slate-700/45 bg-black/25 px-3 py-2 font-mono text-xs text-slate-500">
                    No badges yet - complete a level to earn your first.
                  </div>
                ) : (
                  previewBadges.map(({ id, label, Icon, difficulty }) => (
                    <Tooltip key={id}>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 rounded-md border border-slate-700/45 bg-black/25 px-3 py-2 cursor-help">
                          <Icon className="h-4 w-4 text-slate-300" />
                          <div className="max-w-[160px] truncate font-mono text-xs text-slate-200">{label}</div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[280px] text-xs leading-snug">
                        <div className="space-y-1">
                          <div>{badgeTooltipText(id)}</div>
                          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                            Difficulty: {getBadgeDifficultyLabel(difficulty ?? 1)}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))
                )}
              </div>

              <Button
                variant="outline"
                className="w-full border-slate-600/50 bg-black/30 font-mono text-xs uppercase tracking-wide text-slate-200 hover:border-cyan-700/40 hover:bg-cyan-950/20 hover:text-slate-50 sm:w-auto"
                onClick={() => navigate("/badges")}
              >
                View all badges <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
