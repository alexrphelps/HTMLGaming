/**
 * Current Class - Moving flow fields that influence cell movement
 * Cells inside currents are pushed in the current's direction
 */
class Current {
    constructor(options = {}) {
        // Current identification
        this.id = options.id || Math.random().toString(36).substr(2, 9);
        this.type = options.type || 'flow';
        this.name = options.name || 'Unknown Current';
        
        // Wave stream properties
        this.startX = options.startX || 0;
        this.startY = options.startY || 0;
        this.endX = options.endX || 0;
        this.endY = options.endY || 0;
        this.width = options.width || 200;
        this.height = options.height || 200;
        
        // Wave properties
        this.waveAmplitude = options.waveAmplitude || 30; // How high/low the waves go
        this.waveFrequency = options.waveFrequency || 0.02; // How many waves per unit
        this.waveSpeed = options.waveSpeed || 0.03; // How fast waves move
        this.streamWidth = options.streamWidth || 40; // Width of the stream
        this.numSegments = options.numSegments || 50; // Number of segments for smooth curves
        
        // Flow properties
        this.strength = options.strength || 1.0; // How strong the current is
        this.turbulence = options.turbulence || 0.3; // Random variation in flow
        this.pullStrength = options.pullStrength || 0.8; // How strongly cells are pulled in
        
        // Calculate main flow direction from start to end
        this.direction = Math.atan2(this.endY - this.startY, this.endX - this.startX);
        this.length = Math.hypot(this.endX - this.startX, this.endY - this.startY);
        
        // Movement properties
        this.moveSpeed = options.moveSpeed || 0.5; // How fast the current itself moves
        this.moveDirection = options.moveDirection || Math.random() * Math.PI * 2;
        this.boundaryBounce = options.boundaryBounce !== false; // Whether current bounces off world edges
        
        // Visual properties
        this.color = options.color || '#87CEEB';
        this.opacity = options.opacity || 0.4; // Semi-transparent for flowing effect
        this.pattern = options.pattern || 'wave'; // 'wave', 'spiral', 'linear'
        
        // Animation properties
        this.animationPhase = Math.random() * Math.PI * 2;
        this.animationSpeed = options.animationSpeed || 0.03;
        this.directionPhase = Math.random() * Math.PI * 2;
        this.directionSpeed = options.directionSpeed || 0.01; // How much direction changes
        
        // Lifetime properties
        this.lifetime = options.lifetime || null; // Frames until current disappears
        this.age = 0;
        this.spawnTime = Date.now();
        
        console.log(`🌊 Current created: ${this.name} at (${this.x}, ${this.y})`);
    }
    
    /**
     * Check if a point is inside this wave stream
     */
    containsPoint(x, y) {
        // Calculate distance from point to the wave stream line
        const distance = this.distanceToWaveStream(x, y);
        return distance <= this.streamWidth / 2;
    }
    
    /**
     * Calculate distance from a point to the wave stream
     */
    distanceToWaveStream(x, y) {
        // Project point onto the main stream direction
        const dx = x - this.startX;
        const dy = y - this.startY;
        const projection = dx * Math.cos(this.direction) + dy * Math.sin(this.direction);
        
        // Check if point is within the stream length
        if (projection < 0 || projection > this.length) {
            return Infinity; // Point is outside stream bounds
        }
        
        // Calculate perpendicular distance to the stream centerline
        const streamX = this.startX + projection * Math.cos(this.direction);
        const streamY = this.startY + projection * Math.sin(this.direction);
        
        // Add wave offset at this position
        const waveOffset = Math.sin(this.animationPhase + projection * this.waveFrequency) * this.waveAmplitude;
        const perpendicularAngle = this.direction + Math.PI / 2;
        const waveX = streamX + Math.cos(perpendicularAngle) * waveOffset;
        const waveY = streamY + Math.sin(perpendicularAngle) * waveOffset;
        
        return Math.hypot(x - waveX, y - waveY);
    }
    
    /**
     * Check if a cell is inside this current
     */
    containsCell(cell) {
        return this.containsPoint(cell.x, cell.y);
    }
    
    /**
     * Apply current effects to a cell
     */
    applyEffects(cell) {
        if (!this.containsCell(cell)) return;
        
        // Calculate base flow direction with turbulence
        const turbulenceX = (Math.random() - 0.5) * this.turbulence;
        const turbulenceY = (Math.random() - 0.5) * this.turbulence;
        
        const flowX = Math.cos(this.direction) + turbulenceX;
        const flowY = Math.sin(this.direction) + turbulenceY;
        
        // Normalize flow vector
        const flowLength = Math.hypot(flowX, flowY);
        const normalizedFlowX = flowLength > 0 ? flowX / flowLength : 0;
        const normalizedFlowY = flowLength > 0 ? flowY / flowLength : 0;
        
        // Apply current force
        const currentForceX = normalizedFlowX * this.strength;
        const currentForceY = normalizedFlowY * this.strength;
        
        // Add current force to cell velocity
        cell.velocityX += currentForceX;
        cell.velocityY += currentForceY;
        
        // Apply pull effect - pull cell towards current center if near edge
        if (this.pullStrength > 0) {
            const dx = this.x - cell.x;
            const dy = this.y - cell.y;
            const distance = Math.hypot(dx, dy);
            
            // Only pull if cell is near the edge of the current
            const currentRadius = this.radius || Math.min(this.width, this.height) / 2;
            if (distance > currentRadius * 0.7) {
                const pullX = (dx / distance) * this.pullStrength * 0.1;
                const pullY = (dy / distance) * this.pullStrength * 0.1;
                
                cell.velocityX += pullX;
                cell.velocityY += pullY;
            }
        }
        
        // Visual feedback - make cell slightly more transparent when in current
        if (cell.currentEffect === undefined) {
            cell.currentEffect = 0;
        }
        cell.currentEffect = Math.min(20, cell.currentEffect + 5);
    }
    
