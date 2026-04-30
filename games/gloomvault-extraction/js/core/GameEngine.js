class GameEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d', { alpha: false }); // optimize for opaque background
        
        // Systems
        this.input = new Input();
        this.camera = new Camera(this.canvas.width, this.canvas.height);
        this.renderer = new Renderer(this.canvas, this.ctx);
        this.renderer.setCamera(this.camera);

        // Map Gen parameters
        this.tileSize = 64;
        this.currentMapConfig = MapConfigs.default;
        this.mapCols = this.currentMapConfig.cols;
        this.mapRows = this.currentMapConfig.rows;
        this.mapGen = new MapGen(this.currentMapConfig, this.tileSize);
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
        this.combatFeedback = new CombatFeedback();
        this.particleSystem = new ParticleSystem();
        this.lootGen = new LootGen();

        // Game State
        this.lastTime = 0;
        this.isRunning = false;
        this.state = 'MENU'; // 'MENU', 'PLAYING', 'STASH'

        // Handle window resize
        window.addEventListener('resize', () => this.resizeCanvas());
        this.resizeCanvas();
    }

    resizeCanvas() {
        const parent = this.canvas.parentElement;
        this.canvas.width = parent.clientWidth;
        this.canvas.height = parent.clientHeight;
        this.camera.updateDimensions(this.canvas.width, this.canvas.height);
    }

    start() {
        console.log('🎮 Starting Game Engine Loop');
        
        // Ensure canvas is properly sized now that it's visible
        this.resizeCanvas();
        
        this.input.attach(this.canvas);
        
        // Generate new level
        this.mapGen.generate();
        this.camera.setBounds(this.mapCols * this.tileSize, this.mapRows * this.tileSize);

        // Spawn player at start of level
        const startPos = this.mapGen.getStartPos();
        this.player = new Player(startPos.x, startPos.y);

        // Load equipment
        try {
            const savedEq = JSON.parse(localStorage.getItem('gloomvault_equipment'));
            if (savedEq) {
                this.player.equipment = savedEq;
                this.player.recalculateStats();
            }
        } catch(e) {
            console.error('Failed to load equipment', e);
        }

        this.projectiles = []; // Reset projectiles
        this.enemies = []; // Reset enemies
        this.droppedItems = []; // Reset dropped items
        this.combatFeedback = new CombatFeedback(); // Reset combat feedback
        this.particleSystem = new ParticleSystem(); // Reset particles

        // Pre-populate entire map with enemies
        this.spawnManager.populateMap(
            this.mapGen, 
            this.enemies, 
            startPos, 
            this.currentFloor, 
            this.playerGearScore
        );

        // Spawn Portal
        const rooms = this.mapGen.rooms;
        const lastRoom = rooms[rooms.length - 1];
        if (lastRoom) {
            const portalX = lastRoom.center.x * this.tileSize + this.tileSize / 2;
            const portalY = lastRoom.center.y * this.tileSize + this.tileSize / 2;
            this.portal = new ExtractionPortal(portalX, portalY);
        } else {
            this.portal = null;
        }

        this.state = 'PLAYING';
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.loop(time));
    }

    stop() {
        console.log('⏸️ Stopping Game Engine Loop');
        this.isRunning = false;
        this.state = 'MENU';
    }

    loop(currentTime) {
        if (!this.isRunning) return;

        const deltaTime = (currentTime - this.lastTime) / 1000; // in seconds
        // Cap deltaTime to prevent physics blowups if tab is inactive
        const dt = Math.min(deltaTime, 0.1); 
        this.lastTime = currentTime;

        this.update(dt);
        this.render(dt);

        requestAnimationFrame((time) => this.loop(time));
    }

    update(dt) {
        if (this.state !== 'PLAYING') return;

        // Update player
        if (this.player) {
            const newProjectiles = this.player.update(dt, this.input, this.camera, this.mapGen, this.particleSystem);
            if (newProjectiles && newProjectiles.length > 0) {
                this.projectiles.push(...newProjectiles);
            }
            
            // Update camera to follow player
            this.camera.follow(this.player, dt);

            // Check Death
            if (this.player.hp <= 0) {
                this.die();
                return;
            }
        }

        this.particleSystem.update(dt);

        // Update portal
        let nearPortal = false;
        if (this.portal) {
            this.portal.update(dt);
            if (this.player) {
                const dist = Math.hypot(this.player.x - this.portal.x, this.player.y - this.portal.y);
                if (dist <= this.portal.interactionRadius) {
                    nearPortal = true;
                }
            }
        }

        // Update enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            let enemy = this.enemies[i];
            const newEnemyProjectiles = enemy.update(dt, this.player, this.mapGen, this.pathfinder);
            if (newEnemyProjectiles && newEnemyProjectiles.length > 0) {
                this.projectiles.push(...newEnemyProjectiles);
            }

            // Check if enemy died
            if (enemy.hp <= 0) {
                this.combatFeedback.addText('Dead', enemy.x, enemy.y, '#888888', 14, 2.0);
                
                // Roll for loot drop (20% chance)
                if (Math.random() < 0.2) {
                    const itemData = this.lootGen.generateItem(this.currentFloor);
                    this.droppedItems.push(new DroppedItem(enemy.x, enemy.y, itemData));
                }

                this.enemies.splice(i, 1);
            }
        }

        // Update Projectiles and Handle Collisions
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let proj = this.projectiles[i];
            proj.update(dt, this.mapGen);

            let hit = false;

            if (proj.isPlayerOwned) {
                // Check collision with enemies
                for (let e of this.enemies) {
                    if (Math.hypot(e.x - proj.x, e.y - proj.y) < (e.width/2 + proj.width/2)) {
                        e.takeDamage(proj.damage);
                        this.camera.shake(3, 0.1); // Small shake for enemy hits
                        this.combatFeedback.addText(`-${proj.damage}`, e.x, e.y, '#ffffff', 14, 0.8);
                        this.particleSystem.emitImpact(e.x, e.y, '#ffffff');
                        hit = true;
                        break;
                    }
                }
            } else {
                // Check collision with player
                if (Math.hypot(this.player.x - proj.x, this.player.y - proj.y) < (this.player.width/2 + proj.width/2)) {
                    this.player.takeDamage(proj.damage);
                    this.camera.shake(8, 0.2); // Bigger shake for player taking damage
                    this.combatFeedback.addText(`-${proj.damage}`, this.player.x, this.player.y, '#ff0000', 16, 1.0);
                    this.particleSystem.emitImpact(this.player.x, this.player.y, '#ff0000');
                    hit = true;
                }
            }

            if (hit || proj.markedForDeletion) {
                if (!hit && proj.timer < proj.lifetime) {
                    this.combatFeedback.addText('Block', proj.x, proj.y, '#aaaaaa', 12, 0.5);
                    this.particleSystem.emitImpact(proj.x, proj.y, '#aaaaaa', 5);
                }
                this.projectiles.splice(i, 1);
            }
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

        const interactionHint = document.getElementById('interaction-hint');
        if (nearPortal) {
            interactionHint.textContent = 'Press [F] to Extract';
            interactionHint.classList.remove('hidden');

            if (this.input.isKeyDown('KeyF')) {
                this.input.keys['KeyF'] = false;
            }
        } else if (closestItem) {
            interactionHint.textContent = 'Press [F] to Pick Up';
            interactionHint.classList.remove('hidden');

            if (this.input.isKeyDown('KeyF')) {
                // Attempt to add to inventory
                if (this.player.addToInventory(closestItem.itemData)) {
                    this.combatFeedback.addText('Picked up', closestItem.x, closestItem.y, closestItem.itemData.color, 14, 1.0);
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
            interactionHint.classList.add('hidden');
        }

        // Update Combat Feedback
        this.combatFeedback.update(dt);

        // Update Health Bar UI
        if (this.player) {
            const hpBar = document.querySelector('.health-bar');
            if (hpBar) {
                hpBar.textContent = `HP: ${Math.ceil(this.player.hp)}/${this.player.maxHp}`;
            }
        }
    }

    render(dt) {
        if (this.state !== 'PLAYING') return;

        this.renderer.clear();

        // 1. Draw Map Tiles within view frustum
        const startCol = Math.floor(this.camera.x / this.tileSize);
        const endCol = startCol + Math.floor(this.camera.width / this.tileSize) + 2;
        const startRow = Math.floor(this.camera.y / this.tileSize);
        const endRow = startRow + Math.floor(this.camera.height / this.tileSize) + 2;

        for (let y = startRow; y < endRow; y++) {
            for (let x = startCol; x < endCol; x++) {
                const tile = this.mapGen.getTile(x, y);
                const worldX = x * this.tileSize;
                const worldY = y * this.tileSize;

                let color = '#000'; // Void
                if (tile === 1) color = '#333'; // Floor
                else if (tile === 0) color = '#1a1a1a'; // Wall

                // Draw floor/wall squares
                if (tile === 1) {
                     this.renderer.drawRect(worldX, worldY, this.tileSize - 1, this.tileSize - 1, color);
                } else if (tile === 0 && this.isWallVisible(x,y)) {
                     this.renderer.drawRect(worldX, worldY, this.tileSize - 1, this.tileSize - 1, '#111');
                }
            }
        }

        // 2. Draw Player
        if (this.player) {
            this.player.render(this.ctx, this.renderer);
        }

        // Draw Portal
        if (this.portal) {
            this.portal.render(this.ctx, this.camera);
        }

        // 3. Draw Enemies
        for (let e of this.enemies) {
            e.render(this.ctx, this.renderer);
        }

        // 4. Draw Projectiles
        for (let p of this.projectiles) {
            p.render(this.ctx, this.renderer);
        }

        // 5. Draw Dropped Items
        for (let i of this.droppedItems) {
            i.render(this.ctx, this.renderer);
        }

        // 6. Draw Combat Feedback
        this.particleSystem.render(this.ctx, this.renderer);
        this.combatFeedback.render(this.ctx, this.renderer);

        // 7. Draw UI Overlay
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '16px monospace';
        this.ctx.fillText(`FPS: ${Math.round(1 / (performance.now() - this.lastTime) * 1000)}`, 10, 20);
        this.ctx.fillText(`Player: (${Math.floor(this.player.x)}, ${Math.floor(this.player.y)})`, 10, 40);
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
        if (this.player && this.player.equipment) {
            localStorage.setItem('gloomvault_equipment', JSON.stringify(this.player.equipment));
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
        localStorage.removeItem('gloomvault_equipment');
        // Keep stash untouched

        // Transition to game over
        if (window.gloomvaultApp) {
            window.gloomvaultApp.showScreen('game-over-screen');
        }
    }
}