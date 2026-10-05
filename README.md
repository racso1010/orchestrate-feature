# orchestrate-feature

A skill that runs one end-to-end feature delivery workflow — clarification, model routing, phased planning, isolated implementer lanes, QA/security review, acceptance, and a merged doc handoff — from raw requirements to a documented, reviewed result.

See [`SKILL.md`](./SKILL.md) for what the skill actually does, and [`docs/WORKFLOW.md`](./docs/WORKFLOW.md) for a stage-by-stage guide, what you need to provide, and token-cost notes. This README covers installation only.

## Supported tools

The `SKILL.md` format (YAML frontmatter + Markdown body) is shared across several AI coding tools. Same files, different install directory per tool:

| Tool | Project install | Global install |
| --- | --- | --- |
| [Claude Code](https://claude.com/claude-code) | `.claude/skills/orchestrate-feature/` | `~/.claude/skills/orchestrate-feature/` |
| [Cursor](https://cursor.com) | `.cursor/skills/orchestrate-feature/` | `~/.cursor/skills/orchestrate-feature/` |
| [Codex CLI](https://developers.openai.com/codex) | `.codex/skills/orchestrate-feature/` | `~/.codex/skills/orchestrate-feature/` |
| Generic / AGENTS.md-based tools | `.agents/skills/orchestrate-feature/` | `~/.agents/skills/orchestrate-feature/` |

You don't need all four — the installer only writes the directories for the tool(s) you pick, and you can run it again later to add another.

## Install

### Option 1: npx (recommended)

From the root of this package:

```bash
npx . --claude --cursor --project
```

or, once published to npm:

```bash
npx orchestrate-feature
```

Run with no flags for an interactive prompt asking which tool(s) and where:

```
Which tool(s) should "orchestrate-feature" be installed for?
  [1] Claude Code
  [2] Cursor
  [3] Codex
  [4] Generic / AGENTS.md-based tools
  [5] All of the above
Choose one or more, comma-separated (default: all):

Where should it be installed?
  [1] This project only
  [2] All projects for this user (home directory)
Choose 1 or 2 (default 1):
```

Flags, for non-interactive use:

| Flag | Effect |
| --- | --- |
| `--claude` | Install for Claude Code |
| `--cursor` | Install for Cursor |
| `--codex` | Install for Codex CLI |
| `--agents` | Install for generic AGENTS.md-based tools |
| `--all` | Install for every tool above |
| `-p`, `--project` | Install into `./<tool-dir>/skills/` (current project only) |
| `-g`, `--global` | Install into `~/<tool-dir>/skills/` (all projects for this user) |
| `-f`, `--force` | Overwrite an existing install at the target location without asking |
| `-y`, `--yes` | Skip prompts; defaults to `--all --project` if no other flags given |
| `-h`, `--help` | Show usage |

Tool flags are repeatable, so pick exactly the tools you use:

```bash
npx orchestrate-feature --cursor --codex --global
```

Project installs are local files — commit the skill directories (`.claude/skills/`, `.cursor/skills/`, etc.) if you want teammates on the same repo to get the skill too.

### Option 2: manual copy

Copy `SKILL.md`, `assets/`, `references/`, and `scripts/` into the skills directory for your tool, per the table above:

```bash
# example: Cursor, project-level
mkdir -p .cursor/skills/orchestrate-feature
cp -R SKILL.md assets references scripts .cursor/skills/orchestrate-feature/
```

Swap `.cursor` for `.claude`, `.codex`, or `.agents` as needed.

## Verify

- **Claude Code**: `/orchestrate-feature` should be recognized in the target project, or hand it requirements directly — it self-invokes when the request matches.
- **Cursor**: the skill should appear in Cursor's skill list for the project/account, and Cursor Agent will pick it up automatically when a request matches its description.
- **Codex**: the skill should be listed by Codex's skill discovery and can be invoked with a `$` mention (e.g. `$orchestrate-feature`) or automatically when the request matches.

## Requirements

- One of the tools above, since skill auto-discovery is tool-native — this package only places files, it doesn't add the capability to a tool that lacks it.
- Node.js for the merge script and lane runner (`scripts/merge-feature-docs.mjs`, `scripts/run-lane.mjs`). No specific minimum version is enforced; both use only long-stable APIs.

## Cross-model routing

Separately from *which tool runs the skill*, the skill itself can *call out to* other coding-agent CLIs — `codex`, `cursor-agent`, or similar — as worker subagents for individual lanes (e.g. a read-only reviewer pass on one model, a writing pass on another). Whichever tool is orchestrating (per the table above) stays in charge of the run; other CLIs are only invoked as external processes via `scripts/run-lane.mjs`, and only if you opt into cross-model routing at the skill's routing gate. To use it, install and authenticate the relevant CLI (`codex`, `cursor-agent`, etc.) yourself — see [`references/model-routing.md`](./references/model-routing.md) for the exact commands each one is invoked with.

## Uninstall

```bash
rm -rf .claude/skills/orchestrate-feature   ~/.claude/skills/orchestrate-feature
rm -rf .cursor/skills/orchestrate-feature   ~/.cursor/skills/orchestrate-feature
rm -rf .codex/skills/orchestrate-feature    ~/.codex/skills/orchestrate-feature
rm -rf .agents/skills/orchestrate-feature   ~/.agents/skills/orchestrate-feature
```

(Only remove the ones you actually installed.)

## License

MIT — see [`LICENSE`](./LICENSE).
