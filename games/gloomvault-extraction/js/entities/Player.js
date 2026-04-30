class Player extends Entity {
    constructor(x, y) {
        super(x, y, 30, 30, 100);
        this.speed = 200; // pixels per second
        this.color = '#8a2be2';
        this.angle = 0; // facing direction

        // Equip a default weapon
        
        this.weapon1 = null;
        this.weapon2 = null;

        // Dodge Mechanics
        this.isDodging = false;
        this.dodgeSpeed = 600;
        this.dodgeTime = 0.2; // seconds
        this.dodgeTimer = 0;
        this.dodgeCooldown = 1.0; // seconds
        this.dodgeCooldownTimer = 0;

        // Inventory & Equipment
        this.inventory = new Array(25).fill(null); // 5x5 grid
        this.equipment = {
            helm: null,
            chest: null,
            pants: null,
            boots: null,
            weapon: null,
            weapon2: null,
            trinket1: null,
            trinket2: null
        };
        
        this.abilityCooldowns = {
            trinket1: 0,
            trinket2: 0
        };

        // Base Stats (Unmodified)
        this.baseStats = {
            maxHp: 100,
            speed: 200,
            damageMultiplier: 1.0,
            attackSpeedMultiplier: 1.0,
            movementSpeedMultiplier: 1.0,
            flatDamage: 0,
            lifesteal: 0,
            cooldownReduction: 0,
            armor: 0,
            damageReduction: 0,
            thorns: 0,
            dodgeCooldownMultiplier: 1.0,
            maxHpMultiplier: 1.0,
            armorMultiplier: 1.0
        };

        // Current Stats (Modified by gear)
        this.stats = { ...this.baseStats };
        this.recalculateStats();
    }

    addToInventory(item) {
        for (let i = 0; i < this.inventory.length; i++) {
            if (this.inventory[i] === null) {
                this.inventory[i] = item;
                return true;
            }
        }
        return false;
    }

    takeDamage(amount) {
        // Use CombatConfig to calculate mitigated damage
        let finalDamage = amount;
        if (typeof CombatConfig !== 'undefined') {
            finalDamage = CombatConfig.calculateDamageTaken(amount, this.stats.armor, this.stats.damageReduction);
        }
        super.takeDamage(finalDamage);
        return finalDamage;
    }

    recalculateStats() {
        
        // Instantiate weapons based on equipment
        this.weapon1 = this.equipment.weapon ? new Weapon(this.equipment.weapon, true) : null;
        this.weapon2 = this.equipment.weapon2 ? new Weapon(this.equipment.weapon2, true) : null;
        
        // Reset to base

        this.stats = { ...this.baseStats };

        // Aggregate modifiers
        const activeMods = [];
        
        for (const slot in this.equipment) {
            const item = this.equipment[slot];
            if (item && item.modifiers) {
                activeMods.push(...item.modifiers);
            }
        }

        // Apply modifiers
        for (const mod of activeMods) {
            if (mod.type === 'percent' || mod.type === 'percent_penalty') {
                if (this.stats[mod.stat] !== undefined) {
                    // additive percentages (10% + 5% = 1.15 multiplier)
                    this.stats[mod.stat] += (mod.value / 100);
                }
            } else if (mod.type === 'flat') {
                if (this.stats[mod.stat] !== undefined) {
                    this.stats[mod.stat] += mod.value;
                }
            }
        }

        // Apply derived stats
        this.stats.maxHp = this.baseStats.maxHp * this.stats.maxHpMultiplier;
        this.maxHp = this.stats.maxHp;
        
        this.stats.armor = this.stats.armor * this.stats.armorMultiplier;

        if (this.hp > this.maxHp) this.hp = this.maxHp;

        this.speed = this.stats.speed * this.stats.movementSpeedMultiplier;
        
        
        if (this.weapon1) {
            this.weapon1.damage = Math.round(this.weapon1.baseDamage * this.stats.damageMultiplier + this.stats.flatDamage);
            this.weapon1.cooldown = this.weapon1.baseCooldown / this.stats.attackSpeedMultiplier;
        }
        if (this.weapon2) {
            this.weapon2.damage = Math.round(this.weapon2.baseDamage * this.stats.damageMultiplier + this.stats.flatDamage);
            this.weapon2.cooldown = this.weapon2.baseCooldown / this.stats.attackSpeedMultiplier;
        }

    }

    useTrinketAbility(slot, particleSystem) {
        if (this.abilityCooldowns[slot] > 0) return [];
        const trinket = this.equipment[slot];
        if (!trinket || !trinket.activeAbility) return [];

        const ability = trinket.activeAbility;
        
        // Apply cooldown reduction from stats
        const cdReduc = Math.min(0.75, this.stats.cooldownReduction); // Cap at 75%
        this.abilityCooldowns[slot] = ability.cooldown * (1 - cdReduc);
        
        const projectiles = [];

        switch (ability.type) {
            case 'heal':
                this.hp = Math.min(this.maxHp, this.hp + ability.value);
                if (particleSystem) {
                    // Green heal effect
                    particleSystem.emitDashTrail(this.x, this.y, '#00ff00');
                    particleSystem.emitImpact(this.x, this.y, '#00ff00', 15);
                }
                break;
            case 'nova':
                for (let i = 0; i < 8; i++) {
                    const angle = (Math.PI * 2 / 8) * i;
                    const spawnX = this.x + Math.cos(angle) * 15;
                    const spawnY = this.y + Math.sin(angle) * 15;
                    projectiles.push(new Projectile(spawnX, spawnY, angle, 400, ability.damage * this.stats.damageMultiplier, 1.5, true));
                }
                break;
            case 'dash':
                if (!this.isDodging) {
                    this.isDodging = true;
                    this.dodgeSpeed = ability.speed;
                    this.dodgeTimer = ability.time;
                    if (particleSystem) {
                        particleSystem.emitDashTrail(this.x, this.y, '#00ffff'); // Cyan dash
                    }
                } else {
                    // Refund CD if we were already dodging so we don't waste it
                    this.abilityCooldowns[slot] = 0; 
                }
                break;
        }
        return projectiles;
    }

    update(dt, input, camera, mapGen, particleSystem) {
        // Handle dodge input
        const currentDodgeCooldown = this.dodgeCooldown * Math.max(0.2, this.stats.dodgeCooldownMultiplier);
        
        if (input.isKeyDown('ShiftLeft') && !this.isDodging && this.dodgeCooldownTimer <= 0) {
            this.isDodging = true;
            this.dodgeTimer = this.dodgeTime;
            this.dodgeCooldownTimer = currentDodgeCooldown;
        }

        let vx = 0;
        let vy = 0;

        if (this.isDodging) {
            // Dash in facing direction
            vx = Math.cos(this.angle) * this.dodgeSpeed;
            vy = Math.sin(this.angle) * this.dodgeSpeed;

            // Emit dash particles
            if (particleSystem) {
                particleSystem.emitDashTrail(this.x, this.y, '#aa66ff');
            }

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
        
        if (this.weapon1) this.weapon1.update(dt);
        if (this.weapon2) this.weapon2.update(dt);
        
        // Update trinket cooldowns
        if (this.abilityCooldowns.trinket1 > 0) this.abilityCooldowns.trinket1 -= dt;
        if (this.abilityCooldowns.trinket2 > 0) this.abilityCooldowns.trinket2 -= dt;

        // Update facing angle based on mouse
        if (camera && input.mouse) {
            const screenX = input.mouse.x;
            const screenY = input.mouse.y;
            const worldMouse = camera.screenToWorld(screenX, screenY);
            
            this.angle = Math.atan2(worldMouse.y - this.y, worldMouse.x - this.x);
        }

        // Handle attacks
        const newProjectiles = [];
        let isAttacking = false;
        
        // Handle trinket abilities
        if (input.isKeyDown('KeyQ') && this.abilityCooldowns.trinket1 <= 0) {
            const projs = this.useTrinketAbility('trinket1', particleSystem);
            if (projs && projs.length > 0) newProjectiles.push(...projs);
        }
        
        if (input.isKeyDown('KeyE') && this.abilityCooldowns.trinket2 <= 0) {
            const projs = this.useTrinketAbility('trinket2', particleSystem);
            if (projs && projs.length > 0) newProjectiles.push(...projs);
        }

        
        if (input.mouse.down && this.weapon1) {
            const projs = this.weapon1.attack(this.x, this.y, this.angle);
            if (projs && projs.length > 0) {
                newProjectiles.push(...projs);
                isAttacking = true;
            }
        }
        
        if (input.mouse.rightDown && this.weapon2) {
            const projs = this.weapon2.attack(this.x, this.y, this.angle);
            if (projs && projs.length > 0) {
                newProjectiles.push(...projs);
                isAttacking = true;
            }
        }

        if (input.mouse.down || input.mouse.rightDown) {
            isAttacking = true;
        }

        // Update Animation State
        if (isAttacking) {
            if (this.animationState !== 'attack') {
                this.animationState = 'attack';
                this.currentFrame = 0;
            }
        } else if (Math.abs(vx) > 0 || Math.abs(vy) > 0 || this.isDodging) {
            if (this.animationState !== 'run') {
                this.animationState = 'run';
                this.currentFrame = 0;
            }
        } else {
            if (this.animationState !== 'idle') {
                this.animationState = 'idle';
                this.currentFrame = 0;
            }
        }
        
        this.updateAnimation(dt);

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
        // Try drawing sprite first
        if (window.gameAssets && window.gameAssets.player && window.gameAssets.player.complete && window.gameAssets.player.naturalWidth > 0) {
            // Assume sprite sheet is structured:
            // rows: idle (0), run (1), attack (2)
            // cols: frames
            let row = 0;
            if (this.animationState === 'run') row = 1;
            if (this.animationState === 'attack') row = 2;
            
            // Assume 64x64 sprites on the sheet
            const spriteW = 64;
            const spriteH = 64;
            const srcX = this.currentFrame * spriteW;
            const srcY = row * spriteH;

            ctx.save();
            const screenPos = renderer.camera.worldToScreen(this.x, this.y);
            ctx.translate(screenPos.x, screenPos.y);
            ctx.rotate(this.angle);
            renderer.drawSpriteDirect(ctx, window.gameAssets.player, srcX, srcY, spriteW, spriteH, -this.width, -this.height, this.width*2, this.height*2);
            ctx.restore();
            return;
        }

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