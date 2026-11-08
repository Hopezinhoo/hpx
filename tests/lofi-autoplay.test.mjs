import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { enableLofiAutoplay } from '../lib/lofi-autoplay.ts';

test('starts music immediately when autoplay is permitted and then stops listening for gestures', async () => {
  let plays = 0;
  const events = new EventTarget();
  const cancel = enableLofiAutoplay({ play: async () => { plays++; } }, events);
  assert.equal(plays, 1);
  await setImmediate();
  events.dispatchEvent(new Event('click'));
  events.dispatchEvent(new Event('keydown'));
  assert.equal(plays, 1);
  cancel();
});

test('a browser autoplay denial is retried during the first real interaction', async () => {
  let plays = 0;
  const events = new EventTarget();
  const cancel = enableLofiAutoplay({ play: async () => { if (++plays === 1) throw new Error('NotAllowedError'); } }, events);
  await setImmediate();
  events.dispatchEvent(new Event('click'));
  assert.equal(plays, 2, 'play is called synchronously inside the interaction');
  await setImmediate();
  events.dispatchEvent(new Event('pointerdown'));
  assert.equal(plays, 2);
  cancel();
});

test('manual pause cancels deferred autoplay so other page clicks cannot restart the song', async () => {
  let plays = 0;
  const events = new EventTarget();
  const cancel = enableLofiAutoplay({ play: async () => { plays++; throw new Error('NotAllowedError'); } }, events);
  await setImmediate();
  cancel();
  events.dispatchEvent(new Event('click'));
  events.dispatchEvent(new Event('keydown'));
  assert.equal(plays, 1);
});

test('several gestures cannot create overlapping pending play requests', async () => {
  let plays = 0, release;
  const events = new EventTarget();
  const cancel = enableLofiAutoplay({ play: () => { plays++; return new Promise(resolve => { release = resolve; }); } }, events);
  for (const type of ['pointerdown', 'touchend', 'click', 'keydown']) events.dispatchEvent(new Event(type));
  assert.equal(plays, 1);
  release();
  await setImmediate();
  events.dispatchEvent(new Event('click'));
  assert.equal(plays, 1);
  cancel();
});

test('the play/pause control can be excluded from the automatic gesture handler', async () => {
  let plays = 0;
  const events = new EventTarget();
  const cancel = enableLofiAutoplay({ play: async () => { if (++plays === 1) throw new Error('blocked'); } }, events, event => event.type === 'pointerdown');
  await setImmediate();
  events.dispatchEvent(new Event('pointerdown'));
  assert.equal(plays, 1);
  events.dispatchEvent(new Event('click'));
  assert.equal(plays, 2);
  await setImmediate();
  cancel();
});
