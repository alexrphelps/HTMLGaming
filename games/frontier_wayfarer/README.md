# Frontier Wayfarer

Frontier Wayfarer is a separate game from the original Mini Invaders and must stay separate.

- Original game: `games/miniinvaders/`
- Frontier Wayfarer game: `games/frontier_wayfarer/`

Do not replace, rename, or fold Frontier Wayfarer changes back into the original arcade game unless a future task explicitly asks for that.

## Purpose

This game is the open-universe evolution of Mini Invaders: a single-player top-down inertial starfighter RPG built in plain browser JavaScript with no build step and no runtime dependencies.

The intended player fantasy is:

1. Fly one personal ship across a handcrafted twenty-region universe.
2. Aim directly with the mouse while managing inertia, heat, energy, shields, cargo, and module loadout.
3. Progress through contracts, discoveries, combat, factions, trade, salvaging, and ship upgrades.
4. Grow a long-lived career that survives defeat, with losses focused on unbanked rewards, cargo risk, and repairable module damage.

This is not meant to drift back toward a short-session arcade score attack. Every meaningful change should be judged against the RPG starfighter career direction first.

## Non-Negotiable Product Direction

- Keep Frontier Wayfarer under `games/frontier_wayfarer/` with its own GameHub wrapper and standalone `index.html`.
- Preserve the no-build browser-script architecture under `window.MiniInvadersV2`.
- Keep the universe finite and region-authored, not endless procedural space.
- Keep the game single-player.
- Keep one persistent personal ship rather than a fleet or disposable hull loop.
- Keep pilot traits separate from ship modules.
- Keep module effects and trait effects funneled through centralized derived-stat calculation instead of mutating duplicate runtime fields.
- Keep progression gated through milestones and accomplishments rather than exposing everything at once.

Out of scope unless explicitly requested:

- Multiplayer
- Planetary landings
- Walking characters
- Multiple owned ships
- Refactoring to TypeScript, bundlers, or frameworks

## Current Gameplay Contract

### Flight And Combat

- The ship always faces the mouse pointer for aiming.
- Movement is inertial and top-down.
- Current flight controls:
  - `W` / `S`: forward and reverse thrust
  - `A` / `D`: strafe
  - Mouse 1: fire `primary1`
  - Mouse 2: fire `primary2` when equipped
  - `F`: interact / dock
  - `R`: charge or disengage the fitted Asterion Light Drive
  - `Space`, `Q`, `E`, `Shift`: active module slots
  - `Tab`: cycle target
  - `M`, `T`, `C`: open key panels
- There is no intrinsic boost anymore. Mobility spikes come from equipped active modules.
- Heat and energy are core combat constraints and should remain central to combat readability and loadout decisions.

### World Structure

- The universe is a 5-by-4 chart of twenty dense authored regions. The original Meridian, Helion, Shatterline, Null, and Violet regions form its central career space; fifteen larger frontier regions surround them.
- Each region occupies a 9,000-by-7,200 sector inside the finite 45,000-by-28,800 world envelope.
- World streaming is deterministic around a saved world seed.
- Chunk generation and floating-origin behavior are part of the technical contract and should not be casually removed.
- Region traversal is seamless; this is not an encounter-map structure.
- The mid-game Asterion Light Drive shifts travel into a separate interaction-free visual layer while preserving the ship's real world coordinates.

### Economy

The old single diamond currency has been replaced by three wallet resources:

- Aetherium: routine trade, repairs, insurance, cargo systems, common contracts
- Sunshards: discoveries, exploration tech, surveying, retraining
- Helionite: weapons, shields, chassis, combat hardware, faction gear

Important wallet rules:

- Wallet state is split into `banked` and `unbanked`.
- Flight rewards usually go into `unbanked`.
- Docking deposits all unbanked resources into the banked wallet.
- Destruction removes unbanked resources but preserves banked balances.
- Prices and rewards use object-shaped multi-currency values, not single numbers.

## Progression Contract

Progression should feel staged and earned. Hidden or locked content is expected.

### Unlock Flow

The current intended progression order is:

1. `Cold Start` tutorial:
   - unlocks Guild contracts
   - unlocks Trade Tier I
   - unlocks the `Shift` ability slot
   - awards Afterburner
2. `Parts Run` tutorial:
   - unlocks shield systems
   - awards the first Scout shield generator
