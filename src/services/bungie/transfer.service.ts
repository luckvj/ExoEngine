import { infoLog, errorLog, debugLog } from '../../utils/logger';
// Handles item transfers, equips, and build application with session tracking and intelligent move strategies

import { BUNGIE_CONFIG, BUCKET_HASHES, DAMAGE_TYPE_HASHES } from '../../config/bungie.config';
import { bungieApi, BungieApiError, PlatformErrorCodes } from './api-client';
import { manifestService } from './manifest.service';
import { profileService, profileLoader } from './profile.service';
import { modService } from './mod.service';
import { useProfileStore, useToastStore } from '../../store';
import type { BuildTemplate, DestinyItem, TransferResult } from '../../types';
import { queueAction } from '../../utils/action-queue';



// Bucket hash to item slot mapping
const EQUIP_BUCKETS = new Set([
  BUCKET_HASHES.KINETIC_WEAPONS,
  BUCKET_HASHES.ENERGY_WEAPONS,
  BUCKET_HASHES.POWER_WEAPONS,
  BUCKET_HASHES.HELMET,
  BUCKET_HASHES.GAUNTLETS,
  BUCKET_HASHES.CHEST_ARMOR,
  BUCKET_HASHES.LEG_ARMOR,
  BUCKET_HASHES.CLASS_ARMOR,
  BUCKET_HASHES.GHOST,
  BUCKET_HASHES.SUBCLASS,
]);

const BUCKET_CAPACITIES: Record<number, number> = {
  [BUCKET_HASHES.KINETIC_WEAPONS]: 10,
  [BUCKET_HASHES.ENERGY_WEAPONS]: 10,
  [BUCKET_HASHES.POWER_WEAPONS]: 10,
  [BUCKET_HASHES.HELMET]: 10,
  [BUCKET_HASHES.GAUNTLETS]: 10,
  [BUCKET_HASHES.CHEST_ARMOR]: 10,
  [BUCKET_HASHES.LEG_ARMOR]: 10,
  [BUCKET_HASHES.CLASS_ARMOR]: 10,
  [BUCKET_HASHES.GHOST]: 10,
  [BUCKET_HASHES.SUBCLASS]: 10,
  [BUCKET_HASHES.CONSUMABLES]: 50,
  [BUCKET_HASHES.MODIFICATIONS]: 50,
};

const VAULT_TOTAL_CAPACITY = 1000;


/**
 * DIM Parity: Legacy hash to current 3.0 subclass hash mappings
 */
const oldToNewItems: Record<number, number> = {
  1334959255: 2328211300, // Arcstrider
  2958378809: 2932390016, // Striker
  1751782730: 3168997075, // Stormcaller
  3635991036: 2240888816, // Gunslinger
  3105935002: 2550323932, // Sunbreaker
  3481861797: 3941205951, // Dawnblade
  3225959819: 2453351420, // Nightstalker
  3382391785: 2842471112, // Sentinel
  3887892656: 2849050827, // Voidwalker
};

export interface MoveSession {
  bucketsFullOnCurrentStore: Set<number>;
  bucketsFullInVault: Set<number>;
  bucketsFullOnOtherStores: Map<string, Set<number>>;
  involvedItems: Set<string | number>;
  excludedItems: Set<string>;
  aborted: boolean;
  errors: string[];
  retryCount: number;
  maxRetries: number;
  startTime: number;
  ultimateTargetChar?: string;
  cancelRequested?: boolean; // DIM parity: cancellation support
  reservations: Record<string, Record<number, number>>;
}

export interface MoveContext {
  originalItemType: number;
  excludes: any[];
  spaceLeft: (store: any, item: DestinyItem) => number;
}

export function createMoveSession(involvedItemIds: Array<string | number> = [], maxRetries = 5, ultimateTargetChar?: string): MoveSession {
  return {
    bucketsFullOnCurrentStore: new Set(),
    bucketsFullInVault: new Set(),
    bucketsFullOnOtherStores: new Map(),
    involvedItems: new Set(involvedItemIds),
    excludedItems: new Set(),
    aborted: false,
    errors: [],
    retryCount: 0,
    maxRetries,
    startTime: Date.now(),
    ultimateTargetChar,
    reservations: {},
  };
}

class TransferService {

  async transferItem(
    itemInstanceId: string,
    itemHash: number,
    toVault: boolean,
    characterId: string,
    stackSize = 1,
    session?: MoveSession,
    options?: { silent?: boolean; skipSpaceCheck?: boolean }
  ): Promise<TransferResult> {
    if (!options?.silent) infoLog('Transfer', 'TransferItem Request', { itemInstanceId, toVault, characterId });
    const { addActiveTransfer } = useProfileStore.getState();
    const { addToast } = useToastStore.getState();

    const targetId = toVault ? 'vault' : characterId;
    addActiveTransfer(itemInstanceId, targetId);

    const membership = await profileService.getPrimaryMembership();
    if (!membership) return { success: false, error: 'No membership', request: { itemId: itemInstanceId, itemHash, toCharacter: targetId, action: 'transfer' } };

    let state = useProfileStore.getState();
    let item = state.getAllInventory().find(i => i.itemInstanceId === itemInstanceId);

    if (!item) {
      debugLog('Transfer', `transferItem: Item ${itemInstanceId} not found in local store. Re-fetching profile for consistency...`);
      await profileLoader.loadProfile(true);
      state = useProfileStore.getState();
      item = state.getAllInventory().find(i => i.itemInstanceId === itemInstanceId);

      if (!item) {
        errorLog('Transfer', `transferItem: Item ${itemInstanceId} still not found after profile refresh.`);
        return { success: false, error: 'ItemNotFound', request: { itemId: itemInstanceId, itemHash, toCharacter: targetId, action: 'transfer' } };
      }
    }

    // DIM Parity: Work around Bungie lock state bug for duplicate hashes
    // https://github.com/Bungie-net/api/issues/764#issuecomment-437614294
    const sourceId = toVault ? characterId : 'vault';
    const sourceItems = sourceId === 'vault' ? state.vaultInventory : (state.characterInventories[sourceId] || []);
    const hasDuplicates = sourceItems.filter((i: any) => i.itemHash === item.itemHash).length > 1;
    const overrideLockState = (item.lockable && hasDuplicates) ? ((item.state & 1) === 1) : undefined;
    const wasLocked = (item.state & 1) === 1;

    if (session) {
      if (toVault && session.bucketsFullInVault.has(this.getNativeBucketHash(item))) return { success: false, error: 'Vault full', request: { itemId: itemInstanceId, itemHash, toCharacter: 'vault', action: 'transfer' } };
    }

    // DIM Parity: Proactive Space Check
    // Before attempting transfer, check if destination has space. If not, try to make space immediately.
    // This avoids the 500 error from Bungie when moving to full inventory.
    // Skip if caller already handled space (e.g., moveToStore is called after ensureValidTransfer)
    if (!toVault && !options?.skipSpaceCheck) {
      const store = state.characters.find(c => c.characterId === characterId);
      if (store) {
        const bucketHash = this.getNativeBucketHash(item);
        const space = this.getSpaceInBucket(bucketHash, characterId, state, session);

        if (space <= 0) {
          infoLog('Transfer', `Destination ${characterId} full for ${bucketHash}. Making space...`);
          const movedAside = await this.ensureCanMoveToStore(item, store, 1, session || createMoveSession([itemInstanceId]));
          if (!movedAside) {
            return { success: false, error: 'NoSpace', request: { itemId: itemInstanceId, itemHash, toCharacter: characterId, action: 'transfer' } };
          }
          // Refresh state after making space
          state = useProfileStore.getState();
        }
      }
    }

    try {
      profileService.updateLocalStore({
        instanceId: itemInstanceId,
        sourceId: toVault ? characterId : 'vault',
        targetId: toVault ? 'vault' : characterId,
        isEquip: false
      });

      const endpoint = item.bucketHash === BUCKET_HASHES.POSTMASTER ? BUNGIE_CONFIG.endpoints.pullFromPostmaster : BUNGIE_CONFIG.endpoints.transferItem;
      await bungieApi.post(endpoint, {
        itemReferenceHash: itemHash,
        stackSize,
        transferToVault: toVault,
        itemId: itemInstanceId,
        characterId,
        membershipType: membership.membershipType,
      }, true);

      if (overrideLockState !== undefined) {
        // DIM Parity: Reset lock status asynchronously to work around Bungie bug
        (async () => {
          const lockCharId = toVault ? state.characters[0].characterId : characterId;
          infoLog('Transfer', `Resetting lock status of ${item?.itemHash} to ${overrideLockState} to work around Bungie.net lock state bug`);
          await this.setItemLockState(itemInstanceId, lockCharId, overrideLockState);
        })();
      } else if (wasLocked) {
        const lockCharId = toVault ? state.characters[0].characterId : characterId;
        await this.setItemLockState(itemInstanceId, lockCharId, true);
      }

      if (!options?.silent) {
        const itemDef = manifestService.getItem(itemHash);
        addToast({ type: 'success', message: `${itemDef?.displayProperties?.name || 'Item'} moved`, duration: 2000 });
      }

      return { success: true, request: { itemId: itemInstanceId, itemHash, toCharacter: targetId, action: 'transfer' } };
    } catch (error: any) {
      // DIM Parity: Retry on 500/504/1601 (ItemNotFound) errors with backoff
      const isRetryable = error?.httpStatus === 500 || error?.httpStatus === 504 || error?.errorCode === 1601;

      if (isRetryable && !options?.silent) {
        if (!session || session.retryCount < 3) {
          const waitTime = error?.errorCode === 1601 ? 2000 : 1000 * (session ? session.retryCount + 1 : 1);
          infoLog('Transfer', `Retryable error (${error?.errorCode || error?.httpStatus}) during transfer of ${itemInstanceId}. Waiting ${waitTime}ms and retrying...`);

          await new Promise(r => setTimeout(r, waitTime));
          if (session) session.retryCount++;
          return this.transferItem(itemInstanceId, itemHash, toVault, characterId, stackSize, session, options);
        }
      }

      // DIM Parity: Handle ghost success for 500 errors
      if (error?.httpStatus === 500 || error?.isPotentialSuccess) {
        infoLog('Transfer', `500 error during transfer of ${itemInstanceId}. Verifying ghost success...`);
        // Wait for eventual consistency
        await new Promise(r => setTimeout(r, 1500));
        await profileLoader.loadProfile(true);

        let latestState = useProfileStore.getState();
        let latestItem = latestState.getAllInventory().find(i => i.itemInstanceId === itemInstanceId);
        let actualLocation = latestItem ? this.getItemSource(latestItem) : 'unknown';
        const targetLocation = toVault ? 'vault' : characterId;

        if (actualLocation === targetLocation) {
          infoLog('Transfer', `Ghost success detected for ${itemInstanceId} manual transfer to ${targetLocation}`);
          if (!options?.silent && !toVault) {
            const def = manifestService.getItem(itemHash);
            const itemName = def?.displayProperties?.name || 'Item';
            addToast({ type: 'success', message: `${itemName} moved to character` });
          }
          return { success: true, request: { itemId: itemInstanceId, itemHash, toCharacter: targetId, action: 'transfer' } };
        }

        // Second check after another small delay if first failed
        await new Promise(r => setTimeout(r, 1000));
        await profileLoader.loadProfile(true);
        latestState = useProfileStore.getState();
        latestItem = latestState.getAllInventory().find(i => i.itemInstanceId === itemInstanceId);
        actualLocation = latestItem ? this.getItemSource(latestItem) : 'unknown';
        if (actualLocation === targetLocation) {
          infoLog('Transfer', `Ghost success detected (retry) for ${itemInstanceId} manual transfer to ${targetLocation}`);
          if (!options?.silent && !toVault) {
            const def = manifestService.getItem(itemHash);
            const itemName = def?.displayProperties?.name || 'Item';
            addToast({ type: 'success', message: `${itemName} moved to character` });
          }
          return { success: true, request: { itemId: itemInstanceId, itemHash, toCharacter: targetId, action: 'transfer' } };
        }
      }

      const isNoRoom = (error instanceof BungieApiError && error.isNoRoomError()) || error?.errorCode === 1622;
      profileLoader.loadProfile(true);
      if (!options?.silent) addToast({ type: 'error', message: error.message || 'Transfer failed' });
      return { success: false, error: isNoRoom ? 'NoSpace' : error.message, request: { itemId: itemInstanceId, itemHash, toCharacter: targetId, action: 'transfer' } };
    } finally {
      useProfileStore.getState().removeActiveTransfer(itemInstanceId);
    }
  }

