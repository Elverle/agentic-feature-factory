---
description: Analyzes requirements + codebase and asks you clarifying questions, then produces a work-package plan. Handles feature numbering and folders.
argument-hint: <feature-number or description> [spec/master-plan path]
model: opus
---

You must produce the **implementation plan** for the feature: **$ARGUMENTS**

You are in **planning mode**: you do not touch source code. Your output is planning documents
only (feature folder + number, the decisions that emerged, the WP plan). You will NOT
implement this plan yourself: it will be split into work packages and assigned to isolated
Sonnet instances, each having the plan text as its ONLY context — no access to this
conversation, no way to ask you questions, and if they run in parallel they cannot talk to
each other. Every ambiguity or implicit assumption in the plan becomes a bug in the final
code.

## Phase A — Planning layout, feature number and folder

1. **Resolve the planning layout**, in this order:
   - **Plugin settings**: if `.claude/agentic-feature-factory.local.md` exists, read
     `plans_dir` from its frontmatter and use it as the root for the index and the plans
     (skip discovery).
   - **Discovery of the existing layout**: look for `feature-index.md` first in `content/`,
     then in the **repo root**, then anywhere (glob, excluding `node_modules` and the like).
     Also look for existing plans (`content/feature/feature-*/`, `content/feature-*-plan.md`,
     `feature/feature-*/`). If you find an index, **adopt its location, its column schema and
     the plan convention it references** — NEVER create a second index or a parallel layout.
     If you find more than one conflicting convention (e.g. an index at the root plus flat
     plans in `content/`), **ask me with `AskUserQuestion` which one to adopt** before
     writing anything.
   - **Default** (no existing layout): `content/feature-index.md` +
     `content/feature/feature-<n>/`.
2. Determine the **feature number**: if the argument is (or starts with) a number, use it;
   otherwise assign the **next** free number by reading the index AND the existing plan
   folders/files (if the index is stale, the higher of the two wins).
3. Create the feature folder according to the resolved layout.
4. Announce in one line the layout you chose, plus the number and title you intend to use.

## Phase B — Analysis and questions (do NOT skip it)

Before writing a single line of the plan:

1. Read the spec/master-plan (from the second argument or from the project's planning
   documents) and **explore the real codebase**: patterns, conventions, layer structure,
   files that will be touched, contracts of adjacent features, as-built docs of the
   predecessors. Cite real files, not abstract descriptions.
2. List to yourself the **ambiguities, open decisions, trade-offs, risky assumptions and
   uncertain scope boundaries** that emerge.
3. **Ask me targeted questions** only about what actually changes the plan:
   - Use **`AskUserQuestion`** for discrete choices (give me 2–4 options with your
     recommendation first), batching related questions together instead of firing them one
     at a time.
   - For free-form answers (numbers, names, constraints), ask me in chat.
   - **Wait for my answers** before proceeding.
   - Whatever is clearly decided by the codebase or the spec, **don't ask me**: decide it,
     justify it in one line, and move on. Ask me only about the rest.
4. Record the decisions taken (my answers + yours) in the **`requirements.md` of the feature
   folder** (resolved layout; default `content/feature/feature-<n>/requirements.md`), one
   line per decision with its rationale: it will be the memory of the "why" behind the plan.

## Phase C — Writing the plan

Write the plan following these rules:

1. **WORK-PACKAGE STRUCTURE**
   Split the work into self-contained units. For each one specify:
   - One-sentence goal
   - Exact list of files to create/modify (full paths)
   - Existing patterns/conventions to follow, citing real project files as reference (do not
     describe them in the abstract)
   - Detailed implementation steps: no "handle appropriately", "validate if needed", "add
     proper error handling" — spell out the exact rules, the edge cases, the error messages
   - Contracts/interfaces exposed to other packages (types, function signatures, DTOs,
     endpoints) written out in full: parallel instances cannot negotiate them at runtime
   - Explicit dependencies on other packages (what must exist first and what it provides)
   - Verifiable acceptance criteria
   - What is explicitly OUT of scope, to avoid over-engineering

2. **DECISIONS MADE NOW, NOT DEFERRED**
   The decisions from Phase B go into the plan as final, motivated choices. Never leave an
   open decision like "choose between A and B during implementation".

3. **REUSE**
   Check what already exists in the codebase (utilities, services, components) and state
   explicitly what must be reused, so that different instances don't re-implement the same
   thing inconsistently.

4. **DEPENDENCY MAP**
   At the end of the plan, list which work packages can run in parallel and which require a
   strict sequential order.

5. **FINAL CHECKLIST**
   Close with the complete index of work packages, so no piece of the feature is lost in the
   handover.

6. **SELF-CHECK**
   Before delivering the final plan, re-read it and verify that every point above is
   satisfied and that every Phase B question found its answer in the plan. If something is
   still vague, do not write it ambiguously: ask me now, before finalizing.

## Phase D — Saving and index

- Save the plan where the layout resolved in Phase A expects it (default:
  **`content/feature/feature-<n>/plan.md`**), with the work-package structure above.
- Update the **`feature-index.md`** of the resolved layout with the feature's row,
  **respecting its existing column schema**. Only if no index exists at all, create it (at
  the default location `content/feature-index.md`) with the heading `# Feature Index` and a
  table with columns `# | Title | Status | Date | Plan` (states: `planned` → `in-progress` →
  `reviewed` → `done`).
- This plan is the input of **`/feature-dev <n>`**.
