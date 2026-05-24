/**
 * Virus Group Manager - Handles virus connections and group behavior
 * This class manages the connection system for virus cells, ensuring they work as a single organism
 */
class VirusGroupManager {
    constructor() {
        this.virusGroups = new Map(); // Map of groupId -> Set of virus IDs
        this.virusLookup = new Map(); // Map of virusId -> virus object
        this.connectionRange = 35; // How close viruses need to be to connect (edge-to-edge)
        this.maxConnections = 10; // Maximum connections per virus
    }
    
    /**
     * Register a virus with the group manager
     */
    registerVirus(virus) {
        this.virusLookup.set(virus.uniqueId, virus);
        
        // If virus is not in a group, create a new group for it
        if (!virus.groupId) {
            virus.groupId = virus.uniqueId;
            virus.isGroupLeader = true;
            this.virusGroups.set(virus.uniqueId, new Set([virus.uniqueId]));
        }
    }
    
    /**
     * Unregister a virus from the group manager
     */
    unregisterVirus(virus) {
        this.virusLookup.delete(virus.uniqueId);
        
        if (virus.groupId) {
            const group = this.virusGroups.get(virus.groupId);
            if (group) {
                group.delete(virus.uniqueId);
                
                // If group is empty, remove it
                if (group.size === 0) {
                    this.virusGroups.delete(virus.groupId);
                } else if (virus.isGroupLeader) {
                    // If leader left, assign new leader
                    this.assignNewLeader(virus.groupId);
                }
            }
        }
    }
    
    /**
     * Assign a new leader to a group
     */
    assignNewLeader(groupId) {
        const group = this.virusGroups.get(groupId);
        if (!group || group.size === 0) return;
        
        // Find the largest virus in the group
        let newLeader = null;
        let maxRadius = 0;
        
        group.forEach(virusId => {
            const virus = this.virusLookup.get(virusId);
            if (virus && virus.radius > maxRadius) {
                maxRadius = virus.radius;
                newLeader = virus;
            }
        });
        
        if (newLeader) {
            // Update leadership
            group.forEach(virusId => {
                const virus = this.virusLookup.get(virusId);
                if (virus) {
                    virus.isGroupLeader = (virus === newLeader);
                    virus.groupId = newLeader.uniqueId;
                }
            });
            
            // Update group mapping
            this.virusGroups.delete(groupId);
            this.virusGroups.set(newLeader.uniqueId, group);
        }
    }
    
    /**
     * Check for potential connections between viruses
     */
    checkForConnections(viruses) {
        for (let i = 0; i < viruses.length; i++) {
            for (let j = i + 1; j < viruses.length; j++) {
                const virus1 = viruses[i];
                const virus2 = viruses[j];
                
                // Skip if already connected
                if (virus1.connectedViruses.has(virus2.uniqueId)) {
                    continue;
                }
                
                // Check if they can connect (edge-to-edge)
                if (this.canConnect(virus1, virus2)) {
                    this.connectViruses(virus1, virus2);
                }
            }
        }
    }
    
    /**
     * Check if two viruses can connect (edge-to-edge)
     */
    canConnect(virus1, virus2) {
        // Check distance - they need to be close enough to touch edges
        const distance = virus1.distanceTo(virus2);
        const edgeToEdgeDistance = virus1.radius + virus2.radius;
        
        if (distance > edgeToEdgeDistance + 10) { // Small buffer for connection
            return false;
        }
        
        // Check connection limits
        if (virus1.connectedViruses.size >= this.maxConnections ||
            virus2.connectedViruses.size >= this.maxConnections) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Connect two viruses edge-to-edge
     */
    connectViruses(virus1, virus2) {
        // Add bidirectional connection
        virus1.connectedViruses.add(virus2.uniqueId);
        virus2.connectedViruses.add(virus1.uniqueId);
        
        // Position viruses edge-to-edge
        this.positionVirusesEdgeToEdge(virus1, virus2);
        
        // Merge groups
        this.mergeGroups(virus1, virus2);
        
        // console.log(`🦠 Viruses ${virus1.uniqueId} and ${virus2.uniqueId} connected!`); // Disabled to reduce spam
    }
    
    /**
     * Position two viruses edge-to-edge
     */
    positionVirusesEdgeToEdge(virus1, virus2) {
        const dx = virus2.x - virus1.x;
        const dy = virus2.y - virus1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const idealDistance = virus1.radius + virus2.radius; // Edge-to-edge distance
            const normalizedX = dx / distance;
            const normalizedY = dy / distance;
            
            // Position virus2 at the correct edge-to-edge distance from virus1
            const newX = virus1.x + normalizedX * idealDistance;
            const newY = virus1.y + normalizedY * idealDistance;
            
            virus2.x = newX;
            virus2.y = newY;
        }
    }
    
