/**
 * Enhanced Talent System - Handles trait upgrades and player enhancements
 * Provides permanent upgrades that enhance cell abilities with grid-based selection
 */
class TalentSystem {
    constructor(game) {
        this.game = game;
        this.player = game.player;
        
        // Check if constants are available
        if (typeof CELLVIVE_CONSTANTS === 'undefined' || !CELLVIVE_CONSTANTS.TALENTS) {
            console.error('🧬 CELLVIVE_CONSTANTS not available or TALENTS section missing');
            this.talents = {};
        } else {
            this.talents = this.flattenTalentTree(CELLVIVE_CONSTANTS.TALENTS.TALENT_TREE);
        }
        
        this.selectedTalent = null;
        this.playerTalents = new Set(); // Track unlocked talents
        
        // Get popup elements with error handling
        this.popup = document.getElementById('talent-popup');
        this.talentGrid = document.getElementById('talent-grid');
        this.talentInfoPanel = document.getElementById('talent-info-panel');
        this.selectBtn = document.getElementById('talent-select-btn');
        this.cancelBtn = document.getElementById('talent-cancel-btn');
        
        // Debug logging
        console.log('🧬 TalentSystem constructor - elements found:');
        console.log('  popup:', !!this.popup);
        console.log('  talentGrid:', !!this.talentGrid);
        console.log('  talentInfoPanel:', !!this.talentInfoPanel);
        console.log('  selectBtn:', !!this.selectBtn);
        console.log('  cancelBtn:', !!this.cancelBtn);
        
        // Info panel elements with error handling
        this.selectedTalentName = document.getElementById('selected-talent-name');
        this.selectedTalentDescription = document.getElementById('selected-talent-description');
        this.selectedTalentCost = document.getElementById('selected-talent-cost');
        
        // Check if all required elements exist
        if (!this.popup || !this.talentGrid || !this.talentInfoPanel || !this.selectBtn || !this.cancelBtn) {
            console.error('🧬 TalentSystem: Missing required HTML elements. Talent system will not function properly.');
            console.error('Missing elements:', {
                popup: !this.popup,
                talentGrid: !this.talentGrid,
                talentInfoPanel: !this.talentInfoPanel,
                selectBtn: !this.selectBtn,
                cancelBtn: !this.cancelBtn
            });
        }
        
        this.initEventListeners();
    }
    
    /**
     * Flatten the nested talent tree structure into a flat object
     */
    flattenTalentTree(talentTree) {
        const flattened = {};
        
        // Check if talentTree exists and is valid
        if (!talentTree || typeof talentTree !== 'object') {
            console.error('🧬 Invalid talent tree provided to flattenTalentTree');
            return flattened;
        }
        
        // Process each tier
        Object.keys(talentTree).forEach(tierKey => {
            const tier = talentTree[tierKey];
            if (typeof tier === 'object' && tier !== null) {
                Object.keys(tier).forEach(talentKey => {
                    const talent = tier[talentKey];
                    if (talent && talent.ID) {
                        // Convert EFFECT_PER_LEVEL to EFFECT for compatibility
                        flattened[talentKey] = {
                            ...talent,
                            EFFECT: talent.EFFECT_PER_LEVEL || talent.EFFECT || {},
                            COST: talent.COST_PER_LEVEL || talent.COST || 1
                        };
                    }
                });
            }
        });
        
        console.log('🧬 Flattened talent tree:', Object.keys(flattened));
        return flattened;
    }
    
    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Cancel button
        if (this.cancelBtn) {
            this.cancelBtn.addEventListener('click', () => this.hidePopup());
        }
        
        // Select button
        if (this.selectBtn) {
            this.selectBtn.addEventListener('click', () => this.confirmSelection());
        }
        
