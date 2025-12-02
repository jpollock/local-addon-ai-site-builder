#!/usr/bin/env node
/**
 * Symlinks this addon into Local's addons directory
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const addonName = '@local/ai-site-builder';
const addonDir = path.join(__dirname, '..');

// Determine Local addons directory based on platform
let localAddonsDir;
switch (os.platform()) {
  case 'darwin':
    localAddonsDir = path.join(os.homedir(), 'Library', 'Application Support', 'Local', 'addons');
    break;
  case 'win32':
    localAddonsDir = path.join(os.homedir(), 'AppData', 'Roaming', 'Local', 'addons');
    break;
  case 'linux':
    localAddonsDir = path.join(os.homedir(), '.config', 'Local', 'addons');
    break;
  default:
    console.error('Unsupported platform:', os.platform());
    process.exit(1);
}

const symlinkPath = path.join(localAddonsDir, addonName);

// Create addons directory if it doesn't exist
if (!fs.existsSync(localAddonsDir)) {
  fs.mkdirSync(localAddonsDir, { recursive: true });
  console.log('Created addons directory:', localAddonsDir);
}

// Remove existing symlink if present
if (fs.existsSync(symlinkPath)) {
  fs.unlinkSync(symlinkPath);
  console.log('Removed existing symlink');
}

// Create symlink
fs.symlinkSync(addonDir, symlinkPath, 'dir');
console.log('✓ Addon installed successfully!');
console.log('Symlink created:', symlinkPath);
console.log('\nRestart Local to load the addon.');
