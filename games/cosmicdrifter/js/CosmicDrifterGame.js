/**
 * Cosmic Drifter - 2D Open-World Space Exploration Game
 * A survival exploration game where players drift through cosmic space
 * collecting resources, avoiding hazards, and upgrading their ship.
 */

class CosmicDrifterGame {
    constructor() {
        // Core game properties
        this.canvas = null;
        this.ctx = null;
        this.gameLoop = null;
        this.isRunning = false;
        this.isPaused = false;
        this.lastTime = 0;
        this.deltaTime = 0;
        
        // Game state
        this.gameState = 'loading'; // loading, playing, paused, gameOver
        this.score = 0;
        this.distance = 0;
        
        // Explored areas tracking (to prevent energy orb respawning)
        this.exploredAreas = new Set();
        
        // Resources
        this.resources = {
            techFragments: 0,
            crystals: 0,
            energyCores: 0, // Advanced resource
            scrapMetal: 0   // Advanced resource
        };
        
        // Mission system
        this.missions = {
            current: null,
            completed: [],
            available: [],
            objectives: []
        };
        
        // Game progression
        this.level = 1;
        this.sectorsExplored = 0;
        this.totalSectors = 5;
        this.sectorProgress = 0;
        this.nextSectorDistance = 2000;
        
        // Player
        this.player = {
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            maxSpeed: 2.0,
            thrust: 0.4, // thrust force
            energy: 100,
            maxEnergy: 100,
            hull: 100,
            maxHull: 100,
            energyDrain: 0.02,
            size: 8,
            angle: 0,
            thrusterPower: 0
        };
        
        // Camera
        this.camera = {
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0,
            smoothing: 0.1
        };
        
        // World generation
        this.world = {
            seed: Math.random() * 1000000,
            chunkSize: 1000,
            loadedChunks: new Map(),
            objects: [],
            lastChunkX: 0,
            lastChunkY: 0
        };
        
        // Game objects
        this.energyOrbs = [];
        this.techFragments = [];
        this.crystals = [];
        this.hazards = [];
        this.stations = [];
        this.particles = [];
        this.enemyShips = [];
        this.projectiles = [];
        this.stars = [];
        
        // Upgrades
        this.upgrades = {
            // Ship upgrades
            energyEfficiency: 0,
            shieldBoost: 0,
            scannerRange: 1,
            speedBoost: 0,
            energyCapacity: 0,
            hullRepair: 0,
            hullRegen: 0,
            
            // Weapon upgrades
            bulletDamage: 0,
            bulletSpeed: 0,
            bulletCount: 0,
            fireRate: 0,
            bulletPenetration: 0,
            
            // Advanced upgrades (unlocked later)
            energyShield: 0,
            autoRepair: 0,
            multiShot: 0,
            explosiveBullets: 0,
            energyWeapon: 0
        };
        
        // Input handling
        this.keys = {};
        this.input = {
            up: false,
            down: false,
            left: false,
            right: false,
            interact: false,
            rotateLeft: false,
            rotateRight: false,
            mouseThrust: false,
            mouseX: 0,
            mouseY: 0,
            shoot: false,
            shootCooldown: 0
        };
        
        // UI elements
        this.ui = {
            energyBar: null,
            hullBar: null,
            minimap: null,
            messageLog: [],
            mouseTarget: null
        };
        
        // Audio context for sound effects
        this.audioContext = null;
        this.sounds = {};
        
        // Performance tracking
        this.fps = 60;
        this.frameCount = 0;
        this.lastFpsTime = 0;
        
        console.log('🚀 Cosmic Drifter Game initialized');
    }
    
