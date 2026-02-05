import { errorLog } from '../utils/logger';

class CommunityService {
    /**
     * Generate shareable loadout link
     */
    generateShareLink(loadoutJson: string): string {

        const compressed = this.compressJson(loadoutJson);
        const baseUrl = window.location.origin;
        return `${baseUrl}/share?data=${encodeURIComponent(compressed)}`;
    }

    /**
     * Parse shared loadout from URL
     */
    parseShareLink(url: string): string | null {
        try {
            const params = new URLSearchParams(new URL(url).search);
            const compressed = params.get('data');
            if (!compressed) return null;
            return this.decompressJson(compressed);
        } catch (e) {
            errorLog('Community', 'Failed to parse share link:', e);
            return null;
        }
    }

    /**
     * Send loadout to Discord webhook
     */
    async sendToDiscord(webhookUrl: string, loadoutName: string, loadoutJson: string): Promise<boolean> {
        try {
            const embed = {
                title: `ExoEngine Loadout: ${loadoutName}`,
                description: '```json\n' + loadoutJson.substring(0, 1000) + '\n```',
                color: 0x00ff00,
                footer: { text: 'ExoEngine - Destiny 2 Optimizer' },
                timestamp: new Date().toISOString()
            };

            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ embeds: [embed] })
            });

            return true;
        } catch (error) {
            errorLog('Community', 'Discord webhook failed:', error);
            return false;
        }
    }

    /**
     * Simple JSON compression using base64
     */
    private compressJson(json: string): string {
        return btoa(encodeURIComponent(json));
    }

    private decompressJson(compressed: string): string {
        return decodeURIComponent(atob(compressed));
    }

    /**
     * Generate QR code data URL for mobile sharing
     */
    async generateQRCode(shareLink: string): Promise<string> {
        // Simple QR code generation (would use library in production)
        return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareLink)}`;
    }
}

export const communityService = new CommunityService();
