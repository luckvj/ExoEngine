import { manifestService } from './manifest.service';
import { transferService } from './transfer.service';
import { profileService } from './profile.service';
import { infoLog } from '../../utils/logger';
import { BUCKET_HASHES, SOCKET_CATEGORY_HASHES } from '../../config/bungie.config';
import type { DestinyItem, ItemInstance, ItemSockets } from '../../types';

export interface ModAssignment {
    itemInstanceId: string;
    socketIndex: number;
    modHash: number;
}

export class ModService {

    /**
     * Applies a list of mods to the character's equipped armor.
     */
    async applyArmorMods(characterId: string, mods: number[], onProgress: any, options?: { silent?: boolean }): Promise<void> {
        const state = (await import('../../store')).useProfileStore.getState();
        const equippedArmor = (state.characterEquipment?.[characterId] || []).filter(i =>
            [BUCKET_HASHES.HELMET, BUCKET_HASHES.GAUNTLETS, BUCKET_HASHES.CHEST_ARMOR, BUCKET_HASHES.LEG_ARMOR, BUCKET_HASHES.CLASS_ARMOR].includes(i.bucketHash)
        );

        if (equippedArmor.length === 0) return;

        // Fetch sockets for all armor
        const armorWithSockets = await Promise.all(equippedArmor.map(async item => ({
            item,
            instance: state.itemInstances[item.itemInstanceId!],
            sockets: await profileService.getItemSockets(item.itemInstanceId!)
        })));

        // Fit mods into available energy/sockets
        const { assignments } = this.fitMods(mods, armorWithSockets.filter(a => a.sockets && a.instance) as any);

        for (let i = 0; i < assignments.length; i++) {
            const a = assignments[i];

            // DIM Parity: Skip if already plugged to avoid unnecessary API calls
            const armorItem = armorWithSockets.find(aw => aw.item.itemInstanceId === a.itemInstanceId);
            const currentSocket = armorItem?.sockets.sockets.find((s: any) => s.socketIndex === a.socketIndex);
            if (currentSocket?.plugHash === a.modHash) {
                continue;
            }

            onProgress(`Mod ${i + 1}/${assignments.length}`, 90 + (i / assignments.length) * 10);
            const res = await transferService.insertSocketPlugFree(a.itemInstanceId, a.modHash, a.socketIndex, characterId, options);
            if (res.stop) {
                infoLog('Transfer', 'Stopping armor mod application due to location restriction');
                break;
            }

            // DIM Parity: Socket actions are intensive. 500ms settle interval matches DIM rate limits.
            await new Promise(r => setTimeout(r, 500));
        }
    }

