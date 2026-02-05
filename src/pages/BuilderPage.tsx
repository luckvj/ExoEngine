import { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useUIStore } from '../store';
import { CharacterScreen } from '../components/builder/CharacterScreen';
import { SubclassScreen } from '../components/builder/SubclassScreen';
import { BuilderContainer } from '../components/builder/BuilderContainer';
import { TooltipProvider } from '../components/builder/TooltipManager';

interface LocationState {
    synergyFilter?: {
        weaponName?: string;
        armorName?: string;
        element?: string;
        buildName?: string;
    };
}

function BuilderPage() {
    // Get synergy filter from navigation state (from Vault builds)
    const location = useLocation();
    const locationState = location.state as LocationState | null;
    const synergyFilter = locationState?.synergyFilter;

    const { builderView, builderSubView, setBuilderView } = useUIStore();
    const [hoveredSubclass, setHoveredSubclass] = useState<{ item: any; instance?: any } | null>(null);
    const [activeSubclass, setActiveSubclass] = useState<{ item: any; instance: any } | null>(null);

    const handleSubclassClick = useCallback((itemHash: number, itemInstanceId?: string) => {
        setBuilderView('subclass', { hash: itemHash, itemInstanceId });
    }, [setBuilderView]);

    const handleSubclassDataReady = useCallback((subclass: any, instance: any) => {
        setActiveSubclass({ item: subclass, instance });
    }, []);

    return (
        <TooltipProvider>
            {builderView === 'character' ? (
                <BuilderContainer
                    onSubclassClick={handleSubclassClick}
                    hoveredSubclass={hoveredSubclass}
                    setHoveredSubclass={setHoveredSubclass}
                    onSubclassDataReady={handleSubclassDataReady}
                >
                    <CharacterScreen
                        activeSubclass={activeSubclass}
                        synergyFilter={synergyFilter}
                    />
                </BuilderContainer>
            ) : (
                <SubclassScreen
                    subclassHash={builderSubView?.hash}
                    itemInstanceId={builderSubView?.itemInstanceId}
                    onBack={() => setBuilderView('character')}
                />
            )}
        </TooltipProvider>
    );
}

export default BuilderPage;
