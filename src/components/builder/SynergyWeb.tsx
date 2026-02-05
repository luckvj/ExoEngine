/**
 * SynergyWeb Component
 * 
 * Renders animated SVG wires connecting synergistic items in the Synergy Galaxy.
 * Wires are color-coded by element and have hover tooltips.
 */
import { debugLog } from '../../utils/logger';
import { useState, useCallback, useEffect, useRef } from 'react';
import type { SynergyConnection, DashboardSynergy } from '../../services/synergy-matcher.service';
import type { ItemInstance } from '../../types';
import { RichTooltip } from './RichTooltip';
import { SynergyBuildOverlay } from '../synergy/SynergyBuildOverlay';
import './SynergyWeb.css';

// Element color definitions
const ELEMENT_COLORS: Record<string, string> = {
    solar: '#f97316',      // Orange
    arc: '#7df9ff',        // Electric cyan/light blue - matches Arc subclass
    void: '#a855f7',       // Purple
    stasis: '#4d88ff',     // Deep ice blue - matches Stasis subclass
    strand: '#10b981',     // Green
    prismatic: '#ff6be8',  // Pink with rainbow hints
    kinetic: '#ffffff'     // White
};

export interface WirePosition {
    sourceX: number;
    sourceY: number;
    sourceScale: number;
    hubX?: number;
    hubY?: number;
    hubScale?: number;
    hubOpacity?: number;
    targetX: number;
    targetY: number;
    targetScale: number;
    targetOpacity: number;
    targetRadius: number; // For pixel-perfect tooltip offset
    targetOpacityActual: number; // For overall visibility
    element: string;
    synergy: DashboardSynergy;
    armorResult: SynergyConnection['armorResult'] | null;
    weaponResult: SynergyConnection['weaponResult'] | null;
    abilityName?: string;
    targetType: 'armor' | 'weapon' | 'ability';
}

interface SynergyWebProps {
    connections: SynergyConnection[];
    sourcePosition: { x: number; y: number; scale?: number } | null;
    sourceNodeId: string | null;
    getItemPosition: (itemName: string, location: 'equipped' | 'inventory' | 'vault', characterId?: string, nodeId?: string) => { x: number; y: number; scale: number; opacity: number; nodeId?: string } | null;
    onEquipSynergy?: (synergy: DashboardSynergy) => void;
    onSynergyOverlayChange?: (isOpen: boolean, synergy: any) => void;
    itemInstances: Record<string, ItemInstance | undefined>;
    onWireClick?: (synergy: DashboardSynergy) => void;
    onWireHoverChange?: (hovered: boolean) => void;
    onWireHover?: (wire: { armorInstanceId: string | null; weaponInstanceId: string | null } | null) => void; // Called with wire target IDs when hovering
    onWireLock?: (itemInstanceId: string | null) => void; // Called when a wire endpoint is clicked to lock/unlock
    onClose?: () => void;
    isExiting?: boolean;
    // Wire positions computed by parent RAF loop for perfect synchronization
    syncedWirePositions?: Array<{ targetX: number; targetY: number; targetScale: number; targetOpacity: number; targetRadius: number }>;
    hoveredNodeId?: string | null;
    forceCloseTrigger?: number;
}

