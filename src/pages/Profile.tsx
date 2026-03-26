import { useAuthStore } from "@/stores/authStore";
import MainLayout from "@/components/layout/MainLayout";
import { useNavigate } from "react-router-dom";
import { COBOL_LEVELS } from "@/data/cobolLevels";
import { BADGE_LABELS } from "@/data/badgeLabels";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarUpload } from "@/components/avatar";
import { User, Trophy, Award, ArrowRight, Gem, Sparkles, ShieldCheck, Crown, Flame } from "lucide-react";
import { MainframeStrip } from "@/components/mainframe/MainframeStrip";

const Profile = () => {
  const profile = useAuthStore((state) => state.profile);
  const updateAvatarUrl = useAuthStore((state) => state.updateAvatarUrl);
  const navigate = useNavigate();
  const [userBadges, setUserBadges] = useState<{ badge_id: string }[]>([]);
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);

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

  /** Rank = 1 + number of profiles with strictly higher total_points (ties share the same rank number). */
  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;
    (async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gt("total_points", profile.totalPoints);
      if (cancelled || error) {
        if (error) console.error(error);
        return;
      }
      setLeaderboardRank((count ?? 0) + 1);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id, profile?.totalPoints]);

  const badgeCards = useMemo(() => {
    return userBadges.map((b) => {
      const label = BADGE_LABELS[b.badge_id] ?? b.badge_id;
      const accent =
        b.badge_id === "perfect_streak" ? "border-l-teal-500/60" : "border-l-slate-500/55";
      const Icon =
        b.badge_id === "perfect_streak" ? Flame : b.badge_id.includes("error") ? ShieldCheck : Gem;
      return { id: b.badge_id, label, accent, Icon };
    });
  }, [userBadges]);

  const levelProgress = profile ? (profile.levelsCompleted / COBOL_LEVELS.length) * 100 : 0;

  const handleAvatarUpload = (filePath: string) => {
    updateAvatarUrl(filePath || null);
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

        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="mb-1 font-mono text-[10px] text-slate-500 md:text-xs">* USER SESSION — CONFIGURATION SECTION *</p>
            <h1 className="mb-2 text-3xl font-bold tracking-tight">My Profile</h1>
            <p className="text-muted-foreground">Learning stats and account.</p>
          </div>
          <User className="h-8 w-8 shrink-0 text-slate-400" />
        </div>

        <Card className="mainframe-panel-muted mainframe-card-l-silver overflow-hidden">
          <MainframeStrip
            variant="muted"
            left="IDENTIFICATION DIVISION"
            right={`RANK ${leaderboardRank ?? "…"} · PTS ${profile.totalPoints}`}
          />
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-6 text-center lg:flex-row lg:space-x-6 lg:space-y-0 lg:text-left">
              <div className="flex-shrink-0">
                <AvatarUpload
                  currentAvatarUrl={profile.avatarUrl}
                  onUpload={handleAvatarUpload}
                  size={120}
                />
              </div>

              <div className="flex-1">
                <h2 className="font-mono text-2xl font-bold tracking-tight text-slate-100">
                  {profile.username}
                </h2>
                <p className="font-mono text-sm text-slate-500">{profile.email}</p>

                <div className="mt-3 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
                  <div className="flex items-center font-mono text-sm text-slate-300">
                    <Trophy className="mr-1 h-4 w-4 text-cyan-600/80" />
                    <span>
                      Rank #{leaderboardRank ?? "…"} · {profile.totalPoints} PTS
                    </span>
                  </div>
                  <div className="flex items-center font-mono text-sm text-slate-300">
                    <Award className="mr-1 h-4 w-4 text-slate-400" />
                    <span>
                      LVL {profile.levelsCompleted} / {COBOL_LEVELS.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="mainframe-panel-muted mainframe-card-l-sky overflow-hidden">
            <MainframeStrip variant="muted" left="DATA DIVISION" right="PROGRESS" />
            <CardHeader>
              <CardTitle className="flex items-center text-lg font-semibold tracking-tight text-slate-100">
                <Award className="mr-2 h-5 w-5 text-slate-400" /> Voortgang
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Progress
                value={Math.min(100, levelProgress)}
                className="h-2 overflow-hidden rounded-full border border-slate-700/40 bg-black/50 [&>div]:bg-gradient-to-r [&>div]:from-slate-600 [&>div]:to-cyan-600 [&>div]:shadow-[0_0_10px_rgba(34,211,238,0.15)]"
              />
              <Button
                variant="link"
                className="mt-2 px-0 font-mono text-xs text-cyan-600/90 hover:text-cyan-500"
                onClick={() => navigate("/learn")}
              >
                Naar levels <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="mainframe-panel-muted mainframe-card-l-silver overflow-hidden">
            <MainframeStrip variant="muted" left="LEADERBOARD — JOB STEP" right={leaderboardRank != null ? `RANK=${leaderboardRank}` : "…"} />
            <CardHeader>
              <CardTitle className="flex items-center text-lg font-semibold tracking-tight text-slate-100">
                <Trophy className="mr-2 h-5 w-5 text-slate-400" /> Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="font-mono text-sm text-slate-400">
                Global position:{" "}
                <span className="text-cyan-600/90">#{leaderboardRank ?? "…"}</span>
              </p>
              <Button
                variant="outline"
                className="w-full border-slate-600/50 bg-black/30 font-mono text-xs uppercase tracking-wide text-slate-200 hover:border-slate-500 hover:bg-slate-800/50 hover:text-slate-50"
                onClick={() => navigate("/leaderboard")}
              >
                Bekijk ranglijst
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="mainframe-panel-muted mainframe-card-l-silver relative overflow-hidden">
          <MainframeStrip variant="muted" left="BADGE REGISTRY" right={`CNT=${userBadges.length}`} />
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-100">
              <Sparkles className="h-5 w-5 text-slate-400" /> Badges
            </CardTitle>
            <div className="inline-flex items-center gap-2 rounded border border-slate-600/40 bg-black/35 px-3 py-1 font-mono text-xs text-slate-300">
              <Crown className="h-4 w-4 text-slate-400" />
              {userBadges.length} collected
            </div>
          </CardHeader>
          <CardContent>
            {badgeCards.length === 0 ? (
              <div className="text-sm text-slate-500">
                Nog geen badges — rond een level af om je eerste badge te verdienen.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {badgeCards.map(({ id, label, accent, Icon }) => (
                  <div key={id} className={`mainframe-badge-tile-muted border-l-4 ${accent}`}>
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
      </div>
    </MainLayout>
  );
};

export default Profile;
