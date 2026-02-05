import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { manifestService } from '../services/bungie/manifest.service';
import { loadoutLinkService } from '../services/bungie/loadout-link.service';
import { BUCKET_HASHES } from '../config/bungie.config';
import { getBungieUrl } from '../utils/url-helper';
import { LoadingScreen } from '../components/common/Loader';
import { SubclassNode } from '../components/builder/SubclassNode';
import { RichTooltip } from '../components/builder/RichTooltip';
import { distributeLoadoutMods } from '../utils/loadout-mods.utils';
import { errorLog } from '../utils/logger';
import { RichItemIcon } from '../components/common/RichItemIcon';
import { categorizeMods } from '../utils/loadout-mods.utils';
import './LoadoutViewerPage.css';

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

export function LoadoutViewerPage() {
    const { encodedData } = useParams<{ encodedData?: string }>();
    const navigate = useNavigate();
    const [activeLoadout, setActiveLoadout] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isManifestLoaded, setIsManifestLoaded] = useState(false);
    const [isMenuVisible, setIsMenuVisible] = useState(true);
    const [hoveredItemHash, setHoveredItemHash] = useState<number | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // Handle mouse move for parallax
    const handleMouseMove = (e: React.MouseEvent) => {
        const { clientX, clientY } = e;
        const { innerWidth, innerHeight } = window;
        // Normalized values from -0.5 to 0.5
        const x = (clientX / innerWidth) - 0.5;
        const y = (clientY / innerHeight) - 0.5;
        setMousePos({ x, y });
    };

    // Notification banner state
    const [notification, setNotification] = useState<string | null>(null);
    const [notificationTimeout, setNotificationTimeout] = useState<NodeJS.Timeout | null>(null);

    // Show notification banner
    const showNotification = (message: string) => {
        if (notificationTimeout) clearTimeout(notificationTimeout);
        setNotification(message);
        const timeout = setTimeout(() => setNotification(null), 2500);
        setNotificationTimeout(timeout);
    };

    // Ensure manifest is loaded
    useEffect(() => {
        const loadManifest = async () => {
            try {
                if (!manifestService.isLoaded()) {
                    await manifestService.load();
                }
                setIsManifestLoaded(true);
            } catch (err) {
                errorLog('LoadoutViewerPage', 'Failed to load manifest:', err);
                showNotification('Failed to load Destiny 2 database');
            }
        };
        loadManifest();
    }, []);

    // Scroll to top when loadout changes
    useEffect(() => {
        if (activeLoadout) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [activeLoadout]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = async (e: KeyboardEvent) => {
            const activeEl = document.activeElement;
            const isTyping = activeEl && (
                activeEl.tagName === 'INPUT' ||
                activeEl.tagName === 'TEXTAREA' ||
                (activeEl as HTMLElement).isContentEditable
            );

            if (isTyping) return;

            // CTRL - Toggle menu visibility
            if (e.key === 'Control') {
                setIsMenuVisible(p => !p);
            }
            // ESC - Back to agent
            if (e.key === 'Escape') {
                navigate('/agent-wake');
            }
            // G - Copy DIM link
            if ((e.key === 'g' || e.key === 'G') && activeLoadout?.source !== 'exoengine') {
                handleCopyDIMLink();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeLoadout, navigate]);

    // Copy ExoEngine link
    const handleCopyExoEngineLink = async () => {
        if (!activeLoadout) return;

        try {
            const link = await loadoutLinkService.generateExoEngineLink(activeLoadout);
            await navigator.clipboard.writeText(link);
            showNotification('Link copied to clipboard');
        } catch (err) {
            errorLog('LoadoutViewerPage', 'Failed to copy link:', err);
            showNotification('Failed to copy link');
        }
    };

    // Copy DIM link
    const handleCopyDIMLink = async () => {
        if (!activeLoadout) return;

        try {
            const link = loadoutLinkService.generateDIMCompatibleLink(activeLoadout);
            navigator.clipboard.writeText(link);
            showNotification('Link copied to clipboard');
        } catch (err) {
            errorLog('LoadoutViewerPage', 'Failed to copy DIM link:', err);
            showNotification('Failed to copy link');
        }
    };



    // Auto-parse
    useEffect(() => {
        if (encodedData && isManifestLoaded) {
            (async () => {
                try {
                    const decoded = await loadoutLinkService.parseLoadoutLink(`/loadout/${encodedData}`);
                    setActiveLoadout(decoded);
                    setIsLoading(false);
                } catch (err) {
                    errorLog('LoadoutViewerPage', 'Full decode failed:', err);
                    setError('This loadout link is invalid or expired');
                    setIsLoading(false);
                }
            })();
        } else if (!encodedData && isManifestLoaded) {
            setIsLoading(false);
        }
    }, [encodedData, isManifestLoaded]);

    if (error) {
        return (
            <div className="loadout-viewer-error">
                <div className="error-card glass-panel">
                    <h2>SYSTEM ERROR</h2>
                    <p>{error}</p>
                    <button className="btn btn-primary" onClick={() => navigate('/generator')}>Return to Tactical Hub</button>
                </div>
            </div>
        );
    }

    if (isLoading || !isManifestLoaded) {
        return <LoadingScreen message="Syncing Tactical Data..." />;
    }

    const gear: Record<string, any> = {};
    activeLoadout.equipped.forEach((item: any) => {
        const def = manifestService.getItem(item.hash);
        if (!def) return;
        const bucket = def.inventory?.bucketTypeHash;
        if (bucket === BUCKET_HASHES.KINETIC_WEAPONS) gear.kinetic = item;
        else if (bucket === BUCKET_HASHES.ENERGY_WEAPONS) gear.energy = item;
        else if (bucket === BUCKET_HASHES.POWER_WEAPONS) gear.power = item;
        else if (bucket === BUCKET_HASHES.HELMET) gear.helmet = item;
        else if (bucket === BUCKET_HASHES.GAUNTLETS) gear.arms = item;
        else if (bucket === BUCKET_HASHES.CHEST_ARMOR) gear.chest = item;
        else if (bucket === BUCKET_HASHES.LEG_ARMOR) gear.legs = item;
        else if (bucket === BUCKET_HASHES.CLASS_ARMOR) gear.classItem = item;
        else if (bucket === BUCKET_HASHES.SUBCLASS) gear.subclass = item;
    });

    // Helper for build summary icons
    const getIconData = (item: any) => {
        if (!item) return { icon: '', hash: 0 };
        const def = manifestService.getItem(item.hash);
        return {
            icon: getBungieUrl(def?.displayProperties?.icon || ''),
            hash: item.hash
        };
    };

    const buildIcons = {
        subclass: getIconData(gear.subclass),
        super: { icon: '', hash: 0 },
        abilities: [] as any[],
        aspects: [] as any[],
        fragments: [] as any[]
    };

    // Subclass details
    const subclassDef = gear.subclass ? manifestService.getItem(gear.subclass.hash) : null;
    const damageType = subclassDef?.talentGrid?.hudDamageType || 3;
    const elementName = ELEMENT_NAMES[damageType] || 'solar';

    if (gear.subclass?.socketOverrides && subclassDef) {
        const indexToGroup: Record<number, string> = {};
        const HASH_TO_GROUP: Record<number, string> = {
            457473665: 'SUPER',
            2047681910: 'ASPECTS',
            2140934067: 'ASPECTS',
            3400923910: 'ASPECTS',
            764703411: 'ASPECTS',
            271461480: 'FRAGMENTS',
            1313488945: 'FRAGMENTS',
            2819965312: 'FRAGMENTS',
            193371309: 'FRAGMENTS',
            4112185160: 'FRAGMENTS',
            309722977: 'CLASS_ABILITIES',
            3218807805: 'CLASS_ABILITIES',
            1905270138: 'ABILITIES', // Transcendence
        };

        if (subclassDef.sockets?.socketCategories) {
            subclassDef.sockets.socketCategories.forEach((cat: any) => {
                const group = HASH_TO_GROUP[cat.socketCategoryHash];
                if (group) {
                    cat.socketIndexes.forEach((idx: number) => {
                        indexToGroup[idx] = group;
                    });
                }
            });
        }

        Object.entries(gear.subclass.socketOverrides).forEach(([idxStr, hash]) => {
            const idx = parseInt(idxStr);
            const def = manifestService.getItem(hash as number);
            if (!def) return;

            const icon = getBungieUrl(def.displayProperties.icon);
            const data: any = { icon: icon || '', hash: hash as number, idx };
            const group = indexToGroup[idx];

            const category = (def.plug?.plugCategoryIdentifier || "").toLowerCase();
            const name = (def.displayProperties?.name || "").toLowerCase();

            if (group === 'SUPER') {
                buildIcons.super = data;
            } else if (group === 'ASPECTS') {
                if (!buildIcons.aspects.some(a => a.hash === data.hash)) buildIcons.aspects.push(data);
            } else if (group === 'FRAGMENTS') {
                if (!buildIcons.fragments.some(f => f.hash === data.hash)) buildIcons.fragments.push(data);
            } else if (group === 'CLASS_ABILITIES' || group === 'ABILITIES' || category.includes('.ability.')) {
                // Determine order priority: Class -> Jump -> Melee -> Grenade
                let priority = 10;
                if (category.includes('class') || name.includes('rift') || name.includes('dodge') || name.includes('barricade')) priority = 0;
                else if (category.includes('movement') || category.includes('jump')) priority = 1;
                else if (category.includes('melee')) priority = 2;
                else if (category.includes('grenade')) priority = 3;

                data.priority = priority;

                if (!buildIcons.abilities.some(a => a.hash === data.hash) && buildIcons.super.hash !== data.hash) {
                    buildIcons.abilities.push(data);
                }
            }
        });

        // Ensure abilities are sorted by priority
        buildIcons.abilities.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
    } else if (gear.subclass?.socketOverrides) {
        // Fallback for cases where subclassDef is missing or doesn't use categories
        Object.entries(gear.subclass.socketOverrides).forEach(([idxStr, hash]) => {
            const idx = parseInt(idxStr);
            const def = manifestService.getItem(hash as number);
            if (!def) return;

            const icon = getBungieUrl(def.displayProperties.icon);
            const data: any = { icon: icon || '', hash: hash as number, idx };
            const category = (def.plug?.plugCategoryIdentifier || "").toLowerCase();
            const typeName = (def.itemTypeDisplayName || "").toLowerCase();
            const name = (def.displayProperties?.name || "").toLowerCase();

            if (category.includes('.super') || idx === 0) {
                if (category.includes('.super') || !buildIcons.super.hash) buildIcons.super = data;
                if (category.includes('.super')) return;
            }

            if (category.includes('aspect') || typeName.includes('aspect')) {
                if (!buildIcons.aspects.some(a => a.hash === data.hash)) buildIcons.aspects.push(data);
            } else if (category.includes('fragment') || category.includes('facet') || name.includes('facet of')) {
                if (!buildIcons.fragments.some(f => f.hash === data.hash)) buildIcons.fragments.push(data);
            } else {
                let priority = 10;
                if (category.includes('class') || name.includes('rift') || name.includes('dodge') || name.includes('barricade')) priority = 0;
                else if (category.includes('movement') || category.includes('jump')) priority = 1;
                else if (category.includes('melee')) priority = 2;
                else if (category.includes('grenade')) priority = 3;
                data.priority = priority;
                if (!buildIcons.abilities.some(a => a.hash === data.hash) && buildIcons.super.hash !== data.hash) {
                    buildIcons.abilities.push(data);
                }
            }
        });
        buildIcons.abilities.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
    }

    const modGroupsData = distributeLoadoutMods(activeLoadout, gear);
    const { modGroups, armorCosmetics } = modGroupsData;

    // Helper to render compact mods for a slot
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

    const helmetCosmetics = {
        ornament: armorCosmetics.helmet?.ornament ? manifestService.getItem(armorCosmetics.helmet.ornament) : null,
        shader: armorCosmetics.helmet?.shader ? manifestService.getItem(armorCosmetics.helmet.shader) : null
    };
    const armsCosmetics = {
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

    return (
        <div
            className={`loadout-viewer-page synergy-build-overlay synergy-build-overlay--${elementName as any} ${!isMenuVisible ? 'ui-hidden' : ''}`}
            onMouseMove={handleMouseMove}
            style={{
                zIndex: 20000,
                '--parallax-x': mousePos.x,
                '--parallax-y': mousePos.y
            } as any}
        >
            {/* Background Layer with Parallax */}
            <div className="synergy-build-overlay__bg">
                <div className="synergy-build-overlay__pattern" />
                <img
                    src={getBungieUrl(subclassDef?.screenshot || '')}
                    alt=""
                    className="synergy-build-overlay__screenshot"
                />
                <div className="synergy-build-overlay__vignette" />
            </div>

            {notification && (
                <div className="vault-service-alert animate-slide-up">
                    <div className="service-alert-content">
                        <div className="service-alert-icon">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                            </svg>
                        </div>
                        <div className="service-alert-text">
                            <span className="alert-bold">INFO</span>
                            <span className="alert-message">{notification}</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="synergy-build-overlay__header-top-right">
                <div className="synergy-build-overlay__title-area">
                    <h1 className="synergy-build-overlay__title-large">{activeLoadout.name || 'TACTICAL CONFIGURATION'}</h1>
                    <div className="synergy-build-overlay__subtitle-caps">
                        {CLASS_NAMES[activeLoadout.classType].toUpperCase()} // {subclassDef?.displayProperties?.name?.toUpperCase() || 'UNKNOWN SUBCLASS'}
                    </div>
                </div>
            </div>

            <div className="synergy-build-overlay__content">
                <div className="build-section build-section--super">
                    {buildIcons.super.icon && (
                        <div className="super-node-large">
                            <img
                                src={buildIcons.super.icon}
                                alt="Primary Ability"
                                onMouseEnter={() => setHoveredItemHash(buildIcons.super.hash || null)}
                                onMouseLeave={() => setHoveredItemHash(null)}
                            />
                        </div>
                    )}
                </div>

                <div className="build-section--middle">
                    <div className="build-section--middle__top-row">
                        <div className="node-section section-abilities">
                            <div className="node-section-header-prefixed">| ABILITIES</div>
                            <div className="node-section-content">
                                {buildIcons.abilities.map((ability, i) => (
                                    <SubclassNode
                                        key={i}
                                        type="square"
                                        size="normal"
                                        icon={ability.icon}
                                        element={elementName as any}
                                        status="active"
                                        onMouseEnter={() => setHoveredItemHash(ability.hash)}
                                        onMouseLeave={() => setHoveredItemHash(null)}
                                    />
                                ))}
                            </div>
                        </div>

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
                                        onMouseEnter={() => setHoveredItemHash(aspect.hash)}
                                        onMouseLeave={() => setHoveredItemHash(null)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="build-section--middle__bottom-row">
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

                    <div className="build-section--middle__gear-row">
                        <div className="node-section section-gear">
                            <div className="node-section-header-prefixed">| LOADOUT & GEAR</div>
                            <div className="synergy-build-overlay__gear-horizontal-grid">
                                {[
                                    { item: gear.kinetic, label: 'KINETIC' },
                                    { item: gear.energy, label: 'ENERGY' },
                                    { item: gear.power, label: 'POWER' }
                                ].map((w, idx) => (
                                    <div key={`weapon-${idx}`} className={`gear-item-horizontal ${!w.item ? 'gear-item--empty' : ''}`} onMouseEnter={() => w.item && setHoveredItemHash(w.item.hash)} onMouseLeave={() => setHoveredItemHash(null)}>
                                        {w.item ? (
                                            <>
                                                <RichItemIcon hash={w.item.hash} instance={w.item} />
                                                <div className="gear-item-info">
                                                    <span className="build-item__label--compact">{manifestService.getItem(w.item.hash)?.displayProperties?.name}</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="gear-placeholder">
                                                <div className="gear-placeholder__icon" />
                                                <span>{w.label} EMPTY</span>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {[
                                    { item: gear.helmet, group: modGroups.helmet, cosmetics: helmetCosmetics, label: 'HELMET' },
                                    { item: gear.arms, group: modGroups.arms, cosmetics: armsCosmetics, label: 'GAUNTLETS' },
                                    { item: gear.chest, group: modGroups.chest, cosmetics: chestCosmetics, label: 'CHEST' },
                                    { item: gear.legs, group: modGroups.legs, cosmetics: legsCosmetics, label: 'LEGS' },
                                    { item: gear.classItem, group: modGroups.classItem, cosmetics: classItemCosmetics, label: 'CLASS' }
                                ].map((g, idx) => (
                                    <div key={`armor-${idx}`} className={`gear-item-horizontal ${!g.item ? 'gear-item--empty' : ''}`} onMouseEnter={() => g.item && setHoveredItemHash(g.item.hash)} onMouseLeave={() => setHoveredItemHash(null)}>
                                        {g.item ? (
                                            <>
                                                <RichItemIcon hash={g.item.hash} instance={g.item} />
                                                <div className="gear-item-info">
                                                    <span className="build-item__label--compact">{manifestService.getItem(g.item.hash)?.displayProperties?.name}</span>
                                                    {renderCompactMods(g.group, g.cosmetics.ornament, g.cosmetics.shader)}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="gear-placeholder">
                                                <div className="gear-placeholder__icon" />
                                                <span>{g.label} EMPTY</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="synergy-build-overlay__footer-bar">
                <div className="key-prompt" onClick={() => setIsMenuVisible(!isMenuVisible)}>
                    <div className="key-cap">CTRL</div>
                    <div className="key-label">{isMenuVisible ? 'Hide' : 'Show'} Menu</div>
                </div>
                {activeLoadout?.source !== 'exoengine' && (
                    <>
                        <div className="key-prompt" onClick={handleCopyExoEngineLink}>
                            <div className="key-cap">S</div>
                            <div className="key-label">Copy Exo Link</div>
                        </div>
                        <div className="key-prompt" onClick={handleCopyDIMLink}>
                            <div className="key-cap">G</div>
                            <div className="key-label">Copy DIM Link</div>
                        </div>
                    </>
                )}
                <div className="key-prompt" onClick={() => navigate('/agent-wake')}>
                    <div className="key-cap">ESC</div>
                    <div className="key-label">Back</div>
                </div>
            </div>

            {/* Hover Tooltip Overlay */}
            {hoveredItemHash !== null && (
                <div className="fixed-tooltip-container">
                    <RichTooltip
                        item={manifestService.getItem(hoveredItemHash)}
                    />
                </div>
            )}
        </div>
    );
}

export default LoadoutViewerPage;
