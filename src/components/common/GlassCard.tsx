// GlassCard Component - Glassmorphism styled card
import { type ReactNode, type CSSProperties } from 'react';
import { ElementType } from '../../types';
import './GlassCard.css';

interface GlassCardProps {
  children: ReactNode;
  element?: ElementType;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  glowing?: boolean;
  style?: CSSProperties;
}

export function GlassCard({
  children,
  element,
  className = '',
  onClick,
  hoverable = false,
  glowing = false,
  style,
}: GlassCardProps) {
  const elementClass = element ? `glass-${element}` : '';
  const hoverClass = hoverable ? 'glass-card--hoverable' : '';
  const glowClass = glowing ? 'glass-card--glowing' : '';
  const clickableClass = onClick ? 'glass-card--clickable' : '';

  return (
    <div
      className={`glass-card glass ${elementClass} ${hoverClass} ${glowClass} ${clickableClass} ${className}`}
      onClick={onClick}
      style={style}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {children}
    </div>
  );
}

// Preset card variants
export function ExoticCard({
  children,
  element,
  className = '',
  ...props
}: GlassCardProps) {
  return (
    <GlassCard
      element={element}
      className={`exotic-card ${className}`}
      hoverable
      glowing
      {...props}
    >
      <div className="exotic-card__border" />
      {children}
    </GlassCard>
  );
}

export function StatCard({
  label,
  value,
  element,
  className = '',
}: {
  label: string;
  value: string | number;
  element?: ElementType;
  className?: string;
}) {
  return (
    <GlassCard element={element} className={`stat-card ${className}`}>
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">{value}</span>
    </GlassCard>
  );
}
