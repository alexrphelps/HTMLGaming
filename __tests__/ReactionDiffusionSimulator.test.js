const fs = require('fs');
const path = require('path');
const { TextDecoder, TextEncoder } = require('util');

global.TextEncoder = global.TextEncoder || TextEncoder;
global.TextDecoder = global.TextDecoder || TextDecoder;

const { JSDOM } = require('jsdom');
const gameDir = path.join(__dirname, '..', 'games', 'reaction_diffusion_simulator');
const scriptOrder = [
    'js/config/ControlsConfig.js',
    'js/config/Presets.js',
    'js/config/Missions.js',
    'js/config/LearningMissions.js',
    'js/core/ReactionDiffusionState.js',
    'js/core/ReactionDiffusionSimulation.js',
    'js/core/MissionAnalyzer.js',
    'js/core/MissionManager.js',
    'js/core/ExperienceManager.js',
    'js/render/Palette.js',
    'js/render/CanvasRenderer.js',
    'js/ui/SimulatorView.js',
    'js/ui/SimulatorController.js',
    'js/main.js'
];

function readGameFile(...parts) {
    return fs.readFileSync(path.join(gameDir, ...parts), 'utf8');
}

function inlineLocalScripts(html) {
    return scriptOrder.reduce((output, scriptPath) => {
        const source = readGameFile(...scriptPath.split('/'));
        const tag = `<script src="${scriptPath}"></script>`;
        return output.replace(tag, `<script>\n${source}\n</script>`);
    }, html);
}

function loadNamespace(scriptPaths = scriptOrder.filter(script => script !== 'js/main.js')) {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'dangerously' });
    scriptPaths.forEach(scriptPath => {
        dom.window.eval(readGameFile(...scriptPath.split('/')));
    });
    return { dom, ns: dom.window.ReactionDiffusionSimulator };
}

