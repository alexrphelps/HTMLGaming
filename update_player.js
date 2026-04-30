const fs = require('fs');
const path = 'games/gloomvault-extraction/js/entities/Player.js';
let content = fs.readFileSync(path, 'utf8');

// Update weapon instantiation
content = content.replace('this.weapon = new Weapon(true);', `
        this.weapon1 = null;
        this.weapon2 = null;`);

// Update recalculateStats
content = content.replace(/if \(this\.weapon\) \{[\s\S]*?\}/, `
        if (this.weapon1) {
            this.weapon1.damage = Math.round(this.weapon1.baseDamage * this.stats.damageMultiplier + this.stats.flatDamage);
            this.weapon1.cooldown = this.weapon1.baseCooldown / this.stats.attackSpeedMultiplier;
        }
        if (this.weapon2) {
            this.weapon2.damage = Math.round(this.weapon2.baseDamage * this.stats.damageMultiplier + this.stats.flatDamage);
            this.weapon2.cooldown = this.weapon2.baseCooldown / this.stats.attackSpeedMultiplier;
        }
`);

// Add re-instantiation logic for weapons when equipment changes
// We can hook it into recalculateStats
const instantiateHook = `
        // Instantiate weapons based on equipment
        this.weapon1 = this.equipment.weapon ? new Weapon(this.equipment.weapon, true) : null;
        this.weapon2 = this.equipment.weapon2 ? new Weapon(this.equipment.weapon2, true) : null;
        
        // Reset to base
`;
content = content.replace('// Reset to base', instantiateHook);


// Update weapon cooldowns
content = content.replace(/if \(this\.weapon\) \{\s*this\.weapon\.update\(dt\);\s*\}/, `
        if (this.weapon1) this.weapon1.update(dt);
        if (this.weapon2) this.weapon2.update(dt);`);

// Update attacks
const attackRegex = /if \(input\.mouse\.down && this\.weapon\) \{[\s\S]*?if \(input\.mouse\.down \|\| input\.mouse\.rightDown\)/m;
const newAttacks = `
        if (input.mouse.down && this.weapon1) {
            const projs = this.weapon1.attack(this.x, this.y, this.angle);
            if (projs && projs.length > 0) {
                newProjectiles.push(...projs);
                isAttacking = true;
            }
        }
        
        if (input.mouse.rightDown && this.weapon2) {
            const projs = this.weapon2.attack(this.x, this.y, this.angle);
            if (projs && projs.length > 0) {
                newProjectiles.push(...projs);
                isAttacking = true;
            }
        }

        if (input.mouse.down || input.mouse.rightDown)`;
content = content.replace(attackRegex, newAttacks);

fs.writeFileSync(path, content, 'utf8');
