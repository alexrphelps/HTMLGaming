const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createBrowserContext, loadBrowserScript } = require('../helpers/browserScriptHarness');

const root = path.resolve(__dirname, '../..');
const gamePath = path.join(root, 'games/never-south/index.html');
const gameDir = path.dirname(gamePath);
const configPath = path.join(root, 'games.config.js');

const expectedScripts = [
  'js/config.js',
  'js/rng.js',
  'js/cards.js',
  'js/world.js',
  'js/runState.js',
  'js/input.js',
  'js/render.js',
  'js/main.js'
];

const runtimeScripts = [
  'games/never-south/js/config.js',
  'games/never-south/js/rng.js',
  'games/never-south/js/cards.js',
  'games/never-south/js/world.js',
  'games/never-south/js/runState.js'
];

function readGameFile(relativePath) {
  return fs.readFileSync(path.join(gameDir, relativePath), 'utf8');
}

function loadNeverSouthRuntime() {
  const context = createBrowserContext();
  runtimeScripts.forEach(file => loadBrowserScript(context, file, []));
  return context.window.NeverSouth;
}

function createFakeCanvas(width = 1280, height = 820) {
  const noop = () => {};
  const context = {
    imageSmoothingEnabled: false,
    setTransform: noop,
    clearRect: noop,
    fillRect: noop,
    strokeRect: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    fill: noop,
    stroke: noop,
    fillText: noop,
    createLinearGradient() {
      return { addColorStop: noop };
    },
    measureText(text) {
      return { width: String(text).length * 7 };
    }
  };
  return {
    width,
    height,
    clientWidth: width,
    clientHeight: height,
    getContext() {
      return context;
    }
  };
}

function loadNeverSouthWithRenderer() {
  const context = createBrowserContext();
  runtimeScripts.concat(['games/never-south/js/render.js']).forEach(file => loadBrowserScript(context, file, []));
  return context.window.NeverSouth;
}

