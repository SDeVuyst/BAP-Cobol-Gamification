import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import MainLayout from "@/components/layout/MainLayout";
import { Avatar } from "@/components/avatar";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MainframeStrip } from "@/components/mainframe/MainframeStrip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, User, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface RankedRow {
  id: string;
  username: string;
  totalPoints: number;
  levelsCompleted: number;
  avatarUrl?: string | null;
  isCurrentUser: boolean;
  rank: number;
}

const DUMMY_LEADERBOARD_USERS: Array<Pick<RankedRow, "username" | "totalPoints" | "levelsCompleted">> = [
  // levelsCompleted must be between 0 and 7 (requested)
  { username: "Ada-COBOL", totalPoints: 0, levelsCompleted: 7 },
  { username: "JCLJedi", totalPoints: 0, levelsCompleted: 6 },
  { username: "PICClausePro", totalPoints: 0, levelsCompleted: 6 },
  { username: "MainframeMaven", totalPoints: 0, levelsCompleted: 5 },
  { username: "CopybookCrafter", totalPoints: 0, levelsCompleted: 5 },
  { username: "BatchRunner", totalPoints: 0, levelsCompleted: 4 },
  { username: "DebuggingDept", totalPoints: 0, levelsCompleted: 4 },
  { username: "PERFORMVARYING", totalPoints: 0, levelsCompleted: 3 },
  { username: "WorkingStorage", totalPoints: 0, levelsCompleted: 3 },
  { username: "Section77", totalPoints: 0, levelsCompleted: 2 },
  { username: "EBCDICEnjoyer", totalPoints: 0, levelsCompleted: 2 },
  { username: "ACCEPTDISPLAY", totalPoints: 0, levelsCompleted: 1 },
  { username: "CICSComet", totalPoints: 0, levelsCompleted: 1 },
  { username: "VSAMVoyager", totalPoints: 0, levelsCompleted: 0 },
  { username: "FDFileFan", totalPoints: 0, levelsCompleted: 0 },
];

function hashToUnitInterval(seed: string) {
  // Deterministic 0..1 float based on a string seed (good enough for UI seeding).
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Convert to unsigned 32-bit and normalize
  return (h >>> 0) / 0xffffffff;
}

function makeDummyAvatarUrl(username: string) {
  // DiceBear: stable, anonymous avatars (PNG)
  const seed = encodeURIComponent(username);
  return `https://api.dicebear.com/7.x/identicon/png?seed=${seed}&size=128`;
}

function pointsForCompletedLevels(levelsCompleted: number, seed: string) {
  // Keep points "realistic" for 0..7 levels: a few hundred per level + small variance.
  const r = hashToUnitInterval(seed);
  const perLevel = 220 + Math.round(r * 120); // 220..340
  const base = levelsCompleted * perLevel;
  const bonus = Math.round(hashToUnitInterval(seed + "|bonus") * 180); // 0..180
  return Math.max(0, base + bonus);
}

function addDevDummyRowsIfNeeded(rows: RankedRow[], currentUserId?: string, minRows = 15): RankedRow[] {
  // Only pad in dev builds; never touch production leaderboard.
  if (!import.meta.env.DEV) return rows;
  if (rows.length >= minRows) return rows;

  const existingUsernames = new Set(rows.map((r) => r.username));
  const padded: RankedRow[] = [...rows];

  for (let i = 0; i < DUMMY_LEADERBOARD_USERS.length && padded.length < minRows; i++) {
    const d = DUMMY_LEADERBOARD_USERS[i];
    if (existingUsernames.has(d.username)) continue;
    padded.push({
      id: `dummy-${i}`,
      username: d.username,
      totalPoints: pointsForCompletedLevels(d.levelsCompleted, d.username),
      levelsCompleted: d.levelsCompleted,
      avatarUrl: makeDummyAvatarUrl(d.username),
      isCurrentUser: false,
      rank: 0, // assigned after sort
    });
  }

  // Re-sort and re-rank (so dummies land naturally among real users)
  const sorted = padded
    .map((r) => ({ ...r, isCurrentUser: currentUserId ? r.id === currentUserId : r.isCurrentUser }))
    .sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0));

  return sorted.map((r, index) => ({ ...r, rank: index + 1 }));
}

