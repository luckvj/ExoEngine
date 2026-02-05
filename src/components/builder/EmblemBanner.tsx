import { memo, type ReactNode } from 'react';
import './EmblemBanner.css';

interface EmblemBannerProps {
  emblemBackgroundPath?: string;
  emblemOverlayPath?: string;
  displayName?: string;
  guardianRank?: number;
  guardianRankName?: string;
  commendationScore?: number;
  commendationNodeScores?: Record<string, number>;
  commendationNodePercentages?: Record<string, number>;
  artifactLevel?: number;
  powerBonusXP?: { current: number; total: number };
  powerLevel?: number;
  commendationsSent?: number;
  commendationsReceived?: number;
  onSettingsClick?: () => void;
  onEmblemClick?: () => void;
  children?: ReactNode; /* Slot for Navigation */
}

export const EmblemBanner = memo(function EmblemBanner({
  emblemBackgroundPath,
  emblemOverlayPath,
  displayName,
  guardianRank,
  guardianRankName,
  commendationScore,
  commendationNodeScores,
  commendationNodePercentages,
  artifactLevel,
  powerBonusXP,
  powerLevel,
  commendationsSent,
  commendationsReceived,
  onSettingsClick,
  onEmblemClick,
  children,
}: EmblemBannerProps) {
  const bgUrl = emblemBackgroundPath;
  const logoUrl = emblemOverlayPath;

  // Guardian Rank Names mapping
  const getGuardianRankTitle = (rank: number) => {
    const rankNames: Record<number, string> = {
      1: 'New Light',
      2: 'Explorer',
      3: 'Initiate',
      4: 'Scout',
      5: 'Adventurer',
      6: 'Veteran',
      7: 'Elite',
      8: 'Justiciar',
      9: 'Vanquisher',
      10: 'Exemplar',
      11: 'Paragon'
    };
    return rankNames[rank] || guardianRankName || 'Guardian';
  };

  // Pre-calculate Commendation values for cleaner JSX
  const nodeScores = commendationNodeScores || {};
  const nodePercentages = commendationNodePercentages || {};

  const allyScore = nodeScores['154475713'] || (nodeScores as any)[154475713] || 0;
  const masteryScore = nodeScores['1341823550'] || (nodeScores as any)[1341823550] || 0;
  const funScore = nodeScores['1390663518'] || (nodeScores as any)[1390663518] || 0;
  const leadershipScore = nodeScores['4180748446'] || (nodeScores as any)[4180748446] || 0;

  let allyPct = Math.round(Number(nodePercentages['154475713'] || (nodePercentages as any)[154475713] || 0));
  let masteryPct = Math.round(Number(nodePercentages['1341823550'] || (nodePercentages as any)[1341823550] || 0));
  let funPct = Math.round(Number(nodePercentages['1390663518'] || (nodePercentages as any)[1390663518] || 0));
  let leadershipPct = Math.round(Number(nodePercentages['4180748446'] || (nodePercentages as any)[4180748446] || 0));

  // Fallback if percentages are missing but scores exist
  if (allyPct === 0 && masteryPct === 0 && funPct === 0 && leadershipPct === 0) {
    const total = Number(allyScore) + Number(masteryScore) + Number(funScore) + Number(leadershipScore);
    if (total > 0) {
      allyPct = Math.round((Number(allyScore) / total) * 100);
      masteryPct = Math.round((Number(masteryScore) / total) * 100);
      funPct = Math.round((Number(funScore) / total) * 100);
      leadershipPct = Math.round((Number(leadershipScore) / total) * 100);
    }
  }

  return (
    <div className="emblem-banner">
      {/* Layer 1: Base Texture background */}
      {bgUrl && (
        <div
          className="emblem-banner__bg"
          style={{ backgroundImage: `url(${bgUrl})` }}
        />
      )}

      {/* Layer 2: Content */}
      <div className="emblem-banner__content">
        <div className="emblem-banner__identity">
          {/* Logo */}
          {logoUrl && (
            <div
              className="emblem-banner__logo"
              style={{ backgroundImage: `url(${logoUrl})` }}
              onClick={onEmblemClick}
              role={onEmblemClick ? "button" : undefined}
              tabIndex={onEmblemClick ? 0 : undefined}
              onKeyDown={onEmblemClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onEmblemClick(); } : undefined}
            />
          )}

          <div className="emblem-banner__text">
            {/* Top Row: Identity (Name, Rank, Power) */}
            <div className="emblem-banner__identity-header">
              {displayName && (
                <span className="emblem-banner__name" style={{ fontSize: '20px', fontWeight: '800' }}>{displayName}</span>
              )}

              <div className="emblem-banner__identity-stats">
                {/* Guardian Rank */}
                {guardianRank !== undefined && (
                  <div className={`emblem-banner__stat emblem-banner__stat--rank emblem-banner__stat--rank-${guardianRank}`}>
                    <div className="emblem-banner__stat-rank-wrapper">
                      {guardianRank >= 7 && (
                        <div className="emblem-banner__rank-ornament">
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 21.5l-3.5-5.5h7z" opacity="0.8" />
                            {(guardianRank === 7 || guardianRank === 8) && (
                              <path d="M4 11c0-2.5 1.5-4 1.5-4s-.5 2 .5 4" transform="translate(1,0)" />
                            )}
                            {(guardianRank === 7 || guardianRank === 8) && (
                              <path d="M20 11c0-2.5-1.5-4-1.5-4s.5 2-.5 4" transform="translate(-1,0)" />
                            )}
                            {(guardianRank === 9 || guardianRank === 10) && (
                              <path d="M3 10c0-4 2-6 2-6s-1 3 0 6M21 10c0-4-2-6-2-6s1 3 0 6" />
                            )}
                            {guardianRank === 11 && (
                              <>
                                <path d="M2 10c0-5 3-8 3-8s-1.5 4 0 8M22 10c0-5-3-8-3-8s1.5 4 0 8" />
                                <rect x="7" y="3" width="10" height="1.5" rx="0.5" />
                              </>
                            )}
                          </svg>
                        </div>
                      )}
                      <span className="emblem-banner__stat-rank-number">
                        {guardianRank}
                      </span>
                    </div>
                    <span className="emblem-banner__stat-value" style={{ fontSize: '18px', fontWeight: '500' }}>{getGuardianRankTitle(guardianRank)}</span>
                  </div>
                )}

                {/* Power Level */}
                {powerLevel !== undefined && (
                  <div className="emblem-banner__stat emblem-banner__stat--power">
                    <span className="emblem-banner__stat-icon" style={{ color: '#efc137', fontSize: '18px', fontWeight: '400' }}>◇</span>
                    <span className="emblem-banner__stat-value" style={{ color: '#efc137', fontSize: '18px', fontWeight: '700' }}>{powerLevel}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Commendations Section */}
            <div className="emblem-banner__comms-section">
              <div className="emblem-banner__comms-row-title">
                <span className="emblem-banner__comms-title">Commendations</span>
                <div className="emblem-banner__comms-line" />
              </div>

              {/* Commendation Stats Row (Score, Received, Given) */}
              <div className="emblem-banner__comms-stats-row">
                <div className="emblem-banner__comm-stat-item">
                  <span className="emblem-banner__comm-stat-icon-star" style={{ color: '#ffffff', fontSize: '16px', marginRight: '4px' }}>★</span>
                  <span className="emblem-banner__comm-stat-value" style={{ fontSize: '16px' }}>{commendationScore?.toLocaleString()}</span>
                </div>
                <div className="emblem-banner__comm-stat-item">
                  <span className="emblem-banner__comm-stat-label">Received // </span>
                  <span className="emblem-banner__comm-stat-value" style={{ fontSize: '14px' }}>{commendationsReceived || 0}</span>
                </div>
                <div className="emblem-banner__comm-stat-item">
                  <span className="emblem-banner__comm-stat-label">Given // </span>
                  <span className="emblem-banner__comm-stat-value" style={{ fontSize: '14px' }}>{commendationsSent || 0}</span>
                </div>
              </div>

              {/* Row 4: Segmented Progress Bar */}
              <div className="emblem-banner__comm-bar">
                <div className="emblem-banner__comm-segment-row">
                  <div className="emblem-banner__comm-segment--ally" style={{ flex: Number(allyScore) || 1 }} />
                  <div className="emblem-banner__comm-segment--mastery" style={{ flex: Number(masteryScore) || 1 }} />
                  <div className="emblem-banner__comm-segment--fun" style={{ flex: Number(funScore) || 1 }} />
                  <div className="emblem-banner__comm-segment--leadership" style={{ flex: Number(leadershipScore) || 1 }} />
                </div>
              </div>

              {/* Breakdown Hover Section - MUST BE INSIDE COMMS-SECTION FOR HOVER CSS */}
              <div className="emblem-banner__breakdown">
                {/* Smaller Artifact Bar Below Commendation Bar */}
                {artifactLevel !== undefined && artifactLevel > 0 && (
                  <div className="emblem-banner__comm-artifact-bar">
                    <div
                      className="emblem-banner__comm-artifact-bar-fill"
                      style={{ width: `${Math.min((artifactLevel / 25) * 100, 100)}%` }}
                    />
                  </div>
                )}

                <span className="emblem-banner__breakdown-title">Score breakdown</span>
                <div className="emblem-banner__breakdown-grid">
                  <div className="emblem-banner__breakdown-item">
                    <div className="emblem-banner__breakdown-box emblem-banner__breakdown-box--ally">Ally</div>
                    <span className="emblem-banner__breakdown-percent emblem-banner__breakdown-percent--ally">{allyPct || 0}%</span>
                  </div>
                  <div className="emblem-banner__breakdown-item">
                    <div className="emblem-banner__breakdown-box emblem-banner__breakdown-box--mastery">Mastery</div>
                    <span className="emblem-banner__breakdown-percent emblem-banner__breakdown-percent--mastery">{masteryPct || 0}%</span>
                  </div>
                  <div className="emblem-banner__breakdown-item">
                    <div className="emblem-banner__breakdown-box emblem-banner__breakdown-box--fun">Fun</div>
                    <span className="emblem-banner__breakdown-percent emblem-banner__breakdown-percent--fun">{funPct || 0}%</span>
                  </div>
                  <div className="emblem-banner__breakdown-item">
                    <div className="emblem-banner__breakdown-box emblem-banner__breakdown-box--leadership">Leadership</div>
                    <span className="emblem-banner__breakdown-percent emblem-banner__breakdown-percent--leadership">{leadershipPct || 0}%</span>
                  </div>
                </div>

                {/* Artifact XP Bar */}
                {powerBonusXP && powerBonusXP.total > 1 && (
                  <div className="emblem-banner__progress-stat">
                    <div className="emblem-banner__progress-stat-header">
                      <span className="emblem-banner__progress-stat-label">Next Artifact Unlock:</span>
                    </div>
                    <div className="emblem-banner__progress-stat-bar-container">
                      <div className="emblem-banner__progress-stat-bar emblem-banner__progress-stat-bar--artifact">
                        <span className="emblem-banner__progress-stat-bar-label">XP</span>
                        <span className="emblem-banner__progress-stat-bar-numbers-inside">{powerBonusXP.current.toLocaleString()}/{powerBonusXP.total.toLocaleString()}</span>
                        <div
                          className="emblem-banner__progress-stat-bar-fill emblem-banner__progress-stat-bar-fill--artifact"
                          style={{ width: `${Math.min((powerBonusXP.current / powerBonusXP.total) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Slot (Children) */}
        <div className="emblem-banner__actions">
          {children}
        </div>
      </div>

      {/* Far Right: Settings wrap (Legacy/Mobile override) */}
      <div className="emblem-banner__settings-wrap">
        {onSettingsClick && (
          <button
            className="emblem-banner__settings"
            onClick={onSettingsClick}
            aria-label="Settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
});