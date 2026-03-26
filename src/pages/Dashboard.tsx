import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useFriendsStore } from "@/stores/friendsStore";
import MainLayout from "@/components/layout/MainLayout";
import { Avatar } from "@/components/avatar";
import { COBOL_LEVELS } from "@/data/cobolLevels";
import { BADGE_LABELS } from "@/data/badgeLabels";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, ArrowRight, Trophy, Sparkles, Crown, Gem, ShieldCheck, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MainframeStrip } from "@/components/mainframe/MainframeStrip";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const profile = useAuthStore((s) => s.profile);
  const refreshFriends = useFriendsStore((s) => s.refreshFriends);
  const friends = useFriendsStore((s) => s.friends);
  const friendsLoading = useFriendsStore((s) => s.loading);

  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [hasFetchedFriendsInitial, setHasFetchedFriendsInitial] = useState(false);
  const [userBadges, setUserBadges] = useState<{ badge_id: string }[]>([]);

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
    return userBadges.map((b) => {
      const label = BADGE_LABELS[b.badge_id] ?? b.badge_id;
      const accent =
        b.badge_id === "perfect_streak" ? "border-l-teal-500/55" : "border-l-slate-500/50";
      const Icon = b.badge_id === "perfect_streak" ? Flame : b.badge_id.includes("error") ? ShieldCheck : Gem;
      return { id: b.badge_id, label, accent, Icon };
    });
  }, [userBadges]);

  return (
    <MainLayout>
      <div className="mainframe-page relative space-y-8 animate-fade-in">
        <div className="mainframe-glow-soft-tl" />
        <div className="mainframe-glow-soft-br" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-1 font-mono text-[10px] text-slate-500 md:text-xs">* WORKING-STORAGE — SESSION OVERVIEW *</p>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Je COBOL-leerpad, punten en badges
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Avatar
              src={profile.avatarUrl}
              fallback={profile.username}
              size={48}
              className="ring-2 ring-slate-600/50 ring-offset-2 ring-offset-[#060608]"
            />
            <div className="hidden sm:block text-right">
              <p className="font-mono text-sm font-medium text-slate-200">{profile.username}</p>
              <p className="font-mono text-xs text-slate-500">PTS {profile.totalPoints}</p>
            </div>
          </div>
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

        <Card className="mainframe-panel-muted mainframe-card-l-silver relative overflow-hidden">
          <MainframeStrip variant="muted" left="BADGE REGISTRY" right={`CNT=${userBadges.length}`} />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-100">
              <Sparkles className="h-5 w-5 text-slate-400" /> Badges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <div className="text-sm text-slate-500">
                Verzamel badges door levels te halen (en probeer een “clean run”).
              </div>
              <div className="inline-flex items-center gap-2 rounded border border-slate-600/40 bg-black/35 px-3 py-1 font-mono text-xs text-slate-400">
                <Crown className="h-4 w-4 text-slate-400" />
                {userBadges.length} collected
              </div>
            </div>

            {badgeCards.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nog geen badges — rond een level af om je eerste badge te verdienen.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {badgeCards.map(({ id, label, accent, Icon }) => (
                  <div key={id} className={cn("mainframe-badge-tile-muted border-l-4", accent)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded border border-slate-700/50 bg-black/40">
                          <Icon className="h-5 w-5 text-slate-300" />
                        </div>
                        <div className="font-medium text-slate-200">{label}</div>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded border border-slate-600/40 bg-black/30 px-2.5 py-1 font-mono text-[11px] text-slate-400">
                        <ShieldCheck className="h-3.5 w-3.5 text-cyan-600/70" />
                        EARNED
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
            <MainframeStrip variant="muted" left="SOCIAL — FRIEND QUEUE" right="TOP-3" />
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold tracking-tight text-slate-100">Vrienden — punten</CardTitle>
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
      </div>
    </MainLayout>
  );
};

export default Dashboard;
