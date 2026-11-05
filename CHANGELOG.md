# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/). Every new setting key is optional: its documented
default applies when it is missing.

## [Unreleased]

## [1.6.0] - 2026-11-05

### Added
- `/feature-patch [n | n.x] <description>`: a light path for bugfixes and small patches (few
  files, no contract or API change) — diagnosis, one Implementer with the build gate, optional
  review, docs and a patch commit, traced as patch `n.x` of a feature (index row +
  `patch-n.x.md`). It proposes the full workflow when the change turns out bigger.
- `git.patch_branch_prefix` setting (default `fix/`): the branch `/feature-patch` creates.

### Changed
- `/feature-brainstorm` first tells a fix from a feature: a fix gets a short diagnosis saved as
  a `specified` patch and is handed to `/feature-patch`, without consuming a feature number.
- `/feature-next` tracks patches (their own stage table; open patches come before new
  features) and `/feature-review` accepts a patch number `n.x`, reviewing the patch commit
  against its diagnosis.

### Fixed
- `/feature-review` looked up a feature's commits with a loose `feature-<n>` match, which also
  caught other features sharing the prefix (`8` vs `80`); the match is now exact.

## [1.5.0] - 2026-11-05

### Added
- `/feature-next [n]`: reads the project's feature state (index, feature folders, branches,
  working tree), tells you the next command to run with its evidence, flags index drift and
  offers to launch the command.
- `/feature-dev` resumes an interrupted run from the first work package not yet ticked in the
  plan's checklist, and ticks each wave's work packages on a green gate.
- `npm test` (zero-dependency `node:test` suite) and a GitHub Actions workflow running it on
  Linux and Windows, Node 20/22/24.
- `AGENTS.md` / `CLAUDE.md` with the contributor rules, and this changelog.

### Changed
- Feature status lifecycle made explicit and consistent across commands:
  `specified → planned → in-progress → implemented → reviewed → done`. `/feature-dev` now sets
  `in-progress` when it starts.
- `/feature-plan` writes the plan's final checklist as Markdown checkboxes.
- The adapter reads command descriptions and argument hints from each command's frontmatter
  (no more duplicated, drifting copies) and the Antigravity manifest from `package.json`.
- Node.js 20+ is required for the adapter CLI.

### Fixed
- `adapt claude` copied the plugin into `~/.claude/plugins/agentic-feature-factory/`, a folder
  Claude Code never loads. It now registers the marketplace and enables the plugin in
  `settings.json` (global: a `directory` source on the local clone; `--scope project`: the
  GitHub source in the project's `.claude/settings.json`), merging with existing settings.
- The Antigravity manifest fell back to a stale hard-coded version.

## [1.4.0] - 2026-09-18

### Added
- `/feature-review`: optional, standalone code-review through the read-only
  `feature-reviewer` agent, with a configurable `reviewer` model tier.
- `/feature-dev` closes each feature with documentation (wiki + README), a version bump and a
  commit on a dedicated branch, configured by the new `git.*` settings (`auto_commit`,
  `commit_per_wp`, `branch_prefix`, `version_bump`).
- README section on updating an existing installation.

## [1.3.0] - 2026-09-14

### Added
- Multi-platform adapter CLI (`scripts/adapt.mjs`) for Antigravity, AGY CLI, OpenAI Codex,
  GitHub Copilot and Claude Code.
- `/feature-brainstorm`: produces a validated `spec.md` before planning.
- Per-platform model tiers in `.agentic-feature-factory.local.md`.

## [1.2.0] - 2026-07-07

### Added
- `feature-documenter` agent, adopting the project's documentation conventions.

### Changed
- Planning layout discovery (settings → existing layout → default), generic build skills;
  all prompts in English.

### Removed
- The `codebase-expert` agent and the `fix` / `scan` skills, replaced by `feature-documenter`.

## [1.1.1] - 2026-07-07

### Changed
- `/arch-review` writes its output inside the feature's folder.

## [1.1.0] - 2026-07-07

### Added
- First release of the plugin: `/feature-plan`, `/arch-review`, `/feature-dev`,
  `/feature-docs`, the `implementer` and `codebase-expert` agents, the `fix` / `scan` skills
  and the `spring-maven-build` / `node-frontend-build` build skills.
