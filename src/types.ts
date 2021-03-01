export interface Config<T> {
    common?: React.CSSProperties | ((item: T, index: number) => React.CSSProperties);
    initial?: React.CSSProperties | ((item: T, index: number) => React.CSSProperties);
    from: React.CSSProperties | ((item: T, index: number) => React.CSSProperties);
    enter: React.CSSProperties | ((item: T, index: number) => React.CSSProperties);
    enterTime: number;
    update?: React.CSSProperties | ((item: T, index: number) => React.CSSProperties);
    leave: React.CSSProperties | ((item: T, index: number) => React.CSSProperties);
    leaveTime: number;
}

export type ItemState = 'from' | 'enter' | 'update' | 'leave';

export interface TransitionItem<T> {
    item: T;
    style: React.CSSProperties;
    key: string;
    state: ItemState;
    nextUpdate?: number;
    index: number;
}
