#!/usr/bin/env node
/**
 * Removes the addon symlink from Local's addons directory
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const addonName = '@local/ai-site-builder';

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

// Remove symlink if it exists
if (fs.existsSync(symlinkPath)) {
  fs.unlinkSync(symlinkPath);
  console.log('✓ Addon uninstalled successfully!');
  console.log('Removed symlink:', symlinkPath);
  console.log('\nRestart Local to complete removal.');
} else {
  console.log('Addon not installed.');
}
