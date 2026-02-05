// Build Templates for Random Meta Generator
import { ElementType, GuardianClass, ItemSlot, Difficulty, type BuildTemplate, Expansion } from '../types';
import {
  EXOTIC_WEAPONS,
  EXOTIC_ARMOR_TITAN,
  EXOTIC_ARMOR_HUNTER,
  EXOTIC_ARMOR_WARLOCK,
  SUBCLASS_HASHES,
} from './item-hashes';
import { manifestService } from '../services/bungie/manifest.service';
import { warnLog } from '../utils/logger';
import { modService } from '../services/bungie/mod.service';

export const BUILD_TEMPLATES: BuildTemplate[] = [
  // ===== TITAN BUILDS =====
  {
    id: 'titan-void-sentinel',
    name: 'Bastion Commander',
    element: ElementType.Void,
    guardianClass: GuardianClass.Titan,
    requiredExpansion: Expansion.BaseGame,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.KINETIC.WITHERHOARD,
      name: 'Witherhoard',
      slot: ItemSlot.Kinetic,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_TITAN.HEART_OF_INMOST_LIGHT,
      name: 'Heart of Inmost Light',
      slot: ItemSlot.Chest,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.VOID.TITAN.SUPER.WARD_OF_DAWN,
      aspects: [
        SUBCLASS_HASHES.VOID.TITAN.ASPECTS.BASTION,
        SUBCLASS_HASHES.VOID.TITAN.ASPECTS.CONTROLLED_DEMOLITION,
      ],
      fragments: [
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_UNDERMINING,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_INSTABILITY,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_EXPULSION,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_STARVATION,
      ],
      grenadeHash: SUBCLASS_HASHES.VOID.TITAN.GRENADES.MAGNETIC,
      meleeHash: SUBCLASS_HASHES.VOID.TITAN.MELEE.SHIELD_BASH,
      classAbilityHash: SUBCLASS_HASHES.VOID.TITAN.CLASS_ABILITIES.TOWERING_BARRICADE,
    },
    playstyle:
      'Rotate abilities constantly. Barricade grants Overshield, empowers next ability. Witherhoard adds area denial. Ward of Dawn for team DPS boost.',
    difficulty: Difficulty.Intermediate,
    armorMods: [
      3832366019, // Void Siphon
      2319885414, // Firepower
      328014073,  // Void Resistance
      4188291233, // Void Surge
      40751621,   // Reaper
      4124991195  // Bomber
    ]
  },
  {
    id: 'titan-solar-bonk',
    name: 'Bonk Titan',
    element: ElementType.Solar,
    guardianClass: GuardianClass.Titan,
    requiredExpansion: Expansion.BaseGame,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.SUNSHOT,
      name: 'Sunshot',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_TITAN.SYNTHOCEPS,
      name: 'Synthoceps',
      slot: ItemSlot.Arms,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.SOLAR.TITAN.SUPER.BURNING_MAUL,
      aspects: [
        SUBCLASS_HASHES.SOLAR.TITAN.ASPECTS.ROARING_FLAMES,
        SUBCLASS_HASHES.SOLAR.TITAN.ASPECTS.SOL_INVICTUS,
      ],
      fragments: [
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_TORCHES,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SINGEING,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SOLACE,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_EMPYREAN,
      ],
      grenadeHash: SUBCLASS_HASHES.SOLAR.TITAN.GRENADES.THERMITE,
      meleeHash: SUBCLASS_HASHES.SOLAR.TITAN.MELEE.THROWING_HAMMER,
      classAbilityHash: SUBCLASS_HASHES.SOLAR.TITAN.CLASS_ABILITIES.RALLY_BARRICADE,
    },
    playstyle:
      'Throw hammer, pick up hammer, repeat. Synthoceps boosts melee damage when surrounded. Roaring Flames stacks increase damage. Sunshot spreads solar explosions.',
    difficulty: Difficulty.Beginner,
    armorMods: [
      2319885414, // Firepower
      3832366019, // Solar Siphon
      877723168,  // Solar Surge
      40751621,   // Reaper
      1755737153  // Time Dilation
    ]
  },
  {
    id: 'titan-arc-thundercrash',
    name: 'Thundercrash DPS',
    element: ElementType.Arc,
    guardianClass: GuardianClass.Titan,
    requiredExpansion: Expansion.BeyondLight,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.POWER.GJALLARHORN,
      name: 'Gjallarhorn',
      slot: ItemSlot.Power,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_TITAN.CUIRASS_OF_THE_FALLING_STAR,
      name: 'Cuirass of the Falling Star',
      slot: ItemSlot.Chest,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.ARC.TITAN.SUPER.THUNDERCRASH,
      aspects: [
        SUBCLASS_HASHES.ARC.TITAN.ASPECTS.TOUCH_OF_THUNDER,
        SUBCLASS_HASHES.ARC.TITAN.ASPECTS.KNOCKOUT,
      ],
      fragments: [
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_RESISTANCE,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_SHOCK,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_MAGNITUDE,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_AMPLITUDE,
      ],
      grenadeHash: SUBCLASS_HASHES.ARC.TITAN.GRENADES.PULSE,
      meleeHash: SUBCLASS_HASHES.ARC.TITAN.MELEE.BALLISTIC_SLAM,
      classAbilityHash: SUBCLASS_HASHES.ARC.TITAN.CLASS_ABILITIES.THRUSTER,
    },
    playstyle:
      'Save Super for the boss. Use Thruster and Ballistic Slam to move fast. Pulse Grenades jolt targets.',
    difficulty: Difficulty.Intermediate,
  },
  // New Pyrogale Build
  {
    id: 'titan-solar-pyrogale',
    name: 'Burning Maul Pyrogale',
    element: ElementType.Solar,
    guardianClass: GuardianClass.Titan,
    requiredExpansion: Expansion.Lightfall,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.SUNSHOT,
      name: 'Sunshot',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_TITAN.PYROGALE_GAUNTLETS,
      name: 'Pyrogale Gauntlets',
      slot: ItemSlot.Arms,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.SOLAR.TITAN.SUPER.BURNING_MAUL,
      aspects: [
        SUBCLASS_HASHES.SOLAR.TITAN.ASPECTS.CONSECRATION,
        SUBCLASS_HASHES.SOLAR.TITAN.ASPECTS.SOL_INVICTUS,
      ],
      fragments: [
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SEARING,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_CHAR,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_ERUPTION,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_ASHES,
      ],
      grenadeHash: SUBCLASS_HASHES.SOLAR.TITAN.GRENADES.HEALING,
      meleeHash: SUBCLASS_HASHES.SOLAR.TITAN.MELEE.THROWING_HAMMER,
      classAbilityHash: SUBCLASS_HASHES.SOLAR.TITAN.CLASS_ABILITIES.RALLY_BARRICADE,
    },
    playstyle:
      'Turn Burning Maul into a one-shot pyromania slam. Consecration slide-melee scorches and ignites everything. Sunshot for add clear.',
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'titan-void-peregrine-nuke',
    name: 'Peregrine Nuke',
    element: ElementType.Void,
    guardianClass: GuardianClass.Titan,
    requiredExpansion: Expansion.BaseGame,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.KINETIC.WITHERHOARD,
      name: 'Witherhoard',
      slot: ItemSlot.Kinetic,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_TITAN.PEREGRINE_GREAVES,
      name: 'Peregrine Greaves',
      slot: ItemSlot.Legs,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.VOID.TITAN.SUPER.WARD_OF_DAWN,
      aspects: [
        SUBCLASS_HASHES.VOID.TITAN.ASPECTS.BASTION,
        SUBCLASS_HASHES.VOID.TITAN.ASPECTS.OFFENSIVE_BULWARK,
      ],
      fragments: [
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_EXCHANGE,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_LEECHING,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_UNDERMINING,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_STARVATION,
      ],
      grenadeHash: SUBCLASS_HASHES.VOID.TITAN.GRENADES.VORTEX,
      meleeHash: SUBCLASS_HASHES.VOID.TITAN.MELEE.SHIELD_BASH,
      classAbilityHash: SUBCLASS_HASHES.VOID.TITAN.CLASS_ABILITIES.TOWERING_BARRICADE,
    },
    playstyle: 'Jump, bash, delete. Use Shield Bash while airborne for massive damage to enemies.',
    difficulty: Difficulty.Advanced,
  },
  {
    id: 'titan-arc-eternal-thunder',
    name: 'Eternal Thunder',
    element: ElementType.Arc,
    guardianClass: GuardianClass.Titan,
    requiredExpansion: Expansion.BaseGame,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.TRINITY_GHOUL,
      name: 'Trinity Ghoul',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_TITAN.ETERNAL_WARRIOR,
      name: 'Eternal Warrior',
      slot: ItemSlot.Helmet,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.ARC.TITAN.SUPER.FISTS_OF_HAVOC,
      aspects: [
        SUBCLASS_HASHES.ARC.TITAN.ASPECTS.KNOCKOUT,
        SUBCLASS_HASHES.ARC.TITAN.ASPECTS.TOUCH_OF_THUNDER,
      ],
      fragments: [
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_MAGNITUDE,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_SHOCK,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_IONS,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_RESISTANCE,
      ],
      grenadeHash: SUBCLASS_HASHES.ARC.TITAN.GRENADES.PULSE,
      meleeHash: SUBCLASS_HASHES.ARC.TITAN.MELEE.SEISMIC_STRIKE,
      classAbilityHash: SUBCLASS_HASHES.ARC.TITAN.CLASS_ABILITIES.THRUSTER,
    },
    playstyle: 'Pop Fists of Havoc to clear the room, then use the arc weapon surge to melt the remaining elites.',
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'titan-solar-precious-medic',
    name: 'Precious Medic',
    element: ElementType.Solar,
    guardianClass: GuardianClass.Titan,
    requiredExpansion: Expansion.BeyondLight,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.SUNSHOT,
      name: 'Sunshot',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_TITAN.PRECIOUS_SCARS,
      name: 'Precious Scars',
      slot: ItemSlot.Helmet,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.SOLAR.TITAN.SUPER.HAMMER_OF_SOL,
      aspects: [
        SUBCLASS_HASHES.SOLAR.TITAN.ASPECTS.SOL_INVICTUS,
        SUBCLASS_HASHES.SOLAR.TITAN.ASPECTS.ROARING_FLAMES,
      ],
      fragments: [
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_MERCY,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SOLACE,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_EMPYREAN,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_ASHES,
      ],
      grenadeHash: SUBCLASS_HASHES.SOLAR.TITAN.GRENADES.HEALING,
      meleeHash: SUBCLASS_HASHES.SOLAR.TITAN.MELEE.THROWING_HAMMER,
      classAbilityHash: SUBCLASS_HASHES.SOLAR.TITAN.CLASS_ABILITIES.RALLY_BARRICADE,
    },
    playstyle: 'Use a Solar weapon to keep yourself and your team alive. Chain kills to trigger constant healing pulses.',
    difficulty: Difficulty.Beginner,
  },
  {
    id: 'titan-prismatic-consecration-slam',
    name: 'Consecration Slam',
    element: ElementType.Prismatic,
    guardianClass: GuardianClass.Titan,
    requiredExpansion: Expansion.FinalShape,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.KINETIC.MONTE_CARLO,
      name: 'Monte Carlo',
      slot: ItemSlot.Kinetic,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_TITAN.SYNTHOCEPS,
      name: 'Synthoceps',
      slot: ItemSlot.Arms,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.PRISMATIC.TITAN.SUPER.TWILIGHT_ARSENAL,
      aspects: [
        SUBCLASS_HASHES.PRISMATIC.TITAN.ASPECTS.CONSECRATION,
        SUBCLASS_HASHES.PRISMATIC.TITAN.ASPECTS.KNOCKOUT,
      ],
      fragments: [
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_RUIN,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_BALANCE,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PROTECTION,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_HOPE,
      ],
      grenadeHash: SUBCLASS_HASHES.PRISMATIC.TITAN.GRENADES.SHACKLE,
      meleeHash: SUBCLASS_HASHES.PRISMATIC.TITAN.MELEE.FRENZIED_BLADE,
      classAbilityHash: SUBCLASS_HASHES.PRISMATIC.TITAN.CLASS_ABILITIES.THRUSTER,
    },
    playstyle: 'Slide and melee to ignite groups of enemies. Frenzied Blade charges allow for multiple slams in a row.',
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'titan-void-ursa-guard',
    name: 'Ursa Guard',
    element: ElementType.Void,
    guardianClass: GuardianClass.Titan,
    requiredExpansion: Expansion.Forsaken,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.LE_MONARQUE,
      name: 'Le Monarque',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_TITAN.URSA_FURIOSA,
      name: 'Ursa Furiosa',
      slot: ItemSlot.Arms,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.VOID.TITAN.SUPER.SENTINEL_SHIELD,
      aspects: [
        SUBCLASS_HASHES.VOID.TITAN.ASPECTS.OFFENSIVE_BULWARK,
        SUBCLASS_HASHES.VOID.TITAN.ASPECTS.CONTROLLED_DEMOLITION,
      ],
      fragments: [
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_REPRISAL,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_EXCHANGE,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_LEECHING,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_PERSISTENCE,
      ],
      grenadeHash: SUBCLASS_HASHES.VOID.TITAN.GRENADES.SUPPRESSOR,
      meleeHash: SUBCLASS_HASHES.VOID.TITAN.MELEE.SHIELD_THROW,
      classAbilityHash: SUBCLASS_HASHES.VOID.TITAN.CLASS_ABILITIES.TOWERING_BARRICADE,
    },
    playstyle: 'Stand at the front and hold the block button. Protect your team and refund your super immediately after.',
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'titan-stasis-icefall-tank',
    name: 'Icefall Tank',
    element: ElementType.Stasis,
    guardianClass: GuardianClass.Titan,
    requiredExpansion: Expansion.BeyondLight,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.KINETIC.VERGLAS_CURVE,
      name: 'Verglas Curve',
      slot: ItemSlot.Kinetic,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_TITAN.ICEFALL_MANTLE,
      name: 'Icefall Mantle',
      slot: ItemSlot.Arms,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.STASIS.TITAN.SUPER.GLACIAL_QUAKE,
      aspects: [
        SUBCLASS_HASHES.STASIS.TITAN.ASPECTS.TECTONIC_HARVEST,
        SUBCLASS_HASHES.STASIS.TITAN.ASPECTS.CRYOCLASM,
      ],
      fragments: [
        SUBCLASS_HASHES.STASIS.FRAGMENTS.WHISPER_OF_CHAINS,
        SUBCLASS_HASHES.STASIS.FRAGMENTS.WHISPER_OF_SHARDS,
        SUBCLASS_HASHES.STASIS.FRAGMENTS.WHISPER_OF_RIME,
        SUBCLASS_HASHES.STASIS.FRAGMENTS.WHISPER_OF_CONDUCTION,
      ],
      grenadeHash: SUBCLASS_HASHES.STASIS.TITAN.GRENADES.GLACIER,
      meleeHash: SUBCLASS_HASHES.STASIS.TITAN.MELEE.SHIVER_STRIKE,
      classAbilityHash: SUBCLASS_HASHES.STASIS.TITAN.CLASS_ABILITIES.TOWERING_BARRICADE,
    },
    playstyle: 'Activate overshield and walk through everything. Use Glacier grenades to create cover and DR zones.',
    difficulty: Difficulty.Advanced,
  },
  {
    id: 'titan-solar-phoenix-cradle',
    name: 'Phoenix Flame',
    element: ElementType.Solar,
    guardianClass: GuardianClass.Titan,
    requiredExpansion: Expansion.Shadowkeep,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.SUNSHOT,
      name: 'Sunshot',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_TITAN.PHOENIX_CRADLE,
      name: 'Phoenix Cradle',
      slot: ItemSlot.Legs,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.SOLAR.TITAN.SUPER.BURNING_MAUL,
      aspects: [
        SUBCLASS_HASHES.SOLAR.TITAN.ASPECTS.SOL_INVICTUS,
        SUBCLASS_HASHES.SOLAR.TITAN.ASPECTS.ROARING_FLAMES,
      ],
      fragments: [
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_BENEVOLENCE,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SOLACE,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_EMPYREAN,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SINGEING,
      ],
      grenadeHash: SUBCLASS_HASHES.SOLAR.TITAN.GRENADES.THERMITE,
      meleeHash: SUBCLASS_HASHES.SOLAR.TITAN.MELEE.THROWING_HAMMER,
      classAbilityHash: SUBCLASS_HASHES.SOLAR.TITAN.CLASS_ABILITIES.RALLY_BARRICADE,
    },
    playstyle: 'Create Sunspots by throwing hammers. Encourage your team to stand in them for massive ability regen and healing.',
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'titan-void-severance-explosions',
    name: 'Severance Explosions',
    element: ElementType.Void,
    guardianClass: GuardianClass.Titan,
    requiredExpansion: Expansion.BaseGame,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.POWER.GJALLARHORN,
      name: 'Gjallarhorn',
      slot: ItemSlot.Power,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_TITAN.SEVERANCE_ENCLOSURE,
      name: 'Severance Enclosure',
      slot: ItemSlot.Chest,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.VOID.TITAN.SUPER.TWILIGHT_ARSENAL,
      aspects: [
        SUBCLASS_HASHES.VOID.TITAN.ASPECTS.OFFENSIVE_BULWARK,
        SUBCLASS_HASHES.VOID.TITAN.ASPECTS.CONTROLLED_DEMOLITION,
      ],
      fragments: [
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_EXCHANGE,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_LEECHING,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_EXPULSION,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_STARVATION,
      ],
      grenadeHash: SUBCLASS_HASHES.VOID.TITAN.GRENADES.VORTEX,
      meleeHash: SUBCLASS_HASHES.VOID.TITAN.MELEE.SHIELD_BASH,
      classAbilityHash: SUBCLASS_HASHES.VOID.TITAN.CLASS_ABILITIES.TOWERING_BARRICADE,
    },
    playstyle: 'Melee or finish any minor enemy to clear the entire surrounding group. Shield Bash provides the initial explosion.',
    difficulty: Difficulty.Beginner,
  },
  {
    id: 'titan-solar-stronghold-parry',
    name: 'Stronghold Parry',
    element: ElementType.Solar,
    guardianClass: GuardianClass.Titan,
    requiredExpansion: Expansion.FinalShape,
    exoticArmor: {
      hash: EXOTIC_ARMOR_TITAN.STRONGHOLD,
      name: 'Stronghold',
      slot: ItemSlot.Arms,
    },
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.ERGO_SUM,
      name: 'Ergo Sum',
      slot: ItemSlot.Energy,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.SOLAR.TITAN.SUPER.HAMMER_OF_SOL,
      aspects: [
        SUBCLASS_HASHES.SOLAR.TITAN.ASPECTS.SOL_INVICTUS,
        SUBCLASS_HASHES.SOLAR.TITAN.ASPECTS.ROARING_FLAMES,
      ],
      fragments: [
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_EMPYREAN,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SOLACE,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_ASHES,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SEARING,
      ],
      grenadeHash: SUBCLASS_HASHES.SOLAR.TITAN.GRENADES.THERMITE,
      meleeHash: SUBCLASS_HASHES.SOLAR.TITAN.MELEE.THROWING_HAMMER,
      classAbilityHash: SUBCLASS_HASHES.SOLAR.TITAN.CLASS_ABILITIES.RALLY_BARRICADE,
    },
    playstyle: 'Guard through enemy fire to heal, then counter-attack with Ergo Sum. Sol Invictus keep you healthy.',
    difficulty: Difficulty.Advanced,
  },
  {
    id: 'titan-arc-point-contact-storm',
    name: 'Point Contact Storm',
    element: ElementType.Arc,
    guardianClass: GuardianClass.Titan,
    requiredExpansion: Expansion.BaseGame,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.RISKRUNNER,
      name: 'Riskrunner',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_TITAN.POINT_CONTACT_CANNON_BRACE,
      name: 'Point Contact Cannon Brace',
      slot: ItemSlot.Arms,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.ARC.TITAN.SUPER.THUNDERCRASH,
      aspects: [
        SUBCLASS_HASHES.ARC.TITAN.ASPECTS.KNOCKOUT,
        SUBCLASS_HASHES.ARC.TITAN.ASPECTS.TOUCH_OF_THUNDER,
      ],
      fragments: [
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_IONS,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_SHOCK,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_MAGNITUDE,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_RESISTANCE,
      ],
      grenadeHash: SUBCLASS_HASHES.ARC.TITAN.GRENADES.STORM,
      meleeHash: SUBCLASS_HASHES.ARC.TITAN.MELEE.THUNDERCLAP,
      classAbilityHash: SUBCLASS_HASHES.ARC.TITAN.CLASS_ABILITIES.THRUSTER,
    },
    playstyle: 'Charge up Thunderclap to delete entire rooms. Chain melee kills to keep the lightning flowing.',
    difficulty: Difficulty.Intermediate,
  },
  // New Hunter Nighthawk
  {
    id: 'hunter-solar-nighthawk',
    name: 'Celestial Sharpshooter',
    element: ElementType.Solar,
    guardianClass: GuardianClass.Hunter,
    requiredExpansion: Expansion.BaseGame,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.KINETIC.IZANAGIS_BURDEN,
      name: 'Izanagi\'s Burden',
      slot: ItemSlot.Kinetic,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_HUNTER.CELESTIAL_NIGHTHAWK,
      name: 'Celestial Nighthawk',
      slot: ItemSlot.Helmet,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.SOLAR.HUNTER.SUPER.GOLDEN_GUN_MARKSMAN,
      aspects: [
        SUBCLASS_HASHES.SOLAR.HUNTER.ASPECTS.KNOCK_EM_DOWN,
        SUBCLASS_HASHES.SOLAR.HUNTER.ASPECTS.ON_YOUR_MARK,
      ],
      fragments: [
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_TORCHES,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SOLACE,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SINGEING,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_EMPYREAN,
      ],
      grenadeHash: SUBCLASS_HASHES.SOLAR.HUNTER.GRENADES.HEALING,
      meleeHash: SUBCLASS_HASHES.SOLAR.HUNTER.MELEE.WEIGHTED_THROWING_KNIFE,
      classAbilityHash: SUBCLASS_HASHES.SOLAR.HUNTER.CLASS_ABILITIES.MARKSMANS_DODGE,
    },
    playstyle:
      'The ultimate burst damage. Stack Honed Edge x4 on Izanagi, then fire your single high-damage Golden Gun shot. If it lives, it won\'t for long.',
    difficulty: Difficulty.Advanced,
    armorMods: [
      3832366019, // Solar Siphon
      1546944321, // Solar Surge
      1546944321, // Solar Surge (Double for DPS)
      40751621,   // Reaper
      1755737153  // Time Dilation
    ]
  },
  {
    id: 'hunter-void-gyrfalcon-loop',
    name: "Gyrfalcon's Volatility",
    element: ElementType.Void,
    guardianClass: GuardianClass.Hunter,
    requiredExpansion: Expansion.WitchQueen,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.FIGHTING_LION,
      name: 'Fighting Lion',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_HUNTER.GYRFALCONS_HAUBERK,
      name: "Gyrfalcon's Hauberk",
      slot: ItemSlot.Chest,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.VOID.HUNTER.SUPER.SHADOWSHOT_DEADFALL,
      aspects: [
        SUBCLASS_HASHES.VOID.HUNTER.ASPECTS.STYLISH_EXECUTIONER,
        SUBCLASS_HASHES.VOID.HUNTER.ASPECTS.VANISHING_STEP,
      ],
      fragments: [
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_INSTABILITY,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_STARVATION,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_PERSISTENCE,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_OBSCURITY,
      ],
      meleeHash: SUBCLASS_HASHES.VOID.HUNTER.MELEE.SNARE_BOMB,
      grenadeHash: SUBCLASS_HASHES.VOID.HUNTER.GRENADES.VORTEX,
      classAbilityHash: SUBCLASS_HASHES.VOID.HUNTER.CLASS_ABILITIES.MARKSMANS_DODGE,
    },
    playstyle: 'Dodge to go invis -> Kill an enemy to get Volatile Rounds -> Kill another to go back invis.',
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'hunter-any-lucky-pants-dps',
    name: 'Lucky Shots',
    element: ElementType.Solar,
    guardianClass: GuardianClass.Hunter,
    requiredExpansion: Expansion.BaseGame,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.KINETIC.MALFEASANCE,
      name: 'Malfeasance',
      slot: ItemSlot.Kinetic,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_HUNTER.LUCKY_PANTS,
      name: 'Lucky Pants',
      slot: ItemSlot.Legs,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.SOLAR.HUNTER.SUPER.GOLDEN_GUN_MARKSMAN,
      aspects: [
        SUBCLASS_HASHES.SOLAR.HUNTER.ASPECTS.ON_YOUR_MARK,
        SUBCLASS_HASHES.SOLAR.HUNTER.ASPECTS.KNOCK_EM_DOWN,
      ],
      fragments: [
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_TORCHES,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SOLACE,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_EMPYREAN,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_ASHES,
      ],
      meleeHash: SUBCLASS_HASHES.SOLAR.HUNTER.MELEE.WEIGHTED_THROWING_KNIFE,
      grenadeHash: SUBCLASS_HASHES.SOLAR.HUNTER.GRENADES.HEALING,
      classAbilityHash: SUBCLASS_HASHES.SOLAR.HUNTER.CLASS_ABILITIES.MARKSMANS_DODGE,
    },
    playstyle: 'Readying a fully loaded Hand Cannon matching your element grants massive damage bonuses.',
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'hunter-void-orpheus-tether',
    name: 'Orpheus Tether',
    element: ElementType.Void,
    guardianClass: GuardianClass.Hunter,
    requiredExpansion: Expansion.BaseGame,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.GRAVITON_LANCE,
      name: 'Graviton Lance',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_HUNTER.ORPHEUS_RIG,
      name: 'Orpheus Rig',
      slot: ItemSlot.Legs,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.VOID.HUNTER.SUPER.SHADOWSHOT_DEADFALL,
      aspects: [
        SUBCLASS_HASHES.VOID.HUNTER.ASPECTS.VANISHING_STEP,
        SUBCLASS_HASHES.VOID.HUNTER.ASPECTS.TRAPPERS_AMBUSH,
      ],
      fragments: [
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_REPRISAL,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_PERSISTENCE,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_STARVATION,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_HARVEST,
      ],
      meleeHash: SUBCLASS_HASHES.VOID.HUNTER.MELEE.SNARE_BOMB,
      grenadeHash: SUBCLASS_HASHES.VOID.HUNTER.GRENADES.VORTEX,
      classAbilityHash: SUBCLASS_HASHES.VOID.HUNTER.CLASS_ABILITIES.MARKSMANS_DODGE,
    },
    playstyle: 'Fire your tether into large groups. Kill them to generate orbs and refund your super energy.',
    difficulty: Difficulty.Beginner,
  },
  {
    id: 'hunter-solar-celestial-nuke-v2',
    name: 'One Shot Sharpshooter',
    element: ElementType.Solar,
    guardianClass: GuardianClass.Hunter,
    requiredExpansion: Expansion.BaseGame,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.POWER.WHISPER_OF_THE_WORM,
      name: 'Whisper of the Worm',
      slot: ItemSlot.Power,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_HUNTER.CELESTIAL_NIGHTHAWK,
      name: 'Celestial Nighthawk',
      slot: ItemSlot.Helmet,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.SOLAR.HUNTER.SUPER.GOLDEN_GUN_MARKSMAN,
      aspects: [
        SUBCLASS_HASHES.SOLAR.HUNTER.ASPECTS.ON_YOUR_MARK,
        SUBCLASS_HASHES.SOLAR.HUNTER.ASPECTS.KNOCK_EM_DOWN,
      ],
      fragments: [
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_TORCHES,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SOLACE,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_EMPYREAN,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_ASHES,
      ],
      meleeHash: SUBCLASS_HASHES.SOLAR.HUNTER.MELEE.WEIGHTED_THROWING_KNIFE,
      grenadeHash: SUBCLASS_HASHES.SOLAR.HUNTER.GRENADES.HEALING,
      classAbilityHash: SUBCLASS_HASHES.SOLAR.HUNTER.CLASS_ABILITIES.MARKSMANS_DODGE,
    },
    playstyle: 'Line up your one Golden Gun shot for massive boss damage. Whisper of the Worm for sustained DPS.',
    difficulty: Difficulty.Beginner,
  },
  {
    id: 'hunter-arc-mothkeeper-wraps-v2',
    name: 'Moth Mechanic',
    element: ElementType.Arc,
    guardianClass: GuardianClass.Hunter,
    requiredExpansion: Expansion.Lightfall,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.EX_DIRIS,
      name: 'Ex Diris',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_HUNTER.MOTHKEEPER_WRAPS,
      name: "Mothkeeper's Wraps",
      slot: ItemSlot.Arms,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.ARC.HUNTER.SUPER.GATHERING_STORM,
      aspects: [
        SUBCLASS_HASHES.ARC.HUNTER.ASPECTS.FLOW_STATE,
        SUBCLASS_HASHES.ARC.HUNTER.ASPECTS.ASCENSION,
      ],
      fragments: [
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_SHOCK,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_IONS,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_RESISTANCE,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_AMPLITUDE,
      ],
      grenadeHash: SUBCLASS_HASHES.ARC.HUNTER.GRENADES.SKIP,
      meleeHash: SUBCLASS_HASHES.ARC.HUNTER.MELEE.COMBINATION_BLOW,
      classAbilityHash: SUBCLASS_HASHES.ARC.HUNTER.CLASS_ABILITIES.GAMBLERS_DODGE,
    },
    playstyle: 'Throw moths everywhere. They do the work for you. Pair with Ex Diris for even more moth mayhem.',
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'hunter-prismatic-stareater-scales-v2',
    name: 'Super Star',
    element: ElementType.Prismatic,
    guardianClass: GuardianClass.Hunter,
    requiredExpansion: Expansion.FinalShape,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.SUNSHOT,
      name: 'Sunshot',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_HUNTER.STAR_EATER_SCALES,
      name: 'Star-Eater Scales',
      slot: ItemSlot.Legs,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.SUPER.STORMS_EDGE,
      aspects: [
        SUBCLASS_HASHES.PRISMATIC.HUNTER.ASPECTS.STYLISH_EXECUTIONER,
        SUBCLASS_HASHES.PRISMATIC.HUNTER.ASPECTS.GUNPOWDER_GAMBLE,
      ],
      fragments: [
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PURPOSE,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_DAWN,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_HOPE,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PROTECTION,
      ],
      meleeHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.MELEE.THREADED_SPIKE,
      grenadeHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.GRENADES.MAGNETIC,
      classAbilityHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.CLASS_ABILITIES.MARKSMANS_DODGE,
    },
    playstyle: 'Generate as many orbs as possible. Don\'t cast Super until you have Feast of Light x4.',
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'hunter-prismatic-foetracer-fury-v2',
    name: 'Elemental Tracker',
    element: ElementType.Prismatic,
    guardianClass: GuardianClass.Hunter,
    requiredExpansion: Expansion.FinalShape,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.KINETIC.OUTBREAK_PERFECTED,
      name: 'Outbreak Perfected',
      slot: ItemSlot.Kinetic,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_HUNTER.FOETRACER,
      name: 'Foetracer',
      slot: ItemSlot.Helmet,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.SUPER.SILKSTRIKE,
      aspects: [
        SUBCLASS_HASHES.PRISMATIC.HUNTER.ASPECTS.WINTERS_SHROUD,
        SUBCLASS_HASHES.PRISMATIC.HUNTER.ASPECTS.THREADED_SPECTER,
      ],
      fragments: [
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_DAWN,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_BALANCE,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_RUIN,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_BRAVERY,
      ],
      meleeHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.MELEE.WITHERING_BLADE,
      grenadeHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.GRENADES.DUSKFIELD,
      classAbilityHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.CLASS_ABILITIES.GAMBLERS_DODGE,
    },
    playstyle: 'Hit a major with an ability, then swap to the matching elemental weapon to melt them.',
    difficulty: Difficulty.Advanced,
  },
  {
    id: 'hunter-any-triton-vice-glaive-v2',
    name: 'Glaive God',
    element: ElementType.Prismatic,
    guardianClass: GuardianClass.Hunter,
    requiredExpansion: Expansion.Lightfall,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.VEXCALIBUR,
      name: 'Vexcalibur',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_HUNTER.TRITON_VICE,
      name: 'Triton Vice',
      slot: ItemSlot.Arms,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.SUPER.DEADFALL,
      aspects: [
        SUBCLASS_HASHES.PRISMATIC.HUNTER.ASPECTS.STYLISH_EXECUTIONER,
        SUBCLASS_HASHES.PRISMATIC.HUNTER.ASPECTS.WINTERS_SHROUD,
      ],
      fragments: [
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PROTECTION,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PURPOSE,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_HOPE,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_AWAKENING,
      ],
      meleeHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.MELEE.COMBINATION_BLOW,
      grenadeHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.GRENADES.MAGNETIC,
      classAbilityHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.CLASS_ABILITIES.GAMBLERS_DODGE,
    },
    playstyle: 'Get close and personal with a Glaive. Stab through groups of enemies and use the shield to survive.',
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'hunter-stasis-renewal-duskfield-v2',
    name: 'Duskfield Fortress',
    element: ElementType.Stasis,
    guardianClass: GuardianClass.Hunter,
    requiredExpansion: Expansion.WitchQueen,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.KINETIC.AGERS_SCEPTER,
      name: "Ager's Scepter",
      slot: ItemSlot.Kinetic,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_HUNTER.RENEWAL_GRASPS,
      name: 'Renewal Grasps',
      slot: ItemSlot.Arms,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.STASIS.HUNTER.SUPER.SILENCE_AND_SQUALL,
      aspects: [
        SUBCLASS_HASHES.STASIS.HUNTER.ASPECTS.TOUCH_OF_WINTER,
        SUBCLASS_HASHES.STASIS.HUNTER.ASPECTS.GRIM_HARVEST,
      ],
      fragments: [
        SUBCLASS_HASHES.STASIS.FRAGMENTS.WHISPER_OF_CHAINS,
        SUBCLASS_HASHES.STASIS.FRAGMENTS.WHISPER_OF_DURANCE,
        SUBCLASS_HASHES.STASIS.FRAGMENTS.WHISPER_OF_TORMENT,
        SUBCLASS_HASHES.STASIS.FRAGMENTS.WHISPER_OF_SHARDS,
      ],
      meleeHash: SUBCLASS_HASHES.STASIS.HUNTER.MELEE.WITHERING_BLADE,
      grenadeHash: SUBCLASS_HASHES.STASIS.HUNTER.GRENADES.DUSKFIELD,
      classAbilityHash: SUBCLASS_HASHES.STASIS.HUNTER.CLASS_ABILITIES.MARKSMANS_DODGE,
    },
    playstyle: 'Stand inside your own Duskfield. You are essentially unkillable. Break Stasis crystals for energy.',
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'hunter-solar-athrys-weighted-knife-v2',
    name: 'Weighted Warrior',
    element: ElementType.Solar,
    guardianClass: GuardianClass.Hunter,
    requiredExpansion: Expansion.BeyondLight,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.SUNSHOT,
      name: 'Sunshot',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_HUNTER.ATHRYS_EMBRACE,
      name: "Athrys's Embrace",
      slot: ItemSlot.Arms,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.SOLAR.HUNTER.SUPER.GOLDEN_GUN_MARKSMAN,
      aspects: [
        SUBCLASS_HASHES.SOLAR.HUNTER.ASPECTS.KNOCK_EM_DOWN,
        SUBCLASS_HASHES.SOLAR.HUNTER.ASPECTS.ON_YOUR_MARK,
      ],
      fragments: [
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_TORCHES,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SOLACE,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_EMPYREAN,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SEARING,
      ],
      meleeHash: SUBCLASS_HASHES.SOLAR.HUNTER.MELEE.WEIGHTED_THROWING_KNIFE,
      grenadeHash: SUBCLASS_HASHES.SOLAR.HUNTER.GRENADES.HEALING,
      classAbilityHash: SUBCLASS_HASHES.SOLAR.HUNTER.CLASS_ABILITIES.GAMBLERS_DODGE,
    },
    playstyle: 'Land precision shots to proc the buff, then throw the knife to watch it bounce and delete an elite.',
    difficulty: Difficulty.Advanced,
  },
  // Devour Weave (Prismatic Swarmers)
  {
    id: 'warlock-prismatic-devour-weave',
    name: 'Devour Weave',
    element: ElementType.Prismatic,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.Lightfall,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.KINETIC.WISH_KEEPER,
      name: 'Wish-Keeper',
      slot: ItemSlot.Kinetic,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_WARLOCK.SWARMERS,
      name: 'Swarmers',
      slot: ItemSlot.Legs,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.SUPER.NEEDLESTORM,
      aspects: [
        SUBCLASS_HASHES.PRISMATIC.WARLOCK.ASPECTS.WEAVERS_CALL,
        SUBCLASS_HASHES.PRISMATIC.WARLOCK.ASPECTS.FEED_THE_VOID,
      ],
      fragments: [
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_HOPE,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_BALANCE,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_COURAGE,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PROTECTION,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PURPOSE,
      ],
      grenadeHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.GRENADES.THREADLING,
      meleeHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.MELEE.ARCANE_NEEDLE,
      classAbilityHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.CLASS_ABILITIES.PHOENIX_DIVE,
    },
    playstyle:
      'Consume Threadlings to heal. Weaver\'s Call spawns Threadlings on dive. Swarmers make them Unravel. Arcane Needle for 3 melee charges. Constant threadling spam that heals you.',
    difficulty: Difficulty.Advanced,
  },
  // Lightning God (Winter's Guile)
  {
    id: 'warlock-prismatic-winter',
    name: 'Lightning God',
    element: ElementType.Prismatic,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.Lightfall,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.TRINITY_GHOUL,
      name: 'Trinity Ghoul',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_WARLOCK.WINTERS_GUILE,
      name: 'Winter\'s Guile',
      slot: ItemSlot.Arms,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.SUPER.STORMTRANCE,
      aspects: [
        SUBCLASS_HASHES.PRISMATIC.WARLOCK.ASPECTS.LIGHTNING_SURGE,
        SUBCLASS_HASHES.PRISMATIC.WARLOCK.ASPECTS.FEED_THE_VOID,
      ],
      fragments: [
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PROTECTION,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PURPOSE,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_BRAVERY,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_BALANCE,
      ],
      grenadeHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.GRENADES.STORM,
      meleeHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.MELEE.ARCANE_NEEDLE,
      classAbilityHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.CLASS_ABILITIES.PHOENIX_DIVE,
    },
    playstyle:
      'Use Arcane Needle charges to activate Lightning Surge slide-melee. Winter\'s Guile stacks melee damage to absurd levels. Feed the Void grants Devour on ability kills. Slide, zap, heal, repeat.',
    difficulty: Difficulty.Advanced,
  },
  {
    id: 'titan-strand-banner',
    name: 'Banner of War',
    element: ElementType.Strand,
    guardianClass: GuardianClass.Titan,
    requiredExpansion: Expansion.Lightfall,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.KINETIC.QUICKSILVER_STORM,
      name: 'Quicksilver Storm',
      slot: ItemSlot.Kinetic,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_TITAN.SYNTHOCEPS,
      name: 'Synthoceps',
      slot: ItemSlot.Arms,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.STRAND.TITAN.SUPER.BLADEFURY,
      aspects: [
        SUBCLASS_HASHES.STRAND.TITAN.ASPECTS.BANNER_OF_WAR,
        SUBCLASS_HASHES.STRAND.TITAN.ASPECTS.INTO_THE_FRAY,
      ],
      fragments: [
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_WARDING,
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_GENERATION,
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_FURY,
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_FINALITY,
      ],
      grenadeHash: SUBCLASS_HASHES.STRAND.TITAN.GRENADES.SHACKLE,
      meleeHash: SUBCLASS_HASHES.STRAND.TITAN.MELEE.FRENZIED_BLADE,
      classAbilityHash: SUBCLASS_HASHES.STRAND.TITAN.CLASS_ABILITIES.TOWERING_BARRICADE,
    },
    playstyle:
      'Get melee/sword kills to activate Banner. Banner heals team and boosts damage. Synthoceps for big melee damage. Quicksilver creates Tangles.',
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'titan-void-doomfang',
    name: 'Endless Shield',
    element: ElementType.Void,
    guardianClass: GuardianClass.Titan,
    requiredExpansion: Expansion.BaseGame,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.KINETIC.MONTE_CARLO,
      name: 'Monte Carlo',
      slot: ItemSlot.Kinetic,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_TITAN.DOOM_FANG_PAULDRON,
      name: 'Doom Fang Pauldron',
      slot: ItemSlot.Arms,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.VOID.TITAN.SUPER.SENTINEL_SHIELD,
      aspects: [
        SUBCLASS_HASHES.VOID.TITAN.ASPECTS.CONTROLLED_DEMOLITION,
        SUBCLASS_HASHES.VOID.TITAN.ASPECTS.OFFENSIVE_BULWARK,
      ],
      fragments: [
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_LEECHING,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_DOMINEERING,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_REPRISAL,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_EXCHANGE,
      ],
      grenadeHash: SUBCLASS_HASHES.VOID.TITAN.GRENADES.SUPPRESSOR,
      meleeHash: SUBCLASS_HASHES.VOID.TITAN.MELEE.SHIELD_BASH,
      classAbilityHash: SUBCLASS_HASHES.VOID.TITAN.CLASS_ABILITIES.TOWERING_BARRICADE,
    },
    playstyle:
      'Melee kills charge Super instantly. Shield throws extend Super duration. Monte Carlo keeps melee charged. Infinite Super uptime.',
    difficulty: Difficulty.Beginner,
  },
  {
    id: 'titan-stasis-hoarfrost',
    name: 'Glacial Fort',
    element: ElementType.Stasis,
    guardianClass: GuardianClass.Titan,
    requiredExpansion: Expansion.WitchQueen,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.KINETIC.VERGLAS_CURVE,
      name: 'Verglas Curve',
      slot: ItemSlot.Kinetic,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_TITAN.HOARFROST_Z,
      name: 'Hoarfrost-Z',
      slot: ItemSlot.Chest,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.STASIS.TITAN.SUPER.GLACIAL_QUAKE,
      aspects: [
        SUBCLASS_HASHES.STASIS.TITAN.ASPECTS.TECTONIC_HARVEST,
        SUBCLASS_HASHES.STASIS.TITAN.ASPECTS.HOWL_OF_THE_STORM,
      ],
      fragments: [
        SUBCLASS_HASHES.STASIS.FRAGMENTS.WHISPER_OF_RIME,
        SUBCLASS_HASHES.STASIS.FRAGMENTS.WHISPER_OF_SHARDS,
        SUBCLASS_HASHES.STASIS.FRAGMENTS.WHISPER_OF_CHAINS,
        SUBCLASS_HASHES.STASIS.FRAGMENTS.WHISPER_OF_CONDUCTION,
      ],
      grenadeHash: SUBCLASS_HASHES.STASIS.TITAN.GRENADES.GLACIER,
      meleeHash: SUBCLASS_HASHES.STASIS.TITAN.MELEE.SHIVER_STRIKE,
      classAbilityHash: SUBCLASS_HASHES.STASIS.TITAN.CLASS_ABILITIES.TOWERING_BARRICADE,
    },
    playstyle:
      'Barricade becomes Crystal wall. Destroy crystals for damage resist and shards. Shards give overshield. Be an ice castle.',
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'titan-strand-abeyant',
    name: 'Suspension Master',
    element: ElementType.Strand,
    guardianClass: GuardianClass.Titan,
    requiredExpansion: Expansion.Lightfall,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.LE_MONARQUE,
      name: 'Le Monarque',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_TITAN.ABEYANT_LEAP,
      name: 'Abeyant Leap',
      slot: ItemSlot.Legs,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.STRAND.TITAN.SUPER.BLADEFURY,
      aspects: [
        SUBCLASS_HASHES.STRAND.TITAN.ASPECTS.DRENGRS_LASH,
        SUBCLASS_HASHES.STRAND.TITAN.ASPECTS.INTO_THE_FRAY,
      ],
      fragments: [
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_MIND,
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_GENERATION,
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_CONTINUITY,
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_ISOLATION,
      ],
      grenadeHash: SUBCLASS_HASHES.STRAND.TITAN.GRENADES.SHACKLE,
      meleeHash: SUBCLASS_HASHES.STRAND.TITAN.MELEE.FRENZIED_BLADE,
      classAbilityHash: SUBCLASS_HASHES.STRAND.TITAN.CLASS_ABILITIES.TOWERING_BARRICADE,
    },
    playstyle:
      'Barricade suspends enemies. Shackle grenade suspends enemies. Abeyant Leap grants Woven Mail on suspend. Control the entire room.',
    difficulty: Difficulty.Intermediate,
  },

  // ===== HUNTER BUILDS =====
  {
    id: 'hunter-void-omni',
    name: 'Omnioculus Support',
    element: ElementType.Void,
    guardianClass: GuardianClass.Hunter,
    requiredExpansion: Expansion.BeyondLight,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.LE_MONARQUE,
      name: 'Le Monarque',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_HUNTER.OMNIOCULUS,
      name: 'Omnioculus',
      slot: ItemSlot.Chest,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.VOID.HUNTER.SUPER.SHADOWSHOT_MOEBIUS_QUIVER,
      aspects: [
        SUBCLASS_HASHES.VOID.HUNTER.ASPECTS.VANISHING_STEP,
        SUBCLASS_HASHES.VOID.HUNTER.ASPECTS.STYLISH_EXECUTIONER,
      ],
      fragments: [
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_STARVATION,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_OBSCURITY,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_PERSISTENCE,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_UNDERMINING,
      ],
      grenadeHash: SUBCLASS_HASHES.VOID.HUNTER.GRENADES.VORTEX,
      meleeHash: SUBCLASS_HASHES.VOID.HUNTER.MELEE.SNARE_BOMB,
      classAbilityHash: SUBCLASS_HASHES.VOID.HUNTER.CLASS_ABILITIES.GAMBLERS_DODGE,
    },
    playstyle:
      'Keep team invisible. Smoke near allies for invis + damage resist. Le Monarque applies weaken. Dodge near allies for quick invis.',
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'hunter-void-trapper',
    name: "Trapper's Ambush",
    element: ElementType.Void,
    guardianClass: GuardianClass.Hunter,
    requiredExpansion: Expansion.WitchQueen,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.POWER.LEVIATHANS_BREATH,
      name: "Leviathan's Breath",
      slot: ItemSlot.Power,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_HUNTER.OMNIOCULUS,
      name: 'Omnioculus',
      slot: ItemSlot.Chest,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.VOID.HUNTER.SUPER.SHADOWSHOT_MOEBIUS_QUIVER,
      aspects: [
        SUBCLASS_HASHES.VOID.HUNTER.ASPECTS.TRAPPERS_AMBUSH,
        SUBCLASS_HASHES.VOID.HUNTER.ASPECTS.VANISHING_STEP,
      ],
      fragments: [
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_OBSCURITY,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_PERSISTENCE,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_STARVATION,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_INSTABILITY,
      ],
      grenadeHash: SUBCLASS_HASHES.VOID.HUNTER.GRENADES.VORTEX,
      meleeHash: SUBCLASS_HASHES.VOID.HUNTER.MELEE.SNARE_BOMB,
      classAbilityHash: SUBCLASS_HASHES.VOID.HUNTER.CLASS_ABILITIES.GAMBLERS_DODGE,
    },
    playstyle:
      "Dive to make allies invisible and weaken enemies. Leviathan's Breath for massive single-target damage.",
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'hunter-solar-star-eater',
    name: 'Star-Eater Blade Barrage',
    element: ElementType.Solar,
    guardianClass: GuardianClass.Hunter,
    requiredExpansion: Expansion.BeyondLight,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.KINETIC.OUTBREAK_PERFECTED,
      name: 'Outbreak Perfected',
      slot: ItemSlot.Kinetic,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_HUNTER.STAR_EATER_SCALES,
      name: 'Star-Eater Scales',
      slot: ItemSlot.Legs,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.SOLAR.HUNTER.SUPER.BLADE_BARRAGE,
      aspects: [
        SUBCLASS_HASHES.SOLAR.HUNTER.ASPECTS.KNOCK_EM_DOWN,
        SUBCLASS_HASHES.SOLAR.HUNTER.ASPECTS.ON_YOUR_MARK,
      ],
      fragments: [
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_TORCHES,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_COMBUSTION,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SINGEING,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SOLACE,
      ],
      grenadeHash: SUBCLASS_HASHES.SOLAR.HUNTER.GRENADES.TRIPMINE,
      meleeHash: SUBCLASS_HASHES.SOLAR.HUNTER.MELEE.KNIFE_TRICK,
      classAbilityHash: SUBCLASS_HASHES.SOLAR.HUNTER.CLASS_ABILITIES.ACROBATS_DODGE,
    },
    playstyle:
      'Collect Orbs to stack Feast of Light (up to 8x). Use Super at max stacks for massive damage. Knock Em Down enhances Super.',
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'hunter-arc-assassin',
    name: 'Flow State Assassin',
    element: ElementType.Arc,
    guardianClass: GuardianClass.Hunter,
    requiredExpansion: Expansion.Forsaken,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.KINETIC.MONTE_CARLO,
      name: 'Monte Carlo',
      slot: ItemSlot.Kinetic,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_HUNTER.LIARS_HANDSHAKE,
      name: "Liar's Handshake",
      slot: ItemSlot.Arms,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.ARC.HUNTER.SUPER.GATHERING_STORM,
      aspects: [
        SUBCLASS_HASHES.ARC.HUNTER.ASPECTS.FLOW_STATE,
        SUBCLASS_HASHES.ARC.HUNTER.ASPECTS.LETHAL_CURRENT,
      ],
      fragments: [
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_FREQUENCY,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_RESISTANCE,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_RECHARGE,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_MOMENTUM,
      ],
      grenadeHash: SUBCLASS_HASHES.ARC.HUNTER.GRENADES.PULSE,
      meleeHash: SUBCLASS_HASHES.ARC.HUNTER.MELEE.COMBINATION_BLOW,
      classAbilityHash: SUBCLASS_HASHES.ARC.HUNTER.CLASS_ABILITIES.GAMBLERS_DODGE,
    },
    playstyle:
      "Dodge amplifies melee. Melee kills heal with Liar's. Monte Carlo refunds melee. Chain punches forever.",
    difficulty: Difficulty.Advanced,
  },
  {
    id: 'hunter-strand-grapple',
    name: 'Grapple Assassin',
    element: ElementType.Strand,
    guardianClass: GuardianClass.Hunter,
    requiredExpansion: Expansion.Lightfall,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.KINETIC.FINAL_WARNING,
      name: 'Final Warning',
      slot: ItemSlot.Kinetic,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_HUNTER.CYRTARACHNE_FACADE,
      name: "Cyrtarachne's Facade",
      slot: ItemSlot.Helmet,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.STRAND.HUNTER.SUPER.SILKSTRIKE,
      aspects: [
        SUBCLASS_HASHES.STRAND.HUNTER.ASPECTS.WIDOWS_SILK,
        SUBCLASS_HASHES.STRAND.HUNTER.ASPECTS.ENSNARING_SLAM,
      ],
      fragments: [
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_WARDING,
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_GENERATION,
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_MIND,
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_FINALITY,
      ],
      grenadeHash: SUBCLASS_HASHES.STRAND.HUNTER.GRENADES.GRAPPLE,
      meleeHash: SUBCLASS_HASHES.STRAND.HUNTER.MELEE.THREADED_SPIKE,
      classAbilityHash: SUBCLASS_HASHES.STRAND.HUNTER.CLASS_ABILITIES.MARKSMANS_DODGE,
    },
    playstyle:
      "Grapple grants Woven Mail (damage resist). Cyrtarachne's extends Woven Mail duration. Ensnaring Slam suspends groups. Final Warning marks suspended targets.",
    difficulty: Difficulty.Advanced,
  },
  {
    id: 'hunter-arc-shinobu',
    name: 'Skip Grenade Spam',
    element: ElementType.Arc,
    guardianClass: GuardianClass.Hunter,
    requiredExpansion: Expansion.BaseGame,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.RISKRUNNER,
      name: 'Riskrunner',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_HUNTER.SHINOBUS_VOW,
      name: "Shinobu's Vow",
      slot: ItemSlot.Arms,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.ARC.HUNTER.SUPER.GATHERING_STORM,
      aspects: [
        SUBCLASS_HASHES.ARC.HUNTER.ASPECTS.FLOW_STATE,
        SUBCLASS_HASHES.ARC.HUNTER.ASPECTS.LETHAL_CURRENT,
      ],
      fragments: [
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_SHOCK,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_IONS,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_DISCHARGE,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_RESISTANCE,
      ],
      grenadeHash: SUBCLASS_HASHES.ARC.HUNTER.GRENADES.SKIP,
      meleeHash: SUBCLASS_HASHES.ARC.HUNTER.MELEE.COMBINATION_BLOW,
      classAbilityHash: SUBCLASS_HASHES.ARC.HUNTER.CLASS_ABILITIES.GAMBLERS_DODGE,
    },
    playstyle:
      'Skip Grenades track aggressively and return energy on hit. Riskrunner protects you from Arc damage. constant grenade spam.',
    difficulty: Difficulty.Beginner,
  },
  {
    id: 'hunter-stasis-bakris',
    name: 'Shift Assassin',
    element: ElementType.Stasis,
    guardianClass: GuardianClass.Hunter,
    requiredExpansion: Expansion.BeyondLight,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.CLOUDSTRIKE,
      name: 'Cloudstrike',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_HUNTER.MASK_OF_BAKRIS,
      name: 'Mask of Bakris',
      slot: ItemSlot.Helmet,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.STASIS.HUNTER.SUPER.SILENCE_AND_SQUALL,
      aspects: [
        SUBCLASS_HASHES.STASIS.HUNTER.ASPECTS.TOUCH_OF_WINTER,
        SUBCLASS_HASHES.STASIS.HUNTER.ASPECTS.WINTERS_SHROUD,
      ],
      fragments: [
        SUBCLASS_HASHES.STASIS.FRAGMENTS.WHISPER_OF_HEDRONS,
        SUBCLASS_HASHES.STASIS.FRAGMENTS.WHISPER_OF_REFRACTION,
        SUBCLASS_HASHES.STASIS.FRAGMENTS.WHISPER_OF_DURANCE,
        SUBCLASS_HASHES.STASIS.FRAGMENTS.WHISPER_OF_SHARDS,
      ],
      grenadeHash: SUBCLASS_HASHES.STASIS.HUNTER.GRENADES.DUSKFIELD,
      meleeHash: SUBCLASS_HASHES.STASIS.HUNTER.MELEE.WITHERING_BLADE,
      classAbilityHash: SUBCLASS_HASHES.STASIS.HUNTER.CLASS_ABILITIES.MARKSMANS_DODGE,
    },
    playstyle:
      'Dodge becomes a teleport (Shift) that boosts Arc and Stasis weapon damage. Cloudstrike creates lightning storms. High burst damage.',
    difficulty: Difficulty.Advanced,
  },
  // New Gyrfalcon Build
  {
    id: 'hunter-void-gyrfalcon',
    name: 'Volatile Executioner',
    element: ElementType.Void,
    guardianClass: GuardianClass.Hunter,
    requiredExpansion: Expansion.WitchQueen,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.COLLECTIVE_OBLIGATION,
      name: 'Collective Obligation',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_HUNTER.GYRFALCONS_HAUBERK,
      name: 'Gyrfalcon\'s Hauberk',
      slot: ItemSlot.Chest,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.VOID.HUNTER.SUPER.SHADOWSHOT_MOEBIUS_QUIVER,
      aspects: [
        SUBCLASS_HASHES.VOID.HUNTER.ASPECTS.STYLISH_EXECUTIONER,
        SUBCLASS_HASHES.VOID.HUNTER.ASPECTS.VANISHING_STEP,
      ],
      fragments: [
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_STARVATION,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_PERSISTENCE,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_OBSCURITY,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_UNDERMINING,
      ],
      grenadeHash: SUBCLASS_HASHES.VOID.HUNTER.GRENADES.VORTEX,
      meleeHash: SUBCLASS_HASHES.VOID.HUNTER.MELEE.SNARE_BOMB,
      classAbilityHash: SUBCLASS_HASHES.VOID.HUNTER.CLASS_ABILITIES.GAMBLERS_DODGE,
    },
    playstyle:
      'Invisibility grants Volatile Rounds. Finisher grants Invisibility. Loop: Invis -> Volatile Kills -> Invis -> Repeat. Collective Obligation leeches Void Debuffs for infinite uptime.',
    difficulty: Difficulty.Intermediate,
  },

  // ===== WARLOCK BUILDS =====
  // New Sunbracers Build
  {
    id: 'warlock-solar-sunbracers',
    name: 'Solar Grenade Hell',
    element: ElementType.Solar,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.BaseGame,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.SUNSHOT,
      name: 'Sunshot',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_WARLOCK.SUNBRACERS,
      name: 'Sunbracers',
      slot: ItemSlot.Arms,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.SOLAR.WARLOCK.SUPER.WELL_OF_RADIANCE,
      aspects: [
        SUBCLASS_HASHES.SOLAR.WARLOCK.ASPECTS.TOUCH_OF_FLAME,
        SUBCLASS_HASHES.SOLAR.WARLOCK.ASPECTS.HEAT_RISES,
      ],
      fragments: [
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SINGEING,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_ASHES,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SEARING,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_EMPYREAN,
      ],
      grenadeHash: SUBCLASS_HASHES.SOLAR.WARLOCK.GRENADES.SOLAR,
      meleeHash: SUBCLASS_HASHES.SOLAR.WARLOCK.MELEE.INCINERATOR_SNAP,
      classAbilityHash: SUBCLASS_HASHES.SOLAR.WARLOCK.CLASS_ABILITIES.PHOENIX_DIVE,
    },
    playstyle:
      'Get a powered melee kill to gain infinite Solar Grenade energy. Flood the map with mini-suns. Heat Rises lets you fire from the sky. Snap fingers, burn everything.',
    difficulty: Difficulty.Intermediate,
  },
  // New Osmiomancy Build
  {
    id: 'warlock-stasis-osmiomancy',
    name: 'Bleak Watcher Controller',
    element: ElementType.Stasis,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.WitchQueen,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.KINETIC.AGERS_SCEPTER,
      name: 'Ager\'s Scepter',
      slot: ItemSlot.Kinetic,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_WARLOCK.OSMIOMANCY_GLOVES,
      name: 'Osmiomancy Gloves',
      slot: ItemSlot.Arms,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.STASIS.WARLOCK.SUPER.WINTERS_WRATH,
      aspects: [
        SUBCLASS_HASHES.STASIS.WARLOCK.ASPECTS.BLEAK_WATCHER,
        SUBCLASS_HASHES.STASIS.WARLOCK.ASPECTS.ICEFLARE_BOLTS,
      ],
      fragments: [
        SUBCLASS_HASHES.STASIS.FRAGMENTS.WHISPER_OF_DURANCE,
        SUBCLASS_HASHES.STASIS.FRAGMENTS.WHISPER_OF_TORMENT,
        SUBCLASS_HASHES.STASIS.FRAGMENTS.WHISPER_OF_SHARDS,
        SUBCLASS_HASHES.STASIS.FRAGMENTS.WHISPER_OF_FISSURES,
      ],
      grenadeHash: SUBCLASS_HASHES.STASIS.WARLOCK.GRENADES.COLDSNAP,
      meleeHash: SUBCLASS_HASHES.STASIS.WARLOCK.MELEE.PENUMBRAL_BLAST,
      classAbilityHash: SUBCLASS_HASHES.STASIS.WARLOCK.CLASS_ABILITIES.HEALING_RIFT,
    },
    playstyle:
      'Throw Coldsnap grenades to spawn Bleak Watchers. Osmiomancy gives two charges. Ager\'s Scepter freezes what the turrets miss. Total battlefield lockdown.',
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'warlock-void-nezarec',
    name: "Nezarec's Devour",
    element: ElementType.Void,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.BaseGame,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.GRAVITON_LANCE,
      name: 'Graviton Lance',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_WARLOCK.NEZARECS_SIN,
      name: "Nezarec's Sin",
      slot: ItemSlot.Helmet,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.VOID.WARLOCK.SUPER.NOVA_BOMB_VORTEX,
      aspects: [
        SUBCLASS_HASHES.VOID.WARLOCK.ASPECTS.FEED_THE_VOID,
        SUBCLASS_HASHES.VOID.WARLOCK.ASPECTS.CHAOS_ACCELERANT,
      ],
      fragments: [
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_INSTABILITY,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_UNDERMINING,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_STARVATION,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_REMNANTS,
      ],
      meleeHash: SUBCLASS_HASHES.VOID.WARLOCK.MELEE.POCKET_SINGULARITY,
      grenadeHash: SUBCLASS_HASHES.VOID.WARLOCK.GRENADES.VORTEX,
      classAbilityHash: SUBCLASS_HASHES.VOID.WARLOCK.CLASS_ABILITIES.HEALING_RIFT,
    },
    playstyle:
      "Void kills proc Nezarec's for ability regen. Devour heals on every kill. Graviton chains Void explosions. Nearly immortal add-clear machine.",
    difficulty: Difficulty.Beginner,
  },
  {
    id: 'warlock-solar-well',
    name: 'Well of Radiance Support',
    element: ElementType.Solar,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.BaseGame,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.SUNSHOT,
      name: 'Sunshot',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_WARLOCK.PHOENIX_PROTOCOL,
      name: 'Phoenix Protocol',
      slot: ItemSlot.Chest,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.SOLAR.WARLOCK.SUPER.WELL_OF_RADIANCE,
      aspects: [
        SUBCLASS_HASHES.SOLAR.WARLOCK.ASPECTS.TOUCH_OF_FLAME,
        SUBCLASS_HASHES.SOLAR.WARLOCK.ASPECTS.ICARUS_DASH,
      ],
      fragments: [
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_BENEVOLENCE,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SOLACE,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_TORCHES,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SINGEING,
      ],
      grenadeHash: SUBCLASS_HASHES.SOLAR.WARLOCK.GRENADES.FUSION,
      meleeHash: SUBCLASS_HASHES.SOLAR.WARLOCK.MELEE.INCINERATOR_SNAP,
      classAbilityHash: SUBCLASS_HASHES.SOLAR.WARLOCK.CLASS_ABILITIES.HEALING_RIFT,
    },
    playstyle:
      'Well keeps team alive and boosts damage. Phoenix Protocol refunds Super on kills in Well. Essential for endgame raids.',
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'warlock-arc-chaos-reach',
    name: 'Chaos Reach DPS',
    element: ElementType.Arc,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.BaseGame,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.POWER.THUNDERLORD,
      name: 'Thunderlord',
      slot: ItemSlot.Power,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_WARLOCK.GEOMAG_STABILIZERS,
      name: 'Geomag Stabilizers',
      slot: ItemSlot.Legs,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.ARC.WARLOCK.SUPER.CHAOS_REACH,
      aspects: [
        SUBCLASS_HASHES.ARC.WARLOCK.ASPECTS.ELECTROSTATIC_MIND,
        SUBCLASS_HASHES.ARC.WARLOCK.ASPECTS.ARC_SOUL,
      ],
      fragments: [
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_IONS,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_DISCHARGE,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_FOCUS,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_BEACONS,
      ],
      grenadeHash: SUBCLASS_HASHES.ARC.WARLOCK.GRENADES.PULSE,
      meleeHash: SUBCLASS_HASHES.ARC.WARLOCK.MELEE.CHAIN_LIGHTNING,
      classAbilityHash: SUBCLASS_HASHES.ARC.WARLOCK.CLASS_ABILITIES.HEALING_RIFT,
    },
    playstyle:
      'Geomags extend Chaos Reach duration. Sprint to top off Super. Cancel early to save energy. Great sustained boss DPS.',
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'warlock-strand-swarmers',
    name: 'Threadling Swarm',
    element: ElementType.Strand,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.Lightfall,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.KINETIC.OSTEO_STRIGA,
      name: 'Osteo Striga',
      slot: ItemSlot.Kinetic,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_WARLOCK.SWARMERS,
      name: 'Swarmers',
      slot: ItemSlot.Legs,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.STRAND.WARLOCK.SUPER.NEEDLESTORM,
      aspects: [
        SUBCLASS_HASHES.STRAND.WARLOCK.ASPECTS.MINDSPUN_INVOCATION,
        SUBCLASS_HASHES.STRAND.WARLOCK.ASPECTS.WEAVERS_CALL,
      ],
      fragments: [
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_EVOLUTION,
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_GENERATION,
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_MIND,
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_FINALITY,
      ],
      grenadeHash: SUBCLASS_HASHES.STRAND.WARLOCK.GRENADES.THREADLING,
      meleeHash: SUBCLASS_HASHES.STRAND.WARLOCK.MELEE.ARCANE_NEEDLE,
      classAbilityHash: SUBCLASS_HASHES.STRAND.WARLOCK.CLASS_ABILITIES.HEALING_RIFT,
    },
    playstyle:
      'Threadlings unravel enemies, creating more Threadlings. Osteo Striga spreads poison. Constant chain reactions of add clear.',
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'hunter-stasis-renewal',
    name: 'Renewal Tank',
    element: ElementType.Stasis,
    guardianClass: GuardianClass.Hunter,
    requiredExpansion: Expansion.WitchQueen,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.AGERS_SCEPTER,
      name: "Ager's Scepter",
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_HUNTER.RENEWAL_GRASPS,
      name: 'Renewal Grasps',
      slot: ItemSlot.Arms,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.STASIS.HUNTER.SUPER.SILENCE_AND_SQUALL,
      aspects: [
        SUBCLASS_HASHES.STASIS.HUNTER.ASPECTS.GRIM_HARVEST,
        SUBCLASS_HASHES.STASIS.HUNTER.ASPECTS.TOUCH_OF_WINTER,
      ],
      fragments: [
        SUBCLASS_HASHES.STASIS.FRAGMENTS.WHISPER_OF_CHAINS,
        SUBCLASS_HASHES.STASIS.FRAGMENTS.WHISPER_OF_DURANCE,
        SUBCLASS_HASHES.STASIS.FRAGMENTS.WHISPER_OF_TORMENT,
        SUBCLASS_HASHES.STASIS.FRAGMENTS.WHISPER_OF_CONDUCTION,
      ],
      grenadeHash: SUBCLASS_HASHES.STASIS.HUNTER.GRENADES.DUSKFIELD,
      meleeHash: SUBCLASS_HASHES.STASIS.HUNTER.MELEE.WITHERING_BLADE,
      classAbilityHash: SUBCLASS_HASHES.STASIS.HUNTER.CLASS_ABILITIES.MARKSMANS_DODGE,
    },
    playstyle:
      'Throw massive Duskfields to tank incoming damage. Enemies inside do less damage, allies take less. Ager Scepter freezes targets for Grim Harvest shards.',
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'warlock-arc-crown',
    name: 'Storm Crown',
    element: ElementType.Arc,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.BaseGame,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.RISKRUNNER,
      name: 'Riskrunner',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_WARLOCK.CROWN_OF_TEMPESTS,
      name: 'Crown of Tempests',
      slot: ItemSlot.Helmet,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.ARC.WARLOCK.SUPER.STORMTRANCE,
      aspects: [
        SUBCLASS_HASHES.ARC.WARLOCK.ASPECTS.ELECTROSTATIC_MIND,
        SUBCLASS_HASHES.ARC.WARLOCK.ASPECTS.LIGHTNING_SURGE,
      ],
      fragments: [
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_DISCHARGE,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_SHOCK,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_IONS,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_MAGNITUDE,
      ],
      grenadeHash: SUBCLASS_HASHES.ARC.WARLOCK.GRENADES.STORM,
      meleeHash: SUBCLASS_HASHES.ARC.WARLOCK.MELEE.CHAIN_LIGHTNING,
      classAbilityHash: SUBCLASS_HASHES.ARC.WARLOCK.CLASS_ABILITIES.HEALING_RIFT,
    },
    playstyle:
      'Arc ability kills recharge abilities fast. Stormtrance lasts longer. Slide to teleport and zap enemies. Speed and power.',
    difficulty: Difficulty.Intermediate,
    armorMods: [
      3832366019, // Arc Siphon
      1546944321, // Arc Surge
      2319885414, // Firepower
      14619736,   // Heavy Handed
      40751621,   // Reaper
      4188291233  // Bomber
    ]
  },
  {
    id: 'warlock-stasis-ballidorse',
    name: 'Winter General',
    element: ElementType.Stasis,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.Lightfall,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.KINETIC.VERGLAS_CURVE,
      name: 'Verglas Curve',
      slot: ItemSlot.Kinetic,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_WARLOCK.BALLIDORSE_WRATHWEAVERS,
      name: 'Ballidorse Wrathweavers',
      slot: ItemSlot.Arms,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.STASIS.WARLOCK.SUPER.WINTERS_WRATH,
      aspects: [
        SUBCLASS_HASHES.STASIS.WARLOCK.ASPECTS.GLACIAL_HARVEST,
        SUBCLASS_HASHES.STASIS.WARLOCK.ASPECTS.BLEAK_WATCHER,
      ],
      fragments: [
        SUBCLASS_HASHES.STASIS.FRAGMENTS.WHISPER_OF_RIME,
        SUBCLASS_HASHES.STASIS.FRAGMENTS.WHISPER_OF_SHARDS,
        SUBCLASS_HASHES.STASIS.FRAGMENTS.WHISPER_OF_CHAINS,
        SUBCLASS_HASHES.STASIS.FRAGMENTS.WHISPER_OF_CONDUCTION,
      ],
      grenadeHash: SUBCLASS_HASHES.STASIS.WARLOCK.GRENADES.COLDSNAP,
      meleeHash: SUBCLASS_HASHES.STASIS.WARLOCK.MELEE.PENUMBRAL_BLAST,
      classAbilityHash: SUBCLASS_HASHES.STASIS.WARLOCK.CLASS_ABILITIES.HEALING_RIFT,
    },
    playstyle:
      'Super shatter damage buffed by Ballidorse. Rift grants Stasis weapon surge to team. Bleak Watcher controls the room.',
    difficulty: Difficulty.Advanced,
  },
  // ===== PRISMATIC BUILDS =====
  {
    id: 'titan-prismatic-consecration',
    name: 'Prismatic Consecration',
    element: ElementType.Prismatic,
    guardianClass: GuardianClass.Titan,
    requiredExpansion: Expansion.FinalShape,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.RISKRUNNER,
      name: 'Riskrunner',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_TITAN.SYNTHOCEPS,
      name: 'Synthoceps',
      slot: ItemSlot.Arms,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.PRISMATIC.TITAN.SUPER.TWILIGHT_ARSENAL,
      aspects: [
        SUBCLASS_HASHES.PRISMATIC.TITAN.ASPECTS.CONSECRATION,
        SUBCLASS_HASHES.PRISMATIC.TITAN.ASPECTS.KNOCKOUT,
      ],
      fragments: [
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_RUIN,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PROTECTION,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_COURAGE,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_DAWN,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_HOPE,
      ],
      grenadeHash: SUBCLASS_HASHES.PRISMATIC.TITAN.GRENADES.GLACIER,
      meleeHash: SUBCLASS_HASHES.PRISMATIC.TITAN.MELEE.FRENZIED_BLADE,
      classAbilityHash: SUBCLASS_HASHES.PRISMATIC.TITAN.CLASS_ABILITIES.THRUSTER,
    },
    playstyle:
      'Slide > Melee to slam three times with Consecration. Frenzied Blade gives 3 charges. Pick up Orbs for Radiant/Protection.',
    difficulty: Difficulty.Advanced,
  },
  {
    id: 'hunter-prismatic-ascension',
    name: 'Prismatic Ascension',
    element: ElementType.Prismatic,
    guardianClass: GuardianClass.Hunter,
    requiredExpansion: Expansion.FinalShape,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.ERIANAS_VOW,
      name: "Eriana's Vow",
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_HUNTER.GIFTED_CONVICTION,
      name: 'Gifted Conviction',
      slot: ItemSlot.Chest,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.SUPER.SILENCE_AND_SQUALL,
      aspects: [
        SUBCLASS_HASHES.PRISMATIC.HUNTER.ASPECTS.ASCENSION,
        SUBCLASS_HASHES.PRISMATIC.HUNTER.ASPECTS.STYLISH_EXECUTIONER,
      ],
      fragments: [
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_HOPE,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_DAWN,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PROTECTION,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_RUIN,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_COURAGE,
      ],
      grenadeHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.GRENADES.GRAPPLE,
      meleeHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.MELEE.WITHERING_BLADE,
      classAbilityHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.CLASS_ABILITIES.GAMBLERS_DODGE,
    },
    playstyle:
      "Use abilities to become Radiante, Restoration, and cure teammates. Speakers Sight generates Orbs and healing turrets.",
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'titan-renegade-praxic',
    name: 'Praxic Knight',
    element: ElementType.Solar,
    guardianClass: GuardianClass.Titan,
    requiredExpansion: Expansion.Renegade,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.ERGO_SUM,
      name: 'Ergo Sum',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_TITAN.PRAXIC_VESTMENT,
      name: 'Praxic Vestment',
      slot: ItemSlot.Chest,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.SOLAR.TITAN.SUPER.BURNING_MAUL,
      aspects: [
        SUBCLASS_HASHES.SOLAR.TITAN.ASPECTS.SOL_INVICTUS,
        SUBCLASS_HASHES.SOLAR.TITAN.ASPECTS.CONSECRATION,
      ],
      fragments: [
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_TORCHES,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_EMPYREAN,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_CHAR,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_ERUPTION,
      ],
      grenadeHash: SUBCLASS_HASHES.SOLAR.TITAN.GRENADES.THERMITE,
      meleeHash: SUBCLASS_HASHES.SOLAR.TITAN.MELEE.THROWING_HAMMER,
      classAbilityHash: SUBCLASS_HASHES.SOLAR.TITAN.CLASS_ABILITIES.TOWERING_BARRICADE,
    },
    playstyle:
      "Throwing Hammer returns on pickup. Synthoceps buffs melee and super damage. Ignite everything with hammers and slams.",
    difficulty: Difficulty.Beginner,
  },
  {
    id: 'warlock-renegade-deimos',
    name: 'Deimos Consumer',
    element: ElementType.Strand,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.Renegade,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.KINETIC.QUICKSILVER_STORM,
      name: 'Quicksilver Storm',
      slot: ItemSlot.Kinetic,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_WARLOCK.DEIMOSUFFUSION,
      name: 'Deimosuffusion',
      slot: ItemSlot.Helmet,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.STRAND.WARLOCK.SUPER.NEEDLESTORM,
      aspects: [
        SUBCLASS_HASHES.STRAND.WARLOCK.ASPECTS.MINDSPUN_INVOCATION,
        SUBCLASS_HASHES.STRAND.WARLOCK.ASPECTS.WEAVERS_CALL,
      ],
      fragments: [
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_EVOLUTION,
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_GENERATION,
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_MIND,
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_FINALITY,
      ],
      grenadeHash: SUBCLASS_HASHES.STRAND.WARLOCK.GRENADES.SHACKLE,
      meleeHash: SUBCLASS_HASHES.STRAND.WARLOCK.MELEE.ARCANE_NEEDLE,
      classAbilityHash: SUBCLASS_HASHES.STRAND.WARLOCK.CLASS_ABILITIES.HEALING_RIFT,
    },
    playstyle:
      "Deimosuffusion requires a Strand Super. Consume Shackle Grenade for suspending bursts. Needlestorm unravels everything.",
    difficulty: Difficulty.Advanced,
  },
  {
    id: 'warlock-renegade-praxic',
    name: 'Praxic Fire',
    element: ElementType.Solar,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.Renegade,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.ERGO_SUM,
      name: 'Ergo Sum',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_WARLOCK.RAIN_OF_FIRE,
      name: 'Rain of Fire',
      slot: ItemSlot.Legs,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.SOLAR.WARLOCK.SUPER.WELL_OF_RADIANCE,
      aspects: [
        SUBCLASS_HASHES.SOLAR.WARLOCK.ASPECTS.ICARUS_DASH,
        SUBCLASS_HASHES.SOLAR.WARLOCK.ASPECTS.TOUCH_OF_FLAME,
      ],
      fragments: [
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_EMPYREAN,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_TORCHES,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SOLACE,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_BENEVOLENCE,
      ],
      grenadeHash: SUBCLASS_HASHES.SOLAR.WARLOCK.GRENADES.HEALING,
      meleeHash: SUBCLASS_HASHES.SOLAR.WARLOCK.MELEE.INCINERATOR_SNAP,
      classAbilityHash: SUBCLASS_HASHES.SOLAR.WARLOCK.CLASS_ABILITIES.PHOENIX_DIVE,
    },
    playstyle:
      "Icarus Dash to activate Rain of Fire for weapon reloads and Radiant. Phoenix Dive for healing. Snap for ignitions.",
    difficulty: Difficulty.Advanced,
  },
  {
    id: 'hunter-renegade-praxic',
    name: 'Gunslinger Knight',
    element: ElementType.Solar,
    guardianClass: GuardianClass.Hunter,
    requiredExpansion: Expansion.Renegade,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.ERGO_SUM,
      name: 'Ergo Sum',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_HUNTER.SHARDS_OF_GALANOR,
      name: 'Shards of Galanor',
      slot: ItemSlot.Arms,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.SOLAR.HUNTER.SUPER.BLADE_BARRAGE,
      aspects: [
        SUBCLASS_HASHES.SOLAR.HUNTER.ASPECTS.KNOCK_EM_DOWN,
        SUBCLASS_HASHES.SOLAR.HUNTER.ASPECTS.ON_YOUR_MARK,
      ],
      fragments: [
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_TORCHES,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_COMBUSTION,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SINGEING,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_EMPYREAN,
      ],
      grenadeHash: SUBCLASS_HASHES.SOLAR.HUNTER.GRENADES.TRIPMINE,
      meleeHash: SUBCLASS_HASHES.SOLAR.HUNTER.MELEE.KNIFE_TRICK,
      classAbilityHash: SUBCLASS_HASHES.SOLAR.HUNTER.CLASS_ABILITIES.MARKSMANS_DODGE,
    },
    playstyle:
      "Spam Blade Barrage with Shards of Galanor refunding super energy. Knife Trick for ignitions and radiant. High damage output.",
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'titan-renegade-prismatic',
    name: 'Prismatic Lancer',
    element: ElementType.Prismatic,
    guardianClass: GuardianClass.Titan,
    requiredExpansion: Expansion.FinalShape,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.GRAVITON_LANCE,
      name: 'Graviton Lance',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_TITAN.HAZARDOUS_PROPULSION,
      name: 'Hazardous Propulsion',
      slot: ItemSlot.Chest,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.PRISMATIC.TITAN.SUPER.TWILIGHT_ARSENAL,
      aspects: [
        SUBCLASS_HASHES.PRISMATIC.TITAN.ASPECTS.KNOCKOUT,
        SUBCLASS_HASHES.PRISMATIC.TITAN.ASPECTS.DRENGRS_LASH,
      ],
      fragments: [
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_COMMAND,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_RUIN,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_HOPE,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_DAWN,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PROTECTION,
      ],
      grenadeHash: SUBCLASS_HASHES.PRISMATIC.TITAN.GRENADES.SHACKLE,
      meleeHash: SUBCLASS_HASHES.PRISMATIC.TITAN.MELEE.SHIELD_THROW,
      classAbilityHash: SUBCLASS_HASHES.PRISMATIC.TITAN.CLASS_ABILITIES.THRUSTER,
    },
    playstyle:
      "Hazardous Propulsion buffs Rocket Sidearms and Rockets, but here we use it for the missile barrage. Graviton Lance for range.",
    difficulty: Difficulty.Advanced,
  },
  {
    id: 'warlock-prismatic-general',
    name: 'Prismatic Weaver',
    element: ElementType.Prismatic,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.FinalShape,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.KINETIC.OUTBREAK_PERFECTED,
      name: 'Outbreak Perfected',
      slot: ItemSlot.Kinetic,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_WARLOCK.OSMIOMANCY_GLOVES,
      name: 'Osmiomancy Gloves',
      slot: ItemSlot.Arms,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.SUPER.NOVA_BOMB_CATACLYSM,
      aspects: [
        SUBCLASS_HASHES.PRISMATIC.WARLOCK.ASPECTS.FEED_THE_VOID,
        SUBCLASS_HASHES.PRISMATIC.WARLOCK.ASPECTS.BLEAK_WATCHER,
      ],
      fragments: [
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_RUIN,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PROTECTION,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PURPOSE,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_DOMINANCE,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_HOPE,
      ],
      grenadeHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.GRENADES.COLDSNAP,
      meleeHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.MELEE.ARCANE_NEEDLE,
      classAbilityHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.CLASS_ABILITIES.PHOENIX_DIVE,
    },
    playstyle:
      "Bleak Watcher turrets freeze everything. Devour keeps you alive. Outbreak spreads nanites to frozen targets.",
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'warlock-void-nothing-manacles',
    name: 'Scatter Nothingness',
    element: ElementType.Void,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.BaseGame,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.GRAVITON_LANCE,
      name: 'Graviton Lance',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_WARLOCK.NOTHING_MANACLES,
      name: 'Nothing Manacles',
      slot: ItemSlot.Arms,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.VOID.WARLOCK.SUPER.NOVA_BOMB_CATACLYSM,
      aspects: [
        SUBCLASS_HASHES.VOID.WARLOCK.ASPECTS.CHAOS_ACCELERANT,
        SUBCLASS_HASHES.VOID.WARLOCK.ASPECTS.FEED_THE_VOID,
      ],
      fragments: [
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_EXCHANGE,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_REMNANTS,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_UNDERMINING,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_INSTABILITY,
      ],
      grenadeHash: SUBCLASS_HASHES.VOID.WARLOCK.GRENADES.SCATTER,
      meleeHash: SUBCLASS_HASHES.VOID.WARLOCK.MELEE.POCKET_SINGULARITY,
      classAbilityHash: SUBCLASS_HASHES.VOID.WARLOCK.CLASS_ABILITIES.HEALING_RIFT,
    },
    playstyle:
      "Nothing Manacles gives two Scatter Grenades that track. Chaos Accelerant makes them deadly. Throw purple sprinkles everywhere.",
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'hunter-renegade-fortune',
    name: 'Fortunes Favor',
    element: ElementType.Strand,
    guardianClass: GuardianClass.Hunter,
    requiredExpansion: Expansion.Renegade,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.POWER.SERVICE_OF_LUZAKU,
      name: 'Service of Luzaku',
      slot: ItemSlot.Power,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_HUNTER.FORTUNES_FAVOR,
      name: "Fortune's Favor",
      slot: ItemSlot.Legs,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.STRAND.HUNTER.SUPER.SILKSTRIKE,
      aspects: [
        SUBCLASS_HASHES.STRAND.HUNTER.ASPECTS.WHIRLING_MAELSTROM,
        SUBCLASS_HASHES.STRAND.HUNTER.ASPECTS.WIDOWS_SILK,
      ],
      fragments: [
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_GENERATION,
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_ASCENT,
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_WARDING,
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_FURY,
      ],
      grenadeHash: SUBCLASS_HASHES.STRAND.HUNTER.GRENADES.GRAPPLE,
      meleeHash: SUBCLASS_HASHES.STRAND.HUNTER.MELEE.THREADED_SPIKE,
      classAbilityHash: SUBCLASS_HASHES.STRAND.HUNTER.CLASS_ABILITIES.MARKSMANS_DODGE,
    },
    playstyle:
      "Service of Luzaku (Strand LMG) creates Tangles on kills. Fortune's Favor makes Tangles track enemies and explode twice. Chaos!",
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'warlock-prismatic-getaway',
    name: 'Prismatic Turret Lord',
    element: ElementType.Prismatic,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.FinalShape,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.KINETIC.KHVOSTOV_7G_0X,
      name: 'Khvostov 7G-0X',
      slot: ItemSlot.Kinetic,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_WARLOCK.GETAWAY_ARTIST,
      name: 'Getaway Artist',
      slot: ItemSlot.Arms,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.SUPER.NEEDLESTORM,
      aspects: [
        SUBCLASS_HASHES.PRISMATIC.WARLOCK.ASPECTS.FEED_THE_VOID,
        SUBCLASS_HASHES.PRISMATIC.WARLOCK.ASPECTS.BLEAK_WATCHER,
      ],
      fragments: [
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_RUIN,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PROTECTION,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_HOPE,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_DAWN,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PURPOSE,
      ],
      grenadeHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.GRENADES.STORM,
      meleeHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.MELEE.ARCANE_NEEDLE,
      classAbilityHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.CLASS_ABILITIES.PHOENIX_DIVE,
    },
    playstyle:
      "Consume grenade to spawn Arc Soul AND Bleak Watcher (Stasis Turret). Feed the Void grants Devour. Arcane Needle for Unravel.",
    difficulty: Difficulty.Beginner,
  },
  {
    id: 'hunter-prismatic-liar',
    name: 'Prismatic Punch',
    element: ElementType.Prismatic,
    guardianClass: GuardianClass.Hunter,
    requiredExpansion: Expansion.FinalShape,
    exoticArmor: {
      hash: EXOTIC_ARMOR_HUNTER.LIARS_HANDSHAKE,
      name: "Liar's Handshake",
      slot: ItemSlot.Arms,
    },
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.KINETIC.STILL_HUNT_OR_SIMILAR, // Or any good kinetic
      name: 'Still Hunt',
      slot: ItemSlot.Energy
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.SUPER.SILKSTRIKE,
      aspects: [
        SUBCLASS_HASHES.PRISMATIC.HUNTER.ASPECTS.STYLISH_EXECUTIONER,
        SUBCLASS_HASHES.PRISMATIC.HUNTER.ASPECTS.WINTERS_SHROUD
      ],
      fragments: [
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_DAWN,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PROTECTION,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_RUIN,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_HOPE,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_COURAGE
      ],
      grenadeHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.GRENADES.GRAPPLE,
      meleeHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.MELEE.COMBINATION_BLOW,
      classAbilityHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.CLASS_ABILITIES.GAMBLERS_DODGE
    },
    playstyle: "Grapple melee or Combination Blow triggers Liar's Handshake. Stylish Executioner gives Invis on debuff kill. Slows nearby enemies on dodge.",
    difficulty: Difficulty.Advanced
  },
  // ===== ADDITIONAL TITAN BUILDS =====
  {
    id: 'titan-solar-loreley',
    name: 'Immortal Sunspot',
    element: ElementType.Solar,
    guardianClass: GuardianClass.Titan,
    requiredExpansion: Expansion.WitchQueen,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.TOMMYS_MATCHBOOK,
      name: "Tommy's Matchbook",
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_TITAN.LORELEY_SPLENDOR,
      name: 'Loreley Splendor',
      slot: ItemSlot.Helmet,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.SOLAR.TITAN.SUPER.HAMMER_OF_SOL,
      aspects: [
        SUBCLASS_HASHES.SOLAR.TITAN.ASPECTS.SOL_INVICTUS,
        SUBCLASS_HASHES.SOLAR.TITAN.ASPECTS.ROARING_FLAMES,
      ],
      fragments: [
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SOLACE,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_EMPYREAN,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_TORCHES,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SINGEING,
      ],
      grenadeHash: SUBCLASS_HASHES.SOLAR.TITAN.GRENADES.FUSION,
      meleeHash: SUBCLASS_HASHES.SOLAR.TITAN.MELEE.THROWING_HAMMER,
      classAbilityHash: SUBCLASS_HASHES.SOLAR.TITAN.CLASS_ABILITIES.RALLY_BARRICADE,
    },
    playstyle:
      'Loreley creates Sunspots when critically wounded. Tommy\'s self-damage triggers this constantly. Unkillable with proper timing.',
    difficulty: Difficulty.Advanced,
  },
  {
    id: 'titan-void-helm-saint14',
    name: 'Blinding Defender',
    element: ElementType.Void,
    guardianClass: GuardianClass.Titan,
    requiredExpansion: Expansion.BaseGame,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.KINETIC.BASTION,
      name: 'Bastion',
      slot: ItemSlot.Kinetic,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_TITAN.HELM_OF_SAINT_14,
      name: 'Helm of Saint-14',
      slot: ItemSlot.Helmet,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.VOID.TITAN.SUPER.WARD_OF_DAWN,
      aspects: [
        SUBCLASS_HASHES.VOID.TITAN.ASPECTS.BASTION,
        SUBCLASS_HASHES.VOID.TITAN.ASPECTS.OFFENSIVE_BULWARK,
      ],
      fragments: [
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_UNDERMINING,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_HARVEST,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_PERSISTENCE,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_DOMINEERING,
      ],
      grenadeHash: SUBCLASS_HASHES.VOID.TITAN.GRENADES.SUPPRESSOR,
      meleeHash: SUBCLASS_HASHES.VOID.TITAN.MELEE.SHIELD_BASH,
      classAbilityHash: SUBCLASS_HASHES.VOID.TITAN.CLASS_ABILITIES.TOWERING_BARRICADE,
    },
    playstyle:
      'Helm of Saint-14 blinds enemies entering your bubble. Bastion for aggressive suppression. Team support through bubble overshield.',
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'titan-arc-skullfort',
    name: 'Shoulder Charge Loop',
    element: ElementType.Arc,
    guardianClass: GuardianClass.Titan,
    requiredExpansion: Expansion.BaseGame,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.RISKRUNNER,
      name: 'Riskrunner',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_TITAN.AN_INSURMOUNTABLE_SKULLFORT,
      name: 'An Insurmountable Skullfort',
      slot: ItemSlot.Helmet,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.ARC.TITAN.SUPER.FISTS_OF_HAVOC,
      aspects: [
        SUBCLASS_HASHES.ARC.TITAN.ASPECTS.KNOCKOUT,
        SUBCLASS_HASHES.ARC.TITAN.ASPECTS.JUGGERNAUT,
      ],
      fragments: [
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_MOMENTUM,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_RECHARGE,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_IONS,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_AMPLITUDE,
      ],
      grenadeHash: SUBCLASS_HASHES.ARC.TITAN.GRENADES.FLASHBANG,
      meleeHash: SUBCLASS_HASHES.ARC.TITAN.MELEE.SEISMIC_STRIKE,
      classAbilityHash: SUBCLASS_HASHES.ARC.TITAN.CLASS_ABILITIES.THRUSTER,
    },
    playstyle:
      'Melee kills instantly refund your melee. Sprint -> Shoulder Charge -> repeat. Healing on every kill.',
    difficulty: Difficulty.Beginner,
  },
  {
    id: 'titan-strand-flechette',
    name: 'Tangle Storm',
    element: ElementType.Strand,
    guardianClass: GuardianClass.Titan,
    requiredExpansion: Expansion.Lightfall,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.KINETIC.QUICKSILVER_STORM,
      name: 'Quicksilver Storm',
      slot: ItemSlot.Kinetic,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_TITAN.HEART_OF_INMOST_LIGHT,
      name: 'Heart of Inmost Light',
      slot: ItemSlot.Chest,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.STRAND.TITAN.SUPER.BLADEFURY,
      aspects: [
        SUBCLASS_HASHES.STRAND.TITAN.ASPECTS.FLECHETTE_STORM,
        SUBCLASS_HASHES.STRAND.TITAN.ASPECTS.INTO_THE_FRAY,
      ],
      fragments: [
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_GENERATION,
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_FURY,
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_WARDING,
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_FINALITY,
      ],
      grenadeHash: SUBCLASS_HASHES.STRAND.TITAN.GRENADES.THREADLING,
      meleeHash: SUBCLASS_HASHES.STRAND.TITAN.MELEE.FRENZIED_BLADE,
      classAbilityHash: SUBCLASS_HASHES.STRAND.TITAN.CLASS_ABILITIES.RALLY_BARRICADE,
    },
    playstyle:
      'Flechette Storm launches projectiles while suspended. Quicksilver creates Tangles. Destroy Tangles for massive AoE damage.',
    difficulty: Difficulty.Advanced,
  },
  {
    id: 'hunter-void-stylish',
    name: 'Stylish Executioner',
    element: ElementType.Void,
    guardianClass: GuardianClass.Hunter,
    requiredExpansion: Expansion.WitchQueen,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.GRAVITON_LANCE,
      name: 'Graviton Lance',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_HUNTER.GRAVITON_FORFEIT,
      name: 'Graviton Forfeit',
      slot: ItemSlot.Helmet,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.VOID.HUNTER.SUPER.SPECTRAL_BLADES,
      aspects: [
        SUBCLASS_HASHES.VOID.HUNTER.ASPECTS.STYLISH_EXECUTIONER,
        SUBCLASS_HASHES.VOID.HUNTER.ASPECTS.VANISHING_STEP,
      ],
      fragments: [
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_OBSCURITY,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_INSTABILITY,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_UNDERMINING,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_PERSISTENCE,
      ],
      grenadeHash: SUBCLASS_HASHES.VOID.HUNTER.GRENADES.VORTEX,
      meleeHash: SUBCLASS_HASHES.VOID.HUNTER.MELEE.SNARE_BOMB,
      classAbilityHash: SUBCLASS_HASHES.VOID.HUNTER.CLASS_ABILITIES.GAMBLERS_DODGE,
    },
    playstyle:
      'Kill weakened/volatile enemies for constant invisibility. Graviton Lance chains Void explosions. Extended invis with Graviton Forfeit.',
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'hunter-arc-raiden',
    name: 'Infinite Arc Staff',
    element: ElementType.Arc,
    guardianClass: GuardianClass.Hunter,
    requiredExpansion: Expansion.BaseGame,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.TRINITY_GHOUL,
      name: 'Trinity Ghoul',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_HUNTER.RAIDEN_FLUX,
      name: 'Raiden Flux',
      slot: ItemSlot.Chest,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.ARC.HUNTER.SUPER.ARC_STAFF,
      aspects: [
        SUBCLASS_HASHES.ARC.HUNTER.ASPECTS.LETHAL_CURRENT,
        SUBCLASS_HASHES.ARC.HUNTER.ASPECTS.FLOW_STATE,
      ],
      fragments: [
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_RESISTANCE,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_SHOCK,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_IONS,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_AMPLITUDE,
      ],
      grenadeHash: SUBCLASS_HASHES.ARC.HUNTER.GRENADES.ARCBOLT,
      meleeHash: SUBCLASS_HASHES.ARC.HUNTER.MELEE.COMBINATION_BLOW,
      classAbilityHash: SUBCLASS_HASHES.ARC.HUNTER.CLASS_ABILITIES.GAMBLERS_DODGE,
    },
    playstyle:
      'Raiden Flux extends Arc Staff duration with each hit. Trinity Ghoul for add clear. Chain lightning everywhere.',
    difficulty: Difficulty.Beginner,
  },
  {
    id: 'hunter-strand-specter',
    name: 'Specter Swarm',
    element: ElementType.Strand,
    guardianClass: GuardianClass.Hunter,
    requiredExpansion: Expansion.Lightfall,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.KINETIC.WISH_KEEPER,
      name: 'Wish-Keeper',
      slot: ItemSlot.Kinetic,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_HUNTER.THE_SIXTH_COYOTE,
      name: 'The Sixth Coyote',
      slot: ItemSlot.Chest,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.STRAND.HUNTER.SUPER.SILKSTRIKE,
      aspects: [
        SUBCLASS_HASHES.STRAND.HUNTER.ASPECTS.THREADED_SPECTER,
        SUBCLASS_HASHES.STRAND.HUNTER.ASPECTS.WIDOWS_SILK,
      ],
      fragments: [
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_MIND,
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_GENERATION,
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_FINALITY,
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_WARDING,
      ],
      grenadeHash: SUBCLASS_HASHES.STRAND.HUNTER.GRENADES.THREADLING,
      meleeHash: SUBCLASS_HASHES.STRAND.HUNTER.MELEE.THREADED_SPIKE,
      classAbilityHash: SUBCLASS_HASHES.STRAND.HUNTER.CLASS_ABILITIES.GAMBLERS_DODGE,
    },
    playstyle:
      'Dodge creates a Specter clone that draws aggro. Sixth Coyote gives two dodge charges. Constant decoys and Threadlings.',
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'hunter-prismatic-storms-edge',
    name: 'Prismatic Storm',
    element: ElementType.Prismatic,
    guardianClass: GuardianClass.Hunter,
    requiredExpansion: Expansion.FinalShape,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.CLOUDSTRIKE,
      name: 'Cloudstrike',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_HUNTER.RAIJUS_HARNESS,
      name: "Raiju's Harness",
      slot: ItemSlot.Chest,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.SUPER.STORMS_EDGE,
      aspects: [
        SUBCLASS_HASHES.PRISMATIC.HUNTER.ASPECTS.ASCENSION,
        SUBCLASS_HASHES.PRISMATIC.HUNTER.ASPECTS.THREADED_SPECTER,
      ],
      fragments: [
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_DAWN,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_RUIN,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PROTECTION,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_COURAGE,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_HOPE,
      ],
      grenadeHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.GRENADES.ARCBOLT,
      meleeHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.MELEE.COMBINATION_BLOW,
      classAbilityHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.CLASS_ABILITIES.GAMBLERS_DODGE,
    },
    playstyle:
      'Storm\'s Edge is a devastating throwing super. Ascension jolts on dodge. Cloudstrike for lightning storms.',
    difficulty: Difficulty.Advanced,
  },
  // ===== ADDITIONAL WARLOCK BUILDS =====
  {
    id: 'warlock-void-contraverse',
    name: 'Charged Void',
    element: ElementType.Void,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.BaseGame,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.LE_MONARQUE,
      name: 'Le Monarque',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_WARLOCK.CONTRAVERSE_HOLD,
      name: 'Contraverse Hold',
      slot: ItemSlot.Arms,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.VOID.WARLOCK.SUPER.NOVA_BOMB_CATACLYSM,
      aspects: [
        SUBCLASS_HASHES.VOID.WARLOCK.ASPECTS.CHAOS_ACCELERANT,
        SUBCLASS_HASHES.VOID.WARLOCK.ASPECTS.FEED_THE_VOID,
      ],
      fragments: [
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_UNDERMINING,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_INSTABILITY,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_REMNANTS,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_STARVATION,
      ],
      grenadeHash: SUBCLASS_HASHES.VOID.WARLOCK.GRENADES.VORTEX,
      meleeHash: SUBCLASS_HASHES.VOID.WARLOCK.MELEE.POCKET_SINGULARITY,
      classAbilityHash: SUBCLASS_HASHES.VOID.WARLOCK.CLASS_ABILITIES.EMPOWERING_RIFT,
    },
    playstyle:
      'Charge grenades for massive damage. Contraverse refunds grenade energy on hit. Constant super-charged grenades.',
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'warlock-solar-dawn',
    name: 'Wings of Dawn',
    element: ElementType.Solar,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.BaseGame,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.SUNSHOT,
      name: 'Sunshot',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_WARLOCK.WINGS_OF_SACRED_DAWN,
      name: 'Wings of Sacred Dawn',
      slot: ItemSlot.Chest,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.SOLAR.WARLOCK.SUPER.DAYBREAK,
      aspects: [
        SUBCLASS_HASHES.SOLAR.WARLOCK.ASPECTS.HEAT_RISES,
        SUBCLASS_HASHES.SOLAR.WARLOCK.ASPECTS.ICARUS_DASH,
      ],
      fragments: [
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_EMPYREAN,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_TORCHES,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SINGEING,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SOLACE,
      ],
      grenadeHash: SUBCLASS_HASHES.SOLAR.WARLOCK.GRENADES.FIREBOLT,
      meleeHash: SUBCLASS_HASHES.SOLAR.WARLOCK.MELEE.CELESTIAL_FIRE,
      classAbilityHash: SUBCLASS_HASHES.SOLAR.WARLOCK.CLASS_ABILITIES.PHOENIX_DIVE,
    },
    playstyle:
      'Hover in the air with precision kills. Wings of Sacred Dawn grants damage resist while airborne. Aerial combat master.',
    difficulty: Difficulty.Advanced,
  },
  {
    id: 'warlock-arc-fallen-sunstar',
    name: 'Ionic Traces',
    element: ElementType.Arc,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.Lightfall,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.DELICATE_TOMB,
      name: 'Delicate Tomb',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_WARLOCK.FALLEN_SUNSTAR,
      name: 'Fallen Sunstar',
      slot: ItemSlot.Helmet,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.ARC.WARLOCK.SUPER.CHAOS_REACH,
      aspects: [
        SUBCLASS_HASHES.ARC.WARLOCK.ASPECTS.ELECTROSTATIC_MIND,
        SUBCLASS_HASHES.ARC.WARLOCK.ASPECTS.ARC_SOUL,
      ],
      fragments: [
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_IONS,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_MAGNITUDE,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_SHOCK,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_BEACONS,
      ],
      grenadeHash: SUBCLASS_HASHES.ARC.WARLOCK.GRENADES.STORM,
      meleeHash: SUBCLASS_HASHES.ARC.WARLOCK.MELEE.BALL_LIGHTNING,
      classAbilityHash: SUBCLASS_HASHES.ARC.WARLOCK.CLASS_ABILITIES.EMPOWERING_RIFT,
    },
    playstyle:
      'Ionic Traces are enhanced and shared with nearby allies. Delicate Tomb creates more traces. Team-wide ability regen.',
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'titan-prismatic-twilight',
    name: 'Prismatic Arsenal',
    element: ElementType.Prismatic,
    guardianClass: GuardianClass.Titan,
    requiredExpansion: Expansion.FinalShape,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.POWER.THE_LAMENT,
      name: 'The Lament',
      slot: ItemSlot.Power,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_TITAN.SYNTHOCEPS,
      name: 'Synthoceps',
      slot: ItemSlot.Arms,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.PRISMATIC.TITAN.SUPER.TWILIGHT_ARSENAL,
      aspects: [
        SUBCLASS_HASHES.PRISMATIC.TITAN.ASPECTS.UNBREAKABLE,
        SUBCLASS_HASHES.PRISMATIC.TITAN.ASPECTS.DRENGRS_LASH,
      ],
      fragments: [
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_RUIN,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PROTECTION,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_COURAGE,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_DOMINANCE,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_DAWN,
      ],
      grenadeHash: SUBCLASS_HASHES.PRISMATIC.TITAN.GRENADES.SUPPRESSOR,
      meleeHash: SUBCLASS_HASHES.PRISMATIC.TITAN.MELEE.SHIELD_THROW,
      classAbilityHash: SUBCLASS_HASHES.PRISMATIC.TITAN.CLASS_ABILITIES.TOWERING_BARRICADE,
    },
    playstyle:
      'Twilight Arsenal throws Void axes for huge damage. Unbreakable gives shield while charging. Pure aggression.',
    difficulty: Difficulty.Advanced,
  },
  // ===== PRISMATIC GENERAL =====
  {
    id: 'titan-prismatic-general',
    name: 'Prismatic Titan General',
    element: ElementType.Prismatic,
    guardianClass: GuardianClass.Titan,
    requiredExpansion: Expansion.FinalShape,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.KINETIC.OUTBREAK_PERFECTED,
      name: 'Outbreak Perfected',
      slot: ItemSlot.Kinetic,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_TITAN.SYNTHOCEPS,
      name: 'Synthoceps',
      slot: ItemSlot.Arms,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.PRISMATIC.TITAN.SUPER.BLADEFURY,
      aspects: [
        SUBCLASS_HASHES.PRISMATIC.TITAN.ASPECTS.CONSECRATION,
        SUBCLASS_HASHES.PRISMATIC.TITAN.ASPECTS.KNOCKOUT,
      ],
      fragments: [
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_RUIN,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PROTECTION,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_DAWN,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_HOPE,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_COURAGE,
      ],
      grenadeHash: SUBCLASS_HASHES.PRISMATIC.TITAN.GRENADES.SHACKLE,
      meleeHash: SUBCLASS_HASHES.PRISMATIC.TITAN.MELEE.FRENZIED_BLADE,
      classAbilityHash: SUBCLASS_HASHES.PRISMATIC.TITAN.CLASS_ABILITIES.RALLY_BARRICADE,
    },
    playstyle:
      'General purpose Prismatic Titan. Consecration for big slams. Synthoceps for damage. Outbreak for everything else.',
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'hunter-prismatic-general',
    name: 'Prismatic Hunter General',
    element: ElementType.Prismatic,
    guardianClass: GuardianClass.Hunter,
    requiredExpansion: Expansion.FinalShape,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.SUNSHOT,
      name: 'Sunshot',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_HUNTER.FOETRACER,
      name: 'Foetracer',
      slot: ItemSlot.Helmet,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.SUPER.SILENCE_AND_SQUALL,
      aspects: [
        SUBCLASS_HASHES.PRISMATIC.HUNTER.ASPECTS.STYLISH_EXECUTIONER,
        SUBCLASS_HASHES.PRISMATIC.HUNTER.ASPECTS.THREADED_SPECTER,
      ],
      fragments: [
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_DAWN,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_HOPE,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PROTECTION,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_RUIN,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_COURAGE,
      ],
      grenadeHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.GRENADES.DUSKFIELD,
      meleeHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.MELEE.THREADED_SPIKE,
      classAbilityHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.CLASS_ABILITIES.GAMBLERS_DODGE,
    },
    playstyle:
      'Versatile hunter build. Foetracer buffs damage on ability hits. Stylish Executioner for invis.',
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'titan-prismatic-consecration-meta',
    name: 'Prismatic Flame-Scourge',
    element: ElementType.Prismatic,
    guardianClass: GuardianClass.Titan,
    requiredExpansion: Expansion.FinalShape,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.KINETIC.KHVOSTOV_7G_0X,
      name: 'Khvostov 7G-0X',
      slot: ItemSlot.Kinetic,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_TITAN.HEART_OF_INMOST_LIGHT,
      name: 'Heart of Inmost Light',
      slot: ItemSlot.Chest,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.PRISMATIC.TITAN.SUPER.TWILIGHT_ARSENAL,
      aspects: [
        SUBCLASS_HASHES.PRISMATIC.TITAN.ASPECTS.CONSECRATION,
        SUBCLASS_HASHES.PRISMATIC.TITAN.ASPECTS.KNOCKOUT,
      ],
      fragments: [
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_DAWN,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PROTECTION,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PURPOSE,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_RUIN,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_HOPE,
      ],
      grenadeHash: SUBCLASS_HASHES.PRISMATIC.TITAN.GRENADES.SHACKLE,
      meleeHash: SUBCLASS_HASHES.PRISMATIC.TITAN.MELEE.FRENZIED_BLADE,
      classAbilityHash: SUBCLASS_HASHES.PRISMATIC.TITAN.CLASS_ABILITIES.THRUSTER,
    },
    playstyle:
      'Use Frenzied Blade charges to trigger Consecration repeatedly. Knockout provides healing and damage. Heart of Inmost Light keeps all abilities looping. Twilight Arsenal for massive Void burst.',
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'hunter-prismatic-nighthawk-meta',
    name: 'Prismatic Shadow-Stalker',
    element: ElementType.Prismatic,
    guardianClass: GuardianClass.Hunter,
    requiredExpansion: Expansion.FinalShape,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.STILL_HUNT,
      name: 'Still Hunt',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_HUNTER.CELESTIAL_NIGHTHAWK,
      name: 'Celestial Nighthawk',
      slot: ItemSlot.Helmet,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.SUPER.GOLDEN_GUN_MARKSMAN,
      aspects: [
        SUBCLASS_HASHES.PRISMATIC.HUNTER.ASPECTS.STYLISH_EXECUTIONER,
        SUBCLASS_HASHES.PRISMATIC.HUNTER.ASPECTS.WINTERS_SHROUD,
      ],
      fragments: [
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_DAWN,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PURPOSE,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_BLESSING,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_HOPE,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PROTECTION,
      ],
      grenadeHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.GRENADES.DUSKFIELD,
      meleeHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.MELEE.WITHERING_BLADE,
      classAbilityHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.CLASS_ABILITIES.GAMBLERS_DODGE,
    },
    playstyle:
      'Freeze targets with Duskfield or Withering Blade to trigger Stylish Executioner invisibility. Celestial Nighthawk + Golden Gun + Still Hunt for the ultimate boss DPS rotation.',
    difficulty: Difficulty.Advanced,
  },
  {
    id: 'warlock-prismatic-getaway-meta',
    name: 'Prismatic Bleak-Feeder',
    element: ElementType.Prismatic,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.FinalShape,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.KINETIC.OSTEO_STRIGA,
      name: 'Osteo Striga',
      slot: ItemSlot.Kinetic,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_WARLOCK.GETAWAY_ARTIST,
      name: 'Getaway Artist',
      slot: ItemSlot.Arms,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.SUPER.SONG_OF_FLAME,
      aspects: [
        SUBCLASS_HASHES.PRISMATIC.WARLOCK.ASPECTS.BLEAK_WATCHER,
        SUBCLASS_HASHES.PRISMATIC.WARLOCK.ASPECTS.FEED_THE_VOID,
      ],
      fragments: [
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PROTECTION,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_HOPE,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PURPOSE,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_DAWN,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_DEVOTION,
      ],
      grenadeHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.GRENADES.STORM,
      meleeHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.MELEE.ARCANE_NEEDLE,
      classAbilityHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.CLASS_ABILITIES.PHOENIX_DIVE,
    },
    playstyle:
      'Consume Storm Grenade with Getaway Artist to create both an Arc Soul AND a Bleak Watcher turret. Feed the Void keeps you healed. Arcane Needle for unraveling. Song of Flame for ultimate ability spam.',
    difficulty: Difficulty.Intermediate,
  },
  // New: Briarbinds Meta (Void)
  {
    id: 'warlock-void-briarbinds-meta',
    name: 'Void Soulmaster',
    element: ElementType.Void,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.Lightfall,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.COLLECTIVE_OBLIGATION,
      name: 'Collective Obligation',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_WARLOCK.BRIARBINDS,
      name: 'Briarbinds',
      slot: ItemSlot.Arms,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.VOID.WARLOCK.SUPER.NOVA_BOMB_VORTEX,
      aspects: [
        SUBCLASS_HASHES.VOID.WARLOCK.ASPECTS.CHILD_OF_THE_OLD_GODS,
        SUBCLASS_HASHES.VOID.WARLOCK.ASPECTS.FEED_THE_VOID,
      ],
      fragments: [
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_HARVEST,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_STARVATION,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_EXPULSION,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_REMNANTS,
      ],
      grenadeHash: SUBCLASS_HASHES.VOID.WARLOCK.GRENADES.VORTEX,
      meleeHash: SUBCLASS_HASHES.VOID.WARLOCK.MELEE.POCKET_SINGULARITY,
      classAbilityHash: SUBCLASS_HASHES.VOID.WARLOCK.CLASS_ABILITIES.HEALING_RIFT,
    },
    playstyle:
      'Deploy Void Souls to weaken enemies. Retrieve them to refresh duration. Feed the Void grants Devour on every ability kill. Collective Obligation loop with Weaken.',
    difficulty: Difficulty.Advanced,
  },
  // New: Titan Strand Banner of War (Wormgod)
  {
    id: 'titan-strand-banner-wormgod',
    name: 'Banner of War God',
    element: ElementType.Strand,
    guardianClass: GuardianClass.Titan,
    requiredExpansion: Expansion.Lightfall,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.POWER.THE_LAMENT, // Using sword logic
      name: 'The Lament',
      slot: ItemSlot.Power,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_TITAN.WORMGOD_CARESS,
      name: 'Wormgod Caress',
      slot: ItemSlot.Arms,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.STRAND.TITAN.SUPER.BLADEFURY,
      aspects: [
        SUBCLASS_HASHES.STRAND.TITAN.ASPECTS.BANNER_OF_WAR,
        SUBCLASS_HASHES.STRAND.TITAN.ASPECTS.INTO_THE_FRAY,
      ],
      fragments: [
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_FURY,
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_GENERATION,
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_WARDING,
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_TRANSMUTATION,
      ],
      grenadeHash: SUBCLASS_HASHES.STRAND.TITAN.GRENADES.GRAPPLE,
      meleeHash: SUBCLASS_HASHES.STRAND.TITAN.MELEE.FRENZIED_BLADE,
      classAbilityHash: SUBCLASS_HASHES.STRAND.TITAN.CLASS_ABILITIES.TOWERING_BARRICADE,
    },
    playstyle:
      'Melee kills stack Burning Fists damage (Wormgod) and Banner of War healing. Grapple melee counts as both grenade and melee damage. Slice through everything.',
    difficulty: Difficulty.Advanced,
  },
  // New Hazardous Propulsion Build
  {
    id: 'titan-prismatic-hazardous',
    name: 'Hazardous Rockets',
    element: ElementType.Prismatic,
    guardianClass: GuardianClass.Titan,
    requiredExpansion: Expansion.FinalShape,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.POWER.GJALLARHORN, // Or Grand Overture/Truth/etc
      name: 'Gjallarhorn',
      slot: ItemSlot.Power,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_TITAN.HAZARDOUS_PROPULSION,
      name: 'Hazardous Propulsion',
      slot: ItemSlot.Chest,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.PRISMATIC.TITAN.SUPER.TWILIGHT_ARSENAL,
      aspects: [
        SUBCLASS_HASHES.PRISMATIC.TITAN.ASPECTS.KNOCKOUT,
        SUBCLASS_HASHES.PRISMATIC.TITAN.ASPECTS.CONSECRATION,
      ],
      fragments: [
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_RUIN,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_DAWN,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_HOPE,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PROTECTION,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PURPOSE,
      ],
      grenadeHash: SUBCLASS_HASHES.PRISMATIC.TITAN.GRENADES.SHACKLE,
      meleeHash: SUBCLASS_HASHES.PRISMATIC.TITAN.MELEE.FRENZIED_BLADE,
      classAbilityHash: SUBCLASS_HASHES.PRISMATIC.TITAN.CLASS_ABILITIES.THRUSTER,
    },
    playstyle:
      'Use Thruster to fire Exodus Rockets. Hits increase your Kinetic/Strand weapon damage. Gjallarhorn benefits from the rocket buff. Massive burst DPS.',
    difficulty: Difficulty.Intermediate,
  },
  // New Speaker's Sight Build
  {
    id: 'warlock-solar-speaker',
    name: 'Speaker\'s Support',
    element: ElementType.Solar,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.FinalShape,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.KINETIC.LUMINA,
      name: 'Lumina',
      slot: ItemSlot.Kinetic,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_WARLOCK.SPEAKERS_SIGHT,
      name: 'Speaker\'s Sight',
      slot: ItemSlot.Helmet,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.SOLAR.WARLOCK.SUPER.WELL_OF_RADIANCE,
      aspects: [
        SUBCLASS_HASHES.SOLAR.WARLOCK.ASPECTS.TOUCH_OF_FLAME,
        SUBCLASS_HASHES.SOLAR.WARLOCK.ASPECTS.HELLION,
      ],
      fragments: [
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_BENEVOLENCE,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SINGEING,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SOLACE,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_TORCHES,
      ],
      grenadeHash: SUBCLASS_HASHES.SOLAR.WARLOCK.GRENADES.HEALING,
      meleeHash: SUBCLASS_HASHES.SOLAR.WARLOCK.MELEE.INCINERATOR_SNAP,
      classAbilityHash: SUBCLASS_HASHES.SOLAR.WARLOCK.CLASS_ABILITIES.PHOENIX_DIVE,
    },
    playstyle:
      'Your Healing Grenade spawns a restorative turret. Ember of Benevolence gives ability energy when you heal allies. Spam turrets and Lumina Noble Rounds to carry the team.',
    difficulty: Difficulty.Beginner,
  },
  // New Still Hunt Hunter Build
  {
    id: 'hunter-prismatic-still-hunt',
    name: 'Golden Gun Mastery',
    element: ElementType.Prismatic,
    guardianClass: GuardianClass.Hunter,
    requiredExpansion: Expansion.FinalShape,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.STILL_HUNT,
      name: 'Still Hunt',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_HUNTER.CELESTIAL_NIGHTHAWK,
      name: 'Celestial Nighthawk',
      slot: ItemSlot.Helmet,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.SUPER.GOLDEN_GUN_MARKSMAN,
      aspects: [
        SUBCLASS_HASHES.PRISMATIC.HUNTER.ASPECTS.STYLISH_EXECUTIONER,
        SUBCLASS_HASHES.PRISMATIC.HUNTER.ASPECTS.GUNPOWDER_GAMBLE,
      ],
      fragments: [
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_DAWN,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PURPOSE,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PROTECTION,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_HOPE,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_RUIN,
      ],
      grenadeHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.GRENADES.GRAPPLE,
      meleeHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.MELEE.THREADED_SPIKE,
      classAbilityHash: SUBCLASS_HASHES.PRISMATIC.HUNTER.CLASS_ABILITIES.MARKSMANS_DODGE,
    },
    playstyle:
      'Still Hunt charges up its own Golden Gun shots. Celestial Nighthawk boosts Still Hunt\'s damage massively. Rotate between Sniper Super shots and Golden Gun for top-tier DPS.',
    difficulty: Difficulty.Advanced,
  },
  {
    id: 'warlock-solar-sunbracer-ignition-v2',
    name: 'Infinite Solars',
    element: ElementType.Solar,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.BaseGame,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.SUNSHOT,
      name: 'Sunshot',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_WARLOCK.SUNBRACERS,
      name: 'Sunbracers',
      slot: ItemSlot.Arms,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.SOLAR.WARLOCK.SUPER.SONG_OF_FLAME,
      aspects: [
        SUBCLASS_HASHES.SOLAR.WARLOCK.ASPECTS.TOUCH_OF_FLAME,
        SUBCLASS_HASHES.SOLAR.WARLOCK.ASPECTS.HEAT_RISES,
      ],
      fragments: [
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_ASHES,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_RESOLVE,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_EMPYREAN,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SEARING,
      ],
      meleeHash: SUBCLASS_HASHES.SOLAR.WARLOCK.MELEE.INCINERATOR_SNAP,
      grenadeHash: SUBCLASS_HASHES.SOLAR.WARLOCK.GRENADES.SOLAR,
      classAbilityHash: SUBCLASS_HASHES.SOLAR.WARLOCK.CLASS_ABILITIES.PHOENIX_DIVE,
    },
    playstyle: 'Jump high, snap your fingers to kill an enemy, then spam 5+ Solar Grenades.',
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'warlock-any-verity-nuke-v2',
    name: "Verity's Nuke",
    element: ElementType.Prismatic,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.BaseGame,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.GRAVITON_LANCE,
      name: 'Graviton Lance',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_WARLOCK.VERITYS_BROW,
      name: "Verity's Brow",
      slot: ItemSlot.Helmet,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.SUPER.NOVA_BOMB_CATACLYSM,
      aspects: [
        SUBCLASS_HASHES.PRISMATIC.WARLOCK.ASPECTS.FEED_THE_VOID,
        SUBCLASS_HASHES.PRISMATIC.WARLOCK.ASPECTS.BLEAK_WATCHER,
      ],
      fragments: [
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_RUIN,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_BRAVERY,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PROTECTION,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_HOPE,
      ],
      meleeHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.MELEE.ARCANE_NEEDLE,
      grenadeHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.GRENADES.VORTEX,
      classAbilityHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.CLASS_ABILITIES.HEALING_RIFT,
    },
    playstyle: 'Get 5 weapon kills, then throw your Vortex grenade. It will hit like a truck.',
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'warlock-any-mantle-harmony-v2',
    name: 'Harmonious Master',
    element: ElementType.Solar,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.BeyondLight,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.SUNSHOT,
      name: 'Sunshot',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_WARLOCK.MANTLE_OF_BATTLE_HARMONY,
      name: 'Mantle of Battle Harmony',
      slot: ItemSlot.Chest,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.SOLAR.WARLOCK.SUPER.WELL_OF_RADIANCE,
      aspects: [
        SUBCLASS_HASHES.SOLAR.WARLOCK.ASPECTS.HELLION,
        SUBCLASS_HASHES.SOLAR.WARLOCK.ASPECTS.TOUCH_OF_FLAME,
      ],
      fragments: [
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_EMPYREAN,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SOLACE,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_ASHES,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_CHAR,
      ],
      meleeHash: SUBCLASS_HASHES.SOLAR.WARLOCK.MELEE.INCINERATOR_SNAP,
      grenadeHash: SUBCLASS_HASHES.SOLAR.WARLOCK.GRENADES.SOLAR,
      classAbilityHash: SUBCLASS_HASHES.SOLAR.WARLOCK.CLASS_ABILITIES.PHOENIX_DIVE,
    },
    playstyle: 'Use Solar weapons to build your Well fast. Supercharged weapons for cleanup.',
    difficulty: Difficulty.Beginner,
  },
  {
    id: 'warlock-any-assembler-support-v2',
    name: "Assembler's Blessing",
    element: ElementType.Solar,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.BeyondLight,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.KINETIC.LUMINA,
      name: 'Lumina',
      slot: ItemSlot.Kinetic,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_WARLOCK.BOOTS_OF_THE_ASSEMBLER,
      name: 'Boots of the Assembler',
      slot: ItemSlot.Legs,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.SOLAR.WARLOCK.SUPER.WELL_OF_RADIANCE,
      aspects: [
        SUBCLASS_HASHES.SOLAR.WARLOCK.ASPECTS.TOUCH_OF_FLAME,
        SUBCLASS_HASHES.SOLAR.WARLOCK.ASPECTS.HELLION,
      ],
      fragments: [
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_BENEVOLENCE,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_MERCY,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SOLACE,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_EMPYREAN,
      ],
      meleeHash: SUBCLASS_HASHES.SOLAR.WARLOCK.MELEE.CELESTIAL_FIRE,
      grenadeHash: SUBCLASS_HASHES.SOLAR.WARLOCK.GRENADES.HEALING,
      classAbilityHash: SUBCLASS_HASHES.SOLAR.WARLOCK.CLASS_ABILITIES.HEALING_RIFT,
    },
    playstyle: 'Drop your rift and stay in it. Tap allies with Lumina for 35% damage bonus.',
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'warlock-void-astrocyte-blink-v2',
    name: 'Blink Master',
    element: ElementType.Void,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.BaseGame,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.GRAVITON_LANCE,
      name: 'Graviton Lance',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_WARLOCK.ASTROCYTE_VERSE,
      name: 'Astrocyte Verse',
      slot: ItemSlot.Helmet,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.VOID.WARLOCK.SUPER.NOVA_WARP,
      aspects: [
        SUBCLASS_HASHES.VOID.WARLOCK.ASPECTS.FEED_THE_VOID,
        SUBCLASS_HASHES.VOID.WARLOCK.ASPECTS.CHILD_OF_THE_OLD_GODS,
      ],
      fragments: [
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_OBSCURITY,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_PERSISTENCE,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_STARVATION,
        SUBCLASS_HASHES.VOID.FRAGMENTS.ECHO_OF_INSTABILITY,
      ],
      meleeHash: SUBCLASS_HASHES.VOID.WARLOCK.MELEE.POCKET_SINGULARITY,
      grenadeHash: SUBCLASS_HASHES.VOID.WARLOCK.GRENADES.VORTEX,
      classAbilityHash: SUBCLASS_HASHES.VOID.WARLOCK.CLASS_ABILITIES.HEALING_RIFT,
    },
    playstyle: 'Blink aggressively through enemies to prime them with Volatile.',
    difficulty: Difficulty.Advanced,
  },
  {
    id: 'warlock-any-necrotic-poison-v2',
    name: 'Contagion Architect',
    element: ElementType.Strand,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.BeyondLight,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.KINETIC.OSTEO_STRIGA,
      name: 'Osteo Striga',
      slot: ItemSlot.Kinetic,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_WARLOCK.NECROTIC_GRIP,
      name: 'Necrotic Grip',
      slot: ItemSlot.Arms,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.STRAND.WARLOCK.SUPER.NEEDLESTORM,
      aspects: [
        SUBCLASS_HASHES.STRAND.WARLOCK.ASPECTS.MINDSPUN_INVOCATION,
        SUBCLASS_HASHES.STRAND.WARLOCK.ASPECTS.WEAVEWALK,
      ],
      fragments: [
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_GENERATION,
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_EVOLUTION,
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_MIND,
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_CONTINUITY,
      ],
      meleeHash: SUBCLASS_HASHES.STRAND.WARLOCK.MELEE.ARCANE_NEEDLE,
      grenadeHash: SUBCLASS_HASHES.STRAND.WARLOCK.GRENADES.SHACKLE,
      classAbilityHash: SUBCLASS_HASHES.STRAND.WARLOCK.CLASS_ABILITIES.HEALING_RIFT,
    },
    playstyle: 'Shoot one enemy with Osteo Striga and watch the poison clear the whole room.',
    difficulty: Difficulty.Beginner,
  },
  {
    id: 'warlock-arc-fallen-sunstar-ionic-v2',
    name: 'Ionic Battery',
    element: ElementType.Arc,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.WitchQueen,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.DELICATE_TOMB,
      name: 'Delicate Tomb',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_WARLOCK.FALLEN_SUNSTAR,
      name: 'Fallen Sunstar',
      slot: ItemSlot.Helmet,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.ARC.WARLOCK.SUPER.CHAOS_REACH,
      aspects: [
        SUBCLASS_HASHES.ARC.WARLOCK.ASPECTS.ELECTROSTATIC_MIND,
        SUBCLASS_HASHES.ARC.WARLOCK.ASPECTS.ARC_SOUL,
      ],
      fragments: [
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_IONS,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_SHOCK,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_MAGNITUDE,
        SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_DISCHARGE,
      ],
      meleeHash: SUBCLASS_HASHES.ARC.WARLOCK.MELEE.CHAIN_LIGHTNING,
      grenadeHash: SUBCLASS_HASHES.ARC.WARLOCK.GRENADES.STORM,
      classAbilityHash: SUBCLASS_HASHES.ARC.WARLOCK.CLASS_ABILITIES.HEALING_RIFT,
    },
    playstyle: 'Spam abilities to create a carpet of Ionic Traces.',
    difficulty: Difficulty.Beginner,
  },
  {
    id: 'warlock-strand-mataiodoxia-suspend-v2',
    name: 'Needle Weaver',
    element: ElementType.Strand,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.FinalShape,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.KINETIC.WISH_KEEPER,
      name: 'Wish-Keeper',
      slot: ItemSlot.Kinetic,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_WARLOCK.MATAIODOXIA,
      name: 'Mataiodoxia',
      slot: ItemSlot.Chest,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.STRAND.WARLOCK.SUPER.NEEDLESTORM,
      aspects: [
        SUBCLASS_HASHES.STRAND.WARLOCK.ASPECTS.THE_WANDERER,
        SUBCLASS_HASHES.STRAND.WARLOCK.ASPECTS.MINDSPUN_INVOCATION,
      ],
      fragments: [
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_GENERATION,
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_CONTINUITY,
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_WISDOM,
        SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_MIND,
      ],
      meleeHash: SUBCLASS_HASHES.STRAND.WARLOCK.MELEE.ARCANE_NEEDLE,
      grenadeHash: SUBCLASS_HASHES.STRAND.WARLOCK.GRENADES.SHACKLE,
      classAbilityHash: SUBCLASS_HASHES.STRAND.WARLOCK.CLASS_ABILITIES.HEALING_RIFT,
    },
    playstyle: 'Spam Arcane Needle at everything. Watch them float and explode.',
    difficulty: Difficulty.Intermediate,
  },
  {
    id: 'warlock-prismatic-nezarec-loop-v2',
    name: "Nezarec's Spectrum",
    element: ElementType.Prismatic,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.FinalShape,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.GRAVITON_LANCE,
      name: 'Graviton Lance',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_WARLOCK.NEZARECS_SIN,
      name: "Nezarec's Sin",
      slot: ItemSlot.Helmet,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.SUPER.NOVA_BOMB_CATACLYSM,
      aspects: [
        SUBCLASS_HASHES.PRISMATIC.WARLOCK.ASPECTS.FEED_THE_VOID,
        SUBCLASS_HASHES.PRISMATIC.WARLOCK.ASPECTS.HELLION,
      ],
      fragments: [
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_HOPE,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_BRAVERY,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_BALANCE,
        SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PROTECTION,
      ],
      meleeHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.MELEE.POCKET_SINGULARITY,
      grenadeHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.GRENADES.VORTEX,
      classAbilityHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.CLASS_ABILITIES.PHOENIX_DIVE,
    },
    playstyle: 'Use Graviton Lance to trigger Nezarec, and use your abilities to stay alive via Devour.',
    difficulty: Difficulty.Beginner,
  },
  {
    id: 'warlock-any-apotheosis-burn-v2',
    name: 'Veil of Fire',
    element: ElementType.Solar,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.BaseGame,
    exoticWeapon: {
      hash: EXOTIC_WEAPONS.ENERGY.SUNSHOT,
      name: 'Sunshot',
      slot: ItemSlot.Energy,
    },
    exoticArmor: {
      hash: EXOTIC_ARMOR_WARLOCK.APOTHEOSIS_VEIL,
      name: 'Apotheosis Veil',
      slot: ItemSlot.Helmet,
    },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.SOLAR.WARLOCK.SUPER.SONG_OF_FLAME,
      aspects: [
        SUBCLASS_HASHES.SOLAR.WARLOCK.ASPECTS.TOUCH_OF_FLAME,
        SUBCLASS_HASHES.SOLAR.WARLOCK.ASPECTS.HELLION,
      ],
      fragments: [
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_ASHES,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_RESOLVE,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_EMPYREAN,
        SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SOLACE,
      ],
      meleeHash: SUBCLASS_HASHES.SOLAR.WARLOCK.MELEE.INCINERATOR_SNAP,
      grenadeHash: SUBCLASS_HASHES.SOLAR.WARLOCK.GRENADES.FUSION,
      classAbilityHash: SUBCLASS_HASHES.SOLAR.WARLOCK.CLASS_ABILITIES.PHOENIX_DIVE,
    },
    playstyle: 'Cast Song of Flame to nuke the boss. Once it ends, spam your Fusion grenades.',
    difficulty: Difficulty.Intermediate,
  },
  // --- EXPANDED SYNERGY TEMPLATES (SUNBRACERS) ---
  {
    id: 'warlock-solar-sunbracers-skyburner',
    name: 'Orbital Napalm',
    element: ElementType.Solar,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.BaseGame,
    exoticWeapon: { hash: EXOTIC_WEAPONS.ENERGY.SKYBURNERS_OATH, name: "Skyburner's Oath", slot: ItemSlot.Energy },
    exoticArmor: { hash: EXOTIC_ARMOR_WARLOCK.SUNBRACERS, name: 'Sunbracers', slot: ItemSlot.Arms },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.SOLAR.WARLOCK.SUPER.DAYBREAK,
      aspects: [SUBCLASS_HASHES.SOLAR.WARLOCK.ASPECTS.TOUCH_OF_FLAME, SUBCLASS_HASHES.SOLAR.WARLOCK.ASPECTS.HEAT_RISES],
      fragments: [SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_ASHES, SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SEARING, SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_EMPYREAN, SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_TORCHES],
      grenadeHash: SUBCLASS_HASHES.SOLAR.WARLOCK.GRENADES.SOLAR,
      meleeHash: SUBCLASS_HASHES.SOLAR.WARLOCK.MELEE.INCINERATOR_SNAP,
      classAbilityHash: SUBCLASS_HASHES.SOLAR.WARLOCK.CLASS_ABILITIES.PHOENIX_DIVE
    },
    playstyle: 'Skyburner hip-fire applies Scorch. Melee to ignite and proc Sunbracers. Rain unlimited Solar Grenades from the sky.',
    difficulty: Difficulty.Intermediate
  },
  {
    id: 'warlock-solar-sunbracers-sunshot',
    name: 'Infinite Ignition',
    element: ElementType.Solar,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.BaseGame,
    exoticWeapon: { hash: EXOTIC_WEAPONS.ENERGY.SUNSHOT, name: 'Sunshot', slot: ItemSlot.Energy },
    exoticArmor: { hash: EXOTIC_ARMOR_WARLOCK.SUNBRACERS, name: 'Sunbracers', slot: ItemSlot.Arms },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.SOLAR.WARLOCK.SUPER.WELL_OF_RADIANCE,
      aspects: [SUBCLASS_HASHES.SOLAR.WARLOCK.ASPECTS.TOUCH_OF_FLAME, SUBCLASS_HASHES.SOLAR.WARLOCK.ASPECTS.ICARUS_DASH],
      fragments: [SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_COMBUSTION, SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_CHAR, SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_ERUPTION, SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_BLISTERING],
      grenadeHash: SUBCLASS_HASHES.SOLAR.WARLOCK.GRENADES.SOLAR,
      meleeHash: SUBCLASS_HASHES.SOLAR.WARLOCK.MELEE.CELESTIAL_FIRE,
      classAbilityHash: SUBCLASS_HASHES.SOLAR.WARLOCK.CLASS_ABILITIES.HEALING_RIFT
    },
    playstyle: 'Use Sunshot to chain explosions. Clean up with Celestial Fire to trigger Sunbracers. A masterclass in ad-clear.',
    difficulty: Difficulty.Beginner
  },
  {
    id: 'warlock-solar-sunbracers-prometheus',
    name: 'The Floor is Lava',
    element: ElementType.Solar,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.BaseGame,
    exoticWeapon: { hash: EXOTIC_WEAPONS.ENERGY.PROMETHEUS_LENS, name: 'Prometheus Lens', slot: ItemSlot.Energy },
    exoticArmor: { hash: EXOTIC_ARMOR_WARLOCK.SUNBRACERS, name: 'Sunbracers', slot: ItemSlot.Arms },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.SOLAR.WARLOCK.SUPER.SONG_OF_FLAME,
      aspects: [SUBCLASS_HASHES.SOLAR.WARLOCK.ASPECTS.TOUCH_OF_FLAME, SUBCLASS_HASHES.SOLAR.WARLOCK.ASPECTS.HELLION],
      fragments: [SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SINGEING, SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_ASHES, SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_SOLACE, SUBCLASS_HASHES.SOLAR.FRAGMENTS.EMBER_OF_BENEVOLENCE],
      grenadeHash: SUBCLASS_HASHES.SOLAR.WARLOCK.GRENADES.SOLAR,
      meleeHash: SUBCLASS_HASHES.SOLAR.WARLOCK.MELEE.INCINERATOR_SNAP,
      classAbilityHash: SUBCLASS_HASHES.SOLAR.WARLOCK.CLASS_ABILITIES.PHOENIX_DIVE
    },
    playstyle: 'Prometheus Lens scorches everything. Snap to ignite. Cover the entire arena in Solar Grenades and Hellion mortars.',
    difficulty: Difficulty.Intermediate
  },

  // --- EXPANDED SYNERGY TEMPLATES (SWARMERS) ---
  {
    id: 'warlock-strand-swarmers-quicksilver',
    name: 'Nanotech Swarm',
    element: ElementType.Strand,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.Lightfall,
    exoticWeapon: { hash: EXOTIC_WEAPONS.KINETIC.QUICKSILVER_STORM, name: 'Quicksilver Storm', slot: ItemSlot.Kinetic },
    exoticArmor: { hash: EXOTIC_ARMOR_WARLOCK.SWARMERS, name: 'Swarmers', slot: ItemSlot.Legs },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.STRAND.WARLOCK.SUPER.NEEDLESTORM,
      aspects: [SUBCLASS_HASHES.STRAND.WARLOCK.ASPECTS.WEAVERS_CALL, SUBCLASS_HASHES.STRAND.WARLOCK.ASPECTS.THE_WANDERER],
      fragments: [SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_EVOLUTION, SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_GENERATION, SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_REBIRTH, SUBCLASS_HASHES.STRAND.FRAGMENTS.THREAD_OF_MIND],
      grenadeHash: SUBCLASS_HASHES.STRAND.WARLOCK.GRENADES.THREADLING,
      meleeHash: SUBCLASS_HASHES.STRAND.WARLOCK.MELEE.ARCANE_NEEDLE,
      classAbilityHash: SUBCLASS_HASHES.STRAND.WARLOCK.CLASS_ABILITIES.HEALING_RIFT
    },
    playstyle: 'Quicksilver creates Tangles. The Wanderer makes them suspend. Swarmers spawn Threadlings. Total battlefield control.',
    difficulty: Difficulty.Beginner
  },
  {
    id: 'warlock-prismatic-swarmers-devour',
    name: 'Broodweaver Reborn',
    element: ElementType.Prismatic,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.FinalShape,
    exoticWeapon: { hash: EXOTIC_WEAPONS.KINETIC.WISH_KEEPER, name: 'Wish-Keeper', slot: ItemSlot.Kinetic },
    exoticArmor: { hash: EXOTIC_ARMOR_WARLOCK.SWARMERS, name: 'Swarmers', slot: ItemSlot.Legs },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.SUPER.NEEDLESTORM,
      aspects: [SUBCLASS_HASHES.PRISMATIC.WARLOCK.ASPECTS.WEAVERS_CALL, SUBCLASS_HASHES.PRISMATIC.WARLOCK.ASPECTS.FEED_THE_VOID],
      fragments: [SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_HOPE, SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_BRAVERY, SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PROTECTION, SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PURPOSE, SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_RUIN],
      grenadeHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.GRENADES.THREADLING,
      meleeHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.MELEE.ARCANE_NEEDLE,
      classAbilityHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.CLASS_ABILITIES.PHOENIX_DIVE
    },
    playstyle: 'Prismatic synergy at its finest. Weaver\'s Call spawns Threadlings, Feed the Void keeps you alive. Wish-Keeper suspends targets for your swarm.',
    difficulty: Difficulty.Advanced
  },

  // --- EXPANDED SYNERGY TEMPLATES (GETAWAY ARTIST) ---
  {
    id: 'warlock-arc-getaway-trinity',
    name: 'Stormcaller Supreme',
    element: ElementType.Arc,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.Forsaken,
    exoticWeapon: { hash: EXOTIC_WEAPONS.ENERGY.TRINITY_GHOUL, name: 'Trinity Ghoul', slot: ItemSlot.Energy },
    exoticArmor: { hash: EXOTIC_ARMOR_WARLOCK.GETAWAY_ARTIST, name: 'Getaway Artist', slot: ItemSlot.Arms },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.ARC.WARLOCK.SUPER.CHAOS_REACH,
      aspects: [SUBCLASS_HASHES.ARC.WARLOCK.ASPECTS.ARC_SOUL, SUBCLASS_HASHES.ARC.WARLOCK.ASPECTS.ELECTROSTATIC_MIND],
      fragments: [SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_SHOCK, SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_IONS, SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_DISCHARGE, SUBCLASS_HASHES.ARC.FRAGMENTS.SPARK_OF_AMPLITUDE],
      grenadeHash: SUBCLASS_HASHES.ARC.WARLOCK.GRENADES.STORM,
      meleeHash: SUBCLASS_HASHES.ARC.WARLOCK.MELEE.CHAIN_LIGHTNING,
      classAbilityHash: SUBCLASS_HASHES.ARC.WARLOCK.CLASS_ABILITIES.HEALING_RIFT
    },
    playstyle: 'Consume your grenade for a Sentient Arc Soul. Trinity Ghoul chains lightning. You are a walking thunderstorm.',
    difficulty: Difficulty.Beginner
  },
  {
    id: 'warlock-prismatic-getaway-turret',
    name: 'Dual Turret Watcher',
    element: ElementType.Prismatic,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.FinalShape,
    exoticWeapon: { hash: EXOTIC_WEAPONS.KINETIC.NO_TIME_TO_EXPLAIN, name: 'No Time To Explain', slot: ItemSlot.Kinetic },
    exoticArmor: { hash: EXOTIC_ARMOR_WARLOCK.GETAWAY_ARTIST, name: 'Getaway Artist', slot: ItemSlot.Arms },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.SUPER.SONG_OF_FLAME,
      aspects: [SUBCLASS_HASHES.PRISMATIC.WARLOCK.ASPECTS.BLEAK_WATCHER, SUBCLASS_HASHES.PRISMATIC.WARLOCK.ASPECTS.FEED_THE_VOID],
      fragments: [SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_RUIN, SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_HOPE, SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_DEVOTION, SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_DOMINANCE, SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_COURAGE],
      grenadeHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.GRENADES.STORM,
      meleeHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.MELEE.PENUMBRAL_BLAST,
      classAbilityHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.CLASS_ABILITIES.HEALING_RIFT
    },
    playstyle: 'Consume your Storm Grenade to spawn BOTH a Bleak Watcher and an Arc Soul. No Time To Explain adds a third turret. You are a one-person army.',
    difficulty: Difficulty.Advanced
  },
  {
    id: 'warlock-prismatic-getaway-khvostov',
    name: 'Kinetic Storm',
    element: ElementType.Prismatic,
    guardianClass: GuardianClass.Warlock,
    requiredExpansion: Expansion.FinalShape,
    exoticWeapon: { hash: EXOTIC_WEAPONS.KINETIC.KHVOSTOV_7G_0X, name: 'Khvostov 7G-0X', slot: ItemSlot.Kinetic },
    exoticArmor: { hash: EXOTIC_ARMOR_WARLOCK.GETAWAY_ARTIST, name: 'Getaway Artist', slot: ItemSlot.Arms },
    subclassConfig: {
      superHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.SUPER.NOVA_BOMB_CATACLYSM,
      aspects: [SUBCLASS_HASHES.PRISMATIC.WARLOCK.ASPECTS.BLEAK_WATCHER, SUBCLASS_HASHES.PRISMATIC.WARLOCK.ASPECTS.FEED_THE_VOID],
      fragments: [SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_HOPE, SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_BALANCE, SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_DAWN, SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PURPOSE, SUBCLASS_HASHES.PRISMATIC.FRAGMENTS.FACET_OF_PROTECTION],
      grenadeHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.GRENADES.STORM,
      meleeHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.MELEE.INCINERATOR_SNAP,
      classAbilityHash: SUBCLASS_HASHES.PRISMATIC.WARLOCK.CLASS_ABILITIES.PHOENIX_DIVE
    },
    playstyle: 'Khvostov ricochets match your Arc Soul fire. Bleak Watcher freezes enemies for easy clean-up. Non-stop ability looping.',
    difficulty: Difficulty.Intermediate
  }
];

