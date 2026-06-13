class BossBehaviorService {
    initialize(enemy) {
        if (!enemy.bossProfile || !enemy.bossRuntime) return;
        if (enemy.bossProfile.modifier && enemy.bossProfile.modifier.apply) {
            enemy.bossProfile.modifier.apply(enemy);
        }
        if (enemy.bossProfile.borrowedPower && enemy.bossProfile.borrowedPower.apply) {
            enemy.bossProfile.borrowedPower.apply(enemy);
        }
    }

    triggerHook(enemy, hookName, engine, payload = {}) {
        if (!enemy.bossProfile || !enemy.bossProfile.hooks) return;
        const hook = enemy.bossProfile.hooks[hookName];
        if (hook) hook(enemy, engine, payload.dt || 0, payload);
    }

    checkThresholds(enemy, engine) {
        if (!enemy.bossProfile || !Array.isArray(enemy.bossProfile.thresholds) || !enemy.bossRuntime) return;
        for (const thresholdDef of enemy.bossProfile.thresholds) {
            if (!thresholdDef || enemy.bossRuntime.thresholdsTriggered[thresholdDef.id]) continue;
            if ((enemy.hp / enemy.maxHp) <= thresholdDef.threshold) {
                enemy.bossRuntime.thresholdsTriggered[thresholdDef.id] = true;
                if (thresholdDef.handler) thresholdDef.handler(enemy, engine);
                this.triggerHook(enemy, 'onHealthThreshold', engine, { threshold: thresholdDef.threshold, thresholdId: thresholdDef.id });
            }
        }
    }

    updateRuntime(enemy, dt, player, mapGen, pathfinder, context) {
        if (!enemy.bossProfile || !enemy.bossRuntime) return [];
        if (enemy.bossRuntime.borrowedPowerTimer > 0) {
            enemy.bossRuntime.borrowedPowerTimer -= dt;
        }

        if (enemy.isBloodied()) {
            enemy.speed = enemy.baseSpeed * (enemy.bossRuntime.bloodiedSpeedMultiplier || 1);
            if (enemy.weapon) {
                enemy.weapon.cooldown = enemy.weapon.baseCooldown * (enemy.bossRuntime.bloodiedCooldownMultiplier || 1);
            }
        } else {
            enemy.speed = enemy.baseSpeed;
            if (enemy.weapon) {
                enemy.weapon.cooldown = enemy.weapon.baseCooldown;
            }
        }

        this.triggerHook(enemy, 'onUpdate', context.engine, { dt, player, mapGen, pathfinder, context });
        return [];
    }

    tryUseBorrowedPower(enemy, player, context) {
        if (!enemy.bossProfile || !enemy.bossProfile.borrowedPower || !context || !context.engine || enemy.bossRuntime.borrowedPowerTimer > 0) {
            return false;
        }

        const used = context.engine.triggerBorrowedBossPower(enemy, enemy.bossProfile.borrowedPower, player);
        if (used) {
            enemy.bossRuntime.borrowedPowerTimer = enemy.bossProfile.borrowedPower.cooldown || 6;
        }
        return used;
    }
}

if (typeof window !== 'undefined') {
    window.BossBehaviorService = BossBehaviorService;
}
