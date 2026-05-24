const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { createBrowserContext, loadBrowserScript } = require('../helpers/browserScriptHarness');

function loadGloomvault(relativePath, exportNames, context = createBrowserContext()) {
  if (relativePath === 'core/GameEngine.js' && !context.FloorOrchestrator) {
    loadBrowserScript(context, 'games/gloomvault-extraction/js/systems/FloorOrchestrator.js', ['FloorOrchestrator']);
  }
  return loadBrowserScript(context, `games/gloomvault-extraction/js/${relativePath}`, exportNames);
}

function readPngDimensionsAndVisiblePixels(filePath) {
  const data = fs.readFileSync(filePath);
  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  const bitDepth = data[24];
  const colorType = data[25];
  const idatChunks = [];

  let offset = 8;
  while (offset < data.length) {
    const length = data.readUInt32BE(offset);
    const type = data.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') idatChunks.push(data.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
  }

  if (bitDepth !== 8 || colorType !== 6) return { width, height, visiblePixels: null };

  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  let srcOffset = 0;
  let visiblePixels = 0;
  let transparentPixels = 0;
  let opaquePixels = 0;
  let previous = Buffer.alloc(stride);

  for (let y = 0; y < height; y++) {
    const filter = inflated[srcOffset++];
    const row = Buffer.from(inflated.subarray(srcOffset, srcOffset + stride));
    srcOffset += stride;

    for (let x = 0; x < stride; x++) {
      const left = x >= bytesPerPixel ? row[x - bytesPerPixel] : 0;
      const up = previous[x] || 0;
      const upLeft = x >= bytesPerPixel ? previous[x - bytesPerPixel] : 0;
      if (filter === 1) row[x] = (row[x] + left) & 255;
      else if (filter === 2) row[x] = (row[x] + up) & 255;
      else if (filter === 3) row[x] = (row[x] + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        row[x] = (row[x] + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft)) & 255;
      }
    }

    for (let x = 3; x < stride; x += bytesPerPixel) {
      if (row[x] > 0) visiblePixels++;
      if (row[x] === 0) transparentPixels++;
      if (row[x] === 255) opaquePixels++;
    }
    previous = row;
  }

  return { width, height, visiblePixels, transparentPixels, opaquePixels };
}

// Behaviour under test: Pathfinder returns tile-centred paths and rejects invalid or blocked targets.
describe('Gloomvault Pathfinder', () => {
  test('finds a route around walls', () => {
    const context = createBrowserContext();
    const { Pathfinder } = loadGloomvault('systems/Pathfinder.js', ['Pathfinder'], context);
    const mapGen = {
      tileSize: 10,
      cols: 5,
      rows: 5,
      grid: [
        1, 1, 1, 1, 1,
        1, 0, 0, 0, 1,
        1, 1, 1, 0, 1,
        1, 0, 1, 1, 1,
        1, 1, 1, 1, 1
      ],
      getTile(x, y) { return this.grid[y * this.cols + x]; }
    };

    const path = new Pathfinder().findPath(5, 5, 45, 45, mapGen);

    expect([path[0], path[path.length - 1], path.length > 1]).toEqual([{ x: 5, y: 5 }, { x: 45, y: 45 }, true]);
  });

  test('returns no path for missing maps, walls, out of bounds, and unreachable targets', () => {
    const context = createBrowserContext();
    const { Pathfinder } = loadGloomvault('systems/Pathfinder.js', ['Pathfinder'], context);
    const blockedMap = { tileSize: 10, cols: 2, rows: 2, getTile: () => 0 };
    const openMap = { tileSize: 10, cols: 2, rows: 2, getTile: (x, y) => (x === 1 && y === 1 ? 1 : 0) };

    expect([
      new Pathfinder().findPath(0, 0, 10, 10, null),
      new Pathfinder().findPath(0, 0, 10, 10, blockedMap),
      new Pathfinder().findPath(0, 0, 50, 50, openMap)
    ]).toEqual([[], [], []]);
  });
});

// Behaviour under test: GameEngine owns loop scheduling, debug HUD visibility, and dev god-mode status damage.
describe('Gloomvault GameEngine loop and debug safeguards', () => {
  test('double start does not regenerate floors or schedule duplicate frame loops', () => {
    const requestAnimationFrame = jest.fn(() => 101);
    const context = createBrowserContext({
      requestAnimationFrame,
      cancelAnimationFrame: jest.fn(),
      performance: { now: jest.fn(() => 500) }
    });
    const { GameEngine } = loadGloomvault('core/GameEngine.js', ['GameEngine'], context);
    const engine = Object.assign(Object.create(GameEngine.prototype), {
      state: 'MENU',
      player: null,
      isRunning: false,
      _animationFrameId: null,
      lastTime: 0,
      canvas: {},
      input: { attach: jest.fn() },
      resizeCanvas: jest.fn(),
      generateFloor: jest.fn(function() { this.player = { x: 10, y: 20 }; }),
      combatFeedback: { addText: jest.fn() },
      currentFloor: 1
    });

    engine.start();
    engine.start();

    expect([
      engine.generateFloor.mock.calls.length,
      requestAnimationFrame.mock.calls.length,
      engine.input.attach.mock.calls.length,
      engine.state,
      engine.isRunning
    ]).toEqual([1, 1, 1, 'PLAYING', true]);
  });

  test('start delegates first floor creation through the floor orchestrator service', () => {
    const requestAnimationFrame = jest.fn(() => 303);
    const context = createBrowserContext({
      requestAnimationFrame,
      cancelAnimationFrame: jest.fn(),
      performance: { now: jest.fn(() => 250) }
    });
    const { GameEngine } = loadGloomvault('core/GameEngine.js', ['GameEngine'], context);
    const floorOrchestrator = {
      generateFloor: jest.fn(engine => {
        engine.player = { x: 20, y: 30 };
        engine.combatFeedback = { addText: jest.fn() };
      })
    };
    const engine = Object.assign(Object.create(GameEngine.prototype), {
      state: 'MENU',
      player: null,
      isRunning: false,
      _animationFrameId: null,
      lastTime: 0,
      canvas: {},
      currentFloor: 1,
      floorOrchestrator,
      input: { attach: jest.fn() },
      resizeCanvas: jest.fn()
    });

    engine.start();
    engine.start();

    expect([
      floorOrchestrator.generateFloor.mock.calls.length,
      floorOrchestrator.generateFloor.mock.calls[0][1],
      requestAnimationFrame.mock.calls.length,
      engine.state
    ]).toEqual([1, false, 1, 'PLAYING']);
  });

  test('generateFloor has a single orchestrator path', () => {
    const context = createBrowserContext();
    const { GameEngine } = loadGloomvault('core/GameEngine.js', ['GameEngine'], context);
    const floorOrchestrator = { generateFloor: jest.fn(() => ({ generated: true })) };
    const engine = Object.assign(Object.create(GameEngine.prototype), { floorOrchestrator });

    const result = engine.generateFloor(true);

    expect([
      result,
      floorOrchestrator.generateFloor.mock.calls.length,
      floorOrchestrator.generateFloor.mock.calls[0][0],
      floorOrchestrator.generateFloor.mock.calls[0][1]
    ]).toEqual([{ generated: true }, 1, engine, true]);
  });

  test('pauseLoop and resumeLoop are idempotent around overlay open and close', () => {
    const requestAnimationFrame = jest.fn(() => 202);
    const cancelAnimationFrame = jest.fn();
    const context = createBrowserContext({
      requestAnimationFrame,
      cancelAnimationFrame,
      performance: { now: jest.fn(() => 1000) }
    });
    const { GameEngine } = loadGloomvault('core/GameEngine.js', ['GameEngine'], context);
    const engine = Object.assign(Object.create(GameEngine.prototype), {
      state: 'PLAYING',
      isRunning: false,
      _animationFrameId: null,
      lastTime: 0
    });

    engine.resumeLoop();
    engine.resumeLoop();
    engine.pauseLoop();
    engine.pauseLoop();
    engine.resumeLoop();

    expect([
      requestAnimationFrame.mock.calls.length,
      cancelAnimationFrame.mock.calls.map(call => call[0]),
      engine.isRunning,
      engine._animationFrameId
    ]).toEqual([2, [202], true, 202]);
  });

  test('debug FPS and player-position HUD renders only while the dev panel is visible', () => {
    const context = createBrowserContext({
      DevConfig: { DEV_MODE_ENABLED: true }
    });
    const { GameEngine } = loadGloomvault('core/GameEngine.js', ['GameEngine'], context);
    const fillText = jest.fn();
    const engine = Object.assign(Object.create(GameEngine.prototype), {
      state: 'PLAYING',
      tileSize: 64,
      renderer: { clear: jest.fn(), drawRect: jest.fn(), renderMinimap: jest.fn() },
      ctx: { save: jest.fn(), restore: jest.fn(), fillText, fillStyle: '', font: '' },
      camera: { x: 0, y: 0, width: 0, height: 0, applyTransform: jest.fn() },
      mapGen: { getTile: jest.fn(() => 1), bossRoom: null },
      player: { x: 12.5, y: 34.5, render: jest.fn() },
      portal: null,
      floorTransitions: [],
      bossRoomButtons: [],
      enemies: [],
      projectiles: [],
      lootChests: [],
      dungeonServices: [],
      droppedItems: [],
      particleSystem: { render: jest.fn() },
      combatFeedback: { render: jest.fn() },
      showMinimap: false,
      devPanel: { visible: false },
      updateMinimapInfoUI: jest.fn()
    });

    engine.render(0);
    engine.devPanel.visible = true;
    engine.render(0);

    expect(fillText.mock.calls).toEqual([
      ['FPS: 0', 10, 20],
      ['Player: (12, 34)', 10, 40]
    ]);
  });

  test('world render delegates map layers before player and entity layers', () => {
    const context = createBrowserContext();
    const { GameEngine } = loadGloomvault('core/GameEngine.js', ['GameEngine'], context);
    const operations = [];
    const engine = Object.assign(Object.create(GameEngine.prototype), {
      state: 'PLAYING',
      tileSize: 64,
      renderer: {
        clear: jest.fn(() => operations.push('clear')),
        drawMapTiles: jest.fn(() => operations.push('map')),
        renderMinimap: jest.fn(),
        camera: { worldToScreen: () => ({ x: 0, y: 0 }) }
      },
      ctx: {
        save: jest.fn(() => operations.push('save')),
        restore: jest.fn(() => operations.push('restore')),
        fillText: jest.fn(),
        fillRect: jest.fn(),
        strokeRect: jest.fn(),
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        font: ''
      },
      camera: { x: 0, y: 0, width: 128, height: 128, applyTransform: jest.fn(() => operations.push('transform')) },
      mapGen: { getTile: jest.fn(() => 1), bossRoom: null },
      player: { x: 12.5, y: 34.5, render: jest.fn(() => operations.push('player')) },
      portal: { render: jest.fn(() => operations.push('portal')) },
      floorTransitions: [{ render: jest.fn(() => operations.push('transition')) }],
      bossRoomButtons: [{ render: jest.fn(() => operations.push('bossButton')) }],
      enemies: [{ render: jest.fn(() => operations.push('enemy')) }],
      projectiles: [{ render: jest.fn(() => operations.push('projectile')) }],
      lootChests: [{ render: jest.fn(() => operations.push('chest')) }],
      dungeonServices: [{ render: jest.fn(() => operations.push('service')) }],
      droppedItems: [{ render: jest.fn(() => operations.push('drop')) }],
      particleSystem: { render: jest.fn(() => operations.push('particles')) },
      combatFeedback: { render: jest.fn(() => operations.push('feedback')) },
      showMinimap: false,
      devPanel: { visible: false },
      updateMinimapInfoUI: jest.fn(),
      renderBossRoomEntrance: jest.fn(() => operations.push('bossEntrance'))
    });

    engine.render(0);

    expect(operations.indexOf('map')).toBeLessThan(operations.indexOf('player'));
    ['service', 'portal', 'transition', 'bossEntrance', 'bossButton', 'chest', 'drop'].forEach(objectLayer => {
      expect(operations.indexOf(objectLayer)).toBeLessThan(operations.indexOf('player'));
      expect(operations.indexOf(objectLayer)).toBeLessThan(operations.indexOf('enemy'));
    });
    expect(operations.indexOf('player')).toBeLessThan(operations.indexOf('enemy'));
    expect(operations.indexOf('enemy')).toBeLessThan(operations.indexOf('projectile'));
  });

  test('player ranged projectile scratch list is reused and excludes non-dodge threats', () => {
    const context = createBrowserContext();
    const { GameEngine } = loadGloomvault('core/GameEngine.js', ['GameEngine'], context);
    const playerShot = { isPlayerOwned: true, isMelee: false, markedForDeletion: false };
    const engine = Object.assign(Object.create(GameEngine.prototype), {
      _playerRangedProjectiles: [],
      projectiles: [
        playerShot,
        { isPlayerOwned: true, isMelee: true },
        { isPlayerOwned: false, isMelee: false },
        { isPlayerOwned: true, isMelee: false, markedForDeletion: true }
      ]
    });

    const first = engine.getPlayerRangedProjectiles();
    engine.projectiles = [playerShot];
    const second = engine.getPlayerRangedProjectiles();

    expect([first === second, second]).toEqual([true, [playerShot]]);
  });

  test('ProjectileCombatResolver handles player hits, pierce, lifesteal, and enemy hits', () => {
    const context = createBrowserContext({
      CombatConfig: { caps: { lifesteal: 0.35 } }
    });
    const { ProjectileCombatResolver } = loadGloomvault('systems/ProjectileCombatResolver.js', ['ProjectileCombatResolver'], context);
    const resolver = new ProjectileCombatResolver();
    const enemy = {
      x: 10,
      y: 0,
      width: 20,
      height: 20,
      hp: 40,
      takeDamage: jest.fn(amount => ({ hp: amount, shield: 0 })),
      applyKnockback: jest.fn()
    };
    const owner = {
      x: 40,
      y: 0,
      takeDamage: jest.fn()
    };
    const playerProjectile = {
      x: 10,
      y: 0,
      width: 10,
      damage: 20,
      color: '#fff',
      isPlayerOwned: true,
      isMelee: true,
      weaponType: 'melee_stab',
      pierce: true,
      hitEnemies: new Set(),
      update: jest.fn()
    };
    const enemyProjectile = {
      x: 0,
      y: 0,
      width: 10,
      damage: 12,
      isPlayerOwned: false,
      owner,
      update: jest.fn()
    };
    const engine = {
      mapGen: {},
      enemies: [enemy],
      projectiles: [playerProjectile, enemyProjectile],
      player: {
        x: 0,
        y: 0,
        width: 20,
        height: 20,
        hp: 50,
        maxHp: 60,
        stats: { lifesteal: 0.25, lifestealCapBonus: 0, thorns: 3 },
        takeDamage: jest.fn(amount => ({ hp: amount, shield: 0 }))
      },
      particleSystem: { emitImpact: jest.fn() },
      combatFeedback: { addText: jest.fn() },
      camera: { shake: jest.fn() },
      getDamageTakenMultiplier: jest.fn(() => 1),
      applyElementalHit: jest.fn(),
      handleAbilityProjectileEnd: jest.fn()
    };

    resolver.updateProjectiles(engine, 0.1);

    expect([
      engine.projectiles,
      enemy.takeDamage.mock.calls[0][0],
      playerProjectile.hitEnemies.has(enemy),
      engine.player.hp,
      enemy.applyKnockback.mock.calls.length,
      engine.player.takeDamage.mock.calls[0][0],
      owner.takeDamage.mock.calls[0][0],
      engine.handleAbilityProjectileEnd.mock.calls.length
    ]).toEqual([
      [playerProjectile],
      20,
      true,
      57,
      1,
      12,
      3,
      1
    ]);
  });

  test('god mode blocks player status-effect HP loss while enemies still take it', () => {
    const context = createBrowserContext({
      DevConfig: { godMode: true }
    });
    const { GameEngine } = loadGloomvault('core/GameEngine.js', ['GameEngine'], context);
    const engine = Object.assign(Object.create(GameEngine.prototype), {
      combatFeedback: { addText: jest.fn() }
    });
    engine.player = {
      x: 0,
      y: 0,
      hp: 10,
      statusEffects: [{ type: 'fire', durationLeft: 1, damagePerSecond: 10, stacks: 1, color: '#f00' }]
    };
    const enemy = {
      x: 0,
      y: 0,
      hp: 10,
      statusEffects: [{ type: 'fire', durationLeft: 1, damagePerSecond: 10, stacks: 1, color: '#f00' }]
    };

    engine.processStatusEffects(engine.player, 0.5);
    engine.processStatusEffects(enemy, 0.5);

    expect([engine.player.hp, enemy.hp]).toEqual([10, 5]);
  });
});

