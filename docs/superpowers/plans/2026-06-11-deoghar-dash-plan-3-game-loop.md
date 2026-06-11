# Deoghar Dash — Plan 3: Game Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Checkbox steps.

**Goal:** Full playable game: Home → Garage → 300 s shift with delivery missions, ₹/combo scoring, HUD, Results with count-up, local leaderboard, profile persistence + vehicle unlocks. Tag `v0.3.0-playable`.

**Architecture:** zustand `gameStore` is the single seam between the Three.js loop and React. The loop writes shift state at ~10 Hz and reads commands (screen, selected vehicle). Mission + scoring logic are pure modules (TDD). Screens are React over the always-rendering canvas (Home/Garage use the live 3D as cinematic backdrop). Visual identity: "Bazaar Arcade" — paper parcel-tag cards (`--paper #f7edd9`, dashed stamp borders), saffron `#ff9933` / marigold `#ffb703` / sindoor `#e63946` on plum dusk `#2b1b3d`; fonts Anton (display) + Bricolage Grotesque (UI) + Noto Sans Devanagari (accent देवघर).

**Builds on:** v0.2.0-driving. New deps: none (fonts via Google CDN @import).

## Files

```
src/game/sim/scoring.ts + __tests__        # payout, comboMult           (TDD)
src/game/sim/missions.ts + __tests__       # offer gen, mission FSM      (TDD)
src/state/gameStore.ts                     # zustand: screen, shift, profile actions
src/services/leaderboard.ts                # port + LocalAdapter (+ stub select for Plan 4)
src/game/GameApp.ts                        # MODIFY: shift orchestration, markers, garage cam, store bridge
src/game/world/markers.ts                  # pulsing pickup/drop beacons
src/ui/screens/Home.tsx Garage.tsx Results.tsx Leaderboard.tsx
src/ui/hud/Hud.tsx ComboRing.tsx Minimap.tsx DeliveryCard.tsx OfferToast.tsx
src/ui/bits.tsx                            # PaperCard, BigButton, Bunting shared bits
src/App.tssx                               # MODIFY: screen router over canvas
src/index.css                              # fonts, CSS vars, keyframes, paper/bunting utilities
```

## Tasks (compressed format — code authored at execution, contracts fixed here)

### T1 scoring.ts (TDD)
`comboMult(chain)= min(1+0.25*(chain-1), 3)` (chain≥1); `payout({distM, vehicleMult, comboMult, withinPar}) = roundTo5((40 + 25*(distM*1.4/1000)*1 ... )` exactly: `base=40+25*estKm; estKm=distM*1.4/1000; speedBonus=withinPar?30:0; round5((base+speedBonus)*vehicleMult*comboMult)`. `parSeconds(distM, topSpeed)= (distM*1.4)/(topSpeed*0.55)+20`. Tests: chain caps at 3.0; payout known values (e.g. 800m scooty no-bonus chain1 = round5((40+25*1.12)*1*1)=round5(68)=₹70); par sane.

### T2 missions.ts (TDD)
Types: `Offer {id, pickup:{x,z,name}, drop:{x,z,name}, distM, estPay, parcel}`; `ActiveMission {offer, phase:'pickup'|'drop', acceptedAt, pickedAt?}`.
`generateOffer(map, px, pz, rng, vehicleMult, seq)`: pickup = random POI (or road node fallback) 150–600 m from player; drop = POI/node 300–1500 m from pickup; never same; names: poi.name ?? pick(SHOP_NAMES); parcel from PARCELS list (peda box, puja flowers, tiffin, documents, phone, medicines, sari, books). estPay via scoring (chain 1, no bonus). Tests: distance bands honored with road-node fallback fixture; deterministic; estPay>0.
`ARRIVE_R = 9` (m). Helper `near(x,z,t)= hypot<=ARRIVE_R`.

