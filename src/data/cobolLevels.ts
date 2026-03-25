export const COBOL_LEVEL_IDS = ["1", "2", "3", "4", "5", "6", "7"] as const;
export type CobolLevelId = (typeof COBOL_LEVEL_IDS)[number];

/** Matches seed ids in `badge_definitions` */
export const LEVEL_TO_BADGE: Record<string, string> = {
  "1": "four_divisions",
  "2": "picture_clauses",
  "3": "data_hierarchy",
  "4": "conditional_logic",
  "5": "iterations",
  "6": "paragraphs",
  "7": "error_handling",
};

export const PERFECT_RUN_BADGE = "perfect_streak";

export const POINTS_PER_LEVEL = 100;
export const FIRST_TRY_BONUS = 25;

export interface CobolLevelDefinition {
  id: CobolLevelId;
  title: string;
  summary: string;
  pythonHint: string;
  objectives: string[];
  starterCode: string;
}

export const COBOL_LEVELS: CobolLevelDefinition[] = [
  {
    id: "1",
    title: "De vier divisions",
    summary:
      "Bouw de minimale skeletstructuur van een COBOL-programma: Identification, Environment, Data en Procedure.",
    pythonHint:
      "In Python is één bestand vaak genoeg; in COBOL verdeel je verplichte blokken over division-headers — vergelijkbaar met het strikt ordenen van imports, config en main().",
    objectives: [
      "Bevat IDENTIFICATION DIVISION.",
      "Bevat ENVIRONMENT DIVISION.",
      "Bevat DATA DIVISION.",
      "Bevat PROCEDURE DIVISION.",
    ],
    starterCode: `       IDENTIFICATION DIVISION.
       PROGRAM-ID. HELLO.
       ENVIRONMENT DIVISION.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       PROCEDURE DIVISION.
           DISPLAY "OK".
           STOP RUN.
`,
  },
  {
    id: "2",
    title: "PICTURE-clauses",
    summary: "Definieer velden met PIC 9 (numeriek), PIC X (alfanumeriek) en PIC V (impliciete decimaal).",
    pythonHint:
      "Waar Python types dynamisch zijn, legt PIC het opslagformaat vast — denk aan int vs str, maar op byte-niveau.",
    objectives: [
      "Minstens één PIC of PICTURE met 9.",
      "Minstens één met X.",
      "Minstens één die V bevat (bijv. 99V99).",
    ],
    starterCode: `       IDENTIFICATION DIVISION.
       PROGRAM-ID. PICDEMO.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  VELDEN.
           05  GETAL       PIC 9(4).
           05  NAAM        PIC X(20).
           05  PRIJS       PIC 99V99.
       PROCEDURE DIVISION.
           STOP RUN.
`,
  },
  {
    id: "3",
    title: "Data-hiërarchie",
    summary: "Gebruik levelnummers 01, 05 en/of 77 voor geneste records.",
    pythonHint:
      "Een 01-groep met 05-kinderen is vergelijkbaar met een dict of dataclass met geneste velden — de nummers vervangen inspringing als structuurbeschrijving.",
    objectives: [
      "Bevat level 01.",
      "Bevat minstens één 05 onder een record.",
      "Optie: standalone 77-niveau (mag ook via 01/05).",
    ],
    starterCode: `       IDENTIFICATION DIVISION.
       PROGRAM-ID. HIERARCHY.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  BESTELLING.
           05  ORDER-ID    PIC 9(5).
           05  KLANT-NAAM  PIC X(30).
       77  TOTAAL        PIC 9(5)V99.
       PROCEDURE DIVISION.
           STOP RUN.
`,
  },
  {
    id: "4",
    title: "Conditionele logica",
    summary: "Gebruik IF / END-IF voor duidelijke scope (geen vergeten afsluiting).",
    pythonHint:
      "Python gebruikt inspringing; COBOL gebruikt expliciete END-IF — vergelijkbaar met het vermijden van else-drift in geneste ifs.",
    objectives: ["Bevat IF.", "Bevat END-IF.", "Bevat minstens één ELSE."],
    starterCode: `       IDENTIFICATION DIVISION.
       PROGRAM-ID. BRANCH.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  FLAG PIC X VALUE "N".
       PROCEDURE DIVISION.
           IF FLAG = "Y"
              DISPLAY "JA"
           ELSE
              DISPLAY "NEE"
           END-IF
           STOP RUN.
`,
  },
  {
    id: "5",
    title: "Iteraties",
    summary: "Vertaal loop-denken naar PERFORM VARYING ... UNTIL.",
    pythonHint:
      "Een `for i in range` of `while`-lus wordt vaak PERFORM VARYING ... FROM ... BY ... UNTIL conditie.",
    objectives: ["Bevat PERFORM VARYING.", "Bevat UNTIL."],
    starterCode: `       IDENTIFICATION DIVISION.
       PROGRAM-ID. LOOPS.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  I PIC 9 VALUE 1.
       PROCEDURE DIVISION.
           PERFORM VARYING I FROM 1 BY 1 UNTIL I > 3
              DISPLAY I
           END-PERFORM
           STOP RUN.
`,
  },
  {
    id: "6",
    title: "Paragrafen",
    summary: "Structureer logica in paragrafen en roep ze aan met PERFORM naam.",
    pythonHint:
      "Een paragraaf is als een functie zonder parameters; PERFORM is de aanroep.",
    objectives: [
      "Definieer een paragraafnaam (kolom 8+) zoals VERWERK.",
      "Roep die aan met PERFORM (niet alleen PERFORM VARYING).",
    ],
    starterCode: `       IDENTIFICATION DIVISION.
       PROGRAM-ID. PARAS.
       PROCEDURE DIVISION.
           PERFORM VERWERK
           STOP RUN.
       VERWERK.
           DISPLAY "DONE".
`,
  },
  {
    id: "7",
    title: "Foutafhandeling (FILE STATUS)",
    summary: "Verwerk file status — typisch status 35 (file not found).",
    pythonHint:
      "Zoals het vangen van FileNotFoundError: test FILE STATUS of specifieke waarden zoals '35'.",
    objectives: [
      "Bevat FILE STATUS of de letters FS (in context FILE-CONTROL of record).",
      "Bevat de waarde 35 als literal of in een vergelijking.",
    ],
    starterCode: `       IDENTIFICATION DIVISION.
       PROGRAM-ID. FILECHK.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT INVOER ASSIGN TO "data.dat"
               FILE STATUS IS WS-STATUS.
       DATA DIVISION.
       FILE SECTION.
       FD  INVOER.
       01  INVOER-REC PIC X(80).
       WORKING-STORAGE SECTION.
       01  WS-STATUS PIC XX.
       PROCEDURE DIVISION.
           OPEN INPUT INVOER
           IF WS-STATUS = "35"
               DISPLAY "FILE NOT FOUND"
           END-IF
           CLOSE INVOER
           STOP RUN.
`,
  },
];

export function getLevel(id: string): CobolLevelDefinition | undefined {
  return COBOL_LEVELS.find((l) => l.id === id);
}
