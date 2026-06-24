(function (ns) {
    const { clamp, distance, hash } = ns.MathUtil;
    class Renderer {
        constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.w = 0; this.h = 0; this.dpr = 1; this.resize(); }
        resize() {
            const box = this.canvas.getBoundingClientRect(); this.dpr = Math.min(2, window.devicePixelRatio || 1); this.w = Math.max(320, box.width); this.h = Math.max(240, box.height);
            this.canvas.width = Math.round(this.w * this.dpr); this.canvas.height = Math.round(this.h * this.dpr); this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        }
        clear(region, camera, galaxy) {
            const c = this.ctx; c.fillStyle = '#02070b'; c.fillRect(0, 0, this.w, this.h);
            for (let i = 0; i < 150; i++) {
                const layer = 1 + (i % 3); const sx = ((hash(91, i, layer, 1) * 4000 - camera.x / (12 * layer)) % this.w + this.w) % this.w;
                const sy = ((hash(33, i, layer, 2) * 2400 - camera.y / (12 * layer)) % this.h + this.h) % this.h;
                c.globalAlpha = .22 + layer * .14; c.fillStyle = i % 17 === 0 ? region.color : '#d7efff'; c.fillRect(sx, sy, layer === 1 ? 1 : 1.5, layer === 1 ? 1 : 1.5);
            }
            c.globalAlpha = 1;
            const glow = c.createRadialGradient(this.w * .5, this.h * .5, 50, this.w * .5, this.h * .5, Math.max(this.w, this.h) * .7);
            glow.addColorStop(0, `${region.color}0b`); glow.addColorStop(1, '#00000000'); c.fillStyle = glow; c.fillRect(0, 0, this.w, this.h);
            this.drawGalaxyBackdrop(galaxy, camera);
        }
        drawGalaxyBackdrop(galaxy, camera) {
            if (!galaxy || galaxy.backdrop === 'frontier') return; const c = this.ctx, driftX = -camera.x / 180, driftY = -camera.y / 180;
            c.save(); c.globalCompositeOperation = 'screen';
            if (galaxy.backdrop === 'giant-star') { const x=this.w*.18+driftX%90,y=this.h*.25+driftY%70,r=Math.max(this.w,this.h)*.28,g=c.createRadialGradient(x,y,8,x,y,r); g.addColorStop(0,'#ffe6a044'); g.addColorStop(.35,'#b96b1824'); g.addColorStop(1,'#0000'); c.fillStyle=g;c.fillRect(0,0,this.w,this.h); c.fillStyle='#160d08';c.beginPath();c.arc(x,y,r*.34,0,Math.PI*2);c.fill(); }
            else if (galaxy.backdrop === 'elliptical') {
                const cx=this.w*.52+driftX%80,cy=this.h*.48+driftY%50;
                [[.22,.3,.44,'#79deff18'],[.4,.58,.36,'#4eb8ff16'],[.68,.42,.3,'#b1f0ff14'],[.84,.62,.24,'#5faeff12']].forEach(([px,py,size,color])=>{const x=this.w*px+driftX%42,y=this.h*py+driftY%30,r=Math.max(this.w,this.h)*size,g=c.createRadialGradient(x,y,r*.03,x,y,r);g.addColorStop(0,`${color.slice(0,7)}28`);g.addColorStop(.24,`${color.slice(0,7)}14`);g.addColorStop(.58,`${color.slice(0,7)}08`);g.addColorStop(1,'#0000');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);});
                for(let i=0;i<90;i++){ const a=hash(821,i,2,1)*Math.PI*2,rad=hash(822,i,3,1)*this.w*.43,px=cx+Math.cos(a)*rad,py=cy+Math.sin(a)*rad*.34,size=1.1+hash(823,i,4,1)*2.3;c.fillStyle=i%7===0?'#b8f4ff66':i%3===0?'#72daff36':'#67cfff22';c.beginPath();c.arc(px,py,size,0,Math.PI*2);c.fill(); }
                [[.14,.24,.34,'#58c2ff18'],[.34,.7,.42,'#2f83ff16'],[.66,.36,.39,'#8be6ff14'],[.82,.62,.31,'#54b4ff16']].forEach(([px,py,size,color])=>{const x=this.w*px+driftX%48,y=this.h*py+driftY%34,r=Math.max(this.w,this.h)*size,g=c.createRadialGradient(x,y,r*.02,x,y,r);g.addColorStop(0,`${color.slice(0,7)}2e`);g.addColorStop(.18,`${color.slice(0,7)}1c`);g.addColorStop(.55,`${color.slice(0,7)}08`);g.addColorStop(1,'#0000');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);});
            }
            else if (galaxy.backdrop === 'nebula-cloud') {
                [[.08,.3,.42,'#4f46a8','26'],[.28,.6,.52,'#7e46d8','2d'],[.5,.26,.36,'#3477d6','22'],[.7,.62,.5,'#6e49c6','24'],[.9,.2,.4,'#40a0df','20'],[.44,.48,.28,'#97a0ff','16']].forEach(([px,py,size,color,brightness],index)=>{const x=this.w*px+driftX%55,y=this.h*py+driftY%40,r=Math.max(this.w,this.h)*size,g=c.createRadialGradient(x,y,r*.02,x,y,r);g.addColorStop(0,`${color}${brightness}`);g.addColorStop(.16,index%2?`${color}20`:`${color}1a`);g.addColorStop(.42,`${color}12`);g.addColorStop(.72,`${color}08`);g.addColorStop(1,'#0000');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);});
                for(let i=0;i<18;i++){const x=this.w*(.05+hash(604,i,1,1)*.9)+driftX%42,y=this.h*(.08+hash(605,i,2,1)*.8)+driftY%34,w=Math.max(this.w,this.h)*(.11+hash(606,i,3,1)*.12),h=w*(.24+hash(607,i,4,1)*.22),rot=hash(608,i,5,1)*Math.PI*2;c.save();c.translate(x,y);c.rotate(rot);c.scale(1,h/w);const swirl=c.createRadialGradient(0,0,w*.06,0,0,w);swirl.addColorStop(0,i%2===0?'#d4bcff1c':'#6cadff18');swirl.addColorStop(.22,i%3===0?'#73a8ff16':'#b38cff16');swirl.addColorStop(.5,i%2===0?'#c49dff0e':'#77b7ff0d');swirl.addColorStop(1,'#0000');c.fillStyle=swirl;c.fillRect(-w,-w,w*2,w*2);c.restore();}
                for(let i=0;i<12;i++){const x=this.w*(.12+hash(714,i,1,1)*.76)+driftX%36,y=this.h*(.14+hash(715,i,2,1)*.68)+driftY%30,r=Math.max(this.w,this.h)*(.08+hash(716,i,3,1)*.06),g=c.createRadialGradient(x,y,r*.04,x,y,r);g.addColorStop(0,i%2===0?'#f1dbff16':'#a7d6ff14');g.addColorStop(.35,i%2===0?'#b48aff10':'#69a9ff0d');g.addColorStop(1,'#0000');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
            }
            else if (galaxy.backdrop === 'ring') { const x=this.w*.5+driftX%45,y=this.h*.52+driftY%30;c.strokeStyle='#ffbd5914';c.lineWidth=54;c.beginPath();c.ellipse(x,y,this.w*.58,this.h*.39,.14,0,Math.PI*2);c.stroke();c.strokeStyle='#fff0ad16';c.lineWidth=2;c.beginPath();c.ellipse(x,y,this.w*.64,this.h*.44,.14,0,Math.PI*2);c.stroke(); }
            else if (galaxy.backdrop === 'corner-black-hole') {
                const x=this.w*.06+driftX%38,y=this.h*.88+driftY%28,r=Math.max(72,Math.min(this.w,this.h)*.15),tilt=-.24,g=c.createRadialGradient(x,y,r*.7,x,y,r*2.7);
                const drawDiscHalf=(start,end)=>{c.strokeStyle='#9de9ff2d';c.lineWidth=Math.max(14,r*.23);c.beginPath();c.ellipse(x,y,r*2.65,r*.58,tilt,start,end);c.stroke();c.strokeStyle='#d9fbff28';c.lineWidth=2;c.beginPath();c.ellipse(x,y,r*3.15,r*.72,tilt,start,end);c.stroke();};
                g.addColorStop(0,'#00000000');g.addColorStop(.42,'#62cce212');g.addColorStop(1,'#0000');c.fillStyle=g;c.fillRect(x-r*3,y-r*3,r*6,r*6);
                drawDiscHalf(Math.PI,Math.PI*2);
                c.globalCompositeOperation='source-over';c.fillStyle='#000000';c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();
                c.globalCompositeOperation='screen';drawDiscHalf(0,Math.PI);
            }
            else if (galaxy.backdrop === 'twin') { [[.3,.36,'#b78cff'],[.72,.58,'#55d7ff']].forEach(([px,py,color])=>{const x=this.w*px+driftX%60,y=this.h*py+driftY%50,g=c.createRadialGradient(x,y,5,x,y,130);g.addColorStop(0,`${color}88`);g.addColorStop(.2,`${color}33`);g.addColorStop(1,'#0000');c.fillStyle=g;c.fillRect(x-140,y-140,280,280);}); }
            c.restore();
        }
        screen(entity, camera) { return { x: this.w / 2 + entity.x - camera.x + (this.shakeX || 0), y: this.h / 2 + entity.y - camera.y + (this.shakeY || 0) }; }
        stationVisualRadius(e) { return e?.major ? Math.max(255, (e.radius || 105) * 2.475) : e?.radius || 95; }
        stationArchetype(e) {
            const types = ['multi_ring', 'triple_ring', 'spindle_gate', 'crown_array', 'braided_halo'];
            return types[Math.floor(hash(e.x, e.y, e.name.length, 31) * types.length)] || types[0];
        }
        stationIssuerColors(e, state) {
            let issuers = [e.faction];
            try {
                if (e.major && state && ns.Contracts?.stationIssuers) issuers = ns.Contracts.stationIssuers(state, e);
            } catch (err) { issuers = [e.faction]; }
            return issuers.slice(0, 3).map(id => ns.Data.FACTIONS[id]?.color || ns.Data.FACTIONS[e.faction]?.color || '#55d7ff');
        }
        stationEllipse(cx, cy, rx, ry, rotation) {
            const c = this.ctx;
            c.beginPath();
            if (c.ellipse) c.ellipse(cx, cy, rx, ry, rotation || 0, 0, Math.PI * 2);
            else c.arc(cx, cy, Math.max(rx, ry), 0, Math.PI * 2);
        }
        drawThickBeam(x1, y1, x2, y2, color, width) {
            const c = this.ctx, beam = width || 8;
            c.strokeStyle = '#102e38'; c.lineWidth = beam; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
            c.strokeStyle = color; c.lineWidth = Math.max(2, beam * .34); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
        }
        drawAttachedBay(x, y, w, h, attachX, attachY, color) {
            const c = this.ctx;
            this.drawThickBeam(attachX, attachY, x + w / 2, y + h / 2, color, 8);
            c.fillStyle = '#0b2028'; c.strokeStyle = color; c.lineWidth = 2; c.fillRect(x, y, w, h); c.strokeRect(x, y, w, h);
        }
        drawStationFrame(radius, color) {
            const c = this.ctx;
            c.strokeStyle = '#102e38'; c.lineWidth = 17; this.stationEllipse(0, 0, radius * .43, radius * .18, 0); c.stroke();
            this.drawThickBeam(-radius * .45, 0, radius * .45, 0, color, 11);
            this.drawThickBeam(0, -radius * .2, 0, radius * .2, color, 11);
            c.strokeStyle = color; c.lineWidth = 4; this.stationEllipse(0, 0, radius * .43, radius * .18, 0); c.stroke();
        }
        drawWorld(game) {
            const c = this.ctx, camera = game.camera;
            game.world.loadedEntities().forEach(entity => {
                const p = this.screen(entity, camera), margin = entity.kind === 'station' ? this.stationVisualRadius(entity) + 90 : 150; if (p.x < -margin || p.x > this.w + margin || p.y < -margin || p.y > this.h + margin) return;
                if (entity.kind === 'asteroid') this.drawAsteroid(entity, p);
                else if (entity.kind === 'station') this.drawStation(entity, p, game.time, game.state);
                else if (entity.kind === 'anomaly') this.drawAnomaly(entity, p, game.time);
                else if (entity.kind === 'worldObject') this.drawWorldObject(entity, p, game.time);
                else if (entity.kind === 'worldScenario' && !ns.WorldEvents.isHiddenScenario(entity)) this.drawWorldScenario(entity, p, game.time);
                else this.drawSignal(entity, p, game.time);
            });
            game.enemies.forEach(e => this.drawEnemy(e, this.screen(e, camera), game.time));
            const convoy = game.state.contracts.active?.escort?.convoy; if (convoy?.hull > 0) this.drawConvoy(convoy, this.screen(convoy, camera), game.time);
            game.bullets.forEach(b => { const p = this.screen(b, camera); c.strokeStyle = b.color || (b.enemy ? '#ff597f' : '#55f0ad'); c.lineWidth = b.type === 'beam' ? 5 : b.enemy ? 2 : 3; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - b.vx * (b.type === 'beam' ? .06 : .025), p.y - b.vy * (b.type === 'beam' ? .06 : .025)); c.stroke(); if (b.type === 'missile') { c.fillStyle = b.color || '#ffbd59'; c.fillRect(p.x - 2, p.y - 2, 4, 4); const speed = Math.max(1, Math.hypot(b.vx, b.vy)); c.globalAlpha = .55; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - b.vx / speed * 14, p.y - b.vy / speed * 14); c.stroke(); c.globalAlpha = 1; } else if (b.type === 'mine') { c.globalAlpha = .45 + Math.sin(game.time * 7) * .2; c.beginPath(); c.arc(p.x, p.y, b.radius + 4, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1; } });
            game.effects.forEach(effect => { const p = this.screen(effect, camera); c.globalAlpha = clamp(effect.life / effect.maxLife, 0, 1); if (effect.fragment) { c.save();c.translate(p.x,p.y);c.rotate(effect.rotation||0);c.scale(effect.fragmentScale||1,effect.fragmentScale||1);c.fillStyle='#080b10';c.strokeStyle=effect.color||'#b8d5dc';c.lineWidth=1.5;this.shipPath(effect.fragment);c.fill();c.stroke();c.restore(); } else if (effect.flash) { c.strokeStyle = effect.color || '#f2f7ff'; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y, effect.size * (1 - effect.life / effect.maxLife * .65), 0, Math.PI * 2); c.stroke(); } else { c.fillStyle = effect.color || '#b8d5dc'; c.fillRect(p.x, p.y, effect.size, effect.size); } }); c.globalAlpha = 1;
            this.drawBlinkEffect(game);
        }
        drawBlinkEffect(game) { const effect=game.blinkEffect;if(!effect)return;const c=this.ctx,a=this.screen(effect.from,game.camera),b=this.screen(effect.to,game.camera),ratio=clamp(effect.life/effect.maxLife,0,1);c.save();c.globalCompositeOperation='screen';c.globalAlpha=ratio;c.strokeStyle='#ce75ff';c.lineWidth=2+ratio*7;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();[a,b].forEach((p,index)=>{c.lineWidth=2;c.beginPath();c.arc(p.x,p.y,12+(1-ratio)*(index?48:34),0,Math.PI*2);c.stroke();});c.globalAlpha=ratio*.45;c.fillStyle='#e9cfff';c.beginPath();c.arc(b.x,b.y,8+ratio*10,0,Math.PI*2);c.fill();c.restore(); }
        drawAsteroid(e, p) {
            const c = this.ctx; c.save(); c.translate(p.x, p.y); c.rotate(e.rotation || 0); c.fillStyle = e.tier === 'large' ? '#101b22' : e.tier === 'medium' ? '#132029' : '#172630'; c.strokeStyle = '#476474'; c.lineWidth = e.tier === 'small' ? 1.4 : 2; c.beginPath();
            for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, r = e.radius * (.76 + hash(e.shapeSeed || 7, i, 4, 2) * .28); const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? c.lineTo(x, y) : c.moveTo(x, y); }
            c.closePath(); c.fill(); c.stroke();
            c.globalAlpha = .34; c.strokeStyle = '#78909a'; c.beginPath(); c.arc(-e.radius * .18, -e.radius * .12, e.radius * .22, .2, Math.PI * 1.5); c.stroke();
            if (e.hull < e.maxHull) { c.globalAlpha = .7; c.strokeStyle = '#ffbd59'; c.beginPath(); c.moveTo(-e.radius * .08, -e.radius * .65); c.lineTo(e.radius * .08, -.15 * e.radius); c.lineTo(-e.radius * .28, e.radius * .25); c.stroke(); }
            c.restore();
        }
        drawStation(e, p, time, state) {
            const c = this.ctx, color = ns.Data.FACTIONS[e.faction].color, radius = this.stationVisualRadius(e), phase = hash(e.x, e.y, e.name.length, 7) * Math.PI * 2, t = (time || 0) + phase;
            const arms = e.faction === 'concord' ? 4 : e.faction === 'corsairs' ? 3 : 6, core = e.major ? 48 : 29, issuerColors = this.stationIssuerColors(e, state);
            c.save(); c.translate(p.x, p.y); c.fillStyle = '#061117'; c.strokeStyle = color; c.lineWidth = 2;
            if (e.major) {
                const archetype = this.stationArchetype(e), spin = t * (e.faction === 'corsairs' ? -.045 : .038);
                c.globalAlpha = .18; c.beginPath(); c.arc(0, 0, radius + 24 + Math.sin(t * 1.4) * 6, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1;
                c.save(); c.rotate(spin);
                this.drawStationFrame(radius, color);
                if (archetype === 'multi_ring') {
                    c.lineWidth = 3.5; c.strokeStyle = color; this.stationEllipse(0, 0, radius * .92, radius * .34, 0); c.stroke();
                    c.strokeStyle = '#55d7ff'; this.stationEllipse(0, 0, radius * .72, radius * .26, 0); c.stroke();
                    c.strokeStyle = '#ffbd59'; this.stationEllipse(0, 0, radius * .5, radius * .18, 0); c.stroke();
                    c.strokeStyle = '#8faab3'; c.lineWidth = 3;
                    [-1, 1].forEach(side => this.drawThickBeam(-radius * .86, side * radius * .09, radius * .86, side * radius * .09, '#8faab3', 7));
                    [-.5, 0, .5].forEach(offset => this.drawThickBeam(radius * offset, -radius * .29, radius * offset, radius * .29, '#8faab3', 7));
                    for (let i = 0; i < 10; i++) {
                        c.save(); c.rotate(i / 10 * Math.PI * 2); this.drawAttachedBay(radius * .7, -8, radius * .14, 16, core * .72, 0, i % 2 ? '#8faab3' : color); c.restore();
                    }
                    [-1, 1].forEach(side => { this.drawThickBeam(side * radius * .82, 0, side * radius * 1.04, 0, color, 10); this.drawAttachedBay(side * radius * .82 - (side < 0 ? radius * .12 : 0), -12, radius * .12, 24, side * radius * .62, 0, color); });
                } else if (archetype === 'triple_ring') {
                    const hubs = [[0, -radius * .34], [-radius * .46, radius * .28], [radius * .46, radius * .28]];
                    c.strokeStyle = '#8faab3'; c.lineWidth = 11; c.beginPath(); c.moveTo(hubs[0][0], hubs[0][1]); c.lineTo(hubs[1][0], hubs[1][1]); c.lineTo(hubs[2][0], hubs[2][1]); c.closePath(); c.stroke();
                    c.strokeStyle = color; c.lineWidth = 4; c.beginPath(); c.moveTo(hubs[0][0], hubs[0][1]); c.lineTo(hubs[1][0], hubs[1][1]); c.lineTo(hubs[2][0], hubs[2][1]); c.closePath(); c.stroke();
                    hubs.forEach(([x, y], index) => {
                        c.strokeStyle = issuerColors[index] || color; c.lineWidth = 3.5; this.stationEllipse(x, y, radius * .24, radius * .18, index * .45); c.stroke();
                        this.drawAttachedBay(x - radius * .09, y - radius * .05, radius * .18, radius * .1, 0, 0, issuerColors[index] || color);
                    });
                    c.strokeStyle = '#55d7ff'; c.lineWidth = 3; this.stationEllipse(0, 0, radius * .52, radius * .25, .12); c.stroke();
                } else if (archetype === 'spindle_gate') {
                    this.drawThickBeam(0, -radius * 1.05, 0, radius * 1.05, color, 13);
                    this.drawThickBeam(-radius * .24, -radius * .7, radius * .24, radius * .7, '#8faab3', 7);
                    this.drawThickBeam(radius * .24, -radius * .7, -radius * .24, radius * .7, '#8faab3', 7);
                    [-.54, .54].forEach(offset => {
                        c.strokeStyle = offset < 0 ? '#55d7ff' : '#ffbd59'; c.lineWidth = 3.5; this.stationEllipse(0, radius * offset, radius * .52, radius * .2, Math.PI / 2); c.stroke();
                        this.drawAttachedBay(-radius * .16, radius * offset - 13, radius * .32, 26, 0, radius * offset, offset < 0 ? '#55d7ff' : '#ffbd59');
                        [-1, 1].forEach(side => this.drawThickBeam(side * radius * .2, radius * offset, side * radius * .48, radius * offset, offset < 0 ? '#55d7ff' : '#ffbd59', 7));
                    });
                    for (let i = 0; i < 6; i++) { c.save(); c.rotate(i / 6 * Math.PI * 2); this.drawAttachedBay(radius * .72, -7, 18, 14, core, 0, i % 2 ? '#8faab3' : color); c.restore(); }
                } else if (archetype === 'crown_array') {
                    c.strokeStyle = color; c.lineWidth = 4; this.stationEllipse(0, radius * .12, radius * .88, radius * .28, 0); c.stroke();
                    c.strokeStyle = '#55d7ff'; this.stationEllipse(0, 0, radius * .58, radius * .82, Math.PI / 2); c.stroke();
                    this.drawThickBeam(-radius * .62, -radius * .12, radius * .62, -radius * .12, '#8faab3', 11);
                    for (let i = -2; i <= 2; i++) { const x = i * radius * .2, h = radius * (.48 + (2 - Math.abs(i)) * .13), towerColor = i % 2 ? '#ffbd59' : color; this.drawThickBeam(x, -radius * .12, x, -h, towerColor, 8); this.drawThickBeam(x - radius * .08, -radius * .12, x, -h * .72, towerColor, 6); this.drawThickBeam(x + radius * .08, -radius * .12, x, -h * .72, towerColor, 6); this.drawAttachedBay(x - 11, -h - 12, 22, 24, x, -h, towerColor); }
                    [-1, 1].forEach(side => { this.drawThickBeam(side * radius * .7, -radius * .04, side * radius * .88, radius * .12, color, 8); this.drawThickBeam(side * radius * .88, radius * .12, side * radius * .7, radius * .28, color, 8); });
                } else {
                    c.strokeStyle = color; c.lineWidth = 3.5; this.stationEllipse(0, 0, radius * .92, radius * .3, -.18); c.stroke();
                    c.strokeStyle = '#55d7ff'; this.stationEllipse(0, 0, radius * .7, radius * .22, .22); c.stroke();
                    c.strokeStyle = '#8faab3'; c.lineWidth = 3;
                    [-1, 1].forEach(side => this.drawThickBeam(-radius * .78, side * radius * .07, radius * .78, -side * radius * .07, '#8faab3', 7));
                    this.drawThickBeam(-radius * .62, 0, radius * .62, 0, '#ffbd59', 8);
                    for (let i = 0; i < 6; i++) {
                        const x = (i - 2.5) * radius * .21, y = (i % 2 ? 1 : -1) * radius * .11;
                        this.drawAttachedBay(x - 10, y - 8, 20, 16, x * .72, 0, i % 3 === 0 ? color : i % 3 === 1 ? '#55d7ff' : '#ffbd59');
                    }
                    [-1, 1].forEach(side => { this.drawThickBeam(side * radius * .72, -radius * .12, side * radius * .88, 0, color, 8); this.drawThickBeam(side * radius * .88, 0, side * radius * .72, radius * .12, color, 8); });
                }
                c.restore();
                c.save(); c.rotate(-spin * 1.4);
                for (let i = 0; i < 12; i++) {
                    c.save(); c.rotate(i / 12 * Math.PI * 2);
                    this.drawAttachedBay(radius * .84, -7, 22, 14, radius * .34, 0, issuerColors[i % issuerColors.length] || color); c.restore();
                }
                c.restore();
            } else {
                c.globalAlpha = .22; c.beginPath(); c.arc(0, 0, radius + 10 + Math.sin(t * 1.7) * 4, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1;
                c.save(); c.rotate(t * (e.faction === 'corsairs' ? -.08 : .055));
                for (let i = 0; i < arms; i++) {
                    c.save(); c.rotate(i / arms * Math.PI * 2); c.fillStyle = '#0b2028'; c.strokeStyle = color; c.fillRect(core - 3, -7, radius - core + 2, 14); c.strokeRect(core - 3, -7, radius - core + 2, 14);
                    c.fillStyle = '#102e38'; c.fillRect(radius - 18, -13, 20, 26); c.strokeRect(radius - 18, -13, 20, 26);
                    c.fillStyle = i % 2 ? '#ffbd59' : color; c.globalAlpha = .55 + Math.sin(t * 4 + i) * .25; c.fillRect(radius - 5, -2, 5, 4); c.restore();
                }
                c.restore(); c.globalAlpha = 1;
                c.save(); c.rotate(t * -.11); c.setLineDash?.([10, 7]); c.lineWidth = 2; c.beginPath(); c.arc(0, 0, radius * .72, 0, Math.PI * 2); c.stroke(); c.setLineDash?.([]); c.restore();
            }
            c.globalAlpha = 1;
            if (e.major) issuerColors.forEach((issuerColor, index) => { const a = t * .16 + index / Math.max(1, issuerColors.length) * Math.PI * 2, nodeRadius = radius * (.78 + index * .06); c.fillStyle = issuerColor; c.strokeStyle = '#d7f5ff'; c.beginPath(); c.arc(Math.cos(a) * nodeRadius, Math.sin(a) * nodeRadius, 7, 0, Math.PI * 2); c.fill(); c.stroke(); });
            c.fillStyle = '#07151c'; c.lineWidth = 3; c.beginPath();
            if (e.faction === 'concord') { for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4, x = Math.cos(a) * core, y = Math.sin(a) * core; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.closePath(); }
            else if (e.faction === 'corsairs') { for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r = i % 2 ? core * .72 : core; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.closePath(); }
            else c.arc(0, 0, core, 0, Math.PI * 2);
            c.fill(); c.stroke();
            c.globalAlpha = .35; c.fillStyle = color; c.beginPath(); c.arc(0, 0, 15 + Math.sin(t * 2.5) * 3, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; c.strokeStyle = '#d7f5ff'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, 8, 0, Math.PI * 2); c.stroke();
            c.strokeStyle = color; c.globalAlpha = .6; c.beginPath(); c.moveTo(-radius - 18, 0); c.lineTo(-radius + 3, 0); c.moveTo(radius - 3, 0); c.lineTo(radius + 18, 0); c.stroke(); c.globalAlpha = 1;
            c.fillStyle = color; c.font = '11px "Courier New"'; c.textAlign = 'center'; c.fillText(e.name.toUpperCase(), 0, radius + 24); c.font = '8px "Courier New"'; c.fillText(`${e.major ? 'MAJOR ' : ''}${ns.Data.FACTIONS[e.faction].short} FACILITY`, 0, radius + 37);
            if (e.major) { c.fillStyle = '#9fc8d2'; c.font = '7px "Courier New"'; c.fillText(`${this.stationArchetype(e).replace('_', ' ').toUpperCase()} // ${issuerColors.length} DOCK NETWORK`, 0, radius + 49); }
            c.restore();
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
            else if (style === 'mineral') { c.rotate(time * .7 + e.x); this.shipPath([[0,-13],[9,-4],[7,9],[-2,12],[-10,3],[-6,-8]]); c.fillStyle='#0d302d';c.fill();c.stroke(); }
            else if (style === 'salvage-crate') { c.rotate(.18);c.fillStyle='#241b0d';c.fillRect(-17,-12,34,24);c.strokeRect(-17,-12,34,24);c.beginPath();c.moveTo(-17,0);c.lineTo(17,0);c.moveTo(0,-12);c.lineTo(0,12);c.stroke();c.fillStyle=color;c.fillRect(-3,-3,6,6); }
            else if (style === 'module-cache') { c.rotate(time * .12); c.fillStyle='#071f28'; c.fillRect(-16,-13,32,26); c.strokeRect(-16,-13,32,26); c.beginPath(); c.moveTo(-10,-13); c.lineTo(-3,-21); c.lineTo(4,-13); c.moveTo(10,13); c.lineTo(3,21); c.lineTo(-4,13); c.stroke(); c.fillStyle=color; c.globalAlpha=.7; c.fillRect(-5,-5,10,10); c.globalAlpha=.35; c.beginPath(); c.arc(0,0,25+pulse,0,Math.PI*2); c.stroke(); }
            else if (style === 'armory-fragment') { c.rotate(time * .2 + e.x); c.shadowColor=color; c.shadowBlur=14; this.shipPath([[0,-24],[10,-10],[23,-7],[11,4],[17,22],[0,12],[-17,22],[-11,4],[-23,-7],[-10,-10]]); c.fillStyle='#0b1420'; c.fill(); c.stroke(); c.shadowBlur=0; c.beginPath(); c.moveTo(-13,2); c.lineTo(0,-15); c.lineTo(13,2); c.lineTo(0,14); c.closePath(); c.stroke(); }
            else if (style === 'ancient-relic') { c.rotate(e.rotation || time * .08); c.shadowColor=color;c.shadowBlur=16;this.shipPath([[0,-30],[9,-15],[27,-19],[19,-4],[32,8],[12,13],[5,28],[-6,17],[-25,23],[-19,5],[-30,-8],[-10,-12]]);c.fillStyle='#100d1d';c.fill();c.stroke();c.shadowBlur=0;c.strokeStyle='#e0caff';c.beginPath();c.moveTo(-18,5);c.lineTo(8,-17);c.lineTo(20,8);c.lineTo(-5,16);c.closePath();c.stroke();c.fillStyle=color;c.globalAlpha=.55+Math.sin(time*3)*.2;c.fillRect(-4,-5,8,10);c.globalAlpha=1; }
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
            const c = this.ctx, color = ns.Data.FACTIONS[e.faction]?.color || '#ff8b59', r = e.radius || 14; c.save(); c.translate(p.x, p.y); c.rotate(e.angle + Math.PI / 2); c.strokeStyle = color; c.fillStyle = '#080b10'; c.lineWidth = e.bossType ? 3 : 2;
            const shapes = ns.Geometry.SHAPES;
            const key = e.bossType ? ns.Data.BOSSES[e.bossType]?.shape : ns.Data.ENEMY_TYPES[e.archetype]?.shape || 'cutter'; c.save(); c.scale(r / (e.bossType ? 60 : 15), r / (e.bossType ? 60 : 15)); this.shipPath(shapes[key] || shapes.cutter); c.fill(); c.stroke(); c.restore();
            const componentScale = ns.Geometry.scale(e); (ns.Data.BOSSES[e.bossType]?.components || []).forEach(component => { const alive = (e.components?.[component.id] || 0) > 0; c.fillStyle = alive ? color : '#32151b'; c.globalAlpha = alive ? .85 : .35; c.beginPath(); c.arc(component.x * componentScale, component.y * componentScale, 7 * componentScale, 0, Math.PI * 2); c.fill(); }); c.globalAlpha = 1;
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
            if (ns.Abilities.isActive(game.state, 'deepFreeze')) { c.strokeStyle='#bff8ff';c.fillStyle='#78ddff';c.globalAlpha=.45+Math.sin(time*10)*.15;c.lineWidth=2;c.beginPath();c.arc(0,0,32+Math.sin(time*7)*3,0,Math.PI*2);c.stroke();[-1,1].forEach(side=>{for(let i=0;i<3;i++){const drift=(time*28+i*11)%34;c.beginPath();c.moveTo(side*12,8+i*3);c.lineTo(side*(18+drift),12+i*3);c.stroke();}});c.globalAlpha=1; }
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
        drawPlayerDeathCinematic(game) {
            const death = game.deathCinematic; if (!death) return false;
            const c = this.ctx, snapshot = death.snapshot, p = this.screen(snapshot, game.camera), t = clamp(death.elapsed / death.duration, 0, 1), pulse = Math.sin(t * Math.PI);
            c.save(); c.globalCompositeOperation = 'screen'; c.globalAlpha = Math.max(0, .18 - t * .16); c.fillStyle = '#ffbd59'; c.fillRect(0, 0, this.w, this.h); c.globalAlpha = 1;
            c.strokeStyle = '#ffbd59'; c.lineWidth = 1.5 + pulse * 3; c.beginPath(); c.arc(p.x, p.y, 20 + t * 150, 0, Math.PI * 2); c.stroke();
            c.strokeStyle = '#55d7ff'; c.lineWidth = 1 + pulse * 1.5; c.beginPath(); c.arc(p.x, p.y, 10 + t * 82, 0, Math.PI * 2); c.stroke();
            if (t < .18) {
                const ship = Object.assign({}, game, { state: Object.assign({}, game.state, { ship: Object.assign({}, game.state.ship, snapshot, { slots: snapshot.slots, activeHullId: snapshot.activeHullId, hull: 0, shield: 0, overshield: 0 }) }) });
                c.globalAlpha = 1 - t / .18; this.drawShipModel(ship, { x: p.x, y: p.y, rotation: snapshot.angle + Math.PI / 2, static: true }); c.globalAlpha = 1;
            }
            (death.fragments || []).forEach(fragment => {
                const age = Math.min(death.elapsed, 2.2), x = p.x + fragment.x + fragment.vx * age, y = p.y + fragment.y + fragment.vy * age;
                c.save(); c.translate(x, y); c.rotate(fragment.rotation + fragment.spin * age); c.scale(fragment.scale, fragment.scale); c.globalAlpha = Math.max(0, 1 - t * .58); c.fillStyle = '#080b10'; c.strokeStyle = fragment.color || '#55f0ad'; c.lineWidth = 1.5; this.shipPath(fragment.fragment); c.fill(); c.stroke(); c.restore();
            });
            (death.sparks || []).forEach((spark, index) => {
                const drift = spark.speed * Math.min(death.elapsed, 1.9), wobble = Math.sin(death.elapsed * 4 + index) * 2, x = p.x + Math.cos(spark.angle) * drift - Math.sin(spark.angle) * wobble, y = p.y + Math.sin(spark.angle) * drift + Math.cos(spark.angle) * wobble;
                c.globalAlpha = Math.max(0, .78 - t * .78); c.fillStyle = spark.color; c.fillRect(x, y, spark.size, spark.size);
            });
            c.globalAlpha = Math.max(0, .68 - t * .38); c.strokeStyle = '#d9edf2'; c.setLineDash?.([8, 7]); c.beginPath(); c.arc(p.x, p.y, 40 + Math.sin(death.elapsed * 3) * 2, 0, Math.PI * 2); c.stroke(); c.setLineDash?.([]);
            c.fillStyle = '#d9edf2'; c.font = '10px "Courier New"'; c.textAlign = 'center'; c.fillText('LAST KNOWN TRANSPONDER', p.x, p.y + 72); c.restore(); c.globalAlpha = 1; return true;
        }
        drawShipPreview(game) {
            const c = this.ctx; c.clearRect(0, 0, this.w, this.h); const glow = c.createRadialGradient(this.w / 2, this.h * .48, 20, this.w / 2, this.h * .48, Math.min(this.w, this.h) * .48); glow.addColorStop(0, '#17404b66'); glow.addColorStop(1, '#06131800'); c.fillStyle = glow; c.fillRect(0, 0, this.w, this.h);
            this.drawShipModel(game, { x: this.w / 2, y: this.h * .5, rotation: 0, scale: Math.max(3.2, Math.min(this.w / 105, this.h / 125)), static: true });
        }
        drawNebulaPuff(x, y, radius, alpha, color) {
            const c = this.ctx, glow = c.createRadialGradient(x, y, radius * .06, x, y, radius);
            glow.addColorStop(0, `rgba(${color},${alpha})`); glow.addColorStop(.32, `rgba(${color},${alpha * .86})`); glow.addColorStop(.68, `rgba(${color},${alpha * .32})`); glow.addColorStop(1, `rgba(${color},0)`);
            c.fillStyle = glow; c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        }
        drawNebula(game) {
            const c = this.ctx, exposure = ns.World.boundaryExposure(game.state.ship.x, game.state.ship.y, game.world?.config); if (exposure.proximity <= 0) return;
            const config = game.world?.config, edges = ns.World.exposedRegionEdges(config).map(edge => Object.assign({}, edge, {
                screen: edge.axis === 'x' ? this.w / 2 + (edge.value - game.camera.x) * (game.camera.zoom || 1) : this.h / 2 + (edge.value - game.camera.y) * (game.camera.zoom || 1),
                start: edge.axis === 'x' ? this.h / 2 + (edge.min - game.camera.y) * (game.camera.zoom || 1) : this.w / 2 + (edge.min - game.camera.x) * (game.camera.zoom || 1),
                end: edge.axis === 'x' ? this.h / 2 + (edge.max - game.camera.y) * (game.camera.zoom || 1) : this.w / 2 + (edge.max - game.camera.x) * (game.camera.zoom || 1)
            }));
            const intensity = .55 + exposure.proximity * .45;
            c.save(); c.globalCompositeOperation = 'screen'; edges.forEach((edge, edgeIndex) => {
                const screenLimit = edge.axis === 'x' ? this.w : this.h, alongLimit = edge.axis === 'x' ? this.h : this.w;
                if (edge.screen < -1150 || edge.screen > screenLimit + 1150 || Math.max(edge.start, edge.end) < -1150 || Math.min(edge.start, edge.end) > alongLimit + 1150) return;
                const min = Math.min(edge.start, edge.end), max = Math.max(edge.start, edge.end), span = Math.max(1, max - min), count = Math.max(7, Math.min(20, Math.ceil(span / 90)));
                for (let layer = 0; layer < 4; layer++) for (let i = 0; i < count; i++) {
                    const along = min + (i / Math.max(1, count - 1)) * span + (hash(771, edgeIndex, i, layer) - .5) * 180, radius = 230 + hash(992, edgeIndex, i, layer) * 320;
                    const depth = 55 + layer * 180 + hash(445, edgeIndex, i, layer) * 190;
                    const x = edge.axis === 'x' ? edge.screen + edge.side * depth : along;
                    const y = edge.axis === 'y' ? edge.screen + edge.side * depth : along;
                    const color = layer === 2 ? '90,120,190' : layer === 1 ? '160,64,178' : '210,70,145';
                    this.drawNebulaPuff(x, y, radius, (.14 + exposure.proximity * .14 + layer * .026) * intensity, color);
                }
                c.strokeStyle = `rgba(255,96,178,${.3 + exposure.proximity * .34})`; c.lineWidth = 4; c.setLineDash([14, 10]); c.beginPath(); if (edge.axis === 'x') { c.moveTo(edge.screen, min); c.lineTo(edge.screen, max); } else { c.moveTo(min, edge.screen); c.lineTo(max, edge.screen); } c.stroke();
                c.strokeStyle = `rgba(166,100,255,${.18 + exposure.proximity * .24})`; c.lineWidth = 10; c.setLineDash([]); c.beginPath(); if (edge.axis === 'x') { c.moveTo(edge.screen + edge.side * 18, min); c.lineTo(edge.screen + edge.side * 18, max); } else { c.moveTo(min, edge.screen + edge.side * 18); c.lineTo(max, edge.screen + edge.side * 18); } c.stroke();
            });
            ns.World.exposedRegionCorners(config).forEach((corner, index) => {
                const zoom = game.camera.zoom || 1, x = this.w / 2 + (corner.x - game.camera.x) * zoom, y = this.h / 2 + (corner.y - game.camera.y) * zoom;
                if (x < -1200 || x > this.w + 1200 || y < -1200 || y > this.h + 1200) return;
                for (let layer = 0; layer < 5; layer++) {
                    const radius = 300 + layer * 105 + hash(3301, index, layer, 1) * 160;
                    const ox = corner.sideX * (70 + layer * 42 + hash(3302, index, layer, 1) * 90);
                    const oy = corner.sideY * (70 + layer * 42 + hash(3303, index, layer, 1) * 90);
                    this.drawNebulaPuff(x + ox, y + oy, radius, (.18 + exposure.proximity * .16 + layer * .018) * intensity, layer % 2 ? '170,72,210' : '230,70,155');
                }
                c.strokeStyle = `rgba(255,110,205,${.34 + exposure.proximity * .36})`; c.lineWidth = 5; c.setLineDash([12, 9]); c.beginPath();
                c.moveTo(x + corner.sideX * 34, y); c.lineTo(x + corner.sideX * 260, y + corner.sideY * 260); c.lineTo(x, y + corner.sideY * 34); c.stroke(); c.setLineDash([]);
            });
            if (exposure.active) {
                const density = Math.min(1, .48 + exposure.depth / 1400), fieldW = this.w + 700, fieldH = this.h + 700;
                c.globalCompositeOperation = 'source-over'; c.fillStyle = `rgba(96,20,82,${.16 + density * .24})`; c.fillRect(0, 0, this.w, this.h); c.globalCompositeOperation = 'screen';
                for (let i = 0; i < 28; i++) {
                    const x = ((hash(1801, i, 1, 1) * fieldW - game.camera.x * (.08 + i % 3 * .025)) % fieldW + fieldW) % fieldW - 350;
                    const y = ((hash(2203, i, 2, 1) * fieldH - game.camera.y * (.08 + i % 4 * .02)) % fieldH + fieldH) % fieldH - 350;
                    const radius = 190 + hash(2711, i, 3, 1) * 330, color = i % 4 === 0 ? '80,100,145' : i % 3 === 0 ? '178,61,128' : '112,58,143';
                    this.drawNebulaPuff(x, y, radius, .12 + density * .18, color);
                }
            }
            c.restore();
        }
        drawRadar(game) {
            const c = this.ctx, radius = Math.min(122, this.w * .12, this.h * .17), edge = Math.max(18, radius * .31), x = this.w - radius - edge, y = this.h - radius - edge, range = 1300 * game.state.settings.radarScale, scale = radius / 70;
            c.save(); c.translate(x, y); c.fillStyle = '#02090dcc'; c.strokeStyle = '#55f0ad55'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, radius, 0, Math.PI * 2); c.fill(); c.stroke();
            c.beginPath(); c.moveTo(-radius, 0); c.lineTo(radius, 0); c.moveTo(0, -radius); c.lineTo(0, radius); c.stroke();
            const drawBlip = (e, color, size) => { size *= scale; const dx = (e.x - game.state.ship.x) / range * radius, dy = (e.y - game.state.ship.y) / range * radius; if (Math.hypot(dx, dy) > radius) return; c.fillStyle = color; c.fillRect(dx - size / 2, dy - size / 2, size, size); };
            game.world.nearbyEntities(game.state.ship.x, game.state.ship.y, range).filter(e => e.kind !== 'worldScenario' || !ns.WorldEvents.isHiddenScenario(e)).forEach(e => { const definition = e.kind === 'worldObject' ? ns.Data.WORLD_OBJECT_TYPES[e.typeId] : e.kind === 'worldScenario' ? ns.Data.WORLD_SCENARIOS[e.typeId] : null; drawBlip(e, e.kind === 'station' ? ns.Data.FACTIONS[e.faction].color : e.kind === 'asteroid' ? '#56707d' : definition?.color || '#ce75ff', e.kind === 'station' ? 5 : e.kind === 'worldScenario' ? 4 : 3); });
            game.enemies.forEach(e => drawBlip(e, '#ff4f91', 4)); const convoy = game.state.contracts.active?.escort?.convoy; if (convoy?.hull > 0) drawBlip(convoy, '#55d7ff', 5); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 3 * scale, 0, Math.PI * 2); c.fill(); c.restore();
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

            // Option 2: at least 10% inset, but can move outward up to 20% to avoid HUD (user adjusted to .1/.2)
            const MIN_PCT = 0.10, MAX_PCT = 0.20;
            let leftInset = Math.floor(this.w * MIN_PCT), rightInset = Math.floor(this.w * MIN_PCT), topInset = Math.floor(this.h * MIN_PCT), bottomInset = Math.floor(this.h * MIN_PCT);

            // Gather overlay rectangles (canvas-local coords) so we can both expand insets and check overlaps
            let overlayRects = [];
            try {
                if (typeof document !== 'undefined' && this.canvas && this.canvas.getBoundingClientRect) {
                    const canvasRect = this.canvas.getBoundingClientRect();
                    const selectors = ['.top-hud', '.systems-hud', '.ability-hud', '.flight-hud-bottom', '.light-speed-map', '.cockpit-frame', '.cockpit-panel', '.start-screen'];
                    overlayRects = selectors.map(sel => document.querySelector(sel)).filter(Boolean).map(el => el.getBoundingClientRect()).map(r => ({
                        left: Math.max(0, r.left - canvasRect.left),
                        right: Math.min(canvasRect.width, r.right - canvasRect.left),
                        top: Math.max(0, r.top - canvasRect.top),
                        bottom: Math.min(canvasRect.height, r.bottom - canvasRect.top)
                    }));
                    overlayRects.forEach(r => {
                        const relLeft = r.left, relRight = r.right, relTop = r.top, relBottom = r.bottom;
                        if (relRight > 0 && relLeft < canvasRect.width * 0.6) leftInset = Math.max(leftInset, Math.min(relRight, Math.floor(this.w * MAX_PCT)));
                        if (relLeft < canvasRect.width && relRight > canvasRect.width * 0.4) rightInset = Math.max(rightInset, Math.min(this.w - relLeft, Math.floor(this.w * MAX_PCT)));
                        if (relBottom > 0 && relTop < canvasRect.height * 0.6) topInset = Math.max(topInset, Math.min(relBottom, Math.floor(this.h * MAX_PCT)));
                        if (relTop < canvasRect.height && relBottom > canvasRect.height * 0.4) bottomInset = Math.max(bottomInset, Math.min(this.h - relTop, Math.floor(this.h * MAX_PCT)));
                    });
                }
            } catch (e) { /* ignore DOM issues */ }

            leftInset = Math.min(leftInset, Math.floor(this.w * MAX_PCT));
            rightInset = Math.min(rightInset, Math.floor(this.w * MAX_PCT));
            topInset = Math.min(topInset, Math.floor(this.h * MAX_PCT));
            bottomInset = Math.min(bottomInset, Math.floor(this.h * MAX_PCT));

            const bounds = { left: leftInset, right: this.w - rightInset, top: topInset, bottom: this.h - bottomInset };

            // Projected position without clamping to inner box
            const projectedFull = { x: cx + dx, y: cy + dy };
            const inFullViewport = !ns.LightSpeed.isShifted(game) && projectedFull.x >= 0 && projectedFull.x <= this.w && projectedFull.y >= 0 && projectedFull.y <= this.h;

            // If the target is visible in the full viewport and not overlapped by HUD, show the on-screen waypoint (hide the arrow)
            if (inFullViewport) {
                try {
                    const overlapped = overlayRects.some(r => projectedFull.x >= r.left && projectedFull.x <= r.right && projectedFull.y >= r.top && projectedFull.y <= r.bottom);
                    if (!overlapped) return { x: projectedFull.x, y: projectedFull.y, angle: Math.atan2(dy, dx), onScreen: true, distance: Math.round(distanceToTarget), label: target.label || ns.Contracts.destinationName(contract), bounds };
                } catch (e) {
                    // if overlayRects check fails for any reason, fall back to inner-box behaviour
                }
            }

            // Otherwise compute intersection with the inner bounds and draw the off-screen arrow there
            const projected = projectedFull;
            const onScreen = !ns.LightSpeed.isShifted(game) && projected.x >= bounds.left && projected.x <= bounds.right && projected.y >= bounds.top && projected.y <= bounds.bottom;
            let x = projected.x, y = projected.y;
            if (!onScreen) {
                const eps = 1e-6;
                const candidates = [];
                if (Math.abs(dx) > eps) {
                    let t = (bounds.left - cx) / dx; let yCand = cy + dy * t; if (t >= 0 && yCand >= bounds.top && yCand <= bounds.bottom) candidates.push({ t, x: bounds.left, y: yCand });
                    t = (bounds.right - cx) / dx; yCand = cy + dy * t; if (t >= 0 && yCand >= bounds.top && yCand <= bounds.bottom) candidates.push({ t, x: bounds.right, y: yCand });
                }
                if (Math.abs(dy) > eps) {
                    let t = (bounds.top - cy) / dy; let xCand = cx + dx * t; if (t >= 0 && xCand >= bounds.left && xCand <= bounds.right) candidates.push({ t, x: xCand, y: bounds.top });
                    t = (bounds.bottom - cy) / dy; xCand = cx + dx * t; if (t >= 0 && xCand >= bounds.left && xCand <= bounds.right) candidates.push({ t, x: xCand, y: bounds.bottom });
                }
                if (candidates.length) { candidates.sort((a, b) => a.t - b.t); x = candidates[0].x; y = candidates[0].y; }
                else {
                    const scaleX = dx > 0 ? (bounds.right - cx) / Math.abs(dx || 1) : (cx - bounds.left) / Math.abs(dx || 1);
                    const scaleY = dy > 0 ? (bounds.bottom - cy) / Math.abs(dy || 1) : (cy - bounds.top) / Math.abs(dy || 1);
                    const scale = Math.max(0, Math.min(scaleX, scaleY)); x = cx + dx * scale; y = cy + dy * scale;
                }
            }
            return { x, y, angle: Math.atan2(dy, dx), onScreen, distance: Math.round(distanceToTarget), label: target.label || ns.Contracts.destinationName(contract), bounds };
        }
        drawContractWaypoint(game) {
            ns.Contracts.targetsFor(game.state.contracts.active, game.state).forEach((target, index) => this.drawOneContractWaypoint(game, target, index, target.denied ? '#ff597f' : null));
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
        drawInteractionPrompt(game) {
            if (game.interactionCast) return;
            const available = game.availableInteraction?.(); if (!available) return;
            const c = this.ctx, zoom = game.camera.zoom || 1, x = this.w / 2 + (game.state.ship.x - game.camera.x) * zoom, y = this.h / 2 + (game.state.ship.y - game.camera.y) * zoom + 48;
            const name = String(available.target.name || available.target.kind || 'OBJECT').toUpperCase(), text = `F // ${available.verb} ${name}`;
            c.save(); c.font = 'bold 9px "Courier New"'; c.textAlign = 'center'; const width = Math.min(240, Math.max(92, c.measureText ? c.measureText(text).width + 22 : text.length * 7));
            c.fillStyle = '#041016dd'; c.fillRect(x - width / 2, y - 11, width, 18); c.strokeStyle = '#55f0ad88'; c.strokeRect(x - width / 2, y - 11, width, 18); c.fillStyle = '#55f0ad'; c.fillText(text, x, y + 1); c.restore();
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
            this.clear(game.region, game.camera, ns.Galaxies.current(game.state)); const c = this.ctx, zoom = game.camera.zoom || 1;
            c.save(); c.translate(this.w / 2, this.h / 2); c.scale(zoom, zoom); c.translate(-this.w / 2, -this.h / 2); this.drawWorld(game); this.drawNebula(game); this.drawContractContact(game); if (game.deathCinematic) this.drawPlayerDeathCinematic(game); else this.drawShip(game); c.restore();
            if (game.deathCinematic && !game.deathCinematic.promptOpen) return;
            if (ns.LightSpeed.ensure(game).phase === 'charging') this.drawPhaseOverlay(game);
            this.drawInteractionPrompt(game); this.drawInteractionCast(game); this.drawRadar(game); this.drawContractWaypoint(game); this.drawCustomWaypoint(game);
        }
    }
    ns.Renderer = Renderer;
})(window.FrontierWayfarer);
