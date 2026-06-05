const EquipmentStatsService = {
    baseStats: {
        maxHp: 100,
        maxShield: 0,
        shieldRegen: 0,
        speed: 200,
        damageMultiplier: 1.0,
        attackSpeedMultiplier: 1.0,
        movementSpeedMultiplier: 1.0,
        flatDamage: 0,
        lifesteal: 0,
        lifestealCapBonus: 0,
        cooldownReduction: 0,
        armor: 0,
        damageReduction: 0,
        thorns: 0,
        dodgeCooldownMultiplier: 1.0,
        canDodge: 1,
        maxHpMultiplier: 1.0,
        armorMultiplier: 1.0
    },

    cloneBaseStats(overrides = {}) {
        return { ...this.baseStats, ...overrides };
    },

    isBroken(item) {
        return Boolean(item && item.maxDurability !== undefined && item.durability <= 0);
    },

    applyModifiers(stats, equipment = {}) {
        for (const slot in equipment) {
            const item = equipment[slot];
            if (!item || !item.modifiers || this.isBroken(item)) continue;
            for (const mod of item.modifiers) {
                if (stats[mod.stat] === undefined) continue;
                if (mod.type === 'percent' || mod.type === 'percent_penalty') {
                    stats[mod.stat] += mod.value / 100;
                } else if (mod.type === 'flat') {
                    stats[mod.stat] += mod.value;
                }
            }
        }
        return stats;
    },

    createWeapon(item, isPlayerWeapon = false) {
        if (!item || this.isBroken(item) || typeof Weapon === 'undefined') return null;
        return new Weapon(item, isPlayerWeapon);
    },

    projectEquipment(equipment = {}, options = {}) {
        const stats = this.applyModifiers(this.cloneBaseStats(options.baseStats), equipment);
        const healingWellMaxHpBonus = options.healingWellMaxHpBonus || 0;
        stats.maxHp = stats.maxHp * (stats.maxHpMultiplier + healingWellMaxHpBonus);
        stats.armor = stats.armor * stats.armorMultiplier;

        const weapon1 = this.createWeapon(equipment.weapon, options.isPlayerWeapon === true);
        const weapon2 = this.createWeapon(equipment.weapon2, options.isPlayerWeapon === true);
        let weaponSpeedBonus = 0;

        for (const weapon of [weapon1, weapon2]) {
            if (!weapon) continue;
            weapon.damage = Math.round(weapon.baseDamage * stats.damageMultiplier + stats.flatDamage);
            weapon.cooldown = weapon.baseCooldown / stats.attackSpeedMultiplier;
            weaponSpeedBonus += weapon.movementSpeedBonus || 0;
        }

        const speed = stats.speed * stats.movementSpeedMultiplier + weaponSpeedBonus;
        const gearScore = typeof EquipmentService !== 'undefined' && EquipmentService.calculateGearScore
            ? EquipmentService.calculateGearScore(equipment)
            : Object.keys(equipment || {}).reduce((total, slot) => total + (equipment[slot] && equipment[slot].gearScore ? equipment[slot].gearScore : 0), 0);

        const lifestealCap = (typeof CombatConfig !== 'undefined' && CombatConfig.caps ? CombatConfig.caps.lifesteal : 0.35) + (stats.lifestealCapBonus || 0);
        const totalLifesteal = stats.lifesteal || 0;
        const effectiveLifesteal = Math.min(totalLifesteal, lifestealCap);

        return {
            stats,
            weapon1,
            weapon2,
            speed,
            gearScore,
            lifestealCap,
            totalLifesteal,
            effectiveLifesteal,
            dodgeCooldown: (options.baseDodgeCooldown || 1.0) * Math.max(0.2, stats.dodgeCooldownMultiplier || 1.0)
        };
    },

    projectPlayer(player) {
        if (!player) return null;
        const weapon1 = player.weapon1 || null;
        const weapon2 = player.weapon2 || null;
        const stats = player.stats || this.cloneBaseStats();
        const lifestealCap = (typeof CombatConfig !== 'undefined' && CombatConfig.caps ? CombatConfig.caps.lifesteal : 0.35) + (stats.lifestealCapBonus || 0);
        const totalLifesteal = stats.lifesteal || 0;
        return {
            stats,
            weapon1,
            weapon2,
            speed: player.speed || stats.speed,
            gearScore: typeof EquipmentService !== 'undefined' && EquipmentService.calculateGearScore
                ? EquipmentService.calculateGearScore(player.equipment)
                : 0,
            lifestealCap,
            totalLifesteal,
            effectiveLifesteal: Math.min(totalLifesteal, lifestealCap),
            dodgeCooldown: (player.dodgeCooldown || 1.0) * Math.max(0.2, stats.dodgeCooldownMultiplier || 1.0)
        };
    },

    formatLifesteal(projection) {
        if (!projection) return '0%';
        const effective = Math.round((projection.effectiveLifesteal || 0) * 100);
        const total = Math.round((projection.totalLifesteal || 0) * 100);
        const cap = Math.round((projection.lifestealCap || 0) * 100);
        return total > cap ? `${effective}% (${total}%)` : `${effective}%`;
    }
};

if (typeof window !== 'undefined') {
    window.EquipmentStatsService = EquipmentStatsService;
}
