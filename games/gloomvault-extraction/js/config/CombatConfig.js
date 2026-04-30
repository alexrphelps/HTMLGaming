const CombatConfig = {
    // Armor constant for damage mitigation formula
    // Damage = RawDamage * (armorConstant / (armorConstant + Armor))
    armorConstant: 100,

    // Hard caps for stats
    caps: {
        damageReduction: 0.75, // 75% max damage reduction
        dodgeCooldownReduction: 0.60, // 60% max dodge cooldown reduction
        lifesteal: 0.20 // 20% max lifesteal
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
