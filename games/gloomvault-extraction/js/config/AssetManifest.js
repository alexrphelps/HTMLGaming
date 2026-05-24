const GLOOMVAULT_TILE_AUTOTILE_MASKS = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    12, 13, 14, 15, 19, 23, 27, 31, 38, 39,
    46, 47, 55, 63, 76, 77, 78, 79, 95, 110,
    111, 127, 137, 139, 141, 143, 155, 159, 175,
    191, 205, 207, 223, 239, 255
];

const GLOOMVAULT_TILE_THEME_METADATA = {
    default: {
        name: 'Hybrid Vault',
        floorTheme: 'grey flagstone, moss, cracked vault stone',
        wallTheme: 'heavy old vault blocks with moss-dark seams'
    },
    rigid_dungeon: {
        name: 'Rigid Dungeon',
        floorTheme: 'clean ashlar stone and disciplined grout lines',
        wallTheme: 'sharp architectural blocks with iron reinforcement'
    },
    deep_caverns: {
        name: 'Deep Caverns',
        floorTheme: 'damp limestone, lichen, and eroded stone',
        wallTheme: 'jagged cavern rock with wet moss'
    },
    the_labyrinth: {
        name: 'The Labyrinth',
        floorTheme: 'tight burrow stone, roots, and old stains',
        wallTheme: 'compressed maze-carved stone and root-dark corners'
    },
    arena_halls: {
        name: 'Arena Halls',
        floorTheme: 'broad worn arena slabs with bronze scuffs',
        wallTheme: 'bronze and iron-braced battle masonry'
    },
    crypt_crossroads: {
        name: 'Crypt Crossroads',
        floorTheme: 'cold crypt marble and subtle bone dust',
        wallTheme: 'sarcophagus-like crypt stone with pale bone accents'
    },
    ironforged: {
        name: 'Ironforged',
        floorTheme: 'dark forge plates, soot, rivets, and worn metal',
        wallTheme: 'soot-black iron walls with riveted caps'
    },
    fractured_rift: {
        name: 'Fractured Rift',
        floorTheme: 'cracked basalt and faint purple rift veins',
        wallTheme: 'crystal-dark basalt with restrained rift glow'
    },
    gauntlet_passage: {
        name: 'Gauntlet Passage',
        floorTheme: 'worn fortress stone with old wood and iron runners',
        wallTheme: 'fortified stone walls with battered wood and iron'
    }
};

function formatTileMask(mask) {
    return String(mask).padStart(3, '0');
}

function buildGloomvaultMapTiles() {
    const mapTiles = {};
    for (const key of Object.keys(GLOOMVAULT_TILE_THEME_METADATA)) {
        const masks = {};
        for (const mask of GLOOMVAULT_TILE_AUTOTILE_MASKS) {
            const formatted = formatTileMask(mask);
            masks[formatted] = `tiles/maps/${key}/wall/mask-${formatted}.png`;
        }

        mapTiles[key] = {
            floor: {
                base: `tiles/maps/${key}/floor/base.png`,
                variant01: `tiles/maps/${key}/floor/variant-01.png`,
                variant02: `tiles/maps/${key}/floor/variant-02.png`
            },
            wall: { masks },
            objects: {
                doorLocked: `tiles/maps/${key}/objects/door-locked.png`,
                doorOpen: `tiles/maps/${key}/objects/door-open.png`
            }
        };
    }
    return mapTiles;
}

