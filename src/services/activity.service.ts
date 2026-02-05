// Activity Service - Fetches and processes activity modifiers from Bungie API
import { debugLog, errorLog, warnLog } from '../utils/logger';
// Used by the Agent to recommend anti-champion loadouts

import { bungieApi } from './bungie/api-client';
import { manifestService } from './bungie/manifest.service';
import { profileService } from './bungie/profile.service';
import { useProfileStore } from '../store';

// Champion types we care about
export type ChampionType = 'barrier' | 'overload' | 'unstoppable';

export interface ActivityModifier {
    hash: number;
    name: string;
    description: string;
    icon?: string;
    breakerType?: number;
}

export interface ActivityInfo {
    name: string;
    description?: string;
    hash: number;
    modifiers: ActivityModifier[];
    champions: ChampionType[];
    pgcrImage?: string;
}

// Keywords for detecting Champion types in modifier descriptions
const CHAMPION_KEYWORDS: Record<ChampionType, string[]> = {
    barrier: ['barrier', 'shield-piercing', 'pierce'],
    overload: ['overload', 'disruption', 'disrupt'],
    unstoppable: ['unstoppable', 'stagger'],
};

// Common activity name aliases for fuzzy matching
const ACTIVITY_ALIASES: Record<string, string[]> = {
    'nightfall': ['nightfall', 'nf', 'grandmaster', 'gm'],
    'trials': ['trials of osiris', 'trials'],
    'gambit': ['gambit'],
    'crucible': ['crucible', 'pvp', 'control', 'clash', 'rumble', 'elimination', 'survival', 'iron banner', 'ib'],
    'raid': ['raid'],
    'dungeon': ['dungeon'],
    'lost sector': ['lost sector', 'legend lost sector', 'master lost sector'],
    'wellspring': ['wellspring', 'wellspring: attack', 'wellspring: defend'],
    'dares': ['dares of eternity', 'dares'],
    'nightmare hunt': ['nightmare hunt'],
    'empire hunt': ['empire hunt'],
    'battleground': ['battleground'],
    'expedition': ['expedition'],
    'exodus crash': ['exodus', 'fallen sabre'],
    'the arms dealer': ['arms dealer', 'cabal strike'],
    'the disgraced': ['disgraced', 'navota'],
    'the glassway': ['glassway', 'vex strike'],
    'the lightblade': ['lightblade', 'alak-hul'],
    'the corrupted': ['corrupted', 'sedia'],
    'warden of nothing': ['warden', 'prison of elders'],
    'birthplace of the vile': ['birthplace', 'vile'],
    'lake of shadows': ['lake', 'shadows'],
    'the inverted spire': ['inverted', 'inverted spire'],
    'savathuns song': ['song', 'savathun song'],
    'the devils lair': ['devils lair', 'sepiks'],
    'fallen saber': ['saber', 'fallen saber'],
    'creation': ['creation', 'vex creation'],
    'k1 logistics': ['k1 logistics', 'logistics'],
    'k1 communion': ['k1 communion', 'communion'],
    'k1 crew quarters': ['k1 crew', 'crew quarters'],
    'k1 revelation': ['k1 revelation', 'revelation'],
    'concealed void': ['concealed void', 'void'],
    'bunker e15': ['bunker e15', 'bunker'],
    'perdition': ['perdition'],
    'sepulcher': ['sepulcher'],
    'extraction': ['extraction'],
    'veles labyrinth': ['veles', 'labyrinth'],
    'pinnacle': ['pinnacle', 'pinnacle activity'],
    'arena': ['arena', 'arena ops', 'arena activity'],
    'onslaught': ['onslaught', 'onslaught: salvation'],
};

// Bungie API Milestone Response structure
interface MilestoneResponse {
    [milestoneHash: string]: {
        milestoneHash: number;
        activities?: {
            activityHash: number;
            challengeObjectiveHashes?: number[];
            modifierHashes?: number[];
            booleanActivityOptions?: Record<string, boolean>;
        }[];
        availableQuests?: {
            questItemHash: number;
        }[];
        startDate?: string;
        endDate?: string;
    };
}

