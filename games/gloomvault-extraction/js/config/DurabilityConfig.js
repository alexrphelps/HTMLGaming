// DurabilityConfig.js - All durability-related formulas and constants
const DurabilityConfig = {
    // Base durability by slot (chest/pants higher than helm/boots)
    baseBySlot: {
        helm: 80,
        chest: 120,
        pants: 100,
        boots: 80,
        weapon: 100
        // trinkets excluded - no durability
    },

    // Rarity multiplier on base durability
    rarityMultiplier: {
        Common: 1.0,
        Epic: 1.3,
        Legendary: 1.6
    },

    // Additional durability from gear score: + floor(gearScore * gsScaling)
    gsScaling: 0.1,

    // Random variance: final value +/- randomRange (e.g. 0.15 = +/-15%)
    randomRange: 0.15,

    // Armor degradation formula (when player takes damage):
    // baseDeg = 1 + floor(damageTaken / damagePerDegPoint)
    // armorReduction = item.baseArmor * armorReductionFactor
    // rarityReduction = rarityDegradeReduction[rarity]
    // finalDeg = max(1, floor(baseDeg * (1 - armorReduction - rarityReduction)))
    armor: {
        damagePerDegPoint: 25,
        armorReductionFactor: 0.01,
        rarityDegradeReduction: {
            Common: 0,
            Epic: 0.15,
            Legendary: 0.30
        }
    },

    // Weapon degradation: amount per attack fired (0.05 = lasts 20x longer)
    weapon: {
        degradePerAttack: 0.05
    },

    // Repair costs based on Gear Score: Math.max(minCostPerPoint, (gearScore * baseCostMultiplier)) * rarityMultiplier
    repairCosts: {
        baseCostMultiplier: 0.02,
        minCostPerPoint: 0.1,
        Common: { multiplier: 1 },
        Epic: { multiplier: 2 },
        Legendary: { multiplier: 3 }
    },

    // UI thresholds (as fraction of maxDurability)
    thresholds: {
        low: 0.25,
        critical: 0.10
    }
};
