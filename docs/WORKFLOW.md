# orchestrate-feature — workflow guide

How one feature moves through the skill, what you (the user) are expected to provide, where the tokens go, and how to spend fewer of them. [`SKILL.md`](../SKILL.md) is the source of truth. This page explains it and doesn't override it.

## 1. The workflow of one feature

The **parent** (the session you talk to) owns the requirements, plan, tracker, decisions, acceptance, merge and all communication with you. **Children** (fresh subagent sessions) produce evidence only, never acceptance.

```
request ─► [1 Clarify] ─► [2 Route] ─► [3 Plan phase N] ─► [4 Lane loop] ─► phase checkpoint
                                              ▲                                   │
                                              └────── next phase (placeholder) ◄──┘
                                                                                   │ all phases done
                                                          [5 Acceptance] ─► [6 Merge + prune]
```

| # | Stage | Who acts | Output | Waits for you? |
|---|---|---|---|---|
| 0 | **Startup** — reads [`execution-profiles.md`](../references/execution-profiles.md), [`clarification-brief.md`](../assets/clarification-brief.md), [`model-routing.md`](../references/model-routing.md); picks **Lite**, **Quick** or **Heavy** | parent | profile recorded | no |
| 1 | **Intake and clarification gate** — reads repo instructions and relevant code, drafts requirements, sends **one** numbered question list marked `Blocking` / `Non-blocking` (UI features first run [`ui-design-intake.md`](../references/ui-design-intake.md)) | parent | Requirements section, answers recorded verbatim | **yes** |
| 2 | **Model-routing gate** — one message asking for engine/model per role: planning, implementer, QA reviewer, security auditor, acceptance reviewer; plus overrides and caps. A saved `.plans/routing.md` turns this into one yes/no | parent | routing table | **yes** (Quick may combine with stage 1) |
| 3 | **Plan** — writes `.plans/<feature-slug>.md` from [`feature-plan-template.md`](../assets/feature-plan-template.md). Only the current phase is split into subtasks; later phases stay one-line placeholders. May recommend a code-index tool (e.g. graphify) | parent | plan + tracker rows | **yes** — phase sign-off (Heavy always; Quick unless trivial) |
| 4 | **Lane loop** — per subtask, per [`lane-protocol.md`](../references/lane-protocol.md): Assign → Implement → QA → Security → Disposition → Verify and integrate → Clean up | children + parent | `.plans/lanes/<id>.md`, `docs/features/<slug>/<id>-<slug>.md` with QA verdict block | only on `Ask user`, repeated failures, or a blocker |
| 4b | **Phase checkpoint** — phase reported with evidence; the next placeholder is expanded (back to stage 3) only if you approve | parent | updated plan | **yes** |
| 5 | **Final acceptance** — once, after all phases are terminal; a fresh reviewer that built and reviewed nothing compares every lane doc with the requirements | child | `Complete` or `Pending` + exact gaps | no (`Pending` reopens rows) |
| 6 | **Merge and prune** — writes an overview (Heavy only), runs `scripts/merge-feature-docs.mjs` to produce `docs/features/<slug>.md` + `.html`, dry-runs the prune, then deletes per-subtask docs | parent (script) | merged Markdown + standalone HTML | confirm prune list |

### Inside one lane

