# Execution profiles

Pick one at startup and record it in the plan. Profiles scale ceremony, not rigor: clarification, routing, tests, security triggers, phased delivery, behavioral checks, and acceptance happen in every profile.

## Choose

| Signal | Lite | Quick | Heavy |
|---|---|---|---|
| Subtasks | exactly 1 | 1-3 | 4+ |
| Surfaces touched | one layer, few files | one layer (UI **or** API **or** data) | crosses layers, services, or repos |
| Migration, public contract, auth, or payments change | no | no | yes |
| Parallel lanes | no | no | yes, worktrees |
| User turns before lanes | 1 (gate + routing + outline) | 1-2 | 3 (gate, routing, plan) |
| Reviewer sessions per lane | 1 combined QA + security | 1 combined QA + security | QA + separate security auditor on triggers |
| Acceptance | the lane reviewer's verdict | 1 fresh reviewer | 1 fresh reviewer |
| Overview file at merge | no | no | yes |
| **Sessions, no fix round** | **2** | **2 per lane + 1** | **2-3 per lane + 1** |

Ambiguous → pick the heavier one. Downgrading mid-run needs a reason in the tracker. A Lite run that needs a second subtask becomes Quick.

## Combined QA + security reviewer (Lite, Quick)

One read-only session per lane, briefed with `assets/agents/qa-reviewer.md` plus `assets/agents/security-auditor.md` when the lane hits a trigger. It is never the implementer's session. Record `QA+security: combined` in the tracker. Any Critical or High finding, or a lane touching auth, payments, or a migration, gets a separate security auditor for its re-review.

## Lite

- One subtask, one phase. Clarification questions, routing, and the one-subtask outline go in **one** user turn; the reply is the sign-off. If the answers change the outline materially, show it again and wait once.
- Clarification: only the sections that apply, at most ~8 questions. Routing may be answered "defaults" or "saved".
- Plan file is brief: requirements, routing, one subtask, tracker row.
- Implementer, then one combined reviewer that also checks the full requirement list. That verdict is acceptance; there is no separate acceptance session.
- Merge without `--overview`.

## Quick

- Clarification and routing may share one user turn. Phase approval folds into plan sign-off.
- Prefer one subtask per phase. Use 2-3 only when the paths and outcomes are really separate.
- Lanes run sequentially in the working checkout. No worktrees.
- Acceptance: one fresh reviewer over the whole feature.
- Merge without `--overview`.

## Heavy

- Clarification, routing, and plan sign-off are separate turns. Each phase gets its own approval; later phases stay placeholders.
- Independent lanes run in isolated worktrees with non-overlapping ownership. The parent is the only tracker writer.
- Separate security auditor for every triggered lane.
- Extra checkpoint reviews only at real boundaries: integration, migration, public contract, auth or data invariant, risky dependency.
- Start each phase in a new parent session (resume from the plan file).
- Merge with `--overview`.

## Fan-out cap

At most three parallel lanes, or fewer if the parent cannot integrate and review them in one pass. Past that, review turns into rubber-stamping.
