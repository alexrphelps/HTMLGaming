
    function ensureStarterEquipment(eq) {
        if (!eq.weapon) {
            eq.weapon = { id: 'starter_wep1', name: 'Rusty Glock', type: 'weapon', weaponType: 'pistol', rarity: 'Common', color: '#a0a0a0', gearScore: 5, modifiers: [], upgradeLevel: 0, isStarter: true };
        }
        if (!eq.weapon2) {
            eq.weapon2 = { id: 'starter_wep2', name: 'Sawed-off Shotgun', type: 'weapon', weaponType: 'shotgun', rarity: 'Common', color: '#a0a0a0', gearScore: 5, modifiers: [], upgradeLevel: 0, isStarter: true };
        }
        const minorHeal = { type: 'heal', value: 25, cooldown: 15, name: 'Minor Heal', text: 'Use to heal 25 HP (15s CD)' };
        if (!eq.trinket1) {
            eq.trinket1 = { id: 'starter_tr1', name: 'Health Potion', type: 'trinket', rarity: 'Common', color: '#a0a0a0', gearScore: 5, modifiers: [], upgradeLevel: 0, isStarter: true, activeAbility: minorHeal };
        }
        if (!eq.trinket2) {
            eq.trinket2 = { id: 'starter_tr2', name: 'Health Potion', type: 'trinket', rarity: 'Common', color: '#a0a0a0', gearScore: 5, modifiers: [], upgradeLevel: 0, isStarter: true, activeAbility: minorHeal };
        }
    }
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
        this.lootChests = [];
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
            
            let savedEq = JSON.parse(localStorage.getItem('gloomvault_equipment'));
            if (!savedEq) {
                savedEq = { helm: null, chest: null, pants: null, boots: null, weapon: null, weapon2: null, trinket1: null, trinket2: null };
            }
            ensureStarterEquipment(savedEq);
            this.player.equipment = savedEq;
            this.player.recalculateStats();

        } catch(e) {
            console.error('Failed to load equipment', e);
        }

        this.projectiles = []; // Reset projectiles
        this.enemies = []; // Reset enemies
        this.droppedItems = []; // Reset dropped items
        this.lootChests = []; // Reset loot chests
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
            const validPortalPos = this.mapGen.getValidFloorPosNear(lastRoom.center.x, lastRoom.center.y);
            this.portal = new ExtractionPortal(validPortalPos.x, validPortalPos.y);
        } else {
            this.portal = null;
        }

        // Spawn Loot Chest (low chance, 5%)
        if (Math.random() < 0.05) {
            const validRooms = rooms.slice(1); // Exclude starting room
            if (validRooms.length > 0) {
                const targetRoom = validRooms[Math.floor(Math.random() * validRooms.length)];
                const chestPos = this.mapGen.getValidFloorPosNear(targetRoom.center.x, targetRoom.center.y);
                if (chestPos) {
                    this.lootChests.push(new LootChest(chestPos.x, chestPos.y));
                }
            }
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

            // Update Minimap Fog of War
            if (typeof MinimapConfig !== 'undefined') {
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
                for (const p of newEnemyProjectiles) {
                    p.owner = enemy;
                }
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
            proj.update(dt, this.mapGen, this.particleSystem);

            let hit = false;

            if (proj.isPlayerOwned) {
                // Check collision with enemies
                for (let e of this.enemies) {
                    if (Math.hypot(e.x - proj.x, e.y - proj.y) < (e.width/2 + proj.width/2)) {
                        let actualDamage = Math.max(0, Math.min(e.hp, proj.damage));
                        e.takeDamage(proj.damage);
                        this.camera.shake(3, 0.1); // Small shake for enemy hits
                        this.combatFeedback.addText(`-${proj.damage}`, e.x, e.y, '#ffffff', 14, 0.8);
                        this.particleSystem.emitImpact(e.x, e.y, '#ffffff');

                        let lsCap = (typeof CombatConfig !== 'undefined' ? CombatConfig.caps.lifesteal : 0.35) + (this.player.stats.lifestealCapBonus || 0);
                        let effectiveLifesteal = Math.min(this.player.stats.lifesteal || 0, lsCap);
                        if (effectiveLifesteal > 0) {
                            let healAmount = actualDamage * effectiveLifesteal;
                            if (healAmount > 0 && this.player.hp < this.player.maxHp) {
                                this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmount);
                                if (healAmount >= 1) {
                                    this.combatFeedback.addText(`+${Math.round(healAmount)}`, this.player.x, this.player.y - 20, '#00ff00', 14, 0.8);
                                }
                            }
                        }

                        hit = true;
                        break;
                    }
                }
            } else {
                // Check collision with player
                if (Math.hypot(this.player.x - proj.x, this.player.y - proj.y) < (this.player.width/2 + proj.width/2)) {
                    let actualDamage = this.player.takeDamage(proj.damage);
                    this.camera.shake(8, 0.2); // Bigger shake for player taking damage
                    this.combatFeedback.addText(`-${Math.round(actualDamage)}`, this.player.x, this.player.y, '#ff0000', 16, 1.0);
                    this.particleSystem.emitImpact(this.player.x, this.player.y, '#ff0000');
                    
                    // Thorns logic
                    if (this.player.stats.thorns > 0 && proj.owner) {
                        proj.owner.takeDamage(this.player.stats.thorns);
                        this.combatFeedback.addText(`-${Math.round(this.player.stats.thorns)}`, proj.owner.x, proj.owner.y, '#ff00ff', 12, 0.8);
                    }
                    
                    hit = true;
                }
            }

            if (hit || proj.markedForDeletion) {
                if (!hit && proj.timer < proj.lifetime) {
                    // Removed 'Block' text per request
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

        const interactionHint = document.getElementById('interaction-hint');
        if (nearPortal) {
            interactionHint.textContent = 'Press [F] to Extract';
            interactionHint.classList.remove('hidden');

            if (this.input.isKeyDown('KeyF')) {
                this.input.keys['KeyF'] = false;
                this.extract();
            }
        } else if (closestChest) {
            interactionHint.textContent = 'Press [F] to Open Chest';
            interactionHint.classList.remove('hidden');

            if (this.input.isKeyDown('KeyF')) {
                this.input.keys['KeyF'] = false;
                closestChest.interact(this.player, this);
            }
        } else if (closestItem) {
            interactionHint.textContent = 'Press [F] to Pick Up';
            interactionHint.classList.remove('hidden');

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
            interactionHint.classList.add('hidden');
        }

        // Update Combat Feedback
        this.combatFeedback.update(dt);

        // Update UI
        if (this.player) {
            const hpBarFill = document.getElementById('player-health-bar-fill');
            const hpBarText = document.getElementById('player-health-bar-text');
            if (hpBarFill && hpBarText) {
                const hpPercent = Math.max(0, (this.player.hp / this.player.maxHp) * 100);
                hpBarFill.style.width = `${hpPercent}%`;
                hpBarText.textContent = `${Math.ceil(this.player.hp)} / ${Math.ceil(this.player.maxHp)}`;
                
                // Color fading logic
                if (hpPercent < 10) {
                    hpBarFill.style.backgroundColor = '#e74c3c'; // Red
                } else if (hpPercent < 35) {
                    hpBarFill.style.backgroundColor = '#e67e22'; // Orange
                } else {
                    hpBarFill.style.backgroundColor = '#2ecc71'; // Green
                }
            }

            this.updateActionBarUI();
        }
    }

    updateActionBarUI() {
        if (!this.player) return;

        // Weapon Primary
        const w1Slot = document.getElementById('slot-weapon1');
        if (w1Slot && this.player.weapon1) {
            const icon = w1Slot.querySelector('.action-icon');
            const cdOverlay = w1Slot.querySelector('.cooldown-overlay');
            
            const wepItem = this.player.equipment.weapon;
            if (wepItem) {
                icon.style.backgroundColor = wepItem.color;
                icon.textContent = wepItem.name.split(' ')[0].substring(0, 3);
            } else {
                icon.style.backgroundColor = '#555';
                icon.textContent = 'ATK';
            }

            const cdPercent = (this.player.weapon1.cooldownTimer / this.player.weapon1.cooldown) * 100;
            cdOverlay.style.height = `${Math.max(0, Math.min(100, cdPercent))}%`;
        }

        // Weapon Secondary
        const w2Slot = document.getElementById('slot-weapon2');
        if (w2Slot && this.player.weapon2) {
            const icon = w2Slot.querySelector('.action-icon');
            const cdOverlay = w2Slot.querySelector('.cooldown-overlay');
            
            const wepItem = this.player.equipment.weapon2;
            if (wepItem) {
                icon.style.backgroundColor = wepItem.color;
                icon.textContent = 'SEC';
            } else {
                icon.style.backgroundColor = '#555';
                icon.textContent = 'SEC';
            }

            const cdPercent = (this.player.weapon2.cooldownTimer / this.player.weapon2.cooldown) * 100;
            cdOverlay.style.height = `${Math.max(0, Math.min(100, cdPercent))}%`;
        }

        // Trinkets
        const cdr = Math.min(0.75, this.player.stats.cooldownReduction || 0);
        
        ['trinket1', 'trinket2'].forEach(slotName => {
            const slot = document.getElementById(`slot-${slotName}`);
            if (slot) {
                const icon = slot.querySelector('.action-icon');
                const cdOverlay = slot.querySelector('.cooldown-overlay');
                const item = this.player.equipment[slotName];

                if (item && item.activeAbility) {
                    icon.style.backgroundColor = item.color;
                    icon.textContent = item.name.split(' ')[0].substring(0, 3);
                    
                    const maxCd = item.activeAbility.cooldown * (1 - cdr);
                    const currentCd = this.player.abilityCooldowns[slotName];
                    const cdPercent = maxCd > 0 ? (currentCd / maxCd) * 100 : 0;
                    
                    cdOverlay.style.height = `${Math.max(0, Math.min(100, cdPercent))}%`;
                } else {
                    icon.style.backgroundColor = 'transparent';
                    icon.textContent = '';
                    cdOverlay.style.height = '0%';
                }
            }
        });
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

        // Draw Loot Chests
        for (let chest of this.lootChests) {
            chest.render(this.ctx, this.renderer);
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
        this.ctx.fillText(`FPS: ${Math.round(1 / dt)}`, 10, 20);
        this.ctx.fillText(`Player: (${Math.floor(this.player.x)}, ${Math.floor(this.player.y)})`, 10, 40);

        // 8. Draw Minimap
        if (typeof MinimapConfig !== 'undefined') {
            this.renderer.renderMinimap(this.player, this.portal, this.mapGen, MinimapConfig);
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