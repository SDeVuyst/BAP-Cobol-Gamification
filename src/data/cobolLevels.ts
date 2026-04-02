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

export interface CobolDocLink {
  title: string;
  url: string;
}

export interface CobolExplainExample {
  title: string;
  code: string;
}

export interface CobolLevelExplain {
  text: string;
  examples: CobolExplainExample[];
}

export interface CobolLevelDefinition {
  id: CobolLevelId;
  title: string;
  summary: string;
  pythonHint: string;
  /** Python reference snippet for this translation level. */
  pythonCode: string;
  docs?: CobolDocLink[];
  cobolExplain?: CobolLevelExplain;
  objectives: string[];
  starterCode: string;
}

export const COBOL_LEVELS: CobolLevelDefinition[] = [
  {
    id: "1",
    title: "De vier divisions",
    summary:
      "Bouw de boilerplate van een COBOL-programma: Identification, Environment, Data en Procedure.",
    pythonHint:
      "In Python is één bestand vaak genoeg; in COBOL verdeel je verplichte blokken over division-headers - vergelijkbaar met het strikt ordenen van imports, config en main().",
    pythonCode: `def main():
    print("OK")

if __name__ == "__main__":
    main()
`,
    docs: [
      { title: "COBOL program structure 6.5 docs (Language reference)", url: "https://www.ibm.com/docs/en/cobol-zos/6.5.0?topic=structure-cobol-program" },
    ],
    cobolExplain: {
      text: "COBOL-programma’s zijn opgedeeld in vaste blokken (“divisions”). Je zet ze in volgorde: IDENTIFICATION → ENVIRONMENT → DATA → PROCEDURE.",
      examples: [
        {
          title: "Minimal skeleton (4 divisions)",
          code: `       IDENTIFICATION DIVISION.
       PROGRAM-ID. HELLO.

       ENVIRONMENT DIVISION.

       DATA DIVISION.
       WORKING-STORAGE SECTION.

       PROCEDURE DIVISION.
           DISPLAY "OK".
           STOP RUN.`,
        },
      ],
    },
    objectives: [
      "Bevat IDENTIFICATION DIVISION.",
      "Bevat ENVIRONMENT DIVISION.",
      "Bevat DATA DIVISION.",
      "Bevat PROCEDURE DIVISION.",
      "Heeft een `STOP RUN.` aan het eind van je run.",
    ],
    starterCode: `       IDENTIFICATION DIVISION.
       PROGRAM-ID. HELLO.
       * TODO: voeg de nodige divisions toe

       PROCEDURE DIVISION.
           DISPLAY "OK".
           * TODO: stop het programma
`,
  },
  {
    id: "2",
    title: "PICTURE-clauses",
    summary: "Definieer velden (variabelen) met PICTURE (PIC) clauses.",
    pythonHint:
      "Waar Python types dynamisch zijn, legt PIC het opslagformaat vast - denk aan int vs str, maar op byte-niveau.",
    pythonCode: `from decimal import Decimal

getal: int = 0
naam: str = ""

# In COBOL is PIC 99V99 "implied decimal" (99V99 -> 2 decimal places).
prijs: Decimal = Decimal("0.00")

def main():
    print(getal)
    print(naam)
    print(prijs)

if __name__ == "__main__":
    main()
`,
    docs: [{ title: "PICTURE clause 6.5 docs (Language reference)", url: "https://www.ibm.com/docs/en/cobol-zos/6.5.0?topic=entry-picture-clause" }],
    cobolExplain: {
      text: "PIC (PICTURE) bepaalt hoe een veld wordt opgeslagen/afgedrukt. `9` = numeriek, `X` = tekst, `V` = impliciete decimaal.",
      examples: [
        {
          title: "PIC examples",
          code: `       01  VELDEN.
           05  GETAL   PIC 9(5).
           05  NAAM    PIC X(20).
           05  PRIJS   PIC 9(3)V99.`,
        },
      ],
    },
    objectives: [
      "Minstens één PIC of PICTURE met 9.",
      "Minstens één met X.",
      "Minstens één die V bevat (bijv. 99V99).",
      "Laat ten minste 1 veld zien binnen een 01-structuur (05 onder 01).",
    ],
    starterCode: `       IDENTIFICATION DIVISION.
       PROGRAM-ID. PICDEMO.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  VELDEN.
           05  GETAL       _____.    * TODO: numeriek
           05  NAAM        _____.    * TODO: alfanumeriek
           05  PRIJS       _____.    * TODO: bevat decimaal
       PROCEDURE DIVISION.
           * TODO: (optioneel) DISPLAY velden
           STOP RUN.
`,
  },
  {
    id: "3",
    title: "Data-hiërarchie",
    summary: "Gebruik levelnummers 01, 05 en/of 77 voor geneste records.",
    pythonHint:
      "Een 01-groep met 05-kinderen is vergelijkbaar met een dict of dataclass met geneste velden.",
    pythonCode: `from dataclasses import dataclass
from decimal import Decimal

@dataclass
class Bestelling:
    order_id: int   # 05-veld onder een 01-record
    klant_naam: str # 05-veld onder een 01-record

# COBOL's 01 is je record; 77 is "standalone" (optioneel bij deze level).
record: Bestelling = Bestelling(order_id=0, klant_naam="")
totaal: Decimal = Decimal("0.00")  # optioneel "77" element

def main():
    print(record.order_id)
    print(record.klant_naam)
    print(totaal)

if __name__ == "__main__":
    main()
`,
    docs: [{ title: "Levels of data in a record description entry 6.5 docs (Language reference)", url: "https://www.ibm.com/docs/en/cobol-zos/6.5.0?topic=relationships-levels-data-in-record-description-entry" }],
    cobolExplain: {
      text: "Level-nummers vormen je record-structuur: `01` is een groep/record, `05` zijn velden daaronder. `77` is een los, standalone veld.",
      examples: [
        {
          title: "01 group with 05 children",
          code: `       01  BESTELLING.
           05  ORDER-ID    PIC 9(5).
           05  KLANT-NAAM  PIC X(30).`,
        },
        {
          title: "77 standalone",
          code: `       77  TOTAAL        PIC 9(5)V99.`,
        },
      ],
    },
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
           * TODO: voeg minstens één 05-veld toe onder BESTELLING
       * TODO (optioneel): voeg een 77-element toe
    
       PROCEDURE DIVISION.
           STOP RUN.
`,
  },
  {
    id: "4",
    title: "Conditionele logica",
    summary: "Gebruik IF / END-IF voor conditionele logica.",
    pythonHint:
      "Python gebruikt inspringing; COBOL gebruikt expliciete END-IF - vergelijkbaar met het vermijden van else-drift in geneste ifs.",
    pythonCode: `flag = "N"

if flag == "Y":
    print("JA")
else:
    print("NEE")
`,
    docs: [{ title: "IF statement 6.5 docs (Language reference)", url: "https://www.ibm.com/docs/en/cobol-zos/6.5.0?topic=statements-if-statement" }],
    cobolExplain: {
      text: "In COBOL sluit je conditie-blokken expliciet af. Gebruik `END-IF` zodat scope altijd duidelijk is (zoals Python-indentation, maar dan met keywords).",
      examples: [
        {
          title: "IF / ELSE / END-IF",
          code: `       IF FLAG = "Y"
           DISPLAY "JA"
       ELSE
           DISPLAY "NEE"
       END-IF`,
        },
      ],
    },
    objectives: ["Bevat IF.", "Bevat END-IF.", "Bevat minstens één ELSE."],
    starterCode: `       IDENTIFICATION DIVISION.
       PROGRAM-ID. BRANCH.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  FLAG PIC X VALUE "N".
       PROCEDURE DIVISION.
           * TODO: voeg IF, ELSE, END-IF toe
           STOP RUN.
`,
  },
  {
    id: "5",
    title: "Iteraties",
    summary: "Leer loops met PERFORM VARYING ... UNTIL.",
    pythonHint:
      "Een `for i in range` of `while`-lus wordt vaak PERFORM VARYING ... FROM ... BY ... UNTIL conditie.",
    pythonCode: `i = 1
while i <= 3:
    print(i)
    i += 1
`,
    docs: [{ title: "PERFORM with VARYING phrase 6.5 docs (Language reference)", url: "https://www.ibm.com/docs/en/cobol-zos/6.5.0?topic=statement-perform-varying-phrase" }],
    cobolExplain: {
      text: "`PERFORM VARYING` is je loop: je kiest een control variable en stopt met `UNTIL` (denk: while/for). Sluit af met `END-PERFORM`.",
      examples: [
        {
          title: "PERFORM VARYING ... UNTIL",
          code: `       PERFORM VARYING I FROM 1 BY 1
           UNTIL I > 3
           DISPLAY I
       END-PERFORM`,
        },
      ],
    },
    objectives: ["Bevat PERFORM VARYING.", "Bevat UNTIL."],
    starterCode: `       IDENTIFICATION DIVISION.
       PROGRAM-ID. LOOPS.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  I PIC 9 VALUE 1.
       PROCEDURE DIVISION.
           PERFORM VARYING I FROM 1 BY 1
              DISPLAY I
           * TODO: voeg UNTIL toe
           * TODO: sluit af
           STOP RUN.
`,
  },
  {
    id: "6",
    title: "Paragrafen",
    summary: "Structureer logica in paragrafen en roep ze aan met PERFORM.",
    pythonHint:
      "Een paragraaf is als een functie zonder parameters; PERFORM is de aanroep.",
    pythonCode: `# Python-idee: paragraaf = functie (zonder parameters)

def verwerk():
    print("DONE")

def main():
    verwerk()

if __name__ == "__main__":
    main()
`,
    docs: [{ title: "Repeating program actions (Language reference)", url: "https://www.ibm.com/docs/en/cobol-zos/6.5.0?topic=actions-repeating-program" }],
    cobolExplain: {
      text: "Paragrafen zijn named blocks in de PROCEDURE DIVISION. Je roept ze aan met `PERFORM <NAAM>`; het label eindigt met een punt.",
      examples: [
        {
          title: "PERFORM a paragraph",
          code: `       PERFORM VERWERK
       STOP RUN.

       VERWERK.
           DISPLAY "DONE".`,
        },
      ],
    },
    objectives: [
      "Definieer een paragraafnaam (kolom 8+) zoals VERWERK.",
      "Roep die aan met PERFORM (niet alleen PERFORM VARYING).",
    ],
    starterCode: `       IDENTIFICATION DIVISION.
       PROGRAM-ID. PARAS.
       PROCEDURE DIVISION.
           * TODO: roep een paragraaf aan
           STOP RUN.
       * TODO: definieer de paragraaf
`,
  },
  {
    id: "7",
    title: "Foutafhandeling (FILE STATUS)",
    summary: "Leer werken met FILE STATUS en errors.",
    pythonHint:
      "Zoals het vangen van FileNotFoundError: test FILE STATUS of specifieke waarden zoals '35'.",
    pythonCode: `try:
    with open("data.dat", "r") as f:
        # ... doe iets met de file ...
        pass
except FileNotFoundError:
    print("FILE NOT FOUND")
`,
    docs: [{ title: "Checking for input or output errors (Language reference)", url: "https://www.ibm.com/docs/en/cobol-zos/6.5.0?topic=files-checking-input-output-errors" }],
    cobolExplain: {
      text: "Met `FILE STATUS` krijg je een 2-char statuscode na OPEN/READ. Een veel voorkomende leer-case is `\"35\"` = file not found.",
      examples: [
        {
          title: "SELECT ... FILE STATUS ...",
          code: `       SELECT INVOER ASSIGN TO "data.dat"
           FILE STATUS IS WS-STATUS.`,
        },
        {
          title: "Check status 35",
          code: `       OPEN INPUT INVOER
       IF WS-STATUS = "35"
           DISPLAY "FILE NOT FOUND"
       END-IF`,
        },
      ],
    },
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
           * TODO: check file status 35 en display "FILE NOT FOUND"
           CLOSE INVOER
           STOP RUN.
`,
  },
];

export function getLevel(id: string): CobolLevelDefinition | undefined {
  return COBOL_LEVELS.find((l) => l.id === id);
}
