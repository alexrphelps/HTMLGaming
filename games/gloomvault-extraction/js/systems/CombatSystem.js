class CombatSystem {
    getElementConfig(element) {
        if (!element || typeof CombatConfig === 'undefined' || !CombatConfig.elemental) return null;
        return CombatConfig.elemental[element] || null;
    }

    getStatusEffect(target, type) {
        if (!target.statusEffects) target.statusEffects = [];
        return target.statusEffects.find(effect => effect.type === type);
    }

    applyStatusEffect(target, type, values = {}) {
        if (!target || !type) return null;
        if (!target.statusEffects) target.statusEffects = [];

        const existing = this.getStatusEffect(target, type);
        if (existing && !values.stackable) {
            Object.assign(existing, values, {
                type,
                durationLeft: Math.max(existing.durationLeft || 0, values.duration || values.durationLeft || 0)
            });
            return existing;
        }

        if (existing && values.stackable) {
            existing.stacks = Math.min(values.maxStacks || 99, (existing.stacks || 1) + 1);
            existing.durationLeft = values.duration || existing.durationLeft;
            existing.damagePerSecond = values.damagePerSecond || existing.damagePerSecond;
            return existing;
        }

        const effect = {
            type,
            durationLeft: values.duration || values.durationLeft || 0,
            damagePerSecond: values.damagePerSecond || 0,
            color: values.color || '#ffffff',
            slowMultiplier: values.slowMultiplier || 1,
            damageTakenMultiplier: values.damageTakenMultiplier || 1,
            stacks: values.stacks || 1,
            stackable: Boolean(values.stackable)
        };
        target.statusEffects.push(effect);
        return effect;
    }

    applyElementalHit(target, projectile) {
        if (!target || !projectile || !projectile.element) return;
        const config = this.getElementConfig(projectile.element);
        if (!config) return;

        const handlers = {
            frost: () => this.applyStatusEffect(target, 'frost', {
                duration: config.duration,
                slowMultiplier: config.slowMultiplier,
                color: config.color
            }),
            fire: () => this.applyStatusEffect(target, 'fire', {
                duration: config.duration,
                damagePerSecond: config.damagePerSecond,
                color: config.color
            }),
            felfire: () => this.applyStatusEffect(target, 'felfire', {
                duration: config.duration,
                damagePerSecond: config.damagePerSecond,
                maxStacks: config.maxStacks,
                stackable: true,
                color: config.color
            }),
            holy: () => this.applyStatusEffect(target, 'radiance', {
                duration: config.duration,
                color: config.color
            }),
            shadow: () => this.applyStatusEffect(target, 'amplify', {
                duration: config.duration,
                damageTakenMultiplier: config.damageTakenMultiplier,
                color: config.color
            }),
            poison: () => this.applyStatusEffect(target, 'sickness', {
                duration: config.duration,
                damagePerSecond: config.damagePerSecond,
                color: config.color
            })
        };

        if (handlers[projectile.element]) handlers[projectile.element]();
    }

    getDamageTakenMultiplier(target) {
        const amplify = this.getStatusEffect(target, 'amplify');
        return amplify ? amplify.damageTakenMultiplier || 1 : 1;
    }

    dealStatusDamage(engine, target, amount) {
        if (!target || amount <= 0) return 0;
        if (target === engine.player && typeof DevConfig !== 'undefined' && DevConfig.godMode) return 0;
        const previousHp = target.hp;
        target.hp = Math.max(0, target.hp - amount);
        return Math.max(0, previousHp - target.hp);
    }

    showStatusDamageText(engine, target, amount, color) {
        if (!target || amount <= 0 || !engine.combatFeedback || !engine.combatFeedback.addText) return;
        engine.combatFeedback.addText(`-${Math.round(amount)}`, target.x, target.y - 14, color || '#ff0000', 12, 0.75);
    }

    processStatusEffects(engine, target, dt) {
        if (!target || !target.statusEffects) return;
        let speedMultiplier = 1;

        for (let i = target.statusEffects.length - 1; i >= 0; i--) {
            const effect = target.statusEffects[i];
            effect.durationLeft -= dt;
            if (effect.type === 'frost') {
                speedMultiplier = Math.min(speedMultiplier, effect.slowMultiplier || 1);
            }

            if (effect.damagePerSecond > 0) {
                const actualDamage = this.dealStatusDamage(engine, target, effect.damagePerSecond * (effect.stacks || 1) * dt);
                if (actualDamage > 0) {
                    effect.damageTextAccumulator = (effect.damageTextAccumulator || 0) + actualDamage;
                    effect.damageTextTimer = (effect.damageTextTimer || 0) + dt;
                    const shouldShowDamageText = effect.damageTextTimer >= 0.5 || target.hp <= 0 || effect.durationLeft <= 0;
                    if (shouldShowDamageText && effect.damageTextAccumulator >= 0.5) {
                        this.showStatusDamageText(engine, target, effect.damageTextAccumulator, effect.color);
                        effect.damageTextAccumulator = 0;
                        effect.damageTextTimer = 0;
                    }
                }
            }

            if (effect.durationLeft <= 0) {
                target.statusEffects.splice(i, 1);
            }
        }

        target.statusSpeedMultiplier = speedMultiplier;
    }

    hasStatusEffect(target, type) {
        return Boolean(target && target.statusEffects && target.statusEffects.some(effect => effect.type === type));
    }
}

if (typeof window !== 'undefined') {
    window.CombatSystem = CombatSystem;
}
