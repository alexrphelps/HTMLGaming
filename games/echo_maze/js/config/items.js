(function () {
  'use strict';

  const em = window.EchoMaze || {};

  em.ITEM_DATA = {
    lantern: {
      label: 'Lantern Core',
      color: '#ffe27a',
      score: 135,
      message: 'Vision radius increased.',
      tutorialOrder: 0,
      renderType: 'lantern',
      classicRollMax: 0.15,
      tutorial: {
        title: 'Lantern Core',
        text: 'Lantern Cores push your light farther into the maze.',
        stat: 'Watch Vision. Lantern Cores brighten your view, but that extra reach slowly fades back to your minimum.'
      },
      hudUnlocks: ['vision'],
      effect: {
        type: 'lantern',
        visionBonus: 0.72,
        reveal: 'visionPlus1',
        floatingText: 'Vision Up'
      }
    },
    boots: {
      label: 'Quickstep Boots',
      color: '#8ef7a2',
      score: 110,
      message: 'Movement speed increased.',
      tutorialOrder: 1,
      renderType: 'boots',
      classicRollMax: 0.30,
      tutorial: {
        title: 'Quickstep Boots',
        text: 'Quickstep Boots permanently increase movement speed.',
        stat: 'Watch Speed. Higher speed helps you reach Anchors before danger catches up.'
      },
      hudUnlocks: ['speed'],
      effect: {
        type: 'boots',
        speed: 10,
        overflowFloatingText: 'Speed Boost'
      }
    },
    phase: {
      label: 'Phase Crystal',
      color: '#bd8cff',
      score: 105,
      message: 'Phase charge restored.',
      tutorialOrder: 2,
      renderType: 'phase',
      classicRollMax: 0.45,
      tutorial: {
        title: 'Phase Crystal',
        text: 'Phase Crystals add a charge for briefly slipping through walls. Press Space to use Phase.',
        stat: 'Watch Phase. Charges are shown as pips, and the timer changes when Phase is active or cooling down.'
      },
      hudUnlocks: ['phase'],
      effect: {
        type: 'phase',
        charges: 1
      }
    },
    compass: {
      label: 'Compass Lens',
      color: '#7df9ff',
      score: 115,
      message: 'Compass signal sharpened.',
      tutorialOrder: 3,
      renderType: 'compass',
      classicRollMax: 0.58,
      tutorial: {
        title: 'Compass Lens',
        text: 'Compass Lenses tune your Anchor signal. Each lens scans one more chunk for the next Anchor.',
        stat: 'Watch Compass. More lenses expand the Anchor detection radius; eight lenses can read any Anchor direction.'
      },
      hudUnlocks: ['compass', 'coords'],
      effect: {
        type: 'compass',
        compass: 1,
        revealRadius: 6
      }
    },
    map: {
      label: 'Map Fragment',
      color: '#8ab8ff',
      score: 145,
      message: 'Nearby maze structure revealed.',
      tutorialOrder: 4,
      renderType: 'map',
      classicRollMax: 0.72,
      tutorial: {
        title: 'Map Fragment',
        text: 'Map Fragments reveal nearby maze structure in a burst.',
        stat: 'Watch Revealed and the minimap. More revealed cells give you safer routes back and forward.'
      },
      hudUnlocks: ['revealed', 'depth'],
      effect: {
        type: 'map',
        revealRadius: 7,
        pathBurstRadius: 4
      }
    },
    shield: {
      label: 'Ward Shield',
      color: '#d8f3ff',
      score: 120,
      message: 'Protection increased.',
      tutorialOrder: 5,
      renderType: 'shield',
      classicRollMax: 0.84,
      tutorial: {
        title: 'Ward Shield',
        text: 'Ward Shields add protection before your health is harmed.',
        stat: 'Watch the bottom vitals dock. Shields absorb danger before health becomes the problem.'
      },
      hudUnlocks: ['integrity'],
      effect: {
        type: 'shield',
        shields: 1
      }
    },
    battery: {
      label: 'Echo Battery',
      color: '#6ee7d8',
      score: 125,
      message: 'Health and lantern stability restored.',
      tutorialOrder: 6,
      renderType: 'battery',
      classicRollMax: 0.95,
      tutorial: {
        title: 'Echo Battery',
        text: 'Echo Batteries repair one missing health, stabilize your lantern, and push back maze danger.',
        stat: 'Watch Battery. Batteries help you recover health and slow the maze danger once Classic mode begins.'
      },
      hudUnlocks: ['battery'],
      effect: {
        type: 'battery',
        battery: 1,
        heal: 1
      }
    },
    relic: {
      label: 'Lost Relic',
      color: '#c8f26a',
      score: 260,
      message: 'A rare relic hums with score.',
      tutorialOrder: 7,
      renderType: 'relic',
      classicRollMax: 1,
      tutorial: {
        title: 'Lost Relic',
        text: 'Lost Relics are rare score treasures that also grant a Phase charge.',
        stat: 'Watch Score and Items. Items count your discoveries, while score rewards efficient exploration.'
      },
      hudUnlocks: ['score', 'items'],
      effect: {
        type: 'relic',
        charges: 1,
        revealRadius: 12
      }
    }
  };

  em.ITEM_ORDER = Object.keys(em.ITEM_DATA)
    .sort((a, b) => em.ITEM_DATA[a].tutorialOrder - em.ITEM_DATA[b].tutorialOrder);
  em.BEGINNER_SEQUENCE = em.ITEM_ORDER.concat('anchor');
  em.TUTORIAL_INFO = em.ITEM_ORDER.reduce((info, type) => {
    info[type] = em.ITEM_DATA[type].tutorial;
    return info;
  }, {
    anchor: {
      title: 'Echo Anchor',
      text: 'Echo Anchors are the main objectives. Stabilizing them advances the run.',
      stat: 'Watch Anchors and Tier. This tutorial Anchor counts as your first Classic Anchor; the next signal begins the full run.'
    }
  });

  em.CLASSIC_ITEM_ROLLS = em.ITEM_ORDER.map(type => ({
    type,
    max: em.ITEM_DATA[type].classicRollMax
  }));

  window.EchoMaze = em;
})();