describe('Gloomvault AssetManager and asset-ready rendering', () => {
  function createImageMock(failingPathPart = 'missing') {
    return class MockImage {
      constructor() {
        this.onload = null;
        this.onerror = null;
        this.complete = false;
        this.naturalWidth = 0;
      }

      set src(value) {
        this._src = value;
        if (value.includes(failingPathPart)) {
          this.complete = true;
          this.naturalWidth = 0;
          if (this.onerror) this.onerror(new Error('missing'));
        } else {
          this.complete = true;
          this.naturalWidth = 64;
          if (this.onload) this.onload();
        }
      }

      get src() {
        return this._src;
      }
    };
  }

  test('asset loading records successful and missing image fallbacks', async () => {
    const context = createBrowserContext({ Image: createImageMock() });
    const { AssetManager } = loadGloomvault('systems/AssetManager.js', ['AssetManager'], context);
    const manager = new AssetManager({
      basePath: 'assets',
      sprites: { player: 'sprites/player.png', missing: 'sprites/missing.png' },
      tiles: {},
      lootIcons: []
    });

    await manager.loadAll();

    expect([
      manager.hasImage('sprites.player'),
      manager.hasImage('sprites.missing'),
      manager.getRecord('sprites.missing').failed
    ]).toEqual([true, false, true]);
  });

  test('loot icon keys are deterministic and map into type-specific pools', () => {
    const context = createBrowserContext();
    const { AssetManager } = loadGloomvault('systems/AssetManager.js', ['AssetManager'], context);
    const manager = new AssetManager({
      basePath: 'assets',
      sprites: {},
      tiles: {},
      lootIcons: {
        helm: ['helm-1.png', 'helm-2.png'],
        chest: ['chest-1.png', 'chest-2.png'],
        pants: ['pants-1.png', 'pants-2.png'],
        boots: ['boots-1.png', 'boots-2.png'],
        wand: ['wand-1.png', 'wand-2.png'],
        staff: ['staff-1.png', 'staff-2.png'],
        trinket: ['trinket-1.png', 'trinket-2.png', 'trinket-3.png']
      }
    });
    const helm = { id: 'helm-1', name: 'Vault Hood', type: 'helm', rarity: 'Common' };
    const chest = { id: 'chest-1', name: 'Vault Plate', type: 'chest', rarity: 'Common' };
    const pants = { id: 'pants-1', name: 'Vault Legguards', type: 'pants', rarity: 'Common' };
    const boots = { id: 'boots-1', name: 'Vault Boots', type: 'boots', rarity: 'Common' };
    const wand = { id: 'weapon-1', name: 'Fire Wand', type: 'weapon', weaponType: 'pistol', rarity: 'Epic' };
    const staff = { id: 'weapon-2', name: 'Frost Staff', type: 'weapon', weaponType: 'shotgun', rarity: 'Epic' };
    const trinket = { id: 'trinket-1', name: 'Scout Charm', type: 'trinket', rarity: 'Rare' };

    expect([
      manager.getLootIconKey(helm).startsWith('loot.helm.'),
      manager.getLootIconKey(chest).startsWith('loot.chest.'),
      manager.getLootIconKey(pants).startsWith('loot.pants.'),
      manager.getLootIconKey(boots).startsWith('loot.boots.'),
      manager.getLootIconKey(wand).startsWith('loot.wand.'),
      manager.getLootIconKey(staff).startsWith('loot.staff.'),
      manager.getLootIconKey(trinket).startsWith('loot.trinket.'),
      manager.getLootIconKey(wand),
      manager.getLootIconKey({ ...wand })
    ]).toEqual([true, true, true, true, true, true, true, manager.getLootIconKey({ ...wand }), manager.getLootIconKey(wand)]);
  });

  test('generated armor icon files exist for each armor slot and set variant', () => {
    const root = path.resolve(__dirname, '..', '..');
    const iconDir = path.join(root, 'games', 'gloomvault-extraction', 'assets', 'icons', 'loot');
    const slots = ['helm', 'chest', 'pants', 'boots'];
    const missing = [];
    const invalid = [];

    for (const slot of slots) {
      for (let variant = 1; variant <= 4; variant++) {
        const fileName = `${slot}-${variant}.png`;
        const filePath = path.join(iconDir, fileName);
        if (!fs.existsSync(filePath)) {
          missing.push(fileName);
          continue;
        }
        const metadata = readPngDimensionsAndVisiblePixels(filePath);
        if (metadata.width !== 256 || metadata.height !== 256 || !metadata.visiblePixels) {
          invalid.push({ fileName, ...metadata });
        }
      }
    }

    expect([missing, invalid]).toEqual([[], []]);
  });

  test('weapon icon pools use fallback aliases and missing pools fall back cleanly', () => {
    const context = createBrowserContext();
    const { AssetManager } = loadGloomvault('systems/AssetManager.js', ['AssetManager'], context);
    const manager = new AssetManager({
      basePath: 'assets',
      sprites: {},
      tiles: {},
      lootIcons: {
        crossbow: ['crossbow-1.png'],
        shortsword: ['shortsword-1.png'],
        axe: ['axe-1.png']
      }
    });

    expect([
      manager.getLootIconKey({ type: 'weapon', weaponType: 'melee_stab', name: 'Shadow Lance' }),
      manager.getLootIconKey({ type: 'weapon', weaponType: 'melee_stab', name: 'Iron Shortsword' }),
      manager.getLootIconKey({ type: 'weapon', weaponType: 'melee_cleave', name: 'Vault Scythe' }),
      manager.getLootIconKey({ type: 'weapon', weaponType: 'melee_cleave', name: 'Vault Greataxe' }),
      manager.getLootIconKey({ type: 'weapon', weaponType: 'sniper', name: 'Runic Longbow' }),
      manager.getLootIconKey({ type: 'weapon', weaponType: 'pistol', name: 'Missing Wand Pool' })
    ]).toEqual(['loot.shortsword.1', 'loot.shortsword.1', 'loot.axe.1', 'loot.axe.1', 'loot.crossbow.1', null]);
  });

  test('dropped items draw loot icons above the rarity diamond when available', () => {
    const context = createBrowserContext({
      AssetManifest: { worldDrops: { useLootIcons: true } }
    });
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const { DroppedItem } = loadGloomvault('entities/DroppedItem.js', ['DroppedItem'], context);
    const icon = { src: 'assets/icons/loot/wand-1.png' };
    const item = new DroppedItem(40, 60, { type: 'weapon', weaponType: 'pistol', color: '#ff8000' });
    const ctx = {
      shadowBlur: 0,
      shadowColor: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      fill: jest.fn(),
      save: jest.fn(),
      drawImage: jest.fn(),
      restore: jest.fn(),
      stroke: jest.fn()
    };
    const renderer = {
      camera: { worldToScreen: jest.fn(() => ({ x: 100, y: 120 })) },
      assetManager: { getLootIcon: jest.fn(() => icon) }
    };

    item.render(ctx, renderer);

    expect([
      renderer.assetManager.getLootIcon.mock.calls[0][0],
      ctx.drawImage.mock.calls[0],
      ctx.fill.mock.calls.length,
      ctx.stroke.mock.calls.length,
      ctx.stroke.mock.invocationCallOrder[0] < ctx.drawImage.mock.invocationCallOrder[0]
    ]).toEqual([item.itemData, [icon, 87, 107, 26, 26], 1, 1, true]);
  });

  test('dropped items keep floor loot icons disabled by config default', () => {
    const context = createBrowserContext({
      AssetManifest: { worldDrops: { useLootIcons: false } }
    });
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const { DroppedItem } = loadGloomvault('entities/DroppedItem.js', ['DroppedItem'], context);
    const item = new DroppedItem(40, 60, { type: 'weapon', weaponType: 'pistol', color: '#ff8000' });
    const ctx = {
      shadowBlur: 0,
      shadowColor: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      fill: jest.fn(),
      save: jest.fn(),
      drawImage: jest.fn(),
      restore: jest.fn(),
      stroke: jest.fn()
    };
    const renderer = {
      camera: { worldToScreen: jest.fn(() => ({ x: 100, y: 120 })) },
      assetManager: { getLootIcon: jest.fn(() => ({ src: 'assets/icons/loot/wand-1.png' })) }
    };

    item.render(ctx, renderer);

    expect([renderer.assetManager.getLootIcon.mock.calls.length, ctx.drawImage.mock.calls.length, ctx.fill.mock.calls.length, ctx.stroke.mock.calls.length])
      .toEqual([0, 0, 1, 1]);
  });

  test('dropped items keep the diamond fallback when loot icons are missing', () => {
    const context = createBrowserContext({
      AssetManifest: { worldDrops: { useLootIcons: true } }
    });
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const { DroppedItem } = loadGloomvault('entities/DroppedItem.js', ['DroppedItem'], context);
    const item = new DroppedItem(40, 60, { type: 'weapon', weaponType: 'pistol', color: '#ff8000' });
    const ctx = {
      shadowBlur: 0,
      shadowColor: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      fill: jest.fn(),
      save: jest.fn(),
      drawImage: jest.fn(),
      restore: jest.fn(),
      stroke: jest.fn()
    };
    const renderer = {
      camera: { worldToScreen: jest.fn(() => ({ x: 100, y: 120 })) },
      assetManager: { getLootIcon: jest.fn(() => null) }
    };

    item.render(ctx, renderer);

    expect([ctx.drawImage.mock.calls.length, ctx.fill.mock.calls.length, ctx.stroke.mock.calls.length])
      .toEqual([0, 1, 1]);
  });

  test('action bar item icons use images when loaded and text fallback when missing', () => {
    const icon = { src: 'assets/icons/loot/crossbow-1.png' };
    const context = createBrowserContext();
    context.window.gloomvaultAssets = { getLootIcon: jest.fn(item => item ? icon : null) };
    const { GameEngine } = loadGloomvault('core/GameEngine.js', ['GameEngine'], context);
    const engine = Object.assign(Object.create(GameEngine.prototype), { _hudState: {} });
    const imageElement = { style: {}, textContent: 'OLD' };
    const fallbackElement = { style: {}, textContent: 'OLD' };

    engine.setHudItemIcon('weapon1', imageElement, { type: 'weapon', weaponType: 'assault_rifle' }, 'Fir', '#ff3300');
    engine.setHudItemIcon('weapon2', fallbackElement, null, 'SEC', '#555');

    expect([
      imageElement.style.backgroundImage,
      imageElement.style.backgroundSize,
      imageElement.style.backgroundColor,
      imageElement.textContent,
      fallbackElement.style.backgroundImage,
      fallbackElement.style.backgroundColor,
      fallbackElement.textContent
    ]).toEqual([
      'url("assets/icons/loot/crossbow-1.png")',
      '100% 100%',
      'transparent',
      'Fir',
      'none',
      '#555',
      'SEC'
    ]);
  });

  test('healing well passive buff HUD shows stacks and hides when inactive', () => {
    document.body.innerHTML = `
      <div id="passive-buff-container" class="passive-buff-container hidden">
        <div class="passive-buff-slot hidden" id="passive-buff-healing-well">
          <div class="passive-buff-icon"></div>
          <div class="passive-buff-stack"></div>
          <div class="passive-buff-time"></div>
        </div>
      </div>
    `;
    const icon = { src: 'assets/sprites/healing-well-01.png' };
    const context = createBrowserContext();
    context.window.gloomvaultAssets = { getImage: jest.fn(() => icon) };
    const { GameEngine } = loadGloomvault('core/GameEngine.js', ['GameEngine'], context);
    const engine = Object.assign(Object.create(GameEngine.prototype), {
      _hudState: {},
      _hudElements: null,
      player: {
        getHealingWellStackCount: jest.fn(() => 2),
        getHealingWellRemainingTime: jest.fn(() => 41.2)
      }
    });

    engine.updatePassiveBuffUI();
    const well = document.getElementById('passive-buff-healing-well');
    const container = document.getElementById('passive-buff-container');
    const iconEl = well.querySelector('.passive-buff-icon');
    const visibleBeforeHide = !well.classList.contains('hidden') && !container.classList.contains('hidden');
    engine.player.getHealingWellStackCount.mockReturnValue(0);
    engine.updatePassiveBuffUI();

    expect([
      visibleBeforeHide,
      well.querySelector('.passive-buff-stack').textContent,
      well.querySelector('.passive-buff-time').textContent,
      iconEl.style.backgroundImage,
      well.classList.contains('hidden'),
      container.classList.contains('hidden')
    ]).toEqual([
      true,
      'x2',
      '42s',
      'url("assets/sprites/healing-well-01.png")',
      true,
      true
    ]);
  });

  test('dev panel source includes healing well spawn button wiring', () => {
    const root = path.resolve(__dirname, '..', '..');
    const source = fs.readFileSync(path.join(root, 'games', 'gloomvault-extraction', 'js', 'systems', 'DevPanel.js'), 'utf8');

    expect([
      source.includes('id="dev-spawn-healing-well"'),
      source.includes("spawnDevDungeonService('healingWell')")
    ]).toEqual([true, true]);
  });

  test('sprite metadata resolves source rectangles and enemy-specific fallback sheets', async () => {
    const context = createBrowserContext({ Image: createImageMock('enemy-grunt') });
    const { AssetManager } = loadGloomvault('systems/AssetManager.js', ['AssetManager'], context);
    const manager = new AssetManager({
      basePath: 'assets',
      sprites: {
        player: {
          path: 'sprites/player.png',
          frameWidth: 48,
          frameHeight: 40,
          framesPerSecond: 6,
          defaultState: 'idle',
          states: {
            idle: { row: 0, frames: 5 },
            run: { row: 1, frames: 10 },
            attack: { row: 2, frames: 6 }
          }
        },
        enemy: {
          path: 'sprites/enemy.png',
          frameWidth: 64,
          frameHeight: 64,
          framesPerSecond: 8,
          defaultState: 'idle',
          states: { idle: { row: 0, frames: 8 }, run: { row: 1, frames: 8 }, attack: { row: 2, frames: 8 } }
        },
        'enemy.grunt': {
          path: 'sprites/enemy-grunt.png',
          fallbackKey: 'sprites.enemy',
          frameWidth: 32,
          frameHeight: 32,
          states: { run: { row: 1, frames: 5 } }
        }
      },
      tiles: {},
      lootIcons: {}
    });

    await manager.loadAll();
    const playerRun = manager.getSpriteFrame('sprites.player', 'run', 12);
    const enemyFallback = manager.getSpriteFrame('sprites.enemy.grunt', 'attack', 11);

    expect([
      playerRun.srcX,
      playerRun.srcY,
      playerRun.srcW,
      playerRun.srcH,
      playerRun.frameIndex,
      manager.getAnimationFrameCount('sprites.player', 'run'),
      manager.getAnimationFrameDuration('sprites.player'),
      enemyFallback.image.src,
      enemyFallback.srcX,
      enemyFallback.srcY
    ]).toEqual([96, 40, 48, 40, 2, 10, 1 / 6, 'assets/sprites/enemy.png', 192, 128]);
  });

  test('renderer draws animation frames from manifest metadata', async () => {
    const context = createBrowserContext({ Image: createImageMock() });
    const { AssetManager } = loadGloomvault('systems/AssetManager.js', ['AssetManager'], context);
    const { Renderer } = loadGloomvault('core/Renderer.js', ['Renderer'], context);
    const manager = new AssetManager({
      basePath: 'assets',
      sprites: {
        player: {
          path: 'sprites/player.png',
          frameWidth: 32,
          frameHeight: 48,
          states: { attack: { row: 2, frames: 5 } }
        }
      },
      tiles: {},
      lootIcons: {}
    });
    await manager.loadAll();
    const ctx = { drawImage: jest.fn() };
    const renderer = new Renderer({ width: 100, height: 100 }, ctx);
    renderer.setAssetManager(manager);

    const drawn = renderer.drawAnimationFrameDirect(ctx, 'sprites.player', 'attack', 7, -10, -12, 20, 24);

    expect([drawn, ...ctx.drawImage.mock.calls[0].slice(1)]).toEqual([true, 64, 96, 32, 48, -10, -12, 20, 24]);
  });

  test('boss sprite manifest entries resolve rich animation rows and guardian fallback', async () => {
    const context = createBrowserContext({ Image: createImageMock() });
    const { AssetManifest } = loadGloomvault('config/AssetManifest.js', ['AssetManifest'], context);
    const { AssetManager } = loadGloomvault('systems/AssetManager.js', ['AssetManager'], context);
    const manager = new AssetManager(AssetManifest);

    await manager.loadAll();
    const vaultAttack = manager.getSpriteFrame('sprites.enemy.boss.vaultWarden', 'attack', 6);
    const guardianRun = manager.getSpriteFrame('sprites.enemy.guardian.cryptSentinel', 'run', 7);

    expect([
      vaultAttack.srcX,
      vaultAttack.srcY,
      vaultAttack.srcW,
      vaultAttack.srcH,
      vaultAttack.frameIndex,
      guardianRun.srcX,
      guardianRun.srcY,
      guardianRun.frameIndex,
      manager.getAnimationFrameCount('sprites.enemy.boss.stormSeer', 'attack'),
      manager.getAnimationFrameCount('sprites.enemy.guardian.cryptSentinel', 'run')
    ]).toEqual([
      627 * 2,
      627 * 2,
      627,
      627,
      2,
      627 * 3,
      0,
      3,
      4,
      4
    ]);
  });

  test('manifest registers per-map terrain tiles and collision metadata', async () => {
    const context = createBrowserContext({ Image: createImageMock() });
    const { AssetManifest } = loadGloomvault('config/AssetManifest.js', ['AssetManifest'], context);
    const { AssetManager } = loadGloomvault('systems/AssetManager.js', ['AssetManager'], context);
    const manager = new AssetManager(AssetManifest);

    await manager.loadAll();
    const mapKeys = Object.keys(AssetManifest.tiles.maps);

    expect([
      mapKeys.length,
      AssetManifest.tiles.autotileMasks.length,
      manager.hasImage('tiles.maps.default.floor.base'),
      manager.hasImage('tiles.maps.fractured_rift.wall.masks.255'),
      manager.hasImage('tiles.maps.ironforged.objects.doorLocked'),
      AssetManifest.tiles.collision.floor.walkable,
      AssetManifest.tiles.collision.wall.blocksVision,
      AssetManifest.tileThemes.crypt_crossroads.name
    ]).toEqual([9, 47, true, true, true, true, true, 'Crypt Crossroads']);
  });

  test('generated map terrain PNGs have the expected dimensions and alpha shape', () => {
    const root = path.resolve(__dirname, '..', '..');
    const tileRoot = path.join(root, 'games', 'gloomvault-extraction', 'assets', 'tiles', 'maps');
    const mapKeys = ['default', 'rigid_dungeon', 'deep_caverns', 'the_labyrinth', 'arena_halls', 'crypt_crossroads', 'ironforged', 'fractured_rift', 'gauntlet_passage'];
    const masks = [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
      12, 13, 14, 15, 19, 23, 27, 31, 38, 39,
      46, 47, 55, 63, 76, 77, 78, 79, 95, 110,
      111, 127, 137, 139, 141, 143, 155, 159, 175,
      191, 205, 207, 223, 239, 255
    ];
    const invalid = [];

    for (const key of mapKeys) {
      for (const fileName of ['floor/base.png', 'floor/variant-01.png', 'floor/variant-02.png']) {
        const metadata = readPngDimensionsAndVisiblePixels(path.join(tileRoot, key, fileName));
        if (metadata.width !== 128 || metadata.height !== 128 || metadata.visiblePixels !== 128 * 128 || metadata.transparentPixels !== 0) {
          invalid.push(`${key}/${fileName}`);
        }
      }

      for (const mask of masks) {
        const metadata = readPngDimensionsAndVisiblePixels(path.join(tileRoot, key, 'wall', `mask-${String(mask).padStart(3, '0')}.png`));
        if (metadata.width !== 128 || metadata.height !== 128 || !metadata.visiblePixels || metadata.transparentPixels === 0) {
          invalid.push(`${key}/wall/${mask}`);
        }
      }

      for (const fileName of ['objects/door-locked.png', 'objects/door-open.png']) {
        const metadata = readPngDimensionsAndVisiblePixels(path.join(tileRoot, key, fileName));
        if (metadata.width !== 128 || metadata.height !== 128 || !metadata.visiblePixels || metadata.transparentPixels === 0) {
          invalid.push(`${key}/${fileName}`);
        }
      }
    }

    expect(invalid).toEqual([]);
  });

  test('player run animation reverses only when moving opposite the aim direction', () => {
    const context = createBrowserContext();
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const { Player } = loadGloomvault('entities/Player.js', ['Player'], context);
    context.window.gloomvaultAssets = {
      getAnimationFrameCount: jest.fn(() => 4),
      getAnimationFrameDuration: jest.fn(() => 1 / 8)
    };
    const player = new Player(100, 100);
    player.animationState = 'run';
    player.angle = 0;
    player.currentFrame = 1;

    player.updateMovementAnimationDirection(200, 0);
    const forwardFrame = player.getSpriteFrameIndex();
    player.updateMovementAnimationDirection(-200, 0);
    const backwardFrame = player.getSpriteFrameIndex();
    player.updateMovementAnimationDirection(0, -200);
    const sidewaysFrame = player.getSpriteFrameIndex();
    player.animationState = 'idle';
    player.currentFrame = 3;

    expect([
      forwardFrame,
      backwardFrame,
      sidewaysFrame,
      player.getSpriteFrameIndex()
    ]).toEqual([1, 2, 1, 0]);
  });

  test('player rendering falls back to primitive shape when sprite frames are missing', () => {
    const context = createBrowserContext();
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const { Player } = loadGloomvault('entities/Player.js', ['Player'], context);
    const player = new Player(50, 60);
    const ctx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn()
    };
    const renderer = {
      camera: { worldToScreen: jest.fn(() => ({ x: 10, y: 20 })) },
      assetManager: { getSpriteFrame: jest.fn(() => null) },
      drawAnimationFrameDirect: jest.fn()
    };

    player.render(ctx, renderer);

    expect([
      renderer.drawAnimationFrameDirect.mock.calls.length,
      ctx.arc.mock.calls.length,
      ctx.moveTo.mock.calls[0]
    ]).toEqual([0, 1, [10, 20]]);
  });

  test('basic melee enemies use the grunt sprite key and art-facing rotation offset', () => {
    const context = createBrowserContext();
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const { Enemy } = loadGloomvault('entities/Enemy.js', ['Enemy'], context);
    const enemy = Object.assign(Object.create(Enemy.prototype), {
      x: 40,
      y: 50,
      width: 20,
      height: 20,
      angle: Math.PI,
      type: 'grunt',
      animationState: 'run',
      currentFrame: 2,
      statusEffects: [],
      hitFlashTimer: 0,
      state: 'chase',
      color: '#66aa44'
    });
    const ctx = {
      save: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      restore: jest.fn()
    };
    const renderer = {
      camera: { worldToScreen: jest.fn(() => ({ x: 11, y: 22 })) },
      assetManager: { getSpriteFrame: jest.fn(() => ({})) },
      drawAnimationFrameDirect: jest.fn()
    };

    enemy.render(ctx, renderer);

    expect([
      enemy.getSpriteKey(),
      ctx.translate.mock.calls[0],
      ctx.rotate.mock.calls[0][0],
      renderer.drawAnimationFrameDirect.mock.calls[0].slice(1, 4)
    ]).toEqual([
      'sprites.enemy.grunt',
      [11, 22],
      Math.PI / 2,
      ['sprites.enemy.grunt', 'run', 2]
    ]);
  });

  test('brute enemies use the red brute sprite at twenty percent larger than grunt visuals', () => {
    const context = createBrowserContext();
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const { Enemy } = loadGloomvault('entities/Enemy.js', ['Enemy'], context);
    const enemy = Object.assign(Object.create(Enemy.prototype), {
      x: 40,
      y: 50,
      width: 40,
      height: 40,
      angle: Math.PI,
      type: 'brute',
      animationState: 'run',
      currentFrame: 3,
      statusEffects: [],
      hitFlashTimer: 0,
      state: 'chase',
      color: '#880000'
    });
    const ctx = {
      save: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      restore: jest.fn()
    };
    const renderer = {
      camera: { worldToScreen: jest.fn(() => ({ x: 12, y: 24 })) },
      assetManager: { getSpriteFrame: jest.fn(() => ({})) },
      drawAnimationFrameDirect: jest.fn()
    };

    enemy.render(ctx, renderer);

    expect([
      enemy.getSpriteKey(),
      enemy.getSpriteRenderSize(),
      ctx.rotate.mock.calls[0][0],
      renderer.drawAnimationFrameDirect.mock.calls[0].slice(1)
    ]).toEqual([
      'sprites.enemy.brute',
      72,
      Math.PI / 2,
      ['sprites.enemy.brute', 'run', 3, -36, -36, 72, 72]
    ]);
  });

  test('brute sprite variants keep brute behavior while switching art keys', () => {
    const context = createBrowserContext();
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const { Enemy } = loadGloomvault('entities/Enemy.js', ['Enemy'], context);
    const blue = Object.assign(Object.create(Enemy.prototype), {
      type: 'brute',
      spriteVariant: 'blue',
      width: 40,
      height: 40
    });
    const purple = Object.assign(Object.create(Enemy.prototype), {
      type: 'brute',
      spriteVariant: 'purple',
      width: 40,
      height: 40
    });
    const red = Object.assign(Object.create(Enemy.prototype), {
      type: 'brute',
      spriteVariant: 'red',
      width: 40,
      height: 40
    });

    expect([
      blue.getSpriteKey(),
      purple.getSpriteKey(),
      red.getSpriteKey(),
      blue.getSpriteRenderSize(),
      purple.getSpriteRenderSize(),
      red.getSpriteRenderSize()
    ]).toEqual([
      'sprites.enemy.brute.blue',
      'sprites.enemy.brute.purple',
      'sprites.enemy.brute',
      72,
      72,
      72
    ]);
  });

  test('ranged mage keeps creature art and renders larger for readability', () => {
    const context = createBrowserContext();
    const { AssetManifest } = loadGloomvault('config/AssetManifest.js', ['AssetManifest'], context);
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const { Enemy } = loadGloomvault('entities/Enemy.js', ['Enemy'], context);
    const mage = Object.assign(Object.create(Enemy.prototype), {
      type: 'ranged',
      spriteVariant: 'mage',
      width: 30,
      height: 30
    });

    expect([
      mage.getSpriteKey(),
      mage.getSpriteRenderSize(),
      AssetManifest.sprites['enemy.ranged.mage'].path.includes('wizard')
    ]).toEqual([
      'sprites.enemy.ranged.mage',
      81,
      false
    ]);
  });

  test('boss profiles select unique sprite keys and scale without changing base role', () => {
    const context = createBrowserContext();
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const { Enemy } = loadGloomvault('entities/Enemy.js', ['Enemy'], context);
    const storm = Object.assign(Object.create(Enemy.prototype), {
      type: 'ranged',
      width: 64,
      height: 64,
      bossProfile: {
        id: 'storm_seer',
        spriteKey: 'sprites.enemy.boss.stormSeer',
        spriteRenderScale: 1.15
      }
    });
    const guardian = Object.assign(Object.create(Enemy.prototype), {
      type: 'brute',
      width: 58,
      height: 58,
      bossProfile: {
        id: 'crypt_sentinel',
        spriteKey: 'sprites.enemy.guardian.cryptSentinel',
        spriteRenderScale: 1.12
      }
    });

    expect([
      storm.getSpriteKey(),
      storm.getSpriteFallbackKey(),
      storm.getSpriteRenderSize(),
      guardian.getSpriteKey(),
      guardian.getSpriteFallbackKey(),
      guardian.getSpriteRenderSize()
    ]).toEqual([
      'sprites.enemy.boss.stormSeer',
      'sprites.enemy.ranged',
      64 * 2 * 1.15,
      'sprites.enemy.guardian.cryptSentinel',
      'sprites.enemy.brute',
      58 * 2 * 1.12
    ]);
  });

  test('boss rendering falls back to base role sprite when unique art is missing', () => {
    const context = createBrowserContext();
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const { Enemy } = loadGloomvault('entities/Enemy.js', ['Enemy'], context);
    const enemy = Object.assign(Object.create(Enemy.prototype), {
      x: 40,
      y: 50,
      width: 72,
      height: 72,
      angle: Math.PI,
      type: 'boss',
      animationState: 'run',
      currentFrame: 1,
      statusEffects: [],
      hitFlashTimer: 0,
      state: 'chase',
      color: '#4b0f0f',
      bossProfile: {
        spriteKey: 'sprites.enemy.boss.vaultWarden',
        spriteRenderScale: 1.05
      }
    });
    const ctx = {
      save: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      restore: jest.fn()
    };
    const renderer = {
      camera: { worldToScreen: jest.fn(() => ({ x: 12, y: 24 })) },
      assetManager: {
        getSpriteFrame: jest.fn(key => key === 'sprites.enemy.boss' ? {} : null)
      },
      drawAnimationFrameDirect: jest.fn()
    };

    enemy.render(ctx, renderer);

    expect([
      renderer.assetManager.getSpriteFrame.mock.calls.map(call => call[0]),
      renderer.drawAnimationFrameDirect.mock.calls[0].slice(1, 4)
    ]).toEqual([
      ['sprites.enemy.boss.vaultWarden', 'sprites.enemy.boss'],
      ['sprites.enemy.boss', 'run', 1]
    ]);
  });

  test('boss tier enemies wander while unaggroed and enter combat on line of sight', () => {
    const context = createBrowserContext();
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const { Enemy } = loadGloomvault('entities/Enemy.js', ['Enemy'], context);
    const idleBoss = Object.assign(Object.create(Enemy.prototype), {
      x: 0,
      y: 0,
      state: 'idle',
      isAggroed: false,
      hasTakenPlayerDamage: false,
      aiProfile: 'boss',
      getRoleConfig: () => ({ aggroRange: 500 }),
      updateIdleMovement: jest.fn(),
      updateAnimationState: jest.fn(),
      updateAnimation: jest.fn()
    });
    const combatBoss = Object.assign(Object.create(Enemy.prototype), {
      x: 0,
      y: 0,
      state: 'idle',
      isAggroed: false,
      hasTakenPlayerDamage: false,
      aiProfile: 'brute',
      getRoleConfig: role => role === 'boss' ? { aggroRange: 500 } : {},
      updateBrute: jest.fn(() => []),
      tryUseBorrowedPower: jest.fn()
    });

    idleBoss.updateBossTier(0.16, { x: 600, y: 0 }, {}, {}, 600, false, { engine: {} });
    combatBoss.updateBossTier(0.16, { x: 300, y: 0 }, {}, {}, 300, true, { engine: {} });

    expect([
      idleBoss.updateIdleMovement.mock.calls.length,
      combatBoss.isAggroed,
      combatBoss.updateBrute.mock.calls.length
    ]).toEqual([1, true, 1]);
  });

  test('boss config gives storm seer secondary casts and blight priest ranged poison tools', () => {
    const context = createBrowserContext();
    loadGloomvault('config/BossConfig.js', ['BossConfig'], context);
    const storm = context.BossConfig.mainBosses.find(boss => boss.id === 'storm_seer');
    const blight = context.BossConfig.mainBosses.find(boss => boss.id === 'blight_priest');
    const stormEngine = {
      fireBossCone: jest.fn(() => true),
      fireBossNova: jest.fn(() => true),
      showBossCombatText: jest.fn()
    };
    const blightEngine = {
      createBossHazardCloud: jest.fn(() => true),
      throwBossElementBomb: jest.fn(() => true),
      showBossCombatText: jest.fn()
    };
    const stormEnemy = { isAggroed: true, bossRuntime: { specialTimers: { stormCone: 0, stormNova: 0 } }, weapon: { damage: 22 } };
    const blightEnemy = { x: 0, y: 0, isAggroed: true, bossRuntime: { specialTimers: { blightSelfPool: 0, blightThrownPool: 0 } } };
    const player = { x: 100, y: 0 };
    jest.spyOn(Math, 'random').mockReturnValue(0.5);

    storm.hooks.onUpdate(stormEnemy, stormEngine, 0.16, { player });
    blight.hooks.onUpdate(blightEnemy, blightEngine, 0.16, { player });

    expect([
      storm.baseStats.weaponCooldown,
      stormEngine.fireBossCone.mock.calls.length,
      stormEngine.fireBossNova.mock.calls.length,
      blight.aiProfile,
      blight.aiOverrides.ranged.shootRange,
      blightEngine.createBossHazardCloud.mock.calls.length,
      blightEngine.throwBossElementBomb.mock.calls.length,
      blightEnemy.angle
    ]).toEqual([
      0.44,
      1,
      1,
      'ranged',
      590,
      1,
      1,
      0
    ]);
  });

  test('vault warden and iron maw use brute pressure overrides', () => {
    const context = createBrowserContext();
    loadGloomvault('config/BossConfig.js', ['BossConfig'], context);
    const warden = context.BossConfig.mainBosses.find(boss => boss.id === 'vault_warden');
    const ironMaw = context.BossConfig.mainBosses.find(boss => boss.id === 'iron_maw');

    expect([
      warden.aiProfile,
      warden.aiOverrides.brute.orbitRange > 0,
      ironMaw.aiProfile,
      ironMaw.aiOverrides.brute.meleeCommitRange > ironMaw.aiOverrides.brute.orbitRange
    ]).toEqual(['brute', true, 'brute', true]);
  });

  test('storm seer ranged shots trigger only visual attack animation state', () => {
    const attack = jest.fn(() => [{ kind: 'bolt' }]);
    const context = createBrowserContext();
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const { Enemy } = loadGloomvault('entities/Enemy.js', ['Enemy'], context);
    const enemy = Object.assign(Object.create(Enemy.prototype), {
      x: 0,
      y: 0,
      baseSpeed: 92,
      speed: 92,
      state: 'reposition',
      stateLockTimer: 1,
      strafeDirection: 1,
      angle: 0,
      weapon: { attack },
      bossProfile: { id: 'storm_seer' },
      attackAnimationTimer: 0,
      getRoleConfig: () => ({ minRange: 170, preferredMax: 360, preferredMin: 220, maxRange: 520, shootRange: 500, strafeSpeedMultiplier: 0.76, retreatSpeedMultiplier: 0.84, repositionLock: 0.6 }),
      moveInDirection: jest.fn()
    });

    const projectiles = enemy.updateRanged(0.16, { x: 300, y: 0 }, {}, {}, 300, true);
    enemy.updateAnimationState();

    expect([
      projectiles.length,
      attack.mock.calls.length,
      enemy.attackAnimationTimer,
      enemy.animationState
    ]).toEqual([
      1,
      1,
      0.22,
      'attack'
    ]);
  });

  test('brown grunts keep grunt behavior with higher hp and larger visual sprite', () => {
    const context = createBrowserContext({
      Weapon: class Weapon {
        constructor(item) { Object.assign(this, { weaponType: item.weaponType }); }
      }
    });
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    const { Enemy } = loadGloomvault('entities/Enemy.js', ['Enemy'], context);

    const grunt = new Enemy(0, 0, 'grunt');
    const brown = new Enemy(0, 0, 'brown_grunt');
    randomSpy.mockRestore();

    expect([
      grunt.maxHp,
      brown.maxHp,
      brown.width,
      brown.height,
      brown.speed,
      brown.weapon.weaponType,
      brown.weapon.baseDamage,
      brown.getSpriteKey(),
      brown.getSpriteRenderSize()
    ]).toEqual([
      50,
      60,
      30,
      30,
      grunt.speed,
      'melee_stab',
      grunt.weapon.baseDamage,
      'sprites.enemy.brownGrunt',
      69
    ]);
  });

  test('grunt closes distance instead of strafing when melee is ready just outside attack range', () => {
    const attack = jest.fn(() => [{ kind: 'melee' }]);
    const context = createBrowserContext({
      Weapon: class Weapon {
        constructor(item) {
          Object.assign(this, {
            weaponType: item.weaponType,
            cooldownTimer: 0,
            attack
          });
        }
        setElement() {}
        static rollElementForType() { return null; }
      }
    });
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    const { Enemy } = loadGloomvault('entities/Enemy.js', ['Enemy'], context);
    const enemy = new Enemy(0, 0, 'grunt');
    enemy.pathToPlayer = jest.fn(() => {
      enemy.path = [];
    });
    enemy.moveInDirection = jest.fn();

    enemy.updateGrunt(0.16, { x: 70, y: 0 }, {}, {}, 70, true);
    randomSpy.mockRestore();

    expect([enemy.state, enemy.pathToPlayer.mock.calls.length, enemy.moveInDirection.mock.calls.length, attack.mock.calls.length]).toEqual([
      'chase',
      1,
      1,
      0
    ]);
  });

  test('grunt attacks and emits a melee hit when inside attack range with weapon ready', () => {
    const attack = jest.fn(() => [{ kind: 'melee' }]);
    const context = createBrowserContext({
      Weapon: class Weapon {
        constructor(item) {
          Object.assign(this, {
            weaponType: item.weaponType,
            cooldownTimer: 0,
            attack
          });
        }
        setElement() {}
        static rollElementForType() { return null; }
      }
    });
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    const { Enemy } = loadGloomvault('entities/Enemy.js', ['Enemy'], context);
    const enemy = new Enemy(0, 0, 'grunt');
    enemy.moveInDirection = jest.fn();

    const projectiles = enemy.updateGrunt(0.16, { x: 50, y: 0 }, {}, {}, 50, true);
    randomSpy.mockRestore();

    expect([enemy.state, projectiles.length, attack.mock.calls.length, enemy.moveInDirection.mock.calls.length > 0]).toEqual([
      'attack',
      1,
      1,
      true
    ]);
  });

  test('grunt repositions at close range while melee is cooling down', () => {
    const attack = jest.fn(() => [{ kind: 'melee' }]);
    const context = createBrowserContext({
      Weapon: class Weapon {
        constructor(item) {
          Object.assign(this, {
            weaponType: item.weaponType,
            cooldownTimer: 0.4,
            attack
          });
        }
        setElement() {}
        static rollElementForType() { return null; }
      }
    });
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    const { Enemy } = loadGloomvault('entities/Enemy.js', ['Enemy'], context);
    const enemy = new Enemy(0, 0, 'grunt');
    enemy.moveInDirection = jest.fn();

    const projectiles = enemy.updateGrunt(0.16, { x: 62, y: 0 }, {}, {}, 62, true);
    randomSpy.mockRestore();

    expect([enemy.state, projectiles.length, attack.mock.calls.length, enemy.moveInDirection.mock.calls.length]).toEqual([
      'reposition',
      0,
      0,
      1
    ]);
  });

  test('grunt on cooldown keeps closing when just outside the reduced strafe range', () => {
    const attack = jest.fn(() => [{ kind: 'melee' }]);
    const context = createBrowserContext({
      Weapon: class Weapon {
        constructor(item) {
          Object.assign(this, {
            weaponType: item.weaponType,
            cooldownTimer: 0.4,
            attack
          });
        }
        setElement() {}
        static rollElementForType() { return null; }
      }
    });
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    const { Enemy } = loadGloomvault('entities/Enemy.js', ['Enemy'], context);
    const enemy = new Enemy(0, 0, 'grunt');
    enemy.pathToPlayer = jest.fn(() => {
      enemy.path = [];
    });
    enemy.moveInDirection = jest.fn();

    const projectiles = enemy.updateGrunt(0.16, { x: 66, y: 0 }, {}, {}, 66, true);
    randomSpy.mockRestore();

    expect([enemy.state, projectiles.length, attack.mock.calls.length, enemy.pathToPlayer.mock.calls.length]).toEqual([
      'chase',
      0,
      0,
      1
    ]);
  });

  test('brown grunt inherits the same melee commit behavior as grunt', () => {
    const attack = jest.fn(() => [{ kind: 'melee' }]);
    const context = createBrowserContext({
      Weapon: class Weapon {
        constructor(item) {
          Object.assign(this, {
            weaponType: item.weaponType,
            cooldownTimer: 0,
            attack
          });
        }
        setElement() {}
        static rollElementForType() { return null; }
      }
    });
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    const { Enemy } = loadGloomvault('entities/Enemy.js', ['Enemy'], context);
    const enemy = new Enemy(0, 0, 'brown_grunt');
    enemy.pathToPlayer = jest.fn(() => {
      enemy.path = [];
    });
    enemy.moveInDirection = jest.fn();

    enemy.updateGrunt(0.16, { x: 70, y: 0 }, {}, {}, 70, true);
    randomSpy.mockRestore();

    expect([enemy.state, enemy.pathToPlayer.mock.calls.length, attack.mock.calls.length]).toEqual([
      'chase',
      1,
      0
    ]);
  });

  test('grunt melee commit ignores squad formation offsets and paths straight at the player', () => {
    const attack = jest.fn(() => [{ kind: 'melee' }]);
    const context = createBrowserContext({
      Weapon: class Weapon {
        constructor(item) {
          Object.assign(this, {
            weaponType: item.weaponType,
            cooldownTimer: 0,
            attack
          });
        }
        setElement() {}
        static rollElementForType() { return null; }
      }
    });
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    const { Enemy } = loadGloomvault('entities/Enemy.js', ['Enemy'], context);
    const enemy = new Enemy(0, 0, 'grunt', 1, null, {
      squadId: 'squad-1',
      formationOffset: { x: 44, y: 0 }
    });
    const mapGen = { tileSize: 10, getTile: jest.fn(() => 1) };
    const pathfinder = { findPath: jest.fn(() => [{ x: 70, y: 0 }]) };
    enemy.moveInDirection = jest.fn();

    enemy.updateGrunt(0.16, { x: 70, y: 0 }, mapGen, pathfinder, 70, true);
    randomSpy.mockRestore();

    expect([enemy.state, pathfinder.findPath.mock.calls[0][2], pathfinder.findPath.mock.calls[0][3]]).toEqual([
      'chase',
      70,
      0
    ]);
  });

  test('brute outside melee and charge ranges stays in chase and paths toward the player', () => {
    const context = createBrowserContext();
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const { Enemy } = loadGloomvault('entities/Enemy.js', ['Enemy'], context);
    const enemy = Object.assign(Object.create(Enemy.prototype), {
      state: 'idle',
      speed: 60,
      path: [],
      setState: Enemy.prototype.setState,
      pathToPlayer: jest.fn(() => {
        enemy.path = [{ x: 240, y: 0 }];
      }),
      followPath: jest.fn(),
      moveInDirection: jest.fn(),
      getRoleConfig: () => ({ meleeRange: 96, meleeCommitRange: 128, meleeWindup: 0.2, meleeRecovery: 0.34, meleeCooldown: 1.1, orbitRange: 112, orbitMinRange: 72, orbitSpeedMultiplier: 0.42, orbitLock: 0.55, chargeMinRange: 108, telegraphRange: 155, chaseRange: 620, windup: 0.95, dashTime: 0.48, recovery: 0.65, attackCooldown: 2.2 })
    });

    const projectiles = enemy.updateBrute(0.16, { x: 240, y: 0 }, {}, {}, 240, true);

    expect([enemy.state, projectiles.length, enemy.pathToPlayer.mock.calls.length, enemy.followPath.mock.calls.length]).toEqual([
      'chase',
      0,
      1,
      1
    ]);
  });

  test('brute just outside orbit range presses forward instead of circling', () => {
    const context = createBrowserContext();
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const { Enemy } = loadGloomvault('entities/Enemy.js', ['Enemy'], context);
    const enemy = Object.assign(Object.create(Enemy.prototype), {
      x: 0,
      y: 0,
      angle: 0,
      state: 'chase',
      brutePhase: 'ready',
      bruteAttackMode: 'none',
      bruteMeleeCooldownTimer: 1,
      attackCooldownTimer: 1,
      bruteOrbitLockTimer: 0,
      path: [{ x: 200, y: 0 }],
      speed: 60,
      baseSpeed: 60,
      setState: Enemy.prototype.setState,
      pathToPlayer: jest.fn(),
      moveInDirection: jest.fn(),
      getRoleConfig: () => ({ meleeRange: 96, meleeCommitRange: 128, meleeWindup: 0.2, meleeRecovery: 0.34, meleeCooldown: 1.1, orbitRange: 112, orbitMinRange: 72, orbitSpeedMultiplier: 0.42, orbitLock: 0.55, chargeMinRange: 108, telegraphRange: 155, chaseRange: 620, windup: 0.95, dashTime: 0.48, recovery: 0.65, attackCooldown: 2.2 })
    });

    enemy.updateBrute(0.16, { x: 120, y: 0 }, {}, {}, 120, true);

    expect([enemy.path.length, enemy.pathToPlayer.mock.calls.length, enemy.moveInDirection.mock.calls[0][0], enemy.moveInDirection.mock.calls[0][3]]).toEqual([
      0,
      0,
      0,
      60 * 0.62
    ]);
  });

  test('brute inside orbit range arcs around the player and keeps facing them', () => {
    const context = createBrowserContext();
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const { Enemy } = loadGloomvault('entities/Enemy.js', ['Enemy'], context);
    const enemy = Object.assign(Object.create(Enemy.prototype), {
      x: 0,
      y: 0,
      angle: 0,
      state: 'chase',
      brutePhase: 'ready',
      bruteAttackMode: 'none',
      bruteMeleeCooldownTimer: 1,
      attackCooldownTimer: 1,
      bruteOrbitLockTimer: 0,
      strafeDirection: 1,
      path: [],
      speed: 60,
      baseSpeed: 60,
      setState: Enemy.prototype.setState,
      pathToPlayer: jest.fn(),
      moveInDirection: jest.fn(),
      getRoleConfig: () => ({ meleeRange: 96, meleeCommitRange: 128, meleeWindup: 0.2, meleeRecovery: 0.34, meleeCooldown: 1.1, orbitRange: 112, orbitMinRange: 72, orbitSpeedMultiplier: 0.42, orbitLock: 0.55, chargeMinRange: 108, telegraphRange: 155, chaseRange: 620, windup: 0.95, dashTime: 0.48, recovery: 0.65, attackCooldown: 2.2 })
    });

    enemy.updateBrute(0.16, { x: 90, y: 0 }, {}, {}, 90, true);

    expect([enemy.angle, enemy.bruteOrbitLockTimer, enemy.pathToPlayer.mock.calls.length, enemy.moveInDirection.mock.calls[0][0], enemy.moveInDirection.mock.calls[0][3]]).toEqual([
      0,
      0.55,
      0,
      Math.PI / 2,
      60 * 0.42
    ]);
  });

  test('brute inside orbit range performs basic melee while continuing arc pressure', () => {
    const attack = jest.fn(() => [{ kind: 'cleave' }]);
    const context = createBrowserContext();
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const { Enemy } = loadGloomvault('entities/Enemy.js', ['Enemy'], context);
    const enemy = Object.assign(Object.create(Enemy.prototype), {
      x: 0,
      y: 0,
      angle: 0,
      state: 'chase',
      brutePhase: 'ready',
      bruteAttackMode: 'none',
      attackTimer: 0,
      bruteMeleeCooldownTimer: 0,
      attackCooldownTimer: 0,
      pathTimer: 0,
      path: [],
      speed: 60,
      baseSpeed: 60,
      strafeDirection: 1,
      bruteOrbitLockTimer: 0,
      weapon: { attack, cooldown: 2, cooldownTimer: 0 },
      setState: Enemy.prototype.setState,
      performBruteAttack: Enemy.prototype.performBruteAttack,
      pathToPlayer: jest.fn(() => {
        enemy.path = [];
      }),
      moveInDirection: jest.fn(),
      getRoleConfig: () => ({ meleeRange: 96, meleeCommitRange: 128, meleeWindup: 0.2, meleeRecovery: 0.34, meleeCooldown: 1.1, orbitRange: 112, orbitMinRange: 72, orbitSpeedMultiplier: 0.42, orbitLock: 0.55, chargeMinRange: 108, telegraphRange: 155, chaseRange: 620, windup: 0.95, dashTime: 0.48, recovery: 0.65, attackCooldown: 2.2 })
    });

    const projectiles = enemy.updateBrute(0.16, { x: 80, y: 0 }, {}, {}, 80, true);

    expect([enemy.state, projectiles.length, attack.mock.calls.length, enemy.pathToPlayer.mock.calls.length, enemy.moveInDirection.mock.calls[0][0]]).toEqual([
      'chase',
      1,
      1,
      0,
      Math.PI / 2
    ]);
  });

  test('brute in charge band starts charge windup while still pathing toward the player', () => {
    const context = createBrowserContext();
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const { Enemy } = loadGloomvault('entities/Enemy.js', ['Enemy'], context);
    const enemy = Object.assign(Object.create(Enemy.prototype), {
      x: 0,
      y: 0,
      angle: 0,
      state: 'chase',
      brutePhase: 'ready',
      bruteAttackMode: 'none',
      attackCooldownTimer: 0,
      bruteMeleeCooldownTimer: 0,
      path: [],
      speed: 60,
      baseSpeed: 60,
      bruteOrbitLockTimer: 0,
      setState: Enemy.prototype.setState,
      pathToPlayer: jest.fn(() => {
        enemy.path = [];
      }),
      moveInDirection: jest.fn(),
      getRoleConfig: () => ({ meleeRange: 96, meleeCommitRange: 128, meleeWindup: 0.2, meleeRecovery: 0.34, meleeCooldown: 1.1, orbitRange: 112, orbitMinRange: 72, orbitSpeedMultiplier: 0.42, orbitLock: 0.55, chargeMinRange: 108, telegraphRange: 155, chaseRange: 620, windup: 0.95, dashTime: 0.48, recovery: 0.65, attackCooldown: 2.2 })
    });

    const projectiles = enemy.updateBrute(0.16, { x: 130, y: 0 }, {}, {}, 130, true);

    expect([enemy.state, enemy.bruteAttackMode, enemy.brutePhase, enemy.attackTimer, projectiles.length, enemy.pathToPlayer.mock.calls.length, enemy.moveInDirection.mock.calls.length]).toEqual([
      'chase',
      'charge',
      'windup',
      0.95,
      0,
      1,
      1
    ]);
  });

  test('brute can melee at point-blank range while charge is available', () => {
    const attack = jest.fn(() => [{ kind: 'cleave' }]);
    const context = createBrowserContext();
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const { Enemy } = loadGloomvault('entities/Enemy.js', ['Enemy'], context);
    const enemy = Object.assign(Object.create(Enemy.prototype), {
      x: 0,
      y: 0,
      angle: 0,
      state: 'chase',
      brutePhase: 'ready',
      bruteAttackMode: 'none',
      attackCooldownTimer: 0,
      bruteMeleeCooldownTimer: 0,
      path: [],
      speed: 60,
      baseSpeed: 60,
      bruteOrbitLockTimer: 0,
      weapon: { attack, cooldown: 2, cooldownTimer: 0 },
      setState: Enemy.prototype.setState,
      performBruteAttack: Enemy.prototype.performBruteAttack,
      pathToPlayer: jest.fn(() => {
        enemy.path = [];
      }),
      moveInDirection: jest.fn(),
      getRoleConfig: () => ({ meleeRange: 96, meleeCommitRange: 128, meleeWindup: 0.2, meleeRecovery: 0.34, meleeCooldown: 1.1, orbitRange: 112, orbitMinRange: 72, orbitSpeedMultiplier: 0.42, orbitLock: 0.55, chargeMinRange: 60, telegraphRange: 155, chaseRange: 620, windup: 0.95, dashTime: 0.48, recovery: 0.65, attackCooldown: 2.2 })
    });

    const projectiles = enemy.updateBrute(0.16, { x: 70, y: 0 }, {}, {}, 70, true);

    expect([enemy.bruteAttackMode, projectiles.length, attack.mock.calls.length]).toEqual([
      'charge',
      1,
      1
    ]);
  });

  test('brute in charge windup and recovery continues normal chase movement', () => {
    const context = createBrowserContext();
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const { Enemy } = loadGloomvault('entities/Enemy.js', ['Enemy'], context);
    const enemy = Object.assign(Object.create(Enemy.prototype), {
      x: 0,
      y: 0,
      angle: 0,
      state: 'chase',
      brutePhase: 'windup',
      bruteAttackMode: 'charge',
      attackTimer: 0.4,
      attackCooldownTimer: 0.4,
      bruteMeleeCooldownTimer: 1,
      path: [],
      speed: 60,
      baseSpeed: 60,
      bruteOrbitLockTimer: 0,
      setState: Enemy.prototype.setState,
      pathToPlayer: jest.fn(() => {
        enemy.path = [];
      }),
      moveInDirection: jest.fn(),
      getRoleConfig: () => ({ meleeRange: 96, meleeCommitRange: 128, meleeWindup: 0.2, meleeRecovery: 0.34, meleeCooldown: 1.1, orbitRange: 112, orbitMinRange: 72, orbitSpeedMultiplier: 0.42, orbitLock: 0.55, chargeMinRange: 108, telegraphRange: 155, chaseRange: 620, windup: 0.95, dashTime: 0.48, recovery: 0.65, attackCooldown: 2.2 })
    });

    enemy.updateBrute(0.16, { x: 130, y: 0 }, {}, {}, 130, true);
    enemy.brutePhase = 'recovery';
    enemy.attackTimer = 0.2;
    enemy.updateBrute(0.16, { x: 130, y: 0 }, {}, {}, 130, true);

    expect([enemy.pathToPlayer.mock.calls.length, enemy.moveInDirection.mock.calls.length]).toEqual([2, 2]);
  });

  test('brute dash phase uses dash movement instead of chase pathing', () => {
    const attack = jest.fn(() => [{ kind: 'charge-cleave' }]);
    const context = createBrowserContext();
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const { Enemy } = loadGloomvault('entities/Enemy.js', ['Enemy'], context);
    const enemy = Object.assign(Object.create(Enemy.prototype), {
      x: 0,
      y: 0,
      angle: 0,
      state: 'chase',
      dashSpeed: 400,
      brutePhase: 'dash',
      bruteAttackMode: 'charge',
      attackTimer: 0.2,
      attackCooldownTimer: 0.4,
      bruteMeleeCooldownTimer: 0,
      weapon: { attack, cooldown: 2, cooldownTimer: 0 },
      setState: Enemy.prototype.setState,
      performBruteAttack: Enemy.prototype.performBruteAttack,
      pathToPlayer: jest.fn(),
      moveInDirection: jest.fn(),
      getRoleConfig: () => ({ meleeRange: 96, meleeCommitRange: 128, meleeWindup: 0.2, meleeRecovery: 0.34, meleeCooldown: 1.1, orbitRange: 112, orbitMinRange: 72, orbitSpeedMultiplier: 0.42, orbitLock: 0.55, chargeMinRange: 108, telegraphRange: 155, chaseRange: 620, windup: 0.95, dashTime: 0.48, recovery: 0.65, attackCooldown: 2.2 })
    });

    const projectiles = enemy.updateBrute(0.16, { x: 70, y: 0 }, {}, {}, 70, true);

    expect([enemy.pathToPlayer.mock.calls.length, enemy.moveInDirection.mock.calls[0][3], projectiles.length, attack.mock.calls.length]).toEqual([
      0,
      400,
      1,
      1
    ]);
  });

  test('floor guardian boss tier routes through brute logic and inherits melee attacks', () => {
    const attack = jest.fn(() => [{ kind: 'guardian-cleave' }]);
    const context = createBrowserContext();
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const { Enemy } = loadGloomvault('entities/Enemy.js', ['Enemy'], context);
    const enemy = Object.assign(Object.create(Enemy.prototype), {
      x: 0,
      y: 0,
      angle: 0,
      type: 'brute',
      aiProfile: 'brute',
      isAggroed: true,
      hasTakenPlayerDamage: false,
      state: 'chase',
      brutePhase: 'ready',
      bruteAttackMode: 'none',
      bruteMeleeCooldownTimer: 0,
      bruteOrbitLockTimer: 0,
      strafeDirection: 1,
      attackCooldownTimer: 0,
      attackTimer: 0,
      weapon: { attack, cooldown: 1.45, cooldownTimer: 0 },
      path: [],
      speed: 74,
      bossProfile: { aiOverrides: { brute: { meleeRange: 90, meleeCommitRange: 120, meleeWindup: 0.16, meleeRecovery: 0.3, meleeCooldown: 0.95, orbitRange: 104, orbitMinRange: 68, orbitSpeedMultiplier: 0.4, orbitLock: 0.5, chargeMinRange: 105, telegraphRange: 145, chaseRange: 610, windup: 0.82, dashTime: 0.46, recovery: 0.52, attackCooldown: 1.9 } } },
      getRoleConfig(roleKey) {
        if (roleKey === 'boss') return { aggroRange: 480 };
        return Enemy.prototype.getRoleConfig.call(this, roleKey);
      },
      performBruteAttack: Enemy.prototype.performBruteAttack,
      updateBrute: Enemy.prototype.updateBrute,
      setState: Enemy.prototype.setState,
      pathToPlayer: jest.fn(() => {
        enemy.path = [];
      }),
      moveInDirection: jest.fn(),
      updateAnimation: jest.fn(),
      tryUseBorrowedPower: jest.fn()
    });

    const hit = enemy.updateBossTier(0.16, { x: 70, y: 0 }, {}, {}, 70, true, { engine: {} });

    expect([enemy.state, hit.length, attack.mock.calls.length, enemy.pathToPlayer.mock.calls.length, enemy.moveInDirection.mock.calls[0][0]]).toEqual([
      'chase',
      1,
      1,
      0,
      Math.PI / 2
    ]);
  });

  test('spawn manager only splits the grunt branch into brown grunt variants', () => {
    const context = createBrowserContext();
    const { SpawnManager } = loadGloomvault('systems/SpawnManager.js', ['SpawnManager'], context);
    const spawnManager = new SpawnManager();
    const randomSpy = jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0.95)
      .mockReturnValueOnce(0.8)
      .mockReturnValueOnce(0.69)
      .mockReturnValueOnce(0.24)
      .mockReturnValueOnce(0.69)
      .mockReturnValueOnce(0.25)
      .mockReturnValueOnce(0.2)
      .mockReturnValueOnce(0.24);

    const rolls = [
      spawnManager.rollEnemyType(),
      spawnManager.rollEnemyType(),
      spawnManager.rollEnemyType(),
      spawnManager.rollEnemyType(),
      spawnManager.rollSquadLeaderType()
    ];
    randomSpy.mockRestore();

    expect(rolls).toEqual(['brute', 'ranged', 'brown_grunt', 'grunt', 'brown_grunt']);
  });

  test('spawn manager assigns brute sprite variants without changing brute type', () => {
    const created = [];
    const context = createBrowserContext({
      Enemy: class Enemy {
        constructor(x, y, type, hp, damage, options) {
          Object.assign(this, { x, y, type, hp, damage, options });
          created.push(this);
        }
      }
    });
    const { SpawnManager } = loadGloomvault('systems/SpawnManager.js', ['SpawnManager'], context);
    const spawnManager = new SpawnManager();
    const randomSpy = jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0.2)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.9)
      .mockReturnValueOnce(0.9);

    const variants = [
      spawnManager.rollBruteVariant(),
      spawnManager.rollBruteVariant(),
      spawnManager.rollBruteVariant()
    ];
    const brute = spawnManager.createEnemy(10, 20, 'brute', { hp: 2, damage: 3 });
    randomSpy.mockRestore();

    expect([
      variants,
      brute.type,
      brute.options.spriteVariant,
      brute.options.dodgeProfile
    ]).toEqual([
      ['blue', 'purple', 'red'],
      'brute',
      'red',
      null
    ]);
    expect(created).toHaveLength(1);
  });

  test('renderer computes cardinal tile masks and wall-edge rotation from connected floor tiles', () => {
    const context = createBrowserContext();
    const { Renderer } = loadGloomvault('core/Renderer.js', ['Renderer'], context);
    const renderer = new Renderer({ width: 100, height: 100 }, {});
    const floors = new Set(['2,1', '3,2']);
    const map = {
      getTile: (x, y) => floors.has(`${x},${y}`) ? 1 : 0
    };

    expect([
      renderer.getTileNeighborMask(map, 2, 2),
      renderer.getWallEdgeRotation(map, 2, 2),
      renderer.getWallEdgeRotation(map, 4, 2)
    ]).toEqual([3, -Math.PI / 2, Math.PI]);
  });

  test('renderer resolves map-specific floor and normalized wall autotile keys', () => {
    const context = createBrowserContext();
    const { Renderer } = loadGloomvault('core/Renderer.js', ['Renderer'], context);
    const renderer = new Renderer({ width: 100, height: 100 }, {});
    renderer.assetManager = {
      manifest: {
        tiles: {
          maps: {
            default: {},
            ironforged: {}
          }
        }
      }
    };
    const walls = new Set(['2,1', '3,2', '3,1', '1,3']);
    const map = {
      mapKey: 'ironforged',
      getTile: (x, y) => walls.has(`${x},${y}`) ? 0 : 1
    };

    expect([
      renderer.getMapTileKey(map),
      renderer.getEightNeighborMask(map, 2, 2, 0),
      renderer.getWallAssetKey(map, 2, 2),
      renderer.getFloorAssetKey(map, 4, 4) === renderer.getFloorAssetKey(map, 4, 4)
    ]).toEqual(['ironforged', 19, 'tiles.maps.ironforged.wall.masks.019', true]);
  });

  test('renderer applies themed floor variants only to floor tiles', () => {
    const context = createBrowserContext();
    const { Renderer } = loadGloomvault('core/Renderer.js', ['Renderer'], context);
    const drawAsset = jest.fn(() => true);
    const renderer = new Renderer({ width: 100, height: 100 }, {});
    renderer.assetManager = { manifest: { tiles: { maps: { default: {} } } } };
    renderer.drawAsset = drawAsset;
    renderer.drawRect = jest.fn();
    const floorMap = { mapKey: 'default', getTile: () => 1 };
    const wallMap = { mapKey: 'default', getTile: () => 0 };

    renderer.drawMapTileLayer(floorMap, 4, 5, 64, 'floor-base');
    renderer.drawMapTileLayer(wallMap, 4, 5, 64, 'floor-base');

    expect([
      drawAsset.mock.calls.length,
      drawAsset.mock.calls[0][0].startsWith('tiles.maps.default.floor.'),
      renderer.drawRect.mock.calls.length
    ]).toEqual([1, true, 0]);
  });

  test('boss room entrance uses map-themed door object states', () => {
    const context = createBrowserContext();
    const { GameEngine } = loadGloomvault('core/GameEngine.js', ['GameEngine'], context);
    const drawAsset = jest.fn(() => true);
    const engine = Object.assign(Object.create(GameEngine.prototype), {
      tileSize: 64,
      mapGen: {
        mapKey: 'crypt_crossroads',
        bossRoom: {
          opened: false,
          unlocked: false,
          entranceWorld: { x: 100, y: 120 }
        }
      },
      renderer: {
        camera: { worldToScreen: jest.fn(() => ({ x: 10, y: 12 })) },
        getMapObjectAssetKey: jest.fn((map, objectKey) => `tiles.maps.${map.mapKey}.objects.${objectKey}`),
        drawAsset
      },
      ctx: {}
    });

    engine.renderBossRoomEntrance();
    engine.mapGen.bossRoom.unlocked = true;
    engine.renderBossRoomEntrance();

    expect(drawAsset.mock.calls.map(call => call[0])).toEqual([
      'tiles.maps.crypt_crossroads.objects.doorLocked',
      'tiles.maps.crypt_crossroads.objects.doorOpen'
    ]);
  });

  test('rotated asset drawing balances canvas save and restore calls', () => {
    const context = createBrowserContext();
    const { Renderer } = loadGloomvault('core/Renderer.js', ['Renderer'], context);
    const ctx = {
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      drawImage: jest.fn(),
      globalAlpha: 1
    };
    const renderer = new Renderer({ width: 100, height: 100 }, ctx);
    renderer.setCamera({ width: 100, height: 100, worldToScreen: () => ({ x: 50, y: 50 }) });

    const drawn = renderer.drawCenteredImage({ src: 'asset.png' }, 10, 10, 32, 32, Math.PI / 2);

    expect([drawn, ctx.save.mock.calls.length, ctx.rotate.mock.calls[0][0], ctx.restore.mock.calls.length])
      .toEqual([true, 1, Math.PI / 2, 1]);
  });
});

