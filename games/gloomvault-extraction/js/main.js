document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 Gloomvault Extraction - main.js loaded');

    // Initialize the engine
    const engine = new GameEngine('game-canvas');
    
    // Make engine accessible globally for UI updates
    window.gloomvaultApp = {
        engine: engine,
        updateInventoryUI: updateInventoryUI,
        showScreen: showScreen
    };
    
    // Screen management
    const screens = document.querySelectorAll('.screen');
    
    // Asset Loading
    window.gameAssets = {
        player: new Image(),
        enemy: new Image()
    };
    
    // Attempt to load sprites (will fail gracefully to rectangles)
    window.gameAssets.player.src = 'assets/sprites/player.png';
    window.gameAssets.enemy.src = 'assets/sprites/enemy.png';

    function showScreen(id) {
        screens.forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');

        // Logic hook
        if (id === 'play-screen') {
            engine.start();
        } else if (id === 'main-menu') {
            engine.stop();
        }
    }

    // Event Listeners
    document.getElementById('btn-start').addEventListener('click', () => showScreen('play-screen'));
    document.getElementById('btn-stash').addEventListener('click', () => {
        showScreen('stash-screen');
        updateStashUI();
    });
    document.getElementById('btn-stash-back').addEventListener('click', () => showScreen('main-menu'));
    document.getElementById('btn-game-over-menu').addEventListener('click', () => showScreen('main-menu'));

    // --- Stash UI Logic ---
    const stashGrid = document.getElementById('stash-grid');
    let stashItems = [];
    let stashEquipment = {
        helm: null, chest: null, pants: null, boots: null,
        weapon: null, weapon2: null, trinket1: null, trinket2: null
    };
    let scraps = 0;
    let itemInUpgradeSlot = null;

    
    function ensureStarterEquipment(eq) {
        if (!eq.weapon) {
            eq.weapon = { id: 'starter_wep1', name: 'Rusty Glock', type: 'weapon', weaponType: 'pistol', rarity: 'Common', color: '#a0a0a0', gearScore: 5, modifiers: [], upgradeLevel: 0, isStarter: true };
        }
        if (!eq.weapon2) {
            eq.weapon2 = { id: 'starter_wep2', name: 'Sawed-off Shotgun', type: 'weapon', weaponType: 'shotgun', rarity: 'Common', color: '#a0a0a0', gearScore: 5, modifiers: [], upgradeLevel: 0, isStarter: true };
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
            element.classList.remove('drag-over');
            
            if (!draggedItemSource || !['stash', 'stash-equip', 'upgrade'].includes(draggedItemSource.source)) return;

            let sourceList = null;
            let sourceItem = null;
            
            if (draggedItemSource.source === 'upgrade') {
                sourceItem = itemInUpgradeSlot.item;
                itemInUpgradeSlot = null; // Remove from upgrade slot
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

            if (!draggedItemSource || !['stash', 'stash-equip', 'upgrade'].includes(draggedItemSource.source)) return;

            let sourceList = null;
            let sourceItem = null;

            if (draggedItemSource.source === 'upgrade') {
                sourceItem = itemInUpgradeSlot.item;
                itemInUpgradeSlot = null; // Remove from upgrade slot
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
        
        itemInUpgradeSlot = { item: sourceItem, sourceId: draggedItemSource.id, sourceList: sourceList };
        
        // Clear from source array to avoid duplication, and swap the previous item
        sourceList[draggedItemSource.id] = previousUpgradeItem;
        
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
        }
    });

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
                cell.appendChild(createDraggableItem(currentLoot[i], { source: 'extract-loot', id: i }));
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
                cell.appendChild(createDraggableItem(stashItems[i], { source: 'extract-stash', id: i }));
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

    // Finish button
    const btnFinishExtraction = document.getElementById('btn-finish-extraction');
    if(btnFinishExtraction) {
        btnFinishExtraction.addEventListener('click', () => {
            showScreen('main-menu');
        });
    }

    // --- Inventory Overlay Logic ---
    const inventoryScreen = document.getElementById('inventory-screen');
    const btnCloseInventory = document.getElementById('btn-close-inventory');
    const inventoryGrid = document.getElementById('inventory-grid');
    
    // Tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'item-tooltip hidden';
    document.body.appendChild(tooltip);

    function showTooltip(item, e) {
        if (!item) return;
        
        let implicits = item.modifiers ? item.modifiers.filter(m => m.isImplicit) : [];
        let explicits = item.modifiers ? item.modifiers.filter(m => !m.isImplicit && !m.isTrait) : [];
        
        tooltip.innerHTML = `
            <div class="tooltip-title" style="color: ${item.color}">${item.name}</div>
            <div class="tooltip-stats">
                Type: ${item.type}<br>
                Rarity: ${item.rarity}<br>
                Gear Score: ${item.gearScore}
            </div>
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
        `;
        tooltip.style.left = `${e.clientX + 15}px`;
        tooltip.style.top = `${e.clientY + 15}px`;
        tooltip.classList.remove('hidden');
    }

    function hideTooltip() {
        tooltip.classList.add('hidden');
    }

    // Toggle Inventory
    document.addEventListener('keydown', (e) => {
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
            engine.isRunning = false; // Pause game
            updateInventoryUI();
        } else {
            // Close Inventory
            inventoryScreen.classList.add('hidden');
            hideTooltip();
            engine.isRunning = true; // Resume game
            engine.lastTime = performance.now(); // reset time to avoid huge jump
            requestAnimationFrame((time) => engine.loop(time));
        }
    }

    let draggedItemSource = null;

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
        div.textContent = item.name;
        
        div.addEventListener('dragstart', (e) => {
            draggedItemSource = sourceData;
            e.dataTransfer.setData('text/plain', item.id);
            hideTooltip();
        });

        div.addEventListener('dragend', () => {
            draggedItemSource = null;
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        });

        div.addEventListener('mouseenter', (e) => showTooltip(item, e));
        div.addEventListener('mousemove', (e) => showTooltip(item, e));
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
    }
});