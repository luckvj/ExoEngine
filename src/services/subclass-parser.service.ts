/**
 * Subclass Configuration Parser
 * Parses natural language subclass/ability/aspect/fragment references
 */
import { SUBCLASS_HASHES, PRISMATIC_ASPECT_MAPPING } from '../constants/item-hashes';

export interface SubclassConfig {
    element?: string;
    subclassName?: string;
    subclassHash?: number;
    super?: string;
    grenade?: string | number;
    melee?: string | number;
    classAbility?: string | number;
    jump?: string | number;
    aspects?: string[];
    fragments?: string[];
}

// Subclass name mappings
const SUBCLASS_NAMES: Record<string, { titan?: number; hunter?: number; warlock?: number }> = {
    // Void
    'void': { titan: 2842471112, hunter: 2453351420, warlock: 2849050827 },
    'sentinel': { titan: 2842471112 },
    'nightstalker': { hunter: 2453351420 },
    'voidwalker': { warlock: 2849050827 },

    // Solar
    'solar': { titan: 2550323932, hunter: 2240888816, warlock: 3941205951 },
    'sunbreaker': { titan: 2550323932 },
    'gunslinger': { hunter: 2240888816 },
    'dawnblade': { warlock: 3941205951 },

    // Arc
    'arc': { titan: 2932390016, hunter: 2328211300, warlock: 3168997075 },
    'striker': { titan: 2932390016 },
    'arcstrider': { hunter: 2328211300 },
    'stormcaller': { warlock: 3168997075 },

    // Stasis
    'stasis': { titan: 613647804, hunter: 873720784, warlock: 3291545502 },
    'behemoth': { titan: 613647804 },
    'revenant': { hunter: 873720784 },
    'shadebinder': { warlock: 3291545502 },

    // Strand
    'strand': { titan: 242419885, hunter: 3785442599, warlock: 2849050826 },
    'berserker': { titan: 242419885 },
    'threadrunner': { hunter: 3785442599 },
    'broodweaver': { warlock: 2849050826 },

    // Prismatic
    'prismatic': { titan: 1616346845, hunter: 4282591831, warlock: 3893112950 },
};

/**
 * Generate ability keywords dynamically from SUBCLASS_HASHES
 * This automatically includes all aspects, fragments, grenades, melees from the constants
 */
interface AbilityInfo {
    keywords: string[];
    element: string;
}

function generateAbilityKeywords(): Record<string, AbilityInfo> {
    const keywords: Record<string, AbilityInfo> = {};

    // Helper to convert constant names to readable format
    const formatName = (key: string): string => {
        return key.toLowerCase().replace(/_/g, ' ');
    };

    // Extract all abilities from SUBCLASS_HASHES
    const elements = ['VOID', 'SOLAR', 'ARC', 'STASIS', 'STRAND', 'PRISMATIC'] as const;
    const classes = ['TITAN', 'HUNTER', 'WARLOCK'] as const;

    for (const element of elements) {
        const elementData = SUBCLASS_HASHES[element];
        if (!elementData) continue;

        for (const guardianClass of classes) {
            const classData = elementData[guardianClass];
            if (!classData) continue;

            // Extract aspects
            if (classData.ASPECTS) {
                for (const aspectKey of Object.keys(classData.ASPECTS)) {
                    const name = formatName(aspectKey);
                    if (!keywords[name]) {
                        keywords[name] = { keywords: [name], element: element.toLowerCase() };
                    }
                }
            }

            // Extract grenades
            if (classData.GRENADES) {
                for (const grenadeKey of Object.keys(classData.GRENADES)) {
                    const name = formatName(grenadeKey);
                    const withGrenade = `${name} grenade`;
                    if (!keywords[name]) {
                        keywords[name] = { keywords: [name, withGrenade], element: element.toLowerCase() };
                    }
                }
            }

            // Extract melees
            if (classData.MELEE) {
                for (const meleeKey of Object.keys(classData.MELEE)) {
                    const name = formatName(meleeKey);
                    if (!keywords[name]) {
                        keywords[name] = { keywords: [name], element: element.toLowerCase() };
                    }
                }
            }
        }

        // Extract fragments (element-level)
        if (elementData.FRAGMENTS) {
            for (const fragmentKey of Object.keys(elementData.FRAGMENTS)) {
                const name = formatName(fragmentKey);
                if (!keywords[name]) {
                    keywords[name] = { keywords: [name], element: element.toLowerCase() };
                }
            }
        }
    }

    return keywords;
}

