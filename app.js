import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, getDocs, where } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBm5k1wF7-RaC8hEtTy2Phznxey0FnAcsU",
  authDomain: "basket-clash-7901c.firebaseapp.com",
  projectId: "basket-clash-7901c",
  storageBucket: "basket-clash-7901c.firebasestorage.app",
  messagingSenderId: "307971899685",
  appId: "1:307971899685:web:8143142e3fbe3526ef5acc"
};

const APPS = {
  terminal:{title:"Nexus Terminal",icon:"⌁"},files:{title:"File Manager",icon:"▣"},browser:{title:"Nexus Browser",icon:"◉"},
  monitor:{title:"System Monitor",icon:"⌁"},security:{title:"Security Center",icon:"◇"},chat:{title:"Nexus Comms",icon:"◌"},
  ai:{title:"Nexus AI",icon:"✦"},runner:{title:"Nexus Runner",icon:"▶"},settings:{title:"Settings",icon:"⚙"},company:{title:"NexusCode",icon:"⌂"}
};

const state = {
  user: localStorage.getItem("nexus_user") || "",
  windows:new Map(), z:10, active:null, cwd:"/home/operator",
  fs:{
    "/home/operator/documents/welcome.txt":"Welcome to NexusOS 5.0.\nThis virtual workspace is yours.",
    "/home/operator/documents/mission.md":"# NexusCode Mission\nBuild useful software, AI and secure digital experiences.",
    "/home/operator/scripts/hack.sh":"#!/bin/nexus\\necho \"Simulation only — no real system access.\"",
    "/sys/kernel/config.json":JSON.stringify({version:"5.0",mode:"simulation",security:"enabled"},null,2),
    "/sys/logs/system.log":"[BOOT] NexusOS online\\n[SEC] Security center initialized\\n"
  },
  folderOpen:{"/home/operator":true},
  chatUnsub:null,chatReady:false,onlineUsers:new Map(),history:[],
  settings:{accent:"#38bdf8",animations:true,wallpaper:"grid"}
};

let db=null, auth=null, localChatTimer=null;

function $(id){return document.getElementById(id)}
function esc(v){return String(v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]})}
function now(){return new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}
function toast(title,msg,type="info"){
  const el=document.createElement("div");el.className="toast";
  el.innerHTML="<b>"+esc(title)+"</b><small>"+esc(msg)+"</small>";
  $("toast-stack").appendChild(el);setTimeout(()=>el.remove(),3600);
}
function logBoot(msg,i){$("boot-log").innerHTML+="<div>"+esc(msg)+"</div>";$("boot-progress-bar").style.width=Math.min(100,i*12.5)+"%"}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}