const Leaderboard = () => {
  const profile = useAuthStore((state) => state.profile);
  const navigate = useNavigate();
  const [rankedUsers, setRankedUsers] = useState<RankedRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, total_points, levels_completed")
      .order("total_points", { ascending: false })
      .limit(75);

    if (error) {
      console.error(error);
      setRankedUsers([]);
      setLoading(false);
      return;
    }

    const rows = (data ?? []).map((p, index) => ({
      id: p.id,
      username: p.username,
      totalPoints: p.total_points ?? 0,
      levelsCompleted: p.levels_completed ?? 0,
      avatarUrl: p.avatar_url,
      isCurrentUser: profile?.id === p.id,
      rank: index + 1,
    }));

    setRankedUsers(addDevDummyRowsIfNeeded(rows, profile?.id));
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    if (!profile) return;
    load();
  }, [profile, load]);

  useEffect(() => {
    const channel = supabase
      .channel("leaderboard-profiles")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        () => {
          void load();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  if (!profile) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p>Loading leaderboard...</p>
        </div>
      </MainLayout>
    );
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1)
      return (
        <Badge className="border-emerald-500/40 bg-emerald-900/60 font-mono text-[10px] text-emerald-200 hover:bg-emerald-800/70">
          1st
        </Badge>
      );
    if (rank === 2)
      return (
        <Badge className="border-slate-500/40 bg-slate-800/70 font-mono text-[10px] text-slate-100 hover:bg-slate-700/80">
          2nd
        </Badge>
      );
    if (rank === 3)
      return (
        <Badge className="border-teal-600/50 bg-teal-950/50 font-mono text-[10px] text-teal-200 hover:bg-teal-900/60">
          3rd
        </Badge>
      );
    return (
      <Badge variant="outline" className="border-green-500/25 font-mono text-[10px] text-emerald-500/90">
        {rank}th
      </Badge>
    );
  };

  const podium = rankedUsers.slice(0, 3);
  const rest = rankedUsers.slice(3);

  /** Visual order like a real podium: 2nd (left) — 1st (center, highest) — 3rd (right). */
  const podiumSlots: (RankedRow | null)[] =
    podium.length >= 3
      ? [podium[1] ?? null, podium[0] ?? null, podium[2] ?? null]
      : podium.length === 2
        ? [podium[1] ?? null, podium[0] ?? null, null]
        : podium.length === 1
          ? [null, podium[0] ?? null, null]
          : [];

  /** Mainframe / 3270-style panel accents by place (emerald / silver / teal — no orange) */
  const podiumAccent = (rank: number) => {
    if (rank === 1) return "border-l-emerald-400/95";
    if (rank === 2) return "border-l-slate-300/85";
    return "border-l-teal-500/80";
  };

  const podiumTopStyle = (rank: number) => {
    const accent = podiumAccent(rank);
    return [
      "border border-b-0 border-green-500/25",
      "bg-[repeating-linear-gradient(0deg,transparent_0px,rgba(0,255,128,0.02)_1px,transparent_2px),#050806]",
      "shadow-[inset_0_1px_0_rgba(52,211,153,0.12)]",
      "border-l-4",
      accent,
    ].join(" ");
  };

  /** Pedestal height only — base alignment comes from parent flex + justify-end */
  const podiumPedestalHeight = (rank: number) => {
    if (rank === 1) return "min-h-[7.5rem] md:min-h-[11rem]";
    if (rank === 2) return "min-h-[5.5rem] md:min-h-[7.5rem]";
    return "min-h-[4rem] md:min-h-[5.5rem]";
  };

  const podiumPedestalShell = (rank: number) => {
    const h = podiumPedestalHeight(rank);
    const accent = podiumAccent(rank);
    return [
      h,
      "relative flex w-full flex-col items-center justify-center rounded-b-md border border-t-0 border-green-500/20",
      "border-l-4",
      accent,
      "bg-[repeating-linear-gradient(0deg,transparent_0px,rgba(0,255,128,0.035)_2px,transparent_4px),#0c120f]",
      "shadow-[inset_0_2px_0_rgba(16,185,129,0.08),inset_0_-4px_12px_rgba(0,0,0,0.45)]",
    ].join(" ");
  };

  const podiumRankNumberClass = (rank: number) => {
    if (rank === 1)
      return "text-4xl md:text-5xl font-black tabular-nums tracking-tight text-emerald-300 drop-shadow-[0_0_14px_rgba(52,211,153,0.55)]";
    if (rank === 2)
      return "text-3xl md:text-4xl font-black tabular-nums tracking-tight text-slate-100 drop-shadow-[0_2px_0_rgba(0,0,0,0.9)]";
    return "text-3xl md:text-4xl font-black tabular-nums tracking-tight text-teal-300 drop-shadow-[0_0_12px_rgba(45,212,191,0.45),0_2px_0_rgba(0,0,0,1)]";
  };

  return (
    <MainLayout>
      <div className="mainframe-page relative space-y-6 animate-fade-in">
        <div className="mainframe-glow-tl" />
        <div className="mainframe-glow-br" />
        <div className="mainframe-glow-mid" />

        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="mb-1 font-mono text-[10px] text-slate-500 md:text-xs">* SYSOUT — GLOBAL RANKING FILE *</p>
            <h1 className="mb-2 text-3xl font-bold tracking-tight">Leaderboard</h1>
            <p className="text-muted-foreground">Top learners by total points</p>
          </div>
          <Trophy className="h-8 w-8 shrink-0 text-slate-400" />
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p>Loading leaderboard data...</p>
          </div>
        ) : rankedUsers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nog geen scores — voltooi levels om punten te verdienen.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Podium: 2nd — 1st — 3rd; shared min-height + justify-end = flush floor; mainframe styling */}
            <div
              className="relative mx-auto flex min-h-[19rem] max-w-3xl flex-row items-stretch justify-center gap-2 pt-8 sm:gap-3 md:min-h-[22rem] md:gap-5"
              aria-label="Top three podium"
            >
              <div className="pointer-events-none absolute bottom-0 left-2 right-2 h-[3px] rounded-sm bg-gradient-to-r from-emerald-900/40 via-emerald-500/25 to-emerald-900/40" />
              <div className="pointer-events-none absolute bottom-0.5 left-3 right-3 h-px bg-emerald-400/30" />

              {podiumSlots.map((u, slotIdx) => {
                if (!u) {
                  return (
                    <div
                      key={`podium-empty-${slotIdx}`}
                      className="hidden min-w-0 max-w-[11.5rem] flex-1 md:flex md:max-w-[13rem]"
                      aria-hidden
                    />
                  );
                }
                return (
                  <div
                    key={u.id}
                    className={`flex min-h-0 w-full max-w-[11.5rem] flex-1 flex-col justify-end md:max-w-[13rem] ${u.rank === 1 ? "relative z-10" : "z-0"}`}
                  >
                    <div className="mb-0 flex items-center justify-between gap-1 border border-b-0 border-green-500/20 bg-[#040604] px-2 py-1 font-mono text-[9px] text-emerald-500/90 uppercase tracking-wider md:text-[10px]">
                      <span className="truncate">IDENTIFICATION DIVISION</span>
                      <span className="shrink-0 text-emerald-400/80">RANK-{String(u.rank).padStart(2, "0")}</span>
                    </div>
                    <div className={`flex flex-col border border-b-0 border-t-0 px-3 pt-3 pb-3 ${podiumTopStyle(u.rank)}`}>
                      <div className="flex flex-col items-center text-center">
                        <div className="font-mono text-[10px] text-emerald-600/80 md:text-xs">
                          <span className="text-emerald-500/70">*</span> PROCEDURE DIVISION{" "}
                          <span className="text-emerald-500/70">*</span>
                        </div>
                        <Avatar
                          src={u.avatarUrl}
                          fallback={u.username}
                          size={u.rank === 1 ? 64 : 52}
                          className={
                            u.rank === 1
                              ? "mt-2 ring-2 ring-emerald-400/50"
                              : u.rank === 2
                                ? "mt-2 ring-1 ring-slate-400/35"
                                : "mt-2 ring-1 ring-teal-500/40"
                          }
                        />
                        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                          {getRankBadge(u.rank)}
                          <Trophy
                            className={`h-4 w-4 shrink-0 ${u.rank === 1 ? "text-emerald-400" : u.rank === 2 ? "text-slate-300" : "text-teal-400"}`}
                          />
                        </div>
                        <span
                          className={`mt-1 line-clamp-2 w-full font-mono text-xs md:text-sm ${u.isCurrentUser ? "font-semibold text-emerald-100" : "font-medium text-emerald-100/90"}`}
                        >
                          {u.username}
                          {u.id.startsWith("dummy-") && (
                            <span className="ml-1.5 text-[9px] font-normal uppercase tracking-wide text-slate-400">
                              demo
                            </span>
                          )}
                          {u.isCurrentUser && " (You)"}
                        </span>
                        <div className="mt-1 font-mono text-[10px] text-emerald-500/70 md:text-xs">
                          LVL {u.levelsCompleted} · PTS {u.totalPoints}
                        </div>
                      </div>
                    </div>
                    <div className={podiumPedestalShell(u.rank)}>
                      <span className="pointer-events-none absolute top-1 left-2 font-mono text-[9px] uppercase tracking-widest text-emerald-500/55 md:text-[10px]">
                        JOB RANK
                      </span>
                      <span className={`select-none ${podiumRankNumberClass(u.rank)}`}>{u.rank}</span>
                      <span className="pointer-events-none absolute bottom-1.5 font-mono text-[8px] text-emerald-600/50 md:text-[9px]">
                        EJECT
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Full ranking table — mainframe panel */}
            <Card className="mainframe-panel-muted mainframe-card-l-silver overflow-hidden p-0">
              <MainframeStrip variant="muted" left="SYSOUT — FULL RANKING" right={`ROWS=${rankedUsers.length}`} />
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700/40 hover:bg-transparent bg-[#050508]/95">
                      <TableHead className="w-[88px] font-mono text-[10px] uppercase tracking-wider text-slate-500">
                        Rank
                      </TableHead>
                      <TableHead className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                        User
                      </TableHead>
                      <TableHead className="text-right font-mono text-[10px] uppercase tracking-wider text-slate-500">
                        Points
                      </TableHead>
                      <TableHead className="text-right font-mono text-[10px] uppercase tracking-wider text-slate-500">
                        Levels
                      </TableHead>
                      <TableHead className="w-[72px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {podium.concat(rest).map((rankedUser) => {
                      const isDummy = rankedUser.id.startsWith("dummy-");
                      const canNavigate = !rankedUser.isCurrentUser && !isDummy;
                      return (
                        <TableRow
                          key={rankedUser.id}
                          className={
                            rankedUser.isCurrentUser
                              ? "border-slate-700/40 bg-cyan-950/20 hover:bg-cyan-950/25"
                              : "border-slate-800/50 hover:bg-slate-900/40"
                          }
                        >
                          <TableCell className="text-slate-200/90">{getRankBadge(rankedUser.rank)}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Avatar
                                src={rankedUser.avatarUrl}
                                fallback={rankedUser.username}
                                size={32}
                                className="ring-1 ring-slate-600/40"
                              />
                              <button
                                type="button"
                                className={cn(
                                  "max-w-[min(100%,12rem)] truncate text-left font-mono text-sm text-slate-200 underline-offset-2 hover:underline",
                                  rankedUser.isCurrentUser && "font-medium text-cyan-100/90",
                                  !canNavigate && !rankedUser.isCurrentUser && "cursor-default text-slate-400 no-underline hover:no-underline",
                                )}
                                onClick={() => {
                                  if (canNavigate) navigate(`/profile/${rankedUser.id}`);
                                }}
                                disabled={!canNavigate && !rankedUser.isCurrentUser}
                              >
                                {rankedUser.username}
                                {isDummy && (
                                  <span className="ml-2 text-[10px] font-normal uppercase tracking-wide text-slate-500">
                                    demo
                                  </span>
                                )}
                                {rankedUser.isCurrentUser && " (You)"}
                              </button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-medium text-cyan-600/90">
                            {rankedUser.totalPoints}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-1 font-mono text-sm text-slate-400">
                              <Award className="h-4 w-4 text-slate-600" />
                              <span>{rankedUser.levelsCompleted}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                              {!rankedUser.isCurrentUser && !isDummy && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                                  onClick={() => navigate(`/profile/${rankedUser.id}`)}
                                  aria-label={`View ${rankedUser.username}'s profile`}
                                >
                                  <User className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Leaderboard;
