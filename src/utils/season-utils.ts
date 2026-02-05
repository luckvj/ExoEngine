/**
 * Utility to map Bungie Manifest watermark icons to readable Season names.
 * Watermarks are the most reliable way to identify the release version of an item.
 */

const SEASON_MAP: Record<string, string> = {
    // Recent/Major Expansions
    '6b6b779a1f11c8282b99596b42b9c5f6': 'Renegades', // Using the icon hash from AgentService
    'fe76c7c25ce4af443213efc3444005b4': 'The Final Shape',
    '9e46a74b0cc6c2d1b098f98ecbe1b99': 'Lightfall',
    '2dd9659f80282b0f4a8e63a342468f7': 'The Witch Queen',
    'e2254050d53c54fbbe2e9a2636a0fb4': 'Beyond Light',
    '871790403': 'Shadowkeep',
    '12ee68f23': 'Forsaken',

    // Specific Seasons (Watermark hashes vary, using common identifiers)
    // Season 20-23 (Lightfall Era)
    'df01f93f77341fe742d4a5202ed7268': 'Season of the Wish', // S23
    '22247f7149a468e2289fba8d6c1b3f6': 'Season of the Witch', // S22
    '292435532': 'Season of the Deep', // S21
    '342240502': 'Season of Defiance', // S20

    // Prismatic Era / Renegades
    'ac0090886cfa2b6389fba8d6c1b3f6': 'Episode: Echoes',
    '90886cfa2b63': 'Episode: Revenant',
    'renegade': 'Renegades Update'
};

/**
 * Gets the season name from a watermark icon path
 */
export function getSeasonNameFromWatermark(watermarkPath: string): string | undefined {
    if (!watermarkPath) return undefined;

    // Extract hash/identifier from path
    const hash = watermarkPath.split('/').pop()?.split('.')[0];
    if (!hash) return undefined;

    // Check direct matches
    if (SEASON_MAP[hash]) return SEASON_MAP[hash];

    // Check substrings (Bungie sometimes varies file names slightly)
    for (const [key, name] of Object.entries(SEASON_MAP)) {
        if (hash.includes(key) || key.includes(hash)) {
            return name;
        }
    }

    return undefined;
}

/**
 * Fallback for version-based labeling if watermark is missing
 */
export function getSeasonNameFromVersion(version: number): string {
    if (version >= 50) return 'The Final Shape';
    if (version >= 40) return 'Lightfall';
    if (version >= 30) return 'The Witch Queen';
    if (version >= 20) return 'Beyond Light';
    return 'Legacy';
}

/**
 * Determines if an item version is considered "Legacy" (Pre-Beyond Light / Version < 20).
 * Useful for determining which watermark style to apply.
 */
export function isLegacyVersion(version: number | undefined): boolean {
    if (version === undefined) return false;
    return version < 20;
}

