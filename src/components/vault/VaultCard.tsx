import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { manifestService } from '../../services/bungie/manifest.service';
import { RichItemIcon } from '../common/RichItemIcon';
import { loadoutLinkService, convertBuildToLoadoutShareData } from '../../services/bungie/loadout-link.service';
import { useManifestStore, useProfileStore } from '../../store';
import { getBungieUrl } from '../../utils/url-helper';
import { distributeLoadoutMods, categorizeMods } from '../../utils/loadout-mods.utils';
import { BUCKET_HASHES } from '../../config/bungie.config';
import type { SavedBuild, DestinyItem } from '../../types';
import { SubclassNode } from '../builder/SubclassNode';
import { RichTooltip } from '../builder/RichTooltip';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { errorLog } from '../../utils/logger';
import './VaultCard.css';

import '../../pages/DIMLoadoutViewerPage.css';

// Element type mapping from damage type number
const ELEMENT_NAMES: Record<number, string> = {
    1: 'kinetic',
    2: 'arc',
    3: 'solar',
    4: 'void',
    6: 'stasis',
    7: 'strand',
};

const CLASS_NAMES = ['Titan', 'Hunter', 'Warlock'];

interface VaultCardProps {
    build: SavedBuild;
    onEquip?: (build: SavedBuild) => void;
    onDelete?: (buildId: string) => void;
    onView?: (build: SavedBuild) => void;
    isEquipping?: boolean;
    equippingProgress?: number;
    equippingStatus?: string;
}

