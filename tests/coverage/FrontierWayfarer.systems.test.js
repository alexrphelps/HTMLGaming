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
  'js/namespace.js', 'js/data.js', 'js/math.js', 'js/expansion.js', 'js/geometry.js', 'js/galaxies.js', 'js/registry.js', 'js/state.js', 'js/wallet.js', 'js/objectives.js',
  'js/unlocks.js', 'js/progression.js', 'js/interactions.js', 'js/world.js', 'js/economy.js', 'js/contracts.js',
  'js/save.js', 'js/combat.js', 'js/abilities.js', 'js/weapons.js', 'js/encounters.js', 'js/worldEvents.js', 'js/lightSpeed.js', 'js/runtime.js', 'js/commands.js', 'js/input.js', 'js/renderer.js',
  'js/game.js', 'js/components.js', 'js/ui.js', 'js/main.js'
];
const coreScripts = expectedScripts.slice(0, expectedScripts.indexOf('js/game.js'));

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
    expect(read('css/style.css')).toContain('.panel-header .wallet-credit { gap: 9px; padding: 12px 16px; font-size: 15px;');
    expect(read('css/style.css')).toContain('.map-custom-target { position: absolute; width: 12px;');
    expect(read('css/style.css')).not.toContain('min-width: 960px');
    expect(fs.existsSync(path.join(gameDir, 'assets/aim-reticle.svg'))).toBe(true);
    expect(fs.existsSync(path.join(gameDir, 'assets/station-stargate-galaxies.png'))).toBe(true);
    expect(read('css/style.css')).toContain("url('../assets/station-stargate-galaxies.png')");
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
    expect(dom.window.document.getElementById('lightDriveHud').textContent).toContain('LIGHT SPEED');
    expect(dom.window.document.getElementById('lightDriveHud').hidden).toBe(true);
    expect(() => dom.window.miniInvadersV2Game.renderer.render(dom.window.miniInvadersV2Game)).not.toThrow();
    dom.window.miniInvadersV2Game.lightSpeed.phase = 'cruising';
    expect(() => dom.window.miniInvadersV2Game.renderer.render(dom.window.miniInvadersV2Game)).not.toThrow();
    dom.window.miniInvadersV2Game.ui.updateHud(dom.window.miniInvadersV2Game);
    expect(dom.window.document.getElementById('lightSpeedMap').classList.contains('active')).toBe(true);
    expect(dom.window.document.querySelectorAll('#lightSpeedMap .map-region')).toHaveLength(dom.window.miniInvadersV2Game.world.config.regions.length);
    dom.window.miniInvadersV2Game.lightSpeed.phase = 'idle';
    dom.window.miniInvadersV2Game.ui.updateHud(dom.window.miniInvadersV2Game);
    expect(dom.window.document.getElementById('lightSpeedMap').classList.contains('active')).toBe(false);
    dom.window.miniInvadersV2Game.ui.openPanel(dom.window.miniInvadersV2Game, 'navigation');
    expect(dom.window.document.querySelector('.galaxy-map')).not.toBeNull();
    expect(dom.window.document.querySelectorAll('.galaxy-map .map-region')).toHaveLength(dom.window.miniInvadersV2Game.world.config.regions.length);
    expect(dom.window.document.querySelector('.map-hazard').textContent).toContain('SECTOR ENVELOPE');
    expect(dom.window.document.getElementById('headerUndock').hidden).toBe(false);
    expect(dom.window.document.querySelectorAll('[data-action="undock"]')).toHaveLength(1);
    expect(dom.window.document.getElementById('headerUndock').textContent).toContain('UNDOCK');
    const driveHudStyle = read('css/style.css');
    expect(driveHudStyle).toContain('.light-drive-hud { position: absolute; right: 24px; bottom: 162px;');
    expect(driveHudStyle).toContain('.light-drive-hud[hidden] { display: none !important; }');
    const style = dom.window.document.createElement('style'); style.textContent = driveHudStyle; dom.window.document.head.append(style);
    expect(dom.window.getComputedStyle(dom.window.document.getElementById('lightDriveHud')).display).toBe('none');
    expect(dom.window.document.getElementById('lightDriveHud').textContent).toContain('5 SS + 5 HE');
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

  test('sets, replaces, persists, reaches, and removes one custom map waypoint', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game;
    game.newCareer(); game.ui.openPanel(game, 'navigation');
    const map = dom.window.document.querySelector('.galaxy-map'); map.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 500 });
    map.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, clientX: 250, clientY: 300 }));
    const first = { ...game.state.customWaypoint }; expect(first).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) })); expect(game.ui.panelBody.querySelectorAll('.map-custom-target')).toHaveLength(1);
    const replacementMap = game.ui.panelBody.querySelector('.galaxy-map'); replacementMap.getBoundingClientRect = map.getBoundingClientRect; replacementMap.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, clientX: 750, clientY: 100 })); expect(game.state.customWaypoint).not.toEqual(first); expect(game.ui.panelBody.querySelectorAll('.map-custom-target')).toHaveLength(1);
    const saved = JSON.parse(dom.window.localStorage.getItem(dom.window.MiniInvadersV2.SAVE_KEY)); expect(saved.customWaypoint).toEqual(game.state.customWaypoint);
    game.ui.panelBody.querySelector('.map-custom-target').click(); expect(game.state.customWaypoint).toBeNull();
    game.setCustomWaypoint({ x: game.state.ship.x + 200, y: game.state.ship.y }); game.updateCustomWaypoint(); expect(game.state.customWaypoint).toBeNull();
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

  test('shows the blocked destination faction and station when a friendly issuer cannot dock there', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game, ns = dom.window.MiniInvadersV2;
    game.newCareer();
    game.state.progression.tutorialStep = 2;
    game.state.reputations.concord = -50;
    const concord = ns.Data.LANDMARKS.find(item => item.id === 'helion_bastion');
    game.state.contracts.board = [{
      id: 'access:ui',
      type: 'haul',
      issuer: 'independents',
      name: 'Guild Relief Drop',
      description: 'A Frontier Guilds contract routed into Concord space.',
      reward: { aetherium: 100, sunshards: 0, helionite: 0 },
      xp: 40,
      risk: 2,
      status: 'offered',
      target: { x: concord.x, y: concord.y },
      destination: concord.id,
      stages: [{ id: 'access:ui:0', type: 'haul', event: 'dock', destination: concord.id, target: { x: concord.x, y: concord.y }, status: 'active', progress: 0, required: 1 }]
    }];
    game.ui.openPanel(game, 'contracts');
    game.ui.focusedContractId = 'access:ui';
    game.ui.renderPanel(game);
    const dropdown = dom.window.document.querySelector('.contract-dropdown');
    const stage = dropdown.querySelector('.contract-stage');
    const warning = dropdown.querySelector('.contract-access-warning');
    const accept = dropdown.querySelector('[data-action="accept-contract"]');
    expect(stage.textContent).toContain('ACTIVE');
    expect(stage.textContent).toContain('Helion Bastion');
    expect(stage.getAttribute('style')).toContain(ns.Data.FACTIONS.concord.color);
    expect(warning.textContent).toContain('DOCKING DENIED AT HELION BASTION');
    expect(warning.textContent).toContain('CONCORD');
    expect(accept.disabled).toBe(true);
    expect(accept.textContent).toBe('HELION BASTION LOCKED');
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

  test('consumes authored beacons after one completed interaction', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game, beacon = dom.window.MiniInvadersV2.Galaxies.landmarkById(game?.state || dom.window.MiniInvadersV2.State.createState(), 'cold_start_beacon');
    game.newCareer(); game.undock(); const target = dom.window.MiniInvadersV2.Galaxies.landmarkById(game.state, 'cold_start_beacon');
    game.state.ship.x = target.x; game.state.ship.y = target.y; game.world.update(target.x, target.y);
    expect(game.interact()).toBe(true); game.updateInteraction(5);
    expect(game.state.consumedEntityIds).toContain('cold_start_beacon'); expect(game.world.loadedEntities().some(entity => entity.id === 'cold_start_beacon')).toBe(false);
    const restored = new dom.window.MiniInvadersV2.World.WorldService(dom.window.MiniInvadersV2.Galaxies.worldSeed(game.state), game.state.consumedEntityIds, dom.window.MiniInvadersV2.Galaxies.worldConfig(game.state)); restored.update(target.x, target.y);
    expect(restored.loadedEntities().some(entity => entity.id === 'cold_start_beacon')).toBe(false); expect(beacon.id).toBe('cold_start_beacon'); dom.window.close();
  });

  test('renders interaction prompts and cast progress beneath the ship only when relevant', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game; game.newCareer(); game.undock(); game.world.chunks.forEach(chunk => { chunk.entities = chunk.entities.filter(entity => entity.kind === 'asteroid'); }); game.renderer.ctx.fillText = jest.fn();
    game.renderer.drawInteractionPrompt(game); expect(game.renderer.ctx.fillText).not.toHaveBeenCalled();
    const chunk = Array.from(game.world.chunks.values())[0], signal = { id: 'signal:prompt:test', kind: 'signal', name: 'Test Signal', x: game.state.ship.x + 10, y: game.state.ship.y, radius: 18 }; chunk.entities.push(signal);
    game.renderer.drawInteractionPrompt(game); expect(game.renderer.ctx.fillText).toHaveBeenLastCalledWith('F // INTERACT TEST SIGNAL', expect.any(Number), expect.any(Number));
    game.interactionCast = { name: 'Test Signal', duration: 5, progress: 2 }; game.renderer.ctx.fillText.mockClear(); game.renderer.drawInteractionPrompt(game); expect(game.renderer.ctx.fillText).not.toHaveBeenCalled();
    expect(() => game.renderer.drawInteractionCast(game)).not.toThrow(); dom.window.close();
  });

  test('retains cast progress during grace and cancels after range or damage interruption', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game; game.newCareer(); game.undock(); const chunk = Array.from(game.world.chunks.values())[0];
    const signal = { id: 'signal:cast:test', kind: 'signal', name: 'Test Signal', x: game.state.ship.x + 10, y: game.state.ship.y, radius: 18 }; chunk.entities.push(signal);
    game.interact(); game.updateInteraction(2); game.state.ship.x += 300; game.updateInteraction(.5); expect(game.interactionCast.progress).toBeCloseTo(2); game.state.ship.x -= 300; game.updateInteraction(1); expect(game.interactionCast.progress).toBeCloseTo(3);
    game.state.ship.x += 300; game.updateInteraction(.8); expect(game.interactionCast).toBeNull(); game.state.ship.x -= 300; game.interact(); game.state.ship.damageSerial++; game.updateInteraction(.1); expect(game.interactionCast).toBeNull(); dom.window.close();
  });

  test('renders the exact fitted ship path in a static compact three-panel console', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game, drawModel = jest.spyOn(dom.window.MiniInvadersV2.Renderer.prototype, 'drawShipModel'); game.newCareer(); game.ui.openPanel(game, 'ship');
    expect(dom.window.document.getElementById('lightDriveHud').hidden).toBe(true);
    expect(game.ui.panelBody.querySelectorAll('.ship-console > section')).toHaveLength(3); expect(game.ui.panelBody.querySelector('.ship-portrait svg')).toBeNull(); expect(game.ui.panelBody.querySelector('#shipPreviewCanvas')).not.toBeNull(); expect(drawModel).toHaveBeenCalledWith(game, expect.objectContaining({ rotation: 0, static: true }));
    expect(game.ui.panelBody.querySelectorAll('.core-focus > .ship-system-card')).toHaveLength(1); expect(game.ui.panelBody.querySelector('.core-focus h2').textContent).toBe('ENGINE'); expect(game.ui.panelBody.querySelectorAll('.ship-area-hotspot')).toHaveLength(4); expect(game.ui.panelBody.querySelector('.mission-system-grid')).not.toBeNull(); expect(game.ui.panelBody.textContent).toContain('WEAPONS AND ABILITIES'); expect(game.ui.panelBody.querySelectorAll('.mission-tabs button')).toHaveLength(2);
    game.state.ship.slots.engine = 'light_drive'; game.ui.updateHud(game); expect(dom.window.document.getElementById('lightDriveHud').hidden).toBe(false);
    game.ui.panelBody.querySelector('[data-action="select-ship-area"][data-id="cargo"]').click(); expect(game.ui.panelBody.querySelector('.core-focus h2').textContent).toBe('CARGO'); expect(game.ui.panelBody.querySelectorAll('.core-focus > .ship-system-card')).toHaveLength(1); expect(dom.window.document.getElementById('lightDriveHud').hidden).toBe(false);
    const css = read('css/style.css'); expect(css).toContain('.mission-system-grid { display: grid; grid-template-columns: repeat(2'); expect(css).toContain('.panel-body.ship-view { overflow: hidden;'); expect(css).toContain('.header-undock { min-width:'); drawModel.mockRestore(); dom.window.close();
  });

  test('hides undiscovered region names and exposes station and player map tooltips', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game, ns = dom.window.MiniInvadersV2; game.newCareer(); game.ui.openPanel(game, 'navigation');
    expect(game.ui.panelBody.querySelectorAll('.map-region span')).toHaveLength(1); expect(game.ui.panelBody.querySelector('.map-player').dataset.tooltip).toBe('YOU'); expect([...game.ui.panelBody.querySelectorAll('.map-point')].some(point => point.dataset.tooltip === 'UNKNOWN')).toBe(true);
    const greenline = ns.Data.LANDMARKS.find(item => item.id === 'greenline_exchange'); game.state.ship.x = greenline.x; game.state.ship.y = greenline.y; game.ui.closePanel(); game.state.dockedAt = null; game.paused = false; game.chartNearbyStations(); expect(game.state.discoveries).toContain('greenline_exchange'); game.ui.openPanel(game, 'navigation'); expect([...game.ui.panelBody.querySelectorAll('.map-point')].some(point => point.dataset.tooltip.startsWith('Greenline Exchange //'))).toBe(true); dom.window.close();
  });

  test('renders locked-slot info, faction color cues, requested trade goods, and filtered owned modules', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game, ns = dom.window.MiniInvadersV2; game.newCareer();
    game.ui.openPanel(game, 'ship'); expect([...game.ui.panelBody.querySelectorAll('.slot-info')].some(button => button.title.includes('Unlock Shift'))).toBe(true);
    game.ui.openPanel(game, 'navigation'); expect([...game.ui.panelBody.querySelectorAll('.map-region.unknown')].every(region => region.getAttribute('style').includes('#667179'))).toBe(true);
    game.ui.openPanel(game, 'contracts'); expect(game.ui.panelBody.querySelector('.contract-card .faction-badge')).not.toBeNull();
    game.state.progression.tutorialStep = 2; game.state.contracts.completed = 3; game.state.pilot.level = 6; game.state.visitedRegions.push('anomaly_rim'); game.state.pilot.wallet.banked = { aetherium: 10000, sunshards: 1000, helionite: 1000 }; game.ui.openPanel(game, 'trade');
    expect(game.ui.panelBody.querySelector('.trade-header .faction-badge')).not.toBeNull(); expect(game.ui.panelBody.querySelector('.market-grid article.requested')).not.toBeNull();
    const buy = game.ui.panelBody.querySelector('[data-action="buy-module"]'), moduleId = buy.dataset.id; buy.click();
    expect(game.state.ship.ownedModules).toContain(moduleId); expect([...game.ui.panelBody.querySelectorAll('.module-offer')].some(offer => offer.textContent.includes('OWNED') && offer.textContent.includes(ns.Data.MODULES[moduleId].name))).toBe(true);
    game.ui.openPanel(game, 'station'); game.ui.openPanel(game, 'trade');
    expect([...game.ui.panelBody.querySelectorAll('.module-offer')].some(offer => offer.textContent.includes(ns.Data.MODULES[moduleId].name))).toBe(false);
    dom.window.close();
  });
});

