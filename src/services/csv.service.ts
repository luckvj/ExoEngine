import Papa from 'papaparse';
import { errorLog } from '../utils/logger';
import { manifestService } from './bungie/manifest.service';
import { type BuildTemplate, GuardianClass, ItemSlot } from '../types';

export interface CSVLoadoutRow {
    'NAME': string;
    'CLASS': string;
    'SUBCLASS': string;
    'SUPER': string;
    'GRENADE': string;
    'MELEE': string;
    'CLASS ABILITY': string;
    'ASPECT 1': string;
    'ASPECT 2': string;
    'FRAGMENT 1': string;
    'FRAGMENT 2': string;
    'FRAGMENT 3': string;
    'FRAGMENT 4': string;
    'FRAGMENT 5': string;
    'KINETIC WEAPON': string;
    'ENERGY WEAPON': string;
    'POWER WEAPON': string;
    'HELMET': string;
    'ARMS': string;
    'CHEST': string;
    'LEGS': string;
    'CLASS ITEM': string;
    'HELMET MODS': string;
    'ARMS MODS': string;
    'CHEST MODS': string;
    'LEGS MODS': string;
    'CLASS ITEM MODS': string;
}

export const csvService = {
    /**
     * Export builds to a Plain English CSV
     */
    exportBuilds: (builds: { name: string; template: BuildTemplate }[]): string => {
        const rows: CSVLoadoutRow[] = builds.map(b => {
            const { template } = b;
            const subConfig = template.subclassConfig;

            const n = (hash: number) => hash ? manifestService.getName(hash) || 'Unknown' : '';

            // Group Armor Mods
            const armorMods = template.armorMods || [];
            const modsBySlot: Record<string, string[]> = {
                'Helmet': [],
                'Arms': [],
                'Chest': [],
                'Legs': [],
                'Class Item': []
            };

            armorMods.forEach(modHash => {
                const def = manifestService.getItem(modHash);
                if (!def) return;
                const name = def.name;
                const type = def.itemTypeDisplayName?.toLowerCase() || '';

                if (type.includes('helmet')) modsBySlot['Helmet'].push(name);
                else if (type.includes('gauntlets') || type.includes('arms')) modsBySlot['Arms'].push(name);
                else if (type.includes('chest')) modsBySlot['Chest'].push(name);
                else if (type.includes('leg')) modsBySlot['Legs'].push(name);
                else if (type.includes('class')) modsBySlot['Class Item'].push(name);
                else if (type.includes('general')) modsBySlot['Helmet'].push(name);
            });

            // Helper to get item for slot (checking both Legendaries and Exotics)
            const getWeapon = (bucketHash: number, slot: ItemSlot) => {
                // Check Exotic first
                if (template.exoticWeapon && template.exoticWeapon.slot === slot) {
                    return template.exoticWeapon.name;
                }
                // Check Legendaries
                const item = template.items?.find(i => {
                    const def = manifestService.getItem(i.hash);
                    return def?.bucketTypeHash === bucketHash;
                });
                return item ? n(item.hash) : '';
            };

            const getArmor = (subType: number, slot: ItemSlot) => {
                // Check Exotic first
                if (template.exoticArmor && template.exoticArmor.slot === slot) {
                    return template.exoticArmor.name;
                }
                // Check Legendaries
                const item = template.items?.find(i => {
                    const def = manifestService.getItem(i.hash);
                    return def?.itemSubType === subType;
                });
                return item ? n(item.hash) : '';
            };

            return {
                'NAME': b.name,
                'CLASS': manifestService.getClassName(template.guardianClass),
                'SUBCLASS': n(subConfig?.subclassHash || 0),
                'SUPER': n(subConfig?.superHash || 0),
                'GRENADE': n(subConfig?.grenadeHash || 0),
                'MELEE': n(subConfig?.meleeHash || 0),
                'CLASS ABILITY': n(subConfig?.classAbilityHash || 0),
                'ASPECT 1': subConfig?.aspects?.[0] ? n(subConfig.aspects[0]) : '',
                'ASPECT 2': subConfig?.aspects?.[1] ? n(subConfig.aspects[1]) : '',
                'FRAGMENT 1': subConfig?.fragments?.[0] ? n(subConfig.fragments[0]) : '',
                'FRAGMENT 2': subConfig?.fragments?.[1] ? n(subConfig.fragments[1]) : '',
                'FRAGMENT 3': subConfig?.fragments?.[2] ? n(subConfig.fragments[2]) : '',
                'FRAGMENT 4': subConfig?.fragments?.[3] ? n(subConfig.fragments[3]) : '',
                'FRAGMENT 5': subConfig?.fragments?.[4] ? n(subConfig.fragments[4]) : '',

                'KINETIC WEAPON': getWeapon(1498876634, ItemSlot.Kinetic),
                'ENERGY WEAPON': getWeapon(2465295065, ItemSlot.Energy),
                'POWER WEAPON': getWeapon(953998645, ItemSlot.Power),

                'HELMET': getArmor(26, ItemSlot.Helmet),
                'ARMS': getArmor(27, ItemSlot.Arms),
                'CHEST': getArmor(28, ItemSlot.Chest),
                'LEGS': getArmor(29, ItemSlot.Legs),
                'CLASS ITEM': getArmor(30, ItemSlot.ClassItem),

                'HELMET MODS': modsBySlot['Helmet'].join(', '),
                'ARMS MODS': modsBySlot['Arms'].join(', '),
                'CHEST MODS': modsBySlot['Chest'].join(', '),
                'LEGS MODS': modsBySlot['Legs'].join(', '),
                'CLASS ITEM MODS': modsBySlot['Class Item'].join(', '),
            };
        });

        return Papa.unparse(rows);
    },

    /**
     * Import builds from CSV
     */
    importBuilds: async (csvText: string): Promise<BuildTemplate[]> => {
        return new Promise((resolve, reject) => {
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const rows = results.data as CSVLoadoutRow[];
                    const templates: BuildTemplate[] = [];

                    for (const row of rows) {
                        try {
                            const t = convertRowToTemplate(row);
                            if (t) templates.push(t);
                        } catch (e) {
                            errorLog('CSV', 'Failed to parse row:', row, e);
                        }
                    }
                    resolve(templates);
                },
                error: (error: any) => reject(error)
            });
        });
    }
};

