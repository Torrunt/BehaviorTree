# BehaviorTree.js

A JavaScript implementation of Behavior Trees. They are useful for implementing AIs. If you need more information about Behavior Trees, look on [GameDevAIPro](https://www.gameaipro.com), there is a nice [article on Behavior Trees from Alex Champandard and Philip Dunstan](https://www.gameaipro.com/GameAIPro/GameAIPro_Chapter06_The_Behavior_Tree_Starter_Kit.pdf).

## TypeScript support?

If you need TypeScript support, please check out the `typescript` branch which will be the upcoming 3.0 release and if you have some questions and comments please make them known.

## Features

- The needed: Sequences, Selectors, Tasks
- The extended: Decorators

## Installation

If you use npm:

```sh
npm install behaviortree
```

or using yarn:

```sh
yarn add behaviortree
```

## Dependencies?

This package has no own dependencies.

## How to use

First, I should mention that it is possible to use this library also in common-js environment like node v8. For this to work, you should switch all `import` statements with `require()` statements.

So instead of

```js
import { BehaviorTree, Sequence, Task, SUCCESS, FAILURE } from 'behaviortree';
```

just use

```js
const { BehaviorTree, Sequence, Task, SUCCESS, FAILURE } = require('behaviortree');
```

I use the new ES modules syntax, because I think it is very readable. So all the code is written like this. To see working examples of both versions visit/clone [the examples’ repo](https://github.com/Calamari/BehaviorTree.js-Examples).

### Creating a simple Task

A task is a simple `Node` (to be precise a leaf node), which takes care of all the dirty work in it's `run` method, which returns either `true`, `false`, or `"running"`. For clarity, and to be flexible, please use the provided exported constants for those return values (`SUCCESS`, `FAILURE`, `RUNNING`).

Each method of your task receives the blackboard, which you assign when instantiating the BehaviorTree. A blackboard is basically a object, which holds data and methods all the task need to perform their work and to communicate with the world.

```js
import { Task, SUCCESS } from 'behaviortree';
const myTask = new Task({
  // (optional) this function is called directly before the run method
  // is called. It allows you to setup things before starting to run
  start: function (blackboard) {
    blackboard.isStarted = true;
  },

  // (optional) this function is called directly after the run method
  // is completed with either this.success() or this.fail(). It allows you to clean up
  // things, after you run the task.
  end: function (blackboard) {
    blackboard.isStarted = false;
  },

  // This is the meat of your task. The run method does everything you want it to do.
  run: function (blackboard) {
    return SUCCESS;
  }
});
```

The methods:

- `start` - Called before run is called. But not if the task is resuming after ending with this.running()
- `end` - Called after run is called. But not if the task finished with this.running()
- `run` - Contains the main things you want the task to do

### Creating a Sequence

A `Sequence` will call every of it's sub nodes one after each other until one node fails (returns `FAILURE`) or all nodes were called. If one node calls fails the `Sequence` will return `FAILURE` itself, else it will call `SUCCESS`.

```js
import { Sequence } from 'behaviortree';
const mySequence = new Sequence({
  nodes: [
    // here comes in a list of nodes (Tasks, Sequences or Priorities)
    // as objects or as registered strings
  ]
});
```

### Creating a priority selector

A `Selector` calls every node in its list until one node returns `SUCCESS`, then itself returns as success. If none of it's sub node calls `SUCCESS` the selector returns `FAILURE`.

```js
import { Selector } from 'behaviortree';
const mySelector = new Selector({
  nodes: [
    // here comes in a list of nodes (Tasks, Sequences or Priorities)
    // as objects or as registered strings
  ]
});
```

### Creating a Random Selector

A `Random` selector just calls one of its subnode randomly, if that returns `RUNNING`, it will be called again on next run.

```js
import { Random } from 'behaviortree';
const mySelector = new Random({
  nodes: [
    // here comes in a list of nodes (Tasks, Sequences or Priorities)
    // as objects or as registered strings
  ]
});
```

### Creating a BehaviorTree instance

Creating an instance of a behavior tree is fairly simple. Just instantiate the `BehaviorTree` class and specify the shape of the tree, using the nodes mentioned above and the blackboard the nodes can use.

```js
import { BehaviorTree } from 'behaviortree';
var bTree = new BehaviorTree({
  tree: mySelector,
  blackboard: {}
});
```

### Run through the BehaviorTree

The `blackboard` you specified will be passed into every `start()`, `end()` and `run()` method as first argument. You can use it, to let the behavior tree know, on which object (e.g. artificial player) it is running, let it interact with the world or hold bits of state if you need. To run the tree, you can call `step()` whenever you have time for some AI calculations in your game loop.

```js
bTree.step();
```

### Using a lookup table for your tasks

BehaviorTree is coming with a internal registry in which you can register tasks and later reference them in your nodes by their names, that you choose. This is really handy, if you need the same piece of behavior in multiple trees, or want to separate the defining of tasks and the construction of the trees.

```js
// Register a task:
BehaviorTree.register('testtask', myTask);
// Or register a sequence or priority:
BehaviorTree.register('test sequence', mySequence);
```

Which you now can simply refer to in your nodes, like:

```js
import { Selector } from 'behaviortree';
const mySelector = new Selector({
  nodes: ['my awesome task', 'another awe# task to do']
});
```

Using the registry has one more benefit, for simple Tasks with only one `run` method, there is a short way to write those:

```js
BehaviorTree.register('testtask', (blackboard) => {
  console.log('I am doing stuff');
  return SUCCESS;
});
```

### Now putting it all together

And now an example of how all could work together.

```js
import { BehaviorTree, Sequence, Task, SUCCESS, FAILURE } from 'behaviortree';
BehaviorTree.register(
  'bark',
  new Task({
    run: function (dog) {
      dog.bark();
      return SUCCESS;
    }
  })
);

const tree = new Sequence({
  nodes: [
    'bark',
    new Task({
      run: function (dog) {
        dog.randomlyWalk();
        return SUCCESS;
      }
    }),
    'bark',
    new Task({
      run: function (dog) {
        if (dog.standBesideATree()) {
          dog.liftALeg();
          dog.pee();
          return SUCCESS;
        } else {
          return FAILURE;
        }
      }
    })
  ]
});

const dog = new Dog(/*...*/); // the nasty details of a dog are omitted

const bTree = new BehaviorTree({
  tree: tree,
  blackboard: dog
});

// The "game" loop:
setInterval(function () {
  bTree.step();
}, 1000 / 60);
```

In this example the following happens: each pass on the `setInterval` (our game loop), the dog barks – we implemented this with a registered node, because we do this twice – then it walks randomly around, then it barks again and then if it finds itself standing beside a tree it pees on the tree.

### Decorators

Every node can also be a `Decorator`, which wraps a regular (or another decorated) node and either control their value or calling, add some conditions or do something with their returned state. In the `src/decorators` directory you'll find some already implemented decorators for inspiration or use, like an `InvertDecorator` which negates the return value of the decorated node or a `CooldownDecorator` which ensures the node is only called once within a cool downtime period.

```js
const decoratedSequence = new InvertDecorator({
  node: 'awesome sequence doing stuff'
});
```

### Creating own Decorators

To create an own decorator. You simply need a class that extends the `Decorator` class and overrides the decorate method. Simply look within the `src/decorators` sub folder to check some reference implementations.

Beware that you cannot simply instantiate the `Decorator` class and pass in the `decorate` methods as a blueprint as a dynamical decorator, because the way things works right now.

### Using built-in Decorators

There are several "simple" decorators already built for your convenience. Check the `src/decorators` directory for more details (and the specs for what they are doing). Using them is as simple as:

```js
import { BehaviorTree, Sequence, Task, SUCCESS, FAILURE, decorators } from 'behaviortree';

const { AlwaysSucceedDecorator } = decorators;
```

### Importing BehaviorTree defintions from JSON files

There is a `BehaviorTreeImporter` class defined that can be used to fill a `BehaviorTree` instance out of a JSON definition for a tree. A definition structure looks like this:

```json
{
  "type": "selector",
  "name": "the root",
  "nodes": [
    {
      "type": "ifEnemyInSight",
      "name": "handling enemies",
      "node": { "type": "walk", "name": "go to enemy" }
    },
    {
      "type": "cooldown",
      "name": "jumping around",
      "cooldown": 1,
      "node": { "type": "jump", "name": "jump up" }
    },
    { "type": "idle", "name": "doing nothing" }
  ]
}
```

Through the `type` property, the importer looks up `Decorators`, `Selectors`, `Sequences` and your own defined classes from an internal type definition as well as tasks from the `BehaviorTree` registry, and returns an object, that can be used as `tree` within the `BehaviorTree` constructor.

### Using traditional-style requires

If you don't like the new `import`-statements, you should still be able to use the traditional `require`-statements:

```js
const {
  BehaviorTree,
  Sequence,
  Task,
  SUCCESS,
  FAILURE,
  decorators: { AlwaysSucceedDecorator }
} = require('behaviortree');
```

### Introspecting the Tree (debugging/visualizing the Tree)

You can add a `introspector` parameter to the `step`-method containing an instance of the `Introspector` class or another class implementing a similar interface. Doing that allows you to gather useful statistics/data about every run of your behavior tree and shows you, which tasks did run and returned which results. Useful in gaining an understanding about the correctness of the tree.

But don't do this on a production environment, because the work that is done there is simply not needed for regular evaluation.

```js
const { Introspector } = require('behaviortree');
const introspector = new Introspector();
bTree.step({ introspector });
console.log(introspector.lastResult);
```

That would result in something like:

```js
{
  name: 'select',
  result: Symbol(running),
  children: [
    {
      name: 'targeting',
      result: false
    },
    {
      name: 'jump',
      result: Symbol(running)
    }
  ]
}
```

## Built-in Types of Nodes

It should be easy to add your own type of nodes if there is something missing, but there the most common ones should be in here already. Decorators you will most likely will have to implement those yourself, as well as Tasks, since those contain the meat of your project. To tie those together, here are the build-in nodes you might want to use (in a nutshell):

- **Selector**: A selector node runs all its children nodes in sequence until the one that returns `SUCCESS`.
- **Sequence**: A sequence node runs all its children nodes in sequence until the one that returns `FAILURE`.
- **Parallel**: A parallel node runs all of its children in parallel and returns `RUNNING` until one returns `FAILURE`.
- **ParallelSelector**: A parallel node runs all of its children in parallel and returns `RUNNING` as long as one node is `RUNNING`.
- **ParallelComplete**: A parallel node runs all of its children in parallel and returns the first result that is **not** `RUNNING`.
- **Random**: A random node runs only one of its children nodes chosen randomly.

## Contributing

You want to contribute? If you have some ideas or critics, just open an issue, here on GitHub. If you want to get your hands dirty, you can fork this repository. But note: If you write code, don't forget to write tests. And then make a pull request. I'll be happy to see what's coming.

## Running tests

Tests are done with jest, and I use yarn to manage packages and lock versions.

```sh
yarn
yarn test
```

## Version history

- **3.0.0**
  - Rewrite the code in TypeScript
  - Add `Parallel`, `ParallelSelector` & `ParallelComplete` nodes
  - CooldownDecorator does not start timer when task is still `RUNNING`
- **2.1.0**
  - Rework debug handling and implement it as using an Introspector-Interface & -Module
  - Fix problem with start & end calling in `RUNNING` branching nodes
  - Add start & end callbacks to Decorators
  - Add UMD package for direct use in borwsers
- **2.0.5** - Fix edge case that did not call start on subsequent branching nodes after a running one
- **2.0.4** - Fix bug that start not called after run in branching nodes
- **2.0.3** - Add decorators to exports
- **2.0.2** - Now with working node.js build (as well as babel build)
- **2.0.0** - Complete ES7 rewrite and improvement on ways it works and how it can be used
- **1.0.4** - Fix resuming in priority nodes
- **1.0.3** - Removed a useless console.log statement
- **1.0.2** - Supporting NodeJS now. Bumped to 1.0.2 because of NPM package
- **0.9.2** - Added AlwaysSucceedDecorator and AlwaysFailDecorator
- **0.9.1** - Fixed run method in Decorator
- **0.9.0** - Added Decorators and the InvertDecorator
- **0.8.0** - Added the Random Selector
- **0.7.0** - first functional complete release

## MIT License

Copyright (C) 2013-2020 Georg Tavonius

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## TODO:

- Tests and implementation der Parallel Typen
- Benchmarking
- Adden der Parallel Arten zur README

x
x
x
x
x

x
x
