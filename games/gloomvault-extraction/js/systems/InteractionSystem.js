class InteractionSystem {
    update(engine, dt) {
        const nearest = this.findNearestInteractions(engine, dt);
        this.resolveInteraction(engine, nearest);
    }

    findNearestInteractions(engine, dt) {
        const result = {
            nearPortal: false,
            closestTransition: null,
            closestChest: null,
            closestService: null,
            closestBossButton: null,
            closestItem: null
        };

        this.updatePortal(engine, dt, result);
        this.updateDroppedItems(engine, dt, result);
        this.updateFloorTransitions(engine, dt, result);
        this.updateLootChests(engine, dt, result);
        this.updateDungeonServices(engine, dt, result);
        this.updateBossButtons(engine, dt, result);
        result.bossEntrance = engine.getNearbyBossRoomEntrance ? engine.getNearbyBossRoomEntrance() : null;
        return result;
    }

    updatePortal(engine, dt, result) {
        if (!engine.portal) return;
        engine.portal.update(dt, engine.enemies || []);
        if (!engine.player || engine.portal.enemiesNearby) return;

        const dist = Math.hypot(engine.player.x - engine.portal.x, engine.player.y - engine.portal.y);
        result.nearPortal = dist <= engine.portal.interactionRadius;
    }

    updateDroppedItems(engine, dt, result) {
        let minDistance = Infinity;
        const droppedItems = engine.droppedItems || [];
        for (let i = droppedItems.length - 1; i >= 0; i--) {
            const item = droppedItems[i];
            if (!item) continue;
            if (item.update) item.update(dt);
            if (!engine.player) continue;

            const dist = Math.hypot(engine.player.x - item.x, engine.player.y - item.y);
            if (dist <= item.pickupRadius && dist < minDistance) {
                minDistance = dist;
                result.closestItem = item;
            }
        }
    }

    updateFloorTransitions(engine, dt, result) {
        let transitionDistance = Infinity;
        for (const transition of engine.floorTransitions || []) {
            if (!transition) continue;
            if (transition.update) transition.update(dt, engine.enemies || []);
            if (!engine.player || transition.activated || transition.enemiesNearby) continue;

            const dist = Math.hypot(engine.player.x - transition.x, engine.player.y - transition.y);
            if (dist <= transition.interactionRadius && dist < transitionDistance) {
                result.closestTransition = transition;
                transitionDistance = dist;
            }
        }
    }

    updateLootChests(engine, dt, result) {
        let chestDistance = Infinity;
        for (const chest of engine.lootChests || []) {
            if (!chest) continue;
            if (chest.update) chest.update(dt);
            if (!engine.player || chest.opened) continue;

            const dist = Math.hypot(engine.player.x - chest.x, engine.player.y - chest.y);
            if (dist <= chest.interactionRadius && dist < chestDistance) {
                result.closestChest = chest;
                chestDistance = dist;
            }
        }
    }

    updateDungeonServices(engine, dt, result) {
        let serviceDistance = Infinity;
        for (const service of engine.dungeonServices || []) {
            if (!service) continue;
            if (service.update) service.update(dt);
            if (!engine.player) continue;

            const dist = Math.hypot(engine.player.x - service.x, engine.player.y - service.y);
            const canInteract = service.canInteract ? service.canInteract() : true;
            if (canInteract && dist <= service.interactionRadius && dist < serviceDistance) {
                result.closestService = service;
                serviceDistance = dist;
            }
        }
    }

    updateBossButtons(engine, dt, result) {
        let bossButtonDistance = Infinity;
        for (const button of engine.bossRoomButtons || []) {
            if (!button) continue;
            if (button.update) button.update(dt);
            if (!engine.player || button.activated) continue;

            const dist = Math.hypot(engine.player.x - button.x, engine.player.y - button.y);
            if (dist <= button.interactionRadius && dist < bossButtonDistance) {
                result.closestBossButton = button;
                bossButtonDistance = dist;
            }
        }
    }

    resolveInteraction(engine, nearest) {
        if (nearest.nearPortal) {
            return this.withHint(engine, 'Press [F] to Extract', () => engine.extract && engine.extract());
        }
        if (nearest.closestTransition) {
            return this.withHint(engine, 'Press [F] to Descend', () => nearest.closestTransition.interact(engine));
        }
        if (nearest.bossEntrance) {
            if (nearest.bossEntrance.unlocked) {
                return this.withHint(engine, 'Press [F] to Open', () => engine.openBossRoomEntrance && engine.openBossRoomEntrance());
            }
            if (engine.showInteractionHint) engine.showInteractionHint('Locked');
            return;
        }
        if (nearest.closestBossButton) {
            const buttons = engine.bossRoomButtons || [];
            let activeCount = 0;
            for (let i = 0; i < buttons.length; i++) {
                if (buttons[i].activated) activeCount++;
            }
            return this.withHint(engine, `Press [F] to Activate Seal (${activeCount}/3)`, () => nearest.closestBossButton.interact(engine));
        }
        if (nearest.closestChest) {
            return this.withHint(engine, 'Press [F] to Open Chest', () => nearest.closestChest.interact(engine.player, engine));
        }
        if (nearest.closestService) {
            return this.withHint(engine, nearest.closestService.hintText || 'Press [F] to Use', () => nearest.closestService.interact(engine.player, engine));
        }
        if (nearest.closestItem) {
            return this.withHint(engine, 'Press [F] to Pick Up', () => this.pickUpItem(engine, nearest.closestItem));
        }
        if (engine.hideInteractionHint) engine.hideInteractionHint();
    }

    withHint(engine, text, interact) {
        if (engine.showInteractionHint) engine.showInteractionHint(text);
        if (!this.isInteractPressed(engine)) return;
        this.consumeInteract(engine);
        interact();
    }

    isInteractPressed(engine) {
        return Boolean(engine.input && engine.input.isKeyDown && engine.input.isKeyDown('KeyF'));
    }

    consumeInteract(engine) {
        if (engine.input && engine.input.keys) engine.input.keys.KeyF = false;
    }

    pickUpItem(engine, item) {
        if (!engine.player || !item) return;
        if (engine.player.addToInventory(item.itemData)) {
            if (engine.combatFeedback && engine.combatFeedback.addText) {
                const type = item.itemData.type || 'item';
                const label = type.charAt(0).toUpperCase() + type.slice(1);
                engine.combatFeedback.addText(`Found ${label}`, item.x, item.y, item.itemData.color, 14, 1.0);
            }
            const idx = (engine.droppedItems || []).indexOf(item);
            if (idx > -1) engine.droppedItems.splice(idx, 1);
            if (engine.notifyInventoryChanged) engine.notifyInventoryChanged();
            return;
        }

        if (engine.combatFeedback && engine.combatFeedback.addText) {
            engine.combatFeedback.addText('Inventory Full', item.x, item.y, '#ff0000', 14, 1.0);
        }
    }
}

if (typeof window !== 'undefined') {
    window.InteractionSystem = InteractionSystem;
}
