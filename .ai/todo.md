# Fix cancelled prompt draft restoration

- [x] Trace cancellation and draft restoration.
- [x] Add a failing regression test.
- [x] Apply the minimal fix.
- [x] Run focused and full verification.
- [x] Search related GitHub issues and discussions.
- [x] Record review results.

## Review

- Root cause: the cancellation handler restored sent text and attachments when no assistant output was visible, even after execution had started (`undo_send: false`).
- Fix: restore sent text and attachments only when `undo_send` confirms that execution did not start.
- Regression coverage checks both sides: a started run restores nothing; an unstarted run restores both text and image attachments.
- Related resources: closed issue https://github.com/coollabsio/jean/issues/671 and merged PR https://github.com/coollabsio/jean/pull/717. No matching discussions were found.
- Verification: focused Vitest passed (25 tests); `bun run check:all` passed (310 TypeScript test files / 2209 tests, 1167 jean-core tests with 1 ignored, 13 Tauri tests).
