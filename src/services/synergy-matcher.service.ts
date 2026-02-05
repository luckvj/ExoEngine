/**
 * Synergy Matcher Service
 * Lazy-loads synergy data by class and finds matching synergies
 */
import { itemSearchService, type ItemSearchResult } from './item-search.service';
import type { GuardianClass } from '../types';
import { BUCKET_HASHES } from '../config/bungie.config';
import { debugLog } from '../utils/logger';

// Synergy structure from JSON files
export interface DashboardSynergy {
  score: number;
  classType: 0 | 1 | 2;
  armor: string;
  weapon: string;
  buildName: string;
  description: string;
  subclassType: string;
  super: string;
  classAbility: string;
  jump: string;
  melee: string;
  grenade: string;
  aspects: string[];
  fragments: string[];
  fragmentSlots: number;
  element: string;
  transcendentAbility?: string;
  definition?: any;
}

// Wire connection for rendering
export interface SynergyConnection {
  synergy: DashboardSynergy;
  sourceType: 'subclass' | 'armor' | 'weapon';
  armorResult: ItemSearchResult | null;
  weaponResult: ItemSearchResult | null;
  element: string;
}

import { SYNERGY_DEFINITIONS } from '../constants/synergy-definitions';


// Valid defaults that map to keys in item-hashes.ts
const FALLBACK_DEFAULTS: Record<string, Record<number, {
  super: string;
  classAbility: string;
  jump: string;
  melee: string;
  grenade: string;
  aspects: string[];
  fragments: string[];
}>> = {
  solar: {
    0: { // Titan
      super: 'Hammer of Sol', classAbility: 'Towering Barricade', jump: 'Strafe Lift', melee: 'Throwing Hammer', grenade: 'Thermite Grenade',
      aspects: ['Sol Invictus', 'Roaring Flames'], fragments: ['Ember of Torches', 'Ember of Empyrean', 'Ember of Solace']
    },
    1: { // Hunter
      super: 'Golden Gun: Marksman', classAbility: 'Marksman\'s Dodge', jump: 'Triple Jump', melee: 'Knife Trick', grenade: 'Tripmine Grenade',
      aspects: ['Knock \'Em Down', 'On Your Mark'], fragments: ['Ember of Torches', 'Ember of Singeing', 'Ember of Searing']
    },
    2: { // Warlock
      super: 'Well of Radiance', classAbility: 'Healing Rift', jump: 'Burst Glide', melee: 'Celestial Fire', grenade: 'Solar Grenade',
      aspects: ['Touch of Flame', 'Heat Rises'], fragments: ['Ember of Ashes', 'Ember of Char', 'Ember of Wonder']
    }
  },
  arc: {
    0: { // Titan
      super: 'Thundercrash', classAbility: 'Thruster', jump: 'Catapult Lift', melee: 'Thunderclap', grenade: 'Storm Grenade',
      aspects: ['Touch of Thunder', 'Knockout'], fragments: ['Spark of Shock', 'Spark of Magnitude', 'Spark of Resistance']
    },
    1: { // Hunter
      super: 'Gathering Storm', classAbility: 'Gambler\'s Dodge', jump: 'Triple Jump', melee: 'Combination Blow', grenade: 'Pulse Grenade',
      aspects: ['Flow State', 'Lethal Current'], fragments: ['Spark of Shock', 'Spark of Ions', 'Spark of Resistance']
    },
    2: { // Warlock
      super: 'Chaos Reach', classAbility: 'Healing Rift', jump: 'Burst Glide', melee: 'Chain Lightning', grenade: 'Pulse Grenade',
      aspects: ['Electrostatic Mind', 'Arc Soul'], fragments: ['Spark of Shock', 'Spark of Beacons', 'Spark of Discharge']
    }
  },
  void: {
    0: {
      super: 'Twilight Arsenal', classAbility: 'Towering Barricade', jump: 'Strafe Lift', melee: 'Shield Throw', grenade: 'Vortex Grenade',
      aspects: ['Bastion', 'Controlled Demolition'], fragments: ['Echo of Undermining', 'Echo of Starvation', 'Echo of Persistence']
    },
    1: {
      super: 'Shadowshot: Deadfall', classAbility: 'Gambler\'s Dodge', jump: 'Triple Jump', melee: 'Snare Bomb', grenade: 'Vortex Grenade',
      aspects: ['Vanishing Step', 'Stylish Executioner'], fragments: ['Echo of Undermining', 'Echo of Starvation', 'Echo of Persistence']
    },
    2: {
      super: 'Nova Bomb: Cataclysm', classAbility: 'Healing Rift', jump: 'Burst Glide', melee: 'Pocket Singularity', grenade: 'Vortex Grenade',
      aspects: ['Feed the Void', 'Child of the Old Gods'], fragments: ['Echo of Undermining', 'Echo of Starvation', 'Echo of Remnants']
    }
  },
  stasis: {
    0: {
      super: 'Glacial Quake', classAbility: 'Towering Barricade', jump: 'High Lift', melee: 'Shiver Strike', grenade: 'Glacier Grenade',
      aspects: ['Tectonic Harvest', 'Diamond Lance'], fragments: ['Whisper of Shards', 'Whisper of Rime', 'Whisper of Chains']
    },
    1: {
      super: 'Silence and Squall', classAbility: 'Marksman\'s Dodge', jump: 'Triple Jump', melee: 'Withering Blade', grenade: 'Duskfield Grenade',
      aspects: ['Touch of Winter', 'Grim Harvest'], fragments: ['Whisper of Shards', 'Whisper of Durance', 'Whisper of Chains']
    },
    2: {
      super: 'Winter\'s Wrath', classAbility: 'Healing Rift', jump: 'Burst Glide', melee: 'Penumbral Blast', grenade: 'Coldsnap Grenade',
      aspects: ['Iceflare Bolts', 'Bleak Watcher'], fragments: ['Whisper of Torment', 'Whisper of Refraction', 'Whisper of Chains']
    }
  },
  strand: {
    0: {
      super: 'Bladefury', classAbility: 'Towering Barricade', jump: 'Strafe Lift', melee: 'Frenzied Blade', grenade: 'Shackle Grenade',
      aspects: ['Banner of War', 'Into the Fray'], fragments: ['Thread of Warding', 'Thread of Generation', 'Thread of Fury']
    },
    1: {
      super: 'Silkstrike', classAbility: 'Gambler\'s Dodge', jump: 'Triple Jump', melee: 'Threaded Spike', grenade: 'Grapple',
      aspects: ['Widow\'s Silk', 'Whirling Maelstrom'], fragments: ['Thread of Warding', 'Thread of Generation', 'Thread of Ascent']
    },
    2: {
      super: 'Needlestorm', classAbility: 'Healing Rift', jump: 'Burst Glide', melee: 'Arcane Needle', grenade: 'Threadling Grenade',
      aspects: ['Weavewalk', 'The Wanderer'], fragments: ['Thread of Warding', 'Thread of Evolution', 'Thread of Generation']
    }
  },
  prismatic: {
    0: {
      super: 'Twilight Arsenal', classAbility: 'Thruster', jump: 'Strafe Lift', melee: 'Thunderclap', grenade: 'Shackle Grenade',
      aspects: ['Knockout', 'Consecration'], fragments: ['Facet of Dawn', 'Facet of Hope', 'Facet of Protection']
    },
    1: {
      super: 'Silence and Squall', classAbility: 'Gambler\'s Dodge', jump: 'Triple Jump', melee: 'Combination Blow', grenade: 'Grapple',
      aspects: ['Stylish Executioner', 'Winter\'s Shroud'], fragments: ['Facet of Dawn', 'Facet of Hope', 'Facet of Protection']
    },
    2: {
      super: 'Song of Flame', classAbility: 'Phoenix Dive', jump: 'Burst Glide', melee: 'Arcane Needle', grenade: 'Vortex Grenade',
      aspects: ['Feed the Void', 'Hellion'], fragments: ['Facet of Dawn', 'Facet of Hope', 'Facet of Protection']
    }
  }
};

