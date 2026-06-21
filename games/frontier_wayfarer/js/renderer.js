(function (ns) {
    const { clamp, distance, hash } = ns.MathUtil;
    class Renderer {
        constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.w = 0; this.h = 0; this.dpr = 1; this.resize(); }
        resize() {
            const box = this.canvas.getBoundingClientRect(); this.dpr = Math.min(2, window.devicePixelRatio || 1); this.w = Math.max(320, box.width); this.h = Math.max(240, box.height);
            this.canvas.width = Math.round(this.w * this.dpr); this.canvas.height = Math.round(this.h * this.dpr); this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        }
        clear(region, camera) {
            const c = this.ctx; c.fillStyle = '#02070b'; c.fillRect(0, 0, this.w, this.h);
            for (let i = 0; i < 150; i++) {
                const layer = 1 + (i % 3); const sx = ((hash(91, i, layer, 1) * 4000 - camera.x / (12 * layer)) % this.w + this.w) % this.w;
                const sy = ((hash(33, i, layer, 2) * 2400 - camera.y / (12 * layer)) % this.h + this.h) % this.h;
                c.globalAlpha = .22 + layer * .14; c.fillStyle = i % 17 === 0 ? region.color : '#d7efff'; c.fillRect(sx, sy, layer === 1 ? 1 : 1.5, layer === 1 ? 1 : 1.5);
            }
            c.globalAlpha = 1;
            const glow = c.createRadialGradient(this.w * .5, this.h * .5, 50, this.w * .5, this.h * .5, Math.max(this.w, this.h) * .7);
            glow.addColorStop(0, `${region.color}0b`); glow.addColorStop(1, '#00000000'); c.fillStyle = glow; c.fillRect(0, 0, this.w, this.h);
        }
        screen(entity, camera) { return { x: this.w / 2 + entity.x - camera.x, y: this.h / 2 + entity.y - camera.y }; }
        drawWorld(game) {
            const c = this.ctx, camera = game.camera;
            game.world.loadedEntities().forEach(entity => {
                const p = this.screen(entity, camera); if (p.x < -150 || p.x > this.w + 150 || p.y < -150 || p.y > this.h + 150) return;
                if (entity.kind === 'asteroid') this.drawAsteroid(entity, p);
                else if (entity.kind === 'station') this.drawStation(entity, p);
                else if (entity.kind === 'anomaly') this.drawAnomaly(entity, p, game.time);
                else this.drawSignal(entity, p, game.time);
            });
            game.enemies.forEach(e => this.drawEnemy(e, this.screen(e, camera), game.time));
            game.bullets.forEach(b => { const p = this.screen(b, camera); c.strokeStyle = b.enemy ? '#ff597f' : '#55f0ad'; c.lineWidth = b.enemy ? 2 : 3; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - b.vx * .025, p.y - b.vy * .025); c.stroke(); });
            game.effects.forEach(effect => { const p = this.screen(effect, camera); c.globalAlpha = clamp(effect.life / effect.maxLife, 0, 1); c.fillStyle = '#b8d5dc'; c.fillRect(p.x, p.y, effect.size, effect.size); }); c.globalAlpha = 1;
        }
        drawAsteroid(e, p) {
            const c = this.ctx; c.save(); c.translate(p.x, p.y); c.rotate(e.rotation || 0); c.fillStyle = e.tier === 'large' ? '#101b22' : e.tier === 'medium' ? '#132029' : '#172630'; c.strokeStyle = '#476474'; c.lineWidth = e.tier === 'small' ? 1.4 : 2; c.beginPath();
            for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, r = e.radius * (.76 + hash(e.shapeSeed || 7, i, 4, 2) * .28); const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? c.lineTo(x, y) : c.moveTo(x, y); }
            c.closePath(); c.fill(); c.stroke();
            c.globalAlpha = .34; c.strokeStyle = '#78909a'; c.beginPath(); c.arc(-e.radius * .18, -e.radius * .12, e.radius * .22, .2, Math.PI * 1.5); c.stroke();
            if (e.hull < e.maxHull) { c.globalAlpha = .7; c.strokeStyle = '#ffbd59'; c.beginPath(); c.moveTo(-e.radius * .08, -e.radius * .65); c.lineTo(e.radius * .08, -.15 * e.radius); c.lineTo(-e.radius * .28, e.radius * .25); c.stroke(); }
            c.restore();
        }
        drawStation(e, p) {
            const c = this.ctx, color = ns.Data.FACTIONS[e.faction].color; c.save(); c.translate(p.x, p.y); c.strokeStyle = color; c.fillStyle = '#061117'; c.lineWidth = 3;
            c.beginPath(); c.arc(0, 0, e.radius || 95, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(0, 0, 52, 0, Math.PI * 2); c.fill(); c.stroke();
            c.globalAlpha = .45; c.beginPath(); c.moveTo(-125, 0); c.lineTo(125, 0); c.moveTo(0, -125); c.lineTo(0, 125); c.stroke(); c.globalAlpha = 1;
            c.fillStyle = color; c.font = '11px "Courier New"'; c.textAlign = 'center'; c.fillText(e.name.toUpperCase(), 0, (e.radius || 95) + 22); c.restore();
        }
        drawAnomaly(e, p, time) {
            const c = this.ctx; c.save(); c.translate(p.x, p.y); c.rotate(time * .18); c.strokeStyle = '#ce75ff'; c.lineWidth = 2;
            for (let i = 0; i < 4; i++) { c.globalAlpha = .25 + i * .15; c.beginPath(); c.ellipse(0, 0, 22 + i * 14, 48 + i * 10, i * .55, 0, Math.PI * 2); c.stroke(); }
            c.restore(); c.globalAlpha = 1;
        }
        drawSignal(e, p, time) { const c = this.ctx; c.strokeStyle = e.kind === 'salvage' ? '#ffbd59' : '#ce75ff'; c.lineWidth = 2; c.beginPath(); c.arc(p.x, p.y, 12 + Math.sin(time * 4) * 4, 0, Math.PI * 2); c.stroke(); c.fillStyle = c.strokeStyle; c.fillRect(p.x - 2, p.y - 2, 4, 4); }
        drawEnemy(e, p, time) {
            const c = this.ctx; c.save(); c.translate(p.x, p.y); c.rotate(e.angle + Math.PI / 2); c.strokeStyle = e.faction === 'concord' ? '#55d7ff' : '#ff4f91'; c.fillStyle = '#080b10'; c.lineWidth = 2;
            c.beginPath(); c.moveTo(0, -16); c.lineTo(13, 13); c.lineTo(0, 8); c.lineTo(-13, 13); c.closePath(); c.fill(); c.stroke(); c.restore();
            c.fillStyle = '#281018'; c.fillRect(p.x - 16, p.y + 20, 32, 3); c.fillStyle = '#ff597f'; c.fillRect(p.x - 16, p.y + 20, 32 * clamp(e.hull / e.maxHull, 0, 1), 3);
        }
        shipPath(points) { const c = this.ctx; c.beginPath(); points.forEach(([x, y], index) => index ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); }
        drawWeapon(moduleId, side) {
            if (!moduleId) return; const c = this.ctx, x = side * 15;
            c.fillStyle = '#122c34'; c.strokeStyle = '#6db8c4'; c.lineWidth = 1.4;
            if (moduleId.includes('seeker')) { c.fillRect(x - 5, -12, 10, 17); c.strokeRect(x - 5, -12, 10, 17); c.fillStyle = '#ffbd59'; [-2, 2].forEach(dx => { c.beginPath(); c.arc(x + dx, -8, 1.3, 0, Math.PI * 2); c.fill(); }); }
            else if (moduleId.includes('rail')) { c.fillRect(x - 2.5, -29, 5, 31); c.strokeRect(x - 2.5, -29, 5, 31); c.fillStyle = '#ce75ff'; c.fillRect(x - 1, -31, 2, 18); }
            else { const twin = moduleId.includes('mk2'); [-2, twin ? 2 : -2].filter((v, i, all) => all.indexOf(v) === i).forEach(dx => { c.fillRect(x + dx - 1.5, -23, 3, 24); c.strokeRect(x + dx - 1.5, -23, 3, 24); }); }
        }
        drawFittedStructures(game) {
            const c = this.ctx, slots = game.state.ship.slots, equipped = Object.values(slots).filter(Boolean);
            this.drawWeapon(slots.primary1, -1); this.drawWeapon(slots.primary2, 1);
            if (slots.engine === 'drive_mk2') { c.fillStyle = '#12313a'; c.strokeStyle = '#55d7ff'; [-1, 1].forEach(side => { c.fillRect(side * 14 - 4, 10, 8, 13); c.strokeRect(side * 14 - 4, 10, 8, 13); }); }
            if (slots.reactor === 'reactor_mk2') { c.strokeStyle = '#ffbd59'; c.lineWidth = 2; c.beginPath(); c.arc(0, 7, 7, 0, Math.PI * 2); c.stroke(); }
            if (slots.cargo === 'cargo_mk1') { c.strokeStyle = '#8faab3'; c.beginPath(); c.moveTo(-8, 11); c.lineTo(0, 18); c.lineTo(8, 11); c.stroke(); }
            if (slots.cargo === 'cargo_mk2' || equipped.includes('cargo_pods')) { c.fillStyle = '#17282d'; c.strokeStyle = '#ffbd59'; [-1, 1].forEach(side => { c.fillRect(side * 24 - 5, 0, 10, 18); c.strokeRect(side * 24 - 5, 0, 10, 18); }); }
            if (equipped.includes('sensor_array')) { c.strokeStyle = '#ce75ff'; c.beginPath(); c.arc(0, -7, 8, Math.PI, 0); c.stroke(); c.fillStyle = '#ce75ff'; c.fillRect(-1, -16, 2, 9); }
            if (equipped.includes('heat_sink')) { c.strokeStyle = '#55d7ff'; [-1, 1].forEach(side => { for (let y = 2; y < 17; y += 5) { c.beginPath(); c.moveTo(side * 12, y); c.lineTo(side * 20, y + 3); c.stroke(); } }); }
            if (equipped.includes('repair_drones') || equipped.includes('repair_swarm')) { c.fillStyle = '#55f0ad'; [-1, 1].forEach(side => { c.fillRect(side * 29 - 2, -3, 4, 4); }); }
            if (slots.defense) { c.strokeStyle = slots.defense === 'shield_prism' ? '#ce75ff' : '#55d7ff'; c.lineWidth = 2; [-1, 1].forEach(side => { c.beginPath(); c.arc(side * 18, 5, 5, -.8, .8); c.stroke(); }); }
            if (equipped.includes('emp_wave')) { c.strokeStyle = '#ffbd59'; c.beginPath(); c.arc(0, 5, 9, 0, Math.PI * 2); c.stroke(); }
            if (equipped.includes('blink_drive')) { c.fillStyle = '#ce75ff'; c.fillRect(-3, 15, 6, 5); }
            if (slots.engine === 'light_drive') { c.strokeStyle = '#f2f7ff'; c.fillStyle = '#704dff'; [-1, 1].forEach(side => { c.fillRect(side * 13 - 4, 13, 8, 12); c.strokeRect(side * 13 - 4, 13, 8, 12); }); }
            if (equipped.includes('afterburner')) { c.strokeStyle = '#ffbd59'; [-1, 1].forEach(side => { c.beginPath(); c.moveTo(side * 7, 16); c.lineTo(side * 12, 22); c.stroke(); }); }
            if (equipped.includes('shield_overcharger')) { c.strokeStyle = '#55d7ff'; c.beginPath(); c.arc(0, 3, 12, .2, Math.PI - .2); c.stroke(); }
            if (equipped.includes('phase_cloak')) { c.fillStyle = '#ce75ff'; [-1, 1].forEach(side => { c.beginPath(); c.arc(side * 10, -2, 2, 0, Math.PI * 2); c.fill(); }); }
        }
        drawShip(game) {
            const c = this.ctx, s = game.state.ship, scale = 1 + Math.min(4, s.chassis.level - 1) * .035; c.save(); c.translate(this.w / 2, this.h / 2); c.rotate(s.angle + Math.PI / 2); c.scale(scale, scale); c.globalAlpha = ns.Abilities.isActive(game.state, 'cloak') ? .35 : 1;
            c.shadowColor = '#55f0ad'; c.shadowBlur = 12; c.fillStyle = '#08181e'; c.strokeStyle = '#55f0ad'; c.lineWidth = 2;
            this.shipPath([[0,-31],[8,-18],[13,-8],[28,13],[20,20],[8,14],[0,22],[-8,14],[-20,20],[-28,13],[-13,-8],[-8,-18]]); c.fill(); c.stroke();
            c.shadowBlur = 0; c.fillStyle = '#112a32'; c.strokeStyle = '#3e7180'; this.shipPath([[0,-23],[7,-10],[8,10],[0,17],[-8,10],[-7,-10]]); c.fill(); c.stroke();
            c.fillStyle = '#55d7ff'; c.globalAlpha *= .8; this.shipPath([[0,-19],[5,-8],[0,-2],[-5,-8]]); c.fill(); c.globalAlpha = ns.Abilities.isActive(game.state, 'cloak') ? .35 : 1;
            c.fillStyle = '#ffbd59'; c.shadowColor = '#ffbd59'; c.shadowBlur = 8; c.beginPath(); c.arc(0, 7, 3.5, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
            this.drawFittedStructures(game);
            const thrusting = game.input.down('w', 'W') || ns.Abilities.isActive(game.state, 'afterburner'); c.fillStyle = ns.Abilities.isActive(game.state, 'afterburner') ? '#ffbd59' : '#55d7ff'; [-1, 1].forEach(side => { c.beginPath(); c.moveTo(side * 8 - 3, 17); c.lineTo(side * 8, 22 + (thrusting ? 12 : 4) + Math.random() * 5); c.lineTo(side * 8 + 3, 17); c.fill(); });
            if (s.shield > 0 || s.overshield > 0) { c.globalAlpha = .18 + (s.overshield > 0 ? .18 : 0); c.strokeStyle = s.overshield > 0 ? '#ce75ff' : '#55d7ff'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(0, 0, 35, 40, 0, 0, Math.PI * 2); c.stroke(); }
            c.restore();
        }
        drawNebulaPuff(x, y, radius, alpha, color) {
            const c = this.ctx, glow = c.createRadialGradient(x, y, radius * .06, x, y, radius);
            glow.addColorStop(0, `rgba(${color},${alpha})`); glow.addColorStop(.38, `rgba(${color},${alpha * .72})`); glow.addColorStop(.75, `rgba(${color},${alpha * .2})`); glow.addColorStop(1, `rgba(${color},0)`);
            c.fillStyle = glow; c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        }
        drawNebula(game) {
            const c = this.ctx, exposure = ns.World.boundaryExposure(game.state.ship.x, game.state.ship.y); if (exposure.proximity <= 0) return;
            const bounds = ns.World.WORLD_BOUNDS, edges = [
                { axis: 'x', side: -1, screen: this.w / 2 + bounds.minX - game.camera.x }, { axis: 'x', side: 1, screen: this.w / 2 + bounds.maxX - game.camera.x },
                { axis: 'y', side: -1, screen: this.h / 2 + bounds.minY - game.camera.y }, { axis: 'y', side: 1, screen: this.h / 2 + bounds.maxY - game.camera.y }
            ];
            c.save(); c.globalCompositeOperation = 'screen'; edges.forEach((edge, edgeIndex) => {
                const span = edge.axis === 'x' ? this.h : this.w; if (edge.screen < -1150 || edge.screen > (edge.axis === 'x' ? this.w : this.h) + 1150) return;
                for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 12; i++) {
                    const along = (i / 11) * span + (hash(771, edgeIndex, i, layer) - .5) * 150, radius = 170 + hash(992, edgeIndex, i, layer) * 230;
                    const depth = 40 + layer * 230 + hash(445, edgeIndex, i, layer) * 170;
                    const x = edge.axis === 'x' ? edge.screen + edge.side * depth : along;
                    const y = edge.axis === 'y' ? edge.screen + edge.side * depth : along;
                    this.drawNebulaPuff(x, y, radius, .095 + exposure.proximity * .075 + layer * .018, layer === 1 ? '106,58,132' : '142,62,135');
                }
                c.strokeStyle = `rgba(255,120,165,${.1 + exposure.proximity * .16})`; c.lineWidth = 1.5; c.setLineDash([5, 15]); c.beginPath(); if (edge.axis === 'x') { c.moveTo(edge.screen, 0); c.lineTo(edge.screen, this.h); } else { c.moveTo(0, edge.screen); c.lineTo(this.w, edge.screen); } c.stroke(); c.setLineDash([]);
            });
            if (exposure.active) {
                const density = Math.min(1, .48 + exposure.depth / 1400), fieldW = this.w + 700, fieldH = this.h + 700;
                c.globalCompositeOperation = 'source-over'; c.fillStyle = `rgba(68,18,66,${.1 + density * .18})`; c.fillRect(0, 0, this.w, this.h); c.globalCompositeOperation = 'screen';
                for (let i = 0; i < 28; i++) {
                    const x = ((hash(1801, i, 1, 1) * fieldW - game.camera.x * (.08 + i % 3 * .025)) % fieldW + fieldW) % fieldW - 350;
                    const y = ((hash(2203, i, 2, 1) * fieldH - game.camera.y * (.08 + i % 4 * .02)) % fieldH + fieldH) % fieldH - 350;
                    const radius = 190 + hash(2711, i, 3, 1) * 330, color = i % 4 === 0 ? '80,100,145' : i % 3 === 0 ? '178,61,128' : '112,58,143';
                    this.drawNebulaPuff(x, y, radius, .075 + density * .12, color);
                }
            }
            c.restore();
        }
        drawRadar(game) {
            const c = this.ctx, x = this.w - 92, y = this.h - 92, radius = 70, range = 1300 * game.state.settings.radarScale;
            c.save(); c.translate(x, y); c.fillStyle = '#02090dcc'; c.strokeStyle = '#55f0ad55'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, radius, 0, Math.PI * 2); c.fill(); c.stroke();
            c.beginPath(); c.moveTo(-radius, 0); c.lineTo(radius, 0); c.moveTo(0, -radius); c.lineTo(0, radius); c.stroke();
            const drawBlip = (e, color, size) => { const dx = (e.x - game.state.ship.x) / range * radius, dy = (e.y - game.state.ship.y) / range * radius; if (Math.hypot(dx, dy) > radius) return; c.fillStyle = color; c.fillRect(dx - size / 2, dy - size / 2, size, size); };
            game.world.nearbyEntities(game.state.ship.x, game.state.ship.y, range).forEach(e => drawBlip(e, e.kind === 'station' ? ns.Data.FACTIONS[e.faction].color : e.kind === 'asteroid' ? '#56707d' : '#ce75ff', e.kind === 'station' ? 5 : 3));
            game.enemies.forEach(e => drawBlip(e, '#ff4f91', 4)); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 3, 0, Math.PI * 2); c.fill(); c.restore();
        }
        drawPhaseOverlay(game) {
            const c = this.ctx, travel = ns.LightSpeed.ensure(game), ratio = Math.min(1, travel.timer / ns.LightSpeed.CONFIG.chargeDuration);
            c.save(); c.globalCompositeOperation = 'screen'; c.strokeStyle = `rgba(150,125,255,${.18 + ratio * .5})`; c.lineWidth = 1 + ratio * 4;
            for (let i = 0; i < 28; i++) { const a = hash(6021, i, 1, 1) * Math.PI * 2, inner = 90 + ratio * 160, outer = inner + 40 + ratio * 380 * hash(6022, i, 2, 1); c.beginPath(); c.moveTo(this.w / 2 + Math.cos(a) * inner, this.h / 2 + Math.sin(a) * inner); c.lineTo(this.w / 2 + Math.cos(a) * outer, this.h / 2 + Math.sin(a) * outer); c.stroke(); }
            c.strokeStyle = `rgba(85,240,173,${.2 + ratio * .55})`; c.lineWidth = 2; c.beginPath(); c.arc(this.w / 2, this.h / 2, 45 + ratio * Math.max(this.w, this.h) * .42, 0, Math.PI * 2); c.stroke(); c.restore();
        }
        drawLightSpeed(game) {
            const c = this.ctx, travel = ns.LightSpeed.ensure(game), shake = game.state.settings.screenShake ? 2.2 : 0, cx = this.w / 2, cy = this.h / 2, decel = travel.phase === 'decelerating' ? Math.max(0, 1 - travel.timer / ns.LightSpeed.CONFIG.decelerationDuration) : 1;
            c.save(); c.translate(Math.sin(game.time * 73) * shake, Math.cos(game.time * 61) * shake);
            c.fillStyle = '#01020a'; c.fillRect(0, 0, this.w, this.h);
            const glow = c.createRadialGradient(cx, cy, 20, cx, cy, Math.max(this.w, this.h) * .7); glow.addColorStop(0, '#482c8a88'); glow.addColorStop(.42, '#12164a88'); glow.addColorStop(1, '#000008'); c.fillStyle = glow; c.fillRect(0, 0, this.w, this.h);
            c.save(); c.globalCompositeOperation = 'screen';
            for (let i = 0; i < 130; i++) {
                const a = hash(7101, i, 3, 1) * Math.PI * 2, pulse = (game.time * (260 + i % 7 * 37) + hash(7111, i, 2, 1) * 900) % 900;
                const inner = 30 + pulse, length = (90 + hash(7121, i, 4, 1) * 310) * decel, spread = .58 + hash(7131, i, 5, 1) * .55;
                c.strokeStyle = i % 9 === 0 ? '#d57cff' : i % 5 === 0 ? '#55f0ad' : '#b8dcff'; c.globalAlpha = .18 + hash(7141, i, 6, 1) * .65; c.lineWidth = .6 + hash(7151, i, 7, 1) * 2.4;
                c.beginPath(); c.moveTo(cx + Math.cos(a) * inner * spread, cy + Math.sin(a) * inner); c.lineTo(cx + Math.cos(a) * (inner + length) * spread, cy + Math.sin(a) * (inner + length)); c.stroke();
            }
            c.globalAlpha = .42; c.strokeStyle = '#8a72ff'; c.lineWidth = 2;
            for (let i = 0; i < 5; i++) { const radius = 110 + ((game.time * 520 + i * 170) % 850); c.beginPath(); c.ellipse(cx, cy, radius * 1.15, radius * .58, 0, 0, Math.PI * 2); c.stroke(); }
            c.restore();
            c.save(); c.translate(cx, cy); c.rotate(game.state.ship.angle); c.globalCompositeOperation = 'screen';
            const wake = 160 + decel * 240; c.fillStyle = '#7d65ff55'; c.beginPath(); c.moveTo(-28, 0); c.lineTo(-wake, -34); c.lineTo(-wake * .72, 0); c.lineTo(-wake, 34); c.closePath(); c.fill(); c.restore();
            this.drawShip(game);
            c.strokeStyle = '#d9e9ff88'; c.lineWidth = 1; c.beginPath(); c.moveTo(cx - 42, cy); c.lineTo(cx - 17, cy); c.moveTo(cx + 17, cy); c.lineTo(cx + 42, cy); c.moveTo(cx, cy - 42); c.lineTo(cx, cy - 17); c.stroke();
            c.fillStyle = '#cfe9ff'; c.font = '11px "Courier New"'; c.textAlign = 'center'; c.fillText(`VECTOR ${Math.round(game.state.ship.x)}, ${Math.round(game.state.ship.y)} // ${game.region.name.toUpperCase()}`, cx, this.h - 42);
            c.restore();
        }
        render(game) {
            if (ns.LightSpeed.isShifted(game)) { this.drawLightSpeed(game); return; }
            this.clear(game.region, game.camera); const c = this.ctx, zoom = game.camera.zoom || 1;
            c.save(); c.translate(this.w / 2, this.h / 2); c.scale(zoom, zoom); c.translate(-this.w / 2, -this.h / 2); this.drawWorld(game); this.drawNebula(game); this.drawShip(game); c.restore();
            if (ns.LightSpeed.ensure(game).phase === 'charging') this.drawPhaseOverlay(game);
            this.drawRadar(game);
        }
    }
    ns.Renderer = Renderer;
})(window.MiniInvadersV2);
