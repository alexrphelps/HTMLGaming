const fs = require('fs');
const path = 'games/gloomvault-extraction/js/systems/UpgradeSystem.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/static getSalvageValue\(item\) \{/, `static getSalvageValue(item) {
        if (item && item.isStarter) return 0;`);

fs.writeFileSync(path, content, 'utf8');
