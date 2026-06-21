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

function bootDom() {
  const dom = new JSDOM(read('index.html'), { runScripts: 'outside-only', url: 'https://mini-invaders-v2.test/' });
  const gradient = { addColorStop() {} };
  const context = { setTransform() {}, fillRect() {}, strokeRect() {}, clearRect() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, ellipse() {}, stroke() {}, fill() {}, save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, setLineDash() {}, fillText() {}, createRadialGradient: () => gradient };
  dom.window.HTMLCanvasElement.prototype.getContext = () => context;
  dom.window.HTMLCanvasElement.prototype.getBoundingClientRect = () => ({ width: 1280, height: 720 });
  dom.window.requestAnimationFrame = () => 1;
  expectedScripts.forEach(file => dom.window.eval(read(file)));
  return dom;
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
    dom.window.miniInvadersV2Game.ui.updateHud(dom.window.miniInvadersV2Game);
    expect(dom.window.document.getElementById('lightSpeedMap').classList.contains('active')).toBe(true);
    expect(dom.window.document.querySelectorAll('#lightSpeedMap .map-region')).toHaveLength(30);
    dom.window.miniInvadersV2Game.lightSpeed.phase = 'idle';
    dom.window.miniInvadersV2Game.ui.updateHud(dom.window.miniInvadersV2Game);
    expect(dom.window.document.getElementById('lightSpeedMap').classList.contains('active')).toBe(false);
    dom.window.miniInvadersV2Game.ui.openPanel(dom.window.miniInvadersV2Game, 'navigation');
    expect(dom.window.document.querySelector('.galaxy-map')).not.toBeNull();
    expect(dom.window.document.querySelectorAll('.galaxy-map .map-region')).toHaveLength(30);
    expect(dom.window.document.querySelector('.map-hazard').textContent).toContain('SECTOR ENVELOPE');
    expect(dom.window.document.getElementById('headerUndock').hidden).toBe(false);
    expect(dom.window.document.querySelectorAll('[data-action="undock"]')).toHaveLength(1);
    expect(dom.window.document.getElementById('headerUndock').textContent).toContain('UNDOCK');
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
    game.state.dockedAt = 'waypoint_zero';
    game.ui.openPanel(game, 'contracts'); game.input.pressed.add('c'); game.update(1 / 60);
    expect(game.ui.activeTab).toBe('station'); expect(game.ui.panel.classList.contains('active')).toBe(true);
    game.ui.openPanel(game, 'traits'); game.input.pressed.add('Escape'); game.update(1 / 60);
    expect(game.ui.activeTab).toBe('station'); expect(game.state.dockedAt).toBe('waypoint_zero');
    dom.window.close();
  });

  test('accepts through the real button, confirms the waypoint while docked, then undocks explicitly', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game;
    game.newCareer(); game.ui.openPanel(game, 'contracts');
    const view = dom.window.document.querySelector('[data-action="view-contract"]'); expect(view.textContent).toBe('VIEW'); view.click();
    const accept = dom.window.document.querySelector('[data-action="accept-contract"]'); expect(accept).not.toBeNull(); expect(accept.closest('.contract-dropdown')).not.toBeNull(); accept.click();
    expect(game.state.contracts.active).toMatchObject({ id: 'tutorial:cold_start', status: 'active' });
    expect(game.state.dockedAt).toBe('waypoint_zero');
    expect(game.ui.panel.classList.contains('active')).toBe(true);
    expect(game.ui.panelBody.textContent).toContain('WAYPOINT LOCKED');
    expect(game.ui.panelBody.textContent).toContain('Cold Start Beacon');
    expect(game.ui.message.textContent).toContain('CONTRACT ACCEPTED');
    expect(() => game.renderer.render(game)).not.toThrow();
    dom.window.document.getElementById('headerUndock').click();
    expect(game.state.dockedAt).toBeNull(); expect(game.state.contracts.active.id).toBe('tutorial:cold_start');
    expect(game.ui.panel.classList.contains('active')).toBe(false);
    dom.window.close();
  });

  test('completes a derived tutorial contact at its assigned waypoint', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game;
    game.newCareer(); game.ui.openPanel(game, 'contracts'); dom.window.document.querySelector('[data-action="view-contract"]').click(); dom.window.document.querySelector('[data-action="accept-contract"]').click();
    const contact = dom.window.MiniInvadersV2.Contracts.contactFor(game.state.contracts.active);
    game.undock(); game.state.ship.x = contact.x; game.state.ship.y = contact.y;
    expect(game.interact()).toBe(true); expect(game.state.contracts.active).not.toBeNull(); game.updateInteraction(5);
    expect(game.state.contracts.active).toBeNull(); expect(game.state.progression.tutorialStep).toBe(1);
    dom.window.close();
  });

  test('reacquires an incomplete combat wave when the marked zone is revisited', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game;
    game.newCareer(); game.state.dockedAt = null;
    game.state.contracts.active = { id: 'test:combat-zone', type: 'bounty', target: { x: 500, y: 200 }, progress: 1, required: 3 };
    game.state.ship.x = 500; game.state.ship.y = 200; game.enemySpawnedFor = 'test:combat-zone'; game.enemies = [];
    game.updateContract(1 / 60);
    expect(game.enemies).toHaveLength(3); expect(game.enemySpawnedFor).toBe('test:combat-zone');
    dom.window.close();
  });

  test('retains edge-triggered keys until a fixed update can consume them', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game;
    game.newCareer(); game.state.dockedAt = null; game.paused = false; game.interact = jest.fn(); game.last = 100; game.accumulator = 0;
    game.input.pressed.add('f'); game.loop(105);
    expect(game.input.pressed.has('f')).toBe(true); expect(game.interact).not.toHaveBeenCalled();
    game.loop(125);
    expect(game.interact).toHaveBeenCalledTimes(1); expect(game.input.pressed.has('f')).toBe(false);
    dom.window.close();
  });

  test('marks every paid station action unaffordable and explains the missing currency on click', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game; game.newCareer(); game.state.progression.tutorialStep = 2; game.state.ship.hull = 50; game.state.pilot.wallet.banked = { aetherium: 0, sunshards: 0, helionite: 0 };
    game.ui.openPanel(game, 'station'); ['repair', 'chassis', 'insurance'].forEach(action => expect(game.ui.panelBody.querySelector(`[data-action="${action}"]`).classList.contains('unaffordable')).toBe(true));
    game.ui.openPanel(game, 'traits'); expect(game.ui.panelBody.querySelector('[data-action="respec"]').classList.contains('unaffordable')).toBe(true);
    game.ui.openPanel(game, 'trade'); expect(game.ui.panelBody.querySelector('[data-action="buy-cargo"]').classList.contains('unaffordable')).toBe(true); expect(game.ui.panelBody.querySelector('[data-action="buy-module"]').classList.contains('unaffordable')).toBe(true);
    game.ui.openPanel(game, 'station'); game.ui.panelBody.querySelector('[data-action="chassis"]').click(); expect(game.ui.message.textContent).toContain('INSUFFICIENT CREDITS // NEED');
    dom.window.close();
  });

  test('casts salvage interaction, removes it atomically, and cannot award it twice', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game; game.newCareer(); game.undock(); const chunk = Array.from(game.world.chunks.values())[0];
    const salvage = { id: 'salvage:interaction:test', kind: 'salvage', x: game.state.ship.x + 10, y: game.state.ship.y, radius: 18 }; chunk.entities.push(salvage);
    const before = game.state.pilot.wallet.unbanked.aetherium; expect(game.interact()).toBe(true); expect(game.interactionCast).toMatchObject({ duration: 3, progress: 0 }); expect(game.state.pilot.wallet.unbanked.aetherium).toBe(before);
    game.updateInteraction(3); expect(game.state.pilot.wallet.unbanked.aetherium).toBe(before + 35); expect(game.world.loadedEntities()).not.toContain(salvage);
    game.interact(); expect(game.state.pilot.wallet.unbanked.aetherium).toBe(before + 35); expect(game.state.consumedEntityIds).toContain(salvage.id); dom.window.close();
  });

  test('retains cast progress during grace and cancels after range or damage interruption', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game; game.newCareer(); game.undock(); const chunk = Array.from(game.world.chunks.values())[0];
    const signal = { id: 'signal:cast:test', kind: 'signal', name: 'Test Signal', x: game.state.ship.x + 10, y: game.state.ship.y, radius: 18 }; chunk.entities.push(signal);
    game.interact(); game.updateInteraction(2); game.state.ship.x += 300; game.updateInteraction(.5); expect(game.interactionCast.progress).toBeCloseTo(2); game.state.ship.x -= 300; game.updateInteraction(1); expect(game.interactionCast.progress).toBeCloseTo(3);
    game.state.ship.x += 300; game.updateInteraction(.8); expect(game.interactionCast).toBeNull(); game.state.ship.x -= 300; game.interact(); game.state.ship.damageSerial++; game.updateInteraction(.1); expect(game.interactionCast).toBeNull(); dom.window.close();
  });

  test('renders three ship panels with a static fitted profile and module details', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game; game.newCareer(); game.ui.openPanel(game, 'ship');
    expect(game.ui.panelBody.querySelectorAll('.ship-console > section')).toHaveLength(3); expect(game.ui.panelBody.querySelector('.ship-portrait svg')).not.toBeNull(); expect(game.ui.panelBody.textContent).toContain('CORE SHIP AREAS'); expect(game.ui.panelBody.textContent).toContain('WEAPONS AND UTILITY'); expect(game.ui.panelBody.textContent).toContain('Reliable short-cycle pulse weapon');
    const css = read('css/style.css'); expect(css).toContain('.ship-console { display: grid; grid-template-columns:'); expect(css).toContain('.header-undock { min-width:'); dom.window.close();
  });

  test('hides undiscovered region names and exposes station and player map tooltips', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game, ns = dom.window.MiniInvadersV2; game.newCareer(); game.ui.openPanel(game, 'navigation');
    expect(game.ui.panelBody.querySelectorAll('.map-region span')).toHaveLength(1); expect(game.ui.panelBody.querySelector('.map-player').dataset.tooltip).toBe('YOU'); expect([...game.ui.panelBody.querySelectorAll('.map-point')].some(point => point.dataset.tooltip === 'UNKNOWN')).toBe(true);
    const greenline = ns.Data.LANDMARKS.find(item => item.id === 'greenline_exchange'); game.state.ship.x = greenline.x; game.state.ship.y = greenline.y; game.ui.closePanel(); game.state.dockedAt = null; game.paused = false; game.chartNearbyStations(); expect(game.state.discoveries).toContain('greenline_exchange'); game.ui.openPanel(game, 'navigation'); expect([...game.ui.panelBody.querySelectorAll('.map-point')].some(point => point.dataset.tooltip.startsWith('Greenline Exchange //'))).toBe(true); dom.window.close();
  });
});

