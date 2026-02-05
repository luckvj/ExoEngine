import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useProfileStore } from '../../store';
import { manifestService } from '../../services/bungie/manifest.service';
import { getBungieUrl } from '../../utils/url-helper';
import './TransferMenu.css';

interface TransferMenuProps {
    targetElement: HTMLElement | null;
    onTransfer: (characterId: string) => void;
    onEquip: (characterId: string) => void;
    onClose: () => void;
    showVault?: boolean;
    itemInstanceId?: string;
    itemClass?: number;
}

const CLASS_NAMES: Record<number, string> = {
    0: 'Titan',
    1: 'Hunter',
    2: 'Warlock',
};

export function TransferMenu({ targetElement, onTransfer, onEquip, onClose, showVault = true, itemInstanceId, itemClass }: TransferMenuProps) {
    const { characters, selectedCharacterId, characterEquipment } = useProfileStore();
    const [hoveredCharacterId, setHoveredCharacterId] = useState<string | null>(null);
    const [tooltipText, setTooltipText] = useState<string | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

    if (!targetElement) {
        return null;
    }

    const rect = targetElement.getBoundingClientRect();

    // Position menu to the top-right of the tooltip
    const menuStyle: React.CSSProperties = {
        position: 'fixed',
        top: `${rect.top}px`,
        left: `${rect.right + 16}px`, // 16px gap from tooltip
        zIndex: 100000,
    };

    const handleCharacterClick = (characterId: string) => {
        onTransfer(characterId);
        onClose();
    };

    const handleMouseEnterCharacter = (characterId: string, text: string, e: React.MouseEvent) => {
        setHoveredCharacterId(characterId);
        setTooltipText(text);
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setTooltipPosition({
            x: rect.left + rect.width / 2,
            y: rect.bottom + 8
        });
    };

    const handleMouseLeaveCharacter = () => {
        setHoveredCharacterId(null);
        setTooltipText(null);
        setTooltipPosition(null);
    };


    return createPortal(
        <div className="transfer-menu-overlay">
            <div
                className="transfer-menu-container"
                style={menuStyle}
            >
                {/* Connecting Line */}
                <svg
                    className="transfer-menu-connector"
                    width="16"
                    height="100%"
                    style={{
                        position: 'absolute',
                        left: '-16px',
                        top: 0,
                        pointerEvents: 'none',
                    }}
                >
                    <line
                        x1="0"
                        y1="24"
                        x2="16"
                        y2="24"
                        stroke="rgba(255, 255, 255, 0.2)"
                        strokeWidth="1"
                    />
                </svg>

                <div className="transfer-menu-wrapper">
                    <div className="transfer-menu-header">
                        <h3>SEND TO</h3>
                    </div>

                    <div className="transfer-menu-body">
                        {characters.map((character) => {
                            const isSelected = character.characterId === selectedCharacterId;
                            const isHovered = hoveredCharacterId === `transfer-${character.characterId}`;
                            const className = CLASS_NAMES[character.classType] || 'Guardian';
                            const tooltipLabel = `${className} - Power ${character.light || '---'}${isSelected ? ' (Current)' : ''}`;

                            return (
                                <div
                                    key={character.characterId}
                                    className={`transfer-menu-character ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
                                    onClick={() => handleCharacterClick(character.characterId)}
                                    onMouseEnter={(e) => handleMouseEnterCharacter(`transfer-${character.characterId}`, tooltipLabel, e)}
                                    onMouseLeave={handleMouseLeaveCharacter}
                                >
                                    <div className={`transfer-menu-character-icon transfer-menu-character-icon--${className.toLowerCase()}`}>
                                        <img
                                            src={getBungieUrl(manifestService.getClassIcon(character.classType))}
                                            alt={className}
                                        />
                                    </div>
                                </div>
                            );
                        })}

                        {showVault && (
                            <div
                                className={`transfer-menu-character ${hoveredCharacterId === 'vault' ? 'hovered' : ''}`}
                                onClick={() => handleCharacterClick('vault')}
                                onMouseEnter={(e) => handleMouseEnterCharacter('vault', 'Vault', e)}
                                onMouseLeave={handleMouseLeaveCharacter}
                            >
                                <div className="transfer-menu-character-icon transfer-menu-character-icon--vault">
                                    V
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="transfer-menu-header" style={{ marginTop: '12px' }}>
                        <h3>EQUIP</h3>
                    </div>

                    <div className="transfer-menu-body">
                        {characters.filter(c => itemClass === 3 || itemClass === undefined || c.classType === itemClass).map((character) => {
                            const isSelected = character.characterId === selectedCharacterId;
                            const isEquipped = itemInstanceId ? characterEquipment[character.characterId]?.some(i => i.itemInstanceId === itemInstanceId) : false;
                            const isHovered = hoveredCharacterId === `equip-${character.characterId}`;
                            const className = CLASS_NAMES[character.classType] || 'Guardian';
                            const tooltipLabel = isEquipped ? `${className} - Already Equipped` : `Equip on ${className}`;

                            return (
                                <div
                                    key={character.characterId}
                                    className={`transfer-menu-character ${isSelected ? 'selected' : ''} ${isEquipped ? 'active' : ''} ${isHovered ? 'hovered' : ''}`}
                                    onClick={() => {
                                        if (!isEquipped) {
                                            onEquip(character.characterId);
                                        }
                                        onClose();
                                    }}
                                    onMouseEnter={(e) => handleMouseEnterCharacter(`equip-${character.characterId}`, tooltipLabel, e)}
                                    onMouseLeave={handleMouseLeaveCharacter}
                                >
                                    <div className={`transfer-menu-character-icon transfer-menu-character-icon--${className.toLowerCase()}`}>
                                        <img
                                            src={getBungieUrl(manifestService.getClassIcon(character.classType))}
                                            alt={className}
                                        />
                                    </div>
                                    {isEquipped && <div className="transfer-menu-equipped-indicator" title="Already Equipped">E</div>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Plain text tooltip */}
            {tooltipText && tooltipPosition && (
                <div
                    className="transfer-menu-plain-tooltip"
                    style={{
                        position: 'fixed',
                        left: `${tooltipPosition.x}px`,
                        top: `${tooltipPosition.y}px`,
                        transform: 'translateX(-50%)',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 400,
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        zIndex: 100001,
                        textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)'
                    }}
                >
                    {tooltipText}
                </div>
            )}
        </div>,
        document.body
    );
}
