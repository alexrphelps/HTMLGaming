(function (ns) {
    const { FACTIONS, REGIONS, LANDMARKS, COMMODITIES, MODULES, TRAITS, QUESTS, HULLS } = ns.Data;
    const { distance } = ns.MathUtil;
    const CREDIT_META = {
        aetherium: { short: 'AE', color: '#55f0ad' },
        sunshards: { short: 'SS', color: '#ffbd59' },
        helionite: { short: 'HE', color: '#55d7ff' }
    };
    const DEFEAT_FLAVOR = [
        'You became a cautionary footnote in a very small manual.',
        'The reactor filed a brief but persuasive resignation.',
        'Your hull attempted diplomacy with physics. Physics declined.',
        'A lonely beacon now marks an ambitious misunderstanding.',
        'The pirates have named a drink after your trajectory.',
        'Your ship has been depreciated to zero with impressive speed.',
        'The good news: your heat problem is solved.',
        'Local insurance adjusters applauded, then looked worried.',
        'Your navigation computer has requested a quieter pilot.',
        'A textbook example of why buttons have labels.',
        'The void accepted your proposal and kept the deposit.',
        'Your reactor briefly outperformed the sun. Very briefly.',
        'The flight academy has added a new red diagram.',
        'Mission control called it bold, then changed the subject.',
        'Your cargo is now participating in local astronomy.',
        'The station beacon sighed in several official languages.',
        'Your warranty escaped moments before the explosion.',
        'Space remains unbeaten, smug, and largely empty.',
        'A committee will mispronounce your name at noon.',
        'Your final vector has been classified as decorative.'
    ];
    class UI {
        constructor() {
            this.start = document.getElementById('startScreen'); this.panel = document.getElementById('cockpitPanel'); this.panelBody = document.getElementById('panelBody');
            this.panelTitle = document.getElementById('panelTitle'); this.headerUndock = document.getElementById('headerUndock'); this.message = document.getElementById('message'); this.recentLogs = []; this.activeTab = 'station'; this.focusedContractId = null; this.selectedShipArea = 'engine'; this.shipMissionTab = 'weapons'; this.navigationView = 'local'; this.selectedGalaxyId = null; this.game = null; this.stargateCooldownTicker = 0;
            this.recentlyBoughtModules = new Set();
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
            this.actions.register('tab', ({ game, id }) => { if (id !== 'trade') this.recentlyBoughtModules.clear(); this.activeTab = id; this.renderPanel(game); });
            this.actions.register('navigation-view', ({ game, id }) => { if (id === 'stargate' && !(game.state.dockedAt && ns.Galaxies.gateStatus(game.state).ready)) return; this.navigationView = id === 'stargate' ? 'stargate' : 'local'; if (this.navigationView === 'stargate') this.selectedGalaxyId = game.state.galaxyId; this.renderPanel(game); });
            this.actions.register('select-galaxy', ({ game, id }) => { if (ns.Data.GALAXIES.some(galaxy => galaxy.id === id)) { this.selectedGalaxyId = id; this.renderPanel(game); } });
            this.actions.register('stargate-travel', ({ game }) => game.stargateTravel(this.selectedGalaxyId));
            this.actions.register('choose-invasion-side', ({ game, id }) => ns.StationWar.chooseSide(game, id));
            this.actions.register('select-ship-area', ({ game, id }) => { if (ns.Registry.get('slot', id)?.group === 'core') { this.selectedShipArea = id; this.renderPanel(game); } });
            this.actions.register('ship-mission-tab', ({ game, id }) => { this.shipMissionTab = id === 'utility' ? 'utility' : 'weapons'; this.renderPanel(game); });
            this.actions.register('remove-waypoint', ({ game }) => { game.clearCustomWaypoint('CUSTOM WAYPOINT REMOVED'); this.renderPanel(game); });
            this.actions.register('equip', ({ game, state, button, id }) => { const outcome = ns.Commands.equip(state, button.dataset.slot, id); if (outcome.ok) { game.save(); this.renderPanel(game); } else { const reason = { 'dock-required': 'DOCK AT A STATION', mass: 'MASS LIMIT EXCEEDED', locked: 'SLOT NOT YET LICENSED', 'hull-tier': 'TIER IV+ HULL REQUIRED' }[outcome.reason] || String(outcome.reason).replace('-', ' ').toUpperCase(); game.notify(`MODULE FIT REJECTED // ${reason}`); } });
            this.actions.register('chassis', ({ game, state }) => { const outcome = ns.Commands.upgradeChassis(state); if (outcome.ok) { game.save(); this.renderPanel(game); } else if (outcome.changes.cost) this.notifyShortfall(game, outcome.changes.cost); });
            this.actions.register('insurance', ({ game, state }) => { const outcome = ns.Commands.toggleInsurance(state); if (outcome.ok) { game.save(); this.renderPanel(game); } else if (outcome.changes.cost) this.notifyShortfall(game, outcome.changes.cost); });
            this.actions.register('toggle-shake', ({ game, state }) => { state.settings.screenShake = !state.settings.screenShake; game.save(); this.renderPanel(game); });
            this.actions.register('save', ({ game }) => game.save('CAREER SAVED')).register('reset-career', () => { ns.Save.remove(); location.reload(); });
            this.actions.register('recover', ({ game }) => { game.deathCinematic = null; this.activeTab = 'station'; this.renderPanel(game); });
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
            this.actions.register('buy-module', ({ game, state, station, id }) => { const cost = MODULES[id]?.cost || {}; if (!ns.Wallet.canAfford(state, cost)) this.notifyShortfall(game, cost); else if (ns.Economy.buyModule(state, id, station)) { this.recentlyBoughtModules.add(id); persistPanel(game); } });
            this.actions.register('sell-module', ({ game, state, station, id }) => { const outcome = ns.Economy.sellModule(state, id, station); if (outcome.ok) { persistPanel(game); game.notify(`${MODULES[id].name.toUpperCase()} SOLD // ${this.costHtml(outcome.value).replace(/<[^>]+>/g, '')}`); } else { const reason = { equipped: 'UNEQUIP MODULE BEFORE SALE', starter: 'STARTER AND TUTORIAL MODULES CANNOT BE SOLD', unowned: 'MODULE NOT OWNED' }[outcome.reason] || 'SALE BLOCKED'; game.notify(`MODULE SALE BLOCKED // ${reason}`); } });
            this.actions.register('buy-trait', ({ game, state, id }) => { if (ns.Progression.buyTrait(state, id)) persistPanel(game); });
            this.actions.register('respec', ({ game, state, station }) => { if (!station?.major) return; const cost = ns.Progression.respecCost(state); if (!ns.Wallet.canAfford(state, cost)) this.notifyShortfall(game, cost); else if (ns.Progression.respec(state)) persistPanel(game); });
            this.actions.register('join-faction', ({ game, state, id }) => { const outcome = ns.Commands.joinFaction(state, id); if (outcome.ok) persistPanel(game); });
            this.actions.register('leave-faction', ({ game, state }) => { const outcome = ns.Commands.leaveFaction(state); if (outcome.ok) persistPanel(game); });
            this.actions.register('repair', ({ game, state }) => { const cost = this.repairCost(state); if (!ns.Wallet.canAfford(state, cost)) this.notifyShortfall(game, cost); else if (ns.Combat.repairAll(state, cost)) { if (state.progression.serviceDiscount?.stationId === state.dockedAt) state.progression.serviceDiscount.uses = Math.max(0, state.progression.serviceDiscount.uses - 1); persistPanel(game); } });
        }
        syncStargateCooldownTicker(game) {
            const shouldTick = Boolean(game?.state && this.panel.classList.contains('active') && this.activeTab === 'navigation' && this.navigationView === 'stargate' && Math.max(0, ns.Galaxies.STARGATE_COOLDOWN_MS - (Date.now() - game.state.lastStargateTravelAt)) > 0);
            if (shouldTick && !this.stargateCooldownTicker) {
                this.stargateCooldownTicker = setInterval(() => {
                    if (!this.game?.state) return this.clearStargateCooldownTicker();
                    if (!this.panel.classList.contains('active') || this.activeTab !== 'navigation' || this.navigationView !== 'stargate') return this.clearStargateCooldownTicker();
                    this.updateStargateCooldown(this.game);
                }, 250);
            } else if (!shouldTick && this.stargateCooldownTicker) this.clearStargateCooldownTicker();
        }
        updateStargateCooldown(game) {
            const button = this.panelBody.querySelector('.stargate-confirm'); if (!button) return this.clearStargateCooldownTicker();
            const current = ns.Galaxies.current(game.state), selected = ns.Data.GALAXIES.find(galaxy => galaxy.id === this.selectedGalaxyId) || current;
            const unavailable = selected.id === current.id || !ns.Galaxies.connected(current.id, selected.id) || Boolean(game.state.contracts.active);
            const remaining = Math.max(0, ns.Galaxies.STARGATE_COOLDOWN_MS - (Date.now() - game.state.lastStargateTravelAt)), seconds = Math.ceil(remaining / 1000);
            const warning = this.panelBody.querySelector('.stargate-warning.cooldown'), route = this.panelBody.querySelector('.route-status');
            if (remaining > 0) {
                if (warning) warning.textContent = `GATE ARRAY COOLDOWN // ${seconds} SEC`;
                button.textContent = `COOLDOWN ${seconds}S`; button.classList.add('cooldown'); button.disabled = unavailable; button.setAttribute('aria-disabled', 'true'); route?.classList.remove('ready');
                return;
            }
            warning?.remove(); button.textContent = 'STATION STARGATE TRAVEL'; button.classList.remove('cooldown'); button.disabled = unavailable; button.setAttribute('aria-disabled', String(unavailable)); route?.classList.toggle('ready', !unavailable); this.clearStargateCooldownTicker();
        }
        clearStargateCooldownTicker() {
            if (!this.stargateCooldownTicker) return;
            clearInterval(this.stargateCooldownTicker); this.stargateCooldownTicker = 0;
        }
        bind(game) {
            this.game = game; const saved = ns.Save.load(); document.getElementById('continueCareer').hidden = !saved;
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
        contractTypeChip(contract) {
            const category = ns.Contracts.CONTRACT_CATEGORIES[contract.type] || { label: 'Contract', icon: 'JOB' };
            const label = contract.categoryLabel || category.label, icon = contract.categoryIcon || category.icon;
            return `<span class="contract-type-chip" data-type="${label.toLowerCase()}"><b>${icon}</b>${label.toUpperCase()}</span>`;
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
        defeatFlavorLine(state, result) {
            const seed = Math.abs(Math.floor((state?.worldSeed || 0) + (state?.stats?.deaths || 0) * 17 + (state?.playTime || 0) + (result?.station?.x || 0) + (result?.station?.y || 0)));
            return DEFEAT_FLAVOR[seed % DEFEAT_FLAVOR.length];
        }
        hideStart() { this.start.classList.remove('active'); }
        showMessage(text) {
            const entry = String(text || '').trim(); if (!entry) return;
            this.recentLogs.unshift(entry); this.recentLogs = this.recentLogs.slice(0, 5);
            this.message.replaceChildren(...this.recentLogs.map((line, index) => {
                const item = document.createElement('span'), convoyWarning = /^(CONVOY (?:HULL CRITICAL|SEPARATION WARNING)|ESCORT LINK CRITICAL)/.test(line);
                item.className = `system-log-entry ${index === 0 ? 'latest' : ''} ${convoyWarning ? 'convoy-warning' : ''}`.trim();
                item.textContent = line;
                return item;
            }));
            this.message.classList.toggle('convoy-warning', /^(CONVOY (?:HULL CRITICAL|SEPARATION WARNING)|ESCORT LINK CRITICAL)/.test(entry));
            this.message.classList.add('show');
        }
        playStargateTransition(midpoint, complete) {
            const overlay = document.getElementById('stargateTransition'); if (!overlay) { midpoint(); complete(); return; }
            overlay.classList.remove('active'); void overlay.offsetWidth; overlay.classList.add('active'); overlay.setAttribute('aria-hidden', 'false');
            window.setTimeout(midpoint, 1500); window.setTimeout(() => { overlay.classList.remove('active'); overlay.setAttribute('aria-hidden', 'true'); complete(); }, 3000);
        }
        openInvasionPrompt(game, battle) {
            this.game = game; this.activeTab = 'invasion'; this.panel.classList.add('active'); this.headerUndock.hidden = true; document.getElementById('panelTabs').innerHTML = ''; this.components.menuWallet.render(game.state, true); this.panelTitle.textContent = 'INVASION CHANNEL';
            const defender = FACTIONS[battle.defenderFaction] || FACTIONS.independents, invader = FACTIONS[battle.invaderFaction] || FACTIONS.independents;
            this.panelBody.innerHTML = `<section class="invasion-prompt" style="--defender:${defender.color};--invader:${invader.color}"><span class="eyebrow">STATION INVASION // ${battle.stationName.toUpperCase()}</span><h2>Faction channels are open</h2><p class="station-flair">${defender.name} control reports boarding vectors near the outer gantries. ${invader.name} strike leaders are broadcasting capture terms across open band.</p><div class="invasion-channel-grid"><article style="--faction:${defender.color}"><span class="eyebrow">${defender.short} DEFENSE CHANNEL</span><h3>${defender.name}</h3><p>Hold the station line. Keep our transponders green and your guns off our ships.</p><button class="primary" data-action="choose-invasion-side" data-id="${battle.defenderFaction}">HELP ${defender.short}</button></article><article style="--faction:${invader.color}"><span class="eyebrow">${invader.short} INVASION CHANNEL</span><h3>${invader.name}</h3><p>Break the defenders. We mark your fire as friendly if you fly under our channel.</p><button class="primary" data-action="choose-invasion-side" data-id="${battle.invaderFaction}">HELP ${invader.short}</button></article></div><button data-action="choose-invasion-side" data-id="neutral">STAY OUT</button></section>`;
        }
        togglePanel(game, tab) {
            if (!this.panel.classList.contains('active')) return this.openPanel(game, tab);
            if (game.state.dockedAt) {
                if ((tab || 'pause') === 'pause' || (tab || 'pause') === this.activeTab) return this.openPanel(game, 'station');
                return this.openPanel(game, tab);
            }
            if ((tab || 'pause') === this.activeTab) return this.closePanel();
            return this.openPanel(game, tab);
        }
        openPanel(game, tab) { this.game = game; game.cancelInteraction?.(true); const nextTab = tab || this.activeTab; if (nextTab !== 'trade') this.recentlyBoughtModules.clear(); this.activeTab = nextTab; if (nextTab === 'navigation' && this.navigationView === 'stargate') this.selectedGalaxyId = game.state.galaxyId; game.paused = true; this.panel.classList.add('active'); this.renderPanel(game); }
        closePanel() { this.recentlyBoughtModules.clear(); if (this.game?.state?.dockedAt) return this.openPanel(this.game, 'station'); this.clearStargateCooldownTicker(); this.panel.classList.remove('active'); if (this.game) this.game.paused = false; }
        renderAll(game) { this.game = game; if (this.panel.classList.contains('active')) this.renderPanel(game); this.updateHud(game); }
        updateHud(game) {
            if (!game.state) return; const state = game.state, s = state.ship, stats = ns.Progression.calculateShipStats(state), active = state.contracts.active;
            this.meter('hull', s.hull, stats.hull); this.meter('shield', s.shield + (s.overshield || 0), stats.shield || 1, stats.shield ? null : 'OFFLINE'); this.meter('energy', s.energy, stats.reactor); this.meter('heat', s.heat, 100);
            document.getElementById('regionName').textContent = `GALAXY ${ns.Galaxies.current(state).code} // ${game.region.name}`.toUpperCase(); document.getElementById('pilotLevel').textContent = `LV ${state.pilot.level}`;
            document.getElementById('speedValue').textContent = ns.MathUtil.formatSpeed(Math.hypot(s.vx, s.vy));
            document.getElementById('coordinateValue').textContent = `X ${Math.round(s.x)} // Y ${Math.round(s.y)}`;
            const targets = active ? ns.Contracts.targetsFor(active, state) : [], validTargets = targets.filter(target => !target.denied), nearest = (validTargets.length ? validTargets : targets).slice().sort((a, b) => distance(s, a) - distance(s, b))[0], targetDistance = nearest ? distance(s, nearest) : 0, destination = nearest?.label || (active ? ns.Contracts.destinationName(active) : '');
            const threat = state.progression?.roamingThreat;
            const timerText = active?.timer ? `${active.timer.hard ? 'HARD ' : ''}DEADLINE ${active.timer.started ? this.formatTimer(active.timer.remaining) : `${this.formatTimer(active.timer.duration)} ON UNDOCK`}${active.timer.missed ? ' MISSED' : ''}` : '', dockingWarning = ns.Contracts.dockingWarning(state), escort = active?.escort?.convoy, escortText = escort ? `CONVOY ${Math.ceil(escort.hull / escort.maxHull * 100)}% // SEPARATION ${Math.round(distance(s, escort))} KM` : '';
            const objective = ns.LightSpeed.isShifted(game) ? [`LIGHT SPEED // ${game.region.name}`, `VECTOR ${Math.round(s.x)}, ${Math.round(s.y)} KM // ${ns.MathUtil.formatDistance(ns.LightSpeed.ensure(game).distance)} SHIFTED${active && nearest ? ` // ${destination.toUpperCase()} ${ns.MathUtil.formatDistance(targetDistance)}` : ''}`] : active ? [active.name, [dockingWarning?.message, `${destination} // ${ns.MathUtil.formatDistance(targetDistance)} // ${active.progress}/${active.required} STAGES${targets.length > 1 ? ` // ${targets.length} WAYPOINTS` : ''}`, timerText, escortText].filter(Boolean).join(' // ')] : threat ? [`OPTIONAL CAPITAL THREAT // ${ns.Data.BOSSES[threat.bossType].name}`, `${game.region.id === threat.region ? ns.MathUtil.formatDistance(distance(s, threat)) : ns.Data.REGIONS.find(region => region.id === threat.region)?.name || 'REMOTE REGION'} // APPROACH TO ENGAGE`] : ['FREE FLIGHT', ns.Unlocks.nextMilestone(state)];
            const convoyWarning = Boolean(escort && (escort.hull / escort.maxHull <= ns.Contracts.ESCORT_CONFIG.lowHullRatio || distance(s, escort) > ns.Contracts.ESCORT_CONFIG.warningRange || active.escort.grace < 4));
            this.components.objective.render(objective[0], objective[1], convoyWarning); this.components.worldWallet.render(state, true); this.components.menuWallet.render(state, true); this.components.abilities.render(state); this.components.drive.render(game);
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
        formatTimer(seconds) { const value = Math.max(0, Math.ceil(Number(seconds) || 0)); return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`; }
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
            this.panelHost.render(this.activeTab, game); this.panelBody.classList.toggle('ship-view', this.activeTab === 'ship'); this.panelBody.classList.toggle('contracts-view', this.activeTab === 'contracts'); this.panelBody.classList.toggle('navigation-view', this.activeTab === 'navigation'); this.panelBody.classList.toggle('navigation-local-view', this.activeTab === 'navigation' && this.navigationView === 'local'); if (this.activeTab === 'ship') this.renderShipPreview(game); if (this.activeTab === 'navigation' && this.navigationView === 'stargate') this.renderStargateCanvas(game);
            this.syncStargateCooldownTicker(game);
        }
        stationById(state, id) { return ns.Galaxies.availableLandmarks(state).find(item => item.type === 'station' && item.id === id) || null; }
        currentStation(state) { return state?.dockedAt ? this.stationById(state, state.dockedAt) : null; }
        factionBadge(factionId, label) {
            const faction = FACTIONS[factionId] || FACTIONS.independents;
            return `<span class="faction-badge" style="--faction:${faction.color}"><i></i>${label || faction.short}</span>`;
        }
        contractStageFaction(state, contract, stage) {
            if (stage.event === 'dock' && stage.destination) {
                const destination = this.stationById(state, stage.destination);
                if (destination?.faction) return destination.faction;
            }
            return contract.issuer;
        }
        contractAccessSummary(state, access) {
            const blocked = (access?.denied || []).map(id => this.stationById(state, id)).filter(Boolean);
            if (!blocked.length) return { button: 'ACCEPT CONTRACT', warning: '' };
            if (blocked.length === 1) {
                const station = blocked[0], faction = FACTIONS[station.faction] || FACTIONS.independents;
                return {
                    button: `${station.name.toUpperCase()} LOCKED`,
                    warning: `DOCKING DENIED AT ${station.name.toUpperCase()} // ${faction.short} STANDING BELOW -50`
                };
            }
            const names = blocked.map(station => station.name.toUpperCase()).join(' / ');
            return {
                button: `${blocked.length} DESTINATIONS LOCKED`,
                warning: `DOCKING DENIED AT ${names} // RESTORE STANDING OR USE AN AVAILABLE FACTION`
            };
        }
        render_pause(game) { return `<section class="panel-section hero-panel"><p class="eyebrow">FLIGHT SUSPENDED</p><h2>Wayfarer command</h2><p>${ns.Unlocks.nextMilestone(game.state)}</p><button data-action="close">RETURN TO FLIGHT</button></section>`; }
        repairCost(state) { const stats = ns.Progression.calculateShipStats(state), discount = state.progression.serviceDiscount?.stationId === state.dockedAt && state.progression.serviceDiscount.uses > 0 ? 1 - state.progression.serviceDiscount.value : 1; return { aetherium: Math.ceil(((stats.hull - state.ship.hull) * 1.4 + Object.values(state.ship.moduleDamage).reduce((a, b) => a + b, 0) * 420) * discount) }; }
        chassisCost(state) { return { aetherium: state.ship.chassis.level * 700, helionite: state.ship.chassis.level * 5 }; }
        render_station(game) {
            const state = game.state, station = this.currentStation(state); if (!station) return this.render_pause(game); const repair = this.repairCost(state), chassis = this.chassisCost(state), details = ns.Expansion.stationDetails(station);
            const flair = ns.Data.STATION_FLAIR[station.faction] || ns.Data.STATION_FLAIR.independents, atShipyard = hull => hull.vendors ? hull.vendors.includes(station.id) : station.major && hull.faction === station.faction, hulls = Object.values(HULLS).filter(hull => state.ship.ownedHullIds.includes(hull.id) || atShipyard(hull)), activeHull = ns.Progression.activeHull(state), delta = (value, base) => { const amount = value - base; return amount === 0 ? '—' : `${amount > 0 ? '+' : ''}${Math.round(amount)}`; };
            const control = station.control, controlHtml = control ? `<p class="station-control-status">${this.factionBadge(control.previousFaction, 'FORMER')} TRANSFERRED TO ${this.factionBadge(station.faction, 'CURRENT')} // ${String(control.status || 'controlled').toUpperCase()}</p>` : '';
            const issuers = ns.Contracts.stationIssuers(state, station), issuerHtml = issuers.map(id => this.factionBadge(id)).join('');
            const shipyard = hulls.map(hull => { const owned = state.ship.ownedHullIds.includes(hull.id), active = state.ship.activeHullId === hull.id, available = ns.Expansion.hullAvailable(state, hull, station), check = owned ? ns.Progression.checkSwitchHull(state, hull.id) : null, points = hull.shape.map(([x, y]) => `${x + 50},${y + 50}`).join(' '); return `<article class="hull-card ${available || owned ? '' : 'locked'}" style="--faction:${FACTIONS[hull.faction].color}"><svg class="hull-silhouette" viewBox="0 0 100 100" aria-label="${hull.name} silhouette"><polygon points="${points}"></polygon></svg><span class="card-kicker">SHIP TIER ${hull.tier} // ${hull.maker.toUpperCase()}</span><h3>${hull.name}</h3><p>${hull.description}</p><div class="module-stats"><span>HULL<b>${hull.hull}<small>${delta(hull.hull, activeHull.hull)}</small></b></span><span>MASS<b>${hull.massLimit}<small>${delta(hull.massLimit, activeHull.massLimit)}</small></b></span><span>SPEED<b>${hull.maxSpeed}<small>${delta(hull.maxSpeed, activeHull.maxSpeed)}</small></b></span><span>CARGO<b>${hull.cargo >= 0 ? '+' : ''}${hull.cargo}<small>${delta(hull.cargo, activeHull.cargo)}</small></b></span></div>${active ? '<button disabled>ACTIVE HULL</button>' : owned ? `<button data-action="switch-hull" data-id="${hull.id}" ${check.ok ? '' : `disabled title="${check.reason.toUpperCase()} LIMIT"`}>${check.ok ? 'SWITCH HULL' : `${check.reason.toUpperCase()} BLOCKED`}</button>` : available ? this.paidButton(state, 'buy-hull', 'PURCHASE HULL', hull.cost, `data-id="${hull.id}"`) : `<button disabled>${ns.Expansion.hullUnlockText(state, hull)}</button>`}</article>`; }).join('');
            return `<div class="station-hero advanced" style="--faction:${FACTIONS[station.faction].color}"><div class="station-hero-grid"><div><p class="eyebrow">${this.factionBadge(station.faction)} ${station.major ? 'CENTRAL HUB' : 'FACILITY'} // ${ns.Expansion.patrolStatus(state, station.faction)} ACCESS</p><h2>${station.name}</h2>${controlHtml}<p class="station-flair">${flair[Math.abs(station.x + station.y) % flair.length]}</p><small>${FACTIONS[station.faction].description}</small></div><aside><span class="eyebrow">CONTRACT ISSUERS</span><div class="station-issuer-roster">${issuerHtml}</div><strong>${station.major ? `${issuers.length} FACTION BOARD` : 'LOCAL BOARD'}</strong></aside></div><div class="station-facts"><span>TRAFFIC<b>${details.traffic}</b></span><span>RUMOR<b>${details.rumor}</b></span><span>POLICY<b>${details.policy}</b></span><span>MARKET<b>${details.market}</b></span></div><p>${ns.Unlocks.nextMilestone(state)}</p></div><div class="card-grid three">
                <article><span class="card-kicker">SHIP SERVICE</span><h3>Restore ${ns.Progression.activeHull(state).name}</h3><p>Repair hull and damaged modules.</p>${repair.aetherium <= 0 ? '<button disabled>REPAIRS NOT REQUIRED</button>' : this.paidButton(state, 'repair', 'REPAIR', repair)}</article>
                <article><span class="card-kicker">CHASSIS</span><h3>Frame Tier ${state.ship.chassis.level}</h3><p>Increase integrity, mass, reactor and cargo reserves.</p>${state.ship.chassis.level >= 7 ? '<button disabled>MAXIMUM FRAME</button>' : this.paidButton(state, 'chassis', 'UPGRADE', chassis)}</article>
                <article><span class="card-kicker">RECOVERY</span><h3>${state.ship.insured ? 'Cargo insured' : 'Cargo exposed'}</h3><p>Insurance preserves cargo after destruction.</p>${state.ship.insured ? '<button data-action="insurance">CANCEL POLICY</button>' : this.paidButton(state, 'insurance', 'INSURE', { aetherium: 300 })}</article></div>
                <div class="station-actions">${ns.Unlocks.evaluate(state).tradeTier ? '<button data-action="tab" data-id="trade">OPEN MARKET</button>' : ''}</div>${shipyard ? `<h2 class="section-title">STATION SHIPYARD</h2><div class="card-grid hull-grid">${shipyard}</div>` : ''}`;
        }
        contractStageHtml(state, contract, stage, activeView) {
            if (stage.choices?.length) return stage.choices.map(choice => { const denied = ns.Expansion.dockingDenied(state, choice.faction), selected = stage.selectedChoice?.destination === choice.destination, faction = ns.Data.FACTIONS[choice.faction] || FACTIONS.independents; return `<article class="contract-stage choice ${denied ? 'denied' : ''} ${selected ? 'complete' : stage.status}" style="--faction:${faction.color}"><span>${this.factionBadge(choice.faction, denied ? 'DENIED' : selected ? 'SELECTED' : faction.short)}</span><strong>${choice.name || ns.Contracts.destinationName(contract, stage)}</strong><small>${activeView ? ns.MathUtil.formatDistance(distance(state.ship, choice.target)) : faction.name}</small></article>`; }).join('');
            const destination = ns.Contracts.destinationName(contract, stage), remaining = stage.target ? ns.MathUtil.formatDistance(distance(state.ship, stage.target)) : '';
            const factionId = this.contractStageFaction(state, contract, stage), faction = FACTIONS[factionId] || FACTIONS.independents;
            const progress = stage.required > 1 ? ` // ${stage.progress}/${stage.required}` : '';
            return `<article class="contract-stage ${stage.status}" style="--faction:${faction.color}"><span>${this.factionBadge(factionId, stage.status.toUpperCase())}</span><strong>${stage.name || destination}</strong><small>${stage.status === 'active' && activeView ? `${destination} // ${remaining}${progress}` : `${destination}${progress}`}</small></article>`;
        }
        contractTimerHtml(contract) { return contract.timer ? `<div class="contract-timer ${contract.timer.hard ? 'hard' : ''} ${contract.timer.missed ? 'missed' : ''}"><span>${contract.timer.hard ? 'HARD DEADLINE' : 'TIMED BONUS'}</span><strong>${contract.timer.started ? this.formatTimer(contract.timer.remaining) : `${this.formatTimer(contract.timer.duration)} AFTER UNDOCK`}</strong><small>${contract.timer.missed ? contract.timer.hard ? 'CURRENCY FORFEITED' : 'BONUS EXPIRED' : 'ON-TIME CURRENCY +35%'}</small></div>` : ''; }
        render_contracts(game) {
            const state = game.state, station = this.currentStation(state), active = state.contracts.active;
            if (active) {
                const stages = ns.Contracts.ensureStages(active), stageRows = stages.map(stage => this.contractStageHtml(state, active, stage, true)).join(''), warning = ns.Contracts.dockingWarning(state);
                return `<div class="contract-focus" style="--faction:${(FACTIONS[active.issuer] || FACTIONS.independents).color}"><p class="eyebrow">${this.factionBadge(active.issuer)} ACTIVE CONTRACT // RISK ${active.risk} // WAYPOINT LOCKED</p>${this.contractTypeChip(active)}<h2>${active.name}</h2><p>${active.description}</p>${warning ? `<p class="contract-access-warning">${warning.message}</p>` : ''}${this.contractTimerHtml(active)}<div class="contract-stages">${stageRows}</div><p>${ns.Contracts.objectiveInstruction(active)}</p><div class="reward-line"><span>${active.progress}/${active.required} STAGES</span><strong>${this.costHtml(active.reward)}</strong></div><button class="danger" data-action="abandon">ABANDON CONTRACT</button></div>`;
            }
            if (!station) return '<section class="empty-state"><h2>No active contract</h2><p>Dock to access a local board.</p></section>';
            ns.Contracts.ensureBoardForStation(state, station);
            const report = state.progression.pendingDebrief ? state.contracts.history.find(item => item.id === state.progression.pendingDebrief) : null, reportHtml = report?.debrief ? `<section class="mission-report" style="--faction:${(FACTIONS[report.issuer] || FACTIONS.independents).color}"><span class="eyebrow">${this.factionBadge(report.issuer)} MISSION DEBRIEF</span><h2>${report.name}</h2><p>${report.debrief.outcome}</p><p>${report.debrief.response}</p><blockquote>${report.debrief.consequence || 'Local channels file the result without additional comment.'}</blockquote><div class="reward-line"><span>STANDING +${report.debrief.standing}</span><strong>${this.costHtml(report.debrief.payment)}</strong></div><button data-action="dismiss-debrief">DISMISS REPORT</button></section>` : '';
            return `${reportHtml}<div class="contract-list">${state.contracts.board.map(c => { const expanded = this.focusedContractId === c.id, stages = ns.Contracts.ensureStages(c), brief = c.briefing || ns.Expansion.briefing(c, station), stageRows = stages.map(stage => this.contractStageHtml(state, c, stage, false)).join(''), access = ns.Contracts.dockingAccess(state, c), accessSummary = this.contractAccessSummary(state, access), faction = FACTIONS[c.issuer] || FACTIONS.independents; return `<section class="contract-entry ${expanded ? 'expanded' : ''}" style="--faction:${faction.color}"><article class="contract-card"><div><div class="contract-card-meta">${this.contractTypeChip(c)}<span class="risk">${this.factionBadge(c.issuer)} ${c.priority ? 'PRIORITY // ' : ''}RISK ${c.risk}${c.timer ? ` // ${c.timer.hard ? 'HARD DEADLINE' : 'TIMED'}` : ''}</span></div><h3>${c.name}</h3><p>${c.description}</p></div><div class="contract-pay"><strong>${this.costHtml(c.reward)}</strong><span>${c.xp} XP</span><button data-action="view-contract" data-id="${c.id}">${expanded ? 'CLOSE' : 'VIEW'}</button></div></article>${expanded ? `<div class="contract-dropdown"><p class="eyebrow">CONTRACT BRIEF // ${brief.contact}</p>${this.contractTypeChip(c)}<h3>${c.name}</h3><p>${brief.situation}</p><blockquote>${brief.line}</blockquote><div class="brief-facts"><span>ROUTE<b>${brief.route}</b></span><span>COMPLICATION<b>${brief.complication}</b></span><span>PATRON<b>${brief.tone}</b></span><span>FINE PRINT<b>${brief.finePrint}</b></span></div><p>${c.description}</p>${this.contractTimerHtml(c)}<div class="contract-stages">${stageRows}</div>${access.ok ? '' : `<p class="contract-access-warning">${accessSummary.warning}</p>`}<p>${ns.Contracts.objectiveInstruction(c)}</p><div class="reward-line"><span>${c.xp} XP // RISK ${c.risk}</span><strong>${this.costHtml(c.reward)}</strong></div><button class="primary" data-action="accept-contract" data-id="${c.id}" ${access.ok ? '' : 'disabled'}>${accessSummary.button}</button></div>` : ''}</section>`; }).join('')}</div><button data-action="refresh-contracts">REFRESH BOARD</button>`;
        }
        render_trade(game) {
            const state = game.state, station = this.currentStation(state); if (!station) return '<p>Dock to trade.</p>'; ns.Economy.ensureMarket(state, station); const inventory = ns.Economy.inventoryFor(state, station), details = ns.Expansion.stationDetails(station);
            const goods = Object.values(COMMODITIES).filter(item => ns.Unlocks.commodityVisible(state, item) && (inventory.commodities.includes(item.id) || inventory.requests.includes(item.id) || (state.ship.cargo[item.id] || 0) > 0));
            const modules = Object.values(MODULES).filter(m => m.cost && ns.Unlocks.moduleVisible(state, m) && inventory.modules.includes(m.id) && (!state.ship.ownedModules.includes(m.id) || this.recentlyBoughtModules.has(m.id)));
            const ownedModules = state.ship.ownedModules.map(id => MODULES[id]).filter(Boolean).filter(module => !ns.Wallet.isZero(module.cost));
            const stats = ns.Progression.calculateShipStats(state), cargoUsed = ns.Progression.cargoUsed(state);
            const goodsHtml = goods.map(item => { const owned = state.ship.cargo[item.id] || 0, stocked = inventory.commodities.includes(item.id), requested = inventory.requests.includes(item.id), cost = { aetherium: ns.Economy.price(state, station, item.id, 'buy') }, sell = ns.Economy.price(state, station, item.id, 'sell'); return `<article class="${requested ? 'requested' : ''}" style="--item:${item.color}"><div class="market-card-body"><span class="card-kicker">${requested ? 'REQUESTED IMPORT' : stocked ? item.legal ? 'REGULATED EXPORT' : 'RESTRICTED EXPORT' : 'NO LOCAL REQUEST'}</span><h3>${item.name}</h3><p>HOLD ${owned}<br>${stocked ? `BUY ${cost.aetherium} AE // ` : ''}${requested ? `SELL ${sell} AE // +REP` : 'NO BUYER HERE'}</p></div><footer class="market-actions">${stocked ? this.paidButton(state, 'buy-cargo', 'BUY 1', cost, `data-id="${item.id}"`) : ''}<button data-action="sell-cargo" data-id="${item.id}" ${owned && requested ? '' : 'disabled'}>SELL 1</button></footer></article>`; }).join('');
            const offerHtml = modules.map(m => `<article class="module-offer"><div class="module-offer-body"><span class="card-kicker">TIER ${m.tier} // ${m.slot.toUpperCase()}</span><h3>${m.name}</h3><p>${m.description}</p><div class="module-stats">${this.moduleStats(m)}</div></div><footer class="module-offer-action">${state.ship.ownedModules.includes(m.id) ? '<button disabled>OWNED</button>' : this.paidButton(state, 'buy-module', 'PURCHASE', m.cost, `data-id="${m.id}"`)}</footer></article>`).join('') || '<p>NO MODULE STOCK THIS CYCLE</p>';
            const ownedHtml = ownedModules.map(module => { const check = ns.Economy.checkSellModule(state, module.id), value = ns.Economy.moduleResaleValue(state, station, module.id), disabled = check.ok ? '' : `disabled title="${check.reason.toUpperCase()}"`; return `<article class="owned-module-card"><span class="card-kicker">OWNED // TIER ${module.tier} // ${module.slot.toUpperCase()}</span><h3>${module.name}</h3><p>${module.description}</p><div class="module-stats">${this.moduleStats(module)}</div><button data-action="sell-module" data-id="${module.id}" ${disabled}>${check.ok ? `SELL // ${this.costHtml(value)}` : check.reason === 'equipped' ? 'EQUIPPED MODULE' : 'SALE LOCKED'}</button></article>`; }).join('') || '<p>NO RESALE-ELIGIBLE MODULES OWNED</p>';
            return `<div class="trade-console" style="--faction:${FACTIONS[station.faction].color}"><header class="trade-header"><div><span class="eyebrow">${this.factionBadge(station.faction)} REGIONAL SUPPLY EXCHANGE // TIER ${ns.Unlocks.evaluate(state).tradeTier}</span><h2>${station.name}</h2><p class="station-flair">${details.market}</p><p class="station-flair">${details.shipyard}</p></div><div class="trade-status"><span>STOCK CYCLE<b>${inventory.cycle + 1}</b></span><span>CARGO<b>${cargoUsed}/${stats.cargo}</b></span><span>MODULE OFFERS<b>${modules.length}</b></span></div></header><section class="trade-section"><div class="trade-section-title"><span class="eyebrow">COMMODITY EXCHANGE</span><h2>Trade Goods</h2></div><div class="market-grid">${goodsHtml}</div></section><section class="trade-section module-section"><div class="trade-section-title"><span class="eyebrow">FITTING INVENTORY</span><h2>Module Market</h2></div><div class="module-market">${offerHtml}</div></section><section class="trade-section module-section"><div class="trade-section-title"><span class="eyebrow">RESALE COUNTER</span><h2>Owned Fittings</h2></div><div class="owned-module-grid">${ownedHtml}</div></section></div>`;
        }
        moduleStats(module) {
            if (!module) return '<span>NO SYSTEM FITTED</span>';
            const labels = { damage: 'DMG', fireRate: 'CYCLE', energy: 'ENERGY', heat: 'HEAT', reactor: 'CAPACITY', energyRecharge: 'ENERGY / S', thrust: 'THRUST', maxSpeed: 'MAX SPEED', strafe: 'STRAFE', turn: 'TURN', braking: 'BRAKING', shield: 'SHIELD', shieldRecharge: 'RECHARGE', shieldDelay: 'DELAY', hullBonus: 'HULL', armor: 'ARMOR', cargo: 'CARGO', cooling: 'COOLING', repair: 'REPAIR', sensor: 'SENSOR', interactionRange: 'INTERACTION +KM', mass: 'MASS' };
            const values = Object.entries(labels).filter(([key]) => module[key] !== undefined).map(([key, label]) => { const effective = module.slot === 'primary' && ['energy','heat'].includes(key) ? Math.round(module[key] * ns.Weapons.RESOURCE_SCALE * 10) / 10 : module[key]; return `<span>${label}<b>${key === 'fireRate' || key === 'shieldDelay' ? `${effective}S` : effective}</b></span>`; });
            if (module.ability) { values.push(`<span>COOLDOWN<b>${module.ability.cooldown}S</b></span>`, `<span>DURATION<b>${module.ability.duration || 0}S</b></span>`, `<span>ACTIVE ENERGY<b>${module.ability.energy}</b></span>`); if (module.ability.heat) values.push(`<span>ACTIVE HEAT<b>${module.ability.heat}</b></span>`); }
            if (module.id === 'light_drive' || module.lightSpeed) values.push('<span>ACTIVATION COST<b>5 SS + 5 HE</b></span>', '<span>LIGHT SPEED LOAD<b>5 ENERGY + 5 HEAT / S</b></span>');
            if (module.stargateSystem) values.push('<span>HULL CLASS<b>TIER IV+</b></span>', '<span>STARGATE LINK<b>REQUIRED</b></span>');
            return values.join('');
        }
        renderShipPreview(game) {
            const canvas = this.panelBody.querySelector('#shipPreviewCanvas'); if (!canvas) return;
            const preview = new ns.Renderer(canvas); preview.drawShipPreview(game);
        }
        slotLabel(slot) {
            return ns.Registry.get('slot', slot)?.label || slot;
        }
        slotInfoText(state, slot, options) {
            const unlocks = ns.Unlocks.evaluate(state);
            if (slot === 'abilityShift' && !unlocks.abilitySlots.abilityShift) return 'Unlock Shift by completing Cold Start at the starter beacon.';
            if (slot === 'abilitySpace' && !unlocks.abilitySlots.abilitySpace) return 'Unlock Space by completing 3 contracts.';
            if (slot === 'abilityQ' && !unlocks.abilitySlots.abilityQ) return 'Unlock Q by discovering an anomaly beacon.';
            if (slot === 'abilityE' && !unlocks.abilitySlots.abilityE) return 'Unlock E by joining a faction or completing 10 independent contracts.';
            if (slot.startsWith('utility') && !(options || []).length) return 'Buy utility modules from station Module Markets. Major and remote stations carry broader utility stock.';
            return '';
        }
        shipSlotCard(state, slot, id, compatible, equipReason) {
            const module = MODULES[id], docked = Boolean(state.dockedAt), options = compatible(slot), info = this.slotInfoText(state, slot, options);
            return `<article class="ship-system-card ${info ? 'has-slot-info' : ''}">${info ? `<button class="slot-info" type="button" aria-label="${info}" title="${info}">i</button>` : ''}<span class="card-kicker">${this.slotLabel(slot)}</span><h3>${module?.name || 'EMPTY SLOT'}</h3><p>${module?.description || 'Acquire and fit a compatible module to activate this system.'}</p><div class="module-stats">${this.moduleStats(module)}</div><div class="slot-options">${options.map(mid => { const check = ns.Progression.checkEquipModule(state, slot, mid), selected = mid === id, blocked = !selected && !check.ok; return `<button class="small ${selected ? 'selected' : ''} ${blocked ? 'unaffordable' : ''}" data-action="equip" data-slot="${slot}" data-id="${mid}" ${!docked ? 'disabled aria-disabled="true"' : blocked ? `aria-disabled="true" data-reason="${check.reason}"` : ''}>${MODULES[mid].name}${blocked ? `<small>${equipReason(check)}</small>` : ''}</button>`; }).join('') || '<span>NO COMPATIBLE MODULES OWNED</span>'}</div></article>`;
        }
        render_ship(game) {
            const state = game.state, stats = ns.Progression.calculateShipStats(state), unlocks = ns.Unlocks.evaluate(state);
            const slots = Object.entries(state.ship.slots), coreNames = ['reactor', 'engine', 'defense', 'cargo'];
            const core = slots.filter(([slot]) => coreNames.includes(slot)), equipment = slots.filter(([slot]) => !coreNames.includes(slot));
            const missionSlots = this.shipMissionTab === 'utility' ? equipment.filter(([slot]) => slot.startsWith('utility')) : equipment.filter(([slot]) => slot.startsWith('primary') || slot.startsWith('ability'));
            const compatible = slot => { const category = ns.Registry.get('slot', slot)?.category || slot; return state.ship.ownedModules.filter(id => MODULES[id]?.slot === category); };
            const equipReason = check => check.reason === 'mass' ? 'OVER MASS LIMIT' : check.reason === 'locked' ? 'SLOT LOCKED' : check.reason === 'hull-tier' ? 'TIER IV+ HULL ONLY' : 'UNAVAILABLE';
            const selected = core.find(([slot]) => slot === this.selectedShipArea) || core[0], areaButtons = [['cargo', 'Cargo'], ['defense', 'Defense'], ['reactor', 'Reactor'], ['engine', 'Engine']].map(([slot, label]) => `<button class="ship-area-hotspot ${this.selectedShipArea === slot ? 'active' : ''} area-${slot}" data-action="select-ship-area" data-id="${slot}"><span>${label}</span></button>`).join('');
            return `${state.dockedAt ? '' : '<div class="loadout-lock-notice">DOCK AT A STATION TO MODIFY LOADOUT</div>'}<div class="ship-console compact"><section class="ship-portrait"><span class="eyebrow">PERSONAL STARFIGHTER // HULL TIER ${ns.Progression.activeHull(state).tier}</span><h2>${state.ship.name}</h2><div class="ship-preview-stage"><canvas id="shipPreviewCanvas" aria-label="Static preview of the currently fitted Wayfarer"></canvas>${areaButtons}</div><div class="stat-strip"><span>FRAME<b>TIER ${state.ship.chassis.level}</b></span><span>MASS<b>${stats.mass.toFixed(1)}/${stats.massLimit}</b></span><span>HULL<b>${Math.round(stats.hull)}</b></span><span>CARGO<b>${ns.Progression.cargoUsed(state)}/${stats.cargo}</b></span></div></section><section class="ship-panel core-focus"><header><span class="eyebrow">CORE SHIP AREA</span><h2>${this.slotLabel(selected[0]).toUpperCase()}</h2></header>${this.shipSlotCard(state, selected[0], selected[1], compatible, equipReason)}<div class="derived-stats"><span>ENERGY RECHARGE<b>${stats.energyRecharge}/S</b></span><span>COOLING<b>${stats.cooling}/S</b></span><span>THRUST<b>${Math.round(stats.thrust)}</b></span><span>MAX SPEED<b>${Math.round(stats.maxSpeed)}</b></span><span>SHIELD<b>${Math.round(stats.shield)}</b></span><span>ARMOR<b>${Math.round(stats.armor * 100)}%</b></span></div></section><section class="ship-panel weapons compact-mission"><header><span class="eyebrow">MISSION SYSTEMS</span><h2>${this.shipMissionTab === 'utility' ? 'UTILITY' : 'WEAPONS AND ABILITIES'}</h2><nav class="mission-tabs"><button class="${this.shipMissionTab === 'weapons' ? 'active' : ''}" data-action="ship-mission-tab" data-id="weapons">WEAPONS AND ABILITIES</button><button class="${this.shipMissionTab === 'utility' ? 'active' : ''}" data-action="ship-mission-tab" data-id="utility">UTILITY</button></nav></header><div class="mission-system-grid">${missionSlots.map(([slot, id]) => this.shipSlotCard(state, slot, id, compatible, equipReason)).join('')}</div></section></div>`;
        }
        render_traits(game) {
            const state = game.state, respec = ns.Progression.respecCost(state); return `<div class="trait-header"><div><span class="eyebrow">PILOT DEVELOPMENT</span><h2>${state.pilot.traitPoints} points available</h2></div>${this.paidButton(state, 'respec', 'RETRAIN', respec)}</div><div class="discipline-grid">${['ace', 'engineer', 'pathfinder', 'operator'].map(d => `<section class="discipline ${d}"><header><span>${d.toUpperCase()}</span><b>${ns.Progression.getDisciplineSpend(state, d)} INVESTED</b></header>${TRAITS.filter(t => t.discipline === d).map(t => { const rank = ns.Progression.getTraitRank(state, t.id), achievement = t.capstone ? ({ ace: 'combat_veteran', engineer: 'master_mechanic', pathfinder: 'rim_cartographer', operator: 'career_pilot' }[d]) : '', total = ns.Progression.traitTotalLabel(t, rank); return `<article class="trait ${t.capstone ? 'capstone' : ''} ${rank ? 'owned' : ''}"><div><h3>${t.name}</h3><p>${t.description}</p>${total ? `<small class="trait-total">TOTAL // ${total}</small>` : ''}${t.capstone && !state.pilot.achievements[achievement] ? `<small>ACHIEVEMENT REQUIRED: ${achievement.replace('_', ' ').toUpperCase()}</small>` : ''}</div><button data-action="buy-trait" data-id="${t.id}" ${ns.Progression.canBuyTrait(state, t.id) ? '' : 'disabled'}>${rank}/${t.maxRank}</button></article>`; }).join('')}</section>`).join('')}</div>`;
        }
        factionCard(state, f) { const rep = Math.round(state.reputations[f.id]), joined = state.pilot.allegiance === f.id, status = ns.Expansion.patrolStatus(state, f.id), arcs = QUESTS[f.id] || ['Open Channel'], quest = arcs[Math.min(state.quests[f.id] || 0, arcs.length - 1)], rivals = (f.hostileTo || []).filter(id => ns.Galaxies.factionAvailable(state, id)).map(id => FACTIONS[id].short).join(' // ') || 'NONE'; return `<article style="--faction:${f.color}"><span class="eyebrow">${f.short} // PATROLS ${status}</span><h2>${f.name}</h2><p>${f.description}</p><div class="reputation"><span style="width:${Math.max(2, (rep + 100) / 2)}%"></span></div><strong>STANDING ${rep >= 0 ? '+' : ''}${rep}</strong><p>${status === 'FRIENDLY' ? 'Patrol support and priority contracts active.' : status === 'NEUTRAL' ? 'Patrols hold fire unless provoked.' : 'Patrols engage on detection.'} ${rep <= -50 ? 'Docking denied.' : 'Docking permitted.'}</p><p>RIVALS // ${rivals}</p><p class="quest-line">CURRENT ARC // ${quest}</p>${f.joinable ? `<button data-action="${joined ? 'leave-faction' : 'join-faction'}" data-id="${f.id}" ${!joined && rep < 15 ? 'disabled' : ''}>${joined ? 'LEAVE FACTION' : 'JOIN AT +15'}</button>` : '<span class="neutral-badge">INDEPENDENT CAREER NETWORK</span>'}</article>`; }
        render_factions(game) { const state = game.state, ordered = ns.Galaxies.availableFactions(state).sort((a,b) => state.reputations[b.id] - state.reputations[a.id]), section = (label, list) => `<section class="faction-standing-row ${label.toLowerCase()}"><header><span class="eyebrow">DIPLOMATIC REGISTRY</span><h2>${label}</h2></header><div class="faction-grid">${list.map(f => this.factionCard(state, f)).join('') || '<p>NO FACTIONS IN THIS CLASSIFICATION</p>'}</div></section>`; return `<div class="faction-rows">${section('FRIENDLY', ordered.filter(f => state.reputations[f.id] >= 0))}${section('HOSTILE', ordered.filter(f => state.reputations[f.id] < 0))}</div>`; }
        mapHtml(game, compact) {
            const state = game.state, config = game.world?.config || ns.World.createConfig(), bounds = config.bounds, exposure = ns.World.boundaryExposure(state.ship.x, state.ship.y, config), worldW = bounds.maxX - bounds.minX, worldH = bounds.maxY - bounds.minY, pctX = x => (x - bounds.minX) / worldW * 100, pctY = y => (y - bounds.minY) / worldH * 100;
            const regions = config.regions.map(region => { const known = state.visitedRegions.includes(region.id), color = known ? region.color : '#667179'; return `<div class="map-region ${known ? 'known' : 'unknown'}" style="left:${pctX(region.x)}%;top:${pctY(region.y)}%;width:${region.w / worldW * 100}%;height:${region.h / worldH * 100}%;border-color:${color}">${!compact && known ? `<span>${region.name}</span>` : ''}</div>`; }).join('');
            const consumed = new Set(state.consumedEntityIds || []);
            const landmarks = compact ? '' : config.landmarks.filter(item => item.type === 'station' || !consumed.has(item.id)).map(item => {
                const known = state.discoveries.includes(item.id), controlled = Boolean(item.control), tooltip = known ? `${item.name} // ${controlled ? `${FACTIONS[item.faction].short} CONTROL // ` : ''}${ns.MathUtil.formatDistance(distance(state.ship, item))}` : 'UNKNOWN VISTA';
                const typeClass = known ? (item.type === 'station' ? item.major ? 'major-station' : 'station' : 'beacon') : 'unknown-vista';
                const marker = known ? '' : '<b>?</b>';
                return `<i tabindex="0" role="img" aria-label="${tooltip}" data-tooltip="${tooltip}" class="map-point ${typeClass} ${known ? 'known' : ''} ${controlled ? 'captured' : ''}" style="left:${pctX(item.x)}%;top:${pctY(item.y)}%;--point:${FACTIONS[item.faction].color}">${marker}</i>`;
            }).join('');
            const threat = state.progression?.roamingThreat, targets = ns.Contracts.targetsFor(state.contracts.active, state).map(target => `<i class="map-target ${target.denied ? 'denied' : ''}" data-tooltip="${target.denied ? 'DOCKING DENIED // ' : ''}${target.label}" style="left:${pctX(target.x)}%;top:${pctY(target.y)}%"></i>`).join('') + (threat ? `<i class="map-target capital-threat" data-tooltip="CAPITAL THREAT // ${ns.Data.BOSSES[threat.bossType].name.toUpperCase()}" style="left:${pctX(threat.x)}%;top:${pctY(threat.y)}%"></i>` : '');
            const custom = state.customWaypoint ? `<i class="map-custom-target" ${compact ? '' : 'data-action="remove-waypoint" role="button" tabindex="0" aria-label="Remove custom waypoint"'} data-tooltip="CUSTOM WAYPOINT // ${ns.MathUtil.formatDistance(distance(state.ship, state.customWaypoint))}" style="left:${pctX(state.customWaypoint.x)}%;top:${pctY(state.customWaypoint.y)}%"></i>` : '';
            return `<div class="${compact ? 'mini-map-canvas' : `galaxy-map ${exposure.proximity > 0 ? 'nebula-near' : ''}`}">${regions}${landmarks}${targets}${custom}<i class="map-player" data-tooltip="YOU" aria-label="YOU" style="left:${Math.max(0, Math.min(100, pctX(state.ship.x)))}%;top:${Math.max(0, Math.min(100, pctY(state.ship.y)))}%"></i></div>`;
        }
        render_navigation(game) {
            const state = game.state, gate = ns.Galaxies.gateStatus(state), gateAvailable = Boolean(state.dockedAt && gate.ready);
            if (!gateAvailable && this.navigationView === 'stargate') this.navigationView = 'local';
            const tabs = `<nav class="navigation-inner-tabs" aria-label="Navigation views"><button class="${this.navigationView === 'local' ? 'active' : ''}" data-action="navigation-view" data-id="local">LOCAL MAP</button>${gateAvailable ? `<button class="${this.navigationView === 'stargate' ? 'active' : ''}" data-action="navigation-view" data-id="stargate">STATION STARGATE</button>` : ''}</nav>`;
            if (this.navigationView === 'stargate') return `${tabs}${this.stargateHtml(game)}`;
            const config = game.world?.config || ns.World.createConfig(), exposure = ns.World.boundaryExposure(state.ship.x, state.ship.y, config), hazard = exposure.active ? `NEBULA BREACH // ${ns.MathUtil.formatDistance(exposure.depth)} OUTSIDE SAFE SPACE` : exposure.proximity > 0 ? 'PERIMETER NEBULA IN SENSOR RANGE' : 'SECTOR ENVELOPE NOMINAL';
            const objectiveResult = ns.Objectives.evaluate(state, state.galaxyId), objectiveRows = objectiveResult.entries.map(({ definition, value, done }) => `<li class="${done ? 'complete' : ''}"><span>${done ? '✓' : '◇'} ${definition.label}</span><strong>${Math.min(value, definition.required)}/${definition.required}</strong><small>${this.costHtml(definition.reward)}</small></li>`).join('');
            const gateModules = [ns.Data.MODULES[ns.Galaxies.GATE_REACTOR], ns.Data.MODULES[ns.Galaxies.GATE_ENGINE]].filter(Boolean), gateKnown = gateAvailable || gateModules.some(module => state.ship.ownedModules.includes(module.id) || ns.Unlocks.moduleVisible(state, module));
            const gateRequirements = gateAvailable ? 'ONLINE // STATION STARGATE ROUTES AVAILABLE' : state.dockedAt ? `${gate.highestTierHull ? 'TIER IV+ HULL READY' : 'TIER IV+ HULL REQUIRED'}<br>${gate.reactor ? 'GATEHEART CORE READY' : 'GATEHEART CORE REQUIRED'}<br>${gate.engine ? 'ATLAS ENGINE READY' : 'ATLAS ENGINE REQUIRED'}` : 'DOCK TO ACCESS STARGATE SYSTEMS';
            const gateBlock = gateKnown ? `<h3>STATION STARGATE</h3><p class="stargate-requirements ${gateAvailable ? 'ready' : ''}">${gateRequirements}</p>` : '';
            return `${tabs}<div class="map-layout navigation-view-frame"><div class="map-stage">${this.mapHtml(game, false)}</div><aside><span class="eyebrow">LOCAL MAP // GALAXY ${ns.Galaxies.current(state).code}</span><h2>${game.region.name}</h2><p>${ns.Galaxies.current(state).name}<br>GRID ${game.region.grid || game.region.id.toUpperCase()} // ${Math.round(state.ship.x)}, ${Math.round(state.ship.y)} KM<br>${state.discoveries.length} signals logged<br>${state.visitedRegions.length}/${config.regions.length} regions visited</p><h3>MAP OBJECTIVES</h3><ol class="map-objectives">${objectiveRows}</ol><h3>PERIMETER STATUS</h3><p class="map-hazard ${exposure.active ? 'active' : ''}">${hazard}</p>${gateBlock}<h3>NEXT LICENSE</h3><p>${ns.Unlocks.nextMilestone(state)}</p></aside></div>`;
        }
        stargateHtml(game) {
            const state = game.state, current = ns.Galaxies.current(state), neighbors = ns.Galaxies.neighbors(current.id);
            let selected = ns.Data.GALAXIES.find(galaxy => galaxy.id === this.selectedGalaxyId);
            if (!selected) { selected = current; this.selectedGalaxyId = selected.id; }
            const direct = ns.Galaxies.connected(current.id, selected.id), currentNode = selected.id === current.id, blockedByContract = Boolean(state.contracts.active);
            const nodes = ns.Data.GALAXIES.map(galaxy => {
                const classes = [galaxy.id === current.id ? 'current' : '', galaxy.id === selected.id ? 'selected' : '', neighbors.includes(galaxy.id) ? 'reachable' : '', state.visitedGalaxies.includes(galaxy.id) ? 'visited' : ''].filter(Boolean).join(' ');
                return `<button class="stargate-node ${classes}" style="left:${galaxy.x}%;top:${galaxy.y}%;--galaxy:${galaxy.color}" data-action="select-galaxy" data-id="${galaxy.id}" aria-label="Galaxy ${galaxy.code}, ${galaxy.name}">${galaxy.id === current.id ? '<i class="stargate-player-marker" data-tooltip="YOU">YOU</i>' : ''}<span>${galaxy.code}</span><small>${galaxy.name}</small></button>`;
            }).join('');
            const route = currentNode ? 'CURRENT GALAXY' : direct ? `DIRECT ROUTE // ${current.code} → ${selected.code}` : 'NO DIRECT ROUTE';
            const cooldown = Math.max(0, ns.Galaxies.STARGATE_COOLDOWN_MS - (Date.now() - state.lastStargateTravelAt)), unavailable = currentNode || !direct || blockedByContract;
            return `<section class="stargate-console navigation-view-frame"><div class="stargate-map" aria-label="Seven-galaxy station stargate chart"><canvas id="stargateOverlay" aria-hidden="true"></canvas>${nodes}<div class="stargate-map-caption"><span>STATION GATE ARRAY</span><strong>${state.visitedGalaxies.length}/7 GALAXIES LOGGED</strong></div></div><aside class="stargate-route"><span class="eyebrow">SELECTED DESTINATION</span><h2>GALAXY ${selected.code}</h2><h3>${selected.name}</h3><p>${selected.cluster} CLUSTER</p><div class="route-status ${direct && !currentNode && !cooldown ? 'ready' : ''}"><span>ORIGIN</span><strong>GALAXY ${current.code} // ${current.name}</strong><span>ROUTE</span><strong>${route}</strong><span>DRIVE PAIR</span><strong>GATEHEART + ATLAS // SYNCHRONIZED</strong></div>${blockedByContract ? '<p class="stargate-warning">ACTIVE CONTRACT LOCK // COMPLETE OR ABANDON BEFORE INTERGALACTIC TRAVEL</p>' : ''}${cooldown ? `<p class="stargate-warning cooldown">GATE ARRAY COOLDOWN // ${Math.ceil(cooldown / 1000)} SEC</p>` : ''}<button class="primary stargate-confirm ${cooldown ? 'cooldown' : ''}" data-action="stargate-travel" ${unavailable ? 'disabled' : ''} aria-disabled="${unavailable || cooldown > 0}">${cooldown ? `COOLDOWN ${Math.ceil(cooldown / 1000)}S` : 'STATION STARGATE TRAVEL'}</button></aside></section>`;
        }
        renderStargateCanvas(game) {
            const canvas = this.panelBody.querySelector('#stargateOverlay'); if (!canvas) return;
            const box = canvas.getBoundingClientRect(), width = box.width || canvas.parentElement?.clientWidth || 960, height = box.height || canvas.parentElement?.clientHeight || 540, scale = window.devicePixelRatio || 1, context = canvas.getContext('2d'); if (!context) return;
            canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale); context.setTransform(scale, 0, 0, scale, 0, 0); context.clearRect(0, 0, width, height);
            const current = game.state.galaxyId, selected = this.selectedGalaxyId, point = id => { const galaxy = ns.Galaxies.byId(id); return { x: galaxy.x / 100 * width, y: galaxy.y / 100 * height }; };
            ns.Data.GALAXY_LINKS.forEach(([from, to]) => { const a = point(from), b = point(to), active = from === current || to === current, chosen = (from === current && to === selected) || (to === current && from === selected); context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.lineWidth = chosen ? 3 : active ? 2 : 1; context.strokeStyle = chosen ? '#b7ffd9' : active ? '#55d7ff99' : '#40606a66'; context.setLineDash(chosen ? [] : [6, 7]); context.stroke(); });
            context.setLineDash([]); ns.Data.GALAXIES.forEach(galaxy => { const p = point(galaxy.id), selectedNode = galaxy.id === selected; context.beginPath(); context.arc(p.x, p.y, selectedNode ? 27 : 22, 0, Math.PI * 2); context.lineWidth = selectedNode ? 2.5 : 1; context.strokeStyle = selectedNode ? '#ffffff' : galaxy.color; context.stroke(); });
        }
        render_settings(game) { const s = game.state.settings; return `<div class="settings-list"><label><span>MASTER VOLUME</span><input id="volumeSetting" type="range" min="0" max="1" step="0.1" value="${s.volume}"></label><label><span>SCREEN SHAKE</span><button data-action="toggle-shake">${s.screenShake ? 'ENABLED' : 'DISABLED'}</button></label><button data-action="save">SAVE CAREER NOW</button><button class="danger" data-action="reset-career">DELETE CAREER</button><div class="controls"><h3>FLIGHT CONTROLS</h3><p>Mouse aim // W/S forward/reverse // A/D strafe</p><p>Mouse 1 weapon one // Mouse 2 weapon two // F interaction cast/dock</p><p>R Light Speed // Space/Q/E/Shift active modules // Tab target</p><p>M map // T traits // C contracts</p></div></div>`; }
        openDefeat(game, result, flavor) {
            this.activeTab = 'defeat'; this.panel.classList.add('active'); this.headerUndock.hidden = true; document.getElementById('panelTabs').innerHTML = ''; this.components.menuWallet.render(game.state, false); this.panelTitle.textContent = 'RECOVERY REPORT';
            const line = flavor || this.defeatFlavorLine(game.state, result), cargoLost = Object.values(result.lostCargo).reduce((a, b) => a + b, 0), insurance = game.state.ship.insured ? 'Cargo policy honored. The paperwork looked almost pleased.' : 'Uninsured cargo was redistributed to the educational sector.';
            this.panelBody.innerHTML = `<section class="defeat cinematic-report"><span class="eyebrow">SHIP DESTROYED // RESCUE COMPLETE</span><h2>Recovered at ${result.station.name}</h2><blockquote>${line}</blockquote><p class="defeat-summary">Emergency crews reconstructed enough of the situation to advise against repeating it.</p><div class="defeat-loss-grid">${ns.Wallet.KEYS.map(key => `<span>${CREDIT_META[key].short} LOST <b>${result.lostResources[key]}</b></span>`).join('')}<span>CARGO LOST <b>${cargoLost}</b></span></div><p class="defeat-insurance">${insurance}</p><button class="primary" data-action="recover">CONTINUE CAREER</button></section>`;
        }
        destroy() { this.clearStargateCooldownTicker(); this.root.removeEventListener('click', this.onClick); this.root.removeEventListener('input', this.onInput); this.root.removeEventListener('contextmenu', this.onContextMenu); this.panelHost.destroy(); Object.values(this.components).forEach(component => component.destroy()); }
        handleClick(event) {
            const button = event.target.closest('[data-action]'), map = event.target.closest('.galaxy-map');
            if (!button && map && this.game?.state) {
                const bounds = this.game.world?.config?.bounds || ns.World.WORLD_BOUNDS, box = map.getBoundingClientRect(), ratioX = (event.clientX - box.left) / box.width, ratioY = (event.clientY - box.top) / box.height;
                if (box.width > 0 && box.height > 0) { this.game.setCustomWaypoint({ x: bounds.minX + ratioX * (bounds.maxX - bounds.minX), y: bounds.minY + ratioY * (bounds.maxY - bounds.minY) }); this.renderPanel(this.game); }
                return;
            }
            if (!button) return; const action = button.dataset.action, id = button.dataset.id, game = this.game, state = game?.state || null, station = state ? this.currentStation(state) : null;
            if (this.actions.dispatch(action, { ui: this, game, state, station, button, id, event })) return;
        }
    }
    ns.UI = UI;
})(window.FrontierWayfarer);
