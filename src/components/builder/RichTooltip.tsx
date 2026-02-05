import { useMemo, useEffect, useRef, useState, type CSSProperties, memo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { manifestService } from '../../services/bungie/manifest.service';
import { clarityService } from '../../services/bungie/clarity.service';

import { useManifestStore, useProfileStore } from '../../store';
import { getBungieUrl } from '../../utils/url-helper';
import { artifactService } from '../../services/artifact.service';
import MouseLeftIcon from '../../assets/mouse-left-plain.png';
import MouseRightIcon from '../../assets/mouse-right-plain.png';
import { TransferMenu } from './TransferMenu';
import { transferService } from '../../services/bungie/transfer.service';
import './RichTooltip.css';
import { SimpleTooltip } from '../common/SimpleTooltip';

const LockIcon = ({ size = 22 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
        {/* Lock body with keyhole */}
        <rect className="lock-body" x="5" y="11" width="14" height="10" rx="2" ry="2" fill="#000000" />
        {/* Shackle - closed position */}
        <path className="lock-shackle" d="M8 11V7a4 4 0 0 1 8 0v4" stroke="#000000" strokeWidth="2.5" fill="none" />
        {/* Keyhole */}
        <circle cx="12" cy="15" r="1.5" fill="#ffffff" />
        <path d="M12 16.5v1.5" stroke="#ffffff" strokeWidth="1.5" />
    </svg>
);

const UnlockIcon = ({ size = 22 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
        {/* Lock body with keyhole */}
        <rect className="lock-body" x="5" y="11" width="14" height="10" rx="2" ry="2" fill="#000000" />
        {/* Shackle - open position (rotated to the right) */}
        <path className="lock-shackle" d="M8 11V7a4 4 0 0 1 8 0v1" stroke="#000000" strokeWidth="2.5" fill="none" />
        {/* Keyhole */}
        <circle cx="12" cy="15" r="1.5" fill="#ffffff" />
        <path d="M12 16.5v1.5" stroke="#ffffff" strokeWidth="1.5" />
    </svg>
);

interface RichTooltipProps {
    item: any;
    instance?: any;
    characterStats?: any;
    isEquipped?: boolean;
    overrideElement?: 'void' | 'solar' | 'arc' | 'stasis' | 'strand' | 'prismatic';
    inline?: boolean;
    followMouse?: boolean;
    fixedPosition?: { x: number; y: number };
    isFocused?: boolean; // True when zoomed in on the item
    onTransfer?: (characterId: string) => void; // Callback for transfer action
    onEquip?: (characterId: string) => void; // Callback for equip action
    externalShowTransferMenu?: boolean; // External control for showing transfer menu
    onClick?: () => void; // Generic click handler (used for synergy confirm)
    hideZoomButtons?: boolean; // Hide the zoom in/out buttons
    hideStats?: boolean; // New prop to hide investment/character stats
    clickActionLabel?: string; // Custom label for the left-click action (e.g. "Confirm Synergy")
    hideSynergizeAction?: boolean; // Hide the right-click synergize action
    onRightClick?: () => void; // Right-click handler (used for synergize)
}

// Stat Hash Mappings
const ARMOR_STAT_MAP: Record<number, string> = {
    392767087: 'Health',
    4244567218: 'Melee',
    1735777505: 'Grenade',
    144602215: 'Super',
    1943323491: 'Class',
    2996146975: 'Weapons',
};

const WEAPON_STAT_PRIORITY = [
    4043523819, // Impact
    3614673599, // Blast Radius
    2523465841, // Velocity
    1240592695, // Range
    155624089,  // Stability
    943549884,  // Handling
    4188031367, // Reload Speed
    1345609583, // Aim Assist
    3555269338, // Zoom
    2714457168, // Airborne Effectiveness
    2715839340, // Recoil Direction
    4284893193, // Rounds Per Minute
    3871231066, // Magazine
    447667954,  // Draw Time
    2961396640, // Charge Time
    2837207746, // Swing Speed
    2762071195, // Guard Efficiency
    209426660,  // Guard Resistance
    3736848092, // Guard Endurance
    3022301683, // Charge Rate
    925767036,  // Ammo Capacity
    1480404414, // Attack (if present)
];



const WEAPON_STAT_MAP: Record<number, string> = {
    4043523819: 'impact',
    1240592695: 'range',
    155624089: 'stability',
    943549884: 'handling',
    4188031367: 'reloadSpeed',
    1345609583: 'aimAssist',
    3555269338: 'zoom',
    2714457168: 'airborne',
    2715839340: 'recoilDirection',
    4284893193: 'rpm',
    3871231066: 'magazine',
    447667954: 'drawTime',
    2961396640: 'chargeTime',
    3614673599: 'blastRadius',
    2523465841: 'velocity',
    2837207746: 'swingSpeed',
    2762071195: 'guardEfficiency',
    209426660: 'guardResistance',
    3736848092: 'guardEndurance',
    3022301683: 'chargeRate',
    925767036: 'ammoCapacity',
};

// Stats that should ONLY be numeric (no bars)
const NUMERIC_ONLY_STATS = [
    3555269338, // Zoom
    4284893193, // Rounds Per Minute
    2715839340, // Recoil Direction
    3871231066, // Magazine
    447667954,  // Draw Time
    2961396640, // Charge Time
];


const formatDescription = (description?: string) => {
    if (!description) return null;
    return description.split('\n').map((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('•')) {
            return (
                <div key={i} className="rich-tooltip-description-bullet">
                    <span className="bullet-char">•</span>
                    <span className="bullet-content">{trimmed.substring(1).trim()}</span>
                </div>
            );
        }
        return <div key={i} className="rich-tooltip-description-line">{line}</div>;
    });
};

export const RichTooltip = memo(function RichTooltip({
    item,
    instance,
    characterStats,
    overrideElement,
    inline = false,
    followMouse = true,
    fixedPosition,
    isFocused = false,
    onTransfer,
    onEquip,
    externalShowTransferMenu = false,
    onClick,
    hideZoomButtons = false,
    hideStats = false,
    clickActionLabel,
    hideSynergizeAction = false,
    onRightClick,
}: RichTooltipProps) {
    const { isLoaded: manifestLoaded } = useManifestStore();
    const location = useLocation();
    const isLoadoutViewer = location.pathname.includes('/dim-loadout') ||
        location.pathname.includes('/loadout-viewer') ||
        location.pathname.includes('/loadout/') ||
        location.pathname.includes('/builds') ||
        location.pathname.includes('/saved-builds') ||
        location.pathname.includes('/optimizer');
    const isGalaxyView = location.pathname.includes('/builder') || location.pathname.includes('/galaxy');
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [showTransferMenu, setShowTransferMenu] = useState(false);
    const [lockAnimating, setLockAnimating] = useState<'locking' | 'unlocking' | null>(null);
    const [style, setStyle] = useState<CSSProperties>({
        position: 'fixed',
        transition: 'opacity 0.05s ease-out',
        opacity: 0,
        minWidth: '320px',
        pointerEvents: 'none', // Start with none to prevent accidental interactions
        left: '-1000px', // Start off-screen
        top: '-1000px'
    });

    // Open transfer menu when externally triggered
    useEffect(() => {
        if (externalShowTransferMenu) {
            setShowTransferMenu(true);
        }
    }, [externalShowTransferMenu]);

    // Close transfer menu when clicking outside
    useEffect(() => {
        if (!showTransferMenu) return;

        const handleOutsideClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // Don't close if clicking on the menu itself or the lock icon
            if (!target.closest('.transfer-menu-container') && !target.closest('.rich-tooltip-lock-icon')) {
                setShowTransferMenu(false);
            }
        };

        // Add slight delay to avoid closing immediately
        const timeoutId = setTimeout(() => {
            document.addEventListener('click', handleOutsideClick);
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('click', handleOutsideClick);
        };
    }, [showTransferMenu]);

    const def = useMemo(() => {
        if (!manifestLoaded) {
            return;
        }
        const hash = item?.itemHash || item?.hash;
        const result = hash ? manifestService.getItem(hash) : undefined;
        return result;
    }, [item, manifestLoaded]);

    // DIM Standard: Community Description Integration
    const clarityData = useMemo(() => {
        if (!def) return null;

        // 1. Get description for the item itself (e.g. Exotic Intrinsic)
        const itemDesc = clarityService.getRichData(def.hash);

        // 2. Get descriptions for key plugs (traits/perks)
        const perkDescs: Record<number, any> = {};
        if (instance?.sockets) {
            instance.sockets.forEach((s: any) => {
                if (s.plugHash) {
                    const data = clarityService.getRichData(s.plugHash);
                    if (data) perkDescs[s.plugHash] = data;
                }
            });
        }

        return { itemDesc, perkDescs };
    }, [def, instance]);

    // Log when component renders (only when focused with transfer capability)
    useEffect(() => {
        if (isFocused && onTransfer) {
        }
    }, [isFocused, onTransfer, item, def]);

    useEffect(() => {
        if (inline || !followMouse) {
            if (fixedPosition) {
                setStyle(prev => ({
                    ...prev,
                    position: 'fixed',
                    left: `${fixedPosition.x}px`,
                    top: `${fixedPosition.y}px`,
                    opacity: 1
                }));
            } else if (inline) {
                setStyle(prev => ({
                    ...prev,
                    position: 'relative',
                    left: undefined,
                    top: undefined,
                    opacity: 1,
                    zIndex: 1
                }));
            } else {
                // If not inline and no fixed position, but followMouse is false,
                // we assume it's being positioned by a parent (like TooltipManager).
                // We must set opacity to 1 and position to relative so it fits the parent.
                setStyle(prev => ({
                    ...prev,
                    position: 'relative',
                    opacity: 1,
                    zIndex: 1 // Lower z-index for inline/contained tooltips
                }));
            }
            return;
        }

        let initialPositionSet = false;

        const handleMouseMove = (e: MouseEvent) => {
            if (!tooltipRef.current || !followMouse) return;

            const paddingX = 25;
            const paddingY = -25; // Shifted up
            const minTopMargin = 180; // Keep tooltip below emblem area

            const width = tooltipRef.current.offsetWidth;
            const height = tooltipRef.current.offsetHeight;

            let x = e.clientX + paddingX;
            // Always start below the emblem area
            let y = Math.max(minTopMargin, e.clientY + paddingY);

            if (x + width > window.innerWidth - 20) {
                x = e.clientX - width - paddingX;
            }

            // If tooltip would go below screen, clamp it (never flip above minTopMargin)
            if (y + height > window.innerHeight - 150) {
                y = window.innerHeight - height - 150;
            }

            x = Math.max(10, x);
            // Final clamp - ALWAYS stay below minTopMargin
            y = Math.max(minTopMargin, y);

            if (tooltipRef.current) {
                tooltipRef.current.style.left = `${x}px`;
                tooltipRef.current.style.top = `${y}px`;
                tooltipRef.current.style.opacity = '1';
                tooltipRef.current.style.pointerEvents = isFocused ? 'auto' : 'none';
                tooltipRef.current.style.cursor = (isFocused && onTransfer) ? 'pointer' : 'default';
            }

            initialPositionSet = true;
        };

        // Capture current mouse position and show tooltip immediately
        const setInitialPosition = () => {
            if (!tooltipRef.current || initialPositionSet) return;

            // Get current mouse position from document
            const mouseX = (window as any).mouseX || window.innerWidth / 2;
            const mouseY = (window as any).mouseY || window.innerHeight / 2;

            handleMouseMove(new MouseEvent('mousemove', {
                clientX: mouseX,
                clientY: mouseY
            }));
        };

        // Set position immediately with minimal delay
        setInitialPosition();
        requestAnimationFrame(setInitialPosition);

        // Track global mouse position
        const trackMouse = (e: MouseEvent) => {
            (window as any).mouseX = e.clientX;
            (window as any).mouseY = e.clientY;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mousemove', trackMouse);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mousemove', trackMouse);
        };
    }, [fixedPosition, followMouse, inline, isFocused]);

    // HOOKS MUST BE AT THE TOP
    const isWeapon = def?.itemType === 3;
    const isMod = def?.itemType === 19 || def?.itemType === 24;
    const tier = def?.inventory?.tierType === 6 ? 'exotic' :
        def?.inventory?.tierType === 5 ? 'legendary' :
            def?.inventory?.tierType === 4 ? 'rare' : 'common';


    const weaponSocketBonuses = useMemo(() => {
        const bonuses: { yellow: Record<number, number>, red: Record<number, number> } = { yellow: {}, red: {} };
        if (!def || !isWeapon || !instance?.sockets) return bonuses;

        instance.sockets.forEach((s: any) => {
            const plug = manifestService.getItem(s.plugHash);
            if (!plug || !plug.investmentStats) return;

            const category = plug.plug?.plugCategoryIdentifier?.toLowerCase() || '';
            const name = plug.displayProperties?.name?.toLowerCase() || '';

            const isMW = category.includes('masterworks') ||
                category.includes('catalyst') ||
                category.includes('exotic_masterwork') ||
                name.includes('masterwork') ||
                name.includes('catalyst');

            plug.investmentStats.forEach((stat: any) => {
                if (stat.value > 0) {
                    if (isMW) {
                        bonuses.yellow[stat.statTypeHash] = (bonuses.yellow[stat.statTypeHash] || 0) + stat.value;
                    }
                } else if (stat.value < 0) {
                    bonuses.red[stat.statTypeHash] = (bonuses.red[stat.statTypeHash] || 0) + Math.abs(stat.value);
                }
            });
        });
        return bonuses;
    }, [def, instance, isWeapon]);

    const armorSocketBonuses = useMemo(() => {
        const bonuses: { yellow: Record<number, number>, blue: Record<number, number>, red: Record<number, number> } = { yellow: {}, blue: {}, red: {} };
        if (!def || isWeapon || !instance?.sockets) return bonuses;

        const isMasterworked = !!(item?.state && (item.state & 4));

        // 1. Standard Masterwork (+2 to all 6 core stats)
        if (isMasterworked) {
            Object.keys(ARMOR_STAT_MAP).forEach(hash => {
                bonuses.yellow[Number(hash)] = 2;
            });
        }

        instance.sockets.forEach((s: any) => {
            const plug = manifestService.getItem(s.plugHash);
            if (!plug || !plug.investmentStats) return;

            const category = plug.plug?.plugCategoryIdentifier?.toLowerCase() || '';
            // For exotic armor, socket 0, 1, 2, 3 are mods (blue), socket 11 is exotic intrinsic (yellow)
            // For legendary armor, sockets 1, 2, 3, 11 are mods (blue)
            const modSockets = tier === 'exotic' ? [0, 1, 2, 3] : [1, 2, 3, 11];
            const isMod = category.includes('mod') || modSockets.includes(s.socketIndex);

            // 2. Exotic Intrinsic Bonuses (Winter's Guile +30, etc) - Stays Yellow
            // Socket 11 for exotic armor, socket 10 for other cases
            const isExoticIntrinsic = tier === 'exotic' && (s.socketIndex === 10 || s.socketIndex === 11);

            plug.investmentStats.forEach((stat: any) => {
                if (stat.value > 0) {
                    if (isExoticIntrinsic && stat.value > 2) {
                        bonuses.yellow[stat.statTypeHash] = (bonuses.yellow[stat.statTypeHash] || 0) + stat.value;
                    } else if (isMod) {
                        bonuses.blue[stat.statTypeHash] = (bonuses.blue[stat.statTypeHash] || 0) + stat.value;
                    }
                } else if (stat.value < 0) {
                    // Penalty (Tier 6 mods) - Stays Red
                    bonuses.red[stat.statTypeHash] = (bonuses.red[stat.statTypeHash] || 0) + Math.abs(stat.value);
                }
            });
        });

        return bonuses;
    }, [def, instance, isWeapon, tier, item?.state]);

    // 3. Stats logic
    const allStats = useMemo(() => {
        if (!def) return [];
        // Armor stats are in instance.stats (an object), weapon stats are in def.stats correctly handled by weaponStats mapping
        const statsSource = isWeapon ? def.stats?.stats : (instance as any)?.stats;
        if (!statsSource) return [];

        let sourceEntries: any[];
        if (isWeapon) {
            sourceEntries = Object.entries(statsSource);
        } else {
            // Convert ArmorStats object { mobility, resilience, ... } to array of { statHash, value }
            sourceEntries = [
                { statHash: 2996146975, value: (statsSource as any).mobility },
                { statHash: 392767087, value: (statsSource as any).resilience },
                { statHash: 1943323491, value: (statsSource as any).recovery },
                { statHash: 1735777505, value: (statsSource as any).discipline },
                { statHash: 144602215, value: (statsSource as any).intellect },
                { statHash: 4244567218, value: (statsSource as any).strength }
            ];
        }

        return (sourceEntries as any[]).map((entry: any) => {
            let hash: number;
            let statDef: any;

            if (isWeapon) {
                hash = Number(entry[0]);
                statDef = entry[1];
            } else {
                hash = entry.statHash;
                statDef = entry;
            }

            const statInfo = manifestService.getStat(hash);
            const isSword = def.itemSubType === 10 || def.itemTypeDisplayName?.toLowerCase().includes('sword');

            if (!statInfo || !statInfo.name ||
                (statInfo as any).hash === 1845991845 || // Power
                (statInfo as any).hash === 1480404490 || // Power
                (statInfo as any).hash === 3871231033 || // Attack
                (statInfo as any).hash === 1935470627 || // Attack
                statInfo.name.toLowerCase() === 'attack' ||
                statInfo.name.toLowerCase() === 'power' ||
                (isSword && (
                    statInfo.name.toLowerCase() === 'stability' ||
                    statInfo.name.toLowerCase() === 'guard efficiency' ||
                    statInfo.name.toLowerCase() === 'ammo generation' ||
                    (statInfo as any).hash === 155624089 || // Stability
                    (statInfo as any).hash === 2762071195   // Guard Efficiency
                ))
            ) {
                return null;
            }

            let totalValue = statDef.value;
            if (instance) {
                if (isWeapon && (instance as any).weaponStats) {
                    const key = WEAPON_STAT_MAP[hash];
                    if (key && (instance as any).weaponStats[key] !== undefined) {
                        totalValue = (instance as any).weaponStats[key];
                    }
                }
            }

            const yellowVal = isWeapon ? (weaponSocketBonuses.yellow[hash] || 0) : (armorSocketBonuses.yellow[hash] || 0);
            const blueVal = isWeapon ? 0 : (armorSocketBonuses.blue[hash] || 0);
            const redVal = isWeapon ? (weaponSocketBonuses.red[hash] || 0) : (armorSocketBonuses.red[hash] || 0);

            // Base = Total - Positive Bonuses
            const whiteValue = Math.max(0, totalValue - yellowVal - blueVal);

            return {
                hash,
                name: statInfo.name,
                value: totalValue,
                whiteValue,
                yellowValue: yellowVal,
                blueValue: blueVal,
                redValue: redVal
            };
        }).filter(Boolean).sort((a: any, b: any) => {
            if (isWeapon) {
                const indexA = WEAPON_STAT_PRIORITY.indexOf(a.hash);
                const indexB = WEAPON_STAT_PRIORITY.indexOf(b.hash);
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;
            } else {
                const armorOrder = [2996146975, 392767087, 1943323491, 1735777505, 144602215, 4244567218];
                return armorOrder.indexOf(a.hash) - armorOrder.indexOf(b.hash);
            }
            return 0;
        });
    }, [def, instance, isWeapon, weaponSocketBonuses, armorSocketBonuses]);

    const socketPlugs = useMemo(() => {
        if (!def?.sockets?.socketEntries) return [];

        return def.sockets.socketEntries.map((socket: any, index: number) => {
            let activePlugHash = socket.singleInitialItemHash;
            if (instance?.sockets) {
                const instanceSocket = instance.sockets.find((s: any) => s.socketIndex === index);
                if (instanceSocket?.plugHash) activePlugHash = instanceSocket.plugHash;
            }
            if (!activePlugHash) return null;

            const plugDef = manifestService.getItem(activePlugHash);
            if (!plugDef) return null;

            return {
                index,
                hash: activePlugHash,
                name: plugDef.displayProperties?.name,
                icon: plugDef.displayProperties?.icon,
                description: plugDef.displayProperties?.description,
                investmentStats: plugDef.investmentStats,
                plugCategoryIdentifier: plugDef.plug?.plugCategoryIdentifier,
                isIntrinsic: index === 0, // Default assumption
                isEnhanced: plugDef.plug?.plugCategoryIdentifier?.includes('enhanced') ||
                    plugDef.displayProperties?.name?.toLowerCase().includes('enhanced') ||
                    plugDef.inventory?.tierType === 6
            };
        }).filter(Boolean);
    }, [def, instance]);

    // Extract equipped mods for armor items (sockets that contain actual mods)
    const armorModSockets = useMemo(() => {
        if (!def || isWeapon || !instance?.sockets) return [];

        // For exotic armor, mod slots are typically 0-3
        // For legendary armor, mod slots are typically 1-3 and 11
        const modSlotIndices = tier === 'exotic' ? [0, 1, 2, 3] : [1, 2, 3, 11];

        return instance.sockets
            .filter((s: any) => modSlotIndices.includes(s.socketIndex) && s.plugHash)
            .map((s: any) => {
                const plugDef = manifestService.getItem(s.plugHash);
                if (!plugDef) return null;

                const category = plugDef.plug?.plugCategoryIdentifier?.toLowerCase() || '';
                const name = plugDef.displayProperties?.name || '';

                // Skip empty mod slots and intrinsic perks
                if (!name ||
                    name.toLowerCase().includes('empty') ||
                    category.includes('intrinsic') ||
                    category.includes('armor_skins')) {
                    return null;
                }

                // Only include actual mods (armor mods, general mods, etc.)
                const isMod = category.includes('mod') ||
                    category.includes('enhancements') ||
                    plugDef.itemType === 19; // Mod item type

                if (!isMod) return null;

                return {
                    socketIndex: s.socketIndex,
                    hash: s.plugHash,
                    name: name,
                    icon: plugDef.displayProperties?.icon,
                    description: plugDef.displayProperties?.description
                };
            })
            .filter(Boolean);
    }, [def, instance, isWeapon, tier]);

    // CONDITIONAL RETURNS NOW GO HERE
    if (!def) return null;

    const plugCategory = def.plug?.plugCategoryIdentifier || '';
    const isSubclassAbility = !!(
        plugCategory &&
        /super|grenade|melee|movement|class_abilities|aspects|fragments|facets|whisper/i.test(plugCategory)
    ) || def.itemType === 20; // Removed itemType 19 (mods) from subclass ability check

    const itemType = def.itemTypeDisplayName || 'Unknown';



    // Render subclass tooltip for subclasses
    if (def.itemType === 16) {
        const element = getAbilityElement(def);
        const icon = def.displayProperties?.icon ? getBungieUrl(def.displayProperties.icon) : null;
        const name = def.displayProperties?.name || 'Unknown';
        const typeDisplay = def.itemTypeDisplayName || 'Subclass';
        const flavorText = def.displayProperties?.description;

        // Find the Super in sockets
        let superName = '';
        let superDesc = '';
        if (instance?.sockets) {
            const superSocket = instance.sockets.find((s: any) => {
                if (!s.plugHash) return false;
                const plug = manifestService.getItem(s.plugHash);
                return plug?.plug?.plugCategoryIdentifier?.toLowerCase().includes('super');
            });
            if (superSocket?.plugHash) {
                const plug = manifestService.getItem(superSocket.plugHash);
                superName = plug?.displayProperties?.name || '';
                superDesc = plug?.displayProperties?.description || '';
            }
        }

        // Stat mapping for the 6 core stats
        const SUBCLASS_STAT_ORDER = [
            { hash: 2996146975, name: 'Weapons' }, // Mobility
            { hash: 392767087, name: 'Health' },  // Resilience
            { hash: 1943323491, name: 'Class' },   // Recovery
            { hash: 1735777505, name: 'Grenade' }, // Discipline
            { hash: 144602215, name: 'Super' },    // Intellect
            { hash: 4244567218, name: 'Melee' },   // Strength
        ];

        const subclassContent = (
            <div className="rich-tooltip-container" ref={tooltipRef} style={style}>
                <div className={`rich-tooltip-wrapper rich-tooltip-frame ${tier} subclass-${element}`}>
                    <div className="rich-tooltip-header">
                        <div className="rich-tooltip-header-top">
                            <div className="subclass-tooltip-header-left">
                                <div className="rich-tooltip-name">{name}</div>
                                <div className="rich-tooltip-subtitle">{typeDisplay}</div>
                            </div>
                            {icon && <img src={icon} alt="" className="subclass-tooltip-icon" />}
                        </div>
                    </div>
                    <div className="rich-tooltip-main">
                        {flavorText && (
                            <div className="subclass-tooltip-flavor">
                                <em>{flavorText}</em>
                            </div>
                        )}

                        {!hideStats && (
                            <div className="subclass-tooltip-stats">
                                {SUBCLASS_STAT_ORDER.map(stat => {
                                    const val = characterStats?.[stat.name.toLowerCase()] || (instance as any)?.stats?.[stat.name.toLowerCase()] || 0;
                                    return (
                                        <div key={stat.hash} className="subclass-tooltip-stat-row">
                                            <span className="subclass-tooltip-stat-label">{stat.name}</span>
                                            <div className="subclass-tooltip-stat-bar-outer">
                                                <div
                                                    className="subclass-tooltip-stat-bar-inner"
                                                    style={{ width: `${Math.min(100, (val / 100) * 100)}%` }}
                                                />
                                            </div>
                                            <span className="subclass-tooltip-stat-value">{val}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {superName && (
                            <div className="subclass-tooltip-super">
                                <div className="subclass-tooltip-super-name">{superName}</div>
                                <div className="subclass-tooltip-super-desc">{superDesc}</div>
                            </div>
                        )}
                    </div>
                    {!isLoadoutViewer && (!hideZoomButtons || clickActionLabel || (onRightClick && !hideSynergizeAction)) && (
                        <div className="rich-tooltip-footer">
                            {clickActionLabel ? (
                                <div
                                    className="rich-tooltip-control"
                                    onClick={(e) => {
                                        if (onClick) {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            onClick();
                                        }
                                    }}
                                    style={{
                                        pointerEvents: 'auto',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <img src={MouseLeftIcon} className="rich-tooltip-mouse-icon" alt="L" />
                                    <span>{clickActionLabel}</span>
                                </div>
                            ) : (
                                <div className="rich-tooltip-control">
                                    <img src={MouseLeftIcon} alt="" className="rich-tooltip-mouse-icon" />
                                    <span>Edit</span>
                                </div>
                            )}
                            {onRightClick && !hideSynergizeAction && (
                                <div
                                    className="rich-tooltip-control"
                                    onContextMenu={(e) => {
                                        if (onRightClick) {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            onRightClick();
                                        }
                                    }}
                                    style={{
                                        pointerEvents: 'auto',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <img src={MouseRightIcon} className="rich-tooltip-mouse-icon" alt="R" />
                                    <span>Synergize</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
        return inline ? subclassContent : createPortal(subclassContent, document.body);
    }

    // Render ability tooltip for subclass abilities
    if (isSubclassAbility) {
        const abilityElement = overrideElement || getAbilityElement(def);
        // Resolve icon URL — manifest returns full URLs from getItem()
        const rawIcon = def.displayProperties?.icon || '';
        const abilityIcon = rawIcon.startsWith('http') ? rawIcon : rawIcon ? getBungieUrl(rawIcon) : null;
        const abilityName = def.displayProperties?.name || 'Unknown';
        const abilityType = def.itemTypeDisplayName || plugCategory.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Ability';

        // Description Fallback: Try item -> sandbox perks -> socket entries
        let abilityDesc = def.displayProperties?.description;
        if (!abilityDesc && def.perks?.length) {
            abilityDesc = def.perks.map((p: any) => {
                if (!p.perkHash) return null;
                const perk = manifestService.getPerk(p.perkHash);
                return perk?.description;
            }).filter(Boolean).join('\n');
        }
        if (!abilityDesc && def.sockets?.socketEntries) {
            // Some fragments hide their description in a socket (usually the first non-empty/non-reusable one)
            const descSocket = def.sockets.socketEntries.find((s: any) => {
                if (!s.singleInitialItemHash) return false;
                const plug = manifestService.getItem(s.singleInitialItemHash);
                return plug?.displayProperties?.description && plug.displayProperties.description.length > 5;
            });
            if (descSocket) {
                const plug = manifestService.getItem(descSocket.singleInitialItemHash);
                abilityDesc = plug?.displayProperties?.description || '';
            }
        }
        abilityDesc = abilityDesc || '';

        // Content Cleanup: Deduplicate stats in description
        // Remove lines that look like "+10 Capability" or "-10 Capability" from the text
        // because we show them in the dedicated stats section.
        if (abilityDesc) {
            abilityDesc = abilityDesc.split('\n')
                .filter(line => !/^[\+\-]\d+\s/.test(line.trim()))
                .join('\n')
                .trim();
        }

        // Element icon from Bungie API
        const elementIcon = manifestService.getDamageTypeIcon(abilityElement as any);
        const elementIconUrl = elementIcon ? (elementIcon.startsWith('http') ? elementIcon : getBungieUrl(elementIcon)) : null;

        // Stat bonuses for fragments/aspects
        const statBonuses = (def.investmentStats || []).filter((s: any) => s.value !== 0);
        const statBonusEntries = statBonuses.map((s: any) => {
            const statInfo = manifestService.getStat(s.statTypeHash);
            // Filter out "Fragment Cost" (redundant internal stat)
            if (statInfo?.name === 'Fragment Cost') return null;

            const iconUrl = statInfo?.icon ? (statInfo.icon.startsWith('http') ? statInfo.icon : getBungieUrl(statInfo.icon)) : null;

            return statInfo?.name ? {
                name: statInfo.name,
                value: s.value,
                hash: s.statTypeHash,
                icon: iconUrl
            } : null;
        }).filter(Boolean) as Array<{ name: string; value: number; hash: number; icon: string | null }>;

        const abilityContent = (
            <div className="rich-tooltip-container" ref={tooltipRef} style={style}>
                <div className={`rich-tooltip-wrapper rich-tooltip-frame ability-${abilityElement}`}>
                    <div className="rich-tooltip-header">
                        <div className="rich-tooltip-header-top">
                            {abilityIcon && <img src={abilityIcon} alt="" className="rich-tooltip-header-ability-icon" />}
                            <div>
                                <div className="rich-tooltip-name">{abilityName}</div>
                                <div className="rich-tooltip-subtitle">
                                    <div className="rich-tooltip-subtitle-row">
                                        {elementIconUrl && <img src={elementIconUrl} alt="" className="rich-tooltip-element-icon-sm" />}
                                        <span>{abilityType}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="rich-tooltip-main">
                        {abilityDesc && (
                            <div className="rich-tooltip-ability-description">{abilityDesc}</div>
                        )}
                        {!hideStats && statBonusEntries.length > 0 && (
                            <div className="rich-tooltip-ability-stats">
                                {statBonusEntries.map((s, i) => (
                                    <div key={i} className={`rich-tooltip-ability-stat-row ${s.value > 0 ? 'positive' : 'negative'}`}>
                                        <div className="rich-tooltip-ability-stat-left">
                                            {s.icon && <img src={s.icon} alt="" className="rich-tooltip-ability-stat-icon" />}
                                            <span className="rich-tooltip-ability-stat-value">
                                                {s.value > 0 ? '+' : ''}{s.value}
                                            </span>
                                        </div>
                                        <span className="rich-tooltip-ability-stat-name">{s.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
        return inline ? abilityContent : createPortal(abilityContent, document.body);
    }

    // 1. Core Definitions - Already handled above

    // Ammo Info


    // 2. Power & Damage
    const power = instance?.power || 0;
    const damageType = instance?.damageType || def?.defaultDamageType || 1;
    const damageTypeClass = getDamageTypeClass(damageType);

    const barStats = allStats.filter(s => !NUMERIC_ONLY_STATS.includes(s!.hash));
    const numericStats = allStats.filter(s => NUMERIC_ONLY_STATS.includes(s!.hash));



    // 4. Perks
    // Unified Perk Logic
    const gearTier = (instance as any)?.gearTier || 0;

    const intrinsic0 = socketPlugs.find((s: any) => s.index === 0);

    let armorExoticIntrinsic: any = null;
    let weaponIntrinsic: any = null;

    const filterPlugs = (plugs: any[]) => plugs.filter(s => s && !s.name?.toLowerCase().includes('empty') && !s.name?.toLowerCase().includes('deprecated'));

    if (!isWeapon) {
        if (tier === 'exotic') {
            // Exotic: socket 11 at bottom
            armorExoticIntrinsic = filterPlugs([socketPlugs.find((s: any) => s.index === 11)])[0];
        }
    } else {
        weaponIntrinsic = intrinsic0;
    }
    const itemName = (def.displayProperties?.name || '').toLowerCase();
    const isErgoSum = itemName.includes('ergo sum');

    const unfilteredTrait1 = socketPlugs.find((s: any) => s.index === 3);
    const unfilteredTrait2 = socketPlugs.find((s: any) => s.index === 4);

    // Explicitly hide socket 3 for Ergo Sum as requested
    const trait1 = isErgoSum ? null : filterPlugs([unfilteredTrait1])[0];
    const trait2 = filterPlugs([unfilteredTrait2])[0];

    // Ergo Sum specific "Debug" / Exotic Trait sockets (usually index 6 or 7 for its unique random rolls)
    const unfilteredExoticTrait = isErgoSum ? (socketPlugs.find((s: any) => s.index === 6) || socketPlugs.find((s: any) => s.index === 7)) : null;
    // For Ergo Sum, we explicitly WANT to see the "debug" sockets (damage mods/frames) even if they are labeled as deprecated
    const weaponExoticTrait = isErgoSum ? unfilteredExoticTrait : filterPlugs([unfilteredExoticTrait])[0];

    // 5. Build Content
    const flavorText = def.flavorText;
    const damageIcon = manifestService.getDamageTypeIcon(damageTypeClass as any);

    // 6. Objective Info
    const pveTracker = (instance as any)?.objectives?.find((o: any) => o.objectiveHash === 90275515 || o.objectiveHash === 2579044636 || o.objectiveHash === 73837075 || o.objectiveHash === 3387796140);
    const pvpTracker = (instance as any)?.objectives?.find((o: any) => o.objectiveHash === 1501870536 || o.objectiveHash === 2439952408 || o.objectiveHash === 74070459 || o.objectiveHash === 890482414 || o.objectiveHash === 2109364169);

    // Check slot 9 for kill tracker plug (common location for kill trackers)
    let slot9Tracker = null;
    if (isWeapon && instance?.sockets) {
        const slot9Socket = instance.sockets.find((s: any) => s.socketIndex === 9);
        if (slot9Socket?.plugHash) {
            const slot9Plug = manifestService.getItem(slot9Socket.plugHash);
            // Check if this plug has objectives (kill tracker data)
            if (slot9Plug?.plug && (slot9Plug.plug as any).plugObjectives) {
                const trackerObjective = (slot9Plug.plug as any).plugObjectives.find((obj: any) =>
                    obj.objectiveHash === 90275515 || // PvE Tracker
                    obj.objectiveHash === 1501870536 || // PvP Tracker
                    obj.objectiveHash === 2579044636 || // Another PvE variant
                    obj.objectiveHash === 2439952408 || // Another PvP variant
                    obj.objectiveHash === 373673523    // Generic tracker
                );
                if (trackerObjective) {
                    // Find the actual progress from instance objectives
                    const progressData = (instance as any)?.objectives?.find((o: any) => o.objectiveHash === trackerObjective.objectiveHash);
                    if (progressData) {
                        slot9Tracker = progressData;
                    }
                }
            }
        }
    }

    const killTracker = pveTracker || pvpTracker || slot9Tracker || (instance as any)?.objectives?.find((o: any) => o.visible || o.objectiveHash === 373673523);
    const killCount = killTracker ? killTracker.progress?.toLocaleString() : null;
    const trackerLabel = pvpTracker ? 'Guardians Defeated' : (pveTracker ? 'Combatants Defeated' : 'Enemies Defeated');

    const isMasterwork = !!(item?.state && (item.state & 4)) || tier === 'exotic';
    const isCrafted = !!(item?.state && (item.state & 8));
    const isEnhancedLegendary = gearTier >= 2 && gearTier <= 5;

    const shouldShowTraitGlow = (t: any) => {
        if (!isWeapon) {
            // Only socket 11 on Exotics gets the golden glow
            return tier === 'exotic' && t.index === 11;
        }
        // Legendary weapons get the glow if explicitly enhanced, crafted, or Tier 2-5
        return (t as any)?.isEnhanced || isCrafted || isEnhancedLegendary;
    };

    // Header effects (glow and yellow bar) only for Masterworked items
    const showMasterworkEffects = isMasterwork;
    const showGlow = isMasterwork;



    // Low-level Energy info (Capacity)
    const energyCapacity = (instance as any)?.energy?.energyCapacity || 0;
    // For armor, damageIcon is usually the element icon (Solar, Void, etc.)

    const isHighPower = power >= 200;



    // Determine Armor Archetype (From Index 6)
    let archetypeLabel = null;
    let archetypeIcon = null;

    if (!isWeapon) {
        // User requested: Index 6 is location. Only show if it is explicitly an armor archetype.
        const archetypePlug = socketPlugs.find((s: any) => s.index === 6);

        if (archetypePlug && archetypePlug.plugCategoryIdentifier?.includes('archetype')) {
            archetypeLabel = archetypePlug.name;
            if (archetypePlug.icon) {
                archetypeIcon = getBungieUrl(archetypePlug.icon);
            }
        }
    }

    // RENDER VIA PORTAL TO BODY
    const content = (
        <div
            className={`rich-tooltip-container ${isGalaxyView ? 'galaxy-view' : ''}`}
            ref={tooltipRef}
            style={{
                ...style,
                pointerEvents: (isFocused || onClick) ? 'auto' : 'none',
                cursor: (onClick || (isFocused && onTransfer)) ? 'pointer' : 'default'
            }}
            onMouseDown={(e) => {
                // Prevent 3D controls from catching this event and interpreting it as a camera drag
                e.stopPropagation();
            }}
            onClick={(e) => {
                if (onClick) {
                    e.stopPropagation();
                    e.preventDefault();
                    onClick();
                } else if (isFocused && onTransfer) {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowTransferMenu(true);
                }
            }}
        >
            <div className={`rich-tooltip-wrapper rich-tooltip-frame ${tier} ${isMod ? 'mod-grey' : ''}`}>
                <div className="rich-tooltip-header">
                    {showMasterworkEffects && <div className="rich-tooltip-masterwork-bar" />}
                    {showGlow && <div className="rich-tooltip-header-glow" />}
                    <div className="rich-tooltip-header-top">
                        <div className="rich-tooltip-name">{def.displayProperties?.name}</div>
                    </div>
                    <div className="rich-tooltip-subtitle">
                        <div className="rich-tooltip-subtitle-row">
                            <span>{itemType}</span>
                            <div className="rich-tooltip-subtitle-icons">
                                <span className={`rich-tooltip-tier-text ${tier}`}>{tier}</span>
                                {instance && item.itemInstanceId && (
                                    <SimpleTooltip text={(instance.state & 1) ? 'Unlock Item' : 'Lock Item'} delay={300}>
                                        <div
                                            className={`rich-tooltip-lock-icon ${(instance.state & 1) ? 'locked' : 'unlocked'} ${lockAnimating || ''}`}
                                            style={{ pointerEvents: 'auto', zIndex: 100001, position: 'relative' }}
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                const isCurrentlyLocked = (instance.state & 1) === 1;
                                                const newState = !isCurrentlyLocked;

                                                // Trigger animation
                                                setLockAnimating(newState ? 'locking' : 'unlocking');

                                                // Determine character ID accurately (source character)
                                                // Fallback to selected character if not available
                                                const characterId = item.characterId || useProfileStore.getState().selectedCharacterId;

                                                if (!characterId || !item.itemInstanceId) {
                                                    setLockAnimating(null);
                                                    return;
                                                }

                                                // Call Bungie API to lock/unlock
                                                const success = await transferService.setItemLockState(item.itemInstanceId, characterId, newState);

                                                // Clear animation after it completes
                                                setTimeout(() => {
                                                    setLockAnimating(null);
                                                }, 500);

                                                if (success) {
                                                    // Update local state
                                                    if (newState) {
                                                        instance.state |= 1; // Set lock bit
                                                    } else {
                                                        instance.state &= ~1; // Clear lock bit
                                                    }
                                                }
                                            }}
                                        >
                                            {(instance.state & 1) ? <LockIcon size={14} /> : <UnlockIcon size={14} />}
                                        </div>
                                    </SimpleTooltip>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rich-tooltip-main">
                    {power > 0 && (
                        <div className="rich-tooltip-power-section">
                            <div className="rich-tooltip-power-left">
                                {isWeapon && damageIcon && (
                                    <img src={getBungieUrl(damageIcon)} alt="" className="rich-tooltip-damage-type-icon" />
                                )}
                                <span className={`rich-tooltip-power-value ${isHighPower ? 'power-blue' : ''}`}>
                                    {power}{isHighPower ? '+' : ''}
                                </span>
                                <span className="rich-tooltip-power-label">
                                    {isWeapon ? 'Attack' : 'Defense'}
                                    {isWeapon && (() => {
                                        // Ammo Type Logic
                                        const ammoType = def.equippingBlock?.ammoType; // 1: Primary, 2: Special, 3: Heavy
                                        let ammoLabel = '';
                                        let ammoClass = '';
                                        let ammoIcon = '';

                                        if (ammoType === 1) {
                                            ammoLabel = 'PRIMARY';
                                            ammoClass = 'ammo-primary';
                                            ammoIcon = '/common/destiny2_content/icons/99f3733354862047493d8550e46a45ec.png';
                                        }
                                        else if (ammoType === 2) {
                                            ammoLabel = 'SPECIAL';
                                            ammoClass = 'ammo-special';
                                            ammoIcon = '/common/destiny2_content/icons/d920203c4fd4571ae7f39eb5249eaecb.png';
                                        }
                                        else if (ammoType === 3) {
                                            ammoLabel = 'HEAVY';
                                            ammoClass = 'ammo-heavy';
                                            ammoIcon = '/common/destiny2_content/icons/78ef0e2b281de7b60c48920223e0f9b1.png';
                                        }

                                        const renderAmmo = ammoLabel && (
                                            <>
                                                <div className="rich-tooltip-power-separator">|</div>
                                                <div className={`rich-tooltip-ammo-pill ${ammoClass}`}>
                                                    {ammoIcon && <img src={getBungieUrl(ammoIcon)} className="rich-tooltip-ammo-icon" alt="" />}
                                                    {ammoLabel}
                                                </div>
                                            </>
                                        );

                                        const breakers = new Map<number, { bId: number, icon?: string, name?: string, isIntrinsic: boolean }>();
                                        let hasIntrinsic = false;

                                        // 1. Check item definition (intrinsic coverage)
                                        // Manual Overrides for specific weapons requested by user
                                        const itemName = (def.displayProperties?.name || '').toLowerCase();
                                        if (itemName.includes("slayer's fang")) {
                                            breakers.set(2, { bId: 2, isIntrinsic: true }); // Overload
                                            hasIntrinsic = true;
                                        }

                                        if (def.breakerType || def.breakerTypeHash) {
                                            const bId = def.breakerType || def.breakerTypeHash;
                                            breakers.set(bId, { bId, isIntrinsic: true });
                                            hasIntrinsic = true;
                                        }

                                        // 2. Check ALL sockets for intrinsic champion perks (not just active plugs)
                                        if (def.sockets?.socketEntries) {
                                            for (const socket of def.sockets.socketEntries) {
                                                // Check single initial item (intrinsic perk)
                                                if (socket.singleInitialItemHash) {
                                                    const plugDef = manifestService.getItem(socket.singleInitialItemHash);
                                                    if (plugDef?.breakerType || plugDef?.breakerTypeHash) {
                                                        const bId = plugDef.breakerType || plugDef.breakerTypeHash;
                                                        breakers.set(bId, { bId, isIntrinsic: true });
                                                        hasIntrinsic = true;
                                                    }
                                                    // Also check traitIds for champion mods (some exotics store it here)
                                                    if (plugDef?.traitIds && Array.isArray(plugDef.traitIds)) {
                                                        for (const traitId of plugDef.traitIds) {
                                                            const traitLower = traitId.toLowerCase();
                                                            let bId = 0;
                                                            if (traitLower.includes('barrier')) bId = 1;
                                                            else if (traitLower.includes('overload')) bId = 2;
                                                            else if (traitLower.includes('unstoppable')) bId = 3;

                                                            if (bId > 0) {
                                                                breakers.set(bId, { bId, isIntrinsic: true });
                                                                hasIntrinsic = true;
                                                            }
                                                        }
                                                    }
                                                }
                                                // Also check reusable plug items
                                                if (socket.reusablePlugItems) {
                                                    for (const plug of socket.reusablePlugItems) {
                                                        const plugDef = manifestService.getItem(plug.plugItemHash);
                                                        if (plugDef?.breakerType || plugDef?.breakerTypeHash) {
                                                            const bId = plugDef.breakerType || plugDef.breakerTypeHash;
                                                            breakers.set(bId, { bId, isIntrinsic: true });
                                                            hasIntrinsic = true;
                                                        }
                                                        // Check traitIds here too
                                                        if (plugDef?.traitIds && Array.isArray(plugDef.traitIds)) {
                                                            for (const traitId of plugDef.traitIds) {
                                                                const traitLower = traitId.toLowerCase();
                                                                let bId = 0;
                                                                if (traitLower.includes('barrier')) bId = 1;
                                                                else if (traitLower.includes('overload')) bId = 2;
                                                                else if (traitLower.includes('unstoppable')) bId = 3;

                                                                if (bId > 0) {
                                                                    breakers.set(bId, { bId, isIntrinsic: true });
                                                                    hasIntrinsic = true;
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }

                                        // 3. Check active instance sockets (equipped mods)
                                        if (instance?.sockets) {
                                            for (const s of instance.sockets) {
                                                if (!s.plugHash) continue;
                                                const plugDef = manifestService.getItem(s.plugHash);
                                                if (plugDef?.breakerType || plugDef?.breakerTypeHash) {
                                                    const bId = plugDef.breakerType || plugDef.breakerTypeHash;
                                                    // Only mark as intrinsic if not already set by artifact
                                                    if (!breakers.has(bId) || breakers.get(bId)?.isIntrinsic) {
                                                        breakers.set(bId, { bId, isIntrinsic: true });
                                                        hasIntrinsic = true;
                                                    }
                                                }
                                            }
                                        }

                                        // 4. Check Artifact (seasonal passive coverage) - ONLY if no intrinsic
                                        if (!hasIntrinsic) {
                                            const activeMods = artifactService.getAntiChampionMods();
                                            const typeName = (def.itemTypeDisplayName || '').toLowerCase();
                                            const categoryHashes = def.itemCategoryHashes || [];

                                            // Category hash constants (from Bungie API)
                                            const HAND_CANNON = 6;
                                            const PULSE_RIFLE = 7;
                                            const SCOUT_RIFLE = 8;
                                            const AUTO_RIFLE = 5;
                                            const SWORD = 54;

                                            activeMods.forEach(mod => {
                                                const modNameLower = mod.name.toLowerCase();
                                                let matches = false;

                                                // Precise weapon type matching
                                                if (modNameLower.includes('pulse') && categoryHashes.includes(PULSE_RIFLE)) {
                                                    matches = true;
                                                } else if (modNameLower.includes('hand cannon') && categoryHashes.includes(HAND_CANNON)) {
                                                    matches = true;
                                                } else if (modNameLower.includes('scout') && categoryHashes.includes(SCOUT_RIFLE)) {
                                                    matches = true;
                                                } else if (modNameLower.includes('auto') && !modNameLower.includes('automatic') && categoryHashes.includes(AUTO_RIFLE)) {
                                                    matches = true;
                                                } else if (modNameLower.includes('sword') && categoryHashes.includes(SWORD)) {
                                                    matches = true;
                                                } else {
                                                    // Fallback to generic type match
                                                    matches = mod.weaponTypes.some(wt => {
                                                        const wtLower = wt.toLowerCase();
                                                        return typeName.includes(wtLower) && typeName === wtLower;
                                                    });
                                                }

                                                if (matches) {
                                                    let bId = 0;
                                                    if (mod.championType === 'barrier') bId = 1;
                                                    else if (mod.championType === 'overload') bId = 2;
                                                    else if (mod.championType === 'unstoppable') bId = 3;

                                                    if (bId > 0) {
                                                        breakers.set(bId, { bId, icon: mod.icon, name: mod.name, isIntrinsic: false });
                                                    }
                                                }
                                            });
                                        }

                                        const championIconOverrides: Record<number, string> = {
                                            1: '/common/destiny2_content/icons/2ee146c19b93b88d2c7857005fc9a8c3.png', // Barrier
                                            2: '/common/destiny2_content/icons/f5b9dd270a544afaf2b9a726b1296501.png', // Overload
                                        };

                                        const breakersElements = breakers.size > 0 ? Array.from(breakers.values()).map(info => {
                                            const breakerDef = manifestService.getBreakerType(info.bId);
                                            // Priority: mod icon (artifact/seasonal) > override icon (intrinsic) > breaker def icon
                                            let iconUrl: string | undefined;
                                            if (info.icon) {
                                                // Use artifact/mod icon if provided (legendaries with seasonal mods)
                                                iconUrl = info.icon;
                                            } else if (info.isIntrinsic && championIconOverrides[info.bId]) {
                                                // Use override for intrinsic champion coverage
                                                iconUrl = championIconOverrides[info.bId];
                                            } else {
                                                // Fallback to breaker def
                                                iconUrl = breakerDef?.icon;
                                            }
                                            const displayName = info.name || breakerDef?.name;

                                            if (iconUrl) {
                                                return (
                                                    <img
                                                        key={`champ-${info.bId}`}
                                                        src={getBungieUrl(iconUrl)}
                                                        alt={displayName}
                                                        className="rich-tooltip-champion-icon"
                                                        title={displayName}
                                                    />
                                                );
                                            }
                                            return null;
                                        }) : null;

                                        return (
                                            <>
                                                {breakersElements}
                                                {renderAmmo}
                                            </>
                                        );
                                    })()}
                                </span>
                            </div>

                            {/* Armor: Priority to Archetype (Index 6), Fallback to Energy */}
                            {!isWeapon && (
                                <>
                                    {archetypeLabel ? (
                                        <>
                                            <div className="rich-tooltip-power-separator">|</div>
                                            <div className="rich-tooltip-energy-block">
                                                {archetypeIcon && <img src={archetypeIcon} className="rich-tooltip-energy-icon" alt="" />}
                                                <span className="rich-tooltip-energy-label" style={{ fontWeight: 700, color: '#fff' }}>{archetypeLabel}</span>
                                            </div>
                                        </>
                                    ) : (
                                        energyCapacity > 0 && (
                                            <>
                                                <div className="rich-tooltip-power-separator">|</div>
                                                <div className="rich-tooltip-energy-block">
                                                    {damageIcon && <img src={getBungieUrl(damageIcon)} className="rich-tooltip-energy-icon" alt="" />}
                                                    <span className="rich-tooltip-energy-value">{energyCapacity}</span>
                                                    <span className="rich-tooltip-energy-label">Energy</span>
                                                </div>
                                            </>
                                        )
                                    )}
                                </>
                            )}


                        </div>
                    )}

                    {(killCount || (isWeapon && killTracker)) && (
                        <div className="rich-tooltip-tracker">
                            <div className="rich-tooltip-tracker-label">
                                <img src={getBungieUrl('/common/destiny2_content/icons/683fd58d087968494b8e64c29a50123e.png')} className="rich-tooltip-tracker-icon" alt="" />
                                <span>{killCount ? trackerLabel : 'Kill Tracker'}</span>
                            </div>
                            {killCount && <span className="rich-tooltip-tracker-value">{killCount}</span>}
                        </div>
                    )}

                    {/* Stats */}
                    {barStats.length > 0 && (
                        <div className="rich-tooltip-stats">
                            {barStats.map((stat: any) => (
                                <div key={stat.hash} className="rich-tooltip-stat-row">
                                    <span className="rich-tooltip-stat-name">{stat.name}</span>
                                    <div className="rich-tooltip-stat-bar-outer">
                                        {/* 1. Base / White Bar */}
                                        <div
                                            className="rich-tooltip-stat-bar-inner"
                                            style={{
                                                width: `${Math.max(0, Math.min(stat.whiteValue * (isWeapon ? 1 : 2), 100))}%`,
                                                zIndex: 4
                                            }}
                                        />

                                        {/* 2. Yellow Bonus (MW/Exotic) */}
                                        {stat.yellowValue > 0 && (
                                            <div
                                                className="rich-tooltip-stat-bar-bonus-mw"
                                                style={{
                                                    left: `${Math.max(0, Math.min(stat.whiteValue * (isWeapon ? 1 : 2), 100))}%`,
                                                    width: `${Math.max(0, Math.min(stat.yellowValue, stat.value - stat.whiteValue) * (isWeapon ? 1 : 2))}%`,
                                                    zIndex: 3
                                                }}
                                            />
                                        )}

                                        {/* 3. Blue Bonus (Mods) */}
                                        {stat.blueValue > 0 && (
                                            <div
                                                className="rich-tooltip-stat-bar-bonus-mod"
                                                style={{
                                                    left: `${Math.max(0, Math.min((stat.whiteValue + Math.min(stat.yellowValue, stat.value - stat.whiteValue)) * (isWeapon ? 1 : 2), 100))}%`,
                                                    width: `${Math.max(0, Math.min(stat.blueValue, stat.value - (stat.whiteValue + Math.min(stat.yellowValue, stat.value - stat.whiteValue))) * (isWeapon ? 1 : 2))}%`,
                                                    zIndex: 2
                                                }}
                                            />
                                        )}

                                        {/* 4. Red Penalty (Lost Stat) */}
                                        {stat.redValue > 0 && (
                                            <div
                                                className="rich-tooltip-stat-bar-penalty"
                                                style={{
                                                    left: `${Math.max(0, Math.min(stat.value * (isWeapon ? 1 : 2), 100))}%`,
                                                    width: `${Math.min(stat.redValue * (isWeapon ? 1 : 2), 100 - (stat.value * (isWeapon ? 1 : 2)))}%`,
                                                    zIndex: 1
                                                }}
                                            />
                                        )}

                                        <span className={`rich-tooltip-stat-value ${stat.yellowValue > 0 ? 'masterwork' : ''} ${stat.blueValue > 0 ? 'mod' : ''}`}>
                                            {stat.value}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}



                    {/* Armor Mod Sockets */}
                    {!isWeapon && armorModSockets.length > 0 && (
                        <div className="rich-tooltip-mod-sockets">
                            <div className="rich-tooltip-mod-sockets-label">Mods</div>
                            <div className="rich-tooltip-mod-sockets-list">
                                {armorModSockets.map((mod: any) => (
                                    <div
                                        key={mod.hash}
                                        className="rich-tooltip-mod-socket-item"
                                    >
                                        {mod.icon && (
                                            <img
                                                src={getBungieUrl(mod.icon)}
                                                alt={mod.name}
                                                className="rich-tooltip-mod-socket-icon"
                                            />
                                        )}
                                        <span className="rich-tooltip-mod-socket-name">{mod.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Exotic Armor Intrinsic Section (at top) */}
                    {!isWeapon && armorExoticIntrinsic && (
                        <div className="rich-tooltip-exotic-perk enhanced-trait" style={{ marginBottom: '16px' }}>
                            <div className="rich-tooltip-perk-header">
                                {armorExoticIntrinsic.icon && <img src={getBungieUrl(armorExoticIntrinsic.icon)} className="rich-tooltip-perk-icon" alt="" />}
                                <div className="rich-tooltip-perk-name enhanced" style={{ fontSize: '15px' }}>
                                    {armorExoticIntrinsic.name}
                                </div>
                            </div>
                            <div className="rich-tooltip-perk-description">
                                {clarityData?.perkDescs[armorExoticIntrinsic.hash]?.description ? (
                                    <div className="clarity-description" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(clarityData.perkDescs[armorExoticIntrinsic.hash].description) }} />
                                ) : (
                                    formatDescription(armorExoticIntrinsic.description)
                                )}
                            </div>
                        </div>
                    )}

                    {/* Numeric Stats Section (RPM, Recoil, Magazine, Zoom) */}
                    {numericStats.length > 0 && (
                        <div className="rich-tooltip-numeric-stats">
                            {numericStats.map((stat: any) => (
                                <div key={stat.hash} className="rich-tooltip-numeric-row">
                                    <span className="rich-tooltip-numeric-label">{stat.name}</span>
                                    <span className="rich-tooltip-numeric-value">{stat.value}</span>
                                </div>
                            ))}
                        </div>
                    )}



                    {/* Weapon Intrinsic (Frames) */}
                    {isWeapon && weaponIntrinsic && (
                        <div className={`rich-tooltip-exotic-perk ${weaponIntrinsic.isEnhanced || tier === 'exotic' ? 'enhanced-trait' : ''}`}>
                            <div className="rich-tooltip-perk-header">
                                {weaponIntrinsic.icon && <img src={getBungieUrl(weaponIntrinsic.icon)} className="rich-tooltip-perk-icon" alt="" />}
                                <div className="rich-tooltip-perk-name">{weaponIntrinsic.name}</div>
                            </div>
                            <div className="rich-tooltip-perk-description">
                                {clarityData?.perkDescs[weaponIntrinsic.hash]?.description ? (
                                    <div className="clarity-description" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(clarityData.perkDescs[weaponIntrinsic.hash].description) }} />
                                ) : (
                                    formatDescription(weaponIntrinsic.description)
                                )}
                            </div>
                        </div>
                    )}
                    {/* Legendary Weapon Traits */}
                    {tier === 'legendary' && isWeapon && (trait1 || trait2) && (
                        <div className="rich-tooltip-legendary-perks">
                            {trait1 && (
                                <div className={`rich-tooltip-perk-row ${shouldShowTraitGlow(trait1) ? 'enhanced-trait' : ''}`}>
                                    {trait1.icon && <img src={getBungieUrl(trait1.icon)} className="rich-tooltip-perk-icon-small" alt="" />}
                                    <div className="rich-tooltip-perk-info">
                                        <div className={`rich-tooltip-perk-name-small ${shouldShowTraitGlow(trait1) ? 'enhanced' : ''}`}>{trait1.name}</div>
                                        <div className="rich-tooltip-perk-description-small">
                                            {clarityData?.perkDescs[trait1.hash]?.description ? (
                                                <div className="clarity-description" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(clarityData.perkDescs[trait1.hash].description) }} />
                                            ) : (
                                                formatDescription(trait1.description)
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {trait2 && (
                                <div className={`rich-tooltip-perk-row ${shouldShowTraitGlow(trait2) ? 'enhanced-trait' : ''}`}>
                                    {trait2.icon && <img src={getBungieUrl(trait2.icon)} className="rich-tooltip-perk-icon-small" alt="" />}
                                    <div className="rich-tooltip-perk-info">
                                        <div className={`rich-tooltip-perk-name-small ${shouldShowTraitGlow(trait2) ? 'enhanced' : ''}`}>{trait2.name}</div>
                                        <div className="rich-tooltip-perk-description-small">
                                            {clarityData?.perkDescs[trait2.hash]?.description ? (
                                                <div className="clarity-description" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(clarityData.perkDescs[trait2.hash].description) }} />
                                            ) : (
                                                formatDescription(trait2.description)
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Main Trait Section (for Exotic Weapons) */}
                    {tier === 'exotic' && isWeapon && trait1 && (
                        <div className="rich-tooltip-exotic-perk enhanced-trait">
                            <div className="rich-tooltip-perk-header">
                                {trait1.icon && <img src={getBungieUrl(trait1.icon)} className="rich-tooltip-perk-icon" alt="" />}
                                <div className="rich-tooltip-perk-name">{trait1.name}</div>
                            </div>
                            <div className="rich-tooltip-perk-description">
                                {clarityData?.perkDescs[trait1.hash]?.description ? (
                                    <div className="clarity-description" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(clarityData.perkDescs[trait1.hash].description) }} />
                                ) : (
                                    trait1.description
                                )}
                            </div>
                        </div>
                    )}

                    {/* Ergo Sum Extra "Debug" Trait */}
                    {weaponExoticTrait && (
                        <div className="rich-tooltip-exotic-perk enhanced-trait" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
                            <div className="rich-tooltip-perk-header">
                                {weaponExoticTrait.icon && <img src={getBungieUrl(weaponExoticTrait.icon)} className="rich-tooltip-perk-icon" alt="" />}
                                <div className="rich-tooltip-perk-name">{weaponExoticTrait.name}</div>
                            </div>
                            <div className="rich-tooltip-perk-description">{weaponExoticTrait.description}</div>
                        </div>
                    )}



                    {/* Mod Description */}
                    {isMod && (() => {
                        let modDescription = def.displayProperties?.description;
                        let isSynthesized = false;

                        // If no description, try to get it from perks
                        if (!modDescription && def.perks?.length > 0) {
                            const perkDescriptions: string[] = [];
                            def.perks.forEach((perk: any) => {
                                if (perk.perkHash) {
                                    const perkDef = manifestService.getPerk(perk.perkHash);
                                    if (perkDef?.description) {
                                        perkDescriptions.push(perkDef.description);
                                    }
                                }
                            });
                            if (perkDescriptions.length > 0) {
                                modDescription = perkDescriptions.join('\n\n');
                            }
                        }

                        // If no description but has investmentStats, synthesize one for stat mods
                        if (!modDescription && def.investmentStats?.length > 0) {
                            const statModDescriptions: string[] = [];
                            const statDescriptions: string[] = [];

                            def.investmentStats.forEach((stat: any) => {
                                // Only show significant stat bonuses (5 or more)
                                // This filters out the +3 cost values
                                if (Math.abs(stat.value) >= 5) {
                                    const statInfo = manifestService.getStat(stat.statTypeHash);

                                    if (statInfo?.name && statInfo?.icon) {
                                        const value = stat.value;
                                        const sign = value > 0 ? '+' : '';
                                        const iconUrl = getBungieUrl(statInfo.icon);

                                        // Format with inline icon: "+10 [icon] Melee" - all in one line
                                        statModDescriptions.push(`<span style="white-space: nowrap; display: inline-flex; align-items: center;">${sign}${value}<img src="${iconUrl}" style="width: 16px; height: 16px; display: inline-block; margin-left: 16px; margin-right: 6px;" alt="" />${statInfo.name}</span>`);

                                        // Add description if available
                                        if (statInfo.description) {
                                            statDescriptions.push(statInfo.description);
                                        }
                                    }
                                }
                            });

                            if (statModDescriptions.length > 0) {
                                // Join stats directly with space separator - all inline
                                const parts = [statModDescriptions.join(' ')];
                                if (statDescriptions.length > 0) {
                                    parts.push('<br/><span style="font-style: italic; opacity: 0.8;">' + statDescriptions.join(' ') + '</span>');
                                }
                                modDescription = parts.join('');
                                isSynthesized = true; // Use dangerouslySetInnerHTML for HTML
                            }
                        }

                        if (!modDescription) return null;

                        // If synthesized, use dangerouslySetInnerHTML; otherwise use formatDescription
                        return isSynthesized ? (
                            <div
                                className="rich-tooltip-perk-description"
                                style={{ marginTop: '12px' }}
                                /* SECURITY: Content is sanitized via DOMPurify to prevent XSS from synthesized stat descriptions */
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(modDescription) }}
                            />
                        ) : (
                            <div className="rich-tooltip-perk-description" style={{ marginTop: '12px' }}>
                                {formatDescription(modDescription)}
                            </div>
                        );
                    })()}

                    {flavorText && !isMod && (
                        <div className="rich-tooltip-flavor">
                            {flavorText}
                        </div>
                    )}
                </div>

                {!isLoadoutViewer && (!hideZoomButtons || clickActionLabel || (tier === 'exotic' && isGalaxyView && onRightClick && !hideSynergizeAction)) && (
                    <div className="rich-tooltip-footer">
                        {clickActionLabel ? (
                            <div
                                className="rich-tooltip-control"
                                onClick={(e) => {
                                    if (onClick) {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        onClick();
                                    }
                                }}
                                style={{
                                    pointerEvents: 'auto',
                                    cursor: 'pointer'
                                }}
                            >
                                <img src={MouseLeftIcon} className="rich-tooltip-mouse-icon" alt="L" />
                                <span>{clickActionLabel}</span>
                            </div>
                        ) : (
                            <div
                                className="rich-tooltip-control"
                                onClick={(e) => {
                                    if (isFocused && onTransfer) {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        setShowTransferMenu(true);
                                    }
                                }}
                                style={{
                                    pointerEvents: isFocused ? 'auto' : 'none',
                                    cursor: (isFocused && onTransfer) ? 'pointer' : 'default'
                                }}
                            >
                                <img src={MouseLeftIcon} className="rich-tooltip-mouse-icon" alt="L" />
                                <span>{isFocused ? (isWeapon ? 'Transmat Weapon' : 'Transmat Armor') : 'Zoom'}</span>
                            </div>
                        )}
                        {tier === 'exotic' && isGalaxyView && onRightClick && !hideSynergizeAction && (
                            <div
                                className="rich-tooltip-control"
                                onContextMenu={(e) => {
                                    if (onRightClick) {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        onRightClick();
                                    }
                                }}
                                style={{
                                    pointerEvents: 'auto',
                                    cursor: 'pointer'
                                }}
                            >
                                <img src={MouseRightIcon} className="rich-tooltip-mouse-icon" alt="R" />
                                <span>Synergize</span>
                            </div>
                        )}
                    </div>
                )}

                {showTransferMenu && isFocused && onTransfer && (
                    <TransferMenu
                        targetElement={tooltipRef.current}
                        onTransfer={(characterId) => {
                            onTransfer(characterId);
                            setShowTransferMenu(false);
                        }}
                        onEquip={(characterId) => {
                            if (onEquip) {
                                onEquip(characterId);
                            }
                            setShowTransferMenu(false);
                        }}
                        onClose={() => {
                            setShowTransferMenu(false);
                        }}
                        showVault={item.location !== 'vault'}
                        itemInstanceId={item.itemInstanceId}
                        itemClass={def?.classType}
                    />
                )}
            </div>
        </div>
    );

    return inline ? content : createPortal(content, document.body);
});

function getDamageTypeClass(damageType: number): string {
    switch (damageType) {
        case 1: return 'kinetic';
        case 2: return 'arc';
        case 3: return 'solar';
        case 4: return 'void';
        case 6: return 'stasis';
        case 7: return 'strand';
        default: return 'kinetic';
    }
}

function getAbilityElement(def: any): string {
    const cat = (def.plug?.plugCategoryIdentifier || '').toLowerCase();
    // Use word boundary regex to avoid partial matches (e.g., 'void' in 'devoid')
    if (/\bvoid\b/.test(cat)) return 'void';
    if (/\bsolar\b/.test(cat) || /\bthermal\b/.test(cat)) return 'solar';
    if (/\barc\b/.test(cat)) return 'arc';
    if (/\bstasis\b/.test(cat)) return 'stasis';
    if (/\bstrand\b/.test(cat)) return 'strand';
    if (/\bprismatic\b/.test(cat) || cat.includes('facet')) return 'prismatic';

    // Check defaultDamageType first (most reliable for subclasses)
    if (def.defaultDamageType) {
        switch (def.defaultDamageType) {
            case 2: return 'arc';
            case 3: return 'solar';
            case 4: return 'void';
            case 6: return 'stasis';
            case 7: return 'strand';
            case 8: return 'prismatic';
        }
    }

    // Check talentGrid.hudDamageType as fallback
    if (def.talentGrid?.hudDamageType) {
        switch (def.talentGrid.hudDamageType) {
            case 2: return 'arc';
            case 3: return 'solar';
            case 4: return 'void';
            case 6: return 'stasis';
            case 7: return 'strand';
            case 8: return 'prismatic';
        }
    }

    // Name-based detection as last resort
    const name = (def.displayProperties?.name || '').toLowerCase();
    // Use word boundary regex to avoid partial matches
    if (/\bprismatic\b/.test(name)) return 'prismatic';
    if (/\bsolar\b/.test(name) || /\bdawn\b/.test(name) || /\bgunslinger\b/.test(name) || /\bfire\b/.test(name)) return 'solar';
    if (/\bvoid\b/.test(name) || /\bnight\b/.test(name) || /\bvoidwalker\b/.test(name) || /\bsentinel\b/.test(name)) return 'void';
    if (/\barc\b/.test(name) || /\bstorm\b/.test(name) || /\bstriker\b/.test(name) || /\bstrider\b/.test(name)) return 'arc';
    if (/\bstasis\b/.test(name) || /\bshade\b/.test(name) || /\brevenant\b/.test(name) || /\bbehemoth\b/.test(name)) return 'stasis';
    if (/\bstrand\b/.test(name) || /\bbrood\b/.test(name) || /\bthread\b/.test(name) || /\bberserk\b/.test(name)) return 'strand';

    return 'void';
}
