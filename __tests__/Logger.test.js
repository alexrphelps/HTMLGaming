const Logger = require('../utils/Logger');

describe('Logger', () => {
    beforeEach(() => {
        // reset to info
        Logger.setLevel('info');
        jest.restoreAllMocks();
    });

    test('info logs when level is info', () => {
        const spy = jest.spyOn(console, 'info').mockImplementation(() => {});
        Logger.info('test');
        expect(spy).toHaveBeenCalled();
    });

    test('debug does not log when level is info', () => {
        const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
        Logger.debug('nope');
        expect(spy).not.toHaveBeenCalled();
    });

    test('debug logs when level set to debug', () => {
        const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
        Logger.setLevel('debug');
        Logger.debug('yes');
        expect(spy).toHaveBeenCalled();
    });

    test('warn and error respect active level', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const error = jest.spyOn(console, 'error').mockImplementation(() => {});

        Logger.setLevel('warn');
        Logger.info('hidden');
        Logger.warn('visible warn');
        Logger.error('visible error');

        expect(warn).toHaveBeenCalled();
        expect(error).toHaveBeenCalled();
    });

    test('invalid level is ignored and silent suppresses logs', () => {
        const info = jest.spyOn(console, 'info').mockImplementation(() => {});

        Logger.setLevel('info');
        Logger.setLevel('not-a-level');
        expect(Logger.getLevel()).toBe(3);

        Logger.setLevel('silent');
        Logger.info('hidden');
        expect(info).not.toHaveBeenCalled();
    });

    test('initFromEnvironment enables debug for localhost or GH_DEBUG', () => {
        Logger.setLevel('info');
        Logger.initFromEnvironment({ hostname: 'localhost' });
        expect(Logger.getLevel()).toBe(4);

        Logger.setLevel('info');
        Logger.initFromEnvironment({
            hostname: 'example.com',
            storage: { getItem: key => key === 'GH_DEBUG' ? 'true' : null }
        });
        expect(Logger.getLevel()).toBe(4);
    });
});
