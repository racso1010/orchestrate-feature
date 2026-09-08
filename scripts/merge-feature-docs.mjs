#!/usr/bin/env node

import { readdir, readFile, writeFile, rm, rmdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const HELP = `Usage: node merge-feature-docs.mjs <docs-directory> [options]

Merge per-subtask feature docs into one Markdown file and one standalone HTML
file, then optionally delete the per-subtask sources.

Sources are every *.md in <docs-directory>, sorted by filename, so name them
T01-*.md, T02-*.md to control section order.

Options:
  --title <text>        Document title. Default: derived from the directory name.
  --overview <file>     Markdown file prepended before the subtask sections.
  --requirements <file> Plan file linked from the header for traceability.
  --out-md <file>       Markdown output. Default: <docs-directory>.md
  --out-html <file>     HTML output. Default: <docs-directory>.html
  --prune               Delete the source docs and the directory after writing.
  --dry-run             Print what would happen. Writes and deletes nothing.
  -h, --help            Show this help.

Exit codes: 0 success, 1 runtime error, 2 usage error.
Data goes to stdout; diagnostics go to stderr.

Examples:
  node merge-feature-docs.mjs docs/features/billing-export --title "Billing export"
  node merge-feature-docs.mjs docs/features/billing-export --prune --dry-run
`;

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'section';
}

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function titleFromDirectory(directory) {
  const base = path.basename(path.resolve(directory)).replace(/[-_]+/g, ' ').trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : 'Feature';
}

function stripComments(markdown) {
  return markdown.replace(/<!--[\s\S]*?-->/g, '');
}

function splitFences(markdown) {
  // Returns alternating [text, fence, text, fence, ...] so heading rewrites
  // never touch code-block contents.
  const parts = [];
  const lines = markdown.split('\n');
  let buffer = [];
  let fence = null;

  for (const line of lines) {
    const match = line.match(/^(\s*)(`{3,}|~{3,})(.*)$/);
    if (fence === null && match) {
      parts.push({ type: 'text', value: buffer.join('\n') });
      buffer = [line];
      fence = match[2][0].repeat(3);
    } else if (fence !== null && match && match[2].startsWith(fence) && match[3].trim() === '') {
      buffer.push(line);
      parts.push({ type: 'fence', value: buffer.join('\n') });
      buffer = [];
      fence = null;
    } else {
      buffer.push(line);
    }
  }
  parts.push({ type: fence === null ? 'text' : 'fence', value: buffer.join('\n') });
  return parts;
}

export function demoteHeadings(markdown, levels = 1) {
  return splitFences(markdown)
    .map((part) => {
      if (part.type === 'fence') return part.value;
      return part.value.replace(/^(#{1,6})(\s+)/gm, (whole, hashes, space) => {
        const next = Math.min(6, hashes.length + levels);
        return `${'#'.repeat(next)}${space}`;
      });
    })
    .join('\n');
}

function firstHeading(markdown) {
  const match = stripComments(markdown).match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function dropFirstHeading(markdown) {
  return markdown.replace(/^#\s+.+\n?/m, '');
}

export function mergeMarkdown({ title, overview, requirements, sections, generatedAt }) {
  const lines = [`# ${title}`, ''];
  const meta = [];
  if (requirements) meta.push(`- **Requirements and plan:** \`${requirements}\``);
  meta.push(`- **Subtasks merged:** ${sections.length}`);
  if (generatedAt) meta.push(`- **Merged:** ${generatedAt}`);
  lines.push(...meta, '');

  lines.push('## Contents', '');
  for (const section of sections) {
    lines.push(`- [${section.title}](#${slugify(section.title)})`);
  }
  lines.push('');

  if (overview) {
    lines.push(demoteHeadings(dropFirstHeading(stripComments(overview)).trim(), 0).trim(), '');
  }

  for (const section of sections) {
    lines.push('---', '');
    lines.push(`## ${section.title}`, '');
    const body = demoteHeadings(dropFirstHeading(stripComments(section.markdown)).trim(), 1).trim();
    lines.push(body, '');
  }

  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

function renderInline(text) {
  const codes = [];
  let out = text.replace(/`([^`]+)`/g, (whole, code) => {
    codes.push(code);
    return `\u0000${codes.length - 1}\u0000`;
  });

  out = escapeHtml(out);
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (whole, label, href) => {
    const safe = /^(https?:|mailto:|#|\.|\/)/.test(href) ? href : '#';
    return `<a href="${escapeHtml(safe)}">${label}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*\w])\*([^*\n]+)\*(?=[^*\w]|$)/g, '$1<em>$2</em>');
  out = out.replace(/\u0000(\d+)\u0000/g, (whole, index) => `<code>${escapeHtml(codes[Number(index)])}</code>`);
  return out;
}

