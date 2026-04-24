/**
 * Renderer Class - Handles all rendering operations
 */
class Renderer {
    constructor(ctx, canvas) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.width = canvas.width;
        this.height = canvas.height;
        
        // Rendering settings
        this.settings = {
            showDebugInfo: false,
            showGrid: false,
            showCollisionBoxes: false,
            particleEffects: true
        };
        
        // Object pooling for performance
        this.objectPool = {
            screenPositions: [], // Reusable position objects
            gradients: new Map(), // Cached gradients
            maxPoolSize: 100
        };
        
        // Coordinate transform cache
        this.transformCache = new Map();
        this.cacheSize = 0;
        this.maxCacheSize = 1000;
        
        // Specialized renderers
        try {
            this.myceliumRenderer = new MyceliumRenderer();
        } catch (error) {
            console.error('Error creating MyceliumRenderer:', error);
            this.myceliumRenderer = null;
        }
        this.animationTime = 0;
        
        // Performance monitoring
        this.renderStats = {
            lastFrameTime: 0,
            averageFrameTime: 0,
            frameCount: 0
        };
    }
    
    /**
     * Clear the canvas
     */
    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }
    
    /**
     * Render the background
     */
    renderBackground(camera) {
        // Create gradient background
        const gradient = this.ctx.createRadialGradient(
            this.width / 2, this.height / 2, 0,
            this.width / 2, this.height / 2, Math.max(this.width, this.height) / 2
        );
        
        gradient.addColorStop(0, '#0f3460');
        gradient.addColorStop(0.5, '#1a1a2e');
        gradient.addColorStop(1, '#0d1421');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Render grid if enabled
        if (this.settings.showGrid) {
            this.renderGrid(camera);
        }
        
        // Render some background particles/stars
        this.renderBackgroundParticles(camera);
    }
    
    /**
     * Render background grid
     */
    renderGrid(camera) {
        const zoom = camera.zoom || 1.0;
        const gridSize = 50 * zoom; // Scale grid size with zoom
        const offsetX = (camera.x * zoom) % gridSize;
        const offsetY = (camera.y * zoom) % gridSize;
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = -offsetX; x < this.width + gridSize; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = -offsetY; y < this.height + gridSize; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }
    }
    
    /**
     * Render background particles
     */
    renderBackgroundParticles(camera) {
        // Simple star field effect
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        
        for (let i = 0; i < 50; i++) {
            const x = (i * 37) % this.width;
            const y = (i * 73) % this.height;
            const size = (i % 3) + 1;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    /**
     * Convert world coordinates to screen coordinates with zoom
     * Optimized with caching for better performance
     */
    worldToScreen(worldX, worldY, camera) {
        // Input validation
        if (typeof worldX !== 'number' || typeof worldY !== 'number' || !camera) {
            return { x: 0, y: 0 };
        }

        const zoom = camera.zoom || 1.0;
        
        // Create cache key
        const cacheKey = `${worldX.toFixed(1)},${worldY.toFixed(1)},${camera.x.toFixed(1)},${camera.y.toFixed(1)},${zoom.toFixed(2)}`;
        
        // Check cache first
        if (this.transformCache.has(cacheKey)) {
            return this.transformCache.get(cacheKey);
        }
        
        // ✅ FIXED: Calculate transform correctly
        // Camera.x/y already includes the offset to center the view
        // Adding width/2 and height/2 was causing objects to render offset to the bottom-right
        const screenX = (worldX - camera.x) * zoom;
        const screenY = (worldY - camera.y) * zoom;
        const result = { x: screenX, y: screenY };
        
        // Cache result (with size limit)
        if (this.cacheSize < this.maxCacheSize) {
            this.transformCache.set(cacheKey, result);
            this.cacheSize++;
        } else {
            // Clear cache when it gets too large
            this.transformCache.clear();
            this.cacheSize = 0;
            this.transformCache.set(cacheKey, result);
            this.cacheSize = 1;
        }
        
        return result;
    }

    /**
     * Get pooled position object to reduce allocations
     */
    getPooledPosition() {
        if (this.objectPool.screenPositions.length > 0) {
            return this.objectPool.screenPositions.pop();
        }
        return { x: 0, y: 0 };
    }

    /**
     * Return position object to pool
     */
    returnPooledPosition(pos) {
        if (this.objectPool.screenPositions.length < this.objectPool.maxPoolSize) {
            this.objectPool.screenPositions.push(pos);
        }
    }
    
    /**
     * Render the player cell with proper world-to-screen transform
     */
    renderPlayer(player, camera) {
        const props = player.getRenderProps();
        
        // ✅ FIXED: Use proper world-to-screen transform
        // The camera is positioned so the player appears at center
        const screenPos = this.worldToScreen(props.x, props.y, camera);
        const screenX = screenPos.x;
        const screenY = screenPos.y;
        
        // Calculate zoomed radius
        const zoom = camera.zoom || 1.0;
        const zoomedRadius = props.radius * zoom;
        
        // Save canvas state before rendering
        this.ctx.save();
        
        // Render shadow
        this.renderShadow(screenX, screenY, zoomedRadius);
        
        // Render main cell body with zoomed radius
        this.renderCellBody(screenX, screenY, { ...props, radius: zoomedRadius });
        
        // Restore canvas state
        this.ctx.restore();
        
        // Render debug info if enabled
        if (this.settings.showDebugInfo) {
            this.renderDebugInfo(screenX, screenY, props, 'Player');
        }
    }
    
    /**
     * Render an AI cell or enemy
     * FIXED: Proper canvas state management to prevent rendering artifacts
     */
    renderCell(cell, camera) {
        const props = cell.getRenderProps();
        const screenPos = this.worldToScreen(props.x, props.y, camera);
        const screenX = screenPos.x;
        const screenY = screenPos.y;
        
        // Calculate zoomed radius
        const zoom = camera.zoom || 1.0;
        const zoomedRadius = props.radius * zoom;
        
        // Skip rendering if outside viewport
        if (screenX + zoomedRadius < 0 || screenX - zoomedRadius > this.width ||
            screenY + zoomedRadius < 0 || screenY - zoomedRadius > this.height) {
            return;
        }
        
        // FIXED: Save canvas state before rendering to prevent state leakage
        this.ctx.save();
        
        // Render shadow
        this.renderShadow(screenX, screenY, zoomedRadius);
        
        // Render main cell body (with special handling for enemies)
        const zoomedProps = { ...props, radius: zoomedRadius };
        if (props.isEnemy) {
            this.renderEnemyBody(screenX, screenY, zoomedProps);
        } else {
            this.renderCellBody(screenX, screenY, zoomedProps);
        }
        
        // FIXED: Restore canvas state to clean up shadow and stroke properties
        this.ctx.restore();
        
        // Movement trail removed - player prefers non-circular cell shape only
        
        // Render debug info if enabled
        if (this.settings.showDebugInfo) {
            this.renderDebugInfo(screenX, screenY, props, props.enemyType || props.type);
        }
    }
    
    /**
     * Render cell body with gradient and effects
     */
    renderCellBody(x, y, props) {
        const radius = props.radius;
        
        // Create gradient
        const gradient = this.ctx.createRadialGradient(
            x - radius * 0.3, y - radius * 0.3, 0,
            x, y, radius
        );
        // Safely handle color generation with fallbacks
        const safeColor = this.ensureValidColor(props.color);
        gradient.addColorStop(0, this.lightenColor(safeColor, 0.3));
        gradient.addColorStop(0.7, safeColor);
        gradient.addColorStop(1, this.darkenColor(safeColor, 0.3));
        
        // Draw blob shape for cells (not food)
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        
        if (props.isBlob) {
            this.drawBlobShape(x, y, radius, props);
        } else {
            // Draw circular shape for food items
            this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        }
        
        this.ctx.fill();
        
        // Draw border
        this.ctx.strokeStyle = props.strokeColor;
        this.ctx.lineWidth = props.strokeWidth;
        this.ctx.stroke();
        
        // Draw inner highlight
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.beginPath();
        this.ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    /**
     * Draw blob/bean shape for cells
     */
    drawBlobShape(x, y, radius, props) {
        // Use the fixed shape seed from the cell - never changes
        const baseSeed = props.shapeSeed || 0;
        const numPoints = 10;
        const irregularity = 0.2; // Moderate irregularity for organic but stable shape
        
        // Wobble effect for fluidity
        const wobblePhase = props.wobblePhase || 0;
        const wobbleIntensity = props.wobbleIntensity || 1;
        
        // Create blob shape with gentle wobble
        const points = [];
        
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            
            // Base irregularity (completely static - uses fixed seed)
            const irregularFactor1 = Math.sin(baseSeed + angle * 2.3) * irregularity;
            const irregularFactor2 = Math.sin(baseSeed * 1.7 + angle * 4.1) * irregularity * 0.6;
            
            // Add gentle wobble effect
            const wobbleX = Math.sin(wobblePhase + angle * 1.5) * 0.3;
            const wobbleY = Math.cos(wobblePhase + angle * 1.8) * 0.3;
            const wobbleRadius = Math.sin(wobblePhase * 1.2 + angle * 2) * 0.05;
            
            let currentRadius = radius * (1 + irregularFactor1 + irregularFactor2 + wobbleRadius * wobbleIntensity);
            
            // Add directional bias for bean-like shape (static)
            const directionBias = Math.sin(angle * 2) * 0.12;
            currentRadius *= (1 + directionBias);
            
            // Apply wobble to position
            const wobbleOffsetX = wobbleX * wobbleIntensity;
            const wobbleOffsetY = wobbleY * wobbleIntensity;
            
            const pointX = x + Math.cos(angle) * currentRadius + wobbleOffsetX;
            const pointY = y + Math.sin(angle) * currentRadius + wobbleOffsetY;
            
            points.push({ x: pointX, y: pointY });
        }
        
        // Draw smooth curve through points
        this.ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            const prevPoint = points[i - 1];
            const currentPoint = points[i];
            const nextPoint = points[(i + 1) % points.length];
            
            // Calculate control points for smooth curves
            const cp1x = prevPoint.x + (currentPoint.x - prevPoint.x) * 0.5;
            const cp1y = prevPoint.y + (currentPoint.y - prevPoint.y) * 0.5;
            const cp2x = currentPoint.x - (nextPoint.x - currentPoint.x) * 0.5;
            const cp2y = currentPoint.y - (nextPoint.y - currentPoint.y) * 0.5;
            
            this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, currentPoint.x, currentPoint.y);
        }
        
        this.ctx.closePath();
    }
    
    /**
     * Render enemy body with specialized visuals
     */
    renderEnemyBody(x, y, props) {
        const radius = props.radius;
        
        // Set up enemy-specific rendering based on type
        if (props.enemyType === 'amoeba') {
            this.renderAmoebaBody(x, y, props);
        } else if (props.enemyType === 'virus') {
            this.renderVirusBody(x, y, props);
        } else {
            // Fallback to regular cell body for unknown enemy types
            this.renderCellBody(x, y, props);
        }
    }
    
    /**
     * Render Amoeba enemy - soft, translucent, flowing
     */
    renderAmoebaBody(x, y, props) {
        const radius = props.radius;
        
        // Create soft gradient for amoeba
        const gradient = this.ctx.createRadialGradient(
            x - radius * 0.3, y - radius * 0.3, 0,
            x, y, radius * 1.2
        );
        
        // Soft, translucent colors with safe color handling
        const safeBaseColor = this.ensureValidColor(props.color);
        gradient.addColorStop(0, this.lightenColor(safeBaseColor, 0.4));
        gradient.addColorStop(0.6, safeBaseColor);
        gradient.addColorStop(1, this.darkenColor(safeBaseColor, 0.2));
        
        // Draw main body with flowing wobble
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        
        // Enhanced wobble for amoeba
        this.drawFlowingBlob(x, y, radius, props);
        
        this.ctx.fill();
        
        // Soft border
        this.ctx.strokeStyle = props.strokeColor;
        this.ctx.lineWidth = props.strokeWidth;
        this.ctx.stroke();
        
        // Render engulf radius indicator when hunting
        if (props.aiState === 'hunt') {
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.arc(x, y, props.engulfRadius || radius * 1.5, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    }
    
    /**
     * Render Virus enemy - spiky, aggressive appearance
     */
    renderVirusBody(x, y, props) {
        const radius = props.radius;
        
        // Create sharp gradient for virus
        const gradient = this.ctx.createRadialGradient(
            x - radius * 0.2, y - radius * 0.2, 0,
            x, y, radius
        );
        
        // Safely handle color generation with fallbacks
        const safeColor = this.ensureValidColor(props.color);
        gradient.addColorStop(0, this.lightenColor(safeColor, 0.3));
        gradient.addColorStop(0.7, safeColor);
        gradient.addColorStop(1, this.darkenColor(safeColor, 0.4));
        
        // Draw main body
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw spikes
        this.drawVirusSpikes(x, y, radius, props);
        
        // Aggressive border
        this.ctx.strokeStyle = props.strokeColor;
        this.ctx.lineWidth = props.strokeWidth;
        this.ctx.stroke();
        
        // Render kill radius indicator when hunting
        if (props.aiState === 'hunt') {
            this.ctx.strokeStyle = 'rgba(255, 107, 107, 0.4)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([3, 3]);
            this.ctx.beginPath();
            this.ctx.arc(x, y, props.killRadius || radius * 1.2, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
        
        // Cluster indicator
        if (props.clusterRole === 'leader') {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    /**
     * Render virus connections - draw lines between connected viruses
     */
    renderVirusConnections(viruses, camera) {
        // Create a set to avoid duplicate connections
        const renderedConnections = new Set();
        
        viruses.forEach(virus => {
            if (virus.connectedViruses && virus.connectedViruses.size > 0) {
                const screenPos = this.worldToScreen(virus.x, virus.y, camera);
                const screenX = screenPos.x;
                const screenY = screenPos.y;
                
                virus.connectedViruses.forEach(connectedVirusId => {
                    // Create unique connection identifier to avoid duplicates
                    const connectionId = [virus.uniqueId, connectedVirusId].sort().join('-');
                    
                    if (!renderedConnections.has(connectionId)) {
                        // Find the connected virus
                        const connectedVirus = viruses.find(v => v.uniqueId === connectedVirusId);
                        
                        if (connectedVirus) {
                            const connectedScreenPos = this.worldToScreen(connectedVirus.x, connectedVirus.y, camera);
                            const connectedScreenX = connectedScreenPos.x;
                            const connectedScreenY = connectedScreenPos.y;
                            
                            // Draw connection line
                            this.ctx.strokeStyle = 'rgba(255, 107, 107, 0.6)';
                            this.ctx.lineWidth = 2;
                            this.ctx.setLineDash([5, 5]);
                            
                            this.ctx.beginPath();
                            this.ctx.moveTo(screenX, screenY);
                            this.ctx.lineTo(connectedScreenX, connectedScreenY);
                            this.ctx.stroke();
                            
                            this.ctx.setLineDash([]);
                            
                            renderedConnections.add(connectionId);
                        }
                    }
                });
            }
        });
    }
    
    /**
     * Draw flowing blob shape for amoeba
     */
    drawFlowingBlob(x, y, radius, props) {
        const baseSeed = props.shapeSeed || 0;
        const numPoints = 12;
        const irregularity = 0.25;
        
        // Enhanced wobble for flowing effect
        const wobblePhase = props.wobblePhase || 0;
        const wobbleIntensity = props.wobbleIntensity || 1;
        const flowPhase = props.amoebaFlow || 0;
        
        const points = [];
        
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            
            // Base irregularity
            const irregularFactor1 = Math.sin(baseSeed + angle * 2.1) * irregularity;
            const irregularFactor2 = Math.sin(baseSeed * 1.3 + angle * 3.7) * irregularity * 0.6;
            
            // Enhanced wobble for flowing effect
            const wobbleX = Math.sin(wobblePhase + angle * 1.2) * 0.4;
            const wobbleY = Math.cos(wobblePhase + angle * 1.5) * 0.4;
            const wobbleRadius = Math.sin(wobblePhase * 0.8 + angle * 1.8) * 0.08;
            
            // Flow effect
            const flowX = Math.sin(flowPhase + angle * 0.8) * 0.2;
            const flowY = Math.cos(flowPhase + angle * 1.1) * 0.2;
            
            let currentRadius = radius * (1 + irregularFactor1 + irregularFactor2 + wobbleRadius * wobbleIntensity);
            
            // Apply all effects
            const pointX = x + Math.cos(angle) * currentRadius + (wobbleX + flowX) * wobbleIntensity;
            const pointY = y + Math.sin(angle) * currentRadius + (wobbleY + flowY) * wobbleIntensity;
            
            points.push({ x: pointX, y: pointY });
        }
        
        // Draw smooth curve
        this.ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            const prevPoint = points[i - 1];
            const currentPoint = points[i];
            const nextPoint = points[(i + 1) % points.length];
            
            const cp1x = prevPoint.x + (currentPoint.x - prevPoint.x) * 0.5;
            const cp1y = prevPoint.y + (currentPoint.y - prevPoint.y) * 0.5;
            const cp2x = currentPoint.x - (nextPoint.x - currentPoint.x) * 0.5;
            const cp2y = currentPoint.y - (nextPoint.y - currentPoint.y) * 0.5;
            
            this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, currentPoint.x, currentPoint.y);
        }
        
        this.ctx.closePath();
    }
    
    /**
     * Draw virus spikes
     */
    drawVirusSpikes(x, y, radius, props) {
        const spikeCount = props.spikeCount || 6;
        const spikeLength = props.spikeLength || radius * 0.3;
        
        this.ctx.strokeStyle = props.strokeColor;
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        
        for (let i = 0; i < spikeCount; i++) {
            const angle = (i / spikeCount) * Math.PI * 2;
            
            // Spike base on circle edge
            const spikeStartX = x + Math.cos(angle) * radius;
            const spikeStartY = y + Math.sin(angle) * radius;
            
            // Spike extends outward
            const spikeEndX = spikeStartX + Math.cos(angle) * spikeLength;
            const spikeEndY = spikeStartY + Math.sin(angle) * spikeLength;
            
            this.ctx.beginPath();
            this.ctx.moveTo(spikeStartX, spikeStartY);
            this.ctx.lineTo(spikeEndX, spikeEndY);
            this.ctx.stroke();
        }
        
        this.ctx.lineCap = 'butt'; // Reset line cap
    }
    
    /**
     * Render environmental elements (biomes, obstacles, hazards, currents)
     */
    renderEnvironment(environmentElements, camera) {
        if (!environmentElements) return;
        
        // Render biomes (background layer)
        if (environmentElements.biomes) {
            environmentElements.biomes.forEach(biome => {
                this.renderBiome(biome, camera);
            });
        }
        
        // Render obstacles (DISABLED)
        // Render food spawners
        if (environmentElements.obstacles) {
            environmentElements.obstacles.forEach(spawner => {
                this.renderObstacle(spawner, camera);
            });
        }
        
        // Render hazards (only if enabled)
        if (CELLVIVE_CONSTANTS.ENVIRONMENT.HAZARDS.ENABLED && environmentElements.hazards) {
            environmentElements.hazards.forEach(hazard => {
                this.renderHazard(hazard, camera);
            });
        }
        
        // Render currents
        if (environmentElements.currents) {
            environmentElements.currents.forEach(current => {
                this.renderCurrent(current, camera);
            });
        }
    }
    
    /**
     * Render a biome
     */
    renderBiome(biome, camera) {
        // Input validation
        if (!biome || !camera) {
            console.warn('Renderer.renderBiome: Invalid parameters');
            return;
        }

        // All zones now use mycelium network visuals for consistency
        if (this.myceliumRenderer) {
            try {
                this.myceliumRenderer.renderMyceliumNetwork(this.ctx, biome, camera, this.animationTime);
            } catch (error) {
                console.error(`Error in ${biome.type} mycelium renderer:`, error);
                // Fallback to simple rendering if mycelium fails
                this.renderSimpleBiome(biome, camera);
            }
        } else {
            console.error('MyceliumRenderer is null! Cannot render biome.');
            this.renderSimpleBiome(biome, camera);
        }
    }

    /**
     * Simple fallback biome rendering
     */
    renderSimpleBiome(biome, camera) {
        const zoom = camera.zoom || 1.0;
        const screenPos = this.worldToScreen(biome.x, biome.y, camera);
        
        this.ctx.save();
        this.ctx.globalAlpha = biome.opacity || 0.3;
        this.ctx.fillStyle = biome.color || '#90EE90';
        
        // Simple circle rendering as fallback
        const radius = Math.min(biome.width, biome.height) / 2 * zoom;
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    
    
    
    
    /**
     * Render an obstacle
     */
    renderObstacle(spawner, camera) {
        const screenX = spawner.x - camera.x;
        const screenY = spawner.y - camera.y;
        
        // Skip if outside viewport
        if (screenX + spawner.radius < 0 || screenX - spawner.radius > this.width ||
            screenY + spawner.radius < 0 || screenY - spawner.radius > this.height) {
            return;
        }
        
        this.ctx.fillStyle = spawner.color;
        this.ctx.strokeStyle = spawner.strokeColor;
        this.ctx.lineWidth = spawner.strokeWidth;
        
        // Render natural polygon shape
        if (spawner.points && spawner.points.length > 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(screenX + spawner.points[0].x - spawner.x, screenY + spawner.points[0].y - spawner.y);
            
            for (let i = 1; i < spawner.points.length; i++) {
                this.ctx.lineTo(screenX + spawner.points[i].x - spawner.x, screenY + spawner.points[i].y - spawner.y);
            }
            
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
            
            // Add subtle glow effect
            this.ctx.shadowColor = spawner.color;
            this.ctx.shadowBlur = 10;
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
        } else {
            // Fallback to circle if no points
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, spawner.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        }
    }
    
    /**
     * Render a hazard with irregular shape
     */
    renderHazard(hazard, camera) {
        const screenX = hazard.x - camera.x;
        const screenY = hazard.y - camera.y;
        
        // Skip if outside viewport
        if (screenX + hazard.width < 0 || screenX - hazard.width > this.width ||
            screenY + hazard.height < 0 || screenY - hazard.height > this.height) {
            return;
        }
        
        this.ctx.save();
        
        // Special rendering for acid lakes
        if (hazard.type === 'acid') {
            this.renderAcidLake(hazard, camera);
        } else {
            // Standard hazard rendering
            this.ctx.globalAlpha = hazard.opacity;
            
            // Set up hazard pattern
            this.setupHazardPattern(hazard);
            
            // Draw irregular hazard shape
            this.drawIrregularHazardShape(hazard, camera);
            
            // Add warning border
            this.ctx.globalAlpha = 0.6;
            this.ctx.strokeStyle = '#FF0000';
            this.ctx.lineWidth = 3;
            this.ctx.setLineDash([5, 5]);
            
            // Draw warning border around irregular shape
            this.drawIrregularHazardBorder(hazard, camera);
            
            this.ctx.setLineDash([]);
        }
        
        this.ctx.restore();
    }
    
    /**
     * Render acid lake with organic circular appearance
     */
    renderAcidLake(hazard, camera) {
        const screenX = hazard.x - camera.x;
        const screenY = hazard.y - camera.y;
        
        // Create organic acid pool gradient
        const gradient = this.ctx.createRadialGradient(
            screenX, screenY, 0,
            screenX, screenY, Math.min(hazard.width, hazard.height) / 2
        );
        
        // Acid gradient from orange to red
        gradient.addColorStop(0, 'rgba(255, 165, 0, 0.8)'); // Orange center
        gradient.addColorStop(0.5, 'rgba(255, 69, 0, 0.6)'); // Orange-red middle
        gradient.addColorStop(1, 'rgba(220, 20, 60, 0.4)'); // Crimson edge
        
        this.ctx.fillStyle = gradient;
        
        // Draw organic acid pool shape
        this.drawIrregularHazardShape(hazard, camera);
        
        // Add bubbling effect
        this.drawAcidBubbles(hazard, camera);
        
        // Add subtle warning border
        this.ctx.globalAlpha = 0.7;
        this.ctx.strokeStyle = '#FF4500';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([3, 3]);
        this.drawIrregularHazardBorder(hazard, camera);
        this.ctx.setLineDash([]);
        
        // Add steam effect around edges
        this.drawAcidSteam(hazard, camera);
    }
    
    /**
     * Draw bubbling effect for acid lake
     */
    drawAcidBubbles(hazard, camera) {
        const screenX = hazard.x - camera.x;
        const screenY = hazard.y - camera.y;
        const radius = Math.min(hazard.width, hazard.height) / 2;
        
        // Animate bubbles based on hazard animation phase
        const bubblePhase = hazard.animationPhase || 0;
        
        this.ctx.globalAlpha = 0.6;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        
        // Draw multiple bubbles
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + bubblePhase;
            const distance = (radius * 0.3) + Math.sin(bubblePhase * 2 + i) * (radius * 0.2);
            const bubbleX = screenX + Math.cos(angle) * distance;
            const bubbleY = screenY + Math.sin(angle) * distance;
            
            // Bubble size varies with animation
            const bubbleSize = 2 + Math.sin(bubblePhase * 3 + i * 2) * 2;
            
            this.ctx.beginPath();
            this.ctx.arc(bubbleX, bubbleY, bubbleSize, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.globalAlpha = 1;
    }
    
    /**
     * Draw steam effect around acid lake edges
     */
    drawAcidSteam(hazard, camera) {
        const screenX = hazard.x - camera.x;
        const screenY = hazard.y - camera.y;
        const radius = Math.min(hazard.width, hazard.height) / 2;
        
        const steamPhase = hazard.pulsePhase || 0;
        
        this.ctx.globalAlpha = 0.3;
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.lineWidth = 1;
        
        // Draw steam wisps around the perimeter
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2 + steamPhase * 0.5;
            const startDistance = radius + 5 + Math.sin(steamPhase + i) * 3;
            const endDistance = radius + 15 + Math.sin(steamPhase + i * 1.5) * 8;
            
            const startX = screenX + Math.cos(angle) * startDistance;
            const startY = screenY + Math.sin(angle) * startDistance;
            const endX = screenX + Math.cos(angle) * endDistance;
            const endY = screenY + Math.sin(angle) * endDistance;
            
            this.ctx.beginPath();
            this.ctx.moveTo(startX, startY);
            this.ctx.lineTo(endX, endY);
            this.ctx.stroke();
        }
        
        this.ctx.globalAlpha = 1;
    }
    
    /**
     * Draw irregular hazard shape
     */
    drawIrregularHazardShape(hazard, camera) {
        if (!hazard.shapePoints || hazard.shapePoints.length === 0) {
            // Fallback to circular shape if no points defined
            const screenX = hazard.x - camera.x;
            const screenY = hazard.y - camera.y;
            const radius = Math.min(hazard.width, hazard.height) / 2;
            
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
            this.ctx.fill();
            return;
        }
        
        // Convert world coordinates to screen coordinates
        const screenPoints = hazard.shapePoints.map(point => ({
            x: point.x - camera.x,
            y: point.y - camera.y
        }));
        
        // Draw irregular polygon
        this.ctx.beginPath();
        this.ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
        
        for (let i = 1; i < screenPoints.length; i++) {
            this.ctx.lineTo(screenPoints[i].x, screenPoints[i].y);
        }
        
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    /**
     * Draw warning border around irregular hazard shape
     */
    drawIrregularHazardBorder(hazard, camera) {
        if (!hazard.shapePoints || hazard.shapePoints.length === 0) {
            // Fallback to circular border if no points defined
            const screenX = hazard.x - camera.x;
            const screenY = hazard.y - camera.y;
            const radius = Math.min(hazard.width, hazard.height) / 2;
            
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
            this.ctx.stroke();
            return;
        }
        
        // Convert world coordinates to screen coordinates
        const screenPoints = hazard.shapePoints.map(point => ({
            x: point.x - camera.x,
            y: point.y - camera.y
        }));
        
        // Draw irregular polygon border
        this.ctx.beginPath();
        this.ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
        
        for (let i = 1; i < screenPoints.length; i++) {
            this.ctx.lineTo(screenPoints[i].x, screenPoints[i].y);
        }
        
        this.ctx.closePath();
        this.ctx.stroke();
    }
    
    /**
     * Set up hazard pattern for rendering
     */
    setupHazardPattern(hazard) {
        switch (hazard.pattern) {
            case 'bubbles':
                this.setupBubblesPattern(hazard);
                break;
            case 'waves':
                this.setupWavesPattern(hazard);
                break;
            case 'solid':
            default:
                this.ctx.fillStyle = hazard.color;
                break;
        }
    }
    
    /**
     * Set up bubbles pattern for hazards
     */
    setupBubblesPattern(hazard) {
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = 30;
        patternCanvas.height = 30;
        const patternCtx = patternCanvas.getContext('2d');
        
        patternCtx.fillStyle = hazard.color;
        patternCtx.beginPath();
        patternCtx.arc(8, 8, 3, 0, Math.PI * 2);
        patternCtx.arc(20, 15, 2, 0, Math.PI * 2);
        patternCtx.arc(12, 22, 2.5, 0, Math.PI * 2);
        patternCtx.fill();
        
        const pattern = this.ctx.createPattern(patternCanvas, 'repeat');
        this.ctx.fillStyle = pattern;
    }
    
    /**
     * Set up waves pattern for hazards
     */
    setupWavesPattern(hazard) {
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = 40;
        patternCanvas.height = 40;
        const patternCtx = patternCanvas.getContext('2d');
        
        patternCtx.strokeStyle = hazard.color;
        patternCtx.lineWidth = 2;
        
        for (let i = 0; i < 3; i++) {
            patternCtx.beginPath();
            patternCtx.arc(20, 20, 5 + i * 8, 0, Math.PI * 2);
            patternCtx.stroke();
        }
        
        const pattern = this.ctx.createPattern(patternCanvas, 'repeat');
        this.ctx.fillStyle = pattern;
    }
    
    /**
     * Render a wave stream current
     */
    renderCurrent(current, camera) {
        // Skip if outside viewport
        const startScreenX = current.startX - camera.x;
        const startScreenY = current.startY - camera.y;
        const endScreenX = current.endX - camera.x;
        const endScreenY = current.endY - camera.y;
        
        // Check if any part of the stream is visible
        const minX = Math.min(startScreenX, endScreenX) - current.streamWidth;
        const maxX = Math.max(startScreenX, endScreenX) + current.streamWidth;
        const minY = Math.min(startScreenY, endScreenY) - current.streamWidth;
        const maxY = Math.max(startScreenY, endScreenY) + current.streamWidth;
        
        if (maxX < 0 || minX > this.width || maxY < 0 || minY > this.height) {
            return;
        }
        
        this.ctx.save();
        this.ctx.globalAlpha = current.opacity;
        
        // Draw the wave stream
        this.drawWaveStream(current, camera);
        
        this.ctx.restore();
    }
    
    /**
     * Draw a beautiful wave stream
     */
    drawWaveStream(current, camera) {
        // Convert world coordinates to screen coordinates
        const startScreenX = current.startX - camera.x;
        const startScreenY = current.startY - camera.y;
        const endScreenX = current.endX - camera.x;
        const endScreenY = current.endY - camera.y;
        
        // Generate wave points along the stream
        const points = [];
        const numPoints = current.numSegments;
        
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            
            // Interpolate position along the main stream direction
            const baseX = startScreenX + t * (endScreenX - startScreenX);
            const baseY = startScreenY + t * (endScreenY - startScreenY);
            
            // Calculate wave offset
            const distance = t * current.length;
            const waveOffset = Math.sin(current.animationPhase + distance * current.waveFrequency) * current.waveAmplitude;
            
            // Apply wave offset perpendicular to stream direction
            const perpendicularAngle = current.direction + Math.PI / 2;
            const waveX = baseX + Math.cos(perpendicularAngle) * waveOffset;
            const waveY = baseY + Math.sin(perpendicularAngle) * waveOffset;
            
            points.push({ x: waveX, y: waveY });
        }
        
        // Draw the wave stream ribbon
        this.drawWaveRibbon(points, current);
        
        // Add flow highlights
        this.drawWaveHighlights(points, current);
    }
    
    /**
     * Draw a flowing ribbon along the flow points
     */
    drawWaveRibbon(points, current) {
        if (points.length < 2) return;
        
        // Create gradient along the stream
        const startPoint = points[0];
        const endPoint = points[points.length - 1];
        const gradient = this.ctx.createLinearGradient(
            startPoint.x, startPoint.y,
            endPoint.x, endPoint.y
        );
        
        // White transparent gradient for beautiful flow effect
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.4)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.6)');
        gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 2;
        
        // Draw the main stream path
        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            const prevPoint = points[i - 1];
            const currentPoint = points[i];
            const nextPoint = points[i + 1] || currentPoint;
            
            // Calculate control points for smooth curves
            const cp1x = prevPoint.x + (currentPoint.x - prevPoint.x) * 0.5;
            const cp1y = prevPoint.y + (currentPoint.y - prevPoint.y) * 0.5;
            const cp2x = currentPoint.x - (nextPoint.x - currentPoint.x) * 0.5;
            const cp2y = currentPoint.y - (nextPoint.y - currentPoint.y) * 0.5;
            
            this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, currentPoint.x, currentPoint.y);
        }
        
        // Draw the stream as a thick ribbon
        this.ctx.lineWidth = current.streamWidth;
        this.ctx.stroke();
    }
    
    /**
     * Draw subtle highlights on the flow stream
     */
    drawWaveHighlights(points, current) {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        
        // Draw highlight along the center of the flow
        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            const prevPoint = points[i - 1];
            const currentPoint = points[i];
            const nextPoint = points[i + 1] || currentPoint;
            
            const cp1x = prevPoint.x + (currentPoint.x - prevPoint.x) * 0.5;
            const cp1y = prevPoint.y + (currentPoint.y - prevPoint.y) * 0.5;
            const cp2x = currentPoint.x - (nextPoint.x - currentPoint.x) * 0.5;
            const cp2y = currentPoint.y - (nextPoint.y - currentPoint.y) * 0.5;
            
            this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, currentPoint.x, currentPoint.y);
        }
        
        this.ctx.stroke();
    }
    
    /**
     * Set up current pattern for rendering
     */
    setupCurrentPattern(current) {
        switch (current.pattern) {
            case 'flow':
                this.setupFlowPattern(current);
                break;
            case 'swirl':
                this.setupSwirlPattern(current);
                break;
            case 'linear':
                this.setupLinearPattern(current);
                break;
            case 'solid':
            default:
                this.ctx.fillStyle = current.color;
                break;
        }
    }
    
    /**
     * Set up flow pattern for currents
     */
    setupFlowPattern(current) {
        // Simple flow lines
        this.ctx.fillStyle = current.color;
    }
    
    /**
     * Set up swirl pattern for currents
     */
    setupSwirlPattern(current) {
        // Swirl effect using curved lines
        this.ctx.fillStyle = current.color;
    }
    
    /**
     * Set up linear pattern for currents
     */
    setupLinearPattern(current) {
        // Straight flow lines
        this.ctx.fillStyle = current.color;
    }
    
    /**
     * Draw flow arrows to show current direction
     */
    drawFlowArrows(x, y, current) {
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = 0.6;
        
        // Draw arrows showing flow direction
        const arrowCount = 3;
        const arrowSpacing = Math.min(current.width, current.height) / arrowCount;
        
        for (let i = 0; i < arrowCount; i++) {
            for (let j = 0; j < arrowCount; j++) {
                const arrowX = x - current.width / 2 + (i + 0.5) * arrowSpacing;
                const arrowY = y - current.height / 2 + (j + 0.5) * arrowSpacing;
                
                this.drawArrow(arrowX, arrowY, current.direction);
            }
        }
        
        this.ctx.globalAlpha = 1.0;
    }
    
    /**
     * Draw a single arrow
     */
    drawArrow(x, y, direction) {
        const arrowLength = 15;
        const arrowHeadLength = 5;
        
        const endX = x + Math.cos(direction) * arrowLength;
        const endY = y + Math.sin(direction) * arrowLength;
        
        // Draw arrow shaft
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();
        
        // Draw arrow head
        const headAngle1 = direction + Math.PI * 0.8;
        const headAngle2 = direction - Math.PI * 0.8;
        
        this.ctx.beginPath();
        this.ctx.moveTo(endX, endY);
        this.ctx.lineTo(
            endX + Math.cos(headAngle1) * arrowHeadLength,
            endY + Math.sin(headAngle1) * arrowHeadLength
        );
        this.ctx.moveTo(endX, endY);
        this.ctx.lineTo(
            endX + Math.cos(headAngle2) * arrowHeadLength,
            endY + Math.sin(headAngle2) * arrowHeadLength
        );
        this.ctx.stroke();
    }
    
    /**
     * Render shadow under cell
     * FIXED: More explicit about shadow state management
     */
    renderShadow(x, y, radius) {
        const shadowOffset = radius * 0.1;
        const shadowBlur = radius * 0.3;
        
        // FIXED: Set shadow properties (these will be cleaned up by save/restore in calling function)
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.ctx.shadowBlur = shadowBlur;
        this.ctx.shadowOffsetX = shadowOffset;
        this.ctx.shadowOffsetY = shadowOffset;
        
        // NOTE: Shadow properties are set here and will be applied to the next drawing operation
        // The calling function (renderPlayer/renderCell) is responsible for save/restore
    }
    
    /**
     * Render health bar above player
     */
    renderHealthBar(x, y, props) {
        if (props.health === undefined) return;
        
        const barWidth = props.radius * 2;
        const barHeight = 6;
        const healthPercent = props.health / props.maxHealth;
        
        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(x - barWidth / 2, y, barWidth, barHeight);
        
        // Health bar
        this.ctx.fillStyle = healthPercent > 0.5 ? '#4ecdc4' : 
                           healthPercent > 0.25 ? '#f9ca24' : '#ff6b6b';
        this.ctx.fillRect(x - barWidth / 2, y, barWidth * healthPercent, barHeight);
        
        // Border
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x - barWidth / 2, y, barWidth, barHeight);
    }
    
    
    /**
     * Render a power-up
     */
    renderPowerUp(powerUp, camera) {
        const screenX = powerUp.x - camera.x;
        const screenY = powerUp.y - camera.y;
        
        // Skip if outside viewport
        if (screenX + powerUp.radius < 0 || screenX - powerUp.radius > this.width ||
            screenY + powerUp.radius < 0 || screenY - powerUp.radius > this.height) {
            return;
        }
        
        this.ctx.save();
        
        // Subtle pulse effect like other cells
        const pulseScale = 1 + Math.sin(powerUp.pulsePhase) * 0.1;
        const scaledRadius = powerUp.radius * pulseScale;
        
        // Create gradient like food cells
        const gradient = this.ctx.createRadialGradient(
            screenX, screenY, 0,
            screenX, screenY, scaledRadius
        );
        
        // Use cell-like gradient for new power-up types
        if (powerUp.color === '#FFD700') {
            // Energy cells - golden gradient
            gradient.addColorStop(0, '#FFF8DC'); // Cornsilk
            gradient.addColorStop(0.7, '#FFD700'); // Gold
            gradient.addColorStop(1, '#DAA520'); // Goldenrod
        } else if (powerUp.color === '#32CD32') {
            // Size boost cells - green gradient
            gradient.addColorStop(0, '#90EE90'); // Light green
            gradient.addColorStop(0.7, '#32CD32'); // Lime green
            gradient.addColorStop(1, '#228B22'); // Forest green
        } else if (powerUp.color === '#FF69B4') {
            // Health cells - pink gradient
            gradient.addColorStop(0, '#FFB6C1'); // Light pink
            gradient.addColorStop(0.7, '#FF69B4'); // Hot pink
            gradient.addColorStop(1, '#DC143C'); // Crimson
        } else {
            // Default gradient
            gradient.addColorStop(0, '#FFF8DC'); // Cornsilk
            gradient.addColorStop(0.7, '#FFD700'); // Gold
            gradient.addColorStop(1, '#DAA520'); // Goldenrod
        }
        
        // Draw main cell body
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, scaledRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Subtle border like food cells
        this.ctx.strokeStyle = powerUp.color;
        this.ctx.lineWidth = 1.5;
        this.ctx.globalAlpha = 0.8;
        this.ctx.stroke();
        
        // Add subtle glow to distinguish from regular food
        this.ctx.shadowColor = powerUp.color;
        this.ctx.shadowBlur = 8;
        this.ctx.globalAlpha = 0.3;
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, scaledRadius * 1.2, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    /**
     * Render debug information
     */
    renderDebugInfo(x, y, props, label) {
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px monospace';
        
        const debugText = [
            `${label}: r=${Math.round(props.radius)}`,
            `pos: (${Math.round(props.x)}, ${Math.round(props.y)})`
        ];
        
        debugText.forEach((text, index) => {
            this.ctx.fillText(text, x + props.radius + 5, y - props.radius + index * 15);
        });
    }
    
    /**
     * Render UI overlay
     */
    renderUI() {
        // UI is handled by HTML/CSS, but we could render additional game-specific UI here
        if (this.settings.showDebugInfo) {
            this.renderFPS();
        }
    }
    
    /**
     * Render minimap
     */
    renderMinimap(player, camera, worldWidth, worldHeight) {
        const minimapSize = 150;
        const margin = 20;
        const x = margin;
        const y = this.height - minimapSize - margin;
        
        // Minimap background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(x, y, minimapSize, minimapSize);
        
        // Minimap border
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, minimapSize, minimapSize);
        
        // Calculate scale factors
        const scaleX = minimapSize / worldWidth;
        const scaleY = minimapSize / worldHeight;
        
        // Render player on minimap
        const playerX = x + player.x * scaleX;
        const playerY = y + player.y * scaleY;
        const playerRadius = Math.max(2, player.radius * Math.min(scaleX, scaleY));
        
        // Player circle
        this.ctx.fillStyle = player.color;
        this.ctx.beginPath();
        this.ctx.arc(playerX, playerY, playerRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Player border (white)
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Calculate effective viewport size (what the camera can see in world coordinates)
        // This matches the calculation in updateCamera()
        const effectiveViewportWidth = this.width / (camera.zoom || 1.0);
        const effectiveViewportHeight = this.height / (camera.zoom || 1.0);
        
        // Render camera viewport on minimap (adjusted for zoom)
        const viewportX = x + camera.x * scaleX;
        const viewportY = y + camera.y * scaleY;
        const viewportWidth = effectiveViewportWidth * scaleX;
        const viewportHeight = effectiveViewportHeight * scaleY;
        
        // Viewport rectangle with zoom indication
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(viewportX, viewportY, viewportWidth, viewportHeight);
        
        // Add zoom level indicator
        const zoom = camera.zoom || 1.0;
        if (zoom < 1.0) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            this.ctx.font = '10px Arial';
            this.ctx.fillText(`Zoom: ${(zoom * 100).toFixed(0)}%`, x + 5, y + 15);
        }
    }
    
    /**
     * Render FPS counter
     */
    renderFPS() {
        // This would need to be implemented with actual FPS tracking
        this.ctx.fillStyle = 'white';
        this.ctx.font = '14px monospace';
        this.ctx.fillText('FPS: 60', 10, 20);
    }
    
    /**
     * Ensure a color is valid and return a safe fallback if not
     * FIXED: Enhanced validation for all edge cases
     */
    ensureValidColor(color) {
        // FIXED: More comprehensive validation
        if (!color || 
            typeof color !== 'string' || 
            color === 'undefined' || 
            color === 'null' ||
            color.includes('NaN') ||
            color.includes('undefined') ||
            color.length === 0 ||
            color.trim().length === 0) {
            console.warn('Invalid color detected:', color, '- using fallback');
            return '#90EE90'; // Default green fallback
        }
        
        // FIXED: Additional validation for common invalid patterns
        const invalidPatterns = [
            /^rgb\([^)]*NaN/,
            /^hsl\([^)]*NaN/,
            /^rgba\([^)]*NaN/,
            /^hsla\([^)]*NaN/,
            /^#[^0-9A-Fa-f]/
        ];
        
        for (const pattern of invalidPatterns) {
            if (pattern.test(color)) {
                console.warn('Invalid color pattern detected:', color, '- using fallback');
                return '#90EE90';
            }
        }
        
        return color;
    }
    
    /**
     * Convert any color format to RGB values
     */
    parseColorToRGB(color) {
        const safeColor = this.ensureValidColor(color);
        
        // If it's already RGB
        if (safeColor.startsWith('rgb')) {
            const matches = safeColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (matches) {
                return {
                    r: parseInt(matches[1]),
                    g: parseInt(matches[2]),
                    b: parseInt(matches[3])
                };
            }
        }
        
        // If it's HSL
        if (safeColor.startsWith('hsl')) {
            const matches = safeColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
            if (matches) {
                const h = parseInt(matches[1]) / 360;
                const s = parseInt(matches[2]) / 100;
                const l = parseInt(matches[3]) / 100;
                
                const hue2rgb = (p, q, t) => {
                    if (t < 0) t += 1;
                    if (t > 1) t -= 1;
                    if (t < 1/6) return p + (q - p) * 6 * t;
                    if (t < 1/2) return q;
                    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                    return p;
                };
                
                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;
                
                return {
                    r: Math.round(hue2rgb(p, q, h + 1/3) * 255),
                    g: Math.round(hue2rgb(p, q, h) * 255),
                    b: Math.round(hue2rgb(p, q, h - 1/3) * 255)
                };
            }
        }
        
        // If it's hex
        if (safeColor.startsWith('#')) {
            const hex = safeColor.replace('#', '');
            if (hex.length === 6) {
                return {
                    r: parseInt(hex.substr(0, 2), 16),
                    g: parseInt(hex.substr(2, 2), 16),
                    b: parseInt(hex.substr(4, 2), 16)
                };
            }
        }
        
        // Fallback to default green
        return { r: 144, g: 238, b: 144 };
    }
    
    /**
     * Lighten a color
     */
    lightenColor(color, amount) {
        const rgb = this.parseColorToRGB(color);
        const r = Math.min(255, rgb.r + amount * 255);
        const g = Math.min(255, rgb.g + amount * 255);
        const b = Math.min(255, rgb.b + amount * 255);
        
        return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    }
    
    /**
     * Darken a color
     */
    darkenColor(color, amount) {
        const rgb = this.parseColorToRGB(color);
        const r = Math.max(0, rgb.r - amount * 255);
        const g = Math.max(0, rgb.g - amount * 255);
        const b = Math.max(0, rgb.b - amount * 255);
        
        return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    }
    
    /**
     * Update renderer settings
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }
    
    /**
     * Get current renderer settings
     */
    getSettings() {
        return { ...this.settings };
    }
    
    /**
     * Update renderer animation
     */
    update(deltaTime) {
        this.animationTime += deltaTime;
        
        // Safely update mycelium renderer
        if (this.myceliumRenderer && typeof this.myceliumRenderer.update === 'function') {
            this.myceliumRenderer.update(deltaTime);
        }
    }
}

