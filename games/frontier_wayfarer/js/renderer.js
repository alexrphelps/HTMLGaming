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
        screen(entity, camera) { return { x: this.w / 2 + entity.x - camera.x + (this.shakeX || 0), y: this.h / 2 + entity.y - camera.y + (this.shakeY || 0) }; }
        drawWorld(game) {
            const c = this.ctx, camera = game.camera;
            game.world.loadedEntities().forEach(entity => {
                const p = this.screen(entity, camera); if (p.x < -150 || p.x > this.w + 150 || p.y < -150 || p.y > this.h + 150) return;
                if (entity.kind === 'asteroid') this.drawAsteroid(entity, p);
                else if (entity.kind === 'station') this.drawStation(entity, p, game.time);
                else if (entity.kind === 'anomaly') this.drawAnomaly(entity, p, game.time);
                else if (entity.kind === 'worldObject') this.drawWorldObject(entity, p, game.time);
                else if (entity.kind === 'worldScenario') this.drawWorldScenario(entity, p, game.time);
                else this.drawSignal(entity, p, game.time);
            });
            game.enemies.forEach(e => this.drawEnemy(e, this.screen(e, camera), game.time));
            const convoy = game.state.contracts.active?.escort?.convoy; if (convoy?.hull > 0) this.drawConvoy(convoy, this.screen(convoy, camera), game.time);
            game.bullets.forEach(b => { const p = this.screen(b, camera); c.strokeStyle = b.color || (b.enemy ? '#ff597f' : '#55f0ad'); c.lineWidth = b.type === 'beam' ? 5 : b.enemy ? 2 : 3; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - b.vx * (b.type === 'beam' ? .06 : .025), p.y - b.vy * (b.type === 'beam' ? .06 : .025)); c.stroke(); if (b.type === 'missile') { c.fillStyle = b.color || '#ffbd59'; c.fillRect(p.x - 2, p.y - 2, 4, 4); const speed = Math.max(1, Math.hypot(b.vx, b.vy)); c.globalAlpha = .55; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - b.vx / speed * 14, p.y - b.vy / speed * 14); c.stroke(); c.globalAlpha = 1; } else if (b.type === 'mine') { c.globalAlpha = .45 + Math.sin(game.time * 7) * .2; c.beginPath(); c.arc(p.x, p.y, b.radius + 4, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1; } });
            game.effects.forEach(effect => { const p = this.screen(effect, camera); c.globalAlpha = clamp(effect.life / effect.maxLife, 0, 1); if (effect.flash) { c.strokeStyle = '#f2f7ff'; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y, effect.size * (1 - effect.life / effect.maxLife * .65), 0, Math.PI * 2); c.stroke(); } else { c.fillStyle = '#b8d5dc'; c.fillRect(p.x, p.y, effect.size, effect.size); } }); c.globalAlpha = 1;
        }
        drawAsteroid(e, p) {
            const c = this.ctx; c.save(); c.translate(p.x, p.y); c.rotate(e.rotation || 0); c.fillStyle = e.tier === 'large' ? '#101b22' : e.tier === 'medium' ? '#132029' : '#172630'; c.strokeStyle = '#476474'; c.lineWidth = e.tier === 'small' ? 1.4 : 2; c.beginPath();
            for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, r = e.radius * (.76 + hash(e.shapeSeed || 7, i, 4, 2) * .28); const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? c.lineTo(x, y) : c.moveTo(x, y); }
            c.closePath(); c.fill(); c.stroke();
            c.globalAlpha = .34; c.strokeStyle = '#78909a'; c.beginPath(); c.arc(-e.radius * .18, -e.radius * .12, e.radius * .22, .2, Math.PI * 1.5); c.stroke();
            if (e.hull < e.maxHull) { c.globalAlpha = .7; c.strokeStyle = '#ffbd59'; c.beginPath(); c.moveTo(-e.radius * .08, -e.radius * .65); c.lineTo(e.radius * .08, -.15 * e.radius); c.lineTo(-e.radius * .28, e.radius * .25); c.stroke(); }
            c.restore();
        }
        drawStation(e, p, time) {
            const c = this.ctx, color = ns.Data.FACTIONS[e.faction].color, radius = e.radius || 95, phase = hash(e.x, e.y, e.name.length, 7) * Math.PI * 2, t = (time || 0) + phase;
            const arms = e.faction === 'concord' ? 4 : e.faction === 'corsairs' ? 3 : 6, core = e.major ? 36 : 29;
            c.save(); c.translate(p.x, p.y); c.fillStyle = '#061117'; c.strokeStyle = color; c.lineWidth = 2;
            c.globalAlpha = .22; c.beginPath(); c.arc(0, 0, radius + 10 + Math.sin(t * 1.7) * 4, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1;
            c.save(); c.rotate(t * (e.faction === 'corsairs' ? -.08 : .055));
            for (let i = 0; i < arms; i++) {
                c.save(); c.rotate(i / arms * Math.PI * 2); c.fillStyle = '#0b2028'; c.strokeStyle = color; c.fillRect(core - 3, -7, radius - core + 2, 14); c.strokeRect(core - 3, -7, radius - core + 2, 14);
                c.fillStyle = '#102e38'; c.fillRect(radius - 18, -13, 20, 26); c.strokeRect(radius - 18, -13, 20, 26);
                c.fillStyle = i % 2 ? '#ffbd59' : color; c.globalAlpha = .55 + Math.sin(t * 4 + i) * .25; c.fillRect(radius - 5, -2, 5, 4); c.restore();
            }
            c.restore(); c.globalAlpha = 1;
            c.save(); c.rotate(t * -.11); c.setLineDash?.([10, 7]); c.lineWidth = e.major ? 3 : 2; c.beginPath(); c.arc(0, 0, radius * .72, 0, Math.PI * 2); c.stroke(); c.setLineDash?.([]); c.restore();
            c.fillStyle = '#07151c'; c.lineWidth = 3; c.beginPath();
            if (e.faction === 'concord') { for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4, x = Math.cos(a) * core, y = Math.sin(a) * core; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.closePath(); }
            else if (e.faction === 'corsairs') { for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r = i % 2 ? core * .72 : core; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.closePath(); }
            else c.arc(0, 0, core, 0, Math.PI * 2);
            c.fill(); c.stroke();
            c.globalAlpha = .35; c.fillStyle = color; c.beginPath(); c.arc(0, 0, 15 + Math.sin(t * 2.5) * 3, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; c.strokeStyle = '#d7f5ff'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, 8, 0, Math.PI * 2); c.stroke();
            c.strokeStyle = color; c.globalAlpha = .6; c.beginPath(); c.moveTo(-radius - 18, 0); c.lineTo(-radius + 3, 0); c.moveTo(radius - 3, 0); c.lineTo(radius + 18, 0); c.stroke(); c.globalAlpha = 1;
            c.fillStyle = color; c.font = '11px "Courier New"'; c.textAlign = 'center'; c.fillText(e.name.toUpperCase(), 0, radius + 24); c.font = '8px "Courier New"'; c.fillText(`${e.major ? 'MAJOR ' : ''}${ns.Data.FACTIONS[e.faction].short} FACILITY`, 0, radius + 37); c.restore();
        }
        drawAnomaly(e, p, time) {
            const c = this.ctx; c.save(); c.translate(p.x, p.y); c.rotate(time * .18); c.strokeStyle = '#ce75ff'; c.lineWidth = 2;
            for (let i = 0; i < 4; i++) { c.globalAlpha = .25 + i * .15; c.beginPath(); c.ellipse(0, 0, 22 + i * 14, 48 + i * 10, i * .55, 0, Math.PI * 2); c.stroke(); }
            c.restore(); c.globalAlpha = 1;
        }
        drawWorldObject(e, p, time) {
            const definition = ns.Data.WORLD_OBJECT_TYPES[e.typeId] || {}, style = definition.style || 'probe', color = definition.color || '#ce75ff', pulse = Math.sin(time * 3 + e.x) * 2, c = this.ctx;
            c.save(); c.translate(p.x, p.y); c.strokeStyle = color; c.fillStyle = '#071117'; c.lineWidth = 2;
            if (style === 'derelict') { c.rotate(.35); this.shipPath([[0,-18],[11,-7],[15,10],[3,7],[-5,16],[-14,7],[-10,-10]]); c.fill(); c.stroke(); c.strokeStyle = '#ff597f'; c.beginPath(); c.moveTo(-7,-4); c.lineTo(8,8); c.stroke(); }
            else if (style === 'probe') { c.rotate(time * .35); c.strokeRect(-7,-7,14,14); c.beginPath(); c.moveTo(-19,0); c.lineTo(19,0); c.moveTo(0,-19); c.lineTo(0,19); c.stroke(); c.fillStyle = color; c.fillRect(-3,-3,6,6); }
            else if (style === 'beacon') { c.beginPath(); c.moveTo(0,-18); c.lineTo(9,12); c.lineTo(0,7); c.lineTo(-9,12); c.closePath(); c.fill(); c.stroke(); c.globalAlpha = .35; c.beginPath(); c.arc(0,0,24+pulse,0,Math.PI*2); c.stroke(); }
            else if (style === 'pod') { c.strokeRect(-14,-9,28,18); c.fillRect(-5,-6,10,12); [-1,1].forEach(side => { c.beginPath(); c.moveTo(side*14,-6); c.lineTo(side*21,-13); c.lineTo(side*21,13); c.lineTo(side*14,6); c.stroke(); }); }
            else if (style === 'drop') { c.rotate(Math.PI/4); c.strokeRect(-12,-12,24,24); c.fillStyle = color; c.fillRect(-4,-4,8,8); c.globalAlpha = .4; c.strokeRect(-17,-17,34,34); }
            else if (style === 'prism') { c.rotate(time * .42); this.shipPath([[0,-22],[12,0],[0,22],[-12,0]]); c.fill(); c.stroke(); c.globalAlpha = .45; c.rotate(-time * .8); c.strokeRect(-18-pulse/2,-18-pulse/2,36+pulse,36+pulse); }
            c.restore();
            c.fillStyle = color; c.font = '9px "Courier New"'; c.textAlign = 'center'; c.fillText(String(e.name || definition.name || 'CONTACT').toUpperCase(), p.x, p.y + 34);
        }
        drawWorldScenario(e, p, time) {
            const definition = ns.Data.WORLD_SCENARIOS[e.typeId] || {}, color = definition.color || '#ffbd59', c = this.ctx, pulse = 22 + Math.sin(time * 5 + e.y) * 5;
            c.save(); c.translate(p.x, p.y); c.strokeStyle = color; c.fillStyle = color; c.lineWidth = 1.5; c.globalAlpha = .65;
            c.beginPath(); c.arc(0,0,pulse,0,Math.PI*2); c.stroke(); c.beginPath(); c.moveTo(-pulse-8,0); c.lineTo(-8,0); c.moveTo(8,0); c.lineTo(pulse+8,0); c.moveTo(0,-pulse-8); c.lineTo(0,-8); c.moveTo(0,8); c.lineTo(0,pulse+8); c.stroke(); c.fillRect(-3,-3,6,6); c.restore();
        }
        drawSignal(e, p, time) { const c = this.ctx; c.strokeStyle = e.kind === 'salvage' ? '#ffbd59' : '#ce75ff'; c.lineWidth = 2; c.beginPath(); c.arc(p.x, p.y, 12 + Math.sin(time * 4) * 4, 0, Math.PI * 2); c.stroke(); c.fillStyle = c.strokeStyle; c.fillRect(p.x - 2, p.y - 2, 4, 4); }
        drawContractContact(game) {
            ns.Contracts.contactsFor(game.state.contracts.active).forEach(contact => {
                const p = this.screen(contact, game.camera); if (p.x < -100 || p.x > this.w + 100 || p.y < -100 || p.y > this.h + 100) return;
                const c = this.ctx, pulse = 18 + Math.sin(game.time * 5) * 4; c.save(); c.translate(p.x, p.y); c.rotate(Math.PI / 4);
                c.strokeStyle = '#ffbd59'; c.fillStyle = '#ffbd5922'; c.lineWidth = 2; c.strokeRect(-pulse / 2, -pulse / 2, pulse, pulse); c.fillRect(-5, -5, 10, 10); c.restore();
                c.fillStyle = '#ffbd59'; c.font = '10px "Courier New"'; c.textAlign = 'center'; c.fillText(contact.name.toUpperCase(), p.x, p.y + 34);
            });
        }
        drawEnemy(e, p, time) {
            const c = this.ctx, color = e.faction === 'concord' ? '#55d7ff' : e.faction === 'corsairs' ? '#ff4f91' : '#ff8b59', r = e.radius || 14; c.save(); c.translate(p.x, p.y); c.rotate(e.angle + Math.PI / 2); c.strokeStyle = color; c.fillStyle = '#080b10'; c.lineWidth = e.bossType ? 3 : 2;
            const shapes = { dart:[[0,-18],[8,12],[0,8],[-8,12]], block:[[0,-18],[15,-8],[16,14],[0,10],[-16,14],[-15,-8]], fork:[[0,-17],[12,-11],[7,14],[0,8],[-7,14],[-12,-11]], blade:[[0,-19],[14,8],[4,14],[0,7],[-4,14],[-14,8]], shield:[[0,-18],[14,-6],[11,14],[0,10],[-11,14],[-14,-6]], hook:[[0,-19],[15,-4],[7,4],[14,15],[0,9],[-14,15],[-7,4],[-15,-4]], bomber:[[0,-19],[17,-8],[14,16],[4,11],[0,16],[-4,11],[-14,16],[-17,-8]], lancer:[[0,-25],[8,-9],[17,13],[0,8],[-17,13],[-8,-9]], layer:[[0,-15],[18,-2],[10,16],[0,9],[-10,16],[-18,-2]], tender:[[0,-16],[18,-10],[20,14],[0,18],[-20,14],[-18,-10]], jammer:[[0,-16],[10,-7],[18,0],[10,7],[0,16],[-10,7],[-18,0],[-10,-7]], carrier:[[0,-48],[29,-28],[45,-8],[39,35],[15,48],[0,35],[-15,48],[-39,35],[-45,-8],[-29,-28]], aegis:[[0,-50],[24,-35],[43,0],[33,38],[0,47],[-33,38],[-43,0],[-24,-35]], reaver:[[0,-50],[35,-25],[19,-3],[41,35],[8,28],[0,44],[-8,28],[-41,35],[-19,-3],[-35,-25]], foundry:[[0,-55],[38,-44],[62,-12],[58,48],[25,61],[0,45],[-25,61],[-58,48],[-62,-12],[-38,-44]], solar:[[0,-60],[34,-40],[55,0],[34,48],[0,62],[-34,48],[-55,0],[-34,-40]], eclipse:[[0,-58],[48,-27],[30,-5],[58,40],[15,31],[0,56],[-15,31],[-58,40],[-30,-5],[-48,-27]], cutter:[[0,-16],[13,13],[0,8],[-13,13]] };
            const key = e.bossType ? ns.Data.BOSSES[e.bossType]?.shape : ns.Data.ENEMY_TYPES[e.archetype]?.shape || 'cutter'; c.save(); c.scale(r / (e.bossType ? 60 : 15), r / (e.bossType ? 60 : 15)); this.shipPath(shapes[key] || shapes.cutter); c.fill(); c.stroke(); c.restore();
            (ns.Data.BOSSES[e.bossType]?.components || []).forEach(component => { const alive = (e.components?.[component.id] || 0) > 0; c.fillStyle = alive ? color : '#32151b'; c.globalAlpha = alive ? .85 : .35; c.beginPath(); c.arc(component.x, component.y, 7, 0, Math.PI * 2); c.fill(); }); c.globalAlpha = 1;
            if (e.telegraph > 0) { c.globalAlpha = e.telegraph / .55; c.strokeStyle = '#fff2b0'; c.beginPath(); c.arc(0, 0, r + 9, 0, Math.PI * 2); c.stroke(); }
            if (e.shielded) { c.globalAlpha = .5; c.strokeStyle = '#55d7ff'; c.beginPath(); c.arc(0, 0, r + 7, 0, Math.PI * 2); c.stroke(); } c.restore();
            const width = e.bossType ? 120 : 32, y = p.y + r + 8; c.fillStyle = '#281018'; c.fillRect(p.x - width / 2, y, width, e.bossType ? 7 : 3); c.fillStyle = color; c.fillRect(p.x - width / 2, y, width * clamp(e.hull / e.maxHull, 0, 1), e.bossType ? 7 : 3); if (e.bossType) { c.fillStyle = color; c.font = '10px "Courier New"'; c.textAlign = 'center'; c.fillText(`${ns.Data.BOSSES[e.bossType].name.toUpperCase()} // PHASE ${e.bossPhase}`, p.x, y + 20); }
        }
        drawConvoy(convoy, p, time) {
            const c = this.ctx, color = ns.Data.FACTIONS[convoy.faction]?.color || '#55d7ff'; c.save(); c.translate(p.x, p.y); c.rotate(convoy.angle + Math.PI / 2); c.strokeStyle = color; c.fillStyle = '#07161c'; c.lineWidth = 2;
            this.shipPath([[0,-20],[12,-9],[15,14],[6,19],[-6,19],[-15,14],[-12,-9]]); c.fill(); c.stroke(); c.fillStyle = color; c.globalAlpha = .55 + Math.sin(time * 6) * .2; c.fillRect(-4, -10, 8, 18); c.restore();
            c.fillStyle = '#102830'; c.fillRect(p.x - 22, p.y + 25, 44, 4); c.fillStyle = color; c.fillRect(p.x - 22, p.y + 25, 44 * clamp(convoy.hull / convoy.maxHull, 0, 1), 4); c.fillStyle = color; c.font = '9px "Courier New"'; c.textAlign = 'center'; c.fillText('CONVOY', p.x, p.y + 42);
        }
        shipPath(points) { const c = this.ctx; c.beginPath(); points.forEach(([x, y], index) => index ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); }
        drawWeapon(moduleId, side) {
            if (!moduleId) return; const c = this.ctx, mount = ns.MathUtil.weaponMount(moduleId), x = side * mount.lateral, tip = mount.forward;
            c.fillStyle = '#122c34'; c.strokeStyle = '#6db8c4'; c.lineWidth = 1.4;
            if (moduleId.includes('seeker')) { c.fillRect(x - 5, -tip, 10, tip + 5); c.strokeRect(x - 5, -tip, 10, tip + 5); c.fillStyle = '#ffbd59'; [-2, 2].forEach(dx => { c.beginPath(); c.arc(x + dx, -tip, 1.3, 0, Math.PI * 2); c.fill(); }); }
            else if (moduleId.includes('rail')) { c.fillRect(x - 2.5, -29, 5, 31); c.strokeRect(x - 2.5, -29, 5, 31); c.fillStyle = '#ce75ff'; c.fillRect(x - 1, -31, 2, 18); }
            else { const twin = moduleId.includes('mk2'); [-2, twin ? 2 : -2].filter((v, i, all) => all.indexOf(v) === i).forEach(dx => { c.fillRect(x + dx - 1.5, -tip, 3, tip + 1); c.strokeRect(x + dx - 1.5, -tip, 3, tip + 1); }); }
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
        drawUtilityEffects(game) {
            const c = this.ctx, equipped = Object.values(game.state.ship.slots), time = game.time, stats = ns.Progression.calculateShipStats(game.state);
            if (equipped.includes('repair_drones')) [-1, 1].forEach((side, index) => { const a = time * 1.8 * side + index * Math.PI, x = Math.cos(a) * 34, y = Math.sin(a) * 18; c.fillStyle = '#55f0ad'; c.fillRect(x - 2, y - 2, 4, 4); if (game.state.ship.hull < stats.hull) { c.globalAlpha = .35 + Math.sin(time * 9) * .2; c.strokeStyle = '#55f0ad'; c.beginPath(); c.moveTo(x, y); c.lineTo(0, 3); c.stroke(); c.globalAlpha = 1; } });
            if (equipped.includes('sensor_array')) { const pulse = (time * 42) % 70; c.globalAlpha = 1 - pulse / 70; c.strokeStyle = '#ce75ff'; c.beginPath(); c.arc(0, 0, 18 + pulse, 0, Math.PI * 2); c.stroke(); c.globalAlpha = .65; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(time * 1.7) * 56, Math.sin(time * 1.7) * 56); c.stroke(); c.globalAlpha = 1; }
            if (equipped.includes('heat_sink') && game.state.ship.heat > 1) { const intensity = clamp(game.state.ship.heat / 100, .15, 1); c.strokeStyle = '#55d7ff'; c.globalAlpha = .25 + intensity * .6; [-1, 1].forEach(side => { for (let i = 0; i < 3; i++) { const drift = (time * (24 + i * 4) + i * 9) % 30; c.beginPath(); c.moveTo(side * 18, 5 + i * 4); c.lineTo(side * (22 + drift), 8 + i * 4 + Math.sin(time * 5 + i) * 3); c.stroke(); } }); c.globalAlpha = 1; }
            if (equipped.includes('cargo_pods')) { c.strokeStyle = '#ffbd59'; c.globalAlpha = .35 + Math.sin(time * 4) * .15; [-1, 1].forEach(side => { c.beginPath(); c.moveTo(side * 24, 10); c.lineTo(side * 24, 30 + Math.sin(time * 3 + side) * 5); c.stroke(); c.fillStyle = '#ffbd59'; c.fillRect(side * 24 - 1.5, 8, 3, 3); }); c.globalAlpha = 1; }
        }
        drawShipModel(game, options) {
            const c = this.ctx, s = game.state.ship, config = options || {}, hull = ns.Progression.activeHull(game.state), scale = (config.scale || 1) * ns.MathUtil.shipScale(s); c.save(); c.translate(config.x, config.y); c.rotate(config.rotation ?? s.angle + Math.PI / 2); c.scale(scale, scale); c.globalAlpha = ns.Abilities.isActive(game.state, 'cloak') ? .35 : 1;
            c.shadowColor = '#55f0ad'; c.shadowBlur = 12; c.fillStyle = '#08181e'; c.strokeStyle = '#55f0ad'; c.lineWidth = 2;
            this.shipPath(hull.shape); c.fill(); c.stroke();
            c.shadowBlur = 0; c.fillStyle = '#112a32'; c.strokeStyle = '#3e7180'; this.shipPath([[0,-23],[7,-10],[8,10],[0,17],[-8,10],[-7,-10]]); c.fill(); c.stroke();
            c.fillStyle = '#55d7ff'; c.globalAlpha *= .8; this.shipPath([[0,-19],[5,-8],[0,-2],[-5,-8]]); c.fill(); c.globalAlpha = ns.Abilities.isActive(game.state, 'cloak') ? .35 : 1;
            c.fillStyle = '#ffbd59'; c.shadowColor = '#ffbd59'; c.shadowBlur = 8; c.beginPath(); c.arc(0, 7, 3.5, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
            this.drawFittedStructures(game);
            this.drawUtilityEffects(game);
            Object.entries(game.weaponCharges || {}).forEach(([slot, charge]) => { if (!charge.active) return; const module = ns.Data.MODULES[s.slots[slot]], spec = ns.Weapons.weaponData(module), pct = charge.value / spec.charge.max, side = slot === 'primary2' ? 1 : -1, mount = ns.MathUtil.weaponMount(module), stages = spec.charge.stages || 1; c.globalAlpha = .35 + pct * .65; c.strokeStyle = spec.color; c.lineWidth = 1 + pct * 3; for (let ring = 0; ring < Math.max(1, Math.ceil(pct * stages)); ring++) { c.beginPath(); c.arc(side * mount.lateral, -mount.forward, 4 + pct * 9 + ring * 4, 0, Math.PI * 2); c.stroke(); } c.beginPath(); c.moveTo(side * mount.lateral - 10, -mount.forward); c.lineTo(side * mount.lateral + 10, -mount.forward); c.stroke(); c.globalAlpha = 1; });
            Object.entries(game.weaponLocks || {}).forEach(([slot, lock]) => { const module = ns.Data.MODULES[s.slots[slot]], spec = ns.Weapons.weaponData(module); if (!spec.lock || lock.value <= 0) return; const side = slot === 'primary2' ? 1 : -1, mount = ns.MathUtil.weaponMount(module), pct = lock.value / spec.lock; c.strokeStyle = spec.color; c.globalAlpha = .4 + pct * .6; c.beginPath(); c.arc(side * mount.lateral, -mount.forward, 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct); c.stroke(); c.globalAlpha = 1; });
            const thrusting = !config.static && (game.input.down('w', 'W') || ns.Abilities.isActive(game.state, 'afterburner')), flame = config.static ? 5 : (thrusting ? 12 : 4) + Math.random() * 5; c.fillStyle = ns.Abilities.isActive(game.state, 'afterburner') ? '#ffbd59' : '#55d7ff'; [-1, 1].forEach(side => { c.beginPath(); c.moveTo(side * 8 - 3, 17); c.lineTo(side * 8, 22 + flame); c.lineTo(side * 8 + 3, 17); c.fill(); });
            if (s.shield > 0 || s.overshield > 0) { c.globalAlpha = .18 + (s.overshield > 0 ? .18 : 0); c.strokeStyle = s.overshield > 0 ? '#ce75ff' : '#55d7ff'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(0, 0, 35, 40, 0, 0, Math.PI * 2); c.stroke(); }
            c.restore();
        }
        drawShip(game) {
            const s = game.state.ship, p = this.screen(s, game.camera); this.drawShipModel(game, { x: p.x, y: p.y });
        }
        drawShipPreview(game) {
            const c = this.ctx; c.clearRect(0, 0, this.w, this.h); const glow = c.createRadialGradient(this.w / 2, this.h * .48, 20, this.w / 2, this.h * .48, Math.min(this.w, this.h) * .48); glow.addColorStop(0, '#17404b66'); glow.addColorStop(1, '#06131800'); c.fillStyle = glow; c.fillRect(0, 0, this.w, this.h);
            this.drawShipModel(game, { x: this.w / 2, y: this.h * .5, rotation: 0, scale: Math.max(3.2, Math.min(this.w / 105, this.h / 125)), static: true });
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
            game.world.nearbyEntities(game.state.ship.x, game.state.ship.y, range).forEach(e => { const definition = e.kind === 'worldObject' ? ns.Data.WORLD_OBJECT_TYPES[e.typeId] : e.kind === 'worldScenario' ? ns.Data.WORLD_SCENARIOS[e.typeId] : null; drawBlip(e, e.kind === 'station' ? ns.Data.FACTIONS[e.faction].color : e.kind === 'asteroid' ? '#56707d' : definition?.color || '#ce75ff', e.kind === 'station' ? 5 : e.kind === 'worldScenario' ? 4 : 3); });
            game.enemies.forEach(e => drawBlip(e, '#ff4f91', 4)); const convoy = game.state.contracts.active?.escort?.convoy; if (convoy?.hull > 0) drawBlip(convoy, '#55d7ff', 5); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 3, 0, Math.PI * 2); c.fill(); c.restore();
        }
        drawPhaseOverlay(game) {
            const c = this.ctx, travel = ns.LightSpeed.ensure(game), ratio = Math.min(1, travel.timer / ns.LightSpeed.CONFIG.chargeDuration);
            c.save(); c.globalCompositeOperation = 'screen'; c.strokeStyle = `rgba(150,125,255,${.18 + ratio * .5})`; c.lineWidth = 1 + ratio * 4;
            for (let i = 0; i < 28; i++) { const a = hash(6021, i, 1, 1) * Math.PI * 2, inner = 90 + ratio * 160, outer = inner + 40 + ratio * 380 * hash(6022, i, 2, 1); c.beginPath(); c.moveTo(this.w / 2 + Math.cos(a) * inner, this.h / 2 + Math.sin(a) * inner); c.lineTo(this.w / 2 + Math.cos(a) * outer, this.h / 2 + Math.sin(a) * outer); c.stroke(); }
            c.strokeStyle = `rgba(85,240,173,${.2 + ratio * .55})`; c.lineWidth = 2; c.beginPath(); c.arc(this.w / 2, this.h / 2, 45 + ratio * Math.max(this.w, this.h) * .42, 0, Math.PI * 2); c.stroke(); c.restore();
        }
        contractWaypoint(game, objective) {
            const contract = game.state.contracts.active, target = objective || (contract?.target ? { x: contract.target.x, y: contract.target.y, label: ns.Contracts.destinationName(contract) } : null); if (!target) return null;
            const zoom = game.camera.zoom || 1, cx = this.w / 2, cy = this.h / 2;
            const dx = (target.x - game.camera.x) * zoom, dy = (target.y - game.camera.y) * zoom;
            const distanceToTarget = Math.hypot(target.x - game.state.ship.x, target.y - game.state.ship.y);
            const sideInset = Math.min(52, this.w * .12), topInset = Math.min(116, this.h * .28), bottomInset = Math.min(174, this.h * .28);
            const bounds = { left: sideInset, right: this.w - sideInset, top: topInset, bottom: this.h - bottomInset };
            const projected = { x: cx + dx, y: cy + dy };
            const onScreen = !ns.LightSpeed.isShifted(game) && projected.x >= bounds.left && projected.x <= bounds.right && projected.y >= bounds.top && projected.y <= bounds.bottom;
            let x = projected.x, y = projected.y;
            if (!onScreen) {
                const scaleX = dx > 0 ? (bounds.right - cx) / Math.abs(dx || 1) : (cx - bounds.left) / Math.abs(dx || 1);
                const scaleY = dy > 0 ? (bounds.bottom - cy) / Math.abs(dy || 1) : (cy - bounds.top) / Math.abs(dy || 1);
                const scale = Math.max(0, Math.min(scaleX, scaleY)); x = cx + dx * scale; y = cy + dy * scale;
                if (x > this.w - 170 && y > this.h - 185) y = Math.max(bounds.top, this.h - 185);
            }
            return { x, y, angle: Math.atan2(dy, dx), onScreen, distance: Math.round(distanceToTarget), label: target.label || ns.Contracts.destinationName(contract), bounds };
        }
        drawContractWaypoint(game) {
            ns.Contracts.targetsFor(game.state.contracts.active).forEach((target, index) => this.drawOneContractWaypoint(game, target, index));
        }
        drawCustomWaypoint(game) {
            if (game.state.customWaypoint) this.drawOneContractWaypoint(game, { x: game.state.customWaypoint.x, y: game.state.customWaypoint.y, label: 'Custom Waypoint' }, 0, '#55d7ff');
        }
        drawOneContractWaypoint(game, target, index, color) {
            const waypoint = this.contractWaypoint(game, target); if (!waypoint) return;
            const c = this.ctx, waypointColor = color || '#ffbd59'; c.save(); c.translate(waypoint.x, waypoint.y); c.strokeStyle = waypointColor; c.fillStyle = waypointColor; c.lineWidth = 2;
            if (waypoint.onScreen && target.stage?.search && !target.stage.search.revealed) { c.globalAlpha = .25; c.setLineDash?.([8, 8]); c.beginPath(); c.arc(0, 0, target.stage.search.radius * (game.camera.zoom || 1), 0, Math.PI * 2); c.stroke(); c.setLineDash?.([]); c.globalAlpha = 1; }
            if (waypoint.onScreen) {
                c.beginPath(); c.arc(0, 0, 18, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.moveTo(-26, 0); c.lineTo(-12, 0); c.moveTo(12, 0); c.lineTo(26, 0); c.moveTo(0, -26); c.lineTo(0, -12); c.moveTo(0, 12); c.lineTo(0, 26); c.stroke();
            } else {
                c.rotate(waypoint.angle); c.beginPath(); c.moveTo(12, 0); c.lineTo(-8, -7); c.lineTo(-4, 0); c.lineTo(-8, 7); c.closePath(); c.fill();
            }
            c.restore(); c.fillStyle = waypointColor; c.font = '10px "Courier New"'; c.textAlign = waypoint.x > this.w / 2 ? 'right' : 'left';
            const textX = waypoint.x + (waypoint.x > this.w / 2 ? -18 : 18), textY = (waypoint.onScreen ? waypoint.y + 39 : waypoint.y - 10) + index * 14;
            c.fillText(`${waypoint.label.toUpperCase()} // ${ns.MathUtil.formatDistance(waypoint.distance)}`, textX, textY);
        }
        drawInteractionCast(game) {
            const cast = game.interactionCast; if (!cast) return;
            const c = this.ctx, zoom = game.camera.zoom || 1, x = this.w / 2 + (game.state.ship.x - game.camera.x) * zoom, y = this.h / 2 + (game.state.ship.y - game.camera.y) * zoom + 48;
            const width = Math.min(220, this.w * .36), ratio = Math.max(0, Math.min(1, cast.progress / cast.duration)), remaining = Math.max(0, cast.duration - cast.progress);
            c.save(); c.textAlign = 'center'; c.font = '9px "Courier New"'; c.fillStyle = '#d7e9ed'; c.fillText(`LINK // ${String(cast.name).toUpperCase()} // ${remaining.toFixed(1)}S`, x, y);
            c.fillStyle = '#142a31dd'; c.fillRect(x - width / 2, y + 7, width, 5); c.fillStyle = '#ffbd59'; c.fillRect(x - width / 2, y + 7, width * ratio, 5); c.strokeStyle = '#8d7441'; c.strokeRect(x - width / 2, y + 7, width, 5); c.restore();
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
            c.fillStyle = '#cfe9ff'; c.font = '11px "Courier New"'; c.textAlign = 'center'; c.fillText(`VECTOR ${Math.round(game.state.ship.x)}, ${Math.round(game.state.ship.y)} KM // ${game.region.name.toUpperCase()}`, cx, this.h - 42);
            c.restore();
        }
        render(game) {
            const shake = game.state?.settings?.screenShake ? game.impactShake || 0 : 0; this.shakeX = shake ? (Math.random() * 2 - 1) * shake : 0; this.shakeY = shake ? (Math.random() * 2 - 1) * shake : 0;
            if (ns.LightSpeed.isShifted(game)) { this.drawLightSpeed(game); this.drawContractWaypoint(game); this.drawCustomWaypoint(game); return; }
            this.clear(game.region, game.camera); const c = this.ctx, zoom = game.camera.zoom || 1;
            c.save(); c.translate(this.w / 2, this.h / 2); c.scale(zoom, zoom); c.translate(-this.w / 2, -this.h / 2); this.drawWorld(game); this.drawNebula(game); this.drawContractContact(game); this.drawShip(game); c.restore();
            if (ns.LightSpeed.ensure(game).phase === 'charging') this.drawPhaseOverlay(game);
            this.drawInteractionCast(game); this.drawRadar(game); this.drawContractWaypoint(game); this.drawCustomWaypoint(game);
        }
    }
    ns.Renderer = Renderer;
})(window.MiniInvadersV2);