  async equipItem(itemInstanceId: string, characterId: string, options?: { silent?: boolean }): Promise<TransferResult> {
    const { addActiveTransfer } = useProfileStore.getState();
    const { addToast } = useToastStore.getState();
    addActiveTransfer(itemInstanceId, characterId);

    const state = useProfileStore.getState();
    const character = state.characters.find(c => c.characterId === characterId);
    if (!character) return { success: false, error: 'Char not found', request: { itemId: itemInstanceId, itemHash: 0, toCharacter: characterId, action: 'equip' } };

    const item = state.getAllInventory().find(i => i.itemInstanceId === itemInstanceId);
    if (item) {
      const isEquippedOnTarget = (state.characterEquipment[characterId] || []).some(i => i.itemInstanceId === itemInstanceId);
      if (isEquippedOnTarget) {
        debugLog('Transfer', `Item ${item.itemHash} is already equipped on ${characterId}. Skipping API call.`);
        return { success: true, request: { itemId: itemInstanceId, itemHash: item.itemHash, toCharacter: characterId, action: 'equip' } };
      }
    }

    const membership = await profileService.getPrimaryMembership();
    const membershipType = membership?.membershipType ?? character.membershipType;

    // Resolve exotic conflicts
    if (item) {
      const itemDef = manifestService.getItem(item.itemHash);
      if (itemDef?.inventory?.equippingLabel) {
        const currentEquipment = state.characterEquipment?.[characterId] || [];
        const conflict = currentEquipment.find(i => {
          const def = manifestService.getItem(i.itemHash);
          return def?.inventory?.equippingLabel === itemDef.inventory?.equippingLabel && i.itemInstanceId !== itemInstanceId && i.bucketHash !== item.bucketHash;
        });

        if (conflict) {
          infoLog('Transfer', `Resolving exotic conflict: Unequipping ${conflict.itemInstanceId} to equip ${itemInstanceId}`);
          // DIM Parity: Exclude both the item being equipped AND the conflicting item from replacement search
          const exclude = new Set<string | number>([itemInstanceId, conflict.itemInstanceId!]);
          const replacement = this.findReplacementItem(conflict.bucketHash, characterId, exclude, character.classType);

          if (replacement) {
            const src = this.getItemSource(replacement);
            if (src !== characterId) {
              const session = createMoveSession([replacement.itemInstanceId!, itemInstanceId], 3, characterId);
              const res = await this.moveItem(replacement, src, characterId, session, { silent: true });
              if (!res.success) {
                errorLog('Transfer', `Failed to move replacement ${replacement.itemInstanceId} for exotic conflict: ${res.error}`);
                return res;
              }
            }
            const equipRes = await this.equipItem(replacement.itemInstanceId!, characterId, { silent: true });
            if (!equipRes.success) {
              errorLog('Transfer', `Failed to equip replacement ${replacement.itemInstanceId}: ${equipRes.error}`);
              // Don't fail the whole operation - Bungie might still allow the equip
            }
          } else {
            errorLog('Transfer', `No replacement found for conflicting exotic in bucket ${conflict.bucketHash}`);
            // DIM Parity: If no replacement found, the equip will likely fail - let Bungie handle it
          }
        }
      }
    }

    try {
      profileService.updateLocalStore({ instanceId: itemInstanceId, sourceId: characterId, targetId: characterId, isEquip: true });
      await bungieApi.post(BUNGIE_CONFIG.endpoints.equipItem, { itemId: itemInstanceId, characterId, membershipType }, true);

      if (!options?.silent) {
        const itemDef = manifestService.getItem(useProfileStore.getState().itemInstances[itemInstanceId]?.itemHash || 0);
        addToast({ type: 'success', message: `${itemDef?.displayProperties?.name || 'Item'} equipped`, duration: 3000 });
      }
      return { success: true, request: { itemId: itemInstanceId, itemHash: 0, toCharacter: characterId, action: 'equip' } };
    } catch (error: any) {
      const errorCode = error?.errorCode;

      // DIM Parity: Retry on 500/504 errors
      if ((error?.httpStatus === 500 || error?.httpStatus === 504) && !options?.silent) {
        // Simple retry counter check (using a local variable since equip doesn't always have a session passed in the same way)
        // For now, we just do one retry for equip if it's a server error
        if (!options?.silent) { // Don't infinite loop if silent is false but we re-call with silent=false
          infoLog('Transfer', `500 error during equip of ${itemInstanceId}. Retrying once...`);
          await new Promise(r => setTimeout(r, 1000));
          return this.equipItem(itemInstanceId, characterId, { ...options, silent: true });
        }
      }

      // DIM Parity: Handle ghost success for 500 errors
      if (error?.httpStatus === 500 || error?.isPotentialSuccess) {
        debugLog('Transfer', `500 error during equip of ${itemInstanceId}. Verifying ghost success...`);
        await new Promise(r => setTimeout(r, 1500));
        await profileLoader.loadProfile(true);

        let currentInstance = useProfileStore.getState().itemInstances[itemInstanceId];
        if (currentInstance?.isEquipped) {
          infoLog('Transfer', `Ghost success detected for ${itemInstanceId} equip on ${characterId}`);
          if (!options?.silent) {
            const itemName = manifestService.getName(currentInstance.itemHash || 0) || 'Item';
            addToast({ type: 'success', message: `${itemName} equipped` });
          }
          return { success: true, request: { itemId: itemInstanceId, itemHash: 0, toCharacter: characterId, action: 'equip' } };
        }

        // Retry check
        await new Promise(r => setTimeout(r, 1000));
        await profileLoader.loadProfile(true);
        currentInstance = useProfileStore.getState().itemInstances[itemInstanceId];
        if (currentInstance?.isEquipped) {
          infoLog('Transfer', `Ghost success detected (retry) for ${itemInstanceId} equip on ${characterId}`);
          if (!options?.silent) {
            const itemName = manifestService.getName(currentInstance.itemHash || 0) || 'Item';
            addToast({ type: 'success', message: `${itemName} equipped` });
          }
          return { success: true, request: { itemId: itemInstanceId, itemHash: 0, toCharacter: characterId, action: 'equip' } };
        }
      }

      if (errorCode === PlatformErrorCodes.DestinyItemNotFound || error?.httpStatus === 500) {
        await profileLoader.loadProfile(true);
        const currentInstance = useProfileStore.getState().itemInstances[itemInstanceId];
        if (currentInstance?.isEquipped) return { success: true, request: { itemId: itemInstanceId, itemHash: 0, toCharacter: characterId, action: 'equip' } };
      }
      if (!options?.silent) addToast({ type: 'error', message: error.message || 'Equip failed' });
      return { success: false, error: error.message, request: { itemId: itemInstanceId, itemHash: 0, toCharacter: characterId, action: 'equip' } };
    } finally {
      useProfileStore.getState().removeActiveTransfer(itemInstanceId);
    }
  }

