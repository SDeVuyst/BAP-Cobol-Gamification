import { useAuthStore } from "@/stores/authStore";
import MainLayout from "@/components/layout/MainLayout";
import { COBOL_LEVELS } from "@/data/cobolLevels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

const Learn = () => {
  const profile = useAuthStore((s) => s.profile);
  const navigate = useNavigate();
  const [doneLevels, setDoneLevels] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("level_attempts")
        .select("level_id")
        .eq("user_id", profile.id)
        .eq("success", true);
      if (cancelled || !data) return;
      setDoneLevels(new Set(data.map((r) => r.level_id)));
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  if (!profile) {
    return (
      <MainLayout contentMaxWidthClass="max-w-6xl">
        <p>Loading...</p>
      </MainLayout>
    );
  }

  const completedCount = doneLevels.size;
  const progressPct = (completedCount / COBOL_LEVELS.length) * 100;

  return (
    <MainLayout contentMaxWidthClass="max-w-6xl">
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold mb-2">Learn COBOL</h1>
          <p className="text-muted-foreground">
            Zeven levels van Python-denken naar COBOL-structuur — elke opdracht gebruikt heuristische validatie (PoC).
          </p>
        </div>

        <Card className="vercel-card">
          <CardHeader>
            <CardTitle className="text-lg">Je voortgang</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{completedCount} / {COBOL_LEVELS.length} levels</span>
              <span className="text-vercel-purple font-medium">{profile.totalPoints} pts</span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {COBOL_LEVELS.map((level) => {
            const done = doneLevels.has(level.id);
            return (
              <Card key={level.id} className="vercel-card">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {done ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                      <CardTitle className="text-lg">
                        Level {level.id}: {level.title}
                      </CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">{level.summary}</p>
                  </div>
                  <Badge variant={done ? "default" : "secondary"}>{done ? "Done" : "Open"}</Badge>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full sm:w-auto"
                    onClick={() => navigate(`/learn/${level.id}`)}
                  >
                    {done ? "Herbekijk level" : "Start level"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
};

export default Learn;
