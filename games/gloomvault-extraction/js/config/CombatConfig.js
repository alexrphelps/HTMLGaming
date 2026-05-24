const CombatConfig = {
    // Armor constant for damage mitigation formula
    // Damage = RawDamage * (armorConstant / (armorConstant + Armor))
    armorConstant: 100,

    // Hard caps for stats
    caps: {
        damageReduction: 0.75, // 75% max damage reduction
        dodgeCooldownReduction: 0.60, // 60% max dodge cooldown reduction
        lifesteal: 0.35 // 35% max lifesteal
    },

    elemental: {
        frost: { color: '#8fdcff', duration: 2.5, slowMultiplier: 0.55 },
        fire: { color: '#ff4b22', duration: 5.0, damagePerSecond: 5 },
        felfire: { color: '#67ff3a', duration: 2.0, damagePerSecond: 3, maxStacks: 5 },
        holy: { color: '#fff2a6', duration: 6.0, burstRadius: 340, burstDamage: 18 },
        shadow: { color: '#8f2cff', duration: 4.0, damageTakenMultiplier: 1.25 },
        poison: { color: '#1f8f38', duration: 5.0, damagePerSecond: 4, burstRadius: 145, burstDamage: 10 },
        arcane: { color: '#c99cff', maxChargeDuration: 3.0, maxChargeMultiplier: 1.5 }
    },

    // Calculate final damage taken
    calculateDamageTaken: function(rawDamage, armor, damageReduction) {
        // Apply armor mitigation
        const armorMitigation = this.armorConstant / (this.armorConstant + Math.max(0, armor));
        let mitigatedDamage = rawDamage * armorMitigation;

        // Apply flat percentage damage reduction (capped)
        const cappedDR = Math.min(this.caps.damageReduction, Math.max(0, damageReduction));
        mitigatedDamage = mitigatedDamage * (1 - cappedDR);

        return Math.max(0, mitigatedDamage); // Ensure we don't heal from damage
    }
};
