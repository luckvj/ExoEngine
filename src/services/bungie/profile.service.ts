// Profile Service - DIM-Grade Implementation
// Handles profile fetching, inventory management, and optimistic updates with memoization

import { bungieApi, BungieApiError, PlatformErrorCodes } from './api-client';
import { db } from '../db/indexeddb.service';
import { manifestService } from './manifest.service';
import { transferService, createMoveSession } from './transfer.service';
import { useProfileStore, useSettingsStore, useAuthStore, SetInventoriesResult } from '../../store';
import { STAT_HASHES } from '../../config/bungie.config';
import { warnLog, infoLog, errorLog, debugLog } from '../../utils/logger';

import type { DestinyItem, BungieMembership } from '../../types';

interface DestinyProfileResponse {
  responseMintedTimestamp?: string;
  profileInventory: { data: { items: DestinyItem[] } };
  characterInventories: { data: Record<string, { items: DestinyItem[] }> };
  characterEquipment: { data: Record<string, { items: DestinyItem[] }> };
  characters: { data: Record<string, DestinyCharacterComponent> };
  itemComponents: {
    instances: { data: Record<string, any> };
    stats: { data: Record<string, any> };
    sockets: { data: Record<string, any> };
    objectives: { data: Record<string, any> };
  };
  profileStringVariables: { data: { integerValuesByHash: Record<string, number> } };
  profileArtifact?: { data: any };
  characterArtifact?: { data: Record<string, any> };
  characterProgressions: { data: Record<string, any> };
  profileCommendations?: { data: any };
  characterCommendations?: { data: Record<string, any> };
  profilePlugSets?: { data: { plugs: Record<number, any[]> } };
  characterPlugSets?: { data: Record<string, { plugs: Record<number, any[]> }> };
  profileRecords?: { data: any };
  profileMetrics?: { data: any };
  characterMetrics?: { data: Record<string, any> };
  profile?: { data: { currentGuardianRank: number; lifetimeScore: number } };
  characterActivities?: { data: Record<string, any> };
}

interface DestinyCharacterComponent {
  membershipId: string;
  membershipType: number;
  characterId: string;
  dateLastPlayed: string;
  minutesPlayedThisSession: string;
  minutesPlayedTotal: string;
  light: number;
  stats: Record<string, number>;
  raceHash: number;
  genderHash: number;
  classHash: number;
  raceType: number;
  classType: number;
  genderType: number;
  emblemPath: string;
  emblemBackgroundPath: string;
  emblemHash: number;
  levelProgression: { level: number; progressionHash: number };
  baseCharacterLevel: number;
  percentToNextLevel: number;
}

const bucketMemoCache = new WeakMap<object, Map<number, DestinyItem[]>>();

function memoizedItemsByBucket(items: DestinyItem[], cacheKey: object): Map<number, DestinyItem[]> {
  let cached = bucketMemoCache.get(cacheKey);
  if (cached) return cached;
  const byBucket = new Map<number, DestinyItem[]>();
  for (const item of items) {
    if (!byBucket.has(item.bucketHash)) byBucket.set(item.bucketHash, []);
    byBucket.get(item.bucketHash)!.push(item);
  }
  bucketMemoCache.set(cacheKey, byBucket);
  return byBucket;
}

class ProfileService {
  private activeCharacterId: string | null = null;
  private membershipCache: BungieMembership | null = null;
  private membershipCacheTime = 0;

  findItemsByBucket(store: { items: DestinyItem[] }, bucketHash: number): DestinyItem[] {
    return memoizedItemsByBucket(store.items, store).get(bucketHash) || [];
  }

