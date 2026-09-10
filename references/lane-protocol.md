# Lane protocol

Contents: [States](#states) · [Assign](#assign) · [Implement](#implement) · [QA](#qa) · [Disposition](#disposition) · [Verify and integrate](#verify-and-integrate) · [Isolation](#isolation) · [Cleanup](#cleanup)

One subtask, one lane, one fresh context. A lane is finished when the parent has verified it — not when the child says so.

## States

Tracker row: `Pending` → `In progress` → `In QA` → `Fixing` → `Verified`, or `Blocked` / `Descoped`.

QA verdict: `Clear` · `Changes required` · `Human decision required` · `Blocked`.

Parent disposition of a finding: `Fix now` · `Validate` · `Reject` · `Ask user` · `Block`.

## Assign

Build the brief from `assets/subtask-assignment.md` plus the role profile in `assets/agents/`. Every field is filled; empty fields are how lanes go out of scope.

The child receives: its objective, the authorized working directory, the baseline revision, the exact requirement lines it must satisfy, the files to read first, owned paths, explicit non-goals, the test target, the checks to run, the doc path to write, the stop condition, and the timeout.

The child never receives: the whole plan, other lanes' assignments, credentials, or the conversation transcript. Send task-relevant context only.

## Implement

The child's contract, in order:

1. **Clarify or block.** Read the requirement lines. If any is ambiguous, contradictory, or unsatisfiable within the owned scope, stop and report the blocking question. It never guesses and never widens scope to resolve one.
2. **Implement** the smallest coherent change that satisfies the subtask. No speculative abstractions, unrelated cleanup, new dependencies, or drive-by refactors.
3. **Test.** Add or extend automated tests at the narrowest layer the repository already uses, covering the observable behavior and its boundary. Run them. A behavior-changing lane with no test must justify the omission and give an alternate validation — the parent decides whether to accept it.
4. **Check.** Run the project's lint, typecheck, build, and migration commands that apply to what changed. Report exact commands and exact results. Never claim an unrun check passed.
5. **Document.** Write `docs/features/<feature-slug>/<subtask-id>-<slug>.md` from `assets/feature-doc-template.md`.

The child does not commit, branch, create worktrees, integrate, or delegate.

## QA

A fresh reviewer, different session from the implementer, read-only, receives: the feature doc, the lane diff, the requirement lines, and the parent's acceptance signals. It does not receive the implementer's reasoning or the parent's opinion.

It checks:

- Every requirement line is actually satisfied by the diff, not merely claimed in the doc.
- The doc matches the code. Drift between them is a finding.
- Tests exist, run, cover the stated behavior, and would fail if the behavior regressed. Assertions on incidental detail are a finding.
- Nothing outside the owned scope changed.
- Security triggers from `security-gates.md`, where they apply.
- Error paths, boundaries, and empty or failure states.
- **Behavioral verification.** Reading the diff and rerunning the given tests is not enough — a test suite can share the same false assumption as the code it tests (e.g. a function defined but never called from the running path, where the test calls it directly and passes). For any lane whose subtask has a runnable surface, do at least one check that exercises the built artifact directly rather than through its own tests: drive the actual app/CLI/API through the changed path, seed adversarial or boundary input the tests don't cover, or revert the fix locally and confirm the test that's supposed to guard it actually goes red. Record what was run and its result in the QA report. If no runnable surface exists (pure refactor with no behavior change, docs-only, etc.), say so explicitly rather than leaving it blank.

It appends a verdict block to the same feature doc using `assets/qa-report-template.md`. It never edits source files and never rewrites the implementer's sections — it appends.

Admit a finding only when there is a concrete failure, realistic reachability, practical impact, and an action justified now. "No material findings" is a valid, expected outcome.

## Disposition

The parent decides on every finding. Child verdicts are evidence.

- `Fix now` → new fresh implementer lane, scoped to the finding, with the QA block as its input. Re-QA after.
- `Validate` → the parent verifies the claim before acting.
- `Reject` → record why in the tracker; the finding stays visible in the doc.
- `Ask user` → scope, risk, cost, or product decisions.
- `Block` → unsafe or unresolvable within the run.

Two failed rounds on the same finding, a recurrence after a fix, or no progress → stop and ask the user. Do not start a third round.

## Verify and integrate

1. Reach a terminal state through the launcher; never fire-and-forget.
2. Read the full lane diff against baseline, including untracked files. Child claims are not proof.
3. Rerun the lane's checks yourself.
4. Integrate through the repository's normal method.
5. Update the tracker with evidence: commands run, results, file paths, QA verdict.

## Isolation

- Readers are read-only, enforced by the engine flag.
- Writers run sequentially in one checkout, or concurrently only in isolated worktrees with non-overlapping ownership.
- Never mutate an active writer's working directory from the parent or a sibling.
- Record before launch: baseline revision, path, branch, owner, pre-existing dirty or untracked state, dependencies, join point.

## Cleanup

After each lane and at the end of the run: stop live children, integrate or mark work disposable, remove only workflow-created resources that are terminal and fully handled, and clear launcher runtime state after review — never before, since it is the evidence. Retain and report anything unsafe or unknown. No unaccounted workflow-owned worktrees, branches, processes, or sockets.
