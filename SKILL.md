---
name: orchestrate-feature
description: >-
  Runs one end-to-end feature delivery workflow from raw requirements to merged
  documentation: a single batched clarification gate, an explicit per-role
  model-routing gate, a feature plan broken into user-approved MVP-sized
  delivery phases (later phases stay as placeholders until earlier ones land,
  to keep planning cost proportional to what's built), one isolated
  implementer lane per subtask, per-lane QA and security review, final
  acceptance against the original requirements, then a merged Markdown plus
  standalone HTML handoff that replaces the per-subtask docs. Works with any
  AI coding tool that can run skills and reach a subagent/child-session
  capability, not just Claude Code. Use this skill when the user hands over
  requirements or a feature request and wants planning, implementation, tests,
  review, and documentation orchestrated in one run, or asks to resume such a
  run. Do not use for planning without implementation, executing an existing
  written plan, reviewing already-finished code, or a single trivial edit that
  needs no lane, QA, or documentation.
license: MIT
compatibility: >-
  Requires project read and write access. Works on any AI coding tool that
  can run this skill and reach some subagent/child-session capability — the
  host's native subagent tools, an extension or plugin, or a non-interactive
  agent CLI. `claude`, `codex`, and `cursor-agent` are known example
  launchers for cross-model routing when the host itself cannot reach a
  routed model; other CLIs work the same way if they support a read-only
  and a writing invocation mode. Cross-model routing requires the
  corresponding CLI installed and authenticated. HTML merge requires Node.js
  (no specific minimum version enforced — this skill targets whatever Node
  the project already uses, legacy versions included; the merge script
  uses only long-stable `fs/promises` APIs).
metadata:
  short-description: Plan, build, QA, and document a feature in one orchestrated run
---

# Orchestrate Feature

Single entry point. The parent agent owns framing, the plan, the tracker, dispositions, acceptance, the merge, cleanup, and all user communication. Children produce evidence, never acceptance.

## Hard rules

- **Never assume.** Any requirement detail the user did not state goes to the clarification gate. Assume only what the user explicitly authorized you to assume.
- **Ask once.** Batch every open question into one clarification round. Later questions are allowed only for facts that could not have existed at that point.
- **No lane before routing.** Never launch a child until the model-routing gate is answered and recorded.
- **No phase before approval.** Plan and launch one phase at a time. A later phase is drafted only after the current phase is `Verified` (or explicitly descoped) and the user has approved moving on — never plan the whole feature in full detail upfront. This is what keeps token spend proportional to what's actually being built.
- **MVP first, per phase.** Each phase's subtasks target the smallest slice that makes the phase's outcome independently verifiable and demoable. Defer nice-to-haves, extra edge cases, and polish to a later phase or an explicit backlog note rather than folding them into the first pass.
- Implementer, QA reviewer, security auditor, and acceptance reviewer are always separate fresh-session subagents from the parent orchestrator; planning stays on the orchestrator's own session (it already holds the requirements and repository context) unless the user asks otherwise.
- One subtask = one lane = one fresh context window. No recursive delegation.
- Behavior-changing subtasks ship tests. No test, no `Verified`.
- Security review is a gate, not a bonus pass. It runs on every lane that touches input handling, auth, data access, file/network I/O, config, or dependencies.
- **Never delete per-subtask docs** until final acceptance is `Clear`.
- Two failed QA rounds, a recurring finding, or no progress → stop and ask the user.
- Never fake `Complete`. `Partial` and `Blocked` are valid endings.

## Blocking startup

Read these with the file tool before Phase 1. Memory does not count. Missing resource → stop, do not invent a substitute.

1. [`references/execution-profiles.md`](references/execution-profiles.md) — choose **Quick** or **Heavy** and record the choice.
2. [`assets/clarification-brief.md`](assets/clarification-brief.md) — the Phase 1 question shape.
3. [`references/model-routing.md`](references/model-routing.md) — the Phase 2 gate and launcher mechanics.

Follow `use-subagents` for delegation policy, isolation, and cleanup. Reuse `create-plan` for plan drafting, `awesome-tests` for test design, `code-review` for review depth, and `web-research` for third-party behavior when those skills are available; record which were unavailable.

## Phase 1 — Intake and clarification gate

1. Read the request, repository instructions (`CLAUDE.md`, `AGENTS.md`, `.cursor/rules`), existing plans, and the areas the request names.
2. Draft the requirement set: outcome, in-scope behavior, non-goals, constraints, acceptance signals.
3. If the request touches UI, run [`references/ui-design-intake.md`](references/ui-design-intake.md) before writing questions.
4. Build **one** numbered question list from the clarification brief. Group by topic, mark each `Blocking` or `Non-blocking`, and propose a default only where you would otherwise guess.
5. Send it and **stop**. Do not draft the plan, open lanes, or write code while questions are open.
6. Record every answer verbatim in the plan's Requirements section. An unanswered blocking question stays open — never resolve it yourself.

## Phase 2 — Model routing gate

Ask the routing questions from `references/model-routing.md` in one message — this always includes an explicit model choice for every subagent role, not just the ones the user happened to mention — then record the answers in the plan's routing table. Do not proceed on silence.

Roles to route, each a fresh-session subagent from the parent orchestrator: **implementer**, **QA reviewer**, **security auditor**, **acceptance reviewer**, **documentation merger**. Planning itself stays on the orchestrator's current model/session (confirm this with the user in the same message) unless they ask to move it to a fresh subagent too.

Independence rule: the QA reviewer for a lane must not be the same session as its implementer, and the acceptance reviewer must be a fresh session that implemented nothing. A different model is preferred but not required; the same model in a fresh context is acceptable — record it.

## Phase 3 — Plan

1. Read [`assets/feature-plan-template.md`](assets/feature-plan-template.md), then write `.plans/<feature-slug>.md`.
2. Decompose: feature → **delivery phases** → subtasks. A delivery phase is a group of one or more subtasks that together produce one independently approvable, MVP-sized increment — not necessarily a full layer or the full feature. Each subtask has a stable ID, one independently verifiable outcome, owned paths, starts-at pointers, explicit non-goals, a named test target, and acceptance signals.
3. **Plan phase 1 in full detail now.** For phase 2 and later, write only a one- or two-line placeholder (goal and rough scope) — do not decompose them into subtasks yet. Detailed planning for a later phase happens right before it starts, once earlier phases have landed and can inform it. This is the main token-saving lever in this workflow: never spend planning tokens on a phase that might change shape or get descoped after seeing the previous phase's results.
4. Mark dependencies within the phase. Independent subtasks may run in parallel isolated worktrees; coupled ones run sequentially in one checkout.
5. Fill the routing table and the tracker rows for the phase being planned. Get user sign-off on **this phase** before Phase 4 runs it — required on Heavy runs, and on Quick runs whenever the phase is more than a trivial one-subtask change.
6. If a project-content caching/indexing tool (e.g. `graphify`, or an equivalent knowledge-graph/code-index tool already in the user's toolchain) is available, recommend it here as an optional accelerator for a codebase of meaningful size — it can cut repeated re-exploration cost across phases and lanes. State what it would do and its cost. Install and run it only if the user approves; if declined or unavailable, note that and proceed without it. Never install it silently.

## Phase 4 — Lane loop

Run [`references/lane-protocol.md`](references/lane-protocol.md) for each dependency-ready subtask **in the current, approved phase only**:

1. **Assign** — build the brief from [`assets/subtask-assignment.md`](assets/subtask-assignment.md) plus the matching profile in [`assets/agents/`](assets/agents/). Launch with the routed engine (`scripts/run-lane.mjs` when using a CLI).
2. **Implement** — the child clarifies-or-blocks, implements only its scope, runs its checks, and writes `docs/features/<feature-slug>/<subtask-id>-<slug>.md` from [`assets/feature-doc-template.md`](assets/feature-doc-template.md).
3. **QA** — a fresh reviewer reads that doc, the diff, and the parent requirements, then appends a verdict block using [`assets/qa-report-template.md`](assets/qa-report-template.md). Verdicts: `Clear` · `Changes required` · `Human decision required` · `Blocked`.
4. **Security** — apply [`references/security-gates.md`](references/security-gates.md) to any lane matching its triggers. Findings enter the same verdict block.
5. **Disposition** — parent decides `Fix now` / `Validate` / `Reject` / `Ask user` / `Block`. Accepted fixes go back to a fresh implementer lane with the QA block as input; re-QA until `Clear`.
6. **Verify and integrate** — inspect the full lane diff against baseline, rerun the checks yourself, then integrate. Update the tracker with evidence.
7. **Clean up** the lane per `use-subagents`. No dangling worktrees, branches, or processes.

When every subtask in the current phase is `Verified` (or user-approved `Descoped`), report the phase as done with its evidence and ask the user how to proceed: expand the next phase's placeholder into full detail (return to Phase 3, step 3, for that phase) and continue, stop here, or change scope. Do not draft the next phase's subtasks before this checkpoint. Repeat Phase 3 → Phase 4 once per phase until the feature's phases are all `Verified`/`Descoped` or the user stops the run.

## Phase 5 — Final acceptance

Runs once, after all planned phases reach a terminal state — not per phase. One fresh reviewer that implemented nothing and reviewed no lane reads every per-subtask doc plus the recorded requirements and returns `Complete` or `Pending` with the exact gaps. Use [`assets/agents/acceptance-reviewer.md`](assets/agents/acceptance-reviewer.md). `Pending` reopens the named tracker rows — it never edits the merge.

## Phase 6 — Merge and prune

Only after acceptance is `Complete`:

1. Read [`assets/merged-overview-template.md`](assets/merged-overview-template.md) and write `docs/features/<feature-slug>.overview.md` — the requirements-to-evidence table, architecture, security posture, and operating notes that no single lane owns.
2. Merge:
   ```sh
   node scripts/merge-feature-docs.mjs docs/features/<feature-slug> \
     --title "<Feature>" --overview docs/features/<feature-slug>.overview.md \
     --requirements .plans/<feature-slug>.md
   ```
3. Verify `docs/features/<feature-slug>.md` and `.html` open, are self-contained, and lose nothing material.
4. Prune: rerun with `--prune --dry-run`, confirm the delete list, then `--prune`. Delete the overview scratch file too — its content now lives in the merged document.

## Validation

- `node scripts/merge-feature-docs.mjs --help` and `node scripts/run-lane.mjs --help` exit `0`.
- `node --test scripts/orchestrate-feature.test.mjs` passes.
- Every tracker row is `Verified` or user-approved `Descoped`; every QA block is `Clear`; acceptance is `Complete`.
- Merged Markdown and HTML exist; per-subtask directory is gone or explicitly retained with a reason.

## Report

Plan path · profile · phases completed vs. remaining (placeholder-only) · routing table as used · caching/indexing tool recommended and whether installed · lanes with engine/model/QA outcome · checks run and skipped · security findings and dispositions · acceptance verdict · merged doc paths · retained resources and why · what remains open.
