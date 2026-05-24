/**
 * Virus Enemy Class - Spiky enemies that connect together and act as a single organism
 * Features: spiky appearance, can kill cells up to 20% larger, permanent connection behavior
 */
class VirusEnemy extends Enemy {
    constructor(options = {}) {
        // Set virus-specific defaults
        const virusOptions = {
            enemyType: 'virus',
            speed: 0.4 + Math.random() * 0.3, // Slower than regular cells
            dangerLevel: 3,
            huntRange: 120,
            aggression: 0.9,
            color: `hsl(${Math.floor(Math.random() * 60 + 300)}, 70%, 50%)`, // Purple/pink virus colors
            strokeColor: '#ff6b6b',
            strokeWidth: 2,
            ...options
        };
        
        super(virusOptions);
        
        // Virus-specific properties
        this.spikeCount = 6 + Math.floor(Math.random() * 4); // 6-9 spikes
        this.spikeLength = this.radius * 0.3;
        this.killRadius = this.radius * 1.2; // Can kill cells up to 20% larger
        
        // Connection system - enhanced for permanent sticking
        this.connectedViruses = new Set(); // Set of virus IDs this virus is connected to
        this.connectionRange = 35; // How close viruses need to be to connect (edge-to-edge)
        this.maxConnections = 10; // Maximum connections per virus
        this.connectionStrength = 1.0; // How strongly viruses stick together (0-1)
        this.connectionBreakForce = 50; // Force required to break a connection
        
        // Group behavior properties
        this.isGroupLeader = false; // Only one leader per group
        this.groupId = null; // Unique group identifier
        this.groupTarget = null; // Shared target for the group
        this.groupAIState = 'explore'; // Shared AI state for the group
        
        // Formation properties for edge-to-edge connection
        this.formationOffset = { x: 0, y: 0 }; // Offset from group center
        this.formationSpacing = 0; // No spacing - viruses stick edge-to-edge
        
        // Enhanced AI for persistent hunting
        this.huntPersistence = 0.8;
        this.lastHuntTarget = null;
        this.searchRadius = 250; // How far to look for food and other viruses
        
        // Growth and survival
        this.growthTarget = 30; // Target size to grow to
        this.hungerLevel = 0; // Increases over time, decreases when eating
        this.maxHunger = 1000; // When hunger reaches this, virus becomes more aggressive
        
        // console.log(`🦠 Virus enemy created with ${this.spikeCount} spikes, kill radius: ${this.killRadius}`); // Disabled to reduce spam
    }
    
    /**
     * Override canEat to allow killing larger cells, but prevent eating connected viruses
     */
    canEat(other) {
        // Never eat connected viruses - they are part of the same group
        if (other instanceof VirusEnemy && this.connectedViruses.has(other.uniqueId)) {
            return false;
        }
        
        // Viruses can kill cells up to 20% larger than themselves
        return other.radius <= this.killRadius && other.radius > this.radius * 0.5;
    }
    
    /**
     * Check if this virus is connected to another virus
     */
    isConnectedTo(otherVirus) {
        return otherVirus instanceof VirusEnemy && this.connectedViruses.has(otherVirus.uniqueId);
    }
    
    /**
     * Check if this virus is part of a group
     */
    isInGroup() {
        return this.connectedViruses.size > 0;
    }
    
    /**
     * Get the size of the group this virus belongs to
     */
    getGroupSize() {
        return this.connectedViruses.size + 1; // +1 for this virus
    }
    
    /**
     * Update method - handles both individual and group behavior
     */
    update(deltaTime, nearbyCells, allViruses) {
        // Call parent update for basic movement and survival mechanics
        super.update(deltaTime, nearbyCells);
        
        // Update virus-specific properties
        this.killRadius = this.radius * 1.2; // Update kill radius as virus grows
        this.spikeLength = this.radius * 0.3; // Update spike length
        
        // Update AI behavior if we have nearby cells to analyze
        if (nearbyCells && nearbyCells.length > 0) {
            this.updateAI(nearbyCells);
        }
        
        // Apply movement based on current AI state
        this.applyMovement(allViruses);
    }
    
