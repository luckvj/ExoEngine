// Manifest Service
// Downloads and caches the Destiny 2 manifest for item lookups

import { bungieApi } from './api-client';
import { db } from '../db/indexeddb.service';
import { clarityService } from './clarity.service';
import { BUNGIE_CONFIG } from '../../config/bungie.config';
import type { ItemDefinition } from '../../types';
import { getSeasonNameFromWatermark } from '../../utils/season-utils';
import { createLogger, infoLog, debugLog } from '../../utils/logger';

const log = createLogger('Manifest');

// Extracted from DIM extended-breaker.json: Maps Modifier Hash -> Breaker Type Hash
const EXTENDED_BREAKER_MAP: Record<string, number> = {
  "17096506": 3178805705, // Stagger
  "89619507": 3178805705,
  "449318888": 485622768, // Pierce
  "503025963": 485622768,
  "511888814": 2611060930, // Disrupt
  "1003391927": 485622768,
  "1047932517": 2611060930,
  "1203306857": 3178805705,
  "1351987111": 3178805705,
  "1443166262": 485622768,
  "1685137410": 3178805705,
  "1734844650": 3178805705,
  "1955548646": 485622768,
  "2110100341": 3178805705,
  "2415768376": 3178805705,
  "2474293653": 485622768,
  "2687811401": 2611060930,
  "2694576561": 2611060930,
  "3118061004": 2611060930,
  "3487253372": 485622768,
  "3598649636": 485622768,
  "4029987901": 2611060930,
  "4268030601": 485622768,
  "3497407670": 3178805705 // Galvanized II -> Unstoppable (Stagger)
};

// Helper for enum conversion
function getBreakerEnum(hash: number): number | undefined {
  if (hash === 485622768) return 1; // Piercing/Barrier
  if (hash === 2611060930) return 2; // Disrupt/Overload
  if (hash === 3178805705) return 3; // Stagger/Unstoppable
  return undefined;
}

interface ManifestResponse {
  version: string;
  mobileWorldContentPaths: {
    en: string;
  };
  jsonWorldContentPaths: {
    en: string;
  };
  jsonWorldComponentContentPaths: {
    en: {
      DestinyInventoryItemDefinition: string;
      DestinyInventoryBucketDefinition: string;
      DestinyStatDefinition: string;
      DestinyClassDefinition: string;
      DestinyDamageTypeDefinition: string;
      DestinyActivityModifierDefinition: string;
      DestinyActivityDefinition: string;
      DestinyBreakerTypeDefinition: string;
      DestinySandboxPerkDefinition: string;
      DestinySocketTypeDefinition: string;
      DestinySocketCategoryDefinition: string;
      DestinyPlugSetDefinition: string;
      DestinyLoadoutNameDefinition: string;
      DestinyLoadoutColorDefinition: string;
      DestinyLoadoutIconDefinition: string;
      DestinyGuardianRankDefinition: string;
      DestinyGuardianRankConstantsDefinition: string;
      DestinyEquipmentSetDefinition: string;
      DestinySocialCommendationNodeDefinition: string;
      DestinySocialCommendationDefinition: string;
      DestinyRecordDefinition: string;
      DestinyPresentationNodeDefinition: string;
    };
  };
}

// Tables we need for ExoEngine
const REQUIRED_TABLES = [
  'DestinyInventoryItemDefinition',
  'DestinyInventoryBucketDefinition',
  'DestinyStatDefinition',
  'DestinyClassDefinition',
  'DestinyDamageTypeDefinition',
  'DestinySandboxPerkDefinition',
  'DestinySocketTypeDefinition',
  'DestinySocketCategoryDefinition',
  'DestinyPlugSetDefinition',
  // Loadout identifier tables (required for SnapshotLoadout API)
  'DestinyLoadoutNameDefinition',
  'DestinyLoadoutColorDefinition',
  'DestinyLoadoutIconDefinition',
  // Activity tables (for Champion/modifier lookups)
  'DestinyActivityModifierDefinition',
  'DestinyActivityDefinition',
  // Champion type icons
  'DestinyBreakerTypeDefinition',
  // Guardian Ranks (Renegades/Lightfall)
  'DestinyGuardianRankDefinition',
  'DestinyGuardianRankConstantsDefinition',
  // Equipment Sets (Required for Set Bonus lookups)
  'DestinyEquipmentSetDefinition',
  // Commendations
  'DestinySocialCommendationNodeDefinition',
  'DestinySocialCommendationDefinition',
  // Records (Triumphs) - Useful for DLC icons via Campaign records
  'DestinyRecordDefinition',
  // Presentation Nodes - Best source for UI categorization images (DLCs, Classes)
  'DestinyPresentationNodeDefinition'
] as const;

type TableName = (typeof REQUIRED_TABLES)[number];

// Map of PlugCategoryHash to DamageType enum value
// Used to fix incorrect default damage types for class abilities (e.g. Strand appearing as Stasis)
const CLASS_ABILITY_TO_DAMAGE_MAP: Record<number, number> = {
  // Hunter
  3956119552: 2, // Arc
  3538316507: 3, // Solar
  3673640204: 4, // Void
  641408223: 6,  // Stasis
  2552562702: 7, // Strand

  // Titan
  1281712906: 2, // Arc
  1197336009: 3, // Solar
  3366817658: 4, // Void
  826897697: 6,  // Stasis
  2480042224: 7, // Strand

  // Warlock
  1308084083: 2, // Arc
  1662395848: 3, // Solar
  3202031457: 4, // Void
  1960796738: 6, // Stasis
  2200902275: 7, // Strand
  // Prismatic
  1800170884: 8, // Prismatic
};

const DAMAGE_HASH_TO_ENUM: Record<number, number> = {
  3373582085: 1, // Kinetic
  2303181850: 2, // Arc
  1847026933: 3, // Solar
  3454344768: 4, // Void
  151347233: 6,  // Stasis
  3949783978: 7, // Strand
  1800170884: 8, // Prismatic
};

export class ManifestService {
  private manifestData: Partial<Record<TableName, Record<string, unknown>>> = {};
  private discoveredAbilities: Record<number, Record<number, Record<string, number[]>>> = {}; // classType -> damageType -> category -> hashes
  private searchCache: Record<string, any[]> = {};
  private isLoading = false;
  private loadPromise: Promise<void> | null = null;

  // Check if we need to update the manifest
  async checkForUpdate(): Promise<{ needsUpdate: boolean; version: string }> {
    try {
      const manifestInfo = await bungieApi.get<ManifestResponse>(
        BUNGIE_CONFIG.endpoints.manifest
      );

      const currentVersion = await db.getManifestVersion();
      let needsUpdate = !currentVersion || currentVersion !== manifestInfo.version;

      if (!needsUpdate) {
        infoLog('Manifest', `Cache check: Version ${currentVersion} matches Bungie. Checking tables...`);
      }

      // Even if version matches, check if any required tables are missing from IndexedDB
      // This handles cases where we've added a new table to REQUIRED_TABLES
      if (!needsUpdate) {
        const availableTables = manifestInfo.jsonWorldComponentContentPaths.en;
        for (const tableName of REQUIRED_TABLES) {
          // Only check/require tables that are actually available in this manifest version
          if (!availableTables[tableName]) continue;

          const tableData = await db.getManifestTable(tableName);
          if (!tableData) {
            infoLog('Manifest', `Forcing update: Table ${tableName} is missing from cache.`);
            needsUpdate = true;
            break;
          }
        }
      }

      if (needsUpdate && currentVersion === manifestInfo.version) {
        infoLog('Manifest', `Manifest version matches (${currentVersion || 'None'}), but required tables are missing from cache.`);
      } else if (needsUpdate) {
        infoLog('Manifest', `Manifest update required: ${manifestInfo.version} (Current: ${currentVersion || 'None'})`);
      } else {
        debugLog('Manifest', `Manifest is up to date (${currentVersion})`);
      }

      return {
        needsUpdate,
        version: manifestInfo.version,
      };
    } catch (error) {
      log.error('Failed to check manifest version:', error);
      return { needsUpdate: true, version: '' };
    }
  }

  // Load manifest (from cache or download)
  async load(
    onProgress?: (table: string, progress: number) => void
  ): Promise<void> {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this.doLoad(onProgress);

    try {
      await this.loadPromise;
    } finally {
      this.loadPromise = null;
    }
  }

  private async doLoad(
    onProgress?: (table: string, progress: number) => void
  ): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      const { needsUpdate, version } = await this.checkForUpdate();

