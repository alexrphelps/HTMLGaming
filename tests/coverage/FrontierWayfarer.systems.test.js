const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = global.TextEncoder || TextEncoder;
global.TextDecoder = global.TextDecoder || TextDecoder;
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '../..');
const gameDir = path.join(root, 'games/frontier_wayfarer');
const configPath = path.join(root, 'games.config.js');
const expectedScripts = [
  'js/namespace.js', 'js/data.js', 'js/math.js', 'js/state.js', 'js/wallet.js',
  'js/unlocks.js', 'js/progression.js', 'js/world.js', 'js/economy.js', 'js/contracts.js',
  'js/save.js', 'js/combat.js', 'js/abilities.js', 'js/lightSpeed.js', 'js/input.js', 'js/renderer.js',
  'js/game.js', 'js/ui.js', 'js/main.js'
];
const coreScripts = expectedScripts.slice(0, 16);

function read(file) { return fs.readFileSync(path.join(gameDir, file), 'utf8'); }
function runtime(overrides = {}) {
  const window = Object.assign({ MiniInvadersV2: {} }, overrides.window);
  const sandbox = { window, console, Math, Date, JSON, Map, Set, localStorage: overrides.localStorage || { getItem: () => null, setItem() {}, removeItem() {} } };
  window.window = window; Object.assign(window, { localStorage: sandbox.localStorage });
  vm.createContext(sandbox); coreScripts.forEach(file => vm.runInContext(read(file), sandbox));
  if (overrides.includeGame) vm.runInContext(read('js/game.js'), sandbox);
  return sandbox.window.MiniInvadersV2;
}

