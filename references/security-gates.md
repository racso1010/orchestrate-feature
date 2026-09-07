# Security gates

Contents: [Triggers](#triggers) · [Universal checks](#universal-checks) · [By surface](#by-surface) · [Stack notes](#stack-notes) · [Severity and disposition](#severity-and-disposition) · [Reporting](#reporting)

Security review is a gate on the lane, not a final sweep. Run it while the lane is still open and cheap to fix.

## Triggers

Run the gate on any subtask that touches: user or third-party input · authentication, sessions, tokens, or password flows · authorization and ownership checks · database queries or raw SQL · file upload, download, or path construction · outbound HTTP, webhooks, or callbacks · serialization, templating, or `eval`-like execution · secrets, environment, or configuration · new or upgraded dependencies · CORS, CSP, headers, or cookie flags · logging of request or user data · background jobs and queues consuming external payloads.

No trigger matched → record "no security trigger" in the tracker with the reason. Do not skip silently.

## Universal checks

- **Input** is validated server-side against an allowlist, at the trust boundary, with type, range, length, and format enforced. Client-side validation never counts.
- **Output** is encoded for its sink: HTML, attribute, URL, SQL, shell, JSON. Never one escaping function for every sink.
- **Authorization** is checked per object, not just per route. Every fetch-by-ID answers "does this caller own this row?" IDOR is the most common real finding in feature work.
- **Authentication** state is derived server-side; nothing trust-bearing arrives from the client.
- **Secrets** are absent from source, logs, error messages, fixtures, and client bundles.
- **Errors** fail closed. A caught exception never falls through to an authorized path.
- **Logs** carry no credentials, tokens, full PII, or request bodies containing either.
- **Dependencies** added in the lane are justified, pinned, and checked against a current advisory source.
- **Rate limiting and abuse**: any unauthenticated or expensive endpoint has a bound.

## By surface

**HTTP API** — verb and route match intent; mass assignment blocked by an explicit allowlist; response shape leaks no internal fields; CORS origins explicit, not reflected; CSRF protection present for cookie-authenticated state changes.

**Database** — parameterized queries only; no string-built SQL; migrations reversible and safe against a populated table; new columns holding personal data reviewed for retention.

**File handling** — extension and MIME allowlist plus size cap; stored outside the web root or behind an authorization check; generated filenames, never client-supplied paths; no user input in a filesystem path without normalization and containment.

**Frontend** — no `dangerouslySetInnerHTML` / `v-html` on untrusted content; tokens not held in `localStorage` when a cookie with `HttpOnly` and `SameSite` will do; no secrets in the bundle; URLs from data are scheme-checked before becoming `href` or `src`.

**Background work** — payloads treated as untrusted; retries idempotent; failures do not leak into a state that skips a check.

## Stack notes

- **Laravel** — Form Requests over inline validation; `$fillable` and `$guarded` deliberate; Policies or Gates on every model fetch; Eloquent bindings rather than `DB::raw` with interpolation; `@{{ }}` vs `{!! !!}` in Blade; queue payloads signed or validated; `config()` over `env()` outside config files, so cached config does not silently blank a value.
- **WordPress** — nonces on every state change; `current_user_can` on every privileged path; `$wpdb->prepare` always; `sanitize_*` on input and `esc_*` on output, matched to the sink; no direct `$_REQUEST` use; capability checks in REST callbacks, not only in the UI.
- **Vue / React / TypeScript** — validate at the API boundary even when the type says it is safe; a TypeScript type is not a runtime guarantee; server-side render paths escape by default only for text, not attributes.
- **MySQL / PostgreSQL** — least-privilege application user; indexes on the columns the new query filters by, so a security bound does not become a denial-of-service vector.

## Severity and disposition

| Severity | Meaning | Default disposition |
|---|---|---|
| Critical | remote exploit, auth bypass, data exposure | `Fix now`, lane cannot be `Verified` |
| High | exploitable with preconditions, or privilege escalation | `Fix now` |
| Medium | real weakness, limited reach or impact | `Fix now` or `Ask user` with a recorded reason |
| Low | hardening, defense in depth | `Validate` or `Reject` with a reason |

A Critical or High finding blocks the lane. It cannot be dispositioned `Reject` without explicit user approval recorded in the tracker.

## Reporting

Findings go in the lane's QA verdict block: severity, exact file and line, the concrete failure, realistic reachability, the smallest fix, and the check that proves the fix. No speculative findings, no padded lists — an unexploitable "issue" costs review attention that the real ones need.
