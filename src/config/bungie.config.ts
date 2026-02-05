// Bungie Configuration - DIM-Grade Constants
// All hashes verified against DIM's d2-known-values.ts and generated-enums.ts

export const BUNGIE_CONFIG = {
  // Production API credentials - loaded from environment variables
  apiKey: import.meta.env.VITE_BUNGIE_API_KEY || 'cfada238bccc49dca0c61b18c276e466',
  clientId: import.meta.env.VITE_BUNGIE_CLIENT_ID || '51502',
  redirectUri: import.meta.env.VITE_REDIRECT_URI ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : 'https://exoengine.online/auth/callback'),

  // Bungie API base URLs
  // In DEV (npm run dev), use /Platform to leverage Vite proxy.
  // In PROD (npm run build), use full URL to hit Bungie directly (requires CORS whitelist).
  apiBase: import.meta.env.DEV ? '/Platform' : 'https://www.bungie.net/Platform',

  authorizationUrl: 'https://www.bungie.net/en/OAuth/Authorize',

  tokenUrl: '/token.php',

  dimProxyUrl: '/dim-proxy.php',

  bungieNetOrigin: 'https://www.bungie.net',

  // API Endpoints
  endpoints: {
    manifest: '/Destiny2/Manifest/',
    linkedProfiles: (membershipId: string) =>
      `/Destiny2/-1/Profile/${membershipId}/LinkedProfiles/`,
    profile: (membershipType: number, membershipId: string) =>
      `/Destiny2/${membershipType}/Profile/${membershipId}/`,
    character: (membershipType: number, membershipId: string, characterId: string) =>
      `/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}/`,
    transferItem: '/Destiny2/Actions/Items/TransferItem/',
    equipItem: '/Destiny2/Actions/Items/EquipItem/',
    equipItems: '/Destiny2/Actions/Items/EquipItems/',
    pullFromPostmaster: '/Destiny2/Actions/Items/PullFromPostmaster/',
    snapshotLoadout: '/Destiny2/Actions/Loadouts/SnapshotLoadout/',
    insertSocketPlugFree: '/Destiny2/Actions/Items/InsertSocketPlugFree/',
    setLockState: '/Destiny2/Actions/Items/SetLockState/',
  },

  // Component flags for GetProfile
  // https://bungie-net.github.io/multi/schema_Destiny-DestinyComponentType.html
  components: {
    Profiles: 100,
    VendorReceipts: 101,
    ProfileInventories: 102,
    ProfileCurrencies: 103,
    ProfileProgression: 104,
    PlatformSilver: 105,
    Characters: 200,
    CharacterInventories: 201,
    CharacterProgressions: 202,
    CharacterRenderData: 203,
    CharacterActivities: 204,
    CharacterEquipment: 205,
    ItemInstances: 300,
    ItemObjectives: 301,
    ItemPerks: 302,
    ItemRenderData: 303,
    ItemStats: 304,
    ItemSockets: 305,
    ItemTalentGrids: 306,
    ItemCommonData: 307,
    ItemPlugStates: 308,
    ItemPlugObjectives: 309,
    ItemReusablePlugs: 310,
    Vendors: 400,
    VendorCategories: 401,
    VendorSales: 402,
    Kiosks: 500,
    CurrencyLookups: 600,
    PresentationNodes: 700,
    Collectibles: 800,
    Records: 900,
    Transitory: 1000,
    Metrics: 1100,
    StringVariables: 1200,
    Craftables: 1300,
    CharacterLoadouts: 206,
  },

  // Standard profile component set for ExoEngine
  standardProfileComponents: [
    100, // Profiles
    102, // ProfileInventories (Vault)
    200, // Characters
    201, // CharacterInventories
    202, // CharacterProgressions
    205, // CharacterEquipment
    300, // ItemInstances
    304, // ItemStats
    305, // ItemSockets
    310, // ItemReusablePlugs
    103, // ProfilePlugSets
    203, // CharacterPlugSets
    1100, // Metrics
    1400, // ProfileCommendations
    1401, // CharacterCommendations
  ],

  // Check if API is configured
  isConfigured(): boolean {
    return !!(this.apiKey && this.clientId);
  },

  // Get component query string
  getComponentsQuery(components: number[]): string {
    return `components=${components.join(',')}`;
  },
};

