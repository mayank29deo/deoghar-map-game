# Deoghar Dash — Plan 4: Ship Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** Mobile touch controls, WebAudio synth (engine/horn/chimes/jingle), Supabase leaderboard adapter (auto-fallback to local), Vercel deploy. Tag `v0.4.0-ship`.

**Contracts:**

- `src/game/engine/touch.ts` — module-singleton `touch = { active, steer (-1..1), brake, hornPressed }`; GameApp prefers it over keyboard when `active`. Auto-accelerate: throttle = brake ? -1 : 1.
- `src/ui/hud/TouchControls.tsx` — rendered in HUD only when `matchMedia("(pointer: coarse)")`; left half = steer drag (±70 px), right = BRAKE hold + HORN tap buttons (≥56 px), writes `touch`.
- `src/game/fx/audio.ts` — lazy AudioContext (first gesture); `setEngine(frac, on)` saw→lowpass→gain pitched per vehicle; `horn(key)` per-vehicle two-tones; `pickup()`, `deliver()` (ding + coin), `comboLost()`, `jingle()`; `muted` persisted `deoghar-dash:muted`, M toggles. GameApp calls on respective events; Hud shows 🔊/🔇 button.
- `src/services/supabase.ts` — `maybeSupabaseAdapter(): LeaderboardPort | null` using `@supabase/supabase-js` when both `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` set; `leaderboard.ts` exports the supabase adapter if available else Local. rankOf via `count exact head gt(earnings)` + 1. Failed submit → queue `deoghar-dash:pending` retried on app start.
- `supabase/schema.sql` — table + RLS exactly per design spec §8. `.env.example` documents both vars.
- Deploy: `npm run build` → Vercel MCP `deploy_to_vercel` from project root (static `dist/`, framework vite). Add `vercel.json` `{ "buildCommand": "npm run build", "outputDirectory": "dist" }`.

**Steps:** deps (`@supabase/supabase-js`) → audio → touch → supabase adapter + sql + env example → wire GameApp/Hud → tests+build green → browser sanity (touch overlay via emulation, audio init no-crash, board still local-works) → commit, tag `v0.4.0-ship`, push → Vercel deploy → README with play instructions + screenshots section.

**Deferred to v0.5 backlog (not this plan):** cows & ambient autos, dust particles/bloom pass, quality auto-scaler, gali "too narrow" toast, garage fill light, favicon, code-split three.
