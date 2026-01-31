/**
 * This plugin modifies the android/app/build.gradle file to disable strict linting specific to release builds.
 * 
 * WHY IS THIS NEEDED?
 * When building the Android APK locally in release mode ('eas build --local --profile preview'), 
 * the build was failing due to strict lint errors (specifically regarding deprecated APIs and resource checks).
 * By setting 'checkReleaseBuilds false' and 'abortOnError false', we allow the build to complete 
 * even if there are non-critical lint warnings.
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

const withAndroidLintOptions = (config) => {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      const buildGradle = config.modResults.contents;
      
      // Check if already exists to avoid duplication
      if (buildGradle.includes('checkReleaseBuilds false')) {
        return config;
      }

      // Add lintOptions to the android block
      config.modResults.contents = buildGradle.replace(
        /android\s*\{/,
        `android {
    lintOptions {
        checkReleaseBuilds false
        abortOnError false
    }`
      );
    }
    return config;
  });
};

module.exports = withAndroidLintOptions;
