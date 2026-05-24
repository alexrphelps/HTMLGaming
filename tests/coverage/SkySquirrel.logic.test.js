const { createBrowserContext, loadBrowserScript } = require('../helpers/browserScriptHarness');

class FakeVector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  clone() { return new FakeVector3(this.x, this.y, this.z); }
  copy(other) { this.x = other.x; this.y = other.y; this.z = other.z; return this; }
  add(other) { this.x += other.x; this.y += other.y; this.z += other.z; return this; }
  sub(other) { this.x -= other.x; this.y -= other.y; this.z -= other.z; return this; }
  multiplyScalar(scalar) { this.x *= scalar; this.y *= scalar; this.z *= scalar; return this; }
  normalize() { const len = this.distanceTo(new FakeVector3()); if (len) this.multiplyScalar(1 / len); return this; }
  distanceTo(other) { return Math.hypot(this.x - other.x, this.y - other.y, this.z - other.z); }
  lerp(target, alpha) { this.x += (target.x - this.x) * alpha; this.y += (target.y - this.y) * alpha; this.z += (target.z - this.z) * alpha; return this; }
}

function loadSky(relativePath, exports, overrides = {}) {
  const context = createBrowserContext({
    document,
    setInterval,
    clearInterval,
    setTimeout,
    clearTimeout,
    THREE: { Vector3: FakeVector3, Euler: class Euler { constructor(x, y, z) { this.x = x; this.y = y; this.z = z; } } },
    ...overrides
  });
  return { context, exports: loadBrowserScript(context, `games/skySquirrel/js/${relativePath}`, exports) };
}

// Behaviour under test: SkySquirrel physics applies gravity and resolves terrain/no-terrain collisions.
describe('SkySquirrel Physics', () => {
  test('gravity ground water and resistance calculations are deterministic', () => {
    const { exports } = loadSky('Physics.js', ['SkySquirrelPhysics']);
    const physics = new exports.SkySquirrelPhysics();
    const velocity = new FakeVector3(10, 0, 0);
    physics.applyGravity(velocity, 1, true);
    const collision = physics.handleCollision(new FakeVector3(0, -1, 0), new FakeVector3(1, -2, 0), 0.5);
    const resistance = physics.calculateAirResistance(new FakeVector3(10, 0, 0));
    expect([velocity.y, collision.position.y, collision.velocity.y, physics.isInWater({ y: 0 }), resistance.x])
      .toEqual([expect.closeTo(-2.943), 0.5, 0, true, expect.closeTo(0.2)]);
  });

  test('terrain height branches override default ground', () => {
    const { exports } = loadSky('Physics.js', ['SkySquirrelPhysics']);
    const physics = new exports.SkySquirrelPhysics();
    physics.setTerrain({ waterLevel: -3, getHeightAt: () => 7 });
    expect([physics.getGroundHeight(1, 2), physics.isOnGround({ x: 1, y: 7.05, z: 2 }), physics.getConstants().gravity]).toEqual([7, true, -9.81]);
  });
});

// Behaviour under test: SkySquirrel input maps keyboard, pointer lock, mouse, scroll, and cleanup.
describe('SkySquirrel InputHandler', () => {
  test('keyboard and mouse callbacks produce normalized input state', () => {
    const requestPointerLock = jest.fn();
    const exitPointerLock = jest.fn();
    document.body.requestPointerLock = requestPointerLock;
    document.exitPointerLock = exitPointerLock;
    const { exports } = loadSky('InputHandler.js', ['SkySquirrelInputHandler']);
    const input = new exports.SkySquirrelInputHandler();
    input.onInput = jest.fn();
    input.onMouseMoveCallback = jest.fn();
    input.onScrollCallback = jest.fn();
    input.onKeyDown({ code: 'KeyW' });
    input.mouse.isLocked = true;
    input.onMouseMove({ movementX: 4, movementY: 200 });
    input.onWheel({ preventDefault: jest.fn(), deltaY: 3 });
    input.mouse.isLocked = false;
    input.onMouseDown({ button: 0 });
    input.mouse.isLocked = true;
    input.exitPointerLock();
    expect([input.isKeyPressed('KeyW'), input.getMousePosition().y, input.onMouseMoveCallback.mock.calls[0], input.onScrollCallback.mock.calls[0][0], requestPointerLock.mock.calls.length, exitPointerLock.mock.calls.length])
      .toEqual([true, 90, [4, 200], 3, 1, 1]);
  });
});

// Behaviour under test: SkySquirrel camera controller updates orbit camera settings and shake state.
describe('SkySquirrel CameraController', () => {
  test('camera setters, mouse orbit, scroll clamp, and update move camera around player', () => {
    const camera = { position: new FakeVector3(), lookAt: jest.fn() };
    const player = { getPosition: () => new FakeVector3(0, 0, 0) };
    const { exports } = loadSky('CameraController.js', ['SkySquirrelCameraController']);
    const controller = new exports.SkySquirrelCameraController(camera, player);
    controller.setDistance(10);
    controller.setHeight(4);
    controller.setSmoothness(0.5);
    controller.handleMouseInput(10, -10);
    controller.handleScroll(100);
    controller.update(0.016);
    expect([controller.distance, controller.height, camera.lookAt.mock.calls.length, controller.getPosition()]).toEqual([20, 4, 1, expect.any(FakeVector3)]);
  });

  test('cinematic helpers and shake restore camera position', () => {
    jest.useFakeTimers();
    const camera = { position: new FakeVector3(), lookAt: jest.fn() };
    const player = { getPosition: () => new FakeVector3(0, 0, 0) };
    const { exports } = loadSky('CameraController.js', ['SkySquirrelCameraController']);
    const controller = new exports.SkySquirrelCameraController(camera, player);
    controller.startCinematicMode();
    controller.shake(1, 0.02);
    jest.advanceTimersByTime(25);
    controller.stopCinematicMode();
    jest.useRealTimers();
    expect([controller.mode, controller.autoRotate, camera.position]).toEqual(['follow', false, { x: 0, y: 0, z: 0 }]);
  });
});

// Behaviour under test: SkySquirrel player exposes pure helpers and state getters without building meshes.
describe('SkySquirrel Player helpers', () => {
  test('position, input, helper math, and state getters work with vector stubs', () => {
    const { exports } = loadSky('Player.js', ['SkySquirrelPlayer']);
    const player = new exports.SkySquirrelPlayer({});
    player.setPosition(1, 2, 3);
    player.handleInput({ forward: true, jump: true });
    expect([player.getPosition(), player.getVelocity(), player.getMode(), player.getAltitude(), player.lerp(0, 10, 0.25), player.clamp(20, 0, 5)])
      .toEqual([expect.any(FakeVector3), expect.any(FakeVector3), 'Walking', 2, 2.5, 5]);
  });
});
