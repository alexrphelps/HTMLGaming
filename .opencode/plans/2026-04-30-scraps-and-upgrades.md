# Scraps and Upgrades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a new Scrap currency, an item upgrading system within the stash, and a dedicated extraction exit screen to manage loot and salvage unwanted items, fixing the stash overflow bug.

**Architecture:** 
- A new `js/config/UpgradeConfig.js` will store scrap upgrade costs and logic. 
- A new `js/systems/UpgradeSystem.js` will handle calculating upgrade costs, boosting item stats, and salvaging items for scraps. 
- The `index.html` will be updated with a new `#extraction-screen` and a new upgrade panel inside `#stash-screen`. 
- `js/main.js` and `GameEngine.js` will coordinate the new extraction flow and drag-and-drop logic for upgrading and salvaging.

**Tech Stack:** JavaScript, HTML5, CSS

---

### Task 1: Create Upgrade Configuration and Data Support

**Files:**
- Create: `games/gloomvault-extraction/js/config/UpgradeConfig.js`
- Modify: `games/gloomvault-extraction/js/systems/LootGen.js`

- [ ] **Step 1: Create UpgradeConfig.js**
Create the config file for upgrade costs based on rarity and level.

```javascript
// games/gloomvault-extraction/js/config/UpgradeConfig.js
const UpgradeConfig = {
    maxUpgrades: 5,
    statBoostPerLevel: 0.10, // 10%
    costs: {
        Common: { base: 10, increment: 10 },
        Epic: { base: 50, increment: 20 },
        Legendary: { base: 100, increment: 50 }
    }
};
```

- [ ] **Step 2: Update LootGen.js to include upgradeLevel**
Modify `generateItem` to set `upgradeLevel: 0`.

```javascript
// In games/gloomvault-extraction/js/systems/LootGen.js around line 86
        this.itemIdCounter++;
        return {
            id: `item_${this.itemIdCounter}`,
            name: name,
            type: type.slot,
            rarity: rarity.name,
            color: rarity.color,
            gearScore: gearScore,
            modifiers: modifiers,
            upgradeLevel: 0 // New field
        };
```

- [ ] **Step 3: Update index.html script tags**
Add `<script src="js/config/UpgradeConfig.js"></script>` to `index.html` before `LootGen.js`.

### Task 2: Create UpgradeSystem Logic

**Files:**
- Create: `games/gloomvault-extraction/js/systems/UpgradeSystem.js`

- [ ] **Step 1: Implement UpgradeSystem class**
Create the class to handle cost calculations and stat boosting.

```javascript
// games/gloomvault-extraction/js/systems/UpgradeSystem.js
class UpgradeSystem {
    static getUpgradeCost(item) {
        if (!item || item.upgradeLevel >= UpgradeConfig.maxUpgrades) return null;
        const rarityConfig = UpgradeConfig.costs[item.rarity];
        if (!rarityConfig) return null;
        return rarityConfig.base + (rarityConfig.increment * item.upgradeLevel);
    }

    static getSalvageValue(item) {
        if (!item) return 0;
        const rarityConfig = UpgradeConfig.costs[item.rarity];
        if (!rarityConfig) return 1;
        // Base salvage value is half the base cost + fraction of upgrades
        return Math.max(1, Math.floor(rarityConfig.base / 2) + (item.upgradeLevel * Math.floor(rarityConfig.increment / 2)));
    }

    static upgradeItem(item, availableScraps) {
        const cost = this.getUpgradeCost(item);
        if (cost === null || availableScraps < cost) return { success: false, remainingScraps: availableScraps };

        item.upgradeLevel++;
        const multiplier = 1 + UpgradeConfig.statBoostPerLevel;
        
        // Multiply base values
        item.gearScore = Math.round(item.gearScore * multiplier);
        
        for (let mod of item.modifiers) {
            mod.value = Math.round(mod.value * multiplier);
            mod.text = `+${mod.value}${mod.type === 'percent' ? '%' : ''} ${mod.name}`;
        }

        // Update name to reflect upgrade
        if (!item.name.includes('+')) {
            item.name = `${item.name} +${item.upgradeLevel}`;
        } else {
            item.name = item.name.replace(/\+\d+/, `+${item.upgradeLevel}`);
        }

        return { success: true, remainingScraps: availableScraps - cost };
    }
}
```

- [ ] **Step 2: Update index.html script tags**
Add `<script src="js/systems/UpgradeSystem.js"></script>` to `index.html` after `UpgradeConfig.js`.

### Task 3: Stash Upgrade UI Integration

**Files:**
- Modify: `games/gloomvault-extraction/index.html`
- Modify: `games/gloomvault-extraction/js/main.js`

- [ ] **Step 1: Add HTML elements for Scraps and Upgrades**
In `index.html`, inside `#stash-screen`, add a Scraps counter and an Upgrade panel.

```html
<!-- Inside #stash-screen, under the inventory-content div -->
<div style="margin-top: 20px; display: flex; justify-content: space-between; width: 80%; align-items: center;">
    <div id="scrap-counter" style="font-size: 24px; color: #a0a0a0;">Scraps: 0</div>
    
    <div class="upgrade-panel" style="border: 1px solid var(--color-accent); padding: 10px; display: flex; gap: 10px; align-items: center;">
        <span>Upgrade Item:</span>
        <div class="equip-slot" id="upgrade-dropzone" data-slot="upgrade">Drop Item</div>
        <button id="btn-upgrade-item" class="menu-btn secondary" disabled>Upgrade (Cost: --)</button>
    </div>
</div>
```