    /**
     * Applies a subclass configuration (aspects, fragments, etc.)
     */
    async applySubclassConfiguration(subclass: DestinyItem, config: any, characterId: string, onProgress: any, options?: { silent?: boolean }): Promise<void> {
        if (!config || !subclass.itemInstanceId) return;

        onProgress('Configuring Subclass...', 85);

        // DIM Standard: Re-fetch the subclass item from the LATEST state to ensure we have current sockets
        const state = (await import('../../store')).useProfileStore.getState();
        const latestSubclass = state.getAllInventory().find(i => i.itemInstanceId === subclass.itemInstanceId);
        if (!latestSubclass || !latestSubclass.itemInstanceId) return;

        const itemDef = manifestService.getRawDefinition('DestinyInventoryItemDefinition', latestSubclass.itemHash);
        if (!itemDef?.sockets?.socketCategories || !itemDef.sockets.socketEntries) return;

        // Fetch current sockets to implement "Shuffled Sockets" logic (DIM Standard)
        const currentSockets = await profileService.getItemSockets(latestSubclass.itemInstanceId);
        if (!currentSockets) return;

        const overrides: Record<number, number> = {};

        // DIM Parity: Fragment Capacity Stat
        const FRAGMENT_SLOTS_STAT_HASH = 2855639344;

        const getFragmentCapacity = (aspectHashes: number[]) => {
            let capacity = 0;
            aspectHashes.forEach(h => {
                const def = manifestService.getRawDefinition('DestinyInventoryItemDefinition', h);
                const stat = def?.investmentStats?.find((s: any) => s.statTypeHash === FRAGMENT_SLOTS_STAT_HASH);
                if (stat) capacity += stat.value;
            });
            return capacity;
        };

        const getDefaultAbilityHash = (socketIndex: number) => {
            const entry = itemDef.sockets.socketEntries[socketIndex];
            if (entry?.singleInitialItemHash && entry.singleInitialItemHash !== 0) {
                return entry.singleInitialItemHash;
            }
            // Fallback to first plug in reusable plug set if available
            if (entry?.reusablePlugSetHash) {
                const plugSet = manifestService.getRawDefinition('DestinyPlugSetDefinition', entry.reusablePlugSetHash);
                return plugSet?.reusablePlugItems?.[0]?.plugItemHash || 0;
            }
            return 0;
        };

        // Helper to find socket indices for a category
        const findIndices = (categoryHashes: number[]) => {
            return categoryHashes.flatMap(h => {
                const cat = itemDef.sockets.socketCategories.find((c: any) => c.socketCategoryHash === h);
                return cat ? cat.socketIndexes : [];
            }).sort((a, b) => a - b);
        };

        const handleShuffledSockets = (socketIndices: number[], desiredHashes: number[]) => {
            const neededHashes = [...desiredHashes];
            const excessSockets: { index: number, currentHash: number | undefined }[] = [];

            if (!currentSockets.sockets) return;

            // 1. Identify which desired hashes are already plugged somewhere in these sockets
            socketIndices.forEach(idx => {
                const socket = currentSockets.sockets[idx];
                const currentHash = socket?.plugHash;

                const matchIdx = neededHashes.indexOf(currentHash || 0);
                if (matchIdx !== -1) {
                    // Already plugged! Keep it and remove from needed list
                    neededHashes.splice(matchIdx, 1);
                } else {
                    // This socket has something we don't want or is empty
                    excessSockets.push({ index: idx, currentHash });
                }
            });

            // 2. Plug the remaining needed hashes into the excess sockets, OR empty them
            excessSockets.forEach((excess, i) => {
                if (i < neededHashes.length) {
                    // Only apply if it's actually different from what's there
                    if (excess.currentHash !== neededHashes[i]) {
                        overrides[excess.index] = neededHashes[i];
                    }
                } else {
                    // DIM Parity: If no more hashes needed, ensure the socket is emptied
                    // if it currently has something that isn't the default/empty plug.
                    const defaultHash = getDefaultAbilityHash(excess.index);
                    if (defaultHash && excess.currentHash !== defaultHash) {
                        overrides[excess.index] = defaultHash;
                    }
                }
            });
        };

        // --- 1. Super, Abilities & Jump (Dynamic Whitelist Detection) ---
        const abilityIndices = findIndices([
            SOCKET_CATEGORY_HASHES.SUPER,
            SOCKET_CATEGORY_HASHES.ABILITIES,
            SOCKET_CATEGORY_HASHES.ABILITIES_IKORA
        ]);

        const abilityMapping = [
            { hash: config.superHash, name: 'supers' },
            { hash: config.classAbilityHash, name: 'class_abilities' },
            { hash: config.meleeHash, name: 'melee' },
            { hash: config.grenadeHash, name: 'grenades' },
            { hash: config.jumpHash || config.movementHash, name: 'movement' }
        ];

        abilityMapping.forEach((ability, i) => {
            let targetHash = ability.hash;

            // DIM Parity: Find indices for this specific ability
            const targetIndex = abilityIndices.find(idx => {
                if (overrides[idx]) return false;
                const entry = itemDef.sockets.socketEntries[idx];
                const socketType = manifestService.getRawDefinition('DestinySocketTypeDefinition', entry?.socketTypeHash);

                // If we have a hash, check whitelist. If not, we'll pick a fallback later.
                if (targetHash) {
                    const plugDef = manifestService.getRawDefinition('DestinyInventoryItemDefinition', targetHash);
                    return socketType?.plugWhitelist?.some((w: any) => w.categoryHash === plugDef?.plug?.plugCategoryHash);
                }

                // If no hash provided, this might be a candidate for default fallback
                // (Only for choice sockets like Jumps/Grenades)
                return i > 0; // Skip Super for generic fallback if missing
            });

            if (targetIndex !== undefined) {
                if (!targetHash) {
                    targetHash = getDefaultAbilityHash(targetIndex);
                }

                // DIM Parity: SKIP if already plugged to avoid unnecessary API calls and potential 500s
                const currentSocket = currentSockets.sockets[targetIndex];
                if (currentSocket?.plugHash === targetHash) {
                    return;
                }

                if (targetHash) {
                    overrides[targetIndex] = targetHash;
                }
            }
        });

        // --- 2. Aspects (Shuffled) ---
        const aspectIndices = findIndices([
            SOCKET_CATEGORY_HASHES.ASPECTS,
            SOCKET_CATEGORY_HASHES.ASPECTS_IKORA,
            SOCKET_CATEGORY_HASHES.ASPECTS_STRANGER,
            SOCKET_CATEGORY_HASHES.ASPECTS_NEOMUNA
        ]);
        if (config.aspects && aspectIndices.length > 0) {
            handleShuffledSockets(aspectIndices, config.aspects);
        }

        // --- 3. Fragments (Shuffled with Capacity Respect) ---
        const fragmentIndices = findIndices([
            SOCKET_CATEGORY_HASHES.FRAGMENTS,
            SOCKET_CATEGORY_HASHES.FRAGMENTS_IKORA,
            SOCKET_CATEGORY_HASHES.FRAGMENTS_STRANGER,
            SOCKET_CATEGORY_HASHES.FRAGMENTS_NEOMUNA
        ]);

        if (fragmentIndices.length > 0) {
            // DIM Parity: If config doesn't have aspects, fallback to currently equipped aspects for capacity check
            let aspectsToUse = config.aspects;
            if (!aspectsToUse || aspectsToUse.length === 0) {
                const aspectIndices = findIndices([
                    SOCKET_CATEGORY_HASHES.ASPECTS,
                    SOCKET_CATEGORY_HASHES.ASPECTS_IKORA,
                    SOCKET_CATEGORY_HASHES.ASPECTS_STRANGER,
                    SOCKET_CATEGORY_HASHES.ASPECTS_NEOMUNA
                ]);
                if (currentSockets?.sockets) {
                    aspectsToUse = aspectIndices
                        .map(idx => currentSockets.sockets[idx]?.plugHash)
                        .filter(Boolean) as number[];
                }
            }

            const capacity = getFragmentCapacity(aspectsToUse || []);
            const fragmentsToApply = (config.fragments || []).slice(0, capacity);
            handleShuffledSockets(fragmentIndices.slice(0, capacity), fragmentsToApply);
        }

        // Only apply if we actually have work to do
        if (Object.keys(overrides).length > 0) {
            // DIM Parity: Sequentially apply subclass overrides to prevent 500 errors
            const sortedIndices = Object.keys(overrides).map(Number).sort((a, b) => a - b);
            for (const idx of sortedIndices) {
                const res = await transferService.insertSocketPlugFree(subclass.itemInstanceId, overrides[idx], idx, characterId, options);
                if (res.stop) {
                    infoLog('Transfer', 'Stopping subclass configuration due to location restriction');
                    break;
                }
                await new Promise(r => setTimeout(r, 500));
            }
        }
    }

