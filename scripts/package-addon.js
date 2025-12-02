#!/usr/bin/env node
/**
 * Package Addon Script
 *
 * Creates a platform-specific addon package for distribution.
 * This script:
 * - Copies compiled lib/ directory
 * - Copies production node_modules (pruned)
 * - Includes documentation files
 * - Creates a zip archive
 *
 * Usage:
 *   node scripts/package-addon.js [version] [platform] [arch]
 *
 * Example:
 *   node scripts/package-addon.js 0.1.0 darwin x64
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const REQUIRED_FILES = ['package.json', 'lib/main.js', 'lib/renderer.js'];

const OPTIONAL_FILES = ['README.md', 'INSTALL.md', 'LICENSE', 'CHANGELOG.md'];

const PRODUCTION_DEPS = [
  '@anthropic-ai/sdk',
  '@google/generative-ai',
  'axios',
  'google-auth-library',
  'keytar',
  'openai',
  'zod',
];

// Parse arguments
const args = process.argv.slice(2);
const version = args[0] || require('../package.json').version;
const platform = args[1] || process.platform;
const arch = args[2] || process.arch;

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const OUTPUT_NAME = `ai-site-builder-v${version}-${platform}-${arch}`;
const OUTPUT_ZIP = `${OUTPUT_NAME}.zip`;

console.log(`\n📦 Packaging AI Site Builder addon`);
console.log(`   Version: ${version}`);
console.log(`   Platform: ${platform}`);
console.log(`   Architecture: ${arch}`);
console.log(`   Output: ${OUTPUT_ZIP}\n`);

// Validate required files exist
console.log('🔍 Validating required files...');
for (const file of REQUIRED_FILES) {
  const filePath = path.join(ROOT_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Required file not found: ${file}`);
    console.error('   Run "npm run build" first.');
    process.exit(1);
  }
}
console.log('   ✓ All required files present\n');

// Clean and create dist directory
console.log('🗑️  Cleaning dist directory...');
if (fs.existsSync(DIST_DIR)) {
  fs.rmSync(DIST_DIR, { recursive: true });
}
fs.mkdirSync(DIST_DIR, { recursive: true });
console.log('   ✓ Dist directory ready\n');

// Copy lib directory
console.log('📁 Copying compiled code (lib/)...');
const libSrc = path.join(ROOT_DIR, 'lib');
const libDest = path.join(DIST_DIR, 'lib');
copyDir(libSrc, libDest);
console.log('   ✓ lib/ copied\n');

// Copy node_modules
console.log('📁 Copying node_modules...');
const nodeModulesSrc = path.join(ROOT_DIR, 'node_modules');
const nodeModulesDest = path.join(DIST_DIR, 'node_modules');
copyDir(nodeModulesSrc, nodeModulesDest);
console.log('   ✓ node_modules/ copied\n');

// Prune dev dependencies
console.log('🧹 Pruning dev dependencies...');
try {
  execSync('npm prune --production --ignore-scripts', {
    cwd: DIST_DIR,
    stdio: 'pipe',
  });
  console.log('   ✓ Dev dependencies removed\n');
} catch (error) {
  console.log('   ⚠️  npm prune completed with warnings\n');
}

// Copy package.json
console.log('📄 Copying package.json...');
fs.copyFileSync(path.join(ROOT_DIR, 'package.json'), path.join(DIST_DIR, 'package.json'));
console.log('   ✓ package.json copied\n');

// Copy optional files
console.log('📄 Copying documentation files...');
for (const file of OPTIONAL_FILES) {
  const src = path.join(ROOT_DIR, file);
  const dest = path.join(DIST_DIR, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`   ✓ ${file}`);
  } else {
    console.log(`   - ${file} (not found, skipping)`);
  }
}
console.log('');

// Verify keytar
console.log('🔐 Verifying keytar native module...');
const keytarPath = path.join(DIST_DIR, 'node_modules', 'keytar');
if (fs.existsSync(keytarPath)) {
  const bindingPath = path.join(keytarPath, 'build', 'Release');
  if (fs.existsSync(bindingPath)) {
    const bindings = fs.readdirSync(bindingPath);
    console.log(`   ✓ Native binding found: ${bindings.join(', ')}`);
  } else {
    console.log('   ⚠️  Native binding not found - fallback storage will be used');
  }
} else {
  console.log('   ⚠️  Keytar not found - fallback storage will be used');
}
console.log('');

// Calculate sizes
console.log('📊 Package statistics:');
const libSize = getDirSize(libDest);
const modulesSize = getDirSize(nodeModulesDest);
const totalSize = getDirSize(DIST_DIR);
console.log(`   lib/: ${formatBytes(libSize)}`);
console.log(`   node_modules/: ${formatBytes(modulesSize)}`);
console.log(`   Total: ${formatBytes(totalSize)}`);
console.log('');

// Create zip archive
console.log('📦 Creating zip archive...');
const zipPath = path.join(ROOT_DIR, OUTPUT_ZIP);
try {
  if (process.platform === 'win32') {
    // PowerShell on Windows
    execSync(`powershell Compress-Archive -Path "${DIST_DIR}/*" -DestinationPath "${zipPath}" -Force`, {
      stdio: 'pipe',
    });
  } else {
    // zip on Unix
    execSync(`cd "${DIST_DIR}" && zip -r "${zipPath}" .`, {
      stdio: 'pipe',
    });
  }

  const zipSize = fs.statSync(zipPath).size;
  console.log(`   ✓ Created ${OUTPUT_ZIP} (${formatBytes(zipSize)})`);
} catch (error) {
  console.error(`   ❌ Failed to create zip: ${error.message}`);
  process.exit(1);
}

console.log(`\n✅ Package created successfully!`);
console.log(`   Location: ${zipPath}\n`);

// Helper functions
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function getDirSize(dir) {
  let size = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      size += getDirSize(entryPath);
    } else {
      size += fs.statSync(entryPath).size;
    }
  }

  return size;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
