import { expect } from 'chai';
import sinon from 'sinon';
import { Config, TransitionItem } from '../src';
import { generateInitialState, generateNextState } from '../src/state';

const FROM = { opacity: 0.5 };
const ENTER = { opacity: 1 };
const UPDATE = { opacity: 0.9 };
const INITIAL = { opacity: 0.75 };
const LEAVE = { opacity: 0 };

const DEFAULT_CONFIG: Config<string> = {
    from: FROM,
    enter: ENTER,
    enterTime: 500,
    leave: LEAVE,
    leaveTime: 1000,
};

function itemsToState(items: TransitionItem<string>[]) {
    const byKey: { [key: string]: TransitionItem<string> } = {};
    for (const item of items) {
        byKey[item.key] = item;
    }
    let nextUpdate: number | undefined = Math.min(
        ...items.map((item) => item.nextUpdate ?? Infinity)
    );
    if (nextUpdate === Infinity) {
        nextUpdate = undefined;
    }

    return { items, byKey, nextUpdate };
}

describe('State Tests', function () {
    let clock: sinon.SinonFakeTimers;
    const NOW = Date.now();

    beforeEach(() => {
        clock = sinon.useFakeTimers(NOW);
    });

    afterEach(() => {
        clock.restore();
    });

    describe('generateInitialState', () => {
        it('should generate initial state for an empty array', () => {
            const state = generateInitialState<string>([], (k) => k, DEFAULT_CONFIG);
            expect(state).to.eql({
                items: [],
                byKey: {},
                nextUpdate: undefined,
            });
        });

        it('should generate initial state for a non-empty array', () => {
            const state = generateInitialState<string>(['test'], (k) => k, DEFAULT_CONFIG);

            expect(state).to.eql(
                itemsToState([
                    {
                        item: 'test',
                        key: 'test',
                        style: FROM,
                        state: 'from',
                        nextUpdate: 0,
                        index: 0,
                    },
                ])
            );
        });

        it('should start new items from "initial" if provided', () => {
            const state = generateInitialState<string>(['test'], (k) => k, {
                ...DEFAULT_CONFIG,
                initial: INITIAL,
            });

            expect(state).to.eql(
                itemsToState([
                    {
                        item: 'test',
                        key: 'test',
                        style: INITIAL,
                        state: 'update',
                        nextUpdate: undefined,
                        index: 0,
                    },
                ])
            );
        });

        it('should generate style from a function', () => {
            const config: Config<string> = {
                ...DEFAULT_CONFIG,
                from: (_item: string, index: number) => {
                    return {
                        width: index,
                    };
                },
            };
            const state = generateInitialState<string>(['a', 'b'], (k) => k, config);
            expect(state).to.eql(
                itemsToState([
                    {
                        item: 'a',
                        key: 'a',
                        style: { width: 0 },
                        state: 'from',
                        nextUpdate: 0,
                        index: 0,
                    },
                    {
                        item: 'b',
                        key: 'b',
                        style: { width: 1 },
                        state: 'from',
                        nextUpdate: 0,
                        index: 1,
                    },
                ])
            );
        });

        it('should add common style to style genereated from a function', () => {
            const config: Config<string> = {
                ...DEFAULT_CONFIG,
                common: {
                    height: 10,
                },
                from: (_item: string, index: number) => {
                    return {
                        width: index,
                    };
                },
            };
            const state = generateInitialState<string>(['a', 'b'], (k) => k, config);
            expect(state).to.eql(
                itemsToState([
                    {
                        item: 'a',
                        key: 'a',
                        style: { height: 10, width: 0 },
                        state: 'from',
                        nextUpdate: 0,
                        index: 0,
                    },
                    {
                        item: 'b',
                        key: 'b',
                        style: { height: 10, width: 1 },
                        state: 'from',
                        nextUpdate: 0,
                        index: 1,
                    },
                ])
            );
        });

        it('should apply common style', () => {
            const config: Config<string> = {
                ...DEFAULT_CONFIG,
                common: {
                    height: 10,
                },
            };
            const state = generateInitialState<string>(['a'], (k) => k, config);
            expect(state).to.eql(
                itemsToState([
                    {
                        item: 'a',
                        key: 'a',
                        style: { height: 10, ...FROM },
                        state: 'from',
                        nextUpdate: 0,
                        index: 0,
                    },
                ])
            );
        });
    });

    describe('generateNextState', () => {
        it('should generate next state from an empty array', () => {
            const prevState = generateInitialState<string>([], (k) => k, DEFAULT_CONFIG);
            const nextState = generateNextState(prevState, [], (k) => k, DEFAULT_CONFIG);

            expect(nextState).to.eql({
                items: [],
                byKey: {},
                nextUpdate: undefined,
            });
        });

        it('should add new items', () => {
            const firstState = generateInitialState<string>([], (k) => k, DEFAULT_CONFIG);

            const fromState = generateNextState(firstState, ['test'], (k) => k, DEFAULT_CONFIG);
            expect(fromState, 'fromState').to.eql(
                itemsToState([
                    {
                        item: 'test',
                        key: 'test',
                        style: FROM,
                        state: 'from',
                        nextUpdate: 0,
                        index: 0,
                    },
                ])
            );

            const enterState = generateNextState(fromState, ['test'], (k) => k, DEFAULT_CONFIG);
            expect(enterState, 'enterState').to.eql(
                itemsToState([
                    {
                        item: 'test',
                        key: 'test',
                        style: ENTER,
                        state: 'enter',
                        nextUpdate: NOW + DEFAULT_CONFIG.enterTime,
                        index: 0,
                    },
                ])
            );

            clock.tick(DEFAULT_CONFIG.enterTime);
            const updateState = generateNextState(enterState, ['test'], (k) => k, DEFAULT_CONFIG);
            expect(updateState, 'updateState').to.eql(
                itemsToState([
                    {
                        item: 'test',
                        key: 'test',
                        style: ENTER,
                        state: 'update',
                        nextUpdate: undefined,
                        index: 0,
                    },
                ])
            );
        });

        it('should not promote an item to update state until it has finished entering', () => {
            const state = itemsToState([
                {
                    item: 'test',
                    key: 'test',
                    style: ENTER,
                    state: 'enter',
                    nextUpdate: NOW + DEFAULT_CONFIG.enterTime,
                    index: 0,
                },
            ]);

            clock.tick(10);
            const nextState = generateNextState(state, ['test'], (k) => k, DEFAULT_CONFIG);

            expect(nextState).to.eql(
                itemsToState([
                    {
                        item: 'test',
                        key: 'test',
                        style: ENTER,
                        state: 'enter',
                        nextUpdate: NOW + DEFAULT_CONFIG.enterTime,
                        index: 0,
                    },
                ])
            );
        });

        it('should apply the update style to an item if there is one', () => {
            const config = {
                ...DEFAULT_CONFIG,
                update: UPDATE,
            };

            const state = itemsToState([
                {
                    item: 'test',
                    key: 'test',
                    style: ENTER,
                    state: 'enter',
                    nextUpdate: NOW + config.enterTime,
                    index: 0,
                },
            ]);

            clock.tick(config.enterTime);
            const nextState = generateNextState(state, ['test'], (k) => k, config);

            expect(nextState).to.eql(
                itemsToState([
                    {
                        item: 'test',
                        key: 'test',
                        style: UPDATE,
                        state: 'update',
                        nextUpdate: undefined,
                        index: 0,
                    },
                ])
            );
        });

        it('should add new items, in the correct position', () => {
            const firstState = generateInitialState<string>(['a', 'c'], (k) => k, DEFAULT_CONFIG);
            const secondState = generateNextState(firstState, ['a', 'c'], (k) => k, DEFAULT_CONFIG);
            clock.tick(DEFAULT_CONFIG.enterTime + DEFAULT_CONFIG.leaveTime);

            const addState = generateNextState(
                secondState,
                ['a', 'b', 'c'],
                (k) => k,
                DEFAULT_CONFIG
            );
            expect(addState, 'addState').to.eql(
                itemsToState([
                    {
                        item: 'a',
                        key: 'a',
                        style: ENTER,
                        state: 'update',
                        nextUpdate: undefined,
                        index: 0,
                    },
                    {
                        item: 'b',
                        key: 'b',
                        style: FROM,
                        state: 'from',
                        nextUpdate: 0,
                        index: 1,
                    },
                    {
                        item: 'c',
                        key: 'c',
                        style: ENTER,
                        state: 'update',
                        nextUpdate: undefined,
                        index: 2,
                    },
                ])
            );
        });

        it('should keep items that are leaving in the set, in the same position in the array', () => {
            const firstState = generateInitialState<string>(
                ['a', 'b', 'c'],
                (k) => k,
                DEFAULT_CONFIG
            );

            const leaveState = generateNextState(firstState, ['a', 'c'], (k) => k, DEFAULT_CONFIG);
            expect(leaveState, 'leaveState').to.eql(
                itemsToState([
                    {
                        item: 'a',
                        key: 'a',
                        style: ENTER,
                        state: 'enter',
                        nextUpdate: NOW + DEFAULT_CONFIG.enterTime,
                        index: 0,
                    },
                    {
                        item: 'b',
                        key: 'b',
                        style: LEAVE,
                        state: 'leave',
                        nextUpdate: NOW + DEFAULT_CONFIG.leaveTime,
                        index: 1,
                    },
                    {
                        item: 'c',
                        key: 'c',
                        style: ENTER,
                        state: 'enter',
                        nextUpdate: NOW + DEFAULT_CONFIG.enterTime,
                        index: 1,
                    },
                ])
            );

            clock.tick(10);

            // Since clock hasn't ticked far enough yet, item hasn't left, so nothing should update.
            const leaveState2 = generateNextState(leaveState, ['a', 'c'], (k) => k, DEFAULT_CONFIG);
            expect(leaveState2, 'leaveState2').to.eql(leaveState);

            clock.tick(DEFAULT_CONFIG.leaveTime - 10);

            const leftState = generateNextState(leaveState2, ['a', 'c'], (k) => k, DEFAULT_CONFIG);
            expect(leftState, 'leftState').to.eql(
                itemsToState([
                    {
                        item: 'a',
                        key: 'a',
                        style: ENTER,
                        state: 'update',
                        nextUpdate: undefined,
                        index: 0,
                    },
                    {
                        item: 'c',
                        key: 'c',
                        style: ENTER,
                        state: 'update',
                        nextUpdate: undefined,
                        index: 1,
                    },
                ])
            );
        });

        it('should recycle indexes for leaving items', () => {
            const firstState = generateInitialState<string>(['test'], (k) => k, DEFAULT_CONFIG);
            const nextState = generateNextState(firstState, ['test2'], (k) => k, DEFAULT_CONFIG);

            expect(nextState).to.eql(
                itemsToState([
                    {
                        item: 'test',
                        key: 'test',
                        style: LEAVE,
                        state: 'leave',
                        nextUpdate: NOW + DEFAULT_CONFIG.leaveTime,
                        index: 0, // Should still be index 0, even though there's a new index 0.
                    },
                    {
                        item: 'test2',
                        key: 'test2',
                        style: FROM,
                        state: 'from',
                        nextUpdate: 0,
                        index: 0,
                    },
                ])
            );
        });

        it('should move a leaving item to update if it returns', () => {
            const firstState = generateInitialState<string>(['test'], (k) => k, DEFAULT_CONFIG);

            const leaveState = generateNextState(firstState, [], (k) => k, DEFAULT_CONFIG);
            expect(leaveState, 'leaveState').to.eql(
                itemsToState([
                    {
                        item: 'test',
                        key: 'test',
                        style: LEAVE,
                        state: 'leave',
                        nextUpdate: NOW + DEFAULT_CONFIG.leaveTime,
                        index: 0,
                    },
                ])
            );

            clock.tick(DEFAULT_CONFIG.leaveTime);

            const returnState = generateNextState(leaveState, ['test'], (k) => k, DEFAULT_CONFIG);
            expect(returnState, 'returnState').to.eql(
                itemsToState([
                    {
                        item: 'test',
                        key: 'test',
                        style: ENTER,
                        state: 'update',
                        nextUpdate: undefined,
                        index: 0,
                    },
                ])
            );
        });

        it('should move a leaving item to update if it returns, with new index', () => {
            const firstState = generateInitialState<string>(['test'], (k) => k, DEFAULT_CONFIG);

            const leaveState = generateNextState(firstState, [], (k) => k, DEFAULT_CONFIG);
            expect(leaveState, 'leaveState').to.eql(
                itemsToState([
                    {
                        item: 'test',
                        key: 'test',
                        style: LEAVE,
                        state: 'leave',
                        nextUpdate: NOW + DEFAULT_CONFIG.leaveTime,
                        index: 0,
                    },
                ])
            );

            clock.tick(DEFAULT_CONFIG.leaveTime);

            const returnState = generateNextState(
                leaveState,
                ['new', 'test'],
                (k) => k,
                DEFAULT_CONFIG
            );
            expect(returnState, 'returnState').to.eql(
                itemsToState([
                    {
                        item: 'new',
                        key: 'new',
                        style: FROM,
                        state: 'from',
                        nextUpdate: 0,
                        index: 0,
                    },
                    {
                        item: 'test',
                        key: 'test',
                        style: ENTER,
                        state: 'update',
                        nextUpdate: undefined,
                        index: 1, // Index should change.
                    },
                ])
            );
        });

        it('should add and remove an item in the same position, at the same time', () => {
            const firstState = generateInitialState<string>(
                ['a', 'b', 'c'],
                (k) => k,
                DEFAULT_CONFIG
            );

            const leaveState = generateNextState(
                firstState,
                ['a', 'd', 'c'],
                (k) => k,
                DEFAULT_CONFIG
            );
            expect(leaveState, 'leaveState').to.eql(
                itemsToState([
                    {
                        item: 'a',
                        key: 'a',
                        style: ENTER,
                        state: 'enter',
                        nextUpdate: NOW + DEFAULT_CONFIG.enterTime,
                        index: 0,
                    },
                    {
                        item: 'b',
                        key: 'b',
                        style: LEAVE,
                        state: 'leave',
                        nextUpdate: NOW + DEFAULT_CONFIG.leaveTime,
                        index: 1,
                    },
                    {
                        item: 'd',
                        key: 'd',
                        style: FROM,
                        state: 'from',
                        nextUpdate: 0,
                        index: 1,
                    },
                    {
                        item: 'c',
                        key: 'c',
                        style: ENTER,
                        state: 'enter',
                        nextUpdate: NOW + DEFAULT_CONFIG.enterTime,
                        index: 2,
                    },
                ])
            );
        });

        it('should keep track of an item which has moved', () => {
            const firstState = generateInitialState<string>(
                ['a', 'b', 'c', 'd'],
                (k) => k,
                DEFAULT_CONFIG
            );

            const leaveState = generateNextState(
                firstState,
                ['a', 'c', 'b', 'd'],
                (k) => k,
                DEFAULT_CONFIG
            );
            expect(leaveState, 'leaveState').to.eql(
                itemsToState([
                    {
                        item: 'a',
                        key: 'a',
                        style: ENTER,
                        state: 'enter',
                        nextUpdate: NOW + DEFAULT_CONFIG.enterTime,
                        index: 0,
                    },
                    {
                        item: 'b',
                        key: 'b',
                        style: ENTER,
                        state: 'enter',
                        nextUpdate: NOW + DEFAULT_CONFIG.enterTime,
                        index: 2,
                    },
                    {
                        item: 'c',
                        key: 'c',
                        style: ENTER,
                        state: 'enter',
                        nextUpdate: NOW + DEFAULT_CONFIG.enterTime,
                        index: 1,
                    },
                    {
                        item: 'd',
                        key: 'd',
                        style: ENTER,
                        state: 'enter',
                        nextUpdate: NOW + DEFAULT_CONFIG.enterTime,
                        index: 3,
                    },
                ])
            );
        });
    });
});
