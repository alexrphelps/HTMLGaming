/**
 * DevPanel - In-game developer/debug panel for Gloomvault Extraction.
 * Provides spawn controls, god mode, config overrides, and floor jumping.
 * All overrides reset to defaults when the panel is hidden.
 */
class DevPanel {
    constructor(engine) {
        this.engine = engine;
        this.visible = false;
        this.panel = null;
        this._boundKeyHandler = this._onKeyDown.bind(this);
        window.addEventListener('keydown', this._boundKeyHandler);
        this._buildPanel();
    }

    _onKeyDown(e) {
        if (e.code === 'Backquote') {
            e.preventDefault();
            this.toggle();
        }
    }

    toggle() {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
    }

    show() {
        this.visible = true;
        this.panel.classList.remove('dev-hidden');
        this._syncUIToConfig();
    }

    hide() {
        this.visible = false;
        this.panel.classList.add('dev-hidden');
        // Reset all overrides when panel is closed
        DevConfig.resetAll();
        if (this.engine) {
            this.engine.applyDevCameraZoom();
        }
        // Re-apply base player speed
        if (this.engine && this.engine.player) {
            this.engine.player.speed = this.engine.player.stats.speed * this.engine.player.stats.movementSpeedMultiplier;
        }
    }

    _syncUIToConfig() {
        const ids = {
            'dev-god-mode': DevConfig.godMode,
            'dev-drop-rate': DevConfig.dropRate * 100,
            'dev-player-speed': DevConfig.playerSpeedMultiplier,
            'dev-no-clip': DevConfig.noClip,
            'dev-camera-zoom': DevConfig.cameraZoom
        };
        for (const [id, val] of Object.entries(ids)) {
            const el = document.getElementById(id);
            if (!el) continue;
            if (el.type === 'checkbox') {
                el.checked = val;
            } else if (el.type === 'range') {
                el.value = val;
                const label = el.parentElement.querySelector('.dev-slider-val');
                if (label) label.textContent = parseFloat(val).toFixed(1) + (id === 'dev-drop-rate' ? '%' : 'x');
            }
        }

        const mapSelect = document.getElementById('dev-map-select');
        if (mapSelect && this.engine) {
            mapSelect.value = this.engine.runMapSelection || 'random';
        }
    }

