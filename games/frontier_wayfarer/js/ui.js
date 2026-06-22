(function (ns) {
    const { FACTIONS, REGIONS, LANDMARKS, COMMODITIES, MODULES, TRAITS, QUESTS, HULLS } = ns.Data;
    const { distance } = ns.MathUtil;
    const CREDIT_META = {
        aetherium: { short: 'AE', color: '#55f0ad' },
        sunshards: { short: 'SS', color: '#ffbd59' },
        helionite: { short: 'HE', color: '#55d7ff' }
    };
    class UI {
        constructor() {
            this.start = document.getElementById('startScreen'); this.panel = document.getElementById('cockpitPanel'); this.panelBody = document.getElementById('panelBody');
            this.panelTitle = document.getElementById('panelTitle'); this.headerUndock = document.getElementById('headerUndock'); this.message = document.getElementById('message'); this.activeTab = 'station'; this.focusedContractId = null; this.selectedShipArea = 'engine'; this.navigationView = 'local'; this.selectedGalaxyId = null; this.game = null;
            this.root = document.getElementById('gameShell'); this.onClick = event => this.handleClick(event); this.onInput = event => { if (event.target.id === 'volumeSetting' && this.game?.state) { this.game.state.settings.volume = Number(event.target.value); this.game.save(); } }; this.onContextMenu = event => { if (event.target.id === 'gameCanvas') event.preventDefault(); };
            this.root.addEventListener('click', this.onClick); this.root.addEventListener('input', this.onInput); this.root.addEventListener('contextmenu', this.onContextMenu);
            this.components = {
                startWallet: new ns.Components.Wallet().mount(document.getElementById('startWallet')),
                worldWallet: new ns.Components.Wallet().mount(document.getElementById('worldWallet')),
                menuWallet: new ns.Components.Wallet().mount(document.getElementById('menuWallet')),
                abilities: new ns.Components.AbilityHud().mount(document.getElementById('abilityHud')),
                drive: new ns.Components.DriveHud().mount(document.getElementById('lightDriveHud')),
                objective: new ns.Components.Objective().mount(document.getElementById('objective'))
            };
            this.panelHost = new ns.Components.PanelHost().mount(this.panelBody, { ui: this });
            ['pause', 'station', 'contracts', 'trade', 'ship', 'traits', 'factions', 'navigation', 'settings'].forEach(id => this.panelHost.register(id, new ns.Components.TemplatePanel(game => this[`render_${id}`](game))));
            this.actions = new ns.ActionRouter(); this.registerActions();
        }
        registerActions() {
            this.actions.register('new', ({ game }) => game.newCareer()).register('continue', ({ game }) => game.continueCareer());
            this.actions.register('close', () => this.closePanel()).register('undock', ({ game }) => game.undock());
            this.actions.register('tab', ({ game, id }) => { this.activeTab = id; this.renderPanel(game); });
            this.actions.register('navigation-view', ({ game, id }) => { if (id === 'stargate' && !(game.state.dockedAt && ns.Galaxies.gateStatus(game.state).ready)) return; this.navigationView = id === 'stargate' ? 'stargate' : 'local'; if (this.navigationView === 'stargate') this.selectedGalaxyId = ns.Galaxies.neighbors(game.state.galaxyId)[0] || game.state.galaxyId; this.renderPanel(game); });
            this.actions.register('select-galaxy', ({ game, id }) => { if (ns.Data.GALAXIES.some(galaxy => galaxy.id === id)) { this.selectedGalaxyId = id; this.renderPanel(game); } });
            this.actions.register('stargate-travel', ({ game }) => game.stargateTravel(this.selectedGalaxyId));
            this.actions.register('select-ship-area', ({ game, id }) => { if (ns.Registry.get('slot', id)?.group === 'core') { this.selectedShipArea = id; this.renderPanel(game); } });
            this.actions.register('remove-waypoint', ({ game }) => { game.clearCustomWaypoint('CUSTOM WAYPOINT REMOVED'); this.renderPanel(game); });
            this.actions.register('equip', ({ game, state, button, id }) => { const outcome = ns.Commands.equip(state, button.dataset.slot, id); if (outcome.ok) { game.save(); this.renderPanel(game); } else { const reason = { 'dock-required': 'DOCK AT A STATION', mass: 'MASS LIMIT EXCEEDED', locked: 'SLOT NOT YET LICENSED', 'hull-tier': 'TIER IV HULL REQUIRED' }[outcome.reason] || String(outcome.reason).replace('-', ' ').toUpperCase(); game.notify(`MODULE FIT REJECTED // ${reason}`); } });
            this.actions.register('chassis', ({ game, state }) => { const outcome = ns.Commands.upgradeChassis(state); if (outcome.ok) { game.save(); this.renderPanel(game); } else if (outcome.changes.cost) this.notifyShortfall(game, outcome.changes.cost); });
            this.actions.register('insurance', ({ game, state }) => { const outcome = ns.Commands.toggleInsurance(state); if (outcome.ok) { game.save(); this.renderPanel(game); } else if (outcome.changes.cost) this.notifyShortfall(game, outcome.changes.cost); });
            this.actions.register('toggle-shake', ({ game, state }) => { state.settings.screenShake = !state.settings.screenShake; game.save(); this.renderPanel(game); });
            this.actions.register('save', ({ game }) => game.save('CAREER SAVED')).register('reset-career', () => { ns.Save.remove(); location.reload(); });
            this.actions.register('recover', ({ game }) => { this.activeTab = 'station'; this.renderPanel(game); });
            const persistPanel = game => { game.save(); this.renderPanel(game); };
            this.actions.register('view-contract', ({ game, id }) => { this.focusedContractId = this.focusedContractId === id ? null : id; this.renderPanel(game); });
            this.actions.register('accept-contract', ({ game, state, id }) => { if (ns.Contracts.accept(state, id)) { this.focusedContractId = null; persistPanel(game); game.notify('CONTRACT ACCEPTED // WAYPOINT LOCKED'); } });
            this.actions.register('refresh-contracts', ({ game, state, station }) => { if (!station) return; const outcome = ns.Contracts.manualRefresh(state, station, Date.now()); if (outcome.ok) persistPanel(game); else game.notify(outcome.tutorial ? 'TUTORIAL BOARD CANNOT BE REFRESHED' : `BOARD REFRESH COOLING // ${Math.ceil(outcome.remaining / 1000)} SEC`); });
            this.actions.register('abandon', ({ game, state }) => { if (ns.Contracts.abandon(state)) persistPanel(game); });
            this.actions.register('dismiss-debrief', ({ game, state }) => { state.progression.pendingDebrief = null; persistPanel(game); });
            this.actions.register('buy-hull', ({ game, state, station, id }) => { const hull = HULLS[id], cost = hull?.cost || {}; if (!ns.Wallet.canAfford(state, cost)) this.notifyShortfall(game, cost); else if (ns.Progression.buyHull(state, id, station)) { persistPanel(game); game.notify(`${hull.name.toUpperCase()} // HULL ACQUIRED`); } });
            this.actions.register('switch-hull', ({ game, state, id }) => { const outcome = ns.Progression.switchHull(state, id); if (outcome.ok) { persistPanel(game); game.notify(`${HULLS[id].name.toUpperCase()} // ACTIVE HULL`); } else game.notify(`HULL SWITCH BLOCKED // ${outcome.reason.toUpperCase()}`); });
            this.actions.register('buy-cargo', ({ game, state, station, id }) => { const cost = { aetherium: ns.Economy.price(state, station, id, 'buy') }; if (!ns.Wallet.canAfford(state, cost)) this.notifyShortfall(game, cost); else if (ns.Economy.trade(state, station, id, 1)) persistPanel(game); });
            this.actions.register('sell-cargo', ({ game, state, station, id }) => { if (ns.Economy.trade(state, station, id, -1)) persistPanel(game); });
            this.actions.register('buy-module', ({ game, state, station, id }) => { const cost = MODULES[id]?.cost || {}; if (!ns.Wallet.canAfford(state, cost)) this.notifyShortfall(game, cost); else if (ns.Economy.buyModule(state, id, station)) persistPanel(game); });
            this.actions.register('buy-trait', ({ game, state, id }) => { if (ns.Progression.buyTrait(state, id)) persistPanel(game); });
            this.actions.register('respec', ({ game, state, station }) => { if (!station?.major) return; const cost = ns.Progression.respecCost(state); if (!ns.Wallet.canAfford(state, cost)) this.notifyShortfall(game, cost); else if (ns.Progression.respec(state)) persistPanel(game); });
            this.actions.register('join-faction', ({ game, state, id }) => { const outcome = ns.Commands.joinFaction(state, id); if (outcome.ok) persistPanel(game); });
            this.actions.register('leave-faction', ({ game, state }) => { const outcome = ns.Commands.leaveFaction(state); if (outcome.ok) persistPanel(game); });
            this.actions.register('repair', ({ game, state }) => { const cost = this.repairCost(state); if (!ns.Wallet.canAfford(state, cost)) this.notifyShortfall(game, cost); else if (ns.Combat.repairAll(state, cost)) { if (state.progression.serviceDiscount?.stationId === state.dockedAt) state.progression.serviceDiscount.uses = Math.max(0, state.progression.serviceDiscount.uses - 1); persistPanel(game); } });
        }
        bind(game) {
            this.game = game; const saved = ns.Save.load(); document.getElementById('continueCareer').hidden = !saved;
            document.getElementById('legacySaveNotice').hidden = !localStorage.getItem('gamehub.miniInvadersV2.save.v1');
            this.components.startWallet.render(saved || ns.State.createState(0), false);
        }
        walletHtml(state, showUnbanked) {
            const wallet = ns.Wallet.ensure(state);
            return ns.Wallet.KEYS.map(key => { const meta = CREDIT_META[key], pending = wallet.unbanked[key]; return `<span class="wallet-credit" title="${key[0].toUpperCase() + key.slice(1)}" style="--credit:${meta.color}"><small>${meta.short}</small><b>${wallet.banked[key].toLocaleString()}</b>${showUnbanked && pending ? `<em>+${pending}</em>` : ''}</span>`; }).join('');
        }
        costHtml(cost) {
            const value = ns.Wallet.normalize(cost);
            return ns.Wallet.KEYS.filter(key => value[key] > 0).map(key => `<span style="color:${CREDIT_META[key].color}">${value[key]} ${CREDIT_META[key].short}</span>`).join(' + ') || '<span>NO COST</span>';
        }
        paidButton(state, action, label, cost, attributes) {
            const affordable = ns.Wallet.canAfford(state, cost), attrs = attributes || '';
            return `<button data-action="${action}" ${attrs} class="${affordable ? '' : 'unaffordable'}" aria-disabled="${affordable ? 'false' : 'true'}">${affordable ? `${label} // ${this.costHtml(cost)}` : `INSUFFICIENT CREDITS<small>${this.costHtml(cost)}</small>`}</button>`;
        }
        notifyShortfall(game, cost) {
            const missing = ns.Wallet.shortfall(game.state, cost);
            const text = ns.Wallet.KEYS.filter(key => missing[key] > 0).map(key => `${missing[key]} ${CREDIT_META[key].short}`).join(' + ');
            game.notify(`INSUFFICIENT CREDITS // NEED ${text || 'ADDITIONAL FUNDS'}`);
        }
        hideStart() { this.start.classList.remove('active'); }
        showMessage(text) { this.message.textContent = text; this.message.classList.remove('show'); void this.message.offsetWidth; this.message.classList.add('show'); }
        togglePanel(game, tab) {
            if (!this.panel.classList.contains('active')) return this.openPanel(game, tab);
            if (game.state.dockedAt) {
                if ((tab || 'pause') === 'pause' || (tab || 'pause') === this.activeTab) return this.openPanel(game, 'station');
                return this.openPanel(game, tab);
            }
            if ((tab || 'pause') === this.activeTab) return this.closePanel();
            return this.openPanel(game, tab);
        }
        openPanel(game, tab) { this.game = game; game.cancelInteraction?.(true); this.activeTab = tab || this.activeTab; game.paused = true; this.panel.classList.add('active'); this.renderPanel(game); }
        closePanel() { if (this.game?.state?.dockedAt) return this.openPanel(this.game, 'station'); this.panel.classList.remove('active'); if (this.game) this.game.paused = false; }
        renderAll(game) { this.game = game; if (this.panel.classList.contains('active')) this.renderPanel(game); this.updateHud(game); }
        updateHud(game) {
            if (!game.state) return; const state = game.state, s = state.ship, stats = ns.Progression.calculateShipStats(state), active = state.contracts.active;
            this.meter('hull', s.hull, stats.hull); this.meter('shield', s.shield + (s.overshield || 0), stats.shield || 1, stats.shield ? null : 'OFFLINE'); this.meter('energy', s.energy, stats.reactor); this.meter('heat', s.heat, 100);
            document.getElementById('regionName').textContent = `GALAXY ${ns.Galaxies.current(state).code} // ${game.region.name}`.toUpperCase(); document.getElementById('pilotLevel').textContent = `LV ${state.pilot.level}`;
            document.getElementById('speedValue').textContent = ns.MathUtil.formatSpeed(Math.hypot(s.vx, s.vy));
            document.getElementById('coordinateValue').textContent = `X ${Math.round(s.x)} // Y ${Math.round(s.y)}`;
            const targets = active ? ns.Contracts.targetsFor(active) : [], nearest = targets.slice().sort((a, b) => distance(s, a) - distance(s, b))[0], targetDistance = nearest ? distance(s, nearest) : 0, destination = nearest?.label || (active ? ns.Contracts.destinationName(active) : '');
            const threat = state.progression?.roamingThreat;
            const objective = ns.LightSpeed.isShifted(game) ? [`LIGHT SPEED // ${game.region.name}`, `VECTOR ${Math.round(s.x)}, ${Math.round(s.y)} KM // ${ns.MathUtil.formatDistance(ns.LightSpeed.ensure(game).distance)} SHIFTED${active && nearest ? ` // ${destination.toUpperCase()} ${ns.MathUtil.formatDistance(targetDistance)}` : ''}`] : active ? [active.name, `${destination} // ${ns.MathUtil.formatDistance(targetDistance)} // ${active.progress}/${active.required} STAGES${targets.length > 1 ? ` // ${targets.length} WAYPOINTS` : ''}`] : threat ? [`OPTIONAL CAPITAL THREAT // ${ns.Data.BOSSES[threat.bossType].name}`, `${game.region.id === threat.region ? ns.MathUtil.formatDistance(distance(s, threat)) : ns.Data.REGIONS.find(region => region.id === threat.region)?.name || 'REMOTE REGION'} // APPROACH TO ENGAGE`] : ['FREE FLIGHT', ns.Unlocks.nextMilestone(state)];
            this.components.objective.render(objective[0], objective[1]); this.components.worldWallet.render(state, true); this.components.menuWallet.render(state, true); this.components.abilities.render(state); this.components.drive.render(game);
            const miniMap = document.getElementById('lightSpeedMap'), shifted = ns.LightSpeed.isShifted(game); miniMap.classList.toggle('active', shifted); if (shifted) miniMap.innerHTML = this.mapHtml(game, true);
            this.updateRefreshButton(state);
        }
        updateRefreshButton(state) {
            const button = this.panelBody.querySelector('[data-action="refresh-contracts"]'); if (!button) return;
            const tutorial = (state.progression?.tutorialStep || 0) < 2, remaining = ns.Contracts.refreshRemaining(state, Date.now());
            if (tutorial) { button.disabled = true; button.textContent = 'TUTORIAL BOARD LOCKED'; return; }
            if (remaining > 0) { const seconds = Math.ceil(remaining / 1000); button.disabled = true; button.textContent = `REFRESH AVAILABLE IN ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }
            else { button.disabled = false; button.textContent = 'REFRESH BOARD'; }
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
            document.getElementById('panelTabs').innerHTML = this.nav(game); this.components.menuWallet.render(game.state, true); this.panelTitle.textContent = this.activeTab.toUpperCase();
            this.headerUndock.hidden = !game.state.dockedAt;
            this.panelHost.render(this.activeTab, game); this.panelBody.classList.toggle('ship-view', this.activeTab === 'ship'); if (this.activeTab === 'ship') this.renderShipPreview(game); if (this.activeTab === 'navigation' && this.navigationView === 'stargate') this.renderStargateCanvas(game);
        }
        render_pause(game) { return `<section class="panel-section hero-panel"><p class="eyebrow">FLIGHT SUSPENDED</p><h2>Wayfarer command</h2><p>${ns.Unlocks.nextMilestone(game.state)}</p><button data-action="close">RETURN TO FLIGHT</button></section>`; }
        repairCost(state) { const stats = ns.Progression.calculateShipStats(state), discount = state.progression.serviceDiscount?.stationId === state.dockedAt && state.progression.serviceDiscount.uses > 0 ? 1 - state.progression.serviceDiscount.value : 1; return { aetherium: Math.ceil(((stats.hull - state.ship.hull) * 1.4 + Object.values(state.ship.moduleDamage).reduce((a, b) => a + b, 0) * 420) * discount) }; }
        chassisCost(state) { return { aetherium: state.ship.chassis.level * 700, helionite: state.ship.chassis.level * 5 }; }
        render_station(game) {
            const state = game.state, station = LANDMARKS.find(l => l.id === state.dockedAt); if (!station) return this.render_pause(game); const repair = this.repairCost(state), chassis = this.chassisCost(state);
            const flair = ns.Data.STATION_FLAIR[station.faction] || ns.Data.STATION_FLAIR.independents, atShipyard = hull => hull.vendors ? hull.vendors.includes(station.id) : station.major && hull.faction === station.faction, hulls = Object.values(HULLS).filter(hull => state.ship.ownedHullIds.includes(hull.id) || atShipyard(hull)), activeHull = ns.Progression.activeHull(state), delta = (value, base) => { const amount = value - base; return amount === 0 ? '—' : `${amount > 0 ? '+' : ''}${Math.round(amount)}`; };
            const shipyard = hulls.map(hull => { const owned = state.ship.ownedHullIds.includes(hull.id), active = state.ship.activeHullId === hull.id, available = ns.Expansion.hullAvailable(state, hull, station), check = owned ? ns.Progression.checkSwitchHull(state, hull.id) : null, points = hull.shape.map(([x, y]) => `${x + 50},${y + 50}`).join(' '); return `<article class="hull-card ${available || owned ? '' : 'locked'}" style="--faction:${FACTIONS[hull.faction].color}"><svg class="hull-silhouette" viewBox="0 0 100 100" aria-label="${hull.name} silhouette"><polygon points="${points}"></polygon></svg><span class="card-kicker">SHIP TIER ${hull.tier} // ${hull.maker.toUpperCase()}</span><h3>${hull.name}</h3><p>${hull.description}</p><div class="module-stats"><span>HULL<b>${hull.hull}<small>${delta(hull.hull, activeHull.hull)}</small></b></span><span>MASS<b>${hull.massLimit}<small>${delta(hull.massLimit, activeHull.massLimit)}</small></b></span><span>SPEED<b>${hull.maxSpeed}<small>${delta(hull.maxSpeed, activeHull.maxSpeed)}</small></b></span><span>CARGO<b>${hull.cargo >= 0 ? '+' : ''}${hull.cargo}<small>${delta(hull.cargo, activeHull.cargo)}</small></b></span></div>${active ? '<button disabled>ACTIVE HULL</button>' : owned ? `<button data-action="switch-hull" data-id="${hull.id}" ${check.ok ? '' : `disabled title="${check.reason.toUpperCase()} LIMIT"`}>${check.ok ? 'SWITCH HULL' : `${check.reason.toUpperCase()} BLOCKED`}</button>` : available ? this.paidButton(state, 'buy-hull', 'PURCHASE HULL', hull.cost, `data-id="${hull.id}"`) : `<button disabled>${ns.Expansion.hullUnlockText(state, hull)}</button>`}</article>`; }).join('');
            return `<div class="station-hero"><p class="eyebrow">${FACTIONS[station.faction].short} FACILITY // ${ns.Expansion.patrolStatus(state, station.faction)} ACCESS</p><h2>${station.name}</h2><p class="station-flair">${flair[Math.abs(station.x + station.y) % flair.length]}</p><small>${FACTIONS[station.faction].description}</small><p>${ns.Unlocks.nextMilestone(state)}</p></div><div class="card-grid three">
                <article><span class="card-kicker">SHIP SERVICE</span><h3>Restore ${ns.Progression.activeHull(state).name}</h3><p>Repair hull and damaged modules.</p>${repair.aetherium <= 0 ? '<button disabled>REPAIRS NOT REQUIRED</button>' : this.paidButton(state, 'repair', 'REPAIR', repair)}</article>
                <article><span class="card-kicker">CHASSIS</span><h3>Frame Tier ${state.ship.chassis.level}</h3><p>Increase integrity, mass, reactor and cargo reserves.</p>${state.ship.chassis.level >= 5 ? '<button disabled>MAXIMUM FRAME</button>' : this.paidButton(state, 'chassis', 'UPGRADE', chassis)}</article>
                <article><span class="card-kicker">RECOVERY</span><h3>${state.ship.insured ? 'Cargo insured' : 'Cargo exposed'}</h3><p>Insurance preserves cargo after destruction.</p>${state.ship.insured ? '<button data-action="insurance">CANCEL POLICY</button>' : this.paidButton(state, 'insurance', 'INSURE', { aetherium: 300 })}</article></div>
                <div class="station-actions">${ns.Unlocks.evaluate(state).tradeTier ? '<button data-action="tab" data-id="trade">OPEN MARKET</button>' : ''}</div>${shipyard ? `<h2 class="section-title">STATION SHIPYARD</h2><div class="card-grid hull-grid">${shipyard}</div>` : ''}`;
        }
        render_contracts(game) {
            const state = game.state, station = LANDMARKS.find(l => l.id === state.dockedAt), active = state.contracts.active;
            if (active) {
                const stages = ns.Contracts.ensureStages(active), stageRows = stages.map(stage => { const destination = ns.Contracts.destinationName(active, stage), remaining = stage.target ? ns.MathUtil.formatDistance(distance(state.ship, stage.target)) : ''; return `<article class="contract-stage ${stage.status}"><span>${stage.status.toUpperCase()}</span><strong>${stage.name || destination}</strong><small>${stage.status === 'active' ? `${destination} // ${remaining}` : destination}</small></article>`; }).join('');
                return `<div class="contract-focus"><p class="eyebrow">ACTIVE CONTRACT // RISK ${active.risk} // WAYPOINT LOCKED</p><h2>${active.name}</h2><p>${active.description}</p><div class="contract-stages">${stageRows}</div><p>${ns.Contracts.objectiveInstruction(active)}</p><div class="reward-line"><span>${active.progress}/${active.required} STAGES</span><strong>${this.costHtml(active.reward)}</strong></div><button class="danger" data-action="abandon">ABANDON CONTRACT</button></div>`;
            }
            if (!station) return '<section class="empty-state"><h2>No active contract</h2><p>Dock to access a local board.</p></section>';
            if (!state.contracts.board.length) ns.Contracts.refreshBoard(state, station);
            const report = state.progression.pendingDebrief ? state.contracts.history.find(item => item.id === state.progression.pendingDebrief) : null, reportHtml = report?.debrief ? `<section class="mission-report"><span class="eyebrow">MISSION DEBRIEF // ${report.issuer.toUpperCase()}</span><h2>${report.name}</h2><p>${report.debrief.outcome}</p><p>${report.debrief.response}</p><div class="reward-line"><span>STANDING +${report.debrief.standing}</span><strong>${this.costHtml(report.debrief.payment)}</strong></div><button data-action="dismiss-debrief">DISMISS REPORT</button></section>` : '';
            return `${reportHtml}<div class="contract-list">${state.contracts.board.map(c => { const expanded = this.focusedContractId === c.id, stages = ns.Contracts.ensureStages(c), brief = c.briefing || ns.Expansion.briefing(c, station), stageRows = stages.map(stage => `<article class="contract-stage ${stage.status}"><span>${stage.status.toUpperCase()}</span><strong>${stage.name || ns.Contracts.destinationName(c, stage)}</strong><small>${ns.Contracts.destinationName(c, stage)}</small></article>`).join(''); return `<section class="contract-entry ${expanded ? 'expanded' : ''}"><article class="contract-card"><div><span class="risk">${c.priority ? 'PRIORITY // ' : ''}RISK ${c.risk}</span><h3>${c.name}</h3><p>${c.description}</p></div><div class="contract-pay"><strong>${this.costHtml(c.reward)}</strong><span>${c.xp} XP</span><button data-action="view-contract" data-id="${c.id}">${expanded ? 'CLOSE' : 'VIEW'}</button></div></article>${expanded ? `<div class="contract-dropdown"><p class="eyebrow">CONTRACT BRIEF // ${brief.contact}</p><h3>${c.name}</h3><p>${brief.situation}</p><blockquote>${brief.line}</blockquote><p>${c.description}</p><div class="contract-stages">${stageRows}</div><p>${ns.Contracts.objectiveInstruction(c)}</p><div class="reward-line"><span>${c.xp} XP // RISK ${c.risk}</span><strong>${this.costHtml(c.reward)}</strong></div><button class="primary" data-action="accept-contract" data-id="${c.id}">ACCEPT CONTRACT</button></div>` : ''}</section>`; }).join('')}</div><button data-action="refresh-contracts">REFRESH BOARD</button>`;
        }
        render_trade(game) {
            const state = game.state, station = LANDMARKS.find(l => l.id === state.dockedAt); if (!station) return '<p>Dock to trade.</p>'; ns.Economy.ensureMarket(state, station); const inventory = ns.Economy.inventoryFor(state, station);
            const goods = Object.values(COMMODITIES).filter(item => ns.Unlocks.commodityVisible(state, item) && (inventory.commodities.includes(item.id) || (state.ship.cargo[item.id] || 0) > 0)); const modules = Object.values(MODULES).filter(m => m.cost && ns.Unlocks.moduleVisible(state, m) && inventory.modules.includes(m.id));
            return `<div class="trade-header"><div><span class="eyebrow">REGIONAL SUPPLY EXCHANGE // TIER ${ns.Unlocks.evaluate(state).tradeTier} // STOCK CYCLE ${inventory.cycle + 1}</span><h2>${station.name}</h2></div></div><div class="market-grid">${goods.map(item => { const owned = state.ship.cargo[item.id] || 0, stocked = inventory.commodities.includes(item.id), cost = { aetherium: ns.Economy.price(state, station, item.id, 'buy') }; return `<article style="--item:${item.color}"><span class="card-kicker">${stocked ? item.legal ? 'REGULATED' : 'RESTRICTED' : 'SELL ORDERS ONLY'}</span><h3>${item.name}</h3><p>Hold ${owned}${stocked ? ` // Buy ${cost.aetherium} AE` : ''} // Sell ${ns.Economy.price(state, station, item.id, 'sell')} AE</p><div>${stocked ? this.paidButton(state, 'buy-cargo', 'BUY 1', cost, `data-id="${item.id}"`) : ''}<button data-action="sell-cargo" data-id="${item.id}" ${owned ? '' : 'disabled'}>SELL 1</button></div></article>`; }).join('')}</div><h2 class="section-title">MODULE MARKET</h2><div class="module-market">${modules.map(m => `<article><div><span>TIER ${m.tier} // ${m.slot.toUpperCase()}</span><strong>${m.name}</strong><small>${m.description}</small><div class="module-stats">${this.moduleStats(m)}</div></div>${state.ship.ownedModules.includes(m.id) ? '<button disabled>OWNED</button>' : this.paidButton(state, 'buy-module', 'PURCHASE', m.cost, `data-id="${m.id}"`)}</article>`).join('') || '<p>NO MODULE STOCK THIS CYCLE</p>'}</div>`;
        }
        moduleStats(module) {
            if (!module) return '<span>NO SYSTEM FITTED</span>';
            const labels = { damage: 'DMG', fireRate: 'CYCLE', energy: 'ENERGY', heat: 'HEAT', reactor: 'CAPACITY', energyRecharge: 'ENERGY / S', thrust: 'THRUST', maxSpeed: 'MAX SPEED', strafe: 'STRAFE', turn: 'TURN', braking: 'BRAKING', shield: 'SHIELD', shieldRecharge: 'RECHARGE', shieldDelay: 'DELAY', hullBonus: 'HULL', armor: 'ARMOR', cargo: 'CARGO', cooling: 'COOLING', repair: 'REPAIR', sensor: 'SENSOR', mass: 'MASS' };
            const values = Object.entries(labels).filter(([key]) => module[key] !== undefined).map(([key, label]) => `<span>${label}<b>${key === 'fireRate' || key === 'shieldDelay' ? `${module[key]}S` : module[key]}</b></span>`);
            if (module.ability) values.push(`<span>COOLDOWN<b>${module.ability.cooldown}S</b></span>`, `<span>ACTIVE ENERGY<b>${module.ability.energy}</b></span>`);
            if (module.id === 'light_drive' || module.lightSpeed) values.push('<span>ACTIVATION COST<b>5 SS + 5 HE</b></span>', '<span>LIGHT SPEED LOAD<b>5 ENERGY + 5 HEAT / S</b></span>');
            if (module.stargateSystem) values.push('<span>HULL CLASS<b>TIER IV ONLY</b></span>', '<span>STARGATE LINK<b>REQUIRED</b></span>');
            return values.join('');
        }
        renderShipPreview(game) {
            const canvas = this.panelBody.querySelector('#shipPreviewCanvas'); if (!canvas) return;
            const preview = new ns.Renderer(canvas); preview.drawShipPreview(game);
        }
        slotLabel(slot) {
            return ns.Registry.get('slot', slot)?.label || slot;
        }
        shipSlotCard(state, slot, id, compatible, equipReason) {
            const module = MODULES[id], docked = Boolean(state.dockedAt);
            return `<article class="ship-system-card"><span class="card-kicker">${this.slotLabel(slot)}</span><h3>${module?.name || 'EMPTY SLOT'}</h3><p>${module?.description || 'Acquire and fit a compatible module to activate this system.'}</p><div class="module-stats">${this.moduleStats(module)}</div><div class="slot-options">${compatible(slot).map(mid => { const check = ns.Progression.checkEquipModule(state, slot, mid), selected = mid === id, blocked = !selected && !check.ok; return `<button class="small ${selected ? 'selected' : ''} ${blocked ? 'unaffordable' : ''}" data-action="equip" data-slot="${slot}" data-id="${mid}" ${!docked ? 'disabled aria-disabled="true"' : blocked ? `aria-disabled="true" data-reason="${check.reason}"` : ''}>${MODULES[mid].name}${blocked ? `<small>${equipReason(check)}</small>` : ''}</button>`; }).join('') || '<span>NO COMPATIBLE MODULES OWNED</span>'}</div></article>`;
        }
        render_ship(game) {
            const state = game.state, stats = ns.Progression.calculateShipStats(state), unlocks = ns.Unlocks.evaluate(state);
            const slots = Object.entries(state.ship.slots).filter(([slot]) => !slot.startsWith('ability') || unlocks.abilitySlots[slot]), coreNames = ['reactor', 'engine', 'defense', 'cargo'];
            const core = slots.filter(([slot]) => coreNames.includes(slot)), equipment = slots.filter(([slot]) => !coreNames.includes(slot));
            const compatible = slot => { const category = ns.Registry.get('slot', slot)?.category || slot; return state.ship.ownedModules.filter(id => MODULES[id]?.slot === category); };
            const equipReason = check => check.reason === 'mass' ? 'OVER MASS LIMIT' : check.reason === 'locked' ? 'SLOT LOCKED' : check.reason === 'hull-tier' ? 'TIER IV HULL ONLY' : 'UNAVAILABLE';
            const selected = core.find(([slot]) => slot === this.selectedShipArea) || core[0], areaButtons = [['cargo', 'Cargo'], ['defense', 'Defense'], ['reactor', 'Reactor'], ['engine', 'Engine']].map(([slot, label]) => `<button class="ship-area-hotspot ${this.selectedShipArea === slot ? 'active' : ''} area-${slot}" data-action="select-ship-area" data-id="${slot}"><span>${label}</span></button>`).join('');
            return `${state.dockedAt ? '' : '<div class="loadout-lock-notice">DOCK AT A STATION TO MODIFY LOADOUT</div>'}<div class="ship-console compact"><section class="ship-portrait"><span class="eyebrow">PERSONAL STARFIGHTER // HULL TIER ${ns.Progression.activeHull(state).tier}</span><h2>${state.ship.name}</h2><div class="ship-preview-stage"><canvas id="shipPreviewCanvas" aria-label="Static preview of the currently fitted Wayfarer"></canvas>${areaButtons}</div><div class="stat-strip"><span>FRAME<b>TIER ${state.ship.chassis.level}</b></span><span>MASS<b>${stats.mass.toFixed(1)}/${stats.massLimit}</b></span><span>HULL<b>${Math.round(stats.hull)}</b></span><span>CARGO<b>${ns.Progression.cargoUsed(state)}/${stats.cargo}</b></span></div></section><section class="ship-panel core-focus"><header><span class="eyebrow">CORE SHIP AREA</span><h2>${this.slotLabel(selected[0]).toUpperCase()}</h2></header>${this.shipSlotCard(state, selected[0], selected[1], compatible, equipReason)}<div class="derived-stats"><span>ENERGY RECHARGE<b>${stats.energyRecharge}/S</b></span><span>COOLING<b>${stats.cooling}/S</b></span><span>THRUST<b>${Math.round(stats.thrust)}</b></span><span>MAX SPEED<b>${Math.round(stats.maxSpeed)}</b></span><span>SHIELD<b>${Math.round(stats.shield)}</b></span><span>ARMOR<b>${Math.round(stats.armor * 100)}%</b></span></div></section><section class="ship-panel weapons compact-mission"><header><span class="eyebrow">WEAPONS AND UTILITY</span><h2>MISSION SYSTEMS</h2></header><div class="mission-system-grid">${equipment.map(([slot, id]) => this.shipSlotCard(state, slot, id, compatible, equipReason)).join('')}</div></section></div>`;
        }
        render_traits(game) {
            const state = game.state, respec = ns.Progression.respecCost(state); return `<div class="trait-header"><div><span class="eyebrow">PILOT DEVELOPMENT</span><h2>${state.pilot.traitPoints} points available</h2></div>${this.paidButton(state, 'respec', 'RETRAIN', respec)}</div><div class="discipline-grid">${['ace', 'engineer', 'pathfinder', 'operator'].map(d => `<section class="discipline ${d}"><header><span>${d.toUpperCase()}</span><b>${ns.Progression.getDisciplineSpend(state, d)} INVESTED</b></header>${TRAITS.filter(t => t.discipline === d).map(t => { const rank = ns.Progression.getTraitRank(state, t.id), achievement = t.capstone ? ({ ace: 'combat_veteran', engineer: 'master_mechanic', pathfinder: 'rim_cartographer', operator: 'career_pilot' }[d]) : '', total = ns.Progression.traitTotalLabel(t, rank); return `<article class="trait ${t.capstone ? 'capstone' : ''} ${rank ? 'owned' : ''}"><div><h3>${t.name}</h3><p>${t.description}</p>${total ? `<small class="trait-total">TOTAL // ${total}</small>` : ''}${t.capstone && !state.pilot.achievements[achievement] ? `<small>ACHIEVEMENT REQUIRED: ${achievement.replace('_', ' ').toUpperCase()}</small>` : ''}</div><button data-action="buy-trait" data-id="${t.id}" ${ns.Progression.canBuyTrait(state, t.id) ? '' : 'disabled'}>${rank}/${t.maxRank}</button></article>`; }).join('')}</section>`).join('')}</div>`;
        }
        render_factions(game) { const state = game.state; return `<div class="faction-grid">${Object.values(FACTIONS).map(f => { const rep = Math.round(state.reputations[f.id]), joined = state.pilot.allegiance === f.id, status = ns.Expansion.patrolStatus(state, f.id), quest = QUESTS[f.id][Math.min(state.quests[f.id], QUESTS[f.id].length - 1)]; return `<article style="--faction:${f.color}"><span class="eyebrow">${f.short} // PATROLS ${status}</span><h2>${f.name}</h2><p>${f.description}</p><div class="reputation"><span style="width:${Math.max(2, (rep + 100) / 2)}%"></span></div><strong>STANDING ${rep >= 0 ? '+' : ''}${rep}</strong><p>${status === 'FRIENDLY' ? 'Patrol support and priority contracts active.' : status === 'NEUTRAL' ? 'Patrols hold fire unless provoked.' : 'Patrols engage on detection.'} ${rep <= -50 ? 'Docking denied.' : 'Docking permitted.'}</p><p class="quest-line">CURRENT ARC // ${quest}</p>${f.id !== 'independents' ? `<button data-action="${joined ? 'leave-faction' : 'join-faction'}" data-id="${f.id}" ${!joined && rep < 15 ? 'disabled' : ''}>${joined ? 'LEAVE FACTION' : 'JOIN AT +15'}</button>` : '<span class="neutral-badge">INDEPENDENT CAREER NETWORK</span>'}</article>`; }).join('')}</div>`; }
        mapHtml(game, compact) {
            const state = game.state, config = game.world?.config || ns.World.createConfig(), bounds = config.bounds, exposure = ns.World.boundaryExposure(state.ship.x, state.ship.y, bounds), worldW = bounds.maxX - bounds.minX, worldH = bounds.maxY - bounds.minY, pctX = x => (x - bounds.minX) / worldW * 100, pctY = y => (y - bounds.minY) / worldH * 100;
            const regions = config.regions.map(region => `<div class="map-region" style="left:${pctX(region.x)}%;top:${pctY(region.y)}%;width:${region.w / worldW * 100}%;height:${region.h / worldH * 100}%;border-color:${region.color}">${!compact && state.visitedRegions.includes(region.id) ? `<span>${region.name}</span>` : ''}</div>`).join('');
            const landmarks = compact ? '' : config.landmarks.map(item => { const known = state.discoveries.includes(item.id), tooltip = known ? `${item.name} // ${ns.MathUtil.formatDistance(distance(state.ship, item))}` : 'UNKNOWN'; return `<i tabindex="0" role="img" aria-label="${tooltip}" data-tooltip="${tooltip}" class="map-point ${known ? 'known' : ''}" style="left:${pctX(item.x)}%;top:${pctY(item.y)}%;background:${FACTIONS[item.faction].color}"></i>`; }).join('');
            const threat = state.progression?.roamingThreat, targets = ns.Contracts.targetsFor(state.contracts.active).map(target => `<i class="map-target" style="left:${pctX(target.x)}%;top:${pctY(target.y)}%"></i>`).join('') + (threat ? `<i class="map-target capital-threat" data-tooltip="CAPITAL THREAT // ${ns.Data.BOSSES[threat.bossType].name.toUpperCase()}" style="left:${pctX(threat.x)}%;top:${pctY(threat.y)}%"></i>` : '');
            const custom = state.customWaypoint ? `<i class="map-custom-target" ${compact ? '' : 'data-action="remove-waypoint" role="button" tabindex="0" aria-label="Remove custom waypoint"'} data-tooltip="CUSTOM WAYPOINT // ${ns.MathUtil.formatDistance(distance(state.ship, state.customWaypoint))}" style="left:${pctX(state.customWaypoint.x)}%;top:${pctY(state.customWaypoint.y)}%"></i>` : '';
            return `<div class="${compact ? 'mini-map-canvas' : `galaxy-map ${exposure.proximity > 0 ? 'nebula-near' : ''}`}">${regions}${landmarks}${targets}${custom}<i class="map-player" data-tooltip="YOU" aria-label="YOU" style="left:${Math.max(0, Math.min(100, pctX(state.ship.x)))}%;top:${Math.max(0, Math.min(100, pctY(state.ship.y)))}%"></i></div>`;
        }
        render_navigation(game) {
            const state = game.state, gate = ns.Galaxies.gateStatus(state), gateAvailable = Boolean(state.dockedAt && gate.ready);
            if (!gateAvailable && this.navigationView === 'stargate') this.navigationView = 'local';
            const tabs = `<nav class="navigation-inner-tabs" aria-label="Navigation views"><button class="${this.navigationView === 'local' ? 'active' : ''}" data-action="navigation-view" data-id="local">LOCAL MAP</button>${gateAvailable ? `<button class="${this.navigationView === 'stargate' ? 'active' : ''}" data-action="navigation-view" data-id="stargate">STATION STARGATE</button>` : ''}</nav>`;
            if (this.navigationView === 'stargate') return `${tabs}${this.stargateHtml(game)}`;
            const config = game.world?.config || ns.World.createConfig(), exposure = ns.World.boundaryExposure(state.ship.x, state.ship.y, config.bounds), hazard = exposure.active ? `NEBULA BREACH // ${ns.MathUtil.formatDistance(exposure.depth)} OUTSIDE SAFE SPACE` : exposure.proximity > 0 ? 'PERIMETER NEBULA IN SENSOR RANGE' : 'SECTOR ENVELOPE NOMINAL';
            const gateRequirements = gateAvailable ? 'ONLINE // STATION STARGATE ROUTES AVAILABLE' : `${gate.highestTierHull ? 'TIER IV HULL READY' : 'TIER IV HULL REQUIRED'}<br>${gate.reactor ? 'GATEHEART CORE READY' : 'GATEHEART CORE REQUIRED'}<br>${gate.engine ? 'ATLAS ENGINE READY' : 'ATLAS ENGINE REQUIRED'}`;
            return `${tabs}<div class="map-layout">${this.mapHtml(game, false)}<aside><span class="eyebrow">LOCAL MAP // GALAXY ${ns.Galaxies.current(state).code}</span><h2>${game.region.name}</h2><p>${ns.Galaxies.current(state).name}<br>GRID ${game.region.grid || game.region.id.toUpperCase()} // ${Math.round(state.ship.x)}, ${Math.round(state.ship.y)} KM<br>${state.discoveries.length} signals logged<br>${state.visitedRegions.length}/${config.regions.length} regions visited</p><h3>PERIMETER STATUS</h3><p class="map-hazard ${exposure.active ? 'active' : ''}">${hazard}</p><h3>STATION STARGATE</h3><p class="stargate-requirements ${gateAvailable ? 'ready' : ''}">${state.dockedAt ? gateRequirements : 'DOCK TO ACCESS STARGATE SYSTEMS'}</p><h3>NEXT LICENSE</h3><p>${ns.Unlocks.nextMilestone(state)}</p></aside></div>`;
        }
        stargateHtml(game) {
            const state = game.state, current = ns.Galaxies.current(state), neighbors = ns.Galaxies.neighbors(current.id);
            let selected = ns.Data.GALAXIES.find(galaxy => galaxy.id === this.selectedGalaxyId);
            if (!selected) { selected = ns.Galaxies.byId(neighbors[0] || current.id); this.selectedGalaxyId = selected.id; }
            const direct = ns.Galaxies.connected(current.id, selected.id), currentNode = selected.id === current.id, blockedByContract = Boolean(state.contracts.active);
            const nodes = ns.Data.GALAXIES.map(galaxy => {
                const classes = [galaxy.id === current.id ? 'current' : '', galaxy.id === selected.id ? 'selected' : '', neighbors.includes(galaxy.id) ? 'reachable' : '', state.visitedGalaxies.includes(galaxy.id) ? 'visited' : ''].filter(Boolean).join(' ');
                return `<button class="stargate-node ${classes}" style="left:${galaxy.x}%;top:${galaxy.y}%;--galaxy:${galaxy.color}" data-action="select-galaxy" data-id="${galaxy.id}" aria-label="Galaxy ${galaxy.code}, ${galaxy.name}"><span>${galaxy.code}</span><small>${galaxy.name}</small></button>`;
            }).join('');
            const route = currentNode ? 'CURRENT GALAXY' : direct ? `DIRECT ROUTE // ${current.code} → ${selected.code}` : 'NO DIRECT ROUTE';
            const disabled = currentNode || !direct || blockedByContract;
            return `<section class="stargate-console"><div class="stargate-map" aria-label="Seven-galaxy station stargate chart"><canvas id="stargateOverlay" aria-hidden="true"></canvas>${nodes}<div class="stargate-map-caption"><span>STATION GATE ARRAY</span><strong>${state.visitedGalaxies.length}/7 GALAXIES LOGGED</strong></div></div><aside class="stargate-route"><span class="eyebrow">SELECTED DESTINATION</span><h2>GALAXY ${selected.code}</h2><h3>${selected.name}</h3><p>${selected.cluster} CLUSTER</p><div class="route-status ${direct && !currentNode ? 'ready' : ''}"><span>ORIGIN</span><strong>GALAXY ${current.code} // ${current.name}</strong><span>ROUTE</span><strong>${route}</strong><span>DRIVE PAIR</span><strong>GATEHEART + ATLAS // SYNCHRONIZED</strong></div>${blockedByContract ? '<p class="stargate-warning">ACTIVE CONTRACT LOCK // COMPLETE OR ABANDON BEFORE INTERGALACTIC TRAVEL</p>' : ''}<button class="primary stargate-confirm" data-action="stargate-travel" ${disabled ? 'disabled' : ''}>STATION STARGATE TRAVEL</button></aside></section>`;
        }
        renderStargateCanvas(game) {
            const canvas = this.panelBody.querySelector('#stargateOverlay'); if (!canvas) return;
            const box = canvas.getBoundingClientRect(), width = box.width || canvas.parentElement?.clientWidth || 960, height = box.height || canvas.parentElement?.clientHeight || 540, scale = window.devicePixelRatio || 1, context = canvas.getContext('2d'); if (!context) return;
            canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale); context.setTransform(scale, 0, 0, scale, 0, 0); context.clearRect(0, 0, width, height);
            const current = game.state.galaxyId, selected = this.selectedGalaxyId, point = id => { const galaxy = ns.Galaxies.byId(id); return { x: galaxy.x / 100 * width, y: galaxy.y / 100 * height }; };
            ns.Data.GALAXY_LINKS.forEach(([from, to]) => { const a = point(from), b = point(to), active = from === current || to === current, chosen = (from === current && to === selected) || (to === current && from === selected); context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.lineWidth = chosen ? 3 : active ? 2 : 1; context.strokeStyle = chosen ? '#b7ffd9' : active ? '#55d7ff99' : '#40606a66'; context.setLineDash(chosen ? [] : [6, 7]); context.stroke(); });
            context.setLineDash([]); ns.Data.GALAXIES.forEach(galaxy => { const p = point(galaxy.id), selectedNode = galaxy.id === selected; context.beginPath(); context.arc(p.x, p.y, selectedNode ? 27 : 22, 0, Math.PI * 2); context.lineWidth = selectedNode ? 2.5 : 1; context.strokeStyle = selectedNode ? '#ffffff' : galaxy.color; context.stroke(); });
        }
        render_settings(game) { const s = game.state.settings; return `<div class="settings-list"><label><span>MASTER VOLUME</span><input id="volumeSetting" type="range" min="0" max="1" step="0.1" value="${s.volume}"></label><label><span>SCREEN SHAKE</span><button data-action="toggle-shake">${s.screenShake ? 'ENABLED' : 'DISABLED'}</button></label><button data-action="save">SAVE CAREER NOW</button><button class="danger" data-action="reset-career">DELETE CAREER</button><div class="controls"><h3>FLIGHT CONTROLS</h3><p>Mouse aim // W/S forward/reverse // A/D strafe</p><p>Mouse 1 weapon one // Mouse 2 weapon two // F interaction cast/dock</p><p>R Light Drive // Space/Q/E/Shift active modules // Tab target</p><p>M map // T traits // C contracts</p></div></div>`; }
        openDefeat(game, result) { this.activeTab = 'defeat'; this.panel.classList.add('active'); this.headerUndock.hidden = true; document.getElementById('panelTabs').innerHTML = ''; this.components.menuWallet.render(game.state, false); this.panelTitle.textContent = 'RECOVERY REPORT'; this.panelBody.innerHTML = `<section class="defeat"><span class="eyebrow">SHIP DISABLED // RESCUE COMPLETE</span><h2>Recovered at ${result.station.name}</h2><p>All unbanked resources were lost.</p><div>${ns.Wallet.KEYS.map(key => `<span>${CREDIT_META[key].short} LOST <b>${result.lostResources[key]}</b></span>`).join('')}<span>CARGO LOST <b>${Object.values(result.lostCargo).reduce((a, b) => a + b, 0)}</b></span></div><button class="primary" data-action="recover">CONTINUE CAREER</button></section>`; }
        destroy() { this.root.removeEventListener('click', this.onClick); this.root.removeEventListener('input', this.onInput); this.root.removeEventListener('contextmenu', this.onContextMenu); this.panelHost.destroy(); Object.values(this.components).forEach(component => component.destroy()); }
        handleClick(event) {
            const button = event.target.closest('[data-action]'), map = event.target.closest('.galaxy-map');
            if (!button && map && this.game?.state) {
                const bounds = this.game.world?.config?.bounds || ns.World.WORLD_BOUNDS, box = map.getBoundingClientRect(), ratioX = (event.clientX - box.left) / box.width, ratioY = (event.clientY - box.top) / box.height;
                if (box.width > 0 && box.height > 0) { this.game.setCustomWaypoint({ x: bounds.minX + ratioX * (bounds.maxX - bounds.minX), y: bounds.minY + ratioY * (bounds.maxY - bounds.minY) }); this.renderPanel(this.game); }
                return;
            }
            if (!button) return; const action = button.dataset.action, id = button.dataset.id, game = this.game, state = game?.state || null, station = state ? LANDMARKS.find(l => l.id === state.dockedAt) : null;
            if (this.actions.dispatch(action, { ui: this, game, state, station, button, id, event })) return;
        }
    }
    ns.UI = UI;
})(window.MiniInvadersV2);