// Character activity from profile (component 204)
interface CharacterActivity {
    activityHash: number;
    modifierHashes?: number[];
    difficultyTier?: number;
    isVisible?: boolean;
}

class ActivityService {
    /**
     * Fetch public milestones (weekly activities like Nightfall, Raids, etc.)
     */
    async getPublicMilestones(): Promise<MilestoneResponse> {
        try {
            const response = await bungieApi.get<MilestoneResponse>(
                '/Destiny2/Milestones/',
                false // No auth required for public milestones
            );
            debugLog('ActivityService', 'Fetched milestones:', Object.keys(response).length, 'milestones');
            return response;
        } catch (error) {
            errorLog('ActivityService', 'Failed to fetch milestones:', error);
            return {};
        }
    }

    /**
     * Get available character activities from profile (Portal activities)
     * Requires component 204 in profile fetch
     */
    async getCharacterActivities(): Promise<CharacterActivity[]> {
        try {
            const store = useProfileStore.getState();
            const characterId = store.selectedCharacterId;

            if (!characterId) {
                debugLog('ActivityService', 'No selected character');
                return [];
            }

            // Get fresh profile with character activities
            const profile = await profileService.getProfile();
            if (!profile?.characterActivities?.data?.[characterId]?.availableActivities) {
                debugLog('ActivityService', 'No available activities found in profile');
                return [];
            }

            const activities = profile.characterActivities.data[characterId].availableActivities || [];
            debugLog('ActivityService', 'Found', activities.length, 'character activities');
            return activities;
        } catch (error) {
            errorLog('ActivityService', 'Failed to get character activities:', error);
            return [];
        }
    }

