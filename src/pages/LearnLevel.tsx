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
import { BADGE_EARN_HOW, BADGE_LABELS } from "@/data/badgeLabels";
import { validateCobolLevel, countSyntaxSignals } from "@/lib/cobolValidate";
import { logAppEvent } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  BadgeCheck,
  BookText,
  Bug,
  CheckCircle2,
  ClipboardList,
  Code2,
  Crown,
  FileLock2,
  Lightbulb,
  Loader2,
  Lock,
  ScrollText,
  Sparkles,
  Swords,
  Target,
  Gem,
  Wand2,
} from "lucide-react";
import LevelCelebration from "@/components/animate-ui/LevelCelebration";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MainframeStrip } from "@/components/mainframe/MainframeStrip";

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
  const [earnedLevelBadge, setEarnedLevelBadge] = useState(false);
  const [cleanRunOnThisLevel, setCleanRunOnThisLevel] = useState(false);

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

  useEffect(() => {
    if (!user?.id || !levelId) return;
    const levelBadgeId = LEVEL_TO_BADGE[levelId];
    (async () => {
      const badgeIds = [levelBadgeId, PERFECT_RUN_BADGE].filter(Boolean) as string[];
      const [{ data: ubRows }, { data: winAttempt }] = await Promise.all([
        supabase.from("user_badges").select("badge_id").eq("user_id", user.id).in("badge_id", badgeIds),
        supabase
          .from("level_attempts")
          .select("validation_fail_count, submit_count, success")
          .eq("user_id", user.id)
          .eq("level_id", levelId)
          .eq("success", true)
          .maybeSingle(),
      ]);
      const earned = new Set((ubRows ?? []).map((r) => r.badge_id));
      setEarnedLevelBadge(levelBadgeId ? earned.has(levelBadgeId) : false);
      const firstTryHere =
        !!winAttempt &&
        winAttempt.validation_fail_count === 0 &&
        winAttempt.submit_count === 1;
      setCleanRunOnThisLevel(firstTryHere);
    })();
  }, [user?.id, levelId, completed]);

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
        setCleanRunOnThisLevel(true);
      }

      if (badgeId) setEarnedLevelBadge(true);

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
      <div className="mainframe-page relative space-y-6 animate-fade-in">
        <div className="mainframe-glow-soft-tl" />
        <div className="mainframe-glow-soft-br" />

        <div className="relative flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/learn")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Levels
          </Button>
          <div>
            <h1 className="text-2xl font-bold mt-2">
              {level.title}
            </h1>
            <p className="text-sm text-muted-foreground">{level.summary}</p>
          </div>
        </div>

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

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-stretch">
          <Card className="mainframe-panel-muted mainframe-card-l-silver relative overflow-hidden h-full flex flex-col">
            <MainframeStrip variant="muted" left="REFERENCES — DOCS" right={`LEVEL ${level.id}`} />
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookText className="h-4 w-4 text-cyan-600/90" /> Level references
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 flex-1">
              {level.cobolExplain ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground/90">
                    <Lightbulb className="h-4 w-4 text-cyan-600/80" />
                    COBOL in this level
                  </div>
                  <p className="text-sm text-muted-foreground">{level.cobolExplain.text}</p>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {level.cobolExplain.examples.map((ex) => (
                      <div key={ex.title} className="rounded-md border border-slate-700/50 bg-black/20 p-3">
                        <div className="text-xs font-medium text-foreground/90 mb-2">{ex.title}</div>
                        <pre className="text-xs leading-relaxed whitespace-pre overflow-auto font-mono text-foreground/90">
                          {ex.code}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className={level.cobolExplain ? "pt-1" : ""}>
                <div className="flex items-center gap-2 text-sm font-medium text-foreground/90">
                  <BookText className="h-4 w-4 text-cyan-600/90" />
                  Relevant docs
                </div>
              </div>
              {level.docs && level.docs.length > 0 ? (
                <div className="grid gap-2">
                  {level.docs.map((d) => (
                    <a
                      key={d.url}
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-slate-700/50 bg-black/20 px-3 py-2 hover:border-cyan-600/40 transition-colors"
                    >
                      <div className="text-sm text-foreground/90">{d.title}</div>
                      <div className="text-xs text-muted-foreground break-all">{d.url}</div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No docs for this level yet.</div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6 h-full min-h-0">
            <Card className="mainframe-panel-muted mainframe-card-l-silver relative overflow-hidden flex flex-col shrink-0">
              <MainframeStrip variant="muted" left="SEGMENT — INFO" right="STATUS" />
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-500/90" /> Level info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-600/50 bg-black/30 px-3 py-1">
                    <Crown className="h-4 w-4 text-amber-500/90" />
                    <span className="text-xs text-slate-300">Level {level.id}</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-600/50 bg-black/30 px-3 py-1">
                    <Swords className="h-4 w-4 text-violet-400/90" />
                    <span className="text-xs text-slate-300">Python → COBOL quest</span>
                  </div>
                  {completed ? (
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-700/40 bg-cyan-950/30 px-3 py-1">
                      <BadgeCheck className="h-4 w-4 text-cyan-500/90" />
                      <span className="text-xs text-cyan-200/90">Completed</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-700/40 bg-cyan-950/30 px-3 py-1">
                      <Target className="h-4 w-4 text-cyan-600/90" />
                      <span className="text-xs text-slate-300">In progress</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="mainframe-panel-muted mainframe-card-l-silver relative overflow-hidden flex flex-col flex-1 min-h-0">
              <MainframeStrip variant="muted" left="BADGES — THIS LEVEL" right="AWARDS" />
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500/90" /> Badges
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 flex-1">
                {(() => {
                  const levelBadgeId = LEVEL_TO_BADGE[levelId];
                  const defs: { id: string; label: string; tone: "purple" | "orange"; earned: boolean }[] = [];
                  if (levelBadgeId) {
                    defs.push({
                      id: levelBadgeId,
                      label: BADGE_LABELS[levelBadgeId] ?? levelBadgeId,
                      tone: "purple",
                      earned: earnedLevelBadge,
                    });
                  }
                  defs.push({
                    id: PERFECT_RUN_BADGE,
                    label: BADGE_LABELS[PERFECT_RUN_BADGE] ?? PERFECT_RUN_BADGE,
                    tone: "orange",
                    earned: cleanRunOnThisLevel,
                  });

                  const toEarn = defs.filter((b) => !b.earned);
                  const earnedList = defs.filter((b) => b.earned);

                  const tooltipText = (id: string) =>
                    BADGE_EARN_HOW[id] ??
                    `Earn "${BADGE_LABELS[id] ?? id}" by meeting this level’s validation requirements.`;

                  const renderBadgeRow = (b: (typeof defs)[number]) => (
                    <Tooltip key={b.id}>
                      <TooltipTrigger asChild>
                        <div className="flex cursor-help items-center gap-2 rounded-md border border-slate-700/50 bg-black/20 px-2.5 py-1.5 text-left transition-colors hover:border-slate-500/60">
                          <Gem className={`h-4 w-4 shrink-0 ${b.tone === "purple" ? "text-sky-400/90" : "text-amber-500/90"}`} />
                          <div className="text-sm text-foreground/90">{b.label}</div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-[260px] text-xs leading-snug">
                        {tooltipText(b.id)}
                      </TooltipContent>
                    </Tooltip>
                  );

                  return (
                    <>
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-foreground/90">To earn</p>
                        {toEarn.length > 0 ? (
                          <div className="space-y-1.5">{toEarn.map(renderBadgeRow)}</div>
                        ) : (
                          <p className="text-xs text-muted-foreground">All badges for this level are earned.</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-foreground/90">Earned</p>
                        {earnedList.length > 0 ? (
                          <div className="space-y-1.5">{earnedList.map(renderBadgeRow)}</div>
                        ) : (
                          <p className="text-xs text-muted-foreground">None yet — pass validation to unlock.</p>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground/90">Tip: hover a badge for how to earn it. Clean run = first successful submit with no failed checks before.</p>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
          <Card className="mainframe-panel-muted mainframe-card-l-sky relative overflow-hidden h-full flex flex-col">
            <MainframeStrip variant="muted" left="PYTHON — REFERENCE" right="READ-ONLY" />
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-cyan-600/90" /> Python (reference)
                </CardTitle>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-600/50 bg-black/20 px-3 py-1 text-xs text-slate-300">
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                  Read-only
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 flex-1 flex flex-col">
              <p className="text-sm text-muted-foreground">{level.pythonHint}</p>
              <div className="rounded-md border border-slate-700/50 overflow-hidden bg-background">
                <Editor
                  height={480}
                  defaultLanguage="python"
                  theme="vs"
                  value={level.pythonCode}
                  options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: "on", readOnly: true }}
                />
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-600/50 bg-black/20 px-3 py-1 text-slate-300">
                  <BookText className="h-4 w-4 text-violet-400/90" />
                  Read the intent, not the syntax
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-600/50 bg-black/20 px-3 py-1 text-slate-300">
                  <ScrollText className="h-4 w-4 text-amber-500/90" />
                  Then rewrite in COBOL structure
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mainframe-panel-muted mainframe-card-l-silver relative overflow-hidden h-full flex flex-col">
            <MainframeStrip variant="muted" left="COBOL — YOUR CODE" right="EDITABLE" />
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileLock2 className="h-4 w-4 text-violet-400/90" /> Jouw COBOL
                </CardTitle>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-700/40 bg-cyan-950/30 px-3 py-1 text-xs text-cyan-200/90">
                  <Target className="h-3.5 w-3.5 text-cyan-400/90" />
                  Editable
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 flex-1 flex flex-col">
              <div className="rounded-md border border-slate-700/50 overflow-hidden bg-background">
                <Editor
                  height={480}
                  defaultLanguage="plaintext"
                  theme="vs-dark"
                  value={code}
                  onChange={(v) => setCode(v ?? "")}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineHeight: 20,
                    fontFamily: "Consolas, 'Courier New', monospace",
                    wordWrap: "on",
                    renderLineHighlight: "gutter",
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground/90">
                Template gebruikt fixed-format spacing: COBOL-tekst start op kolom 8 (7 spaties “indicator”-ruimte).
              </p>

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
            </CardContent>
          </Card>
        </div>

        <Card className="mainframe-panel-muted mainframe-card-l-silver relative overflow-hidden">
          <MainframeStrip variant="muted" left="DOCS — CHECKLIST" right="HINTS" />
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-cyan-600/80" /> COBOL docs & hints
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-4">
            <div>
              <div className="font-medium text-foreground/90 mb-2 flex items-center gap-2">
                <Target className="h-4 w-4 text-cyan-600/80" />
                Checklist
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {level.objectives.map((o) => (
                  <div
                    key={o}
                    className="flex items-start gap-2 rounded-md border border-slate-700/50 bg-black/20 p-3"
                  >
                    <CheckCircle2 className="h-4 w-4 text-cyan-600/80 mt-0.5 shrink-0" />
                    <div className="text-sm text-muted-foreground">{o}</div>
                  </div>
                ))}
              </div>
            </div>

            {level.commonMistakes.length > 0 ? (
              <div className="space-y-2">
                <div className="font-medium text-foreground/90 flex items-center gap-2">
                  <Bug className="h-4 w-4 text-rose-500" /> Veelgemaakte fouten
                </div>
                <div className="grid gap-2">
                  {level.commonMistakes.map((m) => (
                    <div key={m} className="flex items-start gap-2 rounded-md border border-slate-700/50 bg-black/20 p-3">
                      <Bug className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
                      <div className="text-sm text-muted-foreground">{m}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <p className="text-xs text-muted-foreground/90">
              PoC-validatie is heuristisch (pattern/regex). Het doel is onderzoek naar leer-effici-ency, niet “echte
              compile-accuracy”.
            </p>

            <div className="flex flex-wrap gap-2 pt-1 text-xs">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-600/50 bg-black/20 px-3 py-1 text-slate-300">
                <BookText className="h-4 w-4 text-cyan-600/90" />
                Look for keywords (DIVISION, PIC, IF, PERFORM)
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-600/50 bg-black/20 px-3 py-1 text-slate-300">
                <ClipboardList className="h-4 w-4 text-cyan-600/80" />
                Match the checklist items one-by-one
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-600/50 bg-black/20 px-3 py-1 text-slate-300">
                <Wand2 className="h-4 w-4 text-violet-400/90" />
                Keep it readable (END-IF / END-PERFORM)
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default LearnLevel;