// Helper functions
export function getBuildsByClass(
  guardianClass: GuardianClass,
  ownedExpansions?: Expansion[]
): BuildTemplate[] {
  return BUILD_TEMPLATES.filter(
    (b) =>
      b.guardianClass === guardianClass &&
      (!b.requiredExpansion || !ownedExpansions || ownedExpansions.includes(b.requiredExpansion))
  );
}

export function getBuildsByElement(element: ElementType): BuildTemplate[] {
  return BUILD_TEMPLATES.filter((b) => b.element === element);
}

export function getRandomBuild(
  guardianClass?: GuardianClass,
  element?: ElementType,
  ownedExpansions?: Expansion[]
): BuildTemplate | null {
  let builds = BUILD_TEMPLATES;

  if (guardianClass !== undefined) {
    builds = builds.filter((b) => b.guardianClass === guardianClass);
  }

  if (element !== undefined) {
    builds = builds.filter((b) => b.element === element);
  }

  if (ownedExpansions && ownedExpansions.length > 0) {
    builds = builds.filter(b => !b.requiredExpansion || ownedExpansions.includes(b.requiredExpansion));
  }

  if (builds.length === 0) return null;

  return builds[Math.floor(Math.random() * builds.length)];
}

export interface LockedSlots {
  weapon: boolean;
  armor: boolean;
  super: boolean;
  aspects: boolean;
  fragments: boolean;
  grenade: boolean;
  melee: boolean;
  classAbility: boolean;
}