    /**
     * Find an activity by name/alias query
     */
    async findActivity(query: string): Promise<ActivityInfo | null> {
        const normalizedQuery = query.toLowerCase().trim();
        const milestones = await this.getPublicMilestones();

        debugLog('ActivityService', 'Searching for:', normalizedQuery);

        // First, check if it's a Nightfall query
        const isNightfallQuery = ACTIVITY_ALIASES['nightfall'].some(alias =>
            normalizedQuery.includes(alias)
        );

        let missingDefinitions = 0;

        for (const [milestoneHash, milestone] of Object.entries(milestones)) {
            if (!milestone.activities) continue;

            // Try to get milestone definition for name
            const milestoneDef = manifestService.getFullDefinition(parseInt(milestoneHash));
            const milestoneName = milestoneDef?.name || '';

            debugLog('Activity', `Checking milestone: ${milestoneName || milestoneHash} (${milestone.activities.length} activities)`);

            for (const activity of milestone.activities) {
                // Use getActivity which returns pgcrImage
                const activityDef = manifestService.getActivity(activity.activityHash);

                // If no activity definition, use milestone name as fallback
                let activityName = '';
                let activityDesc = '';

                if (activityDef) {
                    activityName = (activityDef.name || '').toLowerCase();
                    activityDesc = (activityDef.description || '').toLowerCase();
                    debugLog('Activity', `${activityDef.name} - ${activity.modifierHashes?.length || 0} modifiers`);
                } else {
                    missingDefinitions++;
                    // Use milestone name as fallback
                    activityName = milestoneName.toLowerCase();
                    debugLog('Activity', `No definition for activity hash ${activity.activityHash}, using milestone name: ${milestoneName}`);
                }

                // Check if this is a Nightfall activity
                const isNightfall = activityName.includes('nightfall') ||
                    activityDesc.includes('nightfall') ||
                    milestoneName.toLowerCase().includes('nightfall');

                // If user asked for nightfall and this is a nightfall, or name matches
                const nameMatches = this.matchesActivity(normalizedQuery, activityName) ||
                    this.matchesActivity(normalizedQuery, milestoneName.toLowerCase());

                if ((isNightfallQuery && isNightfall) || nameMatches) {
                    debugLog('Activity', `✓ Match found: ${activityDef?.name || milestoneName}`);
                    const modifiers = this.getModifiersForActivity(activity.modifierHashes || []);
                    const champions = this.parseChampionTypes(modifiers);

                    return {
                        name: activityDef?.name || milestoneName || 'Unknown Activity',
                        description: activityDef?.description,
                        hash: activity.activityHash,
                        modifiers,
                        champions,
                        pgcrImage: activityDef?.pgcrImage
                    };
                }
            }
        }

        // Log if we're missing many definitions - suggests manifest needs refresh
        if (missingDefinitions > 5) {
            warnLog('Activity', `⚠️ Missing ${missingDefinitions} activity definitions. Manifest may need update.`);
        }

        // If not found in milestones, search character activities (Portal activities)
        // Champions only appear in Master, Grandmaster, Ultimate versions
        debugLog('Activity', 'Searching character activities (Portal)...');
        const characterActivities = await this.getCharacterActivities();

        // First pass: find all activities that match the query
        const matchingActivities: Array<{
            activity: CharacterActivity;
            name: string;
            description?: string;
            isMasterPlus: boolean;
            pgcrImage?: string;
        }> = [];

        for (const activity of characterActivities) {
            const activityDef = manifestService.getActivity(activity.activityHash);
            if (!activityDef?.name) continue;

            const activityName = activityDef.name;
            const lowerName = activityName.toLowerCase();

            if (this.matchesActivity(normalizedQuery, lowerName)) {
                // Check if this is a Master, Grandmaster, or Ultimate version
                const isMasterPlus = lowerName.includes('master') ||
                    lowerName.includes('grandmaster') ||
                    lowerName.includes('ultimate') ||
                    lowerName.includes('legend') ||
                    (activity.modifierHashes?.length || 0) >= 5; // Master+ typically has 5+ modifiers

                matchingActivities.push({
                    activity,
                    name: activityName,
                    description: activityDef.description,
                    isMasterPlus,
                    pgcrImage: activityDef.pgcrImage
                });
                debugLog('Activity', `Portal match: ${activityName} ${isMasterPlus ? '(Master+)' : '(Normal)'} - ${activity.modifierHashes?.length || 0} modifiers`);
            }
        }

        if (matchingActivities.length > 0) {
            // Prefer Master+ version if available
            const sortedMatches = matchingActivities.sort((a, b) => {
                // Master+ first
                if (a.isMasterPlus && !b.isMasterPlus) return -1;
                if (!a.isMasterPlus && b.isMasterPlus) return 1;
                // Then by modifier count (more = harder)
                return (b.activity.modifierHashes?.length || 0) - (a.activity.modifierHashes?.length || 0);
            });

            const best = sortedMatches[0];
            let modifiers = this.getModifiersForActivity(best.activity.modifierHashes || []);
            let champions = this.parseChampionTypes(modifiers);
            let pgcrImage = best.pgcrImage;
            let difficultyNote = '';

            // Fallback: If no champions found in the best match, search manifest for Master/Legend version
            if (champions.length === 0 && !best.isMasterPlus) {
                debugLog('Activity', 'No champions in live activity, searching manifest for Master/Legend version...');

                // Clean the name for search (remove generic difficulty tags and suffixes)
                let baseName = best.name
                    .replace(/\(Normal\)/g, '')
                    .replace(/\(Matchmade\)/g, '')
                    .replace(/\(Customize\)/g, '')
                    .replace(/\(Score:.*?\)/g, '')
                    .replace(/:\s*(Matchmade|Customize|Normal|Legend|Master|Grandmaster|Basic|Elite|Pinnacle|Playlist|Arena)/gi, '')
                    .replace(/(Normal|Legend|Master|Grandmaster|Basic|Elite|Pinnacle|Playlist|Arena)\s*:/gi, '')
                    .trim();

                // If it's a known activity with a sub-type (e.g. Battleground: Delve), keep that, 
                // but strip further if it's a specific instance.
                const parts = baseName.split(':');
                if (parts.length > 2) {
                    baseName = parts.slice(0, 2).join(':');
                }

                // Audit note: Many Portal activities are actually "Battleground: Name" or "Solo Ops: Name".
                const baseNames = [baseName];
                if (!baseName.toLowerCase().includes('battleground')) {
                    baseNames.push(`Battleground: ${baseName}`);
                }
                if (!baseName.toLowerCase().includes('solo ops')) {
                    baseNames.push(`Solo Ops: ${baseName}`);
                }
                // Specifically for Echoes activities which might be named differently
                if (!baseName.toLowerCase().includes('echoes')) {
                    baseNames.push(`Battleground: Echoes: ${baseName}`);
                }

                const manifestMatches: any[] = [];
                for (const bn of baseNames) {
                    const matches = manifestService.searchActivities(bn, 20);
                    manifestMatches.push(...matches);
                }
                debugLog('Activity', `Found ${manifestMatches.length} manifest matches`);

                // Find one with champions (prioritize ones with "Master" or "Grandmaster" in name if multiple have champions)
                let bestManifestMatch: any = null;
                let maxChampions = 0;
                const cleanQuery = this.normalizeString(query);

                for (const manifestActivity of manifestMatches) {
                    if (manifestActivity.modifiers && manifestActivity.modifiers.length > 0) {
                        const manifestModifierHashes = manifestActivity.modifiers.map((m: any) => m.activityModifierHash);
                        const manifestModifiers = this.getModifiersForActivity(manifestModifierHashes);
                        const manifestChampions = this.parseChampionTypes(manifestModifiers);
                        const matchName = manifestActivity.displayProperties?.name || '';

                        // DEBUG: Log all modifiers for suspiciously large modifier lists (like Battlegrounds)
                        if (manifestModifierHashes.length > 5 && (matchName.includes('Battleground') || matchName.includes(baseName))) {
                            debugLog('Activity', `Modifiers for ${matchName}: ${manifestModifiers.map(m => m.name).join(', ')}`);
                        }

                        if (manifestChampions.length > 0) {
                            const isMasterOrGM = matchName.includes('Master') || matchName.includes('Grandmaster') || matchName.includes('Legend');

                            // Scoring System
                            let score = 0;

                            // Check if activity name contains specific query terms found in query
                            const matchNameLower = matchName.toLowerCase();
                            const queryWords = cleanQuery.split(/\s+/).filter(w => w.length > 2 && !['champions', 'battleground', 'standard', 'master', 'legend', 'solo', 'ops'].includes(w));

                            // STRICT MATCHING: Query words must match word boundaries in the target name
                            // This prevents "Creation" matching "Recreational"
                            const matchesAllQueryWords = queryWords.every(qw => {
                                // We accept if it starts with the word (e.g. "Battle" in "Battleground")
                                // or if it's a distinct word in the string.
                                return matchNameLower.split(/\s+/).some((nw: string) => nw.startsWith(qw));
                            });

                            if (!matchesAllQueryWords && queryWords.length > 0) continue;

                            // Essential Match Check: If strictly matching, we rely on the strict check above.

                            // Score based on word matches (all query words matched = high score)
                            score += queryWords.length * 50;
                            if (isMasterOrGM) score += 500; // MUCH Higher priority for Master/GM version
                            if (matchName.includes('Ultimate')) score += 600; // Highest priority for Ultimate
                            if (matchName.includes('Legend')) score += 150; // Preference for Legend if Master not found
                            if (manifestChampions.length >= 2) score += 100; // Preference for activities WITH champions

                            const matchesAll = queryWords.every(qw => matchNameLower.includes(qw));
                            if (matchesAll && queryWords.length > 0) score += 100;

                            debugLog('Activity', `Candidate: ${matchName} (Score: ${score}) | AllWords: ${matchesAllQueryWords} | Champions: ${manifestChampions.join(', ')}`);

                            if (!bestManifestMatch || score > maxChampions) {
                                bestManifestMatch = {
                                    activity: manifestActivity,
                                    champions: manifestChampions,
                                    modifiers: manifestModifiers,
                                    isMasterOrGM,
                                    pgcrImage: manifestActivity.pgcrImage
                                };
                                maxChampions = score;
                            }
                        } else {
                            debugLog('Activity', `Skipped ${matchName}: No champions from ${manifestModifiers.length} modifiers`);
                            if (manifestModifiers.length > 0 && matchName.includes('Cosmodrome')) {
                                debugLog('Activity', `   Modifiers: ${manifestModifiers.map((m: any) => m.name).join(', ')}`);
                            }
                        }
                    } else {
                        debugLog('Activity', `Skipped ${manifestActivity.displayProperties?.name}: No modifiers`);
                    }
                }

                if (bestManifestMatch) {
                    debugLog('Activity', `✓ Found Master version: ${bestManifestMatch.activity.displayProperties?.name}`);
                    champions = bestManifestMatch.champions;
                    modifiers = bestManifestMatch.modifiers;
                    pgcrImage = bestManifestMatch.pgcrImage;
                    difficultyNote = ' (Master+)';
                } else {
                    debugLog('Activity', 'No Master version with champions found in manifest');
                }
            }

            // If still no champions, show the "Champions in Master+" note
            if (champions.length === 0) {
                difficultyNote += ' (Note: Champions typically appear in Master/Grandmaster difficulty)';
            }

            return {
                name: best.name + difficultyNote,
                description: best.description,
                hash: best.activity.activityHash,
                modifiers,
                champions,
                pgcrImage
            };
        }

        debugLog('Activity', `No matching activity in live data for: ${query}`);

        // ---------------------------------------------------------
        // GLOBAL MANIFEST FALLBACK
        // If the activity isn't in rotation or active, search the manifest directly
        // ---------------------------------------------------------

        // Sanitize query for manifest search - remove "what should i use for"
        // Also remove quotes and extra punctuation
        let cleanQuery = query
            .toLowerCase()
            .replace(/['"]/g, '') // Remove quotes first
            .replace(/what\s+should\s+i\s+(use|bring)\s+(for|in)/g, '')
            .replace(/what\s+champions\s+are\s+in/g, '')
            .trim();

        // Use the normalizer to handle accents
        cleanQuery = this.normalizeString(cleanQuery);

        if (cleanQuery.length < 3) return null;

        debugLog('Activity', `Attempting global manifest fallback for: ${cleanQuery}`);
        // Use normalized search in manifest
        const manifestMatches = manifestService.searchActivities(cleanQuery, 20);

        if (manifestMatches.length > 0) {
            debugLog('Activity', `Found ${manifestMatches.length} matches in global fallback`);

            // Try to find one with champions, prioritizing Master/GM
            let bestManifestMatch: any = null;
            let maxChampions = 0;

            for (const manifestActivity of manifestMatches) {
                if (manifestActivity.modifiers && manifestActivity.modifiers.length > 0) {
                    const manifestModifierHashes = manifestActivity.modifiers.map((m: any) => m.activityModifierHash);
                    const manifestModifiers = this.getModifiersForActivity(manifestModifierHashes);
                    const manifestChampions = this.parseChampionTypes(manifestModifiers);
                    const matchName = manifestActivity.displayProperties?.name || '';

                    if (manifestChampions.length > 0) {
                        const isMasterOrGM = matchName.includes('Master') || matchName.includes('Grandmaster');

                        // Scoring System for Best Match
                        // 1. Base Score = Champion Count (We want maximum info)
                        let score = manifestChampions.length;

                        // 2. Master/GM Bonus (Usually contains the most complete champion data)
                        if (isMasterOrGM) score += 2;

                        const matchNameLower = matchName.toLowerCase();
                        const queryWords = cleanQuery.split(/\s+/).filter(w => w.length > 2 && !['champions', 'battleground', 'standard', 'master', 'legend'].includes(w));
                        const matchingWords = queryWords.filter(qw => matchNameLower.includes(qw));

                        // Essential Match Check
                        if (queryWords.length > 0 && matchingWords.length === 0) {
                            score -= 1000;
                        }

                        score += matchingWords.length * 50;
                        if (isMasterOrGM) score += 20; // Lower than specific word match
                        if (matchNameLower.includes('playlist') && !cleanQuery.includes('playlist')) {
                            score -= 30; // Heavy penalty for generic playlist
                        }

                        // DEBUG: Log candidates
                        debugLog('Activity', `Candidate: ${matchName} (Score: ${score}) | Words: ${matchingWords.length}/${queryWords.length} | Champions: ${manifestChampions.join(', ')}`);

                        // Update Best Match if Score is Higher
                        if (!bestManifestMatch || score > maxChampions) {
                            bestManifestMatch = {
                                activity: manifestActivity,
                                champions: manifestChampions,
                                modifiers: manifestModifiers,
                                isMasterOrGM
                            };
                            maxChampions = score; // Use 'maxChampions' variable to store best SCORE now
                        }
                    } else {
                        debugLog('Activity', `Skipped ${matchName}: No champions from ${manifestModifiers.length} modifiers`);
                    }
                } else {
                    debugLog('Activity', `Skipped ${manifestActivity.displayProperties?.name}: No modifiers`);
                }
            }

            // If we found a champion-containing version, return it
            if (bestManifestMatch) {
                debugLog('Activity', `✓ Global fallback success: ${bestManifestMatch.activity.displayProperties?.name}`);
                return {
                    name: bestManifestMatch.activity.displayProperties?.name + ' (Manifest Lookup)',
                    description: bestManifestMatch.activity.displayProperties?.description,
                    hash: bestManifestMatch.activity.hash,
                    modifiers: bestManifestMatch.modifiers,
                    champions: bestManifestMatch.champions,
                    pgcrImage: bestManifestMatch.activity.pgcrImage
                };
            }
        }

        return null;
    }

    /**
     * Helper to normalize strings: lowercase, strip accents, remove special chars with spaces first
     */
    private normalizeString(str: string): string {
        return str
            .toLowerCase()
            .normalize("NFD") // Decompose accents
            .replace(/[\u0300-\u036f]/g, "") // Remove accent marks
            .replace(/['"]/g, "") // Remove quotes globally
            // Replace other punctuation/special chars with SPACE to avoid merging words
            // e.g. "battleground:core" -> "battleground core"
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ') // Collapse multiple spaces
            .trim();
    }

    /**
     * Check if a query matches an activity name using aliases
     * Stricter matching to avoid false positives
     */
    private matchesActivity(query: string, activityName: string): boolean {
        if (!query || !activityName) return false;

        // Normalize both strings
        const normalizedQuery = this.normalizeString(query);
        const normalizedName = this.normalizeString(activityName);

        // Skip very short queries (less than 3 chars) - too ambiguous
        if (normalizedQuery.length < 3) return false;

        // Exact match
        if (normalizedName === normalizedQuery) return true;

        // Check if query is contained completely in name (e.g. "exodus crash" in "nightfall: exodus crash")
        if (normalizedName.includes(normalizedQuery)) return true;

        // Query words that must match activity name
        const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length >= 3);
        const nameWords = normalizedName.split(/\s+/).filter(w => w.length >= 2);

        // Skip common words that shouldn't trigger matches
        const ignoredWords = ['the', 'what', 'are', 'champions', 'champion', 'campion', 'campions', 'in', 'for', 'standard', 'master', 'legend', 'normal', 'activity', 'should', 'use', 'bring', 'kind', 'of', 'there', 'type', 'types'];
        const significantQueryWords = queryWords.filter(w => !ignoredWords.includes(w));

        if (significantQueryWords.length === 0) return false;

        // Check if ALL significant query words appear in the activity name
        const allMatch = significantQueryWords.every(qw =>
            nameWords.some(nw => {
                // Exact word match
                if (nw === qw) return true;
                // Name word includes query word (e.g. "Battlegrounds" includes "Battle")
                // We DO NOT allow query word to include name word
                // CRUCIAL: Penalize/Filter if the match is inside a much longer word (e.g. "Creation" in "Recreational")
                if (nw.includes(qw)) {
                    // If it's an exact word match, it's perfect
                    if (nw === qw) return true;
                    // If it's a partial match, ensure it's not a fragmented match in a non-related word
                    // e.g. "Creation" in "Recreational" is bad. 
                    // "Battle" in "Battlegrounds" is good.
                    // "Solo" in "Solo Ops" is good.
                    // Rule: qw must be at a word boundary in nw, or occupy > 70% of the word
                    const startsWith = nw.startsWith(qw);
                    const endsWith = nw.endsWith(qw);
                    const lengthRatio = qw.length / nw.length;
                    return (startsWith || endsWith) && (lengthRatio > 0.6 || nw.length <= 12);
                }
                return false;
            })
        );

        if (allMatch) {
            return true;
        }

        return false;
    }

    /**
     * Get modifier definitions from the manifest
     */
    private getModifiersForActivity(modifierHashes: number[]): ActivityModifier[] {
        const modifiers: ActivityModifier[] = [];

        for (const hash of modifierHashes) {
            // Use getFullDefinition for proper type handling
            const modDef = manifestService.getFullDefinition(hash);
            if (modDef?.name) {
                modifiers.push({
                    hash,
                    name: modDef.name || 'Unknown Modifier',
                    description: modDef.description || '',
                    icon: modDef.icon,
                });
            }
        }

        return modifiers;
    }

    /**
     * Parse modifier descriptions to identify Champion types
     */
    parseChampionTypes(modifiers: ActivityModifier[]): ChampionType[] {
        const champions: Set<ChampionType> = new Set();

        for (const mod of modifiers) {
            const searchText = `${mod.name} ${mod.description}`.toLowerCase();

            // 1. Check breakerType (Direct Manifest Metadata) - Most reliable
            if (mod.breakerType) {
                if (mod.breakerType === 1) champions.add('barrier');
                else if (mod.breakerType === 2) champions.add('overload');
                else if (mod.breakerType === 3) champions.add('unstoppable');
            }

            // 2. Check text keywords (Fallback for older activities or custom modifiers)
            // Use regex for word boundaries and handle bracketed terms like [Shield-Piercing]
            for (const [championType, keywords] of Object.entries(CHAMPION_KEYWORDS)) {
                for (const keyword of keywords) {
                    const regex = new RegExp(`[\\s\\[]${keyword}[\\s\\]]`, 'i');
                    if (regex.test(searchText) || searchText.includes(keyword)) {
                        champions.add(championType as ChampionType);
                        break;
                    }
                }
            }
        }

        return Array.from(champions);
    }

    /**
     * Check if the character is currently in a safe space (Orbit or Social Space)
     * where subclass abilities/aspects/fragments can be changed.
     */
    async isInSafeSpace(): Promise<boolean> {
        try {
            const store = useProfileStore.getState();
            const characterId = store.selectedCharacterId;

            if (!characterId) return true; // Default to true to avoid blocking if no char selected

            // Get profile with component 204
            const profile = await profileService.getProfile();
            const currentActivityHash = profile?.characterActivities?.data?.[characterId]?.currentActivityHash || 0;

            debugLog('Activity', `Current activity hash: ${currentActivityHash}`);

            // 0 is Orbit
            if (currentActivityHash === 0) return true;

            // Check if it's a social space in the manifest
            // Access manifestData directly for raw properties
            const activities = (manifestService as any).manifestData.DestinyActivityDefinition as Record<string, any> | undefined;
            const activityDef = activities?.[String(currentActivityHash)];

            if (!activityDef) return false;

            // Social Space activity type hash
            const socialActivityTypeHash = 3893311566;

            // Check activity type or if it's a known social space
            const isSocial = activityDef.activityTypeHash === socialActivityTypeHash ||
                activityDef.displayProperties?.name?.toLowerCase().includes('tower') ||
                activityDef.displayProperties?.name?.toLowerCase().includes('h.e.l.m.') ||
                activityDef.displayProperties?.name?.toLowerCase().includes('farm');

            return isSocial;
        } catch (error) {
            errorLog('Activity', 'Failed to check safe space:', error);
            return true; // Fallback to true to avoid false-positive warnings
        }
    }

    /**
     * Get the current Nightfall activity info
     */
    async getCurrentNightfall(): Promise<ActivityInfo | null> {
        return this.findActivity('nightfall');
    }

    /**
     * Format Champion types for display
     */
    formatChampionTypes(champions: ChampionType[]): string {
        if (champions.length === 0) return 'No Champions';

        const icons: Record<ChampionType, string> = {
            barrier: '[Barrier]',
            overload: '[Overload]',
            unstoppable: '[Unstoppable]',
        };

        return champions
            .map(c => `${icons[c]} ${c.charAt(0).toUpperCase() + c.slice(1)}`)
            .join(', ');
    }
}

export const activityService = new ActivityService();