/**
 * MyceliumRenderer Class - Handles rendering of organic network patterns
 * Used for toxic zones and other organic environmental effects
 */
class MyceliumRenderer {
    constructor() {
        this.networkCache = new Map(); // Cache generated networks by biome ID
        this.animationTime = 0;
    }
    
    /**
     * Generate a mycelium network for a biome
     */
    generateMyceliumNetwork(biome, density = 0.3) {
        const cacheKey = `${biome.id}_${biome.width}_${biome.height}`;
        
        if (this.networkCache.has(cacheKey)) {
            return this.networkCache.get(cacheKey);
        }
        
        // Improved cache management with LRU-style cleanup
        if (this.networkCache.size > 20) {
            // Clear oldest entries instead of entire cache
            const entries = Array.from(this.networkCache.entries());
            const keepCount = 10; // Keep 10 most recent entries
            const toDelete = entries.slice(0, entries.length - keepCount);
            
            toDelete.forEach(([key]) => {
                this.networkCache.delete(key);
            });
        }
        
        const network = {
            nodes: [],
            connections: [],
            boundingBox: {
                x: biome.x - biome.width / 2,
                y: biome.y - biome.height / 2,
                width: biome.width,
                height: biome.height
            }
        };
        
        // Generate nodes (mycelium connection points) - DENSE for massive biomes
        const area = biome.width * biome.height;
        const baseNodes = Math.floor(area * density / 4000); // More nodes for massive biomes
        const minNodes = Math.max(20, baseNodes); // At least 20 nodes for small biomes
        const numNodes = Math.min(minNodes, 50); // Cap at 50 nodes for massive biomes
        const minDistance = Math.min(60, Math.min(biome.width, biome.height) / 10); // Adaptive distance
        const maxAttempts = 2000; // More attempts for large areas
        
        
        for (let i = 0; i < numNodes; i++) {
            let attempts = 0;
            let placed = false;
            
            while (!placed && attempts < maxAttempts) {
                const x = network.boundingBox.x + Math.random() * network.boundingBox.width;
                const y = network.boundingBox.y + Math.random() * network.boundingBox.height;
                
                // Check minimum distance from existing nodes
                let validPosition = true;
                for (const node of network.nodes) {
                    const distance = Math.hypot(x - node.x, y - node.y);
                    if (distance < minDistance) {
                        validPosition = false;
                        break;
                    }
                }
                
                if (validPosition) {
                    network.nodes.push({
                        x: x,
                        y: y,
                        radius: 2, // Small, uniform dots
                        type: Math.random() < 0.15 ? 'major' : 'minor' // 15% are major nodes
                    });
                    placed = true;
                }
                attempts++;
            }
        }
        
        // Generate connections between nearby nodes - ENSURING 100% CONNECTIVITY
        const maxConnectionDistance = Math.min(200, Math.max(biome.width, biome.height) * 0.7); // Large distance for massive biomes
        for (let i = 0; i < network.nodes.length; i++) {
            const node = network.nodes[i];
            const connections = [];
            
            // Find all possible connections for this node
            for (let j = i + 1; j < network.nodes.length; j++) {
                const otherNode = network.nodes[j];
                const distance = Math.hypot(node.x - otherNode.x, node.y - otherNode.y);
                
                if (distance <= maxConnectionDistance) {
                    // Ensure all nearby nodes get connected (no orphaned dots)
                    const connectionProb = Math.max(0.8, 1 - (distance / maxConnectionDistance) * 0.5); // Higher probability, minimum 80%
                    
                    if (Math.random() < connectionProb) {
                        connections.push({
                            targetIndex: j,
                            distance: distance,
                            thickness: this.calculateConnectionThickness(node, otherNode, distance)
                        });
                    }
                }
            }
            
            // Sort by distance and take more connections to ensure connectivity
            connections.sort((a, b) => a.distance - b.distance);
            
            // Ensure at least 2 connections per node for connectivity, up to 5 for dense network
            const minConnections = Math.min(2, connections.length);
            const maxConnections = Math.min(5, connections.length);
            const numConnections = Math.max(minConnections, maxConnections);
            
            network.connections.push(connections.slice(0, numConnections));
        }
        
        // Additional pass to ensure no orphaned nodes
        this.ensureFullConnectivity(network, maxConnectionDistance);
        
        
        // Cache the network
        this.networkCache.set(cacheKey, network);
        return network;
    }
    
