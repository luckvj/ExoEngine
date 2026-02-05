import './TierBadge.css';

interface TierBadgeProps {
    tier: number;
}

export function TierBadge({ tier }: TierBadgeProps) {
    if (!tier || tier <= 0) return null;

    // Maximum 5 tiers as per user request
    const count = Math.min(tier, 5);

    return (
        <div className={`tier-badge tier-badge--${count}`}>
            {Array.from({ length: 5 }).map((_, i) => (
                <svg
                    key={i}
                    className={`tier-badge__star ${i < count ? 'active' : 'inactive'}`}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
            ))}
        </div>
    );
}
