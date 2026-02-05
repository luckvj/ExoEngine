/**
 * Meta Build Database
 * Curated collection of proven builds from the community (Renegades Edition)
 */

export interface MetaBuild {
    id: string;
    name: string;
    class: 'Warlock' | 'Hunter' | 'Titan';
    subclass: string;
    element: 'Void' | 'Solar' | 'Arc' | 'Stasis' | 'Strand' | 'Prismatic';
    tier: 'S' | 'A' | 'B';
    season: string;
    activities: string[]; // Where this build excels
    exoticWeapon?: string;
    exoticArmor: string;
    aspects: string[];
    fragments: string[];
    stats: {
        priority: string[]; // e.g., ['Resilience', 'Recovery', 'Discipline']
        recommended: { [key: string]: number };
    };
    playstyle: string;
    strengths: string[];
    weaknesses: string[];
    tips: string[];
    popularity: number; // 1-10
}

export const META_BUILDS: MetaBuild[] = [
    {
        id: 'contraverse-raid-warlock',
        name: 'Void Renegade Raider',
        class: 'Warlock',
        subclass: 'Voidwalker',
        element: 'Void',
        tier: 'S',
        season: 'Renegades',
        activities: ['Raids', 'Dungeons', 'Master'],
        exoticWeapon: 'Graviton Lance',
        exoticArmor: 'Contraverse Hold',
        aspects: ['Chaos Accelerant', 'Feed the Void'],
        fragments: ['Echo of Instability', 'Echo of Undermining', 'Echo of Harvest', 'Echo of Remnants'],
        stats: {
            priority: ['Discipline', 'Resilience', 'Recovery'],
            recommended: { Discipline: 100, Resilience: 100, Recovery: 70 }
        },
        playstyle: 'Overcharge grenades to trigger Weaken and Volatile. Keep Devour up for infinite health and energy.',
        strengths: [
            'Top-tier ad clear with Volatile rounds',
            'High grenade uptime',
            'Solid survivability'
        ],
        weaknesses: [
            'Requires precision grenade placement',
            'Boss DPS is weapon-dependent'
        ],
        tips: [
            'Always charge your grenade before throwing',
            'Pair with a Void pulse rifle for maximum synergy',
            'Use Vortex grenades for best area denial'
        ],
        popularity: 9
    },
    {
        id: 'pvp-void-pulse',
        name: 'Void Pulse Dominance',
        class: 'Hunter',
        subclass: 'Nightstalker',
        element: 'Void',
        tier: 'S',
        season: 'Renegades',
        activities: ['Trials', 'Competitive', 'Crucible'],
        exoticWeapon: 'Conditional Finality',
        exoticArmor: 'Knucklehead Radar',
        aspects: ['Vanishing Step', 'Stylish Executioner'],
        fragments: ['Echo of Dililation', 'Echo of Leeching', 'Echo of Domineering', 'Echo of Obscurity'],
        stats: {
            priority: ['Recovery', 'Mobility', 'Intellect'],
            recommended: { Recovery: 100, Mobility: 90, Intellect: 60 }
        },
        playstyle: 'Dominate mid-range lanes with the new Legendary Void Pulse Rifle. Use invis for flanking.',
        strengths: [
            'Fastest TTK at mid range',
            'Enhanced radar awareness',
            'Invis for map control'
        ],
        weaknesses: [
            'Struggles in close range without shotgun',
            'Requires high accuracy'
        ],
        tips: [
            'The new Void Pulse Rifle is the current PvP king',
            'Keep your distance and lane effectively',
            'Use Vanishing Step to break enemy engagement'
        ],
        popularity: 10
    },
];

/**
 * Get meta builds by class
 */
export function getMetaBuildsByClass(guardianClass: 'Warlock' | 'Hunter' | 'Titan'): MetaBuild[] {
    return META_BUILDS.filter(build => build.class === guardianClass);
}

/**
 * Get meta builds by tier
 */
export function getMetaBuildsByTier(tier: 'S' | 'A' | 'B'): MetaBuild[] {
    return META_BUILDS.filter(build => build.tier === tier);
}

/**
 * Get meta builds by activity
 */
export function getMetaBuildsByActivity(activity: string): MetaBuild[] {
    return META_BUILDS.filter(build =>
        build.activities.some(a => a.toLowerCase().includes(activity.toLowerCase()))
    );
}

/**
 * Search meta builds by name or playstyle
 */
export function searchMetaBuilds(query: string): MetaBuild[] {
    const lowerQuery = query.toLowerCase();
    return META_BUILDS.filter(build =>
        build.name.toLowerCase().includes(lowerQuery) ||
        build.playstyle.toLowerCase().includes(lowerQuery) ||
        build.exoticArmor.toLowerCase().includes(lowerQuery) ||
        build.subclass.toLowerCase().includes(lowerQuery)
    );
}

/**
 * Get top meta builds (S-tier, sorted by popularity)
 */
export function getTopMetaBuilds(): MetaBuild[] {
    return META_BUILDS
        .filter(build => build.tier === 'S')
        .sort((a, b) => b.popularity - a.popularity);
}
