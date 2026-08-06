# agentic-feature-factory

Claude Code plugin that packages an agent-driven feature development pipeline:

**plan → architecture review → implement (orchestrated) → code-review → document**

It works on **backend** (Spring Boot + Maven) and **frontend** (React / Next / Vite)
projects alike: the commands are stack-neutral and adapt the verification gate to the
project's stack.

- [Requirements](#requirements)
- [Installation](#installation)
- [Quick start: one full cycle](#quick-start-one-full-cycle)
- [What's inside](#whats-inside)
- [Planning layout](#planning-layout-settings-discovery-default)
- [Configuration](#configuration)
- [Design notes](#design-notes)

## Requirements

- **Claude Code** with plugin/marketplace support.
- **Backend projects**: JDK and Maven for the `mvn verify` gate, plus a running **Docker**
  daemon if the project has Testcontainers integration tests.
- **Frontend projects**: Node.js and the project's package manager (pnpm / yarn / npm — the
  skill detects which one from the lockfile).

Nothing else is installed: the plugin ships commands, agents and skills, not tooling.

## Installation

Run these from a Claude Code session in any repo (backend or frontend) where you want to use
the pipeline. The `@` syntax is `plugin@marketplace`: this repo is both the **marketplace**
and the single **plugin** it hosts, so the two names coincide.

**From GitHub**:

```
/plugin marketplace add Elverle/agentic-feature-factory
/plugin install agentic-feature-factory@agentic-feature-factory
```

**From a local clone** (when developing the plugin itself):

```
git clone https://github.com/Elverle/agentic-feature-factory
/plugin marketplace add /absolute/path/to/agentic-feature-factory
/plugin install agentic-feature-factory@agentic-feature-factory
```

Then restart the Claude Code session so the commands, agents and skills are loaded. To pull
in later changes: `/plugin marketplace update agentic-feature-factory`.

> If `source: "./"` in `marketplace.json` doesn't resolve in your Claude Code version, add
> the folder directly as a development plugin via `/plugin` instead.

## Quick start: one full cycle

Let's develop **feature 5** in a freshly cloned repo with no planning layout yet.

### 1. Planning — `/feature-plan 5 Portfolio PDF export`

The command **first analyzes** the codebase and the spec, then asks only the questions that
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
        ├── requirements.md   # decisions taken (PDF: server-side library; no zip; …)
        └── plan.md           # work packages WP5.1…WP5.n with contracts + dependency map
```

Decisions are settled here, so they don't stay dangling into the implementation phase.

### 2. Review — `/arch-review 5`

Puts the feature 5 plan against the codebase and produces the pain points with stable IDs
(`P1`, `P2`, …), each annotated with the work package to graft its fix into. The output lands
**inside the feature's folder**:

```
content/
├── feature-index.md
└── feature/
    └── feature-5/
        ├── requirements.md
        ├── plan.md
        └── architecture-review-2026-07-07.md   # P1 → inside WP5.2 · P2 → before WP5.1 · …
```

Called without a number, it reviews the whole planned set and writes the report at the layout
root instead.

### 3. Development — `/feature-dev 5`

The Opus orchestrator starts from `content/feature/feature-5/plan.md` plus the review, and:

1. shows you the **waves** (parallel and sequential WPs) and starts;
2. for each wave dispatches the **Implementers (Sonnet)**, then runs the **gate**
   (`mvn verify` or the frontend build) — it must be green before advancing;
3. once all WPs are complete, **stops and asks for confirmation** before the review;
4. on confirmation runs **`/code-review high`** and leaves you the findings: **you handle
   triage and fixes**;
5. when you confirm the findings are handled, **documents** the feature in the project wiki
   (via `feature-documenter`) and closes, updating `feature-index.md` → `done`.

The code-review uses the **built-in** `/code-review high` skill, invoked in-session — no
dedicated review agent is needed. The `ultra` variant (cloud, metered) stays manual.

### The flow at a glance

```
/feature-plan 5   →   /arch-review 5   →   /feature-dev 5
  analyzes + asks       reviews and assigns    Opus orchestrates the Implementers (Sonnet)
  → content/feature/    fixes to WPs           → verification gate (BE mvn verify / FE build)
     feature-5/plan.md                         → CONFIRM → /code-review high (manual fixes)
                                               → wiki documentation (feature-documenter)
```

## What's inside

| Component | Type | What it does |
| --- | --- | --- |
| `/feature-plan <n\|description> [spec]` | command (Opus) | Analyzes codebase + requirements, **asks you questions**, then produces the work-package plan; resolves the planning layout and handles numbering and feature folders |
| `/arch-review [n]` | command (Opus) | Architecture review of the codebase against a planned feature (or the whole planned set) |
| `/feature-dev <n> [plan-path]` | command (Opus) | Orchestrates the Implementers (Sonnet), verification gates, confirmation, `/code-review high` and wiki documentation |
| `/feature-docs [scope]` | command (Opus) | Documents in wiki format via `feature-documenter` (feature / area / `lint`), standalone |
| `implementer` | agent (Sonnet) | Executes ONE work package test-driven, within the WP's file boundaries; dispatched in parallel by `/feature-dev` |
| `feature-documenter` | agent (Sonnet) | Updates the project wiki adopting the **project's** conventions (AGENTS.md/CLAUDE.md → existing wiki format → default structure) |
| `spring-maven-build` | skill | Backend build/test gate (Docker for Testcontainers; `mvn verify`; formatter; Flyway vs Liquibase detection; multi-module) |
| `node-frontend-build` | skill | Frontend build/test gate (detects pnpm/yarn/npm; lint + typecheck + test + build) |

The documentation phase at the end of `/feature-dev` is the same work `/feature-docs` does,
integrated into the pipeline. `/feature-docs` stays invocable on its own for targeted docs and
for the wiki `lint` mode.

## Planning layout: settings, discovery, default

The commands resolve where the index and the plans live, in this order:

**1. Plugin settings** — optional file `.claude/agentic-feature-factory.local.md` in the
target repo:

```markdown
---
plans_dir: content        # folder containing feature-index.md and the plans
wiki_dir: docs/wiki       # optional: where the project wiki lives
---
```

**2. Discovery of the existing layout** — `feature-index.md` is searched first in `content/`,
then in the **repo root**, then via glob; existing plans are searched in the known conventions
(`content/feature/feature-*/`, `content/feature-*-plan.md`, `feature/feature-*/`). If an index
is found, the commands **adopt its location, its column schema and the plan convention it
references** — they never create a second index. If multiple conflicting conventions coexist,
`/feature-plan` **asks you** which one to adopt before writing anything.

**3. Default** (greenfield):

```
<repo-root>/content/
├── feature-index.md                    # registry: number, title, status, link to the plan
└── feature/
    └── feature-<n>/
        ├── requirements.md             # decisions from /feature-plan's questions
        ├── plan.md                     # WP plan (output of /feature-plan, input of /feature-dev)
        └── architecture-review-<date>.md   # feature review (output of /arch-review <n>)
```

## Configuration

- **Per-repo settings**: `.claude/agentic-feature-factory.local.md` with `plans_dir` and
  `wiki_dir` in the frontmatter (see above).
- **Orchestrator and agent models**: the `model:` key in the commands' (`commands/*.md`) and
  agents' (`agents/*.md`) frontmatter.
- **Other stacks**: the build skills are stack-scoped — `spring-maven-build` only activates on
  Spring/Maven, `node-frontend-build` only on Node projects. For Gradle, Python, Go and the
  like, add an analogous skill to the project and `/feature-dev` will use it as the gate.

## Design notes

- **Project conventions win.** `AGENTS.md`, `CLAUDE.md` and the project's local skills take
  precedence over the plugin's skills and agents — for build commands, code style and
  documentation format alike. The plugin's defaults only fill what the project doesn't
  specify.
- **Opus orchestrates, Sonnet works.** `/feature-dev` and `/feature-docs` run on Opus
  (`model: opus` in the frontmatter); they dispatch `implementer` and `feature-documenter`
  with `model: sonnet` (also set in the bundled agents' frontmatter) and a *high thinking*
  instruction.
- **Stack-neutral.** `/feature-dev`'s verification gate adapts: Spring/Maven backend
  (`mvn verify`, Docker for Testcontainers ITs) or Node frontend (lint + typecheck + test +
  build), driven by the two build skills.
- **One feature at a time**, in file-disjoint waves following the plan's dependency map, with
  a green gate between waves.
- **No code-review and no commit without your explicit confirmation.**
- **Documentation integrated, on the project's terms.** Every feature closes with a wiki
  update via `feature-documenter`, which mimics the existing wiki's format (naming, links,
  frontmatter, language) instead of imposing its own; its default structure applies only to
  projects with no documentation at all.
- **No stubs between parallel WPs.** If a WP depends on code that doesn't exist yet, that's a
  wave-ordering error: the Implementer returns BLOCKED instead of inventing placeholder
  interfaces.
- **Portability.** The commands hardcode no project's pain points or paths: they resolve the
  planning layout at runtime (settings file → discovery → default).

## License

MIT — see [LICENSE](LICENSE).
