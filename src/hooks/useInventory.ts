import { useMemo, useCallback } from 'react';
import { useProfileStore } from '../store';

import { useManifestStore } from '../store';
import { manifestService } from '../services/bungie/manifest.service';

export function useInventory() {
    const { vaultInventory, characterInventories, characterEquipment, profilePlugSets, characterPlugSets } = useProfileStore();
    const { isLoaded: manifestLoaded } = useManifestStore();

    const allOwnedHashes = useMemo(() => {
        const hashes = new Set<number>();

        // Process vault
        vaultInventory.forEach(item => hashes.add(item.itemHash));

        // Process character inventories
        Object.values(characterInventories).forEach(inv => {
            inv.forEach(item => hashes.add(item.itemHash));
        });

        // Process equipped items
        Object.values(characterEquipment).forEach(equip => {
            equip.forEach(item => hashes.add(item.itemHash));
        });

        // Process Profile PlugSets (Account-wide unlocks like aspects/fragments)
        if (profilePlugSets) {
            Object.values(profilePlugSets).forEach(plugHashes => {
                plugHashes.forEach(h => hashes.add(h));
            });
        }

        // Process Character PlugSets
        if (characterPlugSets) {
            Object.values(characterPlugSets).forEach(charPlugs => {
                Object.values(charPlugs).forEach(plugHashes => {
                    plugHashes.forEach(h => hashes.add(h));
                });
            });
        }

        return hashes;
    }, [vaultInventory, characterInventories, characterEquipment, profilePlugSets, characterPlugSets]);

    const allOwnedNames = useMemo(() => {
        if (!manifestLoaded) return new Set<string>();

        const names = new Set<string>();
        const processHash = (hash: number) => {
            const name = manifestService.getName(hash);
            if (name) names.add(name);
        };

        allOwnedHashes.forEach(processHash);

        return names;
    }, [allOwnedHashes, manifestLoaded]);

    const isOwner = useCallback((hash: number) => {
        if (allOwnedHashes.has(hash)) return true;

        // Fallback: check by name (handles different hashes for same item, e.g. reissues)
        if (manifestLoaded) {
            const name = manifestService.getName(hash);
            if (name && allOwnedNames.has(name)) return true;
        }

        return false;
    }, [allOwnedHashes, allOwnedNames, manifestLoaded]);

    return {
        isOwner,
        ownedCount: allOwnedHashes.size,
        allOwnedHashes
    };
}
