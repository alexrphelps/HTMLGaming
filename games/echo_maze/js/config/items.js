(function () {
  'use strict';

  const em = window.EchoMaze || {};

  em.ITEM_DATA = {
    lantern: {
      label: 'Lantern Core',
      color: '#ffe27a',
      score: 135,
      message: 'Vision radius increased.'
    },
    boots: {
      label: 'Quickstep Boots',
      color: '#8ef7a2',
      score: 110,
      message: 'Movement speed increased.'
    },
    phase: {
      label: 'Phase Crystal',
      color: '#bd8cff',
      score: 105,
      message: 'Phase charge restored.'
    },
    compass: {
      label: 'Compass Lens',
      color: '#7df9ff',
      score: 115,
      message: 'Compass signal sharpened.'
    },
    map: {
      label: 'Map Fragment',
      color: '#8ab8ff',
      score: 145,
      message: 'Nearby maze structure revealed.'
    },
    shield: {
      label: 'Ward Shield',
      color: '#ffffff',
      score: 120,
      message: 'Protection increased.'
    },
    battery: {
      label: 'Echo Battery',
      color: '#ff88c8',
      score: 125,
      message: 'The Warden slows.'
    },
    relic: {
      label: 'Lost Relic',
      color: '#ffb86c',
      score: 260,
      message: 'A rare relic hums with score.'
    }
  };

  window.EchoMaze = em;
})();
