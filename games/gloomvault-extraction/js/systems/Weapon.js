class Weapon {
    static getElementConfig(element) {
        if (!element || typeof CombatConfig === 'undefined' || !CombatConfig.elemental) return null;
        return CombatConfig.elemental[element] || null;
    }

    static getElementColor(element) {
        const config = Weapon.getElementConfig(element);
        return config ? config.color : '#ffffff';
    }

    static rollElementForType(weaponType) {
        const elements = ['frost', 'fire', 'felfire', 'holy', 'shadow', 'poison', 'arcane'];
        let chance = 0;

        if (weaponType === 'pistol' || weaponType === 'shotgun') {
            chance = 1;
        } else if (weaponType === 'assault_rifle' || weaponType === 'sniper') {
            chance = 0.5;
        } else if (weaponType === 'melee_stab' || weaponType === 'melee_cleave') {
            chance = 0.25;
        }

        if (chance <= 0 || Math.random() >= chance) return null;
        return elements[Math.floor(Math.random() * elements.length)];
    }

    constructor(itemData, isPlayerOwned = true) {
        this.isPlayerOwned = isPlayerOwned;
        this.itemData = itemData;
        
        // Default values
        this.baseDamage = 25;
        this.baseCooldown = 0.3;
        this.projectileSpeed = 600;
        this.lifetime = 1.5;
        this.weaponType = itemData ? (itemData.weaponType || 'pistol') : 'pistol';
        this.spread = 0;
        this.projectileCount = 1;
        this.element = itemData ? (itemData.element || null) : null;
        this.elementConfig = Weapon.getElementConfig(this.element);
        this.projectileColor = this.elementConfig ? this.elementConfig.color : (this.isPlayerOwned ? '#ffff00' : '#ff3333');
        this.weaponVariant = itemData ? (itemData.weaponVariant || null) : null;
        this.attackName = 'Magic Bolt';
        this.isArcane = this.element === 'arcane';
        this.chargeTimer = 0;
        this.isCharging = false;
        this.maxChargeDuration = this.elementConfig && this.elementConfig.maxChargeDuration ? this.elementConfig.maxChargeDuration : 3.0;
        this.maxChargeMultiplier = this.elementConfig && this.elementConfig.maxChargeMultiplier ? this.elementConfig.maxChargeMultiplier : 1.5;

        // Configure based on weaponType
        switch(this.weaponType) {
            case 'pistol':
                this.attackName = 'Wand Bolt';
                this.baseDamage = 20;
                this.baseCooldown = 0.4;
                this.projectileSpeed = 700;
                this.lifetime = 1.0;
                this.projectileCount = 1;
                break;
            case 'shotgun':
                this.attackName = 'Staff Burst';
                this.baseDamage = 15; // per pellet
                this.baseCooldown = 1.0;
                this.projectileSpeed = 600;
                this.lifetime = 0.4;
                this.projectileCount = 5;
                this.spread = 0.4; // radians total spread
                break;
            case 'assault_rifle':
                this.attackName = 'Spellslinger Volley';
                this.baseDamage = 12;
                this.baseCooldown = 0.15;
                this.projectileSpeed = 800;
                this.lifetime = 1.0;
                this.projectileCount = 1;
                this.spread = 0.1;
                break;
            case 'sniper':
                this.attackName = 'Runic Longshot';
                this.baseDamage = 80;
                this.baseCooldown = 1.5;
                this.projectileSpeed = 1500;
                this.lifetime = 2.0;
                this.projectileCount = 1;
                break;
            case 'melee_stab':
                this.attackName = 'Blade Thrust';
                this.baseDamage = 35;
                this.baseCooldown = 0.5;
                this.projectileSpeed = 400;
                this.lifetime = 0.15; // very short range
                this.projectileCount = 1;
                break;
            case 'melee_cleave':
                this.attackName = 'Heavy Cleave';
                this.baseDamage = 30;
                this.baseCooldown = 0.8;
                this.projectileSpeed = 300;
                this.lifetime = 0.2;
                this.projectileCount = 3;
                this.spread = 0.8;
                break;
        }

        // Melee damage bonus - reward for close range risk (player only)
        this.meleeDamageMultiplier = 1.0;
        if (this.isPlayerOwned && (this.weaponType === 'melee_stab' || this.weaponType === 'melee_cleave')) {
            this.meleeDamageMultiplier = 1.25;
        }

        // Sub-type specific overrides (Rapier, Lance, etc.)
        this.hasLunge = false;
        this.lungeMultiplier = 1.0;
        this.movementSpeedBonus = 0;

        if (this.weaponType === 'melee_stab') {
            this.hasLunge = true; // Default for stabs
            if (this.itemData && this.itemData.name) {
                const name = this.itemData.name.toLowerCase();
                if (name.includes('rapier')) {
                    this.hasLunge = false;
                    this.baseCooldown = 0.3;
                    this.movementSpeedBonus = 40;
                } else if (name.includes('lance')) {
                    this.lungeMultiplier = 1.25;
                }
            }
        }

        this.damage = this.baseDamage;
        this.cooldown = this.baseCooldown;
        this.cooldownTimer = 0;
    }

    setElement(element) {
        this.element = element || null;
        this.elementConfig = Weapon.getElementConfig(this.element);
        this.projectileColor = this.elementConfig ? this.elementConfig.color : (this.isPlayerOwned ? '#ffff00' : '#ff3333');
        this.isArcane = this.element === 'arcane';
        this.maxChargeDuration = this.elementConfig && this.elementConfig.maxChargeDuration ? this.elementConfig.maxChargeDuration : 3.0;
        this.maxChargeMultiplier = this.elementConfig && this.elementConfig.maxChargeMultiplier ? this.elementConfig.maxChargeMultiplier : 1.5;
    }

    update(dt) {
        if (this.cooldownTimer > 0) {
            this.cooldownTimer -= dt;
        }

        if (this.isCharging) {
            this.chargeTimer = Math.min(this.maxChargeDuration, this.chargeTimer + dt);
        }
    }

    startCharge() {
        if (!this.isArcane || this.cooldownTimer > 0) return false;
        if (!this.isCharging) {
            this.isCharging = true;
            this.chargeTimer = 0;
        }
        return true;
    }

    isFullyCharged() {
        return this.isCharging && this.chargeTimer >= this.maxChargeDuration;
    }

    getChargeMultiplier() {
        if (!this.isArcane) return 1;
        const chargeRatio = Math.max(0, Math.min(1, this.chargeTimer / this.maxChargeDuration));
        return 1 + (this.maxChargeMultiplier - 1) * chargeRatio;
    }

    releaseChargedAttack(x, y, angle) {
        if (!this.isArcane || !this.isCharging) return null;
        const chargeMultiplier = this.getChargeMultiplier();
        this.isCharging = false;
        this.chargeTimer = 0;
        return this.attack(x, y, angle, { chargeMultiplier });
    }

    attack(x, y, angle, options = {}) {
        if (this.cooldownTimer <= 0) {
            this.cooldownTimer = this.cooldown;
            const projectiles = [];
            const chargeMultiplier = options.chargeMultiplier || 1;
            const projectileOptions = {
                element: this.element,
                color: this.projectileColor,
                chargeMultiplier: chargeMultiplier,
                weaponVariant: this.weaponVariant,
                attackName: this.attackName,
                staggerDuration: this.weaponVariant === 'overcharged' ? 0.45 : 0
            };
            
            if (this.projectileCount === 1) {
                const spawnX = x + Math.cos(angle) * 15;
                const spawnY = y + Math.sin(angle) * 15;
                // Add slight inaccuracy if spread > 0
                const finalAngle = angle + (Math.random() * this.spread - this.spread/2);
                projectiles.push(new Projectile(spawnX, spawnY, finalAngle, this.projectileSpeed, this.damage * this.meleeDamageMultiplier * chargeMultiplier, this.lifetime, this.isPlayerOwned, this.weaponType, projectileOptions));
            } else {
                const startAngle = angle - this.spread / 2;
                const angleStep = this.projectileCount > 1 ? this.spread / (this.projectileCount - 1) : 0;
                
                for (let i = 0; i < this.projectileCount; i++) {
                    const a = startAngle + (angleStep * i);
                    const spawnX = x + Math.cos(a) * 15;
                    const spawnY = y + Math.sin(a) * 15;
                    projectiles.push(new Projectile(spawnX, spawnY, a, this.projectileSpeed * (0.9 + Math.random()*0.2), this.damage * this.meleeDamageMultiplier * chargeMultiplier, this.lifetime * (0.9 + Math.random()*0.2), this.isPlayerOwned, this.weaponType, projectileOptions));
                }
            }
            
            return projectiles;
        }
        return null; // On cooldown
    }
}
