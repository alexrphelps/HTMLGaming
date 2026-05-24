class AssetManager {
    constructor(manifest) {
        this.manifest = manifest || (typeof AssetManifest !== 'undefined' ? AssetManifest : null);
        this.images = {};
        this.loadPromises = [];
        this.basePath = (this.manifest && this.manifest.basePath) || 'assets';

        if (this.manifest) {
            this.registerManifestImages();
        }
    }

    registerManifestImages() {
        const sprites = this.manifest.sprites || {};
        const tiles = this.manifest.tiles || {};
        const lootIcons = this.manifest.lootIcons || [];

        for (const key in sprites) {
            const definition = this.normalizeSpriteDefinition(sprites[key]);
            this.registerImage(`sprites.${key}`, definition.path, definition);
        }

        this.registerTileImages(tiles);

        if (Array.isArray(lootIcons)) {
            lootIcons.forEach((path, index) => {
                this.registerImage(`loot.${index + 1}`, path);
            });
        } else {
            for (const poolName in lootIcons) {
                const pool = lootIcons[poolName] || [];
                pool.forEach((fileName, index) => {
                    this.registerImage(`loot.${poolName}.${index + 1}`, `icons/loot/${fileName}`);
                });
            }
        }
    }

    registerTileImages(node, pathParts = []) {
        if (typeof node === 'string') {
            if (/\.(png|webp|jpg|jpeg|gif)$/i.test(node)) {
                this.registerImage(`tiles.${pathParts.join('.')}`, node);
            }
            return;
        }

        if (!node || typeof node !== 'object') return;

        if (Array.isArray(node)) {
            node.forEach((value, index) => this.registerTileImages(value, [...pathParts, String(index)]));
            return;
        }

        for (const key in node) {
            this.registerTileImages(node[key], [...pathParts, key]);
        }
    }

    normalizeSpriteDefinition(value) {
        if (typeof value === 'string') {
            return {
                path: value,
                frameWidth: 64,
                frameHeight: 64,
                framesPerSecond: 10,
                defaultState: 'idle',
                states: {
                    idle: { row: 0, frames: 4, loop: true },
                    run: { row: 1, frames: 4, loop: true },
                    attack: { row: 2, frames: 4, loop: true }
                }
            };
        }

        return {
            frameWidth: 64,
            frameHeight: 64,
            framesPerSecond: 8,
            defaultState: 'idle',
            states: {},
            ...(value || {})
        };
    }

    registerImage(key, relativePath, metadata = null) {
        if (!key || !relativePath || this.images[key]) return this.images[key];

        const image = typeof Image !== 'undefined' ? new Image() : null;
        const record = {
            key,
            path: this.resolvePath(relativePath),
            image,
            metadata,
            loaded: false,
            failed: !image
        };

        this.images[key] = record;

        if (!image) return record;

        const promise = new Promise(resolve => {
            image.onload = () => {
                record.loaded = true;
                record.failed = false;
                resolve(record);
            };
            image.onerror = () => {
                record.loaded = false;
                record.failed = true;
                resolve(record);
            };
        });

        this.loadPromises.push(promise);
        image.src = record.path;
        return record;
    }

    resolvePath(relativePath) {
        const cleanBase = String(this.basePath || '').replace(/\/+$/, '');
        const cleanRelative = String(relativePath || '').replace(/^\/+/, '');
        return cleanBase ? `${cleanBase}/${cleanRelative}` : cleanRelative;
    }

    loadAll() {
        return Promise.all(this.loadPromises).then(() => this);
    }

    getRecord(key) {
        return this.images[key] || null;
    }

    getImage(key) {
        const record = this.getRecord(key);
        if (!record || !record.loaded || record.failed) return null;
        return record.image;
    }

    hasImage(key) {
        return Boolean(this.getImage(key));
    }

    getLegacyGameAssets() {
        return {
            player: this.getRecord('sprites.player')?.image || null,
            enemy: this.getRecord('sprites.enemy')?.image || null
        };
    }

    getSpriteDefinition(key) {
        const record = this.getRecord(key);
        if (record && record.metadata) return record.metadata;
        return null;
    }

    getSpriteRecord(key) {
        const record = this.getRecord(key);
        if (record && record.loaded && !record.failed) return record;

        const fallbackKey = record && record.metadata && record.metadata.fallbackKey;
        if (fallbackKey) {
            return this.getSpriteRecord(fallbackKey);
        }

        return null;
    }

    getSpriteFrame(key, state, frame = 0) {
        const record = this.getSpriteRecord(key);
        if (!record || !record.image) return null;

        const definition = record.metadata || this.getSpriteDefinition(key) || {};
        const states = definition.states || {};
        const defaultState = definition.defaultState || 'idle';
        const stateConfig = states[state] || states[defaultState] || { row: 0, frames: 1 };
        const frameCount = Math.max(1, stateConfig.frames || definition.frameCount || 1);
        const frameIndex = Math.max(0, Math.floor(frame || 0)) % frameCount;

        return {
            image: record.image,
            definition,
            state: states[state] ? state : defaultState,
            frameIndex,
            frameCount,
            srcX: frameIndex * (definition.frameWidth || 64),
            srcY: (stateConfig.row || 0) * (definition.frameHeight || 64),
            srcW: definition.frameWidth || 64,
            srcH: definition.frameHeight || 64,
            framesPerSecond: definition.framesPerSecond || 8
        };
    }

    getAnimationFrameCount(key, state) {
        const record = this.getRecord(key);
        const definition = record && record.metadata;
        if (!definition) return null;

        const states = definition.states || {};
        const defaultState = definition.defaultState || 'idle';
        const stateConfig = states[state] || states[defaultState];
        return stateConfig && stateConfig.frames ? Math.max(1, stateConfig.frames) : null;
    }

    getAnimationFrameDuration(key) {
        const definition = this.getSpriteDefinition(key);
        if (!definition || !definition.framesPerSecond) return null;
        return 1 / Math.max(1, definition.framesPerSecond);
    }

    getLootIconPoolName(item) {
        if (!item || !item.type) return null;

        const type = String(item.type).toLowerCase();
        if (['helm', 'chest', 'pants', 'boots', 'trinket'].includes(type)) return type;

        if (type === 'weapon') {
            const weaponType = String(item.weaponType || '').toLowerCase();
            if (weaponType === 'pistol') return 'wand';
            if (weaponType === 'shotgun') return 'staff';
            if (weaponType === 'assault_rifle') return 'crossbow';
            if (weaponType === 'sniper') return 'crossbow';
            if (weaponType === 'melee_cleave') return 'axe';

            const name = String(item.name || '').toLowerCase();
            if (name.includes('lance')) return 'shortsword';
            if (name.includes('shortsword') || name.includes('sword')) return 'shortsword';
            if (weaponType === 'melee_stab') return 'shortsword';
        }

        return null;
    }

    getLootIconKey(item) {
        if (!item) return null;

        const lootIcons = this.manifest && this.manifest.lootIcons;
        const poolName = this.getLootIconPoolName(item);
        if (!poolName || !lootIcons) return null;

        if (Array.isArray(lootIcons)) {
            const count = lootIcons.length;
            if (count === 0) return null;
            const hash = AssetManager.hashString(this.getItemIconSeed(item));
            return `loot.${(hash % count) + 1}`;
        }

        const pool = lootIcons[poolName] || [];
        if (pool.length === 0) return null;

        const hash = AssetManager.hashString(this.getItemIconSeed(item));
        return `loot.${poolName}.${(hash % pool.length) + 1}`;
    }

    getItemIconSeed(item) {
        const seed = [
            item.id,
            item.name,
            item.type,
            item.rarity,
            item.gearScore,
            item.weaponType,
            item.element
        ].filter(value => value !== undefined && value !== null).join('|');
        return seed || 'loot';
    }

    getLootIcon(item) {
        const key = this.getLootIconKey(item);
        return key ? this.getImage(key) : null;
    }

    static hashString(value) {
        let hash = 2166136261;
        const text = String(value || '');
        for (let i = 0; i < text.length; i++) {
            hash ^= text.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    }
}

if (typeof window !== 'undefined') {
    window.AssetManager = AssetManager;
}
