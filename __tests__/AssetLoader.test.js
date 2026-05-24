const { AssetLoader } = require('../utils/__test_export__');

describe('AssetLoader', () => {
  let loader;

  beforeEach(() => {
    // Provide minimal globals used by AssetLoader
    global.fetch = jest.fn();
    global.Image = class {
      constructor() {
        setTimeout(() => { this.onload && this.onload(); }, 0);
        this.width = 10; this.height = 10; this.complete = true; this.naturalWidth = 10;
      }
      set src(_) {}
    };
    window.AudioContext = function(){}; // stub
    loader = new AssetLoader();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete global.fetch;
    delete global.Image;
    delete window.AudioContext;
  });

  test('loadImage resolves and caches', async () => {
    const p = loader.loadImage('img1', 'http://example.com/a.png');
    const result = await p;
    expect(result.type).toBe('image');
    expect(loader.has('img1')).toBe(false); // loadImage doesn't cache directly
  });

  test('loadJSON uses fetch and returns data', async () => {
    const mockResponse = { ok: true, json: async () => ({foo: 'bar'}) };
    global.fetch.mockResolvedValueOnce(mockResponse);
    const res = await loader.loadJSON('j1', 'http://example.com/data.json');
    expect(res.type).toBe('json');
    expect(res.data.foo).toBe('bar');
  });

  test('loadText uses fetch and returns text', async () => {
    const mockResponse = { ok: true, text: async () => 'hello' };
    global.fetch.mockResolvedValueOnce(mockResponse);
    const res = await loader.loadText('t1', 'http://example.com/data.txt');
    expect(res.type).toBe('text');
    expect(res.data).toBe('hello');
  });

  test('loadAudio fetches arrayBuffer', async () => {
    const buf = new ArrayBuffer(8);
    const mockResponse = { ok: true, arrayBuffer: async () => buf };
    global.fetch.mockResolvedValueOnce(mockResponse);
    const res = await loader.loadAudio('a1', 'http://example.com/s.mp3');
    expect(res.type).toBe('audio');
    expect(res.size).toBe(buf.byteLength);
  });

  test('loadAsset caches successful assets', async () => {
    global.fetch.mockResolvedValue({ ok: true, text: async () => 'cached' });

    const first = await loader.loadAsset('text', 'data.txt');
    const second = await loader.loadAsset('text', 'data.txt');

    expect(first).toBe(second);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(loader.getText('text')).toBe('cached');
  });

  test('loadAsset reuses duplicate in-flight request', async () => {
    let resolveText;
    global.fetch.mockResolvedValue({
      ok: true,
      text: () => new Promise(resolve => { resolveText = resolve; })
    });

    const first = loader.loadAsset('shared', 'shared.txt');
    const second = loader.loadAsset('shared', 'shared.txt');
    await Promise.resolve();
    resolveText('same');

    await expect(first).resolves.toMatchObject({ data: 'same' });
    await expect(second).resolves.toMatchObject({ data: 'same' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('loadAsset rejects unsupported asset types', async () => {
    await expect(loader.loadAsset('bad', 'asset.bin')).rejects.toThrow('Unsupported asset type');
  });

  test('fetch failures reject with context', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' });

    await expect(loader.loadText('missing', 'missing.txt')).rejects.toThrow('Failed to load text');
  });

  test('reports asset type, progress, and cleanup state', async () => {
    expect(loader.getAssetType('image.PNG')).toBe('image');
    expect(loader.getAssetType('sound.ogg')).toBe('audio');
    expect(loader.getAssetType('data.json')).toBe('json');
    expect(loader.getAssetType('notes.txt')).toBe('text');
    expect(loader.getAssetType('archive.zip')).toBe('unknown');

    global.fetch.mockResolvedValueOnce({ ok: true, text: async () => 'done' });
    loader.totalToLoad = 1;
    await loader.loadAsset('notes', 'notes.txt');
    expect(loader.getProgress()).toMatchObject({ loaded: 1, total: 1, percentage: 100 });

    loader.cleanup();
    expect(loader.cache.size).toBe(0);
    expect(loader.loadingPromises.size).toBe(0);
    expect(loader.getProgress()).toMatchObject({ loaded: 0, total: 0, percentage: 0 });
  });
});
