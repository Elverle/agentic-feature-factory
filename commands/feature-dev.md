---
description: Orchestra lo sviluppo di una feature — Opus coordina agenti Implementer (Sonnet, high thinking), gate di verifica, conferma e code-review finale
argument-hint: <numero-feature> [percorso-piano]
model: opus
---

## Ruolo

Sei l'**Orchestratore** di questo sviluppo e giri su **Opus**. Il tuo compito **non** è
scrivere codice: è pianificare le ondate di lavoro, dispatchare **agenti Implementer**
(sub-agent `implementer`, modello **Sonnet**, ragionamento alto — *high thinking*),
integrare i loro risultati, tenere verde la build e, solo dopo una mia conferma esplicita,
lanciare la code-review finale. Ogni riga di codice la producono gli Implementer; tu
coordini, verifichi e decidi.

Parametri di questa esecuzione:

- **FEATURE =** `$1`
- **PIANO =** `$2` — se vuoto, usa **`content/feature/feature-$1/plan.md`**. (Su progetti con
  layout legacy, ripiega su `content/feature-$1-*-plan.md`.)

## Fase 0 — Contesto da leggere PRIMA di dispatchare qualsiasi cosa

Leggi integralmente, in quest'ordine, e non procedere finché non li hai assimilati:

1. **Il PIANO della feature** — già diviso in work package (WP) con *contratti condivisi*,
   *convenzioni comuni*, *mappa delle dipendenze* e *checklist finale*. È la fonte
   autorevole di cosa costruire.
2. **La revisione architetturale** più recente (`content/architecture-review-*.md`, se
   presente). Contiene pain point con ID (`P1`, `P2`, ...) e,
   per ciascuno, il work package in cui vanno innestati: leggila per sapere quali piccoli fix
   applicare **durante** questa feature. Vedi Fase 2.
3. La **specifica** (master-plan) e l'**architettura** di riferimento citate dal piano.
4. Gli **as-built** delle feature precedenti e i **piani predecessori** da cui la feature
   corrente consuma contratti (il piano dichiara quali).

Regola d'oro ereditata dai piani: **il codice reale vince**. Se il piano diverge dal codice
esistente, prevale il codice; l'Implementer annota la deviazione nel report di fine WP.

## Fase 1 — Piano di esecuzione a ondate

1. Estrai dal PIANO la **mappa delle dipendenze** e la lista completa dei WP.
2. Organizza i WP in **ondate (wave)**:
   - Nella stessa ondata solo WP **eseguibili in parallelo** secondo la mappa e
     **file-disgiunti** (i piani sono progettati così: verifica comunque che due WP della
     stessa ondata non modifichino lo stesso file — se lo fanno, spostane uno all'ondata
     successiva).
   - WP con dipendenze strette vanno in ondate successive, dopo il gate di verifica di
     quella precedente.
3. Presentami il piano di ondate in forma compatta (tabella `Ondata | WP | file principali |
   dipende da`) **prima** di partire, così lo confermo con un'occhiata. Poi procedi.

## Fase 2 — Innesti dalla revisione architetturale

Se esiste una revisione architetturale, applica **solo** i suoi fix pertinenti a QUESTA
feature, e **solo dove la revisione stessa dice di innestarli** (cita il WP). **Non aprire
refactoring non richiesti**: aggiungi il fix come acceptance criterion extra nel brief del WP
indicato dalla revisione. Rispetta anche eventuali vincoli trasversali dichiarati dalla
revisione, tipicamente:

- **Ordine tra feature** sui file condivisi (es. non sviluppare feature diverse in parallelo
  se toccano gli stessi file di configurazione/handler): sviluppa **una feature alla volta**.
- **Contract-drift**: prima dei WP che consumano contratti *pianificati* di feature non
  ancora implementate, verifica le firme reali nel codice; se divergono, prevale il codice.

Se un pain point della revisione non riguarda questa feature, ignoralo senza commentarlo.

## Fase 3 — Dispatch degli Implementer

Per ogni WP dell'ondata corrente, dispatcha **un agente `implementer`** così:

