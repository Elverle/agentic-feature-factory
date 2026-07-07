---
name: node-frontend-build
description: Use when building or testing a Node.js frontend (React / Next.js / Vite / TypeScript). Explains how to detect the package manager (pnpm/yarn/npm), run lint + typecheck + test + production build as the verification gate, and the common failure modes. Use this as the "verify" gate for frontend features in place of a backend build.
version: 2.0.0
---

# Build & test — Node.js frontend (React / Next.js / Vite / TS)

Operating guide for verifying a frontend feature. It is the FE equivalent of the backend's
`mvn verify` gate: use it as the **verification gate** in the `/feature-dev` pipeline when
working on a Node project.

## 0. Precedence rule

**The project's `AGENTS.md`, `CLAUDE.md` and local skills win over this skill.** If the
project documents its own scripts, flags or verification sequence, use those. This skill only
covers what the project does not say.

## 1. Detect the package manager (don't assume `npm`)

Look at the lockfile in the project root:

| Lockfile present | Package manager | Install | Run scripts |
| --- | --- | --- | --- |
| `pnpm-lock.yaml` | pnpm | `pnpm install` | `pnpm <script>` |
| `yarn.lock` | yarn | `yarn install` | `yarn <script>` |
| `package-lock.json` | npm | `npm ci` (or `npm install`) | `npm run <script>` |
| `bun.lockb` | bun | `bun install` | `bun run <script>` |

If `node_modules` is missing or the install is stale, run the correct PM's install first.

## 2. The verification gate (in order)

Read the `scripts` in `package.json` and run the ones that exist, in this order.
Typical names (adapt to the project's real ones):

1. **Lint / format:** `lint` (e.g. `npm run lint`), possibly `format:check` or
   `prettier --check`.
2. **Typecheck:** `typecheck` or `tsc --noEmit` (for TypeScript projects without a dedicated
   script).
3. **Test:** `test` (Vitest/Jest). In CI use the non-watch mode: `vitest run`, `jest --ci`,
   or `npm test -- --run` depending on the runner.
4. **Production build:** `build` (e.g. `next build`, `vite build`, `tsc && vite build`) —
   the most important check: it catches type errors, broken imports and SSR/RSC issues that
   unit tests don't see.

The gate is **green** only if lint + typecheck + test + build all pass. Do not advance to the
next wave with any of them red.

## 3. Common failure modes (fast diagnosis)

- **`next build` fails on a type error** while tests pass → it's code: the FE build compiles
  EVERYTHING in strict mode, often stricter than individual tests. Fix the type, don't
  disable the check.
- **Server Components / hydration**: errors like "useState is not a function in a Server
  Component" or hydration mismatches → wrong client/server boundary (missing or extra
  `"use client"`), not a logic bug.
- **Blocking ESLint errors in build** (Next treats lint as an error in `next build`): fix
  them or, if truly out of scope, isolate with a targeted commented disable — never disable
  lint globally.
- **A test in watch mode that never ends**: you forgot the non-interactive flag
  (`vitest run`, `--ci`, `--run`). In an agentic pipeline a watching test hangs everything.
- **Package manager mismatch**: running `npm` in a `pnpm` repo reinstalls and dirties the
  lockfile. Always use the lockfile's PM (step 1).

## 4. Manual start (smoke)

For a visual check: `<pm> run dev` (e.g. `pnpm dev`) and open the printed URL (typically
`http://localhost:3000` for Next, `http://localhost:5173` for Vite).
