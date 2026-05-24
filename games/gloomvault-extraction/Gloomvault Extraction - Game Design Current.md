# Gloomvault Extraction - Game Design Current

This document describes the game that exists now, not only the original concept.

## High Concept

Gloomvault Extraction is a top-down 3/4 dungeon extraction roguelite about entering a procedurally generated vault, surviving escalating combat, collecting randomized gear, and deciding whether to extract safely or push deeper for better rewards.

The core tension is risk versus permanence: loot only becomes safe when extracted into the stash. Death wipes the active run equipment and backpack, while the long-term stash and scraps remain.

## Player Fantasy

The player is a vault raider building a personal stash across dangerous runs. Each run starts with chosen stash gear and can end in one of three broad outcomes:

- Extract: keep backpack loot by moving it into stash or salvage it for scraps.
- Descend: advance to a harder floor for stronger loot and greater danger.
- Die: lose carried loot and equipped run gear.

Rare dungeon services can bend that tension without removing it: a Blacksmith lets the player spend scraps to salvage, upgrade, or repair mid-run, while a Void Bank lets the player access the permanent stash from inside the dungeon.

## Current Game Loop

1. Open the main menu.
2. Review stash, equipment, scraps, upgrades, and repairs.
3. Choose a map style or Random.
4. Enter the vault.
5. Explore rooms and corridors with limited minimap vision.
6. Fight enemies using two weapons, dodge, and trinket abilities.
7. Pick up loot, open chests, and manage a 5x5 backpack.
8. Occasionally find a Blacksmith or Void Bank and decide whether to use it while exposed in the dungeon.
9. Find an extraction portal or a floor transition.
10. Extract to secure loot, or descend to continue the run.
11. On extraction, stash selected loot, salvage items for scraps, and return to menu.

## Screens And UI

- Main Menu: enter the vault or open stash.
- Map Selection: Random plus all configured map families.
- Stash Screen: starting equipment, stash grid, stat summary, scraps, salvage drop zone, upgrade drop zone, repair drop zone.
- Play Screen: canvas gameplay, health/shield bars, action bar, interaction hint, minimap, durability HUD, boss health bar.
- Inventory Overlay: pauses gameplay, shows equipment/backpack, stats, item tooltips/comparisons, and expanded minimap.
- Dungeon Service Overlay: pauses gameplay when opened from a Blacksmith or Void Bank; Blacksmith shows player inventory/equipment with salvage, upgrade, and repair, while Void Bank also shows the permanent stash.
- Extraction Screen: post-run loot handling, stash transfer, salvage, high-value loot confirmation.
- Game Over Screen: death state and return to menu.

## Controls

- WASD: move.
- Mouse: aim.
- Left Mouse: weapon slot 1 attack.
- Right Mouse: weapon slot 2 attack.
- Q: trinket slot 1 ability.
- E: trinket slot 2 ability.
- Shift: dodge in facing direction.
- Tab or I: open/close inventory overlay.
- F: interact with nearby loot, chests, portals, floor transitions, seal buttons, boss entrance, Blacksmith, or Void Bank.
- Backtick: developer panel when enabled.

## Player Systems

The player has health, optional shield, shield regeneration, movement, dodge, melee lunge support, equipment, backpack inventory, weapon cooldowns, trinket cooldowns, and heal-over-time effects.

Equipment slots:

- Helm
- Chest
- Pants
- Boots
- Weapon 1
- Weapon 2
- Trinket 1
- Trinket 2

Backpack:

- 5x5 grid.
- One item per slot.
- Drag/drop equipment and inventory management.
- Dropping a run item outside the inventory drops it into the world.

## Combat Design

Combat is real-time and aim-based. There is no auto-targeting. The player aims with the mouse and moves independently with WASD.

Current weapon archetypes:

- Wand: reliable single magic bolt.
- Staff Burst: short-lived cone of magical shards; overcharged staffs stagger enemies at melee range.
- Crossbow: fast fire, slight spread.
- Longbow: slow, high-damage long-range shot.
- Shortsword/Lance: short-lived forward hit, usually with lunge.
- Greataxe/Scythe: short-range spread attack.

Elemental weapon variants:

