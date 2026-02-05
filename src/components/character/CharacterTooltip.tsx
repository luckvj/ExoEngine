import React from 'react';
import MouseLeftIcon from '../../assets/mouse-left-plain.png';
import MouseRightIcon from '../../assets/mouse-right-plain.png';
import './CharacterTooltip.css';

export const CharacterTooltip: React.FC = () => {
    return (
        <div className="d2-tooltip">
            <div className="d2-tooltip-header">
                SELECT CHARACTER
            </div>

            <div className="d2-tooltip-content">
                <div className="d2-tooltip-status">
                    <span className="status-icon">♦</span> Guardian Modification Available
                </div>
            </div>

            <div className="d2-tooltip-footer">
                <div className="footer-action">
                    <img src={MouseLeftIcon} className="mouse-icon-img" alt="L" />
                    <span>Log In</span>
                </div>
                <div className="footer-action">
                    <img src={MouseRightIcon} className="mouse-icon-img" alt="R" />
                    <span>Log Out</span>
                </div>
                <div className="footer-action delete">
                    <div className="key-icon">F</div>
                    <span>Delete</span>
                </div>
            </div>
        </div>
    );
};
