---
description: Revisione architetturale che mette in relazione la codebase attuale con le feature pianificate e propone i fix ad alto impatto da fare prima/dopo lo sviluppo
argument-hint: [percorso piani/architettura, default content/]
model: opus
---

Voglio una revisione approfondita che metta in relazione la codebase attuale con le feature
pianificate — i piani si trovano nel percorso passato come argomento (**$ARGUMENTS**);
se l'argomento è vuoto, cerca i piani in `content/feature/feature-*/plan.md` (e gli altri
documenti di pianificazione in `content/`). Considera sempre anche l'architettura di
riferimento del progetto.
L'obiettivo è capire se l'architettura attuale regge il carico di quello che ci costruirò
sopra e dove vale la pena migliorare PRIMA di procedere con l'implementazione.

Non voglio un audit di stile o nitpick cosmetici: voglio pain point strutturali, reali, con
prove concrete nel codice — e proposte di miglioramento valutate su impatto e costo, non un
elenco di best practice generiche.

## FASE 1 — Analisi della codebase attuale

Esplora i moduli/cartelle rilevanti (o "l'intero progetto") e valuta:

- **Coerenza architetturale:** i pattern (naming, struttura a layer, gestione errori,
  validazione, accesso dati) sono applicati in modo uniforme o ci sono incoerenze tra
  moduli/feature simili?
- **Accoppiamento e confini:** dipendenze che attraversano layer in modo scorretto, logica
  duplicata, responsabilità mescolate.
- **Debito tecnico visibile:** codice fragile, workaround, TODO/FIXME irrisolti, aree
  critiche senza test.
- **Tenuta del design attuale:** cosa oggi "funziona" ma non reggerebbe bene l'aggiunta di
  nuove feature o un aumento di complessità/carico.

Per ogni pain point: cita i file/percorsi coinvolti, spiega perché è un problema (non solo
cosa non ti piace) e classifica l'impatto (**bloccante / da tenere d'occhio / cosmetico**).

## FASE 2 — Le feature pianificate rispetto alla codebase attuale

Leggi i piani e verifica, feature per feature:

- Si appoggia correttamente sui pattern esistenti o li ignora/duplica?
- Introduce un'incoerenza con le convenzioni già in uso nel progetto?
- Richiede un refactoring preliminare per essere implementata bene, o può essere costruita
  in modo pulito così com'è?
- Amplifica un pain point già individuato in Fase 1 (es. si appoggia pesantemente su un
  modulo già fragile)?
- C'è complessità nel piano sproporzionata rispetto al valore della feature
  (over-engineering), o al contrario scorciatoie che creeranno debito?

## FASE 3 — Output

1. Pain point attuali, ordinati per impatto, con riferimento ai file (assegna a ciascuno un
   ID stabile tipo `P1`, `P2`, ... così i comandi successivi possono citarli).
2. Rischi introdotti o amplificati dalle feature pianificate.
3. Per ciascun punto, proposta di miglioramento concreta (non generica): se richiede
   refactoring, stima la dimensione (piccolo/medio/grande) e **dove va innestata** — cita il
   work package specifico del piano (es. "dentro WP4.3") e se conviene farlo prima o dopo
   l'implementazione delle nuove feature. Questo aggancio WP è ciò che `/feature-dev`
   leggerà per applicare i fix nel posto giusto.
4. Sezione finale "se potessi migliorare solo 3 cose prima di procedere, quali sarebbero e
   perché" — forzati a prioritizzare, non limitarti a elencare tutto.

Se un'area non ha problemi degni di nota, dillo esplicitamente invece di inventare un
miglioramento per riempirla.

Al termine, salva la revisione come **`content/architecture-review-<data-odierna>.md`**, così
resta il documento condiviso citato da `/feature-dev`.
