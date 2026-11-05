# 🌉 SpellBridge 3D

[![start.ng Platform](https://img.shields.io/badge/Platform-start.ng-3b82f6?style=flat-square)](https://spellbridge.start.ng)
[![Three.js](https://img.shields.io/badge/Three.js-r160-black?style=flat-square&logo=three.js)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)

**SpellBridge 3D** is a vibrant, low-poly educational word-building puzzle runner built with Three.js, Vite, and TypeScript. Hosted directly on the [`start.ng`](https://start.ng) gaming platform at **[`spellbridge.start.ng`](https://spellbridge.start.ng)**.

Players navigate across scenic water landscapes by spelling target words letter-by-letter, hopping across procedural stepping stones and constructing bridges to safely reach the next island.

---

## 🎮 Gameplay & Educational Features

* **Letter-by-Letter Spelling:** Decode emoji clues (e.g. 🐸 `F R _ G`, 🐱 `C A T`, 🚀 `R O C K E T`) and hop to the correct next letter among distractors.
* **Dynamic Stepping Stones:**
  * **Correct Letter:** Locks the stone in radiant emerald green, triggers celebratory particle sparkles, advances spelling progress, and sounds an ascending harmonic chime.
  * **Wrong Letter:** Wobbles and sinks into the water, deducts 1 heart (❤️❤️❤️), and bounces the player back to the previous safe row.
* **Curated Vocabulary Engine:** 60+ kid-friendly words spanning 3 to 6 letters across 4 progressive difficulty stages.
* **Procedural Humanoid Avatar:** 100% Three.js primitive geometry (zero external 3D models) mapped to the player's `start.ng` avatar customization schema (`primaryColor`, `secondaryColor`, `skinColor`, `hairColor`, `hat`, `accessory`).
* **Juicy Hop Physics:** Parabolic sine-curve hop arcs (`y = Math.sin(t * Math.PI) * hopHeight`) with cartoon squash & stretch upon jumping and landing.
* **Zero External Audio Files:** All sound effects (wood hops, ascending chimes, water splash wobbles, victory fanfares) are synthesized dynamically via the Web Audio API.
* **Smooth Camera Follow:** Stylized isometric perspective camera that continuously lerps across the river channel to track the adventurer.

---

## 🕹️ Controls

| Control | Action |
| :--- | :--- |
| **W / Up Arrow** | Hop forward to the next stepping stone row |
| **A / Left Arrow** | Hop diagonally left to the next row |
| **D / Right Arrow** | Hop diagonally right to the next row |
| **Mouse Click / Tap** | Click or tap directly on any adjacent stone |
| **Touchscreen Swipe** | Swipe up, left, or right to hop in that direction |

---

## 🌐 start.ng Platform Integration

SpellBridge 3D adheres strictly to the `start.ng` platform directives:

1. **Static Build & Relative Assets:** Configured with `base: './'` in `vite.config.ts`. The compiled `dist/` directory is committed directly to the repository for serverless static hosting.
2. **Hidden Iframe Handshake:** Features `askStartNg` iframe communication targeting `https://start.ng/connect` via `postMessage` with unique `requestId` correlation.
3. **Player Identity & Profile Card:** Listens for `startng:whoami` and `startng:user`. Safely renders the player's avatar or falls back to an initial badge using `player.style.primaryColor` without leaking broken `<img>` tags.
4. **Cloud Leaderboards:** Leaderboard schema defined in `public/startng.json` tracking:
   * `words_spelled` (Total words completed)
   * `accuracy` (Spelling accuracy percentage)
   * `best_streak` (Consecutive correct letters without a miss)
5. **Leaderboard Rendering Rule:** Leaderboard rows render initial badges using `entry.color` (no `face` URLs) per platform specifications.

---

## 📁 Project Structure

```
spellbridge/
├── dist/                      # Production build tracked for start.ng hosting
│   ├── assets/                # Hashed JS and CSS bundles
│   ├── cover.png              # 16:10 cover artwork (1600x1000)
│   ├── index.html             # Static entry point with relative paths
│   └── startng.json           # Leaderboard configuration
├── public/                    # Static assets copied into dist/ on build
│   ├── cover.png
│   └── startng.json
├── scripts/
│   ├── generate-cover.html    # Standalone 16:10 canvas artwork generator
│   └── publish.js             # Deployment script for start.ng preflight & publish
├── src/
│   ├── data/
│   │   └── WordBank.ts        # 60+ curated words, distractors & progress tracker
│   ├── engine/
│   │   ├── GameLoop.ts        # Clamped delta loop & visibilitychange handlers
│   │   ├── SceneManager.ts    # Isometric camera, cartoon lighting & followTarget
│   │   └── WaterPlane.ts      # Low-poly procedural animated water mesh
│   ├── entities/
│   │   ├── BridgeManager.ts   # 3-lane stones, spelling rules & particles
│   │   └── PlayerCharacter.ts # Procedural avatar, hop arcs & input handlers
│   ├── services/
│   │   ├── SoundFx.ts         # Zero-dependency Web Audio synthesizer
│   │   └── StartNgService.ts  # start.ng postMessage bridge & leaderboard client
│   ├── ui/
│   │   ├── GameOverModal.ts   # Stats summary & Top 10 leaderboard
│   │   ├── InstructionsModal.ts# How-to-play rules & controls overlay
│   │   └── ProfileCard.ts     # Floating avatar card with guest sign-in hook
│   ├── main.ts                # Application bootstrap & lifecycle orchestrator
│   └── style.css              # Glassmorphic cartoon HUD styling
├── Agents.md                  # start.ng platform directives & design rules
├── index.html                 # Development HTML template
├── package.json
├── tsconfig.json
└── vite.config.ts             # Relative base configuration for start.ng
```

---

## 🚀 Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)

### Installation

```bash
# Clone the repository
git clone https://github.com/MUFTIATBAKARE/spellbridge.git
cd spellbridge

# Install dependencies
npm install
```

### Local Development

```bash
npm run dev
```

Open your browser at `http://localhost:3000`. On localhost, `StartNgService` automatically falls back to mock user and leaderboard data so you can test all features offline.

### Production Build

```bash
npm run build
```

Builds the static bundle into `dist/` with relative paths (`./assets/...`).

### Deploy to start.ng

```bash
node scripts/publish.js
```

This validates the build outputs, triggers the pre-flight check on `https://api.start.ng/games/check`, and requests deployment on `https://api.start.ng/games/publish`.

---

## 📜 License

MIT License. Built for the `start.ng` educational game collection.

