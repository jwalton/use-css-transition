export interface Config<T, P = React.CSSProperties> {
    common?: P | ((item: T, index: number) => P);
    initial?: P | ((item: T, index: number) => P);
    from: P | ((item: T, index: number) => P);
    enter: P | ((item: T, index: number) => P);
    enterTime: number;
    update?: P | ((item: T, index: number) => P);
    leave: P | ((item: T, index: number) => P);
    leaveTime: number;
}

export type ItemState = 'from' | 'enter' | 'update' | 'leave';

export interface TransitionItem<T, P = React.CSSProperties> {
    item: T;
    style: P;
    key: string;
    state: ItemState;
    nextUpdate?: number;
    index: number;
}
