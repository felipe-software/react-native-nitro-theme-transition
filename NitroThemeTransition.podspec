require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "NitroThemeTransition"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "15.1" }
  s.source       = { :git => package["repository"]["url"], :tag => "v#{s.version}" }

  # The pod name MUST match `ios.iosModuleName` in nitro.json — the generated
  # Swift/C++ bridge includes "NitroThemeTransition-Swift.h", and CocoaPods
  # derives that header's name from the pod's module name.
  s.source_files = "ios/**/*.{swift}"

  load "nitrogen/generated/ios/NitroThemeTransition+autolinking.rb"
  add_nitrogen_files(s)

  install_modules_dependencies(s)
end
