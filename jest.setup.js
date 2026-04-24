require('jest-canvas-mock');
try {
  // jest-dom v6 changed the entrypoint; attempt both
  require('@testing-library/jest-dom/extend-expect');
} catch (e) {
  try { require('@testing-library/jest-dom'); } catch (_) { /* ignore */ }
}
