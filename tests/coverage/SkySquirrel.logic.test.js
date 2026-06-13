const fs = require('fs');
const path = require('path');
const { createBrowserContext, loadBrowserScript } = require('../helpers/browserScriptHarness');

function createSkyContext(overrides = {}) {
  const context = createBrowserContext({
    document,
    performance,
    requestAnimationFrame: jest.fn(),
    cancelAnimationFrame: jest.fn(),
    ...overrides
  });

  [
    'WorldConfig.js',
    'Math3D.js',
    'TerrainSystem.js',
    'EnvironmentSystem.js',
    'FlightPhysics.js',
    'CameraController.js'
  ].forEach(file => loadBrowserScript(context, `games/skySquirrel/js/${file}`));

  return context;
}

function routePoint(context, terrain, route, progress, lateral = 0) {
  const M = context.window.SkySquirrel.Math3D;
  const frame = terrain.getCorridorFrame(route);
  const config = context.window.SkySquirrel.WorldConfig;
  const t = M.lerp(-config.caldera.rimRadius, config.world.islandRadius * 0.96, progress);
  const center = M.scale(frame.dir, t);
  return M.add(center, M.scale(frame.right, lateral));
}

// Behaviour under test: the redesigned world is a high caldera with real drop and route queries.
describe('SkySquirrel Obsidian Crown caldera terrain', () => {
  test('primary launch starts high above a collapsed caldera floor', () => {
    const context = createSkyContext();
    const terrain = new context.window.SkySquirrel.TerrainSystem();
    const config = context.window.SkySquirrel.WorldConfig;
    const launch = terrain.getLaunchPoint();
    const centerHeight = terrain.getHeightAt(0, 0);
    const normal = terrain.getNormalAt(launch.x, launch.z);

    expect(terrain.getFlightCorridors().map(route => route.name)).toEqual([
      'waterfall-gorge',
      'lava-chute',
      'forest-ridge'
    ]);
    expect(launch.route).toBe('waterfall-gorge');
    expect(launch.y - centerHeight).toBeGreaterThan(900);
    expect(centerHeight).toBeGreaterThan(config.world.waterLevel + 250);
    expect(centerHeight).toBeLessThan(config.caldera.rimHeight * 0.45);
    expect(normal.y).toBeGreaterThan(0.52);
    expect(terrain.mesh.count).toBe(config.world.terrainResolution * config.world.terrainResolution * 6);
  });

  test('all guided corridors descend from rim launch toward coastal exits', () => {
    const context = createSkyContext();
    const terrain = new context.window.SkySquirrel.TerrainSystem();
    const config = context.window.SkySquirrel.WorldConfig;

    terrain.getFlightCorridors().forEach(route => {
      const profile = terrain.getRouteHeightProfile(route.name, 7).map(point => point.height);
      expect(profile[0] - profile[profile.length - 1]).toBeGreaterThan(1000);
      expect(profile[profile.length - 1]).toBeLessThan(config.world.waterLevel + 80);
      for (let i = 1; i < profile.length; i++) {
        expect(profile[i]).toBeLessThanOrEqual(profile[i - 1] + 90);
      }
    });
  });

  test('corridors are carved smoother and lower than surrounding cliff shoulders', () => {
    const context = createSkyContext();
    const terrain = new context.window.SkySquirrel.TerrainSystem();

    terrain.getFlightCorridors().forEach(route => {
      const center = routePoint(context, terrain, route, 0.5, 0);
      const shoulder = routePoint(context, terrain, route, 0.5, route.width * 2.4);
      const centerNormal = terrain.getNormalAt(center.x, center.z);
      const centerHeight = terrain.getHeightAt(center.x, center.z);
      const shoulderHeight = terrain.getHeightAt(shoulder.x, shoulder.z);

      expect(shoulderHeight - centerHeight).toBeGreaterThan(120);
      expect(centerNormal.y).toBeGreaterThan(0.42);
    });
  });

  test('terrain mesh winding still faces upward for native WebGL', () => {
    const context = createSkyContext();
    const terrain = new context.window.SkySquirrel.TerrainSystem();
    const M = context.window.SkySquirrel.Math3D;
    const vertices = terrain.mesh.vertices;
    const a = M.vec3(vertices[0], vertices[1], vertices[2]);
    const b = M.vec3(vertices[3], vertices[4], vertices[5]);
    const c = M.vec3(vertices[6], vertices[7], vertices[8]);
    const faceNormal = M.normalize(M.cross(M.sub(b, a), M.sub(c, a)));

    expect(faceNormal.y).toBeGreaterThan(0);
  });
});