// Smart Chaos: Map Exotics to their required element for synergy
type ExoticAffinity = ElementType | {
  element: ElementType[];
  superHash?: number[];
  requiredAspects?: number[];
  meleeHash?: number[];
  grenadeHash?: number[];
  classAbilityHash?: number[];

  playstyleTemplate?: string;
  weaponType?: string; // e.g. "Bow", "Shotgun"
  synergisticWeapons?: number[];
};

/**
 * Maps exotic WEAPONS to their damage types and subclass synergies.
 * Helps the generator pick matching combinations.
 */
const EXOTIC_WEAPON_SYNERGY: Record<number, { damageType: ElementType, synergy?: ElementType[] }> = {
  // Kinetic - Red War / Forsaken / Shadowkeep
  [EXOTIC_WEAPONS.KINETIC.CRIMSON]: { damageType: ElementType.Kinetic },
  [EXOTIC_WEAPONS.KINETIC.MIDA_MULTITOOL]: { damageType: ElementType.Kinetic },
  [EXOTIC_WEAPONS.KINETIC.RAT_KING]: { damageType: ElementType.Kinetic, synergy: [ElementType.Void] },
  [EXOTIC_WEAPONS.KINETIC.STURM]: { damageType: ElementType.Kinetic },
  [EXOTIC_WEAPONS.KINETIC.SUROS_REGIME]: { damageType: ElementType.Kinetic },
  [EXOTIC_WEAPONS.KINETIC.SWEET_BUSINESS]: { damageType: ElementType.Kinetic },
  [EXOTIC_WEAPONS.KINETIC.JADE_RABBIT]: { damageType: ElementType.Kinetic },
  [EXOTIC_WEAPONS.KINETIC.HUCKLEBERRY]: { damageType: ElementType.Kinetic },
  [EXOTIC_WEAPONS.KINETIC.VIGILANCE_WING]: { damageType: ElementType.Kinetic },
  [EXOTIC_WEAPONS.KINETIC.ACE_OF_SPADES]: { damageType: ElementType.Kinetic, synergy: [ElementType.Solar] },
  [EXOTIC_WEAPONS.KINETIC.ARBALEST]: { damageType: ElementType.Kinetic },
  [EXOTIC_WEAPONS.KINETIC.BAD_JUJU]: { damageType: ElementType.Kinetic },
  [EXOTIC_WEAPONS.KINETIC.CERBERUS_PLUS_1]: { damageType: ElementType.Kinetic },
  [EXOTIC_WEAPONS.KINETIC.IZANAGIS_BURDEN]: { damageType: ElementType.Kinetic },
  [EXOTIC_WEAPONS.KINETIC.LUMINA]: { damageType: ElementType.Kinetic },
  [EXOTIC_WEAPONS.KINETIC.MALFEASANCE]: { damageType: ElementType.Kinetic },
  [EXOTIC_WEAPONS.KINETIC.OUTBREAK_PERFECTED]: { damageType: ElementType.Kinetic },
  [EXOTIC_WEAPONS.KINETIC.CHAPERONE]: { damageType: ElementType.Kinetic },
  [EXOTIC_WEAPONS.KINETIC.LAST_WORD || 12345]: { damageType: ElementType.Kinetic },
  [EXOTIC_WEAPONS.KINETIC.THORN]: { damageType: ElementType.Kinetic },
  [EXOTIC_WEAPONS.KINETIC.WISH_ENDER]: { damageType: ElementType.Kinetic },
  [EXOTIC_WEAPONS.KINETIC.BASTION]: { damageType: ElementType.Kinetic },
  [EXOTIC_WEAPONS.KINETIC.MONTE_CARLO]: { damageType: ElementType.Kinetic },
  [EXOTIC_WEAPONS.KINETIC.TRAVELERS_CHOSEN]: { damageType: ElementType.Kinetic },
  [EXOTIC_WEAPONS.KINETIC.WITHERHOARD]: { damageType: ElementType.Kinetic },
  [EXOTIC_WEAPONS.KINETIC.DEAD_MANS_TALE]: { damageType: ElementType.Kinetic },
  [EXOTIC_WEAPONS.KINETIC.FORERUNNER]: { damageType: ElementType.Kinetic },
  [EXOTIC_WEAPONS.KINETIC.HAWKMOON]: { damageType: ElementType.Kinetic },
  [EXOTIC_WEAPONS.KINETIC.NO_TIME_TO_EXPLAIN]: { damageType: ElementType.Kinetic },
  [EXOTIC_WEAPONS.KINETIC.OSTEO_STRIGA]: { damageType: ElementType.Kinetic },
  [EXOTIC_WEAPONS.KINETIC.REVISION_ZERO]: { damageType: ElementType.Kinetic },
  [EXOTIC_WEAPONS.KINETIC.TOUCH_OF_MALICE]: { damageType: ElementType.Kinetic },
  [EXOTIC_WEAPONS.KINETIC.NECROCHASM || 12345]: { damageType: ElementType.Kinetic, synergy: [ElementType.Arc] },
  [EXOTIC_WEAPONS.KINETIC.KHVOSTOV_7G_0X]: { damageType: ElementType.Kinetic },
  [EXOTIC_WEAPONS.KINETIC.NEW_LAND_BEYOND]: { damageType: ElementType.Kinetic },
  [EXOTIC_WEAPONS.KINETIC.PRAXIC_BLADE]: { damageType: ElementType.Kinetic },
  [EXOTIC_WEAPONS.KINETIC.MICROCOSM]: { damageType: ElementType.Kinetic },

  // Stasis / Strand (Kinetic Slot)
  [EXOTIC_WEAPONS.KINETIC.AGERS_SCEPTER]: { damageType: ElementType.Stasis, synergy: [ElementType.Stasis] },
  [EXOTIC_WEAPONS.KINETIC.CRYOTHESIA_77K]: { damageType: ElementType.Stasis, synergy: [ElementType.Stasis] },
  [EXOTIC_WEAPONS.KINETIC.CONDITIONAL_FINALITY]: { damageType: ElementType.Stasis, synergy: [ElementType.Stasis, ElementType.Solar] },
  [EXOTIC_WEAPONS.KINETIC.QUICKSILVER_STORM]: { damageType: ElementType.Strand, synergy: [ElementType.Strand] },
  [EXOTIC_WEAPONS.KINETIC.FINAL_WARNING]: { damageType: ElementType.Strand, synergy: [ElementType.Strand] },
  [EXOTIC_WEAPONS.KINETIC.NAVIGATOR || 12345]: { damageType: ElementType.Strand, synergy: [ElementType.Strand] },
  [EXOTIC_WEAPONS.KINETIC.VERGLAS_CURVE]: { damageType: ElementType.Stasis, synergy: [ElementType.Stasis] },
  [EXOTIC_WEAPONS.KINETIC.WICKED_IMPLEMENT]: { damageType: ElementType.Stasis, synergy: [ElementType.Stasis] },
  [EXOTIC_WEAPONS.KINETIC.WISH_KEEPER]: { damageType: ElementType.Strand, synergy: [ElementType.Strand] },
  [EXOTIC_WEAPONS.KINETIC.ALETHONYM]: { damageType: ElementType.Stasis, synergy: [ElementType.Stasis] },
  [EXOTIC_WEAPONS.KINETIC.EUPHONY]: { damageType: ElementType.Strand, synergy: [ElementType.Strand] },
  [EXOTIC_WEAPONS.KINETIC.NEW_MALPAIS]: { damageType: ElementType.Strand, synergy: [ElementType.Strand] },

  // Energy Slot
  [EXOTIC_WEAPONS.ENERGY.SUNSHOT]: { damageType: ElementType.Solar, synergy: [ElementType.Solar] },
  [EXOTIC_WEAPONS.ENERGY.RISKRUNNER]: { damageType: ElementType.Arc, synergy: [ElementType.Arc] },
  [EXOTIC_WEAPONS.ENERGY.GRAVITON_LANCE]: { damageType: ElementType.Void, synergy: [ElementType.Void] },
  [EXOTIC_WEAPONS.ENERGY.LE_MONARQUE]: { damageType: ElementType.Void, synergy: [ElementType.Void] },
  [EXOTIC_WEAPONS.ENERGY.TRINITY_GHOUL]: { damageType: ElementType.Arc, synergy: [ElementType.Arc] },
  [EXOTIC_WEAPONS.ENERGY.TICUUS_DIVINATION]: { damageType: ElementType.Solar, synergy: [ElementType.Solar] },
  [EXOTIC_WEAPONS.ENERGY.POLARIS_LANCE]: { damageType: ElementType.Solar, synergy: [ElementType.Solar] },
  [EXOTIC_WEAPONS.ENERGY.PROMETHEUS_LENS]: { damageType: ElementType.Solar, synergy: [ElementType.Solar] },
  [EXOTIC_WEAPONS.ENERGY.COLDHEART]: { damageType: ElementType.Arc, synergy: [ElementType.Arc] },
  [EXOTIC_WEAPONS.ENERGY.WAVESPLITTER]: { damageType: ElementType.Void, synergy: [ElementType.Void] },
  [EXOTIC_WEAPONS.ENERGY.DELICATE_TOMB]: { damageType: ElementType.Arc, synergy: [ElementType.Arc] },
  [EXOTIC_WEAPONS.ENERGY.COLLECTIVE_OBLIGATION]: { damageType: ElementType.Void, synergy: [ElementType.Void] },
  [EXOTIC_WEAPONS.ENERGY.HIERARCHY_OF_NEEDS]: { damageType: ElementType.Solar, synergy: [ElementType.Solar] },
  [EXOTIC_WEAPONS.ENERGY.VEXCALIBUR]: { damageType: ElementType.Void, synergy: [ElementType.Void] },
  [EXOTIC_WEAPONS.ENERGY.BURIED_BLOODLINE]: { damageType: ElementType.Void, synergy: [ElementType.Void] },
  [EXOTIC_WEAPONS.ENERGY.CENTRIFUSE]: { damageType: ElementType.Arc, synergy: [ElementType.Arc] },
  [EXOTIC_WEAPONS.ENERGY.CHOIR_OF_ONE]: { damageType: ElementType.Void, synergy: [ElementType.Void] },
  [EXOTIC_WEAPONS.ENERGY.STILL_HUNT]: { damageType: ElementType.Solar, synergy: [ElementType.Solar] },
  [EXOTIC_WEAPONS.ENERGY.RED_DEATH_REFORMED]: { damageType: ElementType.Solar, synergy: [ElementType.Solar] },
  [EXOTIC_WEAPONS.ENERGY.ICE_BREAKER]: { damageType: ElementType.Solar, synergy: [ElementType.Solar] },
  [EXOTIC_WEAPONS.ENERGY.SLAYERS_FANG]: { damageType: ElementType.Void, synergy: [ElementType.Void] },
  [EXOTIC_WEAPONS.ENERGY.GRAVITON_SPIKE]: { damageType: ElementType.Arc, synergy: [ElementType.Arc, ElementType.Stasis] },
  [EXOTIC_WEAPONS.ENERGY.LODESTAR]: { damageType: ElementType.Arc, synergy: [ElementType.Arc] },
  [EXOTIC_WEAPONS.ENERGY.THIRD_ITERATION]: { damageType: ElementType.Void, synergy: [ElementType.Void] },

  // Multi-DamageType
  [EXOTIC_WEAPONS.ENERGY.BOREALIS]: { damageType: ElementType.Neutral },
  [EXOTIC_WEAPONS.ENERGY.HARD_LIGHT]: { damageType: ElementType.Neutral },
  [EXOTIC_WEAPONS.ENERGY.DEAD_MESSENGER]: { damageType: ElementType.Neutral },
  [EXOTIC_WEAPONS.ENERGY.TESSELLATION]: { damageType: ElementType.Neutral },
  [EXOTIC_WEAPONS.ENERGY.ERGO_SUM]: { damageType: ElementType.Neutral },

  // Power Slot
  [EXOTIC_WEAPONS.POWER.DARCI]: { damageType: ElementType.Arc, synergy: [ElementType.Arc] },
  [EXOTIC_WEAPONS.POWER.LEGEND_OF_ACRIUS]: { damageType: ElementType.Arc },
  [EXOTIC_WEAPONS.POWER.SLEEPER_SIMULANT]: { damageType: ElementType.Solar },
  [EXOTIC_WEAPONS.POWER.COLONY]: { damageType: ElementType.Void },
  [EXOTIC_WEAPONS.POWER.PROSPECTOR]: { damageType: ElementType.Arc },
  [EXOTIC_WEAPONS.POWER.WARDCLIFF_COIL]: { damageType: ElementType.Arc },
  [EXOTIC_WEAPONS.POWER.TRACTOR_CANNON]: { damageType: ElementType.Void, synergy: [ElementType.Void] },
  [EXOTIC_WEAPONS.POWER.WHISPER_OF_THE_WORM]: { damageType: ElementType.Solar },
  [EXOTIC_WEAPONS.POWER.WORLDLINE_ZERO]: { damageType: ElementType.Arc },
  [EXOTIC_WEAPONS.POWER.ANARCHY]: { damageType: ElementType.Arc },
  [EXOTIC_WEAPONS.POWER.BLACK_TALON]: { damageType: ElementType.Void },
  [EXOTIC_WEAPONS.POWER.ONE_THOUSAND_VOICES]: { damageType: ElementType.Solar },
  [EXOTIC_WEAPONS.POWER.QUEENBREAKER]: { damageType: ElementType.Arc },
  [EXOTIC_WEAPONS.POWER.THUNDERLORD]: { damageType: ElementType.Arc, synergy: [ElementType.Arc] },
  [EXOTIC_WEAPONS.POWER.TRUTH]: { damageType: ElementType.Void },
  [EXOTIC_WEAPONS.POWER.TWO_TAILED_FOX]: { damageType: ElementType.Neutral, synergy: [ElementType.Void, ElementType.Solar] },
  [EXOTIC_WEAPONS.POWER.DEATHBRINGER]: { damageType: ElementType.Void },
  [EXOTIC_WEAPONS.POWER.HEIR_APPARENT]: { damageType: ElementType.Solar },
  [EXOTIC_WEAPONS.POWER.LEVIATHANS_BREATH]: { damageType: ElementType.Void },
  [EXOTIC_WEAPONS.POWER.XENOPHAGE]: { damageType: ElementType.Solar },
  [EXOTIC_WEAPONS.POWER.EYES_OF_TOMORROW]: { damageType: ElementType.Solar },
  [EXOTIC_WEAPONS.POWER.GJALLARHORN]: { damageType: ElementType.Solar },
  [EXOTIC_WEAPONS.POWER.SALVATIONS_GRIP]: { damageType: ElementType.Stasis, synergy: [ElementType.Stasis] },
  [EXOTIC_WEAPONS.POWER.LAMENT]: { damageType: ElementType.Solar },
  [EXOTIC_WEAPONS.POWER.GRAND_OVERTURE]: { damageType: ElementType.Arc },
  [EXOTIC_WEAPONS.POWER.HEARTSHADOW]: { damageType: ElementType.Void, synergy: [ElementType.Void] },
  [EXOTIC_WEAPONS.POWER.PARASITE]: { damageType: ElementType.Solar },
  [EXOTIC_WEAPONS.POWER.DETERMINISTIC_CHAOS]: { damageType: ElementType.Void, synergy: [ElementType.Void] },
  [EXOTIC_WEAPONS.POWER.DRAGONS_BREATH]: { damageType: ElementType.Solar, synergy: [ElementType.Solar] },
  [EXOTIC_WEAPONS.POWER.WINTERBITE]: { damageType: ElementType.Stasis, synergy: [ElementType.Stasis] },
  [EXOTIC_WEAPONS.POWER.SERVICE_OF_LUZAKU]: { damageType: ElementType.Strand, synergy: [ElementType.Strand] },
  [EXOTIC_WEAPONS.POWER.WHIRLING_OVATION]: { damageType: ElementType.Strand, synergy: [ElementType.Strand] },
  [EXOTIC_WEAPONS.POWER.BARROW_DYAD]: { damageType: ElementType.Strand, synergy: [ElementType.Strand] },
  [EXOTIC_WEAPONS.POWER.WOLFSBANE]: { damageType: ElementType.Solar, synergy: [ElementType.Solar] },
};

