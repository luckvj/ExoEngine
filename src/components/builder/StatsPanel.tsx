import { useEffect, useState } from 'react';
import type { ArmorStats } from '../../types';
import { BUNGIE_CONFIG } from '../../config/bungie.config';
import { manifestService } from '../../services/bungie/manifest.service';
import './StatsPanel.css';

interface StatsPanelProps {
  stats: ArmorStats;
  subclassElement?: string; // 'solar', 'arc', 'void', 'stasis', 'strand', 'prismatic'
  synergyElement?: string | null;
}

interface StatDisplay {
  key: string;
  label: string;
  value: number;
  icon?: string;
  description?: string;
}

// User requested specific stat list for "Edge of Fate"
const TARGET_STATS = [
  'Health',
  'Melee',
  'Grenade',
  'Super',
  'Class',
  'Weapons'
];

export function StatsPanel({ stats, subclassElement, synergyElement }: StatsPanelProps) {
  const [displayStats, setDisplayStats] = useState<StatDisplay[]>([]);
  const [hoveredStat, setHoveredStat] = useState<StatDisplay | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const loadStats = () => {
      const result: StatDisplay[] = [];

      TARGET_STATS.forEach(targetName => {
        // 1. Try to find the stat by name in the manifest (Edge of Fate new stats)
        const found = manifestService.searchStatByName(targetName);

        let label = targetName;
        let value = 0;
        let icon: string | undefined = undefined;
        let description: string | undefined = undefined;

        if (found) {
          description = found.description;
          icon = found.icon ? `${BUNGIE_CONFIG.bungieNetOrigin}${found.icon}` : undefined;

          // Map the new stat names to traditional stat values
          switch (targetName) {
            case 'Health': value = stats.resilience; break;
            case 'Melee': value = stats.strength; break;
            case 'Grenade': value = stats.discipline; break;
            case 'Super': value = stats.intellect; break;
            case 'Class': value = stats.recovery; break;
            case 'Weapons': value = stats.mobility; break;
          }
        }

        result.push({ key: targetName, label, value, icon, description });
      });

      setDisplayStats(result);
    };

    loadStats();
  }, [stats]);

  const elementColors: Record<string, string> = {
    solar: '#f0631e',
    arc: '#7df9ff',
    void: '#bf84ff',
    stasis: '#4d88ff',
    strand: '#4aff9b',
    prismatic: '#ff8df6'
  };

  // Priority: synergyElement > subclassElement > white default
  const activeElement = synergyElement || subclassElement || null;
  const barColor = activeElement ? (elementColors[activeElement.toLowerCase()] || '#ffffff') : '#ffffff';

  const handleStatMouseEnter = (stat: StatDisplay, e: React.MouseEvent) => {
    if (!stat.description) return;
    setHoveredStat(stat);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 8
    });
  };

  const handleStatMouseLeave = () => {
    setHoveredStat(null);
    setTooltipPosition(null);
  };

  return (
    <div className="stats-panel">
      {displayStats.map((stat) => (
        <div
          key={stat.key}
          className="stats-panel__row"
          onMouseEnter={(e) => handleStatMouseEnter(stat, e)}
          onMouseLeave={handleStatMouseLeave}
        >
          {stat.icon ? (
            <img src={stat.icon} alt={stat.label} className="stats-panel__icon-img" />
          ) : (
            <div className="stats-panel__icon-placeholder" />
          )}
          <div className="stats-panel__bar-outer">
            <div
              className="stats-panel__bar-inner"
              style={{
                width: `${Math.min((stat.value / 200) * 100, 100)}%`,
                backgroundColor: barColor,
                boxShadow: `0 0 8px ${barColor}80`
              }}
            />
            {/* Tier marker at 100 */}
            <div className="stats-panel__bar-tier-marker" />
          </div>
          <span className="stats-panel__value">{stat.value}</span>
        </div>
      ))}

      {/* Rich tooltip with Bungie description */}
      {hoveredStat && tooltipPosition && hoveredStat.description && (
        <div
          className="stats-panel__tooltip"
          style={{
            position: 'fixed',
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none',
            zIndex: 100001
          }}
        >
          <div className="stats-panel__tooltip-wrapper">
            <div className="stats-panel__tooltip-header">
              <div className="stats-panel__tooltip-header-content">
                {hoveredStat.icon && (
                  <img
                    src={hoveredStat.icon}
                    alt=""
                    className="stats-panel__tooltip-icon"
                  />
                )}
                <span className="stats-panel__tooltip-name">{hoveredStat.label}</span>
              </div>
            </div>
            <div className="stats-panel__tooltip-main">
              <div className="stats-panel__tooltip-description">
                {hoveredStat.description}
              </div>
            </div>
            <div className="stats-panel__tooltip-footer">
              <div className="stats-panel__tooltip-stat-value">
                {hoveredStat.value}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
