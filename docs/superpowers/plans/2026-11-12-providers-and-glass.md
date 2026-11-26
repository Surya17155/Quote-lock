# Providers and Glass UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-provider API keys with live model discovery and one active provider/model, then restyle the app with liquid glass, motion, click sounds, and a premium cursor.

**Architecture:** A provider preset table shared by the renderer and the engine defines base URL and auth style. Config stores per-provider keys/models and one `activeProvider`. Electron exposes sanitized provider IPC and proxies model listing through `net.fetch`; `app.ps1` builds chat and model URLs from the active provider. Visual work lives in shared UI primitives plus CSS tokens so every surface picks it up.

**Tech Stack:** Electron 45, React 19, TypeScript, Tailwind 4, motion, PowerShell engine, Playwright audits.

**Spec:** `docs/superpowers/specs/2026-11-12-providers-and-glass-design.md`

## Global Constraints

- Never return an API key from `publicConfig` or any IPC response.
- `config.json` stays git-ignored; packaged resources must not contain keys.
- Existing configs with `apiKey` + `model` must migrate without data loss.
- One active provider and one active model at a time.
- Text contrast must stay at WCAG AA in both app themes.
- `prefers-reduced-motion` disables transforms, keeps opacity.
- Every new control is keyboard reachable with a visible focus ring.
- Sound has a persistent mute switch.
- App minimum window width is 1120 px; provider grid must not overflow.

## Review Focus

- A provider with zero saved models: the combobox must offer a manual typed model, not an empty dead box.
- A provider whose `/models` call fails or times out: readable error, no crash, no stuck spinner.
- Switching providers mid-edit: key and model inputs must not leak the previous provider's values.
- Custom base URL without trailing `/v1` or with a trailing slash: normalise before use.
- Reduced motion plus muted sound: no animation and no audio, everything still usable.

---

### Task 1: Provider presets and config schema

**Files:**
- Create: `src/lib/providers.ts`
- Modify: `src/lib/types.ts`
- Modify: `electron/main.cjs` (`publicConfig`, `config:save`, migration)
- Test: `scripts/audit-providers.mjs`

**Interfaces:**
- Produces: `PROVIDERS: ProviderPreset[]` where `ProviderPreset = { id, label, baseUrl, auth: 'bearer'|'x-api-key'|'none', hint?, custom?: boolean }`.
- Produces: `ProviderState = { id, key, model, models: string[], modelsAt: string, baseUrl?: string }` and `AppConfig.activeProvider`, `AppConfig.providers: Record<string, PublicProvider>`.
- Produces: `sanitizeProviders(config)` in `main.cjs` returning `{ id, baseUrl, hasKey, model, models, modelsAt }`.

- [ ] **Step 1: Write the failing test**

`scripts/audit-providers.mjs` imports the preset table and asserts 12 entries, ids include `nvidia`, `openai`, `openrouter`, `groq`, `together`, `deepseek`, `mistral`, `xai`, `gemini`, `anthropic`, `ollama`, `custom`; every non-custom base URL starts with `https://`; `ollama.auth === 'none'`; `anthropic.auth === 'x-api-key'`.

- [ ] **Step 2: Run it** — `node scripts/audit-providers.mjs` → FAIL, module missing.

- [ ] **Step 3: Implement** the preset table and the types above. Add `migrateConfig(config)` to `main.cjs`, called by `readConfig()`: if `providers` is absent, create `providers.nvidia` from `apiKey`/`model`, set `activeProvider: 'nvidia'`, then persist on the next save.

- [ ] **Step 4: Run it** → PASS.

- [ ] **Step 5: Verify migration** with a temporary config copy: legacy `{ apiKey: 'x', model: 'm' }` reads as `providers.nvidia.key === 'x'`, `activeProvider === 'nvidia'`.

---

### Task 2: Provider IPC and model discovery

**Files:**
- Modify: `electron/main.cjs`, `electron/preload.cjs`, `src/global.d.ts`
- Test: `scripts/audit-providers.mjs` (extend)

**Interfaces:**
- Produces: `providers:list`, `providers:set-key`, `providers:set-active`, `providers:set-model`, `providers:set-base-url`, `providers:clear`, `providers:models`.
- Produces: `resolveProvider(config, id)` → `{ id, baseUrl, key, auth, extraHeaders }` (main process only).
- Produces: `normalizeBaseUrl(url)` — trims, drops trailing slash, appends `/v1` only for custom URLs that have no path segment.
- Produces: `window.ql.providers.*` typed in `global.d.ts`.