const EXOTIC_ELEMENT_AFFINITY: Record<number, ExoticAffinity> = {
  // Hunter
  [EXOTIC_ARMOR_HUNTER.GYRFALCONS_HAUBERK]: ElementType.Void,
  [EXOTIC_ARMOR_HUNTER.OMNIOCULUS]: ElementType.Void,
  [EXOTIC_ARMOR_HUNTER.GRAVITON_FORFEIT]: ElementType.Void,
  [EXOTIC_ARMOR_HUNTER.SHINOBUS_VOW]: ElementType.Arc,
  [EXOTIC_ARMOR_HUNTER.RENEWAL_GRASPS]: ElementType.Stasis,
  [EXOTIC_ARMOR_HUNTER.GWISIN_VEST]: {
    element: [ElementType.Void, ElementType.Prismatic],
    // Spectral Blades hash: 2863702176
    superHash: [2863702176],
    playstyleTemplate: "Vanish into the shadows. Go on a rampage with Spectral Blades, using heavy attacks to go back invis and extend the duration."
  },
  [EXOTIC_ARMOR_HUNTER.MASK_OF_BAKRIS]: ElementType.Stasis,
  [EXOTIC_ARMOR_HUNTER.CYRTARACHNE_FACADE]: {
    element: [ElementType.Strand, ElementType.Prismatic],
    grenadeHash: [SUBCLASS_HASHES.STRAND.HUNTER.GRENADES.GRAPPLE],
    playstyleTemplate: "Grapple everywhere. Every time you grapple, you get Woven Mail. You are Spiderman with body armor."
  },
  [EXOTIC_ARMOR_HUNTER.ATHRYS_EMBRACE]: ElementType.Solar,
  [EXOTIC_ARMOR_HUNTER.LUCKY_RASPBERRY]: {
    element: [ElementType.Arc, ElementType.Prismatic],
    grenadeHash: [SUBCLASS_HASHES.ARC.HUNTER.GRENADES.ARCBOLT],
    playstyleTemplate: "Arcbolt grenades trace to everyone. Full chains recharge the grenade instantly. Throw, zap, repeat."
  },
  [EXOTIC_ARMOR_HUNTER.CELESTIAL_NIGHTHAWK]: {
    element: [ElementType.Solar, ElementType.Prismatic],
    superHash: [SUBCLASS_HASHES.SOLAR.HUNTER.SUPER.GOLDEN_GUN_MARKSMAN, SUBCLASS_HASHES.SOLAR.HUNTER.SUPER.GOLDEN_GUN_DEADSHOT],
    playstyleTemplate: "One shot, one kill. Line up your Golden Gun for a massive damage burst that chunks bosses."
  },
  [EXOTIC_ARMOR_HUNTER.OATHKEEPER]: {
    element: [ElementType.Solar, ElementType.Void, ElementType.Arc, ElementType.Stasis, ElementType.Strand, ElementType.Prismatic],
    weaponType: "Combat Bow",
    playstyleTemplate: "Hold your bow draw forever. Perfect for Le Monarque or Wish-Ender. Be the patient hunter."
  },
  [EXOTIC_ARMOR_HUNTER.MASK_OF_FEALTY]: {
    element: [ElementType.Stasis, ElementType.Prismatic],
    requiredAspects: [SUBCLASS_HASHES.STASIS.HUNTER.ASPECTS.GRIM_HARVEST],
    playstyleTemplate: "Defeating slowed or frozen targets creates Stasis shards and recharges your melee. Control the field with ice."
  },
  [EXOTIC_ARMOR_HUNTER.RAIDEN_FLUX]: {
    element: [ElementType.Arc],
    superHash: [SUBCLASS_HASHES.ARC.HUNTER.SUPER.ARC_STAFF],
    playstyleTemplate: "Quick successive attacks with Arc Staff increase its damage output and duration. Become a whirlwind of destruction."
  },
  [EXOTIC_ARMOR_HUNTER.SHARDS_OF_GALANOR]: {
    element: [ElementType.Solar, ElementType.Prismatic],
    superHash: [SUBCLASS_HASHES.SOLAR.HUNTER.SUPER.BLADE_BARRAGE],
    playstyleTemplate: "Hits and kills with Blade Barrage refund Super energy. Let the knives fly, and keep them coming."
  },

  // Titan
  [EXOTIC_ARMOR_TITAN.HELM_OF_SAINT_14]: {
    element: [ElementType.Void, ElementType.Prismatic],
    superHash: [SUBCLASS_HASHES.VOID.TITAN.SUPER.WARD_OF_DAWN],
    playstyleTemplate: "The ultimate defender. Your Ward of Dawn blinds enemies and grants overshields to allies. Protect your fireteam at all costs."
  },
  [EXOTIC_ARMOR_TITAN.DOOM_FANG_PAULDRON]: {
    element: [ElementType.Void, ElementType.Prismatic],
    superHash: [SUBCLASS_HASHES.VOID.TITAN.SUPER.SENTINEL_SHIELD],
    playstyleTemplate: "Review the basics of CQC. Your melee kills give massive super energy. Your shield throws extend your super indefinitely."
  },
  [EXOTIC_ARMOR_TITAN.URSA_FURIOSA]: {
    element: [ElementType.Void],
    superHash: [SUBCLASS_HASHES.VOID.TITAN.SUPER.SENTINEL_SHIELD],
    playstyleTemplate: "Guard with your Sentinel Shield to protect allies. Damage absorbed is converted back into Super energy. Be the shield."
  },
  [EXOTIC_ARMOR_TITAN.NO_BACKUP_PLANS]: {
    element: [ElementType.Void, ElementType.Prismatic],
    weaponType: "Shotgun",
    playstyleTemplate: "A defensive powerhouse that rewards aggressive shotgun play with constant Void overshields. When using Void, Shotgun kills grant overshields."
  },
  [EXOTIC_ARMOR_TITAN.LORELEY_SPLENDOR]: {
    element: [ElementType.Solar, ElementType.Prismatic],
    requiredAspects: [SUBCLASS_HASHES.SOLAR.TITAN.ASPECTS.SOL_INVICTUS],
    playstyleTemplate: "When critically wounded or using class ability, creates a Sunspot at your location. Sunspots heal you and recharge abilities. Survival through fire."
  },
  [EXOTIC_ARMOR_TITAN.HALLOWFIRE_HEART]: {
    element: [ElementType.Solar],
    playstyleTemplate: "Greatly improves Solar ability recharge while Super is full. Use your abilities constantly to scorch the world."
  },
  [EXOTIC_ARMOR_TITAN.PYROGALE_GAUNTLETS]: {
    element: [ElementType.Solar, ElementType.Prismatic],
    requiredAspects: [SUBCLASS_HASHES.SOLAR.TITAN.ASPECTS.CONSECRATION, SUBCLASS_HASHES.SOLAR.TITAN.ASPECTS.ROARING_FLAMES],
    superHash: [SUBCLASS_HASHES.SOLAR.TITAN.SUPER.BURNING_MAUL],
    playstyleTemplate: "Turn your Burning Maul into a single slam of destruction and create fire tornados with Consecration."
  },
  [EXOTIC_ARMOR_TITAN.STRONGHOLD]: {
    element: [ElementType.Solar, ElementType.Void, ElementType.Arc, ElementType.Stasis, ElementType.Strand, ElementType.Prismatic],
    weaponType: "Sword",
    superHash: [SUBCLASS_HASHES.PRISMATIC.TITAN.SUPER.TWILIGHT_ARSENAL, SUBCLASS_HASHES.STRAND.TITAN.SUPER.BLADEFURY],
    playstyleTemplate: "Infinite sword guard. Heal on every parry. You are the immovable object."
  },
  [EXOTIC_ARMOR_TITAN.CUIRASS_OF_THE_FALLING_STAR]: {
    element: [ElementType.Arc, ElementType.Prismatic],
    superHash: [SUBCLASS_HASHES.ARC.TITAN.SUPER.THUNDERCRASH],
    playstyleTemplate: "Yeet yourself at the boss for massive damage. Gain an overshield to survive the impact."
  },
  [EXOTIC_ARMOR_TITAN.AN_INSURMOUNTABLE_SKULLFORT]: {
    element: [ElementType.Arc, ElementType.Prismatic],
    playstyleTemplate: "Arc melee kills trigger health regen and fully restore melee energy. Infinite punches, infinite survival."
  },
  [EXOTIC_ARMOR_TITAN.POINT_CONTACT_CANNON_BRACE]: {
    element: [ElementType.Arc, ElementType.Prismatic],
    meleeHash: [SUBCLASS_HASHES.ARC.TITAN.MELEE.THUNDERCLAP],
    requiredAspects: [SUBCLASS_HASHES.ARC.TITAN.ASPECTS.KNOCKOUT],
    playstyleTemplate: "Charge up your Thunderclap to delete rooms of ads. Melee kills refund energy and cause lighting strikes."
  },
  [EXOTIC_ARMOR_TITAN.ABEYANT_LEAP]: {
    element: [ElementType.Strand, ElementType.Prismatic],
    requiredAspects: [SUBCLASS_HASHES.STRAND.TITAN.ASPECTS.DRENGRS_LASH],
    classAbilityHash: [SUBCLASS_HASHES.STRAND.TITAN.CLASS_ABILITIES.TOWERING_BARRICADE, SUBCLASS_HASHES.STRAND.TITAN.CLASS_ABILITIES.RALLY_BARRICADE],
    playstyleTemplate: "Pop your barricade to send out seeking projectiles that suspend everything in sight. Gain Woven Mail for free."
  },
  [EXOTIC_ARMOR_TITAN.SECOND_CHANCE]: {
    element: [ElementType.Void, ElementType.Prismatic],
    meleeHash: [SUBCLASS_HASHES.VOID.TITAN.MELEE.SHIELD_THROW],
    playstyleTemplate: "Your Shield Throw returns with two charges. Captain America style."
  },
  [EXOTIC_ARMOR_TITAN.PATH_OF_THE_BURNING_STEPS]: ElementType.Solar,
  [EXOTIC_ARMOR_TITAN.HOARFROST_Z]: {
    element: [ElementType.Stasis, ElementType.Prismatic],
    requiredAspects: [SUBCLASS_HASHES.STASIS.TITAN.ASPECTS.TECTONIC_HARVEST],
    classAbilityHash: [SUBCLASS_HASHES.STASIS.TITAN.CLASS_ABILITIES.TOWERING_BARRICADE, SUBCLASS_HASHES.STASIS.TITAN.CLASS_ABILITIES.RALLY_BARRICADE],
    playstyleTemplate: "Your barricade becomes a wall of Stasis crystals. Shatter them for damage resist and melee energy."
  },
  [EXOTIC_ARMOR_TITAN.ICEFALL_MANTLE]: {
    element: [ElementType.Stasis, ElementType.Prismatic],
    classAbilityHash: [SUBCLASS_HASHES.STASIS.TITAN.CLASS_ABILITIES.TOWERING_BARRICADE, SUBCLASS_HASHES.STASIS.TITAN.CLASS_ABILITIES.RALLY_BARRICADE],
    playstyleTemplate: "Replace your barricade with a massive overshield. You become a slow-moving tank of destruction."
  },
  [EXOTIC_ARMOR_TITAN.BLASTWAVE_STRIDERS]: {
    element: [ElementType.Solar, ElementType.Prismatic],
    playstyleTemplate: "Solar explosions and ignitions grant a stacking mobility and speed boost. Speed through the fire."
  },
  [EXOTIC_ARMOR_TITAN.HEART_OF_INMOST_LIGHT]: {
    element: [ElementType.Solar, ElementType.Void, ElementType.Arc, ElementType.Stasis, ElementType.Strand, ElementType.Prismatic],
    playstyleTemplate: "Using an ability empowers the other two. Rotate your grenade, melee, and class ability for maximum uptime."
  },
  [EXOTIC_ARMOR_TITAN.SYNTHOCEPS]: {
    element: [ElementType.Solar, ElementType.Void, ElementType.Arc, ElementType.Stasis, ElementType.Strand, ElementType.Prismatic],
    playstyleTemplate: "Increased melee lunge range and improved melee and Super damage when surrounded. Get in their faces."
  },

  // Warlock
  [EXOTIC_ARMOR_WARLOCK.NEZARECS_SIN]: {
    element: [ElementType.Void, ElementType.Prismatic],
    playstyleTemplate: "Void kills recharge your abilities insanely fast. Keep the kill streak alive to spam everything."
  },
  [EXOTIC_ARMOR_WARLOCK.CONTRAVERSE_HOLD]: {
    element: [ElementType.Void, ElementType.Prismatic],
    requiredAspects: [SUBCLASS_HASHES.VOID.WARLOCK.ASPECTS.CHAOS_ACCELERANT],
    grenadeHash: [SUBCLASS_HASHES.VOID.WARLOCK.GRENADES.VORTEX],
    playstyleTemplate: "Charge your heavy Void grenades to refund energy on hits. Throw mini black holes constantly."
  },
  [EXOTIC_ARMOR_WARLOCK.NOTHING_MANACLES]: {
    element: [ElementType.Void, ElementType.Prismatic],
    grenadeHash: [SUBCLASS_HASHES.VOID.WARLOCK.GRENADES.SCATTER],
    playstyleTemplate: "You get two Scatter Grenades that track targets. Everything explodes in purple fire."
  },
  [EXOTIC_ARMOR_WARLOCK.BRIARBINDS]: {
    element: [ElementType.Void], // Strict Void because it relies on Child of the Old Gods aspect
    requiredAspects: [SUBCLASS_HASHES.VOID.WARLOCK.ASPECTS.CHILD_OF_THE_OLD_GODS],
    classAbilityHash: [SUBCLASS_HASHES.VOID.WARLOCK.CLASS_ABILITIES.HEALING_RIFT],
    playstyleTemplate: "Your Void Soul becomes pettable. Retrieve it to redeploy it with increased duration and damage."
  },
  [EXOTIC_ARMOR_WARLOCK.SWARMERS]: {
    element: [ElementType.Strand, ElementType.Prismatic],
    grenadeHash: [SUBCLASS_HASHES.STRAND.WARLOCK.GRENADES.THREADLING, SUBCLASS_HASHES.PRISMATIC.WARLOCK.GRENADES.THREADLING],
    requiredAspects: [SUBCLASS_HASHES.PRISMATIC.WARLOCK.ASPECTS.WEAVERS_CALL, SUBCLASS_HASHES.STRAND.WARLOCK.ASPECTS.WEAVERS_CALL],
    playstyleTemplate: "Every Tangle you destroy spawns Threadlings. Your Threadlings unravel targets. Infest the battlefield."
  },
  [EXOTIC_ARMOR_WARLOCK.WINTERS_GUILE]: {
    element: [ElementType.Solar, ElementType.Void, ElementType.Arc, ElementType.Stasis, ElementType.Strand, ElementType.Prismatic],
    requiredAspects: [SUBCLASS_HASHES.PRISMATIC.WARLOCK.ASPECTS.LIGHTNING_SURGE],
    playstyleTemplate: "Melee kills escalate your melee damage to cosmic levels. One-shot everything smaller than a boss."
  },
  [EXOTIC_ARMOR_TITAN.PRECIOUS_SCARS]: {
    element: [ElementType.Solar, ElementType.Void, ElementType.Arc, ElementType.Stasis, ElementType.Strand, ElementType.Prismatic],
    playstyleTemplate: "Kills with weapons matching your subclass element heal you and nearby allies. You are the combat medic."
  },
  [EXOTIC_ARMOR_TITAN.AEON_SAFE]: {
    element: [ElementType.Solar, ElementType.Void, ElementType.Arc, ElementType.Stasis, ElementType.Strand, ElementType.Prismatic],
    playstyleTemplate: "Equip Sect of Insight. Finish mini-bosses to rain Heavy Ammo for your squad."
  },
  [EXOTIC_ARMOR_WARLOCK.SUNBRACERS]: {
    element: [ElementType.Solar, ElementType.Prismatic],
    synergisticWeapons: [EXOTIC_WEAPONS.ENERGY.SUNSHOT]
  },
  [EXOTIC_ARMOR_WARLOCK.STARFIRE_PROTOCOL]: ElementType.Solar,
  [EXOTIC_ARMOR_WARLOCK.DAWN_CHORUS]: {
    element: [ElementType.Solar, ElementType.Prismatic],
    synergisticWeapons: [EXOTIC_WEAPONS.ENERGY.POLARIS_LANCE, EXOTIC_WEAPONS.ENERGY.PROMETHEUS_LENS, EXOTIC_WEAPONS.ENERGY.SUNSHOT]
  },

  [EXOTIC_ARMOR_WARLOCK.PHOENIX_PROTOCOL]: {
    element: [ElementType.Solar, ElementType.Prismatic],
    superHash: [SUBCLASS_HASHES.SOLAR.WARLOCK.SUPER.WELL_OF_RADIANCE],
    playstyleTemplate: "Plant your Well of Radiance. Kills while inside give you Super energy back. Infinite Well for the team."
  },
  [EXOTIC_ARMOR_WARLOCK.CROWN_OF_TEMPESTS]: ElementType.Arc,
  [EXOTIC_ARMOR_WARLOCK.GEOMAG_STABILIZERS]: {
    element: [ElementType.Arc, ElementType.Prismatic],
    superHash: [SUBCLASS_HASHES.ARC.WARLOCK.SUPER.CHAOS_REACH],
    playstyleTemplate: "Sprint to top off your Chaos Reach. Cast it to melt everything. The beam lasts longer while you deal damage."
  },
  [EXOTIC_ARMOR_WARLOCK.FALLEN_SUNSTAR]: {
    element: [ElementType.Arc, ElementType.Prismatic],
    synergisticWeapons: [EXOTIC_WEAPONS.ENERGY.DELICATE_TOMB, EXOTIC_WEAPONS.ENERGY.COLDHEART]
  },
  [EXOTIC_ARMOR_WARLOCK.OSMIOMANCY_GLOVES]: {
    element: [ElementType.Stasis, ElementType.Prismatic],
    grenadeHash: [SUBCLASS_HASHES.STASIS.WARLOCK.GRENADES.COLDSNAP],
    playstyleTemplate: "You have two Coldsnap charges. Direct hits recharge them. Freeze the entire room permanently."
  },
  [EXOTIC_ARMOR_WARLOCK.BOOTS_OF_THE_ASSEMBLER]: {
    element: [ElementType.Solar, ElementType.Void, ElementType.Arc, ElementType.Stasis, ElementType.Strand, ElementType.Prismatic],
    classAbilityHash: [SUBCLASS_HASHES.SOLAR.WARLOCK.CLASS_ABILITIES.HEALING_RIFT, SUBCLASS_HASHES.SOLAR.WARLOCK.CLASS_ABILITIES.EMPOWERING_RIFT], // Hashes are same for all classes usually or discovered pool handles it, but we force rifts.
    // Actually need to be careful with hashes per subclass if we force them.
    // Ideally we just force "Rift" type, but here we list the Solar ones as proxies or assume discovery picks correctly if we don't force hash but playstyle.
    // To be safe, let's NOT force classAbilityHash here if it risks cross-class contamination, but user asked for logic.
    // We'll rely on the description to tell them to use a rift.
    playstyleTemplate: "Stand in your Rift. Seekers spawn and track to allies, healing or empowering them. Extending your rift duration."
  },
  [EXOTIC_ARMOR_WARLOCK.ASTROCYTE_VERSE]: {
    element: [ElementType.Void, ElementType.Prismatic],
    // Jump hashes are not in our DB yet, so we just describe it
    playstyleTemplate: "Use blink. You can blink more often, further, and ready weapons faster out of it. Confuse the enemy."
  },
  [EXOTIC_ARMOR_WARLOCK.MANTLE_OF_BATTLE_HARMONY]: {
    element: [ElementType.Solar, ElementType.Void, ElementType.Arc, ElementType.Stasis, ElementType.Strand, ElementType.Prismatic],
    playstyleTemplate: "Kills with weapons matching your element charge your Super fast. When Super is full, they give you a damage bonus."
  },
  [EXOTIC_ARMOR_WARLOCK.AEON_SOUL]: {
    element: [ElementType.Solar, ElementType.Void, ElementType.Arc, ElementType.Stasis, ElementType.Strand, ElementType.Prismatic],
    playstyleTemplate: "Equip the Sect of Insight mod. Finish elites to generate heavy ammo for your entire fireteam."
  },
  [EXOTIC_ARMOR_WARLOCK.BALLIDORSE_WRATHWEAVERS]: {
    element: [ElementType.Stasis],
    superHash: [SUBCLASS_HASHES.STASIS.WARLOCK.SUPER.WINTERS_WRATH],
  },
  [EXOTIC_ARMOR_WARLOCK.DEIMOSUFFUSION]: {
    element: [ElementType.Strand],
    superHash: [SUBCLASS_HASHES.STRAND.WARLOCK.SUPER.NEEDLESTORM],
  },
  [EXOTIC_ARMOR_WARLOCK.SOLIPSISM]: ElementType.Prismatic,
  [EXOTIC_ARMOR_WARLOCK.RIME_COAT_RAIMENT]: {
    element: [ElementType.Stasis, ElementType.Prismatic],
    requiredAspects: [SUBCLASS_HASHES.STASIS.WARLOCK.ASPECTS.FROSTPULSE],
    playstyleTemplate: "Frostpulse releases additional seekers that freeze targets. Control the room with every Rift."
  },
  [EXOTIC_ARMOR_HUNTER.RELATIVISM]: ElementType.Prismatic,
  [EXOTIC_ARMOR_TITAN.STOICISM]: ElementType.Prismatic,

  // New strict synergies
  [EXOTIC_ARMOR_HUNTER.GIFTED_CONVICTION]: {
    element: [ElementType.Arc, ElementType.Prismatic],
    requiredAspects: [SUBCLASS_HASHES.ARC.HUNTER.ASPECTS.ASCENSION, SUBCLASS_HASHES.PRISMATIC.HUNTER.ASPECTS.ASCENSION],
    playstyleTemplate: "Activating Ascension (airborne dodge) launches bouncing explosives and jolts enemies. Stay in the air, stay lethal."
  },
  [EXOTIC_ARMOR_TITAN.CADMUS_RIDGE_LANCECAP]: {
    element: [ElementType.Stasis, ElementType.Prismatic],
    requiredAspects: [SUBCLASS_HASHES.STASIS.TITAN.ASPECTS.DIAMOND_LANCE],
    playstyleTemplate: "Create Diamond Lances from a distance to freeze the battlefield and control the flow of combat."
  },
  [EXOTIC_ARMOR_TITAN.NO_BACKUP_PLANS]: {
    element: [ElementType.Void, ElementType.Prismatic],
    playstyleTemplate: "A defensive powerhouse that rewards aggressive shotgun play with constant Void overshields."
  },
  [EXOTIC_ARMOR_WARLOCK.CENOTAPH_MASK]: {
    element: [ElementType.Solar, ElementType.Arc, ElementType.Void, ElementType.Stasis, ElementType.Strand, ElementType.Prismatic],
    playstyleTemplate: "The ultimate team player. Mark targets with your Trace Rifle to provide constant ammo for your fireteam."
  },
  [EXOTIC_ARMOR_HUNTER.RENEWAL_GRASPS]: {
    element: [ElementType.Stasis, ElementType.Prismatic],
    playstyleTemplate: "Turn your Duskfield grenades into fortress-like zones that protect allies and weaken enemies."
  },
  [EXOTIC_ARMOR_HUNTER.CYRTARACHNE_FACADE]: {
    element: [ElementType.Strand, ElementType.Prismatic],
    playstyleTemplate: "Gain constant Woven Mail by using your grapple, allowing you to dive into the thick of battle safely."
  },
  // Expanded Logic for User Requests
  [EXOTIC_ARMOR_TITAN.ETERNAL_WARRIOR]: {
    element: [ElementType.Arc, ElementType.Prismatic],
    superHash: [SUBCLASS_HASHES.ARC.TITAN.SUPER.FISTS_OF_HAVOC],
    playstyleTemplate: "Fist of Havoc grants an escalating damage bonus to Arc weapons. Become the storm."
  },
  [EXOTIC_ARMOR_TITAN.PHOENIX_CRADLE]: {
    element: [ElementType.Solar, ElementType.Prismatic],
    requiredAspects: [SUBCLASS_HASHES.SOLAR.TITAN.ASPECTS.SOL_INVICTUS],
    playstyleTemplate: "Sunspots you create last longer and apply their restoration and ability regen buffs to allies."
  },
  [EXOTIC_ARMOR_TITAN.MELAS_PANOPLIA]: {
    element: [ElementType.Solar, ElementType.Prismatic],
    meleeHash: [SUBCLASS_HASHES.SOLAR.TITAN.MELEE.THROWING_HAMMER],
    requiredAspects: [SUBCLASS_HASHES.SOLAR.TITAN.ASPECTS.ROARING_FLAMES],
    playstyleTemplate: "Become a Forge Master. Rapid Solar kills or Firesprites let you recall your Throwing Hammer instantly."
  },
  [EXOTIC_ARMOR_WARLOCK.SPEAKERS_SIGHT]: {
    element: [ElementType.Solar, ElementType.Prismatic],
    grenadeHash: [SUBCLASS_HASHES.SOLAR.WARLOCK.GRENADES.HEALING],
    requiredAspects: [SUBCLASS_HASHES.SOLAR.WARLOCK.ASPECTS.TOUCH_OF_FLAME],
    playstyleTemplate: "Consume your Healing Grenade to spawn a turret that shoots restoration orbs at allies. The ultimate medic."
  },
  [EXOTIC_ARMOR_WARLOCK.APOTHEOSIS_VEIL]: {
    element: [ElementType.Solar, ElementType.Arc, ElementType.Void, ElementType.Stasis, ElementType.Strand, ElementType.Prismatic],
    playstyleTemplate: "Cast your Super to instantly recharge all abilities for you and nearby allies. Spam grenade and melee immediately after to DPS."
  },
  [EXOTIC_ARMOR_TITAN.WISHFUL_IGNORANCE]: {
    element: [ElementType.Strand, ElementType.Prismatic],
    meleeHash: [SUBCLASS_HASHES.STRAND.TITAN.MELEE.FRENZIED_BLADE, SUBCLASS_HASHES.PRISMATIC.TITAN.MELEE.FRENZIED_BLADE],
    requiredAspects: [SUBCLASS_HASHES.STRAND.TITAN.ASPECTS.BANNER_OF_WAR, SUBCLASS_HASHES.PRISMATIC.TITAN.ASPECTS.KNOCKOUT],
    playstyleTemplate: "Frenzied Blade gets a 4th charge and deals massive damage. Heal through combat with Banner of War or Knockout."
  },
  [EXOTIC_ARMOR_WARLOCK.MATAIODOXIA]: {
    element: [ElementType.Strand, ElementType.Prismatic],
    playstyleTemplate: "Damaging targets with your Arcane Needle causes a suspending detonation. Piercing shots weaken barriers."
  },
  [EXOTIC_ARMOR_HUNTER.LUCKY_PANTS]: {
    element: [ElementType.Solar, ElementType.Void, ElementType.Arc, ElementType.Stasis, ElementType.Strand, ElementType.Prismatic],
    weaponType: "Hand Cannon",
    synergisticWeapons: [
      EXOTIC_WEAPONS.KINETIC.MALFEASANCE,
      EXOTIC_WEAPONS.KINETIC.CRIMSON,
      EXOTIC_WEAPONS.KINETIC.ACE_OF_SPADES,
      EXOTIC_WEAPONS.KINETIC.LAST_WORD,
      EXOTIC_WEAPONS.KINETIC.THORN,
      EXOTIC_WEAPONS.KINETIC.LUMINA,
      EXOTIC_WEAPONS.ENERGY.SUNSHOT,
      EXOTIC_WEAPONS.ENERGY.ERIANAS_VOW
    ],
    playstyleTemplate: "Readying a fully loaded Hand Cannon matching your subclass element (or Kinetic) grants massive damage bonuses."
  },
  [EXOTIC_ARMOR_HUNTER.ORPHEUS_RIG]: {
    element: [ElementType.Void],
    superHash: [SUBCLASS_HASHES.VOID.HUNTER.SUPER.SHADOWSHOT_DEADFALL, SUBCLASS_HASHES.VOID.HUNTER.SUPER.SHADOWSHOT_MOEBIUS_QUIVER],
    playstyleTemplate: "Fire your tether into large groups. Kill them to generate orbs and refund your super energy."
  },
  [EXOTIC_ARMOR_HUNTER.MOTHKEEPER_WRAPS]: {
    element: [ElementType.Arc, ElementType.Prismatic],
    playstyleTemplate: "Your grenade becomes a cage of loyal moths. They blind enemies or grant overshields to allies."
  },
  [EXOTIC_ARMOR_HUNTER.STAR_EATER_SCALES]: {
    element: [ElementType.Solar, ElementType.Void, ElementType.Arc, ElementType.Stasis, ElementType.Strand, ElementType.Prismatic],
    playstyleTemplate: "Your Super is much more powerful when you have a full stack of Feast of Light. Overcharge it with orbs."
  },
  [EXOTIC_ARMOR_HUNTER.FOETRACER]: {
    element: [ElementType.Solar, ElementType.Void, ElementType.Arc, ElementType.Stasis, ElementType.Strand, ElementType.Prismatic],
    playstyleTemplate: "Damaging a powerful combatant with an ability grants a temporary damage bonus to weapons with a matching element."
  },
  [EXOTIC_ARMOR_HUNTER.TRITON_VICE]: {
    element: [ElementType.Solar, ElementType.Void, ElementType.Arc, ElementType.Stasis, ElementType.Strand, ElementType.Prismatic],
    weaponType: "Glaive",
    playstyleTemplate: "Increase Glaive performance and explosion damage while surrounded. Perfect for aggressive playstyles."
  },
  [EXOTIC_ARMOR_WARLOCK.VERITYS_BROW]: {
    element: [ElementType.Solar, ElementType.Void, ElementType.Arc, ElementType.Stasis, ElementType.Strand, ElementType.Prismatic],
    playstyleTemplate: "Weapon kills with a matching element grant stacks. These stacks increase your grenade damage and recharge grenades."
  },
  [EXOTIC_ARMOR_WARLOCK.NECROTIC_GRIP]: {
    element: [ElementType.Solar, ElementType.Void, ElementType.Arc, ElementType.Stasis, ElementType.Strand, ElementType.Prismatic],
    playstyleTemplate: "Damaging combatants with melee attacks or Weapons of Sorrow poisons them. Poison spreads on kill."
  },
  [EXOTIC_ARMOR_TITAN.ACTIUM_WAR_RIG]: {
    element: [ElementType.Solar, ElementType.Void, ElementType.Arc, ElementType.Stasis, ElementType.Strand, ElementType.Prismatic],
    weaponType: "Auto Rifle",
    synergisticWeapons: [EXOTIC_WEAPONS.KINETIC.SWEET_BUSINESS, EXOTIC_WEAPONS.KINETIC.KHVOSTOV_7G_0X, EXOTIC_WEAPONS.POWER.HEIR_APPARENT, EXOTIC_WEAPONS.POWER.THUNDERLORD],
    playstyleTemplate: "Steadily reloads your Auto Rifle or Machine Gun from reserves. Constant fire for maximum pressure."
  },
};

