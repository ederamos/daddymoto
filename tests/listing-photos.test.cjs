const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const listingId = '11111111-1111-4111-8111-111111111111';
const otherListing = '22222222-2222-4222-8222-222222222222';
const uuid = (n) => `aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12, '0')}`;
const key = (n, id = listingId) => `listings/${id}/${uuid(n)}.jpg`;
const request = (body) => ({ json: async () => body });
const photo = (n, order = n) => ({ id: uuid(n), listing_id: listingId, key: key(n), url: `https://photos.test/${key(n)}`, sort_order: order });

// Load the actual TypeScript route modules with boundary mocks; no live database/R2 credentials.
function harness({ user = 'owner', admin = false, sessionAdmin = admin, count = 0, storageFailure = false } = {}) {
  const state = { photos: Array.from({ length: count }, (_, n) => photo(n)), calls: [], objects: [], signed: 0 };
  let tail = Promise.resolve();
  const db = {
    async query(sql, values = []) {
      state.calls.push(sql);
      if (sql.startsWith('SELECT * FROM listings')) return { rows: values[0] === listingId ? [{ id: listingId, user_id: 'owner' }] : [] };
      if (sql.startsWith('SELECT is_admin')) return { rows: [{ is_admin: admin }] };
      if (sql.startsWith('SELECT * FROM listing_photos')) return { rows: structuredClone(state.photos) };
      throw new Error('Unexpected query: ' + sql);
    },
    async connect() {
      let unlock, snapshot;
      return {
        async query(sql, values = []) {
          state.calls.push(sql);
          if (sql.includes('FOR UPDATE')) {
            const previous = tail;
            tail = new Promise((resolve) => { unlock = resolve; });
            await previous;
            snapshot = structuredClone(state.photos);
            return { rows: values[0] === listingId ? [{ user_id: 'owner' }] : [] };
          }
          if (sql.startsWith('SELECT is_admin')) return { rows: [{ is_admin: admin }] };
          if (sql.startsWith('SELECT COUNT')) return { rows: [{ count: String(state.photos.length) }] };
          if (sql.startsWith('SELECT * FROM listing_photos') || sql.startsWith('SELECT key FROM')) return { rows: structuredClone(state.photos) };
          if (sql.startsWith('INSERT')) {
            const added = { id: uuid(100 + state.photos.length), listing_id: values[0], url: values[1], key: values[2], sort_order: values[3] };
            state.photos.push(added);
            return { rows: [added] };
          }
          if (sql.startsWith('DELETE FROM listing_photos')) state.photos = state.photos.filter((p) => p.id !== values[0]);
          if (sql.startsWith('UPDATE listing_photos')) state.photos.find((p) => p.id === values[1]).sort_order = values[0];
          if (sql.startsWith('DELETE FROM listings')) state.photos = [];
          if (sql === 'ROLLBACK' && snapshot) state.photos = snapshot;
          if (sql === 'COMMIT' || sql === 'ROLLBACK') { unlock?.(); unlock = undefined; }
          return { rows: [] };
        },
        release() { unlock?.(); },
      };
    },
  };
  class Command { constructor(input) { this.input = input; } }
  class HeadObjectCommand extends Command {}
  class DeleteObjectCommand extends Command {}
  const mocks = {
    'next/server': { NextResponse: { json: (body, options = {}) => ({ status: options.status || 200, body }) } },
    'next-auth': { getServerSession: async () => user ? { user: { id: user, isAdmin: sessionAdmin } } : null },
    '@/lib/auth': { authOptions: {} },
    '@/lib/db': { db, query: db.query },
    '@aws-sdk/client-s3': {
      PutObjectCommand: Command, HeadObjectCommand, DeleteObjectCommand,
      S3Client: class {
        async send(command) {
          state.objects.push(command);
          if (storageFailure) throw new Error('R2 unavailable');
          return { ContentType: 'image/jpeg' };
        }
      },
    },
    '@aws-sdk/s3-request-presigner': { getSignedUrl: async () => { state.signed++; return 'https://upload.test'; } },
  };
  const cache = {};
  function load(file) {
    const resolved = path.resolve(__dirname, '..', file);
    if (cache[resolved]) return cache[resolved].exports;
    const module = { exports: {} };
    cache[resolved] = module;
    const output = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    const requireMock = (name) => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`);
      return require(name);
    };
    new Function('require', 'module', 'exports', 'console', output)(requireMock, module, module.exports, { error() {} });
    return module.exports;
  }
  return { state, load, photos: load('src/app/api/photos/route.ts'), upload: load('src/app/api/upload/route.ts') };
}

process.env.R2_PUBLIC_URL = 'https://photos.test/';
process.env.R2_BUCKET_NAME = 'test';

for (const action of ['upload', 'add', 'remove']) {
  test(`${action}: unauthenticated/stranger blocked; owner/admin allowed`, async () => {
    for (const [user, admin, expected] of [[null, false, 401], ['stranger', false, 403], ['owner', false, 200], ['admin', true, 200]]) {
      const h = harness({ user, admin, count: 1 });
      const res = action === 'upload'
        ? await h.upload.POST(request({ listingId, contentType: 'image/jpeg' }))
        : action === 'add' ? await h.photos.POST(request({ listingId, key: key(20) }))
        : await h.photos.DELETE(request({ listingId, photoId: uuid(0) }));
      assert.equal(res.status, expected);
      if (expected !== 200) { assert.equal(h.state.objects.length, 0); assert.equal(h.state.signed, 0); }
      assert.ok(h.state.calls.includes('ROLLBACK') || expected === 401 || expected === 200);
    }
  });
}

test('invalid bodies and missing listings fail before storage access', async () => {
  const h = harness();
  assert.equal((await h.upload.POST(request({ listingId: 'bad', contentType: 'image/jpeg' }))).status, 400);
  assert.equal((await h.upload.POST(request({ listingId, contentType: 'image/svg+xml' }))).status, 400);
  assert.equal((await h.photos.POST(request(null))).status, 400);
  assert.equal((await h.photos.DELETE(request({ listingId, photoId: 'bad' }))).status, 400);
  assert.equal((await h.upload.POST(request({ listingId: otherListing, contentType: 'image/jpeg' }))).status, 404);
  assert.equal(h.state.objects.length, 0);
});

test('rejects foreign/traversal keys and duplicate attachment; derives public URL and appends order', async () => {
  const h = harness({ count: 1 });
  for (const bad of [key(20, otherListing), `listings/${listingId}/../other.jpg`, key(20) + '/extra']) {
    assert.equal((await h.photos.POST(request({ listingId, key: bad }))).status, 400);
  }
  assert.equal((await h.photos.POST(request({ listingId, key: key(0) }))).status, 409);
  const added = await h.photos.POST(request({ listingId, key: key(20), url: 'https://evil.test', sortOrder: -1 }));
  assert.equal(added.status, 200);
  assert.equal(added.body.photo.url, `https://photos.test/${key(20)}`);
  assert.equal(added.body.photo.sort_order, 1);
  assert.equal(h.state.photos[0].key, key(0));
});

