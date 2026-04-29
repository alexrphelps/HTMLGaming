document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 Gloomvault Extraction - main.js loaded');

    // Initialize the engine
    const engine = new GameEngine('game-canvas');
    
    // Screen management
    const screens = document.querySelectorAll('.screen');
    
    function showScreen(id) {
        screens.forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');

        // Logic hook
        if (id === 'play-screen') {
            engine.start();
        } else if (id === 'main-menu') {
            engine.stop();
        }
    }

    // Event Listeners
    document.getElementById('btn-start').addEventListener('click', () => showScreen('play-screen'));
    document.getElementById('btn-stash').addEventListener('click', () => showScreen('stash-screen'));
    document.getElementById('btn-stash-back').addEventListener('click', () => showScreen('main-menu'));
    
    // In-game actions
    document.getElementById('btn-extract-temp').addEventListener('click', () => {
        console.log('💎 Extracted!');
        showScreen('main-menu');
    });
    document.getElementById('btn-die-temp').addEventListener('click', () => {
        console.log('💀 Died!');
        showScreen('main-menu');
    });
});