# `/feature-patch` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a light `/feature-patch` path for bugfixes and small patches (diagnosis → size check → one implementer + gate → optional review → docs → patch bump → commit), traced as `n.x` rows and `patch-n.x.md` files, and teach `/feature-brainstorm`, `/feature-next` and `/feature-review` about it.

**Architecture:** The plugin is prompts. The new behavior lives in a new prompt `commands/feature-patch.md`; three existing prompts get targeted additions; the adapter only needs the command registered (descriptions come from frontmatter). The `node:test` suite enforces registration, README coverage, settings documentation and the release bookkeeping.

**Tech Stack:** Markdown prompts; Node ≥ 20 ESM (`scripts/adapt.mjs`); `node:test` (`npm test`).

**Spec:** `docs/superpowers/specs/2026-11-05-feature-patch-design.md` — read it in full before any task; the plan references its sections instead of repeating them.

## Global Constraints

- Everything in English, commit messages included; Conventional Commits; every commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Work on branch `feature/feature-patch`; never commit on `main`.
- Prompts address the agent as "you" and the user as "me"; platform-specific instructions (Claude Code / Antigravity / Codex / Copilot) sit side by side in one prompt (see `AGENTS.md`).
- Patch criterion, verbatim: a patch touches **few files** and **changes no contract or API** — public signatures, endpoints, DTOs, database schema, shared configuration. "~5 files" is guidance, not a hard limit.
- Numbering `n.x`, never nested (`8.1.1` is forbidden); patch file `<layout>/feature/feature-<n>/patch-<n>.<x>.md`.
- Patch statuses: `specified → in-progress → implemented → reviewed → done`, plus `escalated`.
- New setting `git.patch_branch_prefix`, default `fix/`; branch `fix/<n>.<x>-<slug>`.
- Commit subject: `fix(feature-<n>.<x>): <title>` for bugfixes; `chore`/`refactor`/`perf`/`docs` with the same scope otherwise.
- Version after this plan: **1.6.0**.

## Review Focus

These are prompt behaviors no automated test can exercise; each is pinned as a required line in the owning task's prompt checklist, and the reviewer checks the prompt text for it.

1. **Numbering gap**: index has `8.1` but `patch-8.2.md` exists without a row → the next patch is `8.3`, not `8.2` (Task 2, checklist item A3).
2. **Resuming a closed patch**: `/feature-patch 8.1` when `8.1` is `done` or `escalated` → say so and propose a new `8.x`, never redo it (Task 2, A4).
3. **Switching to an unmerged feature branch with a dirty working tree** → stop and ask; never stash or carry changes silently (Task 2, G3).
4. **Escalation after the implementer already changed files** → list the uncommitted changes, commit nothing, leave the decision to me (Task 2, E2).
5. **Index with a non-default column schema** → the `n.x` row respects the existing columns, placed after feature `n`'s row or its last patch (Task 2, C3).

---

### Task 1: Branch and commit the design

**Files:**
- Add: `docs/superpowers/specs/2026-11-05-feature-patch-design.md`, `docs/superpowers/plans/2026-11-05-feature-patch.md` (both already written)

- [ ] **Step 1:** `git checkout -b feature/feature-patch` from an up-to-date `main`.
- [ ] **Step 2:** Run `npm test` — Expected: 11 passing (baseline).
- [ ] **Step 3: Commit**

```bash
git add docs/superpowers
git commit -m "docs: add /feature-patch design and implementation plan"
```

### Task 2: The `/feature-patch` command, registered and documented