test('upload and attachment enforce 10-photo limit, including concurrent adds', async () => {
  const full = harness({ count: 10 });
  assert.equal((await full.upload.POST(request({ listingId, contentType: 'image/jpeg' }))).status, 409);
  assert.equal((await full.photos.POST(request({ listingId, key: key(20) }))).status, 409);
  assert.equal(full.state.objects.length, 0);
  const h = harness({ count: 9 });
  const results = await Promise.all([20, 21].map((n) => h.photos.POST(request({ listingId, key: key(n) }))));
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal(h.state.photos.length, 10);
});

for (const removed of [0, 1, 2]) {
  test(`removing photo ${removed} deletes its R2 key and retains relative order with cover at zero`, async () => {
    const h = harness({ count: 3 });
    const res = await h.photos.DELETE(request({ listingId, photoId: uuid(removed) }));
    assert.equal(res.status, 200);
    assert.equal(h.state.objects[0].input.Key, key(removed));
    assert.deepEqual(h.state.photos.map((p) => p.key), [0, 1, 2].filter((n) => n !== removed).map((n) => key(n)));
    assert.deepEqual(h.state.photos.map((p) => p.sort_order), [0, 1]);
  });
}

test('missing photo never touches R2; storage failure retains database row for retry', async () => {
  const h = harness({ count: 1 });
  assert.equal((await h.photos.DELETE(request({ listingId, photoId: uuid(99) }))).status, 404);
  assert.equal(h.state.objects.length, 0);
  const failed = harness({ count: 1, storageFailure: true });
  assert.equal((await failed.photos.DELETE(request({ listingId, photoId: uuid(0) }))).status, 503);
  assert.equal(failed.state.photos.length, 1);
  assert.ok(failed.state.calls.includes('ROLLBACK'));
  assert.equal((await failed.photos.POST(request({ listingId, key: key(20) }))).status, 503);
  assert.equal(failed.state.photos.length, 1);
});

