// Terrain helpers keep the terraced battlefield responsive to viewport height.

  function terrainOffset() {
    const bottomReserve = state.w <= 900 || state.h < 820 ? 220 : 154;
    const desired = clamp(state.h * 0.17, 95, 180);
    const safeMax = Math.max(52, state.h - bottomReserve - TERRAIN_VISIBLE_FLOOR);
    return Math.min(desired, safeMax);
  }

  function terrainBaseY(x) {
    for (let i = 0; i < TERRAIN_POINTS.length - 1; i++) {
      const [x1, y1] = TERRAIN_POINTS[i];
      const [x2, y2] = TERRAIN_POINTS[i + 1];
      if (x >= x1 && x <= x2) {
        const t = (x - x1) / (x2 - x1);
        return lerp(y1, y2, t);
      }
    }
    return TERRAIN_MAX_BASE_Y;
  }

  function terrainY(x) {
    return terrainBaseY(x) + terrainOffset();
  }

  function terrainSlope(x) {
    return (terrainY(x + 2) - terrainY(x - 2)) / 4;
  }

Object.assign(window.CastlefallValley, { terrainOffset, terrainBaseY, terrainY, terrainSlope });
