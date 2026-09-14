#!/usr/bin/env node

/**
 * agentic-feature-factory Adapter Engine
 * Multi-platform adapter for Antigravity, AGY CLI, Codex, GitHub Copilot, and Claude Code.
 * 
 * Zero external dependencies. Works on Node.js, Bun, Deno.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

// Command metadata
const COMMANDS = [
  {
    name: 'feature-brainstorm',
    description: 'Explores user intent, requirements and technical approaches through proactive questions, producing a validated feature spec (spec.md). Triggers on /feature-brainstorm or when brainstorming a feature.',
    argumentHint: '<feature-number or description>',
    source: 'commands/feature-brainstorm.md',
  },
  {
    name: 'feature-plan',
    description: 'Analyzes requirements + codebase and asks clarifying questions, then produces a work-package plan. Handles feature numbering and folders. Triggers on /feature-plan or when asked to plan a feature.',
    argumentHint: '<feature-number or description> [spec/master-plan path]',
    source: 'commands/feature-plan.md',
  },
  {
    name: 'feature-dev',
    description: 'Orchestrates the development of a feature: coordinates implementer subagents, verification gates, confirmation, and final review. Triggers on /feature-dev <n> [plan-path].',
    argumentHint: '<feature-number> [plan-path]',
    source: 'commands/feature-dev.md',
  },
  {
    name: 'arch-review',
    description: 'Architecture review of a feature or whole planned set: puts plan against codebase and proposes high-impact fixes with WP graft anchors. Triggers on /arch-review [n].',
    argumentHint: '<feature-number> (empty = whole planned set)',
    source: 'commands/arch-review.md',
  },
  {
    name: 'feature-docs',
    description: 'Documents code in wiki format via feature-documenter subagent (feature/area/lint), adopting project conventions. Triggers on /feature-docs [scope].',
    argumentHint: '[feature-number | path/area | "lint"]',
    source: 'commands/feature-docs.md',
  }
];

const AGENTS = [
  {
    name: 'implementer',
    description: "Implementer of the /feature-dev pipeline. Receives ONE work package from the feature plan and implements it test-driven, staying within the WP's file boundaries.",
    source: 'agents/implementer.md',
  },
  {
    name: 'feature-documenter',
    description: "Documenter of the /feature-dev and /feature-docs pipeline. Updates the project's wiki/technical documentation adopting project conventions.",
    source: 'agents/feature-documenter.md',
  }
];

const BUILD_SKILLS = [
  { name: 'spring-maven-build', source: 'skills/spring-maven-build/SKILL.md' },
  { name: 'node-frontend-build', source: 'skills/node-frontend-build/SKILL.md' },
];

function printHelp() {
  console.log(`
Agentic Feature Factory - Multi-Platform Adapter CLI
====================================================

Usage:
  node scripts/adapt.mjs <target> [options]
  bun run adapt <target> [options]
  npm run adapt <target> [options]

Targets:
  antigravity, agy, gemini   Install/adapt for Antigravity Desktop & AGY CLI
  codex                      Install/adapt for OpenAI Codex CLI
  copilot                    Install/adapt for GitHub Copilot (VS Code Chat / CLI)
  claude                     Install/adapt for Claude Code
  all                        Install/adapt for all platforms

Options:
  --scope <global|project>   Installation scope (default: global)
  --mode <copy|link>         File deployment mode (default: copy)
  --dest <path>              Override target installation directory
  --orchestrator <model>     Override orchestrator model for target
  --implementer <model>      Override implementer model for target
  --dry-run                  Simulate actions without writing files
  --help, -h                 Show this help message

Examples:
  bun run adapt antigravity                  # Install globally for Antigravity & AGY CLI
  npm run adapt codex                        # Install globally for Codex
  bun run adapt copilot --scope project      # Generate .github/ in current project
  node scripts/adapt.mjs codex --orchestrator gpt5.6-sol --implementer gpt5.6-luna
  node scripts/adapt.mjs all --dry-run       # Preview all adapter operations
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  let target = null;
  const options = {
    scope: 'global',
    mode: 'copy',
    dest: null,
    orchestrator: null,
    implementer: null,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--scope' && args[i + 1]) {
      options.scope = args[++i].toLowerCase();
    } else if (arg === '--mode' && args[i + 1]) {
      options.mode = args[++i].toLowerCase();
    } else if (arg === '--dest' && args[i + 1]) {
      options.dest = path.resolve(args[++i]);
    } else if (arg === '--orchestrator' && args[i + 1]) {
      options.orchestrator = args[++i];
    } else if (arg === '--implementer' && args[i + 1]) {
      options.implementer = args[++i];
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (!arg.startsWith('-') && !target) {
      target = arg.toLowerCase();
    }
  }

  return { target, options };
}

function ensureDir(dirPath, dryRun) {
  if (dryRun) {
    console.log(`[DRY-RUN] Create directory: ${dirPath}`);
    return;
  }
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFileSafe(filePath, content, dryRun) {
  if (dryRun) {
    console.log(`[DRY-RUN] Write file: ${filePath} (${content.length} bytes)`);
    return;
  }
  ensureDir(path.dirname(filePath), false);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✓ Wrote: ${filePath}`);
}

function copyOrLink(srcPath, destPath, mode, dryRun) {
  if (dryRun) {
    console.log(`[DRY-RUN] ${mode === 'link' ? 'Link' : 'Copy'}: ${srcPath} -> ${destPath}`);
    return;
  }
  ensureDir(path.dirname(destPath), false);
  if (mode === 'link') {
    try {
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
      }
      fs.symlinkSync(srcPath, destPath, 'file');
      console.log(`✓ Linked: ${destPath} -> ${srcPath}`);
      return;
    } catch (err) {
      console.warn(`! Symlink failed (${err.message}), falling back to copy.`);
    }
  }
  fs.copyFileSync(srcPath, destPath);
  console.log(`✓ Copied: ${destPath}`);
}

function readSource(relPath) {
  const fullPath = path.join(REPO_ROOT, relPath);
  return fs.readFileSync(fullPath, 'utf8');
}

/**
 * Extracts YAML frontmatter and body from a markdown file.
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }
  const lines = match[1].split(/\r?\n/);
  const frontmatter = {};
  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      let val = line.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      frontmatter[key] = val;
    }
  }
  return { frontmatter, body: match[2] };
}

const DEFAULT_MODELS = {
  codex: { orchestrator: 'gpt5.6-sol', implementer: 'gpt5.6-luna' },
  claude: { orchestrator: 'opus', implementer: 'sonnet' },
  antigravity: { orchestrator: 'pro', implementer: 'inherit' },
  agy: { orchestrator: 'pro', implementer: 'inherit' },
  gemini: { orchestrator: 'pro', implementer: 'inherit' },
  copilot: { orchestrator: 'gpt-4o', implementer: 'gpt-4o' },
};

/**
 * Basic zero-dependency YAML parser for nested objects in frontmatter.
 */
