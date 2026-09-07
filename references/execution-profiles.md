# Execution profiles

Pick one profile at startup and record it in the plan. The profile scales ceremony, not rigor: the clarification gate, the routing gate, tests, security triggers, and final acceptance run in both. **Phased delivery also runs in both** — every feature is decomposed into user-approved, MVP-sized phases, with only the active phase planned in subtask-level detail (see the skill's Phase 3). Quick and Heavy differ in how much ceremony wraps each phase, not in whether phasing happens.

## Choose

| Signal | Quick | Heavy |
|---|---|---|
| Subtasks | 1-3 | 4+ |
| Surfaces touched | one layer (UI **or** API **or** data) | crosses layers, services, or repos |
| Migration, public contract, auth, or payments change | no | yes |
| Parallel lanes needed | no | yes |
| Plan sign-off before implementation | optional | required |

Ambiguous → Heavy. Downgrading mid-run needs a reason in the tracker; upgrading needs none.

## Quick

- One clarification round and one routing message, which may be combined into a single user turn.
- Plan lives in `.plans/<feature-slug>.md`. A 1-3 subtask feature is usually one phase; phase approval can be folded into the plan sign-off itself rather than a separate turn.
- Lanes run sequentially in the working checkout. No worktrees.
- QA: one reviewer per lane. The security gate applies only when the lane hits a trigger in `security-gates.md`.
- Final acceptance may be one fresh reviewer over the whole feature rather than per lane.
- The merge still runs. A one-subtask feature produces a one-section merged doc, which is fine.

## Heavy

- Clarification and routing are separate user turns; the plan needs explicit sign-off.
- Plan groups subtasks under phases (MVP-sized increments) with a dependency column and named join points; each phase gets its own explicit approval turn before its lanes launch, and later phases stay placeholder-only until their turn.
- Independent lanes run in isolated worktrees with non-overlapping ownership. Parent is the sole tracker writer.
- QA per lane, plus a security auditor lane for every triggering subtask.
- Checkpoint reviews at real boundaries: integration, migration, public contract, auth or data invariant, risky dependency.
- Final acceptance is a dedicated fresh reviewer, followed by the merge — run once, after every phase reaches a terminal state.

## Fan-out cap

Cap parallel lanes at what the parent can integrate, verify, and clean up in one pass — normally three. Exceeding the cap turns review into rubber-stamping, which defeats the workflow.