// Bucket hashes for item locations (verified against DIM BucketHashes)
export const BUCKET_HASHES = {
  KINETIC_WEAPONS: 1498876634,
  ENERGY_WEAPONS: 2465295065,
  POWER_WEAPONS: 953998645,
  HELMET: 3448274439,
  GAUNTLETS: 3551918588,
  CHEST_ARMOR: 14239492,
  LEG_ARMOR: 20886954,
  CLASS_ARMOR: 1585787867,
  GHOST: 4023194814,
  VEHICLE: 2025709351,
  SHIPS: 284967655,
  SUBCLASS: 3284755031,
  VAULT: 138197802,
  GENERAL: 138197802,
  CONSUMABLES: 1469714392,
  MODIFICATIONS: 3313201758,
  EMBLEM: 4274335291,
  EMOTES: 3054419239,
  FINISHERS: 3683254069,
  SEASONAL_ARTIFACT: 1506418338,
  POSTMASTER: 215593132,
};

// Item tier types (verified against DIM TierType)
export const TIER_TYPES = {
  UNKNOWN: 0,
  CURRENCY: 1,
  BASIC: 2,      // Common (white)
  COMMON: 3,     // Uncommon (green)
  RARE: 4,       // Rare (blue)
  SUPERIOR: 5,   // Legendary (purple)
  EXOTIC: 6,     // Exotic (gold)
};

// Damage type enum values
export const DAMAGE_TYPES = {
  NONE: 0,
  KINETIC: 1,
  ARC: 2,
  SOLAR: 3,
  VOID: 4,
  RAID: 5,
  STASIS: 6,
  STRAND: 7,
};

// Damage type hashes (for looking up by hash instead of enum)
export const DAMAGE_TYPE_HASHES = {
  KINETIC: 3373582085,
  ARC: 2303842570,
  SOLAR: 1847020140,
  VOID: 3454344768,
  STASIS: 151347233,
  STRAND: 3949783978,
  PRISMATIC: 3373582059,
};

// Armor stat hashes (DIM verified - StatHashes)
export const STAT_HASHES = {
  MOBILITY: 2996146975,
  RESILIENCE: 392767087,
  RECOVERY: 1943323491,
  DISCIPLINE: 1735777505,
  INTELLECT: 144602215,
  STRENGTH: 4244567218,
  // New Armor 3.0 stat names (same hashes, different names in API)
  WEAPONS: 2996146975,    // Same as Mobility
  HEALTH: 392767087,      // Same as Resilience
  CLASS: 1943323491,      // Same as Recovery
  GRENADE: 1735777505,    // Same as Discipline
  SUPER: 144602215,       // Same as Intellect
  MELEE: 4244567218,      // Same as Strength
};

// Weapon stat hashes (DIM verified - for Tactical Vault enhancement)
export const WEAPON_STAT_HASHES = {
  IMPACT: 4043523819,
  RANGE: 1240592695,
  STABILITY: 155624089,
  HANDLING: 943549884,
  RELOAD_SPEED: 4188031367,
  AIM_ASSISTANCE: 1345609583,
  ZOOM: 3555269338,
  AIRBORNE: 2714457168,
  RECOIL_DIRECTION: 2715839340,
  RPM: 4284893193,         // Rounds Per Minute
  MAGAZINE: 3871231066,
  DRAW_TIME: 447667954,
  CHARGE_TIME: 2961396640,
  BLAST_RADIUS: 3614673599,
  VELOCITY: 2523465841,
  SWING_SPEED: 2837207746,
  GUARD_EFFICIENCY: 2762071195,
  GUARD_RESISTANCE: 209426660,
  GUARD_ENDURANCE: 3736848092,
  CHARGE_RATE: 3022301683,
  AMMO_CAPACITY: 925767036,
  SHIELD_DURATION: 1842278586,
  ACCURACY: 1591432999,
};

