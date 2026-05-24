class GameEngine {
    constructor(canvasId, options = {}) {
        this.eventRegistry = options.eventRegistry || (typeof EventRegistry !== 'undefined' ? new EventRegistry() : null);
        this._destroyed = false;
        this._boundResizeCanvas = () => this.resizeCanvas();
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d', { alpha: false }); // optimize for opaque background
        
        // Systems
        this.input = options.input || new Input();
        this.camera = new Camera(this.canvas.width, this.canvas.height);
        this.renderer = new Renderer(this.canvas, this.ctx);
        this.renderer.setCamera(this.camera);
        if (typeof window !== 'undefined' && window.gloomvaultAssets) {
            this.renderer.setAssetManager(window.gloomvaultAssets);
        }

        // Runtime services
        this.runState = options.runState || (typeof RunState !== 'undefined' ? new RunState({ mapConfigs: MapConfigs }) : null);
        this.loadoutService = options.loadoutService || (typeof LoadoutService !== 'undefined' ? new LoadoutService() : null);
        this.floorOrchestrator = options.floorOrchestrator || (typeof FloorOrchestrator !== 'undefined' ? new FloorOrchestrator() : null);
        this.encounterService = options.encounterService || (typeof EncounterService !== 'undefined' ? new EncounterService() : null);
        this.combatSystem = options.combatSystem || (typeof CombatSystem !== 'undefined' ? new CombatSystem() : null);
        this.projectileCombatResolver = options.projectileCombatResolver || (typeof ProjectileCombatResolver !== 'undefined' ? new ProjectileCombatResolver() : null);
        this.abilitySystem = options.abilitySystem || (typeof AbilitySystem !== 'undefined' ? new AbilitySystem() : null);
        this.minimapService = options.minimapService || (typeof MinimapService !== 'undefined' ? new MinimapService() : null);
        this.gameRenderer = options.gameRenderer || (typeof GameRenderer !== 'undefined' ? new GameRenderer() : null);

        // Map Gen parameters
        this.tileSize = 64;
        this.runMapSelection = 'random';
        this.currentMapKey = 'default';
        this.currentMapConfig = MapConfigs.default;
        this.mapCols = this.currentMapConfig.cols;
        this.mapRows = this.currentMapConfig.rows;
        this.mapGen = new MapGen(this.currentMapConfig, this.tileSize);
        this.mapGen.mapKey = this.currentMapKey;
        this.pathfinder = new Pathfinder();
        this.spawnManager = new SpawnManager();

        // Game Context
        this.currentFloor = 1;
        this.playerGearScore = 10;

        // Entities
        this.player = null; // initialized in start()
        this.enemies = [];
        this.projectiles = [];
        this.droppedItems = [];
        this.lootChests = [];
        this.bossRoomButtons = [];
        this.dungeonServices = [];
        this.trinketEffects = [];
        this.decoys = [];
        this.combatFeedback = new CombatFeedback();
        this.particleSystem = new ParticleSystem();
        this.lootGen = new LootGen();

        // Game State
        this.lastTime = 0;
        this.isRunning = false;
        this.state = 'MENU'; // 'MENU', 'PLAYING', 'STASH'
        this._animationFrameId = null;
        this._hudElements = null;
        this._hudState = {};
        this.hudAdapter = options.hudAdapter || (typeof HudAdapter !== 'undefined' ? new HudAdapter() : null);
        this.hud = this.hudAdapter && this.hudAdapter.controller
            ? this.hudAdapter.controller
            : (typeof HudController !== 'undefined' ? new HudController() : null);
        this._playerRangedProjectiles = [];
        if (this.runState && this.runState.syncFromEngine) {
            this.runState.syncFromEngine(this);
        }

        // Handle window resize
        if (this.eventRegistry) {
            this.eventRegistry.add(window, 'resize', this._boundResizeCanvas);
        } else if (typeof window !== 'undefined' && window.addEventListener) {
            window.addEventListener('resize', this._boundResizeCanvas);
        }
        this.resizeCanvas();

        // Dev Panel (only if dev mode is enabled)
        this.devPanel = null;
        if (typeof DevConfig !== 'undefined' && DevConfig.DEV_MODE_ENABLED) {
            this.devPanel = new DevPanel(this);
            console.log('🛠️ Dev Mode enabled - press ` to toggle panel');
        }
    }

    setRunMapSelection(mapKey) {
        if (this.runState && this.runState.setRunMapSelection) {
            this.runMapSelection = this.runState.setRunMapSelection(mapKey);
            return;
        }
        this.runMapSelection = mapKey === 'random' || MapConfigs[mapKey] ? mapKey : 'random';
    }

    selectMapConfig() {
        if (this.runState && this.runState.selectMapConfig) {
            this.runState.syncFromEngine(this);
            const selection = this.runState.selectMapConfig();
            this.runState.applyMapSelection(selection).syncToEngine(this);
            return selection;
        }
        if (this.runMapSelection && this.runMapSelection !== 'random' && MapConfigs[this.runMapSelection]) {
            return { key: this.runMapSelection, config: MapConfigs[this.runMapSelection] };
        }

        const configKeys = Object.keys(MapConfigs);
        const randomKey = configKeys[Math.floor(Math.random() * configKeys.length)];
        return { key: randomKey, config: MapConfigs[randomKey] };
    }

    applyDevCameraZoom() {
        const zoom = (typeof DevConfig !== 'undefined' && DevConfig.DEV_MODE_ENABLED)
            ? DevConfig.cameraZoom
            : 1;
        this.camera.setZoom(zoom || 1);
    }

    resizeCanvas() {
        const parent = this.canvas.parentElement;
        const rect = parent.getBoundingClientRect();
        const pixelRatio = window.devicePixelRatio || 1;
        this.canvas.width = Math.max(1, Math.round(rect.width * pixelRatio));
        this.canvas.height = Math.max(1, Math.round(rect.height * pixelRatio));
        this.camera.updateDimensions(this.canvas.width, this.canvas.height);
        this.applyDevCameraZoom();
    }

    isDevOverlayVisible() {
        return Boolean(typeof DevConfig !== 'undefined' && DevConfig.DEV_MODE_ENABLED && this.devPanel && this.devPanel.visible);
    }

    getHudElements() {
        if (this.hudAdapter && this.hudAdapter.getElements) return this.hudAdapter.getElements();
        if (!this.hud && typeof HudController !== 'undefined') this.hud = new HudController();
        if (this.hud) return this.hud.getElements();
        if (!this._hudState) this._hudState = {};
        if (this._hudElements) return this._hudElements;

        const actionSlots = {};
        ['weapon1', 'weapon2', 'trinket1', 'trinket2'].forEach(slotName => {
            const slot = document.getElementById(`slot-${slotName}`);
            actionSlots[slotName] = {
                slot: slot,
                icon: slot ? slot.querySelector('.action-icon') : null,
                cooldownOverlay: slot ? slot.querySelector('.cooldown-overlay') : null
            };
        });

        const passiveBuffContainer = document.getElementById('passive-buff-container');
        const healingWellBuff = document.getElementById('passive-buff-healing-well');

        this._hudElements = {
            healthFill: document.getElementById('player-health-bar-fill'),
            healthText: document.getElementById('player-health-bar-text'),
            shieldContainer: document.getElementById('player-shield-bar-container'),
            shieldFill: document.getElementById('player-shield-bar-fill'),
            shieldText: document.getElementById('player-shield-bar-text'),
            bossContainer: document.getElementById('boss-health-bar-container'),
            bossRows: document.getElementById('boss-health-bar-rows'),
            bossFill: document.getElementById('boss-health-bar-fill'),
            bossText: document.getElementById('boss-health-bar-text'),
            minimapInfo: document.getElementById('minimap-info'),
            minimapHud: document.getElementById('minimap-hud'),
            minimapFloorLabel: document.getElementById('minimap-floor-label'),
            minimapMapLabel: document.getElementById('minimap-map-label'),
            interactionHint: document.getElementById('interaction-hint'),
            passiveBuffs: {
                container: passiveBuffContainer,
                healingWell: healingWellBuff,
                icon: healingWellBuff && healingWellBuff.querySelector ? healingWellBuff.querySelector('.passive-buff-icon') : null,
                stack: healingWellBuff && healingWellBuff.querySelector ? healingWellBuff.querySelector('.passive-buff-stack') : null,
                time: healingWellBuff && healingWellBuff.querySelector ? healingWellBuff.querySelector('.passive-buff-time') : null
            },
            actionSlots: actionSlots
        };
        return this._hudElements;
    }

    ensureBossHudRows(count) {
        if (this.hudAdapter && this.hudAdapter.ensureBossRows) return this.hudAdapter.ensureBossRows(count);
        if (!this.hud && typeof HudController !== 'undefined') this.hud = new HudController();
        if (this.hud) return this.hud.ensureBossRows(count);
        const hud = this.getHudElements();
        const rowHost = hud.bossRows || hud.bossContainer;
        if (!rowHost || !rowHost.children || !document || !document.createElement) return [];

        while (rowHost.children.length < count) {
            const row = document.createElement('div');
            row.className = 'boss-health-bar-row';

            const fill = document.createElement('div');
            fill.className = 'boss-health-bar-fill';

            const text = document.createElement('div');
            text.className = 'boss-health-bar-text';

            row.appendChild(fill);
            row.appendChild(text);
            rowHost.appendChild(row);
        }

        return Array.from(rowHost.children);
    }

    getVisibleBossEncounters() {
        if (this.encounterService && this.encounterService.getVisibleBossEncounters) {
            return this.encounterService.getVisibleBossEncounters(this);
        }
        return (this.enemies || [])
            .filter(enemy => enemy && (enemy.isBossTier || enemy.isBoss) && enemy.hp > 0 && (enemy.hasTakenPlayerDamage || enemy.isAggroed));
    }

    setHudText(key, element, value) {
        if (this.hudAdapter && this.hudAdapter.setText) {
            this.hudAdapter.setText(key, element, value);
            return;
        }
        if (!this.hud && typeof HudController !== 'undefined') this.hud = new HudController();
        if (this.hud) {
            this.hud.setText(key, element, value);
            return;
        }
        if (!element) return;
        if (!this._hudState) this._hudState = {};
        const nextValue = String(value);
        if (this._hudState[key] === nextValue) return;
        element.textContent = nextValue;
        this._hudState[key] = nextValue;
    }

    setHudStyle(key, element, property, value) {
        if (this.hudAdapter && this.hudAdapter.setStyle) {
            this.hudAdapter.setStyle(key, element, property, value);
            return;
        }
        if (!this.hud && typeof HudController !== 'undefined') this.hud = new HudController();
        if (this.hud) {
            this.hud.setStyle(key, element, property, value);
            return;
        }
        if (!element) return;
        if (!this._hudState) this._hudState = {};
        const nextValue = String(value);
        if (this._hudState[key] === nextValue) return;
        element.style[property] = nextValue;
        this._hudState[key] = nextValue;
    }

    setHudItemIcon(slotKey, element, item, fallbackText, fallbackColor) {
        if (this.hudAdapter && this.hudAdapter.setItemIcon) {
            this.hudAdapter.setItemIcon(slotKey, element, item, fallbackText, fallbackColor);
            return;
        }
        if (!this.hud && typeof HudController !== 'undefined') this.hud = new HudController();
        if (this.hud) {
            this.hud.setItemIcon(slotKey, element, item, fallbackText, fallbackColor);
            return;
        }
        if (!element) return;
        const assets = typeof window !== 'undefined' ? window.gloomvaultAssets : null;
        const icon = assets && assets.getLootIcon ? assets.getLootIcon(item) : null;
        const imageValue = icon && icon.src ? `url("${icon.src}")` : 'none';

        this.setHudStyle(`${slotKey}Image`, element, 'backgroundImage', imageValue);
        this.setHudStyle(`${slotKey}ImageSize`, element, 'backgroundSize', icon ? '100% 100%' : 'auto');
        this.setHudStyle(`${slotKey}ImageRepeat`, element, 'backgroundRepeat', 'no-repeat');
        this.setHudStyle(`${slotKey}ImagePosition`, element, 'backgroundPosition', 'center');

        if (icon) {
            this.setHudStyle(`${slotKey}Color`, element, 'backgroundColor', 'transparent');
            this.setHudText(`${slotKey}Text`, element, fallbackText);
            return;
        }

        this.setHudStyle(`${slotKey}Color`, element, 'backgroundColor', fallbackColor);
        this.setHudText(`${slotKey}Text`, element, fallbackText);
    }

    setHudHidden(key, element, hidden) {
        if (this.hudAdapter && this.hudAdapter.setHidden) {
            this.hudAdapter.setHidden(key, element, hidden);
            return;
        }
        if (!this.hud && typeof HudController !== 'undefined') this.hud = new HudController();
        if (this.hud) {
            this.hud.setHidden(key, element, hidden);
            return;
        }
        if (!element || !element.classList) return;
        if (!this._hudState) this._hudState = {};
        const nextValue = Boolean(hidden);
        if (this._hudState[key] === nextValue) return;
        if (element.classList.toggle) {
            element.classList.toggle('hidden', nextValue);
        } else if (nextValue) {
            element.classList.add('hidden');
        } else {
            element.classList.remove('hidden');
        }
        this._hudState[key] = nextValue;
    }

    showInteractionHint(text) {
        if (this.hudAdapter && this.hudAdapter.showInteractionHint) {
            this.hudAdapter.showInteractionHint(text);
            return;
        }
        if (!this.hud && typeof HudController !== 'undefined') this.hud = new HudController();
        if (this.hud) this.hud.showInteractionHint(text);
    }

    hideInteractionHint() {
        if (this.hudAdapter && this.hudAdapter.hideInteractionHint) {
            this.hudAdapter.hideInteractionHint();
            return;
        }
        if (!this.hud && typeof HudController !== 'undefined') this.hud = new HudController();
        if (this.hud) this.hud.hideInteractionHint();
    }

    getPlayerRangedProjectiles() {
        const scratch = this._playerRangedProjectiles || (this._playerRangedProjectiles = []);
        scratch.length = 0;
        const projectiles = this.projectiles || [];
        for (let i = 0; i < projectiles.length; i++) {
            const projectile = projectiles[i];
            if (!projectile || projectile.markedForDeletion || !projectile.isPlayerOwned || projectile.isMelee) continue;
            scratch.push(projectile);
        }
        return scratch;
    }

    start() {
        if (this.state === 'PLAYING' && this.player) {
            this.resumeLoop();
            return;
        }
        if (this.isRunning) {
            this.pauseLoop();
        }

        console.log('🎮 Starting Game Engine Loop');
        
        // Ensure canvas is properly sized now that it's visible
        this.resizeCanvas();
        
        this.input.attach(this.canvas);
        
        this.generateFloor(false);
        
        if (this.player && this.combatFeedback) {
            this.combatFeedback.addText(`Floor ${this.currentFloor}`, this.player.x, this.player.y - 40, '#a335ee', 20, 2.0);
        }

        this.state = 'PLAYING';
        this.resumeLoop();
    }

    descendToNextFloor() {
        this.currentFloor += typeof DifficultyConfig !== 'undefined' ? DifficultyConfig.descentFloorIncrement : 1;
        console.log(`Descending to floor ${this.currentFloor}`);
        this.generateFloor(true);
        this.combatFeedback.addText(`Floor ${this.currentFloor}`, this.player.x, this.player.y - 40, '#a335ee', 20, 2.0);
    }

    jumpToFloor(targetFloor) {
        this.currentFloor = Math.max(1, targetFloor);
        console.log(`🛠️ Jumping to floor ${this.currentFloor}`);
        this.generateFloor(true);
        this.combatFeedback.addText(`Floor ${this.currentFloor} (DEV)`, this.player.x, this.player.y - 40, '#ff8000', 20, 2.0);
    }

    generateFloor(isNextFloor) {
        if (!this.floorOrchestrator || !this.floorOrchestrator.generateFloor) {
            throw new Error('FloorOrchestrator is required to generate Gloomvault floors');
        }
        return this.floorOrchestrator.generateFloor(this, isNextFloor);
    }

    getEffectiveFloorLevel() {
        if (this.runState && this.runState.getEffectiveFloorLevel) {
            this.runState.syncFromEngine(this);
            return this.runState.getEffectiveFloorLevel();
        }
        return (this.currentFloor - 1) + (this.gearDifficultyFloor || 1);
    }

    createBossEnemy(x, y, encounterProfile, hpMult, dmgMult, extraOptions = {}) {
        if (this.encounterService && this.encounterService.createBossEnemy) {
            return this.encounterService.createBossEnemy(this, x, y, encounterProfile, hpMult, dmgMult, extraOptions);
        }
        const enemy = new Enemy(x, y, encounterProfile.baseType || 'boss', hpMult, dmgMult, {
            ...extraOptions,
            bossProfile: encounterProfile,
            aiProfile: encounterProfile.aiProfile || encounterProfile.baseType || 'boss'
        });
        if (enemy.triggerBossHooks) {
            enemy.triggerBossHooks('onSpawn', this, {});
        }
        return enemy;
    }

    spawnEnemyPackNear(originX, originY, count, enemyTypes, hpMultiplier, damageMultiplier) {
        const spawned = [];
        const types = Array.isArray(enemyTypes) && enemyTypes.length > 0 ? enemyTypes : ['grunt'];
        for (let i = 0; i < count; i++) {
            const safePos = this.findNearbyFloorPosition(originX, originY, 5 + i);
            if (!safePos) continue;
            const type = types[i % types.length];
            spawned.push(new Enemy(safePos.x, safePos.y, type, hpMultiplier, damageMultiplier));
        }
        this.enemies.push(...spawned);
        return spawned;
    }

    spawnBossAdds(enemy, options = {}) {
        if (!enemy) return [];
        const effectiveFloorLevel = this.getEffectiveFloorLevel();
        const hpScale = typeof DifficultyConfig !== 'undefined' ? DifficultyConfig.enemyHpScale : 0.2;
        const dmgScale = typeof DifficultyConfig !== 'undefined' ? DifficultyConfig.enemyDamageScale : 0.2;
        const baseHpMult = 1 + (effectiveFloorLevel * hpScale);
        const baseDmgMult = 1 + (effectiveFloorLevel * dmgScale);

        return this.spawnEnemyPackNear(
            enemy.x,
            enemy.y,
            options.count || 1,
            options.enemyTypes || ['grunt'],
            baseHpMult * (options.hpMultiplier || 0.75),
            baseDmgMult * (options.damageMultiplier || 0.75)
        );
    }

    findNearbyFloorPosition(originX, originY, radiusTiles = 5) {
        if (!this.mapGen) return null;
        const tileSize = this.mapGen.tileSize || this.tileSize || 64;
        const originTileX = Math.floor(originX / tileSize);
        const originTileY = Math.floor(originY / tileSize);

        for (let radius = 1; radius <= radiusTiles; radius++) {
            for (let y = originTileY - radius; y <= originTileY + radius; y++) {
                for (let x = originTileX - radius; x <= originTileX + radius; x++) {
                    if (x < 0 || y < 0 || x >= this.mapGen.cols || y >= this.mapGen.rows) continue;
                    if (this.mapGen.getTile(x, y) !== 1) continue;
                    return { x: x * tileSize + tileSize / 2, y: y * tileSize + tileSize / 2 };
                }
            }
        }

        return null;
    }

    showBossCombatText(enemy, text, color = '#ffffff') {
        if (!enemy || !this.combatFeedback) return;
        this.combatFeedback.addText(text, enemy.x, enemy.y - Math.max(18, enemy.height * 0.5), color, 14, 0.9);
    }

    emitBossPulse(enemy, color = '#ffffff', count = 18) {
        if (this.particleSystem) {
            this.particleSystem.emitImpact(enemy.x, enemy.y, color, count);
        }
    }

    createBossHazardCloud(enemy, options = {}) {
        if (!enemy) return false;
        this.trinketEffects.push({
            kind: 'element_cloud',
            x: enemy.x,
            y: enemy.y,
            radius: options.radius || 120,
            element: options.element || 'poison',
            color: options.color || this.getElementFallbackColor(options.element || 'poison'),
            duration: options.duration || 3,
            owner: 'enemy',
            timer: 0,
            tickTimer: 0
        });
        this.emitBossPulse(enemy, options.color || this.getElementFallbackColor(options.element || 'poison'), 28);
        return true;
    }

    triggerBorrowedBossPower(enemy, power, player) {
        if (!enemy || !power || !player) return false;
        if (power.id === 'lightning_strike') {
            if (this.combatFeedback) {
                this.combatFeedback.addText('Stormbound', player.x, player.y - 28, '#f5e66b', 14, 0.7);
            }
            let totalDamage = Math.max(8, Math.round((enemy.weapon && enemy.weapon.damage ? enemy.weapon.damage : 20) * 0.8));
            const damageInfo = this.player.takeDamage(totalDamage);
            if (damageInfo.shield > 0 && this.combatFeedback) {
                this.combatFeedback.addText(`-${Math.round(damageInfo.shield)}`, this.player.x, this.player.y - 10, '#3498db', 14, 0.8);
            }
            if (damageInfo.hp > 0 && this.combatFeedback) {
                this.combatFeedback.addText(`-${Math.round(damageInfo.hp)}`, this.player.x, this.player.y, '#f5e66b', 14, 0.8);
            }
            this.emitBossPulse(enemy, '#f5e66b', 22);
            return true;
        }
        if (power.id === 'phase_tether') {
            const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
            const distance = Math.min((this.tileSize || 64) * 2.5, Math.hypot(player.x - enemy.x, player.y - enemy.y) - 48);
            const target = this.findNearbyFloorPosition(enemy.x + Math.cos(angle) * distance, enemy.y + Math.sin(angle) * distance, 3);
            if (target) {
                enemy.x = target.x;
                enemy.y = target.y;
                enemy.pathTimer = 0;
                this.showBossCombatText(enemy, 'Phase Shift', '#d8b4ff');
                this.emitBossPulse(enemy, '#d8b4ff', 20);
                return true;
            }
            return false;
        }
        if (power.id === 'element_bomb_fire') {
            const used = this.throwBossElementBomb(enemy, player, {
                element: 'fire',
                damage: Math.max(16, Math.round((enemy.weapon && enemy.weapon.damage ? enemy.weapon.damage : 28) * 0.45)),
                range: Math.max(360, Math.hypot(player.x - enemy.x, player.y - enemy.y) + 80),
                radius: 110,
                cloudDuration: 2.8,
                color: '#ff5a2f',
                attackName: 'Fire Bomb'
            });
            if (used) {
                this.showBossCombatText(enemy, 'Fire Bomb', '#ff5a2f');
                this.emitBossPulse(enemy, '#ff5a2f', 24);
            }
            return used;
        }
        return false;
    }

    getDungeonServiceExclusions(startPos = null) {
        const exclusions = [];
        if (startPos) exclusions.push(startPos);
        if (this.portal) exclusions.push(this.portal);
        for (const transition of this.floorTransitions || []) exclusions.push(transition);
        for (const chest of this.lootChests || []) exclusions.push(chest);
        for (const button of this.bossRoomButtons || []) exclusions.push(button);
        for (const service of this.dungeonServices || []) exclusions.push(service);
        return exclusions;
    }

    spawnDungeonServices(startPos) {
        if (!this.mapGen || !this.mapGen.getLargeObjectPositions) return;

        const minDistance = this.tileSize * 5;
        const trySpawn = (chance, createService) => {
            if (Math.random() >= chance) return null;
            const positions = this.mapGen.getLargeObjectPositions(1, this.getDungeonServiceExclusions(startPos), minDistance);
            if (positions.length === 0) return null;
            const pos = positions[0];
            const service = createService(pos.x, pos.y);
            this.dungeonServices.push(service);
            return service;
        };

        if (typeof BlacksmithObject !== 'undefined') {
            trySpawn(0.08, (x, y) => new BlacksmithObject(x, y));
        }
        if (typeof VoidBankObject !== 'undefined') {
            trySpawn(0.06, (x, y) => new VoidBankObject(x, y));
        }
        if (typeof HealingWellObject !== 'undefined') {
            trySpawn(0.07, (x, y) => new HealingWellObject(x, y));
        }
    }

    getFloorTransitionRoomKey(x, y) {
        if (!this.mapGen || !this.mapGen.rooms || !this.mapGen.isTileInsideRoom) return null;

        const tileX = Math.floor(x / this.mapGen.tileSize);
        const tileY = Math.floor(y / this.mapGen.tileSize);

        for (let i = 0; i < this.mapGen.rooms.length; i++) {
            const room = this.mapGen.rooms[i];
            if (this.mapGen.isTileInsideRoom(tileX, tileY, room)) {
                return `room:${i}`;
            }
        }

        return `tile:${tileX},${tileY}`;
    }

    tryAddFloorTransition(x, y, type) {
        const roomKey = this.getFloorTransitionRoomKey(x, y);
        const alreadyUsed = this.floorTransitions.some(transition => this.getFloorTransitionRoomKey(transition.x, transition.y) === roomKey);
        if (alreadyUsed) return null;

        const transition = new FloorTransition(x, y, type);
        this.floorTransitions.push(transition);
        return transition;
    }

    getFallbackExitPosition(startPos) {
        if (!this.mapGen || !this.mapGen.rooms || this.mapGen.rooms.length === 0) return null;

        const rooms = this.mapGen.rooms;
        let targetRoom = null;
        let bestDistance = -1;

        for (const room of rooms.slice(1)) {
            const roomPos = this.mapGen.getValidFloorPosNear(room.center.x, room.center.y);
            const dx = roomPos.x - startPos.x;
            const dy = roomPos.y - startPos.y;
            const distance = dx * dx + dy * dy;
            if (distance > bestDistance) {
                bestDistance = distance;
                targetRoom = room;
            }
        }

        if (!targetRoom) {
            targetRoom = rooms[0];
        }

        const fallbackPos = this.mapGen.getValidFloorPosNear(targetRoom.center.x, targetRoom.center.y);
        if (!fallbackPos) return null;

        const distanceToPlayer = Math.hypot(fallbackPos.x - startPos.x, fallbackPos.y - startPos.y);
        if (targetRoom === rooms[0] && distanceToPlayer < 120) {
            const devSpawn = this.getDevSpawnPosition(160);
            return devSpawn || fallbackPos;
        }

        return fallbackPos;
    }

    ensureDungeonExit(startPos) {
        if (this.portal || this.floorTransitions.length > 0) return;

        const fallbackPos = this.getFallbackExitPosition(startPos);
        if (fallbackPos) {
            const transition = this.tryAddFloorTransition(fallbackPos.x, fallbackPos.y, 'door');
            if (transition) return;
        }

        if (startPos) {
            this.portal = new ExtractionPortal(startPos.x, startPos.y);
        }
    }

    getDevSpawnPosition(distance = 80) {
        if (!this.player || !this.mapGen) return null;

        const rawX = this.player.x + Math.cos(this.player.angle) * distance;
        const rawY = this.player.y + Math.sin(this.player.angle) * distance;
        const tileX = Math.floor(rawX / this.mapGen.tileSize);
        const tileY = Math.floor(rawY / this.mapGen.tileSize);
        const snapped = this.mapGen.getValidFloorPosNear(tileX, tileY);

        return snapped || { x: rawX, y: rawY };
    }

    spawnDevFloorTransition(type) {
        const spawnPos = this.getDevSpawnPosition(80);
        if (!spawnPos) return null;

        const transition = new FloorTransition(spawnPos.x, spawnPos.y, type);
        this.floorTransitions.push(transition);
        return transition;
    }

    spawnDevPortal() {
        const spawnPos = this.getDevSpawnPosition(80);
        if (!spawnPos) return null;

        this.portal = new ExtractionPortal(spawnPos.x, spawnPos.y);
        return this.portal;
    }

    spawnDevDungeonService(kind) {
        const spawnPos = this.getDevSpawnPosition(120);
        if (!spawnPos) return null;
        if (!this.dungeonServices) this.dungeonServices = [];

        let service = null;
        if (kind === 'blacksmith' && typeof BlacksmithObject !== 'undefined') {
            service = new BlacksmithObject(spawnPos.x, spawnPos.y);
        } else if (kind === 'bank' && typeof VoidBankObject !== 'undefined') {
            service = new VoidBankObject(spawnPos.x, spawnPos.y);
        } else if (kind === 'healingWell' && typeof HealingWellObject !== 'undefined') {
            service = new HealingWellObject(spawnPos.x, spawnPos.y);
        }

        if (service) {
            this.dungeonServices.push(service);
        }
        return service;
    }

    stop() {
        console.log('⏸️ Stopping Game Engine Loop');
        this.pauseLoop();
        if (this.input && this.input.detach) {
            this.input.detach();
        }
        this.state = 'MENU';
    }

    destroy() {
        if (this._destroyed) return;
        this._destroyed = true;
        this.pauseLoop();
        if (this.input && this.input.destroy) {
            this.input.destroy();
        } else if (this.input && this.input.detach) {
            this.input.detach();
        }
        if (this.eventRegistry) {
            this.eventRegistry.removeAll();
        } else if (typeof window !== 'undefined' && window.removeEventListener) {
            window.removeEventListener('resize', this._boundResizeCanvas);
        }
        this._hudElements = null;
        this._hudState = {};
        if (this.hudAdapter && this.hudAdapter.destroy) {
            this.hudAdapter.destroy();
        }
        if (this.hud) {
            this.hud._elements = null;
            this.hud._state = {};
        }
        this.state = 'MENU';
    }

    pauseLoop() {
        this.isRunning = false;
        if (this._animationFrameId !== null && typeof cancelAnimationFrame === 'function') {
            cancelAnimationFrame(this._animationFrameId);
        }
        this._animationFrameId = null;
    }

    resumeLoop() {
        if (this.state !== 'PLAYING' || this.isRunning) return;

        if (this._animationFrameId !== null && typeof cancelAnimationFrame === 'function') {
            cancelAnimationFrame(this._animationFrameId);
            this._animationFrameId = null;
        }
        this.isRunning = true;
        this.lastTime = performance.now();
        this._animationFrameId = requestAnimationFrame((time) => this.loop(time));
    }

    getElementConfig(element) {
        if (this.combatSystem && this.combatSystem.getElementConfig) return this.combatSystem.getElementConfig(element);
        if (!element || typeof CombatConfig === 'undefined' || !CombatConfig.elemental) return null;
        return CombatConfig.elemental[element] || null;
    }

    getStatusEffect(target, type) {
        if (this.combatSystem && this.combatSystem.getStatusEffect) return this.combatSystem.getStatusEffect(target, type);
        if (!target.statusEffects) target.statusEffects = [];
        return target.statusEffects.find(effect => effect.type === type);
    }

    applyStatusEffect(target, type, values = {}) {
        if (this.combatSystem && this.combatSystem.applyStatusEffect) {
            return this.combatSystem.applyStatusEffect(target, type, values);
        }
        if (!target || !type) return null;
        if (!target.statusEffects) target.statusEffects = [];

        const existing = this.getStatusEffect(target, type);
        if (existing && !values.stackable) {
            Object.assign(existing, values, {
                type: type,
                durationLeft: Math.max(existing.durationLeft || 0, values.duration || values.durationLeft || 0)
            });
            return existing;
        }

        if (existing && values.stackable) {
            existing.stacks = Math.min(values.maxStacks || 99, (existing.stacks || 1) + 1);
            existing.durationLeft = values.duration || existing.durationLeft;
            existing.damagePerSecond = values.damagePerSecond || existing.damagePerSecond;
            return existing;
        }

        const effect = {
            type: type,
            durationLeft: values.duration || values.durationLeft || 0,
            damagePerSecond: values.damagePerSecond || 0,
            color: values.color || '#ffffff',
            slowMultiplier: values.slowMultiplier || 1,
            damageTakenMultiplier: values.damageTakenMultiplier || 1,
            stacks: values.stacks || 1,
            stackable: Boolean(values.stackable)
        };
        target.statusEffects.push(effect);
        return effect;
    }

    applyElementalHit(target, projectile) {
        if (this.combatSystem && this.combatSystem.applyElementalHit) {
            return this.combatSystem.applyElementalHit(target, projectile);
        }
        if (!target || !projectile || !projectile.element) return;

        const config = this.getElementConfig(projectile.element);
        if (!config) return;

        switch (projectile.element) {
            case 'frost':
                this.applyStatusEffect(target, 'frost', {
                    duration: config.duration,
                    slowMultiplier: config.slowMultiplier,
                    color: config.color
                });
                break;
            case 'fire':
                this.applyStatusEffect(target, 'fire', {
                    duration: config.duration,
                    damagePerSecond: config.damagePerSecond,
                    color: config.color
                });
                break;
            case 'felfire':
                this.applyStatusEffect(target, 'felfire', {
                    duration: config.duration,
                    damagePerSecond: config.damagePerSecond,
                    maxStacks: config.maxStacks,
                    stackable: true,
                    color: config.color
                });
                break;
            case 'holy':
                this.applyStatusEffect(target, 'radiance', {
                    duration: config.duration,
                    color: config.color
                });
                break;
            case 'shadow':
                this.applyStatusEffect(target, 'amplify', {
                    duration: config.duration,
                    damageTakenMultiplier: config.damageTakenMultiplier,
                    color: config.color
                });
                break;
            case 'poison':
                this.applyStatusEffect(target, 'sickness', {
                    duration: config.duration,
                    damagePerSecond: config.damagePerSecond,
                    color: config.color
                });
                break;
        }
    }

    getDamageTakenMultiplier(target) {
        if (this.combatSystem && this.combatSystem.getDamageTakenMultiplier) {
            return this.combatSystem.getDamageTakenMultiplier(target);
        }
        const amplify = this.getStatusEffect(target, 'amplify');
        return amplify ? amplify.damageTakenMultiplier || 1 : 1;
    }

    dealStatusDamage(target, amount) {
        if (this.combatSystem && this.combatSystem.dealStatusDamage) {
            return this.combatSystem.dealStatusDamage(this, target, amount);
        }
        if (!target || amount <= 0) return 0;
        if (target === this.player && typeof DevConfig !== 'undefined' && DevConfig.godMode) return 0;

        const previousHp = target.hp;
        target.hp = Math.max(0, target.hp - amount);
        return Math.max(0, previousHp - target.hp);
    }

    showStatusDamageText(target, amount, color) {
        if (this.combatSystem && this.combatSystem.showStatusDamageText) {
            return this.combatSystem.showStatusDamageText(this, target, amount, color);
        }
        if (!target || amount <= 0 || !this.combatFeedback || !this.combatFeedback.addText) return;

        this.combatFeedback.addText(`-${Math.round(amount)}`, target.x, target.y - 14, color || '#ff0000', 12, 0.75);
    }

    processStatusEffects(target, dt) {
        if (this.combatSystem && this.combatSystem.processStatusEffects) {
            return this.combatSystem.processStatusEffects(this, target, dt);
        }
        if (!target || !target.statusEffects) return;

        let speedMultiplier = 1;
        for (let i = target.statusEffects.length - 1; i >= 0; i--) {
            const effect = target.statusEffects[i];
            effect.durationLeft -= dt;

            if (effect.type === 'frost') {
                speedMultiplier = Math.min(speedMultiplier, effect.slowMultiplier || 1);
            }

            if (effect.damagePerSecond > 0) {
                const actualDamage = this.dealStatusDamage(target, effect.damagePerSecond * (effect.stacks || 1) * dt);
                if (actualDamage > 0) {
                    effect.damageTextAccumulator = (effect.damageTextAccumulator || 0) + actualDamage;
                    effect.damageTextTimer = (effect.damageTextTimer || 0) + dt;

                    const shouldShowDamageText = effect.damageTextTimer >= 0.5 || target.hp <= 0 || effect.durationLeft <= 0;
                    if (shouldShowDamageText && effect.damageTextAccumulator >= 0.5) {
                        this.showStatusDamageText(target, effect.damageTextAccumulator, effect.color);
                        effect.damageTextAccumulator = 0;
                        effect.damageTextTimer = 0;
                    }
                }
            }

            if (effect.durationLeft <= 0) {
                target.statusEffects.splice(i, 1);
            }
        }

        target.statusSpeedMultiplier = speedMultiplier;
    }

    hasStatusEffect(target, type) {
        if (this.combatSystem && this.combatSystem.hasStatusEffect) {
            return this.combatSystem.hasStatusEffect(target, type);
        }
        return Boolean(target && target.statusEffects && target.statusEffects.some(effect => effect.type === type));
    }

    handleElementalDeathBurst(deadEnemy) {
        const hasRadiance = this.hasStatusEffect(deadEnemy, 'radiance');
        const hasSickness = this.hasStatusEffect(deadEnemy, 'sickness');
        if (!hasRadiance && !hasSickness) return;

        if (hasRadiance) {
            this.spawnRadianceDeathProjectiles(deadEnemy);
        }

        if (hasSickness) {
            this.spawnPoisonDeathProjectiles(deadEnemy);
        }
    }

    spawnRadianceDeathProjectiles(deadEnemy) {
        const config = this.getElementConfig('holy');
        if (!config || typeof Projectile === 'undefined') return;

        const projectileCount = 8;
        const speed = 420;
        const lifetime = (config.burstRadius || 340) / speed;
        if (!this.projectiles) this.projectiles = [];

        for (let i = 0; i < projectileCount; i++) {
            const angle = (Math.PI * 2 / projectileCount) * i;
            const spawnX = deadEnemy.x + Math.cos(angle) * 15;
            const spawnY = deadEnemy.y + Math.sin(angle) * 15;
            const projectile = new Projectile(spawnX, spawnY, angle, speed, config.burstDamage || 18, lifetime, true, 'pistol', {
                element: 'holy',
                color: config.color,
                attackName: 'Radiance Burst'
            });
            projectile.width = 16;
            projectile.height = 16;
            this.projectiles.push(projectile);
        }

        if (this.particleSystem) {
            this.particleSystem.emitImpact(deadEnemy.x, deadEnemy.y, config.color || '#fff2a6', 35);
        }
    }

    spawnPoisonDeathProjectiles(deadEnemy) {
        const config = this.getElementConfig('poison');
        if (!config || typeof Projectile === 'undefined') return;

        const projectileCount = 8;
        const speed = 360;
        const lifetime = (config.burstRadius || 145) / speed;
        if (!this.projectiles) this.projectiles = [];

        for (let i = 0; i < projectileCount; i++) {
            const angle = (Math.PI * 2 / projectileCount) * i;
            const spawnX = deadEnemy.x + Math.cos(angle) * 15;
            const spawnY = deadEnemy.y + Math.sin(angle) * 15;
            const projectile = new Projectile(spawnX, spawnY, angle, speed, config.burstDamage || 10, lifetime, true, 'pistol', {
                element: 'poison',
                color: config.color,
                attackName: 'Sickness Burst'
            });
            projectile.width = 14;
            projectile.height = 14;
            this.projectiles.push(projectile);
        }

        if (this.particleSystem) {
            this.particleSystem.emitImpact(deadEnemy.x, deadEnemy.y, config.color || '#1f8f38', 25);
        }
    }

    consumePlayerTrinketAbilities() {
        if (this.abilitySystem && this.abilitySystem.consumePlayerTrinketAbilities) {
            return this.abilitySystem.consumePlayerTrinketAbilities(this);
        }
        if (!this.player || !this.player.pendingTrinketAbilities || this.player.pendingTrinketAbilities.length === 0) return;

        const abilities = this.player.pendingTrinketAbilities.splice(0);
        for (const request of abilities) {
            this.resolveTrinketAbility(request);
        }
    }

    resolveTrinketAbility(request) {
        if (this.abilitySystem && this.abilitySystem.resolveTrinketAbility) {
            return this.abilitySystem.resolveTrinketAbility(this, request);
        }
        if (!request || !request.ability || !this.player) return false;

        const ability = request.ability;
        switch (ability.type) {
            case 'scout':
                return this.revealMinimapArea(ability);
            case 'phase_tether':
                return this.phaseTether(ability, request.angle);
            case 'element_bomb':
                return this.throwElementBomb(ability, request.angle);
            case 'lightning_strike':
                return this.castLightningStrike(ability);
            case 'target_dummy':
                return this.spawnTargetDummy(ability, request.angle);
            case 'soul_siphon':
                return this.applySoulSiphon(ability);
        }
        return false;
    }

    revealMinimapArea(ability) {
        if (!this.player || !this.mapGen || !this.mapGen.visitedGrid) return false;

        const radius = Math.max(1, ability.revealRadius || 22);
        const pX = Math.floor(this.player.x / this.mapGen.tileSize);
        const pY = Math.floor(this.player.y / this.mapGen.tileSize);

        for (let y = pY - radius; y <= pY + radius; y++) {
            for (let x = pX - radius; x <= pX + radius; x++) {
                if (x < 0 || x >= this.mapGen.cols || y < 0 || y >= this.mapGen.rows) continue;
                if (Math.hypot(x - pX, y - pY) <= radius) {
                    this.mapGen.visitedGrid[y * this.mapGen.cols + x] = true;
                }
            }
        }

        if (this.combatFeedback) {
            this.combatFeedback.addText('Scouted', this.player.x, this.player.y - 36, '#66d9ff', 16, 1.1);
        }
        if (this.particleSystem) {
            this.particleSystem.emitImpact(this.player.x, this.player.y, '#66d9ff', 26);
        }
        return true;
    }

    phaseTether(ability, angle) {
        if (!this.player || !this.mapGen) return false;

        const tileSize = this.mapGen.tileSize || this.tileSize || 64;
        const minTiles = Math.max(1, ability.minTiles || 5);
        const maxTiles = Math.max(minTiles, ability.maxTiles || 10);
        const distance = maxTiles * tileSize;
        const rawX = this.player.x + Math.cos(angle || this.player.angle || 0) * distance;
        const rawY = this.player.y + Math.sin(angle || this.player.angle || 0) * distance;
        const tileX = Math.max(0, Math.min(this.mapGen.cols - 1, Math.floor(rawX / tileSize)));
        const tileY = Math.max(0, Math.min(this.mapGen.rows - 1, Math.floor(rawY / tileSize)));
        const destination = this.findSafePlayerLanding(tileX, tileY, minTiles * tileSize);

        if (!destination) {
            if (this.combatFeedback) {
                this.combatFeedback.addText('No Anchor', this.player.x, this.player.y - 28, '#ff5555', 14, 0.9);
            }
            return false;
        }

        const oldX = this.player.x;
        const oldY = this.player.y;
        this.player.x = destination.x;
        this.player.y = destination.y;
        if (this.player.checkCollision && this.player.checkCollision(this.mapGen)) {
            this.player.x = oldX;
            this.player.y = oldY;
            return false;
        }

        if (this.particleSystem) {
            this.particleSystem.emitDashTrail(oldX, oldY, '#9b7cff');
            this.particleSystem.emitImpact(destination.x, destination.y, '#9b7cff', 24);
        }
        if (this.combatFeedback) {
            this.combatFeedback.addText('Tethered', destination.x, destination.y - 28, '#9b7cff', 15, 0.9);
        }
        return true;
    }

    findSafePlayerLanding(tileX, tileY, minDistance = 0) {
        if (!this.player || !this.mapGen || !this.mapGen.getTile) return null;

        const maxSearch = Math.max(this.mapGen.cols, this.mapGen.rows);
        for (let radius = 0; radius <= maxSearch; radius++) {
            for (let y = tileY - radius; y <= tileY + radius; y++) {
                for (let x = tileX - radius; x <= tileX + radius; x++) {
                    if (Math.abs(x - tileX) !== radius && Math.abs(y - tileY) !== radius) continue;
                    if (x < 0 || x >= this.mapGen.cols || y < 0 || y >= this.mapGen.rows) continue;
                    if (this.mapGen.getTile(x, y) !== 1) continue;

                    const candidate = {
                        x: x * this.mapGen.tileSize + this.mapGen.tileSize / 2,
                        y: y * this.mapGen.tileSize + this.mapGen.tileSize / 2
                    };
                    if (minDistance > 0 && Math.hypot(candidate.x - this.player.x, candidate.y - this.player.y) < minDistance * 0.45) {
                        continue;
                    }

                    const oldX = this.player.x;
                    const oldY = this.player.y;
                    this.player.x = candidate.x;
                    this.player.y = candidate.y;
                    const blocked = this.player.checkCollision && this.player.checkCollision(this.mapGen);
                    this.player.x = oldX;
                    this.player.y = oldY;
                    if (!blocked) return candidate;
                }
            }
        }
        return null;
    }

    throwElementBomb(ability, angle) {
        if (!this.player || typeof Projectile === 'undefined') return false;

        const element = ability.element || 'fire';
        const config = this.getElementConfig(element) || {};
        const speed = 360;
        const range = ability.range || 420;
        const projectile = new Projectile(
            this.player.x,
            this.player.y,
            angle || this.player.angle || 0,
            speed,
            ability.damage || 18,
            range / speed,
            true,
            'pistol',
            {
                element: element,
                color: config.color || this.getElementFallbackColor(element),
                attackName: `${element} bomb`
            }
        );
        projectile.width = 18;
        projectile.height = 18;
        projectile.abilityEffect = 'element_bomb';
        projectile.bombRadius = ability.radius || 120;
        projectile.cloudDuration = ability.cloudDuration || 3;
        this.projectiles.push(projectile);
        return true;
    }

    throwBossElementBomb(enemy, player, options = {}) {
        if (!enemy || !player || typeof Projectile === 'undefined') return false;

        const element = options.element || 'fire';
        const config = this.getElementConfig(element) || {};
        const color = options.color || config.color || this.getElementFallbackColor(element);
        const speed = options.speed || 340;
        const range = options.range || Math.max(220, Math.hypot(player.x - enemy.x, player.y - enemy.y) + 60);
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        const projectile = new Projectile(
            enemy.x,
            enemy.y,
            angle,
            speed,
            options.damage || Math.max(12, Math.round((enemy.weapon && enemy.weapon.damage ? enemy.weapon.damage : 24) * 0.55)),
            range / speed,
            false,
            'pistol',
            {
                element,
                color,
                attackName: options.attackName || `${element} bomb`
            }
        );
        projectile.width = options.size || 18;
        projectile.height = options.size || 18;
        projectile.owner = enemy;
        projectile.abilityEffect = 'element_bomb';
        projectile.bombRadius = options.radius || 120;
        projectile.cloudDuration = options.cloudDuration || 3;
        this.projectiles.push(projectile);
        return true;
    }

    fireBossNova(enemy, options = {}) {
        if (!enemy || typeof Projectile === 'undefined') return false;
        const count = options.projectiles || 10;
        const color = options.color || this.getElementFallbackColor(options.element || 'lightning');
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const spawnX = enemy.x + Math.cos(angle) * Math.max(16, enemy.width * 0.3);
            const spawnY = enemy.y + Math.sin(angle) * Math.max(16, enemy.height * 0.3);
            const projectile = new Projectile(spawnX, spawnY, angle, options.speed || 360, options.damage || 18, options.lifetime || 1.4, false, 'pistol', {
                element: options.element || 'lightning',
                color,
                attackName: options.attackName || 'Boss Nova'
            });
            projectile.owner = enemy;
            this.projectiles.push(projectile);
        }
        return true;
    }

    fireBossCone(enemy, player, options = {}) {
        if (!enemy || !player || typeof Projectile === 'undefined') return false;
        const count = options.projectiles || 7;
        const spread = options.spread || 0.65;
        const baseAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        const startAngle = baseAngle - spread / 2;
        const color = options.color || this.getElementFallbackColor(options.element || 'lightning');
        for (let i = 0; i < count; i++) {
            const angle = startAngle + (count > 1 ? spread * (i / (count - 1)) : 0);
            const spawnX = enemy.x + Math.cos(angle) * Math.max(16, enemy.width * 0.35);
            const spawnY = enemy.y + Math.sin(angle) * Math.max(16, enemy.height * 0.35);
            const projectile = new Projectile(spawnX, spawnY, angle, options.speed || 520, options.damage || 16, options.lifetime || 1.15, false, 'shotgun', {
                element: options.element || 'lightning',
                color,
                attackName: options.attackName || 'Boss Cone'
            });
            projectile.owner = enemy;
            this.projectiles.push(projectile);
        }
        return true;
    }

    getElementFallbackColor(element) {
        const colors = {
            poison: '#1f8f38',
            fire: '#ff5a2f',
            felfire: '#67ff3a',
            lightning: '#f5e66b'
        };
        return colors[element] || '#ffffff';
    }

    explodeElementBomb(projectile) {
        if (!projectile || projectile._exploded) return false;
        projectile._exploded = true;

        const radius = projectile.bombRadius || 120;
        const isPlayerOwned = projectile.isPlayerOwned !== false;
        const color = projectile.color || this.getElementFallbackColor(projectile.element);
        if (isPlayerOwned) {
            for (const enemy of this.enemies || []) {
                if (!enemy || enemy.hp <= 0) continue;
                if (Math.hypot(enemy.x - projectile.x, enemy.y - projectile.y) > radius + enemy.width / 2) continue;
                const damageInfo = enemy.takeDamage(projectile.damage || 0);
                const actualDamage = Math.max(0, (damageInfo && damageInfo.hp ? damageInfo.hp : 0) + (damageInfo && damageInfo.shield ? damageInfo.shield : 0));
                if (enemy.handleDamagedByPlayer) {
                    enemy.handleDamagedByPlayer(this, projectile, actualDamage);
                } else {
                    enemy.hasTakenPlayerDamage = true;
                    enemy.isAggroed = true;
                }
                this.applyElementalHit(enemy, projectile);
                if (this.combatFeedback) {
                    this.combatFeedback.addText(`-${Math.round(projectile.damage || 0)}`, enemy.x, enemy.y, color, 14, 0.8);
                }
            }
        } else if (this.player && Math.hypot(this.player.x - projectile.x, this.player.y - projectile.y) <= radius + this.player.width / 2) {
            const damageInfo = this.player.takeDamage(projectile.damage || 0);
            this.applyElementalHit(this.player, projectile);
            if (projectile.owner && projectile.owner.handleHitPlayer) {
                projectile.owner.handleHitPlayer(this, damageInfo, projectile);
            }
            if (this.combatFeedback) {
                const total = Math.max(0, (damageInfo && damageInfo.hp ? damageInfo.hp : 0) + (damageInfo && damageInfo.shield ? damageInfo.shield : 0));
                if (total > 0) this.combatFeedback.addText(`-${Math.round(total)}`, this.player.x, this.player.y, color, 14, 0.8);
            } else {
                // no-op
            }
        }

        this.trinketEffects.push({
            kind: 'element_cloud',
            x: projectile.x,
            y: projectile.y,
            radius: radius,
            element: projectile.element,
            color: color,
            duration: projectile.cloudDuration || 3,
            owner: isPlayerOwned ? 'player' : 'enemy',
            timer: 0,
            tickTimer: 0
        });

        if (this.particleSystem) {
            this.particleSystem.emitImpact(projectile.x, projectile.y, color, 35);
        }
        if (this.camera) {
            this.camera.shake(4, 0.12);
        }
        return true;
    }

    castLightningStrike(ability) {
        const firstTarget = this.findNearestEnemy(this.player.x, this.player.y, Infinity, new Set());
        if (!firstTarget) {
            if (this.combatFeedback) {
                this.combatFeedback.addText('No Target', this.player.x, this.player.y - 28, '#bbbbbb', 14, 0.8);
            }
            return false;
        }

        const hitTargets = new Set();
        let origin = { x: this.player.x, y: this.player.y };
        let target = firstTarget;
        let damage = ability.damage || 48;
        const chains = Math.max(0, ability.chains || 3);
        const falloff = ability.falloff || 0.65;
        const range = ability.chainRange || 280;

        for (let jump = 0; target && jump <= chains; jump++) {
            hitTargets.add(target);
            const finalDamage = Math.round(damage);
            const damageInfo = target.takeDamage(finalDamage);
            const actualDamage = Math.max(0, (damageInfo && damageInfo.hp ? damageInfo.hp : 0) + (damageInfo && damageInfo.shield ? damageInfo.shield : 0));
            if (target.handleDamagedByPlayer) {
                target.handleDamagedByPlayer(this, { damage: finalDamage, element: 'lightning' }, actualDamage);
            } else {
                target.hasTakenPlayerDamage = true;
                target.isAggroed = true;
            }
            target.hitFlashTimer = Math.max(target.hitFlashTimer || 0, 0.1);

            this.trinketEffects.push({
                kind: 'lightning_arc',
                fromX: origin.x,
                fromY: origin.y - (jump === 0 ? 180 : 0),
                toX: target.x,
                toY: target.y,
                color: '#f5e66b',
                duration: 0.22,
                timer: 0
            });

            if (this.combatFeedback) {
                this.combatFeedback.addText(`-${finalDamage}`, target.x, target.y - 12, '#f5e66b', 15, 0.75);
            }
            if (this.particleSystem) {
                this.particleSystem.emitImpact(target.x, target.y, '#f5e66b', 18);
            }

            origin = target;
            damage *= falloff;
            target = this.findNearestEnemy(origin.x, origin.y, range, hitTargets);
        }

        return true;
    }

    findNearestEnemy(x, y, maxRange = Infinity, excluded = new Set()) {
        let closest = null;
        let closestDistance = maxRange;
        for (const enemy of this.enemies || []) {
            if (!enemy || enemy.hp <= 0 || excluded.has(enemy)) continue;
            const dist = Math.hypot(enemy.x - x, enemy.y - y);
            if (dist <= closestDistance) {
                closest = enemy;
                closestDistance = dist;
            }
        }
        return closest;
    }

    spawnTargetDummy(ability, angle) {
        if (!this.player || !this.mapGen) return false;

        const distance = Math.min((this.mapGen.tileSize || this.tileSize || 64) * 3, ability.radius || 180);
        const rawX = this.player.x + Math.cos(angle || this.player.angle || 0) * distance;
        const rawY = this.player.y + Math.sin(angle || this.player.angle || 0) * distance;
        const tileX = Math.floor(rawX / this.mapGen.tileSize);
        const tileY = Math.floor(rawY / this.mapGen.tileSize);
        const pos = this.findSafePlayerLanding(tileX, tileY, 0) || { x: this.player.x, y: this.player.y };
        const decoy = {
            x: pos.x,
            y: pos.y,
            width: this.player.width,
            height: this.player.height,
            hp: 1,
            maxHp: 1,
            angle: this.player.angle,
            isDecoy: true,
            timer: 0,
            duration: ability.duration || 4,
            radius: ability.radius || 520
        };
        this.decoys.push(decoy);
        for (const enemy of this.enemies || []) {
            if (!enemy || enemy.hp <= 0) continue;
            if (Math.hypot(enemy.x - decoy.x, enemy.y - decoy.y) <= decoy.radius) {
                enemy.isAggroed = true;
                enemy.pathTimer = 0;
            }
        }
        if (this.combatFeedback) {
            this.combatFeedback.addText('Decoy', decoy.x, decoy.y - 26, '#d8b4ff', 15, 0.9);
        }
        return true;
    }

    applySoulSiphon(ability) {
        if (!this.player) return false;
        this.player.soulSiphonTimer = Math.max(this.player.soulSiphonTimer || 0, ability.duration || 4);
        this.player.soulSiphonLifesteal = ability.lifesteal || 0.45;
        this.player.soulSiphonCapBonus = ability.lifesteal || 0.45;
        if (this.combatFeedback) {
            this.combatFeedback.addText('Soul Siphon', this.player.x, this.player.y - 32, '#b800ff', 16, 1.0);
        }
        if (this.particleSystem) {
            this.particleSystem.emitImpact(this.player.x, this.player.y, '#b800ff', 22);
        }
        return true;
    }

    updateTrinketRuntimeEffects(dt) {
        if (this.player && this.player.soulSiphonTimer > 0) {
            this.player.soulSiphonTimer = Math.max(0, this.player.soulSiphonTimer - dt);
            if (this.player.soulSiphonTimer <= 0) {
                this.player.soulSiphonLifesteal = 0;
                this.player.soulSiphonCapBonus = 0;
            }
        }

        if (!this.decoys) this.decoys = [];
        if (!this.trinketEffects) this.trinketEffects = [];

        for (let i = this.decoys.length - 1; i >= 0; i--) {
            const decoy = this.decoys[i];
            decoy.timer += dt;
            if (decoy.timer >= decoy.duration) {
                this.decoys.splice(i, 1);
            }
        }

        for (let i = this.trinketEffects.length - 1; i >= 0; i--) {
            const effect = this.trinketEffects[i];
            effect.timer += dt;
            if (effect.kind === 'element_cloud') {
                effect.tickTimer += dt;
                if (effect.tickTimer >= 0.35) {
                    effect.tickTimer = 0;
                    if (effect.owner === 'enemy') {
                        if (this.player && Math.hypot(this.player.x - effect.x, this.player.y - effect.y) <= effect.radius + this.player.width / 2) {
                            this.player.takeDamage(8);
                            this.applyElementalHit(this.player, { element: effect.element });
                            if (this.combatFeedback) {
                                this.combatFeedback.addText('-8', this.player.x, this.player.y, effect.color || '#ffffff', 13, 0.6);
                            }
                        }
                    } else {
                        for (const enemy of this.enemies || []) {
                            if (!enemy || enemy.hp <= 0) continue;
                            if (Math.hypot(enemy.x - effect.x, enemy.y - effect.y) <= effect.radius + enemy.width / 2) {
                                this.applyElementalHit(enemy, { element: effect.element });
                                enemy.isAggroed = true;
                            }
                        }
                    }
                }
            }
            if (effect.timer >= effect.duration) {
                this.trinketEffects.splice(i, 1);
            }
        }
    }

    getEnemyTargetForEnemy(enemy) {
        if (this.abilitySystem && this.abilitySystem.getEnemyTargetForEnemy) {
            return this.abilitySystem.getEnemyTargetForEnemy(this, enemy);
        }
        if (!enemy || !this.decoys || this.decoys.length === 0) return this.player;

        let bestDecoy = null;
        let bestDistance = Infinity;
        for (const decoy of this.decoys) {
            const dist = Math.hypot(enemy.x - decoy.x, enemy.y - decoy.y);
            if (dist <= decoy.radius && dist < bestDistance) {
                bestDecoy = decoy;
                bestDistance = dist;
            }
        }
        return bestDecoy || this.player;
    }

    handleAbilityProjectileEnd(projectile) {
        if (!projectile || !projectile.abilityEffect) return false;
        if (projectile.abilityEffect === 'element_bomb') {
            return this.explodeElementBomb(projectile);
        }
        return false;
    }

    renderTrinketEffects(ctx, renderer) {
        if (!renderer || !renderer.camera) return;

        for (const effect of this.trinketEffects || []) {
            if (effect.kind === 'element_cloud') {
                const screenPos = renderer.camera.worldToScreen(effect.x, effect.y);
                const alpha = Math.max(0.12, 0.32 * (1 - (effect.timer / effect.duration)));
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = effect.color || '#ffffff';
                ctx.beginPath();
                ctx.arc(screenPos.x, screenPos.y, effect.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = Math.min(0.65, alpha + 0.15);
                ctx.strokeStyle = effect.color || '#ffffff';
                ctx.lineWidth = 3;
                ctx.stroke();
                ctx.restore();
            } else if (effect.kind === 'lightning_arc') {
                const from = renderer.camera.worldToScreen(effect.fromX, effect.fromY);
                const to = renderer.camera.worldToScreen(effect.toX, effect.toY);
                const alpha = Math.max(0, 1 - (effect.timer / effect.duration));
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.strokeStyle = effect.color || '#f5e66b';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(from.x, from.y);
                const midX = (from.x + to.x) / 2 + Math.sin(effect.timer * 80) * 8;
                const midY = (from.y + to.y) / 2 + Math.cos(effect.timer * 70) * 8;
                ctx.lineTo(midX, midY);
                ctx.lineTo(to.x, to.y);
                ctx.stroke();
                ctx.restore();
            }
        }

        for (const decoy of this.decoys || []) {
            const screenPos = renderer.camera.worldToScreen(decoy.x, decoy.y);
            const pulse = 0.75 + Math.sin((decoy.timer || 0) * 10) * 0.12;
            ctx.save();
            ctx.globalAlpha = Math.max(0.25, 1 - ((decoy.timer || 0) / (decoy.duration || 4)) * 0.55);
            ctx.fillStyle = '#8a2be2';
            ctx.strokeStyle = '#d8b4ff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, (decoy.width || 30) * pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(screenPos.x - 8, screenPos.y);
            ctx.lineTo(screenPos.x + 8, screenPos.y);
            ctx.moveTo(screenPos.x, screenPos.y - 8);
            ctx.lineTo(screenPos.x, screenPos.y + 8);
            ctx.stroke();
            ctx.restore();
        }
    }

    loop(currentTime) {
        if (!this.isRunning) {
            this._animationFrameId = null;
            return;
        }

        this._animationFrameId = null;

        const deltaTime = (currentTime - this.lastTime) / 1000; // in seconds
        // Cap deltaTime to prevent physics blowups if tab is inactive
        const dt = Math.min(deltaTime, 0.1); 
        this.lastTime = currentTime;

        this.update(dt);
        this.render(dt);

        if (this.isRunning) {
            this._animationFrameId = requestAnimationFrame((time) => this.loop(time));
        }
    }

    update(dt) {
        if (this.state !== 'PLAYING') return;

        // Update player
        if (this.player) {
            this.processStatusEffects(this.player, dt);
            const newProjectiles = this.player.update(dt, this.input, this.camera, this.mapGen, this.particleSystem);
            if (newProjectiles && newProjectiles.length > 0) {
                this.projectiles.push(...newProjectiles);
            }
            this.consumePlayerTrinketAbilities();
            
            // Update camera to follow player
            this.camera.follow(this.player, dt);

            // Check Death
            if (this.player.hp <= 0) {
                this.die();
                return;
            }

            // Update Minimap Fog of War
            if (this.minimapService && this.minimapService.revealAroundPlayer) {
                this.minimapService.revealAroundPlayer(this);
            } else if (typeof MinimapConfig !== 'undefined') {
                const pX = Math.floor(this.player.x / this.mapGen.tileSize);
                const pY = Math.floor(this.player.y / this.mapGen.tileSize);
                const vr = MinimapConfig.visionRadius;

                for (let y = pY - vr; y <= pY + vr; y++) {
                    for (let x = pX - vr; x <= pX + vr; x++) {
                        if (x >= 0 && x < this.mapGen.cols && y >= 0 && y < this.mapGen.rows) {
                            // Circular vision
                            if (Math.hypot(x - pX, y - pY) <= vr) {
                                this.mapGen.visitedGrid[y * this.mapGen.cols + x] = true;
                            }
                        }
                    }
                }
            }
        }

        this.particleSystem.update(dt);
        this.updateTrinketRuntimeEffects(dt);

        // Update portal
        let nearPortal = false;
        if (this.portal) {
            this.portal.update(dt, this.enemies);
            if (this.player && !this.portal.enemiesNearby) {
                const dist = Math.hypot(this.player.x - this.portal.x, this.player.y - this.portal.y);
                if (dist <= this.portal.interactionRadius) {
                    nearPortal = true;
                }
            }
        }

        // Update enemies
        const playerRangedProjectiles = this.getPlayerRangedProjectiles();
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            let enemy = this.enemies[i];
            this.processStatusEffects(enemy, dt);
            const enemyTarget = this.getEnemyTargetForEnemy(enemy);
            const newEnemyProjectiles = enemy.update(dt, enemyTarget, this.mapGen, this.pathfinder, {
                engine: this,
                enemies: this.enemies,
                projectiles: this.projectiles,
                playerProjectiles: playerRangedProjectiles,
                combatFeedback: this.combatFeedback,
                particleSystem: this.particleSystem
            });
            if (newEnemyProjectiles && newEnemyProjectiles.length > 0) {
                for (const p of newEnemyProjectiles) {
                    p.owner = enemy;
                }
                this.projectiles.push(...newEnemyProjectiles);
            }

            // Check if enemy died
            if (enemy.hp <= 0) {
                this.handleElementalDeathBurst(enemy);
                this.combatFeedback.addText('Dead', enemy.x, enemy.y, '#888888', 14, 2.0);
                
                if (enemy.isBossTier || enemy.isBoss) {
                    this.dropBossEncounterLoot(enemy);
                } else {
                    // Roll for loot drop (default 20%, overrideable by DevConfig)
                    const dropChance = (typeof DevConfig !== 'undefined' && DevConfig.DEV_MODE_ENABLED && this.devPanel && this.devPanel.visible) ? DevConfig.dropRate : 0.2;
                    if (Math.random() < dropChance) {
                        const effectiveFloorLevel = (this.currentFloor - 1) + (this.gearDifficultyFloor || 1);
                        const itemData = this.lootGen.generateItem(effectiveFloorLevel);
                        this.droppedItems.push(new DroppedItem(enemy.x, enemy.y, itemData));
                    }
                }

                this.enemies.splice(i, 1);
            }
        }

        if (this.projectileCombatResolver && this.projectileCombatResolver.updateProjectiles) {
            this.projectileCombatResolver.updateProjectiles(this, dt);
        }

        // Update Dropped Items and Handle Pickups
        let closestItem = null;
        let minDistance = Infinity;

        for (let i = this.droppedItems.length - 1; i >= 0; i--) {
            let item = this.droppedItems[i];
            item.update(dt);
            
            if (this.player) {
                const dist = Math.hypot(this.player.x - item.x, this.player.y - item.y);
                if (dist <= item.pickupRadius && dist < minDistance) {
                    minDistance = dist;
                    closestItem = item;
                }
            }
        }

        // Update Floor Transitions
        let closestTransition = null;
        let transitionDistance = Infinity;
        for (let i = this.floorTransitions.length - 1; i >= 0; i--) {
            let transition = this.floorTransitions[i];
            transition.update(dt, this.enemies);
            if (this.player && !transition.activated && !transition.enemiesNearby) {
                const dist = Math.hypot(this.player.x - transition.x, this.player.y - transition.y);
                if (dist <= transition.interactionRadius && dist < transitionDistance) {
                    closestTransition = transition;
                    transitionDistance = dist;
                }
            }
        }

        // Update Loot Chests
        let closestChest = null;
        let chestDistance = Infinity;
        for (let i = this.lootChests.length - 1; i >= 0; i--) {
            let chest = this.lootChests[i];
            chest.update(dt);
            if (this.player && !chest.opened) {
                const dist = Math.hypot(this.player.x - chest.x, this.player.y - chest.y);
                if (dist <= chest.interactionRadius && dist < chestDistance) {
                    closestChest = chest;
                    chestDistance = dist;
                }
            }
        }

        // Update Dungeon Services
        let closestService = null;
        let serviceDistance = Infinity;
        const dungeonServices = this.dungeonServices || [];
        for (let i = dungeonServices.length - 1; i >= 0; i--) {
            const service = dungeonServices[i];
            service.update(dt);
            if (this.player) {
                const dist = Math.hypot(this.player.x - service.x, this.player.y - service.y);
                const canInteract = service.canInteract ? service.canInteract() : true;
                if (canInteract && dist <= service.interactionRadius && dist < serviceDistance) {
                    closestService = service;
                    serviceDistance = dist;
                }
            }
        }

        // Update Boss Room Buttons
        let closestBossButton = null;
        let bossButtonDistance = Infinity;
        for (let i = this.bossRoomButtons.length - 1; i >= 0; i--) {
            const button = this.bossRoomButtons[i];
            button.update(dt);
            if (this.player && !button.activated) {
                const dist = Math.hypot(this.player.x - button.x, this.player.y - button.y);
                if (dist <= button.interactionRadius && dist < bossButtonDistance) {
                    closestBossButton = button;
                    bossButtonDistance = dist;
                }
            }
        }

        const bossEntrance = this.getNearbyBossRoomEntrance();

        if (nearPortal) {
            this.showInteractionHint('Press [F] to Extract');

            if (this.input.isKeyDown('KeyF')) {
                this.input.keys['KeyF'] = false;
                this.extract();
            }
        } else if (closestTransition) {
            this.showInteractionHint('Press [F] to Descend');

            if (this.input.isKeyDown('KeyF')) {
                this.input.keys['KeyF'] = false;
                closestTransition.interact(this);
            }
        } else if (bossEntrance) {
            if (bossEntrance.unlocked) {
                this.showInteractionHint('Press [F] to Open');
            } else {
                this.showInteractionHint('Locked');
            }

            if (bossEntrance.unlocked && this.input.isKeyDown('KeyF')) {
                this.input.keys['KeyF'] = false;
                this.openBossRoomEntrance();
            }
        } else if (closestBossButton) {
            let activeCount = 0;
            for (let i = 0; i < this.bossRoomButtons.length; i++) {
                if (this.bossRoomButtons[i].activated) activeCount++;
            }
            this.showInteractionHint(`Press [F] to Activate Seal (${activeCount}/3)`);

            if (this.input.isKeyDown('KeyF')) {
                this.input.keys['KeyF'] = false;
                closestBossButton.interact(this);
            }
        } else if (closestChest) {
            this.showInteractionHint('Press [F] to Open Chest');

            if (this.input.isKeyDown('KeyF')) {
                this.input.keys['KeyF'] = false;
                closestChest.interact(this.player, this);
            }
        } else if (closestService) {
            this.showInteractionHint(closestService.hintText || 'Press [F] to Use');

            if (this.input.isKeyDown('KeyF')) {
                this.input.keys['KeyF'] = false;
                closestService.interact(this.player, this);
            }
        } else if (closestItem) {
            this.showInteractionHint('Press [F] to Pick Up');

            if (this.input.isKeyDown('KeyF')) {
                // Attempt to add to inventory
                if (this.player.addToInventory(closestItem.itemData)) {
                    this.combatFeedback.addText(`Found ${closestItem.itemData.type.charAt(0).toUpperCase() + closestItem.itemData.type.slice(1)}`, closestItem.x, closestItem.y, closestItem.itemData.color, 14, 1.0);
                    // Remove from world
                    const idx = this.droppedItems.indexOf(closestItem);
                    if (idx > -1) {
                        this.droppedItems.splice(idx, 1);
                    }
                    // Trigger UI update
                    if (window.gloomvaultApp) {
                        window.gloomvaultApp.updateInventoryUI();
                    }
                } else {
                    this.combatFeedback.addText('Inventory Full', closestItem.x, closestItem.y, '#ff0000', 14, 1.0);
                }
                
                // Clear key so we don't spam pickup
                this.input.keys['KeyF'] = false;
            }
        } else {
            this.hideInteractionHint();
        }

        // Update Combat Feedback
        this.combatFeedback.update(dt);

        // Update UI
        if (this.player) {
            this.updateHealthBarUI();
            this.updateBossHealthBarUI();
            this.updateMinimapInfoUI();
            this.updateActionBarUI();
            this.updatePassiveBuffUI();
            if (window.gloomvaultApp && window.gloomvaultApp.updateDurabilityHUD) {
                window.gloomvaultApp.updateDurabilityHUD(this.player);
            }
        }
    }

    updateHealthBarUI() {
        if (!this.player) return;
        const hud = this.getHudElements();
        if (hud.healthFill && hud.healthText) {
            const hpPercent = Math.max(0, (this.player.hp / this.player.maxHp) * 100);
            this.setHudStyle('healthWidth', hud.healthFill, 'width', `${hpPercent}%`);
            this.setHudText('healthText', hud.healthText, `${Math.ceil(this.player.hp)} / ${Math.ceil(this.player.maxHp)}`);
            
            // Color fading logic
            let healthColor = '#2ecc71'; // Green
            if (hpPercent < 10) {
                healthColor = '#e74c3c'; // Red
            } else if (hpPercent < 35) {
                healthColor = '#e67e22'; // Orange
            }
            this.setHudStyle('healthColor', hud.healthFill, 'backgroundColor', healthColor);
        }
        
        if (hud.shieldContainer && hud.shieldFill && hud.shieldText) {
            if (this.player.maxShield > 0) {
                this.setHudStyle('shieldDisplay', hud.shieldContainer, 'display', 'block');
                const shieldPercent = Math.max(0, (this.player.shield / this.player.maxShield) * 100);
                this.setHudStyle('shieldWidth', hud.shieldFill, 'width', `${shieldPercent}%`);
                this.setHudText('shieldText', hud.shieldText, `${Math.ceil(this.player.shield)} / ${Math.ceil(this.player.maxShield)}`);
            } else {
                this.setHudStyle('shieldDisplay', hud.shieldContainer, 'display', 'none');
            }
        }
    }

    updateBossHealthBarUI() {
        if (this.hud && this.hud.updateBossHud) {
            this.hud.updateBossHud(this.getVisibleBossEncounters());
            return;
        }

        const hud = this.getHudElements();
        if (!hud.bossContainer || !hud.bossFill || !hud.bossText) return;

        const encounters = this.getVisibleBossEncounters();
        if (encounters.length === 0) {
            this.setHudHidden('bossHealthHidden', hud.bossContainer, true);
            return;
        }

        this.setHudHidden('bossHealthHidden', hud.bossContainer, false);
        const rows = this.ensureBossHudRows(encounters.length);
        const rowSlots = rows.length > 0 ? rows : new Array(encounters.length).fill(null);
        for (let i = 0; i < rowSlots.length; i++) {
            const row = rowSlots[i];
            const fill = i === 0 ? hud.bossFill : (row && row.querySelector ? row.querySelector('.boss-health-bar-fill') : null);
            const text = i === 0 ? hud.bossText : (row && row.querySelector ? row.querySelector('.boss-health-bar-text') : null);
            const encounter = encounters[i];

            if (!encounter) {
                if (row && row.classList) row.classList.add('hidden');
                continue;
            }

            if (row && row.classList) {
                row.classList.remove('hidden');
                if (encounter.bossTier === 'floorGuardian') {
                    row.classList.add('guardian');
                } else {
                    row.classList.remove('guardian');
                }
            }

            const hpPercent = Math.max(0, (encounter.hp / encounter.maxHp) * 100);
            if (fill) {
                fill.style.width = `${hpPercent}%`;
            }
            if (text) {
                text.textContent = encounter.getBossHudText
                    ? encounter.getBossHudText()
                    : `${encounter.displayName || (encounter.isBoss ? 'Vault Warden' : 'Boss')} ${Math.ceil(encounter.hp)} / ${Math.ceil(encounter.maxHp)}`;
            }
        }
    }

    getCurrentMapDisplayName() {
        if (this.minimapService && this.minimapService.getCurrentMapDisplayName) {
            return this.minimapService.getCurrentMapDisplayName(this);
        }
        const config = this.currentMapConfig || {};
        if (config.displayName) return config.displayName;
        if (!this.currentMapKey) return 'Unknown Map';

        return this.currentMapKey
            .replace(/_/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());
    }

    getResponsiveMinimapSize() {
        if (this.minimapService && this.minimapService.getResponsiveMinimapSize) {
            return this.minimapService.getResponsiveMinimapSize(this);
        }
        if (typeof MinimapConfig === 'undefined') {
            return { width: 300, height: 300, xOffset: 20, yOffset: 20 };
        }

        const viewportWidth = Math.max(320, this.canvas ? this.canvas.clientWidth || this.canvas.width : 320);
        const viewportHeight = Math.max(240, this.canvas ? this.canvas.clientHeight || this.canvas.height : 240);
        const maxSide = Math.min(viewportWidth * 0.24, viewportHeight * 0.32, MinimapConfig.expandedWidth || 800);
        const width = Math.round(Math.max(220, Math.min(maxSide, 340)));
        const height = Math.round(Math.max(220, Math.min(maxSide, 340)));
        const xOffset = Math.round(Math.max(16, Math.min(MinimapConfig.xOffset || 20, viewportWidth * 0.04)));
        const yOffset = Math.round(Math.max(16, Math.min(MinimapConfig.yOffset || 20, viewportHeight * 0.04)));
        return { width, height, xOffset, yOffset };
    }

    getCanvasCssToBackingScale() {
        if (this.minimapService && this.minimapService.getCanvasCssToBackingScale) {
            return this.minimapService.getCanvasCssToBackingScale(this);
        }
        if (!this.canvas) return { x: 1, y: 1, uniform: 1 };

        const rect = this.canvas.getBoundingClientRect ? this.canvas.getBoundingClientRect() : null;
        const cssWidth = Math.max(1, this.canvas.clientWidth || (rect && rect.width) || this.canvas.width || 1);
        const cssHeight = Math.max(1, this.canvas.clientHeight || (rect && rect.height) || this.canvas.height || 1);
        const scaleX = Math.max(0.01, (this.canvas.width || cssWidth) / cssWidth);
        const scaleY = Math.max(0.01, (this.canvas.height || cssHeight) / cssHeight);
        return { x: scaleX, y: scaleY, uniform: Math.min(scaleX, scaleY) };
    }

    getMinimapRenderConfig(cssSize = this.getResponsiveMinimapSize()) {
        if (this.minimapService && this.minimapService.getMinimapRenderConfig) {
            return this.minimapService.getMinimapRenderConfig(this, cssSize);
        }
        if (typeof MinimapConfig === 'undefined') {
            return null;
        }

        const scale = this.getCanvasCssToBackingScale();
        return {
            ...MinimapConfig,
            width: Math.round(cssSize.width * scale.x),
            height: Math.round(cssSize.height * scale.y),
            xOffset: Math.round(cssSize.xOffset * scale.x),
            yOffset: Math.round(cssSize.yOffset * scale.y),
            tileScale: (MinimapConfig.tileScale || 4) * scale.uniform,
            pixelScale: scale.uniform
        };
    }

    getInventoryPaneLayout(viewportWidth, viewportHeight, headerHeight = 0, options = {}) {
        if (this.minimapService && this.minimapService.getInventoryPaneLayout) {
            return this.minimapService.getInventoryPaneLayout(viewportWidth, viewportHeight, headerHeight, options);
        }
        const isLargeFormFactor = viewportWidth >= 1000 && viewportHeight >= 1000;
        const gap = options.gap ?? (isLargeFormFactor ? 16 : 12);
        const panePadding = options.panePadding ?? (isLargeFormFactor ? 24 : 12);
        const safePadding = options.safePadding ?? 32;
        const bodyPadding = options.bodyPadding ?? gap;
        const baseContentSize = options.baseContentSize ?? 620;
        const maxContentScale = options.maxContentScale ?? 1.12;
        const paneBorder = options.paneBorder ?? 2;
        const availableWidth = Math.max(1, viewportWidth - safePadding - gap - (bodyPadding * 2));
        const availableHeight = Math.max(1, viewportHeight - safePadding - headerHeight - (bodyPadding * 2));
        const paneSize = Math.max(1, Math.floor(Math.min(availableWidth / 2, availableHeight)));
        const innerPaneSize = Math.max(1, paneSize - (panePadding * 2) - paneBorder);

        return {
            paneSize,
            gap,
            panePadding,
            innerPaneSize,
            contentScale: Math.min(maxContentScale, innerPaneSize / baseContentSize)
        };
    }

    updateMinimapInfoUI() {
        if (this.minimapService && this.minimapService.updateInfo) {
            return this.minimapService.updateInfo(this);
        }
        const hud = this.getHudElements();
        if (!hud.minimapHud || !hud.minimapInfo || !hud.minimapFloorLabel || !hud.minimapMapLabel) return;

        if (this.showMinimap === false) {
            this.setHudHidden('minimapInfoHidden', hud.minimapHud, true);
            return;
        }

        this.setHudHidden('minimapInfoHidden', hud.minimapHud, false);
        if (typeof MinimapConfig !== 'undefined') {
            const minimapSize = this.getResponsiveMinimapSize();
            this.setHudStyle('minimapHudTop', hud.minimapHud, 'top', `${minimapSize.yOffset + minimapSize.height + 8}px`);
            this.setHudStyle('minimapHudRight', hud.minimapHud, 'right', `${minimapSize.xOffset}px`);
            this.setHudStyle('minimapHudWidth', hud.minimapHud, 'width', `${minimapSize.width}px`);
            this.setHudStyle('minimapInfoWidth', hud.minimapInfo, 'width', '100%');
        }

        this.setHudText('minimapFloorLabel', hud.minimapFloorLabel, `Floor ${this.currentFloor}`);
        this.setHudText('minimapMapLabel', hud.minimapMapLabel, this.getCurrentMapDisplayName());
    }

    spawnBossRoomEntities(effectiveFloorLevel) {
        if (this.encounterService && this.encounterService.spawnBossRoomEntities) {
            return this.encounterService.spawnBossRoomEntities(this, effectiveFloorLevel);
        }
        const bossRoom = this.mapGen.bossRoom;
        if (!bossRoom) return;

        const hpScale = typeof DifficultyConfig !== 'undefined' ? DifficultyConfig.enemyHpScale : 0.2;
        const dmgScale = typeof DifficultyConfig !== 'undefined' ? DifficultyConfig.enemyDamageScale : 0.2;
        let hpMult = 1 + (effectiveFloorLevel * hpScale);
        let dmgMult = 1 + (effectiveFloorLevel * dmgScale);

        if (typeof DevConfig !== 'undefined' && DevConfig.DEV_MODE_ENABLED) {
            hpMult *= DevConfig.enemyHpMultiplier;
            dmgMult *= DevConfig.enemyDmgMultiplier;
        }

        const encounterProfile = typeof BossConfig !== 'undefined' && BossConfig.pickMainBoss
            ? BossConfig.pickMainBoss()
            : null;
        const boss = encounterProfile
            ? this.createBossEnemy(bossRoom.bossSpawn.x, bossRoom.bossSpawn.y, encounterProfile, hpMult, dmgMult)
            : new Enemy(bossRoom.bossSpawn.x, bossRoom.bossSpawn.y, 'boss', hpMult, dmgMult);
        this.enemies.push(boss);
        const chestCount = Math.floor(Math.random() * 2) + 2;
        const chestSpawns = bossRoom.chestSpawns || [bossRoom.chestSpawn];
        for (let i = 0; i < chestCount; i++) {
            const spawn = chestSpawns[i % chestSpawns.length];
            this.lootChests.push(new LootChest(spawn.x, spawn.y, true));
        }
        this.bossRoomButtons = bossRoom.buttonPositions.map((pos, index) => new BossRoomButton(pos.x, pos.y, index));
    }

    spawnFloorGuardian(startPos, effectiveFloorLevel) {
        if (this.encounterService && this.encounterService.spawnFloorGuardian) {
            return this.encounterService.spawnFloorGuardian(this, startPos, effectiveFloorLevel);
        }
        if (typeof BossConfig === 'undefined' || !BossConfig.pickFloorGuardian) return null;
        if (Math.random() >= 0.08) return null;

        const validTiles = this.spawnManager && this.spawnManager.collectValidSpawnTiles
            ? this.spawnManager.collectValidSpawnTiles(this.mapGen, startPos)
            : [];
        if (!validTiles || validTiles.length === 0) return null;

        const spawnIndex = Math.floor(Math.random() * validTiles.length);
        const spawnPoint = validTiles[spawnIndex];
        if (!spawnPoint) return null;

        let hpMult = 1 + (effectiveFloorLevel * ((typeof DifficultyConfig !== 'undefined' ? DifficultyConfig.enemyHpScale : 0.2) + 0.12));
        let dmgMult = 1 + (effectiveFloorLevel * ((typeof DifficultyConfig !== 'undefined' ? DifficultyConfig.enemyDamageScale : 0.2) + 0.08));
        if (typeof DevConfig !== 'undefined' && DevConfig.DEV_MODE_ENABLED) {
            hpMult *= DevConfig.enemyHpMultiplier;
            dmgMult *= DevConfig.enemyDmgMultiplier;
        }

        const guardianProfile = BossConfig.pickFloorGuardian();
        const guardian = this.createBossEnemy(spawnPoint.x, spawnPoint.y, guardianProfile, hpMult, dmgMult);
        this.enemies.push(guardian);
        return guardian;
    }

    dropBossEncounterLoot(enemy) {
        if (this.encounterService && this.encounterService.dropBossEncounterLoot) {
            return this.encounterService.dropBossEncounterLoot(this, enemy);
        }
        if (!enemy) return;
        if (!enemy.bossTier || enemy.bossTier === 'mainBoss') {
            LootChest.dropChestLoot(enemy.x, enemy.y, this, 'Boss Defeated!');
            this.unlockBossRoomChests();
            this.camera.shake(12, 0.35);
            if (enemy.triggerBossHooks) {
                enemy.triggerBossHooks('onDeath', this, {});
            }
            return;
        }

        const lootProfile = enemy.bossProfile && enemy.bossProfile.lootProfile ? enemy.bossProfile.lootProfile : {};
        const minRarity = lootProfile.guaranteedMinRarity || 'Uncommon';
        const guaranteedDrops = Math.max(1, lootProfile.guaranteedDrops || 1);
        const effectiveFloorLevel = this.getEffectiveFloorLevel();

        for (let i = 0; i < guaranteedDrops; i++) {
            const itemData = this.lootGen.generateGuaranteedRarityItem(effectiveFloorLevel, minRarity);
            this.droppedItems.push(new DroppedItem(enemy.x, enemy.y, itemData));
        }

        if (Math.random() < (lootProfile.extraDropChance || 0)) {
            this.droppedItems.push(new DroppedItem(enemy.x, enemy.y, this.lootGen.generateItem(effectiveFloorLevel)));
        }

        this.showBossCombatText(enemy, 'Guardian Defeated', '#ffd166');
        this.emitBossPulse(enemy, '#ffd166', 30);
        this.camera.shake(9, 0.22);
        if (enemy.triggerBossHooks) {
            enemy.triggerBossHooks('onDeath', this, {});
        }
    }

    unlockBossRoomChests() {
        if (!this.mapGen.bossRoom) return;
        for (const chest of this.lootChests) {
            const tileX = Math.floor(chest.x / this.mapGen.tileSize);
            const tileY = Math.floor(chest.y / this.mapGen.tileSize);
            if (this.mapGen.isTileInsideRoom(tileX, tileY, this.mapGen.bossRoom.room) && chest.unlock) {
                chest.unlock();
            }
        }
    }

    getNearbyBossRoomEntrance() {
        const bossRoom = this.mapGen && this.mapGen.bossRoom;
        if (!this.player || !bossRoom || bossRoom.opened) return null;

        const entrance = bossRoom.entranceWorld;
        if (!entrance) return null;

        const interactionRadius = this.tileSize * 1.6;
        const dist = Math.hypot(this.player.x - entrance.x, this.player.y - entrance.y);
        if (dist > interactionRadius) return null;

        return bossRoom;
    }

    checkBossRoomUnlock() {
        if (!this.mapGen.bossRoom || this.mapGen.bossRoom.unlocked) return;
        if (this.bossRoomButtons.length < 3 || !this.bossRoomButtons.every(button => button.activated)) return;

        if (this.mapGen.unlockBossRoomEntrance()) {
            const entrance = this.mapGen.bossRoom.entranceWorld;
            this.combatFeedback.addText('Boss Room Unlocked', entrance.x, entrance.y - 20, '#66d9ff', 18, 2.0);
            if (this.particleSystem) {
                this.particleSystem.emitImpact(entrance.x, entrance.y, '#66d9ff', 35);
            }
        }
    }

    openBossRoomEntrance() {
        if (!this.mapGen.bossRoom || !this.mapGen.openBossRoomEntrance) return false;

        const opened = this.mapGen.openBossRoomEntrance();
        if (opened) {
            const entrance = this.mapGen.bossRoom.entranceWorld;
            this.combatFeedback.addText('Boss Room Opened', entrance.x, entrance.y - 20, '#66d9ff', 18, 1.5);
            if (this.particleSystem) {
                this.particleSystem.emitImpact(entrance.x, entrance.y, '#66d9ff', 35);
            }
        }
        return opened;
    }

    updateActionBarUI() {
        if (!this.player) return;
        const hud = this.getHudElements();

        // Weapon Primary
        const w1Slot = hud.actionSlots.weapon1;
        if (w1Slot && w1Slot.icon && w1Slot.cooldownOverlay) {
            const wepItem = this.player.equipment.weapon;
            if (wepItem) {
                this.setHudItemIcon(
                    'weapon1',
                    w1Slot.icon,
                    wepItem,
                    wepItem.name.split(' ')[0].substring(0, 3),
                    wepItem.element && typeof Weapon !== 'undefined' ? Weapon.getElementColor(wepItem.element) : wepItem.color
                );
            } else {
                this.setHudItemIcon('weapon1', w1Slot.icon, null, 'ATK', '#555');
            }

            const cdPercent = this.player.weapon1 ? (this.player.weapon1.cooldownTimer / this.player.weapon1.cooldown) * 100 : 0;
            this.setHudStyle('weapon1Cooldown', w1Slot.cooldownOverlay, 'height', `${Math.max(0, Math.min(100, cdPercent))}%`);
        }

        // Weapon Secondary
        const w2Slot = hud.actionSlots.weapon2;
        if (w2Slot && w2Slot.icon && w2Slot.cooldownOverlay) {
            const wepItem = this.player.equipment.weapon2;
            if (wepItem) {
                this.setHudItemIcon(
                    'weapon2',
                    w2Slot.icon,
                    wepItem,
                    wepItem.name.split(' ')[0].substring(0, 3),
                    wepItem.element && typeof Weapon !== 'undefined' ? Weapon.getElementColor(wepItem.element) : wepItem.color
                );
            } else {
                this.setHudItemIcon('weapon2', w2Slot.icon, null, 'SEC', '#555');
            }

            const cdPercent = this.player.weapon2 ? (this.player.weapon2.cooldownTimer / this.player.weapon2.cooldown) * 100 : 0;
            this.setHudStyle('weapon2Cooldown', w2Slot.cooldownOverlay, 'height', `${Math.max(0, Math.min(100, cdPercent))}%`);
        }

        // Trinkets
        const cdr = Math.min(0.75, this.player.stats.cooldownReduction || 0);
        for (let i = 1; i <= 2; i++) {
            const slotName = `trinket${i}`;
            const slot = hud.actionSlots[slotName];
            if (!slot || !slot.icon || !slot.cooldownOverlay) continue;

            const item = this.player.equipment[slotName];
            if (item && item.activeAbility) {
                this.setHudItemIcon(slotName, slot.icon, item, item.name.split(' ')[0].substring(0, 3), item.color);

                const maxCd = item.activeAbility.cooldown * (1 - cdr);
                const currentCd = this.player.abilityCooldowns[slotName];
                const cdPercent = maxCd > 0 ? (currentCd / maxCd) * 100 : 0;

                this.setHudStyle(`${slotName}Cooldown`, slot.cooldownOverlay, 'height', `${Math.max(0, Math.min(100, cdPercent))}%`);
            } else {
                this.setHudItemIcon(slotName, slot.icon, null, '', 'transparent');
                this.setHudStyle(`${slotName}Cooldown`, slot.cooldownOverlay, 'height', '0%');
            }
        }
    }

    updatePassiveBuffUI() {
        if (!this.player) return;
        const hud = this.getHudElements();
        const passive = hud.passiveBuffs || {};
        if (!passive.healingWell) return;

        const stacks = this.player.getHealingWellStackCount ? this.player.getHealingWellStackCount() : 0;
        if (stacks <= 0) {
            this.setHudHidden('healingWellBuffHidden', passive.healingWell, true);
            if (passive.container) this.setHudHidden('passiveBuffContainerHidden', passive.container, true);
            return;
        }

        if (passive.container) this.setHudHidden('passiveBuffContainerHidden', passive.container, false);
        this.setHudHidden('healingWellBuffHidden', passive.healingWell, false);

        const remaining = this.player.getHealingWellRemainingTime ? this.player.getHealingWellRemainingTime() : 0;
        if (passive.stack) {
            this.setHudText('healingWellBuffStack', passive.stack, stacks > 1 ? `x${stacks}` : '');
        }
        if (passive.time) {
            this.setHudText('healingWellBuffTime', passive.time, `${Math.ceil(remaining)}s`);
        }
        if (passive.icon) {
            const assets = typeof window !== 'undefined' ? window.gloomvaultAssets : null;
            const image = assets && assets.getImage ? assets.getImage('sprites.service.healingWell.1') : null;
            const imageValue = image && image.src ? `url("${image.src}")` : 'none';
            this.setHudStyle('healingWellBuffImage', passive.icon, 'backgroundImage', imageValue);
            this.setHudStyle('healingWellBuffImageSize', passive.icon, 'backgroundSize', image ? '100% 100%' : 'auto');
            this.setHudText('healingWellBuffIconText', passive.icon, image ? '' : 'WEL');
        }
    }

    render(dt) {
        if (this.gameRenderer && this.gameRenderer.render && !this._usingLegacyRenderer) {
            return this.gameRenderer.render(this, dt);
        }
        if (this.state !== 'PLAYING') return;

        this.renderer.clear();

        this.ctx.save();
        this.camera.applyTransform(this.ctx);

        if (this.renderer.setAssetManager && typeof window !== 'undefined' && window.gloomvaultAssets) {
            this.renderer.setAssetManager(window.gloomvaultAssets);
        }

        // 1. Draw Map Tiles within view frustum
        const startCol = Math.floor(this.camera.x / this.tileSize);
        const endCol = startCol + Math.floor(this.camera.width / this.tileSize) + 2;
        const startRow = Math.floor(this.camera.y / this.tileSize);
        const endRow = startRow + Math.floor(this.camera.height / this.tileSize) + 2;

        if (this.renderer.drawMapTiles) {
            this.renderer.drawMapTiles(
                this.mapGen,
                startCol,
                endCol,
                startRow,
                endRow,
                this.tileSize,
                (x, y) => this.isWallVisible(x, y)
            );
        } else {
            for (let y = startRow; y < endRow; y++) {
                for (let x = startCol; x < endCol; x++) {
                    const tile = this.mapGen.getTile(x, y);
                    const worldX = x * this.tileSize;
                    const worldY = y * this.tileSize;
                    if (tile === 1) {
                         this.renderer.drawRect(worldX, worldY, this.tileSize - 1, this.tileSize - 1, '#333');
                    } else if (tile === 0 && this.isWallVisible(x,y)) {
                         this.renderer.drawRect(worldX, worldY, this.tileSize - 1, this.tileSize - 1, '#111');
                    }
                }
            }
        }

        // 2. Draw world objects before characters so actors stay readable on top.
        for (let service of (this.dungeonServices || [])) {
            service.render(this.ctx, this.renderer);
        }

        if (this.portal) {
            this.portal.render(this.ctx, this.renderer);
        }

        for (let transition of this.floorTransitions) {
            transition.render(this.ctx, this.renderer);
        }

        this.renderBossRoomEntrance();

        for (let button of this.bossRoomButtons) {
            button.render(this.ctx, this.renderer);
        }

        for (let chest of this.lootChests) {
            chest.render(this.ctx, this.renderer);
        }

        for (let i of this.droppedItems) {
            i.render(this.ctx, this.renderer);
        }

        // 3. Draw Player
        if (this.player) {
            this.player.render(this.ctx, this.renderer);
        }

        // 4. Draw Enemies
        for (let e of this.enemies) {
            e.render(this.ctx, this.renderer);
        }

        // 5. Draw Projectiles
        for (let p of this.projectiles) {
            p.render(this.ctx, this.renderer);
        }

        this.renderTrinketEffects(this.ctx, this.renderer);

        // 6. Draw Combat Feedback
        this.particleSystem.render(this.ctx, this.renderer);
        this.combatFeedback.render(this.ctx, this.renderer);

        // 7. Draw UI Overlay
        this.ctx.restore();

        if (this.isDevOverlayVisible() && this.player) {
            const fps = dt > 0 ? Math.round(1 / dt) : 0;
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '16px monospace';
            this.ctx.fillText(`FPS: ${fps}`, 10, 20);
            this.ctx.fillText(`Player: (${Math.floor(this.player.x)}, ${Math.floor(this.player.y)})`, 10, 40);
        }

        // 8. Draw Minimap
        this.updateMinimapInfoUI();
        if (this.showMinimap !== false && typeof MinimapConfig !== 'undefined') {
            const minimapSize = this.getResponsiveMinimapSize();
            const minimapConfig = this.getMinimapRenderConfig(minimapSize);
            this.renderer.renderMinimap(this.player, this.portal, this.floorTransitions, this.mapGen, minimapConfig, false, null, this.bossRoomButtons, this.dungeonServices || []);
        }
    }

    renderBossRoomEntrance() {
        if (!this.mapGen.bossRoom || this.mapGen.bossRoom.opened) return;

        const entrance = this.mapGen.bossRoom.entranceWorld;
        const screenPos = this.renderer.camera.worldToScreen(entrance.x, entrance.y);
        const size = this.tileSize * 0.82;
        const unlocked = this.mapGen.bossRoom.unlocked;
        const objectKey = unlocked ? 'doorOpen' : 'doorLocked';
        const assetKey = this.renderer.getMapObjectAssetKey
            ? (this.renderer.getMapObjectAssetKey(this.mapGen, objectKey) || `tiles.${objectKey}`)
            : `tiles.${objectKey}`;

        if (this.renderer.drawAsset && this.renderer.drawAsset(assetKey, entrance.x, entrance.y, size, size)) {
            return;
        }

        this.ctx.fillStyle = '#10202a';
        this.ctx.fillRect(screenPos.x - size / 2, screenPos.y - size / 2, size, size);
        this.ctx.strokeStyle = unlocked ? '#66d9ff' : '#e74c3c';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(screenPos.x - size / 2, screenPos.y - size / 2, size, size);
    }

    isWallVisible(x, y) {
        // If a wall is adjacent to a floor tile, draw it
        return (this.mapGen.getTile(x-1,y) === 1 || this.mapGen.getTile(x+1,y) === 1 ||
                this.mapGen.getTile(x,y-1) === 1 || this.mapGen.getTile(x,y+1) === 1);
    }

    extract() {
        console.log('💎 Extracting!');
        this.stop();

        // Save equipment
        if (this.loadoutService) {
            this.loadoutService.saveEquipment(this.player);
        } else if (this.player && this.player.equipment) {
            if (typeof InventoryStore !== 'undefined') InventoryStore.saveEquipment(this.player.equipment);
        }

        // Pass inventory to main.js to handle the extraction screen
        if (window.gloomvaultApp) {
            // Trigger extraction screen setup
            window.gloomvaultApp.setupExtraction(this.player.inventory);
            window.gloomvaultApp.showScreen('extraction-screen');
        }
    }

    die() {
        console.log('💀 Died!');
        this.stop();

        // Wipe equipment (penalty)
        if (this.loadoutService) {
            this.loadoutService.applyDeathPenalty();
        } else if (typeof InventoryStore !== 'undefined') {
            InventoryStore.clearEquipment();
        }
        // Keep stash untouched

        // Transition to game over
        if (window.gloomvaultApp) {
            window.gloomvaultApp.showScreen('game-over-screen');
        }
    }
}
