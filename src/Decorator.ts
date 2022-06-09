import { RUNNING } from './constants';
import Node from './Node';
import { Blackboard, RunCallback, DecoratorConfig, RunConfig, DecoratorBlueprint, Status, ObserverAborts } from './types';

export class Decorator extends Node {
  config!: DecoratorConfig;
  nodeType = 'Decorator';
  observerAborts = ObserverAborts.None;

  constructor({ config = {}, ...props }: DecoratorBlueprint = { config: {} }) {
    super(props);
    this.setConfig(config);
  }

  decorate(run: RunCallback, blackboard: Blackboard, config: DecoratorConfig) {
    // This method should be overridden to make it useful
    return run(run, blackboard, config);
  }

  run(blackboard: Blackboard, { introspector, rerun, registryLookUp = (x) => x as Node, ...config }: RunConfig = {}) {
    if (!rerun) this.blueprint.start(blackboard);
    let runCount = 0;
    const result = this.decorate(
      () => {
        ++runCount;
        return registryLookUp(this.blueprint.node as Node).run(blackboard, {
          ...config,
          rerun,
          introspector,
          registryLookUp
        }) as Status;
      },
      blackboard,
      this.config
    );

    if (result !== RUNNING) {
      this.blueprint.end(blackboard);
    }
    if (introspector) {
      introspector.wrapLast(runCount, this, result, blackboard);
    }
    return result;
  }

  setConfig(config: DecoratorConfig) {
    this.config = config;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const IsDecorator = (object: any): object is Decorator => {
  return 'observerAborts' in object;
};

export default Decorator;