describe('Frontier Wayfarer world and progression', () => {
  test('defines thirty regions, eight careers, two powers plus neutrals, and four complete trait disciplines', () => {
    const ns = runtime();
    expect(ns.Data.REGIONS).toHaveLength(30); expect(ns.Data.CONTRACT_TYPES).toHaveLength(8); expect(Object.keys(ns.Data.FACTIONS)).toHaveLength(3);
    ['ace', 'engineer', 'pathfinder', 'operator'].forEach(id => {
      const traits = ns.Data.TRAITS.filter(t => t.discipline === id); expect(traits).toHaveLength(5); expect(traits.filter(t => t.capstone)).toHaveLength(1);
    });
  });

  test('covers the expanded 5x6 envelope with large non-overlapping regions and new landmarks', () => {
    const ns = runtime(), bounds = ns.World.WORLD_BOUNDS;
    expect(bounds).toEqual({ minX: -33750, maxX: 33750, minY: -18000, maxY: 46800 });
    const cells = new Set(ns.Data.REGIONS.map(region => `${region.x},${region.y}`));
    expect(cells.size).toBe(30);
    ns.Data.REGIONS.forEach(region => {
      expect(region).toMatchObject({ w: 13500, h: 10800, remoteness: expect.any(Number), economy: expect.any(Object), backdrop: expect.any(String) });
      expect(ns.World.regionAt(region.x + 6750, region.y + 5400).id).toBe(region.id);
    });
    ns.Data.LANDMARKS.forEach(landmark => expect(ns.World.regionAt(landmark.x, landmark.y).id).toBe(landmark.region));
    ns.Data.REGIONS.filter(region => region.column === 0 || region.column === 4 || region.row === 0 || region.row === 5).forEach(region => expect(region.danger).toBeGreaterThanOrEqual(4));
    ['frostglass_relay', 'crown_anchorage', 'eventide_scar', 'wreckline_harbor', 'eventide_heart'].forEach(id => expect(ns.Data.LANDMARKS.some(item => item.id === id)).toBe(true));
    expect(ns.World.regionAt(0, 0).id).toBe('trade_belt');
  });

  test('generates chunks deterministically and shifts the floating origin', () => {
    const ns = runtime(); const first = ns.World.generateChunk(42, 3, -2); const second = ns.World.generateChunk(42, 3, -2);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    const world = new ns.World.WorldService(42); world.update(0, 0); expect(world.chunks.size).toBe(25); world.update(5000, 0); expect(world.origin.x).toBe(5000); expect(world.chunks.size).toBe(25);
  });

  test('uses the requested asteroid belt while keeping the starting sector lighter', () => {
    const ns = runtime(), byGrid = grid => ns.Data.REGIONS.find(region => region.grid === grid);
    ['A1', 'B1', 'B2', 'D2', 'D3', 'E3', 'E4'].forEach(grid => expect(byGrid(grid).asteroidDensity).toBe(1.6)); expect(byGrid('C2').asteroidDensity).toBe(.75);
    const trade = ns.World.generateChunk(42, 0, 0), belt = ns.World.generateChunk(42, 8, 0);
    const count = chunk => chunk.entities.filter(entity => entity.kind === 'asteroid').length;
    expect(count(trade)).toBeGreaterThanOrEqual(3); expect(count(belt)).toBeGreaterThan(count(trade));
  });

  test('buffs starter power and cooling while preserving upgrade and trait headroom', () => {
    const ns = runtime(), state = ns.State.createState(73), starter = ns.Progression.calculateShipStats(state); expect(state.ship.energy).toBe(80); expect(ns.Data.MODULES.pulse_mk1).toMatchObject({ energy: 7, heat: 9 }); expect(Object.values(ns.Data.MODULES).every(module => typeof module.description === 'string' && module.description.length > 10)).toBe(true); expect(starter).toMatchObject({ reactor: 80, energyRecharge: 16, cooling: 15 });
    state.ship.ownedModules.push('heat_sink', 'reactor_mk2'); ns.Progression.equipModule(state, 'utility1', 'heat_sink'); ns.Progression.equipModule(state, 'reactor', 'reactor_mk2'); state.pilot.traits.ace_cooling = 3; state.pilot.traits.engineer_routing = 3; const upgraded = ns.Progression.calculateShipStats(state); expect(upgraded.cooling).toBeGreaterThan(starter.cooling); expect(upgraded.reactor).toBeGreaterThan(starter.reactor); expect(upgraded.effects.weaponHeat).toBeLessThan(0);
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

  test('refreshes deterministic normal boards while keeping tutorial offers fixed', () => {
    const ns = runtime(), station = ns.Data.LANDMARKS.find(item => item.id === 'waypoint_zero');
    const state = ns.State.createState(404); state.progression.tutorialStep = 2;
    const first = ns.Contracts.refreshBoard(state, station).map(item => item.id);
    const second = ns.Contracts.refreshBoard(state, station).map(item => item.id);
    expect(state.contracts.boardRevision).toBe(2); expect(second).not.toEqual(first);
    const repeat = ns.State.createState(404); repeat.progression.tutorialStep = 2;
    ns.Contracts.refreshBoard(repeat, station); expect(ns.Contracts.refreshBoard(repeat, station).map(item => item.id)).toEqual(second);
    const tutorial = ns.State.createState(404); const initial = ns.Contracts.refreshBoard(tutorial, station).map(item => item.id);
    expect(ns.Contracts.refreshBoard(tutorial, station).map(item => item.id)).toEqual(initial); expect(tutorial.contracts.boardRevision).toBe(0);
  });

  test('weights remote boards toward advanced work and remote markets toward higher-tier modules', () => {
    const ns = runtime(), state = ns.State.createState(405), near = ns.Data.LANDMARKS.find(item => item.id === 'waypoint_zero'), remote = ns.Data.LANDMARKS.find(item => item.id === 'nullwake_hold');
    state.progression.tutorialStep = 2; state.pilot.level = 10; state.contracts.completed = 12; state.stats.kills = 30; state.reputations.concord = 30; state.reputations.corsairs = 30; state.visitedRegions.push('anomaly_rim'); state.discoveries.push('glass_wake'); state.ship.ownedModules.push('light_drive');
    const advanced = station => Array.from({ length: 300 }, (_, index) => ns.Contracts.generate(state, station, index)).filter(contract => contract.type === 'advanced').length;
    expect(advanced(remote)).toBeGreaterThan(advanced(near));
    const averageTier = station => { const tiers = []; for (let cycle = 0; cycle < 60; cycle++) { state.playTime = cycle * ns.Economy.INVENTORY_CYCLE_SECONDS; ns.Economy.inventoryFor(state, station).modules.forEach(id => tiers.push(ns.Data.MODULES[id].tier)); } return tiers.reduce((sum, tier) => sum + tier, 0) / tiers.length; };
    expect(averageTier(remote)).toBeGreaterThan(averageTier(near));
  });

  test('enforces a persisted two-minute manual board cooldown without charging initial generation', () => {
    const ns = runtime(), station = ns.Data.LANDMARKS.find(item => item.id === 'waypoint_zero'), state = ns.State.createState(440);
    state.progression.tutorialStep = 2; const initial = ns.Contracts.refreshBoard(state, station); expect(initial.length).toBeGreaterThanOrEqual(5); expect(initial.length).toBeLessThanOrEqual(8); expect(state.contracts.lastManualRefreshAt).toBe(0);
    const first = ns.Contracts.manualRefresh(state, station, 1000000); expect(first.ok).toBe(true); expect(state.contracts.lastManualRefreshAt).toBe(1000000);
    expect(ns.Contracts.manualRefresh(state, station, 1119999)).toMatchObject({ ok: false, remaining: 1 });
    expect(ns.Contracts.manualRefresh(state, station, 1120000).ok).toBe(true);
    const migrated = ns.Save.migrate(JSON.parse(ns.Save.serialize(state))); expect(migrated.contracts.lastManualRefreshAt).toBe(1120000);
  });

  test('formats the unchanged world scale consistently as KM and KM/S', () => {
    const ns = runtime(); expect(ns.MathUtil.formatDistance(1499.6)).toBe('1,500 KM'); expect(ns.MathUtil.formatSpeed(58)).toBe('58 KM/S');
    expect(read('js/ui.js')).not.toMatch(/\}M(?:\s|<|`)/); expect(read('js/renderer.js')).not.toMatch(/distance\}M/); expect(read('index.html')).toContain('0 KM/S');
  });

  test('reports wallet shortfalls and cumulative trait totals', () => {
    const ns = runtime(), state = ns.State.createState(441); state.pilot.wallet.banked = { aetherium: 10, sunshards: 2, helionite: 0 };
    expect(ns.Wallet.shortfall(state, { aetherium: 35, sunshards: 2, helionite: 4 })).toEqual({ aetherium: 25, sunshards: 0, helionite: 4 });
    const trigger = ns.Data.TRAITS.find(item => item.id === 'ace_cooling');
    expect(ns.Progression.traitTotalLabel(trigger, 2)).toBe('14% LESS WEAPON HEAT'); expect(ns.Progression.traitTotalLabel(trigger, 3)).toBe('21% LESS WEAPON HEAT');
  });

  test('consumes procedural salvage and signals permanently', () => {
    const ns = runtime(), state = ns.State.createState(442), world = new ns.World.WorldService(442); world.update(state.ship.x, state.ship.y);
    const chunk = Array.from(world.chunks.values())[0], entity = { id: 'signal:consumed:test', kind: 'salvage', x: 10, y: 10, radius: 18 }; chunk.entities.push(entity);
    expect(world.consumeEntity(state, entity)).toBe(true); expect(world.consumeEntity(state, entity)).toBe(false); expect(state.consumedEntityIds).toContain(entity.id); expect(world.loadedEntities()).not.toContain(entity);
    const restored = new ns.World.WorldService(442, state.consumedEntityIds); restored.update(10, 10); expect(restored.loadedEntities().some(item => item.id === entity.id)).toBe(false);
  });

  test('derives field contacts and binds every progress event to its assigned target', () => {
    const ns = runtime(), state = ns.State.createState(405), target = { x: 800, y: -400 };
    const fieldEvents = { survey: 'scan', salvage: 'salvage', rescue: 'rescue' };
    Object.entries(fieldEvents).forEach(([type, event]) => {
      state.contracts.active = { id: `test:${type}`, type, destination: 'cold_start_beacon', target, progress: 0, required: 1 };
      const contact = ns.Contracts.contactFor(state.contracts.active);
      expect(contact).toMatchObject({ event, x: target.x, y: target.y, contractId: `test:${type}` });
      expect(ns.Contracts.recordProgress(state, event, 1, { x: 0, y: 0 })).toBe(false);
      expect(state.contracts.active.progress).toBe(0);
      expect(ns.Contracts.recordProgress(state, event, 1, contact)).toBe(true);
    });
    state.contracts.active = { id: 'test:bounty', type: 'bounty', target, progress: 0, required: 1 };
    expect(ns.Contracts.recordProgress(state, 'kill', 1, { x: 0, y: 0 })).toBe(false);
    expect(ns.Contracts.recordProgress(state, 'kill', 1, target)).toBe(true);
    state.contracts.active = { id: 'test:haul', type: 'haul', target, progress: 0, required: 1 };
    expect(ns.Contracts.recordProgress(state, 'dock', 1, { x: 0, y: 0 })).toBe(false);
    expect(ns.Contracts.recordProgress(state, 'dock', 1, target)).toBe(true);
  });

  test('targets field contracts at non-stations and penalizes the actual issuer on abandonment', () => {
    const ns = runtime(), state = ns.State.createState(406), station = ns.Data.LANDMARKS.find(item => item.id === 'waypoint_zero');
    state.progression.tutorialStep = 2; state.discoveries.push('signal:unlock');
    const fields = Array.from({ length: 80 }, (_, index) => ns.Contracts.generate(state, station, index)).filter(item => ['survey', 'salvage', 'rescue'].includes(item.type));
    expect(fields.length).toBeGreaterThan(0);
    fields.forEach(contract => expect(ns.Data.LANDMARKS.find(item => item.id === contract.destination).type).not.toBe('station'));
    state.reputations.concord = 12; state.reputations.independents = 5;
    state.contracts.active = { id: 'test:abandon', type: 'haul', issuer: 'concord', target: { x: 0, y: 0 }, status: 'active' };
    expect(ns.Contracts.abandon(state)).toMatchObject({ status: 'failed' });
    expect(state.contracts.active).toBeNull(); expect(state.reputations.concord).toBe(11); expect(state.reputations.independents).toBe(5);
  });

  test('computes safe waypoint presentation for visible, off-screen, shifted, and cleared targets', () => {
    const ns = runtime(), state = ns.State.createState(407), renderer = Object.create(ns.Renderer.prototype);
    state.ship.x = 0; state.ship.y = 0;
    renderer.w = 1280; renderer.h = 720;
    const game = { state, camera: { x: 0, y: 0, zoom: 1 }, lightSpeed: ns.LightSpeed.createState() };
    state.contracts.active = { destination: 'greenline_exchange', target: { x: 100, y: 50 } };
    const visible = renderer.contractWaypoint(game);
    expect(visible).toMatchObject({ onScreen: true, label: 'Greenline Exchange' });
    expect(visible.distance).toBe(Math.round(Math.hypot(100 - state.ship.x, 50 - state.ship.y)));
    state.contracts.active.target = { x: 5000, y: 0 }; const right = renderer.contractWaypoint(game);
    expect(right.onScreen).toBe(false); expect(right.x).toBeCloseTo(right.bounds.right); expect(right.y).toBeCloseTo(360);
    state.contracts.active.target = { x: -5000, y: 0 }; const left = renderer.contractWaypoint(game);
    expect(left.x).toBeCloseTo(left.bounds.left);
    state.contracts.active.target = { x: 0, y: -5000 }; const top = renderer.contractWaypoint(game);
    expect(top.y).toBeCloseTo(top.bounds.top);
    state.contracts.active.target = { x: 0, y: 5000 }; const bottom = renderer.contractWaypoint(game);
    expect(bottom.y).toBeCloseTo(bottom.bounds.bottom);
    game.lightSpeed.phase = 'cruising'; state.contracts.active.target = { x: 100, y: 50 }; expect(renderer.contractWaypoint(game).onScreen).toBe(false);
    game.lightSpeed.phase = 'idle'; renderer.w = 360; renderer.h = 640; state.contracts.active.target = { x: 5000, y: 0 };
    const narrow = renderer.contractWaypoint(game); expect(narrow.x).toBeGreaterThan(0); expect(narrow.x).toBeLessThanOrEqual(360); expect(narrow.y).toBeGreaterThanOrEqual(narrow.bounds.top);
    state.contracts.active = null; expect(renderer.contractWaypoint(game)).toBeNull();
  });

  test('round-trips versioned saves and rejects corrupt saves', () => {
    const store = new Map(); const storage = { setItem: (k, v) => store.set(k, v), getItem: k => store.get(k) || null, removeItem: k => store.delete(k) }; const ns = runtime({ localStorage: storage });
    const state = ns.State.createState(55); state.pilot.wallet.banked.aetherium = 999; state.ship.lightSpeed = { phase: 'cruising' }; state.contracts.active = { destination: 'greenline_exchange', target: { x: 1, y: 1 } };
    expect(ns.Save.save(state, storage)).toBe(true); const loaded = ns.Save.load(storage); expect(loaded.pilot.wallet.banked.aetherium).toBe(999); expect(loaded.ship.lightSpeed).toBeUndefined(); expect(loaded.contracts.active.target).toEqual({ x: -3450, y: -1350 });
    storage.setItem(ns.SAVE_KEY, '{broken'); expect(ns.Save.load(storage)).toBeNull();
  });

  test('upgrades pre-rework escort saves into a resumable rendezvous', () => {
    const ns = runtime(), state = ns.State.createState(552); state.progression.tutorialStep = 2;
    state.contracts.active = { id: 'legacy:escort', type: 'escort', destination: 'greenline_exchange', target: { x: -3450, y: -1350 }, status: 'active', progress: 0, required: 5 };
    const migrated = ns.Save.migrate(JSON.parse(ns.Save.serialize(state))), contract = migrated.contracts.active;
    expect(contract.escort).toMatchObject({ phase: 'rendezvous', convoy: null, end: { x: -3450, y: -1350 } }); expect(ns.MathUtil.distance(contract.escort.start, contract.escort.end)).toBeLessThanOrEqual(1800.01); expect(contract.target).toEqual(contract.escort.start);
  });

  test('migrates legacy diamonds, weapons, shields, coordinates, and loadouts into schema v4', () => {
    const ns = runtime(); const legacy = ns.State.createState(31); legacy.schemaVersion = 1; legacy.pilot.diamonds = 777; delete legacy.pilot.wallet;
    legacy.ship.x = 100; legacy.ship.y = 200;
    legacy.ship.slots.secondary = 'seeker_rack'; legacy.ship.slots.defense = 'shield_mk1'; legacy.ship.ownedModules.push('shield_mk1');
    const migrated = ns.Save.migrate(legacy);
    expect(migrated.schemaVersion).toBe(4); expect(migrated.ship).toMatchObject({ x: 150, y: 300 }); expect(migrated.pilot.wallet.banked).toEqual({ aetherium: 777, sunshards: 0, helionite: 0 }); expect(migrated.ship.slots.utility4).toBeNull();
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

  test('sweeps enemy projectiles into asteroids before ships without awarding mining credits', () => {
    const ns = runtime({ includeGame: true }), state = ns.State.createState(720), world = new ns.World.WorldService(720); world.update(state.ship.x, state.ship.y);
    const asteroid = world.loadedEntities().find(entity => entity.kind === 'asteroid'); asteroid.x = 100; asteroid.y = 0; asteroid.radius = 25; asteroid.hull = asteroid.maxHull = 90;
    state.ship.x = 220; state.ship.y = 0; state.ship.hull = 140; const credits = state.pilot.wallet.unbanked.aetherium;
    const game = { state, world, enemies: [], effects: [], bullets: [{ x: 0, y: 0, vx: 300, vy: 0, radius: 3, damage: 20, life: 2, enemy: true }], spawnImpact: jest.fn(), onDefeat: jest.fn() };
    ns.Game.prototype.updateBullets.call(game, 1);
    expect(asteroid.hull).toBe(70); expect(state.ship.hull).toBe(140); expect(state.pilot.wallet.unbanked.aetherium).toBe(credits); expect(game.bullets).toHaveLength(0);
  });

  test('bounces player and enemy ships off asteroids with thresholded reciprocal damage', () => {
    const ns = runtime({ includeGame: true }), state = ns.State.createState(721), world = new ns.World.WorldService(721); world.update(state.ship.x, state.ship.y);
    const asteroid = world.loadedEntities().find(entity => entity.kind === 'asteroid'); Object.assign(asteroid, { x: 0, y: 0, vx: 0, vy: 0, radius: 30, hull: 90, maxHull: 90 });
    const game = { state, world, time: 10, collisionGuards: new Map(), impactShake: 0, effects: [], spawnImpact: jest.fn(), onEnemyKilled: jest.fn() };
    Object.assign(state.ship, { x: 40, y: 0, vx: -135, vy: 0, hull: 140, shield: 0 });
    expect(ns.Game.prototype.resolveShipAsteroidCollision.call(game, state.ship, 17, asteroid, 'player')).toBe(true);
    expect(state.ship.vx).toBeGreaterThan(0); expect(state.ship.hull).toBeLessThan(140); expect(asteroid.hull).toBeLessThan(90); expect(game.impactShake).toBeGreaterThan(0);
    const enemy = { id: 'enemy:test', x: 40, y: 0, vx: -100, vy: 0, radius: 14, hull: 50 };
    ns.Game.prototype.resolveShipAsteroidCollision.call(game, enemy, enemy.radius, asteroid, 'enemy'); expect(enemy.vx).toBeGreaterThan(0); expect(enemy.hull).toBeLessThan(50);
  });

  test('runs, completes, and fails serialized traveling convoy escorts', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game, ns = dom.window.MiniInvadersV2; game.newCareer(); game.state.dockedAt = null;
    const escort = { phase: 'rendezvous', grace: 8, ambushes: 0, start: { x: 400, y: 0 }, end: { x: 2200, y: 0 }, convoy: null };
    game.state.contracts.active = { id: 'escort:test', type: 'escort', issuer: 'independents', destination: 'waypoint_zero', target: { x: 400, y: 0 }, reward: { aetherium: 1 }, xp: 1, risk: 2, progress: 0, required: 5, status: 'active', escort };
    game.state.ship.x = 400; game.state.ship.y = 0; game.updateContract(1 / 60);
    expect(escort.phase).toBe('traveling'); expect(escort.convoy).toMatchObject({ hull: 220, maxHull: 220 }); expect(game.enemies.every(enemy => enemy.role === 'escort' && enemy.formation === 'wedge')).toBe(true);
    game.enemies.forEach(enemy => expect(ns.MathUtil.distance(enemy, escort.convoy)).toBeGreaterThanOrEqual(760));
    const formationSpan = Math.max(...game.enemies.flatMap(a => game.enemies.map(b => ns.MathUtil.distance(a, b)))); expect(formationSpan).toBeLessThan(220);
    const saved = ns.Save.migrate(JSON.parse(ns.Save.serialize(game.state))); expect(saved.contracts.active.escort.convoy.hull).toBe(220);
    game.enemies = []; escort.convoy.x = 2190; escort.convoy.y = 0; game.state.ship.x = 2190; game.updateContract(1);
    expect(game.state.contracts.active).toBeNull(); expect(game.state.contracts.completed).toBe(1);
    game.state.contracts.active = { id: 'escort:fail', type: 'escort', issuer: 'independents', target: { x: 0, y: 0 }, status: 'active', escort: { phase: 'traveling', grace: .01, ambushes: 2, start: { x: 0, y: 0 }, end: { x: 1000, y: 0 }, convoy: { id: 'convoy:fail', x: 0, y: 0, vx: 0, vy: 0, radius: 18, hull: 180, maxHull: 180 } } };
    game.state.ship.x = 2000; game.updateContract(.1); expect(game.state.contracts.active).toBeNull(); expect(game.ui.message.textContent).toContain('ESCORT LINK LOST');
    dom.window.close();
  });

  test('escort raiders switch from the convoy to the player after player damage', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game; game.newCareer(); game.state.dockedAt = null; game.paused = false;
    const convoy = { id: 'convoy:aggro', x: 0, y: 0, vx: 0, vy: 0, radius: 18, hull: 220, maxHull: 220 };
    game.state.contracts.active = { type: 'escort', target: { x: 0, y: 0 }, escort: { phase: 'traveling', convoy } }; Object.assign(game.state.ship, { x: 700, y: 0 });
    const enemy = { id: 'escort:raider', x: 300, y: 0, vx: 0, vy: 0, angle: 0, radius: 14, hull: 50, maxHull: 50, cooldown: 99, role: 'escort', aggroed: false };
    game.enemies = [enemy]; game.world.loadedEntities = () => []; game.world.nearbyEntities = () => [];
    game.updateEnemies(.1); expect(enemy.vx).toBeLessThan(0);
    Object.assign(enemy, { x: 300, y: 0, vx: 0, vy: 0 }); game.bullets = [{ x: 700, y: 0, vx: -400, vy: 0, radius: 3, damage: 5, life: 2, enemy: false }]; game.updateBullets(1);
    expect(enemy.aggroed).toBe(true); Object.assign(enemy, { x: 300, y: 0, vx: 0, vy: 0 }); game.updateEnemies(.1); expect(enemy.vx).toBeGreaterThan(0);
    dom.window.close();
  });

  test('renders distinct animated effects for every passive utility', () => {
    const ns = runtime(), renderer = Object.create(ns.Renderer.prototype), calls = { arcs: 0, lines: 0, fills: 0 };
    renderer.ctx = { beginPath() {}, arc() { calls.arcs++; }, moveTo() {}, lineTo() { calls.lines++; }, stroke() {}, fillRect() { calls.fills++; }, set strokeStyle(v) {}, set fillStyle(v) {}, set globalAlpha(v) {} };
    const state = ns.State.createState(722); state.ship.slots.utility1 = 'repair_drones'; state.ship.slots.utility2 = 'sensor_array'; state.ship.slots.utility3 = 'heat_sink'; state.ship.slots.cargo = 'cargo_mk1'; state.ship.ownedModules.push('repair_drones', 'sensor_array', 'heat_sink', 'cargo_pods'); state.ship.slots.utility4 = 'cargo_pods'; state.ship.heat = 70; state.ship.hull = 100;
    expect(() => renderer.drawUtilityEffects({ state, time: 3 })).not.toThrow(); expect(calls.arcs).toBeGreaterThan(0); expect(calls.lines).toBeGreaterThan(4); expect(calls.fills).toBeGreaterThan(2);
  });

  test('live controls use mouse weapon groups, F interaction, and ability keys only', () => {
    const game = read('js/game.js');
    expect(game).toContain("this.input.mouse.primary) this.fire('primary1')"); expect(game).toContain("this.input.mouse.secondary) this.fire('primary2')");
    expect(game).toContain("this.input.consume('f')"); expect(game).not.toContain("this.input.consume('x')"); expect(game).not.toContain("this.input.down(' ', 'f')"); expect(game).not.toContain('s.boost');
    expect(game).toContain("this.input.consume('r')"); expect(read('index.html')).toContain('id="lightDriveHud"');
    expect(read('index.html')).not.toContain('diamondCount'); expect(read('index.html')).toContain('id="worldWallet"'); expect(read('index.html')).toContain('id="menuWallet"'); expect(read('index.html')).toContain('id="startWallet"');
  });

  test('routes panel hotkeys while paused and ignores editable-control keypresses', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game; game.newCareer(); game.state.dockedAt = null; game.ui.openPanel(game, 'navigation'); game.last = 100; game.accumulator = 0;
    game.input.pressed.add('t'); game.loop(105); expect(game.ui.activeTab).toBe('traits'); expect(game.ui.panel.classList.contains('active')).toBe(true);
    game.input.pressed.add('t'); game.loop(110); expect(game.ui.panel.classList.contains('active')).toBe(false);
    const slider = dom.window.document.getElementById('volumeSetting') || dom.window.document.body.appendChild(dom.window.document.createElement('input')); slider.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'c', bubbles: true })); expect(game.input.pressed.has('c')).toBe(false);
    dom.window.close();
  });

  test('projects every weapon hardpoint through the same lagged camera as its bullet', () => {
    const ns = runtime({ includeGame: true }), state = ns.State.createState(81), renderer = Object.create(ns.Renderer.prototype); Object.assign(renderer, { w: 1280, h: 720, shakeX: 0, shakeY: 0 });
    const game = { state, camera: { x: -240, y: 175 }, bullets: [], weaponCooldowns: { primary1: 0, primary2: 0 }, weaponMuzzle: ns.Game.prototype.weaponMuzzle };
    const cases = [['primary1', 'pulse_mk1'], ['primary2', 'seeker_rack'], ['primary2', 'rail_driver']];
    [0, Math.PI / 2, Math.PI, -Math.PI / 2, Math.PI / 4].forEach(angle => cases.forEach(([slot, id]) => {
      state.ship.angle = angle; const muzzle = ns.MathUtil.weaponHardpoint(state.ship, slot, ns.Data.MODULES[id]); const visible = renderer.screen(muzzle, game.camera), ship = renderer.screen(state.ship, game.camera);
      expect(Math.hypot(visible.x - ship.x, visible.y - ship.y)).toBeCloseTo(Math.hypot(muzzle.x - state.ship.x, muzzle.y - state.ship.y), 6);
      expect(ns.Game.prototype.weaponMuzzle.call(game, slot, ns.Data.MODULES[id])).toEqual(muzzle);
    }));
  });

  test('fits four distinct utilities and preserves them through schema v4 saves', () => {
    const ns = runtime(), state = ns.State.createState(82); state.ship.chassis.massLimit = 200; const utilities = ['repair_drones', 'sensor_array', 'heat_sink', 'cargo_pods']; state.ship.ownedModules.push(...utilities);
    utilities.forEach((id, index) => expect(ns.Progression.equipModule(state, `utility${index + 1}`, id)).toBe(true));
    expect(Object.values(state.ship.slots).filter(id => utilities.includes(id))).toEqual(expect.arrayContaining(utilities));
    const loaded = ns.Save.migrate(JSON.parse(ns.Save.serialize(state))); expect(loaded.schemaVersion).toBe(4); expect(loaded.ship.slots.utility4).toBe('cargo_pods'); expect(ns.Progression.calculateShipStats(loaded).cargo).toBeGreaterThan(14);
  });

  test('equips the Asterion Light Drive from the real ship panel after purchase', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game, ns = dom.window.MiniInvadersV2;
    game.newCareer(); game.state.progression.tutorialStep = 2; game.state.pilot.level = 4; game.state.contracts.completed = 5;
    game.state.pilot.wallet.banked = { aetherium: 5000, sunshards: 100, helionite: 100 };
    const station = ns.Data.LANDMARKS.find(item => item.id === game.state.dockedAt);
    expect(ns.Economy.buyModule(game.state, 'light_drive', station)).toBe(true);
    game.ui.openPanel(game, 'ship');
    const button = [...dom.window.document.querySelectorAll('[data-action="equip"]')].find(item => item.dataset.id === 'light_drive');
    expect(button).not.toBeNull();
    button.click();
    expect(game.state.ship.slots.engine).toBe('light_drive');
    dom.window.close();
  });

  test('explains when a purchased Asterion Light Drive would exceed the mass limit', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game, ns = dom.window.MiniInvadersV2;
    game.newCareer(); game.state.progression.tutorialStep = 2; game.state.pilot.level = 4; game.state.contracts.completed = 5;
    game.state.ship.chassis.massLimit = 20; game.state.pilot.wallet.banked = { aetherium: 5000, sunshards: 100, helionite: 100 };
    const station = ns.Data.LANDMARKS.find(item => item.id === game.state.dockedAt);
    expect(ns.Economy.buyModule(game.state, 'light_drive', station)).toBe(true);
    game.ui.openPanel(game, 'ship');
    const button = [...dom.window.document.querySelectorAll('[data-action="equip"]')].find(item => item.dataset.id === 'light_drive');
    expect(button.classList.contains('unaffordable')).toBe(true);
    button.click();
    expect(game.state.ship.slots.engine).toBe('drive_mk1');
    expect(game.ui.message.textContent).toContain('MASS LIMIT EXCEEDED');
    dom.window.close();
  });

  test('generates and advances all advanced contract templates with plural objectives', () => {
    const ns = runtime(), station = ns.Data.LANDMARKS.find(item => item.id === 'waypoint_zero'), make = template => { const state = ns.State.createState(83); state.progression.tutorialStep = 2; state.contracts.completed = 3; const contract = ns.Contracts.generateAdvanced(state, station, 0, () => .31, template); state.contracts.board = [contract]; ns.Contracts.accept(state, contract.id); return { state, contract }; };
    const multi = make('multi_haul'); expect(multi.contract.stageMode).toBe('parallel'); expect(ns.Contracts.targetsFor(multi.contract).length).toBeGreaterThanOrEqual(2); multi.contract.stages.forEach((stage, index) => { const destination = ns.Data.LANDMARKS.find(item => item.id === stage.destination); expect(ns.Contracts.recordProgress(multi.state, 'dock', 1, destination)).toBe(index === multi.contract.stages.length - 1); });
    const survey = make('deep_survey'); expect(survey.contract.stages).toHaveLength(3); const firstSurvey = ns.Contracts.contactFor(survey.contract); expect(ns.Contracts.recordProgress(survey.state, firstSurvey.event, 1, firstSurvey)).toBe(false); expect(ns.Contracts.activeStages(survey.contract)[0].name).toContain('2');
    const search = make('area_search'); expect(ns.Contracts.contactFor(search.contract)).toBeNull(); const area = search.contract.stages[0].search.center; expect(ns.Contracts.revealSearches(search.state, area)).toHaveLength(1); const found = ns.Contracts.contactFor(search.contract); expect(found).not.toBeNull(); expect(ns.Contracts.recordProgress(search.state, 'search', 1, found)).toBe(true);
    const recovery = make('cargo_recovery'); const cargo = ns.Contracts.contactFor(recovery.contract); expect(ns.Contracts.recordProgress(recovery.state, 'pickup', 1, cargo)).toBe(false); expect(ns.Contracts.activeStages(recovery.contract)[0].event).toBe('dock'); expect(recovery.contract.missionPayload.kind).toBe('recovered-cargo');
    const lost = make('lost_ship_escort'); ns.Contracts.revealSearches(lost.state, lost.contract.stages[0].search.center); const ship = ns.Contracts.contactFor(lost.contract); expect(ns.Contracts.recordProgress(lost.state, 'search', 1, ship)).toBe(false); expect(ns.Contracts.activeStages(lost.contract)[0].escort).toBeTruthy(); expect(ns.Contracts.startEscort(lost.state)).toMatchObject({ hull: 220 });
    const restored = ns.Save.migrate(JSON.parse(ns.Save.serialize(lost.state))); expect(restored.contracts.active.stages[1].escort.convoy.hull).toBe(220);
  });

  test('varies deterministic board size and persists station-specialty market rotations', () => {
    const ns = runtime(), major = ns.Data.LANDMARKS.find(item => item.id === 'waypoint_zero'), minor = ns.Data.LANDMARKS.find(item => item.id === 'greenline_exchange'), state = ns.State.createState(84); state.progression.tutorialStep = 2; state.contracts.completed = 3;
    const majorBoard = ns.Contracts.refreshBoard(state, major), repeat = ns.State.createState(84); repeat.progression.tutorialStep = 2; repeat.contracts.completed = 3; expect(ns.Contracts.refreshBoard(repeat, major).map(item => item.id)).toEqual(majorBoard.map(item => item.id)); expect(majorBoard.length).toBeGreaterThanOrEqual(5); expect(majorBoard.length).toBeLessThanOrEqual(8);
    const minorState = ns.State.createState(84); minorState.progression.tutorialStep = 2; const minorBoard = ns.Contracts.refreshBoard(minorState, minor); expect(minorBoard.length).toBeGreaterThanOrEqual(3); expect(minorBoard.length).toBeLessThanOrEqual(6);
    const first = ns.Economy.inventoryFor(state, major), other = ns.Economy.inventoryFor(state, minor); expect(first).not.toEqual(other); expect(ns.Economy.inventoryFor(state, major)).toBe(first);
    state.playTime = ns.Economy.INVENTORY_CYCLE_SECONDS; const rotated = ns.Economy.inventoryFor(state, major); expect(rotated.cycle).toBe(1); expect(rotated).not.toBe(first);
    const unstocked = Object.keys(ns.Data.COMMODITIES).find(id => !rotated.commodities.includes(id) && ns.Unlocks.commodityVisible(state, ns.Data.COMMODITIES[id])); state.ship.cargo[unstocked] = 1; expect(ns.Economy.trade(state, major, unstocked, -1)).toBe(true);
    const restored = ns.Save.migrate(JSON.parse(ns.Save.serialize(state))); expect(restored.marketInventories[major.id]).toEqual(rotated);
  });

  test('renders animated faction station silhouettes without changing station radii', () => {
    const ns = runtime(), renderer = Object.create(ns.Renderer.prototype), calls = { strokes: 0, fills: 0 };
    renderer.ctx = { save() {}, restore() {}, translate() {}, rotate() {}, fillRect() { calls.fills++; }, strokeRect() { calls.strokes++; }, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, stroke() { calls.strokes++; }, fill() { calls.fills++; }, setLineDash() {}, fillText() {}, set fillStyle(v) {}, set strokeStyle(v) {}, set lineWidth(v) {}, set globalAlpha(v) {}, set font(v) {}, set textAlign(v) {} };
    ['independents', 'concord', 'corsairs'].forEach(faction => { const station = ns.Data.LANDMARKS.find(item => item.type === 'station' && item.faction === faction); const radius = station.radius; expect(() => renderer.drawStation(station, { x: 200, y: 200 }, 4)).not.toThrow(); expect(station.radius).toBe(radius); }); expect(calls.strokes).toBeGreaterThan(15); expect(calls.fills).toBeGreaterThan(10);
  });

  test('recovers the career by losing only unbanked resources plus uninsured cargo', () => {
    const ns = runtime(); const state = ns.State.createState(8); const world = new ns.World.WorldService(8); world.update(state.ship.x, state.ship.y);
    state.pilot.wallet.banked.aetherium = 1000; state.pilot.wallet.unbanked = { aetherium: 90, sunshards: 4, helionite: 2 }; state.ship.cargo.food = 4; const result = ns.Combat.defeatConsequences(state, world);
    expect(result.lostResources).toEqual({ aetherium: 90, sunshards: 4, helionite: 2 }); expect(state.pilot.wallet.banked.aetherium).toBe(1000); expect(state.ship.cargo).toEqual({}); expect(Object.keys(state.ship.moduleDamage).length).toBeGreaterThan(0); expect(state.pilot.level).toBe(1);
  });
});
