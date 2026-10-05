---
name: orchestrate-feature
description: >-
  Runs one end-to-end feature delivery from raw requirements to merged docs: one
  batched clarification gate, a per-role model-routing gate, a plan split into
  user-approved MVP phases (later phases stay placeholders), one isolated
  implementer lane per subtask with independent QA/security review, final
  acceptance, and a merged Markdown + HTML handoff. Works on any AI coding tool
  with a subagent or agent-CLI capability. Use when the user hands over
  requirements or a feature request and wants planning, implementation, tests,
  review, and docs orchestrated in one run, or asks to resume such a run. Not
  for planning only, executing an existing plan, reviewing finished code, or a
  trivial edit.
license: MIT
compatibility: >-
  Needs project read/write access and a subagent capability: the host's native
  subagent tool, or a non-interactive agent CLI (`claude`, `codex`,
  `cursor-agent` are wired into `scripts/run-lane.mjs`). Cross-model routing
  needs that CLI installed and authenticated. The HTML merge needs Node.js
  (any version the project already uses).
metadata:
  short-description: Plan, build, QA, and document a feature in one orchestrated run
---

# Orchestrate Feature

Single entry point. The parent agent owns framing, the plan, the tracker, dispositions, acceptance, the merge, cleanup, and all user communication. Children produce evidence, never acceptance.

## Hard rules

