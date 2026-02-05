import { createContext, useContext, useState, useEffect, useRef, useCallback, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { DestinyItem, ItemInstance } from '../../types';
import { RichTooltip } from './RichTooltip';

interface TooltipState {
    item: DestinyItem | null;
    instance: ItemInstance | null;
    overrideElement?: 'void' | 'solar' | 'arc' | 'stasis' | 'strand' | 'prismatic';
    isFocused?: boolean;
    isHud?: boolean;
    fixedPosition?: { x: number; y: number };
    onTransfer?: (characterId: string) => void;
    onEquip?: (characterId: string) => void;
    showTransferMenu?: boolean;
    hideStats?: boolean;
    onRightClick?: () => void;
    hideSynergizeAction?: boolean;
}

interface TooltipContextType {
    showTooltip: (
        item: DestinyItem,
        instance?: ItemInstance,
        overrideElement?: 'void' | 'solar' | 'arc' | 'stasis' | 'strand' | 'prismatic',
        isFocused?: boolean,
        onTransfer?: (characterId: string) => void,
        onEquip?: (characterId: string) => void,
        isHud?: boolean,
        fixedPosition?: { x: number; y: number },
        hideStats?: boolean,
        onRightClick?: () => void,
        hideSynergizeAction?: boolean
    ) => void;
    hideTooltip: () => void;
    openTransferMenu: () => void;
}

const TooltipContext = createContext<TooltipContextType | null>(null);

export function TooltipProvider({ children }: { children: React.ReactNode }) {
    const [tooltip, setTooltip] = useState<TooltipState>({ item: null, instance: null });
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [visible, setVisible] = useState(false);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const hideTimeoutRef = useRef<any>(null);
    const rafRef = useRef<any>(null);
    const lastPositionRef = useRef({ x: 0, y: 0 });
    const isFocusedRef = useRef(false);
    const isHudRef = useRef(false);

    // Synchronize ref with state for immediate access in event listeners
    useEffect(() => {
        isFocusedRef.current = !!tooltip.isFocused;
        isHudRef.current = !!tooltip.isHud;
    }, [tooltip.isFocused, tooltip.isHud]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!visible || isFocusedRef.current || isHudRef.current) return;

            // Store current mouse position
            lastPositionRef.current = { x: e.clientX, y: e.clientY };

            // Cancel any pending RAF
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }

            // Throttle updates using requestAnimationFrame
            rafRef.current = requestAnimationFrame(() => {
                setPosition({ x: lastPositionRef.current.x, y: lastPositionRef.current.y });
            });
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [visible, tooltip]);

    const showTooltip = useCallback((
        item: DestinyItem,
        instance?: ItemInstance,
        overrideElement?: any,
        isFocused?: boolean,
        onTransfer?: (characterId: string) => void,
        onEquip?: (characterId: string) => void,
        isHud?: boolean,
        fixedPosition?: { x: number; y: number },
        hideStats?: boolean,
        onRightClick?: () => void,
        hideSynergizeAction?: boolean
    ) => {
        // Clear any pending hide
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }

        // Update refs immediately for instantaneous locking in move events
        isFocusedRef.current = !!isFocused;
        isHudRef.current = !!isHud;

        // Only update if the item actually changed or the element override changed
        setTooltip(prev => {
            if (prev.item?.itemInstanceId === item.itemInstanceId && prev.overrideElement === overrideElement && prev.isFocused === isFocused && prev.isHud === isHud && prev.fixedPosition?.x === fixedPosition?.x && prev.fixedPosition?.y === fixedPosition?.y && prev.hideStats === hideStats) {
                return prev;
            }
            return { item, instance: instance || null, overrideElement, isFocused, onTransfer, onEquip, isHud, fixedPosition, hideStats, onRightClick, hideSynergizeAction };
        });
        setVisible(true);
    }, []);

    const hideTooltip = useCallback(() => {
        // Add a tiny delay to prevent flicker when moving between adjacent items
        hideTimeoutRef.current = window.setTimeout(() => {
            setVisible(false);
            // Clear tooltip content after fade out
            setTimeout(() => {
                setTooltip({ item: null, instance: null });
            }, 50);
        }, 30);
    }, []);

    const openTransferMenu = useCallback(() => {
        setTooltip(prev => ({ ...prev, showTransferMenu: true }));
    }, []);

    // Compute position with boundary checking
    const computePosition = () => {
        // HUD MODE: Custom fixed position OR default cinematic position
        if (tooltip.isHud) {
            if (tooltip.fixedPosition) {
                const width = tooltipRef.current?.offsetWidth || 0;
                const height = tooltipRef.current?.offsetHeight || 0;
                let x = tooltip.fixedPosition.x;
                // Center vertically relative to the fixed Y coordinate
                // Shifted up slightly (-40px) to balance against the node center and avoid overlaps
                let y = tooltip.fixedPosition.y - (height / 2) - 40;

                const minTopMargin = 180; // Keep below emblem

                // Horizontal boundary check: Right
                if (x + width > window.innerWidth - 15) {
                    x = window.innerWidth - width - 15;
                }

                // Boundary check: Bottom
                if (y + height > window.innerHeight - 20) {
                    y = window.innerHeight - height - 20;
                }

                // Final clamp: Stay below minTopMargin and safe left
                x = Math.max(10, x);
                y = Math.max(minTopMargin, y);

                return { x, y };
            }
            const hudX = 40; // Default left position for HUD
            const hudY = 180;
            return { x: hudX, y: hudY };
        }

        if (!tooltipRef.current || !visible) {
            return { x: position.x + 25, y: 180 }; // Default to safe position below emblem
        }

        const paddingX = 25;
        const paddingY = -25; // Shifted up for better visibility
        const width = tooltipRef.current.offsetWidth;
        const height = tooltipRef.current.offsetHeight;
        const minTopMargin = 180; // Keep tooltip below emblem area (increased)

        let x = position.x + paddingX;
        // Always start from minTopMargin if mouse is above it, otherwise follow mouse
        let y = Math.max(minTopMargin, position.y + paddingY);

        // Flip horizontally if too close to right edge
        if (x + width > window.innerWidth - 20) {
            x = position.x - width - paddingX;
        }

        // If tooltip would go below screen, just clamp it (never flip above minTopMargin)
        if (y + height > window.innerHeight - 250) {
            y = window.innerHeight - height - 250;
        }

        // Final clamp - ALWAYS stay below minTopMargin, never above
        x = Math.max(10, Math.min(x, window.innerWidth - width - 10));
        y = Math.max(minTopMargin, y);

        return { x, y };
    };

    const pos = computePosition();

    const computedStyle: CSSProperties = {
        position: 'fixed',
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        pointerEvents: (tooltip.isFocused || tooltip.isHud) ? 'auto' : 'none',
        zIndex: (tooltip.isFocused || tooltip.isHud) ? 500 : 99999,
        opacity: visible && tooltip.item ? 1 : 0,
        // HUD mode: snap to position instantly. Regular mode: smooth follow
        transition: (tooltip.isHud || tooltip.fixedPosition)
            ? 'opacity 0.05s ease-out'
            : 'opacity 0.05s ease-out, left 0.15s ease-out, top 0.15s ease-out'
    };

    return (
        <TooltipContext.Provider value={{ showTooltip, hideTooltip, openTransferMenu }}>
            {children}
            {createPortal(
                <div ref={tooltipRef} style={computedStyle}>
                    {tooltip.item && (
                        <RichTooltip
                            item={tooltip.item}
                            instance={tooltip.instance}
                            overrideElement={tooltip.overrideElement}
                            isFocused={tooltip.isFocused}
                            onTransfer={tooltip.onTransfer}
                            onEquip={tooltip.onEquip}
                            externalShowTransferMenu={tooltip.showTransferMenu}
                            followMouse={false}
                            inline={true}
                            hideStats={tooltip.hideStats}
                            onRightClick={tooltip.onRightClick}
                            hideSynergizeAction={tooltip.hideSynergizeAction}
                        />
                    )}
                </div>,
                document.body
            )}
        </TooltipContext.Provider>
    );
}

export function useTooltip() {
    const context = useContext(TooltipContext);
    if (!context) {
        throw new Error('useTooltip must be used within TooltipProvider');
    }
    return context;
}
