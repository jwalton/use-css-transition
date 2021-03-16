import { Config, ItemState, TransitionItem } from './types';

const IMMEDIATE_UPDATE = 0;

export interface State<T, P = React.CSSProperties> {
    items: TransitionItem<T, P>[];
    byKey: { [key: string]: TransitionItem<T, P> };
    nextUpdate: number | undefined;
}

function getStyle<T, P = React.CSSProperties>(
    item: T,
    index: number,
    style: P | ((item: T, index: number) => P),
    common: P | ((item: T, index: number) => P) | undefined
): P {
    const commonStyle: P | undefined = common
        ? getStyle(item, index, common, undefined)
        : undefined;

    if (typeof style === 'function') {
        const styleFn = style as (item: T, index: number) => P;
        if (commonStyle) {
            return {
                ...commonStyle,
                ...styleFn(item, index),
            };
        } else {
            return styleFn(item, index);
        }
    } else {
        if (commonStyle) {
            return {
                ...commonStyle,
                ...style,
            };
        } else {
            return style;
        }
    }
}

export function generateInitialState<T, P = React.CSSProperties>(
    items: T[],
    getKey: (item: T) => string,
    config: Config<T, P>
): State<T, P> {
    const result: State<T, P> = { items: [], byKey: {}, nextUpdate: undefined };

    const styler = config.initial || config.from;
    const nextUpdate = (result.nextUpdate =
        config.initial || items.length === 0 ? undefined : IMMEDIATE_UPDATE);
    const state = config.initial ? 'update' : 'from';
    items.forEach((item, index) => {
        const resultItem: TransitionItem<T, P> = {
            item,
            style: getStyle(item, index, styler, config.common),
            key: getKey(item),
            state,
            nextUpdate,
            index,
        };
        result.items.push(resultItem);
        result.byKey[resultItem.key] = resultItem;
    });

    return result;
}

export function generateNextState<T, P = React.CSSProperties>(
    prev: State<T, P>,
    items: T[],
    getKey: (item: T) => string,
    config: Config<T, P>
): State<T, P> {
    const result: State<T, P> = { items: [], byKey: {}, nextUpdate: undefined };
    let nextIndex = 0;

    function addItem(resultItem: TransitionItem<T, P>) {
        result.items.push(resultItem);
        result.byKey[resultItem.key] = resultItem;

        // Set result.nextUpdate to the min of resultItem.nextUpdate or result.nextUpdate.
        if (resultItem.nextUpdate !== undefined) {
            if (result.nextUpdate === undefined) {
                result.nextUpdate = resultItem.nextUpdate;
            } else {
                result.nextUpdate = Math.min(resultItem.nextUpdate, result.nextUpdate);
            }
        }
    }

    function newItem(item: T, key: string) {
        const index = nextIndex++;
        addItem({
            item,
            style: getStyle(item, index, config.from, config.common),
            key,
            state: 'from',
            nextUpdate: IMMEDIATE_UPDATE,
            index,
        });
    }

    function keepItem(prevItem: TransitionItem<T, P>, item: T, indexOverride?: number) {
        let index: number;
        if (indexOverride !== undefined) {
            index = indexOverride;
        } else {
            index = nextIndex++;
        }

        let state: ItemState;
        let nextUpdate: number | undefined;
        switch (prevItem.state) {
            case 'from':
                state = 'enter';
                nextUpdate = Date.now() + config.enterTime;
                break;
            case 'enter':
                state = prevItem.state;
                if (prevItem.nextUpdate && prevItem.nextUpdate <= Date.now()) {
                    state = 'update';
                } else {
                    // Still entering...
                    nextUpdate = prevItem.nextUpdate;
                }
                break;
            default:
                // Possible the item was in "leave" state, because it was leaving.
                // Since it's been re-added, force it into "update".
                state = 'update';
        }

        const style = getStyle(item, index, config[state] || config.enter, config.common);
        addItem({ item, style, key: prevItem.key, state, nextUpdate, index });
    }

    function leaveItem(prevItem: TransitionItem<T, P>) {
        if (prevItem.state !== 'leave') {
            addItem({
                ...prevItem,
                state: 'leave',
                style: getStyle(prevItem.item, prevItem.index, config.leave, config.common),
                nextUpdate: Date.now() + config.leaveTime,
            });
        } else if (prevItem.nextUpdate !== undefined && prevItem.nextUpdate > Date.now()) {
            // Keep the leaving item - it hasn't finished leaving yet.
            addItem(prevItem);
        } else {
            // Item has left.
        }
    }

    const newByKey: { [key: string]: { item: T; key: string } } = {};
    for (const item of items) {
        const key = getKey(item);
        newByKey[key] = { item, key };
    }

    let prevIndex = 0;
    let index = 0;
    const seenPrevKeys: { [key: string]: { index: number; item: T } } = {};
    while (prevIndex < prev.items.length && index < items.length) {
        // Skip over any items we've already used in `prev'.
        while (prevIndex < prev.items.length && seenPrevKeys[prev.items[prevIndex].key]) {
            const { item, index } = seenPrevKeys[prev.items[prevIndex].key];
            keepItem(prev.items[prevIndex], item, index);
            prevIndex++;
        }

        const item = items[index];
        const itemKey = getKey(item);
        const prevItem = prev.items[prevIndex];

        if (prevItem && prevItem.key === itemKey) {
            // Keeping item in the same place it used to be in.
            keepItem(prevItem, item);
            prevIndex++;
            index++;
        } else if (!newByKey[prevItem.key]) {
            // Prev item is leaving.
            leaveItem(prevItem);
            prevIndex++;
        } else if (!prev.byKey[itemKey]) {
            // Item is new!
            newItem(item, itemKey);
            index++;
        } else {
            // Item has moved.  This is kind of a weird corner case, because if
            // we leave the item in its old position, it will animate smoothly
            // but the list order will not be what the user expected.  If we move
            // the item to the new position in the list, it will probably not
            // animate smoothly because it will change position in the DOM.
            //
            // What we do here is compromise - we keep the position stable in the
            // returned array, but we assign an `index` based on the position
            // it was passed in.
            //
            // To do this, we add it to `seenPrevKeys`, and worry about it when
            // we find the previous item.
            seenPrevKeys[itemKey] = { item, index: nextIndex++ };
            index++;
        }
    }

    // Deal with any leftover previous items...
    while (prevIndex < prev.items.length) {
        const prevItem = prev.items[prevIndex];
        if (seenPrevKeys[prevItem.key]) {
            const { item, index } = seenPrevKeys[prev.items[prevIndex].key];
            keepItem(prev.items[prevIndex], item, index);
        } else {
            leaveItem(prev.items[prevIndex]);
        }
        prevIndex++;
    }

    // Any leftover items are new.
    while (index < items.length) {
        newItem(items[index], getKey(items[index]));
        index++;
    }

    return result;
}