// Generate ability keywords from constants
const ABILITY_KEYWORDS = generateAbilityKeywords();

const elementMap: Record<string, keyof typeof SUBCLASS_HASHES> = {
    'void': 'VOID', 'sentinel': 'VOID', 'nightstalker': 'VOID', 'voidwalker': 'VOID',
    'solar': 'SOLAR', 'sunbreaker': 'SOLAR', 'gunslinger': 'SOLAR', 'dawnblade': 'SOLAR',
    'arc': 'ARC', 'striker': 'ARC', 'arcstrider': 'ARC', 'stormcaller': 'ARC',
    'stasis': 'STASIS', 'behemoth': 'STASIS', 'revenant': 'STASIS', 'shadebinder': 'STASIS',
    'strand': 'STRAND', 'berserker': 'STRAND', 'threadrunner': 'STRAND', 'broodweaver': 'STRAND',
    'prismatic': 'PRISMATIC'
};

/**
 * Identify subclass identity by hash
 */
export function identifySubclassByHash(hash: number): string | undefined {
    for (const [name, classes] of Object.entries(SUBCLASS_NAMES)) {
        if (Object.values(classes).includes(hash)) {
            // Check subclasses like 'sentinel' -> map to 'void'
            return elementMap[name]?.toLowerCase() || name;
        }
    }
    return undefined;
}

/**
 * Resolve ability name to hash based on subclass and class
 */
function resolveAbilityHash(abilityName: string, subclassName: string, guardianClass: 0 | 1 | 2, abilityType: 'grenade' | 'melee' | 'classAbility' | 'movement'): number {
    const classKey = guardianClass === 0 ? 'TITAN' : guardianClass === 1 ? 'HUNTER' : 'WARLOCK';

    // Map subclass name to element

    const element = elementMap[subclassName.toLowerCase()];
    if (!element) return 0;

    const elementData = SUBCLASS_HASHES[element];
    if (!elementData || !elementData[classKey]) return 0;

    const classData = elementData[classKey];

    // Convert ability name to constant format (e.g., "storm grenade" -> "STORM")
    const constantName = abilityName.toUpperCase().replace(/ GRENADE$/, '').replace(/ /g, '_');

    if (abilityType === 'grenade' && classData.GRENADES) {
        return (classData.GRENADES as any)[constantName] || 0;
    } else if (abilityType === 'melee' && classData.MELEE) {
        return (classData.MELEE as any)[constantName] || 0;
    } else if (abilityType === 'classAbility' && classData.CLASS_ABILITIES) {
        return (classData.CLASS_ABILITIES as any)[constantName] || 0;
    } else if (abilityType === 'movement' && classData.JUMPS) {
        return (classData.JUMPS as any)[constantName] || 0;
    }

    return 0;
}

/**
 * Resolve aspect name to hash based on subclass and class
 * Automatically converts standard aspect hashes to Prismatic equivalents when needed
 */
function resolveAspectHash(aspectName: string, subclassName: string, guardianClass: 0 | 1 | 2): number {
    const classKey = guardianClass === 0 ? 'TITAN' : guardianClass === 1 ? 'HUNTER' : 'WARLOCK';
    const isPrismatic = subclassName.toLowerCase() === 'prismatic';

    // Map subclass name to element
    const elementMap: Record<string, keyof typeof SUBCLASS_HASHES> = {
        'void': 'VOID', 'sentinel': 'VOID', 'nightstalker': 'VOID', 'voidwalker': 'VOID',
        'solar': 'SOLAR', 'sunbreaker': 'SOLAR', 'gunslinger': 'SOLAR', 'dawnblade': 'SOLAR',
        'arc': 'ARC', 'striker': 'ARC', 'arcstrider': 'ARC', 'stormcaller': 'ARC',
        'stasis': 'STASIS', 'behemoth': 'STASIS', 'revenant': 'STASIS', 'shadebinder': 'STASIS',
        'strand': 'STRAND', 'berserker': 'STRAND', 'threadrunner': 'STRAND', 'broodweaver': 'STRAND',
        'prismatic': 'PRISMATIC'
    };

    const constantName = aspectName.toUpperCase().replace(/ /g, '_');

    // If Prismatic, try to find the aspect in Prismatic first
    if (isPrismatic) {
        const prismaticData = SUBCLASS_HASHES.PRISMATIC;
        if (prismaticData && prismaticData[classKey] && prismaticData[classKey].ASPECTS) {
            const hash = (prismaticData[classKey].ASPECTS as any)[constantName];
            if (hash) return hash;
        }
    }

    // Try to find in the specified element (or all elements if not found)
    const element = elementMap[subclassName.toLowerCase()];
    if (element && element !== 'PRISMATIC') {
        const elementData = SUBCLASS_HASHES[element];
        if (elementData && elementData[classKey] && elementData[classKey].ASPECTS) {
            const standardHash = (elementData[classKey].ASPECTS as any)[constantName];
            if (standardHash) {
                // If we found a standard aspect and we're on Prismatic, convert it
                if (isPrismatic) {
                    return PRISMATIC_ASPECT_MAPPING[standardHash] || standardHash;
                }
                return standardHash;
            }
        }
    }

    // If not found and Prismatic, search all elements and convert
    if (isPrismatic) {
        const elements = ['VOID', 'SOLAR', 'ARC', 'STASIS', 'STRAND'] as const;
        for (const elem of elements) {
            const elemData = SUBCLASS_HASHES[elem];
            if (elemData && elemData[classKey] && elemData[classKey].ASPECTS) {
                const standardHash = (elemData[classKey].ASPECTS as any)[constantName];
                if (standardHash) {
                    return PRISMATIC_ASPECT_MAPPING[standardHash] || standardHash;
                }
            }
        }
    }

    return 0;
}

