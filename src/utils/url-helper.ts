export function getBungieUrl(path: string | undefined): string | undefined {
    if (!path) return undefined;

    // Check for double-prefix pattern (https://www.bungie.nethttps//...)
    if (path.includes('https://www.bungie.net')) {
        // If it starts with the domain, clean it
        if (path.startsWith('https://www.bungie.net')) {
            // Check if there is TRASH after it
            // e.g. "https://www.bungie.nethttps//www.bungie.net/..."
            const secondIdx = path.indexOf('https', 10);
            if (secondIdx > -1) {
                // Aggressive clean: find the last occurrence of /common
                const commonIdx = path.indexOf('/common');
                if (commonIdx > -1) {
                    return `https://www.bungie.net${path.substring(commonIdx)}`;
                }
            }
            return path;
        }
    }

    // Standard relative path (starts with /)
    if (path.startsWith('/')) {
        return `https://www.bungie.net${path}`;
    }

    // Relative path missing leading slash
    if (!path.startsWith('http')) {
        return `https://www.bungie.net/${path}`;
    }

    // Already absolute
    return path;
}
