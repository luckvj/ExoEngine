import React, { useState, useEffect, useRef } from 'react';
import MouseLeftIcon from '../../assets/mouse-left-plain.png';
import MouseRightIcon from '../../assets/mouse-right-plain.png';
import './NamingModal.css';

export interface NamingModalProps {
    isOpen: boolean;
    title?: string;
    message: string;
    defaultValue?: string;
    onConfirm: (name: string) => void;
    onCancel: () => void;
}

export const NamingModal: React.FC<NamingModalProps> = ({
    isOpen,
    title = 'NAME YOUR BUILD',
    message,
    defaultValue = '',
    onConfirm,
    onCancel
}) => {
    const [name, setName] = useState(defaultValue);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setName(defaultValue);
            // Focus input on open
            setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
            }, 100);
        }
    }, [isOpen, defaultValue]);

    // Handle mouse actions to match ConfirmationModal
    const handleModalClick = () => {
        onCancel();
    };

    const handleModalContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onConfirm(name.trim());
        }
    };

    // Global listeners
    useEffect(() => {
        if (!isOpen) return;

        const handleGlobalContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            if (name.trim()) {
                onConfirm(name.trim());
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && name.trim()) {
                onConfirm(name.trim());
            } else if (e.key === 'Escape') {
                onCancel();
            }
        };

        document.addEventListener('contextmenu', handleGlobalContextMenu);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('contextmenu', handleGlobalContextMenu);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, name, onConfirm, onCancel]);

    if (!isOpen) return null;

    return (
        <div
            className="d2-confirmation-modal-backdrop"
            onClick={handleModalClick}
            onContextMenu={handleModalContextMenu}
        >
            <div className="d2-confirmation-strip">
                <div className="d2-modal-container">
                    <div className="d2-modal-main" onClick={(e) => e.stopPropagation()}>
                        <div className="d2-modal-header d2-modal-header--info">
                            <div className="d2-info-icon-container">
                                <div className="info-circle info-circle--info">
                                    A
                                </div>
                            </div>
                            <h1 className="d2-confirmation-title">{title}</h1>
                        </div>
                        <div className="d2-modal-body d2-modal-body--naming">
                            <div className="naming-container">
                                <p className="d2-confirmation-message">{message}</p>
                                <input
                                    ref={inputRef}
                                    id="build-naming-input"
                                    name="build-naming-input"
                                    type="text"
                                    className="d2-naming-input"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter build name..."
                                    maxLength={40}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="d2-modal-footer">
                            <div className="d2-confirmation-controls">
                                <div className="control-group"
                                    onClick={(e) => { e.stopPropagation(); if (name.trim()) onConfirm(name.trim()); }}
                                    onContextMenu={(e) => { e.stopPropagation(); e.preventDefault(); if (name.trim()) onConfirm(name.trim()); }}
                                >
                                    <img src={MouseRightIcon} className="mouse-icon-img" alt="R" />
                                    <span className="control-label confirm">SAVE</span>
                                </div>
                                <div className="control-group"
                                    onClick={(e) => { e.stopPropagation(); onCancel(); }}
                                    onContextMenu={(e) => { e.stopPropagation(); e.preventDefault(); if (name.trim()) onConfirm(name.trim()); }}
                                >
                                    <img src={MouseLeftIcon} className="mouse-icon-img" alt="L" />
                                    <span className="control-label cancel">CANCEL</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
