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
const GITHUB_REPO = 'Elverle/agentic-feature-factory';

// The .md files are the single source of truth: each command's description and argument
// hint are read from its frontmatter, never duplicated here.
const COMMAND_NAMES = [
  'feature-brainstorm',
  'feature-plan',
  'arch-review',
  'feature-dev',
  'feature-patch',
  'feature-review',
  'feature-docs',
  'feature-next',
];

export const COMMANDS = COMMAND_NAMES.map(loadCommand);

// `modelRole` selects which resolved model tier is injected into the agent file.
export const AGENTS = [
  { name: 'implementer', source: 'agents/implementer.md', modelRole: 'implementer' },
  { name: 'feature-documenter', source: 'agents/feature-documenter.md', modelRole: 'implementer' },
  { name: 'feature-reviewer', source: 'agents/feature-reviewer.md', modelRole: 'reviewer' },
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
  --reviewer <model>         Override reviewer model for target (default: orchestrator model)
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
    reviewer: null,
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
    } else if (arg === '--reviewer' && args[i + 1]) {
      options.reviewer = args[++i];
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (!arg.startsWith('-') && !target) {
      if (arg.toLowerCase() === 'adapt') continue;
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

function readJson(relPath) {
  return JSON.parse(readSource(relPath));
}

/**
 * Extracts YAML frontmatter and body from a markdown file.
 * Supports single-line values and folded/literal block scalars (`>`, `>-`, `|`, `|-`).
 */
export function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }
  const lines = match[1].split(/\r?\n/);
  const frontmatter = {};
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s/.test(line)) continue; // continuation lines are consumed by their key below
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (/^[>|]-?$/.test(val)) {
      const block = [];
      while (i + 1 < lines.length && (/^\s/.test(lines[i + 1]) || lines[i + 1] === '')) {
        block.push(lines[++i].trim());
      }
      val = val.startsWith('>') ? block.filter(Boolean).join(' ') : block.join('\n').trim();
    } else if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    frontmatter[key] = val;
  }
  return { frontmatter, body: match[2] };
}

/**
 * Builds a command entry from commands/<name>.md. Skill-based platforms (Antigravity, Copilot)
 * select skills by description, so the trigger is appended to the frontmatter description.
 */