    /**
     * Ensure all nodes are connected (no orphaned dots)
     */
    ensureFullConnectivity(network, maxConnectionDistance) {
        // Check each node to ensure it has at least one connection
        for (let i = 0; i < network.nodes.length; i++) {
            if (network.connections[i].length === 0) {
                // Find the closest node to connect to
                let closestNode = -1;
                let closestDistance = Infinity;
                
                for (let j = 0; j < network.nodes.length; j++) {
                    if (i !== j) {
                        const distance = Math.hypot(
                            network.nodes[i].x - network.nodes[j].x,
                            network.nodes[i].y - network.nodes[j].y
                        );
                        
                        if (distance < closestDistance && distance <= maxConnectionDistance) {
                            closestDistance = distance;
                            closestNode = j;
                        }
                    }
                }
                
                // Connect to the closest node
                if (closestNode !== -1) {
                    network.connections[i].push({
                        targetIndex: closestNode,
                        distance: closestDistance,
                        thickness: this.calculateConnectionThickness(network.nodes[i], network.nodes[closestNode], closestDistance)
                    });
                    
                    // Also add the reverse connection to maintain bidirectional connectivity
                    network.connections[closestNode].push({
                        targetIndex: i,
                        distance: closestDistance,
                        thickness: this.calculateConnectionThickness(network.nodes[i], network.nodes[closestNode], closestDistance)
                    });
                }
            }
        }
    }
    