// Behaviour under test: MapGen carves, smooths, bounds-checks, and chooses valid world positions.
describe('Gloomvault MapGen', () => {
  afterEach(() => jest.restoreAllMocks());

  function getFloorTiles(map) {
    const floors = [];
    for (let y = 0; y < map.rows; y++) {
      for (let x = 0; x < map.cols; x++) {
        if (map.getTile(x, y) === 1) {
          floors.push({ x, y });
        }
      }
    }
    return floors;
  }

  function roomHasBoundaryOpening(map, room) {
    return map.getRoomFloorTiles(room).some(tile =>
      [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }].some(dir => {
        const nx = tile.x + dir.x;
        const ny = tile.y + dir.y;
        return !map.isTileInsideRoom(nx, ny, room) && map.getTile(nx, ny) === 1;
      })
    );
  }

  test('carves rooms and finds nearest floor positions', () => {
    const context = createBrowserContext();
    const { MapGen } = loadGloomvault('systems/MapGen.js', ['MapGen'], context);
    const map = new MapGen({ cols: 8, rows: 8 }, 10);
    map.grid = new Array(64).fill(0);
    map.carveRoom({ rects: [{ x: 2, y: 2, width: 2, height: 2 }] });

    expect([map.getTile(2, 2), map.getTile(-1, 0), map.getValidFloorPosNear(0, 0)]).toEqual([1, 0, { x: 25, y: 25 }]);
  });

  test('MapGen facade wires layout and position services when available', () => {
    const context = createBrowserContext();
    loadGloomvault('systems/MapPositionService.js', ['MapPositionService'], context);
    loadGloomvault('systems/MapLayoutRegistry.js', ['MapLayoutRegistry'], context);
    loadGloomvault('systems/MapTopologyService.js', ['MapTopologyService'], context);
    loadGloomvault('systems/BossRoomPlanner.js', ['BossRoomPlanner'], context);
    const { MapGen } = loadGloomvault('systems/MapGen.js', ['MapGen'], context);
    const map = new MapGen({ cols: 20, rows: 20, numRooms: 1, minRoomSize: 3, maxRoomSize: 4, perfectSquareChance: 1, blobMinRects: 1, blobMaxRects: 1, layoutType: 'sequential' }, 10);
    const picked = map.pickWithDistance([{ x: 1, y: 1 }], 1, [], 0);

    expect([
      Boolean(map.layoutRegistry),
      Boolean(map.positionService),
      map.tileToWorld(1, 1),
      picked
    ]).toEqual([true, true, { x: 15, y: 15 }, [{ x: 15, y: 15 }]]);
  });

  test('room and corridor carving respect configured edge padding', () => {
    const context = createBrowserContext();
    const { MapGen } = loadGloomvault('systems/MapGen.js', ['MapGen'], context);
    const map = new MapGen({ cols: 20, rows: 20, corridorWidth: 2, wobbleChance: 0, edgePaddingTiles: 3 }, 10);
    map.grid = new Array(400).fill(0);

    map.carveRoom({ rects: [{ x: 1, y: 1, width: 6, height: 6 }] });
    map.carveWobblyCorridor({ x: 3, y: 3 }, { x: 18, y: 18 });

    const floors = getFloorTiles(map);
    expect(floors.length).toBeGreaterThan(0);
    expect(floors.every(tile =>
      tile.x >= 3 &&
      tile.x < map.cols - 3 &&
      tile.y >= 3 &&
      tile.y < map.rows - 3
    )).toBe(true);
  });

  test('room connection tile falls back to carved floor when center is not on floor', () => {
    const context = createBrowserContext();
    const { MapGen } = loadGloomvault('systems/MapGen.js', ['MapGen'], context);
    const map = new MapGen({ cols: 20, rows: 20, corridorWidth: 1, wobbleChance: 0, edgePaddingTiles: 3 }, 10);
    map.grid = new Array(400).fill(0);
    const room = {
      x: 4,
      y: 4,
      width: 8,
      height: 8,
      center: { x: 8, y: 8 },
      rects: [{ x: 4, y: 4, width: 3, height: 3 }]
    };
    map.carveRoom(room);

    const anchor = map.getRoomConnectionTile(room, { x: 15, y: 15 });

    expect([map.getTile(anchor.x, anchor.y), map.isTileInsideRoom(anchor.x, anchor.y, room)]).toEqual([1, true]);
  });

  test('cellular automata and distance picking cover close and accepted candidates', () => {
    const context = createBrowserContext();
    const { MapGen } = loadGloomvault('systems/MapGen.js', ['MapGen'], context);
    const map = new MapGen({ cols: 5, rows: 5 }, 10);
    map.grid = [
      0, 0, 0, 0, 0,
      0, 1, 1, 1, 0,
      0, 1, 0, 1, 0,
      0, 1, 1, 1, 0,
      0, 0, 0, 0, 0
    ];
    jest.spyOn(Math, 'random').mockReturnValue(0);

    map.applyCellularAutomata(1);
    const picked = map.pickWithDistance([{ x: 1, y: 1 }, { x: 3, y: 3 }], 2, [{ x: 15, y: 15 }], 5);

    expect([map.countAdjacentWalls(0, 0), picked]).toEqual([8, [{ x: 35, y: 35 }]]);
  });

  test('generation state clone and restore preserve nested room data', () => {
    const context = createBrowserContext();
    const { MapGen } = loadGloomvault('systems/MapGen.js', ['MapGen'], context);
    const map = new MapGen({ cols: 8, rows: 8 }, 10);
    map.grid = [1, 0, 1];
    map.visitedGrid = [true, false, true];
    map.rooms = [{
      x: 1,
      y: 2,
      width: 3,
      height: 4,
      center: { x: 2, y: 3 },
      rects: [{ x: 1, y: 2, width: 3, height: 4 }]
    }];
    map.bossRoom = {
      room: map.rooms[0],
      entranceTile: { x: 5, y: 6 },
      entranceWorld: { x: 50, y: 60 },
      bossSpawn: { x: 70, y: 80 },
      chestSpawns: [{ x: 90, y: 100 }],
      buttonPositions: [{ x: 110, y: 120 }]
    };
    map.mainReachableFloor = new Set(['1,2']);

    const state = map.cloneGenerationState({ score: 2, roomCount: 1 });
    map.grid = [];
    map.visitedGrid = [];
    map.rooms = [];
    map.bossRoom = null;
    map.mainReachableFloor = new Set();
    map.restoreGenerationState(state);

    expect([
      map.grid,
      map.visitedGrid,
      map.rooms[0].center,
      map.rooms[0].rects[0],
      map.bossRoom.entranceTile,
      map.bossRoom.chestSpawns[0],
      map.mainReachableFloor.has('1,2'),
      map.rooms[0] === state.rooms[0]
    ]).toEqual([
      [1, 0, 1],
      [true, false, true],
      { x: 2, y: 3 },
      { x: 1, y: 2, width: 3, height: 4 },
      { x: 5, y: 6 },
      { x: 90, y: 100 },
      true,
      false
    ]);
  });

  test('large object and tile distance pickers preserve their public result shapes', () => {
    const context = createBrowserContext();
    const { MapGen } = loadGloomvault('systems/MapGen.js', ['MapGen'], context);
    const map = new MapGen({ cols: 5, rows: 5 }, 10);
    jest.spyOn(Math, 'random').mockReturnValue(0);

    const large = map.pickLargeObjectPositions([{ x: 2, y: 3, worldX: 20, worldY: 30 }], 1, [], 1);
    const tile = map.pickWithDistance([{ x: 2, y: 3 }], 1, [], 1);

    expect([large, tile]).toEqual([
      [{ x: 20, y: 30, tileX: 2, tileY: 3 }],
      [{ x: 25, y: 35 }]
    ]);
  });

  test('door and hole queries return tile-centred positions', () => {
    const context = createBrowserContext();
    const { MapGen } = loadGloomvault('systems/MapGen.js', ['MapGen'], context);
    const map = new MapGen({ cols: 10, rows: 10 }, 10);
    map.grid = new Array(100).fill(0);
    map.grid[1 * 10 + 2] = 1;
    map.rooms = [{ rects: [] }, { rects: [{ x: 2, y: 2, width: 4, height: 4 }] }];
    map.grid[3 * 10 + 3] = 1;
    jest.spyOn(Math, 'random').mockReturnValue(0);

    expect([map.getDoorPositions(1), map.getHolePositions(1)]).toEqual([[{ x: 15, y: 15 }], [{ x: 35, y: 35 }]]);
  });

  test('all map configs expose selection metadata', () => {
    const context = createBrowserContext();
    const { MapConfigs } = loadGloomvault('config/MapConfig.js', ['MapConfigs'], context);
    const metadataComplete = Object.values(MapConfigs).every(config =>
      Boolean(config.displayName) &&
      Boolean(config.description) &&
      Boolean(config.layoutType) &&
      Number.isInteger(config.progressionTier)
    );

    expect([Object.keys(MapConfigs).length, metadataComplete]).toEqual([9, true]);
  });

  test('new layout types generate rooms and valid starts', () => {
    const context = createBrowserContext();
    const { MapConfigs } = loadGloomvault('config/MapConfig.js', ['MapConfigs'], context);
    const { MapGen } = loadGloomvault('systems/MapGen.js', ['MapGen'], context);
    const keys = ['crypt_crossroads', 'ironforged', 'fractured_rift', 'gauntlet_passage'];

    const results = keys.map(key => {
      const map = new MapGen(MapConfigs[key], 10);
      map.generate();
      const start = map.getStartPos();
      return {
        key,
        rooms: map.rooms.length,
        startIsFloor: map.getTile(Math.floor(start.x / map.tileSize), Math.floor(start.y / map.tileSize)) === 1,
        layoutType: MapConfigs[key].layoutType
      };
    });

    expect(results).toEqual([
      expect.objectContaining({ key: 'crypt_crossroads', layoutType: 'hub', startIsFloor: true, rooms: expect.any(Number) }),
      expect.objectContaining({ key: 'ironforged', layoutType: 'ring', startIsFloor: true, rooms: expect.any(Number) }),
      expect.objectContaining({ key: 'fractured_rift', layoutType: 'cluster', startIsFloor: true, rooms: expect.any(Number) }),
      expect.objectContaining({ key: 'gauntlet_passage', layoutType: 'linear', startIsFloor: true, rooms: expect.any(Number) })
    ]);
    expect(results.every(result => result.rooms > 0)).toBe(true);
  });

  test('generated layouts keep floors outside the shared edge padding band', () => {
    const context = createBrowserContext();
    const { MapConfigs } = loadGloomvault('config/MapConfig.js', ['MapConfigs'], context);
    const { MapGen } = loadGloomvault('systems/MapGen.js', ['MapGen'], context);
    const keys = ['default', 'crypt_crossroads', 'fractured_rift', 'gauntlet_passage'];

    const results = keys.map(key => {
      const map = new MapGen(MapConfigs[key], 10);
      map.generate();
      const padding = map.getEdgePaddingTiles();
      const floors = getFloorTiles(map);

      return {
        key,
        padding,
        floorCount: floors.length,
        allFloorsInsidePadding: floors.every(tile =>
          tile.x >= padding &&
          tile.x < map.cols - padding &&
          tile.y >= padding &&
          tile.y < map.rows - padding
        )
      };
    });

    expect(results.every(result => result.floorCount > 0)).toBe(true);
    expect(results.every(result => result.padding >= 1)).toBe(true);
    expect(results.every(result => result.allFloorsInsidePadding)).toBe(true);
  });

  test('connectivity repair gives isolated rooms an outward opening', () => {
    const context = createBrowserContext();
    const { MapGen } = loadGloomvault('systems/MapGen.js', ['MapGen'], context);
    const map = new MapGen({ cols: 30, rows: 30, corridorWidth: 1, wobbleChance: 0, edgePaddingTiles: 3 }, 10);
    map.grid = new Array(900).fill(0);
    map.rooms = [
      { rects: [{ x: 4, y: 4, width: 4, height: 4 }], x: 4, y: 4, width: 4, height: 4, center: { x: 5, y: 5 } },
      { rects: [{ x: 20, y: 20, width: 4, height: 4 }], x: 20, y: 20, width: 4, height: 4, center: { x: 21, y: 21 } }
    ];
    map.carveRoom(map.rooms[0]);
    map.carveRoom(map.rooms[1]);

    expect(roomHasBoundaryOpening(map, map.rooms[1])).toBe(false);
    map.ensureMainRoomConnectivity();

    expect(roomHasBoundaryOpening(map, map.rooms[1])).toBe(true);
    expect(map.getDisconnectedMainRooms()).toHaveLength(0);
  });

  test('unreachable floor islands are pruned and dead rooms removed', () => {
    const context = createBrowserContext();
    const { MapGen } = loadGloomvault('systems/MapGen.js', ['MapGen'], context);
    const map = new MapGen({ cols: 20, rows: 20, corridorWidth: 1, wobbleChance: 0, edgePaddingTiles: 3 }, 10);
    map.grid = new Array(400).fill(0);
    map.rooms = [
      { rects: [{ x: 4, y: 4, width: 4, height: 4 }], x: 4, y: 4, width: 4, height: 4, center: { x: 5, y: 5 } },
      { rects: [{ x: 14, y: 14, width: 3, height: 3 }], x: 14, y: 14, width: 3, height: 3, center: { x: 15, y: 15 } }
    ];
    map.carveRoom(map.rooms[0]);
    map.carveRoom(map.rooms[1]);
    map.refreshMainReachableFloor();

    expect(map.getTile(15, 15)).toBe(1);
    map.pruneUnreachableIslands();

    expect([map.getTile(15, 15), map.rooms.length, map.rooms[0].center]).toEqual([0, 1, { x: 5, y: 5 }]);
  });

  test('reachable-aware floor lookups avoid pruned islands for start and nearest-floor queries', () => {
    const context = createBrowserContext();
    const { MapGen } = loadGloomvault('systems/MapGen.js', ['MapGen'], context);
    const map = new MapGen({ cols: 20, rows: 20, corridorWidth: 1, wobbleChance: 0, edgePaddingTiles: 3 }, 10);
    map.grid = new Array(400).fill(0);
    map.rooms = [
      { rects: [{ x: 4, y: 4, width: 4, height: 4 }], x: 4, y: 4, width: 4, height: 4, center: { x: 5, y: 5 } }
    ];
    map.carveRoom(map.rooms[0]);
    map.grid[14 * map.cols + 14] = 1;
    map.mainReachableFloor = new Set(['5,5']);

    expect([map.getValidFloorPosNear(14, 14), map.getStartPos()]).toEqual([{ x: 55, y: 55 }, { x: 55, y: 55 }]);
  });

  test('large object placement requires reachable two-by-two floors outside the start room', () => {
    const context = createBrowserContext();
    const { MapGen } = loadGloomvault('systems/MapGen.js', ['MapGen'], context);
    const map = new MapGen({ cols: 20, rows: 20, edgePaddingTiles: 2 }, 10);
    map.grid = new Array(400).fill(0);
    map.rooms = [
      { rects: [{ x: 2, y: 2, width: 4, height: 4 }], x: 2, y: 2, width: 4, height: 4, center: { x: 3, y: 3 } },
      { rects: [{ x: 10, y: 10, width: 5, height: 5 }], x: 10, y: 10, width: 5, height: 5, center: { x: 12, y: 12 } }
    ];
    map.rooms.forEach(room => map.carveRoom(room));
    map.mainReachableFloor = new Set(['11,11', '12,11', '11,12', '12,12']);
    jest.spyOn(Math, 'random').mockReturnValue(0);

    const blockedByDistance = map.getLargeObjectPositions(1, [{ x: 120, y: 120 }], 50);
    const placed = map.getLargeObjectPositions(1, [], 0);

    expect([blockedByDistance, placed]).toEqual([[], [{ x: 120, y: 120, tileX: 11, tileY: 11 }]]);
  });

  test('boss room generation seals one entrance and creates button metadata', () => {
    const context = createBrowserContext();
    const { MapGen } = loadGloomvault('systems/MapGen.js', ['MapGen'], context);
    const map = new MapGen({
      cols: 60,
      rows: 60,
      minRoomSize: 5,
      maxRoomSize: 9,
      perfectSquareChance: 1,
      blobMinRects: 1,
      blobMaxRects: 1,
      corridorWidth: 1,
      wobbleChance: 0,
      smoothingPasses: 0,
      bossRoomChance: 1
    }, 10);

    map.grid = new Array(3600).fill(0);
    const startRoom = { rects: [{ x: 4, y: 4, width: 7, height: 7 }], x: 4, y: 4, width: 7, height: 7, center: { x: 7, y: 7 } };
    const anchorRoom = { rects: [{ x: 14, y: 18, width: 7, height: 7 }], x: 14, y: 18, width: 7, height: 7, center: { x: 17, y: 21 } };
    map.rooms = [startRoom, anchorRoom];
    map.carveRoom(startRoom);
    map.carveRoom(anchorRoom);
    [{ x: 5, y: 50 }, { x: 50, y: 5 }, { x: 50, y: 50 }].forEach(tile => {
      map.grid[tile.y * map.cols + tile.x] = 1;
    });
    jest.spyOn(Math, 'random').mockReturnValue(0);

    const bossRoom = map.tryGenerateBossRoom();
    const lockedTile = map.getTile(bossRoom.entranceTile.x, bossRoom.entranceTile.y);
    const unlocked = map.unlockBossRoomEntrance();
    const unlockedTile = map.getTile(bossRoom.entranceTile.x, bossRoom.entranceTile.y);
    const opened = map.openBossRoomEntrance();
    const openedTile = map.getTile(bossRoom.entranceTile.x, bossRoom.entranceTile.y);

    expect([Boolean(bossRoom), lockedTile, unlocked, unlockedTile, opened, openedTile, bossRoom.buttonPositions.length])
      .toEqual([true, 0, true, 0, true, 1, 3]);
    expect(bossRoom.buttonPositions.every(pos => !map.isTileInsideRoom(Math.floor(pos.x / map.tileSize), Math.floor(pos.y / map.tileSize), bossRoom.room))).toBe(true);
  });

  test('boss room placement honors the edge padding margin', () => {
    const context = createBrowserContext();
    const { MapGen } = loadGloomvault('systems/MapGen.js', ['MapGen'], context);
    const map = new MapGen({
      cols: 40,
      rows: 40,
      minRoomSize: 5,
      maxRoomSize: 9,
      perfectSquareChance: 1,
      blobMinRects: 1,
      blobMaxRects: 1,
      corridorWidth: 1,
      wobbleChance: 0,
      smoothingPasses: 0,
      edgePaddingTiles: 4
    }, 10);
    map.grid = new Array(map.cols * map.rows).fill(0);

    expect(map.canPlaceBossRoom({ x: 3, y: 10, width: 8, height: 8 })).toBe(false);
    expect(map.canPlaceBossRoom({ x: 10, y: 10, width: 8, height: 8 })).toBe(true);
  });

  test('boss room candidate validation rejects disconnected opened entrances', () => {
    const context = createBrowserContext();
    const { MapGen } = loadGloomvault('systems/MapGen.js', ['MapGen'], context);
    const map = new MapGen({
      cols: 30,
      rows: 30,
      minRoomSize: 5,
      maxRoomSize: 9,
      perfectSquareChance: 1,
      blobMinRects: 1,
      blobMaxRects: 1,
      corridorWidth: 1,
      wobbleChance: 0,
      smoothingPasses: 0,
      edgePaddingTiles: 3
    }, 10);
    map.grid = new Array(map.cols * map.rows).fill(0);
    const anchor = { rects: [{ x: 5, y: 5, width: 5, height: 5 }], x: 5, y: 5, width: 5, height: 5, center: { x: 7, y: 7 } };
    map.carveRoom(anchor);

    const blockedCandidate = {
      room: { rects: [{ x: 18, y: 18, width: 7, height: 7 }], x: 18, y: 18, width: 7, height: 7, center: { x: 21, y: 21 } },
      entrance: { x: 16, y: 16 },
      corridorTiles: [],
      chestTile: { x: 21, y: 21 }
    };

    expect(map.canReachBossRoomCandidate(blockedCandidate, anchor)).toBe(false);
  });

  test('boss room generation respects failed chance rolls', () => {
    const context = createBrowserContext();
    const { MapGen } = loadGloomvault('systems/MapGen.js', ['MapGen'], context);
    const map = new MapGen({
      cols: 30,
      rows: 30,
      layoutType: 'sequential',
      numRooms: 0,
      minRoomSize: 4,
      maxRoomSize: 6,
      perfectSquareChance: 1,
      blobMinRects: 1,
      blobMaxRects: 1,
      corridorWidth: 1,
      wobbleChance: 0,
      smoothingPasses: 0,
      bossRoomChance: 0
    }, 10);
    jest.spyOn(Math, 'random').mockReturnValue(0.99);

    map.generate();

    expect(map.bossRoom).toBe(null);
  });

  test('engine spawns dungeon services from rare rolls and tracks them', () => {
    const context = createBrowserContext();
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const { BlacksmithObject, VoidBankObject, HealingWellObject } = loadGloomvault('entities/DungeonServiceObject.js', ['BlacksmithObject', 'VoidBankObject', 'HealingWellObject'], context);
    const { GameEngine } = loadGloomvault('core/GameEngine.js', ['GameEngine'], context);
    const engine = Object.assign(Object.create(GameEngine.prototype), {
      tileSize: 64,
      dungeonServices: [],
      portal: null,
      floorTransitions: [],
      lootChests: [],
      bossRoomButtons: [],
      mapGen: {
        getLargeObjectPositions: jest.fn()
          .mockReturnValueOnce([{ x: 128, y: 128 }])
          .mockReturnValueOnce([{ x: 320, y: 320 }])
          .mockReturnValueOnce([{ x: 448, y: 448 }])
      }
    });
    context.BlacksmithObject = BlacksmithObject;
    context.VoidBankObject = VoidBankObject;
    context.HealingWellObject = HealingWellObject;
    jest.spyOn(Math, 'random').mockReturnValue(0);

    engine.spawnDungeonServices({ x: 0, y: 0 });

    expect([
      engine.dungeonServices.map(service => service.kind),
      engine.mapGen.getLargeObjectPositions.mock.calls.length
    ]).toEqual([['blacksmith', 'bank', 'healingWell'], 3]);
  });

  test('dev helper spawns dungeon services in front of the player', () => {
    const context = createBrowserContext();
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const { BlacksmithObject, VoidBankObject, HealingWellObject } = loadGloomvault('entities/DungeonServiceObject.js', ['BlacksmithObject', 'VoidBankObject', 'HealingWellObject'], context);
    const { GameEngine } = loadGloomvault('core/GameEngine.js', ['GameEngine'], context);
    context.BlacksmithObject = BlacksmithObject;
    context.VoidBankObject = VoidBankObject;
    context.HealingWellObject = HealingWellObject;
    const engine = Object.assign(Object.create(GameEngine.prototype), {
      dungeonServices: [],
      getDevSpawnPosition: jest.fn(() => ({ x: 400, y: 500 }))
    });

    const blacksmith = engine.spawnDevDungeonService('blacksmith');
    const bank = engine.spawnDevDungeonService('bank');
    const well = engine.spawnDevDungeonService('healingWell');
    const unknown = engine.spawnDevDungeonService('unknown');

    expect([
      blacksmith.kind,
      bank.kind,
      well.kind,
      unknown,
      engine.dungeonServices.map(service => service.kind),
      engine.getDevSpawnPosition.mock.calls.map(call => call[0])
    ]).toEqual([
      'blacksmith',
      'bank',
      'healingWell',
      null,
      ['blacksmith', 'bank', 'healingWell'],
      [120, 120, 120, 120]
    ]);
  });

  test('dungeon service variants stay in range and map to sprite keys', () => {
    const context = createBrowserContext();
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const { BlacksmithObject, VoidBankObject, HealingWellObject } = loadGloomvault('entities/DungeonServiceObject.js', ['BlacksmithObject', 'VoidBankObject', 'HealingWellObject'], context);

    const blacksmith = new BlacksmithObject(128, 256);
    const bank = new VoidBankObject(320, 448);
    const explicit = new BlacksmithObject(0, 0, { variant: 3 });
    const well = new HealingWellObject(512, 640);
    const closedWell = new HealingWellObject(512, 640, { variant: 2, closed: true });

    expect([
      blacksmith.variant >= 1 && blacksmith.variant <= 3,
      bank.variant >= 1 && bank.variant <= 3,
      well.variant >= 1 && well.variant <= 2,
      blacksmith.getSpriteKey(),
      bank.getSpriteKey(),
      well.getSpriteKey(),
      closedWell.getSpriteKey(),
      explicit.variant,
      explicit.getSpriteKey()
    ]).toEqual([
      true,
      true,
      true,
      `sprites.service.blacksmith.${blacksmith.variant}`,
      `sprites.service.bank.${bank.variant}`,
      `sprites.service.healingWell.${well.variant}`,
      'sprites.service.healingWell.2.closed',
      3,
      'sprites.service.blacksmith.3'
    ]);
  });

  test('dungeon service render prefers sprite assets and falls back to primitive art', () => {
    const context = createBrowserContext();
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const { BlacksmithObject } = loadGloomvault('entities/DungeonServiceObject.js', ['BlacksmithObject'], context);

    const ctx = {
      save: jest.fn(),
      restore: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      fillText: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      stroke: jest.fn(),
      shadowColor: '',
      shadowBlur: 0,
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      globalAlpha: 1,
      font: '',
      textAlign: '',
      textBaseline: ''
    };
    const renderer = {
      camera: { worldToScreen: () => ({ x: 100, y: 120 }) },
      drawAsset: jest.fn(() => true)
    };
    const service = new BlacksmithObject(100, 120, { variant: 2 });

    service.render(ctx, renderer);
    expect([
      renderer.drawAsset.mock.calls[0][0],
      ctx.fillRect.mock.calls.length,
      ctx.fillText.mock.calls.some(call => call[0] === 'Blacksmith')
    ]).toEqual([
      'sprites.service.blacksmith.2',
      0,
      true
    ]);

    renderer.drawAsset.mockReturnValue(false);
    service.render(ctx, renderer);
    expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(0);
  });

  test('pruning does not remove sealed boss room tiles', () => {
    const context = createBrowserContext();
    const { MapGen } = loadGloomvault('systems/MapGen.js', ['MapGen'], context);
    const map = new MapGen({ cols: 25, rows: 25, corridorWidth: 1, wobbleChance: 0, edgePaddingTiles: 3 }, 10);
    map.grid = new Array(625).fill(0);
    map.rooms = [
      { rects: [{ x: 4, y: 4, width: 5, height: 5 }], x: 4, y: 4, width: 5, height: 5, center: { x: 6, y: 6 } }
    ];
    map.carveRoom(map.rooms[0]);
    const bossRoom = { rects: [{ x: 15, y: 15, width: 5, height: 5 }], x: 15, y: 15, width: 5, height: 5, center: { x: 17, y: 17 }, isBossRoom: true };
    map.carveRoom(bossRoom);
    map.bossRoom = { room: bossRoom, entranceTile: { x: 14, y: 17 }, unlocked: false, opened: false };
    map.rooms.push(bossRoom);
    map.refreshMainReachableFloor();

    map.pruneUnreachableIslands();

    expect([map.getTile(17, 17), map.rooms.some(room => room.isBossRoom)]).toEqual([1, true]);
  });

  test('connectivity helper reconnects disconnected main rooms without opening boss locks', () => {
    const context = createBrowserContext();
    const { MapGen } = loadGloomvault('systems/MapGen.js', ['MapGen'], context);
    const map = new MapGen({ cols: 20, rows: 20, corridorWidth: 1, wobbleChance: 0 }, 10);
    map.grid = new Array(400).fill(0);
    map.rooms = [
      { rects: [{ x: 2, y: 2, width: 3, height: 3 }], x: 2, y: 2, width: 3, height: 3, center: { x: 3, y: 3 } },
      { rects: [{ x: 14, y: 14, width: 3, height: 3 }], x: 14, y: 14, width: 3, height: 3, center: { x: 15, y: 15 } }
    ];
    map.rooms.forEach(room => map.carveRoom(room));
    map.bossRoom = { room: { isBossRoom: true }, entranceTile: { x: 18, y: 1 }, unlocked: false, opened: false };
    map.grid[1 * map.cols + 18] = 0;

    const before = map.getDisconnectedMainRooms().length;
    map.ensureMainRoomConnectivity();
    const after = map.getDisconnectedMainRooms().length;

    expect([before, after, map.getTile(18, 1), map.bossRoom.unlocked, map.bossRoom.opened]).toEqual([1, 0, 0, false, false]);
  });

  test('problem layouts keep every main room reachable and boss room reachable after opening', () => {
    const context = createBrowserContext();
    const { MapConfigs } = loadGloomvault('config/MapConfig.js', ['MapConfigs'], context);
    const { MapGen } = loadGloomvault('systems/MapGen.js', ['MapGen'], context);
    const keys = ['rigid_dungeon', 'the_labyrinth', 'arena_halls'];

    const results = keys.flatMap(key => Array.from({ length: 12 }, () => {
      const map = new MapGen(MapConfigs[key], 10);
      map.generate();
      const disconnected = map.getDisconnectedMainRooms().length;
      const allRoomsHaveOpenings = map.rooms.length <= 1 || map.rooms.every(room => roomHasBoundaryOpening(map, room));
      let bossReachableAfterOpen = true;

      if (map.bossRoom) {
        map.unlockBossRoomEntrance();
        map.openBossRoomEntrance();
        const reachable = map.getReachableFloorSet(map.getRoomConnectionTile(map.rooms[0], map.rooms[0].center));
        bossReachableAfterOpen = reachable.has(map.getRoomReachableKey(map.bossRoom.room));
      }

      return { key, disconnected, allRoomsHaveOpenings, bossReachableAfterOpen };
    }));

    expect(results.every(result => result.disconnected === 0)).toBe(true);
    expect(results.every(result => result.allRoomsHaveOpenings)).toBe(true);
    expect(results.every(result => result.bossReachableAfterOpen)).toBe(true);
  });

  test('the labyrinth leaves no unreachable non-boss floor islands after pruning', () => {
    const context = createBrowserContext();
    const { MapConfigs } = loadGloomvault('config/MapConfig.js', ['MapConfigs'], context);
    const { MapGen } = loadGloomvault('systems/MapGen.js', ['MapGen'], context);

    const results = Array.from({ length: 20 }, () => {
      const map = new MapGen(MapConfigs.the_labyrinth, 10);
      map.generate();
      const reachable = map.mainReachableFloor.size > 0 ? map.mainReachableFloor : map.refreshMainReachableFloor();
      const unreachableNonBossFloor = getFloorTiles(map).some(tile => {
        if (reachable.has(`${tile.x},${tile.y}`)) return false;
        return !(map.bossRoom && map.isTileInsideRoom(tile.x, tile.y, map.bossRoom.room));
      });

      return {
        disconnected: map.getDisconnectedMainRooms().length,
        unreachableNonBossFloor,
        startOnReachableFloor: reachable.has(`${Math.floor(map.getStartPos().x / map.tileSize)},${Math.floor(map.getStartPos().y / map.tileSize)}`)
      };
    });

    expect(results.every(result => result.disconnected === 0)).toBe(true);
    expect(results.every(result => !result.unreachableNonBossFloor)).toBe(true);
    expect(results.every(result => result.startOnReachableFloor)).toBe(true);
  });

  test('ironforged single-ring variant generates a thick ring with reachable inward and outward rooms', () => {
    const context = createBrowserContext();
    const { MapConfigs } = loadGloomvault('config/MapConfig.js', ['MapConfigs'], context);
    const { MapGen } = loadGloomvault('systems/MapGen.js', ['MapGen'], context);
    const map = new MapGen(MapConfigs.ironforged, 10);
    map.chooseRingLayoutVariant = () => 'single';
    map.generate();

    const centerX = Math.floor(map.cols / 2);
    const centerY = Math.floor(map.rows / 2);
    const ringRadius = MapConfigs.ironforged.ringRadiusTiles;
    const ringTiles = [
      { x: centerX + ringRadius, y: centerY },
      { x: centerX - ringRadius, y: centerY },
      { x: centerX, y: centerY + ringRadius },
      { x: centerX, y: centerY - ringRadius }
    ];
    const rooms = map.rooms.filter(room => !room.isBossRoom);
    const outwardRooms = rooms.filter(room => Math.hypot(room.center.x - centerX, room.center.y - centerY) > ringRadius + 2);
    const inwardRooms = rooms.filter(room => Math.hypot(room.center.x - centerX, room.center.y - centerY) < ringRadius - 4);

    expect(ringTiles.every(tile => map.getTile(tile.x, tile.y) === 1)).toBe(true);
    expect(outwardRooms.length).toBeGreaterThan(0);
    expect(inwardRooms.length).toBeGreaterThan(0);
    expect(map.getDisconnectedMainRooms()).toHaveLength(0);
  });

  test('ironforged double-side variant carves two reachable rings with bridges', () => {
    const context = createBrowserContext();
    const { MapConfigs } = loadGloomvault('config/MapConfig.js', ['MapConfigs'], context);
    const { MapGen } = loadGloomvault('systems/MapGen.js', ['MapGen'], context);
    const map = new MapGen(MapConfigs.ironforged, 10);
    map.chooseRingLayoutVariant = () => 'double_side';
    map.generate();

    const centerY = Math.floor(map.rows / 2);
    const centerX = Math.floor(map.cols / 2);
    const primaryRadius = MapConfigs.ironforged.ringRadiusTiles;
    const secondaryRadius = MapConfigs.ironforged.secondaryRingRadiusTiles;
    const primaryOuter = primaryRadius + MapConfigs.ironforged.ringThicknessTiles / 2;
    const secondaryOuter = secondaryRadius + MapConfigs.ironforged.secondaryRingThicknessTiles / 2;
    const centerDistance = primaryOuter + secondaryOuter + MapConfigs.ironforged.ringSeparationTiles;
    const leftCenterX = Math.round(centerX - centerDistance / 2);
    const rightCenterX = Math.round(centerX + centerDistance / 2);
    const bridgeYOffset = Math.max(3, Math.floor(Math.min(MapConfigs.ironforged.ringThicknessTiles, MapConfigs.ironforged.secondaryRingThicknessTiles) / 2));
    const leftRingTile = { x: leftCenterX - primaryRadius, y: centerY };
    const rightRingTile = { x: rightCenterX + secondaryRadius, y: centerY };
    const bridgeMidpoint = { x: Math.round((leftCenterX + rightCenterX) / 2), y: centerY - bridgeYOffset };

    expect(map.getTile(leftRingTile.x, leftRingTile.y)).toBe(1);
    expect(map.getTile(rightRingTile.x, rightRingTile.y)).toBe(1);
    expect(map.getTile(bridgeMidpoint.x, bridgeMidpoint.y)).toBe(1);
    expect(map.getDisconnectedMainRooms()).toHaveLength(0);
  });

  test('ironforged outer-expansion variant adds a larger outer ring and outside rooms', () => {
    const context = createBrowserContext();
    const { MapConfigs } = loadGloomvault('config/MapConfig.js', ['MapConfigs'], context);
    const { MapGen } = loadGloomvault('systems/MapGen.js', ['MapGen'], context);
    const map = new MapGen(MapConfigs.ironforged, 10);
    map.chooseRingLayoutVariant = () => 'outer_expansion';
    map.generate();

    const centerX = Math.floor(map.cols / 2);
    const centerY = Math.floor(map.rows / 2);
    const mainRadius = MapConfigs.ironforged.ringRadiusTiles;
    const outerRadius = MapConfigs.ironforged.outerExpansionRadiusTiles;
    const rooms = map.rooms.filter(room => !room.isBossRoom);
    const firstBeltRooms = rooms.filter(room => {
      const distance = Math.hypot(room.center.x - centerX, room.center.y - centerY);
      return distance > mainRadius + 2 && distance < outerRadius - 2;
    });
    const outerRingRooms = rooms.filter(room => Math.hypot(room.center.x - centerX, room.center.y - centerY) > outerRadius + 2);

    expect(map.getTile(centerX + outerRadius, centerY)).toBe(1);
    expect(map.getTile(centerX, centerY - outerRadius)).toBe(1);
    expect(firstBeltRooms.length).toBeGreaterThan(0);
    expect(outerRingRooms.length).toBeGreaterThan(0);
    expect(map.getDisconnectedMainRooms()).toHaveLength(0);
  });

  test('ironforged variant chooser respects configured weights', () => {
    const context = createBrowserContext();
    const { MapConfigs } = loadGloomvault('config/MapConfig.js', ['MapConfigs'], context);
    const { MapGen } = loadGloomvault('systems/MapGen.js', ['MapGen'], context);
    const map = new MapGen(MapConfigs.ironforged, 10);
    const randomSpy = jest.spyOn(Math, 'random');

    randomSpy.mockReturnValueOnce(0.10);
    const single = map.chooseRingLayoutVariant();
    randomSpy.mockReturnValueOnce(0.60);
    const doubleSide = map.chooseRingLayoutVariant();
    randomSpy.mockReturnValueOnce(0.90);
    const outerExpansion = map.chooseRingLayoutVariant();
    randomSpy.mockRestore();

    expect([single, doubleSide, outerExpansion]).toEqual(['single', 'double_side', 'outer_expansion']);
  });

  test('ironforged repeated generations keep reachable rooms and no unreachable non-boss islands', () => {
    const context = createBrowserContext();
    const { MapConfigs } = loadGloomvault('config/MapConfig.js', ['MapConfigs'], context);
    const { MapGen } = loadGloomvault('systems/MapGen.js', ['MapGen'], context);

    const results = Array.from({ length: 20 }, () => {
      const map = new MapGen(MapConfigs.ironforged, 10);
      map.generate();
      const reachable = map.mainReachableFloor.size > 0 ? map.mainReachableFloor : map.refreshMainReachableFloor();
      const unreachableNonBossFloor = getFloorTiles(map).some(tile => {
        if (reachable.has(`${tile.x},${tile.y}`)) return false;
        return !(map.bossRoom && map.isTileInsideRoom(tile.x, tile.y, map.bossRoom.room));
      });

      return {
        variant: map.lastRingLayoutVariant,
        disconnected: map.getDisconnectedMainRooms().length,
        unreachableNonBossFloor,
        startOnReachableFloor: reachable.has(`${Math.floor(map.getStartPos().x / map.tileSize)},${Math.floor(map.getStartPos().y / map.tileSize)}`)
      };
    });

    expect(results.some(result => result.variant === 'single')).toBe(true);
    expect(results.some(result => result.variant !== 'single')).toBe(true);
    expect(results.every(result => result.disconnected === 0)).toBe(true);
    expect(results.every(result => !result.unreachableNonBossFloor)).toBe(true);
    expect(results.every(result => result.startOnReachableFloor)).toBe(true);
  });

  test('arena halls always finishes with 3 to 5 main rooms', () => {
    const context = createBrowserContext();
    const { MapConfigs } = loadGloomvault('config/MapConfig.js', ['MapConfigs'], context);
    const { MapGen } = loadGloomvault('systems/MapGen.js', ['MapGen'], context);

    const counts = Array.from({ length: 30 }, () => {
      const map = new MapGen(MapConfigs.arena_halls, 10);
      map.generate();
      return map.rooms.filter(room => !room.isBossRoom).length;
    });

    expect(counts.every(count => count >= 3 && count <= 5)).toBe(true);
  });

  test('generate retries until final room count enters configured range', () => {
    const context = createBrowserContext();
    const { MapGen } = loadGloomvault('systems/MapGen.js', ['MapGen'], context);
    const map = new MapGen({ cols: 20, rows: 20, minFinalRooms: 3, maxFinalRooms: 5, generationRetryLimit: 4 }, 10);
    const counts = [1, 2, 4];
    const originalRunGenerationPass = map.runGenerationPass.bind(map);
    let attempts = 0;

    map.runGenerationPass = function mockRunGenerationPass() {
      const count = counts[Math.min(attempts, counts.length - 1)];
      this.grid = new Array(this.cols * this.rows).fill(0);
      this.visitedGrid = new Array(this.cols * this.rows).fill(false);
      this.rooms = Array.from({ length: count }, (_, index) => ({
        x: index,
        y: index,
        width: 1,
        height: 1,
        center: { x: index, y: index },
        rects: [{ x: index, y: index, width: 1, height: 1 }]
      }));
      this.bossRoom = null;
      this.mainReachableFloor = new Set();
      attempts++;
    };

    map.generate();

    expect([attempts, map.rooms.filter(room => !room.isBossRoom).length]).toEqual([3, 4]);
    map.runGenerationPass = originalRunGenerationPass;
  });
});