1. **Assign** — the parent fills [`subtask-assignment.md`](../assets/subtask-assignment.md) plus a role profile from [`assets/agents/`](../assets/agents/). The child gets its objective, the requirement lines verbatim, the files to read first, a **context pack** (path:line pointers the parent already found, so it doesn't re-explore), its owned paths, non-goals, a test target, the checks to run, its doc path and a timeout. It never gets the whole plan, other lanes, secrets or the transcript.
2. **Implement** — clarify or block first, then make the smallest change, add tests, run lint/typecheck/build, and write the lane doc from [`feature-doc-template.md`](../assets/feature-doc-template.md). No commits, branches or delegation.
3. **QA** — a fresh, read-only reviewer checks the requirements against the diff, doc/code drift, test quality and scope, using the implementer's reported test output instead of rerunning it. On **risky lanes** (auth, payments, migrations, data writes, security triggers) it also runs a **behavioral check**: driving the real app/CLI/API, trying adversarial input, or reverting the fix to confirm the test goes red. It appends a block from [`qa-report-template.md`](../assets/qa-report-template.md).
4. **Security** — [`security-gates.md`](../references/security-gates.md) applies when the lane touches input, auth, data access, file/network I/O, config, dependencies, and so on. Findings go in the same block.
5. **Disposition** — the parent decides on each finding. `Fix now` **resumes the same implementer session** with the pending list, then a scoped re-review checks only those findings.
6. **Integrate** — the parent reads the diff stat and handoff, opens the full diff only where review flagged risk, integrates, and records evidence. The full suite and one behavioral check of the composed path run **once per phase** at the checkpoint, not per lane.
7. **Clean up** — no leftover worktrees, branches or processes.

### States and verdicts

- **Tracker row:** `Pending` → `In progress` → `In QA` → `Fixing` → `QA clear` → `Verified` (at the phase checkpoint), or `Blocked` / `Descoped`.
- **QA verdict:** `Clear` · `Changes required` · `Human decision required` · `Blocked`.
- **Parent disposition:** `Fix now` · `Validate` · `Reject` · `Ask user` · `Block`.
- **Security severity:** Critical / High block the lane and can't be `Reject`ed without your recorded approval; Medium → `Fix now` or `Ask user`; Low → `Validate` or `Reject` with reason.
- **Stop rule:** two failed QA rounds, a recurring finding, or no progress → the parent stops and asks you.
- **Run endings:** `Complete`, `Partial`, `Blocked`. `Complete` is never faked.

### Lite vs Quick vs Heavy

| | Lite | Quick | Heavy |
|---|---|---|---|
| Size | exactly 1 subtask, one layer, few files | 1–3 subtasks, one layer | 4+ subtasks, or crosses layers/services, or touches migration, public contract, auth or payments |
| Gates | questions (≤ ~8) + routing + plan outline in **one** turn; your reply is the sign-off | clarification + routing may share one turn | separate turns, explicit plan sign-off |
| Lanes | one lane | sequential, same checkout | parallel isolated worktrees (cap ~3) |
| Review | one combined QA + security reviewer | one combined QA + security reviewer | QA + separate security auditor lane on triggers, checkpoint reviews |
| Merge | no overview file | overview + merge | overview + merge |

If it's unclear between Lite and Quick, the skill picks Quick; between Quick and Heavy, it picks Heavy. Final acceptance runs in every profile.

## 2. What you are expected to provide

| When | What you give |
|---|---|
| **Before you start** | Node.js, a git repo, an AI coding tool that can launch subagents. For cross-vendor routing: `codex` / `cursor-agent` / `claude` CLI installed and logged in (`node scripts/run-lane.mjs --check`). |
| **Kickoff** | The feature request. You'll get fewer questions if it includes: the outcome, what's in and out of scope, what "done" looks like, and the test command. Anything you leave out becomes a question — the skill never assumes. |
| **Clarification gate** | Answers by number (`1 — yes, 3 — option B`). Every `Blocking` question must be answered. Optionally list things the skill may assume next time. |
| **Routing gate** | A model per role, or reply "defaults" / "you decide" (the parent then records its choice and reasoning). Optional per-subtask overrides and per-lane time or budget caps. |
| **Plan sign-off** | Approve the phase 1 subtasks; yes/no on installing a code-index tool. |
| **During lanes** | Decisions on `Ask user` findings (scope, risk, cost, product), approval for any permission-bypass flag, approval before a High/Critical security finding is rejected. |
| **Each phase checkpoint** | Continue to next phase / stop / change scope. |
| **End** | Confirm the prune delete list. Read the merged `docs/features/<slug>.md` / `.html`. |

## 3. Token-cost review

### Where the tokens go (largest first)

1. **Cold-start children.** Every lane (implementer, QA, security, fix, acceptance) is a fresh session that re-reads and re-explores the repo. With QA re-rounds, a 3-subtask feature easily means 8–12 cold starts.
2. **Separate QA and security sessions** on the same diff, each reading the diff, the doc and the requirements.
3. **Fix loops.** Every `Fix now` is a new implementer lane plus another QA run.
4. **Parent verification.** Reading the full diff and rerunning all checks after every lane.
5. **Acceptance** reads every lane doc and the whole requirements table.
6. **Gate overhead.** The clarification brief has 21 template questions; routing always asks about 6 roles; templates are re-read each phase.
7. **Documentation.** Every lane doc, every QA block, an overview, then a merge pass.

The phased-planning rule (later phases stay placeholders) already stops the biggest planning waste. The remaining waste is almost all in **lanes**.

### Cuts

Applied: #1–#8 and #10–#22. #9 is superseded by #21 (code index is opt-in).

| # | Change | Where | Expected effect |
|---|---|---|---|
| 1 | **Applied — context pack in the lane brief.** The parent lists path:line pointers to the symbols, callers, nearest tests, conventions and commands it already found. Lanes don't explore beyond it unless it's insufficient, and must name any extra files. | `assets/subtask-assignment.md`, `assets/agents/implementer.md`, `references/lane-protocol.md` | Largest single win: removes most per-lane re-exploration |
| 2 | **Applied — combined QA + security reviewer** on Lite and Quick runs: one read-only session applies both checklists. Critical/High findings, or auth/payments/migration lanes, force a separate auditor for re-review. | `references/execution-profiles.md`, `references/lane-protocol.md`, `assets/agents/qa-reviewer.md` | −1 session per triggered lane |
| 3 | **Applied — saved routing presets.** Store the routing table in `.plans/routing.md`; the gate becomes "reuse saved routing? y/n" | `references/model-routing.md` | One fewer long exchange per run |
| 4 | **Applied — trimmed clarification brief.** Include only sections that apply; cap Quick runs at ~8 questions | `assets/clarification-brief.md` | Shorter gate message and answers |
| 5 | **Applied — "Lite" profile** for one-subtask changes: one gate turn, implementer + one combined reviewer + acceptance, no overview file | `references/execution-profiles.md`, `SKILL.md` | Roughly halves small-change cost |
| 6 | **Applied — cheaper model tiers by default.** Doc merge = script only (no LLM); QA on a cheaper model; keep acceptance strong | `references/model-routing.md` | Lower price per token on high-volume seats |
| 7 | **Applied — compact handoffs.** Cap handoff and doc length; the parent reads the diff stat and failing output first, full diff only where needed | `assets/subtask-assignment.md`, `lane-protocol.md` | Less parent context growth |
| 8 | **Applied — lazy template reads.** Read each asset right before its stage, not at startup | `SKILL.md` Blocking startup | Smaller parent context early |
| 9 | **Default code-index recommendation** (e.g. graphify) for repos above a size threshold, shared by all lanes | `SKILL.md` Phase 3 step 6 | Cheaper exploration across lanes and phases |
| 10 | **Applied — fix rounds resume the implementer** (`run-lane.mjs --resume`, or the native subagent's continue); re-review is scoped to the findings | `lane-protocol.md`, `run-lane.mjs` | −2 cold sessions per fix round |
| 11 | **Applied — lean claude lanes**: `--strict-mcp-config --disable-slash-commands` | `run-lane.mjs` | Measured 19,424 → 13,528 input tokens per lane turn (−30%) |
| 12 | **Applied — each check runs once**: implementer runs lane tests; reviewer reads the output; parent runs the full suite once per phase; behavioral check per phase plus risky lanes | `lane-protocol.md` "Who runs what" | Lane-check runs on a 3-subtask Quick run: 18 → 7 |
| 13 | **Applied — new parent session per phase**, resumed from the plan file | `SKILL.md` Phase 4 checkpoint | Parent stops carrying earlier phases' diffs |
| 14 | **Applied — slimmer docs**: lane doc 4 sections, QA block 5 lines + findings table, overview Heavy-only, no merger role, Lite acceptance folded into its reviewer | `assets/*`, `execution-profiles.md` | Output scaffold −51%; −1 session on Lite |
| 16 | **Applied — design spec first**: measure the design file once into `.plans/<slug>.design-spec.md`, build every UI lane to it, ask density/layout questions at the gate, one design audit at the end | `ui-design-intake.md`, `clarification-brief.md` | Avoids a restyle phase (≈8–10M on the kaseya-numbers run) |
| 17 | **Applied — review level per lane** (`checks` / `combined` / `full`) by risk, not by profile | `lane-protocol.md`, `execution-profiles.md` | No reviewer on styling/repeat lanes; full review on auth, input, first-of-pattern |
| 18 | **Applied — pattern groups**: repeats share one lane or continue the pattern-setter's session | `lane-protocol.md`, `implementer.md` | Repeats stop re-learning the pattern |
| 19 | **Applied — environment check** before the first lane, recorded in the plan; lanes block on env errors instead of working around them | `SKILL.md` Phase 3 | Avoids blocked lanes such as host-vs-container `node_modules` |
| 20 | **Applied — rate limits**: fewer parallel lanes near limits; interrupted lanes resume (`run-lane` prints the session id and a hint) | `execution-profiles.md`, `run-lane.mjs` | Partial runs are no longer thrown away |
| 21 | **Applied — model tiers per subtask** (`top` / `mid`), cheapest model for extraction; code index opt-in only | `model-routing.md`, `SKILL.md` | Lower price on repeat work; no unused index |
| 22 | **Applied — short orchestrator turns and per-phase token totals** in the plan | `SKILL.md`, plan template | Smaller main conversation; spend visible during the run |
| 15 | **Applied — usage logging**: `run-lane.mjs` prints `usage: in= out= cost= session=` for claude lanes; tracker has a Tokens column | `run-lane.mjs`, plan template | Real per-role spend is visible on every run |

Don't cut these, because they're what makes the output trustworthy: fresh-session QA, at least one behavioral check per phase, security triggers, and the final acceptance reviewer (folded into the single reviewer on Lite).

## 4. Jev (TypeSafe AI) — can it be used here?

Sources: [introduction](https://docs.typesafe.ai/introduction), [Jev with coding agents](https://docs.typesafe.ai/introduction/coding-agents.md), [agent skill](https://docs.typesafe.ai/agent-skill.md), [Jev 1.13 limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13.md).

**What it is.** Jev is a "System One" decision model behind a single HTTP endpoint (Python/JS SDKs, `TYPESAFE_API_KEY`). You send it state plus typed questions: **Choice** (pick an option), **Score** (grade against a rubric), or **Noul** (probability a statement is true). It returns probabilities and a confidence value. It doesn't generate text or code. TypeSafe's own docs say it is *not* a drop-in replacement for the LLM behind Claude Code, Cursor and similar tools. Its agent skill teaches coding agents to build Jev calls *into applications*.

**Verdict: it can't meaningfully cut this skill's token spend.** The cost sits in implementer, QA, security and acceptance lanes. Those need code generation and multi-step reasoning over diffs, which Jev 1.13 lists as weak spots: multi-hop reasoning, counting and arithmetic, dates, and accuracy dropping when state is large and unfiltered.

**Where it could fit (optional experiment, small wins):** bounded classification steps the parent LLM does today:

- **Profile choice** — Choice (Quick / Heavy) over the request summary and touched-path list.
- **Security-trigger detection** — a batch of Noul questions, one per trigger in `security-gates.md`, over owned paths and the diff stat.
- **QA finding admission filter** — Score each finding on concrete / reachable / impactful.
- **Confidence-gated routing** — high confidence → lighter review path; low → full lane.

**Caveats.** Each of these saves only a few hundred parent tokens, while adding a vendor, an API key and a network dependency. It would also send code metadata to a third party, which clashes with the skill's "paths and facts only" safety rule. A false "no trigger" answer quietly weakens the security gate, so Jev should only ever *add* reviews, never skip them.

**Recommendation.** Keep Jev out of the core skill. Better uses:
1. Experiment with it as a security-trigger / profile pre-filter that can only escalate.
2. Treat it as a **product capability** for apps built *with* this skill. When a feature needs routing, scoring or yes/no judgments, the clarification gate can ask whether to use Jev, and lanes can install the TypeSafe agent skill.

The real token savings come from the cuts in section 3. All except #9 are applied. Use the tracker's Tokens column to confirm savings on real runs.
