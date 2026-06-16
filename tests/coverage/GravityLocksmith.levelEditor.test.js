const fs = require('fs');
const path = require('path');
const { createBrowserContext, loadBrowserScript } = require('../helpers/browserScriptHarness');

const repoRoot = path.resolve(__dirname, '../..');
const editorHtmlPath = path.join(repoRoot, 'games/the_gravity_locksmith/level_editor.html');
const gameIndexPath = path.join(repoRoot, 'games/the_gravity_locksmith/index.html');
const gamesConfigPath = path.join(repoRoot, 'games.config.js');

const gravityEditorFiles = [
  'games/the_gravity_locksmith/js/constants.js',
  'games/the_gravity_locksmith/js/utils.js',
  'games/the_gravity_locksmith/js/roomSchema.js',
  'games/the_gravity_locksmith/js/rooms.js',
  'games/the_gravity_locksmith/js/level_editor.js'
];

function loadEditorNamespace() {
  const context = createBrowserContext();
  gravityEditorFiles.forEach(file => loadBrowserScript(context, file, []));
  return context.window.GravityLocksmith;
}

describe('Gravity Locksmith level editor', () => {
  test('editor page exists and is not linked from normal game entrypoints', () => {
    expect(fs.existsSync(editorHtmlPath)).toBe(true);
    expect(fs.readFileSync(gameIndexPath, 'utf8')).not.toContain('level_editor');
    expect(fs.readFileSync(gamesConfigPath, 'utf8')).not.toContain('level_editor');
  });

  test('editor page includes required controls and loads after room data', () => {
    const html = fs.readFileSync(editorHtmlPath, 'utf8');
    const requiredIds = [
      'room-select',
      'item-select',
      'new-room-btn',
      'open-file-btn',
      'save-file-btn',
      'room-properties',
      'selection-properties',
      'editor-canvas'
    ];

    requiredIds.forEach(id => {
      expect(html).toContain(`id="${id}"`);
    });

    const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(match => match[1]);
    expect(scripts).toEqual([
      'js/constants.js',
      'js/utils.js',
      'js/roomSchema.js',
      'js/rooms.js',
      'js/level_editor.js'
    ]);
  });

  test('new rooms created by the editor validate through the game schema', () => {
    const ns = loadEditorNamespace();
    const room = ns.LevelEditor.createDefaultRoom(41);

    expect(() => ns.validateAndNormalizeRooms([room])).not.toThrow();
    expect([
      room.name,
      room.spawn.x,
      room.exit.w,
      Array.isArray(room.platforms),
      Array.isArray(room.hazards)
    ]).toEqual(['New Vault 41', 104, 84, true, true]);
  });

  test('serializer output evaluates into valid explicit room definitions', () => {
    const ns = loadEditorNamespace();
    const room = ns.LevelEditor.createDefaultRoom(1);
    room.name = 'Editor Smoke';
    room.shards.push({ x: 500, y: 500 });

    const source = ns.LevelEditor.serializeRooms([room]);
    const parsed = ns.LevelEditor.parseRoomsSource(source);

    expect(source).toContain('ns.ROOM_DEFINITIONS = [');
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('Editor Smoke');
    expect(() => ns.validateAndNormalizeRooms(parsed)).not.toThrow();
  });

  test('loaded campaign data exposes editable item descriptors', () => {
    const ns = loadEditorNamespace();
    const room = ns.LevelEditor.normalizeRoomForEditing(ns.ROOM_DEFINITIONS[0], 0);
    const items = ns.LevelEditor.getRoomItems(room);

    expect(items.some(item => item.kind === 'spawn' && item.singleton)).toBe(true);
    expect(items.some(item => item.kind === 'exit' && item.resizable)).toBe(true);
    expect(items.some(item => item.kind === 'platform' && item.collection === 'platforms')).toBe(true);
    expect(items.some(item => item.kind === 'shard' && item.collection === 'shards')).toBe(true);
  });
});
