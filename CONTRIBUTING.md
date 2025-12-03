# Contributing to Kiro Extension

**Author:** [@kelexine](https://github.com/kelexine)

Thanks for your interest in contributing to Kiro! This document outlines the guidelines for contributing.

## Code of Conduct

- Be respectful and constructive
- Focus on what's best for the project
- Show empathy towards other contributors

## Getting Started

### Prerequisites

- Node.js ≥18.0.0
- Gemini CLI v0.4.0+
- Git
- TypeScript knowledge

### Development Setup

```bash
# Fork and clone
git clone https://github.com/kelexine/kiro-extension.git
cd kiro-extension

# Install dependencies
npm install

# Build
npm run build

# Link for testing
gemini extensions link .
```

## Development Workflow

### Making Changes

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

2. **Make your changes**
   - Follow the code style (TypeScript strict mode)
   - Add comments for complex logic
   - Update documentation if needed

3. **Test locally**
   ```bash
   # Build
   npm run build
   
   # Test in Gemini CLI
   gemini extensions restart kiro
   ```

4. **Commit**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   # or
   git commit -m "fix: resolve bug in task validation"
   ```

### Commit Convention

Use conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test additions/changes
- `chore:` - Build/config changes

### Pull Request Process

1. Update README.md if adding features
2. Update GEMINI.md if changing workflow
3. Ensure build passes: `npm run build`
4. Push and create PR with description

## Architecture Guidelines

### State Machine Rules (CRITICAL)

The workflow is a strict state machine:

```
kiro_spec → kiro_design → kiro_task → kiro_execute
```

**Never:**
- Skip phases
- Proceed without validation
- Auto-approve between phases

**Always:**
- Check predecessor files exist
- Validate task sequences
- Update state.json
- Return clear error messages

### Code Style

**Production-grade standards:**

```typescript
// ✅ Good: Explicit types, error handling
async function kiroSpec(feature: string): Promise<string> {
  if (!fileExists(directivePath)) {
    throw new Error(`spec.md not found at ${directivePath}`);
  }
  // ...
}

// ❌ Bad: No types, no validation
async function kiroSpec(feature) {
  const directive = readFile(path);
  // ...
}
```

**Edge cases:**
- Handle missing files gracefully
- Validate all inputs
- Provide actionable error messages
- Check file permissions

**Minimal code:**
- No verbose implementations
- No unnecessary abstractions
- DRY (Don't Repeat Yourself)

### File Organization

```
kiro-extension/
├── commands/kiro/          # Phase directives
├── skills/kiro-skill/      # Helper docs
├── dist/                   # Build output (gitignored)
├── kiro-mcp-server.ts      # Main server
├── gemini-extension.json   # Extension config
└── GEMINI.md              # Workflow docs
```

**Adding new phases:**
1. Create directive in `commands/kiro/{phase}.md`
2. Add tool implementation in `kiro-mcp-server.ts`
3. Update state machine validation
4. Document in GEMINI.md

### Testing Checklist

Before submitting PR, test:

- [ ] `npm run build` succeeds
- [ ] Extension loads: `gemini extensions list`
- [ ] Tools appear in Gemini CLI
- [ ] State transitions work correctly
- [ ] Task validation catches errors
- [ ] File paths resolve correctly
- [ ] Error messages are clear

## Areas for Contribution

### High Priority

- **Tests**: Unit tests for task parsing, validation
- **Error handling**: Better error messages
- **Documentation**: More examples, tutorials
- **Performance**: Optimize file reads

### Feature Ideas

- Export/import specs
- Task dependencies visualization
- Parallel task execution
- Template system for common patterns
- Integration with CI/CD

### Bug Fixes

Check [Issues](https://github.com/kelexine/kiro-extension/issues) for:
- State machine violations
- Path resolution errors
- Task parsing edge cases

## Code Review Standards

Reviewers will check:

1. **Correctness**: Does it work as intended?
2. **State machine**: Does it maintain workflow integrity?
3. **Error handling**: Are edge cases covered?
4. **Code quality**: Is it minimal and production-grade?
5. **Documentation**: Are changes documented?

## Questions?

- Open an [Issue](https://github.com/kelexine/kiro-extension/issues)
- Tag @kelexine for urgent matters

## License

By contributing, you agree your contributions will be licensed under MIT License.
