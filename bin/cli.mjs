#!/usr/bin/env node
import { existsSync } from "node:fs";
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const SKILL_NAME = "orchestrate-feature";
const PAYLOAD_ENTRIES = ["SKILL.md", "assets", "references", "scripts", "LICENSE"];

// Each tool reads skills from the same SKILL.md format, at a different
// project-relative / home-relative directory. "agents" is the shared,
// tool-agnostic convention (~/.agents/skills, .agents/skills) that Codex
// and other AGENTS.md-aware tools also pick up.
const TOOLS = {
  claude: { label: "Claude Code", dirName: ".claude" },
  cursor: { label: "Cursor", dirName: ".cursor" },
  codex: { label: "Codex", dirName: ".codex" },
  agents: { label: "Generic / AGENTS.md-based tools", dirName: ".agents" },
};
const TOOL_KEYS = Object.keys(TOOLS);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const args = { tools: [], scope: null, force: false, yes: false, help: false };
  for (const arg of argv) {
    if (arg === "--global" || arg === "-g") args.scope = "global";
    else if (arg === "--project" || arg === "-p") args.scope = "project";
    else if (arg === "--force" || arg === "-f") args.force = true;
    else if (arg === "--yes" || arg === "-y") args.yes = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--all") args.tools = [...TOOL_KEYS];
    else if (arg.startsWith("--")) {
      const key = arg.slice(2);
      if (TOOL_KEYS.includes(key)) args.tools.push(key);
      else {
        console.error(`Unknown argument: ${arg}`);
        process.exit(1);
      }
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(1);
    }
  }
  args.tools = [...new Set(args.tools)];
  return args;
}

function printHelp() {
  console.log(`
Usage: npx orchestrate-feature [options]

Installs the "orchestrate-feature" skill for one or more AI coding tools.
Same skill files, different destination per tool.

Tool selection (repeatable; default: prompt / all if --yes):
  --claude        Claude Code   -> <scope>/.claude/skills/${SKILL_NAME}
  --cursor        Cursor        -> <scope>/.cursor/skills/${SKILL_NAME}
  --codex         Codex         -> <scope>/.codex/skills/${SKILL_NAME}
  --agents        Generic / AGENTS.md-based tools -> <scope>/.agents/skills/${SKILL_NAME}
  --all           Install for every tool above

Scope:
  -p, --project   Install into ./<tool-dir>/skills (current project)
  -g, --global    Install into ~/<tool-dir>/skills (all projects for this user)

Other:
  -f, --force     Overwrite an existing install at the target location
  -y, --yes       Skip prompts; defaults to --all --project if not otherwise specified
  -h, --help      Show this help

Examples:
  npx orchestrate-feature --claude --cursor --project
  npx orchestrate-feature --all --global --yes
`);
}

async function promptTools() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log(`Which tool(s) should "${SKILL_NAME}" be installed for?`);
    TOOL_KEYS.forEach((key, i) => console.log(`  [${i + 1}] ${TOOLS[key].label}`));
    console.log(`  [${TOOL_KEYS.length + 1}] All of the above`);
    const answer = (await rl.question(`Choose one or more, comma-separated (default: all): `)).trim();
    if (!answer) return [...TOOL_KEYS];
    const picks = answer
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => parseInt(s, 10));
    if (picks.includes(TOOL_KEYS.length + 1)) return [...TOOL_KEYS];
    const chosen = picks
      .map((n) => TOOL_KEYS[n - 1])
      .filter(Boolean);
    return chosen.length > 0 ? [...new Set(chosen)] : [...TOOL_KEYS];
  } finally {
    rl.close();
  }
}

async function promptScope() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (
      await rl.question(
        `Where should it be installed?\n  [1] This project only\n  [2] All projects for this user (home directory)\nChoose 1 or 2 (default 1): `
      )
    ).trim();
    return answer === "2" ? "global" : "project";
  } finally {
    rl.close();
  }
}

async function confirmOverwrite(targetDir) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (
      await rl.question(`"${targetDir}" already exists. Overwrite? (y/N): `)
    ).trim().toLowerCase();
    return answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
}

async function installFor(toolKey, scope, args) {
  const tool = TOOLS[toolKey];
  const baseDir =
    scope === "global"
      ? path.join(homedir(), tool.dirName, "skills")
      : path.join(process.cwd(), tool.dirName, "skills");
  const targetDir = path.join(baseDir, SKILL_NAME);

  if (existsSync(targetDir)) {
    const proceed = args.force || (args.yes ? true : await confirmOverwrite(targetDir));
    if (!proceed) {
      console.log(`Skipped ${tool.label}: ${targetDir} already exists.`);
      return;
    }
    await rm(targetDir, { recursive: true, force: true });
  }

  await mkdir(targetDir, { recursive: true });

  for (const entry of PAYLOAD_ENTRIES) {
    const src = path.join(packageRoot, entry);
    if (!existsSync(src)) continue;
    const dest = path.join(targetDir, entry);
    await cp(src, dest, { recursive: true });
  }

  const installed = await readdir(targetDir);
  if (installed.length === 0) {
    console.error(`Install failed for ${tool.label}: no files were copied.`);
    return;
  }

  console.log(`Installed for ${tool.label}: ${targetDir}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  let tools = args.tools;
  let scope = args.scope;

  if (tools.length === 0 || !scope) {
    if (args.yes) {
      if (tools.length === 0) tools = [...TOOL_KEYS];
      if (!scope) scope = "project";
    } else if (!process.stdin.isTTY) {
      console.error(
        "No TTY available for prompting. Pass tool flags (--claude/--cursor/--codex/--agents/--all) and a scope (--project/--global) explicitly."
      );
      process.exit(1);
    } else {
      if (tools.length === 0) tools = await promptTools();
      if (!scope) scope = await promptScope();
    }
  }

  for (const toolKey of tools) {
    await installFor(toolKey, scope, args);
  }

  console.log(
    scope === "global"
      ? "Available in every project for this user, for the selected tool(s)."
      : "Available in this project, for the selected tool(s). Commit the skill directories if you want teammates to get it too."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
