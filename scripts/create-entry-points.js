#!/usr/bin/env node
/**
 * Creates wrapper entry point files for main and renderer processes.
 * These files export the default export from the compiled index files.
 */

const fs = require('fs');
const path = require('path');

const libDir = path.join(__dirname, '..', 'lib');

// Create main.js entry point
const mainContent = `module.exports = require('./main/index').default;
`;
fs.writeFileSync(path.join(libDir, 'main.js'), mainContent);
console.log('✓ Created lib/main.js');

// Create renderer.js entry point
const rendererContent = `module.exports = require('./renderer/index').default;
`;
fs.writeFileSync(path.join(libDir, 'renderer.js'), rendererContent);
console.log('✓ Created lib/renderer.js');

console.log('✓ Entry points created successfully');