function convertRowToTemplate(row: CSVLoadoutRow): BuildTemplate | null {
    // 1. Determine Class
    const classMap: Record<string, GuardianClass> = {
        'Titan': GuardianClass.Titan,
        'Hunter': GuardianClass.Hunter,
        'Warlock': GuardianClass.Warlock
    };
    const guardianClass = classMap[row['CLASS']] ?? GuardianClass.Titan;

    // 2. Subclass
    const subclassHash = findItemHash(row['SUBCLASS'], guardianClass);
    if (!subclassHash) return null;

    // 3. Subclass Config
    const superHash = findItemHash(row['SUPER']);
    const grenadeHash = findItemHash(row['GRENADE']);
    const meleeHash = findItemHash(row['MELEE']);
    const classAbilityHash = findItemHash(row['CLASS ABILITY']);

    const aspects: number[] = [];
    if (row['ASPECT 1']) aspects.push(findItemHash(row['ASPECT 1']));
    if (row['ASPECT 2']) aspects.push(findItemHash(row['ASPECT 2']));

    const fragments: number[] = [];
    ['FRAGMENT 1', 'FRAGMENT 2', 'FRAGMENT 3', 'FRAGMENT 4', 'FRAGMENT 5'].forEach(k => {
        const name = row[k as keyof typeof row];
        if (name) fragments.push(findItemHash(name));
    });

    const subclassConfig = {
        subclassHash,
        superHash,
        grenadeHash,
        meleeHash,
        classAbilityHash,
        aspects: aspects.filter(h => h > 0),
        fragments: fragments.filter(h => h > 0)
    };

    // 4. Weapons & Armor
    const items: { hash: number; name: string }[] = [];
    let exoticWeapon: BuildTemplate['exoticWeapon'] = { hash: 0, name: 'Unknown', slot: ItemSlot.Kinetic };
    let exoticArmor: BuildTemplate['exoticArmor'] = { hash: 0, name: 'Unknown', slot: ItemSlot.Helmet };

    const gearMap = [
        { name: row['KINETIC WEAPON'], bucket: 1498876634 },
        { name: row['ENERGY WEAPON'], bucket: 2465295065 },
        { name: row['POWER WEAPON'], bucket: 953998645 },
        { name: row['HELMET'], bucket: 3448274439 },
        { name: row['ARMS'], bucket: 3551918588 },
        { name: row['CHEST'], bucket: 14239492 },
        { name: row['LEGS'], bucket: 20886954 },
        { name: row['CLASS ITEM'], bucket: 1585787867 }
    ];

    gearMap.forEach(gear => {
        if (!gear.name) return;
        const hash = findItemHash(gear.name);
        if (!hash) return;

        const def = manifestService.getItem(hash);
        if (def?.tierType === 6) { // Exotic
            if (def.itemType === 3) { // Weapon
                // Determine slot
                let slot: ItemSlot = ItemSlot.Energy;
                if (def.bucketTypeHash === 1498876634) slot = ItemSlot.Kinetic;
                if (def.bucketTypeHash === 2465295065) slot = ItemSlot.Energy;
                if (def.bucketTypeHash === 953998645) slot = ItemSlot.Power;
                exoticWeapon = { hash, name: def.name, slot };
            } else if (def.itemType === 2) { // Armor
                const sMap: Record<number, ItemSlot> = {
                    3448274439: ItemSlot.Helmet,
                    3551918588: ItemSlot.Arms,
                    14239492: ItemSlot.Chest,
                    20886954: ItemSlot.Legs
                };
                const slot = sMap[def.bucketTypeHash || 0] ?? ItemSlot.Helmet;
                exoticArmor = { hash, name: def.name, slot };
            }
        } else {
            items.push({ hash, name: def?.name || gear.name });
        }
    });

    // 5. Mods
    const armorMods: number[] = [];
    const modCols = ['HELMET MODS', 'ARMS MODS', 'CHEST MODS', 'LEGS MODS', 'CLASS ITEM MODS'];
    modCols.forEach(col => {
        const val = row[col as keyof typeof row];
        if (val) {
            const names = val.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
            names.forEach((n: string) => {
                const h = findItemHash(n);
                if (h) armorMods.push(h);
            });
        }
    });

    // 6. Element (Derive from Subclass)
    const def = manifestService.getItem(subclassHash);
    const el = def?.defaultDamageTypeHash ? manifestService.getDamageType(def.defaultDamageTypeHash)?.name.toLowerCase() : 'void';

    return {
        id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: row['NAME'] || 'Imported Build',
        element: el as any,
        guardianClass,
        exoticWeapon,
        exoticArmor,
        subclassConfig,
        armorMods,
        artifactPerks: [],
        items,
        playstyle: 'Imported from CSV',
        difficulty: 'intermediate'
    };
}

function findItemHash(name: string, classType?: number): number {
    if (!name) return 0;

    // 1. Search Manifest (Exact)
    // Using searchItems but prioritizing exact match
    const results = manifestService.searchItems(name, { limit: 10, classType });
    if (results.length > 0) {
        // Prefer exact match (case insensitive)
        const exact = results.find(i => i.name.toLowerCase() === name.toLowerCase());
        return exact ? exact.hash : results[0].hash;
    }

    return 0;
}
