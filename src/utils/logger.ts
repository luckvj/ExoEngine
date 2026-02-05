/**
 * Logger Utility - Maximum visibility for production troubleshooting
 */

const IS_PRODUCTION = import.meta.env.PROD;

/** Format timestamp */
function getTimestamp(): string {
    return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/** Debug logs - Only in dev or if explicitly enabled */
export function debugLog(tag: string, ...args: unknown[]): void {
    if (IS_PRODUCTION && localStorage.getItem('_dbg') !== '1') return;
    console.log(`[DEBUG][${tag}][${getTimestamp()}]`, ...args);
}

/** Info logs - ALWAYS TRANSPARENT */
export function infoLog(tag: string, ...args: unknown[]): void {
    console.log(`[INFO][${tag}][${getTimestamp()}]`, ...args);
}

/** Warning logs - ALWAYS TRANSPARENT */
export function warnLog(tag: string, ...args: unknown[]): void {
    console.warn(`[WARN][${tag}][${getTimestamp()}]`, ...args);
}

/** Error logs - ALWAYS TRANSPARENT */
export function errorLog(tag: string, ...args: unknown[]): void {
    console.error(`[ERROR][${tag}][${getTimestamp()}]`, ...args);
}

/** Success logs - ALWAYS TRANSPARENT */
export function successLog(tag: string, ...args: unknown[]): void {
    console.log(`[SUCCESS][${tag}][${getTimestamp()}]`, ...args);
}

export function logGroup(title: string): void {
    console.group(`[GROUP] ${title}`);
}

export function logGroupEnd(): void {
    console.groupEnd();
}

export function logTable(tag: string, data: unknown): void {
    console.log(`[TABLE][${tag}]`);
    console.table(data);
}

export function createLogger(tag: string) {
    return {
        debug: (...args: unknown[]) => debugLog(tag, ...args),
        info: (...args: unknown[]) => infoLog(tag, ...args),
        warn: (...args: unknown[]) => warnLog(tag, ...args),
        error: (...args: unknown[]) => errorLog(tag, ...args),
        success: (...args: unknown[]) => successLog(tag, ...args),
        table: (data: unknown) => logTable(tag, data),
        group: (title: string) => logGroup(`[${tag}] ${title}`),
        groupEnd: () => logGroupEnd(),
    };
}

export function startTimer(label: string): () => number {
    const start = performance.now();
    return () => {
        const duration = performance.now() - start;
        debugLog('Timer', `${label}: ${duration.toFixed(2)}ms`);
        return duration;
    };
}

export function timeOperation<T>(label: string, operation: () => T | Promise<T>): T | Promise<T> {
    const timer = startTimer(label);
    try {
        const result = operation();
        if (result instanceof Promise) {
            return result.finally(() => timer()) as T;
        }
        timer();
        return result;
    } catch (error) {
        timer();
        throw error;
    }
}
