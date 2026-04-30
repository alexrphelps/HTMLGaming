# 🤖 Gloomvault Extraction - AI Context & State Tracker

**Notice to AI Agents:** Read this document first to understand the current state of the Gloomvault Extraction project before making changes. Update this document as you complete major milestones.

## 📌 Project Overview
A real-time top-down 3/4 perspective dungeon crawler with extraction mechanics and randomized loot progression. Built using pure JavaScript and HTML5 Canvas 2D for the GameHub platform.

## 🏗️ Architecture & Design Decisions
*   **Integration:** Runs in an iframe wrapper (`GloomvaultExtraction.js`) via GameHub.
*   **Perspective:** Top-down 3/4 view (not true isometric).
*   **Engine:** Custom `requestAnimationFrame` loop in `js/core/GameEngine.js`.
*   **Rendering:** Canvas 2D (`js/core/Renderer.js`), currently using geometric shapes, structured to support sprite sheets with 5-10 frames per animation in the future.
*   **World:** Procedurally generated continuous grid (Cluster Blob rooms, 2-tile wide wobbling cave corridors, and cellular automata smoothing) via `js/systems/MapGen.js`. Configurations are externalized in `js/config/MapConfig.js`.
*   **Input:** WASD movement, Mouse aiming (relative to camera), Shift to dodge. Handled by `js/core/Input.js`.

## 🟢 Current State (Phase 8 In Progress)
*   **Menu Shell:** `index.html` and `style.css` implemented for screen switching, including Stash and Game Over screens.
*   **Core Engine:** Active. Delta time, update/render loops, and AABB separated-axis wall collision are working perfectly.
*   **Camera:** Follows the player, culls off-screen rendering, and supports screenshake effects on impact.
*   **Player:** Can move, dodge (with dash trail particles), aim, and has a fully functional inventory system with stat recalculation. Supports animation states (Idle, Run, Attack) falling back to primitive shapes when sprites are missing.
*   **Combat:** Primary attack spawns projectiles with cooldowns. Projectiles collide with walls and enemies, spawning floating text feedback and impact spark particles.
*   **Map:** Dynamically generates organic cave/dungeon hybrids.
*   **Pathfinding & AI:** A* Pathfinding active. Grunt, Ranged, and Brute enemy types. Enemies support animation states.
*   **Loot & Extraction:** Enemies drop loot on death. Player extracts via an `ExtractionPortal` at the map's end. Dead means lost active inventory. New extraction exit screen added to salvage items or store them in the stash.
*   **Upgrades & Scraps:** Integrated a new "Scraps" economy. Scraps can be used to upgrade items in the stash up to 5 times (boosting stats by 10% each time). Items can be salvaged for scraps upon extraction.
*   **🛠️ Recent Fixes/Additions:** Added a high-performance ParticleSystem for juice (sparks and dash trails). Integrated sprite rendering logic gracefully falling back to Canvas primitives. Implemented Camera screenshake. Added Scrap economy, item upgrading via drag-and-drop in Stash, extraction screen and fixed stash overflow bug upon extracting.

---

## 🚀 Execution Roadmap for AI Agents
When starting a new session, pick the lowest incomplete phase and execute it entirely.

### 🎒 Phase 8: Advanced Loot & Abilities (Continued)
1.  **Loot Modifiers Details:** Improve UI to show modifiers more clearly.
2.  **Secondary Abilities:** Expand the `Weapon` class to support a Right Click secondary ability.
3.  **Trinket Integration:** Map Trinket slots to Q/E active abilities.

### ✨ Additional Enhancements & Future Changes
*   **Advanced Loot Generation:** Implement prefix/suffix system natively visible on item names.
*   **Unique Legendary Effects:** Add custom logic hooks for legendary items (e.g. chance to shoot 3 projectiles, explode on hit, trigger chain lightning).
*   **Secondary Abilities (Right Click) & Trinkets (Q/E):** Expand the `Weapon` class to support a secondary attack and connect Trinket equipment slots to active ability triggers.
*   **Floor Transitions:** Add stairs down to advance to higher difficulty floors during the same run before extracting.
*   **Boss Mechanics:** Create dedicated Boss entities with phased combat, AoE hazard attacks, charges, and projectile bursts.
*   **Inventory Quality of Life:** Add right-click quick-equip/unequip functionality to bypass manual drag-and-drop.
