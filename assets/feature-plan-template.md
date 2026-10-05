# <Feature name>

**Slug:** `<feature-slug>` · **Profile:** `Lite` | `Quick` | `Heavy` · **Status:** `Planning` | `In progress` | `Partial` | `Blocked` | `Complete` · **Updated:** <date>

This file is the run's state. A new session resumes from it alone.

## Requirements

Verbatim from the user and the clarification answers. QA and acceptance review against this. Never paraphrase after sign-off.

| ID | Requirement | Source | Acceptance signal |
|---|---|---|---|
| R01 | | request / Q4 | |

**Non-goals:** <…> · **Authorized assumptions:** <or "none"> · **Open questions:** <or "none">

## Routing

| Role | Engine / model | Notes |
|---|---|---|
| Planning | | current session |
| Implementer — `top` tier | | new patterns, design, auth, security |
| Implementer — `mid` tier | | pattern repeats, styling, routine |
| QA (+security at `combined`) | | independence: different vendor / fresh session |
| Security auditor (`full` lanes) | | |
| Acceptance (Quick/Heavy) | | fresh, implemented nothing |

Overrides / caps: <or "none">

## Design

Smallest approach that meets the requirements. Key decisions with the rejected alternative. UI: design source, spec at `.plans/<feature-slug>.design-spec.md`, density decisions recorded there. Code-index tool: <opt-in only: the queries lanes will run, or "not used">.

## Environment

Verified once before the first lane (date: <…>). Lanes copy these commands and block on environment errors instead of working around them.

- Run/test location: <host / container name> · dependency install: <command; isolated volume for platform-specific deps, if containerized>
- Test `<cmd>` · lint `<cmd>` · typecheck `<cmd>` · build `<cmd>` · app `<cmd + URL>`
- Already failing on baseline: <list, or "none">

## Phases

| Phase | Goal (MVP) | Subtasks | Status | Approved | Checkpoint: full suite · behavioral check · design audit | Tokens |
|---|---|---|---|---|---|---|
| P1 | | T01 | Planning | | | |
| P2 | <placeholder — not decomposed> | — | Not started | | | |

## Tracker

Status: `Pending` | `In progress` | `In QA` | `Fixing` | `QA clear` | `Verified` | `Blocked` | `Descoped`.

| ID | Phase | Subtask | Reqs | Deps | Pattern | Review | Tier | Owned paths | Session | Status | QA | Tokens |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| T01 | P1 | | R01 | — | sets P-a | full | top | | | Pending | | |

Pattern: `sets <id>` / `repeats <id> (lane T0n)` / blank. Review: `checks` / `combined` / `full` (`lane-protocol.md`). Tier: `top` / `mid`.

### T01 — <title>

- **Outcome:** <one verifiable result>
- **Change:** <one bullet per behavior>
- **Context pack:** <path:line — symbol — why>
- **Non-goals:** <…>
- **Tests / checks:** <suite and exact commands>
- **Security triggers:** <list, or "none — reason">
- **Review level / tier / pattern:** <level — reason> · <tier> · <pattern, and whether it shares a lane or continues a session>

## Decisions and deviations

| Item | Change | Reason |
|---|---|---|

## Acceptance and merge

Acceptance: <verdict, reviewer> · Merged: `docs/features/<feature-slug>.md` / `.html` · Pruned: yes / no — reason
