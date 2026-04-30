// UpgradeSystem.js
class UpgradeSystem {
    static getUpgradeCost(item) {
        if (!item || item.upgradeLevel === undefined || item.upgradeLevel >= UpgradeConfig.maxUpgrades) return null;
        const rarityConfig = UpgradeConfig.costs[item.rarity];
        if (!rarityConfig) return null;
        return rarityConfig.base + (rarityConfig.increment * item.upgradeLevel);
    }

    static getSalvageValue(item) {
        if (!item) return 0;
        const rarityConfig = UpgradeConfig.costs[item.rarity];
        if (!rarityConfig) return 1;
        // Base salvage value is half the base cost + fraction of upgrades
        return Math.max(1, Math.floor(rarityConfig.base / 2) + ((item.upgradeLevel || 0) * Math.floor(rarityConfig.increment / 2)));
    }

    static upgradeItem(item, availableScraps) {
        const cost = this.getUpgradeCost(item);
        if (cost === null || availableScraps < cost) return { success: false, remainingScraps: availableScraps };

        item.upgradeLevel = (item.upgradeLevel || 0) + 1;
        const multiplier = 1 + UpgradeConfig.statBoostPerLevel;
        
        // Multiply base values
        item.gearScore = Math.round(item.gearScore * multiplier);
        
        for (let mod of item.modifiers) {
            mod.value = Math.round(mod.value * multiplier);
            mod.text = `+${mod.value}${mod.type === 'percent' ? '%' : ''} ${mod.name}`;
        }

        // Update name to reflect upgrade
        if (!item.name.includes('+')) {
            item.name = `${item.name} +${item.upgradeLevel}`;
        } else {
            item.name = item.name.replace(/\+\d+/, `+${item.upgradeLevel}`);
        }

        return { success: true, remainingScraps: availableScraps - cost };
    }
}
