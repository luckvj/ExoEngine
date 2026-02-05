// ExoEngine Type Definitions

// ===== Enums =====
export const ElementType = {
  Void: 'void',
  Solar: 'solar',
  Arc: 'arc',
  Stasis: 'stasis',
  Strand: 'strand',
  Prismatic: 'prismatic',
  Kinetic: 'kinetic',
  Neutral: 'neutral',
} as const;
export type ElementType = (typeof ElementType)[keyof typeof ElementType];

export const Expansion = {
  BaseGame: 'base',
  Forsaken: 'forsaken',
  Shadowkeep: 'shadowkeep',
  BeyondLight: 'beyond-light',
  WitchQueen: 'witch-queen',
  Lightfall: 'lightfall',
  FinalShape: 'final-shape',
  Anniversary30th: 'anniversary-30th',
  Renegade: 'renegade',
  EdgeOfFate: 'edge-of-fate',
} as const;
export type Expansion = (typeof Expansion)[keyof typeof Expansion];

export const GuardianClass = {
  Titan: 0,
  Hunter: 1,
  Warlock: 2,
} as const;
export type GuardianClass = (typeof GuardianClass)[keyof typeof GuardianClass];

export const ItemSlot = {
  Kinetic: 0,
  Energy: 1,
  Power: 2,
  Helmet: 3,
  Arms: 4,
  Chest: 5,
  Legs: 6,
  ClassItem: 7,
} as const;
export type ItemSlot = (typeof ItemSlot)[keyof typeof ItemSlot];

export const Difficulty = {
  Beginner: 'beginner',
  Intermediate: 'intermediate',
  Advanced: 'advanced',
} as const;
export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];

// ===== Bungie API Types =====
export interface BungieCredentials {
  apiKey: string;
  clientId: string;
  clientSecret?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  membershipId: string;
}

export interface BungieMembership {
  membershipId: string;
  membershipType: number;
  displayName: string;
  bungieGlobalDisplayName: string;
  bungieGlobalDisplayNameCode: number;
}

export interface DestinyCharacter {
  characterId: string;
  membershipId: string;
  membershipType: number;
  classType: GuardianClass;
  light: number;
  emblemPath: string;
  emblemBackgroundPath: string;
  emblemHash: number;
  raceType: number;
  genderType: number;
  dateLastPlayed: string;
  guardianRank?: number;
  seasonRank?: number;
  commendationScore?: number;
  stats?: Record<number, number>;
}

// ===== Item Types =====
export interface DestinyItem {
  itemHash: number;
  itemInstanceId?: string;
  quantity: number;
  bindStatus: number;
  location: number;
  bucketHash: number;
  transferStatus: number;
  lockable: boolean;
  state: number;
  overrideStyleItemHash?: number;
  isExotic?: boolean; // DIM parity: quick check for unique items
  tierType?: number;   // DIM parity: rarity tracking for move-aside
}

export interface DisplayProperties {
  name: string;
  description: string;
  icon: string;
  hasIcon: boolean;
}

export interface ItemDefinition {
  hash: number;
  displayProperties: DisplayProperties;
  screenshot?: string;
  itemType: number;
  itemSubType: number;
  classType: number;
  equippable: boolean;
  defaultDamageType?: number;
  defaultDamageTypeHash?: number;

  itemTypeDisplayName?: string;
  sockets?: any;
  itemCategoryHashes?: number[];
  secondarySpecial?: string;
  secondaryOverlay?: string;
  secondaryIcon?: string;
  tierType?: number;
  isExotic?: boolean;

  inventory?: {
    tierType: number;
    tierTypeName: string;
    bucketTypeHash: number;
    recoveryBucketTypeHash: number;
    maxStackSize: number;
    isInstanceItem: boolean;
    nonTransferrable: boolean;
    equippingLabel?: string;
    equippable?: boolean;
  };
  equippingBlock?: {
    uniqueLabel?: string;
    uniqueLabelHash?: number;
    equipmentSlotTypeHash?: number;
    attributes?: number;
    ammoType?: number;
    displayStrings?: string[];
  };
  stats?: {
    disablePrimaryStatDisplay: boolean;
    statGroupHash: number;
    stats: Record<number, {
      statHash: number;
      value: number;
      minimum: number;
      maximum: number;
      displayMaximum: number;
    }>;
    hasAndDisplayHashes: number[];
  };

