class LootGen {
    constructor() {
        this.itemIdCounter = 0;
        
        this.rarities = [
            { name: 'Common', weight: 70, color: '#a0a0a0', statCount: 1 },
            { name: 'Uncommon', weight: 20, color: '#1eff00', statCount: 2 },
            { name: 'Epic', weight: 8, color: '#a335ee', statCount: 3 },
            { name: 'Legendary', weight: 2, color: '#ff8000', statCount: 4 }
        ];

        this.rarityTables = [
            { minFloor: 1, maxFloor: 2, weights: { Common: 78, Uncommon: 20, Epic: 2, Legendary: 0 } },
            { minFloor: 3, maxFloor: 4, weights: { Common: 62, Uncommon: 30, Epic: 8, Legendary: 0 } },
            { minFloor: 5, maxFloor: 7, weights: { Common: 45, Uncommon: 38, Epic: 15, Legendary: 2 } },
            { minFloor: 8, maxFloor: Infinity, weights: { Common: 30, Uncommon: 42, Epic: 23, Legendary: 5 } }
        ];

        this.types = [
            { name: 'Helm', slot: 'helm' },
            { name: 'Chest', slot: 'chest' },
            { name: 'Pants', slot: 'pants' },
            { name: 'Boots', slot: 'boots' },
            { name: 'Weapon', slot: 'weapon' },
            { name: 'Trinket', slot: 'trinket' }
        ];

        this.weaponSubTypes = [
            { id: 'pistol', names: ['Wand'] },
            { id: 'shotgun', names: ['Staff'] },
            { id: 'assault_rifle', names: ['Crossbow'] },
            { id: 'sniper', names: ['Longbow'] },
            { id: 'melee_stab', names: ['Shortsword', 'Lance'] },
            { id: 'melee_cleave', names: ['Greataxe', 'Scythe'] }
        ];

        this.elements = [
            { id: 'frost', name: 'Frost' },
            { id: 'fire', name: 'Fire' },
            { id: 'felfire', name: 'Felfire' },
            { id: 'holy', name: 'Holy' },
            { id: 'shadow', name: 'Shadow' },
            { id: 'poison', name: 'Poison' },
            { id: 'arcane', name: 'Arcane' }
        ];
        
        this.trinketAbilities = [
            { type: 'heal', value: 50, cooldown: 15, name: 'Healing Surge', text: 'Use to heal 50 HP (15s CD)' },
            { type: 'nova', damage: 40, projectiles: 8, cooldown: 8, name: 'Arcane Nova', text: 'Fires 8 projectiles around you (8s CD)' },
            { type: 'dash', speed: 800, time: 0.3, cooldown: 5, name: 'Phase Shift', text: 'A swift directional dash at 800 speed (5s CD)' },
            { type: 'hot', value: 25, duration: 15, cooldown: 20, name: 'Regeneration Potion', text: 'Restores 25 HP over 15 seconds (20s CD)' },
            { type: 'scout', revealRadius: 22, cooldown: 60, name: 'Scout Charm', text: 'Reveals a wide area of the minimap (60s CD)' },
            { type: 'phase_tether', minTiles: 5, maxTiles: 10, cooldown: 12, name: 'Phase Tether', text: 'Blink 5-10 tiles toward your aim, resolving to safe floor (12s CD)' },
            { type: 'element_bomb', element: 'poison', damage: 18, range: 420, radius: 120, cloudDuration: 3, cooldown: 14, name: 'Poison Bomb', text: 'Throws a poison bomb that leaves a sickness cloud (14s CD)' },
            { type: 'element_bomb', element: 'fire', damage: 20, range: 420, radius: 120, cloudDuration: 3, cooldown: 14, name: 'Fire Bomb', text: 'Throws a fire bomb that leaves a burning cloud (14s CD)' },
            { type: 'element_bomb', element: 'felfire', damage: 16, range: 420, radius: 120, cloudDuration: 3, cooldown: 14, name: 'Felfire Bomb', text: 'Throws a felfire bomb that leaves a stacking burn cloud (14s CD)' },
            { type: 'lightning_strike', damage: 48, chains: 3, chainRange: 280, falloff: 0.65, cooldown: 18, name: 'Lightning Strike', text: 'Strikes the nearest enemy and chains up to 3 times (18s CD)' },
            { type: 'target_dummy', duration: 4, radius: 520, cooldown: 24, name: 'Target Dummy', text: 'Drops a decoy for 4 seconds that draws enemy aggro (24s CD)' },
            { type: 'soul_siphon', lifesteal: 0.45, duration: 4, cooldown: 26, name: 'Soul Siphon', text: 'Gain 45% lifesteal for 4 seconds (26s CD)' }
        ];

        this.trinketNames = {
            heal: 'Healing Charm',
            nova: 'Arcane Nova Sigil',
            dash: 'Phase Shift Talisman',
            hot: 'Regeneration Relic',
            scout: 'Scout Charm',
            phase_tether: 'Phase Tether',
            element_bomb: 'Bomb Satchel',
            lightning_strike: 'Lightning Rod',
            target_dummy: 'Decoy Idol',
            soul_siphon: 'Soul Siphon'
        };
    }

