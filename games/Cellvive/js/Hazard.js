/**
 * Hazard Class - Dangerous environmental areas that harm cells
 * Includes toxins, acid pools, and other harmful zones
 */
class Hazard {
    constructor(options = {}) {
        // Hazard identification
        this.id = options.id || Math.random().toString(36).substr(2, 9);
        this.type = options.type || 'toxin';
        this.name = options.name || 'Unknown Hazard';
        
        // Position and size
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.width = options.width || 150;
        this.height = options.height || 150;
        this.radius = options.radius || null; // For circular hazards
        
        // Irregular shape properties
        this.shapePoints = []; // Array of points defining the hazard boundary
        this.shapeSeed = Math.floor(Math.random() * 10000); // For consistent shape generation
        this.irregularity = options.irregularity || 0.8; // How irregular the shape is
        this.numPoints = options.numPoints || 12; // Number of boundary points
        
        // Hazard effects
        this.damage = options.damage || 0.5; // Damage per frame
        this.sizeShrink = options.sizeShrink || 0.002; // Size reduction per frame
        this.speedReduction = options.speedReduction || 0.5; // Speed multiplier when inside
        
        // Visual properties
        this.color = options.color || '#FF4500';
        this.opacity = options.opacity || 0.4;
        this.pattern = options.pattern || 'bubbles'; // 'bubbles', 'waves', 'solid'
        this.pulseIntensity = options.pulseIntensity || 0.3;
        
        // Animation properties
        this.animationPhase = Math.random() * Math.PI * 2;
        this.animationSpeed = options.animationSpeed || 0.04;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.pulseSpeed = options.pulseSpeed || 0.08;
        
        // Lifetime properties (optional)
        this.lifetime = options.lifetime || null; // Frames until hazard disappears
        this.age = 0;
        
        // Generate irregular shape
        this.generateIrregularShape();
        
        console.log(`☠️ Hazard created: ${this.name} at (${this.x}, ${this.y})`);
    }
    
    /**
     * Generate irregular shape points for the hazard
     * Uses a more controlled approach to prevent line crossing
     */
    generateIrregularShape() {
        this.shapePoints = [];
        const baseRadius = Math.min(this.width, this.height) / 2;
        
        // Generate radius variations for each point using controlled noise
        const radiusVariations = [];
        for (let i = 0; i < this.numPoints; i++) {
            const angle = (i / this.numPoints) * Math.PI * 2;
            
            // Use multiple sine waves with different frequencies for organic variation
            const noise1 = Math.sin(this.shapeSeed + angle * 2.3) * this.irregularity;
            const noise2 = Math.sin(this.shapeSeed * 1.7 + angle * 4.1) * this.irregularity * 0.6;
            const noise3 = Math.sin(this.shapeSeed * 0.8 + angle * 6.7) * this.irregularity * 0.3;
            
            // Combine noises for more natural variation
            const totalNoise = noise1 + noise2 + noise3;
            
            // Clamp the variation to prevent extreme shapes
            const clampedNoise = Math.max(-0.4, Math.min(0.4, totalNoise));
            
            // Calculate radius with controlled variation
            const currentRadius = baseRadius * (1 + clampedNoise);
            radiusVariations.push(currentRadius);
        }
        
        // Smooth the radius variations to prevent sharp angles that could cause crossing
        const smoothedVariations = this.smoothRadiusVariations(radiusVariations);
        
        // Generate final points with smoothed variations
        for (let i = 0; i < this.numPoints; i++) {
            const angle = (i / this.numPoints) * Math.PI * 2;
            const currentRadius = smoothedVariations[i];
            
            // Calculate point position
            const pointX = this.x + Math.cos(angle) * currentRadius;
            const pointY = this.y + Math.sin(angle) * currentRadius;
            
            this.shapePoints.push({ x: pointX, y: pointY });
        }
        
        // Ensure the shape is convex to prevent line crossing
        this.ensureConvexShape();
    }
    
    /**
     * Smooth radius variations to prevent sharp angles
     */
    smoothRadiusVariations(variations) {
        const smoothed = [...variations];
        const smoothingFactor = 0.3; // How much to smooth (0 = no smoothing, 1 = maximum smoothing)
        
        // Apply smoothing multiple times for better results
        for (let pass = 0; pass < 2; pass++) {
            for (let i = 0; i < variations.length; i++) {
                const prev = variations[(i - 1 + variations.length) % variations.length];
                const current = variations[i];
                const next = variations[(i + 1) % variations.length];
                
                // Average with neighbors
                const average = (prev + current + next) / 3;
                smoothed[i] = current + (average - current) * smoothingFactor;
            }
        }
        
        return smoothed;
    }
    
    /**
     * Ensure the shape is convex to prevent line crossing
     */
    ensureConvexShape() {
        // Check for and fix any concave sections that could cause crossing
        const points = this.shapePoints;
        const centerX = this.x;
        const centerY = this.y;
        
        for (let i = 0; i < points.length; i++) {
            const prev = points[(i - 1 + points.length) % points.length];
            const current = points[i];
            const next = points[(i + 1) % points.length];
            
            // Calculate vectors from center to each point
            const v1x = prev.x - centerX;
            const v1y = prev.y - centerY;
            const v2x = current.x - centerX;
            const v2y = current.y - centerY;
            const v3x = next.x - centerX;
            const v3y = next.y - centerY;
            
            // Calculate cross product to check for concavity
            const cross1 = v1x * v2y - v1y * v2x;
            const cross2 = v2x * v3y - v2y * v3x;
            
            // If the point creates a concave section, adjust it
            if (cross1 * cross2 < 0) {
                // Move the point closer to the center to make it more convex
                const distance = Math.sqrt(v2x * v2x + v2y * v2y);
                const newDistance = distance * 0.9; // Move 10% closer to center
                
                const angle = Math.atan2(v2y, v2x);
                current.x = centerX + Math.cos(angle) * newDistance;
                current.y = centerY + Math.sin(angle) * newDistance;
            }
        }
    }
    