    /**
     * Calculates the energy cost of a mod
     */
    getModEnergyCost(modHash: number): number {
        const def = manifestService.getRawDefinition('DestinyInventoryItemDefinition', modHash);
        return def?.plug?.energyCost?.energyCost || 0;
    }

    /**
     * Checks if a mod can fit into a specific socket
     */
    canModFit(itemHash: number, modHash: number, socketIndex: number): boolean {
        const itemDef = manifestService.getRawDefinition('DestinyInventoryItemDefinition', itemHash);
        const modDef = manifestService.getRawDefinition('DestinyInventoryItemDefinition', modHash);

        if (!itemDef || !modDef) return false;

        // 1. Basic type check: Is it actually a mod?
        const isActuallyMod = modDef.itemCategoryHashes?.includes(59); // Armor Mod Category
        if (!isActuallyMod && modDef.itemType !== 19) return false; // Not a mod/plug

        // 2. Socket check: Does the item have this socket index?
        const entry = itemDef.sockets?.socketEntries?.[socketIndex];
        if (!entry) return false;

        // 3. Category check: Does the mod fit the socket category?
        const socketTypeHash = entry.socketTypeHash;
        const socketTypeDef = manifestService.getRawDefinition('DestinySocketTypeDefinition', socketTypeHash);

        // DIM Strategy: Check plugWhitelist
        const fitsWhitelist = socketTypeDef?.plugWhitelist?.some((w: any) =>
            modDef.plug?.plugCategoryHash === w.categoryHash
        );

        if (fitsWhitelist) return true;

        // Fallback: Check direct bucket/slot compatibility (e.g. Helmet mods on Helmet)
        const modPlugCategory = modDef.plug?.plugCategoryHash;
        // Map of PlugCategory to Bucket
        const pchToBucket: Record<number, number> = {
            136154068: BUCKET_HASHES.HELMET,
            3190852654: BUCKET_HASHES.GAUNTLETS,
            1599818818: BUCKET_HASHES.CHEST_ARMOR,
            2595058479: BUCKET_HASHES.LEG_ARMOR,
            4148197177: BUCKET_HASHES.CLASS_ARMOR,
        };

        if (pchToBucket[modPlugCategory] === itemDef.inventory?.bucketTypeHash) return true;

        return false;
    }

