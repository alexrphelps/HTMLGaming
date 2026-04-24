const { EventEmitter } = require('../utils/__test_export__');

describe('EventEmitter', () => {
  test('on and emit work', () => {
    const e = new EventEmitter();
    const mock = jest.fn();
    e.on('x', mock);
    e.emit('x', 1, 2);
    expect(mock).toHaveBeenCalledWith(1, 2);
    expect(e.listenerCount('x')).toBe(1);
  });

  test('once listener only fires once', () => {
    const e = new EventEmitter();
    const mock = jest.fn();
    e.once('y', mock);
    e.emit('y');
    e.emit('y');
    expect(mock).toHaveBeenCalledTimes(1);
    expect(e.listenerCount('y')).toBe(0);
  });

  test('off removes specific listener and removeAll clears', () => {
    const e = new EventEmitter();
    const a = jest.fn();
    const b = jest.fn();
    e.on('z', a);
    e.on('z', b);
    expect(e.listenerCount('z')).toBe(2);
    e.off('z', a);
    expect(e.listenerCount('z')).toBe(1);
    e.removeAllListeners('z');
    expect(e.listenerCount('z')).toBe(0);
  });

  test('emitAsync resolves promises', async () => {
    const e = new EventEmitter();
    e.on('async', async (v) => {
      return v * 2;
    });
    const results = await e.emitAsync('async', 3);
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('fulfilled');
  });
});