// Specific Combo Pairings (Armor -> Preferred Weapon)
const COMBO_PAIRS: Record<string, string[]> = {
  // Warlock
  'necrotic': ['thorn', 'osteo striga', 'necrochasm', 'touch of malice', 'euphony'],
  'rain of fire': ['vex mythoclast', 'dragon\'s breath'],
  'mothkeeper': ['ex diris'],
  'cenotaph': ['divinity', 'ager\'s scepter', 'coldheart'],
  'dawn chorus': ['skyburner\'s oath', 'polaris lance', 'dragon\'s breath', 'tommy\'s matchbook'],
  'speaker\'s sight': ['red death reformed', 'lumina', 'no time to explain', 'edge of intent'],
  'sunbracers': ['sunshot', 'skyburner\'s oath', 'polaris lance', 'ticuu\'s divination', 'monte carlo'],
  'osmiomancy': ['ager\'s scepter', 'wicked implement', 'verglas curve', 'conditional finality', 'winterbite'],

  'briarbinds': ['graviton lance', 'le monarque', 'buried bloodline', 'collective obligation', 'choir of one'],
  'gyrfalcon': ['graviton lance', 'le monarque', 'wavesplitter', 'collective obligation', 'fighting lion', 'buried bloodline', 'rat king'],
  'starfire protocol': ['witherhoard', 'anarchy', 'dragon\'s breath'],

  // Hunter
  'lucky pants': ['malfeasance', 'crimson', 'the last word', 'sunshot', 'ace of spades', 'hawkmoon', 'wardens law'],
  'oathkeeper': ['wish-ender', 'le monarque', 'ticuu\'s divination', 'trinity ghoul', 'leviathan\'s breath', 'wish-keeper'],
  'mechaneer': ['forerunner', 'rat king', 'traveler\'s chosen', 'devil\'s ruin', 'buried bloodline'],
  'caliban': ['sunshot', 'skyburner\'s oath', 'polaris lance', 'dragon\'s breath'],
  'omnioculus': ['le monarque', 'wish-ender', 'rat king'],
  'mask of bakris': ['fourth horseman', 'cloudstrike', 'anarchy', 'thunderlord', 'legend of acrius'],
  'triton vice': ['winterbite', 'vexcalibur', 'edge of concurrence', 'black talon'],
  'cyrtarachne': ['quicksilver storm', 'final warning', 'the navigator', 'wish-keeper'],
  'star-eater': ['izaganis burden', 'the fourth horseman', 'still hunt', 'bad juju'],
  'celestial nighthawk': ['still hunt'],

  // Titan
  'actium war rig': ['sweet business', 'xenophage', 'heir apparent', 'thunderlord', 'grand overture', 'khvostov 7g-0x', 'microcosm'],
  'stronghold': ['the lament', 'black talon', 'heartshadow', 'crown-splitter', 'throne-cleaver'],
  'abeyant leap': ['wish-keeper', 'quicksilver storm', 'final warning'],
  'pyrogale': ['dragon\'s breath', 'sunshot', 'tommy\'s matchbook'],
  'cadmus ridge': ['wicked implement', 'ager\'s scepter', 'verglas curve', 'winterbite'],
  'hazard pulse': ['grand overture', 'the colony', 'deathbringer', 'two-tailed fox', 'truth'],
  'peacekeepers': ['tarrabah', 'riskrunner', 'huckleberry', 'osteo striga'],
  'no backup plans': ['conditional finality', 'lord of wolves', 'duality', 'fourth horseman'],
  'doom fang pauldrons': ['monte carlo'],

  // Special Specific Support
  'chromatic fire': ['outbreak perfected', 'bad juju', 'necrochasm', 'ace of spades'],
  'getaway artist': ['centrifuse', 'riskrunner', 'trinity ghoul', 'coldheart'],
  'graviton forfeit': ['le monarque', 'graviton lance', 'heartshadow'],
  'swarmers': ['euphony', 'quicksilver storm', 'final warning'],
  'mataiodoxia': ['wish-keeper', 'the navigator', 'euphony'],
  'point-contact cannon brace': ['monte carlo'],


  // Pairs
  'sturm': ['drang'],
  'mida multi-tool': ['mida mini-tool'],
  'necrochasm': ['necrotic'],
  'thorn': ['necrotic'],
  'osteo striga': ['necrotic'],
  'vex mythoclast': ['rain of fire'],
  'ex diris': ['mothkeeper'],
  'divinity': ['cenotaph'],
  'graviton lance': ['gyrfalcon', 'briarbinds'],
  'le monarque': ['gyrfalcon', 'omnioculus'],
  'wish-keeper': ['abeyant leap'],
  'dragon\'s breath': ['pyrogale', 'starfire protocol'],
  'skyburner\'s oath': ['dawn chorus', 'caliban'],
  'still hunt': ['celestial nighthawk'],
};

