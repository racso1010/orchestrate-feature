# Lane protocol

Contents: [States](#states) · [Review levels](#review-levels) · [Who runs what](#who-runs-what) · [Assign](#assign) · [Pattern groups](#pattern-groups) · [Implement](#implement) · [Review](#review) · [Disposition and fix rounds](#disposition-and-fix-rounds) · [Integrate](#integrate) · [Isolation](#isolation) · [Cleanup](#cleanup)

One subtask, one lane. A lane is finished when the parent has verified it, not when the child says so.

## States

Tracker row: `Pending` → `In progress` → `In QA` → `Fixing` → `QA clear` → `Verified` (at the phase checkpoint), or `Blocked` / `Descoped`.

QA verdict: `Clear` · `Changes required` · `Human decision required` · `Blocked`.

Parent disposition: `Fix now` · `Validate` · `Reject` · `Ask user` · `Block`.

## Review levels

Set per lane at planning and shown to the user at phase sign-off. Risk decides the level, not the profile.

| Level | Who reviews | Use for |
|---|---|---|
| `checks` | no reviewer session; the parent runs the deterministic checks (tests, lint/typecheck, design-spec values, visual parity hashes, design detectors) and appends a checks block | styling-only or pattern-repeat lanes with **no security trigger**, whose pattern was already reviewed at `combined` or `full` |
| `combined` | one fresh read-only QA + security reviewer | the default |
| `full` | a separate QA reviewer, plus a separate security auditor when triggered | auth, sessions, permissions, payments, migrations, handling of user input, and the **first lane of each new pattern** |

- A lane with a security trigger is never `checks`.
- Escalate a lane one level when a check fails without a clear reason, the diff leaves owned scope, or a review finds Critical/High. Never downgrade a triggered lane.
- `checks` block, appended by the parent to the lane doc: `## Checks — <T0n>` · review level and the pattern lane it repeats · each command → result.

## Who runs what

Each check runs once, where it is cheapest and still independent. Do not repeat a check another seat already ran and reported with exact output.

| Check | Implementer | Reviewer | Parent |
|---|---|---|---|
| Lane's own tests + lint/typecheck for changed files | runs, reports exact output | reads the reported output; reruns only a test it doubts | — |
| Behavioral check on the lane | — | `full` lanes, and `combined` lanes with data writes or a security trigger | — |
| Mutation check (revert the fix, confirm its test goes red) | — | on bug-fix lanes | — |
| Full test suite + build | — | — | once per phase, at the checkpoint |
| Phase behavioral check (composed path through the running app/CLI/API) | — | — | once per phase, at the checkpoint |
| Requirements vs evidence across lanes | — | — | acceptance reviewer, once per run |

A behavioral check exercises the built artifact directly, not through its own tests, because a suite can share the code's false assumption (e.g. a function that is tested directly but never called on the running path). The phase check also covers the seams between that phase's lanes.

## Assign

Write `.plans/lanes/<subtask-id>.md` from `assets/subtask-assignment.md` and prepend the role profile from `assets/agents/`. Every field is filled; empty fields are how lanes drift out of scope.

The **context pack** is built from planning notes, not from a new survey: path:line pointers to the symbols, callers, nearest tests, conventions, and commands the parent already found. Reviewers get one too: the touched symbols and their callers.

Never send the whole plan, other lanes' assignments, credentials, or the conversation transcript.

## Pattern groups

When one subtask sets up a pattern (a view, endpoint, or component shape) and later subtasks repeat it, do not let each one learn it again from scratch:

- **One lane for the group** when the repeats are small and their owned paths do not overlap: one assignment lists them all, one implementer builds them, and one doc section per subtask keeps the merge intact.
- **Or continue the pattern-setter's session**: send the next subtask's short assignment to the same implementer (native continue/send-message, or `run-lane.mjs --resume <session>`). CLI resume only works from the same working directory, so pattern groups run sequentially in one checkout.
- Start fresh, with a context pack pointing at the pattern lane's doc and diff, once a continued session has done about three subtasks or its context is large. A long resumed session costs more per turn than a cold one.

The pattern-setter is reviewed at `combined` or `full`. The repeats may be `checks` if they meet that level's conditions.

## Implement

The child follows `assets/agents/implementer.md`. It does not commit, branch, integrate, or delegate. Record the session id (the `usage:` line from `run-lane.mjs`, or the native subagent's id) in the tracker row. Fix rounds need it.

## Review

A read-only session that is not the implementer follows `assets/agents/qa-reviewer.md`. It gets the feature doc, the diff, the requirement lines, the acceptance signals, and the reviewer context pack. It does not get the implementer's reasoning or the parent's opinion.

- `combined`: one session does QA and security (role `qa-reviewer+security`).
- `full`: separate `qa-reviewer` and, when triggered, `security-auditor` sessions.
- `checks`: no reviewer; see [Review levels](#review-levels).
- Lite: the reviewer also checks the lane against the **full** requirement list. That verdict is the run's acceptance.

## Disposition and fix rounds

The parent decides on every finding. Child verdicts are evidence.

- `Fix now` → **resume the implementer's session** with the QA block's pending list: the native subagent's continue/send-message, or `run-lane.mjs --resume <session>`. Start a fresh implementer lane only when the session cannot be resumed (expired, codex, or the implementer itself caused the confusion) and record why.
- **Re-review is scoped**: a reviewer session gets only the pending findings and the fix diff, and confirms each is closed without regressing the lane. It may be the same reviewer session resumed. Independence from the implementer is what matters.
- `Validate` → the parent verifies the claim before acting.
- `Reject` → record why in the tracker; the finding stays visible in the doc.
- `Ask user` → scope, risk, cost, or product decisions.
- `Block` → unsafe or unresolvable within the run.

Two failed rounds on the same finding, a recurrence, or no progress → stop and ask the user.

**Interrupted lanes** (rate limit, usage cap, timeout, network) are not failed attempts: resume the session (`--resume <session>`; `run-lane.mjs` prints the id) with "continue where you stopped", rather than relaunching from scratch. Inspect the working directory first.

## Integrate

1. Wait for a terminal state through the launcher. Never fire-and-forget.
2. Read the diff stat (including untracked files) and the handoff. Open the full diff for files outside owned scope, files the reviewer flagged, or anything the handoff does not explain.
3. Integrate through the repository's normal method.
4. Update the tracker row: QA verdict, files, the implementer's reported checks, tokens used where reported.

## Isolation

- Reviewers are read-only, enforced by the engine flag, not the prompt.
- Writers run sequentially in one checkout, or concurrently only in isolated worktrees with non-overlapping ownership (Heavy).
- Never mutate an active writer's directory from the parent or a sibling.
- Record before launch: baseline revision, path, branch, owner, pre-existing dirty state.

## Cleanup

After each lane and at the end of the run: stop live children, integrate or discard work, and remove only workflow-created resources that are terminal. Keep launcher output until reviewed, because it is the evidence. Report anything retained.