async function boot(){
  const lines=["NEXUS BIOS 5.0","Checking virtual hardware... OK","Loading secure desktop... OK","Initializing filesystem... OK","Starting communications layer... OK","Starting system monitor... OK","Loading Nexus AI interface... OK","Starting graphical shell..."];
  for(let i=0;i<lines.length;i++){logBoot(lines[i],i+1);await sleep(90)}
  await sleep(250);$("boot").classList.add("hidden");$("auth").classList.remove("hidden");
}
function login(e){
  e.preventDefault();
  const u=$("auth-user").value.trim().replace(/[^a-zA-Z0-9_.-]/g,"").slice(0,24);
  const p=$("auth-pwd").value;
  if(u.length<2){$("auth-error").textContent="Username must contain at least 2 characters.";return}
  if(p!=="nexus"){$("auth-error").textContent="Access denied. Use the demo code shown below.";return}
  state.user=u;localStorage.setItem("nexus_user",u);
  $("auth").classList.add("hidden");$("desktop").classList.remove("hidden");$("start-user").textContent=u;
  buildStart();updateClock();setInterval(updateClock,1000);initFirebase();toast("Welcome to NexusOS",u+" is now online.");
}
function logout(){
  state.windows.forEach(w=>w.el.remove());state.windows.clear();
  if(state.chatUnsub)state.chatUnsub();state.chatUnsub=null;
  localStorage.removeItem("nexus_user");location.reload();
}
function updateClock(){const d=new Date();$("sys-clock").textContent=d.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})+"  "+d.toLocaleDateString([], {day:"2-digit",month:"short"})}
function buildStart(filter=""){
  const list=$("app-list");list.innerHTML="";
  Object.entries(APPS).filter(([k,v])=>(k+" "+v.title).toLowerCase().includes(filter.toLowerCase())).forEach(([k,v])=>{
    const b=document.createElement("button");b.className="app-item";b.innerHTML="<span>"+v.icon+"</span><b>"+v.title+"</b>";
    b.onclick=()=>{openApp(k);$("start-menu").classList.add("hidden")};list.appendChild(b);
  });
}
function bring(w){state.z++;w.el.style.zIndex=state.z;state.active=w.id;document.querySelectorAll(".task").forEach(x=>x.classList.remove("active"));const t=document.querySelector('[data-task="'+w.id+'"]');if(t)t.classList.add("active")}
function makeWindow(app){
  const id="w"+Date.now()+Math.random().toString(16).slice(2);const meta=APPS[app];
  const el=document.createElement("section");el.className="window";el.dataset.id=id;
  const left=150+(state.windows.size%4)*32,top=70+(state.windows.size%4)*28;
  el.style.left=left+"px";el.style.top=top+"px";el.style.zIndex=++state.z;
  el.innerHTML='<div class="titlebar"><div class="title-text"><i class="window-dot"></i>'+esc(meta.title)+'</div><div class="win-actions"><button data-act="min">—</button><button data-act="max">□</button><button data-act="close">×</button></div></div><div class="window-body"></div>';
  $("windows").appendChild(el);
  const w={id,app,el,body:el.querySelector(".window-body"),title:meta.title};
  state.windows.set(id,w);bring(w);
  el.addEventListener("mousedown",()=>bring(w));
  el.querySelector('[data-act="close"]').onclick=()=>{el.remove();state.windows.delete(id);document.querySelector('[data-task="'+id+'"]')?.remove()};
  el.querySelector('[data-act="min"]').onclick=()=>{el.classList.toggle("minimized")};
  el.querySelector('[data-act="max"]').onclick=()=>{el.classList.toggle("maximized");bring(w)};
  dragWindow(el,el.querySelector(".titlebar"));
  return w;
}
function dragWindow(el,bar){
  let sx=0,sy=0,sl=0,st=0,moving=false;
  bar.addEventListener("mousedown",e=>{if(e.target.closest("button")||el.classList.contains("maximized"))return;moving=true;sx=e.clientX;sy=e.clientY;sl=el.offsetLeft;st=el.offsetTop;document.body.style.userSelect="none"});
  window.addEventListener("mousemove",e=>{if(!moving)return;el.style.left=Math.max(0,sl+e.clientX-sx)+"px";el.style.top=Math.max(0,st+e.clientY-sy)+"px"});
  window.addEventListener("mouseup",()=>{moving=false;document.body.style.userSelect=""});
}
function addTask(w){
  const b=document.createElement("button");b.className="task active";b.dataset.task=w.id;b.textContent=w.title;
  b.onclick=()=>{if(w.el.classList.contains("minimized"))w.el.classList.remove("minimized");bring(w)};$("task-list").appendChild(b);
}
function openApp(app){
  const existing=[...state.windows.values()].find(w=>w.app===app);
  if(existing){existing.el.classList.remove("minimized");bring(existing);return}
  const w=makeWindow(app);addTask(w);renderApp(w);
}
function renderApp(w){
  const fn={terminal:renderTerminal,files:renderFiles,browser:renderBrowser,monitor:renderMonitor,security:renderSecurity,chat:renderChat,ai:renderAI,runner:renderRunner,settings:renderSettings,company:renderCompany}[w.app];
  if(fn)fn(w);
}

