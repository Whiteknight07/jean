# Lessons

## Give repeated picker items unique values

- A command item value must include its stable resource ID, not only its display name.
- When several servers can contain the same project name, show the owning server in each result.
- Test duplicate display names because command-menu libraries can select every item with an equal value.

## Carry server ownership through path-only commands

- Composite IDs route only commands that include an ID. Git and GitHub commands often include only a repository path.
- Register paths at the server adapter boundary and route path-only commands through that owner.
- Include a composite owner ID in query keys and command arguments when the calling component has one.
- Build remote image URLs from the resource owner. Never use the legacy active-server URL for remote assets.
- Test persisted attachment URLs in both native and Web Access. Axum wildcard paths include a leading slash and must be normalized before joining them to app data.

## Separate connection availability from dashboard inclusion

- A server can remain selectable and connected while it is hidden from the combined dashboard.
- Apply dashboard inclusion only to aggregation. Do not remove the adapter or change the active legacy connection.

## Keep server ownership visible outside the sidebar

- In a combined dashboard, users must see the current resource owner in the persistent header.
- Show `All servers` when no project is focused, `Local` for legacy local IDs, and the remote profile name for composite IDs.

## Keep multi-server scope native-only

- Multi-server Jean aggregation is a native desktop client feature.
- Browser Web Access must use only the server origin that served the page.
- Gate connection managers, connection-profile reads, aggregation controls,
  caches, and cross-server routing with `isNativeApp()` and test both modes.

## Do not use a global backend switch in the multi-server client

- The native app must stay attached to its local Jean core.
- Treat remote profiles as parallel resource adapters, not alternate app backends.
- Keep server filters and per-action target selectors, but do not show global server switch actions.
- Show server ownership labels only in native multi-server UI. They are redundant in single-origin Web Access.

## Close startup UI atomically

- When a startup effect reads cached preferences, persist and update that cache before closing its modal.
- A durable write alone does not prevent an immediate reopen while the query cache still contains the old value.
- Test the close-to-reopen race, not only the persistence call.

## Keep dependent setup steps in one action

- When a feature is not usable until its MCP configuration is installed, make the primary install action complete both steps.
- Do not expose a second setup button when Jean can safely perform the dependent setup automatically.
- Update the default agent guidance when installation alone does not make agents discover the preferred use case.

## Make discovery output requirements explicit

- When a prompt requires GitHub discovery results, require a visible state for every issue, pull request, and discussion.
- Use open or closed for all results, and add merged for pull requests when applicable.

## Verify session creation semantics at the backend boundary

- Do not infer that an API named `start_background_investigation` creates a new session.
- Read the backend session-selection logic before wiring a UI action that promises a fresh session.
- Add a regression test for explicit fresh-session behavior instead of testing only that the menu callback fires.
- Check every responsive branch when adding an action. A mobile menu item does not make the action available on native desktop.
- Do not store one-shot investigation context under a worktree ID. Worktree-owned references leak into later sessions and cannot be removed from a session context menu.
- Do not open a worktree modal before an asynchronous session creator returns its session ID. Set the exact active session first, then open with an event that includes the worktree and session IDs.

## Keep task tracking proportional

- The project instructions require work to be tracked in `.ai/todo.md`, but do not expand it with excessive implementation detail.
- For small follow-up fixes, add only a short checklist and result instead of a long duplicate report.
- Explain that `.ai/todo.md` is internal task tracking when the user asks why it changes.

## Normalize backend tool vocabularies at the display boundary

- Do not assume similar tools share names or parameter casing across backends.
- Capture real stream events, map exact backend names and keys to Jean's common renderer contract, and keep an explicit readable fallback for known native tools.
- Test both live-looking tool inputs and persisted inputs so reload does not reintroduce unhandled labels.

## Wire backend capability semantics end to end

- A backend flag is not supported until the frontend selects the correct setting type and every send path forwards it.
- For persistent-only MCP backends, add discovery and installers, but do not show a per-session switch that the CLI cannot honor.
- Test the exact CLI value set and the generated persistent config, not only the low-level command builder.

## Do not confuse incomplete work with upstream limits

- When the user asks for production readiness, classify each gap as either implementable in Jean or unavailable in the external backend.
- Do not call work complete while implementable checklist items remain.
- Do not use an upstream limitation to excuse adjacent Jean work that is still possible.
- State verification limits separately from implementation limits.

## Verify product migrations against the current official CLI

- Do not treat an old package registry entry as proof that a product is still the supported user path.
- Check the official product site, migration guide, installer, release manifest, and downloaded binary help before designing an integration.
- Do not rename an integration while keeping the old transport assumptions. Reclassify the backend from its current documented protocol.
- Do not install similarly named third-party packages. For Antigravity, use Google's official native installer and release manifest, not the unrelated npm package.

## Register live and history parsers together

- A new streaming backend needs two parser paths: the live response parser and the run-log reconstruction parser.
- Route persisted runs by the per-run backend or model prefix before using a generic fallback parser.
- Test history reload with the backend's real NDJSON format. Live streaming success does not prove that the response survives a query refresh or app reload.

## Apply default prompts consistently across backends

- A `null` prompt preference means “use Jean's default,” not “omit the prompt.”
- When adding or changing a backend, verify that default, custom, and empty global prompts resolve consistently on every chat turn.
- Backend-specific mode instructions must augment the shared global prompt rather than replace it.

## Verify installed skill discovery in each harness

- Do not treat copied `SKILL.md` files as proof that a harness discovers or invokes them.
- Test the installed directory layout through each backend's real skill-listing path.
- Adapt backend-specific frontmatter and command syntax when an upstream pack targets one harness.
- Verify a representative workflow set, not only the pack's setup skill or source file count.
- Do not adapt an optional vendor configuration skill when the requested product is the workflow skill pack. Exclude the configuration skill and preserve the remaining upstream skills.

## Check Jean-managed tool locations before declaring tools unavailable

- A Jean-managed executable can be installed outside `PATH`.
- Inspect the Jean Settings status or known managed binary path before saying that a tool is not installed.
- If the binary exists, invoke it by its full path and distinguish “not on PATH” from “not installed.”

- For shortcut keycaps, do not assume Unicode modifier glyphs render in browser fonts. Use the explicit `Ctrl` label in web access and reserve `⌘` for native macOS.
