/**
 * SynergyBuildOverlay Component
 *
 * Full-screen synergy build overlay that displays complete build information
 * matching the SavedBuildsPage and DIM loadout viewer layouts.
 * Shows: Super, all abilities, 2 aspects, all fragments, exotic armor & weapon.
 * Includes DIM link copy and Exo share functionality.
 */
import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { manifestService } from '../../services/bungie/manifest.service';
import { useManifestStore, useProfileStore, useUIStore } from '../../store';
import { SUBCLASS_HASHES } from '../../constants/item-hashes';
import type { DashboardSynergy } from '../../services/synergy-matcher.service';
import { type BuildTemplate, ElementType } from '../../types';
import { useToast } from '../common/Toast';
import { RichItemIcon } from '../common/RichItemIcon';
import { RichTooltip } from '../builder/RichTooltip';
import { categorizeMods } from '../../utils/loadout-mods.utils';
import { getBungieUrl } from '../../utils/url-helper';
import { loadoutLinkService, convertBuildToLoadoutShareData } from '../../services/bungie/loadout-link.service';
import './SynergyBuildOverlay.css';

// Hash lookup cache for abilities by name
const ABILITY_HASH_CACHE: Record<string, number> = {};

interface SynergyBuildOverlayProps {
    synergy: DashboardSynergy;
    onClose: () => void;
    onEquip?: (synergy: DashboardSynergy) => void;
}

// Helper to find item hash by name from player's inventory
function findItemHashByName(itemName: string): number | undefined {
    const searchName = itemName.toLowerCase().trim();
    const store = useProfileStore.getState();
    const { characterEquipment, characterInventories, vaultInventory } = store;

    const allHashes = new Set<number>();

    for (const equipment of Object.values(characterEquipment)) {
        for (const item of equipment) {
            allHashes.add(item.itemHash);
        }
    }

    for (const inventory of Object.values(characterInventories)) {
        for (const item of inventory) {
            allHashes.add(item.itemHash);
        }
    }

    for (const item of vaultInventory) {
        allHashes.add(item.itemHash);
    }

    for (const hash of allHashes) {
        const def = manifestService.getItem(hash);
        if (def?.displayProperties?.name?.toLowerCase() === searchName) {
            return hash;
        }
    }

    return undefined;
}

