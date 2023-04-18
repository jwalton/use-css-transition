import React, { useState } from 'react';
import { useCSSTransition } from '..';

export function AnimatedList() {
    const [list, setList] = useState(['foo', 'bar', 'baz']);

    const transitions = useCSSTransition(list, (item) => item, {
        common: {
            willChange: 'opacity',
            transition: 'opacity 1s',
        },
        from: { opacity: 0 },
        enter: { opacity: 1 },
        leave: { opacity: 0 },
        enterTime: 1000,
        leaveTime: 1000,
    });

    return (
        <div>
            {transitions.map(({ item, style, key }) => (
                <div key={key} style={style}>
                    {item}
                </div>;
            ))}
        </div>
    );
}
