# Fix duplicate web image paste

- [x] Find the duplicate paste event path and confirm the root cause
- [x] Add a failing regression test
- [x] Implement the smallest fix
- [x] Run focused tests and quality checks
- [x] Add review and test notes

## Review

- Root cause: browsers can expose one clipboard image through both `items` and
  `files` as separate `File` objects. Reference equality did not remove the
  duplicate.
- Fix: compare stable file metadata before adding the `files` fallback.
- Verification: typecheck, focused ESLint, 21 ChatInput tests, and diff checks
  pass.