    /**
     * Check if a point is inside this hazard using ray casting algorithm
     */
    containsPoint(x, y) {
        if (this.shapePoints.length === 0) {
            // Fallback to circular check if no shape points
            const distance = Math.hypot(x - this.x, y - this.y);
            return distance <= Math.min(this.width, this.height) / 2;
        }
        
        // Ray casting algorithm for irregular polygon
        let inside = false;
        const points = this.shapePoints;
        
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi = points[i].x;
            const yi = points[i].y;
            const xj = points[j].x;
            const yj = points[j].y;
            
            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        
        return inside;
    }
    
    /**
     * Check if a cell is inside this hazard
     */
    containsCell(cell) {
        return this.containsPoint(cell.x, cell.y);
    }
    
    /**
     * Apply hazard effects to a cell
     */
    applyEffects(cell) {
        if (!this.containsCell(cell)) return;
        
        // Apply damage
        if (this.damage > 0) {
            cell.health = Math.max(0, cell.health - this.damage);
        }
        
        // Apply size shrinking
        if (this.sizeShrink > 0) {
            cell.radius = Math.max(cell.minRadius || 3, cell.radius - this.sizeShrink);
        }
        
        // Apply speed reduction
        if (this.speedReduction < 1.0) {
            cell.velocityX *= this.speedReduction;
            cell.velocityY *= this.speedReduction;
        }
        
        // Visual feedback - make cell flash red when taking damage
        if (cell.damageFlash === undefined) {
            cell.damageFlash = 0;
        }
        cell.damageFlash = Math.min(30, cell.damageFlash + 10); // Flash for 30 frames
    }
    
    /**
     * Update hazard animation and lifetime
     */
    update() {
        // Update animation phases
        this.animationPhase += this.animationSpeed;
        if (this.animationPhase > Math.PI * 2) {
            this.animationPhase -= Math.PI * 2;
        }
        
        this.pulsePhase += this.pulseSpeed;
        if (this.pulsePhase > Math.PI * 2) {
            this.pulsePhase -= Math.PI * 2;
        }
        
        // Update age
        this.age++;
        
        // Check if hazard should disappear
        if (this.lifetime && this.age >= this.lifetime) {
            return false; // Signal for removal
        }
        
        return true; // Continue existing
    }
    
    /**
     * Get render properties for this hazard
     */
    getRenderProps() {
        const pulseEffect = Math.sin(this.pulsePhase) * this.pulseIntensity;
        
        return {
            type: this.type,
            name: this.name,
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            radius: this.radius,
            color: this.color,
            opacity: this.opacity + pulseEffect,
            pattern: this.pattern,
            animationPhase: this.animationPhase,
            pulsePhase: this.pulsePhase,
            // Irregular shape properties
            shapePoints: this.shapePoints,
            shapeSeed: this.shapeSeed,
            irregularity: this.irregularity,
            numPoints: this.numPoints
        };
    }
    
    /**
     * Check if this hazard should be removed
     */
    shouldRemove() {
        return this.lifetime && this.age >= this.lifetime;
    }
}

/**
 * Predefined Hazard Types with specific effects
 */
class HazardTypes {
    static get TOXIN_POOL() {
        return {
            type: 'toxin',
            name: 'Toxin Pool',
            color: '#FF4500',
            opacity: 0.4,
            pattern: 'bubbles',
            damage: 0.3,
            sizeShrink: 0.001,
            speedReduction: 0.7,
            animationSpeed: 0.06,
            pulseSpeed: 0.1,
            // Irregular shape properties
            irregularity: 0.9,
            numPoints: 14
        };
    }
    
    static get ACID_LAKE() {
        return {
            type: 'acid',
            name: 'Acid Lake',
            color: '#FF4500', // Orange-red acid color
            opacity: 0.6,
            pattern: 'bubbles', // Bubbling acid effect
            damage: 0.8,
            sizeShrink: 0.003,
            speedReduction: 0.5,
            animationSpeed: 0.08,
            pulseSpeed: 0.12,
            pulseIntensity: 0.4,
            // Irregular shape properties - more organic
            irregularity: 1.4, // More irregular for organic look
            numPoints: 20 // More points for smoother organic shape
        };
    }
    
    static get RADIATION_ZONE() {
        return {
            type: 'radiation',
            name: 'Radiation Zone',
            color: '#FFD700',
            opacity: 0.3,
            pattern: 'solid',
            damage: 0.2,
            sizeShrink: 0.0005,
            speedReduction: 0.9,
            animationSpeed: 0.02,
            pulseSpeed: 0.15,
            pulseIntensity: 0.5,
            // Irregular shape properties
            irregularity: 0.6,
            numPoints: 10
        };
    }
    
    static get VIRUS_SPAWN() {
        return {
            type: 'virus_spawn',
            name: 'Virus Spawn',
            color: '#8A2BE2',
            opacity: 0.6,
            pattern: 'bubbles',
            damage: 0.4,
            sizeShrink: 0.002,
            speedReduction: 0.6,
            animationSpeed: 0.1,
            pulseSpeed: 0.08,
            lifetime: 1800, // Disappears after 30 seconds at 60 FPS
            // Irregular shape properties
            irregularity: 1.5,
            numPoints: 18
        };
    }
}

// Export for use in other modules
window.Hazard = Hazard;
window.HazardTypes = HazardTypes;