  public updateLocalStore(args: { instanceId: string, sourceId: string, targetId: string, isEquip?: boolean, customAction?: (item: DestinyItem) => void }) {
    const store = useProfileStore.getState();
    const { characterInventories, characterEquipment, vaultInventory } = store;
    let item: DestinyItem | null = null;
    const newVault = [...vaultInventory];
    const newCI = { ...characterInventories };
    const newCE = { ...characterEquipment };

    const findAndRemove = (list: DestinyItem[]) => {
      const idx = list.findIndex(i => i.itemInstanceId === args.instanceId);
      if (idx !== -1) { item = { ...list[idx] }; list.splice(idx, 1); return true; }
      return false;
    };

    if (!findAndRemove(newVault)) {
      for (const id of Object.keys(newCI)) {
        const list = [...(newCI[id] || [])];
        if (findAndRemove(list)) { newCI[id] = list; break; }
      }
      if (!item) {
        for (const id of Object.keys(newCE)) {
          const list = [...(newCE[id] || [])];
          if (findAndRemove(list)) { newCE[id] = list; break; }
        }
      }
    }

    if (!item) return;
    if (args.customAction) args.customAction(item);

    if (args.targetId === 'vault') {
      newVault.push(item);
    } else {
      if (args.isEquip) {
        const curEq = [...(newCE[args.targetId] || [])];
        const itemDef = manifestService.getItem((item as DestinyItem).itemHash);
        const label = itemDef?.inventory?.equippingLabel;
        const slotIdx = curEq.findIndex(i => i.bucketHash === (item as DestinyItem).bucketHash);
        if (slotIdx !== -1) {
          const old = curEq.splice(slotIdx, 1)[0];
          newCI[args.targetId] = [...(newCI[args.targetId] || []), old];
        }
        if (label) {
          const cIdx = curEq.findIndex(i => manifestService.getItem(i.itemHash)?.inventory?.equippingLabel === label);
          if (cIdx !== -1) {
            const oldEx = curEq.splice(cIdx, 1)[0];
            newCI[args.targetId] = [...(newCI[args.targetId] || []), oldEx];
          }
        }
        curEq.push(item);
        newCE[args.targetId] = curEq;
      } else {
        newCI[args.targetId] = [...(newCI[args.targetId] || []), item];
      }
    }

    useProfileStore.setState({
      vaultInventory: newVault,
      characterInventories: newCI,
      characterEquipment: newCE,
      responseMintedTimestamp: new Date().toISOString(),
      lastUpdated: Date.now()
    });
  }

  /**
   * DIM Parity: Update a single item from a Bungie change response (after socketing)
   */
  public updateItemFromChange(instanceId: string, change: any) {
    const state = useProfileStore.getState();
    const itemData = change.item;
    if (!itemData) return;

    // Update item instances - DIM Parity: Only update non-socket properties
    // The optimistic update (updateLocalSocketPlug) already correctly set the socket,
    // so we MUST preserve existing sockets. Overwriting them causes UI flashing because
    // the Bungie API response doesn't include proper socketIndex values.
    const newInstances = { ...state.itemInstances };
    if (newInstances[instanceId]) {
      const inst = itemData;
      const existingSockets = newInstances[instanceId].sockets;
      newInstances[instanceId] = {
        ...newInstances[instanceId],
        power: inst.primaryStat?.value,
        damageType: inst.damageType,
        isEquipped: inst.isEquipped,
        // PRESERVE existing sockets - they're already correctly updated by updateLocalSocketPlug
        sockets: existingSockets
      };
    }

    // Replace item in the inventory list to update bucket/hash if needed (though unlikely for socket change)
    const updateInList = (list: DestinyItem[]) => {
      const idx = list.findIndex(i => i.itemInstanceId === instanceId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...itemData, tierType: manifestService.getItem(itemData.itemHash)?.inventory?.tierType || 0 };
        return true;
      }
      return false;
    };

    const newVault = [...state.vaultInventory];
    const newCI = { ...state.characterInventories };
    const newCE = { ...state.characterEquipment };

    let found = updateInList(newVault);
    if (!found) {
      for (const id of Object.keys(newCI)) {
        const list = [...(newCI[id] || [])];
        if (updateInList(list)) { newCI[id] = list; found = true; break; }
      }
    }
    if (!found) {
      for (const id of Object.keys(newCE)) {
        const list = [...(newCE[id] || [])];
        if (updateInList(list)) { newCE[id] = list; found = true; break; }
      }
    }