function renderTerminal(w){
  w.body.innerHTML='<div class="terminal"><div id="term-out-'+w.id+'" class="terminal-output"></div><div class="terminal-line"><span class="prompt">'+esc(state.user)+"@nexus:"+esc(state.cwd)+'$</span><input class="terminal-input" autocomplete="off" spellcheck="false" autofocus></div></div>';
  const out=w.body.querySelector(".terminal-output"),input=w.body.querySelector(".terminal-input");
  const print=(s,cls="")=>{const d=document.createElement("div");d.className=cls;d.textContent=s;out.appendChild(d);out.scrollTop=out.scrollHeight};
  print("Nexus Terminal 5.0 — type 'help' for commands.","cmd-info");
  print("Users can talk to each other here with: msg <user> <message> or broadcast <message>.","cmd-info");
  input.addEventListener("keydown",async e=>{
    if(e.key!=="Enter")return;const cmd=input.value.trim();if(!cmd)return;
    print(state.user+"@nexus:"+state.cwd+"$ "+cmd);input.value="";
    const result=await terminalCommand(cmd,print);if(result!==undefined)print(result, result.startsWith("Error")?"cmd-error":"cmd-ok");
    w.body.querySelector(".prompt").textContent=state.user+"@nexus:"+state.cwd+"$";
  });
  setTimeout(()=>input.focus(),30);
}
async function terminalCommand(raw,print){
  const parts=raw.match(/"[^"]*"|'[^']*'|\\S+/g)||[];const cmd=(parts.shift()||"").toLowerCase();const arg=parts.join(" ").replace(/^["']|["']$/g,"");
  if(cmd==="help")return "help clear who users msg <user> <text> broadcast <text> chat ls cd cat touch mkdir rm open ps sysmon security ping date echo about neofetch";
  if(cmd==="clear"){document.querySelectorAll(".terminal-output").forEach(x=>x.innerHTML="");return}
  if(cmd==="date")return new Date().toString();
  if(cmd==="echo")return arg;
  if(cmd==="about")return "NexusCode / NexusOS 5.0 — interactive simulation.";
  if(cmd==="neofetch")return "NEXUSOS 5.0\\nKernel: Nexus Virtual Kernel\\nShell: nxshell\\nNetwork: ONLINE\\nUser: "+state.user;
  if(cmd==="who"||cmd==="users")return await listUsers();
  if(cmd==="msg"||cmd==="tell"){
    const m=raw.match(/^\\S+\\s+(\\S+)\\s+([\\s\\S]+)$/);if(!m)return "Error: msg <username> <message>";
    return await sendDirect(m[1],m[2]);
  }
  if(cmd==="broadcast"||cmd==="say"){if(!arg)return "Error: broadcast <message>";return await sendChat(arg,"global")}
  if(cmd==="chat")return "Open Comms for the full chat UI. Terminal chat commands: who, msg <user> <text>, broadcast <text>.";
  if(cmd==="ls"){
    const prefix=state.cwd.endsWith("/")?state.cwd:state.cwd+"/";const items=Object.keys(state.fs).filter(p=>p.startsWith(prefix)&&p!==prefix).map(p=>p.slice(prefix.length).split("/")[0]);
    return [...new Set(items)].join("  ")||"(empty)";
  }
  if(cmd==="cd"){let p=arg||"/home/operator";if(!p.startsWith("/"))p=state.cwd+"/"+p;p=p.replace(/\\/+/g,"/");if(state.fs[p]===undefined&&!Object.keys(state.fs).some(x=>x.startsWith(p+"/")))return "Error: directory not found";state.cwd=p;return "cwd = "+p}
  if(cmd==="cat"){let p=resolvePath(arg);return state.fs[p]===undefined?"Error: file not found":String(state.fs[p])}
  if(cmd==="touch"){let p=resolvePath(arg);if(!arg)return "Error: filename required";state.fs[p]="";return "created "+p}
  if(cmd==="mkdir"){let p=resolvePath(arg);if(!arg)return "Error: directory required";state.fs[p+"/.dir"]="";return "created "+p}
  if(cmd==="rm"){let p=resolvePath(arg);if(!state.fs[p]&&!Object.keys(state.fs).some(x=>x.startsWith(p+"/")))return "Error: not found";Object.keys(state.fs).filter(x=>x===p||x.startsWith(p+"/")).forEach(x=>delete state.fs[x]);return "removed "+p}
  if(cmd==="open"){openApp(arg&&APPS[arg]?arg:"files");return "opened "+(arg||"files")}
  if(cmd==="ps"||cmd==="sysmon"){openApp("monitor");return "system monitor opened"}
  if(cmd==="security"){openApp("security");return "security center opened"}
  if(cmd==="ping")return "nexus-gateway: 18ms  •  firestore: "+(state.chatReady?"connected":"offline");
  return "Error: command not found — "+cmd;
}
function resolvePath(p){if(!p)return state.cwd;if(p.startsWith("/"))return p;return (state.cwd+"/"+p).replace(/\\/+/g,"/")}

