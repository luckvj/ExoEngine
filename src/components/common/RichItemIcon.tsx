import { useMemo } from 'react';
import { manifestService } from '../../services/bungie/manifest.service';
import { getBungieUrl } from '../../utils/url-helper';
import { isLegacyVersion } from '../../utils/season-utils';
import { TierBadge } from '../builder/TierBadge';
import './RichItemIcon.css';

interface RichItemIconProps {
    hash: number;
    instance?: any; // Partial instance data (power, state, etc)
    onClick?: () => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    className?: string;
}

export function RichItemIcon({ hash, instance, onClick, onMouseEnter, onMouseLeave, className }: RichItemIconProps) {
    const def = useMemo(() => manifestService.getItem(hash), [hash]);

    if (!def) return <div className="rich-item-icon rich-item-icon--empty" />;

    const iconUrl = def.displayProperties?.icon ? getBungieUrl(def.displayProperties.icon) : '';
    const tierType = def.inventory?.tierType || 0;
    const tierClass = tierType === 6 ? 'exotic' : tierType === 5 ? 'legendary' : tierType === 4 ? 'rare' : 'common';

    // API Banners
    const secondarySpecialUrl = getBungieUrl(def.secondarySpecial);
    const secondaryIconUrl = getBungieUrl(def.secondaryIcon);
    const secondaryOverlayUrl = getBungieUrl(def.secondaryOverlay);

    // Watermark
    const standardWatermark = def.iconWatermark;
    const featuredWatermark = def.iconWatermarkFeatured;
    const isLegacyWatermark = (!featuredWatermark && !!standardWatermark) || isLegacyVersion(def.quality?.currentVersion);
    const watermarkUrl = getBungieUrl(featuredWatermark || standardWatermark);

    // States
    const isMasterwork = !!(instance?.state && (instance.state & 4));
    const isCrafted = !!(instance?.state && (instance.state & 8));
    const isEnhanced = !!(isCrafted && instance?.gearTier && instance.gearTier >= 2);
    const isWeapon = def.itemType === 3;

    return (
        <div
            className={`rich-item-icon rich-item-icon--${tierClass} ${isMasterwork ? 'rich-item-icon--masterwork' : ''} ${className || ''}`}
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {/* Background Banners */}
            {(secondaryIconUrl || secondarySpecialUrl || secondaryOverlayUrl) && (
                <div className="rich-item-icon__banner">
                    {secondaryIconUrl && <img src={secondaryIconUrl} className="rich-item-icon__banner-layer" alt="" style={{ zIndex: 1 }} />}
                    {secondarySpecialUrl && <img src={secondarySpecialUrl} className="rich-item-icon__banner-layer" alt="" style={{ zIndex: 2 }} />}
                    {secondaryOverlayUrl && <img src={secondaryOverlayUrl} className="rich-item-icon__banner-layer" alt="" style={{ zIndex: 3 }} />}
                </div>
            )}

            {/* Main Icon */}
            <div className="rich-item-icon__main">
                <img src={iconUrl} alt={def.displayProperties?.name} className="rich-item-icon__img" />

                {/* Watermark */}
                {watermarkUrl && (
                    <img
                        src={watermarkUrl}
                        className={`rich-item-icon__watermark ${isLegacyWatermark ? 'rich-item-icon__watermark--legacy' : 'rich-item-icon__watermark--featured'}`}
                        alt=""
                    />
                )}

                {/* Enhancement Stars */}
                {((def.itemType === 3) || (def.itemType === 2 && tierType !== 6)) && (
                    <TierBadge tier={instance?.gearTier || 0} />
                )}

                {/* Crafted/Enhanced Icons */}
                {isWeapon && (isCrafted || isEnhanced) && (
                    <div className="rich-item-icon__status">
                        {isCrafted && <img src={getBungieUrl('/img/destiny_content/items/crafted-icon-overlay.png')} alt="Crafted" />}
                        {isEnhanced && <img src={getBungieUrl('/img/destiny_content/items/enhanced-item-overlay.png')} alt="Enhanced" />}
                    </div>
                )}
            </div>

            {/* Power Level */}
            {instance?.power > 0 && (
                <div className="rich-item-icon__power">
                    <span className="rich-item-icon__power-value">{instance.power}</span>
                </div>
            )}
        </div>
    );
}
