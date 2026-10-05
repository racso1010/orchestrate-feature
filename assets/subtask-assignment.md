# Subtask assignment

Write to `.plans/lanes/<subtask-id>.md` with the role profile from `assets/agents/` prepended, and pass the path to the lane. Fill every field and delete the lines that do not apply. The role profile carries the rules, so do not restate them here.

The **context pack** is the main token saver. Use precise pointers (path, line range, symbol, one-line purpose), not pasted file bodies. Reviewers get one too: the touched symbols and their callers.

```text
Role: implementer | qa-reviewer | qa-reviewer+security | security-auditor | acceptance-reviewer
Subtask: <T0n> — <one concrete, verifiable outcome>
Working directory: <absolute path>   Baseline: <revision>   Timeout: <bound>

Requirements (verbatim):
- R0n: <text>

Context pack (trust it; do not re-derive it):
- <path>:<start>-<end> — <symbol> — <why it matters>
- Callers: <path>:<line> → <symbol>
- Nearest tests: <path> — <pattern to copy>
- Conventions: <naming, errors, test style>
- Commands: test `<cmd>`, lint `<cmd>`, typecheck `<cmd>`

Owned paths: <list>
Change: <one bullet per concrete behavior>
Non-goals: <what must not change>
Design spec (UI only): .plans/<feature-slug>.design-spec.md rows <…> — build to these values, not to precedent; reuse <components>, states <…>, a11y floor <…>
Pattern: sets <id> | repeats <id> from <lane doc path> | none
Security triggers: <list, or "none">
Tests: <path/suite> covering <behavior and boundary>
Checks: <exact commands from the plan's Environment section>
Doc: docs/features/<feature-slug>/<subtask-id>-<slug>.md
Stop when: <completion condition>

# Reviewers only
Diff: <git diff command or patch path>
Implementer's reported checks: <paste exact output summary>
Review level: combined | full — Behavioral check required: yes (<reason>) | no
Re-review scope (fix rounds): <finding #s> — check only these and the fix diff
```

The parent owns diff review, the phase checkpoint, VCS, integration, acceptance, and cleanup.