// Helper to look up static ability hashes from constants
function getStaticAbilityHash(name: string, classType: number | string, element: string): number | null {
    if (!name) return null;


    // Normalize class/element keys for lookup
    // classType comes as 0,1,2 or string from synergy
    let clsKey: 'TITAN' | 'HUNTER' | 'WARLOCK' | null = null;
    if (classType === 0 || classType === 'Titan') clsKey = 'TITAN';
    if (classType === 1 || classType === 'Hunter') clsKey = 'HUNTER';
    if (classType === 2 || classType === 'Warlock') clsKey = 'WARLOCK';
    // Prismatic specific logic if needed, but usually handled by element

    const eleKey = element.toUpperCase() as keyof typeof SUBCLASS_HASHES;
    if (!clsKey || !SUBCLASS_HASHES[eleKey]) return null;

    // Helper to normalize names to match constant keys
    // "Knock 'Em Down" -> "KNOCK_EM_DOWN"
    // "Marksman's Dodge" -> "MARKSMANS_DODGE"
    const normalizeKey = (str: string) => {
        return str.toLowerCase()
            .replace(/['’]/g, '') // Remove apostrophes
            .replace(/[^a-z0-9 ]/g, '') // Keep only alphanumeric and spaces
            .trim()
            .replace(/ /g, '_')
            .toUpperCase();
    };

    // Prismatic is special case structure in constants
    if (eleKey === 'PRISMATIC') {
        const prismaBranch = SUBCLASS_HASHES.PRISMATIC[clsKey];
        if (!prismaBranch) return null;

        const searchObj = (obj: any): number | null => {
            // key matching
            const cleanName = normalizeKey(name);

            // Direct lookup if structure matches
            if (typeof obj === 'object') {
                if (obj[cleanName]) return obj[cleanName];

                // Recursive search for flat keys
                for (const key in obj) {
                    const val = obj[key];
                    if (typeof val === 'number') {
                        if (key === cleanName) return val;
                    } else if (typeof val === 'object') {
                        // Check sub-sections like SUPER, JUMPS etc with direct key
                        if (val[cleanName]) return val[cleanName];
                    }
                }
            }
            return null;
        };
        const found = searchObj(prismaBranch);
        if (found) return found;

        // Also check fragments (shared) if not found in class branch?
        // Actually Prismatic Fragments are under PRISMATIC.FRAGMENTS (shared)
        if (SUBCLASS_HASHES.PRISMATIC.FRAGMENTS) {
            const cleanName = normalizeKey(name);
            if ((SUBCLASS_HASHES.PRISMATIC.FRAGMENTS as any)[cleanName]) {
                return (SUBCLASS_HASHES.PRISMATIC.FRAGMENTS as any)[cleanName];
            }
        }
        return null;
    }

    // Standard Subclasses
    const root = SUBCLASS_HASHES as any;
    const branch = root[eleKey]?.[clsKey];

    if (branch) {
        const cleanName = normalizeKey(name);

        // Direct lookup attempts
        if (branch.SUPER?.[cleanName]) return branch.SUPER[cleanName];
        if (branch.JUMPS?.[cleanName]) return branch.JUMPS[cleanName];
        if (branch.MELEE?.[cleanName]) return branch.MELEE[cleanName];
        if (branch.GRENADES?.[cleanName]) return branch.GRENADES[cleanName];
        if (branch.CLASS_ABILITIES?.[cleanName]) return branch.CLASS_ABILITIES[cleanName];

        // Aspects (might be shared or specific)
        if (branch.ASPECTS?.[cleanName]) return branch.ASPECTS[cleanName];

        // Fragments match check
        if (root[eleKey]?.FRAGMENTS?.[cleanName]) return root[eleKey].FRAGMENTS[cleanName];
    }

    return null;
}

// Helper to find ability hash by name from manifest (searches all plugs)
function findAbilityHashByName(name: string, searchType: 'super' | 'ability' | 'aspect' | 'fragment'): number | null {
    if (!name) return null;

    const cacheKey = `${searchType}-${name.toLowerCase()}`;
    if (ABILITY_HASH_CACHE[cacheKey]) {
        return ABILITY_HASH_CACHE[cacheKey];
    }

    const nameLower = name.toLowerCase().trim();
    const store = useProfileStore.getState();
    const { characterEquipment, itemInstances } = store;

    // Search through all character equipment for subclass abilities
    for (const equipment of Object.values(characterEquipment)) {
        for (const item of equipment) {
            const instance = item.itemInstanceId ? itemInstances[item.itemInstanceId] : null;
            if (instance?.sockets) {
                for (const socket of instance.sockets) {
                    if (!socket.plugHash) continue;
                    const plugDef = manifestService.getItem(socket.plugHash);
                    if (!plugDef?.displayProperties?.name) continue;

                    const plugName = plugDef.displayProperties.name.toLowerCase();
                    const category = plugDef.plug?.plugCategoryIdentifier?.toLowerCase() || '';

                    if (plugName === nameLower || plugName.includes(nameLower) || nameLower.includes(plugName)) {
                        let matches = false;
                        switch (searchType) {
                            case 'super':
                                matches = category.includes('super');
                                break;
                            case 'ability':
                                matches = category.includes('grenade') || category.includes('melee') ||
                                    category.includes('class_abilities') || category.includes('movement');
                                break;
                            case 'aspect':
                                matches = category.includes('aspects');
                                break;
                            case 'fragment':
                                matches = category.includes('fragments') || category.includes('facets');
                                break;
                        }

                        if (matches) {
                            ABILITY_HASH_CACHE[cacheKey] = socket.plugHash;
                            return socket.plugHash;
                        }
                    }
                }
            }
        }
    }

    return null;
}

// Subclass item hash lookup by class + element
const SUBCLASS_ITEM_HASHES: Record<string, number> = {
    '0-Arc': 2932390016, '0-Solar': 2550323932, '0-Void': 4178525824,
    '0-Stasis': 613647804, '0-Strand': 242419065, '0-Prismatic': 3450112461,
    '1-Arc': 2328211300, '1-Solar': 2240888816, '1-Void': 2453351420,
    '1-Stasis': 873720784, '1-Strand': 3785442599, '1-Prismatic': 1040198773,
    '2-Arc': 3168997075, '2-Solar': 3941205951, '2-Void': 2849050827,
    '2-Stasis': 3291545503, '2-Strand': 4204413574, '2-Prismatic': 2806388174,
};

export function SynergyBuildOverlay({ synergy, onClose, onEquip }: SynergyBuildOverlayProps) {
    const classNames = ['Titan', 'Hunter', 'Warlock'];
    const { success, error: showError } = useToast();
    const [screenshot, setScreenshot] = useState<string | null>(null);
    const [isLoreOpen, setIsLoreOpen] = useState(false);
    const [hoveredHash, setHoveredHash] = useState<number | null>(null);
    const [hoveredItemHash, setHoveredItemHash] = useState<number | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent) => {
        const { clientX, clientY } = e;
        const { innerWidth, innerHeight } = window;
        const x = (clientX / innerWidth) - 0.5;
        const y = (clientY / innerHeight) - 0.5;
        setMousePos({ x, y });
    };

    const { isLoaded: manifestLoaded } = useManifestStore();
    // const { selectedCharacterId, characterInventories } = useProfileStore();

    // Build data state
    const [buildData, setBuildData] = useState<{
        superHash: number;
        superIcon: string;
        superName: string;
        grenadeHash: number;
        grenadeIcon: string;
        grenadeName: string;
        meleeHash: number;
        meleeIcon: string;
        meleeName: string;
        classAbilityHash: number;
        classAbilityIcon: string;
        classAbilityName: string;
        jumpHash: number;
        jumpIcon: string;
        jumpName: string;
        aspects: Array<{ hash: number; icon: string; name: string }>;
        fragments: Array<{ hash: number; icon: string; name: string }>;
        weaponHash: number;
        weaponIcon: string;
        armorHash: number;
        armorIcon: string;
        transcendenceIcon?: string;
        transcendentAbilityHash?: number;
        transcendentAbilityIcon?: string;
        transcendentAbilityName?: string;
    }>({
        superHash: 0, superIcon: '', superName: '',
        grenadeHash: 0, grenadeIcon: '', grenadeName: '',
        meleeHash: 0, meleeIcon: '', meleeName: '',
        classAbilityHash: 0, classAbilityIcon: '', classAbilityName: '',
        jumpHash: 0, jumpIcon: '', jumpName: '',
        aspects: [],
        fragments: [],
        weaponHash: 0, weaponIcon: '',
        armorHash: 0, armorIcon: '',
    });

    // Convert synergy to BuildTemplate for link generation
    const convertSynergyToBuildTemplate = useCallback((): BuildTemplate => {
        const elementKey = (synergy.element as ElementType).charAt(0).toUpperCase() + (synergy.element as ElementType).slice(1).toLowerCase();
        const subclassLookupKey = `${synergy.classType}-${elementKey}`;
        const subclassHash = SUBCLASS_ITEM_HASHES[subclassLookupKey] || 0;

        return {
            id: `synergy-${Date.now()}`,
            name: synergy.buildName,
            element: synergy.element.toLowerCase(),
            guardianClass: synergy.classType,
            exoticWeapon: {
                hash: buildData.weaponHash || 0,
                name: synergy.weapon,
                slot: 1
            },
            exoticArmor: {
                hash: buildData.armorHash || 0,
                name: synergy.armor,
                slot: 0
            },
            subclassConfig: {
                subclassHash,
                superHash: buildData.superHash,
                aspects: buildData.aspects.map(a => a.hash).filter(h => h > 0),
                fragments: buildData.fragments.map(f => f.hash).filter(h => h > 0),
                grenadeHash: buildData.grenadeHash,
                meleeHash: buildData.meleeHash,
                classAbilityHash: buildData.classAbilityHash,
            },
            armorMods: [],
            artifactPerks: [],
            items: [],
            playstyle: synergy.description,
            difficulty: 'intermediate'
        } as BuildTemplate;
    }, [synergy, buildData]);

    // Share handlers
    const handleShareExo = useCallback(async () => {
        try {
            const template = convertSynergyToBuildTemplate();
            const shareData = convertBuildToLoadoutShareData(template); // Assuming convertBuildToLoadoutShareData is defined elsewhere
            const link = await loadoutLinkService.generateExoEngineLink(shareData); // Assuming loadoutLinkService is defined elsewhere
            await navigator.clipboard.writeText(link);
            success("ExoEngine Link copied to clipboard!");
        } catch (e) {
            showError("Failed to generate link");
        }
    }, [convertSynergyToBuildTemplate, success, showError]);

    const handleShareDIM = useCallback(() => {
        try {
            const template = convertSynergyToBuildTemplate();
            const shareData = convertBuildToLoadoutShareData(template); // Assuming convertBuildToLoadoutShareData is defined elsewhere
            const link = loadoutLinkService.generateDIMCompatibleLink(shareData); // Assuming loadoutLinkService is defined elsewhere
            navigator.clipboard.writeText(link);
            success("DIM Link copied to clipboard!");
        } catch (e) {
            showError("Failed to generate DIM link");
        }
    }, [convertSynergyToBuildTemplate, success, showError]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'a') setIsLoreOpen(v => !v);
            if (e.key.toLowerCase() === 'f' && onEquip) {
                onEquip(synergy);
                // Trigger global transmat beam for feedback when equipping from overlay
                useUIStore.getState().triggerGlobalTransmat('success');
            }
            if (e.key.toLowerCase() === 's') handleShareExo();
            if (e.key.toLowerCase() === 'd') handleShareDIM();
            if (e.key === 'Escape') onClose();
        };

        const handleRightClick = (e: MouseEvent) => {
            e.preventDefault();
            onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('contextmenu', handleRightClick);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('contextmenu', handleRightClick);
        };
    }, [onClose, onEquip, synergy, handleShareExo, handleShareDIM]);

    // Load all build data from manifest
    useEffect(() => {
        if (!manifestLoaded) return;

        async function loadBuildData() {
            const data: typeof buildData = {
                superHash: 0, superIcon: '', superName: '',
                grenadeHash: 0, grenadeIcon: '', grenadeName: '',
                meleeHash: 0, meleeIcon: '', meleeName: '',
                classAbilityHash: 0, classAbilityIcon: '', classAbilityName: '',
                jumpHash: 0, jumpIcon: '', jumpName: '',
                aspects: [],
                fragments: [],
                weaponHash: 0, weaponIcon: '',
                armorHash: 0, armorIcon: '',
            };

            // Find weapon and armor
            const weaponHash = synergy.weapon ? findItemHashByName(synergy.weapon) : undefined;
            const armorHash = synergy.armor ? findItemHashByName(synergy.armor) : undefined;

            if (weaponHash) {
                data.weaponHash = weaponHash;
                data.weaponIcon = manifestService.getIcon(weaponHash) || '';
                const weaponDef = manifestService.getItem(weaponHash);
                if (weaponDef?.screenshot) setScreenshot(weaponDef.screenshot);
            }

            if (armorHash) {
                data.armorHash = armorHash;
                data.armorIcon = manifestService.getIcon(armorHash) || '';
                if (!screenshot) {
                    const armorDef = manifestService.getItem(armorHash);
                    if (armorDef?.screenshot) setScreenshot(armorDef.screenshot);
                }
            }

            // Super
            const superHash = getStaticAbilityHash(synergy.super, synergy.classType, synergy.element) || findAbilityHashByName(synergy.super, 'super');
            if (superHash) {
                data.superHash = superHash;
                data.superIcon = manifestService.getIcon(superHash) || '';
                data.superName = synergy.super;
            }

            // Grenade
            const grenadeHash = getStaticAbilityHash(synergy.grenade, synergy.classType, synergy.element) || findAbilityHashByName(synergy.grenade, 'ability');
            if (grenadeHash) {
                data.grenadeHash = grenadeHash;
                data.grenadeIcon = manifestService.getIcon(grenadeHash) || '';
                data.grenadeName = synergy.grenade;
            }

            // Melee
            const meleeHash = getStaticAbilityHash(synergy.melee, synergy.classType, synergy.element) || findAbilityHashByName(synergy.melee, 'ability');
            if (meleeHash) {
                data.meleeHash = meleeHash;
                data.meleeIcon = manifestService.getIcon(meleeHash) || '';
                data.meleeName = synergy.melee;
            }

            // Class Ability
            const classAbilityHash = getStaticAbilityHash(synergy.classAbility, synergy.classType, synergy.element) || findAbilityHashByName(synergy.classAbility, 'ability');
            if (classAbilityHash) {
                data.classAbilityHash = classAbilityHash;
                data.classAbilityIcon = manifestService.getIcon(classAbilityHash) || '';
                data.classAbilityName = synergy.classAbility;
            }

            // Jump
            const jumpHash = getStaticAbilityHash(synergy.jump, synergy.classType, synergy.element) || findAbilityHashByName(synergy.jump, 'ability');
            if (jumpHash) {
                data.jumpHash = jumpHash;
                data.jumpIcon = manifestService.getIcon(jumpHash) || ''; // Manifest lookup handles icon
                data.jumpName = synergy.jump;
            }

            // Prismatic Transcendence
            if (synergy.element.toLowerCase() === 'prismatic') {
                data.transcendenceIcon = manifestService.getIcon(3976332159) || '';
                if (synergy.transcendentAbility) {
                    const transHash = findAbilityHashByName(synergy.transcendentAbility, 'ability');
                    if (transHash) {
                        data.transcendentAbilityHash = transHash;
                        data.transcendentAbilityIcon = manifestService.getIcon(transHash) || '';
                        data.transcendentAbilityName = synergy.transcendentAbility;
                    }
                }
            }

            // Aspects (always 2)
            for (const aspectName of synergy.aspects) {
                const aspectHash = getStaticAbilityHash(aspectName, synergy.classType, synergy.element) || findAbilityHashByName(aspectName, 'aspect');
                if (aspectHash) {
                    const icon = manifestService.getIcon(aspectHash) || '';
                    data.aspects.push({ hash: aspectHash, icon, name: aspectName });
                }
            }

            // Fragments (all of them)
            for (const fragmentName of synergy.fragments) {
                const fragmentHash = getStaticAbilityHash(fragmentName, synergy.classType, synergy.element) || findAbilityHashByName(fragmentName, 'fragment');
                if (fragmentHash) {
                    const icon = manifestService.getIcon(fragmentHash) || '';
                    data.fragments.push({ hash: fragmentHash, icon, name: fragmentName });
                }
            }

            setBuildData(data);
        }

        loadBuildData();
    }, [synergy, manifestLoaded]);

    // Mod distribution and rendering helpers

    const { renderCompactMods } = (() => {
        const renderCompactMods = (slotMods: number[], ornament: any = null, shader: any = null) => {
            const { mainStat, secondaryStat, others } = categorizeMods(slotMods);

            const renderCosmeticPod = (hash: number | null) => {
                const def = hash ? manifestService.getItem(hash) : null;
                if (!def) return <div className="mod-pod cosmetic-pod placeholder-pod" />;

                return (
                    <div key={hash} className="mod-pod cosmetic-pod" onMouseEnter={() => setHoveredItemHash(hash)} onMouseLeave={() => setHoveredItemHash(null)}>
                        <img src={getBungieUrl((def as any).displayProperties?.icon || '')} alt="" />
                    </div>
                );
            };

            const renderModPod = (hash: number) => {
                const def = manifestService.getItem(hash);
                if (!def) return null;
                return (
                    <div key={hash} className="mod-pod" onMouseEnter={() => setHoveredItemHash(hash)} onMouseLeave={() => setHoveredItemHash(null)}>
                        <img src={getBungieUrl((def as any).displayProperties?.icon || '')} alt="" />
                    </div>
                );
            };

            return (
                <div className="armor-mods-pod-grid">
                    {renderCosmeticPod(shader?.hash)}
                    {renderCosmeticPod(ornament?.hash)}
                    {mainStat && renderModPod(mainStat)}
                    {secondaryStat && renderModPod(secondaryStat)}
                    {others.map((h) => renderModPod(h))}
                </div>
            );
        };
        return { renderCompactMods };
    })();

    // Tooltip handlers
    const handleIconHover = (hash: number | null) => {
        setHoveredHash(hash);
    };

    const element = (synergy.element as ElementType).toLowerCase();

    // Get tooltip content
    return createPortal(
        <div
            className={`synergy-build-overlay synergy-build-overlay--${element}`}
            onMouseMove={handleMouseMove}
            style={{
                '--parallax-x': mousePos.x,
                '--parallax-y': mousePos.y
            } as any}
        >
            {/* Background */}
            <div className="synergy-build-overlay__bg">
                <div className="synergy-build-overlay__pattern" />
                {screenshot && (
                    <img src={screenshot} className="synergy-build-overlay__screenshot" alt="" />
                )}
                <div className="synergy-build-overlay__vignette" />
            </div>

            {/* Header */}
            <div className="synergy-build-overlay__header">
                <div className="synergy-build-overlay__title-group">
                    <h1 className="synergy-build-overlay__name">{synergy.buildName}</h1>
                    <div className="synergy-build-overlay__subtitle">
                        <span className={`element-badge element-badge--${element}`}>{synergy.element}</span>
                        <span>{classNames[synergy.classType]} • {synergy.subclassType}</span>
                    </div>
                </div>
            </div>

            {/* Main Content - Full 3-Column Build Layout */}
            <div className="synergy-build-overlay__content">
                {/* 1. Super Section (Column 1) */}
                <div className="build-section build-section--super">
                    {buildData.superIcon && (
                        <div
                            className="super-node-large"
                            onMouseEnter={() => handleIconHover(buildData.superHash)}
                            onMouseLeave={() => handleIconHover(null)}
                        >
                            <img src={buildData.superIcon} alt={buildData.superName} />
                        </div>
                    )}
                </div>

                {/* 2. Middle Section (Column 2) - Abilities, Aspects, Fragments, Stats */}
                <div className="build-section--middle">
                    <div className="build-section--middle__top-row">
                        {/* Abilities Section */}
                        <div className="node-section section-abilities">
                            <div className="node-section-header-prefixed">| ABILITIES</div>
                            <div className="node-section-content">
                                {buildData.classAbilityIcon && (
                                    <div
                                        className={`build-item element--${element}`}
                                        onMouseEnter={() => handleIconHover(buildData.classAbilityHash)}
                                        onMouseLeave={() => handleIconHover(null)}
                                    >
                                        <img src={buildData.classAbilityIcon} alt={buildData.classAbilityName} />
                                    </div>
                                )}
                                {buildData.jumpIcon && (
                                    <div
                                        className={`build-item element--${element}`}
                                        onMouseEnter={() => handleIconHover(buildData.jumpHash)}
                                        onMouseLeave={() => handleIconHover(null)}
                                    >
                                        <img src={buildData.jumpIcon} alt={buildData.jumpName} />
                                    </div>
                                )}
                                {buildData.grenadeIcon && (
                                    <div
                                        className={`build-item element--${element}`}
                                        onMouseEnter={() => handleIconHover(buildData.grenadeHash)}
                                        onMouseLeave={() => handleIconHover(null)}
                                    >
                                        <img src={buildData.grenadeIcon} alt={buildData.grenadeName} />
                                    </div>
                                )}
                                {buildData.meleeIcon && (
                                    <div
                                        className={`build-item element--${element}`}
                                        onMouseEnter={() => handleIconHover(buildData.meleeHash)}
                                        onMouseLeave={() => handleIconHover(null)}
                                    >
                                        <img src={buildData.meleeIcon} alt={buildData.meleeName} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Aspects Section */}
                        <div className="node-section section-aspects">
                            <div className="node-section-header-prefixed">| ASPECTS</div>
                            <div className="node-section-content">
                                {buildData.aspects.map((aspect: any, i: number) => (
                                    <div
                                        key={i}
                                        className={`build-item element--${element}`}
                                        onMouseEnter={() => handleIconHover(aspect.hash)}
                                        onMouseLeave={() => handleIconHover(null)}
                                    >
                                        <img src={aspect.icon} alt={aspect.name} />
                                    </div>
                                ))}
                                {/* Transcendence inline if Prismatic */}
                                {buildData.transcendenceIcon && (
                                    <div
                                        className="build-item element--prismatic"
                                        onMouseEnter={() => handleIconHover(3976332159)}
                                        onMouseLeave={() => handleIconHover(null)}
                                    >
                                        <img src={buildData.transcendenceIcon} alt="Transcendence" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="build-section--middle__bottom-row">
                        {/* Fragments Section */}
                        <div className="node-section section-fragments">
                            <div className="node-section-header-prefixed">| FRAGMENTS</div>
                            <div className="synergy-build-overlay__fragments-grid">
                                {buildData.fragments.map((fragment: any, i: number) => (
                                    <div
                                        key={i}
                                        className={`build-item build-item--fragment element--${element}`}
                                        onMouseEnter={() => handleIconHover(fragment.hash)}
                                        onMouseLeave={() => handleIconHover(null)}
                                    >
                                        <img src={fragment.icon} alt={fragment.name} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 3. Loadout & Gear Section (Moved from Column 3) */}
                    <div className="build-section--middle__gear-row">
                        <div className="node-section section-gear">
                            <div className="node-section-header-prefixed">| LOADOUT & GEAR</div>
                            <div className="synergy-build-overlay__gear-horizontal-grid">
                                {/* Exotic Weapon */}
                                {buildData.weaponIcon && (
                                    <div
                                        className="gear-item-horizontal"
                                        onMouseEnter={() => setHoveredItemHash(buildData.weaponHash || null)}
                                        onMouseLeave={() => setHoveredItemHash(null)}
                                    >
                                        <RichItemIcon
                                            hash={buildData.weaponHash || 0}
                                            instance={{ state: 4 }}
                                        />
                                        <div className="gear-item-info">
                                            <span className="build-item__label--compact">{synergy.weapon}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Exotic Armor */}
                                {buildData.armorHash > 0 && (
                                    <div
                                        className="gear-item-horizontal"
                                        onMouseEnter={() => setHoveredItemHash(buildData.armorHash || null)}
                                        onMouseLeave={() => setHoveredItemHash(null)}
                                    >
                                        <RichItemIcon
                                            hash={buildData.armorHash || 0}
                                            instance={{ state: 4 }}
                                        />
                                        <div className="gear-item-info">
                                            <span className="build-item__label--compact">{synergy.armor}</span>
                                            {(synergy as any).armorMods && (synergy as any).armorMods.length > 0 && renderCompactMods((synergy as any).armorMods)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Build Description Panel */}
            <div className={`synergy-build-overlay__lore-panel ${isLoreOpen ? 'synergy-build-overlay__lore-panel--open' : ''}`}>
                <div className="lore-panel__header">
                    <h2 className="lore-panel__title">Build Strategy</h2>
                </div>
                <div className="lore-panel__content">
                    {synergy.description}
                </div>
            </div>


            {/* Tooltip */}
            {(hoveredHash || hoveredItemHash) && (
                <RichTooltip item={{ hash: (hoveredHash || hoveredItemHash)! }} />
            )}
        </div>,
        document.body
    );
}

export default SynergyBuildOverlay;
