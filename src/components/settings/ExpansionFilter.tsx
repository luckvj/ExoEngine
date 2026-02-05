import { Expansion } from '../../types';
import { useSettingsStore, useManifestStore } from '../../store';
import { manifestService } from '../../services/bungie/manifest.service';
import { getBungieUrl } from '../../utils/url-helper';
import './ExpansionFilter.css';

interface ExpansionFilterProps {
    selectedExpansions: Expansion[];
    onToggle: (expansion: Expansion) => void;
    className?: string;
}

export function ExpansionFilter({ selectedExpansions, onToggle, className = '' }: ExpansionFilterProps) {
    const { isExpansionOwned } = useSettingsStore();
    const { isLoaded } = useManifestStore();

    // Expansion rootViewIcon paths from presentation nodes
    const expansionIcons: Record<string, string> = {
        'renegade': '/common/destiny2_content/icons/843b1dfa55b92ccd8f8c6e9d9a0feec8.png',
        'edge-of-fate': '/common/destiny2_content/icons/1c4e4d183392430e23dfae3f77569c86.png',
        'final-shape': '/common/destiny2_content/icons/22d097b865f64884117ce6658e14a028.png',
        'base': '/common/destiny2_content/icons/9a4e146af8bf678a3fd1fb55d3424e36.png',
    };

    // Presentation Node Hashes for fallback
    const expansionNodes: Record<string, number> = {
        'final-shape': 2724376914,
        'edge-of-fate': 2724376914,
        'renegade': 2724376914,
        'lightfall': 3543690049,
        'witch-queen': 1393766100,
        'beyond-light': 1345459588,
        'shadowkeep': 4292445962,
        'forsaken': 3790247699,
        'anniversary-30th': 1393766100
    };

    const getExpansionIcon = (expansionId: string): string | null => {
        // First, try direct rootViewIcon path
        if (expansionIcons[expansionId]) {
            return expansionIcons[expansionId];
        }

        // Fallback to presentation node lookup
        if (!isLoaded) return null;
        
        const nodeHash = expansionNodes[expansionId];
        if (!nodeHash) return null;

        const node = manifestService.getPresentationNode(nodeHash);
        return node?.rootViewIcon || node?.icon || node?.originalIcon || null;
    };

    const expansions = [
        { id: Expansion.Renegade, name: 'Renegade', color: '#ff3300', year: '2025' },
        { id: Expansion.EdgeOfFate, name: 'Edge of Fate', color: '#8800ff', year: '2024' },
        { id: Expansion.FinalShape, name: 'Final Shape', color: '#00f2ff', year: '2024' },
        { id: Expansion.Lightfall, name: 'Lightfall', color: '#ff00ff', year: '2023' },
        { id: Expansion.WitchQueen, name: 'Witch Queen', color: '#d4ff00', year: '2022' },
        { id: Expansion.BeyondLight, name: 'Beyond Light', color: '#00ccff', year: '2020' },
        { id: Expansion.Shadowkeep, name: 'Shadowkeep', color: '#ff4400', year: '2019' },
        { id: Expansion.Forsaken, name: 'Forsaken', color: '#7700ff', year: '2018' },
        { id: Expansion.Anniversary30th, name: '30th Anniv.', color: '#ffcc00', year: '2021' },
    ];

    return (
        <div className={`expansion-filter ${className}`}>
            <div className="expansion-filter__grid">
                <div
                    className={`expansion-filter__card ${selectedExpansions.includes(Expansion.BaseGame) ? 'expansion-filter__card--active' : ''}`}
                    onClick={() => onToggle(Expansion.BaseGame)}
                    style={{ '--exp-color': '#888888' } as React.CSSProperties}
                >
                    {getExpansionIcon(Expansion.BaseGame) && (
                        <img 
                            src={getBungieUrl(getExpansionIcon(Expansion.BaseGame)!)} 
                            className="expansion-filter__icon" 
                            alt="Base Game"
                        />
                    )}
                    <div className="expansion-filter__card-inner">
                        <span className="expansion-filter__name">Base Game</span>
                        <span className="expansion-filter__year">Free</span>
                    </div>
                </div>

                {expansions.map((exp) => {
                    const isOwned = isExpansionOwned(exp.id);
                    if (!isOwned) return null;

                    const isActive = selectedExpansions.includes(exp.id);
                    const iconPath = getExpansionIcon(exp.id);

                    return (
                        <div
                            key={exp.id}
                            className={`expansion-filter__card ${isActive ? 'expansion-filter__card--active' : ''}`}
                            onClick={() => onToggle(exp.id)}
                            style={{ '--exp-color': exp.color } as React.CSSProperties}
                        >
                            {iconPath && (
                                <img 
                                    src={getBungieUrl(iconPath)} 
                                    className="expansion-filter__icon" 
                                    alt={exp.name}
                                />
                            )}
                            <div className="expansion-filter__card-inner">
                                <span className="expansion-filter__name">{exp.name}</span>
                                <span className="expansion-filter__year">{exp.year}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
