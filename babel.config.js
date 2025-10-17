module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
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
          },
        },
      ],
      'react-native-reanimated/plugin', 
    ],
  };
};
