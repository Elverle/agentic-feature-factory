---
description: Architecture review of a feature — puts its plan against the codebase and proposes the high-impact fixes, each with the work package to graft it into
argument-hint: <feature-number> (empty = review of the whole planned set)
model: opus
---

Architecture review of **feature $1**.

First, **resolve the planning layout**: if `.claude/agentic-feature-factory.local.md`
exists, use `plans_dir` from its frontmatter; otherwise look for the feature's plan in
`content/feature/feature-$1/plan.md`, then in the repo's legacy layouts
(`content/feature-$1-*-plan.md`, `feature/feature-$1/`). Read the plan, also considering the
plans of adjacent/predecessor features and the project's reference architecture. The goal is
to understand whether the current architecture can carry what **this feature** will build on
top of it, and where it is worth improving BEFORE implementing it.

(If you are not given a number, review the **whole set** of planned features in the resolved
layout — in that case save the output at the layout root, e.g.
`content/architecture-review-<date>.md`; see the final note.)

I don't want a style audit or cosmetic nitpicks: I want structural, real pain points with
concrete evidence in the code — and improvement proposals weighed by impact and cost, not a
list of generic best practices.

## PHASE 1 — Analysis of the current codebase

Explore the relevant modules/folders (or "the whole project") and assess:

- **Architectural consistency:** are the patterns (naming, layer structure, error handling,
  validation, data access) applied uniformly, or are there inconsistencies between similar
  modules/features?
- **Coupling and boundaries:** dependencies crossing layers incorrectly, duplicated logic,
  mixed responsibilities.
- **Visible technical debt:** fragile code, workarounds, unresolved TODO/FIXME, critical
  areas without tests.
- **Resilience of the current design:** what "works" today but would not hold up well under
  new features or increased complexity/load.

For each pain point: cite the files/paths involved, explain why it is a problem (not just
what you dislike) and classify the impact (**blocking / worth watching / cosmetic**).

## PHASE 2 — The feature against the current codebase

Read the feature's plan (and, for context, the adjacent ones) and verify:

- Does it lean correctly on the existing patterns, or does it ignore/duplicate them?
- Does it introduce an inconsistency with the conventions already in use in the project?
- Does it require preliminary refactoring to be implemented well, or can it be built cleanly
  as-is?
- Does it amplify a pain point already identified in Phase 1 (e.g. it leans heavily on an
  already fragile module)?
- Is there complexity in the plan disproportionate to the feature's value
  (over-engineering), or conversely shortcuts that will create debt?

## PHASE 3 — Output

1. Current pain points, ordered by impact, with file references (assign each a stable ID
   like `P1`, `P2`, ... so later commands can cite them).
2. Risks introduced or amplified by the planned features.
3. For each point, a concrete improvement proposal (not a generic one): if it requires
   refactoring, estimate the size (small/medium/large) and **where it should be grafted** —
   cite the specific work package of the plan (e.g. "inside WP4.3") and whether it is better
   done before or after implementing the new features. This WP anchor is what `/feature-dev`
   will read to apply the fixes in the right place.
4. A final section "if you could improve only 3 things before proceeding, which and why" —
   force yourself to prioritize, don't just list everything.

If an area has no problems worth mentioning, say so explicitly instead of inventing an
improvement to fill it.

When done, save the review **inside the feature's folder** (resolved layout; default
**`content/feature/feature-$1/architecture-review-<today's-date>.md`**) — that is where
`/feature-dev $1` will look for it. (If you reviewed the whole set without a number, save it
instead at the layout root, e.g. `content/architecture-review-<today's-date>.md`.)
