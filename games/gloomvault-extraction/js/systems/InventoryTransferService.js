class InventoryTransferService {
    getSlotType(slotId) {
        return String(slotId || '').replace(/[0-9]/g, '');
    }

    canEquip(item, slotId) {
        if (!item) return false;
        return item.type === this.getSlotType(slotId);
    }

    swap(sourceList, sourceId, targetList, targetId, options = {}) {
        if (!sourceList || !targetList) return false;
        const sourceItem = sourceList[sourceId];
        const targetItem = targetList[targetId];
        if (!sourceItem) return false;

        if (options.validateEquip && !this.canEquip(sourceItem, targetId)) {
            return false;
        }

        sourceList[sourceId] = targetItem || null;
        targetList[targetId] = sourceItem;
        return true;
    }

    moveItem(sourceList, sourceId, targetList, targetId, options = {}) {
        return this.swap(sourceList, sourceId, targetList, targetId, options);
    }

    findFirstEmpty(list) {
        if (!list) return -1;
        for (let i = 0; i < list.length; i++) {
            if (!list[i]) return i;
        }
        return -1;
    }

    moveToFirstEmpty(sourceList, sourceId, targetList) {
        const emptyIndex = this.findFirstEmpty(targetList);
        if (emptyIndex === -1) return false;
        return this.moveItem(sourceList, sourceId, targetList, emptyIndex);
    }

    salvage(sourceList, sourceId, upgradeSystem = null) {
        if (!sourceList) return { salvaged: false, value: 0, item: null };
        const item = sourceList[sourceId];
        if (!item) return { salvaged: false, value: 0, item: null };

        const value = upgradeSystem && upgradeSystem.getSalvageValue
            ? upgradeSystem.getSalvageValue(item)
            : 0;
        sourceList[sourceId] = null;
        return { salvaged: true, value, item };
    }

    stashAll(sourceList, targetList, limit = sourceList ? sourceList.length : 0) {
        let movedAny = false;
        for (let i = 0; i < limit; i++) {
            if (sourceList[i] && this.moveToFirstEmpty(sourceList, i, targetList)) {
                movedAny = true;
            }
        }
        return movedAny;
    }

    salvageWhere(sourceList, predicate, upgradeSystem = null) {
        let salvagedAny = false;
        let scraps = 0;
        if (!sourceList) return { salvagedAny, scraps };

        for (let i = 0; i < sourceList.length; i++) {
            const item = sourceList[i];
            if (!item || !predicate(item)) continue;
            const result = this.salvage(sourceList, i, upgradeSystem);
            if (result.salvaged) {
                salvagedAny = true;
                scraps += result.value;
            }
        }

        return { salvagedAny, scraps };
    }
}

if (typeof window !== 'undefined') {
    window.InventoryTransferService = InventoryTransferService;
}
