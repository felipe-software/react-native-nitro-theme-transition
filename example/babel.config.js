module.exports = function (api) {
  api.cache(true);

  // `babel-preset-expo` injects the worklets plugin for react-native-reanimated
  // (pulled in by the drawer navigator) on its own, so nothing else is needed.
  return {
    presets: ['babel-preset-expo'],
  };
};