function renderFiles(w){
  w.body.innerHTML='<div class="file-layout"><aside class="file-sidebar"><button class="active" data-path="/home/operator">⌂ Home</button><button data-path="/home/operator/documents">▤ Documents</button><button data-path="/home/operator/scripts">⚙ Scripts</button><button data-path="/sys">◇ System</button></aside><div class="file-main"><div class="app-toolbar"><button class="tool-btn" id="new-file-'+w.id+'">+ File</button><button class="tool-btn" id="new-folder-'+w.id+'">+ Folder</button><button class="tool-btn" id="refresh-'+w.id+'">Refresh</button></div><div class="pathbar" id="path-'+w.id+'"></div><div class="file-grid" id="grid-'+w.id+'"></div></div></div>';
  const render=(path)=>{
    state.cwd=path;$("path-"+w.id).textContent=path;const grid=$("grid-"+w.id);grid.innerHTML="";
    const prefix=path.endsWith("/")?path:path+"/";const names=new Set();
    Object.keys(state.fs).forEach(p=>{if(!p.startsWith(prefix)||p===prefix)return;const rest=p.slice(prefix.length).split("/");if(rest.length)names.add(rest[0])});
    [...names].sort().forEach(name=>{
      const full=prefix+name,isDir=[...Object.keys(state.fs)].some(p=>p.startsWith(full+"/"));const b=document.createElement("button");b.className="file-card";
      b.innerHTML='<div class="icon">'+(isDir?"▰":"▤")+'</div><b>'+esc(name)+'</b>';b.onclick=()=>isDir?render(full):editFile(full);
      grid.appendChild(b);
    });
  };
  w.body.querySelectorAll(".file-sidebar button").forEach(b=>b.onclick=()=>render(b.dataset.path));
  $("new-file-"+w.id).onclick=()=>{const n=prompt("Filename");if(n){state.fs[state.cwd+"/"+n]="";render(state.cwd)}};
  $("new-folder-"+w.id).onclick=()=>{const n=prompt("Folder name");if(n){state.fs[state.cwd+"/"+n+"/.dir"]="";render(state.cwd)}};
  $("refresh-"+w.id).onclick=()=>render(state.cwd);render("/home/operator");
}
function editFile(path){
  const old=state.fs[path]||"";const w=makeWindow({title:"Editor: "+path.split("/").pop(),icon:"✎"});w.app="editor";addTask(w);
  w.body.innerHTML='<div class="editor"><div class="app-toolbar"><button class="tool-btn" id="save-editor">Save</button><span class="pathbar">'+esc(path)+'</span></div><textarea>'+esc(old)+'</textarea></div>';
  w.body.querySelector("#save-editor").onclick=()=>{state.fs[path]=w.body.querySelector("textarea").value;toast("File saved",path)};
}

