class LootChest extends Entity {
    constructor(x, y, locked = false, options = {}) {
        super(x, y, 40, 30, 100);
        this.interactionRadius = 60;
        this.opened = false;
        this.locked = locked;
        this.color = '#FFD700'; // Gold
        this.pulse = 0;
        this.spriteVariants = 2;
        this.variant = LootChest.normalizeVariant(options.variant, this.spriteVariants, x, y, locked);
    }

    update(dt) {
        if (!this.opened) {
            this.pulse += dt * 2;
        }
    }

    interact(player, gameEngine) {
        if (this.opened) return;
        if (this.locked) {
            if (gameEngine.combatFeedback) {
                gameEngine.combatFeedback.addText('Defeat the Boss', this.x, this.y - 20, '#66d9ff', 14, 1.0);
            }
            return;
        }

        this.opened = true;
        this.color = '#8B4513'; // Empty/Brown

        LootChest.dropChestLoot(this.x, this.y, gameEngine, 'Chest Opened!');
    }

    unlock() {
        this.locked = false;
        this.color = '#FFD700';
    }

    getSpriteKey() {
        const state = this.opened ? 'opened' : 'closed';
        return `sprites.chest.${this.variant}.${state}`;
    }

    static normalizeVariant(variant, maxVariants, x, y, locked = false) {
        const parsed = Number.parseInt(variant, 10);
        if (Number.isFinite(parsed) && parsed >= 1 && parsed <= maxVariants) {
            return parsed;
        }

        const seed = `${Math.round(x)}:${Math.round(y)}:${locked ? 'locked' : 'free'}`;
        return (LootChest.hashString(seed) % maxVariants) + 1;
    }

    static hashString(value) {
        let hash = 2166136261;
        const text = String(value || '');
        for (let i = 0; i < text.length; i++) {
            hash ^= text.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    }

    static dropChestLoot(x, y, gameEngine, feedbackText = 'Loot Dropped!') {
        const numItems = Math.floor(Math.random() * 4) + 2; // 2 to 5 items
        let hasHighRarity = false;

        for (let i = 0; i < numItems; i++) {
            let item;
            
            let effectiveFloorLevel = (gameEngine.currentFloor - 1) + (gameEngine.gearDifficultyFloor || 1);
            const guaranteedRarities = LootChest.getGuaranteedRarities(effectiveFloorLevel);
            if (!hasHighRarity && i === numItems - 1) {
                item = LootChest.generateHighRarityItem(gameEngine.lootGen, effectiveFloorLevel);
            } else {
                item = gameEngine.lootGen.generateItem(effectiveFloorLevel);
                if (guaranteedRarities.includes(item.rarity)) {
                    hasHighRarity = true;
                }
            }

            // Scatter items around the chest
            let dropX, dropY;
            let attempts = 0;
            let validLocation = false;

            while (!validLocation && attempts < 10) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 30 + Math.random() * 40;
                dropX = x + Math.cos(angle) * dist;
                dropY = y + Math.sin(angle) * dist;

                const tileX = Math.floor(dropX / gameEngine.mapGen.tileSize);
                const tileY = Math.floor(dropY / gameEngine.mapGen.tileSize);
                
                if (tileX >= 0 && tileX < gameEngine.mapGen.cols && 
                    tileY >= 0 && tileY < gameEngine.mapGen.rows && 
                    gameEngine.mapGen.getTile(tileX, tileY) === 1) {
                    validLocation = true;
                }
                attempts++;
            }

            if (!validLocation) {
                dropX = x;
                dropY = y;
            }

            gameEngine.droppedItems.push(new DroppedItem(dropX, dropY, item));
        }

        if (gameEngine.particleSystem) {
            gameEngine.particleSystem.emitImpact(x, y, '#FFD700', 30);
        }
        if (gameEngine.combatFeedback) {
            gameEngine.combatFeedback.addText(feedbackText, x, y - 20, '#FFD700', 16, 1.5);
        }
    }

    static getGuaranteedRarities(floor) {
        const minimumRarity = LootChest.getGuaranteedMinimumRarity(null, floor);
        return minimumRarity === 'Epic' ? ['Epic', 'Legendary'] : ['Uncommon', 'Epic'];
    }

    static getGuaranteedMinimumRarity(lootGen, floor) {
        if (lootGen && lootGen.getChestGuaranteedMinimumRarity) {
            return lootGen.getChestGuaranteedMinimumRarity(floor);
        }
        return floor >= 5 ? 'Epic' : 'Uncommon';
    }

    static generateHighRarityItem(lootGen, floor) {
        const minimumRarity = LootChest.getGuaranteedMinimumRarity(lootGen, floor);
        if (lootGen && lootGen.generateGuaranteedRarityItem) {
            return lootGen.generateGuaranteedRarityItem(floor, minimumRarity, 'Random');
        }

        let item;
        let attempts = 0;
        const guaranteedRarities = LootChest.getGuaranteedRarities(floor);
        do {
            item = lootGen.generateItem(floor);
            attempts++;
        } while (!guaranteedRarities.includes(item.rarity) && attempts < 100);

        if (guaranteedRarities.includes(item.rarity)) return item;
        return lootGen.generateItemWithRarityAndType(floor, minimumRarity, 'Random');
    }

    render(ctx, renderer) {
        if (!renderer || !renderer.camera) return;
        const screenPos = renderer.camera.worldToScreen(this.x, this.y);
        const spriteWidth = this.width * 1.3;
        const spriteHeight = this.width * 1.3;
        const drewSprite = Boolean(
            renderer.drawAsset &&
            renderer.drawAsset(this.getSpriteKey(), this.x, this.y, spriteWidth, spriteHeight)
        );

        if (!drewSprite) {
            ctx.fillStyle = this.locked ? '#2b5d73' : this.color;
            ctx.fillRect(screenPos.x - this.width/2, screenPos.y - this.height/2, this.width, this.height);

            ctx.strokeStyle = this.locked ? '#66d9ff' : '#000';
            ctx.lineWidth = 2;
            ctx.strokeRect(screenPos.x - this.width/2, screenPos.y - this.height/2, this.width, this.height);

            if (!this.opened) {
                ctx.fillStyle = this.locked ? '#07151d' : '#333';
                ctx.fillRect(screenPos.x - 4, screenPos.y - 2, 8, 8);
            } else {
                ctx.fillStyle = '#3e1f08';
                ctx.fillRect(screenPos.x - this.width/2 + 2, screenPos.y - this.height/2 + 2, this.width - 4, this.height - 4);
            }
        }

        if (!this.opened) {
            const pulseColor = this.locked ? '102, 217, 255' : '255, 215, 0';
            ctx.strokeStyle = `rgba(${pulseColor}, ${0.5 + Math.sin(this.pulse) * 0.3})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, this.interactionRadius, 0, Math.PI * 2);
            ctx.stroke();
        }

        if (this.locked) {
            ctx.save();
            ctx.globalAlpha = 0.28;
            ctx.fillStyle = '#66d9ff';
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, Math.max(this.width, this.height) * 0.82, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            ctx.strokeStyle = `rgba(102, 217, 255, ${0.7 + Math.sin(this.pulse * 1.2) * 0.15})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, Math.max(this.width, this.height) * 0.48, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#d8f6ff';
            ctx.font = 'bold 20px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('LOCK', screenPos.x, screenPos.y + this.height * 0.9);
        }
    }
}
