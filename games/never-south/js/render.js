(function() {
  "use strict";

  const ns = window.NeverSouth || {};
  const TILE = ns.TILE_TYPES;
  const R = ns.CONFIG.render;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function rect(x, y, w, h) {
    return { x, y, w, h };
  }

  function pointsBounds(points) {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min.apply(null, xs);
    const maxX = Math.max.apply(null, xs);
    const minY = Math.min.apply(null, ys);
    const maxY = Math.max.apply(null, ys);
    return rect(minX, minY, maxX - minX, maxY - minY);
  }

  function shadeColor(hex, amount) {
    const raw = String(hex || "#555555").replace("#", "");
    const value = parseInt(raw.length === 3 ? raw.replace(/(.)/g, "$1$1") : raw, 16);
    const r = clamp((value >> 16) + amount, 0, 255);
    const g = clamp(((value >> 8) & 255) + amount, 0, 255);
    const b = clamp((value & 255) + amount, 0, 255);
    return "#" + [r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("");
  }

  class NeverSouthRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.hitAreas = [];
      this.hoverArea = null;
      this.time = 0;
      this.viewportWidth = canvas.clientWidth || canvas.width || 1280;
      this.viewportHeight = canvas.clientHeight || canvas.height || 820;
      this.dpr = 1;
      this.layout = this.calculateLayout();
    }

    setHover(area) {
      this.hoverArea = area;
    }

    getHitAreas() {
      return this.hitAreas;
    }

    calculateLayout(width, height) {
      const w = width || this.viewportWidth || this.canvas.width || 1280;
      const h = height || this.viewportHeight || this.canvas.height || 820;
      const gap = R.panelGap;
      const padding = R.panelPadding;
      const desiredBottomHeight = clamp(Math.round(h * R.bottomPanelRatio), R.minBottomPanelHeight, R.maxBottomPanelHeight);
      const bottomHeight = Math.min(desiredBottomHeight, Math.max(150, h - 180));
      const world = rect(0, 0, w, Math.max(1, h - bottomHeight));
      const bottom = rect(0, world.h, w, bottomHeight);
      const innerW = Math.max(320, w - gap * 4);
      const leftW = Math.round(innerW * R.leftPanelRatio);
      const rightW = Math.round(innerW * R.rightPanelRatio);
      const centerW = Math.max(1, innerW - leftW - rightW);
      const panelY = bottom.y + gap;
      const panelH = Math.max(140, bottom.h - gap * 2);
      const left = rect(gap, panelY, leftW, panelH);
      const center = rect(left.x + left.w + gap, panelY, centerW, panelH);
      const right = rect(center.x + center.w + gap, panelY, rightW, panelH);
      const availableTile = Math.min(world.w / R.targetVisibleTiles, world.h / R.targetVisibleTiles);
      const tileSize = Math.floor(clamp(availableTile, R.minTileSize, R.maxTileSize));

      return {
        width: w,
        height: h,
        gap,
        padding,
        tileSize,
        world,
        bottom,
        leftPanel: left,
        centerPanel: center,
        rightPanel: right,
        worldBottom: world.y + world.h,
        bottomPanelTop: bottom.y
      };
    }

    resize(width, height, dpr) {
      this.viewportWidth = width || this.viewportWidth;
      this.viewportHeight = height || this.viewportHeight;
      this.dpr = dpr || this.dpr || 1;
      this.layout = this.calculateLayout(width, height);
    }

    render(run, dt) {
      this.time += dt || 0;
      this.layout = this.calculateLayout();
      const ctx = this.ctx;
      this.hitAreas = [];
      ctx.imageSmoothingEnabled = false;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

      this.drawWorld(ctx, run);
      this.drawBottomPanel(ctx, run);

      if (run.status === "title" || run.status === "won" || run.status === "lost") {
        this.drawOverlay(ctx, run);
      }
    }

    drawWorld(ctx, run) {
      const layout = this.layout;
      const world = layout.world;
      ctx.fillStyle = "#373d3f";
      ctx.fillRect(world.x, world.y, world.w, world.h);

      const camera = this.getWorldCamera(run);
      const range = this.getVisibleWorldRange(run, camera);
      const targets = run.getValidTargets();
      const targetKeys = new Set(targets.map((target) => ns.tileKey(target.col, target.row)));

      for (let row = range.startRow; row <= range.endRow; row++) {
        for (let col = range.startCol; col <= range.endCol; col++) {
          const geometry = this.getTileGeometry(col, row, camera);
          if (!this.intersectsWorld(geometry.bounds, world)) continue;
          this.drawTile(ctx, run, col, row, geometry, camera, targetKeys);
        }
      }

      this.drawEnemies(ctx, run, camera);
      this.drawPlayer(ctx, run, camera);
    }

    getWorldCamera(run) {
      const world = this.layout.world;
      const size = this.layout.tileSize;
      return {
        playerCol: run.player.col,
        playerRow: run.player.row,
        anchorX: world.x + world.w / 2,
        anchorY: world.y + world.h * 0.58,
        tileWidth: size,
        tileHeight: size
      };
    }

    worldToScreen(col, row, camera) {
      const dc = col - camera.playerCol;
      const dr = row - camera.playerRow;
      return {
        x: camera.anchorX + dc * camera.tileWidth,
        y: camera.anchorY + dr * camera.tileHeight
      };
    }

    getVisibleWorldRange(run, camera) {
      const world = this.layout.world;
      const colRadius = Math.ceil(world.w / camera.tileWidth) + R.visibilityRadius + 2;
      const rowRadius = Math.ceil(world.h / camera.tileHeight) + R.visibilityRadius + 2;
      return {
        startCol: run.player.col - colRadius,
        endCol: run.player.col + colRadius,
        startRow: run.player.row - rowRadius,
        endRow: run.player.row + rowRadius
      };
    }

    getTileGeometry(col, row, camera) {
      const center = this.worldToScreen(col, row, camera);
      const halfW = camera.tileWidth / 2;
      const halfH = camera.tileHeight / 2;
      const topLeft = { x: center.x - halfW, y: center.y - halfH };
      const topRight = { x: center.x + halfW, y: center.y - halfH };
      const bottomRight = { x: center.x + halfW, y: center.y + halfH };
      const bottomLeft = { x: center.x - halfW, y: center.y + halfH };
      return {
        center,
        topLeft,
        topRight,
        bottomRight,
        bottomLeft,
        bounds: rect(topLeft.x, topLeft.y, camera.tileWidth, camera.tileHeight)
      };
    }

    intersectsWorld(area, world) {
      return area.x <= world.x + world.w &&
        area.x + area.w >= world.x &&
        area.y <= world.y + world.h &&
        area.y + area.h >= world.y;
    }

    drawTile(ctx, run, col, row, geometry, camera, targetKeys) {
      const tile = ns.getTile(run.world, col, row);
      const isVisible = this.isTileVisible(run, col, row);
      const targetKey = ns.tileKey(col, row);
      const isTarget = targetKeys.has(targetKey);

      if (!tile || !isVisible || !tile.revealed) {
        this.drawUnexploredTile(ctx, geometry);
        return;
      }

      const data = ns.TILE_DATA[tile.type];
      this.drawSquareTileBase(ctx, geometry, data.color, tile.type === TILE.GAP);
      ctx.strokeStyle = isTarget ? "#f9de6b" : tile.visited ? "#b7a96a" : "#1d2729";
      ctx.lineWidth = isTarget ? Math.max(3, Math.floor(camera.tileHeight * 0.08)) : 2;
      ctx.strokeRect(geometry.bounds.x + 0.5, geometry.bounds.y + 0.5, geometry.bounds.w - 1, geometry.bounds.h - 1);
      ctx.lineWidth = 1;

      this.drawTileDetails(ctx, tile, geometry, camera, data);

      if (isTarget) {
        this.hitAreas.push(Object.assign({ type: "target", col, row }, geometry.bounds));
        ctx.fillStyle = "rgba(249, 222, 107, 0.18)";
        ctx.fillRect(geometry.bounds.x + 3, geometry.bounds.y + 3, geometry.bounds.w - 6, geometry.bounds.h - 6);
      }
    }

    drawSquareTileBase(ctx, geometry, color, sunken) {
      const gradient = ctx.createLinearGradient(geometry.bounds.x, geometry.bounds.y, geometry.bounds.x, geometry.bounds.y + geometry.bounds.h);
      gradient.addColorStop(0, shadeColor(color, sunken ? -28 : 30));
      gradient.addColorStop(0.55, color);
      gradient.addColorStop(1, shadeColor(color, -22));
      ctx.fillStyle = gradient;
      ctx.fillRect(geometry.bounds.x, geometry.bounds.y, geometry.bounds.w, geometry.bounds.h);
      ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
      ctx.fillRect(geometry.bounds.x + 3, geometry.bounds.y + 3, Math.max(1, geometry.bounds.w - 6), 3);
    }

    drawUnexploredTile(ctx, geometry) {
      ctx.fillStyle = "#030405";
      ctx.fillRect(geometry.bounds.x, geometry.bounds.y, geometry.bounds.w, geometry.bounds.h);
      ctx.strokeStyle = "#101618";
      ctx.strokeRect(geometry.bounds.x + 0.5, geometry.bounds.y + 0.5, geometry.bounds.w - 1, geometry.bounds.h - 1);
      ctx.fillStyle = "#080b0d";
      ctx.fillRect(geometry.bounds.x + 5, geometry.bounds.y + 5, Math.max(1, geometry.bounds.w - 10), Math.max(1, geometry.bounds.h - 10));
    }

    drawPolygon(ctx, points, strokeOnly) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();
      if (strokeOnly) {
        ctx.stroke();
      } else {
        ctx.fill();
      }
    }

    drawTileDetails(ctx, tile, geometry, camera, data) {
      const size = this.layout.tileSize;
      const cx = geometry.center.x;
      const cy = geometry.center.y;
      const x = cx - size / 2;
      const y = cy - size / 2;
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.fillRect(cx - camera.tileWidth * 0.24, cy - camera.tileHeight * 0.23, camera.tileWidth * 0.48, 3);

      if (tile.type === TILE.SCRAP) {
        ctx.fillStyle = "#d6c28b";
        ctx.fillRect(cx - 10, cy - 5, 20, 7);
        ctx.fillStyle = "#705f45";
        ctx.fillRect(cx - 4, cy - 13, 9, 24);
      } else if (tile.type === TILE.GLOW) {
        ctx.fillStyle = "#9be4b4";
        ctx.fillRect(cx - 5, cy - 13, 10, 26);
        ctx.fillStyle = "rgba(155, 228, 180, 0.3)";
        ctx.fillRect(cx - 14, cy - 5, 28, 10);
      } else if (tile.type === TILE.CRACKED) {
        ctx.strokeStyle = "#2c2520";
        ctx.beginPath();
        ctx.moveTo(x + size * 0.25, y + 7);
        ctx.lineTo(cx, cy - 2);
        ctx.lineTo(x + size * 0.4, y + size - 8);
        ctx.moveTo(cx, cy - 2);
        ctx.lineTo(x + size * 0.74, y + size * 0.68);
        ctx.stroke();
      } else if (tile.type === TILE.RUBBLE) {
        ctx.fillStyle = "#383632";
        for (let i = 0; i < 5; i++) {
          ctx.fillRect(x + 8 + i * 7, y + 12 + (i % 2) * 11, 10, 9);
        }
      } else if (tile.type === TILE.FOG) {
        ctx.fillStyle = "rgba(210, 228, 224, 0.18)";
        ctx.fillRect(x + 8, cy - 10, size - 16, 8);
        ctx.fillRect(x + 14, cy + 4, size - 24, 7);
      } else if (tile.type === TILE.THORNS) {
        ctx.strokeStyle = "#24351e";
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.moveTo(x + 8 + i * 8, y + size - 8);
          ctx.lineTo(x + 13 + i * 8, y + 14);
          ctx.stroke();
        }
      } else if (tile.type === TILE.SHOP) {
        ctx.fillStyle = "#34261e";
        ctx.fillRect(cx - 17, cy - 12, 34, 25);
        ctx.fillStyle = "#d8a767";
        ctx.fillRect(cx - 13, cy - 18, 26, 7);
      } else if (tile.type === TILE.SHRINE) {
        ctx.fillStyle = "#2c335a";
        ctx.fillRect(cx - 11, cy - 18, 22, 35);
        ctx.fillStyle = "#aeb8ff";
        ctx.fillRect(cx - 4, cy - 10, 8, 20);
      } else if (tile.type === TILE.CAMP) {
        ctx.fillStyle = "#d6aa69";
        ctx.fillRect(cx - 13, cy + 5, 26, 7);
        ctx.fillStyle = "#ea7b4b";
        ctx.fillRect(cx - 5, cy - 9, 10, 14);
      } else if (tile.type === TILE.GAP) {
        ctx.fillStyle = "#050708";
        ctx.fillRect(x + 6, y + 6, size - 12, size - 12);
      }

      if (tile.collected) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.fillRect(geometry.bounds.x + 4, geometry.bounds.y + 4, geometry.bounds.w - 8, geometry.bounds.h - 8);
      }
      if (data.mark) {
        this.text(ctx, data.mark, cx - size * 0.12, cy + camera.tileHeight * 0.28, Math.max(12, size * 0.24), "#f3ead3", "bold");
      }
    }

    isTileVisible(run, col, row) {
      return Math.max(Math.abs(col - run.player.col), Math.abs(row - run.player.row)) <= R.visibilityRadius;
    }

    drawPlayer(ctx, run, camera) {
      const center = this.worldToScreen(run.player.col, run.player.row, camera);
      const size = this.layout.tileSize;
      const x = center.x - size / 2;
      const y = center.y - size * 0.82;
      const pad = size * 0.18;
      ctx.fillStyle = "#f0ead6";
      ctx.fillRect(x + pad, y + size * 0.28, size - pad * 2, size * 0.44);
      ctx.fillStyle = "#75d19d";
      ctx.fillRect(x + size * 0.38, y + size * 0.16, size * 0.24, size * 0.16);
      ctx.fillStyle = "#263033";
      ctx.fillRect(x + size * 0.36, y + size * 0.43, size * 0.08, size * 0.08);
      ctx.fillRect(x + size * 0.56, y + size * 0.43, size * 0.08, size * 0.08);
      ctx.strokeStyle = "#f9de6b";
      ctx.strokeRect(center.x - size * 0.36, center.y - size * 0.62, size * 0.72, size * 0.64);
    }

    drawEnemies(ctx, run, camera) {
      const size = this.layout.tileSize;
      run.world.enemies.forEach((enemy) => {
        if (enemy.hp <= 0 || !this.isTileVisible(run, enemy.col, enemy.row)) return;
        const center = this.worldToScreen(enemy.col, enemy.row, camera);
        const x = center.x - size / 2;
        const y = center.y - size * 0.75;
        ctx.fillStyle = "#b78349";
        ctx.fillRect(x + size * 0.22, y + size * 0.24, size * 0.56, size * 0.5);
        ctx.fillStyle = "#24191c";
        ctx.fillRect(x + size * 0.36, y + size * 0.43, size * 0.08, size * 0.08);
        ctx.fillRect(x + size * 0.56, y + size * 0.43, size * 0.08, size * 0.08);
        if (enemy.intent && this.isTileVisible(run, enemy.intent.col, enemy.intent.row)) {
          const intent = this.worldToScreen(enemy.intent.col, enemy.intent.row, camera);
          ctx.strokeStyle = "#f5c66e";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(center.x, center.y - size * 0.45);
          ctx.lineTo(intent.x, intent.y - size * 0.45);
          ctx.stroke();
          ctx.lineWidth = 1;
        }
      });
    }

    drawBottomPanel(ctx, run) {
      const layout = this.layout;
      ctx.fillStyle = "#101719";
      ctx.fillRect(layout.bottom.x, layout.bottom.y, layout.bottom.w, layout.bottom.h);
      ctx.fillStyle = "#182123";
      ctx.fillRect(layout.bottom.x, layout.bottom.y, layout.bottom.w, 3);
      this.drawPanelFrame(ctx, layout.leftPanel, "#1d2829");
      this.drawPanelFrame(ctx, layout.centerPanel, "#1d2829");
      this.drawPanelFrame(ctx, layout.rightPanel, "#1d2829");
      this.drawLeftPanel(ctx, run, layout.leftPanel);
      this.drawHandPanel(ctx, run, layout.centerPanel);
      this.drawRunLogPanel(ctx, run, layout.rightPanel);
    }

    drawPanelFrame(ctx, panel, color) {
      ctx.fillStyle = color;
      ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
      ctx.strokeStyle = "#364447";
      ctx.strokeRect(panel.x + 0.5, panel.y + 0.5, panel.w - 1, panel.h - 1);
    }

    drawLeftPanel(ctx, run, panel) {
      const p = this.layout.padding;
      let y = panel.y + p;
      this.text(ctx, "Run State", panel.x + p, y + 16, 16, "#f1e3b0", "bold");
      y += 30;
      this.drawMeter(ctx, panel.x + p, y, panel.w - p * 2, 12, run.player.health / ns.CONFIG.run.maxHealth, "#cf5f59");
      y += 30;
      this.text(ctx, "Health " + run.player.health + "/" + ns.CONFIG.run.maxHealth, panel.x + p, y, 14, "#f0ead6", "bold");
      y += 22;
      this.text(ctx, "Scrap " + run.player.scrap + "   Glow " + run.player.glow, panel.x + p, y, 14, "#d9d6bf", "bold");
      y += 21;
      this.text(ctx, "Deck " + run.deck.drawPile.length + "   Discard " + run.deck.discardPile.length, panel.x + p, y, 13, "#bfc4b1");
      y += 12;

      const emergency = rect(panel.x + p, y + 10, panel.w - p * 2, 28);
      this.hitAreas.push(Object.assign({ type: "emergency" }, emergency));
      ctx.fillStyle = run.canUseEmergencyMove() ? "#6d4f43" : "#343a37";
      ctx.fillRect(emergency.x, emergency.y, emergency.w, emergency.h);
      ctx.strokeStyle = "#d8b36a";
      ctx.strokeRect(emergency.x + 0.5, emergency.y + 0.5, emergency.w - 1, emergency.h - 1);
      this.text(ctx, "Emergency Flare", emergency.x + 10, emergency.y + 19, 13, "#f7e5b4", "bold");
      y = emergency.y + emergency.h + 18;

      if (run.previewMode) {
        this.drawPreviewList(ctx, run, panel, y);
      } else {
        this.drawSelectedCardInfo(ctx, run, panel, y);
      }
    }

    drawSelectedCardInfo(ctx, run, panel, startY) {
      const p = this.layout.padding;
      const card = run.getSelectedCard();
      let y = startY;
      this.text(ctx, "Selected Card", panel.x + p, y, 15, "#f1e3b0", "bold");
      y += 22;
      if (card) {
        this.text(ctx, card.name, panel.x + p, y, 16, "#f0ead6", "bold");
        y += 21;
        this.text(ctx, "Cost S" + card.cost.scrap + " G" + card.cost.glow, panel.x + p, y, 13, "#e2cc8c", "bold");
        y += 19;
        this.wrapText(ctx, card.summary, panel.x + p, y, panel.w - p * 2, 12, "#c8ceb7", 3);
        y += 50;
        this.wrapText(ctx, "Traits: " + card.traits.join(", "), panel.x + p, y, panel.w - p * 2, 12, "#acc9b7", 2);
      }
      this.drawTileActionsInLeftPanel(ctx, run, panel);
    }

    drawPreviewList(ctx, run, panel, startY) {
      const p = this.layout.padding;
      const list = run.previewMode === "deck" ? run.deck.drawPile : run.deck.discardPile;
      this.text(ctx, run.previewMode === "deck" ? "Deck Preview" : "Discard Preview", panel.x + p, startY, 15, "#f1e3b0", "bold");
      list.slice(0, 7).forEach((card, index) => {
        this.text(ctx, card.name, panel.x + p, startY + 24 + index * 17, 12, "#d8dcc7");
      });
    }

    drawTileActionsInLeftPanel(ctx, run, panel) {
      if (run.pendingActions.length === 0) return;
      const p = this.layout.padding;
      const actionH = 32;
      const gap = 6;
      const total = run.pendingActions.length * actionH + (run.pendingActions.length - 1) * gap;
      let y = panel.y + panel.h - p - total;
      this.text(ctx, "Tile Actions", panel.x + p, y - 8, 14, "#f1e3b0", "bold");
      run.pendingActions.forEach((action) => {
        const area = rect(panel.x + p, y, panel.w - p * 2, actionH);
        this.hitAreas.push(Object.assign({ type: "action", actionId: action.id }, area));
        ctx.fillStyle = "#2e3d3d";
        ctx.fillRect(area.x, area.y, area.w, area.h);
        ctx.strokeStyle = "#88906f";
        ctx.strokeRect(area.x + 0.5, area.y + 0.5, area.w - 1, area.h - 1);
        this.text(ctx, action.label, area.x + 8, area.y + 14, 12, "#f4e7bf", "bold");
        this.text(ctx, action.detail, area.x + 8, area.y + 28, 10, "#c4cab8");
        y += actionH + gap;
      });
    }

    drawHandPanel(ctx, run, panel) {
      const p = this.layout.padding;
      this.text(ctx, "Hand", panel.x + p, panel.y + 21, 16, "#f1e3b0", "bold");
      const count = Math.max(1, run.deck.hand.length);
      const availableW = Math.max(1, panel.w - p * 2);
      const preferredGap = 8;
      const gap = Math.min(preferredGap, Math.max(2, Math.floor(availableW / Math.max(1, count * 18))));
      const cardW = Math.max(18, (availableW - gap * (count - 1)) / count);
      const scale = clamp(cardW / R.cardMinWidth, 0.52, 1.15);
      const cardH = Math.min(panel.h - 48, Math.max(82, Math.floor(R.cardHeight * Math.min(scale, 1))));
      const total = cardW * count + gap * (count - 1);
      let x = panel.x + p;
      const y = panel.y + 36;
      const cardPad = Math.max(4, Math.floor(8 * scale));
      const titleSize = Math.max(9, Math.floor(13 * scale));
      const bodySize = Math.max(8, Math.floor(11 * scale));
      const costSize = Math.max(9, Math.floor(12 * scale));
      const patternSize = Math.max(20, Math.min(Math.floor(42 * scale), cardW - cardPad * 2));

      run.deck.hand.forEach((card, index) => {
        const selected = index === run.selectedCardIndex;
        const affordable = ns.canAffordCard(card, run.player);
        const area = rect(x, y, cardW, cardH);
        this.hitAreas.push(Object.assign({ type: "card", index }, area));
        ctx.fillStyle = selected ? "#405f5c" : affordable ? "#243335" : "#342f2d";
        ctx.fillRect(area.x, area.y, area.w, area.h);
        ctx.strokeStyle = selected ? "#f3df7c" : "#657372";
        ctx.lineWidth = selected ? 3 : 1;
        ctx.strokeRect(area.x + 0.5, area.y + 0.5, area.w - 1, area.h - 1);
        ctx.lineWidth = 1;
        this.text(ctx, card.name, area.x + cardPad, area.y + Math.max(14, Math.floor(20 * scale)), titleSize, "#f6edcf", "bold");
        this.drawMovementPattern(ctx, card, area.x + cardPad, area.y + Math.floor(30 * scale), patternSize);
        this.wrapText(ctx, card.summary, area.x + cardPad, area.y + Math.floor(78 * scale), area.w - cardPad * 2, bodySize, "#cbd2be", 2);
        this.text(ctx, "S" + card.cost.scrap + " G" + card.cost.glow, area.x + cardPad, area.y + area.h - Math.max(7, Math.floor(10 * scale)), costSize, affordable ? "#f0d98f" : "#c98778", "bold");
        x += cardW + gap;
      });
    }

    drawMovementPattern(ctx, card, x, y, size) {
      const cell = Math.floor(size / 3);
      ctx.fillStyle = "#111819";
      ctx.fillRect(x, y, cell * 3, cell * 3);
      ctx.strokeStyle = "#384547";
      for (let i = 0; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * cell + 0.5, y);
        ctx.lineTo(x + i * cell + 0.5, y + cell * 3);
        ctx.moveTo(x, y + i * cell + 0.5);
        ctx.lineTo(x + cell * 3, y + i * cell + 0.5);
        ctx.stroke();
      }
      ctx.fillStyle = "#f0ead6";
      ctx.fillRect(x + cell + 4, y + cell + 4, cell - 8, cell - 8);
      ctx.fillStyle = "#f3df7c";
      card.offsets.forEach((offset) => {
        const c = clamp(1 + offset.col, 0, 2);
        const r = clamp(1 + offset.row, 0, 2);
        ctx.fillRect(x + c * cell + 3, y + r * cell + 3, cell - 6, cell - 6);
      });
    }

    drawRunLogPanel(ctx, run, panel) {
      const p = this.layout.padding;
      this.text(ctx, "Run Log", panel.x + p, panel.y + 21, 16, "#f1e3b0", "bold");
      const logArea = rect(panel.x + p, panel.y + 36, panel.w - p * 2, panel.h - 50);
      this.lastRunLogArea = logArea;
      ctx.fillStyle = "#121a1c";
      ctx.fillRect(logArea.x, logArea.y, logArea.w, logArea.h);
      run.log.slice(0, 6).forEach((line, index) => {
        this.wrapText(ctx, line, logArea.x + 8, logArea.y + 18 + index * 29, logArea.w - 16, 12, index === 0 ? "#f0ead6" : "#aeb8a6", 2);
      });
    }

    drawOverlay(ctx, run) {
      const layout = this.layout;
      ctx.fillStyle = "rgba(4, 6, 7, 0.84)";
      ctx.fillRect(0, 0, layout.width, layout.height);
      const panel = rect(layout.width / 2 - 250, layout.height / 2 - 125, 500, 250);
      ctx.fillStyle = "#182123";
      ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
      ctx.strokeStyle = "#d7c079";
      ctx.strokeRect(panel.x + 0.5, panel.y + 0.5, panel.w - 1, panel.h - 1);

      const title = run.status === "won" ? "Run Complete" : run.status === "lost" ? "Run Lost" : "Never South";
      const body = run.status === "title" ? "Move by cards only. The world hides in black until you get close." : run.message;
      this.text(ctx, title, panel.x + 38, panel.y + 60, 30, "#f1e3b0", "bold");
      this.wrapText(ctx, body, panel.x + 38, panel.y + 102, panel.w - 76, 16, "#e7dfc6", 3);

      const button = rect(panel.x + 150, panel.y + 178, 200, 44);
      this.hitAreas.push(Object.assign({ type: "start" }, button));
      ctx.fillStyle = "#5b744f";
      ctx.fillRect(button.x, button.y, button.w, button.h);
      ctx.strokeStyle = "#d7c079";
      ctx.strokeRect(button.x + 0.5, button.y + 0.5, button.w - 1, button.h - 1);
      this.text(ctx, run.status === "title" ? "Start Run" : "Restart", button.x + 54, button.y + 28, 18, "#fff0c2", "bold");
    }

    drawMeter(ctx, x, y, w, h, value, color) {
      ctx.fillStyle = "#0c1112";
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, Math.max(0, Math.min(w, w * value)), h);
      ctx.strokeStyle = "#364447";
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }

    text(ctx, text, x, y, size, color, weight) {
      ctx.fillStyle = color || "#fff";
      ctx.font = (weight ? weight + " " : "") + Math.max(9, Math.floor(size)) + "px Segoe UI, Arial";
      ctx.fillText(text, x, y);
    }

    wrapText(ctx, text, x, y, maxWidth, lineHeight, color, maxLines) {
      ctx.fillStyle = color || "#fff";
      ctx.font = Math.max(9, Math.floor(lineHeight)) + "px Segoe UI, Arial";
      const words = String(text).split(" ");
      let line = "";
      let lineY = y;
      let lines = 0;
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const test = line ? line + " " + word : word;
        if (ctx.measureText(test).width > maxWidth && line) {
          lines++;
          if (maxLines && lines >= maxLines) {
            ctx.fillText(line.replace(/\s+$/, "") + "...", x, lineY);
            return;
          }
          ctx.fillText(line, x, lineY);
          line = word;
          lineY += lineHeight + 3;
        } else {
          line = test;
        }
      }
      if (line) ctx.fillText(line, x, lineY);
    }
  }

  ns.NeverSouthRenderer = NeverSouthRenderer;
  window.NeverSouth = ns;
})();
