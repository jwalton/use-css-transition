import { useCallback, useRef, useState } from 'react';

/**
 * Returns a function which can be called to force the parent component to update.
 */
export default function useForceUpdate(): () => void {
    const [, setCount] = useState(0);
    const updating = useRef(false);

    let defer: (fn: () => void) => void;

    if (typeof window !== 'undefined') {
        defer = window.requestAnimationFrame;
    } else {
        defer = (fn: () => void) => setTimeout(fn, 1);
    }

    return useCallback(() => {
        if (updating.current) {
            // Already updating.
            return;
        }
        updating.current = true;

        defer(() => {
            updating.current = false;
            setCount((count) => {
                if (count === Number.MAX_SAFE_INTEGER) {
                    return 0;
                } else {
                    return count + 1;
                }
            });
        });
    }, [defer]);
}
