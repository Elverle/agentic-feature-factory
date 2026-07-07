---
name: spring-maven-build
description: Use when building or testing a Spring Boot + Maven backend whose integration tests use Testcontainers-Postgres. Explains that `mvn verify` runs Spotless + unit (*Test) + integration (*IT) tests, that the Docker daemon MUST be running for the Testcontainers-Postgres container, that code must be formatted with `mvn spotless:apply` before commit, and the ddl-auto=validate / Flyway gotchas.
version: 1.0.0
---

# Build & test — Spring Boot + Maven + Testcontainers

Guida operativa per compilare, testare e formattare un backend Spring Boot con Maven i cui
integration test girano su **Testcontainers-Postgres**. Usala prima di lanciare la build o di
diagnosticare un `mvn verify` rosso.

## Requisito bloccante: Docker attivo

Gli integration test (classi `*IT`, eseguite da **failsafe**) avviano un container
Postgres via Testcontainers (tipicamente un singleton condiviso). **Il Docker daemon deve
essere in esecuzione** prima di `mvn verify` / `mvn failsafe:integration-test`, altrimenti
gli IT falliscono con errori di connessione al Docker host, non con errori applicativi —
un rosso fuorviante. Se il DB locale serve anche per l'avvio manuale: `docker compose up -d`.

## Comandi

| Obiettivo | Comando |
| --- | --- |
| Formattare il codice (google-java-format via Spotless) | `mvn spotless:apply` |
| Solo compilazione | `mvn compile` (o `mvn test-compile`) |
| Solo unit test (`*Test`, surefire) | `mvn test` |
| **Suite completa** (Spotless check + unit + IT) | `mvn verify` |
| Avvio locale con profilo dev | `mvn spring-boot:run -Dspring-boot.run.profiles=local` (DB da `docker compose up -d`) |

- **`mvn verify` è il gate autorevole**: fa girare Spotless (in verifica), gli unit `*Test`
  (surefire) e gli integration `*IT` (failsafe). Se è verde, la feature è integrata.
- **Formatta sempre prima di committare**: `mvn verify` **fallisce su codice non formattato**.
  Esegui `mvn spotless:apply` prima di ogni commit e dopo ogni blocco di modifiche.

## Gotcha di schema (evitano rossi criptici al boot)

- **`spring.jpa.hibernate.ddl-auto=validate`** è attivo: Flyway è autorevole per lo schema.
  Le entity DEVONO combaciare col DDL. In particolare le colonne `TEXT` vanno dichiarate con
  `@Column(columnDefinition = "TEXT")`, altrimenti la validazione Hibernate fallisce all'avvio
  di **qualsiasi** IT (il contesto Spring non parte).
- La tabella **`vector_store`** (pgvector) è gestita da **Spring AI**, mai da Flyway: non
  crearla né alterarla nelle migration.
- Ogni nuova migration Flyway (`V<n>__*.sql`) viene applicata all'avvio del contesto negli IT:
  un errore SQL nella migration si manifesta come fallimento di boot degli IT esistenti.

## Diagnosi rapida di un `mvn verify` rosso

1. **Fallisce Spotless?** → `mvn spotless:apply` e ri-lancia.
2. **Gli IT non partono / errore Docker?** → verifica che Docker sia attivo.
3. **Errore di validazione Hibernate al boot?** → disallineamento entity ↔ schema Flyway
   (vedi gotcha sopra), non un bug di logica.
4. **Falliscono asserzioni di test?** → è codice: isola il `*Test`/`*IT` colpevole
   (`mvn -Dtest=NomeTest test` o `-Dit.test=NomeIT verify`) e correggi la causa radice.
