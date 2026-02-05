import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { manifestService } from '../services/bungie/manifest.service';
import { loadoutLinkService } from '../services/bungie/loadout-link.service';
import { buildService } from '../services/build.service';
import type { LoadoutShareData } from '../services/bungie/loadout-link.service';
import { BUCKET_HASHES } from '../config/bungie.config';
import { getBungieUrl } from '../utils/url-helper';
import { LoadingScreen } from '../components/common/Loader';
import { SubclassNode } from '../components/builder/SubclassNode';
import { RichTooltip } from '../components/builder/RichTooltip';
import { distributeLoadoutMods, categorizeMods } from '../utils/loadout-mods.utils';
import { errorLog } from '../utils/logger';
import { RichItemIcon } from '../components/common/RichItemIcon';
import { NamingModal } from '../components/common/NamingModal';
import './DIMLoadoutViewerPage.css';

const ELEMENT_NAMES: Record<number, string> = {
    1: 'kinetic',
    2: 'arc',
    3: 'solar',
    4: 'void',
    6: 'stasis',
    7: 'strand',
};

const CLASS_NAMES: Record<number, string> = {
    0: 'Titan',
    1: 'Hunter',
    2: 'Warlock',
};

const PRISMATIC_HASHES = [2946726027, 2603483315, 3170703816, 3893112950];

