// Loader Components
import { ElementType } from '../../types';
import './Loader.css';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  element?: ElementType;
  className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div className={`spinner spinner--${size} ${className}`}>
      <img src="/logo_favicon.svg" className="spinner__logo pulse" alt="Loading" />
    </div>
  );
}

interface LoadingScreenProps {
  message?: string;
  progress?: number;
  detail?: string;
}

export function LoadingScreen({ message, progress, detail }: LoadingScreenProps) {
  return (
    <div className="loading-screen">
      <div className="loading-screen__content">
        <div className="loading-screen__logo">
          <img src="/logo_dsc.svg" className="loading-screen__logo-img pulse" alt="ExoEngine" />
        </div>

        {message && <p className="loading-screen__message">{message}</p>}

        {progress !== undefined && (
          <div className="loading-screen__progress">
            <div
              className="loading-screen__progress-bar"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        )}

        {detail && <p className="loading-screen__detail">{detail}</p>}
      </div>
    </div>
  );
}

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
}

export function Skeleton({
  width = '100%',
  height = '20px',
  borderRadius = 'var(--radius-md)',
  className = '',
}: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius }}
    />
  );
}

export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`card-skeleton ${className}`}>
      <Skeleton height="120px" borderRadius="var(--radius-lg)" />
      <Skeleton width="60%" height="24px" />
      <Skeleton width="80%" height="16px" />
      <Skeleton width="40%" height="16px" />
    </div>
  );
}

interface LoadingDotsProps {
  className?: string;
}

export function LoadingDots({ className = '' }: LoadingDotsProps) {
  return (
    <span className={`loading-dots ${className}`}>
      <span className="loading-dots__dot" />
      <span className="loading-dots__dot" />
      <span className="loading-dots__dot" />
    </span>
  );
}

export function Loader() {
  return <LoadingScreen message="Initializing Galaxy..." />;
}
