# Model routing

Contents: [The gate](#the-gate) · [Defaults to propose](#defaults-to-propose) · [Recording the answer](#recording-the-answer) · [Launchers](#launchers) · [Safety](#safety) · [Failure handling](#failure-handling)

Planning runs on the currently selected model/session unless the user moves it. Every other role — implementer, QA reviewer, security auditor, acceptance reviewer, documentation merger — is a **separate fresh-session subagent**, and each one's engine and model is decided explicitly here, never assumed or inherited from planning. **Never launch a child before this gate is answered.**

## The gate

Send one message containing all six questions. Offer the defaults below so the user can reply with a single word. Ask for a real choice on every role — do not skip a role because it seems minor or because an earlier answer seems like it should imply it.

1. **Planning** — confirm it stays on the current model/session, or move it to a fresh subagent too?
2. **Implementer** — which engine and model builds the subtasks? (fresh subagent, always)
3. **QA reviewer** — which engine and model reviews each lane against its requirements? (fresh subagent, always, never the same session as its implementer)
4. **Security auditor** — which engine and model runs the security gate? (fresh subagent; may be "same as QA")
5. **Acceptance reviewer** — which engine and model does the final requirements-vs-docs pass? (fresh subagent that implemented nothing; prefer a different vendor from the implementer if one is authenticated and available — this is the highest-leverage seat for cross-vendor review)
6. **Documentation merger** — which engine and model writes the merged Markdown and HTML? (May be "parent".)

Also confirm, in the same message:

- **Per-subtask overrides** — any subtask that should use a different model than the default implementer?
- **Budget or turn caps** — a ceiling per lane, if they want one.

Do not proceed on silence. If the user says "you decide", say which routing you are taking and why, record it as a parent decision, and continue.

## Defaults to propose

| Role | Default | Why |
|---|---|---|
| Planning | current model | already holds the conversation and repository context |
| Implementer | strongest available coding model on the user's primary CLI | most of the run's cost and risk sits here |
| QA reviewer | a **different vendor** from the implementer | different failure modes; a model rarely catches its own blind spot |
| Security auditor | same as QA, or a reasoning-heavy model | adversarial reading, not code generation |
| Acceptance reviewer | a **different vendor** from the implementer, if one is authenticated and available; otherwise the planning model, fresh session | it is the last gate and reads everything — the single highest-leverage seat for cross-vendor review |
| Documentation merger | a cheaper fast model, or parent | mostly deterministic assembly |

Cross-vendor QA and cross-vendor acceptance review are recommendations, not rules. A fresh session of the same model is acceptable for either — record the reduced independence in the tracker. Fresh-session review eliminates anchoring (the reviewer can't be argued into the implementer's conclusion); only a different vendor addresses *correlated* blind spots, where implementer and reviewer share the same training-driven instincts and walk past the same defect because it "looks right" to both. If only one cross-vendor slot is worth the extra setup cost, spend it on acceptance, not QA — it is the last chance to catch anything QA missed.

Regardless of routing, behavioral verification (see `lane-protocol.md`'s QA section) is not optional and is not a substitute for cross-vendor review, nor the reverse — a test suite and a reviewing model can share the same false assumption; an actually-running app, or a balance that moved from 10000 to 8201, cannot.

## Recording the answer

Write the routing table into `.plans/<feature-slug>.md` before Phase 3 ends, and repeat the resolved engine and model in each lane's tracker row. If the user changes routing mid-run, record the change and the first subtask ID it applies to. Never silently reroute.

## Launchers

Prefer the host's native subagent tool when it can reach the routed model — this skill runs on any AI coding tool that exposes one, not only Claude Code. Use a CLI only when the host itself can't reach the routed engine/model. Follow `use-subagents` for isolation, supervision, verification, and cleanup regardless of launcher.

`scripts/run-lane.mjs` wraps three known CLIs (`claude`, `codex`, `cursor-agent`) with a uniform interface, a timeout, and captured output. These three are examples, not a closed list — any non-interactive agent CLI that supports a read-only mode and a writing mode can be routed to the same way; add it to `run-lane.mjs` or invoke it directly, following the same read-only/writing split and the Safety rules below.

```sh
node scripts/run-lane.mjs --check
node scripts/run-lane.mjs --engine codex --model <id> --mode write \
  --cwd /path/to/worktree --assignment .plans/lanes/T02.md \
  --out .plans/lanes/T02.out.md --timeout 2400
```

Underlying shapes, for reference — **verify with `<cli> --help` before relying on any flag**, since all three move fast:

| Engine | Read-only lane | Writing lane |
|---|---|---|
| `claude` | `claude -p --model M --output-format json --permission-mode plan` | `claude -p --model M --output-format json --permission-mode acceptEdits` |
| `codex` | `codex exec --model M --sandbox read-only --skip-git-repo-check` | `codex exec --model M --sandbox workspace-write --skip-git-repo-check` |
| `cursor-agent` | `cursor-agent -p --model M --output-format text` | `cursor-agent -p --model M --force --output-format text` |

Notes that matter in practice:

- Cursor print mode only *proposes* edits without `--force`; a writing lane without it silently produces nothing.
- Codex `--sandbox read-only` is the real guarantee for a reviewer lane; approval flags do not apply in `exec`.
- Claude's `--permission-mode plan` keeps a reviewer from editing. Prefer it over trusting the prompt.
- Pass the assignment as a file and reference its path. Long prompts on the command line get truncated or mangled by the shell.

## Safety

- Never pass secrets, tokens, `.env` contents, or private transcripts into a lane prompt. Send paths and facts, not credentials.
- Never use a bypass flag (`--dangerously-skip-permissions`, `--yolo`, `--sandbox danger-full-access`) without explicit per-run user approval, recorded in the tracker.
- Reviewer lanes are read-only. Enforce that with the engine's flag, not with wording in the prompt.
- Give every lane a `--timeout`. An unbounded child is an unsupervised child.
- One accountable launcher per lane. Never let two launchers drive the same working directory.

## Failure handling

- Engine missing or unauthenticated → report it, offer the routed alternatives, and ask. Do not silently substitute a model.
- Non-zero exit or timeout → treat the lane as failed, keep the output for evidence, and inspect the working directory before relaunching.
- Identical failure twice → change the approach or the routing. Do not blind-retry.
- No safe launcher at all → ask whether the user accepts a disclosed parent fallback. Without approval the run is `Blocked`. Never claim independent review for a parent fallback.