// Strict Element Enforcement Map
// If an exotic is listed here, it is ONLY allowed on these elements.
const STRICT_ARMOR_ELEMENTS: Record<string, string[]> = {
  // Solar
  'starfire protocol': ['solar'],
  'sunbracers': ['solar'],
  'dawn chorus': ['solar', 'prismatic'], // Prismatic Dawnblade is a thing? User says Dawn Chorus is "Solar Exotics".
  'phoenix protocol': ['solar'],
  'wings of sacred dawn': ['solar', 'prismatic'], // Works with any dawnblade/heat rises usually
  'promethium spur': ['solar'],
  'pyrogale gauntlets': ['solar', 'prismatic'], // Consecration is on Prismatic
  'loreley splendor helm': ['solar'], // Sunspots are Solar only usually
  'ashen wake': ['solar'],
  'phoenix cradle': ['solar'], // Sol Invictus is Solar only
  'hallowfire heart': ['solar'],
  'celestial nighthawk': ['solar', 'prismatic'], // Golden Gun is on Prismatic Hunter
  'caliban\'s hand': ['solar', 'prismatic'], // Proximity Knife is on Prismatic? No, it's Knife Trick/Spike usually. Wait, Proximity IS available? Check Build Templates.
  'young ahamkara\'s spine': ['solar'], // Tripmine not on Prismatic Hunter? (Swarm, Duskfield, Arcbolt, Spike, Magnetic)
  'athrys\'s embrace': ['solar'], // Weighted Knife not on Prismatic
  'ophidia spathe': ['solar', 'prismatic'], // Knife Trick is on Prismatic

  // Void
  'skull of dire ahamkara': ['void', 'prismatic'], // Nova Bomb on Prismatic Warlock
  'briarbinds': ['void'], // Void Soul not on Prismatic? Or is it? (Feed the Void / Weaver's Call / Hellion / Bleak Watcher / Getaway Artist). NO Void Soul ("Child of Old Gods").
  'contraverse hold': ['void', 'prismatic'], // Vortex Grenade is on Prismatic Warlock
  'nothing manacles': ['void'], // Scatter Grenade is NOT on Prismatic Warlock
  'secant filaments': ['void'], // Devour on Empowering Rift. Works on Prismatic with Feed the Void? Maybe.
  'graviton forfeit': ['void', 'prismatic'], // Invisibility works on Prismatic
  'gwisin vest': ['void'], // Spectral Blades not on Prismatic
  'omnioculus': ['void'], // Smoke Bomb not on Prismatic Hunter (Snare Bomb is Void Melee, listed in Void kit) -> Yes on Prismatic? No, Prismatic Hunter has Snare Bomb.
  'orpheus rig': ['void', 'prismatic'], // Deadfall/Moebius on Prismatic
  'gyrfalcon\'s hauberk': ['void', 'prismatic'], // Volatile Rounds works on Prismatic
  'helm of saint-14': ['void'], // Ward of Dawn not on Prismatic Titan? No (Twilight Arsenal).
  'doom fang pauldrons': ['void'], // Sentinel Shield not on Prismatic
  'ursa furiosa': ['void'], // Sentinel Shield/Banner Shield not on Prismatic
  'second chance': ['void', 'prismatic'], // Shield Throw is on Prismatic Titan

  // Arc
  'crown of tempests': ['arc', 'prismatic'], // Stormtrance not on Prismatic. But Arc abilities?
  'fallen sunstar': ['arc', 'prismatic'], // Ionic Traces exist on Prismatic
  'getaway artist': ['arc', 'prismatic'], // Storm Grenade on Prismatic
  'stormdancer\'s brace': ['arc'], // Stormtrance Only
  'vesper of radius': ['arc', 'prismatic'], // Arc Shockwave on Rift. Works on Prismatic?
  'geomag stabilizers': ['arc'], // Chaos Reach not on Prismatic
  'raiden flux': ['arc'], // Arc Staff not on Prismatic Hunter? No (Silkstrike/Silence/Golden/Deadfall/Storm's Edge). Storm's Edge is NEW.
  'liar\'s handshake': ['arc', 'prismatic'], // Combination Blow is on Prismatic
  'shinobu\'s vow': ['arc'], // Skip Grenade not on Prismatic Hunter?
  'blight ranger': ['arc'], // Arc Staff Only
  'raiju\'s harness': ['arc'],
  'cuirass of the falling star': ['arc'], // Thundercrash not on Prismatic (Twilight Arsenal/Bladefury/Glacial)
  'point-contact cannon brace': ['arc', 'prismatic'], // Thunderclap is on Prismatic
  'insurmountable skullfort': ['arc', 'prismatic'], // Arc Melee kills matches Thunderclap

  // Stasis
  'osmiomancy gloves': ['stasis', 'prismatic'], // Coldsnap is on Prismatic Warlock
  'ballidorse wrathweavers': ['stasis', 'prismatic'], // Winter's Wrath not on Prismatic. But Stasis damage buff?
  'mask of bakris': ['stasis', 'prismatic'], // Stasis/Arc damage boost. Works on Prismatic.
  'renewal grasps': ['stasis', 'prismatic'], // Duskfield is on Prismatic Hunter
  'hoarfrost-z': ['stasis'], // Stasis Crystal Barricade.
  'icefall mantle': ['stasis'],
  'cadmus ridge lancecap': ['stasis', 'prismatic'], // Diamond Lances are on Prismatic Titan

  // Strand
  'swarmers': ['strand', 'prismatic'], // Threadlings on Prismatic
  'mataiodoxia': ['strand', 'prismatic'], // Arcane Needle is on Prismatic
  'cyrtarachne\'s façade': ['strand', 'prismatic'], // Grapple is on Prismatic
  'abeyant leap': ['strand', 'prismatic'], // Drengr's Lash is on Prismatic Titan

  // Prismatic Only
  'solipsism': ['prismatic'],
  'essentialism': ['prismatic'],
  'stoicism': ['prismatic'],
};

