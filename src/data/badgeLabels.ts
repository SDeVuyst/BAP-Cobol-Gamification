/** Display names aligned with `badge_definitions` seed in migration */
export const BADGE_LABELS: Record<string, string> = {
  four_divisions: "Four Divisions Master",
  picture_clauses: "PICTURE clauses",
  data_hierarchy: "Data hierarchy",
  conditional_logic: "Conditional logic",
  iterations: "Iteration patterns",
  paragraphs: "Paragraph performer",
  error_handling: "File status scout",
  perfect_streak: "Clean run",

  // Milestones
  levels_complete_1: "First level cleared",
  levels_complete_3: "Three levels down",
  levels_complete_7: "All levels complete",
  points_1000: "1K points",
  points_2500: "2.5K points",
  points_5000: "5K points",

  // Leaderboard
  leaderboard_top_50: "Top 50",
  leaderboard_top_25: "Top 25",
  leaderboard_top_10: "Top 10",
  leaderboard_top_5: "Top 5",
  leaderboard_champion: "Champion",

  // Performance / quality
  speedrun_under_5m: "Speedrun: under 5 min",
  speedrun_under_1m: "Speedrun: under 1 min",
  speedrun_under_30s: "Speedrun: under 30 sec",
  first_try_success: "One-shot",
};

/** Short tooltip copy: how each badge is earned (shown on level page, leaderboard, etc.) */
export const BADGE_EARN_HOW: Record<string, string> = {
  four_divisions:
    "Complete Level 1: submit a valid COBOL program that passes validation (IDENTIFICATION, ENVIRONMENT, DATA, PROCEDURE).",
  picture_clauses:
    "Complete Level 2: your solution must pass validation using correct PICTURE clauses for your data items.",
  data_hierarchy:
    "Complete Level 3: model the record layout and group/item hierarchy the level expects.",
  conditional_logic:
    "Complete Level 4: use the conditional constructs the level checks for (IF / EVALUATE-style logic).",
  iterations:
    "Complete Level 5: implement the iteration pattern required by the level (PERFORM / loops as specified).",
  paragraphs:
    "Complete Level 6: organize logic into the paragraphs and PERFORM flow the level validates.",
  error_handling:
    "Complete Level 7: handle files or status the way the level specifies (FILE STATUS / error paths).",
  perfect_streak:
    "Pass this level on your first successful submit: no failed validation runs before your winning submission.",

  // Milestones
  levels_complete_1: "Complete 1 level (first-time completion).",
  levels_complete_3: "Complete 3 distinct levels (first-time completions).",
  levels_complete_7: "Complete all levels (first-time completion of every level).",
  points_1000: "Reach 1,000 total points.",
  points_2500: "Reach 2,500 total points.",
  points_5000: "Reach 5,000 total points.",

  // Leaderboard
  leaderboard_top_50: "Reach the Top 50 on the global leaderboard.",
  leaderboard_top_25: "Reach the Top 25 on the global leaderboard.",
  leaderboard_top_10: "Reach the Top 10 on the global leaderboard.",
  leaderboard_top_5: "Reach the Top 5 on the global leaderboard.",
  leaderboard_champion: "Reach rank #1 on the global leaderboard.",

  // Performance / quality
  speedrun_under_5m: "Complete any level in under 5 minutes (time from attempt start to success).",
  speedrun_under_1m: "Complete any level in under 1 minute (time from attempt start to success).",
  speedrun_under_30s: "Complete any level in under 30 seconds (time from attempt start to success).",
  first_try_success: "Complete any level on your first submit with zero validation fails.",
};

export type BadgeTier = "bronze" | "silver" | "gold" | "platinum" | "legend";

export const BADGE_TIERS: Record<string, BadgeTier> = {
  // Existing (level/path) badges
  four_divisions: "bronze",
  picture_clauses: "bronze",
  data_hierarchy: "silver",
  conditional_logic: "silver",
  iterations: "gold",
  paragraphs: "gold",
  error_handling: "platinum",
  perfect_streak: "platinum",

  // Milestones
  levels_complete_1: "bronze",
  levels_complete_3: "silver",
  levels_complete_7: "gold",
  points_1000: "bronze",
  points_2500: "silver",
  points_5000: "gold",

  // Leaderboard
  leaderboard_top_50: "bronze",
  leaderboard_top_25: "silver",
  leaderboard_top_10: "gold",
  leaderboard_top_5: "platinum",
  leaderboard_champion: "legend",

  // Performance / quality
  speedrun_under_5m: "bronze",
  speedrun_under_1m: "platinum",
  speedrun_under_30s: "legend",
  first_try_success: "gold",
};

export type BadgeDifficulty = 1 | 2 | 3 | 4 | 5;

export const BADGE_DIFFICULTY: Record<string, BadgeDifficulty> = {
  // Existing (level/path) badges
  four_divisions: 1,
  picture_clauses: 1,
  data_hierarchy: 2,
  conditional_logic: 2,
  iterations: 3,
  paragraphs: 3,
  error_handling: 4,
  perfect_streak: 4,

  // Milestones
  levels_complete_1: 1,
  levels_complete_3: 2,
  levels_complete_7: 4,
  points_1000: 2,
  points_2500: 3,
  points_5000: 4,

  // Leaderboard
  leaderboard_top_50: 2,
  leaderboard_top_25: 3,
  leaderboard_top_10: 4,
  leaderboard_top_5: 5,
  leaderboard_champion: 5,

  // Performance / quality
  speedrun_under_5m: 3,
  speedrun_under_1m: 5,
  speedrun_under_30s: 5,
  first_try_success: 4,
};

/**
 * Icon key is a string so this file stays UI-framework-agnostic.
 * The UI layer maps these keys to actual icon components.
 */
export const BADGE_ICON_KEYS: Record<string, string> = {
  // Existing (level/path) badges
  four_divisions: "Layers",
  picture_clauses: "Type",
  data_hierarchy: "Boxes",
  conditional_logic: "Split",
  iterations: "Repeat2",
  paragraphs: "AlignLeft",
  error_handling: "ShieldAlert",
  perfect_streak: "Flame",

  // Milestones
  levels_complete_1: "Flag",
  levels_complete_3: "FlagTriangleRight",
  levels_complete_7: "CheckCheck",
  points_1000: "Gem",
  points_2500: "Gem",
  points_5000: "Gem",

  // Leaderboard
  leaderboard_top_50: "Medal",
  leaderboard_top_25: "Medal",
  leaderboard_top_10: "Trophy",
  leaderboard_top_5: "Crown",
  leaderboard_champion: "Crown",

  // Performance / quality
  speedrun_under_5m: "Timer",
  speedrun_under_1m: "TimerReset",
  speedrun_under_30s: "Zap",
  first_try_success: "Target",
};
