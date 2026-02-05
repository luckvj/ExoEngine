import type { DestinyItem } from '../../types';
import { manifestService } from './manifest.service';

/**
 * DIM-Grade Search Service
 * Implements recursive query parsing and range comparisons for item filtering.
 */

export type FilterOperator = 'and' | 'or' | 'not';
export type RangeOperator = '<' | '<=' | '>' | '>=' | '=';

export interface SearchQuery {
    operator?: FilterOperator;
    operands?: SearchQuery[];
    filterType?: string;
    filterValue?: string;
    compareOp?: RangeOperator;
    compareValue?: number;
}

class SearchService {
    /**
     * Parse a query string into a recursive SearchQuery AST
     */
    parseQuery(query: string): SearchQuery {
        query = query.trim().toLowerCase();
        if (!query) return { filterType: 'nop' };

        // Simple implementation for Phase 2: Handle keyword and is: filters
        // Advanced recursive parsing can be added later if needed.
        if (query.includes(' ')) {
            // Assume AND for spaces for now
            const parts = query.split(/\s+/);
            return {
                operator: 'and',
                operands: parts.map(p => this.parseSingleFilter(p))
            };
        }

        return this.parseSingleFilter(query);
    }

    private parseSingleFilter(filter: string): SearchQuery {
        if (filter.startsWith('is:')) {
            return { filterType: 'is', filterValue: filter.substring(3) };
        }

        if (filter.startsWith('stat:')) {
            return this.parseStatFilter(filter.substring(5));
        }

        return { filterType: 'keyword', filterValue: filter };
    }

    private parseStatFilter(statParam: string): SearchQuery {
        // Expected format: statname:>=val
        const parts = statParam.split(':');
        if (parts.length < 2) return { filterType: 'keyword', filterValue: statParam };

        const statName = parts[0];
        const rangeStr = parts[1];

        const match = rangeStr.match(/^([<=>]{1,2})(\d+)$/);
        if (match) {
            return {
                filterType: 'stat',
                filterValue: statName,
                compareOp: match[1] as RangeOperator,
                compareValue: parseInt(match[2], 10)
            };
        }

        return { filterType: 'keyword', filterValue: statParam };
    }

    /**
     * Create a filter function from a SearchQuery
     */
    createFilter(query: string | SearchQuery): (item: DestinyItem, stats?: any) => boolean {
        const ast = typeof query === 'string' ? this.parseQuery(query) : query;

        return (item: DestinyItem, stats?: any) => this.evaluate(item, stats, ast);
    }

    private evaluate(item: DestinyItem, stats: any, query: SearchQuery): boolean {
        if (query.operator === 'and') {
            return query.operands?.every(op => this.evaluate(item, stats, op)) ?? true;
        }
        if (query.operator === 'or') {
            return query.operands?.some(op => this.evaluate(item, stats, op)) ?? false;
        }
        if (query.operator === 'not') {
            return !this.evaluate(item, stats, query.operands![0]);
        }

        switch (query.filterType) {
            case 'is':
                return this.evaluateIs(item, query.filterValue!);
            case 'stat':
                return this.evaluateStat(stats, query.filterValue!, query.compareOp!, query.compareValue!);
            case 'keyword':
                return this.evaluateKeyword(item, query.filterValue!);
            default:
                return true;
        }
    }

    private evaluateIs(item: DestinyItem, value: string): boolean {
        const def = manifestService.getItem(item.itemHash);
        if (!def) return false;

        switch (value) {
            case 'armor': return item.bucketHash === 344827443 || item.bucketHash === 3551918588 || item.bucketHash === 14239492 || item.bucketHash === 20886954 || item.bucketHash === 1585787867;
            case 'weapon': return item.bucketHash === 1498870895 || item.bucketHash === 2465295065 || item.bucketHash === 953954087;
            case 'exotic': return def.tierType === 6;
            case 'legendary': return def.tierType === 5;
            default: return false;
        }
    }

    private evaluateStat(stats: any, statName: string, op: RangeOperator, val: number): boolean {
        if (!stats) return false;
        const statValue = stats[statName] || stats.weaponStats?.[statName];
        if (statValue === undefined) return false;

        switch (op) {
            case '<': return statValue < val;
            case '<=': return statValue <= val;
            case '>': return statValue > val;
            case '>=': return statValue >= val;
            case '=': return statValue === val;
            default: return false;
        }
    }

    private evaluateKeyword(item: DestinyItem, keyword: string): boolean {
        const def = manifestService.getItem(item.itemHash);
        if (!def) return false;

        // Minimal search logic
        const name = def.name?.toLowerCase() || '';
        return name.includes(keyword);
    }
}

export const searchService = new SearchService();
