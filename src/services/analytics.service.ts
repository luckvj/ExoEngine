import { db } from './db/indexeddb.service';
import type { DestinyItem } from '../types';

interface UsageStats {
    loadoutEquips: Record<string, number>; // loadoutId -> count
    itemEquips: Record<string, number>; // itemInstanceId -> count
    lastEquipped: Record<string, number>; // itemInstanceId -> timestamp
}

interface PerformanceMetrics {
    apiCalls: {
        endpoint: string;
        duration: number;
        success: boolean;
        timestamp: number;
    }[];
    transferStats: {
        total: number;
        successful: number;
        failed: number;
    };
}

class AnalyticsService {
    private usageStats: UsageStats = {
        loadoutEquips: {},
        itemEquips: {},
        lastEquipped: {}
    };

    private performanceMetrics: PerformanceMetrics = {
        apiCalls: [],
        transferStats: { total: 0, successful: 0, failed: 0 }
    };

    async init(): Promise<void> {
        const saved = await db.getSetting<UsageStats>('usage_stats');
        if (saved) {
            this.usageStats = saved;
        }
    }

    /**
     * Track loadout equip
     */
    trackLoadoutEquip(loadoutId: string): void {
        this.usageStats.loadoutEquips[loadoutId] =
            (this.usageStats.loadoutEquips[loadoutId] || 0) + 1;
        this.persistUsageStats();
    }

    /**
     * Track item equip
     */
    trackItemEquip(itemInstanceId: string): void {
        this.usageStats.itemEquips[itemInstanceId] =
            (this.usageStats.itemEquips[itemInstanceId] || 0) + 1;
        this.usageStats.lastEquipped[itemInstanceId] = Date.now();
        this.persistUsageStats();
    }

    /**
     * Track API call performance
     */
    trackApiCall(endpoint: string, duration: number, success: boolean): void {
        this.performanceMetrics.apiCalls.push({
            endpoint,
            duration,
            success,
            timestamp: Date.now()
        });

        // Keep only last 1000 calls
        if (this.performanceMetrics.apiCalls.length > 1000) {
            this.performanceMetrics.apiCalls = this.performanceMetrics.apiCalls.slice(-1000);
        }
    }

    /**
     * Track transfer result
     */
    trackTransfer(success: boolean): void {
        this.performanceMetrics.transferStats.total++;
        if (success) {
            this.performanceMetrics.transferStats.successful++;
        } else {
            this.performanceMetrics.transferStats.failed++;
        }
    }

    /**
     * Get most used loadouts
     */
    getMostUsedLoadouts(limit = 10): Array<{ id: string; count: number }> {
        return Object.entries(this.usageStats.loadoutEquips)
            .map(([id, count]) => ({ id, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    /**
     * Get most equipped items
     */
    getMostEquippedItems(limit = 10): Array<{ instanceId: string; count: number }> {
        return Object.entries(this.usageStats.itemEquips)
            .map(([instanceId, count]) => ({ instanceId, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    /**
     * Get API performance stats
     */
    getApiPerformance(): {
        avgDuration: number;
        p50: number;
        p95: number;
        p99: number;
        successRate: number;
    } {
        const durations = this.performanceMetrics.apiCalls
            .filter(c => c.success)
            .map(c => c.duration)
            .sort((a, b) => a - b);

        if (durations.length === 0) {
            return { avgDuration: 0, p50: 0, p95: 0, p99: 0, successRate: 0 };
        }

        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
        const p50 = durations[Math.floor(durations.length * 0.5)];
        const p95 = durations[Math.floor(durations.length * 0.95)];
        const p99 = durations[Math.floor(durations.length * 0.99)];

        const total = this.performanceMetrics.apiCalls.length;
        const successful = this.performanceMetrics.apiCalls.filter(c => c.success).length;
        const successRate = total > 0 ? (successful / total) * 100 : 0;

        return {
            avgDuration: Math.round(avg),
            p50: Math.round(p50),
            p95: Math.round(p95),
            p99: Math.round(p99),
            successRate: Math.round(successRate * 100) / 100
        };
    }

    /**
     * Get transfer success rate
     */
    getTransferStats(): { total: number; successRate: number } {
        const { total, successful } = this.performanceMetrics.transferStats;
        return {
            total,
            successRate: total > 0 ? Math.round((successful / total) * 100 * 100) / 100 : 0
        };
    }

    /**
     * Detect duplicate items (same hash + perks)
     */
    findDuplicates(items: DestinyItem[]): Array<{ hash: number; count: number; instances: string[] }> {
        const groups = new Map<string, string[]>();

        for (const item of items) {
            // Create signature from hash + socket plugs
            const signature = `${item.itemHash}`;
            const existing = groups.get(signature) || [];
            if (item.itemInstanceId) {
                existing.push(item.itemInstanceId);
            }
            groups.set(signature, existing);
        }

        return Array.from(groups.entries())
            .filter(([_, instances]) => instances.length > 1)
            .map(([sig, instances]) => ({
                hash: parseInt(sig),
                count: instances.length,
                instances
            }))
            .sort((a, b) => b.count - a.count);
    }

    /**
     * Get vault usage breakdown
     */
    getVaultBreakdown(vaultItems: DestinyItem[]): {
        weapons: number;
        armor: number;
        total: number;
        capacity: number;
        usagePercent: number;
    } {
        const WEAPON_BUCKETS = [1498876634, 2465295065, 953998645];
        const ARMOR_BUCKETS = [3448274439, 3551918588, 14239492, 20886954, 1585787867];

        const weapons = vaultItems.filter(i => WEAPON_BUCKETS.includes(i.bucketHash)).length;
        const armor = vaultItems.filter(i => ARMOR_BUCKETS.includes(i.bucketHash)).length;
        const total = vaultItems.length;
        const capacity = 500;

        return {
            weapons,
            armor,
            total,
            capacity,
            usagePercent: Math.round((total / capacity) * 100 * 100) / 100
        };
    }

    private async persistUsageStats(): Promise<void> {
        await db.setSetting('usage_stats', this.usageStats);
    }

    /**
     * Export all analytics data
     */
    exportData(): string {
        return JSON.stringify({
            usage: this.usageStats,
            performance: this.performanceMetrics,
            exportedAt: Date.now()
        }, null, 2);
    }

    /**
     * Clear all analytics data
     */
    async clearData(): Promise<void> {
        this.usageStats = { loadoutEquips: {}, itemEquips: {}, lastEquipped: {} };
        this.performanceMetrics = {
            apiCalls: [],
            transferStats: { total: 0, successful: 0, failed: 0 }
        };
        await db.setSetting('usage_stats', this.usageStats);
    }
}

export const analyticsService = new AnalyticsService();
