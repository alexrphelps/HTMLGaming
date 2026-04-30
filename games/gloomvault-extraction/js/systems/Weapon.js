class Weapon {
    constructor(isPlayerOwned = true) {
        this.isPlayerOwned = isPlayerOwned;
        this.baseDamage = 25;
        this.damage = 25;
        this.baseCooldown = 0.3; // seconds between attacks
        this.cooldown = 0.3;
        
        // Secondary ability
        this.baseSecondaryCooldown = 2.0;
        this.secondaryCooldown = 2.0;
        this.secondaryCooldownTimer = 0;
        
        this.projectileSpeed = 600; // pixels per second
        this.lifetime = 1.5; // seconds before projectile fizzles
        this.cooldownTimer = 0;
    }

    update(dt) {
        if (this.cooldownTimer > 0) {
            this.cooldownTimer -= dt;
        }
        if (this.secondaryCooldownTimer > 0) {
            this.secondaryCooldownTimer -= dt;
        }
    }

    primaryAttack(x, y, angle) {
        if (this.cooldownTimer <= 0) {
            this.cooldownTimer = this.cooldown;
            // Spawn a new projectile slightly in front of the player
            const spawnX = x + Math.cos(angle) * 15;
            const spawnY = y + Math.sin(angle) * 15;
            return [new Projectile(spawnX, spawnY, angle, this.projectileSpeed, this.damage, this.lifetime, this.isPlayerOwned)];
        }
        return null; // On cooldown
    }
    
    secondaryAttack(x, y, angle) {
        if (this.secondaryCooldownTimer <= 0) {
            this.secondaryCooldownTimer = this.secondaryCooldown;
            
            // Default secondary attack: shotgun spread (3 projectiles)
            const projectiles = [];
            const spread = 0.25; // radians
            const angles = [angle - spread, angle, angle + spread];
            
            for (let a of angles) {
                const spawnX = x + Math.cos(a) * 15;
                const spawnY = y + Math.sin(a) * 15;
                // Secondary attack does 70% damage per projectile but shoots 3
                projectiles.push(new Projectile(spawnX, spawnY, a, this.projectileSpeed * 0.9, this.damage * 0.7, this.lifetime * 0.8, this.isPlayerOwned));
            }
            
            return projectiles;
        }
        return null; // On cooldown
    }
}