    rollElementForWeaponType(weaponType) {
        let chance = 0;
        if (weaponType === 'pistol' || weaponType === 'shotgun') {
            chance = 1;
        } else if (weaponType === 'assault_rifle' || weaponType === 'sniper') {
            chance = 0.5;
        } else if (weaponType === 'melee_stab' || weaponType === 'melee_cleave') {
            chance = 0.25;
        }

        if (chance <= 0 || Math.random() >= chance) return null;
        return this.elements[Math.floor(Math.random() * this.elements.length)];
    }

    getRarityTableForFloor(floor) {
        const safeFloor = Math.max(1, floor || 1);
        return this.rarityTables.find(table => safeFloor >= table.minFloor && safeFloor <= table.maxFloor) || this.rarityTables[0];
    }

    rollRarity(floor = 1) {
        const table = this.getRarityTableForFloor(floor);
        const totalWeight = this.rarities.reduce((total, rarity) => total + (table.weights[rarity.name] || 0), 0);
        if (totalWeight <= 0) return this.rarities[0];

        const roll = Math.random() * totalWeight;
        let cumulative = 0;
        for (const rarity of this.rarities) {
            cumulative += table.weights[rarity.name] || 0;
            if (roll <= cumulative) return rarity;
        }
        return this.rarities[0];
    }

    rollType() {
        return this.types[Math.floor(Math.random() * this.types.length)];
    }

    getFloorPower(floor) {
        const safeFloor = Math.max(1, floor || 1);
        return 1 + ((safeFloor - 1) * 0.12) + (Math.floor((safeFloor - 1) / 3) * 0.04);
    }

    createModFromTemplate(template, floorPower = 1.0, isImplicit = false, floor = 1) {
        const scaledMin = Math.max(1, Math.floor(template.range[0] * floorPower));
        const scaledMax = Math.max(scaledMin, Math.floor(template.range[1] * floorPower));
        let modValue = Math.floor(Math.random() * (scaledMax - scaledMin + 1)) + scaledMin;
        if (floor <= 2 && template.earlyCap !== undefined) {
            modValue = Math.min(modValue, template.earlyCap);
        }
        const sign = modValue >= 0 ? '+' : '';
        const symbol = template.type.includes('percent') ? '%' : '';
        return {
            name: template.name,
            stat: template.stat,
            value: modValue,
            type: template.type,
            text: `${sign}${modValue}${symbol} ${template.name}`,
            isImplicit: isImplicit
        };
    }

    calculateBaseArmor(slotConfig, floorPower) {
        if (!slotConfig || slotConfig.baseArmorMultiplier <= 0) return 0;
        return Math.max(1, Math.floor((6 + (floorPower * 2)) * slotConfig.baseArmorMultiplier));
    }