describe('Frontier Wayfarer scalable extension seams', () => {
  test('registers new content and handlers without editing central dispatchers', () => {
    const ns = runtime();
    ns.Registry.registerHandler('worldObject', 'test-handler', jest.fn());
    ns.Registry.register('region', { id: 'test_region', name: 'Test Region', x: 50000, y: 50000, w: 4000, h: 3000, faction: 'independents', backdrop: 'frontier', danger: 2 });
    ns.Registry.register('landmark', { id: 'test_station', name: 'Test Station', type: 'station', x: 51000, y: 51000, region: 'test_region', faction: 'independents' });
    ns.Registry.register('worldObject', { id: 'test_object', name: 'Test Object', handlerId: 'test-handler', backdrops: { frontier: 1 }, reward: { aetherium: 1 } });
    ns.Registry.register('worldEvent', { id: 'test_event', name: 'Test Event', backdrops: { frontier: 1 } });
    ns.Registry.register('module', { id: 'test_module', name: 'Test Module', slot: 'utility', mass: 1, tier: 1, cost: { aetherium: 1 } });
    ns.Registry.register('ability', { id: 'test_ability', effectType: 'test-effect' });
    ns.Registry.register('contract', { id: 'test_contract', name: 'Test Contract', baseReward: { aetherium: 1 }, risk: 1 });
    expect(ns.Registry.validate()).toEqual({ ok: true, errors: [] });
    expect(ns.Registry.get('region', 'test_region').w).toBe(4000);
    expect(typeof ns.Registry.handler('worldObject', 'test-handler')).toBe('function');
  });

  test('rejects duplicate ids and reports invalid references', () => {
    const ns = runtime();
    expect(() => ns.Registry.register('region', ns.Data.REGIONS[0])).toThrow(/Duplicate region id/);
    ns.Registry.register('landmark', { id: 'broken_landmark', name: 'Broken', region: 'missing', faction: 'independents' });
    expect(ns.Registry.validate()).toMatchObject({ ok: false, errors: expect.arrayContaining([expect.stringContaining('missing')]) });
  });

  test('supports irregular world regions and configurable streaming', () => {
    const ns = runtime(), regions = [{ id: 'wide', name: 'Wide', x: -1000, y: -500, w: 5000, h: 1400, faction: 'independents', backdrop: 'frontier', danger: 1, asteroidDensity: 0 }];
    const config = ns.World.createConfig({ regions, landmarks: [], chunkSize: 500, loadRadius: 1 });
    expect(config.bounds).toEqual({ minX: -1000, maxX: 4000, minY: -500, maxY: 900 });
    expect(ns.World.regionAt(3500, 0, config).id).toBe('wide');
    const world = new ns.World.WorldService(7, [], config); world.update(0, 0);
    expect(world.chunks.size).toBe(9); expect(world.config.chunkSize).toBe(500);
  });

  test('provides deterministic simulation random streams', () => {
    const ns = runtime(), first = new ns.Runtime.SimulationRandom(42), second = new ns.Runtime.SimulationRandom(42);
    expect([first.next(), first.next(), first.range(5, 10)]).toEqual([second.next(), second.next(), second.range(5, 10)]);
  });

  test('returns structured command results for fitting and upgrades', () => {
    const ns = runtime(), state = ns.State.createState(4); state.ship.ownedModules.push('drive_mk2'); state.ship.chassis.massLimit = 200;
    expect(ns.Commands.equip(state, 'engine', 'drive_mk2')).toMatchObject({ ok: true, changes: { slot: 'engine', moduleId: 'drive_mk2' } });
    state.dockedAt = null; expect(ns.Commands.upgradeChassis(state)).toMatchObject({ ok: false, reason: 'dock-required' });
  });

  test('keeps persistent HUD component nodes across updates', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game; game.newCareer();
    const walletNode = dom.window.document.querySelector('#worldWallet .wallet-credit'), abilityNode = dom.window.document.querySelector('#abilityHud .ability-slot');
    game.ui.updateHud(game); game.ui.updateHud(game);
    expect(dom.window.document.querySelector('#worldWallet .wallet-credit')).toBe(walletNode);
    expect(dom.window.document.querySelector('#abilityHud .ability-slot')).toBe(abilityNode);
    game.destroy(); dom.window.close();
  });

  test('defines fit-first responsive shell contracts', () => {
    const css = read('css/responsive.css'), html = read('index.html');
    expect(html).toContain('class="flight-hud-bottom"'); expect(html).toContain('css/responsive.css');
    expect(css).toContain('height: 100dvh'); expect(css).toContain('grid-template-areas: "top" "viewport" "bottom"');
    expect(css).toContain('@media (max-width: 620px)'); expect(css).toContain('.start-screen { overflow: auto;');
    expect(css).toContain('.galaxy-map { width: 100%; height: auto;'); expect(css).not.toContain('min-width: 960px');
    expect(css).toContain('width: 58.333%'); expect(css).toContain('height: 18.375dvh'); expect(css).toContain('grid-template-columns: repeat(2'); expect(css).toContain('.system-meter > div { height: 8px; }');
    expect(html).toContain('id="coordinateValue"'); expect(html).toContain('M // MAP'); expect(html).not.toContain('ESC SYSTEMS'); expect(html).not.toContain('id="contextPrompt"');
  });
});

