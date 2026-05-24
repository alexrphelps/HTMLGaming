/**
 * CollisionDetector Class - Handles collision detection between game objects
 */
class CollisionDetector {
    constructor() {
        this.collisionTypes = {
            CIRCLE: 'circle',
            RECTANGLE: 'rectangle',
            POINT: 'point'
        };
        
        console.log('🔬 CollisionDetector created');
    }
    
    /**
     * Check collision between two circular objects (cells)
     */
    checkCollision(obj1, obj2) {
        // Calculate distance between centers
        const dx = obj1.x - obj2.x;
        const dy = obj1.y - obj2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Check if distance is less than sum of radii
        const collisionDistance = obj1.radius + obj2.radius;
        
        return distance < collisionDistance;
    }
    
    /**
     * Check collision between a circle and a point
     */
    checkPointCircleCollision(pointX, pointY, circle) {
        const dx = pointX - circle.x;
        const dy = pointY - circle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < circle.radius;
    }
    
    /**
     * Check collision between a circle and a rectangle
     */
    checkCircleRectangleCollision(circle, rectangle) {
        // Find closest point on rectangle to circle center
        const closestX = Math.max(rectangle.x, Math.min(circle.x, rectangle.x + rectangle.width));
        const closestY = Math.max(rectangle.y, Math.min(circle.y, rectangle.y + rectangle.height));
        
        // Calculate distance between circle center and closest point
        const dx = circle.x - closestX;
        const dy = circle.y - closestY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < circle.radius;
    }
    
    /**
     * Get collision details (penetration depth, normal vector)
     */
    getCollisionDetails(obj1, obj2) {
        const dx = obj1.x - obj2.x;
        const dy = obj1.y - obj2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const collisionDistance = obj1.radius + obj2.radius;
        
        if (distance >= collisionDistance) {
            return null; // No collision
        }
        
        // Calculate penetration depth
        const penetration = collisionDistance - distance;
        
        // Calculate normal vector (direction from obj2 to obj1)
        const normalX = dx / distance;
        const normalY = dy / distance;
        
        return {
            penetration: penetration,
            normalX: normalX,
            normalY: normalY,
            contactX: obj1.x - normalX * obj1.radius,
            contactY: obj1.y - normalY * obj1.radius
        };
    }
    
    /**
     * Check if object is within world bounds
     */
    checkWorldBounds(obj, worldWidth, worldHeight) {
        const bounds = {
            left: obj.radius,
            right: worldWidth - obj.radius,
            top: obj.radius,
            bottom: worldHeight - obj.radius
        };
        
        return {
            inBounds: obj.x >= bounds.left && obj.x <= bounds.right &&
                     obj.y >= bounds.top && obj.y <= bounds.bottom,
            bounds: bounds
        };
    }
    
    /**
     * Resolve collision between two objects (separate them)
     */
    resolveCollision(obj1, obj2) {
        const details = this.getCollisionDetails(obj1, obj2);
        if (!details) return;
        
        // Separate objects by moving them along the normal vector
        const separation = details.penetration / 2;
        
        obj1.x += details.normalX * separation;
        obj1.y += details.normalY * separation;
        
        obj2.x -= details.normalX * separation;
        obj2.y -= details.normalY * separation;
    }
    
    /**
     * Check multiple collisions efficiently using spatial partitioning
     */
    checkMultipleCollisions(objects) {
        const collisions = [];
        
        // Simple O(n²) approach - could be optimized with spatial partitioning
        for (let i = 0; i < objects.length; i++) {
            for (let j = i + 1; j < objects.length; j++) {
                if (this.checkCollision(objects[i], objects[j])) {
                    collisions.push({
                        obj1: objects[i],
                        obj2: objects[j],
                        details: this.getCollisionDetails(objects[i], objects[j])
                    });
                }
            }
        }
        
        return collisions;
    }
    
    /**
     * Check collision with a line segment
     */
    checkLineCollision(obj, lineStartX, lineStartY, lineEndX, lineEndY) {
        // Calculate closest point on line to circle center
        const lineLength = Math.sqrt(
            Math.pow(lineEndX - lineStartX, 2) + 
            Math.pow(lineEndY - lineStartY, 2)
        );
        
        if (lineLength === 0) {
            // Line is actually a point
            return this.checkPointCircleCollision(lineStartX, lineStartY, obj);
        }
        
        const t = Math.max(0, Math.min(1, 
            ((obj.x - lineStartX) * (lineEndX - lineStartX) + 
             (obj.y - lineStartY) * (lineEndY - lineStartY)) / (lineLength * lineLength)
        ));
        
        const closestX = lineStartX + t * (lineEndX - lineStartX);
        const closestY = lineStartY + t * (lineEndY - lineStartY);
        
        return this.checkPointCircleCollision(closestX, closestY, obj);
    }
    
    /**
     * Get objects within a certain radius of a point
     */
    getObjectsInRadius(centerX, centerY, radius, objects) {
        return objects.filter(obj => {
            const dx = obj.x - centerX;
            const dy = obj.y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance <= radius + obj.radius;
        });
    }
    
    /**
     * Predict collision time between two moving objects
     */
    predictCollision(obj1, obj2) {
        const dx = obj2.x - obj1.x;
        const dy = obj2.y - obj1.y;
        const dvx = obj2.velocityX - obj1.velocityX;
        const dvy = obj2.velocityY - obj1.velocityY;
        
        const a = dvx * dvx + dvy * dvy;
        if (a === 0) {
            return null; // Objects not moving relative to each other
        }
        
        const b = 2 * (dx * dvx + dy * dvy);
        const c = dx * dx + dy * dy - Math.pow(obj1.radius + obj2.radius, 2);
        
        const discriminant = b * b - 4 * a * c;
        if (discriminant < 0) {
            return null; // No collision will occur
        }
        
        const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
        const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);
        
        // Return the earliest positive collision time
        if (t1 >= 0) return t1;
        if (t2 >= 0) return t2;
        return null;
    }
    
    /**
     * Check if a point is inside a polygon (for future use)
     */
    checkPointInPolygon(pointX, pointY, polygon) {
        let inside = false;
        
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            if (((polygon[i].y > pointY) !== (polygon[j].y > pointY)) &&
                (pointX < (polygon[j].x - polygon[i].x) * (pointY - polygon[i].y) / 
                         (polygon[j].y - polygon[i].y) + polygon[i].x)) {
                inside = !inside;
            }
        }
        
        return inside;
    }
    
    /**
     * Get debug visualization data
     */
    getDebugVisualization(objects) {
        return objects.map(obj => ({
            x: obj.x,
            y: obj.y,
            radius: obj.radius,
            type: obj.constructor.name,
            bounds: this.checkWorldBounds(obj, 2400, 1600)
        }));
    }
}

// Export for use in other modules
window.CollisionDetector = CollisionDetector;
