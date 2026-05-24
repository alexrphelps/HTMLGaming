class HudAdapter {
    constructor(options = {}) {
        this.controller = options.controller || (typeof HudController !== 'undefined' ? new HudController(options) : null);
    }

    getElements() {
        return this.controller && this.controller.getElements ? this.controller.getElements() : {};
    }

    ensureBossRows(count) {
        return this.controller && this.controller.ensureBossRows ? this.controller.ensureBossRows(count) : [];
    }

    setText(key, element, value) {
        if (this.controller && this.controller.setText) this.controller.setText(key, element, value);
    }

    setStyle(key, element, property, value) {
        if (this.controller && this.controller.setStyle) this.controller.setStyle(key, element, property, value);
    }

    setHidden(key, element, hidden) {
        if (this.controller && this.controller.setHidden) this.controller.setHidden(key, element, hidden);
    }

    setItemIcon(slotKey, element, item, fallbackText, fallbackColor) {
        if (this.controller && this.controller.setItemIcon) {
            this.controller.setItemIcon(slotKey, element, item, fallbackText, fallbackColor);
        }
    }

    showInteractionHint(text) {
        if (this.controller && this.controller.showInteractionHint) this.controller.showInteractionHint(text);
    }

    hideInteractionHint() {
        if (this.controller && this.controller.hideInteractionHint) this.controller.hideInteractionHint();
    }

    updateBosses(encounters) {
        if (this.controller && this.controller.updateBossHud) this.controller.updateBossHud(encounters);
    }

    updateDurability(player) {
        if (this.controller && this.controller.updateDurabilityHud) this.controller.updateDurabilityHud(player);
    }

    destroy() {
        if (!this.controller) return;
        this.controller._elements = null;
        this.controller._state = {};
    }
}

if (typeof window !== 'undefined') {
    window.HudAdapter = HudAdapter;
}
