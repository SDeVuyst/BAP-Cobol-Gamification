import { useAuthStore } from "@/stores/authStore";
import MainLayout from "@/components/layout/MainLayout";
import { useNavigate } from "react-router-dom";
import { COBOL_LEVELS } from "@/data/cobolLevels";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarUpload } from "@/components/avatar";
import { User, Trophy, Award, ArrowRight } from "lucide-react";

const Profile = () => {
  const profile = useAuthStore((state) => state.profile);
  const updateAvatarUrl = useAuthStore((state) => state.updateAvatarUrl);
  const navigate = useNavigate();

  if (!profile) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p>Loading your profile...</p>
        </div>
      </MainLayout>
    );
  }

  const levelProgress = (profile.levelsCompleted / COBOL_LEVELS.length) * 100;

  const handleAvatarUpload = (filePath: string) => {
    updateAvatarUrl(filePath || null);
  };

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Profile</h1>
            <p className="text-muted-foreground">Learning stats and account.</p>
          </div>
          <User className="h-8 w-8 text-vercel-purple" />
        </div>

        <Card className="vercel-card">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row items-center lg:space-x-6 text-center lg:text-left space-y-6 lg:space-y-0">
              <div className="flex-shrink-0">
                <AvatarUpload
                  currentAvatarUrl={profile.avatarUrl}
                  onUpload={handleAvatarUpload}
                  size={120}
                />
              </div>

              <div className="flex-1">
                <h2 className="text-2xl font-bold">{profile.username}</h2>
                <p className="text-muted-foreground">{profile.email}</p>

                <div className="flex items-center mt-2 justify-center lg:justify-start gap-4 flex-wrap">
                  <div className="flex items-center text-vercel-purple">
                    <Trophy className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">{profile.totalPoints} points</span>
                  </div>
                  <div className="flex items-center">
                    <Award className="h-4 w-4 mr-1 text-vercel-purple" />
                    <span className="text-sm">
                      {profile.levelsCompleted} / {COBOL_LEVELS.length} levels
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Award className="h-5 w-5 mr-2" /> Voortgang
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Progress value={Math.min(100, levelProgress)} className="h-2" />
              <Button
                variant="link"
                className="mt-2 px-0 text-vercel-purple"
                onClick={() => navigate("/learn")}
              >
                Naar levels <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Trophy className="h-5 w-5 mr-2" /> Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => navigate("/leaderboard")}>
                Bekijk ranglijst
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Profile;
