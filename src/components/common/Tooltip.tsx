import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './Tooltip.css';

interface TooltipProps {
    content: {
        name: string;
        type?: string;
        description?: string;
        stats?: Array<{ name: string; value: number | string }>;
        element?: string;
    } | null;
    children: React.ReactNode;
    className?: string;
}

export function Tooltip({ content, children, className = '' }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isVisible && triggerRef.current) {
            const updatePosition = () => {
                if (!triggerRef.current) return;
                const triggerRect = triggerRef.current.getBoundingClientRect();

                // Estimate tooltip size or measure it if possible (approximating for now or using a ref on content if complex)
                // A fixed width is set in CSS (280px), estimating height or letting it grow downwards
                // Better approach: render invisible first to measure, but simpler approach for now:
                // Just position rigidly relative to trigger for X, and smart for Y

                const tooltipWidth = 280; // from CSS


                let x = triggerRect.left + (triggerRect.width / 2) - (tooltipWidth / 2);
                let y = triggerRect.top - 10; // Default to above, but need to subtract height. 
                // Since we can't easily measure before render in this simple rewrite without layout effect flicker,
                // we'll try to position it *below* if there's space, or assume above.
                // Actually, let's position BELOW by default as it's often safer for lists, 
                // OR stick to the previous "above" logic but fix the context.

                // Let's rely on the previous calculation logic but correctly applied in portal
                // Note: We need the actual ref of the portal content to measure perfectly.
                // For this step, I will position it slightly differently to ensure it doesn't overlap the mouse immediately.

                x = Math.max(10, Math.min(window.innerWidth - tooltipWidth - 10, x));

                // Place below by default for now as it's less likely to be clipped by top of screen
                y = triggerRect.bottom + 10;

                // If specific Y is needed (like above), we'd need the height. 
                // Let's just create the portal.

                setPosition({ x, y });
            };

            updatePosition();
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);

            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [isVisible]);

    if (!content) return <>{children}</>;

    return (
        <>
            <div
                className={`tooltip-trigger ${className}`}
                ref={triggerRef}
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
            >
                {children}
            </div>
            {isVisible && createPortal(
                <div
                    className="tooltip-portal"
                    style={{
                        position: 'fixed',
                        left: `${position.x}px`,
                        top: `${position.y}px`,
                        zIndex: 999999,
                        pointerEvents: 'none'
                    }}
                >
                    <div className={`tooltip-content animate-pop-in ${content.element ? `tooltip-content--${content.element.toLowerCase()}` : ''}`}>
                        {/* Re-measure height if needed, but for now just render */}
                        <div className="tooltip-header">
                            <div className="tooltip-title">{content.name}</div>
                            {content.type && <div className="tooltip-type">{content.type}</div>}
                        </div>

                        {content.description && (
                            <div className="tooltip-body">
                                <p className="tooltip-description">{content.description}</p>
                            </div>
                        )}

                        {content.stats && content.stats.length > 0 && (
                            <div className="tooltip-stats">
                                {content.stats.map((stat, i) => (
                                    <div key={i} className="tooltip-stat">
                                        <span className="tooltip-stat__label">{stat.name}</span>
                                        <span className="tooltip-stat__value">{stat.value}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
