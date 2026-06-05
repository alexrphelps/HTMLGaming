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

    updateHealthHud(player) {
        if (!player) return;
        const hud = this.getElements();
        if (hud.healthFill && hud.healthText) {
            const hpPercent = Math.max(0, (player.hp / player.maxHp) * 100);
            this.setStyle('healthWidth', hud.healthFill, 'width', `${hpPercent}%`);
            this.setText('healthText', hud.healthText, `${Math.ceil(player.hp)} / ${Math.ceil(player.maxHp)}`);

            let healthColor = '#2ecc71';
            if (hpPercent < 10) {
                healthColor = '#e74c3c';
            } else if (hpPercent < 35) {
                healthColor = '#e67e22';
            }
            this.setStyle('healthColor', hud.healthFill, 'backgroundColor', healthColor);
        }

        if (hud.shieldContainer && hud.shieldFill && hud.shieldText) {
            if (player.maxShield > 0) {
                this.setStyle('shieldDisplay', hud.shieldContainer, 'display', 'block');
                const shieldPercent = Math.max(0, (player.shield / player.maxShield) * 100);
                this.setStyle('shieldWidth', hud.shieldFill, 'width', `${shieldPercent}%`);
                this.setText('shieldText', hud.shieldText, `${Math.ceil(player.shield)} / ${Math.ceil(player.maxShield)}`);
            } else {
                this.setStyle('shieldDisplay', hud.shieldContainer, 'display', 'none');
            }
        }
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

    updateActionBarHud(player) {
        if (!player) return;
        const hud = this.getElements();
        const weaponSlots = [
            { slotName: 'weapon1', equipmentSlot: 'weapon', fallback: 'ATK' },
            { slotName: 'weapon2', equipmentSlot: 'weapon2', fallback: 'SEC' }
        ];

        for (const slotConfig of weaponSlots) {
            const slot = hud.actionSlots[slotConfig.slotName];
            if (!slot || !slot.icon || !slot.cooldownOverlay) continue;
            const item = player.equipment[slotConfig.equipmentSlot];
            const weapon = slotConfig.slotName === 'weapon1' ? player.weapon1 : player.weapon2;
            if (item) {
                this.setItemIcon(
                    slotConfig.slotName,
                    slot.icon,
                    item,
                    item.name.split(' ')[0].substring(0, 3),
                    item.element && typeof Weapon !== 'undefined' ? Weapon.getElementColor(item.element) : item.color
                );
            } else {
                this.setItemIcon(slotConfig.slotName, slot.icon, null, slotConfig.fallback, '#555');
            }

            const cdPercent = weapon ? (weapon.cooldownTimer / weapon.cooldown) * 100 : 0;
            this.setStyle(`${slotConfig.slotName}Cooldown`, slot.cooldownOverlay, 'height', `${Math.max(0, Math.min(100, cdPercent))}%`);
        }

        const cdr = Math.min(0.75, player.stats.cooldownReduction || 0);
        for (let i = 1; i <= 2; i++) {
            const slotName = `trinket${i}`;
            const slot = hud.actionSlots[slotName];
            if (!slot || !slot.icon || !slot.cooldownOverlay) continue;

            const item = player.equipment[slotName];
            if (item && item.activeAbility) {
                this.setItemIcon(slotName, slot.icon, item, item.name.split(' ')[0].substring(0, 3), item.color);

                const maxCd = item.activeAbility.cooldown * (1 - cdr);
                const currentCd = player.abilityCooldowns[slotName];
                const cdPercent = maxCd > 0 ? (currentCd / maxCd) * 100 : 0;

                this.setStyle(`${slotName}Cooldown`, slot.cooldownOverlay, 'height', `${Math.max(0, Math.min(100, cdPercent))}%`);
            } else {
                this.setItemIcon(slotName, slot.icon, null, '', 'transparent');
                this.setStyle(`${slotName}Cooldown`, slot.cooldownOverlay, 'height', '0%');
            }
        }
    }

    updatePassiveBuffHud(player) {
        if (!player) return;
        const hud = this.getElements();
        const passive = hud.passiveBuffs || {};
        if (!passive.healingWell) return;

        const stacks = player.getHealingWellStackCount ? player.getHealingWellStackCount() : 0;
        if (stacks <= 0) {
            this.setHidden('healingWellBuffHidden', passive.healingWell, true);
            if (passive.container) this.setHidden('passiveBuffContainerHidden', passive.container, true);
            return;
        }

        if (passive.container) this.setHidden('passiveBuffContainerHidden', passive.container, false);
        this.setHidden('healingWellBuffHidden', passive.healingWell, false);

        const remaining = player.getHealingWellRemainingTime ? player.getHealingWellRemainingTime() : 0;
        if (passive.stack) this.setText('healingWellBuffStack', passive.stack, stacks > 1 ? `x${stacks}` : '');
        if (passive.time) this.setText('healingWellBuffTime', passive.time, `${Math.ceil(remaining)}s`);
        if (passive.icon) {
            const assets = this.getAssets();
            const image = assets && assets.getImage ? assets.getImage('sprites.service.healingWell.1') : null;
            const imageValue = image && image.src ? `url("${image.src}")` : 'none';
            this.setStyle('healingWellBuffImage', passive.icon, 'backgroundImage', imageValue);
            this.setStyle('healingWellBuffImageSize', passive.icon, 'backgroundSize', image ? '100% 100%' : 'auto');
            this.setText('healingWellBuffIconText', passive.icon, image ? '' : 'WEL');
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
