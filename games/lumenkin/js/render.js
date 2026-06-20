(function (ns) {
  'use strict';

  class LumenkinRenderer {
    constructor(canvas, catalog, assembler, palette) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;
      this.catalog = catalog;
      this.assembler = assembler;
      this.palette = palette;
    }

    render(game) {
      const ctx = this.ctx;
      const campaign = game.campaign;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, ns.CONFIG.width, ns.CONFIG.height);
      ctx.fillStyle = this.palette.sky(campaign ? campaign.chapter : 0, campaign ? campaign.ecology.health : 50);
      ctx.fillRect(0, 0, ns.CONFIG.width, ns.CONFIG.height);
      if (!campaign || !game.chapter) this.renderDormant(ctx, game.time);
      else [this.renderFirstGlow, this.renderBrood, this.renderCity, this.renderWorldroot, this.renderBloom][campaign.chapter].call(this, ctx, game);
      game.particles.render(ctx);
      this.renderScanlines(ctx);
      ctx.restore();
    }

    renderDormant(ctx, time) {
      this.stars(ctx, time, 26);
      ctx.fillStyle = '#121532'; ctx.fillRect(0, 172, 384, 44);
      ctx.fillStyle = '#292557';
      for (let x = 0; x < 384; x += 14) ctx.fillRect(x, 168 + (x % 28 ? 4 : 0), 12, 8);
      this.catalog.draw(ctx, 'eggMote', 164, 91, 56, 76);
      this.glow(ctx, 192, 137, 30, '#55f6e8', .18);
    }

    renderFirstGlow(ctx, game) {
      const state = game.chapter.state;
      const time = game.time;
      this.stars(ctx, time, 20);
      this.drawSideBiome(ctx, time);
      state.motes.filter(m => !m.taken).forEach((mote, i) => {
        this.glow(ctx, mote.x, mote.y, 11, '#55f6e8', .18);
        ctx.fillStyle = i % 2 ? '#d8fff7' : '#55f6e8'; ctx.fillRect(Math.round(mote.x - 2), Math.round(mote.y - 2), 4, 4);
      });
      this.catalog.draw(ctx, 'nursery', 11, 117, 72, 56);
      const size = state.age < 15 ? 32 : 46;
      const sprite = this.assembler.compose(game.campaign.lineage.founder, 'side', state.age);
      this.glow(ctx, state.player.x, 166, 24, '#55f6e8', .12);
      ctx.save();
      if (state.player.facing < 0) { ctx.translate(Math.round(state.player.x + size / 2), 0); ctx.scale(-1, 1); ctx.drawImage(sprite, -size / 2, Math.round(151 - size + 16), size, size); }
      else ctx.drawImage(sprite, Math.round(state.player.x - size / 2), Math.round(151 - size + 16), size, size);
      ctx.restore();
      if (state.mateAttracted && game.campaign.lineage.mate) {
        const mate = this.assembler.compose(game.campaign.lineage.mate, 'side', 30);
        this.glow(ctx, 300, 163, 22, '#ffad6b', .12);
        ctx.drawImage(mate, 278, 126, 44, 44);
      }
      this.pixelText(ctx, state.mateAttracted ? 'TWO LIGHTS ANSWER' : 'ONE LIGHT WAKES', 8, 14, '#aaa7cc');
    }

    drawSideBiome(ctx, time) {
      ctx.fillStyle = '#141638'; ctx.fillRect(0, 154, 384, 62);
      ctx.fillStyle = '#292557';
      for (let x = 0; x < 384; x += 12) {
        const h = 4 + ((x * 7) % 13);
        ctx.fillRect(x, 154 - h, 8, h + 3);
      }
      ctx.fillStyle = '#4b3471';
      for (let x = 5; x < 384; x += 31) {
        const wave = Math.round(Math.sin(time * .7 + x) * 2);
        ctx.fillRect(x, 142 + wave, 2, 12); ctx.fillRect(x - 3, 144 + wave, 8, 2);
        ctx.fillStyle = '#55f6e8'; ctx.fillRect(x, 141 + wave, 2, 2); ctx.fillStyle = '#4b3471';
      }
    }

    renderBrood(ctx, game) {
      const state = game.chapter.state;
      this.drawTopBiome(ctx, game.time);
      state.forage.filter(node => node.amount > 0).forEach(node => {
        this.glow(ctx, node.x, node.y, 14, '#55f6e8', .1);
        ctx.fillStyle = '#55f6e8'; ctx.fillRect(Math.round(node.x - 4), Math.round(node.y - 4), 8, 8);
        ctx.fillStyle = '#d8fff7'; ctx.fillRect(Math.round(node.x - 1), Math.round(node.y - 3), 3, 3);
      });
      state.predators.filter(p => p.active).forEach(predator => this.drawPredator(ctx, predator.x, predator.y));
      state.creatures.forEach(creature => {
        const sprite = this.assembler.compose(creature.appearance, 'top', creature.age);
        const size = creature.role === 'young' ? 18 : 25;
        if (creature.id === state.playerId) { ctx.strokeStyle = '#ffd45b'; ctx.strokeRect(Math.round(creature.x - size / 2 - 2), Math.round(creature.y - size / 2 - 2), size + 4, size + 4); }
        ctx.drawImage(sprite, Math.round(creature.x - size / 2), Math.round(creature.y - size / 2), size, size);
        if (creature.hp < 60) { ctx.fillStyle = '#ff668c'; ctx.fillRect(Math.round(creature.x - 8), Math.round(creature.y - 13), Math.round(16 * creature.hp / 100), 2); }
      });
      this.pixelText(ctx, state.rally ? 'RALLY: CLOSE' : 'RALLY: FORAGE', 8, 14, state.rally ? '#ffd45b' : '#55f6e8');
    }

    drawTopBiome(ctx, time) {
      ctx.fillStyle = '#111633'; ctx.fillRect(0, 0, 384, 216);
      ctx.strokeStyle = '#242451'; ctx.lineWidth = 1;
      for (let x = -20; x < 420; x += 24) for (let y = 6; y < 220; y += 18) ctx.strokeRect(x + ((y / 18) % 2) * 12, y, 24, 18);
      ctx.fillStyle = '#36305f';
      for (let i = 0; i < 32; i += 1) { const x = (i * 71) % 384; const y = 24 + (i * 47) % 188; ctx.fillRect(x, y, 3, 3); }
      ctx.fillStyle = '#4e4a88'; ctx.fillRect(164, 91, 54, 44); ctx.fillStyle = '#0d1029'; ctx.fillRect(173, 98, 36, 28);
    }

    drawPredator(ctx, x, y) {
      ctx.save(); ctx.translate(Math.round(x), Math.round(y));
      ctx.fillStyle = '#471d49'; ctx.fillRect(-11, -6, 21, 12); ctx.fillRect(-7, -10, 12, 18);
      ctx.fillStyle = '#ff668c'; ctx.fillRect(2, -5, 3, 3); ctx.fillRect(-4, -5, 3, 3);
      ctx.fillStyle = '#25152f'; ctx.fillRect(-13, -2, 4, 3); ctx.fillRect(9, -2, 4, 3); ctx.restore();
    }

    renderCity(ctx, game) {
      const state = game.chapter.state;
      ctx.fillStyle = '#0c102a'; ctx.fillRect(0, 0, 384, 216);
      this.drawIsometricGround(ctx);
      state.structures.forEach((structure, index) => {
        const frame = structure.type === 'nursery' ? 'nursery' : structure.type;
        const size = structure.type === 'pulseRoad' ? [56, 30] : [42, 38];
        this.glow(ctx, structure.x, structure.y, 18, index % 2 ? '#55f6e8' : '#7aa8ff', .08);
        this.catalog.draw(ctx, frame, structure.x - size[0] / 2, structure.y - size[1], size[0], size[1]);
        if (state.selected === structure) { ctx.strokeStyle = '#ffd45b'; ctx.strokeRect(structure.x - size[0] / 2 - 2, structure.y - size[1] - 2, size[0] + 4, size[1] + 4); }
      });
      const count = Math.min(60, state.population);
      for (let i = 0; i < count; i += 1) {
        const x = 32 + (i * 47 + Math.floor(game.time * (i % 3 + 1) * 3)) % 325;
        const y = 88 + (i * 29) % 105;
        ctx.fillStyle = i % 3 === 0 ? '#55f6e8' : i % 3 === 1 ? '#ffad6b' : '#7aa8ff';
        ctx.fillRect(Math.round(x), Math.round(y), 3, 3); ctx.fillStyle = '#292557'; ctx.fillRect(Math.round(x - 1), Math.round(y + 3), 5, 3);
      }
      this.pixelText(ctx, `${state.population} LIVES // ${state.structures.length} LIVING STRUCTURES`, 8, 14, '#55f6e8');
    }

    drawIsometricGround(ctx) {
      ctx.strokeStyle = '#252951';
      for (let row = 0; row < 8; row += 1) for (let col = 0; col < 12; col += 1) {
        const x = 12 + col * 34 + (row % 2) * 17; const y = 47 + row * 21;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 17, y - 9); ctx.lineTo(x + 34, y); ctx.lineTo(x + 17, y + 9); ctx.closePath(); ctx.stroke();
      }
    }

    renderWorldroot(ctx, game) {
      const state = game.chapter.state;
      ctx.fillStyle = '#080b1d'; ctx.fillRect(0, 0, 384, 216);
      this.drawIslandMap(ctx, state);
      state.regions.forEach((region, index) => {
        const selected = index === state.selectedRegion;
        const frame = region.biome === 'ridge' ? 'settlementStorm' : region.biome === 'wild' ? 'settlementWild' : region.health > 65 ? 'settlementGarden' : 'settlementChorus';
        this.catalog.draw(ctx, frame, region.x - 15, region.y - 18, 30, 28, { alpha: region.settled || index === 0 ? 1 : .72 });
        if (selected) { ctx.strokeStyle = '#ffd45b'; ctx.strokeRect(region.x - 19, region.y - 22, 38, 36); this.pixelText(ctx, region.name.toUpperCase(), Math.max(4, region.x - region.name.length * 3), region.y + 24, '#ffd45b'); }
      });
      ctx.strokeStyle = '#55f6e8'; ctx.setLineDash([3, 3]);
      for (let i = 1; i < state.regions.length; i += 1) { ctx.beginPath(); ctx.moveTo(state.regions[0].x, state.regions[0].y); ctx.lineTo(state.regions[i].x, state.regions[i].y); ctx.stroke(); }
      ctx.setLineDash([]);
      this.pixelText(ctx, `WORLD HEALTH ${Math.round(state.health)} // BLOOM PLAN ${Math.round(state.bloomReadiness)}`, 8, 14, '#55f6e8');
    }

    drawIslandMap(ctx, state) {
      const color = state.health < 35 ? '#552846' : state.health < 65 ? '#34315f' : '#274c5e';
      ctx.fillStyle = '#10183c';
      for (let y = 24; y < 216; y += 8) { const shift = Math.round(Math.sin(y + state.progress) * 4); ctx.fillRect(shift, y, 384, 3); }
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(45, 135); ctx.lineTo(82, 73); ctx.lineTo(142, 50); ctx.lineTo(210, 38); ctx.lineTo(322, 58); ctx.lineTo(354, 113); ctx.lineTo(315, 175); ctx.lineTo(231, 195); ctx.lineTo(136, 185); ctx.lineTo(69, 166); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#4e4a88';
      for (let i = 0; i < 36; i += 1) ctx.fillRect(61 + (i * 67) % 275, 57 + (i * 41) % 118, 2, 2);
    }

    renderBloom(ctx, game) {
      const state = game.chapter.state;
      const time = game.time;
      this.renderBloomSky(ctx, time, state.distance);
      state.motes.forEach(mote => { this.glow(ctx, mote.x, mote.y, 10, '#ffd45b', .18); ctx.fillStyle = '#ffd45b'; ctx.fillRect(Math.round(mote.x), Math.round(mote.y), 4, 4); });
      state.hazards.forEach(hazard => { ctx.fillStyle = hazard.hit ? '#382447' : '#8b3f6c'; ctx.fillRect(Math.round(hazard.x - hazard.size), Math.round(hazard.y - hazard.size), hazard.size * 2, hazard.size * 2); ctx.fillStyle = '#ff668c'; ctx.fillRect(Math.round(hazard.x - 2), Math.round(hazard.y - 2), 4, 4); });
      this.glow(ctx, state.player.x, state.player.y, 42, '#55f6e8', .12);
      this.catalog.draw(ctx, 'ark', state.player.x - 55, state.player.y - 22, 110, 44);
      const morphology = game.campaign.lineage.branches[0];
      ctx.fillStyle = morphology === 'shellback' ? '#ffad6b' : morphology === 'sailfin' ? '#ffd45b' : '#55f6e8';
      if (morphology === 'shellback') { ctx.fillRect(Math.round(state.player.x - 24), Math.round(state.player.y - 26), 48, 3); }
      if (morphology === 'sailfin') { ctx.beginPath(); ctx.moveTo(state.player.x, state.player.y - 22); ctx.lineTo(state.player.x + 20, state.player.y - 38); ctx.lineTo(state.player.x + 14, state.player.y - 18); ctx.fill(); }
      if (morphology === 'grasping-limbs') { for (let i = 0; i < 4; i += 1) ctx.fillRect(Math.round(state.player.x - 20 + i * 13), Math.round(state.player.y + 19), 2, 10 + i % 2 * 5); }
      this.pixelText(ctx, `MIGRATION ${Math.min(100, Math.floor(state.distance / state.destination * 100))}%`, 8, 14, '#ffd45b');
    }

    renderBloomSky(ctx, time, distance) {
      ctx.fillStyle = '#151333'; ctx.fillRect(0, 0, 384, 216);
      ctx.fillStyle = '#342451';
      for (let i = 0; i < 8; i += 1) { const x = ((i * 81 - distance * .12) % 480 + 480) % 480 - 48; ctx.fillRect(Math.round(x), 35 + (i % 3) * 44, 42, 5); ctx.fillRect(Math.round(x + 8), 30 + (i % 3) * 44, 28, 5); }
      ctx.fillStyle = '#1d3151'; ctx.fillRect(0, 189, 384, 27);
      ctx.fillStyle = '#37617a'; for (let x = 0; x < 384; x += 16) ctx.fillRect(x, 186 + Math.round(Math.sin(time * 2 + x) * 2), 12, 3);
      this.stars(ctx, time, 16);
    }

    stars(ctx, time, count) {
      ctx.fillStyle = '#7aa8ff';
      for (let i = 0; i < count; i += 1) { const x = (i * 83 + 17) % 384; const y = (i * 47 + 19) % 140; const pulse = Math.sin(time * 2 + i) > .5 ? 2 : 1; ctx.fillRect(x, y, pulse, pulse); }
    }

    glow(ctx, x, y, radius, color, alpha) {
      if (!this.allowGlow) return;
      ctx.save(); ctx.globalAlpha = alpha == null ? .12 : alpha; ctx.fillStyle = color;
      for (let size = radius; size > 3; size -= 5) ctx.fillRect(Math.round(x - size), Math.round(y - size / 2), size * 2, size);
      ctx.restore();
    }

    pixelText(ctx, text, x, y, color) {
      ctx.font = 'bold 7px monospace'; ctx.textBaseline = 'top'; ctx.fillStyle = '#080b1d'; ctx.fillText(text, x + 1, y + 1); ctx.fillStyle = color || '#f3f0ff'; ctx.fillText(text, x, y);
    }

    renderScanlines(ctx) {
      ctx.save(); ctx.globalAlpha = .04; ctx.fillStyle = '#000';
      for (let y = 1; y < ns.CONFIG.height; y += 3) ctx.fillRect(0, y, ns.CONFIG.width, 1);
      ctx.restore();
    }
  }

  ns.LumenkinRenderer = LumenkinRenderer;
})(window.Lumenkin = window.Lumenkin || {});
