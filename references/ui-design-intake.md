# UI design intake

Run this before writing clarification questions whenever the feature renders anything a user sees. Never invent a visual language, and never let a lane pick sizes by copying the nearest component.

## 1. Find the source

Stop at the first real one:

- A design file the user named (Figma link, frames, screenshots).
- Design docs: `docs/design*`, `DESIGN.md`, `STYLEGUIDE.md`, `design-system/`, `.storybook/`.
- Tokens and theme: `tailwind.config.*`, `theme.*`, `tokens.*`, CSS custom properties, `_variables.*`.
- Component library: `components/ui`, shadcn/Radix/Vuetify/PrimeVue/Element, UI deps in `package.json`.
- Precedent: the two or three closest existing screens.
- UI sections of `CLAUDE.md`, `AGENTS.md`, `.cursor/rules`.

**A design file beats precedent for sizes, type, spacing, and colour.** Precedent still decides component reuse and behavior. Reusing an existing component's sizing when the design says otherwise is how a run ends up restyling everything in a later phase.

## 2. Extract a design spec once

When a design file exists, measure it **once**, before any lane, into `.plans/<feature-slug>.design-spec.md` (or `.tsv` for large tables):

| Surface / component | Element | Size (w×h, padding, gap) | Type (family, size, weight, line-height) | Colour (token or hex) | Radius / border | States |
|---|---|---|---|---|---|---|

- One row per element that a lane will build. Use the project's token name when one matches; flag values with no token.
- Do the extraction on the cheapest capable model (or the parent while it already has the design open). It is measurement, not design.
- Every UI lane's context pack points at the spec rows it builds, and the lane builds **to the spec**, not to precedent.

No design file → do not invent one. Ask with options:

- **A — Match precedent.** Name the closest screen and mirror it. Default whenever UI exists.
- **B — Library defaults.** Name the installed library and use its conventions.
- **C — Minimal system.** Propose a concrete token set in the question; write it to `docs/design/tokens.md` if chosen.
- **D — User supplies** a design link, screenshot, or brand guide.

## 3. Decide density and layout up front

Undecided layout details cause rework once real data appears. Put these in the clarification gate as one grouped question, with a proposed default for each:

- What each item shows: which fields, badges, icons, markers, counts, metadata, and what is hidden.
- Default state of each collapsible area, tab, or section (open/closed, which tab first, what scope is pre-selected).
- Widths and proportions of panels, columns, sidebars; behavior when content overflows (truncate, wrap, scroll).
- Empty, loading, error, and success states that apply.
- Smallest supported viewport, and the accessibility floor: keyboard reachability, visible focus, labeled controls, WCAG AA contrast.

Record the answers in the design spec.

## 4. Carry it into the lane

Every UI subtask assignment names: the spec path and rows, the components to reuse, tokens instead of literals, the required states, and the accessibility floor.

## 5. Checks and the one design audit

- Per lane: deterministic checks only where available (spec values present in the code, design-lint or detector output, visual parity hashes). A UI lane's reviewer checks against the spec, not taste.
- **One design audit**, at the checkpoint of the last phase that changes UI: render each surface and compare it with the spec (screenshots, detector, spec-value diff). Record the result in the plan. Audit-driven fixes go into one polish lane, not one lane per finding.
