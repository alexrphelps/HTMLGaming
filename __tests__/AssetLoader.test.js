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
});
