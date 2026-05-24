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

  test('listeners can be called with context and listener errors do not stop emit', () => {
    const e = new EventEmitter();
    const context = { value: 7 };
    const good = jest.fn(function () {
      return this.value;
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});

    e.on('x', () => { throw new Error('boom'); });
    e.on('x', good, context);

    expect(e.emit('x')).toBe(true);
    expect(good).toHaveBeenCalled();
  });

  test('off without callback clears regular and once listeners for event', () => {
    const e = new EventEmitter();
    e.on('clear-me', jest.fn());
    e.once('clear-me', jest.fn());

    e.off('clear-me');

    expect(e.listenerCount('clear-me')).toBe(0);
    expect(e.hasListeners('clear-me')).toBe(false);
  });

  test('namespace emits and listens with prefixed events', () => {
    const e = new EventEmitter();
    const ns = e.namespace('game');
    const listener = jest.fn();

    ns.on('started', listener);
    expect(e.eventNames()).toContain('game:started');
    ns.emit('started', 42);

    expect(listener).toHaveBeenCalledWith(42);
  });

  test('warns when max listeners are exceeded', () => {
    const e = new EventEmitter();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    e.setMaxListeners(1);

    e.on('crowded', jest.fn());
    e.on('crowded', jest.fn());

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Maximum listeners'));
  });

  test('destroy removes all listeners', () => {
    const e = new EventEmitter();
    e.on('a', jest.fn());
    e.once('b', jest.fn());

    e.destroy();

    expect(e.debug().totalListeners).toBe(0);
  });
});
