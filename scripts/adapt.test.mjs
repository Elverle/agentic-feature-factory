// Run with `npm test`. Zero dependencies: node:test + node:assert (Node >= 20).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { COMMANDS, AGENTS, parseFrontmatter } from './adapt.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ADAPT = path.join(REPO_ROOT, 'scripts', 'adapt.mjs');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'));
const readText = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');

/** Runs the CLI with an isolated home and working directory, so nothing real is touched. */
function runAdapter(args, home = fs.mkdtempSync(path.join(os.tmpdir(), 'aff-home-'))) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'aff-cwd-'));
  const result = spawnSync(process.execPath, [ADAPT, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, HOME: home, USERPROFILE: home },
  });
  return { ...result, home, cwd };
}

test('parseFrontmatter reads plain, quoted and folded values', () => {
  const { frontmatter, body } = parseFrontmatter(
    '---\nname: x\ndescription: "quoted: value"\nlong: >-\n  first line\n  second line\nafter: y\n---\nBody\n',
  );
  assert.equal(frontmatter.name, 'x');
  assert.equal(frontmatter.description, 'quoted: value');
  assert.equal(frontmatter.long, 'first line second line');
  assert.equal(frontmatter.after, 'y');
  assert.equal(body, 'Body\n');
});

test('every command file is registered, and every registered command has a description', () => {
  const onDisk = fs.readdirSync(path.join(REPO_ROOT, 'commands'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''))
    .sort();
  assert.deepEqual(COMMANDS.map((c) => c.name).sort(), onDisk);
  for (const cmd of COMMANDS) {
    assert.match(cmd.description, new RegExp(`Triggers on /${cmd.name}`), cmd.name);
  }
});

test('every agent file is registered', () => {
  const onDisk = fs.readdirSync(path.join(REPO_ROOT, 'agents')).map((f) => f.replace(/\.md$/, '')).sort();
  assert.deepEqual(AGENTS.map((a) => a.name).sort(), onDisk);
});

test('every command is documented in the README', () => {
  const readme = readText('README.md');
  for (const cmd of COMMANDS) {
    assert.ok(readme.includes(`/${cmd.name}`), `README does not mention /${cmd.name}`);
  }
});

test('manifests agree on name and version', () => {
  const pkg = readJson('package.json');
  const plugin = readJson('.claude-plugin/plugin.json');
  const marketplace = readJson('.claude-plugin/marketplace.json');
  assert.equal(plugin.version, pkg.version, 'plugin.json and package.json versions differ');
  assert.equal(plugin.name, pkg.name);
  assert.ok(marketplace.plugins.some((p) => p.name === plugin.name), 'marketplace does not list the plugin');
});

test('every git setting in the example file is documented in the README git table', () => {
  const example = readText('.agentic-feature-factory.local.example.md');
  const gitBlock = example.match(/^git:\r?\n((?:[ \t]+.*\r?\n)+)/m);
  assert.ok(gitBlock, 'no git: block in the example settings file');
  const keys = [...gitBlock[1].matchAll(/^\s+(\w+):/gm)].map((m) => m[1]);
  assert.ok(keys.length > 0, 'no keys under git:');
  // Only the "Git behaviour" list item counts: from its bullet to the next top-level bullet.
  const gitTable = readText('README.md').match(/^- \*\*Git behaviour\*\*[\s\S]*?(?=^- \*\*)/m);
  assert.ok(gitTable, 'README has no "Git behaviour" section');
  for (const key of keys) {
    // Table rows are indented: the table sits inside the list item.
    assert.match(gitTable[0], new RegExp(`^\\s*\\|\\s*\`${key}\`\\s*\\|`, 'm'), `README git table has no row for git.${key}`);
  }
});

// Prompt invariants: rules /feature-patch must keep. They pin review findings that no runtime
// test can exercise (the command is a prompt), so a later edit cannot silently drop them.
// Whitespace is collapsed so the invariants survive re-wrapping of the prompt.
const patchPrompt = () => readText('commands/feature-patch.md').replace(/\s+/g, ' ');

