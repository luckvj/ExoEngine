import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GlassCard } from './GlassCard';
import './Modal.css';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    footer?: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, footer, size = 'md' }: ModalProps) {
    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div className="modal-overlay animate-fade-in" onClick={onClose}>
            <div
                className={`modal-container modal-container--${size}`}
                onClick={(e) => e.stopPropagation()}
            >
                <GlassCard className="modal-content animate-pop-in">
                    <header className="modal-header">
                        {title && <h2 className="modal-title">{title}</h2>}
                        <button className="modal-close" onClick={onClose} aria-label="Close modal">
                            &times;
                        </button>
                    </header>

                    <div className="modal-body">
                        {children}
                    </div>

                    {footer && (
                        <footer className="modal-footer">
                            {footer}
                        </footer>
                    )}
                </GlassCard>
            </div>
        </div>,
        document.body
    );
}
