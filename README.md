# agentic-feature-factory

Claude Code plugin that packages the agent-driven feature development pipeline:
**plan → review → implement (orchestrated) → code-review → document**. It works on both
**backend** (Spring Boot + Maven) and **frontend** (React / Next / Vite) projects: the
commands are stack-neutral and adapt the verification gates to the project's stack.

## Example: one full cycle

Let's develop **feature 5** in a freshly cloned repo (no planning layout yet).

### 1. Planning — `/feature-plan 5 Portfolio PDF export`

The command **first analyzes** the codebase + spec, then asks you only the questions that
actually change the plan:

```
[AskUserQuestion] How do we generate the PDF?
  ① Server-side library (recommended)  ② Headless browser  ③ External service
[AskUserQuestion] Does the scope include bulk download (zip)?
  ① No (recommended)  ② Yes
```

You answer, and only then does it write the plan. On disk you get:

```
content/
├── feature-index.md          # | 5 | Portfolio PDF export | planned | 2026-07-07 | plan |
└── feature/
    └── feature-5/
        ├── requirements.md    # decisions taken (PDF: server-side library; no zip; …)
        └── plan.md            # work packages WP5.1…WP5.n with contracts + dependency map
```

### 2. Review — `/arch-review 5`

Puts the feature 5 plan against the codebase and produces the pain points with stable IDs
and the WP to graft each fix into, **inside the feature's folder**:

```
content/
├── feature-index.md
└── feature/
    └── feature-5/
        ├── requirements.md
        ├── plan.md
        └── architecture-review-2026-07-07.md   # P1 → inside WP5.2 · P2 → before WP5.1 · …
```

### 3. Development — `/feature-dev 5`

The Opus orchestrator, starting from `content/feature/feature-5/plan.md` + the review:

1. shows you the **waves** (parallel/sequential WPs) and starts;
2. for each wave it dispatches the **Implementers (Sonnet)**, then runs the **gate**
   (`mvn verify` or the FE build) — green before advancing;
3. with all WPs complete it **stops and asks for confirmation** before the review;
4. on confirmation it runs **`/code-review high`** and leaves you the findings: **you handle
   triage and fixes**;
5. when you confirm the findings are handled, it **documents** the feature in the project
   wiki (`feature-documenter`) and closes, updating `feature-index.md` → `done`.

## What's inside

| Component | Type | What it does |
| --- | --- | --- |
| `/feature-plan <n>` | command (Opus) | Analyzes codebase + requirements, **asks you questions**, then produces the work-package plan; resolves the planning layout and handles numbering and feature folders |
| `/arch-review` | command (Opus) | Architecture review of the codebase vs the planned features |
| `/feature-dev <n>` | command (Opus) | Orchestrates the Implementers (Sonnet), verification gates, confirmation, `/code-review high` and wiki documentation |
| `/feature-docs [scope]` | command (Opus) | Documents in wiki format via `feature-documenter` (feature/area/lint), standalone |
| `implementer` | agent (Sonnet) | Executes ONE work package test-driven, within the WP's file boundaries; dispatched in parallel by `/feature-dev` |
| `feature-documenter` | agent (Sonnet) | Updates the project wiki adopting the **project's** conventions (AGENTS.md/CLAUDE.md → existing wiki format → default structure) |
| `spring-maven-build` | skill | BE build/test gate (Docker for Testcontainers; `mvn verify`; formatter; Flyway vs Liquibase detection; multi-module) |
| `node-frontend-build` | skill | FE build/test gate (detects pnpm/yarn/npm; lint + typecheck + test + build) |

The code-review uses the **built-in** `/code-review high` skill (invoked inside
`/feature-dev`): no dedicated review agent is needed. The `ultra` variant (cloud, metered)
stays manual.

## The full flow

```
/feature-plan 5   →   /arch-review 5   →   /feature-dev 5
  analyzes + asks       reviews and assigns    Opus orchestrates the Implementers (Sonnet)
  → content/feature/    fixes to WPs           → verification gate (BE mvn verify / FE build)
     feature-5/plan.md                         → CONFIRM → /code-review high (manual fixes)
                                               → wiki documentation (feature-documenter)
```

- `/feature-plan` first **analyzes and asks you questions** (via `AskUserQuestion`), then
  writes the plan: decisions don't stay dangling into the implementation phase.
- `/arch-review` assigns stable IDs to the pain points (`P1`, `P2`, …) and states which work
  package each fix should be grafted into; `/feature-dev` reads that review and applies the
  fixes in the right place.
