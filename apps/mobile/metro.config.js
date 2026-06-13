const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

// Packages that MUST be a single instance across the whole bundle. Multiple
// copies of react/react-native in a yarn-workspaces tree cause
// "Cannot read property 'useContext' of null" (two React instances).
const singletons = ['react', 'react-dom', 'react-native'];
const forced = Object.fromEntries(
  singletons.map(name => [name, path.resolve(projectRoot, 'node_modules', name)]),
);

/**
 * Monorepo config: watch the workspace, resolve from both node_modules trees,
 * and pin React singletons so nested copies never get double-bundled.
 */
const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    resolveRequest: (context, moduleName, platform) => {
      // Redirect react / react-native (and their subpaths) to the app's copy.
      for (const name of singletons) {
        if (moduleName === name || moduleName.startsWith(`${name}/`)) {
          const sub = moduleName.slice(name.length); // "" or "/jsx-runtime" etc.
          return context.resolveRequest(
            context,
            forced[name] + sub,
            platform,
          );
        }
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
