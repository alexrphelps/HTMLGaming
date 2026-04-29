class Player extends Entity {
    constructor(x, y) {
        super(x, y, 30, 30, 100);
        this.speed = 200; // pixels per second
        this.color = '#8a2be2';
        this.angle = 0; // facing direction

        // Equip a default weapon
        this.weapon = new Weapon();

        // Dodge Mechanics
        this.isDodging = false;
        this.dodgeSpeed = 600;
        this.dodgeTime = 0.2; // seconds
        this.dodgeTimer = 0;
        this.dodgeCooldown = 1.0; // seconds
        this.dodgeCooldownTimer = 0;
    }

    update(dt, input, camera, mapGen) {
        // Handle dodge input
        if (input.isKeyDown('ShiftLeft') && !this.isDodging && this.dodgeCooldownTimer <= 0) {
            this.isDodging = true;
            this.dodgeTimer = this.dodgeTime;
            this.dodgeCooldownTimer = this.dodgeCooldown;
        }

        let vx = 0;
        let vy = 0;

        if (this.isDodging) {
            // Dash in facing direction
            vx = Math.cos(this.angle) * this.dodgeSpeed;
            vy = Math.sin(this.angle) * this.dodgeSpeed;

            this.dodgeTimer -= dt;
            if (this.dodgeTimer <= 0) {
                this.isDodging = false;
            }
        } else {
            // Normal movement
            if (input.isKeyDown('KeyW')) vy -= this.speed;
            if (input.isKeyDown('KeyS')) vy += this.speed;
            if (input.isKeyDown('KeyA')) vx -= this.speed;
            if (input.isKeyDown('KeyD')) vx += this.speed;

            // Normalize diagonal movement
            if (vx !== 0 && vy !== 0) {
                const length = Math.sqrt(vx * vx + vy * vy);
                vx = (vx / length) * this.speed;
                vy = (vy / length) * this.speed;
            }
        }

        // Apply movement with separated axis collision for sliding
        const oldX = this.x;
        this.x += vx * dt;
        if (this.checkCollision(mapGen)) {
            this.x = oldX;
        }

        const oldY = this.y;
        this.y += vy * dt;
        if (this.checkCollision(mapGen)) {
            this.y = oldY;
        }

        // Update dodge cooldown
        if (this.dodgeCooldownTimer > 0) {
            this.dodgeCooldownTimer -= dt;
        }

        // Update weapon cooldowns
        if (this.weapon) {
            this.weapon.update(dt);
        }

        // Update facing angle based on mouse
        if (camera && input.mouse) {
            const screenX = input.mouse.x;
            const screenY = input.mouse.y;
            const worldMouse = camera.screenToWorld(screenX, screenY);
            
            this.angle = Math.atan2(worldMouse.y - this.y, worldMouse.x - this.x);
        }

        // Handle primary attack input
        const newProjectiles = [];
        if (input.mouse.down && this.weapon) {
            const proj = this.weapon.primaryAttack(this.x, this.y, this.angle);
            if (proj) {
                newProjectiles.push(proj);
            }
        }
        return newProjectiles; // Return any new projectiles to the GameEngine
    }

    checkCollision(mapGen) {
        if (!mapGen) return false;

        const checkRadius = this.width / 2;
        const leftTile = Math.floor((this.x - checkRadius) / mapGen.tileSize);
        const rightTile = Math.floor((this.x + checkRadius) / mapGen.tileSize);
        const topTile = Math.floor((this.y - checkRadius) / mapGen.tileSize);
        const bottomTile = Math.floor((this.y + checkRadius) / mapGen.tileSize);

        // Map bounds check
        if (this.x - checkRadius < 0 || this.x + checkRadius > mapGen.cols * mapGen.tileSize ||
            this.y - checkRadius < 0 || this.y + checkRadius > mapGen.rows * mapGen.tileSize) {
            return true;
        }

        // Tile collision check
        for (let y = topTile; y <= bottomTile; y++) {
            for (let x = leftTile; x <= rightTile; x++) {
                if (mapGen.getTile(x, y) === 0) { // 0 is wall
                    return true;
                }
            }
        }

        return false;
    }

    render(ctx, renderer) {
        // Draw the player (placeholder circle with direction indicator)
        const screenPos = renderer.camera.worldToScreen(this.x, this.y);
        
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, this.width / 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw facing direction
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(screenPos.x, screenPos.y);
        ctx.lineTo(
            screenPos.x + Math.cos(this.angle) * this.width,
            screenPos.y + Math.sin(this.angle) * this.height
        );
        ctx.stroke();
    }
}