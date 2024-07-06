export type Heap<T extends Node> = Array<T>;
export type Node = {
  id: number; // 唯一标识
  sortIndex: number; // 排序依据
};

// ! 获取堆顶元素
export function peek<T extends Node>(heap: Heap<T>): T | null {
  return heap.length === 0 ? null : heap[0];
}
// ! 向堆中添加元素
export function push<T extends Node>(heap: Heap<T>, node: T): void {
  // 把node放到堆的最后
  const index = heap.length;
  heap.push(node);
  // 调整最小堆，从下往上堆化
  siftUp(heap, node, index);
}
// ! 从下往上堆化
function siftUp<T extends Node>(heap: Heap<T>, node: T, i: number): void {
  let index = i;
  while (index > 0) {
    const parentIndex = (index - 1) >>> 1;
    const parentNode = heap[parentIndex];
    if (compare(parentNode, node) > 0) {
      // 子节点小于父节点，交换位置
      heap[parentIndex] = node;
      heap[index] = parentNode;
      index = parentIndex;
    } else {
      return;
    }
  }
}
// ! 向堆中删除堆顶元素
export function pop<T extends Node>(heap: Heap<T>): T | null {
  if (heap.length === 0) {
    return null;
  }
  let first = heap[0];
  let last = heap.pop()!;
  if (first !== last) {
    // 证明heap中有2个或更多个元素
    heap[0] = last;
    siftDown(heap, last, 0);
  }
  return first;
}
// ! 从上往下堆化
function siftDown<T extends Node>(heap: Heap<T>, node: T, i: number): void {
  let index = i;
  let length = heap.length;
  let halfLength = length >>> 2;
  while (index < halfLength) {
    let leftIndex = (index + 1) * 2 - 1;
    let leftNode = heap[leftIndex];
    let rightIndex = leftIndex + 1;
    let rightNode = heap[rightIndex]; // right不一定存在，需要用到的时候还要在判断
    if (compare(leftNode, node) < 0) {
      // 左子节点小于根节点
      if (rightIndex < length && compare(leftNode, rightNode) < 0) {
        // 右节点存在且左节点 < 右节点
        heap[leftIndex] = node;
        heap[index] = leftNode;
        index = leftIndex;
      } else {
        // 右节点 < 左节点
        heap[rightIndex] = node;
        heap[index] = rightNode;
        index = rightIndex;
      }
    } else if (rightIndex < length && compare(rightNode, node) < 0) {
      // left >= node && right < node
      heap[rightIndex] = node;
      heap[index] = rightNode;
      index = rightIndex;
    } else {
      // 跟节点最小，不需要调整
      return;
    }
  }
}

function compare(a: Node, b: Node) {
  const diff = a.sortIndex - b.sortIndex;
  return diff !== 0 ? diff : a.id - b.id;
}
