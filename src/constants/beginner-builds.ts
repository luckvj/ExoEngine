/**
 * Beginner-Friendly Build Recommendations
 * Simple, effective builds for new players by class (Non-DLC focus)
 */

export interface BeginnerBuild {
    className: 'Warlock' | 'Hunter' | 'Titan';
    name: string;
    subclass: string;
    element: string;
    exoticArmor: string;
    exoticWeapon?: string;
    playstyle: string;
    why: string;
    tips: string[];
    difficulty: 'Very Easy' | 'Easy';
}

export const BEGINNER_BUILDS: BeginnerBuild[] = [
    // WARLOCK
    {
        className: 'Warlock',
        name: 'Void Scatter Spam',
        subclass: 'Voidwalker',
        element: 'Void',
        exoticArmor: 'Nothing Manacles (Arms)',
        exoticWeapon: 'Graviton Lance or Le Monarque',
        playstyle: 'Throw Scatter Grenades constantly. Nothing Manacles gives you two charges and tracking.',
        why: 'Nothing Manacles is a top-tier non-DLC exotic that makes Scatter Grenades lethal and high-uptime.',
        tips: [
            'Charging your grenade isn\'t necessary with Nothing Manacles',
            'Get kills with your grenade to trigger Devour',
            'Pick up Orbs of Power to regenerate grenade energy',
            'Pairs perfectly with Echo of Undermining for weakening'
        ],
        difficulty: 'Very Easy'
    },
    {
        className: 'Warlock',
        name: 'Arc Soul Turret',
        subclass: 'Stormcaller',
        element: 'Arc',
        exoticArmor: 'Getaway Artist (Arms)',
        playstyle: 'Consume your grenade to get a supercharged Arc Soul friend.',
        why: 'Passive damage from Arc Soul lets you focus on movement and survival.',
        tips: [
            'Hold the grenade button to consume it',
            'Rifts also help your team get regular souls',
            'Using your super clears rooms instantly',
            'Electrostatic Mind generates Ionic Traces for constant abilities'
        ],
        difficulty: 'Easy'
    },

    // HUNTER
    {
        className: 'Hunter',
        name: 'Arc Melee Loop',
        subclass: 'Arcstrider',
        element: 'Arc',
        exoticArmor: 'Liar\'s Handshake or Assassin\'s Cowl',
        exoticWeapon: 'Tractor Cannon',
        playstyle: 'Dodge, punch, repeat. Combination Blow heals you and stacks damage.',
        why: 'The core Hunter gameplay loop. Extremely powerful and requires zero DLC.',
        tips: [
            'Kill an enemy with melee, then dodge near an enemy to get melee back',
            'Combination Blow stacks up to 3 times',
            'Flow State makes you reload faster and dodge recharge faster while amplified',
            'Lethal Abundance gives you massive reach'
        ],
        difficulty: 'Easy'
    },
    {
        className: 'Hunter',
        name: 'Invisible Assassin',
        subclass: 'Nightstalker',
        element: 'Void',
        exoticArmor: 'Sixth Coyote (Chest)',
        playstyle: 'Use your dodges and smoke bombs to stay invisible almost indefinitely.',
        why: 'Safe playstyle that allows you to reposition or revive teammates easily.',
        tips: [
            'Dodge near enemies to get your smoke back (vanishing step)',
            'Use smoke bombs to make yourself and allies invisible',
            'Trapper\'s Ambush provides a secondary way to go invis',
            'Echo of Persistence makes invisibility last longer'
        ],
        difficulty: 'Very Easy'
    },

    // TITAN
    {
        className: 'Titan',
        name: 'Solar Bonk Hammer',
        subclass: 'Sunbreaker',
        element: 'Solar',
        exoticArmor: 'Synthoceps or Loreley Splendor',
        exoticWeapon: 'Monte Carlo',
        playstyle: 'Throw your hammer, pick it up, repeat. Infinite melee and constant healing.',
        why: 'The legendary "Bonk" build. High survivability and single-target damage.',
        tips: [
            'Picking up your hammer immediately heals you (Cure)',
            'Roaring Flames stacks make your hammer hit harder',
            'Sol Invictus creates Sunspots on hammer kills',
            'If you lose your hammer, use Monte Carlo or a finisher to get it back'
        ],
        difficulty: 'Very Easy'
    },
    {
        className: 'Titan',
        name: 'Sentinel Shield Tank',
        subclass: 'Sentinel',
        element: 'Void',
        exoticArmor: 'Doom Fang Pauldron (Arms)',
        playstyle: 'Aggressive void mapping. Melee kills give you super energy.',
        why: 'Great for learning the aggressive nature of Titans while staying protected by overshields.',
        tips: [
            'Use Shield Bash for massive movement and damage',
            'Controlled Demolition makes your void abilities heal you',
            'Doom Fang resets your super when you get shield kills',
            'Bastion creates an overshield for you and your team'
        ],
        difficulty: 'Easy'
    }
];

/**
 * Get beginner build recommendation for a class
 */
export function getBeginnerBuild(className: 'Warlock' | 'Hunter' | 'Titan', index: number = 0): BeginnerBuild | null {
    const builds = BEGINNER_BUILDS.filter(b => b.className === className);
    return builds[index] || builds[0] || null;
}

/**
 * Get all beginner builds for a class
 */
export function getAllBeginnerBuilds(className: 'Warlock' | 'Hunter' | 'Titan'): BeginnerBuild[] {
    return BEGINNER_BUILDS.filter(b => b.className === className);
}
