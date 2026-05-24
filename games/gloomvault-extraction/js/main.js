document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 Gloomvault Extraction - main.js loaded');

    // Initialize the engine
    const engine = new GameEngine('game-canvas');
    const expandedMinimapCanvas = document.getElementById('expanded-minimap-canvas');
    let expandedMinimapRenderer = null;
    const assetManifest = typeof AssetManifest !== 'undefined' ? AssetManifest : window.AssetManifest;
    const assetManager = typeof AssetManager !== 'undefined' ? new AssetManager(assetManifest) : null;
    window.gloomvaultAssets = assetManager;
    window.gameAssets = assetManager ? assetManager.getLegacyGameAssets() : {};
    if (assetManager && engine.renderer && engine.renderer.setAssetManager) {
        engine.renderer.setAssetManager(assetManager);
        assetManager.loadAll().then(() => {
            window.gameAssets = assetManager.getLegacyGameAssets();
            if (engine.state === 'PLAYING') {
                engine.render(0);
            }
        });
    }
    
    // Make engine accessible globally for UI updates
    window.gloomvaultApp = {
        engine: engine,
        updateInventoryUI: updateInventoryUI,
        showScreen: showScreen
    };
    
    // Screen management
    const screens = document.querySelectorAll('.screen');
    
    function showScreen(id) {
        screens.forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
        hideExpandedMinimap();

        // Logic hook
        if (id === 'play-screen') {
            engine.start();
        } else if (id === 'main-menu') {
            engine.stop();
        }
    }

    function hideExpandedMinimap() {
        if (!expandedMinimapCanvas) return;
        const ctx = expandedMinimapCanvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, expandedMinimapCanvas.width, expandedMinimapCanvas.height);
        }
        expandedMinimapCanvas.classList.add('hidden');
    }

    function updateInventoryPaneLayout() {
        if (!inventoryScreen || inventoryScreen.classList.contains('hidden') || !engine.getInventoryPaneLayout) return null;

        const viewport = window.visualViewport || {};
        const viewportWidth = viewport.width || window.innerWidth || 800;
        const viewportHeight = viewport.height || window.innerHeight || 600;
        const header = inventoryScreen.querySelector('.inventory-header');
        const headerHeight = header ? header.getBoundingClientRect().height : 0;
        const layout = engine.getInventoryPaneLayout(viewportWidth, viewportHeight, headerHeight);

        inventoryScreen.style.setProperty('--inventory-pane-size', `${layout.paneSize}px`);
        inventoryScreen.style.setProperty('--inventory-pane-gap', `${layout.gap}px`);
        inventoryScreen.style.setProperty('--inventory-pane-padding', `${layout.panePadding}px`);
        inventoryScreen.style.setProperty('--inventory-content-scale', `${layout.contentScale}`);
        return layout;
    }

    function renderExpandedInventoryMinimap() {
        if (!expandedMinimapCanvas || !engine.renderer || !engine.player || !engine.mapGen) return;

        const minimapConfig = typeof MinimapConfig !== 'undefined' ? MinimapConfig : window.MinimapConfig;
        if (!minimapConfig) return;

        const layout = updateInventoryPaneLayout();

        const mapPane = document.getElementById('inventory-map-pane');
        if (!mapPane) return;

        const mapRect = mapPane.getBoundingClientRect();
        const canvasRect = engine.canvas.getBoundingClientRect();
        if (mapRect.width <= 0 || mapRect.height <= 0 || canvasRect.width <= 0 || canvasRect.height <= 0) return;

        const dprX = engine.canvas.width / canvasRect.width;
        const dprY = engine.canvas.height / canvasRect.height;
        const mapSize = layout
            ? Math.max(1, Math.floor(layout.innerPaneSize))
            : Math.max(1, Math.floor(Math.min(mapRect.width, mapRect.height)));
        const backingWidth = Math.max(1, Math.round(mapSize * dprX));
        const backingHeight = Math.max(1, Math.round(mapSize * dprY));
        expandedMinimapCanvas.width = backingWidth;
        expandedMinimapCanvas.height = backingHeight;
        expandedMinimapCanvas.style.width = `${mapSize}px`;
        expandedMinimapCanvas.style.height = `${mapSize}px`;
        expandedMinimapCanvas.classList.remove('hidden');

        const ctx = expandedMinimapCanvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, backingWidth, backingHeight);
        expandedMinimapRenderer = expandedMinimapRenderer || new Renderer(expandedMinimapCanvas, ctx);
        expandedMinimapRenderer.canvas = expandedMinimapCanvas;
        expandedMinimapRenderer.ctx = ctx;
        expandedMinimapRenderer.renderMinimap(
            engine.player,
            engine.portal,
            engine.floorTransitions,
            engine.mapGen,
            { ...minimapConfig, pixelScale: Math.min(dprX, dprY) },
            true,
            { x: 0, y: 0, width: backingWidth, height: backingHeight },
            engine.bossRoomButtons,
            engine.dungeonServices
        );
    }

    // Event Listeners
    document.getElementById('btn-start').addEventListener('click', () => showScreen('map-select-screen'));
    document.getElementById('btn-map-select-back').addEventListener('click', () => showScreen('main-menu'));
    document.getElementById('btn-map-random').addEventListener('click', () => {
        engine.setRunMapSelection('random');
        showScreen('play-screen');
    });
    renderMapSelectionUI();
    document.getElementById('btn-stash').addEventListener('click', () => {
        showScreen('stash-screen');
        updateStashUI();
    });
    document.getElementById('btn-stash-back').addEventListener('click', () => showScreen('main-menu'));
    document.getElementById('btn-game-over-menu').addEventListener('click', () => showScreen('main-menu'));

    function renderMapSelectionUI() {
        const grid = document.getElementById('map-select-grid');
        if (!grid || typeof MapConfigs === 'undefined') return;

        grid.innerHTML = '';
        Object.entries(MapConfigs).forEach(([key, config]) => {
            const button = document.createElement('button');
            button.className = 'menu-btn map-select-btn';
            button.dataset.mapKey = key;

            const title = document.createElement('span');
            title.className = 'map-option-title';
            title.textContent = config.displayName || key.replace(/_/g, ' ');

            const description = document.createElement('span');
            description.className = 'map-option-description';
            description.textContent = config.description || 'Procedural vault layout.';

            const meta = document.createElement('span');
            meta.className = 'map-option-meta';
            meta.textContent = `Tier ${config.progressionTier || 1} - ${config.layoutType || 'sequential'}`;

            button.appendChild(title);
            button.appendChild(description);
            button.appendChild(meta);
            button.addEventListener('click', () => {
                engine.setRunMapSelection(key);
                showScreen('play-screen');
            });

            grid.appendChild(button);
        });
    }

    // --- Stash UI Logic ---
    const stashGrid = document.getElementById('stash-grid');
    let stashItems = [];
    let stashEquipment = {
        helm: null, chest: null, pants: null, boots: null,
        weapon: null, weapon2: null, trinket1: null, trinket2: null
    };
    let scraps = 0;
    let itemInUpgradeSlot = null;
    let itemInRepairSlot = null;

    
    function ensureStarterEquipment(eq) {
        if (!eq.weapon) {
            eq.weapon = { id: 'starter_wep1', name: 'Apprentice Wand', type: 'weapon', weaponType: 'pistol', element: 'arcane', rarity: 'Common', color: '#a0a0a0', gearScore: 5, modifiers: [], upgradeLevel: 0, isStarter: true };
        }
        if (!eq.weapon2) {
            eq.weapon2 = { id: 'starter_wep2', name: 'Splintered Staff', type: 'weapon', weaponType: 'shotgun', element: 'frost', rarity: 'Common', color: '#a0a0a0', gearScore: 5, modifiers: [], upgradeLevel: 0, isStarter: true };
        }
        const minorHeal = { type: 'heal', value: 25, cooldown: 15, name: 'Minor Heal', text: 'Use to heal 25 HP (15s CD)' };
        if (!eq.trinket1) {
            eq.trinket1 = { id: 'starter_tr1', name: 'Health Potion', type: 'trinket', rarity: 'Common', color: '#a0a0a0', gearScore: 5, modifiers: [], upgradeLevel: 0, isStarter: true, activeAbility: minorHeal };
        }
        if (!eq.trinket2) {
            eq.trinket2 = { id: 'starter_tr2', name: 'Health Potion', type: 'trinket', rarity: 'Common', color: '#a0a0a0', gearScore: 5, modifiers: [], upgradeLevel: 0, isStarter: true, activeAbility: minorHeal };
        }
    }
