---
name: fix
description: "Structured diagnostic methodology for debugging and fixing code. Guides through: parse error, locate code, diagnose root cause, apply fix, verify, and propose wiki documentation. Use when fixing bugs, resolving errors, stack traces, build failures, or logical issues."
---

# Fix — Diagnostic & Repair Methodology

Structured methodology for diagnosing and fixing code issues. Follow these steps **in order** — do not skip steps.

## Supported Error Types

| Category | Examples |
|---|---|
| **Runtime errors & stack traces** | `TypeError`, `NullPointerException`, unhandled promise rejection, segfaults |
| **Build / compile errors** | TypeScript `TS2345`, Webpack module-not-found, Maven compilation failure |
| **Linting / static analysis** | ESLint warnings, Pylint errors, SonarQube issues |
| **Infrastructure / deployment** | Docker build failures, CI/CD pipeline errors, environment config issues |
| **Logical bugs** | "The output is wrong", "this feature doesn't work as expected" |
| **Test failures** | Failing unit/integration tests, assertion errors, flaky tests |

---

## Step 1 — Parse the Error

Extract structured signals from the raw input:

- **Error type / code** (e.g., `TypeError`, `TS2345`, `ENOENT`, HTTP 500)
- **Error message** (the human-readable description)
- **File & line number** (if present in stack trace)
- **Call chain** (sequence of calls leading to the error)
- **Environment clues** (runtime version, OS, CI runner, dependency versions)

If the input is a plain-language description rather than a stack trace, map it to likely error patterns and search the codebase accordingly.

If the error message is ambiguous or incomplete, ask the user for:
- Full stack trace
- Reproduction steps
- Recent changes that might be related
- Environment details

---

## Step 2 — Locate the Code

Find the relevant source code:

1. If a file and line are given — read that file, plus surrounding context (the whole function, imports, type definitions).
2. Search for the function/class/module name from the stack trace.
3. Search for usages of the failing symbol to find callers — the bug might originate upstream.
4. Check related files: tests, configs, type definitions, interfaces, DTOs.
5. If the project has a wiki, read relevant entity/concept/topic pages for architectural context.

**Read enough context.** Don't just look at the offending line. Read the surrounding function, the imports, the class structure, and any relevant type definitions.

---

## Step 3 — Diagnose the Root Cause

Analyze what you've found:

- **What** is the code trying to do?
- **Why** does it fail? (wrong type, missing null check, incorrect import, stale config, race condition, wrong assumption, etc.)
- **Is this** a one-off mistake or a pattern that appears elsewhere?
- **Could there be** multiple contributing factors?

Present the diagnosis clearly before proceeding to fix:

```
## Diagnosis

**Root cause:** [concise explanation]
**Why it happens:** [detailed reasoning with code references]
**Affected scope:** [which files/functions/components are impacted]
**Confidence:** [high / medium / low — if low, explain what's uncertain]
```

If you cannot determine the root cause:
1. State what you've investigated and ruled out.
2. List remaining hypotheses ranked by likelihood.
3. Ask for specific additional information.
4. Suggest diagnostic steps (add logging, run in debug mode, check a specific config).

Never fabricate a diagnosis. "I'm not sure — here's what I've tried" is better than a wrong guess.

---

## Step 4 — Fix

Apply the fix:

1. Make the **minimal correct change** that resolves the issue.
2. Preserve existing code style and conventions.
3. Consider implications: Does this break other callers? Other tests? The public API?
4. Check usages of any modified symbol — verify all callers still work.
5. If touching a function signature or public API, verify backwards compatibility or flag the breaking change.

### Fix Quality Standards

Every fix must be:
- **Correct** — actually resolves the error, not just silences it.
- **Minimal** — changes only what is necessary. No drive-by refactors.
- **Safe** — does not break other functionality.
- **Idiomatic** — follows the conventions of the language and the codebase.
- **Explained** — the user understands what was wrong and why the fix works.

### What NOT to Do

- Do not suppress or swallow errors without fixing the cause (no empty `catch {}` blocks).
- Do not add `@ts-ignore`, `// eslint-disable`, `@SuppressWarnings` as a fix unless there is genuinely no alternative.
- Do not rewrite large sections of working code to fix a small bug.
- Do not introduce new dependencies without discussing it first.

---

## Step 5 — Verify

After applying the fix:

1. Run relevant tests if a test suite exists (`npm test`, `mvn test`, `pytest`, etc.).
2. Run type checking / linting if available (`tsc --noEmit`, `eslint`, etc.).
3. Check that no new errors or warnings were introduced.
4. If the fix touches a frequently-used component, do a quick usage check.

Report results:

```
## Fix Applied

**What changed:** [summary of edits]
**Files modified:** [list with line references]
**Verification:** [test results, type-check results, or manual check]
```

---

## Step 6 — Wiki Feedback Loop

After a successful fix, propose documenting the findings in the project wiki:

1. **Propose** an analysis page in `wiki/analyses/` with:
   - Problem description (how the bug manifested)
   - Root cause analysis
   - Solution applied (what was changed and why)
   - Components involved (with links to entity/concept pages)
   - Lessons learned (any architectural insight gained)

2. **Update** related entity/concept pages if the fix revealed new knowledge about the project architecture.

3. This step is a **proposal** — write only if the user accepts.

---

## Multi-Error Triage

When multiple errors are reported at once:

1. **Group** related errors — often several stem from one root cause.
2. **Prioritize** — fix blocking errors first (compile before lint; crashes before cosmetic).
3. **Fix incrementally** — one fix at a time, then re-check. Fixing one often resolves others.
4. **Report progress** — after each fix, summarize what was fixed and what remains.
