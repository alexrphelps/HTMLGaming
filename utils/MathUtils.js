/**
 * GameHub Math Utilities
 * Collection of mathematical functions for game development
 */
class MathUtils {
    // Constants
    static get PI() { return Math.PI; }
    static get TWO_PI() { return Math.PI * 2; }
    static get HALF_PI() { return Math.PI * 0.5; }
    static get DEG_TO_RAD() { return Math.PI / 180; }
    static get RAD_TO_DEG() { return 180 / Math.PI; }
    
    // Basic math functions
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
    
    static lerp(a, b, t) {
        return a + (b - a) * t;
    }
    
    static map(value, fromMin, fromMax, toMin, toMax) {
        return (value - fromMin) * (toMax - toMin) / (fromMax - fromMin) + toMin;
    }
    
    static smoothstep(min, max, value) {
        const x = MathUtils.clamp((value - min) / (max - min), 0, 1);
        return x * x * (3 - 2 * x);
    }
    
    static degToRad(degrees) {
        return degrees * MathUtils.DEG_TO_RAD;
    }
    
    static radToDeg(radians) {
        return radians * MathUtils.RAD_TO_DEG;
    }
    
    // Vector math
    static distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    static distanceSquared(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return dx * dx + dy * dy;
    }
    
    static angle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    }
    
    static normalize(x, y) {
        const length = Math.sqrt(x * x + y * y);
        if (length === 0) return { x: 0, y: 0 };
        return { x: x / length, y: y / length };
    }
    
    static dot(x1, y1, x2, y2) {
        return x1 * x2 + y1 * y2;
    }
    
    static cross(x1, y1, x2, y2) {
        return x1 * y2 - y1 * x2;
    }
    
    static rotate(x, y, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: x * cos - y * sin,
            y: x * sin + y * cos
        };
    }
    
    // Random functions
    static random(min = 0, max = 1) {
        return Math.random() * (max - min) + min;
    }
    
    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    static randomBool(probability = 0.5) {
        return Math.random() < probability;
    }
    
    static randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
    
    static randomGaussian(mean = 0, standardDeviation = 1) {
        // Box-Muller transform
        // Use closure variables instead of static let
        if (!this._hasSpare) {
            const u = Math.random();
            const v = Math.random();
            const magnitude = standardDeviation * Math.sqrt(-2 * Math.log(u));
            this._spare = magnitude * Math.cos(2 * Math.PI * v);
            this._hasSpare = true;
            return magnitude * Math.sin(2 * Math.PI * v) + mean;
        } else {
            this._hasSpare = false;
            return this._spare * standardDeviation + mean;
        }
    }
    
    // Noise functions (simplified Perlin noise)
    static noise(x, y = 0, z = 0) {
        // Simple noise implementation
        const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
        return (n - Math.floor(n));
    }
    
    // Easing functions
    static easeInQuad(t) {
        return t * t;
    }
    
    static easeOutQuad(t) {
        return t * (2 - t);
    }
    
    static easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }
    
    static easeInCubic(t) {
        return t * t * t;
    }
    
    static easeOutCubic(t) {
        return (--t) * t * t + 1;
    }
    
    static easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }
    
    static easeInSine(t) {
        return 1 - Math.cos(t * MathUtils.HALF_PI);
    }
    
    static easeOutSine(t) {
        return Math.sin(t * MathUtils.HALF_PI);
    }
    
    static easeInOutSine(t) {
        return -(Math.cos(Math.PI * t) - 1) / 2;
    }
    
    static easeInExpo(t) {
        return t === 0 ? 0 : Math.pow(2, 10 * (t - 1));
    }
    
    static easeOutExpo(t) {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }
    
    static easeInOutExpo(t) {
        if (t === 0) return 0;
        if (t === 1) return 1;
        if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
        return (2 - Math.pow(2, -20 * t + 10)) / 2;
    }
    
    static easeInElastic(t) {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
    }
    
    static easeOutElastic(t) {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }
    
    static easeInBounce(t) {
        return 1 - MathUtils.easeOutBounce(1 - t);
    }
    
    static easeOutBounce(t) {
        const n1 = 7.5625;
        const d1 = 2.75;
        
        if (t < 1 / d1) {
            return n1 * t * t;
        } else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    }
    
    // Geometry functions
    static pointInRectangle(px, py, rx, ry, rw, rh) {
        return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    }
    
    static pointInCircle(px, py, cx, cy, radius) {
        return MathUtils.distanceSquared(px, py, cx, cy) <= radius * radius;
    }
    
    static lineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) < 0.0001) return null; // Parallel lines
        
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
        
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: x1 + t * (x2 - x1),
                y: y1 + t * (y2 - y1)
            };
        }
        
        return null;
    }
    
    static rectangleIntersection(r1x, r1y, r1w, r1h, r2x, r2y, r2w, r2h) {
        return !(r1x + r1w < r2x || r2x + r2w < r1x || r1y + r1h < r2y || r2y + r2h < r1y);
    }
    
    static circleIntersection(c1x, c1y, r1, c2x, c2y, r2) {
        return MathUtils.distanceSquared(c1x, c1y, c2x, c2y) <= (r1 + r2) * (r1 + r2);
    }
    
    // Color utilities
    static rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    static hslToRgb(h, s, l) {
        h /= 360;
        s /= 100;
        l /= 100;
        
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h * 6) % 2 - 1));
        const m = l - c / 2;
        
        let r, g, b;
        
        if (0 <= h && h < 1/6) {
            r = c; g = x; b = 0;
        } else if (1/6 <= h && h < 2/6) {
            r = x; g = c; b = 0;
        } else if (2/6 <= h && h < 3/6) {
            r = 0; g = c; b = x;
        } else if (3/6 <= h && h < 4/6) {
            r = 0; g = x; b = c;
        } else if (4/6 <= h && h < 5/6) {
            r = x; g = 0; b = c;
        } else {
            r = c; g = 0; b = x;
        }
        
        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    }
    
    static lerpColor(color1, color2, t) {
        const r = Math.round(MathUtils.lerp(color1.r, color2.r, t));
        const g = Math.round(MathUtils.lerp(color1.g, color2.g, t));
        const b = Math.round(MathUtils.lerp(color1.b, color2.b, t));
        return { r, g, b };
    }
}