### T3 gameStore.ts + leaderboard.ts
zustand store (no persist lib — manual localStorage):
```
screen: 'home'|'garage'|'driving'|'results'|'leaderboard'
handle, setHandle (persisted)
selectedIdx, careerEarnings, bestShift (persisted profile 'deoghar-dash:v1')
shift: { timeLeft, earnings, deliveries, chain, comboMult, comboLeft, offers:Offer[], mission:ActiveMission|null, lastDelivery?:{amount,at} }
results: snapshot|null
actions: startShift(), endShift(snapshot), acceptOffer(id), hudSync(partial)   // hudSync called from loop ≤10Hz
```
LeaderboardPort `{submit(entry), top(n), bestFor(handle)}`; LocalAdapter on localStorage `deoghar-dash:board` keep top 50 by earnings.

### T4 GameApp orchestration
- Store-driven: subscribe to screen; when 'driving' → reset vehState to spawn, shiftTime=300, offers seeded (3), sky.timeOfDay = 0.15+0.85*(1-timeLeft/300).
- update(): countdown; offer refill 10 s after slot empties; mission arrival checks (near pickup → phase 'drop'; near drop → delivered: chain check via comboLeft>0, earnings += payout(...par check), comboLeft=40, lastDelivery set, mission=null); comboLeft countdown; at 0 chain resets. timeLeft 0 → snapshot {earnings, deliveries, bestCombo, vehicle}, careerEarnings+=, submit leaderboard, screen='results'.
- hudSync at 10 Hz: timeLeft, earnings, comboMult, comboLeft, mission phase/target/dist, bearing (for HUD arrow), speed.
- markers.ts: saffron beacon cylinder (pickup) / teal (drop), pulse via scale in render; placed per mission phase.
- Garage mode: when screen==='garage', camera slow-orbits the displayed vehicle on Tower Chowk plaza; keys/UI arrows call setVehicle.
- Honk H: scale-pop the vehicle body (audio Plan 4).

### T5 index.css identity + bits.tsx
Google fonts @import; CSS vars; utilities: `.paper-card` (cream bg, ink text, 2px dashed border + corner stamps), `.bunting` (zigzag strip via repeating-linear-gradient), `.glass-dusk`, keyframes: `tickup`, `pulse-ring`, `slide-spring`, `confetti-fall`, `edge-glow`. bits.tsx: PaperCard, BigButton (Anton uppercase, saffron bg, ink shadow offset 4px — pressable), Bunting, RupeeChip.

### T6 Screens + HUD (React)
- App router by store.screen; canvas always mounted.
- Home: logo block (ANTON 'DEOGHAR DASH' + देवघर डैश + bunting), handle badge input, buttons DRIVE/GARAGE/LEADERBOARD. Slow auto-orbit camera (GameApp home mode = orbit around temple).
- Garage: left = 3D vehicle (live canvas), right paper card: name, stat bars (speed/accel/handling/off-road), payout ×, gali badge, LOCKED state with price + career progress; arrows ‹ › cycle; SELECT & DRIVE.
- HUD: timer pill (Anton, warns <30 s sindoor pulse), ₹ count-up ticker, ComboRing (conic-gradient ring draining, ×N center, hot ≥2 sindoor + edge-glow), DeliveryCard paper tag (parcel, dest name, distance, rotating arrow by bearing−heading), OfferToasts (3 slide-in cards, ACCEPT button, payout preview), Minimap (offscreen road render, rotate by heading, dots), delivery flash: '+₹N' floater + slow-mo (loop timescale 0.35 for 0.4 s) + confetti burst (CSS).
- Results: receipt paper (DELIVERY RECEIPT header, dashed tear edge, rows count up staggered: deliveries × base, speed bonuses, best combo, vehicle bonus → TOTAL in Anton 64px), record badge if > bestShift, rank reveal from leaderboard, DRIVE AGAIN / GARAGE / HOME.
- Leaderboard: TOP COURIERS OF DEOGHAR; rows luggage-tags rank/handle/vehicle emoji/₹; self highlighted saffron; back.

### T7 Verify + milestone
Browser: full loop twice (drive→deliver≥2 with combo→results→again); unlock check (career grows); leaderboard rows persist reload; perf <4 ms; tests+build green → tag `v0.3.0-playable`, push.

Self-review: spec §2 loop/§5 controls(desktop)/§6 screens/juice/§7 arch/§8 local adapter covered; Supabase+audio+mobile = Plan 4; types fixed here, code at execution follows these contracts exactly.