test('whole listing deletion removes stored photos and uses owner/admin authorization', async () => {
  for (const [user, admin, expected] of [['owner', false, 200], ['admin', true, 200], ['stranger', false, 403]]) {
    const h = harness({ user, admin, count: 2 });
    const res = await h.load('src/app/api/listings/[id]/route.ts').DELETE({}, { params: { id: listingId } });
    assert.equal(res.status, expected);
    assert.equal(h.state.objects.length, expected === 200 ? 2 : 0);
  }
  const h = harness({ count: 2, storageFailure: true });
  assert.equal((await h.load('src/app/api/listings/[id]/route.ts').DELETE({}, { params: { id: listingId } })).status, 503);
  assert.equal(h.state.photos.length, 2);
});

test('photo editor renders labeled controls, current previews and the 10-photo disabled state', () => {
  const h = harness();
  const Editor = h.load('src/components/listings/ListingPhotoEditor.tsx').default;
  const render = (photos) => renderToStaticMarkup(React.createElement(Editor, { listingId, initialPhotos: photos, disabled: false, onBusyChange() {} }));
  const html = render([photo(0)]);
  assert.match(html, /aria-label="Remove photo 1 \(cover photo\)"/);
  assert.match(html, /alt="Listing photo 1, cover photo"/);
  assert.match(html, /for="add-listing-photos"/);
  assert.match(html, /role="status"/);
  assert.match(render(Array.from({ length: 10 }, (_, n) => photo(n))), /id="add-listing-photos"[^>]*disabled/);
  assert.match(render([]), /No photos yet/);
});

test('client uploader stops after failed R2 PUT or failed attachment', async () => {
  const uploader = harness().load('src/lib/upload-listing-photo.ts');
  const original = global.fetch;
  try {
    for (const failure of ['put', 'add']) {
      const calls = [];
      global.fetch = async (url) => {
        calls.push(url);
        if (url === '/api/upload') return { ok: true, json: async () => ({ uploadUrl: 'https://upload.test', key: key(20) }) };
        if (url === 'https://upload.test') return { ok: failure !== 'put' };
        return { ok: false, json: async () => ({ error: 'Photo limit reached' }) };
      };
      await assert.rejects(uploader.uploadListingPhoto(listingId, { type: 'image/jpeg', name: 'test.jpg' }));
      assert.equal(calls.length, failure === 'put' ? 2 : 3);
    }
  } finally { global.fetch = original; }
});


test('edit detail includes ordered current photos only for owner/current admin', async () => {
  for (const [user, admin, expected] of [['owner', false, 200], ['admin', true, 200], ['stranger', false, 403], [null, false, 401]]) {
    const h = harness({ user, admin, count: 2 });
    const res = await h.load('src/app/api/listings/[id]/detail/route.ts').GET({}, { params: { id: listingId } });
    assert.equal(res.status, expected);
    if (expected === 200) {
      assert.deepEqual(res.body.photos.map((p) => p.id), [uuid(0), uuid(1)]);
      assert.ok(h.state.calls.some((sql) => sql.includes('ORDER BY sort_order, created_at, id')));
    }
  }
});

test('a stale admin session cannot authorize photo writes after admin access is revoked', async () => {
  const h = harness({ user: 'former-admin', admin: false, sessionAdmin: true, count: 1 });
  assert.equal((await h.upload.POST(request({ listingId, contentType: 'image/jpeg' }))).status, 403);
  assert.equal((await h.photos.POST(request({ listingId, key: key(20) }))).status, 403);
  assert.equal((await h.photos.DELETE(request({ listingId, photoId: uuid(0) }))).status, 403);
  assert.equal(h.state.objects.length, 0);
});
