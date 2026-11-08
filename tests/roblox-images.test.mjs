import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameImageLoader, createGameImageResolver, withGameImages } from '../lib/roblox-images.ts';

const firstImage = 'https://tr.rbxcdn.com/first/150/150/Image/Png/noFilter';
const secondImage = 'https://tr.rbxcdn.com/second/150/150/Image/Png/noFilter';

test('resolves a whole page in one request and matches images by place ID rather than response order', async () => {
  const requests = [];
  const resolve = createGameImageResolver(async (url, options) => {
    requests.push(new URL(url));
    assert(options.signal instanceof AbortSignal);
    assert.equal(options.redirect, 'manual', 'Cloudflare Workers reject redirect:error');
    return Response.json({ data: [
      { targetId: 222, state: 'Completed', imageUrl: secondImage },
      { targetId: 111, state: 'Completed', imageUrl: firstImage },
    ] });
  });
  const images = await resolve(['111', '222', '111']);
  assert.equal(images.get('111'), firstImage);
  assert.equal(images.get('222'), secondImage);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].hostname, 'thumbnails.roblox.com');
  assert.equal(requests[0].searchParams.get('placeIds'), '111,222');
  assert.equal((await resolve(['222'])).get('222'), secondImage);
  assert.equal(requests.length, 1, 'polling reuses the cached game picture');
});

test('an unavailable Roblox API keeps the game usable and retries after a short cache interval', async () => {
  let currentTime = 1_000_000;
  let attempts = 0;
  const resolve = createGameImageResolver(async () => {
    attempts++;
    if (attempts === 1) throw new Error('upstream unavailable');
    return Response.json({ data: [{ targetId: 111, state: 'Completed', imageUrl: firstImage }] });
  }, () => currentTime);
  assert.equal((await resolve(['111'])).get('111'), null);
  assert.equal((await resolve(['111'])).get('111'), null);
  assert.equal(attempts, 1);
  currentTime += 30_001;
  assert.equal((await resolve(['111'])).get('111'), firstImage);
  assert.equal(attempts, 2);
  currentTime += 15 * 60_000;
  await resolve(['111']);
  assert.equal(attempts, 3, 'successful images are refreshed after fifteen minutes');
});

test('invalid IDs, unfinished pictures and image URLs outside the Roblox CDN are ignored', async () => {
  let calls = 0;
  const resolve = createGameImageResolver(async (url) => {
    calls++;
    assert.equal(new URL(url).searchParams.get('placeIds'), '111,222,333,444');
    return Response.json({ data: [
      { targetId: 111, state: 'Pending', imageUrl: firstImage },
      { targetId: 222, state: 'Completed', imageUrl: 'https://rbxcdn.com.example.org/tracker.png' },
      { targetId: 333, state: 'Completed', imageUrl: 'http://tr.rbxcdn.com/insecure.png' },
      { targetId: 444, state: 'Completed', imageUrl: 'https://user:password@tr.rbxcdn.com/picture.png' },
      { targetId: 555, state: 'Completed', imageUrl: secondImage },
    ] });
  });
  assert.equal((await resolve(['0', '../elsewhere', '9007199254740992'])).size, 0);
  assert.equal(calls, 0);
  const images = await resolve(['111', '222', '333', '444']);
  assert.deepEqual([...images.values()], [null, null, null, null]);
  assert.equal(images.has('555'), false);
});

test('rate limiting and malformed responses fall back without failing the presence list', async () => {
  for (const response of [
    new Response('rate limited', { status: 429 }),
    new Response('invalid JSON'),
    Response.json({ data: null }),
  ]) {
    const resolve = createGameImageResolver(async () => response);
    assert.equal((await resolve(['111'])).get('111'), null);
  }
});

test('serves the real game image through the site and caches successful image bytes', async () => {
  let calls = 0;
  const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const load = createGameImageLoader(async (url, options) => {
    calls++;
    assert.equal(options.redirect, 'manual', 'Cloudflare Workers reject redirect:error');
    if (String(url).startsWith('https://thumbnails.roblox.com/')) {
      return Response.json({ data: [{ targetId: 111, state: 'Completed', imageUrl: firstImage }] });
    }
    assert.equal(url, firstImage);
    return new Response(bytes, { headers: { 'Content-Type': 'image/Png' } });
  });
  const first = await load('111');
  assert.equal(first.status, 200);
  assert.equal(first.headers.get('content-type'), 'image/png');
  assert.equal(first.headers.get('cache-control'), 'private, max-age=900');
  assert.deepEqual(new Uint8Array(await first.arrayBuffer()), bytes);
  assert.equal((await load('111')).status, 200);
  assert.equal(calls, 2, 'cached image does not repeat the metadata or CDN request');
});

test('only an active, valid game gets an image path on the same site', async () => {
  const users = await withGameImages([
    { online: true, placeId: '121692407072104' },
    { online: false, placeId: '111' },
    { online: true, placeId: '../other' },
    { online: true, placeId: null },
  ]);
  assert.equal(users[0].gameImageUrl, '/api/roblox/game-image?placeId=121692407072104');
  assert.deepEqual(users.slice(1).map(user => user.gameImageUrl), [null, null, null]);
});

test('image delivery rejects invalid inputs and never caches HTML or failed downloads as a picture', async () => {
  const invalid = createGameImageLoader(async () => { throw new Error('must not fetch'); });
  assert.equal((await invalid('https://other.example/image.png')).status, 400);
  for (const body of [
    new Response('blocked', { status: 403 }),
    new Response('<html>not an image</html>', { headers: { 'content-type': 'text/html' } }),
    new Response('', { headers: { 'content-type': 'image/png' } }),
  ]) {
    const load = createGameImageLoader(async url => String(url).startsWith('https://thumbnails.roblox.com/')
      ? Response.json({ data: [{ targetId: 111, state: 'Completed', imageUrl: firstImage }] }) : body);
    const response = await load('111');
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});
