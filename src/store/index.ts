// Zustand Store for ExoEngine
import { create } from 'zustand';
import { warnLog } from '../utils/logger';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import type {
  AuthTokens,
  BungieMembership,
  DestinyCharacter,
  DestinyItem,
  ItemInstance,
  Toast,
  SavedBuild,
  DestinyArtifact,
  CharacterProgressions,
  BuildTemplate
} from '../types';
import { Expansion } from '../types';
import { bungieApi } from '../services/bungie/api-client';

// ===== Auth Store =====
interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  isMaintenance: boolean;
  tokens: AuthTokens | null;
  membership: BungieMembership | null;
  setAuthenticated: (auth: boolean) => void;
  setLoading: (loading: boolean) => void;
  setMaintenance: (isMaintenance: boolean) => void;
  setTokens: (tokens: AuthTokens | null) => void;
  setMembership: (membership: BungieMembership | null) => void;
  logout: (hardReset?: boolean) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  isMaintenance: false,
  tokens: null,
  membership: null,
  setAuthenticated: (auth) => set({ isAuthenticated: auth }),
  setLoading: (loading) => set({ isLoading: loading }),
  setMaintenance: (isMaintenance) => set({ isMaintenance }),
  setTokens: (tokens) => set({ tokens }),
  setMembership: (membership) => set({ membership }),
  logout: async (hardReset = false) => {
    await bungieApi.logout();
    if (hardReset) {
      const { db } = await import('../services/db/indexeddb.service');
      await db.deleteDatabase();
      localStorage.clear();
      sessionStorage.clear();
    }
    useProfileStore.getState().clear();
    set({ isAuthenticated: false, tokens: null, membership: null, isMaintenance: false });
    window.location.href = '/';
  },
}));

// ===== Profile Store =====
export const SetInventoriesResult = {
  ACCEPTED: 'ACCEPTED',
  SKIPPED_IDENTICAL: 'SKIPPED_IDENTICAL',
  DISCARDED_STALE: 'DISCARDED_STALE'
} as const;

export type SetInventoriesResult = typeof SetInventoriesResult[keyof typeof SetInventoriesResult];

export interface SynergyMatch {
  synergy: any;
  matchType: 'exact' | 'partial' | 'potential';
  matchedComponents: {
    super: boolean;
    exoticArmor: boolean;
    exoticWeapon: boolean;
    aspects: string[];
    fragments: string[];
  };
  completeness: number;
}

interface ProfileState {
  characters: DestinyCharacter[];
  selectedCharacterId: string | null;
  characterInventories: Record<string, DestinyItem[]>;
  characterEquipment: Record<string, DestinyItem[]>;
  vaultInventory: DestinyItem[];
  itemInstances: Record<string, ItemInstance>;
  artifact: DestinyArtifact | null;
  characterProgressions: Record<string, CharacterProgressions> | null;
  isLoading: boolean;
  isEquipping: boolean;
  lastUpdated: number | null;
  responseMintedTimestamp: string | null;
  currentGuardianRank: number;
  commendationScore: number;
  commendationNodeScores: Record<string, number>;
  commendationNodePercentages: Record<string, number>;
  lifetimeScore: number;
  activeSeasonRank: number;
  artifactLevel: number;
  artifactXP: { current: number; total: number };
  powerBonusXP: { current: number; total: number };
  commendationsSent: number;
  commendationsReceived: number;
  detectedSynergies: SynergyMatch[] | null;
  activeTransfers: Set<string>;
  inFlightTargets: Map<string, string>;
  successfulTransfers: Set<string>;
  failedTransfers: Set<string>;
  profilePlugSets: Record<number, number[]> | null;
  characterPlugSets: Record<string, Record<number, number[]>> | null;

  setCharacters: (characters: DestinyCharacter[]) => void;
  setSelectedCharacter: (id: string | null) => void;
  setDetectedSynergies: (synergies: SynergyMatch[] | null) => void;
  setInventories: (data: any) => SetInventoriesResult;
  setLoading: (loading: boolean) => void;
  setEquipping: (equipping: boolean) => void;
  updateItemInstance: (instanceId: string, updates: Partial<ItemInstance>) => void;
  updateItemSocket: (instanceId: string, socketIndex: number, plugHash: number, plugName?: string, plugIcon?: string) => void;
  addActiveTransfer: (instanceId: string, targetId?: string) => void;
  removeActiveTransfer: (instanceId: string, success?: boolean, failure?: boolean) => void;
  clearSuccessfulTransfer: (instanceId: string) => void;
  clearFailedTransfer: (instanceId: string) => void;
  getSelectedCharacter: () => DestinyCharacter | undefined;
  getAllInventory: () => DestinyItem[];
  virtualLoadouts: Record<string, VirtualLoadout>;
  saveVirtualLoadout: (loadout: VirtualLoadout) => void;
  deleteVirtualLoadout: (id: string) => void;
  clear: () => void;
  hydrateFromCache: () => Promise<boolean>;
}

