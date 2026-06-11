# 🛵 Deoghar Dash

**A delivery-dash game on the real streets of Deoghar, Jharkhand (814112).**

The entire road network — Deoghar Road, the Bypass, Tower Chowk, the galis around Baba Baidyanath Dham, Shivganga — is generated from OpenStreetMap data and rendered as a 3D low-poly city at golden hour. Pick your ride, run a 5-minute delivery shift, chain combos, and climb the leaderboard. The sun sets over the city as your shift runs out.

## Play

- **Drive:** WASD / arrow keys · **Handbrake:** Space · **Horn:** H · **Mute:** M
- **Mobile:** drag left half to steer (auto-accelerate), BRAKE + horn buttons on the right
- Accept a parcel offer → ride to the glowing **saffron** pickup → deliver to the **teal** drop
- Deliver again within **40 s** to chain a combo (up to **×3** pay)
- 5 vehicles with real trade-offs — two-wheelers and autos squeeze through galis, the SUV barely slows down off-road. Unlock them with career earnings.

| Vehicle | Feel | Galis | Off-road | Pay | Unlock |
|---|---|---|---|---|---|
| Scooty | nimble | ✅ | weak | ×1.0 | free |
| Bike | fastest, twitchy | ✅ | weak | ×1.1 | ₹2,000 |
| Auto | wide, charming | ✅ | okay | ×1.2 | ₹5,000 |
| Sedan | planted | ❌ | weak | ×1.15 | ₹10,000 |
| SUV | heavy, unstoppable | ❌ | strong | ×1.3 | ₹20,000 |

## Run locally

```bash
npm install
npm run dev        # play at the printed localhost URL
npm test           # 40 vitest specs (map pipeline, physics, scoring, missions)
npm run build-map  # re-fetch Deoghar from OpenStreetMap (Overpass) → src/data/deoghar-map.json
```

## Global leaderboard (optional)

Without configuration the leaderboard is per-device. To make it global:

1. Create a free [Supabase](https://supabase.com) project
2. Run `supabase/schema.sql` in its SQL editor
3. Copy `.env.example` → `.env` and fill `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`

Scores submit anonymously (insert-only RLS); failed submits queue and retry.

## How it's built

- **Vanilla Three.js** world (no react-three-fiber): road ribbons + seeded procedural buildings (OSM has only ~98 footprints for Deoghar, so the town is grown along the real road graph), instanced trees/lamps, primitive-built Baidyanath temple, real Shivganga water polygon
- **React + Tailwind** "Bazaar Arcade" UI — parcel-tag paper cards, truck-art bunting, Anton + Bricolage Grotesque + Devanagari accents
- **Pure-function game logic** (arcade vehicle model, road-class raster grid, mission generator, payout/combo math) covered by vitest
- **WebAudio synth** — engine hum, per-vehicle horns, delivery chimes; zero audio files
- zustand bridges the 60 fps game loop and React at 10 Hz

Built with [Claude Code](https://claude.com/claude-code). Map data © OpenStreetMap contributors (ODbL).
