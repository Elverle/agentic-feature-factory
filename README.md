# agentic-feature-factory

Agent-driven feature development pipeline for **Claude Code**, **Google Antigravity**, **AGY CLI**, **OpenAI Codex**, and **GitHub Copilot**:

**brainstorm → plan → architecture review → implement (orchestrated) → review (optional) → document → commit**

Lost track of where a feature stands? `/feature-next` reads the project's state and tells you
the next command to run. A bugfix or a small patch? `/feature-patch` skips spec and plan but
keeps the build gate, the review, the docs and the commit.

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
  - [Updating an existing installation](#updating-an-existing-installation)
- [Quick start: one full cycle](#quick-start-one-full-cycle)
- [What's inside](#whats-inside)
- [Planning layout](#planning-layout-settings-discovery-default)
- [Configuration](#configuration)
- [Design notes](#design-notes)
- [Developing the plugin](#developing-the-plugin)

## Requirements

- **Supported AI Environments**:
  - **Claude Code** (CLI)
  - **Google Antigravity** (IDE / Desktop) or **AGY CLI**
  - **OpenAI Codex** (CLI with multi-agent feature enabled)
  - **GitHub Copilot** (VS Code Copilot Chat or Copilot CLI)
- **Runtime for Adapter CLI**: Node.js 20+, Bun, or Deno (zero dependencies).
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

Run the adapter for your target platform (by default, it installs globally on your machine so you can use the factory across all your projects):

### 1. Google Antigravity & AGY CLI

Installs the pipeline as a global plugin in `~/.gemini/config/plugins/agentic-feature-factory/`:

```bash
# Using Bun:
bun run adapt antigravity

# Using npm:
npm run adapt antigravity
```

Every command becomes a skill (`feature-brainstorm`, `feature-plan`, `arch-review`, `feature-dev`, `feature-patch`, `feature-review`, `feature-docs`, `feature-next`), alongside the build skills `spring-maven-build` and `node-frontend-build`; they are immediately discovered by both Antigravity IDE and AGY CLI. You can invoke them naturally (e.g. *"Plan feature 5"*) or via slash commands (e.g. `/feature-plan 5`).

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

In VS Code Copilot Chat or Copilot CLI, type `/` to access every command (`/feature-brainstorm`, `/feature-plan`, `/arch-review`, `/feature-dev`, `/feature-patch`, `/feature-review`, `/feature-docs`, `/feature-next`).

### 4. Claude Code

Claude Code loads plugins from a registered **marketplace** (it snapshots them into
`~/.claude/plugins/cache/`), so there is nothing to copy — only to register.

**From GitHub** (recommended):
```
/plugin marketplace add Elverle/agentic-feature-factory
/plugin install agentic-feature-factory@agentic-feature-factory
```

**From your local clone** (to use your own edits):
```bash
npm run adapt claude                    # or: bun run adapt claude
```

The adapter registers the clone as a `directory` marketplace and enables the plugin in
`~/.claude/settings.json` (merging with your settings, never overwriting them). With
`--scope project` it writes the GitHub source into the current project's
`.claude/settings.json` instead, so everyone on the team gets the plugin. Restart Claude Code
afterwards; if `/help` does not list the commands, run
`/plugin install agentic-feature-factory@agentic-feature-factory`.

Model tiers (`models.claude.*`) need no install step: `/feature-dev` and `/feature-review`
read them at dispatch time.

### All Platforms at Once

```bash
bun run adapt all
# or: npm run adapt all
```

### Updating an existing installation

The adapters for Antigravity, Codex and Copilot **copy** the commands, agents and skills into
each platform's directory: an installed copy does not follow this repository. Every time you pull a new version — or edit a
command/agent yourself — re-run the adapter for the platforms you use:

```bash
git pull
npm run adapt all          # or: bun run adapt all — regenerates every platform
```

Where each platform reads them from, and what a re-run refreshes:

| Platform | Installed copy | Refreshed by |
| --- | --- | --- |
| Antigravity & AGY CLI | `~/.gemini/config/plugins/agentic-feature-factory/` (`skills/`, `rules/AGENTS.md`) | `npm run adapt antigravity` |
| OpenAI Codex | `~/.codex/agents/`, `~/.codex/prompts/` | `npm run adapt codex` |
| GitHub Copilot | `~/.copilot/prompts/` (or `.github/prompts/` with `--scope project`) | `npm run adapt copilot` |
| Claude Code | `~/.claude/plugins/cache/agentic-feature-factory/` (marketplace snapshot) | `/plugin marketplace update agentic-feature-factory` (see below) |

**Claude Code** — from GitHub or from a local clone alike — runs the snapshot taken at install
time, so refresh it:

```
/plugin marketplace update agentic-feature-factory
```

Then **restart the session** — plugin commands and agents are loaded at startup. Check with
`/help` that the new commands are there (e.g. `/feature-review`).

> `--mode link` symlinks the build skills instead of copying them, but commands and agents are
> always written out because the adapter injects their `model:` frontmatter — so a re-run
> stays necessary for those.

A new version may also add **settings keys** (e.g. the `git.*` block in 1.4.0). They are always
optional: the documented defaults apply when a key is missing, so an existing
`.agentic-feature-factory.local.md` keeps working untouched.

## Quick start: one full cycle

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
   (`mvn verify` or the frontend build) — it must be green before advancing (with
   `commit_per_wp: true`, each WP of the wave is committed here, on a green gate only);
3. once all WPs are complete, **stops**, summarizes the work and **offers you the review**: on
   a yes it runs the `/feature-review 5` flow and leaves you the findings — **you handle
   triage and fixes**; on a no it moves on;
4. **documents** the feature in the project wiki and, if something user-facing changed, in the
   project **README** (via `feature-documenter`);
5. **bumps the project version** (asking you to confirm it, by default) and **commits** the
   feature on a dedicated branch `feature/5-<slug>` — without asking only if
   `auto_commit: true`, and **never pushing** unless you ask;
6. closes, updating `feature-index.md`.

If a run is interrupted, `/feature-dev 5` picks up from the first work package not yet ticked
in the plan's checklist.

### Patches and bugfixes — `/feature-patch`

A bug in feature 5, or a small tweak that touches a few files and changes no contract or API,
does not need a spec or a plan:

```
/feature-patch 5 PDF export ignores the page orientation
```

It attaches to feature 5 (without a number: to the last developed feature), diagnoses the
problem — for a bug, it reproduces it and defines the failing test — then dispatches one
Implementer, runs the gate, offers the review, updates the docs only if something documented
changed, bumps the **patch** version and commits on `fix/5.1-<slug>`. The trace:

```
content/
├── feature-index.md          # | 5.1 | PDF orientation fix | implemented | … | patch-5.1.md |
└── feature/
    └── feature-5/
        ├── plan.md
        └── patch-5.1.md       # symptom, diagnosis, change, verification, review, commit
```

If the diagnosis shows more files or a contract change, it stops and proposes the full
workflow, keeping the diagnosis as the planning input. `/feature-brainstorm` routes a request
that turns out to be a fix the same way.

### At any point — `/feature-next`

Reads the index, the feature folders, the branches and the working tree, and tells you the
natural next step with its evidence — e.g. *"`/feature-dev 5`: plan and architecture review
present, no feature branch yet"*. It flags index rows that disagree with what is on disk,
then offers to launch the command for you. It never merges, pushes or opens PRs.

### The flow at a glance

```
/feature-brainstorm 5  →  /feature-plan 5  →  /arch-review 5  →  /feature-dev 5
  explores intent +         analyzes + asks       reviews and          orchestrates Implementers
  approaches & YAGNI        → plan.md             assigns fixes        → gate per wave
  → spec.md                                                            → offers /feature-review
                                                                       → wiki + README
                                                                       → version bump → commit

                                                       /feature-review 5   (optional, standalone)
                                                         feature-reviewer on the diff
                                                         → findings by severity, triage is yours

/feature-patch  (bugfix / small patch) diagnosis → gate → review? → docs → patch commit
/feature-next   (any time) reads the project's state → the next command, offered to launch
```

## What's inside

| Component | Type | What it does |
| --- | --- | --- |
| `/feature-brainstorm <n\|description>` | command / skill | Explores user intent and technical approaches through proactive questions; cuts unnecessary scope (YAGNI) and produces a validated specification (`spec.md`) |
| `/feature-plan <n\|description> [spec]` | command / skill | Analyzes codebase + requirements, **asks you questions**, then produces the work-package plan; resolves the planning layout and handles numbering and feature folders |
| `/arch-review [n]` | command / skill | Architecture review of the codebase against a planned feature (or the whole planned set) |
| `/feature-dev <n> [plan-path]` | command / skill | Orchestrates Implementer subagents and verification gates, offers the optional review, then documentation, version bump and commit on a dedicated branch |
| `/feature-patch [n\|n.x] <description>` | command / skill | Light path for bugfixes and small patches (few files, no contract or API change): diagnosis, one Implementer with the build gate, optional review, docs, patch version bump and commit — traced as patch `n.x` of a feature; proposes the full workflow when the change is bigger |
| `/feature-review [n\|path]` | command / skill | **Optional, standalone** code-review: dispatches `feature-reviewer` on the feature's diff and reports findings by severity — no fixes, no commits |
| `/feature-docs [scope]` | command / skill | Documents in wiki format via `feature-documenter` (feature / area / `lint`) and updates the project README when something user-facing changed, standalone |
| `/feature-next [n]` | command / skill | Reads the project's feature state (index, feature folders, branches, working tree) and tells you the next command to run, then offers to launch it; read-only until you confirm |
| `implementer` | agent | Executes ONE work package test-driven, within the WP's file boundaries; dispatched in parallel by `/feature-dev` |
| `feature-documenter` | agent | Updates the project wiki (and the README, when the feature is user-facing) adopting the **project's** conventions (AGENTS.md/CLAUDE.md/GEMINI.md → existing wiki format → default structure) |
| `feature-reviewer` | agent | Reviews a feature's diff for correctness, security, silent failures, performance, tests and contract drift; read-only, reports findings by severity |
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

# Optional: git behaviour of /feature-dev's closing phase (these are the defaults)
git:
  auto_commit: false      # true: commit without asking for confirmation
  commit_per_wp: false    # true: also one commit per work package, on a green gate only
  branch_prefix: feature/ # dedicated branch: <branch_prefix><feature-number>-<slug>
  version_bump: ask       # ask | patch | minor | none — before the feature commit

# Optional: configure model tiers per platform
# `reviewer` (used by /feature-review) falls back to `orchestrator` when omitted
models:
  codex:
    orchestrator: gpt5.6-sol
    implementer: gpt5.6-luna
    reviewer: gpt5.6-sol
  claude:
    orchestrator: opus
    implementer: sonnet
    reviewer: opus
  antigravity:
    orchestrator: pro
    implementer: inherit
    reviewer: pro
  copilot:
    orchestrator: gpt-4o
    implementer: gpt-4o
    reviewer: gpt-4o
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
        ├── spec.md                     # validated spec (output of /feature-brainstorm, optional)
        ├── requirements.md             # decisions from /feature-plan's questions
        ├── plan.md                     # WP plan (output of /feature-plan, input of /feature-dev)
        └── architecture-review-<date>.md   # feature review (output of /arch-review <n>)
```

**Feature status** in the index follows the pipeline: `specified` (`/feature-brainstorm`) →
`planned` (`/feature-plan`) → `in-progress` → `implemented` (`/feature-dev`) → `reviewed` →
`done`. `/feature-next` trusts the evidence on disk and in git over the index, and reports
any drift between the two.

## Configuration

- **Per-repo settings**: `.agentic-feature-factory.local.md` with `plans_dir`, `wiki_dir`,
  `git` and platform `models` in the frontmatter (see example in `.agentic-feature-factory.local.example.md`).
- **Git behaviour** (`git.*`, all optional — the defaults are the conservative ones):

  | Key | Default | Effect |
  | --- | --- | --- |
  | `auto_commit` | `false` | `true`: `/feature-dev` commits without asking. `false`: it shows you the files and the message and waits |
  | `commit_per_wp` | `false` | `true`: one commit per work package too, made only after that wave's gate is green |
  | `branch_prefix` | `feature/` | The dedicated branch is `<prefix><feature-number>-<slug>`; the pipeline never commits on `main`/`master` |
  | `version_bump` | `ask` | `ask`: proposes the new version and waits. `patch`/`minor`: applies it silently. `none`: skips the bump |

  Pushing and opening a PR are **never** automatic: you ask for them explicitly.
- **Configurable model tiers**:
  - **Codex**: Orchestrator defaults to `gpt5.6-sol`, Implementer to `gpt5.6-luna`.
  - **Claude Code**: Orchestrator defaults to `opus`, Implementer to `sonnet`.
  - **Antigravity & AGY CLI**: Orchestrator defaults to `pro`, Implementer to `inherit`.
  - **GitHub Copilot**: Orchestrator defaults to `gpt-4o`, Implementer to `gpt-4o`.
  - **Reviewer** (`feature-reviewer`): defaults to the platform's **orchestrator** model — a
    review is reasoning work, so never run it on a lower tier.
  Models can be customized in `.agentic-feature-factory.local.md` or overridden on the command line via `--orchestrator <model>`, `--implementer <model>` and `--reviewer <model>`.
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
- **The code-review is optional and separate.** `/feature-dev` offers it after the
  implementation and before the documentation, but never runs it on its own and never applies
  its findings without your say-so; `/feature-review` also stands alone on any diff.
- **Every feature closes with a commit**, on a dedicated branch and never on `main` —
  documentation and version bump land in the same commit. Confirmation is required unless you
  set `auto_commit: true`; **push and PR are never automatic**.
- **Documentation integrated, on the project's terms.** Every feature is documented via
  `feature-documenter` just before the commit: it mimics the existing wiki's format (naming,
  links, frontmatter, language) instead of imposing its own, and touches the project README
  only when the feature changed something user-facing. Its default structure applies only to
  projects with no documentation at all.
- **No stubs between parallel WPs.** If a WP depends on code that doesn't exist yet, that's a
  wave-ordering error: the Implementer returns BLOCKED instead of inventing placeholder
  interfaces.
- **Portability.** The commands hardcode no project's pain points or paths: they resolve the
  planning layout at runtime (settings file → discovery → default).

## Developing the plugin

The `.md` files in `commands/`, `agents/` and `skills/` are the source of truth; the adapter
generates every platform's copy from them. Before opening a PR:

```bash
npm test        # registry ↔ files, README coverage, manifest versions, adapter output
```

Contributor rules (adding a command, releasing a version, language) are in
[AGENTS.md](AGENTS.md); release notes are in [CHANGELOG.md](CHANGELOG.md).

## License

MIT — see [LICENSE](LICENSE).