/**
 * Resolve fragment name to hash based on element
 */
function resolveFragmentHash(fragmentName: string, subclassName: string): number {
    const element = subclassName ? elementMap[subclassName.toLowerCase()] : undefined;
    const constantName = fragmentName.toUpperCase().replace(/ /g, '_');

    // 1. Try to find in the specified element
    if (element) {
        const elementData = SUBCLASS_HASHES[element];
        if (elementData && elementData.FRAGMENTS) {
            const hash = (elementData.FRAGMENTS as any)[constantName];
            if (hash) return hash;
        }
    }

    // 2. Fallback: Search all elements (fragments are often unique across elements)
    const elements = ['VOID', 'SOLAR', 'ARC', 'STASIS', 'STRAND', 'PRISMATIC'] as const;
    for (const elem of elements) {
        const elemData = SUBCLASS_HASHES[elem];
        if (elemData && elemData.FRAGMENTS) {
            const hash = (elemData.FRAGMENTS as any)[constantName];
            if (hash) return hash;
        }
    }

    return 0;
}

/**
 * Parse subclass configuration from natural language
 */
export function parseSubclassConfig(text: string, guardianClass: 0 | 1 | 2, currentSubclassHash?: number): SubclassConfig | null {
    const lower = text.toLowerCase();
    const config: SubclassConfig = {};

    // Identify current subclass from hash
    const currentSubclassName = currentSubclassHash ? identifySubclassByHash(currentSubclassHash) : undefined;

    // PRIORITY 1: Detect Prismatic FIRST (highest priority)
    // Check for "prismatic" keyword anywhere in the text
    if (lower.includes('prismatic')) {
        config.subclassName = 'prismatic';
        const classKey = guardianClass === 0 ? 'titan' : guardianClass === 1 ? 'hunter' : 'warlock';
        const hashes = SUBCLASS_NAMES['prismatic'];
        if (hashes) {
            config.subclassHash = hashes[classKey];
        }
    } else {
        // PRIORITY 2: Detect subclass type - look for "X subclass" pattern
        // This prevents false positives like "solar grenade" triggering "solar subclass"
        const subclassPattern = /(void|solar|arc|stasis|strand|sentinel|nightstalker|voidwalker|sunbreaker|gunslinger|dawnblade|striker|arcstrider|stormcaller|behemoth|revenant|shadebinder|berserker|threadrunner|broodweaver)\s+subclass/i;
        const subclassMatch = text.match(subclassPattern);

        if (subclassMatch) {
            // Found explicit "X subclass" pattern
            const subclassName = subclassMatch[1].toLowerCase();
            config.subclassName = subclassName;
            config.element = subclassName;

            const classKey = guardianClass === 0 ? 'titan' : guardianClass === 1 ? 'hunter' : 'warlock';
            const hashes = SUBCLASS_NAMES[subclassName];
            if (hashes) {
                config.subclassHash = hashes[classKey];
            }
        } else {
            // PRIORITY 3: Check for standalone subclass class names (sentinel, nightstalker, etc.)
            const classSpecificNames = ['sentinel', 'nightstalker', 'voidwalker', 'sunbreaker', 'gunslinger', 'dawnblade',
                'striker', 'arcstrider', 'stormcaller', 'behemoth', 'revenant', 'shadebinder',
                'berserker', 'threadrunner', 'broodweaver'];

            for (const name of classSpecificNames) {
                if (lower.includes(name)) {
                    config.subclassName = name;
                    // Map class-specific names back to elements
                    const element = Object.entries(elementMap).find(([k]) => k === name)?.[1] || name;
                    config.element = element.toLowerCase();
                    const classKey = guardianClass === 0 ? 'titan' : guardianClass === 1 ? 'hunter' : 'warlock';
                    const hashes = SUBCLASS_NAMES[name];
                    if (hashes) {
                        config.subclassHash = hashes[classKey];
                    }
                    break;
                }
            }

            // PRIORITY 4: Check for element keywords ONLY with 'subclass' suffix
            // This prevents "equip solar" (item) from being confused with "solar subclass"
            if (!config.subclassName) {
                const elementKeywords = ['void', 'solar', 'arc', 'stasis', 'strand'];
                for (const element of elementKeywords) {
                    if (lower.includes(`${element} subclass`)) {
                        config.subclassName = element;
                        config.element = element;
                        const classKey = guardianClass === 0 ? 'titan' : guardianClass === 1 ? 'hunter' : 'warlock';
                        const hashes = SUBCLASS_NAMES[element];
                        if (hashes) {
                            config.subclassHash = hashes[classKey];
                        }
                        break;
                    }
                }
            }
        }
    }

    // Detect abilities (grenades, melees, etc.)
    // For Prismatic, don't infer subclass from ability types

    // Parse grenades FIRST with explicit pattern matching
    const grenadePattern = /\b(\w+)\s+grenade/i;
    const grenadeMatch = text.match(grenadePattern);
    if (grenadeMatch) {
        const grenadeName = grenadeMatch[1].toLowerCase();
        // Try to match grenade in ABILITY_KEYWORDS
        for (const [ability, info] of Object.entries(ABILITY_KEYWORDS)) {
            if (ability.includes(grenadeName) || info.keywords.some(k => k.includes(grenadeName + ' grenade'))) {
                config.grenade = ability;
                if (!config.element) config.element = info.element;
                break;
            }
        }
    }

    // Then parse other abilities (aspects, fragments)
    for (const [ability, info] of Object.entries(ABILITY_KEYWORDS)) {
        for (const keyword of info.keywords) {
            if (lower.includes(keyword)) {
                // Skip if already matched as grenade
                if (config.grenade === ability) {
                    continue;
                }

                // Categorize by ability type
                const abilityLower = ability.toLowerCase();

                // 1. Check for fragment prefixes (all element types)
                const fragmentPrefixes = ['echo of', 'ember of', 'spark of', 'whisper of', 'thread of', 'facet of'];
                const isFragment = fragmentPrefixes.some(prefix => abilityLower.includes(prefix));

                if (isFragment) {
                    if (!config.fragments) config.fragments = [];
                    if (!config.fragments.includes(ability)) {
                        config.fragments.push(ability);
                    }
                    if (!config.element) config.element = info.element;
                }
                // 2. Check for Jumps/Movement
                else if (info.keywords.some(k => k.includes('jump') || k.includes('glide') || k.includes('lift') || k.includes('blink'))) {
                    config.jump = ability;
                    if (!config.element) config.element = info.element;
                }
                // 3. Detect Melees (NEW: Smarter check)
                else if (abilityLower.includes('melee') || abilityLower.includes('strike') || abilityLower.includes('snap') ||
                    abilityLower.includes('throw') || abilityLower.includes('blow') || abilityLower.includes('spike')) {
                    config.melee = ability;
                    if (!config.element) config.element = info.element;
                }
                // 4. Detect Supers (NEW: Keywords or common 슈퍼 names)
                else if (abilityLower.includes('dawn') || abilityLower.includes('hammer') || abilityLower.includes('well') ||
                    abilityLower.includes('nova') || abilityLower.includes('fist') || abilityLower.includes('blade') ||
                    abilityLower.includes('storm')) {
                    config.super = ability;
                    if (!config.element) config.element = info.element;
                }
                // 5. Default to Aspect
                else {
                    const isGrenadeName = keyword.endsWith(' grenade');
                    if (!isGrenadeName) {
                        if (!config.aspects) config.aspects = [];
                        if (!config.aspects.includes(ability)) {
                            config.aspects.push(ability);
                        }
                        if (!config.element) config.element = info.element;
                    }
                }
                break;
            }
        }
    }

    // CRITICAL FIX: Convert ability names to hashes
    // Priority: Explicitly requested > Inferred from abilities > Current character context
    const resolutionContextName = config.subclassName || config.element || currentSubclassName;

    if (resolutionContextName) {
        if (config.grenade && typeof config.grenade === 'string') {
            const grenadeHash = resolveAbilityHash(config.grenade, resolutionContextName, guardianClass, 'grenade');
            if (grenadeHash) config.grenade = grenadeHash;
        }
        if (config.melee && typeof config.melee === 'string') {
            const meleeHash = resolveAbilityHash(config.melee, resolutionContextName, guardianClass, 'melee');
            if (meleeHash) config.melee = meleeHash;
        }
        if (config.classAbility && typeof config.classAbility === 'string') {
            const classAbilityHash = resolveAbilityHash(config.classAbility, resolutionContextName, guardianClass, 'classAbility');
            if (classAbilityHash) config.classAbility = classAbilityHash;
        }
        if (config.super && typeof config.super === 'string') {
            const superHash = resolveAbilityHash(config.super, resolutionContextName, guardianClass, 'super' as any);
            if (superHash) config.super = superHash.toString();
        }
        if (config.jump && typeof config.jump === 'string') {
            const jumpHash = resolveAbilityHash(config.jump, resolutionContextName, guardianClass, 'movement');
            if (jumpHash) config.jump = jumpHash;
        }

        // Convert aspect names to hashes (with Prismatic conversion)
        if (config.aspects && config.aspects.length > 0) {
            config.aspects = config.aspects.map(aspectName => {
                const hash = resolveAspectHash(aspectName, resolutionContextName, guardianClass);
                return hash ? hash.toString() : aspectName;
            });
        }
        // Convert fragment names to hashes
        if (config.fragments && config.fragments.length > 0) {
            config.fragments = config.fragments.map(fragmentName => {
                const hash = resolveFragmentHash(fragmentName, resolutionContextName);
                return hash ? hash.toString() : fragmentName;
            });
        }
    }

    // If no explicit subclass was mentioned but abilities were found
    // Don't auto-infer subclass - let the player specify it explicitly
    // This prevents "storm grenade" from auto-selecting Arc when they might want Prismatic

    return Object.keys(config).length > 0 ? config : null;
}

