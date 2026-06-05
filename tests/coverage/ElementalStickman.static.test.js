const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createBrowserContext, loadBrowserScript } = require('../helpers/browserScriptHarness');

const root = path.resolve(__dirname, '../..');
const gameDir = path.join(root, 'games/elemental-stickman');
const gamePath = path.join(gameDir, 'index.html');
const configPath = path.join(root, 'games.config.js');

function loadNamespace() {
  const context = createBrowserContext();
  loadBrowserScript(context, 'games/elemental-stickman/js/game.js', []);
  return context.window.ElementalStickman;
}

function point(x, y, t) {
  return { x, y, worldX: x, worldY: y, t };
}

function expectConfidence(gesture) {
  expect(typeof gesture.confidence).toBe('number');
  expect(gesture.confidence).toBeGreaterThanOrEqual(0);
  expect(gesture.confidence).toBeLessThanOrEqual(1);
}

function createMockContext() {
  const methods = [
    'arc',
    'beginPath',
    'clearRect',
    'closePath',
    'ellipse',
    'fill',
    'fillRect',
    'fillText',
    'lineTo',
    'moveTo',
    'quadraticCurveTo',
    'restore',
    'save',
    'stroke',
    'strokeRect'
  ];
  return methods.reduce((ctx, method) => {
    ctx[method] = jest.fn();
    return ctx;
  }, {});
}

function createRenderablePlayer(ns, overrides = {}) {
  const player = new ns.Player();
  Object.assign(player, {
    x: 260,
    y: ns.WORLD.groundY - player.h,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: true,
    castTimer: 0,
    castWindupTimer: 0,
    castReleaseTimer: 0,
    recoilTimer: 0,
    landTimer: 0,
    attackPulse: 0,
    hitTimer: 0,
    airDashTimer: 0,
    slideTimer: 0
  }, overrides);
  return player;
}

function pointDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

