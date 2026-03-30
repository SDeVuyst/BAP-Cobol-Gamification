import { useEffect, useMemo, useRef, useState } from "react";
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
import { countSyntaxSignals, validateCobolLevelDetailed, type ObjectiveCheck, type ValidationResult } from "@/lib/cobolValidate";
import { logAppEvent } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { upsertUserBadges } from "@/lib/badges";
import type { BadgeDefinition } from "@/lib/badgeDefinitions";
import { fetchBadgeDefinitions } from "@/lib/badgeDefinitions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  BadgeCheck,
  BookText,
  CheckCircle2,
  ClipboardList,
  Code2,
  Crown,
  FileLock2,
  Lightbulb,
  Loader2,
  Lock,
  Maximize2,
  Minimize2,
  ScrollText,
  Sparkles,
  Swords,
  Target,
  XCircle,
  Gem,
  Wand2,
} from "lucide-react";
import LevelCelebration from "@/components/animate-ui/LevelCelebration";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MainframeStrip } from "@/components/mainframe/MainframeStrip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const LearnLevel = () => {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const fetchUserProfile = useAuthStore((s) => s.fetchUserProfile);
  const cobolLanguageRegisteredRef = useRef(false);

  const level = levelId ? getLevel(levelId) : undefined;
  const [code, setCode] = useState(level?.starterCode ?? "");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [badgeDefinitions, setBadgeDefinitions] = useState<BadgeDefinition[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState<boolean | null>(null);
  const startedRef = useRef(false);
  const completedRef = useRef(false);
  const [celebrationTrigger, setCelebrationTrigger] = useState(0);
  const [celebrationSubtitle, setCelebrationSubtitle] = useState<string | null>(null);
  const [earnedLevelBadge, setEarnedLevelBadge] = useState(false);
  const [cleanRunOnThisLevel, setCleanRunOnThisLevel] = useState(false);
  const [fullscreenEditor, setFullscreenEditor] = useState<null | "python" | "cobol">(null);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [showFailureDetails, setShowFailureDetails] = useState(false);
  const cobolEditorRef = useRef<any>(null);
  const cobolMonacoRef = useRef<any>(null);
  const cobolDecorationsRef = useRef<string[]>([]);
  const checklistRef = useRef<HTMLDivElement | null>(null);

  const firstMatchIndex = (text: string, re: RegExp): number | null => {
    // Ensure we don't carry `lastIndex` across calls.
    const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
    const rg = new RegExp(re.source, flags);
    const m = rg.exec(text);
    return m?.index ?? null;
  };

  const indexToLine = (text: string, idx: number): number => {
    // Monaco uses 1-based lines.
    return text.slice(0, Math.max(0, idx)).split("\n").length;
  };

  const markerLineForCheck = (c: ObjectiveCheck, src: string): number => {
    const anchor = c.anchor ?? c.expected;
    if (anchor) {
      const idx = firstMatchIndex(src, anchor);
      if (idx != null) {
        const line = indexToLine(src, idx);
        // Heuristic: when anchoring to a header-ish line, place the marker *after* it.
        const anchorLooksLikeHeader =
          /DIVISION|SECTION|FILE-CONTROL|PROGRAM-ID/i.test(anchor.source);
        const totalLines = src.split("\n").length;
        const target = anchorLooksLikeHeader ? Math.min(totalLines, line + 1) : line;
        return Math.max(1, target);
      }
    }
    return 1;
  };

  const scrollToChecklist = () => {
    checklistRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const clearEditorFeedback = () => {
    // Disabled: user requested no code error highlights/markers.
    return;
  };

  const applyValidationToEditor = (result: ValidationResult, src: string) => {
    // Disabled: user requested no code error highlights/markers.
    return;
  };

  const ensureCobolLanguage = (monaco: any) => {
    if (cobolLanguageRegisteredRef.current) return;
    if (!monaco?.languages?.register) return;

    const alreadyRegistered =
      typeof monaco.languages.getLanguages === "function" &&
      monaco.languages.getLanguages().some((l: any) => l.id === "cobol");

    if (!alreadyRegistered) {
      monaco.languages.register({ id: "cobol" });
    }

    monaco.languages.setLanguageConfiguration("cobol", {
      comments: {
        lineComment: "*>",
      },
      brackets: [
        ["(", ")"],
        ["[", "]"],
      ],
      autoClosingPairs: [
        { open: "\"", close: "\"", notIn: ["string"] },
        { open: "'", close: "'", notIn: ["string"] },
        { open: "(", close: ")" },
        { open: "[", close: "]" },
      ],
    });

    monaco.languages.setMonarchTokensProvider("cobol", {
      defaultToken: "",
      ignoreCase: true,
      keywords: [
        "ACCEPT",
        "ADD",
        "CALL",
        "CANCEL",
        "CLOSE",
        "COMPUTE",
        "CONTINUE",
        "DISPLAY",
        "DIVIDE",
        "ELSE",
        "END-ADD",
        "END-CALL",
        "END-COMPUTE",
        "END-DIVIDE",
        "END-EVALUATE",
        "END-IF",
        "END-MULTIPLY",
        "END-PERFORM",
        "END-READ",
        "END-RETURN",
        "END-SEARCH",
        "END-START",
        "END-STRING",
        "END-SUBTRACT",
        "END-UNSTRING",
        "END-WRITE",
        "EVALUATE",
        "EXIT",
        "GOBACK",
        "IF",
        "INITIALIZE",
        "INSPECT",
        "MOVE",
        "MULTIPLY",
        "OPEN",
        "PERFORM",
        "READ",
        "RETURN",
        "SEARCH",
        "SET",
        "START",
        "STOP",
        "STRING",
        "SUBTRACT",
        "UNSTRING",
        "WHEN",
        "WRITE",
      ],
      divisions: [
        "IDENTIFICATION",
        "ENVIRONMENT",
        "DATA",
        "PROCEDURE",
        "CONFIGURATION",
        "INPUT-OUTPUT",
        "WORKING-STORAGE",
        "FILE",
        "LINKAGE",
        "LOCAL-STORAGE",
      ],
      sections: ["SECTION", "DIVISION", "PARAGRAPH"],
      builtins: [
        "PIC",
        "PICTURE",
        "VALUE",
        "VALUES",
        "OCCURS",
        "REDEFINES",
        "COPY",
        "REPLACE",
        "PROGRAM-ID",
        "AUTHOR",
        "DATE-WRITTEN",
        "DATE-COMPILED",
      ],
      tokenizer: {
        root: [
          [/^\s*\*.*$/, "comment"],
          [/\*>\s.*$/, "comment"],
          [/"([^"\\]|\\.)*$/, "string.invalid"],
          [/'([^'\\]|\\.)*$/, "string.invalid"],
          [/"/, "string", "@string_double"],
          [/'/, "string", "@string_single"],
          [/\b\d+(\.\d+)?\b/, "number"],
          [/\b(IDENTIFICATION|ENVIRONMENT|DATA|PROCEDURE)\s+DIVISION\b/, "keyword"],
          [/\b[A-Z][A-Z0-9-]*\b/, { cases: { "@keywords": "keyword", "@divisions": "keyword", "@builtins": "type.identifier", "@default": "identifier" } }],
        ],
        string_double: [
          [/[^\\"]+/, "string"],
          [/\\./, "string.escape"],
          [/"/, "string", "@pop"],
        ],
        string_single: [
          [/[^\\']+/, "string"],
          [/\\./, "string.escape"],
          [/'/, "string", "@pop"],
        ],
      },
    });

    cobolLanguageRegisteredRef.current = true;
  };

  useEffect(() => {
    if (!fullscreenEditor) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreenEditor(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fullscreenEditor]);

  const fullscreenTitle = useMemo(() => {
    if (fullscreenEditor === "python") return "Python (reference)";
    if (fullscreenEditor === "cobol") return "Jouw COBOL";
    return "";
  }, [fullscreenEditor]);

  useEffect(() => {
    if (level) setCode(level.starterCode);
  }, [level?.id]);

  useEffect(() => {
    (async () => {
      if (!user?.id || !levelId) return;

      const idx = COBOL_LEVEL_IDS.indexOf(levelId as (typeof COBOL_LEVEL_IDS)[number]);
      if (idx <= 0) {
        setLocked(false);
        return;
      }

      const prevId = COBOL_LEVEL_IDS[idx - 1];
      const { data, error } = await supabase
        .from("level_attempts")
        .select("id")
        .eq("user_id", user.id)
        .eq("level_id", prevId)
        .eq("success", true)
        .maybeSingle();

      if (error) {
        console.error(error);
        // Fail open on transient DB errors to avoid trapping the user.
        setLocked(false);
        return;
      }

      const isLocked = !data;
      setLocked(isLocked);
      if (isLocked) {
        toast({
          title: "Level locked",
          description: `Rond eerst level ${prevId} af om level ${levelId} te unlocken.`,
          variant: "destructive",
        });
        navigate("/learn", { replace: true });
      }
    })();
  }, [user?.id, levelId, navigate]);

  useEffect(() => {
    if (!user?.id || !levelId || !level || !COBOL_LEVEL_IDS.includes(levelId as (typeof COBOL_LEVEL_IDS)[number])) {
      return;
    }
    if (locked !== false) return;
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
  }, [user?.id, levelId, level, locked]);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchBadgeDefinitions();
        if (!cancelled) setBadgeDefinitions(rows);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!profile || !user) {
    return (
      <MainLayout contentMaxWidthClass="max-w-7xl">
        <p>Loading...</p>
      </MainLayout>
    );
  }

  if (locked === true) {
    return (
      <MainLayout contentMaxWidthClass="max-w-7xl">
        <p>Level locked. Terug naar levels…</p>
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
    if (!attemptId || !user?.id) {
      toast({ title: "Even geduld", description: "Sessie wordt nog opgestart.", variant: "destructive" });
      return;
    }

    setBusy(true);
    setShowFailureDetails(false);
    clearEditorFeedback();

    const result = validateCobolLevelDetailed(levelId, code);
    setValidation(result);
    applyValidationToEditor(result, code);
    const extraSyntax = countSyntaxSignals(code);

    const { data: row } = await supabase
      .from("level_attempts")
      .select("submit_count, validation_fail_count, syntax_error_count, started_at")
      .eq("id", attemptId)
      .single();

    const prevSubmit = row?.submit_count ?? 0;
    const prevFail = row?.validation_fail_count ?? 0;
    const prevSyntax = row?.syntax_error_count ?? 0;
    const startedAt = row?.started_at ?? null;

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
      const earnedNow: string[] = [];
      if (badgeId) earnedNow.push(badgeId);
      if (firstTry) earnedNow.push(PERFECT_RUN_BADGE, "first_try_success");

      // Level-completion milestones
      if (distinctLevels >= 1) earnedNow.push("levels_complete_1");
      if (distinctLevels >= 3) earnedNow.push("levels_complete_3");
      if (distinctLevels >= COBOL_LEVEL_IDS.length) earnedNow.push("levels_complete_7");

      // Point milestones (based on updated total)
      if (newTotal >= 1000) earnedNow.push("points_1000");
      if (newTotal >= 2500) earnedNow.push("points_2500");
      if (newTotal >= 5000) earnedNow.push("points_5000");

      // Speedrun badges (attempt start -> success)
      if (startedAt) {
        const elapsedMs = Date.now() - new Date(startedAt).getTime();
        if (Number.isFinite(elapsedMs) && elapsedMs >= 0) {
          if (elapsedMs < 5 * 60 * 1000) earnedNow.push("speedrun_under_5m");
          if (elapsedMs < 60 * 1000) earnedNow.push("speedrun_under_1m");
          if (elapsedMs < 30 * 1000) earnedNow.push("speedrun_under_30s");
        }
      }

      await upsertUserBadges(user.id, earnedNow);

      if (firstTry) setCleanRunOnThisLevel(true);

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
        description: "Al gepasseerd - geen extra punten; poging wel gelogd.",
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
      <div className="mainframe-page relative space-y-6 animate-fade-in overflow-x-hidden">
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

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-stretch">
          <Card className="mainframe-panel-muted mainframe-card-l-silver relative overflow-hidden h-full flex flex-col">
            <MainframeStrip variant="muted" left="REFERENCES - DOCS" right={`LEVEL ${level.id}`} />
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
              <MainframeStrip variant="muted" left="SEGMENT - INFO" right="STATUS" />
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
              <MainframeStrip variant="muted" left="BADGES - THIS LEVEL" right="AWARDS" />
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
                      label: badgeDefinitions.find((d) => d.id === levelBadgeId)?.name ?? levelBadgeId,
                      tone: "purple",
                      earned: earnedLevelBadge,
                    });
                  }
                  defs.push({
                    id: PERFECT_RUN_BADGE,
                    label: badgeDefinitions.find((d) => d.id === PERFECT_RUN_BADGE)?.name ?? PERFECT_RUN_BADGE,
                    tone: "orange",
                    earned: cleanRunOnThisLevel,
                  });

                  const toEarn = defs.filter((b) => !b.earned);
                  const earnedList = defs.filter((b) => b.earned);

                  const tooltipText = (id: string) =>
                    badgeDefinitions.find((d) => d.id === id)?.how_to_earn ??
                    badgeDefinitions.find((d) => d.id === id)?.description ??
                    `Earn "${badgeDefinitions.find((d) => d.id === id)?.name ?? id}" by meeting this level’s validation requirements.`;

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
                          <p className="text-xs text-muted-foreground">None yet - pass validation to unlock.</p>
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
          <Card className="mainframe-panel-muted mainframe-card-l-silver relative overflow-hidden h-full flex flex-col">
            <MainframeStrip variant="muted" left="PYTHON - REFERENCE" right="READ-ONLY" />
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-cyan-600/90" /> Python (reference)
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-slate-600/50 bg-black/20 font-mono text-[10px] uppercase tracking-wide text-slate-200 hover:bg-slate-800/50"
                    onClick={() => setFullscreenEditor((cur) => (cur === "python" ? null : "python"))}
                    aria-label={fullscreenEditor === "python" ? "Exit fullscreen" : "Open fullscreen"}
                  >
                    {fullscreenEditor === "python" ? (
                      <Minimize2 className="h-3.5 w-3.5" />
                    ) : (
                      <Maximize2 className="h-3.5 w-3.5" />
                    )}
                    Fullscreen
                  </Button>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-600/50 bg-black/20 px-3 py-1 text-xs text-slate-300">
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                    Read-only
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 flex-1 flex flex-col">
              <p className="text-sm text-muted-foreground">{level.pythonHint}</p>
              <div className="rounded-md border border-slate-700/50 overflow-hidden bg-background">
                <Editor
                  height={480}
                  defaultLanguage="python"
                  theme="vs-dark"
                  value={level.pythonCode}
                  options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: "on", readOnly: true }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mainframe-panel-muted mainframe-card-l-sky relative overflow-hidden h-full flex flex-col">
            <MainframeStrip variant="muted" left="COBOL - YOUR CODE" right="EDITABLE" />
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileLock2 className="h-4 w-4 text-violet-400/90" /> Jouw COBOL
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-slate-600/50 bg-black/20 font-mono text-[10px] uppercase tracking-wide text-slate-200 hover:bg-slate-800/50"
                    onClick={() => setFullscreenEditor((cur) => (cur === "cobol" ? null : "cobol"))}
                    aria-label={fullscreenEditor === "cobol" ? "Exit fullscreen" : "Open fullscreen"}
                  >
                    {fullscreenEditor === "cobol" ? (
                      <Minimize2 className="h-3.5 w-3.5" />
                    ) : (
                      <Maximize2 className="h-3.5 w-3.5" />
                    )}
                    Fullscreen
                  </Button>
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-700/40 bg-cyan-950/30 px-3 py-1 text-xs text-cyan-200/90">
                    <Target className="h-3.5 w-3.5 text-cyan-400/90" />
                    Editable
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 flex-1 flex flex-col">
              <div className="rounded-md border border-slate-700/50 overflow-hidden bg-background">
                <Editor
                  height={480}
                  defaultLanguage="cobol"
                  theme="vs-dark"
                  value={code}
                  onChange={(v) => setCode(v ?? "")}
                  beforeMount={ensureCobolLanguage}
                  onMount={(editor, monaco) => {
                    cobolEditorRef.current = editor;
                    cobolMonacoRef.current = monaco;
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineHeight: 20,
                    fontFamily: "Consolas, 'Courier New', monospace",
                    wordWrap: "on",
                    renderLineHighlight: "gutter",
                    glyphMargin: true,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground/90">
                Template gebruikt fixed-format spacing: COBOL-tekst start op kolom 8 (7 spaties “indicator”-ruimte).
              </p>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    setCode(level.starterCode);
                    setValidation(null);
                    setShowFailureDetails(false);
                    clearEditorFeedback();
                  }}
                  variant="outline"
                  disabled={busy}
                >
                  Reset template
                </Button>
                <Button onClick={runValidation} disabled={busy}>
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Controleren...
                    </>
                  ) : (
                    "Controleer oplossing"
                  )}
                </Button>
              </div>

              {validation && !validation.ok ? (
                <div className="flex items-center justify-between gap-3 rounded-md border border-rose-500/25 bg-rose-950/20 px-3 py-2 text-xs text-rose-200/90">
                  <div className="min-w-0">
                    {validation.errors.length} check{validation.errors.length === 1 ? "" : "s"} niet ok.
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTipsOpen(true);
                        setShowFailureDetails(true);
                        scrollToChecklist();
                      }}
                    >
                      Toon wat er mis is
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setTipsOpen(false);
                        setShowFailureDetails(false);
                      }}
                    >
                      Ik probeer zelf
                    </Button>
                  </div>
                </div>
              ) : null}
              {/* Intentionally no "success" banner (requested). */}
            </CardContent>
          </Card>
        </div>

        <Collapsible open={tipsOpen} onOpenChange={setTipsOpen}>
          <Card ref={checklistRef} className="mainframe-panel-muted mainframe-card-l-silver relative overflow-hidden">
            <MainframeStrip variant="muted" left="DOCS - TIPS" right={tipsOpen ? "OPEN" : "GESLOTEN"} />
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-cyan-600/80" /> Tips
              </CardTitle>
              <CollapsibleTrigger asChild>
                <Button type="button" size="sm" variant="outline">
                  {tipsOpen ? "Verberg" : "Toon"}
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="text-sm text-muted-foreground space-y-4">
                <div>
                  <div className="font-medium text-foreground/90 mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4 text-cyan-600/80" />
                    Checklist
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(() => {
                      const byLabel = new Map<string, ObjectiveCheck>();
                      for (const c of validation?.checks ?? []) byLabel.set(c.label, c);

                      return level.objectives.map((o) => {
                        const c = byLabel.get(o);
                        const reveal = showFailureDetails || (validation?.ok ?? false);
                        const status = !validation || !reveal ? "unknown" : c?.ok ? "ok" : "fail";

                        const Icon = status === "ok" ? CheckCircle2 : status === "fail" ? XCircle : Target;
                        const iconClass =
                          status === "ok"
                            ? "text-emerald-400/90"
                            : status === "fail"
                              ? "text-rose-400/90"
                              : "text-cyan-600/70";

                        return (
                          <div
                            key={o}
                            className="flex items-start gap-2 rounded-md border border-slate-700/50 bg-black/20 p-3"
                          >
                            <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${iconClass}`} />
                            <div className="min-w-0">
                              <div className="text-sm text-muted-foreground">{o}</div>
                              {status === "fail" && showFailureDetails ? (
                                <div className="mt-1 text-xs text-rose-200/80">{c?.message ?? "Nog niet ok."}</div>
                              ) : null}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground/90">Validatie is heuristisch (pattern/regex).</p>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {fullscreenEditor && (
        <div className="fixed inset-0 z-[110] bg-[#060608]">
          <div className="h-full w-full p-3 sm:p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 rounded-md border border-slate-700/50 bg-black/30 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate font-mono text-xs uppercase tracking-wide text-slate-400">
                  Fullscreen editor
                </div>
                <div className="truncate text-sm font-medium text-slate-100">{fullscreenTitle}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden sm:block font-mono text-[10px] text-slate-500">Esc to exit</div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-slate-600/50 bg-black/20 font-mono text-[10px] uppercase tracking-wide text-slate-200 hover:bg-slate-800/50"
                  onClick={() => setFullscreenEditor(null)}
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                  Exit
                </Button>
              </div>
            </div>

            <div className="flex-1 min-h-0 rounded-md border border-slate-700/50 overflow-hidden bg-background">
              {fullscreenEditor === "python" ? (
                <Editor
                  height="100%"
                  defaultLanguage="python"
                  theme="vs-dark"
                  value={level.pythonCode}
                  options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: "on", readOnly: true }}
                />
              ) : (
                <Editor
                  height="100%"
                  defaultLanguage="cobol"
                  theme="vs-dark"
                  value={code}
                  onChange={(v) => setCode(v ?? "")}
                  beforeMount={ensureCobolLanguage}
                  onMount={(editor, monaco) => {
                    cobolEditorRef.current = editor;
                    cobolMonacoRef.current = monaco;
                    if (validation) applyValidationToEditor(validation, code);
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineHeight: 20,
                    fontFamily: "Consolas, 'Courier New', monospace",
                    wordWrap: "on",
                    renderLineHighlight: "gutter",
                    glyphMargin: true,
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default LearnLevel;