    /**
     * Calculate connection thickness based on node types and distance
     */
    calculateConnectionThickness(nodeA, nodeB, distance) {
        const baseThickness = 3.0; // Slightly thicker base
        let thickness = baseThickness;
        
        // Major nodes get thicker connections
        if (nodeA.type === 'major' || nodeB.type === 'major') {
            thickness += 2.5; // Major node bonus
        }
        
        // Closer connections are thicker
        thickness += (1 - distance / 200) * 2; // Thickness variation for large distances
        
        return Math.max(1.5, thickness); // Minimum thickness
    }
    
    /**
     * Render a mycelium network
     */
    renderMyceliumNetwork(ctx, biome, camera, animationTime = 0) {
        const network = this.generateMyceliumNetwork(biome);
        
        // ✅ FIXED: Use correct world-to-screen transform
        const zoom = camera.zoom || 1.0;
        const screenPos = {
            x: (biome.x - camera.x) * zoom,
            y: (biome.y - camera.y) * zoom
        };
        
        // Skip if outside viewport
        const screenBounds = {
            x: screenPos.x - (biome.width * zoom) / 2,
            y: screenPos.y - (biome.height * zoom) / 2,
            width: biome.width * zoom,
            height: biome.height * zoom
        };
        
        if (screenBounds.x + screenBounds.width < 0 || screenBounds.x > ctx.canvas.width ||
            screenBounds.y + screenBounds.height < 0 || screenBounds.y > ctx.canvas.height) {
            return;
        }
        
        ctx.save();
        
        // Render faint orange glow from center (background layer)
        this.renderCenterGlow(ctx, biome, camera);
        
        // Render connections (middle layer)
        this.renderConnections(ctx, network, camera, biome, 0, 0);
        
        // Render nodes (foreground layer)
        this.renderNodes(ctx, network, camera, biome, 0, 0);
        
        ctx.restore();
    }
    