// Comprehensive keywords and their associated element/type
const KEYWORD_MAP: Record<string, string> = {
  // Solar
  'solar': 'solar', 'scorch': 'solar', 'ignite': 'solar', 'radiant': 'solar', 'restoration': 'solar',
  'sunspot': 'solar', 'cure': 'solar', 'benevolence': 'solar', 'ember': 'solar', 'incandescent': 'solar',
  'daybreak': 'solar', 'well of radiance': 'solar', 'golden gun': 'solar', 'blade barrage': 'solar',
  'hammer of sol': 'solar', 'burning maul': 'solar',

  // Void
  'void': 'void', 'suppress': 'void', 'weaken': 'void', 'volatile': 'void', 'invisibility': 'void',
  'devour': 'void', 'overshield': 'void', 'invis': 'void', 'echo': 'void', 'repulsor': 'void',
  'destabilizing': 'void', 'nova bomb': 'void', 'shadowshot': 'void', 'sentinel shield': 'void',
  'ward of dawn': 'void', 'twilight arsenal': 'void', 'spectral blades': 'void',

  // Arc
  'arc': 'arc', 'jolt': 'arc', 'blind': 'arc', 'amplified': 'arc', 'ionic trace': 'arc',
  'spark': 'arc', 'voltshot': 'arc', 'stormtrance': 'arc', 'chaos reach': 'arc',
  'thundercrash': 'arc', 'fists of havoc': 'arc', 'gathering storm': 'arc', 'arc staff': 'arc',
  'storm\'s edge': 'arc',

  // Stasis
  'stasis': 'stasis', 'slow': 'stasis', 'freeze': 'stasis', 'shatter': 'stasis', 'crystal': 'stasis',
  'whisper': 'stasis', 'chill clip': 'stasis', 'headstone': 'stasis', 'winter\'s wrath': 'stasis',
  'glacial quake': 'stasis', 'silence and squall': 'stasis',

  // Strand
  'strand': 'strand', 'suspend': 'strand', 'unravel': 'strand', 'sever': 'strand', 'tangle': 'strand',
  'woven mail': 'strand', 'threadling': 'strand', 'thread': 'strand', 'hatchling': 'strand',
  'needlestorm': 'strand', 'bladefury': 'strand', 'silkstrike': 'strand',

  'prismatic': 'prismatic', 'transcendence': 'prismatic', 'facet': 'prismatic', 'spirit of': 'prismatic',
  'solipsism': 'prismatic', 'stoicism': 'prismatic', 'essentialism': 'prismatic', 'relativism': 'prismatic',
  // Year of Prophecy / Meta Keywords
  'will of the flame': 'solar', 'jetpack': 'arc', 'arid overgrowth': 'strand', 'twin fangs': 'strand',
  'maëlstrom': 'strand', 'hive memory': 'strand', 'scorched earth': 'solar', 'perfect fifth': 'solar',
  'arcane needle': 'strand', 'feed the void': 'void', 'hellion': 'solar', 'sentient soul': 'arc',
  'arc soul': 'arc', 'sentient arc soul': 'arc',
  // --- Gameplay Meta/Verbs (Applied to all elements) ---
  'ability spam': 'prismatic', 'cooldown': 'prismatic', 'super energy': 'prismatic',
  'finisher': 'prismatic', 'debuff': 'prismatic', 'movement': 'prismatic',
  'handling': 'prismatic', 'reload': 'prismatic', 'health': 'prismatic',
  'healing': 'prismatic', 'damage resistance': 'prismatic',
  'unstop': 'prismatic', 'barrier': 'prismatic', 'overload': 'prismatic',
  'reflect': 'prismatic', 'guard': 'prismatic', 'sword': 'prismatic',
  'kinetic': 'prismatic', 'precision': 'prismatic', 'explosion': 'prismatic',
  'universal': 'prismatic',
};

