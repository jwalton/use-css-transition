import { useCallback, useRef, useState } from 'react';

export function useForceUpdate(): () => void {
    const count = useRef(0);
    const [, setCount] = useState(0);

    return useCallback(() => {
        if (count.current === Number.MAX_SAFE_INTEGER) {
            setCount(0);
        } else {
            setCount(count.current + 1);
        }
    }, []);
}
