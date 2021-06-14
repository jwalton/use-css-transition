import { useEffect, useRef } from 'react';
import { generateInitialState, generateNextState, State } from './state';
import { Config, TransitionItem } from './types';
import useForceUpdate from './useForceUpdate';

export * from './types';

const IMMEDIATE_UPDATE = 0;

/**
 * @param items - the items you want to animate.  If an item leaves this list,
 *   it will temporarily be kept in the returned results until it has time to
 *   transition out.
 * @param getKey - A function used to get a unique key for each item in `items`.
 * @param config - Styles to apply to item.  `from` is applied to a new
 *   item when that item first is added to `items`.  `initial` is applied to
 *   items on the very first render.  `from` is applied to an item when it
 *   first is added to `items`.  `enter` is applied to items while they are
 *   entering.  `update` is applied to an item that has entered (if `update`
 *   is not specified, `enter` is used by default), `leave` is applied to items
 *   that are leaving.  In addition `enterTime` and `leaveTime` specify the duration,
 *   in milliseconds, that these transitions should take.  `common` is a set of
 *   properties that will be merged in to all other states - handy for setting
 *   "transition" and "will-change".
 */
export function useCSSTransition<T>(
    items: T[],
    getKey: (item: T) => string,
    config: Config<T>
): TransitionItem<T>[] {
    return useTransition(items, getKey, config);
}

/**
 * This is like `useCSSTransition()`, except you can pass in any props you want
 * instead of just CSS properties.  This is most useful when you want to construct
 * two different styles for related objects (like you want to scale and position
 * and image, and want to position but not scale text over top of the image).
 *
 * This does *not* do any kind of interpolation - you have to take care of that
 * part yourself (or let your browser's CSS engine take care of it, ideally).
 *
 * @param items - the items you want to animate.  If an item leaves this list,
 *   it will temporarily be kept in the returned results until it has time to
 *   transition out.
 * @param getKey - A function used to get a unique key for each item in `items`.
 * @param config - Styles to apply to item.  `from` is applied to a new
 *   item when that item first is added to `items`.  `initial` is applied to
 *   items on the very first render.  `from` is applied to an item when it
 *   first is added to `items`.  `enter` is applied to items while they are
 *   entering.  `update` is applied to an item that has entered (if `update`
 *   is not specified, `enter` is used by default), `leave` is applied to items
 *   that are leaving.  In addition `enterTime` and `leaveTime` specify the duration,
 *   in milliseconds, that these transitions should take.  `common` is a set of
 *   properties that will be merged in to all other states - handy for setting
 *   "transition" and "will-change".
 */
export function useTransition<T, P>(
    items: T[],
    getKey: (item: T) => string,
    config: Config<T, P>
): TransitionItem<T, P>[] {
    const forceUpdate = useForceUpdate();

    const state = useRef<State<T, P> | undefined>();
    const nextState = state.current
        ? generateNextState<T, P>(state.current, items, getKey, config)
        : generateInitialState<T, P>(items, getKey, config);
    state.current = nextState;

    const nextUpdate = state.current.nextUpdate;

    useEffect(() => {
        let cleanup: (() => void) | undefined;

        if (nextUpdate !== undefined) {
            if (nextUpdate === IMMEDIATE_UPDATE || nextUpdate <= Date.now()) {
                forceUpdate();
            } else {
                const timeTillUpdate = nextUpdate - Date.now();
                const timer = setTimeout(forceUpdate, timeTillUpdate);
                cleanup = () => clearTimeout(timer);
            }
        }

        return cleanup;
    }, [nextUpdate, forceUpdate]);

    return nextState.items;
}

export default useCSSTransition;
