type TaskStatus = "pending" | "in_progress" | "done";
interface Task {
    id: string;
    status: TaskStatus;
    content: string;
    subtasks: string[];
    requirements: string[];
    parentId?: string;
}
declare function parseTasksFile(content: string): Task[];
declare function validateTaskSequence(tasks: Task[], taskId: string, newStatus: TaskStatus): string | null;
declare const deadlockContent: number;
declare const tasks1: Task[];
declare const result1: string | null;
declare const deepContent: number;
declare const tasks2: Task[];
declare const deepTask: Task | undefined;
declare const siblingContent: number;
declare const tasks3: Task[];
declare const siblingContentBad: number;
declare const tasks4: Task[];
declare const result4: string | null;
//# sourceMappingURL=reproduce_flaws.d.ts.map