import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ElementType, GuardianClass, Expansion } from '../types';
import { VaultCard } from '../components/vault/VaultCard';
import { QuestSidebar } from '../components/synergy/QuestSidebar';
import { useSettingsStore, useProfileStore, useSavedBuildsStore } from '../store';
import { buildService } from '../services/build.service';
import { useToast } from '../components/common/Toast';
import { errorLog } from '../utils/logger';
import { getSubclassElement } from '../utils/character-helpers';
import './LoadoutVaultPage.css';

// type FilterElement = ElementType | 'all';
type FilterClass = GuardianClass | 'all';

const LoadoutVaultPage = () => {
  const navigate = useNavigate();
  const [selectedElements, setSelectedElements] = useState<ElementType[]>(Object.values(ElementType));
  const [selectedClass, setSelectedClass] = useState<FilterClass>('all');
  const { ownedExpansions } = useSettingsStore();
  const [selectedExpansions, setSelectedExpansions] = useState<Expansion[]>(ownedExpansions);
  const [searchQuery, setSearchQuery] = useState('');
  const [equippingId, setEquippingId] = useState<string | null>(null);
  const [equippingProgress, setEquippingProgress] = useState(0);
  const [equippingStatus, setEquippingStatus] = useState('');

  const { selectedCharacterId, characterEquipment } = useProfileStore();
  const { builds, isLoading } = useSavedBuildsStore();
  const { success, info, error: showToastError } = useToast();

  // Load saved builds on mount
  useEffect(() => {
    if (buildService) {
      buildService.loadSavedBuilds();
    }
  }, []);

  // Dynamic branding based on subclass
  const equipment = characterEquipment[selectedCharacterId || ''] || [];
  const subclassElement = useMemo(() => getSubclassElement(equipment), [equipment]);

  const elementColors: Record<string, { primary: string, glow: string }> = {
    void: { primary: '#bf84ff', glow: 'rgba(191, 132, 255, 0.5)' },
    solar: { primary: '#ff8c3a', glow: 'rgba(255, 140, 58, 0.5)' },
    arc: { primary: '#7df9ff', glow: 'rgba(125, 249, 255, 0.5)' },
    stasis: { primary: '#4d88ff', glow: 'rgba(77, 136, 255, 0.5)' },
    strand: { primary: '#4aff9b', glow: 'rgba(74, 255, 155, 0.5)' },
    prismatic: { primary: '#ff8df6', glow: 'rgba(255, 141, 246, 0.5)' },
  };

  const currentTheme = elementColors[subclassElement] || elementColors.void;

  const toggleElement = (element: ElementType) => {
    setSelectedElements(prev =>
      prev.includes(element)
        ? prev.filter(e => e !== element)
        : [...prev, element]
    );
  };

  const toggleExpansion = (expansion: Expansion) => {
    if (expansion === Expansion.BaseGame) return;
    setSelectedExpansions(prev =>
      prev.includes(expansion)
        ? prev.filter(e => e !== expansion)
        : [...prev, expansion]
    );
  };

  // Filter builds
  const filteredBuilds = useMemo(() => {
    return builds.filter((build) => {
      const template = build.template;
      if (!template) return false;

      // Filter by Class
      if (selectedClass !== 'all' && template.guardianClass !== selectedClass) return false;

      // Filter by Element
      if (selectedElements.length > 0 && !selectedElements.includes(template.element)) return false;

      // Filter by expansion
      if (template.requiredExpansion) {
        if (!selectedExpansions.includes(template.requiredExpansion) && template.requiredExpansion !== Expansion.BaseGame) {
          return false;
        }
      }

      // Filter by Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = build.name.toLowerCase().includes(query);
        const weaponMatch = template.exoticWeapon?.name?.toLowerCase().includes(query);
        const armorMatch = template.exoticArmor?.name?.toLowerCase().includes(query);
        const tagMatch = build.tags?.some((tag) => tag.toLowerCase().includes(query));
        return nameMatch || weaponMatch || armorMatch || tagMatch;
      }

      return true;
    });
  }, [builds, selectedElements, selectedClass, selectedExpansions, searchQuery]);

  const handleEquip = async (build: any) => {
    if (equippingId) return;

    if (!selectedCharacterId) {
      info("Please select a character first.");
      return;
    }

    setEquippingId(build.id);
    setEquippingProgress(0);
    setEquippingStatus('Initializing...');
    useProfileStore.getState().setEquipping(true);

    try {
      const result = await buildService.equip(build.template, selectedCharacterId, (step: string, progress: number) => {
        setEquippingStatus(step);
        setEquippingProgress(progress);

        // Navigate to Galaxy view right before equipping phase (after transfers complete)
        // This lets users see the exotic items flying to the character in real-time
        if (step.includes('Equipping items') || progress >= 35) {
          navigate('/galaxy');

          // Automatically trigger "Return to Orbit" (ESC) after navigation
          // This resets the camera to the default centered view showing equipped items
          setTimeout(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          }, 100); // Small delay to ensure galaxy view is mounted
        }
      });

      if (result.success) {
        success(`Successfully equipped ${build.name}!`);
      } else {
        showToastError(result.error || "Failed to equip build.");
      }
    } catch (e) {
      errorLog('LoadoutVaultPage', 'Equipment error:', e);
      showToastError("An unexpected error occurred during equipment.");
    } finally {
      setEquippingId(null);
      setEquippingProgress(0);
      setEquippingStatus('');
      useProfileStore.getState().setEquipping(false);
    }
  };

  const handleDelete = async (buildId: string) => {
    try {
      await buildService.deleteBuild(buildId);
      success("Build deleted successfully.");
    } catch (e) {
      errorLog('LoadoutVaultPage', 'Delete error:', e);
      showToastError("Failed to delete build.");
    }
  };

  const handleViewBuild = (build: any) => {
    // Navigate to view the build in detail mode
    // If it has a loadout property (DIM format), use DIM viewer
    if (build.loadout) {
      // Store in session and navigate
      sessionStorage.setItem('viewBuild', JSON.stringify(build));
      navigate('/dim-loadout?fromVault=true');
    }
  };

  return (
    <div
      className="vault-page"
      style={{
        '--brand-primary': currentTheme.primary,
        '--brand-glow': currentTheme.glow,
      } as React.CSSProperties}
    >
      {/* LEFT: Sidebar Navigation */}
      <QuestSidebar
        selectedElements={selectedElements}
        onToggleElement={toggleElement}
        selectedClass={selectedClass}
        onSelectClass={setSelectedClass}
        selectedExpansions={selectedExpansions}
        onToggleExpansion={toggleExpansion}
      />

      {/* RIGHT: Main Content */}
      <main className="vault-content">
        {/* Generate Build Button */}
        <button
          className="spin-button"
          onClick={() => navigate('/generator')}
          style={{
            alignSelf: 'flex-start',
            marginBottom: 'var(--space-md)'
          }}
        >
          <span className="spin-button__text">Generate Build <span style={{ fontSize: '0.75em', opacity: 0.7 }}>(Beta)</span></span>
        </button>

        {/* Header */}
        <div className="section-header">
          <h2>Saved Builds</h2>
          <div className="header-actions" style={{ display: 'flex', gap: 'var(--space-md)' }}>
            <span className="vault-results__count" style={{ color: '#ffffff' }}>{filteredBuilds.length} builds saved</span>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="vault-loading">
            <div className="spinner" />
            <p>Loading saved builds...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredBuilds.length === 0 && (
          <div className="vault-empty">
            <h3>No Builds Saved</h3>
            <p>Press <span className="key-cap">D</span> while viewing a DIM loadout or ExoEngine build to save it here.</p>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSelectedElements(Object.values(ElementType));
                setSelectedClass('all');
                setSearchQuery('');
              }}
              style={{
                color: '#ffffff',
                background: '#000000',
                borderColor: '#ffffff'
              }}
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Builds Grid */}
        {!isLoading && filteredBuilds.length > 0 && (
          <div className="vault-grid">
            {filteredBuilds.map((build) => (
              <VaultCard
                key={build.id}
                build={build}
                onEquip={handleEquip}
                onDelete={handleDelete}
                onView={handleViewBuild}
                isEquipping={equippingId === build.id}
                equippingProgress={equippingId === build.id ? equippingProgress : undefined}
                equippingStatus={equippingId === build.id ? equippingStatus : undefined}
              />
            ))}
          </div>
        )}

        {/* Footer Padding */}
        <div style={{ height: '100px' }} />
      </main>
    </div>
  );
};

export default LoadoutVaultPage;
