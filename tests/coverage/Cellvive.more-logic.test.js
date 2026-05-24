const { createBrowserContext, loadBrowserScript } = require('../helpers/browserScriptHarness');

function loadCell(context, relativePath, exports) {
  return loadBrowserScript(context, `games/Cellvive/js/${relativePath}`, exports);
}

function cellContext(overrides = {}) {
  const context = createBrowserContext({
    document,
    setTimeout,
    clearTimeout,
    GameLogger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() },
    CELLVIVE_CONSTANTS: {
      TESTING: { ENABLED: false },
      WORLD: { WIDTH: 1000, HEIGHT: 1000 },
      PERFORMANCE: { SIMULATION_DISTANCE: 500 },
      PLAYER: { BASE_SPEED: 2, BASE_RADIUS: 20 },
      POWERUPS: { SPAWN_RATE: 1 },
      BIOMES: {},
      HAZARDS: {}
    },
    ...overrides
  });
  context.window.game = null;
  return context;
}

// Behaviour under test: Cellvive cells update type, movement, eating, colour helpers, and cloning deterministically.
describe('Cellvive Cell model', () => {
  afterEach(() => jest.restoreAllMocks());

  test('cell type, distance, canEat, and eat update size and health', () => {
    const context = cellContext();
    const { Cell } = loadCell(context, 'Cell.js', ['Cell']);
    const eater = new Cell({ x: 0, y: 0, radius: 20 });
    const food = new Cell({ x: 3, y: 4, radius: 5 });
    const before = eater.radius;
    eater.eat(food);
    expect([eater.determineType(), eater.distanceTo(food), eater.canEat(food), eater.radius > before]).toEqual(['large', 5, true, true]);
  });

  test('cell movement helpers and render props expose current state', () => {
    const context = cellContext();
    const { Cell } = loadCell(context, 'Cell.js', ['Cell']);
    const cell = new Cell({ x: 0, y: 0, radius: 10, color: '#336699' });
    cell.setTarget(10, 0);
    cell.moveTowardsTarget();
    const clone = cell.clone();
    expect([cell.isMoving(), cell.getDirection(), cell.lightenColor('#000000', 50), cell.darkenColor('#ffffff', 50), clone.radius, cell.getRenderProps().type])
      .toEqual([true, expect.any(Number), expect.any(String), expect.any(String), 8, cell.type]);
  });
});