// Behaviour under test: vegetation and landmarks reinforce readable flight paths.
describe('SkySquirrel caldera environment', () => {
  test('trees avoid launch pads and fast flight corridors', () => {
    const context = createSkyContext();
    const terrain = new context.window.SkySquirrel.TerrainSystem();
    const environment = new context.window.SkySquirrel.EnvironmentSystem(context.window.SkySquirrel.WorldConfig, terrain);
    const config = context.window.SkySquirrel.WorldConfig;
    const launch = terrain.getLaunchPoint();

    expect(environment.trees.length).toBeGreaterThan(config.vegetation.treeCount * 0.75);
    environment.trees.forEach(tree => {
      const corridor = terrain.getCorridorInfluence(tree.x, tree.z);
      expect(corridor.influence).toBeLessThanOrEqual(0.22);
      expect(Math.hypot(tree.x - launch.x, tree.z - launch.z)).toBeGreaterThan(config.vegetation.launchClearance);
      expect(tree.y).toBeGreaterThanOrEqual(config.landmarks.forestBands[0].minHeight);
      expect(tree.y).toBeLessThanOrEqual(config.landmarks.forestBands[0].maxHeight);
    });
  });

  test('waterfall and obsidian route landmarks generate visible mesh geometry', () => {
    const context = createSkyContext();
    const terrain = new context.window.SkySquirrel.TerrainSystem();
    const environment = new context.window.SkySquirrel.EnvironmentSystem(context.window.SkySquirrel.WorldConfig, terrain);

    expect(environment.waterMesh.count).toBe(6);
    expect(environment.landmarkMesh.count).toBeGreaterThan(200);
    expect(environment.treeMesh.count).toBeGreaterThan(environment.trees.length * 8);
  });
});

// Behaviour under test: the new scale supports actual downhill flight.
describe('SkySquirrel caldera flight and camera', () => {
  test('jumping from the rim enters flight with immediate clearance', () => {
    const context = createSkyContext();
    const terrain = new context.window.SkySquirrel.TerrainSystem();
    const physics = new context.window.SkySquirrel.FlightPhysics();
    physics.reset(terrain.getLaunchPoint());
    physics.update(1 / 60, { jump: true }, terrain);
    const state = physics.getState();
    const clearance = state.position.y - terrain.getHeightAt(state.position.x, state.position.z);

    expect(state.mode).toBe('flying');
    expect(clearance).toBeGreaterThan(12);
    expect(physics.getTelemetry().speed).toBeGreaterThan(context.window.SkySquirrel.WorldConfig.physics.minFlightSpeed);
  });

  test('a short glide down the waterfall gorge remains airborne', () => {
    const context = createSkyContext();
    const terrain = new context.window.SkySquirrel.TerrainSystem();
    const physics = new context.window.SkySquirrel.FlightPhysics();
    physics.reset(terrain.getLaunchPoint());
    physics.update(1 / 60, { jump: true }, terrain);
    let minClearanceAfterLip = Infinity;

    for (let frame = 0; frame < 360; frame++) {
      physics.update(1 / 60, { forward: true }, terrain);
      const state = physics.getState();
      if (frame > 70) {
        minClearanceAfterLip = Math.min(minClearanceAfterLip, state.position.y - terrain.getHeightAt(state.position.x, state.position.z));
      }
      expect(state.mode).not.toBe('crashed');
    }

    expect(physics.getTelemetry().distance).toBeGreaterThan(500);
    expect(minClearanceAfterLip).toBeGreaterThan(100);
  });

  test('camera stays above terrain and projects up as up', () => {
    const context = createSkyContext();
    const terrain = new context.window.SkySquirrel.TerrainSystem();
    const physics = new context.window.SkySquirrel.FlightPhysics();
    const M = context.window.SkySquirrel.Math3D;
    physics.reset(terrain.getLaunchPoint());
    physics.update(1 / 60, { jump: true }, terrain);
    const camera = new context.window.SkySquirrel.CameraController();
    camera.reset(physics.getState());
    camera.update(1 / 60, physics.getState(), terrain);
    const viewProjection = M.multiplyMat4(M.perspective(Math.PI / 3, 16 / 9, 0.4, 8200), camera.getViewMatrix());
    const player = physics.getState().position;
    const project = point => {
      const clipY = viewProjection[1] * point.x + viewProjection[5] * point.y + viewProjection[9] * point.z + viewProjection[13];
      const clipW = viewProjection[3] * point.x + viewProjection[7] * point.y + viewProjection[11] * point.z + viewProjection[15];
      return clipY / clipW;
    };

    expect(camera.position.y).toBeGreaterThan(terrain.getHeightAt(camera.position.x, camera.position.z));
    expect(camera.getViewMatrix()).toHaveLength(16);
    expect(project({ ...player, y: player.y + 50 })).toBeGreaterThan(project(player));
  });

  test('standalone page uses native scripts and GameHub config registers Sky Squirrel', () => {
    const repoRoot = path.resolve(__dirname, '../..');
    const index = fs.readFileSync(path.join(repoRoot, 'games/skySquirrel/index.html'), 'utf8');
    const config = fs.readFileSync(path.join(repoRoot, 'games.config.js'), 'utf8');

    expect(index).not.toMatch(/three\.js|cdnjs|THREE/);
    [
      'WorldConfig.js',
      'Math3D.js',
      'TerrainSystem.js',
      'EnvironmentSystem.js',
      'FlightPhysics.js',
      'InputController.js',
      'CameraController.js',
      'WebGLRenderer.js',
      'Game.js',
      'main.js'
    ].forEach(script => expect(index).toContain(script));
    expect(config).toContain("folder: 'skySquirrel'");
    expect(config).toContain("rendering: 'Native WebGL'");
  });
});
