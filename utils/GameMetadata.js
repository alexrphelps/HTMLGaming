/**
 * Shared helpers for normalizing GameHub game config entries.
 */
class GameMetadata {
    static formatFolderName(folder) {
        return String(folder)
            .replace(/[-_]+/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/\b\w/g, char => char.toUpperCase());
    }

    static createInitials(name) {
        const initials = String(name)
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(word => word[0].toUpperCase())
            .join('');

        return initials || 'GH';
    }

    static normalizeRating(value) {
        const normalized = Number.parseInt(value, 10);
        return normalized >= 1 && normalized <= 5 ? normalized : 3;
    }

    static normalizeText(value, fallback) {
        return typeof value === 'string' && value.trim() ? value : fallback;
    }

    static normalizeNumber(value, fallback) {
        const numeric = Number(value);
        return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
    }

    static normalize(config = {}) {
        const folder = String(config.folder || '');
        const displayName = this.normalizeText(config.name, this.formatFolderName(folder));
        return {
            name: displayName,
            description: this.normalizeText(config.description, 'A GameHub game.'),
            category: this.normalizeText(config.category, 'Other'),
            difficulty: this.normalizeText(config.difficulty, 'Medium'),
            icon: this.normalizeText(config.icon, this.createInitials(displayName)),
            tags: Array.isArray(config.tags) ? config.tags.filter(tag => typeof tag === 'string') : [],
            version: this.normalizeText(config.version, '1.0.0'),
            author: this.normalizeText(config.author, 'Unknown'),
            estimatedPlayTime: this.normalizeNumber(config.estimatedPlayTime, 10),
            aiEffortRating: this.normalizeRating(config.aiEffortRating),
            defaultRating: this.normalizeRating(config.defaultRating),
            input: this.normalizeText(config.input, 'Keyboard'),
            rendering: this.normalizeText(config.rendering, 'Canvas'),
            saveSupport: this.normalizeText(config.saveSupport, 'Unknown')
        };
    }

    static generateGameId(name) {
        return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    static validateConfig(config, seenIds = new Set()) {
        const warnings = [];

        if (!config || typeof config !== 'object') {
            warnings.push('config entry must be an object');
            return warnings;
        }

        if (!config.folder) {
            warnings.push('missing folder');
            return warnings;
        }

        const id = this.generateGameId(config.folder);
        if (seenIds.has(id)) {
            warnings.push(`duplicate generated id "${id}"`);
        }
        seenIds.add(id);

        if (config.tags && !Array.isArray(config.tags)) {
            warnings.push(`tags for "${config.folder}" should be an array`);
        }

        ['aiEffortRating', 'defaultRating'].forEach(field => {
            if (config[field] !== undefined && this.normalizeRating(config[field]) !== Number.parseInt(config[field], 10)) {
                warnings.push(`${field} for "${config.folder}" should be a number from 1 to 5`);
            }
        });

        return warnings;
    }
}

if (typeof window !== 'undefined') {
    window.GameMetadata = GameMetadata;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameMetadata;
}
