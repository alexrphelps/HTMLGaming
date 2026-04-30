const fs = require('fs');
const path = 'games/gloomvault-extraction/js/main.js';
let content = fs.readFileSync(path, 'utf8');

// We want to remove the ensureStarterEquipment(stashEquipment) call 
// from loadStashData when stashEquipment already exists.

const searchString = `            stashEquipment = JSON.parse(localStorage.getItem('gloomvault_equipment')) || {
                helm: null, chest: null, pants: null, boots: null,
                weapon: null, weapon2: null, trinket1: null, trinket2: null
            };
            ensureStarterEquipment(stashEquipment);`;

const replaceString = `            let savedEq = JSON.parse(localStorage.getItem('gloomvault_equipment'));
            if (!savedEq) {
                savedEq = {
                    helm: null, chest: null, pants: null, boots: null,
                    weapon: null, weapon2: null, trinket1: null, trinket2: null
                };
                ensureStarterEquipment(savedEq);
            }
            stashEquipment = savedEq;`;

content = content.replace(searchString, replaceString);

fs.writeFileSync(path, content, 'utf8');
