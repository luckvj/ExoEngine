/**
 * Activity-Specific Build Recommendations
 * Provides tailored loadout suggestions for different activities
 */

export interface ActivityBuildRecommendation {
    activityType: string;
    activityName?: string;
    weapons: {
        kinetic?: string[];
        energy?: string[];
        power?: string[];
    };
    exoticWeapon?: string[];
    exoticArmor?: { [className: string]: string[] };
    subclass?: { [className: string]: string[] };
    modPriorities: string[];
    tips: string[];
}

export const ACTIVITY_BUILDS: { [key: string]: ActivityBuildRecommendation } = {
    nightfall: {
        activityType: 'Master - Ultimate',
        weapons: {
            kinetic: ['The Call', 'Kinetic Scout/Pulse'],
            energy: ['Void Pulse Rifle (Meta)', 'Indebted Kindness', 'Aberrant Action'],
            power: ['Microcosm', 'Rocket Launcher', 'Machine Gun']
        },
        exoticWeapon: ['Still Hunt', 'Thunderlord', 'Microcosm', 'Gjallarhorn'],
        exoticArmor: {
            Warlock: ['Contraverse Hold', 'Speakers Sight', 'Mataiodoxia', 'Cenotaph Mask'],
            Hunter: ['Renewal Grasps', 'Still Hunt + Celestial Nighthawk', 'Gyrfalcon\'s Hauberk', 'Omnioculus'],
            Titan: ['Phoenix Cradle', 'Hazardous Propulsion', 'Hoil + Synthos (Class Item)', 'Abeyant Leap']
        },
        subclass: {
            Warlock: ['Voidwalker (Devour + Weaken)', 'Prismatic (Transcendence)', 'Song of Flame'],
            Hunter: ['Nightstalker (Invis + Pulse)', 'Prismatic (Still Hunt + Celestial)', 'Revenant'],
            Titan: ['Prismatic (Consecration)', 'Sentinel (Void overshield)', 'Berserker']
        },
        modPriorities: ['Surge Mods', 'Resist Mods', 'Time Dilation'],
        tips: [
            'Master - Ultimate rewards double rewards - be prepared',
            'Contraverse Hold Warlock provides infinite grenade uptime',
            '100 Resilience is mandatory for Ultimate difficulty',
            'Use defensive supers for challenging encounters'
        ]
    },

    raid: {
        activityType: 'Raid (Renegades Edition)',
        weapons: {
            kinetic: ['The Call', 'Mountaintop', 'Kinetic Scout'],
            energy: ['Void Pulse Rifle', 'Indebted Kindness', 'Fusion Rifle'],
            power: ['Still Hunt', 'Edge Transit', 'Apex Predator', 'Microcosm']
        },
        exoticWeapon: ['Still Hunt', 'Microcosm', 'Gjallarhorn', 'Euphony', 'Thunderlord'],
        exoticArmor: {
            Warlock: ['Contraverse Hold (Add Clear)', 'Speakers Sight', 'Lunafaction Boots', 'Cenotaph Mask'],
            Hunter: ['Celestial Nighthawk', 'Still Hunt', 'Star-Eater Scales', 'Gyrfalcon\'s Hauberk'],
            Titan: ['Hazardous Propulsion', 'Synthoceps', 'Cuirass of the Falling Star']
        },
        subclass: {
            Warlock: ['Voidwalker (Devour Loop)', 'Song of Flame', 'Nova Bomb'],
            Hunter: ['Nightstalker (Debuff)', 'Gunslinger (Celestial)', 'Prismatic (Still Hunt)'],
            Titan: ['Twilight Garrison (Super)', 'Sentinel', 'Berserker']
        },
        modPriorities: ['Surge Mods', 'Orb mods', 'Powerful Friends', 'Time Dilation'],
        tips: [
            'Still Hunt + Celestial for maximal DPS',
            'Contraverse Warlocks handle add-heavy phases best',
            'Always have a Tractor Cannon or Divinity for bosses',
            'Void Pulse rifles clear mechanics from distance efficiently',
            'Coordinate supers for optimal damage phases'
        ]
    },

    dungeon: {
        activityType: 'Dungeon',
        weapons: {
            kinetic: ['The Call', 'Witherhoard', 'Kinetic Scout'],
            energy: ['Indebted Kindness', 'Void Pulse Rifle', 'Fusion Rifle'],
            power: ['Still Hunt', 'Edge Transit', 'Apex Predator']
        },
        exoticWeapon: ['The Call', 'Still Hunt', 'Gjallarhorn', 'Witherhoard'],
        exoticArmor: {
            Warlock: ['Contraverse Hold', 'Speakers Sight', 'Osmiomancy Gloves'],
            Hunter: ['Celestial Nighthawk', 'Still Hunt', 'Assassin\'s Cowl'],
            Titan: ['Hazardous Propulsion', 'Synthoceps', 'Abeyant Leap']
        },
        subclass: {
            Warlock: ['Voidwalker', 'Song of Flame', 'Prismatic'],
            Hunter: ['Prismatic (Still Hunt)', 'Nightstalker (invis)', 'Threadrunner'],
            Titan: ['Prismatic (Consecration)', 'Sunbreaker', 'Sentinel']
        },
        modPriorities: ['Resist Mods', 'Surge Mods', 'Orb generation'],
        tips: [
            'Void Pulse Rifle clears adds from safety',
            'Song of Flame Warlock offers extreme survivability',
            'Learn encounter mechanics - no checkpoints between stages',
            'Balance survivability with damage output for solo runs'
        ]
    },

    crucible: {
        activityType: 'Crucible (PvP Meta)',
        weapons: {
            kinetic: ['Void Pulse Rifle (The Unseen Hand)', 'Hand Cannon (120/140)', 'Pulse Rifle'],
            energy: ['Shotgun (Conditional Finality)', 'Fusion Rifle', 'SMG'],
            power: ['Heavy Grenade Launcher', 'Machine Gun', 'Sword']
        },
        exoticWeapon: ['Conditional Finality', 'Ace of Spades', 'Crimson', 'Hawkmoon', 'Cloudstrike'],
        exoticArmor: {
            Warlock: ['Transversive Steps', 'Ophidian Aspect', 'Osmiomancy Gloves', 'The Stag'],
            Hunter: ['Knucklehead Radar', 'St0mp-EE5', 'Wormhusk Crown', 'Bakris'],
            Titan: ['Dunemarchers', 'One-Eyed Mask', 'Peacekeepers', 'Antaeus Wards']
        },
        subclass: {
            Warlock: ['Prismatic', 'Stormcaller', 'Dawnblade'],
            Hunter: ['Nightstalker (Invis)', 'Prismatic', 'Gunslinger'],
            Titan: ['Prismatic', 'Striker', 'Sentinel']
        },
        modPriorities: ['Recovery 100', 'Resilience 70+', 'Handling mods', 'Targeting mods'],
        tips: [
            'Void Pulse Rifle (Unseen Hand) is the new PvP king',
            'Knucklehead Radar is mandatory for lane dominance',
            'Invis Hunter with Void Pulse is a top-tier flanker',
            'Team-shoot in competitive modes',
            'Prismatic clones and abilities are still meta'
        ]
    },

    gambit: {
        activityType: 'Gambit',
        weapons: {
            kinetic: ['Void Pulse Rifle', 'The Call', 'Malfeasance'],
            energy: ['Indebted Kindness', 'Fusion Rifle', 'Trace Rifle'],
            power: ['Eyes of Tomorrow', 'Truth', 'Xenophage', 'Leviathan\'s Breath']
        },
        exoticWeapon: ['Malfeasance', 'Eyes of Tomorrow', 'Truth', 'Xenophage', 'Leviathan\'s Breath'],
        exoticArmor: {
            Warlock: ['Nezarec\'s Sin', 'Speakers Sight', 'Cenotaph Mask'],
            Hunter: ['Lucky Pants', 'Celestial Nighthawk', 'Omnioculus'],
            Titan: ['Cuirass of the Falling Star', 'Hazardous Propulsion', 'Synthoceps']
        },
        subclass: {
            Warlock: ['Song of Flame', 'Voidwalker', 'Prismatic'],
            Hunter: ['Golden Gun (Invader shutdown)', 'Prismatic', 'Nightstalker'],
            Titan: ['Thundercrash (DPS)', 'Prismatic', 'Sunbreaker']
        },
        modPriorities: ['Invader damage resistance', 'Heavy ammo finder', 'Scavenger mods', 'Surge mods'],
        tips: [
            'Void Pulse Rifle is great for clearing blockers from distance',
            'Save heavy ammo for Primeval damage',
            'Invade at 25/50 motes banked',
            'Bank 15 motes for large blocker',
            'Malfeasance melts blockers and Primevals'
        ]
    }
};

/**
 * Get build recommendation for a specific activity
 */
export function getActivityBuild(activityQuery: string): ActivityBuildRecommendation | null {
    const query = activityQuery.toLowerCase();

    // Specific Activity Overrides
    if (query.includes('excision') || query.includes('witness')) {
        return {
            ...ACTIVITY_BUILDS.raid,
            activityType: 'Excision (Grandmaster)',
            tips: [
                'Stay grouped during the damage phase',
                'Microcosm destroys the Witness\'s shield',
                'Song of Flame/Well of Radiance are essential for survival',
                ...ACTIVITY_BUILDS.raid.tips
            ]
        };
    }

    if (query.includes('nightfall') || query.includes('grandmaster') || query.includes('gm')) {
        return ACTIVITY_BUILDS.nightfall;
    }
    if (query.includes('raid')) {
        return ACTIVITY_BUILDS.raid;
    }
    if (query.includes('dungeon')) {
        return ACTIVITY_BUILDS.dungeon;
    }
    if (query.includes('crucible') || query.includes('pvp') || query.includes('trials')) {
        return ACTIVITY_BUILDS.crucible;
    }
    if (query.includes('gambit')) {
        return ACTIVITY_BUILDS.gambit;
    }

    return null;
}
