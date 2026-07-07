---
description: Documenta il codice in formato wiki tramite l'agente codebase-expert (init/scan/query/lint). Usabile su backend e frontend.
argument-hint: [numero-feature | percorso/area | "lint" | "query: <domanda>"]
model: opus
---

Sei l'orchestratore della **documentazione wiki**. Non scrivi tu le pagine: dispatchi il
sub-agent **`codebase-expert`**, che costruisce e mantiene una wiki tecnica interna al
progetto (entità, concetti, sorgenti, topic, analisi) con convenzioni proprie già embedded.

**Ambito richiesto:** `$ARGUMENTS`

## Passo 1 — Determina la modalità dall'argomento

- **vuoto** → documenta il lavoro recente: la wiki della porzione di codice modificata
  di recente (usa `git diff`/`git log` per capire cosa è cambiato) o, se il progetto non ha
  ancora una wiki, uno scan iniziale delle aree principali.
- **un numero di feature** (es. `5`) → documenta la feature: individua i file toccati da
  quella feature (dal piano `content/feature/feature-5/plan.md` e/o dal `git diff`) e scan mirato di
  quelle aree.
- **un percorso/area** (es. `src/main/java/.../service` o `app/(dashboard)`) → scan mirato di
  quella cartella/modulo.
- **`lint`** → health check della wiki (pagine orfane, link rotti, contenuto stale,
  contraddizioni, gap di copertura).
- **`query: <domanda>`** → consulta wiki + codice e rispondi alla domanda, proponendo una
  pagina `analyses/` se la risposta è sostanziale.

## Passo 2 — Dispatch di `codebase-expert`

Dispatcha **un** agente `codebase-expert` (`subagent_type: "codebase-expert"`) con un prompt
che includa:

1. La **modalità** e l'**ambito** determinati al Passo 1.
2. L'istruzione di **localizzare la wiki** (`wiki/`, `docs/wiki/`, `src/wiki/`); se non
   esiste, **inizializzarla** con la struttura standard e poi procedere — senza chiedere
   conferma, perché come sub-agent non può interagire con l'utente a metà esecuzione.
3. Il vincolo di **agire in modo non distruttivo**: leggere sempre una pagina prima di
   riscriverla, **preferire l'aggiornamento** alla ricreazione, mai modificare `wiki/raw/`,
   segnalare le contraddizioni invece di sovrascriverle in silenzio, e aggiornare
   `wiki/index.md` e `wiki/log.md` al termine.
4. La consegna di **rispettare le convenzioni wiki già definite nel proprio body** (frontmatter,
   `[[wikilinks]]`, tipi di pagina entity/concept/source/topic/analysis, tag per lo stack —
   funziona sia per backend Spring/JPA sia per frontend React/Next) e la lingua del codice.
5. La richiesta di **chiudere con un report**: pagine create, pagine aggiornate, contraddizioni
   o gap rilevati, e cosa resta da documentare.

## Passo 3 — Riepilogo all'utente

Quando l'agente ritorna, presentami in modo compatto: pagine create/aggiornate (con path),
eventuali contraddizioni/gap segnalati, e i prossimi passi consigliati (es. "manca la pagina
topic per il sistema di auth"). Non committare la wiki a meno che non te lo chieda
esplicitamente.
