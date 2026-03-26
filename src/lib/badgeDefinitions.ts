import { supabase } from "@/integrations/supabase/client";

export type BadgeDefinition = {
  id: string;
  name: string;
  description: string | null;
  tier: string | null;
  difficulty: number | null;
  icon_key: string | null;
  how_to_earn: string | null;
};

export async function fetchBadgeDefinitions(): Promise<BadgeDefinition[]> {
  const { data, error } = await supabase
    .from("badge_definitions")
    .select("id, name, description, tier, difficulty, icon_key, how_to_earn")
    .order("id", { ascending: true });

  if (error) throw error;
  return (data as BadgeDefinition[]) ?? [];
}

