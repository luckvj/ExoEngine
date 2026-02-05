/**
 * Easing functions for smooth animations
 */

export const easing = {
    /**
     * Deceleration curve - fast start, slow end
     * Great for elements coming to rest
     */
    easeOutCubic: (t: number): number => 1 - Math.pow(1 - t, 3),

    /**
     * Acceleration curve - slow start, fast end
     * Great for elements leaving/retracting
     */
    easeInCubic: (t: number): number => t * t * t,

    /**
     * Symmetric S-curve - slow start, fast middle, slow end
     * Great for smooth transitions
     */
    easeInOutCubic: (t: number): number =>
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,

    /**
     * Slight overshoot for organic feel
     * Great for UI elements that need a "pop"
     */
    easeOutBack: (t: number): number => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },

    /**
     * Linear interpolation helper
     */
    lerp: (start: number, end: number, t: number): number => start + (end - start) * t,
};

export default easing;
