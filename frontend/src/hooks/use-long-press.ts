import { useCallback, useRef } from "react";

const LONG_PRESS_DELAY = 400;
const MOVE_TOLERANCE = 10;

interface UseLongPressOptions {
    onLongPress: () => void;
    disabled?: boolean;
}

export function useLongPress({ onLongPress, disabled }: UseLongPressOptions) {
    const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
    const firedRef = useRef(false);
    const startPos = useRef({ x: 0, y: 0 });

    const clear = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const onPointerDown = useCallback(
        (e: React.PointerEvent) => {
            if (disabled) return;
            firedRef.current = false;
            startPos.current = { x: e.clientX, y: e.clientY };
            clear();
            timerRef.current = setTimeout(() => {
                firedRef.current = true;
                onLongPress();
            }, LONG_PRESS_DELAY);
        },
        [onLongPress, disabled, clear],
    );

    const onPointerMove = useCallback(
        (e: React.PointerEvent) => {
            if (!timerRef.current) return;
            const dx = e.clientX - startPos.current.x;
            const dy = e.clientY - startPos.current.y;
            if (dx * dx + dy * dy > MOVE_TOLERANCE * MOVE_TOLERANCE) {
                clear();
            }
        },
        [clear],
    );

    const onPointerUp = useCallback(() => {
        clear();
    }, [clear]);

    const onClick = useCallback((e: React.MouseEvent) => {
        if (firedRef.current) {
            e.stopPropagation();
            e.preventDefault();
            firedRef.current = false;
        }
    }, []);

    return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onClick };
}
