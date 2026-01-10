const defaultResolver = require('@nx/jest/plugins/resolver');

module.exports = (request, options) => {
  const opts = options || {};
  // Check if we're resolving from the winter directory and request is for runtime
  if (
    opts.basedir &&
    opts.basedir.includes('expo/src/winter') &&
    request === './runtime'
  ) {
    // Force resolution to non-native version to avoid runtime.native.ts
    return defaultResolver('./runtime.ts', opts);
  }

  return defaultResolver(request, opts);
};
