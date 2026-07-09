module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            // NOTE: firebase/* now resolves to the real Firebase JS SDK so the
            // app runs in Expo Go. (Previously aliased to @react-native-firebase,
            // which is a native module unavailable in Expo Go.)
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
