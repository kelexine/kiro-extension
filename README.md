# Kiro - Gemini CLI Extension

**Author:** [@kelexine](https://github.com/kelexine)

Spec-driven development workflow for Gemini CLI. Converts Claude Code Skills into MCP tools with state machine enforcement.

## Overview

Kiro guides you through structured feature development:

```
Requirements → Design → Tasks → Execute
```

Each phase validates completion of the previous step, ensuring quality and consistency.

## Installation

### Prerequisites

- Node.js ≥18.0.0
- Gemini CLI v0.4.0+
- Git installed

### Install Extension

```bash
# Install from GitHub
gemini extensions install https://github.com/kelexine/kiro-extension

# Or install from local path
gemini extensions install /path/to/kiro-extension

# Enable auto-updates (optional)
gemini extensions install https://github.com/kelexine/kiro-extension --auto-update
```

### Verify Installation

```bash
# List installed extensions
gemini extensions list

# Check if Kiro tools are available
# Start Gemini CLI and list tools - you should see kiro_* tools
```

### Update Extension

```bash
# Update to latest version
gemini extensions update kiro

# Or update all extensions
gemini extensions update --all
```

### Uninstall

```bash
gemini extensions uninstall kiro
```

## Project Structure

```
kiro-extension/
├── commands/
│   └── kiro/
│       ├── spec.md       # Requirements phase
│       ├── design.md     # Design phase
│       ├── task.md       # Task generation
│       ├── execute.md    # Task execution
│       └── vibe.md       # Quick dev mode
├── skills/
│   └── kiro-skill/
│       └── helpers/
│           ├── kiro-identity.md
│           └── workflow-diagrams.md
├── dist/
│   └── kiro-mcp-server.js  # Built MCP server
├── gemini-extension.json
├── CONTEXT.md
├── kiro-mcp-server.ts
├── package.json
└── tsconfig.json
```

## Usage

### 1. Start Requirements Phase

```
Use kiro_spec tool with feature name "user-authentication"
```

Creates `.kiro/specs/user-authentication/requirements.md`

### 2. Create Design

```
Use kiro_design tool with feature "user-authentication"
```

Creates `design.md` (requires completed requirements)

### 3. Generate Tasks

```
Use kiro_task tool with feature "user-authentication"
```

Creates `tasks.md` with numbered checklist (requires completed design)

### 4. Execute Tasks

```
Use kiro_execute tool with feature "user-authentication" and task_id "1"
```

Auto-marks task as in-progress, provides full context

### Task Management

**Check task status:**
```
Use get_task tool with feature "user-authentication" and task_id "2.1"
```

**Mark task complete:**
```
Use set_task tool with feature "user-authentication", task_id "2.1", status "done"
```

### Vibe Mode

For quick development without structured workflow:

```
Use kiro_vibe tool
```

**Never combine with workflow tools** (spec/design/task/execute)

## MCP Tools

| Tool | Purpose | Requirements |
|------|---------|--------------|
| `kiro_spec` | Requirements gathering | None (entry point) |
| `kiro_design` | Design document | requirements.md exists |
| `kiro_task` | Task list generation | design.md exists |
| `kiro_execute` | Task execution | tasks.md exists |
| `kiro_vibe` | Quick dev mode | None (isolated) |
| `get_task` | Task status check | tasks.md exists |
| `set_task` | Update task status | Validates sequence |

## State Machine

```
kiro_spec → kiro_design → kiro_task → kiro_execute
   ↓           ↓            ↓             ↓
creates    creates      creates       marks tasks
req.md     design.md    tasks.md      [-] → [x]
```

**Validation rules:**
- Each phase checks predecessor completion
- Tasks execute sequentially (2.1 requires 2 complete)
- Subtasks blocked by parent status
- No completion without verified tests

## Task Format

```markdown
- [ ] 1. Set up project structure
  - Create directory structure
  - _Requirements: 1.1_

- [ ] 2. Implement data models
  - [ ] 2.1 Create interfaces
    - Write TypeScript interfaces
    - _Requirements: 2.1, 3.3_
  
  - [ ] 2.2 Implement validation
    - Write validation methods
    - _Requirements: 1.2_
```

**Checkbox states:**
- `[ ]` = pending
- `[-]` = in_progress
- `[x]` = done

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

## Development

For local development:

```bash
# Clone repository
git clone https://github.com/kelexine/kiro-extension.git
cd kiro-extension

# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch mode for development
npm run watch

# Link for testing
gemini extensions link .
```

After making changes, restart Gemini CLI to reload the extension.

## Troubleshooting

**"Requirements phase incomplete"**
- Run `kiro_spec` first to create requirements.md

**"Cannot complete 2.1 - parent task 2 incomplete"**
- Complete parent tasks before subtasks

**"Previous task incomplete"**
- Tasks must execute sequentially (1 → 2 → 3)

**Vibe mode not working**
- Ensure you're not combining with workflow tools

## Contributing

PRs welcome! Maintain state machine logic and sequential validation.

## License

MIT

---

Built by [@kelexine](https://github.com/kelexine) for structured, test-driven development workflows.