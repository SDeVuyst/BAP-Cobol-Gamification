import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useFriendsStore } from "@/stores/friendsStore";
import MainLayout from "@/components/layout/MainLayout";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { COBOL_LEVELS } from "@/data/cobolLevels";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/avatar";
import { User, Trophy, Award, ArrowLeft, UserMinus } from "lucide-react";

interface FriendProfileData {
  id: string;
  username: string;
  totalPoints: number;
  levelsCompleted: number;
  streakDays: number;
  avatarUrl?: string | null;
}

const FriendProfile = () => {
  const currentUser = useAuthStore((state) => state.user);
  const { friends, removeFriend, loading: friendsLoading } = useFriendsStore();
  const navigate = useNavigate();
  const { friendId } = useParams<{ friendId: string }>();

  const [friendProfile, setFriendProfile] = useState<FriendProfileData | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);

  useEffect(() => {
    const fetchFriendDetails = async () => {
      if (!friendId || !currentUser) {
        setIsLoadingProfile(false);
        return;
      }

      setIsLoadingProfile(true);
      const friendFromStore = friends.find((f) => f.id === friendId);

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, streak_days, avatar_url, total_points, levels_completed")
          .eq("id", friendId)
          .single();

        if (error) throw error;

        if (data) {
          setFriendProfile({
            id: data.id,
            username: data.username,
            totalPoints: data.total_points ?? 0,
            levelsCompleted: data.levels_completed ?? 0,
            streakDays: data.streak_days,
            avatarUrl: data.avatar_url,
          });
        } else if (friendFromStore) {
          setFriendProfile({
            id: friendFromStore.id,
            username: friendFromStore.username,
            totalPoints: friendFromStore.totalPoints,
            levelsCompleted: 0,
            streakDays: friendFromStore.streakDays,
            avatarUrl: friendFromStore.avatarUrl,
          });
        }
      } catch (error) {
        console.error("Error fetching friend profile:", error);
        if (friendFromStore) {
          setFriendProfile({
            id: friendFromStore.id,
            username: friendFromStore.username,
            totalPoints: friendFromStore.totalPoints,
            levelsCompleted: 0,
            streakDays: friendFromStore.streakDays,
            avatarUrl: friendFromStore.avatarUrl,
          });
        }
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchFriendDetails();
  }, [friendId, currentUser, friends]);

  if (isLoadingProfile) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p>Loading friend profile...</p>
        </div>
      </MainLayout>
    );
  }

  if (!friendProfile) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Friend not found</h3>
          <p className="text-muted-foreground mb-4">This user profile could not be loaded.</p>
          <Button onClick={() => navigate("/friends")}>Back to Friends</Button>
        </div>
      </MainLayout>
    );
  }

  const levelProgress = (friendProfile.levelsCompleted / COBOL_LEVELS.length) * 100;

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold mb-2">{friendProfile.username}&apos;s Profile</h1>
              <p className="text-muted-foreground">Peer learning progress</p>
            </div>
          </div>
        </div>

        <Card className="vercel-card">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center md:space-x-6 text-center md:text-left">
              <Avatar
                src={friendProfile.avatarUrl}
                alt={`${friendProfile.username}'s avatar`}
                size={96}
                fallback={friendProfile.username.charAt(0).toUpperCase()}
                className="mb-4 md:mb-0"
              />
              <div>
                <h2 className="text-2xl font-bold">{friendProfile.username}</h2>

                <div className="flex items-center mt-2 justify-center md:justify-start gap-3 flex-wrap">
                  <div className="flex items-center text-vercel-purple">
                    <Trophy className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">{friendProfile.totalPoints} pts</span>
                  </div>
                  <div className="flex items-center">
                    <Award className="h-4 w-4 mr-1" />
                    <span className="text-sm">{friendProfile.streakDays} day streak</span>
                  </div>
                </div>

                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (currentUser && currentUser.id === friendProfile.id) return;
                      await removeFriend(friendProfile.id);
                      navigate("/friends");
                    }}
                    className="text-destructive hover:text-destructive/80"
                    disabled={friendsLoading || (currentUser && currentUser.id === friendProfile.id)}
                    aria-label={`Remove ${friendProfile.username} as friend`}
                  >
                    <UserMinus className="h-4 w-4 mr-2" />
                    Remove Friend
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Award className="h-5 w-5 mr-2" /> Levels
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-medium">
                  {friendProfile.levelsCompleted} / {COBOL_LEVELS.length}
                </span>
              </div>
              <Progress value={Math.min(100, levelProgress)} className="h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Trophy className="h-5 w-5 mr-2" /> Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <span className="text-muted-foreground block">Total points</span>
                <span className="text-4xl font-bold text-vercel-purple block mt-2">
                  {friendProfile.totalPoints}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default FriendProfile;