function loadCommand(name) {
  const source = `commands/${name}.md`;
  const { frontmatter } = parseFrontmatter(readSource(source));
  if (!frontmatter.description) {
    throw new Error(`${source} has no frontmatter description`);
  }
  const argumentHint = frontmatter['argument-hint'] || '';
  const trigger = `/${name}${argumentHint ? ` ${argumentHint}` : ''}`;
  const description = `${frontmatter.description.replace(/\.$/, '')}. Triggers on ${trigger}.`;
  return { name, source, description, argumentHint };
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
 * Resolves orchestrator, implementer and reviewer models for a platform.
 * Precedence: CLI args > .local.md platform config > .local.md global config > defaults.
 * The reviewer tier falls back to the orchestrator's model when not configured.
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

  const reviewer = options.reviewer
    || platConf.reviewer
    || modelsConf.reviewer
    || config?.reviewer_model
    || defaults.reviewer
    || orchestrator;

  return { orchestrator, implementer, reviewer };
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
  console.log(`   Configured models: orchestrator=${models.orchestrator}, implementer=${models.implementer}, reviewer=${models.reviewer}`);
  const targetRoot = options.dest || (
    options.scope === 'global'
      ? path.join(os.homedir(), '.gemini', 'config', 'plugins', 'agentic-feature-factory')
      : path.join(process.cwd(), '.agents', 'plugins', 'agentic-feature-factory')
  );

  ensureDir(targetRoot, options.dryRun);

  // 1. Write plugin.json manifest (package.json is the source of name, version and metadata)
  const pkg = readJson('package.json');
  const pluginManifest = {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
    author: { name: pkg.author },
    homepage: pkg.homepage,
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
5. **Review (optional)**: Use skill \`feature-review\` to dispatch the \`feature-reviewer\` subagent on the feature's diff and get findings ordered by severity.
6. **Documentation**: Use skill \`feature-docs\` to document changes into the project wiki and README.
7. **Closure**: \`feature-dev\` bumps the project version and commits the feature on a dedicated branch (see the \`git.*\` settings in \`.agentic-feature-factory.local.md\`).

For bugfixes and small patches (few files, no contract or API change), use skill \`feature-patch\` instead of planning a feature: it keeps the gate, the optional review, the docs and the commit, and traces the change as patch \`n.x\` of a feature.

At any point, use skill \`feature-next\` to read the project's feature state and get the natural next step (it offers to launch it).

## Specialized Subagents

The orchestrator dispatches the following specialized subagents via \`invoke_subagent\`:

`;

  for (const agent of AGENTS) {
    const raw = readSource(agent.source);
    const agentSource = injectFrontmatterModel(raw, models[agent.modelRole] || models.implementer);
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
  console.log(`   Configured models: orchestrator=${models.orchestrator}, implementer=${models.implementer}, reviewer=${models.reviewer}`);
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
    const transformed = injectFrontmatterModel(raw, models[agent.modelRole] || models.implementer);
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
  console.log(`   Configured models: orchestrator=${models.orchestrator}, implementer=${models.implementer}, reviewer=${models.reviewer}`);
  
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
- **Phase 3 (Execution)**: Run \`/feature-dev\` to implement work packages test-driven, verify build gates, document and commit the feature.
- **Phase 4 (Review, optional)**: Run \`/feature-review\` on the feature's diff for findings by severity; triage and fixes stay with the user.
- **Phase 5 (Documentation)**: Run \`/feature-docs\` to document changes into the project wiki and README adhering to existing conventions (integrated at the end of \`/feature-dev\`).
- **Patches and bugfixes**: Run \`/feature-patch [n | n.x] <description>\` for small changes (few files, no contract or API change): diagnosis, build gate, optional review, docs and a patch commit, without spec or plan.
- **Not sure what comes next?** Run \`/feature-next\` to read the project's feature state and get the next command to run.

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
// Claude Code does not load plugin folders copied under ~/.claude/plugins/: plugins come from
// a registered marketplace, which Claude Code snapshots into ~/.claude/plugins/cache/. This
// adapter therefore registers the marketplace and enables the plugin in a settings.json:
//   - global scope  → ~/.claude/settings.json, `directory` source pointing at this checkout;
//   - project scope → <cwd>/.claude/settings.json, `github` source (shareable with a team).
// Model tiers are not injected into files here: /feature-dev and /feature-review pass the
// resolved `models.claude.*` to the Agent tool at dispatch time.
function adaptClaude(options, config) {
  const models = resolvePlatformModels('claude', config, options);
  console.log(`\n📦 Registering for Claude Code (Scope: ${options.scope})...`);
  console.log(`   Configured models: orchestrator=${models.orchestrator}, implementer=${models.implementer}, reviewer=${models.reviewer}`);

  const marketplaceName = readJson('.claude-plugin/marketplace.json').name;
  const pluginName = readJson('.claude-plugin/plugin.json').name;
  const pluginId = `${pluginName}@${marketplaceName}`;
  const isGlobal = options.scope === 'global';

  const settingsDir = options.dest || (isGlobal
    ? path.join(os.homedir(), '.claude')
    : path.join(process.cwd(), '.claude'));
  const settingsPath = path.join(settingsDir, 'settings.json');
  const source = isGlobal
    ? { source: 'directory', path: REPO_ROOT }
    : { source: 'github', repo: GITHUB_REPO };

  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (err) {
      // Never overwrite a settings file we could not parse: it would drop the user's settings.
      throw new Error(`Cannot parse ${settingsPath} (${err.message}); fix it, then re-run.`);
    }
  }

  const known = settings.extraKnownMarketplaces?.[marketplaceName];
  const alreadyRegistered = JSON.stringify(known?.source) === JSON.stringify(source)
    && settings.enabledPlugins?.[pluginId] === true;

  if (alreadyRegistered) {
    console.log(`✓ ${pluginId} already registered in ${settingsPath}`);
  } else {
    settings.extraKnownMarketplaces = { ...settings.extraKnownMarketplaces, [marketplaceName]: { ...known, source } };
    settings.enabledPlugins = { ...settings.enabledPlugins, [pluginId]: true };
    writeFileSafe(settingsPath, JSON.stringify(settings, null, 2) + '\n', options.dryRun);
  }

  console.log(`\n💡 Next steps in Claude Code:`);
  console.log(`   /plugin marketplace update ${marketplaceName}   # refresh the cached snapshot after a pull or edit`);
  console.log(`   then restart the session and check /help for the /feature-* commands.`);
  console.log(`   If they are missing: /plugin install ${pluginId}`);
  console.log(`✨ Claude Code registration complete! Settings: ${settingsPath}`);
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

// Run only when executed as a CLI (directly or through the npm bin shim), not when imported.
const invokedPath = process.argv[1] ? fs.realpathSync(path.resolve(process.argv[1])) : '';
if (invokedPath === fs.realpathSync(__filename)) {
  try {
    main();
  } catch (err) {
    console.error(`\n❌ ${err.message}`);
    process.exit(1);
  }
}

