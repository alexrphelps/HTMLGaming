class RunState {
    constructor(options = {}) {
        this.mapConfigs = options.mapConfigs || (typeof MapConfigs !== 'undefined' ? MapConfigs : {});
        const defaultConfig = this.mapConfigs.default || Object.values(this.mapConfigs)[0] || {};
        this.state = options.state || 'MENU';
        this.currentFloor = options.currentFloor || 1;
        this.runMapSelection = options.runMapSelection || 'random';
        this.currentMapKey = options.currentMapKey || 'default';
        this.currentMapConfig = options.currentMapConfig || defaultConfig;
        this.gearDifficultyFloor = options.gearDifficultyFloor || 1;
        this.playerGearScore = options.playerGearScore || 10;
    }

    syncFromEngine(engine) {
        if (!engine) return this;
        this.state = engine.state || this.state;
        this.currentFloor = engine.currentFloor || this.currentFloor;
        this.runMapSelection = engine.runMapSelection || this.runMapSelection;
        this.currentMapKey = engine.currentMapKey || this.currentMapKey;
        this.currentMapConfig = engine.currentMapConfig || this.currentMapConfig;
        this.gearDifficultyFloor = engine.gearDifficultyFloor || this.gearDifficultyFloor;
        this.playerGearScore = engine.playerGearScore || this.playerGearScore;
        return this;
    }

    syncToEngine(engine) {
        if (!engine) return this;
        engine.state = this.state;
        engine.currentFloor = this.currentFloor;
        engine.runMapSelection = this.runMapSelection;
        engine.currentMapKey = this.currentMapKey;
        engine.currentMapConfig = this.currentMapConfig;
        engine.gearDifficultyFloor = this.gearDifficultyFloor;
        engine.playerGearScore = this.playerGearScore;
        return this;
    }

    setRunMapSelection(mapKey) {
        this.runMapSelection = mapKey === 'random' || this.mapConfigs[mapKey] ? mapKey : 'random';
        return this.runMapSelection;
    }

    selectMapConfig() {
        if (this.runMapSelection && this.runMapSelection !== 'random' && this.mapConfigs[this.runMapSelection]) {
            return { key: this.runMapSelection, config: this.mapConfigs[this.runMapSelection] };
        }

        const configKeys = Object.keys(this.mapConfigs);
        const randomKey = configKeys[Math.floor(Math.random() * configKeys.length)];
        return { key: randomKey, config: this.mapConfigs[randomKey] };
    }

    applyMapSelection(selection) {
        if (!selection) return this;
        this.currentMapKey = selection.key;
        this.currentMapConfig = selection.config;
        return this;
    }

    getEffectiveFloorLevel() {
        return (this.currentFloor - 1) + (this.gearDifficultyFloor || 1);
    }

    resetForNewRun(gearScore, difficultyConfig = null) {
        const minFloor = difficultyConfig && Number.isFinite(difficultyConfig.minStartingFloor)
            ? difficultyConfig.minStartingFloor
            : 1;
        const gsPerFloor = difficultyConfig && Number.isFinite(difficultyConfig.gearScorePerFloor)
            ? difficultyConfig.gearScorePerFloor
            : 40;
        this.playerGearScore = gearScore || 0;
        this.gearDifficultyFloor = Math.max(minFloor, Math.floor(this.playerGearScore / gsPerFloor));
        this.currentFloor = 1;
        return this;
    }

    descend(difficultyConfig = null) {
        const increment = difficultyConfig && Number.isFinite(difficultyConfig.descentFloorIncrement)
            ? difficultyConfig.descentFloorIncrement
            : 1;
        this.currentFloor += increment;
        return this.currentFloor;
    }
}

if (typeof window !== 'undefined') {
    window.RunState = RunState;
}