- Frost: light-blue slow.
- Fire: orange-red long burn.
- Felfire: green-red short stacking burn.
- Holy: gold-white radiance; enemy death shoots long-range radiance projectiles similar to Arcane Nova.
- Shadow: crimson-purple amplify; player projectiles pierce.
- Poison: dark-green sickness; enemy death shoots short-range sickness projectiles.
- Arcane: light-purple charge shot; hold and release or auto-fire at 3 seconds for up to 1.5x damage.

Active elemental effects render colored glow arcs around enemies and the player. If multiple effects are active, the glow circle is split evenly between their colors.

Special melee behavior:

- Player-owned melee has a close-range risk/reward damage multiplier.
- Rapier removes lunge, attacks faster, and grants movement speed.
- Lance extends lunge duration.

Trinket abilities:

- Healing Surge: instant heal.
- Arcane Nova: radial projectile burst.
- Phase Shift: directional dash.
- Regeneration Potion: heal over time.

Defensive stats:

- Armor reduces incoming damage through a diminishing-returns formula.
- Damage reduction is a separate capped percentage reduction.
- Shield can absorb damage and regenerate after a delay.
- Thorns reflects flat damage back to attackers.
- Lifesteal heals from dealt damage up to a cap.

## Enemy Design

Current enemy types:

- Grunt: melee chaser that can flee at low health.
- Ranged: keeps distance and shoots when it has line of sight.
- Brute: slower heavy enemy with telegraphed dash/cleave pressure.
- Boss: larger Vault Warden-style enemy that guards its room until aggroed, then chases and attacks.

Enemy modifiers:

- Some non-boss enemies roll elite variants.
- Fast elites move faster and appear yellow.
- Vampiric elites have more health and appear magenta.

Enemy behavior:

- Enemies use line of sight and A* pathfinding.
- Enemies wander until aggroed.
- Ranged enemies reposition based on distance.
- Brutes telegraph heavy attacks.
- Boss health UI appears only after the boss takes player damage.

## Dungeon And Map Design

Each floor is procedurally generated from a selected map family. Maps are tile-based, rendered as Canvas geometry, and use a fixed world-space camera viewport so browser zoom does not reveal more of the dungeon.

Current map families:

- Hybrid Vault: balanced rooms, caves, and wobbling corridors.
- Rigid Dungeon: compact square rooms and straight halls.
- Deep Caverns: huge organic caves and wide uneven tunnels.
- The Labyrinth: many small burrows with narrow erratic paths.
- Arena Halls: large square battle arenas and broad lanes.
- Crypt Crossroads: central hub with spoke-like wings.
- Ironforged: large ringway with inward/outward chambers.
- Fractured Rift: scattered clusters joined by jagged paths.
- Gauntlet Passage: linear combat-forward room chain.

Map-generation goals:

- Keep playable floors inside edge padding.
- Generate rooms and corridors from config metadata.
- Repair disconnected main rooms.
- Prune unreachable non-boss floor islands.
- Preserve sealed boss rooms until the player unlocks and opens them.
- Guarantee the player has at least one exit object.

## Floors, Extraction, And Risk

Runs can continue across floors. Descending generates a fresh floor and increases `currentFloor`.

Difficulty and loot use an effective floor value based on:

- Current descent depth.
- Starting gear score converted into a gear-based difficulty floor.

Extraction portals:

- Spawn on even-numbered floors when possible.
- Are placed near the final room.
- Cannot be used while enemies are nearby.
- End the run and move the player to the extraction screen.

Floor transitions:

- Doors and holes descend to the next floor.
- Usually 1-3 of each are attempted per generated floor.
- A fallback transition or portal is created if generation fails to place exits.
- Cannot be used while enemies are nearby.

Dungeon services:

- Blacksmith is a rare 2x2 dungeon object with an 8% independent spawn chance per generated floor.
- Void Bank is a rare 2x2 dungeon object with a 6% independent spawn chance per generated floor.
- Both require reachable 2x2 floor space in non-start rooms and avoid nearby exits, chests, boss-room seal buttons, and other services.
- Blacksmith opens mid-run salvage, upgrade, and repair for the player's active inventory/equipment.
- Void Bank opens full mid-run stash access, including deposit, withdraw, equipment swaps, salvage, upgrade, and repair.
- Service overlays pause the run while open and resume when closed.
- Items moved into stash through the Void Bank are permanent stash items; death rules otherwise stay unchanged.

Death:

- Stops the run.
- Removes saved active equipment.
- Leaves stash and scraps intact.
- Sends the player to the game-over screen.

