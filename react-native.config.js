/**
 * Prevent React Native CLI autolinking from linking the `expo` package.
 * Expo modules are linked via the Expo autolinking Gradle plugin, and
 * letting RN CLI link `expo` can generate an invalid import like
 * `expo.core.ExpoModulesPackage` in PackageList.java on EAS.
 */
module.exports = {
  dependencies: {
    expo: {
      platforms: {
        android: null,
        ios: null,
      },
    },
  },
};
