(function (ns) {
  'use strict';

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const living = creatures => creatures.filter(creature => creature.hp > 0);
  const copy = value => JSON.parse(JSON.stringify(value));

  class BaseChapter {
    constructor(game, campaign) {
      this.game = game;
      this.campaign = campaign;
      this.effects = ns.effectsFor(campaign.lineage);
      this.time = 0;
      this.state = campaign.chapterState;
    }

    enter() {
      this.state.chapterId = ns.CONFIG.chapters[this.campaign.chapter].id;
      this.state.cycle = this.state.cycle || 0;
      this.state.plan = this.state.plan || {};
      this.state.actions = this.state.actions || {};
      this.state.milestones = this.state.milestones || [];
      this.state.lastOutcome = this.state.lastOutcome || 'Choose three commitments, then resolve the cycle.';
    }

    update(dt) { this.time += dt; }
    cycleName() { return 'Cycle'; }
    slots() { return [{ id: 'first', label: 'First' }, { id: 'second', label: 'Second' }, { id: 'third', label: 'Third' }]; }
    orders() { return []; }
    targetId() { return null; }
    targetLabel() { return ''; }

    planModel() {
      const slots = this.slots().map(slot => ({
        id: slot.id,
        label: slot.label,
        assignment: this.state.plan[slot.id] || null,
        targetLabel: this.state.plan[slot.id] ? this.targetLabel(this.state.plan[slot.id].targetId) : '',
        orders: this.orders(slot.id).map(order => Object.assign({}, order))
      }));
      return {
        cycleLabel: `${this.cycleName()} ${this.state.cycle + 1}`,
        slots,
        forecast: this.forecast(),
        canResolve: this.canResolve(),
        outcome: this.state.lastOutcome
      };
    }

    assignOrder(slotId, orderId, targetId) {
      const slot = this.slots().find(item => item.id === slotId);
      const order = slot && this.orders(slotId).find(item => item.id === orderId && !item.disabled);
      if (!order) return false;
      this.state.plan[slotId] = { orderId, targetId: targetId == null ? this.targetId() : targetId };
      return true;
    }

    clearOrder(slotId) { delete this.state.plan[slotId]; }
    selectedOrders() { return this.slots().map(slot => this.state.plan[slot.id]).filter(Boolean); }
    canResolve() { return this.selectedOrders().length === this.slots().length && this.validatePlan().ok; }
    validatePlan() { return { ok: true, reason: '' }; }

    orderDefinition(slotId, assignment) {
      return this.orders(slotId).find(order => order.id === assignment.orderId);
    }

    forecast() {
      const chosen = this.slots().map(slot => {
        const assignment = this.state.plan[slot.id];
        const order = assignment && this.orderDefinition(slot.id, assignment);
        const target = assignment && this.targetLabel(assignment.targetId);
        return order ? `${order.forecast}${target ? ` @ ${target}` : ''}` : null;
      }).filter(Boolean);
      const validation = this.validatePlan();
      if (!chosen.length) return 'No time passes while you plan. Fill all three commitments to preview the cycle.';
      return `${chosen.join(' | ')}${validation.ok ? '' : ` | ${validation.reason}`}`;
    }

    cycleRng() {
      const signature = JSON.stringify(this.slots().map(slot => this.state.plan[slot.id] || null));
      return ns.createRng(`${this.campaign.seed}:chapter:${this.campaign.chapter}:cycle:${this.state.cycle}:${signature}`);
    }

    resolveCycle() {
      const validation = this.validatePlan();
      if (!this.canResolve()) throw new Error(validation.reason || 'Fill every planning slot before resolving.');
      const assignments = copy(this.state.plan);
      const rng = this.cycleRng();
      const messages = this.resolveAssignments(assignments, rng) || [];
      Object.keys(assignments).forEach(slotId => this.action(assignments[slotId].orderId));
      this.state.cycle += 1;
      this.campaign.totalCycles = (this.campaign.totalCycles || 0) + 1;
      this.campaign.elapsed = (this.campaign.elapsed || 0) + 1;
      this.state.plan = {};
      this.updateMilestones();
      this.state.lastOutcome = messages.join(' ') || `${this.cycleName()} ${this.state.cycle} changed the lineage.`;
      messages.forEach(message => this.game.log(message));
      return { cycle: this.state.cycle, messages, milestones: copy(this.state.milestones) };
    }

    resolveAssignments() { return []; }
    updateMilestones() {}
    addMilestone(id, label, condition) {
      if (condition && !this.state.milestones.some(item => item.id === id)) {
        this.state.milestones.push({ id, label, cycle: this.state.cycle });
        this.game.log(`Milestone: ${label}.`);
      }
    }
    objective() {
      return {
        title: 'Guide the lineage',
        text: this.state.milestones.map(item => item.label).join(' / ') || 'Resolve plans to create lasting milestones.',
        value: this.state.milestones.length,
        target: ns.CONFIG.chapters[this.campaign.chapter].target
      };
    }
    stats() { return []; }
    ready() { return this.objective().value >= this.objective().target; }
    serialize() { return this.state; }
    cleanup() {}
    action(id) { this.state.actions[id] = (this.state.actions[id] || 0) + 1; }
  }

  class FirstGlowChapter extends BaseChapter {
    enter() {
      if (!this.state.chapterId) Object.assign(this.state, {
        chapterId: 'first-glow', cycle: 0, health: 88, hunger: 68, rest: 70, joy: 58, trust: 18,
        food: 4, nest: 14, discoveries: 0, mateAttracted: false, mateBond: 0,
        player: { x: 82, y: 160, facing: 1 }, activity: 'wake', plan: {}, actions: {}, milestones: []
      });
      super.enter();
      this.game.hint('Plan Luma\'s morning, afternoon, and dusk. Time advances only when you resolve the day.');
    }
    cycleName() { return 'Day'; }
    slots() { return [{ id: 'morning', label: 'Morning' }, { id: 'afternoon', label: 'Afternoon' }, { id: 'dusk', label: 'Dusk' }]; }
    orders() {
      const social = this.state.mateAttracted ? { id: 'social', label: 'Share Glow', forecast: '+bond, +trust', description: 'Spend a quiet watch matching glow-patterns.' } : { id: 'explore', label: 'Explore', forecast: '+discovery, possible food', description: 'Follow Luma\'s curiosity into a new habitat pocket.' };
      return [
        { id: 'forage', label: 'Forage', forecast: '+food, -rest', description: 'Search for sweet light-motes.' },
        { id: 'rest', label: 'Rest', forecast: '+rest, -hunger', description: 'Sleep safely in the living nest.' },
        { id: 'play', label: 'Play', forecast: '+joy, +trust, -rest', description: 'Encourage curiosity and attachment.' },
        { id: 'groom', label: 'Groom', forecast: '+health, +trust', description: 'Tend Luma\'s luminous mantle.' },
        { id: 'nest', label: 'Shape Nest', forecast: '+habitat, costs 1 food', disabled: this.state.food < 1, description: 'Grow shelter and an inviting nest-song.' },
        social
      ];
    }
    validatePlan() {
      const nestCount = this.selectedOrders().filter(item => item.orderId === 'nest').length;
      return nestCount > this.state.food ? { ok: false, reason: `Need ${nestCount} food to shape the planned nest.` } : { ok: true, reason: '' };
    }
    resolveAssignments(plan, rng) {
      const messages = [];
      Object.values(plan).forEach(assignment => {
        this.state.activity = assignment.orderId;
        if (assignment.orderId === 'forage') { const gain = 2 + (rng() < .45 * this.effects.gather ? 1 : 0); this.state.food += gain; this.state.rest -= 7; this.state.hunger -= 5; this.state.player.x = 310; }
        if (assignment.orderId === 'rest') { this.state.rest += 24; this.state.hunger -= 5; this.state.player.x = 70; }
        if (assignment.orderId === 'play') { this.state.joy += 20; this.state.trust += 5; this.state.rest -= 6; this.state.player.x = 210; }
        if (assignment.orderId === 'groom') { this.state.health += 13; this.state.trust += 4; }
        if (assignment.orderId === 'nest') { this.state.food -= 1; this.state.nest += 10 * this.effects.build; this.state.trust += 2; this.state.player.x = 94; }
        if (assignment.orderId === 'explore') { this.state.discoveries += 1; this.state.food += rng() < .65 ? 2 : 0; this.state.joy += 6; this.state.player.x = 330; }
        if (assignment.orderId === 'social') { this.state.mateBond += 7 * this.effects.cohesion; this.state.trust += 5; this.state.player.x = 270; }
      });
      this.state.hunger -= 10;
      this.state.rest -= 4;
      this.state.joy -= 5;
      if (this.state.food > 0 && this.state.hunger < 55) { this.state.food -= 1; this.state.hunger += 28; }
      ['health', 'hunger', 'rest', 'joy', 'trust', 'nest', 'mateBond'].forEach(key => { this.state[key] = clamp(this.state[key], 0, 100); });
      if (this.state.hunger < 15 || this.state.rest < 12) this.state.health = clamp(this.state.health - 12, 0, 100);
      if (!this.state.mateAttracted && this.state.nest >= 48 && this.state.trust >= 48 && this.state.discoveries >= 2) {
        this.state.mateAttracted = true;
        this.campaign.lineage.mate = ns.CreatureAppearance.fromGenes({ body: rng.pick(['swift', 'shell', 'crest']), palette: rng.pick(['cyan', 'coral', 'gold']) }, `${this.campaign.seed}:mate`);
        messages.push('A wild glow answers the habitat song and chooses to remain nearby.');
      }
      messages.push(`Luma ends the day ${this.state.health >= 70 ? 'bright and attentive' : 'in need of gentler care'}.`);
      return messages;
    }
    updateMilestones() {
      this.addMilestone('thriving', 'Luma is thriving', this.state.health >= 70 && this.state.hunger >= 45 && this.state.rest >= 45 && this.state.joy >= 45);
      this.addMilestone('habitat', 'A welcoming habitat', this.state.nest >= 48 && this.state.discoveries >= 2);
      this.addMilestone('trust', 'A trusting bond', this.state.trust >= 58);
      this.addMilestone('mate', 'Two lights choose one nest', this.state.mateAttracted && this.state.mateBond >= 55);
    }
    objective() { return Object.assign(super.objective(), { title: this.state.mateAttracted ? 'Form the first bond' : 'Raise a thriving adult', text: 'Build health, habitat, trust, and finally a mutual bond.' }); }
    stats() { return [['Cycle', this.state.cycle], ['Food', this.state.food], ['Hunger', this.state.hunger], ['Rest', this.state.rest], ['Trust', this.state.trust], ['Nest', this.state.nest]]; }
  }

  class BroodChapter extends BaseChapter {
    enter() {
      if (!this.state.chapterId) {
        const founder = this.campaign.lineage.founder;
        const mate = this.campaign.lineage.mate || ns.CreatureAppearance.fromGenes({ body: 'crest', palette: 'cyan' }, `${this.campaign.seed}:mate`);
        const roles = ['leader', 'mate', 'young', 'young', 'young'];
        const creatures = roles.map((role, index) => ({ id: index + 1, name: index ? `Kin ${index}` : this.campaign.lineage.founderName, x: 150 + index * 18, y: 105 + (index % 2) * 24, hp: 100, age: role === 'young' ? 8 : 34, aptitude: ['forage', 'guard', 'nurture'][index % 3], appearance: role === 'leader' ? founder : role === 'mate' ? mate : ns.CreatureAppearance.inherit(founder, mate, `${this.campaign.seed}:child:${index}`), role }));
        Object.assign(this.state, { chapterId: 'brood', cycle: 0, creatures, food: 10, cohesion: 38, nestSafety: 32, threat: 46, discoveries: 0, stance: 'balanced', plan: {}, actions: {}, milestones: [] });
      }
      super.enter();
      this.game.hint('Assign founder, mate, and young to expedition roles. Injured and dead kin cannot work.');
    }
    cycleName() { return 'Expedition'; }
    slots() { return [{ id: 'founders', label: 'Founders' }, { id: 'adults', label: 'Adult Kin' }, { id: 'young', label: 'Young Kin' }]; }
    groupLiving(slotId) {
      return living(this.state.creatures).filter(creature => slotId === 'founders' ? creature.role === 'leader' : slotId === 'adults' ? creature.role !== 'leader' && creature.role !== 'young' : creature.role === 'young');
    }
    orders(slotId) {
      if (!this.groupLiving(slotId).length) return [{ id: 'regroup', label: 'Regroup Survivors', forecast: '+cohesion, no field work', description: 'Living kin cover the empty family circle.' }];
      const common = [
        { id: 'forage', label: 'Forage Grove', forecast: '+food, exposed to threat', description: 'Gather in luminous groves.' },
        { id: 'guard', label: 'Guard Paths', forecast: '-threat, possible injury', description: 'Intercept dusk-stalkers.' },
        { id: 'nurture', label: 'Nurture Kin', forecast: '+cohesion, heal family', description: 'Feed and tend vulnerable kin.' },
        { id: 'scout', label: 'Scout Borders', forecast: '+discovery, reveals danger', description: 'Map future settlement ground.' },
        { id: 'reinforce', label: 'Reinforce Nest', forecast: '+nest safety, costs 2 food', disabled: this.state.food < 2, description: 'Weave tougher shelter.' }
      ];
      return slotId === 'young' ? common.filter(order => order.id !== 'guard') : common;
    }
    validatePlan() {
      if (!living(this.state.creatures).length) return { ok: false, reason: 'No living family members can undertake an expedition.' };
      const cost = this.selectedOrders().filter(item => item.orderId === 'reinforce').length * 2;
      return cost > this.state.food ? { ok: false, reason: `Need ${cost} food for the planned reinforcement.` } : { ok: true, reason: '' };
    }
    resolveAssignments(plan, rng) {
      const alive = living(this.state.creatures);
      const counts = {};
      Object.values(plan).forEach(item => { counts[item.orderId] = (counts[item.orderId] || 0) + 1; });
      this.state.food += (counts.forage || 0) * Math.round(5 * this.effects.gather);
      this.state.threat -= (counts.guard || 0) * 18 * this.effects.defense;
      this.state.cohesion += (counts.nurture || 0) * 13 * this.effects.cohesion;
      this.state.cohesion += (counts.regroup || 0) * 6 * this.effects.cohesion;
      this.state.discoveries += (counts.scout || 0);
      this.state.nestSafety += (counts.reinforce || 0) * 14 * this.effects.build;
      this.state.food -= (counts.reinforce || 0) * 2 + Math.max(2, Math.ceil(alive.length / 3));
      const pressure = Math.max(0, this.state.threat - (counts.guard || 0) * 10);
      if (pressure > 28 && alive.length) {
        const target = alive[rng.int(0, alive.length - 1)];
        target.hp = clamp(target.hp - Math.round((8 + pressure * .16) / this.effects.defense), 0, 100);
      }
      if ((counts.nurture || 0) > 0) alive.forEach(creature => { creature.hp = clamp(creature.hp + 9, 0, 100); });
      if (this.state.food < 0) { this.state.cohesion -= 12; alive.forEach(creature => { creature.hp = clamp(creature.hp - 5, 0, 100); }); this.state.food = 0; }
      if (this.state.food >= 18 && this.state.nestSafety >= 50 && alive.length < 12) {
        const id = Math.max(0, ...this.state.creatures.map(creature => creature.id)) + 1;
        this.state.creatures.push({ id, name: `Kin ${id - 1}`, x: 190, y: 135, hp: 100, age: 2, aptitude: rng.pick(['forage', 'guard', 'nurture']), appearance: ns.CreatureAppearance.inherit(this.campaign.lineage.founder, this.campaign.lineage.mate, `${this.campaign.seed}:brood:${id}`), role: 'young' });
        this.state.food -= 6;
      }
      this.state.threat = clamp(this.state.threat + 9 - (counts.scout || 0) * 3, 0, 100);
      this.state.cohesion = clamp(this.state.cohesion - 3, 0, 100);
      this.state.nestSafety = clamp(this.state.nestSafety, 0, 100);
      this.campaign.lineage.populationPeak = Math.max(this.campaign.lineage.populationPeak, living(this.state.creatures).length);
      return [`${living(this.state.creatures).length} kin return; stores hold ${Math.floor(this.state.food)} food and the border threat is ${Math.round(this.state.threat)}.`];
    }
    updateMilestones() {
      const alive = living(this.state.creatures);
      this.addMilestone('stores', 'A reliable family store', this.state.food >= 20);
      this.addMilestone('safe', 'A defensible nest', this.state.nestSafety >= 62 && this.state.threat <= 42);
      this.addMilestone('family', 'Seven living kin', alive.length >= 7);
      this.addMilestone('cohesion', 'A coordinated family', this.state.cohesion >= 62 && this.state.discoveries >= 2);
    }
    objective() { return Object.assign(super.objective(), { title: 'Found a resilient family', text: 'Secure stores, defend the nest, grow the family, and learn to coordinate.' }); }
    stats() { return [['Cycle', this.state.cycle], ['Living Kin', living(this.state.creatures).length], ['Food', this.state.food], ['Cohesion', this.state.cohesion], ['Nest', this.state.nestSafety], ['Threat', this.state.threat]]; }
  }

  class CityChapter extends BaseChapter {
    enter() {
      if (!this.state.chapterId) {
        const count = Math.max(12, Math.min(24, this.campaign.lineage.populationPeak));
        const rng = ns.createRng(`${this.campaign.seed}:city:citizens`);
        const citizens = Array.from({ length: count }, (_, index) => this.createCitizen(index + 1, rng));
        Object.assign(this.state, { chapterId: 'city', cycle: 0, citizens, nextCitizenId: count + 1, food: 34, biomass: 28, knowledge: 10, health: 74, morale: 68, structures: [{ id: 1, type: 'nursery', x: 98, y: 131 }, { id: 2, type: 'foodBulb', x: 174, y: 150 }], selectedId: 1, policy: 'balanced', crisis: 18, plan: {}, actions: {}, milestones: [] });
      }
      this.state.citizens = this.state.citizens || [];
      super.enter();
      this.game.hint('Choose a civic priority and two projects. Citizens perform routine work autonomously.');
    }
    createCitizen(id, rng) { return { id, name: `Glow ${String(id).padStart(3, '0')}`, age: rng.int(6, 54), aptitude: rng.pick(['grower', 'builder', 'healer', 'scholar']), role: 'citizen', health: 70 + rng.int(0, 30), morale: 60 + rng.int(0, 35), parents: id > 12 ? [rng.int(1, id - 1), rng.int(1, id - 1)] : [] }; }
    cycleName() { return 'Season'; }
    slots() { return [{ id: 'policy', label: 'Civic Priority' }, { id: 'projectA', label: 'First Project' }, { id: 'projectB', label: 'Second Project' }]; }
    orders(slotId) {
      if (slotId === 'policy') return [
        { id: 'nourish', label: 'Nourish', forecast: '+food, +health', description: 'Growers lead routine work.' },
        { id: 'expand', label: 'Expand', forecast: '+biomass, +building', description: 'Builders receive first access to materials.' },
        { id: 'remember', label: 'Remember', forecast: '+knowledge, +morale', description: 'Scholars preserve ancestral memory.' }
      ];
      return [
        { id: 'garden', label: 'Grow Food Bulb', forecast: 'costs 9 biomass, +food production', disabled: this.state.biomass < 9, description: 'A symbiotic food garden.' },
        { id: 'nursery', label: 'Grow Nursery', forecast: 'costs 12 biomass, enables births', disabled: this.state.biomass < 12, description: 'Protected space for new kin.' },
        { id: 'pool', label: 'Grow Healing Pool', forecast: 'costs 14 biomass, +health', disabled: this.state.biomass < 14, description: 'Regenerative civic tissue.' },
        { id: 'tower', label: 'Grow Spore Tower', forecast: 'costs 18 biomass, +knowledge', disabled: this.state.biomass < 18, description: 'A living archive and signal tower.' },
        { id: 'festival', label: 'Hold Glow Festival', forecast: 'costs 8 food, +morale', disabled: this.state.food < 8, description: 'A season of shared stories.' },
        { id: 'reserve', label: 'Build Reserves', forecast: '+food, +biomass', description: 'Avoid a major project and prepare.' }
      ];
    }
    projectCost(id) { return { garden: { biomass: 9 }, nursery: { biomass: 12 }, pool: { biomass: 14 }, tower: { biomass: 18 }, festival: { food: 8 } }[id] || {}; }
    validatePlan() {
      const costs = { food: 0, biomass: 0 };
      this.selectedOrders().forEach(item => { const cost = this.projectCost(item.orderId); costs.food += cost.food || 0; costs.biomass += cost.biomass || 0; });
      if (costs.food > this.state.food) return { ok: false, reason: `Need ${costs.food} food for these projects.` };
      if (costs.biomass > this.state.biomass) return { ok: false, reason: `Need ${costs.biomass} biomass for these projects.` };
      return { ok: true, reason: '' };
    }
    resolveAssignments(plan, rng) {
      const policy = plan.policy.orderId;
      const aptitudeCount = aptitude => this.state.citizens.filter(citizen => citizen.health > 0 && citizen.aptitude === aptitude).length;
      this.state.food += 8 + aptitudeCount('grower') * .6 * this.effects.food;
      this.state.biomass += 6 + aptitudeCount('builder') * .4 * this.effects.build;
      this.state.knowledge += 3 + aptitudeCount('scholar') * .35 * this.effects.knowledge;
      if (policy === 'nourish') { this.state.food += 10; this.state.health += 7; }
      if (policy === 'expand') { this.state.biomass += 11; this.state.morale -= 3; }
      if (policy === 'remember') { this.state.knowledge += 9; this.state.morale += 7; }
      [plan.projectA, plan.projectB].forEach(item => {
        const cost = this.projectCost(item.orderId); this.state.food -= cost.food || 0; this.state.biomass -= cost.biomass || 0;
        if (['garden', 'nursery', 'pool', 'tower'].includes(item.orderId)) {
          const index = this.state.structures.length;
          const type = { garden: 'foodBulb', pool: 'healingPool', tower: 'sporeTower' }[item.orderId] || item.orderId;
          this.state.structures.push({ id: index + 1, type, x: 68 + (index * 61) % 280, y: 104 + (index % 3) * 37 });
        }
        if (item.orderId === 'festival') this.state.morale += 17;
        if (item.orderId === 'reserve') { this.state.food += 6; this.state.biomass += 5; }
      });
      const population = this.state.citizens.filter(citizen => citizen.health > 0).length;
      this.state.food -= Math.ceil(population * .24);
      const nurseries = this.state.structures.filter(item => item.type === 'nursery').length;
      if (nurseries && this.state.food >= 20 && population < ns.CONFIG.maxCreatures) {
        const births = Math.min(ns.CONFIG.maxCreatures - population, Math.max(1, Math.round(nurseries * this.effects.build)));
        for (let index = 0; index < births; index += 1) this.state.citizens.push(this.createCitizen(this.state.nextCitizenId++, rng));
        this.state.food -= births * 2;
        if (rng() < .35) this.campaign.lineage.generations += 1;
      }
      this.state.crisis -= 4 + rng.int(0, 4);
      if (this.state.crisis <= 0) { this.state.crisis = 18 + rng.int(0, 12); this.state.health -= 9 / this.effects.defense; this.state.morale -= 5; }
      if (this.state.food < 0) { this.state.health += this.state.food; this.state.morale += this.state.food; this.state.food = 0; }
      this.state.health = clamp(this.state.health, 0, 100); this.state.morale = clamp(this.state.morale, 0, 100);
      this.state.citizens.forEach(citizen => { citizen.health = clamp(citizen.health + (this.state.health - 55) * .04, 0, 100); citizen.morale = clamp(citizen.morale + (this.state.morale - 55) * .04, 0, 100); });
      this.campaign.lineage.populationPeak = Math.max(this.campaign.lineage.populationPeak, this.state.citizens.filter(citizen => citizen.health > 0).length);
      return [`The city closes the season with ${this.state.citizens.length} recorded lives and ${this.state.structures.length} living structures.`];
    }
    targetId() { return this.state.selectedId; }
    selectAt(pointer) {
      const structure = this.state.structures.find(item => Math.hypot(item.x - pointer.x, item.y - pointer.y) < 28);
      if (structure) this.state.selectedId = structure.id;
    }
    updateMilestones() {
      const population = this.state.citizens.filter(citizen => citizen.health > 0).length;
      this.addMilestone('population', 'A city of thirty lives', population >= 30);
      this.addMilestone('stores', 'A season of reserves', this.state.food >= 48);
      this.addMilestone('infrastructure', 'A diverse living city', new Set(this.state.structures.map(item => item.type)).size >= 4);
      this.addMilestone('memory', 'An enduring civic memory', this.state.knowledge >= 42);
      this.addMilestone('wellbeing', 'Healthy and hopeful citizens', this.state.health >= 70 && this.state.morale >= 70);
    }
    objective() { return Object.assign(super.objective(), { title: 'Grow a living city', text: 'Reach population, reserve, infrastructure, memory, and wellbeing milestones.' }); }
    stats() { return [['Cycle', this.state.cycle], ['Population', this.state.citizens.filter(c => c.health > 0).length], ['Food', this.state.food], ['Biomass', this.state.biomass], ['Knowledge', this.state.knowledge], ['Morale', this.state.morale]]; }
  }

  class WorldrootChapter extends BaseChapter {
    enter() {
      if (!this.state.chapterId) Object.assign(this.state, {
        chapterId: 'worldroot', cycle: 0, health: this.campaign.ecology.health, diversity: this.campaign.ecology.diversity, trust: 24, stores: 48, knowledge: 28, settlements: 2, bloomReadiness: 10, selectedRegion: 0, plan: {}, actions: {}, milestones: [],
        regions: [
          { id: 'clearing', name: 'First Clearing', x: 82, y: 127, biome: 'grove', health: 72, exhaustion: 0, settled: true },
          { id: 'marsh', name: 'Mirror Marsh', x: 165, y: 75, biome: 'marsh', health: 48, exhaustion: 0 },
          { id: 'ridge', name: 'Sailfin Ridge', x: 270, y: 52, biome: 'ridge', health: 61, exhaustion: 0 },
          { id: 'reaches', name: 'Amber Reaches', x: 310, y: 153, biome: 'desert', health: 37, exhaustion: 0 },
          { id: 'covenant', name: 'Wild Covenant', x: 172, y: 162, biome: 'wild', health: 78, exhaustion: 0 }
        ]
      });
      super.enter();
      this.game.hint('Select a region, assign three council mandates, then resolve the season.');
    }
    cycleName() { return 'Council Season'; }
    slots() { return [{ id: 'mandateA', label: 'First Mandate' }, { id: 'mandateB', label: 'Second Mandate' }, { id: 'mandateC', label: 'Third Mandate' }]; }
    targetId() { return this.state.regions[this.state.selectedRegion].id; }
    targetLabel(id) { const region = this.state.regions.find(item => item.id === id); return region ? region.name : ''; }
    selectAt(pointer) {
      const index = this.state.regions.findIndex(region => Math.hypot(region.x - pointer.x, region.y - pointer.y) < 25);
      if (index >= 0) { this.state.selectedRegion = index; this.game.hint(`${this.state.regions[index].name} selected for new mandates.`); }
    }
    orders() {
      const region = this.state.regions[this.state.selectedRegion];
      return [
        { id: 'restore', label: 'Restore Region', forecast: 'costs 8 stores, +regional health', disabled: this.state.stores < 8, description: 'Repair a damaged food web.' },
        { id: 'diplomacy', label: 'Trade and Listen', forecast: 'costs 4 knowledge, +trust and stores', disabled: this.state.knowledge < 4, description: 'Exchange spores, needs, and stories.' },
        { id: 'settle', label: 'Seed Settlement', forecast: 'costs 18 stores, establishes settlement', disabled: this.state.stores < 18 || region.settled, description: 'Establish a bounded settlement.' },
        { id: 'harvest', label: 'Controlled Harvest', forecast: '+stores, +regional exhaustion', disabled: region.exhaustion >= 70, description: 'Take only what the region can still bear.' },
        { id: 'research', label: 'Study Biome', forecast: '+knowledge, +diversity insight', description: 'Map the region without extracting it.' },
        { id: 'prepare', label: 'Grow Ark Organ', forecast: 'costs 12 stores and 5 knowledge', disabled: this.state.stores < 12 || this.state.knowledge < 5, description: 'Translate world knowledge into ark anatomy.' }
      ];
    }
    assignmentRegion(assignment) { return this.state.regions.find(region => region.id === assignment.targetId) || this.state.regions[this.state.selectedRegion]; }
    validatePlan() {
      let stores = 0; let knowledge = 0;
      this.selectedOrders().forEach(item => { if (item.orderId === 'restore') stores += 8; if (item.orderId === 'settle') stores += 18; if (item.orderId === 'prepare') { stores += 12; knowledge += 5; } if (item.orderId === 'diplomacy') knowledge += 4; });
      if (stores > this.state.stores) return { ok: false, reason: `Need ${stores} stores for these mandates.` };
      if (knowledge > this.state.knowledge) return { ok: false, reason: `Need ${knowledge} knowledge for these mandates.` };
      return { ok: true, reason: '' };
    }
    resolveAssignments(plan) {
      Object.values(plan).forEach(item => {
        const region = this.assignmentRegion(item);
        if (item.orderId === 'restore') { this.state.stores -= 8; region.health += 18 * this.effects.ecology; region.exhaustion -= 12; this.state.health += 4; }
        if (item.orderId === 'diplomacy') { this.state.knowledge -= 4; this.state.trust += 10 * this.effects.diplomacy; this.state.stores += 5; }
        if (item.orderId === 'settle' && !region.settled) { this.state.stores -= 18; region.settled = true; this.state.settlements += 1; region.exhaustion += 8; }
        if (item.orderId === 'harvest') { this.state.stores += Math.max(3, 11 - region.exhaustion * .08) * this.effects.storm; region.health -= 7; region.exhaustion += 22; }
        if (item.orderId === 'research') { this.state.knowledge += 9 * this.effects.knowledge; this.state.diversity += region.health > 55 ? 3 : 1; region.exhaustion -= 4; }
        if (item.orderId === 'prepare') { this.state.stores -= 12; this.state.knowledge -= 5; this.state.bloomReadiness += 14 * this.effects.build; }
      });
      this.state.regions.forEach(region => { region.health = clamp(region.health + (region.exhaustion < 25 ? 2 : -region.exhaustion * .025), 0, 100); region.exhaustion = clamp(region.exhaustion - 3, 0, 100); });
      this.state.stores += this.state.settlements * 2;
      this.state.health = clamp(this.state.regions.reduce((sum, region) => sum + region.health, 0) / this.state.regions.length, 0, 100);
      this.state.diversity = clamp(this.state.diversity, 0, 100); this.state.trust = clamp(this.state.trust, 0, 100); this.state.bloomReadiness = clamp(this.state.bloomReadiness, 0, 100);
      this.campaign.ecology.health = this.state.health; this.campaign.ecology.diversity = this.state.diversity;
      return [`The council adjourns with world health at ${Math.round(this.state.health)} and ark readiness at ${Math.round(this.state.bloomReadiness)}.`];
    }
    updateMilestones() {
      this.addMilestone('regions', 'Three restored regions', this.state.regions.filter(region => region.health >= 65).length >= 3);
      this.addMilestone('trust', 'A trusted world council', this.state.trust >= 58);
      this.addMilestone('settlements', 'Four bounded settlements', this.state.settlements >= 4);
      this.addMilestone('ark', 'A complete ark plan', this.state.bloomReadiness >= 90);
      this.addMilestone('ecology', 'A resilient world', this.state.health >= 68 && this.state.diversity >= 55);
    }
    objective() { return Object.assign(super.objective(), { title: 'Prepare for the Great Bloom', text: 'Restore regions, build trust, settle carefully, protect diversity, and complete the ark.' }); }
    stats() { return [['Cycle', this.state.cycle], ['Settlements', this.state.settlements], ['World Health', this.state.health], ['Diversity', this.state.diversity], ['Trust', this.state.trust], ['Ark Plan', this.state.bloomReadiness]]; }
  }

  class BloomChapter extends BaseChapter {
    enter() {
      if (!this.state.chapterId) Object.assign(this.state, { chapterId: 'bloom', cycle: 0, distance: 0, destination: 2100, seeds: Math.floor(24 * this.effects.seed), hull: 100, cohesion: 74, stores: 52, routeKnowledge: 0, encounters: [], selectedRoute: 'sheltered', landed: false, player: { x: 110, y: 108 }, plan: {}, actions: {}, milestones: [] });
      super.enter();
      this.game.hint('Choose a route, an ark-organ duty, and a crew posture for the next voyage leg.');
    }
    cycleName() { return 'Voyage Leg'; }
    slots() { return [{ id: 'route', label: 'Route' }, { id: 'organ', label: 'Ark Organ' }, { id: 'posture', label: 'Crew Posture' }]; }
    orders(slotId) {
      if (slotId === 'route') return [
        { id: 'sheltered', label: 'Sheltered Current', forecast: '+145 distance, low danger', description: 'A slower route among stable cloud-roots.' },
        { id: 'bright', label: 'Bright Expanse', forecast: '+185 distance, seed opportunity', description: 'Cross open light rich with drifting life.' },
        { id: 'storm', label: 'Storm Corridor', forecast: '+220 distance, high hull risk', description: 'Ride violent weather inherited from Worldroot.' }
      ];
      if (slotId === 'organ') return [
        { id: 'repair', label: 'Regrow Hull', forecast: 'costs 7 stores, +hull', disabled: this.state.stores < 7, description: 'Direct living tissue to damaged plates.' },
        { id: 'cultivate', label: 'Cultivate Stores', forecast: 'costs 2 seeds, +stores', disabled: this.state.seeds < 2, description: 'Germinate part of the seedbank for provisions.' },
        { id: 'sails', label: 'Open Storm Sails', forecast: '+distance, greater exposure', description: 'Use inherited morphology to catch the Bloom.' },
        { id: 'seedvault', label: 'Tend Seed Vault', forecast: '+seeds, -stores', disabled: this.state.stores < 4, description: 'Preserve and propagate viable life.' }
      ];
      return [
        { id: 'cautious', label: 'Cautious Watch', forecast: '-risk, +cohesion', description: 'Protect the vulnerable and avoid surprises.' },
        { id: 'balanced', label: 'Steady Rhythm', forecast: 'balanced consumption and risk', description: 'Keep every crew circle in rhythm.' },
        { id: 'bold', label: 'Bold Passage', forecast: '+distance, -cohesion on trouble', description: 'Trust the ark and press forward.' },
        { id: 'chorus', label: 'Ancestral Chorus', forecast: 'costs 4 stores, +cohesion and insight', disabled: this.state.stores < 4, description: 'Navigate by the lineage\'s accumulated memory.' }
      ];
    }
    validatePlan() {
      let stores = 0; let seeds = 0;
      this.selectedOrders().forEach(item => { if (item.orderId === 'repair') stores += 7; if (item.orderId === 'seedvault' || item.orderId === 'chorus') stores += 4; if (item.orderId === 'cultivate') seeds += 2; });
      if (stores > this.state.stores) return { ok: false, reason: `Need ${stores} stores for this voyage plan.` };
      if (seeds > this.state.seeds) return { ok: false, reason: `Need ${seeds} seeds for this voyage plan.` };
      return { ok: true, reason: '' };
    }
    resolveAssignments(plan, rng) {
      const route = plan.route.orderId; const organ = plan.organ.orderId; const posture = plan.posture.orderId;
      let distance = { sheltered: 145, bright: 185, storm: 220 }[route] * this.effects.mobility;
      let danger = { sheltered: 8, bright: 18, storm: 34 }[route];
      if (organ === 'repair') { this.state.stores -= 7; this.state.hull += 22 * this.effects.build; }
      if (organ === 'cultivate') { this.state.seeds -= 2; this.state.stores += 13 * this.effects.food; }
      if (organ === 'sails') { distance += 35 * this.effects.storm; danger += 8; }
      if (organ === 'seedvault') { this.state.stores -= 4; this.state.seeds += Math.round(5 * this.effects.seed); }
      if (posture === 'cautious') { danger -= 10; distance -= 20; this.state.cohesion += 5; }
      if (posture === 'bold') { distance += 20; danger += 7; }
      if (posture === 'chorus') { this.state.stores -= 4; this.state.cohesion += 14 * this.effects.cohesion; this.state.routeKnowledge += 1; danger -= 5; }
      if (route === 'bright' && rng() < .75) this.state.seeds += Math.round(4 * this.effects.seed);
      const roll = rng() * 100;
      let event = 'A quiet current carries the ark between luminous weather fronts.';
      if (roll < danger) { const damage = Math.round((9 + danger * .25) / this.effects.defense); this.state.hull -= damage; this.state.cohesion -= posture === 'bold' ? 9 : 4; event = `Storm debris tears ${damage} integrity from the living hull.`; }
      else if (roll > 78) { this.state.seeds += 3; this.state.routeKnowledge += 1; event = 'Scouts recover a drifting family of viable seed-lights.'; }
      this.state.distance += distance;
      this.state.stores -= 4;
      this.state.cohesion += this.state.stores > 8 ? 1 : -7;
      this.state.hull = clamp(this.state.hull, 0, 100); this.state.cohesion = clamp(this.state.cohesion, 0, 100); this.state.stores = Math.max(0, this.state.stores);
      this.state.encounters.push({ cycle: this.state.cycle + 1, route, event });
      this.state.landed = this.state.distance >= this.state.destination && this.state.seeds >= 28 && this.state.hull > 0 && this.state.cohesion >= 35;
      return [event, `The ark has crossed ${Math.min(100, Math.floor(this.state.distance / this.state.destination * 100))}% of the Bloom.`];
    }
    updateMilestones() {
      this.addMilestone('crossing', 'The far current reached', this.state.distance >= this.state.destination);
      this.addMilestone('seedbank', 'A viable seedbank', this.state.seeds >= 28);
      this.addMilestone('ark', 'The living ark endures', this.state.hull >= 45 && this.state.distance >= 1200);
      this.addMilestone('people', 'The crew remains one people', this.state.cohesion >= 55 && this.state.distance >= 1200);
      this.state.landed = this.state.distance >= this.state.destination && this.state.seeds >= 28 && this.state.hull > 0 && this.state.cohesion >= 35;
    }
    ready() { return this.state.landed && this.state.milestones.length >= 4; }
    objective() { return Object.assign(super.objective(), { title: this.state.distance >= this.state.destination ? 'Seed the new world' : 'Cross the Bloom', text: 'Reach compatible land with a viable seedbank, enduring ark, and cohesive crew.' }); }
    stats() { return [['Cycle', this.state.cycle], ['Journey', `${Math.min(100, Math.floor(this.state.distance / this.state.destination * 100))}%`], ['Seedbank', this.state.seeds], ['Hull', this.state.hull], ['Cohesion', this.state.cohesion], ['Stores', this.state.stores]]; }
  }

  const CHAPTER_CLASSES = [FirstGlowChapter, BroodChapter, CityChapter, WorldrootChapter, BloomChapter];
  ns.BaseChapter = BaseChapter;
  ns.FirstGlowChapter = FirstGlowChapter;
  ns.BroodChapter = BroodChapter;
  ns.CityChapter = CityChapter;
  ns.WorldrootChapter = WorldrootChapter;
  ns.BloomChapter = BloomChapter;
  ns.createChapter = (game, campaign) => new CHAPTER_CLASSES[campaign.chapter](game, campaign);
})(window.Lumenkin = window.Lumenkin || {});
