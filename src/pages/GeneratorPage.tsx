import { useState, useCallback, useEffect, useMemo, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { debugLog, errorLog } from '../utils/logger';
import { GlassCard } from '../components/common/GlassCard';
import { RichTooltip } from '../components/builder/RichTooltip';
import { QuestSidebar } from '../components/synergy/QuestSidebar';
import { BUILD_TEMPLATES, getRandomBuild, generateChaosBuild } from '../constants/build-templates';       
import { SUBCLASS_HASHES } from '../constants/item-hashes';
import { useGeneratorStore, useProfileStore, useManifestStore, useSettingsStore, useAuthStore } from '../store';
import { manifestService } from '../services/bungie/manifest.service';
import { useInventory } from '../hooks/useInventory';
import { useToast } from '../components/common/Toast';
import { buildService } from '../services/build.service';
import { profileLoader } from '../services/bungie/profile.service';
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
  const { setInventories } = useProfileStore();
  const {
    isSpinning,
    currentBuild,
    lockedSlots,
    setSpinning,
    toggleLock,
  } = useGeneratorStore();
  const { isLoaded: manifestLoaded } = useManifestStore();

  const { ownedExpansions } = useSettingsStore();
  const { isOwner } = useInventory();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      profileLoader.loadProfile(true).then(() => {
        debugLog('GeneratorPage', 'Initial inventory sync complete');
      });
    }
  }, [isAuthenticated, setInventories]);

  const [selectedClass, setSelectedClass] = useState<GuardianClass | 'all'>('all');
  const [selectedElements, setSelectedElements] = useState<ElementType[]>(
    Object.values(ElementType).filter(e => e !== ElementType.Kinetic && e !== ElementType.Neutral)        
  );
  const [selectedExpansions, setSelectedExpansions] = useState<Expansion[]>(ownedExpansions);

  useEffect(() => {
    setSelectedExpansions(ownedExpansions);
  }, [ownedExpansions]);

  useEffect(() => {
    buildService.loadSavedBuilds();
  }, []);

  const toggleElement = (element: ElementType) => {
    setSelectedElements(prev => {
      if (prev.includes(element) && prev.length === 1) return prev;
      return prev.includes(element) ? prev.filter(e => e !== element) : [...prev, element];
    });
  };

  const toggleExpansion = (expansion: Expansion) => {
    if (expansion === Expansion.BaseGame) return;
    setSelectedExpansions(prev => prev.includes(expansion) ? prev.filter(e => e !== expansion) : [...prev, expansion]);
  };

  const [spinPhase, setSpinPhase] = useState<'idle' | 'spinning' | 'revealing' | 'complete'>('idle');     
  const [icons, setIcons] = useState<Record<number, string>>({});
  const [chaosMode] = useState(true);
  const [chaosBuild, setChaosBuild] = useState<BuildTemplate | null>(null);
  const [chaosError, setChaosError] = useState<string | null>(null);

  const selectedBuild = chaosMode ? chaosBuild : (currentBuild ? BUILD_TEMPLATES.find((b) => b.id === currentBuild) || null : null);

  const [failedIcons, setFailedIcons] = useState<Set<number>>(new Set());

  const handleImageError = (hash: number) => {
    setFailedIcons(prev => new Set(prev).add(hash));
  };

  useEffect(() => {
    if (!selectedBuild || !manifestLoaded) return;

    const hashes = [
      selectedBuild.exoticWeapon?.hash,
      selectedBuild.exoticArmor?.hash,
      selectedBuild.subclassConfig?.superHash,
      selectedBuild.subclassConfig?.grenadeHash,
      selectedBuild.subclassConfig?.meleeHash,
      selectedBuild.subclassConfig?.classAbilityHash,
      ...(selectedBuild.subclassConfig?.aspects || []),
      ...(selectedBuild.subclassConfig?.fragments || []),
      ...(selectedBuild.armorMods || []),
    ].filter((h): h is number => !!h);

    const fetchedIcons: Record<number, string> = {};

    const getElementMatchedIcon = (hash: number): number => {
      const subclass = selectedBuild.subclassConfig;
      if (hash !== subclass?.classAbilityHash) return hash;
      const elKey = (selectedBuild.element || 'VOID').toUpperCase();
      const classKey = selectedBuild.guardianClass === GuardianClass.Titan ? 'TITAN' : selectedBuild.guardianClass === GuardianClass.Hunter ? 'HUNTER' : 'WARLOCK';
      const classAbilities = (SUBCLASS_HASHES as any)[elKey]?.[classKey]?.CLASS_ABILITIES;
      if (classAbilities) {
        const vals = Object.values(classAbilities).filter((v): v is number => typeof v === 'number');
        if (vals.includes(hash)) return hash;
        if (vals.length > 0) return vals[0];
      }
      return hash;
    };

    hashes.forEach(hash => {
      const icon = manifestService.getIcon(getElementMatchedIcon(hash));
      if (icon) fetchedIcons[hash] = icon;
    });
    setIcons(prev => ({ ...prev, ...fetchedIcons }));
  }, [selectedBuild, manifestLoaded]);

  const [hoveredItem, setHoveredItem] = useState<{ hash: number; element?: HTMLElement } | null>(null);   

  const renderIcon = (hash?: number, fallback: string = '?', className: string = 'slot-icon', checkOwnership: boolean = true) => {
    if (hash && icons[hash] && !failedIcons.has(hash)) {
      const isMissing = checkOwnership && !isOwner(hash);
      let style: CSSProperties = {};
      if (selectedBuild?.element === ElementType.Strand && Number(hash) === Number(selectedBuild?.subclassConfig?.classAbilityHash)) {
        style = { filter: 'hue-rotate(-100deg) saturate(2.5) brightness(1.2)' };
      }
      return (
        <div className="relative inline-block" onMouseEnter={(e) => setHoveredItem({ hash, element: e.currentTarget as HTMLElement })} onMouseLeave={() => setHoveredItem(null)}>
          <img src={icons[hash]} alt="" style={style} className={`${className} ${isMissing ? 'opacity-50 grayscale border-red-500 border-2' : ''}`} onError={() => handleImageError(hash)} />
          {isMissing && <span style={{ position: 'absolute', top: '0', right: '0' }} className="text-base drop-shadow-md z-10 pointer-events-none" title="Missing Item">!</span>}
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
      shuffleInterval = setInterval(() => {
        const effectiveElements = selectedElements.length > 0 ? selectedElements : Object.values(ElementType);
        const tickElement = effectiveElements[Math.floor(Math.random() * effectiveElements.length)];      
        const visual = getRandomBuild(selectedClass === 'all' ? undefined : selectedClass, tickElement, selectedExpansions);
        if (visual) setChaosBuild(visual);
      }, 100);

      await new Promise((resolve) => setTimeout(resolve, 2000));
      clearInterval(shuffleInterval);
      setSpinPhase('revealing');

      const effectiveClass = selectedClass === 'all' ? [GuardianClass.Titan, GuardianClass.Hunter, GuardianClass.Warlock][Math.floor(Math.random() * 3)] : selectedClass;
      const effectiveElements = selectedElements.length > 0 ? selectedElements : Object.values(ElementType);
      const finalElement = effectiveElements[Math.floor(Math.random() * effectiveElements.length)] || ElementType.Void;

      try {
        const finalChaos = generateChaosBuild(effectiveClass, finalElement, selectedExpansions, selectedBuild, { weapon: lockedSlots.weapon, armor: lockedSlots.armor, super: false, aspects: false, fragments: false, grenade: false, melee: false, classAbility: false });
        if (finalChaos) {
          if (!finalChaos.element) finalChaos.element = finalElement;
          const armorDef = finalChaos.exoticArmor ? manifestService.getFullDefinition(finalChaos.exoticArmor.hash) : null;
          const weaponDef = finalChaos.exoticWeapon ? manifestService.getFullDefinition(finalChaos.exoticWeapon.hash) : null;
          let desc = finalChaos.playstyle;
          if (armorDef) desc = `Build Focus: ${armorDef.name}. ${armorDef.description?.split('\n')[0] || "Exotic power unleashed."}`;
          if (weaponDef) desc += ` Pair with ${weaponDef.name}.`;
          finalChaos.playstyle = desc;
          setChaosBuild(finalChaos);
          setChaosError(null);
        }
      } catch (e: any) {
        setChaosError(e.message || "Chaos Protocol Failure");
        const fallback = getRandomBuild(selectedClass === 'all' ? undefined : selectedClass, finalElement, selectedExpansions);
        setChaosBuild(fallback || null);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSpinPhase('complete');
    } catch (error: any) {
      setChaosError("System Error: " + (error.message || "Unknown error"));
    } finally {
      if (shuffleInterval) clearInterval(shuffleInterval);
      setSpinning(false);
    }
  }, [isSpinning, selectedClass, selectedElements, selectedExpansions, setSpinning, lockedSlots, selectedBuild]);

  const availableBuilds = useMemo(() => {
    let builds = BUILD_TEMPLATES;
    if (selectedClass !== 'all') builds = builds.filter(b => b.guardianClass === selectedClass);
    builds = builds.filter(b => selectedElements.includes(b.element));
    builds = builds.filter(b => !b.requiredExpansion || selectedExpansions.includes(b.requiredExpansion) || b.requiredExpansion === Expansion.BaseGame);
    return builds;
  }, [selectedClass, selectedElements, selectedExpansions]);

  return (
    <div className="generator-page">
      {hoveredItem && hoveredItem.element && <RichTooltip item={{ itemHash: hoveredItem.hash }} followMouse={true} inline={false} />}
      <QuestSidebar selectedElements={selectedElements} onToggleElement={toggleElement} selectedClass={selectedClass} onSelectClass={setSelectedClass} selectedExpansions={selectedExpansions} onToggleExpansion={toggleExpansion} />
      <div className="generator-content">
        <header className="generator-page__header section-header">
          <div>
            <h1>Random Meta Generator</h1>
            <p className="generator-page__subtitle"><span className="subtitle-label">Starhorse</span> - [Pleasant huff]<br /><span className="subtitle-label">Xur</span> - "Err, good night, Xur"</p>
          </div>
        </header>
        <div className="generator-controls">
          {chaosError && <div className="bg-red-900/50 border border-red-500/50 text-red-200 p-4 rounded-lg mb-6 animate-pulse"><div className="font-bold flex items-center gap-2"><span>Chaos Protocol Failure</span></div><div className="text-sm font-mono mt-1 opacity-80">{chaosError}</div></div>}
          <div className="generator-controls__actions">
            <button className={`spin-button ${isSpinning ? 'spin-button--spinning' : ''}`} onClick={handleSpin} disabled={isSpinning || (!availableBuilds.length && !chaosMode)}>
              <span className="spin-button__text">{isSpinning ? 'Spinning...' : 'Generate Build'} {!isSpinning && <span style={{ fontSize: '0.75em', opacity: 0.7 }}>(Beta)</span>}</span>
            </button>
          </div>
        </div>
        <div className="slot-machine">
          <div className={`slot-machine__container ${spinPhase}`}>
            <div className={`slot ${spinPhase === 'spinning' ? 'slot--spinning' : ''}`}>
              <div className="slot__label">Exotic Weapon</div>
              <div className="slot__window">{selectedBuild ? <div className="slot__item animate-pop-in"><div className="slot__icon-wrapper">{renderIcon(selectedBuild.exoticWeapon?.hash, 'W', 'slot-icon', true)}</div><div className="slot__name">{selectedBuild.exoticWeapon?.name || 'Any Weapon'}</div></div> : <div className="slot__placeholder">?</div>}</div>
              <button className={`slot__lock ${lockedSlots.weapon ? 'slot__lock--active' : ''}`} onClick={() => toggleLock('weapon')} disabled={isSpinning}>{lockedSlots.weapon ? 'Locked' : 'Unlocked'}</button>
            </div>
            <div className={`slot ${spinPhase === 'spinning' ? 'slot--spinning' : ''}`}>
              <div className="slot__label">Exotic Armor</div>
              <div className="slot__window">{selectedBuild ? <div className="slot__item animate-pop-in stagger-1"><div className="slot__icon-wrapper">{renderIcon(selectedBuild.exoticArmor?.hash, 'A', 'slot-icon', true)}</div><div className="slot__name">{selectedBuild.exoticArmor?.name || 'Any Armor'}</div></div> : <div className="slot__placeholder">?</div>}</div>
              <button className={`slot__lock ${lockedSlots.armor ? 'slot__lock--active' : ''}`} onClick={() => toggleLock('armor')} disabled={isSpinning}>{lockedSlots.armor ? 'Locked' : 'Unlocked'}</button>
            </div>
            <div className={`slot ${spinPhase === 'spinning' ? 'slot--spinning' : ''}`}>
              <div className="slot__label">Subclass</div>
              <div className="slot__window slot__window--wide">{selectedBuild ? <div className="slot__item animate-pop-in stagger-2"><div className="slot__icon-wrapper">{renderIcon(selectedBuild.subclassConfig?.superHash || 0, 'S', 'slot-icon', false)}</div><div className="slot__name">{selectedBuild.name?.split(' ')[0] || 'Build'}</div></div> : <div className="slot__placeholder">?</div>}</div>
            </div>
          </div>
        </div>
        {selectedBuild && spinPhase === 'complete' && <BuildDetails build={selectedBuild} icons={icons} isOwner={isOwner} isAuthenticated={isAuthenticated} />}
      </div>
    </div>
  );
}

