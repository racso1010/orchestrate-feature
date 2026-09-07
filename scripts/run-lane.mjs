#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { readFile, writeFile, access, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const HELP = `Usage: node run-lane.mjs --engine <claude|codex|cursor> --assignment <file> [options]

Launch one bounded subagent lane on a non-interactive agent CLI. Reads the
assignment from a file, runs the engine in the authorized directory with a
timeout, and captures the transcript.

Required:
  --engine <name>       claude | codex | cursor
  --assignment <file>   Markdown assignment brief passed as the prompt.

Options:
  --model <id>          Model id for the engine. Omit to use the engine default.
  --mode <read|write>   read = reviewer (no edits). write = implementer. Default: read.
  --cwd <dir>           Authorized working directory. Default: current directory.
  --out <file>          Write the transcript here as well as to stdout.
  --timeout <seconds>   Kill the lane after this long. Default: 1800.
  --bin <path>          Override the executable name.
  --engine-arg <arg>    Extra argument passed through. Repeatable.
  --print-command       Print the resolved argv and exit without running.
  --check               Report which engines are on PATH, then exit.
  --dry-run             Alias for --print-command.
  -h, --help            Show this help.

Flags move between CLI releases. Run '<bin> --help' and confirm the resolved
command with --print-command before trusting an unattended run.

Never pass secrets in the assignment. Never add a permission-bypass argument
without explicit, recorded user approval.

