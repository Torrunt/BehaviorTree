import { FAILURE, RUNNING, SUCCESS } from './constants';
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  condition(blackboard: Blackboard) {
    // This method should be overridden to make it useful
    return SUCCESS;
  }

  decorate(run: RunCallback, blackboard: Blackboard, config: DecoratorConfig, rerun?: boolean) {
    if (
      !this.condition(blackboard) &&
      (!rerun || this.observerAborts === ObserverAborts.Self || this.observerAborts === ObserverAborts.Both)
    ) {
      return FAILURE;
    }

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
      this.config,
      rerun
    );

    if (result !== RUNNING) {
      this.blueprint.end(blackboard);

      // Call end() on node this decorator wraps
      if ((result === FAILURE && this.blueprint.node) !== undefined) {
        (this.blueprint.node as Node).blueprint.end(blackboard);
      }
    }
    if (introspector) {
      introspector.wrapLast(runCount, this, result, blackboard);
    }
    return result;
  }

  abort(blackboard: Blackboard, { registryLookUp = (x) => x as Node, lastRun }: RunConfig = {}) {
    super.abort(blackboard, { registryLookUp, lastRun });

    // call abort() on node this decorator aborts
    if (this.blueprint.node !== undefined) {
      (this.blueprint.node as Node).abort(blackboard, { registryLookUp, lastRun });
    }
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
