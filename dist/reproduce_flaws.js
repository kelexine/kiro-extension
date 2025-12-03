"use strict";
function parseTasksFile(content) {
    const tasks = [];
    const lines = content.split("\n");
    // Regex from kiro-server.ts
    const taskRegex = /^- \[([ x-])\] (\d+(?:\.\d+)?)\. (.+)$/;
    for (const line of lines) {
        const match = line.match(taskRegex);
        if (!match)
            continue;
        const [, statusChar, id, content] = match;
        const status = statusChar === "x" ? "done" : statusChar === "-" ? "in_progress" : "pending";
        // Extract requirements
        const reqMatch = content.match(/_Requirements?: ([\d., ]+)_/);
        const requirements = reqMatch ? reqMatch[1].split(/,\s*/).map(r => r.trim()) : [];
        // Determine parent
        const isSubtask = id.includes(".");
        const parentId = isSubtask ? id.split(".")[0] : undefined;
        tasks.push({
            id,
            status,
            content: content.replace(/_Requirements?: [\d., ]+_/, "").trim(),
            subtasks: [],
            requirements,
            parentId,
        });
    }
    // Link subtasks
    tasks.forEach((task) => {
        if (task.parentId) {
            const parent = tasks.find((t) => t.id === task.parentId);
            if (parent && !parent.subtasks.includes(task.id)) {
                parent.subtasks.push(task.id);
            }
        }
    });
    return tasks;
}
function validateTaskSequence(tasks, taskId, newStatus) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task)
        return "Task not found";
    // Check if parent is complete (for subtasks)
    if (task.parentId) {
        const parent = tasks.find((t) => t.id === task.parentId);
        if (parent && parent.status !== "done" && newStatus === "done") {
            return `Cannot complete ${taskId} - parent task ${task.parentId} incomplete`;
        }
    }
    // Check if previous sibling is complete
    const siblings = tasks.filter((t) => t.parentId === task.parentId && !t.id.includes("."));
    const currentIndex = siblings.findIndex((t) => t.id === taskId);
    if (currentIndex > 0) {
        const prevSibling = siblings[currentIndex - 1];
        if (prevSibling.status !== "done" && newStatus !== "pending") {
            return `Cannot start ${taskId} - previous task ${prevSibling.id} incomplete`;
        }
    }
    return null;
}
// --- TESTS ---
console.log("--- Test 1: Parent Deadlock ---");
const deadlockContent = "
    - [];
1.;
Parent;
Task
    - [];
1.1;
Subtask;
A;
";;
const tasks1 = parseTasksFile(deadlockContent);
const result1 = validateTaskSequence(tasks1, "1.1", "done");
console.log(`Trying to complete 1.1 when 1 is pending. Result: "${result1}"`);
// Expected: Error
console.log("\n--- Test 2: Deep Nesting Support ---");
const deepContent = "
    - [];
1.;
Parent
    - [];
1.1;
Child
    - [];
1.1;
.1;
Grandchild;
";;
const tasks2 = parseTasksFile(deepContent);
const deepTask = tasks2.find(t => t.id === "1.1.1");
console.log(`Parsed '1.1.1'? ${deepTask ? "Yes" : "No"}`);
console.log(`Total tasks parsed: ${tasks2.length} (Expected 3)`);
console.log("\n--- Test 3: Subtask Sibling Logic ---");
// The validate function only checks siblings for NON-subtasks?
// Code: const siblings = tasks.filter((t) => t.parentId === task.parentId && !t.id.includes("."));
// If task.id is 1.2 (includes .), siblings list will be empty?
const siblingContent = "
    - [x];
1.;
Parent
    - [x];
1.1;
Child;
A
    - [];
1.2;
Child;
B;
";;
const tasks3 = parseTasksFile(siblingContent);
// 1.2 trying to start. 1.1 is done.
// But filter says: !t.id.includes(".")
// So siblings list for 1.2 (parentId=1) will exclude 1.1 and 1.2.
// Wait, let's trace the code.
// task = 1.2. parentId = 1.
// siblings = tasks.filter(t => t.parentId === "1" && !t.id.includes("."))
// t.id "1.1" includes ".". Filtered out.
// t.id "1.2" includes ".". Filtered out.
// siblings array is empty.
// currentIndex = -1.
// Loop doesn't run.
// Returns null (Allowed).
// So 1.2 can start even if 1.1 is pending?
console.log("Checking sibling logic for subtasks...");
const siblingContentBad = "
    - [x];
1.;
Parent
    - [];
1.1;
Child;
A
    - [];
1.2;
Child;
B;
";;
const tasks4 = parseTasksFile(siblingContentBad);
const result4 = validateTaskSequence(tasks4, "1.2", "in_progress");
console.log(`Trying to start 1.2 when 1.1 is pending. Result: "${result4}"`);
// Expected: Error (if logic worked), but suspect it allows it.
//# sourceMappingURL=reproduce_flaws.js.map