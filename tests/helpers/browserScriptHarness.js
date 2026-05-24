const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createInstrumenter } = require('istanbul-lib-instrument');

const repoRoot = path.resolve(__dirname, '../..');

function createBrowserContext(overrides = {}) {
  const context = {
    console,
    Math,
    Date,
    JSON,
    Set,
    Map,
    Array,
    Object,
    Number,
    String,
    Boolean,
    RegExp,
    Error,
    TypeError,
    Promise,
    performance: global.performance,
    navigator: { userAgent: 'jest' },
    location: { href: 'http://localhost/' },
    localStorage: global.localStorage,
    document: global.document,
    window: null,
    globalThis: null,
    __coverage__: global.__coverage__ || {}
  };

  Object.assign(context, overrides);
  context.window = context.window || context;
  context.globalThis = context;
  context.window.window = context.window;
  context.window.globalThis = context;

  return vm.createContext(context);
}

function loadBrowserScript(context, relativePath, exportNames = []) {
  const filename = path.join(repoRoot, relativePath);
  const source = fs.readFileSync(filename, 'utf8');
  const expose = exportNames
    .map(name => `\nif (typeof ${name} !== 'undefined') { globalThis.${name} = ${name}; if (globalThis.window) globalThis.window.${name} = ${name}; }`)
    .join('');
  const instrumenter = createInstrumenter({ coverageVariable: '__coverage__' });
  const code = instrumenter.instrumentSync(`${source}${expose}`, filename);

  vm.runInContext(code, context, { filename });
  global.__coverage__ = context.__coverage__;

  return exportNames.reduce((exports, name) => {
    exports[name] = context[name] || context.window[name];
    return exports;
  }, {});
}

module.exports = {
  createBrowserContext,
  loadBrowserScript
};