function renderTable(rows) {
  const cells = (row) => row.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
  const header = cells(rows[0]);
  const body = rows.slice(2).map(cells);
  const head = `<thead><tr>${header.map((cell) => `<th>${renderInline(cell)}</th>`).join('')}</tr></thead>`;
  const rest = body
    .map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join('')}</tr>`)
    .join('');
  return `<table>${head}<tbody>${rest}</tbody></table>`;
}

export function markdownToHtml(markdown, seen = new Map()) {
  const lines = stripComments(markdown).split('\n');
  const out = [];
  let index = 0;

  const uniqueId = (text) => {
    const base = slugify(text);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  };

  const isTableRow = (line) => /^\s*\|.*\|\s*$/.test(line);

  while (index < lines.length) {
    const line = lines[index];

    if (line.trim() === '') {
      index += 1;
      continue;
    }

    const fence = line.match(/^\s*(`{3,}|~{3,})(.*)$/);
    if (fence) {
      const marker = fence[1][0].repeat(3);
      const buffer = [];
      index += 1;
      while (index < lines.length) {
        const candidate = lines[index].match(/^\s*(`{3,}|~{3,})\s*$/);
        if (candidate && candidate[1].startsWith(marker)) {
          index += 1;
          break;
        }
        buffer.push(lines[index]);
        index += 1;
      }
      out.push(`<pre><code>${escapeHtml(buffer.join('\n'))}</code></pre>`);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();
      out.push(`<h${level} id="${uniqueId(text)}">${renderInline(text)}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      out.push('<hr>');
      index += 1;
      continue;
    }

    if (isTableRow(line) && index + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[index + 1])) {
      const rows = [];
      while (index < lines.length && isTableRow(lines[index])) {
        rows.push(lines[index].trim());
        index += 1;
      }
      out.push(renderTable(rows));
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const buffer = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        buffer.push(lines[index].replace(/^\s*>\s?/, ''));
        index += 1;
      }
      out.push(`<blockquote>${markdownToHtml(buffer.join('\n'), seen)}</blockquote>`);
      continue;
    }

    const bullet = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (bullet) {
      const ordered = /\d/.test(bullet[2]);
      const items = [];
      while (index < lines.length) {
        const current = lines[index].match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
        if (!current) break;
        let content = current[3];
        const checkbox = content.match(/^\[( |x|X)\]\s+(.*)$/);
        if (checkbox) {
          const checked = checkbox[1].toLowerCase() === 'x' ? ' checked' : '';
          content = `<input type="checkbox" disabled${checked}> ${renderInline(checkbox[2])}`;
          items.push(`<li class="task">${content.replace(/^(<input[^>]*>) /, '$1 ')}</li>`);
        } else {
          items.push(`<li>${renderInline(content)}</li>`);
        }
        index += 1;
      }
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`);
      continue;
    }

    const paragraph = [];
    while (index < lines.length && lines[index].trim() !== '' && !/^(#{1,6}\s|\s*[-*+]\s|\s*\d+\.\s|\s*>|\s*\|)/.test(lines[index]) && !/^\s*(`{3,}|~{3,})/.test(lines[index])) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    if (paragraph.length > 0) {
      out.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
    } else {
      index += 1;
    }
  }

  return out.join('\n');
}

