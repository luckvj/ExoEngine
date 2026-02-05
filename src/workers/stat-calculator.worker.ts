/* eslint-disable no-restricted-globals */

/**
 * Web Worker for heavy stat calculations
 * Offloads permutation generation from main thread
 */

interface StatConstraint {
    stat: string;
    min: number;
    max?: number;
}

interface ArmorPiece {
    itemHash: number;
    stats: Record<string, number>;
    energy: number;
    isArtifice: boolean;
}

interface CalculationRequest {
    type: 'CALCULATE_PERMUTATIONS' | 'OPTIMIZE_BUILD';
    armor: ArmorPiece[];
    constraints: StatConstraint[];
    maxResults?: number;
}

interface CalculationResult {
    permutations: ArmorPiece[][];
    totalChecked: number;
    duration: number;
}

// Listen for messages from main thread
self.onmessage = (event: MessageEvent<CalculationRequest>) => {
    const startTime = performance.now();
    const { type, armor, constraints, maxResults = 100 } = event.data;

    try {
        if (type === 'CALCULATE_PERMUTATIONS') {
            const permutations = calculatePermutations(armor, constraints, maxResults);
            const duration = performance.now() - startTime;

            const result: CalculationResult = {
                permutations,
                totalChecked: permutations.length,
                duration
            };

            self.postMessage({ success: true, result });
        } else if (type === 'OPTIMIZE_BUILD') {
            const optimized = optimizeBuild(armor, constraints);
            const duration = performance.now() - startTime;

            self.postMessage({ success: true, result: { optimized, duration } });
        }
    } catch (error) {
        self.postMessage({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * Generate all valid armor permutations that meet stat constraints
 */
function calculatePermutations(
    armor: ArmorPiece[],
    constraints: StatConstraint[],
    maxResults: number
): ArmorPiece[][] {
    const results: ArmorPiece[][] = [];

    // Group armor by slot (assuming 5 slots: helmet, arms, chest, legs, class)
    const slots = groupBySlot(armor);

    // Generate combinations
    function generateCombos(
        slotIndex: number,
        current: ArmorPiece[],
        currentStats: Record<string, number>
    ) {
        if (results.length >= maxResults) return;

        if (slotIndex === slots.length) {
            // Check if this combination meets all constraints
            if (meetsConstraints(currentStats, constraints)) {
                results.push([...current]);
            }
            return;
        }

        // Try each piece in this slot
        for (const piece of slots[slotIndex]) {
            const newStats = addStats(currentStats, piece.stats);

            // Early pruning: if we can't possibly meet constraints, skip
            if (canPossiblyMeetConstraints(newStats, constraints, slotIndex, slots.length)) {
                current.push(piece);
                generateCombos(slotIndex + 1, current, newStats);
                current.pop();
            }
        }
    }

    generateCombos(0, [], {});
    return results;
}

/**
 * Optimize a single build for maximum stats
 */
function optimizeBuild(
    armor: ArmorPiece[],
    constraints: StatConstraint[]
): ArmorPiece[] {
    const slots = groupBySlot(armor);
    const best: ArmorPiece[] = [];

    // Greedy selection: pick best piece for each slot
    for (const slotPieces of slots) {
        let bestPiece = slotPieces[0];
        let bestScore = scoreArmorPiece(bestPiece, constraints);

        for (const piece of slotPieces) {
            const score = scoreArmorPiece(piece, constraints);
            if (score > bestScore) {
                bestScore = score;
                bestPiece = piece;
            }
        }

        best.push(bestPiece);
    }

    return best;
}

/**
 * Group armor pieces by slot (simplified - would need actual slot detection)
 */
function groupBySlot(armor: ArmorPiece[]): ArmorPiece[][] {
    // Simplified: assume armor is pre-sorted by slot
    // In production, would use bucketHash to group
    const slots: ArmorPiece[][] = [[], [], [], [], []];

    armor.forEach((piece, i) => {
        const slotIndex = i % 5;
        slots[slotIndex].push(piece);
    });

    return slots.filter(slot => slot.length > 0);
}

/**
 * Check if stats meet all constraints
 */
function meetsConstraints(
    stats: Record<string, number>,
    constraints: StatConstraint[]
): boolean {
    return constraints.every(c => {
        const value = stats[c.stat] || 0;
        return value >= c.min && (c.max === undefined || value <= c.max);
    });
}

/**
 * Check if it's possible to meet constraints with remaining slots
 */
function canPossiblyMeetConstraints(
    currentStats: Record<string, number>,
    constraints: StatConstraint[],
    currentSlot: number,
    totalSlots: number
): boolean {
    const remainingSlots = totalSlots - currentSlot;
    const maxPossiblePerSlot = 30; // Max stat value per armor piece

    return constraints.every(c => {
        const current = currentStats[c.stat] || 0;
        const maxPossible = current + (remainingSlots * maxPossiblePerSlot);
        return maxPossible >= c.min;
    });
}

/**
 * Add stats from two objects
 */
function addStats(
    stats1: Record<string, number>,
    stats2: Record<string, number>
): Record<string, number> {
    const result = { ...stats1 };
    for (const [stat, value] of Object.entries(stats2)) {
        result[stat] = (result[stat] || 0) + value;
    }
    return result;
}

/**
 * Score an armor piece based on how well it meets constraints
 */
function scoreArmorPiece(
    piece: ArmorPiece,
    constraints: StatConstraint[]
): number {
    let score = 0;

    for (const constraint of constraints) {
        const value = piece.stats[constraint.stat] || 0;
        score += value;
    }

    // Bonus for artifice armor
    if (piece.isArtifice) {
        score += 10;
    }

    return score;
}

// Export type for TypeScript
export { };
