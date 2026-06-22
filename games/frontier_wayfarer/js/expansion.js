(function (ns) {
    const C = (aetherium, sunshards, helionite) => ({ aetherium: aetherium || 0, sunshards: sunshards || 0, helionite: helionite || 0 });
    const HULLS = {
        wayfarer: { id: 'wayfarer', name: 'Wayfarer', maker: 'Frontier Guilds', description: 'A balanced free-pilot frame built to accept almost any frontier fitting.', faction: 'independents', hull: 140, massLimit: 52, cargo: 0, reactor: 0, thrust: 1, strafe: 1, maxSpeed: 340, shield: 1, cooling: 0, sensor: 0, radius: 17, cost: C(0), unlock: 'starter', shape: [[0,-31],[8,-18],[13,-8],[28,13],[20,20],[8,14],[0,22],[-8,14],[-20,20],[-28,13],[-13,-8],[-8,-18]] },
        guild_mule: { id: 'guild_mule', name: 'Guild Mule', maker: 'Frontier Guilds', description: 'A broad-haul workhorse with deep holds and forgiving structural reserves.', faction: 'independents', hull: 195, massLimit: 68, cargo: 14, reactor: 4, thrust: .78, strafe: .72, maxSpeed: 270, shield: 1, cooling: 1, sensor: 0, radius: 22, cost: C(1100, 4, 8), unlock: 'trade2', majorOnly: true, shape: [[0,-25],[14,-18],[25,-4],[27,19],[13,27],[0,22],[-13,27],[-27,19],[-25,-4],[-14,-18]] },
        concord_kestrel: { id: 'concord_kestrel', name: 'Concord Kestrel', maker: 'Helion Concord', description: 'A narrow patrol interceptor tuned for acceleration, lateral authority, and pursuit.', faction: 'concord', hull: 105, massLimit: 45, cargo: -4, reactor: 0, thrust: 1.28, strafe: 1.25, maxSpeed: 420, shield: 1.08, cooling: 2, sensor: 80, radius: 14, cost: C(1350, 0, 18), unlock: 'concord10', majorOnly: true, shape: [[0,-38],[7,-18],[24,7],[12,12],[8,27],[0,18],[-8,27],[-12,12],[-24,7],[-7,-18]] },
        concord_bulwark: { id: 'concord_bulwark', name: 'Concord Bulwark', maker: 'Helion Concord', description: 'An armored line gunship that trades speed and cooling for mass and shield stability.', faction: 'concord', hull: 235, massLimit: 76, cargo: 2, reactor: 8, thrust: .72, strafe: .68, maxSpeed: 255, shield: 1.3, cooling: -3, sensor: -60, radius: 25, cost: C(2100, 0, 42), unlock: 'bulwark', majorOnly: true, shape: [[0,-29],[15,-22],[30,-6],[31,17],[17,28],[7,22],[0,28],[-7,22],[-17,28],[-31,17],[-30,-6],[-15,-22]] },
        corsair_wraith: { id: 'corsair_wraith', name: 'Corsair Wraith', maker: 'Null Corsairs', description: 'A heat-shedding ambush frame made for speed, sensors, and dangerous light fittings.', faction: 'corsairs', hull: 92, massLimit: 43, cargo: -5, reactor: -4, thrust: 1.2, strafe: 1.18, maxSpeed: 405, shield: .85, cooling: 7, sensor: 220, radius: 15, cost: C(1250, 12, 12), unlock: 'corsairs10', majorOnly: true, shape: [[0,-34],[9,-20],[29,-8],[17,2],[28,22],[7,16],[0,25],[-7,16],[-28,22],[-17,2],[-29,-8],[-9,-20]] },
        meridian_ranger: { id: 'meridian_ranger', name: 'Meridian Ranger', maker: 'Frontier Guilds', description: 'A long-range survey frame with generous power, cooling, cargo, and sensor authority.', faction: 'independents', hull: 150, massLimit: 58, cargo: 6, reactor: 14, energyRecharge: 2, thrust: .96, strafe: 1.16, turn: 1.08, maxSpeed: 350, shield: 1.05, cooling: 6, sensor: 380, radius: 18, cost: C(1900, 28, 16), unlock: 'ranger', vendors: ['shatterline_post', 'rim_observatory'], mounts: { forward: 30, lateral: 12 }, shape: [[0,-36],[10,-24],[16,-7],[31,9],[25,22],[10,17],[0,29],[-10,17],[-25,22],[-31,9],[-16,-7],[-10,-24]] },
        concord_lancer: { id: 'concord_lancer', name: 'Concord Lancer', maker: 'Helion Concord', description: 'A long-nosed artillery platform that converts cargo and lateral agility into pursuit firepower.', faction: 'concord', hull: 125, massLimit: 60, cargo: -6, reactor: 10, energyRecharge: 1, thrust: 1.16, strafe: .84, turn: .93, maxSpeed: 385, shield: 1.15, cooling: -2, sensor: 120, radius: 18, cost: C(2300, 8, 48), unlock: 'concordElite', majorOnly: true, mounts: { forward: 42, lateral: 10 }, shape: [[0,-46],[7,-28],[14,-14],[34,9],[18,15],[10,32],[0,24],[-10,32],[-18,15],[-34,9],[-14,-14],[-7,-28]] },
        corsair_ravager: { id: 'corsair_ravager', name: 'Corsair Ravager', maker: 'Null Corsairs', description: 'A brutal close-range attack hull built to vent heat while carrying heavyweight weapons.', faction: 'corsairs', hull: 180, massLimit: 65, cargo: -3, reactor: 0, thrust: 1.08, strafe: .92, turn: .96, maxSpeed: 355, shield: .8, cooling: 12, sensor: 20, radius: 21, cost: C(2200, 15, 45), unlock: 'corsairElite', majorOnly: true, mounts: { forward: 24, lateral: 20 }, shape: [[0,-31],[13,-25],[22,-10],[37,-2],[24,9],[33,29],[9,20],[0,30],[-9,20],[-33,29],[-24,9],[-37,-2],[-22,-10],[-13,-25]] },
        prism_eidolon: { id: 'prism_eidolon', name: 'Prism Eidolon', maker: 'Rim Observatory', description: 'An anomaly-tuned energy craft with extraordinary shields, reactor depth, and lateral control.', faction: 'independents', hull: 110, massLimit: 55, cargo: -8, reactor: 28, energyRecharge: 4, thrust: .98, strafe: 1.28, turn: 1.18, maxSpeed: 370, shield: 1.4, cooling: 4, sensor: 260, radius: 20, cost: C(2600, 50, 36), unlock: 'capitalVeteran', vendors: ['rim_observatory'], mounts: { forward: 34, lateral: 17 }, shape: [[0,-41],[9,-25],[28,-17],[19,-2],[38,15],[16,13],[9,31],[0,23],[-9,31],[-16,13],[-38,15],[-19,-2],[-28,-17],[-9,-25]] }
    };

    const WEAPON_TYPES = {
        pulse: { type: 'bolt', color: '#55f0ad', speed: 720, life: 1.5 },
        rail: { type: 'rail', color: '#ce75ff', speed: 1080, life: 1.2, pierce: 1 },
        seeker: { type: 'missile', color: '#ffbd59', speed: 430, life: 3.2, turnRate: 2.4, splash: 70 },
        beam: { type: 'beam', color: '#55d7ff', speed: 1450, life: .45, charge: { min: .35, max: 1.8 } },
        scatter: { type: 'scatter', color: '#ff4f91', speed: 640, life: .75, pellets: 5, spread: .22 },
        arc: { type: 'arc', color: '#55f0d2', speed: 780, life: 1, chain: 2, chainRange: 180 },
        solar: { type: 'solar', color: '#ff673d', speed: 880, life: 1.1, ramp: { step: .12, max: 1.75, reset: .45 } },
        bloodhound: { type: 'missile', color: '#ff315c', speed: 360, life: 4.4, turnRate: 2.8, splash: 125, lock: .8 },
        nova: { type: 'nova', color: '#b96cff', speed: 720, life: 1.6, pierce: 2, splash: 95, charge: { min: .45, max: 2.2, stages: 3 } },
        ion: { type: 'ion', color: '#54a7ff', speed: 940, life: 1.2, status: { disabled: 1.35, slow: .45 } },
        flak: { type: 'flak', color: '#ff9b42', speed: 620, life: .7, pellets: 4, spread: .16, proximity: 58, antiProjectile: true, splash: 42 }
    };
    Object.assign(ns.Data.MODULES, {
        beam_lance: { id: 'beam_lance', name: 'Concord Beam Lance', description: 'Hold fire to charge a cyan lance, then release or reach full charge.', slot: 'primary', mass: 10, energy: 22, heat: 28, damage: 62, fireRate: .9, weapon: 'beam', cost: C(620, 4, 34), tier: 3, unlock: 'concord10' },
        scatter_array: { id: 'scatter_array', name: 'Corsair Scatter Array', description: 'A violent magenta spread built for close attack runs.', slot: 'primary', mass: 7, energy: 13, heat: 21, damage: 11, fireRate: .42, weapon: 'scatter', cost: C(480, 8, 18), tier: 2, unlock: 'corsairs10' },
        arc_projector: { id: 'arc_projector', name: 'Guild Arc Projector', description: 'A teal discharge that jumps between tightly clustered targets.', slot: 'primary', mass: 8, energy: 17, heat: 18, damage: 31, fireRate: .7, weapon: 'arc', cost: C(520, 16, 8), tier: 3, unlock: 'trade2' },
        solar_repeater: { id: 'solar_repeater', name: 'Solar Repeater', description: 'Red-orange pulse fire grows stronger and hotter while the trigger stays down.', slot: 'primary', mass: 9, energy: 9, heat: 9, damage: 19, fireRate: .16, weapon: 'solar', cost: C(780, 4, 42), tier: 4, unlock: 'capital', vendors: ['helion_bastion', 'sunfall_citadel'] },
        bloodhound_rack: { id: 'bloodhound_rack', name: 'Bloodhound Torpedo Rack', description: 'Hold target lock before launching a slow crimson torpedo with a punishing blast radius.', slot: 'primary', mass: 13, energy: 28, heat: 32, damage: 130, fireRate: 2.7, weapon: 'bloodhound', cost: C(920, 10, 58), tier: 4, unlock: 'capital', vendors: ['rust_orbit', 'deadstar_anchorage'] },
        prism_nova_coil: { id: 'prism_nova_coil', name: 'Prism Nova Coil', description: 'A three-stage violet charge releases a piercing detonation at maximum resonance.', slot: 'primary', mass: 12, energy: 24, heat: 30, damage: 72, fireRate: 1.15, weapon: 'nova', cost: C(960, 42, 28), tier: 4, unlock: 'capitalVeteran', vendors: ['rim_observatory'] },
        ion_needler: { id: 'ion_needler', name: 'Ion Needler', description: 'Blue needles suppress hostile drives and weapons instead of maximizing hull damage.', slot: 'primary', mass: 8, energy: 10, heat: 11, damage: 14, fireRate: .24, weapon: 'ion', cost: C(700, 22, 24), tier: 3, unlock: 'rim', vendors: ['rim_observatory', 'vanguard_gate'] },
        flak_array: { id: 'flak_array', name: 'Flak Array', description: 'Orange proximity bursts shred small craft and intercept hostile missiles.', slot: 'primary', mass: 10, energy: 16, heat: 20, damage: 18, fireRate: .62, weapon: 'flak', cost: C(760, 6, 38), tier: 3, unlock: 'combat', vendors: ['shatterline_post', 'cinder_foundry'] },
        helion_capacitor: { id: 'helion_capacitor', name: 'Helion Capacitor Core', description: 'Massive reserve capacity for shields and charged weapons, with deliberately slow recovery.', slot: 'reactor', mass: 13, reactor: 145, energyRecharge: 15, cost: C(1050, 8, 44), tier: 4, unlock: 'capital', vendors: ['helion_bastion', 'sunfall_citadel'] },
        corsair_surge: { id: 'corsair_surge', name: 'Corsair Surge Core', description: 'Violent thirty-per-second recovery trades reserve depth for increased weapon heat.', slot: 'reactor', mass: 9, reactor: 105, energyRecharge: 30, weaponHeat: .15, cost: C(980, 6, 46), tier: 4, unlock: 'capital', vendors: ['rust_orbit', 'deadstar_anchorage'] },
        prism_resonance: { id: 'prism_resonance', name: 'Prism Resonance Core', description: 'An anomaly core blending strong recovery, cooling, and efficient active systems.', slot: 'reactor', mass: 11, reactor: 125, energyRecharge: 21, cooling: 8, abilityEnergyCost: -.15, cost: C(1100, 48, 28), tier: 4, unlock: 'capitalVeteran', vendors: ['rim_observatory'] },
        comet_drive: { id: 'comet_drive', name: 'Comet Drive', description: 'Extreme forward acceleration and speed with weak lateral and Light Speed steering authority.', slot: 'engine', mass: 12, thrust: 365, maxSpeed: 70, strafe: .82, turn: 2.2, braking: .95, lightSpeed: true, lightTurn: .72, lightCharge: .9, lightDeceleration: 1, cost: C(1080, 12, 42), tier: 4, unlock: 'capital', vendors: ['helion_bastion', 'sunfall_citadel'] },
        vector_dancer: { id: 'vector_dancer', name: 'Vector Dancer', description: 'High-authority maneuvering drive with exceptional strafe, turn, and braking response.', slot: 'engine', mass: 10, thrust: 315, maxSpeed: -20, strafe: 1.35, turn: 3.4, braking: 1.65, lightSpeed: true, lightTurn: 1.35, lightCharge: 1, lightDeceleration: .8, cost: C(1020, 28, 30), tier: 4, unlock: 'capital', vendors: ['shatterline_post', 'rim_observatory'] },
        siege_drive: { id: 'siege_drive', name: 'Siege Drive', description: 'A stable heavy-frame drive with rapid braking and reinforced collision compensation.', slot: 'engine', mass: 15, thrust: 285, maxSpeed: -55, strafe: .9, turn: 2.55, braking: 1.8, collisionResistance: .45, heavyStability: .25, lightSpeed: true, lightTurn: .9, lightCharge: 1.12, lightDeceleration: .7, cost: C(1140, 4, 55), tier: 4, unlock: 'capital', vendors: ['vanguard_gate', 'cinder_foundry'] },
        bastion_barrier: { id: 'bastion_barrier', name: 'Bastion Barrier', description: 'Overwhelming shield capacity that takes seven exposed seconds to begin recovering.', slot: 'defense', mass: 16, shield: 240, shieldRecharge: 3, shieldDelay: 7, cost: C(1120, 5, 60), tier: 4, unlock: 'capital', vendors: ['helion_bastion', 'sunfall_citadel'] },
        flux_screen: { id: 'flux_screen', name: 'Flux Screen', description: 'A moderate screen that returns almost immediately and regenerates at extraordinary speed.', slot: 'defense', mass: 11, shield: 110, shieldRecharge: 23, shieldDelay: 1, cost: C(1060, 36, 30), tier: 4, unlock: 'capitalVeteran', vendors: ['rim_observatory'] },
        reactive_plating: { id: 'reactive_plating', name: 'Reactive Plating', description: 'Shieldless armored plating adds ninety hull and reduces direct hull damage by twenty-five percent.', slot: 'defense', mass: 18, shield: 0, hullBonus: 90, armor: .25, shieldRecharge: 0, shieldDelay: 0, cost: C(1000, 0, 62), tier: 4, unlock: 'capital', vendors: ['rust_orbit', 'cinder_foundry'] }
    });
    ns.Data.MODULES.pulse_mk1.weapon = 'pulse'; ns.Data.MODULES.pulse_mk2.weapon = 'pulse'; ns.Data.MODULES.rail_driver.weapon = 'rail'; ns.Data.MODULES.seeker_rack.weapon = 'seeker';

    const ENEMY_TYPES = {
        bandit: { id: 'bandit', name: 'Bandit Cutter', faction: 'bandits', team: 'bandits', radius: 14, hull: 62, speed: 96, preferredRange: 250, weapon: 'pulse', damage: 12, cooldown: 1.35, shape: 'cutter', reward: 1 },
        interceptor: { id: 'interceptor', name: 'Interceptor', faction: 'bandits', team: 'bandits', radius: 12, hull: 42, speed: 145, preferredRange: 185, weapon: 'pulse', damage: 9, cooldown: .72, shape: 'dart', reward: .8 },
        gunship: { id: 'gunship', name: 'Gunship', faction: 'bandits', team: 'bandits', radius: 19, hull: 120, speed: 62, preferredRange: 430, weapon: 'rail', damage: 19, cooldown: 1.8, shape: 'block', reward: 1.5 },
        missile_skiff: { id: 'missile_skiff', name: 'Missile Skiff', faction: 'bandits', team: 'bandits', radius: 14, hull: 58, speed: 86, preferredRange: 520, weapon: 'seeker', damage: 17, cooldown: 2.2, shape: 'fork', reward: 1.25 },
        striker: { id: 'striker', name: 'Striker', faction: 'bandits', team: 'bandits', radius: 13, hull: 52, speed: 130, preferredRange: 120, weapon: 'scatter', damage: 7, cooldown: 1.1, shape: 'blade', reward: 1 },
        concord_patrol: { id: 'concord_patrol', name: 'Concord Patrol', faction: 'concord', team: 'concord', radius: 15, hull: 82, speed: 105, preferredRange: 330, weapon: 'pulse', damage: 13, cooldown: 1.05, shape: 'shield', reward: 1.2 },
        corsair_raider: { id: 'corsair_raider', name: 'Corsair Raider', faction: 'corsairs', team: 'corsairs', radius: 14, hull: 70, speed: 122, preferredRange: 230, weapon: 'scatter', damage: 8, cooldown: 1.15, shape: 'hook', reward: 1.2 },
        torpedo_bomber: { id: 'torpedo_bomber', name: 'Torpedo Bomber', faction: 'bandits', team: 'bandits', radius: 18, hull: 105, speed: 58, preferredRange: 590, weapon: 'bloodhound', damage: 28, cooldown: 3.1, shape: 'bomber', reward: 1.7, minDanger: 3, role: 'artillery', telegraph: .9 },
        beam_lancer: { id: 'beam_lancer', name: 'Beam Lancer', faction: 'concord', team: 'concord', radius: 17, hull: 92, speed: 82, preferredRange: 520, weapon: 'beam', damage: 31, cooldown: 2.7, shape: 'lancer', reward: 1.6, minDanger: 3, role: 'artillery', telegraph: 1.1 },
        mine_layer: { id: 'mine_layer', name: 'Mine Layer', faction: 'corsairs', team: 'corsairs', radius: 16, hull: 86, speed: 92, preferredRange: 410, weapon: 'pulse', damage: 10, cooldown: 2.4, shape: 'layer', reward: 1.5, minDanger: 3, role: 'controller', ability: 'mines' },
        support_tender: { id: 'support_tender', name: 'Support Tender', faction: 'bandits', team: 'bandits', radius: 20, hull: 135, speed: 52, preferredRange: 460, weapon: 'pulse', damage: 7, cooldown: 2, shape: 'tender', reward: 1.8, minDanger: 4, role: 'support', ability: 'repair' },
        jammer_drone: { id: 'jammer_drone', name: 'Jammer Drone', faction: 'bandits', team: 'bandits', radius: 13, hull: 55, speed: 118, preferredRange: 300, weapon: 'ion', damage: 8, cooldown: 1.4, shape: 'jammer', reward: 1.4, minDanger: 4, role: 'support', ability: 'jammer' }
    };
    const BOSSES = {
        marauder_carrier: { id: 'marauder_carrier', name: 'Marauder Carrier', faction: 'bandits', team: 'bandits', radius: 58, hull: 1100, speed: 38, preferredRange: 480, weapon: 'scatter', damage: 13, cooldown: 1.3, shape: 'carrier', deploy: 'interceptor', reward: 10 },
        aegis_frigate: { id: 'aegis_frigate', name: 'Aegis Frigate', faction: 'concord', team: 'concord', radius: 52, hull: 980, speed: 44, preferredRange: 560, weapon: 'beam', damage: 34, cooldown: 2.8, shape: 'aegis', deploy: 'concord_patrol', reward: 10 },
        void_reaver: { id: 'void_reaver', name: 'Void Reaver', faction: 'corsairs', team: 'corsairs', radius: 49, hull: 900, speed: 72, preferredRange: 390, weapon: 'seeker', damage: 25, cooldown: 1.9, shape: 'reaver', deploy: 'corsair_raider', reward: 10, controller: 'reaver' },
        foundry_ark: { id: 'foundry_ark', name: 'Foundry Ark', faction: 'bandits', team: 'bandits', radius: 82, hull: 1750, speed: 25, preferredRange: 560, weapon: 'scatter', damage: 16, cooldown: 1.5, shape: 'foundry', deploy: 'torpedo_bomber', reward: 18, capital: true, controller: 'foundry', components: [{ id: 'bay_port', name: 'Port Fabricator', x: -42, y: 5, hull: 240, effect: 'deploy' }, { id: 'bay_starboard', name: 'Starboard Fabricator', x: 42, y: 5, hull: 240, effect: 'deploy' }] },
        solar_bastion: { id: 'solar_bastion', name: 'Solar Bastion', faction: 'concord', team: 'concord', radius: 76, hull: 1580, speed: 30, preferredRange: 620, weapon: 'beam', damage: 42, cooldown: 3.2, shape: 'solar', deploy: 'beam_lancer', reward: 18, capital: true, controller: 'bastion', components: [{ id: 'emitter_port', name: 'Port Emitter', x: -38, y: -4, hull: 210, effect: 'shield' }, { id: 'emitter_starboard', name: 'Starboard Emitter', x: 38, y: -4, hull: 210, effect: 'shield' }] },
        eclipse_cruiser: { id: 'eclipse_cruiser', name: 'Eclipse Cruiser', faction: 'corsairs', team: 'corsairs', radius: 70, hull: 1450, speed: 58, preferredRange: 440, weapon: 'bloodhound', damage: 34, cooldown: 2.4, shape: 'eclipse', deploy: 'jammer_drone', reward: 18, capital: true, controller: 'eclipse', components: [{ id: 'engine_port', name: 'Port Phase Engine', x: -30, y: 28, hull: 190, effect: 'blink' }, { id: 'engine_starboard', name: 'Starboard Phase Engine', x: 30, y: 28, hull: 190, effect: 'blink' }] }
    };

    const SPECIALIZATIONS = [
        ['ace_weapons_free','ace','Weapons Free','EXCLUSIVE POST-CAPSTONE // Alternating primary slots within 0.5 seconds empowers the second shot.','weaponsFree'],
        ['ace_target_hunter','ace','Target Hunter','EXCLUSIVE POST-CAPSTONE // Selected targets attract shots and suffer stronger critical hits.','targetHunter'],
        ['engineer_bulkheads','engineer','Emergency Bulkheads','EXCLUSIVE POST-CAPSTONE // Once per encounter, critical hull triggers resistance and repair.','bulkheads'],
        ['engineer_overclock','engineer','Unsafe Overclock','EXCLUSIVE POST-CAPSTONE // Abilities can be forced at half cooldown for heat and hull damage.','overclock'],
        ['pathfinder_ghost','pathfinder','Ghost Vector','EXCLUSIVE POST-CAPSTONE // Light Speed exit briefly masks the ship and boosts acceleration.','ghostVector'],
        ['pathfinder_field','pathfinder','Field Savant','EXCLUSIVE POST-CAPSTONE // Resolve searches farther away and complete interactions faster.','fieldSavant'],
        ['operator_marque','operator','Letter of Marque','EXCLUSIVE POST-CAPSTONE // Faction combat work grants stronger rewards and standing swings.','letterOfMarque'],
        ['operator_quartermaster','operator','Quartermaster','EXCLUSIVE POST-CAPSTONE // Deliveries and escorts earn a temporary destination service discount.','quartermaster']
    ].map(([id, discipline, name, description, flag]) => ({ id, discipline, name, description, effect: { [flag]: 1 }, maxRank: 1, capstone: false, specialization: true, display: { unit: 'capstone', label: 'SPECIALIZATION' } }));
    ns.Data.TRAITS.push(...SPECIALIZATIONS);

    const STATION_FLAIR = {
        independents: ['Dock crews trade repair gossip over open-band radio.', 'Guild traffic control promises no guarantees beyond a warm berth.'],
        concord: ['Beacon law is in force from approach vector to pressure seal.', 'Concord controllers log every drive flare and weapons discharge.'],
        corsairs: ['The berth fee buys discretion; survival remains your own expense.', 'Encrypted market calls crowd the local band with dangerous bargains.']
    };
    function hullAvailable(state, hull, station) {
        if (!hull || hull.id === 'wayfarer' || !station || (hull.majorOnly && !station.major)) return false;
        if (hull.vendors ? !hull.vendors.includes(station.id) : station.faction !== hull.faction) return false;
        if (hull.unlock === 'trade2') return ns.Unlocks.evaluate(state).tradeTier >= 2;
        if (hull.unlock === 'concord10') return state.reputations.concord >= 10;
        if (hull.unlock === 'corsairs10') return state.reputations.corsairs >= 10;
        if (hull.unlock === 'bulwark') return ns.Unlocks.evaluate(state).combat && state.reputations.concord >= 25;
        if (hull.unlock === 'ranger') return ns.Unlocks.evaluate(state).tradeTier >= 3 && state.visitedRegions.length >= 8;
        if (hull.unlock === 'concordElite') return ns.Unlocks.evaluate(state).combat && state.reputations.concord >= 25;
        if (hull.unlock === 'corsairElite') return state.stats.kills >= 30 && state.reputations.corsairs >= 25;
        if (hull.unlock === 'capitalVeteran') return state.pilot.level >= 10 && state.visitedRegions.includes('anomaly_rim') && Object.keys(state.progression?.bossesDefeated || {}).length > 0;
        return false;
    }
    function hullUnlockText(state, hull) {
        if (hullAvailable(state, hull, ns.Data.LANDMARKS.find(station => hull.vendors?.includes(station.id) || (station.major && station.faction === hull.faction)))) return 'AVAILABLE AT AUTHORIZED SHIPYARD';
        return { ranger: 'REQUIRES TRADE III + 8 REGIONS', concordElite: 'REQUIRES COMBAT LICENSE + 25 CONCORD', corsairElite: 'REQUIRES 30 KILLS + 25 CORSAIRS', capitalVeteran: 'REQUIRES LEVEL 10 + ANOMALY RIM + CAPITAL KILL' }[hull.unlock] || 'SHIPYARD LICENSE LOCKED';
    }
    function patrolStatus(state, faction) {
        if (state.pilot.allegiance === faction) return 'FRIENDLY';
        if (state.pilot.allegiance && ns.Data.FACTIONS[state.pilot.allegiance]?.hostileTo === faction) return 'HOSTILE';
        const rep = state.reputations[faction] || 0; return rep >= 10 ? 'FRIENDLY' : rep >= 0 ? 'NEUTRAL' : 'HOSTILE';
    }
    function briefing(contract, station) {
        const faction = ns.Data.FACTIONS[contract.issuer] || ns.Data.FACTIONS.independents, destination = ns.Contracts?.destinationName(contract) || 'the marked contact';
        return { contact: `${faction.short}-${String(Math.abs(ns.MathUtil.hash(contract.id.length, station.x, station.y, contract.risk) * 999) | 0).padStart(3, '0')}`, situation: `${faction.name} traffic has flagged ${destination} for immediate attention.`, line: STATION_FLAIR[contract.issuer]?.[contract.risk % 2] || STATION_FLAIR.independents[0] };
    }
    ns.Data.HULLS = HULLS; ns.Data.WEAPON_TYPES = WEAPON_TYPES; ns.Data.ENEMY_TYPES = ENEMY_TYPES; ns.Data.BOSSES = BOSSES; ns.Data.STATION_FLAIR = STATION_FLAIR;
    ns.Expansion = { hullAvailable, hullUnlockText, patrolStatus, briefing };
})(window.MiniInvadersV2);
