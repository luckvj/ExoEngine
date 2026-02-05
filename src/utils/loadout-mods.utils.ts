import { manifestService } from '../services/bungie/manifest.service';
import type { LoadoutShareData } from '../services/bungie/loadout-link.service';

export interface ModGroups {
    helmet: number[];
    arms: number[];
    chest: number[];
    legs: number[];
    classItem: number[];
    general: number[];
}

export interface ArmorCosmetic {
    shader?: number;
    ornament?: number;
}

export interface ArmorCosmetics {
    helmet: ArmorCosmetic;
    arms: ArmorCosmetic;
    chest: ArmorCosmetic;
    legs: ArmorCosmetic;
    classItem: ArmorCosmetic;
    general: ArmorCosmetic;
}

const BUCKET_TO_SLOT: Record<number, keyof ModGroups> = {
    3448274439: 'helmet',
    3551918588: 'arms',
    14239492: 'chest',
    20886954: 'legs',
    1585787867: 'classItem'
};

export interface CategorizedMods {
    health: number[];
    melee: number[];
    grenade: number[];
    super: number[];
    class: number[];
    weapon: number[];
    other: number[];
}

export const classifyMod = (hash: number) => {
    const def = manifestService.getItem(hash) as any;
    if (!def) return 'other';

    const name = (def.displayProperties?.name || "").toLowerCase();
    const plugCat = (def.plug?.plugCategoryIdentifier || "").toLowerCase();
    const description = (def.displayProperties?.description || "").toLowerCase();
    const typeName = (def.itemTypeDisplayName || "").toLowerCase();

    // 1. Health/Survival (Resil, Recov, Orbs for Health, Damage Reduction)
    if (name.includes("resilience") || name.includes("recovery") ||
        name.includes("recuperation") || name.includes("better already") ||
        name.includes("siphon") || description.includes("orb of power") ||
        name.includes("resistance") || plugCat.includes("resistance") ||
        name.includes("absolution") || name.includes("better already")) {
        return "health";
    }

    // 2. Melee (Strength, Melee energy, Impact Induction)
    if (name.includes("strength") || name.includes("melee") ||
        name.includes("impact induction") || name.includes("outreach") ||
        name.includes("heavy handed") || name.includes("focusing strike")) {
        return "melee";
    }

    // 3. Grenade (Discipline, Grenade energy, Firepower, Bomber)
    if (name.includes("discipline") || name.includes("grenade") ||
        name.includes("firepower") || name.includes("bomber") ||
        name.includes("bolstering detonation") || name.includes("innervation") ||
        name.includes("momentum transfer")) {
        return "grenade";
    }

    // 4. Super (Intellect, Super energy, Ashes to Assets, Hands-on)
    if (name.includes("intellect") || name.includes("super") ||
        name.includes("ashes to assets") || name.includes("hands-on") ||
        name.includes("dynamo") || name.includes("font of wisdom")) {
        return "super";
    }

    // 5. Class Ability (Mobility, Class energy, Reaper, Utility Kickstart)
    if (name.includes("mobility") || name.includes("class") ||
        name.includes("utility") || name.includes("reaper") ||
        name.includes("distribution")) {
        return "class";
    }

    // 6. Weapon Performance (Loaders, Dex, Scavenger, Holster, Surge, Targeting)
    if (name.includes("loader") || name.includes("dexterity") ||
        name.includes("scavenger") || name.includes("holster") ||
        name.includes("surge") || name.includes("targeting") ||
        name.includes("unflinching") || typeName.includes("loader") ||
        typeName.includes("dexterity") || name.includes("aim") ||
        name.includes("reload") || name.includes("steady") ||
        name.includes("handling")) {
        return "weapon";
    }

    return "other";
};

/**
 * Categorizes and sorts armor mods for the fixed slot layout.
 * Returns:
 * - mainStat: +10/+5 stat mod
 * - secondaryStat: Artifice/Font/Stat combo mod
 * - others: Slot-specific and remaining mods
 */
export function categorizeMods(modHashes: number[]): {
    mainStat: number | null;
    secondaryStat: number | null;
    others: number[];
} {
    let mainStat: number | null = null;
    let secondaryStat: number | null = null;
    const others: number[] = [];

    // Use a Set to prevent duplicates from the input
    const uniqueHashes = Array.from(new Set(modHashes));

    uniqueHashes.forEach(hash => {
        const def = manifestService.getItem(hash) as any;
        if (!def) return;

        const cat = (def.plug?.plugCategoryIdentifier || "").toLowerCase();
        const name = (def.displayProperties?.name || "").toLowerCase();
        const typeName = (def.itemTypeDisplayName || "").toLowerCase();

        // STRICT COSMETIC FILTER: Do not allow any cosmetics in the gameplay mod list
        const isCosmetic = cat.includes('shader') || cat.includes('appearance') || cat.includes('ornament') ||
            cat.includes('skins') || typeName.includes('shader') || typeName.includes('ornament');
        if (isCosmetic) return;

        // 1. Main Stat Mod (+10 / +5)
        if (cat.includes('armor_stats') && !cat.includes('artifice')) {
            if (!mainStat) mainStat = hash;
            else others.push(hash);
        }
        // 2. Secondary Stat Mod (Artifice / Font / Combo)
        else if (cat.includes('artifice') || name.includes('font of') || cat.includes('.stat.')) {
            if (!secondaryStat) secondaryStat = hash;
            else others.push(hash);
        }
        // 3. Others
        else {
            others.push(hash);
        }
    });

    // Sort others by name for stability
    others.sort((a, b) => {
        const nameA = (manifestService.getItem(a) as any)?.displayProperties?.name?.toLowerCase() || "";
        const nameB = (manifestService.getItem(b) as any)?.displayProperties?.name?.toLowerCase() || "";
        return nameA.localeCompare(nameB);
    });

    return { mainStat, secondaryStat, others };
}

