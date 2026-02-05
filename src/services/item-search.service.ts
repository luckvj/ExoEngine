/**
 * Item Search Service
 * Searches for items across all inventory locations
 */
import { useProfileStore } from '../store';
import { manifestService } from './bungie/manifest.service';
import type { DestinyItem, ItemDefinition, GuardianClass } from '../types';

export interface ItemSearchResult {
    item: DestinyItem;
    definition: ItemDefinition;
    location: 'equipped' | 'inventory' | 'vault';
    characterId?: string;
}

// Cache for name -> hash lookups
const nameToHashCache = new Map<string, number>();

/**
 * Normalize text for comparison - removes apostrophes, special chars
 */
function normalizeForMatching(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/['`’]/g, '') // DIM Standard: Remove all types of apostrophes
        .replace(/[^a-z0-9\s]/g, '') // Remove special chars except spaces
        .replace(/\s+/g, ' '); // Normalize spaces
}

/**
 * Search for item hash by name using manifest (supports partial/fuzzy matching)
 */
function findHashByName(itemName: string): number | undefined {
    const searchName = normalizeForMatching(itemName);

    // Check cache first
    if (nameToHashCache.has(searchName)) {
        return nameToHashCache.get(searchName);
    }

    // Search through player's inventory to find matching items by comparing names
    const store = useProfileStore.getState();
    const { characterEquipment, characterInventories, vaultInventory } = store;

    // Collect all unique item hashes from player inventory with their names
    const allItems = new Map<number, string>();

    for (const equipment of Object.values(characterEquipment)) {
        for (const item of equipment) {
            const def = manifestService.getItem(item.itemHash);
            if (def?.displayProperties?.name) {
                allItems.set(item.itemHash, normalizeForMatching(def.displayProperties.name));
            }
        }
    }

    for (const inventory of Object.values(characterInventories)) {
        for (const item of inventory) {
            const def = manifestService.getItem(item.itemHash);
            if (def?.displayProperties?.name) {
                allItems.set(item.itemHash, normalizeForMatching(def.displayProperties.name));
            }
        }
    }

    for (const item of vaultInventory) {
        const def = manifestService.getItem(item.itemHash);
        if (def?.displayProperties?.name) {
            allItems.set(item.itemHash, normalizeForMatching(def.displayProperties.name));
        }
    }

    // 1. Try exact match first
    for (const [hash, name] of allItems.entries()) {
        if (name === searchName) {
            nameToHashCache.set(searchName, hash);
            return hash;
        }
    }

    // 2. Try "starts with" match
    for (const [hash, name] of allItems.entries()) {
        if (name.startsWith(searchName)) {
            nameToHashCache.set(searchName, hash);
            return hash;
        }
    }

    // 3. Try word match
    if (searchName.length >= 3) {
        for (const [hash, name] of allItems.entries()) {
            const words = name.split(/\s+/);
            const matched = words.some(word => word.startsWith(searchName));
            if (matched) {
                nameToHashCache.set(searchName, hash);
                return hash;
            }
        }
    }

    // 4. Try fuzzy contains match
    if (searchName.length >= 4) {
        for (const [hash, name] of allItems.entries()) {
            if (name.includes(searchName)) {
                nameToHashCache.set(searchName, hash);
                return hash;
            }
        }
    }

    return undefined;
}

/**
 * Find an item by hash across all locations
 * DIM STANDARD: Prioritize currently selected character, then others, then vault.
 */
export async function findItemByHash(itemHash: number): Promise<ItemSearchResult | null> {
    const store = useProfileStore.getState();
    const { characterInventories, characterEquipment, vaultInventory, selectedCharacterId } = store;

    const def = manifestService.getItem(itemHash);
    if (!def) return null;

    // 1. Check Selected Character FIRST (Priority 1: No transfer needed)
    if (selectedCharacterId) {
        const eq = characterEquipment[selectedCharacterId] || [];
        const inv = characterInventories[selectedCharacterId] || [];
        
        const foundEq = eq.find(i => i.itemHash === itemHash);
        if (foundEq) return { item: foundEq, definition: def, location: 'equipped', characterId: selectedCharacterId };
        
        const foundInv = inv.find(i => i.itemHash === itemHash);
        if (foundInv) return { item: foundInv, definition: def, location: 'inventory', characterId: selectedCharacterId };
    }

    // 2. Check Other Characters (Priority 2: 2 transfers needed)
    for (const [charId, equipment] of Object.entries(characterEquipment)) {
        if (charId === selectedCharacterId) continue;
        const found = equipment.find(item => item.itemHash === itemHash);
        if (found) return { item: found, definition: def, location: 'equipped', characterId: charId };
    }

    for (const [charId, inventory] of Object.entries(characterInventories)) {
        if (charId === selectedCharacterId) continue;
        const found = inventory.find(item => item.itemHash === itemHash);
        if (found) return { item: found, definition: def, location: 'inventory', characterId: charId };
    }

    // 3. Check Vault (Priority 3: 1 transfer needed)
    const vaultItem = vaultInventory.find(item => item.itemHash === itemHash);
    if (vaultItem) return { item: vaultItem, definition: def, location: 'vault' };

    return null;
}

/**
 * Find an exotic item by name across all locations
 */
export async function findItemByName(itemName: string): Promise<ItemSearchResult | null> {
    const targetHash = findHashByName(itemName);
    if (!targetHash) {
        return null;
    }

    // Use findItemByHash to avoid duplicating search logic
    return findItemByHash(targetHash);
}

/**
 * Find all copies of an item by name
 */
export async function findAllItemsByName(itemName: string): Promise<ItemSearchResult[]> {
    const store = useProfileStore.getState();
    const { characterInventories, characterEquipment, vaultInventory } = store;
    const results: ItemSearchResult[] = [];

    const targetHash = findHashByName(itemName);
    if (!targetHash) return results;

    const def = manifestService.getItem(targetHash);
    if (!def) return results;

    // Equipped
    for (const [charId, equipment] of Object.entries(characterEquipment)) {
        for (const item of equipment) {
            if (item.itemHash === targetHash) {
                results.push({ item, definition: def, location: 'equipped', characterId: charId });
            }
        }
    }

    // Inventory
    for (const [charId, inventory] of Object.entries(characterInventories)) {
        for (const item of inventory) {
            if (item.itemHash === targetHash) {
                results.push({ item, definition: def, location: 'inventory', characterId: charId });
            }
        }
    }

    // Vault
    for (const item of vaultInventory) {
        if (item.itemHash === targetHash) {
            results.push({ item, definition: def, location: 'vault' });
        }
    }

    return results;
}

/**
 * Find all exotic armor for a specific class
 */
export async function findAllExoticsForClass(
    guardianClass: GuardianClass,
    bucketChoice: 'armor' | 'weapon' = 'armor'
): Promise<ItemSearchResult[]> {
    const store = useProfileStore.getState();
    const { characterInventories, characterEquipment, vaultInventory } = store;
    const results: ItemSearchResult[] = [];

    const processItem = (item: DestinyItem, location: 'equipped' | 'inventory' | 'vault', charId?: string) => {
        const def = manifestService.getItem(item.itemHash);
        if (!def) return;

        // Check if Exotic
        // TierType 6 = Exotic
        if (def.inventory?.tierType !== 6) return;

        // Check Type (Armor vs Weapon)
        // ItemType 2 = Armor, 3 = Weapon
        const expectedType = bucketChoice === 'armor' ? 2 : 3;
        if (def.itemType !== expectedType) return;

        // Check Class (0=Titan, 1=Hunter, 2=Warlock, 3=Unknown)
        // If classType is 3, it's generic (like weapons or some armor), so we accept it unless it's class-specific armor
        if (def.classType !== 3 && def.classType !== guardianClass) return;

        results.push({ item, definition: def, location, characterId: charId });
    };

    // Equipped
    for (const [charId, equipment] of Object.entries(characterEquipment)) {
        equipment.forEach(item => processItem(item, 'equipped', charId));
    }

    // Inventory
    for (const [charId, inventory] of Object.entries(characterInventories)) {
        inventory.forEach(item => processItem(item, 'inventory', charId));
    }

    // Vault
    vaultInventory.forEach(item => processItem(item, 'vault'));

    return results;
}

/**
 * Check if player owns an item (in any location)
 */
export async function hasItem(itemName: string): Promise<boolean> {
    const result = await findItemByName(itemName);
    return result !== null;
}

/**
 * Clear the name-to-hash cache (call when manifest updates)
 */
export function clearItemSearchCache(): void {
    nameToHashCache.clear();
}

/**
 * Find all copies of an item by name (Synchronous version for internal services)
 */
export function findAllItemsByNameSync(itemName: string): ItemSearchResult[] {
    const store = useProfileStore.getState();
    const { characterInventories, characterEquipment, vaultInventory } = store;
    const results: ItemSearchResult[] = [];

    const targetHash = findHashByName(itemName);
    if (!targetHash) return results;

    const def = manifestService.getItem(targetHash);
    if (!def) return results;

    // Equipped
    for (const [charId, equipment] of Object.entries(characterEquipment)) {
        for (const item of equipment) {
            if (item.itemHash === targetHash) {
                results.push({ item, definition: def, location: 'equipped', characterId: charId });
            }
        }
    }

    // Inventory
    for (const [charId, inventory] of Object.entries(characterInventories)) {
        for (const item of inventory) {
            if (item.itemHash === targetHash) {
                results.push({ item, definition: def, location: 'inventory', characterId: charId });
            }
        }
    }

    // Vault
    for (const item of vaultInventory) {
        if (item.itemHash === targetHash) {
            results.push({ item, definition: def, location: 'vault' });
        }
    }

    return results;
}

export const itemSearchService = {
    findItemByHash,
    findItemByName,
    findAllItemsByName,
    findAllItemsByNameSync,
    findAllExoticsForClass,
    hasItem,
    clearItemSearchCache
};
