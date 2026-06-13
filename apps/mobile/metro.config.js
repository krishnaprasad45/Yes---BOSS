const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const workspaceRoot = path.resolve(__dirname, '../..');

/**
 * Monorepo config: Metro must watch packages/shared and resolve deps from
 * both the app's node_modules (nohoisted RN packages) and the workspace root.
 */
const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
