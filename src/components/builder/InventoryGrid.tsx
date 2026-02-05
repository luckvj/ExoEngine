import { useMemo } from 'react';
import { useLongPress } from '../../hooks/useLongPress';
import type { DestinyItem, ItemInstance, ItemDefinition } from '../../types';
import { manifestService } from '../../services/bungie/manifest.service';
import { useProfileStore } from '../../store';
import { getTierClass } from '../../utils/character-helpers';
import { getBungieUrl } from '../../utils/url-helper';
import { isLegacyVersion } from '../../utils/season-utils';
import { TierBadge } from './TierBadge';
import { useTooltip } from './TooltipManager';
import '../../styles/TransmatEffect.css';
import './InventoryGrid.css';

interface InventoryGridProps {
    items: DestinyItem[];
    bucketHash: number;
    onSelect?: (item: DestinyItem) => void;
}

const DAMAGE_TYPE_NAMES: Record<number, string> = {
    1: 'kinetic',
    2: 'arc',
    3: 'solar',
    4: 'void',
    6: 'stasis',
    7: 'strand',
};

export function InventoryGrid({ items, bucketHash, onSelect }: InventoryGridProps) {
    const { itemInstances } = useProfileStore();

    // Take first 9 items
    const gridCells = useMemo(() => {
        const filtered = items.filter((item) => item.bucketHash === bucketHash).slice(0, 9);
        const cells = [...filtered];
        while (cells.length < 9) {
            cells.push(undefined as any);
        }
        return cells;
    }, [items, bucketHash]);

    return (
        <div className="inventory-grid">
            {gridCells.map((item, index) => (
                <InventoryCell
                    key={item?.itemInstanceId || item?.itemHash || `empty - ${index} `}
                    item={item}
                    instance={item?.itemInstanceId ? itemInstances[item.itemInstanceId] : undefined}
                    onSelect={onSelect && item ? () => onSelect(item) : undefined}
                />
            ))}
        </div>
    );
}



