# `/feature-patch` — a light path for patches and bugfixes

Status: design, awaiting approval · Date: 2026-11-05

## Intent

The pipeline today only fits large features (brainstorm → plan → arch-review → dev → review →
docs → commit). For a bugfix or a small patch, spec and plan are overkill, so the user skips
the plugin entirely — and loses the parts of the workflow that still matter: a green build
gate, the optional review, documentation, a clean commit on a dedicated branch, and a trace of
the change in the project's structure.

`/feature-patch` keeps those parts and drops the planning ones. When the work turns out to be
bigger than a patch, it says so and proposes the full workflow instead of forcing it through.

## Goals

- A command `/feature-patch [n | n.x] <description>` for bugfixes and small patches:
  diagnosis → size check → implementation with a green gate → optional review → docs →
  version bump (patch) → commit.
- Every patch is **traced**: a row `n.x` in `feature-index.md` and a small file in the
  feature's folder.
- `/feature-brainstorm` recognizes when the request is a fix rather than a feature and routes
  it to `/feature-patch`.
- `/feature-next` and `/feature-review` understand patch rows (`8.1`).

## Non-goals

- No spec, no WP plan, no architecture review for a patch.
- No hotfix/backport workflow (cherry-picks onto release branches, patching an old version).
- No patch spanning several features: a patch attaches to exactly one feature.
- No nested numbering: a fix to patch `8.1` is `8.2`, never `8.1.1`.

## Anti-goals (failure even if it "works")

- A patch that silently grows into a feature: more files, changed contracts, still committed
  as a patch.
- Skipping the build gate, or committing on the main branch.
- Making the light path heavier than doing it by hand (extra confirmations, long documents).

## Decisions taken with the user

1. **What counts as a patch**: it touches **few files** and **changes no contract or API** —
   public signatures, endpoints, DTOs, database schema, shared configuration. Otherwise it is
   a feature: propose `/feature-plan` (or `/feature-brainstorm` if the picture is unclear).
2. **Numbering**: `n.x`, attached to a feature. The feature number is **optional**: without
   it, the patch attaches to the **last developed feature** — the most recently closed one
   (status `implemented`, `reviewed` or `done`), not the highest number in the index (which
   may only be planned). The command announces the feature it attached to in one line, so the
   user can correct it before anything is written.
3. **Diagnosis lives inside `/feature-patch`**; `/feature-brainstorm` must also be able to tell
   a fix from a feature and hand the fix over.
4. **Trace**: a row in `feature-index.md` **and** a small file in the feature's folder.
5. **Kept from the full pipeline**: implementation with the gate, the optional review, the
   documentation step.

## How it works

### Arguments

- `/feature-patch <description>` → attach to the last developed feature, next free `.x`.
- `/feature-patch 8 <description>` → attach to feature 8, next free `.x`.
- `/feature-patch 8.1` → resume/continue an existing patch (e.g. one created by
  `/feature-brainstorm`, or an interrupted run).

The next free `.x` is computed from the index rows `8.*` **and** the existing `patch-8.*.md`
files (the higher wins, as `/feature-plan` does for feature numbers).

