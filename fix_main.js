const fs = require('fs');
const path = 'games/gloomvault-extraction/js/main.js';
let content = fs.readFileSync(path, 'utf8');

// The function is currently defined right before loadStashData
// We just need to insert a call inside loadStashData

content = content.replace(/stashEquipment = JSON\.parse\(localStorage\.getItem\('gloomvault_equipment'\)\) \|\| \{[\s\S]*?Weapon2: null, trinket1: null, trinket2: null\s*\};/i, (match) => {
    return match;
});

// Since the regex didn't match the multi-line stuff well last time, let's just do it simpler:
content = content.replace(/scraps = parseInt\(localStorage\.getItem\('gloomvault_scraps'\)\) \|\| 0;/, "ensureStarterEquipment(stashEquipment);\n            scraps = parseInt(localStorage.getItem('gloomvault_scraps')) || 0;");

fs.writeFileSync(path, content, 'utf8');
