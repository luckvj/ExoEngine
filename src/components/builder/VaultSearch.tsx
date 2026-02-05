import { useState, useEffect } from 'react';
import { ElementType } from '../../types';
import { manifestService } from '../../services/bungie/manifest.service';
import { getBungieUrl } from '../../utils/url-helper';
import { useManifestStore } from '../../store';
import TitanLogo from '../../assets/logos/titan.png';
import HunterLogo from '../../assets/logos/hunter.png';
import WarlockLogo from '../../assets/logos/warlock.png';
import './VaultSearch.css';

interface VaultSearchProps {
    onSearch: (query: string) => void;
    selectedElement: string;
    onSelectElement: (element: string) => void;
    selectedClass: string;
    onSelectClass: (cls: string) => void;
    onClose?: () => void;
}

export function VaultSearch({
    onSearch,
    selectedElement,
    onSelectElement,
    selectedClass,
    onSelectClass,
    onClose
}: VaultSearchProps) {
    const [query, setQuery] = useState('');
    const { isLoaded } = useManifestStore();
    const [elementIcons, setElementIcons] = useState<Record<string, string>>({});
    const [classIcons, setClassIcons] = useState<Record<string, string>>({
        'titan': TitanLogo,
        'hunter': HunterLogo,
        'warlock': WarlockLogo
    });

    const elements = [
        'all',
        ElementType.Solar,
        ElementType.Void,
        ElementType.Arc,
        ElementType.Stasis,
        ElementType.Strand,
        ElementType.Prismatic
    ];

    const classes = [
        'titan',
        'hunter',
        'warlock'
    ];

    useEffect(() => {
        if (!isLoaded) return;

        // Load Element Icons
        const icons: Record<string, string> = {
            'all': manifestService.getDamageTypeIcon('kinetic') || ''
        };

        elements.forEach(type => {
            if (type !== 'all') {
                const icon = manifestService.getDamageTypeIcon(type as any);
                if (icon) icons[type] = icon;

                // Special handling for prismatic icon if needed
                if (type === ElementType.Prismatic) {
                    const allSubclasses = manifestService.getAllSubclassComponents();
                    const prismatic = allSubclasses.find(sub => sub.name.toLowerCase().includes('prismatic'));
                    if (prismatic?.icon) icons[type] = prismatic.icon;
                }
            }
        });
        setElementIcons(icons);

        // Load Class Icons
        const fetchNodeIcon = (name: string, fallback: string) => {
            const node = manifestService.searchPresentationNodeByName(name, true);
            return node?.icon || fallback;
        };

        setClassIcons({
            'titan': fetchNodeIcon("Titan", TitanLogo),
            'hunter': fetchNodeIcon("Hunter", HunterLogo),
            'warlock': fetchNodeIcon("Warlock", WarlockLogo)
        });

    }, [isLoaded]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);
        onSearch(value);
    };

    return (
        <div
            className="vault-search-container"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="vault-search-bar">
                <input
                    id="vault-search-input"
                    name="vault-search-input"
                    type="text"
                    placeholder="Search vault..."
                    value={query}
                    onChange={handleChange}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            onClose?.();
                        }
                    }}
                    className="vault-search"
                    autoFocus
                />
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
            </div>

            <div className="vault-filters">
                <div className="vault-filter-group">
                    {classes.map(cls => (
                        <button
                            key={cls}
                            className={`vault-filter-btn ${selectedClass === cls ? 'active' : ''}`}
                            onClick={() => onSelectClass(selectedClass === cls ? 'all' : cls)}
                            title={cls.toUpperCase()}
                        >
                            <img
                                src={classIcons[cls].startsWith('/') ? getBungieUrl(classIcons[cls]) : classIcons[cls]}
                                alt={cls}
                                className="vault-filter-icon"
                            />
                        </button>
                    ))}
                </div>

                <div className="vault-filter-divider" />

                <div className="vault-filter-group">
                    {elements.map(elem => (
                        <button
                            key={elem}
                            className={`vault-filter-btn element-${elem} ${selectedElement === elem ? 'active' : ''}`}
                            onClick={() => onSelectElement(selectedElement === elem ? 'all' : elem)}
                            title={elem.toUpperCase()}
                        >
                            {elementIcons[elem] && (
                                <img src={getBungieUrl(elementIcons[elem])} alt={elem} className="vault-filter-icon" />
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