const SPECIAL_CASES: Record<string, string[]> = {
  // --- WARLOCK ---
  'apotheosis veil': null as any,
  'cenotaph mask': null as any,
  'eye of another world': null as any,
  'felwinter\'s helm': null as any,
  'the stag': null as any,
  'aeon soul': null as any,
  'karnstein armlets': null as any,
  'necrotic grip': null as any,
  'ophidian aspect': null as any,
  'winter\'s guile': null as any,
  'chromatic fire': null as any,
  'mantle of battle harmony': null as any,
  'sanguine alchemy': null as any,
  'boots of the assembler': null as any,
  'lunafaction boots': null as any,
  'transversive steps': null as any,
  'verity\'s brow': null as any,

  // Solar Exotics (Dawnblade) - Removed Prismatic from locked items
  'dawn chorus': ['solar'],
  'speaker\'s sight': ['solar', 'prismatic'], // Healing grenades are on Prismatic
  'sunbracers': ['solar'],
  'phoenix protocol': ['solar'],
  'starfire protocol': ['solar'],
  'wings of sacred dawn': ['solar'],
  'promethium spur': ['solar'],

  // Void Exotics (Voidwalker)
  'nezarec\'s sin': ['void', 'prismatic'], // Works with any void kill
  'skull of dire ahamkara': ['void'],
  'briarbinds': ['void', 'prismatic'], // Void soul is on Prismatic
  'contraverse hold': ['void'],
  'nothing manacles': ['void'],
  'secant filaments': ['void'],

  // Arc Exotics (Stormcaller)
  'crown of tempests': ['arc'],
  'fallen sunstar': ['arc'],
  'getaway artist': ['arc', 'prismatic'], // META on Prismatic
  'stormdancer\'s brace': ['arc'],
  'vesper of radius': ['arc', 'prismatic'], // Rift shockwave matches Prismatic logic
  'geomag stabilizers': ['arc'],

  // Stasis Exotics (Shadebinder)
  'ballidorse wrathweavers': ['stasis'],
  'osmiomancy gloves': ['stasis', 'prismatic'], // META on Prismatic

  // Strand Exotics (Broodweaver)
  'mataiodoxía': ['strand', 'prismatic'], // Arcane Needle is on Prismatic
  'swarmers': ['strand', 'prismatic'], // Threadlings are on Prismatic

  // Prismatic
  'solipsism': ['prismatic'],

  // --- HUNTER ---
  'foetracer': null as any,
  'knucklehead radar': null as any,
  'wormhusk crown': null as any,
  'aeon swift': null as any,
  'mechaneer\'s tricksleeves': null as any,
  'oathkeeper': null as any,
  'sealed ahamkara grasps': null as any,
  'the dragon\'s shadow': null as any,
  'the sixth coyote': null as any,
  'fr0st-ee5': null as any,
  'lucky pants': null as any,
  'st0mp-ee5': null as any,
  'the bombardiers': null as any,
  'star-eater scales': null as any,

  // Solar Exotics (Gunslinger)
  'celestial nighthawk': ['solar'],
  'athrys\'s embrace': ['solar', 'prismatic'], // Weighted knife is on Prismatic
  'caliban\'s hand': ['solar'],
  'shards of galanor': ['solar'],
  'young ahamkara\'s spine': ['solar'],
  'ophidia spathe': ['solar'],

  // Void Exotics (Nightstalker)
  'graviton forfeit': ['void', 'prismatic'],
  'khepri\'s sting': ['void'],
  'gyrfalcon\'s hauberk': ['void', 'prismatic'], // Stylish Executioner on Prismatic
  'omnioculus': ['void'],
  'gwisin vest': ['void'],
  'orpheus rig': ['void'],

  // Arc Exotics (Arcstrider)
  'blight ranger': ['arc'],
  'liar\'s handshake': ['arc'],
  'shinobu\'s vow': ['arc'],
  'raiden flux': ['arc'],
  'raiju\'s harness': ['arc'],

  // Stasis Exotics (Revenant)
  'mask of bakris': ['stasis'],
  'renewal grasps': ['stasis', 'prismatic'], // Duskfield is on Prismatic

  // Strand Exotics (Threadrunner)
  'cyrtarachne\'s façade': ['strand', 'prismatic'], // Grapple is on Prismatic

  // Prismatic
  'essentialism': ['prismatic'],
  'relativism': ['prismatic'],

  // --- TITAN ---
  'one-eyed mask': null as any,
  'precious scars': null as any,
  'synthoceps': null as any,
  'heart of inmost light': null as any,
  'actium war rig': null as any,
  'dunemarchers': null as any,
  'hazardous propulsion': null as any,
  'stronghold': null as any,
  'aeon safe': null as any,

  // Solar Exotics (Sunbreaker)
  'loreley splendor': ['solar'],
  'pyrogale gauntlets': ['solar'],
  'ashen wake': ['solar'],
  'phoenix cradle': ['solar'],
  'hallowfire heart': ['solar'],

  // Void Exotics (Sentinel)
  'helm of saint-14': ['void'],
  'doom fang pauldrons': ['void'],
  'ursa furiosa': ['void'],
  'second chance': ['void', 'prismatic'], // Shield Throw is on Prismatic

  // Arc Exotics (Striker)
  'an insurmountable skullfort': ['arc'],
  'cuirass of the falling star': ['arc'],
  'point-contact cannon brace': ['arc', 'prismatic'], // Thunderclap is on Prismatic
  'praxic vestment': ['arc'],

  // Stasis Exotics (Behemoth)
  'cadmus ridge lancecap': ['stasis'],
  'hoarfrost-z': ['stasis'],
  'icefall mantle': ['stasis'],

  // Strand Exotics (Berserker)
  'abeyant leap': ['strand', 'prismatic'], // Drengr's Lash is on Prismatic
  'wishful ignorance': ['strand', 'prismatic'], // Frenzied Blade is on Prismatic

  // Prismatic
  'stoicism': ['prismatic'],
};

