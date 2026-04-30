/**
 * Developer Mode Configuration
 * Set DEV_MODE_ENABLED to true to unlock the in-game debug panel.
 * Toggle the panel with the backtick (`) key during gameplay.
 * All overrides reset when the panel is closed.
 */
const DevConfig = {
    // Master toggle - set to true to enable developer mode
    DEV_MODE_ENABLED: true,

    // --- Session Overrides (managed by DevPanel, reset on hide) ---
    godMode: false,
    enemyHpMultiplier: 1.0,
    enemyDmgMultiplier: 1.0,
    enemyCountMultiplier: 1.0,
    dropRate: 0.2,              // Default 20%
    playerSpeedMultiplier: 1.0,

    // Defaults for reset
    _defaults: {
        godMode: false,
        enemyHpMultiplier: 1.0,
        enemyDmgMultiplier: 1.0,
        enemyCountMultiplier: 1.0,
        dropRate: 0.2,
        playerSpeedMultiplier: 1.0
    },

    resetAll() {
        for (const key in this._defaults) {
            this[key] = this._defaults[key];
        }
    }
};
