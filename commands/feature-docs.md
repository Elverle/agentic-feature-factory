---
description: Documents the code in wiki format via the feature-documenter agent (feature/area/lint), adopting the project's documentation conventions. Works on backend and frontend.
argument-hint: [feature-number | path/area | "lint"]
model: opus
---

You are the orchestrator of the **wiki documentation**. You do not write the pages yourself:
you dispatch the **`feature-documenter`** sub-agent, which updates the project's technical
documentation adopting the project's own conventions (AGENTS.md/CLAUDE.md, the existing
wiki's format) before its own.

**Requested scope:** `$ARGUMENTS`

## Step 1 — Determine the mode from the argument

- **empty** → document the recent work: use `git diff`/`git log` to understand what changed
  recently and have those areas documented; if the project has no wiki yet, an initial scan
  of the main areas.
- **a feature number** (e.g. `5`) → document the feature: locate its plan and touched files
  (resolve the planning layout: `plans_dir` from the settings file
  `.claude/agentic-feature-factory.local.md` if present, otherwise `content/`, then the repo
  root) and pass the plan and areas to the agent.
- **a path/area** (e.g. `src/main/java/.../service` or `app/(dashboard)`) → "document area"
  mode on that folder/module.
- **`lint`** → wiki health check (orphan pages, broken links, stale content, contradictions,
  coverage gaps).

## Step 2 — Dispatch `feature-documenter`

Dispatch **one** `feature-documenter` agent (`subagent_type: "feature-documenter"`) with a
prompt that includes:

1. The **mode** and **scope** determined in Step 1 (for a feature: plan + touched files).
2. The **`wiki_dir`** from the settings file, if set; otherwise the instruction to locate
   the wiki (`wiki/`, `docs/wiki/`, `src/wiki/`, `docs/`) and to initialize the default
   structure ONLY if the project has no documentation at all — without asking for
   confirmation, because as a sub-agent it cannot interact mid-execution.
3. A reminder of the **convention hierarchy** in its body: the project's AGENTS.md/CLAUDE.md
   rules → the format observed in the existing wiki → the default. Never impose the default
   format on a wiki that uses a different one.
4. The constraint to **act non-destructively**: read before rewriting, prefer updating over
   recreating, report contradictions instead of overwriting them.
5. The request to **close with the report** defined in its body (pages created/updated,
   conventions adopted, contradictions/gaps).

## Step 3 — Summary to the user

When the agent returns, present me compactly: pages created/updated (with paths), the
conventions it adopted and where it derived them from, any contradictions/gaps, and the
recommended next steps (e.g. "the topic page for the auth system is missing"). Do not commit
the wiki unless I explicitly ask.