    _buildPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'dev-panel';
        this.panel.className = 'dev-hidden';
        this.panel.innerHTML = `
            <div class="dev-header">
                <span>DEV MODE</span>
                <button id="dev-close-btn" title="Close">&times;</button>
            </div>
            <div class="dev-body">
                <!-- Spawn Section -->
                <div class="dev-section">
                    <div class="dev-section-title">Spawn Items</div>
                    <div class="dev-row">
                        <button class="dev-btn" id="dev-spawn-random-loot">Random Loot</button>
                        <button class="dev-btn dev-gold" id="dev-spawn-chest">Loot Chest</button>
                    </div>
                    <div class="dev-loot-builder">
                        <div class="dev-subsection-title">Gear</div>
                        <div class="dev-row">
                            <select id="dev-gear-prefix" class="dev-select dev-select-small">${this._buildAffixOptions('Prefix')}</select>
                            <select id="dev-gear-base" class="dev-select dev-select-small">
                                <option value="helm">Helm</option>
                                <option value="chest">Chest</option>
                                <option value="pants">Pants</option>
                                <option value="boots">Boots</option>
                            </select>
                            <select id="dev-gear-suffix" class="dev-select dev-select-small">${this._buildAffixOptions('Suffix')}</select>
                            <select id="dev-gear-rarity" class="dev-select dev-select-small">${this._buildRarityOptions()}</select>
                            <button class="dev-btn" id="dev-spawn-gear-loot">Spawn</button>
                        </div>
                        <div class="dev-subsection-title">Weapon</div>
                        <div class="dev-row">
                            <select id="dev-weapon-prefix" class="dev-select dev-select-small">${this._buildAffixOptions('Prefix')}</select>
                            <select id="dev-weapon-base" class="dev-select dev-select-small">
                                <option value="pistol:Wand">Wand</option>
                                <option value="shotgun:Staff">Staff</option>
                                <option value="assault_rifle:Crossbow">Crossbow</option>
                                <option value="sniper:Longbow">Longbow</option>
                                <option value="melee_stab:Shortsword">Shortsword</option>
                                <option value="melee_stab:Lance">Lance</option>
                                <option value="melee_cleave:Greataxe">Greataxe</option>
                                <option value="melee_cleave:Scythe">Scythe</option>
                            </select>
                            <select id="dev-weapon-element" class="dev-select dev-select-small">${this._buildElementOptions()}</select>
                            <select id="dev-weapon-suffix" class="dev-select dev-select-small">${this._buildAffixOptions('Suffix')}</select>
                            <select id="dev-weapon-rarity" class="dev-select dev-select-small">${this._buildRarityOptions()}</select>
                            <button class="dev-btn" id="dev-spawn-weapon-loot">Spawn</button>
                        </div>
                        <div class="dev-subsection-title">Trinket</div>
                        <div class="dev-row">
                            <select id="dev-trinket-prefix" class="dev-select dev-select-small">${this._buildAffixOptions('Prefix')}</select>
                            <select id="dev-trinket-base" class="dev-select dev-select-small">
                                <option value="heal">Healing Charm</option>
                                <option value="nova">Arcane Nova Sigil</option>
                                <option value="dash">Phase Shift Talisman</option>
                                <option value="hot">Regeneration Relic</option>
                                <option value="scout">Scout Charm</option>
                                <option value="phase_tether">Phase Tether</option>
                                <option value="element_bomb:poison">Poison Bomb</option>
                                <option value="element_bomb:fire">Fire Bomb</option>
                                <option value="element_bomb:felfire">Felfire Bomb</option>
                                <option value="lightning_strike">Lightning Strike</option>
                                <option value="target_dummy">Target Dummy</option>
                                <option value="soul_siphon">Soul Siphon</option>
                            </select>
                            <select id="dev-trinket-suffix" class="dev-select dev-select-small">${this._buildAffixOptions('Suffix')}</select>
                            <select id="dev-trinket-rarity" class="dev-select dev-select-small">${this._buildRarityOptions()}</select>
                            <button class="dev-btn" id="dev-spawn-trinket-loot">Spawn</button>
                        </div>
                    </div>
                </div>
                <div class="dev-section">
                    <div class="dev-section-title">Spawn Enemies</div>
                    <div class="dev-row">
                        <select id="dev-enemy-type" class="dev-select">
                            <option value="grunt">Grunt</option>
                            <option value="ranged">Ranged</option>
                            <option value="brute">Brute</option>
                            <option value="boss">Boss</option>
                        </select>
                        <label class="dev-label"><input type="checkbox" id="dev-elite-toggle"> Elite</label>
                        <button class="dev-btn" id="dev-spawn-enemy">Spawn</button>
                    </div>
                    <div id="dev-boss-spawn-options" class="dev-boss-spawn-options dev-hidden">
                        <div class="dev-subsection-title">Boss Spawn Builder</div>
                        <div class="dev-row">
                            <select id="dev-boss-profile" class="dev-select">
                                ${this._buildBossProfileOptions()}
                            </select>
                        </div>
                        <div class="dev-row">
                            <select id="dev-boss-modifier" class="dev-select dev-select-small">
                                ${this._buildBossModifierOptions()}
                            </select>
                            <select id="dev-boss-power" class="dev-select dev-select-small">
                                ${this._buildBossPowerOptions()}
                            </select>
                        </div>
                    </div>
                </div>
                <div class="dev-section">
                    <div class="dev-section-title">Spawn Transitions</div>
                    <div class="dev-row">
                        <button class="dev-btn" id="dev-spawn-door">Door</button>
                        <button class="dev-btn" id="dev-spawn-hole">Hole</button>
                        <button class="dev-btn" id="dev-spawn-portal">Extraction Portal</button>
                    </div>
                    <div class="dev-row">
                        <button class="dev-btn" id="dev-spawn-blacksmith">Blacksmith</button>
                        <button class="dev-btn" id="dev-spawn-bank">Void Bank</button>
                        <button class="dev-btn dev-heal" id="dev-spawn-healing-well">Healing Well</button>
                    </div>
                </div>

                <!-- Player Section -->
                <div class="dev-section">
                    <div class="dev-section-title">Player</div>
                    <div class="dev-row">
                        <label class="dev-label"><input type="checkbox" id="dev-god-mode"> God Mode</label>
                        <label class="dev-label"><input type="checkbox" id="dev-no-clip"> No Clip</label>
                        <button class="dev-btn dev-heal" id="dev-heal-full">Heal to Full</button>
                    </div>
                </div>

                <!-- Config Overrides -->
                <div class="dev-section">
                    <div class="dev-section-title">Config Overrides (Session)</div>
                    <div class="dev-slider-row">
                        <span class="dev-slider-label">Drop Rate</span>
                        <input type="range" id="dev-drop-rate" min="1" max="100" step="1" value="20">
                        <span class="dev-slider-val">20.0%</span>
                    </div>
                    <div class="dev-slider-row">
                        <span class="dev-slider-label">Player Speed</span>
                        <input type="range" id="dev-player-speed" min="0.5" max="3" step="0.1" value="1.0">
                        <span class="dev-slider-val">1.0x</span>
                    </div>
                    <div class="dev-slider-row">
                        <span class="dev-slider-label">Camera Zoom Out</span>
                        <input type="range" id="dev-camera-zoom" min="1" max="10" step="0.1" value="1.0">
                        <span class="dev-slider-val">1.0x</span>
                    </div>
                </div>

                <!-- Floor Jump -->
                <div class="dev-section">
                    <div class="dev-section-title">Floor Jump</div>
                    <div class="dev-row">
                        <input type="number" id="dev-floor-input" class="dev-input" min="1" max="100" value="1" placeholder="Floor #">
                        <select id="dev-map-select" class="dev-select"></select>
                        <button class="dev-btn" id="dev-jump-floor">Go</button>
                    </div>
                </div>
            </div>
        `;

