module.exports = function (api) {
  api.cache(true);

  let moduleResolver;
  try {
    // Try to load babel-plugin-module-resolver safely
    moduleResolver = require.resolve('babel-plugin-module-resolver');
  } catch (e) {
    console.warn(
      '⚠️ Warning: babel-plugin-module-resolver not found. Aliases will be disabled for this build.'
    );
  }

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Only apply module-resolver if it exists
      moduleResolver && [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
          alias: {
            '@components': './src/screens/main/UnitLeader/components',
            '@theme': './src/screens/main/UnitLeader/theme',
            '@sales': './src/screens/main/UnitLeader/sales',
            '@screens': './src/screens',
            '@utils': './src/utils',
            '@api': './src/api',
          },
        },
      ],
      // Keep this last — required by React Native Reanimated
      'react-native-reanimated/plugin',
    ].filter(Boolean),
  };
};
