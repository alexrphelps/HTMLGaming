(function (ns) {
    const F = {
        concord: { id: 'concord', name: 'Helion Concord', short: 'CONCORD', color: '#55d7ff', hostileTo: 'corsairs', description: 'A disciplined security compact defending the inner systems.' },
        corsairs: { id: 'corsairs', name: 'Null Corsairs', short: 'CORSAIRS', color: '#ff4f91', hostileTo: 'concord', description: 'A predatory alliance of raiders, smugglers, and free captains.' },
        independents: { id: 'independents', name: 'Frontier Guilds', short: 'GUILDS', color: '#55f0ad', hostileTo: null, description: 'Mechanics, traders, salvagers, and settlers keeping the frontier alive.' }
    };

    const REGION_W = 13500, REGION_H = 10800, WORLD_MIN_X = -33750, WORLD_MIN_Y = -18000;
    const ECONOMIES = {
        belt: { food: .9, alloys: 1, medicine: 1.05, relics: 1.3 },
        core: { food: .8, alloys: .9, medicine: .82, relics: 1.5 },
        frontier: { food: 1.2, alloys: .86, medicine: 1.28, relics: 1.05 },
        null: { food: 1.16, alloys: 1.08, medicine: 1.4, relics: .88 },
        anomaly: { food: 1.45, alloys: 1.3, medicine: 1.5, relics: .65 }
    };
    const R = (id, name, column, row, color, danger, faction, backdrop, travelTier, remoteness, asteroidDensity) => ({
        id, name, x: WORLD_MIN_X + column * REGION_W, y: WORLD_MIN_Y + row * REGION_H,
        w: REGION_W, h: REGION_H, column, row, grid: `${String.fromCharCode(65 + column)}${row + 1}`,
        color, danger, faction, remoteness: remoteness || 0, asteroidDensity: asteroidDensity || 1,
        economy: Object.assign({}, ECONOMIES[backdrop]), backdrop, travelTier: travelTier || 0
    });
    const REGIONS = [
        R('frostglass_reach', 'Frostglass Reach', 0, 0, '#80c9e8', 5, 'independents', 'anomaly', 1, 3, 1.6),
        R('corsairs_crown', "Corsair's Crown", 1, 0, '#ff557f', 5, 'corsairs', 'null', 1, 2, 1.6),
        R('zenith_grave', 'Zenith Grave', 2, 0, '#94a8c9', 5, 'independents', 'frontier', 1, 1),
        R('helion_vanguard', 'Helion Vanguard', 3, 0, '#68e3ff', 4, 'concord', 'core', 1, 2),
        R('luminous_verge', 'Luminous Verge', 4, 0, '#dc83ff', 5, 'independents', 'anomaly', 1, 3),
        R('redshift_march', 'Redshift March', 0, 1, '#e94d72', 4, 'corsairs', 'null', 1, 2),
        R('outlaw_expanse', 'Null Expanse', 1, 1, '#ff4f91', 4, 'corsairs', 'null', 0, 1, 1.6),
        R('trade_belt', 'Meridian Trade Belt', 2, 1, '#55f0ad', 1, 'independents', 'belt', 0, 0, .75),
        R('lawful_core', 'Helion Core', 3, 1, '#55d7ff', 2, 'concord', 'core', 0, 1, 1.6),
        R('concordat_reach', 'Concordat Reach', 4, 1, '#70bdf5', 4, 'concord', 'core', 1, 2),
        R('smugglers_wake', "Smuggler's Wake", 0, 2, '#f05b99', 4, 'corsairs', 'null', 1, 3),
        R('cinder_drift', 'Cinder Drift', 1, 2, '#de7652', 4, 'corsairs', 'frontier', 1, 2),
        R('frontier', 'Shatterline Frontier', 2, 2, '#ffbd59', 3, 'independents', 'frontier', 0, 1),
        R('anomaly_rim', 'Violet Anomaly Rim', 3, 2, '#ce75ff', 5, 'independents', 'anomaly', 0, 2, 1.6),
        R('prism_wilds', 'Prism Wilds', 4, 2, '#b56cff', 5, 'independents', 'anomaly', 1, 3, 1.6),
        R('deadstar_shoals', 'Deadstar Shoals', 0, 3, '#d54473', 5, 'corsairs', 'null', 1, 3),
        R('iron_pilgrim_belt', 'Iron Pilgrim Belt', 1, 3, '#c5a76b', 4, 'independents', 'belt', 1, 3),
        R('far_meridian', 'Far Meridian', 2, 3, '#63d9b3', 4, 'independents', 'belt', 1, 2),
        R('sunfall_expanse', 'Sunfall Expanse', 3, 3, '#ffae58', 5, 'concord', 'core', 1, 3),
        R('eventide_scar', 'Eventide Scar', 4, 3, '#a66bdf', 5, 'independents', 'anomaly', 1, 3, 1.6),
        R('ashen_undertow', 'Ashen Undertow', 0, 4, '#d95d70', 5, 'corsairs', 'null', 1, 3),
        R('gilded_expanse', 'Gilded Expanse', 1, 4, '#d9ba66', 4, 'independents', 'belt', 1, 3),
        R('meridian_deep', 'Meridian Deep', 2, 4, '#4fd0a8', 4, 'independents', 'frontier', 1, 3),
        R('helion_marches', 'Helion Marches', 3, 4, '#69cff7', 4, 'concord', 'core', 1, 3),
        R('violet_chasm', 'Violet Chasm', 4, 4, '#c167f0', 5, 'independents', 'anomaly', 1, 3),
        R('nullwake_abyss', 'Nullwake Abyss', 0, 5, '#b83463', 5, 'corsairs', 'null', 1, 3),
        R('pilgrims_end', "Pilgrim's End", 1, 5, '#aa9669', 5, 'independents', 'belt', 1, 3),
        R('terminus_reach', 'Terminus Reach', 2, 5, '#48b894', 5, 'independents', 'frontier', 1, 3),
        R('dawnwall_verge', 'Dawnwall Verge', 3, 5, '#57bce8', 5, 'concord', 'core', 1, 3),
        R('eventide_deep', 'Eventide Deep', 4, 5, '#8d55c9', 5, 'independents', 'anomaly', 1, 3)
    ];

    const WORLD_OBJECT_TYPES = {
        derelict_hauler: { id: 'derelict_hauler', name: 'Derelict Hauler', backdrops: { belt: 4, frontier: 5, null: 3, anomaly: 1 }, minDanger: 1, interactionDuration: 3, style: 'derelict', color: '#ffbd59', reward: { aetherium: 42 }, dangerScale: { aetherium: 9 }, helioniteAt: 3, xp: 18, rewardType: 'salvage' },
        survey_probe: { id: 'survey_probe', name: 'Guild Survey Probe', backdrops: { belt: 3, core: 4, frontier: 3, anomaly: 3 }, minDanger: 1, interactionDuration: 5, style: 'probe', color: '#55d7ff', reward: { aetherium: 12, sunshards: 6 }, dangerScale: { sunshards: 1 }, xp: 35, rewardType: 'discovery' },
        memorial_beacon: { id: 'memorial_beacon', name: 'Memorial Beacon', backdrops: { belt: 1, core: 1, frontier: 3, null: 2, anomaly: 3 }, minDanger: 2, interactionDuration: 4, style: 'beacon', color: '#b8d5dc', reward: { sunshards: 4 }, xp: 45, rewardType: 'discovery' },
        emergency_supply_pod: { id: 'emergency_supply_pod', name: 'Emergency Supply Pod', backdrops: { belt: 5, core: 3, frontier: 4 }, minDanger: 1, interactionDuration: 3, style: 'pod', color: '#55f0ad', reward: { aetherium: 32 }, dangerScale: { aetherium: 4 }, xp: 12, rewardType: 'salvage' },
        smuggler_dead_drop: { id: 'smuggler_dead_drop', name: 'Smuggler Dead Drop', backdrops: { null: 7 }, minDanger: 3, interactionDuration: 4, style: 'drop', color: '#ff4f91', reward: { aetherium: 65, sunshards: 2, helionite: 2 }, dangerScale: { aetherium: 8 }, xp: 24, rewardType: 'salvage', ambushChance: .45 },
        unstable_prism: { id: 'unstable_prism', name: 'Unstable Prism', backdrops: { anomaly: 8 }, minDanger: 4, interactionDuration: 5, style: 'prism', color: '#ce75ff', reward: { sunshards: 11 }, dangerScale: { sunshards: 1 }, xp: 55, rewardType: 'discovery', heat: 34, energyDrain: 22 }
    };

    const WORLD_SCENARIOS = {
        distress_call: { id: 'distress_call', name: 'Distress Call', backdrops: { core: 3, frontier: 6, null: 5 }, minDanger: 2, triggerRadius: 420, style: 'distress', color: '#ffbd59', falseSignalChance: { core: .15, frontier: .34, null: .68 } },
        border_skirmish: { id: 'border_skirmish', name: 'Border Skirmish', backdrops: { core: 3, null: 3 }, minDanger: 4, triggerRadius: 520, style: 'crossfire', color: '#f2f7ff', hostile: true },
        raider_sweep: { id: 'raider_sweep', name: 'Raider Sweep', backdrops: { frontier: 4, null: 5 }, minDanger: 3, triggerRadius: 500, style: 'warning', color: '#ff597f', hostile: true },
        abandoned_worksite: { id: 'abandoned_worksite', name: 'Abandoned Worksite', backdrops: { belt: 5, frontier: 4 }, minDanger: 1, triggerRadius: 380, style: 'worksite', color: '#8faab3', companionObject: 'emergency_supply_pod' }
    };

    const LANDMARKS = [
        { id: 'waypoint_zero', type: 'station', name: 'Waypoint Zero', x: 0, y: 0, region: 'trade_belt', faction: 'independents', major: true },
        { id: 'cold_start_beacon', type: 'anomaly', name: 'Cold Start Beacon', x: 1080, y: 270, region: 'trade_belt', faction: 'independents' },
        { id: 'greenline_exchange', type: 'station', name: 'Greenline Exchange', x: -3450, y: -1350, region: 'trade_belt', faction: 'independents' },
        { id: 'helion_bastion', type: 'station', name: 'Helion Bastion', x: 9750, y: -450, region: 'lawful_core', faction: 'concord', major: true },
        { id: 'solace_yards', type: 'station', name: 'Solace Shipyards', x: 13500, y: 2250, region: 'lawful_core', faction: 'concord' },
        { id: 'shatterline_post', type: 'station', name: 'Shatterline Post', x: -1200, y: 7800, region: 'frontier', faction: 'independents', major: true },
        { id: 'rust_orbit', type: 'station', name: 'Rust Orbit', x: -10800, y: 750, region: 'outlaw_expanse', faction: 'corsairs', major: true },
        { id: 'black_market', type: 'station', name: 'The Black Relay', x: -14700, y: -2850, region: 'outlaw_expanse', faction: 'corsairs' },
        { id: 'rim_observatory', type: 'station', name: 'Rim Observatory', x: 10350, y: 7800, region: 'anomaly_rim', faction: 'independents', major: true },
        { id: 'glass_wake', type: 'anomaly', name: 'The Glass Wake', x: 14100, y: 10200, region: 'anomaly_rim', faction: 'independents' },
        { id: 'silent_crown', type: 'anomaly', name: 'Silent Crown', x: 2700, y: 10350, region: 'frontier', faction: 'independents' },
        { id: 'frostglass_relay', type: 'anomaly', name: 'Frostglass Relay', x: -27000, y: -12600, region: 'frostglass_reach', faction: 'independents' },
        { id: 'crown_anchorage', type: 'station', name: 'Crown Anchorage', x: -15300, y: -11700, region: 'corsairs_crown', faction: 'corsairs', major: true },
        { id: 'zenith_grave_signal', type: 'anomaly', name: 'Zenith Grave Signal', x: 0, y: -12600, region: 'zenith_grave', faction: 'independents' },
        { id: 'vanguard_gate', type: 'station', name: 'Vanguard Gate', x: 15300, y: -13400, region: 'helion_vanguard', faction: 'concord', major: true },
        { id: 'luminous_prism', type: 'anomaly', name: 'Luminous Prism', x: 27000, y: -12600, region: 'luminous_verge', faction: 'independents' },
        { id: 'redshift_haven', type: 'station', name: 'Redshift Haven', x: -28600, y: -600, region: 'redshift_march', faction: 'corsairs' },
        { id: 'concordat_reach_station', type: 'station', name: 'Concordat Reach Station', x: 28400, y: -2700, region: 'concordat_reach', faction: 'concord' },
        { id: 'smugglers_lantern', type: 'station', name: "Smuggler's Lantern", x: -28600, y: 10200, region: 'smugglers_wake', faction: 'corsairs' },
        { id: 'cinder_foundry', type: 'station', name: 'Cinder Foundry', x: -12100, y: 7900, region: 'cinder_drift', faction: 'corsairs' },
        { id: 'prism_lens', type: 'anomaly', name: 'Prism Lens', x: 27000, y: 9000, region: 'prism_wilds', faction: 'independents' },
        { id: 'deadstar_anchorage', type: 'station', name: 'Deadstar Anchorage', x: -25200, y: 18800, region: 'deadstar_shoals', faction: 'corsairs', major: true },
        { id: 'pilgrim_exchange', type: 'station', name: 'Pilgrim Exchange', x: -15200, y: 20800, region: 'iron_pilgrim_belt', faction: 'independents' },
        { id: 'far_meridian_beacon', type: 'anomaly', name: 'Far Meridian Beacon', x: 0, y: 19800, region: 'far_meridian', faction: 'independents' },
        { id: 'sunfall_citadel', type: 'station', name: 'Sunfall Citadel', x: 14600, y: 20800, region: 'sunfall_expanse', faction: 'concord', major: true },
        { id: 'eventide_scar', type: 'anomaly', name: 'Eventide Scar', x: 27000, y: 19800, region: 'eventide_scar', faction: 'independents' },
        { id: 'wreckline_harbor', type: 'station', name: 'Wreckline Harbor', x: -29970, y: 28980, region: 'ashen_undertow', faction: 'corsairs', major: true },
        { id: 'auric_choir', type: 'anomaly', name: 'The Auric Choir', x: -10800, y: 29304, region: 'gilded_expanse', faction: 'independents' },
        { id: 'last_meridian', type: 'station', name: 'Last Meridian', x: -1890, y: 32544, region: 'meridian_deep', faction: 'independents' },
        { id: 'marchlight_citadel', type: 'station', name: 'Marchlight Citadel', x: 15795, y: 32112, region: 'helion_marches', faction: 'concord', major: true },
        { id: 'chasm_lens', type: 'anomaly', name: 'Chasm Lens', x: 24030, y: 28980, region: 'violet_chasm', faction: 'independents' },
        { id: 'nullwake_hold', type: 'station', name: 'Nullwake Hold', x: -24300, y: 40104, region: 'nullwake_abyss', faction: 'corsairs', major: true },
        { id: 'pilgrims_end_beacon', type: 'anomaly', name: "Pilgrim's End Beacon", x: -15390, y: 43344, region: 'pilgrims_end', faction: 'independents' },
        { id: 'terminus_exchange', type: 'station', name: 'Terminus Exchange', x: 2295, y: 42912, region: 'terminus_reach', faction: 'independents', major: true },
        { id: 'dawnwall_bastion', type: 'station', name: 'Dawnwall Bastion', x: 10530, y: 39780, region: 'dawnwall_verge', faction: 'concord', major: true },
        { id: 'eventide_heart', type: 'anomaly', name: 'Eventide Heart', x: 29700, y: 40104, region: 'eventide_deep', faction: 'independents' }
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
        pulse_mk1: { id: 'pulse_mk1', name: 'Pulse Cannon I', slot: 'primary', mass: 4, energy: 7, heat: 9, damage: 15, fireRate: .18, cost: C(0), tier: 1, unlock: 'starter' },
        pulse_mk2: { id: 'pulse_mk2', name: 'Pulse Cannon II', slot: 'primary', mass: 6, energy: 11, heat: 13, damage: 23, fireRate: .16, cost: C(300, 0, 10), tier: 2, unlock: 'combat' },
        rail_driver: { id: 'rail_driver', name: 'Kestrel Rail Driver', slot: 'primary', mass: 9, energy: 18, heat: 22, damage: 48, fireRate: .48, cost: C(450, 0, 25), tier: 3, unlock: 'faction25' },
        seeker_rack: { id: 'seeker_rack', name: 'Seeker Rack', slot: 'primary', mass: 7, energy: 14, heat: 18, damage: 70, fireRate: 1.6, cost: C(360, 4, 14), tier: 2, unlock: 'combat' },
        reactor_mk1: { id: 'reactor_mk1', name: 'Arc Reactor I', slot: 'reactor', mass: 5, reactor: 80, cost: C(0), tier: 1, unlock: 'starter' },
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
    const MODULE_DESCRIPTIONS = {
        pulse_mk1: 'Reliable short-cycle pulse weapon with forgiving power demand.', pulse_mk2: 'Higher-output pulse cannon built for sustained combat.', rail_driver: 'Heavy precision driver trading cadence for decisive impact.', seeker_rack: 'Slow-cycling guided ordnance with exceptional burst damage.',
        reactor_mk1: 'Starter arc core supplying the Wayfarer energy reserve.', reactor_mk2: 'Expanded reactor core for weapon and active-module endurance.', drive_mk1: 'Balanced vector drive for routine frontier flight.', drive_mk2: 'Reinforced drive delivering stronger acceleration authority.', light_drive: 'Asterion phase engine enabling controlled inter-sector Light Speed.',
        shield_scout: 'Fast-recharging light screen with a short recovery delay.', shield_balanced: 'General-purpose shield balancing capacity and recovery.', shield_bulwark: 'Massive defensive screen with deliberately slow recovery.', shield_prism: 'Experimental screen optimized for rapid regeneration.',
        cargo_mk1: 'Compact internal lattice for routine freight.', cargo_mk2: 'Expanded hold structure for contract and trade operations.', repair_drones: 'Autonomous drones that restore damaged hull over time.', sensor_array: 'Long-baseline scanner extending contact detection range.', heat_sink: 'Phase vents that sharply improve weapon heat dissipation.', cargo_pods: 'External pods adding capacity at a meaningful mass cost.',
        afterburner: 'Short vector surge for pursuit and disengagement.', blink_drive: 'Instant short-range translation along the current vector.', shield_overcharger: 'Temporary reserve screen for emergency defense.', emp_wave: 'Radial disruption pulse that damages and disables hostiles.', repair_swarm: 'Active repair cloud restoring hull during a timed cycle.', phase_cloak: 'Brief phase masking that breaks hostile firing solutions.'
    };
    Object.values(MODULES).forEach(module => { module.description = MODULE_DESCRIPTIONS[module.id] || 'Wayfarer-compatible ship module.'; });

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
    const TRAIT_DISPLAY = {
        ace_vectoring: { unit: 'percent', label: 'LATERAL THRUST' }, ace_thrusters: { unit: 'percent', label: 'THRUST' }, ace_cooling: { unit: 'percent', label: 'WEAPON HEAT', direction: 'less' }, ace_critical: { unit: 'percent', label: 'CRITICAL CHANCE' },
        engineer_routing: { unit: 'flat', label: 'REACTOR CAPACITY' }, engineer_patch: { unit: 'percent', label: 'REPAIR EFFECTIVENESS' }, engineer_mass: { unit: 'percent', label: 'FITTED MASS', direction: 'less' }, engineer_shields: { unit: 'percent', label: 'MAXIMUM SHIELDS' },
        pathfinder_sensors: { unit: 'flat', label: 'SENSOR RANGE' }, pathfinder_fuel: { unit: 'percent', label: 'ACTIVE ENERGY COST', direction: 'less' }, pathfinder_anomaly: { unit: 'percent', label: 'DISCOVERY REWARDS' }, pathfinder_salvage: { unit: 'percent', label: 'SALVAGE YIELD' },
        operator_pay: { unit: 'percent', label: 'CONTRACT REWARDS' }, operator_market: { unit: 'percent', label: 'MARKET PRICES' }, operator_cargo: { unit: 'flat', label: 'CARGO CAPACITY' }, operator_reputation: { unit: 'percent', label: 'POSITIVE REPUTATION' }
    };
    TRAITS.forEach(item => { item.display = item.capstone ? { unit: 'capstone', label: 'CAPSTONE' } : TRAIT_DISPLAY[item.id]; });

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

    ns.Data = { FACTIONS: F, REGIONS, LANDMARKS, WORLD_OBJECT_TYPES, WORLD_SCENARIOS, COMMODITIES, MODULES, TRAITS, CONTRACT_TYPES, QUESTS };
})(window.MiniInvadersV2);
