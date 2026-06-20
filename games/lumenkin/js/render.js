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
      this.allowGlow = true;
    }

    render(game) {
      const ctx = this.ctx; const campaign = game.campaign;
      ctx.save(); ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = this.palette.sky(campaign ? campaign.chapter : 0, campaign ? campaign.ecology.health : 50); ctx.fillRect(0, 0, ns.CONFIG.width, ns.CONFIG.height);
      if (!campaign || !game.chapter) this.renderDormant(ctx, game.time);
      else [this.renderFirstGlow, this.renderBrood, this.renderCity, this.renderWorldroot, this.renderBloom][campaign.chapter].call(this, ctx, game);
      game.particles.render(ctx); this.renderScanlines(ctx); ctx.restore();
    }

    renderDormant(ctx, time) {
      this.stars(ctx, time, 26); ctx.fillStyle = '#121532'; ctx.fillRect(0, 172, 384, 44);
      ctx.fillStyle = '#292557'; for (let x = 0; x < 384; x += 14) ctx.fillRect(x, 168 + (x % 28 ? 4 : 0), 12, 8);
      this.catalog.draw(ctx, 'eggMote', 164, 91, 56, 76); this.glow(ctx, 192, 137, 30, '#55f6e8', .18);
    }

    renderFirstGlow(ctx, game) {
      const state = game.chapter.state; this.stars(ctx, game.time, 20); this.drawSideBiome(ctx, game.time);
      this.catalog.draw(ctx, 'nursery', 11, 117, 72, 56);
      const nestWidth = Math.round(25 + state.nest * .38); ctx.fillStyle = '#4e4a88'; ctx.fillRect(38, 165, nestWidth, 5);
      const sprite = this.assembler.compose(game.campaign.lineage.founder, 'side', 30);
      const bob = Math.round(Math.sin(game.time * 2) * 2); const x = state.player.x;
      this.glow(ctx, x, 154 + bob, 24, '#55f6e8', .12); ctx.drawImage(sprite, Math.round(x - 22), 119 + bob, 44, 44);
      if (state.mateAttracted && game.campaign.lineage.mate) {
        const mate = this.assembler.compose(game.campaign.lineage.mate, 'side', 30); this.glow(ctx, 292, 157, 22, '#ffad6b', .12); ctx.drawImage(mate, 270, 123, 44, 44);
      }
      this.drawPlanPips(ctx, game.chapter, 286, 12);
      this.pixelText(ctx, state.mateAttracted ? 'TWO LIGHTS CHOOSE' : 'LUMA CHOOSES A DAY', 8, 14, '#aaa7cc');
      this.pixelText(ctx, String(state.activity || 'wake').toUpperCase(), 8, 25, '#55f6e8');
    }

    drawSideBiome(ctx, time) {
      ctx.fillStyle = '#141638'; ctx.fillRect(0, 154, 384, 62); ctx.fillStyle = '#292557';
      for (let x = 0; x < 384; x += 12) { const h = 4 + ((x * 7) % 13); ctx.fillRect(x, 154 - h, 8, h + 3); }
      ctx.fillStyle = '#4b3471'; for (let x = 5; x < 384; x += 31) { const wave = Math.round(Math.sin(time * .7 + x) * 2); ctx.fillRect(x, 142 + wave, 2, 12); ctx.fillRect(x - 3, 144 + wave, 8, 2); ctx.fillStyle = '#55f6e8'; ctx.fillRect(x, 141 + wave, 2, 2); ctx.fillStyle = '#4b3471'; }
    }

    renderBrood(ctx, game) {
      const state = game.chapter.state; this.drawTopBiome(ctx); const alive = state.creatures.filter(creature => creature.hp > 0);
      alive.forEach((creature, index) => {
        const angle = index / Math.max(1, alive.length) * Math.PI * 2 + game.time * .08;
        const x = 192 + Math.cos(angle) * (46 + index * 3); const y = 118 + Math.sin(angle) * 38;
        const sprite = this.assembler.compose(creature.appearance, 'top', creature.age); const size = creature.role === 'young' ? 18 : 25;
        ctx.drawImage(sprite, Math.round(x - size / 2), Math.round(y - size / 2), size, size);
        if (creature.hp < 60) { ctx.fillStyle = '#ff668c'; ctx.fillRect(Math.round(x - 8), Math.round(y - 13), Math.round(16 * creature.hp / 100), 2); }
      });
      state.creatures.filter(creature => creature.hp <= 0).forEach((creature, index) => { ctx.fillStyle = '#4e4a88'; ctx.fillRect(42 + index * 9, 187, 6, 2); });
      ctx.strokeStyle = state.threat > 55 ? '#ff668c' : '#4e4a88'; ctx.strokeRect(25, 35, 334, 150);
      this.drawPlanPips(ctx, game.chapter, 286, 12);
      this.pixelText(ctx, `${alive.length} LIVING KIN // BORDER ${Math.round(state.threat)}`, 8, 14, '#55f6e8');
    }

    drawTopBiome(ctx) {
      ctx.fillStyle = '#111633'; ctx.fillRect(0, 0, 384, 216); ctx.strokeStyle = '#242451';
      for (let x = -20; x < 420; x += 24) for (let y = 6; y < 220; y += 18) ctx.strokeRect(x + ((y / 18) % 2) * 12, y, 24, 18);
      ctx.fillStyle = '#4e4a88'; ctx.fillRect(164, 91, 54, 44); ctx.fillStyle = '#0d1029'; ctx.fillRect(173, 98, 36, 28);
    }

    renderCity(ctx, game) {
      const state = game.chapter.state; ctx.fillStyle = '#0c102a'; ctx.fillRect(0, 0, 384, 216); this.drawIsometricGround(ctx);
      state.structures.forEach((structure, index) => {
        const frame = structure.type === 'nursery' ? 'nursery' : structure.type; const size = [42, 38];
        this.glow(ctx, structure.x, structure.y, 18, index % 2 ? '#55f6e8' : '#7aa8ff', .08); this.catalog.draw(ctx, frame, structure.x - 21, structure.y - 38, 42, 38);
        if (state.selectedId === structure.id) { ctx.strokeStyle = '#ffd45b'; ctx.strokeRect(structure.x - 23, structure.y - 40, 46, 42); }
      });
      const citizens = state.citizens.filter(citizen => citizen.health > 0).slice(0, 80);
      citizens.forEach((citizen, index) => { const x = 28 + (index * 47 + Math.floor(game.time * (index % 3 + 1) * 2)) % 330; const y = 83 + (index * 29) % 113; ctx.fillStyle = { grower: '#55f6e8', builder: '#ffad6b', healer: '#7aa8ff', scholar: '#ffd45b' }[citizen.aptitude]; ctx.fillRect(Math.round(x), Math.round(y), 3, 3); ctx.fillStyle = '#292557'; ctx.fillRect(Math.round(x - 1), Math.round(y + 3), 5, 3); });
      this.drawPlanPips(ctx, game.chapter, 286, 12);
      this.pixelText(ctx, `${citizens.length} VISIBLE // ${state.structures.length} STRUCTURES`, 8, 14, '#55f6e8');
    }

    drawIsometricGround(ctx) {
      ctx.strokeStyle = '#252951';
      for (let row = 0; row < 8; row += 1) for (let col = 0; col < 12; col += 1) { const x = 12 + col * 34 + (row % 2) * 17; const y = 47 + row * 21; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 17, y - 9); ctx.lineTo(x + 34, y); ctx.lineTo(x + 17, y + 9); ctx.closePath(); ctx.stroke(); }
    }

    renderWorldroot(ctx, game) {
      const state = game.chapter.state; ctx.fillStyle = '#080b1d'; ctx.fillRect(0, 0, 384, 216); this.drawIslandMap(ctx, state);
      state.regions.forEach((region, index) => {
        const selected = index === state.selectedRegion; const frame = region.biome === 'ridge' ? 'settlementStorm' : region.biome === 'wild' ? 'settlementWild' : region.health > 65 ? 'settlementGarden' : 'settlementChorus';
        this.catalog.draw(ctx, frame, region.x - 15, region.y - 18, 30, 28, { alpha: region.settled || index === 0 ? 1 : .72 });
        ctx.fillStyle = region.exhaustion > 55 ? '#ff668c' : '#55f6e8'; ctx.fillRect(region.x - 12, region.y + 12, Math.max(1, Math.round(24 * (100 - region.exhaustion) / 100)), 2);
        if (selected) { ctx.strokeStyle = '#ffd45b'; ctx.strokeRect(region.x - 19, region.y - 22, 38, 38); this.pixelText(ctx, region.name.toUpperCase(), Math.max(4, region.x - region.name.length * 3), region.y + 27, '#ffd45b'); }
      });
      this.drawPlanPips(ctx, game.chapter, 286, 12);
      this.pixelText(ctx, `WORLD ${Math.round(state.health)} // ARK PLAN ${Math.round(state.bloomReadiness)}`, 8, 14, '#55f6e8');
    }

    drawIslandMap(ctx, state) {
      const color = state.health < 35 ? '#552846' : state.health < 65 ? '#34315f' : '#274c5e'; ctx.fillStyle = '#10183c';
      for (let y = 24; y < 216; y += 8) ctx.fillRect(Math.round(Math.sin(y + state.cycle) * 4), y, 384, 3);
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(45, 135); ctx.lineTo(82, 73); ctx.lineTo(142, 50); ctx.lineTo(210, 38); ctx.lineTo(322, 58); ctx.lineTo(354, 113); ctx.lineTo(315, 175); ctx.lineTo(231, 195); ctx.lineTo(136, 185); ctx.lineTo(69, 166); ctx.closePath(); ctx.fill();
    }

    renderBloom(ctx, game) {
      const state = game.chapter.state; this.renderBloomSky(ctx, game.time, state.distance);
      const routeColors = { sheltered: '#7aa8ff', bright: '#ffd45b', storm: '#ff668c' };
      const plannedRoute = state.plan.route && state.plan.route.orderId || 'sheltered'; ctx.strokeStyle = routeColors[plannedRoute]; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(35, 108); ctx.bezierCurveTo(120, plannedRoute === 'storm' ? 35 : 145, 270, plannedRoute === 'bright' ? 70 : 130, 370, 108); ctx.stroke(); ctx.setLineDash([]);
      const x = state.player.x; const y = state.player.y + Math.round(Math.sin(game.time * 1.4) * 3); this.glow(ctx, x, y, 42, '#55f6e8', .12); this.catalog.draw(ctx, 'ark', x - 55, y - 22, 110, 44);
      const morphology = game.campaign.lineage.branches[0]; ctx.fillStyle = morphology === 'shellback' ? '#ffad6b' : morphology === 'sailfin' ? '#ffd45b' : '#55f6e8';
      if (morphology === 'shellback') ctx.fillRect(x - 24, y - 26, 48, 3);
      if (morphology === 'sailfin') { ctx.beginPath(); ctx.moveTo(x, y - 22); ctx.lineTo(x + 20, y - 38); ctx.lineTo(x + 14, y - 18); ctx.fill(); }
      if (morphology === 'grasping-limbs') for (let i = 0; i < 4; i += 1) ctx.fillRect(x - 20 + i * 13, y + 19, 2, 10 + i % 2 * 5);
      this.drawPlanPips(ctx, game.chapter, 286, 12);
      this.pixelText(ctx, `VOYAGE ${Math.min(100, Math.floor(state.distance / state.destination * 100))}%`, 8, 14, '#ffd45b');
    }

    renderBloomSky(ctx, time, distance) {
      ctx.fillStyle = '#151333'; ctx.fillRect(0, 0, 384, 216); ctx.fillStyle = '#342451';
      for (let i = 0; i < 8; i += 1) { const x = ((i * 81 - distance * .12) % 480 + 480) % 480 - 48; ctx.fillRect(Math.round(x), 35 + (i % 3) * 44, 42, 5); ctx.fillRect(Math.round(x + 8), 30 + (i % 3) * 44, 28, 5); }
      ctx.fillStyle = '#1d3151'; ctx.fillRect(0, 189, 384, 27); ctx.fillStyle = '#37617a'; for (let x = 0; x < 384; x += 16) ctx.fillRect(x, 186 + Math.round(Math.sin(time * 2 + x) * 2), 12, 3); this.stars(ctx, time, 16);
    }

    drawPlanPips(ctx, chapter, x, y) {
      chapter.slots().forEach((slot, index) => { const assignment = chapter.state.plan[slot.id]; ctx.fillStyle = assignment ? '#ffd45b' : '#4e4a88'; ctx.fillRect(x + index * 26, y, 20, 4); });
    }
    stars(ctx, time, count) { ctx.fillStyle = '#7aa8ff'; for (let i = 0; i < count; i += 1) { const x = (i * 83 + 17) % 384; const y = (i * 47 + 19) % 140; const pulse = Math.sin(time * 2 + i) > .5 ? 2 : 1; ctx.fillRect(x, y, pulse, pulse); } }
    glow(ctx, x, y, radius, color, alpha) { if (!this.allowGlow) return; ctx.save(); ctx.globalAlpha = alpha == null ? .12 : alpha; ctx.fillStyle = color; for (let size = radius; size > 3; size -= 5) ctx.fillRect(Math.round(x - size), Math.round(y - size / 2), size * 2, size); ctx.restore(); }
    pixelText(ctx, text, x, y, color) { ctx.font = 'bold 7px monospace'; ctx.textBaseline = 'top'; ctx.fillStyle = '#080b1d'; ctx.fillText(text, x + 1, y + 1); ctx.fillStyle = color || '#f3f0ff'; ctx.fillText(text, x, y); }
    renderScanlines(ctx) { ctx.save(); ctx.globalAlpha = .04; ctx.fillStyle = '#000'; for (let y = 1; y < ns.CONFIG.height; y += 3) ctx.fillRect(0, y, ns.CONFIG.width, 1); ctx.restore(); }
  }

  ns.LumenkinRenderer = LumenkinRenderer;
})(window.Lumenkin = window.Lumenkin || {});
