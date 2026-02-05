import { useEffect, useState } from 'react';
import { ElementType, GuardianClass, Expansion } from '../../types';
import { manifestService } from '../../services/bungie/manifest.service';
import { getBungieUrl } from '../../utils/url-helper';
import { useManifestStore } from '../../store';
import TitanLogo from '../../assets/logos/titan.png';
import HunterLogo from '../../assets/logos/hunter.png';
import WarlockLogo from '../../assets/logos/warlock.png';
import './QuestSidebar.css';

interface QuestSidebarProps {
    selectedElements: ElementType[];
    onToggleElement: (element: ElementType) => void;
    selectedClass: GuardianClass | 'all';
    onSelectClass: (guardianClass: GuardianClass | 'all') => void;
    selectedExpansions: Expansion[];
    onToggleExpansion: (expansion: Expansion) => void;
}

export function QuestSidebar({
    selectedElements = [],
    onToggleElement,
    selectedClass = 'all',
    onSelectClass,
    selectedExpansions = [],
    onToggleExpansion
}: QuestSidebarProps) {
    const [elementIcons, setElementIcons] = useState<Record<string, string>>({});
    const [expansionIcons, setExpansionIcons] = useState<Record<string, string>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const { isLoaded } = useManifestStore();

    // Define the order of items. 'all' is the top (Crown/Quest icon equivalent)
    const elementItems: (ElementType | 'all')[] = [
        'all',
        ElementType.Solar,
        ElementType.Void,
        ElementType.Arc,
        ElementType.Stasis,
        ElementType.Strand,
        ElementType.Prismatic
    ];

    const classItems: (GuardianClass)[] = [
        GuardianClass.Titan,
        GuardianClass.Hunter,
        GuardianClass.Warlock
    ];

    const expansionItems: Expansion[] = [
        Expansion.BaseGame,
        Expansion.Forsaken,
        Expansion.Shadowkeep,
        Expansion.BeyondLight,
        Expansion.Anniversary30th,
        Expansion.WitchQueen,
        Expansion.Lightfall,
        Expansion.FinalShape,
        Expansion.EdgeOfFate,
        Expansion.Renegade
    ];

    // Local state for class icons fetched from manifest
    const [classIcons, setClassIcons] = useState<Record<GuardianClass, string>>({
        [GuardianClass.Titan]: TitanLogo,
        [GuardianClass.Hunter]: HunterLogo,
        [GuardianClass.Warlock]: WarlockLogo
    });

    useEffect(() => {
        if (!isLoaded) return;

        // 1. Load Element Icons
        const kineticIcon = manifestService.getDamageTypeIcon('kinetic');
        const loadedIcons: Record<string, string> = {
            'all': kineticIcon || '/common/destiny2_content/icons/3385a924fd3ccb92c343ade19f19a370.png'  // Use kinetic damage type icon
        };
        elementItems.forEach(type => {
            if (type !== 'all') {
                // Special handling for Prismatic - use class-specific subclass icon
                if (type === ElementType.Prismatic) {
                    // Get the same prismatic subclass icon as shown in SubclassScreen
                    const allSubclasses = manifestService.getAllSubclassComponents();
                    const classTypeMap: Record<GuardianClass, number> = {
                        [GuardianClass.Titan]: 0,
                        [GuardianClass.Hunter]: 1,
                        [GuardianClass.Warlock]: 2
                    };

                    // Only use class-specific icon if a specific class is selected
                    if (selectedClass !== 'all' && classTypeMap[selectedClass] !== undefined) {
                        const targetClassType = classTypeMap[selectedClass];
                        const prismaticSubclass = allSubclasses.find(sub =>
                            sub.classType === targetClassType &&
                            sub.name.toLowerCase().includes('prismatic')
                        );

                        if (prismaticSubclass?.icon) {
                            loadedIcons[type] = prismaticSubclass.icon;
                        }
                    }

                    // If no icon found yet (no class selected or not found), use any prismatic as fallback
                    if (!loadedIcons[type]) {
                        const anyPrismatic = allSubclasses.find(sub => sub.name.toLowerCase().includes('prismatic'));
                        if (anyPrismatic?.icon) {
                            loadedIcons[type] = anyPrismatic.icon;
                        }
                    }
                } else {
                    const icon = manifestService.getDamageTypeIcon(type);
                    if (icon) loadedIcons[type] = icon;
                }
            }
        });
        setElementIcons(loadedIcons);


        // 2. Load Class Icons (Presentation Nodes)
        const newClassIcons = { ...classIcons };

        const fetchNodeIcon = (name: string, fallback: string) => {
            const node = manifestService.searchPresentationNodeByName(name, true);
            return node?.icon || fallback;
        };

        const titanIcon = fetchNodeIcon("Titan", TitanLogo);
        const hunterIcon = fetchNodeIcon("Hunter", HunterLogo);
        const warlockIcon = fetchNodeIcon("Warlock", WarlockLogo);

        if (titanIcon !== TitanLogo) newClassIcons[GuardianClass.Titan] = titanIcon;
        if (hunterIcon !== HunterLogo) newClassIcons[GuardianClass.Hunter] = hunterIcon;
        if (warlockIcon !== WarlockLogo) newClassIcons[GuardianClass.Warlock] = warlockIcon;

        setClassIcons(newClassIcons);


        // 3. Load Expansion Icons
        const loadedExpIcons: Record<string, string> = {};

        // Map Expansion -> Search query for Presentation Node or Record
        const expansionSearchMap: Record<string, { type: 'Node' | 'Record' | 'Item', query: string, exact?: boolean }> = {
            [Expansion.BaseGame]: { type: 'Node', query: 'The Red War' },
            [Expansion.Forsaken]: { type: 'Record', query: 'Destinations' },
            [Expansion.Shadowkeep]: { type: 'Node', query: 'Shadowkeep' },
            [Expansion.BeyondLight]: { type: 'Node', query: 'Beyond Light' },
            [Expansion.Anniversary30th]: { type: 'Node', query: '30th Anniversary' },
            [Expansion.WitchQueen]: { type: 'Node', query: 'The Witch Queen' },
            [Expansion.Lightfall]: { type: 'Node', query: 'Lightfall' },
            [Expansion.FinalShape]: { type: 'Item', query: 'Legacy: The Final Shape', exact: false },
            [Expansion.Renegade]: { type: 'Item', query: 'Renegade', exact: false },
            [Expansion.EdgeOfFate]: { type: 'Item', query: 'Edge of Fate', exact: false }
        };

        // Fallback: Hardcoded Hashes if search fails 
        const expansionHarcdoded: Record<string, { hash: number, type: 'Node' | 'Record' }> = {
            [Expansion.Forsaken]: { hash: 3076162311, type: 'Record' },
            [Expansion.Anniversary30th]: { hash: 2404612039, type: 'Record' },
        };

        // Priority: Use rootViewIcon paths for specific DLCs
        const expansionRootViewIcons: Record<string, string> = {
            [Expansion.Renegade]: '/common/destiny2_content/icons/843b1dfa55b92ccd8f8c6e9d9a0feec8.png',
            [Expansion.EdgeOfFate]: '/common/destiny2_content/icons/1c4e4d183392430e23dfae3f77569c86.png',
            [Expansion.FinalShape]: '/common/destiny2_content/icons/22d097b865f64884117ce6658e14a028.png',
            [Expansion.BaseGame]: '/common/destiny2_content/icons/9a4e146af8bf678a3fd1fb55d3424e36.png',
        };

        expansionItems.forEach(exp => {
            let iconUrl: string | undefined;

            // 0. Check for direct rootViewIcon path first (highest priority)
            if (expansionRootViewIcons[exp]) {
                iconUrl = expansionRootViewIcons[exp];
                loadedExpIcons[exp] = iconUrl;
                return; // Skip other lookups
            }

            const searchDef = expansionSearchMap[exp];

            // 1. Try Search Strategy
            if (searchDef) {
                const exact = searchDef.exact ?? false;

                if (searchDef.type === 'Node') {
                    const node = manifestService.searchPresentationNodeByName(searchDef.query, exact);
                    if (node?.icon) iconUrl = node.icon;
                } else if (searchDef.type === 'Record') {
                    const record = manifestService.searchRecordByName(searchDef.query, exact);
                    if (record?.icon) iconUrl = record.icon;
                } else if (searchDef.type === 'Item') {
                    const item = manifestService.searchItemByName(searchDef.query, exact);
                    if (item?.displayProperties?.icon) iconUrl = item.displayProperties.icon;
                }
            }

            // 2. Fallback to Hardcoded
            if (!iconUrl && expansionHarcdoded[exp]) {
                const def = expansionHarcdoded[exp];
                if (def.type === 'Node') {
                    const node = manifestService.getPresentationNode(def.hash);
                    if (node?.icon) iconUrl = node.icon;
                } else {
                    const record = manifestService.getRecord(def.hash);
                    if (record?.icon) iconUrl = record.icon;
                }
            }

            if (iconUrl) loadedExpIcons[exp] = iconUrl;
        });

        setExpansionIcons(loadedExpIcons);

    }, [isLoaded, selectedClass]); // Re-run when class changes to update prismatic icon

    const getClassLabel = (cls: GuardianClass) => {
        switch (cls) {
            case GuardianClass.Titan: return 'Titan';
            case GuardianClass.Hunter: return 'Hunter';
            case GuardianClass.Warlock: return 'Warlock';
            default: return '';
        }
    };

    const getClassIcon = (cls: GuardianClass) => {
        return classIcons[cls] || '';
    };

    return (
        <nav className="quest-sidebar">
            {/* Search Bar */}
            <div className="quest-sidebar__search-container">
                <input
                    id="quest-sidebar-search"
                    name="quest-sidebar-search"
                    type="text"
                    placeholder="Search synergies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="quest-sidebar__search"
                />
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
            </div>

            <div className="quest-sidebar__filters-row">
                {/* Class Filters (Left Column) */}
                <div className="quest-sidebar__group">
                    <span className="quest-sidebar__label">Class</span>
                    <div className="quest-sidebar__track quest-sidebar__track--classes">
                        {classItems.map((cls) => (
                            <button
                                key={cls}
                                className={`quest-sidebar__item ${selectedClass === cls ? 'quest-sidebar__item--active' : ''}`}
                                onClick={() => onSelectClass(selectedClass === cls ? 'all' : cls)}
                                title={getClassLabel(cls)}
                            >
                                <img src={getClassIcon(cls).startsWith('/') ? getBungieUrl(getClassIcon(cls)) : getClassIcon(cls)} alt={getClassLabel(cls)} className="quest-sidebar__icon" style={{ opacity: selectedClass === cls ? 1 : 0.5 }} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Expansion Filters (Middle Column - New) */}
                <div className="quest-sidebar__group">
                    <span className="quest-sidebar__label">DLC</span>
                    <div className="quest-sidebar__track quest-sidebar__track--expansions">
                        {expansionItems.map((exp) => {
                            const isBaseGame = exp === Expansion.BaseGame;
                            const handleExpansionClick = () => {
                                if (isBaseGame) {
                                    // Toggle all DLCs on or off
                                    const nonBaseExpansions = expansionItems.filter(e => e !== Expansion.BaseGame);
                                    const allSelected = nonBaseExpansions.every(e => selectedExpansions.includes(e));

                                    if (allSelected) {
                                        // Deselect all except base game
                                        nonBaseExpansions.forEach(e => onToggleExpansion(e));
                                    } else {
                                        // Select all
                                        nonBaseExpansions.forEach(e => {
                                            if (!selectedExpansions.includes(e)) {
                                                onToggleExpansion(e);
                                            }
                                        });
                                    }
                                } else {
                                    onToggleExpansion(exp);
                                }
                            };

                            return (
                                <button
                                    key={exp}
                                    className={`quest-sidebar__item ${selectedExpansions.includes(exp) ? 'quest-sidebar__item--active' : ''}`}
                                    onClick={handleExpansionClick}
                                    title={isBaseGame ? 'Toggle All DLCs' : exp.replace('-', ' ').toUpperCase()}
                                >
                                    {/* Fallback text if icon missing, or just a generic icon */}
                                    {expansionIcons[exp] ? (
                                        <img src={getBungieUrl(expansionIcons[exp])} alt={exp} className="quest-sidebar__icon" style={{ borderRadius: '4px' }} />
                                    ) : (
                                        <span style={{ fontSize: '10px', color: 'white' }}>{exp.substring(0, 2).toUpperCase()}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Element Filters (Right Column) */}
                <div className="quest-sidebar__group">
                    <span className="quest-sidebar__label">Filter</span>
                    <div className="quest-sidebar__track quest-sidebar__track--elements">
                        {elementItems.map((item) => {
                            const isAll = item === 'all';
                            const actualElements = elementItems.filter(i => i !== 'all') as ElementType[];
                            const allSelected = actualElements.every(el => selectedElements.includes(el));
                            const isActive = isAll ? allSelected : selectedElements.includes(item as ElementType);

                            const handleClick = () => {
                                if (isAll) {
                                    if (allSelected) {
                                        // Cannot deselect all - do nothing (keep at least one selected)
                                        return;
                                    } else {
                                        // Select all
                                        actualElements.forEach(el => {
                                            if (!selectedElements.includes(el)) onToggleElement(el);
                                        });
                                    }
                                } else {
                                    // Prevent deselecting if this is the last selected element
                                    if (selectedElements.includes(item as ElementType) && selectedElements.length === 1) {
                                        return; // Keep at least one selected
                                    }
                                    onToggleElement(item as ElementType);
                                }
                            };

                            return (
                                <button
                                    key={item}
                                    className={`quest-sidebar__item ${isActive ? 'quest-sidebar__item--active' : ''}`}
                                    onClick={handleClick}
                                    title={item.toUpperCase()}
                                >
                                    {elementIcons[item] && (
                                        <img
                                            src={getBungieUrl(elementIcons[item])}
                                            alt={item}
                                            className="quest-sidebar__icon"
                                            style={{ opacity: isActive ? 1 : 0.5 }}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </nav>
    );
}
