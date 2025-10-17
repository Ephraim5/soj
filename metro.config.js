// Custom Metro configuration to exclude large/unused folders from the bundler.
// Use the public API for exclusionList to avoid importing Metro internals (works with pnpm and on EAS).

const { getDefaultConfig } = require('expo/metro-config');

// Cross-version helper: prefer metro's exclusionList if available, otherwise combine regexes.
function makeBlockList(patterns) {
  try {
    // Newer Metro may export exclusionList from the top-level package
    const metro = require('metro-config');
    if (metro && typeof metro.exclusionList === 'function') {
      return metro.exclusionList(patterns);
    }
  } catch {}
  try {
    // Older Metro exposes it under src/defaults/exclusionList
    const exclusionList = require('metro-config/src/defaults/exclusionList');
    if (typeof exclusionList === 'function') {
      return exclusionList(patterns);
    }
  } catch {}
  // Fallback: merge multiple regex sources into one big alternation
  const source = patterns.map((r) => r.source).join('|');
  return new RegExp(source);
}

const config = getDefaultConfig(__dirname);

// Cross-platform folder separators: match both \\ and /
const SEP = String.raw`[/\\]`;

// Add directories that should NOT be watched / bundled.
config.resolver.blockList = makeBlockList([
  new RegExp(`${SEP}soj-backend-final-v2${SEP}.*`),
  new RegExp(`${SEP}BigTrash${SEP}.*`),
  new RegExp(`${SEP}leadtrash${SEP}.*`),
  new RegExp(`${SEP}llllll${SEP}.*`),
  new RegExp(`${SEP}v10${SEP}.*`),
]);

// (Optional) Lower worker count on some environments to reduce stalls.
config.maxWorkers = 2;

module.exports = config;
