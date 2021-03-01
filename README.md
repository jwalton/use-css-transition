# use-css-transition

[![NPM version](https://badge.fury.io/js/use-css-transition.svg)](https://npmjs.org/package/use-css-transition)
![Build Status](https://github.com/jwalton/use-css-transition/workflows/GitHub%20CI/badge.svg)

## Installation

```
npm install use-css-transition
```

## Usage

`useCssTransition` is sort of like a [CSS transition group](http://reactcommunity.org/react-transition-group/transition-group/), but with the API Of [`react-spring`'s useTransition() hook](https://www.react-spring.io/docs/hooks/use-transition).

Here's a quick example:

```ts
import React, { useState } from 'react';
import useCssTransition from '..';

function AnimatedList() {
    const [list, setList] = useState(['foo', 'bar', 'baz']);

    const transitions = useCssTransition(list, (item) => item, {
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
            {transitions.map(({ item, style, key }) => {
                <div key={key} style={style}>
                    {item}
                </div>;
            })}
        </div>
    );
}
```

## API

`useCssTransition(array, getKey, config)`, where `array` is an array of items to render, `getKey` is a function that takes an item and returns a string, and `config` is a `{ common?, initial?, from, enter, update?, leave, enterTime, leaveTime }` object. In config, `enterTime` and `leaveTime` are the expected time it takes an object to transition from "enter" to "update" and from "leave" to being gone. All other config items are either a set of CSS properties or a `(item, index) => CSSProperties` function.

-   `common` is an optional set of CSS styles to apply to all items.
-   `initial`, if provided, is a set of CSS styles to apply to items that are in the initial set of items when `useCssTransition()` is called for the first time. If this is not provided, `from` will be used instead.
-   `from` is the set of CSS styles to apply to a new object when it is added to the set of items - this will only be applied for one "tick", as the very next render `enter` will be used instead.
-   `enter` is the set of CSS styles to apply to an object while it is entering.
-   `update` is the set of CSS styles to apply to an object after `enterTime` has elapsed. If not provided, `enter` will be used instead.
-   `leave` is the set of CSS styles to apply to an object after it has been removed from `items` - in this case the item will be kept in the return results for `leaveTime` milliseconds, with `leave` styles applied, before finally being removed. If the item (or another item with the same key) is added back in before this time, the item will transition bask to `update`.

Copyright 2021 Jason Walton
