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

        // Entities
        this.player = null; // initialized in start()
        this.enemies = [];
        this.projectiles = [];
        this.combatFeedback = new CombatFeedback();

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

        this.projectiles = []; // Reset projectiles
        this.enemies = []; // Reset enemies
        this.combatFeedback = new CombatFeedback(); // Reset combat feedback

        // Spawn some test enemies
        this.spawnEnemy('grunt', 3, startPos);
        this.spawnEnemy('ranged', 1, startPos);
        this.spawnEnemy('brute', 1, startPos);

        this.state = 'PLAYING';
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.loop(time));
    }

    spawnEnemy(type, count, startPos) {
        let spawned = 0;
        while (spawned < count) {
            // Find a random walkable tile within a reasonable distance
            const rx = Math.floor(Math.random() * this.mapCols);
            const ry = Math.floor(Math.random() * this.mapRows);
            
            if (this.mapGen.getTile(rx, ry) === 1) {
                const worldX = rx * this.tileSize + this.tileSize / 2;
                const worldY = ry * this.tileSize + this.tileSize / 2;
                const dist = Math.hypot(worldX - startPos.x, worldY - startPos.y);
                
                if (dist > 300 && dist < 1200) {
                    this.enemies.push(new Enemy(worldX, worldY, type));
                    spawned++;
                }
            }
        }
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
            const newProjectiles = this.player.update(dt, this.input, this.camera, this.mapGen);
            if (newProjectiles && newProjectiles.length > 0) {
                this.projectiles.push(...newProjectiles);
            }
            
            // Update camera to follow player
            this.camera.follow(this.player);
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
                        this.combatFeedback.addText(`-${proj.damage}`, e.x, e.y, '#ffffff', 14, 0.8);
                        hit = true;
                        break;
                    }
                }
            } else {
                // Check collision with player
                if (Math.hypot(this.player.x - proj.x, this.player.y - proj.y) < (this.player.width/2 + proj.width/2)) {
                    this.player.takeDamage(proj.damage);
                    this.combatFeedback.addText(`-${proj.damage}`, this.player.x, this.player.y, '#ff0000', 16, 1.0);
                    hit = true;
                }
            }

            if (hit || proj.markedForDeletion) {
                if (!hit && proj.timer < proj.lifetime) {
                    this.combatFeedback.addText('Block', proj.x, proj.y, '#aaaaaa', 12, 0.5);
                }
                this.projectiles.splice(i, 1);
            }
        }

        // Update Combat Feedback
        this.combatFeedback.update(dt);
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

        // 3. Draw Enemies
        for (let e of this.enemies) {
            e.render(this.ctx, this.renderer);
        }

        // 4. Draw Projectiles
        for (let p of this.projectiles) {
            p.render(this.ctx, this.renderer);
        }

        // 5. Draw Combat Feedback
        this.combatFeedback.render(this.ctx, this.renderer);

        // 6. Draw UI Overlay
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
}