import { useEffect, useState } from 'react';
import { manifestService } from '../../services/bungie/manifest.service';
import { useManifestStore } from '../../store';
import { useInventory } from '../../hooks/useInventory';
import type { SynergyDefinition } from '../../types';
import { Expansion } from '../../types';
import { SubclassNode } from '../builder/SubclassNode';
import { RichTooltip } from '../builder/RichTooltip';
import './SynergyCard.css';

// Helper to get expansion display name
const getExpansionName = (expansion?: Expansion): string | null => {
    if (!expansion || expansion === Expansion.BaseGame) return null;
    const names: Record<string, string> = {
        [Expansion.BaseGame]: 'Base Game',
        [Expansion.Forsaken]: 'Forsaken',
        [Expansion.Shadowkeep]: 'Shadowkeep',
        [Expansion.BeyondLight]: 'Beyond Light',
        [Expansion.WitchQueen]: 'Witch Queen',
        [Expansion.Lightfall]: 'Lightfall',
        [Expansion.FinalShape]: 'Final Shape',
        [Expansion.Anniversary30th]: '30th Anniv.',
    };
    return names[expansion] || null;
};

interface SynergyCardProps {
    synergy: SynergyDefinition;
    isActive?: boolean;
    onEquip?: (synergy: SynergyDefinition) => void;
    onSynergize?: (synergy: SynergyDefinition) => void;
    isEquipping?: boolean;
    equippingProgress?: number;
    equippingStatus?: string;
}

