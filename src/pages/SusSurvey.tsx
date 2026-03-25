import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import MainLayout from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { logAppEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/components/ui/use-toast";

const SUS_ITEMS: { id: number; text: string }[] = [
  { id: 1, text: "I think that I would like to use this system frequently." },
  { id: 2, text: "I found the system unnecessarily complex." },
  { id: 3, text: "I thought the system was easy to use." },
  { id: 4, text: "I think that I would need the support of a technical person to be able to use this system." },
  { id: 5, text: "I found the various functions in this system were well integrated." },
  { id: 6, text: "I thought there was too much inconsistency in this system." },
  { id: 7, text: "I would imagine that most people would learn to use this system very quickly." },
  { id: 8, text: "I found the system very cumbersome to use." },
  { id: 9, text: "I felt very confident using the system." },
  { id: 10, text: "I needed to learn a lot of things before I could get going with this system." },
];

const SCALE = [
  { v: "1", label: "Strongly disagree" },
  { v: "2", label: "Disagree" },
  { v: "3", label: "Neutral" },
  { v: "4", label: "Agree" },
  { v: "5", label: "Strongly agree" },
];

export function computeSusScore(responses: number[]): number {
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const x = responses[i];
    if ((i + 1) % 2 === 1) sum += x - 1;
    else sum += 5 - x;
  }
  return Math.round(sum * 2.5 * 10) / 10;
}

const SusSurvey = () => {
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [values, setValues] = useState<Record<number, string>>({});
  const [existing, setExisting] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase.from("sus_responses").select("id").eq("user_id", user.id).maybeSingle();
      setExisting(!!data);
    })();
  }, [user?.id]);

  if (!profile || !user) {
    return (
      <MainLayout contentMaxWidthClass="max-w-2xl">
        <p>Loading...</p>
      </MainLayout>
    );
  }

  if (existing === true) {
    return (
      <MainLayout contentMaxWidthClass="max-w-2xl">
        <Card className="vercel-card">
          <CardHeader>
            <CardTitle>Bedankt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">Je hebt de SUS-vragenlijst al ingevuld.</p>
            <Button onClick={() => navigate("/learn")}>Terug naar Learn</Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  if (existing === null) {
    return (
      <MainLayout contentMaxWidthClass="max-w-2xl">
        <p>Loading...</p>
      </MainLayout>
    );
  }

  const allAnswered = SUS_ITEMS.every((item) => values[item.id] !== undefined);

  const submit = async () => {
    if (!allAnswered || !user?.id) {
      toast({ title: "Niet compleet", description: "Beantwoord alle 10 stellingen.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const responses = SUS_ITEMS.map((item) => Number(values[item.id]));
    const score = computeSusScore(responses);
    const { error } = await supabase.from("sus_responses").insert({
      user_id: user.id,
      answers: { scale: "1-5", items: SUS_ITEMS.map((i) => i.id), responses },
      score,
    });
    if (error) {
      toast({ title: "Opslaan mislukt", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }
    await logAppEvent(user.id, "sus_submit", { score });
    toast({ title: "Dank je wel", description: `SUS-score: ${score} / 100` });
    navigate("/learn");
    setSubmitting(false);
  };

  return (
    <MainLayout contentMaxWidthClass="max-w-3xl">
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold mb-2">System Usability Scale</h1>
          <p className="text-muted-foreground text-sm">
            Na het laatste level: beoordeel het platform (10 stellingen, schaal 1–5). Je antwoorden worden opgeslagen voor de evaluatiefase.
          </p>
        </div>

        <div className="space-y-6">
          {SUS_ITEMS.map((item) => (
            <Card key={item.id} className="vercel-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium leading-relaxed">
                  {item.id}. {item.text}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={values[item.id] ?? ""}
                  onValueChange={(v) => setValues((prev) => ({ ...prev, [item.id]: v }))}
                  className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"
                >
                  {SCALE.map((s) => (
                    <div key={s.v} className="flex items-center space-x-2">
                      <RadioGroupItem value={s.v} id={`q${item.id}-${s.v}`} />
                      <Label htmlFor={`q${item.id}-${s.v}`} className="font-normal cursor-pointer text-sm">
                        {s.v} — {s.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button size="lg" onClick={submit} disabled={!allAnswered || submitting} className="w-full sm:w-auto">
          {submitting ? "Verzenden…" : "Verzend antwoorden"}
        </Button>
      </div>
    </MainLayout>
  );
};

export default SusSurvey;
