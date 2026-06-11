# Deoghar Dash — Design Spec

**Date:** 2026-06-11 · **Status:** Approved by Mayank (engine, leaderboard, art vibe chosen via Q&A; full design approved)

A delivery-simulation webapp game set on the **real road network of Deoghar, Jharkhand (PIN 814112)**, rendered as a 3D low-poly city at golden hour. Pick a vehicle, run a 5-minute delivery shift, chain combos, earn ₹, climb a global leaderboard.

---

## 1. Confirmed decisions

| Decision | Choice |
|---|---|
| Engine | Vanilla **Three.js** 3D low-poly world; React only for UI chrome |
| Map source | **OpenStreetMap via Overpass**, fetched at **build time**, committed JSON (verified 2026-06-11 in central test bbox 24.465–24.510/86.675–86.725: 1,308 road ways, 97 buildings, 79 amenities — build bbox §4.1 is slightly wider, so counts are a floor; real names: Deoghar Road MDR220, Barmsia Road, Sal Mandir Road, Bypass, Nizamat Hussain Rd) |
| Leaderboard | **Supabase** global board, anon insert-only + RLS; **local-storage fallback** when env keys absent |
| Art direction | **Golden-hour temple town** — saffron/sunset palette, sun sets during each shift |
| Stack | Vite + React 18 + TypeScript + Tailwind v4 + zustand + three + vitest |
| Repo | Own isolated git repo in `Deoghar_map_game/`; deploy to Vercel as SPA |

## 2. Core loop

1. Home → Garage: pick an unlocked vehicle.
2. **Shift = 300 seconds** of free-roam driving in real Deoghar.
3. Up to **3 delivery offers** shown as cards (pickup point, drop point, payout estimate). Accept one at a time. Offer list refills within 10 s.
4. Drive to pickup (glowing marker, HUD arrow, minimap) → auto-pickup on arrival → drive to drop → auto-deliver.
5. **Combo:** delivering within **40 s** of the previous delivery continues the chain. Multiplier `1.0 + 0.25 × (chain − 1)`, capped **×3.0**.
6. Shift ends → results breakdown → submit best-shift earnings to leaderboard → "Drive again" loop.

**Leaderboard ranks best single shift.** Career earnings (sum of all shifts, stored locally) drive vehicle unlocks.

### Payout formula

```
route_estimate_km = straight_line_km × 1.4
base = ₹40 + ₹25 × route_estimate_km
speed_bonus = ₹30 if delivered within par time (route_estimate / vehicle_expected_speed + 20 s)
payout = round_to_₹5( (base + speed_bonus) × vehicle_multiplier × combo_multiplier )
```

### Mission generation

- Pickup spawns 150–600 m from player; drop 300–1500 m from pickup, both snapped to road-adjacent POIs.
- Destinations drawn from real OSM POIs/amenities + curated landmarks; parcels themed to Deoghar (peda box, puja flowers, tiffin, documents, phone, medicines).
- Pickup/shop names: real OSM names where available, else plausible curated names.

## 3. Vehicles

| Vehicle | Top speed | Accel | Steering | Galis (alleys) | Off-road factor | Payout × | Unlock (career ₹) |
|---|---|---|---|---|---|---|---|
| Scooty | 16 m/s | high | nimble | ✅ | 0.35 | 1.00 | free |
| Bike | 22 m/s | high | twitchy | ✅ | 0.35 | 1.10 | 2,000 |
| Auto-rickshaw | 14 m/s | med | wide, leans | ✅ | 0.45 | 1.20 | 5,000 |
| Sedan | 19 m/s | med | stable | ❌ | 0.35 | 1.15 | 10,000 |
| SUV | 15 m/s | low | heavy | ❌ | 0.75 | 1.30 | 20,000 |

- **Arcade kinematics, no physics engine**: bicycle-model-lite (speed, heading, steer rate, drift on handbrake), hand-tuned per vehicle.
- Off-road (off the road ribbons) multiplies top speed by the off-road factor + camera shake. Buildings are solid (AABB/OBB collision, soft bounce).
- Galis = OSM footway/path/pedestrian/track, rendered as 2.2 m lanes; only 2-wheelers + auto may enter (invisible gate at gali mouths for cars, with "too narrow!" toast).
- All vehicles are code-built low-poly silhouettes (no model files): spinning wheels, turn lean, suspension bob, dusk headlight cones, throttle dust particles.
- Locked vehicles appear in Garage as dark silhouettes with unlock price.

