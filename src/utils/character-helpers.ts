// Character inventory screen helper utilities
import type { DestinyItem, ItemInstance, ArmorStats, ElementType, ItemDefinition } from '../types';
import { BUCKET_HASHES } from '../config/bungie.config';
import { manifestService } from '../services/bungie/manifest.service';
import { getBungieUrl } from './url-helper';

/**
 * Get an equipped item from a specific bucket
 */
export function getEquippedItem(
  equipment: DestinyItem[],
  bucketHash: number
): DestinyItem | undefined {
  return equipment.find((item) => item.bucketHash === bucketHash);
}

/**
 * Get the definition for a DestinyItem from the manifest
 */
export function getItemDefinition(item: DestinyItem): ItemDefinition | undefined {
  return manifestService.getItem(item.itemHash);
}

/**
 * Detect the element type of the currently equipped subclass
 */
export function getSubclassElement(equipment: DestinyItem[]): ElementType {
  const subclass = getEquippedItem(equipment, BUCKET_HASHES.SUBCLASS);
  if (!subclass) return 'void';
  return getElement(subclass.itemHash);
}

/**
 * Get the element string for a specific item hash
 */
export function getElement(hash: number): ElementType {
  const def = manifestService.getItem(hash);
  if (!def) return 'void';

  const damageMap: Record<number, ElementType> = {
    2: 'arc',
    3: 'solar',
    4: 'void',
    6: 'stasis',
    7: 'strand',
    8: 'prismatic',
  };

  const element = damageMap[def.defaultDamageType || 0];

  // Prismatic check: name or plug category
  if (!element) {
    const name = def.displayProperties?.name?.toLowerCase() || '';
    // Use word boundary regex to avoid partial matches
    if (/\bprismatic\b/.test(name)) return 'prismatic';
    if (/\bsolar\b/.test(name)) return 'solar';
    if (/\bvoid\b/.test(name)) return 'void';
    if (/\barc\b/.test(name)) return 'arc';
    if (/\bstasis\b/.test(name)) return 'stasis';
    if (/\bstrand\b/.test(name)) return 'strand';
  }

  return element || 'void';
}

/**
 * Calculate total character stats from equipped armor
 */
export function calculateCharacterStats(
  equipment: DestinyItem[],
  itemInstances: Record<string, ItemInstance>
): ArmorStats {
  const stats: ArmorStats = {
    mobility: 0,
    resilience: 0,
    recovery: 0,
    discipline: 0,
    intellect: 0,
    strength: 0,
    total: 0,
  };

  const armorBuckets = [
    BUCKET_HASHES.HELMET,
    BUCKET_HASHES.GAUNTLETS,
    BUCKET_HASHES.CHEST_ARMOR,
    BUCKET_HASHES.LEG_ARMOR,
    BUCKET_HASHES.CLASS_ARMOR,
  ];

  equipment
    .filter((item) => armorBuckets.includes(item.bucketHash))
    .forEach((item) => {
      if (!item.itemInstanceId) return;
      const instance = itemInstances[item.itemInstanceId];
      if (!instance?.stats) return;

      stats.mobility += instance.stats.mobility || 0;
      stats.resilience += instance.stats.resilience || 0;
      stats.recovery += instance.stats.recovery || 0;
      stats.discipline += instance.stats.discipline || 0;
      stats.intellect += instance.stats.intellect || 0;
      stats.strength += instance.stats.strength || 0;
    });

  stats.total =
    stats.mobility +
    stats.resilience +
    stats.recovery +
    stats.discipline +
    stats.intellect +
    stats.strength;

  return stats;
}

/**
 * Get non-equipped inventory items (weapons/armor overflow)
 */
export function getInventoryItems(
  inventory: DestinyItem[],
  limit: number = 9
): DestinyItem[] {
  const weaponAndArmorBuckets = [
    BUCKET_HASHES.KINETIC_WEAPONS,
    BUCKET_HASHES.ENERGY_WEAPONS,
    BUCKET_HASHES.POWER_WEAPONS,
    BUCKET_HASHES.HELMET,
    BUCKET_HASHES.GAUNTLETS,
    BUCKET_HASHES.CHEST_ARMOR,
    BUCKET_HASHES.LEG_ARMOR,
    BUCKET_HASHES.CLASS_ARMOR,
  ];

  return inventory
    .filter((item) => weaponAndArmorBuckets.includes(item.bucketHash))
    .slice(0, limit);
}

/**
 * Get the Bungie CDN icon URL for an item
 */
export function getItemIconUrl(item: DestinyItem): string | undefined {
  const def = manifestService.getItem(item.itemHash);
  if (!def?.displayProperties?.icon) return undefined;
  return getBungieUrl(def.displayProperties.icon);
}

/**
 * Get tier type name for border coloring
 */
export function getTierClass(item: DestinyItem): string {
  const tierType = item.tierType;
  if (tierType === 6) return 'exotic';
  if (tierType === 5) return 'legendary';
  if (tierType === 4) return 'rare';
  if (tierType === 3) return 'uncommon';
  return 'common';
}
