# agentic-feature-factory

Plugin Claude Code che impacchetta la pipeline di sviluppo feature guidata da agenti:
**pianifica → rivedi → implementa (orchestrato) → code-review → documenta**. Funziona sia su
**backend** (Spring Boot + Maven) sia su **frontend** (React / Next / Vite): i comandi sono
generalizzati e adattano i gate di verifica allo stack del progetto.

## Esempio: un ciclo completo

Sviluppiamo la **feature 5** in un repo appena clonato (nessuna `content/` ancora).

### 1. Pianificazione — `/feature-plan 5 Export PDF del portfolio`

Il comando **prima analizza** codebase + spec, poi ti fa solo le domande che cambiano il piano:

```
[AskUserQuestion] Come generiamo il PDF?
  ① Libreria server-side (consigliato)  ② Headless browser  ③ Servizio esterno
[AskUserQuestion] Lo scope include il download multiplo (zip)?
  ① No (consigliato)  ② Sì
```

Rispondi, e solo dopo scrive il piano. Su disco compare:

```
content/
├── feature-index.md          # | 5 | Export PDF del portfolio | planned | 2026-07-07 | plan |
└── feature/
    └── feature-5/
        ├── requirements.md    # decisioni prese (PDF: libreria server-side; niente zip; …)
        └── plan.md            # work-package WP5.1…WP5.n con contratti + mappa dipendenze
```

### 2. Revisione — `/arch-review 5`

Mette il piano della feature 5 contro la codebase e produce i pain point con ID stabile e il
WP di innesto, **dentro la cartella della feature**:

```
content/
├── feature-index.md
└── feature/
    └── feature-5/
        ├── requirements.md
        ├── plan.md
        └── architecture-review-2026-07-07.md   # P1 → dentro WP5.2 · P2 → prima di WP5.1 · …
```

### 3. Sviluppo — `/feature-dev 5`

L'orchestratore Opus, a partire da `content/feature/feature-5/plan.md` + la revisione:

1. ti mostra le **ondate** (WP paralleli/sequenziali) e parte;
2. per ogni ondata dispatcha gli **Implementer (Sonnet)**, poi il **gate** (`mvn verify` o build FE) — verde prima di avanzare;
3. a WP completati **si ferma e chiede conferma** prima della review;
4. su conferma lancia **`/code-review high`** e ti lascia i finding: **triage e fix li decidi tu**;
5. quando confermi che i finding sono gestiti, **documenta** la feature nella wiki (`codebase-expert`) e chiude, aggiornando `feature-index.md` → `done`.

## Cosa contiene

| Componente | Tipo | Cosa fa |
| --- | --- | --- |
| `/feature-plan <n>` | comando (Opus) | Analizza codebase + requisiti, **ti fa domande**, poi produce il piano a work-package; gestisce numerazione e cartelle `feature/` |
| `/arch-review` | comando (Opus) | Revisione architetturale codebase vs feature pianificate |
| `/feature-dev <n>` | comando (Opus) | Orchestra gli Implementer (Sonnet), gate di verifica, conferma, `/code-review high` e documentazione wiki |
| `/feature-docs [ambito]` | comando (Opus) | Documenta in formato wiki via `codebase-expert` (init/scan/query/lint), standalone |
| `implementer` | agente (Sonnet) | Senior engineer sub-agent, test-driven; dispatchato in parallelo da `/feature-dev` |
| `codebase-expert` | agente (Sonnet) | Analista che costruisce/mantiene la wiki tecnica del progetto |
| `spring-maven-build` | skill | Gate di build/test BE (Testcontainers → Docker; `mvn verify`; Spotless) |
| `node-frontend-build` | skill | Gate di build/test FE (rileva pnpm/yarn/npm; lint + typecheck + test + build) |
| `scan` / `fix` | skill (bundled) | Metodologie usate da `codebase-expert` per lo scan wiki e i fix diagnostici |

La code-review usa la skill **built-in** `/code-review high` (invocata dentro `/feature-dev`):
non serve un agente di review dedicato. La variante `ultra` (cloud, a consumo) resta manuale.

## Il flusso completo

```
/feature-plan 5   →   /arch-review   →   /feature-dev 5
  analizza + domande    rivede e assegna     Opus orchestra gli Implementer (Sonnet)
  → content/feature/    i fix ai WP          → gate verifica (BE mvn verify / FE build)
     feature-5/plan.md                       → CONFERMA → /code-review high (fix manuali)
                                             → documentazione wiki (codebase-expert)
```

- `/feature-plan` prima **analizza e ti fa domande** (via `AskUserQuestion`), poi scrive il
  piano: le decisioni non restano appese in fase di implementazione.