test('feature-patch: a resumed patch always re-resolves the branch, a specified one re-verifies its diagnosis', () => {
  const p = patchPrompt();
  assert.match(p, /when resuming, \*\*always run Phase 4\*\*/i);
  assert.match(p, /`specified` patch[^.]*starts at Phase 2/i);
  assert.match(p, /## Docs/);
});

test('feature-patch: Phase 8 refuses to commit on the main branch', () => {
  assert.match(patchPrompt(), /## Phase 8 [^#]*?If you are on the main branch, stop/);
});

test('feature-patch: the next patch number also counts branches and commits', () => {
  const p = patchPrompt();
  assert.ok(p.includes('<patch_branch_prefix><n>.*'), 'branches not counted');
  assert.ok(p.includes('git log --all -E --grep "\\(feature-<n>\\.[0-9]+\\)"'), 'commits not counted');
});

test('feature-patch: the final status and Commit section are written before committing', () => {
  assert.match(patchPrompt(), /before committing, write the final status/i);
});

test('feature-patch: a feature counts as merged when done or its commit is reachable from main', () => {
  const p = patchPrompt();
  assert.match(p, /squash/i);
  assert.ok(p.includes('git log <main> -E --grep "\\(feature-<n>\\)"'), 'reachability from main not checked');
});

test('feature-patch: docs use the documenter in document feature mode', () => {
  const p = patchPrompt();
  assert.match(p, /\*\*document feature\*\* mode/);
  assert.doesNotMatch(p, /document area/);
});

test('feature-patch: an unknown or unimplemented feature number is questioned', () => {
  assert.match(patchPrompt(), /feature `n` does not exist or is not implemented[^.]*ask me/i);
});

test('feature-patch: resuming a patch that does not exist proposes the next free number', () => {
  assert.match(patchPrompt(), /If `n\.x` does not exist[^.]*next free number/);
});

test('feature-patch: BLOCKED, questions and out-of-list files in a COMPLETE report are handled', () => {
  const p = patchPrompt();
  assert.match(p, /`BLOCKED` or with questions/);
  assert.match(p, /even in a `COMPLETE` report/);
});

test('feature-patch: no version holder skips the bump, and the CHANGELOG entry survives a skipped bump', () => {
  const p = patchPrompt();
  assert.match(p, /no version holder[^.]*never invent one/i);
  assert.match(p, /CHANGELOG entry[^.]*even when the bump is skipped/);
});

test('feature-patch: only the patch row of the index is staged', () => {
  assert.match(patchPrompt(), /stage only the patch's row of `feature-index\.md`/);
});

test('feature-patch: escalation records the target feature and reports a leftover branch', () => {
  const p = patchPrompt();
  assert.match(p, /Escalated to: feature <m>/);
  assert.match(p, /branch[^.]*has no commits[^.]*tell me/);
});

const prompt = (name) => readText(`commands/${name}.md`).replace(/\s+/g, ' ');

test('feature-review: a patch lookup with zero or several commits asks', () => {
  assert.match(prompt('feature-review'), /finds no commit or more than one, \*\*ask me\*\*/);
});

test('feature-next: patch stages are told apart by the patch status', () => {
  const p = prompt('feature-next');
  assert.match(p, /\| `specified` \| patch status `specified`/);
  assert.match(p, /\| `in-progress` \| patch status `in-progress`/);
  assert.match(p, /feature named in the patch file's `Escalated to:`/);
});

test('feature-brainstorm: the fix classification can be overridden', () => {
  assert.match(prompt('feature-brainstorm'), /`--feature`/);
});

test('README shows the patch number form and /feature-patch in the git settings', () => {
  const readme = readText('README.md');
  assert.match(readme, /\| `\/feature-review \[n\\\|n\.x\\\|path\]` \|/);
  assert.match(readme, /\| `\/feature-next \[n\\\|n\.x\]` \|/);
  for (const key of ['auto_commit', 'version_bump']) {
    assert.match(readme, new RegExp(`^\\s*\\|\\s*\`${key}\`[^\\n]*/feature-patch`, 'm'), `${key} row omits /feature-patch`);
  }
});

test('the CHANGELOG has an entry for the current version', () => {
  const { version } = readJson('package.json');
  assert.match(readText('CHANGELOG.md'), new RegExp(`^## \\[${version.replace(/\./g, '\\.')}\\]`, 'm'));
});

test('adapt all writes every platform and mentions every command in the pipeline texts', () => {
  const { status, stderr, home } = runAdapter(['all']);
  assert.equal(status, 0, stderr);

  const antigravity = path.join(home, '.gemini', 'config', 'plugins', 'agentic-feature-factory');
  const rules = fs.readFileSync(path.join(antigravity, 'rules', 'AGENTS.md'), 'utf8');
  const copilotInstructions = fs.readFileSync(path.join(home, '.copilot', 'instructions.md'), 'utf8');
  const manifest = JSON.parse(fs.readFileSync(path.join(antigravity, 'plugin.json'), 'utf8'));
  assert.equal(manifest.version, readJson('package.json').version);

  for (const cmd of COMMANDS) {
    const skill = fs.readFileSync(path.join(antigravity, 'skills', cmd.name, 'SKILL.md'), 'utf8');
    assert.equal(parseFrontmatter(skill).frontmatter.description, cmd.description, `${cmd.name} skill description`);
    assert.ok(fs.existsSync(path.join(home, '.codex', 'prompts', `${cmd.name}.md`)), `codex prompt ${cmd.name}`);
    assert.ok(fs.existsSync(path.join(home, '.copilot', 'prompts', `${cmd.name}.prompt.md`)), `copilot prompt ${cmd.name}`);
    assert.ok(rules.includes(cmd.name), `Antigravity rules do not mention ${cmd.name}`);
    assert.ok(copilotInstructions.includes(`/${cmd.name}`), `Copilot instructions do not mention /${cmd.name}`);
  }
});

test('adapt claude registers the marketplace and preserves existing settings', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'aff-home-'));
  const settingsPath = path.join(home, '.claude', 'settings.json');
  fs.mkdirSync(path.dirname(settingsPath));
  fs.writeFileSync(settingsPath, JSON.stringify({ theme: 'dark', enabledPlugins: { 'other@market': true } }));

  const first = runAdapter(['claude'], home);
  assert.equal(first.status, 0, first.stderr);
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  assert.equal(settings.theme, 'dark');
  assert.equal(settings.enabledPlugins['other@market'], true);
  assert.equal(settings.enabledPlugins['agentic-feature-factory@agentic-feature-factory'], true);
  assert.deepEqual(settings.extraKnownMarketplaces['agentic-feature-factory'].source, {
    source: 'directory',
    path: REPO_ROOT,
  });

  const second = runAdapter(['claude'], home);
  assert.equal(second.status, 0, second.stderr);
  assert.match(second.stdout, /already registered/);
});

test('adapt claude --scope project uses the GitHub source', () => {
  const { status, stderr, cwd } = runAdapter(['claude', '--scope', 'project']);
  assert.equal(status, 0, stderr);
  const settings = JSON.parse(fs.readFileSync(path.join(cwd, '.claude', 'settings.json'), 'utf8'));
  assert.deepEqual(settings.extraKnownMarketplaces['agentic-feature-factory'].source, {
    source: 'github',
    repo: 'Elverle/agentic-feature-factory',
  });
});

test('adapt claude refuses to overwrite a settings file it cannot parse', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'aff-home-'));
  const settingsPath = path.join(home, '.claude', 'settings.json');
  fs.mkdirSync(path.dirname(settingsPath));
  fs.writeFileSync(settingsPath, '{ not json');

  const { status, stderr } = runAdapter(['claude'], home);
  assert.equal(status, 1);
  assert.match(stderr, /Cannot parse/);
  assert.equal(fs.readFileSync(settingsPath, 'utf8'), '{ not json');
});

test('dry-run writes nothing', () => {
  const { status, stderr, home } = runAdapter(['all', '--dry-run']);
  assert.equal(status, 0, stderr);
  assert.deepEqual(fs.readdirSync(home), []);
});
