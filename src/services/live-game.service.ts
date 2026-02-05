// Live Game Service - Aggregates real-time data for the Agent
// Handles Weekly Reset, Vendors, and Daily Rotations using Bungie API

import { bungieApi } from './bungie/api-client';
import { manifestService } from './bungie/manifest.service';
import { activityService, type ActivityInfo } from './activity.service';
import { useProfileStore, useAuthStore } from '../store';
import { debugLog, errorLog } from '../utils/logger';

export interface WeeklyResetInfo {
    weekStart: string;
    nightfall?: ActivityInfo;
    raidRotator?: string;
    dungeonRotator?: string;
    cruciblePlaylist?: string;
    lostSector?: ActivityInfo;
}

export interface VendorItem {
    name: string;
    type: string;
    hash: number;
    costs: string[];
    perks: string[];
    stats?: Record<string, number>;
}

export interface VendorInfo {
    name: string;
    location: string;
    nextRefresh: string;
    items: VendorItem[];
}

class LiveGameService {

    /**
     * Get comprehensive weekly reset data
     */
    async getWeeklyReset(): Promise<WeeklyResetInfo> {
        // const _milestones = await activityService.getPublicMilestones();
        const nightfall = await activityService.findActivity('nightfall');

        // Raid Rotator (Milestone Hash: 2986584050 - roughly)
        // We'll need to identifying them by looking for "Weekly Dungeon" or "Weekly Raid" strings in definitions
        // For now, simpler fuzzy matching on milestones

        let raidRotator = 'Unknown';
        let dungeonRotator = 'Unknown';

        // Helper to find rotator names
        // This is heuristic-based since hashes change or are numerous
        // Ideally we'd have a config of known milestone hashes

        // Attempt to identify rotators
        // Note: Real implementation would check specific hashes. 
        // For this demo, we'll try to find activities with "Weekly" in the name if possible, 
        // or rely on the agent to fall back to generic advice if not found.

        return {
            weekStart: this.getResetDate().toISOString(),
            nightfall: nightfall || undefined,
            raidRotator: raidRotator !== 'Unknown' ? raidRotator : undefined,
            dungeonRotator: dungeonRotator !== 'Unknown' ? dungeonRotator : undefined,
        };
    }

    /**
     * Calculate last weekly reset date
     */
    private getResetDate(): Date {
        const now = new Date();
        const day = now.getUTCDay(); // 0 = Sunday, 2 = Tuesday
        const hour = now.getUTCHours();

        const resetDay = 2; // Tuesday
        const resetHour = 17; // 17:00 UTC (standard reset) - adjusts for DLS in reality but good baseline

        const date = new Date(now);
        const daysSinceReset = (day + 7 - resetDay) % 7;

        if (daysSinceReset === 0 && hour < resetHour) {
            // It's Tuesday but before reset
            date.setUTCDate(date.getUTCDate() - 7);
        } else {
            date.setUTCDate(date.getUTCDate() - daysSinceReset);
        }

        date.setUTCHours(resetHour, 0, 0, 0);
        return date;
    }

    /**
     * Get Xur's Inventory
     */
    async getXurInventory(): Promise<VendorInfo | null> {
        return this.getVendorInventory(2190858386); // Xur's Hash
    }

    /**
     * Get Ada-1's Inventory
     */
    async getAdaInventory(): Promise<VendorInfo | null> {
        return this.getVendorInventory(350061650); // Ada-1's Hash
    }