function loadStashData() {
        try {
            stashItems = JSON.parse(localStorage.getItem('gloomvault_stash')) || [];
            let savedEq = JSON.parse(localStorage.getItem('gloomvault_equipment'));
            if (!savedEq) {
                savedEq = {
                    helm: null, chest: null, pants: null, boots: null,
                    weapon: null, weapon2: null, trinket1: null, trinket2: null
                };
                ensureStarterEquipment(savedEq);
            }
            stashEquipment = savedEq;
            scraps = parseInt(localStorage.getItem('gloomvault_scraps')) || 0;

            // Migrate durability for stash items and equipment missing it
            const migrateItem = (item) => {
                if (!item || item.isStarter || item.type === 'trinket') return;
                if (item.durability === undefined && typeof DurabilityConfig !== 'undefined') {
                    const maxDur = DurabilityConfig.calculateMaxDurability(item);
                    item.maxDurability = maxDur;
                    item.durability = maxDur;
                }
            };
            stashItems.forEach(migrateItem);
            for (const slot in stashEquipment) {
                migrateItem(stashEquipment[slot]);
            }
        } catch(e) {
            stashItems = [];
            scraps = 0;
        }
    }

    function saveStashData() {
        localStorage.setItem('gloomvault_stash', JSON.stringify(stashItems));
        localStorage.setItem('gloomvault_equipment', JSON.stringify(stashEquipment));
        localStorage.setItem('gloomvault_scraps', scraps.toString());
    }

    function setupStashDropZone(element, type, id) {
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            element.classList.add('drag-over');
        });

        element.addEventListener('dragleave', (e) => {
            element.classList.remove('drag-over');
        });

        element.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            element.classList.remove('drag-over');
            
            if (!draggedItemSource || !['stash', 'stash-equip', 'upgrade', 'repair'].includes(draggedItemSource.source)) return;

            let sourceList = null;
            let sourceItem = null;
            
            if (draggedItemSource.source === 'upgrade') {
                sourceItem = itemInUpgradeSlot.item;
            } else if (draggedItemSource.source === 'repair') {
                sourceItem = itemInRepairSlot.item;
            } else {
                sourceList = draggedItemSource.source === 'stash' ? stashItems : stashEquipment;
                sourceItem = sourceList[draggedItemSource.id];
            }

            let targetList = type === 'stash' ? stashItems : stashEquipment;
            let targetItem = targetList[id];

            if (!sourceItem) return;

            if (type === 'stash-equip') {
                const targetSlotType = id.replace(/[0-9]/g, '');
                if (sourceItem.type !== targetSlotType) return;
            }

            if (draggedItemSource.source === 'upgrade') {
                itemInUpgradeSlot = null; // Remove from upgrade slot
            }
            if (draggedItemSource.source === 'repair') {
                itemInRepairSlot = null; // Remove from repair slot
            }

            if (sourceList) {
                sourceList[draggedItemSource.id] = targetItem;
            } else if (targetItem) {
                 // If there's an item in target and we came from upgrade slot, swap it in
                 itemInUpgradeSlot = { item: targetItem, sourceId: id, sourceList: targetList };
            }
            targetList[id] = sourceItem;

            saveStashData();
            updateStashUI();
        });
    }

    // Setup Stash Equipment Zones
    document.querySelectorAll('.stash-slot').forEach(slot => {
        setupStashDropZone(slot, 'stash-equip', slot.dataset.slot);
    });

    const upgradeDropzone = document.getElementById('upgrade-dropzone');
    const btnUpgrade = document.getElementById('btn-upgrade-item');
    const stashSalvageDropzone = document.getElementById('stash-salvage-dropzone');

    if (stashSalvageDropzone) {
        stashSalvageDropzone.addEventListener('dragover', (e) => { e.preventDefault(); stashSalvageDropzone.classList.add('drag-over'); });
        stashSalvageDropzone.addEventListener('dragleave', () => stashSalvageDropzone.classList.remove('drag-over'));
        stashSalvageDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            stashSalvageDropzone.classList.remove('drag-over');

            if (!draggedItemSource || !['stash', 'stash-equip', 'upgrade', 'repair'].includes(draggedItemSource.source)) return;

            let sourceList = null;
            let sourceItem = null;

            if (draggedItemSource.source === 'upgrade') {
                sourceItem = itemInUpgradeSlot.item;
                itemInUpgradeSlot = null; // Remove from upgrade slot
            } else if (draggedItemSource.source === 'repair') {
                sourceItem = itemInRepairSlot.item;
                itemInRepairSlot = null; // Remove from repair slot
            } else {
                sourceList = draggedItemSource.source === 'stash' ? stashItems : stashEquipment;
                sourceItem = sourceList[draggedItemSource.id];
            }

            if (!sourceItem) return;

            const value = UpgradeSystem.getSalvageValue(sourceItem);
            scraps += value;

            if (sourceList) {
                sourceList[draggedItemSource.id] = null; // Remove item
            }

            saveStashData();
            updateStashUI(); // Refresh UI
        });
    }

    upgradeDropzone.addEventListener('dragover', (e) => { e.preventDefault(); upgradeDropzone.classList.add('drag-over'); });
    upgradeDropzone.addEventListener('dragleave', () => upgradeDropzone.classList.remove('drag-over'));
    upgradeDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        upgradeDropzone.classList.remove('drag-over');
        
        if (!draggedItemSource || !['stash', 'stash-equip'].includes(draggedItemSource.source)) return;
        
        let sourceList = draggedItemSource.source === 'stash' ? stashItems : stashEquipment;
        let sourceItem = sourceList[draggedItemSource.id];
        
        if (!sourceItem) return;

        // Move to upgrade slot (removing from source visually/temporarily)
        // If there's an item in the upgrade slot already, put it back to source
        let previousUpgradeItem = itemInUpgradeSlot ? itemInUpgradeSlot.item : null;
        
        if (previousUpgradeItem && draggedItemSource.source === 'stash-equip') {
            let emptyIndex = -1;
            for (let k = 0; k < stashItems.length; k++) {
                if (!stashItems[k]) { emptyIndex = k; break; }
            }
            if (emptyIndex === -1) {
                return; // Stash is full, prevent swap
            }
            stashItems[emptyIndex] = previousUpgradeItem;
            sourceList[draggedItemSource.id] = null;
        } else {
            sourceList[draggedItemSource.id] = previousUpgradeItem;
        }

        itemInUpgradeSlot = { item: sourceItem, sourceId: draggedItemSource.id, sourceList: sourceList };
        
        saveStashData();
        updateStashUI(); // Refresh UI
    });

    btnUpgrade.addEventListener('click', () => {
        if (!itemInUpgradeSlot) return;
        const result = UpgradeSystem.upgradeItem(itemInUpgradeSlot.item, scraps);
        if (result.success) {
            scraps = result.remainingScraps;
            saveStashData();
            updateStashUI();
            hideTooltip();
        }
    });

    // --- Repair Dropzone Logic ---
    const repairDropzone = document.getElementById('repair-dropzone');
    const btnRepair = document.getElementById('btn-repair-item');

    if (repairDropzone) {
        repairDropzone.addEventListener('dragover', (e) => { e.preventDefault(); repairDropzone.classList.add('drag-over'); });
        repairDropzone.addEventListener('dragleave', () => repairDropzone.classList.remove('drag-over'));
        repairDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            repairDropzone.classList.remove('drag-over');

            if (!draggedItemSource || !['stash', 'stash-equip'].includes(draggedItemSource.source)) return;

            let sourceList = draggedItemSource.source === 'stash' ? stashItems : stashEquipment;
            let sourceItem = sourceList[draggedItemSource.id];
            if (!sourceItem || !sourceItem.maxDurability) return;

            let previousRepairItem = itemInRepairSlot ? itemInRepairSlot.item : null;

            if (previousRepairItem && draggedItemSource.source === 'stash-equip') {
                let emptyIndex = -1;
                for (let k = 0; k < stashItems.length; k++) {
                    if (!stashItems[k]) { emptyIndex = k; break; }
                }
                if (emptyIndex === -1) return;
                stashItems[emptyIndex] = previousRepairItem;
                sourceList[draggedItemSource.id] = null;
            } else {
                sourceList[draggedItemSource.id] = previousRepairItem;
            }

            itemInRepairSlot = { item: sourceItem, sourceId: draggedItemSource.id, sourceList: sourceList };
            saveStashData();
            updateStashUI();
        });
    }

    if (btnRepair) {
        btnRepair.addEventListener('click', () => {
            if (!itemInRepairSlot) return;
            const result = UpgradeSystem.repairItem(itemInRepairSlot.item, scraps);
            if (result.success) {
                scraps = result.remainingScraps;
                saveStashData();
                updateStashUI();
                hideTooltip();
            }
        });
    }

    btnUpgrade.addEventListener('mouseenter', (e) => {
        if (!itemInUpgradeSlot) return;
        const simulated = UpgradeSystem.simulateUpgrade(itemInUpgradeSlot.item);
        if (simulated) {
            showTooltip(simulated, e, { source: 'upgrade_preview', type: 'upgrade_preview' });
        }
    });

    btnUpgrade.addEventListener('mousemove', (e) => {
        if (!itemInUpgradeSlot) return;
        if (currentHoveredItem && currentHoveredSourceData && currentHoveredSourceData.source === 'upgrade_preview') {
            positionTooltipSafely(tooltip, e.clientX, e.clientY);
        }
    });

    btnUpgrade.addEventListener('mouseleave', hideTooltip);

    function refreshUpgradeUI() {
        document.getElementById('scrap-counter').textContent = `Scraps: ${scraps}`;
        
        if (itemInUpgradeSlot) {
            upgradeDropzone.innerHTML = '';
            upgradeDropzone.appendChild(createDraggableItem(itemInUpgradeSlot.item, { source: 'upgrade', type: 'upgrade', id: 'upgrade' }));
            
            const cost = UpgradeSystem.getUpgradeCost(itemInUpgradeSlot.item);
            if (cost !== null) {
                btnUpgrade.textContent = `Upgrade (Cost: ${cost})`;
                btnUpgrade.disabled = scraps < cost;
            } else {
                btnUpgrade.textContent = 'Max Level';
                btnUpgrade.disabled = true;
            }
        } else {
            upgradeDropzone.innerHTML = 'Drop Item';
            btnUpgrade.textContent = 'Upgrade (Cost: --)';
            btnUpgrade.disabled = true;
        }

        refreshRepairUI();
    }

    function refreshRepairUI() {
        if (!repairDropzone || !btnRepair) return;

        if (itemInRepairSlot) {
            repairDropzone.innerHTML = '';
            repairDropzone.appendChild(createDraggableItem(itemInRepairSlot.item, { source: 'repair', type: 'repair', id: 'repair' }));

            const cost = UpgradeSystem.getRepairCost(itemInRepairSlot.item);
            if (cost !== null) {
                btnRepair.textContent = `Repair (Cost: ${cost})`;
                btnRepair.disabled = scraps < cost;
            } else {
                btnRepair.textContent = 'Full Durability';
                btnRepair.disabled = true;
            }
        } else {
            repairDropzone.innerHTML = 'Drop Item';
            btnRepair.textContent = 'Repair (Cost: --)';
            btnRepair.disabled = true;
        }
    }

    function updateStashUI() {
        loadStashData();
        stashGrid.innerHTML = '';
        
        // Ensure stash array has enough slots (at least 25)
        while(stashItems.length < 25) stashItems.push(null);

        for (let i = 0; i < stashItems.length; i++) {
            const cell = document.createElement('div');
            cell.className = 'inventory-cell';
            cell.dataset.index = i;
            setupStashDropZone(cell, 'stash', i);
            
            const item = stashItems[i];
            if (item) {
                cell.appendChild(createDraggableItem(item, { source: 'stash', type: 'inventory', id: i }));
            }
            stashGrid.appendChild(cell);
        }

        // Update Stash Equipment
        document.querySelectorAll('.stash-slot').forEach(slot => {
            const slotId = slot.dataset.slot;
            const item = stashEquipment[slotId];
            slot.innerHTML = slotId.replace(/[0-9]/g, '').toUpperCase();
            if (item) {
                slot.innerHTML = '';
                slot.appendChild(createDraggableItem(item, { source: 'stash-equip', type: 'equipment', id: slotId }));
            }
        });

        refreshUpgradeUI();
        updateStashStats();
    }

    function updateStashStats() {
        // Base Stats (Unmodified) - mimicking Player constructor
        const stats = {
            speed: 200,
            damageMultiplier: 1.0,
            attackSpeedMultiplier: 1.0,
            movementSpeedMultiplier: 1.0,
            flatDamage: 0,
            lifesteal: 0,
            lifestealCapBonus: 0,
            armor: 0,
            damageReduction: 0,
            thorns: 0,
            dodgeCooldownMultiplier: 1.0
        };

        // Aggregate modifiers from stashEquipment
        const activeMods = [];
        for (const slot in stashEquipment) {
            const item = stashEquipment[slot];
            if (item && item.modifiers) {
                // Skip broken items (durability === 0)
                if (item.durability !== undefined && item.durability <= 0) continue;
                activeMods.push(...item.modifiers);
            }
        }

        // Apply modifiers
        for (const mod of activeMods) {
            if (mod.type === 'percent' || mod.type === 'percent_penalty') {
                if (stats[mod.stat] !== undefined) {
                    stats[mod.stat] += (mod.value / 100);
                }
            } else if (mod.type === 'flat') {
                if (stats[mod.stat] !== undefined) {
                    stats[mod.stat] += mod.value;
                }
            }
        }

        // Apply derived stats
        stats.armor = stats.armor * (stats.armorMultiplier || 1.0);
        const finalSpeed = stats.speed * stats.movementSpeedMultiplier;
        
        let weapon1 = stashEquipment.weapon && !(stashEquipment.weapon.durability !== undefined && stashEquipment.weapon.durability <= 0) ? new Weapon(stashEquipment.weapon, false) : null;
        let weaponDamage = 0;
        let weaponCooldown = 0;
        let totalGearScore = 0;
        
        for (const slot in stashEquipment) {
            if (stashEquipment[slot] && stashEquipment[slot].gearScore) {
                totalGearScore += stashEquipment[slot].gearScore;
            }
        }

        if (weapon1) {
            weaponDamage = Math.round(weapon1.baseDamage * stats.damageMultiplier + stats.flatDamage);
            weaponCooldown = weapon1.baseCooldown / stats.attackSpeedMultiplier;
        } else {
            weaponDamage = Math.round(stats.flatDamage);
        }

        // Update UI
        const gsEl = document.getElementById('stash-stat-gs');
        if (gsEl) gsEl.textContent = totalGearScore;
        
        document.getElementById('stash-stat-dmg').textContent = weaponDamage;
        document.getElementById('stash-stat-spd').textContent = weapon1 ? (1 / weaponCooldown).toFixed(2) + '/s' : '-';
        document.getElementById('stash-stat-ms').textContent = Math.round(finalSpeed);
        
        document.getElementById('stash-stat-armor').textContent = Math.round(stats.armor);
        document.getElementById('stash-stat-dr').textContent = Math.round(stats.damageReduction * 100) + '%';
        
        const baseDodgeCooldown = 1.0;
        const dodgeCd = baseDodgeCooldown * Math.max(0.2, stats.dodgeCooldownMultiplier);
        document.getElementById('stash-stat-dodge').textContent = dodgeCd.toFixed(2) + 's';
        
        document.getElementById('stash-stat-thorns').textContent = Math.round(stats.thorns);

        let baseLsCap = typeof CombatConfig !== 'undefined' ? CombatConfig.caps.lifesteal : 0.35;
        let currentLsCap = baseLsCap + stats.lifestealCapBonus;
        let totalLs = stats.lifesteal;
        let effectiveLs = Math.min(totalLs, currentLsCap);
        let lsText = `${Math.round(effectiveLs * 100)}%`;
        if (Math.round(totalLs * 100) > Math.round(currentLsCap * 100)) {
            lsText += ` (${Math.round(totalLs * 100)}%)`;
        }
        document.getElementById('stash-stat-ls').textContent = lsText;
    }

    let currentLoot = [];

    window.gloomvaultApp.setupExtraction = function(inventory) {
        loadStashData();
        currentLoot = [...inventory]; // Copy array
        updateExtractionUI();
    };

    function updateExtractionUI() {
        const lootGrid = document.getElementById('extract-loot-grid');
        const stashExGrid = document.getElementById('extract-stash-grid');
        
        lootGrid.innerHTML = '';
        for (let i = 0; i < 25; i++) {
            const cell = document.createElement('div');
            cell.className = 'inventory-cell';
            setupExtractDropZone(cell, 'extract-loot', i);
            if (currentLoot[i]) {
                const itemEl = createDraggableItem(currentLoot[i], { source: 'extract-loot', id: i });
                itemEl.addEventListener('click', () => {
                    let emptyIndex = -1;
                    for (let k = 0; k < stashItems.length; k++) {
                        if (!stashItems[k]) { emptyIndex = k; break; }
                    }
                    if (emptyIndex !== -1) {
                        stashItems[emptyIndex] = currentLoot[i];
                        currentLoot[i] = null;
                        saveStashData();
                        updateExtractionUI();
                        hideTooltip();
                    }
                });
                cell.appendChild(itemEl);
            }
            lootGrid.appendChild(cell);
        }
        
        stashExGrid.innerHTML = '';
        while(stashItems.length < 25) stashItems.push(null); // Fix bug: ensure standard size
        for (let i = 0; i < stashItems.length; i++) {
            const cell = document.createElement('div');
            cell.className = 'inventory-cell';
            setupExtractDropZone(cell, 'extract-stash', i);
            if (stashItems[i]) {
                const itemEl = createDraggableItem(stashItems[i], { source: 'extract-stash', id: i });
                itemEl.addEventListener('click', () => {
                    let emptyIndex = -1;
                    for (let k = 0; k < 25; k++) {
                        if (!currentLoot[k]) { emptyIndex = k; break; }
                    }
                    if (emptyIndex !== -1) {
                        currentLoot[emptyIndex] = stashItems[i];
                        stashItems[i] = null;
                        saveStashData();
                        updateExtractionUI();
                        hideTooltip();
                    }
                });
                cell.appendChild(itemEl);
            }
            stashExGrid.appendChild(cell);
        }
        
        document.getElementById('extract-scrap-counter').textContent = `Scraps: ${scraps}`;
    }

    function setupExtractDropZone(element, type, id) {
        element.addEventListener('dragover', e => { e.preventDefault(); element.classList.add('drag-over'); });
        element.addEventListener('dragleave', () => element.classList.remove('drag-over'));
        element.addEventListener('drop', e => {
            e.preventDefault(); element.classList.remove('drag-over');
            if (!draggedItemSource || (draggedItemSource.source !== 'extract-loot' && draggedItemSource.source !== 'extract-stash')) return;
            
            let sourceList = draggedItemSource.source === 'extract-loot' ? currentLoot : stashItems;
            let targetList = type === 'extract-loot' ? currentLoot : stashItems;
            
            let sourceItem = sourceList[draggedItemSource.id];
            let targetItem = targetList[id];
            if (!sourceItem) return;
            
            sourceList[draggedItemSource.id] = targetItem;
            targetList[id] = sourceItem;
            
            saveStashData();
            updateExtractionUI();
        });
    }

    // Salvage logic
    const salvageDropzone = document.getElementById('salvage-dropzone');
    if(salvageDropzone) {
        salvageDropzone.addEventListener('dragover', e => { e.preventDefault(); salvageDropzone.classList.add('drag-over'); });
        salvageDropzone.addEventListener('dragleave', () => salvageDropzone.classList.remove('drag-over'));
        salvageDropzone.addEventListener('drop', e => {
            e.preventDefault(); salvageDropzone.classList.remove('drag-over');
            if (!draggedItemSource || (draggedItemSource.source !== 'extract-loot' && draggedItemSource.source !== 'extract-stash')) return;
            
            let sourceList = draggedItemSource.source === 'extract-loot' ? currentLoot : stashItems;
            let sourceItem = sourceList[draggedItemSource.id];
            if (!sourceItem) return;
            
            const value = UpgradeSystem.getSalvageValue(sourceItem);
            scraps += value;
            sourceList[draggedItemSource.id] = null; // Remove item
            
            saveStashData();
            updateExtractionUI();
        });
    }

    // Stash All button
    const btnStashAll = document.getElementById('btn-stash-all');
    if(btnStashAll) {
        btnStashAll.addEventListener('click', () => {
            let movedAny = false;
            for (let i = 0; i < 25; i++) {
                if (currentLoot[i]) {
                    let emptyIndex = -1;
                    for (let k = 0; k < stashItems.length; k++) {
                        if (!stashItems[k]) { emptyIndex = k; break; }
                    }
                    if (emptyIndex !== -1) {
                        stashItems[emptyIndex] = currentLoot[i];
                        currentLoot[i] = null;
                        movedAny = true;
                    } else {
                        break; // Stash is full
                    }
                }
            }
            if (movedAny) {
                saveStashData();
                updateExtractionUI();
                hideTooltip();
            }
        });
    }

    // Salvage All Common button
    const btnSalvageAllCommon = document.getElementById('btn-salvage-all-common');
    if (btnSalvageAllCommon) {
        btnSalvageAllCommon.addEventListener('click', () => {
            let salvagedAny = false;
            for (let i = 0; i < currentLoot.length; i++) {
                const item = currentLoot[i];
                if (item && item.rarity === 'Common') {
                    const value = UpgradeSystem.getSalvageValue(item);
                    scraps += value;
                    currentLoot[i] = null; // Remove item
                    salvagedAny = true;
                }
            }
            if (salvagedAny) {
                saveStashData();
                updateExtractionUI();
                hideTooltip();
            }
        });
    }

    // Finish button
    const btnFinishExtraction = document.getElementById('btn-finish-extraction');
    const extractionConfirmModal = document.getElementById('extraction-confirm-modal');
    const btnConfirmLeave = document.getElementById('btn-confirm-leave');
    const btnCancelLeave = document.getElementById('btn-cancel-leave');
    const extractionConfirmText = document.getElementById('extraction-confirm-text');

    if(btnFinishExtraction) {
        btnFinishExtraction.addEventListener('click', () => {
            let highRarityCount = 0;
            if (currentLoot && currentLoot.length > 0) {
                for (let i = 0; i < currentLoot.length; i++) {
                    const item = currentLoot[i];
                    if (item && (item.rarity === 'Uncommon' || item.rarity === 'Epic' || item.rarity === 'Legendary')) {
                        highRarityCount++;
                    }
                }
            }

            if (highRarityCount > 0) {
                extractionConfirmText.innerHTML = `You have <strong style="color: #e040fb;">${highRarityCount} High-Value (Uncommon+) items</strong> left in your extraction loot.<br><br>If you leave now, they will be lost forever. Are you sure?`;
                extractionConfirmModal.classList.remove('hidden');
            } else {
                showScreen('main-menu');
            }
        });

        if (btnConfirmLeave) {
            btnConfirmLeave.addEventListener('click', () => {
                extractionConfirmModal.classList.add('hidden');
                showScreen('main-menu');
            });
        }

        if (btnCancelLeave) {
            btnCancelLeave.addEventListener('click', () => {
                extractionConfirmModal.classList.add('hidden');
            });
        }
    }

    // --- Inventory Overlay Logic ---
    const inventoryScreen = document.getElementById('inventory-screen');
    const btnCloseInventory = document.getElementById('btn-close-inventory');
    const inventoryGrid = document.getElementById('inventory-grid');
    let inventoryResizeHandler = null;
    
    // Tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'item-tooltip hidden';
    document.body.appendChild(tooltip);

    let isShiftDown = false;
    let currentHoveredItem = null;
    let currentHoveredEvent = null;
    let currentHoveredSourceData = null;

    document.addEventListener('keydown', (e) => {
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
            if (!isShiftDown) {
                isShiftDown = true;
                if (currentHoveredItem && currentHoveredEvent) {
                    showTooltip(currentHoveredItem, currentHoveredEvent, currentHoveredSourceData);
                }
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
            if (isShiftDown) {
                isShiftDown = false;
                if (currentHoveredItem && currentHoveredEvent) {
                    showTooltip(currentHoveredItem, currentHoveredEvent, currentHoveredSourceData);
                }
            }
        }
    });

    function getStatMap(itm) {
        let map = {};
        
        if (itm && itm.type === 'weapon') {
            // Instantiate a temporary weapon to get base stats
            if (typeof Weapon !== 'undefined') {
                let tempWep = new Weapon(itm, false);
                map['baseDamage'] = { name: 'Base Damage', value: tempWep.baseDamage, type: 'flat' };
                map['baseCooldown'] = { name: 'Cooldown (s)', value: tempWep.baseCooldown, type: 'flat' };
                map['projectileCount'] = { name: 'Projectiles', value: tempWep.projectileCount, type: 'flat' };
            }
        }

        if (itm && itm.modifiers) {
            itm.modifiers.forEach(m => {
                if (!map[m.stat]) map[m.stat] = { name: m.name, value: 0, type: m.type };
                map[m.stat].value += m.value;
            });
        }
        return map;
    }

    function buildComparisonHTML(hoverItem, equipItem, slotLabel = "Equipped") {
        let hoverStats = getStatMap(hoverItem);
        let equipStats = getStatMap(equipItem);
        
        let allStats = new Set([...Object.keys(hoverStats), ...Object.keys(equipStats)]);
        let deltas = [];
        
        let gsDiff = hoverItem.gearScore - equipItem.gearScore;
        if (gsDiff !== 0) {
            let sign = gsDiff > 0 ? '+' : '';
            let colorClass = gsDiff > 0 ? 'modifier-positive' : 'modifier-negative';
            deltas.push(`<div class="modifier-line ${colorClass}"><strong>${sign}${gsDiff} Gear Score</strong></div>`);
        }

        allStats.forEach(statKey => {
            let h = hoverStats[statKey] || { value: 0, name: '', type: '' };
            let e = equipStats[statKey] || { value: 0, name: '', type: '' };
            let diff = h.value - e.value;
            
            if (Math.abs(diff) > 0.01) {
                let name = h.name || e.name;
                let type = h.type || e.type;
                
                let sign = diff > 0 ? '+' : '';
                let percent = (type === 'percent' || type === 'percent_penalty') ? '%' : '';
                
                let isGood = diff > 0;
                if (type === 'percent_penalty' || name.toLowerCase().includes('penalty') || statKey === 'baseCooldown') {
                    isGood = !isGood;
                }
                
                let valStr = diff % 1 !== 0 ? diff.toFixed(1).replace(/\.0$/, '') : diff;
                let colorClass = isGood ? 'modifier-positive' : 'modifier-negative';
                deltas.push(`<div class="modifier-line ${colorClass}">${sign}${valStr}${percent} ${name}</div>`);
            }
        });
        
        if (deltas.length === 0) {
            deltas.push('<div class="modifier-line modifier-neutral">Identical Stats</div>');
        }

        return `
            <div class="tooltip-comparison" style="border-top: 1px solid #777; margin-top: 5px; padding-top: 5px;">
                <div style="font-size: 0.85em; color: #ccc; margin-bottom: 2px;">Compared to ${slotLabel}:</div>
                ${deltas.join('')}
            </div>
        `;
    }

    function positionTooltipSafely(tooltipEl, x, y) {
        const tooltipWidth = tooltipEl.offsetWidth;
        const tooltipHeight = tooltipEl.offsetHeight;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left = x + 15;
        let top = y + 15;

        // Check right boundary
        if (left + tooltipWidth > viewportWidth - 5) {
            left = x - tooltipWidth - 15;
        }

        // Check bottom boundary
        if (top + tooltipHeight > viewportHeight - 5) {
            top = y - tooltipHeight - 15;
        }

        // Final safety clamps to ensure it doesn't go off the top/left edges
        left = Math.max(5, left);
        top = Math.max(5, top);

        tooltipEl.style.left = `${left}px`;
        tooltipEl.style.top = `${top}px`;
    }

    function showTooltip(item, e, sourceData) {
        if (!item) return;
        currentHoveredItem = item;
        currentHoveredEvent = e;
        currentHoveredSourceData = sourceData;
        
        let implicits = item.modifiers ? item.modifiers.filter(m => m.isImplicit) : [];
        let explicits = item.modifiers ? item.modifiers.filter(m => !m.isImplicit && !m.isTrait) : [];
        
        let comparisonHTML = '';
        let isBackpackItem = sourceData && sourceData.type === 'inventory'; // Check if it's an inventory item
        
        let isStashScreenOpen = document.getElementById('stash-screen').classList.contains('active');
        let isInventoryOpen = !inventoryScreen.classList.contains('hidden');

        if (isBackpackItem && (isInventoryOpen || isStashScreenOpen)) {
            let slotName = item.type.toLowerCase();
            let equippedItems = [];
            
            let equipmentSource = isStashScreenOpen ? stashEquipment : engine.player.equipment;
            
            if (slotName === 'weapon') {
                if (equipmentSource['weapon']) equippedItems.push({ item: equipmentSource['weapon'], label: 'Weapon 1' });
                if (equipmentSource['weapon2']) equippedItems.push({ item: equipmentSource['weapon2'], label: 'Weapon 2' });
            } else if (slotName === 'trinket') {
                if (equipmentSource['trinket1']) equippedItems.push({ item: equipmentSource['trinket1'], label: 'Trinket 1' });
                if (equipmentSource['trinket2']) equippedItems.push({ item: equipmentSource['trinket2'], label: 'Trinket 2' });
            } else {
                if (equipmentSource[slotName]) equippedItems.push({ item: equipmentSource[slotName], label: 'Equipped' });
            }
            
            if (equippedItems.length > 0) {
                if (isShiftDown) {
                    equippedItems.forEach(eq => {
                        comparisonHTML += buildComparisonHTML(item, eq.item, eq.label);
                    });
                } else {
                    comparisonHTML = `<div class="tooltip-hint" style="color: #aaa; font-size: 0.85em; margin-top: 8px; text-align: center; border-top: 1px dashed #555; padding-top: 4px;">Shift to compare</div>`;
                }
            }
        }

        let weaponDetailsHTML = '';
        if (item.type === 'weapon' && typeof Weapon !== 'undefined') {
            const tempWeapon = new Weapon(item, false);
            const elementName = item.element ? item.element.charAt(0).toUpperCase() + item.element.slice(1) : 'None';
            const variantText = item.weaponVariant === 'overcharged' ? '<br>Variant: Overcharged melee-range stagger' : '';
            weaponDetailsHTML = `
                <div class="modifier-list" style="color: #d8c8ff; border-top: 1px solid #555;">
                    Attack: ${tempWeapon.attackName}<br>
                    Element: ${elementName}${variantText}
                </div>
            `;
        }

        tooltip.innerHTML = `
            <div class="tooltip-title" style="color: ${item.color}">${item.name}</div>
            <div class="tooltip-stats">
                Type: ${item.type}<br>
                Rarity: ${item.rarity}<br>
                Gear Score: ${item.gearScore}
            </div>
            ${weaponDetailsHTML}
            ${implicits.length > 0 ? `
                <div class="modifier-list" style="border-bottom: 1px solid #555; padding-bottom: 5px; margin-bottom: 5px;">
                    ${implicits.map(m => {
                        let modClass = 'modifier-neutral';
                        if (m.text.includes('+') || m.value > 0) modClass = 'modifier-positive';
                        if (m.text.includes('-') || m.value < 0) modClass = 'modifier-negative';
                        return '<div class="modifier-line ' + modClass + '"><i>' + m.text + '</i></div>';
                    }).join('')}
                </div>
            ` : ''}
            ${explicits.length > 0 ? `
                <div class="modifier-list">
                    ${explicits.map(m => {
                        let modClass = 'modifier-neutral';
                        if (m.text.includes('+') || m.value > 0) modClass = 'modifier-positive';
                        if (m.text.includes('-') || m.value < 0) modClass = 'modifier-negative';
                        return '<div class="modifier-line ' + modClass + '">' + m.text + '</div>';
                    }).join('')}
                </div>
            ` : ''}
            ${item.activeAbility ? `
                <div class="modifier-list" style="color: #ffeb3b; font-weight: bold; border-top: 1px solid #777;">
                    Active Ability: ${item.activeAbility.name}<br>
                    <span style="font-weight: normal; color: #fff;">${item.activeAbility.text}</span>
                </div>
            ` : ''}
            ${item.passiveTrait ? `
                <div class="modifier-list" style="color: #e040fb; font-weight: bold; border-top: 1px dashed #e040fb; padding-top: 5px; margin-top: 5px;">
                    Trait: ${item.passiveTrait.name}<br>
                    <span style="font-weight: normal; color: #fff;">${item.passiveTrait.text}</span>
                </div>
            ` : ''}
            ${comparisonHTML}
            ${item.maxDurability !== undefined ? (() => {
                const pct = item.maxDurability > 0 ? (item.durability / item.maxDurability) : 0;
                const colorClass = item.durability <= 0 ? 'dur-broken' : pct <= 0.10 ? 'dur-red' : pct <= 0.25 ? 'dur-orange' : pct <= 0.50 ? 'dur-yellow' : 'dur-green';
                const label = item.durability <= 0 ? 'BROKEN' : `${Math.ceil(item.durability)} / ${item.maxDurability}`;
                return `<div class="durability-bar-container">
                    <div class="durability-bar-label">Durability: ${label}</div>
                    <div class="durability-bar"><div class="durability-bar-fill ${colorClass}" style="width: ${Math.max(0, pct * 100)}%"></div></div>
                </div>`;
            })() : ''}
        `;
        tooltip.classList.remove('hidden');
        positionTooltipSafely(tooltip, e.clientX, e.clientY);
    }

    function hideTooltip() {
        tooltip.classList.add('hidden');
        currentHoveredItem = null;
        currentHoveredEvent = null;
        currentHoveredSourceData = null;
    }

    // Toggle Inventory
    document.addEventListener('keydown', (e) => {
        const isServiceOpen = serviceOverlay && !serviceOverlay.classList.contains('hidden');
        if (isServiceOpen && e.code === 'Tab') {
            e.preventDefault();
            closeDungeonService();
            return;
        }
        if (isServiceOpen) return;
        if ((e.code === 'Tab' || e.code === 'KeyI') && engine.state === 'PLAYING') {
            e.preventDefault();
            toggleInventory();
        }
    });

    btnCloseInventory.addEventListener('click', toggleInventory);

    function toggleInventory() {
        if (inventoryScreen.classList.contains('hidden')) {
            // Open Inventory
            inventoryScreen.classList.remove('hidden');
            updateInventoryPaneLayout();
            engine.pauseLoop(); // Pause game
            engine.showMinimap = false; // Hide regular minimap
            updateInventoryUI();
            
            // Re-render the game without the regular minimap
            engine.render(0);
            
            // Wait for the next tick so inventory bounds are accurate before placing the map.
            requestAnimationFrame(renderExpandedInventoryMinimap);
            if (!inventoryResizeHandler) {
                inventoryResizeHandler = () => requestAnimationFrame(renderExpandedInventoryMinimap);
                window.addEventListener('resize', inventoryResizeHandler);
                if (window.visualViewport && window.visualViewport.addEventListener) {
                    window.visualViewport.addEventListener('resize', inventoryResizeHandler);
                }
            }
        } else {
            // Close Inventory
            inventoryScreen.classList.add('hidden');
            hideExpandedMinimap();
            hideTooltip();
            if (inventoryResizeHandler) {
                window.removeEventListener('resize', inventoryResizeHandler);
                if (window.visualViewport && window.visualViewport.removeEventListener) {
                    window.visualViewport.removeEventListener('resize', inventoryResizeHandler);
                }
                inventoryResizeHandler = null;
            }
            engine.showMinimap = true; // Show regular minimap again
            engine.resumeLoop();
        }
    }

    let draggedItemSource = null;
    let activeServiceMode = null;
    let serviceUpgradeSlot = null;
    let serviceRepairSlot = null;

    const serviceOverlay = document.getElementById('dungeon-service-overlay');
    const serviceTitle = document.getElementById('dungeon-service-title');
    const btnCloseService = document.getElementById('btn-close-service');
    const serviceInventoryGrid = document.getElementById('service-inventory-grid');
    const serviceStashGrid = document.getElementById('service-stash-grid');
    const serviceStashPanel = document.getElementById('service-stash-panel');
    const serviceUpgradeDropzone = document.getElementById('service-upgrade-dropzone');
    const serviceRepairDropzone = document.getElementById('service-repair-dropzone');
    const serviceSalvageDropzone = document.getElementById('service-salvage-dropzone');
    const btnServiceUpgrade = document.getElementById('btn-service-upgrade-item');
    const btnServiceRepair = document.getElementById('btn-service-repair-item');

    function getServiceSource(sourceData) {
        if (!sourceData || !engine.player) return null;
        if (sourceData.source === 'service-inventory') return { list: engine.player.inventory, id: sourceData.id };
        if (sourceData.source === 'service-equipment') return { list: engine.player.equipment, id: sourceData.id };
        if (sourceData.source === 'service-stash') return { list: stashItems, id: sourceData.id };
        if (sourceData.source === 'service-upgrade') return { slot: 'upgrade', item: serviceUpgradeSlot && serviceUpgradeSlot.item };
        if (sourceData.source === 'service-repair') return { slot: 'repair', item: serviceRepairSlot && serviceRepairSlot.item };
        return null;
    }

    function findFirstEmpty(list) {
        for (let i = 0; i < list.length; i++) {
            if (!list[i]) return i;
        }
        return -1;
    }

    function returnServiceSlotItem(slotInfo) {
        if (!slotInfo || !slotInfo.item) return true;
        if (slotInfo.sourceList && slotInfo.sourceList[slotInfo.sourceId] == null) {
            slotInfo.sourceList[slotInfo.sourceId] = slotInfo.item;
            return true;
        }

        const preferred = activeServiceMode === 'bank' ? stashItems : engine.player.inventory;
        while (preferred === stashItems && stashItems.length < 25) stashItems.push(null);
        const emptyIndex = findFirstEmpty(preferred);
        if (emptyIndex !== -1) {
            preferred[emptyIndex] = slotInfo.item;
            return true;
        }
        return false;
    }

    function persistRunEquipment() {
        if (!engine.player) return;
        engine.player.recalculateStats();
        stashEquipment = engine.player.equipment;
        saveStashData();
        updateInventoryUI();
        updateDurabilityHUD();
    }

    function closeDungeonService() {
        if (!serviceOverlay || serviceOverlay.classList.contains('hidden')) return;
        returnServiceSlotItem(serviceUpgradeSlot);
        returnServiceSlotItem(serviceRepairSlot);
        serviceUpgradeSlot = null;
        serviceRepairSlot = null;
        persistRunEquipment();
        refreshServiceUI();
        serviceOverlay.classList.add('hidden');
        hideTooltip();
        hideExpandedMinimap();
        activeServiceMode = null;
        engine.showMinimap = true;
        engine.resumeLoop();
    }

    function openDungeonService(mode) {
        if (!engine.player || !serviceOverlay) return;
        activeServiceMode = mode;
        loadStashData();
        while (stashItems.length < 25) stashItems.push(null);
        serviceUpgradeSlot = null;
        serviceRepairSlot = null;
        serviceTitle.textContent = mode === 'bank' ? 'Void Bank' : 'Blacksmith';
        serviceStashPanel.style.display = mode === 'bank' ? 'block' : 'none';
        serviceOverlay.classList.remove('hidden');
        engine.pauseLoop();
        engine.showMinimap = false;
        engine.render(0);
        refreshServiceUI();
    }

    window.gloomvaultApp.openDungeonBlacksmith = function() {
        openDungeonService('blacksmith');
    };

    window.gloomvaultApp.openDungeonBank = function() {
        openDungeonService('bank');
    };

    if (btnCloseService) {
        btnCloseService.addEventListener('click', closeDungeonService);
    }

    function setupServiceDropZone(element, targetType, id) {
        if (!element) return;
        if (element.dataset.serviceDropSetup === `${targetType}:${id}`) return;
        element.dataset.serviceDropSetup = `${targetType}:${id}`;
        element.addEventListener('dragover', (e) => {
            if (!activeServiceMode) return;
            e.preventDefault();
            element.classList.add('drag-over');
        });
        element.addEventListener('dragleave', () => element.classList.remove('drag-over'));
        element.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            element.classList.remove('drag-over');
            if (!activeServiceMode || !draggedItemSource) return;

            const source = getServiceSource(draggedItemSource);
            if (!source) return;
            const sourceItem = source.item || (source.list && source.list[source.id]);
            if (!sourceItem) return;

            let targetList = null;
            if (targetType === 'inventory') targetList = engine.player.inventory;
            if (targetType === 'equipment') targetList = engine.player.equipment;
            if (targetType === 'stash') targetList = stashItems;
            if (!targetList) return;
            if (targetType === 'stash' && activeServiceMode !== 'bank') return;

            if (targetType === 'equipment') {
                const targetSlotType = id.replace(/[0-9]/g, '');
                if (sourceItem.type !== targetSlotType) return;
            }

            const targetItem = targetList[id];
            if (source.slot === 'upgrade') serviceUpgradeSlot = null;
            else if (source.slot === 'repair') serviceRepairSlot = null;
            else source.list[source.id] = targetItem;
            targetList[id] = sourceItem;

            persistRunEquipment();
            refreshServiceUI();
        });
    }

    function setupServiceCraftingDropzone(element, slotType) {
        if (!element) return;
        element.addEventListener('dragover', (e) => {
            if (!activeServiceMode) return;
            e.preventDefault();
            element.classList.add('drag-over');
        });
        element.addEventListener('dragleave', () => element.classList.remove('drag-over'));
        element.addEventListener('drop', (e) => {
            e.preventDefault();
            element.classList.remove('drag-over');
            if (!activeServiceMode || !draggedItemSource) return;
            const source = getServiceSource(draggedItemSource);
            if (!source || !source.list) return;
            const sourceItem = source.list[source.id];
            if (!sourceItem) return;
            if (slotType === 'repair' && !sourceItem.maxDurability) return;

            const targetSlot = slotType === 'upgrade' ? serviceUpgradeSlot : serviceRepairSlot;
            const previousItem = targetSlot && targetSlot.item;
            source.list[source.id] = previousItem || null;
            const nextSlot = { item: sourceItem, sourceList: source.list, sourceId: source.id };
            if (slotType === 'upgrade') serviceUpgradeSlot = nextSlot;
            else serviceRepairSlot = nextSlot;

            persistRunEquipment();
            refreshServiceUI();
        });
    }

    function setupServiceSalvageDropzone() {
        if (!serviceSalvageDropzone) return;
        serviceSalvageDropzone.addEventListener('dragover', (e) => {
            if (!activeServiceMode) return;
            e.preventDefault();
            serviceSalvageDropzone.classList.add('drag-over');
        });
        serviceSalvageDropzone.addEventListener('dragleave', () => serviceSalvageDropzone.classList.remove('drag-over'));
        serviceSalvageDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            serviceSalvageDropzone.classList.remove('drag-over');
            if (!activeServiceMode || !draggedItemSource) return;
            const source = getServiceSource(draggedItemSource);
            if (!source) return;
            const sourceItem = source.item || (source.list && source.list[source.id]);
            if (!sourceItem) return;

            scraps += UpgradeSystem.getSalvageValue(sourceItem);
            if (source.slot === 'upgrade') serviceUpgradeSlot = null;
            else if (source.slot === 'repair') serviceRepairSlot = null;
            else source.list[source.id] = null;
            persistRunEquipment();
            refreshServiceUI();
        });
    }

    function refreshServiceCraftingUI() {
        document.getElementById('service-scrap-counter').textContent = `Scraps: ${scraps}`;

        if (serviceUpgradeSlot) {
            serviceUpgradeDropzone.innerHTML = '';
            serviceUpgradeDropzone.appendChild(createDraggableItem(serviceUpgradeSlot.item, { source: 'service-upgrade', type: 'upgrade', id: 'service-upgrade' }));
            const cost = UpgradeSystem.getUpgradeCost(serviceUpgradeSlot.item);
            btnServiceUpgrade.textContent = cost !== null ? `Upgrade (Cost: ${cost})` : 'Max Level';
            btnServiceUpgrade.disabled = cost === null || scraps < cost;
        } else {
            serviceUpgradeDropzone.innerHTML = 'Drop Item';
            btnServiceUpgrade.textContent = 'Upgrade (Cost: --)';
            btnServiceUpgrade.disabled = true;
        }

        if (serviceRepairSlot) {
            serviceRepairDropzone.innerHTML = '';
            serviceRepairDropzone.appendChild(createDraggableItem(serviceRepairSlot.item, { source: 'service-repair', type: 'repair', id: 'service-repair' }));
            const cost = UpgradeSystem.getRepairCost(serviceRepairSlot.item);
            btnServiceRepair.textContent = cost !== null ? `Repair (Cost: ${cost})` : 'Full Durability';
            btnServiceRepair.disabled = cost === null || scraps < cost;
        } else {
            serviceRepairDropzone.innerHTML = 'Drop Item';
            btnServiceRepair.textContent = 'Repair (Cost: --)';
            btnServiceRepair.disabled = true;
        }
    }

    function refreshServiceUI() {
        if (!activeServiceMode || !engine.player) return;
        serviceInventoryGrid.innerHTML = '';
        for (let i = 0; i < engine.player.inventory.length; i++) {
            const cell = document.createElement('div');
            cell.className = 'inventory-cell';
            setupServiceDropZone(cell, 'inventory', i);
            if (engine.player.inventory[i]) {
                cell.appendChild(createDraggableItem(engine.player.inventory[i], { source: 'service-inventory', type: 'inventory', id: i }));
            }
            serviceInventoryGrid.appendChild(cell);
        }

        document.querySelectorAll('.service-equip-slot').forEach(slot => {
            const slotId = slot.dataset.slot;
            const item = engine.player.equipment[slotId];
            slot.innerHTML = slotId.replace(/[0-9]/g, '').toUpperCase();
            setupServiceDropZone(slot, 'equipment', slotId);
            if (item) {
                slot.innerHTML = '';
                slot.appendChild(createDraggableItem(item, { source: 'service-equipment', type: 'equipment', id: slotId }));
            }
        });

        if (activeServiceMode === 'bank') {
            serviceStashGrid.innerHTML = '';
            while (stashItems.length < 25) stashItems.push(null);
            for (let i = 0; i < stashItems.length; i++) {
                const cell = document.createElement('div');
                cell.className = 'inventory-cell';
                setupServiceDropZone(cell, 'stash', i);
                if (stashItems[i]) {
                    cell.appendChild(createDraggableItem(stashItems[i], { source: 'service-stash', type: 'inventory', id: i }));
                }
                serviceStashGrid.appendChild(cell);
            }
        }

        refreshServiceCraftingUI();
    }

    setupServiceCraftingDropzone(serviceUpgradeDropzone, 'upgrade');
    setupServiceCraftingDropzone(serviceRepairDropzone, 'repair');
    setupServiceSalvageDropzone();

    if (btnServiceUpgrade) {
        btnServiceUpgrade.addEventListener('click', () => {
            if (!serviceUpgradeSlot) return;
            const result = UpgradeSystem.upgradeItem(serviceUpgradeSlot.item, scraps);
            if (!result.success) return;
            scraps = result.remainingScraps;
            persistRunEquipment();
            refreshServiceUI();
            hideTooltip();
        });
    }

    if (btnServiceRepair) {
        btnServiceRepair.addEventListener('click', () => {
            if (!serviceRepairSlot) return;
            const result = UpgradeSystem.repairItem(serviceRepairSlot.item, scraps);
            if (!result.success) return;
            scraps = result.remainingScraps;
            persistRunEquipment();
            refreshServiceUI();
            hideTooltip();
        });
    }

    const playScreen = document.getElementById('play-screen');

    playScreen.addEventListener('dragover', (e) => {
        // Allow dropping anywhere on play-screen that is outside inventory slots
        if (!e.target.closest('.inventory-cell') && !e.target.closest('.equip-slot')) {
            e.preventDefault();
        }
    });

    playScreen.addEventListener('drop', (e) => {
        // Ignore if dropped on an inventory cell or equip slot (handled by those specifically)
        if (e.target.closest('.inventory-cell') || e.target.closest('.equip-slot')) {
            return;
        }
        
        e.preventDefault();
        
        if (!draggedItemSource || !engine.player || draggedItemSource.source !== 'game') return;

        let sourceList = draggedItemSource.type === 'inventory' ? engine.player.inventory : engine.player.equipment;
        let sourceItem = sourceList[draggedItemSource.id];

        if (!sourceItem) return;

        // Remove item from player
        sourceList[draggedItemSource.id] = null;

        // Calculate drop position with random offset
        const offsetX = (Math.random() - 0.5) * 40;
        const offsetY = (Math.random() - 0.5) * 40;
        const dropX = engine.player.x + offsetX;
        const dropY = engine.player.y + offsetY;

        // Spawn item in the world
        engine.droppedItems.push(new DroppedItem(dropX, dropY, sourceItem));
        engine.combatFeedback.addText('Dropped', dropX, dropY, '#aaaaaa', 12, 1.0);

        // Update player stats and UI
        engine.player.recalculateStats();
        updateInventoryUI();
        
        draggedItemSource = null;
    });

    function setupDropZone(element, type, id) {
        element.addEventListener('dragover', (e) => {
            e.preventDefault(); // allow drop
            element.classList.add('drag-over');
        });

        element.addEventListener('dragleave', (e) => {
            element.classList.remove('drag-over');
        });

        element.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            element.classList.remove('drag-over');
            
            if (!draggedItemSource || !engine.player || draggedItemSource.source !== 'game') return;

            // Extract item data
            let sourceList = draggedItemSource.type === 'inventory' ? engine.player.inventory : engine.player.equipment;
            let targetList = type === 'inventory' ? engine.player.inventory : engine.player.equipment;

            let sourceItem = sourceList[draggedItemSource.id];
            let targetItem = targetList[id];

            if (!sourceItem) return;

            // Validate target slot
            if (type === 'equipment') {
                const targetSlotType = id.replace(/[0-9]/g, '');
                if (sourceItem.type !== targetSlotType) {
                    return; // invalid slot type
                }
            }

            // Swap logic
            sourceList[draggedItemSource.id] = targetItem;
            targetList[id] = sourceItem;

            engine.player.recalculateStats();
            updateInventoryUI();
        });
    }

    // Initialize Grid Cells
    for (let i = 0; i < 25; i++) {
        const cell = document.createElement('div');
        cell.className = 'inventory-cell';
        cell.dataset.index = i;
        setupDropZone(cell, 'inventory', i);
        inventoryGrid.appendChild(cell);
    }

    // Setup Equipment Drop Zones
    document.querySelectorAll('.equip-slot').forEach(slot => {
        setupDropZone(slot, 'equipment', slot.dataset.slot);
    });

    function createDraggableItem(item, sourceData) {
        const div = document.createElement('div');
        div.className = 'item-dragger';
        div.draggable = true;
        div.style.backgroundColor = item.color;
        
        let displayName = item.name;
        if (item.maxDurability !== undefined) {
            if (item.durability <= 0) {
                div.classList.add('item-broken');
                displayName += ' (Broken)';
            } else {
                const pct = item.durability / item.maxDurability;
                if (pct <= 0.10) div.classList.add('item-critical-durability');
                else if (pct <= 0.25) div.classList.add('item-low-durability');
            }
        }
        const lootIcon = window.gloomvaultAssets && window.gloomvaultAssets.getLootIcon(item);
        if (lootIcon) {
            div.classList.add('item-dragger-with-icon');
            const icon = document.createElement('img');
            icon.className = 'item-loot-icon';
            icon.src = lootIcon.src;
            icon.alt = '';
            icon.draggable = false;
            const label = document.createElement('span');
            label.className = 'item-label';
            label.textContent = displayName;
            div.appendChild(icon);
            div.appendChild(label);
        } else {
            div.textContent = displayName;
        }
        
        div.addEventListener('dragstart', (e) => {
            draggedItemSource = sourceData;
            e.dataTransfer.setData('text/plain', item.id);
            hideTooltip();
        });

        div.addEventListener('dragend', () => {
            draggedItemSource = null;
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        });

        div.addEventListener('mouseenter', (e) => showTooltip(item, e, sourceData));
        div.addEventListener('mousemove', (e) => showTooltip(item, e, sourceData));
        div.addEventListener('mouseleave', hideTooltip);

        return div;
    }

    function updateInventoryUI() {
        if (!engine.player) return;

        // Update Grid
        const cells = document.querySelectorAll('#inventory-grid .inventory-cell');
        engine.player.inventory.forEach((item, index) => {
            const cell = cells[index];
            cell.innerHTML = '';
            if (item) {
                cell.appendChild(createDraggableItem(item, { source: 'game', type: 'inventory', id: index }));
            }
        });

        // Update Equipment
        document.querySelectorAll('#inventory-screen .equip-slot').forEach(slot => {
            const slotId = slot.dataset.slot;
            const item = engine.player.equipment[slotId];
            slot.innerHTML = slotId.replace(/[0-9]/g, '').toUpperCase(); // default text
            if (item) {
                slot.innerHTML = '';
                slot.appendChild(createDraggableItem(item, { source: 'game', type: 'equipment', id: slotId }));
            }
        });

        // Update Stats Display
        let totalGearScore = 0;
        for (const slot in engine.player.equipment) {
            if (engine.player.equipment[slot] && engine.player.equipment[slot].gearScore) {
                totalGearScore += engine.player.equipment[slot].gearScore;
            }
        }
        const gsEl = document.getElementById('stat-gs');
        if (gsEl) gsEl.textContent = totalGearScore;
        
        document.getElementById('stat-dmg').textContent = 
            (engine.player.weapon1 ? Math.round(engine.player.weapon1.damage) : Math.round(engine.player.stats.flatDamage));
        document.getElementById('stat-spd').textContent = 
            (engine.player.weapon1 ? (1 / engine.player.weapon1.cooldown).toFixed(2) + '/s' : '-');
        document.getElementById('stat-ms').textContent = Math.round(engine.player.speed);
        
        document.getElementById('stat-armor').textContent = Math.round(engine.player.stats.armor || 0);
        document.getElementById('stat-dr').textContent = Math.round((engine.player.stats.damageReduction || 0) * 100) + '%';
        const dodgeCd = engine.player.dodgeCooldown * Math.max(0.2, engine.player.stats.dodgeCooldownMultiplier || 1.0);
        document.getElementById('stat-dodge').textContent = dodgeCd.toFixed(2) + 's';
        document.getElementById('stat-thorns').textContent = Math.round(engine.player.stats.thorns || 0);

        let baseLsCap = typeof CombatConfig !== 'undefined' ? CombatConfig.caps.lifesteal : 0.35;
        let currentLsCap = baseLsCap + (engine.player.stats.lifestealCapBonus || 0);
        let totalLs = engine.player.stats.lifesteal || 0;
        let effectiveLs = Math.min(totalLs, currentLsCap);
        let lsText = `${Math.round(effectiveLs * 100)}%`;
        if (Math.round(totalLs * 100) > Math.round(currentLsCap * 100)) {
            lsText += ` (${Math.round(totalLs * 100)}%)`;
        }
        document.getElementById('stat-ls').textContent = lsText;

        // Force UI update for Health Bar in case max HP changed
        if (typeof engine.updateHealthBarUI === 'function') {
            engine.updateHealthBarUI();
        }
    }

    // Stat Tooltip Logic
    const statTooltip = document.createElement('div');

    // Durability HUD update
    function updateDurabilityHUD() {
        if (!engine.player) return;
        const slots = [
            { id: 'dur-helm', slot: 'helm' },
            { id: 'dur-chest', slot: 'chest' },
            { id: 'dur-pants', slot: 'pants' },
            { id: 'dur-boots', slot: 'boots' },
            { id: 'dur-weapon1', slot: 'weapon' },
            { id: 'dur-weapon2', slot: 'weapon2' }
        ];
        for (const s of slots) {
            const el = document.getElementById(s.id);
            if (!el) continue;
            const item = engine.player.equipment[s.slot];
            if (!item || !item.maxDurability) {
                const weaponClass = s.slot === 'weapon' || s.slot === 'weapon2' ? ' dur-weapon' : '';
                el.className = `dur-icon${weaponClass} dur-state-empty`;
                const fill = el.querySelector('.dur-fill');
                if (fill) {
                    fill.style.width = '0%';
                    fill.style.backgroundColor = '#666';
                }
                continue;
            }
            const pct = item.maxDurability > 0 ? item.durability / item.maxDurability : 0;
            let state = 'good';
            let fillColor = '#2ecc71';
            if (item.durability <= 0) { state = 'broken'; fillColor = '#555'; }
            else if (pct <= 0.10) { state = 'critical'; fillColor = '#e74c3c'; }
            else if (pct <= 0.25) { state = 'low'; fillColor = '#f1c40f'; }
            const weaponClass = s.slot === 'weapon' || s.slot === 'weapon2' ? ' dur-weapon' : '';
            el.className = `dur-icon${weaponClass} dur-state-${state}`;
            const fill = el.querySelector('.dur-fill');
            if (fill) {
                fill.style.width = `${Math.max(0, pct * 100)}%`;
                fill.style.backgroundColor = fillColor;
            }
        }
    }

    // Expose HUD update to engine
    window.gloomvaultApp.updateDurabilityHUD = updateDurabilityHUD;
    statTooltip.className = 'item-tooltip hidden'; // Reuse styling but we'll populate simple text
    statTooltip.style.padding = '8px 12px';
    statTooltip.style.maxWidth = '250px';
    statTooltip.style.textAlign = 'center';
    statTooltip.style.fontSize = '0.9em';
    statTooltip.style.color = '#fff';
    document.body.appendChild(statTooltip);

    function handleStatMouseOver(e) {
        const text = e.currentTarget.getAttribute('data-stat-tip');
        if (!text) return;
        statTooltip.innerHTML = text;
        statTooltip.classList.remove('hidden');
        positionTooltipSafely(statTooltip, e.clientX, e.clientY);
    }
    
    function handleStatMouseMove(e) {
        positionTooltipSafely(statTooltip, e.clientX, e.clientY);
    }

    function handleStatMouseOut(e) {
        statTooltip.classList.add('hidden');
    }

    document.querySelectorAll('[data-stat-tip]').forEach(el => {
        el.style.cursor = 'help'; // Add a hint cursor
        el.addEventListener('mouseenter', handleStatMouseOver);
        el.addEventListener('mousemove', handleStatMouseMove);
        el.addEventListener('mouseleave', handleStatMouseOut);
    });

});
