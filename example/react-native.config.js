const path = require('node:path');

/**
 * Point autolinking at the REPOSITORY, not at `node_modules`.
 *
 * ── Why this file exists ──
 * `bun install` materialises `file:..` as a COPY of the library inside its
 * store, and CocoaPods then compiles that copy. Editing `ios/*.swift` in the
 * repo changes nothing the app builds: the pod keeps compiling the snapshot
 * taken at install time, so a native fix appears to have no effect no matter how
 * many times it is rebuilt.
 *
 * That cost a full debugging cycle — three "fixes" were tested against native
 * code that was never compiled. Overriding the dependency root here makes the
 * pod read `../ios`, `../nitrogen` and `../*.podspec` straight from the working
 * tree, so a rebuild always reflects what is on disk.
 *
 * Re-run `bun run prebuild` after changing this file; the path is baked into
 * `ios/Podfile` and `Podfile.lock` at prebuild time.
 */
const root = path.resolve(__dirname, '..');

module.exports = {
  dependencies: {
    'react-native-nitro-theme-transition': {
      root,
    },
  },
};