    useProfileStore.setState({
      itemInstances: newInstances,
      vaultInventory: newVault,
      characterInventories: newCI,
      characterEquipment: newCE,
      lastUpdated: Date.now()
    });
  }

  async getActiveCharacterId(): Promise<string | null> {
    if (this.activeCharacterId) return this.activeCharacterId;
    const profile = await this.getProfile();
    if (!profile?.characters?.data) return null;
    const chars = Object.values(profile.characters.data).sort((a, b) => new Date(b.dateLastPlayed).getTime() - new Date(a.dateLastPlayed).getTime());
    return (this.activeCharacterId = chars[0]?.characterId || null);
  }

  async getProfile(): Promise<DestinyProfileResponse | null> {
    const tokens = await db.getAuthTokens();
    if (!tokens) return null;
    const membership = await this.getPrimaryMembership();
    if (!membership) return null;
    try {
      const components = [100, 102, 201, 205, 200, 202, 204, 206, 300, 301, 304, 305, 900, 1100, 1400, 1401];
      return await bungieApi.request<DestinyProfileResponse>(`/Destiny2/${membership.membershipType}/Profile/${membership.membershipId}/?components=${components.join(',')}`, { requiresAuth: true });
    } catch { return null; }
  }

  async getPrimaryMembership(): Promise<BungieMembership | null> {
    if (this.membershipCache && Date.now() - this.membershipCacheTime < 300000) return this.membershipCache;
    try {
      const resp = await bungieApi.request<any>('/User/GetMembershipsForCurrentUser/', { requiresAuth: true });
      const primary = resp.destinyMemberships.find((m: any) => m.membershipId === resp.primaryMembershipId) || resp.destinyMemberships[0];
      this.membershipCacheTime = Date.now();
      return (this.membershipCache = { membershipId: primary.membershipId, membershipType: primary.membershipType, displayName: primary.displayName, bungieGlobalDisplayName: resp.bungieNetUser?.cachedBungieGlobalDisplayName || primary.displayName, bungieGlobalDisplayNameCode: resp.bungieNetUser?.cachedBungieGlobalDisplayNameCode || 0 });
    } catch { return null; }
  }

  async getClanInfo(): Promise<string | null> {
    const mem = await this.getPrimaryMembership();
    if (!mem) return null;
    try {
      const resp = await bungieApi.get<any>(`/GroupV2/User/${mem.membershipType}/${mem.membershipId}/0/1/`, true);
      return resp?.results?.[0]?.group?.name || null;
    } catch { return null; }
  }

  formatForStore(profile: DestinyProfileResponse) {
    const characterInventories: Record<string, DestinyItem[]> = {};
    const characterEquipment: Record<string, DestinyItem[]> = {};
    const itemInstances: Record<string, any> = {};

    if (profile.characterInventories?.data) Object.entries(profile.characterInventories.data).forEach(([id, d]) => characterInventories[id] = d.items.map(i => ({ ...i, tierType: manifestService.getItem(i.itemHash)?.inventory?.tierType || 0 })));
    if (profile.characterEquipment?.data) Object.entries(profile.characterEquipment.data).forEach(([id, d]) => characterEquipment[id] = d.items.map(i => ({ ...i, tierType: manifestService.getItem(i.itemHash)?.inventory?.tierType || 0 })));
    const vaultInventory = (profile.profileInventory?.data?.items || []).map(i => ({ ...i, tierType: manifestService.getItem(i.itemHash)?.inventory?.tierType || 0 }));

    if (profile.itemComponents?.instances?.data) {
      Object.entries(profile.itemComponents.instances.data).forEach(([id, inst]) => {
        itemInstances[id] = {
          power: inst.primaryStat?.value, damageType: inst.damageType, isEquipped: inst.isEquipped, isLocked: inst.isLocked, canEquip: inst.canEquip,
          energy: { ...inst.energy, isArtifice: profile.itemComponents.sockets?.data?.[id]?.sockets.some((s: any) => s.plugHash === 3727270518) || false },
          sockets: (profile.itemComponents.sockets?.data?.[id]?.sockets || []).map((s: any, idx: number) => ({ ...s, socketIndex: idx, plugName: manifestService.getName(s.plugHash || 0), plugIcon: manifestService.getIcon(s.plugHash || 0) })),
          objectives: profile.itemComponents.objectives?.data?.[id]?.objectives || []
        };
      });
    }

    if (profile.itemComponents?.stats?.data) {
      Object.entries(profile.itemComponents.stats.data).forEach(([id, sd]) => {
        if (!itemInstances[id]) itemInstances[id] = { sockets: [] };
        const s: any = { total: 0 };
        Object.values(sd.stats).forEach((stat: any) => {
          if (stat.statHash === STAT_HASHES.MOBILITY) s.mobility = stat.value;
          if (stat.statHash === STAT_HASHES.RESILIENCE) s.resilience = stat.value;
          if (stat.statHash === STAT_HASHES.RECOVERY) s.recovery = stat.value;
          if (stat.statHash === STAT_HASHES.DISCIPLINE) s.discipline = stat.value;
          if (stat.statHash === STAT_HASHES.INTELLECT) s.intellect = stat.value;
          if (stat.statHash === STAT_HASHES.STRENGTH) s.strength = stat.value;
        });
        itemInstances[id].stats = s;
      });
    }

    const firstCharId = Object.keys(profile.characterProgressions?.data || {})[0];

    // Extract Commendations (Using exact Bungie API property names provided by user)
    const comms = profile.profileCommendations?.data;
    const commendationScore = comms?.totalScore || 0;
    const commendationNodeScores = comms?.commendationNodeScoresByHash || {};
    const commendationNodePercentages = comms?.commendationNodePercentagesByHash || {};

    // Extract Given/Received Scores from scoreDetailValues (Component 1400)
    // scoreDetailValues[0] = Received Score, scoreDetailValues[1] = Sent (Given) Score
    const scoreDetails = comms?.scoreDetailValues || [];
    const commendationsReceived = scoreDetails[0] || 0;
    const commendationsSent = scoreDetails[1] || 0;

    return {
      characterInventories, characterEquipment, vaultInventory, itemInstances,
      activeSeasonRank: firstCharId ? profile.characterProgressions.data[firstCharId]?.progressions['362041442']?.level || 0 : 0,
      responseMintedTimestamp: profile.responseMintedTimestamp,
      commendationScore,
      commendationNodeScores,
      commendationNodePercentages,
      commendationsSent,
      commendationsReceived,
    };
  }

  async getItemSockets(itemInstanceId: string): Promise<{ sockets: any[] }> {
    // Optimistic: Check store first
    const state = useProfileStore.getState();
    const instance = state.itemInstances[itemInstanceId];
    if (instance?.sockets?.length) {
      return { sockets: instance.sockets };
    }

    const mem = await this.getPrimaryMembership();
    if (!mem) return { sockets: [] };
    try {
      const resp = await bungieApi.request<any>(`/Destiny2/${mem.membershipType}/Profile/${mem.membershipId}/Item/${itemInstanceId}/?components=305`, { requiresAuth: true });
      return { sockets: resp.sockets?.data?.sockets || [] };
    } catch { return { sockets: [] }; }
  }

  /**
   * Optimistically updates a socket plug in the local store
   */
  updateLocalSocketPlug(instanceId: string, socketIndex: number, plugHash: number) {
    const name = manifestService.getName(plugHash);
    const icon = manifestService.getIcon(plugHash);
    useProfileStore.getState().updateItemSocket(instanceId, socketIndex, plugHash, name, icon);
  }

  async ensureItemUnequipped(characterId: string, itemInstanceId: string, excludeExotic = false, session?: any): Promise<boolean> {
    debugLog('Transfer', `ensureItemUnequipped: char=${characterId} item=${itemInstanceId} excludeExotic=${excludeExotic}`);
    const state = useProfileStore.getState();
    const inventory = state.getAllInventory();
    const item = inventory.find(i => i.itemInstanceId === itemInstanceId);
    if (!item) {
      debugLog('Transfer', `ensureItemUnequipped: item not found in inventory, returning true`);
      return true;
    }

    // Check if it's actually equipped
    const equipped = state.characterEquipment?.[characterId] || [];
    if (!equipped.some(i => i.itemInstanceId === itemInstanceId)) {
      debugLog('Transfer', `ensureItemUnequipped: item not equipped on ${characterId}, returning true`);
      return true;
    }

    debugLog('Transfer', `ensureItemUnequipped: item ${item.itemHash} IS equipped on ${characterId}, finding replacement...`);

    const bucket = item.bucketHash;
    const char = state.characters.find(c => c.characterId === characterId);

    // DIM Parity: First, look for a replacement ALREADY on this character (no move needed)
    const charInventory = state.characterInventories[characterId] || [];
    let rep = charInventory.find(i => {
      if (i.bucketHash !== bucket) return false;
      if (i.itemInstanceId === itemInstanceId) return false;
      if (session?.involvedItems?.has(i.itemInstanceId)) return false;
      const def = manifestService.getItem(i.itemHash);
      if (excludeExotic && def?.tierType === 6) return false;
      if (char?.classType !== undefined && def?.classType !== 3 && def?.classType !== char.classType) return false;
      return true;
    });

    // If no local replacement, search vault and other characters
    if (!rep) {
      debugLog('Transfer', `ensureItemUnequipped: no local replacement, searching globally...`);
      rep = transferService.findReplacementItem(bucket, characterId, new Set([itemInstanceId, ...(session?.involvedItems || [])]), char?.classType, excludeExotic);
    }

    if (!rep) {
      errorLog('Transfer', `ensureItemUnequipped: failed to find replacement item for bucket ${bucket} on character ${characterId}`);
      return false;
    }

    debugLog('Transfer', `ensureItemUnequipped: found replacement ${rep.itemHash} (${rep.itemInstanceId})`);

    const source = (transferService as any).getItemSource(rep);

    // If replacement is not on character, need to move it
    if (source !== characterId) {
      infoLog('Transfer', `Moving replacement ${rep.itemInstanceId} from ${source} to ${characterId}`);

      // DIM Parity: Ensure space on character BEFORE moving. 
      // But we're dequipping, so we free up 1 slot by moving the equipped item out. 
      // The issue is the equipped item is STILL equipped until we complete this process.
      // Solution: Add the item being dequipped to involved items so it's not moved aside.
      const s = session || createMoveSession([rep.itemInstanceId!, itemInstanceId], 3, characterId);
      s.involvedItems.add(itemInstanceId); // Prevent circular: don't try to move aside the item we're dequipping
      s.involvedItems.add(rep.itemInstanceId!); // Don't move aside the replacement either

      // Check if character has space for the replacement
      const charInvCount = charInventory.filter(i => i.bucketHash === bucket).length;
      const capacity = 10; // Standard equipment bucket capacity

      // We have 1 equipped + N in inventory. After dequip: N+1 in inventory. Adding replacement: N+2. Max is 10.
      // So we need: charInvCount + 2 <= 10, i.e., charInvCount <= 8
      if (charInvCount >= capacity - 1) {
        // Need to make space first - move something to vault (not the item being dequipped)
        const movableItems = charInventory.filter(i =>
          i.bucketHash === bucket &&
          i.itemInstanceId !== itemInstanceId &&
          !s.involvedItems.has(i.itemInstanceId!)
        );

        if (movableItems.length > 0) {
          // Sort: prefer lower tier, lower power
          movableItems.sort((a, b) => {
            const tierA = a.tierType || 0, tierB = b.tierType || 0;
            if (tierA !== tierB) return tierA - tierB;
            const pA = state.itemInstances[a.itemInstanceId!]?.power || 0;
            const pB = state.itemInstances[b.itemInstanceId!]?.power || 0;
            return pA - pB;
          });

          const toVault = movableItems[0];
          infoLog('Transfer', `Pre-emptive space-making: moving ${toVault.itemInstanceId} to vault before dequip`);
          const vaultRes = await transferService.moveItem(toVault, characterId, 'vault', s, { silent: true });
          if (!vaultRes.success) {
            errorLog('Transfer', `Failed to make space for dequip replacement: ${vaultRes.error}`);
            return false;
          }
        } else {
          errorLog('Transfer', `No items to move aside for dequip space-making in bucket ${bucket}`);
          return false;
        }
      }

      const moved = await transferService.moveItem(rep, source, characterId, s, { silent: true });
      if (!moved.success) {
        errorLog('Transfer', `Failed to move replacement item ${rep.itemInstanceId} to ${characterId}: ${moved.error}`);
        return false;
      }

      // Refresh local rep after move
      await profileLoader.loadProfile(true);
      const newState = useProfileStore.getState();
      rep = newState.getAllInventory().find(i => i.itemInstanceId === rep?.itemInstanceId);
      if (!rep) {
        errorLog('Transfer', `Replacement item ${itemInstanceId} disappeared after move refresh`);
        return false;
      }
    }

    // OPTIMISTIC: Equip the replacement immediately in UI
    debugLog('Transfer', `ensureItemUnequipped: equipping replacement ${rep.itemInstanceId} via updateLocalStore + API`);
    this.updateLocalStore({
      instanceId: rep.itemInstanceId!,
      sourceId: characterId,
      targetId: characterId,
      isEquip: true
    });

    const result = await this.equipItemInstance(characterId, rep.itemInstanceId!);
    debugLog('Transfer', `ensureItemUnequipped: equipItemInstance returned ${result}`);
    return result;
  }


  async equipItemInstance(characterId: string, itemInstanceId: string): Promise<boolean> {
    debugLog('Transfer', `equipItemInstance: char=${characterId} item=${itemInstanceId}`);
    const mem = await this.getPrimaryMembership();
    if (!mem) {
      errorLog('Transfer', `equipItemInstance: no membership found`);
      return false;
    }
    try {
      await bungieApi.post('/Destiny2/Actions/Items/EquipItem/', {
        itemId: itemInstanceId,
        characterId,
        membershipType: mem.membershipType
      }, true);
      debugLog('Transfer', `equipItemInstance: API call succeeded`);
      return true;
    } catch (e: any) {
      errorLog('Transfer', `equipItemInstance: API call failed`, e);
      return false;
    }
  }

  async transferItem(itemHash: number, itemInstanceId: string, toVault: boolean, characterId: string): Promise<boolean> {
    const mem = await this.getPrimaryMembership();
    if (!mem) return false;
    try {
      await bungieApi.post('/Destiny2/Actions/Items/TransferItem/', {
        itemReferenceHash: itemHash,
        stackSize: 1,
        transferToVault: toVault,
        itemId: itemInstanceId,
        characterId,
        membershipType: mem.membershipType
      }, true);
      return true;
    } catch {
      return false;
    }
  }
}

