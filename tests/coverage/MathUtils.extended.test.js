const { MathUtils, Vector2 } = require('../../utils/__test_export__');

// Behaviour under test: reusable scalar math, random helpers, geometry, colours, and mutable vector operations.
describe('MathUtils extended coverage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    delete MathUtils._hasSpare;
    delete MathUtils._spare;
  });

  test('constants expose common radian conversion values', () => {
    expect([MathUtils.PI, MathUtils.TWO_PI, MathUtils.HALF_PI, MathUtils.DEG_TO_RAD, MathUtils.RAD_TO_DEG])
      .toEqual([Math.PI, Math.PI * 2, Math.PI * 0.5, Math.PI / 180, 180 / Math.PI]);
  });

  test('map and smoothstep interpolate inside and outside ranges', () => {
    expect([MathUtils.map(5, 0, 10, 0, 100), MathUtils.smoothstep(0, 10, -5), MathUtils.smoothstep(0, 10, 10)])
      .toEqual([50, 0, 1]);
  });

  test('angle conversion round trips degrees and radians', () => {
    expect(MathUtils.radToDeg(MathUtils.degToRad(180))).toBeCloseTo(180);
  });

  test('vector helpers handle zero and nonzero vectors', () => {
    expect([MathUtils.normalize(0, 0), MathUtils.normalize(3, 4), MathUtils.dot(1, 2, 3, 4), MathUtils.cross(1, 2, 3, 4)])
      .toEqual([{ x: 0, y: 0 }, { x: 0.6, y: 0.8 }, 11, -2]);
  });

  test('random helpers use supplied bounds and selections deterministically', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    expect([MathUtils.random(10, 20), MathUtils.randomInt(1, 3), MathUtils.randomBool(0.6), MathUtils.randomChoice(['a', 'b', 'c'])])
      .toEqual([15, 2, true, 'b']);
  });

  test('gaussian helper reuses a spare generated value', () => {
    jest.spyOn(Math, 'random').mockReturnValueOnce(0.5).mockReturnValueOnce(0);
    const first = MathUtils.randomGaussian(10, 2);
    const second = MathUtils.randomGaussian(10, 2);
    expect([first, second]).toEqual([10, expect.any(Number)]);
  });

  test('easing helpers cover boundary branches', () => {
    expect([
      MathUtils.easeInOutQuad(0.25),
      MathUtils.easeInOutQuad(0.75),
      MathUtils.easeInExpo(0),
      MathUtils.easeOutExpo(1),
      MathUtils.easeInOutExpo(0),
      MathUtils.easeInOutExpo(1),
      MathUtils.easeInElastic(0),
      MathUtils.easeOutElastic(1),
      MathUtils.easeOutBounce(0.2),
      MathUtils.easeOutBounce(0.5),
      MathUtils.easeOutBounce(0.8),
      MathUtils.easeOutBounce(0.95)
    ]).toEqual([
      0.125,
      0.875,
      0,
      1,
      0,
      1,
      0,
      1,
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number)
    ]);
  });

  test('geometry helpers detect intersections and misses', () => {
    expect([
      MathUtils.pointInRectangle(2, 2, 0, 0, 4, 4),
      MathUtils.pointInCircle(3, 4, 0, 0, 5),
      MathUtils.lineIntersection(0, 0, 10, 10, 0, 10, 10, 0),
      MathUtils.lineIntersection(0, 0, 1, 0, 0, 1, 1, 1),
      MathUtils.circleIntersection(0, 0, 5, 9, 0, 5)
    ]).toEqual([true, true, { x: 5, y: 5 }, null, true]);
  });

  test('colour helpers convert and interpolate values', () => {
    expect([
      MathUtils.rgbToHex(255, 128, 0),
      MathUtils.hexToRgb('#ff8000'),
      MathUtils.hexToRgb('nope'),
      MathUtils.hslToRgb(120, 100, 50),
      MathUtils.lerpColor({ r: 0, g: 10, b: 20 }, { r: 10, g: 20, b: 30 }, 0.5)
    ]).toEqual(['#ff8000', { r: 255, g: 128, b: 0 }, null, { r: 0, g: 255, b: 0 }, { r: 5, g: 15, b: 25 }]);
  });
});

// Behaviour under test: Vector2 mutates chainably and static constructors return independent values.
describe('Vector2 extended coverage', () => {
  test('mutable operations update the same vector', () => {
    const vector = new Vector2(3, 4);
    const result = vector.set(1, 2).add(new Vector2(3, 4)).subtract(new Vector2(1, 1)).multiply(2).divide(2);
    expect([result, vector.x, vector.y, vector.length(), vector.lengthSquared(), vector.toString()])
      .toEqual([vector, 3, 5, Math.sqrt(34), 34, 'Vector2(3.00, 5.00)']);
  });

  test('normalizing zero vector leaves it unchanged', () => {
    expect(new Vector2(0, 0).normalize()).toEqual({ x: 0, y: 0 });
  });

  test('copy clone rotate lerp and static helpers produce expected vectors', () => {
    const source = new Vector2(1, 0);
    const clone = source.clone().rotate(Math.PI / 2);
    const copied = new Vector2().copy(clone).lerp(new Vector2(0, 2), 0.5);
    expect([
      clone.x,
      clone.y,
      copied.x,
      copied.y,
      source.dot(new Vector2(2, 3)),
      source.cross(new Vector2(2, 3)),
      source.angle(),
      Vector2.add(source, new Vector2(2, 3)),
      Vector2.subtract(new Vector2(5, 5), source),
      Vector2.multiply(source, 4)
    ]).toEqual([
      expect.closeTo(0),
      expect.closeTo(1),
      expect.closeTo(0),
      expect.closeTo(1.5),
      2,
      3,
      0,
      { x: 3, y: 3 },
      { x: 4, y: 5 },
      { x: 4, y: 0 }
    ]);
  });
});