/**
 * Check if text contains subclass-related keywords
 */
export function containsSubclassKeywords(text: string): boolean {
    const lower = text.toLowerCase();

    // Check for Prismatic first (highest priority)
    if (lower.includes('prismatic')) return true;

    // Check for explicit "X subclass" pattern (Mandatory for generic elements)
    const subclassPattern = /(void|solar|arc|stasis|strand)\s+subclass/i;
    if (text.match(subclassPattern)) return true;

    // Check for class-specific subclass names (Allowed standalone as they are unique identities)
    const classSpecificNames = ['sentinel', 'nightstalker', 'voidwalker', 'sunbreaker', 'gunslinger', 'dawnblade',
        'striker', 'arcstrider', 'stormcaller', 'behemoth', 'revenant', 'shadebinder',
        'berserker', 'threadrunner', 'broodweaver'];
    for (const name of classSpecificNames) {
        if (lower.includes(name)) return true;
    }

    // Check for ability keywords (Specific context)
    const abilityIndicators = ['aspect', 'fragment', 'super', 'subclass'];
    for (const indicator of abilityIndicators) {
        if (lower.includes(indicator)) return true;
    }

    // Check for specific aspect/fragment names from ABILITY_KEYWORDS
    for (const info of Object.values(ABILITY_KEYWORDS)) {
        for (const keyword of info.keywords) {
            // Only count it if it's a specific enough string (e.g. > 4 chars) to avoid false positives with common words
            if (keyword.length > 5 && lower.includes(keyword)) {
                return true;
            }
        }
    }

    // Note: Generic terms like 'grenade' or 'melee' are NO LONGER direct subclass triggers
    // to avoid "Equip Solar Grenade" being treated as a full subclass change.

    return false;
}

export const subclassParserService = {
    parseSubclassConfig,
    identifySubclassByHash,
    containsSubclassKeywords,
    getAbilityElement: (name: string) => ABILITY_KEYWORDS[name.toLowerCase()]?.element,
    resolveAbilityHash,
    resolveAspectHash,
    resolveFragmentHash
};
