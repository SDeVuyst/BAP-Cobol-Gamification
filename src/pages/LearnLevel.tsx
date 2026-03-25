import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { useAuthStore } from "@/stores/authStore";
import MainLayout from "@/components/layout/MainLayout";
import {
  COBOL_LEVEL_IDS,
  FIRST_TRY_BONUS,
  LEVEL_TO_BADGE,
  PERFECT_RUN_BADGE,
  POINTS_PER_LEVEL,
  getLevel,
} from "@/data/cobolLevels";
import { validateCobolLevel, countSyntaxSignals } from "@/lib/cobolValidate";
import { logAppEvent } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Bug, CheckCircle2, ClipboardList, Lightbulb, Loader2, Sparkles } from "lucide-react";
import LevelCelebration from "@/components/animate-ui/LevelCelebration";

const LearnLevel = () => {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const fetchUserProfile = useAuthStore((s) => s.fetchUserProfile);

  const level = levelId ? getLevel(levelId) : undefined;
  const [code, setCode] = useState(level?.starterCode ?? "");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const startedRef = useRef(false);
  const completedRef = useRef(false);
  const [celebrationTrigger, setCelebrationTrigger] = useState(0);
  const [celebrationSubtitle, setCelebrationSubtitle] = useState<string | null>(null);

  useEffect(() => {
    if (level) setCode(level.starterCode);
  }, [level?.id]);

  useEffect(() => {
    if (!user?.id || !levelId || !level || !COBOL_LEVEL_IDS.includes(levelId as (typeof COBOL_LEVEL_IDS)[number])) {
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      const { data, error } = await supabase
        .from("level_attempts")
        .insert({
          user_id: user.id,
          level_id: levelId,
        })
        .select("id")
        .single();

      if (error) {
        console.error(error);
        toast({ title: "Kon sessie niet starten", description: error.message, variant: "destructive" });
        startedRef.current = false;
        return;
      }
      setAttemptId(data.id);
      await logAppEvent(user.id, "level_open", { level_id: levelId });
      await supabase
        .from("profiles")
        .update({ last_active_at: new Date().toISOString() })
        .eq("id", user.id);
    })();
  }, [user?.id, levelId, level]);

  useEffect(() => {
    (async () => {
      if (!user?.id || !levelId) return;
      const { data } = await supabase
        .from("level_attempts")
        .select("id")
        .eq("user_id", user.id)
        .eq("level_id", levelId)
        .eq("success", true)
        .maybeSingle();
      if (data) {
        setCompleted(true);
        completedRef.current = true;
      }
    })();
  }, [user?.id, levelId]);

  if (!profile || !user) {
    return (
      <MainLayout contentMaxWidthClass="max-w-7xl">
        <p>Loading...</p>
      </MainLayout>
    );
  }

  if (!levelId || !level || !COBOL_LEVEL_IDS.includes(levelId as (typeof COBOL_LEVEL_IDS)[number])) {
    return (
      <MainLayout contentMaxWidthClass="max-w-7xl">
        <p>Level niet gevonden.</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate("/learn")}>
          Terug
        </Button>
      </MainLayout>
    );
  }

  const runValidation = async () => {
    if (completedRef.current) return;
    if (!attemptId || !user?.id) {
      toast({ title: "Even geduld", description: "Sessie wordt nog opgestart.", variant: "destructive" });
      return;
    }

    setBusy(true);
    setErrors([]);

    const result = validateCobolLevel(levelId, code);
    const extraSyntax = countSyntaxSignals(code);

    const { data: row } = await supabase
      .from("level_attempts")
      .select("submit_count, validation_fail_count, syntax_error_count")
      .eq("id", attemptId)
      .single();

    const prevSubmit = row?.submit_count ?? 0;
    const prevFail = row?.validation_fail_count ?? 0;
    const prevSyntax = row?.syntax_error_count ?? 0;

    const submitCount = prevSubmit + 1;

    if (!result.ok) {
      const validationFailCount = prevFail + 1;
      const syntaxErrorCount = prevSyntax + result.errors.length + extraSyntax;
      await supabase
        .from("level_attempts")
        .update({
          submit_count: submitCount,
          validation_fail_count: validationFailCount,
          syntax_error_count: syntaxErrorCount,
        })
        .eq("id", attemptId);

      await logAppEvent(user.id, "level_submit_fail", {
        level_id: levelId,
        errors: result.errors,
      });
      setErrors(result.errors);
      setBusy(false);
      return;
    }

    const { count: priorSuccess } = await supabase
      .from("level_attempts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("level_id", levelId)
      .eq("success", true);

    const alreadyCompletedLevel = (priorSuccess ?? 0) > 0;

    const syntaxErrorCount = prevSyntax + extraSyntax;
    await supabase
      .from("level_attempts")
      .update({
        submit_count: submitCount,
        validation_fail_count: prevFail,
        syntax_error_count: syntaxErrorCount,
        success: true,
        completed_at: new Date().toISOString(),
      })
      .eq("id", attemptId);

    await logAppEvent(user.id, "level_complete", {
      level_id: levelId,
      repeat: alreadyCompletedLevel,
    });

    if (!alreadyCompletedLevel) {
      const firstTry = prevFail === 0 && submitCount === 1;
      const points = POINTS_PER_LEVEL + (firstTry ? FIRST_TRY_BONUS : 0);
      const subtitle = `+${points} punten${firstTry ? " (bonus eerste poging)" : ""}`;
      setCelebrationSubtitle(subtitle);
      setCelebrationTrigger((t) => t + 1);

      const { data: successes } = await supabase
        .from("level_attempts")
        .select("level_id")
        .eq("user_id", user.id)
        .eq("success", true);

      const distinctLevels = new Set((successes ?? []).map((r) => r.level_id)).size;

      const { data: prof } = await supabase
        .from("profiles")
        .select("total_points")
        .eq("id", user.id)
        .single();

      const newTotal = (prof?.total_points ?? profile.totalPoints) + points;

      await supabase
        .from("profiles")
        .update({
          total_points: newTotal,
          levels_completed: distinctLevels,
          last_active_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      const badgeId = LEVEL_TO_BADGE[levelId];
      if (badgeId) {
        await supabase.from("user_badges").upsert(
          { user_id: user.id, badge_id: badgeId, earned_at: new Date().toISOString() },
          { onConflict: "user_id,badge_id" },
        );
      }
      if (firstTry) {
        await supabase.from("user_badges").upsert(
          { user_id: user.id, badge_id: PERFECT_RUN_BADGE, earned_at: new Date().toISOString() },
          { onConflict: "user_id,badge_id" },
        );
      }

      await fetchUserProfile(user.id);
      toast({
        title: "Level voltooid",
        description: subtitle,
      });

      if (levelId === "7") {
        // Laat de celebration kort "landen" voordat je naar SUS wordt gestuurd.
        setTimeout(() => navigate("/learn/sus"), 900);
      }
    } else {
      toast({
        title: "Opgelost",
        description: "Al gepasseerd — geen extra punten; poging wel gelogd.",
      });
    }

    completedRef.current = true;
    setCompleted(true);
    setBusy(false);
  };

  return (
    <MainLayout contentMaxWidthClass="max-w-7xl">
      <LevelCelebration
        trigger={celebrationTrigger}
        title={`Level ${level.id} compleet!`}
        subtitle={celebrationSubtitle ?? undefined}
      />
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/learn")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Levels
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              Level {level.id}: {level.title}
            </h1>
            <p className="text-sm text-muted-foreground">{level.summary}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Card className="vercel-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-vercel-purple" /> Missie
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <p>{level.mission}</p>
                <div className="text-xs text-muted-foreground/90 bg-secondary/30 rounded-md p-3">
                  <span className="font-medium">Fun fact:</span> {level.funFact}
                </div>
              </CardContent>
            </Card>

            <Card className="vercel-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-vercel-purple" /> Checklist
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="list-disc pl-5 space-y-1">
                  {level.objectives.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="vercel-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-vercel-purple" /> Python ↔ COBOL
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <p>{level.pythonHint}</p>
                <p className="text-xs text-muted-foreground/90">
                  PoC-validatie is heuristisch (pattern/regex). Het doel is onderzoek naar leer-effici-ency,
                  niet “echte compile-accuracy”.
                </p>
              </CardContent>
            </Card>

            {level.commonMistakes.length > 0 ? (
              <Card className="vercel-card">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bug className="h-4 w-4 text-vercel-purple" /> Veelgemaakte fouten
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="list-disc pl-5 space-y-1">
                    {level.commonMistakes.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}
            {completed && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Dit level is afgerond. Je kunt de code nog aanpassen om te oefenen; scores zijn al gelogd.
                </AlertDescription>
              </Alert>
            )}
            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <ul className="list-disc pl-4 space-y-1">
                    {errors.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-3">
            <div className="rounded-md border border-vercel-gray-800 overflow-hidden bg-black/40">
              <Editor
                height={480}
                defaultLanguage="plaintext"
                theme="vs-dark"
                value={code}
                onChange={(v) => setCode(v ?? "")}
                options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: "on" }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setCode(level.starterCode)} variant="outline" disabled={busy}>
                Reset template
              </Button>
              <Button onClick={runValidation} disabled={busy || completed}>
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Controleren...
                  </>
                ) : (
                  "Controleer oplossing"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default LearnLevel;
