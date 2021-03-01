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

        it('should keep items that are leaving in the set', () => {
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

            const leftState = generateNextState(leaveState, [], (k) => k, DEFAULT_CONFIG);
            expect(leftState, 'leftState').to.eql(itemsToState([]));
        });

        it('should recycle indexes for leaving items', () => {
            const firstState = generateInitialState<string>(['test'], (k) => k, DEFAULT_CONFIG);
            const nextState = generateNextState(firstState, ['test2'], (k) => k, DEFAULT_CONFIG);

            expect(nextState).to.eql(
                itemsToState([
                    {
                        item: 'test2',
                        key: 'test2',
                        style: FROM,
                        state: 'from',
                        nextUpdate: 0,
                        index: 0,
                    },
                    {
                        item: 'test',
                        key: 'test',
                        style: LEAVE,
                        state: 'leave',
                        nextUpdate: NOW + DEFAULT_CONFIG.leaveTime,
                        index: 0, // Should still be index 0, even though there's a new index 0.
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
    });
});