export const profileService = new ProfileService();

class ProfileLoader {
  private loadPromise: Promise<boolean> | null = null;
  private isLoading = false;
  private autoRefreshTimeout: ReturnType<typeof setTimeout> | null = null;
  private isAutoRefreshing = false;

  async loadProfile(force = false, retryCount = 0): Promise<boolean> {
    if (this.loadPromise) {
      if (force) { await this.loadPromise; return this.loadProfile(true, retryCount); }
      return this.loadPromise;
    }
    this.isLoading = true;
    useProfileStore.getState().setLoading(true);
    this.loadPromise = (async () => {
      try {
        const p = await profileService.getProfile();
        if (!p) return false;
        const store = useProfileStore.getState();
        const f = profileService.formatForStore(p);
        const res = store.setInventories(f);
        if (res === SetInventoriesResult.DISCARDED_STALE && retryCount === 0) {
          setTimeout(() => this.loadProfile(false, 1), 5000);
        }

        const currentGuardianRank = p.profile?.data?.currentGuardianRank || 0;
        const lifetimeScore = p.profile?.data?.lifetimeScore || 0;

        useProfileStore.setState({
          currentGuardianRank,
          lifetimeScore
        });

        store.setCharacters(p.characters.data ? Object.values(p.characters.data)
          .sort((a, b) => new Date(b.dateLastPlayed).getTime() - new Date(a.dateLastPlayed).getTime())
          .map(c => ({
            ...c,
            guardianRank: currentGuardianRank,
            seasonRank: f.activeSeasonRank || 0
          })) as any : []);

        const updatedStore = useProfileStore.getState();
        if (updatedStore.selectedCharacterId && !updatedStore.characters.some(c => c.characterId === updatedStore.selectedCharacterId)) {
          warnLog('Profile', 'Selected character no longer valid after profile refresh, resetting...');
          updatedStore.setSelectedCharacter(updatedStore.characters[0]?.characterId || null);
        }

        const { ghostFarming } = useSettingsStore.getState();
        if (ghostFarming && !force && retryCount === 0) {
          this.runFarmingCheck();
        }

        return true;
      } catch (error) {
        if (error instanceof BungieApiError && error.errorCode === PlatformErrorCodes.SystemDisabled) {
          console.warn('[ProfileLoader] Maintenance detected during profile load.');
        }
        return false;
      } finally {
        this.isLoading = false;
        useProfileStore.getState().setLoading(false);
        this.loadPromise = null;
      }
    })();
    return this.loadPromise;
  }