    /**
     * Fits a list of general mods into a set of armor pieces (Permutation Logic)
     * Ported logic from DIM's fitMostMods (simplified)
     */
    fitMods(
        mods: number[],
        items: { item: DestinyItem, instance: ItemInstance, sockets: ItemSockets }[]
    ): { assignments: ModAssignment[], unassigned: number[] } {
        const assignments: ModAssignment[] = [];
        const unassigned: number[] = [...mods];

        // Sort items by energy capacity available (Masterworked first)
        const sortedItems = [...items].sort((a, b) => {
            const capacityA = a.instance.energy?.energyCapacity || 0;
            const capacityB = b.instance.energy?.energyCapacity || 0;
            return capacityB - capacityA;
        });

        // 1. Assign Bucket-Specific Mods first (not handled here, assumed pre-filtered)

        // 2. Assign General Mods (Permutation Check)
        for (const modHash of mods) {
            const cost = this.getModEnergyCost(modHash);

            // Find best item to take this mod
            let bestItemIdx = -1;
            let bestSocketIdx = -1;

            for (let i = 0; i < sortedItems.length; i++) {
                const { item: armorItem, instance, sockets } = sortedItems[i];
                const energyLeft = (instance.energy?.energyCapacity || 0) - (instance.energy?.energyUsed || 0);

                if (instance?.energy && energyLeft >= cost) {
                    // Find armor mod socket
                    const armorModSocketIdx = sockets?.sockets?.findIndex(s =>
                        s.isEnabled &&
                        !assignments.some(a => a.itemInstanceId === armorItem.itemInstanceId && a.socketIndex === s.socketIndex)
                    );

                    if (armorModSocketIdx !== undefined && armorModSocketIdx !== -1) {
                        bestItemIdx = i;
                        bestSocketIdx = armorModSocketIdx;
                        break;
                    }
                }
            }

            if (bestItemIdx !== -1) {
                const item = sortedItems[bestItemIdx];
                assignments.push({
                    itemInstanceId: item.item.itemInstanceId!,
                    socketIndex: item.sockets.sockets[bestSocketIdx].socketIndex,
                    modHash
                });
                // Update temporary energy tracking
                if (item.instance.energy) {
                    item.instance.energy.energyUsed += cost;
                }

                // Remove from unassigned
                const idx = unassigned.indexOf(modHash);
                if (idx !== -1) unassigned.splice(idx, 1);
            }
        }

        return { assignments, unassigned };
    }

    /**
     * Validates if a total energy requirement is met for an item
     */
    isEnergyValid(instance: ItemInstance, additionalModHashes: number[]): boolean {
        const currentUsed = instance.energy?.energyUsed || 0;
        const capacity = instance.energy?.energyCapacity || 0;
        const additionalCost = additionalModHashes.reduce((acc, hash) => acc + this.getModEnergyCost(hash), 0);

        return (currentUsed + additionalCost) <= capacity;
    }

    /**
     * Suggests a set of "Meta" armor mods based on the build's element and playstyle.
     */
    suggestMods(element: string, difficulty: string): number[] {
        const mods: number[] = [];

        // 1. Helmet: Harmonic Siphon (Essential for Orbs)
        mods.push(3832366019);

        // 2. Arms: defaults (Firepower/Heavy Handed logic is complex, skipping for MVP)
        // Could add "Grenade Kickstart" if difficulty is hard?

        // 3. Chest: Resistance (Harmonic Resistance is 168072143 - verifiable?)
        // Let's rely on user to pick resist.

        // 4. Legs: Weapon Surge (Damage) + Scavenger (Ammo)
        const SURGE_MODS: Record<string, number> = {
            'void': 3467460423,
            'solar': 2319885414,
            'arc': 1834163303,
            'stasis': 2921714558,
            'strand': 3112965625,
            'prismatic': 3112965625, // Default to Strand for now (popular) or specific logic later
        };

        const surgeHash = SURGE_MODS[element.toLowerCase()];
        if (surgeHash) {
            mods.push(surgeHash); // 1x Surge
            if (difficulty === 'advanced') mods.push(surgeHash); // 2x Surge for hard content
        }

        // Harmonic Scavenger
        mods.push(877723168);

        // 5. Class Item: Time Dilation (Longer Surge) + Reaper (Orbs) + Bomber (Grenade)
        mods.push(1755737153); // Time Dilation
        mods.push(40751621);   // Reaper
        mods.push(4188291233); // Bomber

        return mods;
    }
}

export const modService = new ModService();
