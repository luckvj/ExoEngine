import { useEffect, useRef, useState } from 'react';
import { getBungieUrl } from '../../utils/url-helper';
import { RichTooltip } from './RichTooltip';
import type { DestinyItem } from '../../types';
import './AbilityPicker.css';

export interface AbilityPickerItem {
    hash: number;
    name: string;
    icon: string;
}

interface AbilityPickerProps {
    items: AbilityPickerItem[];
    columns: number;
    onSelect: (hash: number) => void;
    onClose: () => void;
    element?: string;
    equippedHash?: number;
    style?: React.CSSProperties;
    type?: 'diamond' | 'square' | 'round';
}

/** Create a minimal DestinyItem for RichTooltip */
function makePickerItem(hash: number): DestinyItem {
    return {
        itemHash: hash,
        itemInstanceId: undefined,
        quantity: 1,
        bindStatus: 0,
        location: 0,
        bucketHash: 0,
        transferStatus: 0,
        lockable: false,
        state: 0,
    };
}

export function AbilityPicker({ items, columns, onSelect, onClose, element = 'void', equippedHash, style, type = 'square' }: AbilityPickerProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [hoveredHash, setHoveredHash] = useState<number | null>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        };
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        // Delay adding click listener to avoid immediately closing from the click that opened picker
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 50);
        document.addEventListener('keydown', handleEscape);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    return (
        <div
            className={`ability-picker element-${element} ability-picker--${type}`}
            ref={ref}
            style={style}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div
                className="ability-picker__grid"
                style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
            >
                {items.map((item, index) => {
                    const iconUrl = item.icon?.startsWith('/')
                        ? getBungieUrl(item.icon)
                        : item.icon;
                    const isEquipped = item.hash === equippedHash;
                    const isHovered = hoveredHash === item.hash;

                    return (
                        <div
                            key={item.hash}
                            className="ability-picker__cell-wrapper"
                            style={{ '--delay': `${index * 0.02}s` } as any}
                            onMouseEnter={() => setHoveredHash(item.hash)}
                            onMouseLeave={() => setHoveredHash(null)}
                        >
                            <button
                                className={`ability-picker__cell${isEquipped ? ' ability-picker__cell--equipped' : ''}`}
                                onClick={() => onSelect(item.hash)}
                            >
                                {iconUrl && (
                                    <img
                                        src={iconUrl}
                                        alt={item.name}
                                        className="ability-picker__icon"
                                    />
                                )}
                            </button>
                            {isHovered && (
                                <RichTooltip item={makePickerItem(item.hash)} hideStats={true} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