describe('Frontier Wayfarer world and progression', () => {
  test('defines an authored 8x8 catalog, eight careers, eight factions, and four complete trait disciplines', () => {
    const ns = runtime();
    expect(ns.Data.REGIONS).toHaveLength(64); expect(ns.Data.CONTRACT_TYPES).toHaveLength(8); expect(Object.keys(ns.Data.FACTIONS)).toHaveLength(8);
    expect(ns.Data.FACTIONS.independents.short).toBe('FRONTIER');
    expect(ns.Data.FACTIONS.aster_collective.color).toBe('#4f8dff');
    expect(new Set(Object.values(ns.Data.FACTIONS).map(faction => faction.color)).size).toBe(Object.keys(ns.Data.FACTIONS).length);
    ['ace', 'engineer', 'pathfinder', 'operator'].forEach(id => {
      const traits = ns.Data.TRAITS.filter(t => t.discipline === id); expect(traits).toHaveLength(7); expect(traits.filter(t => t.capstone)).toHaveLength(1); expect(traits.filter(t => t.specialization)).toHaveLength(2);
    });
  });

  test('covers the coordinate-preserving 8x8 envelope with non-overlapping authored regions', () => {
    const ns = runtime(), bounds = ns.World.WORLD_BOUNDS;
    const outerExpansionRegions = ['northwatch_void', 'pale_crown', 'riven_halo', 'coldfire_span', 'starless_arch', 'aurora_shelf', 'blackglass_north', 'far_north_reach', 'westward_shoal', 'red_margin', 'guildward_edge', 'pilgrim_margin', 'duskwater_edge', 'nullward_drop', 'sunward_gate', 'opal_front', 'brightwater_reach', 'helion_outmarch', 'fracture_bloom', 'corsair_lee', 'amber_shoal', 'longlight_verge', 'violet_outreach', 'deadlight_margin', 'eastern_terminus', 'southwatch_abyss', 'ashen_crown', 'quiet_pilgrimage', 'emerald_terminus', 'dawnfall_shelf', 'orchid_depths', 'black_sun_verge', 'far_south_reach'];
    expect(bounds).toEqual({ minX: -47250, maxX: 60750, minY: -28800, maxY: 57600 });
    const cells = new Set(ns.Data.REGIONS.map(region => `${region.x},${region.y}`));
    expect(cells.size).toBe(64);
    ns.Data.REGIONS.forEach(region => {
      expect(region).toMatchObject({ w: 13500, h: 10800, remoteness: expect.any(Number), economy: expect.any(Object), backdrop: expect.any(String) });
      expect(ns.World.regionAt(region.x + 6750, region.y + 5400).id).toBe(region.id);
    });
    ns.Data.LANDMARKS.forEach(landmark => expect(ns.World.regionAt(landmark.x, landmark.y).id).toBe(landmark.region));
    ns.Data.REGIONS.filter(region => region.column === 0 || region.column === 7 || region.row === 0 || region.row === 7).forEach(region => expect(region.danger).toBeGreaterThanOrEqual(3));
    outerExpansionRegions.forEach(regionId => expect(ns.Data.LANDMARKS.some(item => item.type === 'station' && item.region === regionId)).toBe(true));
    ['frostglass_relay', 'crown_anchorage', 'eventide_scar', 'wreckline_harbor', 'eventide_heart'].forEach(id => expect(ns.Data.LANDMARKS.some(item => item.id === id)).toBe(true));
    expect(ns.World.regionAt(0, 0).id).toBe('trade_belt');
  });

  test('separates current-galaxy static landmarks and gives B-G local station and beacon names', () => {
    const ns = runtime();
    ns.Data.GALAXIES.forEach(galaxy => {
      const state = ns.State.createState(907); state.galaxyId = galaxy.id; state.visitedGalaxies = [galaxy.id]; ns.Galaxies.ensureState(state);
      const landmarks = ns.Galaxies.availableLandmarks(state).filter(item => ['station', 'anomaly'].includes(item.type));
      const names = landmarks.map(item => item.name);
      expect(new Set(names).size).toBe(names.length);
      if (galaxy.id !== 'galaxy_a') {
        expect(names).not.toContain('Waypoint Zero');
        expect(names).not.toContain('Cold Start Beacon');
      }
      for (let i = 0; i < landmarks.length; i++) for (let j = 0; j < i; j++) {
        if (landmarks[i].region !== landmarks[j].region) continue;
        const min = (landmarks[i].type === 'station' ? 105 : 65) + (landmarks[j].type === 'station' ? 105 : 65) + 50;
        expect(ns.MathUtil.distance(landmarks[i], landmarks[j])).toBeGreaterThanOrEqual(min);
      }
    });
  });

  test('can generate contract boards from newly added expansion-sector stations', () => {
    const ns = runtime(), state = ns.State.createState(77), station = ns.Data.LANDMARKS.find(item => item.id === 'guildward_station');
    state.ship.ownedModules.push('light_drive'); state.contracts.completed = 6; state.progression.tutorialStep = 2; state.dockedAt = station.id;
    expect(ns.Galaxies.availableLandmarks(state).some(item => item.id === station.id)).toBe(true);
    const board = ns.Contracts.refreshBoard(state, station);
    expect(board.length).toBeGreaterThan(0);
    board.forEach(contract => {
      expect(contract.origin).toBe(station.id);
      ns.Contracts.ensureStages(contract).forEach(stage => {
        if (stage.destination) expect(ns.Data.LANDMARKS.some(item => item.id === stage.destination)).toBe(true);
        if (stage.region) expect(ns.Data.REGIONS.some(region => region.id === stage.region)).toBe(true);
      });
    });
  });

  test('generates chunks deterministically and shifts the floating origin', () => {
    const ns = runtime(); const first = ns.World.generateChunk(42, 3, -2); const second = ns.World.generateChunk(42, 3, -2);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    const world = new ns.World.WorldService(42); world.update(0, 0); expect(world.chunks.size).toBe(25); world.update(5000, 0); expect(world.origin.x).toBe(5000); expect(world.chunks.size).toBe(25);
  });

  test('defines and deterministically generates region-appropriate living-world content', () => {
    const ns = runtime();
    expect(Object.keys(ns.Data.WORLD_OBJECT_TYPES)).toEqual(expect.arrayContaining(['derelict_hauler', 'survey_probe', 'memorial_beacon', 'emergency_supply_pod', 'smuggler_dead_drop', 'unstable_prism', 'sealed_module_cache', 'battlefield_hardware_crate', 'prism_tech_cache', 'ancient_armory_fragment']));
    expect(Object.keys(ns.Data.WORLD_SCENARIOS)).toEqual(expect.arrayContaining(['distress_call', 'border_skirmish', 'raider_sweep', 'abandoned_worksite']));
    ns.Data.REGIONS.forEach(region => {
      ns.World.eligibleDefinitions(ns.Data.WORLD_OBJECT_TYPES, region, false).forEach(definition => { expect(definition.backdrops[region.backdrop]).toBeGreaterThan(0); expect(region.danger).toBeGreaterThanOrEqual(definition.minDanger); });
      ns.World.eligibleDefinitions(ns.Data.WORLD_SCENARIOS, region, false).forEach(definition => { expect(definition.backdrops[region.backdrop]).toBeGreaterThan(0); expect(region.danger).toBeGreaterThanOrEqual(definition.minDanger); });
    });
    for (let cy = -8; cy <= 45; cy += 4) for (let cx = -35; cx <= 34; cx += 4) {
      const first = ns.World.generateChunk(8741, cx, cy), repeat = ns.World.generateChunk(8741, cx, cy); expect(JSON.stringify(repeat)).toBe(JSON.stringify(first));
      first.entities.filter(entity => entity.kind === 'worldObject').forEach(entity => expect(ns.Data.WORLD_OBJECT_TYPES[entity.typeId].backdrops[ns.World.regionAt(entity.x, entity.y).backdrop]).toBeGreaterThan(0));
      first.entities.filter(entity => entity.kind === 'worldScenario').forEach(entity => expect(ns.Data.WORLD_SCENARIOS[entity.typeId].backdrops[ns.World.regionAt(entity.x, entity.y).backdrop]).toBeGreaterThan(0));
    }
  });

  test('keeps the Waypoint Zero opening route sparse and free of hostile ambient events', () => {
    const ns = runtime(), entities = [];
    for (let cy = -1; cy <= 1; cy++) for (let cx = -1; cx <= 1; cx++) entities.push(...ns.World.generateChunk(923, cx, cy).entities);
    expect(entities.filter(entity => entity.kind === 'worldScenario')).toHaveLength(0);
    expect(entities.filter(entity => entity.kind === 'worldObject').every(entity => ['survey_probe', 'emergency_supply_pod'].includes(entity.typeId))).toBe(true);
  });

  test('resolves object rewards, system strain, and one-shot persistence through owning systems', () => {
    const ns = runtime(), state = ns.State.createState(733), world = new ns.World.WorldService(733); world.update(0, 0); state.dockedAt = null;
    const chunk = Array.from(world.chunks.values()).find(item => item.key === '0,0'), messages = [], game = { state, world, region: ns.World.regionAt(0, 0), enemies: [], spawnEnemies() {}, notify(message) { messages.push(message); } };
    const probe = { id: 'world-object:survey_probe:test', kind: 'worldObject', typeId: 'survey_probe', name: 'Guild Survey Probe', x: 20, y: 20, region: 'trade_belt' }; chunk.entities.push(probe);
    const beforeSunshards = state.pilot.wallet.unbanked.sunshards; expect(ns.WorldEvents.interact(game, probe)).toBe(true); expect(state.pilot.wallet.unbanked.sunshards).toBeGreaterThan(beforeSunshards); expect(state.discoveries).toContain(probe.id); expect(state.consumedEntityIds).toContain(probe.id); expect(world.loadedEntities()).not.toContain(probe);
    const prism = { id: 'world-object:unstable_prism:test', kind: 'worldObject', typeId: 'unstable_prism', name: 'Unstable Prism', x: 30, y: 20, region: 'anomaly_rim' }; chunk.entities.push(prism); state.ship.energy = 70; state.ship.heat = 10;
    expect(ns.WorldEvents.interact(game, prism)).toBe(true); expect(state.ship.energy).toBe(48); expect(state.ship.heat).toBe(44); expect(messages.at(-1)).toContain('SYSTEM LOAD SPIKE');
    const restored = new ns.World.WorldService(733, state.consumedEntityIds); restored.update(0, 0); expect(restored.loadedEntities().some(entity => state.consumedEntityIds.includes(entity.id))).toBe(false);
  });

  test('module caches add owned modules or duplicate fallback salvage through world-object pickup', () => {
    const ns = runtime(), state = ns.State.createState(734), world = new ns.World.WorldService(734); world.update(0, 0); state.dockedAt = null; state.progression.tutorialStep = 2; state.contracts.completed = 12; state.pilot.level = 12; state.stats.kills = 40; state.visitedRegions.push('anomaly_rim'); state.progression.bossesDefeated = { foundry_ark: 1 };
    const chunk = Array.from(world.chunks.values()).find(item => item.key === '0,0'), messages = [], game = { state, world, region: ns.Data.REGIONS.find(region => region.id === 'anomaly_rim'), enemies: [], spawnEnemies() {}, notify(message) { messages.push(message); } };
    const cache = { id: 'world-object:cache:test', kind: 'worldObject', typeId: 'sealed_module_cache', name: 'Sealed Module Cache', x: 20, y: 20, region: 'anomaly_rim' }; chunk.entities.push(cache);
    const before = state.ship.ownedModules.length; expect(ns.WorldEvents.interact(game, cache)).toBe(true); expect(state.ship.ownedModules.length).toBe(before + 1); expect(messages.at(-1)).toContain('MODULE CACHE OPEN'); expect(state.consumedEntityIds).toContain(cache.id);
    const duplicate = { id: 'world-object:cache:dupe', kind: 'worldObject', typeId: 'sealed_module_cache', name: 'Sealed Module Cache', x: 20, y: 20, region: 'anomaly_rim' }; chunk.entities.push(duplicate);
    const owned = state.ship.ownedModules.length, bank = ns.Wallet.total(state).aetherium + ns.Wallet.total(state).helionite + ns.Wallet.total(state).sunshards; expect(ns.WorldEvents.interact(game, duplicate)).toBe(true); expect(state.ship.ownedModules.length).toBe(owned); expect(ns.Wallet.total(state).aetherium + ns.Wallet.total(state).helionite + ns.Wallet.total(state).sunshards).toBeGreaterThan(bank);
  });

  test('deterministically resolves genuine and false distress calls and composes faction skirmishes', () => {
    const ns = runtime(), makeGame = () => { const state = ns.State.createState(991); state.dockedAt = null; const calls = []; return { state, region: ns.Data.REGIONS.find(region => region.id === 'outlaw_expanse'), enemies: [], world: { consumeEntity: () => true }, spawnEnemies(...args) { calls.push(args); }, notify(message) { this.message = message; }, save() {}, ui: { renderAll() {} }, calls }; };
    const definition = ns.Data.WORLD_SCENARIOS.distress_call, falseGame = makeGame(), genuineGame = makeGame(); let falseEntity, genuineEntity;
    for (let x = -15000; x < -14000 && (!falseEntity || !genuineEntity); x++) { const entity = { id: `distress:${x}`, kind: 'worldScenario', typeId: 'distress_call', x, y: 0, region: 'outlaw_expanse' }; if (ns.WorldEvents.distressIsFalse(falseGame, entity, definition)) falseEntity ||= entity; else genuineEntity ||= entity; }
    expect(falseEntity).toBeTruthy(); expect(genuineEntity).toBeTruthy(); expect(ns.WorldEvents.activate(falseGame, falseEntity)).toBe(true); expect(falseGame.calls.length).toBe(1); expect(falseGame.message).toContain('BANDIT AMBUSH');
    const beforeStanding = genuineGame.state.reputations.independents; expect(ns.WorldEvents.activate(genuineGame, genuineEntity)).toBe(true); expect(genuineGame.calls).toHaveLength(0); expect(genuineGame.state.reputations.independents).toBeGreaterThan(beforeStanding); expect(genuineGame.state.pilot.wallet.unbanked.aetherium).toBeGreaterThan(0);
    const skirmishGame = makeGame(), skirmish = { id: 'skirmish:test', kind: 'worldScenario', typeId: 'border_skirmish', x: 0, y: 0, region: 'lawful_core' }; ns.WorldEvents.activate(skirmishGame, skirmish);
    expect(skirmishGame.calls.map(call => call[2])).toEqual(['concord', 'corsairs']); expect(skirmishGame.calls.map(call => call[4])).toEqual(['concord_patrol', 'corsair_raider']);
  });

  test('renders every living-world object and scenario style without mutating definitions', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game, ns = dom.window.MiniInvadersV2; game.newCareer(); game.state.dockedAt = null;
    const chunk = Array.from(game.world.chunks.values()).find(item => item.key === '0,0'); let index = 0;
    Object.values(ns.Data.WORLD_OBJECT_TYPES).forEach(definition => chunk.entities.push({ id: `render:${definition.id}`, kind: 'worldObject', typeId: definition.id, name: definition.name, x: game.state.ship.x + 30 + index++ * 12, y: game.state.ship.y + 20, region: 'trade_belt' }));
    Object.values(ns.Data.WORLD_SCENARIOS).forEach(definition => chunk.entities.push({ id: `render:${definition.id}`, kind: 'worldScenario', typeId: definition.id, name: definition.name, x: game.state.ship.x + 30 + index++ * 12, y: game.state.ship.y + 60, region: 'trade_belt' }));
    expect(() => game.renderer.render(game)).not.toThrow(); Object.values(ns.Data.WORLD_OBJECT_TYPES).forEach(definition => expect(definition).toMatchObject({ style: expect.any(String), color: expect.any(String), interactionDuration: expect.any(Number) })); dom.window.close();
  });

  test('uses the requested asteroid belt while keeping the starting sector lighter', () => {
    const ns = runtime(), byGrid = grid => ns.Data.REGIONS.find(region => region.grid === grid);
    const regions = ns.Galaxies.worldRegions(ns.State.createState(42)); ['B2', 'C2', 'C3', 'E3', 'E4', 'F4', 'F5'].forEach(grid => expect(regions.find(region => region.grid === grid).asteroidDensity).toBe(1.6)); expect(regions.find(region => region.id === 'trade_belt').asteroidDensity).toBe(.75);
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
    const small = mediumResult.fragments[0], smallId = small.id; expect(world.damageAsteroid(small, 20)).toMatchObject({ destroyed: true, asteroid: { tier: 'small' } });
    world.update(9000, 0); world.update(0, 0); expect(world.loadedEntities().some(entity => entity.id === smallId)).toBe(false);
    expect(new ns.World.WorldService(42).asteroidRecords.size).toBe(0);
  });

  test('reports a soft nebula boundary while preserving the nearest valid region', () => {
    const ns = runtime(), state = ns.State.createState(42), config = ns.World.createConfig(ns.Galaxies.worldConfig(state)), bounds = config.bounds;
    expect(ns.World.boundaryExposure(bounds.maxX - 100, 0, config)).toMatchObject({ active: false, depth: 0 });
    expect(ns.World.boundaryExposure(bounds.maxX + 250, 0, config)).toMatchObject({ active: true, depth: 250, proximity: 1 });
    expect(config.regions).toContain(ns.World.regionAt(bounds.maxX + 5000, 0, config));
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
    state.galaxyCharts.galaxy_a = { discoveries: ['signal:1:1'] }; state.discoveries = ['waypoint_zero']; expect(ns.Unlocks.evaluate(state).abilitySlots.abilityQ).toBe(true);
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
    expect(ns.Economy.trade(state, station, 'food', -1)).toBe(ns.Economy.requestsCommodity(state, station, 'food'));
    expect(ns.Unlocks.commodityVisible(state, ns.Data.COMMODITIES.medicine)).toBe(false); expect(ns.Unlocks.commodityVisible(state, ns.Data.COMMODITIES.relics)).toBe(false);
    state.progression.tutorialStep = 2; state.contracts.completed = 3; state.pilot.level = 6; state.visitedRegions.push('anomaly_rim'); ns.Economy.inventoryFor(state, station);
    const request = ns.Economy.inventoryFor(state, station).requests.find(id => ns.Unlocks.commodityVisible(state, ns.Data.COMMODITIES[id])), beforeRep = state.reputations[station.faction]; state.ship.cargo[request] = 1;
    expect(ns.Economy.trade(state, station, request, -1)).toBe(true); expect(state.reputations[station.faction]).toBeGreaterThan(beforeRep);
  });

  test('sells only non-equipped paid modules into the banked wallet', () => {
    const ns = runtime(), state = ns.State.createState(303), station = ns.Data.LANDMARKS.find(item => item.id === 'waypoint_zero');
    state.ship.ownedModules.push('pulse_mk2', 'heat_sink'); state.pilot.wallet.banked = { aetherium: 0, sunshards: 0, helionite: 0 };
    expect(ns.Economy.sellModule(state, 'pulse_mk1', station)).toMatchObject({ ok: false, reason: 'equipped' });
    expect(ns.Economy.sellModule(state, 'heat_sink', station)).toMatchObject({ ok: true });
    expect(state.ship.ownedModules).not.toContain('heat_sink'); expect(state.pilot.wallet.banked.aetherium).toBeGreaterThan(0);
    ns.Progression.equipModule(state, 'primary2', 'pulse_mk2'); expect(ns.Economy.sellModule(state, 'pulse_mk2', station)).toMatchObject({ ok: false, reason: 'equipped' }); expect(state.ship.ownedModules).toContain('pulse_mk2');
    state.ship.slots.cargo = null; expect(ns.Economy.sellModule(state, 'cargo_mk1', station)).toMatchObject({ ok: false, reason: 'starter' });
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

  test('keeps board offers pristine for abandonment and removes only genuinely failed offers', () => {
    const ns = runtime(), state = ns.State.createState(408), station = ns.Data.LANDMARKS.find(item => item.id === 'waypoint_zero'); state.progression.tutorialStep = 2;
    const offer = ns.Contracts.generateAdvanced(state, station, 0, () => .31, 'deep_survey'); state.contracts.board = [offer]; expect(ns.Contracts.accept(state, offer.id)).toBe(true);
    expect(state.contracts.active).not.toBe(offer); expect(offer.status).toBe('offered'); state.contracts.active.stages[0].progress = .5;
    ns.Contracts.abandon(state); expect(state.contracts.board).toEqual([offer]); expect(ns.Contracts.accept(state, offer.id)).toBe(true); expect(state.contracts.active.stages[0]).toMatchObject({ progress: 0, status: 'active' });
    ns.Contracts.fail(state, 'TEST FAILURE'); expect(state.contracts.active).toBeNull(); expect(state.contracts.board).toHaveLength(0);
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

  test('migrates legacy diamonds, weapons, shields, coordinates, loadouts, hull ownership, and galaxy state into schema v11', () => {
    const ns = runtime(); const legacy = ns.State.createState(31); legacy.schemaVersion = 1; legacy.pilot.diamonds = 777; delete legacy.pilot.wallet; delete legacy.customWaypoint;
    legacy.ship.x = 100; legacy.ship.y = 200;
    legacy.ship.slots.secondary = 'seeker_rack'; legacy.ship.slots.defense = 'shield_mk1'; legacy.ship.ownedModules.push('shield_mk1');
    const migrated = ns.Save.migrate(legacy);
    expect(migrated.schemaVersion).toBe(11); expect(migrated).toMatchObject({ galaxyId: 'galaxy_a', visitedGalaxies: ['galaxy_a'] }); expect(migrated.ship).toMatchObject({ x: 150, y: 300, activeHullId: 'wayfarer', ownedHullIds: ['wayfarer'] }); expect(migrated.pilot.wallet.banked).toEqual({ aetherium: 777, sunshards: 0, helionite: 0 }); expect(migrated.ship.slots.utility4).toBeNull(); expect(migrated.customWaypoint).toBeNull();
    expect(migrated.ship.slots.primary2).toBe('seeker_rack'); expect(migrated.ship.slots.defense).toBe('shield_balanced'); expect(migrated.ship.ownedModules).toContain('afterburner');
  });

  test('normalizes stale active and failed station-board offers on load', () => {
    const ns = runtime(), state = ns.State.createState(311); state.contracts.board = [{ id: 'stale:active', status: 'active' }, { id: 'stale:failed', status: 'failed' }, { id: 'done', status: 'complete' }];
    const migrated = ns.Save.migrate(JSON.parse(ns.Save.serialize(state))); expect(migrated.contracts.board.map(contract => ({ id: contract.id, status: contract.status }))).toEqual([{ id: 'stale:active', status: 'offered' }, { id: 'stale:failed', status: 'offered' }]);
  });

  test('active modules require unlocked slots and consume energy with cooldowns', () => {
    const ns = runtime(); const state = ns.State.createState(32); state.progression.tutorialStep = 1; state.ship.ownedModules.push('afterburner'); state.ship.slots.abilityShift = 'afterburner';
    const game = { state, world: new ns.World.WorldService(32), enemies: [], notify: jest.fn(), onEnemyKilled: jest.fn() }; game.world.update(state.ship.x, state.ship.y);
    const before = state.ship.energy; expect(ns.Abilities.activate(game, 'abilityShift')).toBe(true); expect(state.ship.energy).toBeLessThan(before); expect(state.ship.abilityCooldowns.abilityShift).toBeGreaterThan(0); expect(ns.Abilities.isActive(state, 'afterburner')).toBe(true);
    expect(ns.Abilities.activate(game, 'abilityShift')).toBe(false);
  });

  test('charges, interrupts on damage, cruises with bounded steering, and rematerializes', () => {
    const ns = runtime(), state = ns.State.createState(73); state.pilot.level = 4; state.contracts.completed = 5; state.dockedAt = null;
    state.ship.ownedModules.push('light_drive'); state.ship.slots.engine = 'light_drive'; state.ship.energy = 70; state.ship.angle = 0; state.pilot.wallet.banked.sunshards = 10; state.pilot.wallet.banked.helionite = 10;
    const world = new ns.World.WorldService(73); world.update(state.ship.x, state.ship.y);
    const game = { state, world, region: ns.World.regionAt(state.ship.x, state.ship.y), camera: { x: state.ship.x, y: state.ship.y }, enemies: [{}], bullets: [{}], effects: [{}], notify: jest.fn(), input: { mouse: { hasPosition: false } }, renderer: { w: 1280, h: 720 }, ui: { panel: { classList: { contains: () => false } } } };
    expect(ns.LightSpeed.beginCharge(game)).toBe(true); ns.LightSpeed.update(game, .4); state.ship.hull -= 1; ns.LightSpeed.update(game, .01);
    expect(game.lightSpeed).toMatchObject({ phase: 'idle', cooldown: expect.any(Number) }); expect(game.lightSpeed.cooldown).toBeGreaterThan(2.9); expect(state.ship.energy).toBe(70);
    game.lightSpeed.cooldown = 0; expect(ns.LightSpeed.beginCharge(game)).toBe(true); ns.LightSpeed.update(game, 2.25);
    expect(game.lightSpeed.phase).toBe('cruising'); expect(state.ship.energy).toBe(70); expect(state.pilot.wallet.banked).toMatchObject({ sunshards: 5, helionite: 5 }); expect(game.enemies).toHaveLength(0); expect(game.bullets).toHaveLength(0);
    const angle = state.ship.angle; game.input.mouse = { x: 640, y: 0, hasPosition: true }; ns.LightSpeed.update(game, .5);
    expect(Math.abs(state.ship.angle - angle)).toBeLessThanOrEqual(.55 * .5 + .0001); expect(Math.hypot(state.ship.vx, state.ship.vy)).toBeCloseTo(3200, 5);
    expect(ns.LightSpeed.toggle(game)).toBe(true); ns.LightSpeed.update(game, 1.5);
    expect(game.lightSpeed.phase).toBe('idle'); expect(game.lightSpeed.cooldown).toBe(6); expect(Math.hypot(state.ship.vx, state.ship.vy)).toBeCloseTo(340, 5); expect(world.chunks.size).toBe(25);
  });

  test('rejects invalid Light Drive casts and forces exit before the expanded boundary', () => {
    const ns = runtime(), state = ns.State.createState(74), world = new ns.World.WorldService(74);
    const game = { state, world, region: ns.Data.REGIONS[0], camera: {}, enemies: [], bullets: [], effects: [], notify: jest.fn(), input: { mouse: { hasPosition: false } }, renderer: { w: 1280, h: 720 }, ui: { panel: { classList: { contains: () => false } } } };
    expect(ns.LightSpeed.canCharge(game)).toBe(false); state.pilot.level = 4; state.contracts.completed = 5; state.ship.ownedModules.push('light_drive'); state.ship.slots.engine = 'light_drive'; state.dockedAt = null; state.ship.energy = 70;
    expect(ns.LightSpeed.canCharge(game)).toBe(false); state.pilot.wallet.banked.sunshards = 5; state.pilot.wallet.banked.helionite = 5; expect(ns.LightSpeed.canCharge(game)).toBe(true);
    game.lightSpeed = ns.LightSpeed.createState(); game.lightSpeed.phase = 'cruising'; state.ship.x = ns.World.WORLD_BOUNDS.maxX - 3700; state.ship.y = 0; state.ship.angle = 0;
    ns.LightSpeed.update(game, .01); expect(game.lightSpeed.phase).toBe('decelerating'); expect(game.lightSpeed.forcedExit).toBe(true);
    ns.LightSpeed.update(game, 1.5); expect(state.ship.x).toBeLessThanOrEqual(ns.World.WORLD_BOUNDS.maxX - 300);
  });

  test('cancels Asterion charge for free and forces deceleration after twenty seconds of full reserves', () => {
    const ns = runtime(), state = ns.State.createState(741); state.dockedAt = null; state.ship.slots.engine = 'light_drive'; state.ship.ownedModules.push('light_drive'); state.ship.energy = 100; state.ship.heat = 0; state.pilot.wallet.banked.sunshards = 10; state.pilot.wallet.banked.helionite = 10;
    const game = { state, world: new ns.World.WorldService(741), region: ns.Data.REGIONS[0], camera: {}, enemies: [], bullets: [], effects: [], notify: jest.fn(), input: { mouse: { hasPosition: false } }, renderer: { w: 1280, h: 720 }, ui: { panel: { classList: { contains: () => false } } } }; game.world.update(state.ship.x, state.ship.y);
    expect(ns.LightSpeed.beginCharge(game)).toBe(true); expect(ns.LightSpeed.toggle(game)).toBe(true); expect(game.lightSpeed).toMatchObject({ phase: 'idle', cooldown: 3 }); expect(state.pilot.wallet.banked).toMatchObject({ sunshards: 10, helionite: 10 });
    game.lightSpeed.cooldown = 0; ns.LightSpeed.beginCharge(game); ns.LightSpeed.update(game, ns.LightSpeed.CONFIG.chargeDuration); const speed = ns.LightSpeed.CONFIG.cruiseSpeed; ns.LightSpeed.CONFIG.cruiseSpeed = 0;
    for (let second = 0; second < 19; second++) ns.LightSpeed.update(game, 1);
    expect(game.lightSpeed.phase).toBe('cruising'); expect(state.ship).toMatchObject({ energy: 5, heat: 95 });
    ns.LightSpeed.update(game, 1); expect(game.lightSpeed).toMatchObject({ phase: 'decelerating', forcedExit: true }); expect(state.ship).toMatchObject({ energy: 0, heat: 100 }); ns.LightSpeed.CONFIG.cruiseSpeed = speed;
  });

  test('blink can cross into the nebula and shield overcharge requires a fitted generator', () => {
    const ns = runtime(); const state = ns.State.createState(33); state.progression.tutorialStep = 2; state.contracts.completed = 3; state.discoveries.push('signal:2:2');
    state.ship.ownedModules.push('blink_drive', 'shield_overcharger', 'shield_scout'); state.ship.slots.abilityQ = 'blink_drive'; state.ship.slots.abilitySpace = 'shield_overcharger';
    const game = { state, world: new ns.World.WorldService(33), enemies: [], notify: jest.fn(), onEnemyKilled: jest.fn() }; game.world.update(state.ship.x, state.ship.y);
    state.ship.x = ns.World.WORLD_BOUNDS.maxX - 10; state.ship.angle = 0; expect(ns.Abilities.activate(game, 'abilityQ')).toBe(true); expect(state.ship.x).toBe(ns.World.WORLD_BOUNDS.maxX + 340); expect(game.blinkEffect).toMatchObject({ life: .35, maxLife: .35, from: expect.any(Object), to: expect.any(Object) });
    expect(ns.Abilities.activate(game, 'abilitySpace')).toBe(false); state.ship.slots.defense = 'shield_scout'; state.ship.shield = 55;
    expect(ns.Abilities.activate(game, 'abilitySpace')).toBe(true); expect(state.ship.overshield).toBe(70);
  });

  test('nebula damage bypasses shields and asteroid destruction no longer awards direct credits', () => {
    const ns = runtime({ includeGame: true }); const state = ns.State.createState(72); state.ship.shield = 55;
    expect(ns.Combat.applyHullDamage(state, 25)).toBe(false); expect(state.ship.hull).toBe(115); expect(state.ship.shield).toBe(55);
    const world = new ns.World.WorldService(72); world.update(state.ship.x, state.ship.y);
    const asteroid = world.loadedEntities().find(entity => entity.kind === 'asteroid' && entity.tier === 'small');
    const before = state.pilot.wallet.unbanked.aetherium;
    const game = { state, world, enemies: [], effects: [], bullets: [{ x: asteroid.x, y: asteroid.y, vx: 0, vy: 0, radius: 4, damage: asteroid.hull, life: 1, enemy: false }], spawnImpact: jest.fn() };
    ns.Game.prototype.updateBullets.call(game, 0);
    expect(game.bullets).toHaveLength(0); expect(game.spawnImpact).toHaveBeenCalled(); expect(state.pilot.wallet.unbanked.aetherium).toBe(before);
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
    expect(game).toContain("ns.Weapons.control(this, 'primary1', this.input.mouse.primary, dt)"); expect(game).toContain("ns.Weapons.control(this, 'primary2', this.input.mouse.secondary, dt)");
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

  test('fits four distinct utilities and preserves them through schema v11 saves', () => {
    const ns = runtime(), state = ns.State.createState(82); state.ship.chassis.massLimit = 200; const utilities = ['repair_drones', 'sensor_array', 'heat_sink', 'cargo_pods']; state.ship.ownedModules.push(...utilities);
    utilities.forEach((id, index) => expect(ns.Progression.equipModule(state, `utility${index + 1}`, id)).toBe(true));
    expect(Object.values(state.ship.slots).filter(id => utilities.includes(id))).toEqual(expect.arrayContaining(utilities));
    const loaded = ns.Save.migrate(JSON.parse(ns.Save.serialize(state))); expect(loaded.schemaVersion).toBe(11); expect(loaded.ship.slots.utility4).toBe('cargo_pods'); expect(ns.Progression.calculateShipStats(loaded).cargo).toBeGreaterThan(14);
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

  test('keeps the undocked ship panel readable but prevents loadout changes', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game;
    game.newCareer(); game.state.ship.ownedModules.push('drive_mk2'); game.state.dockedAt = null; game.ui.openPanel(game, 'ship');
    expect(game.ui.panelBody.textContent).toContain('DOCK AT A STATION TO MODIFY LOADOUT');
    expect([...game.ui.panelBody.querySelectorAll('[data-action="equip"]')].every(button => button.disabled)).toBe(true);
    const before = game.state.ship.slots.engine; const button = [...game.ui.panelBody.querySelectorAll('[data-action="equip"]')].find(item => item.dataset.id === 'drive_mk2'); button.disabled = false; button.click();
    expect(game.state.ship.slots.engine).toBe(before); expect(game.ui.message.textContent).toContain('DOCK AT A STATION'); dom.window.close();
  });

  test('labels mission-system slots with their behavior and keybinds', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game; game.newCareer(); game.state.progression.tutorialStep = 2; game.state.contracts.completed = 3; game.state.discoveries.push('signal:test'); game.state.pilot.allegiance = 'concord'; game.state.ship.ownedModules.push('light_drive'); game.state.ship.slots.engine = 'light_drive'; game.ui.openPanel(game, 'ship');
    let text = game.ui.panelBody.textContent; ['Primary weapon 1 (Left Click)', 'Primary weapon 2 (Right Click)', 'Triggered Ability 1 (Space)', 'Triggered Ability 2 (Q)', 'Triggered Ability 3 (E)', 'Triggered Ability 4 (Shift)'].forEach(label => expect(text).toContain(label));
    game.ui.panelBody.querySelector('[data-action="ship-mission-tab"][data-id="utility"]').click(); text = game.ui.panelBody.textContent; ['Passive Utility 1', 'Passive Utility 4'].forEach(label => expect(text).toContain(label)); expect(text).not.toContain('Primary weapon 1 (Left Click)'); dom.window.close();
  });

  test('keeps the Q ability panel visible before the slot is unlocked', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game;
    game.newCareer(); game.state.progression.tutorialStep = 2; game.state.contracts.completed = 3; game.ui.openPanel(game, 'ship');
    const text = game.ui.panelBody.textContent;
    expect(text).toContain('Triggered Ability 2 (Q)');
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
    const ns = runtime(), station = ns.Data.LANDMARKS.find(item => item.id === 'waypoint_zero'), make = template => { const state = ns.State.createState(83); state.progression.tutorialStep = 2; state.contracts.completed = 3; const offer = ns.Contracts.generateAdvanced(state, station, 0, () => .31, template); state.contracts.board = [offer]; ns.Contracts.accept(state, offer.id); return { state, offer, contract: state.contracts.active }; };
    const multi = make('multi_haul'); expect(multi.contract.stageMode).toBe('parallel'); expect(ns.Contracts.targetsFor(multi.contract).length).toBeGreaterThanOrEqual(2); multi.contract.stages.forEach((stage, index) => { const destination = ns.Data.LANDMARKS.find(item => item.id === stage.destination); expect(ns.Contracts.recordProgress(multi.state, 'dock', 1, destination)).toBe(index === multi.contract.stages.length - 1); });
    const survey = make('deep_survey'); expect(survey.contract.stages).toHaveLength(3); expect(new Set(survey.contract.stages.map(stage => stage.region)).size).toBe(3); survey.contract.stages.slice(1).forEach((stage, index) => { const previous = ns.Data.REGIONS.find(region => region.id === survey.contract.stages[index].region), current = ns.Data.REGIONS.find(region => region.id === stage.region), gap = Math.max(Math.abs(previous.column - current.column), Math.abs(previous.row - current.row)); expect(gap).toBeGreaterThanOrEqual(1); expect(gap).toBeLessThanOrEqual(2); }); const firstSurvey = ns.Contracts.contactFor(survey.contract); expect(ns.Contracts.recordProgress(survey.state, firstSurvey.event, 1, firstSurvey)).toBe(false); expect(ns.Contracts.activeStages(survey.contract)[0].name).toContain('2');
    const search = make('area_search'); expect(ns.Contracts.contactFor(search.contract)).toBeNull(); expect(search.contract.stages[0].search.radius).toBe(1800); const area = search.contract.stages[0].search.center; expect(ns.Contracts.revealSearches(search.state, area)).toHaveLength(1); const found = ns.Contracts.contactFor(search.contract); expect(found).not.toBeNull(); expect(ns.Contracts.recordProgress(search.state, 'search', 1, found)).toBe(true);
    const recovery = make('cargo_recovery'); const cargo = ns.Contracts.contactFor(recovery.contract); expect(ns.Contracts.recordProgress(recovery.state, 'pickup', 1, cargo)).toBe(false); expect(ns.Contracts.activeStages(recovery.contract)[0].event).toBe('dock'); expect(recovery.contract.missionPayload.kind).toBe('recovered-cargo');
    const lost = make('lost_ship_escort'); expect(lost.contract.stages[0].search.radius).toBe(1800); ns.Contracts.revealSearches(lost.state, lost.contract.stages[0].search.center); const ship = ns.Contracts.contactFor(lost.contract); expect(ns.Contracts.recordProgress(lost.state, 'search', 1, ship)).toBe(false); expect(ns.Contracts.activeStages(lost.contract)[0].escort).toBeTruthy(); expect(ns.Contracts.startEscort(lost.state)).toMatchObject({ hull: 220 });
    const restored = ns.Save.migrate(JSON.parse(ns.Save.serialize(lost.state))); expect(restored.contracts.active.stages[1].escort.convoy.hull).toBe(220);
  });

  test('generates deterministic Survey Chains across distinct accessible sectors one or two cells apart', () => {
    const ns = runtime(), station = ns.Data.LANDMARKS.find(item => item.id === 'waypoint_zero'), build = seed => { const state = ns.State.createState(seed); state.progression.tutorialStep = 2; state.contracts.completed = 3; return ns.Contracts.generateAdvanced(state, station, 0, ns.MathUtil.seeded(seed), 'deep_survey'); };
    [91, 92, 93, 94].forEach(seed => { const contract = build(seed), regions = contract.stages.map(stage => ns.Data.REGIONS.find(region => region.id === stage.region)); expect(new Set(regions.map(region => region.id)).size).toBe(3); expect(regions.every(region => !region.travelTier)).toBe(true); regions.slice(1).forEach((region, index) => { const gap = Math.max(Math.abs(region.column - regions[index].column), Math.abs(region.row - regions[index].row)); expect(gap).toBeGreaterThanOrEqual(1); expect(gap).toBeLessThanOrEqual(2); }); expect(JSON.stringify(build(seed))).toBe(JSON.stringify(contract)); });
  });

  test('varies deterministic board size and persists station-specialty market rotations', () => {
    const ns = runtime(), major = ns.Data.LANDMARKS.find(item => item.id === 'waypoint_zero'), minor = ns.Data.LANDMARKS.find(item => item.id === 'greenline_exchange'), state = ns.State.createState(84); state.progression.tutorialStep = 2; state.contracts.completed = 3;
    const majorBoard = ns.Contracts.refreshBoard(state, major), repeat = ns.State.createState(84); repeat.progression.tutorialStep = 2; repeat.contracts.completed = 3; expect(ns.Contracts.refreshBoard(repeat, major).map(item => item.id)).toEqual(majorBoard.map(item => item.id)); expect(majorBoard.length).toBeGreaterThanOrEqual(5); expect(majorBoard.length).toBeLessThanOrEqual(8);
    const minorState = ns.State.createState(84); minorState.progression.tutorialStep = 2; const minorBoard = ns.Contracts.refreshBoard(minorState, minor); expect(minorBoard.length).toBeGreaterThanOrEqual(3); expect(minorBoard.length).toBeLessThanOrEqual(6);
    const first = ns.Economy.inventoryFor(state, major), other = ns.Economy.inventoryFor(state, minor); expect(first).not.toEqual(other); expect(ns.Economy.inventoryFor(state, major)).toBe(first);
    state.playTime = ns.Economy.INVENTORY_CYCLE_SECONDS; const rotated = ns.Economy.inventoryFor(state, major); expect(rotated.cycle).toBe(1); expect(rotated).not.toBe(first);
    const requested = rotated.requests.find(id => ns.Unlocks.commodityVisible(state, ns.Data.COMMODITIES[id])); expect(requested).toBeTruthy(); const beforeRep = state.reputations[major.faction]; state.ship.cargo[requested] = 1; expect(ns.Economy.trade(state, major, requested, -1)).toBe(true); expect(state.reputations[major.faction]).toBeGreaterThan(beforeRep);
    const unrequested = Object.keys(ns.Data.COMMODITIES).find(id => !rotated.requests.includes(id) && ns.Unlocks.commodityVisible(state, ns.Data.COMMODITIES[id])); state.ship.cargo[unrequested] = 1; expect(ns.Economy.trade(state, major, unrequested, -1)).toBe(false);
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

  test('owns, purchases, switches, and capacity-gates seventeen distinct player hulls', () => {
    const ns = runtime(), state = ns.State.createState(901), guild = ns.Data.LANDMARKS.find(item => item.id === 'waypoint_zero'); state.progression.tutorialStep = 2; state.contracts.completed = 3; state.pilot.wallet.banked = { aetherium: 10000, sunshards: 100, helionite: 100 };
    expect(Object.keys(ns.Data.HULLS)).toHaveLength(17); expect(new Set(Object.values(ns.Data.HULLS).map(hull => hull.tier))).toEqual(new Set([1, 2, 3, 4, 5, 6, 7])); expect(ns.Progression.buyHull(state, 'guild_mule', guild)).toBe(true); expect(state.ship.ownedHullIds).toContain('guild_mule');
    const wayfarer = ns.Progression.calculateShipStats(state); expect(ns.Progression.switchHull(state, 'guild_mule')).toEqual({ ok: true }); const mule = ns.Progression.calculateShipStats(state); expect(mule.hull).toBeGreaterThan(wayfarer.hull); expect(mule.cargo).toBeGreaterThan(wayfarer.cargo); expect(mule.maxSpeed).toBeLessThan(wayfarer.maxSpeed);
    state.ship.ownedHullIds.push('concord_kestrel'); state.ship.cargo.food = 20; expect(ns.Progression.checkSwitchHull(state, 'concord_kestrel')).toMatchObject({ ok: false, reason: 'cargo' });
  });

  test('fires colored charge, homing, scatter, rail, and chain weapon behaviors', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game, ns = dom.window.MiniInvadersV2; game.newCareer(); game.state.ship.energy = 500; game.state.ship.chassis.reactorBonus = 500; game.state.ship.activeHullId = 'concord_bulwark'; game.state.ship.chassis.massLimit = 200;
    game.state.ship.ownedModules.push('beam_lance', 'seeker_rack', 'scatter_array', 'rail_driver', 'arc_projector'); game.state.ship.slots.primary1 = 'beam_lance'; ns.Weapons.control(game, 'primary1', true, 1); expect(game.weaponCharges.primary1).toMatchObject({ active: true, value: 1 }); ns.Weapons.control(game, 'primary1', false, .01); expect(game.bullets[0]).toMatchObject({ type: 'beam', color: '#55d7ff' });
    game.weaponCooldowns.primary1 = 0; game.state.ship.slots.primary1 = 'seeker_rack'; game.enemies = [{ id: 'target', x: 400, y: 0, hull: 50 }]; expect(ns.Weapons.fire(game, 'primary1')).toBe(true); expect(game.bullets.at(-1)).toMatchObject({ type: 'missile', targetId: 'target', turnRate: 2.4 });
    game.weaponCooldowns.primary1 = 0; game.state.ship.slots.primary1 = 'scatter_array'; const before = game.bullets.length; ns.Weapons.fire(game, 'primary1'); expect(game.bullets.length - before).toBe(5);
    expect(ns.Data.WEAPON_TYPES.rail.pierce).toBe(1); expect(ns.Data.WEAPON_TYPES.arc.chain).toBe(2);
  });

  test('uses standing and allegiance to drive patrol hostility and retaliation', () => {
    const ns = runtime(), state = ns.State.createState(902); state.reputations.concord = 10; expect(ns.Expansion.patrolStatus(state, 'concord')).toBe('FRIENDLY'); state.reputations.concord = 0; expect(ns.Expansion.patrolStatus(state, 'concord')).toBe('NEUTRAL'); state.reputations.concord = -1; expect(ns.Expansion.patrolStatus(state, 'concord')).toBe('HOSTILE');
    state.reputations.concord = 20; expect(ns.Contracts.joinFaction(state, 'concord')).toBe(true); expect(state.reputations.corsairs).toBe(-20); expect(ns.Expansion.patrolStatus(state, 'concord')).toBe('FRIENDLY'); expect(ns.Expansion.patrolStatus(state, 'corsairs')).toBe('HOSTILE');
  });

  test('creates faction-specific risk-five bosses and persists their encounter state', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game, ns = dom.window.MiniInvadersV2; game.newCareer(); game.state.progression.tutorialStep = 2; game.state.pilot.level = 6; game.state.stats.kills = 20; const station = ns.Data.LANDMARKS.find(item => item.id === 'waypoint_zero'), contract = ns.Contracts.generateBoss(game.state, station, () => .25);
    expect(contract).toMatchObject({ risk: 5, bossType: 'marauder_carrier', enemyFaction: 'bandits', encounterId: expect.any(String) }); game.state.contracts.active = contract; Object.assign(game.state.ship, contract.target); game.updateContract(.1); const boss = game.enemies.find(enemy => enemy.bossType); expect(boss).toMatchObject({ bossType: 'marauder_carrier', persistent: true }); boss.hull = boss.maxHull * .3; ns.Encounters.update(game, .1); expect(contract.bossState).toMatchObject({ phase: 3, deployCount: 2 });
    const restored = ns.Save.migrate(JSON.parse(ns.Save.serialize(game.state))); expect(restored.contracts.active.bossState.phase).toBe(3);
  });

  test('generates deterministic optional briefings and stores dismissible debriefs', () => {
    const ns = runtime(), state = ns.State.createState(903), station = ns.Data.LANDMARKS.find(item => item.id === 'waypoint_zero'); state.progression.tutorialStep = 2; const board = ns.Contracts.refreshBoard(state, station), offer = board[0]; expect(offer.briefing).toEqual(ns.Expansion.briefing(offer, station)); expect(offer.briefing).toMatchObject({ route: expect.any(String), complication: expect.any(String), tone: expect.any(String), finePrint: expect.any(String) });
    ns.Contracts.accept(state, offer.id); ns.Contracts.ensureStages(state.contracts.active).forEach(stage => { stage.status = 'complete'; stage.progress = stage.required; }); ns.Contracts.syncContract(state.contracts.active); const completed = ns.Contracts.complete(state); expect(completed.debrief).toMatchObject({ outcome: expect.any(String), response: expect.any(String), consequence: expect.any(String), payment: expect.any(Object) }); expect(state.progression.pendingDebrief).toBe(completed.id);
  });

  test('locks each post-capstone specialization against its competing choice', () => {
    const ns = runtime(), state = ns.State.createState(904); state.pilot.traitPoints = 3; state.pilot.traits.ace_deadeye = 1; expect(ns.Progression.canBuyTrait(state, 'ace_weapons_free')).toBe(true); expect(ns.Progression.buyTrait(state, 'ace_weapons_free')).toBe(true); expect(ns.Progression.canBuyTrait(state, 'ace_target_hunter')).toBe(false); expect(ns.Progression.traitEffects(state).weaponsFree).toBe(1);
  });

  test('unlocks four specialist hulls at their authored shipyards and derives distinct bases', () => {
    const ns = runtime(), state = ns.State.createState(905); state.progression.tutorialStep = 2; state.contracts.completed = 12; state.pilot.level = 10; state.stats.kills = 35; state.reputations.concord = 25; state.reputations.corsairs = 25; state.visitedRegions.push('anomaly_rim', 'frontier', 'lawful_core', 'outlaw_expanse', 'frostglass_reach', 'cinder_drift', 'prism_wilds'); state.progression.bossesDefeated = { marauder_carrier: 1, foundry_ark: 1 };
    const rangerYard = ns.Data.LANDMARKS.find(item => item.id === 'shatterline_post'), concordYard = ns.Data.LANDMARKS.find(item => item.id === 'helion_bastion'), corsairYard = ns.Data.LANDMARKS.find(item => item.id === 'rust_orbit'), rimYard = ns.Data.LANDMARKS.find(item => item.id === 'rim_observatory');
    expect(ns.Expansion.hullAvailable(state, ns.Data.HULLS.meridian_ranger, rangerYard)).toBe(true); expect(ns.Expansion.hullAvailable(state, ns.Data.HULLS.concord_lancer, concordYard)).toBe(true); expect(ns.Expansion.hullAvailable(state, ns.Data.HULLS.corsair_ravager, corsairYard)).toBe(true); expect(ns.Expansion.hullAvailable(state, ns.Data.HULLS.prism_eidolon, rimYard)).toBe(true);
    state.ship.activeHullId = 'meridian_ranger'; const ranger = ns.Progression.calculateShipStats(state); state.ship.activeHullId = 'prism_eidolon'; const eidolon = ns.Progression.calculateShipStats(state); expect(ranger).toMatchObject({ massLimit: 58, energyRecharge: 18 }); expect(ranger.sensor).toBeGreaterThan(1100); expect(eidolon.reactor).toBeGreaterThan(ranger.reactor); expect(eidolon.shield).toBeGreaterThanOrEqual(ranger.shield);
  });

  test('unlocks late tier five through seven hulls at authored shipyards', () => {
    const ns = runtime(), state = ns.State.createState(906);
    state.pilot.level = 14; state.stats.kills = 90; state.visitedGalaxies = ns.Data.GALAXIES.map(galaxy => galaxy.id); state.progression.bossesDefeated = { foundry_ark: 1 };
    Object.assign(state.reputations, { aster_collective: 25, orchid_synod: 25, auric_combine: 25, cyan_nomads: 25, gemini_directorate: 25, concord: 45, corsairs: 50 });
    [['aster_cartograph', 'aster_archive'], ['orchid_riftneedle', 'orchid_spindle'], ['auric_vaultbarge', 'auric_exchange'], ['cyan_salvage_lantern', 'cyan_freeport'], ['gemini_echelon_spear', 'gemini_crown'], ['concord_solar_bulwark', 'sunfall_citadel'], ['frontier_horizon_ark', 'waypoint_zero'], ['null_crown_reaver', 'nullwake_hold']].forEach(([hullId, stationId]) => {
      expect(ns.Expansion.hullAvailable(state, ns.Data.HULLS[hullId], ns.Data.LANDMARKS.find(item => item.id === stationId))).toBe(true);
    });
  });

  test('defines the fixed seven-galaxy route graph and preserves separate local charts across travel', () => {
    const ns = runtime(), state = ns.State.createState(1201);
    expect(ns.Data.GALAXIES.map(galaxy => galaxy.code)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    expect(ns.Data.GALAXY_LINKS).toEqual([
      ['galaxy_a', 'galaxy_b'],
      ['galaxy_b', 'galaxy_c'], ['galaxy_b', 'galaxy_d'],
      ['galaxy_c', 'galaxy_e'], ['galaxy_c', 'galaxy_f'],
      ['galaxy_d', 'galaxy_g'],
      ['galaxy_f', 'galaxy_e'], ['galaxy_f', 'galaxy_g']
    ]);
    expect(ns.Galaxies.neighbors('galaxy_a')).toEqual(['galaxy_b']); expect(ns.Galaxies.connected('galaxy_a', 'galaxy_c')).toBe(false);
    state.ship.activeHullId = 'meridian_ranger'; state.ship.ownedHullIds.push('meridian_ranger'); state.ship.slots.reactor = ns.Galaxies.GATE_REACTOR; state.ship.slots.engine = ns.Galaxies.GATE_ENGINE;
    state.ship.x = 321; state.ship.y = 654; state.discoveries.push('galaxy-a-only'); const galaxyASeed = ns.Galaxies.worldSeed(state);
    expect(ns.Galaxies.travel(state, 'galaxy_c')).toMatchObject({ ok: false, reason: 'no-direct-route' });
    expect(ns.Galaxies.travel(state, 'galaxy_b')).toMatchObject({ ok: true, destination: { code: 'B' } });
    expect(state).toMatchObject({ galaxyId: 'galaxy_b', dockedAt: 'waypoint_zero', visitedGalaxies: ['galaxy_a', 'galaxy_b'] }); expect(ns.Galaxies.worldSeed(state)).not.toBe(galaxyASeed); expect(state.discoveries).not.toContain('galaxy-a-only');
    state.ship.x = 987; state.discoveries.push('galaxy-b-only'); state.lastStargateTravelAt = 0; expect(ns.Galaxies.travel(state, 'galaxy_a')).toMatchObject({ ok: true, destination: { code: 'A' } });
    expect(state.ship.x).toBe(321); expect(state.discoveries).toContain('galaxy-a-only'); expect(state.discoveries).not.toContain('galaxy-b-only');
    state.contracts.active = { id: 'gate-blocker' }; expect(ns.Galaxies.travel(state, 'galaxy_b')).toMatchObject({ ok: false, reason: 'active-contract' });
  });

  test('restricts the Gateheart and Atlas systems to Tier IV or later hulls and guarantees them at unlocked major markets', () => {
    const ns = runtime(), state = ns.State.createState(1202), station = ns.Data.LANDMARKS.find(item => item.id === 'waypoint_zero');
    const modules = [ns.Galaxies.GATE_REACTOR, ns.Galaxies.GATE_ENGINE]; state.ship.ownedModules.push(...modules); state.ship.chassis.massLimit = 220;
    expect(Object.values(ns.Data.HULLS).filter(hull => hull.tier === 4).map(hull => hull.id)).toEqual(['meridian_ranger', 'concord_lancer', 'corsair_ravager', 'prism_eidolon']);
    expect(ns.Progression.checkEquipModule(state, 'reactor', ns.Galaxies.GATE_REACTOR)).toMatchObject({ ok: false, reason: 'hull-tier' });
    state.ship.activeHullId = 'meridian_ranger'; state.ship.ownedHullIds.push('meridian_ranger'); expect(ns.Progression.equipModule(state, 'reactor', ns.Galaxies.GATE_REACTOR)).toBe(true); expect(ns.Progression.equipModule(state, 'engine', ns.Galaxies.GATE_ENGINE)).toBe(true); expect(ns.Galaxies.gateStatus(state).ready).toBe(true);
    state.ship.ownedHullIds.push('frontier_horizon_ark'); expect(ns.Progression.checkSwitchHull(state, 'frontier_horizon_ark')).toMatchObject({ ok: true });
    expect(ns.Progression.checkSwitchHull(state, 'wayfarer')).toMatchObject({ ok: false, reason: 'hull-tier' });
    state.progression.bossesDefeated = { foundry_ark: 1 }; const inventory = ns.Economy.inventoryFor(state, station); expect(inventory.modules).toEqual(expect.arrayContaining(modules));
  });

  test('reveals the Station Stargate inner tab only when docked with the complete compatible system pair', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game, ns = dom.window.MiniInvadersV2; game.newCareer(); game.ui.openPanel(game, 'navigation');
    expect([...game.ui.panelBody.querySelectorAll('[data-action="navigation-view"]')].map(button => button.textContent.trim())).toEqual(['LOCAL MAP']);
    game.state.ship.activeHullId = 'meridian_ranger'; game.state.ship.ownedHullIds.push('meridian_ranger'); game.state.ship.slots.reactor = ns.Galaxies.GATE_REACTOR; game.state.ship.slots.engine = ns.Galaxies.GATE_ENGINE; game.ui.renderPanel(game);
    expect([...game.ui.panelBody.querySelectorAll('[data-action="navigation-view"]')].map(button => button.textContent.trim())).toEqual(['LOCAL MAP', 'STATION STARGATE']); expect(game.ui.panelBody.querySelector('.map-layout.navigation-view-frame')).not.toBeNull();
    game.ui.panelBody.querySelector('[data-action="navigation-view"][data-id="stargate"]').click();
    expect(game.ui.panelBody.classList.contains('navigation-view')).toBe(true); expect(game.ui.panelBody.querySelector('.stargate-console.navigation-view-frame')).not.toBeNull(); expect(game.ui.panelBody.querySelectorAll('.stargate-node')).toHaveLength(7); expect(game.ui.panelBody.querySelector('#stargateOverlay')).not.toBeNull(); expect(game.ui.panelBody.querySelector('.stargate-confirm').textContent).toContain('STATION STARGATE TRAVEL');
    jest.useFakeTimers(); game.ui.panelBody.querySelector('.stargate-confirm').click(); expect(dom.window.document.getElementById('stargateTransition').classList.contains('active')).toBe(true); jest.advanceTimersByTime(1500); expect(game.state.galaxyId).toBe('galaxy_b'); expect(game.ui.activeTab).toBe('navigation'); expect(game.ui.navigationView).toBe('stargate'); jest.advanceTimersByTime(1500); jest.useRealTimers(); dom.window.close();
  });

  test('migrates schema-seven careers into Galaxy A without losing the active local chart', () => {
    const ns = runtime(), legacy = ns.State.createState(1203); legacy.schemaVersion = 7; legacy.ship.x = 444; delete legacy.galaxyId; delete legacy.visitedGalaxies; delete legacy.galaxyCharts; delete legacy.lastStargateTravelAt;
    const migrated = ns.Save.migrate(JSON.parse(ns.Save.serialize(legacy))); expect(migrated).toMatchObject({ schemaVersion: 11, galaxyId: 'galaxy_a', visitedGalaxies: ['galaxy_a'], ship: { x: 444 } });
  });

  test('derives Tier IV reactor, engine, and defense tradeoffs including Light Speed capability', () => {
    const ns = runtime(), state = ns.State.createState(906); state.ship.chassis.massLimit = 220; state.ship.ownedModules.push('helion_capacitor', 'corsair_surge', 'prism_resonance', 'comet_drive', 'vector_dancer', 'siege_drive', 'bastion_barrier', 'flux_screen', 'reactive_plating');
    ns.Progression.equipModule(state, 'reactor', 'corsair_surge'); ns.Progression.equipModule(state, 'engine', 'comet_drive'); ns.Progression.equipModule(state, 'defense', 'reactive_plating'); const surge = ns.Progression.calculateShipStats(state); expect(surge).toMatchObject({ energyRecharge: 30, armor: .25, lightSpeed: true }); expect(surge.hull).toBe(230); expect(surge.effects.weaponHeat).toBeCloseTo(.15);
    ns.Progression.equipModule(state, 'reactor', 'helion_capacitor'); ns.Progression.equipModule(state, 'defense', 'bastion_barrier'); const bastion = ns.Progression.calculateShipStats(state); expect(bastion).toMatchObject({ reactor: 145, energyRecharge: 15, shield: 240, shieldRecharge: 3, shieldDelay: 7 });
    ns.Progression.equipModule(state, 'engine', 'vector_dancer'); expect(ns.Progression.calculateShipStats(state).strafeScale).toBeGreaterThan(1); ns.Progression.equipModule(state, 'engine', 'siege_drive'); expect(ns.Progression.calculateShipStats(state).collisionResistance).toBe(.45);
  });

  test('routes late cargo and defense module effects through derived ship stats', () => {
    const ns = runtime(), state = ns.State.createState(916);
    state.ship.chassis.massLimit = 260; state.ship.ownedModules.push('cyan_tow_rig', 'horizon_deep_hold', 'gemini_interdictor_screen', 'deadplate_citadel');
    expect(ns.Progression.equipModule(state, 'cargo', 'cyan_tow_rig')).toBe(true);
    expect(ns.Progression.equipModule(state, 'defense', 'gemini_interdictor_screen')).toBe(true);
    const screened = ns.Progression.calculateShipStats(state);
    expect(screened).toMatchObject({ cargo: 42, interactionRange: 210, sensor: 1010, shield: 205, heavyStability: .12 });
    expect(ns.Progression.equipModule(state, 'cargo', 'horizon_deep_hold')).toBe(true);
    const deepHold = ns.Progression.calculateShipStats(state);
    expect(deepHold).toMatchObject({ cargo: 72, interactionRange: 90, sensor: 1070 });
    expect(ns.Progression.equipModule(state, 'defense', 'deadplate_citadel')).toBe(true);
    const plated = ns.Progression.calculateShipStats(state);
    expect(plated).toMatchObject({ shield: 0, hull: 320, armor: .38 });
  });

  test('runs lock, ramp, charge, ion, flak, mine, siphon, and vortex weapon behaviors', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game, ns = dom.window.MiniInvadersV2; game.newCareer(); game.state.ship.chassis.massLimit = 260; game.state.ship.chassis.reactorBonus = 500; game.state.ship.energy = 500; game.state.ship.ownedModules.push('solar_repeater', 'bloodhound_rack', 'prism_nova_coil', 'ion_needler', 'flak_array', 'shard_minecaster', 'horizon_singularity_lance'); const target = ns.Encounters.create(game, 'bandit', game.state.ship.x + 300, game.state.ship.y); game.enemies = [target];
    game.state.ship.slots.primary1 = 'solar_repeater'; ns.Weapons.control(game, 'primary1', true, .4); expect(game.weaponRamps.primary1.value).toBeGreaterThan(1); ns.Weapons.control(game, 'primary1', false, .5); expect(game.weaponRamps.primary1.value).toBe(1);
    game.weaponCooldowns.primary1 = 0; game.state.ship.slots.primary1 = 'bloodhound_rack'; ns.Weapons.control(game, 'primary1', true, .81); expect(game.bullets.at(-1)).toMatchObject({ type: 'missile', color: '#ff315c', targetId: target.id });
    game.weaponCooldowns.primary1 = 0; game.state.ship.slots.primary1 = 'prism_nova_coil'; ns.Weapons.control(game, 'primary1', true, 1.2); ns.Weapons.control(game, 'primary1', false, .01); expect(game.bullets.at(-1)).toMatchObject({ type: 'nova', pierce: 2, splash: 95 });
    ns.Weapons.playerHit(game, { status: { disabled: 1.35, slow: .45 } }, target); expect(target.disabled).toBe(1.35);
    const flak = { x: 0, y: 0, enemy: false, antiProjectile: true, proximity: 60, life: 1 }, missile = { x: 20, y: 0, enemy: true, type: 'missile', life: 1 }; game.bullets = [flak, missile]; ns.Weapons.updateProjectile(game, flak, .1); expect(missile.life).toBe(0);
    const mineTarget = ns.Encounters.create(game, 'bandit', game.state.ship.x + 70, game.state.ship.y); game.enemies = [mineTarget]; game.weaponCooldowns.primary1 = 0; game.state.ship.slots.primary1 = 'shard_minecaster'; expect(ns.Weapons.fire(game, 'primary1')).toBe(true);
    const mine = game.bullets.at(-1); mine.x = mineTarget.x; mine.y = mineTarget.y; const hullBefore = mineTarget.hull; ns.Weapons.updateProjectile(game, mine, .1); expect(mine.life).toBe(0); expect(mineTarget.hull).toBeLessThan(hullBefore);
    const vortexTarget = ns.Encounters.create(game, 'bandit', game.state.ship.x + 120, game.state.ship.y), neighbor = ns.Encounters.create(game, 'interceptor', game.state.ship.x + 230, game.state.ship.y); game.enemies = [vortexTarget, neighbor]; game.state.ship.energy = 20; game.state.ship.heat = 30;
    ns.Weapons.playerHit(game, { damage: 10, splash: 115, siphon: { energy: 10, heat: 8 }, vortex: { radius: 190, pull: 85 }, color: '#d8f7ff' }, vortexTarget);
    expect(game.state.ship.energy).toBeGreaterThan(20); expect(game.state.ship.heat).toBeLessThan(30); expect(Math.hypot(neighbor.vx || 0, neighbor.vy || 0)).toBeGreaterThan(0); dom.window.close();
  });

  test('runs specialist roles and persists destructible capital-boss state', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game, ns = dom.window.MiniInvadersV2; game.newCareer(); game.region = ns.Data.REGIONS.find(region => region.danger === 5); const ally = ns.Encounters.create(game, 'bandit', 200, 0); ally.hull = 10; const tender = ns.Encounters.create(game, 'support_tender', 220, 0); game.enemies = [ally, tender]; ns.Encounters.update(game, .1); expect(ally.hull).toBeGreaterThan(10);
    expect(['foundry_ark', 'solar_bastion', 'eclipse_cruiser'].map(id => ns.Data.BOSSES[id].controller)).toEqual(['foundry', 'bastion', 'eclipse']);
    const contract = { bossType: 'foundry_ark', target: { x: 400, y: 0 }, encounterId: 'capital:test', bossState: null }, boss = ns.Encounters.spawnBoss(game, contract); expect(Object.keys(boss.components)).toEqual(expect.arrayContaining(['bay_port', 'bay_starboard'])); const component = ns.Data.BOSSES.foundry_ark.components[0], componentPoint = ns.Geometry.componentPoint(boss, component); ns.Encounters.playerHit(game, boss, { x: componentPoint.x, y: componentPoint.y, componentId: component.id, damage: component.hull }); expect(boss.components.bay_port).toBe(0); boss.hull = boss.maxHull * .3; ns.Encounters.update(game, .1); expect(contract.bossState).toMatchObject({ phase: 3, components: { bay_port: 0 }, queuedPattern: { type: 'mine-ring' } });
    const restored = ns.Save.migrate(JSON.parse(ns.Save.serialize(game.state))); expect(restored.schemaVersion).toBe(11); dom.window.close();
  });

  test('generates risk-six capital contracts and seeded optional roaming rematches', () => {
    const ns = runtime(), state = ns.State.createState(907), station = ns.Data.LANDMARKS.find(item => item.id === 'waypoint_zero'); state.progression.tutorialStep = 2; state.pilot.level = 10; state.stats.kills = 30; state.progression.bossesDefeated = { marauder_carrier: 1 }; const capital = ns.Contracts.generateBoss(state, station, () => .25); expect(capital).toMatchObject({ risk: 6, bossType: 'foundry_ark' });
    const game = { state, region: ns.Data.REGIONS.find(region => region.danger === 5), enemies: [], bullets: [], effects: [], notify: jest.fn() }; state.playTime = 2000; state.progression.bossesDefeated.foundry_ark = 1; let seed = 1; while (ns.MathUtil.hash(seed, game.region.column, game.region.row, 1) >= .12) seed++; state.worldSeed = seed; const threat = ns.Encounters.onRegionEntered(game, game.region); expect(threat).toMatchObject({ bossType: 'foundry_ark', status: 'signaled', region: game.region.id }); expect(state.progression.nextRoamingThreatAt).toBe(3800);
    Object.assign(state.ship, { x: threat.x, y: threat.y }); const roamingBoss = ns.Encounters.updateRoaming(game); expect(roamingBoss).toMatchObject({ bossType: 'foundry_ark', roaming: true });
    const migrated = ns.Save.migrate(JSON.parse(ns.Save.serialize(state))); expect(migrated.progression.roamingThreat).toMatchObject({ bossType: 'foundry_ark', status: 'active' });
  });

  test('migrates schema-five careers into the capital-threat save contract', () => {
    const ns = runtime(), legacy = ns.State.createState(908); legacy.schemaVersion = 5; delete legacy.progression.bossesDefeated; delete legacy.progression.roamingThreat; delete legacy.progression.nextRoamingThreatAt; const migrated = ns.Save.migrate(JSON.parse(ns.Save.serialize(legacy))); expect(migrated).toMatchObject({ schemaVersion: 11, galaxyId: 'galaxy_a', progression: { bossesDefeated: {}, roamingThreat: null, nextRoamingThreatAt: 0 } });
  });

  test('unlocks five persistent enclave factions while keeping rivalries symmetric', () => {
    const ns = runtime(), state = ns.State.createState(1401);
    expect(ns.Galaxies.availableFactions(state).map(item => item.id)).toEqual(['concord', 'corsairs', 'independents']);
    expect(ns.Galaxies.availableLandmarks(state).some(item => item.id === 'aster_archive')).toBe(false);
    state.visitedGalaxies.push('galaxy_c', 'galaxy_d', 'galaxy_e', 'galaxy_f', 'galaxy_g'); state.galaxyId = 'galaxy_a';
    expect(ns.Galaxies.availableFactions(state)).toHaveLength(8); expect(ns.Galaxies.availableLandmarks(state).filter(item => item.unlockGalaxy)).toHaveLength(5);
    Object.values(ns.Data.FACTIONS).forEach(faction => (faction.hostileTo || []).forEach(rival => expect(ns.Data.FACTIONS[rival].hostileTo).toContain(faction.id)));
    const stationRegions = new Set(ns.Data.LANDMARKS.filter(item => item.type === 'station' && !item.unlockGalaxy).map(item => item.region)); expect(stationRegions.size).toBe(63);
  });

  test('applies distinct galaxy belts and exposes every procedural backdrop', () => {
    const ns = runtime(), state = ns.State.createState(1402);
    ns.Data.GALAXIES.forEach(galaxy => { state.galaxyId = galaxy.id; if (!state.visitedGalaxies.includes(galaxy.id)) state.visitedGalaxies.push(galaxy.id); const regions = ns.Galaxies.worldRegions(state), belt = regions.filter(region => region.asteroidDensity === 1.6).map(region => region.grid); expect(new Set(belt)).toEqual(new Set(galaxy.beltSectors)); expect(galaxy.backdrop).toEqual(expect.any(String)); });
    expect(ns.Data.GALAXIES.find(item => item.id === 'galaxy_d').backdrop).toBe('nebula-cloud'); expect(ns.Data.GALAXIES.find(item => item.id === 'galaxy_f').backdrop).toBe('corner-black-hole');
    const dom = bootDom(), game = dom.window.miniInvadersV2Game; game.newCareer(); dom.window.MiniInvadersV2.Data.GALAXIES.forEach(galaxy => expect(() => game.renderer.clear(game.region, game.camera, galaxy)).not.toThrow()); dom.window.close();
  });

  test('blocks faction contracts only when required stations deny docking', () => {
    const ns = runtime(), state = ns.State.createState(1403), concord = ns.Data.LANDMARKS.find(item => item.id === 'helion_bastion'), corsair = ns.Data.LANDMARKS.find(item => item.id === 'rust_orbit'); state.progression.tutorialStep = 2;
    const single = { id: 'access:single', type: 'haul', issuer: 'corsairs', status: 'offered', target: { x: concord.x, y: concord.y }, destination: concord.id, stages: [{ id: 'access:single:0', type: 'haul', event: 'dock', destination: concord.id, target: { x: concord.x, y: concord.y }, status: 'active', progress: 0, required: 1 }] };
    state.pilot.allegiance = 'corsairs'; state.reputations.concord = -49; state.contracts.board = [single]; expect(ns.Expansion.patrolStatus(state, 'concord')).toBe('HOSTILE'); expect(ns.Contracts.accept(state, single.id)).toBe(true);
    state.contracts.active = null; state.reputations.concord = -50; expect(ns.Contracts.accept(state, single.id)).toBe(false);
    const choice = { id: 'access:choice', type: 'choice', issuer: 'independents', status: 'offered', target: { x: concord.x, y: concord.y }, stages: [{ id: 'choice:0', type: 'choice', event: 'dock', status: 'active', progress: 0, required: 1, choices: [{ destination: concord.id, faction: 'concord', name: concord.name, target: { x: concord.x, y: concord.y } }, { destination: corsair.id, faction: 'corsairs', name: corsair.name, target: { x: corsair.x, y: corsair.y } }] }] };
    state.contracts.board = [choice]; state.reputations.corsairs = -49; expect(ns.Contracts.accept(state, choice.id)).toBe(true); state.reputations.corsairs = -50; expect(ns.Contracts.dockingWarning(state)).not.toBeNull(); state.reputations.concord = -49; expect(ns.Contracts.dockingWarning(state)).toBeNull();
  });

  test('generates and resolves all five fixed-pay faction-choice templates', () => {
    const ns = runtime(), state = ns.State.createState(1404), station = ns.Data.LANDMARKS.find(item => item.id === 'waypoint_zero'); state.progression.tutorialStep = 2; state.contracts.completed = 8; state.ship.ownedModules.push('light_drive'); state.visitedGalaxies.push('galaxy_c','galaxy_d','galaxy_e','galaxy_f','galaxy_g');
    ns.Contracts.CHOICE_TEMPLATES.forEach((template, index) => { const contract = ns.Contracts.generateChoice(state, station, index, ns.MathUtil.seeded(900 + index), template); expect(contract).toMatchObject({ type: 'choice', template, stages: [{ status: 'active' }, { status: 'pending', choices: expect.any(Array) }] }); expect(contract.stages[1].choices).toHaveLength(2); expect(new Set(contract.stages[1].choices.map(choice => choice.faction)).size).toBe(2); });
    const contract = ns.Contracts.generateChoice(state, station, 9, ns.MathUtil.seeded(999), 'lost_cargo_choice'); state.contracts.active = contract; contract.status = 'active'; const contact = ns.Contracts.contactFor(contract); expect(ns.Contracts.recordProgress(state, contact.event, 1, contact)).toBe(false); const chosen = ns.Contracts.activeStages(contract)[0].choices[1], chosenStation = ns.Data.LANDMARKS.find(item => item.id === chosen.destination); expect(ns.Contracts.recordProgress(state, 'dock', 1, chosenStation)).toBe(true); expect(contract.reputationRecipient).toBe(chosen.faction);
  });

  test('starts timed work on undock and applies soft, hard, and on-time payment rules', () => {
    const ns = runtime(), make = (hard, missed) => { const state = ns.State.createState(hard ? 1500 : 1501); state.dockedAt = 'waypoint_zero'; state.progression.tutorialStep = 2; const contract = { id: `timer:${hard}:${missed}`, type: 'haul', issuer: 'independents', name: 'Timed Freight', reward: { aetherium: 100, sunshards: 0, helionite: 0 }, xp: 20, risk: 3, status: 'active', timer: { duration: 60, remaining: missed ? 0 : 20, started: true, missed, hard }, stages: [{ id: 'timer:stage', type: 'haul', event: 'dock', destination: 'waypoint_zero', target: { x: 0, y: 0 }, status: 'complete', progress: 1, required: 1 }] }; state.contracts.active = contract; return state; };
    const onTime = make(false, false); ns.Contracts.complete(onTime); expect(onTime.pilot.wallet.banked.aetherium).toBe(385);
    const soft = make(false, true); ns.Contracts.complete(soft); expect(soft.pilot.wallet.banked.aetherium).toBe(350);
    const hard = make(true, true); const before = hard.pilot.wallet.banked.aetherium; ns.Contracts.complete(hard); expect(hard.pilot.wallet.banked.aetherium).toBe(before); expect(hard.reputations.independents).toBe(7);
    const pending = make(false, false); pending.contracts.active.timer.started = false; expect(ns.Contracts.updateTimer(pending, 10)).toBe(false); expect(pending.contracts.active.timer.remaining).toBe(20); expect(ns.Contracts.startTimer(pending)).toBe(true); ns.Contracts.updateTimer(pending, 5); expect(pending.contracts.active.timer.remaining).toBe(15);
  });

  test('keeps escort rendezvous within two sectors and accelerates close formations', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game, ns = dom.window.MiniInvadersV2; game.newCareer(); game.state.progression.tutorialStep = 2; game.state.contracts.completed = 4; game.state.dockedAt = null;
    const station = ns.Data.LANDMARKS.find(item => item.id === 'waypoint_zero'), escorts = Array.from({ length: 250 }, (_, index) => ns.Contracts.generate(game.state, station, index)).filter(contract => contract.type === 'escort'); expect(escorts.length).toBeGreaterThan(0);
    escorts.forEach(contract => { const escort = contract.stages[0].escort, start = ns.Data.REGIONS.find(region => region.id === escort.startRegion), end = ns.Data.REGIONS.find(region => region.id === escort.endRegion), gap = Math.max(Math.abs(start.column-end.column),Math.abs(start.row-end.row)); expect(gap).toBeGreaterThanOrEqual(1); expect(gap).toBeLessThanOrEqual(2); });
    const contract = escorts[0]; game.state.contracts.active = contract; const convoy = ns.Contracts.startEscort(game.state); Object.assign(game.state.ship, { x: convoy.x, y: convoy.y, vx: 260, vy: 0 }); game.updateContract(.5); expect(contract.escort.speed).toBeGreaterThan(ns.Contracts.ESCORT_CONFIG.speed);
    Object.assign(game.state.ship, { x: convoy.x + 800, y: convoy.y, vx: 0, vy: 0 }); contract.escort.grace = 3.9; game.contractWarningTimer = 0; game.updateContract(.1); expect(game.ui.message.textContent).toContain('ESCORT LINK CRITICAL'); expect(game.ui.message.classList).toContain('convoy-warning'); convoy.hull = convoy.maxHull * .35; game.updateContract(.1); expect(game.ui.message.textContent).toContain('CONVOY HULL CRITICAL'); game.ui.updateHud(game); expect(dom.window.document.getElementById('objective').classList).toContain('convoy-warning'); dom.window.close();
  });

  test('uses 90/240 interaction ranges and requires a cast for distress recovery', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game, ns = dom.window.MiniInvadersV2; game.newCareer(); game.undock(); expect(ns.Progression.calculateShipStats(game.state).interactionRange).toBe(90);
    game.state.ship.ownedModules.push('tractor_lattice'); expect(ns.Progression.equipModule(game.state, 'utility1', 'tractor_lattice')).toBe(true); expect(ns.Progression.calculateShipStats(game.state).interactionRange).toBe(240);
    const signal = game.world.spawnTransient({ id: 'distress:cast', kind: 'worldScenario', typeId: 'distress_call', name: 'Pilot Recovery Signal', x: game.state.ship.x + 200, y: game.state.ship.y, radius: 22, region: game.region.id }); expect(signal).not.toBeNull(); expect(ns.WorldEvents.update(game)).toBe(false); expect(game.world.loadedEntities()).toContain(signal); expect(game.availableInteraction().target).toBe(signal); game.interact(); expect(game.interactionCast).toMatchObject({ id: signal.id, duration: 4 }); dom.window.close();
  });

  test('drops interactable minerals instead of direct asteroid currency', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game, ns = dom.window.MiniInvadersV2; game.newCareer(); game.undock(); game.random = { chance: () => true, next: () => .1, range: (min) => min }; const before = ns.Wallet.total(game.state);
    const mineral = game.handleAsteroidResult({ destroyed: true, asteroid: { tier: 'small', x: game.state.ship.x + 40, y: game.state.ship.y, vx: 0, vy: 0 } }); expect(mineral).toMatchObject({ typeId: 'mineral_chunk', reward: { aetherium: 2 } }); expect(ns.Wallet.total(game.state)).toEqual(before); expect(game.availableInteraction().target).toBe(mineral); expect(read('js/renderer.js').match(/style === 'mineral'[^\n]+/)[0]).not.toContain('strokeRect'); game.completeInteraction(mineral, 'world'); expect(game.state.pilot.wallet.unbanked.aetherium).toBe(2); dom.window.close();
  });

  test('runs Deep Freeze tiers, reduced weapon costs, and combined Light Speed payment', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game, ns = dom.window.MiniInvadersV2; game.newCareer(); game.undock(); game.state.contracts.completed = 5; game.state.ship.ownedModules.push('deep_freeze_mk1'); game.state.ship.slots.abilitySpace = 'deep_freeze_mk1'; game.state.ship.heat = 80; game.state.ship.energy = 80; expect(ns.Abilities.activate(game, 'abilitySpace')).toBe(true); expect(game.state.ship.heat).toBe(45); expect(ns.Abilities.heatScale(game.state)).toBe(.2);
    game.state.ship.slots.primary1 = 'pulse_mk1'; game.weaponCooldowns.primary1 = 0; game.state.ship.energy = 80; game.state.ship.heat = 0; expect(ns.Weapons.fire(game, 'primary1')).toBe(true); expect(game.state.ship.energy).toBeCloseTo(80 - 7 * .7); expect(game.state.ship.heat).toBeCloseTo(9 * .7 * .2);
    game.state.pilot.wallet.banked = { aetherium: 0, sunshards: 3, helionite: 4 }; game.state.pilot.wallet.unbanked = { aetherium: 0, sunshards: 2, helionite: 1 }; expect(ns.Wallet.canAffordCombined(game.state, { sunshards: 5, helionite: 5 })).toBe(true); expect(ns.Wallet.debitCombined(game.state, { sunshards: 5, helionite: 5 })).toBe(true); expect(ns.Wallet.total(game.state)).toEqual({ aetherium: 0, sunshards: 0, helionite: 0 }); dom.window.close();
  });

  test('hits rendered boss geometry and creates differentiated death salvage effects', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game, ns = dom.window.MiniInvadersV2; game.newCareer(); game.undock(); const boss = ns.Encounters.create(game, 'foundry_ark', game.state.ship.x + 200, game.state.ship.y, { angle: -Math.PI / 2 }); const hit = ns.Geometry.segmentPolygonHit({ x: boss.x - 120, y: boss.y }, { x: boss.x + 120, y: boss.y }, boss, 3); expect(hit).not.toBeNull(); expect(ns.Geometry.fragments(boss).length).toBeGreaterThan(ns.Geometry.fragments(ns.Encounters.create(game, 'interceptor', 0, 0)).length);
    game.random = { chance: () => true, next: () => .1, range: (min) => min }; game.spawnEnemyDeath(boss); expect(game.effects.some(effect => effect.fragment)).toBe(true); expect(game.world.loadedEntities().some(entity => entity.typeId === 'capital_salvage')).toBe(true); dom.window.close();
  });

  test('renders contained Trade cards, contract telemetry, Light Speed text, and fixed Stargate hover', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game; game.newCareer(); game.state.progression.tutorialStep = 2; game.state.contracts.completed = 5; game.state.ship.ownedModules.push('heat_sink'); game.ui.openPanel(game, 'station'); expect(game.ui.panelBody.querySelectorAll('.station-facts span')).toHaveLength(3); game.ui.openPanel(game, 'trade'); expect(game.ui.panelBody.querySelector('.trade-console')).not.toBeNull(); expect(game.ui.panelBody.querySelectorAll('.module-offer-action button').length).toBeGreaterThan(0); expect(game.ui.panelBody.querySelector('.module-offer-body .module-stats')).not.toBeNull(); expect(game.ui.panelBody.querySelector('.owned-module-grid')).not.toBeNull(); expect(game.ui.panelBody.querySelector('[data-action="sell-module"][data-id="heat_sink"]').textContent).toContain('SELL'); expect(game.ui.panelBody.textContent).toContain('RESALE COUNTER'); game.ui.updateHud(game); expect(dom.window.document.getElementById('lightDriveHud').textContent).toContain('LIGHT SPEED'); const css = read('css/style.css'); expect(css).toContain('.stargate-node:hover:not(:disabled)'); expect(css).toContain('transform: translate(-50%, -50%)'); dom.window.close();
  });
});

