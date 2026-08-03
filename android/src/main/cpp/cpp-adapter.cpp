#include <fbjni/fbjni.h>
#include <jni.h>

#include "NitroThemeTransitionOnLoad.hpp"

/**
 * Entry point for `System.loadLibrary("NitroThemeTransition")`.
 *
 * `registerAllNatives()` wires up the JNI methods for the generated spec and
 * registers the "ThemeTransition" constructor with Nitro's HybridObjectRegistry,
 * which is what makes `NitroModules.createHybridObject('ThemeTransition')`
 * resolve on the JS side.
 */
JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return facebook::jni::initialize(vm, [] {
    margelo::nitro::nitrothemetransition::registerAllNatives();
  });
}
