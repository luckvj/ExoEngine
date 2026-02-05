// Artifact Service - Processes seasonal artifact data for anti-champion mods
// Used by the Agent to recommend weapons based on unlocked artifact perks

import { useProfileStore } from '../store';
import { manifestService } from './bungie/manifest.service';
import type { ChampionType } from './activity.service';
import { debugLog } from '../utils/logger';

export interface ArtifactPerk {
    hash: number;
    name: string;
    description: string;
    icon?: string;
    isActive: boolean;
}

export interface AntiChampionMod {
    hash: number;
    name: string;
    championType: ChampionType;
    weaponTypes: string[];
    icon?: string;
}

// Keywords for detecting anti-champion mods and weapon types
const ANTI_CHAMPION_PATTERNS: Record<ChampionType, RegExp> = {
    barrier: /anti[- ]?barrier|pierce[s]? barrier/i,
    overload: /overload|disrupts? overload/i,
    unstoppable: /unstoppable|stagger[s]? unstoppable/i,
};

// Weapon type keywords to extract from mod descriptions
const WEAPON_TYPE_KEYWORDS = [
    'auto rifle', 'auto rifles',
    'scout rifle', 'scout rifles',
    'pulse rifle', 'pulse rifles',
    'hand cannon', 'hand cannons',
    'submachine gun', 'submachine guns', 'smg', 'smgs',
    'sidearm', 'sidearms',
    'bow', 'bows',
    'sniper rifle', 'sniper rifles', 'sniper',
    'shotgun', 'shotguns',
    'fusion rifle', 'fusion rifles',
    'linear fusion rifle', 'linear fusion rifles', 'linear fusion', 'lfr',
    'trace rifle', 'trace rifles',
    'grenade launcher', 'grenade launchers', 'gl',
    'rocket launcher', 'rocket launchers', 'rockets',
    'sword', 'swords',
    'machine gun', 'machine guns', 'lmg',
    'glaive', 'glaives',
    // Ability-based anti-champion sources
    'kinetic', 'melee', 'finisher', 'grenade',
];

// Normalize weapon types to canonical names (include BOTH singular and plural)
const WEAPON_TYPE_NORMALIZE: Record<string, string> = {
    // Singular forms
    'auto rifle': 'Auto Rifle',
    'scout rifle': 'Scout Rifle',
    'pulse rifle': 'Pulse Rifle',
    'hand cannon': 'Hand Cannon',
    'submachine gun': 'SMG',
    'sidearm': 'Sidearm',
    'bow': 'Bow',
    'sniper rifle': 'Sniper Rifle',
    'sniper': 'Sniper Rifle',
    'shotgun': 'Shotgun',
    'fusion rifle': 'Fusion Rifle',
    'linear fusion rifle': 'Linear Fusion Rifle',
    'trace rifle': 'Trace Rifle',
    'grenade launcher': 'Grenade Launcher',
    'rocket launcher': 'Rocket Launcher',
    'sword': 'Sword',
    'machine gun': 'Machine Gun',
    'glaive': 'Glaive',
    // Plural forms
    'auto rifles': 'Auto Rifle',
    'scout rifles': 'Scout Rifle',
    'pulse rifles': 'Pulse Rifle',
    'hand cannons': 'Hand Cannon',
    'submachine guns': 'SMG',
    'smg': 'SMG',
    'smgs': 'SMG',
    'sidearms': 'Sidearm',
    'bows': 'Bow',
    'sniper rifles': 'Sniper Rifle',
    'shotguns': 'Shotgun',
    'fusion rifles': 'Fusion Rifle',
    'linear fusion rifles': 'Linear Fusion Rifle',
    'linear fusion': 'Linear Fusion Rifle',
    'lfr': 'Linear Fusion Rifle',
    'trace rifles': 'Trace Rifle',
    'grenade launchers': 'Grenade Launcher',
    'gl': 'Grenade Launcher',
    'rocket launchers': 'Rocket Launcher',
    'rockets': 'Rocket Launcher',
    'swords': 'Sword',
    'machine guns': 'Machine Gun',
    'lmg': 'Machine Gun',
    'glaives': 'Glaive',
    // Ability-based
    'kinetic': 'Kinetic Weapons/Abilities',
    'melee': 'Melee Abilities',
    'finisher': 'Finishers',
    'grenade': 'Grenade Abilities',
};

