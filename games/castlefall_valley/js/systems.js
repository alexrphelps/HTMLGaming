  function reset() {
    const viewport = {
      w: state.w,
      h: state.h,
      scale: state.scale,
      last: performance.now(),
      keys: {}
    };

    resetState(state);
    Object.assign(state, viewport);
    state.hero = createHeroState();

    for (const [type, side] of INITIAL_UNIT_LOADOUT) {
      spawnUnit(type, side, false);
    }

    document.getElementById("endOverlay").style.display = "none";
    showMessage("Hold the valley. Build your base. Break their castle.");
    updateUI();
  }

  window.CastlefallValley.restartGame = reset;

  function update(dt) {
    if (state.paused || state.gameOver) return;

    state.time += dt;

    updateSpawnCooldowns(dt);
    updateHero(dt);
    updateUnits(dt);
    updateProjectiles(dt);
    updateEnemyAI(dt);
    updateEconomy(dt);
    updateParticles(dt);
    updateCamera(dt);
    checkEnd();

    if (state.messageTimer > 0) {
      state.messageTimer -= dt;
      if (state.messageTimer <= 0) {
        document.getElementById("message").classList.remove("show");
      }
    }

    state.uiTimer -= dt;
    if (state.uiTimer <= 0) {
      state.uiTimer = 0.12;
      updateUI();
    }
  }

  function updateUnits(dt) {
    const playerCommand = state.command;

    for (const u of state.units) {
      u.attackTimer -= dt;
      u.flash -= dt;

      const ground = terrainY(u.x);
      u.y = ground;

      const target = nearestEnemy(u);
      let moveDir = u.side;
      let desiredSpeed = u.speed;
      let hold = false;

      if (u.side === 1) {
        if (playerCommand === "rush") {
          desiredSpeed *= 1.45;
        }

        if (playerCommand === "retreat") {
          moveDir = -1;
          desiredSpeed *= 1.18;
          if (u.x < state.playerCastle.x + 135) hold = true;
        }

        if (playerCommand === "formation") {
          const shield = nearestAllyRole(u, "defense");
          const melee = nearestAllyRole(u, "melee");

          if (u.role === "ranged" || u.role === "support") {
            const anchor = melee || shield;
            if (anchor) {
              const preferred = anchor.x - 130;
              if (u.x > preferred + 20) moveDir = -1;
              else if (u.x < preferred - 60) moveDir = 1;
              else hold = true;
            }
          }

          if (u.role === "melee") {
            if (shield && shield.x > u.x + 45) {
              moveDir = 1;
            } else if (shield && u.x > shield.x - 18) {
              moveDir = -0.2;
            }
          }

          if (u.role === "defense") {
            desiredSpeed *= 0.92;
          }
        }
      }

      if (u.side === -1) {
        desiredSpeed *= 1 + state.wave * 0.018;
        if (state.time > 50 && Math.random() < 0.002) desiredSpeed *= 1.3;
      }

      const slope = terrainSlope(u.x);
      const goingDownhill = (moveDir > 0 && slope > 0) || (moveDir < 0 && slope < 0);
      const goingUphill = (moveDir > 0 && slope < 0) || (moveDir < 0 && slope > 0);

      if (goingDownhill) {
        desiredSpeed *= 1.12;
        u.chargeStored = clamp(u.chargeStored + dt * 15, 0, 18);
      }

      if (goingUphill) {
        desiredSpeed *= 0.82;
        u.chargeStored *= 0.98;
      }

      if (target && !target.castle) {
        const dist = Math.abs(target.x - u.x);

        if (u.role === "ranged") {
          if (dist < u.range && dist > 80) {
            hold = true;
          }
          if (dist < 65) {
            moveDir = -u.side;
            hold = false;
          }
        }

        if (u.role === "support") {
          const wounded = state.units.find(a =>
            a.side === u.side &&
            a.hp < a.maxHp * 0.72 &&
            Math.abs(a.x - u.x) < 180
          );
          if (wounded && u.attackTimer <= 0) {
            u.attackTimer = u.attackCd;
            const chapelBonus = u.side === 1 ? state.playerCastle.chapel * 4 : 0;
            wounded.hp = Math.min(wounded.maxHp, wounded.hp + 16 + chapelBonus);
            addFloatText(wounded.x, terrainY(wounded.x) - 45, "+heal", "#baffcf");
            particle(wounded.x, terrainY(wounded.x) - 18, "#baffcf", 5);
            hold = true;
          }
        }

        if (dist <= u.range && u.attackTimer <= 0) {
          u.attackTimer = u.attackCd;
          if (u.role === "ranged") {
            fireProjectile(u, target);
          } else if (u.role !== "support") {
            let damage = u.dmg;
            if (u.chargeStored > 7 && unitDefs[u.type].charge) {
              damage += u.chargeStored * 1.4;
              addFloatText(u.x, terrainY(u.x) - 58, "CHARGE", "#ffd76d");
              state.shake = Math.max(state.shake, 4);
              u.chargeStored = 0;
            }
            damageUnit(target, damage, u.x);
          }
        }

        if (dist < u.range * 0.75 && u.role !== "ranged") {
          hold = true;
        }
      }

      if (target && target.castle) {
        if (target.dist < 80) {
          hold = true;
          if (u.attackTimer <= 0) {
            u.attackTimer = u.attackCd;
            const castle = u.side === 1 ? state.enemyCastle : state.playerCastle;
            const damage = u.type === "shield" ? 4 : u.dmg * 0.55;
            castle.hp -= damage;
            addFloatText(castle.x, terrainY(castle.x) - 125, "-" + Math.round(damage), u.side === 1 ? "#ffcccc" : "#cce2ff");
            particle(castle.x + rand(-20,20), terrainY(castle.x) - rand(50,110), "#805b37", 3);
            state.shake = Math.max(state.shake, 2.2);
          }
        }
      }

      if (!hold) {
        u.vx = moveDir * desiredSpeed;
      } else {
        u.vx *= 0.4;
      }

      u.x += u.vx * dt;
      u.x = clamp(u.x, 70, WORLD_W - 70);
    }

    state.units = state.units.filter(u => u.hp > 0);
  }

  function updateEnemyAI(dt) {
    state.spawnTimers.enemy -= dt;

    const pressure = 4.2 - Math.min(2.2, state.time / 65) - Math.min(0.8, state.wave * 0.04);
    if (state.spawnTimers.enemy <= 0) {
      state.spawnTimers.enemy = rand(pressure * 0.7, pressure * 1.35);
      spawnUnit(chooseEnemySpawnType(activeEnemyWave()), -1, false);
    }

    if (Math.floor(state.time / enemyWavePlan.waveLength) + 1 > state.wave) {
      state.wave++;
      showMessage(activeEnemyWave().name + ": enemy wave " + state.wave + " arrives.");
      for (const type of enemyWavePlan.reinforcements) {
        spawnUnit(type, -1, false);
      }
    }
  }

  function activeEnemyWave() {
    if (state.time < enemyWavePlan.opening.until) return enemyWavePlan.opening;
    if (state.time < enemyWavePlan.mid.until) return enemyWavePlan.mid;
    return enemyWavePlan.late;
  }

  function chooseEnemySpawnType(plan) {
    const roll = Math.random();
    const match = plan.weights.find(([, threshold]) => roll < threshold);
    return match ? match[0] : plan.weights[plan.weights.length - 1][0];
  }

  function updateEconomy(dt) {
    state.spawnTimers.income += dt;
    state.spawnTimers.morale += dt;

    if (state.spawnTimers.income >= 1) {
      state.spawnTimers.income -= 1;
      const centerControl = clamp((frontlineX() - WORLD_W * 0.5) / 450, -1, 1);
      const moraleIncome = state.morale > 70 ? 2 : state.morale < 30 ? -1 : 0;
      state.gold += state.income + moraleIncome + Math.max(0, Math.floor(centerControl * 2));
      state.gold = Math.floor(state.gold);
    }

    if (state.spawnTimers.morale >= 1.5) {
      state.spawnTimers.morale = 0;
      const f = frontlineX();
      if (f > WORLD_W * 0.52) state.morale = clamp(state.morale + 1.2, 0, 100);
      if (f < WORLD_W * 0.42) state.morale = clamp(state.morale - 1.2, 0, 100);
      if (state.playerCastle.chapel) state.morale = clamp(state.morale + 0.35 * state.playerCastle.chapel, 0, 100);
    }

    if (state.playerCastle.tower > 0) {
      state.playerCastle.towerTimer -= dt;
      if (state.playerCastle.towerTimer <= 0) {
        state.playerCastle.towerTimer = Math.max(0.55, 1.6 - state.playerCastle.tower * 0.18);
        const target = selectTowerTarget(-1, 1250, "front");
        if (target) {
          const fake = {
            x: state.playerCastle.x + 35,
            side: 1,
            dmg: 16 + state.playerCastle.tower * 5
          };
          fireProjectile(fake, target);
        }
      }
    }

    state.enemyCastle.towerTimer -= dt;
    if (state.enemyCastle.towerTimer <= 0) {
      state.enemyCastle.towerTimer = Math.max(0.7, 2.1 - state.wave * 0.05);
      const target = selectTowerTarget(1, WORLD_W - 1250, "rear");
      if (target) {
        const fake = {
          x: state.enemyCastle.x - 35,
          side: -1,
          dmg: 13 + state.wave * 1.5
        };
        fireProjectile(fake, target);
      }
    }
  }

  function selectTowerTarget(side, boundary, priority) {
    let best = null;
    for (const unit of state.units) {
      if (unit.side !== side) continue;
      if (priority === "front" && unit.x >= boundary) continue;
      if (priority === "rear" && unit.x <= boundary) continue;
      if (!best) {
        best = unit;
      } else if (priority === "front" && unit.x < best.x) {
        best = unit;
      } else if (priority === "rear" && unit.x > best.x) {
        best = unit;
      }
    }
    return best;
  }

  function updateCamera(dt) {
    const f = frontlineX();
    const desired = clamp((state.hero.x * 0.65 + f * 0.35) - state.w * 0.48, 0, WORLD_W - state.w);
    state.cameraX = lerp(state.cameraX, desired, 1 - Math.pow(0.001, dt));

    if (state.shake > 0) {
      state.shake *= Math.pow(0.04, dt);
    }
  }

  function checkEnd() {
    if (state.enemyCastle.hp <= 0) {
      endGame(true);
    }
    if (state.playerCastle.hp <= 0) {
      endGame(false);
    }
  }

  function endGame(victory) {
    if (state.gameOver) return;
    state.gameOver = true;
    document.getElementById("endOverlay").style.display = "grid";
    document.getElementById("endTitle").textContent = victory ? "Victory at Castlefall Valley" : "Castlefall Has Fallen";
    document.getElementById("endText").textContent = victory
      ? "Your banners pushed through the terraced valley and shattered the enemy keep."
      : "The enemy broke your formations and overran your castle.";
  }

  function setCommand(cmd) {
    const def = commandDefs[cmd];
    if (!def) return;

    state.command = cmd;
    showMessage("Command stance: " + def.label);
    updateUI();
  }

  function build(type) {
    const def = buildDefs[type];
    if (!def) return false;

    if (state.gold < def.cost) {
      showMessage("Not enough gold for that build.");
      return false;
    }

    state.gold -= def.cost;
    def.apply(state);
    showMessage(def.message);

    updateUI();
    return true;
  }

  function updateHero(dt) {
    const h = state.hero;
    const left = state.keys["a"] || state.keys["arrowleft"];
    const right = state.keys["d"] || state.keys["arrowright"];
    const jump = state.keys["w"] || state.keys[" "] || state.keys["arrowup"];

    let ax = 0;
    if (left) ax -= 1;
    if (right) ax += 1;

    if (ax !== 0) h.facing = ax;

    h.vx += ax * 850 * dt;
    h.vx *= Math.pow(0.001, dt);
    h.vx = clamp(h.vx, -235, 235);

    if (jump && h.onGround) {
      h.vy = -390;
      h.onGround = false;
      particle(h.x, h.y + h.h / 2, "#d8c7ac", 5);
    }

    h.vy += GRAVITY * 900 * dt;
    h.x += h.vx * dt;
    h.y += h.vy * dt;

    h.x = clamp(h.x, 80, WORLD_W - 80);

    const ground = terrainY(h.x) - h.h;
    if (h.y >= ground) {
      h.y = ground;
      h.vy = 0;
      h.onGround = true;
    }

    h.attackTimer -= dt;
    h.hurtTimer -= dt;

    if (state.keys["j"] && h.attackTimer <= 0) {
      heroAttack();
    }

    if (h.hp <= 0) {
      h.hp = h.maxHp;
      h.x = state.playerCastle.x + 90;
      h.y = terrainY(h.x) - h.h;
      state.morale = clamp(state.morale - 15, 0, 100);
      state.playerCastle.hp -= 35;
      showMessage("The Banner Knight was rescued at the castle. Morale falls.");
      particle(h.x, h.y, "#ff6b6b", 20);
    }
  }

  function updateSpawnCooldowns(dt) {
    for (const type of UNIT_ORDER) {
      state.spawnCooldowns[type] = Math.max(0, (state.spawnCooldowns[type] || 0) - dt);
    }
  }

Object.assign(window.CastlefallValley, { reset, updateHero, updateUnits, updateEnemyAI, activeEnemyWave, chooseEnemySpawnType, updateEconomy, selectTowerTarget, updateCamera, checkEnd, endGame, setCommand, build, update, updateSpawnCooldowns });