  /**
   * Proactive Make-Room Logic (DIM-style)
   */
  private async runFarmingCheck(): Promise<void> {
    const store = useProfileStore.getState();
    const chars = store.characters;

    for (const char of chars) {
      // Check common equippable buckets
      const buckets = [1498876634, 2465295065, 953998645, 3448274439, 3551918588, 14239492, 20886954, 1585787867];
      for (const bucketHash of buckets) {
        const space = profileService.findItemsByBucket({ items: [...store.characterInventories[char.characterId] || [], ...store.characterEquipment[char.characterId] || []] }, bucketHash).length;

        // DIM Standard: If only 1 slot left, move something to vault
        if (space >= 9) {
          console.log(`[Farming] Bucket ${bucketHash} is almost full on ${char.characterId}. Moving item to vault...`);
          await transferService.moveItemToVault(char.characterId, bucketHash);
        }
      }
    }
  }

  public startAutoRefresh(intervalMs = 30000): void {
    if (this.isAutoRefreshing) return;
    this.isAutoRefreshing = true;
    const visibilityHandler = () => {
      if (!document.hidden) this.triggerImmediateRefresh();
      else this.stopAutoRefresh(true);
    };
    document.addEventListener('visibilitychange', visibilityHandler);
    window.addEventListener('online', () => this.triggerImmediateRefresh());
    this.scheduleNextRefresh(intervalMs);
  }

  private scheduleNextRefresh(intervalMs: number): void {
    this.stopAutoRefresh(true);
    if (!this.isAutoRefreshing) return;
    this.autoRefreshTimeout = setTimeout(async () => {
      const isMaintenance = useAuthStore.getState().isMaintenance;
      if (!document.hidden && useProfileStore.getState().activeTransfers.size === 0 && !isMaintenance) {
        await this.loadProfile();
      }
      this.scheduleNextRefresh(intervalMs);
    }, intervalMs);
  }

  public triggerImmediateRefresh(): void {
    if (this.autoRefreshTimeout) clearTimeout(this.autoRefreshTimeout);
    this.loadProfile();
    this.scheduleNextRefresh(30000);
  }

  public stopAutoRefresh(soft = false): void {
    if (this.autoRefreshTimeout) { clearTimeout(this.autoRefreshTimeout); this.autoRefreshTimeout = null; }
    if (!soft) this.isAutoRefreshing = false;
  }

  get loading() { return this.isLoading; }
}

export const profileLoader = new ProfileLoader();
