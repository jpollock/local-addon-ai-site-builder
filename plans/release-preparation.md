# Release Preparation Plan

## Overview

This plan prepares the AI Site Builder addon for public release, focusing on:

1. README and documentation updates
2. User and developer documentation
3. CI/CD enhancements for multi-platform builds
4. Build process for Local-compatible zip artifacts with OS-specific native modules

## Current State Assessment

### What Already Exists

- **CI/CD**: Comprehensive GitHub Actions workflows (`ci.yml`, `release.yml`)
- **Documentation**: README.md, INSTALL.md, CHANGELOG.md, CONTRIBUTING.md
- **Build System**: TypeScript compilation to CommonJS in `lib/`
- **Testing**: Jest with 80% coverage thresholds
- **Security**: All audit checks pass (0 vulnerabilities)

### Key Gap: Native Module Compilation

The addon uses `keytar` for secure credential storage, which requires OS-specific native compilation. Current release workflow only builds on Ubuntu and packages a single artifact.

## Implementation Plan

### Phase 1: Multi-Platform Build Matrix

**Objective**: Build separate artifacts for each supported OS

**Files to modify**: `.github/workflows/release.yml`

**Changes**:

1. Add build matrix for platforms:

```yaml
strategy:
  matrix:
    include:
      - os: macos-latest
        platform: darwin
        arch: x64
      - os: macos-latest
        platform: darwin
        arch: arm64
      - os: windows-latest
        platform: win32
        arch: x64
      - os: ubuntu-latest
        platform: linux
        arch: x64
```

2. Update artifact naming to include platform:
   - `ai-site-builder-v{VERSION}-darwin-x64.zip`
   - `ai-site-builder-v{VERSION}-darwin-arm64.zip`
   - `ai-site-builder-v{VERSION}-win32-x64.zip`
   - `ai-site-builder-v{VERSION}-linux-x64.zip`

3. Install native dependencies per-platform:

```yaml
- name: Install dependencies with native modules
  run: npm ci
  env:
    npm_config_target_arch: ${{ matrix.arch }}
```

4. Create platform-specific zip artifacts:

```yaml
- name: Create distribution package
  run: |
    mkdir -p dist
    cp -r lib node_modules package.json README.md INSTALL.md LICENSE dist/
    # Include only production dependencies
    cd dist && npm prune --production
    zip -r ../ai-site-builder-v${{ VERSION }}-${{ matrix.platform }}-${{ matrix.arch }}.zip *
```

### Phase 2: Artifact Contents Specification

**Files included in release zip**:

```
ai-site-builder-v{VERSION}-{platform}-{arch}.zip
├── package.json          # With name, productName, main, renderer fields
├── lib/
│   ├── main.js          # Main process entry point
│   ├── renderer.js      # Renderer process entry point
│   ├── main/            # Compiled main process code
│   ├── renderer/        # Compiled renderer components
│   └── common/          # Shared types and constants
├── node_modules/        # Production dependencies only (pruned)
│   ├── @anthropic-ai/sdk/
│   ├── @google/generative-ai/
│   ├── axios/
│   ├── google-auth-library/
│   ├── keytar/          # Platform-specific native binary
│   ├── openai/
│   └── zod/
├── README.md
├── INSTALL.md
└── LICENSE
```

**Critical**: The `keytar` native module MUST be compiled on the target platform.

### Phase 3: Documentation Updates

#### 3.1 README.md Updates

1. Add platform-specific download links section
2. Update installation instructions with platform selection
3. Add troubleshooting section for native module issues
4. Add version compatibility matrix

#### 3.2 INSTALL.md Updates

1. Platform-specific installation steps
2. Verification steps after installation
3. Common issues and solutions
4. Upgrade instructions

#### 3.3 New Documentation Files

**docs/USER_GUIDE.md** - End-user documentation:

- Getting started walkthrough
- API key setup for each provider
- Site building workflow with screenshots
- Tips and best practices

**docs/DEVELOPER_GUIDE.md** - Developer documentation:

- Architecture overview (main/renderer processes)
- Setting up development environment
- Testing strategy
- Contributing guidelines (expanded from CONTRIBUTING.md)

### Phase 4: CI/CD Enhancements

#### 4.1 Pre-release Validation

Add workflow steps before release:

```yaml
validate-release:
  runs-on: ubuntu-latest
  steps:
    - name: Check version consistency
      run: |
        # Verify package.json version matches tag
        PKG_VERSION=$(node -p "require('./package.json').version")
        TAG_VERSION=${GITHUB_REF#refs/tags/v}
        if [ "$PKG_VERSION" != "$TAG_VERSION" ]; then
          echo "Version mismatch: package.json=$PKG_VERSION, tag=$TAG_VERSION"
          exit 1
        fi

    - name: Validate package.json fields
      run: |
        # Ensure required Local addon fields exist
        node -e "
          const pkg = require('./package.json');
          if (!pkg.productName) throw new Error('Missing productName');
          if (!pkg.main) throw new Error('Missing main');
          if (!pkg.renderer) throw new Error('Missing renderer');
        "
```

#### 4.2 Release Notes Enhancement

Auto-generate changelog categories:

```yaml
- name: Generate categorized release notes
  run: |
    # Parse commits and categorize by conventional commits prefix
    git log ${PREVIOUS_TAG}..HEAD --pretty=format:"%s" | while read line; do
      case "$line" in
        feat:*) echo "$line" >> /tmp/features.txt ;;
        fix:*) echo "$line" >> /tmp/fixes.txt ;;
        docs:*) echo "$line" >> /tmp/docs.txt ;;
        *) echo "$line" >> /tmp/other.txt ;;
      esac
    done
```

#### 4.3 Smoke Test After Build

```yaml
- name: Verify addon structure
  run: |
    # Check required files exist
    test -f dist/package.json
    test -f dist/lib/main.js
    test -f dist/lib/renderer.js

    # Verify package.json fields
    node -e "
      const pkg = require('./dist/package.json');
      console.log('productName:', pkg.productName);
      console.log('main:', pkg.main);
      console.log('renderer:', pkg.renderer);
    "

    # Check keytar native module
    ls -la dist/node_modules/keytar/build/Release/
```

### Phase 5: Build Scripts

**New script**: `scripts/package-addon.js`

```javascript
// Creates platform-specific addon package
// - Copies lib/, production node_modules, docs
// - Removes devDependencies
// - Creates zip archive
// - Validates structure

const REQUIRED_FILES = ['package.json', 'lib/main.js', 'lib/renderer.js'];

const PRODUCTION_DEPS = [
  '@anthropic-ai/sdk',
  '@google/generative-ai',
  'axios',
  'google-auth-library',
  'keytar',
  'openai',
  'zod',
];
```

**New script**: `scripts/validate-release.js`

```javascript
// Pre-release validation
// - Checks version consistency
// - Validates package.json structure
// - Verifies native modules are built
// - Runs smoke tests on compiled output
```

### Phase 6: Testing Enhancements

#### 6.1 Release Artifact Tests

Add test job that:

1. Downloads built artifact
2. Extracts to temp directory
3. Verifies file structure
4. Attempts to require main.js and renderer.js
5. Validates keytar can load

#### 6.2 Cross-Platform Test Matrix

Run tests on all platforms in CI:

```yaml
test:
  strategy:
    matrix:
      os: [ubuntu-latest, macos-latest, windows-latest]
  runs-on: ${{ matrix.os }}
```

## Implementation Checklist

### Phase 1: Multi-Platform Builds

- [ ] Update release.yml with build matrix
- [ ] Add platform-specific artifact names
- [ ] Test native module compilation on each OS
- [ ] Verify keytar works on each platform

### Phase 2: Artifact Structure

- [ ] Create package-addon.js script
- [ ] Define production dependency list
- [ ] Implement npm prune step
- [ ] Add structure validation

### Phase 3: Documentation

- [ ] Update README.md with platform downloads
- [ ] Enhance INSTALL.md with platform steps
- [ ] Create docs/USER_GUIDE.md
- [ ] Create docs/DEVELOPER_GUIDE.md

### Phase 4: CI/CD

- [ ] Add pre-release validation job
- [ ] Enhance release notes generation
- [ ] Add post-build smoke tests
- [ ] Add version consistency checks

### Phase 5: Build Scripts

- [ ] Create scripts/package-addon.js
- [ ] Create scripts/validate-release.js
- [ ] Update npm scripts in package.json

### Phase 6: Testing

- [ ] Add artifact validation tests
- [ ] Expand CI matrix to all platforms
- [ ] Add integration test for addon loading

## Risk Mitigation

### Native Module Compilation Failures

- **Risk**: keytar fails to compile on certain platforms
- **Mitigation**:
  - Add fallback to encrypted file storage (already implemented)
  - Document manual keytar installation if prebuild unavailable
  - Consider using keytar prebuilds where available

### Large Artifact Size

- **Risk**: node_modules makes zip too large
- **Mitigation**:
  - Use npm prune --production
  - Consider bundling with webpack/esbuild
  - Exclude unnecessary files (.md, .map, tests)

### Platform-Specific Issues

- **Risk**: Addon works on one platform but fails on another
- **Mitigation**:
  - Cross-platform CI tests
  - Beta testing period on all platforms
  - Clear platform requirements in docs

## Success Criteria

1. Release workflow produces 4 platform-specific zip artifacts
2. Each artifact can be installed in Local without errors
3. Keytar-based secure storage works on each platform
4. Documentation clearly guides users through installation
5. CI validates releases before publishing

## Estimated Effort

| Phase                          | Estimated Time  |
| ------------------------------ | --------------- |
| Phase 1: Multi-Platform Builds | 4-6 hours       |
| Phase 2: Artifact Structure    | 2-3 hours       |
| Phase 3: Documentation         | 4-6 hours       |
| Phase 4: CI/CD Enhancements    | 2-3 hours       |
| Phase 5: Build Scripts         | 2-3 hours       |
| Phase 6: Testing               | 3-4 hours       |
| **Total**                      | **17-25 hours** |

## Next Steps

1. Review and approve this plan
2. Start with Phase 1 (most critical - native module handling)
3. Iterate through remaining phases
4. Perform beta testing on all platforms
5. Tag first official release