// Behaviour under test: Cellvive input, power-ups, particles, and talent system update state without rendering.
describe('Cellvive supporting systems', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('InputHandler maps movement, custom mappings, simulated keys, and cleanup', () => {
    jest.useFakeTimers();
    const context = cellContext();
    const { InputHandler } = loadCell(context, 'InputHandler.js', ['InputHandler']);
    const input = new InputHandler();
    input.handleKeyDown({ code: 'KeyW' });
    input.handleKeyDown({ code: 'KeyD' });
    input.addKeyMapping('KeyZ', 'dash');
    input.simulateKeyPress('dash', 50);
    jest.advanceTimersByTime(60);
    const direction = input.getMovementDirection();
    input.cleanup();
    expect([input.shouldPreventDefault('Space'), direction.x > 0, direction.y < 0, input.isKeyPressed('dash'), input.eventListeners.length]).toEqual([true, true, true, false, 0]);
  });

  test('PowerUp applies energy size and health effects and expires', () => {
    const context = cellContext();
    const { PowerUp } = loadCell(context, 'PowerUp.js', ['PowerUp', 'PowerUpManager']);
    const cell = { x: 0, y: 0, radius: 10, maxHealth: 100, health: 50, speed: 1, maxSpeed: 1 };
    const energy = new PowerUp({ x: 0, y: 0, type: 'energy', value: 10 });
    const size = new PowerUp({ x: 0, y: 0, type: 'size_boost', value: 5 });
    const health = new PowerUp({ x: 0, y: 0, type: 'health', value: 10 });
    energy.applyTo(cell);
    size.applyTo(cell);
    health.applyTo(cell);
    expect([energy.canBeCollectedBy(cell), cell.maxHealth, cell.radius, cell.health, energy.shouldRemove()]).toEqual([false, 110, 15, 70, true]);
  });

  test('ParticleSystem reuses particles and clears active list', () => {
    const context = cellContext();
    const { ParticleSystem } = loadCell(context, 'ParticleSystem.js', ['ParticleSystem']);
    const system = new ParticleSystem();
    system.createDeathParticles(0, 0, 10, '#fff');
    const activeBefore = system.particles.length;
    system.update();
    system.clear();
    expect([activeBefore > 0, system.particles.length]).toEqual([true, 0]);
  });

  test('TalentSystem flattens trees, applies selected talent, tracks and resets unlocks', () => {
    document.body.innerHTML = '<div id="talent-popup" class="hidden"></div><div id="talent-grid"></div><div id="talent-info-panel"></div><button id="talent-select-btn"></button><button id="talent-cancel-btn"></button><div id="selected-talent-name"></div><div id="selected-talent-description"></div><div id="selected-talent-cost"></div>';
    const context = cellContext({
      CELLVIVE_CONSTANTS: {
        TALENTS: { TALENT_TREE: { tier1: { RESILIENCE: { ID: 'resilience', NAME: 'Resilience', DESCRIPTION: 'desc', CATEGORY: 'Defense', ICON: 'R', EFFECT_PER_LEVEL: { VALUE: 0.5 }, COST_PER_LEVEL: 1 } } } }
      }
    });
    const player = { updateMaxSpeed: jest.fn() };
    const { TalentSystem } = loadCell(context, 'TalentSystem.js', ['TalentSystem']);
    const talents = new TalentSystem({ player, pauseGame: jest.fn(), resumeGame: jest.fn() });
    talents.selectedTalent = talents.talents.RESILIENCE;
    talents.confirmSelection();
    talents.resetTalents();
    expect([talents.hasTalent('resilience'), player.updateMaxSpeed.mock.calls.length, talents.getUnlockedTalents()]).toEqual([false, 2, []]);
  });

  test('TutorialManager tolerates missing optional environment arrays and still finds supported nearby elements', () => {
    document.body.innerHTML = '<div id="game-container"></div>';
    const context = cellContext({
      CELLVIVE_CONSTANTS: {
        ENVIRONMENT: { HAZARDS: { ENABLED: false } }
      }
    });
    const { TutorialManager } = loadCell(context, 'TutorialManager.js', ['TutorialManager']);
    const player = { x: 100, y: 100 };
    const tutorial = new TutorialManager({
      player,
      cells: [{ x: 110, y: 100 }],
      enemies: [{ x: 120, y: 100, enemyType: 'amoeba' }, { x: 130, y: 100, enemyType: 'virus' }],
      environmentManager: {
        getRenderElements: () => ({
          biomes: [{ x: 115, y: 100, type: 'nutrient' }],
          foodSpawners: [{ x: 118, y: 100 }]
        })
      },
      powerUpManager: { powerUps: [] }
    });

    expect(tutorial.getNearbyElements(player).map(entry => entry.type)).toEqual([
      'food',
      'amoeba',
      'virus',
      'biome_nutrient',
      'obstacle'
    ]);
  });

  test('TutorialManager fails soft when environment render payload is invalid and EnvironmentManager returns stable arrays', () => {
    document.body.innerHTML = '<div id="game-container"></div>';
    const tutorialContext = cellContext({
      CELLVIVE_CONSTANTS: {
        ENVIRONMENT: { HAZARDS: { ENABLED: true } }
      }
    });
    const { TutorialManager } = loadCell(tutorialContext, 'TutorialManager.js', ['TutorialManager']);
    const tutorial = new TutorialManager({
      player: { x: 0, y: 0 },
      cells: [],
      enemies: [],
      environmentManager: { getRenderElements: () => null },
      powerUpManager: { powerUps: [] }
    });

    expect(tutorial.getNearbyElements({ x: 0, y: 0 })).toEqual([]);

    const environmentContext = cellContext({
      BiomeTypes: {},
      SpawnerTypes: {},
      Biome: function Biome() {},
      FoodSpawner: function FoodSpawner() {}
    });
    const { EnvironmentManager } = loadCell(environmentContext, 'EnvironmentManager.js', ['EnvironmentManager']);
    const manager = Object.create(EnvironmentManager.prototype);
    manager.biomes = [{ getRenderProps: () => ({ type: 'nutrient' }) }];
    manager.foodSpawners = [{ getRenderProps: () => ({ type: 'organic' }) }];

    expect(manager.getRenderElements()).toEqual({
      biomes: [{ type: 'nutrient' }],
      foodSpawners: [{ type: 'organic' }],
      hazards: [],
      currents: []
    });
  });
});