export interface VirtualLoadout {
  id: string;
  name: string;
  items: string[];
  itemsData: { hash: number; name: string; instanceId?: string; slot?: string }[];
  classType: number;
  timestamp: number;
  icon?: string;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  characters: [],
  selectedCharacterId: localStorage.getItem('exo_selected_character'),
  characterInventories: {},
  characterEquipment: {},
  vaultInventory: [],
  itemInstances: {},
  artifact: null,
  characterProgressions: null,
  isLoading: true,
  isEquipping: false,
  lastUpdated: null,
  responseMintedTimestamp: null,
  currentGuardianRank: 0,
  commendationScore: 0,
  commendationNodeScores: {},
  commendationNodePercentages: {},
  lifetimeScore: 0,
  activeSeasonRank: 0,
  artifactLevel: 0,
  artifactXP: { current: 0, total: 1 },
  powerBonusXP: { current: 0, total: 1 },
  commendationsSent: 0,
  commendationsReceived: 0,
  detectedSynergies: null,
  activeTransfers: new Set(),
  inFlightTargets: new Map(),
  successfulTransfers: new Set(),
  failedTransfers: new Set(),
  profilePlugSets: null,
  characterPlugSets: null,
  virtualLoadouts: (() => {
    try {
      const saved = localStorage.getItem('exo_virtual_loadouts');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  })(),

  setCharacters: (characters) => {
    const currentId = get().selectedCharacterId;
    set({ characters });

    // If we have an existing selection, verify it still exists in the new list
    if (currentId && characters.some(c => c.characterId === currentId)) {
      return;
    }

    // Only auto-select if we have no selection or the selected character is gone
    if (characters.length > 0) {
      const firstId = characters[0].characterId;
      set({ selectedCharacterId: firstId });
      localStorage.setItem('exo_selected_character', firstId);
    }
  },
  setSelectedCharacter: (id) => {
    set({ selectedCharacterId: id });
    if (id) localStorage.setItem('exo_selected_character', id);
    else localStorage.removeItem('exo_selected_character');
  },
  setDetectedSynergies: (synergies) => set({ detectedSynergies: synergies }),
  setInventories: (data) => {
    const state = get();
    const incomingTimestamp = data.responseMintedTimestamp;
    const currentTimestamp = state.responseMintedTimestamp;

    // DIM STANDARD: Strict Timestamp Lockdown
    if (incomingTimestamp && currentTimestamp && new Date(incomingTimestamp).getTime() <= new Date(currentTimestamp).getTime()) {
      return SetInventoriesResult.DISCARDED_STALE;
    }

    const activeTransfers = new Set(state.activeTransfers);
    const inFlightTargets = new Map(state.inFlightTargets);

    // Helper to merge while ensuring exclusive positioning
    const mergeAndClear = (incomingItems: DestinyItem[], storeId: string, currentLocalItems: DestinyItem[]) => {
      // Phase 1: Filter out items that are currently in-flight to a DIFFERENT store
      let filteredItems = incomingItems.filter(item => {
        const instanceId = item.itemInstanceId;
        if (!instanceId) return true;

        if (activeTransfers.has(instanceId)) {
          const targetId = inFlightTargets.get(instanceId);
          // If this is NOT the target store, the item shouldn't be here (it's in-flight)
          if (targetId !== storeId) return false;

          // If this IS the target store, we'll handle it in Phase 2
          return true;
        }
        return true;
      });

      // Phase 2: Ensure in-flight items for THIS store are present and protected
      const finalItems = [...filteredItems];
      for (const [instanceId, targetId] of inFlightTargets.entries()) {
        if (targetId === storeId) {
          const foundIndex = finalItems.findIndex(i => i.itemInstanceId === instanceId);

          // If the item is already in the API response for this store, we've arrived!
          if (foundIndex !== -1) {
            activeTransfers.delete(instanceId);
            inFlightTargets.delete(instanceId);
          } else {
            // Item hasn't reached API yet, inject the local version to maintain optimistic state
            const localItem = currentLocalItems.find(i => i.itemInstanceId === instanceId);
            if (localItem) finalItems.push(localItem);
          }
        }
      }

      return finalItems;
    }; const finalCharInventories: Record<string, DestinyItem[]> = {};
    Object.keys(data.characterInventories || {}).forEach(charId => {
      finalCharInventories[charId] = mergeAndClear(data.characterInventories[charId], charId, state.characterInventories[charId] || []);
    });
    const finalCharEquipment: Record<string, DestinyItem[]> = {};
    Object.keys(data.characterEquipment || {}).forEach(charId => {
      finalCharEquipment[charId] = mergeAndClear(data.characterEquipment[charId], charId, state.characterEquipment[charId] || []);
    });
    const finalVault = mergeAndClear(data.vaultInventory, 'vault', state.vaultInventory);
    set({
      ...data,
      characterInventories: finalCharInventories,
      characterEquipment: finalCharEquipment,
      vaultInventory: finalVault,
      activeTransfers,
      inFlightTargets,
      responseMintedTimestamp: data.responseMintedTimestamp || state.responseMintedTimestamp,
      profilePlugSets: data.profilePlugSets || state.profilePlugSets,
      characterPlugSets: data.characterPlugSets || state.characterPlugSets,
      lastUpdated: Date.now()
    });
    return SetInventoriesResult.ACCEPTED;
  },
  setLoading: (isLoading) => set({ isLoading }),
  setEquipping: (isEquipping) => set({ isEquipping }),
  updateItemInstance: (instanceId: string, updates: Partial<ItemInstance>) => set(state => ({
    itemInstances: {
      ...state.itemInstances,
      [instanceId]: { ...state.itemInstances[instanceId], ...updates }
    },
    lastUpdated: Date.now()
  })),
  updateItemSocket: (instanceId: string, socketIndex: number, plugHash: number, plugName?: string, plugIcon?: string) => set(state => {
    const instance = state.itemInstances[instanceId];
    if (!instance || !instance.sockets) return state;

    const newSockets = [...instance.sockets];
    const sIdx = newSockets.findIndex(s => s.socketIndex === socketIndex);

    if (sIdx !== -1) {
      newSockets[sIdx] = {
        ...newSockets[sIdx],
        plugHash,
        isEnabled: true,
        plugName: plugName || newSockets[sIdx].plugName,
        plugIcon: plugIcon || newSockets[sIdx].plugIcon
      };
    } else {
      // If not found by index property, try array position
      if (socketIndex < newSockets.length) {
        newSockets[socketIndex] = {
          ...newSockets[socketIndex],
          plugHash,
          isEnabled: true,
          plugName: plugName || newSockets[socketIndex].plugName,
          plugIcon: plugIcon || newSockets[socketIndex].plugIcon
        };
      }
    }

    return {
      itemInstances: {
        ...state.itemInstances,
        [instanceId]: { ...instance, sockets: newSockets }
      },
      lastUpdated: Date.now()
    };
  }),
  addActiveTransfer: (instanceId, targetId) => {
    const activeTransfers = new Set(get().activeTransfers);
    const inFlightTargets = new Map(get().inFlightTargets);
    activeTransfers.add(instanceId);
    if (targetId) inFlightTargets.set(instanceId, targetId);
    set({ activeTransfers, inFlightTargets, lastUpdated: Date.now() });
  },
  removeActiveTransfer: (instanceId, success = false, failure = false) => {
    const activeTransfers = new Set(get().activeTransfers);
    const inFlightTargets = new Map(get().inFlightTargets);
    const successfulTransfers = new Set(get().successfulTransfers);
    const failedTransfers = new Set(get().failedTransfers);
    if (success) {
      successfulTransfers.add(instanceId);
      failedTransfers.delete(instanceId);
    } else if (failure) {
      failedTransfers.add(instanceId);
      activeTransfers.delete(instanceId);
      inFlightTargets.delete(instanceId);
    }
    set({ activeTransfers, inFlightTargets, successfulTransfers, failedTransfers, lastUpdated: Date.now() });
  },
  clearSuccessfulTransfer: (instanceId) => set((state) => {
    const successful = new Set(state.successfulTransfers);
    successful.delete(instanceId);
    return { successfulTransfers: successful };
  }),
  clearFailedTransfer: (instanceId) => set((state) => {
    const failed = new Set(state.failedTransfers);
    failed.delete(instanceId);
    return { failedTransfers: failed };
  }),
  getSelectedCharacter: () => {
    const state = get();
    return state.characters.find(c => c.characterId === state.selectedCharacterId);
  },
  getAllInventory: () => {
    const state = get();
    return [...state.vaultInventory, ...Object.values(state.characterInventories).flat(), ...Object.values(state.characterEquipment).flat()];
  },
  saveVirtualLoadout: (loadout) => {
    const updated = { ...get().virtualLoadouts, [loadout.id]: loadout };
    localStorage.setItem('exo_virtual_loadouts', JSON.stringify(updated));
    set({ virtualLoadouts: updated });
  },
  deleteVirtualLoadout: (id) => {
    const updated = { ...get().virtualLoadouts };
    delete updated[id];
    localStorage.setItem('exo_virtual_loadouts', JSON.stringify(updated));
    set({ virtualLoadouts: updated });
  },
  clear: () => {
    localStorage.removeItem('exo_selected_character');
    set({
      characters: [], selectedCharacterId: null, characterInventories: {}, characterEquipment: {}, vaultInventory: [],
      itemInstances: {}, artifact: null, characterProgressions: null, isLoading: false, isEquipping: false, lastUpdated: null,
      responseMintedTimestamp: null, activeTransfers: new Set(), inFlightTargets: new Map(), successfulTransfers: new Set(), failedTransfers: new Set(), detectedSynergies: null,
      profilePlugSets: null, characterPlugSets: null
    });
  },
  hydrateFromCache: async () => {
    try {
      const cached = await idbGet<any>('exo_profile_cache');
      if (cached) {
        set({ ...cached, isLoading: false });
        return true;
      }
    } catch (e) {
      warnLog('ProfileStore', 'Failed to hydrate cache', e);
    }
    return false;
  }
}));