## Boss Room Design

Boss rooms are optional special rooms attached to the map.

Current flow:

1. A sealed boss room is generated with a locked entrance tile.
2. Three seal buttons are placed outside the room.
3. The boss and 2-3 locked reward chests spawn inside.
4. The player activates all three buttons.
5. The entrance unlocks but remains closed until opened with F.
6. The player enters, damages the boss, and the boss health bar appears.
7. Boss death drops chest-style loot, unlocks reward chests, and triggers screenshake.

Boss rooms are deliberately protected in connectivity logic so generation fixes do not accidentally open or remove sealed content.

## Loot Design

Loot is randomized by floor, rarity, item type, modifiers, and sometimes traits.

Rarities:

- Common: 70% weight, lower power, 0-1 random modifiers.
- Epic: 25% weight, stronger, 1-3 random modifiers.
- Legendary: 5% weight, strongest, 2-4 random modifiers.

Gear score:

- Base roll is approximately floor x10 to floor x15.
- Rarity multiplies the base gear score.

Item types:

- Helm
- Chest
- Pants
- Boots
- Weapon
- Trinket

Armor pieces:

- Roll base armor from gear score and slot multiplier.
- Have slot-specific implicit modifiers.
- Can roll configured prefixes, suffixes, random modifiers, and traits.

Weapons:

- Roll a weapon subtype that determines combat behavior and fantasy presentation.
- Wands and Staffs always roll an element. Crossbows and Longbows have a 50% element chance. Melee weapons have a 25% element chance.
- Weapon item names use clean archetype names, prefixed only by element and variants such as `Overcharged Staff`; `Staff Burst` is the attack behavior.
- Use weapon-specific base damage/cooldown/projectile behavior.

Trinkets:

- Roll active abilities.
- Use active-ability-derived names such as Healing Charm, Arcane Nova Sigil, Phase Shift Talisman, and Regeneration Relic.
- Ability strength can improve through upgrades.

Traits:

- Epic items sometimes and Legendary items always may roll an extreme boon/curse-style passive trait.
- Examples include Glass Cannon, Blood Magic, Sluggish Titan, Berserker's Rage, Immovable Object, Vampire Lord, and Arcane Barrier.

## Stash, Scraps, Upgrades, And Repairs

Scraps are the meta-currency. They are earned by salvaging loot and spent on upgrades or repairs.

Salvage:

- Starter items are worth 0 scraps.
- Other items return value based on rarity and upgrade level.

Upgrades:

- Max upgrade level is +5.
- Each upgrade increases gear score and modifier values by 10%.
- Trinket active abilities improve in ability-specific ways.
- Upgrading fully repairs the item.

Repairs:

- Non-trinket non-starter items can have durability.
- Damaged items can be repaired with scraps.
- Repair cost scales with missing durability, gear score, and rarity.

Durability:

- Weapons lose durability when fired.
- Armor loses durability when the player takes damage.
- Broken gear provides no stats.
- Broken weapons cannot be used.
- Durability is shown in the HUD and item tooltip.

Mid-run service access:

- Blacksmith and Void Bank use the same salvage, upgrade, repair, scraps, durability, and equipment recalculation rules as menu stash systems.
- Void Bank is intentionally powerful because it can secure items before extraction when found.
- The developer panel can spawn Blacksmith and Void Bank objects in front of the player for testing.

## Current Visual And Technical Style

The current visual layer is mostly minimalist Canvas geometry with CSS-driven menus and overlays. Sprite loading exists for player and enemy, but falls back gracefully to primitive shapes if sprite assets are missing.

The intended atmosphere is dark dungeon/vault fantasy with readable combat silhouettes, bright rarity colors, clear UI feedback, and lightweight effects such as particles, screenshake, hit flashes, and floating text.

## Current Design Gaps And Opportunities

- Bosses exist, but boss mechanics are still simple compared with the design fantasy.
- Weapon slot 2 currently behaves as a second weapon attack, not a distinct secondary ability layer.
- Trinket abilities exist and are useful, but ability variety is still small.
- Legendary traits affect stats, but unique legendary gameplay hooks are not yet implemented.
- Map progression tiers exist as metadata, but no unlock progression uses them yet.
- The UI works but is concentrated in one large `main.js` file, making future feature work harder.
- There is no sound design yet.
- Sprite support exists, but placeholder geometry remains the practical default.
