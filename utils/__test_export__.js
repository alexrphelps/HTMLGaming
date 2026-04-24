// This file re-exports MathUtils and Vector2 for testing without modifying the
// original library usage in the app. It avoids changing global assignments.
const original = require('./MathUtils');

// If MathUtils and Vector2 are defined as globals on window in the runtime,
// Node tests won't have window. So import from the file directly.
const MathUtils = original.MathUtils || original;
const Vector2 = original.Vector2 || original.Vector2;

module.exports = { MathUtils, Vector2 };
