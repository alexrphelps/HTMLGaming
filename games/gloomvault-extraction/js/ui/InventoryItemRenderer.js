class InventoryItemRenderer {
    static decorateItemElement(element, item) {
        element.style.backgroundColor = item.color;

        let displayName = item.name;
        if (item.maxDurability !== undefined) {
            if (item.durability <= 0) {
                element.classList.add('item-broken');
                displayName += ' (Broken)';
            } else {
                const pct = item.durability / item.maxDurability;
                if (pct <= 0.10) element.classList.add('item-critical-durability');
                else if (pct <= 0.25) element.classList.add('item-low-durability');
            }
        }

        const lootIcon = typeof window !== 'undefined' && window.gloomvaultAssets && window.gloomvaultAssets.getLootIcon(item);
        if (lootIcon) {
            element.classList.add('item-dragger-with-icon');
            const icon = document.createElement('img');
            icon.className = 'item-loot-icon';
            icon.src = lootIcon.src;
            icon.alt = '';
            icon.draggable = false;
            const label = document.createElement('span');
            label.className = 'item-label';
            label.textContent = displayName;
            element.appendChild(icon);
            element.appendChild(label);
        } else {
            element.textContent = displayName;
        }

        return element;
    }
}

if (typeof window !== 'undefined') {
    window.InventoryItemRenderer = InventoryItemRenderer;
}
