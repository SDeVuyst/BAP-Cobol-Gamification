import { supabase } from "@/integrations/supabase/client";

export type AppEventType =
  | "login"
  | "level_open"
  | "level_submit_fail"
  | "level_complete"
  | "session_ping";

export async function logAppEvent(
  userId: string,
  eventType: AppEventType,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const { error } = await supabase.from("app_events").insert({
      user_id: userId,
      event_type: eventType,
      metadata: metadata ?? null,
    });
    if (error) console.warn("[analytics] app_events insert:", error.message);
  } catch (e) {
    console.warn("[analytics] logAppEvent failed", e);
  }
}
