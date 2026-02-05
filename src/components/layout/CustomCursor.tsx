import { useEffect, useRef, useState } from 'react';
import { useSettingsStore } from '../../store';
import './CustomCursor.css';

export const CustomCursor = () => {
  const { customCursor } = useSettingsStore();
  const cursorRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!customCursor) return;

    const updatePosition = (e: MouseEvent) => {
      // Use requestAnimationFrame for buttery smooth 144Hz+ movement
      requestAnimationFrame(() => {
        if (cursorRef.current) {
          cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
        }
      });

      if (!isVisible) setIsVisible(true);

      // Throttled hover check (every few frames is enough for logic)
      const target = e.target as HTMLElement;
      if (target) {
        const isClickable = 
          target.closest('button') || 
          target.closest('a') || 
          target.closest('[role="button"]') ||
          target.closest('.clickable') ||
          target.classList.contains('cursor-pointer') ||
          getComputedStyle(target).cursor === 'pointer';
        
        setIsHovering(!!isClickable);
      }
    };

    const handleMouseOut = () => setIsVisible(false);
    const handleMouseIn = () => setIsVisible(true);

    window.addEventListener('mousemove', updatePosition, { passive: true });
    window.addEventListener('mouseenter', handleMouseIn);
    window.addEventListener('mouseleave', handleMouseOut);

    return () => {
      window.removeEventListener('mousemove', updatePosition);
      window.removeEventListener('mouseenter', handleMouseIn);
      window.removeEventListener('mouseleave', handleMouseOut);
    };
  }, [customCursor, isVisible]);

  if (!customCursor) return null;

  return (
    <div 
      ref={cursorRef}
      className={`managed-cursor ${isHovering ? 'managed-cursor--hover' : ''} ${isVisible ? 'managed-cursor--visible' : ''}`}
    >
      <img src="/cursor.png" alt="" className="managed-cursor__image" />
    </div>
  );
};

