(function () {
  'use strict';

  const em = window.EchoMaze || {};

  function createCanvasApp(doc, win) {
    const canvas = doc.getElementById('game');
    const ctx = canvas.getContext('2d');

    return {
      canvas,
      ctx,
      width: 0,
      height: 0,
      window: win,
      document: doc
    };
  }

  function resizeCanvas(app) {
    const dpr = Math.max(1, Math.min(app.window.devicePixelRatio || 1, em.CONFIG.maxDpr));
    app.width = app.window.innerWidth;
    app.height = app.window.innerHeight;
    app.canvas.width = Math.floor(app.width * dpr);
    app.canvas.height = Math.floor(app.height * dpr);
    app.canvas.logicalWidth = app.width;
    app.canvas.logicalHeight = app.height;
    app.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }

  Object.assign(em, { createCanvasApp, resizeCanvas, roundedRect });
  window.EchoMaze = em;
})();