// ===== UI Store =====
interface UIState {
  currentTab: string;
  sidebarOpen: boolean;
  builderView: 'character' | 'subclass' | 'exotics' | 'generator';
  builderSubView: any;
  hideGlobalUI: boolean;
  transmatEffect: 'none' | 'success' | 'failure';
  introComplete: boolean;
  globalTransmat: 'none' | 'success' | 'failure';
  selectedSubclass: { hash: number; itemInstanceId?: string } | null;

  setTab: (tab: string) => void;
  setSidebarOpen: (open: boolean) => void;
  setBuilderView: (view: 'character' | 'subclass' | 'exotics' | 'generator', subView?: any) => void;
  setHideGlobalUI: (hide: boolean) => void;
  triggerGlobalTransmat: (effect: 'success' | 'failure') => void;
  setIntroComplete: (complete: boolean) => void;
  setSelectedSubclass: (subclass: { hash: number; itemInstanceId?: string } | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentTab: 'galaxy',
  sidebarOpen: false,
  builderView: 'character',
  builderSubView: null,
  hideGlobalUI: false,
  transmatEffect: 'none',
  introComplete: true,
  globalTransmat: 'none',
  selectedSubclass: null,

  setTab: (tab) => set({ currentTab: tab }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setBuilderView: (view, subView = null) => set({ builderView: view, builderSubView: subView }),
  setHideGlobalUI: (hide) => set({ hideGlobalUI: hide }),
  triggerGlobalTransmat: (effect) => {
    set({ transmatEffect: effect, globalTransmat: effect });
    setTimeout(() => set({ transmatEffect: 'none', globalTransmat: 'none' }), 2500);
  },
  setIntroComplete: (introComplete) => set({ introComplete }),
  setSelectedSubclass: (selectedSubclass) => set({ selectedSubclass })
}));