        // Close popup when clicking outside
        if (this.popup) {
            this.popup.addEventListener('click', (e) => {
                if (e.target === this.popup) {
                    this.hidePopup();
                }
            });
        }
    }
    
    /**
     * Show the talent popup and populate grid
     */
    showPopup() {
        console.log('🎯 TalentSystem.showPopup called');
        console.log('this.popup exists:', !!this.popup);
        
        if (!this.popup) {
            console.error('Talent popup not found in HTML - element with id="talent-popup" missing');
            return;
        }
        
        if (!this.talentGrid) {
            console.error('Talent grid not found in HTML - element with id="talent-grid" missing');
            return;
        }
        
        console.log('Removing hidden class and populating grid...');
        this.popup.classList.remove('hidden');
        this.populateTalentGrid();
        this.hideInfoPanel();
        
        console.log('Talent popup should now be visible');
        
        // Pause the game
        if (this.game && this.game.pauseGame) {
            this.game.pauseGame();
        }
    }
    
    /**
     * Hide the talent popup
     */
    hidePopup() {
        if (this.popup) {
            this.popup.classList.add('hidden');
            this.selectedTalent = null;
            this.hideInfoPanel();
            
            // Resume the game
            if (this.game && this.game.resumeGame) {
                this.game.resumeGame();
            }
        }
    }
    
    /**
     * Populate the talent grid with available talents
     */
    populateTalentGrid() {
        if (!this.talentGrid) return;
        
        this.talentGrid.innerHTML = '';
        
        Object.values(this.talents).forEach(talent => {
            const talentBox = this.createTalentBox(talent);
            this.talentGrid.appendChild(talentBox);
        });
    }
    
    /**
     * Create a talent box element
     */
    createTalentBox(talent) {
        const box = document.createElement('div');
        box.className = 'talent-box';
        box.dataset.talentId = talent.ID;
        
        // Check if talent is already unlocked
        const isUnlocked = this.playerTalents.has(talent.ID);
        if (isUnlocked) {
            box.classList.add('unavailable');
        }
        
        box.innerHTML = `
            <div class="talent-box-category">${talent.CATEGORY}</div>
            <div class="talent-box-icon">${talent.ICON}</div>
            <div class="talent-box-name">${talent.NAME}</div>
            <div class="talent-box-description">${talent.DESCRIPTION}</div>
            <div class="talent-box-cost">${talent.COST} Orange Spore${talent.COST > 1 ? 's' : ''}</div>
        `;
        
        // Add click event
        if (!isUnlocked) {
            box.addEventListener('click', () => this.selectTalentBox(talent));
        }
        
        return box;
    }
    
    /**
     * Select a talent box
     */
    selectTalentBox(talent) {
        // Remove previous selection
        this.talentGrid.querySelectorAll('.talent-box.selected').forEach(box => {
            box.classList.remove('selected');
        });
        
        // Select new talent
        const talentBox = this.talentGrid.querySelector(`[data-talent-id="${talent.ID}"]`);
        if (talentBox) {
            talentBox.classList.add('selected');
        }
        
        this.selectedTalent = talent;
        this.showInfoPanel(talent);
    }
    
    /**
     * Show talent info panel
     */
    showInfoPanel(talent) {
        if (!this.talentInfoPanel) return;
        
        if (this.selectedTalentName) {
            this.selectedTalentName.textContent = talent.NAME;
        }
        if (this.selectedTalentDescription) {
            this.selectedTalentDescription.textContent = talent.DESCRIPTION;
        }
        if (this.selectedTalentCost) {
            this.selectedTalentCost.textContent = talent.COST;
        }
        
        this.talentInfoPanel.style.display = 'block';
        if (this.selectBtn) {
            this.selectBtn.disabled = false;
        }
    }
    
    /**
     * Hide talent info panel
     */
    hideInfoPanel() {
        if (this.talentInfoPanel) {
            this.talentInfoPanel.style.display = 'none';
        }
        if (this.selectBtn) {
            this.selectBtn.disabled = true;
        }
    }
    
    /**
     * Confirm talent selection
     */
    confirmSelection() {
        if (!this.selectedTalent) return;
        
        // Check if already unlocked
        if (this.playerTalents.has(this.selectedTalent.ID)) {
            console.log(`Talent ${this.selectedTalent.ID} already unlocked`);
            return;
        }
        
        // Apply talent effect
        this.applyTalentEffect(this.selectedTalent);
        
        // Mark talent as unlocked
        this.playerTalents.add(this.selectedTalent.ID);
        
        GameLogger.debug(`🧬 Talent unlocked: ${this.selectedTalent.NAME}`);
        
        // Hide popup after selection
        this.hidePopup();
    }
    
    /**
     * Apply talent effect to player
     */
    applyTalentEffect(talent) {
        if (!this.game.player) {
            console.error('No player found to apply talent effect');
            return;
        }
        
        switch (talent.ID) {
            case 'resilience':
                this.applyResilienceTalent();
                break;
            case 'speed_demon':
                this.applySpeedDemonTalent();
                break;
            case 'magnetic_field':
                this.applyMagneticFieldTalent();
                break;
            case 'regeneration':
                this.applyRegenerationTalent();
                break;
            case 'camouflage':
                this.applyCamouflageTalent();
                break;
            case 'predator':
                this.applyPredatorTalent();
                break;
            case 'energy_efficiency':
                this.applyEnergyEfficiencyTalent();
                break;
            case 'phase_shift':
                this.applyPhaseShiftTalent();
                break;
            default:
                console.warn(`Unknown talent effect: ${talent.ID}`);
        }
    }
    
    /**
     * Apply resilience talent effect
     */
    applyResilienceTalent() {
        if (!this.game.player) return;
        
        this.game.player.hasResilience = true;
        this.game.player.resilienceModifier = this.talents.RESILIENCE.EFFECT.VALUE;
        this.game.player.updateMaxSpeed();
        
        GameLogger.debug(`🛡️ Resilience: Speed reduction reduced by ${this.game.player.resilienceModifier * 100}%`);
    }
    
    /**
     * Apply speed demon talent effect
     */
    applySpeedDemonTalent() {
        if (!this.game.player) return;
        
        this.game.player.hasSpeedDemon = true;
        this.game.player.speedMultiplier = this.talents.SPEED_DEMON.EFFECT.VALUE;
        this.game.player.updateMaxSpeed();
        
        GameLogger.debug(`⚡ Speed Demon: Base speed increased by 25%`);
    }
    
    /**
     * Apply magnetic field talent effect
     */
    applyMagneticFieldTalent() {
        if (!this.game.player) return;
        
        this.game.player.hasMagneticField = true;
        this.game.player.sporeAttractionRadius = this.talents.MAGNETIC_FIELD.EFFECT.RADIUS;
        this.game.player.sporeAttractionStrength = this.talents.MAGNETIC_FIELD.EFFECT.STRENGTH;
        
        GameLogger.debug(`🧲 Magnetic Field: Attracts spores within ${this.game.player.sporeAttractionRadius}px`);
    }
    
    /**
     * Apply regeneration talent effect
     */
    applyRegenerationTalent() {
        if (!this.game.player) return;
        
        this.game.player.hasRegeneration = true;
        this.game.player.regenRate = this.talents.REGENERATION.EFFECT.VALUE;
        this.game.player.combatThreshold = this.talents.REGENERATION.EFFECT.COMBAT_THRESHOLD;
        
        GameLogger.debug(`💚 Regeneration: Heals ${this.game.player.regenRate} health/second when safe`);
    }
    
    /**
     * Apply camouflage talent effect
     */
    applyCamouflageTalent() {
        if (!this.game.player) return;
        
        this.game.player.hasCamouflage = true;
        this.game.player.visibilityReduction = this.talents.CAMOUFLAGE.EFFECT.VISIBILITY_REDUCTION;
        this.game.player.stationaryTimeThreshold = this.talents.CAMOUFLAGE.EFFECT.STATIONARY_TIME;
        
        GameLogger.debug(`👻 Camouflage: 30% less visible when stationary`);
    }
    
    /**
     * Apply predator talent effect
     */
    applyPredatorTalent() {
        if (!this.game.player) return;
        
        this.game.player.hasPredator = true;
        this.game.player.eatSizeModifier = this.talents.PREDATOR.EFFECT.VALUE;
        
        GameLogger.debug(`🦁 Predator: Can eat cells 15% larger`);
    }
    
    /**
     * Apply energy efficiency talent effect
     */
    applyEnergyEfficiencyTalent() {
        if (!this.game.player) return;
        
        this.game.player.hasEnergyEfficiency = true;
        this.game.player.growthMultiplier = this.talents.ENERGY_EFFICIENCY.EFFECT.VALUE;
        
        GameLogger.debug(`🔋 Energy Efficiency: 50% more growth from spores`);
    }
    
    /**
     * Apply phase shift talent effect
     */
    applyPhaseShiftTalent() {
        if (!this.game.player) return;
        
        this.game.player.hasPhaseShift = true;
        this.game.player.phaseShiftTriggerHealth = this.talents.PHASE_SHIFT.EFFECT.TRIGGER_HEALTH;
        this.game.player.phaseShiftDuration = this.talents.PHASE_SHIFT.EFFECT.DURATION;
        this.game.player.phaseShiftCooldown = this.talents.PHASE_SHIFT.EFFECT.COOLDOWN;
        this.game.player.phaseShiftLastUsed = 0;
        
        GameLogger.debug(`🌀 Phase Shift: Invulnerability when health drops below 25%`);
    }
    
    /**
     * Check if player has a specific talent
     */
    hasTalent(talentId) {
        return this.playerTalents.has(talentId);
    }
    
    /**
     * Get all unlocked talents
     */
    getUnlockedTalents() {
        return Array.from(this.playerTalents);
    }
    
    /**
     * Reset all talents (for testing)
     */
    resetTalents() {
        this.playerTalents.clear();
        if (this.game.player) {
            // Reset all talent flags
            this.game.player.hasResilience = false;
            this.game.player.hasSpeedDemon = false;
            this.game.player.hasMagneticField = false;
            this.game.player.hasRegeneration = false;
            this.game.player.hasCamouflage = false;
            this.game.player.hasPredator = false;
            this.game.player.hasEnergyEfficiency = false;
            this.game.player.hasPhaseShift = false;
            
            // Reset modifiers
            this.game.player.resilienceModifier = 1.0;
            this.game.player.speedMultiplier = 1.0;
            this.game.player.eatSizeModifier = 1.0;
            this.game.player.growthMultiplier = 1.0;
            
            // Update player
            this.game.player.updateMaxSpeed();
        }
        GameLogger.debug('🧬 All talents reset');
    }
}

// Export for use in other modules
window.TalentSystem = TalentSystem;