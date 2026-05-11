// Metro config for SyncUp mobile.
//
// Notes:
//   - `unstable_enablePackageExports` lets Metro honor each package's
//     `exports` map, which is required for some modern packages
//     (e.g. @clerk/clerk-expo) to resolve subpaths correctly.
//   - `react-dom` is web-only. @clerk/clerk-react's bundled output
//     statically requires it at module load time even on native, where
//     it is unused. We alias it to an empty stub so Metro can resolve.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;

const emptyShim = path.resolve(__dirname, 'src/shims/empty.js');
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  'react-dom': emptyShim,
};

module.exports = config;
