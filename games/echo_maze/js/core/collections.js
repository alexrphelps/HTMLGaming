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

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeColor(value, fallback = '#ffffff') {
    const color = String(value || '');
    return /^#[0-9a-f]{3,8}$/i.test(color) ? color : fallback;
  }

  Object.assign(em, { easeOutCubic, alphaColor, formatTime, escapeHtml, safeColor });
  window.EchoMaze = em;
})();
