import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import MainLayout from "@/components/layout/MainLayout";
import { Avatar } from "@/components/avatar";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
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

interface RankedRow {
  id: string;
  username: string;
  totalPoints: number;
  levelsCompleted: number;
  avatarUrl?: string | null;
  isCurrentUser: boolean;
  rank: number;
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

    setRankedUsers(rows);
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
    if (rank === 1) return <Badge className="bg-amber-500 hover:bg-amber-600">1st</Badge>;
    if (rank === 2) return <Badge className="bg-slate-400 hover:bg-slate-500">2nd</Badge>;
    if (rank === 3) return <Badge className="bg-amber-800 hover:bg-amber-900">3rd</Badge>;
    return <Badge variant="outline">{rank}th</Badge>;
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
            <p className="text-muted-foreground">
              Top learners by total points (updates live when Realtime is enabled on{" "}
              <code className="text-xs">profiles</code>).
            </p>
          </div>
          <Trophy className="h-8 w-8 text-vercel-purple" />
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
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Rank</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead className="text-right">Levels done</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankedUsers.map((rankedUser) => (
                  <TableRow
                    key={rankedUser.id}
                    className={rankedUser.isCurrentUser ? "bg-vercel-purple/10" : ""}
                  >
                    <TableCell className="font-medium">{getRankBadge(rankedUser.rank)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar
                          src={rankedUser.avatarUrl}
                          fallback={rankedUser.username}
                          size={32}
                        />
                        <span className={rankedUser.isCurrentUser ? "font-medium" : ""}>
                          {rankedUser.username}
                          {rankedUser.isCurrentUser && " (You)"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-vercel-purple">
                    {rankedUser.totalPoints}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Award className="h-4 w-4 text-muted-foreground" />
                        <span>{rankedUser.levelsCompleted}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {!rankedUser.isCurrentUser && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => navigate(`/profile/${rankedUser.id}`)}
                          aria-label={`View ${rankedUser.username}'s profile`}
                        >
                          <User className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Leaderboard;
