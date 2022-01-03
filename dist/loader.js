"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._prevalLoader = _prevalLoader;
exports.default = void 0;

var _fs = _interopRequireDefault(require("fs"));

var _requireFromString = _interopRequireDefault(require("require-from-string"));

var _babelPluginModuleResolver = require("babel-plugin-module-resolver");

var _loaderUtils = require("loader-utils");

var _tsconfigPaths = require("tsconfig-paths");

var _isSerializable = _interopRequireDefault(require("./is-serializable"));

var _register = _interopRequireWildcard(require("@babel/register"));

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// @ts-expect-error
// @ts-expect-error
class PrevalError extends Error {}

const defaultExtensions = ['.js', '.jsx', '.ts', '.tsx'];
const defaultTsConfigFile = "tsconfig.json";

const isRecord = something => typeof something === 'object' && !!something && !Array.isArray(something);

const readJson = filename => {
  try {
    return require(filename);
  } catch {
    return undefined;
  }
};

const fileExists = filename => {
  try {
    return _fs.default.existsSync(filename);
  } catch {
    return false;
  }
};

async function _prevalLoader(_, resource, options) {
  var _tsConfigFile;

  let {
    extensions = defaultExtensions,
    tsConfigFile
  } = options;
  tsConfigFile = (_tsConfigFile = tsConfigFile) !== null && _tsConfigFile !== void 0 ? _tsConfigFile : defaultTsConfigFile;
  const configLoaderResult = (0, _tsconfigPaths.loadConfig)(tsConfigFile);
  const configLoaderSuccessResult = configLoaderResult.resultType === 'failed' ? null : configLoaderResult;
  const matchPath = configLoaderSuccessResult && (0, _tsconfigPaths.createMatchPath)(configLoaderSuccessResult.absoluteBaseUrl, configLoaderSuccessResult.paths);
  const moduleResolver = configLoaderSuccessResult && ['module-resolver', {
    extensions,
    resolvePath: (sourcePath, currentFile, opts) => {
      if (matchPath) {
        try {
          const mat = matchPath(sourcePath, readJson, fileExists, extensions);
          if (mat != null) return mat;
          return (0, _babelPluginModuleResolver.resolvePath)(sourcePath, currentFile, opts);
        } catch {
          return (0, _babelPluginModuleResolver.resolvePath)(sourcePath, currentFile, opts);
        }
      }

      return (0, _babelPluginModuleResolver.resolvePath)(sourcePath, currentFile, opts);
    }
  }];
  (0, _register.default)({
    // this is used by `next/babel` preset to conditionally remove loaders.
    // without it, it causes the dreaded `e.charCodeAt is not a function` error.
    // see:
    // - https://github.com/ricokahler/next-plugin-preval/issues/66
    // - https://github.com/vercel/next.js/blob/37d11008250b3b87dfa4625cd228ac173d4d3563/packages/next/build/babel/preset.ts#L65
    caller: {
      isServer: true
    },
    presets: ['next/babel', ['@babel/preset-env', {
      targets: 'node 12'
    }]],
    plugins: [// conditionally add
    ...(moduleResolver ? [moduleResolver] : [])],
    rootMode: 'root',
    // TODO: this line may cause performance issues, it makes babel compile
    // things `node_modules` however this is currently required for setups that
    // include the use of sym-linked deps as part of workspaces (both yarn and
    // npm)
    ignore: [],
    // disables the warning "Babel has de-optimized the styling of..."
    compact: true,
    extensions
  });
  const data = await (async () => {
    try {
      const mod = (0, _requireFromString.default)(`require('next');\nmodule.exports = require(${JSON.stringify(resource)})`, `${resource}.preval.js`);

      if (!mod.default) {
        throw new PrevalError('No default export. Did you forget to `export default`?');
      }

      return await mod.default;
    } catch (e) {
      if (isRecord(e) && 'stack' in e) {
        // TODO: use the webpack logger. i tried this and it didn't output anything.
        console.error('[next-plugin-preval]', e.stack);
      }

      throw new PrevalError(`Failed to pre-evaluate "${resource}". ${e} See above for full stack trace.`);
    } finally {
      (0, _register.revert)();
    }
  })();
  (0, _isSerializable.default)(resource, data); // NOTE we wrap in JSON.parse because that's faster for JS engines to parse
  // over javascript. see here https://v8.dev/blog/cost-of-javascript-2019#json
  //
  // We wrap in JSON.stringify twice. Once for a JSON string and once again for
  // a JSON string that can be embeddable in javascript.

  return `module.exports = JSON.parse(${JSON.stringify(JSON.stringify(data))})`;
}

const loader = function (content) {
  const callback = this.async();
  const options = (0, _loaderUtils.getOptions)(this);
  this.cacheable(false);

  if (!callback) {
    throw new PrevalError('Async was not supported by webpack. Please open an issue in next-plugin-preval.');
  }

  _prevalLoader(content.toString(), this.resourcePath, options).then(result => {
    callback(null, result);
  }).catch(e => {
    callback(e);
  });
};

var _default = loader;
exports.default = _default;
//# sourceMappingURL=loader.js.map