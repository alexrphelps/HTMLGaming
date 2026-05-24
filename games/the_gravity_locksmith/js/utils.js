window.GravityLocksmith = window.GravityLocksmith || {};

(function(ns) {
  "use strict";

  ns.clamp = function(value, min, max) {
    return Math.max(min, Math.min(max, value));
  };

  ns.rectsOverlap = function(a, b) {
    return a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y;
  };

  ns.copyRect = function(rect) {
    return { x: rect.x, y: rect.y, w: rect.w, h: rect.h };
  };

  ns.getSentryBeamRect = function(hazard) {
    if (hazard.axis === "x") {
      return {
        x: hazard.dir === 1 ? hazard.x + hazard.w : hazard.x - hazard.length,
        y: hazard.y + hazard.h / 2 - hazard.thickness / 2,
        w: hazard.length,
        h: hazard.thickness
      };
    }
    return {
      x: hazard.x + hazard.w / 2 - hazard.thickness / 2,
      y: hazard.dir === 1 ? hazard.y + hazard.h : hazard.y - hazard.length,
      w: hazard.thickness,
      h: hazard.length
    };
  };

  ns.isSentryActive = function(hazard, roomTime) {
    const cycle = ((roomTime + hazard.phase) % hazard.period + hazard.period) % hazard.period;
    return cycle <= hazard.activeTime;
  };

  ns.fmtTime = function(timeSeconds) {
    const wholeSeconds = Math.floor(timeSeconds);
    const tenths = Math.floor((timeSeconds - wholeSeconds) * 10);
    return wholeSeconds + "." + tenths + "s";
  };

  ns.roundRectPath = function(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  };
})(window.GravityLocksmith);