3. After 3 completed non-tutorial contracts:
   - unlock escort contracts
   - unlock Trade Tier II
   - unlock the `Space` ability slot
   - unlock broader civilian tech
4. First anomaly discovery:
   - unlock surveys
   - unlock Sunshard technology
   - unlock the `Q` ability slot
   - unlock Blink Drive
5. Level 3 plus 10 kills:
   - unlock bounties
   - unlock stronger combat modules
   - unlock EMP Wave
6. Corsair standing 10:
   - unlock smuggling
   - unlock restricted relic trading
7. Faction membership or 10 independent contracts:
   - unlock the `E` ability slot
8. Faction standing 25:
   - unlock assaults
   - unlock advanced faction hardware
9. Anomaly Rim visit plus level 6:
   - unlock Trade Tier III
   - unlock advanced exploration and shield tech

If future progression changes are made, update the unlock evaluator and the milestone messaging together so the HUD and panels still tell the truth.

### Ship Progression

The player owns one ship, `Wayfarer`, and improves it over time.

Current ship slot model:

- `primary1`
- `primary2`
- `reactor`
- `engine`
- `defense`
- `cargo`
- `utility1`
- `utility2`
- `utility3`
- `abilitySpace`
- `abilityQ`
- `abilityE`
- `abilityShift`

The old dedicated secondary-weapon slot is gone. Weapon groups now map to the two primary slots.

### Shields

New careers start shieldless until the tutorial awards the first generator.

Shield behavior is module-driven, not globally intrinsic. Current shield families:

- Scout: 55 capacity, 12/sec recharge, 2s delay
- Balanced: 95 capacity, 8/sec recharge, 3s delay
- Bulwark: 165 capacity, 4/sec recharge, 5s delay
- Prism: 80 capacity, 16/sec recharge, 1.5s delay

Future shield changes should keep the identity tradeoff between capacity, recharge speed, and post-hit delay.

### Pilot Traits

Pilot progression is permanent and separate from ship equipment.

Disciplines:

- Ace
- Engineer
- Pathfinder
- Operator

Each discipline has:

- four 3-rank traits
- one capstone

Capstones should remain gated by both discipline investment and a matching achievement. Full retraining should remain station-based and paid, not free everywhere.

## UI Direction

The visual identity should continue to evolve from classic Mini Invaders rather than abandoning it.

Keep:

- black-space presentation
- neon green and cyan telemetry roots
- geometric ship readability
- cockpit/combat HUD feel
- monospace instrumentation mood

Do not regress into:

- flat all-green hierarchy
- emoji-dependent iconography
- oversized screen-blocking overlays
- cramped 800x600-first layout assumptions
- utility UI competing with combat-critical data

Current UI contract:

- Sparse world HUD during flight
- Responsive start command layout and cockpit workspace that scale from wide desktop views down to narrow embedded frames
- Desktop cockpit navigation uses a dedicated system rail; compact layouts convert it to a horizontal strip
- The Station header always includes an Undock button when docked, regardless of which cockpit tab is open
- Bottom-center systems dock for hull, shield, energy, and heat
- Ability HUD aligned with the systems dock
- Currency visible in world HUD, start screen, pause/panel header, station screens, and defeat flow
- Distinct full-screen cockpit panels for contracts, trade, ship, traits, factions, navigation, and settings
- Code-drawn or asset-based non-emoji iconography, including the custom reticle cursor
- The Wayfarer silhouette visibly reflects fitted weapons, defenses, cargo, utilities, drives, and active modules
- Primary and secondary fire should emit from the visible weapon tip for every ship orientation, not from the ship centerline

## World Hazards

- Asteroids drift and rotate in three size tiers. Weapon damage splits large rocks into medium fragments, medium rocks into small fragments, and destroys small rocks for a modest unbanked Aetherium reward.
- The starting Trade Belt sector should remain comparatively sparse so the opening route reads clearly.
- Asteroid mutations persist while a career remains loaded, including across chunk unloads, but are intentionally not written into the save file.
- The sector perimeter is a visible nebula rather than a collision wall. Flight and Blink may cross it, but escalating nebula exposure damages hull directly and rapidly becomes lethal.
- Nebula gas should extend visibly into the end zones, with a thicker and denser layered presentation well beyond the practical boundary so the hazard reads as a region, not a line.

## Code Architecture

