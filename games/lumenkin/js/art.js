(function (ns) {
  'use strict';

  const FRAME_DATA = {
    creatureBaby: { x: 62, y: 58, w: 158, h: 137, pivotX: 79, pivotY: 124, tags: ['side', 'swift'] },
    creatureSwift: { x: 229, y: 40, w: 166, h: 157, pivotX: 83, pivotY: 143, tags: ['side', 'swift'] },
    creatureCrest: { x: 391, y: 31, w: 178, h: 169, pivotX: 89, pivotY: 155, tags: ['side', 'crest'] },
    creatureAdult: { x: 568, y: 24, w: 178, h: 178, pivotX: 89, pivotY: 163, tags: ['side', 'crest'] },
    creatureShell: { x: 744, y: 38, w: 183, h: 162, pivotX: 91, pivotY: 149, tags: ['side', 'shell'] },
    creatureWing: { x: 925, y: 16, w: 215, h: 186, pivotX: 108, pivotY: 171, tags: ['side', 'wing'] },
    topSwift: { x: 116, y: 224, w: 126, h: 143, pivotX: 63, pivotY: 72, tags: ['top', 'swift'] },
    topCrest: { x: 266, y: 215, w: 130, h: 157, pivotX: 65, pivotY: 79, tags: ['top', 'crest'] },
    topShell: { x: 431, y: 209, w: 124, h: 166, pivotX: 62, pivotY: 83, tags: ['top', 'shell'] },
    eggMote: { x: 125, y: 400, w: 91, h: 110, pivotX: 45, pivotY: 99, tags: ['egg'] },
    eggShell: { x: 264, y: 390, w: 100, h: 126, pivotX: 50, pivotY: 115, tags: ['egg'] },
    eggCrown: { x: 392, y: 378, w: 125, h: 142, pivotX: 62, pivotY: 130, tags: ['egg'] },
    nursery: { x: 53, y: 547, w: 221, h: 172, pivotX: 110, pivotY: 160, tags: ['structure'] },
    foodBulb: { x: 320, y: 544, w: 194, h: 167, pivotX: 97, pivotY: 155, tags: ['structure'] },
    healingPool: { x: 532, y: 541, w: 224, h: 186, pivotX: 112, pivotY: 171, tags: ['structure'] },
    pulseRoad: { x: 790, y: 534, w: 360, h: 207, pivotX: 180, pivotY: 103, tags: ['structure'] },
    memoryShrine: { x: 53, y: 747, w: 168, h: 189, pivotX: 84, pivotY: 177, tags: ['structure'] },
    sporeTower: { x: 244, y: 739, w: 213, h: 197, pivotX: 106, pivotY: 184, tags: ['structure'] },
    settlementGarden: { x: 514, y: 770, w: 153, h: 148, pivotX: 76, pivotY: 135, tags: ['settlement'] },
    settlementChorus: { x: 680, y: 751, w: 161, h: 169, pivotX: 80, pivotY: 156, tags: ['settlement'] },
    settlementWild: { x: 843, y: 749, w: 164, h: 170, pivotX: 82, pivotY: 157, tags: ['settlement'] },
    settlementStorm: { x: 1010, y: 745, w: 174, h: 179, pivotX: 87, pivotY: 166, tags: ['settlement'] },
    ark: { x: 370, y: 936, w: 836, h: 284, pivotX: 418, pivotY: 142, tags: ['ark'] }
  };

  class ArtCatalog {
    constructor(path) {
      this.path = path;
      this.frames = FRAME_DATA;
      this.image = new Image();
      this.ready = false;
      this.error = null;
    }

    load() {
      return new Promise(resolve => {
        this.image.onload = () => {
          const errors = this.validate(this.image.naturalWidth, this.image.naturalHeight);
          this.ready = errors.length === 0;
          this.error = errors.join('; ');
          resolve(this.ready);
        };
        this.image.onerror = () => { this.error = 'Pixel atlas could not be loaded'; resolve(false); };
        this.image.src = this.path;
      });
    }

    validate(width, height) {
      const errors = [];
      Object.keys(this.frames).forEach(name => {
        const frame = this.frames[name];
        if (!Number.isFinite(frame.pivotX) || !Number.isFinite(frame.pivotY)) errors.push(`${name}: invalid pivot`);
        if (frame.w <= 0 || frame.h <= 0 || frame.x < 0 || frame.y < 0 || frame.x + frame.w > width || frame.y + frame.h > height) {
          errors.push(`${name}: outside atlas`);
        }
      });
      return errors;
    }

    draw(ctx, name, x, y, width, height, options) {
      const frame = this.frames[name];
      if (!this.ready || !frame) return false;
      const opts = options || {};
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = opts.alpha == null ? 1 : opts.alpha;
      if (opts.flip) {
        ctx.translate(Math.round(x + width), Math.round(y));
        ctx.scale(-1, 1);
        ctx.drawImage(this.image, frame.x, frame.y, frame.w, frame.h, 0, 0, Math.round(width), Math.round(height));
      } else {
        ctx.drawImage(this.image, frame.x, frame.y, frame.w, frame.h, Math.round(x), Math.round(y), Math.round(width), Math.round(height));
      }
      ctx.restore();
      return true;
    }
  }

  class CreatureAppearance {
    static fromGenes(genes, seed) {
      const rng = ns.createRng(`${seed}:${genes.body}:${genes.palette}:${genes.marking || 'spots'}`);
      const compatible = {
        swift: ['fin', 'tuft'],
        shell: ['plates', 'nubs'],
        crest: ['crown', 'fronds']
      };
      const accents = compatible[genes.body] || compatible.swift;
      return {
        body: genes.body,
        head: genes.head || (genes.body === 'shell' ? 'round' : 'tapered'),
        limbs: genes.limbs || (genes.body === 'swift' ? 'long' : 'stout'),
        tail: genes.tail || (genes.body === 'crest' ? 'fan' : 'taper'),
        crest: genes.crest || rng.pick(accents),
        plating: genes.body === 'shell' || genes.plating === true,
        glowOrgans: genes.glowOrgans || rng.pick(['spine', 'flank', 'crown']),
        marking: genes.marking || rng.pick(['spots', 'bands', 'constellation']),
        palette: genes.palette || 'cyan',
        glowPattern: genes.glowPattern || rng.pick(['pulse', 'ripple', 'blink']),
        variant: rng.int(0, 3)
      };
    }

    static inherit(parentA, parentB, seed) {
      const rng = ns.createRng(seed);
      const choose = key => rng() < 0.5 ? parentA[key] : parentB[key];
      const body = choose('body');
      return CreatureAppearance.fromGenes({
        body,
        palette: choose('palette'),
        head: choose('head'),
        limbs: choose('limbs'),
        tail: choose('tail'),
        crest: choose('crest'),
        plating: choose('plating'),
        glowOrgans: choose('glowOrgans'),
        marking: choose('marking'),
        glowPattern: choose('glowPattern')
      }, seed);
    }
  }

  class SpriteAssembler {
    constructor(catalog) {
      this.catalog = catalog;
      this.cache = new Map();
    }

    keyFor(appearance, view, age) {
      return JSON.stringify([appearance, view, Math.floor((age || 0) / 20)]);
    }

    compose(appearance, view, age) {
      const key = this.keyFor(appearance, view, age);
      if (this.cache.has(key)) return this.cache.get(key);
      const canvas = document.createElement('canvas');
      canvas.width = view === 'top' ? 32 : 48;
      canvas.height = view === 'top' ? 32 : 48;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      const sideFrames = { swift: 'creatureSwift', shell: 'creatureShell', crest: 'creatureCrest' };
      const topFrames = { swift: 'topSwift', shell: 'topShell', crest: 'topCrest' };
      const frame = view === 'top' ? topFrames[appearance.body] : sideFrames[appearance.body];
      this.catalog.draw(ctx, frame || 'creatureSwift', 1, 2, canvas.width - 2, canvas.height - 4);
      const palette = ns.CONFIG.palettes[appearance.palette] || ns.CONFIG.palettes.cyan;
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = palette[3];
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = palette[4];
      const glowY = view === 'top' ? 13 : 21;
      if (appearance.marking === 'bands') {
        ctx.fillRect(16, glowY, 2, 2); ctx.fillRect(23, glowY + 2, 2, 2);
      } else if (appearance.marking === 'constellation') {
        ctx.fillRect(18, glowY - 3, 2, 2); ctx.fillRect(23, glowY + 1, 1, 1); ctx.fillRect(28, glowY - 1, 2, 2);
      } else {
        ctx.fillRect(18, glowY, 2, 2); ctx.fillRect(25, glowY + 2, 2, 2);
      }
      if ((age || 0) > 80) {
        ctx.fillStyle = 'rgba(18,19,44,.35)';
        ctx.fillRect(0, 0, canvas.width, 5);
      }
      this.cache.set(key, canvas);
      return canvas;
    }
  }

  class AnimationPlayer {
    constructor(names) { this.names = names || ['idle', 'move', 'feed', 'sleep', 'play', 'groom', 'carry', 'gather', 'defend', 'injury', 'age', 'bond', 'death']; this.time = 0; this.name = 'idle'; }
    play(name) { if (this.names.includes(name)) this.name = name; }
    update(dt, reducedMotion) { this.time += reducedMotion ? 0 : dt; }
    frame(count, fps) { return Math.floor(this.time * (fps || 6)) % (count || 4); }
  }

  class PaletteManager {
    constructor() { this.time = 0; }
    update(dt) { this.time += dt; }
    sky(chapter, ecology) {
      const skies = ['#0b0c24', '#10112f', '#121433', '#161735', '#1b1731'];
      if ((ecology || 50) < 30) return '#241327';
      return skies[chapter] || skies[0];
    }
  }

  class ParticleSystem {
    constructor(rng) { this.rng = rng; this.items = []; }
    emit(x, y, color, count, speed) {
      for (let i = 0; i < (count || 4); i += 1) this.items.push({ x, y, vx: (this.rng() - .5) * (speed || 16), vy: (this.rng() - .7) * (speed || 16), life: .5 + this.rng(), color });
      if (this.items.length > 240) this.items.splice(0, this.items.length - 240);
    }
    update(dt) { this.items.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }); this.items = this.items.filter(p => p.life > 0); }
    render(ctx) { this.items.forEach(p => { ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.color; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.life > .5 ? 2 : 1, p.life > .5 ? 2 : 1); }); ctx.globalAlpha = 1; }
  }

  class PixelCamera {
    constructor() { this.x = 0; this.y = 0; this.targetX = 0; this.targetY = 0; }
    update(dt, reducedMotion) { const strength = reducedMotion ? 1 : Math.min(1, dt * 8); this.x += (this.targetX - this.x) * strength; this.y += (this.targetY - this.y) * strength; }
    apply(ctx) { ctx.translate(-Math.round(this.x), -Math.round(this.y)); }
  }

  ns.FRAME_DATA = FRAME_DATA;
  ns.ArtCatalog = ArtCatalog;
  ns.CreatureAppearance = CreatureAppearance;
  ns.SpriteAssembler = SpriteAssembler;
  ns.AnimationPlayer = AnimationPlayer;
  ns.PaletteManager = PaletteManager;
  ns.ParticleSystem = ParticleSystem;
  ns.PixelCamera = PixelCamera;
})(window.Lumenkin = window.Lumenkin || {});
