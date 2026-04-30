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

    function loadStashData() {
        try {
            stashItems = JSON.parse(localStorage.getItem('gloomvault_stash')) || [];
            stashEquipment = JSON.parse(localStorage.getItem('gloomvault_equipment')) || {
                helm: null, chest: null, pants: null, boots: null,
                weapon: null, weapon2: null, trinket1: null, trinket2: null
            };
        } catch(e) {
            stashItems = [];
        }
    }

    function saveStashData() {
        localStorage.setItem('gloomvault_stash', JSON.stringify(stashItems));
        localStorage.setItem('gloomvault_equipment', JSON.stringify(stashEquipment));
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
            
            if (!draggedItemSource || (draggedItemSource.source !== 'stash' && draggedItemSource.source !== 'stash-equip')) return;

            let sourceList = draggedItemSource.source === 'stash' ? stashItems : stashEquipment;
            let targetList = type === 'stash' ? stashItems : stashEquipment;

            let sourceItem = sourceList[draggedItemSource.id];
            let targetItem = targetList[id];

            if (!sourceItem) return;

            if (type === 'stash-equip') {
                const targetSlotType = id.replace(/[0-9]/g, '');
                if (sourceItem.type !== targetSlotType) return;
            }

            sourceList[draggedItemSource.id] = targetItem;
            targetList[id] = sourceItem;

            saveStashData();
            updateStashUI();
        });
    }

    // Setup Stash Equipment Zones
    document.querySelectorAll('.stash-slot').forEach(slot => {
        setupStashDropZone(slot, 'stash-equip', slot.dataset.slot);
    });

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
        tooltip.innerHTML = `
            <div class="tooltip-title" style="color: ${item.color}">${item.name}</div>
            <div class="tooltip-stats">
                Type: ${item.type}<br>
                Rarity: ${item.rarity}<br>
                Gear Score: ${item.gearScore}
            </div>
            ${item.modifiers.length > 0 ? `<div class="tooltip-stats" style="margin-top: 5px;">${item.modifiers.map(m => m.text).join('<br>')}</div>` : ''}
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
        div.textContent = item.name.split(' ')[0]; // short name
        
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
        document.querySelectorAll('.equip-slots .equip-slot:not(.stash-slot)').forEach(slot => {
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
            (engine.player.weapon ? Math.round(engine.player.weapon.damage) : Math.round(engine.player.stats.flatDamage));
        document.getElementById('stat-spd').textContent = 
            (engine.player.weapon ? (1 / engine.player.weapon.cooldown).toFixed(2) + '/s' : '-');
        document.getElementById('stat-ms').textContent = Math.round(engine.player.speed);
    }
});