    /**
     * Merge two virus groups
     */
    mergeGroups(virus1, virus2) {
        const group1 = this.virusGroups.get(virus1.groupId);
        const group2 = this.virusGroups.get(virus2.groupId);
        
        if (!group1 || !group2) return;
        
        // If they're already in the same group, nothing to do
        if (virus1.groupId === virus2.groupId) return;
        
        // Determine which group to keep (larger group or group with larger leader)
        let keepGroupId, mergeGroupId;
        if (group1.size >= group2.size) {
            keepGroupId = virus1.groupId;
            mergeGroupId = virus2.groupId;
        } else {
            keepGroupId = virus2.groupId;
            mergeGroupId = virus1.groupId;
        }
        
        // Merge the groups
        const keepGroup = this.virusGroups.get(keepGroupId);
        const mergeGroup = this.virusGroups.get(mergeGroupId);
        
        mergeGroup.forEach(virusId => {
            const virus = this.virusLookup.get(virusId);
            if (virus) {
                virus.groupId = keepGroupId;
                virus.isGroupLeader = false; // Only one leader per group
            }
            keepGroup.add(virusId);
        });
        
        // Remove the merged group
        this.virusGroups.delete(mergeGroupId);
        
        // Assign new leader if needed
        this.assignNewLeader(keepGroupId);
    }
    
    /**
     * Update group behavior for all virus groups
     */
    updateGroupBehavior(viruses) {
        // Update each group
        this.virusGroups.forEach((group, groupId) => {
            this.updateGroup(group, groupId);
        });
    }
    
    /**
     * Update a specific group
     */
    updateGroup(group, groupId) {
        if (group.size <= 1) return; // No group behavior for single viruses
        
        // Get all viruses in the group
        const groupViruses = [];
        group.forEach(virusId => {
            const virus = this.virusLookup.get(virusId);
            if (virus) {
                groupViruses.push(virus);
            }
        });
        
        if (groupViruses.length <= 1) return;
        
        // Find the group leader
        const leader = groupViruses.find(v => v.isGroupLeader);
        if (!leader) {
            // No leader, assign one
            this.assignNewLeader(groupId);
            return;
        }
        
        // Update group properties
        this.updateGroupProperties(groupViruses, leader);
        
        // Apply group movement
        this.applyGroupMovement(groupViruses, leader);
    }
    
    /**
     * Update group properties
     */
    updateGroupProperties(groupViruses, leader) {
        // Calculate group center
        let centerX = 0, centerY = 0, totalMass = 0;
        
        groupViruses.forEach(virus => {
            centerX += virus.x * virus.radius;
            centerY += virus.y * virus.radius;
            totalMass += virus.radius;
        });
        
        const groupCenter = {
            x: centerX / totalMass,
            y: centerY / totalMass
        };
        
        // Update all viruses with group center
        groupViruses.forEach(virus => {
            virus.groupCenter = groupCenter;
        });
    }
    
