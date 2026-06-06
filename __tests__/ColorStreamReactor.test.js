const fs = require('fs');
const path = require('path');
const { TextDecoder, TextEncoder } = require('util');

global.TextEncoder = global.TextEncoder || TextEncoder;
global.TextDecoder = global.TextDecoder || TextDecoder;

const { JSDOM } = require('jsdom');

const gameDir = path.join(__dirname, '..', 'games', 'color_stream_reactor');

function readGameFile() {
    return fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8');
}

function readJsFiles() {
    const jsDir = path.join(gameDir, 'js');
    return ['constants.js', 'state.js', 'game.js']
        .map(f => fs.readFileSync(path.join(jsDir, f), 'utf8'))
        .join('\n');
}

function buildInlineHtml() {
    const html = readGameFile();
    return html.replace(
        /<script src="js\/\w+\.js"><\/script>\s*/g,
        ''
    ).replace('</body>', `<script>${readJsFiles()}</script></body>`);
}

function createGameDom() {
    const callbacks = new Map();
    let nextRafId = 1;

    const dom = new JSDOM(buildInlineHtml(), {
        runScripts: 'dangerously',
        resources: 'usable',
        pretendToBeVisual: true,
        url: 'http://localhost/games/color_stream_reactor/index.html',
        beforeParse(win) {
            win.Element.prototype.animate = jest.fn();
            win.requestAnimationFrame = callback => {
                const id = nextRafId++;
                callbacks.set(id, callback);
                return id;
            };
            win.cancelAnimationFrame = id => callbacks.delete(id);
            win.__flushNextFrame = timestamp => {
                const [id, callback] = callbacks.entries().next().value || [];
                if (!callback) return false;
                callbacks.delete(id);
                callback(timestamp);
                return true;
            };
            win.__pendingFrames = () => callbacks.size;
        }
    });

    return dom;
}

