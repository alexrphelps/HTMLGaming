(function () {
  'use strict';

  const em = window.EchoMaze || {};

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function alphaColor(hex, alpha) {
    const raw = hex.replace('#', '');
    const n = parseInt(raw.length === 3 ? raw.replace(/(.)/g, '$1$1') : raw, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ':' + String(secs).padStart(2, '0');
  }

  Object.assign(em, { easeOutCubic, alphaColor, formatTime });
  window.EchoMaze = em;
})();