export function VaultCard({ build, onEquip, onDelete, isEquipping = false }: VaultCardProps) {
    const [screenshot, setScreenshot] = useState<string | null>(null);
    const [primaryIcon, setPrimaryIcon] = useState<string | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isLoreOpen, setIsLoreOpen] = useState(false);
    const [isUiVisible, setIsUiVisible] = useState(true);
    const [hoveredItemHash, setHoveredItemHash] = useState<number | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [missingItems, setMissingItems] = useState<{ hash: number; name: string }[]>([]);

    // Notification banner state
    const [notification, setNotification] = useState<string | null>(null);
    const [notificationTimeout, setNotificationTimeout] = useState<NodeJS.Timeout | null>(null);

    const { isLoaded: manifestLoaded } = useManifestStore();
    const template = build.template;

    // Check if we have originalLoadout data (DIM import with full fidelity)
    const originalLoadout = template?.originalLoadout;
    const hasDIMData = !!originalLoadout;

    // Show notification banner
    const showNotification = (message: string) => {
        if (notificationTimeout) clearTimeout(notificationTimeout);
        setNotification(message);
        const timeout = setTimeout(() => setNotification(null), 2500);
        setNotificationTimeout(timeout);
    };


    // Build icons state for card preview
    const [cardIcons, setCardIcons] = useState<{
        super?: string;
        superHash?: number;
        grenade?: string;
        grenadeHash?: number;
        melee?: string;
        meleeHash?: number;
        classAbility?: string;
        classAbilityHash?: number;
        aspects: { icon: string; hash: number }[];
        fragments: { icon: string; hash: number }[];
        weapons: { icon: string; hash: number; name: string }[];
        armor?: { icon: string; hash: number; name: string };
    }>({ aspects: [], fragments: [], weapons: [] });

    // DIM-style full loadout data (when originalLoadout exists)
    const dimLoadoutData = useMemo(() => {
        if (!hasDIMData || !manifestLoaded) return null;

        const loadout = originalLoadout;

        // Find subclass
        const subclassItem = loadout.equipped?.find((item: any) => {
            const def = manifestService.getItem(item.hash);
            return def?.inventory?.bucketTypeHash === BUCKET_HASHES.SUBCLASS;
        });

        const subclassDef = subclassItem ? manifestService.getItem(subclassItem.hash) : null;
        const damageType = (subclassDef as any)?.talentGrid?.hudDamageType || 3;
        const elementName = ELEMENT_NAMES[damageType] || template?.element || 'solar';

        // Extract abilities from socket overrides
        const getSocketItem = (socketIndex: number) => {
            if (!subclassItem?.socketOverrides) return null;
            const hash = subclassItem.socketOverrides[socketIndex];
            return hash ? manifestService.getItem(hash) : null;
        };

        // Subclass configuration - Exhaustive scan
        const superDef = getSocketItem(0);
        const jumpDef = getSocketItem(1);
        const classAbilityDef = getSocketItem(2);
        const meleeDef = getSocketItem(3);
        const grenadeDef = getSocketItem(4);

        const allAspects: { icon: string; hash: number }[] = [];
        const allFragments: { icon: string; hash: number }[] = [];

        if (subclassItem?.socketOverrides) {
            Object.entries(subclassItem.socketOverrides).forEach(([idxStr, hash]) => {
                const idx = parseInt(idxStr);
                const def = manifestService.getItem(hash as number);
                if (!def) return;

                // Skip common ability slots to avoid duplicates (Super, Class, Jump, Melee, Grenade)
                if (idx >= 0 && idx <= 4) return;

                const category = (def.plug?.plugCategoryIdentifier || "").toLowerCase();
                const typeName = (def.itemTypeDisplayName || "").toLowerCase();
                const name = (def.displayProperties?.name || "").toLowerCase();

                // 1. Check for Aspects
                if (category.includes('aspect') || typeName.includes('aspect')) {
                    allAspects.push({
                        icon: getBungieUrl(def.displayProperties?.icon || '') || '',
                        hash: def.hash
                    });
                }
                // 2. Check for Fragments/Facets
                else if (category.includes('fragment') || category.includes('facet') ||
                    typeName.includes('fragment') || typeName.includes('facet') ||
                    name.includes('facet of')) {
                    allFragments.push({
                        icon: getBungieUrl(def.displayProperties?.icon || '') || '',
                        hash: def.hash
                    });
                }
            });
        }

        // Build icons (SWAP: Super icon goes in classAbility position for display)
        const buildIcons = {
            super: classAbilityDef ? getBungieUrl((classAbilityDef as any).displayProperties?.icon || '') : undefined,
            superHash: (classAbilityDef as any)?.hash,
            jump: jumpDef ? getBungieUrl((jumpDef as any).displayProperties?.icon || '') : undefined,
            jumpHash: (jumpDef as any)?.hash,
            classAbility: superDef ? getBungieUrl((superDef as any).displayProperties?.icon || '') : undefined,
            classAbilityHash: (superDef as any)?.hash,
            melee: meleeDef ? getBungieUrl((meleeDef as any).displayProperties?.icon || '') : undefined,
            meleeHash: (meleeDef as any)?.hash,
            grenade: grenadeDef ? getBungieUrl((grenadeDef as any).displayProperties?.icon || '') : undefined,
            grenadeHash: (grenadeDef as any)?.hash,
            aspects: allAspects,
            fragments: allFragments
        };

        // Armor pieces
        const helmet = loadout.equipped?.find((i: any) => {
            const def = manifestService.getItem(i.hash);
            return def?.inventory?.bucketTypeHash === BUCKET_HASHES.HELMET;
        });
        const gauntlets = loadout.equipped?.find((i: any) => {
            const def = manifestService.getItem(i.hash);
            return def?.inventory?.bucketTypeHash === BUCKET_HASHES.GAUNTLETS;
        });
        const chest = loadout.equipped?.find((i: any) => {
            const def = manifestService.getItem(i.hash);
            return def?.inventory?.bucketTypeHash === BUCKET_HASHES.CHEST_ARMOR;
        });
        const legs = loadout.equipped?.find((i: any) => {
            const def = manifestService.getItem(i.hash);
            return def?.inventory?.bucketTypeHash === BUCKET_HASHES.LEG_ARMOR;
        });
        const classItem = loadout.equipped?.find((i: any) => {
            const def = manifestService.getItem(i.hash);
            return def?.inventory?.bucketTypeHash === BUCKET_HASHES.CLASS_ARMOR;
        });

        // Weapons
        const kinetic = loadout.equipped?.find((i: any) => {
            const def = manifestService.getItem(i.hash);
            return def?.inventory?.bucketTypeHash === BUCKET_HASHES.KINETIC_WEAPONS;
        });
        const energy = loadout.equipped?.find((i: any) => {
            const def = manifestService.getItem(i.hash);
            return def?.inventory?.bucketTypeHash === BUCKET_HASHES.ENERGY_WEAPONS;
        });
        const power = loadout.equipped?.find((i: any) => {
            const def = manifestService.getItem(i.hash);
            return def?.inventory?.bucketTypeHash === BUCKET_HASHES.POWER_WEAPONS;
        });

        // Get definitions
        const helmetDef = helmet ? manifestService.getItem(helmet.hash) : null;
        const gauntletsDef = gauntlets ? manifestService.getItem(gauntlets.hash) : null;
        const chestDef = chest ? manifestService.getItem(chest.hash) : null;
        const legsDef = legs ? manifestService.getItem(legs.hash) : null;
        const classItemDef = classItem ? manifestService.getItem(classItem.hash) : null;
        const kineticDef = kinetic ? manifestService.getItem(kinetic.hash) : null;
        const energyDef = energy ? manifestService.getItem(energy.hash) : null;
        const powerDef = power ? manifestService.getItem(power.hash) : null;

        // Mod distribution
        const armor = { helmet, arms: gauntlets, chest, legs, classItem };
        const { modGroups, armorCosmetics } = distributeLoadoutMods(loadout, armor);

        // Cosmetics (extracted during distribution)
        const helmetCosmetics = {
            ornament: armorCosmetics.helmet.ornament ? manifestService.getItem(armorCosmetics.helmet.ornament) : null,
            shader: armorCosmetics.helmet.shader ? manifestService.getItem(armorCosmetics.helmet.shader) : null
        };
        const gauntletsCosmetics = {
            ornament: armorCosmetics.arms.ornament ? manifestService.getItem(armorCosmetics.arms.ornament) : null,
            shader: armorCosmetics.arms.shader ? manifestService.getItem(armorCosmetics.arms.shader) : null
        };
        const chestCosmetics = {
            ornament: armorCosmetics.chest.ornament ? manifestService.getItem(armorCosmetics.chest.ornament) : null,
            shader: armorCosmetics.chest.shader ? manifestService.getItem(armorCosmetics.chest.shader) : null
        };
        const legsCosmetics = {
            ornament: armorCosmetics.legs.ornament ? manifestService.getItem(armorCosmetics.legs.ornament) : null,
            shader: armorCosmetics.legs.shader ? manifestService.getItem(armorCosmetics.legs.shader) : null
        };
        const classItemCosmetics = {
            ornament: armorCosmetics.classItem.ornament ? manifestService.getItem(armorCosmetics.classItem.ornament) : null,
            shader: armorCosmetics.classItem.shader ? manifestService.getItem(armorCosmetics.classItem.shader) : null
        };

        // Background from subclass
        const bgImage = subclassDef ? getBungieUrl((subclassDef as any).screenshot || (subclassDef as any).displayProperties?.icon || '') : null;

        // MISSING ITEM CHECK (DIM Parity)
        const allInventory = useProfileStore.getState().getAllInventory();
        const missingGear: { hash: number; name: string }[] = [];

        const checkMissing = (hash: number | undefined, name: string) => {
            if (!hash) return;
            const exists = allInventory.some((i: DestinyItem) => i.itemHash === hash);
            if (!exists) missingGear.push({ hash, name });
        };

        // Check template exotics
        if (template?.exoticWeapon?.hash) checkMissing(template.exoticWeapon.hash, template.exoticWeapon.name || 'Exotic Weapon');
        if (template?.exoticArmor?.hash) checkMissing(template.exoticArmor.hash, template.exoticArmor.name || 'Exotic Armor');

        // Check legendary items from template
        template?.items?.forEach(i => checkMissing(i.hash, i.name || 'Legendary Item'));

        // Check DIM loadout items if present
        loadout.equipped?.forEach((i: any) => {
            const def = manifestService.getItem(i.hash);
            if (def && [2, 3].includes(def.itemType)) { // Gear only
                checkMissing(i.hash, def.displayProperties?.name || 'Item');
            }
        });

        // Dedup missing items
        const finalMissing = Array.from(new Set(missingGear.map(m => m.hash)))
            .map(hash => missingGear.find(m => m.hash === hash)!);

        return {
            elementName,
            className: CLASS_NAMES[loadout.classType] || 'Guardian',
            subclassDef,
            buildIcons,
            helmetDef, gauntletsDef, chestDef, legsDef, classItemDef,
            kineticDef, energyDef, powerDef,
            kinetic, energy, power,
            helmet, gauntlets, chest, legs, classItem,
            helmetCosmetics, gauntletsCosmetics, chestCosmetics, legsCosmetics, classItemCosmetics,
            modGroups,
            bgImage,
            missingGear: finalMissing
        };
    }, [hasDIMData, originalLoadout, manifestLoaded, template]);

    // MISSING ITEM DETECTION (DIM Parity)
    useEffect(() => {
        if (!manifestLoaded || !template) return;

        const allInventory = useProfileStore.getState().getAllInventory();
        const missingGear: { hash: number; name: string }[] = [];

        const checkMissing = (hash: number | undefined, name: string) => {
            if (!hash) return;
            const exists = allInventory.some((i: DestinyItem) => i.itemHash === hash);
            if (!exists) {
                // Check if already in list to avoid duplicates
                if (!missingGear.some(m => m.hash === hash)) {
                    missingGear.push({ hash, name });
                }
            }
        };

        // Check template exotics
        if (template?.exoticWeapon?.hash) checkMissing(template.exoticWeapon.hash, template.exoticWeapon.name || 'Exotic Weapon');
        if (template?.exoticArmor?.hash) checkMissing(template.exoticArmor.hash, template.exoticArmor.name || 'Exotic Armor');

        // Check legendary items from template
        template?.items?.forEach(i => checkMissing(i.hash, i.name || 'Legendary Item'));

        // Check DIM loadout items if present
        if (originalLoadout?.equipped) {
            originalLoadout.equipped.forEach((i: any) => {
                const def = manifestService.getItem(i.hash);
                if (def && [2, 3].includes(def.itemType)) { // Gear only
                    checkMissing(i.hash, def.displayProperties?.name || 'Item');
                }
            });
        }

        // Update state if changed (deep compare)
        if (JSON.stringify(missingGear) !== JSON.stringify(missingItems)) {
            setMissingItems(missingGear);
        }
    }, [manifestLoaded, template, originalLoadout]);

    // Copy ExoEngine Link (DIM-compatible format)
    const handleCopyExoEngineLink = async () => {
        try {
            let loadoutData;
            if (originalLoadout) {
                loadoutData = originalLoadout;
            } else {
                // Convert template to loadout share data
                loadoutData = convertBuildToLoadoutShareData(template);
            }

            // Use DIM-compatible format so links work in both ExoEngine and DIM
            const link = await loadoutLinkService.generateExoEngineLink(loadoutData);
            await navigator.clipboard.writeText(link);
            showNotification('Link copied to clipboard');
        } catch (error) {
            errorLog('Vault', 'Copy failed', error);
            showNotification('Failed to copy link');
        }
    };

    // Copy DIM Link
    const handleCopyDIMLink = async () => {
        try {
            let loadoutData;
            if (originalLoadout) {
                loadoutData = originalLoadout;
            } else {
                loadoutData = convertBuildToLoadoutShareData(template);
            }

            const dimLink = loadoutLinkService.generateDIMCompatibleLink(loadoutData);
            await navigator.clipboard.writeText(dimLink);
            showNotification('DIM link copied to clipboard');
        } catch (error) {
            errorLog('Vault', 'Copy failed', error);
            showNotification('Failed to copy DIM link');
        }
    };

    // Keyboard Shortcuts
    useEffect(() => {
        if (!isDetailsOpen) return;

        const handleKeyDown = async (e: KeyboardEvent) => {
            const activeEl = document.activeElement;
            const isTyping = activeEl && (
                activeEl.tagName === 'INPUT' ||
                activeEl.tagName === 'TEXTAREA' ||
                (activeEl as HTMLElement).isContentEditable
            );
            if (isTyping) return;

            if (e.key === 'Control') {
                setIsUiVisible(v => !v);
            }
            if (e.key.toLowerCase() === 'a') {
                setIsLoreOpen(v => !v);
            }
            if (e.key.toLowerCase() === 'f') {
                if (!isEquipping) {
                    onEquip?.(build);
                }
            }
            if (e.key.toLowerCase() === 's' && template?.source !== 'exoengine') {
                await handleCopyExoEngineLink();
            }
            if (e.key.toLowerCase() === 'g' && template?.source !== 'exoengine') {
                await handleCopyDIMLink();
            }
            if (e.key === 'Escape') {
                setIsDetailsOpen(false);
            }
            if (e.key === 'Delete') {
                setShowDeleteConfirm(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isDetailsOpen, isEquipping, build, onEquip, onDelete]);

    // Load card preview icons
    useEffect(() => {
        if (!manifestLoaded || !template) return;

        async function loadImages() {
            const newIcons: typeof cardIcons = { aspects: [], fragments: [], weapons: [] };

            // Get screenshot from exotic weapon or armor
            const mainItemHash = template.exoticWeapon?.hash || template.exoticArmor?.hash;
            if (mainItemHash) {
                const item = manifestService.getItem(mainItemHash);
                if (item?.screenshot) {
                    setScreenshot(item.screenshot);
                }
                setPrimaryIcon(manifestService.getIcon(mainItemHash) || null);
            }

            // Subclass nodes
            const subclass = template.subclassConfig;
            if (subclass) {
                if (subclass.superHash) {
                    const icon = manifestService.getIcon(subclass.superHash);
                    if (icon) {
                        newIcons.super = icon;
                        newIcons.superHash = subclass.superHash;
                    }
                }
                if (subclass.grenadeHash) {
                    const icon = manifestService.getIcon(subclass.grenadeHash);
                    if (icon) {
                        newIcons.grenade = icon;
                        newIcons.grenadeHash = subclass.grenadeHash;
                    }
                }
                if (subclass.meleeHash) {
                    const icon = manifestService.getIcon(subclass.meleeHash);
                    if (icon) {
                        newIcons.melee = icon;
                        newIcons.meleeHash = subclass.meleeHash;
                    }
                }
                if (subclass.classAbilityHash) {
                    const icon = manifestService.getIcon(subclass.classAbilityHash);
                    if (icon) {
                        newIcons.classAbility = icon;
                        newIcons.classAbilityHash = subclass.classAbilityHash;
                    }
                }

                subclass.aspects?.forEach(h => {
                    const icon = manifestService.getIcon(h);
                    if (icon) newIcons.aspects.push({ icon, hash: h });
                });

                subclass.fragments?.forEach(h => {
                    const icon = manifestService.getIcon(h);
                    if (icon) newIcons.fragments.push({ icon, hash: h });
                });
            }

            if (template.exoticWeapon?.hash) {
                const icon = manifestService.getIcon(template.exoticWeapon.hash);
                if (icon) newIcons.weapons.push({
                    icon,
                    hash: template.exoticWeapon.hash,
                    name: template.exoticWeapon.name
                });
            }

            if (template.exoticArmor?.hash) {
                const icon = manifestService.getIcon(template.exoticArmor.hash);
                if (icon) newIcons.armor = {
                    icon,
                    hash: template.exoticArmor.hash,
                    name: template.exoticArmor.name
                };
            }

            setCardIcons(newIcons);
        }

        loadImages();
    }, [template, manifestLoaded]);

    const elementName = template?.element?.toLowerCase() || 'void';
    const className = CLASS_NAMES[template?.guardianClass] || 'Guardian';

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDetailsOpen) return;
        const { clientX, clientY } = e;
        const { innerWidth, innerHeight } = window;
        const x = (clientX / innerWidth) - 0.5;
        const y = (clientY / innerHeight) - 0.5;
        setMousePos({ x, y });
    };

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


    return (
        <>
            {/* CARD PREVIEW */}
            <div
                className={`vault-card vault-card--horizontal vault-card--${elementName}`}
                onClick={() => setIsDetailsOpen(true)}
            >
                <div className="vault-card__bg">
                    {screenshot ? (
                        <img src={screenshot} alt="" className="vault-card__screenshot" />
                    ) : (
                        <div className="vault-card__pattern" style={{ backgroundImage: primaryIcon ? `url(${primaryIcon})` : 'none' }} />
                    )}
                    <div className="vault-card__vignette" />
                    <div className="vault-card__glow" />
                </div>

                <div className="vault-card__content">
                    {cardIcons.super && (
                        <div className="vault-card__super-icon">
                            <img src={cardIcons.super} alt="Super" />
                            <span className={`vault-element-badge element-${elementName}`} />
                        </div>
                    )}
                    <div className="vault-card__info">
                        <h3 className="vault-card__title">{build.name}</h3>
                        <span className="vault-card__subtitle">{className} // {template?.playstyle || 'Custom Build'}</span>
                    </div>
                </div>

                <div className="vault-card__nodes">
                    {cardIcons.classAbility && (
                        <SubclassNode type="square" size="small" icon={cardIcons.classAbility} element={elementName as any} status="active" />
                    )}
                    {cardIcons.grenade && (
                        <SubclassNode type="square" size="small" icon={cardIcons.grenade} element={elementName as any} status="active" />
                    )}
                    {cardIcons.melee && (
                        <SubclassNode type="square" size="small" icon={cardIcons.melee} element={elementName as any} status="active" />
                    )}
                    {cardIcons.aspects.slice(0, 2).map((aspect, i) => (
                        <SubclassNode key={i} type="square" size="small" icon={aspect.icon} element={elementName as any} status="active" />
                    ))}
                    <div className="fragment-row">
                        {cardIcons.fragments.slice(0, 4).map((fragment, i) => (
                            <img key={i} src={fragment.icon} className="fragment-icon-tiny" alt="" />
                        ))}
                    </div>
                </div>

                <div className="vault-card__actions">
                    <div className="vault-card__exotics">
                        {cardIcons.weapons[0] && <img src={cardIcons.weapons[0].icon} className="exotic-icon-preview" title={cardIcons.weapons[0].name} />}
                        {cardIcons.armor && <img src={cardIcons.armor.icon} className="exotic-icon-preview" title={cardIcons.armor.name} />}
                    </div>
                    {isEquipping && <div className="spinner-mini" />}
                </div>

                <div className="vault-card__timestamp">
                    {new Date(build.createdAt).toLocaleDateString()}
                </div>
            </div>
            {/* FULL SCREEN DETAILS OVERLAY - DIM STYLE */}
            {isDetailsOpen && createPortal(
                <div
                    className={`dim-loadout-viewer synergy-build-overlay context-vault ${isUiVisible ? '' : 'synergy-build-overlay--ui-hidden'}`}
                    data-element={hasDIMData ? dimLoadoutData?.elementName : elementName}
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

                    {/* Missing Items Warning Banner (DIM Style) */}
                    {missingItems.length > 0 && (
                        <div className="vault-missing-banner animate-slide-up">
                            <div className="missing-banner-content">
                                <div className="missing-banner-icon">
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                        <path d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
                                    </svg>
                                </div>
                                <div className="missing-banner-text">
                                    <span className="missing-bold">MISSING ITEMS</span>
                                    <span className="missing-message">Some items in this loadout were not found in your inventory: {missingItems.map(i => i.name).join(', ')}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Background Image */}
                    {(hasDIMData ? dimLoadoutData?.bgImage : screenshot) && (
                        <div className="synergy-build-overlay__bg">
                            <div className="synergy-build-overlay__pattern" />
                            <img
                                src={hasDIMData ? dimLoadoutData?.bgImage || '' : screenshot || ''}
                                alt=""
                                className="synergy-build-overlay__screenshot"
                            />
                            <div className="synergy-build-overlay__vignette" />
                        </div>
                    )}

                    {/* Top Header Bar */}
                    <div className="synergy-build-overlay__header">
                        <button className="synergy-build-overlay__close" onClick={() => setIsDetailsOpen(false)}>
                            ✕
                        </button>
                        <div className="synergy-build-overlay__header-top-right">
                            <div className="synergy-build-overlay__title-area">
                                <h1 className="synergy-build-overlay__title-large">{build.name}</h1>
                                <div className="synergy-build-overlay__subtitle-caps">
                                    {hasDIMData ? dimLoadoutData?.className.toUpperCase() : className.toUpperCase()} // {hasDIMData ? (dimLoadoutData?.subclassDef as any)?.displayProperties?.name?.toUpperCase() || 'UNKNOWN SUBCLASS' : template?.playstyle?.toUpperCase() || 'CUSTOM BUILD'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content - Full 2-Column Build Layout */}
                    <div className="synergy-build-overlay__content">
                        {/* 1. Super Section (Column 1) */}
                        <div className="build-section build-section--super">
                            {(hasDIMData ? dimLoadoutData?.buildIcons.super : cardIcons.super) && (
                                <div className="super-node-large">
                                    <img
                                        src={(hasDIMData ? dimLoadoutData?.buildIcons.super : cardIcons.super) || ''}
                                        alt="Super Icon"
                                        onMouseEnter={() => setHoveredItemHash((hasDIMData ? dimLoadoutData?.buildIcons.superHash : cardIcons.superHash) || null)}
                                        onMouseLeave={() => setHoveredItemHash(null)}
                                    />
                                </div>
                            )}
                        </div>

                        {/* 2. Middle Section (Column 2) - Abilities, Aspects, Fragments, Stats, Gear */}
                        <div className="build-section--middle">
                            <div className="build-section--middle__top-row">
                                {/* Abilities Section */}
                                <div className="node-section section-abilities">
                                    <div className="node-section-header-prefixed">| ABILITIES</div>
                                    <div className="node-section-content">
                                        {(hasDIMData ? dimLoadoutData?.buildIcons.classAbility : cardIcons.classAbility) && (
                                            <SubclassNode
                                                type="square"
                                                size="normal"
                                                icon={(hasDIMData ? dimLoadoutData?.buildIcons.classAbility : cardIcons.classAbility) || ''}
                                                element={(hasDIMData ? dimLoadoutData?.elementName : elementName) as any}
                                                status="active"
                                                onMouseEnter={() => setHoveredItemHash((hasDIMData ? dimLoadoutData?.buildIcons.classAbilityHash : cardIcons.classAbilityHash) || null)}
                                                onMouseLeave={() => setHoveredItemHash(null)}
                                            />
                                        )}
                                        {hasDIMData && dimLoadoutData?.buildIcons.jump && (
                                            <SubclassNode
                                                type="square"
                                                size="normal"
                                                icon={dimLoadoutData.buildIcons.jump}
                                                element={dimLoadoutData.elementName as any}
                                                status="active"
                                                onMouseEnter={() => setHoveredItemHash(dimLoadoutData?.buildIcons.jumpHash || null)}
                                                onMouseLeave={() => setHoveredItemHash(null)}
                                            />
                                        )}
                                        {(hasDIMData ? dimLoadoutData?.buildIcons.grenade : cardIcons.grenade) && (
                                            <SubclassNode
                                                type="square"
                                                size="normal"
                                                icon={(hasDIMData ? dimLoadoutData?.buildIcons.grenade : cardIcons.grenade) || ''}
                                                element={(hasDIMData ? dimLoadoutData?.elementName : elementName) as any}
                                                status="active"
                                                onMouseEnter={() => setHoveredItemHash((hasDIMData ? dimLoadoutData?.buildIcons.grenadeHash : cardIcons.grenadeHash) || null)}
                                                onMouseLeave={() => setHoveredItemHash(null)}
                                            />
                                        )}
                                        {(hasDIMData ? dimLoadoutData?.buildIcons.melee : cardIcons.melee) && (
                                            <SubclassNode
                                                type="square"
                                                size="normal"
                                                icon={(hasDIMData ? dimLoadoutData?.buildIcons.melee : cardIcons.melee) || ''}
                                                element={(hasDIMData ? dimLoadoutData?.elementName : elementName) as any}
                                                status="active"
                                                onMouseEnter={() => setHoveredItemHash((hasDIMData ? dimLoadoutData?.buildIcons.meleeHash : cardIcons.meleeHash) || null)}
                                                onMouseLeave={() => setHoveredItemHash(null)}
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Aspects Section */}
                                <div className="node-section section-aspects">
                                    <div className="node-section-header-prefixed">| ASPECTS</div>
                                    <div className="node-section-content">
                                        {(hasDIMData ? dimLoadoutData?.buildIcons.aspects : cardIcons.aspects)?.map((aspect, i) => (
                                            <SubclassNode
                                                key={i}
                                                type="square"
                                                size="normal"
                                                icon={aspect.icon}
                                                element={(hasDIMData ? dimLoadoutData?.elementName : elementName) as any}
                                                status="active"
                                                onMouseEnter={() => setHoveredItemHash(aspect.hash || null)}
                                                onMouseLeave={() => setHoveredItemHash(null)}
                                            />
                                        )) || []}
                                    </div>
                                </div>
                            </div>

                            <div className="build-section--middle__bottom-row">
                                {/* Fragments Section */}
                                <div className="node-section section-fragments">
                                    <div className="node-section-header-prefixed">| FRAGMENTS</div>
                                    <div className="synergy-build-overlay__fragments-grid">
                                        {(hasDIMData ? dimLoadoutData?.buildIcons.fragments : cardIcons.fragments)?.map((fragment, i) => (
                                            <SubclassNode
                                                key={i}
                                                type="square"
                                                size="small"
                                                icon={fragment.icon}
                                                element={(hasDIMData ? dimLoadoutData?.elementName : elementName) as any}
                                                status="active"
                                                onMouseEnter={() => setHoveredItemHash(fragment.hash || null)}
                                                onMouseLeave={() => setHoveredItemHash(null)}
                                            />
                                        )) || []}
                                    </div>
                                </div>
                            </div>

                            {/* Stats Section */}
                            {template?.stats && (
                                <div className="node-section section-stats" style={{ marginTop: '20px' }}>
                                    <div className="node-section-header-prefixed">| STATS</div>
                                    <div className="stats-grid" style={{ display: 'flex', gap: '20px' }}>
                                        <StatItem value={template.stats.mobility} label="Mob" icon="mobility" />
                                        <StatItem value={template.stats.resilience} label="Res" icon="resilience" />
                                        <StatItem value={template.stats.recovery} label="Rec" icon="recovery" />
                                        <StatItem value={template.stats.discipline} label="Dis" icon="discipline" />
                                        <StatItem value={template.stats.intellect} label="Int" icon="intellect" />
                                        <StatItem value={template.stats.strength} label="Str" icon="strength" />
                                    </div>
                                </div>
                            )}

                            {/* Loadout & Gear Section */}
                            <div className="node-section section-gear">
                                <div className="node-section-header-prefixed">| LOADOUT & GEAR</div>
                                <div className="synergy-build-overlay__gear-horizontal-grid">
                                    {/* Weapons */}
                                    {hasDIMData ? (
                                        [
                                            { def: dimLoadoutData?.kineticDef, item: dimLoadoutData?.kinetic },
                                            { def: dimLoadoutData?.energyDef, item: dimLoadoutData?.energy },
                                            { def: dimLoadoutData?.powerDef, item: dimLoadoutData?.power }
                                        ].map((w, i) => w.def && (
                                            <div key={i} className="gear-item-horizontal" onMouseEnter={() => setHoveredItemHash(w.def?.hash || null)} onMouseLeave={() => setHoveredItemHash(null)}>
                                                <RichItemIcon hash={w.def.hash} instance={w.item || { state: 4 }} />
                                                <div className="gear-item-info">
                                                    <span className="build-item__label--compact">{w.def.displayProperties?.name}</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        cardIcons.weapons.map((w, i) => (
                                            <div key={i} className="gear-item-horizontal" onMouseEnter={() => setHoveredItemHash(w.hash)} onMouseLeave={() => setHoveredItemHash(null)}>
                                                <RichItemIcon hash={w.hash} instance={{ state: 4 }} />
                                                <div className="gear-item-info">
                                                    <span className="build-item__label--compact">{w.name}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}

                                    {/* Armor */}
                                    {hasDIMData && dimLoadoutData ? (
                                        [
                                            { def: dimLoadoutData.helmetDef, group: dimLoadoutData.modGroups.helmet, cosmetics: dimLoadoutData.helmetCosmetics, itemData: dimLoadoutData.helmet },
                                            { def: dimLoadoutData.gauntletsDef, group: dimLoadoutData.modGroups.arms, cosmetics: dimLoadoutData.gauntletsCosmetics, itemData: dimLoadoutData.gauntlets },
                                            { def: dimLoadoutData.chestDef, group: dimLoadoutData.modGroups.chest, cosmetics: dimLoadoutData.chestCosmetics, itemData: dimLoadoutData.chest },
                                            { def: dimLoadoutData.legsDef, group: dimLoadoutData.modGroups.legs, cosmetics: dimLoadoutData.legsCosmetics, itemData: dimLoadoutData.legs },
                                            { def: dimLoadoutData.classItemDef, group: dimLoadoutData.modGroups.classItem, cosmetics: dimLoadoutData.classItemCosmetics, itemData: dimLoadoutData.classItem }
                                        ].map((item, idx) => item.def && (
                                            <div key={idx} className="gear-item-horizontal" onMouseEnter={() => setHoveredItemHash(item.def?.hash || null)} onMouseLeave={() => setHoveredItemHash(null)}>
                                                <RichItemIcon hash={item.def.hash} instance={item.itemData} />
                                                <div className="gear-item-info">
                                                    <span className="build-item__label--compact">{item.def.displayProperties?.name}</span>
                                                    {renderCompactMods(item.group, item.cosmetics.ornament, item.cosmetics.shader)}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        cardIcons.armor && (
                                            <div className="gear-item-horizontal" onMouseEnter={() => setHoveredItemHash(cardIcons.armor?.hash || null)} onMouseLeave={() => setHoveredItemHash(null)}>
                                                <RichItemIcon hash={cardIcons.armor.hash} instance={{ state: 4 }} />
                                                <div className="gear-item-info">
                                                    <span className="build-item__label--compact">{cardIcons.armor.name}</span>
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Build Description Panel */}
                    <div className={`synergy-build-overlay__lore-panel ${isLoreOpen ? 'synergy-build-overlay__lore-panel--open' : ''}`}>
                        <div className="lore-panel__header">
                            <h2 className="lore-panel__title">{build.name}</h2>
                            <div className="lore-panel__subtitle">
                                {hasDIMData ? dimLoadoutData?.className : className} // {hasDIMData ? (dimLoadoutData?.subclassDef as any)?.displayProperties?.name : template?.playstyle || 'Custom Build'}
                            </div>
                        </div>
                        <div className="lore-panel__content">
                            {build.notes || originalLoadout?.notes || 'No description provided for this build.'}
                        </div>
                        <div className="lore-panel__meta">
                            <div className="lore-panel__meta-item">
                                <span className="meta-label">Saved</span>
                                <span className="meta-value">{new Date(build.createdAt).toLocaleDateString()}</span>
                            </div>
                            {build.tags && build.tags.length > 0 && (
                                <div className="lore-panel__meta-item">
                                    <span className="meta-label">Tags</span>
                                    <span className="meta-value">{build.tags.join(', ')}</span>
                                </div>
                            )}
                            {template?.source && (
                                <div className="lore-panel__meta-item">
                                    <span className="meta-label">Source</span>
                                    <span className="meta-value">{template.source.toUpperCase()}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="synergy-build-overlay__footer-bar">
                        <div className="key-prompt" onClick={() => { onEquip?.(build); setIsDetailsOpen(false); }}>
                            <span className="key-cap">F</span>
                            <span className="key-label">Equip Build</span>
                        </div>
                        {template?.source !== 'exoengine' && (
                            <>
                                <div className="key-prompt" onClick={handleCopyExoEngineLink}>
                                    <span className="key-cap">S</span>
                                    <span className="key-label">Copy ExoEngine Link</span>
                                </div>
                                <div className="key-prompt" onClick={handleCopyDIMLink}>
                                    <span className="key-cap">G</span>
                                    <span className="key-label">Copy DIM Link</span>
                                </div>
                            </>
                        )}
                        <div className="key-prompt key-prompt--danger" onClick={() => setShowDeleteConfirm(true)}>
                            <span className="key-cap">Del</span>
                            <span className="key-label">Delete</span>
                        </div>
                        <div className="key-prompt" onClick={() => setIsUiVisible(!isUiVisible)}>
                            <span className="key-cap">Ctrl</span>
                            <span className="key-label">{isUiVisible ? 'Hide Menu' : 'Show Menu'}</span>
                        </div>
                        <div className="key-prompt" onClick={() => setIsDetailsOpen(false)}>
                            <span className="key-cap">Esc</span>
                            <span className="key-label">Close</span>
                        </div>
                    </div>

                    {/* Rich Tooltip Portal */}
                    {hoveredItemHash && <RichTooltip item={{ hash: hoveredItemHash }} />}

                    <ConfirmationModal
                        isOpen={showDeleteConfirm}
                        title="DELETE BUILD?"
                        message="Are you sure you want to delete this recorded build? This action cannot be undone."
                        confirmText="Delete"
                        cancelText="Keep"
                        onConfirm={() => {
                            setShowDeleteConfirm(false);
                            onDelete?.(build.id);
                            setIsDetailsOpen(false);
                        }}
                        onCancel={() => setShowDeleteConfirm(false)}
                        type="danger"
                    />
                </div>,
                document.body
            )}
        </>
    );
}

function StatItem({ value, label, icon }: { value: number; label: string; icon: string }) {
    const tier = Math.floor(value / 10);
    return (
        <div className="stat-item-display" title={`${label}: ${value}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div className={`stat-icon stat-icon-${icon}`} style={{ width: '24px', height: '24px', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', filter: 'brightness(1.5)' }} />
            <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>T{tier}</div>
            <div style={{ fontSize: '0.6rem', opacity: 0.6, textTransform: 'uppercase' }}>{label}</div>
        </div>
    );
}