- The **documentation phase** at the end of `/feature-dev` is the same thing `/feature-docs`
  does, integrated into the pipeline. `/feature-docs` remains invocable on its own (targeted
  docs, wiki `lint`).
- The **code-review** presents the findings and stops: **you** do triage and fixes manually.

## Planning layout: settings, discovery, default

The commands resolve where the index and the plans live, in this order:

1. **Plugin settings** — optional file `.claude/agentic-feature-factory.local.md` in the
   target repo:

   ```markdown
   ---
   plans_dir: content        # folder containing feature-index.md and the plans
   wiki_dir: docs/wiki       # optional: where the project wiki lives
   ---
   ```

2. **Discovery of the existing layout** — `feature-index.md` is searched first in
   `content/`, then in the **repo root**, then via glob; existing plans are searched in the
   known conventions (`content/feature/feature-*/`, `content/feature-*-plan.md`,
   `feature/feature-*/`). If an index is found, the commands **adopt its location, its
   column schema and the plan convention it references** — they never create a second index.
   If multiple conflicting conventions coexist, `/feature-plan` **asks you** which one to
   adopt before writing anything.

3. **Default** (greenfield):

   ```
   <repo-root>/content/
   ├── feature-index.md                    # registry: number, title, status, link to the plan
   └── feature/
       └── feature-<n>/
           ├── requirements.md             # decisions from /feature-plan's questions
           ├── plan.md                     # WP plan (output of /feature-plan, input of /feature-dev)
           └── architecture-review-<date>.md   # feature review (output of /arch-review <n>)
   ```

## Installation (marketplace)

From a Claude Code session, in any repo (BE or FE) where you want to use it.

**From GitHub**:

```
/plugin marketplace add Elverle/agentic-feature-factory
/plugin install agentic-feature-factory@smart-portfolio-devkit
```

**Locally** (developing the plugin itself):

```
git clone https://github.com/Elverle/agentic-feature-factory
/plugin marketplace add D:/Lele/Software/agentic-feature-factory
/plugin install agentic-feature-factory@smart-portfolio-devkit
```

Then reload the session (`/reload-plugins`) and the commands will be available. To update it
after changes: `/plugin marketplace update smart-portfolio-devkit`.

> If `source: "./"` in `marketplace.json` doesn't resolve in your Claude Code version, add
> the folder directly as a development plugin via `/plugin` instead.

## Design notes

- **Project conventions win.** `AGENTS.md`, `CLAUDE.md` and the project's local skills take
  precedence over the plugin's skills and agents — for build commands, code style and
  documentation format alike. The plugin's defaults only fill what the project doesn't
  specify.
- **Opus orchestrates, Sonnet works.** `/feature-dev` and `/feature-docs` run on Opus
  (`model: opus` in the frontmatter); they dispatch `implementer` and `feature-documenter`
  with `model: sonnet` (also set in the bundled agents' frontmatter) and a *high thinking*
  instruction.
- **Stack-neutral.** `/feature-dev`'s verification gate adapts: Spring/Maven BE
  (`mvn verify`, Docker for Testcontainers ITs) or Node FE (lint + typecheck + test +
  build). The two skills `spring-maven-build` / `node-frontend-build` drive the right gate.
- **One feature at a time**, file-disjoint waves following the plan's dependency map. Green
  gate between waves.
- **No code-review and no commit without the user's explicit confirmation.**
- **Documentation integrated, on the project's terms.** Every feature closes with a wiki
  update via `feature-documenter`, which mimics the existing wiki's format (naming, links,
  frontmatter, language) instead of imposing its own; its default structure applies only to
  projects with no documentation at all.
- **No stubs between parallel WPs.** If a WP depends on code that doesn't exist yet, that's
  a wave-ordering error: the Implementer returns BLOCKED instead of inventing placeholder
  interfaces.
- **Portability.** The commands don't hardcode any project's pain points or paths: they
  resolve the planning layout at runtime (settings file → discovery → default).

## Customization

- **Per-repo settings**: `.claude/agentic-feature-factory.local.md` with `plans_dir` and
  `wiki_dir` in the frontmatter (see above).
- **Orchestrator or agent models**: `model:` in the commands' (`commands/*.md`) and agents'
  (`agents/*.md`) frontmatter.
- **Build skills are stack-scoped**: `spring-maven-build` only activates on Spring/Maven,
  `node-frontend-build` only on Node projects — for other stacks (Gradle, Python, Go) add an
  analogous skill and `/feature-dev` will use it as the gate.
