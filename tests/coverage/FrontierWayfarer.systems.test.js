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
  'js/save.js', 'js/combat.js', 'js/abilities.js', 'js/input.js', 'js/renderer.js',
  'js/game.js', 'js/ui.js', 'js/main.js'
];
const coreScripts = expectedScripts.slice(0, 13);

function read(file) { return fs.readFileSync(path.join(gameDir, file), 'utf8'); }
function runtime(overrides = {}) {
  const window = Object.assign({ MiniInvadersV2: {} }, overrides.window);
  const sandbox = { window, console, Math, Date, JSON, Map, Set, localStorage: overrides.localStorage || { getItem: () => null, setItem() {}, removeItem() {} } };
  window.window = window; Object.assign(window, { localStorage: sandbox.localStorage });
  vm.createContext(sandbox); coreScripts.forEach(file => vm.runInContext(read(file), sandbox)); return sandbox.window.MiniInvadersV2;
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
    const context = { setTransform() {}, fillRect() {}, clearRect() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, ellipse() {}, stroke() {}, fill() {}, save() {}, restore() {}, translate() {}, rotate() {}, fillText() {}, createRadialGradient: () => gradient };
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
    dom.window.miniInvadersV2Game.destroy(); dom.window.close();
  });
});

describe('Frontier Wayfarer world and progression', () => {
  test('defines five regions, eight careers, two powers plus neutrals, and four complete trait disciplines', () => {
    const ns = runtime();
    expect(ns.Data.REGIONS).toHaveLength(5); expect(ns.Data.CONTRACT_TYPES).toHaveLength(8); expect(Object.keys(ns.Data.FACTIONS)).toHaveLength(3);
    ['ace', 'engineer', 'pathfinder', 'operator'].forEach(id => {
      const traits = ns.Data.TRAITS.filter(t => t.discipline === id); expect(traits).toHaveLength(5); expect(traits.filter(t => t.capstone)).toHaveLength(1);
    });
  });

  test('generates chunks deterministically and shifts the floating origin', () => {
    const ns = runtime(); const first = ns.World.generateChunk(42, 3, -2); const second = ns.World.generateChunk(42, 3, -2);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    const world = new ns.World.WorldService(42); world.update(0, 0); expect(world.chunks.size).toBe(25); world.update(5000, 0); expect(world.origin.x).toBe(5000); expect(world.chunks.size).toBe(25);
  });

  test('aims ship heading from viewport center to the mouse pointer', () => {
    const ns = runtime();
    expect(ns.MathUtil.angleToPointer({ x: 900, y: 360, hasPosition: true }, { w: 1280, h: 720 }, 2)).toBeCloseTo(0, 6);
    expect(ns.MathUtil.angleToPointer({ x: 640, y: 100, hasPosition: true }, { w: 1280, h: 720 }, 2)).toBeCloseTo(-Math.PI / 2, 6);
    expect(ns.MathUtil.angleToPointer({ hasPosition: false }, { w: 1280, h: 720 }, 1.25)).toBe(1.25);
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
    const state = ns.State.createState(55); state.pilot.wallet.banked.aetherium = 999; expect(ns.Save.save(state, storage)).toBe(true); expect(ns.Save.load(storage).pilot.wallet.banked.aetherium).toBe(999);
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

  test('blink respects world bounds and shield overcharge requires a fitted generator', () => {
    const ns = runtime(); const state = ns.State.createState(33); state.progression.tutorialStep = 2; state.contracts.completed = 3; state.discoveries.push('signal:2:2');
    state.ship.ownedModules.push('blink_drive', 'shield_overcharger', 'shield_scout'); state.ship.slots.abilityQ = 'blink_drive'; state.ship.slots.abilitySpace = 'shield_overcharger';
    const game = { state, world: new ns.World.WorldService(33), enemies: [], notify: jest.fn(), onEnemyKilled: jest.fn() }; game.world.update(state.ship.x, state.ship.y);
    state.ship.x = ns.World.WORLD_BOUNDS.maxX - 10; state.ship.angle = 0; expect(ns.Abilities.activate(game, 'abilityQ')).toBe(true); expect(state.ship.x).toBe(ns.World.WORLD_BOUNDS.maxX);
    expect(ns.Abilities.activate(game, 'abilitySpace')).toBe(false); state.ship.slots.defense = 'shield_scout'; state.ship.shield = 55;
    expect(ns.Abilities.activate(game, 'abilitySpace')).toBe(true); expect(state.ship.overshield).toBe(70);
  });

  test('live controls use mouse weapon groups, F interaction, and ability keys only', () => {
    const game = read('js/game.js');
    expect(game).toContain("this.input.mouse.primary) this.fire('primary1')"); expect(game).toContain("this.input.mouse.secondary) this.fire('primary2')");
    expect(game).toContain("this.input.consume('f')"); expect(game).not.toContain("this.input.consume('x')"); expect(game).not.toContain("this.input.down(' ', 'f')"); expect(game).not.toContain('s.boost');
    expect(read('index.html')).not.toContain('diamondCount'); expect(read('index.html')).toContain('id="worldWallet"'); expect(read('index.html')).toContain('id="menuWallet"'); expect(read('index.html')).toContain('id="startWallet"');
  });

  test('recovers the career by losing only unbanked resources plus uninsured cargo', () => {
    const ns = runtime(); const state = ns.State.createState(8); const world = new ns.World.WorldService(8); world.update(state.ship.x, state.ship.y);
    state.pilot.wallet.banked.aetherium = 1000; state.pilot.wallet.unbanked = { aetherium: 90, sunshards: 4, helionite: 2 }; state.ship.cargo.food = 4; const result = ns.Combat.defeatConsequences(state, world);
    expect(result.lostResources).toEqual({ aetherium: 90, sunshards: 4, helionite: 2 }); expect(state.pilot.wallet.banked.aetherium).toBe(1000); expect(state.ship.cargo).toEqual({}); expect(Object.keys(state.ship.moduleDamage).length).toBeGreaterThan(0); expect(state.pilot.level).toBe(1);
  });
});