    calculateGearScore(floor, rarity, typeSlot, baseArmor) {
        const safeFloor = Math.max(1, floor || 1);
        const slotBonus = typeSlot === 'weapon' || typeSlot === 'trinket' ? 4 : Math.floor(baseArmor * 0.5);
        return Math.max(1, Math.floor(5 + (safeFloor * 6) + slotBonus + ((rarity.statCount || 1) * 7)));
    }

    getModifierTemplateByStat(stat) {
        if (!stat || stat === 'Random') return null;
        return LootConfig.modifierPool.find(mod => mod.stat === stat) || null;
    }

    rollExplicitModifiers(rarity, floor, forcedStats = []) {
        const floorPower = this.getFloorPower(floor);
        const statCount = rarity.statCount || 1;
        const availableMods = [...LootConfig.modifierPool];
        const modifiers = [];

        for (const stat of forcedStats) {
            if (modifiers.length >= statCount) break;
            const modIndex = availableMods.findIndex(mod => mod.stat === stat);
            if (modIndex === -1) continue;
            const modTemplate = availableMods.splice(modIndex, 1)[0];
            modifiers.push(this.createModFromTemplate(modTemplate, floorPower, false, floor));
        }

        for (let i = 0; i < statCount; i++) {
            if (modifiers.length >= statCount) break;
            if (availableMods.length === 0) break;
            const modIndex = Math.floor(Math.random() * availableMods.length);
            const modTemplate = availableMods.splice(modIndex, 1)[0];
            modifiers.push(this.createModFromTemplate(modTemplate, floorPower, false, floor));
        }

        return modifiers;
    }

    getAffixNameParts(modifiers) {
        const primary = modifiers[0];
        const secondary = modifiers[1];
        const prefixByStat = {
            armor: 'Guarded',
            damageReduction: 'Aegis',
            thorns: 'Bramble',
            damageMultiplier: 'Keen',
            attackSpeedMultiplier: 'Swift',
            flatDamage: 'Forceful',
            lifesteal: 'Vampiric',
            movementSpeedMultiplier: 'Fleet',
            dodgeCooldownMultiplier: 'Nimble',
            cooldownReduction: 'Focused',
            maxHp: 'Stalwart'
        };
        const suffixByStat = {
            armor: 'of Iron',
            damageReduction: 'of Warding',
            thorns: 'of Barbs',
            damageMultiplier: 'of Striking',
            attackSpeedMultiplier: 'of Alacrity',
            flatDamage: 'of Power',
            lifesteal: 'of Hunger',
            movementSpeedMultiplier: 'of the Wind',
            dodgeCooldownMultiplier: 'of Evasion',
            cooldownReduction: 'of Focus',
            maxHp: 'of the Bear'
        };

        return {
            prefix: primary ? (prefixByStat[primary.stat] || '') : '',
            suffix: secondary ? (suffixByStat[secondary.stat] || '') : ''
        };
    }

    buildWeaponName(baseName, elementName, weaponVariant) {
        const parts = [];
        if (elementName) parts.push(elementName);
        if (weaponVariant === 'overcharged') parts.push('Overcharged');
        parts.push(baseName);
        return parts.join(' ');
    }

    buildTrinketName(activeAbility, passiveTrait) {
        const abilityNamedTypes = ['element_bomb', 'target_dummy', 'soul_siphon', 'scout', 'phase_tether', 'lightning_strike'];
        const baseName = abilityNamedTypes.includes(activeAbility?.type)
            ? (activeAbility?.name || 'Trinket')
            : (this.trinketNames[activeAbility?.type] || activeAbility?.name || 'Trinket');
        return passiveTrait ? `${baseName} of ${passiveTrait.name}` : baseName;
    }

    buildItemName(typeSlot, baseName, prefix, suffix, elementName, weaponVariant, activeAbility, passiveTrait) {
        if (typeSlot === 'weapon') {
            return this.buildWeaponName(baseName, elementName, weaponVariant);
        }
        if (typeSlot === 'trinket') {
            return this.buildTrinketName(activeAbility, passiveTrait);
        }

        let name = `${prefix} ${baseName}`.trim();
        if (suffix !== '') {
            name += ` ${suffix}`;
        }
        return name;
    }

