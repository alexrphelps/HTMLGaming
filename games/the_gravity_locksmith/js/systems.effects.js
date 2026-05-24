window.GravityLocksmith = window.GravityLocksmith || {};

(function(ns) {
  "use strict";

  ns.createEffectsSystem = function(runtime) {
    function burst(x, y, color, count, speed) {
      const particleCount = count == null ? 18 : count;
      const particleSpeed = speed == null ? 160 : speed;
      for (let index = 0; index < particleCount; index++) {
        const angle = runtime.random() * Math.PI * 2;
        const magnitude = runtime.random() * particleSpeed + 40;
        runtime.roomState.particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * magnitude,
          vy: Math.sin(angle) * magnitude,
          life: runtime.random() * 0.45 + 0.25,
          max: 0.7,
          color: color,
          size: runtime.random() * 3 + 2
        });
      }
    }

    function updateParticles(dt) {
      for (const particle of runtime.roomState.particles) {
        particle.life -= dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vx *= Math.pow(0.05, dt);
        particle.vy *= Math.pow(0.05, dt);
      }
      runtime.roomState.particles = runtime.roomState.particles.filter(function(particle) {
        return particle.life > 0;
      });
    }

    function updateStars(dt) {
      const factor = runtime.config.effects.starDriftFactor;
      for (const star of runtime.stars) {
        star.y += runtime.roomState.gravity * star.drift * factor * dt * 60;
        if (star.y < 0) star.y = runtime.config.world.height;
        if (star.y > runtime.config.world.height) star.y = 0;
      }
    }

    function updateTimers(dt) {
      runtime.session.cameraShake = Math.max(0, runtime.session.cameraShake - runtime.config.effects.cameraShakeDecayPerSecond * dt);
      runtime.session.roomCompleteFlash = Math.max(0, runtime.session.roomCompleteFlash - runtime.config.effects.roomCompleteFlashDecayPerSecond * dt);
      runtime.session.clock += dt;
    }

    return {
      burst: burst,
      updateParticles: updateParticles,
      updateStars: updateStars,
      updateTimers: updateTimers
    };
  };
})(window.GravityLocksmith);
