<!-- Front matter for the merged document. The merge script prepends this and appends each subtask doc as a section. Write it before running the merge; the script does not invent it. Heavy runs only. Save as docs/features/<feature-slug>.overview.md and pass it with --overview. -->

# <Feature name>

- **Shipped:** <date>
- **Plan:** `.plans/<feature-slug>.md`
- **Subtasks merged:** <n>

## Summary

What now exists and what a user or caller can do that they could not before. Three to six sentences, no diff talk.

## Requirements and how they were met

| ID | Requirement | Met by | Evidence |
|---|---|---|---|
| R01 | | T01, T03 | <test or path> |

## Architecture

How the pieces fit: entry points, the path through the system, the data touched, the contracts exposed. Name real files. A reader should be able to find the code from this section alone.

## Security posture

Triggers that applied, what protects each one, and where it is enforced. Findings raised during the run and how they were closed.

## Testing

What is covered, at which layer, and the command to run it. What is deliberately not covered and why.

## Operating notes

Configuration, environment variables by name (never values), migrations, feature flags, rollback path, and anything that needs watching after release.

## Known limitations and follow-ups

- <deferred item — why, and what would trigger doing it>

---

<!-- Per-subtask sections are appended below by scripts/merge-feature-docs.mjs. -->
