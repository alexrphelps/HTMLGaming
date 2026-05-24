const { MathUtils, Vector2 } = require('../utils/__test_export__');

describe('MathUtils', () => {
  test('clamp keeps value within bounds', () => {
    expect(MathUtils.clamp(5, 0, 10)).toBe(5);
    expect(MathUtils.clamp(-1, 0, 10)).toBe(0);
    expect(MathUtils.clamp(11, 0, 10)).toBe(10);
  });

  test('distance computes correct distance', () => {
    expect(MathUtils.distance(0, 0, 3, 4)).toBe(5);
  });

  test('rectangle intersection', () => {
    expect(MathUtils.rectangleIntersection(0, 0, 10, 10, 5, 5, 5, 5)).toBeTruthy();
    expect(MathUtils.rectangleIntersection(0, 0, 10, 10, 20, 20, 5, 5)).toBeFalsy();
  });
});

describe('Vector2', () => {
  test('vector operations', () => {
    const a = new Vector2(1, 2);
    const b = new Vector2(4, 6);
    expect(Vector2.distance(a, b)).toBeCloseTo(5);
    const c = Vector2.lerp(a, b, 0.5);
    expect(c.x).toBeCloseTo(2.5);
    expect(c.y).toBeCloseTo(4);
  });
});
