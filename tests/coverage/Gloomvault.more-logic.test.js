const { createBrowserContext, loadBrowserScript } = require('../helpers/browserScriptHarness');

function load(context, relativePath, exports) {
  if (relativePath === 'entities/Enemy.js') {
    if (!context.EnemyFactory) {
      loadBrowserScript(context, 'games/gloomvault-extraction/js/systems/EnemyFactory.js', ['EnemyFactory']);
    }
    if (!context.BossBehaviorService) {
      loadBrowserScript(context, 'games/gloomvault-extraction/js/systems/BossBehaviorService.js', ['BossBehaviorService']);
    }
    if (!context.EnemyRenderService) {
      loadBrowserScript(context, 'games/gloomvault-extraction/js/systems/EnemyRenderService.js', ['EnemyRenderService']);
    }
  }
  return loadBrowserScript(context, `games/gloomvault-extraction/js/${relativePath}`, exports);
}

function loadLootContext() {
  const context = createBrowserContext();
  load(context, 'config/LootConfig.js', ['LootConfig']);
  load(context, 'config/DurabilityConfig.js', ['DurabilityConfig']);
  return { context, LootGen: load(context, 'systems/LootGen.js', ['LootGen']).LootGen };
}

// Behaviour under test: Loot generation respects rarity/type forcing, weapon/trinket branches, durability, and fallback rarity.
describe('Gloomvault LootGen additional logic', () => {
  afterEach(() => jest.restoreAllMocks());

  test('rollRarity uses configured weights and forced unknown rarity falls back to common', () => {
    const { LootGen } = loadLootContext();
    const loot = new LootGen();
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const legendary = loot.rollRarity(8).name;
    const fallback = loot.generateItemWithRarityAndType(1, 'Mystery', 'helm');
    expect([legendary, fallback.rarity, fallback.type]).toEqual(['Legendary', 'Common', 'helm']);
  });

  test('forced weapon generation assigns weapon type and durability', () => {
    const { LootGen } = loadLootContext();
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const item = new LootGen().generateItemWithRarityAndType(2, 'Epic', 'weapon');
    expect([item.type, item.rarity, item.weaponType, item.element, item.name, item.durability === item.maxDurability])
      .toEqual(['weapon', 'Epic', 'pistol', 'frost', 'Frost Wand', true]);
  });

  test('item names use archetype, element, variant, and ability identity', () => {
    const { LootGen } = loadLootContext();
    const loot = new LootGen();

    expect([
      loot.buildItemName('weapon', 'Longbow', '', '', '', null, null, null),
      loot.buildItemName('weapon', 'Crossbow', '', '', 'Arcane', null, null, null),
      loot.buildItemName('weapon', 'Staff', '', '', 'Frost', 'overcharged', null, null),
      loot.buildItemName('trinket', 'Trinket', '', '', '', null, { type: 'heal' }, null),
      loot.buildItemName('trinket', 'Trinket', '', '', '', null, { type: 'nova' }, { name: 'Glass Cannon' })
    ]).toEqual([
      'Longbow',
      'Arcane Crossbow',
      'Frost Overcharged Staff',
      'Healing Charm',
      'Arcane Nova Sigil of Glass Cannon'
    ]);
  });

  test('weapon element rolls follow archetype chances', () => {
    const { LootGen } = loadLootContext();
    const loot = new LootGen();
    jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0.49)
      .mockReturnValueOnce(0.2)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.24)
      .mockReturnValueOnce(0.1)
      .mockReturnValueOnce(0.25);

    expect([
      loot.rollElementForWeaponType('assault_rifle').id,
      loot.rollElementForWeaponType('assault_rifle'),
      loot.rollElementForWeaponType('melee_stab').id,
      loot.rollElementForWeaponType('melee_stab')
    ]).toEqual(['fire', null, 'frost', null]);
  });

  test('legendary trinkets receive active ability and no durability', () => {
    const { LootGen } = loadLootContext();
    jest.spyOn(Math, 'random').mockReturnValue(0.75);
    const item = new LootGen().generateItemWithRarityAndType(3, 'Legendary', 'trinket');
    expect([item.type, item.rarity, Boolean(item.activeAbility), 'durability' in item]).toEqual(['trinket', 'Legendary', true, false]);
  });
});

