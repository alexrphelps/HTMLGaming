const fs = require('fs');
const path = 'games/gloomvault-extraction/js/main.js';
let content = fs.readFileSync(path, 'utf8');

// replace stat update logic
content = content.replace(/document\.getElementById\('stat-dmg'\)\.textContent =[\s\S]*?document\.getElementById\('stat-ms'\)\.textContent = Math\.round\(engine\.player\.speed\);/m, `
        document.getElementById('stat-dmg').textContent = 
            (engine.player.weapon1 ? Math.round(engine.player.weapon1.damage) : Math.round(engine.player.stats.flatDamage));
        document.getElementById('stat-spd').textContent = 
            (engine.player.weapon1 ? (1 / engine.player.weapon1.cooldown).toFixed(2) + '/s' : '-');
        document.getElementById('stat-ms').textContent = Math.round(engine.player.speed);`);

fs.writeFileSync(path, content, 'utf8');