## 4. World build

### 4.1 Map pipeline (`scripts/build-map.mjs`, run at dev time, output committed)

1. Overpass query bbox **(24.462, 86.672, 24.512, 86.728)** (≈5.5 × 5.7 km): all `highway` ways with geometry, `building` ways, POI nodes (`amenity`, `shop`, `tourism`, `place_of_worship`), water (`natural=water`).
2. Project to local meters, equirectangular about bbox center (24.487, 86.700): `x = (lon−86.700) × 111320 × cos(24.487°)`, `z = −(lat−24.487) × 110574`.
3. Build road graph: nodes (shared endpoints = intersections), edges `{id, a, b, class, width, polyline[]}`.
   Class map: motorway/trunk/primary→`primary` 9 m · secondary→`secondary` 7 m · tertiary→`tertiary` 6 m · residential/unclassified/living_street→`residential` 4.5 m · service→`service` 3.5 m · footway/path/pedestrian/track→`gali` 2.2 m.
4. Emit `src/data/deoghar-map.json`: `{meta, nodes, edges, pois, buildings, water}` — target ≤ 1.5 MB raw.
5. Curated landmark list merged in (verified against OSM during build): Baidyanath Temple (24.4926, 86.7002), Tower Chowk, Clock Tower, Deoghar Jn station, Shivganga pond (placed manually if absent from OSM).

### 4.2 Rendering

- Road ribbons (triangulated polylines, rounded joins); dashed centerlines on primary/secondary; plaza discs at high-degree intersections (chowks).
- **Procedural buildings**: seeded RNG places lots along road edges (respecting real footprints where present, never overlapping roads); extruded 1–3 floor boxes, flat-shaded, vertex-color facades in town palette; shopfront strip + awnings + hoardings on primary/secondary; temple zone gets a custom shikhara model.
- Props via **InstancedMesh**: trees, lampposts, hoardings, water tank. Shivganga = animated shader plane.
- **Golden hour**: warm directional sun low on horizon (long PCF shadows), saffron fog, gradient sky dome + sun disc + drifting cloud billboards, subtle bloom, warm color grading. Sun azimuth/elevation animates across the 300 s shift → dusk in final minute: shop windows + streetlights + headlights fade in.
- **Street life**: 8 wandering cows (zones near temple/market; elastic bump = −60 % speed + horn + toast), 6 ambient autorickshaws path-following primary/secondary loops with simple avoidance. Non-violent always.

## 5. Controls & camera

- **Desktop:** WASD/arrows drive, Space handbrake, H horn, C camera toggle, Esc pause.
- **Mobile:** auto-accelerate ON by default; left-half horizontal drag steers, right-side brake + boost buttons, horn button. Thumb-first layout, ≥44 px targets.
- **Chase cam**: spring-damped follow, speed-based FOV kick, look-ahead into turns; top-down orthographic toggle. Pause on tab blur.

## 6. UI screens & juice (React + Tailwind)

`Splash/loading → Home → Garage → Shift (HUD) → Results → Leaderboard`

- **Splash:** city assembles behind a progress bar (staged world build doubles as loader).
- **Home:** logo, DRIVE / GARAGE / LEADERBOARD, courier-handle entry (2–16 chars, persisted locally, no auth).
- **Garage:** turntable podium, stat bars, swipe/arrow carousel, locked silhouettes + prices.
- **HUD:** timer, ₹ counter (ticks up), draining combo ring, active delivery card, direction arrow + distance, minimap (canvas, rotating with heading), horn button.
- **Delivery hit:** 0.3 s slow-mo, confetti burst, ₹ floater, combo snap-refill, screen-edge warm glow at high combo.
- **Results:** line-by-line count-up (deliveries, distance, best combo, vehicle bonus → total), record badges, live leaderboard rank-climb animation.
- **Audio (WebAudio synth, no files):** engine hum pitched by speed, per-vehicle horn, pickup/delivery chimes, results jingle. Mute toggle persisted.

