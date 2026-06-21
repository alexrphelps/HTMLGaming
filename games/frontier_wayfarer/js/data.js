(function (ns) {
    const F = {
        concord: { id: 'concord', name: 'Helion Concord', short: 'CONCORD', color: '#55d7ff', hostileTo: 'corsairs', description: 'A disciplined security compact defending the inner systems.' },
        corsairs: { id: 'corsairs', name: 'Null Corsairs', short: 'CORSAIRS', color: '#ff4f91', hostileTo: 'concord', description: 'A predatory alliance of raiders, smugglers, and free captains.' },
        independents: { id: 'independents', name: 'Frontier Guilds', short: 'GUILDS', color: '#55f0ad', hostileTo: null, description: 'Mechanics, traders, salvagers, and settlers keeping the frontier alive.' }
    };

    const REGION_W = 9000, REGION_H = 7200;
    const ECONOMIES = {
        belt: { food: .9, alloys: 1, medicine: 1.05, relics: 1.3 },
        core: { food: .8, alloys: .9, medicine: .82, relics: 1.5 },
        frontier: { food: 1.2, alloys: .86, medicine: 1.28, relics: 1.05 },
        null: { food: 1.16, alloys: 1.08, medicine: 1.4, relics: .88 },
        anomaly: { food: 1.45, alloys: 1.3, medicine: 1.5, relics: .65 }
    };
    const R = (id, name, x, y, color, danger, faction, backdrop, travelTier) => ({
        id, name, x, y, w: REGION_W, h: REGION_H, color, danger, faction,
        economy: Object.assign({}, ECONOMIES[backdrop]), backdrop, travelTier: travelTier || 0
    });
    const REGIONS = [
        R('frostglass_reach', 'Frostglass Reach', -22500, -12000, '#80c9e8', 4, 'independents', 'anomaly', 1),
        R('corsairs_crown', "Corsair's Crown", -13500, -12000, '#ff557f', 5, 'corsairs', 'null', 1),
        R('zenith_grave', 'Zenith Grave', -4500, -12000, '#94a8c9', 5, 'independents', 'frontier', 1),
        R('helion_vanguard', 'Helion Vanguard', 4500, -12000, '#68e3ff', 4, 'concord', 'core', 1),
        R('luminous_verge', 'Luminous Verge', 13500, -12000, '#dc83ff', 5, 'independents', 'anomaly', 1),
        R('redshift_march', 'Redshift March', -22500, -4800, '#e94d72', 4, 'corsairs', 'null', 1),
        R('outlaw_expanse', 'Null Expanse', -13500, -4800, '#ff4f91', 4, 'corsairs', 'null'),
        R('trade_belt', 'Meridian Trade Belt', -4500, -4800, '#55f0ad', 1, 'independents', 'belt'),
        R('lawful_core', 'Helion Core', 4500, -4800, '#55d7ff', 2, 'concord', 'core'),
        R('concordat_reach', 'Concordat Reach', 13500, -4800, '#70bdf5', 3, 'concord', 'core', 1),
        R('smugglers_wake', "Smuggler's Wake", -22500, 2400, '#f05b99', 4, 'corsairs', 'null', 1),
        R('cinder_drift', 'Cinder Drift', -13500, 2400, '#de7652', 4, 'corsairs', 'frontier', 1),
        R('frontier', 'Shatterline Frontier', -4500, 2400, '#ffbd59', 3, 'independents', 'frontier'),
        R('anomaly_rim', 'Violet Anomaly Rim', 4500, 2400, '#ce75ff', 5, 'independents', 'anomaly'),
        R('prism_wilds', 'Prism Wilds', 13500, 2400, '#b56cff', 5, 'independents', 'anomaly', 1),
        R('deadstar_shoals', 'Deadstar Shoals', -22500, 9600, '#d54473', 5, 'corsairs', 'null', 1),
        R('iron_pilgrim_belt', 'Iron Pilgrim Belt', -13500, 9600, '#c5a76b', 4, 'independents', 'belt', 1),
        R('far_meridian', 'Far Meridian', -4500, 9600, '#63d9b3', 3, 'independents', 'belt', 1),
        R('sunfall_expanse', 'Sunfall Expanse', 4500, 9600, '#ffae58', 5, 'concord', 'core', 1),
        R('eventide_scar', 'Eventide Scar', 13500, 9600, '#a66bdf', 5, 'independents', 'anomaly', 1)
    ];

    const LANDMARKS = [
        { id: 'waypoint_zero', type: 'station', name: 'Waypoint Zero', x: 0, y: 0, region: 'trade_belt', faction: 'independents', major: true },
        { id: 'cold_start_beacon', type: 'anomaly', name: 'Cold Start Beacon', x: 720, y: 180, region: 'trade_belt', faction: 'independents' },
        { id: 'greenline_exchange', type: 'station', name: 'Greenline Exchange', x: -2300, y: -900, region: 'trade_belt', faction: 'independents' },
        { id: 'helion_bastion', type: 'station', name: 'Helion Bastion', x: 6500, y: -300, region: 'lawful_core', faction: 'concord', major: true },
        { id: 'solace_yards', type: 'station', name: 'Solace Shipyards', x: 9000, y: 1500, region: 'lawful_core', faction: 'concord' },
        { id: 'shatterline_post', type: 'station', name: 'Shatterline Post', x: -800, y: 5200, region: 'frontier', faction: 'independents', major: true },
        { id: 'rust_orbit', type: 'station', name: 'Rust Orbit', x: -7200, y: 500, region: 'outlaw_expanse', faction: 'corsairs', major: true },
        { id: 'black_market', type: 'station', name: 'The Black Relay', x: -9800, y: -1900, region: 'outlaw_expanse', faction: 'corsairs' },
        { id: 'rim_observatory', type: 'station', name: 'Rim Observatory', x: 6900, y: 5200, region: 'anomaly_rim', faction: 'independents', major: true },
        { id: 'glass_wake', type: 'anomaly', name: 'The Glass Wake', x: 9400, y: 6800, region: 'anomaly_rim', faction: 'independents' },
        { id: 'silent_crown', type: 'anomaly', name: 'Silent Crown', x: 1800, y: 6900, region: 'frontier', faction: 'independents' },
        { id: 'frostglass_relay', type: 'anomaly', name: 'Frostglass Relay', x: -18000, y: -8400, region: 'frostglass_reach', faction: 'independents' },
        { id: 'crown_anchorage', type: 'station', name: 'Crown Anchorage', x: -9000, y: -8400, region: 'corsairs_crown', faction: 'corsairs', major: true },
        { id: 'zenith_grave_signal', type: 'anomaly', name: 'Zenith Grave Signal', x: 0, y: -8400, region: 'zenith_grave', faction: 'independents' },
        { id: 'vanguard_gate', type: 'station', name: 'Vanguard Gate', x: 9000, y: -8400, region: 'helion_vanguard', faction: 'concord', major: true },
        { id: 'luminous_prism', type: 'anomaly', name: 'Luminous Prism', x: 18000, y: -8400, region: 'luminous_verge', faction: 'independents' },
        { id: 'redshift_haven', type: 'station', name: 'Redshift Haven', x: -18000, y: -1200, region: 'redshift_march', faction: 'corsairs' },
        { id: 'concordat_reach_station', type: 'station', name: 'Concordat Reach Station', x: 18000, y: -1200, region: 'concordat_reach', faction: 'concord' },
        { id: 'smugglers_lantern', type: 'station', name: "Smuggler's Lantern", x: -18000, y: 6000, region: 'smugglers_wake', faction: 'corsairs' },
        { id: 'cinder_foundry', type: 'station', name: 'Cinder Foundry', x: -9000, y: 6000, region: 'cinder_drift', faction: 'corsairs' },
        { id: 'prism_lens', type: 'anomaly', name: 'Prism Lens', x: 18000, y: 6000, region: 'prism_wilds', faction: 'independents' },
        { id: 'deadstar_anchorage', type: 'station', name: 'Deadstar Anchorage', x: -18000, y: 13200, region: 'deadstar_shoals', faction: 'corsairs', major: true },
        { id: 'pilgrim_exchange', type: 'station', name: 'Pilgrim Exchange', x: -9000, y: 13200, region: 'iron_pilgrim_belt', faction: 'independents' },
        { id: 'far_meridian_beacon', type: 'anomaly', name: 'Far Meridian Beacon', x: 0, y: 13200, region: 'far_meridian', faction: 'independents' },
        { id: 'sunfall_citadel', type: 'station', name: 'Sunfall Citadel', x: 9000, y: 13200, region: 'sunfall_expanse', faction: 'concord', major: true },
        { id: 'eventide_scar', type: 'anomaly', name: 'Eventide Scar', x: 18000, y: 13200, region: 'eventide_scar', faction: 'independents' }
    ];

    const COMMODITIES = {
        food: { id: 'food', name: 'Nutrient Packs', basePrice: 18, color: '#55f0ad', legal: true },
        alloys: { id: 'alloys', name: 'Refined Alloys', basePrice: 34, color: '#a9c8d8', legal: true },
        medicine: { id: 'medicine', name: 'Medigel', basePrice: 52, color: '#55d7ff', legal: true },
        relics: { id: 'relics', name: 'Anomaly Relics', basePrice: 110, color: '#ce75ff', legal: false, tier: 3 }
    };

    COMMODITIES.food.tier = 1; COMMODITIES.alloys.tier = 1; COMMODITIES.medicine.tier = 2;

    const C = (aetherium, sunshards, helionite) => ({ aetherium: aetherium || 0, sunshards: sunshards || 0, helionite: helionite || 0 });
    const MODULES = {
        pulse_mk1: { id: 'pulse_mk1', name: 'Pulse Cannon I', slot: 'primary', mass: 4, energy: 8, heat: 10, damage: 15, fireRate: .18, cost: C(0), tier: 1, unlock: 'starter' },
        pulse_mk2: { id: 'pulse_mk2', name: 'Pulse Cannon II', slot: 'primary', mass: 6, energy: 11, heat: 13, damage: 23, fireRate: .16, cost: C(300, 0, 10), tier: 2, unlock: 'combat' },
        rail_driver: { id: 'rail_driver', name: 'Kestrel Rail Driver', slot: 'primary', mass: 9, energy: 18, heat: 22, damage: 48, fireRate: .48, cost: C(450, 0, 25), tier: 3, unlock: 'faction25' },
        seeker_rack: { id: 'seeker_rack', name: 'Seeker Rack', slot: 'primary', mass: 7, energy: 14, heat: 18, damage: 70, fireRate: 1.6, cost: C(360, 4, 14), tier: 2, unlock: 'combat' },
        reactor_mk1: { id: 'reactor_mk1', name: 'Arc Reactor I', slot: 'reactor', mass: 5, reactor: 70, cost: C(0), tier: 1, unlock: 'starter' },
        reactor_mk2: { id: 'reactor_mk2', name: 'Arc Reactor II', slot: 'reactor', mass: 7, reactor: 100, cost: C(400, 8, 0), tier: 2, unlock: 'contracts3' },
        drive_mk1: { id: 'drive_mk1', name: 'Vector Drive I', slot: 'engine', mass: 6, thrust: 225, cost: C(0), tier: 1, unlock: 'starter' },
        drive_mk2: { id: 'drive_mk2', name: 'Vector Drive II', slot: 'engine', mass: 8, thrust: 285, cost: C(450, 0, 8), tier: 2, unlock: 'contracts3' },
        light_drive: { id: 'light_drive', name: 'Asterion Light Drive', slot: 'engine', mass: 10, thrust: 300, cost: C(900, 20, 12), tier: 3, unlock: 'lightDrive', majorOnly: true },
        shield_scout: { id: 'shield_scout', name: 'Aegis Scout Screen', slot: 'defense', mass: 6, shield: 55, shieldRecharge: 12, shieldDelay: 2, cost: C(140, 0, 4), tier: 1, unlock: 'shield' },
        shield_balanced: { id: 'shield_balanced', name: 'Aegis Balanced Screen', slot: 'defense', mass: 9, shield: 95, shieldRecharge: 8, shieldDelay: 3, cost: C(300, 6, 10), tier: 2, unlock: 'shield' },
        shield_bulwark: { id: 'shield_bulwark', name: 'Bulwark Screen', slot: 'defense', mass: 13, shield: 165, shieldRecharge: 4, shieldDelay: 5, cost: C(520, 0, 30), tier: 3, unlock: 'faction25' },
        shield_prism: { id: 'shield_prism', name: 'Prism Screen', slot: 'defense', mass: 8, shield: 80, shieldRecharge: 16, shieldDelay: 1.5, cost: C(420, 28, 8), tier: 3, unlock: 'rim' },
        cargo_mk1: { id: 'cargo_mk1', name: 'Cargo Lattice I', slot: 'cargo', mass: 5, cargo: 14, cost: C(0), tier: 1, unlock: 'starter' },
        cargo_mk2: { id: 'cargo_mk2', name: 'Cargo Lattice II', slot: 'cargo', mass: 8, cargo: 24, cost: C(400), tier: 2, unlock: 'contracts3' },
        repair_drones: { id: 'repair_drones', name: 'Repair Drones', slot: 'utility', mass: 4, repair: .6, cost: C(320, 6), tier: 2, unlock: 'contracts3' },
        sensor_array: { id: 'sensor_array', name: 'Far-Sight Array', slot: 'utility', mass: 3, sensor: 450, cost: C(280, 8), tier: 2, unlock: 'anomaly' },
        heat_sink: { id: 'heat_sink', name: 'Phase Heat Sink', slot: 'utility', mass: 4, cooling: 9, cost: C(300, 5), tier: 2, unlock: 'contracts3' },
        cargo_pods: { id: 'cargo_pods', name: 'External Cargo Pods', slot: 'utility', mass: 6, cargo: 8, cost: C(260), tier: 1, unlock: 'trade1' },
        afterburner: { id: 'afterburner', name: 'Vector Afterburner', slot: 'ability', mass: 4, cost: C(180, 0, 4), tier: 1, unlock: 'trade1', ability: { type: 'afterburner', cooldown: 6, duration: 1.8, energy: 20 } },
        blink_drive: { id: 'blink_drive', name: 'Blink Drive', slot: 'ability', mass: 5, cost: C(220, 18, 0), tier: 2, unlock: 'anomaly', ability: { type: 'blink', cooldown: 8, distance: 350, energy: 25 } },
        shield_overcharger: { id: 'shield_overcharger', name: 'Shield Overcharger', slot: 'ability', mass: 5, cost: C(260, 12, 8), tier: 2, unlock: 'shield', ability: { type: 'overshield', cooldown: 14, duration: 6, amount: 70, energy: 30 } },
        emp_wave: { id: 'emp_wave', name: 'EMP Wave', slot: 'ability', mass: 6, cost: C(280, 0, 20), tier: 2, unlock: 'combat', ability: { type: 'emp', cooldown: 12, duration: 4, radius: 320, damage: 25, energy: 28 } },
        repair_swarm: { id: 'repair_swarm', name: 'Repair Swarm', slot: 'ability', mass: 5, cost: C(320, 14, 0), tier: 2, unlock: 'mechanic', ability: { type: 'repair', cooldown: 30, duration: 6, amount: 40, energy: 35 } },
        phase_cloak: { id: 'phase_cloak', name: 'Phase Cloak', slot: 'ability', mass: 7, cost: C(480, 30, 15), tier: 3, unlock: 'rim', ability: { type: 'cloak', cooldown: 20, duration: 5, energy: 40 } }
    };

    function trait(id, discipline, name, description, effect, capstone) {
        return { id, discipline, name, description, effect, maxRank: capstone ? 1 : 3, capstone: Boolean(capstone) };
    }
    const TRAITS = [
        trait('ace_vectoring', 'ace', 'Vector Instinct', '+8% lateral thrust authority per rank.', { strafe: .08 }),
        trait('ace_thrusters', 'ace', 'Hot Thrusters', '+5% thrust per rank.', { thrust: .05 }),
        trait('ace_cooling', 'ace', 'Trigger Discipline', '-7% weapon heat per rank.', { weaponHeat: -.07 }),
        trait('ace_critical', 'ace', 'Deflection Shot', '+4% critical chance per rank.', { critical: .04 }),
        trait('ace_deadeye', 'ace', 'Deadeye Run', 'Critical hits deal triple damage and Afterburner recovers 35% faster.', { criticalPower: 1, afterburnerRecovery: .35 }, true),
        trait('engineer_routing', 'engineer', 'Power Routing', '+8 reactor capacity per rank.', { reactor: 8 }),
        trait('engineer_patch', 'engineer', 'Patchwork Savant', '+20% repair effectiveness per rank.', { repair: .2 }),
        trait('engineer_mass', 'engineer', 'Mass Budgeting', '-4% fitted module mass per rank.', { mass: -.04 }),
        trait('engineer_shields', 'engineer', 'Shield Harmonics', '+10% maximum shields per rank.', { shield: .1 }),
        trait('engineer_field', 'engineer', 'Field Rebuild', 'Slowly repairs hull outside combat.', { fieldRepair: .8 }, true),
        trait('pathfinder_sensors', 'pathfinder', 'Long Baseline', '+120 sensor range per rank.', { sensor: 120 }),
        trait('pathfinder_fuel', 'pathfinder', 'Drift Economy', '-8% active-module energy cost per rank.', { abilityEnergyCost: -.08 }),
        trait('pathfinder_anomaly', 'pathfinder', 'Resonance Reader', '+18% discovery rewards per rank.', { discoveryReward: .18 }),
        trait('pathfinder_salvage', 'pathfinder', 'Clean Cut', '+15% salvage yield per rank.', { salvage: .15 }),
        trait('pathfinder_deep', 'pathfinder', 'Deep Scan', 'Reveals distant landmarks and premium salvage.', { deepScan: 1 }, true),
        trait('operator_pay', 'operator', 'Fine Print', '+8% contract rewards per rank.', { contractReward: .08 }),
        trait('operator_market', 'operator', 'Market Sense', 'Improves buy and sell prices by 3% per rank.', { market: .03 }),
        trait('operator_cargo', 'operator', 'Loadmaster', '+3 cargo capacity per rank.', { cargo: 3 }),
        trait('operator_reputation', 'operator', 'Known Quantity', '+12% positive reputation per rank.', { reputation: .12 }),
        trait('operator_broker', 'operator', 'Void Broker', 'Shows elite contracts and removes the neutral trade fee.', { broker: 1 }, true)
    ];

    const CONTRACT_TYPES = [
        { id: 'haul', name: 'Freight Run', verb: 'Deliver cargo', baseReward: C(180), risk: 1 },
        { id: 'bounty', name: 'Bounty Hunt', verb: 'Eliminate marked raiders', baseReward: C(90, 0, 18), risk: 2 },
        { id: 'escort', name: 'Convoy Escort', verb: 'Protect a convoy beacon', baseReward: C(220, 0, 6), risk: 2 },
        { id: 'salvage', name: 'Salvage Claim', verb: 'Recover marked salvage', baseReward: C(140, 4), risk: 1 },
        { id: 'survey', name: 'Deep Survey', verb: 'Scan an uncharted signal', baseReward: C(90, 14), risk: 1 },
        { id: 'rescue', name: 'Distress Call', verb: 'Reach a stranded pilot', baseReward: C(240), risk: 2 },
        { id: 'smuggle', name: 'Quiet Delivery', verb: 'Move contraband unseen', baseReward: C(220, 8, 5), risk: 3 },
        { id: 'assault', name: 'Faction Strike', verb: 'Destroy an enemy patrol', baseReward: C(180, 0, 30), risk: 4 }
    ];

    const QUESTS = {
        independents: ['A Ship of Your Own', 'The Long Haul', 'Keep the Lights On', 'Beyond the Rim'],
        concord: ['Badge of Passage', 'Secure the Shatterline', 'The Corsair Ledger', 'A Law Worth Keeping'],
        corsairs: ['A Useful Stranger', 'Cut the Helion Line', 'A Captain Owes Nothing', 'Crown of Static']
    };

    ns.Data = { FACTIONS: F, REGIONS, LANDMARKS, COMMODITIES, MODULES, TRAITS, CONTRACT_TYPES, QUESTS };
})(window.MiniInvadersV2);