  plug?: {
    plugCategoryIdentifier: string;
    plugCategoryHash: number;
    energyCapacity?: {
      capacityValue: number;
    };
  };
  itemTypeAndTierDisplayName?: string;
  seasonLabel?: string;
  iconWatermark?: string;
  iconWatermarkShelved?: string;
  quality?: {
    currentVersion: number;
    displayVersionWatermarkIcons: string[];
  };

  // Allow raw data pass-through
  [key: string]: any;
}

export interface ItemInstance {
  itemHash?: number;
  itemInstanceId?: string;
  power?: number;
  damageType?: number;
  isEquipped?: boolean;
  isLocked?: boolean;
  canEquip?: boolean;
  energy?: {
    energyType: number;
    energyCapacity: number;
    energyUsed: number;
    isArtifice: boolean; // DIM parity: support for +3 stat mods
  };
  sockets: Array<{
    socketIndex: number;
    plugHash?: number;
    isEnabled?: boolean;
    isVisible?: boolean;
    plugName?: string;
    plugIcon?: string;
  }>;
  stats?: ArmorStats;
  tiers?: Record<string, number>;
  gearTier?: number; // Weapon Tier (1-5) for enhanced perks
}

export interface ItemStats {
  mobility?: number;
  resilience?: number;
  recovery?: number;
  discipline?: number;
  intellect?: number;
  strength?: number;
  total: number;
}

export interface ItemSockets {
  sockets: Array<{
    socketIndex: number;
    plugHash?: number;
    isEnabled?: boolean;
    isVisible?: boolean;
    plugName?: string;
  }>;
}

export interface DestinyArtifact {
  artifactHash: number;
  pointProgression: {
    currentProgress: number;
    nextLevelAt: number;
    stepIndex: number;
    progressToNextLevel: number;
  };
  pointsAcquired: number;
  activeSeasonHash: number;
}

export interface CharacterProgressions {
  seasonalArtifact: {
    artifactHash: number;
    pointsUsed: number;
    resetCount: number;
    tiers: {
      tierHash: number;
      isUnlocked: boolean;
      pointsToUnlock: number;
      items: {
        itemHash: number;
        isActive: boolean;
        isVisible: boolean;
      }[];
    }[];
  };
  progressions: Record<string, {
    progressionHash: number;
    dailyProgress: number;
    dailyLimit: number;
    weeklyProgress: number;
    weeklyLimit: number;
    currentProgress: number;
    level: number;
    levelCap: number;
    stepIndex: number;
    progressToNextLevel: number;
    nextLevelAt: number;
  }>;
}

// ===== Armor Stats =====
export interface ArmorStats {
  mobility: number;
  resilience: number;
  recovery: number;
  discipline: number;
  intellect: number;
  strength: number;
  total: number;
}

export const STAT_HASHES = {
  MOBILITY: 2996146975,
  RESILIENCE: 392767087,
  RECOVERY: 1943323491,
  DISCIPLINE: 1735777505,
  INTELLECT: 144602215,
  STRENGTH: 4244567218,
};

// ===== Synergy Types =====
export interface SynergyDefinition {
  id: string;
  name: string;
  element: ElementType;
  guardianClass: GuardianClass;
  requiredExpansion?: Expansion;

  // Strict Logic Constraints
  requiredGrenadeHash?: number | number[];
  requiredAspectHash?: number | number[];
  requiredSubclassHash?: number;

  // The core loop
  exoticArmor: {
    hash: number;
    name: string;
    slot: ItemSlot;
  };

  exoticWeapon?: {
    hash: number;
    name: string;
  };

  subclassNode: {
    superHash?: number;
    superName?: string;
    aspectHashes: number[];
    aspectNames: string[];
    fragmentHashes?: number[];
    fragmentNames?: string[];
    grenadeHash?: number;
    grenadeName?: string;
    meleeHash?: number;
    meleeName?: string;
    classAbilityHash?: number;
    classAbilityName?: string;
    jumpHash?: number;
    jumpName?: string;
  };

  weaponPerk?: {
    perkHash: number;
    perkName: string;
    weaponTypes: string[];
  };

  recommendedWeapons?: Array<{
    hash: number;
    name: string;
  }>;

  // Metadata
  loopDescription: string;
  playstyle: string;
  difficulty: Difficulty;
  tags: string[];
  armorMods?: number[];
}