describe('Frontier Wayfarer integration contract', () => {
  test('provides an ordered dependency-free standalone entrypoint', () => {
    const html = read('index.html');
    expect([...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1])).toEqual(expectedScripts);
    expect(html).toContain('<canvas id="gameCanvas"');
    expect(html).toContain('css/style.css');
    expect(html).not.toMatch(/https?:\/\//);
    expectedScripts.forEach(file => {
      expect(fs.existsSync(path.join(gameDir, file))).toBe(true);
      expect(() => new Function(read(file))).not.toThrow();
    });
    expect(read('css/style.css')).toContain("cursor: url('../assets/aim-reticle.svg') 16 16, crosshair");
    expect(read('css/style.css')).toContain('.systems-hud { position: absolute; left: 50%; transform: translateX(-50%)');
    expect(read('css/style.css')).toContain('.ability-hud { position: absolute; left: 50%');
    expect(html).toContain('class="panel-workspace"');
    expect(html).toContain('class="start-command"');
    expect(html).toContain('id="headerUndock"');
    expect(read('css/style.css')).toContain('repeat(auto-fit');
    expect(read('css/style.css')).toContain('@media (max-width: 620px)');
    expect(read('css/style.css')).not.toContain('min-width: 960px');
    expect(fs.existsSync(path.join(gameDir, 'assets/aim-reticle.svg'))).toBe(true);
  });

  test('registers V2 separately while retaining the original game', () => {
    const sandbox = { window: {} }; vm.createContext(sandbox); vm.runInContext(fs.readFileSync(configPath, 'utf8'), sandbox);
    const games = JSON.parse(JSON.stringify(sandbox.window.GAMEHUB_GAMES));
    expect(games).toEqual(expect.arrayContaining([
      expect.objectContaining({ folder: 'miniinvaders', name: 'Mini Invaders' }),
      expect.objectContaining({ folder: 'frontier_wayfarer', name: 'Frontier Wayfarer', category: 'Action RPG', saveSupport: 'Campaign' })
    ]));
  });

  test('boots the real entrypoint through main.js', () => {
    const dom = new JSDOM(read('index.html'), { runScripts: 'outside-only', url: 'https://mini-invaders-v2.test/' });
    const gradient = { addColorStop() {} };
    const context = { setTransform() {}, fillRect() {}, strokeRect() {}, clearRect() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, ellipse() {}, stroke() {}, fill() {}, save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, setLineDash() {}, fillText() {}, createRadialGradient: () => gradient };
    dom.window.HTMLCanvasElement.prototype.getContext = () => context;
    dom.window.HTMLCanvasElement.prototype.getBoundingClientRect = () => ({ width: 1280, height: 720 });
    dom.window.requestAnimationFrame = () => 1;
    expectedScripts.forEach(file => dom.window.eval(read(file)));
    expect(dom.window.miniInvadersV2Game).toBeInstanceOf(dom.window.MiniInvadersV2.Game);
    dom.window.miniInvadersV2Game.newCareer();
    expect(dom.window.miniInvadersV2Game.running).toBe(true);
    expect(dom.window.document.getElementById('startScreen').classList.contains('active')).toBe(false);
    expect(dom.window.document.getElementById('worldWallet').textContent).toContain('AE');
    expect(dom.window.document.getElementById('menuWallet').textContent).toContain('SS');
    expect(dom.window.document.getElementById('abilityHud').children).toHaveLength(4);
    expect(dom.window.document.getElementById('lightDriveHud').textContent).toContain('ASTERION');
    expect(() => dom.window.miniInvadersV2Game.renderer.render(dom.window.miniInvadersV2Game)).not.toThrow();
    dom.window.miniInvadersV2Game.lightSpeed.phase = 'cruising';
    expect(() => dom.window.miniInvadersV2Game.renderer.render(dom.window.miniInvadersV2Game)).not.toThrow();
    dom.window.miniInvadersV2Game.lightSpeed.phase = 'idle';
    dom.window.miniInvadersV2Game.ui.openPanel(dom.window.miniInvadersV2Game, 'navigation');
    expect(dom.window.document.querySelector('.galaxy-map')).not.toBeNull();
    expect(dom.window.document.querySelectorAll('.map-region')).toHaveLength(20);
    expect(dom.window.document.querySelector('.map-hazard').textContent).toContain('SECTOR ENVELOPE');
    expect(dom.window.document.getElementById('headerUndock').hidden).toBe(false);
    expect(dom.window.document.querySelectorAll('[data-action="undock"]')).toHaveLength(1);
    const driveHudStyle = read('css/style.css');
    expect(driveHudStyle).toContain('.light-drive-hud { position: absolute; right: 24px; bottom: 162px;');
    dom.window.miniInvadersV2Game.destroy(); dom.window.close();
  });

  test('menu keybinds close the same panel and switch to a different requested panel', () => {
    const dom = new JSDOM(read('index.html'), { runScripts: 'outside-only', url: 'https://mini-invaders-v2.test/' });
    const gradient = { addColorStop() {} };
    const context = { setTransform() {}, fillRect() {}, strokeRect() {}, clearRect() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, ellipse() {}, stroke() {}, fill() {}, save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, setLineDash() {}, fillText() {}, createRadialGradient: () => gradient };
    dom.window.HTMLCanvasElement.prototype.getContext = () => context;
    dom.window.HTMLCanvasElement.prototype.getBoundingClientRect = () => ({ width: 1280, height: 720 });
    dom.window.requestAnimationFrame = () => 1;
    expectedScripts.forEach(file => dom.window.eval(read(file)));
    const game = dom.window.miniInvadersV2Game;
    game.newCareer();
    game.state.dockedAt = null;
    game.ui.openPanel(game, 'navigation');
    game.input.pressed.add('m');
    game.update(1 / 60);
    expect(game.ui.panel.classList.contains('active')).toBe(false);
    game.ui.openPanel(game, 'navigation');
    game.input.pressed.add('t');
    game.update(1 / 60);
    expect(game.ui.panel.classList.contains('active')).toBe(true);
    expect(game.ui.activeTab).toBe('traits');
    dom.window.close();
  });
});

