const fs = require('fs');
const path = 'games/gloomvault-extraction/js/core/GameEngine.js';
let content = fs.readFileSync(path, 'utf8');

// Starter equipment logic
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

content = ensureStarterLogic + content;

// Update start method
content = content.replace(/const savedEq = JSON\.parse\(localStorage\.getItem\('gloomvault_equipment'\)\);\s*if \(savedEq\) \{\s*this\.player\.equipment = savedEq;\s*this\.player\.recalculateStats\(\);\s*\}/, `
            let savedEq = JSON.parse(localStorage.getItem('gloomvault_equipment'));
            if (!savedEq) {
                savedEq = { helm: null, chest: null, pants: null, boots: null, weapon: null, weapon2: null, trinket1: null, trinket2: null };
            }
            ensureStarterEquipment(savedEq);
            this.player.equipment = savedEq;
            this.player.recalculateStats();
`);

// update action bar ui
const actionBarRegex = /\/\/ Weapon Primary[\s\S]*?\/\/ Trinkets/m;
const newActionBar = `// Weapon Primary
        const w1Slot = document.getElementById('slot-weapon1');
        if (w1Slot && this.player.weapon1) {
            const icon = w1Slot.querySelector('.action-icon');
            const cdOverlay = w1Slot.querySelector('.cooldown-overlay');
            
            const wepItem = this.player.equipment.weapon;
            if (wepItem) {
                icon.style.backgroundColor = wepItem.color;
                icon.textContent = wepItem.name.split(' ')[0].substring(0, 3);
            } else {
                icon.style.backgroundColor = '#555';
                icon.textContent = 'ATK';
            }

            const cdPercent = (this.player.weapon1.cooldownTimer / this.player.weapon1.cooldown) * 100;
            cdOverlay.style.height = \`\${Math.max(0, Math.min(100, cdPercent))}\%\`;
        }

        // Weapon Secondary
        const w2Slot = document.getElementById('slot-weapon2');
        if (w2Slot && this.player.weapon2) {
            const icon = w2Slot.querySelector('.action-icon');
            const cdOverlay = w2Slot.querySelector('.cooldown-overlay');
            
            const wepItem = this.player.equipment.weapon2;
            if (wepItem) {
                icon.style.backgroundColor = wepItem.color;
                icon.textContent = 'SEC';
            } else {
                icon.style.backgroundColor = '#555';
                icon.textContent = 'SEC';
            }

            const cdPercent = (this.player.weapon2.cooldownTimer / this.player.weapon2.cooldown) * 100;
            cdOverlay.style.height = \`\${Math.max(0, Math.min(100, cdPercent))}\%\`;
        }

        // Trinkets`;
content = content.replace(actionBarRegex, newActionBar);

fs.writeFileSync(path, content, 'utf8');
