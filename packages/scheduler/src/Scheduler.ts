// todo 实现一个单线程任务调度器
import { getCurrentTime } from "shared/utils";
import {
    PriorityLevel,
    NoPriority,
    ImmediatePriority,
    UserBlockingPriority,
    NormalPriority,
    LowPriority,
    IdlePriority
} from "./SchedulerPriorities"

type Callback = (arg: boolean) => Callback | null | undefined

export type Task = {
    id: number;
    callback: Callback | null;
    priorityLevel: PriorityLevel;
    startTime: number;
    expirationTime: number;
    sortIndex: number;
}

// 任务池，最小堆
const taskQueue: Array<Task> = [];

let currentTask: Task | null = null;
let currentPriorityLevel: PriorityLevel = NoPriority;

// 记录时间切片的起始值，时间戳
let startTime = -1;

// 时间切片，这是个时间段
let frameInterval = 5;

// ! 何时把控制权交还给主线程
function shouldYieldToHost() {
    const timeElapsed = getCurrentTime() - startTime;
    if (timeElapsed < frameInterval) {
        return false;
    }
    return true;
}

// 任务调度器入口函数
function schedulerCallback (priorityLevel: PriorityLevel, callback: Callback) {
    // todo
} 

// 取消某个任务, 由于最小堆没法直接删除，所以只能初步把task.callback设置为null
// 调度过程中，当这个任务位于堆顶时，删掉
function cancleCallback () {
    currentTask.callback = null;
}

// 获取当前任务优先级
function getCurrentPriorityLevel (): PriorityLevel {
    return currentPriorityLevel;
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
    shouldYieldToHost
}
