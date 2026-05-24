/**
 * Biome Class - Represents different environmental regions with unique effects
 * Each biome affects cells differently and has distinct visual appearance
 */
class Biome {
    constructor(options = {}) {
        // Biome identification
        this.id = options.id || Math.random().toString(36).substr(2, 9);
        this.type = options.type || 'neutral';
        this.name = options.name || 'Unknown Biome';
        
        // Position and size
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.width = options.width || 200;
        this.height = options.height || 200;
        this.radius = options.radius || null; // For circular biomes
        
        // Polygon shape support
        this.shape = options.shape || 'rectangle'; // 'rectangle', 'circle', 'polygon'
        this.vertices = options.vertices || null; // Array of {x, y} points for polygon shapes
        this.polygonPoints = options.polygonPoints || null; // Pre-calculated polygon points
        
        // Visual properties
        this.color = options.color || '#90EE90';
        this.opacity = options.opacity || 0.3;
        this.pattern = options.pattern || 'solid'; // 'solid', 'stripes', 'dots'
        
        // Biome effects on cells
        this.effects = {
            speedMultiplier: options.speedMultiplier || 1.0,
            healthRegen: options.healthRegen || 0, // per frame
            healthDecay: options.healthDecay || 0, // per frame
            sizeGrowth: options.sizeGrowth || 0, // per frame
            sizeShrink: options.sizeShrink || 0, // per frame
            aggressionBonus: options.aggressionBonus || 0
        };
        
        // Animation properties
        this.animationPhase = Math.random() * Math.PI * 2;
        this.animationSpeed = options.animationSpeed || 0.02;
        
        // Generate polygon vertices if this is a polygon shape
        if (this.shape === 'polygon' && !this.vertices) {
            this.vertices = this.generateIrregularPolygon();
        }
        
        console.log(`🌍 Biome created: ${this.name} at (${this.x}, ${this.y}) with type: ${this.type}, shape: ${this.shape}`);
    }
    
    /**
     * Generate irregular polygon vertices for organic-looking shapes
     */
    generateIrregularPolygon() {
        const numVertices = 6 + Math.floor(Math.random() * 6); // 6-11 vertices
        const vertices = [];
        const baseRadius = Math.min(this.width, this.height) / 2;
        
        for (let i = 0; i < numVertices; i++) {
            const angle = (i / numVertices) * Math.PI * 2;
            
            // Add randomness to create irregular shape
            const radiusVariation = 0.6 + Math.random() * 0.8; // 60% to 140% of base radius
            const angleVariation = (Math.random() - 0.5) * 0.3; // ±15% angle variation
            
            const radius = baseRadius * radiusVariation;
            const finalAngle = angle + angleVariation;
            
            vertices.push({
                x: Math.cos(finalAngle) * radius,
                y: Math.sin(finalAngle) * radius
            });
        }
        
        return vertices;
    }
    
    /**
     * Check if a point is inside this biome
     */
    containsPoint(x, y) {
        if (this.shape === 'circle' || this.radius) {
            // Circular biome
            const distance = Math.hypot(x - this.x, y - this.y);
            return distance <= this.radius;
        } else if (this.shape === 'polygon' && this.vertices) {
            // Polygon biome using ray casting algorithm
            return this.pointInPolygon(x, y);
        } else {
            // Rectangular biome (default)
            return x >= this.x - this.width / 2 && 
                   x <= this.x + this.width / 2 &&
                   y >= this.y - this.height / 2 && 
                   y <= this.y + this.height / 2;
        }
    }
    
    /**
     * Check if a point is inside a polygon using ray casting algorithm
     */
    pointInPolygon(x, y) {
        if (!this.vertices || this.vertices.length < 3) return false;
        
        let inside = false;
        const vertices = this.vertices;
        
        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
            const xi = this.x + vertices[i].x;
            const yi = this.y + vertices[i].y;
            const xj = this.x + vertices[j].x;
            const yj = this.y + vertices[j].y;
            
            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        
        return inside;
    }
    
    /**
     * Check if a cell is inside this biome
     */
    containsCell(cell) {
        return this.containsPoint(cell.x, cell.y);
    }
    
