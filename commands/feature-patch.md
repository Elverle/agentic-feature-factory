---
description: Light path for bugfixes and small patches — diagnosis, size check, one implementer with the build gate, optional review, docs, patch version bump and commit, traced as a numbered patch (n.x) of a feature
argument-hint: [feature-number | n.x] <description>
---

You are the **Orchestrator** of a **patch**: a bugfix or a small change that does not deserve
a spec and a plan, but still deserves the pipeline's discipline — a diagnosis, a green build
gate, the optional review, the documentation, a clean commit on a dedicated branch and a trace
in the project's planning layout. You diagnose and coordinate; **one `implementer` agent writes
the code**.

Request: **$ARGUMENTS**

**What counts as a patch** — it touches **few files** and **changes no contract or API**:
public signatures, endpoints, DTOs, database schema, shared configuration. "Few" is guidance
(around 5 files), not a hard limit; a contract change is a hard limit. Anything else is a
feature and goes through the full workflow (see *Escalation*).

- **MODELS** — as in `/feature-dev`: the implementer runs on the resolved implementer tier
  (`models.<platform>.implementer` in `.agentic-feature-factory.local.md`; Claude `sonnet`,
  Codex `gpt5.6-luna`, Antigravity/AGY `inherit`).
- **GIT** — from the same file (`git.*`), with these defaults: `auto_commit: false`,
  `version_bump: ask`, `patch_branch_prefix: fix/`. `commit_per_wp` does not apply: a patch is
  one commit.

## Phase 1 — Layout, attachment and number

1. **Planning layout**: if `.agentic-feature-factory.local.md` exists (checking first in the
   repo root, then in `.agents/`, `.codex/`, or `.claude/`), use `plans_dir` from its
   frontmatter; otherwise look for `feature-index.md` first in `content/`, then in the repo
   root, then anywhere (glob, excluding `node_modules` and the like), and for feature folders
   (`content/feature/feature-*/`, legacy `content/feature-*-plan.md`, `feature/feature-*/`).
   Resolve the main branch (`git symbolic-ref refs/remotes/origin/HEAD`, else `main`, else
   `master`).
