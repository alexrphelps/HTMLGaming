(function (ns) {
    const ui = new ns.UI(); const game = new ns.Game(document.getElementById('gameCanvas'), ui); ui.bind(game);
    window.miniInvadersV2Game = game;
    window.addEventListener('message', event => {
        if (event.data && event.data.type === 'mini-invaders-v2:pause' && game.state) {
            game.paused = true; ui.openPanel(game, 'pause');
        }
    });
    console.log('Frontier Wayfarer // open-universe systems online');
})(window.MiniInvadersV2);