- **Never assume.** Any requirement detail the user did not state goes to the clarification gate, unless the user explicitly authorized the assumption.
- **Ask once.** Batch every open question into one round. Later questions only for facts that could not have existed then.
- **No lane before routing.** Never launch a child until the routing gate is answered and recorded.
- **One phase at a time, MVP first.** Plan only the current phase in detail; later phases stay one-line placeholders until the current one is `Verified` and the user approves moving on. Each phase is the smallest independently verifiable, demoable slice.
- **Fewer, larger subtasks.** Every lane has a fixed cost (brief, review, doc). Split work into separate subtasks only when it has separate owned paths and can be verified on its own, or when it can run in parallel. Default: one subtask per phase.
- **Independence.** Implementers and reviewers are separate sessions from the parent and from each other. Planning stays on the parent. No recursive delegation.
- **Resume, don't cold-start.** Fix rounds and pattern-repeat subtasks continue the implementer session that already holds the context; only reviewers need fresh sessions.
- **Run each check once in the right place** (see [`lane-protocol.md`](references/lane-protocol.md#who-runs-what)). Behavior-changing subtasks ship tests. No test, no `Verified`.
- **Review follows risk, not profile.** Each lane gets a review level (`checks` / `combined` / `full`, see `lane-protocol.md`) set at planning. Security review is a gate on every lane matching a trigger in [`security-gates.md`](references/security-gates.md); a triggered lane is never `checks`.
- Never delete per-subtask docs until acceptance is `Complete`.
- Two failed fix rounds, a recurring finding, or no progress → stop and ask the user.
- Never fake `Complete`. `Partial` and `Blocked` are valid endings.
- **Keep your own turns short.** Status in five lines or fewer; one line per lane report (verdict, files, tokens); no recaps of earlier turns. Details live in the plan, not the conversation.

## Startup

Read with the file tool, not memory. Missing resource → stop, do not invent a substitute.

1. [`references/execution-profiles.md`](references/execution-profiles.md) — choose **Lite**, **Quick**, or **Heavy** and record it.
2. [`assets/clarification-brief.md`](assets/clarification-brief.md) — Phase 1 question shape.
3. [`references/model-routing.md`](references/model-routing.md) — Phase 2 gate and launchers.

Read every other file only at the step that names it. Use `use-subagents`, `create-plan`, `awesome-tests`, `code-review`, and `web-research` when those skills exist; record which were missing.

**Resuming a run** (including in a new session — see Phase 4 checkpoint): read the plan file first. It is the run's state. Do not re-read lane docs or diffs of phases already `Verified`.

## Phase 1 — Intake and clarification gate

1. Read the request, repository instructions (`CLAUDE.md`, `AGENTS.md`, `.cursor/rules`), existing plans, and the areas the request names. Note path:line pointers as you go — they become the lanes' context packs.
2. Draft the requirements: outcome, in-scope behavior, non-goals, constraints, acceptance signals.
3. UI work → run [`references/ui-design-intake.md`](references/ui-design-intake.md) first: find the design source, extract the design spec once if a design file exists, and add the density and layout questions to the gate.
4. Send **one** numbered question list from the clarification brief and **stop**. No plan, lanes, or code while questions are open.
5. Record answers verbatim in the plan's Requirements. An unanswered blocking question stays open.

## Phase 2 — Model routing gate

Ask the gate from `model-routing.md` in one message (saved routing can make this a one-word reply) and record the answer in the plan. Do not proceed on silence.

## Phase 3 — Plan

1. Write `.plans/<feature-slug>.md` from [`assets/feature-plan-template.md`](assets/feature-plan-template.md).
2. Decompose feature → phases → subtasks. Each subtask: stable ID, one verifiable outcome, owned paths, starts-at pointers, non-goals, test target, acceptance signals, **review level**, **model tier**, and **pattern group** (which earlier subtask's pattern it repeats, if any). Pattern-repeat subtasks either share one lane or continue the pattern-setter's session (`lane-protocol.md`).
3. **Plan the current phase in full; later phases get a one- or two-line placeholder.** Never spend planning tokens on a phase that may change shape after the previous one lands.
4. Mark dependencies. Independent subtasks may run in parallel worktrees (Heavy); coupled ones run sequentially.
5. **Environment check** before the first lane (first phase only, or when the environment changed): run the test, lint, and build commands once on the baseline and record which already fail. If the project runs in a container, confirm dependencies are installed for the platform that runs the commands (e.g. native `node_modules` built on macOS do not work in a Linux container; use an isolated volume or run installs inside the container). Record the exact working commands in the plan's Environment section. Lanes copy them and block on environment errors instead of working around them.
6. Get sign-off on this phase per the profile; the user sees each lane's review level and model tier.
7. Code-index tools (e.g. `graphify`) are **opt-in**: recommend one only if you can name the queries the lanes will run against it, extract with the cheapest model, and record the decision. Context packs are the default.

## Phase 4 — Lane loop

For each dependency-ready subtask **in the approved phase only**, run [`references/lane-protocol.md`](references/lane-protocol.md):

1. **Assign** — brief from [`assets/subtask-assignment.md`](assets/subtask-assignment.md) + the role profile in [`assets/agents/`](assets/agents/), with a filled context pack. Launch with the routed engine at the subtask's model tier, or resume the pattern-setter's session.
2. **Implement** — the child builds, tests, and writes `docs/features/<feature-slug>/<subtask-id>-<slug>.md`.
3. **Review** at the lane's level: `checks` → the parent runs the deterministic checks and appends a checks block; `combined` → one fresh QA + security reviewer; `full` → separate QA reviewer, plus a separate security auditor when triggered.
4. **Disposition** — `Fix now` / `Validate` / `Reject` / `Ask user` / `Block`. Fixes resume the implementer; re-review covers only the listed findings.
5. **Integrate** — read the diff stat and the handoff, open the full diff where review flagged risk or scope drift, then integrate.
6. **Clean up** per `use-subagents`.

**Phase checkpoint** — when every subtask in the phase is QA `Clear`:

1. Run the full test suite and project checks once on the integrated result.
2. Drive the phase's composed path through the real app/CLI/API once (the phase behavioral check, `lane-protocol.md`). On the last phase that changes UI, also run the **one design audit** against the spec (`ui-design-intake.md` §5). Record commands and results in the plan.
3. Mark rows `Verified`, write the phase's token total in the plan (sum of lane `usage:` lines, plus this session's usage if the host shows it), report the phase in a few lines, and ask: next phase, stop, or change scope.
4. Recommend continuing in a **new session** ("resume `.plans/<feature-slug>.md`"). The plan holds all state, and a fresh parent stops every later turn from carrying the previous phase's diffs and handoffs.

## Phase 5 — Final acceptance

Once, after every phase is terminal. Heavy and Quick: one fresh reviewer that implemented and reviewed nothing, briefed with [`assets/agents/acceptance-reviewer.md`](assets/agents/acceptance-reviewer.md). Lite: the lane's reviewer already checked against the full requirements, so acceptance is that verdict. `Pending` reopens tracker rows; it never edits the merge.

## Phase 6 — Merge and prune

Only after acceptance is `Complete`. The parent runs this; it is a script, not a subagent.

1. Heavy only: write `docs/features/<feature-slug>.overview.md` from [`assets/merged-overview-template.md`](assets/merged-overview-template.md) and pass `--overview`.
2. `node scripts/merge-feature-docs.mjs docs/features/<feature-slug> --title "<Feature>" --requirements .plans/<feature-slug>.md [--overview docs/features/<feature-slug>.overview.md]`
3. Check the `.md` and `.html` exist and lose nothing material.
4. `--prune --dry-run`, confirm the list, then `--prune`. Delete the overview scratch file.

## Validation

- `node --test scripts/orchestrate-feature.test.mjs` passes.
- Every tracker row `Verified` or user-approved `Descoped`; every QA block `Clear`; acceptance `Complete`.
- Merged Markdown and HTML exist; per-subtask docs pruned or retained with a reason.

## Report

Plan path · profile · phases done vs. remaining with token totals · routing used · lanes with engine/model/review level/QA outcome/tokens · checks run and skipped · security findings and dispositions · acceptance verdict · merged doc paths · retained resources · what remains open.
