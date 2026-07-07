---
description: Analizza requisiti + codebase e ti fa domande di chiarimento, poi produce un piano a work-package. Gestisce numerazione e cartelle feature.
argument-hint: <numero-feature o descrizione> [percorso spec/master-plan]
model: opus
---

Devi produrre il **piano di implementazione** della feature: **$ARGUMENTS**

Sei in **modalità pianificazione**: non tocchi codice sorgente. Il tuo output sono solo
documenti di pianificazione (cartella + numero feature, i requisiti emersi, il piano WP).
Il piano NON lo implementerai tu: verrà spezzato in work package e assegnato a istanze Sonnet
isolate, ciascuna con come UNICO contesto il testo del piano — nessun accesso a questa
conversazione, nessuna possibilità di farti domande, e se lavorano in parallelo non comunicano
tra loro. Ogni ambiguità o assunzione implicita nel piano diventa un errore nel codice finale.

## Fase A — Numero e cartella della feature

1. Determina il **numero feature**: se l'argomento è (o inizia con) un numero, usalo;
   altrimenti leggi `content/feature-index.md` (se `content/` o il file mancano, la prima è
   `1`) e assegna il **prossimo** numero libero.
2. Crea `content/` se non esiste, poi la cartella `content/feature/feature-<n>/`.
3. Annunciami numero e titolo che intendi usare.

## Fase B — Analisi e domande (NON saltarla)

Prima di scrivere una riga di piano:

1. Leggi la specifica/master-plan (dal secondo argomento o dai documenti di pianificazione del
   progetto) ed **esplora la codebase reale**: pattern, convenzioni, struttura a layer, file
   che verranno toccati, contratti delle feature adiacenti, as-built dei predecessori. Cita
   file reali, non descrizioni astratte.
2. Elenca a te stesso le **ambiguità, le decisioni aperte, i trade-off, le assunzioni rischiose
   e i confini di scope incerti** che emergono.
3. **Fammi domande mirate** solo su ciò che cambia davvero il piano:
   - Usa **`AskUserQuestion`** per le scelte discrete (dammi 2–4 opzioni con un tuo consiglio
     in prima posizione), raggruppando più domande insieme invece di spararle una per volta.
   - Per risposte libere (numeri, nomi, vincoli), chiedimi in chat.
   - **Attendi le mie risposte** prima di procedere.
   - Ciò che è deciso in modo netto dalla codebase o dalla spec **non chiedermelo**: decidilo,
     motiva in una riga, e vai avanti. Chiedimi solo il resto.
4. Registra le decisioni prese (le mie risposte + le tue) in
   `content/feature/feature-<n>/requirements.md`, una riga per decisione con la motivazione:
   sarà la memoria del "perché" dietro il piano.

## Fase C — Stesura del piano

Scrivi il piano seguendo queste regole:

1. **STRUTTURA IN WORK PACKAGE**
   Dividi il lavoro in unità autoconclusive. Per ciascuna specifica:
   - Obiettivo in una frase
   - Elenco esatto dei file da creare/modificare (path completi)
   - Pattern/convenzioni esistenti da seguire, citando file reali del progetto come
     riferimento (non descriverli in astratto)
   - Passi di implementazione dettagliati: niente "gestire opportunamente", "validare se
     necessario", "aggiungere gestione errori appropriata" — specifica le regole esatte,
     i casi limite, i messaggi di errore
   - Contratti/interfacce esposte ad altri package (tipi, firme di funzioni, DTO, endpoint)
     scritti per intero: le istanze parallele non possono negoziarli a runtime
   - Dipendenze esplicite da altri package (cosa deve esistere prima e cosa fornisce)
   - Criteri di accettazione verificabili
   - Cosa è esplicitamente FUORI scope, per evitare over-engineering

2. **DECISIONI PRESE ORA, NON RIMANDATE**
   Le decisioni emerse dalla Fase B vanno scritte nel piano come scelte definitive e motivate.
   Non lasciare mai una decisione aperta del tipo "scegliere tra A o B in fase di
   implementazione".

3. **RIUSO**
   Verifica cosa esiste già nel codebase (utility, service, componenti) e indica
   esplicitamente cosa va riusato, per evitare che istanze diverse reimplementino la stessa
   cosa in modo incoerente.

4. **MAPPA DELLE DIPENDENZE**
   Alla fine del piano, elenca quali work package sono eseguibili in parallelo e quali
   richiedono un ordine sequenziale stretto.

5. **CHECKLIST FINALE**
   Chiudi con l'indice completo dei work package, così nessun pezzo della feature viene
   dimenticato nel passaggio di consegne.

6. **AUTOVERIFICA**
   Prima di darmi il piano definitivo, rileggilo e verifica che ogni punto sopra sia
   rispettato e che ogni domanda della Fase B abbia trovato risposta nel piano. Se è rimasto
   qualcosa di vago, non scriverlo in modo ambiguo: chiedimelo ora, prima di finalizzare.

## Fase D — Salvataggio e indice

- Salva il piano come **`content/feature/feature-<n>/plan.md`**, con la struttura a
  work-package qui sopra.
- Aggiorna **`content/feature-index.md`** (crealo se manca) con la riga della feature:
  `| <n> | <titolo> | planned | <data> | [plan](feature/feature-<n>/plan.md) |`.
  Se il file è nuovo, aggiungi l'intestazione: `# Feature Index` e la tabella con colonne
  `# | Titolo | Stato | Data | Piano` (stati: `planned` → `in-progress` → `reviewed` → `done`).
- Questo piano è l'input di **`/feature-dev <n>`**.

> Nota: se il progetto usa già un layout di pianificazione diverso (es.
> `content/feature-<n>-<slug>-plan.md`), adattati a quello esistente invece di crearne uno
> nuovo — non duplicare le convenzioni.