function BuildDetails({ build, icons, isOwner, isAuthenticated }: { build: BuildTemplate; icons: Record<number, string>; isOwner: (hash: number) => boolean; isAuthenticated: boolean; }) {
  const navigate = useNavigate();
  const { success, info } = useToast();
  const [failedIcons, setFailedIcons] = useState<Set<number>>(new Set());
  const [isEquipping, setEquipping] = useState(false);
  const [equipProgress, setEquipProgress] = useState({ message: '', percent: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const { selectedCharacterId, getSelectedCharacter } = useProfileStore();
  const [hoveredDetailItem, setHoveredDetailItem] = useState<{ hash: number; element?: HTMLElement } | null>(null);

  const renderIcon = (hash?: number, fallback: string = '?', className: string = 'detail-icon', checkOwnership: boolean = false) => {
    if (hash && icons[hash] && !failedIcons.has(hash)) {
      const isMissing = checkOwnership && !isOwner(hash);
      let style: CSSProperties = {};
      if (build.element === ElementType.Strand && Number(hash) === Number(build.subclassConfig?.classAbilityHash)) {
        style = { filter: 'hue-rotate(-100deg) saturate(2.5) brightness(1.2)' };
      }
      return (
        <div className="relative inline-block" onMouseEnter={(e) => setHoveredDetailItem({ hash, element: e.currentTarget as HTMLElement })} onMouseLeave={() => setHoveredDetailItem(null)}>
          <img src={icons[hash]} alt="" style={style} className={`${className} ${isMissing ? 'opacity-50 grayscale border-red-500 border-2' : ''}`} onError={() => setFailedIcons(p => new Set(p).add(hash))} />
          {isMissing && <span style={{ position: 'absolute', top: '0', right: '0' }} className="text-base drop-shadow-md z-10 pointer-events-none">!</span>}
        </div>
      );
    }
    return <span className="detail-icon-fallback">{fallback}</span>;
  };

  const handleEquip = async () => {
    if (!build || !selectedCharacterId) return;
    const char = getSelectedCharacter();
    if (!char || char.classType !== build.guardianClass) { info("Switch to correct character first."); return; }
    if ((build.exoticArmor && !isOwner(build.exoticArmor.hash)) || (build.exoticWeapon && !isOwner(build.exoticWeapon.hash))) { info("Missing items."); return; }
    
    setEquipping(true);
    try {
      const res = await buildService.equip(build, selectedCharacterId, (msg, pct) => setEquipProgress({ message: msg, percent: pct }));
      if (res.success) { success(`Equipped ${build.name}!`); }
      else info(res.error || "Equip failed.");
      profileLoader.loadProfile(true);
    } catch { info("Equip error."); } finally { setEquipping(false); }
  };

  const handleSave = async () => {
    if (!build) return;
    setIsSaving(true);
    try {
      let toSave: any = { ...build, source: "exoengine" };
      if (!toSave.id) toSave.id = `chaos-${Date.now()}`;
      if (selectedCharacterId) {
        const cap = await buildService.captureLoadout(selectedCharacterId, build.name || 'Generated', undefined, build.element);
        if (cap && cap.exoticArmor?.hash === build.exoticArmor?.hash && cap.exoticWeapon?.hash === build.exoticWeapon?.hash) {
          toSave = { ...cap, id: cap.id || toSave.id, name: build.name || cap.name, source: "exoengine" };
        }
      }
      await buildService.saveBuild(toSave);
      success(`Saved ${toSave.name}!`);
      setTimeout(() => navigate('/builds'), 1500);
    } catch (e: any) { errorLog('GeneratorPage', "Save error:", e); info(e.message || "Save failed."); } finally { setIsSaving(false); }
  };

  return (
    <GlassCard className="build-details animate-fade-in-up">
      {hoveredDetailItem && <RichTooltip item={{ itemHash: hoveredDetailItem.hash }} followMouse={true} inline={false} />}
      <div className="build-details__header">
        <h2 className="build-details__title">{build.name || 'Generated Build'}</h2>
        <div className="build-details__badges">
          <span className={`btn btn-${(build.element || 'void').toLowerCase()}`} style={{ padding: '4px 12px', fontSize: '0.75rem', cursor: 'default' }}>{build.element || 'Void'}</span>
          {build.requiredExpansion !== undefined && <span className="badge badge-dlc">{getExpansionName(build.requiredExpansion)}</span>}
        </div>
      </div>
      <div className="build-result__grid">
        <div className="build-result__core">
          <div className="build-details__item build-details__item--exotic">{renderIcon(build.exoticArmor?.hash, 'A', 'detail-icon', true)}</div>
          {build.subclassConfig?.superHash && <div className="build-result__super-icon">{renderIcon(build.subclassConfig.superHash, '*', 'detail-icon detail-icon--super')}</div>}
        </div>
        <div className="build-result__info">
          <h3>{build.name || 'Generated Build'}</h3>
          <div className="result-card__super-name">{build.subclassConfig?.superHash ? manifestService.getName(build.subclassConfig.superHash) : 'Super Ability'}</div>
        </div>
        <div className="build-result__abilities-group">
          <span className="build-result__label">Abilities</span>
          <div className="build-result__abilities">
            <div className="build-details__item build-details__item--small">{renderIcon(build.subclassConfig?.grenadeHash, 'G')}</div>
            <div className="build-details__item build-details__item--small">{renderIcon(build.subclassConfig?.meleeHash, 'M')}</div>
            <div className="build-details__item build-details__item--small">{renderIcon(build.subclassConfig?.classAbilityHash, 'C')}</div>
          </div>
        </div>
      </div>
      <div className="build-details__section">
        <h3>Subclass</h3>
        <div className="build-details__row">
          <div className="build-details__item">{renderIcon(build.subclassConfig?.superHash, 'S')}</div>
          {(build.subclassConfig?.aspects || []).map((h, i) => <div key={`${h}-${i}`} className="build-details__item">{renderIcon(h, 'A')}</div>)}
        </div>
      </div>
      <div className="build-details__compact-grid">
        <div className="build-details__section">
          <h3>Fragments</h3>
          <div className="build-details__row">{(build.subclassConfig?.fragments || []).map((h, i) => <div key={`${h}-${i}`} className="build-details__item">{renderIcon(h, 'F')}</div>)}
          </div>
        </div>
      </div>
      {build?.armorMods && build.armorMods.length > 0 && (
        <div className="build-details__section build-details__section--full">
          <h3>Required Mods</h3>
          <div className="build-details__row" style={{ flexWrap: 'wrap', gap: '8px' }}>
            {build.armorMods.map((h, i) => <div key={`${h}-${i}`} className="build-details__item">{renderIcon(h, 'M', 'slot-icon', false)}</div>)}
          </div>
        </div>
      )}
      <div className="build-details__section build-details__section--full">
        <h3>Playstyle</h3>
        <p className="build-details__description">{build.playstyle || 'No description available.'}</p>
      </div>
      {isEquipping && (
        <div className="equip-progress" style={{ margin: '0 1rem 1rem 1rem', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px' }}>
          <div className="progress-bar-container" style={{ height: '8px', background: '#333', borderRadius: '4px', overflow: 'hidden' }}><div className="progress-fill" style={{ width: `${equipProgress.percent}%`, height: '100%', background: '#4CAF50', transition: 'width 0.2s' }} /></div>
          <div className="progress-text" style={{ marginTop: '5px', fontSize: '0.9rem', color: '#ccc', textAlign: 'center' }}>{equipProgress.message}</div>
        </div>
      )}
      <div className="build-details__actions">
        {isAuthenticated && <button className={`btn btn-primary btn-lg btn-${(build.element || 'void').toLowerCase()}`} onClick={handleEquip} disabled={isEquipping || isSaving}>Equip Build</button>}
        {isAuthenticated && <button className={`btn btn-secondary btn-${(build.element || 'void').toLowerCase()}`} onClick={handleSave} disabled={isSaving || isEquipping}>Save Build</button>}
      </div>
    </GlassCard>
  );
}
export default GeneratorPage;
