(function(D) {
  with (D) {
  function draw() {
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    if (!game || !game.started) return;
    updateMouseLocal();
    const shakeX = (Math.random() - .5) * game.cameraShake;
    const shakeY = (Math.random() - .5) * game.cameraShake;
    ctx.save();
    ctx.translate(game.offsetX + shakeX, game.offsetY + shakeY);
    drawRoom();
    drawHazards();
    drawInteractables();
    drawPickups();
    drawMines();
    drawBullets();
    drawEnemies();
    drawTech();
    drawPlayer();
    drawParticles();
    drawDamageTexts();
    drawDoorInvites();
    ctx.restore();
    drawUI();
    drawMinimap();
    if (game.flash > 0) {
      ctx.fillStyle = `rgba(255, 85, 119, ${game.flash * 0.45})`;
      ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    }
  }

  function drawRoom() {
    const room = currentRoom();
    const pcol = game.personality.color;
    const g = ctx.createLinearGradient(0,0,ROOM_W,ROOM_H);
    g.addColorStop(0, "#0c1022"); g.addColorStop(1, "#090b16");
    ctx.fillStyle = g;
    roundRect(0, 0, ROOM_W, ROOM_H, 18, true);

    ctx.strokeStyle = "rgba(255,255,255,.035)";
    ctx.lineWidth = 1;
    for (let x=0; x<=ROOM_W; x+=TILE) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ROOM_H); ctx.stroke(); }
    for (let y=0; y<=ROOM_H; y+=TILE) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(ROOM_W, y); ctx.stroke(); }

    ctx.strokeStyle = room.locked ? "rgba(255,85,119,.65)" : `${hexToRgba(room.color, .55)}`;
    ctx.lineWidth = 5;
    roundRect(3, 3, ROOM_W-6, ROOM_H-6, 18, false);

    for (const o of room.obstacles) {
      ctx.fillStyle = o.kind === "pillar" ? "#202848" : o.kind === "altar" ? "#24223f" : "#151a30";
      ctx.strokeStyle = "rgba(125,249,255,.11)";
      ctx.lineWidth = 2;
      roundRect(o.x, o.y, o.w, o.h, 8, true, true);
    }
    drawDoors(room);
  }

  function drawDoors(room) {
    const zones = room.doorZones && room.doorZones.length ? room.doorZones : buildRoomDoorZones(room.exits);
    for (const d of DIRS) {
      const open = room.exits.includes(d.name);
      const locked = room.locked;
      const zone = zones.find(z => z.dir === d.name);
      const { x, y, w, h } = zone.rect;
      const pulse = 0.5 + Math.sin(game.time * 3.2 + "NESW".indexOf(d.name) * 1.7) * 0.5;
      ctx.fillStyle = !open ? "#06070d" : locked ? "#551629" : "#102b36";
      ctx.strokeStyle = !open ? "rgba(255,255,255,.08)" : locked ? "rgba(255,85,119,.9)" : `rgba(125,249,255,${0.55 + pulse * 0.35})`;
      ctx.lineWidth = open ? 3 : 2;
      roundRect(x,y,w,h,5,true,true);
      if (open && !locked) {
        drawDoorPortal(zone, d, pulse);
      }
    }
  }

  function drawDoorPortal(zone, d, pulse) {
    const { x, y, w, h } = zone.rect;
    const horizontal = d.name === "N" || d.name === "S";
    const accent = game.personality.color || "#7df9ff";
    const coreX = horizontal ? x + w * 0.18 : x + 5;
    const coreY = horizontal ? y + 5 : y + h * 0.18;
    const coreW = horizontal ? w * 0.64 : w - 10;
    const coreH = horizontal ? h - 10 : h * 0.64;
    const glow = 0.18 + pulse * 0.16;

    ctx.save();
    ctx.shadowColor = accent;
    ctx.shadowBlur = 18 + pulse * 12;
    ctx.fillStyle = hexToRgba(accent, glow);
    roundRect(coreX, coreY, coreW, coreH, 8, true);
    ctx.shadowBlur = 0;

    const g = horizontal ? ctx.createLinearGradient(coreX, coreY, coreX + coreW, coreY) : ctx.createLinearGradient(coreX, coreY, coreX, coreY + coreH);
    g.addColorStop(0, "rgba(125,249,255,.04)");
    g.addColorStop(0.5, hexToRgba(accent, 0.42 + pulse * 0.18));
    g.addColorStop(1, "rgba(125,249,255,.04)");
    ctx.fillStyle = g;
    roundRect(coreX + 3, coreY + 3, coreW - 6, coreH - 6, 6, true);

    ctx.strokeStyle = `rgba(244,247,255,${0.16 + pulse * 0.2})`;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const t = (game.time * 0.75 + i / 3 + "NESW".indexOf(d.name) * 0.11) % 1;
      ctx.beginPath();
      if (horizontal) {
        const lx = coreX + coreW * t;
        ctx.moveTo(lx, coreY + 5);
        ctx.lineTo(lx + (d.name === "N" ? -10 : 10), coreY + coreH - 5);
      } else {
        const ly = coreY + coreH * t;
        ctx.moveTo(coreX + 5, ly);
        ctx.lineTo(coreX + coreW - 5, ly + (d.name === "W" ? -10 : 10));
      }
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(244,247,255,.65)";
    for (let i = 0; i < 4; i++) {
      const t = (game.time * (0.55 + i * 0.08) + i * 0.27) % 1;
      const sway = Math.sin(game.time * 2 + i) * 5;
      const px = horizontal ? coreX + coreW * t : coreX + coreW / 2 + sway;
      const py = horizontal ? coreY + coreH / 2 + sway : coreY + coreH * t;
      ctx.globalAlpha = 0.18 + pulse * 0.22;
      ctx.beginPath();
      ctx.arc(px, py, 1.5 + pulse * 1.4, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawDoorInvites() {
    const room = currentRoom();
    if (!room || room.locked) return;
    const zones = room.doorZones && room.doorZones.length ? room.doorZones : buildRoomDoorZones(room.exits);
    for (const d of DIRS) {
      if (!room.exits.includes(d.name)) continue;
      const zone = zones.find(z => z.dir === d.name);
      const { x, y, w, h } = zone.transition;
      const pulse = 0.5 + Math.sin(game.time * 2.6 + "NESW".indexOf(d.name)) * 0.5;
      ctx.save();
      ctx.strokeStyle = `rgba(125,249,255,${0.08 + pulse * 0.18})`;
      ctx.lineWidth = 2;
      roundRect(x, y, w, h, 10, false, true);
      ctx.restore();
    }
  }

  function drawHazards() {
    for (const h of game.hazards) {
      let color = "#63ff9d";
      if (h.type === "fire") color = "#ff5d22";
      if (h.type === "gear") color = "#7df9ff";
      if (h.type === "mirror") color = "#c084fc";
      if (h.type === "void" || h.type === "blackHole") color = "#9a7bff";
      if (h.type === "smash") color = "#ff5577";
      ctx.save();
      ctx.globalAlpha = h.type === "smash" ? .35 + Math.sin(h.pulse*20)*.1 : .22 + Math.sin(h.pulse*4)*.06;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.fill();
      ctx.globalAlpha = .8;
      ctx.strokeStyle = color;
      ctx.lineWidth = h.type === "smash" ? 3 : 2;
      ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.stroke();
      ctx.restore();
    }
  }

  function drawInteractables() {
    const room = currentRoom();
    if (!room) return;
    const near = nearestInteractable();
    for (const o of room.interactables) {
      if (o.used && o.type !== "lore") continue;
      const color = { chest:"#ffd166", shrine:"#c084fc", shop:"#63ff9d", curse:"#a855f7", forge:"#ff9f1c", rest:"#8bd3ff", secret:"#ffffff", lore:"#7df9ff", gate:"#63ff9d" }[o.type] || "#fff";
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
      ctx.fillStyle = hexToRgba(color, .22);
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r + Math.sin(game.time*3)*2, 0, TAU); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = color;
      ctx.font = "22px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const icon = { chest:"▣", shrine:"✦", shop:"$", curse:"☾", forge:"⚒", rest:"♨", secret:"?", lore:"◎", gate:"➤" }[o.type] || "•";
      ctx.fillText(icon, o.x, o.y+1);
      if (near === o) {
        ctx.font = "13px system-ui";
        ctx.fillStyle = "rgba(0,0,0,.72)";
        roundRect(o.x-82, o.y-o.r-42, 164, 27, 9, true);
        ctx.fillStyle = "#fff";
        ctx.fillText(`F: ${o.label}`, o.x, o.y-o.r-28);
      }
      ctx.restore();
    }
  }

  function drawPickups() {
    for (const it of game.pickups) {
      const color = it.type === "coin" ? "#ffd166" : it.type === "heart" ? "#ff5577" : it.type === "key" ? "#8bd3ff" : "#7df9ff";
      ctx.fillStyle = color;
      ctx.shadowColor = color; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function drawMines() {
    for (const m of game.mines) {
      ctx.fillStyle = "rgba(255,159,28,.28)";
      ctx.strokeStyle = "#ff9f1c";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, TAU); ctx.fill(); ctx.stroke();
    }
  }

  function drawBullets() {
    for (const b of game.bullets) drawBullet(b, b.color || "#7df9ff");
    for (const b of game.enemyBullets) drawBullet(b, b.color || "#ff5577");
  }

  function drawBullet(b, color) {
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = 12;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function drawEnemies() {
    for (const e of game.enemies) {
      ctx.save();
      const hpPct = clamp(e.hp / e.maxHp, 0, 1);
      ctx.shadowColor = e.color; ctx.shadowBlur = e.boss ? 28 : 12;
      ctx.fillStyle = e.status.freeze > 0 ? "#8bd3ff" : e.color;
      if (e.status.burn > 0) ctx.fillStyle = "#ff9f1c";
      if (e.status.poison > 0) ctx.fillStyle = "#63ff9d";
      ctx.beginPath();
      if (e.type === "guard") polygon(e.x, e.y, e.r, 5, game.time*.4);
      else if (e.type === "wraith") polygon(e.x, e.y, e.r, 7, game.time*.7);
      else if (e.boss && e.bossName === "Infinite Hand") polygon(e.x, e.y, e.r, 6, game.time*.35);
      else ctx.arc(e.x, e.y, e.r, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = e.elite || e.boss ? "#fff" : "rgba(255,255,255,.45)";
      ctx.lineWidth = e.boss ? 3 : 1.5;
      ctx.stroke();
      if (e.boss) {
        ctx.font = "bold 14px system-ui"; ctx.textAlign = "center"; ctx.fillStyle = "#fff";
        ctx.fillText(e.bossName, e.x, e.y - e.r - 28);
      }
      // health bar
      const w = e.boss ? 120 : 42;
      ctx.fillStyle = "rgba(0,0,0,.55)"; roundRect(e.x-w/2, e.y-e.r-14, w, 5, 4, true);
      ctx.fillStyle = e.boss ? "#ff5577" : "#63ff9d"; roundRect(e.x-w/2, e.y-e.r-14, w*hpPct, 5, 4, true);
      ctx.restore();
    }
  }

  function polygon(x, y, r, sides, rot = 0) {
    ctx.moveTo(x + Math.cos(rot) * r, y + Math.sin(rot) * r);
    for (let i=1;i<=sides;i++) {
      const a = rot + i * TAU / sides;
      ctx.lineTo(x + Math.cos(a)*r, y + Math.sin(a)*r);
    }
  }

  function drawTech() {
    const p = game.player;
    for (const t of game.turrets) {
      ctx.fillStyle = "#ff9f1c"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.rect(t.x-12, t.y-12, 24, 24); ctx.fill(); ctx.stroke();
    }
    for (const d of game.drones) {
      ctx.fillStyle = "#7df9ff"; ctx.shadowColor = "#7df9ff"; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
    }
    const n = p.stats.orbitals;
    for (let i = 0; i < n; i++) {
      const a = game.time * (2.4 + i*.03) + i * TAU / n;
      const ox = p.x + Math.cos(a) * 64, oy = p.y + Math.sin(a) * 64;
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#c084fc"; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(ox, oy, 9, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
    }
  }

  function drawPlayer() {
    const p = game.player;
    ctx.save();
    const a = angleTo(p.x, p.y, game.mouseLocalX, game.mouseLocalY);
    ctx.globalAlpha = p.invuln > 0 && Math.floor(game.time*18)%2 === 0 ? .45 : 1;
    ctx.shadowColor = p.dashTime > 0 ? "#7df9ff" : "#ffffff";
    ctx.shadowBlur = p.dashTime > 0 ? 24 : 10;
    ctx.fillStyle = "#f4f7ff";
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
    ctx.fillStyle = "#7df9ff";
    ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a)*24, p.y + Math.sin(a)*24); ctx.lineTo(p.x + Math.cos(a+2.5)*12, p.y + Math.sin(a+2.5)*12); ctx.lineTo(p.x + Math.cos(a-2.5)*12, p.y + Math.sin(a-2.5)*12); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawParticles() {
    for (const p of game.particles) {
      ctx.save();
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = p.color;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color; ctx.shadowBlur = 8;
      if (p.line) { ctx.lineWidth = p.size; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x2, p.y2); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
  }

  function drawDamageTexts() {
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const t of game.damageTexts) {
      ctx.globalAlpha = clamp(t.life / t.maxLife, 0, 1);
      ctx.fillStyle = t.color;
      ctx.font = "bold 13px system-ui";
      ctx.fillText(t.text, t.x, t.y);
      ctx.globalAlpha = 1;
    }
  }

  function drawUI() {
    const p = game.player;
    const W = canvas.clientWidth, H = canvas.clientHeight;
    ctx.save();
    drawPanel(14, 14, 365, 132);
    ctx.font = "bold 16px system-ui";
    ctx.fillStyle = "#fff";
    ctx.fillText("Depthbound", 28, 38);
    ctx.font = "12px system-ui";
    ctx.fillStyle = game.personality.color;
    ctx.fillText(game.personality.name, 28, 58);

    drawBar(28, 72, 210, 14, p.hp / p.maxHp, "#ff5577", `HP ${Math.ceil(p.hp)}/${p.maxHp}`);
    drawBar(28, 94, 210, 12, p.xp / p.xpNext, "#7df9ff", `LV ${p.level} XP ${Math.floor(p.xp)}/${p.xpNext}`);
    drawBar(28, 114, 210, 12, game.bossMeter / game.bossMeterMax, "#ff9f1c", `Boss ${game.bossMeter}/${game.bossMeterMax}`);
    ctx.fillStyle = "#ffd166"; ctx.fillText(`Coins ${p.coins}`, 255, 78);
    ctx.fillStyle = "#8bd3ff"; ctx.fillText(`Keys ${p.keys}`, 255, 98);
    ctx.fillStyle = "#fff"; ctx.fillText(`Score ${Math.floor(p.score)}`, 255, 118);

    drawPanel(W - 306, 14, 292, 118);
    ctx.font = "bold 13px system-ui"; ctx.fillStyle = "#fff";
    ctx.fillText(`Room (${game.roomX}, ${game.roomY}) · ${titleCase(currentRoom().type)}`, W - 290, 38);
    ctx.font = "12px system-ui";
    ctx.fillStyle = "#aab4d6";
    const room = currentRoom();
    ctx.fillText(room.flavor || "The dungeon rearranges itself quietly.", W - 290, 58);
    ctx.fillText(`Q: ${p.abilities.q || "—"} ${p.qCd>0?`(${p.qCd.toFixed(1)})`:"ready"}`, W - 290, 82);
    ctx.fillText(`E: ${p.abilities.e || "locked"} ${p.eCd>0?`(${p.eCd.toFixed(1)})`:p.abilities.e?"ready":""}`, W - 290, 102);

    drawBranchPanel(14, 158);
    drawNotifications(W, H);
    ctx.restore();
  }

  function drawPanel(x, y, w, h) {
    ctx.fillStyle = "rgba(6,8,18,.68)";
    ctx.strokeStyle = "rgba(125,249,255,.18)";
    ctx.lineWidth = 1;
    roundRect(x, y, w, h, 14, true, true);
  }

  function drawBar(x, y, w, h, pct, color, label) {
    ctx.fillStyle = "rgba(0,0,0,.45)"; roundRect(x, y, w, h, h/2, true);
    ctx.fillStyle = color; roundRect(x, y, w * clamp(pct,0,1), h, h/2, true);
    ctx.font = "10px system-ui"; ctx.fillStyle = "#fff"; ctx.textBaseline = "middle";
    ctx.fillText(label, x + 6, y + h/2 + .5);
    ctx.textBaseline = "alphabetic";
  }

  function drawBranchPanel(x, y) {
    const p = game.player;
    drawPanel(x, y, 210, 158);
    ctx.font = "bold 13px system-ui"; ctx.fillStyle = "#fff"; ctx.fillText("Talent Branches", x+14, y+24);
    let yy = y+48;
    for (const b of ["Gunner","Phantom","Occult","Engineer","Alchemist"]) {
      ctx.fillStyle = branchColor(b); ctx.fillText(`${b}: ${p.branch[b]}`, x+14, yy); yy += 21;
    }
  }

  function drawNotifications(W, H) {
    let y = H - 90;
    ctx.textAlign = "center";
    for (const n of game.notifications.slice(-4)) {
      const alpha = clamp(n.ttl / Math.min(n.max, 1), 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(0,0,0,.55)";
      roundRect(W/2 - 280, y - 18, 560, 30, 12, true);
      ctx.fillStyle = n.color; ctx.font = "bold 14px system-ui";
      ctx.fillText(n.text, W/2, y + 2);
      y -= 36;
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = "left";
  }

  function drawMinimap() {
    const W = canvas.clientWidth;
    const baseX = W - 172, baseY = 150;
    drawPanel(baseX - 12, baseY - 12, 158, 158);
    const size = 17;
    ctx.save();
    ctx.strokeStyle = "rgba(125,249,255,.26)";
    ctx.lineWidth = 2;
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = game.roomX + dx, y = game.roomY + dy;
        const k = roomKey(x, y);
        const room = game.rooms.get(k);
        const known = room || game.roomTypePreview.has(k) || isAdjacentKnown(x, y);
        if (!known) continue;
        const type = room ? room.type : (game.bossMeter >= game.bossMeterMax ? "boss" : peekRoomType(x, y));
        const sx = baseX + (dx+4) * size;
        const sy = baseY + (dy+4) * size;
        for (const d of DIRS) {
          if ((d.name === "W" || d.name === "N") || !hasDoor(x, y, d.name)) continue;
          const ndx = dx + d.dx, ndy = dy + d.dy;
          if (ndx < -4 || ndx > 4 || ndy < -4 || ndy > 4) continue;
          ctx.beginPath();
          ctx.moveTo(sx + size / 2 - 1, sy + size / 2 - 1);
          ctx.lineTo(baseX + (ndx+4) * size + size / 2 - 1, baseY + (ndy+4) * size + size / 2 - 1);
          ctx.stroke();
        }
        ctx.fillStyle = room ? hexToRgba(roomColor(type), room.visited ? .88 : .46) : hexToRgba(roomColor(type), type === "boss" ? .5 : .24);
        ctx.fillRect(sx, sy, size-3, size-3);
        if (!room && type === "boss") {
          ctx.strokeStyle = "#ff5577";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(sx + 1, sy + 1, size - 5, size - 5);
          ctx.strokeStyle = "rgba(125,249,255,.26)";
          ctx.lineWidth = 2;
        }
        if (dx === 0 && dy === 0) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.strokeRect(sx-1, sy-1, size-1, size-1); ctx.strokeStyle = "rgba(125,249,255,.26)"; }
      }
    }
    ctx.font = "11px system-ui"; ctx.fillStyle = "#aab4d6"; ctx.fillText("Minimap", baseX, baseY + 165);
    ctx.restore();
  }

  function isAdjacentKnown(x, y) {
    for (const d of DIRS) {
      const n = game.rooms.get(roomKey(x + d.dx, y + d.dy));
      if (n && n.visited && hasDoor(n.x, n.y, OPP[d.name])) return true;
    }
    return false;
  }

    Object.assign(D, {
      draw,
      drawRoom,
      drawDoors,
      drawDoorPortal,
      drawDoorInvites,
      drawHazards,
      drawInteractables,
      drawPickups,
      drawMines,
      drawBullets,
      drawBullet,
      drawEnemies,
      polygon,
      drawTech,
      drawPlayer,
      drawParticles,
      drawDamageTexts,
      drawUI,
      drawPanel,
      drawBar,
      drawBranchPanel,
      drawNotifications,
      drawMinimap,
      isAdjacentKnown
    });
  }
})(window.Depthbound = window.Depthbound || {});
