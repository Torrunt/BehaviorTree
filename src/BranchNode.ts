import { SUCCESS, RUNNING } from './constants';
import { IsDecorator } from './Decorator';
import { isRunning } from './helper';
import Node from './Node';
import { Blackboard, MinimalBlueprint, NodeOrRegistration, ObserverAborts, RunConfig, RunResult, Status } from './types';

export default class BranchNode extends Node {
  numNodes: number;
  nodes: NodeOrRegistration[];
  // Override this in subclasses
  OPT_OUT_CASE: Status = SUCCESS;
  START_CASE: Status = SUCCESS;

  nodeType = 'BranchNode';

  observedDecorators: Map<number, Status>;

  constructor(blueprint: MinimalBlueprint) {
    super(blueprint);

    this.nodes = blueprint.nodes || [];
    this.numNodes = this.nodes.length;
    this.observedDecorators = new Map<number, Status>();
  }

  run(blackboard: Blackboard = {}, { lastRun, introspector, rerun, registryLookUp = (x) => x as Node }: RunConfig = {}) {
    if (!rerun) this.blueprint.start(blackboard);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let overallResult: Status | any = this.START_CASE;
    const results: Array<RunResult> = [];
    const lastRunStates: Array<RunResult> = (typeof lastRun === 'object' && lastRun.state) || [];
    const startingIndex = Math.max(
      lastRunStates.findIndex((x) => isRunning(x)),
      0
    );
    let currentIndex = 0;
    for (; currentIndex < this.numNodes; ++currentIndex) {
      if (currentIndex < startingIndex) {
        if (this.observedDecorators.has(currentIndex)) {
          // re-evalute observered decorators
          const node = registryLookUp(this.nodes[currentIndex]);
          const result = node.run(blackboard, {
            lastRun: lastRunStates[currentIndex],
            introspector,
            rerun,
            registryLookUp
          });
          if (result != results[currentIndex]) {
            results[currentIndex] = result;
            this.observedDecorators.set(currentIndex, result as Status);
            continue;
          }
        } else {
          // Keep last result
          results[currentIndex] = lastRunStates[currentIndex];
          continue;
        }
      }
      const node = registryLookUp(this.nodes[currentIndex]);
      const result = node.run(blackboard, { lastRun: lastRunStates[currentIndex], introspector, rerun, registryLookUp });
      results[currentIndex] = result;

      if (IsDecorator(node) && node.observerAborts >= ObserverAborts.LowerPriority) {
        console.log(`DECORATOR ${node.observerAborts}`);
        console.log(result);
        this.observedDecorators.set(currentIndex, result as Status);
      }

      if (result === RUNNING || typeof result === 'object') {
        overallResult = RUNNING;
        break;
      } else if (result === this.OPT_OUT_CASE) {
        overallResult = result;
        break;
      } else {
        rerun = false;
      }
    }
    const running = isRunning(overallResult);
    if (!running) {
      this.blueprint.end(blackboard);
    }
    if (introspector) {
      const debugResult = running ? RUNNING : overallResult;
      introspector.wrapLast(Math.min(currentIndex + 1, this.numNodes), this, debugResult, blackboard);
    }
    return overallResult === RUNNING ? { total: overallResult, state: results } : overallResult;
  }
}
