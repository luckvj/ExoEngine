import { db } from './db/indexeddb.service';
import { useSavedBuildsStore, useProfileStore } from '../store';
import { transferService } from './bungie/transfer.service';
import { manifestService } from './bungie/manifest.service';
import { profileService } from './bungie/profile.service';
import { modService } from './bungie/mod.service';
import { SOCKET_CATEGORY_HASHES, STAT_HASHES } from '../config/bungie.config';
import type { BuildTemplate, SavedBuild, SynergyDefinition, ElementType, GuardianClass, Difficulty, Expansion } from '../types';
import { errorLog, warnLog } from '../utils/logger';

class BuildService {
    // Save a build to IndexedDB and update store
    async saveBuild(template: BuildTemplate, name?: string): Promise<SavedBuild> {
        // Ensure DB is initialized
        await db.init();

        const build: SavedBuild = {
            id: `build-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: name || template.name,
            template,
            createdAt: Date.now(),
            lastModified: Date.now(),
            tags: [],
        };

        await db.setSavedBuild(build);
        useSavedBuildsStore.getState().addBuild(build);
        return build;
    }

    // Load all saved builds from IndexedDB
    async loadSavedBuilds(): Promise<void> {
        useSavedBuildsStore.getState().setLoading(true);
        try {
            const builds = await db.getSavedBuilds();
            useSavedBuildsStore.getState().setBuilds(builds);
        } catch (error) {
            errorLog('Build', 'Failed to load saved builds:', error);
        } finally {
            useSavedBuildsStore.getState().setLoading(false);
        }
    }

    // Remove a build
    async deleteBuild(id: string): Promise<void> {
        await db.deleteSavedBuild(id);
        useSavedBuildsStore.getState().removeBuild(id);
    }

    // Convert synergy to build template for equipment
    synergyToTemplate(synergy: SynergyDefinition): BuildTemplate {
        return {
            id: synergy.id,
            name: synergy.name,
            element: synergy.element,
            guardianClass: synergy.guardianClass,
            requiredExpansion: synergy.requiredExpansion,
            exoticWeapon: synergy.exoticWeapon ? {
                hash: synergy.exoticWeapon.hash,
                name: synergy.exoticWeapon.name,
                slot: 1, // Default to energy, will be discovery-corrected if possible
            } : { hash: 0, name: 'None', slot: 0 },
            exoticArmor: synergy.exoticArmor,
            subclassConfig: {
                superHash: synergy.subclassNode.superHash || 0,
                aspects: synergy.subclassNode.aspectHashes,
                fragments: synergy.subclassNode.fragmentHashes || [],
                grenadeHash: synergy.subclassNode.grenadeHash,
                meleeHash: synergy.subclassNode.meleeHash,
                classAbilityHash: synergy.subclassNode.classAbilityHash,
            },
            playstyle: synergy.playstyle,
            difficulty: synergy.difficulty,
            armorMods: modService.suggestMods(synergy.element, synergy.difficulty),
            items: (synergy.recommendedWeapons || []).map(w => ({
                hash: w.hash,
                name: w.name
            }))
        };
    }



    // Equip a Synergy or Build
    async equip(
        build: BuildTemplate | SynergyDefinition,
        characterId: string,
        onProgress?: (step: string, progress: number) => void,
        transferOnly = false
    ): Promise<{ success: boolean; error?: string; equipped?: string[]; failed?: string[]; missing?: string[] }> {
        const template = 'subclassNode' in build ? this.synergyToTemplate(build as SynergyDefinition) : build as BuildTemplate;
        const buildName = template.name || 'Loadout';

        const result = await transferService.equipBuild(template, characterId, onProgress, transferOnly);

        if (!result) {
            return { success: false, error: "Equip failed to starting or returned no results." };
        }

        const missing = result.missing || [];
        const failed = result.failed || [];
        const equipped = result.equipped || [];

        if (result.success) {
            return { success: true, equipped };
        } else {
            let error = `Failed to equip "${buildName}".`;
            if (missing.length > 0) {
                error = `Cannot equip "${buildName}" - Missing: ${missing.join(', ')}`;
            } else if (failed.length > 0) {
                error = `"${buildName}" partially equipped. Failed items: ${failed.join(', ')}`;
            } else if (result.error) {
                error = result.error;
            }
            return {
                success: false,
                error,
                equipped,
                failed,
                missing
            };
        }
    }

    // Snapshot current state to in-game loadout slot
    async snapshotToInGameSlot(characterId: string, slotIndex: number): Promise<{ success: boolean; error?: string }> {
        return transferService.snapshotLoadout(characterId, slotIndex);
    }

    // Capture current character loadout as a BuildTemplate
    async captureLoadout(
        characterId: string,
        name: string,
        onProgress?: (step: string, progress: number) => void,
        fallbackElement?: ElementType
    ): Promise<BuildTemplate | null> {
        onProgress?.('Initializing capture...', 10);
        const state = useProfileStore.getState();
        const equipment = state.characterEquipment[characterId];

        if (!equipment) return null;

        onProgress?.('Analyzing equipment...', 20);

        // 1. Identify Items & Capture Sockets
        const items: BuildTemplate['items'] = [];
        let exoticWeapon: any = { hash: 0, name: 'None', slot: 0 };
        let exoticArmor: any = { hash: 0, name: 'None', slot: 0 };
        let subclassItem: any = null;
        let armorMods: number[] = [];
        let artifactPerks: number[] = [];

        onProgress?.('Fetching item detail sockets...', 40);

        // Pre-fetch all sockets in parallel for performance
        const itemSocketPromises = equipment.map(async (item) => {
            if (!item.itemInstanceId) return { item, sockets: [] };
            try {
                const sockets = await profileService.getItemSockets(item.itemInstanceId);
                return { item, sockets };
            } catch (e) {
                warnLog('Build', `Failed to fetch sockets for ${item.itemHash}`, e);
                return { item, sockets: [] };
            }
        });

        const itemsWithSockets = await Promise.all(itemSocketPromises);

        onProgress?.('Parsing item configurations and mods...', 60);

        for (const { item, sockets } of itemsWithSockets) {
            const def = manifestService.getItem(item.itemHash);
            if (!def) continue;

            const socketOverrides: { [socketIndex: number]: number } = {};

            // Parse Sockets
            if (sockets && Array.isArray(sockets) && def.sockets) {
                const getSocketCategory = (index: number) => {
                    const cats = def.sockets.socketCategories || (def.sockets as any).categories;
                    return cats?.find((c: any) => c.socketIndexes.includes(index))?.socketCategoryHash;
                };

                sockets.forEach((socket: any, index: number) => {
                    if (!socket.isEnabled || !socket.plugHash) return;

                    const catHash = getSocketCategory(index);
                    const plugDef = manifestService.getItem(socket.plugHash);
                    const plugName = plugDef?.name || '';

                    // Noise Filter: Skip known junk/placeholder plugs
                    const isNoise =
                        plugName.includes('Upgrade Armor') ||
                        plugName.includes('Empty Mod Socket') ||
                        plugName.includes('Empty Socket') ||
                        socket.plugHash === 3696633656;

                    if (isNoise) return;

                    // Logic for Armor Mods (DIM Category Check) OR Artifact Perks
                    const isArtifact = def.itemCategoryHashes?.includes(1378222069);
                    const isArmorMod = catHash === SOCKET_CATEGORY_HASHES.ARMOR_MODS ||
                        plugDef?.itemCategoryHashes?.includes(59) ||
                        plugName.includes('Mod');

                    if (isArmorMod || isArtifact) {
                        armorMods.push(socket.plugHash);
                    }

                    // Logic for Weapon Perks / Mods
                    if (catHash === SOCKET_CATEGORY_HASHES.WEAPON_PERKS || catHash === SOCKET_CATEGORY_HASHES.WEAPON_MODS) {
                        socketOverrides[index] = socket.plugHash;
                    }

                    // For Subclass, we capture everything relevant later, but good to have overrides ready
                    if (def.itemType === 16) {
                        socketOverrides[index] = socket.plugHash;
                        // Special check for Transcendence
                        if (catHash === SOCKET_CATEGORY_HASHES.TRANSCENDENCE) {
                            socketOverrides[index] = socket.plugHash;
                        }
                    }
                });
            }

            if (def.itemType === 16) { // Subclass
                subclassItem = { ...item, socketOverrides }; // Attach overrides
            } else if (def.isExotic) { // Exotic
                if (def.itemType === 2) {
                    exoticArmor = { hash: item.itemHash, name: def.name, slot: 2, socketOverrides };
                } else if (def.itemType === 3) {
                    exoticWeapon = { hash: item.itemHash, name: def.name, slot: 1, socketOverrides };
                }
            } else if (def.itemType === 2 || def.itemType === 3) {
                // Legendary Items
                items.push({
                    hash: item.itemHash,
                    name: def.name,
                    socketOverrides // Save the perks!
                });
            }
        }

        onProgress?.('Extracting subclass nodes...', 80);

        // 2. Subclass Config Extraction (from the captured overrides)
        const subclassConfig: NonNullable<BuildTemplate['subclassConfig']> = {
            subclassHash: subclassItem?.itemHash || 0,
            superHash: 0,
            aspects: [],
            fragments: [],
            grenadeHash: 0,
            meleeHash: 0,
            classAbilityHash: 0,
            jumpHash: 0
        };

        if (subclassItem && subclassItem.socketOverrides) {
            const def = manifestService.getItem(subclassItem.itemHash);
            if (def && def.sockets) {
                Object.entries(subclassItem.socketOverrides).forEach(([_indexStr, plugHash]) => {
                    const ph = plugHash as number;
                    const plugDef = manifestService.getRawDefinition('DestinyInventoryItemDefinition', ph);
                    if (!plugDef) return;

                    const plugCatId = plugDef.plug?.plugCategoryIdentifier || '';

                    // Use Manifest-based category detection (DIM Standard)
                    if (plugCatId.includes('supers')) subclassConfig.superHash = ph;
                    else if (plugCatId.includes('class_abilities')) subclassConfig.classAbilityHash = ph;
                    else if (plugCatId.includes('grenades')) subclassConfig.grenadeHash = ph;
                    else if (plugCatId.includes('melee')) subclassConfig.meleeHash = ph;
                    else if (plugCatId.includes('movement')) subclassConfig.jumpHash = ph;
                    else if (plugCatId.includes('aspects')) subclassConfig.aspects?.push(ph);
                    else if (plugCatId.includes('fragments')) subclassConfig.fragments?.push(ph);
                });
            }
        }

        onProgress?.('Capturing artifact perks...', 90);

        // 2. Artifact Perk Extraction (from progressions)
        const progressions = state.characterProgressions?.[characterId];
        if (progressions?.seasonalArtifact?.tiers) {
            progressions.seasonalArtifact.tiers.forEach(tier => {
                tier.items.forEach(item => {
                    if (item.isActive) {
                        artifactPerks.push(item.itemHash);
                    }
                });
            });
        }

        // 3. Derive Class & Element
        const character = state.characters.find(c => c.characterId === characterId);
        const guardianClass = character?.classType ?? 0;

        // 4. Capture Character Stats (Health/Resilience etc.)
        let stats: any = undefined;
        if (character?.stats) {
            stats = {
                mobility: character.stats[STAT_HASHES.MOBILITY] || 0,
                resilience: character.stats[STAT_HASHES.RESILIENCE] || 0,
                recovery: character.stats[STAT_HASHES.RECOVERY] || 0,
                discipline: character.stats[STAT_HASHES.DISCIPLINE] || 0,
                intellect: character.stats[STAT_HASHES.INTELLECT] || 0,
                strength: character.stats[STAT_HASHES.STRENGTH] || 0,
                total: Object.values(character.stats).reduce((a, b) => a + b, 0)
            };
        }

        const subclassDef = subclassConfig.subclassHash ? manifestService.getItem(subclassConfig.subclassHash) : null;
        let element: ElementType = fallbackElement || 'kinetic';
        if (subclassDef) {
            const damageType = (subclassDef as any).talentGrid?.hudDamageType || subclassDef.defaultDamageType || subclassDef.itemType;
            const damageTypeMap: Record<number, ElementType> = {
                1: 'kinetic',
                2: 'arc',
                3: 'solar',
                4: 'void',
                6: 'stasis',
                7: 'strand'
            };
            const detectedElement = damageTypeMap[damageType];
            if (detectedElement && detectedElement !== 'kinetic') {
                element = detectedElement;
            } else if (detectedElement === 'kinetic' && fallbackElement) {
                element = fallbackElement;
            } else if (!detectedElement) {
                element = 'prismatic';
            }

            // Special Case: Prismatic Check (Plug Category ID, Name, or Hardcoded Hash)
            const PRISMATIC_HASHES = [2946726027, 2603483315, 3170703816, 3893112950];

            if (
                PRISMATIC_HASHES.includes(subclassConfig.subclassHash || 0) ||
                (subclassDef as any).plug?.plugCategoryIdentifier?.includes('prismatic') ||
                subclassDef.name?.toLowerCase().includes('prismatic') ||
                subclassDef.itemTypeDisplayName?.toLowerCase().includes('prismatic')
            ) {
                element = 'prismatic';
            }
        }

        onProgress?.('Build captured!', 100);

        return {
            id: `captured-${Date.now()}`,
            name,
            element,
            guardianClass,
            requiredExpansion: 0 as unknown as Expansion,
            exoticWeapon,
            exoticArmor,
            subclassConfig,
            items,
            playstyle: 'Captured Loadout',
            difficulty: 'intermediate',
            armorMods,
            artifactPerks,
            stats
        };
    }

    // Export loadout to DIM-compatible JSON
    exportToJson(build: SavedBuild): string {
        const dimFormat = {
            id: build.id,
            name: build.name,
            classType: build.template.guardianClass,
            clearSpace: false,
            equipped: [
                // Exotics
                { hash: build.template.exoticWeapon?.hash || 0, socketOverrides: {} },
                { hash: build.template.exoticArmor?.hash || 0, socketOverrides: {} },
                // Subclass
                {
                    hash: build.template.subclassConfig?.subclassHash || build.template.subclassConfig?.superHash || 0,
                    socketOverrides: {} // We could map back from config -> socketOverrides but it's complex.
                    // DIM might accept just the hash for the subclass itself?
                },
                // All other items
                ...(build.template.items || []).map(i => ({
                    hash: i.hash || 0,
                    socketOverrides: i.socketOverrides || {}
                }))
            ].filter(i => (i.hash || 0) > 0),
            unequipped: [],
            parameters: {
                mods: build.template.armorMods || [],
                modsByBucket: {},
                exoticArmorHash: build.template.exoticArmor?.hash || 0,
                statConstraints: []
            }
        };

        return JSON.stringify(dimFormat, null, 2);
    }

    // Import loadout from DIM JSON
    async importFromJson(jsonString: string): Promise<SavedBuild> {
        const dimLoadout = JSON.parse(jsonString);

        // Map DIM format to ExoEngine BuildTemplate
        const template: BuildTemplate = {
            id: dimLoadout.id || `imported-${Date.now()}`,
            name: dimLoadout.name || 'Imported Loadout',
            element: 'solar' as ElementType,
            guardianClass: (dimLoadout.classType || 0) as GuardianClass,
            exoticWeapon: {
                hash: dimLoadout.equipped?.[0]?.hash || 0,
                name: 'Unknown',
                slot: 1
            },
            exoticArmor: {
                hash: dimLoadout.parameters?.exoticArmorHash || dimLoadout.equipped?.[1]?.hash || 0,
                name: 'Unknown',
                slot: 3
            },
            subclassConfig: {
                superHash: 0,
                aspects: [],
                fragments: []
            },
            armorMods: dimLoadout.parameters?.mods || [],
            playstyle: 'Imported',
            difficulty: 'intermediate' as Difficulty
        };

        const build: SavedBuild = {
            id: template.id,
            name: template.name,
            template,
            createdAt: Date.now(),
            lastModified: Date.now(),
            tags: ['imported']
        };

        await db.setSavedBuild(build);
        useSavedBuildsStore.getState().addBuild(build);

        return build;
    }

}

export const buildService = new BuildService();
