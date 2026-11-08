import test from 'node:test';
import assert from 'node:assert/strict';
import { boundedJson, bridgeCookie, openBridge, sealBridge, summarizeSync, syncOrigin } from '../lib/hpx-sync.ts';
import { defaultPortal, portalPreferences, syncSnippet } from '../lib/hpx-sync-snippet.ts';
test('configuração de backend aceita só origem HTTPS configurada, sem caminhos ou credenciais',()=>{
  assert.equal(syncOrigin('https://sync.example.com/'),'https://sync.example.com');
  for(const value of ['http://sync.example.com','https://localhost','https://127.0.0.1','https://user:password@sync.example.com','https://sync.example.com/admin'])assert.throws(()=>syncOrigin(value));
});
test('credencial de backend externo é cifrada e vinculada ao proprietário, origem e prazo',async()=>{
  const secret='test-only-vault-secret-with-more-than-24-characters';
  const session={token:'a'.repeat(43),ownerId:'owner',serverUrl:'https://sync.example.com',expiresAt:2000};
  const sealed=await sealBridge(session,secret);assert(!sealed.includes(session.token));
  assert.deepEqual(await openBridge(sealed,secret,'owner',session.serverUrl,1000),session);
  assert.equal(await openBridge(sealed,secret,'other',session.serverUrl,1000),null);
  assert.equal(await openBridge(sealed,secret,'owner',session.serverUrl,2000),null);
  assert.equal(await openBridge(sealed+'x',secret,'owner',session.serverUrl,1000),null);
  assert.match(bridgeCookie(sealed,1800),/HttpOnly; Secure; SameSite=Strict/);
});
test('preferências e snippet mantêm limites e não embutem credenciais administrativas',()=>{
  assert.deepEqual(portalPreferences({size:100,duration:-10,color:'invalida'}),{size:24,duration:1,color:'#00FF66'});
  const code=syncSnippet('https://sync.example.com','https://public.example.com/hpx-sync.lua','a'.repeat(64),defaultPortal,true);
  assert.match(code,/DisableWebSocket = true/);assert.match(code,/HPXPortal/);assert(!code.includes('ADMIN_PASSWORD'));
  assert.throws(()=>syncSnippet('https://sync.example.com','https://public.example.com/hpx-sync.lua','"\nmalicious',defaultPortal));
});
test('proxy retorna somente métricas selecionadas e limita o corpo da resposta',async()=>{
  const response=await boundedJson(Response.json({protocol:2,sessions:[],rooms:[],effects:0,eventsReceived:0,eventsDistributed:0,renderAcknowledgements:0,latency:null,secret:'not-forwarded'}));
  const state=summarizeSync(response,'https://sync.example.com',null);assert.equal(state.status,'connected');assert(!JSON.stringify(state).includes('not-forwarded'));
  await assert.rejects(boundedJson(new Response('a'.repeat(1025)),1024));
});