- `/arch-review` assegna ID stabili ai pain point (`P1`, `P2`, …) e indica in quale work
  package innestarli; `/feature-dev` legge quella revisione e applica i fix nel punto giusto.
- La **fase di documentazione** in coda a `/feature-dev` è la stessa cosa che fa `/feature-docs`,
  integrata nella pipeline. `/feature-docs` resta invocabile da solo quando vuoi (docs mirati,
  `lint` della wiki, o `query: <domanda>`).
- La **code-review** presenta i finding e si ferma: la triage e i fix li fai **tu, manualmente**.

## Convenzione cartelle

Tutto vive sotto **`content/`** (creata se assente), con numerazione + cartelle feature
(stile `dev-pipeline`):

```
<repo-root>/content/                    # creata se assente
├── feature-index.md                    # registro: numero, titolo, stato, link al piano
└── feature/
    └── feature-<n>/
        ├── requirements.md             # decisioni emerse dalle domande di /feature-plan
        ├── plan.md                     # piano WP (output di /feature-plan, input di /feature-dev)
        └── architecture-review-<data>.md   # revisione della feature (output di /arch-review <n>)
```

`/feature-plan` assegna il numero (dal `content/feature-index.md`), crea `content/` se manca +
la cartella della feature, e salva il piano; `/arch-review <n>` salva la revisione nella stessa
cartella; `/feature-dev <n>` legge `content/feature/feature-<n>/plan.md` (+ la revisione) e
aggiorna lo stato nell'indice a fine ciclo. Se il repo usa già un layout diverso, i comandi si
adattano a quello esistente invece di duplicarlo.

## Installazione (marketplace locale)

Da una sessione Claude Code, in qualsiasi repo (BE o FE) dove vuoi usarlo.

**Da GitHub**:

```
/plugin marketplace add Elverle/agentic-feature-factory
/plugin install agentic-feature-factory@smart-portfolio-devkit
```

**In locale** (sviluppo del plugin stesso):

```
git clone https://github.com/Elverle/agentic-feature-factory
/plugin marketplace add D:/Lele/Software/agentic-feature-factory
/plugin install agentic-feature-factory@smart-portfolio-devkit
```

Poi ricarica la sessione (`/reload-plugins`) e i comandi saranno disponibili. Per aggiornarlo
dopo modifiche: `/plugin marketplace update smart-portfolio-devkit`.

> Se `source: "./"` nel `marketplace.json` non risolve nella tua versione di Claude Code,
> in alternativa aggiungi la cartella direttamente come plugin di sviluppo via `/plugin`.

## Note di design

- **Opus orchestra, Sonnet lavora.** `/feature-dev` e `/feature-docs` girano su Opus
  (`model: opus` nel frontmatter); dispatchano `implementer` e `codebase-expert` con
  `model: sonnet` (impostato anche nel frontmatter degli agenti bundlati) e istruzione di
  *high thinking*.
- **Stack-neutral.** Il gate di verifica di `/feature-dev` si adatta: BE Spring/Maven
  (`mvn verify`, Docker per gli IT Testcontainers) oppure FE Node (lint + typecheck + test +
  build). Le due skill `spring-maven-build` / `node-frontend-build` guidano il gate corretto.
- **Una feature alla volta**, ondate file-disgiunte secondo la mappa delle dipendenze del
  piano. Gate verde tra un'ondata e l'altra.
- **Niente code-review né commit senza conferma esplicita** dell'utente.
- **Documentazione integrata.** Ogni feature chiude con un aggiornamento della wiki tecnica
  (entità, concetti, topic, analisi) via `codebase-expert`.
- **Portabilità.** I comandi non hardcodano i pain point o i percorsi di un progetto specifico:
  leggono a runtime il piano e la revisione da `content/` (creata se assente). Le skill
  `scan`/`fix` usate da `codebase-expert` sono **bundlate** nel plugin, così funziona anche su
  macchine che non hanno le skill globali.

## Personalizzazione

- Modello dell'orchestratore o degli agenti: `model:` nel frontmatter dei comandi
  (`commands/*.md`) e degli agenti (`agents/*.md`).
- Cartella di pianificazione: i comandi usano `content/` (con `feature-index.md` e
  `feature/feature-<n>/`), creandola se assente; su un layout diverso si adattano all'esistente.
- Le skill di build sono delimitate per stack: `spring-maven-build` si attiva solo su
  Spring/Maven, `node-frontend-build` solo su progetti Node — su altri stack (Gradle, Python,
  Go) aggiungi una skill analoga e `/feature-dev` la userà come gate.