    /**
     * Render faint glow from center of biome zone
     */
    renderCenterGlow(ctx, biome, camera) {
        const zoom = camera.zoom || 1.0;
        const screenPos = {
            x: (biome.x - camera.x) * zoom,
            y: (biome.y - camera.y) * zoom
        };
        
        // Calculate MUCH bigger glow radius - extends well beyond the biome
        const maxDimension = Math.max(biome.width, biome.height);
        const glowRadius = (maxDimension * zoom) * 1.5; // 3x the radius (1.5 * diameter)
        
        // Create radial gradient for faint glow - color depends on biome type
        const gradient = ctx.createRadialGradient(
            screenPos.x, screenPos.y, 0,
            screenPos.x, screenPos.y, glowRadius
        );
        
        // Choose color based on biome type
        let glowColor;
        switch (biome.type) {
            case 'toxic':
                glowColor = '220, 20, 60'; // Crimson red
                break;
            case 'aggressive':
                glowColor = '255, 165, 0'; // Orange
                break;
            case 'nutrient':
                glowColor = '144, 238, 144'; // Light green
                break;
            case 'slow':
                glowColor = '135, 206, 235'; // Sky blue
                break;
            case 'energy':
                glowColor = '255, 215, 0'; // Gold
                break;
            case 'neutral':
                glowColor = '240, 248, 255'; // Alice blue
                break;
            default:
                glowColor = '220, 20, 60'; // Default to red
        }
        
        // MUCH bigger glow that extends far beyond the network
        gradient.addColorStop(0, `rgba(${glowColor}, 0.2)`); // Stronger center for bigger glow
        gradient.addColorStop(0.2, `rgba(${glowColor}, 0.15)`); // Still strong closer in
        gradient.addColorStop(0.4, `rgba(${glowColor}, 0.1)`); // Visible in middle
        gradient.addColorStop(0.6, `rgba(${glowColor}, 0.06)`); // Still visible further out
        gradient.addColorStop(0.8, `rgba(${glowColor}, 0.03)`); // Faint but extends far
        gradient.addColorStop(1, `rgba(${glowColor}, 0)`); // Transparent at very edge
        
        // Draw the glow circle
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
        
    }
    
