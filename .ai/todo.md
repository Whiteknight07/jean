# Remove duplicate desktop header badges

- [x] Add a failing regression test for the desktop header.
- [x] Remove Issues, Pull Requests, and Workflows from the header only.
- [x] Verify the menu entries remain and run focused quality checks.
- [x] Record review and test steps.

## Review

- Removed the Issues, Pull Requests, and Failed Workflows badges from the desktop chat header.
- Kept all three status entries and counts in the worktree actions menu.
- The 10 focused tests and ESLint passed.
- Full TypeScript verification is blocked by an unrelated duplicate property in `src/hooks/use-command-context.ts:1007`.
- No Jean run environment is available for this repository, so live UI verification was not possible.

## Prevent clearing a running session context

- [x] Guard the command palette and clear handlers while the current session runs.
- [x] Reject running-session clears at the backend boundary.
- [x] Add regression coverage and run focused checks.

### Review

- Clear Context is hidden in the command palette while the selected session runs.
- Event and direct command paths show an informational message instead of clearing.
- The backend rejects race conditions or callers that bypass the frontend.
- Focused tests, TypeScript, ESLint, Rust formatting, and Rust compilation passed.
