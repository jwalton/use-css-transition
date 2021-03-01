import { Config, ItemState, TransitionItem } from './types';

const IMMEDIATE_UPDATE = 0;

export interface State<T> {
    items: TransitionItem<T>[];
    byKey: { [key: string]: TransitionItem<T> };
    nextUpdate: number | undefined;
}

function getStyle<T>(
    item: T,
    index: number,
    style: React.CSSProperties | ((item: T, index: number) => React.CSSProperties),
    common: React.CSSProperties | ((item: T, index: number) => React.CSSProperties) | undefined
): React.CSSProperties {
    const commonStyle: React.CSSProperties | undefined = common
        ? getStyle(item, index, common, undefined)
        : undefined;

    if (typeof style === 'function') {
        if (commonStyle) {
            return {
                ...commonStyle,
                ...style(item, index),
            };
        } else {
            return style(item, index);
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

export function generateInitialState<T>(
    items: T[],
    getKey: (item: T) => string,
    config: Config<T>
): State<T> {
    const result: State<T> = { items: [], byKey: {}, nextUpdate: undefined };

    const styler = config.initial || config.from;
    const nextUpdate = (result.nextUpdate =
        config.initial || items.length === 0 ? undefined : IMMEDIATE_UPDATE);
    const state = config.initial ? 'update' : 'from';
    items.forEach((item, index) => {
        const resultItem: TransitionItem<T> = {
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

export function generateNextState<T>(
    prev: State<T>,
    items: T[],
    getKey: (item: T) => string,
    config: Config<T>
): State<T> {
    const result: State<T> = { items: [], byKey: {}, nextUpdate: undefined };

    function addItem(resultItem: TransitionItem<T>) {
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

    // First iterate over the items that were passed to us...
    items.forEach((item, index) => {
        const key = getKey(item);
        let style: React.CSSProperties;
        let state: ItemState;
        let nextUpdate: number | undefined;

        const prevItem = prev.byKey[key];
        if (!prevItem) {
            state = 'from';
            style = getStyle(item, index, config.from, config.common);
            nextUpdate = IMMEDIATE_UPDATE;
        } else {
            switch (prevItem.state) {
                case 'from':
                    state = 'enter';
                    style = getStyle(item, index, config.enter, config.common);
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

            style = getStyle(item, index, config[state] || config.enter, config.common);
        }

        addItem({ item, style, key, state, nextUpdate, index });
    });

    // Then work out if there are any items in the previous state that have left...
    prev.items.forEach((prevItem) => {
        if (!result.byKey[prevItem.key]) {
            if (prevItem.state !== 'leave') {
                // Item is leaving.
                addItem({
                    ...prevItem,
                    state: 'leave',
                    style: getStyle(prevItem.item, prevItem.index, config.leave, config.common),
                    nextUpdate: Date.now() + config.leaveTime,
                });
            } else if (prevItem.nextUpdate === undefined || prevItem.nextUpdate <= Date.now()) {
                // Item has left.
            }
        }
    });

    return result;
}
