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
        this.interactionSystem = options.interactionSystem || (typeof InteractionSystem !== 'undefined' ? new InteractionSystem() : null);
        this.flowController = options.flowController || {};
        this.uiCallbacks = options.uiCallbacks || {};

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
        if (element.classList.toggle) element.classList.toggle('hidden', nextValue);
        else if (nextValue) element.classList.add('hidden');
        else element.classList.remove('hidden');
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

    notifyInventoryChanged() {
        if (this.uiCallbacks && this.uiCallbacks.onInventoryChanged) {
            this.uiCallbacks.onInventoryChanged(this);
        }
    }

    notifyDurabilityChanged() {
        if (this.uiCallbacks && this.uiCallbacks.onDurabilityChanged) {
            this.uiCallbacks.onDurabilityChanged(this.player, this);
        }
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

    ensureCombatSystem() {
        if (!this.combatSystem && typeof CombatSystem !== 'undefined') {
            this.combatSystem = new CombatSystem();
        }
        return this.combatSystem;
    }

    getElementConfig(element) {
        const combatSystem = this.ensureCombatSystem();
        return combatSystem && combatSystem.getElementConfig ? combatSystem.getElementConfig(element) : null;
    }

    getStatusEffect(target, type) {
        const combatSystem = this.ensureCombatSystem();
        return combatSystem && combatSystem.getStatusEffect ? combatSystem.getStatusEffect(target, type) : null;
    }

    applyStatusEffect(target, type, values = {}) {
        const combatSystem = this.ensureCombatSystem();
        return combatSystem && combatSystem.applyStatusEffect ? combatSystem.applyStatusEffect(target, type, values) : null;
    }

    applyElementalHit(target, projectile) {
        const combatSystem = this.ensureCombatSystem();
        if (combatSystem && combatSystem.applyElementalHit) return combatSystem.applyElementalHit(target, projectile);
    }

    getDamageTakenMultiplier(target) {
        const combatSystem = this.ensureCombatSystem();
        return combatSystem && combatSystem.getDamageTakenMultiplier ? combatSystem.getDamageTakenMultiplier(target) : 1;
    }

    dealStatusDamage(target, amount) {
        const combatSystem = this.ensureCombatSystem();
        return combatSystem && combatSystem.dealStatusDamage ? combatSystem.dealStatusDamage(this, target, amount) : 0;
    }

    showStatusDamageText(target, amount, color) {
        const combatSystem = this.ensureCombatSystem();
        if (combatSystem && combatSystem.showStatusDamageText) return combatSystem.showStatusDamageText(this, target, amount, color);
    }

    processStatusEffects(target, dt) {
        const combatSystem = this.ensureCombatSystem();
        if (combatSystem && combatSystem.processStatusEffects) return combatSystem.processStatusEffects(this, target, dt);
    }

    hasStatusEffect(target, type) {
        const combatSystem = this.ensureCombatSystem();
        return combatSystem && combatSystem.hasStatusEffect ? combatSystem.hasStatusEffect(target, type) : false;
    }

    handleElementalDeathBurst(deadEnemy) {
        const combatSystem = this.ensureCombatSystem();
        if (combatSystem && combatSystem.handleElementalDeathBurst) return combatSystem.handleElementalDeathBurst(this, deadEnemy);
    }

    spawnRadianceDeathProjectiles(deadEnemy) {
        const combatSystem = this.ensureCombatSystem();
        if (combatSystem && combatSystem.spawnRadianceDeathProjectiles) return combatSystem.spawnRadianceDeathProjectiles(this, deadEnemy);
    }

    spawnPoisonDeathProjectiles(deadEnemy) {
        const combatSystem = this.ensureCombatSystem();
        if (combatSystem && combatSystem.spawnPoisonDeathProjectiles) return combatSystem.spawnPoisonDeathProjectiles(this, deadEnemy);
    }

    ensureAbilitySystem() {
        if (!this.abilitySystem && typeof AbilitySystem !== 'undefined') {
            this.abilitySystem = new AbilitySystem();
        }
        return this.abilitySystem;
    }

    consumePlayerTrinketAbilities() {
        const abilitySystem = this.ensureAbilitySystem();
        if (abilitySystem && abilitySystem.consumePlayerTrinketAbilities) return abilitySystem.consumePlayerTrinketAbilities(this);
    }

    resolveTrinketAbility(request) {
        const abilitySystem = this.ensureAbilitySystem();
        return abilitySystem && abilitySystem.resolveTrinketAbility ? abilitySystem.resolveTrinketAbility(this, request) : false;
    }

    revealMinimapArea(ability) {
        const abilitySystem = this.ensureAbilitySystem();
        return abilitySystem && abilitySystem.revealMinimapArea ? abilitySystem.revealMinimapArea(this, ability) : false;
    }

    phaseTether(ability, angle) {
        const abilitySystem = this.ensureAbilitySystem();
        return abilitySystem && abilitySystem.phaseTether ? abilitySystem.phaseTether(this, ability, angle) : false;
    }

    findSafePlayerLanding(tileX, tileY, minDistance = 0) {
        const abilitySystem = this.ensureAbilitySystem();
        return abilitySystem && abilitySystem.findSafePlayerLanding
            ? abilitySystem.findSafePlayerLanding(this, tileX, tileY, minDistance)
            : null;
    }

    throwElementBomb(ability, angle) {
        const abilitySystem = this.ensureAbilitySystem();
        return abilitySystem && abilitySystem.throwElementBomb ? abilitySystem.throwElementBomb(this, ability, angle) : false;
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
        const combatSystem = this.ensureCombatSystem();
        return combatSystem && combatSystem.getElementFallbackColor
            ? combatSystem.getElementFallbackColor(element)
            : '#ffffff';
    }

    explodeElementBomb(projectile) {
        const abilitySystem = this.ensureAbilitySystem();
        return abilitySystem && abilitySystem.explodeElementBomb ? abilitySystem.explodeElementBomb(this, projectile) : false;
    }

    castLightningStrike(ability) {
        const abilitySystem = this.ensureAbilitySystem();
        return abilitySystem && abilitySystem.castLightningStrike ? abilitySystem.castLightningStrike(this, ability) : false;
    }

    findNearestEnemy(x, y, maxRange = Infinity, excluded = new Set()) {
        const abilitySystem = this.ensureAbilitySystem();
        return abilitySystem && abilitySystem.findNearestEnemy
            ? abilitySystem.findNearestEnemy(this, x, y, maxRange, excluded)
            : null;
    }

    spawnTargetDummy(ability, angle) {
        const abilitySystem = this.ensureAbilitySystem();
        return abilitySystem && abilitySystem.spawnTargetDummy ? abilitySystem.spawnTargetDummy(this, ability, angle) : false;
    }

    applySoulSiphon(ability) {
        const abilitySystem = this.ensureAbilitySystem();
        return abilitySystem && abilitySystem.applySoulSiphon ? abilitySystem.applySoulSiphon(this, ability) : false;
    }

    updateTrinketRuntimeEffects(dt) {
        const abilitySystem = this.ensureAbilitySystem();
        if (abilitySystem && abilitySystem.updateRuntimeEffects) return abilitySystem.updateRuntimeEffects(this, dt);
    }

    getEnemyTargetForEnemy(enemy) {
        const abilitySystem = this.ensureAbilitySystem();
        return abilitySystem && abilitySystem.getEnemyTargetForEnemy
            ? abilitySystem.getEnemyTargetForEnemy(this, enemy)
            : this.player;
    }

    handleAbilityProjectileEnd(projectile) {
        const abilitySystem = this.ensureAbilitySystem();
        return abilitySystem && abilitySystem.handleAbilityProjectileEnd
            ? abilitySystem.handleAbilityProjectileEnd(this, projectile)
            : false;
    }

    renderTrinketEffects(ctx, renderer) {
        const abilitySystem = this.ensureAbilitySystem();
        if (abilitySystem && abilitySystem.renderTrinketEffects) return abilitySystem.renderTrinketEffects(this, ctx, renderer);
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

        if (this.interactionSystem && this.interactionSystem.update) {
            this.interactionSystem.update(this, dt);
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
            this.notifyDurabilityChanged();
        }
    }

    updateHealthBarUI() {
        if (!this.player) return;
        if (this.hudAdapter && this.hudAdapter.updateHealth) return this.hudAdapter.updateHealth(this.player);
        if (this.hud && this.hud.updateHealthHud) this.hud.updateHealthHud(this.player);
    }

    updateBossHealthBarUI() {
        if (this.hud && this.hud.updateBossHud) {
            this.hud.updateBossHud(this.getVisibleBossEncounters());
            return;
        }
        if (this.hudAdapter && this.hudAdapter.updateBosses) {
            this.hudAdapter.updateBosses(this.getVisibleBossEncounters());
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
                if (encounter.bossTier === 'floorGuardian') row.classList.add('guardian');
                else row.classList.remove('guardian');
            }
            const hpPercent = Math.max(0, (encounter.hp / encounter.maxHp) * 100);
            if (fill) fill.style.width = `${hpPercent}%`;
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
        if (this.hudAdapter && this.hudAdapter.updateActionBar) return this.hudAdapter.updateActionBar(this.player);
        if (this.hud && this.hud.updateActionBarHud) this.hud.updateActionBarHud(this.player);
    }

    updatePassiveBuffUI() {
        if (!this.player) return;
        if (this.hudAdapter && this.hudAdapter.updatePassiveBuffs) return this.hudAdapter.updatePassiveBuffs(this.player);
        if (this.hud && this.hud.updatePassiveBuffHud) return this.hud.updatePassiveBuffHud(this.player);
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
        if (passive.stack) this.setHudText('healingWellBuffStack', passive.stack, stacks > 1 ? `x${stacks}` : '');
        if (passive.time) this.setHudText('healingWellBuffTime', passive.time, `${Math.ceil(remaining)}s`);
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
        if (!this.gameRenderer && typeof GameRenderer !== 'undefined') {
            this.gameRenderer = new GameRenderer();
        }
        if (this.gameRenderer && this.gameRenderer.render) return this.gameRenderer.render(this, dt);
    }

    renderBossRoomEntrance() {
        if (!this.gameRenderer && typeof GameRenderer !== 'undefined') this.gameRenderer = new GameRenderer();
        if (this.gameRenderer && this.gameRenderer.drawBossRoomEntrance) {
            return this.gameRenderer.drawBossRoomEntrance(this);
        }
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
        if (this.flowController && this.flowController.onExtract) {
            this.flowController.onExtract(this.player.inventory, this);
        } else if (window.gloomvaultApp) {
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
        if (this.flowController && this.flowController.onDeath) {
            this.flowController.onDeath(this);
        } else if (window.gloomvaultApp) {
            window.gloomvaultApp.showScreen('game-over-screen');
        }
    }
}
