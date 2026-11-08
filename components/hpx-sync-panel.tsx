"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Download, Radio, RefreshCw, Settings2, ShieldCheck } from "lucide-react";
import type { SyncState } from "@/lib/hpx-sync";
import { defaultPortal, portalPreferences, syncSnippet, type PortalPreferences } from "@/lib/hpx-sync-snippet";

export function useHPXSync(active:boolean) {
  const [state,setState]=useState<SyncState|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState("");
  const [invite,setInvite]=useState<{code:string;expiresAt:number}|null>(null);
  const [preferences,setPreferences]=useState<PortalPreferences>(defaultPortal),[saved,setSaved]=useState(false);
  const poll=useRef<AbortController|null>(null),mutation=useRef<AbortController|null>(null);
  useEffect(()=>{try{setPreferences(portalPreferences(JSON.parse(localStorage.getItem("hpx-sync-portal")||"null")));}catch{}},[]);
  const refresh=useCallback(async()=>{
    if(mutation.current)return;
    poll.current?.abort();const controller=new AbortController();poll.current=controller;
    try {
      const response=await fetch("/api/admin/sync",{cache:"no-store",signal:controller.signal});
      const data=await response.json() as SyncState & {error?:string};if(!response.ok)throw new Error(data.error||"Não foi possível consultar o HPX Sync.");
      setState(data);setError("");if(data.status!=="connected")setInvite(null);
    }catch(e){if(!controller.signal.aborted){setError(e instanceof Error?e.message:"Falha na conexão.");setState(old=>({...old,status:"unavailable",serverUrl:old?.serverUrl??null,loaderUrl:old?.loaderUrl??null,message:e instanceof Error?e.message:"Falha na conexão."}));}}
  },[]);
  useEffect(()=>{if(!active)return;void refresh();const timer=setInterval(()=>{if(!document.hidden)void refresh();},10000);return()=>{clearInterval(timer);poll.current?.abort();};},[active,refresh]);
  useEffect(()=>()=>{poll.current?.abort();mutation.current?.abort();},[]);
  const action=async(action:string,extra:Record<string,unknown>={})=>{
    if(mutation.current)return;
    poll.current?.abort();const controller=new AbortController();mutation.current=controller;
    setBusy(action);setError("");
    try{
      const response=await fetch("/api/admin/sync",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,...extra}),signal:controller.signal});
      const data=await response.json() as SyncState & {error?:string;code:string;expiresAt:number};if(!response.ok)throw new Error(data.error||"Não foi possível concluir a ação.");
      if(action==="invite")setInvite(data);else{setState(data);setInvite(null);}
    }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Falha na conexão.");}
    finally{mutation.current=null;setBusy("");}
  };
  const savePreferences=()=>{try{const next=portalPreferences(preferences);localStorage.setItem("hpx-sync-portal",JSON.stringify(next));setPreferences(next);setSaved(true);setError("");}catch{setError("Seu navegador não permitiu salvar as preferências.");}};
  return {state,error,busy,invite,preferences,saved,setPreferences:(value:PortalPreferences)=>{setPreferences(value);setSaved(false);},savePreferences,action,refresh};
}
type Control=ReturnType<typeof useHPXSync>;
const labels={unconfigured:"Ainda não vinculado",disabled:"Desativado",needs_auth:"Conexão necessária",connected:"Conectado",unavailable:"Indisponível"};
export function HPXSyncPanel({control,onSettings}:{control:Control;onSettings:()=>void}) {
  const {state,error,busy,invite}=control;
  const [copied,setCopied]=useState(false),[now,setNow]=useState(Date.now());
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
  useEffect(()=>setCopied(false),[invite,control.preferences]);
  const snippet=invite&&state?.serverUrl&&state.loaderUrl?syncSnippet(state.serverUrl,state.loaderUrl,invite.code,control.preferences,state.integrated):"";
  const expired=!!invite&&invite.expiresAt<=now;
  return <section className="sync-panel users-panel" aria-label="HPX Sync"><div className="sync-heading"><div className="sync-title"><span className="sync-icon"><Radio size={22}/></span><div><h2>Efeitos em sintonia</h2><p>Portais, auras e partículas entre participantes HPX.</p></div></div><span className={`sync-status ${state?.status==="connected"?"is-connected":""}`} role="status"><i/>{state?labels[state.status]:"Verificando…"}</span></div>
    {error&&<p className="error-banner" role="alert">{error}</p>}
    <div className="sync-metrics">{[["Participantes",state?.metrics?.participants],["Salas",state?.metrics?.rooms],["Efeitos ativos",state?.metrics?.effects],["Renderizações informadas",state?.metrics?.renderAcknowledgements]].map(([label,value])=><article key={String(label)}><span>{label}</span><strong>{state?.status==="connected"?value??0:"—"}</strong></article>)}</div>
    <div className="sync-description"><ShieldCheck size={21}/><div><b>{state?.integrated?"Integrado ao serviço de presença":"Conexão com o servidor HPX Sync"}</b><p>{state?.message||"Cada jogador entra com um convite individual. Os efeitos ficam separados por instância do Roblox."}</p></div></div>
    <div className="sync-actions"><button className="secondary-button" onClick={onSettings}><Settings2 size={16}/>Configurações</button><button className="secondary-button" onClick={()=>void control.action("invite")} disabled={!!busy||state?.status!=="connected"}>{busy==="invite"?"Gerando…":"+ Convidar jogador"}</button><button className="icon-button" aria-label="Atualizar HPX Sync" onClick={()=>void control.refresh()} disabled={!!busy}><RefreshCw size={17}/></button><a className="sync-download" href="/hpx-sync.lua" download="hpx-sync.lua"><Download size={15}/>Cliente Sync</a></div>
    {invite&&<div className="sync-invite"><h3>{expired?"Este convite expirou":"Código de conexão individual"}</h3><p>{expired?"Gere outro convite para conectar este jogador.":`Use uma vez, até ${new Date(invite.expiresAt).toLocaleTimeString("pt-BR")}. Não compartilhe o mesmo código com vários jogadores.`}</p>{snippet&&<div className="code-block"><pre>{snippet}</pre><button className="secondary-button" disabled={expired} onClick={async()=>{try{await navigator.clipboard.writeText(snippet);setCopied(true);}catch{}}}>{copied?<Check size={15}/>:<Copy size={15}/>} {copied?"Copiado!":"Copiar loadstring Sync"}</button></div>}<p>Adicione ao loader existente. Os botões dos efeitos devem chamar o HPX Sync; scripts arbitrários não são sincronizados automaticamente.</p></div>}
    {!!state?.rooms?.length&&<div className="sync-room-list"><h3>Salas de sincronização</h3>{state.rooms.map(room=><div className="sync-room" key={room.id}><code>{room.id}</code><span>{room.participants} participantes · {room.effects} efeitos</span></div>)}</div>}
    <p className="sync-footnote">Só jogadores com o cliente HPX ativo e efeitos integrados veem a sincronização. {state?.integrated?"Atualização por HTTP polling; o contador de entregas inclui efeitos reenviados em snapshots.":"Confirmações de renderização são informadas pelos clientes."}</p>
  </section>;
}
export function HPXSyncSettings({control}:{control:Control}) {
  const {state,preferences}=control;const [password,setPassword]=useState("");
  return <div className="sync-settings"><h3>Conexão do HPX Sync</h3><p>{state?.integrated?"O Sync usa o mesmo serviço público que recebe os jogadores do painel.":"Gerencie a conexão administrativa com o servidor de efeitos."}</p>{state?.serverUrl&&<label>Servidor<input readOnly value={state.serverUrl}/></label>}
    {state?.integrated&&(state.status==="connected"||state.status==="disabled")&&<label className="sync-toggle"><span><b>Compartilhar efeitos</b><small>{state.status==="connected"?"Ativo para clientes com convite":"Desativado"}</small></span><input type="checkbox" role="switch" checked={state.status==="connected"} disabled={!!control.busy} onChange={e=>void control.action("configure",{enabled:e.target.checked})}/></label>}
    {state?.integrated&&state.status==="connected"&&<p className="sync-help">Desativar encerra as sessões Sync e remove seus efeitos. A presença dos jogadores continua funcionando.</p>}
    {!state?.integrated&&state?.status==="needs_auth"&&<form onSubmit={async e=>{e.preventDefault();const value=password;setPassword("");await control.action("connect",{password:value});}}><label>Senha administrativa do Sync<input type="password" autoComplete="off" value={password} minLength={24} maxLength={256} required onChange={e=>setPassword(e.target.value)}/></label><button className="secondary-button" disabled={!!control.busy}>{control.busy==="connect"?"Conectando…":"Conectar servidor"}</button></form>}
    {!state?.integrated&&state?.status==="connected"&&<button className="secondary-button" disabled={!!control.busy} onClick={()=>void control.action("disconnect")}>Encerrar conexão administrativa</button>}
    {(state?.status==="unconfigured"||state?.status==="unavailable")&&<p className="install-notice">{state.message}</p>}
    {control.error&&<p className="error-banner" role="alert">{control.error}</p>}
    <div className="sync-defaults"><h3>Padrões do portal</h3><p>Aplicados ao atalho HPXPortal dos próximos códigos gerados neste navegador.</p><label>Cor<input type="color" value={preferences.color} onChange={e=>control.setPreferences({...preferences,color:e.target.value})}/></label><label>Tamanho <output>{preferences.size}</output><input type="range" min="1" max="24" value={preferences.size} onChange={e=>control.setPreferences({...preferences,size:Number(e.target.value)})}/></label><label>Duração, em segundos<input type="number" min="1" max="300" value={preferences.duration} onChange={e=>control.setPreferences({...preferences,duration:Number(e.target.value)})}/></label><button className="secondary-button" onClick={control.savePreferences}>{control.saved?<Check size={15}/>:<Settings2 size={15}/>} {control.saved?"Preferências salvas":"Salvar preferências"}</button></div>
  </div>;
}