/**
 * Distributes mods from a loadout across armor pieces AND categorizes them by theme
 * Extracted from LoadoutDisplay.tsx to be reusable
 */
export function distributeLoadoutMods(
    loadout: LoadoutShareData,
    armor: Record<string, any>
): { modGroups: ModGroups; armorCosmetics: ArmorCosmetics; themedMods: CategorizedMods } {
    const armorCosmetics: ArmorCosmetics = {
        helmet: {},
        arms: {},
        chest: {},
        legs: {},
        classItem: {},
        general: {}
    };

    const modGroups: ModGroups = {
        helmet: [],
        arms: [],
        chest: [],
        legs: [],
        classItem: [],
        general: []
    };

    const themedMods: CategorizedMods = {
        health: [],
        melee: [],
        grenade: [],
        super: [],
        class: [],
        weapon: [],
        other: []
    };

    // Track how many of each mod we've assigned vs how many we need
    const goalCounts = new Map<number, number>();
    if (loadout.parameters?.mods) {
        loadout.parameters.mods.forEach(h => goalCounts.set(h, (goalCounts.get(h) || 0) + 1));
    }

    const currentCounts = new Map<number, number>();

    // Track occupancy to balance general mods
    const slotOccupancy: Record<string, number> = {
        helmet: 0,
        arms: 0,
        chest: 0,
        legs: 0,
        classItem: 0
    };

    const trackMod = (hash: number, slot: string, socketIndex?: number) => {
        currentCounts.set(hash, (currentCounts.get(hash) || 0) + 1);
        const def = manifestService.getItem(hash) as any;
        const plugCat = (def?.plug?.plugCategoryIdentifier || '').toLowerCase();
        const typeName = (def?.itemTypeDisplayName || '').toLowerCase();

        const isShader = plugCat.includes('shader') || typeName.includes('shader') || socketIndex === 5;
        const isOrnament = plugCat.includes('ornament') || plugCat.includes('appearance') || plugCat.includes('skins') || typeName.includes('ornament') || socketIndex === 6;

        const isGameplayMod =
            plugCat.includes('enhancements') ||
            plugCat.includes('armor_stats') ||
            plugCat.includes('armor_mods');

        const isSubclassItem =
            plugCat.includes('fragments') ||
            plugCat.includes('aspects') ||
            plugCat.includes('abilities') ||
            plugCat.includes('supers') ||
            plugCat.includes('plugs.subclass') ||
            typeName.includes('fragment') ||
            typeName.includes('aspect') ||
            def?.itemCategoryHashes?.includes(1313488945) ||
            def?.itemCategoryHashes?.includes(764703411);

        if (isSubclassItem) return;

        if ((isShader || isOrnament) && !isGameplayMod) {
            const cosmetic = (armorCosmetics as any)[slot];
            if (cosmetic) {
                if (isShader) cosmetic.shader = hash;
                else if (isOrnament) cosmetic.ornament = hash;
            }
        } else {
            (modGroups as any)[slot]?.push(hash);
            if (slotOccupancy[slot] !== undefined) {
                slotOccupancy[slot]++;
            }
            // Add to themed classification
            const theme = classifyMod(hash);
            themedMods[theme as keyof CategorizedMods].push(hash);
        }
    };

    // Step 0: Identify General/Artifice mods that should be balanced
    const isModBalanced = (hash: number) => {
        const def = manifestService.getItem(hash) as any;
        if (!def) return true;
        const plugCat = (def.plug?.plugCategoryIdentifier || "").toLowerCase();
        const typeName = (def.itemTypeDisplayName || "").toLowerCase();
        const name = (def.displayProperties?.name || def?.name || '').toLowerCase();

        // Cosmetics (Shaders/Ornaments) should NEVER be balanced, they belong to the item
        if (plugCat.includes('shader') || plugCat.includes('appearance') || plugCat.includes('ornament') ||
            plugCat.includes('skins') || typeName.includes('shader') || typeName.includes('ornament')) {
            return false;
        }

        // Stat mods and Artifice mods are always candidates for balancing
        if (plugCat.includes('armor_stats') || plugCat.includes('artifice') ||
            name.includes('resilience') || name.includes('recovery') ||
            name.includes('discipline') || name.includes('strength') ||
            name.includes('intellect') || name.includes('mobility') ||
            name === 'melee mod' || name === 'armor charge mod' ||
            name.includes('/ -') || name.includes('+class')) {
            return true;
        }

        // Seasonal mods/Artifact mods are often general too
        if (plugCat.includes('seasonal') || plugCat.includes('artifact')) return true;

        // If it specifically targets a slot, keep it there
        if (plugCat.includes('head') || plugCat.includes('helmet') ||
            plugCat.includes('arms') || plugCat.includes('gauntlets') ||
            plugCat.includes('chest') || plugCat.includes('plate') || plugCat.includes('vest') ||
            plugCat.includes('legs') || plugCat.includes('boots') ||
            plugCat.includes('class') || plugCat.includes('cloak') || plugCat.includes('bond') || plugCat.includes('mark')) {
            return false;
        }

        return false; // Default to specific if unsure (better to stay on item than float away)
    };

    const pendingBalanceMods: number[] = [];

    // Step 1: Process socketOverrides from armor items
    Object.entries(armor).forEach(([slot, item]) => {
        if (item && item.socketOverrides) {
            Object.entries(item.socketOverrides).forEach(([idxStr, hash]) => {
                const modHash = Number(hash);
                const idx = parseInt(idxStr);
                if (modHash && modHash !== 3696633656) {
                    const def = manifestService.getItem(modHash);
                    if (def && (def.itemType === 1 || def.itemType === 19 || def.itemType === 24 || def.itemType === 11 || def.plug?.plugCategoryIdentifier)) {
                        if (isModBalanced(modHash)) {
                            pendingBalanceMods.push(modHash);
                            // We don't track it yet, we just note we have it
                            currentCounts.set(modHash, (currentCounts.get(modHash) || 0) + 1);
                        } else {
                            trackMod(modHash, slot, idx);
                        }
                    }
                }
            });
        }
    });

    // Step 2: Process modsByBucket
    if (loadout.parameters?.modsByBucket) {
        for (const [bucketStr, mods] of Object.entries(loadout.parameters.modsByBucket)) {
            const bucketHash = parseInt(bucketStr);
            const slot = BUCKET_TO_SLOT[bucketHash];
            if (Array.isArray(mods)) {
                mods.forEach(hash => {
                    if (isModBalanced(hash)) {
                        pendingBalanceMods.push(hash);
                        currentCounts.set(hash, (currentCounts.get(hash) || 0) + 1);
                    } else {
                        trackMod(hash, slot || 'general');
                    }
                });
            }
        }
    }

    // Step 2.5: Distribute collected "Balanceable" mods
    const armorSlots = ['helmet', 'arms', 'chest', 'legs', 'classItem'];
    pendingBalanceMods.forEach(hash => {
        // Find least occupied slot that has an armor piece
        let bestSlot = 'general';
        let minMods = Infinity;

        for (const slotName of armorSlots) {
            if (!armor[slotName]) continue;

            // Check occupancy
            if (slotOccupancy[slotName] < minMods) {
                minMods = slotOccupancy[slotName];
                bestSlot = slotName;
            }
        }

        // Actually track it to the best slot (ignoring the 'id' part of trackMod to avoid double currentCounts)
        (modGroups as any)[bestSlot]?.push(hash);
        if (slotOccupancy[bestSlot] !== undefined) slotOccupancy[bestSlot]++;
        const theme = classifyMod(hash);
        themedMods[theme as keyof CategorizedMods].push(hash);
    });

    // Step 3: Distribute remaining mods from the goal list (from loadout.parameters.mods)
    goalCounts.forEach((goal, hash) => {
        const current = currentCounts.get(hash) || 0;
        const remaining = goal - current;

        if (remaining <= 0) return;

        const def = manifestService.getItem(hash) as any;
        if (!def) {
            for (let i = 0; i < remaining; i++) trackMod(hash, 'general');
            return;
        }

        let targetSlot = 'general';
        if (!isModBalanced(hash)) {
            const plugCat = (def.plug?.plugCategoryIdentifier || '').toLowerCase();
            if (plugCat.includes('head') || plugCat.includes('helmet')) targetSlot = 'helmet';
            else if (plugCat.includes('arms') || plugCat.includes('gauntlets')) targetSlot = 'arms';
            else if (plugCat.includes('chest') || plugCat.includes('plate') || plugCat.includes('vest')) targetSlot = 'chest';
            else if (plugCat.includes('legs') || plugCat.includes('boots')) targetSlot = 'legs';
            else if (plugCat.includes('class') || plugCat.includes('cloak') || plugCat.includes('bond')) targetSlot = 'classItem';
        }

        if (targetSlot !== 'general') {
            for (let i = 0; i < remaining; i++) trackMod(hash, targetSlot);
        } else {
            for (let i = 0; i < remaining; i++) {
                let bestSlot = 'general';
                let minMods = Infinity;

                for (const slotName of armorSlots) {
                    if (!armor[slotName]) continue;
                    if (slotOccupancy[slotName] < minMods) {
                        minMods = slotOccupancy[slotName];
                        bestSlot = slotName;
                    }
                }
                trackMod(hash, bestSlot);
            }
        }
    });

    return { modGroups, armorCosmetics, themedMods };
}