  async smartTransfer(itemInstanceId: string, itemHash: number, toVault: boolean, characterId: string, session: MoveSession, options?: { silent?: boolean }): Promise<TransferResult> {
    const state = useProfileStore.getState();
    const item = state.getAllInventory().find(i => i.itemInstanceId === itemInstanceId);
    if (!item) return { success: false, error: 'Not found', request: { itemId: itemInstanceId, itemHash, toCharacter: toVault ? 'vault' : characterId, action: 'transfer' } };
    return this.moveItem(item, this.getItemSource(item), toVault ? 'vault' : characterId, session, options);
  }

  async snapshotLoadout(characterId: string, loadoutIndex: number): Promise<{ success: boolean; error?: string }> {
    const membership = await profileService.getPrimaryMembership();
    const identifiers = manifestService.getDefaultLoadoutIdentifiers();
    if (!membership || !identifiers) return { success: false, error: 'Missing data' };
    try {
      await bungieApi.post(BUNGIE_CONFIG.endpoints.snapshotLoadout, {
        loadoutIndex,
        characterId,
        membershipType: membership.membershipType,
        colorHash: identifiers.colorHash,
        iconHash: identifiers.iconHash,
        nameHash: identifiers.nameHash
      }, true);
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  }

  async moveItemToVault(characterId: string, bucketHash: number): Promise<TransferResult> {
    const state = useProfileStore.getState();
    const session = createMoveSession([], 1);
    const candidates = this.findMoveAsideCandidates(bucketHash, characterId, session, state);
    if (candidates.length > 0) return this.moveItem(candidates[0], characterId, 'vault', session, { silent: true });
    return { success: false, error: 'No candidates', request: { itemId: '', itemHash: 0, toCharacter: 'vault', action: 'transfer' } };
  }

  async applyItemSocketOverrides(itemInstanceId: string, overrides: Record<number, number>, characterId: string, _options?: { silent?: boolean }): Promise<void> {
    const state = useProfileStore.getState();
    const instance = state.itemInstances[itemInstanceId];
    for (const [idx, hash] of Object.entries(overrides)) {
      const socketIndex = parseInt(idx);
      if (instance?.sockets?.find(s => s.socketIndex === socketIndex)?.plugHash === hash) continue;
      try {
        await this.insertSocketPlugFree(itemInstanceId, hash, socketIndex, characterId, { silent: true });
        await new Promise(r => setTimeout(r, 250));
      } catch (e: any) {
        if (e.httpStatus === 500 || e.errorCode === 5) {
          await profileLoader.loadProfile(true);
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
    await profileLoader.loadProfile(true);
  }

  async equipItems(itemInstanceIds: string[], characterId: string, retryDepth = 0, options?: { silent?: boolean }): Promise<{ success: boolean; error?: string; failedIds: string[]; results: Record<string, number> }> {
    if (itemInstanceIds.length === 0) return { success: true, failedIds: [], results: {} };
    if (retryDepth > 2) return { success: false, failedIds: itemInstanceIds, results: {} };

    const state = useProfileStore.getState();
    const character = state.characters.find(c => c.characterId === characterId);

    // DIM Parity: Filter out items that are already equipped on the target character
    const targetEquipment = state.characterEquipment[characterId] || [];
    const filteredIds = itemInstanceIds.filter(id => !targetEquipment.some(eq => eq.itemInstanceId === id));

    if (filteredIds.length === 0) {
      debugLog('Transfer', `All items in bulk request are already equipped on ${characterId}. Skipping API call.`);
      return { success: true, failedIds: [], results: {} };
    }

    const membership = await profileService.getPrimaryMembership();
    const membershipType = membership?.membershipType ?? character?.membershipType;

    try {
      const response = await bungieApi.post<{ equipResults: Array<{ itemInstanceId: string; equipStatus: number }> }>(
        BUNGIE_CONFIG.endpoints.equipItems,
        { itemIds: filteredIds, characterId, membershipType },
        true
      );

      const results: Record<string, number> = {};
      const failedIds: string[] = [];
      let restricted = false;

      response.equipResults.forEach(r => {
        results[r.itemInstanceId] = r.equipStatus;
        if (r.equipStatus === 1) profileService.updateLocalStore({ instanceId: r.itemInstanceId, sourceId: characterId, targetId: characterId, isEquip: true });
        else {
          failedIds.push(r.itemInstanceId);
          if (r.equipStatus === 1634 || r.equipStatus === 1663) restricted = true;
        }
      });

      if (failedIds.length > 0 && retryDepth < 2 && !restricted) {
        await new Promise(r => setTimeout(r, 2000));
        await profileLoader.loadProfile(true);
        return this.equipItems(failedIds, characterId, retryDepth + 1, options);
      }

      return { success: failedIds.length === 0, error: restricted ? 'ORBIT_REQUIRED' : undefined, failedIds, results };
    } catch (error: any) {
      if (error?.httpStatus === 500 || error?.isPotentialSuccess) {
        debugLog('Transfer', `500 error during bulk equip on ${characterId}. Verifying ghost success...`);
        await new Promise(r => setTimeout(r, 1200));
        await profileLoader.loadProfile(true);

        const latestState = useProfileStore.getState();
        const latestEquipment = latestState.characterEquipment[characterId] || [];
        const results: Record<string, number> = {};
        const failedIds: string[] = [];

        itemInstanceIds.forEach(id => {
          const isEquipped = latestEquipment.some(eq => eq.itemInstanceId === id);
          if (isEquipped) {
            results[id] = 1;
            profileService.updateLocalStore({ instanceId: id, sourceId: characterId, targetId: characterId, isEquip: true });
          } else {
            failedIds.push(id);
            results[id] = 0;
          }
        });

        if (failedIds.length < itemInstanceIds.length) {
          infoLog('Transfer', `Partial ghost success detected for bulk equip on ${characterId}. ${itemInstanceIds.length - failedIds.length} items equipped.`);
          return { success: failedIds.length === 0, failedIds, results };
        }
      }

      return { success: false, error: error.message, failedIds: itemInstanceIds, results: {} };
    }
  }

  async equipBuild(template: BuildTemplate, characterId: string, onProgress?: (step: string, progress: number) => void, transferOnly = false, options?: { silent?: boolean }): Promise<{ success: boolean; error?: string; missing: string[]; failed: string[]; equipped: string[]; session?: MoveSession }> {
    return queueAction(async () => {
      const store = useProfileStore.getState();
      if (store.selectedCharacterId !== characterId) store.setSelectedCharacter(characterId);

      await profileLoader.loadProfile(true);
      const state = useProfileStore.getState();
      const all = state.getAllInventory();
      const missing: string[] = [];

      const getLoadoutItem = (loadoutItemHash: number, _name: string, storeId: string): DestinyItem | undefined => {
        const hash = oldToNewItems[loadoutItemHash] ?? loadoutItemHash;
        const candidates = all.filter(i => i.itemHash === hash);

        // DIM Parity: Priority 1: Item already on the target character
        const held = candidates.find(i => this.getItemSource(i) === storeId);
        if (held) return held;

        // DIM Parity: Priority 2: First candidate found elsewhere, UNLESS it's notransfer
        const firstInRange = candidates[0];
        if (firstInRange) {
          // 2 = Not transferable (from DestinyItem.transferStatus)
          const isNoTransfer = (firstInRange.transferStatus & 2) === 2;
          if (!isNoTransfer) return firstInRange;
        }

        return undefined;
      };

      const findOrTrack = (hash: number, name: string) => {
        const item = getLoadoutItem(hash, name, characterId);
        if (!item) missing.push(name || hash.toString());
        return item;
      };

      const exoticW = template.exoticWeapon ? findOrTrack(template.exoticWeapon.hash, template.exoticWeapon.name || '') : undefined;
      const exoticA = template.exoticArmor ? findOrTrack(template.exoticArmor.hash, template.exoticArmor.name || '') : undefined;

      const character = state.characters.find(c => c.characterId === characterId);
      const targetItems = [...(state.characterInventories[characterId] || []), ...(state.characterEquipment[characterId] || [])];

      // DIM Parity: Subclasses are NOT transferable. We MUST find one on the target character.
      let subclass: DestinyItem | undefined = undefined;
      const subclassConfig = template.subclassConfig;
      if (subclassConfig?.subclassHash) {
        const hash = oldToNewItems[subclassConfig.subclassHash] ?? subclassConfig.subclassHash;
        subclass = targetItems.find(i => i.itemHash === hash);
      }

      // Fallback: match by element hash on character (matches "always pulls the subclass... if it can")
      if (!subclass && template.element) {
        subclass = this.findSubclassItem(template.element, targetItems, character?.classType);
      }

      if (!subclass) {
        missing.push(`Subclass (${template.element})`);
      }

      if (missing.length > 0 && !options?.silent) {
        useToastStore.getState().addToast({
          type: 'warning',
          message: `Some loadout items missing: ${missing.join(', ')}. Equipping remaining components.`,
          duration: 4000
        });
      }

      const itemsToMove: DestinyItem[] = [];
      if (exoticW && this.itemCanBeEquippedBy(exoticW, characterId)) itemsToMove.push(exoticW);
      if (exoticA && this.itemCanBeEquippedBy(exoticA, characterId)) itemsToMove.push(exoticA);
      if (subclass && this.itemCanBeEquippedBy(subclass, characterId)) itemsToMove.push(subclass);

      (template.items || []).forEach(ti => {
        const i = findOrTrack(ti.hash, ti.name || '');
        if (i && this.itemCanBeEquippedBy(i, characterId)) {
          itemsToMove.push(i);
        }
      });

      const session = createMoveSession(itemsToMove.map(i => i.itemInstanceId!).filter(Boolean), 5, characterId);
      if (!onProgress) onProgress = () => { };

      let replacements: DestinyItem[] = [];
      const moveFailures: { hash: number; name: string }[] = [];
      let equipRestricted = false;
      const failed: string[] = [];
      let ids: string[] = [];

      try {
        onProgress('Dequipping Conflicts...', 15);
        const itemsToDequip = itemsToMove.filter(i => (i.transferStatus & 1) === 1 && this.getItemSource(i) !== characterId);
        for (const item of itemsToDequip) {
          try {
            await profileService.ensureItemUnequipped(this.getItemSource(item), item.itemInstanceId!);
          } catch (e) {
            errorLog('Transfer', `Initial dequip failed for ${item.itemHash}`, e);
          }
        }

        replacements = await this.resolveExoticConflicts(characterId, exoticW, exoticA, session);
        await profileLoader.loadProfile(true);

        onProgress('Moving Gear...', 40);
        for (const i of itemsToMove) {
          const src = this.getItemSource(i);
          if (src !== characterId) {
            let res = await this.moveItem(i, src, characterId, session, { silent: true });
            if (!res.success) {
              await profileLoader.loadProfile(true);
              res = await this.moveItem(i, this.getItemSource(i), characterId, session, { silent: true });
              if (!res.success) {
                const def = manifestService.getItem(i.itemHash);
                moveFailures.push({ hash: i.itemHash, name: def?.displayProperties?.name || i.itemHash.toString() });
              }
            }
          }
        }

        if (transferOnly) return { success: true, session, missing, failed: [], equipped: [] };

        onProgress('Equipping Build...', 60);

        // 1. Bulk Equip Gear (Weapons/Armor)
        ids = Array.from(new Set(replacements.concat(itemsToMove).map(i => i.itemInstanceId!)));
        const equipRes = await this.equipItems(ids, characterId, 0, { silent: true });
        if (equipRes.error === 'ORBIT_REQUIRED') equipRestricted = true;

        (equipRes as any).failedIds?.forEach((fid: string) => {
          const item = state.itemInstances[fid];
          failed.push(item?.itemHash ? (manifestService.getItem(item.itemHash)?.displayProperties.name || fid) : fid);
        });

        // 2. Subclass Pre-Equip (DIM Parity: Must be equipped before configuration)
        if (subclass && !template.skipSubclassSwap) {
          try {
            const currentSubclass = (state.characterEquipment[characterId] || []).find(i => i.bucketHash === BUCKET_HASHES.SUBCLASS);
            if (currentSubclass?.itemInstanceId !== subclass.itemInstanceId) {
              onProgress('Switching Subclass...', 70);
              await this.equipItem(subclass.itemInstanceId!, characterId, { silent: true });
              // DIM Parity: settle interval
              await new Promise(r => setTimeout(r, 1000));
              await profileLoader.loadProfile(true);
            }
          } catch {
            equipRestricted = true;
            errorLog('Transfer', 'Subclass pre-equip failed');
          }
        }
      } catch (e) {
        errorLog('Transfer', 'Gear phase failure (continuing to subclass/mods)', e);
      }

      const failureNames = [...new Set([...failed, ...moveFailures.map(f => f.name)])];
      const hasMajorFailures = failureNames.length > 0;

      // DIM Parity: Configuration phase (always happens sequentially after gear is settled)
      if (!template.skipSocketOverrides) {
        // 3. Subclass Configuration (Supers, Abilities, Aspects, Fragments)
        if (subclass && template.subclassConfig) {
          onProgress('Configuring Subclass...', 85);
          try {
            await this.applySubclassConfiguration(subclass, template.subclassConfig, characterId, (s: string) => onProgress!(s, 85), { silent: true });
          } catch (e) {
            errorLog('Transfer', `Failed to apply subclass config: ${e}`);
          }
        }

        // 4. Armor Mods (General then Fashion)
        if (template.armorMods?.length) {
          onProgress('Applying Armor Mods...', 95);
          try {
            await this.applyArmorMods(characterId, template.armorMods, (s: string) => onProgress!(s, 95), { silent: true });
          } catch (e) {
            errorLog('Transfer', `Failed to apply armor mods: ${e}`);
          }
        }
      }

      if (!options?.silent) {
        let msg = `${template.name} equipped successfully!`;
        let toastType: 'success' | 'warning' | 'error' = 'success';

        if (equipRestricted) {
          msg = `${template.name} moved, but Orbit is required to equip.`;
          toastType = 'warning';
        } else if (hasMajorFailures || missing.length > 0) {
          msg = `${template.name} applied with issues. Check notifications.`;
          toastType = 'warning';
        }

        useToastStore.getState().addToast({ type: toastType, message: msg });
      }

      return { success: !equipRestricted && !hasMajorFailures, session, missing, failed: failureNames, equipped: ids };
    }).catch(err => {
      errorLog('Transfer', 'EquipBuild Fatal', err);
      return { success: false, error: err.message, missing: [], failed: [], equipped: [] };
    });
  }

  /**
   * DIM Parity: executeMoveItem equivalent
   * Move item to target store, optionally equipping it.
   *
   * KEY DIFFERENCE FROM BEFORE: For char-to-char transfers, we now:
   * 1. Dequip at source FIRST
   * 2. Move to vault (no exotic check needed - equip=false)
   * 3. Then call ensureValidTransfer which handles BOTH space AND exotic conflicts
   * 4. Move from vault to target
   * 5. Equip if requested
   */
  async moveItem(item: DestinyItem, sourceId: string, targetId: string, session?: MoveSession, options?: { silent?: boolean; equip?: boolean }): Promise<TransferResult> {
    const s = session || createMoveSession([item.itemInstanceId!]);
    let state = useProfileStore.getState();
    const equip = options?.equip ?? false;

    // DIM Parity Lock Bug Workaround: Record lock state if duplicates exist
    const isLocked = state.itemInstances[item.itemInstanceId!]?.isLocked;
    const hasDuplicates = (sourceId === 'vault'
      ? state.vaultInventory.filter(i => i.itemHash === item.itemHash && this.getNativeBucketHash(i) === this.getNativeBucketHash(item))
      : [...(state.characterEquipment[sourceId] || []), ...(state.characterInventories[sourceId] || [])]
        .filter(i => i.itemHash === item.itemHash && i.bucketHash === item.bucketHash)
    ).length > 1;
    const lockResetState = (isLocked !== undefined && hasDuplicates) ? isLocked : undefined;

    // Same store - just equip if needed
    if (sourceId === targetId) {
      if (equip) return this.equipItem(item.itemInstanceId!, targetId, options);
      return { success: true, request: { itemId: item.itemInstanceId!, itemHash: item.itemHash, toCharacter: targetId, action: 'transfer' } };
    }

    const sourceIsVault = sourceId === 'vault';
    const targetIsVault = targetId === 'vault';
    const isCharToChar = !sourceIsVault && !targetIsVault;

    // ═══════════════════════════════════════════════════════════════════════════
    // CASE 1: Character to Character (requires vault routing)
    // DIM Pattern: dequip at source → ensureValidTransfer(vault) → moveToVault →
    //              ensureValidTransfer(target, equip) → moveToStore → equip if needed
    // ═══════════════════════════════════════════════════════════════════════════
    if (isCharToChar) {
      // Step 1: Dequip at source if equipped
      const isEquippedAtSource = (state.characterEquipment[sourceId] || []).some(i => i.itemInstanceId === item.itemInstanceId);
      if (isEquippedAtSource) {
        // DIM Parity: When dequipping an exotic, we must replace it with a non-exotic
        // Otherwise we might try to equip an exotic replacement which conflicts with other equipped exotics
        const itemDef = manifestService.getItem(item.itemHash);
        const itemIsExotic = itemDef?.tierType === 6;

        infoLog('Transfer', `[Char→Char] Step 1: Dequipping ${item.itemHash} at source ${sourceId} (exotic=${itemIsExotic})`);
        const dequipped = await profileService.ensureItemUnequipped(sourceId, item.itemInstanceId!, itemIsExotic, s);
        if (!dequipped) {
          errorLog('Transfer', `Failed to dequip ${item.itemHash} at source`);
          return { success: false, error: 'Dequip failed at source', request: { itemId: item.itemInstanceId!, itemHash: item.itemHash, toCharacter: targetId, action: 'transfer' } };
        }
        await new Promise(r => setTimeout(r, 200));
        state = useProfileStore.getState();
      }

      // Step 2: Ensure vault has space (NO exotic check - equip=false for vault)
      infoLog('Transfer', `[Char→Char] Step 2: Ensuring vault space for ${item.itemHash}`);
      const vaultStore = { id: 'vault', isVault: true, items: state.vaultInventory };
      if (!(await this.ensureCanMoveToStore(item, vaultStore, 1, s))) {
        return { success: false, error: 'No space in vault', request: { itemId: item.itemInstanceId!, itemHash: item.itemHash, toCharacter: targetId, action: 'transfer' } };
      }

      // Step 3: Move to vault via API
      infoLog('Transfer', `[Char→Char] Step 3: Moving ${item.itemHash} to vault`);
      const toVaultRes = await this.moveToStore(item, sourceId, 'vault', false, s, { silent: true });
      if (!toVaultRes.success) return toVaultRes;

      // Short delay for Bungie backend consistency
      await new Promise(r => setTimeout(r, 200));
      state = useProfileStore.getState();

      // Step 4: ensureValidTransfer for target - THIS handles exotic conflicts!
      infoLog('Transfer', `[Char→Char] Step 4: Ensuring target space + exotic conflicts for ${item.itemHash}`);
      const targetChar = state.characters.find((c: any) => c.characterId === targetId);
      if (targetChar) {
        // Wrap with id property for ensureCanMoveToStore compatibility
        const targetStore = { ...targetChar, id: targetId };
        const valid = await this.ensureValidTransfer(equip, targetStore, item, 1, s);
        if (!valid) {
          return { success: false, error: 'Cannot complete transfer to target', request: { itemId: item.itemInstanceId!, itemHash: item.itemHash, toCharacter: targetId, action: 'transfer' } };
        }
      }

      // Step 5: Move from vault to target via API
      infoLog('Transfer', `[Char→Char] Step 5: Moving ${item.itemHash} from vault to ${targetId}`);
      const toTargetRes = await this.moveToStore(item, 'vault', targetId, equip, s, options);
      if (!toTargetRes.success) return toTargetRes;

      // Step 6: Final equip check (moveToStore handles equip, but double-check)
      state = useProfileStore.getState();
      const isNowEquipped = (state.characterEquipment[targetId] || []).some(i => i.itemInstanceId === item.itemInstanceId);
      if (equip && !isNowEquipped) {
        infoLog('Transfer', `[Char→Char] Step 6: Final equip for ${item.itemHash}`);
        return this.equipItem(item.itemInstanceId!, targetId, options);
      }

      this.handleLockStateReset(item, targetId, lockResetState, state);
      return toTargetRes;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CASE 2: Vault ↔ Character (single hop)
    // ═══════════════════════════════════════════════════════════════════════════

    // Dequip at source if moving FROM character and item is equipped
    if (!sourceIsVault) {
      const isEquippedAtSource = (state.characterEquipment[sourceId] || []).some(i => i.itemInstanceId === item.itemInstanceId);
      if (isEquippedAtSource) {
        // DIM Parity: When dequipping an exotic, we must replace it with a non-exotic
        const itemDef = manifestService.getItem(item.itemHash);
        const itemIsExotic = itemDef?.tierType === 6;

        infoLog('Transfer', `[Single-hop] Dequipping ${item.itemHash} at source ${sourceId} (exotic=${itemIsExotic})`);
        const dequipped = await profileService.ensureItemUnequipped(sourceId, item.itemInstanceId!, itemIsExotic, s);
        if (!dequipped) {
          return { success: false, error: 'Dequip failed at source', request: { itemId: item.itemInstanceId!, itemHash: item.itemHash, toCharacter: targetId, action: 'transfer' } };
        }
        await new Promise(r => setTimeout(r, 200));
        state = useProfileStore.getState();
      }
    }

    // Determine target store for space/exotic check
    // Note: Characters need id property for ensureCanMoveToStore compatibility
    const targetChar = targetIsVault ? null : state.characters.find((c: any) => c.characterId === targetId);
    const store = targetIsVault
      ? { id: 'vault', isVault: true, items: state.vaultInventory }
      : targetChar ? { ...targetChar, id: targetId } : null;

    if (store) {
      // ensureValidTransfer handles BOTH space AND exotic conflicts
      const valid = await this.ensureValidTransfer(equip && !targetIsVault, store, item, 1, s);
      if (!valid) {
        return { success: false, error: 'No space available', request: { itemId: item.itemInstanceId!, itemHash: item.itemHash, toCharacter: targetId, action: 'transfer' } };
      }
    }

    // Perform the transfer + optional equip
    const res = await this.moveToStore(item, sourceId, targetId, equip && !targetIsVault, s, options);

    this.handleLockStateReset(item, targetId, lockResetState, state);
    return res;
  }

  /**
   * DIM Parity: ensureValidTransfer
   * Ensures the transfer is valid by:
   * 1. Checking if equip is possible (class/level)
   * 2. Handling exotic conflicts if equipping an exotic
   * 3. Ensuring space is available
   */
  private async ensureValidTransfer(
    equip: boolean,
    store: any,
    item: DestinyItem,
    amount: number,
    session: MoveSession
  ): Promise<boolean> {
    const def = manifestService.getItem(item.itemHash);

    if (equip && !store.isVault) {
      // Check exotic conflict and resolve it
      if (def?.inventory?.equippingLabel) {
        const canEquip = await this.canEquipExotic(item, store, session);
        if (!canEquip) {
          errorLog('Transfer', `Cannot equip exotic ${item.itemHash} on ${store.id || store.characterId}`);
          return false;
        }
      }
    }

    // Ensure space is available
    return this.ensureCanMoveToStore(item, store, amount, session);
  }

  /**
   * DIM Parity: canEquipExotic
   * Checks if an exotic can be equipped and dequips any conflicting exotic.
   * Returns true if exotic can be equipped, false if conflict couldn't be resolved.
   */
  private async canEquipExotic(item: DestinyItem, store: any, session: MoveSession): Promise<boolean> {
    const def = manifestService.getItem(item.itemHash);
    if (!def?.inventory?.equippingLabel) return true;

    const storeId = store.id || store.characterId;
    const state = useProfileStore.getState();
    const currentEq = state.characterEquipment[storeId] || [];
    const label = def.inventory.equippingLabel;

    debugLog('Transfer', `canEquipExotic: Checking for conflict with label=${label} on ${storeId}`);

    // Find conflicting exotic (same label, different bucket)
    const otherExotic = currentEq.find(i => {
      const iDef = manifestService.getItem(i.itemHash);
      return iDef?.inventory?.equippingLabel === label && i.bucketHash !== item.bucketHash;
    });

    if (!otherExotic) {
      debugLog('Transfer', `canEquipExotic: No conflict found`);
      return true;
    }

    infoLog('Transfer', `canEquipExotic: Conflict found - ${otherExotic.itemHash} in bucket ${otherExotic.bucketHash}. Dequipping...`);

    // Dequip the conflicting exotic (excludeExotic=true to not replace with another exotic)
    const dequipped = await profileService.ensureItemUnequipped(storeId, otherExotic.itemInstanceId!, true, session);
    if (!dequipped) {
      errorLog('Transfer', `canEquipExotic: Failed to dequip conflicting exotic ${otherExotic.itemHash}`);
      return false;
    }

    infoLog('Transfer', `canEquipExotic: Successfully dequipped ${otherExotic.itemHash}`);
    return true;
  }

  /**
   * DIM Parity: moveToStore
   * Low-level transfer that makes the API call and optionally equips.
   * This is analogous to DIM's moveToStore function.
   */
  private async moveToStore(
    item: DestinyItem,
    sourceId: string,
    targetId: string,
    equip: boolean,
    session: MoveSession,
    options?: { silent?: boolean }
  ): Promise<TransferResult> {
    const toVault = targetId === 'vault';
    const characterId = toVault ? sourceId : targetId;

    // Make the transfer API call
    // Skip space check since moveItem/moveToStore caller already verified space via ensureValidTransfer
    const res = await this.transferItem(
      item.itemInstanceId!,
      item.itemHash,
      toVault,
      characterId,
      1,
      session,
      { ...options, silent: true, skipSpaceCheck: true }
    );

    if (!res.success) {
      if (!options?.silent) {
        useToastStore.getState().addToast({ type: 'error', message: res.error || 'Transfer failed' });
      }
      return res;
    }

    // If equip requested and target is not vault, equip the item
    if (equip && !toVault) {
      const equipRes = await this.equipItem(item.itemInstanceId!, targetId, { silent: true });
      if (!equipRes.success) {
        // Don't fail the whole operation - item is transferred, just not equipped
        if (!options?.silent) {
          useToastStore.getState().addToast({ type: 'warning', message: 'Item moved but equip failed' });
        }
      }
      return equipRes;
    }

    if (!options?.silent) {
      const itemDef = manifestService.getItem(item.itemHash);
      useToastStore.getState().addToast({ type: 'success', message: `${itemDef?.displayProperties?.name || 'Item'} moved`, duration: 2000 });
    }

    return res;
  }

  /**
   * Handle lock state reset asynchronously after transfers
   */
  private handleLockStateReset(item: DestinyItem, targetId: string, lockResetState: boolean | undefined, state: any): void {
    if (lockResetState !== undefined) {
      const anyCharId = Object.keys(state.characterInventories)[0];
      const effectiveCharId = targetId === 'vault' ? anyCharId : targetId;
      if (effectiveCharId) {
        debugLog('Transfer', `Bungie Lock Bug: Resetting lock status of ${item.itemHash} to ${lockResetState}`);
        this.setItemLockState(item.itemInstanceId!, effectiveCharId, lockResetState).catch(() => { });
      }
    }
  }

  /**
   * DIM Parity: Recursive space-making logic.
   * Ensures there is enough space to move the given item into store.
   * This will move items aside in an attempt to make a move possible.
   */
  private async ensureCanMoveToStore(
    item: DestinyItem,
    store: any,
    amount: number,
    session: MoveSession,
    options: { excludes: any[]; numRetries?: number; depth?: number } = { excludes: [] }
  ): Promise<boolean> {
    const { excludes, numRetries = 0, depth = 0 } = options;

    // Prevent infinite recursion - max 10 items moved aside
    if (depth > 10) {
      errorLog('Transfer', `Max recursion depth reached trying to make space for ${item.itemHash}`);
      return false;
    }

    // DIM Standard: Re-fetch latest state before every space check to avoid desync
    const state = useProfileStore.getState();
    const classNames = ['Titan', 'Hunter', 'Warlock'];
    const stores = [
      ...state.characters.map((c: any) => ({ ...c, id: c.characterId, name: classNames[c.classType] || 'Guardian' })),
      { name: 'Vault', id: 'vault', isVault: true, items: state.vaultInventory }
    ];

    const bucketHash = this.getNativeBucketHash(item);

    // How much space will be needed in the target store?
    const storeReservations: Record<string, number> = {};
    storeReservations[store.id] = amount;

    // Guardian-to-guardian transfer will also need space in the vault
    const sourceId = this.getItemSource(item, state);
    if (sourceId !== 'vault' && !store.isVault && sourceId !== store.id) {
      storeReservations.vault = amount;
    }

    // Check space without adding reservations - trust optimistic updates instead
    const movesNeeded: Record<string, number> = {};
    for (const s of stores) {
      if (storeReservations[s.id]) {
        const left = this.getSpaceInBucket(bucketHash, s.id, state, session);
        movesNeeded[s.id] = Math.max(0, storeReservations[s.id] - left);
        debugLog('Transfer', `Space check for ${s.name} (${s.id}): left=${left}, reserved=${storeReservations[s.id]}, movesNeeded=${movesNeeded[s.id]}`);
      }
    }

    if (Object.values(movesNeeded).every(m => m === 0)) {
      return true;
    }

    const moveAsideSourceEntries = Object.entries(movesNeeded).reverse().filter(([_, amt]) => (amt as number) > 0);
    const [moveAsideSourceId] = moveAsideSourceEntries[0] || [];
    if (!moveAsideSourceId) return true;

    const sourceStore = stores.find(s => s.id === moveAsideSourceId);
    const context: MoveContext = {
      originalItemType: bucketHash,
      excludes,
      spaceLeft: (s, i) => {
        let left = this.getSpaceInBucket(this.getNativeBucketHash(i), s.id, state, session);
        // If this is the target store for the original move, we must reserve space for it
        if (s.id === store.id && this.getNativeBucketHash(i) === bucketHash) {
          left -= amount;
        }
        return Math.max(0, left);
      }
    };

    infoLog('Transfer', `Making space in ${sourceStore?.name || moveAsideSourceId} for ${item.itemHash}. Moves needed:`, movesNeeded);
    const choice = this.chooseMoveAsideItem(sourceStore, item, context, state, session);
    if (!choice.item || !choice.target) {
      errorLog('Transfer', `No move-aside candidate found for bucket ${bucketHash} in ${sourceStore?.name || moveAsideSourceId}. Total possible candidates checked: ${this.findMoveAsideCandidates(bucketHash, moveAsideSourceId, session, state).length}`);
      return false;
    }

    try {
      infoLog('Transfer', `Moving aside ${choice.item.itemHash} from ${sourceStore?.name || moveAsideSourceId} to ${choice.target.name || choice.target.id} to make room.`);
      const res = await this.moveItem(choice.item, moveAsideSourceId, choice.target.id, session, { silent: true });

      if (!res.success) {
        throw new Error(`Move-aside failed: ${res.error}`);
      }

      // DIM Parity: Sequential spacing. 50ms is enough between moves if optimistic updates are working.
      await new Promise(r => setTimeout(r, 50));

      // Continue checking space with incremented depth
      return this.ensureCanMoveToStore(item, store, amount, session, { excludes, numRetries: 0, depth: depth + 1 });
    } catch (e) {
      if (numRetries < 3) {
        infoLog('Transfer', `Move-aside failed for ${choice.item.itemHash}, retrying with exclusion.`);
        excludes.push(choice.item);
        return this.ensureCanMoveToStore(item, store, amount, session, { excludes, numRetries: numRetries + 1, depth });
      }
      return false;
    }
  }

  private chooseMoveAsideItem(sourceStore: any, displacingItem: DestinyItem, _context: MoveContext, state: any, session: MoveSession): { item?: DestinyItem; target?: any } {
    const candidates = this.findMoveAsideCandidates(this.getNativeBucketHash(displacingItem), sourceStore.id, session, state);
    if (!candidates.length) return {};

    const sorted = this.sortMoveAsideCandidates(candidates, sourceStore, state);
    const item = sorted[0];

    // Find a target store with space
    // DIM Parity: Prefer filling up the least-recently-played character first
    const stores = [
      ...state.characters
        .sort((a: any, b: any) => new Date(a.dateLastPlayed).getTime() - new Date(b.dateLastPlayed).getTime())
        .map((c: any) => ({ ...c, id: c.characterId })),
      { name: 'Vault', id: 'vault', isVault: true, items: state.vaultInventory }
    ];

    const target = stores.find(s => s.id !== sourceStore.id && this.getSpaceInBucket(this.getNativeBucketHash(item), s.id, state, session) > 0);
    return { item, target };
  }

  private sortMoveAsideCandidates(candidates: DestinyItem[], sourceStore: any, state: any): DestinyItem[] {
    const builds = state.builds || [];
    const buildItemIds = new Set(builds.flatMap((b: any) => [
      b.kineticWeapon?.itemInstanceId, b.energyWeapon?.itemInstanceId, b.powerWeapon?.itemInstanceId,
      b.helmet?.itemInstanceId, b.gauntlets?.itemInstanceId, b.chestArmor?.itemInstanceId,
      b.legArmor?.itemInstanceId, b.classArmor?.itemInstanceId
    ]).filter(Boolean));

    return candidates.sort((a, b) => {
      // 0. DIM Parity: Prefer items NOT in any loadouts
      const inBuildA = buildItemIds.has(a.itemInstanceId!) ? 1 : 0;
      const inBuildB = buildItemIds.has(b.itemInstanceId!) ? 1 : 0;
      if (inBuildA !== inBuildB) return inBuildA - inBuildB;

      // 1. Prefer moving unequipped items
      const isEqA = (state.characterEquipment[sourceStore.id] || []).some((e: any) => e.itemInstanceId === a.itemInstanceId);
      const isEqB = (state.characterEquipment[sourceStore.id] || []).some((e: any) => e.itemInstanceId === b.itemInstanceId);
      if (isEqA !== isEqB) return isEqA ? 1 : -1;

      // 2. Rarity (prefer moving lower rarity)
      const tierA = a.tierType || 0;
      const tierB = b.tierType || 0;
      if (tierA !== tierB) return tierA - tierB;

      // 3. Power (prefer moving lower power)
      const pA = state.itemInstances[a.itemInstanceId!]?.power || 0;
      const pB = state.itemInstances[b.itemInstanceId!]?.power || 0;
      if (pA !== pB) return pA - pB;

      return 0;
    });
  }

  private getSpaceInBucket(bucketHash: number, characterId: string | 'vault', state: any, session?: MoveSession): number {
    const reservations = session?.reservations?.[characterId]?.[bucketHash] || 0;

    if (characterId === 'vault') {
      // DIM Standard: Use manifest capacity for the vault bucket (1000 for weapons/armor)
      const isGeneralBucket = [BUCKET_HASHES.KINETIC_WEAPONS, BUCKET_HASHES.ENERGY_WEAPONS, BUCKET_HASHES.POWER_WEAPONS,
      BUCKET_HASHES.HELMET, BUCKET_HASHES.GAUNTLETS, BUCKET_HASHES.CHEST_ARMOR,
      BUCKET_HASHES.LEG_ARMOR, BUCKET_HASHES.CLASS_ARMOR, BUCKET_HASHES.GHOST,
      BUCKET_HASHES.VEHICLE, BUCKET_HASHES.SHIPS].includes(bucketHash);

      if (isGeneralBucket) {
        const generalUsage = state.vaultInventory.filter((i: any) => {
          const native = this.getNativeBucketHash(i);
          return ![BUCKET_HASHES.CONSUMABLES, BUCKET_HASHES.MODIFICATIONS].includes(native);
        }).length;
        return Math.max(0, VAULT_TOTAL_CAPACITY - (generalUsage + reservations));
      }

      if (bucketHash === BUCKET_HASHES.CONSUMABLES) {
        const usage = state.vaultInventory.filter((i: any) => this.getNativeBucketHash(i) === BUCKET_HASHES.CONSUMABLES).length;
        return Math.max(0, 50 - (usage + reservations));
      }

      if (bucketHash === BUCKET_HASHES.MODIFICATIONS) {
        const usage = state.vaultInventory.filter((i: any) => this.getNativeBucketHash(i) === BUCKET_HASHES.MODIFICATIONS).length;
        return Math.max(0, 50 - (usage + reservations));
      }

      return 0;
    }

    // Count inventory items (not equipped) - equipped items don't count against capacity
    const charInventory = state.characterInventories[characterId] || [];
    const usage = charInventory.filter((i: any) => this.getNativeBucketHash(i) === bucketHash).length;
    let left = (BUCKET_CAPACITIES[bucketHash] || 10) - (usage + reservations);

    // DIM Parity: Always leave 1 slot free in all equipment buckets to prevent 500 errors/stuck items
    if (EQUIP_BUCKETS.has(bucketHash) || bucketHash === BUCKET_HASHES.CONSUMABLES) {
      left -= 1;
    }

    return Math.max(0, left);
  }

  private findMoveAsideCandidates(bucketHash: number, characterId: string | 'vault', session: MoveSession, state: any): DestinyItem[] {
    const isVault = characterId === 'vault';
    const eq = isVault ? [] : (state.characterEquipment[characterId] || []);
    const inv = isVault ? [] : (state.characterInventories[characterId] || []);
    const all = isVault ? state.vaultInventory : [...inv, ...eq];

    const filtered = all.filter((i: any) => {
      const native = this.getNativeBucketHash(i);

      // DIM Parity: Candidates must be in the same vault section if moving from vault
      if (isVault) {
        const isGeneral = (h: number) => ![BUCKET_HASHES.CONSUMABLES, BUCKET_HASHES.MODIFICATIONS].includes(h);
        if (isGeneral(bucketHash) && !isGeneral(native)) return false;
        if (bucketHash === BUCKET_HASHES.CONSUMABLES && native !== BUCKET_HASHES.CONSUMABLES) return false;
        if (bucketHash === BUCKET_HASHES.MODIFICATIONS && native !== BUCKET_HASHES.MODIFICATIONS) return false;
      } else {
        // If moving from character, we only care about the same specific bucket
        if (native !== bucketHash) return false;
      }

      // Can't move aside items involved in the current operation
      if (session.involvedItems.has(i.itemInstanceId!)) return false;

      // DIM Parity: Only move aside items that are actually in the character inventory (not postmaster)
      if (!isVault && i.location !== 1) return false;

      return true;
    });

    if (filtered.length === 0 && all.length > 0) {
      infoLog('Transfer', `No candidates found in ${characterId} for bucket ${bucketHash}. Total items checked: ${all.length}. Involved: ${session.involvedItems.size}`);
    }

    return filtered.sort((a: any, b: any) => {
      const isEqA = eq.some((e: any) => e.itemInstanceId === a.itemInstanceId), isEqB = eq.some((e: any) => e.itemInstanceId === b.itemInstanceId);
      if (isEqA !== isEqB) return isEqA ? 1 : -1;
      if (a.tierType !== b.tierType) return (a.tierType || 0) - (b.tierType || 0);
      return (state.itemInstances[a.itemInstanceId!]?.power || 0) - (state.itemInstances[b.itemInstanceId!]?.power || 0);
    });
  }

  async orchestrateBulkDequip(characterId: string, itemsToEquip: DestinyItem[]): Promise<boolean> {
    const state = useProfileStore.getState();
    const current = state.characterEquipment?.[characterId] || [];
    const conflicts = current.filter((eq: any) => {
      const target = itemsToEquip.find((t: any) => t.bucketHash === eq.bucketHash);
      if (!target) return false;
      const tDef = manifestService.getItem(target.itemHash), eDef = manifestService.getItem(eq.itemHash);
      return tDef?.tierType === 6 && eDef?.tierType === 6;
    });
    for (const c of conflicts) await profileService.ensureItemUnequipped(characterId, c.itemInstanceId!, true);
    return true;
  }

  private async resolveExoticConflicts(characterId: string, exoticW: any, exoticA: any, session: MoveSession): Promise<DestinyItem[]> {
    const reps: DestinyItem[] = [];
    const state = useProfileStore.getState();
    const character = state.characters.find(c => c.characterId === characterId);
    const currentEquipment = state.characterEquipment?.[characterId] || [];
    const checkConflict = async (targetExotic: any) => {
      if (!targetExotic) return;
      const targetDef = manifestService.getItem(targetExotic.itemHash);
      const conflict = currentEquipment.find(i => {
        const def = manifestService.getItem(i.itemHash);
        return def?.inventory?.equippingLabel === targetDef?.inventory?.equippingLabel && i.itemInstanceId !== targetExotic.itemInstanceId;
      });
      if (conflict) {
        const rep = this.findReplacementItem(conflict.bucketHash, characterId, session.involvedItems, character?.classType);
        if (rep) {
          const src = this.getItemSource(rep, state);
          if (src !== characterId) await this.moveItem(rep, src, characterId, session, { silent: true });
          await this.equipItem(rep.itemInstanceId!, characterId, { silent: true });
          reps.push(rep); session.involvedItems.add(rep.itemInstanceId!);
        }
      }
    };
    await checkConflict(exoticW); await checkConflict(exoticA);
    return reps;
  }

  private searchForSimilarItem(
    item: DestinyItem,
    characterId: string,
    exclusions: Set<string | number> = new Set(),
    classType?: number,
    excludeExotic = true
  ): DestinyItem | undefined {
    const state = useProfileStore.getState();
    const all = [
      ...state.vaultInventory,
      ...Object.entries(state.characterInventories).flatMap(([_, items]) => items)
    ];

    const candidates = all.filter((i: any) => {
      const native = this.getNativeBucketHash(i);
      const def = manifestService.getItem(i.itemHash);
      const isEquipped = (state.characterEquipment[this.getItemSource(i, state)] || []).some((e: any) => e.itemInstanceId === i.itemInstanceId);

      return (
        native === item.bucketHash &&
        !isEquipped &&
        !exclusions.has(i.itemInstanceId!) &&  // DIM Parity: Filter out items in exclusions
        (i.transferStatus & 2) === 0 &&
        (!excludeExotic || def?.tierType !== 6) &&
        (classType === undefined || def?.classType === classType || def?.classType === 3)
      );
    });

    if (candidates.length === 0) {
      infoLog('Transfer', `searchForSimilarItem: No candidates for bucket ${item.bucketHash}. Checked ${all.length} items. ExcludeExotic: ${excludeExotic}`);
      return undefined;
    }

    return candidates.sort((a, b) => {
      // 0. DIM Parity: Prefer items NOT in the involved/exclusions list
      const invA = exclusions.has(a.itemInstanceId!) ? 1 : 0;
      const invB = exclusions.has(b.itemInstanceId!) ? 1 : 0;
      if (invA !== invB) return invA - invB;

      // DIM Parity: Prefer non-exotics even if excludeExotic is false
      const tierA = a.tierType || 0, tierB = b.tierType || 0;
      if (tierA !== tierB) {
        if (tierA === 6) return 1;
        if (tierB === 6) return -1;
        return tierB - tierA; // Higher rarity (Legendary=5) before lower
      }

      const srcA = this.getItemSource(a, state);
      const srcB = this.getItemSource(b, state);
      const score = (src: string) => src === characterId ? 0 : (src === 'vault' ? 1 : 2);
      if (score(srcA) !== score(srcB)) return score(srcA) - score(srcB);

      const pA = state.itemInstances[a.itemInstanceId!]?.power || 0;
      const pB = state.itemInstances[b.itemInstanceId!]?.power || 0;
      return pB - pA;
    })[0];
  }

  findReplacementItem(bucketHash: number, characterId: string, excludeInstanceIds: Set<string | number> = new Set(), classType?: number, excludeExotic = true): DestinyItem | undefined {
    return this.searchForSimilarItem({ bucketHash } as DestinyItem, characterId, excludeInstanceIds, classType, excludeExotic);
  }


  private findSubclassItem(element: string, inv: DestinyItem[], classType?: number): DestinyItem | undefined {
    if (!element) return undefined;
    const elLower = element.toLowerCase();
    const damageTypeHash = DAMAGE_TYPE_HASHES[elLower.toUpperCase() as keyof typeof DAMAGE_TYPE_HASHES];

    return inv.find(i => {
      if (i.bucketHash !== BUCKET_HASHES.SUBCLASS) return false;
      const def = manifestService.getItem(i.itemHash);
      if (!def || (classType !== undefined && def.classType !== classType && def.classType !== 3)) return false;

      // Strict match by damage type hash if available
      if (damageTypeHash && (def as any).defaultDamageTypeHash === damageTypeHash) return true;

      // Fallback for Prismatic or edge cases
      const name = (def.displayProperties?.name || '').toLowerCase();
      return name.includes(elLower);
    });
  }

  async applyArmorMods(characterId: string, mods: number[], onProgress: any, options?: { silent?: boolean }): Promise<void> { await modService.applyArmorMods(characterId, mods, onProgress, options); }
  async applySubclassConfiguration(subclass: DestinyItem, config: any, characterId: string, onProgress: any, options?: { silent?: boolean }): Promise<void> { await modService.applySubclassConfiguration(subclass, config, characterId, onProgress, options); }
  async setItemLockState(itemId: string, characterId: string, state: boolean): Promise<boolean> {
    const char = useProfileStore.getState().characters.find(c => c.characterId === characterId) || useProfileStore.getState().characters[0];
    if (!char) return false;
    const membership = await profileService.getPrimaryMembership();
    const membershipType = membership?.membershipType ?? char.membershipType;
    try { await bungieApi.post(BUNGIE_CONFIG.endpoints.setLockState, { state, itemId, characterId: char.characterId, membershipType }, true); return true; } catch { return false; }
  }
  async insertSocketPlugFree(itemId: string, plugHash: number, socketIndex: number, characterId: string, _options?: { silent?: boolean }): Promise<{ success: boolean; stop?: boolean }> {
    const state = useProfileStore.getState();
    const char = state.characters.find(c => c.characterId === characterId);
    if (!char) return { success: false };

    // DIM Parity: Skip if plug is already in socket
    const instance = state.itemInstances[itemId];
    const currentSocket = instance?.sockets?.find((s: any) => s.socketIndex === socketIndex);
    if (currentSocket?.plugHash === plugHash) {
      debugLog('Transfer', `Socket ${socketIndex} already has plug ${plugHash}, skipping API call`);
      return { success: true };
    }

    const membership = await profileService.getPrimaryMembership();
    const membershipType = membership?.membershipType ?? char.membershipType;

    // Optimistic local update
    profileService.updateLocalSocketPlug(itemId, socketIndex, plugHash);

    try {
      const response = await bungieApi.post<any>(BUNGIE_CONFIG.endpoints.insertSocketPlugFree, { itemId, plug: { plugItemHash: plugHash, socketIndex, socketArrayType: 0 }, characterId, membershipType }, true);

      // DIM Parity: Update the local item model with the returned change response
      if (response) {
        profileService.updateItemFromChange(itemId, response);
      }

      return { success: true };
    } catch (e: any) {
      // DIM Parity: Handle ghost success for 500 errors
      if (e?.httpStatus === 500 || e?.isPotentialSuccess) {
        debugLog('Transfer', `500 error during socket plug of ${plugHash}. Verifying ghost success...`);
        await new Promise(r => setTimeout(r, 1500));
        await profileLoader.loadProfile(true);

        let latestState = useProfileStore.getState();
        let latestInstance = latestState.itemInstances[itemId];
        let latestSocket = latestInstance?.sockets?.find((s: any) => s.socketIndex === socketIndex);

        if (latestSocket?.plugHash === plugHash) {
          infoLog('Transfer', `Ghost success detected for socket plug ${plugHash} on item ${itemId}`);
          return { success: true };
        }

        // Retry check
        await new Promise(r => setTimeout(r, 1000));
        await profileLoader.loadProfile(true);
        latestState = useProfileStore.getState();
        latestInstance = latestState.itemInstances[itemId];
        latestSocket = latestInstance?.sockets?.find((s: any) => s.socketIndex === socketIndex);
        if (latestSocket?.plugHash === plugHash) {
          infoLog('Transfer', `Ghost success detected (retry) for socket plug ${plugHash} on item ${itemId}`);
          return { success: true };
        }
      }

      // DIM Parity: Handle known error codes at debug level to reduce console noise
      const code = e?.ErrorCode || e?.bungieErrorCode?.();
      const isStopError = code === 1618 || code === 1663 || code === 1634 || code === 1642; // Location-based or locked-gear restrictions

      if (isStopError || code === 1640) { // DestinyItemAlreadyEquipped
        debugLog('Transfer', `Socket plug restricted: ${code} for item ${itemId}, socket ${socketIndex}${isStopError ? ' - STOPPING' : ''}`);
      } else if (e?.httpStatus === 500) {
        // Server errors are often transient or due to rate limiting
        debugLog('Transfer', `Socket plug server error for item ${itemId}, socket ${socketIndex}: ${e.message}`);
      } else {
        errorLog('Transfer', `Socket plug failed for item ${itemId}, socket ${socketIndex}:`, e);
      }

      return { success: false, stop: isStopError };
    }
  }

  private getNativeBucketHash(item: DestinyItem): number {
    if (EQUIP_BUCKETS.has(item.bucketHash)) return item.bucketHash;
    return manifestService.getItem(item.itemHash)?.inventory?.bucketTypeHash || item.bucketHash;
  }

  getItemSource(item: DestinyItem, state?: any): string {
    const s = state || useProfileStore.getState();
    if (s.vaultInventory?.some((i: any) => i.itemInstanceId === item.itemInstanceId)) return 'vault';
    for (const [charId, items] of Object.entries(s.characterInventories)) {
      if ((items as any[]).some(i => i.itemInstanceId === item.itemInstanceId)) return charId;
    }
    for (const [charId, items] of Object.entries(s.characterEquipment)) {
      if ((items as any[]).some(i => i.itemInstanceId === item.itemInstanceId)) return charId;
    }
    return '';
  }

  /**
   * DIM Parity: Check if an item can be equipped by a specific store
   */
  itemCanBeEquippedBy(item: DestinyItem, characterId: string): boolean {
    const state = useProfileStore.getState();
    const character = state.characters.find(c => c.characterId === characterId);
    if (!character) return false;

    const def = manifestService.getItem(item.itemHash);
    if (!def) return false;

    // Must be equipment
    if (!def.equippable && !def.inventory?.equippable) {
      // Check if it's already equipped or in an equipment bucket
      if (!EQUIP_BUCKETS.has(item.bucketHash)) return false;
    }

    // Class compatibility
    if (!this.isClassCompatible(def.classType, character.classType)) {
      return false;
    }

    // Transfers and other restrictions usually handled by the API when we try to move it,
    // but we can check if it's "equippable" in the UI.
    return true;
  }

  private isClassCompatible(itemClass: number, characterClass: number): boolean {
    return (
      itemClass === 3 || // All classes
      characterClass === 3 ||
      itemClass === characterClass
    );
  }
}

export const transferService = new TransferService();