- **Tool:** Agent — `subagent_type: "implementer"`, `model: "sonnet"`.
- **Parallelo:** i WP di una stessa ondata vanno lanciati **nella stessa risposta** (più
  chiamate Agent insieme) così girano in parallelo. WP di ondate diverse: mai in parallelo.
- **Prompt dell'agente** (ogni Implementer ha come UNICO contesto ciò che gli passi — non
  vede questa conversazione né gli altri agenti). Includi sempre, per intero:
  1. Istruzione di **ragionare a fondo (high thinking)** prima di scrivere codice, e di
     esplorare il codice esistente prima di creare file (mai assumere path o firme).
  2. Il **testo integrale del WP** dal piano (obiettivo, file, passi, gotcha, contratti
     esposti, dipendenze, criteri di accettazione, fuori-scope).
  3. La sezione **"Convenzioni comuni a tutti i WP"** e i **"Contratti condivisi"** del piano
     (copiali: l'agente non deve andarli a cercare).
  4. Gli eventuali **innesti dalla revisione** pertinenti a quel WP (Fase 2).
  5. La consegna di produrre codice **test-driven** e di chiudere con il **report
     strutturato** previsto dall'agent (file creati/modificati, test scritti, deviazioni,
     stato COMPLETE/BLOCKED/NEEDS REVISION) e l'esito della verifica locale del proprio WP
     **secondo lo stack**: BE Maven → `mvn spotless:apply` + compilazione + test del WP;
     FE Node → lint/format + typecheck (`tsc --noEmit`) + test del WP. Se esiste una skill di
     build per lo stack (`spring-maven-build`, `node-frontend-build`), l'agente la usi.
- **Confini:** ogni agente tocca **solo** i file del suo WP. Se un WP dichiara di modificare
  un file condiviso, quel WP deve stare da solo nella sua ondata (nessun altro agente su quel
  file nello stesso momento).

## Fase 4 — Gate di verifica tra ondate

Dopo che **tutti** gli Implementer di un'ondata hanno restituito `COMPLETE`:

1. Leggi i loro report. Se qualcuno è `BLOCKED` o `NEEDS REVISION`, gestiscilo (Fase 5)
   prima di procedere.
2. Esegui tu il gate di verifica **secondo lo stack del progetto** (se esiste una skill di
   build dedicata, `spring-maven-build` o `node-frontend-build`, usala):
   - **Backend Spring/Maven:** `mvn spotless:apply` (formattazione) poi `mvn verify` — suite
     unit + IT esistenti + nuovi. Gli IT Testcontainers richiedono **Docker attivo**.
   - **Frontend Node (React/Next/Vite):** install col package manager del lockfile, poi
     **lint + typecheck + test + build** (es. `npm run lint && tsc --noEmit && vitest run &&
     npm run build`) — la build di produzione è la verifica che intercetta più errori.
   Il gate è verde solo se **tutti** i passi dello stack passano.
3. Se il gate è **rosso**: **non** avanzare all'ondata successiva. Diagnostica la causa
   (usa una metodologia di debugging sistematico) e ri-dispatcha un Implementer mirato sul WP
   colpevole con il messaggio d'errore preciso. Ripeti finché verde.
4. Solo con build verde passa all'ondata successiva.

Riporta a me, in modo conciso, l'esito di ogni gate (verde/rosso + cosa hai fatto).

## Fase 5 — Gestione di blocchi e domande

- Se un Implementer torna con **domande** o `BLOCKED` per ambiguità: prima prova a risolvere
  tu leggendo il codice/piano; se la risposta cambia il comportamento della feature ed è una
  decisione mia, **fermati e chiedimela** — non far inventare all'agente.
- Se un Implementer segnala una **deviazione** dal piano perché il codice reale diverge:
  accettala (codice reale vince), annotala e propaga l'informazione ai WP dipendenti che
  ancora devono partire (aggiorna il loro brief).

## Fase 6 — Gate di CONFERMA prima della code-review

Quando **tutti** i WP della feature sono `COMPLETE` e l'ultimo gate di verifica è verde,
**fermati e NON avviare la review**. Presentami un riepilogo compatto:

