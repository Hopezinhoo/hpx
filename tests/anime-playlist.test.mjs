import test from 'node:test';
import assert from 'node:assert/strict';
import { animeOpenings, animeStreamUrl, createAnimeQueue } from '../lib/anime-playlist.ts';

test('the anime queue plays every opening once before repeating a cycle', () => {
  const queue = createAnimeQueue(() => .3);
  const first = animeOpenings.map(() => queue.next());
  assert.equal(new Set(first.map(track => track.id)).size, animeOpenings.length);
  assert.deepEqual(new Set(first.map(track => track.id)), new Set(animeOpenings.map(track => track.id)));
});

test('the last opening in a cycle is not immediately repeated at the next cycle', () => {
  for (const value of [0, .3, .8, .999999]) {
    const queue = createAnimeQueue(() => value);
    let previous = '';
    for (let i = 0; i < 30; i++) {
      const track = queue.next();
      assert.notEqual(track.id, previous);
      previous = track.id;
    }
  }
});

test('reopening the page excludes its saved track from the first selection', () => {
  for (const previous of animeOpenings) {
    for (const value of [0, .3, .8, .999999]) {
      const queue = createAnimeQueue(() => value, previous.id);
      const cycle = animeOpenings.map(() => queue.next());
      assert.notEqual(cycle[0].id, previous.id);
      assert.equal(new Set(cycle.map(track => track.id)).size, animeOpenings.length);
    }
  }
});

test('consecutive reloads with identical randomness still select another track', () => {
  let savedTrack = '';
  for (let reload = 0; reload < 30; reload++) {
    const queue = createAnimeQueue(() => .3, savedTrack);
    const next = queue.next();
    assert.notEqual(next.id, savedTrack);
    savedTrack = next.id;
  }
});

test('different random seeds produce different opening orders', () => {
  const first = createAnimeQueue(() => 0);
  const second = createAnimeQueue(() => .999999);
  assert.notDeepEqual(animeOpenings.map(() => first.next().id), animeOpenings.map(() => second.next().id));
  assert(animeOpenings.every(track => {
    const stream = new URL(animeStreamUrl(track));
    return stream.origin === 'https://api.audius.co' && stream.pathname === `/v1/tracks/${track.id}/stream` && stream.searchParams.get('app_name') === 'HPXPresence';
  }));
});