## 7. Architecture

```
src/
  game/            # vanilla Three.js — NO React imports
    engine/        # loop (fixed-dt sim, rAF render), renderer, input, quality scaler
    world/         # map loader, road mesh builder, procedural buildings, props, sky/sun
    vehicles/      # 5 vehicle builders, arcade controller, chase camera rig
    sim/           # mission generator, combo/scoring, cow & traffic agents, collisions
    fx/            # particles, post (bloom/grade), audio synth
  state/           # zustand: gameStore (HUD mirror, throttled ≤10 Hz), profileStore, settings
  ui/              # React screens + HUD components (Tailwind)
  services/        # LeaderboardPort → SupabaseAdapter | LocalAdapter (auto-select by env)
  data/            # deoghar-map.json (generated, committed), curated.ts (landmarks, parcels, shop names)
scripts/build-map.mjs
```

- Game→React: loop writes HUD state into zustand at ≤10 Hz (no per-frame React renders). React→Game: store actions (startShift, selectVehicle, pause) consumed by engine.
- **Profile (career ₹, unlocks, best shift, handle, settings) in localStorage** under one versioned key `deoghar-dash:v1`.

## 8. Leaderboard (Supabase)

```sql
create table leaderboard (
  id uuid primary key default gen_random_uuid(),
  handle text not null check (char_length(handle) between 2 and 16),
  vehicle text not null,
  earnings int not null check (earnings between 0 and 99999),
  deliveries int not null check (deliveries between 0 and 200),
  best_combo numeric(3,2) not null default 1.0,
  duration_s int not null default 300,
  created_at timestamptz default now()
);
-- RLS: anon INSERT only (with the checks above); anon SELECT allowed; no update/delete.
```

- Query: top 50 by earnings desc + player's own best rank (computed client-side from fetched page or a count query).
- Env `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`; **absent → LocalAdapter** (localStorage top-50). Failed submits queue in localStorage and retry on next app open; results screen never blocks on network.

## 9. Performance & error handling

- InstancedMesh everywhere (buildings/trees/props/cows), tile-grid culling (256 m tiles, frustum + radius), pixel-ratio cap 2, zero per-frame allocations in hot loop.
- **Quality tiers:** High (2048 shadows + bloom) / Med (1024, no bloom) / Low (no shadows, no bloom, PR 1). Auto-drop one tier when avg frame > 40 ms over 3 s; manual override in settings. Targets: 60 fps desktop, 30+ fps mid phones.
- WebGL unavailable → friendly fallback screen. Map JSON ships in bundle — no runtime Overpass dependency. Dev-only stats overlay (fps, draw calls, tris).

## 10. Testing

- **Vitest:** projection math, road-graph build (snap/merge correctness on fixture), mission generator constraints (distance bands, POI snapping), payout/combo math, unlock rules, both leaderboard adapters (Supabase mocked), profile persistence/migration.
- Manual feel pass via Chrome DevTools MCP (drive, screenshot, console/perf check) before calling any phase done.

## 11. Out of scope (v2 candy)

Daily challenges, multiplayer ghosts, pedestrians, weather, vehicle skins, auth/accounts, sound files/music tracks, in-game map editor.

## 12. Acceptance criteria (v1 ships when…)

1. `npm run build-map` regenerates `deoghar-map.json` from live Overpass; committed copy loads offline.
2. The real Deoghar network is drivable: Tower Chowk → Baidyanath Temple route exists and galis exclude cars.
3. All 5 vehicles drivable with visibly distinct feel; unlock gating works from career earnings.
4. Full loop: pick vehicle → 300 s shift → ≥1 delivery with combo → results → score on leaderboard (local adapter) → replay.
5. With Supabase keys set: score appears in global top-50 across two different browsers.
6. 60 fps on desktop (High tier) in dev stats overlay; auto-scaler demonstrably drops tiers under forced load.
7. Mobile Chrome: playable with touch controls, ≥30 fps on a mid-range device.
8. All vitest suites green.
