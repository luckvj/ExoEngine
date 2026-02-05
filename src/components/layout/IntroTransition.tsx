
import { useEffect, useState } from 'react';
import './IntroTransition.css';

interface IntroTransitionProps {
    onComplete: () => void;
}

export function IntroTransition({ onComplete }: IntroTransitionProps) {
    const [stage, setStage] = useState<'logos' | 'fade-out' | 'done'>('logos');

    useEffect(() => {
        // Stage 1: Logos appear (0s)

        // Stage 2: Fade out (2s)
        const timer1 = setTimeout(() => {
            setStage('fade-out');
        }, 2000);

        // Stage 3: Complete (2.5s)
        const timer2 = setTimeout(() => {
            setStage('done');
            onComplete();
        }, 2500);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, [onComplete]);

    if (stage === 'done') return null;

    return (
        <div className={`intro-overlay ${stage === 'fade-out' ? 'intro-overlay--fade-out' : ''}`}>
            <div className="intro-terminal">
                <div className="intro-scanner">
                    <div className="intro-scanner-circle">
                        <div className="intro-scanner-fill"></div>
                        <img
                            src="/logo_dsc.svg"
                            className="intro-scanner-logo pulse"
                            alt=""
                        />
                    </div>
                </div>

                <div className="intro-info">
                    <h2 className="intro-title-tactical">EXOENGINE</h2>
                    <p className="intro-status-text">LOADING</p>
                </div>
            </div>
        </div>
    );
}