    async init() {
        try {
            console.log('🚀 Initializing Cosmic Drifter...');
            
            // Get canvas and context
            this.canvas = document.getElementById('gameCanvas');
            this.ctx = this.canvas.getContext('2d');
            
            // Set canvas size
            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());
            
            // Initialize UI elements
            this.initUI();
            
            // Initialize audio
            this.initAudio();
            
            // Generate initial world
            this.generateInitialWorld();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Hide loading screen
            this.hideLoadingScreen();
            
            // Start the game
            this.start();
            
            console.log('✅ Cosmic Drifter initialized successfully');
            
        } catch (error) {
            console.error('❌ Error initializing Cosmic Drifter:', error);
            this.showError('Failed to initialize game');
        }
    }
    
    resizeCanvas() {
        const container = document.getElementById('gameContainer');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
    }
    
    initUI() {
        // Get UI elements
        this.ui.energyBar = document.getElementById('energyFill');
        this.ui.energyValue = document.getElementById('energyValue');
        this.ui.hullBar = document.getElementById('hullFill');
        this.ui.hullValue = document.getElementById('hullValue');
        this.ui.speedValue = document.getElementById('speedValue');
        this.ui.distanceValue = document.getElementById('distanceValue');
        this.ui.fragmentsValue = document.getElementById('fragmentsValue');
        this.ui.crystalsValue = document.getElementById('crystalsValue');
        this.ui.minimap = document.getElementById('minimap');
        this.ui.minimapPlayer = document.getElementById('minimapPlayer');
        this.ui.messageLog = document.getElementById('messageLog');
        this.ui.mouseTarget = document.getElementById('mouseTarget');
        this.ui.lowEnergyWarning = document.getElementById('lowEnergyWarning');
        this.ui.lowHullWarning = document.getElementById('lowHullWarning');
    }
    
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.createSounds();
        } catch (error) {
            console.warn('Audio not supported:', error);
        }
    }
    
    createSounds() {
        // Create simple sound effects using Web Audio API
        this.sounds = {
            collect: this.createTone(800, 0.1, 'sine'),
            damage: this.createTone(200, 0.3, 'sawtooth'),
            upgrade: this.createTone(1200, 0.2, 'square'),
            shoot: this.createTone(400, 0.1, 'square'),
            thruster: this.createTone(150, 0.05, 'triangle')
        };
    }
    
    createTone(frequency, duration, type = 'sine') {
        return () => {
            if (!this.audioContext) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = type;
            
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        };
    }
    
    generateInitialWorld() {
        // Generate stars for background
        this.generateStars();
        
        // Initialize the chunk system around the player
        this.initializeChunksAroundPlayer();
        
        // Initialize mission system
        this.initializeMissions();
        
        // Add initial message
        this.addMessage('Welcome to Cosmic Drifter! Your mission: Explore 5 sectors and reach the final destination!');
    }
    
    initializeChunksAroundPlayer() {
        // Pre-load chunks in a larger radius around the starting position
        const chunkX = Math.floor(this.player.x / this.world.chunkSize);
        const chunkY = Math.floor(this.player.y / this.world.chunkSize);
        const initialLoadRadius = 2; // Load 2 chunks in each direction (5x5 grid)
        
        for (let dx = -initialLoadRadius; dx <= initialLoadRadius; dx++) {
            for (let dy = -initialLoadRadius; dy <= initialLoadRadius; dy++) {
                const checkChunkX = chunkX + dx;
                const checkChunkY = chunkY + dy;
                const chunkKey = `${checkChunkX},${checkChunkY}`;
                
                // Mark chunk as loaded
                this.world.loadedChunks.set(chunkKey, {
                    x: checkChunkX,
                    y: checkChunkY,
                    loaded: true,
                    timestamp: Date.now()
                });
                
                // Generate objects for this chunk
                const chunkCenterX = checkChunkX * this.world.chunkSize + this.world.chunkSize / 2;
                const chunkCenterY = checkChunkY * this.world.chunkSize + this.world.chunkSize / 2;
                
                // Only generate objects if the chunk center is far enough from player
                const distanceFromPlayer = Math.sqrt(
                    (chunkCenterX - this.player.x) ** 2 + 
                    (chunkCenterY - this.player.y) ** 2
                );
                
                if (distanceFromPlayer > 400) { // Minimum safe distance
                    this.generateWorldObjects(chunkCenterX, chunkCenterY, this.world.chunkSize / 2);
                }
            }
        }
    }
    
    initializeMissions() {
        // Create initial mission objectives
        this.missions.objectives = [
            {
                id: 'explore_sectors',
                type: 'exploration',
                description: 'Explore all 5 sectors of space',
                target: 5,
                current: 0,
                reward: 'Final destination unlocked',
                completed: false
            },
            {
                id: 'collect_fragments',
                type: 'collection',
                description: 'Collect 50 tech fragments',
                target: 50,
                current: 0,
                reward: 'Advanced scanner upgrade',
                completed: false
            },
            {
                id: 'collect_crystals',
                type: 'collection',
                description: 'Collect 20 crystals',
                target: 20,
                current: 0,
                reward: 'Energy efficiency boost',
                completed: false
            },
            {
                id: 'survive_hazards',
                type: 'survival',
                description: 'Survive 100 hazard encounters',
                target: 100,
                current: 0,
                reward: 'Shield enhancement',
                completed: false
            },
            {
                id: 'upgrade_ship',
                type: 'upgrade',
                description: 'Complete 10 ship upgrades',
                target: 10,
                current: 0,
                reward: 'Maximum ship potential',
                completed: false
            }
        ];
        
        // Set current mission
        this.missions.current = this.missions.objectives[0];
        this.updateMissionDisplay();
    }
    
    updateMissionProgress(missionType, amount = 1) {
        // Update mission progress based on type
        const mission = this.missions.objectives.find(obj => obj.id === missionType);
        if (mission && !mission.completed) {
            mission.current = Math.min(mission.current + amount, mission.target);
            
            // Check if mission is completed
            if (mission.current >= mission.target) {
                mission.completed = true;
                this.completeMission(mission);
            }
            
            this.updateMissionDisplay();
        }
    }
    
    completeMission(mission) {
        this.missions.completed.push(mission);
        this.addMessage(`Mission completed: ${mission.description}!`);
        this.addMessage(`Reward: ${mission.reward}`);
        
        // Apply mission rewards
        switch (mission.id) {
            case 'collect_fragments':
                this.upgrades.scannerRange += 2;
                this.addMessage('Scanner range increased!');
                break;
            case 'collect_crystals':
                this.upgrades.energyEfficiency += 2;
                this.addMessage('Energy efficiency improved!');
                break;
            case 'survive_hazards':
                this.upgrades.shieldBoost += 3;
                this.addMessage('Shield systems enhanced!');
                break;
            case 'upgrade_ship':
                this.addMessage('Ship systems at maximum potential!');
                break;
        }
        
        // Move to next mission
        this.advanceToNextMission();
    }
    
    advanceToNextMission() {
        const nextMission = this.missions.objectives.find(obj => !obj.completed);
        if (nextMission) {
            this.missions.current = nextMission;
            this.updateMissionDisplay();
        } else {
            // All missions completed - game won!
            this.winGame();
        }
    }
    
    winGame() {
        this.gameState = 'gameOver';
        this.addMessage('Congratulations! You have completed all objectives!');
        this.addMessage('You have successfully explored all sectors and reached the final destination!');
        
        // Show win screen
        const gameOverScreen = document.getElementById('gameOverScreen');
        const gameOverTitle = document.getElementById('gameOverTitle');
        const gameOverMessage = document.getElementById('gameOverMessage');
        
        gameOverTitle.textContent = 'Mission Complete!';
        gameOverMessage.textContent = `You successfully explored all ${this.totalSectors} sectors and completed all objectives!`;
        gameOverScreen.classList.add('show');
    }
    
    updateMissionDisplay() {
        // Update mission progress in UI
        const missionElement = document.getElementById('currentMission');
        if (missionElement && this.missions.current) {
            const mission = this.missions.current;
            missionElement.innerHTML = `
                <div class="mission-title" style="font-weight: bold; color: #00ffff; margin-bottom: 4px;">Current Objective</div>
                <div class="mission-description" style="font-size: 10px; margin-bottom: 4px;">${mission.description}</div>
                <div class="mission-progress" style="font-size: 10px; color: #ffff00; margin-bottom: 4px;">${mission.current}/${mission.target}</div>
                <div class="mission-reward" style="font-size: 9px; color: #00ff00;">Reward: ${mission.reward}</div>
            `;
        }
        
        // Update sector progress
        this.updateSectorProgress();
    }
    
    updateSectorProgress() {
        // Calculate sector progress based on distance traveled
        const totalDistance = this.distance;
        const sectorProgress = Math.min(100, (totalDistance / this.nextSectorDistance) * 100);
        this.sectorProgress = sectorProgress;
        
        // Check for area warnings based on distance from start
        const distanceFromStart = Math.sqrt((this.player.x - 0) ** 2 + (this.player.y - 0) ** 2);
        
        // Add area warnings (only show once per area)
        if (!this.areaWarnings) {
            this.areaWarnings = {
                medium: false,
                far: false,
                deep: false
            };
        }
        
        if (distanceFromStart > 500 && !this.areaWarnings.medium) {
            this.areaWarnings.medium = true;
            this.addMessage('⚠️ Entering Medium Risk Area - Enemy activity increasing!');
        }
        if (distanceFromStart > 1000 && !this.areaWarnings.far) {
            this.areaWarnings.far = true;
            this.addMessage('⚠️ Entering High Risk Area - Hostile ships detected!');
        }
        if (distanceFromStart > 1500 && !this.areaWarnings.deep) {
            this.areaWarnings.deep = true;
            this.addMessage('⚠️ Entering Deep Space - Extreme danger ahead!');
        }
        
        // Update sector level
        const newLevel = Math.min(this.totalSectors, Math.floor(totalDistance / this.nextSectorDistance) + 1);
        if (newLevel > this.level) {
            this.level = newLevel;
            this.sectorsExplored = newLevel - 1;
            this.addMessage(`Entered Sector ${this.level}!`);
            this.updateMissionProgress('explore_sectors', 1);
        }
        
        // Update UI
        const sectorElement = document.getElementById('sectorValue');
        const progressElement = document.getElementById('progressValue');
        
        if (sectorElement) {
            sectorElement.textContent = `${this.level}/${this.totalSectors}`;
        }
        if (progressElement) {
            progressElement.textContent = `${Math.round(sectorProgress)}%`;
        }
    }
    
    generateStars() {
        this.stars = [];
        const numStars = 200;
        
        for (let i = 0; i < numStars; i++) {
            this.stars.push({
                x: (Math.random() - 0.5) * 10000,
                y: (Math.random() - 0.5) * 10000,
                size: Math.random() * 2 + 0.5,
                brightness: Math.random() * 0.8 + 0.2,
                twinkle: Math.random() * Math.PI * 2
            });
        }
    }
    
    generateWorldObjects(centerX, centerY, radius) {
        // Use seeded random for consistent world generation
        const rng = this.seededRandom(this.world.seed);
        
        // Define safe zones - objects won't spawn too close to player
        const minDistance = 300; // Increased minimum distance from player
        const objectSpacing = 80; // Increased minimum distance between objects
        
        // Helper function to find a random position within the chunk area
        const findRandomPosition = (attempts = 15) => {
            for (let attempt = 0; attempt < attempts; attempt++) {
                // Generate random position within chunk bounds
                const x = centerX + (rng() - 0.5) * radius * 2;
                const y = centerY + (rng() - 0.5) * radius * 2;
                
                // Check if position is safe from player and other objects
                const distanceFromPlayer = Math.sqrt((x - this.player.x) ** 2 + (y - this.player.y) ** 2);
                if (distanceFromPlayer > minDistance && this.isPositionSafe(x, y, objectSpacing)) {
                    return { x, y };
                }
            }
            // If no safe position found, try a position further from player
            const angle = rng() * Math.PI * 2;
            const distance = minDistance + rng() * 200;
            return {
                x: this.player.x + Math.cos(angle) * distance,
                y: this.player.y + Math.sin(angle) * distance
            };
        };
        
        // Generate energy orbs (reduced count to force exploration)
        for (let i = 0; i < 8; i++) {
            const pos = findRandomPosition();
            
            // Check if this area has been explored (prevent respawning in old areas)
            const areaKey = this.getAreaKey(pos.x, pos.y);
            if (!this.exploredAreas.has(areaKey)) {
                this.energyOrbs.push({
                    x: pos.x,
                    y: pos.y,
                    size: 6,
                    energy: 20,
                    collected: false,
                    pulse: Math.random() * Math.PI * 2
                });
            }
        }
        
        // Generate tech fragments
        for (let i = 0; i < 10; i++) {
            const pos = findRandomPosition();
            this.techFragments.push({
                x: pos.x,
                y: pos.y,
                size: 8, // Increased from 4 to 8 for better visibility
                collected: false,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.03 // Slowed down from 0.1 to 0.03 for gentler spinning
            });
        }
        
        // Generate crystals
        for (let i = 0; i < 8; i++) {
            const pos = findRandomPosition();
            this.crystals.push({
                x: pos.x,
                y: pos.y,
                size: 5,
                collected: false,
                glow: Math.random() * Math.PI * 2
            });
        }
        
        // Generate hazards
        for (let i = 0; i < 8; i++) {
            const pos = findRandomPosition();
            const hazardType = Math.random();
            let hazard;
            
            if (hazardType < 0.4) {
                // Asteroid - slow moving, high damage
                hazard = {
                    x: pos.x,
                    y: pos.y,
                    size: 15,
                    type: 'asteroid',
                    damage: 25,
                    active: true,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 0.02,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    maxSpeed: 0.8,
                    warningRadius: 80,
                    pulse: Math.random() * Math.PI * 2
                };
            } else if (hazardType < 0.7) {
                // Storm - stationary, energy drain
                hazard = {
                    x: pos.x,
                    y: pos.y,
                    size: 25,
                    type: 'storm',
                    damage: 0,
                    energyDrain: 0.1,
                    active: true,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 0.08,
                    warningRadius: 100,
                    pulse: Math.random() * Math.PI * 2,
                    innerRadius: 15,
                    outerRadius: 25
                };
            } else {
                // Plasma Field - fast moving, moderate damage
                hazard = {
                    x: pos.x,
                    y: pos.y,
                    size: 10,
                    type: 'plasma',
                    damage: 20,
                    active: true,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 0.1,
                    vx: (Math.random() - 0.5) * 1.2,
                    vy: (Math.random() - 0.5) * 1.2,
                    maxSpeed: 1.5,
                    warningRadius: 60,
                    pulse: Math.random() * Math.PI * 2,
                    trail: []
                };
                console.log(`Plasma hazard spawned at (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}) with damage: ${hazard.damage}`);
            }
            
            this.hazards.push(hazard);
        }
        
        // Generate upgrade stations (spawn less frequently)
        if (Math.random() < 0.5) { // 50% chance to spawn a station
            const pos = findRandomPosition();
            // Random station type
            const stationTypes = ['ship', 'weapon', 'hull', 'energy'];
            const stationType = stationTypes[Math.floor(Math.random() * stationTypes.length)];
            
            this.stations.push({
                x: pos.x,
                y: pos.y,
                size: 40,
                type: stationType,
                active: true,
                inRange: false,
                pulse: Math.random() * Math.PI * 2,
                used: false,
                vx: 0,
                vy: 0,
                departing: false,
                departureSpeed: 2.0,
                collapseProgress: 0, // For departure animation
                extendedParts: true // For visual pieces outside circle
            });
        }
        
        // Generate enemy ships (distance-based spawning)
        // Calculate distance from starting position (0,0)
        const distanceFromStart = Math.sqrt(centerX * centerX + centerY * centerY);
        
        // Progressive enemy spawn rate based on distance
        // Starting area (0-1500 units): Very low spawn rate (5%)
        // Medium area (1500-3000 units): Low spawn rate (15%)
        // Far area (3000-5000 units): Medium spawn rate (30%)
        // Deep space (5000+ units): High spawn rate (50%)
        let enemySpawnChance = 0.05; // Base 5% chance
        
        if (distanceFromStart > 1500) {
            enemySpawnChance = 0.15; // 15% chance
        }
        if (distanceFromStart > 3000) {
            enemySpawnChance = 0.30; // 30% chance
        }
        if (distanceFromStart > 5000) {
            enemySpawnChance = 0.50; // 50% chance
        }
        
        if (Math.random() < enemySpawnChance) {
            const pos = findRandomPosition();
            
            // Calculate enemy difficulty based on distance
            const difficultyMultiplier = Math.min(1 + (distanceFromStart / 2000), 2.5); // Max 2.5x difficulty
            const baseUpgrades = Math.floor(distanceFromStart / 1000); // More upgrades in deeper areas
            
            this.enemyShips.push({
                x: pos.x,
                y: pos.y,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                ax: 0, // acceleration x
                ay: 0, // acceleration y
                size: 12 * difficultyMultiplier, // Larger ships in deeper areas
                energy: 100 * difficultyMultiplier,
                maxEnergy: 100 * difficultyMultiplier,
                hull: 100 * difficultyMultiplier,
                maxHull: 100 * difficultyMultiplier,
                angle: Math.random() * Math.PI * 2,
                active: true,
                trail: [], // Add trail system for enemy ships
                // Movement properties
                thrust: 0.4 * difficultyMultiplier,
                maxSpeed: 2.0 * difficultyMultiplier,
                thrusterPower: 0,
                ai: {
                    state: 'exploring', // exploring, collecting, upgrading, attacking
                    target: null,
                    targetType: null, // 'fragment', 'crystal', 'station', 'player'
                    shootCooldown: 0,
                    lastSeenPlayer: 0,
                    aggression: Math.min(0.6 + (distanceFromStart / 2000), 1.0), // More aggressive in deeper areas
                    collectedFragments: 0,
                    collectedCrystals: 0,
                    upgrades: {
                        energyEfficiency: Math.min(baseUpgrades, 3),
                        shieldBoost: Math.min(baseUpgrades, 3),
                        scannerRange: Math.min(baseUpgrades + 1, 4), // Always at least 1
                        speedBoost: Math.min(baseUpgrades, 3),
                        energyCapacity: Math.min(baseUpgrades, 3)
                    }
                }
            });
        }
    }
    
    isPositionSafe(x, y, minDistance) {
        // Check distance from player
        const playerDistance = Math.sqrt((x - this.player.x) ** 2 + (y - this.player.y) ** 2);
        if (playerDistance < minDistance) return false;
        
        // Check distance from existing objects
        const allObjects = [...this.energyOrbs, ...this.techFragments, ...this.crystals, ...this.hazards, ...this.stations];
        
        for (const obj of allObjects) {
            const distance = Math.sqrt((x - obj.x) ** 2 + (y - obj.y) ** 2);
            if (distance < minDistance) return false;
        }
        
        return true;
    }
    
    getAreaKey(x, y) {
        // Create a grid-based area key (500x500 unit areas)
        const gridSize = 500;
        const gridX = Math.floor(x / gridSize);
        const gridY = Math.floor(y / gridSize);
        return `${gridX},${gridY}`;
    }
    
    markAreaAsExplored(x, y) {
        // Mark a 500x500 area as explored
        const areaKey = this.getAreaKey(x, y);
        this.exploredAreas.add(areaKey);
    }
    
    seededRandom(seed) {
        let state = seed;
        return () => {
            state = (state * 9301 + 49297) % 233280;
            return state / 233280;
        };
    }
    
    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleMouseLeave(e));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault()); // Prevent right-click menu
        
        // Prevent context menu on right click
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Focus canvas for keyboard input
        this.canvas.focus();
    }
    
    handleKeyDown(e) {
        this.keys[e.code] = true;
        
        switch (e.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.input.up = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.input.down = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.input.left = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.input.right = true;
                break;
            case 'KeyE':
                this.input.interact = true;
                break;
            case 'KeyQ':
                this.input.rotateLeft = true;
                break;
            case 'KeyR':
                this.input.rotateRight = true;
                break;
            case 'Space':
                this.input.shoot = true;
                break;
            case 'Escape':
                this.togglePause();
                break;
        }
        
        e.preventDefault();
    }
    
    handleKeyUp(e) {
        this.keys[e.code] = false;
        
        switch (e.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.input.up = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.input.down = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.input.left = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.input.right = false;
                break;
            case 'KeyE':
                this.input.interact = false;
                break;
            case 'KeyQ':
                this.input.rotateLeft = false;
                break;
            case 'KeyR':
                this.input.rotateRight = false;
                break;
            case 'Space':
                this.input.shoot = false;
                break;
        }
    }
    
    handleMouseDown(e) {
        if (e.button === 0) { // Left mouse button
            this.input.mouseThrust = true;
            this.updateMousePosition(e);
            this.updateMouseTargetVisibility();
        } else if (e.button === 2) { // Right mouse button
            this.input.shoot = true;
        }
    }
    
    handleMouseUp(e) {
        if (e.button === 0) { // Left mouse button
            this.input.mouseThrust = false;
            this.updateMouseTargetVisibility();
        } else if (e.button === 2) { // Right mouse button
            this.input.shoot = false;
        }
    }
    
    handleMouseMove(e) {
        this.updateMousePosition(e);
        this.updateMouseTargetVisibility();
    }
    
    handleMouseLeave(e) {
        this.input.mouseThrust = false;
        this.updateMouseTargetVisibility();
    }
    
    updateMouseTargetVisibility() {
        if (this.ui.mouseTarget) {
            if (this.input.mouseThrust) {
                this.ui.mouseTarget.classList.add('active');
            } else {
                this.ui.mouseTarget.classList.remove('active');
            }
        }
    }
    
    updateMousePosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        
        // Convert canvas coordinates to world coordinates
        this.input.mouseX = this.camera.x + (canvasX - this.canvas.width / 2);
        this.input.mouseY = this.camera.y + (canvasY - this.canvas.height / 2);
        
        // Update mouse target indicator position
        if (this.ui.mouseTarget) {
            this.ui.mouseTarget.style.left = e.clientX - rect.left + 'px';
            this.ui.mouseTarget.style.top = e.clientY - rect.top + 'px';
        }
    }
    
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }
    
    showError(message) {
        console.error(message);
        // Could show error UI here
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.gameState = 'playing';
        this.lastTime = performance.now();
        
        this.gameLoop = requestAnimationFrame((time) => this.update(time));
        
        console.log('🚀 Cosmic Drifter started');
    }
    
    stop() {
        this.isRunning = false;
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
            this.gameLoop = null;
        }
        console.log('⏹️ Cosmic Drifter stopped');
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.gameState = 'paused';
            this.addMessage('Game Paused - Press ESC to resume');
        } else {
            this.gameState = 'playing';
            this.addMessage('Game Resumed');
        }
    }
    
    update(currentTime) {
        if (!this.isRunning) return;
        
        this.deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Update FPS counter
        this.updateFPS(currentTime);
        
        if (!this.isPaused && this.gameState === 'playing') {
            // Update game logic
            this.updatePlayer();
            this.updateCamera();
            this.updateWorld();
            this.updateObjects();
            this.updateParticles();
            this.updateUI();
            this.checkCollisions();
            this.checkGameOver();
        }
        
        // Always render
        this.render();
        
        // Continue game loop
        this.gameLoop = requestAnimationFrame((time) => this.update(time));
    }
    
    updateFPS(currentTime) {
        this.frameCount++;
        if (currentTime - this.lastFpsTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsTime = currentTime;
        }
    }
    
    updatePlayer() {
        // Handle input
        let thrustX = 0;
        let thrustY = 0;
        let rotation = 0;
        
        // Keyboard input
        if (this.input.up) thrustY -= 1;
        if (this.input.down) thrustY += 1;
        if (this.input.left) thrustX -= 1;
        if (this.input.right) thrustX += 1;
        
        // Separate rotation controls (Q and E keys for rotation)
        if (this.input.rotateLeft) rotation -= 1;
        if (this.input.rotateRight) rotation += 1;
        
        // Mouse input - thrust towards mouse position
        if (this.input.mouseThrust) {
            const dx = this.input.mouseX - this.player.x;
            const dy = this.input.mouseY - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 10) { // Only thrust if mouse is far enough from player
                thrustX += dx / distance;
                thrustY += dy / distance;
            }
        }
        
        // Calculate thrust magnitude first
        const thrustMagnitude = Math.sqrt(thrustX * thrustX + thrustY * thrustY);
        
        // Apply rotation (simplified)
        if (rotation !== 0) {
            this.player.angle += rotation * 0.1;
        }
        
        // Auto-rotate ship to face movement direction when moving
        if (thrustMagnitude > 0) {
            const targetAngle = Math.atan2(thrustY, thrustX);
            const angleDiff = targetAngle - this.player.angle;
            
            // Normalize angle difference to [-π, π]
            let normalizedDiff = angleDiff;
            while (normalizedDiff > Math.PI) normalizedDiff -= 2 * Math.PI;
            while (normalizedDiff < -Math.PI) normalizedDiff += 2 * Math.PI;
            
            // Smooth rotation towards target angle
            this.player.angle += normalizedDiff * 0.1;
        }
        
        // Apply thrust with simple acceleration
        const thrustForce = this.player.thrust * (1 + this.upgrades.speedBoost * 0.2);
        this.player.thrusterPower = thrustMagnitude;
        
        if (thrustMagnitude > 0) {
            this.player.vx += thrustX * thrustForce * 0.1;
            this.player.vy += thrustY * thrustForce * 0.1;
            
            // Create thruster particles
            this.createThrusterParticles();
        }
        
        // Apply friction (very low for space - ship continues moving)
        this.player.vx *= 0.98;
        this.player.vy *= 0.98;
        
        // Limit speed
        const speed = Math.sqrt(this.player.vx * this.player.vx + this.player.vy * this.player.vy);
        if (speed > this.player.maxSpeed) {
            this.player.vx = (this.player.vx / speed) * this.player.maxSpeed;
            this.player.vy = (this.player.vy / speed) * this.player.maxSpeed;
        }
        
        // Update position
        this.player.x += this.player.vx;
        this.player.y += this.player.vy;
        
        // Update distance traveled
        this.distance += speed;
        
        // Mark current area as explored (for energy orb respawn prevention)
        this.markAreaAsExplored(this.player.x, this.player.y);
        
        // Update sector progress
        this.updateSectorProgress();
        
        // Drain energy over time
        this.player.energy -= 0.02 * (1 - this.upgrades.energyEfficiency * 0.1);
        if (this.player.energy <= 0) {
            this.player.energy = 0;
            this.gameState = 'gameOver';
        }
        
        // Hull regeneration
        if (this.upgrades.hullRegen > 0 && this.player.hull < this.player.maxHull) {
            this.player.hull += this.upgrades.hullRegen * 0.01;
            this.player.hull = Math.min(this.player.hull, this.player.maxHull);
        }
        
        // Auto repair
        if (this.upgrades.autoRepair > 0 && this.player.hull < this.player.maxHull * 0.5) {
            this.player.hull += this.upgrades.autoRepair * 0.02;
            this.player.hull = Math.min(this.player.hull, this.player.maxHull);
        }
        
        // Check for station interaction
        this.checkStationInteraction();
    }
    
    updateCamera() {
        // Smooth camera following
        this.camera.targetX = this.player.x;
        this.camera.targetY = this.player.y;
        
        this.camera.x += (this.camera.targetX - this.camera.x) * this.camera.smoothing;
        this.camera.y += (this.camera.targetY - this.camera.y) * this.camera.smoothing;
    }
    
    updateWorld() {
        // Check if we need to generate new chunks
        const chunkX = Math.floor(this.player.x / this.world.chunkSize);
        const chunkY = Math.floor(this.player.y / this.world.chunkSize);
        
        // Pre-emptively load chunks in a 3x3 grid around the player
        const loadRadius = 1; // Load 1 chunk in each direction (3x3 grid)
        
        for (let dx = -loadRadius; dx <= loadRadius; dx++) {
            for (let dy = -loadRadius; dy <= loadRadius; dy++) {
                const checkChunkX = chunkX + dx;
                const checkChunkY = chunkY + dy;
                const chunkKey = `${checkChunkX},${checkChunkY}`;
                
                // Check if this chunk hasn't been loaded yet
                if (!this.world.loadedChunks.has(chunkKey)) {
                    // Mark chunk as loaded
                    this.world.loadedChunks.set(chunkKey, {
                        x: checkChunkX,
                        y: checkChunkY,
                        loaded: true,
                        timestamp: Date.now()
                    });
                    
                    // Generate objects for this chunk
                    const chunkCenterX = checkChunkX * this.world.chunkSize + this.world.chunkSize / 2;
                    const chunkCenterY = checkChunkY * this.world.chunkSize + this.world.chunkSize / 2;
                    
                    // Only generate objects if the chunk center is far enough from player
                    const distanceFromPlayer = Math.sqrt(
                        (chunkCenterX - this.player.x) ** 2 + 
                        (chunkCenterY - this.player.y) ** 2
                    );
                    
                    if (distanceFromPlayer > 400) { // Minimum safe distance
                        this.generateWorldObjects(chunkCenterX, chunkCenterY, this.world.chunkSize / 2);
                    }
                }
            }
        }
        
        // Update last chunk position
        this.world.lastChunkX = chunkX;
        this.world.lastChunkY = chunkY;
        
        // Clean up old chunks that are too far away (optional - for memory management)
        this.cleanupDistantChunks();
    }
    
    cleanupDistantChunks() {
        const currentChunkX = Math.floor(this.player.x / this.world.chunkSize);
        const currentChunkY = Math.floor(this.player.y / this.world.chunkSize);
        const cleanupRadius = 5; // Keep chunks within 5 chunk radius
        
        for (const [chunkKey, chunkData] of this.world.loadedChunks.entries()) {
            const distance = Math.sqrt(
                (chunkData.x - currentChunkX) ** 2 + 
                (chunkData.y - currentChunkY) ** 2
            );
            
            if (distance > cleanupRadius) {
                this.world.loadedChunks.delete(chunkKey);
            }
        }
    }
    
    updateObjects() {
        // Update energy orbs
        this.energyOrbs.forEach(orb => {
            orb.pulse += 0.1;
        });
        
        // Update tech fragments
        this.techFragments.forEach(fragment => {
            fragment.rotation += fragment.rotationSpeed;
        });
        
        // Update crystals
        this.crystals.forEach(crystal => {
            crystal.glow += 0.05; // Slowed down from 0.15 to 0.05 for gentler animation
        });
        
        // Update hazards
        this.hazards.forEach(hazard => {
            hazard.rotation += hazard.rotationSpeed;
            hazard.pulse += 0.1;
            
            // Update moving hazards
            if (hazard.vx !== undefined && hazard.vy !== undefined) {
                hazard.x += hazard.vx;
                hazard.y += hazard.vy;
                
                // Limit speed
                const speed = Math.sqrt(hazard.vx * hazard.vx + hazard.vy * hazard.vy);
                if (speed > hazard.maxSpeed) {
                    hazard.vx = (hazard.vx / speed) * hazard.maxSpeed;
                    hazard.vy = (hazard.vy / speed) * hazard.maxSpeed;
                }
                
                // Add some random movement variation
                if (Math.random() < 0.02) {
                    hazard.vx += (Math.random() - 0.5) * 0.1;
                    hazard.vy += (Math.random() - 0.5) * 0.1;
                }
                
                // Update plasma trail
                if (hazard.type === 'plasma') {
                    hazard.trail.push({ x: hazard.x, y: hazard.y, life: 1.0 });
                    if (hazard.trail.length > 8) {
                        hazard.trail.shift();
                    }
                    hazard.trail.forEach(point => point.life -= 0.05);
                    hazard.trail = hazard.trail.filter(point => point.life > 0);
                }
            }
        });
        
        // Update stations
        this.stations.forEach((station, index) => {
            station.pulse += 0.05;
            
            // Handle station departure after use
            if (station.departing) {
                // Animate collapse before departure
                if (station.collapseProgress < 1.0) {
                    station.collapseProgress += 0.02; // Collapse over time
                } else {
                    // Start moving after collapse is complete
                    station.x += station.vx;
                    station.y += station.vy;
                }
                
                // Remove station if it's gone far off screen
                const distanceFromPlayer = Math.sqrt((station.x - this.player.x) ** 2 + (station.y - this.player.y) ** 2);
                if (distanceFromPlayer > 3000) {
                    this.stations.splice(index, 1);
                }
            }
        });
        
        // Update enemy ships
        this.updateEnemyShips();
        
        // Update projectiles
        this.updateProjectiles();
        
        // Handle player shooting
        this.handlePlayerShooting();
    }
    
    handlePlayerShooting() {
        // Update shoot cooldown
        if (this.input.shootCooldown > 0) {
            this.input.shootCooldown -= this.deltaTime;
        }
        
        // Handle shooting input
        if (this.input.shoot && this.input.shootCooldown <= 0) {
            // Calculate ship's current speed
            const shipSpeed = Math.sqrt(this.player.vx * this.player.vx + this.player.vy * this.player.vy);
            
            // Always shoot towards mouse cursor
            const dx = this.input.mouseX - this.player.x;
            const dy = this.input.mouseY - this.player.y;
            const shootAngle = Math.atan2(dy, dx);
            
            // Enhanced shooting with upgrades
            const bulletCount = 1 + this.upgrades.bulletCount;
            const spreadAngle = this.upgrades.multiShot > 0 ? 0.3 : 0;
            
            for (let i = 0; i < bulletCount; i++) {
                const angle = shootAngle + (i - (bulletCount - 1) / 2) * spreadAngle;
                this.shootProjectile(this.player.x, this.player.y, angle, 'player');
            }
            
            this.input.shootCooldown = 0.3 / (1 + this.upgrades.fireRate * 0.2); // Faster fire rate
            this.playSound('shoot');
        }
    }
    
    shootProjectile(x, y, angle, owner) {
        // Calculate ship's current speed
        let shipSpeed = 0;
        if (owner === 'player') {
            shipSpeed = Math.sqrt(this.player.vx * this.player.vx + this.player.vy * this.player.vy);
        } else {
            // For enemy ships, we need to find the enemy that's shooting
            const enemy = this.enemyShips.find(e => Math.abs(e.x - x) < 20 && Math.abs(e.y - y) < 20);
            if (enemy) {
                shipSpeed = Math.sqrt(enemy.vx * enemy.vx + enemy.vy * enemy.vy);
            }
        }
        
        // Enhanced bullet properties based on upgrades
        const baseSpeed = 600 + (owner === 'player' ? this.upgrades.bulletSpeed * 50 : 0);
        const totalSpeed = baseSpeed + shipSpeed;
        const damage = 15 + (owner === 'player' ? this.upgrades.bulletDamage * 5 : 0);
        const size = 3 + (owner === 'player' ? this.upgrades.bulletPenetration * 0.5 : 0);
        
        const projectile = {
            x: x + Math.cos(angle) * 15,
            y: y + Math.sin(angle) * 15,
            vx: Math.cos(angle) * totalSpeed,
            vy: Math.sin(angle) * totalSpeed,
            size: size,
            damage: damage,
            owner: owner,
            life: 3.0 + (owner === 'player' ? this.upgrades.bulletPenetration * 0.5 : 0),
            active: true,
            penetration: owner === 'player' ? this.upgrades.bulletPenetration : 0,
            explosive: owner === 'player' ? this.upgrades.explosiveBullets > 0 : false
        };
        
        this.projectiles.push(projectile);
    }
    
    updateProjectiles() {
        this.projectiles.forEach((projectile, index) => {
            if (!projectile.active) return;
            
            // Update position
            projectile.x += projectile.vx * this.deltaTime;
            projectile.y += projectile.vy * this.deltaTime;
            projectile.life -= this.deltaTime;
            
            // Check if projectile is off screen (despawn at edge of screen)
            const screenMargin = 200; // Extra margin beyond screen
            const distanceFromPlayer = Math.sqrt(
                (projectile.x - this.player.x) ** 2 + 
                (projectile.y - this.player.y) ** 2
            );
            
            // Remove projectiles that are too far from player (off screen)
            if (distanceFromPlayer > this.canvas.width + screenMargin || 
                distanceFromPlayer > this.canvas.height + screenMargin ||
                projectile.life <= 0) {
                this.projectiles.splice(index, 1);
                return;
            }
            
            // Check collisions
            if (projectile.owner === 'player') {
                // Player projectile hits enemies
                this.enemyShips.forEach((enemy, enemyIndex) => {
                    if (!enemy.active) return;
                    
                    const dx = projectile.x - enemy.x;
                    const dy = projectile.y - enemy.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < projectile.size + enemy.size) {
                        // Hit enemy
                        enemy.hull -= projectile.damage;
                        this.createDamageParticles(enemy.x, enemy.y);
                        projectile.active = false;
                        
                        if (enemy.hull <= 0) {
                            enemy.active = false;
                            this.createExplosionParticles(enemy.x, enemy.y);
                            this.addMessage('Enemy ship destroyed!');
                            this.score += 100;
                        }
                    }
                });
                
                // Player projectile hits destructible hazards
                this.hazards.forEach((hazard, hazardIndex) => {
                    if (!hazard.active || hazard.type === 'storm') return; // Storms can't be destroyed
                    
                    const dx = projectile.x - hazard.x;
                    const dy = projectile.y - hazard.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < projectile.size + hazard.size) {
                        // Destroy hazard
                        hazard.active = false;
                        this.createExplosionParticles(hazard.x, hazard.y);
                        projectile.active = false;
                        this.addMessage('Hazard destroyed!');
                        this.score += 50;
                    }
                });
                
                // Player projectile hits upgrade stations
                this.stations.forEach((station, stationIndex) => {
                    if (!station.active || station.used || station.departing) return;
                    
                    const dx = projectile.x - station.x;
                    const dy = projectile.y - station.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < projectile.size + station.size) {
                        // Force station to depart immediately
                        station.used = true;
                        station.departing = true;
                        
                        // Calculate departure direction (away from player)
                        const playerDx = station.x - this.player.x;
                        const playerDy = station.y - this.player.y;
                        const playerDistance = Math.sqrt(playerDx * playerDx + playerDy * playerDy);
                        
                        if (playerDistance > 0) {
                            station.vx = (playerDx / playerDistance) * station.departureSpeed;
                            station.vy = (playerDy / playerDistance) * station.departureSpeed;
                        } else {
                            // Random direction if player is exactly at station
                            const angle = Math.random() * Math.PI * 2;
                            station.vx = Math.cos(angle) * station.departureSpeed;
                            station.vy = Math.sin(angle) * station.departureSpeed;
                        }
                        
                        projectile.active = false;
                        this.addMessage('Upgrade station departing!');
                        this.score += 25;
                    }
                });
                
            } else if (projectile.owner === 'enemy') {
                // Enemy projectile hits player (only if not in safe zone)
                const dx = projectile.x - this.player.x;
                const dy = projectile.y - this.player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < projectile.size + this.player.size && !this.isPlayerInSafeZone()) {
                    // Hit player
                    this.player.hull -= projectile.damage;
                    this.createDamageParticles(this.player.x, this.player.y);
                    projectile.active = false;
                    this.addMessage('Hit by enemy fire!');
                }
            }
        });
        
        // Remove inactive projectiles
        this.projectiles = this.projectiles.filter(p => p.active);
    }
    
    updateEnemyShips() {
        this.enemyShips.forEach((enemy, index) => {
            if (!enemy.active) return;
            
            // Update enemy AI
            this.updateEnemyAI(enemy);
            
            // Apply AI movement to acceleration
            const aiThrust = this.calculateEnemyThrust(enemy);
            enemy.thrusterPower = aiThrust.magnitude;
            
            if (aiThrust.magnitude > 0) {
                const thrustForce = enemy.thrust * (1 + enemy.ai.upgrades.speedBoost * 0.2);
                enemy.vx += aiThrust.x * thrustForce * 0.1;
                enemy.vy += aiThrust.y * thrustForce * 0.1;
                
                // Create enemy thruster particles
                this.createEnemyThrusterParticles(enemy);
            }
            
            // Apply rotation (simplified)
            if (aiThrust.rotation !== 0) {
                enemy.angle += aiThrust.rotation * 0.1;
            }
            
            // Auto-rotate enemy ship to face movement direction when moving
            if (aiThrust.magnitude > 0) {
                const targetAngle = Math.atan2(aiThrust.y, aiThrust.x);
                const angleDiff = targetAngle - enemy.angle;
                
                // Normalize angle difference to [-π, π]
                let normalizedDiff = angleDiff;
                while (normalizedDiff > Math.PI) normalizedDiff -= 2 * Math.PI;
                while (normalizedDiff < -Math.PI) normalizedDiff += 2 * Math.PI;
                
                // Smooth rotation towards target angle
                enemy.angle += normalizedDiff * 0.1;
            }
            
            // Apply friction (very low for space - ship continues moving)
            enemy.vx *= 0.98;
            enemy.vy *= 0.98;
            
            // Limit speed
            const speed = Math.sqrt(enemy.vx * enemy.vx + enemy.vy * enemy.vy);
            if (speed > enemy.maxSpeed) {
                enemy.vx = (enemy.vx / speed) * enemy.maxSpeed;
                enemy.vy = (enemy.vy / speed) * enemy.maxSpeed;
            }
            
            // Update position
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;
            
            // Check collision with hazards
            this.hazards.forEach(hazard => {
                const dx = enemy.x - hazard.x;
                const dy = enemy.y - hazard.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < enemy.size + hazard.size) {
                    // Enemy ship hit a hazard - destroy it
                    enemy.active = false;
                    this.createExplosionParticles(enemy.x, enemy.y);
                    this.addMessage('Enemy ship destroyed by hazard!');
                    this.score += 50; // Less points than player destroying it
                }
            });
            
            // Update trail system
            if (speed > 0.5) {
                enemy.trail.push({
                    x: enemy.x,
                    y: enemy.y,
                    life: 0.5
                });
                
                // Limit trail length
                if (enemy.trail.length > 10) {
                    enemy.trail.shift();
                }
            }
            
            // Update trail particles
            enemy.trail.forEach(point => {
                point.life -= this.deltaTime;
            });
            enemy.trail = enemy.trail.filter(point => point.life > 0);
            
            // Update shoot cooldown
            if (enemy.ai.shootCooldown > 0) {
                enemy.ai.shootCooldown -= this.deltaTime;
            }
            
            // Drain energy
            enemy.energy -= 0.5 * this.deltaTime * (1 - enemy.ai.upgrades.energyEfficiency * 0.1);
            
            // Remove if energy depleted
            if (enemy.energy <= 0) {
                enemy.active = false;
                this.createExplosionParticles(enemy.x, enemy.y);
                this.addMessage('Enemy ship destroyed!');
                this.score += 100;
            }
        });
        
        // Remove inactive enemies
        this.enemyShips = this.enemyShips.filter(enemy => enemy.active);
    }
    
    updateEnemyAI(enemy) {
        const playerDistance = Math.sqrt((enemy.x - this.player.x) ** 2 + (enemy.y - this.player.y) ** 2);
        const scannerRange = 400 + enemy.ai.upgrades.scannerRange * 100;
        
        // Update AI state based on situation - reduced aggression for more strategic behavior
        if (playerDistance < scannerRange && Math.random() < enemy.ai.aggression * 0.6) { // Reduced by 40%
            enemy.ai.state = 'attacking';
            enemy.ai.target = { x: this.player.x, y: this.player.y };
            enemy.ai.targetType = 'player';
            enemy.ai.lastSeenPlayer = Date.now();
        } else if (enemy.ai.state === 'attacking' && Date.now() - enemy.ai.lastSeenPlayer > 5000) { // Increased timeout
            enemy.ai.state = 'exploring';
            enemy.ai.target = null;
            enemy.ai.circleTarget = null; // Reset circling behavior
        }
        
        // Find targets based on current state
        if (enemy.ai.state === 'exploring' || enemy.ai.state === 'collecting') {
            this.findEnemyTarget(enemy);
        }
        
        // Execute current state
        switch (enemy.ai.state) {
            case 'exploring':
                this.enemyExplore(enemy);
                break;
            case 'collecting':
                this.enemyCollect(enemy);
                break;
            case 'upgrading':
                this.enemyUpgrade(enemy);
                break;
            case 'attacking':
                this.enemyAttack(enemy);
                break;
        }
    }
    
    findEnemyTarget(enemy) {
        const scannerRange = 400 + enemy.ai.upgrades.scannerRange * 100;
        let closestTarget = null;
        let closestDistance = scannerRange;
        
        // Look for tech fragments
        this.techFragments.forEach(fragment => {
            if (fragment.collected) return;
            
            const distance = Math.sqrt((enemy.x - fragment.x) ** 2 + (enemy.y - fragment.y) ** 2);
            if (distance < closestDistance) {
                closestTarget = { x: fragment.x, y: fragment.y, type: 'fragment', object: fragment };
                closestDistance = distance;
            }
        });
        
        // Look for crystals
        this.crystals.forEach(crystal => {
            if (crystal.collected) return;
            
            const distance = Math.sqrt((enemy.x - crystal.x) ** 2 + (enemy.y - crystal.y) ** 2);
            if (distance < closestDistance) {
                closestTarget = { x: crystal.x, y: crystal.y, type: 'crystal', object: crystal };
                closestDistance = distance;
            }
        });
        
        // Look for upgrade stations
        this.stations.forEach(station => {
            if (station.used || station.departing) return;
            
            const distance = Math.sqrt((enemy.x - station.x) ** 2 + (enemy.y - station.y) ** 2);
            if (distance < closestDistance) {
                closestTarget = { x: station.x, y: station.y, type: 'station', object: station };
                closestDistance = distance;
            }
        });
        
        if (closestTarget) {
            enemy.ai.target = closestTarget;
            enemy.ai.targetType = closestTarget.type;
            enemy.ai.state = closestTarget.type === 'station' ? 'upgrading' : 'collecting';
        }
    }
    
    calculateEnemyThrust(enemy) {
        let thrustX = 0;
        let thrustY = 0;
        let rotation = 0;
        
        switch (enemy.ai.state) {
            case 'exploring':
                // Random exploration movement
                if (Math.random() < 0.02) {
                    const angle = Math.random() * Math.PI * 2;
                    thrustX = Math.cos(angle);
                    thrustY = Math.sin(angle);
                }
                break;
                
            case 'collecting':
                if (enemy.ai.target) {
                    const dx = enemy.ai.target.x - enemy.x;
                    const dy = enemy.ai.target.y - enemy.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance > 20) {
                        thrustX = dx / distance;
                        thrustY = dy / distance;
                    }
                }
                break;
                
            case 'upgrading':
                if (enemy.ai.target) {
                    const dx = enemy.ai.target.x - enemy.x;
                    const dy = enemy.ai.target.y - enemy.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance > 50) {
                        thrustX = dx / distance;
                        thrustY = dy / distance;
                    }
                }
                break;
                
            case 'attacking':
                if (enemy.ai.circleTarget) {
                    // Move towards circling position
                    const dx = enemy.ai.circleTarget.x - enemy.x;
                    const dy = enemy.ai.circleTarget.y - enemy.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance > 30) {
                        // Smooth movement towards circle position
                        thrustX = dx / distance;
                        thrustY = dy / distance;
                        
                        // Add some lateral movement for more dynamic circling
                        const lateralForce = 0.3;
                        const lateralAngle = Math.atan2(dy, dx) + (enemy.ai.circleDirection * Math.PI / 2);
                        thrustX += Math.cos(lateralAngle) * lateralForce;
                        thrustY += Math.sin(lateralAngle) * lateralForce;
                        
                        // Normalize the thrust vector
                        const thrustMagnitude = Math.sqrt(thrustX * thrustX + thrustY * thrustY);
                        if (thrustMagnitude > 0) {
                            thrustX /= thrustMagnitude;
                            thrustY /= thrustMagnitude;
                        }
                    }
                }
                break;
        }
        
        return {
            x: thrustX,
            y: thrustY,
            rotation: rotation,
            magnitude: Math.sqrt(thrustX * thrustX + thrustY * thrustY)
        };
    }
    
    enemyExplore(enemy) {
        // This is now handled by calculateEnemyThrust
    }
    
    enemyCollect(enemy) {
        if (!enemy.ai.target) return;
        
        const dx = enemy.ai.target.x - enemy.x;
        const dy = enemy.ai.target.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 20) {
            // Collect the target
            if (enemy.ai.targetType === 'fragment') {
                enemy.ai.target.object.collected = true;
                enemy.ai.collectedFragments++;
                this.createCollectParticles(enemy.x, enemy.y, '#00ff00');
            } else if (enemy.ai.targetType === 'crystal') {
                enemy.ai.target.object.collected = true;
                enemy.ai.collectedCrystals++;
                this.createCollectParticles(enemy.x, enemy.y, '#0088ff');
            }
            
            enemy.ai.state = 'exploring';
            enemy.ai.target = null;
        }
    }
    
    enemyUpgrade(enemy) {
        if (!enemy.ai.target) return;
        
        const dx = enemy.ai.target.x - enemy.x;
        const dy = enemy.ai.target.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 50) {
            // Try to upgrade (simplified - just give random upgrade)
            const upgradeTypes = ['energyEfficiency', 'shieldBoost', 'scannerRange', 'speedBoost', 'energyCapacity'];
            const randomUpgrade = upgradeTypes[Math.floor(Math.random() * upgradeTypes.length)];
            enemy.ai.upgrades[randomUpgrade]++;
            
            // Mark station as used
            enemy.ai.target.object.used = true;
            enemy.ai.target.object.departing = true;
            
            // Calculate departure direction
            const departureAngle = Math.random() * Math.PI * 2;
            enemy.ai.target.object.vx = Math.cos(departureAngle) * 2.0;
            enemy.ai.target.object.vy = Math.sin(departureAngle) * 2.0;
            
            enemy.ai.state = 'exploring';
            enemy.ai.target = null;
        } else {
            // Move toward station (matching player speed)
            const thrust = 1.0; // Increased to match player thrust
            enemy.vx += (dx / distance) * thrust;
            enemy.vy += (dy / distance) * thrust;
        }
    }
    
    enemyAttack(enemy) {
        if (!enemy.ai.target) return;
        
        const dx = enemy.ai.target.x - enemy.x;
        const dy = enemy.ai.target.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Initialize circling behavior if not set
        if (!enemy.ai.circleDirection) {
            enemy.ai.circleDirection = Math.random() < 0.5 ? 1 : -1; // Clockwise or counter-clockwise
            enemy.ai.circleRadius = 150 + Math.random() * 100; // 150-250 unit radius
            enemy.ai.lastCircleTime = Date.now();
        }
        
        // Update circling behavior
        const currentTime = Date.now();
        if (currentTime - enemy.ai.lastCircleTime > 5000) { // Change direction every 5 seconds
            enemy.ai.circleDirection *= -1;
            enemy.ai.circleRadius = 150 + Math.random() * 100;
            enemy.ai.lastCircleTime = currentTime;
        }
        
        // Calculate optimal circling position
        const angleToPlayer = Math.atan2(dy, dx);
        const circleAngle = angleToPlayer + (enemy.ai.circleDirection * Math.PI / 2); // 90 degrees offset
        const targetX = enemy.ai.target.x + Math.cos(circleAngle) * enemy.ai.circleRadius;
        const targetY = enemy.ai.target.y + Math.sin(circleAngle) * enemy.ai.circleRadius;
        
        // Store target for movement calculation
        enemy.ai.circleTarget = { x: targetX, y: targetY };
        
        // Shooting logic - shoot when in good position
        const shootingRange = 120 + enemy.ai.upgrades.scannerRange * 20; // 120-200 unit range
        if (distance < shootingRange && enemy.ai.shootCooldown <= 0) {
            // Lead the target based on player movement
            const playerSpeed = Math.sqrt(this.player.vx * this.player.vx + this.player.vy * this.player.vy);
            const leadTime = distance / 600; // Bullet speed is 600
            const leadX = this.player.x + this.player.vx * leadTime;
            const leadY = this.player.y + this.player.vy * leadTime;
            
            const leadDx = leadX - enemy.x;
            const leadDy = leadY - enemy.y;
            const angle = Math.atan2(leadDy, leadDx);
            
            this.shootProjectile(enemy.x, enemy.y, angle, 'enemy');
            enemy.ai.shootCooldown = 0.8 + Math.random() * 0.4; // 0.8-1.2 second cooldown
        }
        
        // Retreat if too close
        if (distance < 80) {
            enemy.ai.circleRadius = Math.max(120, enemy.ai.circleRadius + 20);
        }
    }
    
    createExplosionParticles(x, y) {
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 1.0,
                maxLife: 1.0,
                size: Math.random() * 3 + 2,
                color: '#ff4400'
            });
        }
    }
    
    updateParticles() {
        // Update and remove expired particles
        this.particles = this.particles.filter(particle => {
            particle.life -= this.deltaTime;
            particle.x += particle.vx * this.deltaTime;
            particle.y += particle.vy * this.deltaTime;
            particle.alpha = particle.life / particle.maxLife;
            return particle.life > 0;
        });
    }
    
    updateUI() {
        // Update energy bar
        const energyPercent = (this.player.energy / (this.player.maxEnergy + this.upgrades.energyCapacity * 20)) * 100;
        this.ui.energyBar.style.width = energyPercent + '%';
        this.ui.energyValue.textContent = Math.round(energyPercent);
        
        // Update hull bar
        const hullPercent = (this.player.hull / this.player.maxHull) * 100;
        this.ui.hullBar.style.width = hullPercent + '%';
        this.ui.hullValue.textContent = Math.round(hullPercent);
        
        // Update speed
        const speed = Math.sqrt(this.player.vx * this.player.vx + this.player.vy * this.player.vy);
        this.ui.speedValue.textContent = Math.round(speed * 10);
        
        // Update distance
        this.ui.distanceValue.textContent = Math.round(this.distance / 100);
        
        // Update resources
        this.ui.fragmentsValue.textContent = this.resources.techFragments;
        this.ui.crystalsValue.textContent = this.resources.crystals;
        
        // Update mini-map
        this.updateMinimap();
    }
    
    updateMinimap() {
        const minimap = this.ui.minimap;
        const player = this.ui.minimapPlayer;
        
        // Update player position on minimap
        const minimapCenterX = minimap.clientWidth / 2;
        const minimapCenterY = minimap.clientHeight / 2;
        
        player.style.left = minimapCenterX + 'px';
        player.style.top = minimapCenterY + 'px';
        
        // Clear existing objects
        const existingObjects = minimap.querySelectorAll('.minimap-object');
        existingObjects.forEach(obj => obj.remove());
        
        // Add nearby objects to minimap
        const scannerRange = 500 * this.upgrades.scannerRange;
        
        [...this.energyOrbs, ...this.techFragments, ...this.crystals, ...this.hazards, ...this.stations]
            .filter(obj => {
                const dx = obj.x - this.player.x;
                const dy = obj.y - this.player.y;
                return Math.sqrt(dx * dx + dy * dy) <= scannerRange && !obj.collected;
            })
            .forEach(obj => {
                const dx = obj.x - this.player.x;
                const dy = obj.y - this.player.y;
                const angle = Math.atan2(dy, dx);
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Convert to minimap coordinates
                const minimapX = minimapCenterX + Math.cos(angle) * (distance / scannerRange) * 80;
                const minimapY = minimapCenterY + Math.sin(angle) * (distance / scannerRange) * 80;
                
                const minimapObj = document.createElement('div');
                minimapObj.className = 'minimap-object';
                
                if (this.energyOrbs.includes(obj)) {
                    minimapObj.classList.add('minimap-energy');
                } else if (this.techFragments.includes(obj)) {
                    minimapObj.classList.add('minimap-fragment');
                } else if (this.crystals.includes(obj)) {
                    minimapObj.classList.add('minimap-fragment');
                } else if (this.hazards.includes(obj)) {
                    if (obj.type === 'asteroid') {
                        minimapObj.classList.add('minimap-hazard');
                    } else if (obj.type === 'storm') {
                        minimapObj.classList.add('minimap-storm');
                    } else if (obj.type === 'plasma') {
                        minimapObj.classList.add('minimap-plasma');
                    }
                } else if (this.stations.includes(obj)) {
                    if (obj.used) {
                        minimapObj.classList.add('minimap-station-used');
                    } else if (obj.departing) {
                        minimapObj.classList.add('minimap-station-departing');
                    } else {
                        minimapObj.classList.add('minimap-station');
                    }
                } else if (this.enemyShips.includes(obj)) {
                    minimapObj.classList.add('minimap-enemy');
                }
                
                minimapObj.style.left = minimapX + 'px';
                minimapObj.style.top = minimapY + 'px';
                
                minimap.appendChild(minimapObj);
            });
    }
    
    checkCollisions() {
        // Check energy orb collisions
        this.energyOrbs.forEach(orb => {
            if (!orb.collected) {
                const dx = orb.x - this.player.x;
                const dy = orb.y - this.player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.player.size + orb.size) {
                    orb.collected = true;
                    this.player.energy = Math.min(this.player.maxEnergy + this.upgrades.energyCapacity * 20, this.player.energy + orb.energy);
                    this.createCollectParticles(orb.x, orb.y, '#ffff00');
                    this.playSound('collect');
                    this.addMessage('Energy collected!');
                    this.updateMissionProgress('collect_energy', 1);
                }
            }
        });
        
        // Check tech fragment collisions
        this.techFragments.forEach(fragment => {
            if (!fragment.collected) {
                const dx = fragment.x - this.player.x;
                const dy = fragment.y - this.player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.player.size + fragment.size) {
                    fragment.collected = true;
                    this.resources.techFragments++;
                    this.createCollectParticles(fragment.x, fragment.y, '#00ff00');
                    this.playSound('collect');
                    this.addMessage('Tech fragment acquired!');
                    this.updateMissionProgress('collect_fragments', 1);
                }
            }
        });
        
        // Check crystal collisions
        this.crystals.forEach(crystal => {
            if (!crystal.collected) {
                const dx = crystal.x - this.player.x;
                const dy = crystal.y - this.player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.player.size + crystal.size) {
                    crystal.collected = true;
                    this.resources.crystals++;
                    this.createCollectParticles(crystal.x, crystal.y, '#0088ff');
                    this.playSound('collect');
                    this.addMessage('Crystal harvested!');
                    this.updateMissionProgress('collect_crystals', 1);
                }
            }
        });
        
        // Check hazard collisions and warnings
        const isInSafeZone = this.isPlayerInSafeZone();
        
        this.hazards.forEach(hazard => {
            if (hazard.active) {
                const dx = hazard.x - this.player.x;
                const dy = hazard.y - this.player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Check for warning zone (only if not in safe zone)
                if (!isInSafeZone && distance < hazard.warningRadius && distance > this.player.size + hazard.size) {
                    // Player is in warning zone - drain energy for storms
                    if (hazard.type === 'storm') {
                        this.player.energy -= hazard.energyDrain * this.deltaTime;
                        if (Math.random() < 0.1) {
                            this.addMessage('Warning: Energy storm detected!');
                        }
                    }
                    // Plasma fields deal damage over time in warning zone
                    if (hazard.type === 'plasma') {
                        const plasmaDamage = 5 * this.deltaTime; // 5 damage per second
                        this.player.hull -= plasmaDamage;
                        this.createDamageParticles(this.player.x, this.player.y);
                        if (Math.random() < 0.05) {
                            this.addMessage('Warning: Plasma field damage!');
                        }
                    }
                }
                
                // Check for direct collision (only if not in safe zone)
                if (!isInSafeZone && distance < this.player.size + hazard.size) {
                    if (hazard.damage > 0) {
                        this.player.hull -= hazard.damage;
                        this.player.energy -= hazard.damage * 0.3;
                        this.createDamageParticles(this.player.x, this.player.y);
                        this.playSound('damage');
                        
                        let damageMessage = '';
                        switch (hazard.type) {
                            case 'asteroid':
                                damageMessage = 'Asteroid collision!';
                                break;
                            case 'plasma':
                                damageMessage = 'Plasma field damage!';
                                break;
                            case 'storm':
                                damageMessage = 'Storm interference!';
                                break;
                            default:
                                damageMessage = 'Hazard damage!';
                        }
                        this.addMessage(damageMessage);
                        
                        // Debug: Log collision details
                        console.log(`Hazard collision: ${hazard.type}, damage: ${hazard.damage}, distance: ${distance.toFixed(2)}, player size: ${this.player.size}, hazard size: ${hazard.size}`);
                        
                        // Push player away from hazard
                        const pushForce = hazard.type === 'asteroid' ? 3 : 2;
                        this.player.vx += (dx / distance) * pushForce;
                        this.player.vy += (dy / distance) * pushForce;
                        
                        // Track hazard encounter
                        this.updateMissionProgress('survive_hazards', 1);
                    }
                }
            }
        });
    }
    
    checkStationInteraction() {
        // Check if player has moved away from current station
        if (this.currentStation) {
            const dx = this.currentStation.x - this.player.x;
            const dy = this.currentStation.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Close upgrade panel if player moves too far away
            if (distance > 60) { // Slightly larger than interaction range for smooth experience
                this.closeUpgradePanel();
                this.currentStation = null;
            }
        }
        
        this.stations.forEach(station => {
            const dx = station.x - this.player.x;
            const dy = station.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            station.inRange = distance < 50 && !station.used;
            
            if (station.inRange && this.input.interact && !station.used) {
                this.openUpgradePanel(station);
            }
        });
    }
    
    checkGameOver() {
        // Check if player is in a safe zone (near upgrade station)
        const isInSafeZone = this.isPlayerInSafeZone();
        
        // Only trigger game over if not in safe zone
        if (!isInSafeZone && (this.player.energy <= 0 || this.player.hull <= 0)) {
            this.gameOver();
        }
    }
    
    isPlayerInSafeZone() {
        // Check if player is within safe distance of any active upgrade station
        for (let station of this.stations) {
            if (station.active && !station.departing) {
                const dx = station.x - this.player.x;
                const dy = station.y - this.player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Safe zone extends 80 units around upgrade stations
                if (distance < 80) {
                    return true;
                }
            }
        }
        return false;
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        this.isRunning = false;
        
        const gameOverScreen = document.getElementById('gameOverScreen');
        const stats = document.getElementById('gameOverStats');
        
        stats.innerHTML = `
            <div>Distance Traveled: ${Math.round(this.distance / 100)} units</div>
            <div>Tech Fragments: ${this.techFragments.filter(f => f.collected).length}</div>
            <div>Crystals: ${this.crystals.filter(c => c.collected).length}</div>
            <div>Upgrades: ${Object.values(this.upgrades).reduce((sum, val) => sum + val, 0)}</div>
        `;
        
        gameOverScreen.classList.add('show');
    }
    
    restart() {
        // Reset game state
        this.gameState = 'playing';
        this.isRunning = true;
        this.isPaused = false;
        this.distance = 0;
        
        // Reset player
        this.player.x = 0;
        this.player.y = 0;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.energy = 100;
        this.player.hull = 100;
        
        // Reset camera
        this.camera.x = 0;
        this.camera.y = 0;
        this.camera.targetX = 0;
        this.camera.targetY = 0;
        
        // Clear all objects
        this.energyOrbs = [];
        this.techFragments = [];
        this.crystals = [];
        this.hazards = [];
        this.stations = [];
        this.particles = [];
        this.enemyShips = [];
        this.projectiles = [];
        
        // Reset chunk system
        this.world.loadedChunks.clear();
        this.world.lastChunkX = 0;
        this.world.lastChunkY = 0;
        
        // Reset upgrades
        this.upgrades = {
            // Ship upgrades
            energyEfficiency: 0,
            shieldBoost: 0,
            scannerRange: 1,
            speedBoost: 0,
            energyCapacity: 0,
            hullRepair: 0,
            hullRegen: 0,
            
            // Weapon upgrades
            bulletDamage: 0,
            bulletSpeed: 0,
            bulletCount: 0,
            fireRate: 0,
            bulletPenetration: 0,
            
            // Advanced upgrades (unlocked later)
            energyShield: 0,
            autoRepair: 0,
            multiShot: 0,
            explosiveBullets: 0,
            energyWeapon: 0
        };
        
        // Generate new world
        this.generateInitialWorld();
        
        // Hide game over screen
        const gameOverScreen = document.getElementById('gameOverScreen');
        gameOverScreen.classList.remove('show');
        
        // Reset input state
        this.input.shootCooldown = 0;
        this.input.shoot = false;
        this.input.up = false;
        this.input.down = false;
        this.input.left = false;
        this.input.right = false;
        this.input.interact = false;
        this.input.rotateLeft = false;
        this.input.rotateRight = false;
        this.input.mouseThrust = false;
        this.input.mouseX = 0;
        this.input.mouseY = 0;
        
        // Clear message log
        this.ui.messageLog.innerHTML = '';
        
        // Start game loop
        this.lastTime = performance.now();
        this.gameLoop = requestAnimationFrame((time) => this.update(time));
        
        this.addMessage('Mission restarted!');
    }
    
    openUpgradePanel(station) {
        const panel = document.getElementById('upgradePanel');
        const list = document.getElementById('upgradeList');
        
        // Store reference to current station
        this.currentStation = station;
        
        // Update resources display
        this.updateUpgradeResourcesDisplay();
        
        list.innerHTML = '';
        
        // Get station-specific upgrades
        const upgradeOptions = this.getStationUpgrades(station.type);
        
        upgradeOptions.forEach(option => {
            const fragments = this.resources.techFragments;
            const crystals = this.resources.crystals;
            
            const item = document.createElement('div');
            item.className = 'upgrade-item';
            
            const canAfford = this.canAffordUpgrade(option) && option.current < option.max;
            
            item.innerHTML = `
                <div>
                    <div style="font-weight: bold;">${option.name}</div>
                    <div style="font-size: 11px; color: #888;">${option.description}</div>
                    <div style="font-size: 11px;">Level: ${option.current}/${option.max}</div>
                </div>
                <div>
                    <div style="font-size: 11px; margin-bottom: 5px;">
                        Cost: ${option.cost.techFragments} fragments, ${option.cost.crystals} crystals
                        ${!canAfford ? 
                            `<br><span style="color: #ff8800;">Need: ${Math.max(0, option.cost.techFragments - fragments)} fragments, ${Math.max(0, option.cost.crystals - crystals)} crystals</span>` : 
                            ''}
                    </div>
                    <button class="upgrade-button" ${!canAfford ? 'disabled' : ''} 
                            onclick="game.purchaseUpgrade('${option.name}', 0)">
                        ${option.current >= option.max ? 'MAX' : 'UPGRADE'}
                    </button>
                </div>
            `;
            
            list.appendChild(item);
        });
        
        panel.classList.add('show');
    }
    
    getStationUpgrades(stationType) {
        const baseUpgrades = {
            'ship': [
                {
                    name: 'Energy Efficiency',
                    description: 'Reduces energy consumption',
                    cost: { techFragments: (this.upgrades.energyEfficiency + 1) * 2, crystals: 0 },
                    current: this.upgrades.energyEfficiency,
                    max: 5,
                    upgrade: () => this.upgrades.energyEfficiency++
                },
                {
                    name: 'Speed Boost',
                    description: 'Increases maximum speed',
                    cost: { techFragments: (this.upgrades.speedBoost + 1) * 3, crystals: 0 },
                    current: this.upgrades.speedBoost,
                    max: 5,
                    upgrade: () => this.upgrades.speedBoost++
                },
                {
                    name: 'Energy Capacity',
                    description: 'Increases maximum energy',
                    cost: { techFragments: (this.upgrades.energyCapacity + 1) * 2, crystals: 0 },
                    current: this.upgrades.energyCapacity,
                    max: 5,
                    upgrade: () => this.upgrades.energyCapacity++
                }
            ],
            'weapon': [
                {
                    name: 'Bullet Damage',
                    description: 'Increases bullet damage',
                    cost: { techFragments: ((this.upgrades.bulletDamage || 0) + 1) * 2, crystals: 1 },
                    current: this.upgrades.bulletDamage || 0,
                    max: 5,
                    upgrade: () => this.upgrades.bulletDamage++
                },
                {
                    name: 'Bullet Speed',
                    description: 'Increases bullet velocity',
                    cost: { techFragments: ((this.upgrades.bulletSpeed || 0) + 1) * 2, crystals: 1 },
                    current: this.upgrades.bulletSpeed || 0,
                    max: 5,
                    upgrade: () => this.upgrades.bulletSpeed++
                },
                {
                    name: 'Fire Rate',
                    description: 'Increases shooting speed',
                    cost: { techFragments: ((this.upgrades.fireRate || 0) + 1) * 3, crystals: 1 },
                    current: this.upgrades.fireRate || 0,
                    max: 5,
                    upgrade: () => this.upgrades.fireRate++
                },
                {
                    name: 'Multi Shot',
                    description: 'Shoots multiple bullets',
                    cost: { techFragments: 5, crystals: 3 },
                    current: this.upgrades.multiShot || 0,
                    max: 1,
                    upgrade: () => this.upgrades.multiShot++
                }
            ],
            'hull': [
                {
                    name: 'Shield Boost',
                    description: 'Increases hull protection',
                    cost: { techFragments: ((this.upgrades.shieldBoost || 0) + 1) * 3, crystals: 1 },
                    current: this.upgrades.shieldBoost || 0,
                    max: 5,
                    upgrade: () => this.upgrades.shieldBoost++
                },
                {
                    name: 'Hull Repair',
                    description: 'Instantly repairs hull damage',
                    cost: { techFragments: 2, crystals: 1 },
                    current: this.upgrades.hullRepair || 0,
                    max: 3,
                    upgrade: () => {
                        this.upgrades.hullRepair++;
                        this.player.hull = Math.min(this.player.hull + 20, this.player.maxHull);
                    }
                },
                {
                    name: 'Hull Regeneration',
                    description: 'Slowly regenerates hull over time',
                    cost: { techFragments: (this.upgrades.hullRegen + 1) * 4, crystals: 2 },
                    current: this.upgrades.hullRegen,
                    max: 3,
                    upgrade: () => this.upgrades.hullRegen++
                },
                {
                    name: 'Auto Repair',
                    description: 'Automatically repairs when hull is low',
                    cost: { techFragments: 8, crystals: 4 },
                    current: this.upgrades.autoRepair,
                    max: 1,
                    upgrade: () => this.upgrades.autoRepair++
                }
            ],
            'energy': [
                {
                    name: 'Scanner Range',
                    description: 'Increases detection range',
                    cost: { techFragments: (this.upgrades.scannerRange) * 4, crystals: 1 },
                    current: this.upgrades.scannerRange,
                    max: 5,
                    upgrade: () => this.upgrades.scannerRange++
                },
                {
                    name: 'Energy Shield',
                    description: 'Absorbs damage with energy',
                    cost: { techFragments: 6, crystals: 3 },
                    current: this.upgrades.energyShield,
                    max: 1,
                    upgrade: () => this.upgrades.energyShield++
                },
                {
                    name: 'Energy Weapon',
                    description: 'Uses energy for powerful shots',
                    cost: { techFragments: 10, crystals: 5 },
                    current: this.upgrades.energyWeapon,
                    max: 1,
                    upgrade: () => this.upgrades.energyWeapon++
                }
            ]
        };
        
        return baseUpgrades[stationType] || baseUpgrades['ship'];
    }
    
    canAffordUpgrade(option) {
        return this.resources.techFragments >= option.cost.techFragments && 
               this.resources.crystals >= option.cost.crystals;
    }
    
    updateUpgradeResourcesDisplay() {
        const fragments = this.resources.techFragments;
        const crystals = this.resources.crystals;
        
        document.getElementById('upgradeFragments').textContent = fragments;
        document.getElementById('upgradeCrystals').textContent = crystals;
    }
    
    calculateCostBreakdown(cost, availableFragments, availableCrystals) {
        let remainingCost = cost;
        let needsFragments = 0;
        let needsCrystals = 0;
        
        // Use crystals first (worth 2 each)
        const crystalsToUse = Math.min(availableCrystals, Math.floor(remainingCost / 2));
        remainingCost -= crystalsToUse * 2;
        
        // Use fragments for remaining cost
        const fragmentsToUse = Math.min(availableFragments, remainingCost);
        remainingCost -= fragmentsToUse;
        
        // Calculate what's still needed
        if (remainingCost > 0) {
            // Need more crystals
            const additionalCrystals = Math.ceil(remainingCost / 2);
            needsCrystals = additionalCrystals;
        }
        
        return {
            needsFragments: needsFragments,
            needsCrystals: needsCrystals
        };
    }
    
    closeUpgradePanel() {
        const panel = document.getElementById('upgradePanel');
        panel.classList.remove('show');
    }
    
    purchaseUpgrade(upgradeName, cost) {
        // Find the upgrade option
        const stationType = this.currentStation.type;
        const upgradeOptions = this.getStationUpgrades(stationType);
        const option = upgradeOptions.find(opt => opt.name === upgradeName);
        
        if (!option) return;
        
        if (this.canAffordUpgrade(option)) {
            // Deduct resources
            this.resources.techFragments -= option.cost.techFragments;
            this.resources.crystals -= option.cost.crystals;
            
            // Apply upgrade using the upgrade function
            option.upgrade();
            
            // Apply special effects for certain upgrades
            if (upgradeName === 'Energy Capacity') {
                this.player.maxEnergy += 20;
                this.player.energy += 20;
            }
            
            this.playSound('upgrade');
            this.addMessage(`${upgradeName} upgraded!`);
            
            // Track upgrade progress
            this.updateMissionProgress('upgrade_ship', 1);
            
            // Mark station as used and initiate departure
            if (this.currentStation) {
                this.currentStation.used = true;
                this.currentStation.departing = true;
                
                // Calculate departure direction (away from player)
                const dx = this.currentStation.x - this.player.x;
                const dy = this.currentStation.y - this.player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0) {
                    this.currentStation.vx = (dx / distance) * this.currentStation.departureSpeed;
                    this.currentStation.vy = (dy / distance) * this.currentStation.departureSpeed;
                } else {
                    // Random direction if player is exactly at station
                    const angle = Math.random() * Math.PI * 2;
                    this.currentStation.vx = Math.cos(angle) * this.currentStation.departureSpeed;
                    this.currentStation.vy = Math.sin(angle) * this.currentStation.departureSpeed;
                }
                
                this.addMessage('Upgrade station departing!');
            }
            
            // Close the upgrade panel
            this.closeUpgradePanel();
        } else {
            // Show what resources are needed
            const costBreakdown = this.calculateCostBreakdown(cost, fragments, crystals);
            let neededMessage = `Need ${cost} resources total. `;
            if (costBreakdown.needsCrystals > 0) {
                neededMessage += `Need ${costBreakdown.needsCrystals} more crystals. `;
            }
            if (costBreakdown.needsFragments > 0) {
                neededMessage += `Need ${costBreakdown.needsFragments} more fragments.`;
            }
            this.addMessage(neededMessage);
        }
    }
    
    createThrusterParticles() {
        if (this.player.thrusterPower > 0) {
            const angle = this.player.angle + Math.PI; // Opposite direction
            const spread = 0.3;
            
            for (let i = 0; i < 3; i++) {
                this.particles.push({
                    x: this.player.x - Math.cos(this.player.angle) * this.player.size,
                    y: this.player.y - Math.sin(this.player.angle) * this.player.size,
                    vx: Math.cos(angle + (Math.random() - 0.5) * spread) * (Math.random() * 50 + 20),
                    vy: Math.sin(angle + (Math.random() - 0.5) * spread) * (Math.random() * 50 + 20),
                    life: Math.random() * 0.3 + 0.2,
                    maxLife: 0.5,
                    size: Math.random() * 3 + 1,
                    color: `hsl(${Math.random() * 30 + 20}, 100%, 60%)`,
                    alpha: 1
                });
            }
        }
    }
    
    createEnemyThrusterParticles(enemy) {
        if (enemy.thrusterPower > 0) {
            const angle = enemy.angle + Math.PI; // Opposite direction
            const spread = 0.3;
            
            for (let i = 0; i < 3; i++) {
                this.particles.push({
                    x: enemy.x - Math.cos(enemy.angle) * enemy.size,
                    y: enemy.y - Math.sin(enemy.angle) * enemy.size,
                    vx: Math.cos(angle + (Math.random() - 0.5) * spread) * (Math.random() * 50 + 20),
                    vy: Math.sin(angle + (Math.random() - 0.5) * spread) * (Math.random() * 50 + 20),
                    life: Math.random() * 0.3 + 0.2,
                    maxLife: 0.5,
                    size: Math.random() * 3 + 1,
                    color: '#ff4400',
                    alpha: 1
                });
            }
        }
    }
    
    createCollectParticles(x, y, color) {
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * (Math.random() * 100 + 50),
                vy: Math.sin(angle) * (Math.random() * 100 + 50),
                life: Math.random() * 0.5 + 0.3,
                maxLife: 0.8,
                size: Math.random() * 4 + 2,
                color: color,
                alpha: 1
            });
        }
    }
    
    createDamageParticles(x, y) {
        for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * (Math.random() * 150 + 100),
                vy: Math.sin(angle) * (Math.random() * 150 + 100),
                life: Math.random() * 0.4 + 0.2,
                maxLife: 0.6,
                size: Math.random() * 3 + 1,
                color: '#ff0000',
                alpha: 1
            });
        }
    }
    
    addMessage(text) {
        this.ui.messageLog.innerHTML = `<div>${text}</div>` + this.ui.messageLog.innerHTML;
        
        // Keep only last 5 messages
        const messages = this.ui.messageLog.children;
        if (messages.length > 5) {
            this.ui.messageLog.removeChild(messages[messages.length - 1]);
        }
    }
    
    playSound(soundName) {
        if (this.sounds[soundName]) {
            this.sounds[soundName]();
        }
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000011';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Save context for camera transform
        this.ctx.save();
        
        // Apply camera transform
        this.ctx.translate(
            this.canvas.width / 2 - this.camera.x,
            this.canvas.height / 2 - this.camera.y
        );
        
        // Render stars
        this.renderStars();
        
        // Render world objects
        this.renderObjects();
        
        // Render particles
        this.renderParticles();
        
        // Render player
        this.renderPlayer();
        
        // Restore context
        this.ctx.restore();
        
        // Render UI elements that don't need camera transform
        this.renderUI();
    }
    
    renderStars() {
        this.stars.forEach(star => {
            const screenX = star.x - this.camera.x;
            const screenY = star.y - this.camera.y;
            
            // Only render stars that are on screen
            if (screenX > -50 && screenX < this.canvas.width + 50 &&
                screenY > -50 && screenY < this.canvas.height + 50) {
                
                const twinkle = Math.sin(star.twinkle + performance.now() * 0.001) * 0.3 + 0.7;
                const alpha = star.brightness * twinkle;
                
                this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, star.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
    }
    
    renderObjects() {
        // Render energy orbs
        this.energyOrbs.forEach(orb => {
            if (!orb.collected) {
                const pulse = Math.sin(orb.pulse) * 0.3 + 0.7;
                const alpha = pulse * 0.8;
                
                // Glow effect
                this.ctx.shadowColor = '#ffff00';
                this.ctx.shadowBlur = 20;
                this.ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
                this.ctx.beginPath();
                this.ctx.arc(orb.x, orb.y, orb.size * pulse, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            }
        });
        
        // Render tech fragments
        this.techFragments.forEach(fragment => {
            if (!fragment.collected) {
                this.ctx.save();
                this.ctx.translate(fragment.x, fragment.y);
                this.ctx.rotate(fragment.rotation);
                this.ctx.fillStyle = '#00ff00';
                this.ctx.fillRect(-fragment.size/2, -fragment.size/2, fragment.size, fragment.size);
                this.ctx.restore();
            }
        });
        
        // Render crystals
        this.crystals.forEach(crystal => {
            if (!crystal.collected) {
                const glow = Math.sin(crystal.glow) * 0.5 + 0.5;
                
                // Glow effect
                this.ctx.shadowColor = '#0088ff';
                this.ctx.shadowBlur = 15;
                this.ctx.fillStyle = `rgba(0, 136, 255, ${glow})`;
                this.ctx.beginPath();
                this.ctx.arc(crystal.x, crystal.y, crystal.size, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            }
        });
        
        // Render hazards
        this.hazards.forEach(hazard => {
            if (hazard.active) {
                this.ctx.save();
                this.ctx.translate(hazard.x, hazard.y);
                this.ctx.rotate(hazard.rotation);
                
                // Render warning zone
                const playerDistance = Math.sqrt((hazard.x - this.player.x) ** 2 + (hazard.y - this.player.y) ** 2);
                if (playerDistance < hazard.warningRadius) {
                    this.ctx.strokeStyle = `rgba(255, 0, 0, ${0.4 + Math.sin(hazard.pulse) * 0.3})`;
                    this.ctx.lineWidth = 2;
                    this.ctx.setLineDash([5, 5]);
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, hazard.warningRadius, 0, Math.PI * 2);
                    this.ctx.stroke();
                    this.ctx.setLineDash([]);
                }
                
                if (hazard.type === 'asteroid') {
                    // Asteroid - dark, rocky appearance with red glow
                    const pulse = Math.sin(hazard.pulse) * 0.2 + 0.8;
                    this.ctx.shadowColor = '#ff0000';
                    this.ctx.shadowBlur = 20;
                    this.ctx.fillStyle = `rgba(100, 20, 20, ${pulse})`;
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, hazard.size, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // Add rocky texture with red tint
                    this.ctx.fillStyle = `rgba(150, 40, 40, ${pulse * 0.7})`;
                    this.ctx.beginPath();
                    this.ctx.arc(-hazard.size * 0.3, -hazard.size * 0.3, hazard.size * 0.4, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.shadowBlur = 0;
                    
                } else if (hazard.type === 'storm') {
                    // Storm - swirling energy field with pink/red colors
                    const pulse = Math.sin(hazard.pulse) * 0.3 + 0.7;
                    this.ctx.shadowColor = '#ff0088';
                    this.ctx.shadowBlur = 25;
                    
                    // Outer storm ring - deep red
                    this.ctx.fillStyle = `rgba(200, 0, 50, ${pulse * 0.5})`;
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, hazard.outerRadius, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // Inner storm core - bright pink
                    this.ctx.fillStyle = `rgba(255, 50, 150, ${pulse * 0.8})`;
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, hazard.innerRadius, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // Storm lightning effect - white/pink
                    this.ctx.strokeStyle = `rgba(255, 150, 200, ${pulse * 0.9})`;
                    this.ctx.lineWidth = 2;
                    for (let i = 0; i < 4; i++) {
                        const angle = (hazard.pulse + i * Math.PI / 2) * 2;
                        const startRadius = hazard.innerRadius;
                        const endRadius = hazard.outerRadius;
                        this.ctx.beginPath();
                        this.ctx.moveTo(Math.cos(angle) * startRadius, Math.sin(angle) * startRadius);
                        this.ctx.lineTo(Math.cos(angle) * endRadius, Math.sin(angle) * endRadius);
                        this.ctx.stroke();
                    }
                    this.ctx.shadowBlur = 0;
                    
                } else if (hazard.type === 'plasma') {
                    // Plasma field - fast moving energy with orange colors
                    const pulse = Math.sin(hazard.pulse * 2) * 0.4 + 0.6;
                    this.ctx.shadowColor = '#ff4400';
                    this.ctx.shadowBlur = 20;
                    
                    // Render trail - orange
                    if (hazard.trail && hazard.trail.length > 1) {
                        this.ctx.strokeStyle = `rgba(255, 100, 0, 0.6)`;
                        this.ctx.lineWidth = 3;
                        this.ctx.beginPath();
                        this.ctx.moveTo(hazard.trail[0].x - hazard.x, hazard.trail[0].y - hazard.y);
                        for (let i = 1; i < hazard.trail.length; i++) {
                            const point = hazard.trail[i];
                            this.ctx.lineTo(point.x - hazard.x, point.y - hazard.y);
                        }
                        this.ctx.stroke();
                    }
                    
                    // Plasma core - bright orange
                    this.ctx.fillStyle = `rgba(255, 150, 0, ${pulse})`;
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, hazard.size, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // Plasma energy rings - orange gradient
                    this.ctx.strokeStyle = `rgba(255, 100, 0, ${pulse * 0.7})`;
                    this.ctx.lineWidth = 2;
                    for (let i = 1; i <= 3; i++) {
                        this.ctx.beginPath();
                        this.ctx.arc(0, 0, hazard.size + i * 3, 0, Math.PI * 2);
                        this.ctx.stroke();
                    }
                    this.ctx.shadowBlur = 0;
                }
                
                this.ctx.restore();
            }
        });
        
        // Render enemy ships
        this.enemyShips.forEach(enemy => {
            if (enemy.active) {
                this.ctx.save();
                this.ctx.translate(enemy.x, enemy.y);
                this.ctx.rotate(enemy.angle);
                
                // Render enemy trail
                if (enemy.trail && enemy.trail.length > 1) {
                    this.ctx.strokeStyle = 'rgba(255, 100, 0, 0.6)';
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(enemy.trail[0].x - enemy.x, enemy.trail[0].y - enemy.y);
                    for (let i = 1; i < enemy.trail.length; i++) {
                        const point = enemy.trail[i];
                        this.ctx.lineTo(point.x - enemy.x, point.y - enemy.y);
                    }
                    this.ctx.stroke();
                }
                
                // Enemy ship body (red)
                this.ctx.fillStyle = '#ff0000';
                this.ctx.beginPath();
                this.ctx.moveTo(enemy.size, 0);
                this.ctx.lineTo(-enemy.size * 0.75, -enemy.size * 0.5);
                this.ctx.lineTo(-enemy.size * 0.25, 0);
                this.ctx.lineTo(-enemy.size * 0.75, enemy.size * 0.5);
                this.ctx.closePath();
                this.ctx.fill();
                
                // Enemy ship glow
                this.ctx.shadowColor = '#ff0000';
                this.ctx.shadowBlur = 15;
                this.ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
                this.ctx.beginPath();
                this.ctx.moveTo(enemy.size, 0);
                this.ctx.lineTo(-enemy.size * 0.75, -enemy.size * 0.5);
                this.ctx.lineTo(-enemy.size * 0.25, 0);
                this.ctx.lineTo(-enemy.size * 0.75, enemy.size * 0.5);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
                
                // Enemy ship thruster
                if (enemy.thrusterPower > 0) {
                    const thrusterSize = enemy.thrusterPower * 6;
                    this.ctx.fillStyle = `rgba(255, 68, 0, ${enemy.thrusterPower})`;
                    this.ctx.beginPath();
                    this.ctx.ellipse(-enemy.size, 0, thrusterSize, thrusterSize/2, 0, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                
                this.ctx.restore();
            }
        });
        
        // Render projectiles
        this.projectiles.forEach(projectile => {
            if (projectile.active) {
                this.ctx.save();
                this.ctx.translate(projectile.x, projectile.y);
                
                if (projectile.owner === 'player') {
                    // Player projectile (cyan)
                    this.ctx.fillStyle = '#00ffff';
                    this.ctx.shadowColor = '#00ffff';
                    this.ctx.shadowBlur = 5;
                } else {
                    // Enemy projectile (red)
                    this.ctx.fillStyle = '#ff0000';
                    this.ctx.shadowColor = '#ff0000';
                    this.ctx.shadowBlur = 5;
                }
                
                this.ctx.beginPath();
                this.ctx.arc(0, 0, projectile.size, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
                
                this.ctx.restore();
            }
        });
        
        // Render stations
        this.stations.forEach(station => {
            if (station.active) {
                const pulse = Math.sin(station.pulse) * 0.3 + 0.7;
                const time = performance.now() * 0.001;
                
                this.ctx.save();
                this.ctx.translate(station.x, station.y);
                
                if (station.departing) {
                    // Departing station - dimmed and moving
                    this.renderStationStructure(station, '#002244', '#003366', 0.3, false);
                    
                    // Departure trail - blue
                    this.ctx.strokeStyle = 'rgba(0, 136, 255, 0.4)';
                    this.ctx.lineWidth = 3;
                    this.ctx.beginPath();
                    this.ctx.moveTo(-station.vx * 20, -station.vy * 20);
                    this.ctx.lineTo(0, 0);
                    this.ctx.stroke();
                    
                } else if (station.used) {
                    // Used station - dark and inactive
                    this.renderStationStructure(station, '#001122', '#002244', 0.2, false);
                    
                    // Crossed out indicator
                    this.ctx.strokeStyle = '#666666';
                    this.ctx.lineWidth = 3;
                    this.ctx.beginPath();
                    this.ctx.moveTo(-station.size * 0.7, -station.size * 0.7);
                    this.ctx.lineTo(station.size * 0.7, station.size * 0.7);
                    this.ctx.moveTo(station.size * 0.7, -station.size * 0.7);
                    this.ctx.lineTo(-station.size * 0.7, station.size * 0.7);
                    this.ctx.stroke();
                    
                } else {
                    // Available station - detailed structure
                    this.renderStationStructure(station, '#0066cc', '#0088ff', pulse, true);
                    
                    // Interaction indicator - bright blue
                    if (station.inRange) {
                        this.ctx.strokeStyle = '#0088ff';
                        this.ctx.lineWidth = 2;
                        this.ctx.setLineDash([5, 5]);
                        this.ctx.beginPath();
                        this.ctx.arc(0, 0, station.size + 10, 0, Math.PI * 2);
                        this.ctx.stroke();
                        this.ctx.setLineDash([]);
                    }
                }
                
                this.ctx.restore();
            }
        });
    }
    
    renderStationStructure(station, baseColor, glowColor, intensity, animated) {
        const time = performance.now() * 0.001;
        const size = station.size;
        const collapseProgress = station.collapseProgress || 0;
        const extendedParts = station.extendedParts && collapseProgress < 0.5;
        
        // Main central core
        this.ctx.fillStyle = baseColor;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size * 0.3 * (1 - collapseProgress * 0.3), 0, Math.PI * 2);
        this.ctx.fill();
        
        // Outer ring structure
        this.ctx.strokeStyle = baseColor;
        this.ctx.lineWidth = 3 * (1 - collapseProgress * 0.5);
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size * 0.8 * (1 - collapseProgress * 0.2), 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Inner ring structure
        this.ctx.strokeStyle = baseColor;
        this.ctx.lineWidth = 2 * (1 - collapseProgress * 0.5);
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size * 0.5 * (1 - collapseProgress * 0.2), 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Symmetrical arms extending outward
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI) / 2;
            const armLength = size * (0.6 + (extendedParts ? 0.3 : 0)) * (1 - collapseProgress * 0.4);
            const armWidth = 4 * (1 - collapseProgress * 0.5);
            
            // Main arm
            this.ctx.strokeStyle = baseColor;
            this.ctx.lineWidth = armWidth;
            this.ctx.beginPath();
            this.ctx.moveTo(Math.cos(angle) * size * 0.3, Math.sin(angle) * size * 0.3);
            this.ctx.lineTo(Math.cos(angle) * armLength, Math.sin(angle) * armLength);
            this.ctx.stroke();
            
            // Arm tip
            this.ctx.fillStyle = baseColor;
            this.ctx.beginPath();
            this.ctx.arc(Math.cos(angle) * armLength, Math.sin(angle) * armLength, 3 * (1 - collapseProgress * 0.5), 0, Math.PI * 2);
            this.ctx.fill();
            
            // Extended parts sticking outside the circle
            if (extendedParts) {
                // Large external structures
                const extAngle1 = angle + Math.PI / 6;
                const extAngle2 = angle - Math.PI / 6;
                const extLength = size * 0.4 * (1 - collapseProgress * 0.6);
                
                this.ctx.strokeStyle = baseColor;
                this.ctx.lineWidth = 3 * (1 - collapseProgress * 0.5);
                this.ctx.beginPath();
                this.ctx.moveTo(Math.cos(angle) * size * 0.7, Math.sin(angle) * size * 0.7);
                this.ctx.lineTo(Math.cos(extAngle1) * extLength, Math.sin(extAngle1) * extLength);
                this.ctx.moveTo(Math.cos(angle) * size * 0.7, Math.sin(angle) * size * 0.7);
                this.ctx.lineTo(Math.cos(extAngle2) * extLength, Math.sin(extAngle2) * extLength);
                this.ctx.stroke();
                
                // External structure tips
                this.ctx.fillStyle = baseColor;
                this.ctx.beginPath();
                this.ctx.arc(Math.cos(extAngle1) * extLength, Math.sin(extAngle1) * extLength, 4 * (1 - collapseProgress * 0.5), 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(Math.cos(extAngle2) * extLength, Math.sin(extAngle2) * extLength, 4 * (1 - collapseProgress * 0.5), 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // Side connectors on each arm
            const sideAngle1 = angle + Math.PI / 4;
            const sideAngle2 = angle - Math.PI / 4;
            const connectorLength = size * 0.2 * (1 - collapseProgress * 0.5);
            
            this.ctx.strokeStyle = baseColor;
            this.ctx.lineWidth = 2 * (1 - collapseProgress * 0.5);
            this.ctx.beginPath();
            this.ctx.moveTo(Math.cos(angle) * size * 0.5, Math.sin(angle) * size * 0.5);
            this.ctx.lineTo(Math.cos(sideAngle1) * connectorLength, Math.sin(sideAngle1) * connectorLength);
            this.ctx.moveTo(Math.cos(angle) * size * 0.5, Math.sin(angle) * size * 0.5);
            this.ctx.lineTo(Math.cos(sideAngle2) * connectorLength, Math.sin(sideAngle2) * connectorLength);
            this.ctx.stroke();
        }
        
        // Central hub details
        this.ctx.fillStyle = baseColor;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size * 0.15 * (1 - collapseProgress * 0.3), 0, Math.PI * 2);
        this.ctx.fill();
        
        // Station type indicator
        if (animated && !station.departing) {
            const typeColors = {
                'ship': '#00ff88',
                'weapon': '#ff4400', 
                'hull': '#ffaa00',
                'energy': '#4400ff'
            };
            const typeColor = typeColors[station.type] || '#0088ff';
            
            this.ctx.fillStyle = typeColor;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, size * 0.08, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Glow effect
        if (animated) {
            this.ctx.shadowColor = glowColor;
            this.ctx.shadowBlur = 20 * intensity * (1 - collapseProgress * 0.5);
            this.ctx.fillStyle = `rgba(0, 136, 255, ${intensity * 0.4 * (1 - collapseProgress * 0.5)})`;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, size * 0.8 * (1 - collapseProgress * 0.2), 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }
        
        // Animated energy lines
        if (animated && collapseProgress < 0.7) {
            this.ctx.strokeStyle = `rgba(0, 255, 255, ${intensity * 0.6 * (1 - collapseProgress * 0.5)})`;
            this.ctx.lineWidth = 1 * (1 - collapseProgress * 0.5);
            
            for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI) / 4 + time * 0.5;
                const startRadius = size * 0.2 * (1 - collapseProgress * 0.3);
                const endRadius = size * 0.7 * (1 - collapseProgress * 0.2);
                
                this.ctx.beginPath();
                this.ctx.moveTo(Math.cos(angle) * startRadius, Math.sin(angle) * startRadius);
                this.ctx.lineTo(Math.cos(angle) * endRadius, Math.sin(angle) * endRadius);
                this.ctx.stroke();
            }
        }
        
        // Rotating inner elements
        if (animated && collapseProgress < 0.8) {
            this.ctx.save();
            this.ctx.rotate(time * 0.3 * (1 - collapseProgress * 0.5));
            
            // Small rotating dots
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3;
                const radius = size * 0.4 * (1 - collapseProgress * 0.3);
                
                this.ctx.fillStyle = `rgba(0, 255, 255, ${intensity * 0.8 * (1 - collapseProgress * 0.5)})`;
                this.ctx.beginPath();
                this.ctx.arc(Math.cos(angle) * radius, Math.sin(angle) * radius, 2 * (1 - collapseProgress * 0.5), 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            this.ctx.restore();
        }
    }
    
    renderParticles() {
        this.particles.forEach(particle => {
            this.ctx.save();
            this.ctx.globalAlpha = particle.alpha;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }
    
    renderPlayer() {
        this.ctx.save();
        this.ctx.translate(this.player.x, this.player.y);
        this.ctx.rotate(this.player.angle);
        
        // Player ship body
        this.ctx.fillStyle = '#00ffff';
        this.ctx.beginPath();
        this.ctx.moveTo(this.player.size, 0);
        this.ctx.lineTo(-this.player.size, -this.player.size/2);
        this.ctx.lineTo(-this.player.size/2, 0);
        this.ctx.lineTo(-this.player.size, this.player.size/2);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Player glow
        this.ctx.shadowColor = '#00ffff';
        this.ctx.shadowBlur = 10;
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
        
        // Thruster effect
        if (this.player.thrusterPower > 0) {
            const thrusterSize = this.player.thrusterPower * 5;
            this.ctx.fillStyle = `rgba(255, 136, 0, ${this.player.thrusterPower})`;
            this.ctx.beginPath();
            this.ctx.arc(-this.player.size - thrusterSize/2, 0, thrusterSize, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.restore();
    }
    
    renderUI() {
        // UI is handled by HTML/CSS, but we could add canvas-based UI here if needed
    }
    
    // Cleanup method for when game is closed
    cleanup() {
        this.stop();
        
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        window.removeEventListener('resize', this.resizeCanvas);
        
        // Close audio context
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
        
        console.log('🧹 Cosmic Drifter cleaned up');
    }
}

// Make the game class available globally
window.CosmicDrifterGame = CosmicDrifterGame;
