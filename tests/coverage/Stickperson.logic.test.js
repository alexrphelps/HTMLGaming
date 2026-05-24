const { createBrowserContext, loadBrowserScript } = require('../helpers/browserScriptHarness');

function loadStick(context, relativePath, exports) {
  return loadBrowserScript(context, `games/stickperson/js/${relativePath}`, exports);
}

function stickContext() {
  const context = createBrowserContext();
  const { GAME_CONSTANTS } = loadStick(context, 'constants.js', ['GAME_CONSTANTS']);
  context.GAME_CONSTANTS = GAME_CONSTANTS;
  return context;
}

function player(overrides = {}) {
  return {
    worldX: 100,
    y: 300,
    width: 30,
    normalHeight: 60,
    crouchHeight: 30,
    crouchTransition: 0,
    ...overrides
  };
}

// Behaviour under test: Stickperson camera and score maintain simple deterministic state.
describe('Stickperson camera and score', () => {
  test('camera converts coordinates and visibility after position changes', () => {
    const context = stickContext();
    const { Camera } = loadStick(context, 'camera.js', ['Camera']);
    const camera = new Camera();
    camera.setPosition(100);
    expect([camera.worldToScreen(150, 20), camera.screenToWorld(50, 20), camera.isVisible(120, 10), camera.getBounds().left]).toEqual([
      { x: 50, y: 20 },
      { x: 150, y: 20 },
      true,
      100
    ]);
  });

  test('score adds explicit and default points then resets', () => {
    const context = stickContext();
    const { Score } = loadStick(context, 'score.js', ['Score']);
    const score = new Score();
    score.addPoints(7);
    score.addPoints();
    const beforeReset = score.getScore();
    score.reset();
    expect([beforeReset, score.getScore()]).toEqual([7 + context.GAME_CONSTANTS.COLLECTIBLES.SCORE_VALUE, 0]);
  });
});

// Behaviour under test: Stickperson objects expose non-rendering collision, lifecycle, and bounds behavior.
describe('Stickperson object logic', () => {
  afterEach(() => jest.restoreAllMocks());

  test('obstacles detect collision direction and standability', () => {
    const context = stickContext();
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { Obstacle } = loadStick(context, 'obstacle.js', ['Obstacle']);
    const obstacle = new Obstacle(80, 'platform');
    const collision = obstacle.checkCollision(player({ worldX: 100, y: obstacle.y + 5 }));
    expect([collision.direction, obstacle.canStandOn(player({ worldX: 100, y: obstacle.y })), obstacle.isDangerous(), obstacle.getCenter()])
      .toEqual(['top', true, false, expect.any(Object)]);
  });

  test('bomb updates, collides, explodes, and reports active state', () => {
    const context = stickContext();
    const { Bomb } = loadStick(context, 'bomb.js', ['Bomb']);
    const bomb = new Bomb(100, 300);
    bomb.update();
    const hit = bomb.checkCollision(player());
    bomb.explode();
    expect([hit, bomb.isActive()]).toEqual([true, false]);
  });

  test('collectibles and world collectibles collect once and cleanup behind player', () => {
    const context = stickContext();
    const { Collectible } = loadStick(context, 'collectible.js', ['Collectible']);
    const { WorldCollectible } = loadStick(context, 'worldCollectible.js', ['WorldCollectible']);
    const score = { addPoints: jest.fn() };
    const collectible = new Collectible({ canvas: { width: 500, height: 500 } });
    collectible.x = 100;
    collectible.y = 300;
    const worldCollectible = new WorldCollectible(100, 300);
    const hit = collectible.checkCollision({ x: 100, y: 300, width: 10, normalHeight: 10, crouchHeight: 10, crouchTransition: 0 });
    const worldHit = worldCollectible.checkCollision(player());
    collectible.collect(score);
    worldCollectible.collect(score);
    expect([hit, worldHit, score.addPoints.mock.calls.length, worldCollectible.shouldCleanup(10000)]).toEqual([true, true, 2, true]);
  });

  test('ash piles animate particles and eventually deactivate', () => {
    const context = stickContext();
    const { AshPile } = loadStick(context, 'ashPile.js', ['AshPile']);
    const pile = new AshPile(0, 0);
    pile.particles.forEach(particle => { particle.life = 0; });
    pile.update();
    expect(pile.isActive()).toBe(false);
  });
});

// Behaviour under test: Stickperson world bookkeeping can be tested with constructor collaborators mocked.
describe('Stickperson world logic', () => {
  test('world tracks generated chunks, cleanup, spawn chance, lookup, and removal', () => {
    const context = stickContext();
    context.Obstacle = class Obstacle { constructor(x) { this.x = x; this.y = 200; this.width = 100; } };
    context.WorldCollectible = { createRandomApple: (x, y) => ({ x, y }) };
    context.Hazard = { createRandomHazard: (x, y) => ({ x, y }) };
    context.MovingPlatform = { createRandomMovingPlatform: (x, y) => ({ x, y, width: 50 }) };
    context.PowerUp = { createRandomPowerUp: (x, y) => ({ x, y }) };
    context.UFO = { createRandomUFO: (x, y) => ({ x, y, width: 100 }) };
    context.Bomb = class Bomb { constructor(x, y) { this.x = x; this.y = y; } };
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { World } = loadStick(context, 'world.js', ['World']);
    const world = new World({}, { player: { worldX: 0 } });
    world.generateChunk(0);
    const chunkCount = world.generatedChunks.size;
    world.collectibles.push({ x: -10000 });
    world.cleanupDistantContent(1000);
    world.obstacles.push({ x: 100, y: 200, width: 100, type: 'platform' });
    const platform = world.findNearbyPlatform(110);
    const collectible = { id: 1 };
    world.collectibles.push(collectible);
    world.removeCollectible(collectible);
    expect([chunkCount, world.collectibles.includes(collectible), Boolean(platform), world.calculateUFOSpawnChance(100000) > world.calculateUFOSpawnChance(0)])
      .toEqual([1, false, true, true]);
  });
});
