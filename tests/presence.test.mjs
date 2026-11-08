import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { startSession, heartbeat, endSession, listPresence, rateLimit, hash, validateIdentity } from '../lib/presence.ts';
import { isOwner } from '../lib/access.ts';

function database(migrations = '../drizzle/') {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  for (const name of readdirSync(new URL(migrations, import.meta.url)).filter(name => name.endsWith('.sql')).sort()) {
    sqlite.exec(readFileSync(new URL(migrations + name, import.meta.url), 'utf8'));
  }
  const db = {
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      return { values: [], bind(...values) { this.values = values; return this; },
        async first() { return statement.get(...this.values) ?? null; },
        execute() { if (statement.columns().length) return { results: statement.all(...this.values), meta: { changes: 0 } };
          const result = statement.run(...this.values); return { results: [], meta: { changes: Number(result.changes) } }; },
      };
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try { const results = statements.map(statement => statement.execute()); sqlite.exec('COMMIT'); return results; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  return { db, sqlite };
}
const alice = { userId: '12345', username: 'alice_hpx', displayName: 'Alice HPX' };
const bob = { userId: '67890', username: 'bob_hpx', displayName: 'Bob HPX' };
const time = 1_800_000_000_000;

test('registration persists history; heartbeat extends presence; crash expires at exactly 90 seconds', async () => {
  const { db, sqlite } = database();
  const session = await startSession(db, alice, time);
  assert.equal((await listPresence(db, {}, time)).stats.online, 1);
  assert.equal((await listPresence(db, {}, time + 89_999)).stats.online, 1);
  await heartbeat(db, session.token, time + 30_000);
  assert.equal((await listPresence(db, {}, time + 119_999)).stats.online, 1);
  const afterCrash = await listPresence(db, {}, time + 120_000);
  assert.equal(afterCrash.stats.online, 0);
  assert.equal(afterCrash.stats.total, 1);
  assert.equal(afterCrash.users[0].firstSeen, time);
  assert.equal(afterCrash.users[0].lastSeen, time + 30_000);
  const saved = sqlite.prepare('SELECT token_hash FROM presence_sessions').get();
  assert.equal(saved.token_hash, await hash(session.token));
  assert.notEqual(saved.token_hash, session.token);
  assert(!JSON.stringify(afterCrash).includes('token'));
});

test('two sessions count as one user; closing one cannot mark the other offline', async () => {
  const { db } = database();
  const first = await startSession(db, alice, time);
  const second = await startSession(db, alice, time + 1000);
  await endSession(db, first.token, time + 2000);
  const active = await listPresence(db, {}, time + 2001);
  assert.equal(active.stats.total, 1); assert.equal(active.stats.online, 1); assert.equal(active.users[0].activeSessions, 1);
  await endSession(db, second.token, time + 3000);
  assert.equal((await listPresence(db, {}, time + 3001)).stats.online, 0);
  await endSession(db, second.token, time + 4000);
  await assert.rejects(heartbeat(db, first.token, time + 40_000), { status: 401 });
  assert.equal((await listPresence(db, {}, time + 40_001)).stats.online, 0);
});

test('expired and invalid credentials cannot change presence', async () => {
  const { db } = database();
  const session = await startSession(db, alice, time);
  await assert.rejects(heartbeat(db, '0'.repeat(64), time + 30_000), { status: 401 });
  await assert.rejects(endSession(db, '12345', time + 30_000), { status: 401 });
  await assert.rejects(heartbeat(db, session.token, time + 86_400_000), { status: 401 });
  assert.equal((await listPresence(db, {}, time + 30_001)).stats.online, 1);
});

test('offline history, filters, literal wildcard search and online-first order', async () => {
  const { db } = database();
  const first = await startSession(db, alice, time);
  await startSession(db, bob, time + 1000);
  await endSession(db, first.token, time + 2000);
  assert.equal((await listPresence(db, {}, time + 3000)).users[0].userId, bob.userId);
  assert.equal((await listPresence(db, { status: 'online' }, time + 3000)).users.length, 1);
  assert.equal((await listPresence(db, { status: 'offline', q: 'alice_' }, time + 3000)).users[0].userId, alice.userId);
  assert.equal((await listPresence(db, { q: '%' }, time + 3000)).totalResults, 0);
  assert.equal((await listPresence(db, { q: "' OR 1=1 --" }, time + 3000)).totalResults, 0);
  assert.equal((await listPresence(db, { q: bob.userId }, time + 3000)).totalResults, 1);
});

test('registration inputs are bounded and rate limit resets in the next window', async () => {
  const { db } = database();
  for (const userId of ['0', '-1', 'abc', '9007199254740992', 1.2, null]) assert.throws(() => validateIdentity({ ...alice, userId }), { status: 400 });
  assert.throws(() => validateIdentity({ ...alice, displayName: 'A'.repeat(51) }), { status: 400 });
  for (let n = 0; n < 10; n++) await rateLimit(db, 'test-client', 'start', 10, time);
  await assert.rejects(rateLimit(db, 'test-client', 'start', 10, time), { status: 429 });
  await rateLimit(db, 'test-client', 'start', 10, time + 60_000);
});

test('dashboard permission fails closed for visitors and other signed-in accounts', () => {
  assert.equal(isOwner(null, 'owner@example.com'), false);
  assert.equal(isOwner({ email: 'visitor@example.com' }, 'owner@example.com'), false);
  assert.equal(isOwner({ email: 'owner@example.com' }, undefined), false);
  assert.equal(isOwner({ email: 'Owner@example.com' }, 'owner@example.com'), true);
});

const api = { startSession, heartbeat, endSession, listPresence };
  test(`current game follows the most recent active session and disappears offline`, async () => {
    const { db } = database();
    const first = await api.startSession(db, { ...alice, placeId: '11111', gameName: 'Primeiro jogo' }, time);
    const second = await api.startSession(db, { ...alice, placeId: 22222, gameName: 'Outro jogo 🎮' }, time + 1000);
    let user = (await api.listPresence(db, {}, time + 2000)).users[0];
    assert.equal(user.activeSessions, 2);
    assert.equal(user.placeId, '22222');
    assert.equal(user.gameName, 'Outro jogo 🎮');
    await api.heartbeat(db, first.token, time + 30_000);
    user = (await api.listPresence(db, {}, time + 30_001)).users[0];
    assert.equal(user.placeId, '11111');
    assert.equal(user.gameName, 'Primeiro jogo');
    await api.endSession(db, first.token, time + 31_000);
    user = (await api.listPresence(db, {}, time + 31_001)).users[0];
    assert.equal(user.placeId, '22222');
    user = (await api.listPresence(db, {}, time + 91_000)).users[0];
    assert.equal(user.online, false);
    assert.equal(user.placeId, null);
    assert.equal(user.gameName, null);
    await api.endSession(db, second.token, time + 92_000);
    assert.equal((await api.listPresence(db, {}, time + 92_001)).users[0].placeId, null);
  });

  test(`older clients and missing game names remain supported`, async () => {
    const { db } = database();
    await api.startSession(db, alice, time);
    let user = (await api.listPresence(db, {}, time + 1)).users[0];
    assert.equal(user.online, true);
    assert.equal(user.placeId, null);
    assert.equal(user.gameName, null);
    await api.startSession(db, { ...bob, placeId: '33333' }, time);
    user = (await api.listPresence(db, { q: bob.userId }, time + 1)).users[0];
    assert.equal(user.placeId, '33333');
    assert.equal(user.gameName, null);
  });

  test(`malformed game metadata cannot create sessions`, async () => {
    const { db } = database();
    for (const placeId of ['0', '-1', 'abc', '9007199254740992', 1.2, {}, '1/other']) {
      await assert.rejects(api.startSession(db, { ...alice, placeId }, time), { status: 400 });
    }
    for (const gameName of ['', ' ', 'A'.repeat(161), 'Name\nHeader', 123, {}]) {
      await assert.rejects(api.startSession(db, { ...alice, placeId: '11111', gameName }, time), { status: 400 });
    }
    await assert.rejects(api.startSession(db, { ...alice, gameName: 'Missing place' }, time), { status: 400 });
    assert.equal((await api.listPresence(db, {}, time)).stats.total, 0);
  });
