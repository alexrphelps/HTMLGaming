class InventoryCraftingUi {
    static refreshSlot({ slot, dropzone, button, emptyText, actionLabel, unavailableText, getCost, createItem }) {
        if (!dropzone || !button) return;
        if (slot && slot.item) {
            dropzone.innerHTML = '';
            dropzone.appendChild(createItem(slot.item));
            const cost = getCost(slot.item);
            button.textContent = cost !== null ? `${actionLabel} (Cost: ${cost})` : unavailableText;
            button.disabled = cost === null || slot.scraps < cost;
            return;
        }

        dropzone.innerHTML = emptyText;
        button.textContent = `${actionLabel} (Cost: --)`;
        button.disabled = true;
    }
}

if (typeof window !== 'undefined') {
    window.InventoryCraftingUi = InventoryCraftingUi;
}
