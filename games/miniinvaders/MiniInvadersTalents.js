/**
 * Pure talent rules for Mini Invaders.
 */
(function () {
    const TALENT_LIMITS = {
        rapidFire: 5,
        cooling: 5,
        spreadShot: 4,
        shipSpeed: 5,
        gunPower: 3,
        shield: 3,
        duplicate: 1,
        tacticalNuke: 1
    };

    function createDefaultTalents() {
        return window.createMiniInvadersTalents();
    }

    function calculateTierUnlocks(talents) {
        const tier2Unlocked = talents.rapidFire > 0 ||
            talents.cooling > 0 ||
            talents.shipSpeed > 0;
        const tier3Unlocked = talents.spreadShot > 0 ||
            talents.gunPower > 0 ||
            talents.overheatReduction;
        return { tier2Unlocked, tier3Unlocked };
    }

    function refreshTierUnlocks(gameState) {
        const unlocks = calculateTierUnlocks(gameState.talents);
        gameState.tier2Unlocked = unlocks.tier2Unlocked;
        gameState.tier3Unlocked = unlocks.tier3Unlocked;
        return unlocks;
    }

    function resetTalentLoadout(gameState) {
        const returnedPoints = gameState.spentTalentPoints;
        gameState.talentPoints += returnedPoints;
        gameState.spentTalentPoints = 0;
        gameState.talents = createDefaultTalents();
        gameState.fireRateLevel = 0;
        gameState.spreadShotCount = 1;
        gameState.cooldownLevel = 0;
        gameState.playerShieldCount = 0;
        gameState.playerShieldActive = false;
        gameState.maxShieldCount = 0;
        gameState.nukeCount = 0;
        gameState.maxNukeCount = 0;
        gameState.gunPowerLevel = 0;
        gameState.duplicatePlayer = null;
        gameState.duplicateCount = 0;
        gameState.maxDuplicateCount = 0;
        refreshTierUnlocks(gameState);
        return returnedPoints;
    }

    function isTierLocked(gameState, cost) {
        refreshTierUnlocks(gameState);
        return (cost === 2 && !gameState.tier2Unlocked) ||
            (cost === 3 && !gameState.tier3Unlocked);
    }

    function isMaxed(gameState, talent) {
        const talents = gameState.talents;
        switch (talent) {
            case 'rapidFire':
            case 'cooling':
            case 'spreadShot':
            case 'shipSpeed':
            case 'gunPower':
                return talents[talent] >= TALENT_LIMITS[talent];
            case 'overheatReduction':
                return talents.overheatReduction;
            case 'shield':
                return gameState.maxShieldCount >= TALENT_LIMITS.shield &&
                    gameState.playerShieldCount >= gameState.maxShieldCount;
            case 'duplicate':
                return gameState.maxDuplicateCount >= TALENT_LIMITS.duplicate &&
                    gameState.duplicateCount >= gameState.maxDuplicateCount;
            case 'tacticalNuke':
                return gameState.nukeCount >= TALENT_LIMITS.tacticalNuke;
            default:
                return true;
        }
    }

    function canPurchaseTalent(gameState, talent, cost) {
        if (gameState.talentPoints < cost) return false;
        if (isTierLocked(gameState, cost)) return false;
        return !isMaxed(gameState, talent);
    }

    function applyTalentPurchase(gameState, talent, cost) {
        if (!canPurchaseTalent(gameState, talent, cost)) {
            return { purchased: false, action: null };
        }

        const talents = gameState.talents;
        let action = null;

        switch (talent) {
            case 'rapidFire':
                talents.rapidFire++;
                gameState.fireRateLevel++;
                break;
            case 'cooling':
                talents.cooling++;
                gameState.cooldownLevel++;
                break;
            case 'spreadShot':
                talents.spreadShot++;
                gameState.spreadShotCount++;
                break;
            case 'shipSpeed':
                talents.shipSpeed++;
                break;
            case 'gunPower':
                talents.gunPower++;
                gameState.gunPowerLevel = talents.gunPower;
                break;
            case 'overheatReduction':
                talents.overheatReduction = true;
                break;
            case 'shield':
                if (gameState.maxShieldCount === 0) {
                    gameState.maxShieldCount = 1;
                }
                if (gameState.playerShieldCount < gameState.maxShieldCount) {
                    gameState.playerShieldCount++;
                } else {
                    gameState.maxShieldCount++;
                    gameState.playerShieldCount++;
                }
                talents.shield = gameState.playerShieldCount;
                break;
            case 'duplicate':
                talents.duplicate = Math.min(talents.duplicate + 1, TALENT_LIMITS.duplicate);
                gameState.maxDuplicateCount = Math.max(gameState.maxDuplicateCount, talents.duplicate);
                gameState.duplicateCount = gameState.maxDuplicateCount;
                action = 'createDuplicateShip';
                break;
            case 'tacticalNuke':
                gameState.maxNukeCount = Math.max(gameState.maxNukeCount, TALENT_LIMITS.tacticalNuke);
                gameState.nukeCount = TALENT_LIMITS.tacticalNuke;
                talents.tacticalNuke = gameState.nukeCount;
                break;
            default:
                return { purchased: false, action: null };
        }

        gameState.talentPoints -= cost;
        gameState.spentTalentPoints += cost;
        refreshTierUnlocks(gameState);
        return { purchased: true, action };
    }

    function getTalentButtonState(gameState, talent, cost) {
        refreshTierUnlocks(gameState);
        let count = '';
        let disabled = false;

        if (cost === 2 && !gameState.tier2Unlocked) {
            return { disabled: true, count: 'LOCKED', owned: true };
        }
        if (cost === 3 && !gameState.tier3Unlocked) {
            return { disabled: true, count: 'LOCKED', owned: true };
        }

        switch (talent) {
            case 'rapidFire':
            case 'cooling':
            case 'spreadShot':
            case 'shipSpeed':
            case 'gunPower':
                count = gameState.talents[talent] > 0 ? `(${gameState.talents[talent]}/${TALENT_LIMITS[talent]})` : '';
                disabled = isMaxed(gameState, talent);
                break;
            case 'overheatReduction':
                count = gameState.talents.overheatReduction ? 'YES' : '';
                disabled = gameState.talents.overheatReduction;
                break;
            case 'shield':
                count = gameState.maxShieldCount > 0 ? `(${gameState.talents.shield}/${TALENT_LIMITS.shield})` : '';
                disabled = isMaxed(gameState, talent);
                break;
            case 'duplicate':
                count = gameState.maxDuplicateCount > 0 ? `(${gameState.duplicateCount}/${TALENT_LIMITS.duplicate})` : '';
                disabled = isMaxed(gameState, talent);
                break;
            case 'tacticalNuke':
                count = gameState.maxNukeCount > 0 ? `(${gameState.nukeCount}/${TALENT_LIMITS.tacticalNuke})` : '';
                disabled = isMaxed(gameState, talent);
                break;
            default:
                disabled = true;
        }

        disabled = disabled || gameState.talentPoints < cost;
        return { disabled, count, owned: Boolean(count) };
    }

    function hasPurchasableTalents(gameState) {
        const candidates = [
            ['rapidFire', 1],
            ['cooling', 1],
            ['shipSpeed', 1],
            ['spreadShot', 2],
            ['gunPower', 2],
            ['overheatReduction', 2],
            ['shield', 3],
            ['duplicate', 3],
            ['tacticalNuke', 3]
        ];
        return candidates.some(([talent, cost]) => canPurchaseTalent(gameState, talent, cost));
    }

    if (typeof window !== 'undefined') {
        window.MiniInvadersTalents = {
            TALENT_LIMITS,
            createDefaultTalents,
            calculateTierUnlocks,
            refreshTierUnlocks,
            resetTalentLoadout,
            canPurchaseTalent,
            applyTalentPurchase,
            getTalentButtonState,
            hasPurchasableTalents
        };
    }
})();
