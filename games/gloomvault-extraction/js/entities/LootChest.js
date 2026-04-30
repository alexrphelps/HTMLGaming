class LootChest extends Entity {
    constructor(x, y) {
        super(x, y, 40, 30, 100);
        this.interactionRadius = 60;
        this.opened = false;
        this.color = '#FFD700'; // Gold
        this.pulse = 0;
    }

    update(dt) {
        if (!this.opened) {
            this.pulse += dt * 2;
        }
    }

    interact(player, gameEngine) {
        if (this.opened) return;
        this.opened = true;
        this.color = '#8B4513'; // Empty/Brown

        const numItems = Math.floor(Math.random() * 4) + 2; // 2 to 5 items
        let hasHighRarity = false;

        for (let i = 0; i < numItems; i++) {
            let item;
            
            let effectiveFloorLevel = (gameEngine.currentFloor - 1) + (gameEngine.gearDifficultyFloor || 1);
            // Ensure at least 1 Epic or Legendary
            if (!hasHighRarity && i === numItems - 1) {
                item = this.generateHighRarityItem(gameEngine.lootGen, effectiveFloorLevel);
            } else {
                item = gameEngine.lootGen.generateItem(effectiveFloorLevel);
                if (item.rarity === 'Epic' || item.rarity === 'Legendary') {
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
                dropX = this.x + Math.cos(angle) * dist;
                dropY = this.y + Math.sin(angle) * dist;

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
                dropX = this.x;
                dropY = this.y;
            }

            gameEngine.droppedItems.push(new DroppedItem(dropX, dropY, item));
        }

        if (gameEngine.particleSystem) {
            gameEngine.particleSystem.emitImpact(this.x, this.y, '#FFD700', 30);
        }
        if (gameEngine.combatFeedback) {
            gameEngine.combatFeedback.addText('Chest Opened!', this.x, this.y - 20, '#FFD700', 16, 1.5);
        }
    }

    generateHighRarityItem(lootGen, floor) {
        let item;
        let attempts = 0;
        do {
            item = lootGen.generateItem(floor);
            attempts++;
        } while (item.rarity !== 'Epic' && item.rarity !== 'Legendary' && attempts < 100);
        
        if (item.rarity !== 'Epic' && item.rarity !== 'Legendary') {
            item.rarity = 'Epic';
            item.color = '#a335ee';
            item.gearScore = Math.floor(item.gearScore * 1.5);
        }
        return item;
    }

    render(ctx, renderer) {
        const screenPos = renderer.camera.worldToScreen(this.x, this.y);
        
        ctx.fillStyle = this.color;
        ctx.fillRect(screenPos.x - this.width/2, screenPos.y - this.height/2, this.width, this.height);

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(screenPos.x - this.width/2, screenPos.y - this.height/2, this.width, this.height);

        if (!this.opened) {
            ctx.fillStyle = '#333';
            ctx.fillRect(screenPos.x - 4, screenPos.y - 2, 8, 8);
            
            ctx.strokeStyle = `rgba(255, 215, 0, ${0.5 + Math.sin(this.pulse) * 0.3})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, this.interactionRadius, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            ctx.fillStyle = '#3e1f08';
            ctx.fillRect(screenPos.x - this.width/2 + 2, screenPos.y - this.height/2 + 2, this.width - 4, this.height - 4);
        }
    }
}
