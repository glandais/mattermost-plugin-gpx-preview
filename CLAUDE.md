# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Mattermost webapp-only plugin (based on `mattermost-plugin-starter-template`) that overrides the file preview for `.gpx` files. When a `.gpx` file is opened in Mattermost, it fetches the raw file content, POSTs it to an external map-rendering service (`https://gpx.tomacla.info/`), and shows the result in an iframe.

There is **no `server/` directory** — `plugin.json` only declares a `webapp` section, so `HAS_SERVER` is empty and the Makefile/CI skip all Go plugin-server steps. The Go code that does exist (`build/`) is only the starter-template's build tooling (manifest parser, pluginctl, sync), not the plugin's own server logic. Do not add Go server code unless explicitly asked — it would require updating `plugin.json` and `go.mod` (still named `mattermost-plugin-starter-template`, never renamed for this project).

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

From the repo root, `make` targets wrap the above (and are what CI conceptually mirrors, even though CI calls npm directly — see below):
- `make check-style` — lint + check-types (webapp only; golangci-lint is skipped since there's no `server/`)
- `make test` — webapp `npm run test` plus `build/sync` Go tests
- `make dist` — apply manifest, build webapp, bundle into `dist/<plugin-id>-<version>.tar.gz`
- `make deploy` — build and push to a running Mattermost server (needs `MM_SERVICESETTINGS_SITEURL` + either local-mode socket or `MM_ADMIN_TOKEN`/`MM_ADMIN_USERNAME`+`MM_ADMIN_PASSWORD`)
- `make watch` — rebuild webapp on change and deploy automatically

## CI quirks (read before touching `.github/workflows/pr-checks.yml`)

These constraints were hard-won — don't "fix" them without understanding why:
- The webapp job pins **Node 13.14**, matching the old CircleCI default. Newer Node breaks `node-sass@4.14.1` (needs a source build / fails entirely).
- Before `npm ci`, the workflow rewrites `ssh://git@github.com/` to `https://github.com/` via git config, because `package.json` pulls `mattermost-webapp` directly from GitHub (`mattermost-webapp#<commit>`) and CI has no SSH credentials.
- There is also a legacy `.circleci/config.yml` using the `mattermost/plugin-ci` orb; the GitHub Actions workflow (`.github/workflows/pr-checks.yml`) is the one actually exercised now.
- **Test locally before pushing**: use a `node:13.14` Docker container to match CI exactly rather than relying on push+CI as the debug loop.

## Webapp architecture

- `webapp/src/index.tsx` — plugin entry point. Registers a file-preview override via `registry.registerFilePreviewComponent((fileInfo) => fileInfo.extension === 'gpx', GpxPreviewOverride)`. This is the only integration point with Mattermost's plugin registry.
- `webapp/src/components/gpx_preview_override/gpx_preview_override.tsx` — the actual preview component. On mount, fetches `/api/v4/files/<id>` for the raw GPX, posts it as multipart form data to the external GPX-to-map renderer, and renders the returned URL in a `react-iframe` `Iframe`. Styling is driven by the Mattermost `theme` prop.
- `webapp/src/components/gpx_preview_override/index.ts` — connects the component to redux, supplying `theme` from `mattermost-redux`'s `getTheme` selector. This redux-connected `index.ts` is what `index.tsx` actually imports.
- `webapp/src/manifest.ts` — re-exports `plugin.json` (id/version) for both the plugin entry point and `build/manifest` tooling; keep `plugin.json` as the single source of truth for id/version rather than hardcoding them elsewhere.
- `webapp/src/types/mattermost-webapp/index.d.ts` — local ambient typings for `PluginRegistry`, since `mattermost-webapp` isn't published as a normal npm type-bearing package.

Path aliasing: TypeScript `baseUrl` is `webapp/src`, so absolute-style imports resolve from there; `mattermost-redux` types/selectors are imported directly from the `mattermost-redux` package (a dependency of this plugin, not a relative path).

## Notes on the external service dependency

The preview component posts file contents to a third-party URL (`https://gpx.tomacla.info/`) with no error handling around the fetch chain — if that service is unreachable, the preview silently never resolves `mapUrl`. Keep this in mind when touching `gpx_preview_override.tsx`; this is a known characteristic of the current implementation, not necessarily something to silently "fix" without checking with the user first.