// Socket Category Hashes (DIM verified - for subclass configuration)
export const SOCKET_CATEGORY_HASHES = {
  SUPER: 457473665,
  ASPECTS: 2047681910,
  ASPECTS_IKORA: 2140934067,
  ASPECTS_STRANGER: 3400923910,
  ASPECTS_NEOMUNA: 764703411,
  FRAGMENTS: 271461480,
  FRAGMENTS_IKORA: 1313488945,
  FRAGMENTS_STRANGER: 2819965312,
  FRAGMENTS_NEOMUNA: 193371309,
  ABILITIES: 309722977,
  ABILITIES_IKORA: 3218807805,
  TRANSCENDENCE: 1905270138,
  WEAPON_PERKS: 4241085061,
  ARMOR_PERKS: 2518356196,
  ARMOR_TIER: 760375309,
  WEAPON_MODS: 2685412949,
  ARMOR_MODS: 590099826,
};

// DIM-verified special item hashes
export const SPECIAL_ITEMS = {
  DEFAULT_SHADER: 4248210736,
  DEFAULT_GLOW: 3807544519,
  DEFAULT_ORNAMENTS: [2931483505, 1959648454, 702981643, 3854296178],
  EMPTY_SOCKET_HASHES: [2323986101, 2600899007, 1835369552, 3851138800, 791435474],
  DEEPSIGHT_HARMONIZER: 2228452164,
  SILVER: 3147280338,
  ARTIFICE_PERK: 3727270518,
};

// Armor energy values (DIM verified)
export const ARMOR_ENERGY = {
  MAX_CAPACITY: 10,
  MAX_CAPACITY_TIER_5: 11,  // Edge of Fate Tier 5 armor
  MASTERWORK_STAT_BONUS: 2,
};

// Vendor hashes (DIM verified)
export const VENDOR_HASHES = {
  EVERVERSE: 3361454721,
  BANSHEE: 672118013,
  ADA_FORGE: 2917531897,
  ADA_TRANSMOG: 350061650,
  RAHOOL: 2255782930,
  XUR: 2190858386,
  VAULT: 1037843411,
};

// Guardian class types
export const CLASS_TYPES = {
  TITAN: 0,
  HUNTER: 1,
  WARLOCK: 2,
  UNKNOWN: 3,
};

// Breaker types (Champion mods)
export const BREAKER_TYPES = {
  SHIELD_PIERCING: 485622768,  // Anti-Barrier
  DISRUPTION: 2611060930,       // Overload
  STAGGER: 3178805705,          // Unstoppable
};

// Item Categories (for filtering)
export const ITEM_CATEGORY_HASHES = {
  WEAPON: 1,
  ARMOR: 20,
  AUTO_RIFLE: 5,
  HAND_CANNON: 6,
  PULSE_RIFLE: 7,
  SCOUT_RIFLE: 8,
  FUSION_RIFLE: 9,
  SNIPER_RIFLE: 10,
  SHOTGUN: 11,
  MACHINE_GUN: 12,
  ROCKET_LAUNCHER: 13,
  SIDEARM: 14,
  SWORD: 54,
  GRENADE_LAUNCHER: 153950757,
  LINEAR_FUSION_RIFLE: 1504945536,
  TRACE_RIFLE: 2489664120,
  BOW: 3317538576,
  GLAIVE: 3871742104,
  SUBMACHINE_GUN: 3954685534,
};

// Kill tracker objective hashes (DIM verified)
export const KILL_TRACKER_OBJECTIVES = {
  PVP: [1501870536, 2439952408, 74070459, 890482414, 2109364169],
  PVE: [90275515, 2579044636, 73837075, 3387796140],
  GAMBIT: [345540971],
};