    /**
     * Enhanced AI with realistic virus behavior - handles both individual and group behavior
     */
    updateAI(nearbyCells) {
        // If this virus is in a group, let the group leader handle AI decisions
        if (this.isInGroup() && !this.isGroupLeader) {
            // Followers don't make individual AI decisions
            return;
        }
        
        // Individual AI or group leader AI
        this.hungerLevel += 0.5; // Increase hunger over time
        
        // First priority: Check for immediate threats
        const threats = nearbyCells.filter(cell => {
            if (cell === this || cell instanceof VirusEnemy) return false;
            const distance = this.distanceTo(cell);
            return distance < 80 && cell.radius > this.radius * 1.5;
        });
        
        if (threats.length > 0) {
            this.aiState = 'flee';
            this.currentTarget = threats[0];
            this.groupAIState = 'flee';
            this.groupTarget = threats[0];
            return;
        }
        
        // Second priority: Look for food to grow (expanded search for groups)
        const searchRadius = this.isInGroup() ? this.searchRadius * 1.5 : this.searchRadius;
        const foodTargets = nearbyCells.filter(cell => {
            if (cell === this || cell instanceof VirusEnemy) return false;
            const distance = this.distanceTo(cell);
            return distance < searchRadius && this.canEat(cell);
        }).sort((a, b) => {
            // Prioritize closer and smaller targets
            const distanceA = this.distanceTo(a);
            const distanceB = this.distanceTo(b);
            const sizeFactorA = a.radius / this.radius;
            const sizeFactorB = b.radius / this.radius;
            return (distanceA * sizeFactorA) - (distanceB * sizeFactorB);
        });
        
        if (foodTargets.length > 0) {
            this.aiState = 'hunt_food';
            this.currentTarget = foodTargets[0];
            this.groupAIState = 'hunt_food';
            this.groupTarget = foodTargets[0];
            return;
        }
        
        // Third priority: Look for other viruses to connect with
        const otherViruses = nearbyCells.filter(cell => 
            cell instanceof VirusEnemy && 
            cell !== this && 
            !this.connectedViruses.has(cell.uniqueId) &&
            this.connectedViruses.size < this.maxConnections &&
            this.distanceTo(cell) < this.connectionRange
        );
        
        if (otherViruses.length > 0) {
            // Find the closest virus to connect with
            const closestVirus = otherViruses.reduce((closest, current) => 
                this.distanceTo(current) < this.distanceTo(closest) ? current : closest
            );
            
            this.aiState = 'seek_connection';
            this.currentTarget = closestVirus;
            this.groupAIState = 'seek_connection';
            this.groupTarget = closestVirus;
            return;
        }
        
        // Default: Active exploration for food
        this.aiState = 'explore';
        this.currentTarget = null;
        this.groupAIState = 'explore';
        this.groupTarget = null;
        this.handleExploration();
    }
    
