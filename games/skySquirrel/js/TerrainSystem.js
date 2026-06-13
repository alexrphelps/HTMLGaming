/**
 * TerrainSystem.js - Deterministic island heightmap and collision queries.
 */
(function () {
    'use strict';

    const SkySquirrel = window.SkySquirrel = window.SkySquirrel || {};
    const M = SkySquirrel.Math3D;

    class TerrainSystem {
        constructor(config = SkySquirrel.WorldConfig) {
            this.config = config;
            this.world = config.world;
            this.caldera = config.caldera;
            this.corridors = config.corridors || [];
            this.render = config.render;
            this.resolution = this.world.terrainResolution;
            this.size = this.world.size;
            this.cellSize = this.size / this.resolution;
            this.halfSize = this.size / 2;
            this.heightData = [];
            this.surfaceData = [];
            this.mesh = null;
            this.generateHeightData();
            this.mesh = this.buildTerrainMesh();
        }

        generateHeightData() {
            const count = this.resolution + 1;
            for (let z = 0; z < count; z++) {
                this.heightData[z] = [];
                this.surfaceData[z] = [];
                for (let x = 0; x < count; x++) {
                    const worldX = (x / this.resolution) * this.size - this.halfSize;
                    const worldZ = (z / this.resolution) * this.size - this.halfSize;
                    const height = this.computeHeight(worldX, worldZ);
                    this.heightData[z][x] = height;
                    this.surfaceData[z][x] = this.classifySurface(height, worldX, worldZ);
                }
            }
            this.smoothHeightData();
            for (let z = 0; z < count; z++) {
                for (let x = 0; x < count; x++) {
                    const worldX = (x / this.resolution) * this.size - this.halfSize;
                    const worldZ = (z / this.resolution) * this.size - this.halfSize;
                    this.surfaceData[z][x] = this.classifySurface(this.heightData[z][x], worldX, worldZ);
                }
            }
        }

        smoothHeightData() {
            const count = this.resolution + 1;
            const passes = this.world.smoothingPasses || 0;
            for (let pass = 0; pass < passes; pass++) {
                const next = this.heightData.map(row => row.slice());
                for (let z = 1; z < count - 1; z++) {
                    for (let x = 1; x < count - 1; x++) {
                        const worldX = (x / this.resolution) * this.size - this.halfSize;
                        const worldZ = (z / this.resolution) * this.size - this.halfSize;
                        const distance = Math.hypot(worldX, worldZ);
                        const corridor = this.getCorridorInfluence(worldX, worldZ);
                        const preserveCorridor = corridor.influence > 0.72;
                        const preserveRim = Math.abs(distance - this.caldera.rimRadius) < this.caldera.rimWidth * 0.5;
                        if (preserveCorridor || preserveRim || distance > this.world.islandRadius * 1.02) continue;
                        const average = (
                            this.heightData[z][x] * 4 +
                            this.heightData[z - 1][x] +
                            this.heightData[z + 1][x] +
                            this.heightData[z][x - 1] +
                            this.heightData[z][x + 1]
                        ) / 8;
                        next[z][x] = M.lerp(this.heightData[z][x], average, 0.56);
                    }
                }
                this.heightData = next;
            }
        }

        computeHeight(x, z) {
            const distance = Math.hypot(x, z);
            const radius01 = distance / this.world.islandRadius;
            if (radius01 >= 1.08) return this.world.waterLevel - 16;

            const radialAngle = Math.atan2(z, x);
            const islandFade = 1 - M.smoothstep(0.82, 1.02, radius01);
            const coastalCliff = Math.pow(1 - M.smoothstep(0.74, 1.0, radius01), this.caldera.coastlineSharpness);
            const outerSlope = this.caldera.coastalShelfHeight + this.caldera.outerCliffHeight * coastalCliff;
            const asymmetry = 1 + Math.sin(radialAngle * 2.0 + 0.8) * this.caldera.craterAsymmetry;
            const rimDistance = Math.abs(distance - this.caldera.rimRadius * asymmetry);
            const rimMask = 1 - M.smoothstep(this.caldera.rimWidth * 0.36, this.caldera.rimWidth, rimDistance);
            const rimBreak = 1 - this.caldera.rimBreakStrength * Math.pow(Math.abs(Math.sin(radialAngle * 3.5 + 1.2)), 1.8);
            const bowlMask = 1 - M.smoothstep(this.caldera.bowlRadius * 0.82, this.caldera.rimRadius * 0.86, distance);
            const innerWall = M.smoothstep(this.caldera.bowlRadius * 0.72, this.caldera.rimRadius * 0.96, distance);
            const macro = this.fractalNoise(x, z, 0.00058, 3, 0.48);
            const detail = this.fractalNoise(x + 1300, z - 700, 0.00125, 2, 0.38);
            let height = this.world.waterLevel + outerSlope * islandFade;

            height += this.caldera.rimHeight * rimMask * rimBreak * islandFade;
            height += this.caldera.bowlFloorHeight * bowlMask;
            height += this.caldera.bowlDepth * innerWall * (1 - M.smoothstep(this.caldera.rimRadius * 0.92, this.caldera.rimRadius * 1.26, distance));
            height += (macro * 42 + detail * 18) * islandFade * (1 - bowlMask * 0.7);

            const corridor = this.getCorridorInfluence(x, z);
            if (corridor.route && corridor.influence > 0) {
                const floor = this.getCorridorFloor(corridor.route, corridor.progress);
                const carve = corridor.influence * corridor.route.carveDepth * corridor.afterLaunchMask;
                height = M.lerp(height, Math.min(height, floor), carve);
                if (corridor.rimNotch > 0) {
                    height = M.lerp(height, Math.min(height, floor + 120), corridor.rimNotch * 0.82);
                }
            }

            Object.keys(this.config.launchSites || {}).forEach(name => {
                const raw = this.getLaunchSitePositionRaw(name);
                if (!raw) return;
                const padDistance = Math.hypot(x - raw.x, z - raw.z);
                const padMask = 1 - M.smoothstep(this.caldera.launchPadRadius * 0.55, this.caldera.launchPadRadius, padDistance);
                if (padMask > 0) {
                    height = M.lerp(height, this.caldera.launchPadHeight, padMask);
                }
            });

            const shore = M.smoothstep(0.92, 1.03, radius01);
            height = M.lerp(height, this.world.waterLevel - 6, shore);

            return Math.max(this.world.waterLevel - 24, height);
        }

        fractalNoise(x, z, scale, octaves, persistence) {
            let value = 0;
            let amplitude = 1;
            let total = 0;
            let frequency = scale;
            for (let i = 0; i < octaves; i++) {
                value += this.noise(x, z, frequency) * amplitude;
                total += amplitude;
                amplitude *= persistence;
                frequency *= 2.04;
            }
            return value / total;
        }

        noise(x, z, scale) {
            const seed = this.world.seed * 0.0001;
            return (
                Math.sin((x + seed * 101) * scale * 12.9898 + (z - seed * 37) * scale * 78.233) *
                Math.cos((x - seed * 17) * scale * 39.346 + (z + seed * 71) * scale * 11.135)
            );
        }

        classifySurface(height, x, z) {
            if (height <= this.world.waterLevel + 5) return 'sand';
            const corridor = this.getCorridorInfluence(x, z);
            if (corridor.route && corridor.route.visualAccent === 'obsidian' && corridor.influence > 0.45) return 'lavaRock';
            if (height > this.caldera.rimHeight * 0.82) return 'snow';
            const slope = 1 - this.getNormalAt(x, z, true).y;
            if (height > this.caldera.rimHeight * 0.58 || slope > 0.42) return 'rock';
            return 'grass';
        }

        getHeightAt(x, z) {
            const gridX = M.clamp(((x + this.halfSize) / this.size) * this.resolution, 0, this.resolution);
            const gridZ = M.clamp(((z + this.halfSize) / this.size) * this.resolution, 0, this.resolution);
            const x0 = Math.floor(gridX);
            const z0 = Math.floor(gridZ);
            const x1 = Math.min(this.resolution, x0 + 1);
            const z1 = Math.min(this.resolution, z0 + 1);
            const tx = gridX - x0;
            const tz = gridZ - z0;
            const h00 = this.heightData[z0][x0];
            const h10 = this.heightData[z0][x1];
            const h01 = this.heightData[z1][x0];
            const h11 = this.heightData[z1][x1];
            return M.lerp(M.lerp(h00, h10, tx), M.lerp(h01, h11, tx), tz);
        }

        getNormalAt(x, z, quiet = false) {
            const sample = quiet ? this.computeHeight.bind(this) : this.getHeightAt.bind(this);
            const step = this.cellSize;
            const left = sample(x - step, z);
            const right = sample(x + step, z);
            const down = sample(x, z - step);
            const up = sample(x, z + step);
            return M.normalize(M.vec3(left - right, step * 2, down - up));
        }

        getSurfaceType(x, z) {
            return this.classifySurface(this.getHeightAt(x, z), x, z);
        }

        getLaunchPoint(name = 'primary') {
            const raw = this.getLaunchSitePositionRaw(name) || this.getLaunchSitePositionRaw('primary');
            return {
                x: raw.x,
                y: this.getHeightAt(raw.x, raw.z) + this.world.startPadding,
                z: raw.z,
                heading: raw.route.angle,
                route: raw.route.name,
                launchRadius: this.caldera.launchPadRadius * 0.68
            };
        }

        getLaunchSitePositionRaw(name = 'primary') {
            const site = this.config.launchSites[name] || this.config.launchSites.primary;
            if (!site) return null;
            const route = this.corridors.find(item => item.name === site.corridor) || this.corridors[0];
            if (!route) return null;
            const frame = this.getCorridorFrame(route);
            const radius = this.caldera.rimRadius + (site.rimOffset || 0) + (route.launchOffset || 0);
            const lateral = site.lateralOffset || 0;
            return {
                x: -frame.dir.x * radius + frame.right.x * lateral,
                z: -frame.dir.z * radius + frame.right.z * lateral,
                route
            };
        }

        getFlightCorridors() {
            return this.corridors.map(route => ({ ...route }));
        }

        getRouteHeightProfile(routeName, samples = 9) {
            const route = this.corridors.find(item => item.name === routeName) || this.corridors[0];
            const frame = this.getCorridorFrame(route);
            const profile = [];
            for (let i = 0; i < samples; i++) {
                const progress = i / (samples - 1);
                const t = M.lerp(-this.caldera.rimRadius, this.world.islandRadius * 0.96, progress);
                const x = frame.dir.x * t;
                const z = frame.dir.z * t;
                profile.push({ x, z, height: this.getHeightAt(x, z), progress });
            }
            return profile;
        }

        getCorridorFrame(route) {
            const dir = M.normalize(M.vec3(Math.sin(route.angle), 0, -Math.cos(route.angle)));
            const right = M.vec3(Math.cos(route.angle), 0, Math.sin(route.angle));
            return { dir, right };
        }

        getCorridorInfluence(x, z) {
            let best = { route: null, influence: 0, progress: 0, lateral: Infinity, afterLaunchMask: 0, rimNotch: 0 };
            this.corridors.forEach(route => {
                const frame = this.getCorridorFrame(route);
                const t = x * frame.dir.x + z * frame.dir.z;
                const lateral = Math.abs(x * frame.right.x + z * frame.right.z);
                const progress = M.clamp((t + this.caldera.rimRadius) / (this.world.islandRadius + this.caldera.rimRadius), 0, 1);
                const alongMask = M.smoothstep(-this.caldera.rimRadius * 1.08, -this.caldera.rimRadius * 0.84, t) *
                    (1 - M.smoothstep(this.world.islandRadius * 0.98, this.world.islandRadius * 1.07, t));
                const width = M.lerp(route.rimNotchWidth || route.width, route.width, M.smoothstep(0.08, 0.28, progress));
                const lateralMask = 1 - M.smoothstep(width, width * 1.85, lateral);
                const influence = M.clamp(lateralMask * alongMask, 0, 1);
                const afterLaunchMask = M.smoothstep(0.035, 0.11, progress);
                const rimNotch = influence *
                    (1 - M.smoothstep((route.rimNotchWidth || route.width) * 0.65, (route.rimNotchWidth || route.width) * 1.45, lateral)) *
                    (1 - M.smoothstep(0.12, 0.24, progress));
                if (influence > best.influence) {
                    best = { route, influence, progress, lateral, afterLaunchMask, rimNotch };
                }
            });
            return best;
        }

        getCorridorFloor(route, progress) {
            const start = this.caldera.rimHeight + 210;
            const bowl = this.caldera.bowlFloorHeight + 80;
            const mid = route.floorHeight + 230;
            const exit = route.floorHeight;
            if (progress < 0.28) return M.lerp(start, bowl, M.smoothstep(0, 0.28, progress));
            if (progress < 0.68) return M.lerp(bowl, mid, M.smoothstep(0.28, 0.68, progress));
            return M.lerp(mid, exit, M.smoothstep(0.68, 1, progress));
        }

        isInsideIsland(x, z) {
            return Math.hypot(x, z) <= this.world.islandRadius;
        }

        getColorForSurface(surface, height) {
            const c = this.render;
            if (surface === 'sand') return c.sandColor;
            if (surface === 'lavaRock') return c.lavaRockColor || c.rockColor;
            if (surface === 'snow') return c.snowColor;
            if (surface === 'rock') return c.rockColor;
            const shade = M.clamp(height / this.caldera.rimHeight, 0, 1);
            return [
                M.lerp(c.grassColor[0], c.rockColor[0], shade * 0.35),
                M.lerp(c.grassColor[1], c.rockColor[1], shade * 0.25),
                M.lerp(c.grassColor[2], c.rockColor[2], shade * 0.2)
            ];
        }

        buildTerrainMesh() {
            const vertices = [];
            const normals = [];
            const colors = [];
            const addVertex = (xIndex, zIndex) => {
                const x = (xIndex / this.resolution) * this.size - this.halfSize;
                const z = (zIndex / this.resolution) * this.size - this.halfSize;
                const y = this.heightData[zIndex][xIndex];
                const normal = this.getNormalAt(x, z);
                const color = this.getColorForSurface(this.surfaceData[zIndex][xIndex], y);
                vertices.push(x, y, z);
                normals.push(normal.x, normal.y, normal.z);
                colors.push(color[0], color[1], color[2]);
            };

            for (let z = 0; z < this.resolution; z++) {
                for (let x = 0; x < this.resolution; x++) {
                    addVertex(x, z);
                    addVertex(x, z + 1);
                    addVertex(x + 1, z);
                    addVertex(x + 1, z);
                    addVertex(x, z + 1);
                    addVertex(x + 1, z + 1);
                }
            }

            return {
                vertices: new Float32Array(vertices),
                normals: new Float32Array(normals),
                colors: new Float32Array(colors),
                count: vertices.length / 3
            };
        }
    }

    SkySquirrel.TerrainSystem = TerrainSystem;
}());
