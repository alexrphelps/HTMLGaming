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
});