// Behaviour under test: GameEngine keeps selected map styles run-scoped and falls back safely.
describe('Gloomvault GameEngine map selection', () => {
  afterEach(() => jest.restoreAllMocks());

  function loadEngineWithStubs() {
    const canvas = {
      width: 800,
      height: 600,
      parentElement: { getBoundingClientRect: () => ({ width: 800, height: 600 }) },
      getContext: jest.fn(() => ({}))
    };
    const context = createBrowserContext({
      document: {
        getElementById: jest.fn((id) => {
          if (id === 'game-canvas') return canvas;
          return { classList: { add: jest.fn(), remove: jest.fn() }, style: {} };
        })
      },
      addEventListener: jest.fn(),
      Input: class Input { attach() {} },
      Camera: class Camera {
        constructor(width, height) { Object.assign(this, { width, height }); }
        updateDimensions(width, height) { Object.assign(this, { width, height }); }
        setBounds(width, height) { Object.assign(this, { boundWidth: width, boundHeight: height }); }
        setZoom(zoom) { this.zoom = zoom; }
      },
      Renderer: class Renderer { setCamera() {} },
      MapGen: class MapGen {
        constructor(config, tileSize) {
          Object.assign(this, { config, tileSize, cols: config.cols, rows: config.rows });
          this.rooms = [{ center: { x: 1, y: 1 } }, { center: { x: 2, y: 2 } }];
          this.bossRoom = null;
        }
        generate() {}
        getStartPos() { return { x: 64, y: 64 }; }
        getValidFloorPosNear(x, y) { return { x: x * this.tileSize, y: y * this.tileSize }; }
        getDoorPositions() { return []; }
        getHolePositions() { return []; }
      },
      Pathfinder: class Pathfinder {},
      SpawnManager: class SpawnManager { populateMap() {} },
      CombatFeedback: class CombatFeedback { addText() {} },
      ParticleSystem: class ParticleSystem {},
      LootGen: class LootGen {},
      Player: class Player {
        constructor(x, y) {
          Object.assign(this, { x, y, equipment: {}, inventory: [], projectiles: [] });
        }
        recalculateStats() {}
      },
      ExtractionPortal: class ExtractionPortal {},
      LootChest: class LootChest {},
      FloorTransition: class FloorTransition {},
      BossRoomButton: class BossRoomButton {},
      localStorage: {
        getItem: jest.fn(() => null),
        setItem: jest.fn(),
        removeItem: jest.fn()
      }
    });

    context.window = context;
    context.globalThis = context;
    loadGloomvault('config/MapConfig.js', ['MapConfigs'], context);
    loadGloomvault('systems/FloorOrchestrator.js', ['FloorOrchestrator'], context);
    const { GameEngine } = loadGloomvault('core/GameEngine.js', ['GameEngine'], context);
    return { engine: new GameEngine('game-canvas'), MapConfigs: context.MapConfigs };
  }

  test('specific map selection persists across generated floors', () => {
    const { engine, MapConfigs } = loadEngineWithStubs();
    engine.setRunMapSelection('deep_caverns');

    engine.generateFloor(false);
    const firstConfig = engine.currentMapConfig;
    engine.generateFloor(true);

    expect([engine.runMapSelection, firstConfig, engine.currentMapConfig, engine.currentMapKey])
      .toEqual(['deep_caverns', MapConfigs.deep_caverns, MapConfigs.deep_caverns, 'deep_caverns']);
  });

  test('new map selections are accepted', () => {
    const { engine, MapConfigs } = loadEngineWithStubs();
    const keys = ['crypt_crossroads', 'ironforged', 'fractured_rift', 'gauntlet_passage'];

    const selected = keys.map(key => {
      engine.setRunMapSelection(key);
      engine.generateFloor(false);
      return [engine.runMapSelection, engine.currentMapKey, engine.currentMapConfig === MapConfigs[key]];
    });

    expect(selected).toEqual(keys.map(key => [key, key, true]));
  });

  test('random and invalid selections use safe random map selection', () => {
    const { engine, MapConfigs } = loadEngineWithStubs();
    jest.spyOn(Math, 'random').mockReturnValue(0.99);

    engine.setRunMapSelection('random');
    engine.generateFloor(false);
    const randomKey = engine.currentMapKey;

    engine.setRunMapSelection('missing_map');
    engine.generateFloor(true);

    expect([
      Object.keys(MapConfigs).includes(randomKey),
      engine.runMapSelection,
      Object.keys(MapConfigs).includes(engine.currentMapKey),
      Boolean(engine.currentMapConfig)
    ]).toEqual([true, 'random', true, true]);
  });

  test('minimap info shows current floor and map display name', () => {
    const classList = { add: jest.fn(), remove: jest.fn() };
    const hud = { classList, style: {} };
    const info = { style: {} };
    const floorLabel = { textContent: '' };
    const mapLabel = { textContent: '' };
    const elements = {
      'minimap-hud': hud,
      'minimap-info': info,
      'minimap-floor-label': floorLabel,
      'minimap-map-label': mapLabel
    };
    const context = createBrowserContext({
      document: { getElementById: jest.fn(id => elements[id] || null) },
      MinimapConfig: { yOffset: 20, xOffset: 24, expandedWidth: 800 }
    });
    const { GameEngine } = loadGloomvault('core/GameEngine.js', ['GameEngine'], context);
    const engine = Object.assign(Object.create(GameEngine.prototype), {
      canvas: { clientWidth: 1200, clientHeight: 900 },
      currentFloor: 7,
      currentMapKey: 'crypt_crossroads',
      currentMapConfig: { displayName: 'Crypt Crossroads' },
      showMinimap: true
    });

    engine.updateMinimapInfoUI();
    engine.showMinimap = false;
    engine.updateMinimapInfoUI();

    expect([
      floorLabel.textContent,
      mapLabel.textContent,
      hud.style.top,
      hud.style.right,
      hud.style.width,
      info.style.width,
      classList.remove.mock.calls[0][0],
      classList.add.mock.calls[0][0]
    ]).toEqual(['Floor 7', 'Crypt Crossroads', '316px', '24px', '288px', '100%', 'hidden', 'hidden']);
  });

  test('minimap render config converts CSS layout to canvas backing pixels', () => {
    const context = createBrowserContext({
      MinimapConfig: {
        width: 300,
        height: 300,
        expandedWidth: 800,
        xOffset: 20,
        yOffset: 20,
        tileScale: 4
      }
    });
    const { GameEngine } = loadGloomvault('core/GameEngine.js', ['GameEngine'], context);
    const engine = Object.assign(Object.create(GameEngine.prototype), {
      canvas: {
        width: 1600,
        height: 900,
        clientWidth: 800,
        clientHeight: 450
      }
    });

    const config = engine.getMinimapRenderConfig({ width: 280, height: 240, xOffset: 18, yOffset: 16 });

    expect([config.width, config.height, config.xOffset, config.yOffset, config.tileScale, config.pixelScale])
      .toEqual([560, 480, 36, 32, 8, 2]);
  });

  test('inventory map panes stay equal and shrink within viewport bounds', () => {
    const context = createBrowserContext();
    const { GameEngine } = loadGloomvault('core/GameEngine.js', ['GameEngine'], context);
    const engine = Object.create(GameEngine.prototype);

    const desktop = engine.getInventoryPaneLayout(1280, 900, 50);
    const large = engine.getInventoryPaneLayout(1200, 1200, 50);
    const zoomed = engine.getInventoryPaneLayout(700, 420, 50);

    expect([
      desktop.paneSize,
      desktop.panePadding,
      desktop.paneSize * 2 + desktop.gap + 24 <= 1280 - 32,
      desktop.contentScale < 1,
      large.panePadding,
      large.gap,
      large.innerPaneSize,
      zoomed.paneSize,
      zoomed.paneSize * 2 + zoomed.gap + 24 <= 700 - 32,
      zoomed.paneSize + 24 <= 420 - 32 - 50,
      zoomed.contentScale
    ]).toEqual([606, 12, true, true, 24, 16, 510, 314, true, true, expect.closeTo(288 / 620, 5)]);
  });

  test('generateFloor adds a fallback exit when no portal doors or holes exist', () => {
    const canvas = {
      width: 800,
      height: 600,
      parentElement: { getBoundingClientRect: () => ({ width: 800, height: 600 }) },
      getContext: jest.fn(() => ({}))
    };
    const context = createBrowserContext({
      document: {
        getElementById: jest.fn((id) => {
          if (id === 'game-canvas') return canvas;
          return { classList: { add: jest.fn(), remove: jest.fn() }, style: {} };
        })
      },
      addEventListener: jest.fn(),
      Input: class Input { attach() {} },
      Camera: class Camera {
        constructor(width, height) { Object.assign(this, { width, height }); }
        updateDimensions(width, height) { Object.assign(this, { width, height }); }
        setBounds(width, height) { Object.assign(this, { boundWidth: width, boundHeight: height }); }
        setZoom(zoom) { this.zoom = zoom; }
      },
      Renderer: class Renderer { setCamera() {} },
      MapConfigs: {
        default: { cols: 20, rows: 20 },
        arena_halls: { cols: 20, rows: 20 }
      },
      MapGen: class MapGen {
        constructor(config, tileSize) {
          Object.assign(this, { config, tileSize, cols: config.cols, rows: config.rows });
          this.rooms = [{ center: { x: 5, y: 5 } }];
          this.bossRoom = null;
        }
        generate() {}
        getStartPos() { return { x: 50, y: 50 }; }
        getValidFloorPosNear(x, y) { return { x: x * this.tileSize, y: y * this.tileSize }; }
        getDoorPositions() { return []; }
        getHolePositions() { return []; }
      },
      Pathfinder: class Pathfinder {},
      SpawnManager: class SpawnManager { populateMap() {} },
      CombatFeedback: class CombatFeedback { addText() {} },
      ParticleSystem: class ParticleSystem {},
      LootGen: class LootGen {},
      Player: class Player {
        constructor(x, y) { Object.assign(this, { x, y, angle: 0, equipment: {}, inventory: [], projectiles: [] }); }
        recalculateStats() {}
      },
      ExtractionPortal: class ExtractionPortal { constructor(x, y) { Object.assign(this, { x, y }); } },
      LootChest: class LootChest {},
      FloorTransition: class FloorTransition {
        constructor(x, y, type) { Object.assign(this, { x, y, type }); }
      },
      BossRoomButton: class BossRoomButton {},
      localStorage: { getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() }
    });
    context.window = context;
    context.globalThis = context;
    const { GameEngine } = loadGloomvault('core/GameEngine.js', ['GameEngine'], context);
    const engine = new GameEngine('game-canvas');
    engine.setRunMapSelection('arena_halls');
    engine.currentFloor = 1;

    engine.generateFloor(false);

    expect([engine.portal === null, engine.floorTransitions.length, engine.floorTransitions[0].type]).toEqual([true, 1, 'door']);
  });

  test('generateFloor does not add duplicate fallback exits when transitions already exist', () => {
    const { engine } = loadEngineWithStubs();
    engine.currentFloor = 1;
    engine.mapGen = {
      rooms: [{ center: { x: 1, y: 1 } }, { center: { x: 5, y: 5 } }],
      getValidFloorPosNear: (x, y) => ({ x: x * 64, y: y * 64 })
    };
    engine.portal = null;
    engine.floorTransitions = [{ type: 'door' }];

    engine.ensureDungeonExit({ x: 64, y: 64 });

    expect([engine.portal, engine.floorTransitions.length]).toEqual([null, 1]);
  });

  test('generateFloor keeps only one FloorTransition per room when candidates overlap', () => {
    const canvas = {
      width: 800,
      height: 600,
      parentElement: { getBoundingClientRect: () => ({ width: 800, height: 600 }) },
      getContext: jest.fn(() => ({}))
    };
    const context = createBrowserContext({
      document: {
        getElementById: jest.fn((id) => {
          if (id === 'game-canvas') return canvas;
          return { classList: { add: jest.fn(), remove: jest.fn() }, style: {} };
        })
      },
      addEventListener: jest.fn(),
      Input: class Input { attach() {} },
      Camera: class Camera {
        constructor(width, height) { Object.assign(this, { width, height }); }
        updateDimensions(width, height) { Object.assign(this, { width, height }); }
        setBounds(width, height) { Object.assign(this, { boundWidth: width, boundHeight: height }); }
        setZoom(zoom) { this.zoom = zoom; }
      },
      Renderer: class Renderer { setCamera() {} },
      MapConfigs: { default: { cols: 20, rows: 20 } },
      MapGen: class MapGen {
        constructor(config, tileSize) {
          Object.assign(this, { config, tileSize, cols: config.cols, rows: config.rows });
          this.rooms = [
            { x: 1, y: 1, width: 4, height: 4, center: { x: 2, y: 2 } },
            { x: 8, y: 8, width: 4, height: 4, center: { x: 9, y: 9 } }
          ];
          this.bossRoom = null;
        }
        generate() {}
        getStartPos() { return { x: 20, y: 20 }; }
        getValidFloorPosNear(x, y) { return { x: x * this.tileSize, y: y * this.tileSize }; }
        getDoorPositions() { return [{ x: 85, y: 85 }, { x: 95, y: 95 }]; }
        getHolePositions() { return [{ x: 90, y: 90 }]; }
        isTileInsideRoom(x, y, room) { return x >= room.x && x < room.x + room.width && y >= room.y && y < room.y + room.height; }
      },
      Pathfinder: class Pathfinder {},
      SpawnManager: class SpawnManager { populateMap() {} },
      CombatFeedback: class CombatFeedback { addText() {} },
      ParticleSystem: class ParticleSystem {},
      LootGen: class LootGen {},
      Player: class Player {
        constructor(x, y) { Object.assign(this, { x, y, angle: 0, equipment: {}, inventory: [], projectiles: [] }); }
        recalculateStats() {}
      },
      ExtractionPortal: class ExtractionPortal {},
      LootChest: class LootChest {},
      FloorTransition: class FloorTransition {
        constructor(x, y, type) { Object.assign(this, { x, y, type }); }
      },
      BossRoomButton: class BossRoomButton {},
      localStorage: { getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() }
    });
    context.window = context;
    context.globalThis = context;
    const { GameEngine } = loadGloomvault('core/GameEngine.js', ['GameEngine'], context);
    const engine = new GameEngine('game-canvas');

    engine.generateFloor(false);

    expect(engine.floorTransitions).toHaveLength(1);
    expect(engine.floorTransitions[0].type).toBe('door');
  });

  test('generateFloor preserves FloorTransitions across different rooms', () => {
    const canvas = {
      width: 800,
      height: 600,
      parentElement: { getBoundingClientRect: () => ({ width: 800, height: 600 }) },
      getContext: jest.fn(() => ({}))
    };
    const context = createBrowserContext({
      document: {
        getElementById: jest.fn((id) => {
          if (id === 'game-canvas') return canvas;
          return { classList: { add: jest.fn(), remove: jest.fn() }, style: {} };
        })
      },
      addEventListener: jest.fn(),
      Input: class Input { attach() {} },
      Camera: class Camera {
        constructor(width, height) { Object.assign(this, { width, height }); }
        updateDimensions(width, height) { Object.assign(this, { width, height }); }
        setBounds(width, height) { Object.assign(this, { boundWidth: width, boundHeight: height }); }
        setZoom(zoom) { this.zoom = zoom; }
      },
      Renderer: class Renderer { setCamera() {} },
      MapConfigs: { default: { cols: 20, rows: 20 } },
      MapGen: class MapGen {
        constructor(config, tileSize) {
          Object.assign(this, { config, tileSize, cols: config.cols, rows: config.rows });
          this.rooms = [
            { x: 1, y: 1, width: 4, height: 4, center: { x: 2, y: 2 } },
            { x: 8, y: 8, width: 4, height: 4, center: { x: 9, y: 9 } },
            { x: 13, y: 13, width: 4, height: 4, center: { x: 14, y: 14 } }
          ];
          this.bossRoom = null;
        }
        generate() {}
        getStartPos() { return { x: 20, y: 20 }; }
        getValidFloorPosNear(x, y) { return { x: x * this.tileSize, y: y * this.tileSize }; }
        getDoorPositions() { return [{ x: 85, y: 85 }]; }
        getHolePositions() { return [{ x: 900, y: 900 }]; }
        isTileInsideRoom(x, y, room) { return x >= room.x && x < room.x + room.width && y >= room.y && y < room.y + room.height; }
      },
      Pathfinder: class Pathfinder {},
      SpawnManager: class SpawnManager { populateMap() {} },
      CombatFeedback: class CombatFeedback { addText() {} },
      ParticleSystem: class ParticleSystem {},
      LootGen: class LootGen {},
      Player: class Player {
        constructor(x, y) { Object.assign(this, { x, y, angle: 0, equipment: {}, inventory: [], projectiles: [] }); }
        recalculateStats() {}
      },
      ExtractionPortal: class ExtractionPortal {},
      LootChest: class LootChest {},
      FloorTransition: class FloorTransition {
        constructor(x, y, type) { Object.assign(this, { x, y, type }); }
      },
      BossRoomButton: class BossRoomButton {},
      localStorage: { getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() }
    });
    context.window = context;
    context.globalThis = context;
    const { GameEngine } = loadGloomvault('core/GameEngine.js', ['GameEngine'], context);
    const engine = new GameEngine('game-canvas');

    engine.generateFloor(false);

    expect(engine.floorTransitions.map(t => t.type)).toEqual(['door', 'hole']);
  });

  test('ensureDungeonExit falls back to portal when fallback room already has a transition', () => {
    const { engine } = loadEngineWithStubs();
    engine.mapGen = {
      tileSize: 64,
      rooms: [{ x: 1, y: 1, width: 4, height: 4, center: { x: 2, y: 2 } }],
      getValidFloorPosNear: (x, y) => ({ x: x * 64, y: y * 64 }),
      isTileInsideRoom: (x, y, room) => x >= room.x && x < room.x + room.width && y >= room.y && y < room.y + room.height
    };
    engine.portal = null;
    engine.floorTransitions = [{ x: 128, y: 128, type: 'door' }];

    engine.floorTransitions = [];
    engine.tryAddFloorTransition(128, 128, 'door');
    engine.ensureDungeonExit({ x: 128, y: 128 });

    expect([engine.floorTransitions.length, Boolean(engine.portal)]).toEqual([1, false]);
  });

  test('arena halls repeated generations always leave at least one exit object', () => {
    const { engine } = loadEngineWithStubs();
    engine.setRunMapSelection('arena_halls');
    const results = [];

    for (let i = 0; i < 8; i++) {
      engine.currentFloor = i % 2 === 0 ? 1 : 2;
      engine.generateFloor(i > 0);
      results.push(Boolean(engine.portal) || engine.floorTransitions.length > 0);
    }

    expect(results.every(Boolean)).toBe(true);
  });

  test('boss room entities spawn and unlock after all buttons activate', () => {
    const canvas = {
      width: 800,
      height: 600,
      parentElement: { getBoundingClientRect: () => ({ width: 800, height: 600 }) },
      getContext: jest.fn(() => ({}))
    };
    const bossBar = { classList: { add: jest.fn(), remove: jest.fn() }, style: {} };
    const bossFill = { style: {} };
    const bossText = { textContent: '' };
    const context = createBrowserContext({
      document: {
        getElementById: jest.fn((id) => {
          if (id === 'game-canvas') return canvas;
          if (id === 'boss-health-bar-container') return bossBar;
          if (id === 'boss-health-bar-fill') return bossFill;
          if (id === 'boss-health-bar-text') return bossText;
          return { classList: { add: jest.fn(), remove: jest.fn() }, style: {}, querySelector: () => ({ style: {} }) };
        })
      },
      addEventListener: jest.fn(),
      Input: class Input {},
      Camera: class Camera {
        constructor(width, height) { Object.assign(this, { width, height }); }
        updateDimensions(width, height) { Object.assign(this, { width, height }); }
        setBounds(width, height) { Object.assign(this, { boundWidth: width, boundHeight: height }); }
        setZoom(zoom) { this.zoom = zoom; }
      },
      Renderer: class Renderer { setCamera() {} },
      MapConfigs: { default: { cols: 20, rows: 20 } },
      MapGen: class MapGen {
        constructor(config, tileSize) {
          Object.assign(this, { config, tileSize, cols: config.cols, rows: config.rows });
          this.rooms = [{ center: { x: 1, y: 1 } }, { center: { x: 2, y: 2 } }];
          this.grid = new Array(400).fill(1);
          this.bossRoom = {
            entranceTile: { x: 5, y: 5 },
            entranceWorld: { x: 55, y: 55 },
            unlocked: false,
            opened: false,
            bossSpawn: { x: 120, y: 120 },
            chestSpawn: { x: 140, y: 120 },
            chestSpawns: [{ x: 140, y: 120 }, { x: 160, y: 120 }, { x: 180, y: 120 }],
            buttonPositions: [{ x: 40, y: 40 }, { x: 60, y: 40 }, { x: 80, y: 40 }]
          };
          this.grid[5 * 20 + 5] = 0;
        }
        generate() {}
        getStartPos() { return { x: 10, y: 10 }; }
        getValidFloorPosNear(x, y) { return { x: x * this.tileSize, y: y * this.tileSize }; }
        getDoorPositions() { return []; }
        getHolePositions() { return []; }
        unlockBossRoomEntrance() {
          this.bossRoom.unlocked = true;
          return true;
        }
        openBossRoomEntrance() {
          this.grid[5 * 20 + 5] = 1;
          this.bossRoom.opened = true;
          return true;
        }
      },
      Pathfinder: class Pathfinder {},
      SpawnManager: class SpawnManager { populateMap() {} },
      CombatFeedback: class CombatFeedback { addText() {} },
      ParticleSystem: class ParticleSystem { emitImpact() {} },
      LootGen: class LootGen {},
      Player: class Player {
        constructor(x, y) { Object.assign(this, { x, y, equipment: {}, inventory: [], projectiles: [] }); }
        recalculateStats() {}
      },
      Enemy: class Enemy {
        constructor(x, y, type) { Object.assign(this, { x, y, type, isBoss: type === 'boss', hp: 100, maxHp: 100, hasTakenPlayerDamage: false }); }
      },
      ExtractionPortal: class ExtractionPortal {},
      LootChest: class LootChest { constructor(x, y, locked) { Object.assign(this, { x, y, locked }); } },
      FloorTransition: class FloorTransition {},
      BossRoomButton: class BossRoomButton {
        constructor(x, y, index) { Object.assign(this, { x, y, index, activated: false }); }
      },
      localStorage: { getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() }
    });
    context.window = context;
    context.globalThis = context;
    const { GameEngine } = loadGloomvault('core/GameEngine.js', ['GameEngine'], context);
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const engine = new GameEngine('game-canvas');

    engine.generateFloor(false);
    engine.bossRoomButtons.forEach(button => { button.activated = true; });
    engine.checkBossRoomUnlock();
    const tileAfterUnlock = engine.mapGen.grid[5 * 20 + 5];
    engine.openBossRoomEntrance();
    engine.updateBossHealthBarUI();
    const hiddenBeforeDamage = bossBar.classList.add.mock.calls.length;
    engine.enemies[0].hasTakenPlayerDamage = true;
    engine.updateBossHealthBarUI();

    expect([
      engine.enemies.some(enemy => enemy.isBoss),
      engine.lootChests.length,
      engine.lootChests.every(chest => chest.locked),
      engine.bossRoomButtons.length,
      engine.mapGen.bossRoom.unlocked,
      tileAfterUnlock,
      engine.mapGen.bossRoom.opened,
      hiddenBeforeDamage,
      bossFill.style.width,
      bossText.textContent.includes('Vault Warden')
    ]).toEqual([true, 3, true, 3, true, 0, true, 1, '100%', true]);
  });

  test('boss death uses chest-style loot drop logic', () => {
    const elements = {};
    const context = createBrowserContext({
      document: {
        getElementById: jest.fn((id) => {
          if (!elements[id]) {
            elements[id] = {
              classList: { add: jest.fn(), remove: jest.fn() },
              style: {},
              querySelector: () => ({ style: {}, textContent: '' }),
              textContent: ''
            };
          }
          return elements[id];
        })
      },
      LootChest: { dropChestLoot: jest.fn() },
      window: {}
    });
    context.window = context;
    context.globalThis = context;
    const { GameEngine } = loadGloomvault('core/GameEngine.js', ['GameEngine'], context);
    const boss = { x: 50, y: 60, hp: 0, maxHp: 100, isBoss: true, update: jest.fn(() => []) };
    const lockedChest = { x: 50, y: 60, update: jest.fn(), unlock: jest.fn() };
    const engine = Object.assign(Object.create(GameEngine.prototype), {
      state: 'PLAYING',
      player: {
        x: 0,
        y: 0,
        hp: 100,
        maxHp: 100,
        maxShield: 0,
        shield: 0,
        stats: {},
        equipment: {},
        abilityCooldowns: {},
        update: jest.fn(() => [])
      },
      input: { isKeyDown: jest.fn(() => false), keys: {} },
      camera: { follow: jest.fn(), shake: jest.fn() },
      mapGen: {
        tileSize: 10,
        cols: 10,
        rows: 10,
        visitedGrid: new Array(100).fill(false),
        bossRoom: { room: { x: 0, y: 0, width: 10, height: 10 } },
        isTileInsideRoom: () => true
      },
      pathfinder: {},
      particleSystem: { update: jest.fn(), emitImpact: jest.fn() },
      combatFeedback: { addText: jest.fn(), update: jest.fn() },
      enemies: [boss],
      projectiles: [],
      droppedItems: [],
      floorTransitions: [],
      lootChests: [lockedChest],
      bossRoomButtons: [],
      portal: null
    });

    engine.update(0.016);

    expect([context.LootChest.dropChestLoot.mock.calls.length, engine.enemies.length, engine.camera.shake.mock.calls.length, lockedChest.unlock.mock.calls.length])
      .toEqual([1, 0, 1, 1]);
  });

  test('boss room spawn can roll a registry boss profile with modifiers', () => {
    const canvas = {
      width: 800,
      height: 600,
      parentElement: { getBoundingClientRect: () => ({ width: 800, height: 600 }) },
      getContext: jest.fn(() => ({}))
    };
    const context = createBrowserContext({
      document: {
        getElementById: jest.fn((id) => {
          if (id === 'game-canvas') return canvas;
          return { classList: { add: jest.fn(), remove: jest.fn() }, style: {}, querySelector: () => ({ style: {} }) };
        })
      },
      addEventListener: jest.fn(),
      Input: class Input {},
      Camera: class Camera {
        constructor(width, height) { Object.assign(this, { width, height }); }
        updateDimensions(width, height) { Object.assign(this, { width, height }); }
        setBounds(width, height) { Object.assign(this, { boundWidth: width, boundHeight: height }); }
        setZoom(zoom) { this.zoom = zoom; }
      },
      Renderer: class Renderer { setCamera() {} },
      MapConfigs: { default: { cols: 20, rows: 20 } },
      MapGen: class MapGen {
        constructor(config, tileSize) {
          Object.assign(this, { config, tileSize, cols: config.cols, rows: config.rows });
          this.rooms = [{ center: { x: 1, y: 1 } }, { center: { x: 2, y: 2 } }];
          this.grid = new Array(400).fill(1);
          this.bossRoom = {
            room: { x: 6, y: 6, width: 5, height: 5 },
            entranceTile: { x: 5, y: 5 },
            entranceWorld: { x: 55, y: 55 },
            unlocked: false,
            opened: false,
            bossSpawn: { x: 120, y: 120 },
            chestSpawn: { x: 140, y: 120 },
            chestSpawns: [{ x: 140, y: 120 }, { x: 160, y: 120 }, { x: 180, y: 120 }],
            buttonPositions: [{ x: 40, y: 40 }, { x: 60, y: 40 }, { x: 80, y: 40 }]
          };
        }
        generate() {}
        getStartPos() { return { x: 10, y: 10 }; }
        getValidFloorPosNear(x, y) { return { x: x * this.tileSize, y: y * this.tileSize }; }
        getDoorPositions() { return []; }
        getHolePositions() { return []; }
      },
      Pathfinder: class Pathfinder {},
      SpawnManager: class SpawnManager { populateMap() {} collectValidSpawnTiles() { return []; } },
      CombatFeedback: class CombatFeedback { addText() {} },
      ParticleSystem: class ParticleSystem { emitImpact() {} },
      LootGen: class LootGen {},
      Player: class Player {
        constructor(x, y) { Object.assign(this, { x, y, equipment: {}, inventory: [], projectiles: [] }); }
        recalculateStats() {}
      },
      Enemy: class Enemy {
        constructor(x, y, type, hp, dmg, options = {}) {
          Object.assign(this, {
            x,
            y,
            type,
            hp: 100,
            maxHp: 100,
            hasTakenPlayerDamage: false,
            isBoss: true,
            isBossTier: Boolean(options.bossProfile),
            bossTier: options.bossProfile ? options.bossProfile.tier : null,
            bossProfile: options.bossProfile,
            triggerBossHooks: jest.fn()
          });
        }
      },
      ExtractionPortal: class ExtractionPortal {},
      LootChest: class LootChest { constructor(x, y, locked) { Object.assign(this, { x, y, locked }); } },
      FloorTransition: class FloorTransition {},
      BossRoomButton: class BossRoomButton { constructor(x, y, index) { Object.assign(this, { x, y, index, activated: false }); } },
      localStorage: { getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() }
    });
    context.window = context;
    context.globalThis = context;
    loadGloomvault('config/BossConfig.js', ['BossConfig'], context);
    const { GameEngine } = loadGloomvault('core/GameEngine.js', ['GameEngine'], context);
    const engine = new GameEngine('game-canvas');
    jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0);

    engine.generateFloor(false);

    expect([
      engine.enemies[0].isBossTier,
      ['Vault Warden', 'Storm Seer', 'Iron Maw', 'Blight Priest'].includes(engine.enemies[0].bossProfile.displayName),
      Array.isArray(engine.enemies[0].bossProfile.encounterTags)
    ]).toEqual([true, true, true]);
  });

  test('guardian loot guarantees at least an uncommon item', () => {
    const context = createBrowserContext({
      DroppedItem: class DroppedItem {
        constructor(x, y, itemData) { Object.assign(this, { x, y, itemData }); }
      },
      LootChest: { dropChestLoot: jest.fn() }
    });
    loadGloomvault('config/BossConfig.js', ['BossConfig'], context);
    const { GameEngine } = loadGloomvault('core/GameEngine.js', ['GameEngine'], context);
    const engine = Object.assign(Object.create(GameEngine.prototype), {
      currentFloor: 3,
      gearDifficultyFloor: 2,
      droppedItems: [],
      trinketEffects: [],
      combatFeedback: { addText: jest.fn() },
      particleSystem: { emitImpact: jest.fn() },
      camera: { shake: jest.fn() },
      lootGen: {
        generateGuaranteedRarityItem: jest.fn(() => ({ rarity: 'Uncommon', type: 'weapon', color: '#1eff00' })),
        generateItem: jest.fn(() => ({ rarity: 'Common', type: 'helm', color: '#a0a0a0' }))
      },
      showBossCombatText: jest.fn(),
      emitBossPulse: jest.fn()
    });
    const guardian = {
      x: 40,
      y: 50,
      bossTier: 'floorGuardian',
      bossProfile: { lootProfile: { guaranteedMinRarity: 'Uncommon', guaranteedDrops: 1, extraDropChance: 0 } },
      triggerBossHooks: jest.fn()
    };

    engine.dropBossEncounterLoot(guardian);

    expect([
      engine.lootGen.generateGuaranteedRarityItem.mock.calls.length,
      engine.droppedItems.length,
      engine.droppedItems[0].itemData.rarity
    ]).toEqual([1, 1, 'Uncommon']);
  });

  test('boss element bombs are thrown as enemy-owned projectile clouds', () => {
    const context = createBrowserContext({
      Projectile: class Projectile {
        constructor(x, y, angle, speed, damage, lifetime, isPlayerOwned, weaponType, options) {
          Object.assign(this, { x, y, angle, speed, damage, lifetime, isPlayerOwned, weaponType, ...options });
        }
      }
    });
    const { GameEngine } = loadGloomvault('core/GameEngine.js', ['GameEngine'], context);
    const engine = Object.assign(Object.create(GameEngine.prototype), {
      projectiles: [],
      trinketEffects: [],
      enemies: [],
      player: { x: 100, y: 0, width: 30, takeDamage: jest.fn(() => ({ hp: 10, shield: 0 })) },
      combatFeedback: { addText: jest.fn() },
      particleSystem: { emitImpact: jest.fn() },
      camera: { shake: jest.fn() },
      applyElementalHit: jest.fn(),
      showBossCombatText: jest.fn(),
      emitBossPulse: jest.fn()
    });
    const boss = { x: 0, y: 0, weapon: { damage: 40 }, handleHitPlayer: jest.fn() };
    const power = { id: 'element_bomb_fire' };

    const used = engine.triggerBorrowedBossPower(boss, power, engine.player);
    const projectile = engine.projectiles[0];
    projectile.x = engine.player.x;
    projectile.y = engine.player.y;
    engine.explodeElementBomb(projectile);

    expect([
      used,
      projectile.isPlayerOwned,
      projectile.owner,
      engine.trinketEffects[0].owner,
      engine.player.takeDamage.mock.calls.length,
      boss.handleHitPlayer.mock.calls.length
    ]).toEqual([true, false, boss, 'enemy', 1, 1]);
  });

  test('stacked boss HUD renders multiple active encounters', () => {
    document.body.innerHTML = `
      <div id="boss-health-bar-container" class="hidden">
        <div id="boss-health-bar-rows">
          <div class="boss-health-bar-row">
            <div id="boss-health-bar-fill" class="boss-health-bar-fill"></div>
            <div id="boss-health-bar-text" class="boss-health-bar-text"></div>
          </div>
        </div>
      </div>
    `;
    const context = createBrowserContext({ document });
    const { GameEngine } = loadGloomvault('core/GameEngine.js', ['GameEngine'], context);
    const engine = Object.assign(Object.create(GameEngine.prototype), {
      _hudElements: null,
      _hudState: {},
      enemies: [
        {
          isBossTier: true,
          bossTier: 'mainBoss',
          hp: 80,
          maxHp: 100,
          hasTakenPlayerDamage: true,
          isAggroed: true,
          getBossHudText: () => 'Vault Warden 80 / 100'
        },
        {
          isBossTier: true,
          bossTier: 'floorGuardian',
          hp: 55,
          maxHp: 90,
          hasTakenPlayerDamage: true,
          isAggroed: true,
          getBossHudText: () => 'Floor Guardian 55 / 90'
        }
      ]
    });

    engine.updateBossHealthBarUI();

    const rows = Array.from(document.querySelectorAll('.boss-health-bar-row'));
    expect([
      rows.length >= 2,
      rows[0].querySelector('.boss-health-bar-text').textContent,
      rows[1].querySelector('.boss-health-bar-text').textContent,
      rows[1].classList.contains('guardian')
    ]).toEqual([true, 'Vault Warden 80 / 100', 'Floor Guardian 55 / 90', true]);
  });
});