// Clever name generation components for chaos builds
const CHAOS_NAME_PREFIXES = [
  'Chaotic', 'Unpredictable', 'Wild', 'Rogue', 'Maverick', 'Anarchic',
  'Volatile', 'Unstable', 'Feral', 'Untamed', 'Reckless', 'Defiant',
  'Tempest', 'Storm', 'Thunder', 'Shadow', 'Phantom', 'Specter',
  'Blazing', 'Frozen', 'Charged', 'Woven', 'Void-touched', 'Prismatic'
];

const CHAOS_NAME_SUFFIXES_BY_CLASS: Record<GuardianClass, string[]> = {
  [GuardianClass.Titan]: [
    'Warlord', 'Berserker', 'Juggernaut', 'Colossus', 'Bulwark', 'Devastator',
    'Sentinel', 'Striker', 'Siegebreaker', 'Vanguard', 'Warden', 'Champion'
  ],
  [GuardianClass.Hunter]: [
    'Stalker', 'Assassin', 'Trickster', 'Phantom', 'Predator', 'Wraith',
    'Sharpshooter', 'Reaper', 'Marauder', 'Nightblade', 'Drifter', 'Outlaw'
  ],
  [GuardianClass.Warlock]: [
    'Channeler', 'Arcanist', 'Invoker', 'Sage', 'Oracle', 'Harbinger',
    'Stormcaller', 'Voidweaver', 'Pyromancer', 'Scholar', 'Adept', 'Mystic'
  ],
};