// ===== Manifest Store =====
interface ManifestState {
  isLoaded: boolean;
  isLoading: boolean;
  loadingProgress: number;
  error: string | null;
  lastUpdated: number | null;
  setLoaded: (loaded: boolean) => void;
  setLoading: (loading: boolean) => void;
  setProgress: (progress: number, table?: string) => void;
  setError: (error: string | null) => void;
}

export const useManifestStore = create<ManifestState>((set) => ({
  isLoaded: false,
  isLoading: false,
  loadingProgress: 0,
  error: null,
  lastUpdated: null,
  setLoaded: (isLoaded) => set({ isLoaded, lastUpdated: Date.now() }),
  setLoading: (isLoading) => set({ isLoading }),
  setProgress: (loadingProgress) => set({ loadingProgress }),
  setError: (error) => set({ error })
}));

// ===== Settings Store =====
interface SettingsState {
  performanceMode: 'low' | 'medium' | 'high';
  maxSynergies: number;
  organizedGalaxy: boolean;
  randomVaultSeed: number;
  customCursor: boolean;
  viewMode: 'all' | 'exotics';
  deviceMode: 'pc' | 'mobile';
  imageSize: number;
  ownedExpansions: Expansion[];
  isExpansionOwned: (expansion: Expansion) => boolean;
  ghostFarming: boolean;
  showFps: boolean;
  immersiveMode: boolean;
  setPerformanceMode: (mode: 'high' | 'medium' | 'low') => void;
  setMaxSynergies: (count: number) => void;
  setOrganizedGalaxy: (organized: boolean) => void;
  toggleOrganizedGalaxy: () => void;
  rotateVaultSeed: () => void;
  toggleCustomCursor: () => void;
  setViewMode: (mode: 'all' | 'exotics') => void;
  setDeviceMode: (mode: 'pc' | 'mobile') => void;
  setImageSize: (size: number) => void;
  setOwnedExpansions: (expansions: Expansion[]) => void;
  toggleGhostFarming: () => void;
  toggleShowFps: () => void;
  toggleImmersiveMode: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  performanceMode: 'high',
  maxSynergies: 10,
  organizedGalaxy: false,
  randomVaultSeed: Math.random(),
  customCursor: true,
  viewMode: 'all',
  deviceMode: 'pc',
  imageSize: 84,
  ownedExpansions: [],
  isExpansionOwned: (exp) => get().ownedExpansions.includes(exp),
  ghostFarming: false,
  showFps: false,
  immersiveMode: true, // Default ON for immersive space-drift feel

