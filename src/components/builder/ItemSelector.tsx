import { useState, useEffect } from 'react';
import type { DestinyInventoryItemDefinition } from 'bungie-api-ts/destiny2';
import { BUNGIE_CONFIG } from '../../config/bungie.config';
import './ItemSelector.css';

interface ItemSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (item: DestinyInventoryItemDefinition) => void;
    slotType: string; // 'kinetic', 'energy', 'helmet', etc.
    items: DestinyInventoryItemDefinition[]; // Passed from store or queries
}

export function ItemSelector({ isOpen, onClose, onSelect, slotType, items }: ItemSelectorProps) {
    const [searchTerm, setSearchTerm] = useState('');

    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const filteredItems = items.filter(item =>
        item.displayProperties.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="item-selector-overlay animate-fade-in" onClick={onClose}>
            <div className="item-selector glass-panel" onClick={e => e.stopPropagation()}>
                <div className="item-selector__header">
                    <h2>Select {slotType}</h2>
                    <button className="btn-close" onClick={onClose}>×</button>
                </div>

                <div className="item-selector__search">
                    <input
                        id="item-search-input"
                        name="item-search-input"
                        type="text"
                        placeholder="Search items..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className="item-selector__grid">
                    {filteredItems.map(item => (
                        <button
                            key={item.hash}
                            className="item-tile"
                            onClick={() => {
                                onSelect(item);
                                onClose();
                            }}
                        >
                            <img
                                src={`${BUNGIE_CONFIG.bungieNetOrigin}${item.displayProperties.icon}`}
                                alt=""
                                className="item-tile__icon"
                                loading="lazy"
                            />
                            <div className="item-tile__overlay">
                                <span className="item-tile__name">{item.displayProperties.name}</span>
                            </div>
                        </button>
                    ))}

                    {filteredItems.length === 0 && (
                        <div className="item-selector__empty">
                            No items found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
