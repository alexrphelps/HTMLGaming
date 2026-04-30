// UpgradeSystem.js
class UpgradeSystem {
    static getUpgradeCost(item) {
        if (!item || item.upgradeLevel === undefined || item.upgradeLevel >= UpgradeConfig.maxUpgrades) return null;
        const rarityConfig = UpgradeConfig.costs[item.rarity];
        if (!rarityConfig) return null;
        return rarityConfig.base + (rarityConfig.increment * item.upgradeLevel);
    }

    static getSalvageValue(item) {
        if (item && item.isStarter) return 0;
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

        // Upgrade trinket active ability
        if (item.activeAbility) {
            this.upgradeAbility(item.activeAbility);
        }

        // Update name to reflect upgrade
        if (!item.name.includes('+')) {
            item.name = `${item.name} +${item.upgradeLevel}`;
        } else {
            item.name = item.name.replace(/\+\d+/, `+${item.upgradeLevel}`);
        }

        return { success: true, remainingScraps: availableScraps - cost };
    }

    static upgradeAbility(ability) {
        switch (ability.type) {
            case 'heal':
                ability.value += 10;
                ability.text = `Use to heal ${ability.value} HP (${ability.cooldown}s CD)`;
                break;
            case 'nova':
                ability.damage += 5;
                ability.projectiles = (ability.projectiles || 8) + 1;
                ability.text = `Fires ${ability.projectiles} projectiles around you (${ability.cooldown}s CD)`;
                break;
            case 'dash':
                ability.speed += 50;
                ability.text = `A swift directional dash at ${ability.speed} speed (${ability.cooldown}s CD)`;
                break;
        }
    }

    static simulateUpgrade(item) {
        if (!item || item.upgradeLevel >= UpgradeConfig.maxUpgrades) return null;
        
        // Deep clone
        const simulated = JSON.parse(JSON.stringify(item));
        
        // Apply one upgrade level logic manually to avoid modifying original
        simulated.upgradeLevel = (simulated.upgradeLevel || 0) + 1;
        const multiplier = 1 + UpgradeConfig.statBoostPerLevel;
        
        simulated.gearScore = Math.round(simulated.gearScore * multiplier);
        
        for (let mod of simulated.modifiers) {
            mod.value = Math.round(mod.value * multiplier);
            mod.text = `+${mod.value}${mod.type === 'percent' ? '%' : ''} ${mod.name}`;
        }

        if (simulated.activeAbility) {
            this.upgradeAbility(simulated.activeAbility);
        }

        if (!simulated.name.includes('+')) {
            simulated.name = `${simulated.name} +${simulated.upgradeLevel}`;
        } else {
            simulated.name = simulated.name.replace(/\+\d+/, `+${simulated.upgradeLevel}`);
        }

        return simulated;
    }
}