- [ ] **Step 2: Update main.js state and load/save logic**
Add `let scraps = 0;` and a reference to the upgrade slot. Update `loadStashData()` and `saveStashData()`.

```javascript
// In js/main.js
let scraps = 0;
let itemInUpgradeSlot = null;

function loadStashData() {
    try {
        stashItems = JSON.parse(localStorage.getItem('gloomvault_stash')) || [];
        stashEquipment = JSON.parse(localStorage.getItem('gloomvault_equipment')) || { /* ... */ };
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
```

- [ ] **Step 3: Handle Upgrade dropzone logic**
Add drag-and-drop support for the upgrade dropzone in `main.js`. Update the button text with the cost.

```javascript
// In js/main.js, after setting up other stash drop zones
const upgradeDropzone = document.getElementById('upgrade-dropzone');
const btnUpgrade = document.getElementById('btn-upgrade-item');

upgradeDropzone.addEventListener('dragover', (e) => { e.preventDefault(); upgradeDropzone.classList.add('drag-over'); });
upgradeDropzone.addEventListener('dragleave', () => upgradeDropzone.classList.remove('drag-over'));
upgradeDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    upgradeDropzone.classList.remove('drag-over');
    
    if (!draggedItemSource || (draggedItemSource.source !== 'stash' && draggedItemSource.source !== 'stash-equip')) return;
    
    let sourceList = draggedItemSource.source === 'stash' ? stashItems : stashEquipment;
    let sourceItem = sourceList[draggedItemSource.id];
    
    if (!sourceItem) return;

    // Move to upgrade slot (removing from source visually/temporarily)
    itemInUpgradeSlot = { item: sourceItem, sourceId: draggedItemSource.id, sourceList: sourceList };
    
    // Clear from source array to avoid duplication
    sourceList[draggedItemSource.id] = null;
    
    updateStashUI(); // Refresh UI
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
```

- [ ] **Step 4: Implement Upgrade button click handler**

```javascript
btnUpgrade.addEventListener('click', () => {
    if (!itemInUpgradeSlot) return;
    const result = UpgradeSystem.upgradeItem(itemInUpgradeSlot.item, scraps);
    if (result.success) {
        scraps = result.remainingScraps;
        saveStashData();
        updateStashUI();
    }
});
```

### Task 4: Extraction Exit Screen & Bug Fix

**Files:**
- Modify: `games/gloomvault-extraction/index.html`
- Modify: `games/gloomvault-extraction/js/core/GameEngine.js`
- Modify: `games/gloomvault-extraction/js/main.js`

- [ ] **Step 1: Add HTML for Extraction Screen**
Create the new screen in `index.html`.

```html
<!-- Inside #game-container -->
<div id="extraction-screen" class="screen">
    <h2>Extraction Successful</h2>
    <div style="display: flex; gap: 20px; width: 90%; justify-content: center;">
        <div class="backpack-panel">
            <h3>Loot (Drag to Stash or Salvage)</h3>
            <div class="inventory-grid" id="extract-loot-grid" style="display: grid; grid-template-columns: repeat(5, 1fr);"></div>
        </div>
        <div class="backpack-panel">
            <h3>Stash</h3>
            <div class="inventory-grid" id="extract-stash-grid" style="overflow-y: auto; max-height: 400px; display: grid; grid-template-columns: repeat(5, 1fr);"></div>
        </div>
    </div>
    
    <div style="margin-top: 20px; display: flex; gap: 20px; align-items: center;">
        <div class="upgrade-panel" style="border: 1px solid var(--color-danger); padding: 10px; display: flex; gap: 10px; align-items: center;">
            <span style="color: var(--color-danger);">Salvage for Scraps:</span>
            <div class="equip-slot" id="salvage-dropzone" data-slot="salvage">Drop Here</div>
        </div>
        <div id="extract-scrap-counter" style="font-size: 24px; color: #a0a0a0;">Scraps: 0</div>
    </div>
    
    <button id="btn-finish-extraction" class="menu-btn" style="margin-top: 20px;">Finish & Return to Menu</button>
</div>
```

- [ ] **Step 2: Modify GameEngine.js extract logic**
Change `extract()` so it doesn't merge inventory into stash directly. This fixes the stash overflow bug.

```javascript
// In js/core/GameEngine.js
    extract() {
        console.log('💎 Extracting!');
        this.stop();

        // Save equipment (keep this)
        if (this.player && this.player.equipment) {
            localStorage.setItem('gloomvault_equipment', JSON.stringify(this.player.equipment));
        }

        // Pass inventory to main.js to handle the extraction screen
        if (window.gloomvaultApp) {
            // Trigger extraction screen setup
            window.gloomvaultApp.setupExtraction(this.player.inventory);
            window.gloomvaultApp.showScreen('extraction-screen');
        }
    }
```

- [ ] **Step 3: Implement extraction screen logic in main.js**
Add `setupExtraction(inventory)` to `window.gloomvaultApp` and handle dragging between loot grid, stash grid, and salvage dropzone.

```javascript
// In js/main.js
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

// Finish button
document.getElementById('btn-finish-extraction').addEventListener('click', () => {
    showScreen('main-menu');
});
```

### Task 5: CSS & Polish

**Files:**
- Modify: `games/gloomvault-extraction/css/style.css`

- [ ] **Step 1: Add styling for new elements**
Add CSS to handle `#extraction-screen`, `salvage-dropzone`, etc.

```css
/* Add to games/gloomvault-extraction/css/style.css */
#extraction-screen .backpack-panel {
    border: 1px solid var(--color-accent);
    padding: 15px;
    background-color: var(--color-bg);
}

.upgrade-panel {
    background-color: var(--color-bg);
    border-radius: 4px;
}
```