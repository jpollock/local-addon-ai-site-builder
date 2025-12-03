# AI Site Builder

[![CI](https://github.com/jpollock/ai-site-builder/actions/workflows/ci.yml/badge.svg)](https://github.com/jpollock/ai-site-builder/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-green.svg)](package.json)

AI-powered WordPress site scaffolding addon for [Local by WP Engine](https://localwp.com/). Streamline your WordPress development workflow with intelligent site planning and structure generation.

## Features

- **Multi-AI Provider Support** - Choose between Claude (Anthropic), GPT-4 (OpenAI), or Gemini (Google)
- **Intelligent Site Planning** - AI-powered content strategy and structure recommendations
- **Navigation Generator** - Automatically generate optimal site navigation hierarchies
- **Design System Configuration** - Define colors, typography, and spacing tokens
- **SEO Planning** - Built-in SEO strategy and metadata planning
- **Responsive Layouts** - Configure breakpoints and mobile-first designs
- **Local Integration** - Seamlessly integrates with Local's workflow
- **Secure API Storage** - API keys stored securely using system keychain

## Requirements

- **Local by WP Engine** v6.0.0 or higher
- **Node.js** v18.0.0 or higher
- **Operating System**: macOS, Windows, or Linux

## Installation

See [INSTALL.md](INSTALL.md) for detailed installation instructions.

### Quick Install

1. Download the correct package for your operating system from the [Releases page](https://github.com/jpollock/ai-site-builder/releases):

   | Platform              | File                                      |
   | --------------------- | ----------------------------------------- |
   | macOS (Intel)         | `ai-site-builder-vX.X.X-darwin-x64.zip`   |
   | macOS (Apple Silicon) | `ai-site-builder-vX.X.X-darwin-arm64.zip` |
   | Windows               | `ai-site-builder-vX.X.X-win32-x64.zip`    |
   | Linux                 | `ai-site-builder-vX.X.X-linux-x64.zip`    |

2. Extract the zip archive
3. Copy the extracted folder to Local's addons directory:
   - **macOS**: `~/Library/Application Support/Local/addons/ai-site-builder`
   - **Windows**: `%APPDATA%\Local\addons\ai-site-builder`
   - **Linux**: `~/.config/Local/addons/ai-site-builder`
4. Restart Local

## Configuration

### API Keys

The addon requires an API key from at least one AI provider:

- **Claude (Anthropic)**: [Get API key](https://console.anthropic.com/)
- **OpenAI (GPT-4)**: [Get API key](https://platform.openai.com/api-keys)
- **Google (Gemini)**: [Get API key](https://makersuite.google.com/app/apikey)

API keys are stored securely in your system's keychain and never exposed in logs or files.

### Setting Up API Keys

1. Open Local by WP Engine
2. Navigate to the AI Site Builder addon
3. Click on Settings
4. Enter your API key(s)
5. Select your preferred AI provider

## Usage

### Creating a New Site Plan

1. Create or select a WordPress site in Local
2. Open the AI Site Builder addon
3. Fill in the **Site Information** form:
   - Site name
   - Description
   - Target audience
   - Industry/category
4. Review and customize the generated:
   - Navigation structure
   - Content strategy
   - Design system
   - SEO plan
5. Export the plan or apply it to your site

### Workflow Steps

The addon guides you through a comprehensive site planning process:

1. **Site Information** - Define your site's purpose and audience
2. **Navigation** - Generate and customize site structure
3. **Content Strategy** - Plan page content and hierarchy
4. **Design System** - Configure visual design tokens
5. **SEO Planning** - Define metadata and optimization strategy
6. **Export/Apply** - Save or implement your plan

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/jpollock/ai-site-builder.git
cd ai-site-builder

# Install dependencies
npm install

# Build the addon
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Available Scripts

- `npm run build` - Build production version
- `npm run build:dev` - Build development version
- `npm run watch` - Watch mode for development
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Lint code
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

### Project Structure

```
ai-site-builder/
├── src/
│   ├── main/           # Main process code
│   ├── renderer/       # Renderer process code
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Shared utilities
├── tests/              # Test files
├── scripts/            # Build and utility scripts
├── lib/                # Compiled output (generated)
└── package.json
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

Coverage threshold is set to 80% for branches, functions, lines, and statements.

### Code Quality

This project uses:

- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript** for type safety
- **Husky** for pre-commit hooks
- **lint-staged** for staged file checking

Pre-commit hooks automatically run linting and formatting on staged files.

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`npm test && npm run lint`)
5. Commit your changes (follow [Conventional Commits](https://www.conventionalcommits.org/))
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Test additions or modifications
- `chore:` - Build process or auxiliary tool changes
- `ci:` - CI/CD changes

## Versioning

This project uses [Semantic Versioning](https://semver.org/):

- **MAJOR** version for incompatible API changes
- **MINOR** version for backwards-compatible functionality additions
- **PATCH** version for backwards-compatible bug fixes

Version bump scripts:

```bash
npm run version:patch  # 0.1.0 -> 0.1.1
npm run version:minor  # 0.1.0 -> 0.2.0
npm run version:major  # 0.1.0 -> 1.0.0
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed list of changes.

## Roadmap

- [ ] WordPress theme generation from design system
- [ ] Block pattern library integration
- [ ] Multi-language support
- [ ] Advanced SEO automation
- [ ] Custom post type generation
- [ ] Plugin recommendations based on features
- [ ] WooCommerce integration
- [ ] Migration from existing sites

## Security

- API keys are stored using the system's secure keychain (via keytar)
- Keys are never logged or exposed in error messages
- All AI provider communications use HTTPS
- No user data is transmitted except to chosen AI provider

### Reporting Security Issues

Please report security vulnerabilities to security@jpollock.com. Do not open public issues for security concerns.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: [INSTALL.md](INSTALL.md)
- **Issues**: [GitHub Issues](https://github.com/jpollock/ai-site-builder/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jpollock/ai-site-builder/discussions)

## Acknowledgments

- Built for [Local by WP Engine](https://localwp.com/) by WP Engine
- Powered by AI models from Anthropic, OpenAI, and Google
- Inspired by the WordPress community

## Author

**WP Engine**

---

Made with ❤️ for the WordPress community