export function renderHtml({ title, markdown }) {
  const body = markdownToHtml(markdown);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #ffffff; --fg: #1b1b1f; --muted: #5c5f66; --line: #e3e3e8;
    --code-bg: #f5f5f7; --accent: #2f5bd8; --th: #f0f0f4;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #16161a; --fg: #e8e8ec; --muted: #9a9aa4; --line: #2c2c33;
            --code-bg: #1f1f25; --accent: #8ea9ff; --th: #22222a; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg);
         font: 16px/1.65 ui-sans-serif, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  main { max-width: 62rem; margin: 0 auto; padding: 3rem 1.25rem 6rem; }
  h1 { font-size: 2rem; line-height: 1.2; margin: 0 0 1.5rem; letter-spacing: -0.02em; }
  h2 { font-size: 1.45rem; margin: 3rem 0 1rem; padding-top: 0.5rem; letter-spacing: -0.01em; }
  h3 { font-size: 1.15rem; margin: 2rem 0 0.65rem; }
  h4, h5, h6 { font-size: 1rem; margin: 1.5rem 0 0.5rem; color: var(--muted); text-transform: uppercase;
               letter-spacing: 0.06em; }
  p, li { overflow-wrap: anywhere; }
  a { color: var(--accent); }
  hr { border: 0; border-top: 1px solid var(--line); margin: 3rem 0; }
  code { background: var(--code-bg); padding: 0.12em 0.35em; border-radius: 4px;
         font: 0.875em ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  pre { background: var(--code-bg); border: 1px solid var(--line); border-radius: 8px;
        padding: 1rem; overflow-x: auto; }
  pre code { background: none; padding: 0; font-size: 0.85rem; line-height: 1.55; }
  table { border-collapse: collapse; width: 100%; margin: 1.25rem 0; font-size: 0.925rem; display: block;
          overflow-x: auto; }
  th, td { border: 1px solid var(--line); padding: 0.5rem 0.7rem; text-align: left; vertical-align: top; }
  th { background: var(--th); font-weight: 600; }
  blockquote { margin: 1.25rem 0; padding: 0.25rem 0 0.25rem 1rem; border-left: 3px solid var(--line);
               color: var(--muted); }
  ul, ol { padding-left: 1.35rem; }
  li { margin: 0.3rem 0; }
  li.task { list-style: none; margin-left: -1.35rem; }
  #contents + ul { columns: 2; column-gap: 2rem; }
  @media (max-width: 40rem) { #contents + ul { columns: 1; } }
</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>
`;
}

function parseArguments(argv) {
  const options = { prune: false, dryRun: false };
  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const take = () => {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new Error(`option ${argument} requires a value`);
      }
      index += 1;
      return value;
    };

    switch (argument) {
      case '-h':
      case '--help':
        options.help = true;
        break;
      case '--title':
        options.title = take();
        break;
      case '--overview':
        options.overview = take();
        break;
      case '--requirements':
        options.requirements = take();
        break;
      case '--out-md':
        options.outMd = take();
        break;
      case '--out-html':
        options.outHtml = take();
        break;
      case '--prune':
        options.prune = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      default:
        if (argument.startsWith('-')) throw new Error(`unknown option ${argument}`);
        positional.push(argument);
    }
  }

  options.directory = positional[0];
  if (positional.length > 1) throw new Error('provide exactly one docs directory');
  return options;
}

async function main() {
  let options;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${HELP}\nError: ${error.message}\n`);
    return 2;
  }

  if (options.help) {
    process.stdout.write(HELP);
    return 0;
  }
  if (!options.directory) {
    process.stderr.write(`${HELP}\nError: provide a docs directory.\n`);
    return 2;
  }

  const directory = path.resolve(options.directory);
  let directoryStat;
  try {
    directoryStat = await stat(directory);
  } catch (error) {
    process.stderr.write(`Error: cannot read ${options.directory}: ${error.code ?? error.message}\n`);
    return 1;
  }
  if (!directoryStat.isDirectory()) {
    process.stderr.write(`Error: ${options.directory} is not a directory.\n`);
    return 2;
  }

  const entries = (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name)
    .sort();

  if (entries.length === 0) {
    process.stderr.write(`Error: no .md files in ${options.directory}.\n`);
    return 1;
  }

  const sections = [];
  for (const name of entries) {
    const markdown = await readFile(path.join(directory, name), 'utf8');
    sections.push({
      file: name,
      title: firstHeading(markdown) ?? name.replace(/\.md$/, ''),
      markdown,
    });
  }

  const title = options.title ?? titleFromDirectory(directory);
  const overview = options.overview ? await readFile(path.resolve(options.overview), 'utf8') : null;
  const merged = mergeMarkdown({
    title,
    overview,
    requirements: options.requirements,
    sections,
    generatedAt: new Date().toISOString().slice(0, 10),
  });
  const html = renderHtml({ title, markdown: merged });

  const outMd = path.resolve(options.outMd ?? `${directory}.md`);
  const outHtml = path.resolve(options.outHtml ?? `${directory}.html`);

  if (options.dryRun) {
    process.stdout.write(`${outMd}\n${outHtml}\n`);
    process.stderr.write(`dry-run: would merge ${sections.length} section(s)\n`);
    for (const section of sections) process.stderr.write(`  section: ${section.file} -> ${section.title}\n`);
    if (options.prune) {
      for (const section of sections) process.stderr.write(`  would delete: ${path.join(directory, section.file)}\n`);
      process.stderr.write(`  would delete: ${directory}\n`);
    }
    return 0;
  }

  await writeFile(outMd, merged, 'utf8');
  await writeFile(outHtml, html, 'utf8');

  if (options.prune) {
    for (const section of sections) {
      await rm(path.join(directory, section.file));
    }
    const remaining = await readdir(directory);
    if (remaining.length === 0) {
      await rmdir(directory);
    } else {
      process.stderr.write(`retained ${directory}: ${remaining.length} non-doc file(s) remain\n`);
    }
  }

  process.stdout.write(`${outMd}\n${outHtml}\n`);
  process.stderr.write(`merged ${sections.length} section(s)${options.prune ? ', pruned sources' : ''}\n`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      process.stderr.write(`Error: ${error.message}\n`);
      process.exitCode = 1;
    });
}