  setPerformanceMode: (performanceMode) => set({ performanceMode }),
  setMaxSynergies: (maxSynergies) => set({ maxSynergies }),
  setOrganizedGalaxy: (organizedGalaxy) => set({ organizedGalaxy }),
  toggleOrganizedGalaxy: () => set(state => ({ organizedGalaxy: !state.organizedGalaxy })),
  rotateVaultSeed: () => set({ randomVaultSeed: Math.random() }),
  toggleCustomCursor: () => set(state => ({ customCursor: !state.customCursor })),
  setViewMode: (viewMode) => set({ viewMode }),
  setDeviceMode: (deviceMode) => set({ deviceMode }),
  setImageSize: (imageSize) => set({ imageSize }),
  setOwnedExpansions: (ownedExpansions) => set({ ownedExpansions }),
  toggleGhostFarming: () => set(state => ({ ghostFarming: !state.ghostFarming })),
  toggleShowFps: () => set(state => ({ showFps: !state.showFps })),
  toggleImmersiveMode: () => set(state => ({ immersiveMode: !state.immersiveMode }))
}));

// ===== Toast Store =====
interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id' | 'timestamp'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id, timestamp: Date.now() };
    set((state) => ({ toasts: [...state.toasts, newToast] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, toast.duration || 5000);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

// ===== Saved Builds Store =====
interface SavedBuildsState {
  builds: SavedBuild[];
  isLoading: boolean;
  error: string | null;
  loadBuilds: () => Promise<void>;
  addBuild: (build: SavedBuild) => Promise<void>;
  removeBuild: (id: string) => Promise<void>;
  setLoading: (isLoading: boolean) => void;
  setBuilds: (builds: SavedBuild[]) => void;
}

export const useSavedBuildsStore = create<SavedBuildsState>((set) => ({
  builds: [],
  isLoading: false,
  error: null,
  loadBuilds: async () => {
    set({ isLoading: true });
    try {
      const builds = await idbGet<SavedBuild[]>('exo_saved_builds') || [];
      set({ builds, isLoading: false });
    } catch (e) {
      set({ error: 'Failed to load builds', isLoading: false });
    }
  },
  addBuild: async (build) => {
    set(state => {
      const next = [...state.builds, build];
      idbSet('exo_saved_builds', next);
      return { builds: next };
    });
  },
  removeBuild: async (id) => {
    set(state => {
      const next = state.builds.filter(b => b.id !== id);
      idbSet('exo_saved_builds', next);
      return { builds: next };
    });
  },
  setLoading: (isLoading) => set({ isLoading }),
  setBuilds: (builds) => set({ builds })
}));

// ===== Generator Store =====
interface GeneratorState {
  isSpinning: boolean;
  currentBuild: BuildTemplate | string | null;
  lockedSlots: Record<string, boolean>;
  setSpinning: (isSpinning: boolean) => void;
  setCurrentBuild: (build: BuildTemplate | string | null) => void;
  toggleLock: (slot: string) => void;
}

export const useGeneratorStore = create<GeneratorState>((set) => ({
  isSpinning: false,
  currentBuild: null,
  lockedSlots: {},
  setSpinning: (isSpinning) => set({ isSpinning }),
  setCurrentBuild: (currentBuild) => set({ currentBuild }),
  toggleLock: (slot) => set(state => ({
    lockedSlots: { ...state.lockedSlots, [slot]: !state.lockedSlots[slot] }
  }))
}));