function renderBrowser(w){
  w.body.innerHTML='<div class="browser"><div class="browser-nav"><button class="tool-btn" id="back-'+w.id+'">←</button><button class="tool-btn" id="home-'+w.id+'">⌂</button><input id="url-'+w.id+'" value="nexus://home"><button class="tool-btn" id="go-'+w.id+'">GO</button></div><div class="browser-page" id="page-'+w.id+'"></div></div>';
  const page=$("page-"+w.id),url=$("url-"+w.id);
  const load=()=>{
    const u=url.value.trim();page.innerHTML='<div class="hero"><h1>Nexus<span>Code</span></h1><p>Software engineering, artificial intelligence and cybersecurity — presented through the NexusOS experience.</p><button class="primary-btn" id="launch-services">Explore services</button></div><div class="cards"><div class="card"><h3>AI Engineering</h3><p>Local and cloud AI workflows, agents and automation.</p></div><div class="card"><h3>Cybersecurity</h3><p>Security tooling, monitoring and secure-by-design software.</p></div><div class="card"><h3>Cloud Systems</h3><p>Modern web platforms, realtime data and scalable infrastructure.</p></div></div>';
    if(u!=="nexus://home"&&!u.startsWith("nexus://"))page.innerHTML='<div class="hero"><h1>Internal Browser</h1><p>This NexusOS demo intentionally stays inside the simulated environment. External browsing can be connected later to a trusted backend.</p><div class="card"><b>'+esc(u)+'</b><p>Navigation target recorded.</p></div></div>';
  };
  $("go-"+w.id).onclick=load;$("home-"+w.id).onclick=()=>{url.value="nexus://home";load()};$("back-"+w.id).onclick=()=>{url.value="nexus://home";load()};url.addEventListener("keydown",e=>{if(e.key==="Enter")load()});load();
}

function renderMonitor(w){
  w.body.innerHTML='<div class="dashboard"><div class="stat-grid"><div class="stat"><small>CPU</small><b id="cpu-'+w.id+'">--%</b><div class="bar"><i></i></div></div><div class="stat"><small>MEMORY</small><b id="ram-'+w.id+'">--%</b><div class="bar"><i></i></div></div><div class="stat"><small>NETWORK</small><b id="net-'+w.id+'">ONLINE</b></div><div class="stat"><small>PROCESSES</small><b>42</b></div></div><div class="panel"><h3>LIVE PROCESS TABLE</h3><div class="process"><b>nexus-shell</b><span>2.1%</span><span>84 MB</span></div><div class="process"><b>firestore-sync</b><span>0.8%</span><span>52 MB</span></div><div class="process"><b>desktop-compositor</b><span>1.4%</span><span>126 MB</span></div><div class="process"><b>nexus-ai</b><span>4.2%</span><span>310 MB</span></div></div><div class="panel"><h3>TELEMETRY</h3><div id="telemetry-'+w.id+'" class="mono" style="font-size:10px;color:#94a3b8;line-height:1.8"></div></div></div>';
  const tick=()=>{if(!document.body.contains(w.el))return;const cpu=Math.round(8+Math.random()*42),ram=Math.round(34+Math.random()*18);$("cpu-"+w.id).textContent=cpu+"%";$("ram-"+w.id).textContent=ram+"%";$("cpu-"+w.id).nextElementSibling.querySelector("i").style.width=cpu+"%";$("ram-"+w.id).nextElementSibling.querySelector("i").style.width=ram+"%";$("telemetry-"+w.id).textContent="uptime "+Math.floor(performance.now()/1000)+"s\\n"+new Date().toISOString()+"\\npackets rx "+Math.floor(1000+Math.random()*9000)+"\\npackets tx "+Math.floor(800+Math.random()*7000);setTimeout(tick,1200)};tick();
}

