import { bungieApi } from './api-client';
import { db } from '../db/indexeddb.service';
import { useSavedBuildsStore } from '../../store';
import type { SavedBuild } from '../../types';
import { infoLog, errorLog } from '../../utils/logger';

const SYNC_KEY = 'exoengine_saved_builds_v1';

class SyncService {
    private isSyncing = false;

    /**
     * Pulls builds from Bungie Cloud and merges with local storage.
     * Uses last-modified-wins conflict resolution.
     */
    async pullFromCloud(): Promise<void> {
        if (this.isSyncing) return;
        this.isSyncing = true;

        try {
            const cloudData = await bungieApi.getUserApplicationData();
            const cloudBuilds: SavedBuild[] = cloudData[SYNC_KEY] || [];

            if (cloudBuilds.length === 0) {
                // No builds in cloud - this is normal
                return;
            }

            const localBuilds = await db.getSavedBuilds();
            const mergedBuilds = this.mergeBuilds(localBuilds, cloudBuilds);

            // Update local DB and Store
            for (const build of mergedBuilds.toUpdate) {
                await db.setSavedBuild(build);
            }

            if (mergedBuilds.toUpdate.length > 0) {
                const finalBuilds = await db.getSavedBuilds();
                useSavedBuildsStore.getState().setBuilds(finalBuilds);
                infoLog('Sync', `Pulled ${mergedBuilds.toUpdate.length} updates from cloud.`);
            }

            // If we have local changes that weren't in cloud, push back
            if (mergedBuilds.requiresPush) {
                await this.pushToCloud();
            }
        } catch (error: any) {
            // Silently ignore 404s - cloud data may not exist for this user or the endpoint may not be available
            if (error?.message?.includes('404') || error?.message?.includes('not valid JSON')) {
                // Expected for new users or when endpoint is unavailable
                return;
            }
            errorLog('Sync', 'Pull failed:', error);
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Pushes all local builds to Bungie Cloud.
     */
    async pushToCloud(): Promise<void> {
        try {
            const localBuilds = await db.getSavedBuilds();
            const cloudData = await bungieApi.getUserApplicationData();

            cloudData[SYNC_KEY] = localBuilds;
            await bungieApi.setUserApplicationData(cloudData);

            infoLog('Sync', `Pushed ${localBuilds.length} builds to cloud.`);
        } catch (error) {
            errorLog('Sync', 'Push failed:', error);
        }
    }

    /**
     * Merges two sets of builds based on lastModified timestamp.
     */
    private mergeBuilds(local: SavedBuild[], cloud: SavedBuild[]): {
        toUpdate: SavedBuild[],
        requiresPush: boolean
    } {
        const toUpdate: SavedBuild[] = [];
        let requiresPush = false;

        const localMap = new Map(local.map(b => [b.id, b]));
        const cloudMap = new Map(cloud.map(b => [b.id, b]));

        // Process all cloud builds
        for (const cloudBuild of cloud) {
            const localBuild = localMap.get(cloudBuild.id);

            if (!localBuild) {
                // New build from cloud
                toUpdate.push(cloudBuild);
            } else if ((cloudBuild.lastModified || 0) > (localBuild.lastModified || 0)) {
                // Cloud build is newer
                toUpdate.push(cloudBuild);
            } else if ((localBuild.lastModified || 0) > (cloudBuild.lastModified || 0)) {
                // Local build is newer, needs push
                requiresPush = true;
            }
        }

        // Check for local builds not in cloud
        for (const localBuild of local) {
            if (!cloudMap.has(localBuild.id)) {
                requiresPush = true;
            }
        }

        return { toUpdate, requiresPush };
    }

    /**
     * Start a periodic sync heartbeat
     */
    startHeartbeat(intervalMs = 5 * 60 * 1000): void {
        setInterval(() => {
            this.pullFromCloud().catch(err => errorLog('Sync', 'Heartbeat pull failed:', err));
        }, intervalMs);
    }
}

export const syncService = new SyncService();
