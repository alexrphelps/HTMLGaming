const fs = require('fs');
const path = 'games/gloomvault-extraction/js/main.js';
let content = fs.readFileSync(path, 'utf8');

const ensureStarterLogic = `
    function ensureStarterEquipment(eq) {
        if (!eq.weapon) {
            eq.weapon = { id: 'starter_wep1', name: 'Rusty Glock', type: 'weapon', weaponType: 'pistol', rarity: 'Common', color: '#a0a0a0', gearScore: 5, modifiers: [], upgradeLevel: 0, isStarter: true };
        }
        if (!eq.weapon2) {
            eq.weapon2 = { id: 'starter_wep2', name: 'Sawed-off Shotgun', type: 'weapon', weaponType: 'shotgun', rarity: 'Common', color: '#a0a0a0', gearScore: 5, modifiers: [], upgradeLevel: 0, isStarter: true };
        }
        const minorHeal = { type: 'heal', value: 25, cooldown: 15, name: 'Minor Heal', text: 'Use to heal 25 HP (15s CD)' };
        if (!eq.trinket1) {
            eq.trinket1 = { id: 'starter_tr1', name: 'Health Potion', type: 'trinket', rarity: 'Common', color: '#a0a0a0', gearScore: 5, modifiers: [], upgradeLevel: 0, isStarter: true, activeAbility: minorHeal };
        }
        if (!eq.trinket2) {
            eq.trinket2 = { id: 'starter_tr2', name: 'Health Potion', type: 'trinket', rarity: 'Common', color: '#a0a0a0', gearScore: 5, modifiers: [], upgradeLevel: 0, isStarter: true, activeAbility: minorHeal };
        }
    }
`;

content = content.replace(/function loadStashData\(\) \{[\s\S]*?\} catch\(e\)/m, (match) => {
    return ensureStarterLogic + match.replace(/stashEquipment = JSON\.parse\(.*?;\s*/, "stashEquipment = JSON.parse(localStorage.getItem('gloomvault_equipment')) || { helm: null, chest: null, pants: null, boots: null, weapon: null, weapon2: null, trinket1: null, trinket2: null };\n            ensureStarterEquipment(stashEquipment);\n            ");
});

fs.writeFileSync(path, content, 'utf8');
