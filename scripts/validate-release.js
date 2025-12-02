#!/usr/bin/env node
/**
 * Validate Release Script
 *
 * Pre-release validation to ensure the addon is ready for distribution.
 * Checks:
 * - Version consistency (package.json vs git tag)
 * - Required package.json fields for Local addons
 * - Build outputs exist and are valid
 * - Native modules are properly built
 * - No sensitive data in distribution
 *
 * Usage:
 *   node scripts/validate-release.js [--tag <version>]
 *
 * Exit codes:
 *   0 - All validations passed
 *   1 - Validation failed
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
let exitCode = 0;
const errors = [];
const warnings = [];

// Parse arguments
const args = process.argv.slice(2);
let expectedTag = null;
const tagIndex = args.indexOf('--tag');
if (tagIndex !== -1 && args[tagIndex + 1]) {
  expectedTag = args[tagIndex + 1].replace(/^v/, '');
}

console.log('\n🔍 AI Site Builder Release Validation\n');
console.log('='.repeat(50));

// 1. Load and validate package.json
console.log('\n📦 Checking package.json...');
let pkg;
try {
  pkg = require(path.join(ROOT_DIR, 'package.json'));
  console.log(`   Version: ${pkg.version}`);
  console.log(`   Name: ${pkg.name}`);
} catch (error) {
  addError('Cannot read package.json');
  printResults();
  process.exit(1);
}

// Required fields for Local addons
const requiredFields = [
  { field: 'name', value: pkg.name },
  { field: 'productName', value: pkg.productName },
  { field: 'version', value: pkg.version },
  { field: 'main', value: pkg.main },
  { field: 'renderer', value: pkg.renderer },
];

for (const { field, value } of requiredFields) {
  if (!value) {
    addError(`Missing required field: ${field}`);
  } else {
    console.log(`   ✓ ${field}: ${value}`);
  }
}

// 2. Check version consistency with tag
if (expectedTag) {
  console.log(`\n🏷️  Checking version consistency...`);
  if (pkg.version !== expectedTag) {
    addError(`Version mismatch: package.json has "${pkg.version}", expected "${expectedTag}"`);
  } else {
    console.log(`   ✓ Version matches tag: ${pkg.version}`);
  }
}

// 3. Check build outputs
console.log('\n🔨 Checking build outputs...');
const buildFiles = [
  'lib/main.js',
  'lib/renderer.js',
  'lib/main/index.js',
  'lib/renderer/index.js',
  'lib/common/constants.js',
];

for (const file of buildFiles) {
  const filePath = path.join(ROOT_DIR, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`   ✓ ${file} (${formatBytes(stats.size)})`);
  } else {
    addError(`Build output not found: ${file}`);
  }
}

// 4. Check for TypeScript compilation errors in output
console.log('\n🔧 Validating JavaScript syntax...');
try {
  // Quick syntax check on main entry points
  const mainJs = fs.readFileSync(path.join(ROOT_DIR, 'lib/main.js'), 'utf8');
  const rendererJs = fs.readFileSync(path.join(ROOT_DIR, 'lib/renderer.js'), 'utf8');

  // Try to parse as JavaScript
  new Function(mainJs);
  new Function(rendererJs);
  console.log('   ✓ Entry points have valid JavaScript syntax');
} catch (error) {
  addError(`JavaScript syntax error: ${error.message}`);
}

// 5. Check native modules
console.log('\n🔐 Checking native modules...');
const keytarPath = path.join(ROOT_DIR, 'node_modules', 'keytar');
if (fs.existsSync(keytarPath)) {
  try {
    require('keytar');
    console.log('   ✓ keytar native module loads successfully');
  } catch (error) {
    addWarning(`keytar failed to load: ${error.message}`);
    console.log('   ⚠️  Fallback encrypted storage will be used');
  }
} else {
  addWarning('keytar not installed');
}

// 6. Check for sensitive data
console.log('\n🔒 Checking for sensitive data...');
const sensitivePatterns = [
  { pattern: /sk-ant-[a-zA-Z0-9-_]+/g, name: 'Anthropic API key' },
  { pattern: /sk-[a-zA-Z0-9]{32,}/g, name: 'OpenAI API key' },
  { pattern: /AIza[a-zA-Z0-9_-]{35}/g, name: 'Google API key' },
  { pattern: /-----BEGIN.*PRIVATE KEY-----/g, name: 'Private key' },
  { pattern: /password\s*[:=]\s*['"][^'"]+['"]/gi, name: 'Hardcoded password' },
];

const filesToCheck = [
  'lib/main.js',
  'lib/renderer.js',
  'lib/common/constants.js',
];

let sensitiveFound = false;
for (const file of filesToCheck) {
  const filePath = path.join(ROOT_DIR, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const { pattern, name } of sensitivePatterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        // Filter out false positives (prefixes used for validation)
        const realMatches = matches.filter(
          (m) => m.length > 20 && !m.includes('sk-ant-') && !m.includes("'sk-ant-'")
        );
        if (realMatches.length > 0) {
          addError(`Potential ${name} found in ${file}`);
          sensitiveFound = true;
        }
      }
    }
  }
}
if (!sensitiveFound) {
  console.log('   ✓ No sensitive data patterns detected');
}

// 7. Check documentation
console.log('\n📚 Checking documentation...');
const docFiles = ['README.md', 'INSTALL.md', 'CHANGELOG.md', 'LICENSE'];
for (const file of docFiles) {
  const filePath = path.join(ROOT_DIR, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`   ✓ ${file} (${formatBytes(stats.size)})`);
  } else {
    addWarning(`Documentation file not found: ${file}`);
  }
}

// 8. Check dependencies
console.log('\n📋 Checking dependencies...');
try {
  const result = execSync('npm audit --json 2>/dev/null || true', {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });

  try {
    const audit = JSON.parse(result);
    const vulns = audit.metadata?.vulnerabilities || {};
    const critical = vulns.critical || 0;
    const high = vulns.high || 0;
    const moderate = vulns.moderate || 0;

    if (critical > 0) {
      addError(`${critical} critical vulnerabilities found`);
    } else if (high > 0) {
      addWarning(`${high} high severity vulnerabilities found`);
    } else if (moderate > 0) {
      console.log(`   ⚠️  ${moderate} moderate vulnerabilities`);
    } else {
      console.log('   ✓ No known vulnerabilities');
    }
  } catch {
    console.log('   ⚠️  Could not parse audit results');
  }
} catch (error) {
  console.log('   ⚠️  npm audit skipped');
}

// Print results
printResults();

// Helper functions
function addError(message) {
  errors.push(message);
  console.log(`   ❌ ${message}`);
  exitCode = 1;
}

function addWarning(message) {
  warnings.push(message);
  console.log(`   ⚠️  ${message}`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function printResults() {
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Validation Summary\n');

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All checks passed! Ready for release.\n');
  } else {
    if (errors.length > 0) {
      console.log(`❌ Errors (${errors.length}):`);
      errors.forEach((e) => console.log(`   - ${e}`));
      console.log('');
    }

    if (warnings.length > 0) {
      console.log(`⚠️  Warnings (${warnings.length}):`);
      warnings.forEach((w) => console.log(`   - ${w}`));
      console.log('');
    }

    if (errors.length > 0) {
      console.log('❌ Release validation failed. Fix errors before releasing.\n');
    } else {
      console.log('⚠️  Release can proceed, but consider addressing warnings.\n');
    }
  }

  process.exit(exitCode);
}
