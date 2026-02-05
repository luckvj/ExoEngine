import { useMemo, useRef, useEffect, useState } from 'react';
import { useProfileStore, useUIStore } from '../../store';
import { StatsPanel } from './StatsPanel';
import {
  calculateCharacterStats,
} from '../../utils/character-helpers';
import { SynergyGalaxy } from '../synergy/SynergyGalaxy';
import { VaultSearch } from './VaultSearch';
import { buildService } from '../../services/build.service';
import { profileLoader } from '../../services/bungie/profile.service';
import { useToast } from '../common/Toast';
import './CharacterScreen.css';

interface CharacterScreenProps {
  activeSubclass?: { item: any; instance: any } | null;
  synergyFilter?: {
    weaponName?: string;
    armorName?: string;
    element?: string;
    buildName?: string;
  };
}

export function CharacterScreen({ synergyFilter }: CharacterScreenProps = {}) {
  const [vaultSearchQuery, setVaultSearchQuery] = useState('');
  const [isVaultSearchVisible, setIsVaultSearchVisible] = useState(false);
  const [activeSynergyElement, setActiveSynergyElement] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'subclass-only' | 'inventory-only'>('all');
  const [vaultElementFilter, setVaultElementFilter] = useState<string>('all');
  const [vaultClassFilter, setVaultClassFilter] = useState<string>('all');
  const [isSynergyOverlayOpen, setIsSynergyOverlayOpen] = useState(false);
  const [activeSynergy, setActiveSynergy] = useState<any>(null);
  const [isEquipping, setIsEquipping] = useState(false);
  // Add force close trigger to handle child overlay state
  const [forceCloseOverlayTrigger, setForceCloseOverlayTrigger] = useState(0);
  const [equipProgress, setEquipProgress] = useState<string>('');
  // Ref to call SynergyGalaxy's reset function directly
  const galaxyResetRef = useRef<(() => void) | null>(null);

  // Listen for galaxy-refresh events from the navigation tab
  useEffect(() => {
    const handleGalaxyRefresh = () => {
      // 1. Reset the galaxy view (camera, etc)
      if (galaxyResetRef.current) {
        galaxyResetRef.current();
      }

      // 2. FORCE REFRESH Profile from Bungie (DIM-Parity)
      profileLoader.loadProfile(true);
    };

    window.addEventListener('galaxy-refresh', handleGalaxyRefresh);
    return () => window.removeEventListener('galaxy-refresh', handleGalaxyRefresh);
  }, []);

  const {
    selectedCharacterId,
    characterEquipment,
    itemInstances,
  } = useProfileStore();
  const { hideGlobalUI } = useUIStore();
  const toast = useToast();
  const screenRef = useRef<HTMLDivElement>(null);
  const equipment = characterEquipment[selectedCharacterId || ''] || [];

  const stats = useMemo(() => calculateCharacterStats(equipment, itemInstances), [equipment, itemInstances]);

  // Get equipped subclass element
  const equippedSubclass = useMemo((): string | undefined => {
    const subclassItem = equipment.find(item => {
      // Check if this is a subclass by bucket hash (would need manifest lookup)
      // For now, we'll use known subclass hashes
      const SUBCLASS_HASHES = [
        3893112950, 4282591831, 1616346845, // Prismatic
        3941205951, 2550323932, 2453351420, // Solar
        3168997075, 2328211300, 2932390913, // Arc  
        3382391785, 2842471112, 2842471119, // Void
        3291545503, 873720784, 613647804,   // Stasis
        242419885, 3785442599, 3948463201   // Strand
      ];
      return SUBCLASS_HASHES.includes(item.itemHash);
    });

    if (!subclassItem) {
      return undefined;
    }

    // Map subclass hashes to elements
    const hash = subclassItem.itemHash;

    if ([3893112950, 4282591831, 1616346845].includes(hash)) return 'prismatic';
    if ([3941205951, 2550323932, 2453351420].includes(hash)) return 'solar';
    if ([3168997075, 2328211300, 2932390913].includes(hash)) return 'arc';
    if ([3382391785, 2842471112, 2842471119].includes(hash)) return 'void';
    if ([3291545503, 873720784, 613647804].includes(hash)) return 'stasis';
    if ([242419885, 3785442599, 3948463201].includes(hash)) return 'strand';

    return undefined;
  }, [equipment]);

  // Set global CSS variables for dynamic tooltip colors
  useEffect(() => {
    const elementColors: Record<string, string> = {
      solar: '#f0631e',
      arc: '#7df9ff',
      void: '#bf84ff',
      stasis: '#4d88ff',
      strand: '#4aff9b',
      prismatic: '#ff8df6'
    };

    const color = equippedSubclass ? elementColors[equippedSubclass.toLowerCase()] : undefined;
    if (color) {
      document.documentElement.style.setProperty('--tooltip-element-color', color);
    }
  }, [equippedSubclass]);

  // Handle equipping the active active synergy build
  const handleEquipBuild = async () => {
    if (isEquipping || !activeSynergy || !selectedCharacterId) return;

    setIsEquipping(true);
    setIsSynergyOverlayOpen(false); // Close overlay immediately
    setForceCloseOverlayTrigger(prev => prev + 1); // Signal child to close
    setEquipProgress('Preparing build...');

    try {
      const result = await buildService.equip(
        activeSynergy,
        selectedCharacterId,
        (step: string, progress: number) => {
          setEquipProgress(`${step} (${Math.round(progress)}%)`);
        }
      );

      if (result.success) {
        toast.success(`Successfully equipped ${activeSynergy.name || 'build'}!`);
        setEquipProgress('');
        // PULL BACK TO ORBIT: Reset view mode to 'all'
        setViewMode('all');
      } else {
        toast.error(result.error || 'Failed to equip build');
        setEquipProgress('');
      }
    } catch (error) {
      toast.error('Failed to equip build. Please try again.');
      setEquipProgress('');
    } finally {
      setIsEquipping(false);
    }
  };

  // Keyboard shortcuts for view modes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement).isContentEditable
      );

      if (isTyping) return;

      // Toggle Inventory-only view with 'I' key
      if (e.key.toLowerCase() === 'i') {
        setViewMode(prev => prev === 'inventory-only' ? 'all' : 'inventory-only');
      }

      // Toggle Vault Search with 'V' key
      if (e.key.toLowerCase() === 'v') {
        e.preventDefault();
        setIsVaultSearchVisible(prev => {
          const newState = !prev;
          if (!newState) {
            setVaultSearchQuery('');
            setVaultElementFilter('all');
            setVaultClassFilter('all');
          }
          return newState;
        });
      }

      // Toggle Subclass-only view with 'J' key
      if (e.key.toLowerCase() === 'j') {
        setViewMode(prev => prev === 'subclass-only' ? 'all' : 'subclass-only');
      }

      // Equip active build with 'F' key (only if overlay is open)
      if (e.key.toLowerCase() === 'f' && isSynergyOverlayOpen) {
        handleEquipBuild();
      }

      // Close vault search with Escape if search is open (but keep the query)
      if (e.key === 'Escape' && isVaultSearchVisible) {
        setIsVaultSearchVisible(false);
        // Don't clear query - keep it so it shows again when pressing V
      }

      // Reset view mode with Escape
      if (e.key === 'Escape' && viewMode !== 'all') {
        setViewMode('all');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVaultSearchVisible, viewMode, activeSynergy, isSynergyOverlayOpen, isEquipping, selectedCharacterId]);

  // Auto-focus on mount so keyboard events work immediately
  useEffect(() => {
    screenRef.current?.focus();
  }, []);

  return (
    <div
      ref={screenRef}
      className="character-screen animate-fade-in"
      style={{ position: 'relative' }}
      tabIndex={0}
    >
      {/* Vault Search Bar (Initially Hidden) */}
      {isVaultSearchVisible && (
        <VaultSearch
          onSearch={setVaultSearchQuery}
          selectedElement={vaultElementFilter}
          onSelectElement={setVaultElementFilter}
          selectedClass={vaultClassFilter}
          onSelectClass={setVaultClassFilter}
          onClose={() => setIsVaultSearchVisible(false)}
        />
      )}

      {/* New 3D Synergy Galaxy Environment */}
      <SynergyGalaxy
        searchQuery={vaultSearchQuery}
        elementFilter={vaultElementFilter}
        classFilter={vaultClassFilter}
        isVaultSearchVisible={isVaultSearchVisible}
        onSynergyElementChange={setActiveSynergyElement}
        viewMode={viewMode}
        synergyFilter={synergyFilter}
        onSynergyOverlayChange={(isOpen, synergy) => {
          setIsSynergyOverlayOpen(isOpen);
          setActiveSynergy(synergy);
        }}
        onResetView={() => setViewMode('all')}
        forceCloseTrigger={forceCloseOverlayTrigger}
        resetViewRef={galaxyResetRef}
      />

      {/* Stats and Info Overlay Layer */}
      <div
        className="character-screen__overlay"
        style={{
          opacity: hideGlobalUI ? 0 : 1,
          transition: 'opacity 0.3s ease-out'
        }}
      >
        <div className="character-screen__left-info">
          <StatsPanel
            stats={stats}
            subclassElement={equippedSubclass}
            synergyElement={activeSynergyElement}
          />
        </div>

        <div className="character-screen__right-info">
          {/* Synergy Detail Panel Removed per User Request */}
        </div>

      </div>

      {/* Bottom Control Bar */}
      <div className="character-screen__footer">
        <div className="character-screen__footer-left">
          <div
            className="character-screen__control-item character-screen__control-item--clickable"
            onClick={() => {
              // Dispatch ESC key event to trigger reset view in SynergyGalaxy
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            }}
          >
            <div className="character-screen__control-key">ESC</div>
            <span>Back to Orbit</span>
          </div>
          <div className="character-screen__control-item" style={{ marginLeft: '12px' }}>
            <div style={{ display: 'flex', gap: '2px' }}>
              <div className="character-screen__control-key">W</div>
              <div className="character-screen__control-key">A</div>
              <div className="character-screen__control-key">S</div>
              <div className="character-screen__control-key">D</div>
            </div>
            <span style={{ marginLeft: '8px' }}>MOVE</span>
          </div>
        </div>
        <div className="character-screen__footer-right">
          {isSynergyOverlayOpen && activeSynergy && (
            <div
              className={`character-screen__control-item character-screen__control-item--clickable ${isEquipping ? 'disabled' : ''}`}
              onClick={async () => {
                if (isEquipping || !activeSynergy || !selectedCharacterId) return;

                setIsEquipping(true);
                setEquipProgress('Preparing build...');

                try {
                  // activeSynergy is a DashboardSynergy from the synergy matcher
                  // We need to find the original SynergyDefinition from constants

                  // Import synergy definitions and find the matching one
                  const { SYNERGY_DEFINITIONS } = await import('../../constants/synergy-definitions');
                  let synergyDef = SYNERGY_DEFINITIONS.find(s => s.name === activeSynergy.buildName);

                  // DYNAMIC SYNERGY FALLBACK:
                  // If no static definition is found (e.g. for generated synergies like "Eye of Another World Solar"),
                  // construct a dynamic definition from the active synergy data.
                  if (!synergyDef) {

                    // Fallback to empty strings if undefined to ensure object creation,
                    // but warn if they are missing.
                    const weaponName = activeSynergy.weapon || activeSynergy.exoticWeapon; // Try potential alias
                    const armorName = activeSynergy.armor || activeSynergy.exoticArmor;    // Try potential alias

                    if (!weaponName && !armorName) {
                      toast.error("Invalid build data: No weapon or armor specified.");
                      setIsEquipping(false);
                      return;
                    }

                    // Import types to ensure we match the interface if needed (implied by usage)
                    // We construct a minimal SynergyDefinition compatible object
                    synergyDef = {
                      id: `dynamic-${Date.now()}`,
                      name: activeSynergy.buildName || 'Custom Build',
                      element: activeSynergy.element,
                      guardianClass: activeSynergy.guardianClass,
                      requiredExpansion: 'base' as any, // Assume base for dynamic
                      exoticArmor: {
                        hash: 0, // BuildService will lookup by name if hash is 0/missing
                        name: armorName,
                        slot: 'chest' as any // Slot is irrelevant for lookup by name
                      },
                      exoticWeapon: {
                        hash: 0,
                        name: weaponName,
                      },
                      playstyle: 'Dynamic Synergy Build',
                      difficulty: 'intermediate' as any,
                      tags: [],
                      loopDescription: 'Auto-generated synergy build.'
                    } as any;
                  }


                  // Use buildService.equip with the proper SynergyDefinition
                  if (synergyDef) {
                    setIsSynergyOverlayOpen(false); // Close overlay immediately
                    setForceCloseOverlayTrigger(prev => prev + 1); // Signal child to close
                    const result = await buildService.equip(
                      synergyDef,
                      selectedCharacterId,
                      (step: string, progress: number) => {
                        setEquipProgress(`${step} (${Math.round(progress)}%)`);
                      }
                    );

                    if (result.success) {
                      toast.success(`Successfully equipped ${synergyDef.name}!`);
                      setEquipProgress('');
                      // PULL BACK TO ORBIT: Reset view mode to 'all'
                      setViewMode('all');
                    } else {
                      toast.error(result.error || 'Failed to equip build');
                      setEquipProgress('');
                    }
                  }
                } catch (error) {
                  toast.error('Failed to equip build. Please try again.');
                  setEquipProgress('');
                } finally {
                  setIsEquipping(false);
                }
              }}
            >
              <div className="character-screen__control-key">F</div>
              <span>{isEquipping ? equipProgress || 'Equipping...' : 'Equip Build'}</span>
            </div>
          )}
          <div
            className="character-screen__control-item character-screen__control-item--clickable"
            onClick={() => setViewMode(prev => prev === 'inventory-only' ? 'all' : 'inventory-only')}
          >
            <div className={`character-screen__control-key ${viewMode === 'inventory-only' ? 'active' : ''}`}>I</div>
            <span>Inventory{viewMode === 'inventory-only' ? ' (Active)' : ''}</span>
          </div>
          <div
            className="character-screen__control-item character-screen__control-item--clickable"
            onClick={() => setIsVaultSearchVisible(prev => !prev)}
          >
            <div className={`character-screen__control-key ${isVaultSearchVisible ? 'active' : ''}`}>V</div>
            <span>Vault{isVaultSearchVisible ? ' (Active)' : ''}</span>
          </div>
          <div
            className="character-screen__control-item character-screen__control-item--clickable"
            onClick={() => setViewMode(prev => prev === 'subclass-only' ? 'all' : 'subclass-only')}
          >
            <div className={`character-screen__control-key ${viewMode === 'subclass-only' ? 'active' : ''}`}>J</div>
            <span>Subclass{viewMode === 'subclass-only' ? ' (Active)' : ''}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