**Files:**
- Create: `commands/feature-patch.md`
- Modify: `scripts/adapt.mjs` (`COMMAND_NAMES`; Antigravity rules text; Copilot instructions text)
- Modify: `README.md` (intro line, Antigravity and Copilot command lists, *What's inside* table, quick start, flow diagram)
- Modify: `CHANGELOG.md` (`[Unreleased]` → `### Added`)
- Test: `scripts/adapt.test.mjs` (existing tests enforce it; no new test)

**Interfaces:**
- Produces: command name `feature-patch`; frontmatter `argument-hint: [feature-number | n.x] <description>`; the patch file sections and statuses (spec, *The patch file* and *Index row*) that Tasks 4–6 read.

- [ ] **Step 1: Write `commands/feature-patch.md` frontmatter only** — `description`: "Light path for bugfixes and small patches — diagnosis, size check, one implementer with the build gate, optional review, docs, patch version bump and commit, traced as a numbered patch (n.x) of a feature"; the `argument-hint` above.
- [ ] **Step 2: Run `npm test`** — Expected: FAIL in "every command file is registered" (`feature-patch` on disk, not in `COMMAND_NAMES`).
- [ ] **Step 3: Add `'feature-patch'` to `COMMAND_NAMES`** in `scripts/adapt.mjs`, after `'feature-dev'`.
- [ ] **Step 4: Run `npm test`** — Expected: FAIL in "every command is documented in the README" and in "adapt all … mentions every command in the pipeline texts" (Antigravity rules / Copilot instructions).
- [ ] **Step 5: Mention the command in both adapter pipeline texts** — Antigravity: a line "For bugfixes and small patches, use skill `feature-patch` instead of planning a feature"; Copilot: a bullet "**Patches and bugfixes**: Run `/feature-patch` …" next to the phases.
- [ ] **Step 6: README** — add `/feature-patch` to: the intro (one sentence: small fixes skip spec and plan but keep gate, review, docs and commit), the Antigravity skill list and Copilot command list, the *What's inside* table (row after `/feature-dev`), the quick start (new subsection "Patches and bugfixes — `/feature-patch`" after the `/feature-dev` step, with a `/feature-patch 5 <bug>` → `patch-5.1.md` example tree), and the flow diagram (one line, like `/feature-next`).
- [ ] **Step 7: Write the command body**, phases exactly as the spec's *How it works* (Arguments, Phases 1–8, Escalation, The patch file, Index row, Git). Layout/settings resolution text: copy the wording used by `commands/feature-next.md` Phase 1. Dispatch blocks for `implementer` (Phase 4) and `feature-documenter` (Phase 7): copy the per-platform blocks from `commands/feature-dev.md` Phase 3 / Phase 7. The prompt must contain each of these, verifiably:
  - A1 the three argument forms; A2 "last developed feature" resolved from git first, index as fallback, ask if none; **A3 next `.x` = max over index rows and `patch-n.*.md` files**; **A4 `/feature-patch n.x` on a `done`/`escalated` patch → say so, propose a new `.x`**; A5 one-line attachment announcement before writing anything.
  - B1 bug diagnosis = reproduce, root cause, failing test defined; B2 non-bug = what and where; B3 reuse an existing *Diagnosis* section, verified against the code.
  - C1 the patch criterion verbatim (Global Constraints); C2 create the patch file and the index row at the end of diagnosis (status `in-progress`); **C3 index row respects the existing column schema, placed after feature `n`'s row or its last patch**.
  - D1 one `implementer`, diagnosis as brief, failing test first for bugs, diagnosis file list as boundary; D2 growth check on `NEEDS REVISION`.
  - **E1 escalation → status `escalated`, propose `/feature-plan <next n> <patch file>`; E2 if files were already changed, list them, commit nothing, leave the decision to me.**
  - F1 gate as `/feature-dev` Phase 4; F2 review offered, never run or applied without my yes; F3 docs only when the change touches something documented, otherwise say "docs skipped".
  - G1 branch rules (unmerged feature branch → that branch; else `<patch_branch_prefix><n>.<x>-<slug>` from main; other non-main branch → ask); G2 bump = patch, skipped on an unmerged feature branch; **G3 switching branch with a dirty tree → stop and ask, never stash**; G4 commit subject per Global Constraints, `auto_commit`, never push; G5 fill the patch file sections as phases complete; final status `implemented` (or `reviewed`).
- [ ] **Step 8: CHANGELOG** — under `[Unreleased]` / `### Added`: "`/feature-patch [n | n.x] <description>`: a light path for bugfixes and small patches …" (one entry, 2–3 lines).
- [ ] **Step 9: Run `npm test`** — Expected: all passing. Run `node scripts/adapt.mjs all --dry-run | grep feature-patch` — Expected: one Antigravity skill, one Codex prompt, one Copilot prompt.
- [ ] **Step 10: Commit**

```bash
git add commands/feature-patch.md scripts/adapt.mjs README.md CHANGELOG.md
git commit -m "feat: add /feature-patch for bugfixes and small patches"
```

### Task 3: The `git.patch_branch_prefix` setting

**Files:**
- Modify: `.agentic-feature-factory.local.example.md`, `README.md` (settings YAML block and `git.*` table), `CHANGELOG.md`
- Test: `scripts/adapt.test.mjs`

**Interfaces:**
- Consumes: `git.patch_branch_prefix` as referenced by Task 2's G1.

- [ ] **Step 1: Write the failing test** `every git setting in the example file is documented in the README`: extract the keys indented under `git:` in `.agentic-feature-factory.local.example.md` (lines matching `/^\s+(\w+):/` between `git:` and the next top-level key); for each key assert `README.md` contains `` `<key>` `` inside a table row (`/^\|\s*`key`\s*\|/m`).
- [ ] **Step 2: Add `patch_branch_prefix: fix/  # patch branch: <prefix><n>.<x>-<slug>` to the example file's `git:` block**, after `branch_prefix`.
- [ ] **Step 3: Run `npm test`** — Expected: FAIL in the new test (`patch_branch_prefix` not in the README table).
- [ ] **Step 4: README** — the same line in the settings YAML block; a table row `` | `patch_branch_prefix` | `fix/` | Branch for `/feature-patch`: `<prefix><n>.<x>-<slug>`; a patch to a feature not merged yet goes on that feature's branch instead | ``.
- [ ] **Step 5: CHANGELOG** — `[Unreleased]` / `### Added`: the setting, one line.
- [ ] **Step 6: Run `npm test`** — Expected: all passing.
- [ ] **Step 7: Commit** — `git commit -m "feat: add git.patch_branch_prefix setting"` (stage the four files).

### Task 4: `/feature-brainstorm` routes fixes to `/feature-patch`

**Files:**
- Modify: `commands/feature-brainstorm.md` (Phase 1 number assignment; Phase 2 *Assess scope size*; the patch branch skips Phases 3–6, whose hand-over stays feature-only)

- [ ] **Step 1:** Phase 2 gets a classification step, per the spec's *Changes to existing commands*: patch criterion verbatim → stop the feature interview, short diagnosis, write `patch-n.x.md` with *Symptom / request* and *Diagnosis* filled, status `specified`, index row, hand over "run `/feature-patch n.x`". Numbering for this branch follows `/feature-patch`'s rules (attach to the given or last developed feature, next free `.x`) — reference `commands/feature-patch.md` for them rather than restating. Phase 1 must not assign a new feature number before the classification: move "Determine the feature number" after the classification, or make it conditional.
- [ ] **Step 2: Verify** — `grep -n "feature-patch" commands/feature-brainstorm.md` shows the hand-over and the classification; `npm test` passes.
- [ ] **Step 3: Commit** — `git commit -m "feat(feature-brainstorm): route fixes to /feature-patch"`.

### Task 5: `/feature-next` and `/feature-review` understand patches

**Files:**
- Modify: `commands/feature-next.md` (stage table; Phase 2 evidence; Phase 3 priority)
- Modify: `commands/feature-review.md` (Step 1 target parsing; Step 2 context)

- [ ] **Step 1: `/feature-next`** — add patch rows to the stage table per the spec (`specified` patch → `/feature-patch n.x`; patch branch without the patch commit → `/feature-patch n.x`; `implemented` patch → `/feature-review n.x` or merge/PR; `escalated` → nothing, follow the feature). Phase 2 collects `patch-*.md` files and `<patch_branch_prefix><n>.<x>-*` branches; the patch commit is `<type>(feature-<n>.<x>)…`. Phase 3: an in-progress patch counts as in-progress work in priority 2; a `specified` patch ranks before `planned` features.
- [ ] **Step 2: `/feature-review`** — Step 1 accepts `n.x`: target = the patch's branch, else its commits (`git log --oneline --grep "feature-<n>.<x>"`); Step 2 passes the patch file's *Diagnosis* and *Change* sections instead of the plan.
- [ ] **Step 3: Verify** — `grep -n "n\.x\|patch" commands/feature-next.md commands/feature-review.md` shows each addition; `npm test` passes.
- [ ] **Step 4: Commit** — `git commit -m "feat: teach /feature-next and /feature-review about patches"`.

### Task 6: Contributor rules and release 1.6.0

**Files:**
- Modify: `AGENTS.md` (*Writing prompts* shared-text list), `README.md` (*Feature status* paragraph), `package.json`, `.claude-plugin/plugin.json`, `CHANGELOG.md`

- [ ] **Step 1:** `AGENTS.md` shared-text list: add "patch numbering (`n.x`) and the patch criterion — shared by `/feature-patch`, `/feature-brainstorm`, `/feature-next`, `/feature-review`", and `escalated` to the lifecycle line. README *Feature status* paragraph: patches (`n.x`) follow the same lifecycle without `planned`, plus `escalated`.
- [ ] **Step 2: Bump `version` to `1.6.0`** in `package.json` and `.claude-plugin/plugin.json`.
- [ ] **Step 3: Run `npm test`** — Expected: FAIL in "the CHANGELOG has an entry for the current version".
- [ ] **Step 4: CHANGELOG** — rename `[Unreleased]`'s entries to `## [1.6.0] - <today>`, keep an empty `## [Unreleased]` above it; add under `### Changed` one line each for Tasks 4 and 5.
- [ ] **Step 5: Run `npm test`** — Expected: all passing.
- [ ] **Step 6: Commit** — `git commit -m "chore: release 1.6.0"`.

### Task 7: End-to-end check

- [ ] **Step 1:** `npm test` and `node scripts/adapt.mjs all --dry-run` — Expected: all passing; `feature-patch` generated for every platform.
- [ ] **Step 2:** Re-read `commands/feature-patch.md` against the spec's *How it works* and the checklist A1–G5; fix any gap in a follow-up commit.
- [ ] **Step 3:** `git log --oneline main..` — Expected: 6 commits, English, Conventional Commits.
