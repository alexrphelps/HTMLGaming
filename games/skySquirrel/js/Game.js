/**
 * Game.js - Native WebGL wingsuit game coordinator.
 */
(function () {
    'use strict';

    const SkySquirrel = window.SkySquirrel = window.SkySquirrel || {};

    class Game {
        constructor(container) {
            this.container = container;
            this.config = SkySquirrel.WorldConfig;
            this.canvas = null;
            this.renderer = null;
            this.terrain = null;
            this.environment = null;
            this.physics = null;
            this.camera = null;
            this.input = null;
            this.running = false;
            this.lastTime = 0;
            this.frameHandle = null;
            this.ui = {
                speed: document.getElementById('speed'),
                altitude: document.getElementById('altitude'),
                verticalSpeed: document.getElementById('vertical-speed'),
                mode: document.getElementById('mode'),
                distance: document.getElementById('distance'),
                prompt: document.getElementById('prompt')
            };
            this.animate = this.animate.bind(this);
        }

        init() {
            this.canvas = document.createElement('canvas');
            this.canvas.id = 'game-canvas';
            this.canvas.setAttribute('tabindex', '0');
            this.container.appendChild(this.canvas);

            this.terrain = new SkySquirrel.TerrainSystem(this.config);
            this.environment = new SkySquirrel.EnvironmentSystem(this.config, this.terrain);
            this.physics = new SkySquirrel.FlightPhysics(this.config);
            this.physics.reset(this.terrain.getLaunchPoint());
            this.camera = new SkySquirrel.CameraController(this.config);
            this.camera.reset(this.physics.getState());
            this.input = new SkySquirrel.InputController(document);
            this.input.init();
            this.renderer = new SkySquirrel.WebGLRenderer(this.canvas, this.config);
            this.renderer.init();
        }

        start() {
            this.running = true;
            this.lastTime = performance.now();
            this.frameHandle = requestAnimationFrame(this.animate);
        }

        stop() {
            this.running = false;
            if (this.frameHandle) cancelAnimationFrame(this.frameHandle);
            this.frameHandle = null;
        }

        animate(time) {
            if (!this.running) return;
            const dt = Math.min(0.05, (time - this.lastTime) / 1000 || 0.016);
            this.lastTime = time;
            this.update(dt);
            this.render();
            this.frameHandle = requestAnimationFrame(this.animate);
        }

        update(dt) {
            const input = this.input.read();
            this.physics.update(dt, input, this.terrain);
            const player = this.physics.getState();
            this.camera.update(dt, player, this.terrain);
            this.updateUI(this.physics.getTelemetry(), player);
        }

        render() {
            this.renderer.render({
                terrain: this.terrain,
                environment: this.environment,
                player: this.physics.getState(),
                camera: this.camera
            });
        }

        updateUI(telemetry, player) {
            if (this.ui.speed) this.ui.speed.textContent = Math.round(telemetry.speedKmh);
            if (this.ui.altitude) this.ui.altitude.textContent = Math.round(telemetry.altitude);
            if (this.ui.verticalSpeed) this.ui.verticalSpeed.textContent = Math.round(telemetry.verticalSpeed);
            if (this.ui.distance) this.ui.distance.textContent = Math.round(telemetry.distance);
            if (this.ui.mode) this.ui.mode.textContent = player.mode.charAt(0).toUpperCase() + player.mode.slice(1);
            if (this.ui.prompt) {
                if (player.mode === 'walking') {
                    this.ui.prompt.textContent = 'WASD walk | Space jump | Step off the summit to fly';
                } else if (player.mode === 'flying') {
                    this.ui.prompt.textContent = 'W/S pitch | A/D roll | Q/E yaw | R restart after impact';
                } else {
                    this.ui.prompt.textContent = `Impact: ${player.crashSurface || 'terrain'} | Press R to restart`;
                }
            }
        }

        destroy() {
            this.stop();
            if (this.input) this.input.destroy();
            if (this.renderer) this.renderer.destroy();
            if (this.canvas && this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
        }
    }

    SkySquirrel.Game = Game;
}());
