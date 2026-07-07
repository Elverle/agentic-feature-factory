---
name: scan
description: "Systematic methodology for analyzing a codebase and generating structured wiki documentation. Guides through: project discovery, architecture analysis, component mapping, pattern identification, dependency analysis, and wiki page generation. Use when scanning a project or codebase area to build the knowledge base."
---

# Scan — Codebase Analysis Methodology

Systematic methodology for analyzing source code and producing structured wiki documentation. Follow these phases in order but adapt depth based on scope (full project vs. subdirectory).

---

## Phase 1 — Project Discovery

Identify the project's identity and boundaries.

### 1.1 Read Build & Config Files

Search for and read (in priority order):

| Ecosystem | Files to look for |
|---|---|
| **Java/Kotlin** | `pom.xml`, `build.gradle`, `build.gradle.kts`, `settings.gradle` |
| **JavaScript/TypeScript** | `package.json`, `tsconfig.json`, `vite.config.*`, `webpack.config.*`, `next.config.*` |
| **Python** | `pyproject.toml`, `setup.py`, `requirements.txt`, `Pipfile`, `poetry.lock` |
| **Rust** | `Cargo.toml` |
| **Go** | `go.mod`, `go.sum` |
| **.NET** | `*.csproj`, `*.sln`, `Directory.Build.props` |
| **Infrastructure** | `Dockerfile`, `docker-compose.yml`, `.env.example`, `terraform/`, `k8s/` |
| **CI/CD** | `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, `azure-pipelines.yml` |
| **General** | `README.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md`, `.editorconfig` |

Extract:
- **Project name and version**
- **Language(s) and framework(s)**
- **Key dependencies** (only those central to functionality, not dev tools)
- **Build commands** (how to build, test, run)
- **Module structure** (for multi-module projects)

### 1.2 Map Directory Structure

List top-level directories and identify their role:

```
src/           → source code
test/          → tests
docs/          → documentation
config/        → configuration
scripts/       → build/deploy scripts
migrations/    → database migrations
```

Note any non-standard organization and what it might indicate about the project's history or conventions.

---

## Phase 2 — Architecture Analysis

Understand the high-level architecture.

### 2.1 Identify Architectural Style

Look for patterns that reveal the architecture:

| Pattern | Indicators |
|---|---|
| **Layered (MVC/Clean)** | `controllers/`, `services/`, `repositories/`, `domain/` |
| **Microservices** | Multiple `docker-compose` services, API gateways, separate `src/` trees |
| **Hexagonal/Ports & Adapters** | `ports/`, `adapters/`, `application/`, `infrastructure/` |
| **Event-driven** | Message queues, event handlers, saga orchestrators |
| **Monolith** | Single deployment unit, shared database, all code in one tree |
| **Plugin/Module** | Dynamic loading, plugin registries, SPI interfaces |

### 2.2 Identify Entry Points

Find where the application starts and how requests flow:

- **Main class / entry file** (e.g., `Application.java`, `main.ts`, `app.py`)
- **HTTP routes / controllers** (REST endpoints, GraphQL resolvers)
- **CLI commands** (argument parsers, command handlers)
- **Event listeners** (message consumers, webhook handlers)
- **Scheduled tasks** (cron jobs, background workers)

### 2.3 Map the Data Flow

Trace how data moves through the system:

1. Entry point (HTTP request, CLI command, event)
2. Validation / parsing layer
3. Business logic layer
4. Data access layer
5. External service calls
6. Response / output

---

## Phase 3 — Component Mapping

Identify and document the key components.

### 3.1 For Each Major Component, Capture:

- **Name and location** (file paths)
- **Responsibility** (what it does, in one sentence)
- **Dependencies** (what it uses)
- **Dependents** (what uses it)
- **Public interface** (key methods/functions/endpoints)
- **Configuration** (what config it reads)

### 3.2 Prioritize by Importance

Focus on components that are:
- Entry points or API surfaces
- Core business logic (domain services, use cases)
- Data access layers (repositories, DAOs, ORM models)
- Cross-cutting concerns (auth, logging, error handling, caching)
- Integration points (external APIs, message queues, file systems)

Skip components that are:
- Standard boilerplate (framework auto-generated code)
- Utility functions with no domain logic
- Test fixtures or mock implementations (unless the testing strategy itself is noteworthy)

---

## Phase 4 — Pattern Identification

Document the recurring patterns and conventions.

### 4.1 Code Patterns

Look for:
- **Naming conventions** (how classes, methods, files are named)
- **Error handling strategy** (exceptions, result types, error codes)
- **Dependency injection** approach (constructor injection, framework DI, service locator)
- **Configuration management** (env vars, config files, feature flags)
- **Logging conventions** (log levels, structured logging, correlation IDs)
- **API patterns** (REST resource naming, pagination, versioning, error responses)
- **Data validation** (where and how input is validated)
- **Security patterns** (authentication, authorization, CORS, rate limiting)

### 4.2 Testing Strategy

Identify:
- Test framework(s) in use
- Test structure (unit, integration, e2e, contract)
- Test conventions (naming, fixtures, mocking approach)
- Coverage expectations (if configured)

---

## Phase 5 — Dependency Analysis

Understand the external dependency landscape.

### 5.1 Categorize Dependencies

| Category | Examples |
|---|---|
| **Framework** | Spring Boot, Next.js, Django, Rails |
| **Database** | PostgreSQL, MongoDB, Redis, Elasticsearch |
| **Messaging** | Kafka, RabbitMQ, SQS |
| **Cloud services** | AWS SDK, Azure SDK, GCP client libraries |
| **Auth** | OAuth2 libraries, JWT, SAML |
| **Observability** | Prometheus, OpenTelemetry, Sentry |
| **Utility** | Lodash, Guava, Apache Commons |

Only create entity pages for dependencies that are **central to the project's functionality**, not for every utility library.

### 5.2 Check for Version Constraints

Note:
- Pinned versions vs. ranges
- Known deprecated dependencies
- Security-relevant dependency choices

---

## Phase 6 — Discussion & Wiki Generation

### 6.1 Discuss Findings

Before writing wiki pages, present findings to the user:
- Most important architectural decisions and their rationale
- Surprising patterns or anomalies
- Potential concerns (technical debt, security, scalability)
- Connections to existing wiki knowledge (if wiki already has content)

### 6.2 Generate Wiki Pages

Create pages following wiki conventions:

1. **Source page** in `wiki/sources/` — summary of the scanned module/project
2. **Entity pages** in `wiki/entities/` — for significant frameworks, tools, services
3. **Concept pages** in `wiki/concepts/` — for architectural patterns, design decisions
4. **Topic pages** in `wiki/topics/` — for major themes that tie multiple components together

### 6.3 Cross-Reference

- Link new pages to existing wiki pages where relevant
- Add `## See also` sections to all new pages
- Update existing pages if the scan reveals new information about them

