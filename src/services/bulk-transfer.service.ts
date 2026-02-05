import { transferService } from './bungie/transfer.service';
import { profileService } from './bungie/profile.service';
import { BUCKET_HASHES } from '../config/bungie.config';
import { errorLog } from '../utils/logger';

export class BulkTransferService {
    /**
     * Pulls all pullable items from a character's postmaster.
     */
    async pullFromPostmaster(characterId: string, onProgress?: (current: number, total: number, itemName: string) => void): Promise<{ success: number; failed: number }> {
        const profile = await profileService.getProfile();
        if (!profile) return { success: 0, failed: 0 };

        const postmasterItems = profile.characterInventories.data[characterId]?.items.filter(
            item => item.bucketHash === BUCKET_HASHES.POSTMASTER
        ) || [];

        if (postmasterItems.length === 0) return { success: 0, failed: 0 };

        let success = 0;
        let failed = 0;
        const total = postmasterItems.length;

        // DIM Logic: Postmaster items move to the character's inventory
        for (let i = 0; i < postmasterItems.length; i++) {
            const item = postmasterItems[i];
            const itemName = `Item ${i + 1}`;

            onProgress?.(i + 1, total, itemName);

            try {
                // Bulk transfers use the characterId as destination
                const result = await transferService.moveItem(item, 'vault', characterId);
                if (result) {
                    success++;
                } else {
                    failed++;
                }
            } catch (e) {
                errorLog('BulkTransfer', 'Failed to pull item:', e);
                failed++;
            }
        }

        // Refresh profile after bulk operation
        await profileService.getProfile();

        return { success, failed };
    }
}

export const bulkTransferService = new BulkTransferService();
