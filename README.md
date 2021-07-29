# use-css-transition

[![NPM version](https://badge.fury.io/js/use-css-transition.svg)](https://npmjs.org/package/use-css-transition)
![Build Status](https://github.com/jwalton/use-css-transition/workflows/GitHub%20CI/badge.svg)
[![Minzipped size](https://img.shields.io/bundlephobia/minzip/use-css-transition.svg)](https://bundlephobia.com/result?p=use-css-transition)

## Installation

```sh
npm install use-css-transition
```

## Usage

`useCssTransition` is sort of like a [CSS transition group](http://reactcommunity.org/react-transition-group/transition-group/), but with the API Of [`react-spring`'s useTransition() hook](https://www.react-spring.io/docs/hooks/use-transition).

Here's a quick example:

```ts
import React, { useState } from 'react';
import { useCSSTransition } from 'use-css-transition';

function AnimatedList() {
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
      {transitions.map(({ item, style, key }) => {
        <div key={key} style={style}>
          {item}
        </div>;
      })}
    </div>
  );
}
```

## Examples

Masonry Layout: ([edit on codesandbox](https://codesandbox.io/s/usecsstransition-masonry-grid-f3obx?file=/src/index.js))

[![Masonry Example](docs/masonry.gif)](https://codesandbox.io/s/usecsstransition-masonry-grid-f3obx?file=/src/index.js)

## API

### useCSSTransition(array, getKey, config)

`array` is an array of items to render, `getKey` is a function that takes an item and returns a string, and `config` is a `{ common?, initial?, from, enter, update?, leave, enterTime, leaveTime }` object. `config` has the following properties:

- `enterTime`, `leaveTime` are the expected time it takes an object to transition from "enter" to "update" and from "leave" to being gone.
- `common` is an optional set of CSS styles to apply to all items.
- `initial`, if provided, is a set of CSS styles to apply to items that are in the initial set of items when `useCssTransition()` is called for the first time. If this is not provided, `from` will be used instead.
- `from` is the set of CSS styles to apply to a new object when it is added to the set of items - this will only be applied for one "tick", as the very next render `enter` will be used instead.
- `enter` is the set of CSS styles to apply to an object while it is entering.
- `update` is the set of CSS styles to apply to an object after `enterTime` has elapsed. If not provided, `enter` will be used instead.
- `leave` is the set of CSS styles to apply to an object after it has been removed from `items` - in this case the item will be kept in the return results for `leaveTime` milliseconds, with `leave` styles applied, before finally being removed. If the item (or another item with the same key) is added back in before this time, the item will transition bask to `update`.

The return value will be an array of the following fields:

- `item` is an item from the array.
- `index` is the index of the item in the array. Note that if you move items around in your array, they will not move around in the returned array, but their `index` will change. We want to render items in a stable order if we want CSS transitions to work.
- `style` is the style to apply to the item.
- `key` is a unique key for this item.
- `state` is one of `'from' | 'enter' | 'update' | 'leave'` and represents the current state of this item.
- `nextUpdate` is 0 if the item needs to update immediately, or a time in ms since the epoch when this item will next update.

### useTransition(array, getKey, config)

This is like `useCSSTransition()`, except you can pass in any props you want
instead of just CSS properties. This is most useful when you want to construct
two different styles for related objects (like you want to scale and position
and image, and want to position but not scale text over top of the image).

This does _not_ do any kind of interpolation - you have to take care of that
part yourself (or let your browser's CSS engine take care of it, ideally).

Copyright 2021 Jason Walton
