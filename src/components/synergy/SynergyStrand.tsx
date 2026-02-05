import { ElementType } from '../../types';

interface SynergyStrandProps {
    from: { x: number; y: number; z: number };
    to: { x: number; y: number; z: number };
    element: ElementType;
    isActive?: boolean;
    index: number;
}

const ELEMENT_COLORS: Record<string, string> = {
    [ElementType.Solar]: '#ff9000',
    [ElementType.Arc]: '#7df9ff',
    [ElementType.Void]: '#bf84ff',
    [ElementType.Stasis]: '#4d88ff',
    [ElementType.Strand]: '#4aff9b',
    [ElementType.Prismatic]: '#ff8df6',
    [ElementType.Kinetic]: '#ffffff',
};

export function SynergyStrand({ from, to, element, isActive = true, index }: SynergyStrandProps) {
    // Project 3D coordinates to 2D for the SVG path
    // For a simple perspective projection: x' = x * (d / (d + z))
    const d = 1000; // perspective distance

    const project = (p: { x: number; y: number; z: number }) => {
        const scale = d / (d + p.z);
        return {
            x: p.x * scale,
            y: p.y * scale,
            scale
        };
    };

    const p1 = project(from);
    const p2 = project(to);

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Calculate control point for a curve
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    const sag = Math.min(distance * 0.2, 100);
    const cpX = midX;
    const cpY = midY + sag;

    const path = `M ${p1.x} ${p1.y} Q ${cpX} ${cpY} ${p2.x} ${p2.y}`;
    const color = ELEMENT_COLORS[element] || '#ffffff';
    const strokeWidth = 2 * ((p1.scale + p2.scale) / 2);

    return (
        <g className="synergy-strand">
            {/* Glow */}
            <path
                d={path}
                stroke={color}
                strokeWidth={strokeWidth * 4}
                fill="none"
                opacity={0.15}
                filter="blur(4px)"
            />
            {/* Core */}
            <path
                d={path}
                stroke={color}
                strokeWidth={strokeWidth}
                fill="none"
                opacity={isActive ? 0.8 : 0.4}
                strokeDasharray={isActive ? "none" : "4 4"}
            />
            {/* Energy Pulse */}
            {isActive && (
                <circle r={strokeWidth * 1.5} fill="#fff">
                    <animateMotion
                        dur="3s"
                        repeatCount="indefinite"
                        begin={`${index * 0.5}s`}
                        path={path}
                    />
                </circle>
            )}
        </g>
    );
}
