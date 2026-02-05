/**
 * Clarity Service - DIM-Grade Community Descriptions
 * Fetches and manages detailed perk/mod data from the Clarity database.
 * Source: https://database-clarity.github.io/
 */
import { db } from '../db/indexeddb.service';
import { debugLog, errorLog, infoLog } from '../../utils/logger';

const CLARITY_BASE = 'https://database-clarity.github.io/';
const CLARITY_DESCRIPTIONS_URL = `${CLARITY_BASE}Live-Clarity-Database/descriptions/dim.json`;
const CLARITY_VERSION_URL = `${CLARITY_BASE}Live-Clarity-Database/versions.json`;

export interface ClarityDescription {
  [hash: number]: {
    name: string;
    description: string;
    stats?: any;
  };
}

class ClarityService {
  private descriptions: ClarityDescription | null = null;
  private isLoaded = false;

  /**
   * Load Clarity descriptions into memory, using IndexedDB cache if possible.
   */
  async load(): Promise<boolean> {
    if (this.isLoaded) return true;

    try {
      // 1. Check Version
      const versionResp = await fetch(CLARITY_VERSION_URL);
      const versionData = await versionResp.json();
      const liveVersion = versionData.descriptions; // DIM Standard: uses .descriptions field for versioning

      // 2. Check Cache
      const cachedVersion = await db.getClarityVersion();
      let data = await db.getClarityDescriptions();

      if (!data || cachedVersion !== liveVersion) {
        infoLog('Clarity', `Update required: ${liveVersion} (Cached: ${cachedVersion || 'None'})`);
        
        const dataResp = await fetch(CLARITY_DESCRIPTIONS_URL);
        data = await dataResp.json();
        
        await db.setClarityDescriptions(data!);
        await db.setClarityVersion(liveVersion);
      } else {
        debugLog('Clarity', `Loading from cache (Version: ${cachedVersion})`);
      }

      this.descriptions = data;
      this.isLoaded = true;
      return true;
    } catch (e) {
      errorLog('Clarity', 'Failed to load community descriptions', e);
      return false;
    }
  }

  /**
   * Get detailed community description for an item hash.
   */
  getDescription(hash: number): string | null {
    if (!this.descriptions) return null;
    const entry = this.descriptions[hash];
    return entry?.description || null;
  }

  /**
   * Get formatted rich data for an item (stats, durations, etc.)
   */
  getRichData(hash: number): any | null {
    if (!this.descriptions) return null;
    return this.descriptions[hash] || null;
  }
}

export const clarityService = new ClarityService();
