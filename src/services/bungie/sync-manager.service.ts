// Sync Manager Service
// Orchestrates intelligent profile refreshing based on visibility, connectivity, and heartbeat.

import { profileService } from './profile.service';
import { useProfileStore, useAuthStore } from '../../store';

class SyncManagerService {
    private lastFullRefresh = 0;
    private heartbeatTimer: number | null = null;
    private isRefreshing = false;

    // Thresholds (ms)
    private readonly FULL_REFRESH_STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes (user returned after long break)
    private readonly DELTA_REFRESH_STALE_THRESHOLD = 90 * 1000;    // 90 seconds (standard stale threshold)
    private readonly HEARTBEAT_INTERVAL = 3 * 60 * 1000;           // 3 minutes background heartbeat

    public init() {

        // 1. Visibility tracking
        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());

        // 2. Connectivity tracking
        window.addEventListener('online', () => this.handleOnline());

        // 3. Heartbeat
        this.startHeartbeat();

        // Initial sync
        this.refresh();
    }

    private handleVisibilityChange() {
        if (document.hidden) {
            this.stopHeartbeat();
        } else {
            this.startHeartbeat();

            const timeSinceLastRefresh = Date.now() - this.lastFullRefresh;

            if (timeSinceLastRefresh > this.FULL_REFRESH_STALE_THRESHOLD) {
                this.refresh(true);
            } else if (timeSinceLastRefresh > this.DELTA_REFRESH_STALE_THRESHOLD) {
                this.refresh(false);
            }
        }
    }

    private handleOnline() {
        this.refresh(true);
    }

    private startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatTimer = window.setInterval(() => {
            this.refresh(false);
        }, this.HEARTBEAT_INTERVAL);
    }

    private stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    public async refresh(full = true) {
        if (this.isRefreshing) return;

        const store = useProfileStore.getState();
        if (store.isEquipping) {
            return;
        }

        // Prevent sync if not authenticated to avoid infinite loops
        const authStore = useAuthStore.getState();
        if (!authStore.isAuthenticated && !store.characters.length) { // Allow if we have chars (maybe just token expired)
            this.isRefreshing = false; // Reset flag
            return;
        }

        if (!store.setInventories) return; // Store not ready

        const isMaintenance = authStore.isMaintenance;
        if (isMaintenance) {
            return;
        }

        this.isRefreshing = true;

        try {
            if (full) {
                const profile = await profileService.getProfile();
                if (profile) {
                    const formatted = profileService.formatForStore(profile);
                    store.setInventories(formatted);

                    // CRITICAL: Update characters too, otherwise character select screen is empty
                    if (profile.characters?.data) {
                        store.setCharacters(Object.values(profile.characters.data) as any);
                    }

                    this.lastFullRefresh = Date.now();
                }
            } else {
                // Delta sync: Just characters and basic inventory, skip heavy component parsing if possible
                const profile = await profileService.getProfile();
                if (profile) {
                    const formatted = profileService.formatForStore(profile);
                    store.setInventories(formatted);

                    // Update characters here too
                    if (profile.characters?.data) {
                        store.setCharacters(Object.values(profile.characters.data) as any);
                    }

                }
            }
        } catch (e) {
        } finally {
            this.isRefreshing = false;
        }
    }

    /**
     * Proactively trigger a refresh if we know an external action happened
     * (e.g. after a transfer or equip call completes)
     */
    public async triggerImmediateSync() {
        // Mitigation for Bungie API latency: stale reads after successful writes.
        // Waiting 0.8s allows the Bungie-side database state to "settle" before we sync.
        await new Promise(resolve => setTimeout(resolve, 800));
        this.refresh(false);
    }
}

export const syncManager = new SyncManagerService();
