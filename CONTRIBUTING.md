# Contributing to AI Site Builder

Thank you for your interest in contributing to the AI Site Builder! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and collaborative environment for everyone.

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

**Bug reports should include:**
- Clear, descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Environment details:
  - OS version
  - Local by Flywheel version
  - Node.js version (if building from source)
  - Addon version

### Suggesting Enhancements

Enhancement suggestions are welcome! Please provide:
- Clear description of the proposed feature
- Use cases and benefits
- Mockups or examples (if applicable)
- Any potential drawbacks or considerations

### Pull Requests

1. **Fork the Repository**
   ```bash
   git clone https://github.com/your-username/ai-site-builder.git
   cd ai-site-builder
   ```

2. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Make Your Changes**
   - Write clean, readable code
   - Follow existing code style
   - Add/update tests as needed
   - Update documentation as needed

5. **Run Tests and Linting**
   ```bash
   npm test
   npm run lint
   npm run type-check
   ```

6. **Commit Your Changes**

   Follow [Conventional Commits](https://www.conventionalcommits.org/):

   ```bash
   git commit -m "feat: add new feature"
   git commit -m "fix: resolve bug in component"
   git commit -m "docs: update installation guide"
   ```

   **Commit Types:**
   - `feat:` - New features
   - `fix:` - Bug fixes
   - `docs:` - Documentation only
   - `style:` - Code style (formatting, semicolons, etc.)
   - `refactor:` - Code refactoring
   - `test:` - Adding or updating tests
   - `chore:` - Maintenance tasks
   - `ci:` - CI/CD changes

7. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

8. **Create Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your branch
   - Fill out the PR template
   - Link any related issues

## Development Setup

### Prerequisites

- Node.js 18.0.0 or higher
- npm 9.0.0 or higher
- Local by Flywheel 6.0.0 or higher
- Git

### Setup Instructions

```bash
# Clone your fork
git clone https://github.com/your-username/ai-site-builder.git
cd ai-site-builder

# Add upstream remote
git remote add upstream https://github.com/wpengine/ai-site-builder.git

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### Development Workflow

1. **Keep Your Fork Updated**
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/new-feature
   ```

3. **Development Cycle**
   ```bash
   # Watch mode for development
   npm run watch

   # Run tests continuously
   npm run test:watch
   ```

4. **Before Committing**
   ```bash
   # Run full test suite
   npm test

   # Run linting
   npm run lint

   # Run type checking
   npm run type-check

   # Format code
   npm run format
   ```

## Code Style

### TypeScript Guidelines

- Use TypeScript for all new code
- Provide explicit types where helpful
- Avoid `any` type (use `unknown` if necessary)
- Use interfaces for object shapes
- Use enums for fixed sets of values

### React Guidelines

- Use functional components
- Use hooks for state management
- Keep components small and focused
- Extract reusable logic into custom hooks
- Prop-type validation not required (TypeScript provides types)

### General Guidelines

- Write self-documenting code
- Add comments for complex logic
- Keep functions small and single-purpose
- Use meaningful variable names
- Follow existing patterns in the codebase

## Testing

### Writing Tests

- Write tests for all new features
- Update tests for modified code
- Aim for 80%+ code coverage
- Test edge cases and error conditions

### Test Structure

```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = methodName(input);

      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Documentation

### Code Documentation

- Add JSDoc comments for public APIs
- Document complex algorithms
- Explain non-obvious decisions
- Keep comments up-to-date

### User Documentation

When adding features, update:
- README.md - Feature overview
- INSTALL.md - Installation steps (if changed)
- CHANGELOG.md - Add entry under "Unreleased"

## Git Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions/updates

### Commit Messages

**Format:**
```
type(scope): subject

body

footer
```

**Example:**
```
feat(navigation): add hierarchical menu support

Implement support for multi-level navigation menus with
drag-and-drop reordering.

Closes #123
```

### Pull Request Process

1. **PR Title**: Follow commit message format
2. **Description**: Explain changes and rationale
3. **Link Issues**: Reference related issues
4. **Screenshots**: Include for UI changes
5. **Tests**: Ensure all tests pass
6. **Review**: Address review comments promptly

## Pre-commit Hooks

This project uses Husky for pre-commit hooks:

- **Lint-staged**: Auto-formats and lints staged files
- **Type check**: Verifies TypeScript types
- **Tests**: Runs relevant tests (pre-push)

If hooks fail:
```bash
# Fix linting issues
npm run lint:fix

# Fix formatting
npm run format

# Run tests
npm test
```

## CI/CD

GitHub Actions runs on all PRs:

- **Lint**: Code style checks
- **Type Check**: TypeScript validation
- **Tests**: Full test suite with coverage
- **Build**: Compilation and build verification

All checks must pass before merging.

## Release Process

Releases are managed by maintainers:

1. Update version in package.json
2. Update CHANGELOG.md
3. Create git tag: `git tag -a v1.0.0 -m "Release v1.0.0"`
4. Push tag: `git push origin v1.0.0`
5. GitHub Actions creates release automatically

## Questions?

- **Issues**: https://github.com/wpengine/ai-site-builder/issues
- **Discussions**: https://github.com/wpengine/ai-site-builder/discussions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to AI Site Builder! 🎉
