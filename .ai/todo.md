# Fix native Web Access crypto loading

- [x] Identify direct `crypto.randomUUID()` calls that bypass browser compatibility handling.
- [x] Add a regression test that rejects direct `crypto.randomUUID()` use.
- [x] Route all ID creation through the existing compatible `generateId()` helper.
- [x] Run the focused test and `bun run check:all`.
- [x] Record the result and test steps.

## Review

- Root cause: four frontend modules called `crypto.randomUUID()` directly. That API is not available in all Web Access contexts.
- Fix: all frontend ID generation now uses `src/lib/uuid.ts`, which has the existing fallback for contexts without `randomUUID()`.
- Regression coverage: `src/browser-crypto-compatibility.test.ts` prevents new direct calls outside the compatibility helper.
- Verification: focused regression test, TypeScript check, production build, and full `bun run check:all` passed.

## How to test

- Open native Jean and connect to a remote server through Web Access.
- Open the dashboard and confirm it loads without a `crypto.randomUUID is not a function` error.
- Open server features, Jean configuration, and project JSON settings to confirm generated rows work.
