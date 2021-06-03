import { useCallback, useState } from 'react';

export function useForceUpdate(): () => void {
    const [, setCount] = useState(0);

    let defer: (fn: () => void) => void;

    if (typeof window !== 'undefined') {
        defer = window.requestAnimationFrame;
    } else {
        defer = (fn: () => void) => setTimeout(fn, 1);
    }

    return useCallback(() => {
        defer(() => {
            setCount((count) => {
                if (count === Number.MAX_SAFE_INTEGER) {
                    return 0;
                } else {
                    return count + 1;
                }
            });
        });
    }, []);
}