    /**
     * Render network connections - SIMPLE DOTS AND LINES
     */
    renderConnections(ctx, network, camera, biome, pulseIntensity, glowIntensity) {
        // Choose color based on biome type
        let connectionColor;
        switch (biome.type) {
            case 'toxic':
                connectionColor = '#DC143C'; // Crimson red
                break;
            case 'aggressive':
                connectionColor = '#FFA500'; // Orange
                break;
            case 'nutrient':
                connectionColor = '#90EE90'; // Light green
                break;
            case 'slow':
                connectionColor = '#87CEEB'; // Sky blue
                break;
            case 'energy':
                connectionColor = '#FFD700'; // Gold
                break;
            case 'neutral':
                connectionColor = '#F0F8FF'; // Alice blue
                break;
            default:
                connectionColor = '#DC143C'; // Default to red
        }
        
        ctx.strokeStyle = connectionColor;
        ctx.lineCap = 'round';
        
        // Render each connection
        const zoom = camera.zoom || 1.0;
        for (let i = 0; i < network.connections.length; i++) {
            const node = network.nodes[i];
            const nodeScreenPos = {
                x: (node.x - camera.x) * zoom,
                y: (node.y - camera.y) * zoom
            };
            
            for (const connection of network.connections[i]) {
                const targetNode = network.nodes[connection.targetIndex];
                const targetScreenPos = {
                    x: (targetNode.x - camera.x) * zoom,
                    y: (targetNode.y - camera.y) * zoom
                };
                
                // Simple straight line
                ctx.lineWidth = connection.thickness;
                
                ctx.beginPath();
                ctx.moveTo(nodeScreenPos.x, nodeScreenPos.y);
                ctx.lineTo(targetScreenPos.x, targetScreenPos.y);
                ctx.stroke();
            }
        }
    }
    
