(function (ns) {
  'use strict';

  ns.CONFIG = Object.freeze({
    width: 384,
    height: 216,
    fixedStep: 1 / 60,
    schemaVersion: 2,
    savePrefix: 'lumenkin.save.',
    autosaveKey: 'lumenkin.autosave',
    maxCreatures: 120,
    atlasPath: 'assets/lumenkin-atlas.png',
    chapters: [
      { id: 'first-glow', title: 'First Glow', subtitle: 'Plan one creature\'s days', target: 4 },
      { id: 'brood', title: 'The Brood', subtitle: 'Coordinate a living family', target: 4 },
      { id: 'city', title: 'Living City', subtitle: 'Shape an autonomous settlement', target: 5 },
      { id: 'worldroot', title: 'Worldroot', subtitle: 'Set a world council\'s mandates', target: 5 },
      { id: 'bloom', title: 'The Great Bloom', subtitle: 'Plan each living-ark voyage', target: 4 }
    ],
    palettes: {
      cyan: ['#10132c', '#292557', '#6555a2', '#55f6e8', '#d8fff7'],
      coral: ['#17132d', '#482654', '#a64e72', '#ff8d72', '#ffe0a2'],
      gold: ['#14142b', '#453957', '#9c704f', '#ffd45b', '#fff0ac']
    },
    eggTypes: [
      { id: 'forager', name: 'Mote Egg', icon: '◉', body: 'swift', palette: 'cyan', trait: 'Quickstep', description: 'Nimble, curious, and born to find hidden food.' },
      { id: 'grazer', name: 'Shell Egg', icon: '⬢', body: 'shell', palette: 'coral', trait: 'Stonehide', description: 'Patient, hardy, and difficult for predators to harm.' },
      { id: 'generalist', name: 'Crown Egg', icon: '✦', body: 'crest', palette: 'gold', trait: 'Brightmind', description: 'Social, adaptable, and quick to learn new rituals.' }
    ]
  });
})(window.Lumenkin = window.Lumenkin || {});
