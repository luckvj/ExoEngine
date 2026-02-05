import type { DestinyItem, ItemInstance } from '../../types';
import { manifestService } from '../../services/bungie/manifest.service';
import { BUNGIE_CONFIG } from '../../config/bungie.config';
import { getTierClass } from '../../utils/character-helpers';
import { useProfileStore } from '../../store';
import '../../styles/TransmatEffect.css';
import './InventoryBucket.css';

interface InventoryBucketProps {
  items: DestinyItem[];
  itemInstances: Record<string, ItemInstance>;
  maxSlots?: number;
}

export function InventoryBucket({ items, itemInstances, maxSlots = 9 }: InventoryBucketProps) {
  // Pad to maxSlots with empty slots
  const slots = Array.from({ length: maxSlots }, (_, i) => items[i] || null);

  return (
    <div className="inventory-bucket">
      {slots.map((item, index) => {
        if (!item) {
          return <div key={`empty-${index}`} className="inventory-slot inventory-slot--empty" />;
        }

        const def = manifestService.getItem(item.itemHash);
        const iconUrl = def?.icon
          ? `${BUNGIE_CONFIG.bungieNetOrigin}${def.icon}`
          : undefined;
        const instance = item.itemInstanceId ? itemInstances[item.itemInstanceId] : undefined;
        const tierClass = getTierClass(item);

        const { activeTransfers, successfulTransfers } = useProfileStore();
        const instanceId = item?.itemInstanceId;
        const isTransferring = instanceId ? activeTransfers.has(instanceId) : false;
        const isSuccess = instanceId ? successfulTransfers.has(instanceId) : false;

        return (
          <div
            key={item.itemInstanceId || `item-${index}`}
            className={`inventory-slot inventory-slot--${tierClass} ${isTransferring ? 'transfer-active' : ''} ${isSuccess ? 'transfer-success' : ''}`}
            title={def?.name}
          >
            {iconUrl && (
              <img
                src={iconUrl}
                alt={def?.name || ''}
                className="inventory-slot__icon"
                loading="lazy"
              />
            )}
            {instance?.power && (
              <span className="inventory-slot__power">{instance.power}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
