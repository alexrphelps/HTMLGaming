const LootConfig = {
    // Slot Definitions: Base armor multipliers and guaranteed implicits
    slots: {
        helm: {
            name: 'Helm',
            baseArmorMultiplier: 1.0,
            implicit: { name: 'Weapon Damage', type: 'percent', stat: 'damageMultiplier', range: [5, 15] }
        },
        chest: {
            name: 'Chest',
            baseArmorMultiplier: 2.0,
            implicit: { name: 'Damage Reduction', type: 'percent', stat: 'damageReduction', range: [1, 5] }
        },
        pants: {
            name: 'Pants',
            baseArmorMultiplier: 1.2,
            implicit: { name: 'Movement Speed', type: 'percent', stat: 'movementSpeedMultiplier', range: [5, 15] }
        },
        boots: {
            name: 'Boots',
            baseArmorMultiplier: 0.8,
            implicit: { name: 'Dodge Cooldown Reduction', type: 'percent', stat: 'dodgeCooldownMultiplier', range: [5, 15] }
        },
        weapon: {
            name: 'Weapon',
            baseArmorMultiplier: 0, // Weapons don't grant base armor natively
            implicit: null // Weapons rely on their base damage
        },
        trinket: {
            name: 'Trinket',
            baseArmorMultiplier: 0, // Trinkets grant active abilities, no base armor
            implicit: null
        }
    },

    // Prefixes that define the core identity and guarantee specific stats
    prefixes: [
        { name: 'Juggernaut\'s', guaranteed: { name: 'Armor', type: 'flat', stat: 'armor', range: [10, 30] } },
        { name: 'Assassin\'s', guaranteed: { name: 'Damage', type: 'percent', stat: 'damageMultiplier', range: [10, 25] } },
        { name: 'Fleet', guaranteed: { name: 'Movement Speed', type: 'percent', stat: 'movementSpeedMultiplier', range: [10, 20] } },
        { name: 'Bramble', guaranteed: { name: 'Thorns', type: 'flat', stat: 'thorns', range: [5, 20] } },
        { name: 'Vampiric', guaranteed: { name: 'Lifesteal', type: 'percent', stat: 'lifesteal', range: [2, 8] } }
    ],

    // Suffixes that define utility or secondary traits
    suffixes: [
        { name: 'of the Aegis', guaranteed: { name: 'Damage Reduction', type: 'percent', stat: 'damageReduction', range: [2, 8] } },
        { name: 'of the Wind', guaranteed: { name: 'Dodge Cooldown Reduction', type: 'percent', stat: 'dodgeCooldownMultiplier', range: [10, 20] } },
        { name: 'of the Bear', guaranteed: { name: 'Max Health', type: 'flat', stat: 'maxHp', range: [20, 50] } },
        { name: 'of Power', guaranteed: { name: 'Flat Damage', type: 'flat', stat: 'flatDamage', range: [5, 15] } },
        { name: 'of Alacrity', guaranteed: { name: 'Attack Speed', type: 'percent', stat: 'attackSpeedMultiplier', range: [10, 25] } }
    ],

    // General modifier pool for extra random stats
    modifierPool: [
        { name: 'Armor', type: 'flat', stat: 'armor', range: [5, 20] },
        { name: 'Damage Reduction', type: 'percent', stat: 'damageReduction', range: [1, 5] },
        { name: 'Thorns', type: 'flat', stat: 'thorns', range: [2, 10] },
        { name: 'Damage', type: 'percent', stat: 'damageMultiplier', range: [5, 15] },
        { name: 'Attack Speed', type: 'percent', stat: 'attackSpeedMultiplier', range: [5, 20] },
        { name: 'Flat Damage', type: 'flat', stat: 'flatDamage', range: [2, 10] },
        { name: 'Lifesteal', type: 'percent', stat: 'lifesteal', range: [1, 5] },
        { name: 'Movement Speed', type: 'percent', stat: 'movementSpeedMultiplier', range: [5, 15] },
        { name: 'Dodge Cooldown Reduction', type: 'percent', stat: 'dodgeCooldownMultiplier', range: [5, 15] },
        { name: 'Cooldown Reduction', type: 'percent', stat: 'cooldownReduction', range: [2, 10] },
        { name: 'Max Health', type: 'flat', stat: 'maxHp', range: [10, 30] }
    ],

    // Epic and Legendary Boons/Curses (extreme trade-offs)
    traits: [
        {
            name: 'Glass Cannon',
            text: '+30% Damage, -50% Armor',
            modifiers: [
                { name: 'Damage', type: 'percent', stat: 'damageMultiplier', value: 30 },
                { name: 'Armor Penalty', type: 'percent_penalty', stat: 'armorMultiplier', value: -50 }
            ]
        },
        {
            name: 'Blood Magic',
            text: '+10% Lifesteal, -30% Max HP',
            modifiers: [
                { name: 'Lifesteal', type: 'percent', stat: 'lifesteal', value: 10 },
                { name: 'Max HP Penalty', type: 'percent_penalty', stat: 'maxHpMultiplier', value: -30 }
            ]
        },
        {
            name: 'Sluggish Titan',
            text: '+20% Damage Reduction, -20% Movement Speed',
            modifiers: [
                { name: 'Damage Reduction', type: 'percent', stat: 'damageReduction', value: 20 },
                { name: 'Movement Speed Penalty', type: 'percent_penalty', stat: 'movementSpeedMultiplier', value: -20 }
            ]
        },
        {
            name: 'Berserker\'s Rage',
            text: '+40% Attack Speed, +20% Damage Taken',
            modifiers: [
                { name: 'Attack Speed', type: 'percent', stat: 'attackSpeedMultiplier', value: 40 },
                { name: 'Damage Taken Penalty', type: 'percent_penalty', stat: 'damageReduction', value: -20 }
            ]
        },
        {
            name: 'Immovable Object',
            text: '+50 Armor, Cannot Dodge',
            modifiers: [
                { name: 'Armor', type: 'flat', stat: 'armor', value: 50 },
                { name: 'Dodge Disabled', type: 'flat', stat: 'canDodge', value: -1 } // Disables dodge
            ]
        },
        {
            name: 'Vampire Lord',
            text: '+15% Max Lifesteal Cap, -20% Max HP',
            modifiers: [
                { name: 'Max Lifesteal Cap', type: 'percent', stat: 'lifestealCapBonus', value: 15 },
                { name: 'Max HP Penalty', type: 'percent_penalty', stat: 'maxHpMultiplier', value: -20 }
            ]
        }
    ]
};
