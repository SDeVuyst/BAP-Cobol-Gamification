import { supabase } from "@/integrations/supabase/client";

export async function upsertUserBadges(userId: string, badgeIds: string[], earnedAt = new Date().toISOString()) {
  const unique = Array.from(new Set(badgeIds.filter(Boolean)));
  if (unique.length === 0) return;

  await supabase.from("user_badges").upsert(
    unique.map((badgeId) => ({ user_id: userId, badge_id: badgeId, earned_at: earnedAt })),
    { onConflict: "user_id,badge_id" },
  );
}