### 6.4 Update Index & Log

- Add all new/updated pages to `wiki/index.md`
- Append a scan entry to `wiki/log.md`

---

## Incremental Scanning

When scanning a subdirectory or specific area:

1. **Read** `wiki/index.md` first to see what's already documented.
2. **Read** relevant existing wiki pages to avoid duplication.
3. **Focus** only on the scoped area, but note connections to other areas.
4. **Update** existing pages with new information rather than creating duplicates.
5. **Create** new pages only for genuinely new entities/concepts/topics found in this area.

A recommended workflow for large projects:
1. First scan: project root (get the high-level architecture)
2. Follow-up scans: one per major module or subsystem
3. Lint after all scans to catch missing cross-references and gaps

---

## Scan Report Template

After completing the scan, summarize:

```
## Scan Report

**Scope:** [what was scanned — full project or specific path]
**Tech stack:** [language, framework, key dependencies]
**Architecture:** [architectural style identified]

### Key Findings
- [Most important insight]
- [Second insight]
- [...]

### Pages Created
- [[wiki/sources/...]]
- [[wiki/entities/...]]
- [[wiki/concepts/...]]
- [[wiki/topics/...]]

### Pages Updated
- [[wiki/...]] — [what was added]

### Suggested Follow-ups
- [Areas that warrant deeper scanning]
- [Gaps that need additional sources or documentation]
```
