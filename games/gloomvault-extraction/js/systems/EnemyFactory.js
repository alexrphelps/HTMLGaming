const EnemyFactory = {
    baseStats: {
        grunt: { width: 30, height: 30, hp: 50, speed: 100, color: '#ff0000', weaponType: 'melee_stab', weaponCooldown: 1.0, weaponDamage: 10 },
        brown_grunt: { width: 30, height: 30, hp: 60, speed: 100, color: '#b39b54', weaponType: 'melee_stab', weaponCooldown: 1.0, weaponDamage: 10 },
        ranged: { width: 30, height: 30, hp: 30, speed: 80, color: '#ff8800', weaponType: 'pistol', weaponCooldown: 1.5, weaponDamage: 15, projectileSpeed: 300 },
        brute: { width: 40, height: 40, hp: 150, speed: 60, color: '#880000', weaponType: 'melee_cleave', weaponCooldown: 2.0, weaponDamage: 40 },
        boss: { width: 72, height: 72, hp: 500, speed: 55, color: '#4b0f0f', weaponType: 'melee_cleave', weaponCooldown: 1.6, weaponDamage: 55 }
    },

    getStats(type, bossStats = null, hpMultiplier = 1) {
        const base = { ...(this.baseStats[type] || this.baseStats.grunt) };
        if (bossStats) {
            ['hp', 'speed', 'width', 'height'].forEach(key => {
                if (bossStats[key] !== undefined) base[key] = bossStats[key];
            });
            if (bossStats.color) base.color = bossStats.color;
        }
        base.hp = Math.floor(base.hp * hpMultiplier);
        return base;
    },

    createWeapon(type, stats, damageMultiplier) {
        if (!stats || !stats.weaponType || typeof Weapon === 'undefined') return null;

        const weapon = new Weapon({ weaponType: stats.weaponType }, false);
        weapon.baseCooldown = stats.weaponCooldown;
        weapon.cooldown = stats.weaponCooldown;
        weapon.baseDamage = Math.floor(stats.weaponDamage * damageMultiplier);
        weapon.damage = weapon.baseDamage;
        if (stats.projectileSpeed !== undefined) weapon.projectileSpeed = stats.projectileSpeed;
        return weapon;
    },

    applyBossWeaponStats(weapon, bossStats, damageMultiplier) {
        if (!weapon || !bossStats) return weapon;
        let nextWeapon = weapon;

        if (bossStats.weaponType && typeof Weapon !== 'undefined') {
            nextWeapon = new Weapon({ weaponType: bossStats.weaponType }, false);
        }
        if (bossStats.weaponCooldown !== undefined) {
            nextWeapon.baseCooldown = bossStats.weaponCooldown;
            nextWeapon.cooldown = bossStats.weaponCooldown;
        }
        if (bossStats.weaponDamage !== undefined) {
            nextWeapon.baseDamage = Math.floor(bossStats.weaponDamage * damageMultiplier);
            nextWeapon.damage = nextWeapon.baseDamage;
        }
        if (bossStats.projectileSpeed !== undefined) nextWeapon.projectileSpeed = bossStats.projectileSpeed;
        if (bossStats.projectileCount !== undefined) nextWeapon.projectileCount = bossStats.projectileCount;
        if (bossStats.spread !== undefined) nextWeapon.spread = bossStats.spread;
        return nextWeapon;
    }
};

if (typeof window !== 'undefined') {
    window.EnemyFactory = EnemyFactory;
}