// Behaviour under test: equipment defaults and save-state migrations stay centralized and save-compatible.
describe('Gloomvault equipment and inventory services', () => {
  test('starter equipment fills only missing starter slots', () => {
    const context = createBrowserContext();
    const { EquipmentService } = loadGloomvault('systems/EquipmentService.js', ['EquipmentService'], context);
    const customWeapon = { id: 'rare_weapon', type: 'weapon', gearScore: 50 };
    const equipment = EquipmentService.createEmptyEquipment();
    equipment.weapon = customWeapon;

    const migrated = EquipmentService.ensureStarterEquipment(equipment);

    expect([
      migrated.weapon,
      migrated.weapon2.id,
      migrated.trinket1.activeAbility.name,
      migrated.trinket2.id,
      Object.keys(migrated)
    ]).toEqual([
      customWeapon,
      'starter_wep2',
      'Minor Heal',
      'starter_tr2',
      ['helm', 'chest', 'pants', 'boots', 'weapon', 'weapon2', 'trinket1', 'trinket2']
    ]);
  });

  test('inventory load handles missing and malformed save data', () => {
    const context = createBrowserContext({
      localStorage: {
        getItem: jest.fn(key => (key === 'gloomvault_equipment' ? '{bad json' : null)),
        setItem: jest.fn(),
        removeItem: jest.fn()
      }
    });
    loadGloomvault('systems/EquipmentService.js', ['EquipmentService'], context);
    const { InventoryStore } = loadGloomvault('systems/InventoryStore.js', ['InventoryStore'], context);

    const loaded = InventoryStore.load();

    expect([
      loaded.stashItems,
      loaded.scraps,
      loaded.equipment.weapon.id,
      loaded.equipment.trinket1.activeAbility.cooldown
    ]).toEqual([[], 0, 'starter_wep1', 15]);
  });

  test('inventory store normalizes stash size and loads equipment directly', () => {
    const context = createBrowserContext({
      localStorage: {
        getItem: jest.fn(key => {
          if (key === 'gloomvault_stash') return JSON.stringify([{ id: 'gem' }]);
          if (key === 'gloomvault_equipment') return JSON.stringify({ weapon: { id: 'wand', type: 'weapon', gearScore: 12 } });
          return null;
        }),
        setItem: jest.fn(),
        removeItem: jest.fn()
      }
    });
    loadGloomvault('systems/EquipmentService.js', ['EquipmentService'], context);
    const { InventoryStore } = loadGloomvault('systems/InventoryStore.js', ['InventoryStore'], context);

    const loaded = InventoryStore.load({ minStashSlots: 3 });
    const equipment = InventoryStore.loadEquipment();

    expect([
      loaded.stashItems.length,
      loaded.stashItems[0].id,
      loaded.stashItems[1],
      equipment.weapon.id,
      equipment.weapon2.id
    ]).toEqual([3, 'gem', null, 'wand', 'starter_wep2']);
  });

  test('durability migration skips starter gear and trinkets but migrates normal gear', () => {
    const context = createBrowserContext();
    const { EquipmentService } = loadGloomvault('systems/EquipmentService.js', ['EquipmentService'], context);
    const durabilityConfig = { calculateMaxDurability: jest.fn(() => 42) };
    const starter = { type: 'weapon', isStarter: true };
    const trinket = { type: 'trinket' };
    const armor = { type: 'chest', rarity: 'Common', gearScore: 12 };

    [starter, trinket, armor].forEach(item => EquipmentService.migrateDurability(item, durabilityConfig));

    expect([
      starter.durability,
      trinket.durability,
      armor.durability,
      armor.maxDurability,
      durabilityConfig.calculateMaxDurability.mock.calls.length
    ]).toEqual([undefined, undefined, 42, 42, 1]);
  });

  test('LoadoutService centralizes equipment normalization, gear score, saves, and death penalty', () => {
    const savedEquipment = { weapon: { id: 'wand', type: 'weapon', gearScore: 12 } };
    const localStorage = {
      getItem: jest.fn(key => key === 'gloomvault_equipment' ? JSON.stringify(savedEquipment) : null),
      setItem: jest.fn(),
      removeItem: jest.fn()
    };
    const context = createBrowserContext({
      localStorage,
      DifficultyConfig: { minStartingFloor: 1, gearScorePerFloor: 10 }
    });
    loadGloomvault('systems/EquipmentService.js', ['EquipmentService'], context);
    loadGloomvault('systems/InventoryStore.js', ['InventoryStore'], context);
    loadGloomvault('config/DurabilityConfig.js', ['DurabilityConfig'], context);
    const { LoadoutService } = loadGloomvault('systems/LoadoutService.js', ['LoadoutService'], context);
    const player = { recalculateStats: jest.fn() };

    const loadout = new LoadoutService().preparePlayerForRun(player);
    new LoadoutService().saveEquipment(player);
    new LoadoutService().applyDeathPenalty();

    expect([
      player.equipment.weapon.id,
      player.equipment.weapon2.id,
      loadout.gearScore,
      loadout.gearDifficultyFloor,
      player.recalculateStats.mock.calls.length,
      localStorage.setItem.mock.calls[0][0],
      localStorage.removeItem.mock.calls.some(call => call[0] === 'gloomvault_equipment')
    ]).toEqual(['wand', 'starter_wep2', 27, 2, 1, 'gloomvault_equipment', true]);
  });

  test('InventoryTransferService swaps, validates equipment slots, stashes, and salvages', () => {
    const context = createBrowserContext();
    const { InventoryTransferService } = loadGloomvault('systems/InventoryTransferService.js', ['InventoryTransferService'], context);
    const service = new InventoryTransferService();
    const inventory = [{ id: 'wand', type: 'weapon' }, { id: 'boots', type: 'boots', rarity: 'Common' }];
    const equipment = { weapon: null, boots: null, trinket1: null };
    const stash = [null, null];
    const upgradeSystem = { getSalvageValue: jest.fn(() => 7) };

    const validEquip = service.swap(inventory, 0, equipment, 'weapon', { validateEquip: true });
    const invalidEquip = service.swap(inventory, 1, equipment, 'trinket1', { validateEquip: true });
    const stashed = service.moveToFirstEmpty(inventory, 1, stash);
    const salvaged = service.salvage(stash, 0, upgradeSystem);

    expect([
      validEquip,
      invalidEquip,
      stashed,
      salvaged,
      equipment.weapon.id,
      equipment.trinket1,
      inventory,
      stash,
      upgradeSystem.getSalvageValue.mock.calls.length
    ]).toEqual([
      true,
      false,
      true,
      { salvaged: true, value: 7, item: { id: 'boots', type: 'boots', rarity: 'Common' } },
      'wand',
      null,
      [null, null],
      [null, null],
      1
    ]);
  });
});