function parseYaml(yamlString) {
  const lines = yamlString.split(/\r?\n/);
  const root = {};
  const stack = [{ indent: -1, obj: root }];

  for (const rawLine of lines) {
    if (!rawLine.trim() || rawLine.trim().startsWith('#')) continue;
    const indent = rawLine.search(/\S/);
    const line = rawLine.trim();
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    let val = line.slice(colonIdx + 1).trim();

    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    const current = stack[stack.length - 1].obj;

    if (val === '') {
      current[key] = {};
      stack.push({ indent, obj: current[key] });
    } else {
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      current[key] = val;
    }
  }
  return root;
}

/**
 * Searches for .agentic-feature-factory.local.md across standard locations.
 */
function loadLocalConfig() {
  const candidates = [
    path.join(process.cwd(), '.agentic-feature-factory.local.md'),
    path.join(REPO_ROOT, '.agentic-feature-factory.local.md'),
    path.join(process.cwd(), '.agents', '.agentic-feature-factory.local.md'),
    path.join(process.cwd(), '.codex', '.agentic-feature-factory.local.md'),
    path.join(process.cwd(), '.claude', '.agentic-feature-factory.local.md'),
    path.join(os.homedir(), '.agentic-feature-factory.local.md'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try {
        const raw = fs.readFileSync(candidate, 'utf8');
        const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (match) {
          console.log(`ℹ️  Loaded local configuration from: ${candidate}`);
          return parseYaml(match[1]);
        }
      } catch (e) {
        console.warn(`! Failed to parse local config at ${candidate}: ${e.message}`);
      }
    }
  }
  return {};
}

/**
 * Resolves orchestrator and implementer models for a platform.
 * Precedence: CLI args > .local.md platform config > .local.md global config > defaults.
 */
