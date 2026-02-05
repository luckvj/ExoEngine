import React, { useEffect, useState } from 'react';
import './NeuralLinkConnection.css';

interface NeuralLinkConnectionProps {
    isActive: boolean;
    buttonRef: React.RefObject<HTMLButtonElement | null>;
    travelerRef: React.RefObject<HTMLImageElement | null>;
}

export const NeuralLinkConnection: React.FC<NeuralLinkConnectionProps> = ({
    isActive,
    buttonRef,
    travelerRef
}) => {
    const [pathD, setPathD] = useState('');

    // Generate random variations once on mount to ensure unique "link location" per session
    const [randomOffsets] = useState(() => {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 120; // Wander significant distance (120px) from center

        return {
            sourceX: Math.cos(angle) * radius,
            sourceY: Math.sin(angle) * radius,
            // We'll calculate specific control points in the render to arc AWAY from the button center
            controlRandomness: (Math.random() * 100) + 50,
            targetSide: Math.floor(Math.random() * 3), // 0:Top, 1:Right, 2:Left (Removed Bottom center)
            targetPos: Math.random()
        };
    });

    useEffect(() => {
        const updatePath = () => {
            if (!buttonRef.current || !travelerRef.current) return;

            const buttonRect = buttonRef.current.getBoundingClientRect();
            const travelerRect = travelerRef.current.getBoundingClientRect();

            // Source: Center of Traveler + Random Jitter
            const x1 = travelerRect.left + travelerRect.width / 2 + randomOffsets.sourceX;
            const y1 = travelerRect.top + travelerRect.height / 2 + randomOffsets.sourceY;

            // Target calculations
            let x2 = 0;
            let y2 = 0;
            let cx2 = 0; // Target control point (pulls line away from button body)

            switch (randomOffsets.targetSide) {
                case 0: // Top Edge (CORNERS ONLY)
                    // If targetPos < 0.5, go to Left Corner (0-20%), else Right Corner (80-100%)
                    if (randomOffsets.targetPos < 0.5) {
                        x2 = buttonRect.left + (buttonRect.width * (randomOffsets.targetPos * 0.4)); // 0 to 0.2
                        cx2 = x2 - randomOffsets.controlRandomness; // Pull left
                    } else {
                        x2 = buttonRect.left + (buttonRect.width * (0.8 + (randomOffsets.targetPos * 0.4))); // 0.8 to 1.0 (remapped from 0.5-1.0)
                        cx2 = x2 + randomOffsets.controlRandomness; // Pull right
                    }
                    y2 = buttonRect.top;
                    break;

                case 1: // Right Edge
                    x2 = buttonRect.right;
                    y2 = buttonRect.top + (buttonRect.height * (randomOffsets.targetPos * 0.85));
                    cx2 = x2 + randomOffsets.controlRandomness; // Pull right (away)
                    break;

                case 2: // Left Edge
                    x2 = buttonRect.left;
                    y2 = buttonRect.top + (buttonRect.height * (randomOffsets.targetPos * 0.85));
                    cx2 = x2 - randomOffsets.controlRandomness; // Pull left (away)
                    break;

                default:
                    // Fallback to top left corner
                    x2 = buttonRect.left;
                    y2 = buttonRect.top;
                    cx2 = x2 - 50;
            }

            // Source control point can still be chaotic
            const cx1 = x1 + (Math.random() - 0.5) * 300;

            // Calculate cy2 to be somewhat perpendicular or smoothed
            const cy2 = y2 - 100;
            // cy1 moves towards target vertical
            const cy1 = y1 + (y2 - y1) * 0.5;

            setPathD(`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`);
        };



        // Initial update
        updatePath();

        // Use ResizeObserver for robust tracking of element size/position changes
        const observer = new ResizeObserver(updatePath);
        if (buttonRef.current) observer.observe(buttonRef.current);
        if (travelerRef.current) observer.observe(travelerRef.current);

        // Keep scroll listener as it changes rects without resizing elements
        window.addEventListener('scroll', updatePath);

        return () => {
            observer.disconnect();
            window.removeEventListener('scroll', updatePath);
        };
    }, [buttonRef, travelerRef, randomOffsets]);

    return (
        <div className="neural-link-svg-container">
            <svg className="neural-link-svg">
                {/* Base subtle line */}
                <path
                    d={pathD}
                    className={`neural-path-base ${isActive ? 'active' : ''}`}
                />

                {/* Layer 1: Radiolaria (The raw fluid - Milky White/Vex) */}
                <path
                    d={pathD}
                    className={`neural-path-radiolaria ${isActive ? 'active' : ''}`}
                />

                {/* Layer 2: Clarity (The structuring force - Stasis/Dark Blue) */}
                <path
                    d={pathD}
                    className={`neural-path-clarity ${isActive ? 'active' : ''}`}
                />

                {/* Connection points */}
                {isActive && (
                    <circle cx={pathD.split(' ')[1]} cy={pathD.split(' ')[2]} r="4" className="neural-node-source" />
                )}
            </svg>
        </div>
    );
};
