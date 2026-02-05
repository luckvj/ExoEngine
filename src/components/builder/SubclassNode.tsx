import type { CSSProperties, ReactNode } from 'react';
import { useProfileStore } from '../../store';
import '../../styles/TransmatEffect.css';
import './SubclassNode.css';

interface SubclassNodeProps {
    type: 'diamond' | 'square' | 'round';
    size?: 'normal' | 'large' | 'small';
    label?: string;
    icon?: string;
    status?: 'active' | 'locked' | 'empty';
    element?: 'void' | 'solar' | 'arc' | 'stasis' | 'strand' | 'prismatic';
    onClick?: () => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    style?: CSSProperties;
    children?: ReactNode;
    noBorder?: boolean;
    itemId?: string;
    itemHash?: number;
}

export function SubclassNode({
    type,
    size = 'normal',
    label,
    icon,
    status = 'empty',
    element = 'void',
    onClick,
    onMouseEnter,
    onMouseLeave,
    onContextMenu,
    style,
    children,
    noBorder,
    itemId,
    itemHash
}: SubclassNodeProps) {
    const sizeClass = size === 'large' ? 'subclass-node--large' : (size === 'small' ? 'subclass-node--small' : '');

    // Ensure we always have a valid ID for synergy web connections
    const effectiveItemId = itemId || itemHash?.toString();

    const { activeTransfers, successfulTransfers } = useProfileStore();
    const isTransferring = effectiveItemId && activeTransfers.has(effectiveItemId);
    const isSuccess = effectiveItemId && successfulTransfers.has(effectiveItemId);

    return (
        <div
            className={`subclass-node-container ${type} ${sizeClass} ${noBorder ? 'no-border' : ''} ${isTransferring ? 'transfer-active' : ''} ${isSuccess ? 'transfer-success' : ''}`}
            style={style}
            data-item-id={effectiveItemId}
            data-item-hash={itemHash}
        >
            <button
                className={`subclass-node subclass-node--${type} ${sizeClass} subclass-node--${status} element-${element} ${noBorder ? 'subclass-node--no-border' : ''}`}
                onClick={onClick}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                onContextMenu={onContextMenu}
                aria-label={label}
            >
                <div className="subclass-node__inner">
                    {icon && <img src={icon} alt="" className="subclass-node__icon" />}
                    {children}
                </div>

                {/* Diamond Border SVG for cleaner lines than CSS borders */}
                {type === 'diamond' && !noBorder && (
                    <svg className="subclass-node__border" viewBox="0 0 100 100">
                        <path d="M50 0 L100 50 L50 100 L0 50 Z" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                )}
            </button>
            {label && <span className="subclass-node__label">{label}</span>}
        </div>
    );
}
