class Player extends Entity {
    constructor(x, y) {
        super(x, y, 30, 30, 100);
        this.speed = 200; // pixels per second
        this.color = '#8a2be2';
        this.angle = 0; // facing direction
        this.movementBackwards = false;

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

        // Melee lunge
        this.isLunging = false;
        this.lungeTimer = 0;
        this.lungeDuration = 0.1;
        this.lungeSpeed = 500;
        this.lungeAngle = 0;

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

        this.activeHoTs = [];
        this.passiveBuffs = [];
        this.statusEffects = [];
        this.statusSpeedMultiplier = 1;
        this.pendingTrinketAbilities = [];
        this._wasMouseDown = false;
        this._wasRightMouseDown = false;

        this.shield = 0;
        this.shieldRegenTimer = 0;

        // Base Stats (Unmodified)
        this.baseStats = {
            maxHp: 100,
            maxShield: 0,
            shieldRegen: 0,
            speed: 200,
            damageMultiplier: 1.0,
            attackSpeedMultiplier: 1.0,
            movementSpeedMultiplier: 1.0,
            flatDamage: 0,
            lifesteal: 0,
            lifestealCapBonus: 0,
            cooldownReduction: 0,
            armor: 0,
            damageReduction: 0,
            thorns: 0,
            dodgeCooldownMultiplier: 1.0,
            canDodge: 1,
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
        // God mode: no damage taken
        if (typeof DevConfig !== 'undefined' && DevConfig.godMode) {
            return { total: 0, shield: 0, hp: 0 };
        }

        // Use CombatConfig to calculate mitigated damage
        let finalDamage = amount;
        if (typeof CombatConfig !== 'undefined') {
            finalDamage = CombatConfig.calculateDamageTaken(amount, this.stats.armor, this.stats.damageReduction);
        }

        this.shieldRegenTimer = 0; // Reset regen on hit

        let damageToShield = 0;
        let damageToHp = 0;

        if (this.shield > 0) {
            if (this.shield >= finalDamage) {
                damageToShield = finalDamage;
                this.shield -= finalDamage;
            } else {
                damageToShield = this.shield;
                damageToHp = finalDamage - this.shield;
                this.shield = 0;
            }
        } else {
            damageToHp = finalDamage;
        }

        if (damageToHp > 0) {
            super.takeDamage(damageToHp);
        }
        
        // Degrade armor durability on damage taken
        if (typeof DurabilityConfig !== 'undefined' && finalDamage > 0) {
            let anyBroke = false;
            const armorSlots = ['helm', 'chest', 'pants', 'boots'];
            for (const slot of armorSlots) {
                const item = this.equipment[slot];
                if (!item || item.isStarter || !item.maxDurability || item.durability <= 0) continue;
                const baseDeg = 1 + Math.floor(finalDamage / DurabilityConfig.armor.damagePerDegPoint);
                const armorReduction = (item.baseArmor || 0) * DurabilityConfig.armor.armorReductionFactor;
                const rarityReduction = DurabilityConfig.armor.rarityDegradeReduction[item.rarity] || 0;
                const finalDeg = Math.max(1, Math.floor(baseDeg * (1 - armorReduction - rarityReduction)));
                item.durability = Math.max(0, item.durability - finalDeg);
                if (item.durability <= 0) anyBroke = true;
            }
            if (anyBroke) this.recalculateStats();
        }

        return { total: finalDamage, shield: damageToShield, hp: damageToHp };
    }

    recalculateStats() {
        
        // Instantiate weapons based on equipment
        const wep1 = this.equipment.weapon;
        const wep2 = this.equipment.weapon2;
        this.weapon1 = (wep1 && !(wep1.maxDurability !== undefined && wep1.durability <= 0)) ? new Weapon(wep1, true) : null;
        this.weapon2 = (wep2 && !(wep2.maxDurability !== undefined && wep2.durability <= 0)) ? new Weapon(wep2, true) : null;
        
        // Reset to base

        this.stats = { ...this.baseStats };

        // Aggregate modifiers
        const activeMods = [];
        
        for (const slot in this.equipment) {
            const item = this.equipment[slot];
            if (!item || !item.modifiers) continue;
            // Skip broken items (durability 0) - they provide no stats
            if (item.maxDurability !== undefined && item.durability <= 0) continue;
            activeMods.push(...item.modifiers);
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
        this.stats.maxHp = this.stats.maxHp * (this.stats.maxHpMultiplier + this.getHealingWellMaxHpBonus());
        this.maxHp = this.stats.maxHp;
        
        this.maxShield = this.stats.maxShield;
        this.shieldRegen = this.stats.shieldRegen;
        
        this.stats.armor = this.stats.armor * this.stats.armorMultiplier;

        if (this.hp > this.maxHp) this.hp = this.maxHp;
        if (this.maxShield === 0) this.shield = 0;
        if (this.shield > this.maxShield) this.shield = this.maxShield;

        this.speed = this.stats.speed * this.stats.movementSpeedMultiplier;
        
        let weaponSpeedBonus = 0;
        
        if (this.weapon1) {
            this.weapon1.damage = Math.round(this.weapon1.baseDamage * this.stats.damageMultiplier + this.stats.flatDamage);
            this.weapon1.cooldown = this.weapon1.baseCooldown / this.stats.attackSpeedMultiplier;
            weaponSpeedBonus += this.weapon1.movementSpeedBonus || 0;
        }
        if (this.weapon2) {
            this.weapon2.damage = Math.round(this.weapon2.baseDamage * this.stats.damageMultiplier + this.stats.flatDamage);
            this.weapon2.cooldown = this.weapon2.baseCooldown / this.stats.attackSpeedMultiplier;
            weaponSpeedBonus += this.weapon2.movementSpeedBonus || 0;
        }
        
        this.speed += weaponSpeedBonus;

    }

    getHealingWellBuffs() {
        if (!this.passiveBuffs) this.passiveBuffs = [];
        return this.passiveBuffs.filter(buff => buff && buff.type === 'healingWell' && buff.durationLeft > 0);
    }

    getHealingWellStackCount() {
        return this.getHealingWellBuffs().length;
    }

    getHealingWellMaxHpBonus() {
        return this.getHealingWellBuffs()
            .reduce((total, buff) => total + (buff.maxHpMultiplierBonus || 0.10), 0);
    }

    getHealingWellRemainingTime() {
        const buffs = this.getHealingWellBuffs();
        if (buffs.length === 0) return 0;
        return Math.max(...buffs.map(buff => buff.durationLeft || 0));
    }

    applyHealingWellBuff() {
        if (!this.passiveBuffs) this.passiveBuffs = [];
        this.passiveBuffs.push({
            type: 'healingWell',
            durationLeft: 90,
            maxHpMultiplierBonus: 0.10,
            hotPercent: 0.02,
            tickInterval: 5,
            tickTimer: 0
        });
        this.recalculateStats();
        this.hp = this.maxHp;
    }

    updatePassiveBuffs(dt, particleSystem) {
        if (!this.passiveBuffs || this.passiveBuffs.length === 0) return;

        let expired = false;
        let totalHealing = 0;
        for (let i = this.passiveBuffs.length - 1; i >= 0; i--) {
            const buff = this.passiveBuffs[i];
            if (!buff) {
                this.passiveBuffs.splice(i, 1);
                expired = true;
                continue;
            }

            buff.durationLeft -= dt;
            if (buff.type === 'healingWell') {
                buff.tickTimer = (buff.tickTimer || 0) + dt;
                const tickInterval = buff.tickInterval || 5;
                while (buff.tickTimer >= tickInterval && buff.durationLeft > 0) {
                    buff.tickTimer -= tickInterval;
                    totalHealing += this.maxHp * (buff.hotPercent || 0.02);
                }
            }

            if (buff.durationLeft <= 0) {
                this.passiveBuffs.splice(i, 1);
                expired = true;
            }
        }

        if (totalHealing > 0) {
            this.hp = Math.min(this.maxHp, this.hp + totalHealing);
            if (particleSystem) {
                particleSystem.emitImpact(this.x, this.y, '#2ecc71', 8);
            }
        }

        if (expired) {
            this.recalculateStats();
        }
    }

    triggerLunge(angle, multiplier = 1.0) {
        this.isLunging = true;
        this.lungeTimer = this.lungeDuration * multiplier;
        this.lungeAngle = angle;
    }

    degradeWeaponSlot(slotName) {
        const item = this.equipment[slotName];
        if (item && item.maxDurability && item.durability > 0 && typeof DurabilityConfig !== 'undefined') {
            item.durability = Math.max(0, Math.round((item.durability - DurabilityConfig.weapon.degradePerAttack) * 1000) / 1000);
            if (item.durability <= 0) this.recalculateStats();
        }
    }

    handleWeaponInput(weapon, slotName, isDown, wasDown, angle, particleSystem) {
        if (!weapon) return { projectiles: [], attacking: false };

        if (weapon.isArcane) {
            let attacking = false;
            if (isDown && weapon.cooldownTimer <= 0) {
                attacking = weapon.startCharge();
                if (attacking && particleSystem) {
                    particleSystem.emitDashTrail(this.x, this.y, weapon.projectileColor);
                }
            }

            const shouldRelease = weapon.isCharging && ((!isDown && wasDown) || weapon.isFullyCharged());
            if (shouldRelease) {
                const projs = weapon.releaseChargedAttack(this.x, this.y, angle);
                if (projs && projs.length > 0) {
                    if (weapon.hasLunge) {
                        this.triggerLunge(angle, weapon.lungeMultiplier || 1.0);
                    }
                    this.degradeWeaponSlot(slotName);
                    return { projectiles: projs, attacking: true };
                }
            }

            return { projectiles: [], attacking };
        }

        if (!isDown) return { projectiles: [], attacking: false };

        const projs = weapon.attack(this.x, this.y, angle);
        if (projs && projs.length > 0) {
            if (weapon.hasLunge) {
                this.triggerLunge(angle, weapon.lungeMultiplier || 1.0);
            }
            this.degradeWeaponSlot(slotName);
            return { projectiles: projs, attacking: true };
        }

        return { projectiles: [], attacking: false };
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
                const projectileCount = ability.projectiles || 8;
                for (let i = 0; i < projectileCount; i++) {
                    const angle = (Math.PI * 2 / projectileCount) * i;
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
            case 'hot':
                this.activeHoTs.push({
                    amountPerSecond: ability.value / ability.duration,
                    durationLeft: ability.duration
                });
                if (particleSystem) {
                    particleSystem.emitImpact(this.x, this.y, '#00ff00', 10);
                }
                break;
            case 'scout':
            case 'phase_tether':
            case 'element_bomb':
            case 'lightning_strike':
            case 'target_dummy':
            case 'soul_siphon':
                this.pendingTrinketAbilities.push({
                    slot: slot,
                    ability: JSON.parse(JSON.stringify(ability)),
                    x: this.x,
                    y: this.y,
                    angle: this.angle
                });
                break;
        }
        return projectiles;
    }

    update(dt, input, camera, mapGen, particleSystem) {
        // Handle dodge input
        const currentDodgeCooldown = this.dodgeCooldown * Math.max(0.2, this.stats.dodgeCooldownMultiplier);
        
        if (input.isKeyDown('ShiftLeft') && !this.isDodging && this.dodgeCooldownTimer <= 0 && this.stats.canDodge > 0) {
            this.isDodging = true;
            this.dodgeTimer = this.dodgeTime;
            this.dodgeCooldownTimer = currentDodgeCooldown;
        }

        let vx = 0;
        let vy = 0;

        // Melee lunge movement
        if (this.isLunging) {
            this.lungeTimer -= dt;
            if (this.lungeTimer <= 0) {
                this.isLunging = false;
            } else {
                const lungeVx = Math.cos(this.lungeAngle) * this.lungeSpeed;
                const lungeVy = Math.sin(this.lungeAngle) * this.lungeSpeed;
                const oldX = this.x;
                this.x += lungeVx * dt;
                if (this.checkCollision(mapGen)) this.x = oldX;
                const oldY = this.y;
                this.y += lungeVy * dt;
                if (this.checkCollision(mapGen)) this.y = oldY;
            }
        } else if (this.isDodging) {
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
            const currentMoveSpeed = this.speed * (this.statusSpeedMultiplier || 1);
            if (input.isKeyDown('KeyW')) vy -= currentMoveSpeed;
            if (input.isKeyDown('KeyS')) vy += currentMoveSpeed;
            if (input.isKeyDown('KeyA')) vx -= currentMoveSpeed;
            if (input.isKeyDown('KeyD')) vx += currentMoveSpeed;

            // Normalize diagonal movement
            if (vx !== 0 && vy !== 0) {
                const length = Math.sqrt(vx * vx + vy * vy);
                vx = (vx / length) * currentMoveSpeed;
                vy = (vy / length) * currentMoveSpeed;
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

        // Process active HoTs
        for (let i = this.activeHoTs.length - 1; i >= 0; i--) {
            const hot = this.activeHoTs[i];
            const healAmount = hot.amountPerSecond * dt;
            this.hp = Math.min(this.maxHp, this.hp + healAmount);
            hot.durationLeft -= dt;
            if (hot.durationLeft <= 0) {
                this.activeHoTs.splice(i, 1);
            }
        }

        this.updatePassiveBuffs(dt, particleSystem);

        // Process Shield Regen
        if (this.maxShield > 0 && this.shield < this.maxShield) {
            this.shieldRegenTimer += dt;
            if (this.shieldRegenTimer >= 5.0) { // 5 seconds without damage
                this.shield += this.shieldRegen * dt;
                if (this.shield > this.maxShield) {
                    this.shield = this.maxShield;
                }
            }
        }

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

        const weapon1Result = this.handleWeaponInput(this.weapon1, 'weapon', input.mouse.down, this._wasMouseDown, this.angle, particleSystem);
        if (weapon1Result.projectiles.length > 0) newProjectiles.push(...weapon1Result.projectiles);
        isAttacking = isAttacking || weapon1Result.attacking;
        
        const weapon2Result = this.handleWeaponInput(this.weapon2, 'weapon2', input.mouse.rightDown, this._wasRightMouseDown, this.angle, particleSystem);
        if (weapon2Result.projectiles.length > 0) newProjectiles.push(...weapon2Result.projectiles);
        isAttacking = isAttacking || weapon2Result.attacking;

        if (input.mouse.down || input.mouse.rightDown) {
            isAttacking = true;
        }

        this._wasMouseDown = input.mouse.down;
        this._wasRightMouseDown = input.mouse.rightDown;

        this.updateMovementAnimationDirection(vx, vy);

        // Update Animation State
        if (isAttacking) {
            this.setAnimationState('attack');
        } else if (Math.abs(vx) > 0 || Math.abs(vy) > 0 || this.isDodging) {
            this.setAnimationState('run');
        } else {
            this.setAnimationState('idle');
        }
        
        this.updateAnimation(dt);

        return newProjectiles; // Return any new projectiles to the GameEngine
    }

    setAnimationState(state) {
        if (this.animationState === state) return;
        this.animationState = state;
        this.currentFrame = 0;
        this.frameTimer = 0;
    }

    updateMovementAnimationDirection(vx, vy) {
        const speedSq = vx * vx + vy * vy;
        if (speedSq <= 0.001) {
            this.movementBackwards = false;
            return;
        }

        const speed = Math.sqrt(speedSq);
        const facingX = Math.cos(this.angle);
        const facingY = Math.sin(this.angle);
        const dot = (vx / speed) * facingX + (vy / speed) * facingY;
        this.movementBackwards = dot < -0.35;
    }

    checkCollision(mapGen) {
        if (!mapGen) return false;
        if (typeof DevConfig !== 'undefined' && DevConfig.noClip) return false;

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

    renderChargeGlow(ctx, renderer) {
        const chargingWeapon = [this.weapon1, this.weapon2].find(weapon => weapon && weapon.isCharging);
        if (!chargingWeapon) return;

        const screenPos = renderer.camera.worldToScreen(this.x, this.y);
        const chargeRatio = Math.max(0, Math.min(1, chargingWeapon.chargeTimer / chargingWeapon.maxChargeDuration));
        ctx.save();
        ctx.strokeStyle = chargingWeapon.projectileColor || '#c99cff';
        ctx.globalAlpha = 0.35 + chargeRatio * 0.45;
        ctx.lineWidth = 2 + chargeRatio * 3;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, this.width * (0.75 + chargeRatio * 0.8), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    getSpriteKey() {
        return 'sprites.player';
    }

    getAnimationFrameCount() {
        const assets = typeof window !== 'undefined' && window.gloomvaultAssets;
        if (!assets || !assets.getAnimationFrameCount) return this.frameCount;
        return assets.getAnimationFrameCount(this.getSpriteKey(), this.animationState) || this.frameCount;
    }

    getAnimationFrameDuration() {
        const assets = typeof window !== 'undefined' && window.gloomvaultAssets;
        if (!assets || !assets.getAnimationFrameDuration) return this.frameDuration;
        return assets.getAnimationFrameDuration(this.getSpriteKey()) || this.frameDuration;
    }

    getSpriteFrameIndex() {
        if (this.animationState !== 'run') return 0;

        const frameCount = Math.max(1, this.getAnimationFrameCount());
        const frame = Math.max(0, Math.floor(this.currentFrame || 0)) % frameCount;
        return this.movementBackwards ? (frameCount - 1 - frame) : frame;
    }

    render(ctx, renderer) {
        const spriteKey = this.getSpriteKey();
        const spriteFrame = this.getSpriteFrameIndex();
        if (renderer && renderer.drawAnimationFrameDirect && renderer.assetManager && renderer.assetManager.getSpriteFrame(spriteKey, this.animationState, spriteFrame)) {
            this.renderStatusGlow(ctx, renderer);
            ctx.save();
            const screenPos = renderer.camera.worldToScreen(this.x, this.y);
            ctx.translate(screenPos.x, screenPos.y);
            ctx.rotate(this.angle - Math.PI / 2);
            renderer.drawAnimationFrameDirect(ctx, spriteKey, this.animationState, spriteFrame, -this.width, -this.height, this.width*2, this.height*2);
            ctx.restore();
            this.renderChargeGlow(ctx, renderer);
            return;
        }

        // Draw the player (placeholder circle with direction indicator)
        const screenPos = renderer.camera.worldToScreen(this.x, this.y);

        this.renderStatusGlow(ctx, renderer);
        
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

        this.renderChargeGlow(ctx, renderer);
    }
}
