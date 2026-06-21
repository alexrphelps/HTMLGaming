(function (ns) {
    const { FACTIONS, REGIONS, LANDMARKS, COMMODITIES, MODULES, TRAITS, QUESTS } = ns.Data;
    const { distance } = ns.MathUtil;
    const CREDIT_META = {
        aetherium: { short: 'AE', color: '#55f0ad' },
        sunshards: { short: 'SS', color: '#ffbd59' },
        helionite: { short: 'HE', color: '#55d7ff' }
    };
    class UI {
        constructor() {
            this.start = document.getElementById('startScreen'); this.panel = document.getElementById('cockpitPanel'); this.panelBody = document.getElementById('panelBody');
            this.panelTitle = document.getElementById('panelTitle'); this.headerUndock = document.getElementById('headerUndock'); this.message = document.getElementById('message'); this.activeTab = 'station'; this.game = null;
            document.addEventListener('click', event => this.handleClick(event));
            document.addEventListener('input', event => { if (event.target.id === 'volumeSetting' && this.game?.state) { this.game.state.settings.volume = Number(event.target.value); this.game.save(); } });
            document.addEventListener('contextmenu', event => { if (event.target.id === 'gameCanvas') event.preventDefault(); });
        }
        bind(game) {
            this.game = game; const saved = ns.Save.load(); document.getElementById('continueCareer').hidden = !saved;
            document.getElementById('startWallet').innerHTML = this.walletHtml(saved || ns.State.createState(0), false);
        }
        walletHtml(state, showUnbanked) {
            const wallet = ns.Wallet.ensure(state);
            return ns.Wallet.KEYS.map(key => { const meta = CREDIT_META[key], pending = wallet.unbanked[key]; return `<span class="wallet-credit" title="${key[0].toUpperCase() + key.slice(1)}" style="--credit:${meta.color}"><small>${meta.short}</small><b>${wallet.banked[key].toLocaleString()}</b>${showUnbanked && pending ? `<em>+${pending}</em>` : ''}</span>`; }).join('');
        }
        costHtml(cost) {
            const value = ns.Wallet.normalize(cost);
            return ns.Wallet.KEYS.filter(key => value[key] > 0).map(key => `<span style="color:${CREDIT_META[key].color}">${value[key]} ${CREDIT_META[key].short}</span>`).join(' + ') || '<span>NO COST</span>';
        }
        hideStart() { this.start.classList.remove('active'); }
        showMessage(text) { this.message.textContent = text; this.message.classList.remove('show'); void this.message.offsetWidth; this.message.classList.add('show'); }
        togglePanel(game, tab) {
            if (!this.panel.classList.contains('active')) return this.openPanel(game, tab);
            if ((tab || 'pause') === this.activeTab) return this.closePanel();
            return this.openPanel(game, tab);
        }
        openPanel(game, tab) { this.game = game; this.activeTab = tab || this.activeTab; game.paused = true; this.panel.classList.add('active'); this.renderPanel(game); }
        closePanel() { if (this.game?.state?.dockedAt) return; this.panel.classList.remove('active'); if (this.game) this.game.paused = false; }
        renderAll(game) { this.game = game; if (this.panel.classList.contains('active')) this.renderPanel(game); this.updateHud(game); }
        renderContext(game) {
            if (ns.LightSpeed.isShifted(game)) { document.getElementById('contextPrompt').textContent = 'R // DECELERATE'; return; }
            const nearby = game.world.nearbyEntities(game.state.ship.x, game.state.ship.y, 190).sort((a, b) => distance(a, game.state.ship) - distance(b, game.state.ship))[0];
            document.getElementById('contextPrompt').textContent = nearby ? `F // ${nearby.kind === 'station' ? 'DOCK' : 'INTERACT'} ${nearby.name || nearby.kind}` : 'TAB // CYCLE TARGET';
        }
        updateHud(game) {
            if (!game.state) return; const state = game.state, s = state.ship, stats = ns.Progression.calculateShipStats(state), active = state.contracts.active;
            this.meter('hull', s.hull, stats.hull); this.meter('shield', s.shield + (s.overshield || 0), stats.shield || 1, stats.shield ? null : 'OFFLINE'); this.meter('energy', s.energy, stats.reactor); this.meter('heat', s.heat, 100);
            document.getElementById('regionName').textContent = game.region.name.toUpperCase(); document.getElementById('pilotLevel').textContent = `LV ${state.pilot.level}`;
            document.getElementById('speedValue').textContent = `${Math.round(Math.hypot(s.vx, s.vy))} M/S`;
            document.getElementById('objective').innerHTML = ns.LightSpeed.isShifted(game) ? `<strong>LIGHT SPEED // ${game.region.name}</strong><span>VECTOR ${Math.round(s.x)}, ${Math.round(s.y)} // ${Math.round(ns.LightSpeed.ensure(game).distance)}M SHIFTED</span>` : active ? `<strong>${active.name}</strong><span>${active.description} // ${active.progress}/${active.required}</span>` : `<strong>FREE FLIGHT</strong><span>${ns.Unlocks.nextMilestone(state)}</span>`;
            document.getElementById('worldWallet').innerHTML = this.walletHtml(state, true); document.getElementById('menuWallet').innerHTML = this.walletHtml(state, true);
            const labels = { abilitySpace: 'SPACE', abilityQ: 'Q', abilityE: 'E', abilityShift: 'SHIFT' };
            document.getElementById('abilityHud').innerHTML = Object.keys(labels).map(slot => { const info = ns.Abilities.slotState(state, slot), max = info.module?.ability?.cooldown || 1, ready = info.cooldown > 0 ? Math.max(0, 100 - info.cooldown / max * 100) : 100; return `<div class="ability-slot ${info.unlocked ? '' : 'locked'} ${info.cooldown > 0 ? 'cooling' : ''}" style="--ready:${ready}%"><span class="ability-key">${labels[slot]}</span><span><b>${info.unlocked ? info.module?.name || 'EMPTY' : 'LOCKED'}</b>${info.cooldown > 0 ? `${info.cooldown.toFixed(1)} SEC` : info.unlocked ? 'READY' : ''}</span></div>`; }).join('');
            const drive = ns.LightSpeed.status(game), driveHud = document.getElementById('lightDriveHud'); driveHud.className = `light-drive-hud ${drive.className}`; driveHud.innerHTML = `<span>R</span><strong>ASTERION</strong><small>${drive.label}</small>`;
        }
        meter(id, value, max, label) { const pct = Math.max(0, Math.min(100, max ? value / max * 100 : 0)); document.getElementById(`${id}Bar`).style.width = `${pct}%`; document.getElementById(`${id}Value`).textContent = label || `${Math.ceil(value)}/${Math.ceil(max)}`; }
        nav(game) {
            const docked = Boolean(game.state.dockedAt), trade = ns.Unlocks.evaluate(game.state).tradeTier > 0;
            return ['station', 'contracts', 'trade', 'ship', 'traits', 'factions', 'navigation', 'settings'].map(id => {
                if ((!docked && ['station', 'trade'].includes(id)) || (id === 'trade' && !trade)) return '';
                return `<button class="panel-tab ${this.activeTab === id ? 'active' : ''}" data-action="tab" data-id="${id}">${id.toUpperCase()}</button>`;
            }).join('');
        }
        renderPanel(game) {
            document.getElementById('panelTabs').innerHTML = this.nav(game); document.getElementById('menuWallet').innerHTML = this.walletHtml(game.state, true); this.panelTitle.textContent = this.activeTab.toUpperCase();
            this.headerUndock.hidden = !game.state.dockedAt;
            const render = this[`render_${this.activeTab}`] || this.render_pause; this.panelBody.innerHTML = render.call(this, game);
        }
        render_pause(game) { return `<section class="panel-section hero-panel"><p class="eyebrow">FLIGHT SUSPENDED</p><h2>Wayfarer command</h2><p>${ns.Unlocks.nextMilestone(game.state)}</p><button data-action="close">RETURN TO FLIGHT</button></section>`; }
        repairCost(state) { const stats = ns.Progression.calculateShipStats(state); return { aetherium: Math.ceil((stats.hull - state.ship.hull) * 1.4 + Object.values(state.ship.moduleDamage).reduce((a, b) => a + b, 0) * 420) }; }
        chassisCost(state) { return { aetherium: state.ship.chassis.level * 700, helionite: state.ship.chassis.level * 5 }; }
        render_station(game) {
            const state = game.state, station = LANDMARKS.find(l => l.id === state.dockedAt); if (!station) return this.render_pause(game); const repair = this.repairCost(state), chassis = this.chassisCost(state);
            return `<div class="station-hero"><p class="eyebrow">${FACTIONS[station.faction].short} FACILITY</p><h2>${station.name}</h2><p>${ns.Unlocks.nextMilestone(state)}</p></div><div class="card-grid three">
                <article><span class="card-kicker">SHIP SERVICE</span><h3>Restore Wayfarer</h3><p>Repair hull and damaged modules.</p><button data-action="repair" ${repair.aetherium <= 0 ? 'disabled' : ''}>REPAIR // ${this.costHtml(repair)}</button></article>
                <article><span class="card-kicker">CHASSIS</span><h3>Frame Tier ${state.ship.chassis.level}</h3><p>Increase integrity, mass, reactor and cargo reserves.</p><button data-action="chassis" ${state.ship.chassis.level >= 5 ? 'disabled' : ''}>UPGRADE // ${this.costHtml(chassis)}</button></article>
                <article><span class="card-kicker">RECOVERY</span><h3>${state.ship.insured ? 'Cargo insured' : 'Cargo exposed'}</h3><p>Insurance preserves cargo after destruction.</p><button data-action="insurance">${state.ship.insured ? 'CANCEL POLICY' : `INSURE // ${this.costHtml({ aetherium: 300 })}`}</button></article></div>
                <div class="station-actions">${ns.Unlocks.evaluate(state).tradeTier ? '<button data-action="tab" data-id="trade">OPEN MARKET</button>' : ''}</div>`;
        }
        render_contracts(game) {
            const state = game.state, station = LANDMARKS.find(l => l.id === state.dockedAt), active = state.contracts.active;
            if (active) return `<div class="contract-focus"><p class="eyebrow">ACTIVE CONTRACT // RISK ${active.risk}</p><h2>${active.name}</h2><p>${active.description}</p><div class="reward-line"><span>${active.progress}/${active.required}</span><strong>${this.costHtml(active.reward)}</strong></div><button class="danger" data-action="abandon">ABANDON CONTRACT</button></div>`;
            if (!station) return '<section class="empty-state"><h2>No active contract</h2><p>Dock to access a local board.</p></section>';
            if (!state.contracts.board.length) ns.Contracts.refreshBoard(state, station);
            return `<div class="contract-list">${state.contracts.board.map(c => `<article class="contract-card"><div><span class="risk">RISK ${c.risk}</span><h3>${c.name}</h3><p>${c.description}</p></div><div class="contract-pay"><strong>${this.costHtml(c.reward)}</strong><span>${c.xp} XP</span><button data-action="accept-contract" data-id="${c.id}">ACCEPT</button></div></article>`).join('')}</div><button data-action="refresh-contracts">REFRESH BOARD</button>`;
        }
        render_trade(game) {
            const state = game.state, station = LANDMARKS.find(l => l.id === state.dockedAt); if (!station) return '<p>Dock to trade.</p>'; ns.Economy.ensureMarket(state, station);
            const goods = Object.values(COMMODITIES).filter(item => ns.Unlocks.commodityVisible(state, item)); const modules = Object.values(MODULES).filter(m => m.cost && ns.Unlocks.moduleVisible(state, m));
            return `<div class="trade-header"><div><span class="eyebrow">REGIONAL SUPPLY EXCHANGE // TIER ${ns.Unlocks.evaluate(state).tradeTier}</span><h2>${station.name}</h2></div></div><div class="market-grid">${goods.map(item => { const owned = state.ship.cargo[item.id] || 0; return `<article style="--item:${item.color}"><span class="card-kicker">${item.legal ? 'REGULATED' : 'RESTRICTED'}</span><h3>${item.name}</h3><p>Hold ${owned} // Buy ${ns.Economy.price(state, station, item.id, 'buy')} AE // Sell ${ns.Economy.price(state, station, item.id, 'sell')} AE</p><div><button data-action="buy-cargo" data-id="${item.id}">BUY 1</button><button data-action="sell-cargo" data-id="${item.id}" ${owned ? '' : 'disabled'}>SELL 1</button></div></article>`; }).join('')}</div><h2 class="section-title">MODULE MARKET</h2><div class="module-market">${modules.filter(m => m.cost && !ns.Wallet.isZero(m.cost) && (!m.majorOnly || station.major || state.ship.ownedModules.includes(m.id))).map(m => `<article><div><span>TIER ${m.tier} // ${m.slot.toUpperCase()}</span><strong>${m.name}</strong></div><button data-action="buy-module" data-id="${m.id}" ${state.ship.ownedModules.includes(m.id) ? 'disabled' : ''}>${state.ship.ownedModules.includes(m.id) ? 'OWNED' : this.costHtml(m.cost)}</button></article>`).join('')}</div>`;
        }
        render_ship(game) {
            const state = game.state, stats = ns.Progression.calculateShipStats(state), unlocks = ns.Unlocks.evaluate(state); const slots = Object.entries(state.ship.slots).filter(([slot]) => !slot.startsWith('ability') || unlocks.abilitySlots[slot]);
            const compatible = slot => state.ship.ownedModules.filter(id => { const m = MODULES[id]; return slot.startsWith('primary') ? m.slot === 'primary' : slot.startsWith('utility') ? m.slot === 'utility' : slot.startsWith('ability') ? m.slot === 'ability' : m.slot === slot; });
            return `<div class="ship-summary"><div><span class="eyebrow">PERSONAL STARFIGHTER</span><h2>${state.ship.name}</h2><p>FRAME TIER ${state.ship.chassis.level}</p></div><div class="stat-strip"><span>MASS <b>${stats.mass.toFixed(1)}/${stats.massLimit}</b></span><span>THRUST <b>${Math.round(stats.thrust)}</b></span><span>SHIELD <b>${Math.round(stats.shield)} @ ${stats.shieldRecharge}/S</b></span><span>CARGO <b>${ns.Progression.cargoUsed(state)}/${stats.cargo}</b></span></div></div><div class="slot-grid">${slots.map(([slot, id]) => `<article><span class="card-kicker">${slot.replace('ability', '').toUpperCase()}</span><h3>${id ? MODULES[id].name : 'EMPTY SLOT'}</h3><div class="slot-options">${compatible(slot).map(mid => `<button class="small ${mid === id ? 'selected' : ''}" data-action="equip" data-slot="${slot}" data-id="${mid}">${MODULES[mid].name}</button>`).join('') || '<span>Acquire a compatible module.</span>'}</div></article>`).join('')}</div>`;
        }
        render_traits(game) {
            const state = game.state; return `<div class="trait-header"><div><span class="eyebrow">PILOT DEVELOPMENT</span><h2>${state.pilot.traitPoints} points available</h2></div><button data-action="respec">RETRAIN // ${this.costHtml(ns.Progression.respecCost(state))}</button></div><div class="discipline-grid">${['ace', 'engineer', 'pathfinder', 'operator'].map(d => `<section class="discipline ${d}"><header><span>${d.toUpperCase()}</span><b>${ns.Progression.getDisciplineSpend(state, d)} INVESTED</b></header>${TRAITS.filter(t => t.discipline === d).map(t => { const rank = ns.Progression.getTraitRank(state, t.id), achievement = t.capstone ? ({ ace: 'combat_veteran', engineer: 'master_mechanic', pathfinder: 'rim_cartographer', operator: 'career_pilot' }[d]) : ''; return `<article class="trait ${t.capstone ? 'capstone' : ''} ${rank ? 'owned' : ''}"><div><h3>${t.name}</h3><p>${t.description}</p>${t.capstone && !state.pilot.achievements[achievement] ? `<small>ACHIEVEMENT REQUIRED: ${achievement.replace('_', ' ').toUpperCase()}</small>` : ''}</div><button data-action="buy-trait" data-id="${t.id}" ${ns.Progression.canBuyTrait(state, t.id) ? '' : 'disabled'}>${rank}/${t.maxRank}</button></article>`; }).join('')}</section>`).join('')}</div>`;
        }
        render_factions(game) { const state = game.state; return `<div class="faction-grid">${Object.values(FACTIONS).map(f => { const rep = Math.round(state.reputations[f.id]), joined = state.pilot.allegiance === f.id, quest = QUESTS[f.id][Math.min(state.quests[f.id], QUESTS[f.id].length - 1)]; return `<article style="--faction:${f.color}"><span class="eyebrow">${f.short}</span><h2>${f.name}</h2><p>${f.description}</p><div class="reputation"><span style="width:${Math.max(2, (rep + 100) / 2)}%"></span></div><strong>STANDING ${rep >= 0 ? '+' : ''}${rep}</strong><p class="quest-line">CURRENT ARC // ${quest}</p>${f.id !== 'independents' ? `<button data-action="${joined ? 'leave-faction' : 'join-faction'}" data-id="${f.id}" ${!joined && rep < 15 ? 'disabled' : ''}>${joined ? 'LEAVE FACTION' : 'JOIN AT +15'}</button>` : '<span class="neutral-badge">INDEPENDENT CAREER NETWORK</span>'}</article>`; }).join('')}</div>`; }
        render_navigation(game) {
            const state = game.state, exposure = ns.World.boundaryExposure(state.ship.x, state.ship.y);
            const bounds = ns.World.WORLD_BOUNDS, worldW = bounds.maxX - bounds.minX, worldH = bounds.maxY - bounds.minY;
            const pctX = x => (x - bounds.minX) / worldW * 100, pctY = y => (y - bounds.minY) / worldH * 100;
            const playerX = Math.max(0, Math.min(100, pctX(state.ship.x))), playerY = Math.max(0, Math.min(100, pctY(state.ship.y)));
            const column = Math.max(0, Math.min(4, Math.floor((state.ship.x - bounds.minX) / 9000))), row = Math.max(0, Math.min(3, Math.floor((state.ship.y - bounds.minY) / 7200)));
            const hazard = exposure.active ? `NEBULA BREACH // ${Math.round(exposure.depth)}M OUTSIDE SAFE SPACE` : exposure.proximity > 0 ? 'PERIMETER NEBULA IN SENSOR RANGE' : 'SECTOR ENVELOPE NOMINAL';
            return `<div class="map-layout"><div class="galaxy-map ${exposure.proximity > 0 ? 'nebula-near' : ''}">${REGIONS.map(r => `<div class="map-region" style="left:${pctX(r.x)}%;top:${pctY(r.y)}%;width:${r.w / worldW * 100}%;height:${r.h / worldH * 100}%;border-color:${r.color}"><span>${r.name}</span></div>`).join('')}${LANDMARKS.map(l => `<i class="map-point ${state.discoveries.includes(l.id) ? 'known' : ''}" title="${l.name}" style="left:${pctX(l.x)}%;top:${pctY(l.y)}%;background:${FACTIONS[l.faction].color}"></i>`).join('')}<i class="map-player" style="left:${playerX}%;top:${playerY}%"></i></div><aside><span class="eyebrow">SEAMLESS CHART</span><h2>${game.region.name}</h2><p>GRID ${String.fromCharCode(65 + column)}${row + 1} // ${Math.round(state.ship.x)}, ${Math.round(state.ship.y)}<br>${state.discoveries.length} signals logged<br>${state.visitedRegions.length}/${REGIONS.length} regions visited</p><h3>PERIMETER STATUS</h3><p class="map-hazard ${exposure.active ? 'active' : ''}">${hazard}</p><h3>NEXT LICENSE</h3><p>${ns.Unlocks.nextMilestone(state)}</p></aside></div>`;
        }
        render_settings(game) { const s = game.state.settings; return `<div class="settings-list"><label><span>MASTER VOLUME</span><input id="volumeSetting" type="range" min="0" max="1" step="0.1" value="${s.volume}"></label><label><span>SCREEN SHAKE</span><button data-action="toggle-shake">${s.screenShake ? 'ENABLED' : 'DISABLED'}</button></label><button data-action="save">SAVE CAREER NOW</button><button class="danger" data-action="reset-career">DELETE CAREER</button><div class="controls"><h3>FLIGHT CONTROLS</h3><p>Mouse aim // W/S forward/reverse // A/D strafe</p><p>Mouse 1 weapon one // Mouse 2 weapon two // F interact/dock</p><p>R Light Drive // Space/Q/E/Shift active modules // Tab target</p><p>M map // T traits // C contracts // Esc systems</p></div></div>`; }
        openDefeat(game, result) { this.activeTab = 'defeat'; this.panel.classList.add('active'); this.headerUndock.hidden = true; document.getElementById('panelTabs').innerHTML = ''; document.getElementById('menuWallet').innerHTML = this.walletHtml(game.state, false); this.panelTitle.textContent = 'RECOVERY REPORT'; this.panelBody.innerHTML = `<section class="defeat"><span class="eyebrow">SHIP DISABLED // RESCUE COMPLETE</span><h2>Recovered at ${result.station.name}</h2><p>All unbanked resources were lost.</p><div>${ns.Wallet.KEYS.map(key => `<span>${CREDIT_META[key].short} LOST <b>${result.lostResources[key]}</b></span>`).join('')}<span>CARGO LOST <b>${Object.values(result.lostCargo).reduce((a, b) => a + b, 0)}</b></span></div><button class="primary" data-action="recover">CONTINUE CAREER</button></section>`; }
        handleClick(event) {
            const button = event.target.closest('[data-action]'); if (!button) return; const action = button.dataset.action, id = button.dataset.id, game = this.game;
            if (action === 'new') return game.newCareer(); if (action === 'continue') return game.continueCareer(); if (!game?.state) return;
            const state = game.state, station = LANDMARKS.find(l => l.id === state.dockedAt);
            if (action === 'tab') { this.activeTab = id; this.renderPanel(game); }
            else if (action === 'close') this.closePanel(); else if (action === 'undock') game.undock();
            else if (action === 'accept-contract' && ns.Contracts.accept(state, id)) { game.save(); game.undock(); game.notify('CONTRACT ACCEPTED'); }
            else if (action === 'refresh-contracts' && station) { ns.Contracts.refreshBoard(state, station); this.renderPanel(game); }
            else if (action === 'abandon') { state.contracts.active.status = 'failed'; state.contracts.active = null; state.reputations.independents -= 1; game.save(); this.renderPanel(game); }
            else if (action === 'buy-cargo' && ns.Economy.trade(state, station, id, 1)) { game.save(); this.renderPanel(game); }
            else if (action === 'sell-cargo' && ns.Economy.trade(state, station, id, -1)) { game.save(); this.renderPanel(game); }
            else if (action === 'buy-module' && ns.Economy.buyModule(state, id, station)) { game.save(); this.renderPanel(game); }
            else if (action === 'equip' && ns.Progression.equipModule(state, button.dataset.slot, id)) { game.save(); this.renderPanel(game); }
            else if (action === 'buy-trait' && ns.Progression.buyTrait(state, id)) { game.save(); this.renderPanel(game); }
            else if (action === 'respec' && station?.major && ns.Progression.respec(state)) { game.save(); this.renderPanel(game); }
            else if (action === 'join-faction' && ns.Contracts.joinFaction(state, id)) { game.save(); this.renderPanel(game); }
            else if (action === 'leave-faction' && ns.Contracts.leaveFaction(state)) { game.save(); this.renderPanel(game); }
            else if (action === 'repair' && ns.Combat.repairAll(state)) { game.save(); this.renderPanel(game); }
            else if (action === 'chassis') { const cost = this.chassisCost(state); if (state.ship.chassis.level < 5 && ns.Wallet.debit(state, cost)) { state.ship.chassis.level++; state.ship.chassis.integrity += 35; state.ship.chassis.massLimit += 10; state.ship.chassis.reactorBonus += 8; state.ship.chassis.cargoBonus += 3; state.ship.hull = state.ship.chassis.integrity; game.save(); this.renderPanel(game); } }
            else if (action === 'insurance') { if (state.ship.insured) state.ship.insured = false; else if (ns.Wallet.debit(state, { aetherium: 300 })) state.ship.insured = true; game.save(); this.renderPanel(game); }
            else if (action === 'toggle-shake') { state.settings.screenShake = !state.settings.screenShake; game.save(); this.renderPanel(game); }
            else if (action === 'save') game.save('CAREER SAVED');
            else if (action === 'reset-career') { ns.Save.remove(); location.reload(); }
            else if (action === 'recover') { this.activeTab = 'station'; this.renderPanel(game); }
        }
    }
    ns.UI = UI;
})(window.MiniInvadersV2);