    /**
     * Handle active exploration behavior
     */
    handleExploration() {
        // Change exploration direction periodically
        if (Math.random() < 0.02) {
            // Set new exploration target in a random direction
            const angle = Math.random() * Math.PI * 2;
            const distance = 150 + Math.random() * 100; // 150-250 units away
            
            this.explorationTarget = {
                x: this.x + Math.cos(angle) * distance,
                y: this.y + Math.sin(angle) * distance
            };
        }
        
        // Move towards exploration target
        if (this.explorationTarget) {
            const dx = this.explorationTarget.x - this.x;
            const dy = this.explorationTarget.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 20) {
                // Move towards exploration target
                this.targetX = this.explorationTarget.x;
                this.targetY = this.explorationTarget.y;
            } else {
                // Reached target, clear it
                this.explorationTarget = null;
            }
        }
    }
    
    /**
     * Apply movement based on current AI state
     */
    applyMovement(allViruses) {
        // If this virus is in a group, handle group movement
        if (this.isInGroup()) {
            this.handleGroupMovement(allViruses);
            return;
        }
        
        // Individual movement
        switch (this.aiState) {
            case 'hunt_food':
            case 'seek_connection':
                this.moveTowardsTarget();
                break;
            case 'flee':
                this.fleeBehavior();
                break;
            case 'explore':
                this.wanderBehavior();
                break;
            default:
                this.wanderBehavior();
        }
    }
    
    /**
     * Handle movement when in a group
     */
    handleGroupMovement(allViruses) {
        // Find connected viruses that are still nearby
        const connectedNearby = this.getConnectedViruses(allViruses);
        
        if (connectedNearby.length === 0) {
            // No connected viruses nearby, become individual again
            this.connectedViruses.clear();
            this.isGroupLeader = false;
            this.groupId = null;
            return;
        }
        
        // Calculate group center
        const groupCenter = this.calculateGroupCenter(connectedNearby);
        
        // Determine group leader (largest virus)
        const groupLeader = this.determineGroupLeader(connectedNearby);
        
        // Only the group leader makes movement decisions
        if (this === groupLeader) {
            this.makeGroupMovementDecision(connectedNearby, groupCenter);
        }
        
        // Apply group movement to all members
        this.applyGroupMovement(connectedNearby, groupCenter);
    }
    
    /**
     * Get connected viruses that are currently nearby
     * FIXED: Enhanced null safety and validation
     */
    getConnectedViruses(allViruses) {
        // FIXED: More comprehensive validation
        if (!allViruses || !Array.isArray(allViruses) || allViruses.length === 0) {
            return [];
        }
        
        // FIXED: Additional safety check for connectedViruses
        if (!this.connectedViruses || this.connectedViruses.size === 0) {
            return [];
        }
        
        return allViruses.filter(virus => {
            // FIXED: Validate virus object before checking instance
            if (!virus || typeof virus !== 'object') {
                return false;
            }
            
            return virus instanceof VirusEnemy && 
                   virus.uniqueId && 
                   this.connectedViruses.has(virus.uniqueId);
        });
    }
    
    /**
     * Calculate the center of the group
     */
    calculateGroupCenter(connectedViruses) {
        let centerX = this.x * this.radius;
        let centerY = this.y * this.radius;
        let totalMass = this.radius;
        
        connectedViruses.forEach(virus => {
            centerX += virus.x * virus.radius;
            centerY += virus.y * virus.radius;
            totalMass += virus.radius;
        });
        
        return {
            x: centerX / totalMass,
            y: centerY / totalMass
        };
    }
    
    /**
     * Determine which virus becomes the group leader
     */
    determineGroupLeader(connectedViruses) {
        let leader = this;
        const allViruses = [this, ...connectedViruses];
        
        allViruses.forEach(virus => {
            if (virus.radius > leader.radius) {
                leader = virus;
            }
        });
        
        // Update leadership status
        allViruses.forEach(virus => {
            virus.isGroupLeader = (virus === leader);
            virus.groupId = leader.uniqueId;
        });
        
        return leader;
    }
    
    /**
     * Group leader makes movement decisions for the entire group
     */
    makeGroupMovementDecision(connectedViruses, groupCenter) {
        // Use the group's shared AI state and target
        switch (this.groupAIState) {
            case 'hunt_food':
                if (this.groupTarget) {
                    this.targetX = this.groupTarget.x;
                    this.targetY = this.groupTarget.y;
                }
                break;
            case 'flee':
                if (this.groupTarget) {
                    // Flee from threat
                    const dx = groupCenter.x - this.groupTarget.x;
                    const dy = groupCenter.y - this.groupTarget.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance > 0) {
                        const normalizedX = dx / distance;
                        const normalizedY = dy / distance;
                        
                        this.targetX = groupCenter.x + normalizedX * 200;
                        this.targetY = groupCenter.y + normalizedY * 200;
                    }
                }
                break;
            case 'seek_connection':
                if (this.groupTarget) {
                    this.targetX = this.groupTarget.x;
                    this.targetY = this.groupTarget.y;
                }
                break;
            default:
                // Group exploration
                if (!this.explorationTarget || Math.random() < 0.01) {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 200 + Math.random() * 300;
                    
                    this.explorationTarget = {
                        x: groupCenter.x + Math.cos(angle) * distance,
                        y: groupCenter.y + Math.sin(angle) * distance
                    };
                }
                
                if (this.explorationTarget) {
                    this.targetX = this.explorationTarget.x;
                    this.targetY = this.explorationTarget.y;
                }
        }
    }
    
    /**
     * Apply group movement to all group members
     */
    applyGroupMovement(connectedViruses, groupCenter) {
        // All group members get the same target and AI state
        connectedViruses.forEach(virus => {
            virus.targetX = this.targetX;
            virus.targetY = this.targetY;
            virus.aiState = this.groupAIState;
            virus.groupAIState = this.groupAIState;
            virus.groupTarget = this.groupTarget;
            virus.explorationTarget = this.explorationTarget;
        });
        
        // Apply movement to all group members (including this virus)
        const allGroupMembers = [this, ...connectedViruses];
        allGroupMembers.forEach(virus => {
            // Apply movement based on the group's AI state
            switch (virus.groupAIState) {
                case 'hunt_food':
                case 'seek_connection':
                    virus.moveTowardsTarget();
                    break;
                case 'flee':
                    virus.fleeBehavior();
                    break;
                case 'explore':
                default:
                    virus.moveTowardsTarget(); // Use moveTowardsTarget for exploration too
            }
        });
        
        // Maintain edge-to-edge formation
        this.maintainEdgeToEdgeFormation(connectedViruses, groupCenter);
    }
    
    /**
     * Maintain edge-to-edge formation - viruses stick together permanently at their edges
     */
    maintainEdgeToEdgeFormation(connectedViruses, groupCenter) {
        // Strong attraction to group center - prevents disconnection
        const distanceToCenter = Math.sqrt(
            Math.pow(this.x - groupCenter.x, 2) + Math.pow(this.y - groupCenter.y, 2)
        );
        
        const maxGroupDistance = this.connectionRange * 2; // Increased maximum distance
        if (distanceToCenter > maxGroupDistance) {
            // Too far from group, apply strong force to pull back
            const angle = Math.atan2(groupCenter.y - this.y, groupCenter.x - this.x);
            const pullForce = this.connectionStrength * 0.3; // Strong pull force
            
            this.velocityX += Math.cos(angle) * pullForce;
            this.velocityY += Math.sin(angle) * pullForce;
        }
        
        // FIXED: Maintain edge-to-edge contact with connected viruses - using named constants
        const FORMATION_CONSTANTS = {
            MIN_DISTANCE_EPSILON: 0.001,
            CLOSE_DISTANCE_THRESHOLD: 0.9,
            FAR_DISTANCE_THRESHOLD: 1.1,
            PUSH_FORCE_MULTIPLIER: 0.2,
            PULL_FORCE_MULTIPLIER: 0.4,
            DISTANCE_DIVISION_FACTOR: 2
        };
        
        connectedViruses.forEach(virus => {
            const dx = virus.x - this.x;
            const dy = virus.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const idealDistance = this.radius + virus.radius; // Edge-to-edge distance
            
            if (distance > FORMATION_CONSTANTS.MIN_DISTANCE_EPSILON) { // Prevent division by zero
                const normalizedX = dx / distance;
                const normalizedY = dy / distance;
                
                if (distance < idealDistance * FORMATION_CONSTANTS.CLOSE_DISTANCE_THRESHOLD) {
                    // Too close, strong push apart to maintain edge-to-edge contact
                    const pushForce = this.connectionStrength * FORMATION_CONSTANTS.PUSH_FORCE_MULTIPLIER;
                    const pushDistance = (idealDistance - distance) / FORMATION_CONSTANTS.DISTANCE_DIVISION_FACTOR;
                    
                    this.x -= normalizedX * pushDistance * pushForce;
                    this.y -= normalizedY * pushDistance * pushForce;
                    virus.x += normalizedX * pushDistance * pushForce;
                    virus.y += normalizedY * pushDistance * pushForce;
                } else if (distance > idealDistance * FORMATION_CONSTANTS.FAR_DISTANCE_THRESHOLD) {
                    // Too far, strong pull together to maintain connection
                    const pullForce = this.connectionStrength * FORMATION_CONSTANTS.PULL_FORCE_MULTIPLIER;
                    const pullDistance = (distance - idealDistance) / FORMATION_CONSTANTS.DISTANCE_DIVISION_FACTOR;
                    
                    this.x += normalizedX * pullDistance * pullForce;
                    this.y += normalizedY * pullDistance * pullForce;
                    virus.x -= normalizedX * pullDistance * pullForce;
                    virus.y -= normalizedY * pullDistance * pullForce;
                }
            }
        });
    }
    
    /**
     * Flee from threats
     */
    fleeBehavior() {
        if (this.currentTarget) {
            const dx = this.x - this.currentTarget.x;
            const dy = this.y - this.currentTarget.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const normalizedX = dx / distance;
                const normalizedY = dy / distance;
                
                // Apply group slowdown even when fleeing
                const groupSize = this.getGroupSize();
                const groupSlowdown = Math.max(0.4, 1.0 - (groupSize - 1) * 0.1); // 10% slower per additional virus
                const effectiveSpeed = this.maxSpeed * 1.2 * groupSlowdown; // Still faster when fleeing, but slowed by group
                
                // Move away from threat
                this.velocityX = normalizedX * effectiveSpeed;
                this.velocityY = normalizedY * effectiveSpeed;
            }
        }
    }
    
    /**
     * Move towards current target
     */
    moveTowardsTarget() {
        if (this.targetX !== undefined && this.targetY !== undefined) {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 8) {
                const normalizedX = dx / distance;
                const normalizedY = dy / distance;
                
                // Apply group slowdown - larger groups move slower
                const groupSize = this.getGroupSize();
                const groupSlowdown = Math.max(0.3, 1.0 - (groupSize - 1) * 0.1); // 10% slower per additional virus
                const effectiveSpeed = this.maxSpeed * groupSlowdown;
                
                // Apply movement with some persistence
                this.velocityX = normalizedX * effectiveSpeed;
                this.velocityY = normalizedY * effectiveSpeed;
            } else {
                // Reached target, find a new target nearby
                this.findNewNearbyTarget();
            }
        } else {
            // No target - ensure continuous movement
            this.ensureContinuousMovement();
        }
    }
    
    /**
     * Find a new target near the current position to maintain movement
     */
    findNewNearbyTarget() {
        // Find a new target within a reasonable distance
        const angle = Math.random() * Math.PI * 2;
        const distance = 60 + Math.random() * 80; // Close but not too close
        
        this.targetX = this.x + Math.cos(angle) * distance;
        this.targetY = this.y + Math.sin(angle) * distance;
    }
    
    /**
     * Ensure virus keeps moving even when no specific target
     */
    ensureContinuousMovement() {
        // If velocity is too low, give it a push
        const currentSpeed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        
        if (currentSpeed < this.maxSpeed * 0.2) {
            // Generate new movement direction
            const angle = Math.random() * Math.PI * 2;
            const speed = this.maxSpeed * 0.4; // Moderate speed for exploration
            
            this.velocityX = Math.cos(angle) * speed;
            this.velocityY = Math.sin(angle) * speed;
            
            // Set a target in this direction
            const targetDistance = 100 + Math.random() * 100;
            this.targetX = this.x + Math.cos(angle) * targetDistance;
            this.targetY = this.y + Math.sin(angle) * targetDistance;
        }
    }
    
    /**
     * Wander behavior - random movement
     */
    wanderBehavior() {
        // Pick a new random target occasionally
        if (Math.random() < 0.02) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 50 + Math.random() * 100;
            
            this.targetX = this.x + Math.cos(angle) * distance;
            this.targetY = this.y + Math.sin(angle) * distance;
        }
        
        this.moveTowardsTarget();
    }
    
    /**
     * Override movement update with less friction for more active viruses
     */
    updateMovement() {
        // Apply velocity to position
        this.x += this.velocityX;
        this.y += this.velocityY;
        
        // Apply less friction for more active movement
        this.velocityX *= 0.995; // Much less friction than base cells (0.98)
        this.velocityY *= 0.995;
    }
    
    /**
     * Enhanced eating behavior - viral infection
     */
    onEnemyEat(other) {
        super.onEnemyEat(other);
        
        // Viruses grow and reduce hunger when eating
        const growthAmount = other.radius * 0.3; // 30% of eaten cell's radius
        this.radius = Math.min(1000, this.radius + growthAmount); // Increased max size to 1000
        this.killRadius = this.radius * 1.2; // Update kill radius
        this.hungerLevel = Math.max(0, this.hungerLevel - 200); // Reduce hunger
        
        // Increase aggression
        this.aggression = Math.min(1.0, this.aggression + 0.1);
        this.huntRange = Math.min(200, this.huntRange + 5);
        
        // console.log(`🦠 Virus infected cell, new radius: ${this.radius}, hunger: ${this.hungerLevel}`); // Disabled to reduce spam
    }
    
    /**
     * Get enhanced render properties for virus
     */
    getRenderProps() {
        const baseProps = super.getRenderProps();
        
        // Add virus-specific visual properties
        baseProps.spikeCount = this.spikeCount;
        baseProps.spikeLength = this.spikeLength;
        baseProps.killRadius = this.killRadius;
        baseProps.isVirus = true;
        
        return baseProps;
    }
    
    /**
     * Viruses cluster with other viruses
     */
    shouldClusterWith(otherEnemy) {
        return otherEnemy instanceof VirusEnemy;
    }
    
    /**
     * Get cluster information
     */
    getClusterInfo() {
        return {
            clusterId: this.clusterId,
            role: this.clusterRole,
            center: this.clusterCenter
        };
    }
    
    /**
     * Get group information for debugging and rendering
     */
    getGroupInfo() {
        return {
            groupId: this.groupId,
            isGroupLeader: this.isGroupLeader,
            groupSize: this.getGroupSize(),
            connectedViruses: Array.from(this.connectedViruses),
            groupTarget: this.groupTarget,
            groupAIState: this.groupAIState
        };
    }
    
    /**
     * Check if this virus is connected to any other viruses
     */
    isConnected() {
        return this.connectedViruses.size > 0;
    }
    
    /**
     * Get the total effective size of the virus group
     */
    getGroupEffectiveSize() {
        // Viruses maintain their original size regardless of connections
        return this.radius;
    }
}

// Export for use in other modules
window.VirusEnemy = VirusEnemy;