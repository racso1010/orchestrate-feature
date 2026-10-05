# Clarification brief

One message, every open question, before any plan or code.

- Look in the repository first. Never ask what it already answers.
- Ask only what changes the design or the acceptance test. Lite: at most ~8 questions. Quick: ~12.
- Number every question so the user can reply `3 — yes, 4 — B`. Mark each `[Blocking]` or `[Non-blocking]`, and give non-blocking ones `Default if unanswered: …`.
- Never soften a real gap into a silent assumption.

```text
## Understanding so far
Goal: <one sentence, user's terms>
In scope: <behaviors>
Out of scope (confirm): <…>
Found in the repo: <paths, precedent, test command, constraints>

## Questions
1. [Blocking] <…>
2. [Non-blocking] <…> Default if unanswered: <…>

## Blocked until answered
<question #s and what each gates>
```

Topics to scan for gaps. Ask only the ones that apply:

- **Scope and behavior**: outcome-changing choices, edge cases with no obvious answer.
- **Data**: new vs existing tables, migration on populated data, existing records, retention/audit.
- **Contracts**: public API/event/response changes, consumers, versioning.
- **Access**: who can do it, what an unauthorized caller sees, audit logging.
- **UI**: design source, and the **density and layout** group from `ui-design-intake.md` §3 (what each item shows, default open/selected states, widths, overflow, states, viewport, accessibility). Ask it as one grouped question with defaults.
- **Integration**: third-party services and sandbox credentials vs mocks, feature flag, environments.
- **Validation**: what "done" means, anything that must be checked manually.
- **Constraints**: deadline, performance budget, forbidden approaches, what may be assumed next time.
