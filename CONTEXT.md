# Kiro Extension

Spec-driven development workflow for Gemini CLI. Structured feature development through sequential phases with explicit approval gates.

## Workflow Rules

### Phase Sequence (STRICT)
```
kiro_spec → kiro_design → kiro_task → kiro_execute
```

**Each phase MUST:**
1. Validate predecessor file exists before proceeding
2. Create its designated file in `.kiro/specs/{feature}/`
3. Wait for explicit user approval before moving to next phase
4. Update `state.json` with current phase

**Files created:**
- `kiro_spec` → `requirements.md`
- `kiro_design` → `design.md`  
- `kiro_task` → `tasks.md`
- `kiro_execute` → marks tasks in `tasks.md`

### Phase Validation

**kiro_spec**: No prerequisites (entry point)

**kiro_design**: 
- MUST check `requirements.md` exists
- Error if missing: "Requirements phase incomplete. Run kiro_spec first."

**kiro_task**:
- MUST check `design.md` exists  
- Error if missing: "Design phase incomplete. Run kiro_design first."

**kiro_execute**:
- MUST check `tasks.md` exists
- Error if missing: "Tasks phase incomplete. Run kiro_task first."

### Approval Gates

After creating/updating each document:
- ASK: "Does the {phase} look good?"
- WAIT for explicit approval ("yes", "approved", "looks good")
- If feedback provided: revise document and ask again
- DO NOT proceed without approval

## Task Management

Task Management CANNOT start until phase validation is complete.

### Task Format
```markdown
- [ ] 1. Parent task
  - Details
  - _Requirements: 1.1_

- [ ] 2. Parent with subtasks
  - [ ] 2.1 First subtask
    - Details
    - _Requirements: 2.1_
  - [ ] 2.2 Second subtask
```

### Task States
- `[ ]` = pending
- `[-]` = in_progress (set by `kiro_execute` or `set_task`)
- `[x]` = done (set by `set_task` after verification)

### Sequential Execution Rules

**Parent blocking:**
- Task 2 cannot start until task 1 is complete
- Task 3 cannot start until task 2.2 is complete

**Sibling ordering:**
- Task 1 must complete before task 2
- Task 2.1 must complete before task 2.2

**Completion requirements:**
- NO task marked `[x]` without verified implementation
- NO task marked `[x]` without passing tests (unit, integration)
- Use `set_task` to mark complete, which validates sequence

## MCP Tools

### Workflow Tools (Sequential Use)

**kiro_spec(feature: string)**
- Requirements gathering with EARS format
- Creates `requirements.md` with user stories + acceptance criteria
- No prerequisites

**kiro_design(feature: string)**
- Design document creation with research
- Requires: `requirements.md` exists
- Creates: `design.md` (architecture, components, data models)

**kiro_task(feature: string)**
- Implementation task list generation
- Requires: `design.md` exists
- Creates: `tasks.md` (test-driven, incremental tasks)

**kiro_execute(feature: string, task_id?: string)**
- Task execution with full context injection
- Requires: `tasks.md` exists
- Auto-marks task as `[-]` if task_id provided
- Injects: requirements.md + design.md + tasks.md

### Task Management Tools

Task Tools can only be used after phase validation is completed.

**get_task(feature: string, task_id: string)**
- Returns task details: id, status, content, subtasks, requirements
- Example: `get_task("user-auth", "2.1")`

**set_task(feature: string, task_id: string, status: "in_progress" | "done")**
- Updates task checkbox status
- Validates sequential execution rules
- Errors if sequence violated
- Example: `set_task("user-auth", "2.1", "done")`

### Vibe Mode (Isolated)

**kiro_vibe()**
- Quick development without structured workflow
- NEVER combine with kiro_spec/design/task/execute
- Use ONLY when "vibe coding" explicitly mentioned

## State Tracking

Located at `.kiro/specs/{feature}/state.json`:

```json
{
  "feature": "user-authentication",
  "phase": "execute",
  "current_task": "2.1",
  "completed_tasks": ["1", "2"],
  "last_updated": "2024-12-03T..."
}
```

## Error Handling

**Missing predecessor**: "Requirements/Design/Tasks phase incomplete. Run {tool} first."

**Invalid task sequence**: "Cannot complete 2.1 - parent task 2 incomplete"

**Sequential violation**: "Cannot start 3 - previous task 2.2 incomplete"

## Critical Constraints

1. **One phase at a time** - Complete current phase before next
2. **Explicit approval required** - Never auto-proceed between phases  
3. **Sequential task execution** - Parent blocks children, siblings ordered
4. **Test verification** - No completion without passing tests
5. **Vibe isolation** - Never mix with workflow tools