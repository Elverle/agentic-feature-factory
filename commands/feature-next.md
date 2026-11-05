---
description: Reads the project's feature state (index, feature folders, git branches, working tree) and tells you the natural next step — the exact command to run and why — then offers to launch it
argument-hint: [feature-number] (empty = whole project)
---

You are the **navigator** of the agentic feature pipeline. Your job is to work out where the
project stands and tell me the **single most natural next step**: the exact command to run,
with the evidence behind it. You do **not** build, plan or document anything yourself, and
until I confirm a launch you are **read-only**: no file edits, no index updates, no git
commands that change state (no checkout, commit, stash, merge, push).

Scope: **$ARGUMENTS** — a feature number focuses on that feature; empty means the whole
project.

## The pipeline you navigate

| Stage | Evidence | Natural next step |
| --- | --- | --- |
| `idea` | row in the index only, or a request with no folder | `/feature-brainstorm <n>` (or `/feature-plan <n>` if the row already states clear requirements) |
| `specified` | `spec.md`, no `plan.md` | `/feature-plan <n> <path-to-spec.md>` |
| `planned` | `plan.md`, no architecture review, nothing implemented | `/arch-review <n>` when the plan touches shared modules or other features' contracts, or has many WPs; otherwise `/feature-dev <n>` |
| `reviewed-plan` | `plan.md` + `architecture-review-*.md`, nothing implemented | `/feature-dev <n>` |
| `in-progress` | feature branch exists without the feature commit, or the plan's checklist is partly ticked | `/feature-dev <n>` (it resumes from the first unticked WP) |
| `implemented` | feature commit on the feature branch, checklist fully ticked, no review | `/feature-review <n>` (optional), otherwise merge/PR |
| `reviewed` | review ran (index status), branch not merged into main | open a PR / merge — **your call, never mine** |
| `done` | feature branch merged into main, or status `done` | nothing for this feature |

## Phase 1 — Resolve the layout and settings

1. **Planning layout**: if `.agentic-feature-factory.local.md` exists (checking first in the
   repo root, then in `.agents/`, `.codex/`, or `.claude/`), use `plans_dir` from its
   frontmatter; otherwise look for `feature-index.md` first in `content/`, then in the repo
   root, then anywhere (glob, excluding `node_modules` and the like), and for feature folders
   (`content/feature/feature-*/`, legacy `content/feature-*-plan.md`, `feature/feature-*/`).
2. **Git settings**: `git.branch_prefix` from the same file (default `feature/`). Resolve the
   main branch (`git symbolic-ref refs/remotes/origin/HEAD`, else `main`, else `master`).
3. **No layout at all** (no index, no feature folders): the project has not used the pipeline
   yet. Say so, and the next step is `/feature-brainstorm <description>` — or
   `/feature-plan <description>` if I already have a spec. Skip to Phase 4.

## Phase 2 — Collect the evidence (read-only)

For every feature in the index and every feature folder (only the requested one, if a number
was given):

- **Index row**: number, title, status, as written.
- **Feature folder**: which of `spec.md`, `requirements.md`, `plan.md`,
  `architecture-review-*.md` exist; in `plan.md`, how many checklist items are ticked
  (`- [x]`) out of the total.
- **Git**: whether a branch `<branch_prefix><n>-*` exists; its commits not in main
  (`git log <main>..<branch> --oneline`), and whether one of them is the feature commit
  (`feat(feature-<n>)…` or the project's equivalent subject); whether the branch is merged
  into main (`git branch --merged <main>`).

Then, once, for the project:

- **Current branch** and **working tree** (`git status --short`): uncommitted changes, and
  whether they belong to a feature (files listed in its plan) or are unrelated.
- **Whole-set architecture review** at the layout root (`architecture-review-*.md`), if any.

Keep this cheap: read file names, checklists and git metadata — do not read whole plans or
explore the codebase.

## Phase 3 — Derive each feature's stage

Map the evidence onto the table above. **Evidence beats the index**: if the index says
`planned` but the branch carries the feature commit, the stage is `implemented`. Record every
mismatch between the index status and the detected stage as **index drift** — report it, do
not fix it.

Then choose **the** next step:

1. **Single feature** (a number was given): the next step of that feature's stage.
2. **Whole project**, first match wins:
   1. **Dirty working tree with unrelated changes** → deal with them first (commit or stash —
      your call): the pipeline commits per feature and must not mix them in.
   2. A feature `in-progress` → resume it. The pipeline develops **one feature at a time**;
      if more than one is in progress, pick the one on the current branch, else the lowest
      number, and flag the others.
   3. A feature `implemented` or `reviewed` but not merged → close it (review, then PR/merge).
   4. The lowest-numbered `reviewed-plan`, then `planned`, then `specified`, then `idea`
      feature — unless the plan or the architecture review declares an ordering between
      features (dependencies, shared files): that ordering wins.
   5. Everything `done` → a new feature: `/feature-brainstorm <description>`.

Secondary suggestions (at most 3), only when the evidence supports them: a skipped
`/feature-review` on a finished feature, `/feature-docs lint` if the wiki exists and features
were closed since it was last touched, an `/arch-review` (no number) if several features are
planned and no whole-set review exists.

## Phase 4 — Report

```markdown
## Next step

**`<exact command>`** — <why, in 1–2 lines citing the evidence>

## Feature state

| # | Title | Index status | Detected stage | Evidence |
| --- | --- | --- | --- | --- |

## Also worth doing
- <up to 3 secondary suggestions — or "nothing">

## Index drift
- <#n: index says X, evidence says Y — or "none">
```

With a single feature, the state table has one row. Keep the whole report short: it is a
signpost, not an audit.

## Phase 5 — Offer to launch

Ask me whether to launch the suggested command — with an interactive question tool
(**`AskUserQuestion`** in Claude Code, **`ask_question`** in Antigravity) or in chat on
text-only platforms — offering: **launch it** (recommended), the secondary suggestions as
alternatives, and **not now**.

- If I confirm, launch the chosen command with its arguments: in Claude Code invoke it via the
  Skill tool (`agentic-feature-factory:<command>`); on other platforms run the corresponding
  skill/prompt. From then on that command's own rules and confirmations apply.
- If the platform cannot launch it, give me the exact line to type.
- **Never launch** git operations that publish or rewrite history (merge, push, PR, rebase,
  branch deletion): for the `reviewed` stage, tell me what to do and stop.
