import { useAuthStore } from "@/stores/authStore";
import { useFriendsStore } from "@/stores/friendsStore";
import MainLayout from "@/components/layout/MainLayout";
import { useNavigate, useParams } from "react-router-dom";
import { COBOL_LEVELS } from "@/data/cobolLevels";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { upsertUserBadges } from "@/lib/badges";
import type { BadgeDefinition } from "@/lib/badgeDefinitions";
import { fetchBadgeDefinitions } from "@/lib/badgeDefinitions";
import { getBadgeDifficultyLabel, getBadgeIconFromKey, normalizeTier, badgeAccentClass } from "@/lib/badgePresentation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarUpload } from "@/components/avatar";
import { User, Trophy, Award, ArrowRight, Gem, Sparkles, Crown, Target, Zap, Medal, TrendingUp, Lock, UserMinus } from "lucide-react";
import { MainframeStrip } from "@/components/mainframe/MainframeStrip";
import { cn } from "@/lib/utils";

type NeighborRow = {
  id: string;
  username: string;
  avatarUrl?: string | null;
  totalPoints: number;
  rank: number;
};

type RankedCandidate = NeighborRow & {
  isCurrentUser: boolean;
};

const DUMMY_LEADERBOARD_USERS: Array<{ username: string; levelsCompleted: number }> = [
  { username: "Ada-COBOL", levelsCompleted: 7 },
  { username: "JCLJedi", levelsCompleted: 6 },
  { username: "PICClausePro", levelsCompleted: 6 },
  { username: "MainframeMaven", levelsCompleted: 5 },
  { username: "CopybookCrafter", levelsCompleted: 5 },
  { username: "BatchRunner", levelsCompleted: 4 },
  { username: "DebuggingDept", levelsCompleted: 4 },
  { username: "PERFORMVARYING", levelsCompleted: 3 },
  { username: "WorkingStorage", levelsCompleted: 3 },
  { username: "Section77", levelsCompleted: 2 },
  { username: "EBCDICEnjoyer", levelsCompleted: 2 },
  { username: "ACCEPTDISPLAY", levelsCompleted: 1 },
  { username: "CICSComet", levelsCompleted: 1 },
  { username: "VSAMVoyager", levelsCompleted: 0 },
  { username: "FDFileFan", levelsCompleted: 0 },
];

function hashToUnitInterval(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

function makeDummyAvatarUrl(username: string) {
  const seed = encodeURIComponent(username);
  return `https://api.dicebear.com/7.x/identicon/png?seed=${seed}&size=128`;
}

function pointsForCompletedLevels(levelsCompleted: number, seed: string) {
  const r = hashToUnitInterval(seed);
  const perLevel = 220 + Math.round(r * 120);
  const base = levelsCompleted * perLevel;
  const bonus = Math.round(hashToUnitInterval(`${seed}|bonus`) * 180);
  return Math.max(0, base + bonus);
}

function addDevDummyRowsIfNeeded(rows: RankedCandidate[], currentUserId?: string, minRows = 15): RankedCandidate[] {
  if (!import.meta.env.DEV) return rows;
  if (rows.length >= minRows) return rows;

  const existingUsernames = new Set(rows.map((r) => r.username));
  const padded: RankedCandidate[] = [...rows];

  for (let i = 0; i < DUMMY_LEADERBOARD_USERS.length && padded.length < minRows; i++) {
    const d = DUMMY_LEADERBOARD_USERS[i];
    if (existingUsernames.has(d.username)) continue;
    padded.push({
      id: `dummy-${i}`,
      username: d.username,
      avatarUrl: makeDummyAvatarUrl(d.username),
      totalPoints: pointsForCompletedLevels(d.levelsCompleted, d.username),
      isCurrentUser: false,
    });
  }

  return padded
    .map((r) => ({ ...r, isCurrentUser: currentUserId ? r.id === currentUserId : r.isCurrentUser }))
    .sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0));
}

type ProfileDisplay = {
  id: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  totalPoints: number;
  levelsCompleted: number;
};