    /**
     * Render network nodes - SIMPLE DOTS
     */
    renderNodes(ctx, network, camera, biome, pulseIntensity, glowIntensity) {
        // Choose color based on biome type
        let nodeColor;
        switch (biome.type) {
            case 'toxic':
                nodeColor = '#DC143C'; // Crimson red
                break;
            case 'aggressive':
                nodeColor = '#FFA500'; // Orange
                break;
            case 'nutrient':
                nodeColor = '#90EE90'; // Light green
                break;
            case 'slow':
                nodeColor = '#87CEEB'; // Sky blue
                break;
            case 'energy':
                nodeColor = '#FFD700'; // Gold
                break;
            case 'neutral':
                nodeColor = '#F0F8FF'; // Alice blue
                break;
            default:
                nodeColor = '#DC143C'; // Default to red
        }
        
        ctx.fillStyle = nodeColor;
        
        const zoom = camera.zoom || 1.0;
        for (const node of network.nodes) {
            const screenPos = {
                x: (node.x - camera.x) * zoom,
                y: (node.y - camera.y) * zoom
            };
            
            // Simple dot
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, node.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    /**
     * Render subtle shadow overlay for depth
     */
    renderShadowOverlay(ctx, biome, camera, glowIntensity) {
        const zoom = camera.zoom || 1.0;
        const screenPos = {
            x: (biome.x - camera.x) * zoom,
            y: (biome.y - camera.y) * zoom
        };
        
        // Create radial gradient for shadow
        const gradient = ctx.createRadialGradient(
            screenPos.x, screenPos.y, 0,
            screenPos.x, screenPos.y, Math.max(biome.width, biome.height) * zoom / 2
        );
        
        gradient.addColorStop(0, `rgba(139, 69, 19, ${glowIntensity * 0.1})`);
        gradient.addColorStop(0.7, `rgba(139, 69, 19, ${glowIntensity * 0.05})`);
        gradient.addColorStop(1, 'rgba(139, 69, 19, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, Math.max(biome.width, biome.height) * zoom / 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    /**
     * Convert hex color to rgba string
     */
    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    
    /**
     * Update animation time
     */
    update(deltaTime) {
        this.animationTime += deltaTime;
    }

    /**
     * Get rendering settings
     */
    getSettings() {
        return { ...this.settings };
    }

    /**
     * Update rendering settings
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }
    
    /**
     * Clear network cache (useful for memory management)
     */
    clearCache() {
        this.networkCache.clear();
        console.log('MyceliumRenderer cache cleared');
    }
    
    /**
     * Get cache statistics for debugging
     */
    getCacheStats() {
        return {
            cacheSize: this.networkCache.size,
            animationTime: this.animationTime
        };
    }
}

// Export for use in other modules
window.Renderer = Renderer;
window.MyceliumRenderer = MyceliumRenderer;