This game uses ordered browser scripts. Script order in `index.html` is part of the runtime contract.

Current script order:

1. `js/namespace.js`
2. `js/data.js`
3. `js/math.js`
4. `js/state.js`
5. `js/wallet.js`
6. `js/unlocks.js`
7. `js/progression.js`
8. `js/world.js`
9. `js/economy.js`
10. `js/contracts.js`
11. `js/save.js`
12. `js/combat.js`
13. `js/abilities.js`
14. `js/lightSpeed.js`
15. `js/input.js`
16. `js/renderer.js`
17. `js/game.js`
18. `js/ui.js`
19. `js/main.js`

High-level ownership map:

- `namespace.js`: root namespace bootstrap
- `data.js`: authored/static game definitions
- `state.js`: canonical save/runtime state creation
- `wallet.js`: all currency normalization and transactions
- `unlocks.js`: progression milestone evaluation and visibility rules
- `progression.js`: trait logic, derived ship stats, equipment fitting, respec logic
- `world.js`: region selection, chunks, landmarks, world streaming, floating origin
- `economy.js`: markets, pricing, buying, selling, module purchases
- `contracts.js`: contract generation, boards, rewards, faction joining/leaving
- `save.js`: schema migration and localStorage persistence
- `combat.js`: damage, defeat, repair consequences
- `abilities.js`: active-module behavior and cooldowns
- `lightSpeed.js`: Asterion charge, shifted travel, steering, boundary exit, and rematerialization state
- `input.js`: keyboard and mouse state
- `renderer.js`: canvas rendering and HUD-space drawing support
- `game.js`: main runtime loop and cross-system orchestration
- `ui.js`: cockpit panels, HUD text, button actions, menu flows
- `main.js`: page bootstrapping

## Persistence Contract

- Current save schema version is `2`.
- Saves must continue to migrate forward safely.
- Legacy diamonds migrate to banked Aetherium at 1:1.
- Existing owned modules should be preserved during migration.
- Legacy shield modules should map into the new shield families rather than being dropped.
- Save data should store stable ids and state, not copied definition blobs.

Important save domains:

- pilot progression
- banked and unbanked wallet balances
- ship chassis, slots, owned modules, cargo, and module damage
- reputations and allegiance
- contract board and active contract state
- discoveries and visited regions
- economy state
- world seed and location
- ability cooldown/effect state where needed

## Agent Rules For Future Changes

- Read the existing Frontier Wayfarer files before changing progression or economy. Several systems are tightly linked through `Wallet`, `Unlocks`, and `Progression`.
- Treat tests as behavioral contracts, especially `tests/coverage/FrontierWayfarer.systems.test.js`.
- Keep player-facing milestone text synchronized with real unlock logic.
- Prefer data-driven additions in `data.js` before hardcoding new branches in UI or loop code.
- If adding modules or traits, wire them through derived stats and stable ids.
- If adding new rewards or costs, route them through `wallet.js`.
- If changing defeat behavior, preserve the long-term-career model.
- If changing controls, update input handling, UI control text, and tests together.
- If changing loadout slots, update state defaults, migration, fitting logic, UI, and tests together.
- If changing save shape, add migration logic rather than breaking existing careers.

## Verification Expectations

Focused automated coverage already exists and should be treated as the minimum safety net for structural changes.

Recommended checks after meaningful Frontier Wayfarer work:

```powershell
Get-ChildItem games\frontier_wayfarer\js\*.js | node --check
npx jest --coverage=false tests/coverage/FrontierWayfarer.systems.test.js
```

If a change touches launcher registration or risks original-game regressions, also run the relevant original Mini Invaders coverage.

## Near-Term Expansion Areas

These are good follow-up directions that match the current architecture:

- deeper faction quest arcs
- richer authored landmarks and regional encounter identities
- better contract variety and bespoke mission scripting
- more active and passive module combinations
- additional milestone-driven market and crafting layers
- stronger anomaly-region content and discovery payoffs
- more expressive combat enemy roles that respect mouse-facing flight

These are poor directions unless the game is intentionally re-scoped:

- turning Frontier Wayfarer back into a wave-arena arcade loop
- making every shop/category available immediately
- collapsing the three-resource economy back into one number
- moving core progression into faction allegiance so hard that build freedom breaks
- bypassing unlocks by sprinkling one-off UI exceptions
