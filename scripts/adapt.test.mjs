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
