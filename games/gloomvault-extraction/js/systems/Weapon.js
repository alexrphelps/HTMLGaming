class Weapon {
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

        // Configure based on weaponType
        switch(this.weaponType) {
            case 'pistol':
                this.baseDamage = 20;
                this.baseCooldown = 0.4;
                this.projectileSpeed = 700;
                this.lifetime = 1.0;
                this.projectileCount = 1;
                break;
            case 'shotgun':
                this.baseDamage = 15; // per pellet
                this.baseCooldown = 1.0;
                this.projectileSpeed = 600;
                this.lifetime = 0.4;
                this.projectileCount = 5;
                this.spread = 0.4; // radians total spread
                break;
            case 'assault_rifle':
                this.baseDamage = 12;
                this.baseCooldown = 0.15;
                this.projectileSpeed = 800;
                this.lifetime = 1.0;
                this.projectileCount = 1;
                this.spread = 0.1;
                break;
            case 'sniper':
                this.baseDamage = 80;
                this.baseCooldown = 1.5;
                this.projectileSpeed = 1500;
                this.lifetime = 2.0;
                this.projectileCount = 1;
                break;
            case 'melee_stab':
                this.baseDamage = 35;
                this.baseCooldown = 0.5;
                this.projectileSpeed = 400;
                this.lifetime = 0.15; // very short range
                this.projectileCount = 1;
                break;
            case 'melee_cleave':
                this.baseDamage = 30;
                this.baseCooldown = 0.8;
                this.projectileSpeed = 300;
                this.lifetime = 0.2;
                this.projectileCount = 3;
                this.spread = 0.8;
                break;
        }

        this.damage = this.baseDamage;
        this.cooldown = this.baseCooldown;
        this.cooldownTimer = 0;
    }

    update(dt) {
        if (this.cooldownTimer > 0) {
            this.cooldownTimer -= dt;
        }
    }

    attack(x, y, angle) {
        if (this.cooldownTimer <= 0) {
            this.cooldownTimer = this.cooldown;
            const projectiles = [];
            
            if (this.projectileCount === 1) {
                const spawnX = x + Math.cos(angle) * 15;
                const spawnY = y + Math.sin(angle) * 15;
                // Add slight inaccuracy if spread > 0
                const finalAngle = angle + (Math.random() * this.spread - this.spread/2);
                projectiles.push(new Projectile(spawnX, spawnY, finalAngle, this.projectileSpeed, this.damage, this.lifetime, this.isPlayerOwned, this.weaponType));
            } else {
                const startAngle = angle - this.spread / 2;
                const angleStep = this.projectileCount > 1 ? this.spread / (this.projectileCount - 1) : 0;
                
                for (let i = 0; i < this.projectileCount; i++) {
                    const a = startAngle + (angleStep * i);
                    const spawnX = x + Math.cos(a) * 15;
                    const spawnY = y + Math.sin(a) * 15;
                    projectiles.push(new Projectile(spawnX, spawnY, a, this.projectileSpeed * (0.9 + Math.random()*0.2), this.damage, this.lifetime * (0.9 + Math.random()*0.2), this.isPlayerOwned, this.weaponType));
                }
            }
            
            return projectiles;
        }
        return null; // On cooldown
    }
}
