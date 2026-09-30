# AGENTS.md

Guidance for coding assistants working on this repository. Read [docs/architecture.md](docs/architecture.md) first; the other files in `docs/` cover each subsystem.

## Invariants

- **Anonymity.** Public API responses, realtime events, push payloads and client-facing errors never include real identity: no author or owner ids, no IPs. Staff data goes only through `/api/moderation/*` routes that check role, and identity for admin content.
- **Layers.** `lib/` is isomorphic, `server/` is server-only, `features/` and `hooks/` are client code, `components/` is UI, `app/` holds routes. ESLint enforces the allowed imports; do not work around it.
- **Language.** UI text, user-facing API errors and documentation (README, `docs/`, other Markdown, config examples) are Spanish (rioplatense, voseo). Code, identifiers, code comments and tests are English.
- **Colors** come only from theme tokens (`docs/theming.md`); `tests/policy/themeTokenUsage.test.ts` has no exceptions.
- **Comments** only for a non-obvious _why_, in one to three lines. No history, no narration.

## Commands

```bash
npm run dev:demo     # UI against MSW mocks, no services
npm run validate     # format check, lint, typecheck, unit tests
npm run knip         # unused files, exports and dependencies
npm run test:visual  # Playwright against the demo (screenshots are local, not committed)
npm run build
npm run theme:css    # after changing lib/theme/builtinThemes.ts
```

Android: `cd android && ./gradlew :app:testDebugUnitTest :app:assembleDebug`.

## Working rules

- Keep changes scoped to the request. Give dialogs, forms and sizeable blocks their own component file instead of growing pages or views.
- Pure logic goes next to a `*.test.ts`. Behavior changes need tests; run `npm run validate` before finishing.
- Imports use `@/`, no barrel files. The browser calls the API only through `features/http/apiClient.ts` and `features/*/api.ts`.
- Route handlers validate, delegate to `server/`, and answer with `server/http/apiErrors.ts`.
- New realtime events go in `lib/realtime/rooms.ts` (shared with the Worker). New browser origins go in `lib/http/contentSecurityPolicy.ts` and its test. New signed-in write endpoints get a rate limit in `server/http/userActionRateLimit.ts`.
- Migrations must work with the previous app version still running.
- Update the relevant file in `docs/` (in Spanish) when a change alters what it describes.

## Traps

- Do not add `relative` to Radix `DialogContent` (`components/ui/dialog.tsx`): it overrides `fixed` and moves the modal. Put positioning and drop handlers on an inner wrapper.
- Staff `DropdownMenu`s are `modal={false}`: a modal menu that closes in the same tick a dialog opens leaves `pointer-events: none` on `body`.
- File inputs have no `accept` attribute, and no upload step may require reading the file in JavaScript. See `docs/media-pipeline.md`.
- The Android WebView lacks `navigator.share` and paints nothing for a `<video>` that never played; test media and sharing changes there.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