Exit codes: 0 success, 1 lane failure or timeout, 2 usage error, 127 engine missing.
Transcript goes to stdout; diagnostics go to stderr.
`;

const ENGINES = {
  claude: {
    bin: 'claude',
    build: ({ prompt, model, mode }) => {
      const argv = ['-p', prompt, '--output-format', 'json'];
      if (model) argv.push('--model', model);
      argv.push('--permission-mode', mode === 'write' ? 'acceptEdits' : 'plan');
      return argv;
    },
  },
  codex: {
    bin: 'codex',
    build: ({ prompt, model, mode }) => {
      const argv = ['exec', prompt, '--skip-git-repo-check'];
      if (model) argv.push('--model', model);
      argv.push('--sandbox', mode === 'write' ? 'workspace-write' : 'read-only');
      return argv;
    },
  },
  cursor: {
    bin: 'cursor-agent',
    build: ({ prompt, model, mode }) => {
      const argv = ['-p', prompt, '--output-format', 'text'];
      if (model) argv.push('--model', model);
      if (mode === 'write') argv.push('--force');
      return argv;
    },
  },
};

export function buildCommand({ engine, prompt, model, mode = 'read', bin, extra = [] }) {
  const definition = ENGINES[engine];
  if (!definition) throw new Error(`unknown engine ${JSON.stringify(engine)}`);
  if (mode !== 'read' && mode !== 'write') throw new Error(`mode must be read or write, got ${JSON.stringify(mode)}`);
  if (!prompt || prompt.trim() === '') throw new Error('assignment is empty');
  return {
    bin: bin ?? definition.bin,
    argv: [...definition.build({ prompt, model, mode }), ...extra],
  };
}

function redact(argv) {
  return argv.map((argument) => (argument.length > 120 ? `<assignment:${argument.length} chars>` : argument));
}

function parseArguments(argv) {
  const options = { mode: 'read', timeout: 1800, extra: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const take = () => {
      const value = argv[index + 1];
      if (value === undefined) throw new Error(`option ${argument} requires a value`);
      index += 1;
      return value;
    };

    switch (argument) {
      case '-h':
      case '--help':
        options.help = true;
        break;
      case '--check':
        options.check = true;
        break;
      case '--engine':
        options.engine = take();
        break;
      case '--model':
        options.model = take();
        break;
      case '--mode':
        options.mode = take();
        break;
      case '--cwd':
        options.cwd = take();
        break;
      case '--assignment':
        options.assignment = take();
        break;
      case '--out':
        options.out = take();
        break;
      case '--bin':
        options.bin = take();
        break;
      case '--engine-arg':
        options.extra.push(take());
        break;
      case '--timeout':
        options.timeout = Number(take());
        break;
      case '--print-command':
      case '--dry-run':
        options.printCommand = true;
        break;
      default:
        throw new Error(`unknown option ${argument}`);
    }
  }

  return options;
}

function onPath(bin) {
  return new Promise((resolve) => {
    const probe = spawn(process.platform === 'win32' ? 'where' : 'which', [bin], { stdio: 'ignore' });
    probe.on('error', () => resolve(false));
    probe.on('close', (code) => resolve(code === 0));
  });
}

function run({ bin, argv, cwd, timeoutMs }) {
  return new Promise((resolve) => {
    const child = spawn(bin, argv, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    const stdout = [];
    const stderr = [];
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 10_000).unref();
    }, timeoutMs);

    child.stdout.on('data', (chunk) => stdout.push(chunk));
    child.stderr.on('data', (chunk) => stderr.push(chunk));
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ code: error.code === 'ENOENT' ? 127 : 1, stdout: '', stderr: error.message, timedOut });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        code: timedOut ? 1 : code ?? 1,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
        timedOut,
      });
    });
  });
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

  if (options.check) {
    for (const [name, definition] of Object.entries(ENGINES)) {
      const bin = options.bin ?? definition.bin;
      process.stdout.write(`${name}\t${bin}\t${(await onPath(bin)) ? 'available' : 'missing'}\n`);
    }
    return 0;
  }

  if (!options.engine || !options.assignment) {
    process.stderr.write(`${HELP}\nError: --engine and --assignment are required.\n`);
    return 2;
  }
  if (!Number.isFinite(options.timeout) || options.timeout <= 0) {
    process.stderr.write('Error: --timeout must be a positive number of seconds.\n');
    return 2;
  }

  const cwd = path.resolve(options.cwd ?? process.cwd());
  try {
    const cwdStat = await stat(cwd);
    if (!cwdStat.isDirectory()) throw new Error('not a directory');
  } catch (error) {
    process.stderr.write(`Error: --cwd ${cwd} is unusable: ${error.message}\n`);
    return 2;
  }

  let prompt;
  try {
    const assignmentPath = path.resolve(options.assignment);
    await access(assignmentPath);
    prompt = await readFile(assignmentPath, 'utf8');
  } catch (error) {
    process.stderr.write(`Error: cannot read assignment: ${error.message}\n`);
    return 2;
  }

  let command;
  try {
    command = buildCommand({
      engine: options.engine,
      prompt,
      model: options.model,
      mode: options.mode,
      bin: options.bin,
      extra: options.extra,
    });
  } catch (error) {
    process.stderr.write(`Error: ${error.message}\n`);
    return 2;
  }

  if (options.printCommand) {
    process.stdout.write(`${command.bin} ${redact(command.argv).join(' ')}\n`);
    return 0;
  }

  if (!(await onPath(command.bin))) {
    process.stderr.write(`Error: ${command.bin} is not on PATH. Reroute this lane or install the CLI.\n`);
    return 127;
  }

  process.stderr.write(`lane: ${options.engine} ${options.model ?? '(default model)'} mode=${options.mode} cwd=${cwd} timeout=${options.timeout}s\n`);
  const started = Date.now();
  const result = await run({ bin: command.bin, argv: command.argv, cwd, timeoutMs: options.timeout * 1000 });
  const seconds = Math.round((Date.now() - started) / 1000);

  const transcript = result.stdout || result.stderr;
  process.stdout.write(transcript.endsWith('\n') ? transcript : `${transcript}\n`);

  if (options.out) {
    const header = [
      `<!-- lane: ${options.engine} model=${options.model ?? 'default'} mode=${options.mode} `,
      `cwd=${cwd} exit=${result.code}${result.timedOut ? ' TIMED-OUT' : ''} duration=${seconds}s -->`,
      '',
    ].join('');
    await writeFile(path.resolve(options.out), `${header}\n${transcript}\n`, 'utf8');
    process.stderr.write(`transcript: ${path.resolve(options.out)}\n`);
  }

  if (result.timedOut) {
    process.stderr.write(`Error: lane timed out after ${options.timeout}s. Inspect ${cwd} before relaunching.\n`);
    return 1;
  }
  if (result.code !== 0) {
    process.stderr.write(`Error: lane exited ${result.code} after ${seconds}s.\n${result.stderr.slice(0, 2000)}\n`);
    return result.code === 127 ? 127 : 1;
  }

  process.stderr.write(`lane completed in ${seconds}s. Parent must review the diff and rerun checks.\n`);
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