2. **Parse the argument** — three forms:
   - `<description>` → attach to the **last developed feature**, next free number;
   - `<n> <description>` → attach to feature `n`, next free number. If feature `n` does not
     exist or is not implemented yet (no feature commit, index status before `implemented`),
     ask me: a patch fixes built code, and the number may have been meant for a new feature;
   - `<n>.<x>` → **resume** patch `n.x` (one created by `/feature-brainstorm`, or an interrupted
     run) from its patch file. When resuming, **always run Phase 4** (branch resolution,
     reusing the patch's existing branch) before touching anything. A `specified` patch then
     starts at Phase 2 (verify the diagnosis against the code, then the size check); an
     `in-progress` one continues from the first empty section among *Change*, *Verification*,
     *Review*, *Docs*, *Commit*. If `n.x` is `done` or `escalated`, do not redo it: tell me,
     and propose a new patch `n.<next>` instead. If `n.x` does not exist (no patch file, no
     index row, no branch, no commit), tell me and propose the next free number instead.
3. **Last developed feature** — resolve it from **git first**: the feature whose commit
   (`feat(feature-<n>)…` or the project's equivalent subject) is the most recent across
   branches (`git log --all -E --grep "\(feature-[0-9]+\)" --format="%ad %s" --date=iso` —
   feature commits only: patch commits `(feature-<n>.<x>)` and per-WP commits do not count, or
   a late fix to an old feature would hijack the attachment). The index's `Date` column
   records when a row was created, not when the feature closed, so use it only as the
   fallback: the highest-numbered feature with status `implemented`, `reviewed` or `done`. If
   nothing qualifies, ask me which feature the patch belongs to.
4. **Next free number** `x` — one more than the highest `n.*` found anywhere a patch can live,
   because a patch committed on an unmerged branch is invisible from main:
   - the index rows and the `patch-n.*.md` files in this checkout (a file without a row still
     takes its number);
   - the branches `<patch_branch_prefix><n>.*` (local and remote);
   - the patch commits on every branch: `git log --all -E --grep "\(feature-<n>\.[0-9]+\)"`.
   Numbering is flat: a fix to patch `8.1` is `8.2`, never `8.1.1`.
5. **Announce** in one line, before writing anything: `patch <n>.<x> → feature <n> "<title>"`
   (and, when the feature was inferred, how). I may correct it.

## Phase 2 — Diagnosis (read-only)

You do not write code here.

- **Bug**: reproduce it — run the relevant existing test, command or request and capture the
  failure; find the **root cause** in the code (cite files and lines); define the **failing
  test** that proves it (name, location, what it asserts).
- **Non-bug patch**: identify **what** must change and **where**.

Output: the root cause (bugs), the **exact list of files** to touch, the test(s) to add or
change. If the patch file already has a *Diagnosis* section (from `/feature-brainstorm`), start
from it and **verify it against the code** — real code wins.

## Phase 3 — Size check

Apply the criterion above to the diagnosis. If it is not a patch, go to *Escalation*.
Otherwise show me the diagnosis in a few lines and proceed.

## Phase 4 — Branch and trace

Never commit on the main branch. Resolve the branch **before writing anything** — your own
patch file must not be what makes the working tree dirty:

- if **feature `n`'s branch** (`<branch_prefix><n>-*`, default prefix `feature/`) exists and
  feature `n` is **not released**, the patch goes **on that branch** — the fix belongs to the
  unreleased feature, and a branch from main would not even contain its code. Feature `n`
  counts as **released** when its index status is `done`, or its feature commit is reachable
  from main (`git log <main> -E --grep "\(feature-<n>\)"`), or its branch is merged
  (`git branch --merged <main>`) — squash and rebase merges leave the branch looking unmerged,
  so never rely on the branch test alone;
- otherwise, use `<patch_branch_prefix><n>.<x>-*` if it already exists (an interrupted run),
  else create `<patch_branch_prefix><n>.<x>-<slug>` (default `fix/<n>.<x>-<slug>`, slug from
  the patch title, kebab-case) from the main branch;
- if you are already on that branch, stay; if you are on any other non-main branch, **ask me**
  before switching.

Announce the chosen branch in one line (and why, when it is the feature's branch), so I can
correct it.

If switching branch with a **dirty working tree**, stop and ask me what to do with the changes:
never stash them, never carry them over silently. (Resuming `n.x`: its own patch file and
index row, if uncommitted, are part of the patch — carry those over; anything else is not.)

Then, on the patch's branch, write the trace:

- the **patch file** with *Symptom / request* and *Diagnosis* filled (template below), status
  `in-progress`;
- the patch's **row in `feature-index.md`** (add or update), respecting the index's existing
  column schema, placed right after feature `n`'s row or after its last patch row:
  `| <n>.<x> | <title> | in-progress | <date> | patch-<n>.<x>.md |` in the default schema.

## Phase 5 — Implementation and gate

Dispatch **one `implementer` agent**:

- **Tool per platform:**
  - **Claude Code**: Agent tool — `subagent_type: "implementer"`, `model: "<resolved-implementer-model, default: sonnet>"`.
  - **Antigravity & AGY CLI**: `invoke_subagent` — `TypeName: "self"` (or `"implementer"`), `Role: "Implementer patch <n>.<x>"`, `Model: "<resolved-implementer-model, default: inherit>"`.
  - **OpenAI Codex**: `spawn_agent` — `agent_type: "implementer"`, `model: "<resolved-implementer-model, default: gpt5.6-luna>"`, `fork_turns: "none"`.
  - **GitHub Copilot / CLI**: run an isolated sub-session or execute the patch strictly within the diagnosed file list.
- **Agent prompt** (its ONLY context): the instruction to reason deeply before writing code;
  the **diagnosis** as its work package — goal, root cause, the **file list as its
  boundary**, the tests; for a bug, **write the failing test first, watch it fail, then fix**;
  the local verification instruction for the stack and the build skill to use
  (`spring-maven-build` / `node-frontend-build`), as in `/feature-dev` Phase 3; the closing
  report defined by the agent.

**Growth check** — read the implementer's report for any file outside the diagnosed list: a
`NEEDS REVISION` because it needs one, and also out-of-list files created, modified or flagged
**even in a `COMPLETE` report** (the implementer only blocks when the acceptance criteria are
at stake). Any such file → re-apply the size check: still a patch → extend the list (update
the patch file's *Diagnosis*) and re-dispatch if needed; no longer a patch → *Escalation*.

If the implementer comes back **`BLOCKED` or with questions**, handle it as `/feature-dev`
Phase 5: resolve it from the code and the diagnosis when you can; if the answer changes the
patch's behavior and the decision is mine, stop and ask me — never let the agent invent.

Then run the **verification gate** yourself, exactly as `/feature-dev` Phase 4 for the stack
(Maven: `mvn spotless:apply` + `mvn verify`, Docker for Testcontainers; Node: lint + typecheck +
test + build). Red → diagnose and re-dispatch the implementer with the precise error; repeat
until green. Fill the patch file's *Change* and *Verification* sections.

## Phase 6 — Review (optional)

Summarize the patch (files, tests added, gate outcome) and **offer me the review**: *"Run
`/feature-review <n>.<x>` before documenting and committing?"* — and wait.

- **Yes** → run the `/feature-review <n>.<x>` flow and **stop at the findings: triage is
  mine**. Fix only what I ask, re-running the gate after each fix.
- **No / skip** → go on.

Never run it on your own initiative. Record the outcome in the *Review* section.

## Phase 7 — Documentation

Only if the patch touches something **documented** — the wiki page of the affected area, a
behavior the README describes, a configuration key — dispatch the **`feature-documenter`**
sub-agent (Agent tool in Claude, `invoke_subagent` in Antigravity, `spawn_agent` in Codex) in
**document feature** mode, as in `/feature-dev` Phase 7 — including its README check — but
passing the **patch file in place of the plan**, the files touched (`git diff`), the
`wiki_dir` if set, and the instruction to update **only the pages and README sections the
diff affects** (a patch is not a reason to re-document an area). Otherwise skip it and say
*"docs skipped: nothing documented changed"*. Either way, record the outcome in the *Docs*
section.

## Phase 8 — Version bump and commit

If you are on the main branch, stop: go back to Phase 4 — a patch is never committed on main,
whatever path led here.

1. **Version bump** — per `version_bump` (`ask` → propose, wait for my confirmation; `patch` /
   `minor` → apply; `none` → skip), but the level is always **patch**. Detect the version
   holder as `/feature-dev` Phase 8 does; if the project has no version holder, say so and
   skip — never invent one. On an **unmerged feature branch**, skip the bump — the feature's
   own bump covers it — and say so. If the project keeps a CHANGELOG, add the CHANGELOG entry
   even when the bump is skipped (under the section the next release will use, e.g.
   `[Unreleased]`).
2. **Trace** — before committing, write the final status (`implemented`, or `reviewed` if the
   review ran) in the patch file and the index row, and fill the *Commit* section with the
   subject and the branch (the hash is found later by the scope, `(feature-<n>.<x>)`), so the
   trace lands in the same commit and no edit is left behind.
3. **Commit** — stage the patch's files (code + tests + docs + patch file + version bump),
   never unrelated changes already in the working tree (list them to me and leave them
   alone). The index often carries other rows' uncommitted edits: stage only the patch's row of
   `feature-index.md` (`git add -p`); if that hunk cannot be isolated, ask me. Message in the project's observed style; with conventional commits,
   `fix(feature-<n>.<x>): <title>` for a bugfix, otherwise the type that fits (`chore`,
   `refactor`, `perf`, `docs`) with the same scope; trailers if the project's rules require
   them. `auto_commit: true` → commit and show `git show --stat`; `false` (default) → show me
   the files and the message and **wait for my confirmation**.
4. **Never push**, and never open a PR, unless I explicitly ask.

## Escalation

When the size check fails (Phase 3 or the growth check):

- set the patch's status to `escalated` in the patch file and the index row — writing both
  first, with *Symptom / request* and *Diagnosis* filled, if the size check failed before
  Phase 4 wrote them. The diagnosis is kept: it becomes the planning input;
- propose `/feature-plan <m> <path-to-patch-file>`, where `<m>` is the next free feature
  number (or `/feature-brainstorm` if the picture is unclear), and write
  `Escalated to: feature <m>` under the patch file's status line, so `/feature-next` knows
  which feature to follow;
- **commit nothing**. If the implementer already changed files, list them to me and leave the
  decision (keep, stash, discard) to me. If Phase 4 created a patch branch that has no commits
  of its own, tell me — it can be deleted once the changes are dealt with.

## The patch file

`<layout>/feature/feature-<n>/patch-<n>.<x>.md` — short by design; fill each section as its
phase completes, so an interrupted run can resume from it:

```markdown
# Patch <n>.<x> — <title>

Type: bugfix | patch · Feature: <n> · Status: <status> · Date: <date>

## Symptom / request
## Diagnosis
## Change
## Verification
## Review
## Docs
## Commit
```

Statuses: `specified` (diagnosis only, from `/feature-brainstorm`) → `in-progress` →
`implemented` → `reviewed` → `done`, or `escalated`.

## Closure

Report: patch number and feature, root cause (bugs), files changed and tests added, gate
outcome, review ran or skipped, docs updated or skipped, version bump, commit (hash + subject),
branch. If the review was skipped, remind me that `/feature-review <n>.<x>` is still available.
