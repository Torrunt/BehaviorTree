import { FAILURE, SUCCESS, RUNNING } from './constants';
import BranchNode from './BranchNode';
import Node from './Node';
import { isRunning } from './helper';
import { ParallelRunConfig, RunResult, StatusWithState, Blackboard, MinimalBlueprint, NodeOrRegistration } from './types';

/**
 * The Parallel node runs all of its children in parallel and stops running if all of the children are
 * successful or the first one returns failure.
 */
export default class Parallel extends BranchNode {
  numNodes: number;
  nodes: NodeOrRegistration[];

  nodeType = 'Parallel';

  constructor(blueprint: MinimalBlueprint) {
    super(blueprint);

    this.nodes = blueprint.nodes || [];
    this.numNodes = this.nodes.length;
  }

  run(blackboard: Blackboard = {}, { lastRun, introspector, rerun, registryLookUp = (x) => x as Node }: ParallelRunConfig = {}) {
    if (!rerun || !this.ranStart) {
      this.ranStart = true;
      const startResult = this.blueprint.start(blackboard);
      if (startResult === FAILURE) return startResult;
    }

    const results: Array<RunResult> = [];
    for (let currentIndex = 0; currentIndex < this.numNodes; ++currentIndex) {
      const lastRunForIndex = lastRun && (lastRun as StatusWithState).state[currentIndex];
      if (lastRunForIndex && !isRunning(lastRunForIndex)) {
        results[currentIndex] = lastRunForIndex;
        continue;
      }
      const node = registryLookUp(this.nodes[currentIndex]);
      const result = node.run(blackboard, { lastRun: lastRunForIndex, introspector, rerun, registryLookUp });
      results[currentIndex] = result;
    }
    const endResult = this.calcResult(results);
    if (!isRunning(endResult)) {
      this.blueprint.end(blackboard);
    }
    if (introspector) {
      const running = !!results.find((x) => isRunning(x));
      const debugResult = running ? RUNNING : (endResult as boolean);
      introspector.wrapLast(this.numNodes, this, debugResult, blackboard);
    }

    return endResult;
  }

  protected calcResult(results: Array<RunResult>): RunResult {
    if (results.includes(FAILURE)) {
      return FAILURE;
    }
    const running = !!results.find((x) => isRunning(x));
    return running ? { total: RUNNING, state: results } : SUCCESS;
  }

  abort(blackboard: Blackboard, { registryLookUp = (x) => x as Node, lastRun }: ParallelRunConfig = {}) {
    this.blueprint.abort(blackboard, { registryLookUp, lastRun });

    // call abort() on parallel nodes
    for (let currentIdx: number = 0; currentIdx < this.numNodes; ++currentIdx) {
      const node = this.nodes[currentIdx]
      const lastRunForIdx: RunResult = lastRun && (lastRun as StatusWithState).state[currentIdx]
      if (lastRunForIdx && isRunning(lastRunForIdx)) {
          ;(node as Node).abort(blackboard, { registryLookUp, lastRun: lastRunForIdx })
      }
    }
  }
}
