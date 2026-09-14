# Resolve merge conflicts

- [x] Inspect the active Git operation and both conflicting files.
- [x] Compare the skill scanner implementations and tests from both sides.
- [x] Resolve and stage `.ai/todo.md` and `jean-core/src/projects/commands.rs`.
- [x] Continue the merge and resolve any additional conflicts.
- [x] Run focused verification and confirm the branch is ready to push.

## Review

- `.ai/todo.md` contained two stale task records. It now contains only this
  conflict-resolution task, as required by the repository workflow.
- `jean-core/src/projects/commands.rs` used two implementations of the same
  nested skill discovery fix. Kept the `origin/main` implementation because it
  has clearer error logging and broader tests, including symlinked skill files.
- The merge completed without more conflicts. The branch is three commits ahead
  of `origin/main` and has no local changes.
- Verification passed: five focused skill-discovery tests, Rust formatting,
  Clippy with warnings denied, and `git diff --check`.