    generateItemWithRarityAndType(floor, forcedRarityName, forcedTypeSlot) {
        const rarity = forcedRarityName && forcedRarityName !== 'Random' ? (this.rarities.find(r => r.name === forcedRarityName) || this.rarities[0]) : this.rollRarity(floor);
        return this._generateItemInternal(floor, rarity, forcedTypeSlot);
    }

    generateCustomItem(floor, options = {}) {
        const rarityName = options.rarityName || options.rarity || 'Random';
        const rarity = rarityName && rarityName !== 'Random'
            ? (this.rarities.find(r => r.name === rarityName) || this.rarities[0])
            : this.rollRarity(floor);
        return this._generateItemInternal(floor, rarity, options.typeSlot || 'Random', options);
    }

    generateItem(floor) {
        const rarity = this.rollRarity(floor);
        return this._generateItemInternal(floor, rarity);
    }

    generateGuaranteedRarityItem(floor, minimumRarityName = 'Uncommon', forcedTypeSlot = 'Random') {
        const rarityOrder = ['Common', 'Uncommon', 'Epic', 'Legendary'];
        const minIndex = Math.max(0, rarityOrder.indexOf(minimumRarityName));
        let item = null;
        let attempts = 0;

        do {
            item = this.generateItemWithRarityAndType(floor, 'Random', forcedTypeSlot);
            attempts++;
        } while (item && rarityOrder.indexOf(item.rarity) < minIndex && attempts < 80);

        if (item && rarityOrder.indexOf(item.rarity) >= minIndex) {
            return item;
        }

        const fallbackRarity = rarityOrder[minIndex] || 'Uncommon';
        return this.generateItemWithRarityAndType(floor, fallbackRarity, forcedTypeSlot);
    }

    getChestGuaranteedMinimumRarity(floor) {
        return floor >= 5 ? 'Epic' : 'Uncommon';
    }

