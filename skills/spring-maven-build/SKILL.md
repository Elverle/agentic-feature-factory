---
name: spring-maven-build
description: Use when building or testing a Spring Boot + Maven backend (single or multi-module) as the verification gate of a feature. Covers `mvn verify` semantics, the Docker requirement for Testcontainers integration tests, formatter (Spotless) usage, migration-tool detection (Flyway vs Liquibase), multi-module scoped runs, and fast diagnosis of a red build.
version: 2.0.0
---

# Build & test — Spring Boot + Maven backend

Verification gate for backend features on Spring Boot + Maven. Use it before launching the
build or when diagnosing a red `mvn verify`.

## Precedence rule (before anything else)

**The project's `AGENTS.md`, `CLAUDE.md` and local skills win over this skill.** If the
project documents its own build commands, flags, profiles or gotchas (e.g. Surefire flags for
module-scoped test runs), use those. This skill only covers what the project does not say.

## Blocking requirement: Docker running (if there are Testcontainers ITs)

Integration tests (typically `*IT` classes run by failsafe) that use Testcontainers start
containers (e.g. Postgres) via Docker. **The Docker daemon must be running** before
`mvn verify`, otherwise the ITs fail with Docker-host connection errors — an infrastructure
red, not an application one, and a misleading signal. If the local DB is also needed to run
the app manually: `docker compose up -d`.

## Commands

| Goal | Command |
| --- | --- |
| Formatting (if the project uses Spotless) | `mvn spotless:apply` |
| Compile only | `mvn compile` (or `mvn test-compile`) |
| Unit tests only (`*Test`, surefire) | `mvn test` |
| **Full suite** (authoritative gate) | `mvn verify` |

- **`mvn verify` is the authoritative gate**: unit (surefire) + integration (failsafe) +
  whatever quality checks are configured (formatter, enforcer). Green means the feature is
  integrated.
- If the project runs a formatter as a check (Spotless, fmt-maven): **format before
  committing** and after every batch of edits, or `mvn verify` fails on formatting rather
  than on logic.

## Multi-module (reactor)

If the root `pom.xml` declares `<modules>`:

- The gate is still **`mvn verify` from the root**: it builds and tests every module in
  reactor order.
- To work on a single module: `mvn verify -pl <module> -am` (`-am` also builds the modules
  it depends on).
- Scoped test runs (`-Dtest=...`) in a multi-module build often need extra flags
  (e.g. `-DfailIfNoTests=false`) or must be launched from the right module rather than the
  root: **check the project's AGENTS.md/CLAUDE.md first** — they usually document the
  correct combination.

## Schema migrations: detect the tool, don't assume it

Before touching the schema, look at what the project uses:

| Tool | Clues | Convention |
| --- | --- | --- |
| **Flyway** | `src/main/resources/db/migration/`, `V<n>__description.sql` files | new migration = next `V<n>`; never modify already-applied migrations |
| **Liquibase** | `db/changelog/` with XML/YAML changelogs, a `*changelog-master*`/root changelog | new changeset where the project's structure expects it + include it in the root changelog; mimic the numbering and pattern of adjacent changesets |

Gotchas common to both:

- With **`spring.jpa.hibernate.ddl-auto=validate`** the migrations are authoritative for the
  schema: entities MUST match the DDL (types, nullability, `TEXT` columns declared with
  `@Column(columnDefinition = "TEXT")`, …). A mismatch fails the Spring context at boot →
  **all** ITs red at startup, not just the new ones.
- Every new migration is applied when the context starts in the ITs: a SQL/YAML error shows
  up as a boot failure of existing ITs.
- If a table is managed at runtime by a framework/library rather than by migrations, do not
  create or alter it in a migration: verify in the project who owns that table before
  writing DDL.

## Fast diagnosis of a red `mvn verify`

1. **Formatting check failed?** → apply the project's formatter (`mvn spotless:apply`) and
   rerun.
2. **ITs don't start / Docker error?** → Docker daemon down or unreachable.
3. **Hibernate validation error at boot?** → entity ↔ migration mismatch (see above), not a
   logic bug.
4. **Test assertions failing?** → it's code: isolate the offending test
   (`mvn -Dtest=TestName test` or `-Dit.test=ITName verify`, from the right module if
   multi-module) and fix the root cause.
