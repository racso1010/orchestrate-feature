# <Feature name>

- **Slug:** `<feature-slug>`
- **Profile:** `Quick` | `Heavy`
- **Status:** `Planning` | `In progress` | `Partial` | `Blocked` | `Complete`
- **Updated:** <date>
- **Docs directory:** `docs/features/<feature-slug>/`

## Requirements

Verbatim from the user plus verbatim clarification answers. This section is the contract that QA and final acceptance review against. Never paraphrase it after sign-off.

| ID | Requirement | Source | Acceptance signal |
|---|---|---|---|
| R01 | | user request / Q4 answer | |

**Non-goals:** <explicit exclusions>

**Assumptions authorized by the user:** <only what they explicitly allowed; otherwise "none">

**Open questions:** <blocking items still unanswered, or "none">

## Model routing

| Role | Engine | Model | Notes |
|---|---|---|---|
| Planning | | | current session |
| Implementer | | | |
| QA reviewer | | | independence: different vendor / fresh session |
| Security auditor | | | |
| Acceptance reviewer | | | fresh, implemented nothing |
| Documentation merger | | | |

Overrides: <subtask ID → engine/model, or "none">
Caps: <timeout or budget per lane, or "none">

## Design and constraints

Smallest approach that satisfies the requirements. Key decisions with the reason and the rejected alternative. UI design source and path when applicable.

## Caching / indexing tool

Tool considered: <name, e.g. graphify, or "none applicable">. Recommended: `yes` / `no — reason`. User decision: `approved` / `declined` / `n/a`. If approved, installed at: <path or "pending">.

## Key files

| Path | Why it matters | Expected impact |
|---|---|---|

## Phases

Each phase is a user-approved, MVP-sized increment made of one or more subtasks. Only the current (or next-to-start) phase is decomposed into subtasks in detail; later phases stay as a one-line placeholder until it's their turn — see the skill's Phase 3, step 3.

| Phase | Goal (MVP scope) | Subtask IDs | Status | Approved |
|---|---|---|---|---|
| P1 | | T01 | Planning | |
| P2 | <placeholder — not yet decomposed> | — | Not started | |

## Subtasks

Each row is one lane, belonging to exactly one phase above. Status: `Pending` | `In progress` | `In QA` | `Fixing` | `Verified` | `Blocked` | `Descoped`.

| ID | Phase | Subtask | Requirements | Deps | Owned paths | Test target | Engine/model | Status | Doc | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| T01 | P1 | | R01 | — | | | | Pending | | |

### T01 — <title>

- **Outcome:** <one independently verifiable result>
- **Change:** <one concrete edit or behavior per bullet>
- **Starts at:** <paths and symbols, non-exhaustive>
- **Non-goals:** <what this lane must not touch>
- **Tests:** <path or suite> — protects <observable behavior, boundary, or regression>
- **Checks:** <exact commands and expected signals>
- **Security triggers:** <matched triggers, or "none — reason">

## Reviews

| Checkpoint | Reviewer | Verdict | Findings | Disposition | Closure |
|---|---|---|---|---|---|
| T01 QA | | | | | |
| Final acceptance | | | | | |

## Decisions and deviations

| Item | Change | Reason | Evidence | Status |
|---|---|---|---|---|

## Merge

- Merged Markdown: `docs/features/<feature-slug>.md`
- Merged HTML: `docs/features/<feature-slug>.html`
- Per-subtask docs pruned: `yes` / `no — reason`
