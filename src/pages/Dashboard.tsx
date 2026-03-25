import { useEffect, useState } from "react";
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
import { BookOpen, ArrowRight, Award, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge as UiBadge } from "@/components/ui/badge";

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

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">
              Je COBOL-leerpad, punten en badges — gamification volgens het leerontwerp.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Avatar
              src={profile.avatarUrl}
              fallback={profile.username}
              size={48}
              className="border-2 border-vercel-purple/30"
            />
            <div className="hidden sm:block text-right">
              <p className="font-medium">{profile.username}</p>
              <p className="text-sm text-muted-foreground">{profile.totalPoints} punten</p>
            </div>
          </div>
        </div>

        <Card className="vercel-card">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5" /> Learn COBOL
            </CardTitle>
            <Button
              className="bg-vercel-purple hover:bg-vercel-purple/90"
              onClick={() => navigate("/learn")}
            >
              Open levels <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>
                Levels voltooid: {profile.levelsCompleted} / {COBOL_LEVELS.length}
              </span>
            </div>
            <Progress value={Math.min(100, progressPct || 0)} className="h-2" />
          </CardContent>
        </Card>

        <Card className="vercel-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5" /> Badges
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userBadges.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nog geen badges — rond een level af om je eerste badge te verdienen.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {userBadges.map((b) => (
                  <UiBadge key={b.badge_id} variant="secondary" className="text-xs">
                    {BADGE_LABELS[b.badge_id] ?? b.badge_id}
                  </UiBadge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="vercel-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Trophy className="h-5 w-5 mr-2" /> Studiestreak
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Opeenvolgende dagen (historisch)</span>
                <span className="font-medium">{profile.streakDays} days</span>
              </div>
              <Progress value={Math.min(100, (profile.streakDays / 30) * 100)} className="h-2" />
            </CardContent>
          </Card>

          <Card className="vercel-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Vrienden — punten</CardTitle>
              <Button
                variant="ghost"
                className="text-vercel-purple hover:text-vercel-purple/80"
                onClick={() => navigate("/leaderboard")}
              >
                Globaal <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent>
              {friendsLoading && !friends.length && (
                <div className="text-center text-muted-foreground py-2">Loading friends...</div>
              )}

              {!friendsLoading && topFriends.length === 0 && (
                <div className="text-center text-muted-foreground py-2">
                  Voeg vrienden toe om hun scores te vergelijken.
                </div>
              )}

              {topFriends.length > 0 && (
                <div className="space-y-3">
                  {topFriends.map((friend, index) => (
                    <div key={friend.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-muted-foreground font-medium w-4">{index + 1}.</span>
                        <Avatar src={friend.avatarUrl} fallback={friend.username} size={32} />
                        <span className="font-medium">{friend.username}</span>
                      </div>
                      <span className="font-medium text-vercel-purple">{friend.totalPoints} pts</span>
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