function getNaturalAffinity(def: any): string | string[] | null {
  if (!def?.displayProperties) return null;
  const name = def.displayProperties.name.toLowerCase();

  // 1. Check Special Cases (Strict Overrides)
  for (const [key, affinities] of Object.entries(SPECIAL_CASES)) {
    if (name.includes(key) || key.includes(name)) {
      // If affinity is null, it's explicitly universal
      return affinities;
    }
  }

  const text = (def.displayProperties.description + ' ' + def.displayProperties.name).toLowerCase();

  const detected = new Set<string>();
  for (const [keyword, element] of Object.entries(KEYWORD_MAP)) {
    if (text.includes(keyword)) {
      detected.add(element);
    }
  }

  if (detected.size === 0) return null;
  if (detected.size === 1) return Array.from(detected)[0];
  return Array.from(detected);
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Fisher-Yates Shuffle with optional seed for stability
 */
function shuffleArray<T>(array: T[], seed?: string | number): T[] {
  const result = [...array];

  // Deterministic random if seed provided
  const generateRandom = (s: string | number) => {
    let h = typeof s === 'string'
      ? s.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)
      : s;

    // EXTREMELY CRITICAL: LCG fails if state (h) is 0. 
    // State becomes 0 if s=0 or string hashes to 0, causing Math.floor(random() * i) 
    // to return negative indices, corrupting result[] with undefined.
    h = Math.abs(h) || 1;

    return () => {
      h = (h * 16807) % 2147483647;
      return (h - 1) / 2147483646;
    };
  };

  const random = seed !== undefined ? generateRandom(seed) : Math.random;

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Load synergies for a specific class (filtered from constants)
 */
export async function loadSynergiesForClass(classType: GuardianClass): Promise<DashboardSynergy[]> {
  // Filter from the constant source of truth
  // We map the static definition to the DashboardSynergy shape if needed, 
  // or if they are already compatible, just return them.
  // The interface in synergy-definitions.ts might differ slightly from DashboardSynergy here.
  // Let's check compat. 
  // actually, let's just return the definitions and let the matcher handle it. 
  // But definition is SynergyDefinition, matcher expects DashboardSynergy.

  // Mapping logic:
  return SYNERGY_DEFINITIONS.filter(s => s.guardianClass === classType).map(def => ({
    score: 100, // Default score
    classType: def.guardianClass,
    armor: def.exoticArmor.name,
    weapon: def.exoticWeapon?.name || '',
    buildName: def.name,
    description: def.loopDescription,
    subclassType: def.element, // 'Solar', 'Void' etc
    super: def.subclassNode.superName,
    classAbility: def.subclassNode.classAbilityName,
    jump: def.subclassNode.jumpName,
    melee: def.subclassNode.meleeName,
    grenade: def.subclassNode.grenadeName,
    aspects: def.subclassNode.aspectNames,
    fragments: def.subclassNode.fragmentNames,
    fragmentSlots: def.subclassNode.fragmentHashes?.length || 0, // approximation
    element: def.element.toLowerCase(),
    definition: def // Keep reference to full def for strict checking later
  })) as any; // Casting to any/DashboardSynergy to satisfy interface for now
}

/**
 * Find synergies matching a clicked element
 */
export async function findSynergies(
  targetType: 'subclass' | 'armor' | 'weapon',
  targetIdentifier: string, // Element name for subclass, item name for armor/weapon
  guardianClass: GuardianClass,
  options: {
    maxResults?: number;
    minScore?: number;
    seed?: string | number; // Session seed for diversity stability
  } = {}
): Promise<SynergyConnection[]> {
  const { maxResults = 100, minScore = 0, seed = 0 } = options;

  // Load synergies for class
  const synergies = await loadSynergiesForClass(guardianClass);
  if (!synergies.length) return [];

  // Consistent hashing for this search
  const combinedSeed = `${targetIdentifier}-${seed}`;


  // Filter synergies based on target type
  let filtered: DashboardSynergy[];

  switch (targetType) {
    case 'subclass':
      // Match by element
      const searchTerms = targetIdentifier.toLowerCase().split(',').map(s => s.trim());
      const isBroadSubclass = searchTerms.some(s => s === 'all' || s === '' || s === 'kinetic');

      if (isBroadSubclass) {
        filtered = synergies;
      } else {
        filtered = synergies.filter(s =>
          searchTerms.includes(s.element) ||
          searchTerms.some(term => s.subclassType.toLowerCase().includes(term))
        );
      }
      break;

    case 'armor':
      // Match by armor name (partial match)
      const armorSearch = targetIdentifier.toLowerCase();
      filtered = synergies.filter(s =>
        s.armor.toLowerCase().includes(armorSearch) ||
        armorSearch.includes(s.armor.toLowerCase())
      );
      break;

    case 'weapon':
      // Match by weapon name (partial match)
      const weaponSearch = targetIdentifier.toLowerCase();
      filtered = synergies.filter(s =>
        s.weapon.toLowerCase().includes(weaponSearch) ||
        weaponSearch.includes(s.weapon.toLowerCase())
      );
      break;

    default:
      filtered = [];
  }


  // Filter by minimum score
  filtered = filtered.filter(s => s.score >= minScore);


  // Sort by score descending
  filtered.sort((a, b) => b.score - a.score);

  // DIVERSITY: Shuffle results with the same score to ensure variety on refresh
  // This is especially useful for the thousands of fallback pairings
  let shuffledResults: DashboardSynergy[] = [];
  const groups = new Map<number, DashboardSynergy[]>();

  filtered.forEach(s => {
    if (!groups.has(s.score)) groups.set(s.score, []);
    groups.get(s.score)!.push(s);
  });

  const sortedScores = Array.from(groups.keys()).sort((a, b) => b - a);
  for (const score of sortedScores) {
    const group = groups.get(score)!;
    // Use the combined seed to shuffle this specific score group consistently
    const shuffledGroup = shuffleArray(group, `${combinedSeed}-${score}`);
    shuffledResults = [...shuffledResults, ...shuffledGroup];
  }

  filtered = shuffledResults.slice(0, maxResults * 2); // Take a larger pool for connection processing

  // Build connections with item locations
  const connections: SynergyConnection[] = [];
  const processedExotics = new Set<string>();

  // 1. Process Strict Synergies First
  for (const synergy of filtered) {
    if (connections.length >= maxResults) break;
    if (!synergy.armor || !synergy.weapon) continue;

    // Find armor and weapon in inventory (must both exist)
    const [armorResult, weaponResult] = await Promise.all([
      itemSearchService.findItemByName(synergy.armor),
      itemSearchService.findItemByName(synergy.weapon)
    ]);

    if (!armorResult || !weaponResult) continue;

    processedExotics.add(armorResult.item.itemInstanceId || synergy.armor);

    connections.push({
      synergy,
      sourceType: targetType,
      armorResult,
      weaponResult,
      element: synergy.element
    });
  }

  // 2. Generative Fallback: Smart Heuristic & Diversity
  if (connections.length < maxResults) {
    debugLog('SynergyMatcher', `Strict search: ${connections.length}/${maxResults}, generating fallbacks...`);

    const searchTerms = targetIdentifier.toLowerCase().split(',').map(s => s.trim());
    const isBroadSearch = searchTerms.some(s => s === 'all' || s === '' || s === 'kinetic');

    // Find all exotic armor for this class
    let allExoticArmor = await itemSearchService.findAllExoticsForClass(guardianClass, 'armor');
    if (isBroadSearch) {
      allExoticArmor = shuffleArray(allExoticArmor, combinedSeed);
    }
    // Fetch all exotic weapons to pair with
    const allExoticWeapons = await itemSearchService.findAllExoticsForClass(3 as any, 'weapon'); // Class 3 = Generic/All

    for (const armor of allExoticArmor) {
      if (connections.length >= maxResults) break;

      const armorName = armor.definition.displayProperties.name.toLowerCase();
      const armorInstanceId = armor.item.itemInstanceId || armor.item.itemHash.toString();

      // IF WE ARE LOOKING FOR SPECIFIC ARMOR: Skip others
      if (targetType === 'armor' && !armor.definition.displayProperties.name.toLowerCase().includes(targetIdentifier.toLowerCase())) continue;

      // Determine Affinity from Description/Name
      let affinity = getNaturalAffinity(armor.definition);
      let targetElements: string[] = [];

      // 0. Use Strict Enforcement if available
      const strictElements = STRICT_ARMOR_ELEMENTS[armorName];
      if (strictElements) {
        targetElements = strictElements;
      } else if (Array.isArray(affinity)) {
        targetElements = affinity;
      } else if (affinity) {
        // STRICT MATCHING: Only use the detected element. 
        targetElements = [affinity as string];
      } else {
        // PRIORITY: Put prismatic at the start of the search for generic items
        targetElements = ['prismatic', 'solar', 'void', 'arc', 'stasis', 'strand'];
        if (isBroadSearch) {
          targetElements = shuffleArray(targetElements, `${combinedSeed}-${armorInstanceId}`);
        }
      }

      for (const el of targetElements) {
        if (connections.length >= maxResults) break;

        // IF WE ARE LOOKING FOR SPECIFIC SUBCLASS: Skip non-matching elements (unless broad search requested)
        if (targetType === 'subclass' && !isBroadSearch && !searchTerms.includes(el)) continue;

        // Determine if this armor can pair with the target search item if it's a weapon
        let candidates: ItemSearchResult[] = [];

        // 0. Use COMBO_PAIRS to prioritize specific fits
        for (const [key, preferredWeapons] of Object.entries(COMBO_PAIRS)) {
          if (armorName.includes(key)) {
            const matches = allExoticWeapons.filter(w => preferredWeapons.some(pw => w.definition.displayProperties.name.toLowerCase().includes(pw)));
            if (matches.length > 0) {
              candidates = matches;
              break;
            }
          }
        }

        // 0.5 Verb-Based Alignment (Heuristic from exoticlist.txt)
        // If armor and weapon share a gameplay verb (Scorch, Jolt, etc), they are a match
        if (candidates.length === 0) {
          const armorDesc = armor.definition.displayProperties.description.toLowerCase();
          const verbMatches = allExoticWeapons.filter(w => {
            const weaponDesc = w.definition.displayProperties.description.toLowerCase();
            return Object.keys(KEYWORD_MAP).some(verb =>
              KEYWORD_MAP[verb] !== 'universal' && armorDesc.includes(verb) && weaponDesc.includes(verb)
            );
          });
          if (verbMatches.length > 0) candidates = verbMatches;
        }

        // 1. If targetType is 'weapon', we MUST check if the armor can pair with the target weapon
        if (targetType === 'weapon') {
          const targetWeaponName = targetIdentifier.toLowerCase();
          const targetWeapon = allExoticWeapons.find(w => w.definition.displayProperties.name.toLowerCase().includes(targetWeaponName));
          const weaponDescription = targetWeapon?.definition.displayProperties.description.toLowerCase() || '';

          // Does the combo match the target weapon?
          const comboMatch = candidates.find(w => w.definition.displayProperties.name.toLowerCase().includes(targetWeaponName));

          if (comboMatch) {
            candidates = [comboMatch]; // Explicit COMBO_PAIRS match!
          } else {
            // ELEMENTAL SYNERGY: If they share an element, they are synergistic!
            // This fixes "Polaris missing solar connections"
            const armorElement = el;
            const damageTypeMap: Record<string, number> = { arc: 2, solar: 3, void: 4, stasis: 6, strand: 7 };

            const weaponsThatMatchTarget = allExoticWeapons.filter(w => w.definition.displayProperties.name.toLowerCase().includes(targetWeaponName));
            const weaponMatch = weaponsThatMatchTarget.find(w => {
              // UNIVERSAL WEAPONS: Kinetic slot exotics (non-elemental) match everything
              const isKineticSlot = Number(w.definition.inventory?.bucketTypeHash) === Number(BUCKET_HASHES.KINETIC_WEAPONS);
              const isKineticDamage = Number(w.definition.defaultDamageTypeHash) === 1;
              if (isKineticSlot && isKineticDamage) return true;

              // 1. Direct Element Match (Solar Weapon + Solar Armor)
              const armorDamageType = damageTypeMap[armorElement] || 0;
              const weaponDamageType = Number(w.definition.defaultDamageTypeHash);
              const weaponElementMatches = weaponDamageType === armorDamageType || weaponDamageType === 1;
              if (weaponElementMatches) return true;

              // 2. Keyword/Description matching as fallback
              const armorDescription = armor.definition.displayProperties.description.toLowerCase();
              const descriptionsOverlap = Object.keys(KEYWORD_MAP).some(k =>
                armorDescription.includes(k) && weaponDescription.includes(k)
              );
              return descriptionsOverlap || weaponDescription.includes(armorElement);
            });

            if (weaponMatch) {
              candidates = [weaponMatch];
            } else {
              // This armor has no reasonable synergy with the target weapon
              continue;
            }
          }
        }

        // 2. If no candidates yet and NOT a restricted weapon search, use defaults
        if (candidates.length === 0) {
          const damageTypeMap: Record<string, number> = { arc: 2, solar: 3, void: 4, stasis: 6, strand: 7 };
          const targetDamage = damageTypeMap[el];
          if (targetDamage) {
            candidates = allExoticWeapons.filter(w => Number(w.definition.defaultDamageTypeHash) === targetDamage);
          }
          if (candidates.length === 0) {
            candidates = allExoticWeapons.filter(w => {
              const hash = Number(w.definition.defaultDamageTypeHash);
              const type = Number(w.definition.defaultDamageType);
              return hash === 1 || type === 1;
            });
            // EXCLUSION: Prevent special quest items like Praxic Blade from being auto-selected as generic Kinetic defaults
            candidates = candidates.filter(w => !w.definition.displayProperties.name.toLowerCase().includes('praxic blade'));
          }
        }

        if (candidates.length === 0) candidates = allExoticWeapons;

        // Select the weapon(s)
        let selectedWeaponItems = [candidates[0]];

        // For diversity, we can pick a specific one if multiple exist
        // If targetType is weapon, candidates should only be 1
        if (targetType === 'weapon') {
          selectedWeaponItems = [candidates[0]];
        } else if (candidates.length > 1) {
          // GROUPING: If multiple instances of same item exist, group them and pick a stable representative
          // This prevents wires from jittering between identical items when clicking
          const uniqueByHash = new Map<number, ItemSearchResult>();
          candidates.forEach(c => {
            const hash = c.item.itemHash;
            if (!uniqueByHash.has(hash)) {
              uniqueByHash.set(hash, c);
            } else {
              // Prefer equipped or higher power if duplicates exist
              const existing = uniqueByHash.get(hash)!;
              const isEquipped = c.location === 'equipped';
              if (isEquipped && existing.location !== 'equipped') {
                uniqueByHash.set(hash, c);
              }
            }
          });

          const uniqueCandidates = Array.from(uniqueByHash.values());

          // DIVERSITY: Shuffle the fallback candidates for varied wires on every refresh
          // Use combined seed + element for stability
          const shuffledCandidates = shuffleArray(uniqueCandidates, `${combinedSeed}-${el}`);
          const limit = Math.min(3, maxResults - connections.length);
          selectedWeaponItems = shuffledCandidates.slice(0, limit);
        }

        for (const selectedWeaponItem of selectedWeaponItems) {
          // Skip if already in strict pass
          const connectionId = `${armorInstanceId}-${selectedWeaponItem.item.itemInstanceId || selectedWeaponItem.item.itemHash}-${el}`;
          if (processedExotics.has(connectionId)) continue;
          processedExotics.add(connectionId);

          const buildTemplate = FALLBACK_DEFAULTS[el]?.[guardianClass] || FALLBACK_DEFAULTS['prismatic'][guardianClass];
          const isPrismatic = el === 'prismatic';

          const adHocSynergy: DashboardSynergy = {
            score: 60,
            classType: guardianClass,
            armor: armor.definition.displayProperties.name,
            weapon: selectedWeaponItem.definition.displayProperties.name,
            buildName: `${armor.definition.displayProperties.name} ${isPrismatic ? 'Prism' : capitalize(el)}`,
            description: armor.definition.displayProperties.description || `Synergy for ${armor.definition.displayProperties.name}.`,
            subclassType: isPrismatic ? 'Prismatic' : capitalize(el),
            element: el,
            super: buildTemplate?.super || 'Roaming Super',
            classAbility: buildTemplate?.classAbility || 'Class Ability',
            jump: buildTemplate?.jump || 'Triple Jump',
            melee: buildTemplate?.melee || 'Charged Melee',
            grenade: buildTemplate?.grenade || 'Grenade',
            aspects: buildTemplate?.aspects || [],
            fragments: buildTemplate?.fragments || [],
            fragmentSlots: 3,
            transcendentAbility: isPrismatic ? 'Transcendence' : undefined
          };

          // STRICT COLORING: If this is a Prismatic connection, ensure element is 'prismatic'
          // This prevents wires from being colored by the super element (e.g. Solar) instead of Pink.
          if (isPrismatic) {
            adHocSynergy.element = 'prismatic';
          }

          connections.push({
            synergy: adHocSynergy,
            sourceType: targetType,
            armorResult: armor,
            weaponResult: selectedWeaponItem,
            element: el
          });

          if (connections.length >= maxResults) break;
        }
      }
    }
  }

  // 3. FINAL SORT: Prioritize Prismatic connections for the UI
  connections.sort((a, b) => {
    const isAPrismatic = String(a.element).toLowerCase() === 'prismatic';
    const isBPrismatic = String(b.element).toLowerCase() === 'prismatic';
    if (isAPrismatic && !isBPrismatic) return -1;
    if (!isAPrismatic && isBPrismatic) return 1;
    return 0;
  });

  return connections;
}

/**
 * Find synergies for a specific subclass element
 */
export async function findSynergiesByElement(
  element: string,
  guardianClass: GuardianClass,
  options?: { maxResults?: number; minScore?: number }
): Promise<SynergyConnection[]> {
  return findSynergies('subclass', element, guardianClass, options);
}

/**
 * Find synergies for a specific exotic armor
 */
export async function findSynergiesByArmor(
  armorName: string,
  guardianClass: GuardianClass,
  options?: { maxResults?: number; minScore?: number }
): Promise<SynergyConnection[]> {
  return findSynergies('armor', armorName, guardianClass, options);
}

/**
 * Find synergies for a specific exotic weapon
 */
export async function findSynergiesByWeapon(
  weaponName: string,
  guardianClass: GuardianClass,
  options?: { maxResults?: number; minScore?: number }
): Promise<SynergyConnection[]> {
  return findSynergies('weapon', weaponName, guardianClass, options);
}


// Legacy export for compatibility (Stubbed)
export class SynergyMatcherService {
  async detectSynergies(): Promise<any[]> {
    return [];
  }

  async autoDetect(_characterId: string): Promise<any[]> {
    return [];
  }

  clearCache(): void {
    // No-op
  }
}


export const synergyMatcherService = new SynergyMatcherService();

// Default export for convenience
export default {
  loadSynergiesForClass,
  findSynergies,
  findSynergiesByElement,
  findSynergiesByArmor,
  findSynergiesByWeapon
};