    /**
     * Apply group movement
     */
    applyGroupMovement(groupViruses, leader) {
        // Only the leader makes movement decisions
        if (leader.groupAIState) {
            leader.aiState = leader.groupAIState;
        }
        
        if (leader.groupTarget) {
            leader.currentTarget = leader.groupTarget;
            leader.targetX = leader.groupTarget.x;
            leader.targetY = leader.groupTarget.y;
        }
        
        // Apply leader's decisions to all group members
        groupViruses.forEach(virus => {
            if (virus !== leader) {
                virus.aiState = leader.aiState;
                virus.groupAIState = leader.groupAIState;
                virus.currentTarget = leader.currentTarget;
                virus.groupTarget = leader.groupTarget;
                virus.targetX = leader.targetX;
                virus.targetY = leader.targetY;
                virus.explorationTarget = leader.explorationTarget;
            }
        });
        
        // Apply movement to all group members
        groupViruses.forEach(virus => {
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
        this.maintainEdgeToEdgeFormation(groupViruses);
    }
    
    /**
     * Maintain edge-to-edge formation within the group
     */
    maintainEdgeToEdgeFormation(groupViruses) {
        // Apply formation forces to keep viruses edge-to-edge
        for (let i = 0; i < groupViruses.length; i++) {
            for (let j = i + 1; j < groupViruses.length; j++) {
                const virus1 = groupViruses[i];
                const virus2 = groupViruses[j];
                
                const dx = virus2.x - virus1.x;
                const dy = virus2.y - virus1.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const idealDistance = virus1.radius + virus2.radius; // Edge-to-edge distance
                
                if (distance < idealDistance && distance > 0) {
                    // Too close, push apart to maintain edge-to-edge contact
                    const pushForce = 0.03; // Reduced force to not interfere with movement
                    const normalizedX = dx / distance;
                    const normalizedY = dy / distance;
                    
                    const pushDistance = (idealDistance - distance) / 2;
                    
                    virus1.x -= normalizedX * pushDistance * pushForce;
                    virus1.y -= normalizedY * pushDistance * pushForce;
                    virus2.x += normalizedX * pushDistance * pushForce;
                    virus2.y += normalizedY * pushDistance * pushForce;
                } else if (distance > idealDistance * 2.0) {
                    // Too far, pull together to maintain connection (increased threshold)
                    const pullForce = 0.02; // Reduced force to not interfere with movement
                    const normalizedX = dx / distance;
                    const normalizedY = dy / distance;
                    
                    const pullDistance = (distance - idealDistance) / 2;
                    
                    virus1.x += normalizedX * pullDistance * pullForce;
                    virus1.y += normalizedY * pullDistance * pullForce;
                    virus2.x -= normalizedX * pullDistance * pullForce;
                    virus2.y -= normalizedY * pullDistance * pullForce;
                }
            }
        }
    }
    
    /**
     * Handle collective food consumption for groups
     */
    handleCollectiveFoodConsumption(viruses, cells) {
        // Find all virus groups
        const groups = new Map();
        
        viruses.forEach(virus => {
            if (virus.isInGroup()) {
                const groupId = virus.groupId;
                if (!groups.has(groupId)) {
                    groups.set(groupId, []);
                }
                groups.get(groupId).push(virus);
            }
        });
        
        // Process each group
        groups.forEach((groupViruses, groupId) => {
            if (groupViruses.length > 1) {
                this.processGroupFoodConsumption(groupViruses, cells);
            }
        });
    }
    
    /**
     * Process food consumption for a group
     */
    processGroupFoodConsumption(groupViruses, cells) {
        const leader = groupViruses.find(v => v.isGroupLeader);
        if (!leader) return;
        
        // Ensure group properties are updated (including groupCenter)
        this.updateGroupProperties(groupViruses, leader);
        
        // Look for food that any virus in the group can eat
        const foodTargets = cells.filter(cell => {
            if (cell instanceof VirusEnemy) return false;
            
            // Check if any virus in the group can eat this cell
            const canEat = groupViruses.some(virus => virus.canEat(cell));
            
            // Safety check for groupCenter
            if (!leader.groupCenter) return canEat;
            
            const distance = Math.sqrt((cell.x - leader.groupCenter.x) ** 2 + (cell.y - leader.groupCenter.y) ** 2);
            
            return canEat && distance < leader.searchRadius * 1.5;
        }).sort((a, b) => {
            // Safety check for groupCenter
            if (!leader.groupCenter) return 0;
            
            const distA = Math.sqrt((a.x - leader.groupCenter.x) ** 2 + (a.y - leader.groupCenter.y) ** 2);
            const distB = Math.sqrt((b.x - leader.groupCenter.x) ** 2 + (b.y - leader.groupCenter.y) ** 2);
            return distA - distB;
        });
        
        if (foodTargets.length > 0) {
            // Set group target to food
            leader.groupTarget = foodTargets[0];
            leader.groupAIState = 'hunt_food';
        }
    }
    
    /**
     * Get debug information about all groups
     */
    getDebugInfo() {
        const info = {
            totalGroups: this.virusGroups.size,
            totalViruses: this.virusLookup.size,
            groups: []
        };
        
        this.virusGroups.forEach((group, groupId) => {
            const groupInfo = {
                groupId: groupId,
                size: group.size,
                viruses: Array.from(group)
            };
            info.groups.push(groupInfo);
        });
        
        return info;
    }
}

// Export for use in other modules
window.VirusGroupManager = VirusGroupManager;