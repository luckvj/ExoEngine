import { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import { debugLog, warnLog, errorLog } from '../../utils/logger';
import { flushSync } from 'react-dom';
import { useProfileStore, useManifestStore, useUIStore, useSettingsStore } from '../../store';
import { ElementType, GuardianClass } from '../../types';
import { BUCKET_HASHES } from '../../config/bungie.config';
import { manifestService } from '../../services/bungie/manifest.service';
import { transferService, createMoveSession } from '../../services/bungie/transfer.service';
import { profileLoader, profileService } from '../../services/bungie/profile.service';
import { getBungieUrl } from '../../utils/url-helper';
import { getTierClass } from '../../utils/character-helpers';
import { isLegacyVersion } from '../../utils/season-utils';
import { TierBadge } from '../builder/TierBadge';
import { useTooltip } from '../builder/TooltipManager';
import { SynergyWeb } from '../builder/SynergyWeb';
import { findSynergies, type SynergyConnection } from '../../services/synergy-matcher.service';
import '../../styles/TransmatEffect.css';
import './SynergyGalaxy.css';

interface NodePosition {
    x: number;
    y: number;
    z: number;
    id: string;
    type: 'armor' | 'weapon' | 'subclass';
    hash?: number;
    instanceId?: string;
    bucketHash: number;
    element: ElementType;
    isEquipped: boolean;
    isEmpty: boolean;
    lodLevel: 0 | 1 | 2; // 0 = high, 1 = med, 2 = low
    tierClass?: string;
    power?: number;
    damageIconUrl?: string;
    watermarkUrl?: string;
    isLegacyWatermark?: boolean;
    isMasterwork?: boolean;
    isCrafted?: boolean;
    isEnhanced?: boolean;
    isFocused?: boolean;
    tier?: number;
    originalItem?: any;
    iconUrl?: string; // Resolved icon (including ornaments)
}



const WEAPON_BUCKETS = [
    BUCKET_HASHES.KINETIC_WEAPONS,
    BUCKET_HASHES.ENERGY_WEAPONS,
    BUCKET_HASHES.POWER_WEAPONS,
];

const ARMOR_BUCKETS = [
    BUCKET_HASHES.HELMET,
    BUCKET_HASHES.GAUNTLETS,
    BUCKET_HASHES.CHEST_ARMOR,
    BUCKET_HASHES.LEG_ARMOR,
    BUCKET_HASHES.CLASS_ARMOR,
];

const DAMAGE_TYPE_NAMES: Record<number, string> = {
    1: 'kinetic',
    2: 'arc',
    3: 'solar',
    4: 'void',
    6: 'stasis',
    7: 'strand',
};

const ELEMENT_COLORS: Record<string, string> = {
    [ElementType.Kinetic]: '#ffffff',
    [ElementType.Arc]: '#7df9ff',
    [ElementType.Solar]: '#ff9000',
    [ElementType.Void]: '#bf84ff',
    [ElementType.Stasis]: '#4d88ff',
    [ElementType.Strand]: '#4aff9b',
    [ElementType.Prismatic]: '#ff8df6',
};

// Rarity colors are handled via CSS classes (.exotic, .legendary, etc.)

interface SynergyGalaxyProps {
    searchQuery?: string;
    elementFilter?: string;
    classFilter?: string;
    isVaultSearchVisible?: boolean;
    onSynergyElementChange?: (element: string | null) => void;
    onSynergyOverlayChange?: (isOpen: boolean, synergy: any) => void;
    viewMode?: 'all' | 'subclass-only' | 'inventory-only';
    /** Pre-filter for auto-triggering synergy web on specific items */
    synergyFilter?: {
        weaponName?: string;
        armorName?: string;
        element?: string;
        buildName?: string;
    };
    onResetView?: () => void;
    forceCloseTrigger?: number;
    /** Ref to expose the handleResetView function to parent components */
    resetViewRef?: React.MutableRefObject<(() => void) | null>;
}

// Helper function to check if item matches search query
// Helper function to check if item matches search query and filters
// Helper function to check if item matches search query and filters
function itemMatchesFilters(
    item: any,
    searchQuery: string,
    elementFilter: string,
    classFilter: string,
    getElementFn: (hash: number) => ElementType
): boolean {
    const itemHash = item.itemHash || item.hash;
    if (itemHash === undefined) return true;

    const itemDef = manifestService.getItem(itemHash);
    if (!itemDef) return false;

    // 1. Hard Filters (UI Selectors)
    if (elementFilter && elementFilter !== 'all') {
        const itemElement = getElementFn(itemHash);
        if (itemElement.toLowerCase() !== elementFilter.toLowerCase()) return false;
    }

    if (classFilter && classFilter !== 'all') {
        const classMap: Record<string, number> = {
            'titan': 0,
            'hunter': 1,
            'warlock': 2
        };
        const targetClassType = classMap[classFilter.toLowerCase()];
        if (targetClassType !== undefined && itemDef.classType !== 3 && itemDef.classType !== targetClassType) {
            return false;
        }
    }

    // 2. Search Query (DIM-style AND logic)
    if (!searchQuery || !searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    const terms = query.split(/\s+/);

    const itemName = itemDef.displayProperties?.name?.toLowerCase() || '';
    const itemType = itemDef.itemTypeDisplayName?.toLowerCase() || '';
    const itemDescription = itemDef.displayProperties?.description?.toLowerCase() || '';
    const itemTier = itemDef.inventory?.tierType;
    const itemElement = getElementFn(itemHash).toLowerCase();

    // EVERY term must match (AND logic)
    return terms.every(term => {
        let isTag = false;
        let actualTerm = term;

        if (term.startsWith('is:')) {
            isTag = true;
            actualTerm = term.substring(3);
        }

        // Special Tag Matches
        if (actualTerm === 'weapon' && itemDef.itemType === 3) return true;
        if (actualTerm === 'armor' && itemDef.itemType === 2) return true;
        if (actualTerm === 'exotic' && itemTier === 6) return true;
        if (actualTerm === 'legendary' && itemTier === 5) return true;
        if (actualTerm === 'rare' && itemTier === 4) return true;
        if (actualTerm === 'uncommon' && itemTier === 3) return true;
        if (actualTerm === 'common' && itemTier === 2) return true;

        // Element Tags
        if (actualTerm === 'kinetic' && itemDef.defaultDamageType === 1) return true;
        if (actualTerm === 'arc' && (itemDef.defaultDamageType === 2 || itemElement === 'arc')) return true;
        if (actualTerm === 'solar' && (itemDef.defaultDamageType === 3 || itemElement === 'solar')) return true;
        if (actualTerm === 'void' && (itemDef.defaultDamageType === 4 || itemElement === 'void')) return true;
        if (actualTerm === 'stasis' && (itemDef.defaultDamageType === 6 || itemElement === 'stasis')) return true;
        if (actualTerm === 'strand' && (itemDef.defaultDamageType === 7 || itemElement === 'strand')) return true;
        if (actualTerm === 'prismatic' && (itemElement === 'prismatic')) return true;

        // Class Tags
        if (actualTerm === 'titan' && itemDef.classType === 0) return true;
        if (actualTerm === 'hunter' && itemDef.classType === 1) return true;
        if (actualTerm === 'warlock' && itemDef.classType === 2) return true;

        // If it was a forced tag and didn't match, this term fails
        if (isTag) return false;

        // Otherwise, match against name, type, or description (OR logic within the term)
        return itemName.includes(actualTerm) ||
            itemType.includes(actualTerm) ||
            itemDescription.includes(actualTerm);
    });
}

export function SynergyGalaxy({
    searchQuery: searchQueryProp = '',
    elementFilter = 'all',
    classFilter = 'all',
    isVaultSearchVisible = false,
    onSynergyElementChange,
    onSynergyOverlayChange,
    viewMode = 'all',
    synergyFilter,
    onResetView,
    forceCloseTrigger,
    resetViewRef
}: SynergyGalaxyProps = {}) {
    const searchQueryRef = useRef(searchQueryProp);
    const viewModeRef = useRef(viewMode);
    const elementFilterRef = useRef(elementFilter);
    const classFilterRef = useRef(classFilter);

    // OPTIMIZATION: Single effect to update all filter refs
    useEffect(() => {
        searchQueryRef.current = searchQueryProp;
        elementFilterRef.current = elementFilter;
        classFilterRef.current = classFilter;
        viewModeRef.current = viewMode;
    }, [searchQueryProp, elementFilter, classFilter, viewMode]);

    const galaxyRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const offset = useRef({ x: 0, y: 0, z: -200 }); // Pulled camera back for full-frame visibility
    const isDragging = useRef(false);
    const lastMousePos = useRef({ x: -1, y: -1 });
    const dragStartPos = useRef({ x: -1, y: -1 }); // To distinguish click vs drag
    const isDraggingDisabled = useRef(true); // START DISABLED: Freeze camera on mount until player clicks
    const isParallaxDisabled = useRef(true); // START DISABLED: Freeze camera on mount until player clicks
    const isMiddleButtonDown = useRef(false); // Track middle mouse button for rotation

    const [isLocked, setIsLocked] = useState(false);
    const [focusedNode, setFocusedNode] = useState<any | null>(null);
    const [fps, setFps] = useState(0);
    const [renderTrigger, setRenderTrigger] = useState(0); // Added for forcing re-renders

    // Synergy Web State
    const [synergyConnections, setSynergyConnections] = useState<SynergyConnection[]>([]);
    const [synergySourcePos, setSynergySourcePos] = useState<{ x: number; y: number; scale?: number } | null>(null);
    const [synergySourceNodeId, setSynergySourceNodeId] = useState<string | null>(null);
    const [isSynergyMode, setIsSynergyMode] = useState(false);
    const [isSynergyExiting, setIsSynergyExiting] = useState(false);
    // Wire positions computed in RAF loop for perfect sync with node positions

    const [hoveredSynergyNodeId, setHoveredSynergyNodeId] = useState<string | null>(null);
    // Track which wire is being hovered (contains both armor and weapon instance IDs for the synergy)
    const [hoveredSynergyWire, setHoveredSynergyWire] = useState<{ armorInstanceId: string | null; weaponInstanceId: string | null } | null>(null);
    const [isIsolatingDebounced, setIsIsolatingDebounced] = useState(false);

    // Equip Animation State: Tracks item instance IDs currently playing the "Equip" flash animation
    const [equippingItemIds, setEquippingItemIds] = useState<Set<string>>(new Set());
    // Failed Equip State: Red glitch effect - REMOVED
    // const [failedEquipItemIds, setFailedEquipItemIds] = useState<Set<string>>(new Set());

    // SYNCHRONIZED NODES TRACKING: Memoize nodes involved in the active synergy web
    // Store both node.id and instanceId for flexible matching
    const synchronizedNodeIds = useMemo(() => {
        const ids = new Set<string>();
        if (synergySourceNodeId) ids.add(synergySourceNodeId);
        synergyConnections.forEach(conn => {
            if (conn.armorResult?.item.itemInstanceId) ids.add(conn.armorResult.item.itemInstanceId);
            if (conn.weaponResult?.item.itemInstanceId) ids.add(conn.weaponResult.item.itemInstanceId);
            // Also add by name-match for hubs
            if (conn.element) ids.add(`${conn.element.toLowerCase()}-subclass`);
        });
        return ids;
    }, [synergySourceNodeId, synergyConnections]);

    // Helper to check if a node is synchronized (by id or instanceId)
    const isNodeSynchronized = useCallback((node: any) => {
        return (node.id && synchronizedNodeIds.has(node.id)) || (node.instanceId && synchronizedNodeIds.has(node.instanceId));
    }, [synchronizedNodeIds]);

    const isLockedRef = useRef(isLocked);
    const containerRect = useRef<DOMRect | null>(null);
    const canvasSize = useRef({ width: 0, height: 0 });
    const rafId = useRef<number | null>(null);
    const activeTooltipNodeId = useRef<string | null>(null); // Track which node is showing tooltip
    const keysPressed = useRef<Set<string>>(new Set());
    const tickRef = useRef<(now: number) => void>(() => { });
    const updateTooltipDetectionRef = useRef<(mx: number, my: number) => void>(() => { });
    const isWireHoveringRef = useRef(false);
    const isMouseInBounds = useRef(true); // Track if mouse is inside the galaxy view
    const isMovingRef = useRef(false); // Track if camera is moving (velocity > threshold)

    const [isSynergyMenuOpen, setIsSynergyMenuOpen] = useState(false);

    const lastFpsUpdateTime = useRef(0);
    const frameCount = useRef(0);

    // Immersive Mode: Parallax + Drift effects for "flying through space" feel
    const { immersiveMode } = useSettingsStore();
    const driftOffset = useRef({ x: 0, y: 0 }); // Accumulated drift for floating feel
    const driftPhase = useRef(Math.random() * Math.PI * 2); // Random starting phase

    const tooltipHideTimerRef = useRef<NodeJS.Timeout | null>(null);
    const tooltipShowTimerRef = useRef<NodeJS.Timeout | null>(null);

    const { hideGlobalUI, setHideGlobalUI } = useUIStore();

    // Stability Refs: Used to prevent the main animation effect from re-running on every state/prop change
    const isSynergyModeRef = useRef(isSynergyMode);
    const synergyConnectionsRef = useRef(synergyConnections);
    const synergySourceNodeIdRef = useRef(synergySourceNodeId);
    const isVaultSearchVisibleRef = useRef(isVaultSearchVisible);
    const hideGlobalUIRef = useRef(hideGlobalUI);
    const hoveredSynergyWireRef = useRef(hoveredSynergyWire);
    const isIsolatingDebouncedRef = useRef(isIsolatingDebounced);

    // Tooltip Guard Ref: Prevents hammering the TooltipManager 60 times per second
    const lastTooltipStateRef = useRef<{ id: string | null; x: number; y: number }>({ id: null, x: -1, y: -1 });

    // OPTIMIZATION: Consolidated ref synchronization - single effect instead of 8
    useEffect(() => {
        isLockedRef.current = isLocked;
        isSynergyModeRef.current = isSynergyMode;
        synergyConnectionsRef.current = synergyConnections;
        synergySourceNodeIdRef.current = synergySourceNodeId;
        isVaultSearchVisibleRef.current = isVaultSearchVisible;
        hideGlobalUIRef.current = hideGlobalUI;
        hoveredSynergyWireRef.current = hoveredSynergyWire;
        isIsolatingDebouncedRef.current = isIsolatingDebounced;
    }, [isLocked, isSynergyMode, synergyConnections, synergySourceNodeId, isVaultSearchVisible, hideGlobalUI, hoveredSynergyWire, isIsolatingDebounced]);

    const lastNotifiedElementRef = useRef<string | null>(null);
    const safeNotifyElementChange = useCallback((element: string | null) => {
        if (lastNotifiedElementRef.current === element) return;
        lastNotifiedElementRef.current = element;
        if (onSynergyElementChange) {
            onSynergyElementChange(element);
        }
    }, [onSynergyElementChange]);

    const targetOffset = useRef({ x: 0, y: 0, z: -200 });
    const targetTilt = useRef({ x: 0, y: 0 });
    const targetParallax = useRef({ x: 0, y: 0 }); // Current mouse-based shift target
    const parallaxOffset = useRef({ x: 0, y: 0 }); // Lerped mouse-based shift

    // FRAME-LEVEL SNAPSHOT: Captures exact projection constants for 1:1 wire sync
    const projectionSnapshotRef = useRef({
        offX: 0, offY: 0, offZ: 0,
        tiltX: 0, tiltY: 0,
        centerX: 0, centerY: 0,
        focalLength: 1000
    });

    const transitionRef = useRef<{ active: boolean, startTime: number, duration: number, start: any, target: any } | null>(null);

    // Helper to safely start a camera transition with NaN protection
    const startTransition = useCallback((targetX: number, targetY: number, targetZ: number, duration: number = 800) => {
        // Validate target values
        if (isNaN(targetX) || isNaN(targetY) || isNaN(targetZ)) {
            warnLog('SynergyGalaxy', '⚠️ NaN target in transition:', { targetX, targetY, targetZ });
            return false;
        }

        // Validate current offset
        if (isNaN(offset.current.x) || isNaN(offset.current.y) || isNaN(offset.current.z)) {
            warnLog('SynergyGalaxy', '⚠️ NaN offset detected, resetting');
            offset.current = { x: 0, y: 0, z: -200 };
        }

        transitionRef.current = {
            active: true,
            startTime: performance.now(),
            duration,
            start: { ...offset.current },
            target: { x: targetX, y: targetY, z: targetZ }
        };
        targetOffset.current = { x: targetX, y: targetY, z: targetZ };
        return true;
    }, []);

    // Helper to project a 3D position to screen coordinates
    // Returns both stageX/Y (relative to viewport center) and screenX/Y (absolute pixels)
    const projectToScreen = useCallback((x: number, y: number, z: number) => {
        const snap = projectionSnapshotRef.current;

        // SAFETY: Check for NaN in projection snapshot (camera corruption recovery)
        if (isNaN(snap.offX) || isNaN(snap.offY) || isNaN(snap.offZ)) {
            warnLog('SynergyGalaxy', '⚠️ NaN in projection, using safe defaults');
            return {
                stageX: 0,
                stageY: 0,
                screenX: snap.centerX || 0,
                screenY: snap.centerY || 0,
                scale: 1,
                finalZ: 0
            };
        }

        // OPTIMIZATION: Trig calculations are expensive, but necessary here since snap values change every frame
        const rx = (-snap.tiltX) * Math.PI / 180;
        const ry = snap.tiltY * Math.PI / 180;
        const cosX = Math.cos(rx);
        const sinX = Math.sin(rx);
        const cosY = Math.cos(ry);
        const sinY = Math.sin(ry);

        const tx1 = x * cosY + z * sinY;
        const tz1 = -x * sinY + z * cosY;
        const ty2 = y * cosX - tz1 * sinX;
        const tz2 = y * sinX + tz1 * cosX;

        // COMBINED OFFSET: Camera Position (lerped focus) + Parallax Shift (lerped peek)
        const finalX = tx1 + snap.offX;
        const finalY = ty2 + snap.offY;
        const finalZ = tz2 + snap.offZ;

        const scale = Math.max(0.01, Math.min(20, snap.focalLength / Math.max(1, snap.focalLength - finalZ)));

        // Stage-relative (for DOM nodes at top:50%/left:50%)
        const stageX = finalX * scale;
        const stageY = finalY * scale;

        // Visual Clipping (Near Plane)
        // If finalZ approaches focalLength (1000), scale explodes.
        // We set isVisible=false for anything behind the camera (finalZ >= focalLength)
        // to implement "fly-through" and back-face culling.
        const isVisible = finalZ < (snap.focalLength - 5);

        // Safety: Prevent negative or infinite scales when very close to focalLength
        const effectiveScale = isVisible ? scale : 0;

        return {
            stageX,
            stageY,
            screenX: snap.centerX + stageX,
            screenY: snap.centerY + stageY,
            scale: effectiveScale,
            finalZ,
            isVisible
        };
    }, []);

    // Subscribe to profile store with shallow equality to detect all updates
    const characterEquipment = useProfileStore(state => state.characterEquipment);
    const characterInventories = useProfileStore(state => state.characterInventories);
    const vaultInventory = useProfileStore(state => state.vaultInventory);
    const itemInstances = useProfileStore(state => state.itemInstances);
    const selectedCharacterId = useProfileStore(state => state.selectedCharacterId);
    const responseMintedTimestamp = useProfileStore(state => state.responseMintedTimestamp);
    const isLoading = useProfileStore(state => state.isLoading);


    // Clear cached rect on data change


    const { maxSynergies, organizedGalaxy, randomVaultSeed, performanceMode, showFps } = useSettingsStore();
    const { isLoaded: manifestLoaded } = useManifestStore();
    const { showTooltip, hideTooltip, openTransferMenu } = useTooltip();

    // DIM Standard: Check for stale data from Bungie API
    const isStale = useMemo(() => {
        if (!responseMintedTimestamp) return false;
        try {
            const mintedDate = new Date(responseMintedTimestamp);
            const now = new Date();
            const diffMs = now.getTime() - mintedDate.getTime();
            // If data is older than 2 minutes, mark as stale/warning
            return diffMs > 120000;
        } catch (e) {
            return false;
        }
    }, [responseMintedTimestamp]);

    // Auto-trigger synergy web when synergyFilter is provided (from Vault builds)
    const synergyFilterTriggered = useRef(false);

    // Store projected vault points for interaction
    const projectedVaultRef = useRef<Array<{ px: number, py: number, size: number, item: any, instanceId?: string, x: number, y: number, z: number, opacity?: number }>>([]);
    const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    // Layout configuration
    const COLUMN_X = 550; // Brought closer to the center
    const COLUMN_Y_GAP = 220;

    // Helper to get element from itemHash
    const getElement = useCallback((hash: number): ElementType => {
        if (!manifestLoaded) return ElementType.Kinetic;
        const def = manifestService.getItem(hash);
        if (!def) return ElementType.Kinetic;

        // 1. Subclass Element (via talentGrid)
        if (def.talentGrid?.hudDamageType === 2) return ElementType.Arc;
        if (def.talentGrid?.hudDamageType === 3) return ElementType.Solar;
        if (def.talentGrid?.hudDamageType === 4) return ElementType.Void;
        if (def.talentGrid?.hudDamageType === 6) return ElementType.Stasis;
        if (def.talentGrid?.hudDamageType === 7) return ElementType.Strand;

        // 2. Weapon Element (via defaultDamageType)
        const damageType = def.defaultDamageType;
        if (damageType === 2) return ElementType.Arc;
        if (damageType === 3) return ElementType.Solar;
        if (damageType === 4) return ElementType.Void;
        if (damageType === 6) return ElementType.Stasis;
        if (damageType === 7) return ElementType.Strand;

        const name = def.displayProperties?.name?.toLowerCase() || '';
        if (name.includes('prismatic')) return ElementType.Prismatic;
        return ElementType.Kinetic;
    }, [manifestLoaded]);

    // Deterministic random helper
    const seedRandom = (seed: string | number) => {
        let h = typeof seed === 'string'
            ? seed.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0)
            : seed;
        const x = Math.sin(h++) * 10000;
        return x - Math.floor(x);
    };

    // OPTIMIZATION: Generate nodes without search dependency (filtering happens in render)
    const { nodes, vaultPoints } = useMemo(() => {
        const generatedNodes: NodePosition[] = [];
        const currentCharacterId = selectedCharacterId || '';

        const equipment = characterEquipment[currentCharacterId] || [];
        const inventory = characterInventories[currentCharacterId] || [];

        // 1. All Subclasses (Central Constellation)
        const equippedSubclass = equipment.find(i => i.bucketHash === BUCKET_HASHES.SUBCLASS);
        const inventorySubclasses = inventory.filter(i => i.bucketHash === BUCKET_HASHES.SUBCLASS);
        const allSubclasses = [equippedSubclass, ...inventorySubclasses].filter(Boolean) as any[];

        allSubclasses.forEach((sc, idx) => {
            const isEquipped = sc.itemHash === equippedSubclass?.itemHash;
            // DYNAMIC CENTERING: Equipped is always at the origin (0,0,0)
            // Inventory subclasses spiral behind starting from -600px Z
            const zPos = isEquipped ? 0 : (idx * -600) - 200;
            const xOffset = isEquipped ? 0 : Math.sin(idx * 1.5) * 450;
            const yOffset = isEquipped ? 0 : Math.cos(idx * 1.5) * 350;

            generatedNodes.push({
                id: `subclass-${sc.itemHash}-${idx}`,
                type: 'subclass',
                hash: sc.itemHash,
                instanceId: sc.itemInstanceId,
                bucketHash: BUCKET_HASHES.SUBCLASS,
                element: getElement(sc.itemHash),
                x: xOffset,
                y: yOffset,
                z: zPos,
                isEquipped,
                isEmpty: false,
                originalItem: sc,
                lodLevel: 0
            });
        });

        // 2. Character Gear (Fixed columns or light scatter)
        const allCharacterGear = [...equipment, ...inventory];
        allCharacterGear.forEach((item) => {
            if (item.bucketHash === BUCKET_HASHES.SUBCLASS) return;

            const isWeapon = WEAPON_BUCKETS.includes(item.bucketHash);
            const isArmor = ARMOR_BUCKETS.includes(item.bucketHash);
            if (!isWeapon && !isArmor) return;

            const isEquipped = equipment.some(e => e.itemInstanceId === item.itemInstanceId);
            const itemInstance = item.itemInstanceId ? itemInstances[item.itemInstanceId] : undefined;
            const itemDef = manifestService.getItem(item.itemHash);
            const damageType = itemInstance?.damageType || itemDef?.defaultDamageType;
            const damageTypeName = damageType ? DAMAGE_TYPE_NAMES[damageType] : undefined;

            let x, y, z;
            if (isEquipped) {
                const bIdx = (isWeapon ? WEAPON_BUCKETS : ARMOR_BUCKETS).indexOf(item.bucketHash);
                x = isWeapon ? -COLUMN_X : COLUMN_X;
                y = (bIdx - (isWeapon ? 1 : 2)) * COLUMN_Y_GAP;
                z = 0; // Same plane as subclass for perfect alignment
            } else {
                // Character inventory - scatter NEAR the center (around subclass spiral)
                const seed = item.itemInstanceId || item.itemHash.toString();

                if (!organizedGalaxy) {
                    const xScatter = seedRandom(seed + 'rx' + randomVaultSeed);
                    const yScatter = seedRandom(seed + 'ry' + randomVaultSeed);
                    const zScatter = seedRandom(seed + 'rz' + randomVaultSeed);
                    const baseX = isWeapon ? -COLUMN_X : COLUMN_X;
                    x = baseX + ((xScatter - 0.5) * 800);
                    y = ((yScatter - 0.5) * 800);
                    z = -200 - (zScatter * 4000);
                } else {
                    const bIdx = (isWeapon ? WEAPON_BUCKETS : ARMOR_BUCKETS).indexOf(item.bucketHash);
                    const baseX = isWeapon ? -COLUMN_X - 200 : COLUMN_X + 200;
                    const depthMin = -500 - (bIdx * 1200);
                    const depthMax = depthMin - 1200;
                    const zBias = seedRandom(seed + 'z');
                    const xScatter = seedRandom(seed + 'x');
                    const yScatter = seedRandom(seed + 'y');
                    z = depthMin + (zBias * (depthMax - depthMin));
                    x = baseX + ((xScatter - 0.5) * 400);
                    y = ((yScatter - 0.5) * 800);
                }
            }

            generatedNodes.push({
                id: `gear-${item.itemInstanceId || item.itemHash}-${item.bucketHash}-${isEquipped ? 'eq' : 'inv'}`,
                type: isWeapon ? 'weapon' : 'armor',
                hash: item.itemHash,
                instanceId: item.itemInstanceId,
                bucketHash: item.bucketHash,
                element: getElement(item.itemHash),
                x, y, z,
                isEquipped,
                isEmpty: false,
                tierClass: getTierClass(item),
                power: itemInstance?.power,
                damageIconUrl: (isWeapon && damageTypeName) ? getBungieUrl(manifestService.getDamageTypeIcon(damageTypeName as any) || '') : undefined,
                watermarkUrl: itemDef ? getBungieUrl(itemDef.iconWatermarkFeatured || itemDef.iconWatermark) : undefined,
                isLegacyWatermark: itemDef ? (!itemDef.iconWatermarkFeatured && !!itemDef.iconWatermark) || isLegacyVersion(itemDef.quality?.currentVersion) : false,
                isMasterwork: !!(item.state && (item.state & 4)),
                isCrafted: !!(item.state && (item.state & 8)),
                isEnhanced: !!(itemInstance?.sockets?.some((s: any) => s.plugHash === 3727270518)) || !!(item.state && (item.state & 8) && itemInstance?.gearTier && itemInstance.gearTier >= 2),
                tier: itemInstance?.gearTier,
                originalItem: item,
                lodLevel: isEquipped ? 0 : 1,
                iconUrl: getBungieUrl(manifestService.getItem(item.overrideStyleItemHash || item.itemHash)?.displayProperties?.icon || '')
            });
        });

        // 3. VAULT STARFIELD
        const actualVaultGear = vaultInventory.filter(item => {
            const itemDef = manifestService.getItem(item.itemHash);
            const bucketHash = itemDef?.inventory?.bucketTypeHash || 0;
            return WEAPON_BUCKETS.includes(bucketHash) || ARMOR_BUCKETS.includes(bucketHash);
        });

        const vaultPointsArray: Array<{ x: number, y: number, z: number, color: string, originalItem: any, instanceId?: string, isMasterwork?: boolean, isCrafted?: boolean, isExotic?: boolean }> = [];
        actualVaultGear.forEach((item) => {
            const itemDef = manifestService.getItem(item.itemHash);
            const bucketHash = itemDef?.inventory?.bucketTypeHash || 0;
            const isWeapon = WEAPON_BUCKETS.includes(bucketHash);
            const isArmor = ARMOR_BUCKETS.includes(bucketHash);
            if (!isWeapon && !isArmor) return;

            let x, y, z;
            const seed = item.itemInstanceId || item.itemHash.toString();

            if (!organizedGalaxy) {
                const xScatter = seedRandom(seed + 'rx' + randomVaultSeed);
                const yScatter = seedRandom(seed + 'ry' + randomVaultSeed);
                const zScatter = seedRandom(seed + 'rz' + randomVaultSeed);
                x = (xScatter - 0.5) * 15000;
                y = (yScatter - 0.5) * 10000;
                z = -1000 - (zScatter * 25000);
            } else {
                let slotIndex = 0;
                let baseX = 0;
                let depthRange = { min: 0, max: 0 };
                if (isWeapon) {
                    baseX = -2250;
                    slotIndex = WEAPON_BUCKETS.indexOf(bucketHash);
                    depthRange = { min: -1500 - (slotIndex * 3500), max: -1500 - (slotIndex * 3500) - 3500 };
                } else {
                    baseX = 2250;
                    slotIndex = ARMOR_BUCKETS.indexOf(bucketHash);
                    depthRange = { min: -1500 - (slotIndex * 2300), max: -1500 - (slotIndex * 2300) - 2300 };
                }
                const zBias = seedRandom(seed + 'z');
                const xScatter = seedRandom(seed + 'x');
                const yScatter = seedRandom(seed + 'y');
                z = depthRange.min + (zBias * (depthRange.max - depthRange.min));
                x = baseX + ((xScatter - 0.5) * 1200);
                y = ((yScatter - 0.5) * 2500);
            }

            const element = getElement(item.itemHash);
            const tierClass = getTierClass(item);
            const isExotic = tierClass === 'exotic';
            let color: string;
            if (organizedGalaxy) {
                if (isExotic) color = '#FFD700'; else if (tierClass === 'legendary') color = '#a850f2'; else color = ELEMENT_COLORS[element] || '#fff';
            } else {
                color = ELEMENT_COLORS[element] || '#fff';
            }

            vaultPointsArray.push({
                x, y, z,
                color: color,
                isMasterwork: !!(item.state && (item.state & 4)),
                isCrafted: !!(item.state && (item.state & 8)),
                isExotic: isExotic,
                originalItem: item,
                instanceId: item.itemInstanceId
            });
        });

        return { nodes: generatedNodes, vaultPoints: vaultPointsArray };
    }, [selectedCharacterId, characterEquipment, characterInventories, vaultInventory, itemInstances, getElement, organizedGalaxy, randomVaultSeed, manifestLoaded]);

    // NEW OPTIMIZATION: Pre-calculate filter matches to avoid expensive work in the 60FPS loop
    const filteredNodeIds = useMemo(() => {
        const matches = new Set<string>();
        nodes.forEach(node => {
            if (itemMatchesFilters(node, searchQueryProp, elementFilter, classFilter, getElement)) {
                matches.add(node.id);
            }
        });
        return matches;
    }, [nodes, searchQueryProp, elementFilter, classFilter, getElement]);

    const filteredVaultPoints = useMemo(() => {
        return vaultPoints.filter(pt =>
            itemMatchesFilters(pt.originalItem, searchQueryProp, elementFilter, classFilter, getElement)
        );
    }, [vaultPoints, searchQueryProp, elementFilter, classFilter, getElement]);



    // Auto-trigger synergy web when synergyFilter is provided (from Vault builds)
    useEffect(() => {
        debugLog('SynergyGalaxy', 'Filter effect check:', {
            synergyFilter,
            triggered: synergyFilterTriggered.current,
            manifestLoaded,
            nodesCount: nodes.length
        });

        if (!synergyFilter || synergyFilterTriggered.current || !manifestLoaded || nodes.length === 0) return;

        const { weaponName, armorName, element } = synergyFilter;
        if (!weaponName && !armorName) return;

        // Mark as triggered to prevent re-running
        synergyFilterTriggered.current = true;

        // Get guardian class
        const { characters, selectedCharacterId: charId } = useProfileStore.getState();
        const currentChar = characters.find(c => c.characterId === charId);
        const guardianClass = currentChar?.classType ?? 0;

        // Find the equipped subclass node to use as source
        const equippedSubclassNode = nodes.find(n => n.type === 'subclass' && n.isEquipped);

        // Delay to let the galaxy render and containerRect to be set
        const timer = setTimeout(async () => {
            try {
                // Find synergies for the weapon or armor
                const searchType = weaponName ? 'weapon' : 'armor';
                const searchName = weaponName || armorName || '';

                debugLog('SynergyGalaxy', 'Auto-trigger search:', { searchType, searchName, guardianClass });

                const synergies = await findSynergies(
                    searchType,
                    searchName,
                    guardianClass,
                    { maxResults: maxSynergies, seed: randomVaultSeed }
                );

                debugLog('SynergyGalaxy', `Found ${synergies.length} synergies`, { synergies, equippedSubclassNode, containerRect: containerRect.current });

                if (synergies.length > 0) {
                    setSynergyConnections(synergies);
                    setIsSynergyMode(true);
                    setIsSynergyExiting(false);

                    // Set source node ID to the equipped subclass
                    if (equippedSubclassNode) {
                        setSynergySourceNodeId(equippedSubclassNode.id);
                        debugLog('SynergyGalaxy', `Set source node: ${equippedSubclassNode.id}`);

                        // Calculate source position from the equipped subclass
                        if (containerRect.current) {
                            const { screenX, screenY, scale } = projectToScreen(
                                equippedSubclassNode.x,
                                equippedSubclassNode.y,
                                equippedSubclassNode.z
                            );
                            debugLog('SynergyGalaxy', 'Set source position:', { screenX, screenY, scale });
                            setSynergySourcePos({ x: screenX, y: screenY, scale });
                        }
                    }

                    // Set element for UI
                    if (onSynergyElementChange && element) {
                        onSynergyElementChange(element);
                    }
                } else {
                    debugLog('SynergyGalaxy', 'No synergies found - items may not be in inventory');
                }
            } catch (err) {
                errorLog('SynergyGalaxy', 'Failed to auto-trigger synergies:', err);
            }
        }, 800); // Longer delay to ensure containerRect is set

        return () => clearTimeout(timer);
    }, [synergyFilter, manifestLoaded, nodes, maxSynergies, randomVaultSeed, onSynergyElementChange, projectToScreen]);

    // Update refs for use in tick loop
    const filteredNodeIdsRef = useRef(filteredNodeIds);
    const filteredVaultPointsRef = useRef(filteredVaultPoints);

    // OPTIMIZATION: Memoize inventory hashes to prevent recreation every frame
    const inventoryHashes = useMemo(() => {
        const equipment = characterEquipment[selectedCharacterId || ''] || [];
        const inventory = characterInventories[selectedCharacterId || ''] || [];
        return new Set([...equipment, ...inventory].map(i => i.itemHash));
    }, [characterEquipment, characterInventories, selectedCharacterId]);

    const vaultPointsRef = useRef<any[]>([]);

    const drawCanvas = useCallback((tiltX: number = 0, tiltY: number = 0, timestamp: number = 0) => {
        const canvas = canvasRef.current;
        if (!canvas || !containerRect.current) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width, height } = canvasSize.current;
        if (width === 0 || height === 0) return;

        ctx.clearRect(0, 0, width, height);

        const centerX = width / 2;
        const centerY = height / 2;
        const focalLength = 1000;
        const offX = offset.current.x + parallaxOffset.current.x;
        const offY = offset.current.y + parallaxOffset.current.y;
        const offZ = offset.current.z;

        // Update snapshot for frame-locked consistency across wires, stars, and icons
        projectionSnapshotRef.current = {
            offX, offY, offZ,
            tiltX, tiltY,
            centerX, centerY,
            focalLength
        };

        const nextProjectedVault: typeof projectedVaultRef.current = [];

        // OPTIMIZATION: Pre-compute trig values once per frame
        const rx = (-tiltX) * Math.PI / 180;
        const ry = tiltY * Math.PI / 180;
        const cosX = Math.cos(rx);
        const sinX = Math.sin(rx);
        const cosY = Math.cos(ry);
        const sinY = Math.sin(ry);

        filteredVaultPointsRef.current.forEach(pt => {
            // CULLING PRIORITY
            // 1. Never show focused item in starfield (double image)
            // 2. Never show items that are already equipped or in character inventory
            if (focusedNode && pt.instanceId === focusedNode.instanceId) return;
            if (inventoryHashes.has(pt.originalItem.itemHash)) return;

            // 2.5. Filter by view mode
            const isSync = isNodeSynchronized(pt);
            const itemDef = manifestService.getItem(pt.originalItem.itemHash);
            if (!isSync && itemDef && viewModeRef.current !== 'all') {
                if (viewModeRef.current === 'subclass-only') {
                    // Vault items are never subclasses, so hide all vault items
                    return;
                } else if (viewModeRef.current === 'inventory-only') {
                    // Hide all vault items in inventory-only mode
                    return;
                }
            }

            // matchesSearch is now implicit since we use filteredVaultPointsRef
            const matchesSearch = true;


            // 1. Initial Translation (Node Relative to Stage)
            let x = pt.x;
            let y = pt.y;
            let z = pt.z;

            // 2. Rotate Y (first in CSS order)
            const tx1 = x * cosY + z * sinY;
            const tz1 = -x * sinY + z * cosY;

            // 3. Rotate X
            const ty2 = y * cosX - tz1 * sinX;
            const tz2 = y * sinX + tz1 * cosX;

            // 4. Final Translation (Stage Offset)
            const finalX = tx1 + offX;
            const finalY = ty2 + offY;
            const finalZ = tz2 + offZ;

            // 5. Projection
            // PERFORMANCE MODE CULLING: Adjust visual range based on setting
            // BYPASS CULLING for active synergy nodes so web connections always have a target
            const farClip = performanceMode === 'low' ? -5000 : performanceMode === 'medium' ? -25000 : -60000;
            if (!isSync && (finalZ > 900 || finalZ < farClip)) return; // Cull only if not part of active synergy

            const scale = focalLength / (focalLength - finalZ);
            const px = centerX + finalX * scale;
            const py = centerY + finalY * scale;

            if (px < -100 || px > width + 100 || py < -100 || py > height + 100) return;

            let size = Math.max(0.8, 3.5 * scale); // Increased min size
            let alpha = Math.min(1, Math.max(0.2, scale * 2.1)); // Increased brightness

            // SYNERGY HOVER DIMMING: When hovering a wire, dim vault items that aren't part of the synergy
            if (isSynergyModeRef.current && hoveredSynergyWireRef.current) {
                const isHoveredArmor = pt.instanceId === hoveredSynergyWireRef.current.armorInstanceId;
                const isHoveredWeapon = pt.instanceId === hoveredSynergyWireRef.current.weaponInstanceId;
                if (!isHoveredArmor && !isHoveredWeapon) {
                    alpha *= 0.08;
                }
            }

            // SEARCH PULSE: Make filtered items "breathe" to stand out in the starfield
            if (searchQueryRef.current && matchesSearch && !isSync) {
                const pulse = 1 + Math.sin(timestamp / 400) * 0.15;
                size *= pulse;
                alpha = Math.min(1, alpha * 1.4);
            }

            // Only apply masterwork glow if item matches search (or no search active)
            if (pt.isMasterwork && matchesSearch) {
                const pulse = 1 + Math.sin(timestamp / 300) * 0.2;
                size *= 1.4 * pulse;
                alpha = Math.min(1, alpha * 1.5 * pulse);
            }

            // Glow effect (More pronounced) - Bright yellow glow for masterworks and exotics
            // In colorful mode, exotics get bright yellow glow regardless of masterwork status
            const shouldGlow = pt.isMasterwork || (organizedGalaxy && pt.isExotic);
            ctx.fillStyle = shouldGlow ? '#FFD700' : pt.color;
            ctx.globalAlpha = alpha * (shouldGlow ? 0.8 : 0.55);
            ctx.beginPath();
            ctx.arc(px, py, size * 3.5, 0, Math.PI * 2);
            ctx.fill();

            // Core point - Use bright yellow for exotics in colorful mode, otherwise use original color
            ctx.fillStyle = (organizedGalaxy && pt.isExotic) ? '#FFD700' : pt.color;
            ctx.globalAlpha = Math.min(1, alpha * 1.5); // Brighter core
            ctx.beginPath();
            ctx.arc(px, py, size * 2.8, 0, Math.PI * 2); // Much bigger
            ctx.fill();

            // Store for hit detection and synergy wire positioning
            // Only store if the item is actually visible (matches search or is part of synergy)
            if (matchesSearch || isSync) {
                nextProjectedVault.push({
                    px,
                    py,
                    size: size * 4,
                    item: pt.originalItem,
                    instanceId: pt.instanceId,
                    x: pt.x,
                    y: pt.y,
                    z: pt.z,
                    opacity: 1
                });
            }
        });

        projectedVaultRef.current = nextProjectedVault;
    }, [focusedNode, inventoryHashes, isNodeSynchronized, getElement, organizedGalaxy, performanceMode]);

    // Sync all refs and trigger redraw when filters or data change
    useEffect(() => {
        filteredNodeIdsRef.current = filteredNodeIds;
        filteredVaultPointsRef.current = filteredVaultPoints;
        vaultPointsRef.current = vaultPoints;
        drawCanvas();
    }, [filteredNodeIds, filteredVaultPoints, vaultPoints, drawCanvas, renderTrigger]);

    const updateTransform = useCallback((tX: number, tY: number, timestamp: number = 0) => {
        // Stage transformation is now handled by individual node projection in renderLoop
        // This avoids browser-level CSS perspective clipping
        if (galaxyRef.current) {
            galaxyRef.current.style.transform = 'none';
        }

        // Sync Canvas with Tilts
        drawCanvas(tX, tY, timestamp);
    }, [drawCanvas]);


    const handleResetView = useCallback(() => {
        debugLog('SynergyGalaxy', 'Reset view triggered');
        // EARLY EXIT: If already at orbit (default position) with nothing to reset, skip expensive operations
        const isAtOrbit = !isLocked && !focusedNode && !isSynergyMode && !activeTooltipNodeId.current;
        const isAtDefaultPosition = Math.abs(offset.current.x) < 1 &&
            Math.abs(offset.current.y) < 1 &&
            Math.abs(offset.current.z - (-200)) < 1;

        if (isAtOrbit && isAtDefaultPosition) {
            // Already at orbit with nothing to reset - skip to prevent unnecessary freeze
            return;
        }

        // Reset UI state immediately
        setIsLocked(false);
        isLockedRef.current = false;
        setFocusedNode(null);
        hideTooltip();
        activeTooltipNodeId.current = null;

        // Close synergy web with exit animation if active
        // Reset synergy wire hover state to clear isolation immediately
        setHoveredSynergyWire(null);
        hoveredSynergyWireRef.current = null;

        if (isSynergyMode && !isSynergyExiting) {
            setIsSynergyExiting(true);
            // Reset synergy element immediately
            if (onSynergyElementChange) {
                onSynergyElementChange(null);
            }
        }

        // rotateVaultSeed: Every time we return to orbit, randomize the galaxy as requested
        useSettingsStore.getState().rotateVaultSeed();

        // Disable camera dragging and parallax to keep orbit view perfectly centered
        isDraggingDisabled.current = true;
        isParallaxDisabled.current = true;

        // Zero out parallax immediately
        targetParallax.current = { x: 0, y: 0 };
        parallaxOffset.current = { x: 0, y: 0 };

        // START Camera transition immediately (use helper for NaN safety)
        // Duration reduced to 300ms for a truly "take me right to orbit" feel
        startTransition(0, 0, -200, 300);

        // Cleanup synergy state after animation completes
        if (isSynergyMode && !isSynergyExiting) {
            setTimeout(() => {
                // Use regular state updates for cleanup
                setSynergyConnections([]);
                setSynergySourcePos(null);
                setSynergySourceNodeId(null);
                setIsSynergyMode(false);
                setIsSynergyExiting(false);
            }, 200); // Reduced delay to match faster transition
        }
    }, [hideTooltip, isSynergyMode, isSynergyExiting, onSynergyElementChange, isLocked, focusedNode, startTransition]);

    // Handle closing the synergy web overlay
    const handleCloseSynergyWeb = useCallback(() => {
        if (!isSynergyExiting) {
            // Defer to next frame to prevent blocking
            requestAnimationFrame(() => {
                flushSync(() => {
                    setIsSynergyExiting(true);
                    if (onSynergyElementChange) {
                        onSynergyElementChange(null);
                    }
                });

                setTimeout(() => {
                    flushSync(() => {
                        setSynergyConnections([]);
                        setSynergySourcePos(null);
                        setSynergySourceNodeId(null);
                        setIsSynergyMode(false);
                        setIsSynergyExiting(false);
                    });
                }, 300);
            });
        }
    }, [isSynergyExiting, onSynergyElementChange]);

    // PULL BACK TO ORBIT: Respond to parent signalling a force close (e.g. after equip)
    const lastProcessedTrigger = useRef(0);
    useEffect(() => {
        if (forceCloseTrigger !== undefined && forceCloseTrigger > lastProcessedTrigger.current) {
            lastProcessedTrigger.current = forceCloseTrigger;
            handleResetView();
        }
    }, [forceCloseTrigger, handleResetView]);

    // Handle synergy wire lock - zoom to the clicked item and keep synergy mode with tooltip attached
    const handleSynergyWireLock = useCallback((itemInstanceId: string | null) => {
        debugLog('SynergyGalaxy', `Wire lock triggered: ${itemInstanceId}`);
        if (!itemInstanceId) {
            // Unlocked - reset the locked state so user can navigate freely
            setFocusedNode(null);
            setIsLocked(false);
            isLockedRef.current = false;
            return;
        }

        // Find the node or vault item with this instance ID
        // Check both instanceId and id to match the wire position calculation
        let node = nodes.find(n => n.instanceId === itemInstanceId || n.id === itemInstanceId);
        let targetX: number, targetY: number, targetZ: number;
        let focusNode: any = null;

        debugLog('SynergyGalaxy', `Found node: ${node?.id} (${nodes.length} total)`);

        if (node) {
            // Zoom to this DOM node
            targetX = -node.x;
            targetY = -node.y;
            targetZ = -node.z + 400; // Zoom in closer
            focusNode = node;
            debugLog('SynergyGalaxy', `Zooming to: ${targetX}, ${targetY}, ${targetZ}`);
        } else {
            // Check projected vault items first (visible stars)
            let vaultItem = projectedVaultRef.current.find(v => v.instanceId === itemInstanceId);

            // Fallback to full vault points if not in projected
            if (!vaultItem) {
                vaultItem = vaultPointsRef.current.find((v: any) => v.instanceId === itemInstanceId);
            }

            if (vaultItem) {
                targetX = -vaultItem.x;
                targetY = -vaultItem.y;
                targetZ = -vaultItem.z + 400;

                // Build a focused node from vault item
                // Use the vaultItem.item property or search full inventory as backup
                const item = (vaultItem as any).item || (vaultItem as any).originalItem;
                if (!item) {
                    warnLog('SynergyGalaxy', '⚠️ Vault item missing data:', vaultItem);
                    return;
                }
                const itemInstance = vaultItem.instanceId ? itemInstances[vaultItem.instanceId] : undefined;
                const itemDef = manifestService.getItem(item.itemHash);
                const element = getElement(item.itemHash);
                const isWeapon = itemDef?.itemType === 3;
                const damageType = itemInstance?.damageType || itemDef?.defaultDamageType;
                const damageTypeName = damageType ? DAMAGE_TYPE_NAMES[damageType] : undefined;

                focusNode = {
                    x: vaultItem.x,
                    y: vaultItem.y,
                    z: vaultItem.z,
                    id: `vault-${vaultItem.instanceId || item.itemHash}`,
                    type: isWeapon ? 'weapon' : 'armor',
                    hash: item.itemHash,
                    instanceId: vaultItem.instanceId,
                    bucketHash: itemDef?.inventory?.bucketTypeHash || 0,
                    element: element as any,
                    isEquipped: false,
                    isEmpty: false,
                    lodLevel: 0,
                    tierClass: getTierClass(item),
                    power: itemInstance?.power,
                    damageIconUrl: (isWeapon && damageTypeName) ? getBungieUrl(manifestService.getDamageTypeIcon(damageTypeName as any) || '') : undefined,
                    watermarkUrl: itemDef ? getBungieUrl(itemDef.iconWatermarkFeatured || itemDef.iconWatermark) : undefined,
                    isLegacyWatermark: itemDef ? (!itemDef.iconWatermarkFeatured && !!itemDef.iconWatermark) || isLegacyVersion(itemDef.quality?.currentVersion) : false,
                    isMasterwork: !!(item.state && (item.state & 4)),
                    isCrafted: !!(item.state && (item.state & 8)),
                    isEnhanced: !!(item.state && (item.state & 8) && itemInstance?.gearTier && itemInstance.gearTier >= 2),
                    tier: itemInstance?.gearTier,
                    originalItem: item
                };
            } else {
                // Item not found
                return;
            }
        }

        // Freeze parallax during zoom
        targetParallax.current = { x: 0, y: 0 };

        // Use helper for NaN-safe transition
        startTransition(targetX, targetY, targetZ, 600);

        // Keep synergy mode open and focus on the item
        // The synergy tooltip will stay visible and attached to the item
        if (focusNode) {
            setFocusedNode(focusNode);
            setIsLocked(true);
            isLockedRef.current = true;
        }
    }, [nodes, itemInstances, getElement, startTransition]);

    // Store the focused node data in a ref so it doesn't get lost when tooltip updates
    const focusedNodeRef = useRef<any>(null);

    // Sync focusedNodeRef whenever focusedNode changes
    useEffect(() => {
        focusedNodeRef.current = focusedNode;
    }, [focusedNode]);

    // Handle item transfer from vault/character to selected character
    const handleTransferItem = useCallback(async (targetCharacterId: string) => {
        debugLog('SynergyGalaxy', `Transfer item to: ${targetCharacterId}`);

        // Use ref to get the node data (more reliable than state which may have changed)
        const nodeToTransfer = focusedNodeRef.current;

        if (!nodeToTransfer?.instanceId || !nodeToTransfer?.originalItem) {
            errorLog('SynergyGalaxy', 'Missing focusedNode or item data', {
                focusedNode,
                focusedNodeRef: focusedNodeRef.current
            });
            return;
        }

        const item = nodeToTransfer.originalItem;
        const itemInstanceId = nodeToTransfer.instanceId;
        const itemHash = item.itemHash;

        debugLog('SynergyGalaxy', 'Transfer request:', {
            itemInstanceId,
            itemHash,
            targetCharacterId,
            itemName: manifestService.getItem(itemHash)?.displayProperties?.name
        });

        try {
            // Create a session for tracking the move
            const session = createMoveSession([itemInstanceId], 3, targetCharacterId);

            // Determine source and whether it's currently in vault or equipped
            const isInVault = vaultInventory.some(v => v.itemInstanceId === itemInstanceId);
            let currentCharId: string | undefined;

            // Robust source detection for items on any character
            for (const charId in characterInventories) {
                if (characterInventories[charId].some(i => i.itemInstanceId === itemInstanceId)) {
                    currentCharId = charId;
                    break;
                }
            }
            if (!currentCharId) {
                for (const charId in characterEquipment) {
                    if (characterEquipment[charId].some(i => i.itemInstanceId === itemInstanceId)) {
                        currentCharId = charId;
                        break;
                    }
                }
            }

            const isEquipped = currentCharId ? characterEquipment[currentCharId]?.some(e => e.itemInstanceId === itemInstanceId) : false;

            if (!isInVault && !currentCharId) {
                errorLog('SynergyGalaxy', 'Could not identify source character for transfer');
                return;
            }

            // CRITICAL: Unequip item first before ANY transfer (Bungie API requirement)
            // Equipped items CANNOT be transferred anywhere (not even to vault)
            if (isEquipped && !isInVault) {
                debugLog('SynergyGalaxy', `Item ${itemInstanceId} equipped, must unequip first`);
                const unequipSuccess = await profileService.ensureItemUnequipped(currentCharId!, itemInstanceId);
                if (!unequipSuccess) {
                    errorLog('SynergyGalaxy', 'Failed to unequip: No replacement found');
                    alert('Cannot transfer equipped item. Please equip a different weapon first, or move a replacement from vault to your character.');
                    return;
                }
                // Refresh profile after unequipping to get latest state
                debugLog('SynergyGalaxy', '✓ Item unequipped, refreshing profile');
                await profileLoader.loadProfile(true);

                // DIM-STYLE: Wait for Bungie servers to sync (eventually consistent)
                // This prevents 1623 (ItemNotFound) errors when transferring immediately after equip
                debugLog('SynergyGalaxy', '⏳ Waiting for Bungie sync...');
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
            }

            if (targetCharacterId === 'vault') {
                // Transfer to vault - optimistic update happens inside smartTransfer
                debugLog('SynergyGalaxy', '🔄 Starting vault transfer...');

                // Start the transfer (updateLocalStore happens synchronously inside)
                const transferPromise = transferService.smartTransfer(itemInstanceId, itemHash, true, currentCharId!, session);

                // Force TWO synchronous re-renders to ensure nodes regenerate
                flushSync(() => {
                    setRenderTrigger(prev => prev + 1);
                });
                flushSync(() => {
                    setRenderTrigger(prev => prev + 2);
                });

                debugLog('SynergyGalaxy', 'Forced sync re-render, waiting for API');

                // Wait for API to complete
                const res = await transferPromise;
                if (!res.success) {
                    errorLog('SynergyGalaxy', 'Vault transfer failed:', res.error);
                    // If it was a real failure (not ghost success), we stop here
                    useProfileStore.getState().removeActiveTransfer(itemInstanceId, false, true);
                    return;
                }
                debugLog('SynergyGalaxy', '✓ Vault transfer complete');
            } else {
                // Transfer to character
                if (isInVault) {
                    // Vault -> Character
                    debugLog('SynergyGalaxy', '🔄 Starting vault→character transfer...');
                    await transferService.smartTransfer(itemInstanceId, itemHash, false, targetCharacterId, session);
                    debugLog('SynergyGalaxy', '✓ Vault→character complete, sync re-render');
                    flushSync(() => {
                        setRenderTrigger(prev => prev + 1);
                    });
                } else {
                    // Character -> Character (via vault)
                    debugLog('SynergyGalaxy', '🔄 Starting char→char transfer (via vault)...');

                    // First to vault (SILENT to avoid double notification)
                    const res1 = await transferService.smartTransfer(itemInstanceId, itemHash, true, currentCharId!, session, { silent: true });
                    if (!res1.success) {
                        errorLog('SynergyGalaxy', 'Char→Vault leg failed:', res1.error);
                        useProfileStore.getState().removeActiveTransfer(itemInstanceId, false, true);
                        return;
                    }

                    debugLog('SynergyGalaxy', '✓ First leg (→vault) complete, sync re-render');
                    flushSync(() => {
                        setRenderTrigger(prev => prev + 1);
                    });

                    // Then to target character
                    const res2 = await transferService.smartTransfer(itemInstanceId, itemHash, false, targetCharacterId, session);
                    if (!res2.success) {
                        errorLog('SynergyGalaxy', 'Vault→Char leg failed:', res2.error);
                        useProfileStore.getState().removeActiveTransfer(itemInstanceId, false, true);
                        return;
                    }
                    debugLog('SynergyGalaxy', '✓ Second leg (→character) complete, sync re-render');
                    flushSync(() => {
                        setRenderTrigger(prev => prev + 1);
                    });
                }
            }

            // User Request: Stabilize camera at orbit immediately after transfer confirmation
            // Trigger home before slow profile reloads
            handleResetView();

            // Refresh profile to get latest state
            debugLog('SynergyGalaxy', '✓ Transfer complete, refreshing profile');
            await profileLoader.loadProfile(true);

            // Trigger visual arrival effect (refresh success state for new node)
            // Call removeActiveTransfer again with success=true to set the bit
            useProfileStore.getState().removeActiveTransfer(itemInstanceId);

            // Trigger Gold Transmat Effect
            setEquippingItemIds(prev => {
                const next = new Set(prev);
                next.add(itemInstanceId);
                return next;
            });
            setTimeout(() => {
                setEquippingItemIds(prev => {
                    const next = new Set(prev);
                    next.delete(itemInstanceId);
                    return next;
                });
            }, 2500);

            // Final re-render to ensure everything is in sync
            debugLog('SynergyGalaxy', 'Final galaxy re-render');
            setRenderTrigger(prev => prev + 1);

            // Reset view after successful transfer
            debugLog('SynergyGalaxy', 'Resetting view');
            handleResetView();

            debugLog('SynergyGalaxy', '✅ Transfer sequence completed!');

        } catch (error) {
            errorLog('SynergyGalaxy', 'Transfer failed:', error);
            // Visual feedback: clear loading and set failed state
            useProfileStore.getState().removeActiveTransfer(itemInstanceId, false, true);
            setRenderTrigger(prev => prev + 1);
        }
    }, [focusedNode, vaultInventory, selectedCharacterId, characterEquipment, handleResetView]);

    const handleEquipItem = useCallback(async (targetCharacterId: string) => {
        const nodeToEquip = focusedNodeRef.current;
        if (!nodeToEquip?.instanceId || !nodeToEquip?.originalItem) return;

        const itemInstanceId = nodeToEquip.instanceId;

        // User Request: Stabilize camera at orbit immediately
        handleResetView();

        try {
            // Determine current location
            const isInVault = vaultInventory.some(v => v.itemInstanceId === itemInstanceId);
            let sourceCharacterId: string | undefined;
            for (const charId in characterInventories) {
                if (characterInventories[charId].some(i => i.itemInstanceId === itemInstanceId)) {
                    sourceCharacterId = charId;
                    break;
                }
            }
            if (!sourceCharacterId) {
                for (const charId in characterEquipment) {
                    if (characterEquipment[charId].some(i => i.itemInstanceId === itemInstanceId)) {
                        sourceCharacterId = charId;
                        break;
                    }
                }
            }


            // 1 & 2. Unified Transfer & Equip (DIM Parity)
            const sourceId = isInVault ? 'vault' : sourceCharacterId!;
            const session = createMoveSession([itemInstanceId], 5, targetCharacterId);

            debugLog('SynergyGalaxy', `Starting unified move/equip for ${itemInstanceId} from ${sourceId} to ${targetCharacterId}`);
            // DIM Parity: Pass silent: true since Galaxy handles its own success animations
            const equipSuccess = await transferService.moveItem(nodeToEquip.originalItem, sourceId, targetCharacterId, session, { equip: true, silent: true });
            debugLog('SynergyGalaxy', 'Unified move result:', equipSuccess);

            if (equipSuccess.success === false) {
                // DIM Parity: Ghost success verification - check actual item state before treating as error
                // This handles cases where Bungie API returns 500 but the operation actually succeeded
                await profileLoader.loadProfile(true);
                const latestState = useProfileStore.getState();
                const targetEquipment = latestState.characterEquipment[targetCharacterId] || [];
                const isActuallyEquipped = targetEquipment.some(eq => eq.itemInstanceId === itemInstanceId);

                if (!isActuallyEquipped) {
                    // Only throw if item is truly not equipped
                    throw new Error(equipSuccess.error || "Equip failed");
                }
                // Ghost success detected - continue with success animation
                debugLog('SynergyGalaxy', `Ghost success detected for equip of ${itemInstanceId}`);
            }

            // 3. Final cleanup and Success Animation
            await profileLoader.loadProfile(true);
            useProfileStore.getState().removeActiveTransfer(itemInstanceId);
            useProfileStore.getState().removeActiveTransfer(itemInstanceId, true);

            // Trigger Gold Transmat Effect
            setEquippingItemIds(prev => {
                const next = new Set(prev);
                next.add(itemInstanceId);
                return next;
            });
            setTimeout(() => {
                setEquippingItemIds(prev => {
                    const next = new Set(prev);
                    next.delete(itemInstanceId);
                    return next;
                });
            }, 2500);

            // Trigger Global Centered Effect
            useUIStore.getState().triggerGlobalTransmat('success');
            setTimeout(() => useProfileStore.getState().clearSuccessfulTransfer(itemInstanceId), 2000);

        } catch (error) {
            errorLog('SynergyGalaxy', 'Equip failed:', error);
            // Visual feedback: clear loading and set failed state
            useProfileStore.getState().removeActiveTransfer(itemInstanceId, false, true);

            setRenderTrigger(prev => prev + 1);
        }
    }, [vaultInventory, characterInventories, characterEquipment, handleResetView, startTransition]);

    const handleNodeClick = useCallback((node: any) => {
        // Disable left-click zoom when an item is already focused
        // UNLESS it's the same node, handled below
        if (focusedNode && focusedNode.instanceId !== node.instanceId && focusedNode.id !== node.id) {
            return;
        }

        if (isSynergyMode) {
            // If in synergy mode and clicking a node, only allow if it's part of the web
            if (isNodeSynchronized(node)) {
                // Treat as a wire lock to this specific instance
                handleSynergyWireLock(node.instanceId || node.id);
            }
            return;
        }

        // Subclass nodes should ALWAYS navigate immediately, never zoom/focus like gear
        if (node.type === 'subclass' || node.originalItem?.bucketHash === BUCKET_HASHES.SUBCLASS) {
            const item = node.originalItem;
            if (item) {
                useUIStore.getState().setBuilderView('subclass', { hash: item.itemHash, itemInstanceId: item.itemInstanceId });
                // Clean up view state when navigating away
                setIsLocked(false);
                isLockedRef.current = false;
                setFocusedNode(null);
                hideTooltip();
                activeTooltipNodeId.current = null;
                return;
            }
        }

        // If clicking the ALREADY focused node, open transfer menu
        const nodeInstanceId = node.instanceId || node.id;
        if (isLocked && focusedNode && (focusedNode.instanceId === nodeInstanceId || focusedNode.id === nodeInstanceId)) {
            // Re-show tooltip to ensure it's visible/positioned
            if (node.originalItem) {
                const { screenX, screenY, scale } = projectToScreen(node.x, node.y, node.z);
                const fixedPosition = {
                    x: screenX + (42 * scale) + 12,
                    y: screenY
                };
                showTooltip(
                    node.originalItem,
                    node.instanceId ? itemInstances[node.instanceId] : undefined,
                    undefined,
                    true,
                    handleTransferItem,
                    handleEquipItem,
                    true,
                    fixedPosition,
                    node.type === 'subclass'
                );
                // Trigger the menu to open
                openTransferMenu();
            }
            return;
        }

        setIsLocked(true);
        isLockedRef.current = true;
        setFocusedNode(node);

        // Immediate HUD snap: Call showTooltip explicitly to bypass redundancy check and set isHud: true
        if (node.originalItem) {
            // Calculate proximal position: Connected to right edge, centered vertically
            const { screenX, screenY } = projectToScreen(node.x, node.y, node.z);
            const fixedPosition = {
                x: screenX,
                y: screenY
            };
            showTooltip(node.originalItem, node.instanceId ? itemInstances[node.instanceId] : undefined, undefined, true, handleTransferItem, handleEquipItem, true, fixedPosition, node.type === 'subclass', () => { }, false);
            activeTooltipNodeId.current = nodeInstanceId;
        }

        // We shift the targetX slightly to the LEFT of the node center (-node.x - gap)
        // This pushes the item to the LEFT of the screen center to make room for the tooltip on the right
        const balanceShift = 0; // Centered to place tooltip behind image
        const targetX = -node.x - balanceShift;
        const targetY = -node.y;
        const targetZ = -node.z + 300; // Zoom in closer to the item

        // Freeze parallax when locking to prevent shifting during interaction
        targetParallax.current = { x: 0, y: 0 };
        parallaxOffset.current = { x: 0, y: 0 };

        // Use helper for NaN-safe transition
        startTransition(targetX, targetY, targetZ, 800);
    }, [isSynergyMode, hideTooltip, isLocked, focusedNode, openTransferMenu, itemInstances, handleTransferItem, showTooltip, startTransition]);

    // Tooltip detection callback - finds which node is under the mouse
    const updateTooltipDetection = useCallback((mx: number, my: number) => {
        if (!containerRect.current) return;
        if (isWireHoveringRef.current) return;

        // Disable tooltips during synergy mode unless we are already locked on a specific item
        // This prevents background stars and other items from showing tooltips during the synergy interaction
        if (isSynergyMode && !isLocked) {
            if (activeTooltipNodeId.current) {
                hideTooltip();
                activeTooltipNodeId.current = null;
            }
            return;
        }

        let closestNode: Element | null = null;
        let foundNode: NodePosition | null = null;
        let minScore = Infinity;
        let foundVaultStar: any = null;

        // 1. Native Hover Check
        const hoveredElement = document.elementFromPoint(mx, my);
        const hoveredNodeEl = hoveredElement?.closest('.galaxy-node') as HTMLElement;

        // OCCLUSION CHECK: Skip galaxy hovers if mouse is over UI or Tooltips
        const isOverUI = hoveredElement &&
            hoveredElement !== containerRef.current &&
            hoveredElement !== canvasRef.current &&
            !hoveredNodeEl;

        if (isOverUI) {
            // Keep locked tooltips visible, but hide floating ones
            if (activeTooltipNodeId.current && !isLocked) {
                hideTooltip();
                activeTooltipNodeId.current = null;
            }
            return;
        }

        if (hoveredNodeEl) {
            const nodeId = hoveredNodeEl.getAttribute('data-node-id');
            const node = nodes.find(n => n.id === nodeId);
            if (node) {
                closestNode = hoveredNodeEl;
                foundNode = node;
                minScore = 0;
            }
        }

        // 2. Fallback Hit Detection
        if (!foundNode) {
            const rect = containerRect.current;
            const snap = projectionSnapshotRef.current;
            if (rect) {
                const relX = mx - rect.left - snap.centerX;
                const relY = my - rect.top - snap.centerY;

                const visibleNodes = nodes.filter(n => n.lodLevel < 2);

                // Pre-compute projections and finalZ for all nodes
                const nodesWithProjection = visibleNodes.map(node => {
                    const projection = projectToScreen(node.x, node.y, node.z);
                    return { node, projection };
                }).filter(({ projection }) => {
                    const farClip = performanceMode === 'low' ? -2500 : performanceMode === 'medium' ? -10000 : -25000;
                    return projection.finalZ <= 990 && projection.finalZ >= farClip;
                });

                // Sort by finalZ (CLOSEST FIRST) - items closer to camera have higher finalZ
                const sortedNodes = nodesWithProjection.sort((a, b) => b.projection.finalZ - a.projection.finalZ);

                sortedNodes.forEach(({ node, projection }) => {
                    const el = nodeRefs.current.get(node.id);
                    if (!el) return;
                    if (el.style.display === 'none' || el.style.opacity === '0') return;

                    const { stageX, stageY, scale, finalZ } = projection;

                    const distance = Math.sqrt(Math.pow(relX - stageX, 2) + Math.pow(relY - stageY, 2));
                    const actualIconSize = 84;
                    const projectedSize = actualIconSize * scale;

                    let hitRadius = projectedSize * 0.55;
                    if (activeTooltipNodeId.current === node.id) {
                        hitRadius *= 1.3;
                    }
                    hitRadius = Math.max(30, Math.min(120, hitRadius));

                    if (distance < hitRadius) {
                        const score = (distance / hitRadius) - (finalZ / 500);
                        if (score < minScore) {
                            minScore = score;
                            closestNode = el;
                            foundNode = node;
                        }
                    }
                });
            }
        }

        // 3. Vault Star Detection
        if (!foundNode && isVaultSearchVisibleRef.current && containerRect.current) {
            const rect = containerRect.current;
            const relX = mx - rect.left;
            const relY = my - rect.top;

            let minVaultDist = Infinity;
            projectedVaultRef.current.forEach(v => {
                const dist = Math.sqrt(Math.pow(v.px - relX, 2) + Math.pow(v.py - relY, 2));
                const hitRadius = Math.max(25, v.size + 15);

                if (dist < hitRadius && dist < minVaultDist) {
                    minVaultDist = dist;
                    foundVaultStar = v;
                }
            });
        }

        if (closestNode && (foundNode as NodePosition)) {
            const node = foundNode as NodePosition;
            const item = node.originalItem;
            const instanceId = node.instanceId;

            if (isSynergyMode) {
                // In synergy mode, only track hover for wire targeting, don't show tooltips
                const targetId = closestNode ? (foundNode as NodePosition).instanceId || (foundNode as NodePosition).id : null;
                if (targetId !== hoveredSynergyNodeId) {
                    setHoveredSynergyNodeId(targetId);
                }
                // Hide any existing tooltip when in synergy mode
                if (activeTooltipNodeId.current) {
                    hideTooltip();
                    activeTooltipNodeId.current = null;
                }
                return;
            }

            // Clear any pending hide timer
            if (tooltipHideTimerRef.current) {
                clearTimeout(tooltipHideTimerRef.current);
                tooltipHideTimerRef.current = null;
            }

            // FLUIDITY: If we moved to a new node, cancel pending show timer for previous node
            if (activeTooltipNodeId.current !== node.id) {
                if (tooltipShowTimerRef.current && lastTooltipStateRef.current.id !== node.id) {
                    clearTimeout(tooltipShowTimerRef.current);
                    tooltipShowTimerRef.current = null;
                }
            }

            if (isLocked && focusedNode) {
                const isFocusedDisplay = (closestNode as HTMLElement).classList.contains('galaxy-focused-display');
                const isFocusedNode = instanceId === focusedNode.instanceId;
                if (!isFocusedDisplay && !isFocusedNode) {
                    return;
                }
            }

            if (item) {
                const tooltipId = node.id;
                const { screenX, screenY, scale } = projectToScreen(node.x, node.y, node.z);

                // SAFETY: Skip tooltip update if projection returned NaN (camera corruption)
                if (isNaN(screenX) || isNaN(screenY) || isNaN(scale)) {
                    return;
                }

                const targetX = Math.round(screenX);
                const targetY = Math.round(screenY);

                const posChanged = Math.abs(targetX - lastTooltipStateRef.current.x) > 1 || Math.abs(targetY - lastTooltipStateRef.current.y) > 1;
                const nodeChanged = activeTooltipNodeId.current !== tooltipId;

                if (nodeChanged || (isLocked && posChanged)) {
                    // FLUIDITY: Delay showing the tooltip for new nodes
                    if (nodeChanged && !isLocked) { // Only delay if not locked (locked is responsive)
                        if (tooltipShowTimerRef.current) {
                            clearTimeout(tooltipShowTimerRef.current);
                        }

                        // Instant for equipped subclass, fast for other subclasses (50ms), normal delay for other items (150ms)
                        const delay = (node.type === 'subclass' && node.isEquipped) ? 0 : (node.type === 'subclass' ? 50 : 150);
                        tooltipShowTimerRef.current = setTimeout(() => {
                            const element = getElement(item.itemHash);
                            const fixedPosition = isLocked ? { x: targetX, y: targetY } : undefined;
                            showTooltip(item, instanceId ? itemInstances[instanceId] : undefined, element as any, isLocked, handleTransferItem, handleEquipItem, isLocked, fixedPosition, node.type === 'subclass', () => { }, false);
                            activeTooltipNodeId.current = tooltipId;
                            lastTooltipStateRef.current = { id: tooltipId, x: targetX, y: targetY };
                            tooltipShowTimerRef.current = null;
                        }, delay);
                    } else {
                        // Immediate update for locked nodes or position changes (dragging locked item)
                        const element = getElement(item.itemHash);
                        const fixedPosition = isLocked ? { x: targetX, y: targetY } : undefined;
                        showTooltip(item, instanceId ? itemInstances[instanceId] : undefined, element as any, isLocked, handleTransferItem, handleEquipItem, isLocked, fixedPosition, node.type === 'subclass', () => { }, false);
                        // Only update refs if we are actually showing
                        if (!tooltipShowTimerRef.current) {
                            activeTooltipNodeId.current = tooltipId;
                            lastTooltipStateRef.current = { id: tooltipId, x: targetX, y: targetY };
                        }
                    }
                }
            }
        } else if (foundVaultStar) {
            const star = foundVaultStar;
            const item = star.item;
            const instanceId = star.instanceId;

            if (isSynergyMode) return;

            if (item) {
                const tooltipId = instanceId || `star-${item.itemHash}`;
                const { screenX, screenY, scale } = projectToScreen(star.x, star.y, star.z);

                // SAFETY: Skip tooltip update if projection returned NaN (camera corruption)
                if (isNaN(screenX) || isNaN(screenY) || isNaN(scale)) {
                    return;
                }

                const targetX = Math.round(screenX);
                const targetY = Math.round(screenY);

                const posChanged = Math.abs(targetX - lastTooltipStateRef.current.x) > 1 || Math.abs(targetY - lastTooltipStateRef.current.y) > 1;
                const nodeChanged = activeTooltipNodeId.current !== tooltipId;

                if (nodeChanged || (isLocked && posChanged)) {
                    const element = getElement(item.itemHash);
                    const fixedPosition = isLocked ? { x: targetX, y: targetY } : undefined;
                    showTooltip(item, (instanceId && itemInstances[instanceId]) ? itemInstances[instanceId] : undefined, element as any, isLocked, handleTransferItem, handleEquipItem, isLocked, fixedPosition, star.type === 'subclass', () => { }, false);
                    activeTooltipNodeId.current = tooltipId;
                    lastTooltipStateRef.current = { id: tooltipId, x: targetX, y: targetY };
                }
            }
        } else if (isLocked && focusedNode) {
            // NO NODE HOVERED - but we're locked on a focused node
            // SAFETY: Don't show tooltip in synergy mode even when locked
            if (isSynergyMode) {
                if (activeTooltipNodeId.current) {
                    hideTooltip();
                    activeTooltipNodeId.current = null;
                }
                return;
            }

            const item = focusedNode.originalItem;
            if (item) {
                const tooltipId = focusedNode.instanceId || focusedNode.id;
                const { screenX, screenY, scale } = projectToScreen(focusedNode.x, focusedNode.y, focusedNode.z);

                // SAFETY: Skip tooltip update if projection returned NaN (camera corruption)
                if (isNaN(screenX) || isNaN(screenY) || isNaN(scale)) {
                    return;
                }

                const targetX = Math.round(screenX + (42 * scale) + 12);
                const targetY = Math.round(screenY);

                const posChanged = Math.abs(targetX - lastTooltipStateRef.current.x) > 1 || Math.abs(targetY - lastTooltipStateRef.current.y) > 1;
                const nodeChanged = activeTooltipNodeId.current !== tooltipId;

                if (nodeChanged || posChanged) {
                    const fixedPosition = { x: targetX, y: targetY };
                    showTooltip(item, focusedNode.instanceId ? itemInstances[focusedNode.instanceId] : undefined, undefined, true, handleTransferItem, handleEquipItem, true, fixedPosition, false, () => { }, false);
                    activeTooltipNodeId.current = tooltipId as string;
                    lastTooltipStateRef.current = { id: tooltipId as string, x: targetX, y: targetY };
                }
            }
        } else if (activeTooltipNodeId.current) {
            // FLUIDITY: Cancel pending show if we leave before it triggers
            if (tooltipShowTimerRef.current) {
                clearTimeout(tooltipShowTimerRef.current);
                tooltipShowTimerRef.current = null;
            }

            // HYSTERESIS: Don't hide immediately
            if (!tooltipHideTimerRef.current) {
                tooltipHideTimerRef.current = setTimeout(() => {
                    hideTooltip();
                    activeTooltipNodeId.current = null;
                    lastTooltipStateRef.current = { id: null, x: -1, y: -1 };
                    tooltipHideTimerRef.current = null;
                }, 150);
            }
        }
    }, [isLocked, focusedNode, showTooltip, hideTooltip, itemInstances, getElement, isSynergyMode, nodes, handleTransferItem, projectToScreen, hoveredSynergyNodeId, performanceMode]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (tooltipHideTimerRef.current) {
                clearTimeout(tooltipHideTimerRef.current);
            }
        };
    }, []);

    // Sync updateTooltipDetectionRef with state for use in the animation loop
    useEffect(() => {
        updateTooltipDetectionRef.current = updateTooltipDetection;
    }, [updateTooltipDetection]);

    // Update the ref so the render loop can always call the latest version
    useEffect(() => {
        updateTooltipDetectionRef.current = updateTooltipDetection;
    }, [updateTooltipDetection]);

    const handleMove = useCallback((e: MouseEvent) => {
        const mx = e.clientX;
        const my = e.clientY;

        if (!containerRect.current) return;

        // SELF-CORRECTION: Check if mouse is actually inside bounds to fix sticky false state
        if (mx >= containerRect.current.left && mx <= containerRect.current.right &&
            my >= containerRect.current.top && my <= containerRect.current.bottom) {
            if (!isMouseInBounds.current) isMouseInBounds.current = true;
        }

        // Update tooltip detection immediately on move
        // BUT prevent showing new tooltips if we are currently moving fast (isMovingRef)
        // This ensures user must STOP to hover
        if (!isMovingRef.current) {
            updateTooltipDetection(mx, my);
        }

        // Camera Move Logic - DISABLE when locked OR during zoom transition OR when dragging is disabled
        if (isDragging.current && !isLockedRef.current && !transitionRef.current?.active && !isDraggingDisabled.current) {
            // Safety: If last pos was reset (-1), don't jump, just sync
            if (lastMousePos.current.x !== -1 && lastMousePos.current.y !== -1) {
                const dx = mx - lastMousePos.current.x;
                const dy = my - lastMousePos.current.y;
                targetOffset.current.x += dx;
                targetOffset.current.y += dy;
            }
        }

        // Middle-click rotation - apply tilt based on mouse movement
        if (isMiddleButtonDown.current && !isLockedRef.current && !transitionRef.current?.active) {
            if (lastMousePos.current.x !== -1 && lastMousePos.current.y !== -1) {
                const dx = mx - lastMousePos.current.x;
                const dy = my - lastMousePos.current.y;
                // Scale rotation sensitivity (lower = slower rotation)
                const rotationSensitivity = 0.3;
                targetTilt.current.y += dx * rotationSensitivity;
                targetTilt.current.x += dy * rotationSensitivity;
                // No clamp - allow full 360° rotation
            }
        }
        lastMousePos.current = { x: mx, y: my };
    }, [updateTooltipDetection]);

    const handleClick = useCallback((e: MouseEvent) => {
        // Drag protection: If user moved more than 5px, it's a drag, not a click
        const dist = Math.sqrt(Math.pow(e.clientX - dragStartPos.current.x, 2) + Math.pow(e.clientY - dragStartPos.current.y, 2));
        if (dist > 5) return;

        // DOM PRIORITY: If we clicked a DOM node that's NOT the container, bail.
        // The individual nodes have their own onClick handlers.
        const targetEl = e.target as HTMLElement;
        const hoveredNodeEl = targetEl.closest('.galaxy-node');
        if (hoveredNodeEl) {
            return;
        }

        // OCCLUSION CHECK: Don't click through the search box or other UI
        const isOverUI = targetEl &&
            targetEl !== containerRef.current &&
            targetEl !== canvasRef.current &&
            !hoveredNodeEl;

        if (isOverUI) {
            return;
        }

        if (containerRect.current && isVaultSearchVisible) {
            const rx = e.clientX - containerRect.current.left;
            const ry = e.clientY - containerRect.current.top;

            const target = projectedVaultRef.current.find(v => {
                const dist = Math.sqrt(Math.pow(v.px - rx, 2) + Math.pow(v.py - ry, 2));
                return dist < Math.max(25, v.size + 15);
            });

            if (target) {
                const item = target.item;
                const itemInstance = target.instanceId ? itemInstances[target.instanceId] : undefined;
                const itemDef = manifestService.getItem(item.itemHash);
                const element = getElement(item.itemHash);
                const isWeapon = itemDef?.itemType === 3;
                const damageType = itemInstance?.damageType || itemDef?.defaultDamageType;
                const damageTypeName = damageType ? DAMAGE_TYPE_NAMES[damageType] : undefined;

                // Build a full NodePosition object so the focused view has all data it needs (like .hash for icon)
                const node: any = {
                    x: target.x,
                    y: target.y,
                    z: target.z,
                    id: `vault-${target.instanceId || item.itemHash}`,
                    type: isWeapon ? 'weapon' : 'armor',
                    hash: item.itemHash,
                    instanceId: target.instanceId,
                    bucketHash: itemDef?.inventory?.bucketTypeHash || 0,
                    element: element as any,
                    isEquipped: false,
                    isEmpty: false,
                    lodLevel: 0,
                    tierClass: getTierClass(item),
                    power: itemInstance?.power,
                    damageIconUrl: (isWeapon && damageTypeName) ? getBungieUrl(manifestService.getDamageTypeIcon(damageTypeName as any) || '') : undefined,
                    watermarkUrl: itemDef ? getBungieUrl(itemDef.iconWatermarkFeatured || itemDef.iconWatermark) : undefined,
                    isLegacyWatermark: itemDef ? (!itemDef.iconWatermarkFeatured && !!itemDef.iconWatermark) || isLegacyVersion(itemDef.quality?.currentVersion) : false,
                    isMasterwork: !!(item.state && (item.state & 4)),
                    isCrafted: !!(item.state && (item.state & 8)),
                    isEnhanced: !!(item.state && (item.state & 8) && itemInstance?.gearTier && itemInstance.gearTier >= 2),
                    tier: itemInstance?.gearTier,

                    originalItem: item,
                    iconUrl: getBungieUrl(manifestService.getItem(item.overrideStyleItemHash || item.itemHash)?.displayProperties?.icon || '')
                };

                handleNodeClick(node);
            }
        }
    }, [handleNodeClick, getElement, isVaultSearchVisible, handleResetView, itemInstances]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            // PRIORITY: Close Synergy Menu if open (Blackout mode exit)
            if (isSynergyMenuOpen) {
                setIsSynergyMenuOpen(false);
                // Also reset view to ensure we don't return to a weird locked state
                handleResetView();
                return;
            }

            handleResetView();
            onResetView?.();
            return;
        }

        // DISABLE keyboard camera movement when locked
        if (isLockedRef.current) return;

        keysPressed.current.add(e.key.toLowerCase());
    }, [handleResetView, onResetView, isSynergyMenuOpen]);

    // Expose handleResetView to parent via ref
    useEffect(() => {
        if (resetViewRef) {
            resetViewRef.current = handleResetView;
        }
    }, [resetViewRef, handleResetView]);

    const handleKeyUp = useCallback((e: KeyboardEvent) => {
        // DISABLE keyboard camera movement when locked
        if (isLockedRef.current) return;

        keysPressed.current.delete(e.key.toLowerCase());
    }, []);

    const handleDown = useCallback((e: MouseEvent) => {
        if (isSynergyMenuOpen) return; // Disable drag when menu is open

        // Re-enable dragging and parallax on first mouse down after being disabled
        if (isDraggingDisabled.current) {
            isDraggingDisabled.current = false;
        }
        if (isParallaxDisabled.current) {
            isParallaxDisabled.current = false;
        }

        // Middle button (wheel click) for rotation
        if (e.button === 1) {
            e.preventDefault(); // Prevent default middle-click behavior (auto-scroll)
            isMiddleButtonDown.current = true;
            return;
        }

        // Left button (0) for panning - only left click should enable pan
        if (e.button === 0) {
            isDragging.current = true;
            dragStartPos.current = { x: e.clientX, y: e.clientY };
        }
    }, [isSynergyMenuOpen]);

    const handleUp = useCallback((e?: MouseEvent) => {
        // Reset middle button state
        if (e?.button === 1) {
            isMiddleButtonDown.current = false;
            return;
        }
        isDragging.current = false;
        isMiddleButtonDown.current = false; // Also reset on any mouse up for safety
    }, []);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        // Don't call preventDefault - causes issues with passive listeners
        // DISABLE zoom when locked, during zoom transition, OR when Synergy Menu is open
        if (isLocked || transitionRef.current?.active || isSynergyMenuOpen) return;

        // Zoom in/out by adjusting Z offset
        // Faster zoom while synchronized - adjusted for smoother feel
        const zoomSpeed = isSynergyMode ? 300 : 150;
        const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;

        // CAMERA BOUNDS: Prevent zooming too far out
        // REMOVED FORWARD CAP: Truly infinite forward scroll (Fly-through handled by projectToScreen culling)
        const minZ = -2000000; // Deep space limit

        targetOffset.current.z = Math.max(minZ, targetOffset.current.z + delta);

        // NO CAP on maxZ - fly as far forward as you want.
    }, [isLocked, isSynergyMode, isSynergyMenuOpen]);

    // Get the screen position of an item (used by SynergyWeb)
    // Matches SynergyWeb's expected signature: (itemName, location, characterId?, nodeId?)
    const getItemPosition = useCallback((
        itemName: string,
        _location: 'equipped' | 'inventory' | 'vault',
        _characterId?: string,
        nodeId?: string
    ): { x: number; y: number; scale: number; opacity: number; nodeId?: string } | null => {
        if (!containerRect.current) return null;

        const { centerX, centerY } = projectionSnapshotRef.current;

        // Find node by nodeId first (most reliable)
        let foundNode: NodePosition | undefined;

        if (nodeId) {
            foundNode = nodes.find(n => n.id === nodeId || n.instanceId === nodeId);
        }

        // If not found by nodeId, search by itemName
        if (!foundNode && itemName) {
            const searchName = itemName.toLowerCase();

            // Special handling for subclass searches like "solar subclass", "arc subclass"
            // SynergyWeb searches with format "${element} subclass"
            const subclassMatch = searchName.match(/^(arc|solar|void|stasis|strand|prismatic)\s+subclass$/);
            if (subclassMatch) {
                const targetElement = subclassMatch[1];
                // Find the EQUIPPED subclass that matches this element
                foundNode = nodes.find(n => {
                    if (n.type !== 'subclass' || !n.isEquipped) return false;
                    return n.element.toLowerCase() === targetElement;
                });
            }

            // If still not found, try regular name matching
            if (!foundNode) {
                foundNode = nodes.find(n => {
                    if (!n.hash) return false;
                    const itemDef = manifestService.getItem(n.hash);
                    const name = itemDef?.displayProperties?.name?.toLowerCase() || '';
                    // Match if names contain each other
                    return name.includes(searchName) || searchName.includes(name);
                });
            }
        }

        if (foundNode) {
            // SYNERGY HUD: If this is the synergy source node, it's anchored to screen center
            const isSourceNode = isSynergyMode && foundNode.id === synergySourceNodeId;
            if (isSourceNode) {
                // Return screen center position for HUD-anchored source
                return {
                    x: centerX,
                    y: centerY,
                    scale: 1.5,
                    opacity: 1,
                    nodeId: foundNode.id
                };
            }

            const { screenX, screenY, scale, finalZ, isVisible } = projectToScreen(foundNode.x, foundNode.y, foundNode.z);

            // Hide if clipped by near plane
            if (!isVisible) return null;

            // Calculate opacity based on depth
            let opacity = 1;

            // PASS-BY FADE: Fade out rapidly as items pass the camera plane
            if (finalZ > 850) {
                opacity *= Math.max(0, 1 - (finalZ - 850) / 145);
            }

            // DEEP VOID FADE: In Random mode, items can be very far. 
            // Hide them initially and fade them in as we get closer (-15000 to -5000)
            if (finalZ < -5000) {
                opacity *= Math.max(0, 1 - (Math.abs(finalZ) - 5000) / 10000);
            }

            return {
                x: screenX,
                y: screenY,
                scale,
                opacity,
                nodeId: foundNode.id
            };
        }

        // Check vault points (canvas-based stars) by name or instanceId
        let foundVaultPt: typeof vaultPointsRef.current[0] | undefined;

        if (nodeId) {
            foundVaultPt = vaultPointsRef.current.find(v => v.instanceId === nodeId);
        }

        if (!foundVaultPt && itemName) {
            const searchName = itemName.toLowerCase();
            foundVaultPt = vaultPointsRef.current.find(v => {
                if (!v.originalItem?.itemHash) return false;
                const itemDef = manifestService.getItem(v.originalItem.itemHash);
                const name = itemDef?.displayProperties?.name?.toLowerCase() || '';
                return name.includes(searchName) || searchName.includes(name);
            });
        }

        if (foundVaultPt) {
            const { screenX, screenY, scale, finalZ, isVisible } = projectToScreen(foundVaultPt.x, foundVaultPt.y, foundVaultPt.z);

            // Hide if clipped by near plane
            if (!isVisible) return null;

            // Calculate opacity based on depth
            let opacity = 1;

            if (finalZ > 850) {
                opacity *= Math.max(0, 1 - (finalZ - 850) / 145);
            }

            if (finalZ < -5000) {
                opacity *= Math.max(0, 1 - (Math.abs(finalZ) - 5000) / 10000);
            }

            return {
                x: screenX,
                y: screenY,
                scale,
                opacity,
                nodeId: foundVaultPt.instanceId
            };
        }

        return null;
    }, [nodes, isSynergyMode, synergySourceNodeId, synchronizedNodeIds, projectToScreen]);

    // Handle right-click to trigger synergy web
    const handleTriggerSynergy = useCallback(async (node: NodePosition, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Disable synergize when an item is focused (zoomed in)
        if (focusedNode) return;

        if (!node.originalItem) return;

        // Disable synergize for non-exotic items (allow subclasses)
        if (node.type !== 'subclass' && node.tierClass !== 'exotic') return;

        // Ensure tooltips are cleared when starting synergy view
        hideTooltip();
        activeTooltipNodeId.current = null;

        // Get the item definition
        const item = node.originalItem;
        const itemDef = manifestService.getItem(item.itemHash);
        if (!itemDef) return;

        // Get guardian class from current character
        const { characters, selectedCharacterId: charId } = useProfileStore.getState();
        const currentChar = characters.find(c => c.characterId === charId);
        const guardianClass = currentChar?.classType ?? GuardianClass.Titan;

        // Set as synergy source - calculate screen position for the node
        setSynergySourceNodeId(node.id);
        setIsSynergyMode(true);
        setIsSynergyExiting(false);

        // Pan camera to the clicked node with smooth transition (same as left-click)
        const targetX = -node.x;
        const targetY = -node.y;
        const targetZ = -node.z + 300; // Zoom in closer to the item

        // Use helper for NaN-safe transition
        startTransition(targetX, targetY, targetZ, 800);

        // Calculate and set the source position for the synergy web
        if (containerRect.current) {
            const { screenX, screenY, scale } = projectToScreen(node.x, node.y, node.z);
            setSynergySourcePos({ x: screenX, y: screenY, scale });
        }

        // For subclass, find synergies by element
        if (node.type === 'subclass') {
            const element = node.element;
            const elementName = element.toLowerCase();

            // Update element for UI immediately
            safeNotifyElementChange(element);

            // Find synergies for this element (search by element name)
            try {
                const synergies = await findSynergies(
                    'subclass',
                    elementName,
                    guardianClass,
                    { maxResults: maxSynergies, seed: randomVaultSeed }
                );
                setSynergyConnections(Array.isArray(synergies) ? synergies : []);
            } catch (err) {
                errorLog('SynergyGalaxy', 'Failed to find synergies for subclass:', err);
                setSynergyConnections([]);
            }
            return;
        }

        // Determine if armor or weapon
        const isWeapon = node.type === 'weapon';
        const isArmor = node.type === 'armor';
        if (!isWeapon && !isArmor) return;

        // Get item name
        const itemName = itemDef.displayProperties?.name || '';
        if (!itemName) return;

        // Find synergies for this item
        try {
            const synergies = await findSynergies(
                isWeapon ? 'weapon' : 'armor',
                itemName,
                guardianClass,
                { maxResults: maxSynergies, seed: randomVaultSeed }
            );
            setSynergyConnections(Array.isArray(synergies) ? synergies : []);

            // Update element for UI
            const element = getElement(item.itemHash);
            safeNotifyElementChange(element);
        } catch (err) {
            errorLog('SynergyGalaxy', 'Failed to find synergies:', err);
            setSynergyConnections([]);
        }
    }, [getElement, safeNotifyElementChange, maxSynergies, randomVaultSeed, projectToScreen, startTransition]);

    // Handle Synergy Equip (Trigger Animation + Close Overlay + Execute Service)
    const handleEquipSynergy = useCallback(async (synergy: any) => {
        // 1. Close Override/Web Overlay immediately for clean visual
        setIsSynergyMode(false); // Retract web, return to orbit or focus
        setSynergyConnections([]); // Clear connections to trigger exit animation on Web if handled there
        // Actually, better to keep mode true but let the overlay close - logic depends on if we want to stay in "Synergy Mode"
        // User requested: "Hide the equip screen to focus on the item being transported."
        // So we just close the overlay but keep the galaxy view active. The SynergyWeb itself might close or stay.
        // Let's close the overlay first via the callback passed to SynergyWeb (handled there),
        // but here we handle the actual equip logic.

        // User Request: Stabilize camera at orbit immediately
        handleResetView();

        debugLog('SynergyGalaxy', 'Equipping items for synergy:', synergy);

        // 2. Identify Item Instance IDs for Animation
        const targets = new Set<string>();

        // Resolve Instance IDs from names (similar to how SynergyWeb wires do it)
        const findNodeByName = (name: string, type: 'armor' | 'weapon') =>
            nodes.find(n => n.type === type && n.originalItem?.displayProperties?.name === name);

        const armor = findNodeByName(synergy.armor, 'armor');
        const weapon = findNodeByName(synergy.weapon, 'weapon');

        if (armor?.instanceId) targets.add(armor.instanceId);
        if (weapon?.instanceId) targets.add(weapon.instanceId);

        // Also add subclass if applicable? Usually subclass equip is instant or requires orbit, but we can animate it.
        const subclass = nodes.find(n => n.type === 'subclass' && n.element?.toLowerCase() === synergy.subclassType?.toLowerCase());
        if (subclass?.instanceId) targets.add(subclass.instanceId);

        // 3. Trigger "Equipping" Animation (Gold Flash)
        // MOVED: Trigger this AFTER the equip completes so it plays at the destination
        /* 
        if (targets.size > 0) {
            setEquippingItemIds(prev => {
                const next = new Set(prev);
                targets.forEach(t => next.add(t));
                return next;
            });
     
            // Auto-clear animation after 2.5s (animation duration + buffer)
            setTimeout(() => {
                setEquippingItemIds(prev => {
                    const next = new Set(prev);
                    targets.forEach(t => next.delete(t));
                    return next;
                });
            }, 2500);
        }
        */

        // 4. Delegate to TransferService for actual equip
        // We need to construct a "BuildTemplate" or similar payload.
        // For now, let's just use a simple robust equip if we have instances.
        if (armor?.instanceId && weapon?.instanceId) {
            const characterId = selectedCharacterId || '';

            // Construct a proper BuildTemplate for the transfer service
            // This ensures exotics are identified correctly for conflict resolution
            const buildTemplate: any = {
                id: `synergy-${Date.now()}`,
                name: synergy.buildName,
                element: synergy.element.toLowerCase(),
                guardianClass: synergy.classType,
                // Vital: Provide names/hashes because transferService uses them for exotic conflict logic
                exoticWeapon: {
                    name: synergy.weapon,
                    hash: weapon?.originalItem?.itemHash || 0,
                    slot: 1 // Kinetic/Energy slot assumption - service will resolve
                },
                exoticArmor: {
                    name: synergy.armor,
                    hash: armor?.originalItem?.itemHash || 0,
                    slot: 0 // Helmet/Gauntlets assumption - service will resolve
                },
                items: [], // We rely on resolving instances below for specific items
                armorMods: [],
                subclassConfig: {
                    // Start with basic hash if known
                    subclassHash: subclass?.originalItem?.itemHash || 0
                    // We could populate abilities here if we had them resolved to hashes
                    // For now, equipping the subclass item itself is the MVP
                }
            };

            // Use the specific instances we found to guarantee we equip the exact items shown in the graph
            // We pass them as the 'exotic' instances found
            if (weapon.instanceId) {
                // Pre-resolve the item for the service
                // Note: TransferService.equipBuild ultimately calls findItemByHashOrName.
                // It doesn't take direct instanceIDs in the template unless we hack the service or format.
                // However, we CAN just use equipBuild with the names (which we have) and let it work,
                // OR we can rely on our resolution here.

                // Better Strategy:
                // Use `equipBuild` which handles the logic of "unequip conflicting exotic -> equip new exotic".
                // We MUST provide the correctly shaped template.
            }

            try {
                // Optimistic UI updates are handled by store subscriptions to TransferService
                debugLog('SynergyGalaxy', 'Calling equipBuild with template:', buildTemplate);

                // Use profile service to equip
                // Note: transferService.equipBuild handles the logic
                const { success, error } = await transferService.equipBuild(buildTemplate, characterId, undefined, false, { silent: false });

                if (!success) {
                    errorLog('SynergyGalaxy', 'Equip failed:', error);
                } else {
                    debugLog('SynergyGalaxy', 'Equip success!');
                    // Trigger Global Centered Effect
                    useUIStore.getState().triggerGlobalTransmat('success');

                    // Close the menu
                    setIsSynergyMenuOpen(false);
                    setHoveredSynergyWire(null); // Clear hover state
                }
            } catch (err) {
                errorLog('SynergyGalaxy', 'Equip failed:', err);
            }
        }
    }, [nodes, selectedCharacterId, handleResetView]);

    // Memoize the wire hover change callback to prevent hook violations in render
    const handleWireHoverChange = useCallback((hovered: boolean) => {
        if (isWireHoveringRef.current === hovered) return;
        isWireHoveringRef.current = hovered;
        if (hovered) {
            hideTooltip();
            activeTooltipNodeId.current = null;
        }
    }, [hideTooltip]);

    // Track which wire is being hovered to dim non-synergy nodes
    const handleWireHover = useCallback((wire: { armorInstanceId: string | null; weaponInstanceId: string | null } | null) => {
        setHoveredSynergyWire(wire);
    }, []);

    const updateRect = useCallback(() => {
        if (containerRef.current && canvasRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            containerRect.current = rect;

            const canvas = canvasRef.current;
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            canvasSize.current = { width: rect.width, height: rect.height };

            const ctx = canvas.getContext('2d');
            if (ctx) ctx.scale(dpr, dpr);
        }
    }, []);

    // UPDATE RECT ON DATA CHANGE: Ensure canvas dimensions are valid after data loads
    // Previously this was clearing the rect causing a freeze until resize
    useEffect(() => {
        updateRect();
    }, [characterEquipment, characterInventories, vaultInventory, responseMintedTimestamp, updateRect]);

    useEffect(() => {
        // Master Render Loop (The Heartbeat)
        tickRef.current = (now: number) => {
            // 0.5. Keyboard Movement (WASD) - Disabled while typing, locked, OR during zoom transition
            // DISABLE keyboard movement when locked to allow tooltip interaction
            if (!isLockedRef.current && !transitionRef.current?.active) {
                const moveSpeed = isSynergyModeRef.current ? 45 : 25;
                const activeEl = document.activeElement;
                const isTyping = activeEl && (
                    activeEl.tagName === 'INPUT' ||
                    activeEl.tagName === 'TEXTAREA' ||
                    (activeEl as HTMLElement).isContentEditable
                );

                // Disable keyboard movement if typing OR if Synergy Menu is open OR if in Synergy Mode
                if (!isTyping && !isSynergyMenuOpen && !isSynergyModeRef.current) {
                    if (keysPressed.current.has('w')) targetOffset.current.z += moveSpeed;
                    if (keysPressed.current.has('s')) targetOffset.current.z -= moveSpeed;
                    if (keysPressed.current.has('a')) targetOffset.current.x += moveSpeed;
                    if (keysPressed.current.has('d')) targetOffset.current.x -= moveSpeed;
                    // Vertical movement via keyboard (Up/Down)
                    if (keysPressed.current.has('q')) targetOffset.current.y += moveSpeed;
                    if (keysPressed.current.has('e')) targetOffset.current.y -= moveSpeed;
                }
            }

            // 1. IMMERSIVE MODE: Drift + Parallax for "flying through space" feel
            if (immersiveMode && !isLockedRef.current && !transitionRef.current?.active && !isSynergyModeRef.current) {
                // Slow sinusoidal drift - like gently floating through space
                const driftSpeed = 0.0003; // Very slow oscillation
                const driftAmplitude = 0.15; // Subtle movement per frame
                driftPhase.current += driftSpeed * (now - (lastFpsUpdateTime.current || now));

                // Multi-frequency drift for organic feel
                const driftX = Math.sin(driftPhase.current) * driftAmplitude +
                    Math.sin(driftPhase.current * 0.7) * driftAmplitude * 0.5;
                const driftY = Math.cos(driftPhase.current * 0.8) * driftAmplitude * 0.7 +
                    Math.cos(driftPhase.current * 0.5) * driftAmplitude * 0.3;

                // Apply drift to offset
                driftOffset.current.x += driftX;
                driftOffset.current.y += driftY;
                targetOffset.current.x += driftX;
                targetOffset.current.y += driftY;

                // Subtle parallax tilt based on mouse position (gentle camera rotation)
                if (containerRect.current && lastMousePos.current.x !== -1) {
                    const centerX = containerRect.current.left + containerRect.current.width / 2;
                    const centerY = containerRect.current.top + containerRect.current.height / 2;
                    const normalizedX = (lastMousePos.current.x - centerX) / (containerRect.current.width / 2);
                    const normalizedY = (lastMousePos.current.y - centerY) / (containerRect.current.height / 2);

                    // Apply subtle parallax tilt (adds to manual rotation, doesn't override)
                    const parallaxStrength = 3; // Degrees of max parallax tilt
                    const parallaxTiltX = normalizedY * parallaxStrength;
                    const parallaxTiltY = -normalizedX * parallaxStrength;

                    // Smooth lerp toward parallax target
                    targetTilt.current.x += (parallaxTiltX - targetTilt.current.x) * 0.02;
                    targetTilt.current.y += (parallaxTiltY - targetTilt.current.y) * 0.02;
                }
            }

            // 1.5. Tilts controlled manually via middle-click rotation
            // (Removed auto-lerp behavior that reset tilt to zero)

            // 1.5. Mouse Following (Parallax feel) & EDGE PANNING
            // Disable parallax in synergy mode to allow free camera movement
            // Also disable when in orbit view with parallax disabled
            if (containerRect.current && !isLockedRef.current && !isSynergyModeRef.current && !isParallaxDisabled.current) {
                const centerX = containerRect.current.left + containerRect.current.width / 2;
                const centerY = containerRect.current.top + containerRect.current.height / 2;

                // Additive Parallax (Peeking)
                // We no longer set targetOffset directly; instead, we set targetParallax.
                targetParallax.current.x = -(lastMousePos.current.x - centerX) * 1.5;
                targetParallax.current.y = -(lastMousePos.current.y - centerY) * 1.5;

                // EDGE PANNING: Unlimited movement when reaching screen edges
                // Only active if mouse is actually inside the window/component bounds
                if (isMouseInBounds.current) {
                    const edgeThreshold = 150; // Pixels from edge to start panning (wider zone)
                    const maxPanSpeed = 45; // Max pixels per frame (more aggressive)
                    const { left, top, width, height } = containerRect.current;
                    const mx = lastMousePos.current.x;
                    const my = lastMousePos.current.y;

                    // Calculate distance from edges
                    const distLeft = mx - left;
                    const distRight = (left + width) - mx;
                    const distTop = my - top;
                    const distBottom = (top + height) - my;

                    // Use quadratic curve for more aggressive acceleration near edges
                    const getIntensity = (dist: number) => {
                        const normalized = 1 - (Math.max(0, dist) / edgeThreshold);
                        return normalized * normalized; // Quadratic for aggressive ramp-up
                    };

                    // Pan LEFT (Move items RIGHT)
                    if (distLeft < edgeThreshold && distLeft > -50) {
                        targetOffset.current.x += maxPanSpeed * getIntensity(distLeft);
                    }
                    // Pan RIGHT (Move items LEFT)
                    if (distRight < edgeThreshold && distRight > -50) {
                        targetOffset.current.x -= maxPanSpeed * getIntensity(distRight);
                    }
                    // Pan UP (Move items DOWN)
                    if (distTop < edgeThreshold && distTop > -50) {
                        targetOffset.current.y += maxPanSpeed * getIntensity(distTop);
                    }
                    // Pan DOWN (Move items UP)
                    if (distBottom < edgeThreshold && distBottom > -50) {
                        targetOffset.current.y -= maxPanSpeed * getIntensity(distBottom);
                    }
                }
            } else if (isLockedRef.current || isSynergyModeRef.current || isParallaxDisabled.current) {
                // Keep parallax zeroed while locked, in synergy mode, or when parallax is disabled
                targetParallax.current = { x: 0, y: 0 };
                parallaxOffset.current = { x: 0, y: 0 }; // Also zero actual offset immediately
            }

            // Smooth parallax transition
            // NOTE: Removed auto-lerp to desiredTilt (0, 0) to preserve manual middle-click rotation
            // targetTilt is now only modified by user input (middle-click drag) or reset view

            // 2. Handle Travel Transitions
            if (transitionRef.current?.active) {
                const { startTime, duration, start, target } = transitionRef.current;

                // SAFETY: Validate transition data to prevent NaN camera position
                const isValidTransition = (
                    typeof startTime === 'number' && !isNaN(startTime) &&
                    typeof duration === 'number' && !isNaN(duration) && duration > 0 &&
                    start && typeof start.x === 'number' && !isNaN(start.x) &&
                    target && typeof target.x === 'number' && !isNaN(target.x)
                );

                if (!isValidTransition) {
                    // Invalid transition state - abort and reset
                    warnLog('SynergyGalaxy', '⚠️ Invalid transition state, resetting:', transitionRef.current);
                    transitionRef.current.active = false;
                    // Keep current offset as-is (don't corrupt with NaN)
                } else {
                    const elapsed = now - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const ease = 1 - Math.pow(1 - progress, 3); // Ease out cubic

                    offset.current = {
                        x: start.x + (target.x - start.x) * ease,
                        y: start.y + (target.y - start.y) * ease,
                        z: start.z + (target.z - start.z) * ease
                    };

                    if (progress >= 1) {
                        // SNAP to final position for immediate camera control
                        offset.current = { ...target };
                        targetOffset.current = { ...target };
                        transitionRef.current.active = false;
                    }
                }
            } else {
                // 3. Handle Regular Smooth Movement (Zoom + Pan) - ALWAYS RUN
                // This ensures that if targetOffset changes programmatically (e.g., Reset View)
                // the camera follows, even if isLocked is technically true for a frame.
                // Input locking is handled upstream by preventing targetOffset updates.

                // Increase lerp factor slightly for more responsive edge panning
                const lerpFactor = 0.12;

                // SAFETY: Check for NaN before LERP to prevent camera corruption
                const newX = offset.current.x + (targetOffset.current.x - offset.current.x) * lerpFactor;
                const newY = offset.current.y + (targetOffset.current.y - offset.current.y) * lerpFactor;
                const newZ = offset.current.z + (targetOffset.current.z - offset.current.z) * lerpFactor;

                if (!isNaN(newX) && !isNaN(newY) && !isNaN(newZ)) {
                    offset.current.x = newX;
                    offset.current.y = newY;
                    offset.current.z = newZ;
                } else {
                    // NaN detected - reset to default orbit position
                    warnLog('SynergyGalaxy', '⚠️ NaN in camera position, resetting:', {
                        offset: offset.current,
                        targetOffset: targetOffset.current
                    });
                    offset.current = { x: 0, y: 0, z: -200 };
                    targetOffset.current = { x: 0, y: 0, z: -200 };
                }

                // VELOCITY CHECK: Detect if camera is moving
                const dx = Math.abs(offset.current.x - targetOffset.current.x);
                const dy = Math.abs(offset.current.y - targetOffset.current.y);
                const dz = Math.abs(offset.current.z - targetOffset.current.z);
                const velocity = dx + dy + dz;

                // Threshold determining if "moving" (0.5 pixel combined delta)
                // If moving, we hide tooltips to prevent flutter
                const isMoving = velocity > 0.5;

                if (isMoving !== isMovingRef.current) {
                    isMovingRef.current = isMoving;
                    if (isMoving) {
                        // Immediately hide tooltips when movement starts
                        hideTooltip();
                        activeTooltipNodeId.current = null;
                    }
                }

                // 3.5 Handle Parallax Smoothing
                parallaxOffset.current.x += (targetParallax.current.x - parallaxOffset.current.x) * 0.1;
                parallaxOffset.current.y += (targetParallax.current.y - parallaxOffset.current.y) * 0.1;
            }

            // 4. Update the Stage
            updateTransform(targetTilt.current.x, targetTilt.current.y, now);

            // 5. Global UI Visibility Tracking (Hide when leaving orbit)
            const dx = offset.current.x;
            const dy = offset.current.y;
            // dz removed as it was unused (originally for spherical distance check)

            // "Safe Zone": If mouse is in the notification/header area (top 150px), NEVER hide the UI
            // This allows interaction with nav/settings even if camera is far away
            let isMouseInHeader = false;
            if (containerRect.current && lastMousePos.current.y >= 0) {
                // Check if mouse Y is within top 150px (approx header height + buffer)
                // Relative to container top
                const mouseY = lastMousePos.current.y - containerRect.current.top;
                if (mouseY < 150 && mouseY > -50) {
                    isMouseInHeader = true;
                }
            }

            // Metric: Hide UI if significantly zoomed in (Z > -50) or panned very far away (> 500)
            // Relaxed from previous strict "50 unit sphere" to generic depth/pan checks
            const isZoomedIn = offset.current.z > -50; // Orbit is -200, so -50 is 75% zoomed in
            const isFarPan = Math.abs(dx) > 500 || Math.abs(dy) > 500;

            // Only hide if NOT in header AND (zoomed in OR panned far)
            const shouldHide = !isMouseInHeader && (isZoomedIn || isFarPan);

            if (shouldHide !== hideGlobalUIRef.current) {
                setHideGlobalUI(shouldHide);
            }

            // 5. LOD & Viewport Culling + Search Filtering
            nodes.forEach(node => {
                const el = nodeRefs.current.get(node.id);
                if (!el) return;

                const isFocused = focusedNodeRef.current && (
                    focusedNodeRef.current.id === node.id ||
                    (focusedNodeRef.current.instanceId && node.instanceId && focusedNodeRef.current.instanceId === node.instanceId)
                );

                // DEPTH-AWARE CULLING: Use world-space Z for distance checks
                let effectiveZ = node.z + offset.current.z;
                const isEquipped = node.isEquipped || node.type === 'subclass';
                const isSync = isNodeSynchronized(node);

                // Check if node matches search and filters (USE PRE-CALCULATED SET)
                const matchesSearch = filteredNodeIdsRef.current.has(node.id);

                // Check if node matches view mode filter
                let matchesViewMode = true;
                if (viewModeRef.current === 'subclass-only') {
                    matchesViewMode = node.type === 'subclass';
                } else if (viewModeRef.current === 'inventory-only') {
                    // Show only weapons and armor (hide subclasses)
                    matchesViewMode = node.type === 'weapon' || node.type === 'armor';
                }

                const shouldShow = (matchesSearch && matchesViewMode) || isSync || isFocused;

                // Distance Check: Hide inventory items if they are too far
                // Expanded range to allow scrolling deep into the vault (-50000)
                const farClip = performanceMode === 'low' ? -2500 : performanceMode === 'medium' ? -15000 : -40000;
                const isCloseEnough = isSync || isEquipped || (effectiveZ > farClip && effectiveZ < 1000);

                if (!isCloseEnough) {
                    el.style.display = 'none';
                    // CRITICAL: Hide tooltip only if THIS node is showing it
                    // When display:none is set, onMouseLeave never fires
                    if (activeTooltipNodeId.current === node.id) {
                        hideTooltip();
                        activeTooltipNodeId.current = null;
                    }
                    return;
                }

                // Apply filtering (search + view mode)
                if (!shouldShow) {
                    el.style.display = 'none';
                    el.style.opacity = '0';
                    el.style.pointerEvents = 'none';
                    // Remove masterwork class when hidden
                    el.classList.remove('galaxy-node--masterwork');
                    el.classList.add('galaxy-node--dimmed');
                    if (activeTooltipNodeId.current === node.id) {
                        hideTooltip();
                        activeTooltipNodeId.current = null;
                    }
                } else {
                    // Ensure visibility classes are correct when shown
                    el.classList.remove('galaxy-node--dimmed');
                    if (node.isMasterwork) el.classList.add('galaxy-node--masterwork');

                    if (isFocused) {
                        el.classList.add('galaxy-node--focused');
                        el.style.filter = 'none'; // Clear any CSS filters that might dim
                    }

                    // Frustum Check: Hide if significantly off-screen
                    const { stageX, stageY, scale, finalZ, isVisible: isNodeVisible } = projectToScreen(node.x, node.y, node.z);

                    // Relax near-plane culling for focused items so they don't "black out" when close
                    const isVisible = isNodeVisible || (isFocused && finalZ < 998);

                    // SYNERGY HUD: Only anchor the SOURCE subclass to screen center
                    // All other synergy items remain in 3D space for dynamic wire tracking
                    // Hide the source subclass HUD when a wire endpoint is locked OR hovered (Smart Focus)
                    if (isSync && isSynergyModeRef.current) {
                        const isSourceSubclass = node.id === synergySourceNodeIdRef.current;

                        if (isSourceSubclass) {
                            // SMART FOCUS: Push source subclass to background when locked or hovering
                            const isInteracting = isLockedRef.current || hoveredSynergyWireRef.current;

                            // Source subclass anchors to screen center as HUD element
                            el.style.transform = `translate3d(0px, 0px, 0px) scale(1.5)`;
                            el.style.display = 'block';

                            if (isInteracting) {
                                // Push behind everything and dim significantly
                                // USE EXTREMELY LOW Z-INDEX to ensure it's behind even far-away items (which have negative z-indices)
                                el.style.zIndex = '-99999';
                                el.style.opacity = '0.1';
                                el.style.pointerEvents = 'none'; // Click-through when in background
                            } else {
                                // Standard HUD mode
                                el.style.zIndex = '20000'; // Above everything (standard nodes are around 10000)
                                el.style.opacity = '1';
                                el.style.pointerEvents = 'auto';
                            }
                            return; // Bypass regular 3D update
                        }
                    }

                    // DEPTH FADING: Smoothly fade out as items get too close or too far
                    let opacity = 1;

                    // BYPASS FADING FOR FOCUSED ITEMS: Ensure they are always at full brightness
                    if (!isFocused) {
                        // Fade out as it approaches the perspective plane (1000)
                        if (finalZ > 850) {
                            opacity *= Math.max(0, 1 - (finalZ - 850) / 145);
                        }

                        // Fade out as it recedes into distance
                        if (finalZ < -5000) {
                            // Adjust fade start based on clip plane (Clip: L-2500, M-15000, H-40000)
                            const fadeStart = performanceMode === 'low' ? 1500 : performanceMode === 'medium' ? 10000 : 30000;
                            const fadeRange = performanceMode === 'low' ? 1000 : performanceMode === 'medium' ? 5000 : 10000;
                            opacity *= Math.max(0, 1 - (Math.abs(finalZ) - fadeStart) / fadeRange);
                        }
                    } else {
                        opacity = 1; // Force full opacity for focused items
                    }

                    // ISOLATION LOGIC: In Synergy Mode, dim/hide nodes based on active wire
                    const isIsolating = isIsolatingDebouncedRef.current;

                    if (isIsolating) {
                        const activeWire = hoveredSynergyWireRef.current;
                        const isPartOfActiveSynergy = activeWire && (node.instanceId === activeWire.armorInstanceId || node.instanceId === activeWire.weaponInstanceId);

                        if (isFocused || isPartOfActiveSynergy) {
                            opacity = 1;
                        } else {
                            // STRICT HIDE for ALL non-relevant nodes to prevent visual noise
                            // This replaces the previous "dimming" logic for generic nodes
                            opacity = 0;
                            el.style.display = 'none';
                            return;
                        }
                    }

                    // Show the element 
                    el.style.display = 'block';
                    el.style.opacity = opacity.toString();
                    el.style.pointerEvents = opacity > 0.05 ? 'auto' : 'none';

                    // UNIVERSAL MANIFOLD: Apply manual projection to DOM nodes
                    // Use scale for depth and 2D translate for stage position
                    // We use stageX/stageY because .synergy-galaxy-stage is centered at 50%/50%
                    el.style.transform = `translate3d(${stageX}px, ${stageY}px, 0px) scale(${scale})`;

                    // Z-INDEX: Focused items must be above EVERYTHING (vignette, stars, other nodes)
                    // Standard nodes are ~10000. HUD is 20000. We match HUD level for focused items.
                    el.style.zIndex = isFocused ? '20000' : Math.round(finalZ + 10000).toString();

                    if (opacity < 0.05) {
                        el.style.display = 'none';
                        if (activeTooltipNodeId.current === node.id) {
                            hideTooltip();
                            activeTooltipNodeId.current = null;
                        }
                        return;
                    }

                    if (containerRect.current) {
                        const margin = 300; // Increased margin for stability
                        const halfW = containerRect.current.width / 2 + margin;
                        const halfH = containerRect.current.height / 2 + margin;

                        if (Math.abs(stageX) > halfW || Math.abs(stageY) > halfH || !isVisible) {
                            el.style.display = 'none';
                            // CRITICAL: Hide tooltip only if THIS node is showing it
                            if (activeTooltipNodeId.current === node.id) {
                                hideTooltip();
                                activeTooltipNodeId.current = null;
                            }
                        } else {
                            el.style.display = 'block';
                        }
                    }
                }
            });

            // 6. Real-time Tooltip Update (Responsive during camera move)
            // If locked, update every frame to "glue" the tooltip to the moving node
            // IMPORTANT: Use updateTooltipDetectionRef to bypass stale state closure in tickRef
            if (isLockedRef.current && focusedNodeRef.current) {
                updateTooltipDetectionRef.current(-1, -1);
            } else if (!isDragging.current && isMouseInBounds.current && lastMousePos.current.x !== -1) {
                // FIXED: Only update detection if mouse is actually INSIDE the bounds
                updateTooltipDetectionRef.current(lastMousePos.current.x, lastMousePos.current.y);
            } else if (!isLockedRef.current && !isMouseInBounds.current && activeTooltipNodeId.current) {
                // FIXED: If mouse left bounds and not locked, ensure tooltip is hidden
                hideTooltip();
                activeTooltipNodeId.current = null;
            }

            // 7. FPS Logic
            frameCount.current++;
            if (now - lastFpsUpdateTime.current > 1000) {
                setFps(Math.round((frameCount.current * 1000) / (now - lastFpsUpdateTime.current)));
                lastFpsUpdateTime.current = now;
                frameCount.current = 0;
            }


        };
    }, [nodes, updateTransform, updateRect, synchronizedNodeIds, hideTooltip, projectToScreen, setHideGlobalUI]);
    // Event Listener Refs (Ref Proxy Pattern to avoid stale closures)
    const handleKeyDownRef = useRef(handleKeyDown);
    const handleKeyUpRef = useRef(handleKeyUp);
    const handleClickRef = useRef(handleClick);
    const handleDownRef = useRef(handleDown);
    const handleUpRef = useRef(handleUp);
    const handleMoveRef = useRef(handleMove);

    // Sync refs with latest handlers
    useEffect(() => {
        handleKeyDownRef.current = handleKeyDown;
        handleKeyUpRef.current = handleKeyUp;
        handleClickRef.current = handleClick;
        handleDownRef.current = handleDown;
        handleUpRef.current = handleUp;
        handleMoveRef.current = handleMove;

        // Also sync updateTooltipDetection here to be safe
        updateTooltipDetectionRef.current = updateTooltipDetection;
    }, [handleKeyDown, handleKeyUp, handleClick, handleDown, handleUp, handleMove, updateTooltipDetection]);

    useEffect(() => {
        const renderLoop = (now: number) => {
            tickRef.current?.(now);
            rafId.current = requestAnimationFrame(renderLoop);
        };

        updateRect();
        rafId.current = requestAnimationFrame(renderLoop);

        // Proxied Event Handlers
        const onDown = (e: MouseEvent) => handleDownRef.current(e);
        const onUp = (e: MouseEvent) => handleUpRef.current(e); // Pass event for middle-click detection
        const onMove = (e: MouseEvent) => handleMoveRef.current(e);
        const onClick = (e: MouseEvent) => handleClickRef.current(e);
        const onKeyDown = (e: KeyboardEvent) => handleKeyDownRef.current(e);
        const onKeyUp = (e: KeyboardEvent) => handleKeyUpRef.current(e);
        const onResize = () => updateRect(); // updateRect is stable via useCallback with minimal deps

        window.addEventListener('mousedown', onDown);
        window.addEventListener('mouseup', onUp);
        window.addEventListener('mousemove', onMove, { passive: true });
        window.addEventListener('click', onClick);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('resize', onResize);

        return () => {
            if (rafId.current) cancelAnimationFrame(rafId.current);
            window.removeEventListener('mousedown', onDown);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('click', onClick);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('resize', onResize);
        };
    }, []); // Only on mount! Logic updates happen via refs.

    // Safety: Handle window blur to prevent stuck keys/mouse
    // Isolation State Debouncing & Global UI Dimming
    useEffect(() => {
        const active = hoveredSynergyWire || isLocked || focusedNode;
        let timer: any;

        if (active) {
            setIsIsolatingDebounced(true);
            document.documentElement.classList.add('global-ui-isolate');
        } else {
            // Short delay before removing isolation to prevent flicker during transitions
            timer = setTimeout(() => {
                setIsIsolatingDebounced(false);
                document.documentElement.classList.remove('global-ui-isolate');
            }, 150);
        }

        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [hoveredSynergyWire, isLocked, focusedNode]);

    const handleWindowBlur = useCallback(() => {
        // Clear all input states immediately
        keysPressed.current.clear();
        isDragging.current = false;
        dragStartPos.current = { x: -1, y: -1 };
        lastMousePos.current = { x: -1, y: -1 };

        // Hide tooltip if active
        if (activeTooltipNodeId.current && !isLockedRef.current) {
            hideTooltip();
            activeTooltipNodeId.current = null;
        }
    }, [hideTooltip]);

    // Register blur listener separate from the main mount effect to include the dependency
    useEffect(() => {
        const handleDocumentMouseLeave = () => {
            isMouseInBounds.current = false;
            // Also reset position to be safe
            lastMousePos.current = { x: -1, y: -1 };

            if (activeTooltipNodeId.current && !isLockedRef.current) {
                hideTooltip();
                activeTooltipNodeId.current = null;
            }
        };

        window.addEventListener('blur', handleWindowBlur);
        document.addEventListener('mouseleave', handleDocumentMouseLeave);

        return () => {
            window.removeEventListener('blur', handleWindowBlur);
            document.removeEventListener('mouseleave', handleDocumentMouseLeave);
        };
    }, [handleWindowBlur, hideTooltip]);

    // Ensure refs are always up to date
    handleDownRef.current = handleDown;
    handleUpRef.current = handleUp;
    handleMoveRef.current = handleMove;
    handleClickRef.current = handleClick;
    handleKeyDownRef.current = handleKeyDown;
    handleKeyUpRef.current = handleKeyUp;

    return (
        <div
            ref={containerRef}
            className={`synergy-galaxy-container ${isLocked ? 'synergy-galaxy--locked' : ''} ${isIsolatingDebounced ? 'is-isolating' : ''} ${isSynergyMenuOpen ? 'is-blackout-mode' : ''}`}
            onWheel={handleWheel}
            onMouseEnter={() => { isMouseInBounds.current = true; }}
            onMouseLeave={() => { isMouseInBounds.current = false; }}
        >

            {/* BLACKOUT OVERLAY: Strictly hides everything behind the menu when open */}
            <div className={`synergy-blackout ${isSynergyMenuOpen ? 'synergy-blackout--active' : ''}`} />

            <div className="synergy-galaxy-vignette" />
            <div className="synergy-galaxy-stars" />

            <canvas
                ref={canvasRef}
                className="synergy-galaxy-canvas"
            />

            <div
                ref={galaxyRef}
                className="synergy-galaxy-stage"
            >
                {/* 
                DOM Phase: Standard 3D Nodes
                Only render nodes that are NOT synchronized here.
            */}
                {nodes.filter(n => n.lodLevel < 2 && !isNodeSynchronized(n)).map(node => {
                    const tierClass = node.tierClass;
                    const isMasterwork = node.isMasterwork;
                    const isEquipped = node.isEquipped;

                    const isFocused = focusedNode?.id === node.id || (focusedNode?.instanceId && node.instanceId && focusedNode.instanceId === node.instanceId);

                    // Check if node matches search query and filters
                    const matchesSearch = itemMatchesFilters(node, searchQueryRef.current, elementFilterRef.current, classFilterRef.current, getElement);

                    // Check if node matches view mode filter
                    let matchesViewMode = true;
                    if (viewMode === 'subclass-only') {
                        matchesViewMode = node.type === 'subclass';
                    } else if (viewMode === 'inventory-only') {
                        // Show only weapons and armor (hide subclasses)
                        matchesViewMode = node.type === 'weapon' || node.type === 'armor';
                    }

                    const isSync = isNodeSynchronized(node);
                    const shouldShow = (matchesSearch && matchesViewMode) || isSync || isFocused;

                    const isTransferring = node.instanceId ? useProfileStore.getState().activeTransfers.has(node.instanceId) : false;

                    // REDUCE NOISE: Only show success state for a single item if multiple are in the success set
                    // We only show it for the HIGH PRIORITY item (Exotic Weapon > Armor > Rest)
                    let isSuccess = false;
                    const { successfulTransfers } = useProfileStore.getState();
                    if (node.instanceId && successfulTransfers.has(node.instanceId) && !node.id.startsWith('vault-')) {
                        // Check if there's a "better" item also in success that should take the spotlight
                        const hasHigherPrioritySuccess = Array.from(successfulTransfers).some(id => {
                            if (id === node.instanceId) return false;
                            const otherNode = nodes.find(n => n.instanceId === id);
                            if (!otherNode) return false;

                            // Priority logic: Weapons > Armor > Subclass
                            if (node.type === 'weapon') return false; // Weapons are top priority
                            if (node.type === 'armor' && otherNode.type === 'weapon') return true;
                            if (node.type === 'subclass' && (otherNode.type === 'weapon' || otherNode.type === 'armor')) return true;
                            return false;
                        });

                        isSuccess = !hasHigherPrioritySuccess;
                    }


                    // Visual Logic: Color by View Mode
                    let colorClass = `element--${node.element}`;
                    // "Vault Mode" generally implies standard view (viewMode='all' or 'inventory-only')
                    // "Galaxy" implies 3D cloud which is this view, but user distinction implies 
                    // "Vault Mode" = Rarity Colors, "Galaxy/Random" = Element Colors.
                    // We assume default 'all' view is "Vault Mode".
                    // EXCEPTION: Subclasses always use element colors (they don't have tierClass)
                    if (node.type === 'subclass') {
                        // Subclasses always use element colors for their auras
                        colorClass = `element--${node.element}`;
                    } else if (viewMode === 'all' || viewMode === 'inventory-only' || !viewMode) {
                        // Vault Mode: Rarity Colors (CSS: node-tier--)
                        colorClass = `node-tier--${tierClass}`;
                    } else {
                        // Galaxy/Random Mode (subclass-only or synergy mode): Element Colors
                        colorClass = `element--${node.element}`;
                    }

                    return (
                        <div
                            key={node.id}
                            ref={(el) => {
                                if (el) {
                                    (el as any).__item = node.originalItem;
                                    (el as any).__instanceId = node.instanceId;
                                    nodeRefs.current.set(node.id, el);
                                } else {
                                    nodeRefs.current.delete(node.id);
                                }
                            }}
                            className={`galaxy-node galaxy-node--${node.type} ${colorClass} node-lod--${node.lodLevel} ${isEquipped ? 'galaxy-node--equipped' : ''} ${isMasterwork && shouldShow ? 'galaxy-node--masterwork' : ''} ${!shouldShow ? 'galaxy-node--dimmed' : ''} ${isTransferring ? 'transfer-active' : ''} ${isSuccess ? 'transfer-success' : ''} ${node.instanceId && equippingItemIds.has(node.instanceId) ? 'transmat-equip' : ''} ${isFocused ? 'galaxy-node--focused galaxy-focused-display' : ''}`}
                            style={{
                                // Let the renderLoop handle its position and visibility.
                                display: shouldShow ? 'block' : 'none',
                                opacity: isFocused ? 1 : 0, // Force 1 if focused to prevent initial dim flash
                                visibility: 'visible',
                                pointerEvents: 'none' // CRITICAL: Always none for container, letting children handle events
                            }}
                            onMouseEnter={() => {
                                // Only show tooltip if NOT in synergy mode and NOT locked
                                if (!isSynergyMode && !isLocked && node.originalItem && (!focusedNode || focusedNode.instanceId === node.instanceId)) {
                                    // Calculate proximal position
                                    let fixedPosition;
                                    if (isLocked) {
                                        const { screenX, screenY } = projectToScreen(node.x, node.y, node.z);
                                        fixedPosition = {
                                            x: screenX,
                                            y: screenY
                                        };
                                    }
                                    showTooltip(node.originalItem, node.instanceId ? itemInstances[node.instanceId] : undefined, undefined, isLocked, handleTransferItem, handleEquipItem, isLocked, fixedPosition, node.type === 'subclass', () => { }, false);
                                    activeTooltipNodeId.current = node.id;
                                }
                            }}
                            onMouseLeave={() => {
                                // Only hide if NOT locked
                                if (!isLocked) {
                                    hideTooltip();
                                    activeTooltipNodeId.current = null;
                                }
                            }}
                            onClick={() => handleNodeClick(node)}
                            onContextMenu={(e) => handleTriggerSynergy(node, e)}
                        >
                            <div className="galaxy-node__icon-wrap" style={{ pointerEvents: 'auto' }}>
                                {manifestLoaded && node.hash && (
                                    <>
                                        <img
                                            src={node.iconUrl || getBungieUrl(manifestService.getItem(node.hash)?.displayProperties?.icon || '')}
                                            alt={node.id}
                                            className="galaxy-node__icon"
                                            loading="lazy"
                                            draggable={false}
                                        />
                                        {node.watermarkUrl && (
                                            <img
                                                src={node.watermarkUrl}
                                                className={`galaxy-node__watermark ${node.isLegacyWatermark ? 'galaxy-node__watermark--legacy' : 'galaxy-node__watermark--featured'}`}
                                                alt=""
                                                draggable={false}
                                            />
                                        )}
                                        {node.type !== 'subclass' && node.tierClass !== 'exotic' && node.tier != null && node.tier > 0 && (
                                            <div className="galaxy-node__tier-stars">
                                                <TierBadge tier={node.tier} />
                                            </div>
                                        )}
                                        {node.power != null && node.power > 0 && (
                                            <div className="galaxy-node__power">
                                                {node.damageIconUrl && (
                                                    <img src={node.damageIconUrl} className="galaxy-node__damage-icon" alt="" draggable={false} />
                                                )}
                                                <span className="galaxy-node__power-value">{node.power}</span>
                                            </div>
                                        )}
                                        {node.type === 'weapon' && (node.isCrafted || node.isEnhanced) && (
                                            <div className="galaxy-node__craft-status">
                                                {node.isEnhanced ? (
                                                    <img
                                                        src={getBungieUrl('/img/destiny_content/items/enhanced-item-overlay.png')}
                                                        className="galaxy-node__enhanced-icon"
                                                        alt="Enhanced"
                                                        draggable={false}
                                                    />
                                                ) : node.isCrafted ? (
                                                    <img
                                                        src={getBungieUrl('/img/destiny_content/items/crafted-icon-overlay.png')}
                                                        className="galaxy-node__crafted-icon"
                                                        alt="Crafted"
                                                        draggable={false}
                                                    />
                                                ) : null}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            <div className="transmat-overlay" />
                            <div className="galaxy-node__glow" />
                        </div>
                    );
                })}

                {/* 
                    Focused Vault Item (Manifested in DOM only when focused AND NOT in standard nodes) 
                    This handles items that are in the vault (stars) but not in the character nodes list.
                */}
                {focusedNode && !nodes.some(n => n.id === focusedNode.id || (n.instanceId && focusedNode.instanceId && n.instanceId === focusedNode.instanceId)) && !isNodeSynchronized(focusedNode) && (() => {
                    const { stageX, stageY, scale, isVisible } = projectToScreen(focusedNode.x, focusedNode.y, focusedNode.z);

                    if (!isVisible) return null;

                    return (
                        <div
                            className={`galaxy-node galaxy-node--focused galaxy-focused-display galaxy-node--${focusedNode.type} element--${focusedNode.element} node-tier--${focusedNode.tierClass} node-lod--0 ${focusedNode.isMasterwork ? 'galaxy-node--masterwork' : ''}`}
                            ref={(el) => {
                                if (el) {
                                    (el as any).__item = focusedNode.originalItem;
                                    (el as any).__instanceId = focusedNode.instanceId;
                                }
                            }}
                            style={{
                                transform: `translate3d(${stageX}px, ${stageY}px, 0px) scale(${scale})`,
                                zIndex: 20000,
                                display: 'block',
                                opacity: 1,
                                pointerEvents: 'none' // Events handled by container click/hover logic
                            }}
                            onMouseEnter={() => {
                                if (!isSynergyMode && !isLocked && focusedNode.originalItem) {
                                    const { screenX, screenY, scale } = projectToScreen(focusedNode.x, focusedNode.y, focusedNode.z);
                                    const fixedPosition = {
                                        x: screenX + (42 * scale) + 12,
                                        y: screenY
                                    };
                                    showTooltip(focusedNode.originalItem, focusedNode.instanceId ? itemInstances[focusedNode.instanceId] : undefined, undefined, true, handleTransferItem, handleEquipItem, true, fixedPosition, focusedNode.type === 'subclass', () => { }, false);
                                    activeTooltipNodeId.current = focusedNode.id;
                                }
                            }}
                            onMouseLeave={() => {
                                hideTooltip();
                                activeTooltipNodeId.current = null;
                            }}
                        >
                            <div className="galaxy-node__icon-wrap">
                                <img
                                    src={focusedNode.iconUrl || getBungieUrl(manifestService.getItem(focusedNode.hash)?.displayProperties?.icon || '')}
                                    alt="focused"
                                    className="galaxy-node__icon"
                                    draggable={false}
                                />
                                {focusedNode.watermarkUrl && (
                                    <img
                                        src={focusedNode.watermarkUrl}
                                        className={`galaxy-node__watermark ${focusedNode.isLegacyWatermark ? 'galaxy-node__watermark--legacy' : 'galaxy-node__watermark--featured'}`}
                                        alt=""
                                        draggable={false}
                                    />
                                )}
                                {focusedNode.type !== 'subclass' && focusedNode.tierClass !== 'exotic' && focusedNode.tier != null && focusedNode.tier > 0 && (
                                    <div className="galaxy-node__tier-stars">
                                        <TierBadge tier={focusedNode.tier} />
                                    </div>
                                )}
                                {focusedNode.power != null && focusedNode.power > 0 && (
                                    <div className="galaxy-node__power">
                                        {focusedNode.damageIconUrl && (
                                            <img src={focusedNode.damageIconUrl} className="galaxy-node__damage-icon" alt="" draggable={false} />
                                        )}
                                        <span className="galaxy-node__power-value">{focusedNode.power}</span>
                                    </div>
                                )}
                                {focusedNode.type === 'weapon' && (focusedNode.isCrafted || focusedNode.isEnhanced) && (
                                    <div className="galaxy-node__craft-status">
                                        {focusedNode.isEnhanced ? (
                                            <img
                                                src={getBungieUrl('/img/destiny_content/items/enhanced-item-overlay.png')}
                                                className="galaxy-node__enhanced-icon"
                                                alt="Enhanced"
                                                draggable={false}
                                            />
                                        ) : focusedNode.isCrafted ? (
                                            <img
                                                src={getBungieUrl('/img/destiny_content/items/crafted-icon-overlay.png')}
                                                className="galaxy-node__crafted-icon"
                                                alt="Crafted"
                                                draggable={false}
                                            />
                                        ) : null}
                                    </div>
                                )}
                            </div>
                            <div className="transmat-overlay" />
                            <div className="galaxy-node__glow" />
                        </div>
                    );
                })()}
            </div>

            {/* 
            HUD Phase: Synchronized Nodes & Focused Synchronized Node
            These are outside the 3D stage to avoid rotation/tilt jitter.
        */}
            {isSynergyMode && (
                <div className="synergy-galaxy-hud-layer">
                    {nodes.filter(n => isNodeSynchronized(n)).map(node => {
                        const tierClass = node.tierClass;
                        const isMasterwork = node.isMasterwork;
                        const isEquipped = node.isEquipped;

                        const { activeTransfers, successfulTransfers } = useProfileStore.getState();
                        const isTransferring = node.instanceId ? activeTransfers.has(node.instanceId) : false;
                        const isSuccess = node.instanceId ? successfulTransfers.has(node.instanceId) : false;

                        // Calculate opacity and visibility based on isolation
                        let nodeOpacity = 1;
                        let nodeDisplay = 'block';
                        const isIsolating = isIsolatingDebounced;
                        const isFocused = focusedNode && (focusedNode.instanceId === node.instanceId || focusedNode.id === node.id);

                        if (isFocused) {
                            nodeOpacity = 1;
                        } else if (hoveredSynergyWire) {
                            const isHoveredArmor = node.instanceId === hoveredSynergyWire.armorInstanceId;
                            const isHoveredWeapon = node.instanceId === hoveredSynergyWire.weaponInstanceId;

                            if (isHoveredArmor || isHoveredWeapon) {
                                nodeOpacity = 1;
                            } else {
                                // STRICT HIDE: Don't just dim, completely remove from layout during isolation
                                // to prevent clumping of non-active icons in the HUD layer
                                nodeDisplay = 'none';
                                nodeOpacity = 0;
                            }
                        } else if (isIsolating) {
                            // If isolating for other reasons (focusedNode but no hoveredWire), dim or hide others
                            nodeOpacity = 0.05;
                            if (node.type === 'subclass') nodeDisplay = 'none'; // Hide subclass when focusing items
                        }

                        return (
                            <div
                                key={`hud-${node.id}`}
                                ref={(el) => {
                                    if (el) {
                                        (el as any).__item = node.originalItem;
                                        (el as any).__instanceId = node.instanceId;
                                        nodeRefs.current.set(node.id, el);
                                    } else {
                                        nodeRefs.current.delete(node.id);
                                    }
                                }}
                                className={`galaxy-node is-synced galaxy-node--${node.type} element--${node.element} node-tier--${tierClass} node-lod--0 ${isEquipped ? 'galaxy-node--equipped' : ''} ${isMasterwork ? 'galaxy-node--masterwork' : ''} ${isTransferring ? 'transfer-active' : ''} ${isSuccess ? 'transfer-success' : ''} ${node.instanceId && equippingItemIds.has(node.instanceId) ? 'transmat-equip' : ''} ${isFocused ? 'galaxy-node--focused galaxy-focused-display' : ''}`}
                                style={{
                                    display: nodeDisplay,
                                    opacity: nodeOpacity,
                                    pointerEvents: 'auto',
                                    zIndex: (isTransferring || isSuccess || (node.instanceId && equippingItemIds.has(node.instanceId))) ? 1000000 : undefined
                                }}
                                onClick={() => handleNodeClick(node)}
                                onMouseEnter={() => {
                                    setHoveredSynergyNodeId(node.instanceId || node.id);
                                }}
                                onMouseLeave={() => {
                                    setHoveredSynergyNodeId(null);
                                }}
                                onContextMenu={(e) => handleTriggerSynergy(node, e)}
                            >
                                <div className="galaxy-node__icon-wrap">
                                    {manifestLoaded && node.hash && (
                                        <>
                                            <img
                                                src={node.iconUrl || getBungieUrl(manifestService.getItem(node.hash)?.displayProperties?.icon || '')}
                                                alt={node.id}
                                                className="galaxy-node__icon"
                                            />
                                            {node.watermarkUrl && (
                                                <img
                                                    src={node.watermarkUrl}
                                                    className={`galaxy-node__watermark ${node.isLegacyWatermark ? 'galaxy-node__watermark--legacy' : 'galaxy-node__watermark--featured'}`}
                                                    alt=""
                                                />
                                            )}
                                        </>
                                    )}
                                </div>
                                <div className="transmat-overlay" />
                                <div className="galaxy-node__glow" />
                            </div>
                        );
                    })}

                </div>
            )}

            {/* Synergy Web Overlay - Outside 3D stage to align with screen positions */}
            {isSynergyMode && synergyConnections.length > 0 && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2000000005, pointerEvents: 'none' }}>
                    <SynergyWeb
                        connections={synergyConnections}
                        sourcePosition={synergySourcePos}
                        sourceNodeId={synergySourceNodeId}
                        getItemPosition={getItemPosition}
                        itemInstances={itemInstances}
                        onWireHoverChange={handleWireHoverChange}
                        onWireHover={handleWireHover}
                        onWireLock={handleSynergyWireLock}
                        onClose={handleCloseSynergyWeb}
                        isExiting={isSynergyExiting}
                        hoveredNodeId={hoveredSynergyNodeId}
                        onSynergyOverlayChange={(isOpen, synergy) => {
                            setIsSynergyMenuOpen(isOpen);
                            onSynergyOverlayChange?.(isOpen, synergy);
                        }}
                        onEquipSynergy={handleEquipSynergy}
                        forceCloseTrigger={forceCloseTrigger}
                    />
                </div>
            )}

            <div
                className="synergy-galaxy-ui"
                style={{
                    opacity: hideGlobalUI ? 0 : 1,
                    pointerEvents: hideGlobalUI ? 'none' : 'auto',
                    transition: 'opacity 0.3s ease-out'
                }}
            >
                <div className="synergy-galaxy-header">
                    {showFps && (
                        <div className="synergy-galaxy-debug">
                            <span className="debug-fps">{fps} FPS</span>
                        </div>
                    )}
                    <div className="synergy-galaxy-title-container">
                        <h1 className="synergy-galaxy-title">Synergy Galaxy</h1>
                        <button
                            className={`synergy-galaxy-reload-btn ${isLoading ? 'is-loading' : ''} ${isStale ? 'is-stale' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                profileLoader.loadProfile(true);
                            }}
                            title={isStale ? "Data is stale. Click to refresh from Bungie." : "Reload Destiny Data"}
                            aria-label="Reload"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
                            </svg>
                            {isStale && (
                                <div className="synergy-galaxy-stale-warning">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="#ff4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                        <line x1="12" y1="9" x2="12" y2="13" />
                                        <line x1="12" y1="17" x2="12.01" y2="17" />
                                    </svg>
                                </div>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}