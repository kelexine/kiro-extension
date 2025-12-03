---
name: Bug Report
about: Report a bug in Kiro extension
title: "[BUG] "
labels: bug
assignees: kelexine
---

## Bug Description

A clear description of what the bug is.

## Steps to Reproduce

1. Install extension: `gemini extensions install ...`
2. Run command: `kiro_spec feature-name`
3. Observe error: `...`

## Expected Behavior

What should have happened.

## Actual Behavior

What actually happened.

## Error Message

```
Paste the full error message here
```

## Environment

- **OS**: [e.g., macOS 14.0, Ubuntu 22.04]
- **Node.js version**: [e.g., 20.10.0]
- **Gemini CLI version**: [e.g., 0.4.0]
- **Kiro extension version**: [e.g., 1.0.0]

## Extension Status

```bash
# Output of:
gemini extensions list
```

## State Information

If the bug involves task execution or state transitions:

```bash
# Contents of:
cat .kiro/specs/{feature}/state.json
```

## Additional Context

- Does this happen consistently or intermittently?
- Did this work before? If so, what changed?
- Any relevant logs from Gemini CLI?

## Checklist

- [ ] I've checked existing issues
- [ ] I've tried restarting the extension
- [ ] I've provided all requested information
- [ ] I can reproduce this consistently