function renderSecurity(w){
  w.body.innerHTML='<div class="security-grid"><div class="security-card"><small>FIREWALL</small><p class="good">ACTIVE</p><b>0</b><div>blocked events</div></div><div class="security-card"><small>ENCRYPTION</small><p class="good">ENABLED</p><b>AES-256</b><div>virtual volume</div></div><div class="security-card"><small>IDENTITY</small><p class="good">SESSION PROTECTED</p><b>'+esc(state.user)+'</b><div>anonymous Firebase identity</div></div><div class="security-card"><small>THREAT SCAN</small><p id="scan-state" class="good">READY</p><b id="scan-count">0</b><div>issues detected</div><button class="tool-btn" id="scan-btn" style="margin-top:12px">Run scan</button></div><div class="security-card" style="grid-column:1/-1"><small>EVENT LOG</small><div class="mono" style="font-size:10px;line-height:1.8;color:#94a3b8">[OK] Secure shell loaded<br>[OK] Realtime transport available<br>[OK] Browser sandbox active<br>[OK] No host OS access exposed</div></div></div>';
  $("scan-btn").onclick=async()=>{$("scan-state").textContent="SCANNING...";$("scan-state").className="warn";await sleep(900);$("scan-state").textContent="CLEAN";$("scan-state").className="good";$("scan-count").textContent="0";toast("Security scan","No simulated threats detected.")};
}

function renderChat(w){
  w.body.innerHTML='<div class="chat-layout"><aside class="chat-side"><h3>Online users</h3><div id="online-'+w.id+'"></div><hr style="border-color:var(--line);margin:15px 0"><small style="color:#64748b">Terminal:</small><p style="font:9px JetBrains Mono;color:#94a3b8">who<br>msg user hello<br>broadcast hello</p></aside><div class="chat-main"><div id="messages-'+w.id+'" class="chat-messages"></div><div class="chat-input"><input id="chat-input-'+w.id+'" placeholder="Message everyone..."><button class="primary-btn" id="chat-send-'+w.id+'">Send</button></div></div></div>';
  const input=$("chat-input-"+w.id),send=()=>{const v=input.value.trim();if(v){sendChat(v,"global");input.value=""}};$("chat-send-"+w.id).onclick=send;input.addEventListener("keydown",e=>{if(e.key==="Enter")send()});subscribeChat(w);
}
async function subscribeChat(w){
  const renderMsgs=(msgs)=>{
    const box=$("messages-"+w.id);if(!box)return;box.innerHTML="";
    msgs.filter(m=>m.to==="global"||!m.to||m.to===state.user||m.user===state.user).slice(-80).forEach(m=>{const d=document.createElement("div");d.className="message";d.innerHTML='<div class="message-head">'+esc(m.user||"unknown")+" • "+esc(m.time||"")+(m.to&&m.to!=="global"?' • → '+esc(m.to):"")+'</div><div class="message-body">'+esc(m.text||"")+"</div>";box.appendChild(d)});box.scrollTop=box.scrollHeight;
  };
  if(state.chatReady&&db){
    const q=query(collection(db,"nexus_messages"),orderBy("createdAt","asc"),limit(100));
    if(state.chatUnsub)state.chatUnsub();
    state.chatUnsub=onSnapshot(q,s=>{state.history=s.docs.map(d=>d.data());renderMsgs(state.history)});
  }else{
    const renderLocal=()=>renderMsgs(JSON.parse(localStorage.getItem("nexus_chat")||"[]"));renderLocal();if(localChatTimer)clearInterval(localChatTimer);localChatTimer=setInterval(renderLocal,1000);
  }
  updateOnline(w);
}
function updateOnline(w){
  const el=$("online-"+w.id);if(!el)return;const users=[...new Set([state.user,...state.onlineUsers.keys()])];el.innerHTML=users.map(u=>'<div class="user-row online">'+esc(u)+'</div>').join("");
}
async function initFirebase(){
  try{
    const app=initializeApp(FIREBASE_CONFIG);db=getFirestore(app);auth=getAuth(app);
    await signInAnonymously(auth);state.chatReady=true;$("net-label").textContent="FIREBASE ONLINE";toast("Comms connected","Realtime terminal chat is available.");
  }catch(e){state.chatReady=false;$("net-label").textContent="LOCAL MODE";toast("Realtime unavailable","Chat is using local fallback until Firebase rules/auth are available.","warn")}
}
async function listUsers(){return "Online now: "+state.user+"\\nRealtime user discovery is enabled inside Comms when Firebase presence is configured."}
async function sendChat(text,to="global"){
  if(!text)return "Error: empty message";
  const base={user:state.user,text,to,time:now()};
  if(state.chatReady&&db){try{await addDoc(collection(db,"nexus_messages"),{...base,createdAt:serverTimestamp()});return "sent"}catch(e){toast("Message failed","Firestore rejected the message. Check security rules.","warn");return "Error: message could not be sent"}}
  const arr=JSON.parse(localStorage.getItem("nexus_chat")||"[]");arr.push({...base,createdAt:Date.now()});localStorage.setItem("nexus_chat",JSON.stringify(arr.slice(-100)));return "sent locally";
}
async function sendDirect(user,text){
  if(user===state.user)return "Error: choose another user";
  return await sendChat(text,user);
}

