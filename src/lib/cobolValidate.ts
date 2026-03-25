export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

function hasAll(haystack: string, needles: RegExp[], label: string): string[] {
  const missing: string[] = [];
  for (const re of needles) {
    if (!re.test(haystack)) missing.push(`${label}: patroon niet gevonden (${re.source})`);
  }
  return missing;
}

/**
 * Heuristische PoC-validatie — geen echte COBOL-compiler.
 */
export function validateCobolLevel(levelId: string, code: string): ValidationResult {
  const errors: string[] = [];
  const u = code.toUpperCase();

  switch (levelId) {
    case "1": {
      const need = [
        /\bIDENTIFICATION\s+DIVISION\b/i,
        /\bENVIRONMENT\s+DIVISION\b/i,
        /\bDATA\s+DIVISION\b/i,
        /\bPROCEDURE\s+DIVISION\b/i,
      ];
      errors.push(...hasAll(code, need, "Divisions"));
      break;
    }
    case "2": {
      if (!/\b(PIC|PICTURE)\b/i.test(code)) errors.push("Gebruik PIC of PICTURE.");
      if (!/\bPIC\s+[^.\n]*9/i.test(code) && !/\bPICTURE\s+[^.\n]*9/i.test(code))
        errors.push("Gebruik minstens één numerieke PIC met 9.");
      if (!/\bPIC\s+[^.\n]*X/i.test(code) && !/\bPICTURE\s+[^.\n]*X/i.test(code))
        errors.push("Gebruik minstens één alfanumerieke PIC met X.");
      if (!/\bPIC\s+[^.\n]*V/i.test(code) && !/\bPICTURE\s+[^.\n]*V/i.test(code))
        errors.push("Gebruik V in een PIC (bijv. 99V99).");
      break;
    }
    case "3": {
      const has01 = /\b01\s+/i.test(code);
      const has05 = /\b05\s+/i.test(code);
      const has77 = /\b77\s+/i.test(code);
      if (!has01 && !has77) errors.push("Voeg een 01-groep of een 77-element toe.");
      if (has05 && !has01) errors.push("05 hoort onder een 01-groep.");
      if (has05 && has01 && !/\b01\b[\s\S]*\b05\b/i.test(code))
        errors.push("Zorg dat 05 na 01 in de data-hiërarchie staat.");
      break;
    }
    case "4": {
      if (!/\bIF\b/i.test(code)) errors.push("Voeg IF toe.");
      if (!/\bEND-IF\b/i.test(code)) errors.push("Sluit af met END-IF.");
      if (!/\bELSE\b/i.test(code)) errors.push("Voeg ELSE toe.");
      break;
    }
    case "5": {
      if (!/\bPERFORM\s+VARYING\b/i.test(code)) errors.push("Gebruik PERFORM VARYING.");
      if (!/\bUNTIL\b/i.test(code)) errors.push("Gebruik UNTIL in de lus.");
      break;
    }
    case "6": {
      if (!/\bPERFORM\s+(?!VARYING\b)[A-Za-z0-9-]+/i.test(code))
        errors.push("Gebruik PERFORM met een paragraafnaam (niet alleen VARYING).");
      const afterProc = code.split(/PROCEDURE\s+DIVISION/i)[1] ?? "";
      if (!/^\s*[A-Z][A-Z0-9-]*\s*\.\s*$/m.test(afterProc))
        errors.push("Definieer een paragraaf (naam gevolgd door een punt op eigen regel).");
      break;
    }
    case "7": {
      if (!/\bFILE\s+STATUS\b/i.test(u)) errors.push("Gebruik FILE STATUS.");
      if (!/=\s*["']35["']/.test(code)) errors.push("Vergelijk de status met '35' (file not found).");
      break;
    }
    default:
      errors.push("Onbekend level.");
  }

  return { ok: errors.length === 0, errors };
}

/** Ruwe proxy voor “syntax”-telling in metrics (aantal gevonden issues). */
export function countSyntaxSignals(code: string): number {
  let n = 0;
  if (/\.\s*\.{2,}/.test(code)) n++;
  if (/\*\)\s*\)/.test(code)) n++;
  if (/^\s*[^*\n]\S+\s+DIVISION\s*$/im.test(code) === false && /DIVISION/i.test(code)) n++;
  return n;
}