    /**
     * Fetch generic vendor inventory
     * Requires Auth
     */
    /**
     * Fetch generic vendor inventory
     * Requires Auth
     */
    private async getVendorInventory(vendorHash: number): Promise<VendorInfo | null> {
        const state = useProfileStore.getState();
        const characterId = state.selectedCharacterId;
        const authState = useAuthStore.getState();
        const membershipId = authState.membership?.membershipId;
        const membershipType = authState.membership?.membershipType;

        if (!characterId || !membershipId) {
            debugLog('LiveGame', 'Cannot fetch vendors: No character selected');
            return null;
        }

        // Check if user is authenticated with Bungie
        const isAuth = await bungieApi.isAuthenticated();
        if (!isAuth) {
            debugLog('LiveGame', 'Cannot fetch vendors: User not authenticated');
            return null;
        }

        try {
            // Components: 400 (Vendors), 402 (VendorSales), 305 (ItemSockets), 304 (ItemStats), 300 (ItemInstances)
            const response = await bungieApi.get<any>(
                `/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}/Vendors/${vendorHash}/?components=400,402,305,304,300`
            );

            if (!response || !response.sales || !response.sales.data) {
                return null;
            }

            const sales = response.sales.data; // Map of sale index to item info
            const itemComponents = response.itemComponents; // Pivot: components are inside itemComponents[vendorHash] ? No, structure is weird for vendor calls.
            // Vendor response structure: response.sales.data[key].itemHash
            // Item details are in response.itemComponents keys (sockets, stats, etc) keyed by *sale index* (key from sales.data) NOT itemHash/instanceId.
            // Actually, for vendors, the key is the "vendor item index".

            const formattedItems: VendorItem[] = [];

            // Get vendor definition for name
            const vendorDef = manifestService.getFullDefinition(vendorHash) as any;
            const vendorName = vendorDef?.displayProperties?.name || 'Vendor';
            const nextRefresh = response.vendors?.data?.nextRefreshDate || '';

            for (const [key, saleItem] of Object.entries(sales)) {
                const item = saleItem as any;
                const itemHash = item.itemHash;
                const def = manifestService.getItem(itemHash);

                if (!def) continue;

                // Filter for interesting items (Exotics, Legendary Weapons/Armor)
                // Type 3 = Weapon, 2 = Armor
                if (def.itemType !== 3 && def.itemType !== 2) continue;

                const perks: string[] = [];
                const itemStats: Record<string, number> = {};

                const sockets = itemComponents?.sockets?.data?.[key]?.sockets;
                if (sockets) {
                    sockets.forEach((socket: any) => {
                        if (socket.plugHash) {
                            const plug = manifestService.getItem(socket.plugHash) as any;
                            // Filter for "Traits" or "Intrinsic" to avoid noise
                            if (plug && (plug.itemTypeDisplayName === 'Trait' || plug.itemTypeDisplayName === 'Intrinsic')) {
                                perks.push(plug.displayProperties?.name || 'Unknown');
                            }
                        }
                    });
                }

                // Parse Stats from Component 304
                const stats = itemComponents?.stats?.data?.[key]?.stats;
                if (stats) {
                    Object.values(stats).forEach((stat: any) => {
                        const statDef = manifestService.getDefinition('DestinyStatDefinition', stat.statHash) as any;
                        if (statDef && statDef.displayProperties) {
                            itemStats[statDef.displayProperties.name] = stat.value;
                        }
                    });
                }

                formattedItems.push({
                    name: (def as any).displayProperties?.name || 'Unknown',
                    type: (def as any).itemTypeDisplayName || 'Item',
                    hash: itemHash,
                    costs: item.costs.map((c: any) => `${c.quantity} ${manifestService.getName(c.itemHash) || 'Currency'}`),
                    perks: perks,
                    stats: itemStats
                });
            }

            return {
                name: vendorName,
                location: 'Unknown (Check Map)', // Location requires parsing vendor.data.vendorLocationIndex
                nextRefresh: nextRefresh,
                items: formattedItems
            };

        } catch (error) {
            errorLog('LiveGame', 'Failed to fetch vendor:', error);
            return null;
        }
    }

    async getUnclaimedOrders(): Promise<number> {
        // Placeholder for Renegades 'getUnclaimedOrderRewards' API
        // Would fetch component to count actionable rewards
        return 0; // Default to 0 until API is live
    }

    async getPortalStatus(): Promise<{ bonusFocusNode: string, activeRootNode: string } | null> {
        // Placeholder for Renegades Portal Graph API
        return {
            bonusFocusNode: 'Unknown',
            activeRootNode: 'Tower (Renegades Default)'
        };
    }

    async getPowerCaps(): Promise<{ soft: number; powerful: number; pinnacle: number }> {
        // Updated for "Renegades" (2025) - Power Level Squish
        // Source: User provided / Renegades API docs
        // NOTE: Future enhancement - fetch dynamically from DestinySeasonDefinition.preview.powerCap
        return {
            soft: 500,
            powerful: 540,
            pinnacle: 550
        };
    }
}

export const liveGameService = new LiveGameService();