export function SynergyCard({ synergy, isActive = false, onEquip, onSynergize, isEquipping = false }: SynergyCardProps) {
    const classNames = ['Titan', 'Hunter', 'Warlock'];
    const [screenshot, setScreenshot] = useState<string | null>(null);
    const [primaryIcon, setPrimaryIcon] = useState<string | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isLoreOpen, setIsLoreOpen] = useState(false);
    const [isUiVisible, setIsUiVisible] = useState(true);
    const [hoveredItemHash, setHoveredItemHash] = useState<number | null>(null);

    // Keyboard Shortcuts
    useEffect(() => {
        if (!isDetailsOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Control') {
                setIsUiVisible(v => !v);
            }
            if (e.key.toLowerCase() === 'a') {
                setIsLoreOpen(v => !v);
            }
            if (e.key.toLowerCase() === 'f') {
                if (isFullyOwned && !isEquipping) {
                    onEquip?.(synergy);
                }
            }
            if (e.key === 'Escape') {
                setIsDetailsOpen(false);
            }
        };

        const handleRightClick = (e: MouseEvent) => {
            e.preventDefault();
            if (!isEquipping) {
                onSynergize?.(synergy);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        // Only attach right click listener to window if details are open, blocking default context menu
        window.addEventListener('contextmenu', handleRightClick);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('contextmenu', handleRightClick);
        };
    }, [isDetailsOpen]);
    const { isLoaded: manifestLoaded } = useManifestStore();
    const { isOwner } = useInventory();

    // Check ownership
    const hasExoticArmor = isOwner(synergy.exoticArmor.hash);
    const hasExoticWeapon = synergy.exoticWeapon ? isOwner(synergy.exoticWeapon.hash) : true;
    const isFullyOwned = hasExoticArmor && hasExoticWeapon;

    // State for expanded build details
    const [buildIcons, setBuildIcons] = useState<{
        super?: string;
        grenade?: string;
        melee?: string;
        classAbility?: string;
        jump?: string;
        transcendence?: string;
        aspects: string[];
        fragments: string[];
        weapons: string[];
        armor?: string;
    }>({ aspects: [], fragments: [], weapons: [] });

    useEffect(() => {
        if (!manifestLoaded) return;

        const mainItemHash = synergy.exoticWeapon?.hash || synergy.exoticArmor.hash;

        async function loadImages() {
            // 1. Main Screenshot (Exotic)
            const item = manifestService.getItem(mainItemHash);
            if (item?.screenshot) {
                setScreenshot(item.screenshot);
            }
            setPrimaryIcon(manifestService.getIcon(mainItemHash) || null);

            // 2. Build Components
            const newIcons: typeof buildIcons = { aspects: [], fragments: [], weapons: [] };

            // Subclass
            if (synergy.subclassNode.superHash) newIcons.super = manifestService.getIcon(synergy.subclassNode.superHash);
            if (synergy.subclassNode.grenadeHash) newIcons.grenade = manifestService.getIcon(synergy.subclassNode.grenadeHash);
            if (synergy.subclassNode.meleeHash) newIcons.melee = manifestService.getIcon(synergy.subclassNode.meleeHash);
            if (synergy.subclassNode.classAbilityHash) newIcons.classAbility = manifestService.getIcon(synergy.subclassNode.classAbilityHash);
            if (synergy.subclassNode.jumpHash) newIcons.jump = manifestService.getIcon(synergy.subclassNode.jumpHash);

            // Transcendence (Prismatic only)
            if (synergy.element.toLowerCase() === 'prismatic') {
                newIcons.transcendence = manifestService.getIcon(3976332159); // Transcendence Icon
            }

            // Aspects & Fragments
            synergy.subclassNode.aspectHashes?.forEach(h => {
                const icon = manifestService.getIcon(h);
                if (icon) newIcons.aspects.push(icon);
            });
            synergy.subclassNode.fragmentHashes?.forEach(h => {
                const icon = manifestService.getIcon(h);
                if (icon) newIcons.fragments.push(icon);
            });

            // Weapons
            if (synergy.exoticWeapon) {
                const icon = manifestService.getIcon(synergy.exoticWeapon.hash);
                if (icon) newIcons.weapons.push(icon);
            }
            synergy.recommendedWeapons?.forEach(w => {
                const icon = manifestService.getIcon(w.hash);
                if (icon) newIcons.weapons.push(icon);
            });

            // Armor
            const armorIcon = manifestService.getIcon(synergy.exoticArmor.hash);
            if (armorIcon) newIcons.armor = armorIcon;

            setBuildIcons(newIcons);
        }

        loadImages();

    }, [synergy, manifestLoaded]);

    const expansionName = getExpansionName(synergy.requiredExpansion);

    // Mouse Parallax Logic
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDetailsOpen) return;
        const { clientX, clientY } = e;
        const moveX = (clientX - window.innerWidth / 2) / 50;
        const moveY = (clientY - window.innerHeight / 2) / 50;
        setMousePos({ x: moveX, y: moveY });
    };

    return (
        <>
            <div
                className={`synergy-card synergy-card--horizontal synergy-card--${synergy.element.toLowerCase()} ${isActive ? 'synergy-card--active' : ''}`}
                onClick={() => setIsDetailsOpen(true)}
            >
                {/* BACKGROUND: Exotic Screenshot */}
                <div className="synergy-card__bg">
                    {screenshot ? (
                        <img src={screenshot} alt="" className="synergy-card__screenshot" />
                    ) : (
                        <div className="synergy-card__pattern" style={{ backgroundImage: `url(${primaryIcon})` }} />
                    )}
                    <div className="synergy-card__vignette" />
                    <div className="synergy-card__glow" />
                </div>

                {/* CONTENT: Super Icon & Title */}
                <div className="synergy-card__content">
                    {buildIcons.super && (
                        <div className="synergy-card__super-icon">
                            <img src={buildIcons.super} alt="Super" />
                            <span className={`synergy-element-badge element-${synergy.element.toLowerCase()}`} />
                        </div>
                    )}
                    <div className="synergy-card__info">
                        <h3 className="synergy-card__title">{synergy.name}</h3>
                        <span className="synergy-card__subtitle">{classNames[synergy.guardianClass]} // {synergy.playstyle}</span>
                    </div>
                </div>

                {/* NODES: Horizontal Rows */}
                <div className="synergy-card__nodes">
                    {buildIcons.classAbility && (
                        <SubclassNode type="square" size="small" icon={buildIcons.classAbility} element={synergy.element.toLowerCase() as any} status="active" />
                    )}
                    {buildIcons.jump && (
                        <SubclassNode type="square" size="small" icon={buildIcons.jump} element={synergy.element.toLowerCase() as any} status="active" />
                    )}
                    {buildIcons.grenade && (
                        <SubclassNode type="square" size="small" icon={buildIcons.grenade} element={synergy.element.toLowerCase() as any} status="active" />
                    )}
                    {buildIcons.melee && (
                        <SubclassNode type="square" size="small" icon={buildIcons.melee} element={synergy.element.toLowerCase() as any} status="active" />
                    )}
                    {buildIcons.aspects.map((icon, i) => (
                        <SubclassNode key={i} type="square" size="small" icon={icon} element={synergy.element.toLowerCase() as any} status="active" />
                    ))}
                    <div className="fragment-row">
                        {buildIcons.fragments.slice(0, 4).map((icon, i) => (
                            <img key={i} src={icon} className="fragment-icon-tiny" alt="" />
                        ))}
                    </div>
                </div>

                {/* ACTIONS: Simplified on card */}
                <div className="synergy-card__actions">
                    <div className="synergy-card__exotics">
                        {buildIcons.weapons[0] && <img src={buildIcons.weapons[0]} className="exotic-icon-preview" title="Exotic Weapon" />}
                        {buildIcons.armor && <img src={buildIcons.armor} className="exotic-icon-preview" title="Exotic Armor" />}
                    </div>
                    {isEquipping && <div className="spinner-mini" />}
                </div>

                {expansionName && <div className="synergy-card__expansion-badge">{expansionName}</div>}
            </div>

            {/* FULL SCREEN SUBCLASS MENU OVERLAY */}
            {isDetailsOpen && (
                <div className={`synergy-details-overlay synergy-details-overlay--${synergy.element.toLowerCase()} ${!isUiVisible ? 'synergy-details--hidden' : ''}`} onMouseMove={handleMouseMove}>
                    <div className="synergy-details__bg">
                        {screenshot && (
                            <img
                                src={screenshot}
                                className="synergy-details__screenshot"
                                style={{
                                    transform: `scale(1.1) translate(${mousePos.x}px, ${mousePos.y}px)`,
                                    transition: 'transform 0.1s ease-out'
                                }}
                                alt=""
                            />
                        )}
                        <div className="synergy-details__vignette" />
                    </div>

                    <div className="synergy-details__header">
                        <div className="synergy-details__title-group">
                            <h1 className="synergy-details__name">{synergy.name}</h1>
                        </div>
                    </div>

                    <div className="synergy-details__main">
                        {/* LEFT: Super */}
                        <div className="synergy-details__left">
                            {buildIcons.super && (
                                <div className="super-node-large"
                                    onMouseEnter={() => setHoveredItemHash(synergy.subclassNode.superHash || null)}
                                    onMouseLeave={() => setHoveredItemHash(null)}
                                >
                                    <img src={buildIcons.super} alt="Super Icon" />
                                </div>
                            )}
                        </div>

                        {/* RIGHT: Grid Rows */}
                        <div className="synergy-details__right-grid">
                            {/* Abilites Section */}
                            <div className="node-section section-abilities">
                                <div className="node-section-header">Abilities</div>
                                <div className="node-section-content">
                                    {synergy.element.toLowerCase() === 'prismatic' && (
                                        <SubclassNode
                                            type="square"
                                            size="normal"
                                            icon={buildIcons.transcendence}
                                            element="prismatic"
                                            status="active"
                                            onMouseEnter={() => setHoveredItemHash(3976332159)}
                                            onMouseLeave={() => setHoveredItemHash(null)}
                                        />
                                    )}
                                    {/* Class Ability */}
                                    {buildIcons.classAbility && (
                                        <SubclassNode
                                            type="square"
                                            size="normal"
                                            icon={buildIcons.classAbility}
                                            element={synergy.element.toLowerCase() as any}
                                            status="active"
                                            onMouseEnter={() => setHoveredItemHash(synergy.subclassNode.classAbilityHash || null)}
                                            onMouseLeave={() => setHoveredItemHash(null)}
                                        />
                                    )}
                                    {/* Jump */}
                                    {buildIcons.jump && (
                                        <SubclassNode
                                            type="square"
                                            size="normal"
                                            icon={buildIcons.jump}
                                            element={synergy.element.toLowerCase() as any}
                                            status="active"
                                            onMouseEnter={() => setHoveredItemHash(synergy.subclassNode.jumpHash || null)}
                                            onMouseLeave={() => setHoveredItemHash(null)}
                                        />
                                    )}
                                    {/* Grenade */}
                                    {buildIcons.grenade && (
                                        <SubclassNode
                                            type="square"
                                            size="normal"
                                            icon={buildIcons.grenade}
                                            element={synergy.element.toLowerCase() as any}
                                            status="active"
                                            onMouseEnter={() => setHoveredItemHash(synergy.subclassNode.grenadeHash || null)}
                                            onMouseLeave={() => setHoveredItemHash(null)}
                                        />
                                    )}
                                    {/* Melee */}
                                    {buildIcons.melee && (
                                        <SubclassNode
                                            type="square"
                                            size="normal"
                                            icon={buildIcons.melee}
                                            element={synergy.element.toLowerCase() as any}
                                            status="active"
                                            onMouseEnter={() => setHoveredItemHash(synergy.subclassNode.meleeHash || null)}
                                            onMouseLeave={() => setHoveredItemHash(null)}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Aspects Section */}
                            <div className="node-section section-aspects">
                                <div className="node-section-header">Aspects</div>
                                <div className="node-section-content">
                                    {buildIcons.aspects.map((icon, i) => (
                                        <SubclassNode
                                            key={i}
                                            type="square"
                                            size="normal"
                                            icon={icon}
                                            element={synergy.element.toLowerCase() as any}
                                            status="active"
                                            onMouseEnter={() => setHoveredItemHash(synergy.subclassNode.aspectHashes?.[i] || null)}
                                            onMouseLeave={() => setHoveredItemHash(null)}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Fragments Section */}
                            <div className="node-section section-fragments">
                                <div className="node-section-header">Fragments</div>
                                <div className="synergy-details__fragments-grid">
                                    {buildIcons.fragments.map((icon, i) => (
                                        <SubclassNode
                                            key={i}
                                            type="square"
                                            size="small"
                                            icon={icon}
                                            element={synergy.element.toLowerCase() as any}
                                            status="active"
                                            onMouseEnter={() => setHoveredItemHash(synergy.subclassNode.fragmentHashes?.[i] || null)}
                                            onMouseLeave={() => setHoveredItemHash(null)}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="synergy-details__footer">
                        <div className="synergy-details__exotics-preview">
                            {synergy.exoticWeapon && buildIcons.weapons[0] && (
                                <div
                                    className="exotic-details-item"
                                    onMouseEnter={() => setHoveredItemHash(synergy.exoticWeapon?.hash || null)}
                                    onMouseLeave={() => setHoveredItemHash(null)}
                                >
                                    <img src={buildIcons.weapons[0]} alt="" />
                                    <div className="exotic-details-info">
                                        <span className="exotic-name">{synergy.exoticWeapon?.name}</span>
                                    </div>
                                </div>
                            )}
                            {buildIcons.armor && (
                                <div
                                    className="exotic-details-item"
                                    onMouseEnter={() => setHoveredItemHash(synergy.exoticArmor?.hash || null)}
                                    onMouseLeave={() => setHoveredItemHash(null)}
                                >
                                    <img src={buildIcons.armor} alt="" />
                                    <div className="exotic-details-info">
                                        <span className="exotic-name">{synergy.exoticArmor?.name}</span>
                                    </div>
                                </div>
                            )}
                        </div>


                    </div>

                    {/* Build Description Panel */}
                    <div className={`synergy-details__lore-panel ${isLoreOpen ? 'synergy-details__lore-panel--open' : ''}`}>
                        <div className="lore-panel__header">
                            <h2 className="lore-panel__title">{synergy.name}</h2>
                            <div className="lore-panel__subtitle">
                                {classNames[synergy.guardianClass]} // {synergy.playstyle}
                            </div>
                        </div>
                        <div className="lore-panel__content">
                            {synergy.loopDescription}
                        </div>
                    </div>

                    {/* Bottom Action Bar (D2 Key Prompt style) */}
                    <div className="synergy-details__footer-bar">
                        <div className="key-prompt" onClick={() => onEquip?.(synergy)}>
                            <span className="key-cap">F</span>
                            <span className="key-label">Equip Build</span>
                        </div>

                        <div className="key-prompt" onClick={() => setIsLoreOpen(!isLoreOpen)}>
                            <span className="key-cap">A</span>
                            <span className="key-label">{isLoreOpen ? 'Hide Strategy' : 'Show Strategy'}</span>
                        </div>
                        <div className="key-prompt" onClick={() => setIsUiVisible(!isUiVisible)}>
                            <span className="key-cap">Ctrl</span>
                            <span className="key-label">{isUiVisible ? 'Hide Menu' : 'Show Menu'}</span>
                        </div>
                        <div className="key-prompt" onClick={() => setIsDetailsOpen(false)}>
                            <span className="key-cap">Esc</span>
                            <span className="key-label">Dismiss</span>
                        </div>
                    </div>

                    {/* Rich Tooltip Portal */}
                    {hoveredItemHash && <RichTooltip item={{ hash: hoveredItemHash }} />}
                </div>
            )}
        </>
    );
}
