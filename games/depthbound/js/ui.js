(function(D) {
  with (D) {
  function notify(text, color = "#7df9ff", ttl = 3.4) {
    game.notifications.push({ text, color, ttl, max: ttl });
  }

  function showChoices(title, text, options, canSkip = false) {
    game.paused = true;
    choicePanel.style.display = "flex";
    choiceTitle.textContent = title;
    choiceText.textContent = text;
    choicesEl.innerHTML = "";
    const full = options.slice();
    if (canSkip) {
      full.push({ name: "Leave", branch: "Exit", desc: "Do nothing and return to the dungeon.", apply: () => {} });
    }
    full.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "choice";
      btn.innerHTML = `<em>${escapeHtml(opt.branch || opt.type || "Reward")}</em><strong>${escapeHtml(opt.name)}</strong><span>${escapeHtml(opt.desc)}</span>`;
      btn.addEventListener("click", () => {
        try { opt.apply(); } catch (e) { console.error(e); }
        choicesEl.innerHTML = "";
        choicePanel.style.display = "none";
        game.paused = false;
      });
      choicesEl.appendChild(btn);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>'"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[ch]));
  }

  function showCodex() {
    const p = game.player;
    const branchRows = Object.entries(p.branch).map(([k,v]) => `<span class="pill branch-pill-${k.toLowerCase()}">${k}: ${v}</span>`).join(" ");
    codexContent.innerHTML = `
      <p><strong>${escapeHtml(game.personality.name)}</strong> — ${escapeHtml(game.personality.desc)}</p>
      <div class="row">${branchRows}</div>
      <div class="twoCol codex-grid">
        <div>
          <h3>Talents</h3>
          <p>${p.talents.length ? escapeHtml(p.talents.join(", ")) : "No talents yet."}</p>
        </div>
        <div>
          <h3>Relics</h3>
          <p>${p.relics.length ? escapeHtml(p.relics.join(", ")) : "No relics yet."}</p>
        </div>
        <div>
          <h3>Curses</h3>
          <p>${p.curses.length ? escapeHtml(p.curses.map(c => c.name).join(", ")) : "No curses yet."}</p>
        </div>
        <div>
          <h3>Stats</h3>
          <p>Damage x${p.stats.damage.toFixed(2)} · Fire Rate x${p.stats.fireRate.toFixed(2)} · Projectiles ${p.stats.projectiles} · Pierce ${p.stats.pierce} · Ricochet ${p.stats.ricochet}</p>
        </div>
      </div>
    `;
    game.paused = true;
    codexPanel.style.display = "flex";
  }

    Object.assign(D, {
      notify,
      showChoices,
      escapeHtml,
      showCodex
    });
  }
})(window.Depthbound = window.Depthbound || {});
