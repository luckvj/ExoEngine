import React from 'react';
import MouseLeftIcon from '../../assets/mouse-left-plain.png';
import MouseRightIcon from '../../assets/mouse-right-plain.png';
import './ConfirmationModal.css';

export interface ConfirmationModalProps {
    isOpen: boolean;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: 'danger' | 'info';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    title = 'ARE YOU SURE?',
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    type = 'info'
}) => {
    // Generic handlers
    const handleModalClick = () => {
        // Left click anywhere to cancel
        onCancel();
    };

    const handleModalContextMenu = (e: React.MouseEvent) => {
        // Right click anywhere to confirm
        e.preventDefault();
        onConfirm();
    };

    // Robust global right-click handler using document listener
    React.useEffect(() => {
        if (!isOpen) return;

        const handleGlobalContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            onConfirm();
        };

        document.addEventListener('contextmenu', handleGlobalContextMenu);
        return () => {
            document.removeEventListener('contextmenu', handleGlobalContextMenu);
        };
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    return (
        <div
            className="d2-confirmation-modal-backdrop"
            onClick={handleModalClick}
            onContextMenu={handleModalContextMenu}
        >
            <div className="d2-confirmation-strip">
                <div className="d2-modal-container">
                    <div className="d2-modal-main">
                        <div className={`d2-modal-header d2-modal-header--${type}`}>
                            <div className="d2-info-icon-container">
                                <div className={`info-circle info-circle--${type}`}>
                                    {type === 'danger' ? '!' : 'i'}
                                </div>
                            </div>
                            <h1 className="d2-confirmation-title">{title}</h1>
                        </div>
                        <div className="d2-modal-body">
                            <p className="d2-confirmation-message">
                                {message}
                            </p>
                        </div>
                        <div className="d2-modal-footer">
                            <div className="d2-confirmation-controls">
                                <div className="control-group"
                                    onClick={(e) => { e.stopPropagation(); onCancel(); }}
                                    onContextMenu={(e) => { e.stopPropagation(); e.preventDefault(); onConfirm(); }}
                                >
                                    <img src={MouseRightIcon} className="mouse-icon-img" alt="R" />
                                    <span className="control-label confirm">{confirmText}</span>
                                </div>
                                <div className="control-group"
                                    onClick={(e) => { e.stopPropagation(); onCancel(); }}
                                    onContextMenu={(e) => { e.stopPropagation(); e.preventDefault(); onConfirm(); }}
                                >
                                    <img src={MouseLeftIcon} className="mouse-icon-img" alt="L" />
                                    <span className="control-label cancel">{cancelText}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
