package com.margelo.nitro.nitrothemetransition

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfoProvider

/**
 * Exists only to load the native library.
 *
 * A Nitro HybridObject is constructed from C++, so nothing on the Java side ever
 * references [HybridThemeTransition] — which means nothing would trigger
 * `System.loadLibrary` either, and `createHybridObject('ThemeTransition')` would
 * fail with "no such HybridObject". Autolinking instantiates this package during
 * app startup, well before the JS bundle runs, so the registry is populated by
 * the time JS can ask for it.
 *
 * It deliberately contributes no modules and no view managers. [BaseReactPackage]
 * rather than `ReactPackage` because the latter's `createNativeModules` is
 * deprecated under the New Architecture.
 */
class ThemeTransitionPackage : BaseReactPackage() {
  init {
    NitroThemeTransitionOnLoad.initializeNative()
  }

  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? = null

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = ReactModuleInfoProvider {
    emptyMap()
  }
}
