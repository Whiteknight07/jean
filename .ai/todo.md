# Combined dashboard server sections

- [x] Group projects by server when the All servers filter is active.
- [x] Replace repeated project server badges with one server section title.
- [x] Add regression tests and run quality checks.
- [x] Style and align the server filter with Jean controls.

## Review

- The combined view keeps the local `Projects` section and adds one separated
  uppercase section for each remote server.
- Project rows no longer repeat the remote server name badge.
- Focused tests, TypeScript checks, lint, and diff checks pass.
- The server filter now uses the standard Jean select and aligns with section
  titles on the same 12 px left edge.
