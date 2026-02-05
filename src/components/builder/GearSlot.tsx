import type { DestinyItem, ItemInstance, ItemDefinition } from '../../types';
import { manifestService } from '../../services/bungie/manifest.service';
import { getTierClass } from '../../utils/character-helpers';
import { getBungieUrl } from '../../utils/url-helper';
import { isLegacyVersion } from '../../utils/season-utils';
import { TierBadge } from './TierBadge';
import { useTooltip } from './TooltipManager';
import { useProfileStore } from '../../store';
import '../../styles/TransmatEffect.css';
import './GearSlot.css';

type SlotType = 'kinetic' | 'energy' | 'power' | 'helmet' | 'gauntlets' | 'chest' | 'leg' | 'class' | 'ghost' | 'emblem' | 'subclass';

interface GearSlotProps {
    type: SlotType;
    item?: DestinyItem;
    itemInstance?: ItemInstance;
    onSelect?: () => void;
    label?: string;
}

// Damage type names
const DAMAGE_TYPE_NAMES: Record<number, string> = {
    1: 'kinetic',
    2: 'arc',
    3: 'solar',
    4: 'void',
    6: 'stasis',
    7: 'strand',
};

export function GearSlot({ type, item, itemInstance, onSelect, label }: GearSlotProps) {
    const { showTooltip, hideTooltip } = useTooltip();

    const def: ItemDefinition | undefined = item ? manifestService.getItem(item.itemHash) : undefined;
    const iconUrl = def?.displayProperties.icon ? getBungieUrl(def.displayProperties.icon) : undefined;
    const tierClass = item ? getTierClass(item) : '';
    const power = itemInstance?.power;
    const damageType = itemInstance?.damageType || def?.defaultDamageType;

    // Get element icon from manifest
    const damageTypeName = damageType ? DAMAGE_TYPE_NAMES[damageType] : undefined;
    const damageIconUrl = damageTypeName ? manifestService.getDamageTypeIcon(damageTypeName as any) : undefined;

    // API Banners - Robust URL construction
    const secondarySpecialUrl = getBungieUrl(def?.secondarySpecial);
    const secondaryIconUrl = getBungieUrl(def?.secondaryIcon);
    const secondaryOverlayUrl = getBungieUrl(def?.secondaryOverlay);

    // Watermark Logic - Enhanced Legacy Detection
    // Force legacy style for older seasons even if they have a "featured" property in manifest
    // This fixes issues with Red War exotics (like Winter's Guile) appearing as "new"
    const standardWatermark = def?.iconWatermark;
    const featuredWatermark = def?.iconWatermarkFeatured;

    // Check if it's a legacy item based on the watermark hash
    // We assume anything with a standard watermark but NO featured watermark is legacy.
    // We ALSO assume that if it's a Red War/Osiris/Warmind/Forsaken/Shadowkeep item, it should likely stay legacy style.
    // However, simpler is often better: if it has a standard watermark and we want to prioritize it for old items...

    // Logic: Use featured if available, UNLESS it's a known legacy exotic that renders better with the old overlay.
    // The most robust check for "Winter's Guile styling" is simply: does it look like a legacy watermark?
    // Using the previous "isOldItem" check relative to "shelved" was decent but incomplete.
    // Let's rely on the watermark itself.

    const isLegacyWatermark = (!featuredWatermark && !!standardWatermark) || isLegacyVersion(def?.quality?.currentVersion);
    const watermarkUrl = getBungieUrl(featuredWatermark || standardWatermark);

    // Border Logic
    const isMasterwork = !!(item?.state && (item.state & 4));
    const isCrafted = !!(item?.state && (item.state & 8));
    const isWeapon = def?.itemType === 3;

    // Enhanced weapon check (weapons with enhanced perks) - ONLY for crafted weapons
    const isEnhanced = !!(isCrafted && itemInstance?.gearTier && itemInstance.gearTier >= 2);

    const { activeTransfers, successfulTransfers } = useProfileStore();
    const instanceId = item?.itemInstanceId;
    const isTransferring = instanceId ? activeTransfers.has(instanceId) : false;
    const isSuccess = instanceId ? successfulTransfers.has(instanceId) : false;

    return (
        <div
            className={`gear-slot-container gear-slot ${isTransferring ? 'transfer-active' : ''} ${isSuccess ? 'transfer-success' : ''}`}
            onMouseEnter={() => item && showTooltip(item, itemInstance)}
            onMouseLeave={hideTooltip}
            data-item-id={item?.itemInstanceId || item?.itemHash.toString()}
            data-item-hash={item?.itemHash}
        >
            <button
                className={`gear-slot-button ${item ? `gear-slot--${tierClass}` : 'gear-slot--empty'} ${isMasterwork ? 'gear-slot--masterwork' : ''} ${isWeapon ? 'gear-slot--weapon' : ''}`}
                onClick={onSelect}
                aria-label={label || def?.displayProperties.name || `Select ${type}`}
            >
                {/* Rarity Tier Background Overlay */}
                {item && tierClass && (
                    <>
                        <div className="transmat-overlay" />
                        <div className={`gear-slot__tier gear-slot__tier--${tierClass}`} />
                    </>
                )}

                {/* API Banners (Emblem/Armory Icons) */}
                {/* We prioritize the API assets. The container is z-index 1 (behind icon) */}
                {item && (secondaryIconUrl || secondarySpecialUrl || secondaryOverlayUrl) && (
                    <div className="gear-slot__api-banner">
                        {/* 1. Base Banner (secondaryIcon) - renders if available */}
                        {secondaryIconUrl && (
                            <img src={secondaryIconUrl} className="gear-slot__banner-img" alt="" style={{ zIndex: 1 }} />
                        )}

                        {/* 2. Special Pattern (secondarySpecial) - crucial for "Red Death" / "The Call" looks */}
                        {secondarySpecialUrl && (
                            <img
                                src={secondarySpecialUrl}
                                className="gear-slot__banner-img gear-slot__banner-img--special"
                                alt=""
                                style={{ zIndex: 2 }}
                            />
                        )}

                        {/* 3. Overlay/Border (secondaryOverlay) - top most detail layer */}
                        {secondaryOverlayUrl && (
                            <img src={secondaryOverlayUrl} className="gear-slot__banner-img" alt="" style={{ zIndex: 3 }} />
                        )}
                    </div>
                )}

                {/* Item icon */}
                <div className="gear-slot__icon-wrap">
                    {iconUrl ? (
                        <>
                            <img
                                src={iconUrl}
                                alt={def?.displayProperties.name || ''}
                                className="gear-slot__icon"
                                loading="lazy"
                            />
                            {/* Watermark Overlay */}
                            {watermarkUrl && (
                                <img
                                    src={watermarkUrl}
                                    className={`gear-slot__watermark ${isLegacyWatermark ? 'gear-slot__watermark--legacy' : 'gear-slot__watermark--featured'}`}
                                    alt=""
                                />
                            )}
                        </>
                    ) : (
                        <div className="gear-slot__placeholder" />
                    )}

                    {/* Enhancement Tier Stars - Weapons OR Non-Exotic Armor */}
                    {((def?.itemType === 3) || (def?.itemType === 2 && def?.inventory?.tierType !== 6)) && (
                        <TierBadge tier={itemInstance?.gearTier || 0} />
                    )}

                    {/* Crafted/Enhanced Overlay Icons - Bottom Left */}
                    {isWeapon && (isCrafted || isEnhanced) && (
                        <div className="gear-slot__craft-status">
                            {isCrafted && (
                                <img
                                    src={getBungieUrl('/img/destiny_content/items/crafted-icon-overlay.png')}
                                    className="gear-slot__crafted-icon"
                                    alt="Crafted"
                                    title="Crafted Weapon"
                                />
                            )}
                            {isEnhanced && (
                                <img
                                    src={getBungieUrl('/img/destiny_content/items/enhanced-item-overlay.png')}
                                    className="gear-slot__enhanced-icon"
                                    alt="Enhanced"
                                    title="Enhanced Weapon"
                                />
                            )}
                        </div>
                    )}
                </div>

                {/* Power level badge */}
                {power != null && power > 0 && (
                    <div className="gear-slot__light">
                        {damageIconUrl && (
                            <img
                                src={getBungieUrl(damageIconUrl)}
                                alt={damageTypeName}
                                className="gear-slot__damage-icon"
                            />
                        )}
                        <span className="gear-slot__power-value">{power}</span>
                    </div>
                )}
            </button>
        </div >
    );
}
