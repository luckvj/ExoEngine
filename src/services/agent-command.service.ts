/**
 * Agent Command Parser Service
 * Handles natural language command interpretation for the ExoMind agent
 */
import { subclassParserService } from './subclass-parser.service';

export interface CommandResult {
    type: 'navigation' | 'action' | 'unknown';
    target?: string;
    message: string;
    success: boolean;
    actionType?: 'equip' | 'loadout';
    actionPayload?: any;
}

interface NavigationCommand {
    keywords: string[];
    route: string;
    name: string;
}

const NAVIGATION_COMMANDS: NavigationCommand[] = [
    {
        keywords: ['builds', 'build', 'vault', 'loadout vault', 'optimizer', 'loadouts'],
        route: '/builds',
        name: 'Builds'
    },
    {
        keywords: ['galaxy', 'synergy galaxy', 'synergies', 'builder'],
        route: '/galaxy',
        name: 'Synergy Galaxy'
    },
    {
        keywords: ['settings', 'setting', 'preferences', 'config', 'configuration'],
        route: '/settings',
        name: 'Settings'
    },
    {
        keywords: ['generator', 'random', 'chaos', 'generate', 'randomize'],
        route: '/generator',
        name: 'Generator'
    },
    {
        keywords: ['saved builds', 'saved', 'my builds', 'personal builds'],
        route: '/saved-builds',
        name: 'Saved Builds'
    },
    {
        keywords: ['home', 'main', 'start', 'beginning', 'menu'],
        route: '/',
        name: 'Home'
    },
    {
        keywords: ['credits', 'about', 'info', 'information'],
        route: '/credits',
        name: 'Credits'
    }
];

const NAVIGATION_TRIGGERS = [
    'go to', 'goto', 'open', 'show', 'show me', 'take me to', 'navigate to',
    'load', 'launch', 'start', 'bring up', 'head to', 'switch to',
    'display', 'view', 'see', 'check', 'look at'
];

const EQUIP_TRIGGERS = [
    'equip', 'wear', 'put on', 'use', 'switch to'
];

// Natural language patterns for equipping
const NATURAL_EQUIP_PATTERNS = [
    /^i want to (?:equip|use|wear|run)\s+(.+)$/i,
    /^lets? (?:equip|use|wear|run)\s+(.+)$/i,
    /^can you (?:equip|use|wear)\s+(.+)$/i,
    /^(?:equip|use|wear|run)\s+(.+)$/i,
];

/**
 * Normalizes input text for matching
 */
function normalizeInput(input: string): string {
    return input
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Remove special chars
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
}

/**
 * Checks if the input is a DIM share link or loadout link
 */
function isDIMLink(input: string): boolean {
    // Accept dim.gg share links and destinyitemmanager.com URLs
    // This includes both loadout share links and profile page links
    // The loadout-link.service will handle validation and provide helpful errors
    return input.includes('dim.gg/') || input.includes('destinyitemmanager.com');
}

/**
 * Parses an equip command and extracts the item names or hashes (supports multiple items)
 */
function parseEquipCommand(normalized: string, original: string): { items: Array<{ itemIdentifier: string; isHash: boolean }> } | null {
    const lowerOriginal = original.toLowerCase().trim();
    
    // Try to match equip triggers
    for (const trigger of EQUIP_TRIGGERS) {
        const triggerNormalized = normalizeInput(trigger);
        
        // Check if command starts with the trigger
        if (normalized.startsWith(triggerNormalized)) {
            // Extract everything after the trigger
            const afterTrigger = lowerOriginal.substring(trigger.length).trim();
            if (afterTrigger) {
                // Split by comma, "and", or "with" for multiple items
                const normalizedString = afterTrigger
                    .replace(/\s+and\s+/gi, ',')
                    .replace(/\s+with\s+/gi, ',');
                const itemStrings = normalizedString.split(',').map(s => s.trim()).filter(s => s.length > 0);
                const items = itemStrings.map(itemStr => {
                    // Check if it's a hash (all digits)
                    const isHash = /^\d+$/.test(itemStr);
                    return { itemIdentifier: itemStr, isHash };
                });
                return { items };
            }
        }
        
        // Also check with the normalized string to handle edge cases
        if (normalized.includes(triggerNormalized)) {
            const parts = normalized.split(triggerNormalized);
            if (parts.length > 1 && parts[1].trim()) {
                // Reconstruct from original to preserve capitalization
                const afterIndex = lowerOriginal.indexOf(trigger) + trigger.length;
                const itemsString = original.substring(afterIndex).trim();
                if (itemsString) {
                    // Split by comma, "and", or "with" for multiple items
                    const normalizedString = itemsString
                        .replace(/\s+and\s+/gi, ',')
                        .replace(/\s+with\s+/gi, ',');
                    const itemStrings = normalizedString.split(',').map(s => s.trim()).filter(s => s.length > 0);
                    const items = itemStrings.map(itemStr => {
                        // Check if it's a hash (all digits)
                        const isHash = /^\d+$/.test(itemStr);
                        return { itemIdentifier: itemStr, isHash };
                    });
                    return { items };
                }
            }
        }
    }
    
    return null;
}

/**
 * Parses a navigation command
 */
