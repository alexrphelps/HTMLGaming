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
        // Re-apply base player speed
        if (this.engine && this.engine.player) {
            this.engine.player.speed = this.engine.player.stats.speed * this.engine.player.stats.movementSpeedMultiplier;
        }
    }

    _syncUIToConfig() {
        const ids = {
            'dev-god-mode': DevConfig.godMode,
            'dev-enemy-hp': DevConfig.enemyHpMultiplier,
            'dev-enemy-dmg': DevConfig.enemyDmgMultiplier,
            'dev-enemy-count': DevConfig.enemyCountMultiplier,
            'dev-drop-rate': DevConfig.dropRate * 100,
            'dev-player-speed': DevConfig.playerSpeedMultiplier
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
                    <div class="dev-row">
                        <select id="dev-loot-type" class="dev-select">
                            <option value="Random">Random Type</option>
                            <option value="helm">Helm</option>
                            <option value="chest">Chest</option>
                            <option value="pants">Pants</option>
                            <option value="boots">Boots</option>
                            <option value="weapon">Weapon</option>
                            <option value="trinket">Trinket</option>
                        </select>
                        <select id="dev-loot-rarity" class="dev-select">
                            <option value="Random">Random Rarity</option>
                            <option value="Common">Common</option>
                            <option value="Epic">Epic</option>
                            <option value="Legendary">Legendary</option>
                        </select>
                        <button class="dev-btn" id="dev-spawn-custom-loot">Spawn</button>
                    </div>
                </div>
                <div class="dev-section">
                    <div class="dev-section-title">Spawn Enemies</div>
                    <div class="dev-row">
                        <select id="dev-enemy-type" class="dev-select">
                            <option value="grunt">Grunt</option>
                            <option value="ranged">Ranged</option>
                            <option value="brute">Brute</option>
                        </select>
                        <label class="dev-label"><input type="checkbox" id="dev-elite-toggle"> Elite</label>
                        <button class="dev-btn" id="dev-spawn-enemy">Spawn</button>
                    </div>
                </div>

                <!-- Player Section -->
                <div class="dev-section">
                    <div class="dev-section-title">Player</div>
                    <div class="dev-row">
                        <label class="dev-label"><input type="checkbox" id="dev-god-mode"> God Mode</label>
                        <button class="dev-btn dev-heal" id="dev-heal-full">Heal to Full</button>
                    </div>
                </div>

                <!-- Config Overrides -->
                <div class="dev-section">
                    <div class="dev-section-title">Config Overrides (Session)</div>
                    <div class="dev-slider-row">
                        <span class="dev-slider-label">Enemy HP</span>
                        <input type="range" id="dev-enemy-hp" min="0.1" max="5" step="0.1" value="1.0">
                        <span class="dev-slider-val">1.0x</span>
                    </div>
                    <div class="dev-slider-row">
                        <span class="dev-slider-label">Enemy DMG</span>
                        <input type="range" id="dev-enemy-dmg" min="0.1" max="5" step="0.1" value="1.0">
                        <span class="dev-slider-val">1.0x</span>
                    </div>
                    <div class="dev-slider-row">
                        <span class="dev-slider-label">Enemy Count</span>
                        <input type="range" id="dev-enemy-count" min="0.1" max="5" step="0.1" value="1.0">
                        <span class="dev-slider-val">1.0x</span>
                    </div>
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
                </div>

                <!-- Floor Jump -->
                <div class="dev-section">
                    <div class="dev-section-title">Floor Jump</div>
                    <div class="dev-row">
                        <input type="number" id="dev-floor-input" class="dev-input" min="1" max="100" value="1" placeholder="Floor #">
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

        this._wireEvents();
    }

    _wireEvents() {
        // Close button
        document.getElementById('dev-close-btn').addEventListener('click', () => this.hide());

        // Spawn Random Loot
        document.getElementById('dev-spawn-random-loot').addEventListener('click', () => {
            this._spawnLoot(null, null);
        });

        // Spawn Custom Loot
        document.getElementById('dev-spawn-custom-loot').addEventListener('click', () => {
            const type = document.getElementById('dev-loot-type').value;
            const rarity = document.getElementById('dev-loot-rarity').value;
            this._spawnLoot(rarity, type);
        });

        // Spawn Loot Chest
        document.getElementById('dev-spawn-chest').addEventListener('click', () => {
            this._spawnChest();
        });

        // Spawn Enemy
        document.getElementById('dev-spawn-enemy').addEventListener('click', () => {
            this._spawnEnemy();
        });

        // God Mode toggle
        document.getElementById('dev-god-mode').addEventListener('change', (e) => {
            DevConfig.godMode = e.target.checked;
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
        this._wireSlider('dev-enemy-hp', 'enemyHpMultiplier', 'x');
        this._wireSlider('dev-enemy-dmg', 'enemyDmgMultiplier', 'x');
        this._wireSlider('dev-enemy-count', 'enemyCountMultiplier', 'x');
        this._wireSlider('dev-drop-rate', 'dropRate', '%', v => v / 100);
        this._wireSlider('dev-player-speed', 'playerSpeedMultiplier', 'x', null, () => {
            // Apply speed multiplier immediately
            if (this.engine && this.engine.player) {
                this.engine.player.speed = this.engine.player.stats.speed *
                    this.engine.player.stats.movementSpeedMultiplier *
                    DevConfig.playerSpeedMultiplier;
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

    _spawnLoot(forcedRarity, forcedType) {
        if (!this.engine || !this.engine.player) return;
        const effectiveFloor = (this.engine.currentFloor - 1) + (this.engine.gearDifficultyFloor || 1);
        const item = this.engine.lootGen.generateItemWithRarityAndType(effectiveFloor, forcedRarity, forcedType);
        
        const offsetX = (Math.random() - 0.5) * 60;
        const offsetY = (Math.random() - 0.5) * 60;
        this.engine.droppedItems.push(
            new DroppedItem(this.engine.player.x + offsetX, this.engine.player.y + offsetY, item)
        );
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
        const spawnX = this.engine.player.x + Math.cos(this.engine.player.angle) * 80;
        const spawnY = this.engine.player.y + Math.sin(this.engine.player.angle) * 80;

        const enemy = new Enemy(spawnX, spawnY, type, hpMult, dmgMult);

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

    destroy() {
        window.removeEventListener('keydown', this._boundKeyHandler);
        if (this.panel && this.panel.parentElement) {
            this.panel.parentElement.removeChild(this.panel);
        }
    }
}