describe('Color Stream Reactor', () => {
    afterEach(() => {
        jest.resetModules();
        delete window.GAMEHUB_GAMES;
    });

    test('is registered in the GameHub game config', () => {
        require('../games.config');

        const game = window.GAMEHUB_GAMES.find(entry => entry.folder === 'color_stream_reactor');

        expect(game).toEqual(expect.objectContaining({
            name: 'Color Stream Reactor',
            category: 'Arcade',
            difficulty: 'Medium',
            icon: 'CSR',
            estimatedPlayTime: 5
        }));
        expect(game.tags).toEqual(expect.arrayContaining(['arcade', 'reflex', 'color-match', 'neon']));
    });

    test('all JS files parse without errors', () => {
        const files = ['constants.js', 'state.js', 'game.js'];
        const jsDir = path.join(gameDir, 'js');

        files.forEach(file => {
            const content = fs.readFileSync(path.join(jsDir, file), 'utf8');
            expect(() => new Function(content)).not.toThrow();
        });
    });

    test('page boots with difficulty menu, locked color controls, and high score HUD', () => {
        const dom = createGameDom();
        const doc = dom.window.document;

        try {
            const controls = [...doc.querySelectorAll('.colorBtn')];
            const difficultyButtons = [...doc.querySelectorAll('#menu .difficultyButton')];

            expect(doc.title).toBe('Color Reactor 3D');
            expect(difficultyButtons.map(button => button.textContent.trim())).toEqual(['NOOB', 'BASIC', 'PRO']);
            expect(controls).toHaveLength(8);
            expect(controls[0]).not.toBeDisabled();
            expect(controls[0].textContent).toContain('q');
            expect(controls[1]).toBeDisabled();
            expect(controls[1].style.display).toBe('none');
            expect(doc.getElementById('best').textContent).toBe('0');
            expect(dom.window.ColorStreamReactor.COLOR_UNLOCKS).toHaveLength(8);
        } finally {
            dom.window.close();
        }
    });

    test('restart resets timers and keeps only one active animation frame', () => {
        const dom = createGameDom();

        try {
            dom.window.startGame('basic');
            expect(dom.window.__pendingFrames()).toBe(1);

            dom.window.__flushNextFrame(1000);
            expect(dom.window.__pendingFrames()).toBe(1);

            dom.window.restartGame('basic');
            const state = dom.window.ColorStreamReactor.getState();

            expect(dom.window.__pendingFrames()).toBe(1);
            expect(state.spawnTimer).toBe(0);
            expect(state.lastTime).toBe(0);
            expect(state.running).toBe(true);
            expect(state.currentDifficulty).toBe('basic');
        } finally {
            dom.window.close();
        }
    });

    test('basic difficulty keeps the current default starting state', () => {
        const dom = createGameDom();
        const reactor = dom.window.ColorStreamReactor;

        try {
            dom.window.startGame('basic');
            const state = reactor.getState();

            expect(state.currentDifficulty).toBe('basic');
            expect(state.availableColors).toBe(1);
            expect(state.revealedColors).toBe(1);
            expect(state.spawnRate).toBe(1000);
            expect(state.fallSpeed).toBe(114);
        } finally {
            dom.window.close();
        }
    });

    test('noob difficulty caps unlocks at four colors', () => {
        const dom = createGameDom();
        const reactor = dom.window.ColorStreamReactor;

        try {
            dom.window.startGame('noob');
            reactor.setScore(999);
            const state = reactor.getState();

            expect(state.currentDifficulty).toBe('noob');
            expect(state.availableColors).toBe(4);
            expect(state.revealedColors).toBe(1);
        } finally {
            dom.window.close();
        }
    });

    test('pro difficulty starts with all colors and ramps faster', () => {
        const dom = createGameDom();
        const reactor = dom.window.ColorStreamReactor;

        try {
            dom.window.startGame('pro');
            let state = reactor.getState();

            expect(state.currentDifficulty).toBe('pro');
            expect(state.availableColors).toBe(8);
            expect(state.revealedColors).toBe(8);
            expect(state.spawnRate).toBe(800);
            expect(state.fallSpeed).toBe(142.5);

            [1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800].forEach(timestamp => {
                dom.window.__flushNextFrame(timestamp);
            });
            state = reactor.getState();

            expect(state.spawnRate).toBe(795);
            expect(state.fallSpeed).toBe(143.4);
        } finally {
            dom.window.close();
        }
    });

    test('matching colors score, wrong colors reset combo, and keyboard shortcuts shoot', () => {
        const dom = createGameDom();
        const reactor = dom.window.ColorStreamReactor;

        try {
            dom.window.startGame('pro');

            reactor.spawnDot();
            let state = reactor.getState();
            state.dots[0].color = reactor.COLORS[0];
            state.dots[0].el.style.background = reactor.COLORS[0];
            reactor.shoot(reactor.COLORS[0]);
            state = reactor.getState();
            state.dots[0].y = 240;
            state.projectiles[0].y = 250;

            reactor.gameLoop(1000);
            state = reactor.getState();

            expect(state.score).toBe(1);
            expect(state.combo).toBe(1);
            expect(state.dots).toHaveLength(0);

            reactor.setScore(6);
            reactor.spawnDot();
            state = reactor.getState();
            state.dots[0].color = reactor.COLORS[0];
            state.dots[0].el.style.background = reactor.COLORS[0];

            dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'w' }));
            state = reactor.getState();
            expect(state.projectiles.at(-1).color).toBe(reactor.COLORS[1]);
            state.projectiles.at(-1).y = state.dots[0].y + 70;

            reactor.gameLoop(1200);
            state = reactor.getState();

            expect(state.combo).toBe(0);
            expect(state.dots).toHaveLength(1);
        } finally {
            dom.window.close();
        }
    });

    test('game over persists local high score', () => {
        const dom = createGameDom();
        const reactor = dom.window.ColorStreamReactor;

        try {
            dom.window.startGame('basic');
            reactor.setScore(12);
            reactor.spawnDot();
            const state = reactor.getState();
            state.dots[0].y = dom.window.innerHeight + 10;

            reactor.gameLoop(1000);

            expect(reactor.getState().running).toBe(false);
            expect(dom.window.document.getElementById('highScore').textContent).toBe('BEST SCORE: 12');
            expect(dom.window.localStorage.getItem('colorStreamReactorHighScore')).toBe('12');
        } finally {
            dom.window.close();
        }
    });

    test('game over shows difficulty choices instead of auto restarting', () => {
        const dom = createGameDom();
        const reactor = dom.window.ColorStreamReactor;
        const doc = dom.window.document;

        try {
            dom.window.startGame('pro');
            reactor.spawnDot();
            const state = reactor.getState();
            state.dots[0].y = dom.window.innerHeight + 10;

            reactor.gameLoop(1000);

            expect(reactor.getState().running).toBe(false);
            expect(doc.getElementById('gameOver').style.display).toBe('flex');

            const replayButtons = [...doc.querySelectorAll('#gameOver .difficultyButton')];
            expect(replayButtons.map(button => button.textContent.trim())).toEqual(['NOOB', 'BASIC', 'PRO']);
            expect(dom.window.__pendingFrames()).toBe(0);
        } finally {
            dom.window.close();
        }
    });

    test('enter starts basic from the menu and from the game over screen', () => {
        const dom = createGameDom();
        const reactor = dom.window.ColorStreamReactor;
        const doc = dom.window.document;

        try {
            doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter' }));
            expect(reactor.getState().currentDifficulty).toBe('basic');
            expect(reactor.getState().running).toBe(true);

            reactor.spawnDot();
            const state = reactor.getState();
            state.dots[0].y = dom.window.innerHeight + 10;
            reactor.gameLoop(1000);

            expect(doc.getElementById('gameOver').style.display).toBe('flex');

            doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter' }));
            expect(reactor.getState().currentDifficulty).toBe('basic');
            expect(reactor.getState().running).toBe(true);
        } finally {
            dom.window.close();
        }
    });
});
