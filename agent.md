# Agent Directives: SpellBridge 3D (start.ng WebGL Game)

## Project Overview
You are building "SpellBridge 3D", a vibrant, low-poly educational word-building puzzle runner built with Three.js, Vite, and TypeScript. Designed to be hosted directly on the `start.ng` platform at `spellbridge.start.ng`.

Players navigate across scenic water landscapes by spelling target words letter-by-letter, hopping across procedural stepping stones and constructing bridges to safely reach the next island.

---

## Strict start.ng Platform Requirements

1. **Static Build & Output:**
   - Bundler must output to `dist/` with relative asset paths (`base: './'` in `vite.config.ts`).
   - The compiled `dist/` folder must be committed to the repository (ready-to-play `index.html` without requiring server builds).
   - Absolute asset paths (e.g., `/style.css`) are strictly forbidden; use relative paths `./style.css`.
   - Include a 16:10 `cover.png` (at least 640x400, recommended 1600x1000) inside `public/` and `dist/` featuring the game title "SpellBridge 3D".

2. **Authentication & Character Connection:**
   - Implement the `askStartNg` iframe helper targeting `https://start.ng/connect` via `postMessage` with `requestId` correlation.
   - Send `{ type: 'startng:whoami' }` and listen for `startng:user`.
   - Fall back seamlessly to `reply.guest` or mock local data when running on localhost.
   - Re-check user identity on `visibilitychange` and `focus` events.
   - Include sign-in redirect support: `https://start.ng/?return_to=${encodeURIComponent(location.origin + location.pathname)}`.

3. **Character Rule & Central Styling:**
   - Character schema provided by `player.style`:
     - `primaryColor` (hex `#rrggbb`) -> Character body / tunic / primary outfit.
     - `secondaryColor` (hex `#rrggbb`) -> Accents, pants, shoes, backpack, or bridge step glow.
     - `skinColor` & `hairColor` -> Stylized low-poly avatar head, hands, and hair.
     - `hat` & `accessory` -> Procedural attachments (e.g., cap, crown, beanie, glasses, backpack).
   - Display the floating HUD profile card:
     - Avatar face (`player.face`) — MUST safely fall back to an inline SVG/initial badge if empty/undefined without leaking raw HTML attributes.
     - Name (`player.name`) and Account handle (`@${player.account}`).
     - Guest sign-in button if not signed in.

4. **Leaderboard & Scores (`startng.json`):**
   - Place `startng.json` in `public/` (so it builds directly into `dist/`):
     ```json
     {
       "leaderboard": {
         "stats": [
           { "key": "words_spelled", "label": "Words Spelled", "order": "highest", "format": "number" },
           { "key": "accuracy", "label": "Accuracy (%)", "order": "highest", "format": "number" },
           { "key": "best_streak", "label": "Best Streak", "order": "highest", "format": "number" }
         ]
       }
     }
     ```
   - On round over / level completion, submit stats for signed-in players:
     `askStartNg({ type: 'startng:score', stats: { words_spelled: totalWords, accuracy: Math.round(acc), best_streak: maxStreak } }, 'startng:scoreSaved')`
   - Read top scores via `askStartNg({ type: 'startng:leaderboard', limit: 10 }, 'startng:leaderboardData')`.
   - **CRITICAL UI RULE:** Leaderboard entries only return `{ rank, name, color, stats }` (NO `face` URL). Render colored circular initial badges using `entry.color`—never render an `<img>` tag for leaderboard rows.

5. **Performance & Hardware Safety (HP EliteBook Target):**
   - Keep draw calls under 50 with shared materials and geometry batching.
   - Cap `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` and clamp frame delta time `Math.min(clock.getDelta(), 0.1)`.
   - Audio synthesized via Web Audio API (zero external audio files).
   - Clean up off-screen geometries (`geometry.dispose()`, `material.dispose()`).

6. **Visual, Camera & Engine Directives:**
   - Soft cartoon lighting with warm directional sunlight and pastel hemisphere ambient.
   - Stylized isometric perspective camera that smoothly interpolates (`lerp`) its Z and X position every frame to follow the player character across the bridge.
   - Procedural animated low-poly water plane and start/finish island banks using Three.js primitives.
   - Clear top-center Word Clue HUD showing the emoji hint, letter slots (e.g., `F R _ _`), hearts (`❤️❤️❤️`), and current streak.

7. **Publishing Pipeline:**
   - Pre-flight check: `POST https://api.start.ng/games/check` with payload `{"repo_url": "<REPO_URL>", "name": "spellbridge"}`.
   - Publish trigger: `POST https://api.start.ng/games/publish` with payload `{"repo_url": "<REPO_URL>", "name": "spellbridge"}`.