describe('Reaction Diffusion Simulator integration', () => {
    afterEach(() => {
        jest.resetModules();
        delete window.GAMEHUB_GAMES;
    });

    test('is registered in the GameHub game config', () => {
        require('../games.config');

        const game = window.GAMEHUB_GAMES.find(entry => entry.folder === 'reaction_diffusion_simulator');

        expect(game).toEqual(expect.objectContaining({
            name: 'Reaction Diffusion Simulator',
            category: 'Simulation',
            difficulty: 'Medium',
            icon: 'RD'
        }));
        expect(game.tags).toEqual(expect.arrayContaining(['simulation', 'science', 'canvas']));
    });

    test('standalone page boots and exposes analysis controls without console errors', done => {
        const html = inlineLocalScripts(readGameFile('index.html'));
        const errors = [];

        const dom = new JSDOM(html, {
            runScripts: 'dangerously',
            resources: 'usable',
            pretendToBeVisual: true,
            beforeParse(win) {
                win.HTMLCanvasElement.prototype.getContext = () => ({
                    createImageData: (width, height) => ({
                        data: new Uint8ClampedArray(width * height * 4),
                        width,
                        height
                    }),
                    putImageData: jest.fn()
                });
                let rafCount = 0;
                win.requestAnimationFrame = callback => {
                    if (rafCount++ < 3) {
                        return win.setTimeout(() => callback(win.performance.now()), 0);
                    }
                    return 0;
                };
                win.console.error = (...args) => errors.push(args.join(' '));
            }
        });

        setTimeout(() => {
            try {
                const doc = dom.window.document;
                const app = dom.window.ReactionDiffusionSimulator.app;
                const params = app.simulation.getParams(app.view.controls);
                app.state.snapshotFrameStart();
                app.simulation.step(params);
                app.controller.renderCurrent(params);

                expect(errors).toEqual([]);
                expect(doc.title).toBe('Reaction Diffusion Simulator');
                expect(doc.body.classList.contains('menu-open')).toBe(true);
                expect(doc.getElementById('startLearningBtn').textContent).toBe('Start with learning');
                expect(doc.getElementById('startFullBtn').textContent).toBe('Start with everything');
                expect(doc.getElementById('openSettingsBtn').textContent).toBe('Settings');
                expect(doc.getElementById('presetBadge').textContent).toBe('Preset: Leopard Spots');
                expect(doc.getElementById('stepsStat').textContent).not.toBe('0');
                expect(doc.getElementById('tab-analysis')).not.toBeNull();
                expect(doc.getElementById('tab-missions')).toBeNull();
                expect(doc.getElementById('missionTitle').textContent).toBe('First Culture');
                expect(doc.getElementById('missionTitle').closest('.mission-panel')).not.toBeNull();
                expect(doc.getElementById('missionTitle').closest('.right-rail')).not.toBeNull();
                expect(doc.querySelector('[data-tab="missions"]')).toBeNull();
                expect(doc.getElementById('missionBadge').textContent).toContain('Mission:');
                expect(doc.querySelector('.right-rail .right-panel')).toBeNull();
                expect(doc.body.textContent).not.toContain('Presets + Analysis');
                expect(doc.getElementById('formulaBox').closest('.analysis-strip')).not.toBeNull();
                expect(doc.getElementById('formulaBox').textContent).toContain('Classic Gray');
                expect(doc.getElementById('insightBox').closest('.analysis-strip')).not.toBeNull();
                expect(doc.getElementById('uFill').closest('.analysis-strip')).not.toBeNull();
                expect(doc.getElementById('formulaBoxCompact')).toBeNull();
                expect(doc.querySelectorAll('[data-preset="spots"]').length).toBe(1);
                expect(doc.getElementById('runToolbar').closest('#tab-core')).toBeNull();
                expect(doc.getElementById('runToolbar').parentElement.className).toContain('panel-body');

                dom.window.close();
                done();
            } catch (error) {
                dom.window.close();
                done(error);
            }
        }, 150);
    });

    test('state reset and splat keep fields within expected bounds', () => {
        const { dom, ns } = loadNamespace();
        const state = new ns.ReactionDiffusionState(24, 24);

        state.splat(12, 12, 4, 0.9);
        expect(Array.from(state.v).some(value => value > 0)).toBe(true);
        expect(Array.from(state.u).every(value => value >= 0 && value <= 1)).toBe(true);
        expect(Array.from(state.v).every(value => value >= 0 && value <= 1)).toBe(true);

        state.steps = 42;
        state.reset();
        expect(state.steps).toBe(0);
        expect(Array.from(state.u).every(value => value === 1)).toBe(true);
        expect(Array.from(state.v).every(value => value === 0)).toBe(true);
        dom.window.close();
    });

    test('reaction formulas and one simulation step stay numerically bounded', () => {
        const { dom, ns } = loadNamespace();
        const state = new ns.ReactionDiffusionState(12, 12);
        const simulation = new ns.ReactionDiffusionSimulation(state);
        const base = {
            Du: 1,
            Dv: 0.5,
            F: 0.036,
            K: 0.062,
            G: 1.25,
            n: 3,
            S: 2,
            dt: 1,
            noise: 0,
            flowX: 0,
            flowY: 0,
            model: 'classic',
            view: 'beauty',
            palette: 'neon',
            driftMag: 0,
            weights: { d: 0.05, wx: 0.2, wy: 0.2 }
        };

        expect(simulation.reactionFor(0.8, 0.4, base)).toBeCloseTo(0.16);
        expect(simulation.reactionFor(0.8, 0.4, { ...base, model: 'cubic' })).toBeCloseTo(0.064);
        expect(simulation.reactionFor(0.8, 0.4, { ...base, model: 'saturating' })).toBeCloseTo(0.121212, 5);

        state.splat(6, 6, 3, 0.8);
        state.snapshotFrameStart();
        simulation.step(base);
        expect(state.steps).toBe(1);
        expect(Array.from(state.u).every(Number.isFinite)).toBe(true);
        expect(Array.from(state.v).every(Number.isFinite)).toBe(true);
        expect(Array.from(state.u).every(value => value >= 0 && value <= 1)).toBe(true);
        expect(Array.from(state.v).every(value => value >= 0 && value <= 1)).toBe(true);
        dom.window.close();
    });

    test('palette mapping returns valid rgb channels', () => {
        const { dom, ns } = loadNamespace();
        ['neon', 'lava', 'ice', 'forest', 'mono'].forEach(palette => {
            const rgb = ns.Palette.map(0.5, 'beauty', palette, 0.2, 0.1);
            expect(rgb).toHaveLength(3);
            expect(rgb.every(value => Number.isInteger(value) && value >= 0 && value <= 255)).toBe(true);
        });
        dom.window.close();
    });

    test('shared run controls remain wired outside the Core tab', done => {
        const html = inlineLocalScripts(readGameFile('index.html'));
        const dom = new JSDOM(html, {
            runScripts: 'dangerously',
            resources: 'usable',
            pretendToBeVisual: true,
            beforeParse(win) {
                win.HTMLCanvasElement.prototype.getContext = () => ({
                    createImageData: (width, height) => ({
                        data: new Uint8ClampedArray(width * height * 4),
                        width,
                        height
                    }),
                    putImageData: jest.fn()
                });
                let rafCount = 0;
                win.requestAnimationFrame = callback => {
                    if (rafCount++ < 2) {
                        return win.setTimeout(() => callback(win.performance.now()), 0);
                    }
                    return 0;
                };
            }
        });

        setTimeout(() => {
            try {
                const doc = dom.window.document;
                const app = dom.window.ReactionDiffusionSimulator.app;
                const generateBtn = doc.getElementById('generateBtn');
                const pauseBtn = doc.getElementById('pauseBtn');
                const stepBtn = doc.getElementById('stepBtn');

                expect(doc.querySelectorAll('#generateBtn')).toHaveLength(1);
                expect(generateBtn.closest('#tab-core')).toBeNull();

                generateBtn.click();
                expect(app.controller.isCustom).toBe(true);
                expect(app.controller.currentPresetKey).toBeNull();
                expect(app.missionManager.actionCounts.generate).toBe(1);

                pauseBtn.click();
                expect(app.controller.running).toBe(false);
                expect(pauseBtn.textContent).toBe('Resume');

                const beforeSteps = app.state.steps;
                stepBtn.click();
                expect(app.state.steps).toBe(beforeSteps + 20);

                dom.window.close();
                done();
            } catch (error) {
                dom.window.close();
                done(error);
            }
        }, 120);
    });

    test('center canvas layout constrains the square to its available grid row', () => {
        const css = readGameFile('css', 'style.css');

        expect(css).toContain('grid-template-rows:auto minmax(0, 1fr) auto auto;');
        expect(css).toContain('overflow:hidden;');
        expect(css).toContain('height:100%;\n  width:auto;\n  aspect-ratio:1 / 1;');
        expect(css).toContain('max-height:100%;');
    });

    test('collapsed blank fields throttle to one simulation step per second without changing user speed', done => {
        const html = inlineLocalScripts(readGameFile('index.html'));
        const dom = new JSDOM(html, {
            runScripts: 'dangerously',
            resources: 'usable',
            pretendToBeVisual: true,
            beforeParse(win) {
                win.HTMLCanvasElement.prototype.getContext = () => ({
                    createImageData: (width, height) => ({
                        data: new Uint8ClampedArray(width * height * 4),
                        width,
                        height
                    }),
                    putImageData: jest.fn()
                });
                win.requestAnimationFrame = () => 0;
            }
        });

        setTimeout(() => {
            try {
                const doc = dom.window.document;
                const app = dom.window.ReactionDiffusionSimulator.app;

                app.state.reset();
                app.state.steps = 100;
                doc.getElementById('speed').value = '16';

                const params = app.simulation.getParams(app.view.controls);
                const stats = app.controller.renderCurrent(params);
                expect(app.controller.isCollapsedField(stats)).toBe(true);

                app.controller.updateAdaptiveThrottle(stats, 1000);
                expect(app.controller.adaptiveThrottle.active).toBe(false);
                app.controller.updateAdaptiveThrottle(stats, 2600);
                expect(app.controller.adaptiveThrottle.active).toBe(true);

                const beforeSteps = app.state.steps;
                app.controller.loop(3700);
                expect(app.state.steps).toBe(beforeSteps + 1);
                expect(doc.getElementById('speed').value).toBe('16');

                app.controller.loop(3900);
                expect(app.state.steps).toBe(beforeSteps + 1);

                app.controller.resetAdaptiveThrottle();
                app.controller.loop(5000);
                expect(app.state.steps).toBe(beforeSteps + 17);

                dom.window.close();
                done();
            } catch (error) {
                dom.window.close();
                done(error);
            }
        }, 80);
    });

    test('main menu can start full mode and learning mode hides advanced UI', done => {
        const html = inlineLocalScripts(readGameFile('index.html'));
        const dom = new JSDOM(html, {
            runScripts: 'dangerously',
            resources: 'usable',
            pretendToBeVisual: true,
            beforeParse(win) {
                win.HTMLCanvasElement.prototype.getContext = () => ({
                    createImageData: (width, height) => ({
                        data: new Uint8ClampedArray(width * height * 4),
                        width,
                        height
                    }),
                    putImageData: jest.fn()
                });
                win.requestAnimationFrame = () => 0;
            }
        });

        setTimeout(() => {
            try {
                const doc = dom.window.document;
                const app = dom.window.ReactionDiffusionSimulator.app;

                doc.getElementById('startFullBtn').click();
                expect(app.experienceManager.mode).toBe('full');
                expect(doc.body.classList.contains('experience-full')).toBe(true);
                expect(doc.body.classList.contains('menu-open')).toBe(false);

                app.experienceManager.showMenu(false);
                doc.getElementById('startLearningBtn').click();
                expect(app.experienceManager.mode).toBe('learning');
                expect(doc.body.classList.contains('experience-learning')).toBe(true);
                expect(doc.body.classList.contains('learning-stage-1')).toBe(true);
                expect(app.experienceManager.activeMissionManager).toBe(app.learningMissionManager);

                dom.window.close();
                done();
            } catch (error) {
                dom.window.close();
                done(error);
            }
        }, 80);
    });

    test('back button returns from the canvas view to the main menu', done => {
        const html = inlineLocalScripts(readGameFile('index.html'));
        const dom = new JSDOM(html, {
            runScripts: 'dangerously',
            resources: 'usable',
            pretendToBeVisual: true,
            beforeParse(win) {
                win.HTMLCanvasElement.prototype.getContext = () => ({
                    createImageData: (width, height) => ({
                        data: new Uint8ClampedArray(width * height * 4),
                        width,
                        height
                    }),
                    putImageData: jest.fn()
                });
                win.requestAnimationFrame = () => 0;
            }
        });

        setTimeout(() => {
            try {
                const doc = dom.window.document;
                const app = dom.window.ReactionDiffusionSimulator.app;

                doc.getElementById('startFullBtn').click();
                expect(doc.body.classList.contains('menu-open')).toBe(false);
                expect(app.controller.running).toBe(true);

                doc.getElementById('backToMenuBtn').click();
                expect(app.experienceManager.mode).toBe('menu');
                expect(doc.body.classList.contains('menu-open')).toBe(true);
                expect(doc.body.classList.contains('settings-open')).toBe(false);
                expect(app.controller.running).toBe(false);
                expect(doc.getElementById('pauseBtn').textContent).toBe('Resume');

                dom.window.close();
                done();
            } catch (error) {
                dom.window.close();
                done(error);
            }
        }, 80);
    });

    test('settings screen exposes comfort, visual, startup, simulation, and reset controls', done => {
        const html = inlineLocalScripts(readGameFile('index.html'));
        const dom = new JSDOM(html, {
            runScripts: 'dangerously',
            resources: 'usable',
            pretendToBeVisual: true,
            beforeParse(win) {
                win.HTMLCanvasElement.prototype.getContext = () => ({
                    createImageData: (width, height) => ({
                        data: new Uint8ClampedArray(width * height * 4),
                        width,
                        height
                    }),
                    putImageData: jest.fn()
                });
                win.requestAnimationFrame = () => 0;
            }
        });

        setTimeout(() => {
            try {
                const doc = dom.window.document;
                const app = dom.window.ReactionDiffusionSimulator.app;

                doc.getElementById('openSettingsBtn').click();
                expect(doc.body.classList.contains('settings-open')).toBe(true);
                [
                    'settingReducedMotion',
                    'settingDensity',
                    'settingAutoPause',
                    'settingDefaultPalette',
                    'settingDefaultView',
                    'settingDefaultPreset',
                    'settingStartup',
                    'settingDefaultSpeed',
                    'resetLearningBtn',
                    'resetMissionsBtn',
                    'resetAllBtn'
                ].forEach(id => expect(doc.getElementById(id)).not.toBeNull());

                const density = doc.getElementById('settingDensity');
                density.value = 'compact';
                density.dispatchEvent(new dom.window.Event('change'));
                expect(app.experienceManager.settings.uiDensity).toBe('compact');
                expect(doc.body.classList.contains('density-compact')).toBe(true);

                dom.window.close();
                done();
            } catch (error) {
                dom.window.close();
                done(error);
            }
        }, 80);
    });

    test('learning progression reveals an additional control group', () => {
        const { dom, ns } = loadNamespace();
        const manager = new ns.MissionManager(ns.LEARNING_MISSIONS, null, { storageKey: 'learning-test' });
        const fullManager = new ns.MissionManager(ns.MISSIONS, null);
        const experience = new ns.ExperienceManager({
            documentRef: dom.window.document,
            storage: null,
            learningManager: manager,
            missionManager: fullManager
        });

        experience.startLearning();
        expect(experience.learningStage).toBe(1);
        manager.recordAction('generate');
        let status = manager.update({ coverage: 0.04, actions: manager.actionCounts }, 1000);
        expect(status.completed).toBe(false);
        status = manager.update({ coverage: 0.04, actions: manager.actionCounts }, 1400);
        expect(status.completed).toBe(true);
        expect(experience.learningStage).toBe(2);
        experience.applyClasses();
        expect(dom.window.document.body.classList.contains('learning-unlocked-2')).toBe(true);
        dom.window.close();
    });

    test('learning mode only displays the active unlocked tab panel', done => {
        const html = inlineLocalScripts(readGameFile('index.html'));
        const dom = new JSDOM(html, {
            runScripts: 'dangerously',
            resources: 'usable',
            pretendToBeVisual: true,
            beforeParse(win) {
                win.HTMLCanvasElement.prototype.getContext = () => ({
                    createImageData: (width, height) => ({
                        data: new Uint8ClampedArray(width * height * 4),
                        width,
                        height
                    }),
                    putImageData: jest.fn()
                });
                win.requestAnimationFrame = () => 0;
            }
        });

        setTimeout(() => {
            try {
                const doc = dom.window.document;
                const app = dom.window.ReactionDiffusionSimulator.app;

                doc.getElementById('startLearningBtn').click();
                app.learningMissionManager.unlockedIndex = 3;
                app.experienceManager.applyClasses();
                app.view.setActiveTab('core');

                expect(doc.body.classList.contains('learning-unlocked-4')).toBe(true);
                expect(doc.getElementById('tab-core').classList.contains('active')).toBe(true);
                expect(doc.getElementById('tab-brush').classList.contains('active')).toBe(false);

                const css = readGameFile('css', 'style.css');

                expect(css).toContain('body.experience-learning.learning-unlocked-3 #tab-core.active');
                expect(css).toContain('body.experience-learning.learning-unlocked-2 #tab-brush.active');
                expect(css).not.toContain('body.experience-learning.learning-unlocked-3 #tab-core,\n');

                dom.window.close();
                done();
            } catch (error) {
                dom.window.close();
                done(error);
            }
        }, 80);
    });

    test('experience manager loads defaults, saves settings, tolerates storage errors, and resets progress', () => {
        const { dom, ns } = loadNamespace();
        const saved = {};
        const storage = {
            getItem: key => saved[key] || null,
            setItem: (key, value) => { saved[key] = value; },
            removeItem: key => { delete saved[key]; }
        };
        const learning = new ns.MissionManager(ns.LEARNING_MISSIONS, storage, { storageKey: 'learning-key' });
        const missions = new ns.MissionManager(ns.MISSIONS, storage, { storageKey: 'mission-key' });
        const experience = new ns.ExperienceManager({
            documentRef: dom.window.document,
            storage,
            learningManager: learning,
            missionManager: missions
        });

        expect(experience.settings.startupMode).toBe('menu');
        experience.updateSetting('startupMode', 'learning');
        expect(JSON.parse(saved[ns.EXPERIENCE_SETTINGS_KEY]).startupMode).toBe('learning');

        learning.completedIds = ['learning-seed'];
        learning.unlockedIndex = 1;
        missions.completedIds = ['first-culture'];
        missions.unlockedIndex = 1;
        experience.resetLearningProgress();
        expect(learning.completedIds).toEqual([]);
        expect(learning.unlockedIndex).toBe(0);
        experience.resetMissionProgress();
        expect(missions.completedIds).toEqual([]);
        expect(missions.unlockedIndex).toBe(0);

        const badStorage = {
            getItem: () => { throw new Error('blocked'); },
            setItem: () => { throw new Error('blocked'); },
            removeItem: () => { throw new Error('blocked'); }
        };
        dom.window.console.warn = jest.fn();
        expect(() => new ns.ExperienceManager({
            documentRef: dom.window.document,
            storage: badStorage,
            learningManager: learning,
            missionManager: missions
        })).not.toThrow();
        dom.window.close();
    });

    test('mission config loads with unique ids and guided requirements', () => {
        const { dom, ns } = loadNamespace();
        const ids = ns.MISSIONS.map(mission => mission.id);

        expect(ns.MISSIONS).toHaveLength(10);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ns.MISSIONS[0]).toEqual(expect.objectContaining({
            id: 'first-culture',
            title: 'First Culture',
            holdMs: 800
        }));
        expect(ns.MISSIONS[0].requirements).toEqual(expect.arrayContaining([
            expect.objectContaining({ metric: 'coverage', min: 0.05 }),
            expect.objectContaining({ metric: 'actions.seeded', min: 1 })
        ]));
        dom.window.close();
    });

    test('mission manager tracks actions and completes after forgiving hold time', () => {
        const { dom, ns } = loadNamespace();
        const manager = new ns.MissionManager(ns.MISSIONS, null);

        manager.recordAction('burst');
        expect(manager.actionCounts.burst).toBe(1);
        expect(manager.actionCounts.seeded).toBe(1);

        const metrics = {
            coverage: 0.08,
            steps: 60,
            actions: manager.actionCounts
        };

        let status = manager.update(metrics, 1000);
        expect(status.allMet).toBe(true);
        expect(status.completed).toBe(false);
        expect(status.holdProgress).toBe(0);

        status = manager.update(metrics, 1800);
        expect(status.completed).toBe(true);
        expect(manager.completedIds).toContain('first-culture');
        expect(manager.unlockedIndex).toBe(1);
        dom.window.close();
    });

    test('mission analyzer exposes controls, preset state, and action counters', () => {
        const { dom, ns } = loadNamespace();
        const state = new ns.ReactionDiffusionState(8, 8);
        const analyzer = new ns.MissionAnalyzer(state);
        const metrics = analyzer.analyze(
            { coverage: 0.2, contrast: 0.15, avgReaction: 0.003, avgChange: 0.001, steps: 120, drift: 0 },
            { model: 'cubic', S: 1.5, n: 3.1, F: 0.04, K: 0.06, G: 1.2, driftMag: 0.14 },
            { actionCounts: { morph: 1 }, presetKey: null, isCustom: true }
        );

        expect(metrics.model).toBe('cubic');
        expect(metrics.sat).toBe(1.5);
        expect(metrics.exp).toBe(3.1);
        expect(metrics.drift).toBe(0.14);
        expect(metrics.isCustom).toBe(true);
        expect(metrics.actions.morph).toBe(1);
        dom.window.close();
    });
});
