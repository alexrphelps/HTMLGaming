(function (ns) {
  'use strict';

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  class BaseChapter {
    constructor(game, campaign) {
      this.game = game;
      this.campaign = campaign;
      this.rng = ns.createRng(`${campaign.seed}:chapter:${campaign.chapter}`);
      this.effects = ns.effectsFor(campaign.lineage);
      this.time = 0;
      this.state = campaign.chapterState;
    }
    enter() { this.state.chapterId = ns.CONFIG.chapters[this.campaign.chapter].id; }
    update(dt) { this.time += dt; }
    objective() { return { title: '', text: '', value: 0, target: ns.CONFIG.chapters[this.campaign.chapter].target }; }
    stats() { return []; }
    actions() { return []; }
    click() {}
    ready() { const objective = this.objective(); return objective.value >= objective.target; }
    serialize() { return this.state; }
    cleanup() {}
    action(id, amount) {
      this.state.actions = this.state.actions || {};
      this.state.actions[id] = (this.state.actions[id] || 0) + (amount || 1);
    }
  }

  class FirstGlowChapter extends BaseChapter {
    enter() {
      if (!this.state.chapterId) {
        Object.assign(this.state, {
          chapterId: 'first-glow', progress: 0, age: 2, health: 100, hunger: 76, rest: 82, joy: 64, trust: 20,
          food: 3, motes: [{ x: 90, y: 169 }, { x: 205, y: 156 }, { x: 330, y: 174 }],
          player: { x: 72, y: 160, vx: 0, facing: 1 }, nest: 12, mateAttracted: false, mateBond: 0, cooldown: 0, actions: {}
        });
      }
      this.game.hint('WASD explores · Walk through motes · Care actions build trust');
    }
    update(dt, input) {
      super.update(dt);
      const axis = input.axis();
      const speed = 48 * this.effects.mobility;
      this.state.player.vx += (axis.x * speed - this.state.player.vx) * Math.min(1, dt * 8);
      this.state.player.x = clamp(this.state.player.x + this.state.player.vx * dt, 18, 366);
      if (axis.x) this.state.player.facing = axis.x;
      this.state.age += dt * .16;
      this.state.hunger = clamp(this.state.hunger - dt * .7, 0, 100);
      this.state.rest = clamp(this.state.rest - dt * .34, 0, 100);
      this.state.joy = clamp(this.state.joy - dt * .24, 0, 100);
      this.state.cooldown = Math.max(0, this.state.cooldown - dt);
      if (this.state.hunger < 18 || this.state.rest < 12) this.state.health = clamp(this.state.health - dt * 1.5, 0, 100);
      else this.state.health = clamp(this.state.health + dt * .18, 0, 100);
      this.state.motes.forEach(mote => {
        if (!mote.taken && Math.abs(mote.x - this.state.player.x) < 15) {
          mote.taken = true; this.state.food += 1; this.state.progress += 3 * this.effects.gather;
          this.game.particles.emit(mote.x, mote.y, '#55f6e8', 8, 20);
          this.game.log('Luma found a cluster of sweet light-motes.');
        }
      });
      if (this.state.motes.every(mote => mote.taken)) {
        this.state.motes = Array.from({ length: 3 }, (_, i) => ({ x: 65 + i * 126 + this.rng.int(-20, 20), y: 151 + this.rng.int(0, 26) }));
      }
      if (!this.state.mateAttracted && this.state.nest >= 55 && this.state.trust >= 55) {
        this.state.mateAttracted = true;
        this.campaign.lineage.mate = ns.CreatureAppearance.inherit(this.campaign.lineage.founder, ns.CreatureAppearance.fromGenes({ body: this.rng.pick(['swift', 'shell', 'crest']), palette: this.rng.pick(['cyan', 'coral', 'gold']) }, `${this.campaign.seed}:wild`), `${this.campaign.seed}:mate`);
        this.game.log('A wild glow answers the nest-song. A potential mate has arrived.');
      }
      this.state.progress = Math.max(this.state.progress, this.state.trust * .45 + this.state.nest * .35 + this.state.mateBond * .6);
    }
    care(kind, cost, changes) {
      if (this.state.cooldown > 0 || (cost && this.state.food < cost)) return;
      if (cost) this.state.food -= cost;
      Object.keys(changes).forEach(key => { this.state[key] = clamp(this.state[key] + changes[key], 0, 100); });
      this.state.cooldown = .75;
      this.state.progress += 2;
      this.action(kind);
      this.game.particles.emit(this.state.player.x, 148, kind === 'feed' ? '#ffad6b' : '#55f6e8', 7, 16);
    }
    actions() {
      const actions = [
        { id: 'feed', label: `Feed (${this.state.food})`, disabled: this.state.food < 1, run: () => this.care('feed', 1, { hunger: 25, trust: 3 }) },
        { id: 'groom', label: 'Groom', run: () => this.care('groom', 0, { health: 8, trust: 5 }) },
        { id: 'play', label: 'Play', run: () => this.care('play', 0, { joy: 22, rest: -5, trust: 6 }) },
        { id: 'sleep', label: 'Rest', run: () => this.care('sleep', 0, { rest: 28, hunger: -5 }) },
        { id: 'nest', label: 'Shape Nest', run: () => { if (this.state.cooldown <= 0) { this.state.nest = clamp(this.state.nest + 8, 0, 100); this.state.cooldown = 1; this.action('hearthbound'); this.game.log('The habitat grows warmer and more inviting.'); } } }
      ];
      if (this.state.mateAttracted) actions.push({ id: 'bond', label: 'Share Glow', run: () => { if (this.state.cooldown <= 0) { this.state.mateBond = clamp(this.state.mateBond + 9, 0, 100); this.state.trust = clamp(this.state.trust + 2, 0, 100); this.state.cooldown = 1.1; this.action('bond'); this.game.log('Two glow-patterns begin to pulse together.'); } } });
      return actions;
    }
    objective() { return { title: this.state.mateAttracted ? 'Form the first bond' : 'Raise a thriving adult', text: this.state.mateAttracted ? 'Care for the visitor until both creatures choose a shared nest.' : 'Explore for food, build trust, and shape a habitat attractive to wild kin.', value: Math.floor(this.state.progress), target: 100 }; }
    stats() { return [['Hunger', this.state.hunger], ['Rest', this.state.rest], ['Joy', this.state.joy], ['Trust', this.state.trust], ['Nest', this.state.nest], ['Bond', this.state.mateBond]]; }
  }

  class BroodChapter extends BaseChapter {
    enter() {
      if (!this.state.chapterId) {
        const founder = this.campaign.lineage.founder;
        const mate = this.campaign.lineage.mate || ns.CreatureAppearance.fromGenes({ body: 'crest', palette: 'cyan' }, `${this.campaign.seed}:mate`);
        const creatures = [{ id: 1, x: 190, y: 108, hp: 100, age: 36, appearance: founder, role: 'leader' }, { id: 2, x: 174, y: 120, hp: 100, age: 32, appearance: mate, role: 'mate' }];
        for (let i = 0; i < 3; i += 1) creatures.push({ id: 3 + i, x: 164 + i * 13, y: 135, hp: 100, age: 8, appearance: ns.CreatureAppearance.inherit(founder, mate, `${this.campaign.seed}:child:${i}`), role: 'young' });
        Object.assign(this.state, {
          chapterId: 'brood', progress: 0, playerId: 1, creatures, food: 8, carried: 0, cohesion: 34, nestSafety: 30,
          predators: [{ x: 320, y: 56, hp: 35, active: true }, { x: 52, y: 174, hp: 35, active: true }],
          forage: [{ x: 72, y: 55, amount: 4 }, { x: 311, y: 171, amount: 4 }, { x: 286, y: 73, amount: 4 }], rally: false, cooldown: 0, actions: {}
        });
      }
      this.game.hint('WASD possess leader · Q rally · Gather blooms and defend the family');
    }
    update(dt, input) {
      super.update(dt);
      const leader = this.state.creatures.find(c => c.id === this.state.playerId) || this.state.creatures[0];
      const axis = input.axis();
      const length = Math.hypot(axis.x, axis.y) || 1;
      const speed = 54 * this.effects.mobility;
      leader.x = clamp(leader.x + axis.x / length * speed * dt, 12, 372);
      leader.y = clamp(leader.y + axis.y / length * speed * dt, 25, 204);
      if (input.consume('q')) { this.state.rally = !this.state.rally; this.game.log(this.state.rally ? 'The family closes ranks.' : 'The family spreads out to forage.'); }
      this.state.creatures.filter(c => c !== leader).forEach((creature, index) => {
        const angle = index / Math.max(1, this.state.creatures.length - 1) * Math.PI * 2;
        const desired = this.state.rally ? 18 : 28 + index * 2;
        const target = { x: leader.x + Math.cos(angle) * desired, y: leader.y + Math.sin(angle) * desired };
        creature.x += (target.x - creature.x) * dt * (this.state.rally ? 4 : 2.2);
        creature.y += (target.y - creature.y) * dt * (this.state.rally ? 4 : 2.2);
      });
      this.state.forage.forEach(node => {
        if (node.amount > 0 && distance(leader, node) < 15) {
          node.amount -= dt * this.effects.gather;
          this.state.carried = clamp(this.state.carried + dt * this.effects.gather, 0, 8);
          this.state.progress += dt * 1.2;
          if (this.rng() < dt * 6) this.game.particles.emit(node.x, node.y, '#55f6e8', 2, 10);
        }
      });
      this.state.predators.forEach(predator => {
        if (!predator.active) return;
        const target = this.state.creatures.reduce((best, creature) => distance(predator, creature) < distance(predator, best) ? creature : best, this.state.creatures[0]);
        const d = Math.max(1, distance(predator, target));
        predator.x += (target.x - predator.x) / d * 16 * dt;
        predator.y += (target.y - predator.y) / d * 16 * dt;
        if (d < 13) target.hp = clamp(target.hp - dt * 4 / this.effects.defense, 0, 100);
      });
      this.state.cooldown = Math.max(0, this.state.cooldown - dt);
      this.state.cohesion = clamp(this.state.cohesion + (this.state.rally ? dt * .35 : -dt * .05), 0, 100);
      this.state.progress += dt * .2 + this.state.creatures.length * dt * .012;
      this.campaign.lineage.populationPeak = Math.max(this.campaign.lineage.populationPeak, this.state.creatures.length);
    }
    actions() {
      return [
        { id: 'deposit', label: `Store ${Math.floor(this.state.carried)}`, disabled: this.state.carried < 1, run: () => { this.state.food += Math.floor(this.state.carried); this.state.progress += this.state.carried * 2; this.state.carried = 0; this.action('pathfinders'); } },
        { id: 'defend', label: 'Defend', run: () => { if (this.state.cooldown <= 0) { const leader = this.state.creatures[0]; const predator = this.state.predators.filter(p => p.active).sort((a, b) => distance(a, leader) - distance(b, leader))[0]; if (predator && distance(predator, leader) < 75) { predator.hp -= 18 * this.effects.defense; if (predator.hp <= 0) { predator.active = false; this.state.progress += 18; this.game.log('The family drives a dusk-stalker away.'); } } this.state.cooldown = 1; this.action('wardens'); } } },
        { id: 'fortify', label: 'Fortify Nest', disabled: this.state.food < 3, run: () => { if (this.state.food >= 3) { this.state.food -= 3; this.state.nestSafety = clamp(this.state.nestSafety + 12, 0, 100); this.state.progress += 8; this.action('hearthbound'); } } },
        { id: 'clutch', label: 'Raise Clutch', disabled: this.state.food < 6 || this.state.creatures.length >= 12, run: () => { if (this.state.food >= 6 && this.state.creatures.length < 12) { this.state.food -= 6; const id = this.state.creatures.length + 1; this.state.creatures.push({ id, x: 190, y: 125, hp: 100, age: 2, appearance: ns.CreatureAppearance.inherit(this.campaign.lineage.founder, this.campaign.lineage.mate, `${this.campaign.seed}:brood:${id}`), role: 'young' }); this.state.progress += 14; this.game.log('A new glow joins the family circle.'); } } }
      ];
    }
    objective() { return { title: 'Found a resilient family', text: 'Gather together, defend vulnerable young, and grow enough kin to establish a settlement.', value: Math.floor(this.state.progress + this.state.creatures.length * 3 + this.state.nestSafety * .2), target: 160 }; }
    stats() { return [['Family', this.state.creatures.length], ['Food', Math.floor(this.state.food)], ['Cohesion', this.state.cohesion], ['Nest', this.state.nestSafety], ['Predators', this.state.predators.filter(p => p.active).length], ['Carried', Math.floor(this.state.carried)]]; }
  }

  class CityChapter extends BaseChapter {
    enter() {
      if (!this.state.chapterId) Object.assign(this.state, {
        chapterId: 'city', progress: 0, population: Math.max(12, this.campaign.lineage.populationPeak), food: 36, biomass: 24,
        knowledge: 8, health: 76, morale: 70, structures: [{ type: 'nursery', x: 98, y: 131 }, { type: 'foodBulb', x: 174, y: 150 }],
        priorities: 'balanced', selected: null, growthClock: 0, crisisClock: 40, actions: {}
      });
      this.game.hint('Mouse inspects sites · Build living infrastructure · Population acts autonomously');
    }
    update(dt, input) {
      super.update(dt);
      this.state.growthClock += dt;
      this.state.crisisClock -= dt;
      const gardens = this.state.structures.filter(s => s.type === 'foodBulb').length;
      const nurseries = this.state.structures.filter(s => s.type === 'nursery').length;
      const pools = this.state.structures.filter(s => s.type === 'healingPool').length;
      const towers = this.state.structures.filter(s => s.type === 'sporeTower').length;
      this.state.food += dt * (gardens * 1.25 * this.effects.food - this.state.population * .045);
      this.state.biomass += dt * (.32 + gardens * .08);
      this.state.knowledge += dt * (towers * .24 + .04) * this.effects.knowledge;
      this.state.health = clamp(this.state.health + dt * (pools * .16 - (this.state.food < 0 ? .8 : .02)), 0, 100);
      this.state.morale = clamp(this.state.morale + dt * (this.state.food > 5 ? .05 : -.5), 0, 100);
      if (this.state.growthClock > 9 && this.state.food > 12 && this.state.population < ns.CONFIG.maxCreatures) {
        this.state.growthClock = 0;
        this.state.population = Math.min(ns.CONFIG.maxCreatures, this.state.population + Math.max(1, Math.floor(nurseries * this.effects.build)));
        this.state.food -= 4;
        this.campaign.lineage.generations += this.rng() < .25 ? 1 : 0;
      }
      if (this.state.crisisClock <= 0) {
        this.state.crisisClock = 42 + this.rng.int(0, 25);
        this.state.food -= 8;
        this.state.health -= 5 / this.effects.defense;
        this.game.log('A spore-fever passes through the outer nurseries. Recovery remains possible.');
      }
      this.state.progress = this.state.population * 1.2 + this.state.structures.length * 12 + this.state.knowledge * .7 + this.state.health * .2;
      this.campaign.lineage.populationPeak = Math.max(this.campaign.lineage.populationPeak, this.state.population);
      if (input.pointer.clicked) this.state.selected = this.nearestStructure(input.pointer);
    }
    nearestStructure(pointer) { return this.state.structures.find(structure => Math.hypot(structure.x - pointer.x, structure.y - pointer.y) < 26) || null; }
    build(type, cost, x, y) {
      if (this.state.biomass < cost) return;
      this.state.biomass -= cost;
      const index = this.state.structures.length;
      this.state.structures.push({ type, x: x || 68 + (index * 61) % 280, y: y || 104 + (index % 3) * 37 });
      this.action(type === 'foodBulb' ? 'symbiotic-gardens' : type === 'sporeTower' ? 'memory-chorus' : 'brood-foundries');
      this.game.log(`The colony grows a new ${type.replace(/([A-Z])/g, ' $1').toLowerCase()}.`);
    }
    actions() {
      return [
        { id: 'nursery', label: 'Nursery · 12', disabled: this.state.biomass < 12, run: () => this.build('nursery', 12) },
        { id: 'garden', label: 'Food Bulb · 9', disabled: this.state.biomass < 9, run: () => this.build('foodBulb', 9) },
        { id: 'pool', label: 'Healing Pool · 14', disabled: this.state.biomass < 14, run: () => this.build('healingPool', 14) },
        { id: 'tower', label: 'Spore Tower · 18', disabled: this.state.biomass < 18, run: () => this.build('sporeTower', 18) },
        { id: 'festival', label: 'Glow Festival', disabled: this.state.food < 10, run: () => { if (this.state.food >= 10) { this.state.food -= 10; this.state.morale = clamp(this.state.morale + 18, 0, 100); this.state.progress += 8; } } }
      ];
    }
    objective() { return { title: 'Grow a living city', text: 'Balance autonomous population needs while growing nurseries, gardens, healing pools, and memory towers.', value: Math.floor(this.state.progress), target: 240 }; }
    stats() { return [['Population', this.state.population], ['Food', Math.floor(this.state.food)], ['Biomass', Math.floor(this.state.biomass)], ['Knowledge', Math.floor(this.state.knowledge)], ['Health', this.state.health], ['Morale', this.state.morale]]; }
  }

  class WorldrootChapter extends BaseChapter {
    enter() {
      if (!this.state.chapterId) Object.assign(this.state, {
        chapterId: 'worldroot', progress: 0, health: this.campaign.ecology.health, diversity: this.campaign.ecology.diversity,
        trust: 20, stores: 45, knowledge: 25, settlements: 2, restored: 0, exploited: 0, bloomReadiness: 0,
        selectedRegion: 0, weather: 'Spore rain', actions: {}, regions: [
          { name: 'First Clearing', x: 82, y: 127, biome: 'grove', health: 72 },
          { name: 'Mirror Marsh', x: 165, y: 75, biome: 'marsh', health: 48 },
          { name: 'Sailfin Ridge', x: 270, y: 52, biome: 'ridge', health: 61 },
          { name: 'Amber Reaches', x: 310, y: 153, biome: 'desert', health: 37 },
          { name: 'Wild Covenant', x: 172, y: 162, biome: 'wild', health: 78 }
        ]
      });
      this.game.hint('Click regions · Restore, trade, settle, or harvest · Prepare the ark plan');
    }
    update(dt, input) {
      super.update(dt);
      this.state.stores += dt * (this.state.settlements * .08 - .05);
      this.state.knowledge += dt * .025 * this.effects.knowledge;
      this.state.health = clamp(this.state.health + dt * (this.state.restored * .018 - this.state.exploited * .012), 0, 100);
      this.state.diversity = clamp(this.state.diversity + dt * (this.state.restored * .01 - this.state.exploited * .006), 0, 100);
      this.state.progress = this.state.bloomReadiness * 1.5 + this.state.settlements * 16 + this.state.trust * .45 + this.state.health * .35 + this.state.diversity * .35;
      if (input.pointer.clicked) {
        const region = this.state.regions.findIndex(item => Math.hypot(item.x - input.pointer.x, item.y - input.pointer.y) < 24);
        if (region >= 0) { this.state.selectedRegion = region; this.game.log(`${this.state.regions[region].name} enters the council's attention.`); }
      }
    }
    actions() {
      const region = this.state.regions[this.state.selectedRegion];
      return [
        { id: 'restore', label: 'Restore · 8', disabled: this.state.stores < 8, run: () => { if (this.state.stores >= 8) { this.state.stores -= 8; region.health = clamp(region.health + 14 * this.effects.ecology, 0, 100); this.state.restored += 1; this.state.health += 3; this.action('restoration-pact'); } } },
        { id: 'trade', label: 'Trade Spores', disabled: this.state.knowledge < 4, run: () => { if (this.state.knowledge >= 4) { this.state.knowledge -= 4; this.state.trust = clamp(this.state.trust + 9 * this.effects.diplomacy, 0, 100); this.state.stores += 5; this.action('wild-covenant'); } } },
        { id: 'settle', label: 'Seed Settlement · 18', disabled: this.state.stores < 18 || region.settled, run: () => { if (this.state.stores >= 18 && !region.settled) { this.state.stores -= 18; region.settled = true; this.state.settlements += 1; this.state.progress += 12; } } },
        { id: 'harvest', label: 'Harvest Storm', run: () => { region.health = clamp(region.health - 6, 0, 100); this.state.stores += 9 * this.effects.storm; this.state.exploited += 1; this.action('storm-harvest'); } },
        { id: 'prepare', label: 'Grow Ark Plan · 12', disabled: this.state.stores < 12 || this.state.knowledge < 5, run: () => { if (this.state.stores >= 12 && this.state.knowledge >= 5) { this.state.stores -= 12; this.state.knowledge -= 5; this.state.bloomReadiness = clamp(this.state.bloomReadiness + 12 * this.effects.build, 0, 100); this.game.log('Another living ark organ is understood and prepared.'); } } }
      ];
    }
    objective() { return { title: 'Prepare for the Great Bloom', text: `Balance five regions, rival trust, and ecological health while growing a viable ark plan. Selected: ${this.state.regions[this.state.selectedRegion].name}.`, value: Math.floor(this.state.progress), target: 300 }; }
    stats() { return [['Settlements', this.state.settlements], ['World Health', this.state.health], ['Diversity', this.state.diversity], ['Rival Trust', this.state.trust], ['Stores', Math.floor(this.state.stores)], ['Ark Plan', this.state.bloomReadiness]]; }
  }

  class BloomChapter extends BaseChapter {
    enter() {
      if (!this.state.chapterId) Object.assign(this.state, {
        chapterId: 'bloom', distance: 0, seeds: Math.floor(20 * this.effects.seed), hull: 100, cohesion: 72, stores: 45,
        player: { x: 88, y: 108, vx: 0, vy: 0 }, hazards: [], motes: [], spawnClock: 0, progress: 0,
        destination: 1800, landed: false, actions: {}
      });
      this.game.hint('WASD steer the living ark · Gather seed-lights · Avoid storm debris');
    }
    update(dt, input) {
      super.update(dt);
      const axis = input.axis();
      this.state.player.vx += (axis.x * 32 - this.state.player.vx) * dt * 3;
      this.state.player.vy += (axis.y * 42 - this.state.player.vy) * dt * 3;
      this.state.player.x = clamp(this.state.player.x + this.state.player.vx * dt, 55, 250);
      this.state.player.y = clamp(this.state.player.y + this.state.player.vy * dt, 38, 178);
      const speed = 18 + Math.max(0, this.state.player.vx) * .3;
      this.state.distance += speed * dt * this.effects.mobility;
      this.state.spawnClock -= dt;
      if (this.state.spawnClock <= 0) {
        this.state.spawnClock = .8 + this.rng();
        if (this.rng() < .6) this.state.hazards.push({ x: 400, y: this.rng.int(34, 185), size: this.rng.int(4, 10), hit: false });
        else this.state.motes.push({ x: 400, y: this.rng.int(34, 185), taken: false });
      }
      this.state.hazards.forEach(hazard => {
        hazard.x -= speed * 2.2 * dt;
        if (!hazard.hit && Math.abs(hazard.x - this.state.player.x) < 40 && Math.abs(hazard.y - this.state.player.y) < 22) {
          hazard.hit = true; this.state.hull = clamp(this.state.hull - 7 / this.effects.defense, 0, 100); this.game.particles.emit(hazard.x, hazard.y, '#ff668c', 12, 28);
        }
      });
      this.state.motes.forEach(mote => {
        mote.x -= speed * 1.9 * dt;
        if (!mote.taken && Math.abs(mote.x - this.state.player.x) < 40 && Math.abs(mote.y - this.state.player.y) < 23) {
          mote.taken = true; this.state.seeds += 1; this.state.stores += 2; this.game.particles.emit(mote.x, mote.y, '#ffd45b', 10, 22);
        }
      });
      this.state.hazards = this.state.hazards.filter(item => item.x > -20);
      this.state.motes = this.state.motes.filter(item => item.x > -20 && !item.taken);
      this.state.stores = Math.max(0, this.state.stores - dt * .08);
      this.state.cohesion = clamp(this.state.cohesion + dt * (this.state.stores > 5 ? .025 : -.3), 0, 100);
      this.state.progress = this.state.distance * .16 + this.state.seeds * 2 + this.state.hull * .2 + this.state.cohesion * .15;
      if (this.state.distance >= this.state.destination && this.state.seeds >= 25 && this.state.hull > 0) this.state.landed = true;
    }
    actions() {
      return [
        { id: 'repair', label: 'Regrow Hull · 8', disabled: this.state.stores < 8 || this.state.hull >= 100, run: () => { if (this.state.stores >= 8) { this.state.stores -= 8; this.state.hull = clamp(this.state.hull + 18 * this.effects.build, 0, 100); } } },
        { id: 'cultivate', label: 'Cultivate Stores', disabled: this.state.seeds < 2, run: () => { if (this.state.seeds >= 2) { this.state.seeds -= 2; this.state.stores += 10 * this.effects.food; this.state.cohesion += 3; } } },
        { id: 'storm', label: 'Open Storm Sails', run: () => { this.state.distance += 18 * this.effects.storm; this.state.hull -= this.effects.storm > 1.1 ? 1 : 4; this.action('storm-sail'); } },
        { id: 'sing', label: 'Ancestral Chorus', disabled: this.state.stores < 4, run: () => { if (this.state.stores >= 4) { this.state.stores -= 4; this.state.cohesion = clamp(this.state.cohesion + 14 * this.effects.cohesion, 0, 100); } } }
      ];
    }
    ready() { return this.state.landed; }
    objective() { return { title: this.state.distance >= this.state.destination ? 'Seed the new world' : 'Cross the Bloom', text: 'Preserve enough living seeds and hull integrity to establish a successor ecosystem beyond the storm.', value: Math.min(360, Math.floor(this.state.progress)), target: 360 }; }
    stats() { return [['Journey', `${Math.min(100, Math.floor(this.state.distance / this.state.destination * 100))}%`], ['Seedbank', this.state.seeds], ['Hull', this.state.hull], ['Cohesion', this.state.cohesion], ['Stores', Math.floor(this.state.stores)], ['Storm', this.state.hazards.length]]; }
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