// Behaviour under test: shared event registries make browser-global listeners removable.
describe('Gloomvault lifecycle cleanup services', () => {
  test('EventRegistry removes every registered listener once', () => {
    const context = createBrowserContext();
    const { EventRegistry } = loadGloomvault('systems/EventRegistry.js', ['EventRegistry'], context);
    const target = { addEventListener: jest.fn(), removeEventListener: jest.fn() };
    const handler = jest.fn();
    const registry = new EventRegistry();

    registry.add(target, 'resize', handler);
    registry.removeAll();
    registry.removeAll();

    expect([
      target.addEventListener.mock.calls,
      target.removeEventListener.mock.calls
    ]).toEqual([
      [['resize', handler, undefined]],
      [['resize', handler, undefined]]
    ]);
  });

  test('DropZoneBinder registers removable drag lifecycle handlers', () => {
    const context = createBrowserContext();
    const { EventRegistry } = loadGloomvault('systems/EventRegistry.js', ['EventRegistry'], context);
    const { DropZoneBinder } = loadGloomvault('systems/DropZoneBinder.js', ['DropZoneBinder'], context);
    const registry = new EventRegistry();
    const element = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      classList: { add: jest.fn(), remove: jest.fn() }
    };
    const onDrop = jest.fn();
    const binder = new DropZoneBinder({ eventRegistry: registry });

    binder.bind(element, onDrop);
    const handlers = Object.fromEntries(element.addEventListener.mock.calls.map(call => [call[0], call[1]]));
    handlers.dragover({ preventDefault: jest.fn() });
    handlers.drop({ preventDefault: jest.fn(), stopPropagation: jest.fn() });
    registry.removeAll();

    expect([
      element.addEventListener.mock.calls.map(call => call[0]),
      element.classList.add.mock.calls[0][0],
      onDrop.mock.calls.length,
      element.removeEventListener.mock.calls.map(call => call[0])
    ]).toEqual([
      ['dragover', 'dragleave', 'drop'],
      'drag-over',
      1,
      ['drop', 'dragleave', 'dragover']
    ]);
  });

  test('Input destroy removes keyboard and canvas listeners', () => {
    const context = createBrowserContext({
      window: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }
    });
    context.window.window = context.window;
    context.window.globalThis = context;
    const { EventRegistry } = loadGloomvault('systems/EventRegistry.js', ['EventRegistry'], context);
    const { Input } = loadGloomvault('core/Input.js', ['Input'], context);
    const canvas = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };
    const input = new Input({ eventRegistry: new EventRegistry() });

    input.attach(canvas);
    input.destroy();
    input.destroy();

    expect([
      context.window.addEventListener.mock.calls.map(call => call[0]),
      context.window.removeEventListener.mock.calls.map(call => call[0]),
      canvas.removeEventListener.mock.calls.map(call => call[0]),
      input.keys
    ]).toEqual([
      ['keydown', 'keyup'],
      ['keyup', 'keydown'],
      ['mousemove', 'mousedown', 'mouseup', 'contextmenu'],
      {}
    ]);
  });

  test('GameEngine destroy is idempotent and releases resize and input resources', () => {
    const canvas = {
      width: 800,
      height: 600,
      parentElement: { getBoundingClientRect: () => ({ width: 800, height: 600 }) },
      getContext: jest.fn(() => ({}))
    };
    const input = { destroy: jest.fn(), detach: jest.fn() };
    const context = createBrowserContext({
      document: {
        getElementById: jest.fn(id => (id === 'game-canvas' ? canvas : null))
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      cancelAnimationFrame: jest.fn(),
      Input: class Input {},
      Camera: class Camera {
        constructor(width, height) { Object.assign(this, { width, height }); }
        updateDimensions(width, height) { Object.assign(this, { width, height }); }
        setZoom(zoom) { this.zoom = zoom; }
      },
      Renderer: class Renderer { setCamera() {} },
      MapConfigs: { default: { cols: 10, rows: 10 } },
      MapGen: class MapGen { constructor(config) { this.config = config; } },
      Pathfinder: class Pathfinder {},
      SpawnManager: class SpawnManager {},
      CombatFeedback: class CombatFeedback {},
      ParticleSystem: class ParticleSystem {},
      LootGen: class LootGen {}
    });
    loadGloomvault('systems/EventRegistry.js', ['EventRegistry'], context);
    const { GameEngine } = loadGloomvault('core/GameEngine.js', ['GameEngine'], context);
    const engine = new GameEngine('game-canvas', { input });
    engine._animationFrameId = 77;

    engine.destroy();
    engine.destroy();

    expect([
      context.addEventListener.mock.calls.map(call => call[0]),
      context.removeEventListener.mock.calls.map(call => call[0]),
      context.cancelAnimationFrame.mock.calls,
      input.destroy.mock.calls.length,
      engine._animationFrameId,
      engine.state
    ]).toEqual([
      ['resize'],
      ['resize'],
      [[77]],
      1,
      null,
      'MENU'
    ]);
  });
});