// Behaviour under test: Gloomvault lightweight entities update state and call owned collaborators without rendering.
describe('Gloomvault lightweight entities and systems', () => {
  afterEach(() => jest.restoreAllMocks());

  test('camera keeps fixed world vision across screen-size changes', () => {
    const context = createBrowserContext();
    const { Camera } = load(context, 'core/Camera.js', ['Camera']);
    const camera = new Camera(1280, 720);

    const initialVision = [camera.width, camera.height];
    camera.updateDimensions(1600, 900);
    const zoomedVision = [camera.width, camera.height];

    camera.setBounds(3000, 2000);
    camera.follow({ x: 2900, y: 1900 }, 1);

    expect([initialVision, zoomedVision, camera.renderScale, camera.x <= 3000 - camera.width, camera.y <= 2000 - camera.height])
      .toEqual([[1600, 900], [1600, 900], 1, true, true]);
  });

  test('camera screen world conversion accounts for render scale and crop offsets', () => {
    const context = createBrowserContext();
    const { Camera } = load(context, 'core/Camera.js', ['Camera']);
    const camera = new Camera(1920, 720);
    camera.x = 100;
    camera.y = 200;

    const screen = camera.worldToScreen(740, 560);
    const actualScreen = {
      x: screen.x * camera.renderScale + camera.offsetX,
      y: screen.y * camera.renderScale + camera.offsetY
    };
    const world = camera.screenToWorld(actualScreen.x, actualScreen.y);

    expect([camera.width, camera.height, camera.renderScale, camera.offsetY, world])
      .toEqual([1600, 900, 1.2, -180, { x: 740, y: 560 }]);
  });

  test('input converts CSS mouse coordinates to canvas backing pixels', () => {
    const listeners = {};
    const context = createBrowserContext({
      addEventListener: jest.fn(),
      window: {
        addEventListener: jest.fn()
      }
    });
    context.window.window = context.window;
    context.window.globalThis = context;
    const { Input } = load(context, 'core/Input.js', ['Input']);
    const input = new Input();
    const canvas = {
      width: 1600,
      height: 900,
      getBoundingClientRect: () => ({ left: 10, top: 20, width: 800, height: 450 }),
      addEventListener: jest.fn((type, handler) => {
        listeners[type] = handler;
      }),
      removeEventListener: jest.fn((type, handler) => {
        if (listeners[type] === handler) delete listeners[type];
      })
    };

    input.attach(canvas);
    input.attach(canvas);
    listeners.mousemove({ clientX: 410, clientY: 245 });
    listeners.mousedown({ button: 0 });
    input.detach();

    expect([
      input.mouse,
      canvas.addEventListener.mock.calls.map(call => call[0]),
      canvas.removeEventListener.mock.calls.map(call => call[0]),
      Object.keys(listeners)
    ]).toEqual([
      { x: 800, y: 450, down: false, rightDown: false },
      ['mousemove', 'mousedown', 'mouseup', 'contextmenu'],
      ['mousemove', 'mousedown', 'mouseup', 'contextmenu'],
      []
    ]);
  });

  test('projectile expires and detects map wall collision', () => {
    const context = createBrowserContext();
    const { Entity } = load(context, 'entities/Entity.js', ['Entity']);
    context.Entity = Entity;
    const { Projectile } = load(context, 'entities/Projectile.js', ['Projectile']);
    const projectile = new Projectile(5, 5, 0, 10, 12.4, 0.1, true, 'melee_cleave');
    projectile.update(0.05, { tileSize: 10, cols: 2, rows: 2, getTile: () => 1 }, { emitDashTrail: jest.fn() });
    projectile.update(0.1);
    expect([projectile.damage, projectile.isMelee, projectile.pierce, projectile.markedForDeletion]).toEqual([12, true, true, true]);
  });

  test('dropped items float with elapsed time', () => {
    const context = createBrowserContext();
    const { Entity } = load(context, 'entities/Entity.js', ['Entity']);
    context.Entity = Entity;
    const { DroppedItem } = load(context, 'entities/DroppedItem.js', ['DroppedItem']);
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const item = new DroppedItem(10, 20, { color: '#fff' });
    item.update(Math.PI / 6);
    expect([item.pickupRadius, item.floatOffset]).toEqual([50, expect.any(Number)]);
  });

  test('floor transition and extraction portal flag nearby enemies', () => {
    const context = createBrowserContext();
    const { Entity } = load(context, 'entities/Entity.js', ['Entity']);
    context.Entity = Entity;
    const { FloorTransition } = load(context, 'entities/FloorTransition.js', ['FloorTransition']);
    const { ExtractionPortal } = load(context, 'entities/ExtractionPortal.js', ['ExtractionPortal']);
    const descendToNextFloor = jest.fn();
    const floor = new FloorTransition(0, 0, 'door');
    const portal = new ExtractionPortal(0, 0);
    floor.update(0.5, [{ x: 100, y: 0 }]);
    portal.update(0.5, [{ x: 500, y: 0 }]);
    floor.interact({ descendToNextFloor });
    floor.interact({ descendToNextFloor });
    expect([floor.enemiesNearby, portal.enemiesNearby, floor.activated, descendToNextFloor.mock.calls.length]).toEqual([true, false, true, 1]);
  });

  test('extraction portal renders animated sprite frames with primitive fallback', () => {
    const context = createBrowserContext();
    const { Entity } = load(context, 'entities/Entity.js', ['Entity']);
    context.Entity = Entity;
    const { ExtractionPortal } = load(context, 'entities/ExtractionPortal.js', ['ExtractionPortal']);
    const portal = new ExtractionPortal(40, 50);
    const ctx = {
      save: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0
    };
    const renderer = {
      camera: { worldToScreen: jest.fn(() => ({ x: 100, y: 120 })) },
      drawAsset: jest.fn(() => true)
    };

    portal.update(0.12, []);
    portal.render(ctx, renderer);
    renderer.drawAsset.mockReturnValue(false);
    portal.render(ctx, renderer);

    expect([
      portal.getSpriteKey(),
      renderer.drawAsset.mock.calls[0],
      ctx.arc.mock.calls.length > 0
    ]).toEqual([
      'sprites.extractionPortal.2',
      ['sprites.extractionPortal.2', 40, 50, 112, 112],
      true
    ]);
  });

  test('boss enemy has boss stats and skips elite mutation', () => {
    const context = createBrowserContext({
      Weapon: class Weapon {
        constructor(item) { Object.assign(this, { weaponType: item.weaponType }); }
        update() {}
      }
    });
    const { Entity } = load(context, 'entities/Entity.js', ['Entity']);
    context.Entity = Entity;
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const { Enemy } = load(context, 'entities/Enemy.js', ['Enemy']);

    const boss = new Enemy(10, 20, 'boss', 2, 3);

    expect([boss.isBoss, boss.type, boss.width, boss.maxHp, boss.eliteModifier, boss.weapon.baseDamage])
      .toEqual([true, 'boss', 72, 1000, 'none', 165]);
  });

  test('boss aggros, paths, and attacks without relying on wander state', () => {
    const context = createBrowserContext({
      Weapon: class Weapon {
        constructor() { this.baseDamage = 1; this.cooldownTimer = 0; }
        update() {}
        attack() { return [{ owner: null }]; }
      }
    });
    const { Entity } = load(context, 'entities/Entity.js', ['Entity']);
    context.Entity = Entity;
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const { Enemy } = load(context, 'entities/Enemy.js', ['Enemy']);
    const map = { tileSize: 10, cols: 20, rows: 20, getTile: () => 1 };
    const pathfinder = { findPath: jest.fn(() => [{ x: 20, y: 10 }, { x: 30, y: 10 }]) };
    const boss = new Enemy(10, 10, 'boss');

    boss.update(0.1, { x: 160, y: 10 }, map, pathfinder);
    const projectiles = boss.update(0.1, { x: boss.x + 20, y: boss.y }, map, pathfinder);

    expect([boss.isAggroed, pathfinder.findPath.mock.calls.length > 0, boss.state, projectiles.length])
      .toEqual([true, true, 'attack', 1]);
  });

  test('patrol enemies move while idle and squad aggro propagates nearby', () => {
    const context = createBrowserContext({
      EnemyAIConfig: {
        awareness: { aggroRange: 120, sharedAggroRange: 180, leashRange: 500, investigateTime: 1, pathRefresh: 0.2 },
        movement: { waypointReachRadius: 5, wanderMinDistance: 40, wanderMaxDistance: 80, wanderPauseMin: 0, wanderPauseMax: 0, patrolPauseMin: 0, patrolPauseMax: 0, patrolSpeedMultiplier: 1, wanderSpeedMultiplier: 1, formationSpeedMultiplier: 1, stuckRepathTime: 0.2 },
        roles: {
          grunt: { attackRange: 30, pressureRange: 160, fleeHealthPct: 0.1, strafeRange: 60, strafeSpeedMultiplier: 0.5, attackLock: 0.2 },
          ranged: { minRange: 90, preferredMin: 120, preferredMax: 180, maxRange: 240, shootRange: 220, repositionLock: 0.5, strafeSpeedMultiplier: 0.5, retreatSpeedMultiplier: 0.5 },
          brute: { telegraphRange: 80, chaseRange: 200, windup: 0.5, dashTime: 0.2, recovery: 0.2, attackCooldown: 1 },
          boss: { aggroRange: 200, attackRange: 50, pathRefresh: 0.2 }
        },
        dodge: { predictionTime: 0.3, triggerDistance: 20, duration: 0.15, speed: 180, cooldown: 2, rangedChance: 0, gruntChance: 0, fastEliteChance: 0, textCooldown: 0.5 }
      },
      Weapon: class Weapon {
        constructor() { this.cooldownTimer = 1; }
        update() {}
        attack() { return null; }
      }
    });
    const { Entity } = load(context, 'entities/Entity.js', ['Entity']);
    context.Entity = Entity;
    jest.spyOn(Math, 'random').mockReturnValue(0.2);
    const { Enemy } = load(context, 'entities/Enemy.js', ['Enemy']);
    const map = { tileSize: 10, cols: 20, rows: 20, getTile: () => 1 };
    const pathfinder = { findPath: jest.fn((sx, sy, tx, ty) => [{ x: sx, y: sy }, { x: tx, y: ty }]) };
    const scout = new Enemy(20, 20, 'grunt', 1, 1, { patrolRoute: [{ x: 80, y: 20 }, { x: 80, y: 80 }] });
    const guard = new Enemy(40, 20, 'grunt', 1, 1, { squadId: 'squad-a' });
    const mate = new Enemy(55, 20, 'grunt', 1, 1, { squadId: 'squad-a' });
    guard.isAggroed = true;
    scout.wanderTimer = 0;

    scout.update(0.2, { x: 500, y: 500 }, map, pathfinder, { enemies: [scout] });
    mate.update(0.1, { x: 500, y: 500 }, map, pathfinder, { enemies: [guard, mate] });

    expect([scout.x > 20, scout.state, mate.isAggroed, mate.state]).toEqual([true, 'patrol', true, 'chase']);
  });

  test('ranged enemies commit to range decisions instead of threshold jitter', () => {
    const context = createBrowserContext({
      EnemyAIConfig: {
        awareness: { aggroRange: 600, sharedAggroRange: 180, leashRange: 800, investigateTime: 1, pathRefresh: 0.2 },
        movement: { waypointReachRadius: 5, wanderMinDistance: 40, wanderMaxDistance: 80, wanderPauseMin: 0, wanderPauseMax: 0, patrolPauseMin: 0, patrolPauseMax: 0, patrolSpeedMultiplier: 1, wanderSpeedMultiplier: 1, formationSpeedMultiplier: 1, stuckRepathTime: 0.2 },
        roles: {
          grunt: { attackRange: 30, pressureRange: 160, fleeHealthPct: 0.1, strafeRange: 60, strafeSpeedMultiplier: 0.5, attackLock: 0.2 },
          ranged: { minRange: 210, preferredMin: 240, preferredMax: 330, maxRange: 460, shootRange: 430, repositionLock: 0.8, strafeSpeedMultiplier: 0.5, retreatSpeedMultiplier: 0.5 },
          brute: { telegraphRange: 80, chaseRange: 200, windup: 0.5, dashTime: 0.2, recovery: 0.2, attackCooldown: 1 },
          boss: { aggroRange: 200, attackRange: 50, pathRefresh: 0.2 }
        },
        dodge: { predictionTime: 0.3, triggerDistance: 20, duration: 0.15, speed: 180, cooldown: 2, rangedChance: 0, gruntChance: 0, fastEliteChance: 0, textCooldown: 0.5 }
      },
      Weapon: class Weapon {
        constructor() { this.cooldownTimer = 1; }
        update() {}
        attack() { return null; }
      }
    });
    const { Entity } = load(context, 'entities/Entity.js', ['Entity']);
    context.Entity = Entity;
    jest.spyOn(Math, 'random').mockReturnValue(0.2);
    const { Enemy } = load(context, 'entities/Enemy.js', ['Enemy']);
    const map = { tileSize: 10, cols: 80, rows: 80, getTile: () => 1 };
    const enemy = new Enemy(0, 0, 'ranged');
    enemy.isAggroed = true;

    enemy.update(0.1, { x: 280, y: 0 }, map, { findPath: jest.fn(() => []) }, { enemies: [enemy] });
    const firstState = enemy.state;
    enemy.update(0.1, { x: 205, y: 0 }, map, { findPath: jest.fn(() => []) }, { enemies: [enemy] });

    expect([firstState, enemy.state, enemy.stateLockTimer > 0]).toEqual(['reposition', 'reposition', true]);
  });

  test('enemy line-of-sight checks skip far idle enemies but keep aggro paths reactive', () => {
    const context = createBrowserContext({
      EnemyAIConfig: {
        awareness: { aggroRange: 120, sharedAggroRange: 180, leashRange: 500, investigateTime: 1, pathRefresh: 0.2 },
        movement: { waypointReachRadius: 5, wanderMinDistance: 40, wanderMaxDistance: 80, wanderPauseMin: 1, wanderPauseMax: 1, patrolPauseMin: 0, patrolPauseMax: 0, patrolSpeedMultiplier: 1, wanderSpeedMultiplier: 1, formationSpeedMultiplier: 1, stuckRepathTime: 0.2 },
        roles: {
          grunt: { attackRange: 30, pressureRange: 160, fleeHealthPct: 0.1, strafeRange: 60, strafeSpeedMultiplier: 0.5, attackLock: 0.2 },
          ranged: { minRange: 90, preferredMin: 120, preferredMax: 180, maxRange: 240, shootRange: 220, repositionLock: 0.5, strafeSpeedMultiplier: 0.5, retreatSpeedMultiplier: 0.5 },
          brute: { telegraphRange: 80, chaseRange: 200, windup: 0.5, dashTime: 0.2, recovery: 0.2, attackCooldown: 1 },
          boss: { aggroRange: 200, attackRange: 50, pathRefresh: 0.2 }
        },
        dodge: { predictionTime: 0.3, triggerDistance: 20, duration: 0.15, speed: 180, cooldown: 2, rangedChance: 0, gruntChance: 0, fastEliteChance: 0, textCooldown: 0.5 }
      },
      Weapon: class Weapon {
        constructor() { this.cooldownTimer = 1; }
        update() {}
        attack() { return null; }
      }
    });
    const { Entity } = load(context, 'entities/Entity.js', ['Entity']);
    context.Entity = Entity;
    jest.spyOn(Math, 'random').mockReturnValue(0.2);
    const { Enemy } = load(context, 'entities/Enemy.js', ['Enemy']);
    const map = { tileSize: 10, cols: 100, rows: 100, getTile: jest.fn(() => 1) };
    const pathfinder = { findPath: jest.fn(() => []) };
    const enemy = new Enemy(0, 0, 'grunt');
    const losSpy = jest.spyOn(enemy, 'hasLineOfSight');

    enemy.update(0.1, { x: 500, y: 0 }, map, pathfinder, { enemies: [enemy] });
    const farCalls = losSpy.mock.calls.length;
    enemy.update(0.1, { x: 60, y: 0 }, map, pathfinder, { enemies: [enemy] });
    const inRangeCalls = losSpy.mock.calls.length;
    enemy.isAggroed = true;
    enemy.update(0.1, { x: 500, y: 0 }, map, pathfinder, { enemies: [enemy] });

    expect([farCalls, inRangeCalls, losSpy.mock.calls.length]).toEqual([0, 1, 2]);
  });

  test('enemy dodge predicts ranged projectiles and respects melee or blocked lanes', () => {
    const context = createBrowserContext({
      EnemyAIConfig: {
        awareness: { aggroRange: 600, sharedAggroRange: 180, leashRange: 800, investigateTime: 1, pathRefresh: 0.2 },
        movement: { waypointReachRadius: 5, wanderMinDistance: 40, wanderMaxDistance: 80, wanderPauseMin: 0, wanderPauseMax: 0, patrolPauseMin: 0, patrolPauseMax: 0, patrolSpeedMultiplier: 1, wanderSpeedMultiplier: 1, formationSpeedMultiplier: 1, stuckRepathTime: 0.2 },
        roles: {
          grunt: { attackRange: 30, pressureRange: 160, fleeHealthPct: 0.1, strafeRange: 60, strafeSpeedMultiplier: 0.5, attackLock: 0.2 },
          ranged: { minRange: 90, preferredMin: 120, preferredMax: 180, maxRange: 240, shootRange: 220, repositionLock: 0.5, strafeSpeedMultiplier: 0.5, retreatSpeedMultiplier: 0.5 },
          brute: { telegraphRange: 80, chaseRange: 200, windup: 0.5, dashTime: 0.2, recovery: 0.2, attackCooldown: 1 },
          boss: { aggroRange: 200, attackRange: 50, pathRefresh: 0.2 }
        },
        dodge: { predictionTime: 0.5, triggerDistance: 12, duration: 0.2, speed: 120, cooldown: 2, rangedChance: 1, gruntChance: 0, fastEliteChance: 0, textCooldown: 0.5 }
      },
      Weapon: class Weapon {
        constructor() { this.cooldownTimer = 1; }
        update() {}
        attack() { return null; }
      }
    });
    const { Entity } = load(context, 'entities/Entity.js', ['Entity']);
    context.Entity = Entity;
    jest.spyOn(Math, 'random').mockReturnValue(0.2);
    const { Enemy } = load(context, 'entities/Enemy.js', ['Enemy']);
    const openMap = { tileSize: 10, cols: 20, rows: 20, getTile: () => 1 };
    const blockedMap = { tileSize: 10, cols: 20, rows: 20, getTile: (x, y) => (x === 5 && y === 5 ? 1 : 0) };
    const projectile = { x: 10, y: 55, angle: 0, speed: 160, width: 10, isPlayerOwned: true, isMelee: false };
    const meleeProjectile = { ...projectile, isMelee: true };
    const feedback = { addText: jest.fn() };
    const dodger = new Enemy(55, 55, 'ranged', 1, 1, { dodgeProfile: { cooldown: 2, duration: 0.2, speed: 120 } });
    dodger.dodgeCooldownTimer = 0;

    dodger.update(0.05, { x: 500, y: 500 }, openMap, { findPath: jest.fn(() => []) }, { enemies: [dodger], projectiles: [projectile], combatFeedback: feedback });
    const meleeIgnored = new Enemy(55, 55, 'ranged', 1, 1, { dodgeProfile: { cooldown: 2, duration: 0.2, speed: 120 } });
    meleeIgnored.dodgeCooldownTimer = 0;
    const blocked = new Enemy(55, 55, 'ranged', 1, 1, { dodgeProfile: { cooldown: 2, duration: 0.2, speed: 120 } });
    blocked.dodgeCooldownTimer = 0;

    expect([
      dodger.state,
      dodger.dodgeCooldownTimer > 0,
      feedback.addText.mock.calls.length,
      meleeIgnored.findDodgeProjectile([meleeProjectile], openMap),
      blocked.findDodgeProjectile([projectile], blockedMap)
    ]).toEqual(['dodge', true, 1, null, null]);
  });

  test('boss room button activates once and requests unlock check', () => {
    const context = createBrowserContext();
    const { Entity } = load(context, 'entities/Entity.js', ['Entity']);
    context.Entity = Entity;
    const { BossRoomButton } = load(context, 'entities/BossRoomButton.js', ['BossRoomButton']);
    const engine = {
      checkBossRoomUnlock: jest.fn(),
      combatFeedback: { addText: jest.fn() }
    };
    const button = new BossRoomButton(10, 20, 1);
    const ctx = {
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      fillText: jest.fn()
    };

    button.update(0.5);
    button.interact(engine);
    button.interact(engine);
    button.render(ctx, { camera: { worldToScreen: () => ({ x: 10, y: 20 }) } });

    expect([button.activated, engine.checkBossRoomUnlock.mock.calls.length, engine.combatFeedback.addText.mock.calls.length, ctx.fillText.mock.calls.length])
      .toEqual([true, 1, 1, 0]);
  });

  test('loot chest opens once and drops generated items', () => {
    const context = createBrowserContext();
    const { Entity } = load(context, 'entities/Entity.js', ['Entity']);
    context.Entity = Entity;
    context.DroppedItem = class DroppedItem { constructor(x, y, itemData) { Object.assign(this, { x, y, itemData }); } };
    const { LootChest } = load(context, 'entities/LootChest.js', ['LootChest']);
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const chest = new LootChest(50, 50);
    const engine = {
      currentFloor: 2,
      gearDifficultyFloor: 1,
      lootGen: {
        generateItem: jest.fn(() => ({ rarity: 'Common', color: '#aaa', gearScore: 10 })),
        generateItemWithRarityAndType: jest.fn((floor, rarity) => ({ rarity, color: '#1eff00', gearScore: 12 }))
      },
      mapGen: { tileSize: 10, cols: 20, rows: 20, getTile: () => 1 },
      droppedItems: [],
      particleSystem: { emitImpact: jest.fn() },
      combatFeedback: { addText: jest.fn() }
    };
    chest.interact(null, engine);
    chest.interact(null, engine);
    expect([chest.opened, engine.droppedItems.length, engine.particleSystem.emitImpact.mock.calls.length]).toEqual([true, 2, 1]);
  });

  test('dungeon service objects pulse, render, and dispatch app hooks', () => {
    const context = createBrowserContext({
      window: {
        gloomvaultApp: {
          openDungeonBlacksmith: jest.fn(),
          openDungeonBank: jest.fn()
        }
      }
    });
    context.window.window = context.window;
    context.window.globalThis = context;
    const { Entity } = load(context, 'entities/Entity.js', ['Entity']);
    context.Entity = Entity;
    const { BlacksmithObject, VoidBankObject, HealingWellObject } = load(context, 'entities/DungeonServiceObject.js', ['BlacksmithObject', 'VoidBankObject', 'HealingWellObject']);
    const ctx = {
      save: jest.fn(),
      restore: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      fillText: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      stroke: jest.fn(),
      set fillStyle(value) { this._fillStyle = value; },
      get fillStyle() { return this._fillStyle; },
      set strokeStyle(value) { this._strokeStyle = value; },
      get strokeStyle() { return this._strokeStyle; },
      set lineWidth(value) { this._lineWidth = value; },
      get lineWidth() { return this._lineWidth; },
      set shadowColor(value) { this._shadowColor = value; },
      get shadowColor() { return this._shadowColor; },
      set shadowBlur(value) { this._shadowBlur = value; },
      get shadowBlur() { return this._shadowBlur; },
      set globalAlpha(value) { this._globalAlpha = value; },
      get globalAlpha() { return this._globalAlpha; },
      set font(value) { this._font = value; },
      get font() { return this._font; },
      set textAlign(value) { this._textAlign = value; },
      get textAlign() { return this._textAlign; },
      set textBaseline(value) { this._textBaseline = value; },
      get textBaseline() { return this._textBaseline; }
    };
    const renderer = { camera: { worldToScreen: () => ({ x: 20, y: 30 }) } };
    const blacksmith = new BlacksmithObject(10, 10);
    const bank = new VoidBankObject(20, 20);
    const well = new HealingWellObject(30, 30, { variant: 2 });
    const player = { hp: 20, maxHp: 100, applyHealingWellBuff: jest.fn(function() { this.maxHp = 110; this.hp = 110; }) };
    const engine = {
      particleSystem: { emitImpact: jest.fn(), emitDashTrail: jest.fn() },
      combatFeedback: { addText: jest.fn() }
    };

    blacksmith.update(0.5);
    blacksmith.render(ctx, renderer);
    blacksmith.interact(null, {});
    bank.interact(null, {});
    well.interact(player, engine);
    well.interact(player, engine);

    expect([
      blacksmith.pulse,
      blacksmith.width,
      bank.hintText,
      well.closed,
      well.canInteract(),
      well.getSpriteKey(),
      ctx.fillRect.mock.calls.length > 0,
      context.window.gloomvaultApp.openDungeonBlacksmith.mock.calls.length,
      context.window.gloomvaultApp.openDungeonBank.mock.calls.length,
      player.applyHealingWellBuff.mock.calls.length,
      engine.combatFeedback.addText.mock.calls.length
    ]).toEqual([
      1,
      128,
      'Press [F] to Open Void Bank',
      true,
      false,
      'sprites.service.healingWell.2.closed',
      true,
      1,
      1,
      1,
      1
    ]);
  });

  test('locked loot chest rejects interaction until unlocked', () => {
    const context = createBrowserContext();
    const { Entity } = load(context, 'entities/Entity.js', ['Entity']);
    context.Entity = Entity;
    context.DroppedItem = class DroppedItem { constructor(x, y, itemData) { Object.assign(this, { x, y, itemData }); } };
    const { LootChest } = load(context, 'entities/LootChest.js', ['LootChest']);
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const chest = new LootChest(50, 50, true);
    const engine = {
      currentFloor: 1,
      gearDifficultyFloor: 1,
      lootGen: { generateItem: jest.fn(() => ({ rarity: 'Epic', color: '#a3e', gearScore: 10 })) },
      mapGen: { tileSize: 10, cols: 20, rows: 20, getTile: () => 1 },
      droppedItems: [],
      combatFeedback: { addText: jest.fn() }
    };

    chest.interact(null, engine);
    chest.unlock();
    chest.interact(null, engine);

    expect([chest.locked, chest.opened, engine.droppedItems.length > 0, engine.combatFeedback.addText.mock.calls[0][0]])
      .toEqual([false, true, true, 'Defeat the Boss']);
  });

  test('particle system, combat feedback, camera, and spawn manager update state', () => {
    const context = createBrowserContext({
      Enemy: class Enemy { constructor(x, y, type, hp, dmg) { Object.assign(this, { x, y, type, hp, dmg }); } },
      DifficultyConfig: { enemyCountScale: 0.05, enemyHpScale: 0.2, enemyDamageScale: 0.2 },
      DevConfig: { DEV_MODE_ENABLED: false }
    });
    const { ParticleSystem } = load(context, 'systems/ParticleSystem.js', ['ParticleSystem']);
    const { CombatFeedback } = load(context, 'systems/CombatFeedback.js', ['CombatFeedback']);
    const { Camera } = load(context, 'core/Camera.js', ['Camera']);
    const { SpawnManager } = load(context, 'systems/SpawnManager.js', ['SpawnManager']);
    jest.spyOn(Math, 'random').mockReturnValue(0);

    const particles = new ParticleSystem();
    particles.emit(0, 0, 10, 0, '#fff', 5, 1);
    particles.update(0.5);
    const feedback = new CombatFeedback();
    feedback.addText('hit', 0, 0);
    feedback.addText('hit', 0, 0);
    feedback.update(2);
    const camera = new Camera(100, 100);
    camera.setBounds(200, 200);
    camera.follow({ x: 150, y: 150 }, 0.1);
    const enemies = [];
    new SpawnManager().populateMap({ cols: 40, rows: 40, tileSize: 50, getTile: () => 1 }, enemies, { x: 0, y: 0 }, 1, 1);

    expect([particles.particles[0].x, feedback.texts.length, camera.worldToScreen(150, 150), enemies.length > 0]).toEqual([5, 0, expect.any(Object), true]);
  });

  test('spawn manager creates squad metadata and patrol routes', () => {
    const spawned = [];
    const context = createBrowserContext({
      EnemyAIConfig: {
        squads: { chance: 1, minSize: 3, maxSize: 3, formationSpacing: 40, patrolRouteLength: 3, roomPatrolChance: 1 },
        dodge: { rangedChance: 0, gruntChance: 0, fastEliteChance: 0 }
      },
      Enemy: class Enemy {
        constructor(x, y, type, hp, dmg, options) {
          Object.assign(this, { x, y, type, hp, dmg, options });
        }
      },
      DifficultyConfig: { enemyCountScale: 0, enemyHpScale: 0.2, enemyDamageScale: 0.2 },
      DevConfig: { DEV_MODE_ENABLED: false }
    });
    const { SpawnManager } = load(context, 'systems/SpawnManager.js', ['SpawnManager']);
    jest.spyOn(Math, 'random').mockReturnValue(0.2);
    const rooms = [
      { x: 1, y: 1, width: 8, height: 8, center: { x: 5, y: 5 }, rects: [{ x: 1, y: 1, width: 8, height: 8 }] },
      { x: 20, y: 20, width: 8, height: 8, center: { x: 24, y: 24 }, rects: [{ x: 20, y: 20, width: 8, height: 8 }] },
      { x: 30, y: 30, width: 8, height: 8, center: { x: 34, y: 34 }, rects: [{ x: 30, y: 30, width: 8, height: 8 }] }
    ];
    const map = {
      cols: 40,
      rows: 40,
      tileSize: 50,
      rooms,
      getTile: () => 1,
      tileToWorld: (x, y) => ({ x: x * 50 + 25, y: y * 50 + 25 }),
      isTileInsideRoom: (x, y, room) => x >= room.x && x < room.x + room.width && y >= room.y && y < room.y + room.height
    };

    new SpawnManager().populateMap(map, spawned, { x: 0, y: 0 }, 1, 1);
    const squad = spawned.filter(enemy => enemy.options && enemy.options.squadId);
    const squadCounts = squad.reduce((counts, enemy) => {
      counts[enemy.options.squadId] = (counts[enemy.options.squadId] || 0) + 1;
      return counts;
    }, {});

    expect([
      squad.length >= 3,
      Object.values(squadCounts).some(count => count >= 3),
      squad[0].options.patrolRoute.length,
      squad.some(enemy => enemy.options.formationOffset.x !== 0 || enemy.options.formationOffset.y !== 0)
    ]).toEqual([true, true, 3, true]);
  });
});
