# Gloomvault Extraction

Gloomvault Extraction is a standalone HTML5 Canvas extraction roguelite inside GameHub. Each run sends the player into a procedurally generated vault to fight through escalating enemies, collect randomized gear, and decide whether to extract safely or push deeper for better rewards.

The game is playable through GameHub or by opening [index.html](/C:/Users/alexr/source/repos/HTMLGaming/games/gloomvault-extraction/index.html) directly in a browser. It is pure JavaScript with no build step and relies on global script load order.

## Core Loop

1. Review stash gear and scraps.
2. Choose a map family or Random.
3. Enter a generated dungeon floor.
4. Fight, loot, equip upgrades, and use trinket abilities.
5. Interact with rare dungeon services when they appear.
6. Extract to bank loot, or descend for harder floors and stronger rewards.
7. On death, lose the active run gear and backpack while permanent stash items and scraps remain.

## Current Features

### Combat and Player Systems

- Real-time WASD movement with mouse aiming.
- Two weapon slots and two trinket slots.
- Dodge, shield regeneration, heal-over-time effects, melee lunge behavior, lifesteal, thorns, stagger, knockback, and wall-slam damage.
- Equipment-driven stat recalculation for damage, attack speed, move speed, armor, damage reduction, dodge cooldown, and more.
- Durability on non-starter weapons and armor, including broken-item handling.
- Action bar cooldown display plus a durability HUD for equipped gear.

### Weapon and Element Systems

- Weapon archetypes presented as Wand, Staff, Crossbow, Longbow, Shortsword/Lance, and Greataxe/Scythe.
- Elemental variants: Frost, Fire, Felfire, Holy, Shadow, Poison, and Arcane.
- Arcane charge-and-release attacks for player weapons.
- Overcharged Staff variant with close-range stagger behavior.
- Trinket abilities including instant healing, nova burst, dash, and regeneration.
- Colored status-effect rings and floating damage text for active effects and damage-over-time.

### Loot, Stash, and Progression

- Randomized Common, Epic, and Legendary gear.
- Floor-scaled gear score and rarity scaling.
- Armor implicits, modifier pools, prefixes, suffixes, and passive-trait rolls.
- Permanent stash plus run inventory management through drag and drop.
- Scrap economy for salvage, upgrades, and repairs.
- Item upgrades up to `+5`, including stronger modifiers and fully restored durability.
- Extraction screen with stash transfer, salvage flow, and high-value loot confirmation.

### Dungeon Services

- Blacksmith floor service for mid-run salvage, upgrades, and repairs.
- Void Bank floor service for mid-run stash access, deposit/withdraw, equipment swaps, salvage, upgrades, and repairs.
- Healing Well floor service that heals to full once, then grants a temporary regenerative buff.
- Service overlays pause gameplay while open.
- `Tab` closes Blacksmith and Void Bank overlays.

### Maps and Run Structure

- Nine map families:
  - `default`
  - `rigid_dungeon`
  - `deep_caverns`
  - `the_labyrinth`
  - `arena_halls`
  - `crypt_crossroads`
  - `ironforged`
  - `fractured_rift`
  - `gauntlet_passage`
- Procedural layouts including sequential, hub, ring, cluster, and linear styles.
- Floor transitions through doors and holes.
- Extraction portals on even-numbered floors when placement succeeds.
- Fallback exit generation to keep runs completable.
- Fog-of-war minimap plus expanded minimap inside the inventory overlay.

### Boss and Encounter Systems

- Optional sealed boss rooms with locked entrances and three external seal buttons.
- Boss reward flow with locked chests that open after the encounter.
- Stacked boss HUD that only appears for active boss-tier enemies in combat.
- Main boss roster including Vault Warden, Storm Seer, Iron Maw, and Blight Priest.
- Boss modifiers and borrowed powers for encounter variation.
- Floor guardian mini-boss chance outside boss rooms.
- Squad-aware enemy AI with patrol, investigate, chase, reposition, dodge, stagger, and flee states.

### Presentation and Technical Features

- Standalone menu, stash, extraction, inventory, service, and game-over screens.
- Sprite-backed rendering for player, enemies, loot chests, extraction portals, and dungeon services with primitive fallback rendering.
- Particle effects, floating combat text, hit feedback, and screenshake.
- Built-in dev panel for spawning loot, enemies, exits, portals, Blacksmiths, and Void Banks when dev mode is enabled.

## Controls

- `WASD`: move
- `Mouse`: aim
- `Left Mouse`: weapon slot 1 attack
- `Right Mouse`: weapon slot 2 attack
- `Q`: trinket slot 1
- `E`: trinket slot 2
- `Shift`: dodge
- `Tab` or `I`: open or close inventory during play
- `Tab`: close Blacksmith or Void Bank overlay when one is open
- `F`: interact with loot, chests, portals, transitions, boss buttons, boss entrances, and dungeon services
- `` ` ``: open the dev panel when enabled

## Screens

- Main Menu
- Map Selection
- Stash and Equipment
- Play Screen
- Inventory Overlay
- Dungeon Service Overlay
- Extraction Screen
- Game Over Screen

## Persistence

The game currently stores long-term state in browser `localStorage`:

- `gloomvault_stash`
- `gloomvault_equipment`
- `gloomvault_scraps`

## Key Files

- [GloomvaultExtraction.js](/C:/Users/alexr/source/repos/HTMLGaming/games/gloomvault-extraction/GloomvaultExtraction.js): GameHub wrapper
- [index.html](/C:/Users/alexr/source/repos/HTMLGaming/games/gloomvault-extraction/index.html): standalone page and screen markup
- [css/style.css](/C:/Users/alexr/source/repos/HTMLGaming/games/gloomvault-extraction/css/style.css): game UI and overlay styling
- [js/main.js](/C:/Users/alexr/source/repos/HTMLGaming/games/gloomvault-extraction/js/main.js): screen flow, stash, inventory, extraction, dungeon service UI, tooltips, HUD, and persistence
- [js/core/GameEngine.js](/C:/Users/alexr/source/repos/HTMLGaming/games/gloomvault-extraction/js/core/GameEngine.js): runtime loop, floor generation, combat orchestration, interactions, boss flow, and HUD updates
- [js/systems/MapGen.js](/C:/Users/alexr/source/repos/HTMLGaming/games/gloomvault-extraction/js/systems/MapGen.js): procedural map generation and connectivity repair
- [js/config/BossConfig.js](/C:/Users/alexr/source/repos/HTMLGaming/games/gloomvault-extraction/js/config/BossConfig.js): main boss roster, modifiers, thresholds, and borrowed powers
- [AI_STATE.md](/C:/Users/alexr/source/repos/HTMLGaming/games/gloomvault-extraction/AI_STATE.md): deeper maintenance and coupling notes for future development work

## Running and Testing

Open [index.html](/C:/Users/alexr/source/repos/HTMLGaming/games/gloomvault-extraction/index.html) in a browser, or launch the game through the GameHub root app.

There is no formal gameplay automation workflow yet, but Jest coverage exists for major systems:

```powershell
npm test -- tests/coverage/Gloomvault.systems.test.js
```

Recommended manual checks after gameplay changes:

1. Launch the game and start a run from a specific map and from Random.
2. Verify movement, aiming, combat, minimap, inventory, and extraction.
3. Use stash salvage, upgrades, and repairs.
4. Spawn or find a Blacksmith and Void Bank, then confirm overlays pause/resume correctly and `Tab` closes them.
5. If touching map or boss logic, verify exits always exist and boss rooms unlock and pay out correctly.
