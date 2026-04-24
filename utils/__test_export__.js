// This file re-exports MathUtils and Vector2 for testing without modifying the
// original library usage in the app. It avoids changing global assignments.
// Re-export selected classes for tests. Some files set globals on window and do not
// export via module.exports; this adapter imports the files directly and exports
// their classes for test use without changing runtime behavior.

const math = require('./MathUtils');
// Some modules attach to window and do not export; require() will execute them
// but return {}. Fallback to global/window where necessary.
require('./AssetLoader');
require('./EventEmitter');

const MathUtils = math.MathUtils || math;
const Vector2 = math.Vector2 || math.Vector2;
const AssetLoader = (typeof global.AssetLoader !== 'undefined' && global.AssetLoader) ||
                   (typeof window !== 'undefined' && window.AssetLoader) ||
                   null;
const EventEmitter = (typeof global.EventEmitter !== 'undefined' && global.EventEmitter) ||
                     (typeof window !== 'undefined' && window.EventEmitter) ||
                     null;

module.exports = { MathUtils, Vector2, AssetLoader, EventEmitter };
