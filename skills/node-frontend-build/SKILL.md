---
name: node-frontend-build
description: Use when building or testing a Node.js frontend (React / Next.js / Vite / TypeScript). Explains how to detect the package manager (pnpm/yarn/npm), run lint + typecheck + test + production build as the verification gate, and the common failure modes. Use this as the "verify" gate for frontend features in place of a backend build.
version: 1.0.0
---

# Build & test — frontend Node.js (React / Next.js / Vite / TS)

Guida operativa per verificare una feature frontend. È l'equivalente FE del gate `mvn verify`
del backend: usala come **gate di verifica** nella pipeline `/feature-dev` quando lavori su un
progetto Node.

## 1. Rileva il package manager (non assumere `npm`)

Guarda il lockfile nella root del progetto:

| Lockfile presente | Package manager | Install | Esegui script |
| --- | --- | --- | --- |
| `pnpm-lock.yaml` | pnpm | `pnpm install` | `pnpm <script>` |
| `yarn.lock` | yarn | `yarn install` | `yarn <script>` |
| `package-lock.json` | npm | `npm ci` (o `npm install`) | `npm run <script>` |
| `bun.lockb` | bun | `bun install` | `bun run <script>` |

Se non c'è node_modules o l'install è stale, esegui prima l'install del PM corretto.

## 2. Il gate di verifica (nell'ordine)

Leggi gli `scripts` in `package.json` e lancia quelli che esistono, in quest'ordine.
Nomi tipici (adatta a quelli reali del progetto):

1. **Lint / format:** `lint` (es. `npm run lint`), eventualmente `format:check` o `prettier --check`.
2. **Typecheck:** `typecheck` oppure `tsc --noEmit` (per progetti TypeScript senza script dedicato).
3. **Test:** `test` (Vitest/Jest). In CI usa la modalità non-watch: `vitest run`, `jest --ci`,
   o `npm test -- --run` a seconda del runner.
4. **Build di produzione:** `build` (es. `next build`, `vite build`, `tsc && vite build`) —
   è la verifica più importante: intercetta errori di tipo, import rotti e problemi SSR/RSC
   che i test unit non vedono.

Il gate è **verde** solo se lint + typecheck + test + build passano tutti. Non avanzare
all'ondata successiva con uno di questi rosso.

## 3. Failure mode comuni (diagnosi rapida)

- **`next build` fallisce su un errore di tipo** ma i test passano → è codice: il build FE
  compila TUTTO in strict mode, spesso più severo dei singoli test. Correggi il tipo, non
  disabilitare il check.
- **Server Components / hydration**: errori tipo "useState is not a function in a Server
  Component" o hydration mismatch → confine client/server sbagliato (`"use client"` mancante o
  di troppo), non un bug di logica.
- **Errori ESLint bloccanti in build** (Next tratta il lint come errore in `next build`):
  correggi o, se davvero fuori scope, isola con disable mirato commentato — mai disabilitare
  il lint globale.
- **Test in watch mode che non termina**: hai dimenticato la flag non-interattiva
  (`vitest run`, `--ci`, `--run`). In una pipeline agentica un test in watch appende.
- **Mismatch package manager**: lanciare `npm` in un repo `pnpm` reinstalla e sporca il
  lockfile. Usa sempre il PM del lockfile (punto 1).

## 4. Avvio manuale (smoke)

Per una verifica visiva: `<pm> run dev` (es. `pnpm dev`) e apri l'URL indicato (tipicamente
`http://localhost:3000` per Next, `http://localhost:5173` per Vite).
