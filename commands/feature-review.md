---
description: Optional code-review of an implemented feature — dispatches the feature-reviewer agent on the feature's diff and reports the findings by severity (no fixes, no commits)
argument-hint: [feature-number | path | "--focus <area>"]
---

You are the orchestrator of the **code-review**. You do not review the code yourself: you
resolve *what* has to be reviewed, you dispatch the **`feature-reviewer`** sub-agent with all
the context it needs, and you present me its findings. This command is **optional and
standalone**: `/feature-dev` suggests it after the implementation, but does not run it.

**Requested scope:** `$ARGUMENTS`

- **MODELS** — the reviewer runs on the **reviewer tier** resolved from
  `.agentic-feature-factory.local.md` (`models.<platform>.reviewer`); if that key is absent it
  falls back to the **orchestrator** model of the platform (Claude `opus`, Codex `gpt5.6-sol`,
  Antigravity/AGY `pro`, Copilot the session's model). A review is reasoning work: never run
  it on a lower tier than the orchestrator's.

## Step 1 — Resolve the review target

Parse the argument:

- **a feature number** (e.g. `5`) → review that feature's work. Locate its plan (resolve the
  planning layout: `plans_dir` from `.agentic-feature-factory.local.md` — checking the repo
  root, then `.agents/`, `.codex/`, `.claude/` — otherwise `content/`, then the repo root) and
  its architecture review, if present.
- **a path/area** (e.g. `src/main/java/.../service`) → restrict the diff to that path.
- **empty** → review the recent work on the current branch.
- **`--focus <area>`** (combinable with the above) → pass the focus to the agent (e.g.
  `--focus security`, `--focus performance`).

Then determine the **diff**, in this order:

1. If the working tree is **dirty**, review the uncommitted changes: `git status --short` +
   `git diff` (and `git diff --cached`); include new untracked files in the file list.
2. Otherwise, if the current branch is **not** the main one, review the branch:
   `git diff <main-branch>...HEAD` (resolve the main branch: `git symbolic-ref
   refs/remotes/origin/HEAD`, else `main`, else `master`).
3. Otherwise, if you are on the main branch with a clean tree, review the commits of the
   feature: find them by message/number (`git log --oneline --grep "feature-<n>"`) and diff
   their range. If you cannot identify them unambiguously, **ask me** which range to review —
   do not review the whole repository.

State the resolved target to me in one line (command + number of files + insertions/deletions)
before dispatching.

## Step 2 — Gather the context for the agent

Collect, when available:

- the feature's **plan** (path and the *Shared contracts* / *Shared conventions* /
  *acceptance criteria* sections), and its **architecture review** with the grafted fixes
  (`P#`) that should be present in the diff;
- the project's **stack** and its verification commands (from the build skills
  `spring-maven-build` / `node-frontend-build`, if they apply);
- the **changed file list** and the diff command the agent has to run itself.

## Step 3 — Dispatch `feature-reviewer`

- **Tool per platform:**
  - **Claude Code**: Agent tool — `subagent_type: "feature-reviewer"`, `model: "<resolved-reviewer-model, default: the orchestrator's>"`.
  - **Antigravity & AGY CLI**: `invoke_subagent` — `TypeName: "feature-reviewer"` (or `"self"`), `Role: "Reviewer feature <n>"`, `Model: "<resolved-reviewer-model>"`.
  - **OpenAI Codex**: `spawn_agent` — `agent_type: "feature-reviewer"`, `model: "<resolved-reviewer-model, default: gpt5.6-sol>"`, `fork_turns: "none"`.
  - **GitHub Copilot / CLI**: run the review in an isolated sub-session with the same prompt.
- **Agent prompt** (its ONLY context is what you pass it): the **diff command** and changed
  file list, the **plan** sections and the **review grafts** to verify, the **stack** and its
  verification commands, the **focus** if requested, and the instruction to close with the
  **structured report** defined in its body (findings by severity, plan adherence,
  pre-existing issues, not reviewed).
- **Splitting (only for a large diff):** if the diff spans clearly separate areas (e.g.
  backend and frontend) or more than ~40 files, dispatch **one reviewer per area**, with
  **disjoint file sets**, launched **in the same response / tool call batch** so they run in
  parallel. Otherwise one reviewer is enough.

## Step 4 — Present the findings

When the agent (or agents) return:

1. Present me the findings **ordered by severity** (BLOCKER → MAJOR → MINOR → QUESTION),
   each with file:line, the concrete scenario and the suggested fix. Merge duplicates if you
   dispatched several reviewers.
2. **Stop at the findings: triage and fixes are mine.** Do not apply corrections on your own,
   do not run formatters, do not commit.
3. Only if I ask you to fix a specific finding: dispatch a targeted **`implementer`** on it
   (or apply it yourself if trivial), then **re-run the stack's verification gate** (BE:
   `mvn spotless:apply` + `mvn verify` with Docker for the ITs; FE: lint + typecheck + test +
   build) and report the outcome.

Do not use the `ultra`/cloud review variant: it is metered and I launch it myself if I want it.
This flow runs in-session.