// Behaviour under test: UI controllers own DOM mutation without forcing gameplay code to know DOM details.
describe('Gloomvault HUD and screen controllers', () => {
  test('HudController avoids redundant text writes and toggles interaction hints', () => {
    document.body.innerHTML = '<div id="interaction-hint" class="hidden"></div>';
    const context = createBrowserContext();
    const { HudController } = loadGloomvault('ui/HudController.js', ['HudController'], context);
    const controller = new HudController();
    const hint = document.getElementById('interaction-hint');
    const textSpy = jest.spyOn(hint, 'textContent', 'set');

    controller.showInteractionHint('Press [F]');
    controller.showInteractionHint('Press [F]');
    controller.hideInteractionHint();

    expect([
      hint.classList.contains('hidden'),
      textSpy.mock.calls.length
    ]).toEqual([true, 1]);
  });

  test('HudController renders boss rows for multiple visible encounters', () => {
    document.body.innerHTML = `
      <div id="boss-health-bar-container" class="hidden">
        <div id="boss-health-bar-rows">
          <div class="boss-health-bar-row">
            <div id="boss-health-bar-fill" class="boss-health-bar-fill"></div>
            <div id="boss-health-bar-text" class="boss-health-bar-text"></div>
          </div>
        </div>
      </div>
    `;
    const context = createBrowserContext();
    const { HudController } = loadGloomvault('ui/HudController.js', ['HudController'], context);
    const controller = new HudController();

    controller.updateBossHud([
      { hp: 40, maxHp: 80, isBoss: true, displayName: 'Warden' },
      { hp: 10, maxHp: 20, bossTier: 'floorGuardian', getBossHudText: () => 'Guardian 10 / 20' }
    ]);

    expect([
      document.getElementById('boss-health-bar-container').classList.contains('hidden'),
      document.querySelectorAll('.boss-health-bar-row').length,
      document.querySelectorAll('.boss-health-bar-fill')[1].style.width,
      document.querySelectorAll('.boss-health-bar-text')[1].textContent
    ]).toEqual([false, 2, '50%', 'Guardian 10 / 20']);
  });

  test('ScreenController starts, stops, and renders map selections', () => {
    document.body.innerHTML = `
      <div id="main-menu" class="screen active"></div>
      <div id="play-screen" class="screen"></div>
      <div id="stash-screen" class="screen"></div>
      <div id="map-select-screen" class="screen"></div>
      <button id="btn-start"></button>
      <button id="btn-map-select-back"></button>
      <button id="btn-map-random"></button>
      <button id="btn-stash"></button>
      <button id="btn-stash-back"></button>
      <button id="btn-game-over-menu"></button>
      <div id="map-select-grid"></div>
    `;
    const context = createBrowserContext();
    const { ScreenController } = loadGloomvault('ui/ScreenController.js', ['ScreenController'], context);
    const engine = { start: jest.fn(), stop: jest.fn(), setRunMapSelection: jest.fn() };
    const onShowStash = jest.fn();
    const onHideExpandedMinimap = jest.fn();
    const controller = new ScreenController({
      engine,
      mapConfigs: { default: { displayName: 'Hybrid Vault', progressionTier: 1, layoutType: 'sequential' } },
      onShowStash,
      onHideExpandedMinimap
    });

    controller.showScreen('play-screen');
    controller.showScreen('stash-screen');
    controller.showScreen('main-menu');
    document.querySelector('.map-select-btn').click();

    expect([
      engine.start.mock.calls.length,
      engine.stop.mock.calls.length,
      onShowStash.mock.calls.length,
      engine.setRunMapSelection.mock.calls[0][0],
      onHideExpandedMinimap.mock.calls.length
    ]).toEqual([2, 1, 1, 'default', 4]);
  });

  test('InventoryUiController facade exposes stable methods and destroy removes owned UI', () => {
    const makeElement = () => {
      const element = {
        style: { setProperty: jest.fn() },
        dataset: {},
        children: [],
        classList: {
          add: jest.fn(),
          remove: jest.fn(),
          contains: jest.fn(() => true),
          toggle: jest.fn()
        },
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        appendChild: jest.fn(child => {
          element.children.push(child);
          return child;
        }),
        querySelector: jest.fn(() => makeElement()),
        querySelectorAll: jest.fn(() => []),
        getContext: jest.fn(() => ({ clearRect: jest.fn() })),
        getBoundingClientRect: jest.fn(() => ({ width: 100, height: 100 })),
        closest: jest.fn(() => null),
        remove: jest.fn()
      };
      return element;
    };
    const body = makeElement();
    const fakeDocument = {
      body,
      createElement: jest.fn(() => makeElement()),
      getElementById: jest.fn(() => makeElement()),
      querySelectorAll: jest.fn(() => [])
    };
    const context = createBrowserContext({ document: fakeDocument });
    loadGloomvault('systems/EventRegistry.js', ['EventRegistry'], context);
    const { InventoryUiController } = loadGloomvault('ui/InventoryUiController.js', ['InventoryUiController'], context);
    const controller = new InventoryUiController({
      engine: { state: 'MENU', getInventoryPaneLayout: jest.fn() },
      expandedMinimapCanvas: makeElement()
    });

    controller.destroy();
    controller.destroy();

    expect([
      typeof controller.updateStashUI,
      typeof controller.updateInventoryUI,
      typeof controller.updateDurabilityHUD,
      typeof controller.hideExpandedMinimap,
      typeof controller.renderExpandedInventoryMinimap,
      typeof controller.setupExtraction,
      typeof controller.destroy,
      body.children.length,
      body.children.every(child => child.remove.mock.calls.length === 1)
    ]).toEqual([
      'function',
      'function',
      'function',
      'function',
      'function',
      'function',
      'function',
      2,
      true
    ]);
  });
});

// Behaviour under test: LootGen rarity, floor scaling, and chest guarantees keep early loot progression controlled.
describe('Gloomvault Loot progression', () => {
  afterEach(() => jest.restoreAllMocks());

  function loadLootContext() {
    const context = createBrowserContext();
    loadGloomvault('config/LootConfig.js', ['LootConfig'], context);
    loadGloomvault('config/DurabilityConfig.js', ['DurabilityConfig'], context);
    const { LootGen } = loadGloomvault('systems/LootGen.js', ['LootGen'], context);
    return { context, LootGen };
  }

  function explicitStats(item) {
    return item.modifiers.filter(mod => !mod.isImplicit && !mod.isTrait);
  }

  test('generated rarities roll exact explicit stat budgets', () => {
    const { LootGen } = loadLootContext();
    const lootGen = new LootGen();

    const results = ['Common', 'Uncommon', 'Epic', 'Legendary'].map(rarity =>
      explicitStats(lootGen.generateItemWithRarityAndType(3, rarity, 'weapon')).length
    );

    expect(results).toEqual([1, 2, 3, 4]);
  });

  test('custom generation can force base type and prefix suffix affixes for dev tools', () => {
    const { LootGen } = loadLootContext();
    const lootGen = new LootGen();
    jest.spyOn(Math, 'random').mockReturnValue(0);

    const weapon = lootGen.generateCustomItem(4, {
      typeSlot: 'weapon',
      rarityName: 'Uncommon',
      prefixStat: 'damageMultiplier',
      suffixStat: 'lifesteal',
      weaponType: 'melee_stab',
      weaponBaseName: 'Lance',
      element: 'fire'
    });
    const trinket = lootGen.generateCustomItem(4, {
      typeSlot: 'trinket',
      rarityName: 'Epic',
      prefixStat: 'cooldownReduction',
      suffixStat: 'maxHp',
      trinketAbilityType: 'dash'
    });
    const felfireBomb = lootGen.generateCustomItem(4, {
      typeSlot: 'trinket',
      rarityName: 'Common',
      trinketAbilityType: 'element_bomb',
      trinketAbilityElement: 'felfire'
    });

    expect([
      weapon.type,
      weapon.weaponType,
      weapon.name.includes('Lance'),
      weapon.element,
      explicitStats(weapon).map(mod => mod.stat),
      trinket.activeAbility.type,
      explicitStats(trinket).slice(0, 2).map(mod => mod.stat),
      felfireBomb.name,
      felfireBomb.activeAbility.element
    ]).toEqual([
      'weapon',
      'melee_stab',
      true,
      'fire',
      ['damageMultiplier', 'lifesteal'],
      'dash',
      ['cooldownReduction', 'maxHp'],
      'Felfire Bomb',
      'felfire'
    ]);
  });

  test('floor rarity tables prevent early legendary drops and unlock deeper tiers', () => {
    const { LootGen } = loadLootContext();
    const lootGen = new LootGen();

    jest.spyOn(Math, 'random').mockReturnValue(0.999);

    expect([
      lootGen.rollRarity(1).name,
      lootGen.rollRarity(4).name,
      lootGen.rollRarity(5).name,
      lootGen.rollRarity(8).name
    ]).toEqual(['Epic', 'Epic', 'Legendary', 'Legendary']);
  });

  test('floor scaling increases stat values without rarity multiplying single affixes', () => {
    const { LootGen } = loadLootContext();
    const lootGen = new LootGen();
    const rolls = [
      0.28, 0.999, 0, 0, 0, 0, 0,
      0.28, 0.999, 0, 0, 0, 0, 0
    ];
    jest.spyOn(Math, 'random').mockImplementation(() => rolls.shift() ?? 0);

    const floorOne = lootGen.generateItemWithRarityAndType(1, 'Common', 'weapon');
    const floorTen = lootGen.generateItemWithRarityAndType(10, 'Common', 'weapon');
    const floorOneDamage = explicitStats(floorOne).find(mod => mod.stat === 'damageMultiplier').value;
    const floorTenDamage = explicitStats(floorTen).find(mod => mod.stat === 'damageMultiplier').value;

    expect([floorOneDamage, floorTenDamage, floorTenDamage > floorOneDamage]).toEqual([8, 17, true]);
  });

  test('chest fallback guarantees Uncommon early and Epic later without forcing Legendary', () => {
    const context = createBrowserContext();
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const { LootChest } = loadGloomvault('entities/LootChest.js', ['LootChest'], context);
    const lootGen = {
      generateItem: jest.fn(() => ({ rarity: 'Common' })),
      generateItemWithRarityAndType: jest.fn((floor, rarity) => ({ rarity }))
    };

    const early = LootChest.generateHighRarityItem(lootGen, 2);
    const later = LootChest.generateHighRarityItem(lootGen, 5);

    expect([
      early.rarity,
      later.rarity,
      lootGen.generateItemWithRarityAndType.mock.calls.map(call => call[1])
    ]).toEqual(['Uncommon', 'Epic', ['Uncommon', 'Epic']]);
  });

  test('loot chest high-rarity generation delegates to LootGen chest policy when available', () => {
    const context = createBrowserContext();
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const { LootChest } = loadGloomvault('entities/LootChest.js', ['LootChest'], context);
    const lootGen = {
      getChestGuaranteedMinimumRarity: jest.fn(() => 'Epic'),
      generateGuaranteedRarityItem: jest.fn(() => ({ rarity: 'Epic' }))
    };

    const item = LootChest.generateHighRarityItem(lootGen, 7);

    expect([
      item.rarity,
      lootGen.getChestGuaranteedMinimumRarity.mock.calls[0][0],
      lootGen.generateGuaranteedRarityItem.mock.calls[0]
    ]).toEqual(['Epic', 7, [7, 'Epic', 'Random']]);
  });

  test('loot chest variant stays stable and resolves matching closed/opened sprite keys', () => {
    const context = createBrowserContext();
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const { LootChest } = loadGloomvault('entities/LootChest.js', ['LootChest'], context);

    const chest = new LootChest(128, 192, false);
    const locked = new LootChest(128, 192, true);
    const explicit = new LootChest(32, 64, false, { variant: 2 });

    const closedKey = chest.getSpriteKey();
    chest.opened = true;

    expect([
      chest.variant >= 1 && chest.variant <= 2,
      locked.variant >= 1 && locked.variant <= 2,
      closedKey,
      chest.getSpriteKey(),
      explicit.variant,
      explicit.getSpriteKey()
    ]).toEqual([
      true,
      true,
      `sprites.chest.${chest.variant}.closed`,
      `sprites.chest.${chest.variant}.opened`,
      2,
      'sprites.chest.2.closed'
    ]);
  });

  test('loot chest render prefers sprite assets and falls back safely with locked overlay', () => {
    const context = createBrowserContext();
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    const { LootChest } = loadGloomvault('entities/LootChest.js', ['LootChest'], context);

    const ctx = {
      save: jest.fn(),
      restore: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn(),
      fillText: jest.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      globalAlpha: 1,
      font: '',
      textAlign: '',
      textBaseline: ''
    };
    const renderer = {
      camera: { worldToScreen: () => ({ x: 100, y: 120 }) },
      drawAsset: jest.fn(() => true)
    };
    const chest = new LootChest(100, 120, true, { variant: 1 });

    chest.render(ctx, renderer);

    expect([
      renderer.drawAsset.mock.calls[0][0],
      ctx.fillRect.mock.calls.length,
      ctx.fillText.mock.calls.some(call => call[0] === 'LOCK')
    ]).toEqual([
      'sprites.chest.1.closed',
      0,
      true
    ]);

    renderer.drawAsset.mockReturnValue(false);
    chest.render(ctx, renderer);

    expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(0);
  });
});

