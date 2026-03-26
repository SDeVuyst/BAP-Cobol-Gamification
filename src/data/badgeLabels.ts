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
};
