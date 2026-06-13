/**
 * main.js - Standalone entry point for Sky Squirrel.
 */
(function () {
    'use strict';

    let game = null;

    function setLoading(message) {
        const loading = document.getElementById('loading');
        if (loading) loading.textContent = message;
    }

    window.addEventListener('DOMContentLoaded', () => {
        try {
            const container = document.getElementById('gameContainer');
            const loading = document.getElementById('loading');
            const hud = document.getElementById('hud');
            game = new window.SkySquirrel.Game(container);
            game.init();
            if (loading) loading.style.display = 'none';
            if (hud) hud.style.display = 'grid';
            game.start();
        } catch (error) {
            console.error('Sky Squirrel failed to start:', error);
            setLoading('Sky Squirrel could not start. WebGL support is required.');
        }
    });

    window.addEventListener('beforeunload', () => {
        if (game) game.destroy();
    });

    window.SkySquirrelApp = {
        get game() {
            return game;
        }
    };
}());