// Behaviour under test: UpgradeSystem applies upgrade, salvage, repair, and simulation rules without mutating simulations.
describe('Gloomvault UpgradeSystem', () => {
  let UpgradeSystem;

  beforeEach(() => {
    const context = createBrowserContext();
    loadGloomvault('config/UpgradeConfig.js', ['UpgradeConfig'], context);
    loadGloomvault('config/DurabilityConfig.js', ['DurabilityConfig'], context);
    UpgradeSystem = loadGloomvault('systems/UpgradeSystem.js', ['UpgradeSystem'], context).UpgradeSystem;
  });

  test('upgradeItem spends scraps, boosts stats, updates name, and repairs durability', () => {
    const item = {
      name: 'Steel Helm',
      rarity: 'Common',
      upgradeLevel: 0,
      gearScore: 10,
      durability: 1,
      maxDurability: 5,
      modifiers: [{ name: 'Damage', value: 10, type: 'percent' }],
      activeAbility: { type: 'heal', value: 20, cooldown: 5 }
    };

    const result = UpgradeSystem.upgradeItem(item, 15);

    expect([result, item.name, item.gearScore, item.modifiers[0].text, item.activeAbility.value, item.durability])
      .toEqual([{ success: true, remainingScraps: 5 }, 'Steel Helm +1', 11, '+11% Damage', 30, 5]);
  });

  test('cost salvage simulate and repair cover invalid and edge branches', () => {
    const maxed = { rarity: 'Common', upgradeLevel: 5 };
    const damaged = { rarity: 'Epic', gearScore: 100, durability: 5, maxDurability: 10, modifiers: [], upgradeLevel: 0 };
    const uncommon = { rarity: 'Uncommon', upgradeLevel: 0, gearScore: 40, durability: 8, maxDurability: 10, modifiers: [] };
    const simulated = UpgradeSystem.simulateUpgrade({ name: 'Frost Longbow +1', rarity: 'Common', upgradeLevel: 1, gearScore: 10, modifiers: [] });
    const repair = UpgradeSystem.repairItem(damaged, 100);

    expect([
      UpgradeSystem.getUpgradeCost(maxed),
      UpgradeSystem.getUpgradeCost(uncommon),
      UpgradeSystem.getSalvageValue(uncommon),
      UpgradeSystem.getRepairCost(uncommon),
      UpgradeSystem.getSalvageValue({ isStarter: true }),
      UpgradeSystem.getSalvageValue({ rarity: 'Unknown' }),
      simulated.name,
      repair.success,
      damaged.durability
    ]).toEqual([null, 25, 12, 3, 0, 1, 'Frost Longbow +2', true, 10]);
  });

  test('ability upgrades cover nova dash and hot branches', () => {
    const nova = { type: 'nova', damage: 5, projectiles: 8, cooldown: 4 };
    const dash = { type: 'dash', speed: 100, cooldown: 2 };
    const hot = { type: 'hot', value: 10, duration: 6, cooldown: 3 };
    const scout = { type: 'scout', revealRadius: 22, cooldown: 60 };
    const tether = { type: 'phase_tether', minTiles: 5, maxTiles: 8, cooldown: 12 };
    const bomb = { type: 'element_bomb', element: 'fire', damage: 20, radius: 120, cooldown: 14 };
    const lightning = { type: 'lightning_strike', damage: 48, chains: 3, cooldown: 18 };
    const dummy = { type: 'target_dummy', radius: 520, duration: 4, cooldown: 24 };
    const siphon = { type: 'soul_siphon', lifesteal: 0.45, duration: 4, cooldown: 26 };
    UpgradeSystem.upgradeAbility(nova);
    UpgradeSystem.upgradeAbility(dash);
    UpgradeSystem.upgradeAbility(hot);
    UpgradeSystem.upgradeAbility(scout);
    UpgradeSystem.upgradeAbility(tether);
    UpgradeSystem.upgradeAbility(bomb);
    UpgradeSystem.upgradeAbility(lightning);
    UpgradeSystem.upgradeAbility(dummy);
    UpgradeSystem.upgradeAbility(siphon);
    expect([
      nova.damage,
      nova.projectiles,
      dash.speed,
      hot.duration,
      scout.revealRadius,
      tether.maxTiles,
      bomb.damage,
      bomb.radius,
      lightning.damage,
      dummy.radius,
      siphon.duration,
      siphon.lifesteal
    ]).toEqual([10, 9, 150, 5, 24, 9, 25, 128, 56, 560, 4.5, expect.closeTo(0.5, 5)]);
  });
});

// Behaviour under test: new trinket pack plugs into loot, minimap, movement safety, combat effects, aggro, and temporary buffs.
describe('Gloomvault expanded trinkets', () => {
  function loadTrinketEngineContext(extra = {}) {
    const context = createBrowserContext(extra);
    loadGloomvault('config/CombatConfig.js', ['CombatConfig'], context);
    loadGloomvault('entities/Entity.js', ['Entity'], context);
    context.Projectile = loadGloomvault('entities/Projectile.js', ['Projectile'], context).Projectile;
    const { GameEngine } = loadGloomvault('core/GameEngine.js', ['GameEngine'], context);
    return { context, GameEngine };
  }

  test('loot generation can force the new trinket abilities', () => {
    const context = createBrowserContext();
    loadGloomvault('config/LootConfig.js', ['LootConfig'], context);
    loadGloomvault('config/DurabilityConfig.js', ['DurabilityConfig'], context);
    const { LootGen } = loadGloomvault('systems/LootGen.js', ['LootGen'], context);
    const lootGen = new LootGen();

    const abilityTypes = ['scout', 'phase_tether', 'element_bomb', 'lightning_strike', 'target_dummy', 'soul_siphon']
      .map(type => lootGen.generateCustomItem(3, {
        typeSlot: 'trinket',
        rarityName: 'Common',
        trinketAbilityType: type
      }).activeAbility.type);

    expect(abilityTypes).toEqual(['scout', 'phase_tether', 'element_bomb', 'lightning_strike', 'target_dummy', 'soul_siphon']);
  });

  test('scout permanently reveals a broad minimap area', () => {
    const { GameEngine } = loadTrinketEngineContext();
    const engine = Object.assign(Object.create(GameEngine.prototype), {
      player: { x: 55, y: 55 },
      mapGen: { tileSize: 10, cols: 12, rows: 12, visitedGrid: new Array(144).fill(false) },
      combatFeedback: { addText: jest.fn() },
      particleSystem: { emitImpact: jest.fn() }
    });

    engine.revealMinimapArea({ revealRadius: 3 });

    expect([
      engine.mapGen.visitedGrid[5 * 12 + 5],
      engine.mapGen.visitedGrid.filter(Boolean).length > 20,
      engine.combatFeedback.addText.mock.calls[0][0]
    ]).toEqual([true, true, 'Scouted']);
  });

  test('phase tether resolves through walls to a safe floor tile', () => {
    const { GameEngine } = loadTrinketEngineContext();
    const floors = new Set(['1,1', '9,1']);
    const mapGen = {
      tileSize: 10,
      cols: 12,
      rows: 3,
      getTile: (x, y) => floors.has(`${x},${y}`) ? 1 : 0
    };
    const player = {
      x: 15,
      y: 15,
      angle: 0,
      width: 4,
      height: 4,
      checkCollision: jest.fn(() => false)
    };
    const engine = Object.assign(Object.create(GameEngine.prototype), {
      player,
      mapGen,
      tileSize: 10,
      combatFeedback: { addText: jest.fn() },
      particleSystem: { emitDashTrail: jest.fn(), emitImpact: jest.fn() }
    });

    const moved = engine.phaseTether({ minTiles: 5, maxTiles: 8 }, 0);

    expect([moved, player.x, player.y, player.checkCollision.mock.calls.length > 0]).toEqual([true, 95, 15, true]);
  });

  test('element bombs explode into clouds that apply matching status effects', () => {
    const { GameEngine } = loadTrinketEngineContext();
    const enemy = {
      x: 100,
      y: 100,
      width: 20,
      hp: 100,
      statusEffects: [],
      takeDamage: jest.fn(function(damage) { this.hp -= damage; })
    };
    const cloudEnemy = {
      x: 112,
      y: 100,
      width: 20,
      hp: 100,
      statusEffects: [],
      takeDamage: jest.fn()
    };
    const engine = Object.assign(Object.create(GameEngine.prototype), {
      enemies: [enemy, cloudEnemy],
      trinketEffects: [],
      particleSystem: { emitImpact: jest.fn() },
      combatFeedback: { addText: jest.fn() },
      camera: { shake: jest.fn() }
    });

    engine.explodeElementBomb({ x: 100, y: 100, damage: 20, element: 'poison', color: '#1f8f38', bombRadius: 30, cloudDuration: 3 });
    engine.updateTrinketRuntimeEffects(0.35);

    expect([
      enemy.hp,
      enemy.statusEffects.some(effect => effect.type === 'sickness'),
      cloudEnemy.statusEffects.some(effect => effect.type === 'sickness'),
      engine.trinketEffects[0].kind
    ]).toEqual([80, true, true, 'element_cloud']);
  });

  test('lightning chains to unique targets with damage falloff', () => {
    const { GameEngine } = loadTrinketEngineContext();
    const makeEnemy = (x) => ({
      x,
      y: 0,
      hp: 100,
      width: 20,
      takeDamage: jest.fn(function(damage) { this.hp -= damage; })
    });
    const enemies = [makeEnemy(50), makeEnemy(120), makeEnemy(190), makeEnemy(260), makeEnemy(800)];
    const engine = Object.assign(Object.create(GameEngine.prototype), {
      player: { x: 0, y: 0 },
      enemies,
      trinketEffects: [],
      particleSystem: { emitImpact: jest.fn() },
      combatFeedback: { addText: jest.fn() }
    });

    engine.castLightningStrike({ damage: 40, chains: 3, chainRange: 100, falloff: 0.5 });

    expect([
      enemies.slice(0, 4).map(enemy => enemy.takeDamage.mock.calls[0][0]),
      enemies[4].takeDamage.mock.calls.length,
      engine.trinketEffects.length
    ]).toEqual([[40, 20, 10, 5], 0, 4]);
  });

  test('target dummy redirects nearby enemy targeting and expires', () => {
    const { GameEngine } = loadTrinketEngineContext();
    const engine = Object.assign(Object.create(GameEngine.prototype), {
      player: { x: 50, y: 50, width: 30, height: 30, angle: 0, checkCollision: jest.fn(() => false) },
      enemies: [{ x: 80, y: 50, hp: 10, pathTimer: 1 }],
      decoys: [],
      mapGen: { tileSize: 10, cols: 20, rows: 20, getTile: () => 1 },
      combatFeedback: { addText: jest.fn() }
    });

    engine.spawnTargetDummy({ duration: 4, radius: 100 }, 0);
    const target = engine.getEnemyTargetForEnemy(engine.enemies[0]);
    engine.updateTrinketRuntimeEffects(4.1);

    expect([target.isDecoy, engine.enemies[0].isAggroed, engine.decoys.length]).toEqual([true, true, 0]);
  });

  test('soul siphon grants temporary lifesteal and then clears', () => {
    const { GameEngine } = loadTrinketEngineContext();
    const player = { x: 0, y: 0 };
    const engine = Object.assign(Object.create(GameEngine.prototype), {
      player,
      decoys: [],
      trinketEffects: [],
      combatFeedback: { addText: jest.fn() },
      particleSystem: { emitImpact: jest.fn() }
    });

    engine.applySoulSiphon({ lifesteal: 0.45, duration: 4 });
    engine.updateTrinketRuntimeEffects(4.1);

    expect([player.soulSiphonTimer, player.soulSiphonLifesteal, player.soulSiphonCapBonus]).toEqual([0, 0, 0]);
  });
});

// Behaviour under test: Weapon variants configure projectile behavior and cooldown branches.
describe('Gloomvault Weapon and Entity', () => {
  test('entity clamps damage and advances animation frames', () => {
    const context = createBrowserContext();
    const { Entity } = loadGloomvault('entities/Entity.js', ['Entity'], context);
    const entity = new Entity(1, 2, 3, 4, 10);
    entity.takeDamage(12);
    entity.updateAnimation(0.1);
    expect([entity.hp, entity.currentFrame]).toEqual([0, 1]);
  });

  test('entity status glow splits multiple effect colors', () => {
    const context = createBrowserContext();
    const { Entity } = loadGloomvault('entities/Entity.js', ['Entity'], context);
    const entity = new Entity(10, 20, 30, 40, 10);
    entity.statusEffects = [
      { type: 'frost', color: '#8fdcff', durationLeft: 1 },
      { type: 'radiance', color: '#fff2a6', durationLeft: 1 },
      { type: 'expired', color: '#ff0000', durationLeft: 0 }
    ];
    const ctx = {
      save: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      stroke: jest.fn()
    };

    entity.renderStatusGlow(ctx, { camera: { worldToScreen: () => ({ x: 10, y: 20 }) } });

    expect([entity.getStatusGlowColors(), ctx.arc.mock.calls.length, ctx.stroke.mock.calls.length])
      .toEqual([['#8fdcff', '#fff2a6'], 2, 2]);
  });

  test('weapon variants create expected projectile counts and respect cooldown', () => {
    const context = createBrowserContext({
      Projectile: class Projectile {
        constructor(...args) {
          this.args = args;
        }
      }
    });
    const { Weapon } = loadGloomvault('systems/Weapon.js', ['Weapon'], context);
    jest.spyOn(Math, 'random').mockReturnValue(0.5);

    const shotgun = new Weapon({ weaponType: 'shotgun' });
    const rapier = new Weapon({ weaponType: 'melee_stab', name: 'Quick Rapier' });
    const first = shotgun.attack(0, 0, 0);
    const second = shotgun.attack(0, 0, 0);

    expect([first.length, second, rapier.hasLunge, rapier.baseCooldown, rapier.movementSpeedBonus]).toEqual([5, null, false, 0.3, 40]);
  });

  test('lance and cleave branches adjust melee damage and projectile spread', () => {
    const context = createBrowserContext({
      Projectile: class Projectile {
        constructor(...args) {
          this.args = args;
        }
      }
    });
    const { Weapon } = loadGloomvault('systems/Weapon.js', ['Weapon'], context);
    jest.spyOn(Math, 'random').mockReturnValue(0.5);

    const lance = new Weapon({ weaponType: 'melee_stab', name: 'Heavy Lance' });
    const cleave = new Weapon({ weaponType: 'melee_cleave' }, false);
    const projectiles = cleave.attack(0, 0, 0);

    expect([lance.hasLunge, lance.lungeMultiplier, cleave.meleeDamageMultiplier, projectiles.length]).toEqual([true, 1.25, 1, 3]);
  });

  test('fantasy elements add projectile metadata, shadow pierce, and staff overcharge stagger', () => {
    const context = createBrowserContext();
    const { Entity } = loadGloomvault('entities/Entity.js', ['Entity'], context);
    context.Entity = Entity;
    loadGloomvault('config/CombatConfig.js', ['CombatConfig'], context);
    const { Projectile } = loadGloomvault('entities/Projectile.js', ['Projectile'], context);
    context.Projectile = Projectile;
    const { Weapon } = loadGloomvault('systems/Weapon.js', ['Weapon'], context);
    jest.spyOn(Math, 'random').mockReturnValue(0.5);

    const shadowBow = new Weapon({ weaponType: 'sniper', element: 'shadow' });
    const overStaff = new Weapon({ weaponType: 'shotgun', element: 'frost', weaponVariant: 'overcharged' });
    const shadowProjectile = shadowBow.attack(0, 0, 0)[0];
    const staffProjectile = overStaff.attack(0, 0, 0)[0];

    expect([
      shadowBow.attackName,
      shadowProjectile.element,
      shadowProjectile.pierce,
      staffProjectile.attackName,
      staffProjectile.weaponVariant,
      staffProjectile.staggerDuration > 0
    ]).toEqual(['Runic Longshot', 'shadow', true, 'Staff Burst', 'overcharged', true]);
  });

  test('arcane weapons release charged shots and cap at max duration', () => {
    const context = createBrowserContext({
      Projectile: class Projectile {
        constructor(...args) {
          this.args = args;
        }
      }
    });
    loadGloomvault('config/CombatConfig.js', ['CombatConfig'], context);
    const { Weapon } = loadGloomvault('systems/Weapon.js', ['Weapon'], context);
    jest.spyOn(Math, 'random').mockReturnValue(0.5);

    const wand = new Weapon({ weaponType: 'pistol', element: 'arcane' });
    wand.startCharge();
    wand.update(1.5);
    const released = wand.releaseChargedAttack(0, 0, 0);
    wand.update(3);
    wand.startCharge();
    wand.update(5);

    expect([
      released[0].args[4],
      released[0].args[8].chargeMultiplier,
      wand.isFullyCharged(),
      wand.getChargeMultiplier()
    ]).toEqual([25, 1.25, true, 1.5]);
  });

  test('engine status effects slow, stack, amplify, and spread at configured ranges', () => {
    const context = createBrowserContext();
    const { Entity } = loadGloomvault('entities/Entity.js', ['Entity'], context);
    context.Entity = Entity;
    const { Projectile } = loadGloomvault('entities/Projectile.js', ['Projectile'], context);
    context.Projectile = Projectile;
    loadGloomvault('config/CombatConfig.js', ['CombatConfig'], context);
    const { GameEngine } = loadGloomvault('core/GameEngine.js', ['GameEngine'], context);
    const engine = Object.assign(Object.create(GameEngine.prototype), {
      enemies: [],
      projectiles: [],
      particleSystem: { emitImpact: jest.fn() },
      combatFeedback: { addText: jest.fn() }
    });
    const target = { x: 40, y: 50, hp: 100, statusEffects: [], statusSpeedMultiplier: 1 };

    engine.applyElementalHit(target, { element: 'frost' });
    engine.applyElementalHit(target, { element: 'felfire' });
    engine.applyElementalHit(target, { element: 'felfire' });
    engine.applyElementalHit(target, { element: 'shadow' });
    engine.processStatusEffects(target, 1);

    const deadHoly = { x: 0, y: 0, hp: 0, statusEffects: [{ type: 'radiance', durationLeft: 1 }] };
    const holyTarget = { x: 300, y: 0, hp: 100, statusEffects: [] };
    const poisonTarget = { x: 180, y: 0, hp: 100, statusEffects: [] };
    engine.enemies = [deadHoly, holyTarget, poisonTarget];
    engine.handleElementalDeathBurst(deadHoly);
    const radianceProjectiles = engine.projectiles.length;
    const holyAppliedInstantly = holyTarget.statusEffects.some(effect => effect.type === 'radiance');

    const deadPoison = { x: 0, y: 0, hp: 0, statusEffects: [{ type: 'sickness', durationLeft: 1 }] };
    const closeTarget = { x: 120, y: 0, hp: 100, statusEffects: [] };
    const farTarget = { x: 180, y: 0, hp: 100, statusEffects: [] };
    engine.enemies = [deadPoison, closeTarget, farTarget];
    engine.projectiles = [];
    engine.handleElementalDeathBurst(deadPoison);
    const poisonProjectiles = engine.projectiles.length;
    const poisonAppliedInstantly = closeTarget.statusEffects.some(effect => effect.type === 'sickness');

    expect([
      target.statusSpeedMultiplier,
      target.hp,
      engine.combatFeedback.addText.mock.calls[0],
      engine.getDamageTakenMultiplier(target),
      radianceProjectiles,
      holyAppliedInstantly,
      poisonProjectiles,
      poisonAppliedInstantly,
      farTarget.statusEffects.some(effect => effect.type === 'sickness')
    ]).toEqual([0.55, 94, ['-6', 40, 36, '#67ff3a', 12, 0.75], 1.25, 8, false, 8, false, false]);
  });

  test('player arcane input fires on release and auto-fires at three seconds', () => {
    const context = createBrowserContext();
    loadGloomvault('config/CombatConfig.js', ['CombatConfig'], context);
    context.DurabilityConfig = { weapon: { degradePerAttack: 1 } };
    const { Entity } = loadGloomvault('entities/Entity.js', ['Entity'], context);
    context.Entity = Entity;
    const { Projectile } = loadGloomvault('entities/Projectile.js', ['Projectile'], context);
    context.Projectile = Projectile;
    const { Weapon } = loadGloomvault('systems/Weapon.js', ['Weapon'], context);
    context.Weapon = Weapon;
    const { Player } = loadGloomvault('entities/Player.js', ['Player'], context);
    jest.spyOn(Math, 'random').mockReturnValue(0.5);

    const player = new Player(50, 50);
    player.equipment.weapon = { type: 'weapon', weaponType: 'pistol', element: 'arcane', modifiers: [], durability: 10, maxDurability: 10 };
    player.recalculateStats();
    const map = { tileSize: 10, cols: 20, rows: 20, getTile: () => 1 };
    const camera = { screenToWorld: () => ({ x: 100, y: 50 }) };
    const particleSystem = { emitDashTrail: jest.fn() };
    const input = {
      mouse: { x: 0, y: 0, down: true, rightDown: false },
      isKeyDown: jest.fn(() => false)
    };

    player.update(0.01, input, camera, map, particleSystem);
    const charging = player.update(1.5, input, camera, map, particleSystem);
    input.mouse.down = false;
    const released = player.update(0.01, input, camera, map, particleSystem);
    player.weapon1.cooldownTimer = 0;
    input.mouse.down = true;
    player.update(0.01, input, camera, map, particleSystem);
    player.update(3.1, input, camera, map, particleSystem);

    expect([charging.length, released.length, released[0].chargeMultiplier, player.equipment.weapon.durability])
      .toEqual([0, 1, expect.closeTo(1.25, 2), 8]);
  });

  test('healing well passive stacks max health and ticks healing every five seconds', () => {
    const context = createBrowserContext();
    const { Entity } = loadGloomvault('entities/Entity.js', ['Entity'], context);
    context.Entity = Entity;
    const { Player } = loadGloomvault('entities/Player.js', ['Player'], context);
    const player = new Player(50, 50);
    const particleSystem = { emitImpact: jest.fn() };

    player.hp = 40;
    player.applyHealingWellBuff();
    player.hp = 60;
    player.applyHealingWellBuff();
    const stackedMaxHp = player.maxHp;
    const stackedCount = player.getHealingWellStackCount();

    player.hp = 60;
    player.updatePassiveBuffs(4.9, particleSystem);
    const beforeTick = player.hp;
    player.updatePassiveBuffs(0.1, particleSystem);
    const afterTick = player.hp;

    player.hp = player.maxHp;
    player.updatePassiveBuffs(85.1, particleSystem);

    expect([
      stackedCount,
      stackedMaxHp,
      player.getHealingWellStackCount(),
      player.maxHp,
      beforeTick,
      afterTick,
      player.passiveBuffs.length,
      player.hp,
      particleSystem.emitImpact.mock.calls.length
    ]).toEqual([
      2,
      120,
      0,
      100,
      60,
      expect.closeTo(64.8, 4),
      0,
      100,
      1
    ]);
  });
});
