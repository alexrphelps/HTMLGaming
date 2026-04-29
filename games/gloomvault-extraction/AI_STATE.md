# 🤖 Gloomvault Extraction - AI Context & State Tracker

**Notice to AI Agents:** Read this document first to understand the current state of the Gloomvault Extraction project before making changes. Update this document as you complete major milestones.

## 📌 Project Overview
A real-time top-down 3/4 perspective dungeon crawler with extraction mechanics and randomized loot progression. Built using pure JavaScript and HTML5 Canvas 2D for the GameHub platform.

## 🏗️ Architecture & Design Decisions
*   **Integration:** Runs in an iframe wrapper (`GloomvaultExtraction.js`) via GameHub.
*   **Perspective:** Top-down 3/4 view (not true isometric).
*   **Engine:** Custom `requestAnimationFrame` loop in `js/core/GameEngine.js`.
*   **Rendering:** Canvas 2D. Currently using placeholder geometric shapes, but `js/core/Renderer.js` is structured to support sprite sheets with 5-10 frames per animation in the future.
*   **World:** Procedurally generated continuous grid (Cluster Blob rooms, 2-tile wide wobbling cave corridors, and cellular automata smoothing) via `js/systems/MapGen.js`.
*   **Input:** WASD movement, Mouse aiming (relative to camera), Shift to dodge. Handled by `js/core/Input.js`.

## 🟢 Current State (Phase 2 Completed)
*   **Menu Shell:** `index.html` and `style.css` implemented for screen switching.
*   **Core Engine:** Active. Delta time, update/render loops, and basic AABB/Circle tile collision are working.
*   **Camera:** Follows the player and culls off-screen rendering.
*   **Player:** Can move, dodge (with cooldown), and aim towards the mouse cursor.
*   **Map:** Generates a 100x100 tilemap with interconnected rooms.

## 🚧 Next Immediate Steps (Phase 3: Combat)
1.  **Weapon System:** Create a base `Weapon` class defining attack speed, damage, and hitbox geometry (arcs for melee, lines/circles for projectiles).
2.  **Combat Controller:** Integrate primary (Left Click) and secondary (Right Click) attacks into `js/entities/Player.js`.
3.  **Hitboxes & Collision:** Implement Entity-to-Entity collision detection in `GameEngine.js` for combat resolution.

## 🔮 Future Roadmap
*   **Phase 4 - Loot & Inventory:** Implement `js/systems/Loot.js` (Gear Score, Rarity, Modifiers) and `js/systems/Inventory.js` (5x5 grid, Stash persistence via localStorage).
*   **Phase 5 - Enemies:** Implement basic AI (Chase, Attack) and rare modifier scaling in `js/entities/Enemy.js`.
*   **Phase 6 - Extraction:** Add spawnable extraction portals, run completion logic (save to stash), and death logic (wipe inventory).
*   **Phase 7 - Polish:** Replace colored rects with actual sprite sheets and add basic sound effects.