const CHAOS_NAME_ELEMENTS: Record<ElementType, string[]> = {
  [ElementType.Void]: ['Void', 'Null', 'Entropy', 'Abyss', 'Dark Matter'],
  [ElementType.Solar]: ['Solar', 'Flame', 'Inferno', 'Phoenix', 'Radiant'],
  [ElementType.Arc]: ['Arc', 'Lightning', 'Thunder', 'Storm', 'Voltage'],
  [ElementType.Stasis]: ['Stasis', 'Frost', 'Glacier', 'Cryo', 'Winter'],
  [ElementType.Strand]: ['Strand', 'Weave', 'Thread', 'Silk', 'Web'],
  [ElementType.Prismatic]: ['Prismatic', 'Transcendent', 'Chromatic', 'Spectrum', 'Convergence'],
  [ElementType.Kinetic]: ['Kinetic', 'Force', 'Impact', 'Momentum', 'Ballistic'],
  [ElementType.Neutral]: ['Pure', 'Stable', 'Balanced', 'Consistent', 'Versatile'],
};

// Playstyle generators based on build components
function generateChaosPlaystyle(
  element: ElementType,
  guardianClass: GuardianClass,
  weaponName: string,
  armorName: string
): string {
  const elementVerbs: Record<ElementType, string[]> = {
    [ElementType.Void]: ['suppress', 'weaken', 'devour', 'volatile'],
    [ElementType.Solar]: ['ignite', 'scorch', 'radiate', 'heal'],
    [ElementType.Arc]: ['jolt', 'amplify', 'blind', 'chain'],
    [ElementType.Stasis]: ['freeze', 'shatter', 'slow', 'crystalize'],
    [ElementType.Strand]: ['suspend', 'unravel', 'sever', 'tangle'],
    [ElementType.Prismatic]: ['transcend', 'weave light and dark', 'combine powers', 'unleash chaos'],
    [ElementType.Kinetic]: ['impact', 'strike', 'force', 'momentum'],
    [ElementType.Neutral]: ['adapt', 'survive', 'endure', 'overcome'],
  };

  const classActions: Record<GuardianClass, string[]> = {
    [GuardianClass.Titan]: ['punch through enemies', 'create barriers', 'crash into combat', 'stand your ground'],
    [GuardianClass.Hunter]: ['strike from shadows', 'dodge and weave', 'precision kill', 'outmaneuver foes'],
    [GuardianClass.Warlock]: ['channel power', 'support allies', 'rain destruction', 'manipulate energy'],
  };

  const verbs = elementVerbs[element] || elementVerbs[ElementType.Void];
  const actions = classActions[guardianClass];

  const templates = [
    `Use ${armorName} to ${verbs[0]} enemies while ${weaponName} provides critical support. ${actions[0].charAt(0).toUpperCase() + actions[0].slice(1)} to control the battlefield.`,
    `A high-risk, high-reward rotation. Soften targets with ${weaponName}, then ${actions[1]} to capitalize on your ${element} synergy. ${armorName} is your secret weapon.`,
    `Tactical chaos. Chains of ${verbs[1]} and ${verbs[2]} will overwhelm the frontlines. Use ${weaponName} to pick off stragglers while ${actions[2]}.`,
    `Focus on maximum ability uptime. ${armorName} ensures constant ${verbs[3]} pressure, while ${weaponName} generates the resources you need to ${actions[3]}.`,
    `Improvise and adapt. Your ${element} powers, enhanced by ${armorName}, create a perfect storm. ${weaponName} serves as the anchor for your aggressive ${actions[0]} style.`
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

function generateChaosName(element: ElementType, guardianClass: GuardianClass): string {
  // Defensive: Ensure we always have valid data
  const suffixArray = CHAOS_NAME_SUFFIXES_BY_CLASS[guardianClass] || CHAOS_NAME_SUFFIXES_BY_CLASS[GuardianClass.Titan];
  const elementNamesArray = CHAOS_NAME_ELEMENTS[element] || CHAOS_NAME_ELEMENTS[ElementType.Void];

  // 50% chance for element-based name, 50% for prefix-based
  if (Math.random() > 0.5) {
    const elementName = elementNamesArray[Math.floor(Math.random() * elementNamesArray.length)] || 'Unknown';
    const suffix = suffixArray[Math.floor(Math.random() * suffixArray.length)] || 'Guardian';
    return `${elementName} ${suffix}`;
  } else {
    const prefix = CHAOS_NAME_PREFIXES[Math.floor(Math.random() * CHAOS_NAME_PREFIXES.length)] || 'Chaotic';
    const suffix = suffixArray[Math.floor(Math.random() * suffixArray.length)] || 'Guardian';
    return `${prefix} ${suffix}`;
  }
}

// Reverse lookup for exotic names
function getExoticArmorName(hash: number, guardianClass: GuardianClass): string {
  // 1. Try manifest first (API First)
  const apiName = manifestService.getName(hash);
  if (apiName) return apiName;

  // 2. Fallback to hardcoded names
  const pools: Record<GuardianClass, Record<string, number>> = {
    [GuardianClass.Titan]: EXOTIC_ARMOR_TITAN,
    [GuardianClass.Hunter]: EXOTIC_ARMOR_HUNTER,
    [GuardianClass.Warlock]: EXOTIC_ARMOR_WARLOCK,
  };
  const pool = pools[guardianClass];
  for (const [name, h] of Object.entries(pool)) {
    if (h === hash) {
      return name.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    }
  }
  return 'Unknown Exotic';
}

function getExoticWeaponName(hash: number): string {
  // 1. Try manifest first (API First)
  const apiName = manifestService.getName(hash);
  if (apiName) return apiName;

  // 2. Fallback to hardcoded names
  const allWeapons = { ...EXOTIC_WEAPONS.KINETIC, ...EXOTIC_WEAPONS.ENERGY, ...EXOTIC_WEAPONS.POWER };
  for (const [name, h] of Object.entries(allWeapons)) {
    if (h === hash) {
      return name.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    }
  }
  return 'Unknown Weapon';
}

function getWeaponSlot(hash: number): ItemSlot {
  // 1. Try manifest first (API First)
  const rawDefs = (manifestService as any).manifestData?.DestinyInventoryItemDefinition || {};
  const raw = rawDefs[hash];
  if (raw?.inventory?.bucketTypeHash) {
    const bucketHash = raw.inventory.bucketTypeHash;
    if (bucketHash === 1498876634) return ItemSlot.Kinetic;
    if (bucketHash === 2465295030) return ItemSlot.Energy;
    if (bucketHash === 953998646) return ItemSlot.Power;
  }

  // 2. Fallback to hardcoded slot maps
  if (Object.values(EXOTIC_WEAPONS.KINETIC).includes(hash)) return ItemSlot.Kinetic;
  if (Object.values(EXOTIC_WEAPONS.ENERGY).includes(hash)) return ItemSlot.Energy;
  return ItemSlot.Power;
}

// Reversed lookup for exotic names

export function generateChaosBuild(
  guardianClass: GuardianClass,
  element?: ElementType,
  ownedExpansions: Expansion[] = [],
  previousBuild?: BuildTemplate | null,
  lockedSlots?: LockedSlots,
  depth: number = 0
): BuildTemplate {
  // Safety break for infinite recursion
  if (depth > 2) {
    warnLog('ChaosGenerator', '⚠️ Max recursion reached, falling back to Void');
    const baseBuild = BUILD_TEMPLATES.find(b => b.guardianClass === guardianClass && b.element === ElementType.Void);
    if (baseBuild) return baseBuild;
    // Ultimate fallback if even template missing
    throw new Error("Critical: No base build found for fallback.");
  }

  // 1. Determine Weapon (Respect Locks)
  let weaponHash: number;
  let weaponValues: number[] = [];
  const apiWeapons = manifestService.getExoticWeapons();
  if (apiWeapons.length > 0) {
    weaponValues = apiWeapons.map(w => w.hash);
  } else {
    weaponValues = [
      ...Object.values(EXOTIC_WEAPONS.KINETIC),
      ...Object.values(EXOTIC_WEAPONS.ENERGY),
      ...Object.values(EXOTIC_WEAPONS.POWER),
    ] as number[];
  }

  // Pre-pick weapon if locked to help influence armor/element
  if (lockedSlots?.weapon && previousBuild?.exoticWeapon) {
    weaponHash = previousBuild.exoticWeapon.hash;
  } else {
    weaponHash = 0; // We'll pick this later if armor picked first
  }

  // 2. Determine Armor (Respect Locks)
  let armorHash: number;
  let armorValues: number[] = [];

  const apiArmor = manifestService.getExoticArmor(guardianClass);
  if (apiArmor.length > 0) {
    armorValues = apiArmor.map(a => a.hash);
  } else {
    let armorPoolFallback: Record<string, number> = {};
    if (guardianClass === GuardianClass.Titan) armorPoolFallback = EXOTIC_ARMOR_TITAN;
    if (guardianClass === GuardianClass.Hunter) armorPoolFallback = EXOTIC_ARMOR_HUNTER;
    if (guardianClass === GuardianClass.Warlock) armorPoolFallback = EXOTIC_ARMOR_WARLOCK;
    armorValues = Object.values(armorPoolFallback).filter(v => typeof v === 'number') as number[];
  }

  if (lockedSlots?.armor && previousBuild?.exoticArmor) {
    armorHash = previousBuild.exoticArmor.hash;
  } else {
    // If element is already locked, filter armor
    let currentFilterElement = element;
    if (lockedSlots?.super && previousBuild) {
      currentFilterElement = previousBuild.element;
    }

    // NEW: If weapon is locked, favor armor that matches it
    const weaponSynergy = weaponHash ? EXOTIC_WEAPON_SYNERGY[weaponHash] : null;

    let possibleArmor = [...armorValues];
    if (currentFilterElement && currentFilterElement !== ElementType.Prismatic) {
      possibleArmor = possibleArmor.filter(hash => {
        const affinity = EXOTIC_ELEMENT_AFFINITY[hash];
        if (!affinity) return true;
        if (typeof affinity === 'string') return affinity === currentFilterElement;
        return affinity.element.includes(currentFilterElement as ElementType);
      });
    }

    const weightedArmorPool: number[] = [];
    for (const h of possibleArmor) {
      let weight = 1;
      const affinity = EXOTIC_ELEMENT_AFFINITY[h];
      if (affinity) weight += 2; // Favor exotics with logic

      // favor matching weapon synergy if weapon is locked
      if (weaponSynergy && affinity && typeof affinity !== 'string') {
        if (affinity.synergisticWeapons?.includes(weaponHash)) weight += 10;
        if (weaponSynergy.synergy?.some(s => affinity.element.includes(s))) weight += 5;
        if (weaponSynergy.damageType === currentFilterElement) weight += 2; // Slight points for generic element match
      }

      for (let i = 0; i < weight; i++) weightedArmorPool.push(h);
    }

    armorHash = weightedArmorPool[Math.floor(Math.random() * weightedArmorPool.length)] || armorValues[0];
  }

  // 3. Determine Element
  let chosenElement: ElementType | undefined = element;
  if (!chosenElement && (element as any) === 'all') chosenElement = undefined;

  const armorAffinity = EXOTIC_ELEMENT_AFFINITY[armorHash];
  const weaponAffinity = weaponHash ? EXOTIC_WEAPON_SYNERGY[weaponHash] : null;

  if (lockedSlots?.super && previousBuild) {
    chosenElement = previousBuild.element;
  } else if (!chosenElement) {
    // Priority 1: Armor's mandatory element
    if (armorAffinity) {
      if (typeof armorAffinity === 'string') {
        chosenElement = armorAffinity;
      } else {
        // Pick one that ALSO matches the weapon if possible
        const possibleElements = armorAffinity.element;
        if (weaponAffinity?.synergy) {
          const intersect = possibleElements.filter(e => weaponAffinity.synergy?.includes(e));
          chosenElement = intersect.length > 0
            ? intersect[Math.floor(Math.random() * intersect.length)]
            : possibleElements[Math.floor(Math.random() * possibleElements.length)];
        } else {
          chosenElement = possibleElements[Math.floor(Math.random() * possibleElements.length)];
        }
      }
    } else if (weaponAffinity?.synergy) {
      // Priority 2: Weapon's synergy
      chosenElement = weaponAffinity.synergy[Math.floor(Math.random() * weaponAffinity.synergy.length)];
    } else {
      // Priority 3: Random
      const elements = [ElementType.Void, ElementType.Solar, ElementType.Arc, ElementType.Stasis, ElementType.Strand, ElementType.Prismatic];
      chosenElement = elements[Math.floor(Math.random() * elements.length)];
    }
  }

  // 4. Determine Forced Abilities if exotic requires it
  let forcedSuperHash: number | undefined;
  let forcedGrenadeHash: number | undefined;
  let forcedMeleeHash: number | undefined;
  let forcedClassAbilityHash: number | undefined;

  if (armorAffinity && typeof armorAffinity !== 'string') {
    if (armorAffinity.superHash) {
      forcedSuperHash = armorAffinity.superHash[Math.floor(Math.random() * armorAffinity.superHash.length)];
    }
    if (armorAffinity.grenadeHash) {
      forcedGrenadeHash = armorAffinity.grenadeHash[Math.floor(Math.random() * armorAffinity.grenadeHash.length)];
    }
    if (armorAffinity.meleeHash) {
      forcedMeleeHash = armorAffinity.meleeHash[Math.floor(Math.random() * armorAffinity.meleeHash.length)];
    }
    if (armorAffinity.classAbilityHash) {
      forcedClassAbilityHash = armorAffinity.classAbilityHash[Math.floor(Math.random() * armorAffinity.classAbilityHash.length)];
    }
  }

  // Final Safety Check for Subclass Elements
  if (chosenElement === (ElementType.Kinetic as any) || chosenElement === (ElementType.Neutral as any)) {
    const validSubclasses = [
      ElementType.Void,
      ElementType.Solar,
      ElementType.Arc,
      ElementType.Stasis,
      ElementType.Strand,
      ElementType.Prismatic,
    ];
    chosenElement = validSubclasses[Math.floor(Math.random() * validSubclasses.length)];
  }

  const elementKeyMap: Record<string, keyof typeof SUBCLASS_HASHES> = {
    [ElementType.Void]: 'VOID',
    [ElementType.Solar]: 'SOLAR',
    [ElementType.Arc]: 'ARC',
    [ElementType.Stasis]: 'STASIS',
    [ElementType.Strand]: 'STRAND',
    [ElementType.Prismatic]: 'PRISMATIC',
    // Fallbacks just in case chosenElement somehow remains or bypasses check
    [ElementType.Kinetic]: 'VOID',
    [ElementType.Neutral]: 'VOID',
  };

  const classKeyMap: Record<GuardianClass, 'TITAN' | 'HUNTER' | 'WARLOCK'> = {
    [GuardianClass.Titan]: 'TITAN',
    [GuardianClass.Hunter]: 'HUNTER',
    [GuardianClass.Warlock]: 'WARLOCK',
  };

  const elKey = elementKeyMap[chosenElement || ElementType.Void];
  const classKey = classKeyMap[guardianClass];

  const elementData = SUBCLASS_HASHES[elKey];
  const classData = elementData ? (elementData as any)[classKey] : null;

  if (!elementData || !classData) {
    warnLog('ChaosGenerator', `⚠️ Missing data for ${elKey}, falling back to Void`);
    return generateChaosBuild(guardianClass, ElementType.Void, ownedExpansions, previousBuild, lockedSlots, depth + 1);
  }

  // 3. Pick Subclass Items (Respect Locks)
  // 1. Try to get dynamic pool from Manifest Discovery (API First)
  const dmgMap: Record<string, number> = {
    [ElementType.Void]: 4,
    [ElementType.Solar]: 3,
    [ElementType.Arc]: 2,
    [ElementType.Stasis]: 6,
    [ElementType.Strand]: 7,
    [ElementType.Prismatic]: 1,
  };

  const discoveredPool = manifestService.getDiscoveredAbilities(guardianClass, dmgMap[chosenElement || ElementType.Void]);
  const hasDiscovered = Object.keys(discoveredPool).length > 0;

  const pickRandom = (obj: any, category?: string) => {
    // 1. Try discovered pool first - BUT skip for class abilities as manifest damageType is often wrong
    if (hasDiscovered && category && category !== 'CLASS_ABILITIES' && discoveredPool[category] && discoveredPool[category].length > 0) {
      const pool = discoveredPool[category];
      return pool[Math.floor(Math.random() * pool.length)];
    }
    // 2. Fallback to hardcoded (always used for CLASS_ABILITIES to ensure element matching)
    const values = Object.values(obj).filter(v => typeof v === 'number') as number[];
    if (values.length === 0) return 0;
    const shuffled = [...values];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled[0];
  };

  const superHash = (lockedSlots?.super && previousBuild?.subclassConfig)
    ? previousBuild.subclassConfig.superHash
    : (forcedSuperHash || pickRandom(classData.SUPER, 'SUPER'));

  const grenadeHash = (lockedSlots?.grenade && previousBuild?.subclassConfig?.grenadeHash)
    ? previousBuild.subclassConfig.grenadeHash
    : (forcedGrenadeHash || pickRandom(classData.GRENADES, 'GRENADES'));

  const meleeHash = (lockedSlots?.melee && previousBuild?.subclassConfig?.meleeHash)
    ? previousBuild.subclassConfig.meleeHash
    : (forcedMeleeHash || pickRandom(classData.MELEE, 'MELEE'));

  const classAbilityHash = (lockedSlots?.classAbility && previousBuild?.subclassConfig?.classAbilityHash)
    ? previousBuild.subclassConfig.classAbilityHash
    : (forcedClassAbilityHash || pickRandom(classData.CLASS_ABILITIES, 'CLASS_ABILITIES'));

  // Aspects - Fisher-Yates shuffle
  let selectedAspects: number[] = [];
  if (lockedSlots?.aspects && previousBuild?.subclassConfig?.aspects) {
    selectedAspects = previousBuild.subclassConfig.aspects;
  } else {
    const aspectHashes = Object.values(classData.ASPECTS) as number[];
    const shuffled = [...aspectHashes];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // STRICT SYNERGY: If armor requires specific aspects, ensure one is picked
    if (armorAffinity && typeof armorAffinity !== 'string' && armorAffinity.requiredAspects) {
      const required = armorAffinity.requiredAspects.filter(h => aspectHashes.includes(h));
      if (required.length > 0) {
        const forcedAspect = required[Math.floor(Math.random() * required.length)];
        selectedAspects = [forcedAspect, ...shuffled.filter(h => h !== forcedAspect)].slice(0, 2);
      } else {
        selectedAspects = shuffled.slice(0, 2);
      }
    } else {
      selectedAspects = shuffled.slice(0, 2);
    }
  }

  // Fragments - always pick 4 for consistency (or 5 for Prismatic)
  let selectedFragments: number[] = [];
  if (lockedSlots?.fragments && previousBuild?.subclassConfig?.fragments) {
    selectedFragments = previousBuild.subclassConfig.fragments;
  } else {
    let fragmentPool: number[] = [];
    if (chosenElement === ElementType.Prismatic) {
      fragmentPool = Object.values(SUBCLASS_HASHES.PRISMATIC.FRAGMENTS);
    } else {
      fragmentPool = Object.values((SUBCLASS_HASHES[elKey] as any).FRAGMENTS);
    }
    // Fisher-Yates shuffle
    const shuffled = [...fragmentPool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    // Prismatic can use 5 fragments, others use 4
    const fragmentCount = chosenElement === ElementType.Prismatic ? 5 : 4;
    selectedFragments = shuffled.slice(0, fragmentCount);
  }

  // 4. Pick Weapon (Respect Locks)
  if (!weaponHash) {
    const weightedWeaponPool: number[] = [];
    for (const h of weaponValues) {
      let weight = 1;
      const wSynergy = EXOTIC_WEAPON_SYNERGY[h];

      // Points for explicit synergy with picked armor
      if (armorAffinity && typeof armorAffinity !== 'string') {
        if (armorAffinity.synergisticWeapons?.includes(h)) weight += 20;
      }

      // Points for damageType match
      if (wSynergy) {
        if (wSynergy.damageType === chosenElement) weight += 5;
        if (wSynergy.synergy?.includes(chosenElement as ElementType)) weight += 10;
        if (wSynergy.damageType === ElementType.Kinetic || wSynergy.damageType === ElementType.Neutral) weight += 2;
      }

      for (let i = 0; i < weight; i++) weightedWeaponPool.push(h);
    }

    weaponHash = weightedWeaponPool[Math.floor(Math.random() * weightedWeaponPool.length)] || weaponValues[0];
  }

  // Get actual names for the exotics
  const armorName = getExoticArmorName(armorHash, guardianClass);
  const weaponName = getExoticWeaponName(weaponHash);
  const weaponSlot = getWeaponSlot(weaponHash);

  // Generate clever name and playstyle
  const buildName = generateChaosName(chosenElement || ElementType.Void, guardianClass);

  // CUSTOM PLAYSTYLE LOGIC: Use affinity template if available
  let playstyle = '';
  const isExplicitSynergy = armorAffinity && typeof armorAffinity !== 'string' && armorAffinity.synergisticWeapons?.includes(weaponHash);

  if (isExplicitSynergy && armorAffinity && typeof armorAffinity !== 'string') {
    playstyle = `${armorAffinity.playstyleTemplate} This build is perfectly tuned for ${weaponName}, which shares a direct synergy with your ${armorName}.`;
  } else if (armorAffinity && typeof armorAffinity !== 'string' && armorAffinity.playstyleTemplate) {
    playstyle = `${armorAffinity.playstyleTemplate} Your ${weaponName} provides additional support while you utilize your ${chosenElement} abilities.`;
  } else {
    playstyle = generateChaosPlaystyle(
      chosenElement || ElementType.Void,
      guardianClass,
      weaponName,
      armorName
    );
  }

  return {
    id: `chaos-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: buildName,
    element: chosenElement || ElementType.Void,
    guardianClass: guardianClass,
    requiredExpansion: Expansion.BaseGame,
    exoticWeapon: {
      hash: weaponHash,
      name: weaponName,
      slot: weaponSlot,
    },
    exoticArmor: {
      hash: armorHash,
      name: armorName,
      slot: ItemSlot.Chest, // Default, UI will show correct slot from manifest
    },
    subclassConfig: {
      superHash,
      aspects: selectedAspects,
      fragments: selectedFragments,
      grenadeHash,
      meleeHash,
      classAbilityHash,
    },
    playstyle: playstyle,
    difficulty: Difficulty.Advanced,
    armorMods: modService.suggestMods(chosenElement || ElementType.Void, Difficulty.Advanced),
  };
}
