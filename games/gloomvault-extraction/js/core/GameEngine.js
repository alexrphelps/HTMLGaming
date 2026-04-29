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
        this.mapCols = 100;
        this.mapRows = 100;
        this.mapGen = new MapGen(this.mapCols, this.mapRows, this.tileSize);

        // Entities
        this.player = null; // initialized in start()

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
            this.player.update(dt, this.input, this.camera, this.mapGen);
            
            // Update camera to follow player
            this.camera.follow(this.player);
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

        // 3. Draw UI Overlay
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