class ArtifactService {
    /**
     * Get all active artifact perks for the current character
     */
    getActiveArtifactPerks(): ArtifactPerk[] {
        const store = useProfileStore.getState();
        const selectedCharacterId = store.selectedCharacterId;
        const progressions = store.characterProgressions;

        if (!selectedCharacterId || !progressions?.[selectedCharacterId]) {
            debugLog('Artifact', 'No selected character or progressions found');
            return [];
        }

        const seasonalArtifact = progressions[selectedCharacterId]?.seasonalArtifact;
        if (!seasonalArtifact?.tiers) {
            debugLog('Artifact', 'No seasonal artifact data found');
            return [];
        }

        const activePerks: ArtifactPerk[] = [];

        for (const tier of seasonalArtifact.tiers) {
            for (const item of tier.items) {
                if (item.isActive) {
                    // Use getFullDefinition for proper type handling
                    const perkDef = manifestService.getFullDefinition(item.itemHash);
                    if (perkDef?.name) {
                        activePerks.push({
                            hash: item.itemHash,
                            name: perkDef.name || 'Unknown Perk',
                            description: perkDef.description || '',
                            icon: perkDef.icon,
                            isActive: true,
                        });
                    }
                }
            }
        }

        return activePerks;
    }

    /**
     * Get anti-champion mods from active artifact perks
     */
    getAntiChampionMods(): AntiChampionMod[] {
        const activePerks = this.getActiveArtifactPerks();
        const antiChampionMods: AntiChampionMod[] = [];

        for (const perk of activePerks) {
            const searchText = `${perk.name} ${perk.description}`;

            // Check which champion type this mod targets
            for (const [championType, pattern] of Object.entries(ANTI_CHAMPION_PATTERNS)) {
                if (pattern.test(searchText)) {
                    const weaponTypes = this.extractWeaponTypes(searchText);

                    antiChampionMods.push({
                        hash: perk.hash,
                        name: perk.name,
                        championType: championType as ChampionType,
                        weaponTypes,
                        icon: perk.icon,
                    });
                    break; // A mod typically only targets one champion type
                }
            }
        }

        return antiChampionMods;
    }

    /**
     * Extract weapon types mentioned in a mod description
     */
    private extractWeaponTypes(text: string): string[] {
        const lowerText = text.toLowerCase();
        const foundTypes: Set<string> = new Set();

        for (const keyword of WEAPON_TYPE_KEYWORDS) {
            if (lowerText.includes(keyword)) {
                const normalized = WEAPON_TYPE_NORMALIZE[keyword] ||
                    keyword.charAt(0).toUpperCase() + keyword.slice(1);
                foundTypes.add(normalized);
            }
        }

        return Array.from(foundTypes);
    }

    /**
     * Get recommended weapon types for specific champion types
     */
    getRecommendedWeapons(championTypes: ChampionType[]): Map<ChampionType, string[]> {
        const antiChampionMods = this.getAntiChampionMods();
        const recommendations = new Map<ChampionType, string[]>();

        for (const championType of championTypes) {
            const relevantMods = antiChampionMods.filter(mod => mod.championType === championType);
            const weaponTypes = relevantMods.flatMap(mod => mod.weaponTypes);

            // Deduplicate
            const uniqueWeapons = Array.from(new Set(weaponTypes));
            recommendations.set(championType, uniqueWeapons);
        }

        return recommendations;
    }

    /**
     * Format anti-champion mods for display
     */
    formatAntiChampionMods(mods: AntiChampionMod[]): string {
        if (mods.length === 0) {
            return 'No anti-champion mods unlocked in your artifact.';
        }

        return mods
            .map(mod => {
                const weapons = mod.weaponTypes.length > 0
                    ? mod.weaponTypes.join(', ')
                    : 'Unknown weapons';
                return `${mod.championType.charAt(0).toUpperCase() + mod.championType.slice(1)}: ${mod.name} (${weapons})`;
            })
            .join('\n');
    }

    /**
     * Get champion icon URLs for display
     */
    getChampionIcons(): Record<ChampionType, string | undefined> {
        return {
            barrier: manifestService.getChampionIcon('barrier'),
            overload: manifestService.getChampionIcon('overload'),
            unstoppable: manifestService.getChampionIcon('unstoppable'),
        };
    }

    /**
     * Format mods with icon URLs included in the response
     */
    formatAntiChampionModsWithIcons(mods: AntiChampionMod[]): Array<{
        championType: ChampionType;
        name: string;
        weapons: string;
        icon?: string;
    }> {
        const icons = this.getChampionIcons();

        return mods.map(mod => ({
            championType: mod.championType,
            name: mod.name,
            weapons: mod.weaponTypes.length > 0 ? mod.weaponTypes.join(', ') : 'Unknown',
            icon: icons[mod.championType]
        }));
    }

    /**
     * Check if player has a mod to counter a specific champion type
     */
    hasModFor(championType: ChampionType): boolean {
        const mods = this.getAntiChampionMods();
        return mods.some(mod => mod.championType === championType);
    }

    /**
     * Get missing champion coverage
     */
    getMissingCoverage(requiredChampions: ChampionType[]): ChampionType[] {
        return requiredChampions.filter(c => !this.hasModFor(c));
    }
}

export const artifactService = new ArtifactService();