    /**
     * Update current position and animation
     */
    update(worldWidth, worldHeight) {
        // Update animation phases
        this.animationPhase += this.animationSpeed;
        if (this.animationPhase > Math.PI * 2) {
            this.animationPhase -= Math.PI * 2;
        }
        
        this.directionPhase += this.directionSpeed;
        if (this.directionPhase > Math.PI * 2) {
            this.directionPhase -= Math.PI * 2;
        }
        
        // Slowly change direction over time
        this.direction += Math.sin(this.directionPhase) * 0.02;
        
        // Move the current itself
        if (this.moveSpeed > 0) {
            this.x += Math.cos(this.moveDirection) * this.moveSpeed;
            this.y += Math.sin(this.moveDirection) * this.moveSpeed;
            
            // Bounce off world boundaries
            if (this.boundaryBounce) {
                const currentRadius = this.radius || Math.min(this.width, this.height) / 2;
                
                if (this.x - currentRadius < 0 || this.x + currentRadius > worldWidth) {
                    this.moveDirection = Math.PI - this.moveDirection;
                }
                if (this.y - currentRadius < 0 || this.y + currentRadius > worldHeight) {
                    this.moveDirection = -this.moveDirection;
                }
                
                // Keep within bounds
                this.x = Math.max(currentRadius, Math.min(worldWidth - currentRadius, this.x));
                this.y = Math.max(currentRadius, Math.min(worldHeight - currentRadius, this.y));
            }
        }
        
        // Update age
        this.age++;
        
        // Check if current should disappear
        if (this.lifetime && this.age >= this.lifetime) {
            return false; // Signal for removal
        }
        
        return true; // Continue existing
    }
    
    /**
     * Get render properties for this wave stream
     */
    getRenderProps() {
        return {
            type: this.type,
            name: this.name,
            startX: this.startX,
            startY: this.startY,
            endX: this.endX,
            endY: this.endY,
            width: this.width,
            height: this.height,
            color: this.color,
            opacity: this.opacity,
            pattern: this.pattern,
            direction: this.direction,
            strength: this.strength,
            animationPhase: this.animationPhase,
            // Wave stream properties
            waveAmplitude: this.waveAmplitude,
            waveFrequency: this.waveFrequency,
            waveSpeed: this.waveSpeed,
            streamWidth: this.streamWidth,
            numSegments: this.numSegments,
            length: this.length
        };
    }
    
    /**
     * Check if this current should be removed
     */
    shouldRemove() {
        return this.lifetime && this.age >= this.lifetime;
    }
}

/**
 * Predefined Current Types with specific behaviors
 */
class CurrentTypes {
    static get OCEAN_CURRENT() {
        return {
            type: 'ocean',
            name: 'Ocean Current',
            color: '#87CEEB',
            opacity: 0.4,
            pattern: 'wave',
            strength: 0.8,
            turbulence: 0.2,
            pullStrength: 0.6,
            moveSpeed: 0.3,
            animationSpeed: 0.02,
            directionSpeed: 0.005,
            // Wave stream properties
            waveAmplitude: 25,
            waveFrequency: 0.025,
            waveSpeed: 0.03,
            streamWidth: 35,
            numSegments: 60
        };
    }
    
    static get WHIRLPOOL() {
        return {
            type: 'whirlpool',
            name: 'Whirlpool',
            color: '#1E90FF',
            opacity: 0.5,
            pattern: 'spiral',
            strength: 1.2,
            turbulence: 0.5,
            pullStrength: 1.0,
            moveSpeed: 0.1,
            animationSpeed: 0.08,
            directionSpeed: 0.02,
            lifetime: 2400, // Disappears after 40 seconds
            // Wave stream properties (spiral pattern)
            waveAmplitude: 40,
            waveFrequency: 0.04,
            waveSpeed: 0.05,
            streamWidth: 30,
            numSegments: 80
        };
    }
    
    static get WIND_TUNNEL() {
        return {
            type: 'wind',
            name: 'Wind Tunnel',
            color: '#F0F8FF',
            opacity: 0.4,
            pattern: 'linear',
            strength: 1.5,
            turbulence: 0.1,
            pullStrength: 0.3,
            moveSpeed: 1.0,
            animationSpeed: 0.05,
            directionSpeed: 0.01,
            lifetime: 1800, // Disappears after 30 seconds
            // Wave stream properties (straight with slight waves)
            waveAmplitude: 15,
            waveFrequency: 0.015,
            waveSpeed: 0.02,
            streamWidth: 25,
            numSegments: 40
        };
    }
    
    static get MURKY_WATER() {
        return {
            type: 'murky',
            name: 'Murky Water',
            color: '#8B7355',
            opacity: 0.4,
            pattern: 'wave',
            strength: 0.4,
            turbulence: 0.4,
            pullStrength: 0.8,
            moveSpeed: 0.2,
            animationSpeed: 0.03,
            directionSpeed: 0.008,
            // Wave stream properties (slow, meandering)
            waveAmplitude: 35,
            waveFrequency: 0.02,
            waveSpeed: 0.01,
            streamWidth: 40,
            numSegments: 50
        };
    }
}

// Export for use in other modules
window.Current = Current;
window.CurrentTypes = CurrentTypes;
