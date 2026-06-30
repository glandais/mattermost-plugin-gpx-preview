# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Mattermost webapp-only plugin (based on `mattermost-plugin-starter-template`) that overrides the file preview for `.gpx` files. When a `.gpx` file is opened in Mattermost, it fetches the raw file content, POSTs it to an external map-rendering service (`https://gpx.tomacla.info/`), and shows the result in an iframe.

There is **no `server/` directory** — `plugin.json` only declares a `webapp` section, so `HAS_SERVER` is empty and the Makefile/CI skip all Go plugin-server steps. The Go code that does exist (`build/`) is only the starter-template's build tooling (manifest parser, pluginctl), not the plugin's own server logic; it lives in the single root `go.mod`/`go.sum` (no separate `build/go.mod` — that split was removed upstream). Do not add Go server code unless explicitly asked — it would require updating `plugin.json` and `go.mod` (still named `mattermost-plugin-starter-template`, never renamed for this project; renaming it also requires updating `.golangci.yml`'s `goimports.local-prefixes`).

## Commands

All webapp commands run from `webapp/`:

```
npm install          # install deps (also done automatically by `make`)
npm run build        # production webpack build -> webapp/dist/main.js
npm run debug        # unminified build (mode=none)
npm run lint         # eslint over .js/.jsx/.ts/.tsx
npm run fix          # eslint --fix
npm run check-types  # tsc (no emit)
npm test             # jest --forceExit --detectOpenHandles --verbose
npm run test:watch
```

Run a single test file: `npx jest src/manifest.test.tsx`.

From the repo root, `make` targets wrap the above:
- `make check-style` — `make apply` + webapp lint/check-types (golangci-lint itself is skipped since there's no `server/`, but `make check-style` still installs it via `install-go-tools` unconditionally — that's a one-time download, not an error)
- `make test` — webapp `npm run test` only. `make test`'s Go test step (`gotestsum`) only runs when `HAS_SERVER` is set, which it isn't here — to run the Go tests for `build/pluginctl`, use `go test ./...` directly from the repo root.
- `make dist` — apply manifest, build webapp, bundle into `dist/<plugin-id>-<version>.tar.gz`
- `make deploy` — build and push to a running Mattermost server (needs `MM_SERVICESETTINGS_SITEURL` + either local-mode socket or `MM_ADMIN_TOKEN`/`MM_ADMIN_USERNAME`+`MM_ADMIN_PASSWORD`)
- `make watch` — rebuild webapp on change and deploy automatically
- `make apply` — regenerates `webapp/src/manifest.ts` from `plugin.json`. That file is gitignored, not committed — if it's missing, run `make apply` rather than recreating it by hand.

## CI

`.github/workflows/ci.yml` delegates entirely to Mattermost's official reusable workflow
(`mattermost/actions-workflows/.github/workflows/plugin-ci.yml@main`), which runs
`make check-style`, `make test`, and `make dist`. Node and Go versions come from
`.nvmrc` and `go.mod` respectively — don't hand-pin a Node version in this workflow file.
The workflow's `delivery` job (S3 upload) only runs when `github.repository_owner ==
'mattermost'`, so it's a no-op on this fork; no AWS secrets are needed here. There is no
more git-based `mattermost-webapp` devDependency (replaced by published `@mattermost/types`
/ `@mattermost/client` packages), so `npm ci`/`npm install` never needs git credentials.

## Webapp architecture

- `webapp/src/index.tsx` — plugin entry point. Registers a file-preview override via `registry.registerFilePreviewComponent((fileInfos, post) => ..., GpxPreviewOverride)`. Note the override predicate receives `FileInfo[]`, not a single `FileInfo` (current code: `fileInfos.every((fileInfo) => fileInfo.extension === 'gpx')`); the rendered component still receives a single `fileInfo` prop. This is the only integration point with Mattermost's plugin registry.
- `webapp/src/components/gpx_preview_override/gpx_preview_override.tsx` — the actual preview component. On mount, fetches `/api/v4/files/<id>` for the raw GPX, posts it as multipart form data to the external GPX-to-map renderer, and renders the returned URL in a `react-iframe` `Iframe`. Styling is driven by the Mattermost `theme` prop.
- `webapp/src/components/gpx_preview_override/index.ts` — connects the component to redux, supplying `theme` from `mattermost-redux/selectors/entities/preferences`'s `getTheme` selector. This redux-connected `index.ts` is what `index.tsx` actually imports.
- `webapp/src/manifest.ts` — **generated, not committed** (gitignored). Produced by `build/bin/manifest apply` (run via `make apply`, a dependency of `make check-style`/`make test`/`make dist`) from `plugin.json`. Keep `plugin.json` as the single source of truth for id/version.
- `webapp/src/types/mattermost-webapp/index.d.ts` — full ambient typings for `PluginRegistry`, synced verbatim from upstream `mattermost-plugin-starter-template` (not hand-maintained here). Resync by copying this file from a fresh template checkout if Mattermost's plugin registry API changes.

Import paths that moved during the dependency upgrade (don't reintroduce the old ones):
- `FileInfo` / `GlobalState` → `@mattermost/types/files` / `@mattermost/types/store` (not `mattermost-redux/types/*`, which no longer ships type declarations for these).
- `Theme` → `mattermost-redux/selectors/entities/preferences` (same module as `getTheme`, not a separate `types/preferences` module).

TypeScript `baseUrl` is `webapp/src`, so bare-specifier-style imports (e.g. `from 'manifest'`) would also resolve from there, though this codebase mostly keeps relative imports (`./manifest`, `./types/mattermost-webapp`) for existing files rather than switching to upstream's bare-specifier style — either works.

## Notes on the external service dependency

The preview component posts file contents to a third-party URL (`https://gpx.tomacla.info/`) with no error handling around the fetch chain — if that service is unreachable, the preview silently never resolves `mapUrl`. Keep this in mind when touching `gpx_preview_override.tsx`; this is a known characteristic of the current implementation, not necessarily something to silently "fix" without checking with the user first.
