window.GravityLocksmith = window.GravityLocksmith || {};

(function(ns) {
  "use strict";

  function glowRect(ctx, x, y, width, height, color, alpha) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.fillRect(x, y, width, height);
    ctx.restore();
  }

  function uiScale(state) {
    return state.config.world.width / 960;
  }

  function drawBackground(ctx, state) {
    const gradient = ctx.createLinearGradient(0, 0, 0, state.config.world.height);
    if (state.roomState.gravity === 1) {
      gradient.addColorStop(0, "#070817");
      gradient.addColorStop(1, "#101335");
    } else {
      gradient.addColorStop(0, "#101335");
      gradient.addColorStop(1, "#070817");
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, state.config.world.width, state.config.world.height);

    for (const star of state.stars) {
      ctx.globalAlpha = star.a + Math.sin(state.session.clock * 2 + star.x) * 0.08;
      ctx.fillStyle = "#cbeaff";
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.strokeStyle = "rgba(85,247,255,0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x < state.config.world.width; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + Math.sin(state.session.clock + x * 0.25) * 8, state.config.world.height);
      ctx.stroke();
    }
  }

  function drawPlatforms(ctx, state) {
    for (const platform of state.room.platforms) {
      ctx.fillStyle = "rgba(16, 24, 58, 0.96)";
      ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
      ctx.fillStyle = "rgba(85,247,255,0.85)";
      ctx.fillRect(platform.x, platform.y, platform.w, 4);
      ctx.fillStyle = "rgba(85,247,255,0.16)";
      ctx.fillRect(platform.x, platform.y + 4, platform.w, platform.h - 4);
    }

    for (const mover of state.roomState.movers) {
      glowRect(ctx, mover.x, mover.y, mover.w, mover.h, "rgba(255,217,106,0.75)", 1);
      ctx.fillStyle = "rgba(255,217,106,0.18)";
      ctx.fillRect(mover.x, mover.y + 5, mover.w, mover.h - 5);
    }

    for (const gate of state.roomState.gates) {
      ctx.save();
      ctx.globalAlpha = gate.open ? 0.28 : 1;
      ctx.shadowColor = gate.open ? "#75ff9d" : "#55f7ff";
      ctx.shadowBlur = gate.open ? 10 : 22;
      ctx.fillStyle = gate.open ? "rgba(117,255,157,0.18)" : "rgba(85,247,255,0.32)";
      ctx.fillRect(gate.x, gate.y, gate.w, gate.h);
      ctx.strokeStyle = gate.open ? "rgba(117,255,157,0.6)" : "#55f7ff";
      ctx.lineWidth = 5;
      ctx.strokeRect(gate.x, gate.y, gate.w, gate.h);
      ctx.fillStyle = gate.open ? "#75ff9d" : "#edf7ff";
      ctx.font = "700 24px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(gate.open ? "OPEN" : "LOCK", gate.x + gate.w / 2, gate.y + gate.h / 2 + 8);
      ctx.restore();
    }
  }

  function drawSpikes(ctx, state) {
    for (const spike of state.room.spikes) {
      const count = Math.max(1, Math.floor(spike.w / 24));
      ctx.fillStyle = "#ff4d6d";
      ctx.shadowColor = "#ff4d6d";
      ctx.shadowBlur = 12;

      for (let index = 0; index < count; index++) {
        const x = spike.x + index * (spike.w / count);
        const width = spike.w / count;
        ctx.beginPath();
        if (spike.dir === -1) {
          ctx.moveTo(x, spike.y + spike.h);
          ctx.lineTo(x + width / 2, spike.y);
          ctx.lineTo(x + width, spike.y + spike.h);
        } else {
          ctx.moveTo(x, spike.y);
          ctx.lineTo(x + width / 2, spike.y + spike.h);
          ctx.lineTo(x + width, spike.y);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }
  }

  function drawExit(ctx, state) {
    const allCollected = state.roomState.shards.every(function(shard) {
      return shard.got;
    });
    const exit = state.room.exit;
    ctx.save();
    ctx.shadowColor = allCollected ? "#75ff9d" : "#55f7ff";
    ctx.shadowBlur = allCollected ? 28 : 14;
    ctx.fillStyle = allCollected ? "rgba(117,255,157,0.22)" : "rgba(85,247,255,0.12)";
    ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
    ctx.strokeStyle = allCollected ? "#75ff9d" : "rgba(85,247,255,0.65)";
    ctx.lineWidth = 4;
    ctx.strokeRect(exit.x, exit.y, exit.w, exit.h);
    ctx.fillStyle = allCollected ? "#75ff9d" : "rgba(237,247,255,0.55)";
    ctx.beginPath();
    ctx.arc(exit.x + exit.w / 2, exit.y + exit.h / 2, 10 + Math.sin(state.session.clock * 6.6667) * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawShards(ctx, state) {
    for (const shard of state.roomState.shards) {
      if (shard.got) continue;
      const y = shard.y + Math.sin(state.session.clock * 4 + shard.bob) * 6;
      ctx.save();
      ctx.translate(shard.x + shard.w / 2, y + shard.h / 2);
      ctx.rotate(state.session.clock * 2);
      ctx.shadowColor = "#ffd96a";
      ctx.shadowBlur = 22;
      ctx.fillStyle = "#ffd96a";
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(14, 0);
      ctx.lineTo(0, 18);
      ctx.lineTo(-14, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff5bd";
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const battery of state.roomState.flipBatteries) {
      if (battery.got) continue;
      const y = battery.y + Math.sin(state.session.clock * 5 + battery.bob) * 5;
      ctx.save();
      ctx.translate(battery.x + battery.w / 2, y + battery.h / 2);
      ctx.shadowColor = "#55f7ff";
      ctx.shadowBlur = 24;
      ctx.fillStyle = "rgba(85,247,255,0.22)";
      ctx.fillRect(-15, -19, 30, 38);
      ctx.strokeStyle = "#ffd96a";
      ctx.lineWidth = 4;
      ctx.strokeRect(-15, -19, 30, 38);
      ctx.fillStyle = "#ffd96a";
      ctx.fillRect(-6, -25, 12, 6);
      ctx.fillRect(-7, -10, 14, 20);
      ctx.restore();
    }

    for (const battery of state.roomState.jumpBatteries) {
      if (battery.got) continue;
      const y = battery.y + Math.sin(state.session.clock * 5 + battery.bob) * 5;
      ctx.save();
      ctx.translate(battery.x + battery.w / 2, y + battery.h / 2);
      ctx.shadowColor = "#ffd96a";
      ctx.shadowBlur = 24;
      ctx.fillStyle = "rgba(255,217,106,0.24)";
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#55f7ff";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-8, 8);
      ctx.lineTo(0, -12);
      ctx.lineTo(8, 8);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawEnemies(ctx, state) {
    for (const enemy of state.roomState.enemies) {
      if (!enemy.alive) continue;
      ctx.save();
      ctx.shadowColor = enemy.type === "hunter" ? "#ff4d6d" : "#9c6bff";
      ctx.shadowBlur = 14;
      ctx.fillStyle = enemy.type === "hunter" ? "#b343ff" : "#9c6bff";
      ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
      ctx.fillStyle = "#080a1e";
      const eyeY = state.roomState.gravity === 1 ? enemy.y + 12 : enemy.y + enemy.h - 18;
      ctx.fillRect(enemy.x + 10, eyeY, 7, 7);
      ctx.fillRect(enemy.x + enemy.w - 17, eyeY, 7, 7);
      if (enemy.type === "hunter") {
        ctx.fillStyle = "#ff4d6d";
        ctx.fillRect(enemy.x + 6, enemy.y + enemy.h - 9, enemy.w - 12, 4);
      }
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(enemy.x + 5, enemy.y + 5, enemy.w - 10, 4);
      ctx.restore();
    }
  }

  function drawHazards(ctx, state) {
    for (const hazard of state.roomState.hazards) {
      const active = ns.isSentryActive(hazard, state.session.roomTime);
      const beam = ns.getSentryBeamRect(hazard);
      ctx.save();
      ctx.shadowColor = active ? "#ff4d6d" : "rgba(255,77,109,0.45)";
      ctx.shadowBlur = active ? 22 : 8;
      ctx.fillStyle = active ? "#ff4d6d" : "rgba(255,77,109,0.32)";
      ctx.fillRect(hazard.x, hazard.y, hazard.w, hazard.h);
      ctx.fillStyle = active ? "rgba(255,77,109,0.55)" : "rgba(255,77,109,0.12)";
      ctx.fillRect(beam.x, beam.y, beam.w, beam.h);
      ctx.fillStyle = "#080a1e";
      ctx.fillRect(hazard.x + 7, hazard.y + 7, hazard.w - 14, hazard.h - 14);
      ctx.restore();
    }
  }

  function drawPlayer(ctx, state) {
    const player = state.player;
    ctx.save();
    ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
    if (state.roomState.gravity === -1) ctx.scale(1, -1);
    ctx.shadowColor = "#55f7ff";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#14172e";
    ns.roundRectPath(ctx, -player.w / 2, -player.h / 2, player.w, player.h, 10);
    ctx.fill();
    ctx.fillStyle = "#55f7ff";
    ctx.beginPath();
    ctx.arc(-7, -8, 3.4, 0, Math.PI * 2);
    ctx.arc(7, -8, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffd96a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 11);
    ctx.lineTo(-player.face * 24, 22 + Math.sin(state.session.clock * 8.3333) * 4);
    ctx.stroke();
    ctx.fillStyle = "#55f7ff";
    ctx.fillRect(player.face * 11, 2, 12, 5);
    ctx.restore();
  }

  function drawParticles(ctx, state) {
    for (const particle of state.roomState.particles) {
      ctx.globalAlpha = ns.clamp(particle.life / particle.max, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  function drawChase(ctx, state) {
    if (!state.room.chase) return;
    const chase = state.chaseConfig || state.config.chase;
    const intensity = Math.min(1, Math.max(0.2, (chase.baseSpeed + state.session.roomTime * chase.rampPerSecond) / 220));
    ctx.save();
    ctx.fillStyle = "rgba(255, 77, 109, " + (0.12 + intensity * 0.1) + ")";
    ctx.fillRect(-160, 0, state.roomState.shadowX + 180, state.config.world.height);
    ctx.fillStyle = "rgba(255, 77, 109, " + (0.42 + intensity * 0.28) + ")";
    ctx.shadowColor = "#ff4d6d";
    ctx.shadowBlur = 28 + intensity * 24;
    ctx.fillRect(state.roomState.shadowX, 0, 18 + intensity * 12, state.config.world.height);
    ctx.restore();
  }

  function drawTitle(ctx, state) {
    const s = uiScale(state);
    drawBackground(ctx, state);
    ctx.save();
    ctx.textAlign = "center";
    ctx.shadowColor = "#55f7ff";
    ctx.shadowBlur = 32;
    ctx.fillStyle = "#edf7ff";
    ctx.font = "900 " + (58 * s) + "px system-ui";
    ctx.fillText("THE GRAVITY", state.config.world.width / 2, 176 * s);
    ctx.fillStyle = "#55f7ff";
    ctx.fillText("LOCKSMITH", state.config.world.width / 2, 236 * s);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(237,247,255,0.76)";
    ctx.font = (18 * s) + "px system-ui";
    ctx.fillText("Break impossible sky-vaults by redirecting the fall and chaining a second jump.", state.config.world.width / 2, 294 * s);
    ctx.fillStyle = "rgba(5, 8, 22, 0.68)";
    ctx.strokeStyle = "rgba(85,247,255,0.22)";
    ns.roundRectPath(ctx, state.config.world.width / 2 - (320 * s), 350 * s, 640 * s, 130 * s, 18 * s);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffd96a";
    ctx.font = "700 " + (21 * s) + "px system-ui";
    ctx.fillText("Press Enter or Space to begin", state.config.world.width / 2, 392 * s);
    ctx.fillStyle = "rgba(237,247,255,0.72)";
    ctx.font = (14 * s) + "px system-ui";
    ctx.fillText("A/D move - W/Space jump - double jump in air - Shift flip gravity - R restart", state.config.world.width / 2, 430 * s);
    ctx.restore();
  }

  function drawWin(ctx, state) {
    const s = uiScale(state);
    const columns = Math.max(1, Math.min(4, Math.ceil(state.session.roomStats.length / 10)));
    const rowsPerColumn = Math.ceil(state.session.roomStats.length / columns);
    drawBackground(ctx, state);
    ctx.save();
    ctx.textAlign = "center";
    ctx.shadowColor = "#75ff9d";
    ctx.shadowBlur = 26;
    ctx.fillStyle = "#75ff9d";
    ctx.font = "900 " + (48 * s) + "px system-ui";
    ctx.fillText("VAULT BROKEN", state.config.world.width / 2, 88 * s);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(237,247,255,0.82)";
    ctx.font = (17 * s) + "px system-ui";
    ctx.fillText("Total deaths: " + state.session.totalDeaths + "   -   Total flips: " + state.session.totalFlips, state.config.world.width / 2, 126 * s);
    ctx.fillText("Total time: " + ns.fmtTime(state.session.totalTime), state.config.world.width / 2, 152 * s);

    ctx.textAlign = "left";
    const cardX = 40 * s;
    const cardY = 178 * s;
    const cardW = 880 * s;
    const cardH = 310 * s;
    const columnW = cardW / columns;
    const rowH = 22 * s;
    ctx.fillStyle = "rgba(5, 8, 22, 0.72)";
    ctx.strokeStyle = "rgba(85,247,255,0.2)";
    ns.roundRectPath(ctx, cardX, cardY, cardW, cardH, 18 * s);
    ctx.fill();
    ctx.stroke();

    for (let column = 0; column < columns; column++) {
      const x = cardX + (26 * s) + column * columnW;
      let y = cardY + (28 * s);
      const nameOffset = 0;
      const timeOffset = columnW - (150 * s);
      const deathsOffset = columnW - (88 * s);
      const flipsOffset = columnW - (40 * s);

      ctx.font = "700 " + (13 * s) + "px system-ui";
      ctx.fillStyle = "#ffd96a";
      ctx.fillText("Room", x + nameOffset, y);
      ctx.fillText("Time", x + timeOffset, y);
      ctx.fillText("D", x + deathsOffset, y);
      ctx.fillText("F", x + flipsOffset, y);

      y += 24 * s;
      ctx.font = (12 * s) + "px system-ui";
      for (let row = 0; row < rowsPerColumn; row++) {
        const roomStat = state.session.roomStats[column * rowsPerColumn + row];
        if (!roomStat) continue;
        const roomNumber = column * rowsPerColumn + row + 1;
        const roomName = roomNumber + ". " + roomStat.name;
        ctx.fillStyle = "rgba(237,247,255,0.84)";
        ctx.fillText(roomName, x + nameOffset, y);
        ctx.fillText(ns.fmtTime(roomStat.time), x + timeOffset, y);
        ctx.fillText(String(roomStat.deaths), x + deathsOffset, y);
        ctx.fillText(String(roomStat.flips), x + flipsOffset, y);
        y += rowH;
      }
    }

    ctx.textAlign = "center";
    ctx.fillStyle = "#edf7ff";
    ctx.font = "700 " + (18 * s) + "px system-ui";
    ctx.fillText("Press Enter or Space to return to title", state.config.world.width / 2, 506 * s);
    ctx.restore();
  }

  ns.createRenderer = function(canvas, ctx) {
    return {
      render: function(state) {
        ctx.save();

        let shakeX = 0;
        let shakeY = 0;
        if (state.session.cameraShake > 0) {
          shakeX = (Math.random() - 0.5) * state.session.cameraShake;
          shakeY = (Math.random() - 0.5) * state.session.cameraShake;
        }
        ctx.translate(shakeX, shakeY);

        if (state.session.screen === ns.SCREEN.TITLE) {
          drawTitle(ctx, state);
          ctx.restore();
          return;
        }

        if (state.session.screen === ns.SCREEN.WIN) {
          drawWin(ctx, state);
          ctx.restore();
          return;
        }

        drawBackground(ctx, state);
        drawChase(ctx, state);
        drawExit(ctx, state);
        drawPlatforms(ctx, state);
        drawSpikes(ctx, state);
        drawShards(ctx, state);
        drawHazards(ctx, state);
        drawEnemies(ctx, state);
        if (state.player.alive) drawPlayer(ctx, state);
        drawParticles(ctx, state);
        if (state.session.roomCompleteFlash > 0) {
          ctx.fillStyle = "rgba(117,255,157," + (state.session.roomCompleteFlash * state.config.effects.roomCompleteFlashAlpha) + ")";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.restore();
      }
    };
  };
})(window.GravityLocksmith);