// ===== Build Template Types =====
export interface BuildTemplate {
  id: string;
  name: string;
  element: ElementType;
  guardianClass: GuardianClass;
  requiredExpansion?: Expansion;

  exoticWeapon?: {
    hash: number;
    name: string;
    slot: ItemSlot;
    socketOverrides?: Record<number, number>;
  };

  exoticArmor?: {
    hash: number;
    name: string;
    slot: ItemSlot;
    socketOverrides?: Record<number, number>;
  };

  /** Specific legendary/other items to equip */
  items?: {
    hash: number;
    name: string;
    socketOverrides?: Record<number, number>;
  }[];

  subclassConfig?: {
    subclassHash?: number;
    superHash?: number;
    aspects?: number[];
    fragments?: number[];
    grenadeHash?: number;
    meleeHash?: number;
    classAbilityHash?: number;
    jumpHash?: number;
    /** PC_SUPER mapping for non-standard super hashes */
    superSocketIndex?: number;
  };

  /** General Armor Mods (DIM Compatibility) */
  armorMods?: number[];

  /** High-level Seasonal Artifact Perks (Those in the screenshot grid) */
  artifactPerks?: number[];

  /** Per-item socket overrides (Ornaments, Shaders, Weapon Perks) */
  itemOverrides?: Record<string, Record<number, number>>; // itemId -> { socketIndex: plugHash }

  playstyle: string;
  difficulty: Difficulty;

  /** Original DIM/External loadout data for full fidelity viewing */
  originalLoadout?: any;

  /** Source of the build (dim, exoengine, captured) */
  source?: 'dim' | 'exoengine' | 'captured' | 'synergy';

  /** Character stats at time of capture (Mobility, Resilience, etc.) */
  stats?: ArmorStats;

  /** Flag to skip subclass switching (Agent-batch mode) */
  skipSubclassSwap?: boolean;

  /** Flag to skip applying socket overrides (for testing/safety) */
  skipSocketOverrides?: boolean;
}

// ===== Vault Guard Types =====
export interface VaultItemAnalysis {
  item: DestinyItem;
  definition: ItemDefinition;
  stats?: ArmorStats;
  flags: VaultFlag[];
  synergyMatches: string[];
  recommendation: 'keep' | 'consider' | 'dismantle';
}

export interface VaultFlag {
  type: 'high-stat' | 'spike' | 'double-spike' | 'synergy-enabler' | 'exotic' | 'masterworked';
  description: string;
  priority: number;
}

// ===== Transfer Types =====
export interface TransferRequest {
  itemId: string;
  itemHash: number;
  fromCharacter?: string;
  toCharacter: string;
  stackSize?: number;
  action: 'transfer' | 'equip';
}

export interface TransferResult {
  success: boolean;
  request: TransferRequest;
  error?: string;
  errorCode?: number;
}

// ===== Manifest Types =====
export interface ManifestInfo {
  version: string;
  mobileWorldContentPaths: {
    en: string;
  };
}

export interface ManifestData {
  DestinyInventoryItemDefinition: Record<string, ItemDefinition>;
  DestinyStatDefinition: Record<string, { hash: number; displayProperties: { name: string } }>;
  DestinyClassDefinition: Record<string, { displayProperties: { name: string } }>;
  DestinyDamageTypeDefinition: Record<string, { displayProperties: { name: string }; enumValue: number }>;
  DestinySandboxPerkDefinition: Record<string, { displayProperties: { name: string; description: string; icon: string } }>;
}

// ===== UI State Types =====
export interface AppState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Auth
  tokens: AuthTokens | null;
  membership: BungieMembership | null;

  // Profile
  characters: DestinyCharacter[];
  selectedCharacterId: string | null;

  // Inventory
  characterInventory: Record<string, DestinyItem[]>;
  vaultInventory: DestinyItem[];
  equippedItems: Record<string, DestinyItem[]>;

  // Manifest
  manifestVersion: string | null;
  isManifestLoaded: boolean;
}

// ===== Saved Build Types =====
export interface SavedBuild {
  id: string;
  name: string;
  template: BuildTemplate;
  notes?: string;
  createdAt: number;
  lastModified: number;
  lastEquipped?: number;
  tags: string[];
}

// ===== Toast/Notification Types =====
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'alert' | 'lock' | 'unlock';
  message: string;
  duration?: number;
}
