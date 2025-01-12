# Contributing Guidelines

Thank you for considering contributing to our chat application! This document outlines the process and guidelines for contributing.

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) to foster an inclusive and respectful community.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone <your-fork-url>`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Install dependencies: `npm install`
5. Start the development environment: `docker-compose up -d`

## Development Process

### 1. Code Style

- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write meaningful commit messages
- Include JSDoc comments for public APIs
- Follow the existing code structure

### 2. Testing

All new features should include:
- Unit tests using Jest
- Integration tests where applicable
- E2E tests for critical user flows
- Accessibility tests

```bash
# Run all tests
npm test

# Run specific test file
npm test path/to/test

# Run tests in watch mode
npm test -- --watch
```

### 3. Documentation

Update documentation when you:
- Add new features
- Change existing functionality
- Fix bugs that affect user behavior
- Add new dependencies

### 4. Pull Request Process

1. Update the README.md with details of changes if needed
2. Update the documentation with any new dependencies or features
3. Ensure all tests pass and add new ones if needed
4. Link any related issues in your PR description
5. Request review from maintainers

### 5. Commit Guidelines

Follow conventional commits specification:
```
type(scope): description

[optional body]

[optional footer]
```

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation changes
- style: Code style changes (formatting, etc)
- refactor: Code refactoring
- test: Adding tests
- chore: Maintenance tasks

### 6. Branch Strategy

- main: Production-ready code
- develop: Development branch
- feature/*: New features
- fix/*: Bug fixes
- docs/*: Documentation updates

### 7. Code Review Process

All submissions require review:
1. Create a Pull Request
2. Address review feedback
3. Maintain thread of discussion
4. Update code as needed
5. Get approval from maintainers

### 8. Development Environment

Required tools:
- Node.js v18+
- Docker & Docker Compose
- pnpm
- Git

### 9. Performance Guidelines

- Follow performance best practices
- Use React profiler for component optimization
- Consider bundle size impact
- Implement lazy loading where appropriate
- Use proper caching strategies

### 10. Security Guidelines

- Never commit sensitive data
- Use environment variables for secrets
- Follow security best practices
- Implement proper input validation
- Use prepared statements for SQL

## Getting Help

- Join our Discord community
- Check existing issues and discussions
- Read the documentation
- Contact maintainers

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in documentation

Thank you for contributing! 