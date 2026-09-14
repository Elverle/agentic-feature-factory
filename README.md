# agentic-feature-factory

Agent-driven feature development pipeline for **Claude Code**, **Google Antigravity**, **AGY CLI**, **OpenAI Codex**, and **GitHub Copilot**:

**brainstorm → plan → architecture review → implement (orchestrated) → code-review → document**

It works on **backend** (Spring Boot + Maven) and **frontend** (React / Next / Vite)
projects alike: the pipeline is stack-neutral and adapts the verification gate to the
project's stack.

- [Requirements](#requirements)
- [Installation & Multi-Platform Adapters](#installation--multi-platform-adapters)
  - [Step 0: Get the Repository](#step-0-get-the-repository)
  - [Antigravity & AGY CLI](#1-google-antigravity--agy-cli)
  - [OpenAI Codex](#2-openai-codex)
  - [GitHub Copilot](#3-github-copilot)
  - [Claude Code](#4-claude-code)
  - [All Platforms at Once](#all-platforms-at-once)
- [Quick start: one full cycle](#quick-start-one-full-cycle)
- [What's inside](#whats-inside)
- [Planning layout](#planning-layout-settings-discovery-default)
- [Configuration](#configuration)
- [Design notes](#design-notes)

## Requirements

- **Supported AI Environments**:
  - **Claude Code** (CLI)
  - **Google Antigravity** (IDE / Desktop) or **AGY CLI**
  - **OpenAI Codex** (CLI with multi-agent feature enabled)
  - **GitHub Copilot** (VS Code Copilot Chat or Copilot CLI)
- **Runtime for Adapter CLI**: Node.js 18+, Bun, or Deno (zero dependencies).
- **Backend projects**: JDK and Maven for the `mvn verify` gate, plus a running **Docker**
  daemon if the project has Testcontainers integration tests.
- **Frontend projects**: Node.js and the project's package manager (pnpm / yarn / npm / bun — the
  skill detects which one from the lockfile).

## Installation & Multi-Platform Adapters

### Step 0: Get the Repository

Before running the adapters, obtain the repository or run the adapter CLI directly. Choose the method that best fits your workflow:

#### Option A: Clone locally (Recommended)
```bash
git clone https://github.com/Elverle/agentic-feature-factory.git
cd agentic-feature-factory
```
*(No `npm install` required — the adapter engine uses Node/Bun built-ins with zero external dependencies!)*

#### Option B: Direct execution via `npx` / `bunx`
Run the adapter directly without cloning:
```bash
npx github:Elverle/agentic-feature-factory <target>
# or using bunx:
bunx --bun github:Elverle/agentic-feature-factory <target>
```

#### Option C: Global CLI installation
Install the `aff` (Agentic Feature Factory) command globally:
```bash
npm install -g github:Elverle/agentic-feature-factory
# or with bun:
bun add -g github:Elverle/agentic-feature-factory

aff <target>
```

---

### Platform-Specific Setup

Run the adapter for your target platform (by default, it installs globally on your machine so you can use the factory across all your projects):

### 1. Google Antigravity & AGY CLI

Installs the pipeline as a global plugin in `~/.gemini/config/plugins/agentic-feature-factory/`:

```bash
# Using Bun:
bun run adapt antigravity

# Using npm:
npm run adapt antigravity
```

The skills (`feature-plan`, `feature-dev`, `arch-review`, `feature-docs`, `spring-maven-build`, `node-frontend-build`) are immediately discovered by both Antigravity IDE and AGY CLI. You can invoke them naturally (e.g. *"Plan feature 5"*) or via slash commands (e.g. `/feature-plan 5`).

### 2. OpenAI Codex

Installs agent role files to `~/.codex/agents/` and prompt templates to `~/.codex/prompts/`:

```bash
bun run adapt codex
# or: npm run adapt codex
```

> **Note**: Ensure `~/.codex/config.toml` has multi-agent enabled:
> ```toml
> [features]
> multi_agent = true
> ```

### 3. GitHub Copilot

Installs Copilot prompt files (`.prompt.md`) and project instructions:

```bash
# Global prompts:
bun run adapt copilot

# Or install directly into current project's .github/ directory:
bun run adapt copilot --scope project
```

In VS Code Copilot Chat or Copilot CLI, type `/` to access `/feature-plan`, `/feature-dev`, `/arch-review`, and `/feature-docs`.

### 4. Claude Code

Install directly via the Claude Code marketplace or use the adapter:

**From GitHub**:
```
/plugin marketplace add Elverle/agentic-feature-factory
/plugin install agentic-feature-factory@agentic-feature-factory
```

**Via Adapter**:
```bash
bun run adapt claude
# or: npm run adapt claude
```

### All Platforms at Once

```bash
bun run adapt all
# or: npm run adapt all
```

### Quick start: one full cycle

Let's develop **feature 5** in a freshly cloned repo with no planning layout yet.

### 0. Brainstorming (Optional) — `/feature-brainstorm 5 Portfolio PDF export`

If you start from a raw idea or need to evaluate approaches, the command explores intent,
proposes 2–3 architectural alternatives with trade-offs, trims out-of-scope bloat (YAGNI),
and writes a validated specification:

```
content/
└── feature/
    └── feature-5/
        └── spec.md           # functional requirements, architectural design, YAGNI out-of-scope
```

### 1. Planning — `/feature-plan 5 Portfolio PDF export [path/to/spec.md]`

The command **first analyzes** the codebase and the spec (e.g. `spec.md`), then asks only the
questions that actually change the plan:

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
        ├── spec.md           # (if generated via /feature-brainstorm)
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
        ├── spec.md
        ├── requirements.md
        ├── plan.md
        └── architecture-review-2026-07-07.md   # P1 → inside WP5.2 · P2 → before WP5.1 · …
```

Called without a number, it reviews the whole planned set and writes the report at the layout
root instead.

### 3. Development — `/feature-dev 5`

The orchestrator starts from `content/feature/feature-5/plan.md` plus the review, and:

1. shows you the **waves** (parallel and sequential WPs) and starts;
2. for each wave dispatches the **Implementers**, then runs the **gate**
   (`mvn verify` or the frontend build) — it must be green before advancing;
3. once all WPs are complete, **stops and asks for confirmation** before the review;
4. on confirmation runs **code-review** (`/code-review high` in Claude Code, or in-session review)
   and leaves you the findings: **you handle triage and fixes**;
5. when you confirm the findings are handled, **documents** the feature in the project wiki
   (via `feature-documenter`) and closes, updating `feature-index.md` → `done`.

### The flow at a glance

```
/feature-brainstorm 5  →  /feature-plan 5  →  /arch-review 5  →  /feature-dev 5
  explores intent +         analyzes + asks       reviews and          orchestrates Implementers
  approaches & YAGNI        → plan.md             assigns fixes        → gate → CONFIRM → review
  → spec.md                                                            → wiki documentation
```

## What's inside

| Component | Type | What it does |
| --- | --- | --- |
| `/feature-brainstorm <n\|description>` | command / skill | Explores user intent and technical approaches through proactive questions; cuts unnecessary scope (YAGNI) and produces a validated specification (`spec.md`) |
| `/feature-plan <n\|description> [spec]` | command / skill | Analyzes codebase + requirements, **asks you questions**, then produces the work-package plan; resolves the planning layout and handles numbering and feature folders |
| `/arch-review [n]` | command / skill | Architecture review of the codebase against a planned feature (or the whole planned set) |
| `/feature-dev <n> [plan-path]` | command / skill | Orchestrates Implementer subagents, verification gates, confirmation, final code-review and wiki documentation |
| `/feature-docs [scope]` | command / skill | Documents in wiki format via `feature-documenter` (feature / area / `lint`), standalone |
| `implementer` | agent | Executes ONE work package test-driven, within the WP's file boundaries; dispatched in parallel by `/feature-dev` |
| `feature-documenter` | agent | Updates the project wiki adopting the **project's** conventions (AGENTS.md/CLAUDE.md/GEMINI.md → existing wiki format → default structure) |
| `spring-maven-build` | skill | Backend build/test gate (Docker for Testcontainers; `mvn verify`; formatter; Flyway vs Liquibase detection; multi-module) |
| `node-frontend-build` | skill | Frontend build/test gate (detects pnpm/yarn/npm; lint + typecheck + test + build) |

The documentation phase at the end of `/feature-dev` is the same work `/feature-docs` does,
integrated into the pipeline. `/feature-docs` stays invocable on its own for targeted docs and
for the wiki `lint` mode.

## Planning layout: settings, discovery, default

The commands resolve where the index and the plans live, in this order:

**1. Plugin settings** — optional file `.agentic-feature-factory.local.md` (in the repo root,
or under `.agents/`, `.codex/`, or `.claude/`):

```markdown
---
plans_dir: content        # folder containing feature-index.md and the plans
wiki_dir: docs/wiki       # optional: where the project wiki lives

# Optional: configure model tiers per platform
models:
  codex:
    orchestrator: gpt5.6-sol
    implementer: gpt5.6-luna
  claude:
    orchestrator: opus
    implementer: sonnet
  antigravity:
    orchestrator: pro
    implementer: inherit
  copilot:
    orchestrator: gpt-4o
    implementer: gpt-4o
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

- **Per-repo settings**: `.agentic-feature-factory.local.md` with `plans_dir`, `wiki_dir`,
  and platform `models` in the frontmatter (see example in `.agentic-feature-factory.local.example.md`).
- **Configurable model tiers**:
  - **Codex**: Orchestrator defaults to `gpt5.6-sol`, Implementer to `gpt5.6-luna`.
  - **Claude Code**: Orchestrator defaults to `opus`, Implementer to `sonnet`.
  - **Antigravity & AGY CLI**: Orchestrator defaults to `pro`, Implementer to `inherit`.
  - **GitHub Copilot**: Orchestrator defaults to `gpt-4o`, Implementer to `gpt-4o`.
  Models can be customized in `.agentic-feature-factory.local.md` or overridden on the command line via `--orchestrator <model>` and `--implementer <model>`.
- **Other stacks**: the build skills are stack-scoped — `spring-maven-build` only activates on
  Spring/Maven, `node-frontend-build` only on Node projects. For Gradle, Python, Go and the
  like, add an analogous skill to the project and `/feature-dev` will use it as the gate.

## Design notes

- **Project conventions win.** `AGENTS.md`, `CLAUDE.md` and the project's local skills take
  precedence over the plugin's skills and agents — for build commands, code style and
  documentation format alike. The plugin's defaults only fill what the project doesn't
  specify.
- **Orchestrator coordinates, Implementers build.** The orchestrator runs on a high-reasoning tier
  (e.g., Opus, gpt5.6-sol, Pro), planning waves, reviewing gates, and dispatching subagents.
  Implementers run on fast, precise coding models (e.g., Sonnet, gpt5.6-luna, inherit) with deep reasoning
  (*high thinking*) enabled, keeping execution efficient and cost-effective.
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
