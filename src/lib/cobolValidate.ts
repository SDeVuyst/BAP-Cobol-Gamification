export interface ObjectiveCheck {
  /** Stable-ish id for UI keys/markers. */
  id: string;
  /** Human label (shown in checklist). */
  label: string;
  ok: boolean;
  /** Short hint shown when failing (and used for marker text). */
  message?: string;
  /**
   * Regex that should exist (or be used as an anchor to place a marker).
   * When `expected` is provided and not found, the marker is placed near `anchor` (or line 1).
   */
  expected?: RegExp;
  anchor?: RegExp;
}

export interface ValidationResult {
  ok: boolean;
  /** Backwards-compatible flat list of failing messages. */
  errors: string[];
  /** Per-objective checks for UI. */
  checks: ObjectiveCheck[];
}

function hasAll(haystack: string, needles: RegExp[], label: string): string[] {
  const missing: string[] = [];
  for (const re of needles) {
    if (!re.test(haystack)) missing.push(`${label}: patroon niet gevonden (${re.source})`);
  }
  return missing;
}

/**
 * Heuristische PoC-validatie - geen echte COBOL-compiler.
 */
export function validateCobolLevel(levelId: string, code: string): ValidationResult {
  return validateCobolLevelDetailed(levelId, code);
}

export function validateCobolLevelDetailed(levelId: string, code: string): ValidationResult {
  const checks: ObjectiveCheck[] = [];
  const u = code.toUpperCase();

  const add = (c: ObjectiveCheck) => checks.push(c);

  switch (levelId) {
    case "1": {
      add({
        id: "l1_ident",
        label: "Bevat IDENTIFICATION DIVISION.",
        ok: /\bIDENTIFICATION\s+DIVISION\b/i.test(code),
        expected: /\bIDENTIFICATION\s+DIVISION\b/i,
        anchor: /\bPROGRAM-ID\b/i,
        message: "Voeg `IDENTIFICATION DIVISION.` toe.",
      });
      add({
        id: "l1_env",
        label: "Bevat ENVIRONMENT DIVISION.",
        ok: /\bENVIRONMENT\s+DIVISION\b/i.test(code),
        expected: /\bENVIRONMENT\s+DIVISION\b/i,
        anchor: /\bIDENTIFICATION\s+DIVISION\b/i,
        message: "Voeg `ENVIRONMENT DIVISION.` toe (na IDENTIFICATION).",
      });
      add({
        id: "l1_data",
        label: "Bevat DATA DIVISION.",
        ok: /\bDATA\s+DIVISION\b/i.test(code),
        expected: /\bDATA\s+DIVISION\b/i,
        anchor: /\bENVIRONMENT\s+DIVISION\b/i,
        message: "Voeg `DATA DIVISION.` toe (na ENVIRONMENT).",
      });
      add({
        id: "l1_proc",
        label: "Bevat PROCEDURE DIVISION.",
        ok: /\bPROCEDURE\s+DIVISION\b/i.test(code),
        expected: /\bPROCEDURE\s+DIVISION\b/i,
        anchor: /\bDATA\s+DIVISION\b/i,
        message: "Voeg `PROCEDURE DIVISION.` toe (na DATA).",
      });
      add({
        id: "l1_stop_run",
        label: "Heeft een `STOP RUN.` aan het eind van je run.",
        ok: /\bSTOP\s+RUN\s*\./i.test(code),
        expected: /\bSTOP\s+RUN\s*\./i,
        anchor: /\bPROCEDURE\s+DIVISION\b/i,
        message: "Sluit af met `STOP RUN.` (met punt).",
      });
      break;
    }
    case "2": {
      add({
        id: "l2_pic_9",
        label: "Minstens één PIC of PICTURE met 9.",
        ok: /\bPIC\s+[^.\n]*9/i.test(code) || /\bPICTURE\s+[^.\n]*9/i.test(code),
        expected: /\b(PIC|PICTURE)\s+[^.\n]*9/i,
        anchor: /\bWORKING-STORAGE\b/i,
        message: "Gebruik minstens één numerieke PIC met 9 (bijv. `PIC 9(5).`).",
      });
      add({
        id: "l2_pic_x",
        label: "Minstens één met X.",
        ok: /\bPIC\s+[^.\n]*X/i.test(code) || /\bPICTURE\s+[^.\n]*X/i.test(code),
        expected: /\b(PIC|PICTURE)\s+[^.\n]*X/i,
        anchor: /\bWORKING-STORAGE\b/i,
        message: "Gebruik minstens één alfanumerieke PIC met X (bijv. `PIC X(20).`).",
      });
      add({
        id: "l2_pic_v",
        label: "Minstens één die V bevat (bijv. 99V99).",
        ok: /\bPIC\s+[^.\n]*V/i.test(code) || /\bPICTURE\s+[^.\n]*V/i.test(code),
        expected: /\b(PIC|PICTURE)\s+[^.\n]*V/i,
        anchor: /\bWORKING-STORAGE\b/i,
        message: "Gebruik `V` in een PIC (bijv. `PIC 9(3)V99.`).",
      });
      const has01 = /\b01\s+/i.test(code);
      const has05 = /\b05\s+/i.test(code);
      add({
        id: "l2_01_05",
        label: "Laat ten minste 1 veld zien binnen een 01-structuur (05 onder 01).",
        ok: has01 && has05 && /\b01\b[\s\S]*\b05\b/i.test(code),
        expected: /\b01\b[\s\S]*\b05\b/i,
        anchor: /\b01\s+/i,
        message: "Zet minstens één `05` veld onder een `01` record (en in die volgorde).",
      });
      break;
    }
    case "3": {
      const has01 = /\b01\s+/i.test(code);
      const has05 = /\b05\s+/i.test(code);
      add({
        id: "l3_has01",
        label: "Bevat level 01.",
        ok: has01,
        expected: /\b01\s+/i,
        anchor: /\bWORKING-STORAGE\b/i,
        message: "Voeg een `01` record toe.",
      });
      add({
        id: "l3_has05_under01",
        label: "Bevat minstens één 05 onder een record.",
        ok: has01 && has05 && /\b01\b[\s\S]*\b05\b/i.test(code),
        expected: /\b01\b[\s\S]*\b05\b/i,
        anchor: /\b01\s+/i,
        message: "Voeg minstens één `05` veld toe onder je `01` record.",
      });
      add({
        id: "l3_optional_77",
        label: "Optie: standalone 77-niveau (mag ook via 01/05).",
        ok: /\b77\s+/i.test(code) || (has01 && has05),
        anchor: /\b77\s+/i,
        message: "Optioneel: voeg een `77` element toe (of houd het bij 01/05).",
      });
      break;
    }
    case "4": {
      add({
        id: "l4_if",
        label: "Bevat IF.",
        ok: /\bIF\b/i.test(code),
        expected: /\bIF\b/i,
        anchor: /\bPROCEDURE\s+DIVISION\b/i,
        message: "Voeg een `IF` toe.",
      });
      add({
        id: "l4_end_if",
        label: "Bevat END-IF.",
        ok: /\bEND-IF\b/i.test(code),
        expected: /\bEND-IF\b/i,
        anchor: /\bIF\b/i,
        message: "Sluit je conditie af met `END-IF`.",
      });
      add({
        id: "l4_else",
        label: "Bevat minstens één ELSE.",
        ok: /\bELSE\b/i.test(code),
        expected: /\bELSE\b/i,
        anchor: /\bIF\b/i,
        message: "Voeg een `ELSE` tak toe.",
      });
      break;
    }
    case "5": {
      add({
        id: "l5_perform_varying",
        label: "Bevat PERFORM VARYING.",
        ok: /\bPERFORM\s+VARYING\b/i.test(code),
        expected: /\bPERFORM\s+VARYING\b/i,
        anchor: /\bPROCEDURE\s+DIVISION\b/i,
        message: "Gebruik `PERFORM VARYING` voor je lus.",
      });
      add({
        id: "l5_until",
        label: "Bevat UNTIL.",
        ok: /\bUNTIL\b/i.test(code),
        expected: /\bUNTIL\b/i,
        anchor: /\bPERFORM\s+VARYING\b/i,
        message: "Gebruik `UNTIL` als stop-conditie.",
      });
      break;
    }
    case "6": {
      add({
        id: "l6_para_def",
        label: "Definieer een paragraafnaam (kolom 8+) zoals VERWERK.",
        ok: (() => {
          const afterProc = code.split(/PROCEDURE\s+DIVISION/i)[1] ?? "";
          return /^\s*[A-Z][A-Z0-9-]*\s*\.\s*$/m.test(afterProc);
        })(),
        expected: /^\s*[A-Z][A-Z0-9-]*\s*\.\s*$/m,
        anchor: /\bPROCEDURE\s+DIVISION\b/i,
        message: "Definieer een paragraaflabel op eigen regel, eindigend met een punt (bijv. `VERWERK.`).",
      });
      add({
        id: "l6_perform_para",
        label: "Roep die aan met PERFORM (niet alleen PERFORM VARYING).",
        ok: /\bPERFORM\s+(?!VARYING\b)[A-Za-z0-9-]+/i.test(code),
        expected: /\bPERFORM\s+(?!VARYING\b)[A-Za-z0-9-]+/i,
        anchor: /\bPROCEDURE\s+DIVISION\b/i,
        message: "Roep je paragraaf aan met `PERFORM <NAAM>`.",
      });
      break;
    }
    case "7": {
      add({
        id: "l7_file_status",
        label: "Bevat FILE STATUS of de letters FS (in context FILE-CONTROL of record).",
        ok: /\bFILE\s+STATUS\b/i.test(u),
        expected: /\bFILE\s+STATUS\b/i,
        anchor: /\bFILE-CONTROL\b/i,
        message: "Gebruik `FILE STATUS` (bijv. `FILE STATUS IS WS-STATUS.`).",
      });
      add({
        id: "l7_35",
        label: "Bevat de waarde 35 als literal of in een vergelijking.",
        ok: /["']35["']/.test(code),
        expected: /["']35["']/,
        anchor: /\bWS-STATUS\b/i,
        message: "Vergelijk met `'35'` of `\"35\"` (file not found).",
      });
      break;
    }
    default: {
      add({
        id: "unknown",
        label: "Onbekend level.",
        ok: false,
        message: "Onbekend level.",
      });
    }
  }

  const errors = checks.filter((c) => !c.ok).map((c) => c.message ?? c.label);
  return { ok: errors.length === 0, errors, checks };
}

/** Ruwe proxy voor “syntax”-telling in metrics (aantal gevonden issues). */
export function countSyntaxSignals(code: string): number {
  let n = 0;
  if (/\.\s*\.{2,}/.test(code)) n++;
  if (/\*\)\s*\)/.test(code)) n++;
  if (/^\s*[^*\n]\S+\s+DIVISION\s*$/im.test(code) === false && /DIVISION/i.test(code)) n++;
  return n;
}
