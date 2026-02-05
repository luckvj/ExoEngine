import React from 'react';
import './ProgressBar.css';

interface ProgressBarProps {
    percent: number;
    message?: string;
    color?: string;
    backgroundColor?: string;
    height?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
    percent,
    message,
    color = '#4CAF50',
    backgroundColor = 'rgba(0,0,0,0.3)',
    height = '8px'
}) => {
    return (
        <div className="exo-progress-container" style={{ backgroundColor }}>
            <div className="exo-progress-track" style={{ height }}>
                <div
                    className="exo-progress-fill"
                    style={{
                        width: `${Math.min(100, Math.max(0, percent))}%`,
                        backgroundColor: color
                    }}
                />
            </div>
            {message && <div className="exo-progress-message">{message}</div>}
        </div>
    );
};
