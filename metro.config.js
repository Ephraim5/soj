// Custom Metro configuration to speed up and unstick bundler by excluding huge / unused folders.
// Large folders (v10, backend, legacy project folders) were causing the watcher to hang on Windows.
// We block them so Metro doesn't traverse them.

const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');

const config = getDefaultConfig(__dirname);

// Add directories that should NOT be watched / bundled.
config.resolver.blockList = exclusionList([
  /\\soj-backend-final-v2\\.*/,
  /\\BigTrash\\.*/,
  /\\leadtrash\\.*/,
  /\\llllll\\.*/,
  /\\v10\\.*/,
]);

// (Optional) Lower worker count on some Windows environments to reduce stalls.
config.maxWorkers = 2;

// If you later actually need assets from any excluded folder, remove it from the list.
module.exports = config;
