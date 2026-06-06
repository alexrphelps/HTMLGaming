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
        PLAYER: { STARTING_MAX_HEALTH: 100 },
        TALENTS: { TALENT_TREE: { tier1: { RAPID_MOVEMENT: { ID: 'rapid_movement', NAME: 'Rapid Movement', DESCRIPTION: 'desc', CATEGORY: 'Movement', ICON: 'R', EFFECT_PER_LEVEL: { VALUE: 0.5 }, COST_PER_LEVEL: 1 } } } }
      }
    });
    const player = { updateMaxSpeed: jest.fn(), maxHealth: 100, health: 100 };
    const { TalentSystem } = loadCell(context, 'TalentSystem.js', ['TalentSystem']);
    const talents = new TalentSystem({ player, pauseGame: jest.fn(), resumeGame: jest.fn() });
    talents.selectedTalent = talents.talents.RAPID_MOVEMENT;
    talents.confirmSelection();
    talents.resetTalents();
    expect([talents.hasTalent('rapid_movement'), player.updateMaxSpeed.mock.calls.length, talents.getUnlockedTalents()]).toEqual([false, 2, []]);
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

  function spawnConstants() {
    return {
      WORLD: {
        CANVAS_WIDTH: 800,
        CANVAS_HEIGHT: 600,
        SIZE_MULTIPLIER: 1,
        BASE_WIDTH: 1000,
        BASE_HEIGHT: 1000,
        ZONES: {
          SAFE_ZONE: { RADIUS: 100 },
          NORMAL_ZONE: { RADIUS: 250 },
          DANGER_ZONE: { RADIUS: 400 },
          DEATH_ZONE: { RADIUS: Infinity }
        }
      },
      CELLS: { INITIAL_COUNT: 3, MAX_COUNT: 4, SPAWN_RATE: 1, SPEED: 0.3 },
      ENEMIES: { INITIAL_COUNT: 2, MAX_COUNT: 3, SPAWN_RATE: 1 },
      POWERUPS: { SPAWN_RATE: 1, MAX_COUNT: 2 },
      PERFORMANCE: { TARGET_FPS: 60, SIMULATION_DISTANCE: 500, MAX_DELTA_TIME: 50 },
      ENVIRONMENT: {
        BIOMES: { INITIAL_COUNT: 0, MAX_COUNT: 2, SPAWN_RATE: 0 },
        FOOD_SPAWNERS: { INITIAL_COUNT: 0, MAX_COUNT: 2, SPAWN_RATE: 0 },
        SPORE_TYPES: {
          GREEN: { TYPE: 'growth_hormone', COLOR: '#90EE90', SPAWN_WEIGHT: 0.6, GROWTH_VALUES: { SMALL: { radius: 3, growth: 1 } } },
          YELLOW: { TYPE: 'speed_boost', COLOR: '#FFD700', SPAWN_WEIGHT: 0.25, RADIUS: 6, GROWTH: 0, SPEED_BOOST: 1.5 },
          ORANGE: { TYPE: 'talent_upgrade', COLOR: '#FFA500', SPAWN_WEIGHT: 0.15, RADIUS: 8, GROWTH: 0 }
        }
      },
      TESTING: { ENABLED: false },
      PLAYER: { STARTING_MAX_HEALTH: 100, STARTING_SPEED: 3, GROWTH_AMOUNT_MULTIPLIER: 0.1 },
      EATING: {},
      LOGGING: { ENABLED: false }
    };
  }

  test('SpawnManager uses configured caps, weighted spores, and world-bound positions', () => {
    const context = cellContext({
      CELLVIVE_CONSTANTS: spawnConstants(),
      AmoebaEnemy: function AmoebaEnemy(options) { Object.assign(this, options, { health: 100 }); },
      VirusEnemy: function VirusEnemy(options) { Object.assign(this, options, { health: 100 }); }
    });
    loadCell(context, 'Cell.js', ['Cell']);
    const { SpawnManager } = loadCell(context, 'SpawnManager.js', ['SpawnManager']);
    const game = {
      config: { worldWidth: 1000, worldHeight: 1000, maxCells: 4, maxEnemies: 3, cellSpawnRate: 1, enemySpawnRate: 1 },
      player: { x: 995, y: 995, radius: 20 },
      cells: [],
      enemies: []
    };
    const spawns = new SpawnManager(game);

    jest.spyOn(Math, 'random')
      .mockReturnValue(0.5)
      .mockReturnValueOnce(0.99)
      .mockReturnValueOnce(0.25)
      .mockReturnValueOnce(0.25)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.99);
    const orange = spawns.createRandomCell();
    spawns.spawnInitialCells(10);
    spawns.spawnInitialEnemies(10);

    expect([orange.sporeType, game.cells.length, game.enemies.length, game.cells.every(cell => cell.x >= 50 && cell.x <= 950 && cell.y >= 50 && cell.y <= 950)])
      .toEqual(['talent_upgrade', 4, 3, true]);
  });

  test('CellviveGame cleanup removes managed listeners and cancels the active loop', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    const cancelAnimationFrame = jest.fn();
    const context = cellContext({
      CELLVIVE_CONSTANTS: spawnConstants(),
      cancelAnimationFrame,
      GameLogger: { gameInit: jest.fn(), gameEnd: jest.fn(), error: jest.fn() }
    });
    const { CellviveGame } = loadCell(context, 'Game.js', ['CellviveGame']);
    const game = new CellviveGame();
    let clicks = 0;
    game.gameLoopId = 123;
    game.inputHandler = { cleanup: jest.fn() };
    game.particleSystem = { cleanup: jest.fn() };
    game.cells = [{}];
    game.enemies = [{}];
    game.addManagedEventListener(button, 'click', () => { clicks++; });

    button.click();
    game.cleanup();
    button.click();

    expect([clicks, cancelAnimationFrame.mock.calls[0][0], game.cells.length, game.enemies.length, game.inputHandler]).toEqual([1, 123, 0, 0, null]);
  });

  test('CellviveGame pause reasons prevent one overlay from resuming another', () => {
    const context = cellContext({
      CELLVIVE_CONSTANTS: spawnConstants(),
      GameLogger: { gameInit: jest.fn(), gameEnd: jest.fn(), error: jest.fn() }
    });
    const { CellviveGame } = loadCell(context, 'Game.js', ['CellviveGame']);
    const game = new CellviveGame();
    game.isRunning = true;

    game.pauseGame('manual');
    game.pause('tutorial');
    game.resume('tutorial');
    const stillPaused = game.isPaused;
    game.resumeGame('manual');

    expect([stillPaused, game.isPaused, game.pauseReasons.size]).toEqual([true, false, 0]);
  });
});
