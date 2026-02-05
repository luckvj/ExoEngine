import DOMPurify from 'dompurify';
import './PerkTooltip.css';

interface PerkTooltipProps {
    name: string;
    description: string;
    type?: string;
    visible?: boolean;
    x?: number;
    y?: number;
}

export function PerkTooltip({ name, description, type, visible, x, y }: PerkTooltipProps) {
    if (!visible) return null;

    const style = {
        top: y,
        left: x,
    } as React.CSSProperties;

    return (
        <div className="perk-tooltip animate-fade-in" style={style}>
            <div className="perk-tooltip__header">
                <span className="perk-tooltip__name">{name}</span>
                {type && <span className="perk-tooltip__type">{type}</span>}
            </div>
            <div
                className="perk-tooltip__body"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(parseDestinyString(description)) }}
            />
        </div>
    );
}

// Helper to parse Destiny's rich text syntax (simplified)
function parseDestinyString(text: string): string {
    if (!text) return '';
    // Basic replacement for [Keyword] to styled spans
    return text.replace(/\[([\w\s]+)\]/g, '<span class="keyword">$1</span>');
}
