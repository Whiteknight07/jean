# Stop the feature tour cache race

- [x] Add a failing test for the stale preference cache.
- [x] Update client preferences in the query cache before close.
- [x] Run focused tests and quality checks.
- [x] Record review results.

## Review

- Root cause: the dismissal was persisted, but the preferences query cache still held `false` long enough for the startup effect to reopen the tour.
- Fix: client preference patches now update the shared preferences cache before the mutation runs.
- Regression coverage verifies the seen flag changes synchronously, before startup effects can run again.
- Verification: Prettier, ESLint, TypeScript, and 39 focused tests passed.