const AssetManifest = {
    basePath: 'assets',
    sprites: {
        player: {
            path: 'sprites/player.png',
            frameWidth: 627,
            frameHeight: 627,
            framesPerSecond: 8,
            defaultState: 'idle',
            states: {
                idle: { row: 0, frames: 1, loop: true },
                run: { row: 0, frames: 4, loop: true },
                attack: { row: 0, frames: 1, loop: true }
            }
        },
        enemy: {
            path: 'sprites/enemy.png',
            frameWidth: 64,
            frameHeight: 64,
            framesPerSecond: 8,
            defaultState: 'idle',
            states: {
                idle: { row: 0, frames: 8, loop: true },
                run: { row: 1, frames: 8, loop: true },
                attack: { row: 2, frames: 8, loop: true }
            }
        },
        'enemy.grunt': {
            path: 'sprites/enemy-grunt.png',
            fallbackKey: 'sprites.enemy',
            frameWidth: 627,
            frameHeight: 627,
            framesPerSecond: 8,
            defaultState: 'idle',
            states: {
                idle: { row: 0, frames: 1, loop: true },
                run: { row: 0, frames: 4, loop: true },
                attack: { row: 0, frames: 1, loop: true }
            }
        },
        'enemy.brownGrunt': {
            path: 'sprites/enemy-brown-grunt.png',
            fallbackKey: 'sprites.enemy.grunt',
            frameWidth: 627,
            frameHeight: 627,
            framesPerSecond: 8,
            defaultState: 'idle',
            states: {
                idle: { row: 0, frames: 1, loop: true },
                run: { row: 0, frames: 4, loop: true },
                attack: { row: 0, frames: 1, loop: true }
            }
        },
        'enemy.ranged': {
            path: 'sprites/enemy-ranged.png',
            fallbackKey: 'sprites.enemy',
            frameWidth: 627,
            frameHeight: 627,
            framesPerSecond: 8,
            defaultState: 'idle',
            states: {
                idle: { row: 0, frames: 1, loop: true },
                run: { row: 0, frames: 4, loop: true },
                attack: { row: 0, frames: 1, loop: true }
            }
        },
        'enemy.ranged.mage': {
            path: 'sprites/enemy-ranged-mage.png',
            fallbackKey: 'sprites.enemy.ranged',
            frameWidth: 627,
            frameHeight: 627,
            framesPerSecond: 8,
            defaultState: 'idle',
            states: {
                idle: { row: 0, frames: 1, loop: true },
                run: { row: 0, frames: 4, loop: true },
                attack: { row: 0, frames: 1, loop: true }
            }
        },
        'enemy.brute': {
            path: 'sprites/enemy-brute.png',
            fallbackKey: 'sprites.enemy',
            frameWidth: 627,
            frameHeight: 627,
            framesPerSecond: 8,
            defaultState: 'idle',
            states: {
                idle: { row: 0, frames: 1, loop: true },
                run: { row: 0, frames: 4, loop: true },
                attack: { row: 0, frames: 1, loop: true }
            }
        },
        'enemy.brute.blue': {
            path: 'sprites/enemy-brute-blue.png',
            fallbackKey: 'sprites.enemy.brute',
            frameWidth: 627,
            frameHeight: 627,
            framesPerSecond: 8,
            defaultState: 'idle',
            states: {
                idle: { row: 0, frames: 1, loop: true },
                run: { row: 0, frames: 4, loop: true },
                attack: { row: 0, frames: 1, loop: true }
            }
        },
        'enemy.brute.purple': {
            path: 'sprites/enemy-brute-purple.png',
            fallbackKey: 'sprites.enemy.brute',
            frameWidth: 627,
            frameHeight: 627,
            framesPerSecond: 8,
            defaultState: 'idle',
            states: {
                idle: { row: 0, frames: 1, loop: true },
                run: { row: 0, frames: 4, loop: true },
                attack: { row: 0, frames: 1, loop: true }
            }
        },
        'enemy.boss.vaultWarden': {
            path: 'sprites/boss-vault-warden.png',
            fallbackKey: 'sprites.enemy.boss',
            frameWidth: 627,
            frameHeight: 627,
            framesPerSecond: 8,
            defaultState: 'idle',
            states: {
                idle: { row: 0, frames: 4, loop: true },
                run: { row: 1, frames: 4, loop: true },
                attack: { row: 2, frames: 4, loop: true }
            }
        },
        'enemy.boss.stormSeer': {
            path: 'sprites/boss-storm-seer.png',
            fallbackKey: 'sprites.enemy.ranged',
            frameWidth: 627,
            frameHeight: 627,
            framesPerSecond: 8,
            defaultState: 'idle',
            states: {
                idle: { row: 0, frames: 4, loop: true },
                run: { row: 1, frames: 4, loop: true },
                attack: { row: 2, frames: 4, loop: true }
            }
        },
        'enemy.boss.ironMaw': {
            path: 'sprites/boss-iron-maw.png',
            fallbackKey: 'sprites.enemy.brute',
            frameWidth: 627,
            frameHeight: 627,
            framesPerSecond: 8,
            defaultState: 'idle',
            states: {
                idle: { row: 0, frames: 4, loop: true },
                run: { row: 1, frames: 4, loop: true },
                attack: { row: 2, frames: 4, loop: true }
            }
        },
        'enemy.boss.blightPriest': {
            path: 'sprites/boss-blight-priest.png',
            fallbackKey: 'sprites.enemy.boss',
            frameWidth: 627,
            frameHeight: 627,
            framesPerSecond: 8,
            defaultState: 'idle',
            states: {
                idle: { row: 0, frames: 4, loop: true },
                run: { row: 1, frames: 4, loop: true },
                attack: { row: 2, frames: 4, loop: true }
            }
        },
        'enemy.guardian.cryptSentinel': {
            path: 'sprites/guardian-crypt-sentinel.png',
            fallbackKey: 'sprites.enemy.brute',
            frameWidth: 627,
            frameHeight: 627,
            framesPerSecond: 8,
            defaultState: 'idle',
            states: {
                idle: { row: 0, frames: 1, loop: true },
                run: { row: 0, frames: 4, loop: true },
                attack: { row: 0, frames: 1, loop: true }
            }
        },
        'enemy.boss': {
            path: 'sprites/enemy-boss.png',
            fallbackKey: 'sprites.enemy',
            frameWidth: 64,
            frameHeight: 64,
            framesPerSecond: 8,
            defaultState: 'idle',
            states: {
                idle: { row: 0, frames: 8, loop: true },
                run: { row: 1, frames: 8, loop: true },
                attack: { row: 2, frames: 8, loop: true }
            }
        },
        'service.blacksmith.1': {
            path: 'sprites/blacksmith-01.png'
        },
        'service.blacksmith.2': {
            path: 'sprites/blacksmith-02.png',
            fallbackKey: 'sprites.service.blacksmith.1'
        },
        'service.blacksmith.3': {
            path: 'sprites/blacksmith-03.png',
            fallbackKey: 'sprites.service.blacksmith.1'
        },
        'service.bank.1': {
            path: 'sprites/void-bank-01.png'
        },
        'service.bank.2': {
            path: 'sprites/void-bank-02.png',
            fallbackKey: 'sprites.service.bank.1'
        },
        'service.bank.3': {
            path: 'sprites/void-bank-03.png',
            fallbackKey: 'sprites.service.bank.1'
        },
        'service.healingWell.1': {
            path: 'sprites/healing-well-01.png'
        },
        'service.healingWell.1.closed': {
            path: 'sprites/healing-well-closed-01.png',
            fallbackKey: 'sprites.service.healingWell.1'
        },
        'service.healingWell.2': {
            path: 'sprites/healing-well-02.png',
            fallbackKey: 'sprites.service.healingWell.1'
        },
        'service.healingWell.2.closed': {
            path: 'sprites/healing-well-closed-02.png',
            fallbackKey: 'sprites.service.healingWell.2'
        },
        'extractionPortal.1': {
            path: 'sprites/extraction-portal-01.png'
        },
        'extractionPortal.2': {
            path: 'sprites/extraction-portal-02.png',
            fallbackKey: 'sprites.extractionPortal.1'
        },
        'extractionPortal.3': {
            path: 'sprites/extraction-portal-03.png',
            fallbackKey: 'sprites.extractionPortal.1'
        },
        'extractionPortal.4': {
            path: 'sprites/extraction-portal-04.png',
            fallbackKey: 'sprites.extractionPortal.1'
        },
        'chest.1.closed': {
            path: 'sprites/loot-chest-closed-01.png'
        },
        'chest.1.opened': {
            path: 'sprites/loot-chest-opened-01.png',
            fallbackKey: 'sprites.chest.1.closed'
        },
        'chest.2.closed': {
            path: 'sprites/loot-chest-closed-02.png',
            fallbackKey: 'sprites.chest.1.closed'
        },
        'chest.2.opened': {
            path: 'sprites/loot-chest-opened-02.png',
            fallbackKey: 'sprites.chest.2.closed'
        }
    },
    tiles: {
        floor: 'tiles/floor.png',
        floorDetail1: 'tiles/floor-detail-1.png',
        wall: 'tiles/wall.png',
        wallEdge: 'tiles/wall-edge.png',
        doorLocked: 'tiles/door-locked.png',
        doorOpen: 'tiles/door-open.png',
        autotileMasks: GLOOMVAULT_TILE_AUTOTILE_MASKS,
        maps: buildGloomvaultMapTiles(),
        collision: {
            floor: { walkable: true, blocksVision: false, interaction: null },
            wall: { walkable: false, blocksVision: true, interaction: null },
            doorLocked: { walkable: false, blocksVision: true, interaction: 'bossEntrance' },
            doorOpen: { walkable: true, blocksVision: false, interaction: 'bossEntrance' }
        }
    },
    tileThemes: GLOOMVAULT_TILE_THEME_METADATA,
    worldDrops: {
        useLootIcons: false
    },
    lootIcons: {
        helm: ['helm-1.png', 'helm-2.png', 'helm-3.png', 'helm-4.png', 'helm-5.png', 'helm-6.png', 'helm-7.png', 'helm-8.png'],
        chest: ['chest-1.png', 'chest-2.png', 'chest-3.png', 'chest-4.png', 'chest-5.png', 'chest-6.png', 'chest-7.png', 'chest-8.png'],
        pants: ['pants-1.png', 'pants-2.png', 'pants-3.png', 'pants-4.png', 'pants-5.png', 'pants-6.png', 'pants-7.png', 'pants-8.png'],
        boots: ['boots-1.png', 'boots-2.png', 'boots-3.png', 'boots-4.png', 'boots-5.png', 'boots-6.png', 'boots-7.png', 'boots-8.png'],
        wand: ['wand-1.png', 'wand-2.png', 'wand-3.png', 'wand-4.png'],
        staff: ['staff-1.png', 'staff-2.png', 'staff-3.png', 'staff-4.png'],
        crossbow: ['crossbow-1.png', 'crossbow-2.png', 'crossbow-3.png', 'crossbow-4.png'],
        bow: ['crossbow-1.png', 'crossbow-2.png', 'crossbow-3.png', 'crossbow-4.png'],
        shortsword: ['shortsword-1.png', 'shortsword-2.png', 'shortsword-3.png', 'shortsword-4.png'],
        lance: ['shortsword-1.png', 'shortsword-2.png', 'shortsword-3.png', 'shortsword-4.png'],
        axe: ['axe-1.png', 'axe-2.png', 'axe-3.png', 'axe-4.png'],
        trinket: ['trinket-1.png', 'trinket-2.png', 'trinket-3.png', 'trinket-4.png', 'trinket-5.png', 'trinket-6.png', 'trinket-7.png', 'trinket-8.png']
    }
};

if (typeof window !== 'undefined') {
    window.AssetManifest = AssetManifest;
    window.GLOOMVAULT_TILE_AUTOTILE_MASKS = GLOOMVAULT_TILE_AUTOTILE_MASKS;
    window.GLOOMVAULT_TILE_THEME_METADATA = GLOOMVAULT_TILE_THEME_METADATA;
}