    _generateItemInternal(floor, rarity, forcedTypeSlot = null, options = {}) {
        let type = null;
        if (forcedTypeSlot && forcedTypeSlot !== 'Random') {
            type = this.types.find(t => t.slot === forcedTypeSlot);
        }
        if (!type) {
            type = this.rollType();
        }
        const slotConfig = LootConfig.slots[type.slot];
        const effectiveFloor = Math.max(1, floor || 1);
        const floorPower = this.getFloorPower(effectiveFloor);

        const modifiers = [];

        // 1. Calculate baseline armor if applicable. This is slot identity, not an explicit rarity stat.
        let baseArmor = 0;
        if (slotConfig.baseArmorMultiplier > 0) {
            baseArmor = this.calculateBaseArmor(slotConfig, floorPower);
            modifiers.push({
                name: 'Base Armor',
                stat: 'armor',
                value: baseArmor,
                type: 'flat',
                text: `+${baseArmor} Armor`,
                isImplicit: true
            });
        }

        // 2. Roll exact explicit stat budget from rarity.
        const forcedStats = [options.prefixStat, options.suffixStat].filter(stat => stat && stat !== 'Random');
        const explicitModifiers = this.rollExplicitModifiers(rarity, effectiveFloor, forcedStats);
        modifiers.push(...explicitModifiers);

        // 3. Generate Name
        let baseName = type.name;
        let weaponType = null;
        let element = null;
        let elementName = '';
        let weaponVariant = null;
        let prefix = '';
        let suffix = '';
        
        if (type.slot === 'weapon') {
            const forcedWeaponType = options.weaponType && options.weaponType !== 'Random' ? options.weaponType : null;
            const subType = this.weaponSubTypes.find(w => w.id === forcedWeaponType) ||
                this.weaponSubTypes[Math.floor(Math.random() * this.weaponSubTypes.length)];
            weaponType = subType.id;
            baseName = subType.names.includes(options.weaponBaseName)
                ? options.weaponBaseName
                : subType.names[Math.floor(Math.random() * subType.names.length)];
            const forcedElement = options.element !== undefined ? options.element : 'Random';
            const rolledElement = forcedElement === 'None'
                ? null
                : forcedElement && forcedElement !== 'Random'
                    ? this.elements.find(el => el.id === forcedElement)
                    : this.rollElementForWeaponType(weaponType);
            if (rolledElement) {
                element = rolledElement.id;
                elementName = rolledElement.name;
            }
            if (weaponType === 'shotgun' && Math.random() < 0.2) {
                weaponVariant = 'overcharged';
            }
        } else if (type.slot !== 'trinket') {
            const nameParts = this.getAffixNameParts(explicitModifiers);
            prefix = nameParts.prefix;
            suffix = nameParts.suffix;
        }

        // 4. Assign Trinket Abilities
        let activeAbility = null;
        if (type.slot === 'trinket') {
            const forcedAbilityType = options.trinketAbilityType && options.trinketAbilityType !== 'Random' ? options.trinketAbilityType : null;
            const forcedAbilityElement = options.trinketAbilityElement && options.trinketAbilityElement !== 'Random' ? options.trinketAbilityElement : null;
            const baseAbility = this.trinketAbilities.find(ability =>
                ability.type === forcedAbilityType &&
                (!forcedAbilityElement || ability.element === forcedAbilityElement)
            ) ||
                this.trinketAbilities[Math.floor(Math.random() * this.trinketAbilities.length)];
            activeAbility = JSON.parse(JSON.stringify(baseAbility));
            const abilityBonus = { Common: 0, Uncommon: 0.05, Epic: 0.12, Legendary: 0.2 }[rarity.name] || 0;
            const abilityPower = floorPower + abilityBonus;

            if (activeAbility.type === 'heal') {
                activeAbility.value = Math.floor(30 * abilityPower);
                activeAbility.text = `Use to heal ${activeAbility.value} HP (${activeAbility.cooldown}s CD)`;
            }
            if (activeAbility.type === 'nova') {
                activeAbility.damage = Math.floor(24 * abilityPower);
                activeAbility.text = `Fires ${activeAbility.projectiles} projectiles around you (${activeAbility.cooldown}s CD)`;
            }
            if (activeAbility.type === 'dash') {
                activeAbility.speed = Math.floor(700 + (effectiveFloor * 8) + (abilityBonus * 100));
                activeAbility.text = `A swift directional dash at ${activeAbility.speed} speed (${activeAbility.cooldown}s CD)`;
            }
            if (activeAbility.type === 'hot') {
                activeAbility.value = Math.floor(24 * abilityPower);
                activeAbility.text = `Restores ${activeAbility.value} HP over ${activeAbility.duration} seconds (${activeAbility.cooldown}s CD)`;
            }
            if (activeAbility.type === 'scout') {
                activeAbility.revealRadius = Math.floor(20 + (effectiveFloor * 0.4) + (abilityBonus * 12));
                activeAbility.text = `Reveals a wide area of the minimap (${activeAbility.cooldown}s CD)`;
            }
            if (activeAbility.type === 'phase_tether') {
                activeAbility.maxTiles = Math.min(10, Math.floor(8 + abilityBonus * 8));
                activeAbility.text = `Blink ${activeAbility.minTiles}-${activeAbility.maxTiles} tiles toward your aim (${activeAbility.cooldown}s CD)`;
            }
            if (activeAbility.type === 'element_bomb') {
                activeAbility.damage = Math.floor(activeAbility.damage * abilityPower);
                activeAbility.text = `Throws a ${activeAbility.element} bomb that leaves a status cloud (${activeAbility.cooldown}s CD)`;
            }
            if (activeAbility.type === 'lightning_strike') {
                activeAbility.damage = Math.floor(activeAbility.damage * abilityPower);
                activeAbility.text = `Strikes the nearest enemy and chains up to ${activeAbility.chains} times (${activeAbility.cooldown}s CD)`;
            }
            if (activeAbility.type === 'target_dummy') {
                activeAbility.radius = Math.floor(activeAbility.radius + (abilityBonus * 120));
                activeAbility.text = `Drops a decoy for ${activeAbility.duration} seconds that draws enemy aggro (${activeAbility.cooldown}s CD)`;
            }
            if (activeAbility.type === 'soul_siphon') {
                activeAbility.lifesteal = Math.min(0.65, activeAbility.lifesteal + abilityBonus);
                activeAbility.text = `Gain ${Math.round(activeAbility.lifesteal * 100)}% lifesteal for ${activeAbility.duration} seconds (${activeAbility.cooldown}s CD)`;
            }
        }

        // 5. Roll Boons/Curses (Traits) for Legendary only.
        let passiveTrait = null;
        if (rarity.name === 'Legendary') {
            const baseTrait = LootConfig.traits[Math.floor(Math.random() * LootConfig.traits.length)];
            
            passiveTrait = { name: baseTrait.name, modifiers: [] };
            let traitTexts = [];

            // Apply trait modifiers to item
            for (const tMod of baseTrait.modifiers) {
                let val = tMod.value;
                if (tMod.range) {
                    const min = Math.min(tMod.range[0], tMod.range[1]);
                    const max = Math.max(tMod.range[0], tMod.range[1]);
                    val = Math.floor(Math.random() * (max - min + 1)) + min;
                }
                const sign = val > 0 ? '+' : '';
                const symbol = tMod.type.includes('percent') ? '%' : '';
                
                let text = `${sign}${val}${symbol} ${tMod.name}`;
                if (tMod.stat === 'canDodge') {
                    text = 'Cannot Dodge';
                }
                traitTexts.push(text);

                modifiers.push({
                    name: tMod.name,
                    stat: tMod.stat,
                    value: val,
                    type: tMod.type,
                    text: text,
                    isTrait: true
                });

                passiveTrait.modifiers.push({
                    ...tMod,
                    value: val
                });
            }
            
            if (baseTrait.name === 'Arcane Barrier') {
                const shieldMod = passiveTrait.modifiers.find(m => m.stat === 'maxShield');
                const regenMod = passiveTrait.modifiers.find(m => m.stat === 'shieldRegen');
                if (shieldMod && regenMod) {
                    traitTexts = [`+${shieldMod.value} Shield (Regen: +${regenMod.value}/s)`];
                }
            }
            
            passiveTrait.text = traitTexts.join(', ');
        }

        const gearScore = this.calculateGearScore(effectiveFloor, rarity, type.slot, baseArmor);

        // 6. Calculate Durability (skip trinkets)
        let durability = null;
        let maxDurability = null;
        if (type.slot !== 'trinket' && typeof DurabilityConfig !== 'undefined' && DurabilityConfig.baseBySlot[type.slot]) {
            const baseDur = DurabilityConfig.baseBySlot[type.slot];
            const rarityMult = DurabilityConfig.rarityMultiplier[rarity.name] || 1.0;
            const gsBonus = Math.floor(gearScore * DurabilityConfig.gsScaling);
            const rawDur = Math.floor(baseDur * rarityMult) + gsBonus;
            const variance = 1 + (Math.random() * 2 - 1) * DurabilityConfig.randomRange;
            maxDurability = Math.max(1, Math.floor(rawDur * variance));
            durability = maxDurability;
        }

        const name = this.buildItemName(type.slot, baseName, prefix, suffix, elementName, weaponVariant, activeAbility, passiveTrait);

        this.itemIdCounter++;
        const item = {
            id: `item_${this.itemIdCounter}`,
            name: name,
            type: type.slot,
            weaponType: weaponType,
            element: element,
            weaponVariant: weaponVariant,
            rarity: rarity.name,
            color: rarity.color,
            gearScore: gearScore,
            modifiers: modifiers,
            upgradeLevel: 0,
            activeAbility: activeAbility,
            passiveTrait: passiveTrait,
            baseArmor: baseArmor
        };

        if (maxDurability !== null) {
            item.durability = durability;
            item.maxDurability = maxDurability;
        }

        return item;
    }
}
