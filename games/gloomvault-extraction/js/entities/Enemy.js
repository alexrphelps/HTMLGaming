class Enemy extends Entity {
    constructor(x, y, type, levelMultiplier = 1.0) {
        // Base stats based on type
        let width = 30, height = 30, hp = 50, speed = 100, color = '#ff0000';
        
        if (type === 'ranged') {
            hp = 30; speed = 80; color = '#ff8800';
        } else if (type === 'brute') {
            hp = 150; speed = 60; width = 40; height = 40; color = '#880000';
        }

        // Apply level multiplier to health
        hp = Math.floor(hp * levelMultiplier);

        super(x, y, width, height, hp);

        this.type = type;
        this.baseSpeed = speed;
        this.speed = speed;
        this.color = color;
        this.state = 'wander'; // start wandering
        this.path = [];
        this.pathTimer = 0;
        this.wanderTimer = 0;
        this.angle = 0;

        // Weapons
        this.weapon = null;
        if (this.type === 'ranged') {
            this.weapon = new Weapon({weaponType: 'pistol'}, false);
            this.weapon.baseCooldown = 1.5;
            this.weapon.cooldown = 1.5;
            this.weapon.baseDamage = Math.floor(15 * levelMultiplier);
            this.weapon.damage = this.weapon.baseDamage;
            this.weapon.projectileSpeed = 300;
        } else if (this.type === 'grunt') {
            this.weapon = new Weapon({weaponType: 'melee_stab'}, false);
            this.weapon.baseCooldown = 1.0;
            this.weapon.cooldown = 1.0;
            this.weapon.baseDamage = Math.floor(20 * levelMultiplier);
            this.weapon.damage = this.weapon.baseDamage;
        } else if (this.type === 'brute') {
            this.weapon = new Weapon({weaponType: 'melee_cleave'}, false);
            this.weapon.baseCooldown = 2.0;
            this.weapon.cooldown = 2.0;
            this.weapon.baseDamage = Math.floor(40 * levelMultiplier);
            this.weapon.damage = this.weapon.baseDamage;
        }

        // Brute specific
        this.attackTimer = 0;
        this.dashTarget = null;
        this.dashSpeed = 400;

        // Elite Modifiers
        this.eliteModifier = 'none';
        const eliteRoll = Math.random();
        if (eliteRoll > 0.8) {
            if (Math.random() > 0.5) {
                this.eliteModifier = 'fast';
                this.speed *= 1.5;
                this.baseSpeed *= 1.5;
                this.color = '#ffff00'; // Yellow for fast
            } else {
                this.eliteModifier = 'vampiric';
                this.maxHp *= 1.2;
                this.hp = this.maxHp;
                this.color = '#ff00ff'; // Magenta for vampiric
            }
        }
    }

    hasLineOfSight(player, mapGen) {
        if (!mapGen) return false;
        
        let x0 = this.x;
        let y0 = this.y;
        let x1 = player.x;
        let y1 = player.y;

        let dx = Math.abs(x1 - x0);
        let dy = Math.abs(y1 - y0);
        let x = x0;
        let y = y0;
        let n = 1 + dx + dy;
        let x_inc = (x1 > x0) ? 1 : -1;
        let y_inc = (y1 > y0) ? 1 : -1;
        let error = dx - dy;
        dx *= 2;
        dy *= 2;

        for (; n > 0; --n) {
            let tileX = Math.floor(x / mapGen.tileSize);
            let tileY = Math.floor(y / mapGen.tileSize);
            
            if (mapGen.getTile(tileX, tileY) === 0) {
                return false; // hit wall
            }

            if (error > 0) {
                x += x_inc;
                error -= dy;
            } else {
                y += y_inc;
                error += dx;
            }
        }
        return true;
    }

    update(dt, player, mapGen, pathfinder) {
        if (this.hp <= 0) return [];
        
        let newProjectiles = [];

        // Common cooldowns/timers
        if (this.weapon) this.weapon.update(dt);
        this.pathTimer -= dt;
        this.wanderTimer -= dt;

        const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
        const canSeePlayer = this.hasLineOfSight(player, mapGen);

        // Aggro logic
        if (canSeePlayer && distToPlayer < 600) {
            if (this.state === 'wander' || this.state === 'idle') {
                this.state = 'chase';
            }
        } else if (this.state !== 'wander' && this.state !== 'attack' && distToPlayer > 800) {
            // Lose aggro if player is too far
            this.state = 'wander';
            this.path = [];
        }

        // Wandering State
        if (this.state === 'wander') {
            if (this.path.length === 0) {
                if (this.wanderTimer <= 0) {
                    // Pick a random spot nearby
                    let angle = Math.random() * Math.PI * 2;
                    let dist = Math.random() * 150 + 50;
                    let targetX = this.x + Math.cos(angle) * dist;
                    let targetY = this.y + Math.sin(angle) * dist;
                    
                    // Simple check if target is floor
                    let tX = Math.floor(targetX / mapGen.tileSize);
                    let tY = Math.floor(targetY / mapGen.tileSize);
                    if (mapGen.getTile(tX, tY) === 1) {
                        this.path = pathfinder.findPath(this.x, this.y, targetX, targetY, mapGen);
                    }
                    this.wanderTimer = Math.random() * 2 + 1; // Wait 1-3 seconds if no path or arrived
                }
            } else {
                this.followPath(dt, mapGen, this.baseSpeed * 0.5); // Walk slower while wandering
            }
        }

        // Pathfinding updates every 0.5 seconds for chasing
        if (this.pathTimer <= 0 && this.state === 'chase') {
            this.pathTimer = 0.5;
            // Only path if within aggro range
            if (distToPlayer < 800) {
                this.path = pathfinder.findPath(this.x, this.y, player.x, player.y, mapGen);
            }
        }

        // --- GRUNT LOGIC ---
        if (this.type === 'grunt') {
            if (this.state !== 'wander') {
                if (this.hp < this.maxHp * 0.2) {
                    this.state = 'flee';
                } else if (distToPlayer < 600) {
                    this.state = 'chase';
                }
            }

            if (this.state === 'flee') {
                this.angle = Math.atan2(this.y - player.y, this.x - player.x);
                this.moveInDirection(this.angle, dt, mapGen);
            } else if (this.state === 'chase') {
                if (distToPlayer > 40 && this.path.length > 0) {
                    this.followPath(dt, mapGen);
                } else if (distToPlayer <= 40) {
                    this.angle = Math.atan2(player.y - this.y, player.x - this.x);
                    if (this.weapon && this.weapon.cooldownTimer <= 0) {
                        const projs = this.weapon.attack(this.x, this.y, this.angle);
                        if (projs && projs.length > 0) newProjectiles.push(...projs);
                    }
                }
            }
        }

        // --- RANGED LOGIC ---
        if (this.type === 'ranged') {
            if (this.state !== 'wander') {
                if (distToPlayer < 200) {
                    // Move away
                    this.state = 'flee';
                    this.angle = Math.atan2(this.y - player.y, this.x - player.x);
                    this.moveInDirection(this.angle, dt, mapGen);
                } else if (distToPlayer > 300 && distToPlayer < 600) {
                    // Move closer
                    this.state = 'chase';
                    if (this.path.length > 0) this.followPath(dt, mapGen);
                } else {
                    this.state = 'idle'; // Hold position and shoot
                    this.angle = Math.atan2(player.y - this.y, player.x - this.x);
                }

                // Always try to shoot if in range and has LoS
                if (distToPlayer < 400 && this.weapon && canSeePlayer) {
                    this.angle = Math.atan2(player.y - this.y, player.x - this.x);
                    const projs = this.weapon.attack(this.x, this.y, this.angle);
                    if (projs && projs.length > 0) newProjectiles.push(...projs);
                }
            }
        }

        // --- BRUTE LOGIC ---
        if (this.type === 'brute') {
            if (this.state === 'idle' || this.state === 'chase') {
                if (distToPlayer < 150 && canSeePlayer) {
                    // Telegraph attack
                    this.state = 'attack';
                    this.attackTimer = 1.0; // 1 second windup
                    this.angle = Math.atan2(player.y - this.y, player.x - this.x);
                } else if (distToPlayer < 600 && this.path.length > 0) {
                    this.state = 'chase';
                    this.followPath(dt, mapGen);
                }
            } else if (this.state === 'attack') {
                this.attackTimer -= dt;
                // Track player slightly during windup
                if (this.attackTimer > 0.5) {
                    this.angle = Math.atan2(player.y - this.y, player.x - this.x);
                } else if (this.attackTimer <= 0) {
                    // Dash
                    this.moveInDirection(this.angle, dt, mapGen, this.dashSpeed);
                    
                    // Attack periodically during dash
                    if (this.weapon && this.weapon.cooldownTimer <= 0) {
                        const projs = this.weapon.attack(this.x, this.y, this.angle);
                        if (projs && projs.length > 0) newProjectiles.push(...projs);
                    }

                    // Reset after dash
                    if (this.attackTimer <= -0.5) { // 0.5 second dash
                        this.state = 'chase';
                        this.pathTimer = 0; // immediate path recalc
                        this.attackTimer = 0; // reset
                    }
                }
            }
        }

        // Update Animation State
        if (this.state === 'attack') {
            this.animationState = 'attack';
        } else if (this.state === 'chase' || this.state === 'flee' || (this.state === 'wander' && this.path.length > 0)) {
            this.animationState = 'run';
        } else {
            this.animationState = 'idle';
        }
        this.updateAnimation(dt);

        return newProjectiles;
    }

    followPath(dt, mapGen, overrideSpeed = null) {
        const target = this.path[0];
        const dist = Math.hypot(target.x - this.x, target.y - this.y);

        if (dist < 5) {
            this.path.shift();
            if (this.path.length === 0) return;
        }

        this.angle = Math.atan2(this.path[0].y - this.y, this.path[0].x - this.x);
        this.moveInDirection(this.angle, dt, mapGen, overrideSpeed);
    }

    moveInDirection(angle, dt, mapGen, overrideSpeed = null) {
        const currentSpeed = overrideSpeed || this.speed;
        const vx = Math.cos(angle) * currentSpeed;
        const vy = Math.sin(angle) * currentSpeed;

        const oldX = this.x;
        this.x += vx * dt;
        if (this.checkCollision(mapGen)) this.x = oldX;

        const oldY = this.y;
        this.y += vy * dt;
        if (this.checkCollision(mapGen)) this.y = oldY;
    }

    checkCollision(mapGen) {
        if (!mapGen) return false;

        const checkRadius = this.width / 2;
        const leftTile = Math.floor((this.x - checkRadius) / mapGen.tileSize);
        const rightTile = Math.floor((this.x + checkRadius) / mapGen.tileSize);
        const topTile = Math.floor((this.y - checkRadius) / mapGen.tileSize);
        const bottomTile = Math.floor((this.y + checkRadius) / mapGen.tileSize);

        if (this.x - checkRadius < 0 || this.x + checkRadius > mapGen.cols * mapGen.tileSize ||
            this.y - checkRadius < 0 || this.y + checkRadius > mapGen.rows * mapGen.tileSize) {
            return true;
        }

        for (let y = topTile; y <= bottomTile; y++) {
            for (let x = leftTile; x <= rightTile; x++) {
                if (mapGen.getTile(x, y) === 0) { 
                    return true;
                }
            }
        }
        return false;
    }

    render(ctx, renderer) {
        if (window.gameAssets && window.gameAssets.enemy && window.gameAssets.enemy.complete && window.gameAssets.enemy.naturalWidth > 0) {
            let row = 0;
            if (this.animationState === 'run') row = 1;
            if (this.animationState === 'attack') row = 2;
            
            const spriteW = 64;
            const spriteH = 64;
            const srcX = this.currentFrame * spriteW;
            const srcY = row * spriteH;

            ctx.save();
            const screenPos = renderer.camera.worldToScreen(this.x, this.y);
            ctx.translate(screenPos.x, screenPos.y);
            ctx.rotate(this.angle);
            renderer.drawSpriteDirect(ctx, window.gameAssets.enemy, srcX, srcY, spriteW, spriteH, -this.width, -this.height, this.width*2, this.height*2);
            ctx.restore();
            return;
        }

        const screenPos = renderer.camera.worldToScreen(this.x, this.y);
        
        ctx.fillStyle = this.color;

        // Flashing effect for brute attack telegraph
        if (this.state === 'attack' && this.type === 'brute') {
            if (Math.floor(this.attackTimer * 10) % 2 === 0) {
                ctx.fillStyle = '#ffffff';
            }
        }

        ctx.beginPath();
        
        if (this.type === 'grunt') {
            ctx.rect(screenPos.x - this.width/2, screenPos.y - this.height/2, this.width, this.height);
        } else if (this.type === 'ranged') {
            // Triangle
            ctx.moveTo(screenPos.x + Math.cos(this.angle) * this.width/2, screenPos.y + Math.sin(this.angle) * this.height/2);
            ctx.lineTo(screenPos.x + Math.cos(this.angle + 2.6) * this.width/2, screenPos.y + Math.sin(this.angle + 2.6) * this.height/2);
            ctx.lineTo(screenPos.x + Math.cos(this.angle - 2.6) * this.width/2, screenPos.y + Math.sin(this.angle - 2.6) * this.height/2);
        } else if (this.type === 'brute') {
            // Hexagon roughly
            for (let i = 0; i < 6; i++) {
                ctx.lineTo(screenPos.x + this.width/2 * Math.cos(this.angle + i * Math.PI / 3), 
                           screenPos.y + this.height/2 * Math.sin(this.angle + i * Math.PI / 3));
            }
        }
        
        ctx.fill();

        // Draw facing line
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(screenPos.x, screenPos.y);
        ctx.lineTo(screenPos.x + Math.cos(this.angle) * this.width/2, screenPos.y + Math.sin(this.angle) * this.height/2);
        ctx.stroke();
    }
}
