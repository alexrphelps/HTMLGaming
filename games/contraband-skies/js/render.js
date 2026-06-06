(function(global) {
  "use strict";

  const ns = global.ContrabandSkies || (global.ContrabandSkies = {});

  class SkyMapRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.dpr = 1;
      this.time = 0;
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      this.dpr = Math.max(1, Math.min(2, global.devicePixelRatio || 1));
      this.canvas.width = Math.max(640, Math.floor(rect.width * this.dpr));
      this.canvas.height = Math.max(420, Math.floor(rect.height * this.dpr));
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    render(campaign) {
      if (!campaign) return;
      const width = this.canvas.width / this.dpr;
      const height = this.canvas.height / this.dpr;
      this.time += 0.01;
      this.drawSky(width, height);
      this.drawRoutes(campaign, width, height);
      this.drawSettlements(campaign, width, height);
      this.drawHudNotes(campaign, width, height);
    }

    project(settlement, width, height) {
      const margin = ns.CONFIG.map.margin;
      return {
        x: margin + settlement.x * (width - margin * 2),
        y: margin + settlement.y * (height - margin * 2)
      };
    }

    drawSky(width, height) {
      const ctx = this.ctx;
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#15232f");
      gradient.addColorStop(0.45, "#6c5640");
      gradient.addColorStop(1, "#181019");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < 34; i++) {
        const x = ((i * 173 + this.time * 36) % (width + 180)) - 90;
        const y = 80 + Math.sin(i * 1.7 + this.time) * 48 + (i % 7) * (height / 8);
        const r = 34 + (i % 5) * 15;
        ctx.beginPath();
        ctx.fillStyle = i % 3 === 0 ? "rgba(105, 216, 202, 0.08)" : "rgba(247, 232, 193, 0.08)";
        ctx.ellipse(x, y, r * 1.8, r * 0.55, Math.sin(i) * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = "rgba(245, 198, 106, 0.08)";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + Math.sin(this.time + x) * 24, height);
        ctx.stroke();
      }
    }

    drawRoutes(campaign, width, height) {
      const ctx = this.ctx;
      campaign.routes.forEach(route => {
        const from = ns.getSettlement(campaign, route.fromId);
        const to = ns.getSettlement(campaign, route.toId);
        const a = this.project(from, width, height);
        const b = this.project(to, width, height);
        const hazard = ns.getHazard(route.hazardId);
        const selected = ns.getSelectedContract(campaign);
        const isSelected = selected && selected.routeId === route.id;

        ctx.save();
        ctx.strokeStyle = isSelected ? hazard.color : "rgba(247, 232, 193, 0.28)";
        ctx.lineWidth = isSelected ? 4 : 2;
        ctx.setLineDash(isSelected ? [] : [8, 9]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 - 42, b.x, b.y);
        ctx.stroke();
        ctx.restore();

        if (isSelected) {
          ctx.fillStyle = hazard.color;
          ctx.beginPath();
          ctx.arc((a.x + b.x) / 2, (a.y + b.y) / 2 - 42, 10 + Math.sin(this.time * 6) * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    drawSettlements(campaign, width, height) {
      const ctx = this.ctx;
      campaign.settlements.forEach(settlement => {
        const point = this.project(settlement, width, height);
        const current = settlement.id === campaign.currentSettlementId;
        ctx.save();
        ctx.shadowColor = settlement.color;
        ctx.shadowBlur = current ? 24 : 10;
        ctx.fillStyle = current ? "#fff4d5" : settlement.color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, current ? 14 : 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(23, 18, 15, 0.9)";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = "#f7e8c1";
        ctx.font = "700 13px Inter, Segoe UI, sans-serif";
        ctx.fillText(settlement.name, point.x + 16, point.y + 5);
        ctx.restore();
      });
    }

    drawHudNotes(campaign, width, height) {
      const ctx = this.ctx;
      const selected = ns.getSelectedContract(campaign);
      ctx.save();
      ctx.fillStyle = "rgba(17, 14, 12, 0.62)";
      ctx.strokeStyle = "rgba(245, 198, 106, 0.34)";
      ctx.lineWidth = 1;
      ctx.fillRect(18, height - 96, Math.min(560, width - 36), 76);
      ctx.strokeRect(18, height - 96, Math.min(560, width - 36), 76);
      ctx.fillStyle = "#69d8ca";
      ctx.font = "700 12px Inter, Segoe UI, sans-serif";
      ctx.fillText("LIVING SKY", 34, height - 68);
      ctx.fillStyle = "#f7e8c1";
      ctx.font = "14px Inter, Segoe UI, sans-serif";
      ctx.fillText(selected ? selected.note : "Select a contract. The sky will answer in pressure, debt, and rumor.", 34, height - 42);
      ctx.restore();
    }
  }

  ns.SkyMapRenderer = SkyMapRenderer;
})(typeof window !== "undefined" ? window : globalThis);
