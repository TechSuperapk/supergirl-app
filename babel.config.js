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
            // Route the JS-SDK modular imports used across the data layer to
            // react-native-firebase at build time, so those files stay untouched.
            'firebase/firestore': '@react-native-firebase/firestore',
            'firebase/auth': '@react-native-firebase/auth',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