function resolvePlatformModels(platform, config, options = {}) {
  const normPlatform = (platform === 'claude-code' ? 'claude' : platform === 'github-copilot' ? 'copilot' : platform).toLowerCase();
  const defaults = DEFAULT_MODELS[normPlatform] || { orchestrator: 'inherit', implementer: 'inherit' };

  const modelsConf = config?.models || {};
  const platConf = modelsConf[normPlatform] || modelsConf[platform] || {};

  const orchestrator = options.orchestrator 
    || platConf.orchestrator 
    || modelsConf.orchestrator 
    || config?.orchestrator_model 
    || defaults.orchestrator;

  const implementer = options.implementer 
    || platConf.implementer 
    || modelsConf.implementer 
    || config?.implementer_model 
    || defaults.implementer;

  return { orchestrator, implementer };
}

/**
 * Injects or updates a frontmatter field `model: <modelName>` in markdown content.
 */
function injectFrontmatterModel(content, modelName) {
  if (!modelName) return content;
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return `---\nmodel: ${modelName}\n---\n\n${content}`;
  }
  const fmLines = match[1].split(/\r?\n/);
  let replaced = false;
  const newFmLines = fmLines.map(line => {
    if (line.trim().startsWith('model:')) {
      replaced = true;
      return `model: ${modelName}`;
    }
    return line;
  });
  if (!replaced) {
    newFmLines.push(`model: ${modelName}`);
  }
  return `---\n${newFmLines.join('\n')}\n---\n${match[2]}`;
}

// ==========================================
// TARGET: Antigravity / AGY CLI
// ==========================================
function adaptAntigravity(options, config) {
  const models = resolvePlatformModels('antigravity', config, options);
  console.log(`\n📦 Adapting for Antigravity & AGY CLI (Scope: ${options.scope})...`);
  console.log(`   Configured models: orchestrator=${models.orchestrator}, implementer=${models.implementer}`);
  const targetRoot = options.dest || (
    options.scope === 'global'
      ? path.join(os.homedir(), '.gemini', 'config', 'plugins', 'agentic-feature-factory')
      : path.join(process.cwd(), '.agents', 'plugins', 'agentic-feature-factory')
  );

  ensureDir(targetRoot, options.dryRun);

  // 1. Write plugin.json manifest
  const pluginManifest = {
    name: "agentic-feature-factory",
    version: "1.2.0",
    description: "Agent-driven feature development pipeline: work-package planning, architecture review, multi-agent orchestration, code-review and wiki documentation.",
    author: { name: "Elverle" },
    homepage: "https://github.com/Elverle/agentic-feature-factory#readme"
  };
  writeFileSafe(path.join(targetRoot, 'plugin.json'), JSON.stringify(pluginManifest, null, 2) + '\n', options.dryRun);

  // 2. Install Build Skills
  for (const skill of BUILD_SKILLS) {
    const destDir = path.join(targetRoot, 'skills', skill.name);
    ensureDir(destDir, options.dryRun);
    copyOrLink(path.join(REPO_ROOT, skill.source), path.join(destDir, 'SKILL.md'), options.mode, options.dryRun);
  }

  // 3. Convert commands to Antigravity Skills
  for (const cmd of COMMANDS) {
    const destDir = path.join(targetRoot, 'skills', cmd.name);
    ensureDir(destDir, options.dryRun);

    const raw = readSource(cmd.source);
    const { body } = parseFrontmatter(raw);

    const skillContent = `---
name: ${cmd.name}
description: >-
  ${cmd.description}
---

${body.trim()}
`;
    writeFileSafe(path.join(destDir, 'SKILL.md'), skillContent, options.dryRun);
  }

  // 4. Expose Subagents & Rules
  const rulesDir = path.join(targetRoot, 'rules');
  ensureDir(rulesDir, options.dryRun);

  let agentsRuleContent = `# Agentic Feature Factory — Pipeline Rules & Subagents

This project defines the agentic feature development pipeline:
1. **Brainstorming**: Use skill \`feature-brainstorm\` to explore intent, technical approaches and produce a validated feature specification (\`spec.md\`).
2. **Planning**: Use skill \`feature-plan\` to analyze requirements and produce work packages.
3. **Architecture Review**: Use skill \`arch-review\` to assess feasibility and graft pain-point fixes.
4. **Development**: Use skill \`feature-dev\` to orchestrate Implementer subagents and verify gates.
5. **Documentation**: Use skill \`feature-docs\` to document changes into the project wiki.

## Specialized Subagents

The orchestrator dispatches the following specialized subagents via \`invoke_subagent\`:

`;

  for (const agent of AGENTS) {
    const raw = readSource(agent.source);
    const agentSource = injectFrontmatterModel(raw, models.implementer);
    agentsRuleContent += `### Subagent: \`${agent.name}\`\n\n${agentSource}\n\n---\n\n`;
  }

  writeFileSafe(path.join(rulesDir, 'AGENTS.md'), agentsRuleContent, options.dryRun);

  console.log(`✨ Antigravity & AGY CLI adapter complete! Location: ${targetRoot}`);
}

