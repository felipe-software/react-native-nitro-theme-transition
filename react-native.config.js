// Marks this workspace package as an autolinkable native dependency.
// https://github.com/react-native-community/cli/blob/main/docs/dependencies.md
module.exports = {
  dependency: {
    platforms: {
      ios: {},
      android: {
        // Declared explicitly rather than left to autolinking's class scan: the
        // package exists purely to call `System.loadLibrary`, so a miss here is
        // a runtime "no such HybridObject" rather than a build error.
        packageImportPath: 'import com.margelo.nitro.nitrothemetransition.ThemeTransitionPackage;',
        packageInstance: 'new ThemeTransitionPackage()',
      },
    },
  },
};