describe('Frontier Wayfarer world and progression', () => {
  test('defines twenty regions, eight careers, two powers plus neutrals, and four complete trait disciplines', () => {
    const ns = runtime();
    expect(ns.Data.REGIONS).toHaveLength(20); expect(ns.Data.CONTRACT_TYPES).toHaveLength(8); expect(Object.keys(ns.Data.FACTIONS)).toHaveLength(3);
    ['ace', 'engineer', 'pathfinder', 'operator'].forEach(id => {
      const traits = ns.Data.TRAITS.filter(t => t.discipline === id); expect(traits).toHaveLength(5); expect(traits.filter(t => t.capstone)).toHaveLength(1);
    });
  });

  test('covers the expanded 5x4 envelope with large non-overlapping regions and new landmarks', () => {
    const ns = runtime(), bounds = ns.World.WORLD_BOUNDS;
    expect(bounds).toEqual({ minX: -22500, maxX: 22500, minY: -12000, maxY: 16800 });
    const cells = new Set(ns.Data.REGIONS.map(region => `${region.x},${region.y}`));
    expect(cells.size).toBe(20);
    ns.Data.REGIONS.forEach(region => {
      expect(region).toMatchObject({ w: 9000, h: 7200, economy: expect.any(Object), backdrop: expect.any(String) });
      expect(ns.World.regionAt(region.x + 4500, region.y + 3600).id).toBe(region.id);
    });
    ['frostglass_relay', 'crown_anchorage', 'eventide_scar'].forEach(id => expect(ns.Data.LANDMARKS.some(item => item.id === id)).toBe(true));
    expect(ns.World.regionAt(0, 0).id).toBe('trade_belt');
  });

  test('generates chunks deterministically and shifts the floating origin', () => {
    const ns = runtime(); const first = ns.World.generateChunk(42, 3, -2); const second = ns.World.generateChunk(42, 3, -2);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    const world = new ns.World.WorldService(42); world.update(0, 0); expect(world.chunks.size).toBe(25); world.update(5000, 0); expect(world.origin.x).toBe(5000); expect(world.chunks.size).toBe(25);
  });

  test('uses a lighter asteroid field in the starting trade belt', () => {
    const ns = runtime(); const trade = ns.World.generateChunk(42, 0, 0), core = ns.World.generateChunk(42, 5, 0);
    const count = chunk => chunk.entities.filter(entity => entity.kind === 'asteroid').length;
    expect(count(trade)).toBeGreaterThanOrEqual(3); expect(count(trade)).toBeLessThanOrEqual(8); expect(count(core)).toBeGreaterThanOrEqual(5);
  });

  test('moves tiered asteroids, splits them down, and remembers destruction for the session', () => {
    const ns = runtime(); const world = new ns.World.WorldService(42); world.update(0, 0);
    const large = world.loadedEntities().find(entity => entity.kind === 'asteroid' && entity.tier === 'large');
    expect(large).toEqual(expect.objectContaining({ hull: 90, vx: expect.any(Number), rotation: expect.any(Number) }));
    const x = large.x; world.updateAsteroids(1); expect(large.x).not.toBe(x);
    const first = world.damageAsteroid(large, 90); expect(first.fragments).toHaveLength(2); expect(first.fragments.every(entity => entity.tier === 'medium')).toBe(true);
    const mediumResult = world.damageAsteroid(first.fragments[0], 45); expect(mediumResult.fragments).toHaveLength(2); expect(mediumResult.fragments[0].tier).toBe('small');
    const small = mediumResult.fragments[0], smallId = small.id; expect(world.damageAsteroid(small, 20).reward).toBe(2);
    world.update(9000, 0); world.update(0, 0); expect(world.loadedEntities().some(entity => entity.id === smallId)).toBe(false);
    expect(new ns.World.WorldService(42).asteroidRecords.size).toBe(0);
  });

  test('reports a soft nebula boundary while preserving the nearest valid region', () => {
    const ns = runtime(), bounds = ns.World.WORLD_BOUNDS;
    expect(ns.World.boundaryExposure(bounds.maxX - 100, 0)).toMatchObject({ active: false, depth: 0 });
    expect(ns.World.boundaryExposure(bounds.maxX + 250, 0)).toMatchObject({ active: true, depth: 250, proximity: 1 });
    expect(ns.World.regionAt(bounds.maxX + 5000, 0).id).toBe('concordat_reach');
  });

  test('aims ship heading from viewport center to the mouse pointer', () => {
    const ns = runtime();
    expect(ns.MathUtil.angleToPointer({ x: 900, y: 360, hasPosition: true }, { w: 1280, h: 720 }, 2)).toBeCloseTo(0, 6);
    expect(ns.MathUtil.angleToPointer({ x: 640, y: 100, hasPosition: true }, { w: 1280, h: 720 }, 2)).toBeCloseTo(-Math.PI / 2, 6);
    expect(ns.MathUtil.angleToPointer({ hasPosition: false }, { w: 1280, h: 720 }, 1.25)).toBe(1.25);
  });

  test('rotates weapon muzzle positions with every ship orientation', () => {
    const ns = runtime({ includeGame: true }), state = ns.State.createState(9), muzzle = ns.Game.prototype.weaponMuzzle;
    state.ship.x = 100; state.ship.y = 200; state.ship.angle = 0;
    expect(muzzle.call({ state }, 'primary1', ns.Data.MODULES.pulse_mk1)).toEqual({ x: 124, y: 185 });
    state.ship.angle = Math.PI / 2;
    const vertical = muzzle.call({ state }, 'primary1', ns.Data.MODULES.pulse_mk1); expect(vertical.x).toBeCloseTo(115); expect(vertical.y).toBeCloseTo(224);
    state.ship.angle = Math.PI;
    const rail = muzzle.call({ state }, 'primary2', ns.Data.MODULES.rail_driver); expect(rail.x).toBeCloseTo(69); expect(rail.y).toBeCloseTo(185);
    state.ship.angle = 0; const game = { state, bullets: [], weaponCooldowns: { primary1: 0, primary2: 0 }, weaponMuzzle: muzzle };
    expect(ns.Game.prototype.fire.call(game, 'primary1')).toBe(true); expect(game.bullets[0]).toMatchObject({ x: 124, y: 185 });
  });

  test('centralizes module and trait effects in the derived ship calculator', () => {
    const ns = runtime(); const state = ns.State.createState(1); const base = ns.Progression.calculateShipStats(state);
    state.pilot.traits.ace_thrusters = 3; state.pilot.traits.operator_cargo = 2;
    state.ship.ownedModules.push('heat_sink'); expect(ns.Progression.equipModule(state, 'utility1', 'heat_sink')).toBe(true);
    const upgraded = ns.Progression.calculateShipStats(state);
    expect(upgraded.thrust).toBeGreaterThan(base.thrust); expect(upgraded.cargo).toBe(base.cargo + 6); expect(upgraded.cooling).toBeGreaterThan(base.cooling);
  });

  test('gates capstones behind investment and achievements and supports paid retraining', () => {
    const ns = runtime(); const state = ns.State.createState(2); state.pilot.traitPoints = 20; state.pilot.wallet.banked = { aetherium: 10000, sunshards: 1000, helionite: 1000 };
    expect(ns.Progression.canBuyTrait(state, 'ace_deadeye')).toBe(false);
    state.pilot.traits = { ace_vectoring: 3, ace_thrusters: 3, ace_cooling: 2 }; state.pilot.achievements.combat_veteran = true;
    expect(ns.Progression.canBuyTrait(state, 'ace_deadeye')).toBe(true); expect(ns.Progression.buyTrait(state, 'ace_deadeye')).toBe(true);
    const pointsBefore = state.pilot.traitPoints; expect(ns.Progression.respec(state)).toBe(true); expect(state.pilot.traits).toEqual({}); expect(state.pilot.traitPoints).toBe(pointsBefore + 9);
  });

  test('derives gradual contract, trade, ability, and shield unlocks from accomplishments', () => {
    const ns = runtime(); const state = ns.State.createState(20);
    expect(ns.Unlocks.evaluate(state)).toMatchObject({ tradeTier: 0, shields: false, abilitySlots: { abilityShift: false, abilitySpace: false } });
    state.progression.tutorialStep = 1; expect(ns.Unlocks.evaluate(state)).toMatchObject({ tradeTier: 1, guildBoard: true, abilitySlots: { abilityShift: true } });
    state.progression.tutorialStep = 2; state.contracts.completed = 3; expect(ns.Unlocks.evaluate(state)).toMatchObject({ shields: true, tradeTier: 2, abilitySlots: { abilitySpace: true } });
    state.discoveries.push('signal:1:1'); expect(ns.Unlocks.evaluate(state).abilitySlots.abilityQ).toBe(true);
    state.pilot.allegiance = 'concord'; expect(ns.Unlocks.evaluate(state).abilitySlots.abilityE).toBe(true);
    state.pilot.level = 4; state.contracts.completed = 5; expect(ns.Unlocks.evaluate(state).lightDrive).toBe(true);
  });

  test('gates the Asterion drive at mid-game and sells it only from major stations', () => {
    const ns = runtime(), state = ns.State.createState(24), drive = ns.Data.MODULES.light_drive;
    expect(drive).toMatchObject({ slot: 'engine', thrust: 300, mass: 10, majorOnly: true, cost: { aetherium: 900, sunshards: 20, helionite: 12 } });
    expect(ns.Unlocks.moduleVisible(state, drive)).toBe(false);
    state.pilot.level = 4; state.contracts.completed = 5; state.pilot.wallet.banked = { aetherium: 1000, sunshards: 30, helionite: 20 };
    const minor = ns.Data.LANDMARKS.find(item => item.id === 'greenline_exchange'), major = ns.Data.LANDMARKS.find(item => item.id === 'waypoint_zero');
    expect(ns.Economy.buyModule(state, 'light_drive', minor)).toBe(false);
    expect(ns.Economy.buyModule(state, 'light_drive', major)).toBe(true);
    expect(state.ship.ownedModules).toContain('light_drive'); expect(ns.Progression.equipModule(state, 'engine', 'light_drive')).toBe(true);
    expect(ns.Progression.calculateShipStats(state).thrust).toBe(300);
  });

  test('keeps expanded contract destinations behind Light Drive ownership', () => {
    const ns = runtime(), state = ns.State.createState(25), station = ns.Data.LANDMARKS.find(item => item.id === 'waypoint_zero');
    state.progression.tutorialStep = 2; state.pilot.level = 8; state.contracts.completed = 12; state.stats.kills = 20;
    const regionFor = contract => ns.Data.REGIONS.find(region => region.id === ns.Data.LANDMARKS.find(item => item.id === contract.destination).region);
    const before = Array.from({ length: 40 }, (_, index) => ns.Contracts.generate(state, station, index));
    expect(before.every(contract => regionFor(contract).travelTier === 0)).toBe(true);
    state.ship.ownedModules.push('light_drive');
    const after = Array.from({ length: 80 }, (_, index) => ns.Contracts.generate(state, station, index));
    expect(after.some(contract => regionFor(contract).travelTier === 1)).toBe(true);
  });

  test('tutorial contracts award Afterburner first and the Scout shield second', () => {
    const ns = runtime(); const state = ns.State.createState(22); const station = ns.Data.LANDMARKS.find(l => l.id === 'waypoint_zero');
    ns.Contracts.refreshBoard(state, station); expect(state.contracts.board[0].name).toBe('Cold Start'); ns.Contracts.accept(state, state.contracts.board[0].id); state.contracts.active.progress = 1; ns.Contracts.complete(state);
    expect(state.progression.tutorialStep).toBe(1); expect(state.ship.slots.abilityShift).toBe('afterburner');
    ns.Contracts.refreshBoard(state, station); expect(state.contracts.board[0].name).toBe('Parts Run'); ns.Contracts.accept(state, state.contracts.board[0].id); state.contracts.active.progress = 1; ns.Contracts.complete(state);
    expect(state.progression.tutorialStep).toBe(2); expect(state.ship.slots.defense).toBe('shield_scout'); expect(state.ship.shield).toBe(55);
  });

  test('uses fitted shield capacity, recharge, and post-hit delay', () => {
    const ns = runtime(); const state = ns.State.createState(21); state.progression.tutorialStep = 2; state.ship.ownedModules.push('shield_scout'); state.ship.slots.defense = 'shield_scout'; state.ship.shield = 55;
    const stats = ns.Progression.calculateShipStats(state); expect(stats).toMatchObject({ shield: 55, shieldRecharge: 12, shieldDelay: 2 });
    ns.Combat.applyDamage(state, 10); expect(state.ship.shield).toBe(45); expect(state.ship.shieldRechargeDelay).toBe(2);
  });
});

