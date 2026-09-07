# Clarification brief

One message, every open question, sent before any planning or code. Delete sections that genuinely do not apply — do not pad, and do not soften a real gap into a silent assumption.

Rules for using this template:

- Number every question so the user can answer `3 — yes, 4 — option B`.
- Mark each `[Blocking]` or `[Non-blocking]`. Blocking questions stop the run; non-blocking ones get a stated default.
- Propose a default only where you would otherwise have to guess. Write it as `Default if unanswered: ...`.
- Never ask something the repository already answers. Look first, then ask.

---

## Understanding so far

**Goal:** <one sentence, in the user's terms>

**In scope:** <bulleted behaviors>

**Out of scope (assumed):** <bulleted — confirm these too>

**What I found in the repository:** <exact paths, existing patterns, precedent, constraints>

## Questions

### Scope and behavior
1. `[Blocking]` <the outcome that changes the design if answered differently>
2. `[Blocking]` <the edge case with no obvious right answer>
3. `[Non-blocking]` <...> Default if unanswered: <...>

### Data and persistence
4. New tables or columns, or reuse of existing ones? Migration needed on populated data?
5. What happens to existing records when this ships? Backfill, ignore, or block?
6. Retention, soft delete, or audit trail for anything personal?

### Interfaces and contracts
7. Is any public API, event, or response shape changing? Who consumes it?
8. Versioning or backward compatibility required?

### Access and permissions
9. Who can do this? Which roles, and what does an unauthorized caller see?
10. Anything here that must be audited or logged?

### UI (only when the feature renders something)
11. Design source: <what was found>, or the option list from `ui-design-intake.md`.
12. Required states: empty, loading, error, success — which apply?
13. Smallest supported viewport, and the accessibility floor.

### Integration and environment
14. Third-party services involved? Sandbox credentials available, or should the lane mock them?
15. Feature-flagged, or shipped on?
16. Which environments does this land in, and in what order?

### Validation
17. What must be true for you to call this done?
18. Existing test suite and command to run it: <what was found — confirm>
19. Anything that must be verified manually because it cannot be automated?

### Constraints
20. Deadline, performance budget, or anything explicitly forbidden?
21. Anything I am allowed to assume rather than ask about next time?

## What I will not do without an answer

<list the blocking questions by number and what each one gates>
