// Custom Metro configuration to exclude large/unused folders from the bundler.
// Use the public API for exclusionList to avoid importing Metro internals (works with pnpm and on EAS).

const { getDefaultConfig } = require('expo/metro-config');
const { exclusionList } = require('metro-config');

const config = getDefaultConfig(__dirname);

// Cross-platform folder separators: match both \\ and /
const SEP = String.raw`[/\\\\]`;

// Add directories that should NOT be watched / bundled.
config.resolver.blockList = exclusionList([
  new RegExp(`${SEP}soj-backend-final-v2${SEP}.*`),
  new RegExp(`${SEP}BigTrash${SEP}.*`),
  new RegExp(`${SEP}leadtrash${SEP}.*`),
  new RegExp(`${SEP}llllll${SEP}.*`),
  new RegExp(`${SEP}v10${SEP}.*`),
]);

// (Optional) Lower worker count on some environments to reduce stalls.
config.maxWorkers = 2;

module.exports = config;