describe('Never South playable v1', () => {
  test('provides a clean iframe entry point with ordered external assets', () => {
    expect(fs.existsSync(gamePath)).toBe(true);

    for (const scriptPath of expectedScripts) {
      const fullPath = path.join(gameDir, scriptPath);
      expect(fs.existsSync(fullPath)).toBe(true);
      expect(() => new Function(fs.readFileSync(fullPath, 'utf8'))).not.toThrow();
    }

    const html = fs.readFileSync(gamePath, 'utf8');
    expect(html).toContain('<link rel="stylesheet" href="css/style.css">');
    expect(html).not.toMatch(/<style[\s>]/);
    expect(html).not.toMatch(/<script>([\s\S]*?)<\/script>/);
    expect(html).not.toContain('onclick=');
    expect([...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(match => match[1])).toEqual(expectedScripts);
  });

  test('is registered in the configured GameHub catalog', () => {
    const sandbox = { window: {} };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(configPath, 'utf8'), sandbox);

    expect(sandbox.window.GAMEHUB_GAMES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          folder: 'never-south',
          name: 'Never South',
          category: 'Strategy',
          input: 'Keyboard + Mouse',
          rendering: 'Canvas',
          saveSupport: 'None'
        })
      ])
    );
  });

  test('movement definitions and validation forbid southward destinations', () => {
    const ns = loadNeverSouthRuntime();
    const run = new ns.NeverSouthRun('movement-test');

    ns.CARD_DEFINITIONS.forEach(card => {
      card.offsets.forEach(offset => expect(offset.row).toBeLessThanOrEqual(0));
    });

    const fakeSouthCard = {
      instanceId: 'south',
      id: 'south',
      name: 'Forbidden South',
      cost: { scrap: 0, glow: 0 },
      offsets: [{ col: 0, row: 1 }],
      traits: []
    };
    expect(run.isValidMove(fakeSouthCard, { col: run.player.col, row: run.player.row + 1 })).toBe(false);
  });

  test('deck cycling discards played cards and reshuffles discard into draw pile', () => {
    const ns = loadNeverSouthRuntime();
    const deck = new ns.Deck(['north', 'west'], ns.createRng('deck-cycle'), 1);
    const resources = { scrap: 3, glow: 3 };
    const first = deck.hand[0].instanceId;

    expect(deck.play(first, resources).ok).toBe(true);
    expect(deck.discardPile.length).toBe(1);

    const second = deck.hand[0].instanceId;
    expect(deck.play(second, resources).ok).toBe(true);
    expect(deck.hand.length).toBe(1);
    expect(deck.drawPile.length + deck.discardPile.length).toBe(1);
  });

  test('movement plays discard the used card without drawing a replacement', () => {
    const ns = loadNeverSouthRuntime();
    const run = new ns.NeverSouthRun('movement-discard-test');
    const playedCard = run.deck.createCard('north');
    const target = { col: run.player.col, row: run.player.row - 1 };

    run.status = 'playing';
    run.deck.hand = [playedCard];
    run.deck.drawPile = run.deck.drawPile.filter((card) => card.instanceId !== playedCard.instanceId);
    ns.setTile(run.world, target.col, target.row, ns.makeTile(ns.TILE_TYPES.SAFE));

    const initialHandCount = run.deck.hand.length;

    expect(target).toBeDefined();
    expect(run.playSelectedTo(target).ok).toBe(true);
    expect(run.deck.discardPile.some((card) => card.instanceId === playedCard.instanceId)).toBe(true);
    expect(run.deck.hand.length).toBe(initialHandCount - 1);
  });

  test('resource costs block unaffordable movement and allow affordable movement', () => {
    const ns = loadNeverSouthRuntime();
    const run = new ns.NeverSouthRun('cost-test');
    const card = run.deck.createCard('long-north');
    const target = { col: run.player.col, row: run.player.row - 2 };

    ns.setTile(run.world, target.col, target.row, ns.makeTile(ns.TILE_TYPES.SAFE));
    run.player.glow = 0;
    expect(run.isValidMove(card, target)).toBe(false);

    run.player.glow = 1;
    expect(run.isValidMove(card, target)).toBe(true);
  });

  test('default tile rules generate only basic passable tiles', () => {
    const ns = loadNeverSouthRuntime();
    const run = new ns.NeverSouthRun('basic-tiles-test');
    const samples = [
      { col: run.player.col, row: run.player.row },
      { col: run.player.col, row: run.player.row - 1 },
      { col: run.player.col - 20, row: run.player.row - 50 },
      { col: run.player.col + 37, row: run.player.row - 91 }
    ];

    expect(ns.getTileRuleMode(run.world)).toBe('basic');
    samples.forEach(point => {
      const tile = ns.getTile(run.world, point.col, point.row);
      expect(tile.type).toBe(ns.TILE_TYPES.SAFE);
      expect(ns.canEnterTile(tile, { traits: [] }, run)).toBe(true);
      expect(ns.isTilePathable(tile, run.world)).toBe(true);
    });
  });

  test('basic tile landings do not apply passive resources damage or conversions', () => {
    const ns = loadNeverSouthRuntime();
    const run = new ns.NeverSouthRun('basic-landing-test');
    const card = run.deck.createCard('north');
    const target = { col: run.player.col, row: run.player.row - 1 };
    const before = {
      scrap: run.player.scrap,
      glow: run.player.glow,
      health: run.player.health
    };

    expect(run.isValidMove(card, target)).toBe(true);
    run.movePlayer(target, card);
    run.resolveLandingTile();

    expect(run.player.scrap).toBe(before.scrap);
    expect(run.player.glow).toBe(before.glow);
    expect(run.player.health).toBe(before.health);
    expect(ns.getTile(run.world, target.col, target.row).type).toBe(ns.TILE_TYPES.SAFE);
    expect(run.pendingActions.map((action) => action.id)).toEqual(['basic-draw']);
  });

  test('procedural worlds provide a non-south path or emergency fallback from the start', () => {
    const ns = loadNeverSouthRuntime();

    ['alpha', 'beta', 'gamma', 'delta', 'epsilon'].forEach(seed => {
      const run = new ns.NeverSouthRun(seed);
      const start = { col: ns.CONFIG.grid.startCol, row: ns.CONFIG.grid.startRow };
      expect(ns.hasNonSouthPath(run.world, start) || run.canUseEmergencyMove()).toBe(true);
    });
  });

  test('emergency movement still finds a basic northward tile', () => {
    const ns = loadNeverSouthRuntime();
    const run = new ns.NeverSouthRun('basic-emergency-test');
    run.status = 'playing';
    run.player.glow = ns.CONFIG.run.emergencyGlowCost;
    run.deck.hand = [];

    expect(run.useEmergencyMove()).toBe(true);
    expect(run.player.row).toBe(ns.CONFIG.grid.startRow - 1);
    expect(ns.getTile(run.world, run.player.col, run.player.row).type).toBe(ns.TILE_TYPES.SAFE);
  });

  test('world generation is deterministic, sparse, and caches tile mutations', () => {
    const ns = loadNeverSouthRuntime();
    const first = ns.generateZone('infinite-cache');
    const second = ns.generateZone('infinite-cache');
    const far = { col: -123, row: -456 };
    const firstTile = ns.getTile(first, far.col, far.row);
    const firstAgain = ns.getTile(first, far.col, far.row);
    const secondTile = ns.getTile(second, far.col, far.row);

    expect(first.tilesByKey).toBeDefined();
    expect(first.tileRuleMode).toBe('basic');
    expect(first.tiles).toBeUndefined();
    expect(first.cols).toBeUndefined();
    expect(first.rows).toBeUndefined();
    expect(firstTile).toBe(firstAgain);
    expect(firstTile.type).toBe(secondTile.type);
    expect(firstTile.type).toBe(ns.TILE_TYPES.SAFE);

    firstTile.visited = true;
    firstTile.collected = true;
    expect(ns.getTile(first, far.col, far.row).visited).toBe(true);
    expect(ns.getTile(first, far.col, far.row).collected).toBe(true);
    expect(ns.getTile(second, far.col, far.row).visited).toBe(false);
    expect(ns.getTile(second, far.col, far.row).collected).toBeUndefined();
  });

  test('movement can continue beyond the former finite map edges', () => {
    const ns = loadNeverSouthRuntime();
    const run = new ns.NeverSouthRun('edge-movement-test');
    const west = run.deck.createCard('west');
    const east = run.deck.createCard('east');
    const north = run.deck.createCard('north');

    run.player.col = 0;
    run.player.row = ns.CONFIG.grid.startRow;
    ns.setTile(run.world, -1, run.player.row, ns.makeTile(ns.TILE_TYPES.SAFE));
    expect(run.isValidMove(west, { col: -1, row: run.player.row })).toBe(true);

    run.player.col = ns.CONFIG.grid.cols - 1;
    ns.setTile(run.world, ns.CONFIG.grid.cols, run.player.row, ns.makeTile(ns.TILE_TYPES.SAFE));
    expect(run.isValidMove(east, { col: ns.CONFIG.grid.cols, row: run.player.row })).toBe(true);

    run.player.col = ns.CONFIG.grid.startCol;
    run.player.row = 0;
    ns.setTile(run.world, run.player.col, -1, ns.makeTile(ns.TILE_TYPES.SAFE));
    expect(run.isValidMove(north, { col: run.player.col, row: -1 })).toBe(true);
  });

  test('endless survival has no generated north gate or gate actions', () => {
    const ns = loadNeverSouthRuntime();
    const run = new ns.NeverSouthRun('endless-gate-test');

    expect(ns.TILE_TYPES.GATE).toBeUndefined();
    expect(run.world.enemies.some(enemy => enemy.type === 'guard')).toBe(false);
    expect(run.getTileActions(ns.makeTile(ns.TILE_TYPES.CAMP)).map(action => action.id)).not.toContain('open-gate');

    run.player.row = -200;
    run.checkEndState();
    expect(run.status).not.toBe('won');
  });

  test('default tile rules hide contextual actions while legacy rules preserve them', () => {
    const ns = loadNeverSouthRuntime();
    const run = new ns.NeverSouthRun('action-test');
    expect(run.getTileActions(ns.makeTile(ns.TILE_TYPES.SHOP))).toEqual([]);
    expect(run.getTileActions(ns.makeTile(ns.TILE_TYPES.SHRINE))).toEqual([]);
    expect(run.getTileActions(ns.makeTile(ns.TILE_TYPES.CAMP))).toEqual([]);
    expect(run.getTileActions(ns.makeTile(ns.TILE_TYPES.SAFE, { visited: true })).map(action => action.id)).toEqual(['basic-draw']);

    ns.CONFIG.tiles.ruleMode = 'legacy';
    const legacyRun = new ns.NeverSouthRun('legacy-action-test');
    const actionCounts = [
      legacyRun.getTileActions(ns.makeTile(ns.TILE_TYPES.SHOP)).length,
      legacyRun.getTileActions(ns.makeTile(ns.TILE_TYPES.SHRINE)).length,
      legacyRun.getTileActions(ns.makeTile(ns.TILE_TYPES.CAMP)).length
    ];

    actionCounts.forEach(count => {
      expect(count).toBeGreaterThanOrEqual(2);
      expect(count).toBeLessThanOrEqual(3);
    });
    ns.CONFIG.tiles.ruleMode = 'basic';
  });

  test('basic tiles offer a one-time draw action that costs 3 scrap', () => {
    const ns = loadNeverSouthRuntime();
    const run = new ns.NeverSouthRun('basic-draw-action-test');
    const card = run.deck.createCard('north');
    const target = { col: run.player.col, row: run.player.row - 1 };

    run.status = 'playing';
    run.player.scrap = 3;
    run.movePlayer(target, card);
    run.resolveLandingTile();

    const tile = ns.getTile(run.world, target.col, target.row);
    const drawPileBefore = run.deck.drawPile.length;
    expect(run.pendingActions.map(action => action.id)).toEqual(['basic-draw']);
    expect(run.applyAction('basic-draw')).toBe(true);
    expect(run.player.scrap).toBe(0);
    expect(tile.basicDrawUsed).toBe(true);
    expect(run.pendingActions).toEqual([]);
    expect(run.deck.drawPile.length).toBe(drawPileBefore - 1);
    expect(run.getTileActions(tile)).toEqual([]);
  });

  test('basic draw action is blocked when the player has less than 3 scrap', () => {
    const ns = loadNeverSouthRuntime();
    const run = new ns.NeverSouthRun('basic-draw-cost-test');
    const card = run.deck.createCard('north');
    const target = { col: run.player.col, row: run.player.row - 1 };

    run.status = 'playing';
    run.player.scrap = 2;
    run.movePlayer(target, card);
    run.resolveLandingTile();

    expect(run.applyAction('basic-draw')).toBe(false);
    expect(run.player.scrap).toBe(2);
    expect(run.pendingActions.map(action => action.id)).toEqual(['basic-draw']);
  });

  test('closing pending tile actions dismisses the popup state and advances the turn', () => {
    const ns = loadNeverSouthRuntime();
    const run = new ns.NeverSouthRun('close-actions-test');
    const card = run.deck.createCard('north');
    const target = { col: run.player.col, row: run.player.row - 1 };

    run.status = 'playing';
    run.player.scrap = 3;
    run.movePlayer(target, card);
    run.resolveLandingTile();

    expect(run.pendingActions.map(action => action.id)).toEqual(['basic-draw']);
    expect(run.closePendingActions()).toBe(true);
    expect(run.pendingActions).toEqual([]);
  });

  test('visual shell keeps canvas pixel art responsive without external assets', () => {
    const css = readGameFile('css/style.css');
    const render = readGameFile('js/render.js');
    const world = readGameFile('js/world.js');

    expect(css).toContain('image-rendering: pixelated');
    expect(css).toContain('width: 100vw');
    expect(css).toContain('height: 100vh');
    expect(css).not.toContain('min(100vw, 1280px)');
    expect(render).toContain('calculateLayout');
    expect(render).toContain('drawBottomPanel');
    expect(render).toContain('drawLeftPanel');
    expect(render).toContain('drawHandPanel');
    expect(render).toContain('drawRunLogPanel');
    expect(render).toContain('fillRect');
    expect(render).toContain('strokeRect');
    expect(render).toContain('worldToScreen');
    expect(render).toContain('getWorldCamera');
    expect(render).toContain('createLinearGradient');
    expect(render).toContain('drawUnexploredTile');
    expect(render).toContain('drawSquareTileBase');
    expect(world).toContain('tilesByKey');
    expect(world).toContain('legacyGenerateTile');
    expect(world).toContain('canEnterTile');
    expect(world).toContain('applyLandingTile');
    expect(render).not.toContain('drawBorderTile');
    expect(render).not.toContain('run.world.cols');
    expect(render).not.toContain('run.world.rows');
    expect(render).not.toContain('new Image');
    expect(render).not.toContain('drawSidePanel');
    expect(render).not.toContain('drawActions(ctx');
    expect(render).not.toContain('R.actionX');
    expect(render).not.toContain('R.gridX');
  });

  test('uses radius-six reveal around the player', () => {
    const ns = loadNeverSouthRuntime();
    const run = new ns.NeverSouthRun('visibility-test');

    expect(ns.CONFIG.render.visibilityRadius).toBe(6);
    expect(ns.getTile(run.world, run.player.col, run.player.row - 6).revealed).toBe(true);
    expect(ns.getTile(run.world, run.player.col, run.player.row - 7).revealed).toBe(false);

    run.player.col = -40;
    run.player.row = -80;
    run.revealAround(run.player.col, run.player.row, ns.CONFIG.render.visibilityRadius);
    expect(ns.getTile(run.world, run.player.col, run.player.row - 6).revealed).toBe(true);
    expect(ns.getTile(run.world, run.player.col, run.player.row - 7).revealed).toBe(false);
  });

  test('renderer keeps world, cards, popup actions, and log inside intended regions', () => {
    const ns = loadNeverSouthWithRenderer();
    const run = new ns.NeverSouthRun('layout-test');
    const renderer = new ns.NeverSouthRenderer(createFakeCanvas());
    renderer.resize(1200, 760, 1);
    const layout = renderer.calculateLayout(1200, 760);

    expect(layout.worldBottom).toBe(layout.bottomPanelTop);
    expect(layout.world.y + layout.world.h).toBeLessThanOrEqual(layout.bottom.y);
    expect(layout.centerPanel.w).toBeGreaterThan(layout.leftPanel.w);

    run.status = 'playing';
    run.pendingActions = [
      { id: "buy-card", label: "Buy Card", detail: "Spend 2 Scrap for a new movement card." },
      { id: "repair", label: "Repair", detail: "Spend 1 Scrap to heal 6." }
    ];
    renderer.render(run, 0);

    const areas = renderer.getHitAreas();
    areas.filter(area => area.type === 'card').forEach(area => {
      expect(area.x).toBeGreaterThanOrEqual(layout.centerPanel.x);
      expect(area.y).toBeGreaterThanOrEqual(layout.centerPanel.y);
      expect(area.x + area.w).toBeLessThanOrEqual(layout.centerPanel.x + layout.centerPanel.w);
      expect(area.y + area.h).toBeLessThanOrEqual(layout.centerPanel.y + layout.centerPanel.h);
    });
    areas.filter(area => area.type === 'action').forEach(area => {
      expect(area.x).toBeGreaterThan(layout.world.x);
      expect(area.y).toBeGreaterThan(layout.world.y);
      expect(area.x + area.w).toBeLessThan(layout.world.x + layout.world.w + layout.rightPanel.w);
      expect(area.y + area.h).toBeLessThan(layout.bottom.y + layout.bottom.h);
    });
    const closeButtons = areas.filter(area => area.type === 'action-close');
    expect(closeButtons).toHaveLength(1);
    expect(renderer.lastRunLogArea.x).toBeGreaterThanOrEqual(layout.rightPanel.x);
    expect(renderer.lastRunLogArea.y).toBeGreaterThanOrEqual(layout.rightPanel.y);
    expect(renderer.lastRunLogArea.x + renderer.lastRunLogArea.w).toBeLessThanOrEqual(layout.rightPanel.x + layout.rightPanel.w);
    expect(renderer.lastRunLogArea.y + renderer.lastRunLogArea.h).toBeLessThanOrEqual(layout.rightPanel.y + layout.rightPanel.h);
  });

  test('hand panel shrinks cards to keep large hands fully inside one row', () => {
    const ns = loadNeverSouthWithRenderer();
    const run = new ns.NeverSouthRun('large-hand-test');
    const renderer = new ns.NeverSouthRenderer(createFakeCanvas(720, 560));
    renderer.resize(720, 560, 1);

    run.deck.hand = [
      run.deck.createCard('north'),
      run.deck.createCard('west'),
      run.deck.createCard('east'),
      run.deck.createCard('northwest'),
      run.deck.createCard('northeast'),
      run.deck.createCard('long-north'),
      run.deck.createCard('rubble-ram')
    ];

    renderer.render(run, 0);
    const layout = renderer.layout;
    const cards = renderer.getHitAreas().filter(area => area.type === 'card');

    expect(cards).toHaveLength(run.deck.hand.length);
    expect(cards[0].x).toBeCloseTo(layout.centerPanel.x + layout.padding);
    expect(cards[cards.length - 1].x + cards[cards.length - 1].w).toBeCloseTo(layout.centerPanel.x + layout.centerPanel.w - layout.padding);
    cards.forEach(area => {
      expect(Number.isFinite(area.x)).toBe(true);
      expect(Number.isFinite(area.y)).toBe(true);
      expect(area.x).toBeGreaterThanOrEqual(layout.centerPanel.x);
      expect(area.y).toBeGreaterThanOrEqual(layout.centerPanel.y);
      expect(area.x + area.w).toBeLessThanOrEqual(layout.centerPanel.x + layout.centerPanel.w);
      expect(area.y + area.h).toBeLessThanOrEqual(layout.centerPanel.y + layout.centerPanel.h);
    });

    for (let i = 1; i < cards.length; i++) {
      expect(cards[i].y).toBe(cards[0].y);
      expect(cards[i].x).toBeGreaterThan(cards[i - 1].x);
    }
  });

  test('world projection anchors the player below center while keeping cardinal movement straight', () => {
    const ns = loadNeverSouthWithRenderer();
    const run = new ns.NeverSouthRun('camera-anchor-test');
    const renderer = new ns.NeverSouthRenderer(createFakeCanvas(1200, 760));
    renderer.resize(1200, 760, 1);

    let camera = renderer.getWorldCamera(run);
    let playerScreen = renderer.worldToScreen(run.player.col, run.player.row, camera);
    expect(playerScreen.x).toBeCloseTo(renderer.layout.world.x + renderer.layout.world.w / 2);
    expect(playerScreen.y).toBeCloseTo(renderer.layout.world.y + renderer.layout.world.h * 0.58);

    run.player.col = 1;
    run.player.row = 8;
    camera = renderer.getWorldCamera(run);
    playerScreen = renderer.worldToScreen(run.player.col, run.player.row, camera);
    expect(playerScreen.x).toBeCloseTo(renderer.layout.world.x + renderer.layout.world.w / 2);
    expect(playerScreen.y).toBeCloseTo(renderer.layout.world.y + renderer.layout.world.h * 0.58);

    const northTile = renderer.worldToScreen(run.player.col, run.player.row - 1, camera);
    const westTile = renderer.worldToScreen(run.player.col - 1, run.player.row, camera);
    const eastTile = renderer.worldToScreen(run.player.col + 1, run.player.row, camera);
    expect(northTile.y).toBeLessThan(playerScreen.y);
    expect(northTile.x).toBeCloseTo(playerScreen.x);
    expect(westTile.x).toBeLessThan(playerScreen.x);
    expect(westTile.y).toBeCloseTo(playerScreen.y);
    expect(eastTile.x).toBeGreaterThan(playerScreen.x);
    expect(eastTile.y).toBeCloseTo(playerScreen.y);
  });

  test('world renderer uses square tiles and never clamps to a map border', () => {
    const ns = loadNeverSouthWithRenderer();
    const run = new ns.NeverSouthRun('square-tile-test');
    const renderer = new ns.NeverSouthRenderer(createFakeCanvas(1000, 700));
    renderer.resize(1000, 700, 1);

    const camera = renderer.getWorldCamera(run);
    const geometry = renderer.getTileGeometry(run.player.col, run.player.row, camera);
    expect(geometry.bounds.w).toBeCloseTo(geometry.bounds.h);
    expect(geometry.topLeft.x).toBeCloseTo(geometry.bottomLeft.x);
    expect(geometry.topRight.x).toBeCloseTo(geometry.bottomRight.x);
    expect(geometry.topLeft.y).toBeCloseTo(geometry.topRight.y);
    expect(geometry.bottomLeft.y).toBeCloseTo(geometry.bottomRight.y);

    run.player.col = 0;
    run.player.row = ns.CONFIG.grid.startRow;
    const edgeRange = renderer.getVisibleWorldRange(run, renderer.getWorldCamera(run));
    expect(edgeRange.startCol).toBeLessThan(-1);
    expect(edgeRange.endCol).toBeGreaterThanOrEqual(ns.CONFIG.grid.cols);

    run.player.row = 0;
    const northRange = renderer.getVisibleWorldRange(run, renderer.getWorldCamera(run));
    expect(northRange.startRow).toBeLessThan(-1);
  });

  test('projected target hit areas remain finite and near the world viewport', () => {
    const ns = loadNeverSouthWithRenderer();
    const run = new ns.NeverSouthRun('target-hit-test');
    const renderer = new ns.NeverSouthRenderer(createFakeCanvas(1000, 700));
    renderer.resize(1000, 700, 1);

    run.deck.hand = [run.deck.createCard('north')];
    run.selectedCardIndex = 0;
    ns.setTile(run.world, run.player.col, run.player.row - 1, ns.makeTile(ns.TILE_TYPES.SAFE, { revealed: true }));

    renderer.render(run, 0);
    const layout = renderer.layout;
    const targets = renderer.getHitAreas().filter(area => area.type === 'target');

    expect(targets.length).toBeGreaterThan(0);
    targets.forEach(area => {
      expect(Number.isFinite(area.x)).toBe(true);
      expect(Number.isFinite(area.y)).toBe(true);
      expect(Number.isFinite(area.w)).toBe(true);
      expect(Number.isFinite(area.h)).toBe(true);
      expect(area.w).toBeGreaterThan(0);
      expect(area.h).toBeGreaterThan(0);
      expect(area.x + area.w).toBeGreaterThanOrEqual(layout.world.x - renderer.layout.tileSize * 2);
      expect(area.x).toBeLessThanOrEqual(layout.world.x + layout.world.w + renderer.layout.tileSize * 2);
      expect(area.y + area.h).toBeGreaterThanOrEqual(layout.world.y - renderer.layout.tileSize * 2);
      expect(area.y).toBeLessThanOrEqual(layout.world.y + layout.world.h + renderer.layout.tileSize * 2);
    });
  });
});
