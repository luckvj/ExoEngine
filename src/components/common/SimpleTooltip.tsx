import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './SimpleTooltip.css';

interface SimpleTooltipProps {
  text: string;
  children: React.ReactElement;
  delay?: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Simple text-only tooltip replacement for browser's native title attribute
 * Styled with clean white text matching the Send To buttons
 */
export function SimpleTooltip({ text, children, delay = 500, position = 'top' }: SimpleTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<number | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    timeoutRef.current = window.setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        let x = rect.left + rect.width / 2;
        let y = rect.top;

        switch (position) {
          case 'bottom':
            y = rect.bottom;
            break;
          case 'left':
            x = rect.left;
            y = rect.top + rect.height / 2;
            break;
          case 'right':
            x = rect.right;
            y = rect.top + rect.height / 2;
            break;
          case 'top':
          default:
            y = rect.top;
            break;
        }

        setCoords({ x, y });
        setIsVisible(true);
      }
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Clone the child element and add mouse event handlers
  const childWithHandlers = React.cloneElement(children as React.ReactElement<any>, {
    onMouseEnter: (e: React.MouseEvent) => {
      showTooltip();
      if ((children as any).props?.onMouseEnter) {
        (children as any).props.onMouseEnter(e);
      }
    },
    onMouseLeave: (e: React.MouseEvent) => {
      hideTooltip();
      if ((children as any).props?.onMouseLeave) {
        (children as any).props.onMouseLeave(e);
      }
    },
  });


  return (
    <>
      {childWithHandlers}
      {isVisible && text && createPortal(
        <div
          className={`simple-tooltip simple-tooltip--${position}`}
          style={{
            left: `${coords.x}px`,
            top: `${coords.y}px`,
          }}
        >
          {text}
        </div>,
        document.body
      )}
    </>
  );
}