      if (needsUpdate) {
        log.info('Downloading new manifest version:', version);
        await this.downloadManifest(onProgress);
      } else {
        log.info('Loading manifest from cache');
        await this.loadFromCache(onProgress);
      }

      // DIM Standard: Background fetch community perk descriptions
      clarityService.load();
    } finally {
      this.isLoading = false;
    }
  }

  public async createManifestDatabase(): Promise<void> {
    await db.clearManifest();
  }

  public async downloadManifest(
    onProgress?: (table: string, progress: number) => void
  ): Promise<void> {
    // Cross-tab concurrency control using WebLocks
    // This prevents multiple browser tabs from hitting the Bungie API 
    // and updating IndexedDB simultaneously for the same manifest version.
    if (!navigator.locks) {
      // Fallback for older browsers (unlikely for ExoEngine users)
      return this.doDownloadManifest(onProgress);
    }

    return navigator.locks.request('manifest_download', async () => {
      // Re-check version inside the lock - another tab might have finished while we waited
      const { needsUpdate } = await this.checkForUpdate();
      if (!needsUpdate) {
        log.info('Manifest already updated by another tab.');
        await this.loadFromCache(onProgress);
        return;
      }

      return this.doDownloadManifest(onProgress);
    });
  }

  private async doDownloadManifest(
    onProgress?: (table: string, progress: number) => void
  ): Promise<void> {
    const manifestInfo = await bungieApi.get<ManifestResponse>(
      BUNGIE_CONFIG.endpoints.manifest
    );

    const componentPaths = manifestInfo.jsonWorldComponentContentPaths.en;

    // Download tables in parallel (DIM Strategy)
    let completedTables = 0;
    const totalTables = REQUIRED_TABLES.length;

    const tablePromises = REQUIRED_TABLES.map(async (tableName, _index) => {
      const path = componentPaths[tableName];
      if (!path) return;

      const cacheBusters = [
        `?v=${manifestInfo.version.replace(/[^a-zA-Z0-9]/g, '')}`,
        `?cb=${Math.random().toString(36).substring(7)}`,
        `?retry=${Date.now()}`
      ];

      let lastError: any = null;
      let data: any = null;

      // Aggressive cache-busting retry loop (Better than human/DIM)
      for (const buster of cacheBusters) {
        try {
          const url = `${BUNGIE_CONFIG.bungieNetOrigin}${path}${buster}`;
          const response = await fetch(url);

          if (!response.ok) {
            throw new Error(`Failed to download ${tableName} (Status: ${response.status})`);
          }

          data = await response.json();
          if (data && typeof data === 'object') break; // Success
        } catch (error) {
          lastError = error;
          log.warn(`Manifest retry for ${tableName} using ${buster}...`);
        }
      }

      if (!data) {
        throw lastError || new Error(`Failed to download ${tableName} after all retries.`);
      }

      // Prune data before storing (DIM Strategy)
      data = this.trimTable(tableName, data);

      // Store in IndexedDB
      await db.setManifestTable(tableName, data as any);

      // Keep in memory
      this.manifestData[tableName] = data;

      completedTables++;
      const progress = (completedTables / totalTables) * 100;
      onProgress?.(tableName, progress);

      // Single consolidated log with progress counter
      log.info(`Downloading manifest tables (${completedTables}/${totalTables}): ${tableName} (${Object.keys(data).length} entries)`);
    });

    try {
      await Promise.all(tablePromises);

      // Save version
      await db.setManifestVersion(manifestInfo.version);
      onProgress?.('Complete', 100);

      // Summary log
      log.success(`Manifest download complete: ${totalTables} tables loaded`);
      this.discoverSubclassComponents();
    } catch (error) {
      log.error('Failed to download all manifest tables:', error);
      throw error;
    }
  }

  private trimTable(_tableName: TableName, table: Record<string, any>): Record<string, any> {
    // DISABLE TRIMMING FOR DIAGNOSTICS
    return table;
  }

  private async loadFromCache(
    onProgress?: (table: string, progress: number) => void
  ): Promise<void> {
    const totalTables = REQUIRED_TABLES.length;
    const manifestInfo = await bungieApi.get<ManifestResponse>(
      BUNGIE_CONFIG.endpoints.manifest
    );

    for (let i = 0; i < REQUIRED_TABLES.length; i++) {
      const tableName = REQUIRED_TABLES[i];
      onProgress?.(tableName, (i / totalTables) * 100);

      let data = await db.getManifestTable(tableName);

      if (!data) {
        // Table missing from cache, LAZY RECOVERY: Download only this table
        log.warn(`Table ${tableName} missing from cache, fetching...`);
        const tableUrl = manifestInfo.jsonWorldComponentContentPaths.en[tableName];
        if (tableUrl) {
          data = await bungieApi.get<Record<string, unknown>>(tableUrl, false);
          await db.setManifestTable(tableName, data);
        }
      }

      if (data) {
        this.manifestData[tableName] = data;
      }
    }

    onProgress?.('Complete', 100);
    this.discoverSubclassComponents();
  }

  private discoverSubclassComponents(): void {
    const items = this.manifestData.DestinyInventoryItemDefinition as Record<string, RawItemDefinition>;
    if (!items) return;

    // reset discovery
    this.discoveredAbilities = {
      0: {}, 1: {}, 2: {}, 3: {} // Titan, Hunter, Warlock, Neutral
    };
    this.searchCache = {};

    // Use plugCategoryIdentifier strings for reliable detection
    const plugCategoryMap: Record<string, string> = {
      'supers': 'SUPER',
      'super': 'SUPER',
      'class_abilities': 'CLASS_ABILITIES',
      'class_ability': 'CLASS_ABILITIES',
      'melee': 'MELEE',
      'grenades': 'GRENADES',
      'grenade': 'GRENADES',
      'movement': 'JUMP',
      'jump': 'JUMP',
      'aspects': 'ASPECTS',
      'aspect': 'ASPECTS',
      'stasis_aspects': 'ASPECTS',
      'fragments': 'FRAGMENTS',
      'fragment': 'FRAGMENTS',
      'whisper': 'FRAGMENTS',
      'stasis_fragments': 'FRAGMENTS',
      // Prismatic-specific identifiers
      'prismatic_aspects': 'ASPECTS',
      'prismatic_fragments': 'PRISMATIC_FRAGMENTS',
      'prismatic': 'PRISMATIC_FRAGMENTS'
    };

    for (const item of Object.values(items)) {
      // Must have name and icon to be valid
      if (!item.displayProperties?.name || item.displayProperties.name === 'Unknown' || !item.displayProperties.icon) {
        continue;
      }

      // Skip "Attributes", Ornaments, Weapons (3), and Armor (2)
      if (item.displayProperties.name === 'Attributes') continue;
      if (item.itemSubType === 21 || item.displayProperties.name.includes('Ornament')) continue;
      if (item.itemType === 2 || item.itemType === 3) continue;

      // Skip internal items: Catalysts, Masterworks, Empty Sockets, Unfocused, and general noise
      const lowerName = item.displayProperties.name.toLowerCase();
      const lowerType = (item.itemTypeDisplayName || '').toLowerCase();
      if (lowerName.includes('catalyst') || lowerType.includes('catalyst')) continue;
      if (lowerName.includes('masterwork') || lowerType.includes('masterwork')) continue;
      if (lowerName.includes('empty') || lowerName.includes('socket')) continue;
      if (lowerName.includes('unfocused') || lowerName.includes('placeholder')) continue;
      if (item.hash === 3696633656) continue; // Default plug hash

      // Get plug category identifier if available
      const plugCatId = (item as any).plug?.plugCategoryIdentifier?.toLowerCase() || '';

      // Determine category from plugCategoryIdentifier
      let categoryLabel: string | undefined;
      for (const [key, label] of Object.entries(plugCategoryMap)) {
        // Use regex for word boundaries to avoid matching "grenade" in "grenade_launcher"
        const regex = new RegExp(`(^|[._])${key}([._]|$)`, 'i');
        if (regex.test(plugCatId)) {
          categoryLabel = label;
          break;
        }
      }

      // Special handling for Prismatic fragments (Facets)
      if (item.displayProperties.name.startsWith('Facet of')) {
        categoryLabel = 'PRISMATIC_FRAGMENTS';
      }

      // Also check itemTypeDisplayName for fragments/aspects
      const typeDisplay = (item.itemTypeDisplayName || '').toLowerCase();
      if (!categoryLabel) {
        // Regex word boundary check \b to avoid "Grenade Launcher" matching "Grenade"
        if (/\bsuper\b/.test(typeDisplay)) categoryLabel = 'SUPER';
        else if (/\baspect\b/.test(typeDisplay)) categoryLabel = 'ASPECTS';
        else if (/\bfragment\b/.test(typeDisplay)) categoryLabel = 'FRAGMENTS';
        else if (/\bgrenade\b/.test(typeDisplay)) {
          // Double check it's not a launcher
          if (!typeDisplay.includes('launcher')) categoryLabel = 'GRENADES';
        }
        else if (/\bmelee\b/.test(typeDisplay)) categoryLabel = 'MELEE';
        else if (typeDisplay.includes('class ability')) categoryLabel = 'CLASS_ABILITIES';
        else if (typeDisplay.includes('jump') || typeDisplay.includes('glide') || typeDisplay.includes('lift')) categoryLabel = 'JUMP';
      }

      if (!categoryLabel) continue;

      const classType = item.classType ?? 3; // 3 = neutral/all classes

      // Normalize Damage Type
      let damageType = item.defaultDamageType || 0;
      if (damageType > 100) {
        damageType = DAMAGE_HASH_TO_ENUM[damageType] || 0;
      }

      // Fix for class abilities/jump/etc that might be Neutral in manifest but belong to an element
      if (damageType === 0 && (item as any).plug?.plugCategoryHash) {
        const forced = CLASS_ABILITY_TO_DAMAGE_MAP[(item as any).plug.plugCategoryHash];
        if (forced !== undefined) damageType = forced;
      }

      // Robust Prismatic detection
      const isPrismatic =
        plugCatId.includes('prismatic') ||
        categoryLabel === 'PRISMATIC_FRAGMENTS' ||
        item.displayProperties.name.startsWith('Facet of') ||
        (item.itemTypeDisplayName || '').toLowerCase().includes('prismatic');

      if (isPrismatic) {
        damageType = 8;
        if (categoryLabel === 'FRAGMENTS') categoryLabel = 'PRISMATIC_FRAGMENTS';
      }

      if (!this.discoveredAbilities[classType]) this.discoveredAbilities[classType] = {};
      if (!this.discoveredAbilities[classType][damageType]) this.discoveredAbilities[classType][damageType] = {};
      if (!this.discoveredAbilities[classType][damageType][categoryLabel]) {
        this.discoveredAbilities[classType][damageType][categoryLabel] = [];
      }

      this.discoveredAbilities[classType][damageType][categoryLabel].push(item.hash);
    }
    log.info('Subclass component discovery complete.');
  }

  getDiscoveredAbilities(classType: number, damageType: number): Record<string, number[]> {
    return (this.discoveredAbilities[classType] && this.discoveredAbilities[classType][damageType]) || {};
  }

  /**
   * Get all discovered subclass components for the toolbar
   */
  getAllSubclassComponents(): Array<{
    name: string;
    hash: number;
    icon?: string;
    category: string;
    classType: number;
    damageType: number;
  }> {
    const results: Array<{
      name: string;
      hash: number;
      icon?: string;
      category: string;
      classType: number;
      damageType: number;
    }> = [];

    for (const [classType, damageTypes] of Object.entries(this.discoveredAbilities)) {
      for (const [damageType, categories] of Object.entries(damageTypes)) {
        for (const [category, hashes] of Object.entries(categories)) {
          hashes.forEach(hash => {
            const item = this.getItem(hash);
            if (item) {
              results.push({
                name: item.displayProperties.name,
                hash: item.hash,
                icon: item.displayProperties.icon,
                category: category,
                classType: Number(classType),
                damageType: Number(damageType)
              });
            }
          });
        }
      }
    }

    const items = this.manifestData.DestinyInventoryItemDefinition as Record<string, RawItemDefinition>;
    if (items) {
      for (const [hash, item] of Object.entries(items)) {
        if (item.itemType === 16 && item.displayProperties?.name && item.displayProperties.icon) {
          const lowerName = item.displayProperties.name.toLowerCase();
          if (lowerName.includes('unfocused') || lowerName.includes('empty') || lowerName.includes('socket') || lowerName.includes('catalyst')) continue;

          results.push({
            name: item.displayProperties.name,
            hash: Number(hash),
            icon: item.displayProperties.icon, // Don't prepend, let getBungieUrl handle it
            category: 'SUBCLASS',
            classType: item.classType ?? 3,
            damageType: (item.defaultDamageType && item.defaultDamageType > 100)
              ? (DAMAGE_HASH_TO_ENUM[item.defaultDamageType] || 0)
              : (item.defaultDamageType || 0)
          });
        }
      }
    }

    // Final sort: By Element (DamageType) first, then Class, then Name
    return results.sort((a, b) => {
      // Sort by Element first (DamageType enum)
      // We want to group by element so all Solar are together, etc.
      // 1:Kinetic, 2:Arc, 3:Solar, 4:Void, 6:Stasis, 7:Strand, 8:Prismatic
      if (a.damageType !== b.damageType) return a.damageType - b.damageType;

      // Then sort by Class ID (Titan=0, Hunter=1, Warlock=2, Neutral=3)
      if (a.classType !== b.classType) return a.classType - b.classType;

      // Finally alphabetical by name
      return a.name.localeCompare(b.name);
    });
  }


  // Lookup methods
  getItem(hash: number | string): ItemDefinition | undefined {
    const items = this.manifestData.DestinyInventoryItemDefinition as Record<
      string,
      RawItemDefinition
    >;

    if (!items) return undefined;

    // Try straight string (typically unsigned)
    let item = items[String(hash)];

    // If not found, try signed integer string (common Bungie API issue)
    if (!item) {
      const signedHash = Number(hash) | 0; // Force 32-bit signed
      item = items[String(signedHash)];
    }

    if (!item) return undefined;

    return this.transformItemDefinition(item);
  }

  // Get any icon - tries item definition first, then sandbox perks, then records
  getIcon(hash: number | string): string | undefined {
    const item = this.getItem(hash);
    if (item?.displayProperties?.icon) return item.displayProperties.icon;

    // Try sandbox perks (for abilities, mods, etc.)
    const perks = this.manifestData.DestinySandboxPerkDefinition as Record<string, any>;
    if (perks) {
      const perkId = String(hash);
      const perk = perks[perkId];
      if (perk?.displayProperties?.icon) return perk.displayProperties.icon;

      // Try signed hash
      const signedHash = Number(hash) | 0;
      const signedPerk = perks[String(signedHash)];
      if (signedPerk?.displayProperties?.icon) return signedPerk.displayProperties.icon;
    }

    // Try records (Triumphs)
    const record = this.getRecord(hash);
    if (record?.icon) return record.icon;

    return undefined;
  }




  // Get Record (Triumph) Definition
  getRecord(hash: number | string): { name: string; description?: string; icon?: string; completionInfo?: any } | undefined {
    const records = this.manifestData.DestinyRecordDefinition as Record<string, any> | undefined;
    if (!records) return undefined;

    let record = records[String(hash)];
    if (!record) {
      const signedHash = Number(hash) | 0;
      record = records[String(signedHash)];
    }

    if (!record?.displayProperties) return undefined;

    return {
      name: record.displayProperties.name,
      description: record.displayProperties.description,
      icon: record.displayProperties.icon,
      completionInfo: record.completionInfo
    };
  }

  // Search for a Record by name
  searchRecordByName(query: string, exact: boolean = false): { name: string; icon?: string; hash: number } | undefined {
    const records = this.manifestData.DestinyRecordDefinition as Record<string, any> | undefined;
    if (!records) return undefined;

    const target = query.toLowerCase();

    // We want to prioritize records that have icons
    let bestMatch: { name: string; icon?: string; hash: number } | undefined = undefined;

    for (const [hash, record] of Object.entries(records)) {
      if (!record?.displayProperties?.name) continue;

      const name = record.displayProperties.name.toLowerCase();
      const hasIcon = !!record.displayProperties.icon;

      if (exact) {
        if (name === target) {
          if (hasIcon) {
            return {
              name: record.displayProperties.name,
              icon: record.displayProperties.icon,
              hash: Number(hash)
            };
          }
          if (!bestMatch) {
            bestMatch = {
              name: record.displayProperties.name,
              icon: undefined,
              hash: Number(hash)
            };
          }
        }
      } else {
        if (name.includes(target)) {
          if (hasIcon) {
            if (!bestMatch || !bestMatch.icon) {
              bestMatch = {
                name: record.displayProperties.name,
                icon: record.displayProperties.icon,
                hash: Number(hash)
              };
            }
          }
        }
      }
    }
    return bestMatch;
  }

  // Get Presentation Node Definition
  getPresentationNode(hash: number | string): { name: string; description?: string; icon?: string; originalIcon?: string; rootViewIcon?: string } | undefined {
    const nodes = this.manifestData.DestinyPresentationNodeDefinition as Record<string, any> | undefined;
    if (!nodes) return undefined;

    let node = nodes[String(hash)];
    if (!node) {
      const signedHash = Number(hash) | 0;
      node = nodes[String(signedHash)];
    }

    if (!node?.displayProperties) return undefined;

    return {
      name: node.displayProperties.name,
      description: node.displayProperties.description,
      icon: node.displayProperties.icon,
      originalIcon: node.originalIcon,
      rootViewIcon: node.rootViewIcon
    };
  }

  // Search for presentation nodes containing a term and return all matches with icons
  searchPresentationNodes(searchTerm: string): Array<{ hash: number; name: string; icon?: string; rootViewIcon?: string; originalIcon?: string; description?: string }> {
    const nodes = this.manifestData.DestinyPresentationNodeDefinition as Record<string, any> | undefined;
    if (!nodes) return [];

    const results: Array<{ hash: number; name: string; icon?: string; rootViewIcon?: string; originalIcon?: string; description?: string }> = [];
    const lowerSearch = searchTerm.toLowerCase();

    for (const [hash, node] of Object.entries(nodes)) {
      const name = node?.displayProperties?.name || '';
      const description = node?.displayProperties?.description || '';

      if (name.toLowerCase().includes(lowerSearch) || description.toLowerCase().includes(lowerSearch)) {
        results.push({
          hash: Number(hash),
          name: name,
          icon: node.displayProperties?.icon,
          rootViewIcon: node.rootViewIcon,
          originalIcon: node.originalIcon,
          description: description
        });
      }
    }

    // Sort by: has rootViewIcon first, then has icon, then alphabetically
    return results.sort((a, b) => {
      if (a.rootViewIcon && !b.rootViewIcon) return -1;
      if (!a.rootViewIcon && b.rootViewIcon) return 1;
      if (a.icon && !b.icon) return -1;
      if (!a.icon && b.icon) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  // Search for a Presentation Node by name
  searchPresentationNodeByName(query: string, exact: boolean = false): { name: string; icon?: string; hash: number } | undefined {
    const nodes = this.manifestData.DestinyPresentationNodeDefinition as Record<string, any> | undefined;
    if (!nodes) return undefined;

    const target = query.toLowerCase();
    let bestMatch: { name: string; icon?: string; hash: number } | undefined = undefined;

    for (const [hash, node] of Object.entries(nodes)) {
      if (!node?.displayProperties?.name) continue;
      // Filter out empty nodes typically
      if (node.displayProperties.name === '') continue;

      const name = node.displayProperties.name.toLowerCase();
      // Prefer icons that exist
      const hasIcon = !!node.displayProperties.icon || !!node.originalIcon;
      const iconPath = node.displayProperties.icon || node.originalIcon;

      if (exact) {
        if (name === target) {
          if (hasIcon) {
            return {
              name: node.displayProperties.name,
              icon: iconPath,
              hash: Number(hash)
            };
          }
          if (!bestMatch) bestMatch = { name: node.displayProperties.name, icon: undefined, hash: Number(hash) };
        }
      } else {
        if (name.includes(target)) {
          if (hasIcon) {
            // Heuristic: Prefer exact match first, startswith second
            if (!bestMatch || (name.startsWith(target) && !bestMatch.name.toLowerCase().startsWith(target))) {
              bestMatch = {
                name: node.displayProperties.name,
                icon: iconPath,
                hash: Number(hash)
              };
            }
          }
        }
      }
    }
    return bestMatch;
  }

  // Get activity definition
  getActivity(hash: number | string): { name: string; description?: string; icon?: string; pgcrImage?: string } | undefined {
    const activities = this.manifestData.DestinyActivityDefinition as Record<string, any> | undefined;
    if (!activities) return undefined;

    // Try straight lookup
    let activity = activities[String(hash)];

    // Try signed hash conversion
    if (!activity) {
      const signedHash = Number(hash) | 0;
      activity = activities[String(signedHash)];
    }

    if (!activity?.displayProperties) return undefined;

    return {
      name: activity.displayProperties.name || '',
      description: activity.displayProperties.description,
      icon: activity.displayProperties.icon,
      pgcrImage: activity.pgcrImage
    };
  }

  // Get equipment set definition
  getEquipmentSet(hash: number | string): any | undefined {
    const sets = this.manifestData.DestinyEquipmentSetDefinition as Record<string, any> | undefined;
    if (!sets) return undefined;

    let setDef = sets[String(hash)];
    if (!setDef) {
      const signedHash = Number(hash) | 0;
      setDef = sets[String(signedHash)];
    }
    return setDef;
  }

  // Get bucket definition (for weapon slots, armor slots, etc.)
  getBucket(hash: number | string): { name: string; description?: string; icon?: string } | undefined {
    const buckets = this.manifestData.DestinyInventoryBucketDefinition as Record<string, any> | undefined;
    if (!buckets) return undefined;

    // Try straight lookup
    let bucket = buckets[String(hash)];
    if (!bucket) {
      const signedHash = Number(hash) | 0;
      bucket = buckets[String(signedHash)];
    }

    if (!bucket?.displayProperties) return undefined;

    return {
      name: bucket.displayProperties.name || '',
      description: bucket.displayProperties.description,
      icon: bucket.displayProperties.icon
    };
  }

  // Get stat definition (for icons/names)
  getStat(hash: number | string): { name: string; description?: string; icon?: string } | undefined {
    const stats = this.manifestData.DestinyStatDefinition as Record<string, any> | undefined;
    if (!stats) return undefined;

    // Try straight lookup
    let stat = stats[String(hash)];
    if (!stat) {
      const signedHash = Number(hash) | 0;
      stat = stats[String(signedHash)];
    }

    if (!stat?.displayProperties) return undefined;

    return {
      hash: stat.hash,
      name: stat.displayProperties.name || '',
      description: stat.displayProperties.description,
      icon: stat.displayProperties.icon
    } as any;
  }

  // Search for a stat definition by name (exact match, case-insensitive)
  searchStatByName(name: string): { name: string; hash: number; icon?: string; description?: string } | undefined {
    const stats = this.manifestData.DestinyStatDefinition as Record<string, any> | undefined;
    if (!stats) return undefined;

    const target = name.toLowerCase();
    for (const [hash, stat] of Object.entries(stats)) {
      if (stat?.displayProperties?.name?.toLowerCase() === target) {
        return {
          name: stat.displayProperties.name,
          hash: Number(hash),
          icon: stat.displayProperties.icon,
          description: stat.displayProperties.description
        };
      }
    }
    return undefined;
  }

  // Search for an item definition by name (partial match supported)
  searchItemByName(query: string, exact: boolean = false): ItemDefinition | undefined {
    const items = this.manifestData.DestinyInventoryItemDefinition as Record<string, RawItemDefinition>;
    if (!items) return undefined;

    const target = query.toLowerCase();
    for (const item of Object.values(items)) {
      const name = item.displayProperties?.name?.toLowerCase();
      if (!name) continue;

      if (exact) {
        if (name === target) return this.transformItemDefinition(item);
      } else {
        if (name.includes(target)) return this.transformItemDefinition(item);
      }
    }
    return undefined;
  }

  // Get activity modifier definition
  getActivityModifier(hash: number | string): { name: string; description?: string; icon?: string; breakerType?: number } | undefined {
    const modifiers = this.manifestData.DestinyActivityModifierDefinition as Record<string, any> | undefined;
    if (!modifiers) return undefined;

    // Try straight lookup
    let modifier = modifiers[String(hash)];

    // Try signed hash conversion
    if (!modifier) {
      const signedHash = Number(hash) | 0;
      modifier = modifiers[String(signedHash)];
    }

    if (!modifier?.displayProperties) return undefined;

    let breakerType = modifier.breakerType;

    // Fallback: Check EXTENDED_BREAKER_MAP if not found on definition
    if (!breakerType && EXTENDED_BREAKER_MAP[String(hash)]) {
      breakerType = getBreakerEnum(EXTENDED_BREAKER_MAP[String(hash)]);
    }

    // Also check signed hash
    if (!breakerType) {
      const signedHash = Number(hash) | 0;
      if (EXTENDED_BREAKER_MAP[String(signedHash)]) {
        breakerType = getBreakerEnum(EXTENDED_BREAKER_MAP[String(signedHash)]);
      }
    }

    return {
      name: modifier.displayProperties.name || '',
      description: modifier.displayProperties.description,
      icon: modifier.displayProperties.icon,
      breakerType: breakerType
    };
  }

  // Get breaker type (champion type) definition
  // BreakerType enum: None=0, ShieldPiercing=1 (Barrier), Disruption=2 (Overload), Stagger=3 (Unstoppable)
  getBreakerType(breakerType: number | string): { name: string; icon?: string } | undefined {
    // Specific high-quality champion icons requested by user
    const CHAMP_ICONS: Record<number, { name: string; icon: string }> = {
      1: { name: 'Barrier', icon: '/common/destiny2_content/icons/2ee146c19b93b88d2c7857005fc9a8c3.png' },
      2: { name: 'Overload', icon: '/common/destiny2_content/icons/f5b9dd270a544afaf2b9a726b1296501.png' },
      3: { name: 'Unstoppable', icon: '/common/destiny2_content/icons/26bcfa0cf4e27a3dd15f690f7c4ba5a5.png' }
    };

    const targetEnum = Number(breakerType);
    if (CHAMP_ICONS[targetEnum]) {
      return CHAMP_ICONS[targetEnum];
    }

    const breakers = this.manifestData.DestinyBreakerTypeDefinition as Record<string, any> | undefined;
    if (!breakers) return undefined;

    // Fallback: Try treating it as a hash (direct lookup in BreakerType table)
    const byHash = breakers[String(breakerType)];
    if (byHash?.displayProperties) {
      return {
        name: byHash.displayProperties.name || '',
        icon: byHash.displayProperties.icon
      };
    }

    // Fallback: Find by enumValue in BreakerType table
    for (const breaker of Object.values(breakers)) {
      if (breaker?.enumValue === targetEnum) {
        return {
          name: breaker.displayProperties?.name || '',
          icon: breaker.displayProperties?.icon
        };
      }
    }

    return undefined;
  }

  // Get champion icon URL by type name
  getChampionIcon(championType: 'barrier' | 'overload' | 'unstoppable'): string | undefined {
    // Map champion type to breaker enum value
    const breakerMap: Record<string, number> = {
      'barrier': 1, // ShieldPiercing
      'overload': 2, // Disruption
      'unstoppable': 3 // Stagger
    };

    const breakerType = this.getBreakerType(breakerMap[championType]);
    return breakerType?.icon;
  }

  // Get Guardian Rank icon URLs
  getGuardianRankIcon(rank: number): { background?: string; foreground?: string; icon?: string; plate?: string } | undefined {
    const ranks = this.manifestData.DestinyGuardianRankDefinition as Record<string, any> | undefined;
    const constants = this.manifestData.DestinyGuardianRankConstantsDefinition as Record<string, any> | undefined;
    if (!ranks) return undefined;

    const rankDef = Object.values(ranks).find(r => r.rankNumber === rank);
    if (!rankDef) return undefined;

    // Default plate from constants if available
    // For Rank 7-11, they usually use the blue gradient or black plate
    const rankConstants = constants ? Object.values(constants)[0] : null;
    let plate: string | undefined = undefined;

    if (rankConstants?.iconBackgrounds) {
      const backgrounds = rankConstants.iconBackgrounds;
      if (rank >= 7) {
        plate = backgrounds.backgroundFilledBlueGradientBorderedImagePath;
      } else {
        plate = backgrounds.backgroundPlateBlackAlphaImagePath;
      }
    }

    return {
      background: rankDef.iconBackgroundPath ? `${BUNGIE_CONFIG.bungieNetOrigin}${rankDef.iconBackgroundPath}` : undefined,
      foreground: rankDef.iconForegroundPath ? `${BUNGIE_CONFIG.bungieNetOrigin}${rankDef.iconForegroundPath}` : undefined,
      icon: rankDef.displayProperties?.icon ? `${BUNGIE_CONFIG.bungieNetOrigin}${rankDef.displayProperties.icon}` : undefined,
      plate: plate ? `${BUNGIE_CONFIG.bungieNetOrigin}${plate}` : undefined
    };
  }

  // Get Class icon URL (High Quality - matching sidebar filters)
  getClassIcon(classType: number): string | undefined {
    const classNames: Record<number, string> = {
      0: 'Titan',
      1: 'Hunter',
      2: 'Warlock'
    };

    const className = classNames[classType];
    if (className) {
      const node = this.searchPresentationNodeByName(className, true);
      if (node?.icon) return node.icon;
    }

    // Fallback to Class Definition
    const classes = this.manifestData.DestinyClassDefinition as Record<string, any> | undefined;
    if (!classes) return undefined;

    const classDef = Object.values(classes).find(c => c.classType === classType);
    return classDef?.displayProperties?.icon;
  }

  // Get damage type icon URL by element name
  getDamageTypeIcon(damageType: 'solar' | 'void' | 'arc' | 'stasis' | 'strand' | 'prismatic' | 'kinetic' | 'neutral'): string | undefined {
    // Map damage type names to their enum values in DestinyDamageTypeDefinition
    const damageTypeMap: Record<string, number> = {
      'kinetic': 3373582085,  // Kinetic
      'solar': 1847026933,    // Thermal/Solar
      'arc': 2303181850,      // Arc
      'void': 3454344768,     // Void
      'stasis': 151347233,    // Stasis
      'strand': 3949783978,   // Strand
      'prismatic': 1800170884 // Prismatic
    };
    const damageTypes = this.manifestData.DestinyDamageTypeDefinition as Record<string, any> | undefined;
    if (!damageTypes) return undefined;

    const hash = damageTypeMap[damageType.toLowerCase()];
    if (!hash) return undefined;

    let def = damageTypes[String(hash)];

    // Fallback: Check signed hash
    if (!def) {
      const signedHash = Number(hash) | 0;
      def = damageTypes[String(signedHash)];
    }

    if (def?.displayProperties?.icon) {
      return def.displayProperties.icon; // Don't prepend, let getBungieUrl handle it
    }

    return undefined;
  }

  // Get Commendation Node definition
  getCommendationNode(hash: number | string): { name: string; icon?: string; color?: string; hash: number } | undefined {
    const nodes = this.manifestData.DestinySocialCommendationNodeDefinition as Record<string, any> | undefined;
    if (!nodes) return undefined;

    let def = nodes[String(hash)];
    if (!def) {
      const signedHash = Number(hash) | 0;
      def = nodes[String(signedHash)];
    }

    if (!def) return undefined;

    return {
      hash: def.hash,
      name: def.displayProperties?.name || '',
      icon: def.displayProperties?.icon ? `${BUNGIE_CONFIG.bungieNetOrigin}${def.displayProperties.icon}` : undefined,
      color: def.color ? `rgb(${def.color.red}, ${def.color.green}, ${def.color.blue})` : undefined
    };
  }

  // Get Commendation definition
  getCommendation(hash: number | string): { name: string; description: string; icon?: string } | undefined {
    const comms = this.manifestData.DestinySocialCommendationDefinition as Record<string, any> | undefined;
    if (!comms) return undefined;

    let def = comms[String(hash)];
    if (!def) {
      const signedHash = Number(hash) | 0;
      def = comms[String(signedHash)];
    }

    if (!def) return undefined;

    return {
      name: def.displayProperties?.name || '',
      description: def.displayProperties?.description || '',
      icon: def.displayProperties?.icon ? `${BUNGIE_CONFIG.bungieNetOrigin}${def.displayProperties.icon}` : undefined
    };
  }

  // Get Guardian Rank name
  getGuardianRankName(rank: number): string | undefined {
    const ranks = this.manifestData.DestinyGuardianRankDefinition as Record<string, any> | undefined;
    if (!ranks) return undefined;

    // Guardian Ranks are usually keyed by rank number in the manifest or have it in the def
    const def = Object.values(ranks).find(r => r.rank === rank);
    return def?.displayProperties?.name;
  }

  // Search activities in the manifest
  searchActivities(query: string, limit = 10): any[] {
    const activities = this.manifestData.DestinyActivityDefinition as Record<string, any> | undefined;
    if (!activities) return [];

    // Normalization helper
    const normalize = (str: string) => str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, '')
      .trim();

    const normalizedQuery = normalize(query);
    const results: any[] = [];

    for (const activity of Object.values(activities)) {
      if (!activity?.displayProperties?.name) continue;

      const normalizedName = normalize(activity.displayProperties.name);

      if (normalizedName.includes(normalizedQuery)) {
        results.push(activity);
        if (results.length >= limit) break;
      }
    }

    return results;
  }

  // Get name from any source
  getName(hash: number | string): string | undefined {
    const item = this.getItem(hash);
    if (item?.displayProperties.name) return item.displayProperties.name;

    const perk = this.getPerk(hash);
    if (perk?.name) return perk.name;

    return undefined;
  }

  // Get full definition for tooltips
  getFullDefinition(hash: number | string): {
    name: string;
    type?: string;
    description?: string;
    flavorText?: string;
    perkName?: string;
    icon?: string;
    stats?: Array<{ name: string; value: number | string }>;
    element?: string;
    breakerType?: number;
  } | undefined {
    // Try item first
    const item = this.getItem(hash);
    if (item) {
      const statsEn: Array<{ name: string; value: number | string }> = [];

      // Pull basic stats if available
      const rawItem = (this.manifestData.DestinyInventoryItemDefinition as any)?.[String(hash)];

      // Check for stats.stats (weapons/armor)
      if (rawItem?.stats?.stats) {
        Object.values(rawItem.stats.stats).forEach((stat: any) => {
          const statDef = this.getStat(stat.statHash);
          if (statDef) {
            statsEn.push({
              name: statDef.name,
              value: stat.value
            });
          }
        });
      }

      // Check for investmentStats (fragments/mods)
      if (rawItem?.investmentStats && statsEn.length === 0) {
        rawItem.investmentStats.forEach((stat: any) => {
          const statDef = this.getStat(stat.statTypeHash);
          // Only show non-zero stats or critical ones. For fragments, values can be negative.
          if (statDef && stat.value !== 0) {
            // Check if this stat is already added? (Unlikely if statsEn is empty)
            statsEn.push({
              name: statDef.name,
              value: stat.value > 0 ? `+${stat.value}` : `${stat.value}`
            });
          }
        });
      }

      let description = item.displayProperties.description;
      let perkName: string | undefined = undefined;

      // Extract Exotic Intrinsic Perk Description if available
      if (rawItem?.sockets?.socketEntries && item.inventory?.tierType === 6) { // Only for exotics
        // Look for the intrinsic perk socket. Usually the first socket or one with a specific plug.
        for (const socket of rawItem.sockets.socketEntries) {
          if (socket.singleInitialItemHash) {
            const plugItem = (this.manifestData.DestinyInventoryItemDefinition as any)?.[String(socket.singleInitialItemHash)];
            // Check for intrinsic/trait type
            if (plugItem && plugItem.displayProperties?.description) {
              const isIntrinsic = plugItem.itemTypeDisplayName === 'Intrinsic' ||
                plugItem.itemTypeDisplayName === 'Trait' ||
                plugItem.plug?.plugCategoryIdentifier?.includes('intrinsic');

              if (isIntrinsic && plugItem.displayProperties.description.length > 20) {
                description = plugItem.displayProperties.description;
                perkName = plugItem.displayProperties.name;
                break;
              }
            }
          }
        }
      }

      // Fallback: Check perks if description is still empty (Common for Aspects/Fragments)
      if (!description && rawItem?.perks?.length) {
        for (const p of rawItem.perks) {
          const perkDef = this.getPerk(p.perkHash);
          if (perkDef?.description && perkDef.description.length > 20) {
            description = perkDef.description;
            perkName = perkDef.name;
            break;
          }
        }
      }

      // Final fallback to item description
      if (!description || description.length < 20) {
        description = item.displayProperties.description || rawItem?.flavorText;
      }

      return {
        name: item.displayProperties.name,
        type: item.inventory?.tierTypeName || 'Item',
        description: description,
        flavorText: rawItem?.flavorText,
        perkName: perkName,
        icon: item.displayProperties.icon || item.screenshot,
        stats: statsEn,
        element: (item.defaultDamageType && this.getDamageType(item.defaultDamageType)?.name) || undefined
      };
    }

    // Try activity definition (for milestones, portal activities, etc.)
    const activityDef = this.getActivity(hash);
    if (activityDef) {
      return {
        name: activityDef.name,
        type: 'Activity',
        description: activityDef.description,
        icon: activityDef.pgcrImage || activityDef.icon
      };
    }

    // Try activity modifier definition
    const modifierDef = this.getActivityModifier(hash);
    if (modifierDef) {
      return {
        name: modifierDef.name,
        type: 'Modifier',
        description: modifierDef.description,
        icon: modifierDef.icon,
        breakerType: modifierDef.breakerType
      };
    }

    // Try perk/ability as fallback
    const perk = this.getPerk(hash);
    if (perk) {
      return {
        name: perk.name,
        type: 'Ability/Perk',
        description: perk.description,
        icon: perk.icon
      };
    }

    return undefined;
  }

  private transformItemDefinition(raw: RawItemDefinition): ItemDefinition {
    // Fix for Strand/Stasis Class Abilities having wrong damage type
    // These specific plug categories are known to return incorrect defaults (e.g. Stasis for Strand)
    let damageType = raw.defaultDamageType;
    if (raw.plug?.plugCategoryHash) {
      const forcedDamageType = CLASS_ABILITY_TO_DAMAGE_MAP[raw.plug.plugCategoryHash];
      if (forcedDamageType !== undefined) {
        damageType = forcedDamageType;
      }
    }

    if (raw.inventory?.tierType === 6) {
      // Debug: Check equipping block for exotics
      if (!raw.equippingBlock?.uniqueLabel) {
        // console.warn(`Manifest: Exotic ${raw.hash} (${raw.displayProperties?.name}) missing uniqueLabel`, raw.equippingBlock);
      }
    }

    return {
      ...raw, // Pass through all raw data first
      hash: raw.hash,
      displayProperties: {
        name: raw.displayProperties?.name || 'Unknown',
        description: raw.displayProperties?.description || '',
        icon: raw.displayProperties?.icon
          ? `${BUNGIE_CONFIG.bungieNetOrigin}${raw.displayProperties.icon}`
          : '',
        hasIcon: !!raw.displayProperties?.icon,
      },
      screenshot: raw.screenshot
        ? `${BUNGIE_CONFIG.bungieNetOrigin}${raw.screenshot}`
        : undefined,
      itemType: raw.itemType,
      itemSubType: raw.itemSubType,
      classType: raw.classType,
      equippable: raw.equippable || false,
      defaultDamageType: damageType,
      defaultDamageTypeHash: raw.defaultDamageTypeHash,
      tierType: raw.inventory?.tierType,
      isExotic: raw.inventory?.tierType === 6,
      itemTypeDisplayName: raw.itemTypeDisplayName,
      itemTypeAndTierDisplayName: raw.itemTypeAndTierDisplayName,
      sockets: raw.sockets,
      itemCategoryHashes: raw.itemCategoryHashes,
      plug: raw.plug,
      inventory: raw.inventory ? {
        tierType: raw.inventory.tierType || 0,
        tierTypeName: raw.inventory.tierTypeName || '',
        bucketTypeHash: raw.inventory.bucketTypeHash || 0,
        recoveryBucketTypeHash: (raw.inventory as any).recoveryBucketTypeHash || 0,
        maxStackSize: (raw.inventory as any).maxStackSize || 1,
        isInstanceItem: (raw.inventory as any).isInstanceItem || false,
        nonTransferrable: (raw.inventory as any).nonTransferrable || false,
        equippingLabel: raw.equippingBlock?.uniqueLabel,
        equippable: (raw.inventory as any).equippable || false,
      } : undefined,
      equippingBlock: raw.equippingBlock,
      stats: raw.stats ? {
        disablePrimaryStatDisplay: !!raw.stats.disablePrimaryStatDisplay,
        statGroupHash: raw.stats.statGroupHash || 0,
        stats: raw.stats.stats || {},
        hasAndDisplayHashes: raw.stats.hasAndDisplayHashes || [],
      } : undefined,
      iconWatermark: raw.iconWatermark || raw.quality?.displayVersionWatermarkIcons?.[0],
      secondarySpecial: raw.secondarySpecial
        ? `${BUNGIE_CONFIG.bungieNetOrigin}${raw.secondarySpecial}`
        : undefined,
      secondaryOverlay: raw.secondaryOverlay
        ? `${BUNGIE_CONFIG.bungieNetOrigin}${raw.secondaryOverlay}`
        : undefined,
      secondaryIcon: raw.secondaryIcon
        ? `${BUNGIE_CONFIG.bungieNetOrigin}${raw.secondaryIcon}`
        : undefined,
      seasonLabel: getSeasonNameFromWatermark(raw.iconWatermark || raw.quality?.displayVersionWatermarkIcons?.[0] || ''),
      iconWatermarkShelved: raw.iconWatermarkShelved || undefined,
      quality: raw.quality ? {
        currentVersion: (raw.quality as any).currentVersion || 0,
        displayVersionWatermarkIcons: raw.quality.displayVersionWatermarkIcons || []
      } : undefined,
    };
  }

  getItems(hashes: (number | string)[]): ItemDefinition[] {
    return hashes
      .map((hash) => this.getItem(hash))
      .filter((item): item is ItemDefinition => item !== undefined);
  }

  /**
   * Search items by type and tier (e.g., exotic weapons, exotic armor)
   * @param itemType - 2 for armor, 3 for weapon
   * @param tierType - 6 for exotic, 5 for legendary
   */
  searchItemsByType(itemType: number, tierType: number): Array<{
    name: string;
    description: string;
    hash: number;
    icon?: string;
    classType: number;
    bucketHash: number;
    damageType: number;
    itemSubType: number;
  }> {
    const cacheKey = `type_${itemType}_tier_${tierType}`;
    if (this.searchCache[cacheKey]) {
      return this.searchCache[cacheKey];
    }

    const items = this.manifestData.DestinyInventoryItemDefinition as Record<string, RawItemDefinition>;
    if (!items) return [];

    const results: Array<{
      name: string;
      description: string;
      hash: number;
      icon?: string;
      classType: number;
      bucketHash: number;
      damageType: number;
      itemSubType: number;
    }> = [];

    for (const [hash, item] of Object.entries(items)) {
      if (item.itemType === itemType && item.inventory?.tierType === tierType && item.displayProperties?.name) {
        results.push({
          name: item.displayProperties.name,
          description: item.displayProperties.description || '',
          hash: Number(hash),
          icon: item.displayProperties.icon, // Don't prepend, let getBungieUrl handle it
          classType: item.classType ?? 3, // Default to 3 (Unknown/All) if missing
          bucketHash: item.inventory?.bucketTypeHash || 0,
          damageType: item.defaultDamageType || 0,
          itemSubType: item.itemSubType || 0
        });
      }
    }

    this.searchCache[cacheKey] = results;
    return results;
  }

  searchItems(query: string, options?: SearchOptions & { fuzzy?: boolean }): ItemDefinition[] {
    const items = this.manifestData.DestinyInventoryItemDefinition as Record<
      string,
      RawItemDefinition
    >;

    if (!items) return [];

    const results: { item: ItemDefinition; score: number }[] = [];

    // Helper to normalize strings for comparison
    const cleanStr = (s: string) => s.toLowerCase().replace(/['’.,!-\s]/g, '');
    const cleanQuery = cleanStr(query);

    for (const item of Object.values(items)) {
      // Filter by options
      if (options?.tierType !== undefined && item.inventory?.tierType !== options.tierType) continue;
      if (options?.classType !== undefined && item.classType !== options.classType) continue;
      if (options?.itemType !== undefined && item.itemType !== options.itemType) continue;

      const itemName = item.displayProperties?.name;
      if (!itemName) continue;

      const cleanName = cleanStr(itemName);
      let score = -1; // -1 means no match

      // 1. Exact Substring Match (Highest Priority)
      if (cleanName.includes(cleanQuery)) {
        // Shorter names that match are better (e.g. "Ace" matches "Ace of Spades" better than "Place of Spades")
        score = 0 + (cleanName.length - cleanQuery.length) * 0.01;
      }
      // 2. Fuzzy Match (Levenshtein)
      else if (options?.fuzzy) {
        // Only run Levenshtein if lengths are somewhat close (optimization)
        if (Math.abs(cleanName.length - cleanQuery.length) <= 3) {
          const dist = this.levenshtein(cleanQuery, cleanName);
          // Allow distance of 2 (handles "guild" vs "guile", "grenades" vs "grenade")
          if (dist <= 2) {
            score = dist;
          }
        }
      }

      if (score !== -1) {
        results.push({
          item: this.transformItemDefinition(item),
          score
        });
      }
    }

    // Sort by score (lower is better)
    results.sort((a, b) => a.score - b.score);

    // Apply limit
    const limit = options?.limit ?? 10;
    return results.slice(0, limit).map(r => r.item);
  }

  // Levenshtein Distance Helper
  private levenshtein(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  // Get exotics by class
  getExoticArmor(classType?: number): ItemDefinition[] {
    const items = this.manifestData.DestinyInventoryItemDefinition as Record<
      string,
      RawItemDefinition
    >;

    if (!items) return [];

    return Object.values(items)
      .filter((item) => {
        // Is exotic armor
        if (item.inventory?.tierType !== 6) return false; // Exotic
        if (item.itemType !== 2) return false; // Armor

        // Class filter
        if (classType !== undefined && item.classType !== classType) return false;

        // Has an icon (real item, not placeholder)
        if (!item.displayProperties?.icon) return false;

        return true;
      })
      .map((item) => this.transformItemDefinition(item));
  }

  getExoticWeapons(): ItemDefinition[] {
    const items = this.manifestData.DestinyInventoryItemDefinition as Record<
      string,
      RawItemDefinition
    >;

    if (!items) return [];

    return Object.values(items)
      .filter((item) => {
        // Is exotic weapon
        if (item.inventory?.tierType !== 6) return false; // Exotic
        if (item.itemType !== 3) return false; // Weapon

        // Has an icon
        if (!item.displayProperties?.icon) return false;

        return true;
      })
      .map((item) => this.transformItemDefinition(item));
  }


  getPerk(hash: number | string): { name: string; description: string; icon: string; hash: number } | undefined {
    const perks = this.manifestData.DestinySandboxPerkDefinition as Record<
      string,
      { hash: number; displayProperties: { name: string; description: string; icon?: string } }
    >;

    if (!perks) return undefined;

    const perk = perks[String(hash)];
    if (!perk) return undefined;

    return {
      hash: perk.hash,
      name: perk.displayProperties.name,
      description: perk.displayProperties.description,
      icon: perk.displayProperties.icon
        ? `${BUNGIE_CONFIG.bungieNetOrigin}${perk.displayProperties.icon}`
        : '',
    };
  }

  // Search perks by name in the manifest
  searchPerks(query: string, limit = 5): Array<{ name: string; description: string; hash: number; icon?: string }> {
    const perks = this.manifestData.DestinySandboxPerkDefinition as Record<string, any> | undefined;
    if (!perks) return [];

    const normalize = (s: string) => s.toLowerCase().replace(/['’.,!-\s]/g, '');
    const cleanQuery = normalize(query);
    const results: Array<{ name: string; description: string; hash: number; icon?: string; score: number }> = [];

    for (const perk of Object.values(perks)) {
      if (!perk?.displayProperties?.name) continue;

      const cleanName = normalize(perk.displayProperties.name);
      if (cleanName.includes(cleanQuery)) {
        results.push({
          name: perk.displayProperties.name,
          description: perk.displayProperties.description || '',
          hash: perk.hash,
          icon: perk.displayProperties.icon, // Don't prepend, let getBungieUrl handle it
          score: cleanName.length - cleanQuery.length
        });
      }
    }

    return results
      .sort((a, b) => a.score - b.score)
      .slice(0, limit)
      .map(({ score, ...rest }) => rest);
  }

  // Search legendary weapons by name
  searchLegendaryWeapons(query: string, limit = 5): Array<{ name: string; hash: number; icon?: string }> {
    const items = this.manifestData.DestinyInventoryItemDefinition as Record<string, any> | undefined;
    if (!items) return [];

    const normalize = (s: string) => s.toLowerCase().replace(/['’.,!-\s]/g, '');
    const cleanQuery = normalize(query);
    const results: Array<{ name: string; hash: number; icon?: string; score: number }> = [];

    for (const item of Object.values(items)) {
      if (item.itemType === 3 && item.inventory?.tierType === 5) {
        if (!item.displayProperties?.name) continue;
        const cleanName = normalize(item.displayProperties.name);
        if (cleanName.includes(cleanQuery)) {
          results.push({
            name: item.displayProperties.name,
            hash: item.hash,
            icon: item.displayProperties.icon ? `${BUNGIE_CONFIG.bungieNetOrigin}${item.displayProperties.icon}` : undefined,
            score: cleanName.length - cleanQuery.length
          });
        }
      }
    }

    return results
      .sort((a, b) => a.score - b.score)
      .slice(0, limit)
      .map(({ score, ...rest }) => rest);
  }

  getDamageType(enumValue: number): { name: string } | undefined {
    const types = this.manifestData.DestinyDamageTypeDefinition as Record<
      string,
      { displayProperties: { name: string }; enumValue: number }
    >;

    if (!types) return undefined;

    for (const type of Object.values(types)) {
      if (type.enumValue === enumValue) {
        return { name: type.displayProperties.name };
      }
    }

    return undefined;
  }

  getClassName(classType: number): string {
    const classes = this.manifestData.DestinyClassDefinition as Record<
      string,
      { classType: number; displayProperties: { name: string } }
    >;

    if (!classes) return 'Unknown';

    for (const cls of Object.values(classes)) {
      if (cls.classType === classType) {
        return cls.displayProperties.name;
      }
    }

    return 'Unknown';
  }

  getPlugSet(hash: number | string): Array<{ name: string; description: string; hash: number; icon?: string }> {
    const plugSets = this.manifestData.DestinyPlugSetDefinition as Record<string, any> | undefined;
    if (!plugSets) return [];

    const plugSet = plugSets[String(hash)];
    if (!plugSet?.reusablePlugItems) return [];

    return plugSet.reusablePlugItems
      .map((item: any) => {
        const itemDef = this.getRawDefinition('DestinyInventoryItemDefinition', item.plugItemHash);
        if (!itemDef) return null;

        // Skip Shaders (10), Ornaments (26), Mementos, and other cosmetic types
        if (itemDef.itemType === 10 || itemDef.itemType === 26) return null;

        // Skip items that aren't actually perks/mods (usually itemType 19, 20 etc)
        // Perks are often 18 or specific types. But filtering 10/26 covers the main report.

        return {
          name: itemDef.displayProperties?.name || 'Unknown Perk',
          description: itemDef.displayProperties?.description || '',
          hash: itemDef.hash,
          icon: itemDef.displayProperties?.icon ? `${BUNGIE_CONFIG.bungieNetOrigin}${itemDef.displayProperties.icon}` : undefined
        };
      })
      .filter((p: any) => p !== null && p.name !== 'Empty')
      // De-duplicate by hash to handle redundant sockets/plugs
      .filter((p: any, index: number, self: any[]) => index === self.findIndex((t: any) => t?.hash === p?.hash));
  }

  /**
   * Get the full pool of potential perks for a weapon
   */
  getPerkPool(weaponHash: number): Array<{ column: number; perks: Array<{ name: string; description: string; hash: number; icon?: string }> }> {
    const rawDef = this.getRawDefinition('DestinyInventoryItemDefinition', weaponHash);
    if (!rawDef?.sockets?.socketEntries) return [];

    const pool: any[] = [];

    // Most Legendaries have perks in specific socket categories
    // We'll iterate and find "Trait" sockets
    // Find the "Weapon Perks" category sockets
    const perkCategory = rawDef.sockets.socketCategories?.find(
      (c: any) => c.socketCategoryHash === 4241085061 // "Weapon Perks" category
    );

    const traitIndices = perkCategory?.socketIndexes || [];

    rawDef.sockets.socketEntries.forEach((entry: any, index: number) => {
      // Prioritize sockets in the "Weapon Perks" category
      if (traitIndices.length > 0 && !traitIndices.includes(index)) return;

      const plugSetHash = entry.randomizedPlugSetHash || entry.reusablePlugSetHash;
      if (plugSetHash) {
        const perks = this.getPlugSet(plugSetHash);
        if (perks.length > 0) {
          pool.push({
            column: index,
            perks
          });
        }
      }
    });

    return pool;
  }
  isLoaded(): boolean {
    return REQUIRED_TABLES.every((table) => this.manifestData[table] !== undefined);
  }

  // Clear cached data
  async clearCache(): Promise<void> {
    await db.clearManifest();
    this.manifestData = {};
    this.searchCache = {};
  }

  getDefinition(tableName: TableName, hash: number | string): any {
    return (this.manifestData[tableName] as Record<string, any>)?.[String(hash)];
  }

  // Alias for getDefinition
  getRawDefinition(tableName: TableName, hash: number | string): any {
    return this.getDefinition(tableName, hash);
  }

  // Gets the fragment capacity of an aspect item
  getAspectCapacity(aspectHash: number): number {
    const def = this.getRawDefinition('DestinyInventoryItemDefinition', aspectHash);
    // DIM Strategy: Aspects have capacity in plug.energyCapacity.capacityValue
    // If not found, try energy.capacityValue as fallback for older items
    return def?.plug?.energyCapacity?.capacityValue ?? def?.energy?.capacityValue ?? 0;
  }

  // Get default loadout identifiers (first valid hash from each table)
  // Required for SnapshotLoadout API - Bungie requires valid manifest hashes
  getDefaultLoadoutIdentifiers(): { nameHash: number; colorHash: number; iconHash: number } | null {
    const names = this.manifestData.DestinyLoadoutNameDefinition as Record<string, { hash: number; index?: number }>;
    const colors = this.manifestData.DestinyLoadoutColorDefinition as Record<string, { hash: number; index?: number }>;
    const icons = this.manifestData.DestinyLoadoutIconDefinition as Record<string, { hash: number; index?: number }>;

    if (!names || !colors || !icons) {
      return null;
    }

    // Get first non-redacted entry from each table, sorted by index if available
    const getFirstHash = (table: Record<string, any>): number | null => {
      const entries = Object.values(table)
        .filter(e => !e.redacted)
        .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
      return entries[0]?.hash ?? null;
    };

    const nameHash = getFirstHash(names);
    const colorHash = getFirstHash(colors);
    const iconHash = getFirstHash(icons);

    if (nameHash === null || colorHash === null || iconHash === null) {
      return null;
    }

    return { nameHash, colorHash, iconHash };
  }

  // Diagnostic: Get item count
  getItemCount(): number {
    const items = this.manifestData.DestinyInventoryItemDefinition;
    return items ? Object.keys(items).length : 0;
  }

  // Diagnostic: Get first few keys and hunt for Ace of Spades
  getDebugInfo(): string {
    const items = this.manifestData.DestinyInventoryItemDefinition;
    if (!items) return "No items loaded";

    // Check specific hashes
    const hashUnsigned = "4019651319"; // Ace of Spades
    const hashSigned = "-275315977";

    let result = `Items: ${Object.keys(items).length}\n`;

    if (items[hashUnsigned]) result += `FOUND Unsigned: ${(items[hashUnsigned] as any).displayProperties?.name}\n`;
    else result += `MISSING Unsigned (${hashUnsigned})\n`;

    if (items[hashSigned]) result += `FOUND Signed: ${(items[hashSigned] as any).displayProperties?.name}\n`;
    else result += `MISSING Signed (${hashSigned})\n`;

    // Search by name
    let foundKey = "";
    for (const key in items) {
      // Safe check for displayProperties
      const def = items[key] as any;
      if (def?.displayProperties?.name === "Ace of Spades") {
        foundKey = key;
        const fullDef = JSON.stringify(def).substring(0, 100);
        result += `Found via SEARCH. Key: ${key} \nDef Start: ${fullDef}...`;
        break;
      }
    }

    if (!foundKey) result += "Could not find 'Ace of Spades' by name scan.";

    return result;
  }
}

// Raw item definition from manifest
export interface RawItemDefinition {
  hash: number;
  displayProperties: {
    name: string;
    description: string;
    icon?: string;
  };
  screenshot?: string;
  itemType: number;
  itemSubType: number;
  classType: number;
  itemCategoryHashes?: number[];
  inventory?: {
    tierType: number;
    tierTypeName: string;
    bucketTypeHash: number;
  };
  equippingBlock?: {
    uniqueLabel?: string;
    uniqueLabelHash?: number;
    equipmentSlotTypeHash?: number;
    attributes?: number;
    ammoType?: number;
    displayStrings?: string[];
  };
  equippable?: boolean;
  defaultDamageType?: number;
  defaultDamageTypeHash?: number;
  itemTypeDisplayName?: string;
  itemTypeAndTierDisplayName?: string;
  sockets?: any; // Raw socket data for parsing categories
  plug?: {
    plugCategoryHash: number;
    plugCategoryIdentifier: string;
    energyCapacity?: {
      capacityValue: number;
    };
  };
  investmentStats?: Array<{
    statTypeHash: number;
    value: number;
    isConditionallyActive: boolean;
  }>;
  iconWatermark?: string;
  iconWatermarkShelved?: string;
  quality?: {
    displayVersionWatermarkIcons: string[];
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
  secondaryIcon?: string;
  secondaryOverlay?: string;
  secondarySpecial?: string;
}

interface SearchOptions {
  tierType?: number;
  classType?: number;
  itemType?: number;
  limit?: number;
}

// Export singleton
export const manifestService = new ManifestService();