function renderAI(w){
  w.body.innerHTML='<div class="ai-wrap"><div id="ai-msgs-'+w.id+'" class="ai-msgs"><div class="ai-bubble ai">Nexus AI ready. I can explain commands, inspect the virtual workspace and help you navigate NexusOS.</div></div><div class="ai-input"><input id="ai-input-'+w.id+'" placeholder="Ask Nexus AI..."><button class="primary-btn" id="ai-send-'+w.id+'">Send</button></div><small style="color:#64748b">Local demo mode — no external AI API key is embedded.</small></div>';
  const input=$("ai-input-"+w.id),box=$("ai-msgs-"+w.id),send=()=>{
    const q=input.value.trim();if(!q)return;box.innerHTML+='<div class="ai-bubble user">'+esc(q)+'</div>';input.value="";
    let a="I can help with NexusOS. Try asking about the terminal, files, security, realtime chat, or available commands.";
    if(/terminal|command/i.test(q))a="Use help for all commands. For user-to-user messaging: msg USER MESSAGE, or broadcast MESSAGE.";
    if(/firebase|chat/i.test(q))a="Nexus Comms uses Firebase Firestore when the project allows anonymous access. If rules reject writes, the UI falls back to local demo mode.";
    if(/file/i.test(q))a="The File Manager uses a virtual filesystem stored in memory. Open a file to edit it, then Save.";
    box.innerHTML+='<div class="ai-bubble ai">'+esc(a)+'</div>';box.scrollTop=box.scrollHeight;
  };$("ai-send-"+w.id).onclick=send;input.addEventListener("keydown",e=>{if(e.key==="Enter")send()});
}
function renderSettings(w){
  w.body.innerHTML='<div class="settings-grid"><div class="setting-row"><div><b>Animations</b><small>Enable interface motion</small></div><button class="toggle on" id="anim-'+w.id+'"></button></div><div class="setting-row"><div><b>Accent</b><small>Choose Nexus highlight color</small></div><select class="select-btn" id="accent-'+w.id+'"><option value="#38bdf8">Cyan</option><option value="#a78bfa">Violet</option><option value="#34d399">Emerald</option><option value="#fb7185">Rose</option></select></div><div class="setting-row"><div><b>Wallpaper</b><small>Desktop visual mode</small></div><button class="tool-btn" id="wall-'+w.id+'">Grid / Aurora</button></div><div class="setting-row"><div><b>Session</b><small>'+esc(state.user)+' is signed in</small></div><button class="tool-btn" id="logout2-'+w.id+'">Log out</button></div></div>';
  $("accent-"+w.id).onchange=e=>{document.documentElement.style.setProperty("--accent",e.target.value);state.settings.accent=e.target.value};
  $("anim-"+w.id).onclick=e=>{e.currentTarget.classList.toggle("on");state.settings.animations=!state.settings.animations;document.body.style.setProperty("--motion",state.settings.animations?"1":"0")};
  $("wall-"+w.id).onclick=()=>{$("wallpaper").classList.toggle("alt-wall")};
  $("logout2-"+w.id).onclick=logout;
}
function renderCompany(w){
  w.body.innerHTML='<div class="browser-page"><div class="hero"><h1>Nexus<span>Code</span></h1><p>Professional software, AI and cybersecurity experiences.</p></div><div class="cards"><div class="card"><h3>Software</h3><p>Modern web apps, desktop experiences and automation.</p></div><div class="card"><h3>AI</h3><p>Agents, local models and intelligent workflows.</p></div><div class="card"><h3>Cybersecurity</h3><p>Secure architecture, monitoring and defensive tooling.</p></div></div></div>';
}