function parseNavigationCommand(normalized: string): NavigationCommand | null {
    // Check for direct keyword matches
    for (const cmd of NAVIGATION_COMMANDS) {
        for (const keyword of cmd.keywords) {
            const keywordNormalized = normalizeInput(keyword); // Apply same normalization!
            
            // Direct match (e.g., "builds")
            if (normalized === keywordNormalized) {
                return cmd;
            }
            
            // Check if normalized input contains the keyword
            if (normalized.includes(keywordNormalized)) {
                return cmd;
            }
            
            // With navigation trigger (e.g., "go to builds" -> "gotobuilds")
            for (const trigger of NAVIGATION_TRIGGERS) {
                const triggerNormalized = normalizeInput(trigger);
                const fullCommand = triggerNormalized + keywordNormalized;
                
                if (normalized === fullCommand || 
                    normalized.startsWith(fullCommand) ||
                    normalized.endsWith(fullCommand)) {
                    return cmd;
                }
            }
            
            // With common suffixes (e.g., "builds page" -> "buildspage")
            const suffixes = ['page', 'screen', 'view', 'mode', 'tab'];
            for (const suffix of suffixes) {
                if (normalized === `${keywordNormalized}${suffix}` ||
                    normalized.startsWith(`${keywordNormalized}${suffix}`) ||
                    normalized.endsWith(`${keywordNormalized}${suffix}`)) {
                    return cmd;
                }
            }
        }
    }
    
    return null;
}

/**
 * Main command parser - interprets user input and returns appropriate action
 */
export function parseCommand(input: string): CommandResult {
    const trimmed = input.trim();
    
    if (!trimmed) {
        return {
            type: 'unknown',
            message: 'Please enter a command.',
            success: false
        };
    }
    
    // Check for DIM links first
    if (isDIMLink(trimmed)) {
        const encodedUrl = encodeURIComponent(trimmed);
        return {
            type: 'navigation',
            target: `/dim-loadout?url=${encodedUrl}`,
            message: 'DIM loadout detected. Loading build analysis...',
            success: true
        };
    }
    
    // Check for natural language equip patterns first
    for (const pattern of NATURAL_EQUIP_PATTERNS) {
        const match = trimmed.match(pattern);
        if (match && match[1]) {
            const itemsString = match[1].trim();
            
            // Check if this includes subclass configuration
            const hasSubclass = subclassParserService.containsSubclassKeywords(itemsString);
            
            // Split by comma, "and", or "with" for multiple items
            // First replace " and " and " with " with commas, then split by comma
            const normalizedString = itemsString
                .replace(/\s+and\s+/gi, ',')
                .replace(/\s+with\s+/gi, ',');
            const itemStrings = normalizedString.split(',').map(s => s.trim()).filter(s => s.length > 0);
            
            const items = itemStrings.map(itemStr => {
                // Check if it's a hash (all digits)
                const isHash = /^\d+$/.test(itemStr);
                return { itemIdentifier: itemStr, isHash };
            });
            
            if (hasSubclass) {
                // This is a full loadout with subclass config
                return {
                    type: 'action',
                    message: `Configuring loadout...`,
                    success: true,
                    actionType: 'loadout',
                    actionPayload: { 
                        items,
                        subclassText: itemsString
                    }
                };
            } else {
                // Just equipping items
                const itemCount = items.length;
                const displayText = itemCount === 1 
                    ? (items[0].isHash ? `item hash ${items[0].itemIdentifier}` : items[0].itemIdentifier)
                    : `${itemCount} items`;
                
                return {
                    type: 'action',
                    message: `Searching for ${displayText}...`,
                    success: true,
                    actionType: 'equip',
                    actionPayload: { items }
                };
            }
        }
    }
    
    // Check for traditional equip commands
    const normalized = normalizeInput(trimmed);
    const equipCommand = parseEquipCommand(normalized, trimmed);
    
    if (equipCommand) {
        const itemCount = equipCommand.items.length;
        const displayText = itemCount === 1 
            ? (equipCommand.items[0].isHash 
                ? `item hash ${equipCommand.items[0].itemIdentifier}`
                : equipCommand.items[0].itemIdentifier)
            : `${itemCount} items`;
        
        return {
            type: 'action',
            message: `Searching for ${displayText}...`,
            success: true,
            actionType: 'equip',
            actionPayload: { 
                items: equipCommand.items
            }
        };
    }
    
    // Check for navigation commands
    const navCommand = parseNavigationCommand(normalized);
    
    if (navCommand) {
        return {
            type: 'navigation',
            target: navCommand.route,
            message: `Routing to ${navCommand.name}...`,
            success: true
        };
    }
    
    // Unknown command
    return {
        type: 'unknown',
        message: "I don't understand that command yet. Try: 'equip [item name]', 'go to builds', 'open galaxy', or paste a DIM link.",
        success: false
    };
}

/**
 * Gets command suggestions based on partial input
 */
export function getCommandSuggestions(input: string): string[] {
    if (!input.trim()) {
        return [];
    }
    
    const normalized = normalizeInput(input);
    const suggestions: string[] = [];
    
    // Match against navigation commands
    for (const cmd of NAVIGATION_COMMANDS) {
        for (const keyword of cmd.keywords) {
            if (keyword.toLowerCase().includes(normalized)) {
                suggestions.push(`Go to ${cmd.name}`);
                break; // Only add once per command
            }
        }
    }
    
    return suggestions.slice(0, 5); // Limit to 5 suggestions
}
