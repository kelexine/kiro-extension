#!/usr/bin/env node
/**
 * Kiro MCP Server - Spec-driven development workflow for Gemini CLI
 * Author: @kelexine (https://github.com/kelexine)
 * Version: 0.1.10
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
// ES Module dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Paths
// Resolve root directory based on execution context (dist vs source)
const isDist = __dirname.endsWith(path.join("dist"));
const rootDir = isDist ? path.resolve(__dirname, "..") : __dirname;
const COMMANDS_DIR = path.join(rootDir, "commands", "kiro");
const HELPERS_DIR = path.join(rootDir, "skills", "kiro-skill", "helpers");
const SPECS_BASE = ".kiro/specs";
// Utilities
function readFile(filePath) {
    try {
        return fs.readFileSync(filePath, "utf-8");
    }
    catch (error) {
        throw new Error(`File not found: ${filePath}`);
    }
}
function writeFile(filePath, content) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, "utf-8");
}
function fileExists(filePath) {
    return fs.existsSync(filePath);
}
function loadHelpers() {
    const identityPath = path.join(HELPERS_DIR, "kiro-identity.md");
    const diagramsPath = path.join(HELPERS_DIR, "workflow-diagrams.md");
    const identity = fileExists(identityPath) ? readFile(identityPath) : "";
    const diagrams = fileExists(diagramsPath) ? readFile(diagramsPath) : "";
    return `\n\n---\n${identity}\n\n---\n${diagrams}`;
}
function getSpecPath(feature, file) {
    return path.join(SPECS_BASE, feature, file);
}
function loadState(feature) {
    const statePath = path.join(SPECS_BASE, feature, "state.json");
    if (!fileExists(statePath))
        return null;
    try {
        return JSON.parse(readFile(statePath));
    }
    catch {
        return null;
    }
}
function saveState(feature, state) {
    const statePath = path.join(SPECS_BASE, feature, "state.json");
    state.last_updated = new Date().toISOString();
    writeFile(statePath, JSON.stringify(state, null, 2));
}
// Task parsing
function parseTasksFile(content) {
    const tasks = [];
    const lines = content.split("\n");
    const taskRegex = /^\s*- \[([ x-])\] (\d+(?:\.\d+)*)\. (.+)$/;
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
        const parentId = isSubtask ? id.substring(0, id.lastIndexOf(".")) : undefined;
        tasks.push({
            id,
            status,
            content: content.replace(/_Requirements?: [\d., ]+_/, "").trim(),
            subtasks: [],
            requirements,
            parentId,
        });
    }
    // Link subtasks to parents
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
function updateTaskStatus(content, taskId, status) {
    const statusChar = status === "done" ? "x" : status === "in_progress" ? "-" : " ";
    const escapedId = taskId.replace(/\./g, "\\.");
    const regex = new RegExp(`^(- \\[)[ x-](\\] ${escapedId}\\. .+)$`, "gm");
    return content.replace(regex, `$1${statusChar}$2`);
}
function validateTaskSequence(tasks, taskId, newStatus) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task)
        return "Task not found";
    // Check if parent is complete (for subtasks)
    /*
    if (task.parentId) {
      const parent = tasks.find((t) => t.id === task.parentId);
      if (parent && parent.status !== "done" && newStatus === "done") {
        return `Cannot complete ${taskId} - parent task ${task.parentId} incomplete`;
      }
    }
    */
    // Check if previous sibling is complete
    const siblings = tasks.filter((t) => t.parentId === task.parentId);
    const currentIndex = siblings.findIndex((t) => t.id === taskId);
    if (currentIndex > 0) {
        const prevSibling = siblings[currentIndex - 1];
        if (prevSibling.status !== "done" && newStatus !== "pending") {
            return `Cannot start ${taskId} - previous task ${prevSibling.id} incomplete`;
        }
    }
    // Check requirements
    if (task.requirements.length > 0 && newStatus !== "pending") {
        const unmetReqs = task.requirements.filter(reqId => !tasks.find(t => t.id === reqId && t.status === "done"));
        if (unmetReqs.length > 0) {
            return `Cannot start ${taskId} - requirements not met: ${unmetReqs.join(", ")}`;
        }
    }
    return null;
}
// Tool implementations
async function kiroSpec(feature) {
    const directivePath = path.join(COMMANDS_DIR, "spec.md");
    if (!fileExists(directivePath)) {
        throw new Error(`spec.md not found at ${directivePath}. Ensure commands/kiro/ directory exists.`);
    }
    const directive = readFile(directivePath);
    const helpers = loadHelpers();
    // Initialize state
    const state = {
        feature,
        phase: "spec",
        completed_tasks: [],
        last_updated: new Date().toISOString(),
    };
    saveState(feature, state);
    return `${directive}${helpers}\n\n**Feature**: ${feature}\n**Phase**: Requirements Gathering`;
}
async function kiroDesign(feature) {
    const reqPath = getSpecPath(feature, "requirements.md");
    if (!fileExists(reqPath)) {
        throw new Error("Requirements phase incomplete. Run kiro_spec first.");
    }
    const directive = readFile(path.join(COMMANDS_DIR, "design.md"));
    const helpers = loadHelpers();
    const requirements = readFile(reqPath);
    // Update state
    const state = loadState(feature) || {
        feature,
        phase: "spec",
        completed_tasks: [],
        last_updated: "",
    };
    state.phase = "design";
    saveState(feature, state);
    return `${directive}${helpers}\n\n**Feature**: ${feature}\n**Phase**: Design\n\n## Requirements Context\n${requirements}`;
}
async function kiroTask(feature) {
    const designPath = getSpecPath(feature, "design.md");
    if (!fileExists(designPath)) {
        throw new Error("Design phase incomplete. Run kiro_design first.");
    }
    const directive = readFile(path.join(COMMANDS_DIR, "task.md"));
    const helpers = loadHelpers();
    const design = readFile(designPath);
    // Update state
    const state = loadState(feature) || {
        feature,
        phase: "task",
        completed_tasks: [],
        last_updated: "",
    };
    state.phase = "task";
    saveState(feature, state);
    return `${directive}${helpers}\n\n**Feature**: ${feature}\n**Phase**: Task Planning\n\n## Design Context\n${design}`;
}
async function kiroExecute(feature, taskId) {
    const tasksPath = getSpecPath(feature, "tasks.md");
    if (!fileExists(tasksPath)) {
        throw new Error("Tasks phase incomplete. Run kiro_task first.");
    }
    const directive = readFile(path.join(COMMANDS_DIR, "execute.md"));
    const helpers = loadHelpers();
    const requirements = readFile(getSpecPath(feature, "requirements.md"));
    const design = readFile(getSpecPath(feature, "design.md"));
    const tasks = readFile(tasksPath);
    // Update state
    const state = loadState(feature) || {
        feature,
        phase: "execute",
        completed_tasks: [],
        last_updated: "",
    };
    state.phase = "execute";
    // Auto-mark task as in_progress if specified
    if (taskId) {
        const parsedTasks = parseTasksFile(tasks);
        const error = validateTaskSequence(parsedTasks, taskId, "in_progress");
        if (error)
            throw new Error(error);
        const updatedTasks = updateTaskStatus(tasks, taskId, "in_progress");
        writeFile(tasksPath, updatedTasks);
        state.current_task = taskId;
    }
    saveState(feature, state);
    return `${directive}${helpers}\n\n**Feature**: ${feature}\n**Phase**: Execute${taskId ? ` - Task ${taskId}` : ""}\n\n## Requirements\n${requirements}\n\n## Design\n${design}\n\n## Tasks\n${tasks}`;
}
async function kiroVibe() {
    const directive = readFile(path.join(COMMANDS_DIR, "vibe.md"));
    const helpers = loadHelpers();
    return `${directive}${helpers}\n\n**Mode**: Vibe Coding (Quick Development)`;
}
async function kiroStatus() {
    if (!fs.existsSync(SPECS_BASE)) {
        return "No Kiro specs found. Start a feature with 'kiro_spec'.";
    }
    const features = fs.readdirSync(SPECS_BASE).filter(f => fs.statSync(path.join(SPECS_BASE, f)).isDirectory());
    if (features.length === 0) {
        return "No active features found.";
    }
    let output = "# Kiro Feature Status\n\n";
    output += "| Feature | Phase | Current Task | Progress | Last Updated |\n";
    output += "| :--- | :--- | :--- | :--- | :--- |\n";
    for (const feature of features) {
        const state = loadState(feature);
        if (!state)
            continue;
        let progress = "-";
        if (state.phase === "execute" || state.phase === "task") {
            const tasksPath = getSpecPath(feature, "tasks.md");
            if (fileExists(tasksPath)) {
                const tasksContent = readFile(tasksPath);
                const tasks = parseTasksFile(tasksContent);
                const total = tasks.length;
                const completed = tasks.filter(t => t.status === "done").length;
                progress = total > 0 ? `${completed}/${total} (${Math.round(completed / total * 100)}%)` : "0/0";
            }
        }
        const lastUpdate = new Date(state.last_updated).toLocaleString();
        const currentTask = state.current_task || "-";
        output += `| ${state.feature} | ${state.phase} | ${currentTask} | ${progress} | ${lastUpdate} |\n`;
    }
    return output;
}
async function kiroScaffold(feature) {
    const designPath = getSpecPath(feature, "design.md");
    if (!fileExists(designPath)) {
        throw new Error("Design phase incomplete. Run kiro_design first.");
    }
    const content = readFile(designPath);
    const structureMatch = content.match(/```file-structure([\s\S]*?)```/);
    if (!structureMatch) {
        return "No 'file-structure' code block found in design.md. Cannot scaffold.";
    }
    const lines = structureMatch[1].split("\n").filter(line => line.trim());
    const created = [];
    for (const line of lines) {
        // Simple parsing: remove tree chars and trim
        const cleanPath = line.replace(/^[ │├└─-]+/, "").trim();
        if (!cleanPath || cleanPath.startsWith("#"))
            continue;
        // Check if it looks like a directory (ends with /) or has extension
        const isDir = cleanPath.endsWith("/");
        const fullPath = path.join(process.cwd(), cleanPath);
        if (isDir) {
            fs.mkdirSync(fullPath, { recursive: true });
            created.push(`DIR: ${cleanPath}`);
        }
        else {
            // Ensure parent dir exists
            fs.mkdirSync(path.dirname(fullPath), { recursive: true });
            if (!fileExists(fullPath)) {
                fs.writeFileSync(fullPath, "// Scaffolding placeholder\n");
                created.push(`FILE: ${cleanPath}`);
            }
        }
    }
    return `Scaffolded ${created.length} items:\n${created.join("\n")}`;
}
async function kiroReview(feature) {
    const tasksPath = getSpecPath(feature, "tasks.md");
    if (!fileExists(tasksPath)) {
        throw new Error("Tasks phase not found. Cannot review a feature that hasn't been planned.");
    }
    const directive = readFile(path.join(COMMANDS_DIR, "review.md"));
    const helpers = loadHelpers();
    const requirements = readFile(getSpecPath(feature, "requirements.md"));
    const design = readFile(getSpecPath(feature, "design.md"));
    const tasks = readFile(tasksPath);
    return `${directive}${helpers}\n\n**Feature**: ${feature}\n**Phase**: QA Review\n\n## Requirements\n${requirements}\n\n## Design\n${design}\n\n## Tasks Status\n${tasks}`;
}
async function kiroArchive(feature) {
    const featureDir = path.join(SPECS_BASE, feature);
    const archiveBase = ".kiro/archive";
    const archiveDir = path.join(archiveBase, feature);
    if (!fileExists(featureDir)) {
        throw new Error(`Feature '${feature}' not found in active specs.`);
    }
    // Ensure archive base exists
    fs.mkdirSync(archiveBase, { recursive: true });
    if (fileExists(archiveDir)) {
        throw new Error(`Feature '${feature}' is already archived.`);
    }
    // Move directory
    fs.renameSync(featureDir, archiveDir);
    return `Feature '${feature}' successfully archived to ${archiveDir}`;
}
async function getTask(feature, taskId) {
    const tasksPath = getSpecPath(feature, "tasks.md");
    if (!fileExists(tasksPath)) {
        throw new Error("Tasks file not found");
    }
    const content = readFile(tasksPath);
    const tasks = parseTasksFile(content);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) {
        throw new Error(`Task ${taskId} not found`);
    }
    return JSON.stringify(task, null, 2);
}
async function setTask(feature, taskId, status) {
    const tasksPath = getSpecPath(feature, "tasks.md");
    if (!fileExists(tasksPath)) {
        throw new Error("Tasks file not found");
    }
    const content = readFile(tasksPath);
    const tasks = parseTasksFile(content);
    // Validate sequence
    const error = validateTaskSequence(tasks, taskId, status);
    if (error)
        throw new Error(error);
    // Update file
    const updatedContent = updateTaskStatus(content, taskId, status);
    writeFile(tasksPath, updatedContent);
    // Update state
    const state = loadState(feature) || {
        feature,
        phase: "execute",
        completed_tasks: [],
        last_updated: "",
    };
    if (status === "done" && !state.completed_tasks.includes(taskId)) {
        state.completed_tasks.push(taskId);
    }
    if (status === "in_progress") {
        state.current_task = taskId;
    }
    saveState(feature, state);
    return `Task ${taskId} marked as ${status}`;
}
// MCP Server
const server = new Server({
    name: "kiro-mcp",
    version: "0.1.10",
}, {
    capabilities: {
        tools: {},
    },
});
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: "kiro_spec",
            description: "Start requirements phase for a feature",
            inputSchema: {
                type: "object",
                properties: {
                    feature: { type: "string", description: "Feature name (kebab-case)" },
                },
                required: ["feature"],
            },
        },
        {
            name: "kiro_design",
            description: "Create design document (requires completed requirements)",
            inputSchema: {
                type: "object",
                properties: {
                    feature: { type: "string", description: "Feature name" },
                },
                required: ["feature"],
            },
        },
        {
            name: "kiro_task",
            description: "Generate task list (requires completed design)",
            inputSchema: {
                type: "object",
                properties: {
                    feature: { type: "string", description: "Feature name" },
                },
                required: ["feature"],
            },
        },
        {
            name: "kiro_execute",
            description: "Execute tasks (requires completed task list)",
            inputSchema: {
                type: "object",
                properties: {
                    feature: { type: "string", description: "Feature name" },
                    task_id: { type: "string", description: "Optional task ID to execute" },
                },
                required: ["feature"],
            },
        },
        {
            name: "kiro_status",
            description: "Show status dashboard of all active features",
            inputSchema: {
                type: "object",
                properties: {},
            },
        },
        {
            name: "kiro_scaffold",
            description: "Automatically create files and directories from design.md",
            inputSchema: {
                type: "object",
                properties: {
                    feature: { type: "string", description: "Feature name" },
                },
                required: ["feature"],
            },
        },
        {
            name: "kiro_review",
            description: "Perform QA review and gap analysis against requirements",
            inputSchema: {
                type: "object",
                properties: {
                    feature: { type: "string", description: "Feature name" },
                },
                required: ["feature"],
            },
        },
        {
            name: "kiro_archive",
            description: "Archive a completed feature to clean up the workspace",
            inputSchema: {
                type: "object",
                properties: {
                    feature: { type: "string", description: "Feature name" },
                },
                required: ["feature"],
            },
        },
        {
            name: "kiro_vibe",
            description: "Quick development mode (isolated, never combine with workflow tools)",
            inputSchema: {
                type: "object",
                properties: {},
            },
        },
        {
            name: "get_task",
            description: "Get task details and status",
            inputSchema: {
                type: "object",
                properties: {
                    feature: { type: "string", description: "Feature name" },
                    task_id: { type: "string", description: "Task ID (e.g., 2.1)" },
                },
                required: ["feature", "task_id"],
            },
        },
        {
            name: "set_task",
            description: "Update task status (validates sequence)",
            inputSchema: {
                type: "object",
                properties: {
                    feature: { type: "string", description: "Feature name" },
                    task_id: { type: "string", description: "Task ID" },
                    status: {
                        type: "string",
                        enum: ["in_progress", "done"],
                        description: "Task status",
                    },
                },
                required: ["feature", "task_id", "status"],
            },
        },
    ],
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        const { name, arguments: args } = request.params;
        if (!args) {
            throw new Error("Missing arguments");
        }
        switch (name) {
            case "kiro_spec":
                return { content: [{ type: "text", text: await kiroSpec(args.feature) }] };
            case "kiro_design":
                return { content: [{ type: "text", text: await kiroDesign(args.feature) }] };
            case "kiro_task":
                return { content: [{ type: "text", text: await kiroTask(args.feature) }] };
            case "kiro_execute":
                return {
                    content: [{ type: "text", text: await kiroExecute(args.feature, args.task_id) }],
                };
            case "kiro_status":
                return { content: [{ type: "text", text: await kiroStatus() }] };
            case "kiro_scaffold":
                return { content: [{ type: "text", text: await kiroScaffold(args.feature) }] };
            case "kiro_review":
                return { content: [{ type: "text", text: await kiroReview(args.feature) }] };
            case "kiro_archive":
                return { content: [{ type: "text", text: await kiroArchive(args.feature) }] };
            case "kiro_vibe":
                return { content: [{ type: "text", text: await kiroVibe() }] };
            case "get_task":
                return {
                    content: [{ type: "text", text: await getTask(args.feature, args.task_id) }],
                };
            case "set_task":
                return {
                    content: [
                        { type: "text", text: await setTask(args.feature, args.task_id, args.status) },
                    ],
                };
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            content: [{ type: "text", text: `Error: ${message}` }],
            isError: true,
        };
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Kiro MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
//# sourceMappingURL=kiro-server.js.map