function renderRunner(w){
  w.body.innerHTML='<div class="runner"><div class="runner-score">SCORE <span id="score-'+w.id+'">0</span></div><canvas class="runner-canvas" id="canvas-'+w.id+'" width="520" height="260"></canvas><div class="runner-controls">SPACE / CLICK to jump • R to restart</div></div>';
  const c=$("canvas-"+w.id),ctx=c.getContext("2d"),scoreEl=$("score-"+w.id);let score=0,running=true,player={x:70,y:205,vy:0},obstacles=[{x:520,h:38}];
  const jump=()=>{if(player.y>=205)player.vy=-10};window.addEventListener("keydown",e=>{if(e.code==="Space")jump();if(e.key.toLowerCase()==="r"){score=0;obstacles=[{x:520,h:38}];running=true}});
  c.addEventListener("click",jump);
  const loop=()=>{if(!document.body.contains(w.el))return;ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle="#07101e";ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle="#38bdf8";ctx.fillRect(player.x,player.y,24,24);player.vy+=.45;player.y+=player.vy;if(player.y>205)player.y=205;
    obstacles.forEach(o=>{o.x-=4;ctx.fillStyle="#a78bfa";ctx.fillRect(o.x,205-o.h,24,o.h);if(o.x<-30){o.x=540+Math.random()*140;o.h=25+Math.random()*45;score++;scoreEl.textContent=score}
    if(o.x<player.x+24&&o.x+24>player.x&&player.y+24>205-o.h)running=false});
    if(!running){ctx.fillStyle="#fff";ctx.font="700 20px Inter";ctx.fillText("GAME OVER — press R",155,120)}else requestAnimationFrame(loop)};loop();
}

$("auth-form").addEventListener("submit",login);
$("start-btn").onclick=()=>{$("start-menu").classList.toggle("hidden");buildStart()};
$("app-search").addEventListener("input",e=>buildStart(e.target.value));
$("logout-btn").onclick=logout;
document.querySelectorAll(".desktop-icon").forEach(b=>b.addEventListener("dblclick",()=>openApp(b.dataset.app)));
document.querySelectorAll(".desktop-icon").forEach(b=>b.addEventListener("click",()=>{clearTimeout(b._click);b._click=setTimeout(()=>openApp(b.dataset.app),220)}));
window.addEventListener("online",()=>{$("net-dot").style.background="var(--good)";$("net-label").textContent="ONLINE"});
window.addEventListener("offline",()=>{$("net-dot").style.background="var(--danger)";$("net-label").textContent="OFFLINE"});
boot();