export function SynergyWeb({
    connections,
    sourcePosition,
    sourceNodeId,
    getItemPosition,
    onEquipSynergy,
    onSynergyOverlayChange,
    itemInstances,
    onWireClick,
    onWireHoverChange,
    onWireHover,
    onWireLock,
    onClose,
    isExiting = false,
    syncedWirePositions,
    hoveredNodeId,
    forceCloseTrigger
}: SynergyWebProps) {
    const [hoveredWireId, setHoveredWireId] = useState<{ buildName: string; targetType: 'armor' | 'weapon' | 'ability'; abilityName?: string } | null>(null);
    // Store locked wire identifier instead of full object so we can get live positions
    const [lockedWireId, setLockedWireId] = useState<{ buildName: string; targetType: 'armor' | 'weapon' | 'ability'; abilityName?: string } | null>(null);
    const [wires, setWires] = useState<WirePosition[]>([]);
    const [animationProgress, setAnimationProgress] = useState(0);
    const [exitProgress, setExitProgress] = useState(1); // 1 = visible, 0 = hidden
    const [confirmedSynergy, setConfirmedSynergy] = useState<DashboardSynergy | null>(null);

    // Force close effect when parent triggers it
    useEffect(() => {
        if (forceCloseTrigger && forceCloseTrigger > 0) {
            handleCloseOverlay();
        }
    }, [forceCloseTrigger]);
    const svgRef = useRef<SVGSVGElement>(null);

    const hoveredWireRef = useRef<WirePosition | null>(null);
    const lockedWireIdRef = useRef<{ buildName: string; targetType: 'armor' | 'weapon' | 'ability'; abilityName?: string } | null>(null);
    const syncedWirePositionsRef = useRef(syncedWirePositions);
    const wireHoverTimerRef = useRef<NodeJS.Timeout | null>(null);
    const wireShowTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Get the live hovered wire from the wires array
    const hoveredWire = hoveredWireId
        ? wires.find(w => w.synergy.buildName === hoveredWireId.buildName && w.targetType === hoveredWireId.targetType) || null
        : null;

    // Get the live locked wire from the wires array
    const lockedWire = lockedWireId
        ? wires.find(w => w.synergy.buildName === lockedWireId.buildName && w.targetType === lockedWireId.targetType) || null
        : null;

    useEffect(() => {
        hoveredWireRef.current = hoveredWire;
    }, [hoveredWire]);

    useEffect(() => {
        lockedWireIdRef.current = lockedWireId;
    }, [lockedWireId]);

    // Clear timer on unmount
    useEffect(() => {
        return () => {
            if (wireHoverTimerRef.current) {
                clearTimeout(wireHoverTimerRef.current);
            }
            if (wireShowTimerRef.current) {
                clearTimeout(wireShowTimerRef.current);
            }
        };
    }, []);

    // Keep ref in sync with prop (no re-render trigger)
    useEffect(() => {
        syncedWirePositionsRef.current = syncedWirePositions;
    }, [syncedWirePositions]);

    // Sync hovered wire with external hoveredNodeId from SynergyGalaxy HUD
    const lastHoveredRef = useRef<boolean>(false);

    useEffect(() => {
        if (hoveredNodeId) {
            // Find the wire connected to this node
            const wire = wires.find(w =>
                (w.armorResult?.item.itemInstanceId === hoveredNodeId) ||
                (w.weaponResult?.item.itemInstanceId === hoveredNodeId)
            );

            if (wire) {
                // External input: clear any local hide timer immediately
                if (wireHoverTimerRef.current) {
                    clearTimeout(wireHoverTimerRef.current);
                    wireHoverTimerRef.current = null;
                }

                const wireId = { buildName: wire.synergy.buildName, targetType: wire.targetType, abilityName: wire.abilityName };
                // Only update if ID actually changed
                if (hoveredWireId?.buildName !== wireId.buildName || hoveredWireId?.targetType !== wireId.targetType || hoveredWireId?.abilityName !== wireId.abilityName) {
                    setHoveredWireId(wireId);
                }
                if (!lastHoveredRef.current) {
                    lastHoveredRef.current = true;
                    onWireHoverChange?.(true);
                    // Notify parent of which wire targets are being hovered (external hover from galaxy node)
                    onWireHover?.({
                        armorInstanceId: wire.armorResult?.item.itemInstanceId || null,
                        weaponInstanceId: wire.weaponResult?.item.itemInstanceId || null
                    });
                }
            }
        } else {
            // External clear - only if we don't have a local hover active
            // NOTE: We trust internal hover over external clear to prevent flicker
        }
    }, [hoveredNodeId, wires, hoveredWireId, onWireHoverChange, onWireHover]);

    // Exit animation - wires retract toward center
    useEffect(() => {
        if (!isExiting) {
            setExitProgress(1);
            return;
        }

        const startTime = performance.now();
        const duration = 400;

        const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = 1 - Math.min(elapsed / duration, 1);
            // Ease in for accelerating retraction
            setExitProgress(progress * progress);
            if (progress > 0) requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    }, [isExiting]);

    // Frame-Synced Wire Recalculation
    // Uses RAF loop that reads from syncedWirePositionsRef to avoid dependency on array reference
    useEffect(() => {
        if (!sourcePosition || !connections.length || isExiting) {
            setWires([]);
            return;
        }

        let raf: number;
        const lastPositionsJsonRef = { current: '' };

        const updateWires = () => {
            const syncedPositions = syncedWirePositionsRef.current;
            const newWires: WirePosition[] = [];

            // Fetch source position
            let currentSourceX = sourcePosition.x;
            let currentSourceY = sourcePosition.y;
            let currentSourceScale = sourcePosition.scale ?? 1;

            if (sourceNodeId) {
                const liveSource = getItemPosition('', 'equipped', undefined, sourceNodeId);
                if (liveSource) {
                    currentSourceX = liveSource.x;
                    currentSourceY = liveSource.y;
                    currentSourceScale = liveSource.scale;
                }
            }

            const hubCache: Record<string, { x: number; y: number; scale: number; opacity: number; nodeId?: string } | null> = {};
            const isSourceSubclass = sourceNodeId?.includes('subclass');

            // CRITICAL: Determine the source element for unified coloring
            // This ensures "1 color for 1 subclass" logic
            let sourceElement = '';
            if (sourceNodeId && isSourceSubclass) {
                const match = sourceNodeId.match(/subclass-(\d+)/);
                if (match) {
                    const hash = parseInt(match[1]);
                    // In SynergyGalaxy, the element is stored in the node, but we can re-derive it
                    // Or check the subclass node by hash
                    const subclassElements: Record<number, string> = {
                        // Warlock
                        2366883719: 'solar',
                        240538059: 'void',
                        139534062: 'arc',
                        1256795856: 'stasis',
                        1811800262: 'strand',
                        2732997195: 'prismatic',
                        // Hunter
                        2240825105: 'solar',
                        245081432: 'void',
                        3164832584: 'arc',
                        3291544903: 'stasis',
                        3828340157: 'strand',
                        2835214899: 'prismatic',
                        // Titan
                        2024474330: 'solar',
                        2007421831: 'void',
                        1215437841: 'arc',
                        1530663428: 'stasis',
                        531398864: 'strand',
                        2984351206: 'prismatic',
                        1262901524: 'prismatic',
                    };
                    sourceElement = subclassElements[hash] || '';
                }
            }
            if (!sourceElement && connections.length > 0) {
                // If not a subclass source, use the first connection's element as a baseline
                // This ensures weapon/armor webs are also monochromatic
                sourceElement = connections[0].element.toLowerCase();
            }

            // If parent provides synced positions, use those
            if (syncedPositions && syncedPositions.length > 0) {
                let posIdx = 0;

                for (const conn of connections) {
                    const element = conn.element.toLowerCase();
                    if (hubCache[element] === undefined) {
                        hubCache[element] = getItemPosition(`${element} subclass`, 'equipped');
                    }
                    const hub = hubCache[element];
                    const isSourceHub = hub?.nodeId === sourceNodeId;
                    const shouldUseHub = isSourceSubclass && !isSourceHub;
                    const finalHubX = shouldUseHub ? hub?.x : undefined;
                    const finalHubY = shouldUseHub ? hub?.y : undefined;

                    // Use synced positions for armor
                    if (conn.armorResult && posIdx < syncedPositions.length) {
                        const syncedPos = syncedPositions[posIdx++];
                        newWires.push({
                            sourceX: currentSourceX,
                            sourceY: currentSourceY,
                            sourceScale: currentSourceScale,
                            hubX: finalHubX,
                            hubY: finalHubY,
                            hubScale: hub?.scale,
                            hubOpacity: hub?.opacity,
                            targetX: syncedPos.targetX,
                            targetY: syncedPos.targetY,
                            targetScale: syncedPos.targetScale,
                            targetOpacity: syncedPos.targetOpacity,
                            targetOpacityActual: syncedPos.targetOpacity,
                            targetRadius: syncedPos.targetRadius,
                            element: sourceElement || conn.element,
                            synergy: conn.synergy,
                            armorResult: conn.armorResult,
                            weaponResult: conn.weaponResult,
                            targetType: 'armor'
                        });
                    }

                    // Use synced positions for weapon
                    if (conn.weaponResult && posIdx < syncedPositions.length) {
                        const syncedPos = syncedPositions[posIdx++];
                        newWires.push({
                            sourceX: currentSourceX,
                            sourceY: currentSourceY,
                            sourceScale: currentSourceScale,
                            hubX: finalHubX,
                            hubY: finalHubY,
                            hubScale: hub?.scale,
                            hubOpacity: hub?.opacity,
                            targetX: syncedPos.targetX,
                            targetY: syncedPos.targetY,
                            targetScale: syncedPos.targetScale,
                            targetOpacity: syncedPos.targetOpacity,
                            targetOpacityActual: syncedPos.targetOpacity,
                            targetRadius: syncedPos.targetRadius,
                            element: sourceElement || conn.element,
                            synergy: conn.synergy,
                            armorResult: conn.armorResult,
                            weaponResult: conn.weaponResult,
                            targetType: 'weapon'
                        });
                    }
                }
            } else {
                // Fallback: compute positions ourselves
                for (const conn of connections) {
                    const element = conn.element.toLowerCase();
                    if (hubCache[element] === undefined) {
                        hubCache[element] = getItemPosition(`${element} subclass`, 'equipped');
                    }
                    const hub = hubCache[element];
                    const isSourceHub = hub?.nodeId === sourceNodeId;
                    const shouldUseHub = isSourceSubclass && !isSourceHub;
                    const finalHubX = shouldUseHub ? hub?.x : undefined;
                    const finalHubY = shouldUseHub ? hub?.y : undefined;

                    let armorRes = null;
                    let weaponRes = null;

                    if (conn.armorResult) {
                        armorRes = getItemPosition(
                            conn.synergy.armor,
                            conn.armorResult.location,
                            conn.armorResult.characterId,
                            conn.armorResult.item.itemInstanceId
                        );
                    }

                    if (conn.weaponResult) {
                        weaponRes = getItemPosition(
                            conn.synergy.weapon,
                            conn.weaponResult.location,
                            conn.weaponResult.characterId,
                            conn.weaponResult.item.itemInstanceId
                        );
                    }

                    const processResult = (res: any, type: 'armor' | 'weapon') => {
                        if (!res) return;
                        newWires.push({
                            sourceX: currentSourceX,
                            sourceY: currentSourceY,
                            sourceScale: currentSourceScale,
                            hubX: finalHubX,
                            hubY: finalHubY,
                            hubScale: hub?.scale,
                            hubOpacity: hub?.opacity,
                            targetX: res.x,
                            targetY: res.y,
                            targetScale: res.scale,
                            targetOpacity: res.opacity,
                            targetOpacityActual: res.opacity,
                            targetRadius: Math.max(0, 32 * res.scale),
                            element: conn.element, // Force use of synergy element for single-color consistency
                            synergy: conn.synergy,
                            armorResult: conn.armorResult,
                            weaponResult: conn.weaponResult,
                            targetType: type
                        });
                    };

                    processResult(armorRes, 'armor');
                    processResult(weaponRes, 'weapon');

                    // 3. Process Abilities (Direct wires to subclass nodes)
                    // OPTIMIZATION: Only draw detail wires for the hovered or locked synergy
                    const isHovered = hoveredWireId?.buildName === conn.synergy.buildName;
                    const isLocked = lockedWireId?.buildName === conn.synergy.buildName;

                    if (isHovered || isLocked) {
                        const abilities = [
                            { name: conn.synergy.super, type: 'super' },
                            { name: conn.synergy.grenade, type: 'grenade' },
                            { name: conn.synergy.melee, type: 'melee' },
                            { name: conn.synergy.classAbility, type: 'classAbility' },
                            ...(conn.synergy.aspects || []).map(a => ({ name: a, type: 'aspect' })),
                            ...(conn.synergy.fragments || []).map(f => ({ name: f, type: 'fragment' }))
                        ];

                        for (const ability of abilities) {
                            if (!ability.name) continue;
                            const abilityRes = getItemPosition(ability.name, 'equipped');
                            if (abilityRes) {
                                newWires.push({
                                    sourceX: currentSourceX,
                                    sourceY: currentSourceY,
                                    sourceScale: currentSourceScale,
                                    hubX: finalHubX,
                                    hubY: finalHubY,
                                    hubScale: hub?.scale,
                                    hubOpacity: hub?.opacity,
                                    targetX: abilityRes.x,
                                    targetY: abilityRes.y,
                                    targetScale: abilityRes.scale * 0.8,
                                    targetOpacity: abilityRes.opacity,
                                    targetOpacityActual: abilityRes.opacity,
                                    targetRadius: Math.max(0, 24 * abilityRes.scale),
                                    element: conn.element, // Force use of synergy element
                                    synergy: conn.synergy,
                                    armorResult: conn.armorResult,
                                    weaponResult: conn.weaponResult,
                                    targetType: 'ability',
                                    abilityName: ability.name
                                });
                            }
                        }
                    }
                }
            }

            // Only update state if positions actually changed (avoid unnecessary re-renders)
            const newPositionsJson = JSON.stringify(newWires.map(w => ({
                tx: Math.round(w.targetX),
                ty: Math.round(w.targetY),
                ts: w.targetScale.toFixed(3),
                to: w.targetOpacity.toFixed(2)
            })));

            if (newPositionsJson !== lastPositionsJsonRef.current) {
                lastPositionsJsonRef.current = newPositionsJson;
                setWires(newWires);
            }

            raf = requestAnimationFrame(updateWires);
        };

        // Start RAF loop immediately
        raf = requestAnimationFrame(updateWires);
        return () => cancelAnimationFrame(raf);
    }, [connections, sourcePosition, sourceNodeId, getItemPosition, isExiting]);

    // Independent Entry Animation (Only once when connections change)
    useEffect(() => {
        if (!connections.length) return;
        const startTime = performance.now();
        const duration = 600;
        const animate = (now: number) => {
            const progress = Math.min((now - startTime) / duration, 1);
            setAnimationProgress(progress);
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [connections]);

    // Generate cubic bezier curve path with 3D perspective awareness
    const getWirePath = useCallback((wire: WirePosition, progress: number = 1): string => {
        const { sourceX, sourceY, targetX, targetY, targetScale } = wire;

        const dx = targetX - sourceX;
        const dy = targetY - sourceY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Control points should scale with the distance AND the perspective
        // Cap the bulge complexity to avoid extreme offsets at high zoom
        const curveComplexity = Math.min(dist * 0.25, 300);
        const offset = Math.max(20, curveComplexity) * targetScale;

        const cp1x = sourceX + dx * 0.25;
        const cp1y = sourceY + dy * 0.25 - offset;
        const cp2x = sourceX + dx * 0.75;
        const cp2y = sourceY + dy * 0.75 + offset;

        // Animate the endpoint for the 'growing' effect
        const endX = sourceX + dx * progress;
        const endY = sourceY + dy * progress;

        if (progress < 1) {
            // During entry, use a simpler quadratic curve for speed
            return `M ${sourceX} ${sourceY} Q ${cp1x} ${cp1y} ${endX} ${endY}`;
        }

        return `M ${sourceX} ${sourceY} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${targetX} ${targetY}`;
    }, []);

    // Handle wire hover for tooltip - only show hover tooltip if nothing is locked
    const handleWireMouseEnter = useCallback((wire: WirePosition) => {
        // Clear any pending hide timer
        if (wireHoverTimerRef.current) {
            clearTimeout(wireHoverTimerRef.current);
            wireHoverTimerRef.current = null;
        }

        if (!lockedWireIdRef.current) {
            // Check if we are already hovering THIS wire to avoid redundant timer setting
            const isSameWire = hoveredWireRef.current?.synergy.buildName === wire.synergy.buildName &&
                hoveredWireRef.current?.targetType === wire.targetType;

            if (isSameWire) return;

            // FLUIDITY: Delay showing the new wire
            if (wireShowTimerRef.current) {
                clearTimeout(wireShowTimerRef.current);
            }

            wireShowTimerRef.current = setTimeout(() => {
                setHoveredWireId({ buildName: wire.synergy.buildName, targetType: wire.targetType });
                onWireHoverChange?.(true);
                // Notify parent of which wire targets are being hovered
                onWireHover?.({
                    armorInstanceId: wire.armorResult?.item.itemInstanceId || null,
                    weaponInstanceId: wire.weaponResult?.item.itemInstanceId || null
                });
                wireShowTimerRef.current = null;
            }, 200); // 200ms delay
        }
    }, [onWireHoverChange, onWireHover]);

    const handleWireMouseLeave = useCallback(() => {
        if (!lockedWireIdRef.current) {
            // FLUIDITY: Cancel pending show if we leave before it triggers
            if (wireShowTimerRef.current) {
                clearTimeout(wireShowTimerRef.current);
                wireShowTimerRef.current = null;
            }

            // Hysteresis: Delay hiding to prevent flicker
            wireHoverTimerRef.current = setTimeout(() => {
                setHoveredWireId(null);
                onWireHoverChange?.(false);
                onWireHover?.(null);
                wireHoverTimerRef.current = null;
            }, 150);
        }
    }, [onWireHoverChange, onWireHover]);

    const handleTooltipMouseLeave = useCallback(() => {
        // Don't hide tooltip on mouse leave if it's locked
        if (!lockedWireIdRef.current) {
            // Hysteresis: Delay hiding to prevent flicker when moving back to wire
            if (wireHoverTimerRef.current) {
                clearTimeout(wireHoverTimerRef.current);
            }
            wireHoverTimerRef.current = setTimeout(() => {
                setHoveredWireId(null);
                onWireHoverChange?.(false);
                onWireHover?.(null);
                wireHoverTimerRef.current = null;
            }, 150);
        }
    }, [onWireHoverChange, onWireHover]);

    const handleTooltipMouseEnter = useCallback(() => {
        // Clear any pending hide timer
        if (wireHoverTimerRef.current) {
            clearTimeout(wireHoverTimerRef.current);
            wireHoverTimerRef.current = null;
        }

        const activeWire = lockedWire || hoveredWireRef.current;
        if (activeWire) {
            setHoveredWireId({ buildName: activeWire.synergy.buildName, targetType: activeWire.targetType });
            // RE-NOTIFY isolation state when entering tooltip to ensure it stays active
            // This prevents "clumping" from resetting when mouse moves from wire to tooltip
            onWireHover?.({
                armorInstanceId: activeWire.armorResult?.item.itemInstanceId || null,
                weaponInstanceId: activeWire.weaponResult?.item.itemInstanceId || null
            });
        }
        onWireHoverChange?.(true);
    }, [onWireHoverChange, onWireHover, lockedWire]);

    // Handle click on end node to lock/unlock tooltip
    const handleEndNodeClick = useCallback((wire: WirePosition) => {
        debugLog('SynergyWeb', `End node click: ${wire.targetType}`, wire);
        const wireId = { buildName: wire.synergy.buildName, targetType: wire.targetType };
        const isAlreadyLocked = lockedWireIdRef.current?.buildName === wireId.buildName &&
            lockedWireIdRef.current?.targetType === wireId.targetType;

        if (isAlreadyLocked) {
            // Clicking the same node unlocks it
            setLockedWireId(null);
            setHoveredWireId(null);
            onWireHoverChange?.(false);
            onWireHover?.(null); // Clear the hovered wire info
            onWireLock?.(null); // Notify parent to reset zoom
        } else {
            // Lock this wire's tooltip by storing its identifier
            setLockedWireId(wireId);
            setHoveredWireId(wireId);
            onWireHoverChange?.(true);
            // Notify parent which items are part of this locked wire (so they stay visible)
            onWireHover?.({
                armorInstanceId: wire.armorResult?.item.itemInstanceId || null,
                weaponInstanceId: wire.weaponResult?.item.itemInstanceId || null
            });
            // Notify parent to zoom to this item
            const itemInstanceId = wire.targetType === 'armor'
                ? wire.armorResult?.item.itemInstanceId
                : wire.weaponResult?.item.itemInstanceId;
            debugLog('SynergyWeb', `Calling onWireLock: ${itemInstanceId}`);
            onWireLock?.(itemInstanceId || null);
        }
    }, [onWireHoverChange, onWireHover, onWireLock]);

    // Handle clicking outside to unlock tooltip
    const handleBackgroundClick = useCallback(() => {
        if (lockedWireIdRef.current) {
            setLockedWireId(null);
            setHoveredWireId(null);
            onWireHoverChange?.(false);
            onWireHover?.(null); // Clear the hovered wire info
            onWireLock?.(null); // Notify parent to reset zoom
        }
    }, [onWireHoverChange, onWireHover, onWireLock]);

    const handleConfirmBuild = useCallback((synergy: DashboardSynergy) => {
        setConfirmedSynergy(synergy);
        setHoveredWireId(null);
        onWireHoverChange?.(false);
        if (onSynergyOverlayChange) {
            onSynergyOverlayChange(true, synergy);
        }
    }, [onWireHoverChange, onSynergyOverlayChange]);

    const handleCloseOverlay = useCallback(() => {
        setConfirmedSynergy(null);
        if (onSynergyOverlayChange) {
            onSynergyOverlayChange(false, null);
        }
    }, [onSynergyOverlayChange]);

    const renderSynergyTooltip = useCallback((wire: WirePosition | null) => {
        if (!wire) return null;
        const tooltipId = `synergy-wire-${wire.synergy.buildName}-${wire.synergy.armor}-${wire.synergy.weapon}`;

        return (
            <div className="synergy-web__combined-tooltip" onMouseEnter={handleTooltipMouseEnter} onMouseLeave={handleTooltipMouseLeave}>
                <div className="synergy-web__combined-tooltip-items">
                    {wire.armorResult?.item && (
                        <div className="synergy-web__combined-tooltip-item">
                            <RichTooltip
                                key={`${tooltipId}-armor`}
                                item={wire.armorResult.item}
                                instance={wire.armorResult.item.itemInstanceId ? itemInstances[wire.armorResult.item.itemInstanceId] : undefined}
                                inline
                                followMouse={false}
                                hideZoomButtons={false}
                                clickActionLabel="Confirm Synergy"
                                onClick={() => handleConfirmBuild(wire.synergy)}
                                hideSynergizeAction={true}
                            />
                        </div>
                    )}
                    {wire.weaponResult?.item && (
                        <div className="synergy-web__combined-tooltip-item">
                            <RichTooltip
                                key={`${tooltipId}-weapon`}
                                item={wire.weaponResult.item}
                                instance={wire.weaponResult.item.itemInstanceId ? itemInstances[wire.weaponResult.item.itemInstanceId] : undefined}
                                inline
                                followMouse={false}
                                hideZoomButtons={false}
                                onClick={() => handleConfirmBuild(wire.synergy)}
                                hideSynergizeAction={true}
                            />
                        </div>
                    )}
                </div>
            </div>
        );
    }, [handleTooltipMouseEnter, handleTooltipMouseLeave, itemInstances, handleConfirmBuild]);

    // Handle wire click - now just locks the tooltip (original behavior preserved via onWireClick if needed)
    const handleWireClick = useCallback((wire: WirePosition) => {
        // Lock the tooltip on click
        handleEndNodeClick(wire);
        // Also call the original callback if provided
        if (onWireClick) {
            onWireClick(wire.synergy);
        }
    }, [onWireClick, handleEndNodeClick]);

    // Handle escape to close - first unlock tooltip, then close synergy web
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                // If tooltip is locked, unlock it first
                if (lockedWireIdRef.current) {
                    setLockedWireId(null);
                    setHoveredWireId(null);
                    onWireHoverChange?.(false);
                    onWireHover?.(null); // Clear the hovered wire info
                    onWireLock?.(null); // Notify parent to reset zoom
                    return; // Don't close the synergy web yet
                }
                // Otherwise close the synergy web
                if (onClose) {
                    onClose();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, onWireHoverChange, onWireHover, onWireLock]);

    if (!wires.length) {
        return null;
    }

    // Group wires by element for gradient generation
    const wiresByElement = wires.reduce((acc, wire) => {
        if (!acc[wire.element]) {
            acc[wire.element] = [];
        }
        acc[wire.element].push(wire);
        return acc;
    }, {} as Record<string, WirePosition[]>);

    // Determine which wire to display - locked takes precedence over hovered
    const displayedWire = lockedWire || hoveredWire;

    return (
        <div className="synergy-web" onClick={handleBackgroundClick}>
            <svg
                ref={svgRef}
                className="synergy-web__svg"
                style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, pointerEvents: 'auto' }}
            >
                <defs>
                    {/* Solar - Burning flame effect with multiple glow layers */}
                    <filter id="glow-solar" x="-100%" y="-100%" width="300%" height="300%">
                        <feGaussianBlur stdDeviation="3" result="blur1" />
                        <feGaussianBlur stdDeviation="8" result="blur2" />
                        <feColorMatrix in="blur2" type="matrix" values="
                            1.2 0 0 0 0
                            0.8 0 0 0 0
                            0 0 0 0 0
                            0 0 0 1 0" result="orangeGlow" />
                        <feMerge>
                            <feMergeNode in="orangeGlow" />
                            <feMergeNode in="blur1" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    {/* Arc - Electric crackling with displacement */}
                    <filter id="glow-arc" x="-100%" y="-100%" width="300%" height="300%">
                        <feTurbulence type="fractalNoise" baseFrequency="2" numOctaves="2" result="noise" seed="1" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" result="displacement" />
                        <feGaussianBlur in="displacement" stdDeviation="2" result="blur" />
                        <feColorMatrix in="blur" type="matrix" values="
                            0.5 0 0 0 0
                            0.8 0 0 0 0
                            1 0 0 0 0
                            0 0 0 1 0" result="cyanGlow" />
                        <feMerge>
                            <feMergeNode in="cyanGlow" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    {/* Void - Standard glow */}
                    <filter id="glow-void" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    {/* Stasis - Crystalline ice with sharp edges */}
                    <filter id="glow-stasis" x="-80%" y="-80%" width="260%" height="260%">
                        <feGaussianBlur stdDeviation="1" result="blur1" />
                        <feGaussianBlur stdDeviation="4" result="blur2" />
                        <feColorMatrix in="blur2" type="matrix" values="
                            0.3 0 0 0 0
                            0.5 0 0 0 0
                            1 0 0 0 0.2
                            0 0 0 1 0" result="iceGlow" />
                        <feMerge>
                            <feMergeNode in="iceGlow" />
                            <feMergeNode in="blur1" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    {/* Strand - Standard glow */}
                    <filter id="glow-strand" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    {/* Prismatic - Pink with rainbow shimmer */}
                    <filter id="glow-prismatic" x="-100%" y="-100%" width="300%" height="300%">
                        <feGaussianBlur stdDeviation="5" result="blur1" />
                        <feGaussianBlur stdDeviation="10" result="blur2" />
                        <feColorMatrix in="blur1" type="matrix" values="
                            1 0 0 0 0.3
                            0.5 0 0 0 0
                            1 0 0 0 0.4
                            0 0 0 1 0" result="pinkGlow" />
                        <feColorMatrix in="blur2" type="matrix" values="
                            1 0 0 0 0.4
                            0.8 0 0 0 0.2
                            0.6 0 0 0 0
                            0 0 0 0.5 0" result="rainbowGlow" />
                        <feMerge>
                            <feMergeNode in="rainbowGlow" />
                            <feMergeNode in="pinkGlow" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    <linearGradient id="prismatic-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ff8df6" />
                        <stop offset="100%" stopColor="#eecc44" />
                    </linearGradient>

                    {/* Dynamic gradients for each wire fade */}
                    {Object.entries(wiresByElement).map(([element, elementalWires]) =>
                        elementalWires.map((wire, index) => {
                            const gradId = `fade-${element}-${index}`;
                            // Determine source for gradient based on whether there's a hub
                            const hasHub = wire.hubX !== undefined && wire.hubY !== undefined;
                            const sx = hasHub ? wire.hubX! : wire.sourceX;
                            const sy = hasHub ? wire.hubY! : wire.sourceY;
                            const tx = wire.targetX;
                            const ty = wire.targetY;
                            const wireColor = ELEMENT_COLORS[element] || '#fff';
                            const stopColor = wireColor; // USER REQUEST: No dual colors. Stop at same color.

                            return (
                                <linearGradient
                                    key={gradId}
                                    id={gradId}
                                    gradientUnits="userSpaceOnUse"
                                    x1={sx} y1={sy}
                                    x2={tx} y2={ty}
                                >
                                    {/* Light traveling through space - bright at source, fading into distance */}
                                    <stop offset="0%" stopColor={wireColor} stopOpacity={1} />
                                    <stop offset="30%" stopColor={wireColor} stopOpacity={0.7} />
                                    <stop offset="100%" stopColor={stopColor} stopOpacity={0.2} />
                                </linearGradient>
                            );
                        })
                    )}
                </defs>

                {/* Group wires by element to render shared Hub-to-Source "trunks" */}
                {Object.keys(ELEMENT_COLORS).map(element => {
                    const elementalWires = wires.filter(w => w.element === element);
                    if (elementalWires.length === 0) return null;

                    const firstWire = elementalWires[0];
                    const hasHub = firstWire.hubX !== undefined && firstWire.hubY !== undefined;
                    // Calculate average hub positions and source positions
                    const sourceX = firstWire.sourceX;
                    const sourceY = firstWire.sourceY;
                    const sourceScale = firstWire.sourceScale;
                    const hubX = firstWire.hubX ?? sourceX;
                    const hubY = firstWire.hubY ?? sourceY;
                    const hubScale = firstWire.hubScale ?? sourceScale;
                    const hubOpacity = firstWire.hubOpacity ?? 1;

                    return (
                        <g key={`element-group-${element}`}>
                            {/* Shared "Trunk": Source -> Hub (Tapered) */}
                            {hasHub && (
                                <g style={{ opacity: hubOpacity }}>
                                    {null}
                                </g>
                            )}

                            {/* Individual Wires: Hub -> Target */}
                            {elementalWires.map((wire, index) => {
                                // Entry animation: wires grow from source
                                const entryProgress = Math.min(1, animationProgress * wires.length / (index + 1));
                                // Combined with exit animation
                                const wireProgress = entryProgress * exitProgress;
                                const isHovered = hoveredWire === wire;
                                // Check if ANY wire is being hovered (for dimming non-hovered wires)
                                const anyWireHovered = hoveredWire !== null;

                                // If we have a hub, use it as the source for this segment
                                const segmentSourceX = hasHub ? hubX : sourceX;
                                const segmentSourceY = hasHub ? hubY : sourceY;
                                const segmentSourceScale = hasHub ? hubScale : sourceScale;

                                // Apply exit fade to opacity
                                // When any wire is hovered, dim non-hovered wires significantly
                                let opacity = wire.targetOpacityActual * exitProgress;
                                if (anyWireHovered && !isHovered) {
                                    opacity *= 0.1; // Dim non-hovered wires
                                }

                                return (
                                    <g key={`${wire.synergy.buildName}-${wire.targetType}-${index}`} style={{ opacity }}>
                                        {/* OPTIMIZED: Calculate path once for both hit-test and visual */}
                                        {(() => {
                                            const wirePath = getWirePath({
                                                ...wire,
                                                sourceX: segmentSourceX,
                                                sourceY: segmentSourceY,
                                                sourceScale: segmentSourceScale
                                            }, 1);

                                            return (
                                                <>
                                                    {/* 1. HIT PATH REMOVED - User requested only points be interactive */}

                                                    {/* 2. Circular hitbox at the target node (end of wire) */}
                                                    <circle
                                                        cx={wire.targetX}
                                                        cy={wire.targetY}
                                                        r={Math.max(0, 50 * wire.targetScale)}
                                                        fill="transparent"
                                                        style={{ cursor: 'pointer', pointerEvents: 'fill' }}
                                                        onPointerEnter={() => handleWireMouseEnter(wire)}
                                                        onPointerLeave={handleWireMouseLeave}
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Prevent background click handler
                                                            handleWireClick(wire);
                                                        }}
                                                    />

                                                    {/* 3. Visual Wires */}
                                                    {wireProgress === 1 && (() => {
                                                        const baseWidth = isHovered ? 1.2 : 0.6;
                                                        const isIsolating = !!(hoveredWireId || lockedWireId);
                                                        const isThisWireActive = isHovered || (lockedWireId?.buildName === wire.synergy.buildName && lockedWireId?.targetType === wire.targetType);

                                                        let baseOpacity = isHovered ? 0.6 : 0.4;
                                                        if (isIsolating && !isThisWireActive) {
                                                            baseOpacity *= 0.15; // Aggressively dim non-active wires
                                                        }

                                                        switch (wire.element) {
                                                            case 'solar':
                                                                return (
                                                                    <>
                                                                        <path d={wirePath} stroke="#ff8800" strokeWidth={baseWidth * 3} fill="none" strokeLinecap="round" opacity={baseOpacity * 0.3} style={{ pointerEvents: 'none' }} />
                                                                        <path d={wirePath} stroke="#ffaa00" strokeWidth={baseWidth * 2} fill="none" strokeLinecap="round" opacity={baseOpacity * 0.5} style={{ pointerEvents: 'none' }} />
                                                                        <path d={wirePath} stroke="#ff6600" strokeWidth={baseWidth} fill="none" strokeLinecap="round" opacity={baseOpacity} style={{ pointerEvents: 'none' }} />
                                                                    </>
                                                                );
                                                            case 'arc':
                                                                return (
                                                                    <>
                                                                        <path d={wirePath} stroke="#00d4ff" strokeWidth={baseWidth * 2.5} fill="none" strokeLinecap="round" opacity={baseOpacity * 0.4} style={{ pointerEvents: 'none' }} />
                                                                        <path d={wirePath} stroke="#88f0ff" strokeWidth={baseWidth * 1.5} fill="none" strokeLinecap="round" opacity={baseOpacity * 0.6} style={{ pointerEvents: 'none' }} />
                                                                        <path d={wirePath} stroke="#00ffff" strokeWidth={baseWidth} fill="none" strokeLinecap="round" opacity={baseOpacity} style={{ pointerEvents: 'none' }} />
                                                                    </>
                                                                );
                                                            case 'stasis':
                                                                return (
                                                                    <>
                                                                        <path d={wirePath} stroke="#2266ff" strokeWidth={baseWidth * 2} fill="none" strokeLinecap="round" opacity={baseOpacity * 0.5} style={{ pointerEvents: 'none' }} />
                                                                        <path d={wirePath} stroke="#66aaff" strokeWidth={baseWidth * 1.2} fill="none" strokeLinecap="round" opacity={baseOpacity * 0.7} style={{ pointerEvents: 'none' }} />
                                                                        <path d={wirePath} stroke="#aaddff" strokeWidth={baseWidth * 0.8} fill="none" strokeLinecap="round" opacity={baseOpacity} style={{ pointerEvents: 'none' }} />
                                                                    </>
                                                                );
                                                            case 'void':
                                                                return (
                                                                    <>
                                                                        <path d={wirePath} stroke="#6600cc" strokeWidth={baseWidth * 3} fill="none" strokeLinecap="round" opacity={baseOpacity * 0.4} style={{ pointerEvents: 'none' }} />
                                                                        <path d={wirePath} stroke="#9933ff" strokeWidth={baseWidth * 2} fill="none" strokeLinecap="round" opacity={baseOpacity * 0.6} style={{ pointerEvents: 'none' }} />
                                                                        <path d={wirePath} stroke="#cc66ff" strokeWidth={baseWidth} fill="none" strokeLinecap="round" opacity={baseOpacity} style={{ pointerEvents: 'none' }} />
                                                                    </>
                                                                );
                                                            case 'prismatic':
                                                                return (
                                                                    <>
                                                                        <path d={wirePath} stroke="#ff66dd" strokeWidth={baseWidth * 3} fill="none" strokeLinecap="round" opacity={baseOpacity * 0.3} style={{ pointerEvents: 'none' }} />
                                                                        <path d={wirePath} stroke="#ff88ee" strokeWidth={baseWidth * 2} fill="none" strokeLinecap="round" opacity={baseOpacity * 0.5} style={{ pointerEvents: 'none' }} />
                                                                        <path d={wirePath} stroke="#ffaaff" strokeWidth={baseWidth * 1.5} fill="none" strokeLinecap="round" opacity={baseOpacity * 0.7} style={{ pointerEvents: 'none' }} />
                                                                        <path d={wirePath} stroke="#ff6be8" strokeWidth={baseWidth} fill="none" strokeLinecap="round" opacity={baseOpacity} style={{ pointerEvents: 'none' }} />
                                                                    </>
                                                                );
                                                            default:
                                                                return (
                                                                    <>
                                                                        <path d={wirePath} stroke={ELEMENT_COLORS[wire.element]} strokeWidth={baseWidth * 2} fill="none" strokeLinecap="round" opacity={baseOpacity * 0.5} style={{ pointerEvents: 'none' }} />
                                                                        <path d={wirePath} stroke={ELEMENT_COLORS[wire.element]} strokeWidth={baseWidth} fill="none" strokeLinecap="round" opacity={baseOpacity} style={{ pointerEvents: 'none' }} />
                                                                    </>
                                                                );
                                                        }
                                                    })()}
                                                </>
                                            );
                                        })()}

                                        {/* Endpoint dots removed - pure particle effect only */}
                                    </g>
                                );
                            })}
                        </g>
                    );
                })}
            </svg>

            {/* Combined wire + item tooltip - shows locked or hovered wire */}
            {displayedWire && (() => {
                // Calculate tooltip position when locked
                let tooltipStyle: React.CSSProperties;
                if (lockedWire) {
                    // Centered behind the item
                    let posX = displayedWire.targetX;
                    let posY = displayedWire.targetY - 40; // Shifted up slightly for balance

                    // Boundary checks to keep on-screen vertically
                    const tooltipHeight = 300;
                    if (posY - tooltipHeight / 2 < 100) posY = 100 + tooltipHeight / 2;
                    if (posY + tooltipHeight / 2 > window.innerHeight - 20) posY = window.innerHeight - 20 - tooltipHeight / 2;

                    tooltipStyle = {
                        left: `${posX}px`,
                        top: `${posY}px`,
                        bottom: 'auto',
                        transform: 'translateY(-50%) translateX(-50%)' // Center it!
                    };
                } else {
                    // When hovering, keep at bottom center
                    tooltipStyle = {
                        left: '50%',
                        bottom: '40px',
                        top: 'auto'
                    };
                }

                return (
                    <div
                        className={`synergy-web__combined-tooltip-wrapper synergy-web__combined-tooltip-wrapper--${displayedWire.element}${lockedWire ? ' synergy-web__combined-tooltip-wrapper--locked' : ''}`}
                        style={tooltipStyle}
                        onClick={(e) => e.stopPropagation()} // Prevent background click from closing when clicking tooltip
                        onMouseEnter={() => {
                            // KEEP OPEN: Clear any pending hide timer
                            if (wireHoverTimerRef.current) {
                                clearTimeout(wireHoverTimerRef.current);
                                wireHoverTimerRef.current = null;
                            }
                        }}
                        onMouseLeave={handleWireMouseLeave} // Resume hide timer on leave
                    >
                        {renderSynergyTooltip(displayedWire)}
                    </div>
                );
            })()}


            {/* Full-screen synergy build overlay */}
            {confirmedSynergy && (
                <SynergyBuildOverlay
                    synergy={confirmedSynergy}
                    onClose={handleCloseOverlay}
                    onEquip={(synergy) => {
                        handleCloseOverlay(); // Close overlay first to show transmat animation
                        // Trigger equip through parent if available
                        if (onEquipSynergy) {
                            onEquipSynergy(synergy);
                        }
                    }}
                />
            )}
        </div>
    );
}

export default SynergyWeb;