export function DIMLoadoutViewerPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loadout, setLoadout] = useState<LoadoutShareData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isLoreOpen, setIsLoreOpen] = useState(false);
    const [isUiVisible, setIsUiVisible] = useState(true);
    const [hoveredItemHash, setHoveredItemHash] = useState<number | null>(null);
    const [isNamingModalOpen, setIsNamingModalOpen] = useState(false);

    // Notification banner state
    const [notification, setNotification] = useState<string | null>(null);
    const [notificationTimeout, setNotificationTimeout] = useState<NodeJS.Timeout | null>(null);

    // Parallax background ref and mouse tracking
    const bgRef = useRef<HTMLDivElement>(null);
    const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

    // Show notification banner
    const showNotification = (message: string) => {
        if (notificationTimeout) clearTimeout(notificationTimeout);
        setNotification(message);
        const timeout = setTimeout(() => setNotification(null), 2500);
        setNotificationTimeout(timeout);
    };

    useEffect(() => {
        const loadDIMLoadout = async () => {
            try {
                const url = searchParams.get('url');
                if (!url) {
                    setError('No DIM link provided. Please paste a DIM link.');
                    setLoading(false);
                    return;
                }

                const loadoutData = await loadoutLinkService.parseLoadoutLink(url);
                setLoadout(loadoutData);
                setLoading(false);
            } catch (err) {
                errorLog('DIMLoadoutViewer', 'Error:', err);
                setError(err instanceof Error ? err.message : 'Failed to load DIM loadout');
                setLoading(false);
            }
        };

        loadDIMLoadout();
    }, [searchParams]);

    // Keyboard shortcuts
    useEffect(() => {
        const handler = async (e: KeyboardEvent) => {
            const activeEl = document.activeElement;
            const isTyping = activeEl && (
                activeEl.tagName === 'INPUT' ||
                activeEl.tagName === 'TEXTAREA' ||
                (activeEl as HTMLElement).isContentEditable
            );

            if (isTyping) return;

            // A - Toggle lore/details panel
            if (e.key === 'a' || e.key === 'A') {
                setIsLoreOpen(p => !p);
            }
            // CTRL - Toggle UI visibility
            if (e.key === 'Control') {
                setIsUiVisible(p => !p);
            }
            // ESC - Back to agent
            if (e.key === 'Escape') {
                navigate('/agent-wake');
            }
            // D - Save build
            if (e.key === 'd' || e.key === 'D') {
                await handleSaveBuild();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [navigate, loadout]);

    // Normalized values for parallax
    const handleMouseMove = (e: React.MouseEvent) => {
        const { clientX, clientY } = e;
        const { innerWidth, innerHeight } = window;
        const x = (clientX / innerWidth) - 0.5;
        const y = (clientY / innerHeight) - 0.5;
        setMousePos({ x, y });
    };

    const handleSaveBuild = async () => {
        if (!loadout) return;
        setIsNamingModalOpen(true);
    };

    const confirmSaveBuild = async (buildName: string) => {
        if (!loadout) return;
        setIsNamingModalOpen(false);

        try {

            // Find subclass for element detection
            const subclassItem = loadout.equipped.find(item => {
                const def = manifestService.getItem(item.hash);
                return def?.inventory?.bucketTypeHash === BUCKET_HASHES.SUBCLASS;
            });

            const subclassDef = subclassItem ? manifestService.getItem(subclassItem.hash) : null;
            const damageType = subclassDef?.talentGrid?.hudDamageType || 3;

            // Map damage type to element
            const damageTypeMap: Record<number, string> = {
                1: 'kinetic',
                2: 'arc',
                3: 'solar',
                4: 'void',
                6: 'stasis',
                7: 'strand'
            };
            let element = damageTypeMap[damageType] || 'kinetic';

            if (
                PRISMATIC_HASHES.includes(subclassItem?.hash || 0) ||
                (subclassDef as any)?.plug?.plugCategoryIdentifier?.toLowerCase()?.includes('prismatic') ||
                subclassDef?.displayProperties?.name?.toLowerCase().includes('prismatic') ||
                (subclassDef as any)?.itemTypeDisplayName?.toLowerCase()?.includes('prismatic')
            ) {
                element = 'prismatic';
            }

            // Extract subclass socket overrides
            const getSocketHash = (socketIndex: number) => {
                if (!subclassItem?.socketOverrides) return undefined;
                return subclassItem.socketOverrides[socketIndex];
            };

            // Get aspect and fragment hashes
            const aspectHashes: number[] = [];
            const fragmentHashes: number[] = [];

            if (subclassItem?.socketOverrides) {
                Object.entries(subclassItem.socketOverrides).forEach(([idxStr, hash]) => {
                    const idx = parseInt(idxStr);
                    const def = manifestService.getItem(hash as number);
                    if (!def) return;

                    // Skip main abilities
                    if (idx >= 0 && idx <= 4) return;

                    const category = (def.plug?.plugCategoryIdentifier || "").toLowerCase();
                    const typeName = (def.itemTypeDisplayName || "").toLowerCase();
                    const name = (def.displayProperties?.name || "").toLowerCase();

                    if (category.includes('aspect') || typeName.includes('aspect')) {
                        aspectHashes.push(hash as number);
                    } else if (category.includes('fragment') || category.includes('facet') ||
                        typeName.includes('fragment') || typeName.includes('facet') ||
                        name.includes('facet of')) {
                        fragmentHashes.push(hash as number);
                    }
                });
            }

            // Find exotic weapon and armor, and collect all gameplay mods
            let exoticWeapon = { hash: 0, name: 'None', slot: 0 };
            let exoticArmor = { hash: 0, name: 'None', slot: 3 };
            const armorMods: number[] = [];

            // Helper to check if a plug is a gameplay mod (vs shader/ornament)
            const isGameplayMod = (hash: number) => {
                const pDef = manifestService.getItem(hash);
                if (!pDef) return false;
                const plugCat = (pDef.plug?.plugCategoryIdentifier || '').toLowerCase();
                return plugCat.includes('enhancements') ||
                    plugCat.includes('armor_stats') ||
                    plugCat.includes('armor_mods');
            };

            // Gather all gameplay mods from parameters
            if (loadout.parameters?.mods) {
                loadout.parameters.mods.forEach(h => {
                    if (isGameplayMod(h)) armorMods.push(h);
                });
            } else if (loadout.parameters?.modsByBucket) {
                Object.values(loadout.parameters.modsByBucket).forEach((bucketMods: any) => {
                    if (Array.isArray(bucketMods)) {
                        bucketMods.forEach(h => {
                            if (isGameplayMod(h)) armorMods.push(h);
                        });
                    }
                });
            }

            loadout.equipped.forEach(item => {
                const def = manifestService.getItem(item.hash);
                if (!def) return;

                // Check if exotic (tier type 6)
                if (def.inventory?.tierType === 6 || def.tierType === 6) {
                    if (def.itemType === 3) { // Weapon
                        exoticWeapon = {
                            hash: item.hash,
                            name: def.displayProperties?.name || 'Unknown',
                            slot: (def.inventory?.bucketTypeHash === BUCKET_HASHES.KINETIC_WEAPONS ? 0 :
                                def.inventory?.bucketTypeHash === BUCKET_HASHES.ENERGY_WEAPONS ? 1 : 2) as any
                        };
                    } else if (def.itemType === 2) { // Armor
                        exoticArmor = {
                            hash: item.hash,
                            name: def.displayProperties?.name || 'Unknown',
                            slot: 3
                        };
                    }
                }
            });

            // Build the template matching BuildTemplate interface
            const template = {
                id: `dim-${Date.now()}`,
                name: buildName,
                element: element as any,
                guardianClass: loadout.classType,
                exoticWeapon: exoticWeapon as any,
                exoticArmor: exoticArmor as any,
                subclassConfig: {
                    subclassHash: subclassItem?.hash,
                    superHash: getSocketHash(0) || 0,
                    aspects: aspectHashes,
                    fragments: fragmentHashes,
                    grenadeHash: getSocketHash(4),
                    meleeHash: getSocketHash(3),
                    classAbilityHash: getSocketHash(2),
                },
                playstyle: 'DIM Import',
                difficulty: 'intermediate' as const,
                // Store the original loadout for full fidelity when viewing
                originalLoadout: loadout,
                armorMods, // Populate flat mods array for compact card view
                source: 'dim' as const
            };

            await buildService.saveBuild(template, buildName);
            showNotification(`Build "${buildName}" saved to Loadout Vault`);
        } catch (error) {
            errorLog('DIMLoadoutViewerPage', 'Failed to save build:', error);
            showNotification('Failed to save build');
        }
    };

    if (loading) {
        return (
            <div className="dim-loadout-viewer">
                <LoadingScreen />
            </div>
        );
    }

    if (error) {
        return (
            <div className="dim-loadout-viewer">
                <div className="dim-error">
                    <h2>Error Loading Loadout</h2>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{error}</p>
                    <button onClick={() => navigate('/agent-wake')}>Back to Agent</button>
                </div>
            </div>
        );
    }

    if (!loadout) {
        return (
            <div className="dim-loadout-viewer">
                <div className="dim-error">
                    <h2>No Loadout Found</h2>
                    <button onClick={() => navigate('/agent-wake')}>Back to Agent</button>
                </div>
            </div>
        );
    }

    // Find subclass
    const subclassItem = loadout.equipped.find(item => {
        const def = manifestService.getItem(item.hash);
        return def?.inventory?.bucketTypeHash === BUCKET_HASHES.SUBCLASS;
    });

    const subclassDef = subclassItem ? manifestService.getItem(subclassItem.hash) : null;
    const damageType = subclassDef?.talentGrid?.hudDamageType || 3;
    let elementName = ELEMENT_NAMES[damageType] || 'solar';

    // Check for Prismatic subclass
    if (
        PRISMATIC_HASHES.includes(subclassItem?.hash || 0) ||
        (subclassDef as any)?.plug?.plugCategoryIdentifier?.includes('prismatic') ||
        subclassDef?.displayProperties?.name?.toLowerCase().includes('prismatic')
    ) {
        elementName = 'prismatic';
    }

    const className = CLASS_NAMES[loadout.classType] || 'Titan';

    // Extract abilities from socket overrides
    const getSocketItem = (socketIndex: number) => {
        if (!subclassItem?.socketOverrides) return null;
        const hash = subclassItem.socketOverrides[socketIndex];
        return hash ? manifestService.getItem(hash) : null;
    };

    // Debug: Log all socket overrides to see what we have

    // Debug: Check what's in each socket


    // Subclass configuration
    const superDef = getSocketItem(0);
    const jumpDef = getSocketItem(1);
    const classAbilityDef = getSocketItem(2);
    const meleeDef = getSocketItem(3);
    const grenadeDef = getSocketItem(4);

    // Unified Socket Extraction logic - EXHAUSTIVE VERSION
    const allAspects: any[] = [];
    const allFragments: any[] = [];
    let discoveredTranscendence: any = null;

    if (subclassItem?.socketOverrides) {
        Object.entries(subclassItem.socketOverrides).forEach(([idxStr, hash]) => {
            const idx = parseInt(idxStr);
            const def = manifestService.getItem(hash as number);
            if (!def) return;

            // Skip common ability slots to avoid duplicates
            if (idx >= 0 && idx <= 4) return;

            const category = (def.plug?.plugCategoryIdentifier || "").toLowerCase();
            const typeName = (def.itemTypeDisplayName || "").toLowerCase();
            const name = (def.displayProperties?.name || "").toLowerCase();

            // 1. Check for Transcendence (Prismatic specialized node)
            if (category.includes('transcendence') || name.includes('transcendence')) {
                discoveredTranscendence = {
                    icon: getBungieUrl(def.displayProperties?.icon || ''),
                    hash: def.hash
                };
                return;
            }

            // 2. Check for Aspects
            if (category.includes('aspect') || typeName.includes('aspect')) {
                allAspects.push({
                    icon: getBungieUrl(def.displayProperties?.icon || ''),
                    hash: def.hash
                });
                return;
            }

            // 3. Check for Fragments/Facets
            if (category.includes('fragment') || category.includes('facet') ||
                typeName.includes('fragment') || typeName.includes('facet') ||
                name.includes('facet of')) {
                allFragments.push({
                    icon: getBungieUrl(def.displayProperties?.icon || ''),
                    hash: def.hash
                });
            }
        });
    }

    // Build icons object (Standardized mapping)
    const buildIcons = {
        super: classAbilityDef ? getBungieUrl(classAbilityDef.displayProperties?.icon || '') : undefined,
        superHash: classAbilityDef?.hash,
        jump: jumpDef ? getBungieUrl(jumpDef.displayProperties?.icon || '') : undefined,
        jumpHash: jumpDef?.hash,
        classAbility: superDef ? getBungieUrl(superDef.displayProperties?.icon || '') : undefined,
        classAbilityHash: superDef?.hash,
        melee: meleeDef ? getBungieUrl(meleeDef.displayProperties?.icon || '') : undefined,
        meleeHash: meleeDef?.hash,
        grenade: grenadeDef ? getBungieUrl(grenadeDef.displayProperties?.icon || '') : undefined,
        grenadeHash: grenadeDef?.hash,
        transcendence: discoveredTranscendence?.icon,
        transcendenceHash: discoveredTranscendence?.hash,
        aspects: allAspects,
        fragments: allFragments
    };

    // Armor pieces
    const helmet = loadout.equipped.find(i => {
        const def = manifestService.getItem(i.hash);
        return def?.inventory?.bucketTypeHash === BUCKET_HASHES.HELMET;
    });
    const gauntlets = loadout.equipped.find(i => {
        const def = manifestService.getItem(i.hash);
        return def?.inventory?.bucketTypeHash === BUCKET_HASHES.GAUNTLETS;
    });
    const chest = loadout.equipped.find(i => {
        const def = manifestService.getItem(i.hash);
        return def?.inventory?.bucketTypeHash === BUCKET_HASHES.CHEST_ARMOR;
    });
    const legs = loadout.equipped.find(i => {
        const def = manifestService.getItem(i.hash);
        return def?.inventory?.bucketTypeHash === BUCKET_HASHES.LEG_ARMOR;
    });
    const classItem = loadout.equipped.find(i => {
        const def = manifestService.getItem(i.hash);
        return def?.inventory?.bucketTypeHash === BUCKET_HASHES.CLASS_ARMOR;
    });

    // Weapons
    const kinetic = loadout.equipped.find(i => {
        const def = manifestService.getItem(i.hash);
        return def?.inventory?.bucketTypeHash === BUCKET_HASHES.KINETIC_WEAPONS;
    });
    const energy = loadout.equipped.find(i => {
        const def = manifestService.getItem(i.hash);
        return def?.inventory?.bucketTypeHash === BUCKET_HASHES.ENERGY_WEAPONS;
    });
    const power = loadout.equipped.find(i => {
        const def = manifestService.getItem(i.hash);
        return def?.inventory?.bucketTypeHash === BUCKET_HASHES.POWER_WEAPONS;
    });

    // Get armor and weapon icons
    const helmetDef = helmet ? manifestService.getItem(helmet.hash) : null;
    const gauntletsDef = gauntlets ? manifestService.getItem(gauntlets.hash) : null;
    const chestDef = chest ? manifestService.getItem(chest.hash) : null;
    const legsDef = legs ? manifestService.getItem(legs.hash) : null;
    const classItemDef = classItem ? manifestService.getItem(classItem.hash) : null;

    // Build armor object for mod distribution
    const armor = {
        helmet: helmet,
        arms: gauntlets,
        chest: chest,
        legs: legs,
        classItem: classItem
    };

    // Use shared utility to distribute mods correctly
    const { modGroups, armorCosmetics } = distributeLoadoutMods(loadout, armor);

    // Helper to render compact mods for a slot (3x2 or 2x3 grid pods)
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
                {/* 1. Shader (Required Slot) */}
                {renderCosmeticPod(shader?.hash)}

                {/* 2. Ornament (Required Slot) */}
                {renderCosmeticPod(ornament?.hash)}

                {/* 3. Main Stat (Only if present) */}
                {mainStat && renderModPod(mainStat)}

                {/* 4. Secondary Stat (Only if present) */}
                {secondaryStat && renderModPod(secondaryStat)}

                {/* 5+. Others */}
                {others.map((h) => renderModPod(h))}
            </div>
        );
    };



    const helmetCosmetics = {
        ornament: armorCosmetics.helmet?.ornament ? manifestService.getItem(armorCosmetics.helmet.ornament) : null,
        shader: armorCosmetics.helmet?.shader ? manifestService.getItem(armorCosmetics.helmet.shader) : null
    };
    const gauntletsCosmetics = {
        ornament: armorCosmetics.arms?.ornament ? manifestService.getItem(armorCosmetics.arms.ornament) : null,
        shader: armorCosmetics.arms?.shader ? manifestService.getItem(armorCosmetics.arms.shader) : null
    };
    const chestCosmetics = {
        ornament: armorCosmetics.chest?.ornament ? manifestService.getItem(armorCosmetics.chest.ornament) : null,
        shader: armorCosmetics.chest?.shader ? manifestService.getItem(armorCosmetics.chest.shader) : null
    };
    const legsCosmetics = {
        ornament: armorCosmetics.legs?.ornament ? manifestService.getItem(armorCosmetics.legs.ornament) : null,
        shader: armorCosmetics.legs?.shader ? manifestService.getItem(armorCosmetics.legs.shader) : null
    };
    const classItemCosmetics = {
        ornament: armorCosmetics.classItem?.ornament ? manifestService.getItem(armorCosmetics.classItem.ornament) : null,
        shader: armorCosmetics.classItem?.shader ? manifestService.getItem(armorCosmetics.classItem.shader) : null
    };


    const kineticDef = kinetic ? manifestService.getItem(kinetic.hash) : null;
    const energyDef = energy ? manifestService.getItem(energy.hash) : null;
    const powerDef = power ? manifestService.getItem(power.hash) : null;

    // Get background image from subclass or use default
    const primaryIcon = subclassDef ? getBungieUrl(subclassDef.screenshot || subclassDef.displayProperties?.icon || '') : null;

    return (
        <div
            className={`dim-loadout-viewer synergy-build-overlay context-dim-page ${isUiVisible ? '' : 'synergy-build-overlay--ui-hidden'}`}
            data-element={elementName}
            onMouseMove={handleMouseMove}
            style={{
                '--parallax-x': mousePos.x,
                '--parallax-y': mousePos.y
            } as any}
        >
            {/* Service Alert Notification */}
            {notification && (
                <div className="vault-service-alert animate-slide-up">
                    <div className="service-alert-content">
                        <div className="service-alert-icon">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                            </svg>
                        </div>
                        <div className="service-alert-text">
                            <span className="alert-bold">SERVICE ALERT</span>
                            <span className="alert-message">{notification}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Background Image */}
            {primaryIcon && (
                <div className="synergy-build-overlay__bg" ref={bgRef}>
                    <div className="synergy-build-overlay__pattern" />
                    <img src={primaryIcon} className="synergy-build-overlay__screenshot" alt="" />
                    <div className="synergy-build-overlay__vignette" />
                </div>
            )}

            {/* Close Button Top-Left */}
            <button className="synergy-build-overlay__close-top-left" onClick={() => navigate('/agent-wake')}>
                ✕
            </button>

            {/* Header Top-Right */}
            <div className="synergy-build-overlay__header-top-right">
                <div className="synergy-build-overlay__title-area">
                    <h1 className="synergy-build-overlay__title-large">{loadout.name}</h1>
                    <div className="synergy-build-overlay__subtitle-caps">
                        {className.toUpperCase()} // {subclassDef?.displayProperties?.name?.toUpperCase() || 'UNKNOWN SUBCLASS'}
                    </div>
                </div>
            </div>

            {/* Main Content - Full 2-Column Build Layout */}
            <div className="synergy-build-overlay__content">
                {/* 1. Super Section (Column 1) */}
                <div className="build-section build-section--super">
                    {buildIcons.super && (
                        <div className="super-node-large">
                            <img
                                src={buildIcons.super}
                                alt="Super Icon"
                                onMouseEnter={() => setHoveredItemHash(buildIcons.superHash || null)}
                                onMouseLeave={() => setHoveredItemHash(null)}
                            />
                        </div>
                    )}
                </div>

                {/* 2. Middle Section (Column 2) - Abilities, Aspects, Fragments, Gear */}
                <div className="build-section--middle">
                    <div className="build-section--middle__top-row">
                        {/* Abilities Section */}
                        <div className="node-section section-abilities">
                            <div className="node-section-header-prefixed">| ABILITIES</div>
                            <div className="node-section-content">
                                {buildIcons.classAbility && (
                                    <SubclassNode
                                        type="square"
                                        size="normal"
                                        icon={buildIcons.classAbility}
                                        element={elementName as any}
                                        status="active"
                                        onMouseEnter={() => setHoveredItemHash(buildIcons.classAbilityHash || null)}
                                        onMouseLeave={() => setHoveredItemHash(null)}
                                    />
                                )}
                                {buildIcons.jump && (
                                    <SubclassNode
                                        type="square"
                                        size="normal"
                                        icon={buildIcons.jump}
                                        element={elementName as any}
                                        status="active"
                                        onMouseEnter={() => setHoveredItemHash(buildIcons.jumpHash || null)}
                                        onMouseLeave={() => setHoveredItemHash(null)}
                                    />
                                )}
                                {buildIcons.melee && (
                                    <SubclassNode
                                        type="square"
                                        size="normal"
                                        icon={buildIcons.melee}
                                        element={elementName as any}
                                        status="active"
                                        onMouseEnter={() => setHoveredItemHash(buildIcons.meleeHash || null)}
                                        onMouseLeave={() => setHoveredItemHash(null)}
                                    />
                                )}
                                {buildIcons.grenade && (
                                    <SubclassNode
                                        type="square"
                                        size="normal"
                                        icon={buildIcons.grenade}
                                        element={elementName as any}
                                        status="active"
                                        onMouseEnter={() => setHoveredItemHash(buildIcons.grenadeHash || null)}
                                        onMouseLeave={() => setHoveredItemHash(null)}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Aspects Section */}
                        <div className="node-section section-aspects">
                            <div className="node-section-header-prefixed">| ASPECTS</div>
                            <div className="node-section-content">
                                {buildIcons.aspects.map((aspect, i) => (
                                    <SubclassNode
                                        key={i}
                                        type="square"
                                        size="normal"
                                        icon={aspect.icon}
                                        element={elementName as any}
                                        status="active"
                                        onMouseEnter={() => setHoveredItemHash(aspect.hash || null)}
                                        onMouseLeave={() => setHoveredItemHash(null)}
                                    />
                                ))}
                                {/* Transcendence inline if Prismatic */}
                                {elementName === 'prismatic' && buildIcons.transcendence && (
                                    <SubclassNode
                                        type="square"
                                        size="normal"
                                        icon={buildIcons.transcendence}
                                        element={elementName as any}
                                        status="active"
                                        onMouseEnter={() => setHoveredItemHash(buildIcons.transcendenceHash || null)}
                                        onMouseLeave={() => setHoveredItemHash(null)}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="build-section--middle__bottom-row">
                        {/* Fragments Section */}
                        <div className="node-section section-fragments">
                            <div className="node-section-header-prefixed">| FRAGMENTS</div>
                            <div className="synergy-build-overlay__fragments-grid">
                                {buildIcons.fragments.map((fragment, i) => (
                                    <SubclassNode
                                        key={i}
                                        type="square"
                                        size="small"
                                        icon={fragment.icon}
                                        element={elementName as any}
                                        status="active"
                                        onMouseEnter={() => setHoveredItemHash(fragment.hash || null)}
                                        onMouseLeave={() => setHoveredItemHash(null)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 3. Loadout & Gear Section row */}
                    <div className="build-section--middle__gear-row">
                        <div className="node-section section-gear">
                            <div className="node-section-header-prefixed">| LOADOUT & GEAR</div>
                            <div className="synergy-build-overlay__gear-horizontal-grid">
                                {/* Weapons */}
                                {[
                                    { def: kineticDef, item: kinetic },
                                    { def: energyDef, item: energy },
                                    { def: powerDef, item: power }
                                ].map((w, i) => w.def && (
                                    <div key={i} className="gear-item-horizontal" onMouseEnter={() => setHoveredItemHash(w.def?.hash || null)} onMouseLeave={() => setHoveredItemHash(null)}>
                                        <RichItemIcon hash={w.def.hash} instance={w.item} />
                                        <div className="gear-item-info">
                                            <span className="build-item__label--compact">{w.def.displayProperties?.name}</span>
                                        </div>
                                    </div>
                                ))}

                                {/* Armor pieces */}
                                {[
                                    { def: helmetDef, group: modGroups.helmet, cosmetics: helmetCosmetics, itemData: helmet },
                                    { def: gauntletsDef, group: modGroups.arms, cosmetics: gauntletsCosmetics, itemData: gauntlets },
                                    { def: chestDef, group: modGroups.chest, cosmetics: chestCosmetics, itemData: chest },
                                    { def: legsDef, group: modGroups.legs, cosmetics: legsCosmetics, itemData: legs },
                                    { def: classItemDef, group: modGroups.classItem, cosmetics: classItemCosmetics, itemData: classItem }
                                ].map((item, idx) => item.def && (
                                    <div key={idx} className="gear-item-horizontal" onMouseEnter={() => setHoveredItemHash(item.def?.hash || null)} onMouseLeave={() => setHoveredItemHash(null)}>
                                        <RichItemIcon hash={item.def.hash} instance={item.itemData} />
                                        <div className="gear-item-info">
                                            <span className="build-item__label--compact">{item.def.displayProperties?.name}</span>
                                            {renderCompactMods(item.group, item.cosmetics.ornament, item.cosmetics.shader)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Build Description Panel */}
            <div className={`synergy-build-overlay__lore-panel ${isLoreOpen ? 'synergy-build-overlay__lore-panel--open' : ''}`}>
                <div className="lore-panel__header">
                    <h2 className="lore-panel__title">{loadout.name}</h2>
                    <div className="lore-panel__subtitle">
                        {className} // {subclassDef?.displayProperties?.name || 'Custom Build'}
                    </div>
                </div>
                <div className="lore-panel__content">
                    {loadout.notes || 'This is a DIM loadout. No description provided.'}
                </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="synergy-build-overlay__footer-bar">
                <div className="key-prompt" onClick={handleSaveBuild}>
                    <span className="key-cap">D</span>
                    <span className="key-label">Save Build</span>
                </div>
                <div className="key-prompt" onClick={() => setIsUiVisible(!isUiVisible)}>
                    <span className="key-cap">Ctrl</span>
                    <span className="key-label">Hide Menu</span>
                </div>
                <div className="key-prompt" onClick={() => navigate('/agent-wake')}>
                    <span className="key-cap">Esc</span>
                    <span className="key-label">Back to Agent</span>
                </div>
            </div>

            {/* Rich Tooltip Portal */}
            {hoveredItemHash && (
                <div className="fixed-tooltip-container">
                    <RichTooltip
                        item={manifestService.getItem(hoveredItemHash)}
                    />
                </div>
            )}

            <NamingModal
                isOpen={isNamingModalOpen}
                message="Enter a name for this DIM imported configuration:"
                defaultValue={loadout?.name || 'Custom Build'}
                onConfirm={confirmSaveBuild}
                onCancel={() => setIsNamingModalOpen(false)}
            />
        </div>
    );
}

export default DIMLoadoutViewerPage;