// ==========================================
// TARGET: OpenAI Codex CLI
// ==========================================
function adaptCodex(options, config) {
  const models = resolvePlatformModels('codex', config, options);
  console.log(`\n📦 Adapting for OpenAI Codex CLI (Scope: ${options.scope})...`);
  console.log(`   Configured models: orchestrator=${models.orchestrator}, implementer=${models.implementer}`);
  const targetRoot = options.dest || (
    options.scope === 'global'
      ? path.join(os.homedir(), '.codex')
      : path.join(process.cwd(), '.codex')
  );

  ensureDir(targetRoot, options.dryRun);

  // 1. Install agent roles in agents/
  const agentsDir = path.join(targetRoot, 'agents');
  ensureDir(agentsDir, options.dryRun);
  for (const agent of AGENTS) {
    const destPath = path.join(agentsDir, `${agent.name}.md`);
    const raw = readSource(agent.source);
    const transformed = injectFrontmatterModel(raw, models.implementer);
    writeFileSafe(destPath, transformed, options.dryRun);
  }

  // 2. Install prompt templates in prompts/
  const promptsDir = path.join(targetRoot, 'prompts');
  ensureDir(promptsDir, options.dryRun);
  for (const cmd of COMMANDS) {
    const destPath = path.join(promptsDir, `${cmd.name}.md`);
    const raw = readSource(cmd.source);
    const transformed = injectFrontmatterModel(raw, models.orchestrator);
    writeFileSafe(destPath, transformed, options.dryRun);
  }

  // 3. Inform about multi-agent configuration in config.toml
  console.log(`\n💡 Codex Multi-Agent Reminder:`);
  console.log(`Ensure that your ~/.codex/config.toml contains:`);
  console.log(`[features]`);
  console.log(`multi_agent = true\n`);

  console.log(`✨ Codex adapter complete! Location: ${targetRoot}`);
}

// ==========================================
// TARGET: GitHub Copilot
// ==========================================
function adaptCopilot(options, config) {
  const models = resolvePlatformModels('copilot', config, options);
  console.log(`\n📦 Adapting for GitHub Copilot (Scope: ${options.scope})...`);
  console.log(`   Configured models: orchestrator=${models.orchestrator}, implementer=${models.implementer}`);
  
  let promptsDir;
  let instructionsPath;

  if (options.scope === 'project' || options.dest) {
    const root = options.dest || process.cwd();
    promptsDir = path.join(root, '.github', 'prompts');
    instructionsPath = path.join(root, '.github', 'copilot-instructions.md');
  } else {
    const globalCopilotDir = path.join(os.homedir(), '.copilot', 'prompts');
    promptsDir = options.dest || globalCopilotDir;
    instructionsPath = path.join(os.homedir(), '.copilot', 'instructions.md');
  }

  ensureDir(promptsDir, options.dryRun);

  // 1. Generate Copilot .prompt.md files
  for (const cmd of COMMANDS) {
    const raw = readSource(cmd.source);
    const { body } = parseFrontmatter(raw);

    const promptContent = `---
name: ${cmd.name}
description: "${cmd.description.replace(/"/g, '\\"')}"
model: ${models.orchestrator}
---

${body.trim()}
`;
    const destPath = path.join(promptsDir, `${cmd.name}.prompt.md`);
    writeFileSafe(destPath, promptContent, options.dryRun);
  }

  // 2. Generate copilot-instructions.md
  const instructionsContent = `# Agentic Feature Factory — Pipeline Guidelines

When developing features in this project, adhere to the agentic feature development pipeline:
- **Phase 0 (Brainstorming)**: Run \`/feature-brainstorm\` to clarify intent, explore approaches, and produce a feature specification (\`spec.md\`).
- **Phase 1 (Planning)**: Run \`/feature-plan\` to analyze requirements and generate file-disjoint work packages.
- **Phase 2 (Architecture Review)**: Run \`/arch-review\` to assess architectural debt and graft fixes into work packages.
- **Phase 3 (Execution)**: Run \`/feature-dev\` to implement work packages test-driven and verify build gates.
- **Phase 4 (Documentation)**: Run \`/feature-docs\` to document changes into the project wiki adhering to existing conventions.

## Build Verification Gates
- **Spring Boot / Maven**: Formatting with Spotless (\`mvn spotless:apply\`) + full test suite with \`mvn verify\`.
- **Node.js (Frontend)**: Lint + typecheck (\`tsc --noEmit\`) + unit tests + production build (\`npm run build\`).
`;
  writeFileSafe(instructionsPath, instructionsContent, options.dryRun);

  console.log(`✨ GitHub Copilot adapter complete! Prompts: ${promptsDir}`);
}

