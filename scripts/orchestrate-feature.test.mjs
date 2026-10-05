import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { mergeMarkdown, markdownToHtml, demoteHeadings, slugify, escapeHtml } from './merge-feature-docs.mjs';
import { buildCommand, summarizeUsage } from './run-lane.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const mergeScript = path.join(here, 'merge-feature-docs.mjs');
const laneScript = path.join(here, 'run-lane.mjs');

function node(script, argv, options = {}) {
  return spawnSync(process.execPath, [script, ...argv], { encoding: 'utf8', ...options });
}

test('both scripts support --help and exit 0', () => {
  for (const script of [mergeScript, laneScript]) {
    const result = node(script, ['--help']);
    assert.equal(result.status, 0, `${script} --help should exit 0`);
    assert.match(result.stdout, /Usage:/);
  }
});

test('slugify and escapeHtml behave', () => {
  assert.equal(slugify('T01 — Import contacts'), 't01-import-contacts');
  assert.equal(escapeHtml('<a href="x">&</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
});

test('demoteHeadings shifts headings but never inside code fences', () => {
  const input = ['# Title', '', '```md', '# not a heading', '```', '', '## Sub'].join('\n');
  const output = demoteHeadings(input, 1);
  assert.match(output, /^## Title$/m);
  assert.match(output, /^# not a heading$/m);
  assert.match(output, /^### Sub$/m);
});

test('mergeMarkdown builds a contents list and nests each section', () => {
  const merged = mergeMarkdown({
    title: 'Billing export',
    overview: '# Overview\n\nSummary text.\n',
    requirements: '.plans/billing-export.md',
    sections: [
      { file: 'T01-a.md', title: 'T01 — Schema', markdown: '# T01 — Schema\n\n## What this does\n\nAdds a table.\n' },
      { file: 'T02-b.md', title: 'T02 — Endpoint', markdown: '# T02 — Endpoint\n\n## Tests\n\nCovered.\n' },
    ],
    generatedAt: '2026-08-30',
  });

  assert.match(merged, /^# Billing export$/m);
  assert.match(merged, /\*\*Subtasks merged:\*\* 2/);
  assert.match(merged, /- \[T01 — Schema\]\(#t01-schema\)/);
  assert.match(merged, /^## T01 — Schema$/m);
  assert.match(merged, /^### What this does$/m);
  assert.match(merged, /Summary text\./);
  assert.equal(/^# T01 — Schema$/m.test(merged), false, 'source h1 should not survive');
});

test('markdownToHtml renders headings, tables, code, lists and escapes injection', () => {
  const html = markdownToHtml(
    [
      '# Title',
      '',
      '| A | B |',
      '|---|---|',
      '| `x` | **y** |',
      '',
      '- one',
      '- [x] done',
      '',
      '```js',
      'const a = "<script>";',
      '```',
      '',
      'A [link](https://example.com) and <img src=x onerror=alert(1)>.',
    ].join('\n'),
  );

  assert.match(html, /<h1 id="title">Title<\/h1>/);
  assert.match(html, /<th>A<\/th>/);
  assert.match(html, /<td><code>x<\/code><\/td>/);
  assert.match(html, /<strong>y<\/strong>/);
  assert.match(html, /<input type="checkbox" disabled checked>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /<a href="https:\/\/example.com">link<\/a>/);
  assert.equal(html.includes('<img src=x'), false, 'raw HTML must be escaped');
});

test('markdownToHtml rejects javascript: hrefs', () => {
  const html = markdownToHtml('[click](javascript:alert(1))');
  assert.match(html, /<a href="#">click<\/a>/);
});

test('markdownToHtml escapes HTML in checkbox text', () => {
  const payload = `<img src="data:," onerror="alert('Demo XSS')">`;
  for (const marker of ['[ ]', '[x]', '[X]']) {
    const html = markdownToHtml(`- ${marker} ${payload}`);
    assert.match(html, /&lt;img/, `${marker} should escape the img tag`);
    assert.equal(html.includes('<img '), false, `${marker} must not contain a live <img> tag`);
    assert.match(html, /<input type="checkbox" disabled(?: checked)?>/, `${marker} should keep the disabled checkbox`);
  }

  const rich = markdownToHtml('- [x] **bold** and a [link](https://example.com)');
  assert.match(rich, /<strong>bold<\/strong>/);
  assert.match(rich, /<a href="https:\/\/example.com">link<\/a>/);
});

test('merge writes markdown plus html, and --prune only deletes after a dry run shows it', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'orchestrate-'));
  const docs = path.join(root, 'billing-export');
  await mkdir(docs);
  await writeFile(path.join(docs, 'T01-schema.md'), '# T01 — Schema\n\n## What this does\n\nAdds a table.\n');
  await writeFile(path.join(docs, 'T02-endpoint.md'), '# T02 — Endpoint\n\n## Tests\n\nCovered.\n');

  const dry = node(mergeScript, [docs, '--title', 'Billing export', '--prune', '--dry-run']);
  assert.equal(dry.status, 0);
  assert.match(dry.stderr, /would delete/);
  assert.equal((await readdir(docs)).length, 2, 'dry run must not delete');

  const real = node(mergeScript, [docs, '--title', 'Billing export', '--prune']);
  assert.equal(real.status, 0);

  const merged = await readFile(`${docs}.md`, 'utf8');
  const html = await readFile(`${docs}.html`, 'utf8');
  assert.match(merged, /## T01 — Schema/);
  assert.match(html, /<!doctype html>/);
  assert.equal(html.includes('http://'), false, 'html must be self-contained');

  await assert.rejects(readdir(docs));
});

test('merge fails cleanly on a missing directory and on an empty one', async () => {
  const missing = node(mergeScript, [path.join(tmpdir(), 'orchestrate-nope-12345')]);
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /cannot read/);

  const root = await mkdtemp(path.join(tmpdir(), 'orchestrate-empty-'));
  const empty = node(mergeScript, [root]);
  assert.equal(empty.status, 1);
  assert.match(empty.stderr, /no \.md files/);
});

test('buildCommand keeps reviewer lanes read-only per engine', () => {
  const claude = buildCommand({ engine: 'claude', prompt: 'do', model: 'opus', mode: 'read' });
  assert.deepEqual(claude.argv, ['-p', 'do', '--output-format', 'json', '--strict-mcp-config', '--disable-slash-commands', '--model', 'opus', '--permission-mode', 'plan']);

  const codex = buildCommand({ engine: 'codex', prompt: 'do', model: 'gpt', mode: 'read' });
  assert.ok(codex.argv.includes('read-only'));

  const cursor = buildCommand({ engine: 'cursor', prompt: 'do', mode: 'read' });
  assert.equal(cursor.argv.includes('--force'), false, 'a reader must never get --force');
});

test('buildCommand enables writes only in write mode', () => {
  assert.ok(buildCommand({ engine: 'claude', prompt: 'do', mode: 'write' }).argv.includes('acceptEdits'));
  assert.ok(buildCommand({ engine: 'codex', prompt: 'do', mode: 'write' }).argv.includes('workspace-write'));
  assert.ok(buildCommand({ engine: 'cursor', prompt: 'do', mode: 'write' }).argv.includes('--force'));
});

test('claude lanes skip MCP servers and skills, and only resumable engines resume', () => {
  const claude = buildCommand({ engine: 'claude', prompt: 'do', mode: 'write', resume: 'abc' }).argv;
  for (const flag of ['--strict-mcp-config', '--disable-slash-commands']) assert.ok(claude.includes(flag), flag);
  assert.equal(claude[claude.indexOf('--resume') + 1], 'abc');
  const cursor = buildCommand({ engine: 'cursor', prompt: 'do', resume: 'chat1' }).argv;
  assert.equal(cursor[cursor.indexOf('--resume') + 1], 'chat1');
  assert.equal(buildCommand({ engine: 'claude', prompt: 'do' }).argv.includes('--resume'), false);
  assert.throws(() => buildCommand({ engine: 'codex', prompt: 'do', resume: 'x' }), /cannot be resumed/);
});

test('summarizeUsage reads claude JSON and ignores anything else', () => {
  const transcript = JSON.stringify({
    session_id: 's1',
    num_turns: 3,
    total_cost_usd: 0.12345,
    usage: { input_tokens: 2, cache_creation_input_tokens: 100, cache_read_input_tokens: 900, output_tokens: 40 },
  });
  assert.equal(summarizeUsage(transcript), 'in=1002 out=40 cost=$0.1235 turns=3 session=s1');
  assert.equal(summarizeUsage('plain text transcript'), null);
  assert.equal(summarizeUsage('{"result":"no usage"}'), null);
});

test('buildCommand rejects bad input', () => {
  assert.throws(() => buildCommand({ engine: 'gemini', prompt: 'x' }), /unknown engine/);
  assert.throws(() => buildCommand({ engine: 'claude', prompt: 'x', mode: 'yolo' }), /mode must be/);
  assert.throws(() => buildCommand({ engine: 'claude', prompt: '  ' }), /assignment is empty/);
});

test('run-lane --print-command redacts the assignment and never runs the engine', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'orchestrate-lane-'));
  const assignment = path.join(root, 'T01.md');
  await writeFile(assignment, `Role: implementer\n${'context '.repeat(40)}`);

  const result = node(laneScript, ['--engine', 'codex', '--model', 'x', '--mode', 'write', '--assignment', assignment, '--print-command']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /<assignment:\d+ chars>/);
  assert.match(result.stdout, /workspace-write/);
});

test('run-lane --check reports availability without failing', () => {
  const result = node(laneScript, ['--check']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /claude\t/);
  assert.match(result.stdout, /available|missing/);
});

test('run-lane rejects missing required options and a bad timeout', async () => {
  const usage = node(laneScript, ['--engine', 'claude']);
  assert.equal(usage.status, 2);

  const root = await mkdtemp(path.join(tmpdir(), 'orchestrate-timeout-'));
  const assignment = path.join(root, 'T01.md');
  await writeFile(assignment, 'Role: implementer');
  const bad = node(laneScript, ['--engine', 'claude', '--assignment', assignment, '--timeout', '0']);
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /positive number/);
});