const Profile = () => {
  const myProfile = useAuthStore((state) => state.profile);
  const updateAvatarUrl = useAuthStore((state) => state.updateAvatarUrl);
  const navigate = useNavigate();
  const { friendId } = useParams<{ friendId: string }>();
  const { friends, removeFriend, loading: friendsLoading } = useFriendsStore();
  const [viewedFriend, setViewedFriend] = useState<ProfileDisplay | null>(null);
  const [friendFetchStatus, setFriendFetchStatus] = useState<"idle" | "loading" | "ok" | "missing">("idle");
  const [userBadges, setUserBadges] = useState<{ badge_id: string }[]>([]);
  const [definitions, setDefinitions] = useState<BadgeDefinition[]>([]);
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);
  const [leaderboardNeighbors, setLeaderboardNeighbors] = useState<{
    above: NeighborRow | null;
    below: NeighborRow | null;
  }>({ above: null, below: null });

  const isViewingFriend = Boolean(friendId && myProfile?.id && friendId !== myProfile.id);
  const isOwnProfile = !isViewingFriend;
  const activeProfile: ProfileDisplay | null = isViewingFriend ? viewedFriend : myProfile;

  useEffect(() => {
    if (friendId && myProfile?.id && friendId === myProfile.id) {
      navigate("/profile", { replace: true });
    }
  }, [friendId, myProfile?.id, navigate]);

  useEffect(() => {
    if (!isViewingFriend || !friendId) {
      setFriendFetchStatus("idle");
      setViewedFriend(null);
      return;
    }
    let cancelled = false;
    setFriendFetchStatus("loading");
    setViewedFriend(null);
    (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, total_points, levels_completed")
          .eq("id", friendId)
          .single();
        if (cancelled) return;
        if (error || !data) {
          setFriendFetchStatus("missing");
          setViewedFriend(null);
          return;
        }
        setViewedFriend({
          id: data.id,
          username: data.username,
          email: null,
          avatarUrl: data.avatar_url,
          totalPoints: data.total_points ?? 0,
          levelsCompleted: data.levels_completed ?? 0,
        });
        setFriendFetchStatus("ok");
      } catch {
        if (!cancelled) {
          setFriendFetchStatus("missing");
          setViewedFriend(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isViewingFriend, friendId]);

  const isFriend =
    Boolean(friendId && friends.some((f) => f.id === friendId));

  useEffect(() => {
    if (!activeProfile?.id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("user_badges")
        .select("badge_id")
        .eq("user_id", activeProfile.id);
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
  }, [activeProfile?.id]);

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

  /** Rank = 1 + number of profiles with strictly higher total_points (ties share the same rank number). */
  useEffect(() => {
    if (!activeProfile?.id) return;
    let cancelled = false;
    (async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gt("total_points", activeProfile.totalPoints);
      if (cancelled || error) {
        if (error) console.error(error);
        return;
      }
      const rank = (count ?? 0) + 1;
      setLeaderboardRank(rank);

      if (!isOwnProfile) return;

      // Leaderboard rank badges (viewer only — never write badges for someone else's profile)
      const earned: string[] = [];
      if (rank <= 50) earned.push("leaderboard_top_50");
      if (rank <= 25) earned.push("leaderboard_top_25");
      if (rank <= 10) earned.push("leaderboard_top_10");
      if (rank <= 5) earned.push("leaderboard_top_5");
      if (rank === 1) earned.push("leaderboard_champion");
      await upsertUserBadges(activeProfile.id, earned);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeProfile?.id, activeProfile?.totalPoints, isOwnProfile]);

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

  const levelProgress = activeProfile ? (activeProfile.levelsCompleted / COBOL_LEVELS.length) * 100 : 0;
  const levelsRemaining = Math.max(0, COBOL_LEVELS.length - (activeProfile?.levelsCompleted ?? 0));
  const nextLevelNumber = Math.min(COBOL_LEVELS.length, (activeProfile?.levelsCompleted ?? 0) + 1);
  const currentLevelNumber = levelsRemaining === 0 ? COBOL_LEVELS.length : nextLevelNumber;
  const progressLabel = `${Math.round(Math.min(100, levelProgress || 0))}%`;

  useEffect(() => {
    if (!activeProfile?.id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, total_points")
        .order("total_points", { ascending: false })
        .limit(75);

      if (cancelled) return;
      if (error) {
        console.error(error);
        return;
      }

      const realRows: RankedCandidate[] = (data ?? []).map((p) => ({
        id: p.id,
        username: p.username,
        avatarUrl: p.avatar_url,
        totalPoints: p.total_points ?? 0,
        isCurrentUser: p.id === activeProfile.id,
      }));

      const rankedRows = addDevDummyRowsIfNeeded(realRows, activeProfile.id);
      const myIndex = rankedRows.findIndex((r) => r.id === activeProfile.id);
      const aboveRaw = myIndex > 0 ? rankedRows[myIndex - 1] : null;
      const belowRaw = myIndex >= 0 ? rankedRows[myIndex + 1] ?? null : null;
      const myRank = myIndex >= 0 ? myIndex + 1 : null;

      setLeaderboardNeighbors({
        above: aboveRaw
          ? {
              id: aboveRaw.id,
              username: aboveRaw.username,
              avatarUrl: aboveRaw.avatarUrl,
              totalPoints: aboveRaw.totalPoints ?? 0,
              rank: myIndex,
            }
          : null,
        below: belowRaw
          ? {
              id: belowRaw.id,
              username: belowRaw.username,
              avatarUrl: belowRaw.avatarUrl,
              totalPoints: belowRaw.totalPoints ?? 0,
              rank: myIndex + 2,
            }
          : null,
      });

      if (myRank != null) {
        setLeaderboardRank(myRank);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeProfile?.id, activeProfile?.totalPoints]);

  const leaderboardTier = useMemo(() => {
    const rank = leaderboardRank;
    if (!rank) return { label: "Unranked", hint: "Syncing…", tone: "border-slate-600/40 bg-black/35 text-slate-300" };
    if (rank === 1) return { label: "CHAMPION", hint: "Top of the stack", tone: "border-amber-500/35 bg-amber-500/10 text-amber-200" };
    if (rank <= 3) return { label: "PODIUM", hint: "Top 3", tone: "border-amber-500/25 bg-amber-500/5 text-amber-100" };
    if (rank <= 10) return { label: "ELITE", hint: "Top 10", tone: "border-cyan-600/35 bg-cyan-600/10 text-cyan-100" };
    if (rank <= 50) return { label: "RISING", hint: "Top 50", tone: "border-emerald-600/30 bg-emerald-600/10 text-emerald-100" };
    return { label: "CLIMBING", hint: "Keep shipping levels", tone: "border-slate-600/40 bg-black/35 text-slate-300" };
  }, [leaderboardRank]);

  const rankMedalTone = useMemo(() => {
    const rank = leaderboardRank;
    if (rank === 1) return "text-amber-300";
    if (rank === 2) return "text-slate-200";
    if (rank === 3) return "text-amber-600/90";
    return "text-slate-400";
  }, [leaderboardRank]);

  const handleAvatarUpload = (filePath: string) => {
    updateAvatarUrl(filePath || null);
  };

  if (!myProfile) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p>Loading your profile...</p>
        </div>
      </MainLayout>
    );
  }

  if (isViewingFriend && friendFetchStatus === "loading") {
    return (
      <MainLayout>
        <div className="flex h-96 items-center justify-center">
          <p>Loading profile...</p>
        </div>
      </MainLayout>
    );
  }

  if (isViewingFriend && friendFetchStatus === "missing") {
    return (
      <MainLayout>
        <div className="mainframe-page relative animate-fade-in py-12 text-center">
          <User className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">Profile not found</h3>
          <p className="mb-4 text-muted-foreground">This user profile could not be loaded.</p>
          <Button
            variant="outline"
            className="border-slate-600/50 bg-black/30 font-mono text-xs uppercase tracking-wide text-slate-200"
            onClick={() => navigate("/friends")}
          >
            Back to Friends
          </Button>
        </div>
      </MainLayout>
    );
  }

  if (!activeProfile) {
    return (
      <MainLayout>
        <div className="flex h-96 items-center justify-center">
          <p>Loading profile...</p>
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
            <p className="mb-1 font-mono text-[10px] text-slate-500 md:text-xs">* USER SESSION - CONFIGURATION SECTION *</p>
            <h1 className="mb-2 text-3xl font-bold tracking-tight">
              {isOwnProfile ? "My Profile" : `${activeProfile.username}'s Profile`}
            </h1>
            <p className="text-muted-foreground">
              {isOwnProfile ? "Learning stats and account." : "Learning stats and progress."}
            </p>
          </div>
          {isOwnProfile ? (
            <User className="h-8 w-8 shrink-0 text-slate-400" />
          ) : isFriend ? (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 border-slate-600/50 bg-black/30 font-mono text-xs uppercase tracking-wide text-destructive hover:border-red-900/50 hover:bg-red-950/20 hover:text-destructive"
              disabled={friendsLoading}
              aria-label={`Remove ${activeProfile.username} as friend`}
              onClick={async () => {
                await removeFriend(activeProfile.id);
                navigate("/friends");
              }}
            >
              <UserMinus className="mr-2 h-4 w-4" />
              Remove Friend
            </Button>
          ) : (
            <User className="h-8 w-8 shrink-0 text-slate-400" />
          )}
        </div>

        <Card className="mainframe-panel-muted mainframe-card-l-silver mf-card-interactive overflow-hidden">
          <MainframeStrip
            variant="muted"
            left="IDENTIFICATION DIVISION"
            right={`RANK ${leaderboardRank ?? "…"} · PTS ${activeProfile.totalPoints}`}
          />
          <CardContent className="relative pt-6">
            <div className="pointer-events-none absolute inset-0 mf-shimmer-overlay opacity-70" />

            <div className="relative flex flex-col items-center space-y-6 text-center lg:flex-row lg:space-x-6 lg:space-y-0 lg:text-left">
              <div className="relative flex-shrink-0">
                <div className="pointer-events-none absolute -inset-3 rounded-full bg-gradient-to-br from-cyan-500/15 via-transparent to-emerald-500/10 blur-xl" />
                <div className="relative">
                  {isOwnProfile ? (
                    <AvatarUpload currentAvatarUrl={activeProfile.avatarUrl} onUpload={handleAvatarUpload} size={120} />
                  ) : (
                    <Avatar src={activeProfile.avatarUrl} fallback={activeProfile.username} size={120} className="ring-2 ring-slate-700/50" />
                  )}
                </div>

                <div className="relative mt-3 flex flex-wrap items-center justify-center gap-2">
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest ${leaderboardTier.tone}`}
                  >
                    <Medal className={`h-3.5 w-3.5 ${rankMedalTone}`} />
                    {leaderboardTier.label}
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-700/45 bg-black/35 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-slate-300">
                    <Sparkles className="h-3.5 w-3.5 text-cyan-600/80" />
                    {userBadges.length} badges
                  </div>
                </div>
              </div>

              <div className="flex-1">
                <h2 className="font-mono text-2xl font-bold tracking-tight text-slate-100">{activeProfile.username}</h2>
                {isOwnProfile && activeProfile.email ? (
                  <p className="font-mono text-sm text-slate-500">{activeProfile.email}</p>
                ) : null}

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-700/45 bg-black/35 px-3 py-2 text-left">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Global rank</div>
                    <div className="mt-1 flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-cyan-600/80" />
                      <div className="font-mono text-sm font-semibold text-slate-100">#{leaderboardRank ?? "…"}</div>
                      <div className="ml-auto font-mono text-[11px] text-slate-400">{leaderboardTier.hint}</div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-700/45 bg-black/35 px-3 py-2 text-left">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Total points</div>
                    <div className="mt-1 flex items-center gap-2">
                      <Gem className="h-4 w-4 text-emerald-500/80" />
                      <div className="font-mono text-sm font-semibold text-slate-100">{activeProfile.totalPoints} PTS</div>
                      <div className="ml-auto font-mono text-[11px] text-slate-400">
                        LVL {activeProfile.levelsCompleted}/{COBOL_LEVELS.length}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                  <div className="inline-flex items-center gap-2 rounded-md border border-slate-700/45 bg-black/30 px-2.5 py-1 font-mono text-[11px] text-slate-300">
                    <Target className="h-3.5 w-3.5 text-cyan-600/70" />
                    Current LVL {currentLevelNumber}
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-md border border-slate-700/45 bg-black/30 px-2.5 py-1 font-mono text-[11px] text-slate-300">
                    <Zap className="h-3.5 w-3.5 text-cyan-600/70" />
                    Completion {progressLabel}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="mainframe-panel-muted mainframe-card-l-sky mf-card-interactive overflow-hidden">
            <MainframeStrip variant="muted" left="DATA DIVISION" right="PROGRESS" />
            <CardHeader>
              <CardTitle className="flex items-center text-lg font-semibold tracking-tight text-slate-100">
                <Award className="mr-2 h-5 w-5 text-slate-400" /> Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative overflow-hidden rounded-lg border border-slate-700/40 bg-black/25 p-3">
                <div className="pointer-events-none absolute inset-0 mf-shimmer-overlay" />
                <div className="relative flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Mission</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <div className="font-mono text-sm font-semibold text-slate-100">
                        {levelsRemaining === 0 ? "All levels complete" : `Complete Level ${nextLevelNumber}`}
                      </div>
                      <div className="inline-flex items-center gap-1 rounded border border-slate-600/40 bg-black/35 px-2 py-0.5 font-mono text-[11px] text-cyan-600/90">
                        <Zap className="h-3.5 w-3.5" />
                        {progressLabel}
                      </div>
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-slate-400">
                      {levelsRemaining === 0 ? "All levels complete - victory lap time." : `${levelsRemaining} levels remaining`}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <div className="inline-flex items-center gap-2 rounded-md border border-slate-700/45 bg-black/35 px-2.5 py-2 font-mono text-xs text-slate-200">
                      <Target className="h-4 w-4 text-cyan-600/80" />
                      Current LVL {currentLevelNumber}
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-md border border-slate-700/35 bg-black/25 px-3 py-2">
                <div className="pointer-events-none absolute inset-0 opacity-50">
                  <div className="absolute -left-24 top-0 h-full w-48 rotate-12 bg-gradient-to-r from-transparent via-cyan-600/10 to-transparent" />
                </div>
                <div className="relative flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                      Completed
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <div className="font-mono text-sm font-semibold text-slate-100">
                        {activeProfile.levelsCompleted}/{COBOL_LEVELS.length} levels
                      </div>
                      <div className="inline-flex items-center gap-1 rounded border border-slate-600/40 bg-black/35 px-2 py-0.5 font-mono text-[11px] text-cyan-600/90">
                        <Zap className="h-3.5 w-3.5" />
                        {progressLabel}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                      Next up
                    </div>
                    <div className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-xs text-slate-200">
                      <Target className="h-4 w-4 text-cyan-600/80" />
                      {levelsRemaining === 0 ? "Completed" : `Level ${nextLevelNumber}`}
                    </div>
                  </div>
                </div>
              </div>

              <Progress
                value={Math.min(100, levelProgress)}
                className="h-2.5 overflow-hidden rounded-full border border-slate-700/40 bg-black/50 [&>div]:bg-gradient-to-r [&>div]:from-slate-600 [&>div]:via-cyan-600 [&>div]:to-emerald-600 [&>div]:shadow-[0_0_12px_rgba(34,211,238,0.18)]"
              />

              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {Array.from({ length: COBOL_LEVELS.length }).map((_, idx) => {
                    const done = idx < activeProfile.levelsCompleted;
                    const active = idx === activeProfile.levelsCompleted;
                    return (
                      <div
                        key={idx}
                        className={[
                          "h-2.5 w-2.5 rounded-sm border transition-colors",
                          done
                            ? "border-emerald-500/40 bg-emerald-500/25 shadow-[0_0_10px_rgba(16,185,129,0.18)]"
                            : active
                              ? "border-cyan-600/55 bg-cyan-600/15 shadow-[0_0_12px_rgba(34,211,238,0.18)]"
                              : "border-slate-700/50 bg-black/20",
                        ].join(" ")}
                        aria-label={`Level ${idx + 1}: ${done ? "completed" : active ? "current" : "locked"}`}
                      />
                    );
                  })}
                </div>
                <div className="font-mono text-[11px] text-slate-500">
                  {levelsRemaining === 0 ? "All levels complete" : `${levelsRemaining} to go`}
                </div>
              </div>

              {isOwnProfile && (
                <Button
                  variant="outline"
                  className="mt-2 w-full border-slate-600/50 bg-black/30 font-mono text-xs uppercase tracking-wide text-slate-200 hover:border-cyan-700/40 hover:bg-cyan-950/20 hover:text-slate-50"
                  onClick={() => navigate("/learn")}
                >
                  Continue learning <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="mainframe-panel-muted mainframe-card-l-silver mf-card-interactive overflow-hidden">
            <MainframeStrip variant="muted" left="LEADERBOARD - JOB STEP" right={leaderboardRank != null ? `RANK=${leaderboardRank}` : "…"} />
            <CardHeader>
              <CardTitle className="flex items-center text-lg font-semibold tracking-tight text-slate-100">
                <Trophy className="mr-2 h-5 w-5 text-slate-400" /> Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative overflow-hidden rounded-lg border border-slate-700/40 bg-black/25 p-3">
                <div className="pointer-events-none absolute inset-0 mf-shimmer-overlay" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center gap-2 rounded-md border border-slate-700/45 bg-black/35 px-2.5 py-2">
                        <Medal className={`h-5 w-5 ${rankMedalTone}`} />
                        <div className="min-w-0">
                          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Global rank</div>
                          <div className="font-mono text-sm font-semibold text-slate-100">
                            #{leaderboardRank ?? "…"}
                          </div>
                        </div>
                      </div>

                      <div className={`inline-flex flex-col gap-0.5 rounded-md border px-3 py-2 ${leaderboardTier.tone}`}>
                        <div className="font-mono text-[10px] uppercase tracking-widest opacity-90">Tier</div>
                        <div className="font-mono text-xs font-semibold tracking-wide">{leaderboardTier.label}</div>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center gap-2 rounded border border-slate-600/40 bg-black/35 px-2.5 py-1 font-mono text-[11px] text-slate-300">
                        <Trophy className="h-3.5 w-3.5 text-cyan-600/80" />
                        {activeProfile.totalPoints} PTS
                      </div>
                      <div className="inline-flex items-center gap-2 rounded border border-slate-600/40 bg-black/35 px-2.5 py-1 font-mono text-[11px] text-slate-300">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500/80" />
                        {leaderboardTier.hint}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <div className="mf-float-slow rounded-md border border-slate-700/45 bg-black/30 p-2">
                      <Crown className="h-5 w-5 text-slate-300" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Around you</div>
                <div className="overflow-hidden rounded-lg border border-slate-700/40 bg-black/20">
                  {([
                    { kind: "above" as const, label: "Above", row: leaderboardNeighbors.above },
                    {
                      kind: "you" as const,
                      label: isOwnProfile ? "You" : activeProfile.username,
                      row: {
                        id: activeProfile.id,
                        username: activeProfile.username,
                        avatarUrl: activeProfile.avatarUrl,
                        totalPoints: activeProfile.totalPoints ?? 0,
                        rank: leaderboardRank ?? 0,
                      },
                    },
                    { kind: "below" as const, label: "Below", row: leaderboardNeighbors.below },
                  ] as const).map(({ kind, label, row }) => {
                    const isYou = kind === "you";
                    return (
                      <div
                        key={kind}
                        className={[
                          "flex items-center justify-between gap-3 px-3 py-2",
                          "border-b border-slate-800/60 last:border-b-0",
                          isYou ? "bg-cyan-950/25" : "bg-transparent",
                        ].join(" ")}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="w-12 shrink-0 font-mono text-[10px] uppercase tracking-widest text-slate-500">
                            {label}
                          </div>
                          {row ? (
                            <>
                              <Avatar
                                src={row.avatarUrl}
                                fallback={row.username}
                                size={28}
                                className={isYou ? "ring-1 ring-cyan-700/45" : "ring-1 ring-slate-700/45"}
                              />
                              <div className="min-w-0">
                                <div className={isYou ? "truncate font-mono text-xs font-semibold text-cyan-100/95" : "truncate font-mono text-xs text-slate-200"}>
                                  {row.username}
                                </div>
                                <div className="font-mono text-[10px] text-slate-500">
                                  #{row.rank} · PTS {row.totalPoints}
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="font-mono text-xs text-slate-500">-</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full border-slate-600/50 bg-black/30 font-mono text-xs uppercase tracking-wide text-slate-200 hover:border-cyan-700/40 hover:bg-cyan-950/20 hover:text-slate-50"
                onClick={() => navigate("/leaderboard")}
              >
                View full leaderboard
              </Button>
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
                Volgende badge: <span className="font-mono text-slate-300">{nextLockedBadge.label}</span>
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

export default Profile;