describe('Elemental Stickman static integration', () => {
  test('provides a layout-only GameHub iframe entry point', () => {
    const html = fs.readFileSync(gamePath, 'utf8');

    expect(fs.existsSync(gamePath)).toBe(true);
    expect(fs.existsSync(path.join(gameDir, 'css/style.css'))).toBe(true);
    expect(fs.existsSync(path.join(gameDir, 'js/game.js'))).toBe(true);
    expect(html).toContain('<link rel="stylesheet" href="css/style.css">');
    expect(html).toContain('<script src="js/game.js"></script>');
    expect(html).not.toMatch(/<style[\s>]/);
    expect(html).not.toMatch(/<script>([\s\S]*?)<\/script>/);
    expect(html).not.toContain('style=');
    expect(html).not.toContain('onclick=');
  });

  test('is registered in the configured GameHub catalog', () => {
    const sandbox = { window: {} };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(configPath, 'utf8'), sandbox);

    expect(sandbox.window.GAMEHUB_GAMES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          folder: 'elemental-stickman',
          name: 'Elemental Stickman',
          rendering: 'Canvas',
          input: 'Keyboard + Mouse'
        })
      ])
    );
  });

  test('gesture engine classifies core paths', () => {
    const ns = loadNamespace();
    const player = { x: 100, y: 100 };

    const swipe = ns.GestureEngine.classifyPath([point(0, 120, 0), point(0, 20, 0.18)], player);
    expect(swipe.type).toBe('swipe_up');
    expectConfidence(swipe);

    const tap = ns.GestureEngine.classifyPath([point(5, 5, 0), point(9, 8, 0.1)], player);
    expect(tap.type).toBe('tap');
    expectConfidence(tap);

    const hold = ns.GestureEngine.classifyPath([point(5, 5, 0), point(8, 7, 0.62)], player);
    expect(hold.type).toBe('hold');
    expectConfidence(hold);

    const circle = [];
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      circle.push(point(120 + Math.cos(a) * 42, 120 + Math.sin(a) * 42, i * 0.02));
    }
    const circleGesture = ns.GestureEngine.classifyPath(circle, player);
    expect(circleGesture.type).toBe('circle');
    expectConfidence(circleGesture);

    const zigzag = [
      point(0, 0, 0),
      point(45, 16, 0.04),
      point(-10, 32, 0.08),
      point(55, 48, 0.12),
      point(-5, 64, 0.16),
      point(70, 80, 0.2)
    ];
    const zigzagGesture = ns.GestureEngine.classifyPath(zigzag, player);
    expect(zigzagGesture.type).toBe('zigzag');
    expectConfidence(zigzagGesture);
  });

  test('gesture engine handles noisy and imperfect paths without shape theft', () => {
    const ns = loadNamespace();
    const player = { x: 100, y: 100 };

    const noisySwipe = [
      point(20, 160, 0),
      point(24, 138, 0.03),
      point(19, 112, 0.06),
      point(25, 80, 0.09),
      point(21, 42, 0.13)
    ];
    expect(ns.GestureEngine.classifyPath(noisySwipe, player).type).toBe('swipe_up');

    const imperfectCircle = [];
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      imperfectCircle.push(point(140 + Math.cos(a) * (38 + (i % 3) * 2), 120 + Math.sin(a) * (31 + (i % 4)), i * 0.024));
    }
    const imperfectCircleGesture = ns.GestureEngine.classifyPath(imperfectCircle, player);
    expect(imperfectCircleGesture.type).toBe('circle');
    expect(imperfectCircleGesture.type).not.toBe('hold');

    const unevenZigzag = [
      point(0, 0, 0),
      point(66, 18, 0.05),
      point(20, 41, 0.12),
      point(86, 56, 0.16),
      point(16, 82, 0.24),
      point(92, 101, 0.29)
    ];
    const unevenZigzagGesture = ns.GestureEngine.classifyPath(unevenZigzag, player);
    expect(unevenZigzagGesture.type).toBe('zigzag');
    expect(unevenZigzagGesture.type).not.toBe('tap');
    expect(unevenZigzagGesture.type).not.toBe('hold');
  });

  test('ability registry exposes required element responses', () => {
    const ns = loadNamespace();
    const abilities = new ns.AbilityRegistry().all();
    const ids = new Set(abilities.map((ability) => ability.id));

    [
      'fire_fireball',
      'fire_flame_kick',
      'fire_flame_slam',
      'fire_lance',
      'fire_wheel',
      'fire_ember_barrage',
      'air_gale_up',
      'air_slam',
      'air_push',
      'air_pull',
      'earth_raise_rock',
      'earth_launch',
      'earth_shockwave',
      'earth_wall',
      'earth_spike_line',
      'water_grip',
      'water_throw'
    ].forEach((id) => expect(ids.has(id)).toBe(true));

    expect(abilities.some((ability) => Number.isFinite(ability.minConfidence))).toBe(true);
    expect(abilities.some((ability) => typeof ability.animationPose === 'string')).toBe(true);
  });

  test('physics object tag helpers keep object roles explicit', () => {
    const ns = loadNamespace();
    const chunk = new ns.PhysicsObject(0, 0, 20, 20, 'earth', {
      tag: 'earth,earth-detached,air-affectable',
      mass: 3
    });

    expect(chunk.hasTag('earth')).toBe(true);
    expect(chunk.hasTag('earth-detached')).toBe(true);
    expect(chunk.canBeMovedByAir()).toBe(true);
    chunk.addTag('ice');
    expect(chunk.hasTag('ice')).toBe(true);
    chunk.removeTag('air-affectable');
    expect(chunk.canBeMovedByAir()).toBe(false);

    const wall = new ns.PhysicsObject(0, 0, 20, 80, 'earth', {
      tag: 'earth,earth-wall,solid',
      static: true
    });
    expect(wall.isLoose()).toBe(false);
    expect(wall.canBeMovedByAir()).toBe(false);
  });

  test('skill config includes the requested level one through five unlock names', () => {
    const ns = loadNamespace();

    expect(ns.SKILL_TREE.Air.map((skill) => skill.name)).toEqual([
      'Gale Push',
      'Double Jump',
      'Slow Fall',
      'Air Dash',
      'Cyclone Guard'
    ]);
    expect(ns.SKILL_TREE.Water.map((skill) => skill.name)).toEqual([
      'Water Grip',
      'Water Throw',
      'Freeze Water',
      'Water Shield',
      'Whirlpool'
    ]);
    expect(ns.SKILL_TREE.Earth.map((skill) => skill.name)).toEqual([
      'Raise Rock',
      'Stone Launch',
      'Earth Wall',
      'Boulder Grip',
      'Shatter Line'
    ]);
    expect(ns.SKILL_TREE.Fire.map((skill) => skill.name)).toEqual([
      'Fireball',
      'Flame Kick',
      'Flame Slam',
      'Flame Wheel',
      'Fire Dash'
    ]);
  });

  test('stickman renderer draws enhanced curved poses across movement states', () => {
    const ns = loadNamespace();
    const camera = new ns.Camera({ width: 1280, height: 720 });
    const renderer = new ns.StickmanRenderer();
    const ctx = createMockContext();
    const states = [
      createRenderablePlayer(ns),
      createRenderablePlayer(ns, { vx: 390 }),
      createRenderablePlayer(ns, { onGround: false, vy: -320 }),
      createRenderablePlayer(ns, { landTimer: 0.12 }),
      createRenderablePlayer(ns, { airDashTimer: 0.14, vx: 720, onGround: false }),
      createRenderablePlayer(ns, { slideTimer: 0.12, vx: 260 }),
      createRenderablePlayer(ns, { hitTimer: 0.22 })
    ];

    states.forEach((player, index) => renderer.render(ctx, player, camera, 1 + index * 0.08));

    expect(ctx.save.mock.calls.length).toBe(ctx.restore.mock.calls.length);
    expect(ctx.quadraticCurveTo.mock.calls.length).toBeGreaterThan(0);
    expect(ctx.ellipse.mock.calls.length).toBeGreaterThan(0);
    expect(ctx.arc.mock.calls.length).toBeGreaterThan(0);
  });

  test('stickman renderer supports every elemental casting accent without changing its public API', () => {
    const ns = loadNamespace();
    const camera = { x: 0, y: 0 };
    const renderer = new ns.StickmanRenderer();
    const ctx = createMockContext();

    ['Air', 'Fire', 'Water', 'Earth'].forEach((element, index) => {
      const player = createRenderablePlayer(ns, {
        castElement: element,
        castPose: element === 'Fire' ? 'fireKick' : 'neutral',
        castTimer: 0.34,
        castWindupTimer: 0.1,
        castReleaseTimer: 0.2,
        attackPulse: 0.12
      });
      renderer.render(ctx, player, camera, 2 + index * 0.1);
    });

    expect(ns.StickmanRenderer.prototype.render.length).toBe(4);
    expect(ctx.save.mock.calls.length).toBe(ctx.restore.mock.calls.length);
    expect(ctx.quadraticCurveTo.mock.calls.length).toBeGreaterThan(20);
    expect(ctx.arc.mock.calls.length).toBeGreaterThan(8);
  });

  test('stickman renderer keeps realistic proportions and stable crouch foot placement', () => {
    const ns = loadNamespace();
    const camera = { x: 0, y: 0 };
    const renderer = new ns.StickmanRenderer();
    const standing = renderer.buildPose(createRenderablePlayer(ns), camera, 1);
    const leftLeg = pointDistance(standing.hips, standing.kneeL) + pointDistance(standing.kneeL, standing.footL);
    const rightLeg = pointDistance(standing.hips, standing.kneeR) + pointDistance(standing.kneeR, standing.footR);
    const leftArm = pointDistance(standing.shoulderL, standing.elbowL) + pointDistance(standing.elbowL, standing.handL);
    const rightArm = pointDistance(standing.shoulderR, standing.elbowR) + pointDistance(standing.elbowR, standing.handR);
    const slidePlayer = createRenderablePlayer(ns, { slideTimer: 0.12, vx: 260 });
    const slideA = renderer.buildPose(slidePlayer, camera, 1.0);
    const slideB = renderer.buildPose(slidePlayer, camera, 1.08);

    expect(Math.min(leftLeg, rightLeg)).toBeGreaterThan(Math.max(leftArm, rightArm) * 1.12);
    expect(Math.abs(slideA.footL.y - slideB.footL.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(slideA.footR.y - slideB.footR.y)).toBeLessThanOrEqual(1);
  });
});
