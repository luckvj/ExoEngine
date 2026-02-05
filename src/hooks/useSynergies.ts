import { useMemo } from 'react';
import { useProfileStore } from '../store';
import { SYNERGY_DEFINITIONS } from '../constants/synergy-definitions';
import type { SynergyDefinition } from '../types';

export interface SynergyMatch {
    definition: SynergyDefinition;
    strength: number;
}

export function useSynergies() {
    const { characters, selectedCharacterId, characterEquipment } = useProfileStore();

    const activeSynergies = useMemo(() => {
        if (!selectedCharacterId || !characterEquipment[selectedCharacterId]) {
            return [];
        }

        const equipped = characterEquipment[selectedCharacterId];
        const character = characters.find(c => c.characterId === selectedCharacterId);

        if (!character) return [];

        const equippedHashes = equipped.map(i => i.itemHash);

        // Detection logic
        const matches: SynergyMatch[] = [];

        for (const synergy of SYNERGY_DEFINITIONS) {
            // 1. Check Class Match
            if (synergy.guardianClass !== character.classType) {
                continue;
            }

            // 2. Check Exotic Armor Match
            const hasExotic = equippedHashes.includes(synergy.exoticArmor.hash);

            // 3. Check Subclass Element Match
            // For now, we'll match if they have the exotic. 
            // Full subclass element detection requires manifest lookup of currently equipped subclass item.
            // We'll treat this as a "Potential" match if they have the exotic.

            if (hasExotic) {
                matches.push({
                    definition: synergy,
                    strength: 1.0
                });
            }
        }

        return matches;
    }, [selectedCharacterId, characterEquipment, characters]);

    return activeSynergies;
}