function InventoryCell({ item, instance, onSelect }: {
    item?: DestinyItem;
    instance?: ItemInstance;
    onSelect?: () => void;
}) {
    const { showTooltip, hideTooltip } = useTooltip();
    const def: ItemDefinition | undefined = item ? manifestService.getItem(item.itemHash) : undefined;

    // Long Press Handler for Mobile/Touch
    const longPressHandlers = useLongPress(
        () => {
            // On Long Press -> Show Tooltip
            if (item) showTooltip(item, instance);
        },
        () => {
            // On Click / Short Tap -> Select Item
            if (onSelect) onSelect();
        },
        { delay: 400, isPreventDefault: true }
    );

    const iconUrl = def?.displayProperties.icon || undefined;
    const tierClass = item ? getTierClass(item) : '';

    // Power & Damage Info
    const power = instance?.power;
    const damageType = instance?.damageType || def?.defaultDamageType;
    const damageTypeName = damageType ? DAMAGE_TYPE_NAMES[damageType] : undefined;
    const damageIconUrl = damageTypeName ? manifestService.getDamageTypeIcon(damageTypeName as any) : undefined;

    // API Banners - Robust URL construction
    const secondarySpecialUrl = getBungieUrl(def?.secondarySpecial);
    const secondaryIconUrl = getBungieUrl(def?.secondaryIcon);
    const secondaryOverlayUrl = getBungieUrl(def?.secondaryOverlay);

    // Watermark Logic
    const standardWatermark = def?.iconWatermark;
    const featuredWatermark = def?.iconWatermarkFeatured;

    // Default to legacy if no featured, or if we want to force it (future proofing)
    const isLegacyWatermark = (!featuredWatermark && !!standardWatermark) || isLegacyVersion(def?.quality?.currentVersion);
    const watermarkUrl = getBungieUrl(featuredWatermark || standardWatermark);

    // Border Logic
    const isMasterwork = !!(item?.state && (item.state & 4));
    const isCrafted = !!(item?.state && (item.state & 8));
    const isWeapon = def?.itemType === 3;

    // Enhanced weapon check (weapons with enhanced perks) - ONLY for crafted weapons
    const isEnhanced = !!(isCrafted && instance?.gearTier && instance.gearTier >= 2);

    const { activeTransfers, successfulTransfers } = useProfileStore();
    const instanceId = item?.itemInstanceId;
    const isTransferring = instanceId ? activeTransfers.has(instanceId) : false;
    const isSuccess = instanceId ? successfulTransfers.has(instanceId) : false;

    return (
        <div
                            className={`inventory-cell ${!item ? 'inventory-cell--empty' : ''} ${isMasterwork ? 'inventory-cell--masterwork' : ''} ${isWeapon ? 'inventory-cell--weapon' : ''} ${isTransferring ? 'transfer-active' : ''} ${isSuccess ? 'transfer-success' : ''}`}            // Spread Long Press Handlers (handles onMouseDown, onTouchStart, etc.)
            {...longPressHandlers}
            // Keep Hover for PC
            onMouseEnter={() => item && showTooltip(item, instance)}
            onMouseLeave={hideTooltip}
            data-item-id={item?.itemInstanceId || item?.itemHash.toString()}
            data-item-hash={item?.itemHash}
        >
            {item && iconUrl && (
                <>
                    <div className="transmat-overlay" />
                    {/* Rarity Background */}
                    <div className={`inventory-cell__tier inventory-cell__tier--${tierClass}`} />

                    {/* API Banners (Emblem/Armory Icons) */}
                    {/* Consistent with GearSlot - z-index 1 (background) */}
                    {(secondaryIconUrl || secondarySpecialUrl || secondaryOverlayUrl) && (
                        <div className="inventory-cell__api-banner">
                            {/* 1. Base Banner */}
                            {secondaryIconUrl && (
                                <img src={secondaryIconUrl} className="inventory-cell__banner-img" alt="" style={{ zIndex: 1 }} />
                            )}

                            {/* 2. Special Pattern */}
                            {secondarySpecialUrl && (
                                <img
                                    src={secondarySpecialUrl}
                                    className="inventory-cell__banner-img inventory-cell__banner-img--special"
                                    alt=""
                                    style={{ zIndex: 2 }}
                                />
                            )}

                            {/* 3. Overlay/Border */}
                            {secondaryOverlayUrl && (
                                <img src={secondaryOverlayUrl} className="inventory-cell__banner-img" alt="" style={{ zIndex: 3 }} />
                            )}
                        </div>
                    )}

                    <img src={iconUrl} alt={def?.displayProperties.name} className="inventory-cell__icon" loading="lazy" />

                    {/* Watermark Overlay */}
                    {watermarkUrl && (
                        <img
                            src={watermarkUrl}
                            className={`inventory-cell__watermark ${isLegacyWatermark ? 'inventory-cell__watermark--legacy' : 'inventory-cell__watermark--featured'}`}
                            alt=""
                        />
                    )}

                    {/* Enhancement Tier Stars - Weapons OR Non-Exotic Armor */}
                    {((def?.itemType === 3) || (def?.itemType === 2 && def?.inventory?.tierType !== 6)) && (
                        <TierBadge tier={instance?.gearTier || 0} />
                    )}

                    {/* Crafted/Enhanced Overlay Icons - Bottom Left */}
                    {isWeapon && (isCrafted || isEnhanced) && (
                        <div className="inventory-cell__craft-status">
                            {isCrafted && (
                                <img
                                    src={getBungieUrl('/img/destiny_content/items/crafted-icon-overlay.png')}
                                    className="inventory-cell__crafted-icon"
                                    alt="Crafted"
                                    title="Crafted Weapon"
                                />
                            )}
                            {isEnhanced && (
                                <img
                                    src={getBungieUrl('/img/destiny_content/items/enhanced-item-overlay.png')}
                                    className="inventory-cell__enhanced-icon"
                                    alt="Enhanced"
                                    title="Enhanced Weapon"
                                />
                            )}
                        </div>
                    )}

                    {/* Mini Power Badge */}
                    {power && power > 0 && (
                        <div className="inventory-cell__badge">
                            {damageIconUrl && (
                                <img
                                    src={getBungieUrl(damageIconUrl)}
                                    alt={damageTypeName}
                                    className="inventory-cell__damage-icon"
                                />
                            )}
                            <span className="inventory-cell__power">{power}</span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
