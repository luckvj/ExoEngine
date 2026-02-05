import React from 'react';
import { ConfirmationModal } from './ConfirmationModal';
import { useAuthStore } from '../../store';

export const BungieMaintenanceModal: React.FC = () => {
    const { isMaintenance, setMaintenance } = useAuthStore();

    if (!isMaintenance) return null;

    const handleConfirm = () => {
        // Redirect to Bungie Help
        window.open('https://x.com/BNGServerStatus', '_blank');
    };

    const handleCancel = () => {
        setMaintenance(false);
    };

    return (
        <ConfirmationModal
            isOpen={isMaintenance}
            title="BUNGIE MAINTENANCE"
            message="Bungie's servers are currently undergoing maintenance. Most API features, including item transfers and loadout management, are temporarily disabled. Please check Bungie Help for updates."
            confirmText="Bungie Help"
            cancelText="Dismiss"
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            type="info"
        />
    );
};
