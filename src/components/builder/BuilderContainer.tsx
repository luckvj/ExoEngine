import { type ReactNode, forwardRef, useEffect } from 'react';
import { useProfileStore, useManifestStore, useUIStore } from '../../store';
import { manifestService } from '../../services/bungie/manifest.service';
import { getBungieUrl } from '../../utils/url-helper';
import { SubclassNode } from './SubclassNode';
import { RichTooltip } from './RichTooltip';
import { BUCKET_HASHES } from '../../config/bungie.config';
import { getEquippedItem } from '../../utils/character-helpers';
import './BuilderContainer.css';

interface BuilderContainerProps {
  children: ReactNode;
  onSubclassClick: (itemHash: number, itemInstanceId?: string) => void;
  hoveredSubclass: { item: any; instance?: any } | null;
  setHoveredSubclass: (value: { item: any; instance?: any } | null) => void;
  onSubclassDataReady?: (subclass: any, instance: any) => void;
}

export const BuilderContainer = forwardRef<HTMLDivElement, BuilderContainerProps>(
  function BuilderContainer({
    children,
    onSubclassClick,
    hoveredSubclass,
    setHoveredSubclass,
    onSubclassDataReady
  }, ref) {
    const { isLoaded: manifestLoaded } = useManifestStore();
    const { hideGlobalUI } = useUIStore();
    const {
      selectedCharacterId,
      characterEquipment,
      itemInstances,
    } = useProfileStore();

    const equipment = characterEquipment[selectedCharacterId || ''] || [];

    // --- Subclass Logic ---
    const equippedSubclass = getEquippedItem(equipment, BUCKET_HASHES.SUBCLASS);
    const scDef = manifestLoaded && equippedSubclass ? manifestService.getItem(equippedSubclass.itemHash) : undefined;
    const scIcon = scDef?.displayProperties?.icon ? getBungieUrl(scDef.displayProperties.icon) : undefined;

    // Helper to get element from itemHash
    const getElement = (hash: number): string => {
      if (!manifestLoaded) return 'void';
      const def = manifestService.getItem(hash);
      if (def?.talentGrid?.hudDamageType === 2) return 'arc';
      if (def?.talentGrid?.hudDamageType === 3) return 'solar';
      if (def?.talentGrid?.hudDamageType === 4) return 'void';
      if (def?.talentGrid?.hudDamageType === 6) return 'stasis';
      if (def?.talentGrid?.hudDamageType === 7) return 'strand';
      const name = def?.displayProperties?.name?.toLowerCase() || '';
      if (name.includes('prismatic')) return 'prismatic';
      return 'kinetic';
    };

    // Notify parent when subclass data is ready
    useEffect(() => {
      if (equippedSubclass && onSubclassDataReady) {
        const instance = equippedSubclass.itemInstanceId ? itemInstances[equippedSubclass.itemInstanceId] : undefined;
        onSubclassDataReady(equippedSubclass, instance);
      }
    }, [equippedSubclass?.itemHash, equippedSubclass?.itemInstanceId, onSubclassDataReady]);

    return (
      <div ref={ref} className="builder-container">
        {/* Subclass Selector - Positioned at top - Hidden when away from orbit */}
        {manifestLoaded && equippedSubclass && !hideGlobalUI && (
          <div className="builder-container__subclass-bar">

            {/* Main Active Subclass */}
            <div className={`builder-container__subclass-equipped element-${getElement(equippedSubclass.itemHash)}`}>
              <SubclassNode
                type={(equippedSubclass && getElement(equippedSubclass.itemHash) === 'prismatic') ? 'round' : 'diamond'}
                size="small"
                status="active"
                element={equippedSubclass ? getElement(equippedSubclass.itemHash) as any : 'void'}
                icon={scIcon}
                noBorder={true}
                itemId={equippedSubclass?.itemInstanceId}
                itemHash={equippedSubclass?.itemHash}
                onClick={() => onSubclassClick(equippedSubclass.itemHash, equippedSubclass.itemInstanceId)}
                onMouseEnter={() => setHoveredSubclass({ item: equippedSubclass, instance: equippedSubclass.itemInstanceId ? itemInstances[equippedSubclass.itemInstanceId] : undefined })}
                onMouseLeave={() => setHoveredSubclass(null)}
              />
            </div>

            {/* Subclass Tooltip */}
            {hoveredSubclass && (
              <div className="builder-container__subclass-tooltip">
                <RichTooltip
                  item={hoveredSubclass.item}
                  instance={hoveredSubclass.instance}
                  hideStats={true}
                />
              </div>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className="builder-container__content">
          {children}
        </div>
      </div>
    );
  });
