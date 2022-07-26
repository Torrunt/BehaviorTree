import { SUCCESS, RUNNING, FAILURE } from './constants';
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
    if (!rerun || !this.ranStart) {
      this.ranStart = true;
      const startResult = this.blueprint.start(blackboard);
      if (startResult === FAILURE) return startResult;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let overallResult: Status | any = this.START_CASE;
    const results: Array<RunResult> = [];
    const lastRunStates: Array<RunResult> = (typeof lastRun === 'object' && lastRun.state) || [];
    let startingIndex = Math.max(
      lastRunStates.findIndex((x) => isRunning(x)),
      0
    );
    let currentIndex = 0;
    for (; currentIndex < this.numNodes; ++currentIndex) {
      let observeredDecorator = false;
      if (rerun && this.observedDecorators.has(currentIndex)) {
        observeredDecorator = true;
      } else if (currentIndex < startingIndex) {
        // Keep last result
        results[currentIndex] = lastRunStates[currentIndex];
        continue;
      }

      const node = registryLookUp(this.nodes[currentIndex]);

      // Re-evaulate observered decorators
      if (observeredDecorator && IsDecorator(node)) {
        const lastState = this.observedDecorators.get(currentIndex);
        const currentState = node.condition(blackboard);
        if (lastState === currentState) {
          if (rerun && currentIndex < startingIndex) {
            // observered decorator hasn't changed - Keep last result
            results[currentIndex] = lastRunStates[currentIndex];
            continue;
          }
        } else {
          const activeNode = registryLookUp(this.nodes[startingIndex]);
          activeNode.abort(blackboard, { registryLookUp, lastRun: lastRunStates[startingIndex] });
          rerun = false
          startingIndex = 0
        }
      }

      const result = node.run(blackboard, { lastRun: lastRunStates[currentIndex], introspector, rerun, registryLookUp });
      results[currentIndex] = result;

      if (IsDecorator(node) && node.observerAborts > ObserverAborts.None) {
        this.observedDecorators.set(currentIndex, node.condition(blackboard));
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

  abort(blackboard: Blackboard = {}, { lastRun, registryLookUp = (x) => x as Node }: RunConfig = {}) {
    super.abort(blackboard, { registryLookUp, lastRun });

    // Call abort() on currently active node
    const lastRunStates: Array<RunResult> = (typeof lastRun === 'object' && lastRun.state) || [];
    const startingIndex = Math.max(
      lastRunStates.findIndex((x) => isRunning(x)),
      0
    );
    const node = registryLookUp(this.nodes[startingIndex]);
    node.abort(blackboard, { registryLookUp, lastRun: lastRunStates[startingIndex] });
  }
}