        // Inject styles
        const style = document.createElement('style');
        style.textContent = `
            #dev-panel {
                position: fixed;
                top: 10px;
                right: 10px;
                width: 320px;
                max-height: 90vh;
                overflow-y: auto;
                background: rgba(10, 10, 15, 0.95);
                border: 2px solid #ff8000;
                border-radius: 8px;
                z-index: 9999;
                font-family: 'Courier New', monospace;
                font-size: 13px;
                color: #ddd;
                box-shadow: 0 0 20px rgba(255, 128, 0, 0.3);
            }
            #dev-panel.dev-hidden { display: none; }
            .dev-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                background: rgba(255, 128, 0, 0.15);
                border-bottom: 1px solid #ff8000;
                font-weight: bold;
                color: #ff8000;
                font-size: 14px;
                letter-spacing: 2px;
            }
            #dev-close-btn {
                background: none;
                border: none;
                color: #ff8000;
                font-size: 20px;
                cursor: pointer;
                padding: 0 4px;
                line-height: 1;
            }
            #dev-close-btn:hover { color: #fff; }
            .dev-body { padding: 8px 12px; }
            .dev-section {
                margin-bottom: 10px;
                padding-bottom: 8px;
                border-bottom: 1px solid #333;
            }
            .dev-section:last-child { border-bottom: none; }
            .dev-section-title {
                color: #ff8000;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 6px;
            }
            .dev-subsection-title {
                color: #aaa;
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin: 8px 0 4px;
            }
            .dev-loot-builder {
                padding-top: 2px;
            }
            .dev-boss-spawn-options.dev-hidden {
                display: none;
            }
            .dev-row {
                display: flex;
                gap: 6px;
                align-items: center;
                margin-bottom: 4px;
                flex-wrap: wrap;
            }
            .dev-btn {
                background: #222;
                border: 1px solid #555;
                color: #ccc;
                padding: 4px 10px;
                border-radius: 4px;
                cursor: pointer;
                font-family: inherit;
                font-size: 12px;
                transition: background 0.15s;
            }
            .dev-btn:hover { background: #444; color: #fff; border-color: #888; }
            .dev-btn.dev-uncommon { border-color: #1eff00; color: #1eff00; }
            .dev-btn.dev-uncommon:hover { background: rgba(30, 255, 0, 0.2); }
            .dev-btn.dev-epic { border-color: #a335ee; color: #a335ee; }
            .dev-btn.dev-epic:hover { background: rgba(163, 53, 238, 0.2); }
            .dev-btn.dev-legendary { border-color: #ff8000; color: #ff8000; }
            .dev-btn.dev-legendary:hover { background: rgba(255, 128, 0, 0.2); }
            .dev-btn.dev-gold { border-color: #ffd700; color: #ffd700; }
            .dev-btn.dev-gold:hover { background: rgba(255, 215, 0, 0.2); }
            .dev-btn.dev-heal { border-color: #2ecc71; color: #2ecc71; }
            .dev-btn.dev-heal:hover { background: rgba(46, 204, 113, 0.2); }
            .dev-select {
                background: #222;
                border: 1px solid #555;
                color: #ccc;
                padding: 4px 8px;
                border-radius: 4px;
                font-family: inherit;
                font-size: 12px;
            }
            .dev-select-small {
                max-width: 132px;
            }
            .dev-label {
                display: flex;
                align-items: center;
                gap: 4px;
                color: #ccc;
                font-size: 12px;
                cursor: pointer;
                white-space: nowrap;
            }
            .dev-label input[type="checkbox"] {
                accent-color: #ff8000;
            }
            .dev-slider-row {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 4px;
            }
            .dev-slider-label {
                width: 90px;
                font-size: 11px;
                color: #aaa;
                flex-shrink: 0;
            }
            .dev-slider-row input[type="range"] {
                flex: 1;
                accent-color: #ff8000;
                height: 14px;
            }
            .dev-slider-val {
                width: 50px;
                text-align: right;
                font-size: 11px;
                color: #ff8000;
                flex-shrink: 0;
            }
            .dev-input {
                background: #222;
                border: 1px solid #555;
                color: #ccc;
                padding: 4px 8px;
                border-radius: 4px;
                font-family: inherit;
                font-size: 12px;
                width: 70px;
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(this.panel);

        this._populateMapSelect();
        this._wireEvents();
        this._syncLootControlOptions();
    }

    _buildRarityOptions() {
        return `
            <option value="Random">Random Rarity</option>
            <option value="Common">Common</option>
            <option value="Uncommon">Uncommon</option>
            <option value="Epic">Epic</option>
            <option value="Legendary">Legendary</option>
        `;
    }

    _getAffixDefinitions() {
        return [
            { value: 'damageMultiplier', label: 'Damage' },
            { value: 'attackSpeedMultiplier', label: 'Attack Speed' },
            { value: 'flatDamage', label: 'Flat Damage' },
            { value: 'armor', label: 'Armor' },
            { value: 'damageReduction', label: 'Damage Reduction' },
            { value: 'maxHp', label: 'Max Health' },
            { value: 'lifesteal', label: 'Lifesteal' },
            { value: 'movementSpeedMultiplier', label: 'Movement Speed' },
            { value: 'dodgeCooldownMultiplier', label: 'Dodge Cooldown' },
            { value: 'cooldownReduction', label: 'Cooldown Reduction' },
            { value: 'thorns', label: 'Thorns' }
        ];
    }

    _buildAffixOptions(label, excludedStats = []) {
        const excluded = new Set(excludedStats.filter(stat => stat && stat !== 'Random'));
        const options = [`<option value="Random">Random ${label}</option>`];
        this._getAffixDefinitions().forEach(def => {
            if (!excluded.has(def.value)) {
                options.push(`<option value="${def.value}">${def.label}</option>`);
            }
        });
        return options.join('');
    }

    _buildElementOptions(allowNoElement = true) {
        const options = ['<option value="Random">Random Element</option>'];
        if (allowNoElement) {
            options.push('<option value="None">No Element</option>');
        }
        options.push(
            '<option value="frost">Frost</option>',
            '<option value="fire">Fire</option>',
            '<option value="felfire">Felfire</option>',
            '<option value="holy">Holy</option>',
            '<option value="shadow">Shadow</option>',
            '<option value="poison">Poison</option>',
            '<option value="arcane">Arcane</option>'
        );
        return options.join('');
    }

    _getBossDefinitions() {
        if (typeof BossConfig === 'undefined') return [];
        const mainBosses = Array.isArray(BossConfig.mainBosses) ? BossConfig.mainBosses : [];
        const floorGuardians = Array.isArray(BossConfig.floorGuardians) ? BossConfig.floorGuardians : [];
        return [...mainBosses, ...floorGuardians];
    }

    _buildBossProfileOptions() {
        const definitions = this._getBossDefinitions();
        if (definitions.length === 0) {
            return '<option value="Random">Random Boss</option>';
        }

        const options = ['<option value="Random">Random Boss</option>'];
        definitions.forEach(def => {
            const tierLabel = def.tier === 'floorGuardian' ? 'Guardian' : 'Boss';
            options.push(`<option value="${def.id}">${def.displayName} (${tierLabel})</option>`);
        });
        return options.join('');
    }

    _buildBossModifierOptions() {
        const options = ['<option value="Random">Random Modifier</option>', '<option value="None">No Modifier</option>'];
        if (typeof BossConfig === 'undefined') return options.join('');

        const ids = new Set();
        this._getBossDefinitions().forEach(def => {
            (def.allowedModifiers || []).forEach(id => ids.add(id));
        });

        Array.from(ids).forEach(id => {
            const modifier = BossConfig.getBossModifier ? BossConfig.getBossModifier(id) : null;
            if (modifier) {
                options.push(`<option value="${modifier.id}">${modifier.label}</option>`);
            }
        });
        return options.join('');
    }

    _buildBossPowerOptions() {
        const options = ['<option value="Random">Random Ability</option>', '<option value="None">No Ability</option>'];
        if (typeof BossConfig === 'undefined') return options.join('');

        const ids = new Set();
        this._getBossDefinitions().forEach(def => {
            (def.allowedBorrowedEffects || []).forEach(id => ids.add(id));
        });

        Array.from(ids).forEach(id => {
            const power = BossConfig.getBorrowedPower ? BossConfig.getBorrowedPower(id) : null;
            if (power) {
                options.push(`<option value="${power.id}">${power.label}</option>`);
            }
        });
        return options.join('');
    }

    _populateMapSelect() {
        const select = document.getElementById('dev-map-select');
        if (!select) return;

        select.innerHTML = '';

        const randomOption = document.createElement('option');
        randomOption.value = 'random';
        randomOption.textContent = 'Random';
        select.appendChild(randomOption);

        if (typeof MapConfigs === 'undefined') return;

        Object.entries(MapConfigs).forEach(([key, config]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = config.displayName || key.replace(/_/g, ' ');
            select.appendChild(option);
        });
    }

    _wireEvents() {
        // Close button
        document.getElementById('dev-close-btn').addEventListener('click', () => this.hide());

        // Spawn Random Loot
        document.getElementById('dev-spawn-random-loot').addEventListener('click', () => {
            this._spawnLoot(null, null);
        });

        document.getElementById('dev-spawn-gear-loot').addEventListener('click', () => {
            this._spawnCustomLoot(this._getGearSpawnOptions());
        });

        document.getElementById('dev-spawn-weapon-loot').addEventListener('click', () => {
            this._spawnCustomLoot(this._getWeaponSpawnOptions());
        });

        document.getElementById('dev-spawn-trinket-loot').addEventListener('click', () => {
            this._spawnCustomLoot(this._getTrinketSpawnOptions());
        });

        [
            'dev-gear-rarity', 'dev-gear-prefix', 'dev-gear-suffix',
            'dev-weapon-rarity', 'dev-weapon-prefix', 'dev-weapon-suffix', 'dev-weapon-base',
            'dev-trinket-rarity', 'dev-trinket-prefix', 'dev-trinket-suffix'
        ].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', () => this._syncLootControlOptions());
        });

        // Spawn Loot Chest
        document.getElementById('dev-spawn-chest').addEventListener('click', () => {
            this._spawnChest();
        });

        // Spawn Enemy
        document.getElementById('dev-spawn-enemy').addEventListener('click', () => {
            this._spawnEnemy();
        });

        const enemyTypeSelect = document.getElementById('dev-enemy-type');
        if (enemyTypeSelect) {
            enemyTypeSelect.addEventListener('change', () => this._syncEnemySpawnControls());
        }

        const bossProfileSelect = document.getElementById('dev-boss-profile');
        if (bossProfileSelect) {
            bossProfileSelect.addEventListener('change', () => this._syncBossSpawnOptions());
        }

        document.getElementById('dev-spawn-door').addEventListener('click', () => {
            if (this.engine) this.engine.spawnDevFloorTransition('door');
        });

        document.getElementById('dev-spawn-hole').addEventListener('click', () => {
            if (this.engine) this.engine.spawnDevFloorTransition('hole');
        });

        document.getElementById('dev-spawn-portal').addEventListener('click', () => {
            if (this.engine) this.engine.spawnDevPortal();
        });

        document.getElementById('dev-spawn-blacksmith').addEventListener('click', () => {
            if (this.engine) this.engine.spawnDevDungeonService('blacksmith');
        });

        document.getElementById('dev-spawn-bank').addEventListener('click', () => {
            if (this.engine) this.engine.spawnDevDungeonService('bank');
        });

        document.getElementById('dev-spawn-healing-well').addEventListener('click', () => {
            if (this.engine) this.engine.spawnDevDungeonService('healingWell');
        });

        // God Mode toggle
        document.getElementById('dev-god-mode').addEventListener('change', (e) => {
            DevConfig.godMode = e.target.checked;
        });

        document.getElementById('dev-no-clip').addEventListener('change', (e) => {
            DevConfig.noClip = e.target.checked;
        });

        // Heal to Full
        document.getElementById('dev-heal-full').addEventListener('click', () => {
            if (this.engine && this.engine.player) {
                this.engine.player.hp = this.engine.player.maxHp;
                if (this.engine.player.maxShield > 0) {
                    this.engine.player.shield = this.engine.player.maxShield;
                }
            }
        });

        // Config sliders
        this._wireSlider('dev-drop-rate', 'dropRate', '%', v => v / 100);
        this._wireSlider('dev-player-speed', 'playerSpeedMultiplier', 'x', null, () => {
            // Apply speed multiplier immediately
            if (this.engine && this.engine.player) {
                this.engine.player.speed = this.engine.player.stats.speed *
                    this.engine.player.stats.movementSpeedMultiplier *
                    DevConfig.playerSpeedMultiplier;
            }
        });
        this._wireSlider('dev-camera-zoom', 'cameraZoom', 'x', null, () => {
            if (this.engine) {
                this.engine.applyDevCameraZoom();
            }
        });

        document.getElementById('dev-map-select').addEventListener('change', (e) => {
            if (this.engine) {
                this.engine.setRunMapSelection(e.target.value);
            }
        });

        // Floor Jump
        document.getElementById('dev-jump-floor').addEventListener('click', () => {
            const input = document.getElementById('dev-floor-input');
            const floor = parseInt(input.value, 10);
            if (floor >= 1 && this.engine) {
                this.engine.jumpToFloor(floor);
            }
        });

        this._syncEnemySpawnControls();
        this._syncBossSpawnOptions();
    }

    _wireSlider(elementId, configKey, suffix, transform = null, callback = null) {
        const el = document.getElementById(elementId);
        if (!el) return;
        el.addEventListener('input', (e) => {
            const raw = parseFloat(e.target.value);
            const val = transform ? transform(raw) : raw;
            DevConfig[configKey] = val;
            const label = el.parentElement.querySelector('.dev-slider-val');
            if (label) label.textContent = parseFloat(raw).toFixed(1) + suffix;
            if (callback) callback();
        });
    }

    _getRarityStatCount(rarity) {
        const counts = { Common: 1, Uncommon: 2, Epic: 3, Legendary: 4 };
        return counts[rarity] || 4;
    }

    _setSelectOptions(selectId, optionsHtml, preferredValue, disabled = false) {
        const select = document.getElementById(selectId);
        if (!select) return;
        select.innerHTML = optionsHtml;
        const hasPreferred = Array.from(select.options).some(option => option.value === preferredValue);
        select.value = hasPreferred ? preferredValue : 'Random';
        select.disabled = disabled;
    }

    _buildDisabledSuffixOptions(rarity) {
        return `<option value="Random">No Suffix (${rarity})</option>`;
    }

    _weaponCanNaturallyHaveNoElement(weaponType) {
        return weaponType !== 'pistol' && weaponType !== 'shotgun';
    }

    _syncLootAffixControls(section) {
        const rarity = this._getSelectValue(`dev-${section}-rarity`);
        const prefixId = `dev-${section}-prefix`;
        const suffixId = `dev-${section}-suffix`;
        const prefix = this._getSelectValue(prefixId);
        const suffix = this._getSelectValue(suffixId);
        const suffixAllowed = this._getRarityStatCount(rarity) >= 2;

        this._setSelectOptions(prefixId, this._buildAffixOptions('Prefix', [suffix]), prefix);

        if (suffixAllowed) {
            this._setSelectOptions(suffixId, this._buildAffixOptions('Suffix', [this._getSelectValue(prefixId)]), suffix);
        } else {
            this._setSelectOptions(suffixId, this._buildDisabledSuffixOptions(rarity), 'Random', true);
        }
    }

    _syncWeaponElementOptions() {
        const [weaponType] = this._getSelectValue('dev-weapon-base').split(':');
        const element = this._getSelectValue('dev-weapon-element');
        const allowNoElement = this._weaponCanNaturallyHaveNoElement(weaponType);
        this._setSelectOptions('dev-weapon-element', this._buildElementOptions(allowNoElement), element);
    }

    _syncLootControlOptions() {
        this._syncLootAffixControls('gear');
        this._syncLootAffixControls('weapon');
        this._syncLootAffixControls('trinket');
        this._syncWeaponElementOptions();
    }

    _syncEnemySpawnControls() {
        const enemyType = this._getSelectValue('dev-enemy-type');
        const bossOptions = document.getElementById('dev-boss-spawn-options');
        const eliteToggle = document.getElementById('dev-elite-toggle');
        const isBoss = enemyType === 'boss';

        if (bossOptions) {
            bossOptions.classList.toggle('dev-hidden', !isBoss);
        }
        if (eliteToggle) {
            eliteToggle.disabled = isBoss;
            if (isBoss) eliteToggle.checked = false;
        }
    }

    _syncBossSpawnOptions() {
        const bossId = this._getSelectValue('dev-boss-profile');
        const modifierSelect = document.getElementById('dev-boss-modifier');
        const powerSelect = document.getElementById('dev-boss-power');
        if (!modifierSelect || !powerSelect) return;

        const definition = this._getBossDefinitions().find(def => def.id === bossId) || null;
        const allowedModifierIds = definition ? new Set(definition.allowedModifiers || []) : null;
        const allowedPowerIds = definition ? new Set(definition.allowedBorrowedEffects || []) : null;

        Array.from(modifierSelect.options).forEach(option => {
            option.disabled = Boolean(allowedModifierIds) && !['Random', 'None'].includes(option.value) && !allowedModifierIds.has(option.value);
        });
        if (modifierSelect.selectedOptions[0] && modifierSelect.selectedOptions[0].disabled) {
            modifierSelect.value = 'Random';
        }

        Array.from(powerSelect.options).forEach(option => {
            option.disabled = Boolean(allowedPowerIds) && !['Random', 'None'].includes(option.value) && !allowedPowerIds.has(option.value);
        });
        if (powerSelect.selectedOptions[0] && powerSelect.selectedOptions[0].disabled) {
            powerSelect.value = 'Random';
        }
    }

    _spawnLoot(forcedRarity, forcedType) {
        if (!this.engine || !this.engine.player) return;
        const effectiveFloor = (this.engine.currentFloor - 1) + (this.engine.gearDifficultyFloor || 1);
        const item = this.engine.lootGen.generateItemWithRarityAndType(effectiveFloor, forcedRarity, forcedType);
        this._dropItemNearPlayer(item);
    }

    _spawnCustomLoot(options) {
        if (!this.engine || !this.engine.player) return;
        const effectiveFloor = (this.engine.currentFloor - 1) + (this.engine.gearDifficultyFloor || 1);
        const item = this.engine.lootGen.generateCustomItem(effectiveFloor, options);
        this._dropItemNearPlayer(item);
    }

    _dropItemNearPlayer(item) {
        if (!item || !this.engine || !this.engine.player) return;
        const offsetX = (Math.random() - 0.5) * 60;
        const offsetY = (Math.random() - 0.5) * 60;
        this.engine.droppedItems.push(
            new DroppedItem(this.engine.player.x + offsetX, this.engine.player.y + offsetY, item)
        );
    }

    _getSelectValue(id) {
        const el = document.getElementById(id);
        return el ? el.value : 'Random';
    }

    _getGearSpawnOptions() {
        return {
            typeSlot: this._getSelectValue('dev-gear-base'),
            rarityName: this._getSelectValue('dev-gear-rarity'),
            prefixStat: this._getSelectValue('dev-gear-prefix'),
            suffixStat: this._getSelectValue('dev-gear-suffix')
        };
    }

    _getWeaponSpawnOptions() {
        const [weaponType, weaponBaseName] = this._getSelectValue('dev-weapon-base').split(':');
        return {
            typeSlot: 'weapon',
            rarityName: this._getSelectValue('dev-weapon-rarity'),
            prefixStat: this._getSelectValue('dev-weapon-prefix'),
            suffixStat: this._getSelectValue('dev-weapon-suffix'),
            weaponType: weaponType || 'Random',
            weaponBaseName: weaponBaseName || null,
            element: this._getSelectValue('dev-weapon-element')
        };
    }

    _getTrinketSpawnOptions() {
        const [abilityType, abilityElement] = this._getSelectValue('dev-trinket-base').split(':');
        return {
            typeSlot: 'trinket',
            rarityName: this._getSelectValue('dev-trinket-rarity'),
            prefixStat: this._getSelectValue('dev-trinket-prefix'),
            suffixStat: this._getSelectValue('dev-trinket-suffix'),
            trinketAbilityType: abilityType || 'Random',
            trinketAbilityElement: abilityElement || null
        };
    }

    _spawnChest() {
        if (!this.engine || !this.engine.player) return;
        const chest = new LootChest(this.engine.player.x + 60, this.engine.player.y);
        this.engine.lootChests.push(chest);
    }

    _spawnEnemy() {
        if (!this.engine || !this.engine.player) return;
        const type = document.getElementById('dev-enemy-type').value;
        const isElite = document.getElementById('dev-elite-toggle').checked;
        const effectiveFloor = (this.engine.currentFloor - 1) + (this.engine.gearDifficultyFloor || 1);

        const hpScale = typeof DifficultyConfig !== 'undefined' ? DifficultyConfig.enemyHpScale : 0.2;
        const dmgScale = typeof DifficultyConfig !== 'undefined' ? DifficultyConfig.enemyDamageScale : 0.2;
        const hpMult = (1 + effectiveFloor * hpScale) * DevConfig.enemyHpMultiplier;
        const dmgMult = (1 + effectiveFloor * dmgScale) * DevConfig.enemyDmgMultiplier;

        // Spawn 80px in front of player facing direction
        const spawnPos = this.engine.getDevSpawnPosition(80);
        if (!spawnPos) return;

        if (type === 'boss') {
            const encounterProfile = this._getBossEncounterProfile();
            if (!encounterProfile) return;
            const enemy = this.engine.createBossEnemy(spawnPos.x, spawnPos.y, encounterProfile, hpMult, dmgMult);
            this.engine.enemies.push(enemy);
            return;
        }

        const enemy = new Enemy(spawnPos.x, spawnPos.y, type, hpMult, dmgMult);

        // Force elite if requested
        if (isElite && enemy.eliteModifier === 'none') {
            if (Math.random() > 0.5) {
                enemy.eliteModifier = 'fast';
                enemy.speed *= 1.5;
                enemy.baseSpeed *= 1.5;
                enemy.color = '#ffff00';
            } else {
                enemy.eliteModifier = 'vampiric';
                enemy.maxHp *= 1.2;
                enemy.hp = enemy.maxHp;
                enemy.color = '#ff00ff';
            }
        }

        this.engine.enemies.push(enemy);
    }

    _resolveBossProfileSelection() {
        const selectedBossId = this._getSelectValue('dev-boss-profile');
        if (typeof BossConfig === 'undefined' || !BossConfig.createEncounterProfile) return null;

        if (selectedBossId === 'Random') {
            const definitions = this._getBossDefinitions();
            if (definitions.length === 0) {
                return BossConfig.pickMainBoss ? BossConfig.pickMainBoss() : null;
            }
            const definition = definitions[Math.floor(Math.random() * definitions.length)];
            return BossConfig.createEncounterProfile(definition);
        }

        const definition = this._getBossDefinitions().find(def => def.id === selectedBossId);
        if (!definition) return null;

        const modifierValue = this._getSelectValue('dev-boss-modifier');
        const powerValue = this._getSelectValue('dev-boss-power');

        const modifier = modifierValue === 'Random'
            ? undefined
            : (modifierValue === 'None' ? null : (BossConfig.getBossModifier ? BossConfig.getBossModifier(modifierValue) : null));
        const borrowedPower = powerValue === 'Random'
            ? undefined
            : (powerValue === 'None' ? null : (BossConfig.getBorrowedPower ? BossConfig.getBorrowedPower(powerValue) : null));

        return BossConfig.createEncounterProfile(definition, { modifier, borrowedPower });
    }

    _getBossEncounterProfile() {
        const encounterProfile = this._resolveBossProfileSelection();
        if (!encounterProfile) return null;

        const definition = this._getBossDefinitions().find(def => def.id === encounterProfile.id);
        if (!definition) return encounterProfile;

        if (encounterProfile.modifier && !(definition.allowedModifiers || []).includes(encounterProfile.modifier.id)) {
            encounterProfile.modifier = null;
        }

        if (encounterProfile.borrowedPower && !(definition.allowedBorrowedEffects || []).includes(encounterProfile.borrowedPower.id)) {
            encounterProfile.borrowedPower = null;
        }

        encounterProfile.encounterTags = [];
        if (encounterProfile.modifier) encounterProfile.encounterTags.push(encounterProfile.modifier.label);
        if (encounterProfile.borrowedPower) encounterProfile.encounterTags.push(encounterProfile.borrowedPower.label);
        return encounterProfile;
    }

    destroy() {
        window.removeEventListener('keydown', this._boundKeyHandler);
        if (this.panel && this.panel.parentElement) {
            this.panel.parentElement.removeChild(this.panel);
        }
    }
}
