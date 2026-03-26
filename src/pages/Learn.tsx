import { useAuthStore } from "@/stores/authStore";
import MainLayout from "@/components/layout/MainLayout";
import { COBOL_LEVELS, COBOL_LEVEL_IDS } from "@/data/cobolLevels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, ArrowRight, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { MainframeStrip } from "@/components/mainframe/MainframeStrip";
import { cn } from "@/lib/utils";

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
      <div className="mainframe-page relative space-y-8 animate-fade-in">
        <div className="mainframe-glow-soft-tl" />
        <div className="mainframe-glow-soft-br" />

        <div className="relative">
          <p className="mb-1 font-mono text-[10px] text-slate-500 md:text-xs">* COURSE CATALOG — ENVIRONMENT DIVISION *</p>
          <h1 className="mb-2 text-3xl font-bold tracking-tight">Learn COBOL</h1>
          <p className="text-muted-foreground">
            Zeven levels van Python-denken naar COBOL-structuur (elk level gebruikt heuristische validatie)
          </p>
        </div>

        <Card className="mainframe-panel-muted mainframe-card-l-silver overflow-hidden">
          <MainframeStrip
            variant="muted"
            left="WORKING-STORAGE — PROGRESS"
            right={`LVL ${completedCount}/${COBOL_LEVELS.length}`}
          />
          <CardHeader>
            <CardTitle className="text-lg font-semibold tracking-tight text-slate-100">Je voortgang</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between font-mono text-xs text-slate-500 sm:text-sm">
              <span>
                {completedCount} / {COBOL_LEVELS.length} levels
              </span>
              <span className="text-cyan-700/85">{profile.totalPoints} PTS</span>
            </div>
            <Progress
              value={progressPct}
              className="h-2 overflow-hidden rounded-full border border-slate-700/40 bg-black/50 [&>div]:bg-gradient-to-r [&>div]:from-slate-600 [&>div]:to-cyan-600 [&>div]:shadow-[0_0_10px_rgba(34,211,238,0.12)]"
            />
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {COBOL_LEVELS.map((level) => {
            const done = doneLevels.has(level.id);
            const idx = COBOL_LEVEL_IDS.indexOf(level.id);
            const prevId = idx > 0 ? COBOL_LEVEL_IDS[idx - 1] : null;
            const unlocked = idx === 0 || (prevId ? doneLevels.has(prevId) : true);
            const locked = !done && !unlocked;
            return (
              <Card
                key={level.id}
                className={cn(
                  "mainframe-panel-muted overflow-hidden",
                  done ? "mainframe-card-l-status-complete" : locked ? "opacity-80" : "mainframe-card-l-status-pending",
                )}
              >
                <MainframeStrip
                  variant="muted"
                  left={`LEVEL ${level.id} — SEGMENT`}
                  right={done ? "STATUS=COMPLETE" : locked ? "STATUS=LOCKED" : "STATUS=PENDING"}
                />
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {done ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-cyan-600/80" />
                      ) : locked ? (
                        <Lock className="h-5 w-5 shrink-0 text-slate-600" />
                      ) : (
                        <Circle className="h-5 w-5 shrink-0 text-slate-600" />
                      )}
                      <CardTitle className="text-lg font-semibold tracking-tight text-slate-100">
                        Level {level.id}: {level.title}
                      </CardTitle>
                    </div>
                    <p className="text-sm text-slate-500">{level.summary}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      done
                        ? "border-cyan-700/40 bg-cyan-950/30 font-mono text-[10px] uppercase tracking-wide text-cyan-600/90"
                        : locked
                          ? "border-slate-600/50 bg-black/40 font-mono text-[10px] uppercase tracking-wide text-slate-400"
                        : "border-slate-600/50 bg-black/40 font-mono text-[10px] uppercase tracking-wide text-slate-500"
                    }
                  >
                    {done ? "Done" : locked ? "Locked" : "Open"}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full border border-slate-600/50 bg-slate-800/80 font-mono text-xs uppercase tracking-wide text-slate-100 hover:bg-slate-700/80 sm:w-auto"
                    onClick={() => navigate(`/learn/${level.id}`)}
                    disabled={locked}
                  >
                    {done ? "Herbekijk level" : locked ? "Level locked" : "Start level"}
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