    /**
     * Apply biome effects to a cell
     */
    applyEffects(cell) {
        if (!this.containsCell(cell)) return;
        
        // Apply speed multiplier
        if (this.effects.speedMultiplier !== 1.0) {
            cell.velocityX *= this.effects.speedMultiplier;
            cell.velocityY *= this.effects.speedMultiplier;
        }
        
        // Apply health effects
        if (this.effects.healthRegen > 0) {
            cell.health = Math.min(cell.maxHealth, cell.health + this.effects.healthRegen);
        }
        if (this.effects.healthDecay > 0) {
            cell.health = Math.max(0, cell.health - this.effects.healthDecay);
        }
        
        // Apply size effects
        if (this.effects.sizeGrowth > 0) {
            cell.radius = Math.min(cell.maxRadius || 200, cell.radius + this.effects.sizeGrowth);
        }
        if (this.effects.sizeShrink > 0) {
            cell.radius = Math.max(cell.minRadius || 3, cell.radius - this.effects.sizeShrink);
        }
        
        // Apply aggression bonus
        if (this.effects.aggressionBonus > 0 && cell.aggression !== undefined) {
            cell.aggression = Math.min(1.0, cell.aggression + this.effects.aggressionBonus);
        }
    }
    
    /**
     * Update biome animation
     */
    update() {
        this.animationPhase += this.animationSpeed;
        if (this.animationPhase > Math.PI * 2) {
            this.animationPhase -= Math.PI * 2;
        }
    }
    
    /**
     * Get render properties for this biome
     */
    getRenderProps() {
        return {
            type: this.type,
            name: this.name,
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            radius: this.radius,
            shape: this.shape,
            vertices: this.vertices,
            color: this.color,
            opacity: this.opacity,
            pattern: this.pattern,
            animationPhase: this.animationPhase
        };
    }
}

/**
 * Predefined Biome Types with specific effects
 */
class BiomeTypes {
    static get NUTRIENT_RICH() {
        return {
            type: 'nutrient',
            name: 'Nutrient Rich Zone',
            color: '#90EE90',
            opacity: 0.2,
            pattern: 'dots',
            shape: 'polygon', // Use irregular polygon shape
            speedMultiplier: 1.0,
            healthRegen: 0.05,
            sizeGrowth: 0.001,
            animationSpeed: 0.005 // MODIFIED: Reduced from 0.03 to 0.005 (83% reduction) for less visual movement
        };
    }
    
    static get TOXIC() {
        return {
            type: 'toxic',
            name: 'Toxic Zone',
            color: '#DC143C', // Red color for mycelium network
            opacity: 0.4,
            pattern: 'stripes', // Keep original pattern (mycelium renderer overrides this)
            speedMultiplier: 0.8,
            healthDecay: 0.02,
            sizeShrink: 0.002,
            animationSpeed: 0.05
        };
    }
    
    static get SLOW_ZONE() {
        return {
            type: 'slow',
            name: 'Slow Zone',
            color: '#87CEEB',
            opacity: 0.25,
            pattern: 'solid',
            speedMultiplier: 0.6,
            healthRegen: 0.01,
            animationSpeed: 0.01
        };
    }
    
    static get ENERGY_ZONE() {
        return {
            type: 'energy',
            name: 'Energy Zone',
            color: '#FFD700', // Yellow
            opacity: 0.25,
            pattern: 'solid',
            shape: 'polygon', // Irregular organic shape
            speedMultiplier: 1.3, // Increases movement of all cells
            healthRegen: 0.15, // Rapidly regens energy
            animationSpeed: 0.03
        };
    }
    
    static get AGGRESSIVE() {
        return {
            type: 'aggressive',
            name: 'Aggressive Zone',
            color: '#FFA500',
            opacity: 0.3,
            pattern: 'stripes',
            speedMultiplier: 1.2,
            aggressionBonus: 0.1,
            healthRegen: 0.02,
            animationSpeed: 0.04
        };
    }
    
    static get NEUTRAL() {
        return {
            type: 'neutral',
            name: 'Neutral Zone',
            color: '#F0F8FF',
            opacity: 0.1,
            pattern: 'solid',
            speedMultiplier: 1.0,
            animationSpeed: 0.01
        };
    }
}

// Export for use in other modules
window.Biome = Biome;
window.BiomeTypes = BiomeTypes;
