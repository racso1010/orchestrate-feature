# Subtask assignment

Write this to `.plans/lanes/<subtask-id>.md` and pass the path to the lane. Fill every field. Send only task-relevant context — never secrets, tokens, `.env` contents, or the conversation transcript.

```text
Role: implementer | qa-reviewer | security-auditor | acceptance-reviewer
Mode: writer | reader
Subtask ID: <T0n>
Objective: <one concrete, independently verifiable outcome>

Authorized working directory: <exact absolute path>
Baseline: <revision or pre-lane state>
Engine/model: <as routed>
Timeout: <bound>

Requirements you must satisfy (verbatim):
- R0n: <text>
- R0n: <text>

Read first:
- <path> — <why>
- <path> — <why>

Owned scope:
- Paths you may modify: <list>
- Behavior to implement: <bullets, one concrete change each>

Non-goals and prohibited areas:
- <what must not change>
- Do not refactor, rename, reformat, or upgrade anything outside owned paths.
- Do not add dependencies without stating the need in your handoff.

Design source (UI lanes only): <path or decision> — reuse <components>, use <tokens>, required states <list>, accessibility floor <list>.

Security: apply the triggered checks from the orchestrator's security gates. Triggers matched: <list, or "none">.

Tests: add or extend <path or suite> covering <observable behavior and boundary>. Run them.
Checks to run: <exact commands>. Report exact results and any justified skip. Never claim an unrun check passed.

Documentation: write <docs/features/<feature-slug>/<subtask-id>-<slug>.md> using the feature doc shape supplied below. Do not edit any other document.

Constraints:
- Clarify or block before implementing if a requirement is ambiguous, contradictory, or unsatisfiable in scope. Do not guess and do not widen scope to resolve it.
- No VCS mutation: no commits, branches, worktrees, merges, or cleanup, including via shell.
- Never delegate, spawn, or coordinate another agent.
- Do not edit the plan, tracker, other lanes' docs, or integration state.
- Run one command per shell call. Do not prefix a read command with `echo` narration or chain it with `&&`/`;` — a bare `grep`/`cat`/`find`/`git status` auto-approves; wrapping it in a compound line forces a manual permission prompt on every call. Put narration in your handoff text, not in the shell.

Stop when: <completion condition>.

Handoff: files read; files changed with paths; decisions and why; exact checks and results; skips; assumptions; risks; blockers; remaining work; terminal state of the working directory.
```

The parent owns full-diff review, rerunning checks, VCS, integration, acceptance, and cleanup. A lane is not done when the child says it is.
