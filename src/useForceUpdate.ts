import { useCallback, useState } from 'react';

export function useForceUpdate(): () => void {
    const [, setCount] = useState(0);

    return useCallback(() => {
        setCount((count) => {
            if (count === Number.MAX_SAFE_INTEGER) {
                return 0;
            } else {
                return count + 1;
            }
        });
    }, []);
}