- [ ] **Step 1: Extend the failing audit** to assert the preload surface includes all seven provider methods and that `providers:list` output has no `key` field.
- [ ] **Step 2: Run it** → FAIL.
- [ ] **Step 3: Implement** handlers. Model fetch: `net.fetch(baseUrl + '/models', { headers })` with a 20 s timeout, parse `data[].id` or `models[].name`, sort, cache into `providers[id].models`, return `{ models, fetchedAt, error }`. Anthropic sends `x-api-key` + `anthropic-version: 2023-06-01`. Ollama sends no auth.
- [ ] **Step 4: Run audits** → PASS.
- [ ] **Step 5: Manual check** with the real NVIDIA key: `providers:models` returns more than 10 models.

---

### Task 3: Engine uses the active provider

**Files:**
- Modify: `app.ps1` (`Get-NimModels`, `Invoke-OneItem`, generation entry)
- Test: `powershell -NoProfile -ExecutionPolicy Bypass -File app.ps1 -SelfTest`

**Interfaces:**
- Produces: `Get-ProviderContext` → `@{ BaseUrl; Key; Model; Auth; Headers }` from `activeProvider` + `providers`.
- Produces: `Get-ModelsWithProvider $ctx` and `Invoke-OneItem -Context $ctx …`.

- [ ] **Step 1: Add a failing self-test** case that builds a context from a fake config and asserts the chat URL and auth header.
- [ ] **Step 2: Run** `-SelfTest` → FAIL.
- [ ] **Step 3: Implement** provider-aware URLs and headers; keep a legacy fallback when `activeProvider` is missing.
- [ ] **Step 4: Run** `-SelfTest` → PASS.
- [ ] **Step 5: Run** `-Generate` once against the real key and confirm a new queue card.

---

### Task 4: Settings provider UI

**Files:**
- Modify: `src/pages/Settings.tsx`, `src/App.tsx`
- Test: `scripts/audit-providers.mjs` (UI section) + `scripts/pages-audit.mjs`

**Interfaces:**
- Consumes: `window.ql.providers.*`, `AppConfig.providers`.
- Produces: `ProviderCard`, `ModelCombobox` inside `Settings.tsx`.

- [ ] **Step 1: Failing UI audit** — open Settings, assert 12 provider cards, click OpenAI, assert its key field is empty while NVIDIA reports "Key saved", assert the active badge moves only after "Use this provider".
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** cards, key form, model combobox (search, arrow keys, Enter, Escape, refresh, count, error line), custom base URL field.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Check contrast** of card text on glass with a computed-style check; adjust tokens until AA.

---

### Task 5: Show active provider elsewhere

**Files:**
- Modify: `src/pages/Home.tsx`, `src/pages/Schedule.tsx`

- [ ] **Step 1: Failing audit** — Home and Schedule must contain the active provider label next to the model.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** the label from config.
- [ ] **Step 4: Run** → PASS.

---

### Task 6: Glass design tokens and surfaces

**Files:**
- Modify: `src/index.css`, `src/components/ui.tsx`

- [ ] **Step 1: Add a failing contrast audit** that samples `--panel`, `--panel-soft`, `--glass-bg` against `--fg` and fails below 4.5:1.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** tokens and glass surfaces: translucent panel background, `backdrop-filter: blur(24px) saturate(140%)`, gradient hairline border, inset highlight, layered shadow. Buttons get glass primary/secondary variants.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Screenshot** both themes and check no text sits on a transparent hole.

---

### Task 7: Motion, sound, cursor

**Files:**
- Modify: `src/App.tsx`, `src/components/ui.tsx`, `src/index.css`
- Create: `src/lib/feedback.ts`

**Interfaces:**
- Produces: `playClick(kind: 'tick' | 'thunk')`, `setMuted(bool)`, `isMuted()` backed by `localStorage` and a lazily created `AudioContext`.
- Produces: `useReducedMotion()` guard for transforms.

- [ ] **Step 1: Failing audit** — assert the root has the app cursor class, a button press applies the pressed scale class, and a mute toggle persists across reload.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** page/tab transitions with `AnimatePresence`, staggered lists, button press/hover states, synthesised click sounds on navigation and primary actions, mute switch in Settings, SVG cursor with a larger black arrow and a pointer variant.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Reduced motion check** — emulate the media query and assert transforms are none.

---

### Task 8: Full verification

- [ ] **Step 1:** `npm run typecheck`, `npm run lint`, `npm run build` clean.
- [ ] **Step 2:** `npm run audit` passes (renderer, palettes, pages, providers).
- [ ] **Step 3:** `npm run dist`, install silently, `npm run audit:packaged` passes including live publish.
- [ ] **Step 4:** Screenshot Home, Studio, Settings in both themes; confirm glass, cursor, and spacing.
- [ ] **Step 5:** Scan `app.asar` for `nvapi-` and fail if found.