describe('Frontier Wayfarer economy, careers, persistence, and defeat', () => {
  test('wallet transactions are atomic and docking deposits all unbanked resources', () => {
    const ns = runtime(); const state = ns.State.createState(30); const original = JSON.stringify(state.pilot.wallet.banked);
    expect(ns.Wallet.debit(state, { aetherium: 200, sunshards: 1 })).toBe(false); expect(JSON.stringify(state.pilot.wallet.banked)).toBe(original);
    ns.Wallet.credit(state, { aetherium: 40, sunshards: 3 }); const deposited = ns.Wallet.deposit(state);
    expect(deposited).toEqual({ aetherium: 40, sunshards: 3, helionite: 0 }); expect(state.pilot.wallet.banked).toEqual({ aetherium: 290, sunshards: 3, helionite: 0 });
  });

  test('keeps markets bounded and supports buying and selling cargo', () => {
    const ns = runtime(); const state = ns.State.createState(3); const station = ns.Data.LANDMARKS[0]; ns.Economy.ensureMarket(state, station);
    state.progression.tutorialStep = 1;
    const buy = ns.Economy.price(state, station, 'food', 'buy'); const sell = ns.Economy.price(state, station, 'food', 'sell');
    expect(buy).toBeGreaterThan(sell); expect(buy).toBeGreaterThan(0); const aetherium = state.pilot.wallet.banked.aetherium;
    expect(ns.Economy.trade(state, station, 'food', 1)).toBe(true); expect(state.ship.cargo.food).toBe(1); expect(state.pilot.wallet.banked.aetherium).toBe(aetherium - buy);
    expect(ns.Economy.trade(state, station, 'food', -1)).toBe(true); expect(state.ship.cargo.food).toBe(0);
    expect(ns.Unlocks.commodityVisible(state, ns.Data.COMMODITIES.medicine)).toBe(false); expect(ns.Unlocks.commodityVisible(state, ns.Data.COMMODITIES.relics)).toBe(false);
  });

  test('creates serializable contracts and applies reputation/allegiance consequences', () => {
    const ns = runtime(); const state = ns.State.createState(4); state.progression.tutorialStep = 2; const station = ns.Data.LANDMARKS[0]; const contract = ns.Contracts.generate(state, station, 0);
    expect(() => JSON.stringify(contract)).not.toThrow(); expect(contract).toEqual(expect.objectContaining({ id: expect.any(String), reward: expect.objectContaining({ aetherium: expect.any(Number) }), target: expect.any(Object) }));
    state.reputations.concord = 20; expect(ns.Contracts.joinFaction(state, 'concord')).toBe(true); state.reputations.corsairs = 20;
    expect(ns.Contracts.joinFaction(state, 'corsairs')).toBe(true); expect(state.pilot.allegiance).toBe('corsairs'); expect(state.reputations.concord).toBeLessThan(0);
    expect(ns.Contracts.leaveFaction(state)).toBe(true); expect(state.pilot.allegiance).toBeNull();
  });

  test('round-trips versioned saves and rejects corrupt saves', () => {
    const store = new Map(); const storage = { setItem: (k, v) => store.set(k, v), getItem: k => store.get(k) || null, removeItem: k => store.delete(k) }; const ns = runtime({ localStorage: storage });
    const state = ns.State.createState(55); state.pilot.wallet.banked.aetherium = 999; state.ship.lightSpeed = { phase: 'cruising' }; state.contracts.active = { destination: 'greenline_exchange', target: { x: 1, y: 1 } };
    expect(ns.Save.save(state, storage)).toBe(true); const loaded = ns.Save.load(storage); expect(loaded.pilot.wallet.banked.aetherium).toBe(999); expect(loaded.ship.lightSpeed).toBeUndefined(); expect(loaded.contracts.active.target).toEqual({ x: -2300, y: -900 });
    storage.setItem(ns.SAVE_KEY, '{broken'); expect(ns.Save.load(storage)).toBeNull();
  });

  test('migrates legacy diamonds, weapons, and shields into schema v2', () => {
    const ns = runtime(); const legacy = ns.State.createState(31); legacy.schemaVersion = 1; legacy.pilot.diamonds = 777; delete legacy.pilot.wallet;
    legacy.ship.slots.secondary = 'seeker_rack'; legacy.ship.slots.defense = 'shield_mk1'; legacy.ship.ownedModules.push('shield_mk1');
    const migrated = ns.Save.migrate(legacy);
    expect(migrated.schemaVersion).toBe(2); expect(migrated.pilot.wallet.banked).toEqual({ aetherium: 777, sunshards: 0, helionite: 0 });
    expect(migrated.ship.slots.primary2).toBe('seeker_rack'); expect(migrated.ship.slots.defense).toBe('shield_balanced'); expect(migrated.ship.ownedModules).toContain('afterburner');
  });

  test('active modules require unlocked slots and consume energy with cooldowns', () => {
    const ns = runtime(); const state = ns.State.createState(32); state.progression.tutorialStep = 1; state.ship.ownedModules.push('afterburner'); state.ship.slots.abilityShift = 'afterburner';
    const game = { state, world: new ns.World.WorldService(32), enemies: [], notify: jest.fn(), onEnemyKilled: jest.fn() }; game.world.update(state.ship.x, state.ship.y);
    const before = state.ship.energy; expect(ns.Abilities.activate(game, 'abilityShift')).toBe(true); expect(state.ship.energy).toBeLessThan(before); expect(state.ship.abilityCooldowns.abilityShift).toBeGreaterThan(0); expect(ns.Abilities.isActive(state, 'afterburner')).toBe(true);
    expect(ns.Abilities.activate(game, 'abilityShift')).toBe(false);
  });

  test('charges, interrupts on damage, cruises with bounded steering, and rematerializes', () => {
    const ns = runtime(), state = ns.State.createState(73); state.pilot.level = 4; state.contracts.completed = 5; state.dockedAt = null;
    state.ship.ownedModules.push('light_drive'); state.ship.slots.engine = 'light_drive'; state.ship.energy = 70; state.ship.angle = 0;
    const world = new ns.World.WorldService(73); world.update(state.ship.x, state.ship.y);
    const game = { state, world, region: ns.World.regionAt(state.ship.x, state.ship.y), camera: { x: state.ship.x, y: state.ship.y }, enemies: [{}], bullets: [{}], effects: [{}], notify: jest.fn(), input: { mouse: { hasPosition: false } }, renderer: { w: 1280, h: 720 }, ui: { panel: { classList: { contains: () => false } } } };
    expect(ns.LightSpeed.beginCharge(game)).toBe(true); ns.LightSpeed.update(game, .4); state.ship.hull -= 1; ns.LightSpeed.update(game, .01);
    expect(game.lightSpeed).toMatchObject({ phase: 'idle', cooldown: expect.any(Number) }); expect(game.lightSpeed.cooldown).toBeGreaterThan(2.9); expect(state.ship.energy).toBe(70);
    game.lightSpeed.cooldown = 0; expect(ns.LightSpeed.beginCharge(game)).toBe(true); ns.LightSpeed.update(game, 2.25);
    expect(game.lightSpeed.phase).toBe('cruising'); expect(state.ship.energy).toBe(35); expect(game.enemies).toHaveLength(0); expect(game.bullets).toHaveLength(0);
    const angle = state.ship.angle; game.input.mouse = { x: 640, y: 0, hasPosition: true }; ns.LightSpeed.update(game, .5);
    expect(Math.abs(state.ship.angle - angle)).toBeLessThanOrEqual(.55 * .5 + .0001); expect(Math.hypot(state.ship.vx, state.ship.vy)).toBeCloseTo(3200, 5);
    expect(ns.LightSpeed.toggle(game)).toBe(true); ns.LightSpeed.update(game, 1.5);
    expect(game.lightSpeed.phase).toBe('idle'); expect(game.lightSpeed.cooldown).toBe(6); expect(Math.hypot(state.ship.vx, state.ship.vy)).toBeCloseTo(340, 5); expect(world.chunks.size).toBe(25);
  });

  test('rejects invalid Light Drive casts and forces exit before the expanded boundary', () => {
    const ns = runtime(), state = ns.State.createState(74), world = new ns.World.WorldService(74);
    const game = { state, world, region: ns.Data.REGIONS[0], camera: {}, enemies: [], bullets: [], effects: [], notify: jest.fn(), input: { mouse: { hasPosition: false } }, renderer: { w: 1280, h: 720 }, ui: { panel: { classList: { contains: () => false } } } };
    expect(ns.LightSpeed.canCharge(game)).toBe(false); state.pilot.level = 4; state.contracts.completed = 5; state.ship.ownedModules.push('light_drive'); state.ship.slots.engine = 'light_drive'; state.dockedAt = null; state.ship.energy = 34;
    expect(ns.LightSpeed.canCharge(game)).toBe(false); state.ship.energy = 70; expect(ns.LightSpeed.canCharge(game)).toBe(true);
    game.lightSpeed = ns.LightSpeed.createState(); game.lightSpeed.phase = 'cruising'; state.ship.x = ns.World.WORLD_BOUNDS.maxX - 3700; state.ship.y = 0; state.ship.angle = 0;
    ns.LightSpeed.update(game, .01); expect(game.lightSpeed.phase).toBe('decelerating'); expect(game.lightSpeed.forcedExit).toBe(true);
    ns.LightSpeed.update(game, 1.5); expect(state.ship.x).toBeLessThanOrEqual(ns.World.WORLD_BOUNDS.maxX - 300);
  });

  test('blink can cross into the nebula and shield overcharge requires a fitted generator', () => {
    const ns = runtime(); const state = ns.State.createState(33); state.progression.tutorialStep = 2; state.contracts.completed = 3; state.discoveries.push('signal:2:2');
    state.ship.ownedModules.push('blink_drive', 'shield_overcharger', 'shield_scout'); state.ship.slots.abilityQ = 'blink_drive'; state.ship.slots.abilitySpace = 'shield_overcharger';
    const game = { state, world: new ns.World.WorldService(33), enemies: [], notify: jest.fn(), onEnemyKilled: jest.fn() }; game.world.update(state.ship.x, state.ship.y);
    state.ship.x = ns.World.WORLD_BOUNDS.maxX - 10; state.ship.angle = 0; expect(ns.Abilities.activate(game, 'abilityQ')).toBe(true); expect(state.ship.x).toBe(ns.World.WORLD_BOUNDS.maxX + 340);
    expect(ns.Abilities.activate(game, 'abilitySpace')).toBe(false); state.ship.slots.defense = 'shield_scout'; state.ship.shield = 55;
    expect(ns.Abilities.activate(game, 'abilitySpace')).toBe(true); expect(state.ship.overshield).toBe(70);
  });

  test('nebula damage bypasses shields and player bullets mine final asteroid fragments', () => {
    const ns = runtime({ includeGame: true }); const state = ns.State.createState(72); state.ship.shield = 55;
    expect(ns.Combat.applyHullDamage(state, 25)).toBe(false); expect(state.ship.hull).toBe(115); expect(state.ship.shield).toBe(55);
    const world = new ns.World.WorldService(72); world.update(state.ship.x, state.ship.y);
    const asteroid = world.loadedEntities().find(entity => entity.kind === 'asteroid' && entity.tier === 'small');
    const before = state.pilot.wallet.unbanked.aetherium;
    const game = { state, world, enemies: [], effects: [], bullets: [{ x: asteroid.x, y: asteroid.y, vx: 0, vy: 0, radius: 4, damage: asteroid.hull, life: 1, enemy: false }], spawnImpact: jest.fn() };
    ns.Game.prototype.updateBullets.call(game, 0);
    expect(game.bullets).toHaveLength(0); expect(game.spawnImpact).toHaveBeenCalled(); expect(state.pilot.wallet.unbanked.aetherium).toBe(before + 2);
    expect(world.loadedEntities()).not.toContain(asteroid);
  });

  test('live controls use mouse weapon groups, F interaction, and ability keys only', () => {
    const game = read('js/game.js');
    expect(game).toContain("this.input.mouse.primary) this.fire('primary1')"); expect(game).toContain("this.input.mouse.secondary) this.fire('primary2')");
    expect(game).toContain("this.input.consume('f')"); expect(game).not.toContain("this.input.consume('x')"); expect(game).not.toContain("this.input.down(' ', 'f')"); expect(game).not.toContain('s.boost');
    expect(game).toContain("this.input.consume('r')"); expect(read('index.html')).toContain('id="lightDriveHud"');
    expect(read('index.html')).not.toContain('diamondCount'); expect(read('index.html')).toContain('id="worldWallet"'); expect(read('index.html')).toContain('id="menuWallet"'); expect(read('index.html')).toContain('id="startWallet"');
  });

  test('recovers the career by losing only unbanked resources plus uninsured cargo', () => {
    const ns = runtime(); const state = ns.State.createState(8); const world = new ns.World.WorldService(8); world.update(state.ship.x, state.ship.y);
    state.pilot.wallet.banked.aetherium = 1000; state.pilot.wallet.unbanked = { aetherium: 90, sunshards: 4, helionite: 2 }; state.ship.cargo.food = 4; const result = ns.Combat.defeatConsequences(state, world);
    expect(result.lostResources).toEqual({ aetherium: 90, sunshards: 4, helionite: 2 }); expect(state.pilot.wallet.banked.aetherium).toBe(1000); expect(state.ship.cargo).toEqual({}); expect(Object.keys(state.ship.moduleDamage).length).toBeGreaterThan(0); expect(state.pilot.level).toBe(1);
  });
});