describe('Frontier Wayfarer irregular galaxies, relics, and map objectives', () => {
  test('uses seven unique contiguous 8x8 masks with 48 to 56 active sectors', () => {
    const ns = runtime(), masks = ns.Data.GALAXIES.map(galaxy => galaxy.mask.join(''));
    expect(new Set(masks).size).toBe(7);
    ns.Data.GALAXIES.forEach(galaxy => {
      const active = []; galaxy.mask.forEach((row, y) => [...row].forEach((cell, x) => { if (cell === '#') active.push([x, y]); }));
      expect(active.length).toBeGreaterThanOrEqual(48); expect(active.length).toBeLessThanOrEqual(56); expect(galaxy.mask.every(row => row.length === 8)).toBe(true);
      const open = [active[0]], seen = new Set([active[0].join(',')]);
      while (open.length) { const [x, y] = open.shift(); [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy]) => { const key = `${x+dx},${y+dy}`; if (galaxy.mask[y+dy]?.[x+dx] === '#' && !seen.has(key)) { seen.add(key); open.push([x+dx,y+dy]); } }); }
      expect(seen.size).toBe(active.length);
      const state = ns.State.createState(401); state.galaxyId = galaxy.id; if (!state.visitedGalaxies.includes(galaxy.id)) state.visitedGalaxies.push(galaxy.id); const regions = ns.Galaxies.worldRegions(state); expect(regions).toHaveLength(active.length); ns.Galaxies.availableLandmarks(state).forEach(landmark => expect(regions.some(region => region.id === landmark.region)).toBe(true));
    });
  });

  test('generates five stable per-galaxy objectives while preserving Galaxy A equipment goals', () => {
    const ns = runtime(), first = ns.State.createState(402), repeat = ns.State.createState(402), other = ns.State.createState(403);
    ns.Data.GALAXIES.forEach(galaxy => { const definitions = ns.Objectives.definitionsFor(first, galaxy.id); expect(definitions).toHaveLength(5); expect(new Set(definitions.map(item => item.family)).size).toBe(5); });
    expect(ns.Objectives.definitionsFor(first, 'galaxy_a').slice(0, 2).map(item => item.id)).toEqual(['light_speed_engine', 'stargate_pair']);
    expect(ns.Objectives.definitionsFor(repeat, 'galaxy_d')).toEqual(ns.Objectives.definitionsFor(first, 'galaxy_d'));
    expect(ns.Objectives.definitionsFor(other, 'galaxy_d')).not.toEqual(ns.Objectives.definitionsFor(first, 'galaxy_d'));
    ns.Data.GALAXIES.forEach(galaxy => ns.Objectives.definitionsFor(first, galaxy.id).forEach(objective => { const range = ns.Objectives.REWARD_RANGES[objective.difficulty]; Object.entries(objective.reward).forEach(([currency, value]) => { expect(value).toBeGreaterThanOrEqual(range[currency][0]); expect(value).toBeLessThanOrEqual(range[currency][1]); }); if (objective.family === 'relic') expect(ns.Objectives.relicFor(first, galaxy.id).present).toBe(true); }));
  });

  test('pays completed objectives once and migrates legacy totals into the current galaxy', () => {
    const ns = runtime(), state = ns.State.createState(404), objective = ns.Objectives.definitionsFor(state, 'galaxy_a')[0], before = state.pilot.wallet.banked.aetherium;
    state.ship.ownedModules.push('light_drive'); let result = ns.Objectives.evaluate(state, 'galaxy_a'); expect(result.completed.map(item => item.id)).toContain(objective.id); expect(state.pilot.wallet.banked.aetherium).toBe(before + objective.reward.aetherium);
    result = ns.Objectives.evaluate(state, 'galaxy_a'); expect(result.completed).toHaveLength(0); expect(state.pilot.wallet.banked.aetherium).toBe(before + objective.reward.aetherium);
    const legacy = ns.State.createState(405); legacy.schemaVersion = 9; delete legacy.mapObjectives; legacy.contracts.completed = 12; legacy.stats.kills = 88; legacy.stats.trades = 9; legacy.progression.bossesDefeated = { marauder_carrier: 2 }; const migrated = ns.Save.migrate(JSON.parse(ns.Save.serialize(legacy)));
    expect(migrated.mapObjectives.progress.galaxy_a).toMatchObject({ contracts: 12, kills: 88, trades: 9, bosses: 2 });
  });

  test('creates at most one deterministic drifting Ancient Relic and pays its exact field reward', () => {
    const ns = runtime(); let state = null, relic = null;
    for (let seed = 1; seed < 500 && !relic?.present; seed++) { state = ns.State.createState(seed); relic = ns.Objectives.relicFor(state, 'galaxy_a'); }
    expect(relic.present).toBe(true); const world = new ns.World.WorldService(ns.Galaxies.worldSeed(state), [], ns.Galaxies.worldConfig(state)); world.update(relic.x, relic.y); const loaded = world.loadedEntities().filter(entity => entity.typeId === 'ancient_relic'); expect(loaded).toHaveLength(1);
    const entity = loaded[0], old = { x: entity.x, y: entity.y, rotation: entity.rotation }; world.updateAsteroids(1); expect({ x: entity.x, y: entity.y, rotation: entity.rotation }).not.toEqual(old);
    const game = { state, world, region: ns.World.regionAt(entity.x, entity.y, world.config), enemies: [], notify: jest.fn(), save: jest.fn(), ui: { renderAll: jest.fn() }, spawnEnemies: jest.fn() }, before = ns.Wallet.total(state);
    expect(ns.WorldEvents.interact(game, entity)).toBe(true); const after = ns.Wallet.total(state); expect(after).toEqual({ aetherium: before.aetherium + 500, sunshards: before.sunshards + 150, helionite: before.helionite + 100 }); expect(state.mapObjectives.progress.galaxy_a.relic).toBe(1); expect(world.loadedEntities().filter(item => item.typeId === 'ancient_relic')).toHaveLength(0);
  });

  test('rejects missing-sector waypoints and groups faction cards by standing', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game; game.newCareer(); const missing = dom.window.MiniInvadersV2.Data.REGIONS.find(region => region.grid === 'A1');
    expect(game.setCustomWaypoint({ x: missing.x + 100, y: missing.y + 100 })).toBeNull(); expect(game.ui.message.textContent).toContain('NO NAVIGABLE SECTOR');
    game.state.reputations.concord = 20; game.state.reputations.independents = 0; game.state.reputations.corsairs = -10; game.ui.openPanel(game, 'factions'); const rows = game.ui.panelBody.querySelectorAll('.faction-standing-row'); expect(rows).toHaveLength(2); expect(rows[0].querySelector('h2').textContent).toBe('FRIENDLY'); expect(rows[0].textContent.indexOf('Helion Concord')).toBeLessThan(rows[0].textContent.indexOf('Frontier Guilds')); expect(rows[1].textContent).toContain('Null Corsairs'); dom.window.close();
  });

  test('contains the Local Map in a no-scroll fitted stage with an enlarged details panel', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game; game.newCareer(); game.ui.openPanel(game, 'navigation');
    expect(game.ui.panelBody.classList.contains('navigation-view')).toBe(true); expect(game.ui.panelBody.classList.contains('navigation-local-view')).toBe(true); expect(game.ui.panelBody.querySelector('.map-stage > .galaxy-map')).not.toBeNull();
    const css = read('css/style.css'); expect(css).toContain('grid-template-rows:auto minmax(0,1fr)'); expect(css).toContain('repeat(2,minmax(0,190px))'); expect(css).toContain('.navigation-view .navigation-view-frame'); expect(css).toContain('clamp(310px,25vw,370px)'); expect(css).toContain('.navigation-local-view .map-stage'); expect(css).toContain('aspect-ratio:1 / 1');
    dom.window.close();
  });

  test('marks the current stargate node and enforces the persisted sixty-second cooldown', () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game, ns = dom.window.MiniInvadersV2; game.newCareer(); game.state.ship.activeHullId = 'meridian_ranger'; game.state.ship.ownedHullIds.push('meridian_ranger'); game.state.ship.slots.reactor = ns.Galaxies.GATE_REACTOR; game.state.ship.slots.engine = ns.Galaxies.GATE_ENGINE; game.ui.openPanel(game, 'navigation'); game.ui.panelBody.querySelector('[data-action="navigation-view"][data-id="stargate"]').click();
    expect(game.ui.panelBody.querySelectorAll('.stargate-player-marker')).toHaveLength(1); expect(game.ui.panelBody.querySelector('.stargate-node.current .stargate-player-marker').textContent).toBe('YOU');
    expect(ns.Galaxies.travel(game.state, 'galaxy_b')).toMatchObject({ ok: true }); game.state.dockedAt = 'waypoint_zero'; expect(ns.Galaxies.travel(game.state, 'galaxy_a')).toMatchObject({ ok: false, reason: 'cooldown', remaining: expect.any(Number) });
    game.useState(game.state); game.ui.navigationView = 'stargate'; game.ui.selectedGalaxyId = 'galaxy_a'; game.ui.openPanel(game, 'navigation'); expect(game.ui.panelBody.querySelector('.stargate-confirm').textContent).toContain('COOLDOWN'); game.ui.panelBody.querySelector('.stargate-confirm').click(); expect(game.ui.message.textContent).toContain('COOLDOWN'); dom.window.close();
  });

  test('updates the stargate cooldown countdown without unrelated state changes', async () => {
    const dom = bootDom(), game = dom.window.miniInvadersV2Game, ns = dom.window.MiniInvadersV2; game.newCareer(); game.state.ship.activeHullId = 'meridian_ranger'; game.state.ship.ownedHullIds.push('meridian_ranger'); game.state.ship.slots.reactor = ns.Galaxies.GATE_REACTOR; game.state.ship.slots.engine = ns.Galaxies.GATE_ENGINE; game.state.lastStargateTravelAt = Date.now(); game.ui.openPanel(game, 'navigation'); game.ui.panelBody.querySelector('[data-action="navigation-view"][data-id="stargate"]').click();
    const localTab = game.ui.panelBody.querySelector('[data-action="navigation-view"][data-id="local"]'), galaxyNode = game.ui.panelBody.querySelector('.stargate-node'); expect(game.ui.panelBody.querySelector('.stargate-confirm').textContent).toContain('COOLDOWN 60S');
    await new Promise(resolve => setTimeout(resolve, 1100));
    expect(game.ui.panelBody.querySelector('.stargate-confirm').textContent).toContain('COOLDOWN 59S'); expect(game.ui.panelBody.querySelector('[data-action="navigation-view"][data-id="local"]')).toBe(localTab); expect(game.ui.panelBody.querySelector('.stargate-node')).toBe(galaxyNode);
    dom.window.close();
  });
});
