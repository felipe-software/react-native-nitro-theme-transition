// Learn more: https://docs.expo.dev/guides/monorepos/
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

// The library is the REPOSITORY ROOT, not a workspace member, so Expo's
// automatic monorepo detection cannot infer it. Declaring it explicitly is the
// documented setup for a library-with-example layout: Metro has to be allowed
// to read files above the example directory, and to resolve the library's own
// dependencies (react, react-native, nitro-modules) back down to this app so
// there is exactly ONE copy of each at runtime.
const root = path.resolve(__dirname, '..');
const config = getDefaultConfig(__dirname);

config.watchFolders = [root];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(root, 'node_modules'),
];

module.exports = config;