"Last developed feature" is resolved from **git first**: the feature whose commit
(`feat(feature-<n>)…` or the project's equivalent) is the most recent across branches; the
index's `Date` column records when a row was created, not when the feature closed, so it is
only the fallback (highest-numbered feature with status `implemented`, `reviewed` or `done`).
If nothing qualifies (fresh index, nothing closed), ask the user which feature to attach to.

### Phases

1. **Layout and attachment** — resolve the planning layout and settings exactly as the other
   commands do; resolve the feature and the number; announce `patch 8.1 → feature 8 "<title>"`.
2. **Diagnosis** (the orchestrator, read-only):
   - **bug**: reproduce it (run the relevant test or command), find the root cause in the
     code, and define the **failing test** that proves it;
   - **non-bug patch**: identify what must change and where.
   Output: root cause (bugs), the exact list of files to touch, the test(s) to add/change.
   If a diagnosis already exists in the patch file (from `/feature-brainstorm`), start from it
   and verify it against the code.
3. **Size check** — against decision 1. If it is not a patch, stop and propose the full
   workflow (see *Escalation*). Otherwise show the diagnosis in a few lines and proceed.
4. **Implementation** — dispatch **one** `implementer` agent (same model tier and dispatch
   block as `/feature-dev`) with the diagnosis as its brief: for a bug, write the failing test
   first, then the fix. The file list from the diagnosis is its WP boundary.
   **Growth check**: if the implementer reports `NEEDS REVISION` because it needs files outside
   the list, re-run the size check — still a patch → extend the list and re-dispatch; no longer
   a patch → escalate.
5. **Gate** — the same verification gate as `/feature-dev` for the stack (build skills
   `spring-maven-build` / `node-frontend-build`). Red → diagnose and re-dispatch, as in
   `/feature-dev`.
6. **Review (optional)** — offer `/feature-review 8.1` exactly as `/feature-dev` offers the
   feature review: never run without the user's yes, never apply findings without their say.
7. **Docs** — dispatch `feature-documenter` **only if** the change touches something documented
   (wiki page of the affected area, README behavior, configuration). Otherwise skip, and say so.
8. **Closure** — version bump, commit, index, patch file (see below).

### Escalation

The patch file is kept with its diagnosis and the row's status becomes `escalated`. Propose
`/feature-plan <next-feature-number> <path-to-patch-file>` (or `/feature-brainstorm` if the
picture is unclear): the diagnosis becomes the planning input. Nothing is committed.

### The patch file

`<layout>/feature/feature-8/patch-8.1.md`, short by design:

```markdown
# Patch 8.1 — <title>

Type: bugfix | patch · Feature: 8 · Status: <status> · Date: <date>

## Symptom / request
## Diagnosis        (root cause for bugs; files involved)
## Change           (what was changed, tests added)
## Verification     (gate outcome)
## Review           (ran / skipped, findings handled)
## Commit           (hash + subject)
```

Sections are filled as the phases complete, so an interrupted run can resume from the file.

### Index row

Same table and column schema as the features: `| 8.1 | <title> | <status> | <date> | patch-8.1.md |`,
placed right after feature 8's row (or its last patch). Patch statuses reuse the existing
lifecycle minus the planning states: `specified` (created by `/feature-brainstorm`, diagnosis
only) → `in-progress` → `implemented` → `reviewed` → `done`, plus `escalated`.

### Git

- Branch: never on main.
  - If **feature 8's branch exists and is not merged** into main, the patch goes **on that
    branch**: the fix belongs to the unreleased feature, and a branch from main would not even
    contain feature 8's code.
  - Otherwise, a new branch from main. New setting `git.patch_branch_prefix`, default `fix/` →
    `fix/8.1-<slug>`.
  - If already on a non-main branch that is neither of these, ask before switching.
- Version bump: same `git.version_bump` setting, but the proposed/applied level is always
  **patch** — except on an unmerged feature branch, where the feature's own bump covers it:
  skip the bump and say so.
- Commit: `fix(feature-8.1): <title>` for a bugfix; for a non-bug patch the type that fits
  (`chore`, `refactor`, `perf`, `docs`…), same scope. Respect the project's commit style and
  trailers, `auto_commit`, and never push — exactly as `/feature-dev` Phase 8.
- `commit_per_wp` does not apply (a patch is one commit).

## Changes to existing commands

- **`/feature-brainstorm`** — in Phase 2 (scope evaluation), classify the request: if it
  matches decision 1 (few files, no contract change; typically a defect or a small tweak), stop
  the feature interview, run a short diagnosis, write `patch-n.x.md` with *Symptom* and
  *Diagnosis* filled and status `specified`, add the index row, and hand over:
  "run `/feature-patch n.x`". Otherwise continue as today.
- **`/feature-next`** — patch rows join the stage table:
  `specified` patch → `/feature-patch n.x`; patch branch without the patch commit →
  `/feature-patch n.x` (resume); `implemented` patch → `/feature-review n.x` (optional) or
  merge/PR; `escalated` → nothing for the patch, follow the feature it became. Priority: an
  in-progress patch counts as in-progress work (one thing at a time).
- **`/feature-review`** — accept `n.x`: the target is the patch file plus its commits
  (`git log --grep "feature-n.x"`) or its branch; the diagnosis replaces the plan as context.
- **`/feature-plan`** — no change beyond accepting a patch file as the spec argument (it
  already accepts any spec path).
- **Adapter / README / tests / CHANGELOG / AGENTS.md** — per the "Adding a command" checklist
  in `AGENTS.md`; document `git.patch_branch_prefix` in the README settings table and the
  example local settings file. Version 1.6.0 (new command, new setting).

## Left to the builder

- Exact prompt wording, section order inside `commands/feature-patch.md`, and how much of the
  layout-resolution text to repeat versus reference (follow the existing commands' style).
- The "few files" guideline number (the user's criterion is qualitative; ~5 is the designer's
  suggestion, to be stated as guidance, not a hard limit).
- Whether `/feature-docs` should also accept `n.x` (nice to have; not required).

## Designer's calls (not discussed with the user)

- One `implementer` agent does the coding; the orchestrator only diagnoses, consistent with
  the pipeline's "orchestrator coordinates, implementers build".
- The `fix/` default branch prefix and the `git.patch_branch_prefix` setting.
- A patch to a feature whose branch is not merged yet goes on that branch, with no separate
  version bump.
- "Last developed feature" is resolved from the git history first, the index as fallback.
- The patch file's section layout, and `escalated` as a new status.
- `/feature-patch n.x` doubles as "resume".
