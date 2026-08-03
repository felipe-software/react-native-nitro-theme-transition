cmake_minimum_required(VERSION 3.9.0)
project(NitroThemeTransition)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# The only hand-written C++ in this package: a JNI_OnLoad that hands control to
# nitrogen's generated registration. Everything else is generated.
add_library(NitroThemeTransition SHARED src/main/cpp/cpp-adapter.cpp)

# Adds the generated sources, include dirs and ReactAndroid/fbjni/Nitro links.
include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/NitroThemeTransition+autolinking.cmake)
