import { useCallback, useRef, useState } from 'react';

interface LongPressOptions {
    isPreventDefault?: boolean;
    delay?: number;
}

export const useLongPress = (
    onLongPress: (event: React.TouchEvent | React.MouseEvent) => void,
    onClick: (event: React.TouchEvent | React.MouseEvent) => void,
    { isPreventDefault = true, delay = 500 }: LongPressOptions = {}
) => {
    const [longPressTriggered, setLongPressTriggered] = useState(false);
    const timeout = useRef<number | null>(null);
    const target = useRef<EventTarget | null>(null);

    const start = useCallback(
        (event: React.TouchEvent | React.MouseEvent) => {
            // Prevent context menu on long press
            if (isPreventDefault && event.target) {
                target.current = event.target;
            }
            setLongPressTriggered(false);
            timeout.current = window.setTimeout(() => {
                onLongPress(event);
                setLongPressTriggered(true);
            }, delay);
        },
        [onLongPress, delay, isPreventDefault]
    );

    const clear = useCallback(
        (event: React.TouchEvent | React.MouseEvent, shouldTriggerClick = true) => {
            if (timeout.current) {
                window.clearTimeout(timeout.current);
                timeout.current = null;
            }
            if (shouldTriggerClick && !longPressTriggered && onClick) {
                onClick(event);
            }
            setLongPressTriggered(false);
            target.current = null;
        },
        [onClick, longPressTriggered]
    );

    return {
        onMouseDown: (e: React.MouseEvent) => start(e),
        onTouchStart: (e: React.TouchEvent) => start(e),
        onMouseUp: (e: React.MouseEvent) => clear(e),
        onMouseLeave: (e: React.MouseEvent) => clear(e, false),
        onTouchEnd: (e: React.TouchEvent) => clear(e),
    };
};
