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
            this.panelTitle = document.getElementById('panelTitle'); this.headerUndock = document.getElementById('headerUndock'); this.message = document.getElementById('message'); this.activeTab = 'station'; this.focusedContractId = null; this.game = null;
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
        renderContext(game) {
            if (ns.LightSpeed.isShifted(game)) { document.getElementById('contextPrompt').textContent = 'R // DECELERATE'; return; }
            if (game.interactionCast) { const cast = game.interactionCast, pct = Math.min(100, cast.progress / cast.duration * 100), remaining = Math.max(0, cast.duration - cast.progress); document.getElementById('contextPrompt').innerHTML = `<span>LINK // ${String(cast.name).toUpperCase()} // ${remaining.toFixed(1)}S</span><i class="interaction-progress"><b style="width:${pct}%"></b></i>`; return; }
            const contact = ns.Contracts.contactsFor(game.state.contracts.active).filter(item => distance(item, game.state.ship) <= 190).sort((a, b) => distance(a, game.state.ship) - distance(b, game.state.ship))[0];
            if (contact && distance(contact, game.state.ship) <= 190) { document.getElementById('contextPrompt').textContent = `F // CONTRACT ${contact.name.toUpperCase()}`; return; }
            const nearby = game.world.nearbyEntities(game.state.ship.x, game.state.ship.y, 190).sort((a, b) => distance(a, game.state.ship) - distance(b, game.state.ship))[0];
            document.getElementById('contextPrompt').textContent = nearby ? `F // ${nearby.kind === 'station' ? 'DOCK' : 'INTERACT'} ${nearby.name || nearby.kind}` : 'TAB // CYCLE TARGET';
        }
        updateHud(game) {
            if (!game.state) return; const state = game.state, s = state.ship, stats = ns.Progression.calculateShipStats(state), active = state.contracts.active;
            this.meter('hull', s.hull, stats.hull); this.meter('shield', s.shield + (s.overshield || 0), stats.shield || 1, stats.shield ? null : 'OFFLINE'); this.meter('energy', s.energy, stats.reactor); this.meter('heat', s.heat, 100);
            document.getElementById('regionName').textContent = game.region.name.toUpperCase(); document.getElementById('pilotLevel').textContent = `LV ${state.pilot.level}`;
            document.getElementById('speedValue').textContent = ns.MathUtil.formatSpeed(Math.hypot(s.vx, s.vy));
            const targets = active ? ns.Contracts.targetsFor(active) : [], nearest = targets.slice().sort((a, b) => distance(s, a) - distance(s, b))[0], targetDistance = nearest ? distance(s, nearest) : 0, destination = nearest?.label || (active ? ns.Contracts.destinationName(active) : '');
            document.getElementById('objective').innerHTML = ns.LightSpeed.isShifted(game) ? `<strong>LIGHT SPEED // ${game.region.name}</strong><span>VECTOR ${Math.round(s.x)}, ${Math.round(s.y)} KM // ${ns.MathUtil.formatDistance(ns.LightSpeed.ensure(game).distance)} SHIFTED${active && nearest ? ` // ${destination.toUpperCase()} ${ns.MathUtil.formatDistance(targetDistance)}` : ''}</span>` : active ? `<strong>${active.name}</strong><span>${destination} // ${ns.MathUtil.formatDistance(targetDistance)} // ${active.progress}/${active.required} STAGES${targets.length > 1 ? ` // ${targets.length} WAYPOINTS` : ''}</span>` : `<strong>FREE FLIGHT</strong><span>${ns.Unlocks.nextMilestone(state)}</span>`;
            document.getElementById('worldWallet').innerHTML = this.walletHtml(state, true); document.getElementById('menuWallet').innerHTML = this.walletHtml(state, true);
            const labels = { abilitySpace: 'SPACE', abilityQ: 'Q', abilityE: 'E', abilityShift: 'SHIFT' };
            document.getElementById('abilityHud').innerHTML = Object.keys(labels).map(slot => { const info = ns.Abilities.slotState(state, slot), max = info.module?.ability?.cooldown || 1, ready = info.cooldown > 0 ? Math.max(0, 100 - info.cooldown / max * 100) : 100; return `<div class="ability-slot ${info.unlocked ? '' : 'locked'} ${info.cooldown > 0 ? 'cooling' : ''}" style="--ready:${ready}%"><span class="ability-key">${labels[slot]}</span><span><b>${info.unlocked ? info.module?.name || 'EMPTY' : 'LOCKED'}</b>${info.cooldown > 0 ? `${info.cooldown.toFixed(1)} SEC` : info.unlocked ? 'READY' : ''}</span></div>`; }).join('');
            const drive = ns.LightSpeed.status(game), driveHud = document.getElementById('lightDriveHud'); driveHud.className = `light-drive-hud ${drive.className}`; driveHud.innerHTML = `<span>R</span><strong>ASTERION</strong><small>${drive.label}</small>`;
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
                <article><span class="card-kicker">SHIP SERVICE</span><h3>Restore Wayfarer</h3><p>Repair hull and damaged modules.</p>${repair.aetherium <= 0 ? '<button disabled>REPAIRS NOT REQUIRED</button>' : this.paidButton(state, 'repair', 'REPAIR', repair)}</article>
                <article><span class="card-kicker">CHASSIS</span><h3>Frame Tier ${state.ship.chassis.level}</h3><p>Increase integrity, mass, reactor and cargo reserves.</p>${state.ship.chassis.level >= 5 ? '<button disabled>MAXIMUM FRAME</button>' : this.paidButton(state, 'chassis', 'UPGRADE', chassis)}</article>
                <article><span class="card-kicker">RECOVERY</span><h3>${state.ship.insured ? 'Cargo insured' : 'Cargo exposed'}</h3><p>Insurance preserves cargo after destruction.</p>${state.ship.insured ? '<button data-action="insurance">CANCEL POLICY</button>' : this.paidButton(state, 'insurance', 'INSURE', { aetherium: 300 })}</article></div>
                <div class="station-actions">${ns.Unlocks.evaluate(state).tradeTier ? '<button data-action="tab" data-id="trade">OPEN MARKET</button>' : ''}</div>`;
        }
        render_contracts(game) {
            const state = game.state, station = LANDMARKS.find(l => l.id === state.dockedAt), active = state.contracts.active;
            if (active) {
                const stages = ns.Contracts.ensureStages(active), stageRows = stages.map(stage => { const destination = ns.Contracts.destinationName(active, stage), remaining = stage.target ? ns.MathUtil.formatDistance(distance(state.ship, stage.target)) : ''; return `<article class="contract-stage ${stage.status}"><span>${stage.status.toUpperCase()}</span><strong>${stage.name || destination}</strong><small>${stage.status === 'active' ? `${destination} // ${remaining}` : destination}</small></article>`; }).join('');
                return `<div class="contract-focus"><p class="eyebrow">ACTIVE CONTRACT // RISK ${active.risk} // WAYPOINT LOCKED</p><h2>${active.name}</h2><p>${active.description}</p><div class="contract-stages">${stageRows}</div><p>${ns.Contracts.objectiveInstruction(active)}</p><div class="reward-line"><span>${active.progress}/${active.required} STAGES</span><strong>${this.costHtml(active.reward)}</strong></div><button class="danger" data-action="abandon">ABANDON CONTRACT</button></div>`;
            }
            if (!station) return '<section class="empty-state"><h2>No active contract</h2><p>Dock to access a local board.</p></section>';
            if (!state.contracts.board.length) ns.Contracts.refreshBoard(state, station);
            return `<div class="contract-list">${state.contracts.board.map(c => { const expanded = this.focusedContractId === c.id, stages = ns.Contracts.ensureStages(c), stageRows = stages.map(stage => `<article class="contract-stage ${stage.status}"><span>${stage.status.toUpperCase()}</span><strong>${stage.name || ns.Contracts.destinationName(c, stage)}</strong><small>${ns.Contracts.destinationName(c, stage)}</small></article>`).join(''); return `<section class="contract-entry ${expanded ? 'expanded' : ''}"><article class="contract-card"><div><span class="risk">RISK ${c.risk}</span><h3>${c.name}</h3><p>${c.description}</p></div><div class="contract-pay"><strong>${this.costHtml(c.reward)}</strong><span>${c.xp} XP</span><button data-action="view-contract" data-id="${c.id}">${expanded ? 'CLOSE' : 'VIEW'}</button></div></article>${expanded ? `<div class="contract-dropdown"><p class="eyebrow">CONTRACT BRIEF // ${c.issuer.toUpperCase()}</p><h3>${c.name}</h3><p>${c.description}</p><div class="contract-stages">${stageRows}</div><p>${ns.Contracts.objectiveInstruction(c)}</p><div class="reward-line"><span>${c.xp} XP // RISK ${c.risk}</span><strong>${this.costHtml(c.reward)}</strong></div><button class="primary" data-action="accept-contract" data-id="${c.id}">ACCEPT CONTRACT</button></div>` : ''}</section>`; }).join('')}</div><button data-action="refresh-contracts">REFRESH BOARD</button>`;
        }
        render_trade(game) {
            const state = game.state, station = LANDMARKS.find(l => l.id === state.dockedAt); if (!station) return '<p>Dock to trade.</p>'; ns.Economy.ensureMarket(state, station); const inventory = ns.Economy.inventoryFor(state, station);
            const goods = Object.values(COMMODITIES).filter(item => ns.Unlocks.commodityVisible(state, item) && (inventory.commodities.includes(item.id) || (state.ship.cargo[item.id] || 0) > 0)); const modules = Object.values(MODULES).filter(m => m.cost && ns.Unlocks.moduleVisible(state, m) && inventory.modules.includes(m.id));
            return `<div class="trade-header"><div><span class="eyebrow">REGIONAL SUPPLY EXCHANGE // TIER ${ns.Unlocks.evaluate(state).tradeTier} // STOCK CYCLE ${inventory.cycle + 1}</span><h2>${station.name}</h2></div></div><div class="market-grid">${goods.map(item => { const owned = state.ship.cargo[item.id] || 0, stocked = inventory.commodities.includes(item.id), cost = { aetherium: ns.Economy.price(state, station, item.id, 'buy') }; return `<article style="--item:${item.color}"><span class="card-kicker">${stocked ? item.legal ? 'REGULATED' : 'RESTRICTED' : 'SELL ORDERS ONLY'}</span><h3>${item.name}</h3><p>Hold ${owned}${stocked ? ` // Buy ${cost.aetherium} AE` : ''} // Sell ${ns.Economy.price(state, station, item.id, 'sell')} AE</p><div>${stocked ? this.paidButton(state, 'buy-cargo', 'BUY 1', cost, `data-id="${item.id}"`) : ''}<button data-action="sell-cargo" data-id="${item.id}" ${owned ? '' : 'disabled'}>SELL 1</button></div></article>`; }).join('')}</div><h2 class="section-title">MODULE MARKET</h2><div class="module-market">${modules.map(m => `<article><div><span>TIER ${m.tier} // ${m.slot.toUpperCase()}</span><strong>${m.name}</strong></div>${state.ship.ownedModules.includes(m.id) ? '<button disabled>OWNED</button>' : this.paidButton(state, 'buy-module', 'PURCHASE', m.cost, `data-id="${m.id}"`)}</article>`).join('') || '<p>NO MODULE STOCK THIS CYCLE</p>'}</div>`;
        }
        moduleStats(module) {
            if (!module) return '<span>NO SYSTEM FITTED</span>';
            const labels = { damage: 'DMG', fireRate: 'CYCLE', energy: 'ENERGY', heat: 'HEAT', reactor: 'CAPACITY', thrust: 'THRUST', shield: 'SHIELD', shieldRecharge: 'RECHARGE', shieldDelay: 'DELAY', cargo: 'CARGO', cooling: 'COOLING', repair: 'REPAIR', sensor: 'SENSOR', mass: 'MASS' };
            const values = Object.entries(labels).filter(([key]) => module[key] !== undefined).map(([key, label]) => `<span>${label}<b>${key === 'fireRate' || key === 'shieldDelay' ? `${module[key]}S` : module[key]}</b></span>`);
            if (module.ability) values.push(`<span>COOLDOWN<b>${module.ability.cooldown}S</b></span>`, `<span>ACTIVE ENERGY<b>${module.ability.energy}</b></span>`);
            return values.join('');
        }
        shipPreviewSvg(state) {
            const slots = state.ship.slots, has = id => Object.values(slots).includes(id), utilities = Object.keys(slots).filter(slot => slot.startsWith('utility') && slots[slot]).length;
            return `<svg viewBox="0 0 320 420" role="img" aria-label="Static profile of the currently fitted Wayfarer"><defs><linearGradient id="shipHull" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#315360"/><stop offset="1" stop-color="#07161d"/></linearGradient><filter id="shipGlow"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g transform="translate(160 205)"><path d="M0-145 42-72 102 40 62 82 25 58 0 110-25 58-62 82-102 40-42-72Z" fill="url(#shipHull)" stroke="#55d7ff" stroke-width="4"/><path d="M0-116 24-53 20 60 0 86-20 60-24-53Z" fill="#102c35" stroke="#477985"/><path d="M0-96 14-58 0-38-14-58Z" fill="#55d7ff" filter="url(#shipGlow)"/>${slots.primary1 ? '<path d="M-58-20V-92" stroke="#ffbd59" stroke-width="7"/><circle cx="-58" cy="-96" r="5" fill="#ffbd59"/>' : ''}${slots.primary2 ? '<path d="M58-20V-92" stroke="#ffbd59" stroke-width="7"/><circle cx="58" cy="-96" r="5" fill="#ffbd59"/>' : ''}${slots.defense ? '<ellipse rx="124" ry="166" fill="none" stroke="#55d7ff" stroke-width="2" stroke-dasharray="10 12" opacity=".7"/>' : ''}${has('cargo_pods') ? '<rect x="-116" y="25" width="27" height="62" fill="#263d43" stroke="#ffbd59"/><rect x="89" y="25" width="27" height="62" fill="#263d43" stroke="#ffbd59"/>' : ''}<g fill="#55f0ad">${Array.from({ length: utilities }, (_, i) => `<circle cx="${-45 + i * 30}" cy="43" r="5"/>`).join('')}</g><path d="M-28 82-17 134M28 82 17 134" stroke="${slots.engine === 'light_drive' ? '#ce75ff' : '#55f0ad'}" stroke-width="12" filter="url(#shipGlow)"/></g><text x="160" y="397" text-anchor="middle" fill="#73909b" font-family="monospace" font-size="11">CURRENT LOADOUT // STATIC PROFILE</text></svg>`;
        }
        shipSlotCard(state, slot, id, compatible, equipReason) {
            const module = MODULES[id];
            return `<article class="ship-system-card"><span class="card-kicker">${slot.replace('ability', '').toUpperCase()}</span><h3>${module?.name || 'EMPTY SLOT'}</h3><p>${module?.description || 'Acquire and fit a compatible module to activate this system.'}</p><div class="module-stats">${this.moduleStats(module)}</div><div class="slot-options">${compatible(slot).map(mid => { const check = ns.Progression.checkEquipModule(state, slot, mid), selected = mid === id; return `<button class="small ${selected ? 'selected' : ''} ${!selected && !check.ok ? 'unaffordable' : ''}" data-action="equip" data-slot="${slot}" data-id="${mid}" ${!selected && !check.ok ? `data-reason="${check.reason}" aria-disabled="true"` : ''}>${MODULES[mid].name}${!selected && !check.ok ? `<small>${equipReason(check)}</small>` : ''}</button>`; }).join('') || '<span>NO COMPATIBLE MODULES OWNED</span>'}</div></article>`;
        }
        render_ship(game) {
            const state = game.state, stats = ns.Progression.calculateShipStats(state), unlocks = ns.Unlocks.evaluate(state);
            const slots = Object.entries(state.ship.slots).filter(([slot]) => !slot.startsWith('ability') || unlocks.abilitySlots[slot]), coreNames = ['reactor', 'engine', 'defense', 'cargo'];
            const core = slots.filter(([slot]) => coreNames.includes(slot)), equipment = slots.filter(([slot]) => !coreNames.includes(slot));
            const compatible = slot => state.ship.ownedModules.filter(id => { const m = MODULES[id]; return slot.startsWith('primary') ? m.slot === 'primary' : slot.startsWith('utility') ? m.slot === 'utility' : slot.startsWith('ability') ? m.slot === 'ability' : m.slot === slot; });
            const equipReason = check => check.reason === 'mass' ? 'OVER MASS LIMIT' : check.reason === 'locked' ? 'SLOT LOCKED' : 'UNAVAILABLE';
            return `<div class="ship-console"><section class="ship-portrait"><span class="eyebrow">PERSONAL STARFIGHTER</span><h2>${state.ship.name}</h2>${this.shipPreviewSvg(state)}<div class="stat-strip"><span>FRAME<b>TIER ${state.ship.chassis.level}</b></span><span>MASS<b>${stats.mass.toFixed(1)}/${stats.massLimit}</b></span><span>HULL<b>${Math.round(stats.hull)}</b></span><span>CARGO<b>${ns.Progression.cargoUsed(state)}/${stats.cargo}</b></span></div></section><section class="ship-panel"><header><span class="eyebrow">CORE SHIP AREAS</span><h2>FLIGHT SYSTEMS</h2></header>${core.map(([slot, id]) => this.shipSlotCard(state, slot, id, compatible, equipReason)).join('')}<div class="derived-stats"><span>ENERGY RECHARGE<b>${stats.energyRecharge}/S</b></span><span>COOLING<b>${stats.cooling}/S</b></span><span>THRUST<b>${Math.round(stats.thrust)}</b></span><span>SHIELD<b>${Math.round(stats.shield)}</b></span></div></section><section class="ship-panel weapons"><header><span class="eyebrow">WEAPONS AND UTILITY</span><h2>MISSION SYSTEMS</h2></header>${equipment.map(([slot, id]) => this.shipSlotCard(state, slot, id, compatible, equipReason)).join('')}</section></div>`;
        }
        render_traits(game) {
            const state = game.state, respec = ns.Progression.respecCost(state); return `<div class="trait-header"><div><span class="eyebrow">PILOT DEVELOPMENT</span><h2>${state.pilot.traitPoints} points available</h2></div>${this.paidButton(state, 'respec', 'RETRAIN', respec)}</div><div class="discipline-grid">${['ace', 'engineer', 'pathfinder', 'operator'].map(d => `<section class="discipline ${d}"><header><span>${d.toUpperCase()}</span><b>${ns.Progression.getDisciplineSpend(state, d)} INVESTED</b></header>${TRAITS.filter(t => t.discipline === d).map(t => { const rank = ns.Progression.getTraitRank(state, t.id), achievement = t.capstone ? ({ ace: 'combat_veteran', engineer: 'master_mechanic', pathfinder: 'rim_cartographer', operator: 'career_pilot' }[d]) : '', total = ns.Progression.traitTotalLabel(t, rank); return `<article class="trait ${t.capstone ? 'capstone' : ''} ${rank ? 'owned' : ''}"><div><h3>${t.name}</h3><p>${t.description}</p>${total ? `<small class="trait-total">TOTAL // ${total}</small>` : ''}${t.capstone && !state.pilot.achievements[achievement] ? `<small>ACHIEVEMENT REQUIRED: ${achievement.replace('_', ' ').toUpperCase()}</small>` : ''}</div><button data-action="buy-trait" data-id="${t.id}" ${ns.Progression.canBuyTrait(state, t.id) ? '' : 'disabled'}>${rank}/${t.maxRank}</button></article>`; }).join('')}</section>`).join('')}</div>`;
        }
        render_factions(game) { const state = game.state; return `<div class="faction-grid">${Object.values(FACTIONS).map(f => { const rep = Math.round(state.reputations[f.id]), joined = state.pilot.allegiance === f.id, quest = QUESTS[f.id][Math.min(state.quests[f.id], QUESTS[f.id].length - 1)]; return `<article style="--faction:${f.color}"><span class="eyebrow">${f.short}</span><h2>${f.name}</h2><p>${f.description}</p><div class="reputation"><span style="width:${Math.max(2, (rep + 100) / 2)}%"></span></div><strong>STANDING ${rep >= 0 ? '+' : ''}${rep}</strong><p class="quest-line">CURRENT ARC // ${quest}</p>${f.id !== 'independents' ? `<button data-action="${joined ? 'leave-faction' : 'join-faction'}" data-id="${f.id}" ${!joined && rep < 15 ? 'disabled' : ''}>${joined ? 'LEAVE FACTION' : 'JOIN AT +15'}</button>` : '<span class="neutral-badge">INDEPENDENT CAREER NETWORK</span>'}</article>`; }).join('')}</div>`; }
        mapHtml(game, compact) {
            const state = game.state, bounds = ns.World.WORLD_BOUNDS, exposure = ns.World.boundaryExposure(state.ship.x, state.ship.y), worldW = bounds.maxX - bounds.minX, worldH = bounds.maxY - bounds.minY, pctX = x => (x - bounds.minX) / worldW * 100, pctY = y => (y - bounds.minY) / worldH * 100;
            const regions = REGIONS.map(region => `<div class="map-region" style="left:${pctX(region.x)}%;top:${pctY(region.y)}%;width:${region.w / worldW * 100}%;height:${region.h / worldH * 100}%;border-color:${region.color}">${!compact && state.visitedRegions.includes(region.id) ? `<span>${region.name}</span>` : ''}</div>`).join('');
            const landmarks = compact ? '' : LANDMARKS.map(item => { const known = state.discoveries.includes(item.id), tooltip = known ? `${item.name} // ${ns.MathUtil.formatDistance(distance(state.ship, item))}` : 'UNKNOWN'; return `<i tabindex="0" role="img" aria-label="${tooltip}" data-tooltip="${tooltip}" class="map-point ${known ? 'known' : ''}" style="left:${pctX(item.x)}%;top:${pctY(item.y)}%;background:${FACTIONS[item.faction].color}"></i>`; }).join('');
            const targets = ns.Contracts.targetsFor(state.contracts.active).map(target => `<i class="map-target" style="left:${pctX(target.x)}%;top:${pctY(target.y)}%"></i>`).join('');
            return `<div class="${compact ? 'mini-map-canvas' : `galaxy-map ${exposure.proximity > 0 ? 'nebula-near' : ''}`}">${regions}${landmarks}${targets}<i class="map-player" data-tooltip="YOU" aria-label="YOU" style="left:${Math.max(0, Math.min(100, pctX(state.ship.x)))}%;top:${Math.max(0, Math.min(100, pctY(state.ship.y)))}%"></i></div>`;
        }
        render_navigation(game) {
            const state = game.state, exposure = ns.World.boundaryExposure(state.ship.x, state.ship.y), hazard = exposure.active ? `NEBULA BREACH // ${ns.MathUtil.formatDistance(exposure.depth)} OUTSIDE SAFE SPACE` : exposure.proximity > 0 ? 'PERIMETER NEBULA IN SENSOR RANGE' : 'SECTOR ENVELOPE NOMINAL';
            return `<div class="map-layout">${this.mapHtml(game, false)}<aside><span class="eyebrow">SEAMLESS CHART</span><h2>${game.region.name}</h2><p>GRID ${game.region.grid} // ${Math.round(state.ship.x)}, ${Math.round(state.ship.y)} KM<br>${state.discoveries.length} signals logged<br>${state.visitedRegions.length}/${REGIONS.length} regions visited</p><h3>PERIMETER STATUS</h3><p class="map-hazard ${exposure.active ? 'active' : ''}">${hazard}</p><h3>NEXT LICENSE</h3><p>${ns.Unlocks.nextMilestone(state)}</p></aside></div>`;
        }
        render_settings(game) { const s = game.state.settings; return `<div class="settings-list"><label><span>MASTER VOLUME</span><input id="volumeSetting" type="range" min="0" max="1" step="0.1" value="${s.volume}"></label><label><span>SCREEN SHAKE</span><button data-action="toggle-shake">${s.screenShake ? 'ENABLED' : 'DISABLED'}</button></label><button data-action="save">SAVE CAREER NOW</button><button class="danger" data-action="reset-career">DELETE CAREER</button><div class="controls"><h3>FLIGHT CONTROLS</h3><p>Mouse aim // W/S forward/reverse // A/D strafe</p><p>Mouse 1 weapon one // Mouse 2 weapon two // F interaction cast/dock</p><p>R Light Drive // Space/Q/E/Shift active modules // Tab target</p><p>M map // T traits // C contracts // Esc systems</p></div></div>`; }
        openDefeat(game, result) { this.activeTab = 'defeat'; this.panel.classList.add('active'); this.headerUndock.hidden = true; document.getElementById('panelTabs').innerHTML = ''; document.getElementById('menuWallet').innerHTML = this.walletHtml(game.state, false); this.panelTitle.textContent = 'RECOVERY REPORT'; this.panelBody.innerHTML = `<section class="defeat"><span class="eyebrow">SHIP DISABLED // RESCUE COMPLETE</span><h2>Recovered at ${result.station.name}</h2><p>All unbanked resources were lost.</p><div>${ns.Wallet.KEYS.map(key => `<span>${CREDIT_META[key].short} LOST <b>${result.lostResources[key]}</b></span>`).join('')}<span>CARGO LOST <b>${Object.values(result.lostCargo).reduce((a, b) => a + b, 0)}</b></span></div><button class="primary" data-action="recover">CONTINUE CAREER</button></section>`; }
        handleClick(event) {
            const button = event.target.closest('[data-action]'); if (!button) return; const action = button.dataset.action, id = button.dataset.id, game = this.game;
            if (action === 'new') return game.newCareer(); if (action === 'continue') return game.continueCareer(); if (!game?.state) return;
            const state = game.state, station = LANDMARKS.find(l => l.id === state.dockedAt);
            if (action === 'tab') { this.activeTab = id; this.renderPanel(game); }
            else if (action === 'close') this.closePanel(); else if (action === 'undock') game.undock();
            else if (action === 'view-contract') { this.focusedContractId = this.focusedContractId === id ? null : id; this.renderPanel(game); }
            else if (action === 'accept-contract' && ns.Contracts.accept(state, id)) { this.focusedContractId = null; game.save(); this.renderPanel(game); game.notify('CONTRACT ACCEPTED // WAYPOINT LOCKED'); }
            else if (action === 'refresh-contracts' && station) { const result = ns.Contracts.manualRefresh(state, station, Date.now()); if (result.ok) { game.save(); this.renderPanel(game); } else game.notify(result.tutorial ? 'TUTORIAL BOARD CANNOT BE REFRESHED' : `BOARD REFRESH COOLING // ${Math.ceil(result.remaining / 1000)} SEC`); }
            else if (action === 'abandon' && ns.Contracts.abandon(state)) { game.save(); this.renderPanel(game); }
            else if (action === 'buy-cargo') { const cost = { aetherium: ns.Economy.price(state, station, id, 'buy') }; if (!ns.Wallet.canAfford(state, cost)) this.notifyShortfall(game, cost); else if (ns.Economy.trade(state, station, id, 1)) { game.save(); this.renderPanel(game); } }
            else if (action === 'sell-cargo' && ns.Economy.trade(state, station, id, -1)) { game.save(); this.renderPanel(game); }
            else if (action === 'buy-module') { const cost = MODULES[id]?.cost || {}; if (!ns.Wallet.canAfford(state, cost)) this.notifyShortfall(game, cost); else if (ns.Economy.buyModule(state, id, station)) { game.save(); this.renderPanel(game); } }
            else if (action === 'equip') {
                const slot = button.dataset.slot, check = ns.Progression.checkEquipModule(state, slot, id);
                if (!check.ok) {
                    if (check.reason === 'mass') game.notify('MODULE FIT REJECTED // MASS LIMIT EXCEEDED');
                    else if (check.reason === 'locked') game.notify('MODULE FIT REJECTED // SLOT NOT YET LICENSED');
                    return;
                }
                if (ns.Progression.equipModule(state, slot, id)) { game.save(); this.renderPanel(game); }
            }
            else if (action === 'buy-trait' && ns.Progression.buyTrait(state, id)) { game.save(); this.renderPanel(game); }
            else if (action === 'respec' && station?.major) { const cost = ns.Progression.respecCost(state); if (!ns.Wallet.canAfford(state, cost)) this.notifyShortfall(game, cost); else if (ns.Progression.respec(state)) { game.save(); this.renderPanel(game); } }
            else if (action === 'join-faction' && ns.Contracts.joinFaction(state, id)) { game.save(); this.renderPanel(game); }
            else if (action === 'leave-faction' && ns.Contracts.leaveFaction(state)) { game.save(); this.renderPanel(game); }
            else if (action === 'repair') { const cost = this.repairCost(state); if (!ns.Wallet.canAfford(state, cost)) this.notifyShortfall(game, cost); else if (ns.Combat.repairAll(state)) { game.save(); this.renderPanel(game); } }
            else if (action === 'chassis') { const cost = this.chassisCost(state); if (!ns.Wallet.canAfford(state, cost)) this.notifyShortfall(game, cost); else if (state.ship.chassis.level < 5 && ns.Wallet.debit(state, cost)) { state.ship.chassis.level++; state.ship.chassis.integrity += 35; state.ship.chassis.massLimit += 10; state.ship.chassis.reactorBonus += 8; state.ship.chassis.cargoBonus += 3; state.ship.hull = state.ship.chassis.integrity; game.save(); this.renderPanel(game); } }
            else if (action === 'insurance') { const cost = { aetherium: 300 }; if (state.ship.insured) state.ship.insured = false; else if (!ns.Wallet.canAfford(state, cost)) return this.notifyShortfall(game, cost); else if (ns.Wallet.debit(state, cost)) state.ship.insured = true; game.save(); this.renderPanel(game); }
            else if (action === 'toggle-shake') { state.settings.screenShake = !state.settings.screenShake; game.save(); this.renderPanel(game); }
            else if (action === 'save') game.save('CAREER SAVED');
            else if (action === 'reset-career') { ns.Save.remove(); location.reload(); }
            else if (action === 'recover') { this.activeTab = 'station'; this.renderPanel(game); }
        }
    }
    ns.UI = UI;
})(window.MiniInvadersV2);
