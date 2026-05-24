class HudController {
    constructor(options = {}) {
        this.document = options.document || (typeof document !== 'undefined' ? document : null);
        this.getAssets = options.getAssets || (() => (typeof window !== 'undefined' ? window.gloomvaultAssets : null));
        this._elements = null;
        this._state = {};
    }

    getElements() {
        if (!this.document) return {};
        if (this._elements) return this._elements;

        const actionSlots = {};
        ['weapon1', 'weapon2', 'trinket1', 'trinket2'].forEach(slotName => {
            const slot = this.document.getElementById(`slot-${slotName}`);
            actionSlots[slotName] = {
                slot,
                icon: slot ? slot.querySelector('.action-icon') : null,
                cooldownOverlay: slot ? slot.querySelector('.cooldown-overlay') : null
            };
        });

        const passiveBuffContainer = this.document.getElementById('passive-buff-container');
        const healingWellBuff = this.document.getElementById('passive-buff-healing-well');

        this._elements = {
            healthFill: this.document.getElementById('player-health-bar-fill'),
            healthText: this.document.getElementById('player-health-bar-text'),
            shieldContainer: this.document.getElementById('player-shield-bar-container'),
            shieldFill: this.document.getElementById('player-shield-bar-fill'),
            shieldText: this.document.getElementById('player-shield-bar-text'),
            bossContainer: this.document.getElementById('boss-health-bar-container'),
            bossRows: this.document.getElementById('boss-health-bar-rows'),
            bossFill: this.document.getElementById('boss-health-bar-fill'),
            bossText: this.document.getElementById('boss-health-bar-text'),
            minimapInfo: this.document.getElementById('minimap-info'),
            minimapHud: this.document.getElementById('minimap-hud'),
            minimapFloorLabel: this.document.getElementById('minimap-floor-label'),
            minimapMapLabel: this.document.getElementById('minimap-map-label'),
            interactionHint: this.document.getElementById('interaction-hint'),
            passiveBuffs: {
                container: passiveBuffContainer,
                healingWell: healingWellBuff,
                icon: healingWellBuff && healingWellBuff.querySelector ? healingWellBuff.querySelector('.passive-buff-icon') : null,
                stack: healingWellBuff && healingWellBuff.querySelector ? healingWellBuff.querySelector('.passive-buff-stack') : null,
                time: healingWellBuff && healingWellBuff.querySelector ? healingWellBuff.querySelector('.passive-buff-time') : null
            },
            actionSlots
        };
        return this._elements;
    }

    ensureBossRows(count) {
        const hud = this.getElements();
        const rowHost = hud.bossRows || hud.bossContainer;
        if (!rowHost || !rowHost.children || !this.document || !this.document.createElement) return [];

        while (rowHost.children.length < count) {
            const row = this.document.createElement('div');
            row.className = 'boss-health-bar-row';

            const fill = this.document.createElement('div');
            fill.className = 'boss-health-bar-fill';

            const text = this.document.createElement('div');
            text.className = 'boss-health-bar-text';

            row.appendChild(fill);
            row.appendChild(text);
            rowHost.appendChild(row);
        }

        return Array.from(rowHost.children);
    }

    setText(key, element, value) {
        if (!element) return;
        const nextValue = String(value);
        if (this._state[key] === nextValue) return;
        element.textContent = nextValue;
        this._state[key] = nextValue;
    }

    setStyle(key, element, property, value) {
        if (!element) return;
        const nextValue = String(value);
        if (this._state[key] === nextValue) return;
        element.style[property] = nextValue;
        this._state[key] = nextValue;
    }

    setHidden(key, element, hidden) {
        if (!element || !element.classList) return;
        const nextValue = Boolean(hidden);
        if (this._state[key] === nextValue) return;
        if (element.classList.toggle) {
            element.classList.toggle('hidden', nextValue);
        } else if (nextValue) {
            element.classList.add('hidden');
        } else {
            element.classList.remove('hidden');
        }
        this._state[key] = nextValue;
    }

    setItemIcon(slotKey, element, item, fallbackText, fallbackColor) {
        if (!element) return;
        const assets = this.getAssets();
        const icon = assets && assets.getLootIcon ? assets.getLootIcon(item) : null;
        const imageValue = icon && icon.src ? `url("${icon.src}")` : 'none';

        this.setStyle(`${slotKey}Image`, element, 'backgroundImage', imageValue);
        this.setStyle(`${slotKey}ImageSize`, element, 'backgroundSize', icon ? '100% 100%' : 'auto');
        this.setStyle(`${slotKey}ImageRepeat`, element, 'backgroundRepeat', 'no-repeat');
        this.setStyle(`${slotKey}ImagePosition`, element, 'backgroundPosition', 'center');

        if (icon) {
            this.setStyle(`${slotKey}Color`, element, 'backgroundColor', 'transparent');
            this.setText(`${slotKey}Text`, element, fallbackText);
            return;
        }

        this.setStyle(`${slotKey}Color`, element, 'backgroundColor', fallbackColor);
        this.setText(`${slotKey}Text`, element, fallbackText);
    }

    showInteractionHint(text) {
        const hint = this.getElements().interactionHint;
        if (!hint) return;
        this.setText('interactionHintText', hint, text);
        this.setHidden('interactionHintHidden', hint, false);
    }

    hideInteractionHint() {
        this.setHidden('interactionHintHidden', this.getElements().interactionHint, true);
    }

    updateBossHud(encounters) {
        const hud = this.getElements();
        if (!hud.bossContainer || !hud.bossFill || !hud.bossText) return;

        if (!encounters || encounters.length === 0) {
            this.setHidden('bossHealthHidden', hud.bossContainer, true);
            return;
        }

        this.setHidden('bossHealthHidden', hud.bossContainer, false);
        const rows = this.ensureBossRows(encounters.length);
        const rowSlots = rows.length > 0 ? rows : new Array(encounters.length).fill(null);
        for (let i = 0; i < rowSlots.length; i++) {
            const row = rowSlots[i];
            const fill = i === 0 ? hud.bossFill : (row && row.querySelector ? row.querySelector('.boss-health-bar-fill') : null);
            const text = i === 0 ? hud.bossText : (row && row.querySelector ? row.querySelector('.boss-health-bar-text') : null);
            const encounter = encounters[i];

            if (!encounter) {
                if (row && row.classList) row.classList.add('hidden');
                continue;
            }

            if (row && row.classList) {
                row.classList.remove('hidden');
                if (encounter.bossTier === 'floorGuardian') {
                    row.classList.add('guardian');
                } else {
                    row.classList.remove('guardian');
                }
            }

            const hpPercent = Math.max(0, (encounter.hp / encounter.maxHp) * 100);
            if (fill) fill.style.width = `${hpPercent}%`;
            if (text) {
                text.textContent = encounter.getBossHudText
                    ? encounter.getBossHudText()
                    : `${encounter.displayName || (encounter.isBoss ? 'Vault Warden' : 'Boss')} ${Math.ceil(encounter.hp)} / ${Math.ceil(encounter.maxHp)}`;
            }
        }
    }

    updateDurabilityHud(player) {
        if (!player || !player.equipment || !this.document) return;
        const slots = [
            { id: 'dur-helm', slot: 'helm' },
            { id: 'dur-chest', slot: 'chest' },
            { id: 'dur-pants', slot: 'pants' },
            { id: 'dur-boots', slot: 'boots' },
            { id: 'dur-weapon1', slot: 'weapon' },
            { id: 'dur-weapon2', slot: 'weapon2' }
        ];

        for (const slotInfo of slots) {
            const element = this.document.getElementById(slotInfo.id);
            if (!element) continue;
            const item = player.equipment[slotInfo.slot];
            const weaponClass = slotInfo.slot === 'weapon' || slotInfo.slot === 'weapon2' ? ' dur-weapon' : '';

            if (!item || item.durability === undefined || item.maxDurability === undefined) {
                element.className = `dur-icon${weaponClass} dur-state-empty`;
                const fill = element.querySelector('.dur-fill');
                if (fill) {
                    fill.style.width = '0%';
                    fill.style.backgroundColor = '#666';
                }
                continue;
            }

            const pct = item.maxDurability > 0 ? item.durability / item.maxDurability : 0;
            let state = 'good';
            let fillColor = '#2ecc71';
            if (item.durability <= 0) {
                state = 'broken';
                fillColor = '#555';
            } else if (pct <= 0.10) {
                state = 'critical';
                fillColor = '#e74c3c';
            } else if (pct <= 0.25) {
                state = 'low';
                fillColor = '#f1c40f';
            }

            element.className = `dur-icon${weaponClass} dur-state-${state}`;
            const fill = element.querySelector('.dur-fill');
            if (fill) {
                fill.style.width = `${Math.max(0, pct * 100)}%`;
                fill.style.backgroundColor = fillColor;
            }
        }
    }
}

if (typeof window !== 'undefined') {
    window.HudController = HudController;
}