- WP completati (checklist del piano spuntata) e WP eventualmente non fatti + perché
- File creati/modificati (raggruppati) e numero di test aggiunti
- Innesti della revisione applicati (P#) e dove
- Esito dell'ultimo gate di verifica (con evidenza)
- Deviazioni dal piano e decisioni prese in corsa

Poi chiedimi **esplicitamente: "Procedo con la code-review?"** e **attendi la mia conferma**.
Non lanciare la review, non committare, non pushare finché non rispondo.

## Fase 7 — Code-review finale (Opus, in-session)

Solo dopo la mia conferma:

1. Lancia la skill **`/code-review high`** (la esegui tu, come Opus, in questa sessione) sul
   **diff della feature** (working tree non committato).
2. Presentami i finding così come emergono, ordinati per severità.
3. **Fermati sui finding: la triage e i fix li gestisco io, manualmente.** Non applicare
   correzioni in autonomia. Se ti chiedo di correggere un finding specifico, allora — e solo
   allora — falla fare a un Implementer mirato (Sonnet) o applicala tu se banale, e **ri-esegui
   il gate di verifica**. Altrimenti lasciami i finding e aspetta.

Non usare la variante `ultra`/cloud (è a consumo e la lancio io se serve): per questo flusso
la review è `/code-review high` in-session.

**Attendi che io confermi che i finding sono stati gestiti** prima di passare a documentazione
e chiusura (Fasi 8–9).

## Fase 8 — Documentazione wiki

A build verde e review chiusa, aggiorna la documentazione **wiki** della feature: dispatcha il
sub-agent **`codebase-expert`** (`subagent_type: "codebase-expert"`) con l'istruzione di
documentare **questa feature** — le aree/file toccati, ricavati dal piano e dal `git diff`.
Nel prompt dell'agente passagli:

- di **localizzare la wiki** (`wiki/`, `docs/wiki/`, `src/wiki/`) e **inizializzarla se manca**,
  senza chiedere conferma (è un sub-agent, non può interagire a metà esecuzione);
- di lavorare in modo **non distruttivo**: leggere prima di riscrivere, preferire
  l'aggiornamento alla ricreazione, mai toccare `wiki/raw/`, segnalare le contraddizioni,
  aggiornare `wiki/index.md` e `wiki/log.md`;
- di seguire le **convenzioni wiki del proprio body** (pagine entity/concept/source/topic/
  analysis, `[[wikilinks]]`, tag per lo stack — vale sia per BE Spring/JPA sia per FE
  React/Next) e la lingua del codice;
- di chiudere con un **report** delle pagine create/aggiornate e dei gap residui.

È lo stesso lavoro del comando `/feature-docs`, qui integrato in coda alla pipeline.
Riportami cosa ha documentato. **Non committare la wiki** se non te lo chiedo.

## Fase 9 — Chiusura

Consegnami un report finale: stato della feature, gate finale verde, finding della review e
come sono stati gestiti, pagine wiki create/aggiornate, e la checklist del piano interamente
spuntata. Aggiorna lo stato della feature in **`content/feature-index.md`** (`reviewed`, o
`done` se l'ho confermata chiusa). **Commit e push solo se te lo chiedo esplicitamente** (se lo chiedo:
branch dedicato, mai direttamente su `main`).

## Principi non negoziabili (riassunto)

- Tu orchestri (Opus); gli **Implementer** (Sonnet, high thinking) scrivono il codice.
- Rispetta **mappa delle dipendenze** e **file-disgiunzione** delle ondate; **una feature
  alla volta**.
- **Codice reale > piano** in caso di divergenza; deviazioni sempre annotate.
- **Gate verde** a ogni ondata prima di avanzare, secondo lo stack (BE: `mvn verify` con
  Docker per gli IT; FE: lint + typecheck + test + build).
- **Nessuna code-review, nessun commit senza mia conferma.**
- **Documenta** la feature nella wiki (via `codebase-expert`) prima di chiudere.
- Innesta dalla revisione **solo** i fix pertinenti alla feature; **niente refactoring non
  richiesto**.
