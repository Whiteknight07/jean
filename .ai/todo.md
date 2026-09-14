# Mobile magic menu layout

- [x] Add a regression test for the mobile full-width, two-column layout.
- [x] Make the mobile menu full width with two command columns.
- [x] Run focused tests and quality checks.
- [x] Record review results.

## Review

- The mobile Magic menu now uses the viewport width with a small edge margin.
- Commands use two columns. Section labels and separators span both columns.
- The desktop menu keeps its existing single-column width.
- Verification passed: focused tests, TypeScript, ESLint, diff checks, and all 2,289 frontend tests.

## How to test

- Open a session on a mobile viewport and tap the Magic wand in the bottom toolbar.
- Confirm that the menu fills the screen width with a small margin and shows commands in two columns.
- Confirm that section labels and separators remain full width and that each command still runs.
