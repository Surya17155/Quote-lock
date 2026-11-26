# Providers and glass UI — design

Date: 2026-11-12
Status: approved
Scope: QuoteLock Studio (Electron + React) and the PowerShell engine

## Intent

Today the app talks to one hardcoded service (NVIDIA NIM) with one key and one
model. The owner wants:

- several saved providers, each with its own API key
- one active provider and one active model at a time
- model lists fetched live from the provider, shown as a searchable dropdown
- a UI that feels premium: liquid-glass surfaces, smooth transitions, click
  sounds, and a larger black custom cursor

Why: keys from different providers should be reusable without editing files, and
model choice should not depend on knowing model ID strings by heart.

## Goals

- Add, edit, and remove provider keys locally; one active provider.
- Fetch `GET {baseUrl}/models` with that provider's key, cache the list, and
  offer search plus refresh.
- Drive generation from the active provider and model only.
- Migrate the existing `apiKey` / `model` into the new schema on first read.
- Emulate Apple liquid glass in the renderer, with motion, sound, and cursor.
- Keep the API key out of the renderer and out of packaged resources.

## Non-goals

- Cloud sync of providers or keys.
- Per-provider prompt tuning.
- Multiple simultaneous providers per generation.
- Native Windows cursor replacement (system-wide). The cursor is app-scoped.

## Anti-goals

- A settings screen that hides which provider is active.
- Sending every saved key with every request.
- Glass effects that reduce text contrast below WCAG AA.
- Sound that cannot be muted.

## Constraints

- Keys live in `%USERPROFILE%\QuoteLock\config.json`, which is git-ignored.
- Existing `app.ps1`, packaged engine copies, and `config.json` must keep working.
- Every provider except Anthropic speaks the OpenAI chat shape. Anthropic needs
  `x-api-key` plus `anthropic-version`, and exposes `/chat/completions`.
- Ollama runs locally and needs no key.
- Electron `net.fetch` avoids CORS for model listing.
- Node/Electron target is Windows 10/11; `backdrop-filter` is supported.

## Approaches considered

1. Fixed provider list with hardcoded base URLs. Simple, but locks out any
   provider not listed.
2. Fixed list plus a Custom entry (base URL typed by the user). Covers
   OpenAI-compatible services and keeps the common cases one click away.
3. Native per-provider adapters. Broadest, but multiplies request and response
   code and failure modes for no user-visible gain.

Selected: **2**.

## Design

### Data model

```jsonc
{
  "activeProvider": "nvidia",
  "providers": {
    "nvidia": { "key": "nvapi-…", "model": "…", "models": ["…"], "modelsAt": "ISO" },
    "openai": { "key": "", "model": "", "models": [], "modelsAt": "" },
    "custom": { "baseUrl": "https://…/v1", "key": "", "model": "", "models": [], "modelsAt": "" }
  }
}
```

The preset table (id, label, base URL, auth style, docs hint) lives in one
shared module used by the renderer and the engine config path. Presets:
NVIDIA NIM, OpenAI, OpenRouter, Groq, Together, DeepSeek, Mistral, xAI, Gemini,
Anthropic, Ollama, Custom.

Migration: if `apiKey` or `model` exists and `providers.nvidia` does not, move
them into `providers.nvidia` and set `activeProvider` to `nvidia`. The old keys
are removed after a successful write.

### Engine

`Invoke-OneItem` and model listing take a resolved context:
`{ baseUrl, key, model, authStyle, extraHeaders }`. Chat URL is
`{baseUrl}/chat/completions`; models URL is `{baseUrl}/models`. Auth style is
`bearer`, `x-api-key`, or `none`. Requests use only the active provider's key.
`app.ps1` reads the new schema and falls back to the legacy `apiKey`/`model`.

### Electron IPC

- `providers:list` → sanitized config (no keys) + preset metadata
- `providers:set-key` (id, key)
- `providers:set-active` (id)
- `providers:set-model` (id, model)
- `providers:set-base-url` (id, url) — custom only
- `providers:clear` (id)
- `providers:models` (id) → `{ models, fetchedAt, error }`, fetched via `net.fetch`

`publicConfig` never returns a key; it returns `hasKey` per provider.

### Settings UI

Connection panel becomes:

- Provider cards in a responsive grid. Each card: name, auth badge, key state,
  active ring. Clicking selects it; a small "Use this provider" action activates.
- Detail panel for the selected provider: masked key field with Save, model
  combobox (search box, filtered list, refresh button, model count, last fetch),
  and Custom base URL when relevant.
- Home and Schedule show `provider · model` instead of a bare model ID.

### Glass and motion system

- Tokens: `--glass-bg`, `--glass-border`, `--glass-highlight`, `--glass-shadow`,
  tuned for dark and light app themes.
- Surfaces: panels and the sidebar use a translucent base, `backdrop-filter:
  blur(24px) saturate(140%)`, a 1px gradient border that brightens toward the
  light source, and an inset top highlight.
- Buttons: glass pill for secondary, tinted glass for primary, 120–180 ms
  press/hover transitions, subtle highlight sweep on hover, and a pressed scale
  of 0.97.
- Motion: page transitions via `AnimatePresence` (fade + 10px lift, 220 ms),
  tab content fade/slide, staggered card entry, spring on the active provider
  ring. Reduce-motion is honoured: transforms collapse, opacity stays.
- Sound: Web Audio API synthesised clicks (no assets). Two voices: soft tick for
  navigation/toggles, lower thunk for primary actions. Global mute switch in
  Settings, persisted in `localStorage`.
- Cursor: app-scoped SVG cursor, 28×28 black arrow with a white hairline for
  dark surfaces and a soft shadow. A second pointer cursor for interactive
  elements. Falls back to `default` when SVG cursors are unsupported.
- Contrast: text always sits on an opaque-enough layer (minimum 0.72 alpha
  over the app background) so AA holds in both themes.

### Accessibility

- Provider cards are real buttons with `aria-pressed` for active state.
- Model combobox: labelled search input, arrow-key navigation, Enter to choose,
  Escape to close, `aria-expanded` and `role="listbox"` options.
- Sound and cursor never remove keyboard focus outlines.
- Reduced motion preference disables non-essential animation.

## File touch list

- `electron/main.cjs`, `electron/preload.cjs` — schema, migration, IPC, fetch
- `src/global.d.ts`, `src/lib/types.ts` — provider types
- `src/lib/providers.ts` — preset table shared with the engine docs
- `src/components/ui.tsx` — glass surfaces, buttons, cursor, motion primitives
- `src/App.tsx` — page transitions, provider state, sound wiring
- `src/pages/Settings.tsx` — provider cards, key, model combobox
- `src/pages/Home.tsx`, `src/pages/Schedule.tsx` — active provider/model display
- `src/index.css` — glass tokens, cursors, motion keyframes
- `app.ps1` — provider-aware requests and model listing
- `scripts/audit-render.mjs` / UI audits — extend for providers

## Risks

- Provider model payloads differ (`data[].id` vs `models[].name`). Normalise and
  ignore unknown shapes; surface a readable error instead of crashing.
- Anthropic compatibility can change; treat it as a preset that may fail and
  show the provider's error text.
- Glass over busy preview imagery can hurt contrast; panels stay opaque enough
  and the preview card is excluded from glass.

## Open decisions left to the builder

- Exact glass alpha values, verified against AA with a contrast check script.
- Whether provider cards animate with layout or fade; choose whichever keeps
  the grid stable at 1120 px minimum width.
