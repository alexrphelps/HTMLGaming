(function (ns) {
    const { clamp, distance, hash } = ns.MathUtil;
    class Renderer {
        constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.w = 0; this.h = 0; this.dpr = 1; this.resize(); }
        resize() {
            const box = this.canvas.getBoundingClientRect(); this.dpr = Math.min(2, window.devicePixelRatio || 1); this.w = Math.max(640, box.width); this.h = Math.max(360, box.height);
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
        }
        drawAsteroid(e, p) {
            const c = this.ctx; c.save(); c.translate(p.x, p.y); c.rotate((e.spin || 0) * .3); c.fillStyle = '#101b22'; c.strokeStyle = '#385160'; c.lineWidth = 2; c.beginPath();
            for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, r = e.radius * (.78 + hash(7, e.id.length, i, 4) * .25); const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? c.lineTo(x, y) : c.moveTo(x, y); }
            c.closePath(); c.fill(); c.stroke(); c.restore();
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
        drawShip(game) {
            const c = this.ctx, s = game.state.ship; c.save(); c.translate(this.w / 2, this.h / 2); c.rotate(s.angle + Math.PI / 2); c.globalAlpha = ns.Abilities.isActive(game.state, 'cloak') ? .35 : 1;
            c.shadowColor = '#55f0ad'; c.shadowBlur = 12; c.fillStyle = '#07151a'; c.strokeStyle = '#55f0ad'; c.lineWidth = 2;
            c.beginPath(); c.moveTo(0, -24); c.lineTo(15, 16); c.lineTo(0, 10); c.lineTo(-15, 16); c.closePath(); c.fill(); c.stroke();
            c.shadowBlur = 0; if (game.input.down('w', 'W') || ns.Abilities.isActive(game.state, 'afterburner')) { c.fillStyle = ns.Abilities.isActive(game.state, 'afterburner') ? '#ffbd59' : '#55d7ff'; c.beginPath(); c.moveTo(-7, 15); c.lineTo(0, 28 + Math.random() * 8); c.lineTo(7, 15); c.fill(); }
            c.restore();
            c.strokeStyle = '#55f0ad66'; c.lineWidth = 1; c.beginPath(); c.moveTo(this.w / 2, this.h / 2 - 38); c.lineTo(this.w / 2, this.h / 2 - 94); c.stroke();
        }
        drawRadar(game) {
            const c = this.ctx, x = this.w - 92, y = this.h - 92, radius = 70, range = 1300 * game.state.settings.radarScale;
            c.save(); c.translate(x, y); c.fillStyle = '#02090dcc'; c.strokeStyle = '#55f0ad55'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, radius, 0, Math.PI * 2); c.fill(); c.stroke();
            c.beginPath(); c.moveTo(-radius, 0); c.lineTo(radius, 0); c.moveTo(0, -radius); c.lineTo(0, radius); c.stroke();
            const drawBlip = (e, color, size) => { const dx = (e.x - game.state.ship.x) / range * radius, dy = (e.y - game.state.ship.y) / range * radius; if (Math.hypot(dx, dy) > radius) return; c.fillStyle = color; c.fillRect(dx - size / 2, dy - size / 2, size, size); };
            game.world.nearbyEntities(game.state.ship.x, game.state.ship.y, range).forEach(e => drawBlip(e, e.kind === 'station' ? ns.Data.FACTIONS[e.faction].color : e.kind === 'asteroid' ? '#56707d' : '#ce75ff', e.kind === 'station' ? 5 : 3));
            game.enemies.forEach(e => drawBlip(e, '#ff4f91', 4)); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 3, 0, Math.PI * 2); c.fill(); c.restore();
        }
        render(game) { this.clear(game.region, game.camera); this.drawWorld(game); this.drawShip(game); this.drawRadar(game); }
    }
    ns.Renderer = Renderer;
})(window.MiniInvadersV2);
