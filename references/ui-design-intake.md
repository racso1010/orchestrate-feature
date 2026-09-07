# UI design intake

Run this before writing clarification questions whenever the feature renders anything a user sees. Never invent a visual language.

## 1. Look first

Search the repository in this order and stop at the first real source:

- Design docs: `docs/design*`, `docs/ui*`, `DESIGN.md`, `STYLEGUIDE.md`, `BRAND.md`, `design-system/`, `.storybook/`
- Tokens and theme: `tailwind.config.*`, `theme.*`, `tokens.*`, CSS custom properties, `variables.scss`, `_variables.*`
- Component library: an existing `components/ui`, a shadcn/Radix/Vuetify/PrimeVue/Element setup, UI dependencies in `package.json`
- Precedent: the two or three closest existing screens or components to what is being built
- Agent instructions: UI sections of `CLAUDE.md`, `AGENTS.md`, `.cursor/rules`

Record what you found with exact paths. Precedent components count as a design source — match them.

## 2. When nothing exists

Do not pick a look silently. Ask, and make answering cheap by offering options:

- **A — Match precedent.** Name the closest existing screen and mirror its spacing, type scale, and component choices. Default whenever any UI exists.
- **B — Adopt the installed library's defaults.** Name the library found in `package.json` and use its unmodified conventions.
- **C — Minimal system.** Propose a concrete token set in the question itself (type scale, spacing step, radius, two or three semantic colors, one font stack), and write it to `docs/design/tokens.md` if chosen.
- **D — User supplies.** They paste a Figma link, screenshot, or brand guide.

Include the accessibility floor in the same question so it is decided once: keyboard reachability, visible focus, labeled controls, WCAG AA contrast, and behavior at the project's smallest supported viewport.

## 3. Carry it into the lane

Every UI subtask assignment must name: the design source and its path, the components to reuse, the tokens to use instead of literal values, the responsive breakpoints, the empty/loading/error/success states required, and the accessibility floor.

## 4. QA checks

The QA reviewer for a UI lane verifies against the named source, not against taste: tokens used rather than hard-coded values, existing components reused rather than reimplemented, all required states present, keyboard path works, focus visible, contrast meets the floor, and no layout break at the smallest supported width. Screenshot or rendered evidence beats a claim.