/**
 * Vector2 class for 2D vector operations
 */
class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    
    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }
    
    copy(other) {
        this.x = other.x;
        this.y = other.y;
        return this;
    }
    
    clone() {
        return new Vector2(this.x, this.y);
    }
    
    add(other) {
        this.x += other.x;
        this.y += other.y;
        return this;
    }
    
    subtract(other) {
        this.x -= other.x;
        this.y -= other.y;
        return this;
    }
    
    multiply(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }
    
    divide(scalar) {
        this.x /= scalar;
        this.y /= scalar;
        return this;
    }
    
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    
    lengthSquared() {
        return this.x * this.x + this.y * this.y;
    }
    
    normalize() {
        const length = this.length();
        if (length > 0) {
            this.x /= length;
            this.y /= length;
        }
        return this;
    }
    
    dot(other) {
        return this.x * other.x + this.y * other.y;
    }
    
    cross(other) {
        return this.x * other.y - this.y * other.x;
    }
    
    distance(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    angle() {
        return Math.atan2(this.y, this.x);
    }
    
    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const x = this.x * cos - this.y * sin;
        const y = this.x * sin + this.y * cos;
        this.x = x;
        this.y = y;
        return this;
    }
    
    lerp(other, t) {
        this.x = MathUtils.lerp(this.x, other.x, t);
        this.y = MathUtils.lerp(this.y, other.y, t);
        return this;
    }
    
    static add(a, b) {
        return new Vector2(a.x + b.x, a.y + b.y);
    }
    
    static subtract(a, b) {
        return new Vector2(a.x - b.x, a.y - b.y);
    }
    
    static multiply(v, scalar) {
        return new Vector2(v.x * scalar, v.y * scalar);
    }
    
    static distance(a, b) {
        return a.distance(b);
    }
    
    static lerp(a, b, t) {
        return new Vector2(
            MathUtils.lerp(a.x, b.x, t),
            MathUtils.lerp(a.y, b.y, t)
        );
    }
    
    toString() {
        return `Vector2(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
    }
}

// Make utilities available globally
window.MathUtils = MathUtils;
window.Vector2 = Vector2;

// Export for Node/Jest tests without changing runtime behavior in browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MathUtils, Vector2 };
}
