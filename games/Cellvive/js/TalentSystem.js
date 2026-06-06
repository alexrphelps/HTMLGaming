class TalentSystem {
    constructor(game) {
        this.game = game;

        if (typeof CELLVIVE_CONSTANTS === 'undefined' || !CELLVIVE_CONSTANTS.TALENTS) {
            console.error('CELLVIVE_CONSTANTS not available or TALENTS section missing');
            this.talents = {};
        } else {
            this.talents = this.flattenTalentTree(CELLVIVE_CONSTANTS.TALENTS.TALENT_TREE);
        }

        this.selectedTalent = null;
        this.playerTalents = new Set();
        this.talentLevels = {};
        this.eventListeners = [];

        this.popup = document.getElementById('talent-popup');
        this.talentGrid = document.getElementById('talent-grid');
        this.talentInfoPanel = document.getElementById('talent-info-panel');
        this.selectBtn = document.getElementById('talent-select-btn');
        this.cancelBtn = document.getElementById('talent-cancel-btn');

        this.selectedTalentName = document.getElementById('selected-talent-name');
        this.selectedTalentDescription = document.getElementById('selected-talent-description');
        this.selectedTalentCost = document.getElementById('selected-talent-cost');

        if (!this.popup || !this.talentGrid || !this.talentInfoPanel || !this.selectBtn || !this.cancelBtn) {
            console.error('TalentSystem: Missing required HTML elements');
        }

        this.initEventListeners();
        this.syncTalentStateFromPlayer();
    }

    flattenTalentTree(talentTree) {
        const flattened = {};
        if (!talentTree || typeof talentTree !== 'object') return flattened;

        Object.keys(talentTree).forEach(tierKey => {
            const tier = talentTree[tierKey];
            if (typeof tier === 'object' && tier !== null) {
                Object.keys(tier).forEach(talentKey => {
                    const talent = tier[talentKey];
                    if (talent && talent.ID) {
                        flattened[talentKey] = {
                            ...talent,
                            EFFECT: talent.EFFECT_PER_LEVEL || talent.EFFECT || {},
                            COST: talent.COST_PER_LEVEL || talent.COST || 1
                        };
                    }
                });
            }
        });
        return flattened;
    }

    initEventListeners() {
        if (this.cancelBtn) {
            this.addManagedEventListener(this.cancelBtn, 'click', () => this.hidePopup());
        }
        if (this.selectBtn) {
            this.addManagedEventListener(this.selectBtn, 'click', () => this.confirmSelection());
        }
        if (this.popup) {
            this.addManagedEventListener(this.popup, 'click', (e) => {
                if (e.target === this.popup) this.hidePopup();
            });
        }
    }

    addManagedEventListener(target, type, handler, options) {
        if (!target || !target.addEventListener) return;
        target.addEventListener(type, handler, options);
        this.eventListeners.push({ target, type, handler, options });
    }

    showPopup() {
        if (!this.popup || !this.talentGrid) return;
        this.syncTalentStateFromPlayer();
        this.popup.classList.remove('hidden');
        this.populateTalentGrid();
        this.hideInfoPanel();
        if (this.game && this.game.pauseGame) {
            this.game.pauseGame('talent');
        }
    }

    hidePopup() {
        if (this.popup) {
            this.popup.classList.add('hidden');
            this.selectedTalent = null;
            this.hideInfoPanel();
            if (this.game && this.game.resumeGame) {
                this.game.resumeGame('talent');
            }
        }
    }

    populateTalentGrid() {
        if (!this.talentGrid) return;
        this.talentGrid.innerHTML = '';

        const tiers = ['TIER_1', 'TIER_2', 'TIER_3'];
        tiers.forEach(tierKey => {
            const tierData = CELLVIVE_CONSTANTS.TALENTS.TALENT_TREE[tierKey];
            if (!tierData) return;

            const tierSection = document.createElement('div');
            tierSection.className = 'talent-tier-section';

            const tierLabel = document.createElement('div');
            tierLabel.className = 'talent-tier-label';
            const tierNames = { TIER_1: 'Cellular Foundation', TIER_2: 'Specialized Adaptation', TIER_3: 'Apex Evolution' };
            tierLabel.textContent = tierNames[tierKey] || tierKey;
            tierSection.appendChild(tierLabel);

            const tierGrid = document.createElement('div');
            tierGrid.className = 'talent-tier-grid';

            Object.keys(tierData).forEach(key => {
                const talent = tierData[key];
                if (!talent || !talent.ID) return;
                const flatKey = Object.keys(this.talents).find(k => this.talents[k] && this.talents[k].ID === talent.ID);
                const box = this.createTalentBox(talent, flatKey);
                tierGrid.appendChild(box);
            });

            tierSection.appendChild(tierGrid);
            this.talentGrid.appendChild(tierSection);
        });
    }

    createTalentBox(talent, flatKey) {
        const box = document.createElement('div');
        box.className = 'talent-box';
        box.dataset.talentId = talent.ID;

        const currentLevel = this.talentLevels[talent.ID] || 0;
        const maxLevel = talent.MAX_LEVEL || 1;
        const isMaxed = currentLevel >= maxLevel;
        const canSelect = this.canSelectTalent(talent);

        if (isMaxed) box.classList.add('maxed');
        if (!canSelect) box.classList.add('unavailable');

        box.innerHTML = `
            <div class="talent-box-icon">${talent.ICON}</div>
            <div class="talent-box-name">${talent.NAME}</div>
            <div class="talent-box-level">${isMaxed ? 'MAX' : 'Lv.' + currentLevel + '/' + maxLevel}</div>
            <div class="talent-box-cost">${isMaxed ? '—' : this.getTalentCost(talent) + ' spore(s)'}</div>
        `;

        if (canSelect) {
            box.addEventListener('click', () => this.selectTalentBox(talent));
        }

        return box;
    }

    getCurrentPlayer() {
        return this.game ? this.game.player : null;
    }

    syncTalentStateFromPlayer() {
        const player = this.getCurrentPlayer();
        if (!player) return;

        if (typeof player.talentPoints !== 'number') {
            player.talentPoints = 0;
        }
        if (!player.talentLevels || typeof player.talentLevels !== 'object') {
            player.talentLevels = {};
        }

        this.talentLevels = { ...player.talentLevels };
        this.playerTalents = new Set(
            Object.keys(this.talentLevels).filter(talentId => (this.talentLevels[talentId] || 0) > 0)
        );
    }

    syncTalentStateToPlayer() {
        const player = this.getCurrentPlayer();
        if (!player) return;

        if (!player.talentLevels || typeof player.talentLevels !== 'object') {
            player.talentLevels = {};
        }
        player.talentLevels = { ...this.talentLevels };
    }

    getTalentCost(talent) {
        if (!talent) return 0;
        return talent.COST_PER_LEVEL || talent.COST || 1;
    }

    canSelectTalent(talent) {
        const player = this.getCurrentPlayer();
        if (!player || !talent) return false;

        const currentLevel = this.talentLevels[talent.ID] || 0;
        const maxLevel = talent.MAX_LEVEL || 1;
        if (currentLevel >= maxLevel) return false;
        if (!this.isTalentAvailable(talent)) return false;

        return (player.talentPoints || 0) >= this.getTalentCost(talent);
    }

    isTalentAvailable(talent) {
        const prereqs = talent.PREREQUISITES || [];
        if (prereqs.length === 0) return true;

        for (const prereq of prereqs) {
            if (prereq === 'tier_1_complete') {
                const t1 = CELLVIVE_CONSTANTS.TALENTS.TALENT_TREE.TIER_1;
                const anyMaxed = Object.keys(t1).some(key => {
                    const t = t1[key];
                    return t && (this.talentLevels[t.ID] || 0) >= (t.MAX_LEVEL || 1);
                });
                if (!anyMaxed) return false;
            }
            if (prereq === 'tier_2_complete') {
                const t2 = CELLVIVE_CONSTANTS.TALENTS.TALENT_TREE.TIER_2;
                const anyMaxed = Object.keys(t2).some(key => {
                    const t = t2[key];
                    return t && (this.talentLevels[t.ID] || 0) >= (t.MAX_LEVEL || 1);
                });
                if (!anyMaxed) return false;
            }
        }
        return true;
    }

    selectTalentBox(talent) {
        if (!this.canSelectTalent(talent)) {
            return false;
        }

        this.talentGrid.querySelectorAll('.talent-box.selected').forEach(box => {
            box.classList.remove('selected');
        });

        const talentBox = this.talentGrid.querySelector(`[data-talent-id="${talent.ID}"]`);
        if (talentBox) talentBox.classList.add('selected');

        this.selectedTalent = talent;
        this.showInfoPanel(talent);
        return true;
    }

    showInfoPanel(talent) {
        if (!this.talentInfoPanel) return;
        if (this.selectedTalentName) this.selectedTalentName.textContent = talent.NAME;
        if (this.selectedTalentDescription) this.selectedTalentDescription.textContent = talent.DESCRIPTION;
        if (this.selectedTalentCost) this.selectedTalentCost.textContent = this.getTalentCost(talent);
        this.talentInfoPanel.style.display = 'block';
        if (this.selectBtn) this.selectBtn.disabled = !this.canSelectTalent(talent);
    }

    hideInfoPanel() {
        if (this.talentInfoPanel) this.talentInfoPanel.style.display = 'none';
        if (this.selectBtn) this.selectBtn.disabled = true;
    }

    confirmSelection() {
        if (!this.selectedTalent) return false;

        this.syncTalentStateFromPlayer();
        const player = this.getCurrentPlayer();
        if (!player || !this.canSelectTalent(this.selectedTalent)) {
            this.hideInfoPanel();
            return false;
        }

        const talentId = this.selectedTalent.ID;
        const currentLevel = this.talentLevels[talentId] || 0;
        const maxLevel = this.selectedTalent.MAX_LEVEL || 1;
        const cost = this.getTalentCost(this.selectedTalent);

        if (currentLevel >= maxLevel) return false;

        player.talentPoints -= cost;
        this.talentLevels[talentId] = currentLevel + 1;
        this.playerTalents.add(talentId);
        this.syncTalentStateToPlayer();
        this.applyTalentEffect(this.selectedTalent);

        GameLogger.debug(`Talent ${this.selectedTalent.NAME} upgraded to level ${this.talentLevels[talentId]}`);
        
        if (this.game.audioManager) this.game.audioManager.playTalentUnlock();
        
        this.populateTalentGrid();
        this.hidePopup();
        return true;
    }

    applyTalentEffect(talent) {
        const player = this.getCurrentPlayer();
        if (!player) return;
        const level = this.talentLevels[talent.ID] || 1;
        const effect = talent.EFFECT || talent.EFFECT_PER_LEVEL || {};

        switch (talent.ID) {
            case 'efficient_metabolism':
                player.hasEfficientMetabolism = true;
                player.growthMultiplier = 1.0 + (effect.VALUE || 0.3) * level;
                GameLogger.debug(`Efficient Metabolism: growth x${player.growthMultiplier}`);
                break;

            case 'thick_membrane':
                player.hasThickMembrane = true;
                player.maxHealth = this.getStartingMaxHealth(player) + (effect.MAX_HEALTH || 25) * level;
                player.damageReduction = (effect.DAMAGE_REDUCTION || 0.15) * level;
                if (player.health > player.maxHealth) player.health = player.maxHealth;
                GameLogger.debug(`Thick Membrane: maxHealth=${player.maxHealth}, dmgReduction=${Math.round(player.damageReduction * 100)}%`);
                break;

            case 'rapid_movement':
                player.hasRapidMovement = true;
                player.speedMultiplier = 1.0 + (effect.VALUE || 0.2) * level;
                player.updateMaxSpeed();
                GameLogger.debug(`Rapid Movement: speed x${player.speedMultiplier}`);
                break;

            case 'photosynthesis':
                player.hasPhotosynthesis = true;
                player.regenRate = (effect.VALUE || 5) * level;
                GameLogger.debug(`Photosynthesis: regen ${player.regenRate} hp/s`);
                break;

            case 'magnetic_organelle':
                player.hasMagneticOrganelle = true;
                player.sporeAttractionRadius = (effect.RADIUS || 100) * level;
                player.sporeAttractionStrength = (effect.STRENGTH || 0.15) * level;
                GameLogger.debug(`Magnetic Organelle: radius=${player.sporeAttractionRadius}, strength=${player.sporeAttractionStrength}`);
                break;

            case 'adaptive_size':
                player.hasAdaptiveSize = true;
                player.speedPenaltyReduction = (effect.VALUE || 0.3) * level;
                player.updateMaxSpeed();
                GameLogger.debug(`Adaptive Size: penalty reduced by ${Math.round(player.speedPenaltyReduction * 100)}%`);
                break;

            case 'toxic_resistance':
                player.hasToxicResistance = true;
                player.toxicDamageReduction = (effect.VALUE || 0.5) * level;
                GameLogger.debug(`Toxic Resistance: ${Math.round(player.toxicDamageReduction * 100)}% resist`);
                break;

            case 'predatory_instinct':
                player.hasPredatoryInstinct = true;
                player.eatSizeModifier = 1.0 + (effect.VALUE || 0.10) * level;
                GameLogger.debug(`Predatory Instinct: eat ${Math.round((player.eatSizeModifier - 1) * 100)}% larger`);
                break;

            case 'cellular_division':
                player.hasCellularDivision = true;
                player.passiveGrowthRate = (effect.VALUE || 0.5) * level;
                GameLogger.debug(`Cellular Division: +${player.passiveGrowthRate} radius/s passive`);
                break;

            case 'symbiotic_shield':
                player.hasSymbioticShield = true;
                player.phaseShiftTriggerHealth = effect.TRIGGER_HEALTH || 0.80;
                player.phaseShiftDuration = (effect.DURATION || 2000) * level;
                player.phaseShiftCooldown = effect.COOLDOWN || 15000;
                player.phaseShiftLastUsed = 0;
                GameLogger.debug(`Symbiotic Shield: triggers at ${Math.round(player.phaseShiftTriggerHealth * 100)}%, lasts ${player.phaseShiftDuration}ms`);
                break;

            case 'evolutionary_leap':
                player.hasEvolutionaryLeap = true;
                player.maxHealth += (effect.HEALTH || 50) * level;
                player.regenRate += (effect.REGEN || 3) * level;
                player.speedMultiplier += (effect.SPEED || 0.5) * level;
                player.growthMultiplier += (effect.GROWTH || 0.5) * level;
                if (player.health > player.maxHealth) player.health = player.maxHealth;
                player.updateMaxSpeed();
                GameLogger.debug(`Evolutionary Leap: all stats boosted`);
                break;

            default:
                console.warn(`Unknown talent ID: ${talent.ID}`);
        }
    }

    hasTalent(talentId) {
        return this.playerTalents.has(talentId);
    }

    getTalentLevel(talentId) {
        return this.talentLevels[talentId] || 0;
    }

    getUnlockedTalents() {
        return Array.from(this.playerTalents);
    }

    addTalentPoints(amount) {
        const player = this.getCurrentPlayer();
        if (player) {
            if (typeof player.talentPoints !== 'number') {
                player.talentPoints = 0;
            }
            player.talentPoints += amount;
            GameLogger.debug(`+${amount} talent point(s) (total: ${player.talentPoints})`);
        }
    }

    getStartingMaxHealth(player = this.getCurrentPlayer()) {
        const constantsHealth = typeof CELLVIVE_CONSTANTS !== 'undefined'
            ? CELLVIVE_CONSTANTS.PLAYER?.STARTING_MAX_HEALTH
            : null;
        return constantsHealth || player?.maxHealth || 100;
    }

    resetTalents() {
        this.playerTalents.clear();
        this.talentLevels = {};
        if (this.game.player) {
            const p = this.game.player;
            p.talentLevels = {};
            p.hasEfficientMetabolism = false;
            p.hasThickMembrane = false;
            p.hasRapidMovement = false;
            p.hasPhotosynthesis = false;
            p.hasMagneticOrganelle = false;
            p.hasAdaptiveSize = false;
            p.hasToxicResistance = false;
            p.hasPredatoryInstinct = false;
            p.hasCellularDivision = false;
            p.hasSymbioticShield = false;
            p.hasEvolutionaryLeap = false;

            p.growthMultiplier = 1.0;
            p.speedMultiplier = 1.0;
            p.eatSizeModifier = 1.0;
            p.speedPenaltyReduction = 0;
            p.damageReduction = 0;
            p.toxicDamageReduction = 0;
            p.regenRate = 0;
            p.passiveGrowthRate = 0;
            p.sporeAttractionRadius = 0;
            p.sporeAttractionStrength = 0;
            p.maxHealth = this.getStartingMaxHealth(p);
            p.health = Math.min(p.health, p.maxHealth);

            p.phaseShiftTriggerHealth = 0.25;
            p.phaseShiftDuration = 3000;
            p.phaseShiftCooldown = 30000;
            p.phaseShiftLastUsed = 0;
            p.isPhaseShifted = false;

            p.updateMaxSpeed();
        }
    }

    cleanup() {
        this.eventListeners.forEach(({ target, type, handler, options }) => {
            target.removeEventListener(type, handler, options);
        });
        this.eventListeners = [];
        this.selectedTalent = null;
    }
}

window.TalentSystem = TalentSystem;
