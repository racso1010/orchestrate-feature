# Model routing

Contents: [The gate](#the-gate) · [Defaults](#defaults) · [Recording](#recording) · [Launchers](#launchers) · [Safety](#safety) · [Failure handling](#failure-handling)

Planning runs on the parent's current model. Every other role is a separate session whose engine and model is decided here, never inherited. **Never launch a child before this gate is answered.**

The doc merge is a script the parent runs, so it is not a routed role.

## The gate

If `.plans/routing.md` exists, show it and ask one question: **"Reuse saved routing? (yes / change …)"**. Otherwise send one message with the defaults below so the user can reply "defaults":

1. **Planning** stays on the current session? (or move it to a subagent)
2. **Implementer** engine, and the model for each tier (`top`, `mid`).
3. **QA reviewer** engine and model. Never the implementer's session.
4. **Security auditor** for `full`-level lanes (auth, payments, migrations, user input, first of a pattern). `combined` lanes fold it into QA.
5. **Acceptance reviewer** (Quick, Heavy): fresh session that implemented nothing. Prefer a different vendor from the implementer.
6. Per-subtask overrides and per-lane caps, if any.

Ask for a real choice on every role. "You decide" → state the routing you chose and why, and record it as a parent decision. After the answer, offer to save it to `.plans/routing.md` for the next run.

## Defaults

| Role | Default | Why |
|---|---|---|
| Planning | current model | already holds the requirements and repo context |
| Implementer | per subtask **tier**, set in the plan: `top` (e.g. Opus) for new patterns, design decisions, auth and security-sensitive work; `mid` (e.g. Sonnet) for pattern repeats, styling, and routine changes | most of the run's tokens are spent here |
| QA reviewer | mid-tier, ideally a different vendor | bounded read of one diff; independence matters more than size |
| Security auditor | same as QA, or a reasoning-heavy model | adversarial reading |
| Acceptance reviewer | different vendor if authenticated, else the strongest model in a fresh session | last gate, reads everything; the one seat worth the top tier |
| Extraction (design spec, code index) | cheapest capable model (e.g. Haiku), or the parent while it already has the source open | measurement, not reasoning |

Fresh-session review removes anchoring. Only a different vendor removes *correlated* blind spots. If only one cross-vendor seat is worth the setup cost, spend it on acceptance. Same-model fresh sessions are acceptable; record the reduced independence. Neither replaces the behavioral checks in `lane-protocol.md`.

## Recording

Write the routing table into the plan before lanes start and repeat each lane's engine/model in its tracker row. Mid-run changes are recorded with the first subtask they apply to. Never silently reroute.

## Launchers

Prefer the host's native subagent tool when it can reach the routed model. It shares the host's caching and avoids a CLI cold start. Use `scripts/run-lane.mjs` only to reach an engine the host cannot.

```sh
node scripts/run-lane.mjs --check
node scripts/run-lane.mjs --engine claude --model <id> --mode write \
  --cwd /path/to/worktree --assignment .plans/lanes/T02.md \
  --out .plans/lanes/T02.out.md --timeout 2400
# fix round: continue the same implementer session
node scripts/run-lane.mjs --engine claude --mode write --resume <session> \
  --assignment .plans/lanes/T02.fix1.md --out .plans/lanes/T02.fix1.out.md --timeout 1200
```

CLI resume finds sessions by working directory, so resume from the same `--cwd` the lane ran in.

For claude lanes the launcher adds `--strict-mcp-config --disable-slash-commands`. Lanes need no MCP servers or skills, and loading them added ~30% input tokens per turn when measured. It also prints a `usage:` line (tokens, cost, session id). Copy it into the tracker row.

Underlying shapes. **Verify with `<cli> --help`**, since flags move:

| Engine | Read-only lane | Writing lane | Resume |
|---|---|---|---|
| `claude` | `claude -p --output-format json --permission-mode plan` | `… --permission-mode acceptEdits` | `--resume <session>` |
| `codex` | `codex exec --sandbox read-only --skip-git-repo-check` | `… --sandbox workspace-write` | not wired; fresh fix lane |
| `cursor-agent` | `cursor-agent -p --output-format text` | `… --force` | `--resume <chatId>` |

- Cursor without `--force` only *proposes* edits, so a writing lane silently produces nothing.
- Codex `--sandbox read-only` and Claude `--permission-mode plan` are the real read-only guarantee for reviewers.
- Pass the assignment as a file. Long command-line prompts get mangled.
- Other non-interactive CLIs work the same way if they have a read-only and a writing mode.

## Safety

- Never pass secrets, tokens, `.env` contents, or transcripts into a lane. Send paths and facts.
- No bypass flag (`--dangerously-skip-permissions`, `--yolo`, `--sandbox danger-full-access`) without explicit per-run approval recorded in the tracker.
- Every lane has a `--timeout`. One launcher per working directory.

## Failure handling

- Engine missing or unauthenticated → report it, offer alternatives, ask. Never silently substitute.
- Non-zero exit or timeout → lane failed; keep the output, inspect the directory before relaunching.
- Rate limit, usage cap, or network drop → not a failed attempt. Resume the session (`--resume <session>`; `run-lane.mjs` prints the id even on failure) and lower the parallel lane count.
- Same failure twice → change approach or routing. No blind retries.
- No safe launcher → ask whether a disclosed parent fallback is acceptable; otherwise `Blocked`. Never claim independent review for a parent fallback.
