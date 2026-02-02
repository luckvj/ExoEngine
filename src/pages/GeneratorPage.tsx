import { useState, useCallback, useEffect, useMemo, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { debugLog, errorLog } from '../utils/logger';
import { GlassCard } from '../components/common/GlassCard';
import { RichTooltip } from '../components/builder/RichTooltip';
import { QuestSidebar } from '../components/synergy/QuestSidebar';
import { BUILD_TEMPLATES, getRandomBuild, getBuildsByClass, generateChaosBuild } from '../constants/build-templates';
import { SUBCLASS_HASHES } from '../constants/item-hashes';
import { useGeneratorStore, useProfileStore, useManifestStore, useSettingsStore, useAuthStore } from '../store';
import { manifestService } from '../services/bungie/manifest.service';
import { useInventory } from '../hooks/useInventory';
import { useToast } from '../components/common/Toast';
import { buildService } from '../services/build.service';
import { profileService } from '../services/bungie/profile.service';
import { ElementType, GuardianClass, Expansion, type BuildTemplate } from '../types';
import './GeneratorPage.css';

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
    [Expansion.Renegade]: 'Renegade',
  } as Record<Expansion, string>;
  return names[expansion] || null;
};

export function GeneratorPage() {
  const { getSelectedCharacter } = useProfileStore();
  const {
    isSpinning,
    currentBuild,
    lockedSlots,
    setSpinning,
    setCurrentBuild,
    toggleLock,
  } = useGeneratorStore();
  const { isLoaded: manifestLoaded } = useManifestStore();

  const { ownedExpansions } = useSettingsStore();
  const { isOwner } = useInventory();
  const { isAuthenticated } = useAuthStore();
  const { setInventories } = useProfileStore();

  useEffect(() => {
    if (isAuthenticated) {
      import('../services/bungie/profile.service').then(async ({ profileService }) => {
        const profile = await profileService.getProfile();
        if (profile) {
          setInventories(profileService.formatForStore(profile));
        }
      });
    }
  }, [isAuthenticated, setInventories]);

  const [selectedClass, setSelectedClass] = useState<GuardianClass | 'all'>('all');
  const [selectedElements, setSelectedElements] = useState<ElementType[]>(Object.values(ElementType));
  const [selectedExpansions, setSelectedExpansions] = useState<Expansion[]>(ownedExpansions);

  // Sync with store if ownedExpansions change (e.g. from settings)
  useEffect(() => {
    setSelectedExpansions(ownedExpansions);
  }, [ownedExpansions]);

  // Load saved builds on mount
  useEffect(() => {
    buildService.loadSavedBuilds();
  }, []);

  const toggleElement = (element: ElementType) => {
    setSelectedElements(prev => {
      // If trying to deselect and it's the last one selected, prevent it
      if (prev.includes(element) && prev.length === 1) {
        return prev; // Keep at least one selected
      }
      
      return prev.includes(element) 
        ? prev.filter(e => e !== element) 
        : [...prev, element];
    });
  };

  const toggleExpansion = (expansion: Expansion) => {
    if (expansion === Expansion.BaseGame) return; // Always keep base game
    setSelectedExpansions(prev =>
      prev.includes(expansion)
        ? prev.filter(e => e !== expansion)
        : [...prev, expansion]
    );
  };



  const [spinPhase, setSpinPhase] = useState<'idle' | 'spinning' | 'revealing' | 'complete'>('idle');
  const [icons, setIcons] = useState<Record<number, string>>({});
  const [chaosMode, setChaosMode] = useState(true); // Always chaos mode for now
  const [chaosBuild, setChaosBuild] = useState<BuildTemplate | null>(null);
  const [chaosError, setChaosError] = useState<string | null>(null);


  const selectedBuild = chaosMode
    ? chaosBuild
    : (currentBuild ? BUILD_TEMPLATES.find((b) => b.id === currentBuild) || null : null);

  const [failedIcons, setFailedIcons] = useState<Set<number>>(new Set());

  const handleImageError = (hash: number) => {
    setFailedIcons(prev => new Set(prev).add(hash));
  };

  // Fetch icons for the current build
  useEffect(() => {
    if (!selectedBuild || !manifestLoaded) return;

    const hashes = [
      selectedBuild.exoticWeapon.hash,
      selectedBuild.exoticArmor.hash,
      selectedBuild.subclassConfig.superHash,
      selectedBuild.subclassConfig.grenadeHash,
      selectedBuild.subclassConfig.meleeHash,
      selectedBuild.subclassConfig.classAbilityHash,
      ...(selectedBuild.subclassConfig.aspects || []),
      ...(selectedBuild.subclassConfig.fragments || []),
    ].filter((h): h is number => !!h);

    const fetchedIcons: Record<number, string> = {};

    // Helper to get element-matched class ability hash for icon lookup
    const getElementMatchedClassAbilityIconHash = (hash: number): number => {
      const classAbilityHash = selectedBuild.subclassConfig.classAbilityHash;
      if (hash !== classAbilityHash) return hash; // Not a class ability

      const element = selectedBuild.element;
      const guardianClass = selectedBuild.guardianClass;

      // Special Case: Void Warlock Visual Override
      // Void Warlocks incorrectly use Stasis hashes (Blue icon). We override to Solar (Orange) and tint Purple.
      // Special Case: Void Warlock Visual Override
      // No longer needed due to explicit hash correction in item-hashes.ts.
      // Logic removed to prevent double-tinting or interference.

      // Default smart element matching logic for other classes/elements
      const elementKeyMap: Record<string, string> = {
        [ElementType.Void]: 'VOID',
        [ElementType.Solar]: 'SOLAR',
        [ElementType.Arc]: 'ARC',
        [ElementType.Stasis]: 'STASIS',
        [ElementType.Strand]: 'STRAND',
        [ElementType.Prismatic]: 'PRISMATIC',
      };

      const classKeyMap: Record<number, string> = {
        [GuardianClass.Titan]: 'TITAN',
        [GuardianClass.Hunter]: 'HUNTER',
        [GuardianClass.Warlock]: 'WARLOCK',
      };

      const elKey = elementKeyMap[element] || 'VOID';
      const classKey = classKeyMap[guardianClass] || 'TITAN';

      // DEBUG LOG
      if (element === ElementType.Solar && guardianClass === GuardianClass.Titan) {
        debugLog('GeneratorPage', 'Solar Titan Debug:', { hash, elKey, classKey, element, guardianClass });
      }

      const classAbilities = (SUBCLASS_HASHES as any)[elKey]?.[classKey]?.CLASS_ABILITIES;
      if (classAbilities) {
        const values = Object.values(classAbilities).filter((v): v is number => typeof v === 'number');
        if (values.includes(hash)) return hash;
        if (values.length > 0) {
          return values[0];
        }
      }

      return hash;
    };

    hashes.forEach(hash => {
      const iconHash = getElementMatchedClassAbilityIconHash(hash);
      const icon = manifestService.getIcon(iconHash);
      if (icon) {
        fetchedIcons[hash] = icon;
      }
    });
    setIcons(prev => ({ ...prev, ...fetchedIcons }));
  }, [selectedBuild, manifestLoaded]);



  const [hoveredItem, setHoveredItem] = useState<{ hash: number; element?: HTMLElement } | null>(null);

  const renderIcon = (hash?: number, fallback: string = '?', className: string = 'slot-icon', checkOwnership: boolean = true) => {
    if (hash && icons[hash] && !failedIcons.has(hash)) {
      const definition = manifestService.getFullDefinition(hash);
      const isMissing = checkOwnership && !isOwner(hash);

      // Dynamic Tint Logic (Stateless)
      let style: CSSProperties = {};

      if (selectedBuild?.element === ElementType.Strand && Number(hash) === Number(selectedBuild?.subclassConfig?.classAbilityHash)) {
        // Global Strand Tint: Green Gradient Effect (Approximation based on user request)
        style = {
          filter: 'hue-rotate(-100deg) saturate(2.5) brightness(1.2)'
        };
      }

      return (
        <div 
          className="relative inline-block"
          onMouseEnter={(e) => setHoveredItem({ hash, element: e.currentTarget as HTMLElement })}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <img
            src={icons[hash]}
            alt=""
            style={style}
            className={`${className} ${isMissing ? 'opacity-50 grayscale border-red-500 border-2' : ''}`}
            onError={() => handleImageError(hash)}
          />
          {isMissing && (
            <span
              style={{ position: 'absolute', top: '0', right: '0' }}
              className="text-base drop-shadow-md z-10 pointer-events-none filter hover:brightness-110"
              title="Missing Item"
            >
              !
            </span>
          )}
        </div>
      );
    }
    return <span className="slot-icon-fallback">{fallback}</span>;
  };

  const handleSpin = useCallback(async () => {
    if (isSpinning) return;

    setSpinning(true);
    setSpinPhase('spinning');

    let shuffleInterval: any | undefined;

    try {
      const spinDuration = 2000;
      const revealDelay = 500;

      shuffleInterval = setInterval(() => {
        const allowedExpansions = selectedExpansions;
        const effectiveElements = selectedElements.length > 0 ? selectedElements : Object.values(ElementType);
        // Pick a random element for this tick to show visual variety within selected range
        const tickElement = effectiveElements[Math.floor(Math.random() * effectiveElements.length)];

        if (chaosMode) {
          // OPTIMIZATION: Just pick a random pre-made build for the visual effect
          // This prevents the heavy Chaos generation logic from running 10x/sec and freezing the UI
          const randomVisual = getRandomBuild(selectedClass, undefined, allowedExpansions); // undefined element to allow variety, or tickElement
          // Actually, let's use tickElement to respect filters visually
          const visual = getRandomBuild(selectedClass, tickElement, allowedExpansions);
          
          if (visual) {
            // Hack: Cast to BuildTemplate to satisfy type, we just want visuals
            setChaosBuild(visual);
          }
        } else {
          const randomBuild = getRandomBuild(selectedClass, tickElement, allowedExpansions);
          if (randomBuild) {
            setCurrentBuild(randomBuild.id);
          }
        }
      }, 100);

      await new Promise((resolve) => setTimeout(resolve, spinDuration));
      clearInterval(shuffleInterval);
      setSpinPhase('revealing');

      if (chaosMode) {
        // Adapt store locks to full interface (subclass locks not yet in UI)
        const fullLockedSlots = {
          weapon: lockedSlots.weapon || false,
          armor: lockedSlots.armor || false,
          super: false,
          aspects: false,
          fragments: false,
          grenade: false,
          melee: false,
          classAbility: false,
        };

        // If no class selected for Chaos, pick one randomly for this spin
        const effectiveClass = selectedClass === 'all' ? [GuardianClass.Titan, GuardianClass.Hunter, GuardianClass.Warlock][Math.floor(Math.random() * 3)] : selectedClass;
        
        // Pick final element from selection
        const effectiveElements = selectedElements.length > 0 ? selectedElements : Object.values(ElementType);
        const finalElement = effectiveElements[Math.floor(Math.random() * effectiveElements.length)];

        debugLog('GeneratorPage', "Generating Final Chaos Build...", {
          selectedClass: effectiveClass,
          selectedElements,
          finalElement,
          ownedExpansions: ownedExpansions.length,
          fullLockedSlots
        });

        try {
          const finalChaos = generateChaosBuild(
            effectiveClass,
            finalElement,
            ownedExpansions,
            selectedBuild,
            fullLockedSlots
          ); // Re-generate dynamic description based on what was actually picked
          // We can't do this inside generateChaosBuild easily because we don't have async manifest access there easily without refactor
          // So we do a quick patch here if possible, or just rely on the static templates we added to build-templates.ts
          // BUT the user asked for "AI generated something different". 
          // Let's try to fetch definitions here and update the playstyle!

          if (finalChaos) {
            const armorDef = manifestService.getFullDefinition(finalChaos.exoticArmor.hash);
            const weaponDef = finalChaos.exoticWeapon ? manifestService.getFullDefinition(finalChaos.exoticWeapon.hash) : null;

            // Construct a dynamic description
            let dynamicDesc = finalChaos.playstyle; // Default from template

            if (armorDef) {
              // Clean up description: remove newlines, take first sentence or so.
              const shortDesc = armorDef.description?.split('\n')[0] || "Use this armor's unique power.";
              dynamicDesc = `Build Focus: ${armorDef.name}. ${shortDesc}`;
            }

            if (weaponDef) {
              const shortWep = weaponDef.description?.split('\n')[0] || "";
              if (shortWep) dynamicDesc += ` Pair with ${weaponDef.name}: ${shortWep}`;
            }

            finalChaos.playstyle = dynamicDesc;
          }

          debugLog('GeneratorPage', "Chaos Generation Success:", finalChaos.id);
          setChaosBuild(finalChaos);
          setChaosError(null);
        } catch (e: any) {
          errorLog('GeneratorPage', "Chaos generation failed", e);
          setChaosError(e.message || "Unknown Chaos Error");
          // Fallback to random template if chaos fails
          const fallback = getRandomBuild(selectedClass, finalElement, ownedExpansions);
          setChaosBuild(fallback || null);
        }
      } else {
        let finalResult = BUILD_TEMPLATES;

        // Filter by class
        if (selectedClass !== 'all') {
          finalResult = finalResult.filter(b => b.guardianClass === selectedClass);
        }

        // Filter by element (always has at least one selected)
        finalResult = finalResult.filter(b => selectedElements.includes(b.element));

        // Filter by expansions
        finalResult = finalResult.filter(b =>
          !b.requiredExpansion ||
          selectedExpansions.includes(b.requiredExpansion) ||
          b.requiredExpansion === Expansion.BaseGame
        );

        if (finalResult.length > 0) {
          const finalBuild = finalResult[Math.floor(Math.random() * finalResult.length)];
          setCurrentBuild(finalBuild.id);
        }
      }

      await new Promise((resolve) => setTimeout(resolve, revealDelay));

      setSpinPhase('complete');
    } catch (error: any) {
      errorLog('GeneratorPage', "Spin Fatal Error:", error);
      setChaosError("System Error: " + (error.message || "Unknown error"));
    } finally {
      if (shuffleInterval) clearInterval(shuffleInterval);
      setSpinning(false);
      // setDebugStatus(prev => prev + " (Cleaned up)");
      debugLog('GeneratorPage', "Spin Complete. Phase:", spinPhase);
    }
  }, [isSpinning, selectedClass, selectedElements, ownedExpansions, selectedExpansions, setSpinning, setCurrentBuild, chaosMode, lockedSlots, selectedBuild]);

  const handleReset = () => {
    setCurrentBuild(null);
    setSpinPhase('idle');
  };

  const availableBuilds = useMemo(() => {
    let builds = BUILD_TEMPLATES;
    
    if (selectedClass !== 'all') {
      builds = builds.filter(b => b.guardianClass === selectedClass);
    }
    
    // Filter by selected elements (always has at least one)
    builds = builds.filter(b => selectedElements.includes(b.element));
    
    builds = builds.filter(b =>
      !b.requiredExpansion ||
      selectedExpansions.includes(b.requiredExpansion) ||
      b.requiredExpansion === Expansion.BaseGame
    );
    
    return builds;
  }, [selectedClass, selectedElements, selectedExpansions]);

  return (
    <div className="generator-page">
      {hoveredItem && hoveredItem.element && (
        <RichTooltip
          item={{ itemHash: hoveredItem.hash }}
          followMouse={true}
          inline={false}
        />
      )}
      
      {/* LEFT: Sidebar Filters */}
      <QuestSidebar
        selectedElements={selectedElements}
        onToggleElement={toggleElement}
        selectedClass={selectedClass}
        onSelectClass={setSelectedClass}
        selectedExpansions={selectedExpansions}
        onToggleExpansion={toggleExpansion}
      />

      {/* RIGHT: Main Content */}
      <div className="generator-content">
        <header className="generator-page__header section-header">
          <div>
            <h1>Random Meta Generator</h1>
            <p className="generator-page__subtitle">
              <span className="subtitle-label">Starhorse</span> - [Pleasant huff]<br />
              <span className="subtitle-label">Xur</span> - "Err, good night, Xur"
            </p>
          </div>
        </header>

        <div className="generator-controls">

        {chaosError && (
          <div className="bg-red-900/50 border border-red-500/50 text-red-200 p-4 rounded-lg mb-6 animate-pulse">
            <div className="font-bold flex items-center gap-2">
              <span>Chaos Protocol Failure</span>
            </div>
            <div className="text-sm font-mono mt-1 opacity-80">{chaosError}</div>
          </div>
        )}

        <div className="generator-controls__actions">
          {/* Mode toggle hidden - Chaos Mode only */}

          <button
            className={`spin-button ${isSpinning ? 'spin-button--spinning' : ''}`}
            onClick={handleSpin}
            disabled={isSpinning || (!availableBuilds.length && !chaosMode)}
          >
            <span className="spin-button__icon">
              {isSpinning ? '' : ''}
            </span>
            <span className="spin-button__text">
              {isSpinning ? 'Spinning...' : 'Generate Build'}
            </span>
          </button>
        </div>
      </div>

      <div className="slot-machine">
        <div className={`slot-machine__container ${spinPhase}`}>
          {/* Weapon Slot */}
          <div className={`slot ${spinPhase === 'spinning' ? 'slot--spinning' : ''}`}>
            <div className="slot__label">Exotic Weapon</div>
            <div className="slot__window">
              {selectedBuild ? (
                <div className="slot__item animate-pop-in">
                  <div className="slot__icon-wrapper">
                    {renderIcon(selectedBuild.exoticWeapon.hash, 'W', 'slot-icon', true)}
                  </div>
                  <div className="slot__name">{selectedBuild.exoticWeapon.name}</div>
                </div>
              ) : (
                <div className="slot__placeholder">?</div>
              )}
            </div>
            <button
              className={`slot__lock ${lockedSlots.weapon ? 'slot__lock--active' : ''}`}
              onClick={() => toggleLock('weapon')}
              disabled={isSpinning}
              aria-label={lockedSlots.weapon ? 'Unlock weapon' : 'Lock weapon'}
            >
              {lockedSlots.weapon ? 'Locked' : 'Unlocked'}
            </button>
          </div>

          {/* Armor Slot */}
          <div className={`slot ${spinPhase === 'spinning' ? 'slot--spinning' : ''}`}>
            <div className="slot__label">Exotic Armor</div>
            <div className="slot__window">
              {selectedBuild ? (
                <div className="slot__item animate-pop-in stagger-1">
                  <div className="slot__icon-wrapper">
                    {renderIcon(selectedBuild.exoticArmor.hash, 'A', 'slot-icon', true)}
                  </div>
                  <div className="slot__name">{selectedBuild.exoticArmor.name}</div>
                </div>
              ) : (
                <div className="slot__placeholder">?</div>
              )}
            </div>
            <button
              className={`slot__lock ${lockedSlots.armor ? 'slot__lock--active' : ''}`}
              onClick={() => toggleLock('armor')}
              disabled={isSpinning}
              aria-label={lockedSlots.armor ? 'Unlock armor' : 'Lock armor'}
            >
              {lockedSlots.armor ? 'Locked' : 'Unlocked'}
            </button>
          </div>

          {/* Subclass Slot */}
          <div className={`slot ${spinPhase === 'spinning' ? 'slot--spinning' : ''}`}>
            <div className="slot__label">Subclass</div>
            <div className="slot__window slot__window--wide">
              {selectedBuild ? (
                <div className="slot__item animate-pop-in stagger-2">
                  <div className="slot__icon-wrapper">
                    {renderIcon(selectedBuild.subclassConfig.superHash, 'S', 'slot-icon', false)}
                  </div>
                  <div className="slot__name">{selectedBuild.name.split(' ')[0]}</div>
                </div>
              ) : (
                <div className="slot__placeholder">?</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {
        selectedBuild && spinPhase === 'complete' && (
          <BuildDetails
            build={selectedBuild}
            icons={icons}
            isOwner={isOwner}
            isAuthenticated={isAuthenticated}
          />
        )
      }
      </div>
    </div>
  );
}

export default GeneratorPage;

function BuildDetails({
  build,
  icons,
  isOwner,
  isAuthenticated
}: {
  build: BuildTemplate;
  icons: Record<number, string>;
  isOwner: (hash: number) => boolean;
  isAuthenticated: boolean;
}) {
  const navigate = useNavigate();
  const [failedIcons, setFailedIcons] = useState<Set<number>>(new Set());

  const handleImageError = (hash: number) => {
    setFailedIcons(prev => new Set(prev).add(hash));
  };

  const [hoveredDetailItem, setHoveredDetailItem] = useState<{ hash: number; element?: HTMLElement } | null>(null);

  const renderIcon = (hash?: number, fallback: string = '?', className: string = 'detail-icon', checkOwnership: boolean = false) => {
    if (hash && icons[hash] && !failedIcons.has(hash)) {
      const definition = manifestService.getFullDefinition(hash);
      const isMissing = checkOwnership && !isOwner(hash);

      // Dynamic Tint Logic (Stateless) - Applied to BuildDetails scope
      const hashNum = Number(hash);
      const isClassAbility = hashNum === Number(build.subclassConfig?.classAbilityHash);

      let style: CSSProperties = {};

      if (isClassAbility) {
        // Global Strand Tint: Green Gradient Effect
        if (build.element === ElementType.Strand) {
          style = { filter: 'hue-rotate(-100deg) saturate(2.5) brightness(1.2)' };
        }
      }

      return (
        <div 
          className="relative inline-block"
          onMouseEnter={(e) => setHoveredDetailItem({ hash, element: e.currentTarget as HTMLElement })}
          onMouseLeave={() => setHoveredDetailItem(null)}
        >
          <img
            src={icons[hash]}
            alt=""
            style={style}
            className={`${className} ${isMissing ? 'opacity-50 grayscale border-red-500 border-2' : ''}`}
            onError={() => handleImageError(hash)}
          />
          {isMissing && (
            <span
              style={{ position: 'absolute', top: '0', right: '0' }}
              className="text-base drop-shadow-md z-10 pointer-events-none"
              title="Missing Item"
            >
              !
            </span>
          )}
        </div>
      );
    }
    return <span className="detail-icon-fallback">{fallback}</span>;
  };

  const expansionName = getExpansionName(build.requiredExpansion);

  const { success, info } = useToast();

  const [isEquipping, setEquipping] = useState(false);
  const [equipProgress, setEquipProgress] = useState({ message: '', percent: 0 });
  const [showSnapshotUI, setShowSnapshotUI] = useState(false);

  // Save progress state
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [saveStatus, setSaveStatus] = useState('');

  const { selectedCharacterId, getSelectedCharacter } = useProfileStore();
  const selectedCharacter = getSelectedCharacter();

  const handleEquip = async () => {
    if (!selectedCharacterId) {
      info("Please select a character first.");
      return;
    }

    if (!selectedCharacter) {
      info("Please select a character first.");
      return;
    }

    if (selectedCharacter.classType !== build.guardianClass) {
      info(`This build is for ${build.guardianClass === GuardianClass.Titan ? 'Titan' : build.guardianClass === GuardianClass.Hunter ? 'Hunter' : 'Warlock'}. Please switch to the correct character.`);
      return;
    }

    if (!isOwner(build.exoticArmor.hash) || !isOwner(build.exoticWeapon.hash)) {
      info(`You don't own all required items.`);
      return;
    }

    setEquipping(true);
    setEquipProgress({ message: 'Initializing...', percent: 0 });

    try {
      const result = await buildService.equip(build, selectedCharacterId, (msg, pct) => {
        setEquipProgress({ message: msg, percent: pct });
      });

      if (result.success) {
        success(`Successfully equipped ${build.name}!`);
        setShowSnapshotUI(true);
      } else {
        info(result.error || "Failed to equip build.");
      }

      // Mandatory Refresh: Update profile to reflect actual character state
      const profile = await profileService.getProfile();
      if (profile) {
        useProfileStore.getState().setInventories(profileService.formatForStore(profile));
      }
    } catch (e) {
      errorLog('GeneratorPage', 'Save error:', e);
      info("Equip failed due to an error.");
    }
    setEquipping(false);
  };

  const handleSnapshot = async (index: number) => {
    if (!selectedCharacterId) return;
    try {
      setEquipping(true);
      setEquipProgress({ message: 'Syncing server state...', percent: 90 });

      // Bungie's loadout system needs a moment to validate the newly equipped items
      // before a snapshot can be taken reliably.
      await new Promise(resolve => setTimeout(resolve, 2000));

      const result = await buildService.snapshotToInGameSlot(selectedCharacterId, index);
      if (result.success) {
        setShowSnapshotUI(false);
        success(`Saved to In-Game Loadout Slot ${index + 1}!`);
      } else {
        info(result.error || "Failed to save loadout. Are you in an activity?");
      }
    } catch (e) {
      info("Snapshot failed.");
    } finally {
      setEquipping(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveProgress(0);
    setSaveStatus('Initializing...');

    try {
      let buildToSave: any = { ...build, source: "exoengine" };

      // Ensure build has required ID
      setSaveProgress(10);
      setSaveStatus('Generating build ID...');
      if (!buildToSave.id) {
        buildToSave.id = `chaos-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }

      // Smart Save: If the user has equipped this build, capture the FULL state (including legendaries/mods)
      if (selectedCharacterId) {
        setSaveProgress(30);
        setSaveStatus('Capturing equipped loadout...');
        const captured = await buildService.captureLoadout(selectedCharacterId, build.name);

        // Check if captured loadout matches the intended build's exotics (to ensure they didn't swap characters/loadouts)
        if (captured &&
          captured.exoticArmor.hash === build.exoticArmor.hash &&
          captured.exoticWeapon.hash === build.exoticWeapon.hash) {

          setSaveProgress(60);
          setSaveStatus('Capturing mods & socket overrides...');

          // It matches! Use the captured detailed loadout, but preserve the generator's metadata
          buildToSave = {
            ...captured,
            id: captured.id || buildToSave.id,
            name: build.name,
            playstyle: build.playstyle || captured.playstyle,
            difficulty: build.difficulty, source: "exoengine"
          };
          debugLog('GeneratorPage', "Smart Save: Captured full loadout details.");
        }
      }

      setSaveProgress(80);
      setSaveStatus('Saving to database...');
      await buildService.saveBuild(buildToSave);

      setSaveProgress(100);
      setSaveStatus('Complete!');
      success(`Saved "${buildToSave.name}" to Saved Builds.`);

      // Navigate to Builds page after a brief delay
      setTimeout(() => {
        setIsSaving(false);
        setSaveProgress(0);
        setSaveStatus('');
        navigate('/builds');
      }, 1500);
    } catch (e) {
      errorLog('GeneratorPage', "Save build error:", e);
      setSaveStatus('Failed!');
      info("Failed to save build. Please try again.");
      setTimeout(() => {
        setIsSaving(false);
        setSaveProgress(0);
        setSaveStatus('');
      }, 2000);
    }
  };

  return (
    <GlassCard className="build-details animate-fade-in-up">
      {hoveredDetailItem && hoveredDetailItem.element && (
        <RichTooltip
          item={{ itemHash: hoveredDetailItem.hash }}
          followMouse={true}
          inline={false}
        />
      )}
      
      {showSnapshotUI && (
        <div className="snapshot-notice glass-panel" style={{ margin: 'var(--space-md)' }}>
          <div className="snapshot-notice__content">
            <h3>Build Initialized</h3>
            <p>Gear & Subclass mapped. Snapshot to an in-game slot to save this configuration:</p>
            <div className="snapshot-slots">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => (
                <button
                  key={i}
                  className="btn btn-sm btn-ghost"
                  onClick={() => handleSnapshot(i)}
                  disabled={isEquipping}
                >
                  Slot {i + 1}
                </button>
              ))}
              <button className="btn btn-sm btn-text" onClick={() => setShowSnapshotUI(false)}>Dismiss</button>
            </div>
          </div>
        </div>
      )}
      <div className="build-details__header">
        <h2 className="build-details__title">{build.name}</h2>
        <div className="build-details__badges">
          <span className={`btn btn-${build.element.toLowerCase()}`} style={{ padding: '4px 12px', fontSize: '0.75rem', cursor: 'default', borderRadius: '0' }}>
            {build.element}
          </span>
          {expansionName && (
            <span className="badge badge-dlc">{expansionName}</span>
          )}
        </div>
      </div>

      <div className="build-result__grid">
        {/* Left: Core Icons (Exotic & Super) */}
        <div className="build-result__core">
          <div className="build-details__item build-details__item--exotic" title={build.exoticArmor.name}>
            <div className="detail-icon-wrapper">{renderIcon(build.exoticArmor.hash, 'A', 'detail-icon', true)}</div>
          </div>
          {build.subclassConfig?.superHash && (
            <div className="build-result__super-icon" title="Super">
              {renderIcon(build.subclassConfig.superHash, '*', 'detail-icon detail-icon--super', false)}
            </div>
          )}
        </div>

        {/* Middle: Info */}
        <div className="build-result__info">
          <h3>{build.name}</h3>
          <div className="result-card__super-name">
            {build.subclassConfig?.superHash ? manifestService.getFullDefinition(build.subclassConfig.superHash)?.name : 'Super Ability'}
            <span className="result-card__element-name">
                     // {build.element?.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Right: Abilities with Label */}
        <div className="build-result__abilities-group">
          <span className="build-result__label">Abilities</span>
          <div className="build-result__abilities">
            <div className="build-details__item build-details__item--small" title="Grenade">
              <div className="detail-icon-wrapper">{renderIcon(build.subclassConfig.grenadeHash, 'G')}</div>
            </div>
            <div className="build-details__item build-details__item--small" title="Melee">
              <div className="detail-icon-wrapper">{renderIcon(build.subclassConfig.meleeHash, 'M')}</div>
            </div>
            <div className="build-details__item build-details__item--small" title="Class Ability">
              <div className="detail-icon-wrapper">{renderIcon(build.subclassConfig.classAbilityHash, 'C')}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="build-details__section">
        <h3>Subclass</h3>
        <div className="build-details__row">
          <div className="build-details__item" title="Super">
            <div className="detail-icon-wrapper">{renderIcon(build.subclassConfig.superHash, 'S')}</div>
          </div>
          {build.subclassConfig.aspects.map((hash, i) => (
            <div key={hash} className="build-details__item" title={`Aspect ${i + 1}`}>
              <div className="detail-icon-wrapper">{renderIcon(hash, 'A')}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="build-details__compact-grid">
        <div className="build-details__section">
          <h3>Fragments</h3>
          <div className="build-details__row">
            {build.subclassConfig.fragments.map((hash, i) => (
              <div key={hash} className="build-details__item" title={`Fragment ${i + 1}`}>
                <div className="detail-icon-wrapper">{renderIcon(hash, 'F')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="build-details__section build-details__section--full">
        <h3>Playstyle</h3>
        <p className="build-details__description">{build.playstyle}</p>
      </div>

      {isEquipping && (
        <div className="equip-progress" style={{ margin: '0 1rem 1rem 1rem', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px' }}>
          <div className="progress-bar-container" style={{ height: '8px', background: '#333', borderRadius: '4px', overflow: 'hidden' }}>
            <div className="progress-fill" style={{ width: `${equipProgress.percent}%`, height: '100%', background: '#4CAF50', transition: 'width 0.2s' }} />
          </div>
          <div className="progress-text" style={{ marginTop: '5px', fontSize: '0.9rem', color: '#ccc', textAlign: 'center' }}>
            {equipProgress.message}
          </div>
        </div>
      )}


      <div className="build-details__actions">
        {isAuthenticated &&
          isOwner(build.exoticArmor.hash) &&
          isOwner(build.exoticWeapon.hash) && (
            <button
              className={`btn btn-primary btn-lg btn-${build.element.toLowerCase()}`}
              onClick={handleEquip}
              disabled={isEquipping || isSaving || !selectedCharacter || selectedCharacter.classType !== build.guardianClass}
              title={
                !selectedCharacter 
                  ? "Please select a character first"
                  : selectedCharacter.classType !== build.guardianClass
                  ? `This build is for ${build.guardianClass === GuardianClass.Titan ? 'Titan' : build.guardianClass === GuardianClass.Hunter ? 'Hunter' : 'Warlock'}. Switch to the correct character.`
                  : "Equip this build to your character"
              }
            >
              {isEquipping ? 'Equipping...' : 'Equip Build'}
            </button>
          )}
        {isAuthenticated ? (
          <button
            className={`btn btn-secondary btn-${build.element.toLowerCase()}`}
            onClick={handleSave}
            disabled={isSaving || isEquipping}
          >
            {isSaving ? 'Saving...' : 'Save Build'}
          </button>
        ) : (
          <button className="btn btn-secondary btn-disabled" disabled title="Sign in with Bungie to save builds">
            Sign In to Save
          </button>
        )}
      </div>
    </GlassCard >

  );
}