// ==========================================
// TARGET: Claude Code
// ==========================================
function adaptClaude(options, config) {
  const models = resolvePlatformModels('claude', config, options);
  console.log(`\n📦 Validating/Adapting for Claude Code (Scope: ${options.scope})...`);
  console.log(`   Configured models: orchestrator=${models.orchestrator}, implementer=${models.implementer}`);
  const targetRoot = options.dest || (
    options.scope === 'global'
      ? path.join(os.homedir(), '.claude', 'plugins', 'agentic-feature-factory')
      : path.join(process.cwd(), '.claude-plugin')
  );

  if (options.scope === 'global') {
    ensureDir(targetRoot, options.dryRun);
    copyOrLink(path.join(REPO_ROOT, '.claude-plugin', 'plugin.json'), path.join(targetRoot, 'plugin.json'), options.mode, options.dryRun);
    copyOrLink(path.join(REPO_ROOT, '.claude-plugin', 'marketplace.json'), path.join(targetRoot, 'marketplace.json'), options.mode, options.dryRun);
    
    // Copy commands, agents, skills
    for (const cmd of COMMANDS) {
      const dest = path.join(targetRoot, cmd.source);
      const raw = readSource(cmd.source);
      const transformed = injectFrontmatterModel(raw, models.orchestrator);
      writeFileSafe(dest, transformed, options.dryRun);
    }
    for (const agent of AGENTS) {
      const dest = path.join(targetRoot, agent.source);
      const raw = readSource(agent.source);
      const transformed = injectFrontmatterModel(raw, models.implementer);
      writeFileSafe(dest, transformed, options.dryRun);
    }
    for (const skill of BUILD_SKILLS) {
      const dest = path.join(targetRoot, skill.source);
      copyOrLink(path.join(REPO_ROOT, skill.source), dest, options.mode, options.dryRun);
    }
    console.log(`✨ Claude Code global plugin installed at: ${targetRoot}`);
  } else {
    console.log(`✓ Claude Code native repository structure verified at: ${REPO_ROOT}`);
  }
}

// ==========================================
// MAIN DISPATCHER
// ==========================================
function main() {
  const { target, options } = parseArgs();

  if (options.help || !target) {
    printHelp();
    process.exit(options.help ? 0 : 1);
  }

  const config = loadLocalConfig();

  console.log(`\n🚀 agentic-feature-factory adapter`);
  console.log(`----------------------------------`);
  console.log(`Target:   ${target}`);
  console.log(`Scope:    ${options.scope}`);
  console.log(`Mode:     ${options.mode}`);
  console.log(`Dry Run:  ${options.dryRun ? 'YES' : 'NO'}`);

  switch (target) {
    case 'antigravity':
    case 'agy':
    case 'gemini':
      adaptAntigravity(options, config);
      break;
    case 'codex':
      adaptCodex(options, config);
      break;
    case 'copilot':
    case 'github-copilot':
      adaptCopilot(options, config);
      break;
    case 'claude':
    case 'claude-code':
      adaptClaude(options, config);
      break;
    case 'all':
      adaptAntigravity(options, config);
      adaptCodex(options, config);
      adaptCopilot(options, config);
      adaptClaude(options, config);
      break;
    default:
      console.error(`\n❌ Unknown target: "${target}"`);
      printHelp();
      process.exit(1);
  }

  console.log(`\n🎉 All operations completed successfully!`);
}

main();

