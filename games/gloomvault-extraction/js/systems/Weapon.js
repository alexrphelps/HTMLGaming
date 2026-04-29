class Weapon {
    constructor() {
        this.damage = 25;
        this.attackSpeed = 0.3; // seconds between attacks (cooldown)
        this.projectileSpeed = 600; // pixels per second
        this.lifetime = 1.5; // seconds before projectile fizzles
        this.cooldownTimer = 0;
    }

    update(dt) {
        if (this.cooldownTimer > 0) {
            this.cooldownTimer -= dt;
        }
    }

    primaryAttack(x, y, angle) {
        if (this.cooldownTimer <= 0) {
            this.cooldownTimer = this.attackSpeed;
            // Spawn a new projectile slightly in front of the player
            const spawnX = x + Math.cos(angle) * 15;
            const spawnY = y + Math.sin(angle) * 15;
            return new Projectile(spawnX, spawnY, angle, this.projectileSpeed, this.damage, this.lifetime);
        }
        return null; // On cooldown
    }
}
