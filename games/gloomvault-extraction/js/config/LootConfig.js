const LootConfig = {
    // Slot Definitions: base armor is slot identity and does not count as an explicit rarity stat.
    slots: {
        helm: {
            name: 'Helm',
            baseArmorMultiplier: 1.0,
            implicit: null
        },
        chest: {
            name: 'Chest',
            baseArmorMultiplier: 2.0,
            implicit: null
        },
        pants: {
            name: 'Pants',
            baseArmorMultiplier: 1.2,
            implicit: null
        },
        boots: {
            name: 'Boots',
            baseArmorMultiplier: 0.8,
            implicit: null
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

    // General modifier pool for explicit rarity stats. Rarity controls how many of these roll,
    // while floor controls value scaling.
    modifierPool: [
        { name: 'Armor', type: 'flat', stat: 'armor', range: [4, 8] },
        { name: 'Damage Reduction', type: 'percent', stat: 'damageReduction', range: [1, 2], earlyCap: 2 },
        { name: 'Thorns', type: 'flat', stat: 'thorns', range: [2, 5] },
        { name: 'Damage', type: 'percent', stat: 'damageMultiplier', range: [4, 8] },
        { name: 'Attack Speed', type: 'percent', stat: 'attackSpeedMultiplier', range: [4, 7] },
        { name: 'Flat Damage', type: 'flat', stat: 'flatDamage', range: [1, 3] },
        { name: 'Lifesteal', type: 'percent', stat: 'lifesteal', range: [1, 2], earlyCap: 2 },
        { name: 'Movement Speed', type: 'percent', stat: 'movementSpeedMultiplier', range: [3, 6] },
        { name: 'Dodge Cooldown Reduction', type: 'percent', stat: 'dodgeCooldownMultiplier', range: [4, 7] },
        { name: 'Cooldown Reduction', type: 'percent', stat: 'cooldownReduction', range: [2, 4] },
        { name: 'Max Health', type: 'flat', stat: 'maxHp', range: [8, 16] }
    ],

    // Epic and Legendary Boons/Curses (extreme trade-offs)
    traits: [
        {
            name: 'Glass Cannon',
            modifiers: [
                { name: 'Damage', type: 'percent', stat: 'damageMultiplier', range: [20, 40] },
                { name: 'Armor', type: 'percent_penalty', stat: 'armorMultiplier', range: [-60, -40] }
            ]
        },
        {
            name: 'Blood Magic',
            modifiers: [
                { name: 'Lifesteal', type: 'percent', stat: 'lifesteal', range: [8, 15] },
                { name: 'Max HP', type: 'percent_penalty', stat: 'maxHpMultiplier', range: [-40, -20] }
            ]
        },
        {
            name: 'Sluggish Titan',
            modifiers: [
                { name: 'Damage Reduction', type: 'percent', stat: 'damageReduction', range: [15, 25] },
                { name: 'Movement Speed', type: 'percent_penalty', stat: 'movementSpeedMultiplier', range: [-30, -15] }
            ]
        },
        {
            name: 'Berserker\'s Rage',
            modifiers: [
                { name: 'Attack Speed', type: 'percent', stat: 'attackSpeedMultiplier', range: [30, 50] },
                { name: 'Damage Taken', type: 'percent_penalty', stat: 'damageReduction', range: [-30, -10] }
            ]
        },
        {
            name: 'Immovable Object',
            modifiers: [
                { name: 'Armor', type: 'flat', stat: 'armor', range: [40, 70] },
                { name: 'Dodge Disabled', type: 'flat', stat: 'canDodge', value: -1 } // Disables dodge
            ]
        },
        {
            name: 'Vampire Lord',
            modifiers: [
                { name: 'Max Lifesteal Cap', type: 'percent', stat: 'lifestealCapBonus', range: [10, 20] },
                { name: 'Max HP', type: 'percent_penalty', stat: 'maxHpMultiplier', range: [-30, -15] }
            ]
        },
        {
            name: 'Arcane Barrier',
            modifiers: [
                { name: 'Shield', type: 'flat', stat: 'maxShield', range: [14, 23] },
                { name: 'Shield Regen', type: 'flat', stat: 'shieldRegen', range: [1, 2] }
            ]
        }
    ]
};
