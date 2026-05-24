// UpgradeConfig.js
const UpgradeConfig = {
    maxUpgrades: 5,
    statBoostPerLevel: 0.10, // 10%
    costs: {
        Common: { base: 10, increment: 10 },
        Uncommon: { base: 25, increment: 15 },
        Epic: { base: 50, increment: 20 },
        Legendary: { base: 100, increment: 50 }
    }
};
