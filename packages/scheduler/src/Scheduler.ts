// todo 实现一个单线程任务调度器
import { getCurrentTime, isFn } from "shared/utils";
import {
  PriorityLevel,
  NoPriority,
  ImmediatePriority,
  UserBlockingPriority,
  NormalPriority,
  LowPriority,
  IdlePriority,
} from "./SchedulerPriorities";
import { peek, pop, push } from "./SchedulerMinHeap";
import {
  lowPriorityTimeout,
  maxSigned31BitInt,
  normalPriorityTimeout,
  userBlockingPriorityTimeout,
} from "./SchedulerFeatureFlags";

type Callback = (arg: boolean) => Callback | null | undefined;

export type Task = {
  id: number;
  callback: Callback | null;
  priorityLevel: PriorityLevel;
  startTime: number;
  expirationTime: number;
  sortIndex: number;
};

// 任务池，最小堆
const taskQueue: Array<Task> = [];

// 标记task的唯一性
let taskIdCounter = 1;

let currentTask: Task | null = null;
let currentPriorityLevel: PriorityLevel = NoPriority;

// 记录时间切片的起始值，时间戳
let startTime = -1;

// 时间切片，这是个时间段
let frameInterval = 5;

// 锁
// 是否有work在执行
let isPerformingWork = false;

// 主线程是否在调度
let isHostCallbackScheduled = false;

//
let isMessageLoopRunning = false;

// ! 何时把控制权交还给主线程
function shouldYieldToHost() {
  const timeElapsed = getCurrentTime() - startTime;
  if (timeElapsed < frameInterval) {
    return false;
  }
  return true;
}

// 任务调度器入口函数
// 构建task
function schedulerCallback(priorityLevel: PriorityLevel, callback: Callback) {
  const startTime = getCurrentTime();
  // expirationTime过期时间，理论上的任务执行时间

  let timeout: number;
  switch (priorityLevel) {
    case ImmediatePriority:
      // 立即超时
      timeout = -1;
      break;
    case UserBlockingPriority:
      // 最终超时
      timeout = userBlockingPriorityTimeout;
      break;
    case IdlePriority:
      // 永不超时
      timeout = maxSigned31BitInt;
      break;
    case LowPriority:
      // 最终超时
      timeout = lowPriorityTimeout;
      break;
    case NormalPriority:
    default:
      timeout = normalPriorityTimeout;
  }
  const expirationTime = startTime + timeout;
  const newTask: Task = {
    id: taskIdCounter++,
    callback,
    priorityLevel,
    startTime,
    expirationTime,
    sortIndex: -1,
  };
  // sortIndex是最小堆排序的依据，最先开始的让他最先执行
  newTask.sortIndex = expirationTime;
  push(taskQueue, newTask);
  if (!isHostCallbackScheduled && !isPerformingWork) {
    isHostCallbackScheduled = true;
    requestHostCallback();
  }
}
// todo
function requestHostCallback() {
  if (!isMessageLoopRunning) {
    isMessageLoopRunning = true;
    schedulePerformWorkUntilDeadline();
  }
}

function performWorkUntilDeadline() {
  if (isMessageLoopRunning) {
    const currentTime = getCurrentTime();
    // 记录一个work的起始时间，其实就是一个时间切片的起始时间，这是个时间戳
    startTime = currentTime;
    let hasMoreWork = true;
    try {
      hasMoreWork = flushWork(currentTime);
    } finally {
      if (hasMoreWork) {
        schedulePerformWorkUntilDeadline();
      } else {
        isMessageLoopRunning = false;
      }
    }
  }
}
// 创建宏任务
const channel = new MessageChannel();
const port = channel.port1;
channel.port1.onmessage = performWorkUntilDeadline;
function schedulePerformWorkUntilDeadline() {
  port.postMessage(null);
}

function flushWork(initialTime) {
  isHostCallbackScheduled = false;
  isPerformingWork = true;
  let previousPriorityLevel = currentPriorityLevel;
  try {
    return workLoop(initialTime);
  } finally {
    currentTask = null;
    currentPriorityLevel = previousPriorityLevel;
    isPerformingWork = false;
  }
}

// 取消某个任务, 由于最小堆没法直接删除，所以只能初步把task.callback设置为null
// 调度过程中，当这个任务位于堆顶时，删掉
function cancleCallback() {
  currentTask!.callback = null;
}

// 获取当前任务优先级
function getCurrentPriorityLevel(): PriorityLevel {
  return currentPriorityLevel;
}

// 有很多task，每个task里面都有一个callback，callback执行完了，就执行下一个callback
// 一个work就是一个时间切片内执行的一些task
// 时间切片循环，就是work要循环
// 返回值为true，表示任务没有执行完，需要继续执行
function workLoop(initialTime: number): boolean {
  let currentTime = initialTime;
  let currentTask = peek(taskQueue);
  while (currentTask != null) {
    // 时间切片到头了，结束了
    if (currentTask.expirationTime > currentTime && shouldYieldToHost()) {
      break;
    }
    // 执行任务
    const callback = currentTask.callback;
    if (typeof callback === "function") {
      // 有效的任务
      currentTask.callback = null;
      currentPriorityLevel = currentTask.priorityLevel;
      const didUserCallbackTimeout = currentTask.expirationTime <= currentTime;
      const continuationCallback = callback(didUserCallbackTimeout);
      if (typeof continuationCallback === "function") {
        // 一个时间切片中，任务没有执行完，还要留在任务池中
        currentTask.callback = continuationCallback;
        return true;
      } else {
        // 当前任务正好位于堆顶，删除
        if (currentTask === peek(taskQueue)) {
          pop(taskQueue);
        }
        // 如果不在，什么都不用处理，之后循环到的时候直接走else，pop出去了
        return false;
      }
    } else {
      // 无效的任务
      pop(taskQueue);
    }
    // 获取下一个任务
    currentTask = peek(taskQueue);
  }
  if (currentTask != null) {
    return true;
  } else {
    return false;
  }
}

export {
  ImmediatePriority,
  NoPriority,
  UserBlockingPriority,
  NormalPriority,
  LowPriority,
  IdlePriority,
  schedulerCallback,
  cancleCallback,
  getCurrentPriorityLevel,
  shouldYieldToHost,
};
